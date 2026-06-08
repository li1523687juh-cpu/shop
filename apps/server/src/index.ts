/**
 * 一码多付 — Express 服务器入口
 *
 * 启动: npm run dev (tsx watch src/index.ts)
 * 端口: 3001 (默认)
 */

import express from 'express';
import cors from 'cors';
import { uaDetectMiddleware, getEnvironment } from './middleware/ua-detect';
import { errorHandler } from './middleware/error-handler';
import { productsRouter } from './routes/products';
import { ordersRouter } from './routes/orders';
import { webhooksRouter } from './routes/webhooks';
import { cancelExpiredOrders } from './services/order.service';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ============ 全局中间件 ============

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');

app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（如 Postman、服务器间调用）
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, true); // 开发模式宽松处理。生产环境去掉此行，改为 callback(new Error('Not allowed'))
  },
  credentials: true,
}));
app.use(express.json());
app.use(uaDetectMiddleware);

// ============ 路由挂载 ============

/** 环境检测接口（前端获取当前运行环境） */
app.get('/api/environment', getEnvironment);

/** 商品路由 */
app.use('/api/products', productsRouter);

/** 订单路由 */
app.use('/api/orders', ordersRouter);

/** Webhook 路由 */
app.use('/api/webhooks', webhooksRouter);

/** 健康检查 */
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ============ 错误处理 ============

app.use(errorHandler);

// ============ 定时任务：取消过期订单 ============

// 每 5 分钟检查一次过期订单
setInterval(() => {
  cancelExpiredOrders().catch(err => console.error('定时取消订单失败:', err));
}, 5 * 60 * 1000);

// ============ 启动 ============

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  🛍️  一码多付 电商系统 — 后端服务已启动       ║
║  📡 端口: ${PORT}                              ║
║  🌐 CORS: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}  ║
║  💰 支付模式: ${process.env.PAYMENT_MODE || 'mock'}                      ║
║  📋 API: http://localhost:${PORT}/api/health     ║
╚══════════════════════════════════════════════╝`);
});

export default app;
