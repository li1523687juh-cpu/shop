/**
 * 购物车 Hook — 全局状态管理
 *
 * 购物车数据存储在 React state 中，刷新不清除（暂不持久化到 localStorage
 * 以简化实现，实际项目中可加 localStorage 持久化）。
 */
import { useState, useCallback, useEffect } from 'react';
import type { CartItem } from '@shop/shared';

const CART_KEY = 'shop_cart';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => loadCart());

  useEffect(() => saveCart(items), [items]);

  const addToCart = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        // 数量不能超过库存
        const newQty = Math.min(existing.quantity + 1, item.stock);
        return prev.map(i => i.productId === item.productId ? { ...i, quantity: newQty } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.productId !== productId));
      return;
    }
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity } : i));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice, totalCount };
}
