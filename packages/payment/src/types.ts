/**
 * @shop/payment - 统一支付抽象层接口定义
 *
 * 所有支付渠道必须实现此接口。
 * 新增渠道（如云闪付）只需实现 PaymentProvider 即可无缝接入。
 */

import type { Order, PaymentChannel, PaymentResult, CreateOrderInput } from '@shop/shared';

/** 创建支付订单的输入参数 */
export interface CreatePaymentInput {
  order: Order;
  /** 用户的 OpenID（微信支付必需） */
  openId?: string;
  /** 用户 IP */
  userIp?: string;
}

/** Webhook 回调处理结果 */
export interface WebhookResult {
  /** 是否验签通过 */
  verified: boolean;
  /** 商户订单号 */
  outTradeNo: string;
  /** 支付渠道交易号 */
  transactionId: string;
  /** 实际支付金额（分），用于金额校验 */
  amountPaid: number;
  /** 支付时间 */
  paidAt: string;
  /** 原始回调数据 */
  rawData: unknown;
}

/** 查询支付状态结果 */
export interface PaymentQueryResult {
  outTradeNo: string;
  status: 'NOT_PAID' | 'PAID' | 'CLOSED' | 'REFUNDED';
  transactionId?: string;
  amountPaid?: number;
}

/**
 * 支付 Provider 抽象接口
 *
 * 三个核心方法：
 * - createPayment: 向支付网关创建订单，返回前端调起支付的凭证
 * - queryPayment: 主动查询支付状态
 * - handleWebhook: 处理支付网关的异步回调通知
 */
export interface PaymentProvider {
  readonly channel: PaymentChannel;

  /** 创建支付订单，返回调起支付所需的参数 */
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;

  /** 主动查询支付状态 */
  queryPayment(outTradeNo: string): Promise<PaymentQueryResult>;

  /** 处理 Webhook 回调：验签 + 解析 */
  handleWebhook(headers: Record<string, string>, body: unknown): Promise<WebhookResult>;
}

/** Provider 构造函数类型 */
export type PaymentProviderFactory = () => PaymentProvider;
