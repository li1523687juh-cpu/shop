/**
 * Webhook 路由 — 支付回调处理
 *
 * 安全要点：
 * 1. 验签 — 防止伪造支付通知
 * 2. 幂等 — 相同通知重复发送时只处理一次
 * 3. 金额校验 — 回调金额必须与订单一致
 *
 * POST /api/webhooks/wechat
 * POST /api/webhooks/alipay
 * POST /api/webhooks/mock — 开发用模拟回调
 */

import { Router } from 'express';
import { getPaymentProvider } from '@shop/payment';
import { markOrderPaid } from '../services/order.service';

export const webhooksRouter = Router();

/** 微信支付回调 */
webhooksRouter.post('/wechat', async (req, res, next) => {
  try {
    const provider = getPaymentProvider('wechat');
    const result = await provider.handleWebhook(req.headers as Record<string, string>, req.body);

    if (!result.verified) {
      console.error('[Webhook] 微信签名验证失败');
      res.status(400).json({ code: 'FAIL', message: '签名验证失败' });
      return;
    }

    // 幂等处理 + 更新订单状态
    await markOrderPaid(result.outTradeNo, result.transactionId, result.amountPaid, result.paidAt);

    // 返回 200 告诉微信不再重发
    res.status(200).json({ code: 'SUCCESS', message: '成功' });
  } catch (err) {
    // 订单处理失败也返回 200 避免微信反复重试
    // 实际项目中需要记录异常并人工处理
    console.error('[Webhook] 微信回调处理异常:', err);
    res.status(200).json({ code: 'SUCCESS', message: '已接收' });
  }
});

/** 支付宝支付回调 */
webhooksRouter.post('/alipay', async (req, res, next) => {
  try {
    const provider = getPaymentProvider('alipay');
    const result = await provider.handleWebhook(req.headers as Record<string, string>, req.body);

    if (!result.verified) {
      console.error('[Webhook] 支付宝签名验证失败');
      res.status(200).send('fail');
      return;
    }

    await markOrderPaid(result.outTradeNo, result.transactionId, result.amountPaid, result.paidAt);

    // 返回 success 告诉支付宝不再重发
    res.status(200).send('success');
  } catch (err) {
    console.error('[Webhook] 支付宝回调处理异常:', err);
    res.status(200).send('success');
  }
});

/** 模拟支付回调（开发用） */
webhooksRouter.post('/mock', async (req, res, next) => {
  try {
    const { outTradeNo, paymentChannel } = req.body;

    if (!outTradeNo || !paymentChannel) {
      res.status(400).json({ success: false, error: '缺少参数' });
      return;
    }

    const now = new Date().toISOString();
    const txnId = `${paymentChannel}_mock_txn_${Date.now()}`;

    await markOrderPaid(outTradeNo, txnId, 0, now);

    res.json({ success: true, message: '模拟支付成功' });
  } catch (err) { next(err); }
});
