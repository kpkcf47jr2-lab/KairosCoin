/**
 * Deploy ~/Desktop/website to Netlify with functions support
 * Usage: NETLIFY_TOKEN=xxx node scripts/netlify-deploy-v2.js
 */
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const zlib = require("zlib");

const SITE_ID = "resilient-strudel-41074c.netlify.app";
const DEPLOY_DIR = path.join(process.env.HOME, "Desktop", "website");
const FUNCTIONS_DIR = path.join(DEPLOY_DIR, "netlify", "functions");
const TOKEN = process.env.NETLIFY_TOKEN;

if (!TOKEN) {
  console.log("NETLIFY_TOKEN required");
  process.exit(1);
}

function apiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "api.netlify.com",
      path: apiPath,
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    };
    if (data) opts.headers["Content-Length"] = Buffer.byteLength(data);
    const req = https.request(opts, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function uploadFile(deployId, filePath, fileData) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.netlify.com",
      path: `/api/v1/deploys/${deployId}/files${filePath}`,
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/octet-stream",
        "Content-Length": fileData.length,
      },
    };
    const req = https.request(opts, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => resolve({ status: res.statusCode }));
    });
    req.on("error", reject);
    req.write(fileData);
    req.end();
  });
}

function collectFiles(dir, prefix) {
  const result = {};
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir);
  for (const e of entries) {
    const full = path.join(dir, e);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      Object.assign(result, collectFiles(full, prefix + e + "/"));
    } else {
      result[prefix + e] = full;
    }
  }
  return result;
}

async function main() {
  // 1. Collect ALL static files recursively (excluding netlify/functions which are handled separately)
  const fileMap = {};
  const fileData = {};

  function collectStaticFiles(dir, prefix) {
    const entries = fs.readdirSync(dir);
    for (const e of entries) {
      if (e.startsWith(".")) continue;
      const full = path.join(dir, e);
      const rel = prefix + e;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        // Skip netlify/functions (handled separately as serverless functions)
        if (rel === "netlify/functions" || rel === "netlify") continue;
        collectStaticFiles(full, rel + "/");
      } else {
        const data = fs.readFileSync(full);
        const hash = crypto.createHash("sha1").update(data).digest("hex");
        fileMap["/" + rel] = hash;
        fileData["/" + rel] = data;
      }
    }
  }

  console.log("📁 Static files:");
  collectStaticFiles(DEPLOY_DIR, "");
  for (const [fp, data] of Object.entries(fileData)) {
    console.log(`  ${fp} (${(data.length / 1024).toFixed(1)} KB)`);
  }

  // 2. Collect functions (create zip archives)
  const functions = {};
  const fnZips = {};
  console.log("\n⚡ Functions:");
  if (fs.existsSync(FUNCTIONS_DIR)) {
    const fnEntries = fs.readdirSync(FUNCTIONS_DIR).filter((f) => f.endsWith(".js"));
    for (const f of fnEntries) {
      const fp = path.join(FUNCTIONS_DIR, f);
      const fnName = f.replace(".js", "");
      // Create zip using macOS zip command
      const tmpDir = path.join(require("os").tmpdir(), "netlify-fn-" + Date.now());
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.copyFileSync(fp, path.join(tmpDir, f));
      const zipPath = path.join(tmpDir, fnName + ".zip");
      execSync(`cd "${tmpDir}" && zip -j "${zipPath}" "${f}"`);
      const zipData = fs.readFileSync(zipPath);
      const hash = crypto.createHash("sha1").update(zipData).digest("hex");
      functions[fnName] = hash;
      fnZips[fnName] = zipData;
      // cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
      console.log(`  ${fnName} (${(zipData.length / 1024).toFixed(1)} KB zipped)`);
    }
  }

  // 3. Create deploy with functions
  console.log("\n🚀 Creating deploy...");
  const deployBody = {
    files: fileMap,
    functions: functions,
  };
  
  const res = await apiRequest("POST", `/api/v1/sites/${SITE_ID}/deploys`, deployBody);
  if (res.status !== 200) {
    console.error("Error:", res.status, JSON.stringify(res.data).slice(0, 300));
    process.exit(1);
  }

  const deployId = res.data.id;
  const requiredFiles = res.data.required || [];
  const requiredFunctions = res.data.required_functions || [];
  console.log(`  Deploy ID: ${deployId}`);
  console.log(`  Files to upload: ${requiredFiles.length}`);
  console.log(`  Functions to upload: ${requiredFunctions.length}`);

  // 4. Upload required static files
  for (const [fp, hash] of Object.entries(fileMap)) {
    if (requiredFiles.includes(hash)) {
      process.stdout.write(`  Uploading ${fp}...`);
      const upRes = await uploadFile(deployId, fp, fileData[fp]);
      console.log(` ${upRes.status === 200 ? "✅" : "❌ " + upRes.status}`);
    } else {
      console.log(`  ${fp} → cached ✅`);
    }
  }

  // 5. Upload required functions (as zip archives)
  for (const [fnName, hash] of Object.entries(functions)) {
    if (requiredFunctions.includes(hash)) {
      process.stdout.write(`  Uploading function ${fnName} (zip)...`);
      const zipData = fnZips[fnName];
      const fnOpts = {
        hostname: "api.netlify.com",
        path: `/api/v1/deploys/${deployId}/functions/${fnName}?runtime=js`,
        method: "PUT",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/zip",
          "Content-Length": zipData.length,
        },
      };
      const fnRes = await new Promise((resolve, reject) => {
        const req = https.request(fnOpts, (r) => {
          let buf = "";
          r.on("data", (c) => (buf += c));
          r.on("end", () => resolve({ status: r.statusCode, data: buf }));
        });
        req.on("error", reject);
        req.write(zipData);
        req.end();
      });
      console.log(` ${fnRes.status === 200 ? "✅" : "❌ " + fnRes.status + " " + fnRes.data.slice(0, 100)}`);
    } else {
      console.log(`  function ${fnName} → cached ✅`);
    }
  }

  console.log("\n✅ Deploy complete!");
  console.log(`  URL: https://kairos-777.com`);
  console.log(`  Total Supply API: https://kairos-777.com/api/total-supply`);
  console.log(`  Circulating Supply API: https://kairos-777.com/api/circulating-supply`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
