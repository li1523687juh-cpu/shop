/**
 * 卖家管理后台 — 商品管理 + 订单列表 + 收入统计
 *
 * 功能：
 * - 商品增删改查、上架/下架
 * - 订单列表查看
 * - 今日/本月/总收入统计
 * - 简单的密码登录保护
 */

import React, { useState, useEffect } from 'react';
import type { Product, Order, RevenueStats } from '@shop/shared';

const API = '/api';
const ADMIN_PW = 'admin123';

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
  navigate: (r: 'shop' | 'cart' | 'checkout' | 'result' | 'admin') => void;
}

export default function AdminPage({ showToast }: Props) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<'products' | 'orders' | 'revenue'>('products');

  // 商品管理
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: '', price: '', stock: '', imageUrl: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  // 订单
  const [orders, setOrders] = useState<Order[]>([]);

  // 统计
  const [stats, setStats] = useState<RevenueStats>({ today: 0, thisMonth: 0, total: 0 });

  const fmt = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

  // 登录校验
  const handleLogin = () => {
    if (password === ADMIN_PW) {
      setAuthed(true);
      fetchProducts();
      fetchOrders();
      fetchRevenue();
    } else {
      showToast('密码错误（提示: admin123）', 'error');
    }
  };

  const fetchProducts = async () => {
    const res = await fetch(`${API}/products`);
    const json = await res.json();
    if (json.success) setProducts(json.data);
  };

  const fetchOrders = async () => {
    const res = await fetch(`${API}/orders/admin/all`);
    const json = await res.json();
    if (json.success) setOrders(json.data);
  };

  const fetchRevenue = async () => {
    const res = await fetch(`${API}/orders/admin/revenue`);
    const json = await res.json();
    if (json.success) setStats(json.data);
  };

  // 创建/更新商品
  const handleSaveProduct = async () => {
    if (!form.name || !form.price) {
      showToast('商品名称和价格不能为空', 'error');
      return;
    }

    const body = {
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock) || 0,
      adminPassword: ADMIN_PW,
    };

    if (editingId) {
      const res = await fetch(`${API}/products/admin/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        showToast('商品已更新', 'success');
        setEditingId(null);
        resetForm();
        fetchProducts();
      }
    } else {
      const res = await fetch(`${API}/products/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        showToast('商品已上架', 'success');
        resetForm();
        fetchProducts();
      }
    }
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: String(p.price / 100),
      stock: String(p.stock),
      imageUrl: p.imageUrl,
      description: p.description,
    });
    setTab('products');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该商品？')) return;
    await fetch(`${API}/products/admin/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword: ADMIN_PW }),
    });
    showToast('商品已删除', 'success');
    fetchProducts();
  };

  const resetForm = () => {
    setForm({ name: '', price: '', stock: '', imageUrl: '', description: '' });
  };

  // 状态标签颜色
  const statusColor = (s: string) => {
    switch (s) {
      case 'PAID': return 'var(--primary)';
      case 'PENDING': return 'var(--warning)';
      case 'CANCELLED': case 'EXPIRED': return '#999';
      default: return 'var(--text)';
    }
  };
  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      PENDING: '待付款', PAID: '已付款', SHIPPED: '已发货',
      COMPLETED: '已完成', CANCELLED: '已取消', EXPIRED: '已过期',
    };
    return map[s] || s;
  };

  // 未登录 → 显示登录页
  if (!authed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60 }}>
        <i className="fas fa-lock" style={{ fontSize: 48, color: '#999', marginBottom: 20 }} />
        <h2>管理员登录</h2>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="请输入管理员密码"
          style={{
            width: '100%', maxWidth: 300, padding: '12px 16px',
            borderRadius: 8, border: '1px solid var(--border)',
            fontSize: 16, marginTop: 16, outline: 'none',
          }}
        />
        <button
          className="btn btn-primary"
          onClick={handleLogin}
          style={{ width: '100%', maxWidth: 300, marginTop: 12 }}
        >
          登录
        </button>
        <p style={{ color: '#999', marginTop: 12, fontSize: 13 }}>默认密码: admin123</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, padding: '16px 0 12px' }}>
        ⚙️ 管理后台
      </h2>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['products', 'orders', 'revenue'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="btn"
            style={{
              flex: 1, padding: '10px 0', fontSize: 14,
              background: tab === t ? 'var(--primary)' : '#fff',
              color: tab === t ? '#fff' : 'var(--text)',
              border: tab === t ? 'none' : '1px solid var(--border)',
            }}
          >
            {t === 'products' ? '📦 商品' : t === 'orders' ? '📋 订单' : '💰 收入'}
          </button>
        ))}
      </div>

      {/* ====== 商品管理 ====== */}
      {tab === 'products' && (
        <div>
          {/* 表单 */}
          <div style={{
            background: '#fff', borderRadius: 'var(--radius)',
            padding: 16, marginBottom: 16, boxShadow: 'var(--shadow)',
          }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>
              {editingId ? '✏️ 编辑商品' : '➕ 添加商品'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="商品名称 *" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                style={inputStyle} />
              <input placeholder="价格（元）*" type="number" step="0.01" value={form.price}
                onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                style={inputStyle} />
              <input placeholder="库存数量" type="number" value={form.stock}
                onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                style={inputStyle} />
              <input placeholder="商品图片URL" value={form.imageUrl}
                onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
                style={inputStyle} />
              <input placeholder="商品描述（可选）" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                style={inputStyle} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleSaveProduct} style={{ flex: 1 }}>
                  {editingId ? '保存修改' : '上架商品'}
                </button>
                {editingId && (
                  <button className="btn" onClick={() => { setEditingId(null); resetForm(); }}
                    style={{ background: '#f5f5f5' }}>
                    取消
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 商品列表 */}
          {products.map(p => (
            <div key={p.id} style={{
              display: 'flex', gap: 10, alignItems: 'center',
              background: '#fff', padding: 10, borderRadius: 'var(--radius)',
              marginBottom: 8, boxShadow: 'var(--shadow)',
            }}>
              <img src={p.imageUrl} alt={p.name}
                style={{ width: 56, height: 56, borderRadius: 6, objectFit: 'cover', background: '#f0f0f0' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</p>
                <p style={{ fontSize: 12, color: '#999' }}>
                  {fmt(p.price)} | 库存: {p.stock} | {p.isListed ? '已上架' : '已下架'}
                </p>
              </div>
              <button onClick={() => handleEdit(p)} style={iconBtnStyle}>
                <i className="fas fa-edit" />
              </button>
              <button onClick={() => handleDelete(p.id)} style={{ ...iconBtnStyle, color: 'var(--danger)' }}>
                <i className="fas fa-trash" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ====== 订单列表 ====== */}
      {tab === 'orders' && (
        <div>
          {orders.map(o => (
            <div key={o.id} style={{
              background: '#fff', padding: 14, borderRadius: 'var(--radius)',
              marginBottom: 8, boxShadow: 'var(--shadow)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#999' }}>{o.outTradeNo}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: statusColor(o.status) }}>
                  {statusLabel(o.status)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{o.items?.map(i => `${i.productName}×${i.quantity}`).join(', ')}</span>
                <span style={{ fontWeight: 700 }}>{fmt(o.totalAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: '#999' }}>
                  {o.paymentChannel === 'wechat' ? '微信' : '支付宝'} | {new Date(o.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              <p>暂无订单</p>
            </div>
          )}
        </div>
      )}

      {/* ====== 收入统计 ====== */}
      {tab === 'revenue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <StatCard label="今日收入" amount={stats.today} />
            <StatCard label="本月收入" amount={stats.thisMonth} />
            <StatCard label="总收入" amount={stats.total} />
          </div>
          <div style={{
            background: '#fff', borderRadius: 'var(--radius)', padding: 16,
            boxShadow: 'var(--shadow)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>💡 说明</h3>
            <ul style={{ color: '#666', fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
              <li>当前为 <strong>模拟支付模式</strong>，所有支付数据为测试数据</li>
              <li>要接入真实支付，请在 <code>.env</code> 中填入商户信息</li>
              <li>将 <code>PAYMENT_MODE</code> 改为 <code>real</code> 即切换为真实支付</li>
              <li>店铺入口二维码可在店铺首页底部找到</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/** 收入统计卡片 */
function StatCard({ label, amount }: { label: string; amount: number }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 'var(--radius)', padding: 16,
      textAlign: 'center', boxShadow: 'var(--shadow)',
    }}>
      <p style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)' }}>
        ¥{(amount / 100).toFixed(2)}
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
  fontSize: 14, outline: 'none', width: '100%',
};

const iconBtnStyle: React.CSSProperties = {
  border: 'none', background: 'none', fontSize: 16,
  cursor: 'pointer', padding: 6, color: '#666',
};
