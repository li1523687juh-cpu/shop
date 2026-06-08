/**
 * QR 码生成脚本
 *
 * 用法: node scripts/generate-qr.mjs [店铺URL]
 * 默认: http://localhost:5173/#/shop
 *
 * 生成的 QR 码保存在项目根目录: shop-qrcode.png
 */

import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, '..', 'shop-qrcode.png');

const shopUrl = process.argv[2] || 'http://localhost:5173/#/shop';

async function main() {
  console.log(`🔗 店铺 URL: ${shopUrl}`);

  // 生成 PNG 文件
  await QRCode.toFile(outputPath, shopUrl, {
    width: 512,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });

  console.log(`✅ QR 码已保存到: ${outputPath}`);
  console.log('');
  console.log('📱 使用方式:');
  console.log(`   1. 将 ${outputPath} 打印出来贴在店里`);
  console.log('   2. 顾客用微信或支付宝扫描二维码');
  console.log('   3. 自动进入店铺页面，浏览商品并支付');
  console.log('');
  console.log('💡 提示:');
  console.log('   - 部署到线上后，用真实域名重新生成 QR 码');
  console.log('   - 修改 URL: node scripts/generate-qr.mjs https://你的域名');
}

main().catch(console.error);
