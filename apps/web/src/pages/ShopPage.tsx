/**
 * 商品浏览页 — 展示所有已上架商品
 *
 * 功能：
 * - 网格展示商品卡片
 * - 点击加入购物车
 * - 下拉刷新
 */

import React, { useState, useEffect } from 'react';
import type { Product, CartItem } from '@shop/shared';
import QrCode from '../components/QrCode';
import { SEED_PRODUCTS } from '../data/seed';

const API = '/api';
const PRODUCTS_LS_KEY = 'shop_products';

interface Props {
  cart: {
    items: CartItem[];
    addToCart: (item: CartItem) => void;
    totalCount: number;
  };
  showToast: (msg: string, type: 'success' | 'error') => void;
  navigate: (r: 'shop' | 'cart' | 'checkout' | 'result' | 'admin') => void;
}

export default function ShopPage({ cart, showToast }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/products`);
      const json = await res.json();
      if (json.success) setProducts(json.data);
    } catch (err) {
      showToast('加载商品失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast('该商品已售罄', 'error');
      return;
    }
    cart.addToCart({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      price: product.price,
      quantity: 1,
      stock: product.stock,
    });
    showToast(`已加入购物车: ${product.name}`, 'success');
  };

  // 价格格式化：分 → 元
  const fmt = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

  return (
    <div style={{ padding: '12px' }}>
      {/* 页面标题 */}
      <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>🛍️ 一码多付店铺</h1>
        <p style={{ color: '#999', fontSize: 13, marginTop: 4 }}>
          扫码逛店 · 微信支付宝都能付
        </p>
      </div>

      {/* 搜索 / 刷新 */}
      <div style={{ textAlign: 'right', marginBottom: 12 }}>
        <button onClick={fetchProducts} className="btn" style={{ fontSize: 13, padding: '6px 14px' }}>
          <i className="fas fa-sync-alt" /> 刷新
        </button>
      </div>

      {/* 加载中 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 32 }} />
          <p style={{ marginTop: 12 }}>加载商品中...</p>
        </div>
      )}

      {/* 商品网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '12px',
      }}>
        {products.map(product => (
          <div key={product.id} style={{
            background: '#fff',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* 商品图片 */}
            <div style={{
              width: '100%',
              paddingTop: '100%',
              position: 'relative',
              background: '#f0f0f0',
              overflow: 'hidden',
            }}>
              <img
                src={product.imageUrl}
                alt={product.name}
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="%23ddd"><rect width="200" height="200"/><text x="40" y="110" fill="%23999" font-size="18">暂无图片</text></svg>';
                }}
              />
              {product.stock <= 0 && (
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 16,
                }}>
                  已售罄
                </div>
              )}
            </div>

            {/* 商品信息 */}
            <div style={{ padding: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
                {product.name}
              </h3>
              <p style={{ color: 'var(--danger)', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                {fmt(product.price)}
              </p>
              <p style={{ color: '#999', fontSize: 11 }}>
                库存: {product.stock}
              </p>

              {/* 加入购物车按钮 */}
              <button
                onClick={() => handleAddToCart(product)}
                disabled={product.stock <= 0}
                className="btn btn-primary"
                style={{ marginTop: 'auto', fontSize: 13, padding: '8px 0', width: '100%' }}
              >
                <i className="fas fa-cart-plus" /> 加入购物车
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 空状态 */}
      {!loading && products.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
          <i className="fas fa-box-open" style={{ fontSize: 48 }} />
          <p style={{ marginTop: 12 }}>暂无商品<br />请先到管理后台添加商品</p>
        </div>
      )}

      {/* 店铺入口二维码 */}
      {!loading && (
        <div style={{ marginTop: 32, paddingBottom: 20 }}>
          <QrCode />
        </div>
      )}
    </div>
  );
}
