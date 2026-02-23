# ═══════════════════════════════════════════════════════════════════════════════
#  KAIROSCOIN — PROJECT BIBLE
#  Last Updated: February 23, 2026
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

### Smart Contracts (Multi-Chain)
- **Solidity:** 0.8.24, OpenZeppelin v5.4
- **Owner/Deployer Wallet:** `0xCee44904A6aA94dEa28754373887E07D4B6f4968`

| Chain | Address | Explorer |
|-------|---------|----------|
| **BSC** (56) | `0x14D41707269c7D8b8DFa5095b38824a46dA05da3` | [BscScan](https://bscscan.com/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3) |
| **Base** (8453) | `0x14D41707269c7D8b8DFa5095b38824a46dA05da3` | [BaseScan](https://basescan.org/address/0x14D41707269c7D8b8DFa5095b38824a46dA05da3) |
| **Arbitrum** (42161) | `0x14D41707269c7D8b8DFa5095b38824a46dA05da3` | [Arbiscan](https://arbiscan.io/address/0x14D41707269c7D8b8DFa5095b38824a46dA05da3) |
| **Polygon** (137) | `0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9` | [PolygonScan](https://polygonscan.com/address/0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9) |

> Note: BSC, Base, and Arbitrum share the same address due to identical deployer nonce. Polygon uses a different address because a nonce was consumed by a cancel tx.

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
- **Netlify Site ID:** `e448f1a8-f480-4811-84ae-8a15df30477e`
- **Tech:** React 18 + Vite 6 + Tailwind 3.4 + Zustand 5 + ethers.js 6
- **Purpose:** Multi-chain crypto wallet with DApp browser, NFT support, WalletConnect
- **Status:** Complete (6 sprints, commit `60e2b49`)
- **Deploy:** `npx netlify deploy --prod --dir=kairos-wallet/dist --site=e448f1a8-f480-4811-84ae-8a15df30477e --auth=nfp_pU5vLFxKCEuZS7mnPW2zn7YSYVHbrXjX0c93`

### Kairos Trade (Netlify)
- **URL:** https://kairos-trade.netlify.app
- **Netlify Site ID:** `b7b3fd54-863a-4e6f-a334-460b1092045b`
- **Tech:** React 18 + Vite 6 + Tailwind 4 + Zustand + lightweight-charts v4.1 + Framer Motion + Lucide Icons
- **Purpose:** AI-powered automated trading platform with real-time charts, bots, paper trading, technical alerts
- **Data Source:** Binance public WebSocket + REST API (no key needed)
- **Status:** v2.0 Premium UI (commit `abf4b27`)
- **Deploy:** `npx netlify deploy --prod --dir=kairos-trade/dist --site=b7b3fd54-863a-4e6f-a334-460b1092045b --auth=nfp_pU5vLFxKCEuZS7mnPW2zn7YSYVHbrXjX0c93`

### GitHub Repository
- **Repo:** `kpkcf47jr2-lab/KairosCoin`
- **Branch:** main
- **Latest Commit:** `abf4b27` (Feb 23, 2026)

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

### Website / Main Brand
- **Primary Color:** Gold `#D4AF37`
- **Dark Background:** `#0D0D0D`
- **Card Background:** `#1A1A1A`
- **Fonts:** Playfair Display (headings), Inter (body)
- **Logo:** Gold coin with interconnected nodes around a globe
- **Motto:** "In God We Trust"

### Kairos Trade Color System (Blue Theme)
CSS variable names kept as `--gold` to avoid breaking 100+ references, but values are blue:
- **Primary:** `--gold: #3B82F6` / `--gold-light: #60A5FA` / `--gold-dark: #2563EB`
- **Backgrounds:** `--dark: #0B0E11` / `--dark-2: #111318` / `--dark-3: #181A20` / `--dark-4: #1E222D`
- **Accents:** `--green: #0ECB81` / `--red: #F6465D`
- **Text:** `--text: #EAECEF` / `--text-dim: #848E9C`
- **Borders:** `--border: #1E222D` / `--border-light: #2B3139`
- **Font:** Inter only (no Playfair Display)

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
├── kairos-trade/                     ← React trading platform (Netlify)
│   ├── vite.config.js                ← Vite + React + Tailwind, manual chunks
│   ├── index.html                    ← Blue SVG favicon, Inter font
│   ├── public/_redirects             ← SPA routing for Netlify
│   └── src/
│       ├── App.jsx                   ← Route switch: dashboard/chart/bots/etc
│       ├── index.css                 ← Blue theme CSS variables
│       ├── main.jsx                  ← React root
│       ├── store/useStore.js         ← Zustand (auth, market, bots, broker, AI, trading)
│       ├── components/
│       │   ├── Layout/Sidebar.jsx    ← Premium v2 sidebar (260px, user card, 3 sections)
│       │   ├── Layout/Header.jsx     ← Premium v2 header (56px, glassmorphism)
│       │   ├── Auth/AuthScreen.jsx   ← Split-screen login/register
│       │   ├── Dashboard/Dashboard.jsx ← Gradient stats, quick actions, market table
│       │   ├── Chart/TradingChart.jsx  ← lightweight-charts with autoSize, WebSocket
│       │   ├── Trading/TradingPanel.jsx ← Order entry, positions, order book
│       │   ├── Trading/TradeHistory.jsx ← Trade log
│       │   ├── Trading/SimulatorScreen.jsx ← Paper trading ($10k virtual)
│       │   ├── Bots/BotManager.jsx   ← Bot CRUD + start/stop/pause
│       │   ├── Broker/BrokerManager.jsx ← API key management
│       │   ├── Strategy/StrategyBuilder.jsx ← 5 templates + custom
│       │   ├── AI/AIChat.jsx         ← Local analysis + OpenAI GPT-4
│       │   ├── Alerts/AlertPanel.jsx  ← Price + signal alerts (NEW)
│       │   └── Settings/SettingsPanel.jsx ← OpenAI key, preferences
│       ├── services/
│       │   ├── marketData.js         ← Binance WebSocket + REST
│       │   ├── indicators.js         ← EMA, SMA, RSI, MACD, BB, VWAP
│       │   ├── ai.js                 ← Local + OpenAI analysis
│       │   ├── broker.js             ← Broker connection service
│       │   ├── tradingEngine.js      ← Trade execution engine
│       │   ├── simulator.js          ← Paper trading simulator
│       │   └── alerts.js             ← Smart alert system (price + signals)
│       └── constants/index.js        ← BRAND, BROKERS, TIMEFRAMES, INDICATORS
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

### Feb 23, 2026 — Session 7 (Kairos Trade Premium UI v2)
- **Sidebar v2**: 260px width, gradient background, user profile card with plan badge, 3 sections (Principal/Automatización/Gestión), animated tooltips in collapsed mode, spring-animated active states with gradient backgrounds and left bar
- **Header v2**: 56px, glassmorphism with backdrop blur, pair badge with icon, gradient connection status (Live/Demo), pulsing AI indicator
- **Dashboard v2**: Personalized welcome, gradient stat cards with unique colors (blue/purple/green/red), colored quick action cards with 6 options, table-style market overview with columns
- **Auth v2**: Split-screen (features left, form right), password visibility toggle, animated loading spinner, feature showcase with icons, responsive mobile fallback
- **AlertPanel (NEW)**: Complete alert system UI — price alerts (above/below) and technical signal alerts (EMA cross, RSI oversold/overbought, MACD cross, volume spike), 3 tabs (Active/Triggered/Create), repeat toggle
- **TradingPanel v2**: Gradient buy/sell buttons with shadows, uppercase tracking-wider labels, refined order book with hover states, premium position cards with P&L borders
- **CSS v2**: 4px scrollbar, hover/focus input refinements, hidden number arrows, blue selection color
- **Commit:** `abf4b27` → Deployed to https://kairos-trade.netlify.app

### Feb 22, 2026 — Session 6 (Kairos Trade Chart Fix + BingX Redesign)
- **Fixed chart rendering** — Charts weren't visible: added `autoSize: true`, explicit getBoundingClientRect dimensions, null/NaN indicator data filtering, h-full layout chain fix
- **Gold→Blue redesign** — Changed entire color scheme from gold #D4AF37 to blue #3B82F6 across all components, BingX-style dark backgrounds
- **Commits:** `fa155ac` (BingX redesign), `0f949c5` (chart fix)

### Feb 22, 2026 — Session 5 (Kairos Trade v1.0 Built)
- **Built entire Kairos Trade platform from scratch** — 20+ files, 5000+ lines
- Real-time charts with lightweight-charts v4.1 + Binance WebSocket
- 7 technical indicators (EMA, SMA, RSI, MACD, Bollinger Bands, VWAP)
- AI analysis engine (local + OpenAI GPT-4 optional)
- Bot management system (create, start, stop, pause, delete)
- Broker API key management with encryption
- Strategy builder with 5 templates
- Paper trading simulator with $10k virtual balance
- Trade history and order management
- Smart alert service (price + technical signals)
- Auth system with localStorage persistence
- **Commit:** `b8f0547` → Deployed to https://kairos-trade.netlify.app

### Feb 22, 2026 — Session 4 (Kairos Wallet Sprint 6)
- **Fixed critical gaps from MetaMask audit** — Sprint 6 complete
- **Commit:** `60e2b49`

### Feb 22, 2026 — Sessions 2-3 (Wallet Sprints 1-5, Multi-Chain)
- Built Kairos Wallet with 26+ features across 5 sprints
- Deployed KAIROS to 4 chains: BSC, Base, Arbitrum, Polygon

### Feb 22, 2026 — Session 2
- **Built Buy/Redeem page** (`website/buy.html`) with 3 tabs and MetaMask integration
- **Added fiat on-ramp tab** — Transak widget, MoonPay, Changelly, step-by-step guides
- **Rebranded** provider cards from "Buy USDT" to "Buy KAIROS"
- **Submitted Transak KYB application** — waiting 2-3 business days
- **Generated Share Certificate** for KYB requirement
- **Built Transak webhook system** — `webhook.js`, `fiat.js`, `fiat_orders` table
- **Backend v1.1.0** — Fiat on-ramp endpoints, CORS updated, auto-mint pipeline
- All deployed to Netlify (website) and GitHub (backend auto-deploys to Render)

### Session 3 — Feb 22, 2026 (Multi-Chain)
- **Deployed KairosCoin to Base** — Same address `0x14D41707269c7D8b8DFa5095b38824a46dA05da3`, verified on BaseScan
- **Deployed KairosCoin to Arbitrum** — Same address `0x14D41707269c7D8b8DFa5095b38824a46dA05da3`, verified on Arbiscan
- **Deployed KairosCoin to Polygon** — Address `0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9`, verified on PolygonScan
- **Created bridge scripts** — `bridge-to-base.js` (LI.FI), `bridge-and-deploy-all.js`
- **Created deploy script** — `deploy-multichain.js` with deployment logging
- **Bridged BNB→ETH** via Across Protocol for gas on Base/Arbitrum
- **Updated hardhat.config.js** — Etherscan V2 API, auto gas for Polygon
- KAIROS now live on **4 blockchains**: BSC, Base, Arbitrum, Polygon

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

### Kairos Trade — Next Features
- [ ] Strategy marketplace (share/import strategies)
- [ ] Wallet integration (connect Kairos Wallet with trading platform)
- [ ] Advanced order types (OCO, trailing stop, iceberg)
- [ ] Portfolio analytics dashboard with P&L charts
- [ ] Social trading / copy trading features
- [ ] Multi-exchange support (Binance, Bybit, OKX live trading)
- [ ] Mobile responsive optimization
- [ ] Real backend auth (replace localStorage simulation)

### Short-term
- [x] Multi-chain deployment (Base, Arbitrum, Polygon) ✅ DONE Feb 22, 2026
- [x] Kairos Wallet complete (6 sprints) ✅ DONE Feb 22, 2026
- [x] Kairos Trade v1.0 built and deployed ✅ DONE Feb 22, 2026
- [x] Kairos Trade Premium UI v2 ✅ DONE Feb 23, 2026
- [ ] Ethereum mainnet deployment (waiting — gas expensive ~$30+)
- [ ] Cross-chain bridge integration
- [ ] CoinGecko / CoinMarketCap listing
- [ ] Token logo submission to Trust Wallet / MetaMask token lists

### Medium-term
- [ ] Governance token / DAO
- [ ] Mobile app release
- [ ] Additional exchange listings
- [ ] Institutional API partnerships

---

## 16. KAIROS TRADE — TECHNICAL DETAILS

### Architecture
- **Frontend:** React 18.3 + Vite 6.4 + Tailwind CSS 4 + Zustand state management
- **Charts:** lightweight-charts v4.1 with `autoSize: true`, WebSocket real-time updates
- **Data:** Binance public API (no auth needed) — WebSocket for live prices, REST for candles/orderbook/tickers
- **AI:** Local analysis engine (pattern detection, indicator analysis) + optional OpenAI GPT-4 via user-provided API key
- **Storage:** All data in localStorage (auth, bots, strategies, settings, alerts)
- **Build:** Vite with manual chunks: vendor (react), ui (framer-motion, lucide), charts (lightweight-charts)

### Key Components & Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `dashboard` | Dashboard.jsx | Stats, quick actions, market overview |
| `chart` | TradingChart.jsx + TradingPanel.jsx | Live chart + order entry side panel |
| `simulator` | SimulatorScreen.jsx | Paper trading with $10k virtual |
| `bots` | BotManager.jsx | Create/manage trading bots |
| `strategies` | StrategyBuilder.jsx | 5 templates + custom strategy builder |
| `ai` | AIChat.jsx | Chat with Kairos AI assistant |
| `brokers` | BrokerManager.jsx | Connect exchange API keys |
| `history` | TradeHistory.jsx | Trade log and reports |
| `alerts` | AlertPanel.jsx | Price + technical signal alerts |
| `wallet` | (inline) | Link to Kairos Wallet app |
| `settings` | SettingsPanel.jsx | OpenAI key, preferences |

### Services
- **marketData.js** — Binance WebSocket (`wss://stream.binance.com:9443/ws`) for live prices, REST for candles/orderbook/24hr tickers, symbol search
- **indicators.js** — EMA, SMA, RSI, MACD, Bollinger Bands, VWAP, crossover/divergence detection
- **ai.js** — Local market analysis + OpenAI GPT-4 chat integration
- **broker.js** — Broker API key management with base64 encryption
- **tradingEngine.js** — Order execution, position management, P&L calculation
- **simulator.js** — Paper trading engine with virtual balance tracking
- **alerts.js** — Price alerts (above/below) + technical signals (EMA cross, RSI, MACD, volume spike), 15s monitoring interval, browser notifications

---

## 17. KNOWN ISSUES / PARTIAL FIXES

- Some guide steps in `buy.html` (Alternative Methods section) still reference "USDT" where they should say "stablecoins" or be reworded (~lines 1191, 1223, 1227, 1259, 1291, 1305)
- Transak widget uses placeholder API key until production key is received
- Render free tier may sleep after 15 min inactivity (first request after sleep takes ~30s)
- Kairos Trade auth is simulated (localStorage only, no real backend auth)
- Kairos Trade broker connections are UI-only (API keys stored but not used for live trading yet)
- CSS variable names in kairos-trade say `--gold` but values are blue — intentional to avoid refactoring 100+ references

---

*This file should be updated after every significant work session.*
*To onboard a new Copilot chat: "Read PROJECT_BIBLE.md and continue from where we left off."*
