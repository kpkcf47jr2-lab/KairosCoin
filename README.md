<p align="center">
  <img src="assets/branding/kairos-coin-logo.png" alt="Kairos Coin Logo" width="280" />
</p>

<h1 align="center">Kairos Coin (KAIROS)</h1>

<p align="center">
  <strong>🪙 USD-Pegged Stablecoin — 1 KAIROS = 1 USD</strong>
</p>

<p align="center">
  <em>"In God We Trust"</em>
</p>

<p align="center">
  <a href="#features"><img src="https://img.shields.io/badge/ERC--20-Standard-blue" alt="ERC-20" /></a>
  <a href="#features"><img src="https://img.shields.io/badge/ERC--2612-Gasless%20Permit-green" alt="ERC-2612" /></a>
  <a href="#fee-system"><img src="https://img.shields.io/badge/Fees-60%25%20Cheaper%20than%20USDT-gold" alt="Fees" /></a>
  <a href="#security"><img src="https://img.shields.io/badge/Security-Pausable%20%7C%20Blacklist%20%7C%20ReentrancyGuard-red" alt="Security" /></a>
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636" alt="Solidity" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License" />
  <img src="https://img.shields.io/badge/Tests-110%20Passing-brightgreen" alt="Tests" />
</p>

---

## 🏛️ About

**Kairos Coin (KAIROS)** is a next-generation USD-pegged stablecoin developed by **Kairos 777 Inc.**, administered by **Mario Isaac**. Built on Ethereum as an ERC-20 token, Kairos Coin is designed to **surpass USDT and USDC** in transparency, security, DeFi utility, and cost efficiency.

| Property | Value |
|----------|-------|
| **Token Name** | Kairos Coin |
| **Symbol** | KAIROS |
| **Standard** | ERC-20 + ERC-2612 Permit |
| **Parity** | 1 KAIROS = 1 USD |
| **Initial Supply** | 10,000,000,000 (10 Billion) |
| **Decimals** | 18 |
| **Solidity** | 0.8.24 |
| **Owner** | Kairos 777 Inc. |
| **Administrator** | Mario Isaac |

---

## ✨ Features

### 🔥 What makes KAIROS superior to USDT & USDC

| Feature | USDT | USDC | **KAIROS** |
|---------|------|------|------------|
| Gasless Approvals (ERC-2612) | ❌ | ✅ | ✅ |
| On-chain Audit Trail | ❌ | ❌ | ✅ `totalMinted` / `totalBurned` |
| Batch Transfers | ❌ | ❌ | ✅ Multi-send in 1 tx |
| Configurable Mint/Burn Caps | ❌ | ❌ | ✅ Per-transaction limits |
| Transparent Compliance Events | Partial | Partial | ✅ Every action on-chain |
| Reentrancy Protection | ❌ | ❌ | ✅ ReentrancyGuard |
| Emergency Pause | ✅ | ✅ | ✅ Owner can pause/unpause |
| Transfer Fees | 20 bps max | 20 bps max | ✅ **8 bps (60% cheaper)** |
| Fee Exemptions | ❌ | ❌ | ✅ Configurable per address |
| Reserve Wallet | ❌ | ❌ | ✅ Auto fee collection |

---

## 💰 Fee System

Kairos Coin features a revolutionary fee system that is **60% cheaper** than USDT/USDC:

```
╔═══════════════════════════════════════════════════════════╗
║              KAIROS FEE COMPARISON                        ║
╠═══════════════════════╦═══════════╦═══════════════════════╣
║                       ║  USDT/C   ║     KAIROS            ║
╠═══════════════════════╬═══════════╬═══════════════════════╣
║  Fee Rate             ║  20 bps   ║   8 bps (0.08%)       ║
║  Fee on $1,000        ║  $2.00    ║   $0.80               ║
║  Fee on $100,000      ║  $200     ║   $80                 ║
║  Fee on $1,000,000    ║  $2,000   ║   $800                ║
║  Savings              ║    —      ║   60% CHEAPER         ║
╚═══════════════════════╩═══════════╩═══════════════════════╝
```

