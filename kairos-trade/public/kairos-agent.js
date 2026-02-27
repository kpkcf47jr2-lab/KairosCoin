/* ═══════════════════════════════════════════════════════════════
   KAIROS 777 — AI Agent Widget v2.0 (Trade Edition)
   Smart conversational agent with fuzzy matching, context
   memory, response variations, and natural conversation flow.
   "In God We Trust"
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Conversation State ──
  const CTX = { lastTopic: null, history: [], turnCount: 0 };

  // ── Utilities ──
  function norm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿¡?!.,;:'"()\-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++)
      for (let j = 1; j <= a.length; j++)
        m[i][j] = b[i-1] === a[j-1] ? m[i-1][j-1] : Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1);
    return m[b.length][a.length];
  }

  function wordSimilar(a, b) {
    if (a === b) return 1;
    if (a.length < 3 || b.length < 3) return a === b ? 1 : 0;
    if (a.includes(b) || b.includes(a)) return 0.9;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    if (dist <= 1 && maxLen >= 4) return 0.85;
    if (dist <= 2 && maxLen >= 6) return 0.7;
    return 0;
  }

  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ── Knowledge Base ──
  const KB = {
    greetings: [
      "¡Hola! 😊 Soy tu asistente de **Kairos 777**. ¿En qué te puedo ayudar hoy?",
      "¡Hey! 👋 Bienvenido a **Kairos 777**. Pregúntame lo que quieras sobre trading, criptos, o la plataforma.",
      "¡Hola! Soy el agente de **Kairos 777** 📊 ¿Tienes alguna duda sobre cómo operar, los bots, o cómo funciona todo?"
    ],

    topics: {
      what_is: {
        keywords: ['que es kairos','kairos','about','explicar','acerca','cuentame','que es esto','plataforma','que hacen','a que se dedican','que ofrece','informacion','conocer'],
        patterns: [/qu[eé]\s+(es|son|hace|ofrece)\s+kairos/i, /tell\s+me\s+about/i, /what\s+is/i, /cuentame\s+(sobre|de|mas)/i, /para\s+qu[eé]\s+sirve/i],
        answers: [
          `**Kairos 777** es un ecosistema financiero completo 🏛️ Fue creado por **Kaizen LLC**, empresa registrada en Florida, EE.UU.

Tenemos 3 productos principales:

🔸 **KairosCoin (KAIROS)** — Stablecoin 1:1 con el dólar, en 4 blockchains
🔸 **Kairos 777** — Esta plataforma de trading con 33+ pares y hasta 150x
🔸 **Kairos Wallet** — Billetera multi-chain para gestionar tus activos

Todo está respaldado por reservas verificables en tiempo real, smart contracts auditados con OpenZeppelin, y la filosofía: *"In God We Trust"*.

¿Sobre qué te gustaría profundizar?`,
          `**Kairos 777** es donde estás ahora 📊 Es parte de un ecosistema que incluye una stablecoin (KAIROS), esta plataforma de trading, y una wallet multi-chain.

Lo que nos hace diferentes:
✅ Trading con apalancamiento hasta 150x
✅ Bots de AI que operan por ti 24/7
✅ Stablecoin propia respaldada 1:1 con USD
✅ Empresa real registrada en Florida, EE.UU.

¿Te interesa saber cómo empezar a operar?`
        ],
        related: ['how_to_trade', 'ecosystem', 'security']
      },

      how_to_trade: {
        keywords: ['como operar','como empiezo','empezar','comenzar','primeros pasos','tutorial','guia','getting started','como funciona','como uso','como hago','inicio','principiante','nuevo','abrir posicion','operar','first time','start','begin'],
        patterns: [/c[oó]mo\s+(opero|operar|empiezo|empezar|comienzo|inicio|hago|funciona)/i, /quiero\s+(operar|empezar|comenzar|aprender)/i, /how\s+to\s+(trade|start|begin)/i, /primeros?\s+pasos?/i, /soy\s+nuevo/i, /no\s+s[eé]\s+(c[oó]mo|por\s+d[oó]nde)/i],
        answers: [
          `¡Vamos a ponerte a operar! 🚀

**4 pasos simples:**

**1.** Conecta tu wallet → MetaMask, Trust Wallet, o cualquier wallet compatible
**2.** Elige un par → Por ejemplo BTC/KAIROS, ETH/KAIROS, SOL/KAIROS...
**3.** Configura tu operación → Apalancamiento (1x-150x), tamaño, stop-loss
**4.** Abre posición → Long (sube) o Short (baja)

💡 **Mis tips para empezar:**
→ Usa apalancamiento bajo al inicio (2x-5x)
→ Siempre pon stop-loss — es tu seguro
→ Empieza con cantidades pequeñas hasta entender la dinámica

¿Necesitas ayuda con algo específico? ¿Pares, apalancamiento, bots?`,
          `**¡Bienvenido!** Empezar es fácil:

1️⃣ **Conecta tu wallet** — Haz clic en "Connect Wallet" arriba. Funciona con MetaMask, Trust Wallet y más
2️⃣ **Elige un mercado** — Tenemos 33+ pares: BTC, ETH, SOL, BNB, y muchos más
3️⃣ **Abre tu primera operación** — Elige apalancamiento, pon tu monto, y ejecuta

⚠️ **Importante:** El trading con apalancamiento tiene riesgo. No inviertas más de lo que puedes perder.

¿Quieres que te explique alguno de estos pasos con más detalle?`
        ],
        related: ['pairs', 'leverage', 'bots']
      },

      pairs: {
        keywords: ['pares','pairs','par','mercados','markets','que puedo operar','activos','assets','crypto','criptos','monedas','coins','lista','disponibles','btc','eth','sol','bnb','xrp','doge','listado'],
        patterns: [/qu[eé]\s+(pares|mercados|monedas|activos|criptos?)/i, /cu[aá]ntos?\s+pares?/i, /what\s+(pairs|markets|coins)/i, /qu[eé]\s+puedo\s+operar/i, /hay\s+(btc|eth|sol|bnb)/i, /tienen\s+(btc|eth|sol)/i],
        answers: [
          `**33+ pares disponibles** para que operes 📊

**Los más populares:**
🔥 BTC/KAIROS · ETH/KAIROS · BNB/KAIROS · SOL/KAIROS

**Altcoins top:**
💎 DOGE/KAIROS · XRP/KAIROS · AVAX/KAIROS · LINK/KAIROS
💎 ADA/KAIROS · DOT/KAIROS · MATIC/KAIROS · UNI/KAIROS

**DeFi & L2:**
🔷 ARB/KAIROS · OP/KAIROS · AAVE/KAIROS · ATOM/KAIROS

**Memecoins:**
🐕 DOGE/KAIROS · SHIB/KAIROS · PEPE/KAIROS

Todos con datos en tiempo real. ¿Te interesa alguno en particular?`,
          `Tenemos **más de 33 pares** 🎯

Los más operados:
→ **BTC/KAIROS** — El rey, siempre tiene volumen
→ **ETH/KAIROS** — Ethereum, el clásico
→ **SOL/KAIROS** — Solana, rápido y volátil
→ **BNB/KAIROS** — Binance coin
→ **XRP/KAIROS** — Ripple

También tenemos DOGE, AVAX, LINK, ADA, DOT, UNI, AAVE, ARB, OP, SHIB, PEPE... y más.

¿Quieres que te recomiende un par para empezar?`
        ],
        related: ['leverage', 'how_to_trade', 'bots']
      },

      leverage: {
        keywords: ['apalancamiento','leverage','multiplicador','margen','margin','150x','100x','50x','10x','5x','2x','cuanto apalancamiento','que apalancamiento','long','short'],
        patterns: [/apalancamiento/i, /leverage/i, /cu[aá]nto\s+(apalancamiento|leverage)/i, /qu[eé]\s+es\s+(el\s+)?apalancamiento/i, /c[oó]mo\s+funciona\s+(el\s+)?apalancamiento/i, /\d+x/i],
        answers: [
          `**Apalancamiento en Kairos 777** ⚡

Ofrecemos desde **1x hasta 150x**:

🟢 **1x-5x** → Conservador (principiantes)
🟡 **5x-25x** → Moderado (intermedios)
🟠 **25x-75x** → Agresivo (avanzados)
🔴 **75x-150x** → Ultra (solo expertos)

📐 **Ejemplo práctico** con $100 y 10x:
→ Tu posición vale $1,000
→ Si BTC sube 5% → ganas $50 (50% sobre tu capital)
→ Si BTC baja 10% → pierdes los $100

⚠️ **A mayor apalancamiento, mayor riesgo de liquidación.** Siempre usa stop-loss.

¿Quieres que te explique los stop-loss?`,
          `El apalancamiento te permite operar con más dinero del que tienes 📈

**¿Cómo funciona?** Si tienes $100:
→ Con **5x** operas como si tuvieras $500
→ Con **20x** operas como si tuvieras $2,000
→ Con **100x** operas como si tuvieras $10,000

**Mi recomendación:**
🟢 Si eres nuevo → usa **2x-5x** máximo
🟡 Si ya tienes experiencia → **10x-25x**
🔴 75x+ es solo para traders muy experimentados

Lo importante es SIEMPRE poner un **stop-loss**. Es tu red de seguridad.

¿Te explico cómo configurar uno?`
        ],
        related: ['risk', 'how_to_trade', 'stop_loss']
      },

      bots: {
        keywords: ['bot','bots','automatizado','automated','algoritmo','algorithm','ai','inteligencia artificial','estrategia','strategy','auto','automatico','robot','grid','dca','scalping','trend','backtesting','backtest'],
        patterns: [/bots?\s+(de\s+)?trading/i, /trading\s+autom[aá]tico/i, /inteligencia\s+artificial/i, /qu[eé]\s+bots?/i, /c[oó]mo\s+funcionan?\s+(los\s+)?bots?/i, /operar\s+autom[aá]tic/i],
        answers: [
          `**Bots de Trading con AI** 🤖 — Tu arma secreta

Tenemos 4 tipos:

🔸 **Grid Bot** — Pone órdenes de compra y venta en rango
   *Ideal para:* Mercados laterales, genera profit constante

🔸 **DCA Bot** — Compra automáticamente a intervalos
   *Ideal para:* Acumulación a largo plazo, reduce riesgo

🔸 **Trend Bot** — Detecta tendencias con AI y entra automáticamente
   *Ideal para:* Mercados en movimiento

🔸 **Scalping Bot** — Muchas operaciones pequeñas
   *Ideal para:* Pares muy líquidos, ganancias constantes

✅ Todos incluyen **backtesting** con datos históricos
✅ Configuración personalizable
✅ Alertas en tiempo real

¿Cuál te interesa? Te puedo explicar más.`,
          `Los bots operan por ti **24/7 sin emociones** 🤖

**Lo mejor:**
→ No tienes que estar pegado a la pantalla
→ Ejecutan estrategias probadas con backtesting
→ Sin miedo, sin FOMO, sin errores emocionales

**Los más populares:**
1️⃣ **Grid Bot** — Para cuando el mercado va de lado
2️⃣ **DCA Bot** — Para acumular crypto de forma inteligente
3️⃣ **Trend Bot** — Para surfear las grandes tendencias

💡 **Tip:** Empieza con un Grid Bot en BTC/KAIROS con bajo capital. Es el más fácil de entender.

¿Te configuro uno paso a paso?`
        ],
        related: ['how_to_trade', 'pairs', 'risk']
      },

      fees: {
        keywords: ['comisiones','comision','fees','fee','costo','cost','cuanto cobra','cuanto cuesta','how much cost','tarifas','rates','spread','spreads','cobran','cobro','tarifa','gratis','free'],
        patterns: [/cu[aá]nto\s+(cobra|cuesta|cuestan|pago|sale)/i, /comisi[oó]n(es)?/i, /(hay|tiene)\s+comisi[oó]n/i, /es\s+gratis/i, /how\s+much/i, /spread/i],
        answers: [
          `**Comisiones claras, sin sorpresas** 💰

🔸 **Spot:** 0.1% por operación
🔸 **Futuros:** 0.05% maker · 0.07% taker
🔸 **Spreads:** Cero spreads ocultos — precios del mercado
🔸 **Depósitos crypto:** GRATIS
🔸 **Cuota mensual:** NO hay

💡 **Tip pro:** Usa KAIROS como colateral para descuentos en comisiones.

Comparado con Binance (0.1%), somos iguales o más baratos en futuros 😉

¿Algo más que quieras saber?`,
          `Nuestras comisiones son de las más bajas 💸

→ **0.1%** por trade en spot
→ **0.05% / 0.07%** en futuros (maker/taker)
→ **$0** de depósito en crypto
→ **$0** de cuota mensual

Sin letras pequeñas, sin spreads ocultos. Lo que ves es lo que pagas.

¿Te interesa saber sobre gas fees de blockchain?`
        ],
        related: ['how_to_trade', 'how_to_buy']
      },

      how_to_buy: {
        keywords: ['comprar','buy','adquirir','purchase','como compro','donde compro','obtener','get kairos','quiero comprar','want to buy','depositar','deposit','fondos','meter dinero','cargar','recargar','agregar fondos','tarjeta','card','visa','mastercard','fiat'],
        patterns: [/c[oó]mo\s+(compro|comprar|adquiero|obtengo|deposito|cargo|meto)/i, /d[oó]nde\s+(compro|comprar)/i, /quiero\s+(comprar|depositar|meter|agregar)/i, /how\s+to\s+(buy|purchase|deposit)/i, /(puedo|acepta)\s+(tarjeta|visa|mastercard)/i],
        answers: [
          `**3 formas de obtener KAIROS** 💰

**1. Tarjeta de crédito/débito** (la más fácil) 💳
→ Ve a [kairos-777.com/buy](https://kairos-777.com/buy.html)
→ Paga con Visa, Mastercard o Apple Pay
→ Recibe KAIROS directo en tu wallet

**2. Transferencia de stablecoins** 🔄
→ Envía USDT, USDC o BUSD a tu wallet
→ Intercámbialo por KAIROS

**3. Swap en DEX** 🔄
→ PancakeSwap en BSC
→ Contrato: \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`

Una vez tengas KAIROS, ya puedes usarlo como colateral aquí.

¿Necesitas que te guíe en alguna opción?`
        ],
        related: ['price', 'wallet', 'how_to_trade']
      },

      ecosystem: {
        keywords: ['ecosistema','productos','servicios','que ofrecen','todo lo que tienen','apps','aplicaciones','herramientas','features','funciones','que incluye'],
        patterns: [/qu[eé]\s+(productos|servicios|ofrece|ofrecen|tienen|incluye)/i, /todo\s+lo\s+que/i, /ecosystem/i],
        answers: [
          `**El ecosistema Kairos 777** — Todo lo que necesitas 🏛️

🔸 **KairosCoin (KAIROS)** — Stablecoin 1:1 con USD en 4 chains
   → [kairos-777.com](https://kairos-777.com)

📊 **Kairos 777** — Estás aquí
   Trading con 33+ pares, hasta 150x, bots AI

📱 **Kairos Wallet** — Billetera multi-chain
   → [kairos-wallet.netlify.app](https://kairos-wallet.netlify.app)

🏦 **Reservas Transparentes**
   → [kairos-777.com/reserves](https://kairos-777.com/reserves.html)

📄 **Whitepaper** — Documentación técnica
   → [kairos-777.com/whitepaper](https://kairos-777.com/whitepaper.html)

¿Qué producto te interesa explorar?`
        ],
        related: ['what_is', 'wallet', 'how_to_trade']
      },

      price: {
        keywords: ['precio','price','valor','value','cuanto vale','cotizacion','rate','costo kairos','cuanto es','cuanto esta','a cuanto'],
        patterns: [/cu[aá]nto\s+(vale|cuesta|es|est[aá])/i, /(precio|valor|cotizaci[oó]n)\s+(de\s+)?kairos/i, /what.*price/i, /a\s+cu[aá]nto/i],
        answers: [
          `**1 KAIROS = 1 USD** — Siempre 💵

KAIROS es una **stablecoin** — su precio está fijado al dólar. No sube ni baja como Bitcoin.

**¿Por qué es bueno para trading?**
✅ Tu colateral no pierde valor mientras duermes
✅ Cálculos de P&L súper claros
✅ Sin el estrés de que tu margen fluctúe

Es como tener dólares digitales con la velocidad de la blockchain 🚀

¿Quieres saber cómo comprar?`
        ],
        related: ['how_to_buy', 'stablecoin', 'reserves']
      },

      security: {
        keywords: ['seguro','safe','seguridad','security','confiable','trust','auditado','scam','estafa','legitimo','hack','fondos seguros','proteccion','robo','fraude','confianza','real','verdad','fake','falso'],
        patterns: [/es\s+(seguro|confiable|leg[ií]timo|real|verdad)/i, /no\s+(es|ser[aá])\s+(una?\s+)?(estafa|scam|fraude)/i, /(puedo\s+)?confiar/i, /mis?\s+fondos\s+(est[aá]n\s+)?seguros?/i, /is\s+(it\s+)?(safe|legit|secure)/i],
        answers: [
          `**Tu seguridad es nuestra prioridad #1** 🛡️

**Empresa real y registrada:**
→ Kairos 777 Inc — Florida, EE.UU.
→ Fundada por Kaizen LLC
→ Con políticas AML/CTF documentadas

**Smart contracts seguros:**
→ Basados en OpenZeppelin v5.4 (estándar de la industria)
→ Función de pausa de emergencia
→ Código verificado en BSCScan

**Tus fondos protegidos:**
→ **Non-custodial** — Tus llaves, tus fondos
→ Nosotros no tenemos acceso a tu wallet
→ Toda transacción la autorizas tú

¿Te queda alguna duda sobre seguridad?`,
          `Entiendo la preocupación — hay muchas estafas en crypto. Pero Kairos 777 es diferente:

✅ **Empresa registrada** en Florida, EE.UU.
✅ **Smart contracts auditados** con OpenZeppelin v5.4
✅ **Non-custodial** — Nunca tenemos acceso a tus fondos
✅ **Reservas verificables** en tiempo real
✅ **Código abierto** verificado en BSCScan

Tu wallet, tus llaves, tus fondos. Nosotros solo proveemos la plataforma.

¿Quieres verificar el contrato en BSCScan?`
        ],
        related: ['contract', 'reserves', 'founder']
      },

      wallet: {
        keywords: ['wallet','billetera','monedero','conectar','connect','metamask','trust wallet','guardar','almacenar','desconectar','cambiar wallet','que wallet','cual wallet'],
        patterns: [/c[oó]mo\s+(conecto|conectar|uso)\s+(mi\s+)?(wallet|billetera|metamask)/i, /qu[eé]\s+wallet/i, /cu[aá]l\s+wallet/i, /connect\s+wallet/i, /no\s+(me\s+)?conecta/i],
        answers: [
          `**Conectar tu Wallet** 🔗

Soportamos:
→ **MetaMask** — La más popular en desktop
→ **Trust Wallet** — Ideal para móvil
→ **WalletConnect** — 200+ wallets
→ **Kairos Wallet** — Nuestra wallet nativa

**Para conectar:**
1. Clic en "Connect Wallet" arriba
2. Elige tu wallet
3. Aprueba la conexión
4. ¡A operar!

💡 **¿No tienes wallet?** Descarga [Kairos Wallet](https://kairos-wallet.netlify.app) — es gratis.

¿Necesitas ayuda para conectar?`
        ],
        related: ['how_to_trade', 'how_to_buy', 'networks']
      },

      contract: {
        keywords: ['contrato','contract','address','direccion','bscscan','token address','smart contract','verificar','verify','cadena','red','network','0x14','chain id'],
        patterns: [/direcci[oó]n\s+(del\s+)?(contrato|token)/i, /contract\s+address/i, /verificar\s+(el\s+)?contrato/i],
        answers: [
          `**KAIROS en 4 blockchains** 📋

🔸 **BSC:** \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`
   → [Ver en BSCScan](https://bscscan.com/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3)

🔸 **Base:** \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`

🔸 **Arbitrum:** \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`

🔸 **Polygon:** \`0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9\`

Misma dirección en BSC, Base y Arbitrum. Solo Polygon es diferente.

¿Necesitas añadirlo a tu wallet?`
        ],
        related: ['networks', 'security']
      },

      networks: {
        keywords: ['redes','networks','chain','cadena','bsc','base','arbitrum','polygon','cambiar red','switch network','multi chain','multichain','bnb chain','ethereum','layer 2','l2','gas','que red usar'],
        patterns: [/qu[eé]\s+(redes?|chains?|cadenas?)/i, /en\s+qu[eé]\s+(red|chain|blockchain)/i, /(cambiar|switch|elegir)\s+(de\s+)?(red|chain)/i, /cu[aá]l\s+red/i, /mejor\s+red/i],
        answers: [
          `**Redes soportadas** 🌐

🔸 **BSC** — La principal
   Gas: ~$0.10 · Chain ID: 56

🔸 **Base** — L2 de Ethereum, barata
   Gas: ~$0.01 · Chain ID: 8453

🔸 **Arbitrum** — L2, rápida
   Gas: ~$0.02 · Chain ID: 42161

🔸 **Polygon** — Sidechain
   Gas: ~$0.01 · Chain ID: 137

💡 **Recomendación:** Si eres nuevo, usa **BSC**. Mayor liquidez para KAIROS.

¿Necesitas ayuda para añadir una red?`
        ],
        related: ['contract', 'wallet', 'fees']
      },

      founder: {
        keywords: ['fundador','founder','mario','isaac','quien creo','who created','team','equipo','creador','dueno','owner','ceo','kaizen','empresa','company','quienes son'],
        patterns: [/qui[eé]n(es)?\s+(cre[oó]|fund[oó]|est[aá]|son|hay)/i, /who\s+(created|founded|owns)/i, /de\s+qui[eé]n\s+es/i],
        answers: [
          `**Kairos 777 Inc** fue fundada por **Kaizen LLC** 🏛️

→ Empresa registrada en **Florida, Estados Unidos**
→ Fundada por **Mario Isaac**
→ Filosofía: *"In God We Trust"*

**Nuestra misión:** Democratizar el acceso a finanzas estables y trading algorítmico.

**Valores:**
✅ Transparencia total
✅ Seguridad primero
✅ Innovación constante
✅ Accesibilidad para todos

¿Te gustaría conocer más sobre nuestros productos?`
        ],
        related: ['what_is', 'security', 'ecosystem']
      },

      risk: {
        keywords: ['riesgo','risk','liquidacion','liquidation','perder','lose','perdida','loss','peligro','danger','cuidado','proteger','proteccion'],
        patterns: [/puedo\s+perder/i, /cu[aá]nto\s+puedo\s+perder/i, /c[oó]mo\s+(protejo|me\s+protejo|evito)/i, /me\s+van?\s+a\s+liquidar/i],
        answers: [
          `**Gestión de Riesgo** — Lo más importante ⚠️

🔸 **Regla #1: Stop-Loss SIEMPRE**
   Configúralo antes de abrir la posición.

🔸 **Regla #2: No arriesgues más del 2%**
   De tu capital total por operación.

🔸 **Regla #3: No "vengarte" del mercado**
   Perder es normal. No operes por enojo.

🔸 **Regla #4: Empieza con poco apalancamiento**
   2x-5x hasta que tengas experiencia.

🔸 **Regla #5: Solo opera dinero que puedas perder**

📊 Los mejores traders pierden el 40-50% de sus operaciones. La clave es que las ganancias sean mayores que las pérdidas.

¿Quieres aprender a configurar stop-loss?`
        ],
        related: ['stop_loss', 'leverage', 'how_to_trade']
      },

      reserves: {
        keywords: ['reservas','reserves','respaldo','backing','auditoria','audit','proof','prueba','colateral','collateral','backed','transparencia'],
        patterns: [/est[aá]\s+respaldado/i, /tienen?\s+reservas?/i, /d[oó]nde\s+(est[aá]n?\s+)?(las\s+)?reservas/i, /proof\s+of\s+reserves?/i],
        answers: [
          `**Reservas 100% verificables** 🏦

Cada KAIROS está respaldado 1:1 por:
→ **USDT** (Tether)
→ **USDC** (Circle)
→ **BUSD** (Binance USD)

📊 **Verificar en tiempo real:**
→ [kairos-777.com/reserves](https://kairos-777.com/reserves.html)

Cualquiera puede verificar las reservas en cualquier momento — completamente transparente.

¿Tienes preguntas sobre el mecanismo de respaldo?`
        ],
        related: ['price', 'security', 'stablecoin']
      },

      stablecoin: {
        keywords: ['stablecoin','estable','stable','dolar','dollar','usd','moneda estable','peg','paridad','usdt','usdc','tether'],
        patterns: [/qu[eé]\s+es\s+(una?\s+)?stablecoin/i, /diferencia.*usdt/i, /vs\s+(usdt|usdc)/i],
        answers: [
          `**KAIROS es una stablecoin** 💡 — Siempre vale $1 USD.

**KAIROS vs USDT vs USDC:**
→ Integrado nativamente en nuestro ecosistema
→ Ventajas en comisiones como colateral
→ Respaldo verificable en tiempo real
→ En 4 blockchains

Cuando operas aquí con KAIROS:
✅ Tu colateral no pierde valor
✅ Cálculos de ganancia exactos
✅ Comisiones más bajas

¿Te gustaría comprarlo?`
        ],
        related: ['price', 'how_to_buy', 'reserves']
      },

      whitepaper: {
        keywords: ['whitepaper','white paper','documento','paper','tecnico','documentacion','roadmap','hoja de ruta','plan'],
        patterns: [/white\s*paper/i, /documentaci[oó]n\s+t[eé]cnica/i, /hoja\s+de\s+ruta/i, /road\s*map/i],
        answers: [
          `**Whitepaper de KairosCoin** 📄

Cubre:
→ Arquitectura técnica del token ERC-20
→ Mecanismo de estabilidad y respaldo
→ Gobernanza y transparencia
→ Hoja de ruta del ecosistema

📖 Léelo aquí: [kairos-777.com/whitepaper](https://kairos-777.com/whitepaper.html)

Si tienes preguntas sobre algo del whitepaper, ¡pregúntame!`
        ],
        related: ['what_is', 'security']
      },

      help: {
        keywords: ['ayuda','help','soporte','support','contacto','contact','problema','problem','error','issue','no funciona','not working','bug','roto','fallo','necesito ayuda'],
        patterns: [/necesito\s+ayuda/i, /tengo\s+(un\s+)?(problema|error|issue)/i, /no\s+(me\s+)?(funciona|carga|abre|conecta|deja)/i, /c[oó]mo\s+contacto/i],
        answers: [
          `**¡Estoy aquí para ayudarte!** 🤝

**Temas que domino:**
💰 Cómo comprar KAIROS
📊 Trading y apalancamiento
🤖 Bots de AI
🔗 Conexión de wallet
🌐 Redes y contratos
🛡️ Seguridad
💵 Comisiones

Escribe tu duda y te ayudo al instante.

Soporte humano: 📧 **info@kairos-777.com**

¿Por dónde empezamos?`,
          `¡Claro! Dime qué necesitas 😊

Puedo ayudarte con trading, bots, wallet, compra de KAIROS, redes, seguridad, y más.

Solo escribe tu pregunta con tus propias palabras.

Para soporte directo: **info@kairos-777.com**`
        ],
        related: ['how_to_trade', 'how_to_buy', 'wallet']
      },

      telegram: {
        keywords: ['telegram','comunidad','community','grupo','group','discord','social','redes sociales','twitter','x','seguir','follow','chat','canal'],
        patterns: [/tienen\s+(telegram|discord|grupo|comunidad)/i, /d[oó]nde\s+(los\s+)?sigo/i, /redes\s+sociales/i],
        answers: [
          `**Conéctate con Kairos** 📱

Puedes vincular tu Telegram desde Configuración para recibir:
→ 📊 Alertas de operaciones
→ 🤖 Reportes de bots
→ 📈 Resúmenes diarios

Ve a **Configuración → Telegram** para vincularlo.

Más info: 🌐 [kairos-777.com](https://kairos-777.com) · 📧 info@kairos-777.com

¿Te ayudo a configurar las alertas?`
        ],
        related: ['ecosystem', 'help']
      },

      stop_loss: {
        keywords: ['stop loss','stop-loss','stoploss','take profit','take-profit','tp','sl','orden limite','limit order','orden stop'],
        patterns: [/stop\s*loss/i, /take\s*profit/i, /c[oó]mo\s+(pongo|configuro|uso)\s+(un\s+)?(stop|sl|tp)/i],
        answers: [
          `**Stop-Loss y Take-Profit** 🎯

**Stop-Loss (SL):** Cierra automáticamente si pierdes cierto %
→ Ejemplo: Compras BTC, SL en -5%
→ Si BTC baja 5%, se cierra. Limitas tu pérdida.

**Take-Profit (TP):** Cierra automáticamente cuando ganas
→ Ejemplo: TP en +10%
→ Si BTC sube 10%, aseguras ganancia.

💡 **Recomendaciones:**
→ **Ratio mínimo 1:2** — Arriesga 5%, busca ganar 10%+
→ **Siempre pon SL** antes de abrir posición
→ **Mueve el SL a breakeven** cuando estés en ganancia

Es la herramienta más importante. ¿Necesitas más detalle?`
        ],
        related: ['risk', 'leverage', 'how_to_trade']
      },

      deposit_withdraw: {
        keywords: ['retirar','withdraw','retiro','withdrawal','sacar','extraer','cashout','cash out','mover fondos','sacar dinero'],
        patterns: [/c[oó]mo\s+(retiro|saco|extraigo|muevo)/i, /quiero\s+(retirar|sacar)/i, /puedo\s+retirar/i, /sacar\s+(mi\s+)?dinero/i],
        answers: [
          `**Retiros** 💸

Tus fondos están en TU wallet — no necesitas permiso:

1️⃣ **A otra wallet:** Envía desde tu wallet conectada
2️⃣ **A fiat (USD):** Intercambia KAIROS por USDT → envía a exchange → retira a banco

💡 Kairos 777 es **non-custodial**. Tus fondos están siempre en tu wallet. No los custodiamos.

¿Te ayudo con algo más?`
        ],
        related: ['wallet', 'networks', 'fees']
      }
    },

    // ── Follow-up responses ──
    followUp: {
      yes: ["¡Perfecto! Aquí va más información:", "¡Genial! Te cuento más:", "¡Claro que sí!"],
      no: ["No hay problema 😊 ¿Hay algo más en lo que te pueda ayudar?", "Entendido. ¿Tienes otra pregunta?", "Ok. ¿Algo más que quieras saber?"],
      more: ["¡Claro! Te amplío:", "¡Con gusto! Más detalle:", "¡Por supuesto!"]
    },

    fallbacks: [
      `Hmm, no encontré una respuesta exacta para eso 🤔\n\nPuedo ayudarte con:\n→ **Trading** — Cómo operar, pares, apalancamiento\n→ **Bots AI** — Trading automatizado 24/7\n→ **KAIROS** — Precio, compra, redes\n→ **Seguridad** — Tu protección\n\n¿Puedes reformular tu pregunta?`,
      `No estoy seguro de entender, pero soy bueno en:\n\n📊 Trading y pares\n🤖 Bots de AI\n💰 Comprar KAIROS\n🔐 Seguridad\n💳 Comisiones\n🌐 Redes y contratos\n\nEscríbelo de otra forma y te ayudo 😊`,
      `Esa me la puso difícil 😅 Intenta preguntarme sobre:\n\n→ Cómo empezar a operar\n→ Qué pares están disponibles\n→ Cómo funcionan los bots\n→ Cómo comprar KAIROS\n→ Seguridad\n\nO contacta: **info@kairos-777.com**`
    ],

    quickReplies: [
      { label: '¿Cómo empiezo?', topic: 'how_to_trade' },
      { label: 'Pares disponibles', topic: 'pairs' },
      { label: 'Bots de AI', topic: 'bots' },
      { label: '¿Es seguro?', topic: 'security' },
    ]
  };

  // ── Intent Engine ──
  function scoreTopic(inputNorm, inputWords, topic) {
    let score = 0;
    for (const kw of topic.keywords) {
      const kwNorm = norm(kw);
      if (inputNorm.includes(kwNorm)) {
        score += 8 + kwNorm.split(' ').length * 3;
      }
    }
    const kwWords = new Set();
    for (const kw of topic.keywords) {
      for (const w of norm(kw).split(' ')) { if (w.length >= 3) kwWords.add(w); }
    }
    for (const iw of inputWords) {
      if (iw.length < 3) continue;
      for (const kw of kwWords) {
        const sim = wordSimilar(iw, kw);
        if (sim >= 0.85) score += 4;
        else if (sim >= 0.7) score += 2;
      }
    }
    if (topic.patterns) {
      for (const pat of topic.patterns) { if (pat.test(inputNorm)) score += 15; }
    }
    return score;
  }

  function classifyIntent(input) {
    const inputNorm = norm(input);
    const inputWords = inputNorm.split(' ').filter(w => w.length >= 2);
    const affirmatives = ['si','sii','yes','claro','dale','ok','okey','okay','va','vale','venga','por favor','porfa','please','aja','simon','afirmativo','correcto','exacto','eso'];
    const negatives = ['no','nah','nel','nop','nope','paso','tampoco','nada'];
    const moreWords = ['mas','more','cuentame','dime','explica','explicame','detalle','detalles','profundiza','amplia','sigue','continua','elabora'];
    if (CTX.lastTopic && inputWords.length <= 4) {
      if (affirmatives.some(a => inputNorm === a || inputNorm === a + ' por favor')) return { type: 'followup_yes' };
      if (negatives.some(n => inputNorm === n || inputNorm.startsWith(n + ' '))) return { type: 'followup_no' };
      if (moreWords.some(m => inputNorm.includes(m))) return { type: 'followup_more' };
    }
    let best = null, bestScore = 0;
    for (const [key, topic] of Object.entries(KB.topics)) {
      const s = scoreTopic(inputNorm, inputWords, topic);
      if (s > bestScore) { bestScore = s; best = key; }
    }
    if (bestScore >= 6) return { type: 'topic', topic: best, score: bestScore };
    return { type: 'unknown' };
  }

  function getResponse(input) {
    const inputNorm = norm(input);
    const greetings = ['hola','hello','hi','hey','buenas','saludos','good morning','good afternoon','que tal','buenos dias','buenas tardes','buenas noches','sup','yo','ey','epa','alo','ola','wena'];
    if (greetings.some(g => inputNorm === g || inputNorm.startsWith(g + ' '))) {
      CTX.turnCount++;
      return { text: CTX.turnCount > 1 ? "¡Hola de nuevo! 😊 ¿En qué más te puedo ayudar?" : pickRandom(KB.greetings), showQuickReplies: true };
    }
    const thanks = ['gracias','thanks','thank you','thx','ty','muchas gracias','mil gracias'];
    if (thanks.some(t => inputNorm.includes(norm(t)))) {
      return { text: `¡Con mucho gusto! 😊 Si te surge otra duda, aquí estaré 24/7.\n\n📊 **Kairos 777** — *In God We Trust*`, showQuickReplies: false };
    }
    const byes = ['adios','bye','chao','hasta luego','see you','nos vemos','me voy'];
    if (byes.some(b => inputNorm.includes(norm(b)))) {
      return { text: `¡Hasta pronto! 👋 ¡Que tus trades sean verdes! 📈\n\n📊 **Kairos 777** — [kairos-trade.netlify.app](https://kairos-trade.netlify.app)`, showQuickReplies: false };
    }
    const intent = classifyIntent(input);
    if (intent.type === 'followup_yes' && CTX.lastTopic) {
      const topic = KB.topics[CTX.lastTopic];
      if (topic && topic.related && topic.related.length > 0) {
        const next = KB.topics[topic.related[0]];
        if (next) { CTX.lastTopic = topic.related[0]; return { text: pickRandom(KB.followUp.yes) + '\n\n' + pickRandom(next.answers), showQuickReplies: false, related: next.related }; }
      }
      return { text: pickRandom(KB.followUp.yes) + "\n\n¿Sobre qué tema te gustaría saber más?", showQuickReplies: true };
    }
    if (intent.type === 'followup_no') { CTX.lastTopic = null; return { text: pickRandom(KB.followUp.no), showQuickReplies: true }; }
    if (intent.type === 'followup_more' && CTX.lastTopic) {
      const topic = KB.topics[CTX.lastTopic];
      if (topic) { const alt = topic.answers.length > 1 ? topic.answers[topic.answers.length - 1] : topic.answers[0]; return { text: pickRandom(KB.followUp.more) + '\n\n' + alt, showQuickReplies: false, related: topic.related }; }
    }
    if (intent.type === 'topic') {
      CTX.lastTopic = intent.topic; CTX.turnCount++;
      const topic = KB.topics[intent.topic];
      return { text: pickRandom(topic.answers), showQuickReplies: false, related: topic.related };
    }
    CTX.lastTopic = null;
    return { text: pickRandom(KB.fallbacks), showQuickReplies: true };
  }

  // ── Markdown to HTML ──
  function md(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(96,165,250,0.15);padding:2px 6px;border-radius:4px;font-size:0.85em;word-break:break-all;">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#60A5FA;text-decoration:underline;">$1</a>')
      .replace(/→/g, '<span style="color:#60A5FA;">→</span>')
      .replace(/\n/g, '<br>');
  }

  // ── Create Widget ──
  function createWidget() {
    const style = document.createElement('style');
    style.textContent = `
      #kairos-agent-btn{position:fixed;bottom:24px;right:24px;z-index:10000;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#60A5FA 0%,#2563EB 100%);border:none;cursor:pointer;box-shadow:0 4px 20px rgba(96,165,250,.4),0 0 40px rgba(96,165,250,.1);display:flex;align-items:center;justify-content:center;transition:all .3s ease;animation:kairos-pulse 2s ease-in-out infinite}
      #kairos-agent-btn:hover{transform:scale(1.1);box-shadow:0 6px 30px rgba(96,165,250,.6)}
      #kairos-agent-btn svg{width:28px;height:28px;fill:#fff}
      #kairos-agent-btn.open svg.chat-icon{display:none}#kairos-agent-btn.open svg.close-icon{display:block}
      #kairos-agent-btn:not(.open) svg.chat-icon{display:block}#kairos-agent-btn:not(.open) svg.close-icon{display:none}
      @keyframes kairos-pulse{0%,100%{box-shadow:0 4px 20px rgba(96,165,250,.4),0 0 40px rgba(96,165,250,.1)}50%{box-shadow:0 4px 30px rgba(96,165,250,.6),0 0 60px rgba(96,165,250,.2)}}
      #kairos-agent-badge{position:absolute;top:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:#EF4444;border:2px solid #0B0E11;font-size:10px;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;transition:all .3s}
      #kairos-agent-badge.hidden{transform:scale(0)}
      #kairos-agent-panel{position:fixed;bottom:96px;right:24px;z-index:10000;width:380px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 140px);border-radius:16px;overflow:hidden;background:#0B0E11;border:1px solid rgba(96,165,250,.2);box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 40px rgba(96,165,250,.05);display:flex;flex-direction:column;transform:scale(.8) translateY(20px);opacity:0;pointer-events:none;transition:all .3s cubic-bezier(.34,1.56,.64,1);transform-origin:bottom right}
      #kairos-agent-panel.open{transform:scale(1) translateY(0);opacity:1;pointer-events:auto}
      .ka-header{padding:16px 20px;background:linear-gradient(135deg,rgba(96,165,250,.12) 0%,rgba(11,14,17,.95) 100%);border-bottom:1px solid rgba(96,165,250,.15);display:flex;align-items:center;gap:12px}
      .ka-header-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#60A5FA,#2563EB);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
      .ka-header-info h3{font-family:'Inter',sans-serif;font-size:15px;font-weight:700;color:#fff;margin:0}
      .ka-header-info p{font-size:12px;color:#60A5FA;margin:0;display:flex;align-items:center;gap:4px}
      .ka-header-info p::before{content:'';width:6px;height:6px;border-radius:50%;background:#10B981;display:inline-block}
      .ka-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin;scrollbar-color:rgba(96,165,250,.3) transparent}
      .ka-messages::-webkit-scrollbar{width:4px}.ka-messages::-webkit-scrollbar-thumb{background:rgba(96,165,250,.3);border-radius:2px}
      .ka-msg{max-width:85%;padding:12px 16px;border-radius:16px;font-size:13.5px;line-height:1.6;animation:ka-fadeIn .3s ease}
      .ka-msg.bot{align-self:flex-start;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-bottom-left-radius:4px;color:#E5E7EB}
      .ka-msg.user{align-self:flex-end;background:linear-gradient(135deg,rgba(96,165,250,.2),rgba(37,99,235,.15));border:1px solid rgba(96,165,250,.3);border-bottom-right-radius:4px;color:#fff}
      .ka-msg strong{color:#60A5FA}.ka-msg code{font-size:.82em}
      @keyframes ka-fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      .ka-quick-replies{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      .ka-quick-btn{padding:6px 14px;border-radius:20px;font-size:12px;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.3);color:#60A5FA;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif;white-space:nowrap}
      .ka-quick-btn:hover{background:rgba(96,165,250,.25);transform:translateY(-1px)}
      .ka-input-area{padding:12px 16px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;align-items:center;background:rgba(0,0,0,.3)}
      .ka-input{flex:1;padding:10px 14px;border-radius:24px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:13.5px;outline:none;font-family:'Inter',sans-serif;transition:border-color .3s}
      .ka-input::placeholder{color:#6B7280}.ka-input:focus{border-color:rgba(96,165,250,.4)}
      .ka-send{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#60A5FA,#2563EB);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
      .ka-send:hover{transform:scale(1.08)}.ka-send:disabled{opacity:.4;cursor:default;transform:none}.ka-send svg{width:16px;height:16px;fill:#fff}
      .ka-typing{display:flex;align-items:center;gap:4px;padding:12px 16px;align-self:flex-start}
      .ka-typing span{width:6px;height:6px;border-radius:50%;background:#60A5FA;animation:ka-bounce 1.4s ease-in-out infinite}
      .ka-typing span:nth-child(2){animation-delay:.2s}.ka-typing span:nth-child(3){animation-delay:.4s}
      @keyframes ka-bounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}
      .ka-powered{text-align:center;padding:4px;font-size:10px;color:#4B5563;background:rgba(0,0,0,.4)}
      @media(max-width:480px){#kairos-agent-panel{right:8px;bottom:88px;width:calc(100vw - 16px);height:calc(100vh - 110px);max-height:calc(100vh - 110px);border-radius:12px}#kairos-agent-btn{bottom:16px;right:16px}}
    `;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'kairos-agent-btn';
    btn.setAttribute('aria-label', 'Abrir chat de Kairos 777');
    btn.innerHTML = `<svg class="chat-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg><svg class="close-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg><div id="kairos-agent-badge">1</div>`;
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'kairos-agent-panel';
    panel.innerHTML = `<div class="ka-header"><div class="ka-header-avatar">📊</div><div class="ka-header-info"><h3>Kairos 777 Agent</h3><p>Online — Tu asistente de trading</p></div></div><div class="ka-messages" id="ka-messages"></div><div class="ka-input-area"><input class="ka-input" id="ka-input" type="text" placeholder="Pregúntame lo que quieras..." autocomplete="off"/><button class="ka-send" id="ka-send" aria-label="Enviar"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></div><div class="ka-powered">Powered by Kairos 777 AI ✦</div>`;
    document.body.appendChild(panel);

    let isOpen = false, hasOpened = false;
    const messagesEl = document.getElementById('ka-messages');
    const inputEl = document.getElementById('ka-input');
    const sendBtn = document.getElementById('ka-send');
    const badge = document.getElementById('kairos-agent-badge');
    const topicLabels = { what_is:'¿Qué es Kairos?', how_to_trade:'¿Cómo operar?', pairs:'Ver pares', leverage:'Apalancamiento', bots:'Bots AI', fees:'Comisiones', how_to_buy:'Comprar KAIROS', ecosystem:'Ecosistema', price:'Precio', security:'Seguridad', wallet:'Wallet', contract:'Contratos', networks:'Redes', founder:'Equipo', risk:'Gestión de riesgo', reserves:'Reservas', stablecoin:'Stablecoin', whitepaper:'Whitepaper', help:'Ayuda', telegram:'Telegram', stop_loss:'Stop-Loss', deposit_withdraw:'Retiros' };

    function addMessage(text, type, showQuickReplies, relatedTopics) {
      const div = document.createElement('div');
      div.className = `ka-msg ${type}`;
      div.innerHTML = md(text);
      messagesEl.appendChild(div);
      if (showQuickReplies) {
        const qr = document.createElement('div'); qr.className = 'ka-quick-replies';
        KB.quickReplies.forEach(r => { const b = document.createElement('button'); b.className = 'ka-quick-btn'; b.textContent = r.label; b.onclick = () => { qr.remove(); handleUserInput(r.label); }; qr.appendChild(b); });
        messagesEl.appendChild(qr);
      } else if (relatedTopics && relatedTopics.length > 0) {
        const qr = document.createElement('div'); qr.className = 'ka-quick-replies';
        relatedTopics.slice(0, 3).forEach(tk => { if (!KB.topics[tk]) return; const b = document.createElement('button'); b.className = 'ka-quick-btn'; b.textContent = topicLabels[tk] || tk; b.onclick = () => { qr.remove(); handleUserInput(topicLabels[tk] || tk); }; qr.appendChild(b); });
        messagesEl.appendChild(qr);
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function showTyping() { const d = document.createElement('div'); d.className = 'ka-typing'; d.id = 'ka-typing'; d.innerHTML = '<span></span><span></span><span></span>'; messagesEl.appendChild(d); messagesEl.scrollTop = messagesEl.scrollHeight; }
    function hideTyping() { const e = document.getElementById('ka-typing'); if (e) e.remove(); }

    function handleUserInput(text) {
      if (!text.trim()) return;
      addMessage(text, 'user', false);
      inputEl.value = ''; sendBtn.disabled = true; showTyping();
      setTimeout(() => { hideTyping(); const r = getResponse(text); addMessage(r.text, 'bot', r.showQuickReplies, r.related); sendBtn.disabled = false; inputEl.focus(); }, 400 + Math.random() * 600);
    }

    btn.addEventListener('click', () => {
      isOpen = !isOpen; panel.classList.toggle('open', isOpen); btn.classList.toggle('open', isOpen);
      if (isOpen && !hasOpened) { hasOpened = true; badge.classList.add('hidden'); setTimeout(() => addMessage(pickRandom(KB.greetings), 'bot', true), 400); }
      if (isOpen) setTimeout(() => inputEl.focus(), 400);
    });
    sendBtn.addEventListener('click', () => handleUserInput(inputEl.value));
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUserInput(inputEl.value); } });
    if (!sessionStorage.getItem('kairos-trade-agent-seen')) {
      setTimeout(() => { if (!isOpen) { btn.style.animation = 'none'; btn.offsetHeight; btn.style.animation = 'kairos-pulse 0.5s ease-in-out 3'; setTimeout(() => { btn.style.animation = 'kairos-pulse 2s ease-in-out infinite'; }, 1500); } }, 8000);
      sessionStorage.setItem('kairos-trade-agent-seen', '1');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createWidget);
  else createWidget();
})();
