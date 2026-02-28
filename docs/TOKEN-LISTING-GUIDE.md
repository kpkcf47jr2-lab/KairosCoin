# KAIROS Token Visibility — Listing Guide

## Status (Updated: March 2, 2026)

### ✅ Completed (Automated)
| Step | Status | Details |
|------|--------|---------|
| KairosCoin verified on BscScan | ✅ | https://bscscan.com/address/0x14D41707269c7D8b8DFa5095b38824a46dA05da3#code |
| KairosSwapFactory verified on BscScan | ✅ | https://bscscan.com/address/0xB5891c54199d539CB8afd37BFA9E17370095b9D9#code |
| KairosSwapRouter verified on BscScan | ✅ | https://bscscan.com/address/0x4F8C99a49d04790Ea8C48CC60F88DB327e509Cd6#code |
| KairosSwapPair verified on BscScan | ✅ | https://bscscan.com/address/0x61C2DB0143F215Dc9647D34ac4220855E00D7015#code |
| Swap events on PancakeSwap | ✅ | 3 swaps executed (BNB→KAIROS, KAIROS→BNB, BNB→KAIROS) |
| Swap events on KairosSwap | ✅ | 2 swaps executed (BNB→KAIROS, KAIROS→BNB) |

### 🕐 Pending — DexScreener (PancakeSwap pair - auto-indexing)
DexScreener automatically indexes PancakeSwap pairs when swap events are detected.
Now that swaps exist, the pair should appear within **1-24 hours**.

**Check:** https://dexscreener.com/bsc/0x14D41707269c7D8b8DFa5095b38824a46dA05da3

If not indexed after 24h, contact DexScreener on Telegram: https://telegram.me/dexscreenerchat

### 📝 Manual Steps Required

---

## 1. DexScreener — KairosSwap Integration (Contact Required)

KairosSwap is a custom DEX not yet known to DexScreener. For KairosSwap pairs to appear,
the DEX must be integrated into their indexer.

**Action:** Contact DexScreener team
- **Telegram:** https://telegram.me/dexscreenerchat
- **Message template:**
  > Hi! We'd like to request integration of our DEX "KairosSwap" on BSC.
  > It's a Uniswap V2 fork with verified contracts:
  > - Factory: 0xB5891c54199d539CB8afd37BFA9E17370095b9D9
  > - Router: 0x4F8C99a49d04790Ea8C48CC60F88DB327e509Cd6
  > - Example Pair (KAIROS/WBNB): 0x61C2DB0143F215Dc9647D34ac4220855E00D7015
  > All contracts are verified on BscScan. Standard Uniswap V2 events (PairCreated, Swap, Mint, Burn, Sync).
  > Website: https://kairos-exchange-app.netlify.app
  > Thank you!

---

## 2. CoinGecko Listing (Free)

**Requirements met:**
- ✅ Working website: https://kairos-777.com
- ✅ Block explorer: Token verified on BscScan
- ✅ Trading on CoinGecko-tracked exchange: PancakeSwap V2

**Action:** Submit at https://www.coingecko.com/request-form

**Information needed:**
| Field | Value |
|-------|-------|
| Type | Token |
| Listing type | Active Listing |
| Token name | KairosCoin |
| Token symbol | KAIROS |
| Chain | BNB Smart Chain (BEP20) |
| Contract address | 0x14D41707269c7D8b8DFa5095b38824a46dA05da3 |
| Decimals | 18 |
| Description | KairosCoin (KAIROS) is a USD-pegged stablecoin (1 KAIROS = 1 USD) on BNB Smart Chain. Built for fast, low-cost payments and DeFi. |
| Website | https://kairos-777.com |
| Explorer | https://bscscan.com/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3 |
| DEX | PancakeSwap V2 |
| Pair | KAIROS/WBNB |
| Pair address | 0xfCb17119D559E47803105581A28584813FAffb49 |
| Logo | Upload from assets/branding/ |

**Expected timeline:** 1-4 weeks review

---

## 3. CoinMarketCap Listing (Free)

**Action:** Submit at https://support.coinmarketcap.com/hc/en-us/requests/new (select "Add Cryptocurrency")

**Same information as CoinGecko**, plus:
| Field | Value |
|-------|-------|
| Total supply | 10,000,000,000 KAIROS |
| Max supply | 10,000,000,000 KAIROS |
| Source code | https://bscscan.com/address/0x14D41707269c7D8b8DFa5095b38824a46dA05da3#code |
| Launch date | Feb 2026 |
| Platform | BNB Smart Chain |

**Expected timeline:** 2-8 weeks review

---

## 4. BscScan Token Info Update (Free)

To add logo and social links on BscScan token page:

**Action:** Submit at https://bscscan.com/contactus?id=2 (Token Update Request)

**Information needed:**
| Field | Value |
|-------|-------|
| Token contract | 0x14D41707269c7D8b8DFa5095b38824a46dA05da3 |
| Official website | https://kairos-777.com |
| Logo (PNG 128x128) | Upload from assets/branding/ |
| Description | KairosCoin (KAIROS) - USD-pegged stablecoin by Kairos 777 Inc |
| Social profiles | Twitter, Telegram, etc. |

---

## 5. Token Logo on Trust Wallet / MetaMask

**Trust Wallet:** Submit PR to https://github.com/nicecoindev/assets
- Add logo at `blockchains/smartchain/assets/0x14D41707269c7D8b8DFa5095b38824a46dA05da3/logo.png`

---

## Quick Summary — Priority Order

1. **Wait 24h** for DexScreener to auto-index PancakeSwap pair ⏳
2. **Submit CoinGecko** listing request (highest visibility impact)
3. **Submit CoinMarketCap** listing request
4. **Contact DexScreener** for KairosSwap integration
5. **Submit BscScan** token info update
6. **Submit Trust Wallet** logo PR
