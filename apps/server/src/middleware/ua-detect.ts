/**
 * UA 检测中间件 — 识别扫码来源
 *
 * 根据 User-Agent 判断用户使用什么 App 打开的 H5：
 * - MicroMessenger → 微信
 * - AlipayClient → 支付宝
 * - 其他 → 普通浏览器
 *
 * 结果注入 req.uaEnvironment，后续路由和前端渲染使用
 */

import type { Request, Response, NextFunction } from 'express';
import type { UAEnvironment } from '@shop/shared';

declare global {
  namespace Express {
    interface Request {
      uaEnvironment: UAEnvironment;
    }
  }
}

export function uaDetectMiddleware(req: Request, _res: Response, next: NextFunction) {
  const ua = req.headers['user-agent'] || '';

  if (ua.includes('MicroMessenger')) {
    req.uaEnvironment = 'wechat';
  } else if (ua.includes('AlipayClient')) {
    req.uaEnvironment = 'alipay';
  } else {
    req.uaEnvironment = 'browser';
  }

  console.log(`[UA-Detect] ${req.uaEnvironment} ← ${ua.slice(0, 60)}...`);
  next();
}

/** GET /api/environment — 前端获取当前环境信息 */
export function getEnvironment(req: Request, res: Response) {
  const ua = req.headers['user-agent'] || '';

  res.json({
    success: true,
    data: {
      environment: req.uaEnvironment,
      userAgent: ua,
      features: {
        wechatPay: req.uaEnvironment === 'wechat',
        alipayPay: req.uaEnvironment === 'alipay',
        jsBridge: req.uaEnvironment !== 'browser',
      },
    },
  });
}