### Fee Features:
- **Default fee**: 8 basis points (0.08%)
- **Maximum fee**: 20 basis points (0.20%) — hard cap in contract
- **Fee destination**: 100% goes to Kairos Reserve Wallet
- **Fee exemptions**: Admin, reserve wallet, and configurable addresses
- **No fee on**: Minting, burning, or transfers involving exempt addresses
- **Disableable**: Owner can set fee to 0 bps

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    KairosCoin.sol                         │
│                                                          │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  ERC-20  │  │ ERC-2612    │  │   Ownable         │   │
│  │ Standard │  │ Permit      │  │   (Admin Control) │   │
│  └──────────┘  └─────────────┘  └──────────────────┘   │
│                                                          │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ Pausable │  │ Reentrancy  │  │   Fee System      │   │
│  │ Emergency│  │ Guard       │  │   (8 bps → Reserve│   │
│  └──────────┘  └─────────────┘  └──────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Compliance Layer                      │   │
│  │  Blacklist · Mint/Burn Caps · Supply Tracking     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

```bash
git clone https://github.com/kairos777/KairosCoin.git
cd KairosCoin
npm install
```

### Compile

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

### Deploy (Local)

```bash
npx hardhat run scripts/deploy.js
```

### Deploy (Testnet/Mainnet)

```bash
# Set environment variables
export ADMIN_WALLET="0x..."
export RESERVE_WALLET="0x..."

# Deploy to network
npx hardhat run scripts/deploy.js --network sepolia
```

---

## 📊 Test Coverage

**110 tests — ALL PASSING ✅**

| Section | Tests | Status |
|---------|-------|--------|
| 1. Deployment | 16 | ✅ |
| 2. ERC-20 Standard | 5 | ✅ |
| 3. Minting | 11 | ✅ |
| 4. Burning | 10 | ✅ |
| 5. Blacklist / Compliance | 8 | ✅ |
| 6. Pausable | 6 | ✅ |
| 7. Caps Configuration | 6 | ✅ |
| 8. Batch Transfer | 6 | ✅ |
| 9. Ownership | 4 | ✅ |
| 10. ERC-2612 Permit | 1 | ✅ |
| 11. View Functions | 3 | ✅ |
| 12. Supply Management | 3 | ✅ |
| 13. Fee System | 31 | ✅ |
| **Total** | **110** | **✅** |

---

## 🔐 Security

- **OpenZeppelin Contracts**: Built on battle-tested, audited base contracts
- **ReentrancyGuard**: Protects all state-changing operations
- **Pausable**: Emergency halt of all transfers
- **Blacklist**: Compliance-ready address freezing with on-chain events
- **Mint/Burn Caps**: Per-transaction limits prevent large unauthorized operations
- **Custom Errors**: Gas-efficient error handling (Solidity 0.8.24)
- **Fee Hard Cap**: Maximum fee of 20 bps enforced at contract level

---

## 📁 Project Structure

```
KairosCoin/
├── assets/
│   └── branding/
│       └── kairos-coin-logo.png          # Official logo
├── contracts/
│   └── KairosCoin.sol                    # Main stablecoin contract
├── scripts/
│   └── deploy.js                         # Deployment script
├── test/
│   └── KairosCoin.test.js               # 110 comprehensive tests
├── hardhat.config.js                      # Hardhat configuration
├── package.json                           # Dependencies
└── README.md                              # This file
```

---

## 📜 Contract API

### Admin Functions (onlyOwner)

| Function | Description |
|----------|-------------|
| `mint(address to, uint256 amount)` | Mint new KAIROS tokens |
| `burn(address from, uint256 amount)` | Burn KAIROS tokens |
| `blacklist(address account)` | Freeze an address |
| `unBlacklist(address account)` | Unfreeze an address |
| `pause()` | Emergency pause all transfers |
| `unpause()` | Resume transfers |
| `setMintCap(uint256 cap)` | Set per-transaction mint limit |
| `setBurnCap(uint256 cap)` | Set per-transaction burn limit |
| `setFeeBps(uint256 newFeeBps)` | Update fee rate (max 20 bps) |
| `setReserveWallet(address wallet)` | Change reserve wallet |
| `setFeeExempt(address addr, bool exempt)` | Set fee exemption |

### User Functions

| Function | Description |
|----------|-------------|
| `transfer(address to, uint256 amount)` | Transfer KAIROS |
| `approve(address spender, uint256 amount)` | Approve spending |
| `transferFrom(address from, address to, uint256 amount)` | Spend approved tokens |
| `permit(...)` | Gasless approval (ERC-2612) |
| `batchTransfer(address[] to, uint256[] amounts)` | Multi-send |

### View Functions

| Function | Description |
|----------|-------------|
| `calculateFee(address from, address to, uint256 amount)` | Preview fee |
| `netMinted()` | Returns `totalMinted - totalBurned` |
| `isBlacklisted(address account)` | Check if frozen |
| `totalFeesCollected()` | Total fees collected |
| `feeBps()` | Current fee rate |
| `reserveWallet()` | Current reserve address |

---

## 🌐 Multi-Chain Roadmap

| Phase | Chain | Status |
|-------|-------|--------|
| Phase 1 | **Ethereum (ERC-20)** | ✅ Ready |
| Phase 2 | Polygon (PoS) | 🔜 Planned |
| Phase 3 | Base (L2) | 🔜 Planned |
| Phase 4 | Arbitrum (L2) | 🔜 Planned |
| Phase 5 | Solana (SPL) | 🔜 Planned |

---

## ⚖️ License

MIT License — See [LICENSE](LICENSE) for details.

---

<p align="center">
  <img src="assets/branding/kairos-coin-logo.png" alt="Kairos Coin" width="120" />
</p>

<p align="center">
  <strong>Kairos 777 Inc.</strong><br/>
  <em>Administrator: Mario Isaac</em><br/><br/>
  <strong>"In God We Trust"</strong><br/><br/>
  1 KAIROS = 1 USD — Always.
</p>
