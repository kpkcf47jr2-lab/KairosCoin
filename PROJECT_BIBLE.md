# ═══════════════════════════════════════════════════════════════════════════════
#  KAIROSCOIN — PROJECT BIBLE
#  Last Updated: February 22, 2026
#
#  PURPOSE: This is the single source of truth for the entire KairosCoin project.
#  If you lose your Copilot chat, give this document to a new session and it will
#  have FULL context to continue working as if it built the project itself.
#
#  UPDATE THIS FILE after every major change or session.
# ═══════════════════════════════════════════════════════════════════════════════

## 1. PROJECT OVERVIEW

**KairosCoin (KAIROS)** is a USD-pegged stablecoin (1 KAIROS = 1 USD) built on BNB Smart Chain (BSC). It aims to be superior to USDT/USDC with lower fees (8 bps vs 20 bps), real-time on-chain transparency, gasless approvals (ERC-2612), batch transfers, and a fully automated mint/burn engine.

- **Company:** Kairos 777 Inc
- **Founder & Director:** Mario Isaac
- **Motto:** "In God We Trust"
- **Token Symbol:** KAIROS
- **Decimals:** 18
- **Initial Supply:** 10,000,000,000 (10 billion)
- **Peg:** 1 KAIROS = 1 USD
- **Fee:** 8 basis points (0.08%)

---

## 2. DEPLOYED INFRASTRUCTURE

### Smart Contract (BSC Mainnet)
- **Contract Address:** `0x14D41707269c7D8b8DFa5095b38824a46dA05da3`
- **Chain:** BNB Smart Chain (Chain ID: 56)
- **Solidity:** 0.8.24, OpenZeppelin v5.4
- **BscScan:** https://bscscan.com/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3
- **Owner/Deployer Wallet:** `0xCee44904A6aA94dEa28754373887E07D4B6f4968`

### Website (Netlify)
- **URL:** https://kairos-777.com
- **Netlify Site ID:** `8d880818-7126-4645-8367-e49163a1afaf`
- **Netlify Auth Token:** `nfp_pU5vLFxKCEuZS7mnPW2zn7YSYVHbrXjX0c93`
- **Deploy command:** `npx netlify deploy --prod --dir=website --site=8d880818-7126-4645-8367-e49163a1afaf --auth=nfp_pU5vLFxKCEuZS7mnPW2zn7YSYVHbrXjX0c93`

### Backend API (Render)
- **URL:** https://kairos-api-u6k5.onrender.com
- **Hosting:** Render (free tier, auto-deploy from GitHub)
- **Config:** render.yaml in repo root
- **Tech:** Node.js + Express + SQLite (better-sqlite3) + ethers.js v6
- **Health:** https://kairos-api-u6k5.onrender.com/api/health

### Kairos Wallet (Netlify)
- **URL:** https://kairos-wallet.netlify.app
- **Tech:** React + Vite + Tailwind CSS
- **Purpose:** Multi-chain crypto wallet with DApp browser, NFT support, WalletConnect

### GitHub Repository
- **Repo:** `kpkcf47jr2-lab/KairosCoin`
- **Branch:** main

### PancakeSwap Liquidity
- **Pair Address:** `0xfCb17119D559E47803105581A28584813FAffb49`

---

## 3. KEY ADDRESSES

| Purpose | Address |
|---------|---------|
| Owner/Deposit/Redemption Wallet | `0xCee44904A6aA94dEa28754373887E07D4B6f4968` |
| KAIROS Contract | `0x14D41707269c7D8b8DFa5095b38824a46dA05da3` |
| PancakeSwap Pair | `0xfCb17119D559E47803105581A28584813FAffb49` |
| USDT (BSC) | `0x55d398326f99059fF775485246999027B3197955` |
| BUSD (BSC) | `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56` |
| USDC (BSC) | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |

---

## 4. API ENDPOINTS (Backend v1.1.0)

