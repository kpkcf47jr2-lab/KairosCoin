#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — Production Deploy Script
//  Runs: lint → build → deploy → verify
//  Usage: node scripts/deploy-trade.js
// ═══════════════════════════════════════════════════════════════════════════════

import { execSync } from 'child_process';

const SITE_ID = 'b7b3fd54-863a-4e6f-a334-460b1092045b';
const AUTH_TOKEN = 'nfp_iSeKAZP4UYALcgFUzENCx79hgKKEFtbue963';
const PROD_URL = 'https://kairos-trade.netlify.app';

const run = (cmd, label) => {
  console.log(`\n🔄 ${label}...`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: new URL('../kairos-trade', import.meta.url).pathname });
    console.log(`✅ ${label} — OK`);
    return true;
  } catch {
    console.error(`❌ ${label} — FAILED`);
    return false;
  }
};

console.log('═══════════════════════════════════════');
console.log('  KAIROS TRADE — PRODUCTION DEPLOY');
console.log('═══════════════════════════════════════');

// Step 1: Lint (hooks safety check)
if (!run('npm run lint:hooks', 'Lint: React Hooks Safety Check')) {
  console.error('\n🚫 DEPLOY ABORTED: Hooks violation detected. Fix before deploying.');
  process.exit(1);
}

// Step 2: Build
if (!run('npx vite build', 'Build: Production Bundle')) {
  console.error('\n🚫 DEPLOY ABORTED: Build failed.');
  process.exit(1);
}

// Step 3: Deploy to Netlify
if (!run(`npx netlify deploy --prod --dir=dist --site=${SITE_ID} --auth=${AUTH_TOKEN}`, 'Deploy: Netlify Production')) {
  console.error('\n🚫 DEPLOY FAILED: Netlify deploy error.');
  process.exit(1);
}

// Step 4: Verify production is alive
console.log('\n🔄 Verify: Production Health Check...');
try {
  const response = await fetch(PROD_URL, { redirect: 'follow' });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (!html.includes('kairos') && !html.includes('root')) {
    throw new Error('HTML does not contain expected content');
  }

  // Check that JS bundles are accessible
  const jsMatch = html.match(/src="\/assets\/(index-[^"]+\.js)"/);
  if (jsMatch) {
    const jsUrl = `${PROD_URL}/assets/${jsMatch[1]}`;
    const jsRes = await fetch(jsUrl);
    if (!jsRes.ok) throw new Error(`JS bundle not accessible: ${jsRes.status}`);
    console.log(`✅ JS bundle verified: ${jsMatch[1]}`);
  }

  console.log('✅ Verify: Production Health Check — OK');
} catch (err) {
  console.error(`⚠️  Verify: Health check warning — ${err.message}`);
  console.error('   Site may still be propagating. Check manually: ' + PROD_URL);
}

// Step 5: API connectivity check
console.log('\n🔄 Verify: Backend API...');
try {
  const apiRes = await fetch('https://kairos-api-u6k5.onrender.com/api/health');
  const apiData = await apiRes.json();
  if (apiRes.ok) {
    console.log('✅ Verify: Backend API — OK');
  } else {
    console.warn('⚠️  Backend returned non-200:', apiRes.status);
  }
} catch {
  console.warn('⚠️  Backend API unreachable (may be cold-starting)');
}

console.log('\n═══════════════════════════════════════');
console.log('  ✅ DEPLOY COMPLETE');
console.log(`  🌐 ${PROD_URL}`);
console.log('═══════════════════════════════════════\n');
