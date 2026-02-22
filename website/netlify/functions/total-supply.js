const https = require("https");

const RPC = "https://bsc-dataseed1.binance.org";
const CONTRACT = "0x14D41707269c7D8b8DFa5095b38824a46dA05da3";

// totalSupply() selector = 0x18160ddd
function rpcCall(data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: CONTRACT, data }, "latest"],
    });
    const opts = {
      hostname: "bsc-dataseed1.binance.org",
      path: "/",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    };
    const req = https.request(opts, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(buf);
          resolve(json.result);
        } catch {
          reject(new Error("RPC parse error"));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function hexToDecimal(hex, decimals = 18) {
  const raw = BigInt(hex);
  const divisor = BigInt(10) ** BigInt(decimals);
  return (raw / divisor).toString();
}

exports.handler = async () => {
  try {
    const result = await rpcCall("0x18160ddd");
    const supply = hexToDecimal(result);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
      body: supply,
    };
  } catch (e) {
    return { statusCode: 500, body: "Error: " + e.message };
  }
};
