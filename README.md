<p align="center">
  <img src="assets/branding/kairos-coin-logo.png" alt="Kairos 777 Logo" width="280" />
</p>

<h1 align="center">Kairos 777</h1>

<p align="center">
  <strong>Decentralized Trading Ecosystem — Trade · Coin · Wallet</strong>
</p>

<p align="center">
  <em>"In God We Trust"</em>
</p>

<p align="center">
  <a href="https://kairos-777.com"><img src="https://img.shields.io/badge/Website-kairos--777.com-D4AF37?style=flat-square" alt="Website" /></a>
  <a href="https://kairos-trade.netlify.app"><img src="https://img.shields.io/badge/Trade-Live-3B82F6?style=flat-square" alt="Trade" /></a>
  <a href="https://kairos-wallet.netlify.app"><img src="https://img.shields.io/badge/Wallet-Live-10B981?style=flat-square" alt="Wallet" /></a>
  <a href="https://bscscan.com/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3"><img src="https://img.shields.io/badge/BscScan-Verified-F0B90B?style=flat-square" alt="BscScan" /></a>
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square" alt="Solidity" />
  <img src="https://img.shields.io/badge/Tests-110%20Passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License" />
</p>

---

## Overview

**Kairos 777** is a complete decentralized financial ecosystem built by **Kairos 777 Inc.**, founded by **Mario Isaac**. The platform consists of three core products:

