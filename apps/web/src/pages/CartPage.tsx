/**
 * 购物车页 — 商品列表、数量调整、总价计算、去结算
 */

import React from 'react';
import type { CartItem } from '@shop/shared';

interface Props {
  cart: {
    items: CartItem[];
    updateQuantity: (productId: string, qty: number) => void;
    removeFromCart: (productId: string) => void;
    totalPrice: number;
    totalCount: number;
  };
  showToast: (msg: string, type: 'success' | 'error') => void;
  navigate: (r: 'shop' | 'cart' | 'checkout' | 'result' | 'admin') => void;
}

export default function CartPage({ cart, showToast, navigate }: Props) {
  const fmt = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      showToast('购物车是空的', 'error');
      return;
    }
    navigate('checkout');
  };

  if (cart.items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
        <i className="fas fa-shopping-cart" style={{ fontSize: 48 }} />
        <p style={{ margin: '16px 0' }}>购物车是空的</p>
        <button className="btn btn-primary" onClick={() => navigate('shop')}>
          去逛逛
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, padding: '16px 0 12px' }}>
        🛒 购物车 ({cart.totalCount} 件)
      </h2>

      {/* 商品列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cart.items.map(item => (
          <div key={item.productId} style={{
            display: 'flex',
            gap: 12,
            background: '#fff',
            borderRadius: 'var(--radius)',
            padding: 12,
            boxShadow: 'var(--shadow)',
          }}>
            {/* 图片 */}
            <img
              src={item.imageUrl}
              alt={item.name}
              style={{
                width: 80, height: 80, borderRadius: 8, objectFit: 'cover',
                background: '#f0f0f0',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="%23ddd"><rect width="80" height="80"/><text x="25" y="45" fill="%23999">N/A</text></svg>';
              }}
            />

            {/* 信息 */}
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</h4>
              <p style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 15, margin: '4px 0' }}>
                {fmt(item.price)}
              </p>

              {/* 数量调整 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)}
                  style={{
                    width: 28, height: 28, borderRadius: 14, border: '1px solid var(--border)',
                    background: '#fff', fontSize: 16, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >−</button>
                <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => {
                    if (item.quantity >= item.stock) {
                      showToast(`库存不足 (${item.stock})`, 'error');
                      return;
                    }
                    cart.updateQuantity(item.productId, item.quantity + 1);
                  }}
                  style={{
                    width: 28, height: 28, borderRadius: 14, border: '1px solid var(--border)',
                    background: '#fff', fontSize: 16, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >+</button>

                <button
                  onClick={() => cart.removeFromCart(item.productId)}
                  style={{
                    marginLeft: 'auto', color: 'var(--danger)', border: 'none',
                    background: 'none', fontSize: 18, cursor: 'pointer',
                  }}
                >
                  <i className="fas fa-trash-alt" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部结算栏 */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid var(--border)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 99,
      }}>
        <div>
          <span style={{ fontSize: 13, color: '#999' }}>合计: </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--danger)' }}>
            {fmt(cart.totalPrice)}
          </span>
        </div>
        <button className="btn btn-primary" onClick={handleCheckout} style={{ fontSize: 16, padding: '12px 32px' }}>
          去结算
        </button>
      </div>

      {/* 底部占位 */}
      <div style={{ height: 80 }} />
    </div>
  );
}
