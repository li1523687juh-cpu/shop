/**
 * PaymentProvider 工厂
 *
 * 根据支付渠道和环境变量创建 Provider 实例。
 * 开发模式 (PAYMENT_MODE=mock) 自动使用 Mock Provider。
 */

import type { PaymentProvider } from './types';
import type { PaymentChannel } from '@shop/shared';
import { WechatPayProvider } from './wechat';
import { AlipayPayProvider } from './alipay';

// Provider 单例缓存
const providers = new Map<PaymentChannel, PaymentProvider>();

/**
 * 获取支付 Provider 实例
 *
 * @param channel - 支付渠道 (wechat | alipay)
 * @returns PaymentProvider 实例（单例）
 *
 * @example
 * ```ts
 * const provider = getPaymentProvider('wechat');
 * const result = await provider.createPayment({ order, openId: 'xxx' });
 * ```
 */
export function getPaymentProvider(channel: PaymentChannel): PaymentProvider {
  const cached = providers.get(channel);
  if (cached) return cached;

  let provider: PaymentProvider;

  switch (channel) {
    case 'wechat':
      provider = new WechatPayProvider();
      break;
    case 'alipay':
      provider = new AlipayPayProvider();
      break;
    default:
      throw new Error(`不支持的支付渠道: ${channel}`);
  }

  providers.set(channel, provider);
  console.log(`[PaymentFactory] 创建 Provider: ${channel} (mode: ${process.env.PAYMENT_MODE || 'mock'})`);
  return provider;
}

/**
 * 获取所有可用的支付渠道
 */
export function getSupportedChannels(): PaymentChannel[] {
  return ['wechat', 'alipay'];
}
