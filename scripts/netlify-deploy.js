/**
 * Deploy ~/Desktop/website to Netlify site via API
 * Usage: NETLIFY_TOKEN=xxx node scripts/netlify-deploy.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SITE_ID = 'resilient-strudel-41074c.netlify.app';
const DEPLOY_DIR = path.join(process.env.HOME, 'Desktop', 'website');
const TOKEN = process.env.NETLIFY_TOKEN;

if (!TOKEN) {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  Netlify Personal Access Token required                  ║
║                                                          ║
║  1. Go to: https://app.netlify.com/user/applications     ║
║     → Personal access tokens → New access token          ║
║  2. Name it "deploy" and copy the token                  ║
║  3. Run:                                                 ║
║     NETLIFY_TOKEN=your_token node scripts/netlify-deploy.js ║
╚══════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

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

async function main() {
  // 1. Build file manifest
  const entries = fs.readdirSync(DEPLOY_DIR).filter(f => !f.startsWith('.'));
  const fileMap = {};
  const fileData = {};
  
  console.log('📁 Files to deploy:');
  for (const f of entries) {
    const fp = path.join(DEPLOY_DIR, f);
    if (!fs.statSync(fp).isFile()) continue;
    const data = fs.readFileSync(fp);
    const hash = crypto.createHash('sha1').update(data).digest('hex');
    fileMap['/' + f] = hash;
    fileData['/' + f] = data;
    console.log(`  ${f} (${(data.length/1024).toFixed(1)} KB) → ${hash.slice(0,8)}...`);
  }

  // 2. Create deploy
  console.log('\n🚀 Creating deploy...');
  const res = await apiRequest('POST', `/api/v1/sites/${SITE_ID}/deploys`, { files: fileMap });
  
  if (res.status !== 200) {
    console.error('Error creating deploy:', res.status, JSON.stringify(res.data).slice(0,200));
    process.exit(1);
  }
  
  const deployId = res.data.id;
  const required = res.data.required || [];
  console.log(`  Deploy ID: ${deployId}`);
  console.log(`  Files to upload: ${required.length}`);

  // 3. Upload required files
  for (const [filePath, hash] of Object.entries(fileMap)) {
    if (required.includes(hash)) {
      process.stdout.write(`  Uploading ${filePath}...`);
      const upRes = await uploadFile(deployId, filePath, fileData[filePath]);
      console.log(` ${upRes.status === 200 ? '✅' : '❌ ' + upRes.status}`);
    } else {
      console.log(`  ${filePath} → already cached ✅`);
    }
  }

  console.log('\n✅ Deploy complete!');
  console.log(`  URL: https://${SITE_ID}`);
  console.log(`  SVG: https://kairos-777.com/kairos-icon-32.svg`);
}

main().catch(e => { console.error(e); process.exit(1); });