| Product | Description | URL |
|---------|-------------|-----|
| **Kairos Trade** | AI-powered trading platform with algorithmic bots, 33+ crypto pairs, up to 150x leverage | [kairos-trade.netlify.app](https://kairos-trade.netlify.app) |
| **Kairos Coin (KAIROS)** | USD-pegged stablecoin (1 KAIROS = 1 USD), deployed on 4 chains | [kairos-777.com/coin](https://kairos-777.com/coin.html) |
| **Kairos Wallet** | Multi-chain non-custodial wallet with WalletConnect v2 | [kairos-wallet.netlify.app](https://kairos-wallet.netlify.app) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      KAIROS 777 ECOSYSTEM                       │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Kairos Trade   │  Kairos Coin    │  Kairos Wallet              │
│  React + Vite   │  Solidity 0.8.24│  React + Vite + Tailwind    │
│  AI Trading Bots│  ERC-20 + 2612  │  WalletConnect v2           │
│  33+ Pairs      │  4 Chains       │  Multi-chain Support        │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                      Backend API (Node.js + Express)            │
│                  https://kairos-api-u6k5.onrender.com           │
├─────────────────────────────────────────────────────────────────┤
│           BNB Smart Chain · Base · Arbitrum · Polygon           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Smart Contract — KairosCoin.sol

### Token Details

| Property | Value |
|----------|-------|
| **Name** | Kairos Coin |
| **Symbol** | KAIROS |
| **Standard** | ERC-20 + ERC-2612 Permit |
| **Peg** | 1 KAIROS = 1 USD |
| **Initial Supply** | 10,000,000,000 (10B) |
| **Decimals** | 18 |
| **Solidity** | 0.8.24 |
| **OpenZeppelin** | v5.4 |

### Multi-Chain Deployment

| Chain | Address | Status |
|-------|---------|--------|
| **BNB Smart Chain** | `0x14D41707269c7D8b8DFa5095b38824a46dA05da3` | ✅ Live |
| **Base** | `0x14D41707269c7D8b8DFa5095b38824a46dA05da3` | ✅ Live |
| **Arbitrum** | `0x14D41707269c7D8b8DFa5095b38824a46dA05da3` | ✅ Live |
| **Polygon** | `0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9` | ✅ Live |

### Key Features

| Feature | USDT | USDC | **KAIROS** |
|---------|------|------|------------|
| Gasless Approvals (ERC-2612) | ❌ | ✅ | ✅ |
| On-chain Audit Trail | ❌ | ❌ | ✅ `totalMinted` / `totalBurned` |
| Batch Transfers | ❌ | ❌ | ✅ Multi-send in 1 tx |
| Configurable Mint/Burn Caps | ❌ | ❌ | ✅ Per-transaction limits |
| Reentrancy Protection | ❌ | ❌ | ✅ ReentrancyGuard |
| Transfer Fees | 20 bps | 20 bps | **8 bps (60% cheaper)** |
| Fee Exemptions | ❌ | ❌ | ✅ Configurable per address |

### Fee System

```
 Fee Rate:      8 bps (0.08%) — 60% cheaper than USDT/USDC
 $1,000 tx:     $0.80 fee  (vs $2.00 USDT)
 $100,000 tx:   $80 fee    (vs $200 USDT)
 $1,000,000 tx: $800 fee   (vs $2,000 USDT)
```

---

## Project Structure

```
KairosCoin/
├── contracts/           # Solidity smart contracts
│   ├── KairosCoin.sol   # Main stablecoin (deployed on 4 chains)
│   ├── KairosPerps.sol  # Perpetuals trading contract
│   └── KairosVault.sol  # Vault contract
├── backend/             # Node.js API server (Render)
│   └── src/
│       ├── server.js    # Express API
│       └── routes/      # API route handlers
├── website/             # Main website (Netlify — kairos-777.com)
│   ├── index.html       # Ecosystem hub
│   ├── coin.html        # Token page
│   ├── buy.html         # Buy & redeem interface
│   ├── reserves.html    # Proof of reserves dashboard
│   ├── whitepaper.html  # Technical whitepaper
│   ├── privacy.html     # Privacy policy
│   └── terms.html       # Terms of service
├── kairos-trade/        # Trading platform (React + Vite)
├── kairos-wallet/       # Crypto wallet (React + Vite + Tailwind)
├── kairos-extension/    # Chrome extension
├── scripts/             # Deploy, bridge, and utility scripts
├── test/                # 110 comprehensive tests
├── docs/                # Additional documentation
└── assets/              # Branding, marketing materials
```

---

## Quick Start

### Prerequisites
- Node.js v18+
- npm

### Installation

```bash
git clone https://github.com/kpkcf47jr2-lab/KairosCoin.git
cd KairosCoin
npm install
```

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
# 110 tests — ALL PASSING ✅
```

### Deploy

```bash
# Local
npx hardhat run scripts/deploy.js

# BSC Mainnet
npx hardhat run scripts/deploy.js --network bsc

# Multi-chain
npx hardhat run scripts/deploy-multichain.js
```

### Run Backend

```bash
cd backend
npm install
npm start
```

### Run Trade / Wallet (Dev)

```bash
cd kairos-trade  # or kairos-wallet
npm install
npm run dev
```

---

## Test Coverage

**110 tests — ALL PASSING ✅**

| Section | Tests |
|---------|-------|
| Deployment | 16 |
| ERC-20 Standard | 5 |
| Minting | 11 |
| Burning | 10 |
| Blacklist / Compliance | 8 |
| Pausable | 6 |
| Caps Configuration | 6 |
| Batch Transfer | 6 |
| Ownership | 4 |
| ERC-2612 Permit | 1 |
| View Functions | 3 |
| Supply Management | 3 |
| Fee System | 31 |

---

## Security

- **OpenZeppelin v5.4**: Battle-tested, audited base contracts
- **ReentrancyGuard**: Protects all state-changing operations
- **Pausable**: Emergency halt of all transfers
- **Blacklist**: Compliance-ready address freezing
- **Mint/Burn Caps**: Per-transaction limits
- **Fee Hard Cap**: Maximum 20 bps enforced at contract level
- **Custom Errors**: Gas-efficient error handling

---

## Infrastructure

| Service | Platform | URL |
|---------|----------|-----|
| Website | Netlify | [kairos-777.com](https://kairos-777.com) |
| Trade | Netlify | [kairos-trade.netlify.app](https://kairos-trade.netlify.app) |
| Wallet | Netlify | [kairos-wallet.netlify.app](https://kairos-wallet.netlify.app) |
| Backend API | Render | [kairos-api-u6k5.onrender.com](https://kairos-api-u6k5.onrender.com) |
| Source Code | BscScan | [Verified](https://bscscan.com/address/0x14D41707269c7D8b8DFa5095b38824a46dA05da3#code) |

---

## Mobile Apps

| Platform | App | Status |
|----------|-----|--------|
| iOS | Kairos 777 (Trade) | Submitted to App Store |
| iOS | Kairos Wallet | Submitted to App Store |
| Android | Coming soon | Planned |

---

## Links

- **Website**: [kairos-777.com](https://kairos-777.com)
- **Whitepaper**: [kairos-777.com/whitepaper](https://kairos-777.com/whitepaper.html)
- **Proof of Reserves**: [kairos-777.com/reserves](https://kairos-777.com/reserves.html)
- **BscScan**: [Token](https://bscscan.com/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3)
- **X (Twitter)**: [@777_inc13680](https://x.com/777_inc13680)
- **Telegram**: [KairosCoin_777](https://t.me/KairosCoin_777)
- **Contact**: info@kairos-777.com

---

## License

MIT License — See [LICENSE](LICENSE) for details.

---

<p align="center">
  <img src="assets/branding/kairos-coin-logo.png" alt="Kairos 777" width="120" />
</p>

<p align="center">
  <strong>Kairos 777 Inc.</strong><br/>
  <em>Founded by Mario Isaac</em><br/><br/>
  <strong>"In God We Trust"</strong><br/><br/>
  1 KAIROS = 1 USD — Always.
</p>
