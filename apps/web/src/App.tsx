/**
 * App 根组件 — Hash 路由 + 底部导航
 *
 * 路由表:
 *   #/shop      — 商品浏览（默认首页）
 *   #/cart      — 购物车
 *   #/checkout  — 确认订单 + 支付
 *   #/result    — 支付结果
 *   #/admin     — 卖家管理后台
 */

import React, { useState, useEffect, useCallback } from 'react';
import ShopPage from './pages/ShopPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ResultPage from './pages/ResultPage';
import AdminPage from './pages/AdminPage';
import { useCart } from './hooks/useCart';
import { useToast } from './hooks/useToast';

type Route = 'shop' | 'cart' | 'checkout' | 'result' | 'admin';

function getRoute(): Route {
  const hash = window.location.hash.slice(1) || '/shop';
  const path = hash.replace('/', '');
  const validRoutes: Route[] = ['shop', 'cart', 'checkout', 'result', 'admin'];
  return validRoutes.includes(path as Route) ? (path as Route) : 'shop';
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute);
  const cart = useCart();
  const { toasts, show } = useToast();

  // 最后支付的订单号（跨页面传递）
  const [lastOutTradeNo, setLastOutTradeNo] = useState('');
  const [lastChannel, setLastChannel] = useState<'wechat' | 'alipay'>('wechat');

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((r: Route) => {
    window.location.hash = `/${r}`;
  }, []);

  const renderPage = () => {
    switch (route) {
      case 'shop':
        return <ShopPage cart={cart} showToast={show} navigate={navigate} />;
      case 'cart':
        return <CartPage cart={cart} showToast={show} navigate={navigate} />;
      case 'checkout':
        return (
          <CheckoutPage
            cart={cart}
            showToast={show}
            navigate={navigate}
            setResult={(outTradeNo, ch) => { setLastOutTradeNo(outTradeNo); setLastChannel(ch); }}
          />
        );
      case 'result':
        return (
          <ResultPage
            outTradeNo={lastOutTradeNo}
            channel={lastChannel}
            navigate={navigate}
          />
        );
      case 'admin':
        return <AdminPage showToast={show} navigate={navigate} />;
      default:
        return <ShopPage cart={cart} showToast={show} navigate={navigate} />;
    }
  };

  const hideNav = route === 'checkout' || route === 'result';

  return (
    <>
      {/* Toast 容器 */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>

      {/* 页面内容 */}
      <div style={{ minHeight: '100vh', paddingBottom: hideNav ? 0 : 70 }}>
        {renderPage()}
      </div>

      {/* 底部导航 */}
      {!hideNav && (
        <nav className="bottom-nav">
          <a href="#/shop" className={route === 'shop' ? 'active' : ''}>
            <i className="fas fa-store" /><span>店铺</span>
          </a>
          <a href="#/cart" className={`cart-badge ${route === 'cart' ? 'active' : ''}`}>
            <i className="fas fa-shopping-cart" />
            {cart.totalCount > 0 && <span>{cart.totalCount}</span>}
            <span style={{ position: 'static', background: 'none', color: 'inherit', fontSize: 11 }}>购物车</span>
          </a>
          <a href="#/admin" className={route === 'admin' ? 'active' : ''}>
            <i className="fas fa-cog" /><span>管理</span>
          </a>
        </nav>
      )}
    </>
  );
}
