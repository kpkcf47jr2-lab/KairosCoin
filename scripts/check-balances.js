require('dotenv').config();
const { ethers } = require('ethers');

const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY);
console.log('Deployer address:', wallet.address);

const rpcs = {
  'Base': 'https://base-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  'Polygon': 'https://polygon-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  'Arbitrum': 'https://arb-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  'Ethereum': 'https://eth-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  'BSC': 'https://bsc-dataseed1.binance.org',
};

(async () => {
  for (const [name, url] of Object.entries(rpcs)) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      const balance = await provider.getBalance(wallet.address);
      const symbol = name === 'BSC' ? 'BNB' : name === 'Polygon' ? 'POL' : 'ETH';
      console.log(name + ': ' + ethers.formatEther(balance) + ' ' + symbol);
    } catch (e) {
      console.log(name + ': ERROR - ' + e.message.slice(0, 80));
    }
  }
})();
