# KairosCoin — Copilot Instructions
# This file is automatically read by GitHub Copilot in VS Code.
# It provides context so every new chat session understands the project.

## Project Identity
You are working on **KairosCoin (KAIROS)**, a USD-pegged stablecoin (1 KAIROS = 1 USD) owned by **Kairos 777 Inc**, founded by **Mario Isaac**. The language preference is **Spanish** for conversation but **English** for code and documentation.

## Critical: Read PROJECT_BIBLE.md First
Before starting any work, read `PROJECT_BIBLE.md` in the project root. It contains the complete project state, all deployed addresses, API keys, infrastructure URLs, and the full changelog. This is your single source of truth.

## Architecture Summary
- **Smart Contract:** `contracts/KairosCoin.sol` — Solidity 0.8.24, deployed on BSC at `0x14D41707269c7D8b8DFa5095b38824a46dA05da3`
- **Backend API:** `backend/src/server.js` — Node.js + Express + SQLite, deployed on Render at `https://kairos-api-u6k5.onrender.com`
- **Website:** `website/` folder — Static HTML/CSS/JS, deployed on Netlify at `https://kairos-777.com`
- **Wallet App:** `kairos-wallet/` — React + Vite + Tailwind, deployed at `https://kairos-wallet.netlify.app`

## Key Addresses
- Owner wallet: `0xCee44904A6aA94dEa28754373887E07D4B6f4968`
- Contract (BSC/Base/Arbitrum): `0x14D41707269c7D8b8DFa5095b38824a46dA05da3`
- Contract (Polygon): `0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9`
- USDT (BSC): `0x55d398326f99059fF775485246999027B3197955`
- BUSD (BSC): `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56`
- USDC (BSC): `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`

## Code Style
- Backend: Node.js CommonJS (`require`/`module.exports`), Express routes in `backend/src/routes/`
- Frontend: Vanilla HTML/CSS/JS with CDN ethers.js v6 (no build step for website)
- Wallet: React JSX with Zustand store
- Contracts: Solidity 0.8.24 with OpenZeppelin v5.4
- Brand colors: Gold `#D4AF37`, Dark `#0D0D0D`, Fonts: Playfair Display + Inter

## Deploy Commands
- Website: `npx netlify deploy --prod --dir=website --site=8d880818-7126-4645-8367-e49163a1afaf --auth=nfp_pU5vLFxKCEuZS7mnPW2zn7YSYVHbrXjX0c93`
- Backend: `git push origin main` (Render auto-deploys)
- Contract: `npx hardhat run scripts/deploy.js --network bsc`

## Current Status (Update this section after each session)
- Transak KYB submitted Feb 22, 2026 — waiting approval
- Backend v1.1.0 with fiat webhook system built and deployed
- All infrastructure live and operational
- KAIROS deployed on 4 chains: BSC, Base, Arbitrum, Polygon (Feb 22, 2026)
- Next focus: Wallet app full features

## Important Rules
1. Always update `PROJECT_BIBLE.md` after significant changes
2. Test for errors before committing (`get_errors`)
3. Deploy website changes to Netlify after editing website/ files
4. Git push to deploy backend changes to Render
5. Never expose private keys in code — use .env variables
6. Respond in Spanish unless user switches to English
