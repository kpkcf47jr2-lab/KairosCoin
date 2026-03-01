const { ethers } = require('ethers');
const wallet = '0x37935A6AD6A5e7f096B759952F41D464CAe82be8';
const abi = ['function balanceOf(address) view returns (uint256)'];
const chains = [
  { name: 'BSC', rpc: 'https://bsc-dataseed.binance.org', token: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3' },
  { name: 'Base', rpc: 'https://mainnet.base.org', token: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3' },
  { name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc', token: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3' },
  { name: 'Polygon', rpc: 'https://polygon-rpc.com', token: '0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9' },
];
(async () => {
  console.log('Wallet:', wallet, '\n');
  for (const c of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(c.rpc);
      const contract = new ethers.Contract(c.token, abi, provider);
      const bal = await contract.balanceOf(wallet);
      const native = await provider.getBalance(wallet);
      console.log(c.name + ': KAIROS=' + ethers.formatEther(bal) + ' | Native=' + ethers.formatEther(native));
    } catch(e) {
      console.log(c.name + ': Error - ' + e.message.substring(0,60));
    }
  }
})();
