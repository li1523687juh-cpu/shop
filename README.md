# 🛍️ 一码多付 电商系统

> **一个二维码，微信支付宝通吃。** 顾客扫码进入店铺 → 浏览商品 → 下单 → 付款，资金直达商户账号。

---

## 🚀 快速启动

### 环境要求

- Node.js >= 18
- Docker Desktop（用于 PostgreSQL）
- npm >= 9

### 1. 启动数据库

```bash
docker-compose up -d
```

### 2. 安装依赖

```bash
npm install
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npm run db:generate -w packages/db

# 创建表结构
npm run db:migrate -w packages/db
```

### 4. 添加测试商品（种子数据）

```bash
# 通过 API 添加，或使用管理后台手动添加
# 管理后台: http://localhost:5173/#/admin
# 密码: admin123
```

### 5. 启动开发服务器

```bash
npm run dev
```

- 🖥️ 前端: http://localhost:5173
- 🔧 后端 API: http://localhost:3001
- 🗄️ Prisma Studio: `npm run db:studio`

### 6. 生成店铺二维码

```bash
npm run qr:generate
# QR 码保存到: shop-qrcode.png
# 打印出来贴在店里，顾客扫码即逛店
```

---

## 📁 项目结构

```
店铺/
├── apps/
│   ├── web/                     # React 前端 (Vite)
│   │   └── src/
│   │       ├── pages/           # ShopPage, CartPage, CheckoutPage, ResultPage, AdminPage
│   │       ├── components/      # PaymentButton, QrCode
│   │       └── hooks/           # useCart, usePayment, useToast
│   └── server/                  # Express 后端
│       └── src/
│           ├── routes/          # products, orders, webhooks
│           ├── middleware/       # UA检测, 错误处理
│           └── services/        # 订单业务逻辑
├── packages/
│   ├── shared/                  # 共享 TypeScript 类型
│   ├── db/                      # Prisma schema + 数据库客户端
│   └── payment/                 # 统一支付抽象层
│       └── src/
│           ├── types.ts         # PaymentProvider 接口
│           ├── wechat.ts        # 微信支付实现
│           ├── alipay.ts        # 支付宝支付实现
│           └── factory.ts       # Provider 工厂
├── scripts/
│   └── generate-qr.mjs         # QR 码生成脚本
├── docker-compose.yml          # PostgreSQL
└── .env                        # 环境变量配置
```

---

## 💰 支付模式

### 开发模式（默认）

`.env` 中设置 `PAYMENT_MODE=mock`：
- 无需商户号即可运行
- 支付页面显示模拟收款码
- 点击"一键模拟支付成功"完成支付流程
- 完整订单流转（下单 → 支付 → 回调 → 更新状态）

### 真实支付模式

1. **微信支付 JSAPI**（需要微信认证服务号）
   - 在 `.env` 中填入 `WECHAT_MCH_ID`、`WECHAT_API_V3_KEY` 等
   - 设置 `PAYMENT_MODE=real`

2. **支付宝当面付**（需要签约支付宝商户）
   - 在 `.env` 中填入 `ALIPAY_APP_ID`、`ALIPAY_PRIVATE_KEY` 等
   - 设置 `PAYMENT_MODE=real`

> 📖 详细配置指南见 [商户号配置指南](#商户号配置指南)

---

## 🔐 安全机制

| 机制 | 实现 |
|------|------|
| **金额校验** | 后端根据数据库价格重算订单总额，前端金额仅供参考 |
| **防超卖** | 下单时 Prisma 事务原子扣减库存 |
| **幂等处理** | Webhook 回调基于 `outTradeNo` 检查订单状态，防止重复处理 |
| **验签** | 微信 V3 验签 + AEAD 解密；支付宝 RSA2 验签 |
| **过期取消** | 30 分钟未支付订单自动取消 + 恢复库存 |
| **参数校验** | Zod schema 校验所有 API 输入 |

---

## 🔗 一码多付原理

```
顾客扫描二维码
       │
       ▼
  ┌─────────────────────────┐
  │ 后端 UA 检测中间件        │
  │                         │
  │ MicroMessenger → 微信环境 │
  │ AlipayClient   → 支付宝  │
  │ 其他           → 通用H5  │
  └─────────────────────────┘
       │
       ▼
  React 店铺页面（自动适配环境）
       │
       ├─ 微信内 → 微信 JS Bridge → 微信支付
       └─ 支付宝内 → 支付宝 Bridge → 支付宝支付
```

**一个二维码**贴在店里/菜单上/宣传单上，顾客无论用什么 App 扫都能支付。

---

## 🏪 商户号配置指南

### 微信支付商户号申请

1. 注册微信服务号（需企业资质，300元/年认证费）
2. 在服务号后台开通微信支付功能
3. 登录 [微信支付商户平台](https://pay.weixin.qq.com)
4. 在「账户中心 → API安全」中设置：
   - APIv3 密钥
   - 下载商户证书（apiclient_key.pem）
   - 获取商户号（mchId）和证书序列号

### 支付宝商户号签约

1. 注册 [支付宝开放平台](https://open.alipay.com) 账号
2. 创建应用 → 签约「手机网站支付」或「当面付」
3. 在「开发者中心」获取：
   - AppID
   - 应用私钥 + 支付宝公钥（或使用支付宝密钥生成工具）

### 填入环境变量

```bash
# .env
PAYMENT_MODE=real

# 微信
WECHAT_MCH_ID=1230000109
WECHAT_APP_ID=wxabc123
WECHAT_API_V3_KEY=你的32位密钥
WECHAT_SERIAL_NO=证书序列号
WECHAT_PRIVATE_KEY_PATH=./apiclient_key.pem
WECHAT_NOTIFY_URL=https://你的域名/api/webhooks/wechat

# 支付宝
ALIPAY_APP_ID=2021001xxx
ALIPAY_PRIVATE_KEY=你的应用私钥
ALIPAY_PUBLIC_KEY=支付宝公钥
ALIPAY_NOTIFY_URL=https://你的域名/api/webhooks/alipay
```

---

## 📱 部署上线

```bash
# 构建前端
npm run build -w apps/web

# 构建后端
npm run build -w apps/server

# 部署到服务器（推荐 Docker）
# 或使用 Vercel (前端) + Railway (后端 + 数据库)
```

部署后，用真实域名重新生成二维码：
```bash
node scripts/generate-qr.mjs https://你的域名
```

---

## 📄 License

MIT
