/**
 * Deploy site + functions to Netlify via API
 */
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const TOKEN = "nfp_pU5vLFxKCEuZS7mnPW2zn7YSYVHbrXjX0c93";
const SITE_ID = "resilient-strudel-41074c.netlify.app";
const DEPLOY_DIR = path.join(process.env.HOME, "Desktop", "website");
const FN_DIR = path.join(DEPLOY_DIR, "netlify", "functions");

function req(method, p, body) {
  return new Promise((resolve, reject) => {
    const d = body ? JSON.stringify(body) : null;
    const o = {
      hostname: "api.netlify.com", path: p, method,
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    };
    if (d) o.headers["Content-Length"] = Buffer.byteLength(d);
    const r = https.request(o, (res) => {
      let b = ""; res.on("data", (c) => (b += c));
      res.on("end", () => { try { resolve({ s: res.statusCode, d: JSON.parse(b) }); } catch { resolve({ s: res.statusCode, d: b }); } });
    });
    r.on("error", reject);
    if (d) r.write(d);
    r.end();
  });
}

function put(p, data, ct) {
  return new Promise((resolve, reject) => {
    const o = {
      hostname: "api.netlify.com", path: p, method: "PUT",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": ct || "application/octet-stream", "Content-Length": data.length },
    };
    const r = https.request(o, (res) => {
      let b = ""; res.on("data", (c) => (b += c));
      res.on("end", () => resolve({ s: res.statusCode, d: b }));
    });
    r.on("error", reject);
    r.write(data);
    r.end();
  });
}

async function main() {
  const skip = new Set(["netlify", "netlify.toml", "package.json", "node_modules", "api", "package-lock.json"]);

  // Static files
  const fileMap = {};
  const fileData = {};
  for (const f of fs.readdirSync(DEPLOY_DIR)) {
    if (f.startsWith(".") || skip.has(f)) continue;
    const fp = path.join(DEPLOY_DIR, f);
    if (!fs.statSync(fp).isFile()) continue;
    const data = fs.readFileSync(fp);
    fileMap["/" + f] = crypto.createHash("sha1").update(data).digest("hex");
    fileData["/" + f] = data;
    console.log("File:", f, Math.round(data.length / 1024) + "KB");
  }

  // Functions (hash from js source, upload as zip)
  const fnMap = {};
  const fnData = {};
  const fnSrcDir = path.join(DEPLOY_DIR, "netlify", "functions");
  const zipDir = "/tmp/fn-zips";
  if (fs.existsSync(fnSrcDir)) {
    for (const f of fs.readdirSync(fnSrcDir)) {
      if (!f.endsWith(".js")) continue;
      const name = f.replace(".js", "");
      const srcData = fs.readFileSync(path.join(fnSrcDir, f));
      const zipData = fs.readFileSync(path.join(zipDir, name + ".zip"));
      fnMap[name] = crypto.createHash("sha1").update(srcData).digest("hex");
      fnData[name] = zipData;
      console.log("Function:", name, "src:" + srcData.length + "B zip:" + zipData.length + "B");
    }
  }

  // Create deploy
  console.log("\nCreating deploy...");
  const res = await req("POST", "/api/v1/sites/" + SITE_ID + "/deploys", { files: fileMap, functions: fnMap });
  if (res.s !== 200) { console.log("Error:", res.s, JSON.stringify(res.d).slice(0, 300)); return; }

  const did = res.d.id;
  const reqF = res.d.required || [];
  const reqFn = res.d.required_functions || [];
  console.log("Deploy:", did);
  console.log("Files needed:", reqF.length, "Functions needed:", reqFn.length);

  // Upload static files
  for (const [fp, h] of Object.entries(fileMap)) {
    if (reqF.includes(h)) {
      const r = await put("/api/v1/deploys/" + did + "/files" + fp, fileData[fp]);
      console.log("Uploaded", fp, r.s);
    } else {
      console.log(fp, "cached");
    }
  }

  // Upload functions
  for (const [name, h] of Object.entries(fnMap)) {
    if (reqFn.includes(h)) {
      const r = await put("/api/v1/deploys/" + did + "/functions/" + name + "?runtime=js", fnData[name], "application/zip");
      console.log("Uploaded fn", name, r.s, r.d.slice(0, 200));
    } else {
      console.log("fn", name, "cached");
    }
  }

  console.log("\nDone!");
  console.log("Total Supply: https://kairos-777.com/api/total-supply");
  console.log("Circulating: https://kairos-777.com/api/circulating-supply");
}

main().catch(console.error);
