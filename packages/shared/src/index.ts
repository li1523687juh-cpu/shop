// ==========================================
// @shop/shared - 共享类型定义
// 全项目统一的类型，所有包都依赖此包
// ==========================================

// --- 商品 ---
export interface Product {
  id: string;
  name: string;
  price: number;        // 单位：分 (前端展示时 /100)
  stock: number;
  imageUrl: string;
  description: string;
  isListed: boolean;    // 是否上架
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  price: number;        // 前端传「元」，后端转「分」
  stock: number;
  imageUrl: string;
  description: string;
}

export interface UpdateProductInput {
  name?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
  description?: string;
  isListed?: boolean;
}

// --- 订单 ---
export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type PaymentChannel = 'wechat' | 'alipay';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;        // 下单时的单价（分）
}

export interface Order {
  id: string;
  outTradeNo: string;   // 商户订单号（唯一，幂等键）
  items: OrderItem[];
  totalAmount: number;  // 总金额（分）
  status: OrderStatus;
  paymentChannel: PaymentChannel;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  items: {
    productId: string;
    quantity: number;
  }[];
  paymentChannel: PaymentChannel;
}

// --- 支付 ---
export interface PaymentResult {
  channel: PaymentChannel;
  /** 微信：JSAPI 调起参数；支付宝：tradeNo + paymentUrl */
  params: WechatJsapiParams | AlipayPaymentParams;
}

export interface WechatJsapiParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;      // "prepay_id=xxx"
  signType: 'RSA';
  paySign: string;
}

export interface AlipayPaymentParams {
  tradeNo: string;      // 支付宝交易号
  paymentUrl: string;   // H5 支付链接（非支付宝环境降级用）
}

// --- API 响应 ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- 购物车 (前端使用) ---
export interface CartItem {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;        // 单价（分）
  quantity: number;
  stock: number;        // 当前库存
}

// --- 收款统计 ---
export interface RevenueStats {
  today: number;        // 今日收入（分）
  thisMonth: number;    // 本月收入（分）
  total: number;        // 总收入（分）
}

// --- UA 环境类型 ---
export type UAEnvironment = 'wechat' | 'alipay' | 'browser';
