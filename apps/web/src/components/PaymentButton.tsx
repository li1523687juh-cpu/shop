/**
 * 支付按钮组件
 *
 * 根据支付渠道和环境自动选择合适的样式和行为:
 * - 微信环境 + 微信支付 → 绿色按钮，调起微信 JS Bridge
 * - 支付宝环境 + 支付宝支付 → 蓝色按钮，调起支付宝 Bridge
 * - 其他 → 通用支付按钮
 */

import React from 'react';
import type { PaymentChannel } from '@shop/shared';
import { detectEnvironment } from '../hooks/usePayment';

interface Props {
  channel: PaymentChannel;
  totalPrice: number;
  onPay: () => void;
  loading: boolean;
}

export default function PaymentButton({ channel, totalPrice, onPay, loading }: Props) {
  const env = detectEnvironment();
  const fmt = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

  const isWechat = channel === 'wechat';
  const brandName = isWechat ? '微信支付' : '支付宝';
  const brandIcon = isWechat ? 'fa-weixin' : 'fa-alipay';
  const bgColor = isWechat ? 'var(--primary)' : 'var(--alipay)';

  return (
    <button
      className="btn btn-block"
      onClick={onPay}
      disabled={loading}
      style={{
        background: bgColor,
        color: '#fff',
        fontSize: 18,
        fontWeight: 700,
        padding: '16px 0',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <>
          <i className="fas fa-spinner fa-spin" />
          创建订单中...
        </>
      ) : (
        <>
          <i className={`fab ${brandIcon}`} style={{ fontSize: 22 }} />
          确认支付 {fmt(totalPrice)}
        </>
      )}
    </button>
  );
}
