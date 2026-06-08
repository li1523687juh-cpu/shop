/**
 * 商品路由
 *
 * GET  /api/products       — 公开，浏览已上架商品
 * GET  /api/products/:id   — 公开，商品详情
 * POST /api/admin/products — 管理，创建商品（需要 admin 密码）
 * PUT  /api/admin/products/:id — 管理，更新商品
 * DELETE /api/admin/products/:id — 管理，删除商品
 */

import { Router } from 'express';
import { z } from 'zod';
import prisma from '@shop/db';
import type { Product } from '@shop/shared';

export const productsRouter = Router();

// ============ 校验 Schema ============

const createProductSchema = z.object({
  name: z.string().min(1, '商品名称不能为空').max(200),
  price: z.number().positive('价格必须为正数'),  // 前端传「元」，后端转「分」
  stock: z.number().int('库存必须为整数').min(0),
  imageUrl: z.string().url('请输入有效的图片链接'),
  description: z.string().max(2000).default(''),
  adminPassword: z.string(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  imageUrl: z.string().url().optional(),
  description: z.string().max(2000).optional(),
  isListed: z.boolean().optional(),
  adminPassword: z.string(),
});

// ============ 公开接口 ============

/** 获取所有已上架商品 */
productsRouter.get('/', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isListed: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
});

/** 获取单个商品详情 */
productsRouter.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    if (!product) {
      res.status(404).json({ success: false, error: '商品不存在' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
});

// ============ 管理接口 ============

const ADMIN_PASSWORD = 'admin123';

/** 创建商品 */
productsRouter.post('/admin', async (req, res, next) => {
  try {
    const data = createProductSchema.parse(req.body);

    if (data.adminPassword !== ADMIN_PASSWORD) {
      res.status(401).json({ success: false, error: '管理员密码错误' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        price: Math.round(data.price * 100),  // 元 → 分
        stock: data.stock,
        imageUrl: data.imageUrl,
        description: data.description,
        isListed: true,
      },
    });

    res.json({ success: true, data: product });
  } catch (err) { next(err); }
});

/** 更新商品 */
productsRouter.put('/admin/:id', async (req, res, next) => {
  try {
    const data = updateProductSchema.parse(req.body);

    if (data.adminPassword !== ADMIN_PASSWORD) {
      res.status(401).json({ success: false, error: '管理员密码错误' });
      return;
    }

    const { adminPassword, price, ...rest } = data;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(price !== undefined ? { price: Math.round(price * 100) } : {}),
      },
    });

    res.json({ success: true, data: product });
  } catch (err) { next(err); }
});

/** 删除商品 */
productsRouter.delete('/admin/:id', async (req, res, next) => {
  try {
    const { adminPassword } = z.object({ adminPassword: z.string() }).parse(req.body);

    if (adminPassword !== ADMIN_PASSWORD) {
      res.status(401).json({ success: false, error: '管理员密码错误' });
      return;
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});
