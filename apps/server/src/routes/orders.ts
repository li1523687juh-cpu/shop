/**
 * 订单路由
 *
 * POST /api/orders        — 创建订单 + 生成支付凭证
 * GET  /api/orders/:id    — 查询订单详情
 * GET  /api/orders/status/:outTradeNo — 查询支付状态
 * GET  /api/admin/orders  — 获取所有订单（管理）
 * GET  /api/admin/revenue — 获取收入统计
 */

import { Router } from 'express';
import { z } from 'zod';
import prisma from '@shop/db';
import { getPaymentProvider } from '@shop/payment';
import { createOrder, getAllOrders, getRevenueStats } from '../services/order.service';

export const ordersRouter = Router();

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(99),
  })).min(1, '至少需要一个商品'),
  paymentChannel: z.enum(['wechat', 'alipay']),
  openId: z.string().optional(),    // 微信支付需要
});

// ============ 公开接口 ============

/** 创建订单 */
ordersRouter.post('/', async (req, res, next) => {
  try {
    const input = createOrderSchema.parse(req.body);

    // 1. 创建订单（后端重算金额 + 校验库存 + 锁定库存）
    const order = await createOrder(input);

    // 2. 调用支付 Provider 生成支付凭证
    const provider = getPaymentProvider(input.paymentChannel);
    const paymentResult = await provider.createPayment({
      order,
      openId: input.openId,
      userIp: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      data: {
        order,
        payment: paymentResult,
      },
    });
  } catch (err) { next(err); }
});

/** 查询支付状态（前端轮询） */
ordersRouter.get('/status/:outTradeNo', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { outTradeNo: req.params.outTradeNo },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' });
      return;
    }

    res.json({
      success: true,
      data: {
        outTradeNo: order.outTradeNo,
        status: order.status,
        totalAmount: order.totalAmount,
        paidAt: order.paidAt,
      },
    });
  } catch (err) { next(err); }
});

/** 查询单个订单 */
ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// ============ 管理接口 ============

/** 获取所有订单 */
ordersRouter.get('/admin/all', async (_req, res, next) => {
  try {
    const orders = await getAllOrders();
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
});

/** 收入统计 */
ordersRouter.get('/admin/revenue', async (_req, res, next) => {
  try {
    const stats = await getRevenueStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
});
