/**
 * 统一错误处理中间件
 *
 * 捕获所有未处理的错误，返回标准化的 API 错误响应。
 * 区分 Zod 校验错误和普通 Error。
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err.message);

  // Zod 参数校验错误 → 400
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: '参数校验失败',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // 通用错误 → 500
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误',
  });
}
