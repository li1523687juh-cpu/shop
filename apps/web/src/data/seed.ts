/**
 * 种子数据 — 前端独立模式下的默认商品
 * 当后端 API 不可用时，自动使用这些数据
 */

import type { Product } from '@shop/shared';

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'seed-1',
    name: '手冲咖啡壶套装',
    price: 15900,   // 159元 = 15900分
    stock: 25,
    imageUrl: 'https://picsum.photos/seed/coffee/400/400',
    description: '专业手冲咖啡壶，含玻璃壶+滤杯+手冲壶',
    isListed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-2',
    name: '简约帆布双肩包',
    price: 8900,
    stock: 50,
    imageUrl: 'https://picsum.photos/seed/backpack/400/400',
    description: '大容量防水帆布包，日常通勤出行必备',
    isListed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-3',
    name: '无线蓝牙降噪耳机',
    price: 29900,
    stock: 15,
    imageUrl: 'https://picsum.photos/seed/headphone/400/400',
    description: '30小时续航，主动降噪，佩戴舒适',
    isListed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-4',
    name: '手工陶瓷马克杯',
    price: 3900,
    stock: 100,
    imageUrl: 'https://picsum.photos/seed/mug/400/400',
    description: '纯手工制作，每个独一无二，350ml',
    isListed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-5',
    name: '纯棉T恤 基础款',
    price: 7900,
    stock: 80,
    imageUrl: 'https://picsum.photos/seed/tshirt/400/400',
    description: '100%精梳棉，男女同款，透气舒适',
    isListed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-6',
    name: '便携充电宝 10000mAh',
    price: 12900,
    stock: 35,
    imageUrl: 'https://picsum.photos/seed/powerbank/400/400',
    description: '轻薄小巧，支持快充，Type-C接口',
    isListed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