### Public
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/supply` | Token supply information |
| GET | `/api/supply/total` | Total supply (plain text) |
| GET | `/api/supply/circulating` | Circulating supply (plain text) |
| GET | `/api/supply/balance/:address` | Check address balance |
| GET | `/api/fees` | Fee transparency |
| GET | `/api/reserves` | Proof of Reserves |
| GET | `/api/reserves/ratio` | Backing ratio |
| GET | `/api/reserves/snapshots` | Historical snapshots |
| GET | `/api/health` | System health |
| GET | `/api/engine/status` | Auto mint/burn engine status |

### Fiat On-Ramp
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/fiat/create-order` | Create fiat purchase order |
| GET | `/api/fiat/order/:id` | Get fiat order status |
| GET | `/api/fiat/orders?wallet=0x...` | List orders for a wallet |
| POST | `/api/webhook/transak` | Transak webhook (automated) |

### Admin (requires API_MASTER_KEY)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/mint` | Mint KAIROS |
| POST | `/api/burn` | Burn KAIROS |
| GET | `/api/mint/history` | Mint history |
| GET | `/api/burn/history` | Burn history |
| POST | `/api/reserves` | Record reserve change |
| POST | `/api/reserves/snapshot` | Create audit snapshot |
| GET | `/api/fiat/stats` | Fiat purchase statistics |

---

## 5. DATABASE SCHEMA (SQLite)

Tables in `backend/data/kairos.db`:
- **transactions** — Every mint/burn record (id, type, status, address, amount, tx_hash, etc.)
- **reserves** — USD reserve tracking (deposits, withdrawals, adjustments)
- **reserve_snapshots** — Periodic proof of reserves snapshots
- **fee_log** — Every on-chain fee collected
- **api_log** — Every API call logged
- **fiat_orders** — Fiat-to-KAIROS purchases via Transak/MoonPay/Changelly (NEW v1.1.0)

---

## 6. SMART CONTRACT FEATURES

- ERC-20 standard + ERC20Permit (gasless approvals / ERC-2612)
- ERC20Burnable
- Ownable, Pausable, ReentrancyGuard
- Transparent blacklist with events
- Batch transfers (send to multiple addresses in 1 tx)
- Configurable mint/burn caps
- Emergency pause
- On-chain totalMinted/totalBurned tracking
- Timelock-ready owner
- Fee: 8 bps (0.08%)

---

## 7. WEBSITE PAGES

| File | URL | Description |
|------|-----|-------------|
| `website/index.html` | kairos-777.com | Landing page with hero, features, how it works, team |
| `website/buy.html` | kairos-777.com/buy.html | Buy/Redeem KAIROS — 3 tabs: Crypto, Card/USD, Redeem |
| `website/reserves.html` | kairos-777.com/reserves.html | Proof of Reserves live dashboard |
| `website/whitepaper.html` | kairos-777.com/whitepaper.html | Full whitepaper |
| `website/style.css` | — | Global stylesheet |
| `website/script.js` | — | Global JavaScript |

### Buy Page Tabs
1. **Buy with Crypto** — Connect MetaMask/Trust Wallet → send USDT/BUSD/USDC → receive KAIROS 1:1
2. **Buy with Card / USD** — Transak widget (embedded), MoonPay, Changelly provider cards + step-by-step guides (Binance, Coinbase, Bybit, P2P) + comparison table
3. **Redeem KAIROS** — Send KAIROS to redemption address → receive USDT back

---

## 8. BRAND & DESIGN

- **Primary Color:** Gold `#D4AF37`
- **Dark Background:** `#0D0D0D`
- **Card Background:** `#1A1A1A`
- **Fonts:** Playfair Display (headings), Inter (body)
- **Logo:** Gold coin with interconnected nodes around a globe
- **Motto:** "In God We Trust"

### Social Links
- **X (Twitter):** @777_inc13680
- **Telegram:** KairosCoin_777
- **Email:** info@kairos-777.com

---

## 9. TRANSAK FIAT ON-RAMP INTEGRATION

