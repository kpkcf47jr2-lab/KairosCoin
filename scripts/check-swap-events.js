const https = require('https');
require('dotenv').config();

const BSCSCAN_KEY = process.env.BSCSCAN_API_KEY;

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

async function main() {
  // Check transactions on PancakeSwap pair
  const url1 = `https://api.bscscan.com/api?module=account&action=txlist&address=0xfCb17119D559E47803105581A28584813FAffb49&startblock=0&endblock=99999999&sort=desc&page=1&offset=10&apikey=${BSCSCAN_KEY}`;
  const data1 = await fetchJSON(url1);
  const txs1 = Array.isArray(data1.result) ? data1.result : [];
  console.log('PancakeSwap KAIROS/WBNB pair transactions:', txs1.length);
  txs1.forEach(tx => {
    const method = tx.functionName?.split('(')[0] || tx.input?.substring(0, 10) || 'unknown';
    console.log(`  ${new Date(tx.timeStamp * 1000).toISOString()} | ${method} | from: ${tx.from.substring(0,10)}... | value: ${(tx.value / 1e18).toFixed(4)} BNB`);
  });

  await new Promise(r => setTimeout(r, 1000));

  // Check transactions on KairosSwap pair
  const url2 = `https://api.bscscan.com/api?module=account&action=txlist&address=0x61C2DB0143F215Dc9647D34ac4220855E00D7015&startblock=0&endblock=99999999&sort=desc&page=1&offset=10&apikey=${BSCSCAN_KEY}`;
  const data2 = await fetchJSON(url2);
  const txs2 = Array.isArray(data2.result) ? data2.result : [];
  console.log('\nKairosSwap KAIROS/WBNB pair transactions:', txs2.length);
  txs2.forEach(tx => {
    const method = tx.functionName?.split('(')[0] || tx.input?.substring(0, 10) || 'unknown';
    console.log(`  ${new Date(tx.timeStamp * 1000).toISOString()} | ${method} | from: ${tx.from.substring(0,10)}... | value: ${(tx.value / 1e18).toFixed(4)} BNB`);
  });

  if (events1.length === 0 && events2.length === 0) {
    console.log('\n⚠️  NO SWAPS DETECTED — This is why DexScreener does not show KAIROS.');
    console.log('   DexScreener only indexes pairs with actual trading activity.');
    console.log('   Solution: Execute a small swap to trigger indexing.');
  }
}

main().catch(console.error);
