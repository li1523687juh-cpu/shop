/**
 * 支付流程 Hook
 *
 * 处理：创建订单 → 调起支付 → 轮询结果
 * 自动检测当前环境（微信/支付宝/浏览器）选择合适的支付方式
 */
import { useState, useCallback } from 'react';
import type { PaymentChannel, PaymentResult, Order, UAEnvironment } from '@shop/shared';

const API = '/api';

/** 检测当前运行环境 */
export function detectEnvironment(): UAEnvironment {
  const ua = navigator.userAgent;
  if (ua.includes('MicroMessenger')) return 'wechat';
  if (ua.includes('AlipayClient')) return 'alipay';
  return 'browser';
}

interface UsePaymentReturn {
  loading: boolean;
  error: string | null;
  /** 创建订单并获取支付凭证 */
  checkout: (items: { productId: string; quantity: number }[], channel: PaymentChannel) => Promise<{
    order: Order;
    payment: PaymentResult;
  } | null>;
  /** 模拟支付成功（开发用） */
  mockPay: (outTradeNo: string, channel: PaymentChannel) => Promise<boolean>;
  /** 轮询支付状态直到支付完成 */
  pollStatus: (outTradeNo: string, timeoutMs?: number) => Promise<string>;
}

export function usePayment(): UsePaymentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = useCallback(async (
    items: { productId: string; quantity: number }[],
    channel: PaymentChannel,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, paymentChannel: channel }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || '创建订单失败');
        return null;
      }

      return json.data as { order: Order; payment: PaymentResult };
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const mockPay = useCallback(async (outTradeNo: string, channel: PaymentChannel) => {
    try {
      const res = await fetch(`${API}/webhooks/mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outTradeNo, paymentChannel: channel }),
      });
      const json = await res.json();
      return json.success;
    } catch {
      return false;
    }
  }, []);

  const pollStatus = useCallback(async (outTradeNo: string, timeoutMs = 30000) => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const res = await fetch(`${API}/orders/status/${outTradeNo}`);
      const json = await res.json();

      if (json.success && json.data.status !== 'PENDING') {
        return json.data.status;
      }

      // 每 2 秒轮询一次
      await new Promise(r => setTimeout(r, 2000));
    }

    return 'EXPIRED';
  }, []);

  return { loading, error, checkout, mockPay, pollStatus };
}
