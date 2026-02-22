# Guía: Arreglar el Logo de KAIROS Token en BNB Chain

## Estado Actual (22 Feb 2026)

| Plataforma | Estado | Acción Requerida |
|-----------|--------|-----------------|
| **Kairos Wallet** | ✅ Logo correcto | Ya arreglado |
| **Website (kairos-777.com)** | ✅ Logo correcto | Ya desplegado |
| **Trust Wallet** | ⏳ PR enviado | Esperar aprobación |
| **BscScan** | ❌ Sin logo | Enviar formulario manual |
| **MetaMask** | ⚠️ Puede mostrar logo viejo | Re-agregar token |
| **CoinGecko** | ❌ No listado | Aplicar cuando PR de TW se apruebe |
| **CoinMarketCap** | ❌ No listado | Aplicar cuando PR de TW se apruebe |

---

## 1. Trust Wallet (PR Automático) ✅ HECHO

**PR**: https://github.com/trustwallet/assets/pull/35592

Archivos subidos:
- `blockchains/smartchain/assets/0x14D41707269c7D8b8DFa5095b38824a46dA05da3/logo.png` (256x256)
- `blockchains/smartchain/assets/0x14D41707269c7D8b8DFa5095b38824a46dA05da3/info.json`

**Tiempo estimado**: Trust Wallet revisa PRs en 1-4 semanas.

Una vez aprobado, Trust Wallet y muchas otras wallets que usan este repositorio 
(incluyendo algunas versiones de MetaMask) mostrarán el logo automáticamente.

---

## 2. BscScan — Token Info Update (MANUAL)

**URL**: https://bscscan.com/tokenupdate?a=0x14D41707269c7D8b8DFa5095b38824a46dA05da3

### Pasos:
1. Ve a la URL de arriba
2. Conecta con la wallet del deployer (0xCee44904...D4B6f4968)
3. Llena el formulario:

| Campo | Valor |
|-------|-------|
| Token Name | Kairos Coin |
| Symbol | KAIROS |
| Official Website | https://kairos-777.com |
| Logo URL | https://kairos-777.com/kairos-logo-256.png |
| Description | Kairos Coin (KAIROS) is a BEP-20 utility token on the BNB Smart Chain powering the Kairos ecosystem — including Kairos Wallet, Kairos Trade, and future DeFi services. |
| Official Email | (tu email) |
| Blog URL | https://kairos-777.com/whitepaper.html |
| Twitter | https://x.com/kairoscoin |
| Telegram | https://t.me/kairoscoin |

4. Sube el logo: usa el archivo `kairos-logo-32.png` (32x32, formato requerido por BscScan)
   - Ubicación: `/Users/kaizenllc/KairosCoin/assets/branding/kairos-token-32.png`
5. Envía el formulario

**Tiempo estimado**: BscScan procesa en 1-5 días hábiles.

---

## 3. MetaMask — Re-agregar Token

Si ya tenías KAIROS en MetaMask antes de la corrección, el logo viejo está cacheado.

### Pasos:
1. Abre MetaMask
2. Ve a la lista de tokens
3. Busca KAIROS y haz click en los 3 puntos → "Hide token"
4. Ve a https://kairos-777.com
5. Haz click en "Add to Wallet" 
6. MetaMask pedirá confirmación → Acepta
7. Ahora verás el logo correcto (moneda dorada)

**Funciona inmediatamente** — el logo se obtiene de `https://kairos-777.com/kairos-logo.png`

---

## 4. Otras Wallets que Usan Token Lists

Las wallets modernas (como MetaMask, 1inch, etc.) también soportan Token Lists.

El Token List de Kairos está disponible en:
```
https://kairos-777.com/tokenlist.json
```

Para que PancakeSwap lo muestre, puedes submittir tu token list:
1. Ve a https://github.com/nicecash/pancake-toolkit/tree/master/packages/token-lists
2. (Si no existe, crea un PR similar al de Trust Wallet)

---

## 5. Logos Disponibles en kairos-777.com

| Tamaño | URL |
|--------|-----|
| 1024x1024 (original) | https://kairos-777.com/kairos-logo.png |
| 256x256 (Trust Wallet) | https://kairos-777.com/kairos-logo-256.png |
| 128x128 (wallets) | https://kairos-777.com/kairos-logo-128.png |
| 64x64 (iconos) | https://kairos-777.com/kairos-logo-64.png |
| 32x32 (BscScan) | https://kairos-777.com/kairos-logo-32.png |

---

## 6. Cuando Apliques a CoinGecko / CoinMarketCap

En los formularios de aplicación, usa estos datos:
- **Logo URL**: https://kairos-777.com/kairos-logo.png
- **Token List**: https://kairos-777.com/tokenlist.json
- **Trust Wallet Assets PR**: https://github.com/trustwallet/assets/pull/35592

Tener el logo en Trust Wallet Assets es un requisito implícito para CoinGecko.

---

## Archivos Locales de Referencia

```
/Users/kaizenllc/KairosCoin/
├── assets/branding/
│   ├── kairos-coin-logo.png    (1024x1024 - logo original moneda dorada)
│   ├── logo-256.png            (256x256 - para Trust Wallet)
│   ├── kairos-token-128.png    (128x128 - para wallets)
│   ├── kairos-token-64.png     (64x64)
│   └── kairos-token-32.png     (32x32 - para BscScan)
├── website/
│   ├── kairos-logo.png         (1024x1024 - desplegado en kairos-777.com)
│   ├── kairos-logo-256.png     (256x256)
│   ├── kairos-logo-128.png     (128x128)
│   ├── kairos-logo-64.png      (64x64)
│   ├── kairos-logo-32.png      (32x32)
│   ├── tokenlist.json          (Token List estándar)
│   └── wallet-icon.png         (128x128 - logo de la wallet app, NO el token)
└── kairos-wallet/public/icons/
    ├── kairos-token-128.png    (logo moneda dorada para la wallet app)
    └── logo-512.png            (logo de la wallet app)
```