### Status: KYB SUBMITTED — Waiting for approval (2-3 business days)
- Application submitted: February 22, 2026
- Contact for questions: kyb@transak.com

### How it works (when approved):
1. User visits kairos-777.com/buy.html → "Buy with Card / USD" tab
2. Opens Transak widget (embedded on page)
3. User pays with Visa/Mastercard/Apple Pay/Bank Transfer
4. Transak processes payment, sends USDT (BEP-20) to Kairos deposit address
5. Transak sends webhook to `https://kairos-api-u6k5.onrender.com/api/webhook/transak`
6. Backend verifies webhook signature (HMAC-SHA256)
7. Backend auto-mints KAIROS 1:1 to user's wallet
8. Transaction recorded in audit database + reserves updated

### When Transak Approves — Steps to activate:
1. Get **API Key**, **API Secret**, **Webhook Secret** from Transak Dashboard
2. Add environment variables in Render:
   - `TRANSAK_API_KEY=<your_key>`
   - `TRANSAK_API_SECRET=<your_secret>`
   - `TRANSAK_WEBHOOK_SECRET=<your_webhook_secret>`
   - `TRANSAK_ENV=PRODUCTION`
3. In Transak Dashboard → Webhook URL: `https://kairos-api-u6k5.onrender.com/api/webhook/transak`
4. Update API key in `website/buy.html` (search for `apiKey=` in the `openTransak()` function)

### Current placeholder API key in buy.html:
`02324dee-49a4-4ba2-a42b-44eb70e40e5a` — Replace with production key

---

## 10. FILE STRUCTURE GUIDE

```
KairosCoin/
├── contracts/KairosCoin.sol          ← Solidity smart contract
├── hardhat.config.js                 ← Hardhat config (BSC, testnets, future chains)
├── scripts/deploy.js                 ← Deploy script
├── test/KairosCoin.test.js           ← Contract tests
├── backend/
│   ├── src/server.js                 ← Express server (v1.1.0)
│   ├── src/config.js                 ← Centralized config + Transak vars
│   ├── src/services/
│   │   ├── blockchain.js             ← BSC connection, mint/burn execution
│   │   ├── database.js               ← SQLite, all tables, CRUD ops
│   │   ├── depositMonitor.js         ← Auto-detect stablecoin deposits → mint
│   │   └── redemptionMonitor.js      ← Auto-detect KAIROS sends → burn + send USDT
│   ├── src/routes/
│   │   ├── mint.js                   ← POST /api/mint
│   │   ├── burn.js                   ← POST /api/burn
│   │   ├── reserves.js               ← Proof of Reserves endpoints
│   │   ├── supply.js                 ← Supply + fees endpoints
│   │   ├── health.js                 ← Health check
│   │   ├── fiat.js                   ← Fiat order CRUD (NEW)
│   │   └── webhook.js                ← Transak webhook handler (NEW)
│   ├── src/middleware/
│   │   ├── auth.js                   ← API key auth (master/public/anonymous)
│   │   ├── rateLimiter.js            ← Rate limiting
│   │   └── validator.js              ← Request validation
│   └── src/utils/logger.js           ← Winston logging
├── website/                          ← Static site (Netlify)
│   ├── index.html                    ← Landing page
│   ├── buy.html                      ← Buy/Redeem page
│   ├── reserves.html                 ← Proof of Reserves
│   ├── whitepaper.html               ← Whitepaper
│   ├── style.css                     ← Global styles
│   └── script.js                     ← Global JS
├── kairos-wallet/                    ← React wallet app (Netlify)
│   └── src/                          ← Components, services, store
├── docs/WHITEPAPER.md                ← Whitepaper source
└── assets/branding/                  ← Brand guidelines + token metadata
```

---

## 11. ENVIRONMENT VARIABLES (Backend)

Required in Render Dashboard or `.env` file:

