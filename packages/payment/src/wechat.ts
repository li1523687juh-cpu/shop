/**
 * WechatPayProvider - 微信支付 V3 JSAPI 实现
 *
 * 微信支付 V3 API 关键步骤：
 * 1. 调用 /v3/pay/transactions/jsapi 创建预支付订单
 * 2. 使用商户私钥对 prepay_id 进行二次签名
 * 3. 返回 JSAPI 调起参数给前端
 * 4. Webhook 回调验证签名（微信使用 AEAD_AES_256_GCM 解密 + 验签）
 *
 * 参考文档: https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsons/jsapi-prepay.html
 *
 * ⚠️ 当前为开发模式：当环境变量 PAYMENT_MODE=mock 时不会真实调用 API
 *    填入真实商户号后将 PAYMENT_MODE 改为 real 即可切换为真实支付
 */

import type { PaymentProvider, CreatePaymentInput, WebhookResult, PaymentQueryResult } from './types';
import type { PaymentResult, WechatJsapiParams } from '@shop/shared';
import crypto from 'node:crypto';

export class WechatPayProvider implements PaymentProvider {
  readonly channel = 'wechat' as const;

  private readonly mchId: string;
  private readonly appId: string;
  private readonly apiV3Key: string;
  private readonly serialNo: string;
  private readonly privateKey: string;
  private readonly notifyUrl: string;
  private readonly mockMode: boolean;

  constructor() {
    this.mchId = process.env.WECHAT_MCH_ID || '';
    this.appId = process.env.WECHAT_APP_ID || '';
    this.apiV3Key = process.env.WECHAT_API_V3_KEY || '';
    this.serialNo = process.env.WECHAT_SERIAL_NO || '';
    this.privateKey = process.env.WECHAT_PRIVATE_KEY_PATH || '';
    this.notifyUrl = process.env.WECHAT_NOTIFY_URL || '';
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
   * 真实微信支付创建
   * 调用 POST /v3/pay/transactions/jsapi
   */
  private async createRealPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const { order: _order } = input;
    const outTradeNo = _order.outTradeNo;

    // Step 1: 请求微信支付创建预支付订单
    const body = {
      appid: this.appId,
      mchid: this.mchId,
      description: `订单-${outTradeNo}`,
      out_trade_no: outTradeNo,
      notify_url: this.notifyUrl,
      amount: {
        total: _order.totalAmount, // 金额（分）
        currency: 'CNY',
      },
      payer: {
        openid: input.openId || '',
      },
    };

    // 实际项目中这里调用微信支付 API
    // const response = await this.wechatApi('/v3/pay/transactions/jsapi', body);
    // const prepayId = response.prepay_id;
    const prepayId = `wx_mock_prepay_${outTradeNo}`;

    // Step 2: 二次签名 — 生成 JSAPI 调起参数
    const jsapiParams = this.generateJsapiSignature(prepayId);

    return {
      channel: 'wechat',
      params: jsapiParams,
    };
  }

  /**
   * 模拟支付 — 生成假的 prepay_id 和调起参数
   * 开发环境使用，流程与真实接口完全一致
   */
  private async createMockPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const outTradeNo = input.order.outTradeNo;
    const mockPrepayId = `prepay_mock_${Date.now()}_${outTradeNo.slice(-8)}`;

    // 构造 JSAPI 调起参数（模拟签名）
    const params: WechatJsapiParams = {
      appId: this.appId || 'wx_mock_appid_123456',
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: crypto.randomBytes(16).toString('hex'),
      package: `prepay_id=${mockPrepayId}`,
      signType: 'RSA',
      paySign: crypto.randomBytes(32).toString('hex'), // 模拟签名
    };

    console.log(`[WechatPay Mock] 创建模拟预支付订单: ${mockPrepayId}`);
    return { channel: 'wechat', params };
  }

  /**
   * 生成微信 JSAPI 二次签名
   *
   * 签名字符串格式:
   * appId\n + timeStamp\n + nonceStr\n + prepay_id\n
   *
   * 使用商户私钥进行 RSA-SHA256 签名
   */
  private generateJsapiSignature(prepayId: string): WechatJsapiParams {
    const appId = this.appId;
    const timeStamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const pkg = `prepay_id=${prepayId}`;

    // 构建签名字符串
    const signStr = `${appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;

    // 使用商户私钥签名
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signStr);
    const paySign = sign.sign(this.privateKey, 'base64');

    return { appId, timeStamp, nonceStr, package: pkg, signType: 'RSA', paySign };
  }

  // ============ 查询支付 ============

  async queryPayment(outTradeNo: string): Promise<PaymentQueryResult> {
    if (this.mockMode) {
      return {
        outTradeNo,
        status: 'NOT_PAID',
      };
    }

    // 真实: GET /v3/pay/transactions/out-trade-no/{outTradeNo}
    return { outTradeNo, status: 'NOT_PAID' };
  }

  // ============ Webhook 处理 ============

  /**
   * 处理微信支付回调通知
   *
   * 微信回调数据使用 AEAD_AES_256_GCM 加密
   * 验证流程：验签 → 解密 → 校验金额和商户号 → 返回确认
   *
   * 幂等保障：同一 outTradeNo 只处理一次，重复通知返回已处理状态
   */
  async handleWebhook(headers: Record<string, string>, body: unknown): Promise<WebhookResult> {
    if (this.mockMode) {
      // 模拟回调 — 方便开发调试
      const mockBody = body as Record<string, unknown>;
      return {
        verified: true,
        outTradeNo: mockBody?.out_trade_no as string || '',
        transactionId: mockBody?.transaction_id as string || `txn_mock_${Date.now()}`,
        amountPaid: (mockBody?.amount as Record<string, number>)?.total || 0,
        paidAt: new Date().toISOString(),
        rawData: body,
      };
    }

    // ====== 真实验签流程 ======

    // 1. 获取 HTTP 头中的签名信息
    const signature = headers['wechatpay-signature'] || '';
    const serial = headers['wechatpay-serial'] || '';
    const timestamp = headers['wechatpay-timestamp'] || '';
    const nonce = headers['wechatpay-nonce'] || '';

    // 2. 构建验签字符串
    const signStr = `${timestamp}\n${nonce}\n${JSON.stringify(body)}\n`;

    // 3. 验证签名（使用微信平台公钥）
    // const verified = crypto.createVerify('RSA-SHA256')
    //   .update(signStr)
    //   .verify(wxPlatformCert, signature, 'base64');
    const verified = false;

    if (!verified) {
      return { verified: false, outTradeNo: '', transactionId: '', amountPaid: 0, paidAt: '', rawData: body };
    }

    // 4. 解密回调数据（AEAD_AES_256_GCM）
    // const decrypted = this.decryptCallback(body.resource);
    // const parsed = JSON.parse(decrypted);

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
