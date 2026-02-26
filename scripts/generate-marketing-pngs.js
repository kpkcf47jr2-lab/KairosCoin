const puppeteer = require('puppeteer');
const path = require('path');

async function htmlToPng(htmlFile, outputFile) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  
  const filePath = path.resolve(__dirname, '..', 'assets', 'marketing', htmlFile);
  await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });
  
  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 1500));
  
  const outputPath = path.resolve(require('os').homedir(), 'Desktop', outputFile);
  await page.screenshot({ 
    path: outputPath, 
    clip: { x: 0, y: 0, width: 1920, height: 1080 }
  });
  
  console.log(`✅ ${outputFile} → ${outputPath}`);
  await browser.close();
}

(async () => {
  console.log('🎨 Generando PNGs de marketing...\n');
  
  await htmlToPng('dashboard-mockup.html', 'kairos-dashboard.png');
  await htmlToPng('portfolio-mockup.html', 'kairos-portfolio.png');
  await htmlToPng('bots-mockup.html', 'kairos-bots.png');
  
  console.log('\n✅ ¡Listo! 3 imágenes PNG en el Desktop');
})();
