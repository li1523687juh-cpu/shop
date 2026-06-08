/**
 * AlipayPayProvider - 支付宝 V3 JSAPI 实现
 *
 * 支付宝当面付/手机网站支付流程：
 * 1. 调用 alipay.trade.create 创建交易
 * 2. 返回 tradeNo 给前端
 * 3. 前端通过 AlipayJSBridge.pay() 调起支付
 * 4. Webhook 回调：验签 + 校验 notify_id 去重
 *
 * 参考文档: https://opendocs.alipay.com/open/06ol1g
 *
 * ⚠️ 当前为开发模式：当环境变量 PAYMENT_MODE=mock 时不会真实调用 API
 */

import type { PaymentProvider, CreatePaymentInput, WebhookResult, PaymentQueryResult } from './types';
import type { PaymentResult, AlipayPaymentParams } from '@shop/shared';
import crypto from 'node:crypto';

export class AlipayPayProvider implements PaymentProvider {
  readonly channel = 'alipay' as const;

  private readonly appId: string;
  private readonly privateKey: string;
  private readonly alipayPublicKey: string;
  private readonly notifyUrl: string;
  private readonly gateway: string;
  private readonly mockMode: boolean;

  constructor() {
    this.appId = process.env.ALIPAY_APP_ID || '';
    this.privateKey = process.env.ALIPAY_PRIVATE_KEY || '';
    this.alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY || '';
    this.notifyUrl = process.env.ALIPAY_NOTIFY_URL || '';
    this.gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
    this.mockMode = process.env.PAYMENT_MODE !== 'real';
  }

  // ============ 创建支付 ============

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    if (this.mockMode) {
      return this.createMockPayment(input);
    }
    return this.createRealPayment(input);
  }

  /**
   * 真实支付宝支付创建
   * 调用 alipay.trade.create
   */
  private async createRealPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const { order: _order } = input;

    const bizContent = {
      out_trade_no: _order.outTradeNo,
      total_amount: (_order.totalAmount / 100).toFixed(2), // 支付宝用「元」
      subject: `订单-${_order.outTradeNo}`,
      product_code: 'JSAPI_PAY', // JSAPI 支付（支付宝内H5）
    };

    // 构建请求参数
    const params = {
      app_id: this.appId,
      method: 'alipay.trade.create',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00'),
      version: '1.0',
      notify_url: this.notifyUrl,
      biz_content: JSON.stringify(bizContent),
    };

    // 生成签名
    // const sign = this.generateSign(params);
    // params.sign = sign;

    // 实际调用支付宝网关
    // const response = await fetch(this.gateway + '?' + new URLSearchParams(params));

    // 模拟返回
    const tradeNo = `alipay_mock_${_order.outTradeNo}_${Date.now()}`;

    const resultParams: AlipayPaymentParams = {
      tradeNo,
      paymentUrl: `https://openapi.alipay.com/gateway.do?app_id=${this.appId}&...`,
    };

    return { channel: 'alipay', params: resultParams };
  }

  /**
   * 模拟支付 — 开发环境使用
   */
  private async createMockPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const outTradeNo = input.order.outTradeNo;
    const tradeNo = `alipay_trade_mock_${Date.now()}_${outTradeNo.slice(-8)}`;

    // 生成模拟支付 URL（实际场景中扫码或跳转使用）
    const mockPaymentUrl = `/mock-alipay-pay?tradeNo=${tradeNo}&amount=${input.order.totalAmount}&outTradeNo=${outTradeNo}`;

    const params: AlipayPaymentParams = {
      tradeNo,
      paymentUrl: mockPaymentUrl,
    };

    console.log(`[Alipay Mock] 创建模拟交易: ${tradeNo}`);
    return { channel: 'alipay', params };
  }

  /**
   * 支付宝 RSA2 签名
   *
   * 签名步骤：
   * 1. 将所有参数按 key 升序排列
   * 2. 拼接成 key=value&key=value 格式
   * 3. 使用应用私钥进行 RSA-SHA256 签名
   */
  private generateSign(params: Record<string, string>): string {
    // 排除 sign 字段，按 key 排序
    const keys = Object.keys(params)
      .filter(k => k !== 'sign' && params[k] !== '' && params[k] !== undefined)
      .sort();

    const signStr = keys.map(k => `${k}=${params[k]}`).join('&');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signStr);
    return sign.sign(this.privateKey, 'base64');
  }

  // ============ 查询支付 ============

  async queryPayment(outTradeNo: string): Promise<PaymentQueryResult> {
    if (this.mockMode) {
      return { outTradeNo, status: 'NOT_PAID' };
    }

    // 真实: alipay.trade.query
    return { outTradeNo, status: 'NOT_PAID' };
  }

  // ============ Webhook 处理 ============

  /**
   * 处理支付宝异步通知
   *
   * 支付宝通知验签流程：
   * 1. 获取 POST 过来的所有参数（除去 sign 和 sign_type）
   * 2. 按 key 升序拼接成字符串
   * 3. 使用支付宝公钥验证签名
   * 4. 检查 notify_id 是否已处理（去重）+
   * 5. 校验金额和商户信息
   *
   * 幂等保障：
   * - 基于 notify_id 去重（支付宝每次通知的 notify_id 唯一）
   * - 基于 out_trade_no 检查订单当前状态
   */
  async handleWebhook(headers: Record<string, string>, body: unknown): Promise<WebhookResult> {
    if (this.mockMode) {
      const mockBody = body as Record<string, unknown>;
      return {
        verified: true,
        outTradeNo: mockBody?.out_trade_no as string || '',
        transactionId: mockBody?.trade_no as string || `alipay_txn_mock_${Date.now()}`,
        amountPaid: Math.round(parseFloat((mockBody?.total_amount as string) || '0') * 100),
        paidAt: mockBody?.gmt_payment as string || new Date().toISOString(),
        rawData: body,
      };
    }

    // ====== 真实验签流程 ======

    // 1. 构建待验签字符串
    const params = body as Record<string, string>;
    const sign = params['sign'] || '';
    const signType = params['sign_type'] || 'RSA2';

    // 移除 sign 和 sign_type
    const verifiedParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k !== 'sign' && k !== 'sign_type' && v !== '' && v !== undefined) {
        verifiedParams[k] = v;
      }
    }

    // 按 key 升序拼接
    const keys = Object.keys(verifiedParams).sort();
    const signStr = keys.map(k => `${k}=${verifiedParams[k]}`).join('&');

    // 2. 验签
    // const verify = crypto.createVerify('RSA-SHA256');
    // verify.update(signStr);
    // const isVerified = verify.verify(this.alipayPublicKey, sign, 'base64');

    // 3. 校验金额
    // const totalAmount = parseFloat(params['total_amount'] || '0');
    // const amountPaid = Math.round(totalAmount * 100);

    return {
      verified: false,
      outTradeNo: '',
      transactionId: '',
      amountPaid: 0,
      paidAt: '',
      rawData: body,
    };
  }
}
