/**
 * 店铺入口二维码组件
 *
 * 生成店铺入口二维码，用户扫码后进入商品页面。
 * 使用 qrcode 库生成 DataURL 图片。
 *
 * 二维码编码的是店铺 URL（可配置，默认当前页面地址）。
 */

import React, { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';

interface Props {
  /** 店铺 URL（不传则使用当前页面地址的 /#/shop） */
  shopUrl?: string;
  /** 二维码尺寸 */
  size?: number;
}

export default function QrCode({ shopUrl, size = 220 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState('');

  useEffect(() => {
    const base = shopUrl || `${window.location.origin}${window.location.pathname}#/shop`;
    setUrl(base);
  }, [shopUrl]);

  useEffect(() => {
    if (!url || !canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  }, [url, size]);

  const downloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = '店铺二维码.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: '#fff', borderRadius: 'var(--radius)', padding: 24,
      boxShadow: 'var(--shadow)',
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
        📱 扫码进入店铺
      </h3>
      <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        微信 / 支付宝都能扫
      </p>

      {/* Canvas 二维码 */}
      <canvas ref={canvasRef} style={{ borderRadius: 8 }} />

      {/* 链接显示 */}
      <p style={{
        fontSize: 11, color: '#999', marginTop: 12,
        wordBreak: 'break-all', textAlign: 'center', maxWidth: size,
      }}>
        {url}
      </p>

      {/* 下载按钮 */}
      <button
        className="btn btn-primary"
        onClick={downloadQR}
        style={{ marginTop: 16, fontSize: 14, padding: '8px 20px' }}
      >
        <i className="fas fa-download" /> 下载二维码
      </button>

      <p style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
        打印贴在店里，顾客扫一扫即可逛店下单
      </p>
    </div>
  );
}
