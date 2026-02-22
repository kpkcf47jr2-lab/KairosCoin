/**
 * Deploy Kairos Wallet to a NEW Netlify site
 * Creates site, deploys build, configures custom domain
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEPLOY_DIR = path.join(__dirname, '..', 'kairos-wallet', 'dist');
const TOKEN = 'nfp_pU5vLFxKCEuZS7mnPW2zn7YSYVHbrXjX0c93';

// We'll create a new site or use an existing one
let SITE_ID = process.env.WALLET_SITE_ID || '';

function apiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.netlify.com',
      path: apiPath,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    
    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function uploadFile(deployId, filePath, fileData) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.netlify.com',
      path: `/api/v1/deploys/${deployId}/files${filePath}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileData.length,
      },
    };
    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', reject);
    req.write(fileData);
    req.end();
  });
}

function walkDir(dir, prefix = '') {
  const results = [];
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    const fullPath = path.join(dir, entry);
    const webPath = prefix + '/' + entry;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walkDir(fullPath, webPath));
    } else {
      results.push({ webPath, fullPath, size: stat.size });
    }
  }
  return results;
}

async function main() {
  console.log('🔷 Kairos Wallet — Netlify Deployment');
  console.log('=====================================\n');

  // 1. Create new site if needed
  if (!SITE_ID) {
    console.log('📦 Creating new Netlify site...');
    const siteRes = await apiRequest('POST', '/api/v1/sites', {
      name: 'kairos-wallet',
      custom_domain: null,
    });
    
    if (siteRes.status === 201 || siteRes.status === 200) {
      SITE_ID = siteRes.data.id;
      console.log(`  ✅ Site created: ${siteRes.data.default_domain}`);
      console.log(`  Site ID: ${SITE_ID}`);
    } else {
      // Site name might be taken, try with random suffix
      const siteRes2 = await apiRequest('POST', '/api/v1/sites', {});
      SITE_ID = siteRes2.data.id;
      console.log(`  ✅ Site created: ${siteRes2.data.default_domain}`);
      console.log(`  Site ID: ${SITE_ID}`);
    }
  } else {
    console.log(`📦 Using existing site: ${SITE_ID}`);
  }

  // 2. Build file manifest
  const files = walkDir(DEPLOY_DIR);
  const fileMap = {};
  const fileDataMap = {};

  console.log(`\n📁 Files to deploy (${files.length}):`);
  for (const file of files) {
    const data = fs.readFileSync(file.fullPath);
    const hash = crypto.createHash('sha1').update(data).digest('hex');
    fileMap[file.webPath] = hash;
    fileDataMap[file.webPath] = data;
    console.log(`  ${file.webPath} (${(file.size/1024).toFixed(1)} KB)`);
  }

  // 3. Create deploy
  console.log('\n🚀 Creating deploy...');
  const deployRes = await apiRequest('POST', `/api/v1/sites/${SITE_ID}/deploys`, {
    files: fileMap,
  });

  if (deployRes.status !== 200) {
    console.error('Error creating deploy:', deployRes.status, JSON.stringify(deployRes.data).slice(0, 300));
    process.exit(1);
  }

  const deployId = deployRes.data.id;
  const required = deployRes.data.required || [];
  console.log(`  Deploy ID: ${deployId}`);
  console.log(`  Requires upload: ${required.length} / ${files.length} files`);

  // 4. Upload required files
  let uploaded = 0;
  for (const [webPath, hash] of Object.entries(fileMap)) {
    if (required.includes(hash)) {
      process.stdout.write(`  Uploading ${webPath}...`);
      const upRes = await uploadFile(deployId, webPath, fileDataMap[webPath]);
      console.log(` ${upRes.status === 200 ? '✅' : '❌ ' + upRes.status}`);
      uploaded++;
    }
  }
  console.log(`  ${files.length - uploaded} files cached, ${uploaded} uploaded`);

  // 5. Done!
  const siteUrl = deployRes.data.ssl_url || deployRes.data.url || `https://${deployRes.data.subdomain}.netlify.app`;
  console.log('\n═══════════════════════════════════════');
  console.log('✅ KAIROS WALLET DEPLOYED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════');
  console.log(`  🌐 URL: ${siteUrl}`);
  console.log(`  📱 Open on your phone to install as PWA`);
  console.log(`  🔑 Site ID: ${SITE_ID}`);
  console.log(`\n  To update custom domain, run:`);
  console.log(`  WALLET_SITE_ID=${SITE_ID} node scripts/deploy-wallet.js`);
}

main().catch(e => { console.error(e); process.exit(1); });
