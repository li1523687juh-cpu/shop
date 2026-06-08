/**
 * 支付结果页 — 成功/失败展示
 *
 * 展示订单号、支付方式、金额，并提供返回店铺/查看订单的入口。
 */

import React, { useState, useEffect } from 'react';

interface Props {
  outTradeNo: string;
  channel: 'wechat' | 'alipay';
  navigate: (r: 'shop' | 'cart' | 'checkout' | 'result' | 'admin') => void;
}

export default function ResultPage({ outTradeNo, channel, navigate }: Props) {
  const [status, setStatus] = useState<'paid' | 'unknown'>('unknown');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // 查询支付状态
    if (!outTradeNo) {
      setStatus('unknown');
      return;
    }

    fetch(`/api/orders/status/${outTradeNo}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data.status === 'PAID') {
          setStatus('paid');
        }
      })
      .catch(() => setStatus('unknown'));
  }, [outTradeNo]);

  // 倒计时自动跳转
  useEffect(() => {
    if (countdown <= 0) {
      navigate('shop');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  const isPaid = status === 'paid';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '80vh', padding: 20,
      textAlign: 'center',
    }}>
      {/* 结果图标 */}
      <div style={{
        width: 80, height: 80, borderRadius: 40,
        background: isPaid ? '#f0fdf4' : '#fff7ed',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
        animation: isPaid ? 'scaleIn 0.5s ease' : 'none',
      }}>
        {isPaid ? (
          <i className="fas fa-check-circle" style={{ fontSize: 48, color: 'var(--primary)' }} />
        ) : (
          <i className="fas fa-clock" style={{ fontSize: 48, color: 'var(--warning)' }} />
        )}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        {isPaid ? '支付成功！' : '支付状态确认中'}
      </h2>
      <p style={{ color: '#999', marginBottom: 24 }}>
        {isPaid ? '感谢您的购买' : '请稍候，正在确认您的支付状态'}
      </p>

      {/* 订单信息 */}
      {outTradeNo && (
        <div style={{
          background: '#fff', borderRadius: 'var(--radius)', padding: 16,
          width: '100%', maxWidth: 320, marginBottom: 24,
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ color: '#999' }}>订单号</span>
            <span style={{ fontWeight: 500, fontSize: 13 }}>{outTradeNo}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ color: '#999' }}>支付方式</span>
            <span style={{ fontWeight: 500 }}>
              {channel === 'wechat' ? '微信支付' : '支付宝'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ color: '#999' }}>支付状态</span>
            <span style={{ fontWeight: 600, color: isPaid ? 'var(--primary)' : 'var(--warning)' }}>
              {isPaid ? '已支付' : '确认中'}
            </span>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-primary btn-block" onClick={() => navigate('shop')}>
          继续购物 ({countdown}s)
        </button>
        <button className="btn" style={{ background: '#f5f5f5', width: '100%' }}
          onClick={() => navigate('shop')}>
          返回店铺
        </button>
      </div>
    </div>
  );
}
