/**
 * 结算页 — 订单确认 + 选择支付方式 + 调起支付
 *
 * 流程:
 * 1. 展示订单汇总（商品、金额）
 * 2. 选择支付方式（微信 / 支付宝）
 * 3. 点击"确认支付" → 创建订单 → 获取支付凭证
 * 4. 模拟支付环境下显示支付二维码 + 模拟支付按钮
 * 5. 支付完成后跳转结果页
 */

import React, { useState } from 'react';
import type { CartItem, PaymentChannel } from '@shop/shared';
import { usePayment, detectEnvironment } from '../hooks/usePayment';
import PaymentButton from '../components/PaymentButton';

interface Props {
  cart: {
    items: CartItem[];
    totalPrice: number;
    clearCart: () => void;
  };
  showToast: (msg: string, type: 'success' | 'error') => void;
  navigate: (r: 'shop' | 'cart' | 'checkout' | 'result' | 'admin') => void;
  setResult: (outTradeNo: string, channel: 'wechat' | 'alipay') => void;
}

export default function CheckoutPage({ cart, showToast, navigate, setResult }: Props) {
  const [channel, setChannel] = useState<PaymentChannel>(
    detectEnvironment() === 'alipay' ? 'alipay' : 'wechat'
  );
  const [status, setStatus] = useState<'idle' | 'confirming' | 'paying' | 'done'>('idle');
  const [paymentInfo, setPaymentInfo] = useState<{
    outTradeNo: string;
    channel: 'wechat' | 'alipay';
    amount: number;
  } | null>(null);

  const { loading, checkout, mockPay, pollStatus } = usePayment();

  const fmt = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

  /** 点击确认支付 */
  const handlePay = async () => {
    if (cart.items.length === 0) return;
    setStatus('confirming');

    const result = await checkout(
      cart.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      channel,
    );

    if (!result) {
      showToast('创建订单失败，请重试', 'error');
      setStatus('idle');
      return;
    }

    const { order, payment } = result;
    setPaymentInfo({ outTradeNo: order.outTradeNo, channel, amount: order.totalAmount });
    setStatus('paying');

    // 模拟支付环境：自动模拟支付成功
    setResult(order.outTradeNo, channel);

    // 在实际环境中，这里会通过 JS Bridge 调起支付
    // 微信: wx.chooseWXPay({ ...payment.params })
    // 支付宝: AlipayJSBridge.call('tradePay', { tradeNO: payment.params.tradeNo })
  };

  /** 模拟支付成功（开发用） */
  const handleMockPay = async () => {
    if (!paymentInfo) return;

    const ok = await mockPay(paymentInfo.outTradeNo, paymentInfo.channel);
    if (ok) {
      showToast('支付成功！', 'success');
      cart.clearCart();
      setStatus('done');
      setTimeout(() => navigate('result'), 500);
    } else {
      showToast('支付失败，请重试', 'error');
    }
  };

  // 显示模拟支付界面
  if (status === 'paying' && paymentInfo) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ padding: '40px 0' }}>
          <i className="fas fa-clock" style={{ fontSize: 48, color: 'var(--warning)' }} />
          <h2 style={{ margin: '16px 0 8px', fontSize: 20 }}>等待支付</h2>
          <p style={{ color: '#999', marginBottom: 4 }}>
            订单号: {paymentInfo.outTradeNo}
          </p>
          <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)', margin: '8px 0' }}>
            {fmt(paymentInfo.amount)}
          </p>
          <p style={{ color: '#999', fontSize: 13 }}>
            支付方式: {paymentInfo.channel === 'wechat' ? '微信支付' : '支付宝'}
          </p>
        </div>

        {/* 模拟支付二维码 */}
        <div style={{
          width: 200, height: 200, margin: '0 auto 20px',
          background: '#f0f0f0', borderRadius: 12,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          border: '2px dashed var(--border)',
        }}>
          <i className={`fab fa-${paymentInfo.channel === 'wechat' ? 'weixin' : 'alipay'}`}
            style={{ fontSize: 48, color: paymentInfo.channel === 'wechat' ? 'var(--primary)' : 'var(--alipay)' }} />
          <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
            模拟{paymentInfo.channel === 'wechat' ? '微信' : '支付宝'}收款码
          </p>
        </div>

        <p style={{ color: '#999', fontSize: 12, marginBottom: 20 }}>
          开发模式 — 点击下方按钮模拟支付成功
        </p>

        <button className="btn btn-primary btn-block" onClick={handleMockPay} style={{ marginBottom: 8 }}>
          💰 一键模拟支付成功
        </button>
        <button
          className="btn"
          onClick={() => { setStatus('idle'); setPaymentInfo(null); }}
          style={{ width: '100%', background: '#f5f5f5' }}
        >
          返回重选
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, padding: '16px 0 12px' }}>
        📋 确认订单
      </h2>

      {/* 订单商品 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {cart.items.map(item => (
          <div key={item.productId} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#fff', padding: 12, borderRadius: 'var(--radius)',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <img src={item.imageUrl} alt={item.name}
                style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', background: '#f0f0f0' }}
                onError={e => { (e.target as HTMLImageElement).src = ''; }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</p>
                <p style={{ fontSize: 12, color: '#999' }}>×{item.quantity}</p>
              </div>
            </div>
            <span style={{ fontWeight: 600 }}>{fmt(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      {/* 金额汇总 */}
      <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span>商品总计</span>
          <span style={{ fontWeight: 600 }}>{fmt(cart.totalPrice)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>应付金额</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)' }}>{fmt(cart.totalPrice)}</span>
        </div>
      </div>

      {/* 支付方式选择 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>选择支付方式</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setChannel('wechat')}
            style={{
              flex: 1, padding: 16, borderRadius: 'var(--radius)',
              border: `2px solid ${channel === 'wechat' ? 'var(--primary)' : 'var(--border)'}`,
              background: channel === 'wechat' ? '#f0fdf4' : '#fff',
              cursor: 'pointer', textAlign: 'center',
            }}
          >
            <i className="fab fa-weixin" style={{ fontSize: 32, color: 'var(--primary)' }} />
            <p style={{ marginTop: 8, fontWeight: 600 }}>微信支付</p>
          </button>
          <button
            onClick={() => setChannel('alipay')}
            style={{
              flex: 1, padding: 16, borderRadius: 'var(--radius)',
              border: `2px solid ${channel === 'alipay' ? 'var(--alipay)' : 'var(--border)'}`,
              background: channel === 'alipay' ? '#eff6ff' : '#fff',
              cursor: 'pointer', textAlign: 'center',
            }}
          >
            <i className="fab fa-alipay" style={{ fontSize: 32, color: 'var(--alipay)' }} />
            <p style={{ marginTop: 8, fontWeight: 600 }}>支付宝</p>
          </button>
        </div>
      </div>

      {/* 支付按钮 */}
      <PaymentButton
        channel={channel}
        totalPrice={cart.totalPrice}
        onPay={handlePay}
        loading={loading || status === 'confirming'}
      />

      <div style={{ height: 20 }} />
    </div>
  );
}
