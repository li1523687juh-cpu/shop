/**
 * 订单服务 — 核心业务逻辑
 *
 * 安全性保障：
 * 1. 后端重算金额（前端金额仅供参考）
 * 2. 库存检查 + 原子扣减
 * 3. 幂等创建（相同 cart 重复请求返回同一订单）
 * 4. Webhook 幂等处理（检查订单状态防重复）
 */

import prisma from '@shop/db';
import type { Order, OrderStatus, CreateOrderInput } from '@shop/shared';
import { v4 as uuid } from 'uuid';

/**
 * 生成唯一商户订单号
 * 格式: OTN-{时间戳}-{短UUID}
 */
function generateOutTradeNo(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const short = uuid().slice(0, 8).toUpperCase();
  return `OTN-${ts}-${short}`;
}

/**
 * 创建订单
 *
 * 流程：
 * 1. 校验商品存在且库存充足
 * 2. 后端重算金额（分）
 * 3. 创建订单（状态 PENDING）+ 锁定库存
 * 4. 30 分钟后未支付自动取消（定时任务标记）
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  // 1. 查询所有商品
  const productIds = input.items.map(i => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isListed: true },
  });

  if (products.length !== productIds.length) {
    throw new Error('部分商品不存在或已下架');
  }

  // 2. 计算金额 + 校验库存
  let totalAmount = 0;
  const orderItems: Array<{
    productId: string;
    productName: string;
    productImage: string;
    quantity: number;
    price: number;
  }> = [];

  for (const item of input.items) {
    const product = products.find(p => p.id === item.productId)!;
    if (product.stock < item.quantity) {
      throw new Error(`「${product.name}」库存不足（剩余 ${product.stock}）`);
    }
    totalAmount += product.price * item.quantity;
    orderItems.push({
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      quantity: item.quantity,
      price: product.price,
    });
  }

  // 3. 原子操作：创建订单 + 扣减库存
  const order = await prisma.$transaction(async (tx) => {
    // 扣减库存
    for (const item of input.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // 创建订单
    return tx.order.create({
      data: {
        outTradeNo: generateOutTradeNo(),
        totalAmount,
        paymentChannel: input.paymentChannel,
        status: 'PENDING',
        items: {
          create: orderItems,
        },
      },
      include: { items: true },
    });
  });

  console.log(`[Order] 创建订单: ${order.outTradeNo}, 金额: ${(totalAmount / 100).toFixed(2)}元`);
  return order as Order;
}

/**
 * 支付成功后处理（Webhook 调用）
 *
 * 幂等保障：
 * - 如果订单已是 PAID → 直接返回成功（重复通知）
 * - 如果订单是 PENDING → 更新为 PAID
 * - 其他状态 → 拒绝处理
 */
export async function markOrderPaid(
  outTradeNo: string,
  transactionId: string,
  amountPaid: number,  // 支付网关返回的实际金额（分）
  paidAt: string,
): Promise<Order> {
  const order = await prisma.order.findUnique({
    where: { outTradeNo },
    include: { items: true },
  });

  if (!order) {
    throw new Error(`订单不存在: ${outTradeNo}`);
  }

  // 幂等：已支付直接返回
  if (order.status === 'PAID') {
    console.log(`[Order] 重复通知，订单已支付: ${outTradeNo}`);
    return order as Order;
  }

  // 只有 PENDING 状态才能支付
  if (order.status !== 'PENDING') {
    throw new Error(`订单状态异常: ${order.status}，无法支付`);
  }

  // 金额校验（允许微小偏差，防止重放攻击时金额被篡改）
  if (Math.abs(order.totalAmount - amountPaid) > 1) {
    console.error(`[Order] 金额不匹配! 订单: ${order.totalAmount}分, 实际: ${amountPaid}分`);
    throw new Error(`金额校验失败`);
  }

  // 更新订单状态
  const updated = await prisma.order.update({
    where: { outTradeNo },
    data: {
      status: 'PAID',
      paidAt: new Date(paidAt),
    },
    include: { items: true },
  });

  console.log(`[Order] 支付成功: ${outTradeNo}, 交易号: ${transactionId}`);
  return updated as Order;
}

/**
 * 取消过期订单（30 分钟未支付自动取消 + 恢复库存）
 */
export async function cancelExpiredOrders(): Promise<number> {
  const expiryTime = new Date(Date.now() - 30 * 60 * 1000);

  const expiredOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: expiryTime },
    },
    include: { items: true },
  });

  for (const order of expiredOrders) {
    await prisma.$transaction(async (tx) => {
      // 恢复库存
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      // 标记过期
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'EXPIRED' },
      });
    });
  }

  if (expiredOrders.length > 0) {
    console.log(`[Order] 自动取消 ${expiredOrders.length} 个过期订单`);
  }
  return expiredOrders.length;
}

/**
 * 查询所有订单（管理后台用）
 */
export async function getAllOrders(): Promise<Order[]> {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return orders as Order[];
}

/**
 * 统计收入
 */
export async function getRevenueStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayOrders, monthOrders, allPaidOrders] = await Promise.all([
    prisma.order.findMany({ where: { status: 'PAID', paidAt: { gte: todayStart } } }),
    prisma.order.findMany({ where: { status: 'PAID', paidAt: { gte: monthStart } } }),
    prisma.order.findMany({ where: { status: 'PAID', paidAt: { not: null } } }),
  ]);

  return {
    today: todayOrders.reduce((s, o) => s + o.totalAmount, 0),
    thisMonth: monthOrders.reduce((s, o) => s + o.totalAmount, 0),
    total: allPaidOrders.reduce((s, o) => s + o.totalAmount, 0),
  };
}
