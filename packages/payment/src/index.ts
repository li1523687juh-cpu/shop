/**
 * @shop/payment - 统一支付抽象层
 *
 * 使用方式：
 * import { getPaymentProvider } from '@shop/payment';
 * const provider = getPaymentProvider('wechat');
 * const result = await provider.createPayment({ order });
 */

export type { PaymentProvider, CreatePaymentInput, WebhookResult, PaymentQueryResult } from './types';
export { WechatPayProvider } from './wechat';
export { AlipayPayProvider } from './alipay';
export { getPaymentProvider, getSupportedChannels } from './factory';
