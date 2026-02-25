/**
 * Kairos 777 — High-Quality Banner Screenshot Generator
 * Uses Puppeteer to render HTML templates as pixel-perfect PNGs
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const TEMPLATES_DIR = path.join(__dirname, '..', 'assets', 'promo', 'templates');
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'promo');

const banners = [
  {
    name: 'kairos-ecosystem-twitter',
    file: 'banner-ecosystem.html',
    width: 1200,
    height: 675,
    description: 'Twitter — Ecosystem hero with chart + bot'
  },
  {
    name: 'kairos-ecosystem-telegram',
    file: 'banner-telegram.html',
    width: 1200,
    height: 675,
    description: 'Telegram — Three product cards'
  },
  {
    name: 'kairos-trade-twitter',
    file: 'banner-trade.html',
    width: 1200,
    height: 675,
    description: 'Twitter — Trading focus with full chart + 3 bots'
  }
];

(async () => {
  console.log('🎨 Generating high-quality Kairos 777 banners...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const banner of banners) {
    const page = await browser.newPage();
    await page.setViewport({
      width: banner.width,
      height: banner.height,
      deviceScaleFactor: 2  // 2× for retina quality
    });

    const filePath = path.join(TEMPLATES_DIR, banner.file);
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 1000)); // extra settle time

    const outPath = path.join(OUTPUT_DIR, `${banner.name}.png`);
    await page.screenshot({
      path: outPath,
      type: 'png',
      clip: { x: 0, y: 0, width: banner.width, height: banner.height }
    });

    const stats = fs.statSync(outPath);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`  ✅ ${banner.name}.png (${banner.width * 2}×${banner.height * 2} @2x, ${sizeKB}KB)`);
    console.log(`     ${banner.description}\n`);

    await page.close();
  }

  await browser.close();

  console.log(`📁 All images saved to: ${OUTPUT_DIR}/`);
  console.log('\nUsage:');
  console.log('  Tweet 1 (ecosystem):  kairos-ecosystem-twitter.png');
  console.log('  Tweet 2 (trade):      kairos-trade-twitter.png');
  console.log('  Telegram:             kairos-ecosystem-telegram.png');
})();