```
PORT=3001
NODE_ENV=production
API_MASTER_KEY=<strong_secret>
API_PUBLIC_KEY=<public_key>
BSC_RPC_URL=https://bsc-dataseed1.binance.org
OWNER_PRIVATE_KEY=<contract_owner_private_key>
CONTRACT_ADDRESS=0x14D41707269c7D8b8DFa5095b38824a46dA05da3
CHAIN_ID=56
DEPOSIT_ADDRESS=0xCee44904A6aA94dEa28754373887E07D4B6f4968
REDEMPTION_ADDRESS=0xCee44904A6aA94dEa28754373887E07D4B6f4968
AUTO_ENGINE_ENABLED=true
TRANSAK_API_KEY=<from_transak_dashboard>
TRANSAK_API_SECRET=<from_transak_dashboard>
TRANSAK_WEBHOOK_SECRET=<from_transak_dashboard>
TRANSAK_ENV=STAGING
```

---

## 12. DEPLOYMENT COMMANDS

### Website → Netlify
```bash
npx netlify deploy --prod --dir=website --site=8d880818-7126-4645-8367-e49163a1afaf --auth=nfp_pU5vLFxKCEuZS7mnPW2zn7YSYVHbrXjX0c93
```

### Backend → Render (auto-deploys on git push)
```bash
git add -A && git commit -m "description" && git push origin main
```

### Smart Contract → BSC (via Hardhat)
```bash
npx hardhat run scripts/deploy.js --network bsc
```

---

## 13. CURRENT BLOCKCHAIN: BSC ONLY

Currently deployed **only on BNB Smart Chain (BSC)**.

### Hardhat config already has (commented out):
- Ethereum Mainnet
- Polygon
- Base
- Arbitrum

These can be uncommented and an Alchemy API key provided (`ALCHEMY_API_KEY`) to deploy to those chains.

---

## 14. HISTORY / CHANGELOG

### Feb 22, 2026 — Session 2
- **Built Buy/Redeem page** (`website/buy.html`) with 3 tabs and MetaMask integration
- **Added fiat on-ramp tab** — Transak widget, MoonPay, Changelly, step-by-step guides
- **Rebranded** provider cards from "Buy USDT" to "Buy KAIROS"
- **Submitted Transak KYB application** — waiting 2-3 business days
- **Generated Share Certificate** for KYB requirement
- **Built Transak webhook system** — `webhook.js`, `fiat.js`, `fiat_orders` table
- **Backend v1.1.0** — Fiat on-ramp endpoints, CORS updated, auto-mint pipeline
- All deployed to Netlify (website) and GitHub (backend auto-deploys to Render)

### Prior (Session 1 — before this chat)
- Smart contract written, compiled, deployed to BSC Mainnet
- Backend API built and deployed to Render
- Website built and deployed to Netlify
- Whitepaper, Proof of Reserves dashboard
- PancakeSwap liquidity added
- Kairos Wallet app built and deployed
- Brand kit, token metadata, logo

---

## 15. NEXT STEPS / ROADMAP

### Immediate (waiting)
- [ ] Transak KYB approval → activate fiat on-ramp
- [ ] Add Transak production API key + webhook secret to Render env vars
- [ ] Replace placeholder API key in buy.html

### Short-term
- [ ] Multi-chain deployment (Ethereum, Polygon, Base, Arbitrum)
- [ ] Cross-chain bridge integration
- [ ] CoinGecko / CoinMarketCap listing
- [ ] Token logo submission to Trust Wallet / MetaMask token lists

### Medium-term
- [ ] Governance token / DAO
- [ ] Mobile app release
- [ ] Additional exchange listings
- [ ] Institutional API partnerships

---

## 16. KNOWN ISSUES / PARTIAL FIXES

- Some guide steps in `buy.html` (Alternative Methods section) still reference "USDT" where they should say "stablecoins" or be reworded (~lines 1191, 1223, 1227, 1259, 1291, 1305)
- Transak widget uses placeholder API key until production key is received
- Render free tier may sleep after 15 min inactivity (first request after sleep takes ~30s)

---

*This file should be updated after every significant work session.*
*To onboard a new Copilot chat: "Read PROJECT_BIBLE.md and continue from where we left off."*
