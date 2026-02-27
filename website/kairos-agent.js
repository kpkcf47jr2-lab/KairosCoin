/* ═══════════════════════════════════════════════════════════════
   KAIROS 777 — AI Agent Widget v2.0 (Website Edition)
   Smart conversational agent with fuzzy matching, context
   memory, response variations, and natural conversation flow.
   "In God We Trust"
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const CTX = { lastTopic: null, history: [], turnCount: 0 };

  function norm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿¡?!.,;:'"()\-]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function levenshtein(a, b) {
    if (a.length === 0) return b.length; if (b.length === 0) return a.length;
    const m = []; for (let i = 0; i <= b.length; i++) m[i] = [i]; for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) for (let j = 1; j <= a.length; j++) m[i][j] = b[i-1]===a[j-1]?m[i-1][j-1]:Math.min(m[i-1][j-1]+1,m[i][j-1]+1,m[i-1][j]+1);
    return m[b.length][a.length];
  }
  function wordSimilar(a, b) {
    if (a===b) return 1; if (a.length<3||b.length<3) return a===b?1:0;
    if (a.includes(b)||b.includes(a)) return 0.9;
    const d=levenshtein(a,b), mx=Math.max(a.length,b.length);
    if (d<=1&&mx>=4) return 0.85; if (d<=2&&mx>=6) return 0.7; return 0;
  }
  function pickRandom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

  const KB = {
    greetings: [
      "¡Hola! 😊 Soy el asistente de **Kairos 777**. ¿En qué te puedo ayudar?",
      "¡Bienvenido! ✨ Soy el agente AI de **Kairos 777**. Pregúntame sobre nuestro ecosistema, cómo comprar KAIROS, trading, o lo que necesites.",
      "¡Hola! 👋 Soy tu guía en **Kairos 777**. ¿Quieres saber qué es KairosCoin, cómo comprarlo, o sobre nuestras plataformas?"
    ],

    topics: {
      what_is: {
        keywords: ['que es kairos','kairos','about','explicar','acerca','cuentame','que es esto','que hacen','que ofrece','informacion','conocer','para que sirve','proyecto'],
        patterns: [/qu[eé]\s+(es|son|hace|ofrece)\s+kairos/i, /tell\s+me\s+about/i, /what\s+is/i, /para\s+qu[eé]\s+sirve/i, /cu[eé]ntame/i],
        answers: [
          `**Kairos 777** es un ecosistema financiero completo 🏛️

🔸 **KairosCoin (KAIROS)** — Stablecoin 1:1 con USD
🔸 **Kairos Wallet** — Billetera multi-chain non-custodial
🔸 **Kairos 777** — Trading con 33+ pares y hasta 150x
🔸 **Reservas Transparentes** — 100% verificable en tiempo real

Disponible en **4 blockchains**: BSC, Base, Arbitrum y Polygon.

Creado por **Kaizen LLC** en Florida, EE.UU.

¿Qué te gustaría saber más?`,
          `**KairosCoin (KAIROS)** 🪙

Es una stablecoin: **1 KAIROS = 1 USD siempre**.

Respaldada 1:1 por reservas en USDT + USDC + BUSD, verificables en tiempo real.

Parte de un ecosistema completo: wallet, trading, y más.

¿Quieres saber cómo comprar?`
        ],
        related: ['how_to_buy', 'ecosystem', 'security']
      },

      how_to_buy: {
        keywords: ['comprar','buy','adquirir','purchase','como compro','donde compro','obtener','get kairos','quiero comprar','tarjeta','card','visa','mastercard','fiat','meter dinero','cargar','recargar','apple pay','credito','debito'],
        patterns: [/c[oó]mo\s+(compro|comprar|adquiero|obtengo|deposito|cargo)/i, /d[oó]nde\s+(compro|comprar)/i, /quiero\s+(comprar|depositar|meter|agregar)/i, /(puedo|acepta)\s+(tarjeta|visa|mastercard)/i, /how\s+to\s+buy/i],
        answers: [
          `**¿Cómo comprar KAIROS?** 💰

**Opción 1: Con tarjeta** (lo más fácil) 💳
→ Ve a [kairos-777.com/buy](https://kairos-777.com/buy.html)
→ Paga con **Visa, Mastercard o Apple Pay**
→ KAIROS llega a tu wallet automáticamente
→ Powered by Transak — seguro y regulado

**Opción 2: Desde otro wallet**
→ Recibe KAIROS directamente de alguien
→ O intercambia USDT/USDC por KAIROS

**Opción 3: Swap en DEX**
→ PancakeSwap en BSC
→ Contrato: \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`

¿Te guío paso a paso?`,
          `Lo más rápido:

1️⃣ Ve a nuestra [página de compra](https://kairos-777.com/buy.html)
2️⃣ Conecta tu wallet (MetaMask, Trust Wallet, etc.)
3️⃣ Paga con tarjeta — Visa, Mastercard, Apple Pay
4️⃣ KAIROS aparece en tu wallet en segundos

Aceptamos 20+ criptomonedas y fiat en 100+ países.

¿Algo más?`
        ],
        related: ['price', 'wallet', 'contract']
      },

      price: {
        keywords: ['precio','price','valor','value','cuanto vale','cotizacion','rate','cuanto es','cuanto esta','a cuanto','se mueve','volatilidad'],
        patterns: [/cu[aá]nto\s+(vale|cuesta|es|est[aá])/i, /(precio|valor)\s+(de\s+)?kairos/i, /a\s+cu[aá]nto/i, /how\s+much/i],
        answers: [
          `**1 KAIROS = 1 USD** — Siempre 💵

KAIROS es una **stablecoin** — su precio está fijado al dólar.

**No sube ni baja** como Bitcoin o Ethereum. Eso lo hace perfecto para:

✅ Ahorrar en dólares digitales
✅ Enviar remesas sin perder valor
✅ Base estable para trading
✅ Pagos internacionales
✅ Protección contra inflación local

¿Te interesa comprar?`
        ],
        related: ['how_to_buy', 'stablecoin', 'reserves']
      },

      stablecoin: {
        keywords: ['stablecoin','estable','stable','dolar','dollar','usd','moneda estable','peg','paridad','usdt','usdc','busd','diferencia','vs'],
        patterns: [/qu[eé]\s+es\s+(una?\s+)?stablecoin/i, /diferencia.*usdt/i, /vs\s+(usdt|usdc)/i, /por\s+qu[eé]\s+(no\s+)?(usdt|usdc)/i, /ventaja/i],
        answers: [
          `**¿Qué es una Stablecoin?** 💡

Una stablecoin mantiene su valor fijo a un activo real (en este caso, el USD).

**KAIROS vs otras stablecoins:**

| | KAIROS | USDT | USDC |
|---|---|---|---|
| Paridad | 1:1 USD ✅ | 1:1 USD | 1:1 USD |
| Ecosistema | Trading + Wallet + Reservas ✅ | Solo token | Solo token |
| Transparencia | Reservas en tiempo real ✅ | Informes periódicos | Informes mensuales |
| Redes | BSC, Base, Arb, Polygon ✅ | Multi-chain | Multi-chain |

¿Quieres saber más?`
        ],
        related: ['price', 'reserves', 'what_is']
      },

      security: {
        keywords: ['seguro','safe','seguridad','security','confiable','trust','auditado','audit','scam','estafa','legitimo','hack','proteger','proteccion','fraude','rug','rugpull','rug pull','lost','lost money'],
        patterns: [/es\s+(seguro|confiable|leg[ií]timo)/i, /(puedo\s+)?confiar/i, /me\s+pueden\s+(robar|estafar)/i, /es\s+(una?\s+)?(estafa|scam|rug)/i, /is\s+it\s+safe/i, /auditor[ií]a/i],
        answers: [
          `**¿Es seguro Kairos 777?** 🛡️

**Empresa legal:**
→ **Kaizen LLC** — Registrada en Florida, EE.UU.
→ Fundada por **Mario Isaac**
→ Cumplimiento regulatorio activo

**Smart contracts seguros:**
→ OpenZeppelin v5.4 (estándar de la industria)
→ Verificados en BSCScan, BaseScan, Arbiscan, PolygonScan

**Reservas 100%:**
→ Cada KAIROS respaldado 1:1 por stablecoins
→ [Verificar reservas](https://kairos-777.com/reserves.html)

**Wallet non-custodial:**
→ NUNCA accedemos a los fondos de los usuarios
→ Tus llaves, tus fondos

¿Más preguntas sobre seguridad?`,
          `Absolutamente seguro ✅

→ Empresa registrada en EE.UU. (Florida)
→ Contratos verificados en blockchain
→ Reservas 100% transparentes
→ OpenZeppelin v5.4
→ Wallet non-custodial

Verificalo tú mismo: [BSCScan](https://bscscan.com/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3)

¿Algo más?`
        ],
        related: ['reserves', 'contract', 'founder']
      },

      reserves: {
        keywords: ['reservas','reserves','respaldo','backing','auditoria','audit','proof','prueba','colateral','collateral','como se respalda','que respalda'],
        patterns: [/est[aá]\s+respaldad/i, /tienen?\s+reservas?/i, /proof\s+of\s+reserves?/i, /c[oó]mo\s+se\s+respalda/i, /qu[eé]\s+respalda/i],
        answers: [
          `**Reservas de KairosCoin** 🏦

Cada KAIROS está respaldado **1:1** por:
→ **USDT** (Tether USD)
→ **USDC** (USD Coin)
→ **BUSD** (Binance USD)

📊 **Verificación en tiempo real:**
→ [kairos-777.com/reserves](https://kairos-777.com/reserves.html)
→ Datos directamente de blockchain
→ Sin intermediarios

Cualquier persona puede auditar nuestras reservas 24/7.

¿Quieres verlas ahora?`
        ],
        related: ['security', 'price', 'stablecoin']
      },

      wallet: {
        keywords: ['wallet','billetera','monedero','kairos wallet','app wallet','descargar wallet','download','aplicacion','app'],
        patterns: [/kairos\s+wallet/i, /descargar\s+(la\s+)?wallet/i, /d[oó]nde\s+(descargo|bajo|est[aá])\s+(la\s+)?wallet/i, /tienen?\s+(app|aplicaci[oó]n|wallet)/i],
        answers: [
          `**Kairos Wallet** — Tu billetera multi-chain 📱

✅ Envía y recibe KAIROS y tokens
✅ Multi-chain: BSC, Base, Arbitrum, Polygon
✅ WalletConnect v2 para dApps
✅ Non-custodial — tús llaves, tus fondos
✅ Interfaz simple y elegante

🔗 [Abrir Kairos Wallet](https://kairos-wallet.netlify.app)

También disponible como app nativa para iOS y Android.

¿Necesitas ayuda para empezar?`
        ],
        related: ['how_to_buy', 'security', 'trade']
      },

      trade: {
        keywords: ['trade','trading','operar','bots','bot','invertir','invest','exchange','intercambiar','swap','apalancamiento','leverage','kairos 777','plataforma','platform'],
        patterns: [/quiero\s+(operar|invertir|hacer\s+trading)/i, /c[oó]mo\s+opero/i, /d[oó]nde\s+opero/i, /(kairos\s+)?777/i, /plataforma\s+(de\s+)?trading/i, /how\s+to\s+trade/i],
        answers: [
          `**Kairos 777 — Plataforma de Trading** 📊

🔸 **33+ pares** de criptomonedas (BTC, ETH, SOL, y más)
🔸 **Hasta 150x** de apalancamiento
🔸 **Bots algorítmicos** con inteligencia artificial
🔸 **Gráficos** en tiempo real con TradingView
🔸 KAIROS como colateral estable

📊 [Ir a Kairos 777](https://kairos-trade.netlify.app)

También disponible como app nativa para iOS y Android.

⚠️ Aviso: El trading con apalancamiento conlleva riesgo de pérdida.

¿Quieres saber más sobre los bots o los pares?`
        ],
        related: ['how_to_buy', 'ecosystem', 'wallet']
      },

      contract: {
        keywords: ['contrato','contract','address','direccion','bscscan','token address','smart contract','verificar','verify','anadir token','add token','importar','import','0x14'],
        patterns: [/direcci[oó]n\s+(del\s+)?(contrato|token)/i, /contract\s+address/i, /a[nñ]adir\s+(el\s+)?token/i, /importar\s+(el\s+)?token/i, /en\s+qu[eé]\s+(red|chain)/i],
        answers: [
          `**Direcciones del contrato KairosCoin** 📋

**BSC / Base / Arbitrum:**
\`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`

**Polygon:**
\`0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9\`

**Token info:**
→ Símbolo: KAIROS
→ Decimales: 18
→ Estándar: ERC-20

**Verificar:**
→ [BSCScan](https://bscscan.com/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3)
→ [BaseScan](https://basescan.org/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3)
→ [Arbiscan](https://arbiscan.io/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3)
→ [PolygonScan](https://polygonscan.com/token/0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9)

¿Necesitas ayuda para importar el token?`
        ],
        related: ['networks', 'security']
      },

      networks: {
        keywords: ['redes','networks','chain','cadena','bsc','base','arbitrum','polygon','multi chain','bnb chain','que red','cual red','layer 2','cadenas'],
        patterns: [/qu[eé]\s+(redes?|chains?|cadenas?)/i, /en\s+qu[eé]\s+(red|chain)/i, /cu[aá]l\s+red/i, /cu[aá]ntas\s+redes/i],
        answers: [
          `**4 blockchains soportadas** 🌐

🔸 **BSC (BNB Chain)** — Red principal
   Gas bajo (~$0.10) · Mayor liquidez

🔸 **Base** — Layer 2 de Coinbase
   Ultra bajo gas (~$0.01)

🔸 **Arbitrum** — Layer 2 de Ethereum
   Rápido y económico (~$0.02)

🔸 **Polygon** — Sidechain
   Popular y accesible (~$0.01)

💡 **Recomendación:** BSC es la mejor opción para empezar.

¿Quieres saber más sobre alguna red?`
        ],
        related: ['contract', 'how_to_buy']
      },

      ecosystem: {
        keywords: ['ecosistema','productos','servicios','que ofrecen','todo lo que tienen','apps','aplicaciones','completo','suite'],
        patterns: [/qu[eé]\s+(productos|servicios|ofrece)/i, /todo\s+lo\s+que/i, /ecosystem/i, /suite/i],
        answers: [
          `**Ecosistema completo Kairos 777** 🏛️

🪙 **KairosCoin** — Stablecoin 1:1 USD
   → [kairos-777.com](https://kairos-777.com)
   → [Comprar](https://kairos-777.com/buy.html)

📱 **Kairos Wallet** — Billetera multi-chain
   → [kairos-wallet.netlify.app](https://kairos-wallet.netlify.app)

📊 **Kairos 777** — Trading algorítmico
   → 33+ pares · Hasta 150x · Bots AI
   → [kairos-trade.netlify.app](https://kairos-trade.netlify.app)

🏦 **Reservas** — Verificación en tiempo real
   → [kairos-777.com/reserves](https://kairos-777.com/reserves.html)

📄 **Whitepaper**
   → [kairos-777.com/whitepaper](https://kairos-777.com/whitepaper.html)

Todo conectado, todo transparente.

¿Qué producto te interesa?`
        ],
        related: ['what_is', 'trade', 'wallet']
      },

      founder: {
        keywords: ['fundador','founder','mario','isaac','quien creo','team','equipo','creador','dueno','owner','kaizen','empresa','compania','company','llc'],
        patterns: [/qui[eé]n(es)?\s+(cre[oó]|fund[oó]|est[aá]|son|hay\s+detr[aá]s)/i, /de\s+qui[eé]n\s+es/i, /who\s+(created|founded|made)/i],
        answers: [
          `**Kaizen LLC** — El equipo detrás de Kairos 777 🏛️

→ Empresa registrada en **Florida, EE.UU.**
→ Fundada por **Mario Isaac**
→ Filosofía: *"In God We Trust"*

**Misión:** Ofrecer herramientas financieras seguras, transparentes y accesibles para todos.

**Productos:**
→ KairosCoin (stablecoin)
→ Kairos Wallet (billetera)
→ Kairos 777 (trading)

¿Te gustaría conocer más?`
        ],
        related: ['what_is', 'security']
      },

      whitepaper: {
        keywords: ['whitepaper','white paper','documento','paper','tecnico','roadmap','hoja de ruta','plan','futuro','vision'],
        patterns: [/white\s*paper/i, /hoja\s+de\s+ruta/i, /qu[eé]\s+planes/i, /roadmap/i],
        answers: [
          `**Whitepaper de KairosCoin** 📄

Documento técnico completo:
→ Arquitectura y diseño
→ Mecanismo de respaldo 1:1
→ Gobernanza y transparencia
→ Multi-chain deployment
→ Hoja de ruta

📖 [Leer Whitepaper](https://kairos-777.com/whitepaper.html)

¿Hay algo específico del whitepaper que te interese?`
        ],
        related: ['what_is', 'security', 'reserves']
      },

      help: {
        keywords: ['ayuda','help','soporte','support','contacto','contact','problema','problem','error','issue','no funciona','not working','bug','necesito ayuda','email','correo'],
        patterns: [/necesito\s+ayuda/i, /tengo\s+(un\s+)?(problema|error|duda)/i, /no\s+(me\s+)?(funciona|carga|abre|conecta|deja)/i, /c[oó]mo\s+contacto/i, /help\s+me/i],
        answers: [
          `**¡Aquí estoy para ayudarte!** 🤝

Puedo responder sobre:
🪙 Qué es KairosCoin
💰 Cómo comprar KAIROS
📊 Trading en Kairos 777
📱 Kairos Wallet
🌐 Redes soportadas
🛡️ Seguridad y reservas
📋 Contratos y direcciones

Escribe tu pregunta y te ayudo.

📧 Soporte: **info@kairos-777.com**
🌐 Web: [kairos-777.com](https://kairos-777.com)`,
          `¡Claro! ¿En qué te puedo ayudar? 😊

Soy bueno con preguntas sobre compras, trading, wallet, seguridad, redes, y todo lo del ecosistema.

Escribe tu duda — no necesitas ser técnico.

📧 Para soporte directo: **info@kairos-777.com**`
        ],
        related: ['how_to_buy', 'wallet', 'trade']
      },

      telegram: {
        keywords: ['telegram','grupo','comunidad','community','canal','channel','redes sociales','twitter','x','discord','chat'],
        patterns: [/tienen?\s+(telegram|discord|comunidad|grupo)/i, /redes?\s+social(es)?/i, /d[oó]nde\s+(los?\s+)?sigo/i],
        answers: [
          `**Redes y comunidad** 💬

📧 Email: **info@kairos-777.com**
🌐 Web: [kairos-777.com](https://kairos-777.com)

Nuestra comunidad está creciendo 🚀

¿Necesitas algo más?`
        ],
        related: ['help', 'ecosystem']
      }
    },

    followUp: {
      yes: ["¡Perfecto! Aquí va:", "¡Genial! Te cuento:", "¡Claro que sí!"],
      no: ["No hay problema 😊 ¿Algo más?", "Entendido. ¿Otra pregunta?", "Ok. ¿Algo más?"],
      more: ["¡Con gusto! Te amplío:", "¡Por supuesto! Más detalle:", "¡Claro!"]
    },

    fallbacks: [
      `Hmm, no encontré una respuesta exacta 🤔\n\nPuedo ayudarte con:\n→ **Qué es KAIROS** y cómo funciona\n→ **Cómo comprar** KAIROS\n→ **Trading** en la plataforma\n→ **Kairos Wallet**\n→ **Seguridad** y reservas\n\n¿Puedes reformular?`,
      `No estoy seguro de entender, pero soy bueno en:\n\n🪙 Qué es KairosCoin\n💰 Comprar KAIROS\n📊 Trading\n📱 Wallet\n🛡️ Seguridad\n\nEscríbelo de otra forma 😊`,
      `Esa me la puso difícil 😅 Intenta preguntar sobre:\n\n→ KairosCoin y su precio\n→ Cómo comprar\n→ Trading y bots\n→ Wallet y redes\n\nO contacta: **info@kairos-777.com**`
    ],

    quickReplies: [
      { label: '¿Qué es KAIROS?', topic: 'what_is' },
      { label: 'Cómo comprar', topic: 'how_to_buy' },
      { label: '¿Es seguro?', topic: 'security' },
      { label: 'Trading', topic: 'trade' },
    ]
  };

  // ── Intent Engine ──
  function scoreTopic(inputNorm, inputWords, topic) {
    let score = 0;
    for (const kw of topic.keywords) { const kwNorm = norm(kw); if (inputNorm.includes(kwNorm)) score += 8 + kwNorm.split(' ').length * 3; }
    const kwWords = new Set();
    for (const kw of topic.keywords) for (const w of norm(kw).split(' ')) if (w.length >= 3) kwWords.add(w);
    for (const iw of inputWords) { if (iw.length < 3) continue; for (const kw of kwWords) { const sim = wordSimilar(iw, kw); if (sim >= 0.85) score += 4; else if (sim >= 0.7) score += 2; } }
    if (topic.patterns) for (const pat of topic.patterns) if (pat.test(inputNorm)) score += 15;
    return score;
  }

  function classifyIntent(input) {
    const inputNorm = norm(input), inputWords = inputNorm.split(' ').filter(w => w.length >= 2);
    const aff = ['si','sii','yes','claro','dale','ok','okey','okay','va','vale','venga','por favor','porfa','please','aja','simon','correcto','exacto','eso'];
    const neg = ['no','nah','nel','nop','nope','paso','tampoco','nada'];
    const more = ['mas','more','cuentame','dime','explica','explicame','detalle','detalles','profundiza','amplia','sigue','continua'];
    if (CTX.lastTopic && inputWords.length <= 4) {
      if (aff.some(a => inputNorm === a || inputNorm === a + ' por favor')) return { type: 'followup_yes' };
      if (neg.some(n => inputNorm === n || inputNorm.startsWith(n + ' '))) return { type: 'followup_no' };
      if (more.some(m => inputNorm.includes(m))) return { type: 'followup_more' };
    }
    let best = null, bestScore = 0;
    for (const [key, topic] of Object.entries(KB.topics)) { const s = scoreTopic(inputNorm, inputWords, topic); if (s > bestScore) { bestScore = s; best = key; } }
    if (bestScore >= 6) return { type: 'topic', topic: best, score: bestScore };
    return { type: 'unknown' };
  }

  function getResponse(input) {
    const inputNorm = norm(input);
    const greetings = ['hola','hello','hi','hey','buenas','saludos','que tal','buenos dias','buenas tardes','buenas noches','sup','yo','ey','epa','ola','wena'];
    if (greetings.some(g => inputNorm === g || inputNorm.startsWith(g + ' '))) {
      CTX.turnCount++;
      return { text: CTX.turnCount > 1 ? "¡Hola de nuevo! 😊 ¿En qué más te ayudo?" : pickRandom(KB.greetings), showQuickReplies: true };
    }
    const thanks = ['gracias','thanks','thank you','thx','ty','muchas gracias','mil gracias'];
    if (thanks.some(t => inputNorm.includes(norm(t)))) return { text: `¡Con mucho gusto! 😊 Si te surge otra duda, aquí estaré 24/7.\n\n✨ **Kairos 777** — *In God We Trust*`, showQuickReplies: false };
    const byes = ['adios','bye','chao','hasta luego','see you','nos vemos','me voy'];
    if (byes.some(b => inputNorm.includes(norm(b)))) return { text: `¡Hasta pronto! 👋 Bienvenido siempre a **Kairos 777**.\n\n🌐 [kairos-777.com](https://kairos-777.com)`, showQuickReplies: false };

    const intent = classifyIntent(input);

    if (intent.type === 'followup_yes' && CTX.lastTopic) {
      const topic = KB.topics[CTX.lastTopic];
      if (topic?.related?.length) { const next = KB.topics[topic.related[0]]; if (next) { CTX.lastTopic = topic.related[0]; return { text: pickRandom(KB.followUp.yes) + '\n\n' + pickRandom(next.answers), showQuickReplies: false, related: next.related }; } }
      return { text: pickRandom(KB.followUp.yes) + "\n\n¿Sobre qué quieres saber más?", showQuickReplies: true };
    }
    if (intent.type === 'followup_no') { CTX.lastTopic = null; return { text: pickRandom(KB.followUp.no), showQuickReplies: true }; }
    if (intent.type === 'followup_more' && CTX.lastTopic) {
      const topic = KB.topics[CTX.lastTopic];
      if (topic) { const alt = topic.answers[topic.answers.length > 1 ? topic.answers.length - 1 : 0]; return { text: pickRandom(KB.followUp.more) + '\n\n' + alt, showQuickReplies: false, related: topic.related }; }
    }
    if (intent.type === 'topic') {
      CTX.lastTopic = intent.topic; CTX.turnCount++;
      return { text: pickRandom(KB.topics[intent.topic].answers), showQuickReplies: false, related: KB.topics[intent.topic].related };
    }
    CTX.lastTopic = null;
    return { text: pickRandom(KB.fallbacks), showQuickReplies: true };
  }

  function md(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(212,175,55,.15);padding:2px 6px;border-radius:4px;font-size:.85em;word-break:break-all;">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#D4AF37;text-decoration:underline;">$1</a>')
      .replace(/→/g, '<span style="color:#D4AF37;">→</span>').replace(/\n/g, '<br>');
  }

  function createWidget() {
    const style = document.createElement('style');
    style.textContent = `
      #kairos-agent-btn{position:fixed;bottom:24px;right:24px;z-index:10000;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#D4AF37 0%,#B8941F 100%);border:none;cursor:pointer;box-shadow:0 4px 20px rgba(212,175,55,.4),0 0 40px rgba(212,175,55,.1);display:flex;align-items:center;justify-content:center;transition:all .3s ease;animation:kairos-pulse 2s ease-in-out infinite}
      #kairos-agent-btn:hover{transform:scale(1.1);box-shadow:0 6px 30px rgba(212,175,55,.6)}
      #kairos-agent-btn svg{width:28px;height:28px;fill:#0D0D0D}
      #kairos-agent-btn.open svg.chat-icon{display:none}#kairos-agent-btn.open svg.close-icon{display:block}
      #kairos-agent-btn:not(.open) svg.chat-icon{display:block}#kairos-agent-btn:not(.open) svg.close-icon{display:none}
      @keyframes kairos-pulse{0%,100%{box-shadow:0 4px 20px rgba(212,175,55,.4),0 0 40px rgba(212,175,55,.1)}50%{box-shadow:0 4px 30px rgba(212,175,55,.6),0 0 60px rgba(212,175,55,.2)}}
      #kairos-agent-badge{position:absolute;top:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:#EF4444;border:2px solid #0D0D0D;font-size:10px;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;transition:all .3s}
      #kairos-agent-badge.hidden{transform:scale(0)}
      #kairos-agent-panel{position:fixed;bottom:96px;right:24px;z-index:10000;width:380px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 140px);border-radius:16px;overflow:hidden;background:#0D0D0D;border:1px solid rgba(212,175,55,.2);box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 40px rgba(212,175,55,.05);display:flex;flex-direction:column;transform:scale(.8) translateY(20px);opacity:0;pointer-events:none;transition:all .3s cubic-bezier(.34,1.56,.64,1);transform-origin:bottom right}
      #kairos-agent-panel.open{transform:scale(1) translateY(0);opacity:1;pointer-events:auto}
      .ka-header{padding:16px 20px;background:linear-gradient(135deg,rgba(212,175,55,.12) 0%,rgba(13,13,13,.95) 100%);border-bottom:1px solid rgba(212,175,55,.15);display:flex;align-items:center;gap:12px}
      .ka-header-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#D4AF37,#B8941F);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
      .ka-header-info h3{font-family:'Inter',sans-serif;font-size:15px;font-weight:700;color:#fff;margin:0}
      .ka-header-info p{font-size:12px;color:#D4AF37;margin:0;display:flex;align-items:center;gap:4px}
      .ka-header-info p::before{content:'';width:6px;height:6px;border-radius:50%;background:#10B981;display:inline-block}
      .ka-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin;scrollbar-color:rgba(212,175,55,.3) transparent}
      .ka-messages::-webkit-scrollbar{width:4px}.ka-messages::-webkit-scrollbar-thumb{background:rgba(212,175,55,.3);border-radius:2px}
      .ka-msg{max-width:85%;padding:12px 16px;border-radius:16px;font-size:13.5px;line-height:1.6;animation:ka-fadeIn .3s ease}
      .ka-msg.bot{align-self:flex-start;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-bottom-left-radius:4px;color:#E5E7EB}
      .ka-msg.user{align-self:flex-end;background:linear-gradient(135deg,rgba(212,175,55,.2),rgba(184,148,31,.15));border:1px solid rgba(212,175,55,.3);border-bottom-right-radius:4px;color:#fff}
      .ka-msg strong{color:#D4AF37}.ka-msg code{font-size:.82em}
      @keyframes ka-fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      .ka-quick-replies{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      .ka-quick-btn{padding:6px 14px;border-radius:20px;font-size:12px;background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.3);color:#D4AF37;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif;white-space:nowrap}
      .ka-quick-btn:hover{background:rgba(212,175,55,.25);transform:translateY(-1px)}
      .ka-input-area{padding:12px 16px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;align-items:center;background:rgba(0,0,0,.3)}
      .ka-input{flex:1;padding:10px 14px;border-radius:24px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:13.5px;outline:none;font-family:'Inter',sans-serif;transition:border-color .3s}
      .ka-input::placeholder{color:#6B7280}.ka-input:focus{border-color:rgba(212,175,55,.4)}
      .ka-send{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#D4AF37,#B8941F);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
      .ka-send:hover{transform:scale(1.08)}.ka-send:disabled{opacity:.4;cursor:default;transform:none}.ka-send svg{width:16px;height:16px;fill:#0D0D0D}
      .ka-typing{display:flex;align-items:center;gap:4px;padding:12px 16px;align-self:flex-start}
      .ka-typing span{width:6px;height:6px;border-radius:50%;background:#D4AF37;animation:ka-bounce 1.4s ease-in-out infinite}
      .ka-typing span:nth-child(2){animation-delay:.2s}.ka-typing span:nth-child(3){animation-delay:.4s}
      @keyframes ka-bounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}
      .ka-powered{text-align:center;padding:4px;font-size:10px;color:#4B5563;background:rgba(0,0,0,.4)}
      @media(max-width:480px){#kairos-agent-panel{right:8px;bottom:88px;width:calc(100vw - 16px);height:calc(100vh - 110px);max-height:calc(100vh - 110px);border-radius:12px}#kairos-agent-btn{bottom:16px;right:16px}}
    `;
    document.head.appendChild(style);

    const btn = document.createElement('button'); btn.id = 'kairos-agent-btn';
    btn.setAttribute('aria-label', 'Abrir chat de Kairos 777');
    btn.innerHTML = `<svg class="chat-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg><svg class="close-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg><div id="kairos-agent-badge">1</div>`;
    document.body.appendChild(btn);

    const panel = document.createElement('div'); panel.id = 'kairos-agent-panel';
    panel.innerHTML = `<div class="ka-header"><div class="ka-header-avatar">✨</div><div class="ka-header-info"><h3>Kairos 777 Agent</h3><p>Online — Tu asistente AI</p></div></div><div class="ka-messages" id="ka-messages"></div><div class="ka-input-area"><input class="ka-input" id="ka-input" type="text" placeholder="Pregúntame lo que quieras..." autocomplete="off"/><button class="ka-send" id="ka-send" aria-label="Enviar"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></div><div class="ka-powered">Powered by Kairos 777 AI ✦</div>`;
    document.body.appendChild(panel);

    let isOpen = false, hasOpened = false;
    const messagesEl = document.getElementById('ka-messages'), inputEl = document.getElementById('ka-input'), sendBtn = document.getElementById('ka-send'), badge = document.getElementById('kairos-agent-badge');
    const topicLabels = { what_is:'¿Qué es Kairos?', how_to_buy:'Comprar KAIROS', price:'Precio', stablecoin:'Stablecoin', security:'Seguridad', reserves:'Reservas', wallet:'Kairos Wallet', trade:'Trading', contract:'Contrato', networks:'Redes', ecosystem:'Ecosistema', founder:'Equipo', whitepaper:'Whitepaper', help:'Ayuda', telegram:'Comunidad' };

    function addMessage(text, type, showQR, related) {
      const div = document.createElement('div'); div.className = `ka-msg ${type}`; div.innerHTML = md(text); messagesEl.appendChild(div);
      if (showQR) { const qr = document.createElement('div'); qr.className = 'ka-quick-replies'; KB.quickReplies.forEach(r => { const b = document.createElement('button'); b.className = 'ka-quick-btn'; b.textContent = r.label; b.onclick = () => { qr.remove(); handleUserInput(r.label); }; qr.appendChild(b); }); messagesEl.appendChild(qr); }
      else if (related?.length) { const qr = document.createElement('div'); qr.className = 'ka-quick-replies'; related.slice(0,3).forEach(tk => { if (!KB.topics[tk]) return; const b = document.createElement('button'); b.className = 'ka-quick-btn'; b.textContent = topicLabels[tk]||tk; b.onclick = () => { qr.remove(); handleUserInput(topicLabels[tk]||tk); }; qr.appendChild(b); }); messagesEl.appendChild(qr); }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    function showTyping() { const d = document.createElement('div'); d.className = 'ka-typing'; d.id = 'ka-typing'; d.innerHTML = '<span></span><span></span><span></span>'; messagesEl.appendChild(d); messagesEl.scrollTop = messagesEl.scrollHeight; }
    function hideTyping() { const e = document.getElementById('ka-typing'); if (e) e.remove(); }
    function handleUserInput(text) {
      if (!text.trim()) return; addMessage(text, 'user', false); inputEl.value = ''; sendBtn.disabled = true; showTyping();
      setTimeout(() => { hideTyping(); const r = getResponse(text); addMessage(r.text, 'bot', r.showQuickReplies, r.related); sendBtn.disabled = false; inputEl.focus(); }, 400 + Math.random() * 600);
    }
    btn.addEventListener('click', () => { isOpen = !isOpen; panel.classList.toggle('open', isOpen); btn.classList.toggle('open', isOpen); if (isOpen && !hasOpened) { hasOpened = true; badge.classList.add('hidden'); setTimeout(() => addMessage(pickRandom(KB.greetings), 'bot', true), 400); } if (isOpen) setTimeout(() => inputEl.focus(), 400); });
    sendBtn.addEventListener('click', () => handleUserInput(inputEl.value));
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUserInput(inputEl.value); } });
    if (!sessionStorage.getItem('kairos-agent-seen')) { setTimeout(() => { if (!isOpen) { btn.style.animation = 'none'; btn.offsetHeight; btn.style.animation = 'kairos-pulse 0.5s ease-in-out 3'; setTimeout(() => btn.style.animation = 'kairos-pulse 2s ease-in-out infinite', 1500); } }, 8000); sessionStorage.setItem('kairos-agent-seen', '1'); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createWidget);
  else createWidget();
})();
