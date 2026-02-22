const https = require("https");

const RPC = "https://bsc-dataseed1.binance.org";
const CONTRACT = "0x14D41707269c7D8b8DFa5095b38824a46dA05da3";
const DECIMALS = 18;

// Addresses considered NOT circulating (treasury/admin wallets)
// Only the main admin wallet holds non-circulating tokens
const EXCLUDED_WALLETS = [
  "0xCee44904A6aA94dEa28754373887E07D4B6f4968", // Admin/Treasury
];

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

function hexToBigInt(hex) {
  return BigInt(hex);
}

// balanceOf(address) selector = 0x70a08231
function balanceOfData(address) {
  const addr = address.toLowerCase().replace("0x", "").padStart(64, "0");
  return "0x70a08231" + addr;
}

exports.handler = async () => {
  try {
    // Get total supply
    const totalHex = await rpcCall("0x18160ddd");
    const totalRaw = hexToBigInt(totalHex);

    // Get excluded balances
    let excludedTotal = BigInt(0);
    for (const wallet of EXCLUDED_WALLETS) {
      const balHex = await rpcCall(balanceOfData(wallet));
      excludedTotal += hexToBigInt(balHex);
    }

    // Circulating = Total - Excluded
    const circulating = totalRaw - excludedTotal;
    const divisor = BigInt(10) ** BigInt(DECIMALS);
    const circulatingFormatted = (circulating / divisor).toString();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
      body: circulatingFormatted,
    };
  } catch (e) {
    return { statusCode: 500, body: "Error: " + e.message };
  }
};
