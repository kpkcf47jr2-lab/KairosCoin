/* ═══════════════════════════════════════════════════════════════
   KAIROS 777 — AI Agent Widget v2.0 (Wallet Edition)
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
      "¡Hola! 😊 Soy tu asistente de **Kairos Wallet**. ¿En qué te puedo ayudar?",
      "¡Hey! 👋 Bienvenido a **Kairos Wallet**. Pregúntame sobre envíos, recibos, redes, o lo que necesites.",
      "¡Hola! Soy el agente de **Kairos Wallet** 📱 ¿Tienes alguna duda sobre cómo enviar, recibir, o gestionar tus KAIROS?"
    ],

    topics: {
      what_is: {
        keywords: ['que es kairos','kairos','about','explicar','acerca','cuentame','que es esto','que hacen','que ofrece','informacion','conocer'],
        patterns: [/qu[eé]\s+(es|son|hace|ofrece)\s+kairos/i, /tell\s+me\s+about/i, /what\s+is/i, /para\s+qu[eé]\s+sirve/i],
        answers: [
          `**Kairos 777** es un ecosistema financiero completo 🏛️

🔸 **KairosCoin (KAIROS)** — Stablecoin 1:1 con USD, en 4 blockchains
🔸 **Kairos Wallet** — Donde estás ahora 📱 Tu billetera multi-chain segura
🔸 **Kairos 777** — Plataforma de trading con 33+ pares y hasta 150x
🔸 **Reservas Transparentes** — Verificación en tiempo real

Creado por **Kaizen LLC**, empresa registrada en Florida, EE.UU.

¿Sobre qué te gustaría saber más?`,
          `**Kairos Wallet** es tu billetera digital multi-chain 📱

Con ella puedes:
✅ Enviar y recibir KAIROS y otros tokens
✅ Ver tu balance en tiempo real
✅ Operar en BSC, Base, Arbitrum y Polygon
✅ Conectar con dApps usando WalletConnect

Todo de forma segura y non-custodial — tus llaves, tus fondos.

¿Te ayudo a empezar?`
        ],
        related: ['how_to_use', 'ecosystem', 'security']
      },

      how_to_use: {
        keywords: ['como uso','como empiezo','empezar','comenzar','primeros pasos','tutorial','guia','configurar','setup','como funciona','como hago','inicio','principiante','nuevo'],
        patterns: [/c[oó]mo\s+(uso|empiezo|empezar|comienzo|configuro|funciona)/i, /quiero\s+(empezar|comenzar|usar)/i, /how\s+to\s+(use|start|setup)/i, /primeros?\s+pasos?/i, /soy\s+nuevo/i],
        answers: [
          `¡Empezar es súper fácil! 🚀

**3 pasos:**

**1.** Conecta tu wallet existente (MetaMask, Trust Wallet) o crea una nueva
**2.** Asegúrate de estar en la red BSC (Chain ID: 56)
**3.** ¡Listo! Ya puedes enviar, recibir y gestionar KAIROS

💡 **Tips para nuevos:**
→ Necesitas un poco de BNB para gas (~$0.10 por transacción)
→ Tu dirección de wallet es la misma en todas las redes EVM
→ Guarda tu frase semilla en un lugar seguro (offline)

¿Necesitas ayuda con algún paso específico?`,
          `**¡Bienvenido a Kairos Wallet!** 📱

1️⃣ **Conecta o crea** tu wallet
2️⃣ **Añade BNB** para gas (con $5 tienes para 50+ transacciones)
3️⃣ **Compra o recibe KAIROS** y empieza a usarlo

Es así de simple. Tu wallet funciona en BSC, Base, Arbitrum y Polygon.

¿Qué te gustaría hacer primero?`
        ],
        related: ['send', 'receive', 'how_to_buy']
      },

      send: {
        keywords: ['enviar','send','transferir','transfer','mandar','envio','como envio','enviar kairos','mover','pasar'],
        patterns: [/c[oó]mo\s+(env[ií]o|enviar|transfiero|transferir|mando|paso|muevo)/i, /quiero\s+(enviar|transferir|mandar|pasar)/i, /how\s+to\s+send/i, /send\s+kairos/i],
        answers: [
          `**Enviar KAIROS** 📤

1️⃣ Haz clic en **"Enviar"** en la pantalla principal
2️⃣ Pega la **dirección del destinatario** (0x...)
3️⃣ Ingresa la **cantidad** de KAIROS
4️⃣ Revisa los detalles y confirma
5️⃣ Aprueba en tu wallet

⚡ **Importante:**
→ Verifica SIEMPRE la dirección — las transacciones son irreversibles
→ Necesitas BNB para gas (~$0.10 por tx en BSC)
→ Asegúrate que el destinatario esté en la misma red

¿Tienes alguna duda sobre el envío?`,
          `Enviar es fácil:

1. Clic en **Enviar**
2. Pega la dirección (0x...)
3. Pon el monto
4. Confirma

💡 Cost: ~$0.10 de gas en BSC. Asegúrate de tener un poco de BNB.

⚠️ Triple-check la dirección antes de confirmar. No se puede revertir.

¿Algo más?`
        ],
        related: ['receive', 'gas', 'networks']
      },

      receive: {
        keywords: ['recibir','receive','depositar','deposit','mi direccion','my address','qr','codigo','como recibo','que me envien'],
        patterns: [/c[oó]mo\s+(recibo|deposito|me\s+env[ií]an)/i, /quiero\s+recibir/i, /mi\s+direcci[oó]n/i, /how\s+to\s+receive/i, /d[oó]nde\s+(veo|est[aá])\s+mi\s+direcci[oó]n/i],
        answers: [
          `**Recibir KAIROS** 📥

1️⃣ Haz clic en **"Recibir"** en la pantalla principal
2️⃣ Copia tu **dirección** o comparte el **código QR**
3️⃣ Envía la dirección a quien te va a transferir

📋 Tu dirección empieza con **0x...** y es la misma para BSC, Base, Arbitrum y Polygon.

💡 **Tips:**
→ Verifica que el remitente envíe en la **misma red** que tú
→ BSC es la red principal para KAIROS
→ El balance se actualiza en segundos

¿Necesitas algo más?`,
          `Para recibir KAIROS:

1. Clic en **Recibir**
2. Copia tu dirección o comparte el QR
3. El remitente te envía — llega en segundos

Tu dirección 0x... es la misma en todas las redes EVM. Solo asegúrate de que ambos estén en la misma red (BSC recomendada).

¿Te ayudo con algo más?`
        ],
        related: ['send', 'balance', 'networks']
      },

      balance: {
        keywords: ['balance','saldo','cuanto tengo','how much','fondos','funds','ver','check','consultar','mi dinero','mis tokens','portfolio'],
        patterns: [/cu[aá]nto\s+tengo/i, /(ver|consultar|check)\s+(mi\s+)?(balance|saldo|fondos)/i, /mis?\s+(tokens?|fondos|dinero)/i, /how\s+much\s+do\s+i\s+have/i],
        answers: [
          `**Tu Balance** 💰

Tu balance se muestra en la pantalla principal:
→ **KAIROS** — Tu stablecoin (1 KAIROS = 1 USD)
→ **BNB** — Para pagar gas
→ **Otros tokens** — Si los has añadido

📊 Se actualiza en **tiempo real** desde la blockchain.

**Multi-chain:** Puedes ver tu balance en BSC, Base, Arbitrum y Polygon cambiando de red en configuración.

¿Necesitas ayuda con algo más?`
        ],
        related: ['send', 'receive', 'networks']
      },

      networks: {
        keywords: ['redes','networks','chain','cadena','bsc','base','arbitrum','polygon','cambiar red','switch network','multi chain','bnb chain','que red','cual red','layer 2'],
        patterns: [/qu[eé]\s+(redes?|chains?|cadenas?)/i, /en\s+qu[eé]\s+(red|chain)/i, /(cambiar|switch)\s+(de\s+)?(red|chain)/i, /cu[aá]l\s+red/i, /mejor\s+red/i],
        answers: [
          `**4 redes soportadas** 🌐

🔸 **BSC** — La principal, la más usada
   Gas: ~$0.10 · Necesitas BNB

🔸 **Base** — L2 de Ethereum, baratísima
   Gas: ~$0.01 · Necesitas ETH

🔸 **Arbitrum** — L2, rápida y segura
   Gas: ~$0.02 · Necesitas ETH

🔸 **Polygon** — Sidechain
   Gas: ~$0.01 · Necesitas POL

💡 **Recomendación:** Usa **BSC** si eres nuevo. Es la red con más liquidez para KAIROS.

Para cambiar de red, ve a **Configuración → Red**.

¿Necesitas ayuda para añadir una red?`
        ],
        related: ['gas', 'contract', 'wallet_connect']
      },

      gas: {
        keywords: ['gas','comision','fee','fees','costo','cost','bnb','pagar','cuanto cuesta','cuanto sale','transaccion','caro','barato','eth para gas','pol para gas'],
        patterns: [/cu[aá]nto\s+(cuesta|sale|cuesta|pago|cobra)/i, /comisi[oó]n(es)?/i, /(necesito|cuanto)\s+(bnb|eth|gas)/i, /gas\s+(fee|cost)/i, /es\s+(caro|barato)/i],
        answers: [
          `**Gas y comisiones** ⛽

Para enviar KAIROS necesitas gas en la moneda nativa:

🔸 **BSC** → **BNB** (~$0.05-0.15 por tx)
🔸 **Base** → **ETH** (~$0.01 por tx)
🔸 **Arbitrum** → **ETH** (~$0.02 por tx)
🔸 **Polygon** → **POL** (~$0.01 por tx)

💡 **Con $5 de BNB tienes para 50+ transacciones en BSC.**

Compra BNB en cualquier exchange (Binance, KuCoin, etc.) y envíalo a tu dirección de wallet.

¿Necesitas más información?`,
          `Las fees son muy bajas:

→ BSC: ~$0.10 (necesitas BNB)
→ Base: ~$0.01 (necesitas ETH)
→ Arbitrum: ~$0.02 (necesitas ETH)
→ Polygon: ~$0.01 (necesitas POL)

💡 Mantén siempre un poquito de BNB en tu wallet. Con $5 te alcanza para mucho.

¿Algo más?`
        ],
        related: ['networks', 'how_to_buy', 'send']
      },

      how_to_buy: {
        keywords: ['comprar','buy','adquirir','purchase','como compro','donde compro','obtener','get kairos','quiero comprar','depositar','tarjeta','card','visa','mastercard','fiat','meter dinero','cargar','recargar'],
        patterns: [/c[oó]mo\s+(compro|comprar|adquiero|obtengo|deposito|cargo)/i, /d[oó]nde\s+(compro|comprar)/i, /quiero\s+(comprar|depositar|meter|agregar)/i, /(puedo|acepta)\s+(tarjeta|visa|mastercard)/i],
        answers: [
          `**¿Cómo obtener KAIROS?** 💰

**1. Con tarjeta** (lo más fácil) 💳
→ Ve a [kairos-777.com/buy](https://kairos-777.com/buy.html)
→ Paga con Visa, Mastercard o Apple Pay
→ KAIROS llega a tu wallet automáticamente

**2. Desde otro wallet**
→ Pide que te envíen KAIROS a tu dirección 0x...
→ O intercambia USDT/USDC por KAIROS

**3. Swap en DEX**
→ PancakeSwap en BSC
→ Contrato: \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`

¿Necesitas ayuda paso a paso?`,
          `Lo más rápido para comprar KAIROS:

1️⃣ Ve a [kairos-777.com/buy](https://kairos-777.com/buy.html)
2️⃣ Conecta tu wallet
3️⃣ Paga con tarjeta — Visa, Mastercard, Apple Pay
4️⃣ KAIROS aparece en tu wallet en segundos

También puedes recibir de alguien que ya tenga, o hacer swap en PancakeSwap.

¿Te ayudo con algo más?`
        ],
        related: ['price', 'receive', 'how_to_use']
      },

      price: {
        keywords: ['precio','price','valor','value','cuanto vale','cotizacion','rate','cuanto es','cuanto esta','a cuanto'],
        patterns: [/cu[aá]nto\s+(vale|cuesta|es|est[aá])/i, /(precio|valor)\s+(de\s+)?kairos/i, /a\s+cu[aá]nto/i],
        answers: [
          `**1 KAIROS = 1 USD** — Siempre 💵

KAIROS es una **stablecoin** — su precio está fijado al dólar. No sube ni baja.

Perfecto para:
✅ Ahorrar en dólares digitales
✅ Enviar remesas sin perder valor
✅ Base estable para trading
✅ Pagos internacionales

¿Quieres saber cómo comprar?`
        ],
        related: ['how_to_buy', 'stablecoin', 'reserves']
      },

      security: {
        keywords: ['seguro','safe','seguridad','security','confiable','trust','auditado','scam','estafa','legitimo','hack','proteger','proteccion','llaves','keys','private key','seed','frase','semilla','robo','fraude'],
        patterns: [/es\s+(seguro|confiable|leg[ií]timo)/i, /(puedo\s+)?confiar/i, /mis?\s+fondos\s+(est[aá]n\s+)?seguros?/i, /me\s+pueden\s+robar/i, /frase\s+semilla/i, /private\s+key/i, /seed\s+phrase/i],
        answers: [
          `**Seguridad en Kairos Wallet** 🛡️

**Tus llaves, tus fondos:**
→ Kairos Wallet es **non-custodial**
→ NUNCA tenemos acceso a tus fondos
→ Tu clave privada vive solo en tu dispositivo

**Smart contracts seguros:**
→ OpenZeppelin v5.4 (estándar de la industria)
→ Verificados en BSCScan

**Consejos de seguridad:**
✅ NUNCA compartas tu frase semilla con nadie
✅ Guarda tu seed phrase OFFLINE (papel, caja fuerte)
✅ Verifica direcciones antes de enviar
✅ No hagas clic en links sospechosos
✅ Usa contraseña fuerte en tu wallet

¿Tienes alguna pregunta sobre seguridad?`,
          `Entiendo la preocupación. Kairos Wallet es **non-custodial** — nosotros NUNCA tenemos acceso a tus fondos.

Lo que eso significa:
→ Tu frase semilla está SOLO en tu dispositivo
→ Nadie puede mover tus fondos sin tu aprobación
→ Ni siquiera nosotros podemos tocar tu wallet

**Lo más importante:** Guarda tu frase semilla en un lugar seguro, offline. Si la pierdes, nadie puede recuperar tus fondos.

¿Algo más sobre seguridad?`
        ],
        related: ['contract', 'reserves', 'founder']
      },

      trade: {
        keywords: ['trade','trading','operar','bots','bot','invertir','invest','exchange','intercambiar','swap','apalancamiento','leverage'],
        patterns: [/quiero\s+(operar|invertir|hacer\s+trading)/i, /c[oó]mo\s+opero/i, /d[oó]nde\s+opero/i, /kairos\s+777/i],
        answers: [
          `**¿Quieres operar?** 📊 Visita **Kairos 777**:

🔸 **33+ pares** de criptomonedas
🔸 **Hasta 150x** de apalancamiento
🔸 **Bots algorítmicos** con AI
🔸 **Gráficos** en tiempo real

📊 [kairos-trade.netlify.app](https://kairos-trade.netlify.app)

Usa KAIROS como colateral estable para tus operaciones.

⚠️ El trading con apalancamiento conlleva riesgo.

¿Necesitas más información?`
        ],
        related: ['how_to_buy', 'ecosystem']
      },

      contract: {
        keywords: ['contrato','contract','address','direccion','bscscan','token address','smart contract','verificar','verify','anadir token','add token','importar','import','0x14'],
        patterns: [/direcci[oó]n\s+(del\s+)?(contrato|token)/i, /contract\s+address/i, /a[nñ]adir\s+(el\s+)?token/i, /importar\s+(el\s+)?token/i, /no\s+(me\s+)?aparece/i],
        answers: [
          `**Añadir KAIROS a tu Wallet** 📋

Si KAIROS no aparece automáticamente, añádelo:

**BSC / Base / Arbitrum:**
→ Contrato: \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`
→ Símbolo: KAIROS · Decimales: 18

**Polygon:**
→ Contrato: \`0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9\`
→ Símbolo: KAIROS · Decimales: 18

[Verificar en BSCScan](https://bscscan.com/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3)

¿Necesitas ayuda para importarlo?`
        ],
        related: ['networks', 'security']
      },

      wallet_connect: {
        keywords: ['walletconnect','wallet connect','dapp','dapps','conectar dapp','scan','escanear','qr code'],
        patterns: [/wallet\s*connect/i, /conectar\s+(a\s+)?(una?\s+)?dapp/i, /escanear\s+(c[oó]digo\s+)?qr/i],
        answers: [
          `**WalletConnect** — Conecta con dApps 🔗

Kairos Wallet soporta WalletConnect v2:

1️⃣ Abre la **dApp** que quieres usar (ej: PancakeSwap, Uniswap)
2️⃣ Haz clic en "Connect Wallet" → WalletConnect
3️⃣ Escanea el **código QR** con Kairos Wallet
4️⃣ Aprueba la conexión

Compatible con 200+ dApps del ecosistema Web3.

¿Necesitas ayuda para conectar alguna dApp?`
        ],
        related: ['networks', 'how_to_use']
      },

      ecosystem: {
        keywords: ['ecosistema','productos','servicios','que ofrecen','todo lo que tienen','apps','aplicaciones'],
        patterns: [/qu[eé]\s+(productos|servicios|ofrece)/i, /todo\s+lo\s+que/i, /ecosystem/i],
        answers: [
          `**Ecosistema Kairos 777** 🏛️

🔸 **KairosCoin** — Stablecoin 1:1 USD
   → [kairos-777.com](https://kairos-777.com)

📱 **Kairos Wallet** — Estás aquí
   → Envía, recibe, gestiona KAIROS

📊 **Kairos 777** — Trading algorítmico
   → 33+ pares · Hasta 150x · Bots AI
   → [kairos-trade.netlify.app](https://kairos-trade.netlify.app)

🏦 **Reservas** — Verificación en tiempo real
   → [kairos-777.com/reserves](https://kairos-777.com/reserves.html)

¿Qué producto te interesa?`
        ],
        related: ['what_is', 'trade']
      },

      founder: {
        keywords: ['fundador','founder','mario','isaac','quien creo','team','equipo','creador','dueno','owner','kaizen','empresa'],
        patterns: [/qui[eé]n(es)?\s+(cre[oó]|fund[oó]|est[aá]|son)/i, /de\s+qui[eé]n\s+es/i],
        answers: [
          `**Kairos 777 Inc** — Fundada por **Kaizen LLC** 🏛️

→ Empresa registrada en **Florida, EE.UU.**
→ Fundada por **Mario Isaac**
→ Filosofía: *"In God We Trust"*

Misión: Ofrecer herramientas financieras seguras, transparentes y accesibles para todos.

¿Te gustaría conocer más sobre nuestros productos?`
        ],
        related: ['what_is', 'security']
      },

      reserves: {
        keywords: ['reservas','reserves','respaldo','backing','auditoria','audit','proof','prueba','colateral','collateral'],
        patterns: [/est[aá]\s+respaldado/i, /tienen?\s+reservas?/i, /proof\s+of\s+reserves?/i],
        answers: [
          `**Reservas 100% verificables** 🏦

Cada KAIROS respaldado 1:1 por:
→ **USDT** + **USDC** + **BUSD**

📊 Verifica en tiempo real: [kairos-777.com/reserves](https://kairos-777.com/reserves.html)

Completamente transparente — cualquiera puede verificar.

¿Preguntas sobre el respaldo?`
        ],
        related: ['price', 'security', 'stablecoin']
      },

      stablecoin: {
        keywords: ['stablecoin','estable','stable','dolar','dollar','usd','moneda estable','peg','paridad','usdt','usdc'],
        patterns: [/qu[eé]\s+es\s+(una?\s+)?stablecoin/i, /diferencia.*usdt/i, /vs\s+(usdt|usdc)/i],
        answers: [
          `**KAIROS = $1 USD siempre** 💡

Es una stablecoin: no sube ni baja como Bitcoin.

Perfecto para:
✅ Ahorrar en dólares digitales
✅ Enviar remesas sin volatilidad
✅ Base estable para trading
✅ Pagos internacionales

A diferencia de USDT/USDC, KAIROS está integrado nativamente en nuestro ecosistema.

¿Quieres comprarlo?`
        ],
        related: ['price', 'how_to_buy']
      },

      whitepaper: {
        keywords: ['whitepaper','white paper','documento','paper','tecnico','roadmap','hoja de ruta'],
        patterns: [/white\s*paper/i, /hoja\s+de\s+ruta/i],
        answers: [
          `**Whitepaper de KairosCoin** 📄

→ Arquitectura técnica
→ Mecanismo de respaldo
→ Gobernanza y transparencia
→ Hoja de ruta

📖 [kairos-777.com/whitepaper](https://kairos-777.com/whitepaper.html)

¿Preguntas específicas?`
        ],
        related: ['what_is', 'security']
      },

      help: {
        keywords: ['ayuda','help','soporte','support','contacto','contact','problema','problem','error','issue','no funciona','not working','bug','roto','fallo','necesito ayuda'],
        patterns: [/necesito\s+ayuda/i, /tengo\s+(un\s+)?(problema|error)/i, /no\s+(me\s+)?(funciona|carga|abre|conecta|deja)/i, /c[oó]mo\s+contacto/i],
        answers: [
          `**¡Aquí estoy para ayudarte!** 🤝

Soy bueno en:
📤 Enviar KAIROS
📥 Recibir KAIROS
💰 Comprar KAIROS
🌐 Redes soportadas
⛽ Gas y comisiones
🛡️ Seguridad
🔗 WalletConnect

Escribe tu duda y te ayudo.

Soporte humano: 📧 **info@kairos-777.com**`,
          `¡Claro! Dime qué necesitas 😊

Puedo ayudarte con envíos, recibos, compra, redes, gas, seguridad, y más.

Escribe tu pregunta con tus propias palabras — no necesitas ser técnico.

Para soporte directo: **info@kairos-777.com**`
        ],
        related: ['how_to_use', 'send', 'receive']
      }
    },

    followUp: {
      yes: ["¡Perfecto! Aquí va:", "¡Genial! Te cuento:", "¡Claro que sí!"],
      no: ["No hay problema 😊 ¿Algo más?", "Entendido. ¿Otra pregunta?", "Ok. ¿Algo más?"],
      more: ["¡Claro! Te amplío:", "¡Con gusto! Más detalle:", "¡Por supuesto!"]
    },

    fallbacks: [
      `Hmm, no encontré una respuesta exacta 🤔\n\nPuedo ayudarte con:\n→ **Enviar/Recibir** KAIROS\n→ **Comprar** KAIROS\n→ **Redes** soportadas\n→ **Gas** y comisiones\n→ **Seguridad** de tu wallet\n\n¿Puedes reformular?`,
      `No estoy seguro de entender, pero soy bueno en:\n\n📤 Enviar KAIROS\n📥 Recibir KAIROS\n💰 Comprar KAIROS\n🌐 Redes y gas\n🔐 Seguridad\n\nEscríbelo de otra forma 😊`,
      `Esa me la puso difícil 😅 Intenta preguntar sobre:\n\n→ Cómo enviar o recibir KAIROS\n→ Comprar KAIROS\n→ Redes soportadas\n→ Seguridad\n\nO contacta: **info@kairos-777.com**`
    ],

    quickReplies: [
      { label: '¿Cómo empiezo?', topic: 'how_to_use' },
      { label: 'Enviar KAIROS', topic: 'send' },
      { label: 'Recibir KAIROS', topic: 'receive' },
      { label: '¿Es seguro?', topic: 'security' },
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
    if (thanks.some(t => inputNorm.includes(norm(t)))) return { text: `¡Con mucho gusto! 😊 Si te surge otra duda, aquí estaré 24/7.\n\n📱 **Kairos Wallet** — *In God We Trust*`, showQuickReplies: false };
    const byes = ['adios','bye','chao','hasta luego','see you','nos vemos','me voy'];
    if (byes.some(b => inputNorm.includes(norm(b)))) return { text: `¡Hasta pronto! 👋 Tus KAIROS están seguros.\n\n📱 [kairos-wallet.netlify.app](https://kairos-wallet.netlify.app)`, showQuickReplies: false };

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
      .replace(/`([^`]+)`/g, '<code style="background:rgba(167,139,250,.15);padding:2px 6px;border-radius:4px;font-size:.85em;word-break:break-all;">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#A78BFA;text-decoration:underline;">$1</a>')
      .replace(/→/g, '<span style="color:#A78BFA;">→</span>').replace(/\n/g, '<br>');
  }

  function createWidget() {
    const style = document.createElement('style');
    style.textContent = `
      #kairos-agent-btn{position:fixed;bottom:24px;right:24px;z-index:10000;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#A78BFA 0%,#7C3AED 100%);border:none;cursor:pointer;box-shadow:0 4px 20px rgba(167,139,250,.4),0 0 40px rgba(167,139,250,.1);display:flex;align-items:center;justify-content:center;transition:all .3s ease;animation:kairos-pulse 2s ease-in-out infinite}
      #kairos-agent-btn:hover{transform:scale(1.1);box-shadow:0 6px 30px rgba(167,139,250,.6)}
      #kairos-agent-btn svg{width:28px;height:28px;fill:#fff}
      #kairos-agent-btn.open svg.chat-icon{display:none}#kairos-agent-btn.open svg.close-icon{display:block}
      #kairos-agent-btn:not(.open) svg.chat-icon{display:block}#kairos-agent-btn:not(.open) svg.close-icon{display:none}
      @keyframes kairos-pulse{0%,100%{box-shadow:0 4px 20px rgba(167,139,250,.4),0 0 40px rgba(167,139,250,.1)}50%{box-shadow:0 4px 30px rgba(167,139,250,.6),0 0 60px rgba(167,139,250,.2)}}
      #kairos-agent-badge{position:absolute;top:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:#EF4444;border:2px solid #0a0a0f;font-size:10px;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;transition:all .3s}
      #kairos-agent-badge.hidden{transform:scale(0)}
      #kairos-agent-panel{position:fixed;bottom:96px;right:24px;z-index:10000;width:380px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 140px);border-radius:16px;overflow:hidden;background:#0a0a0f;border:1px solid rgba(167,139,250,.2);box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 40px rgba(167,139,250,.05);display:flex;flex-direction:column;transform:scale(.8) translateY(20px);opacity:0;pointer-events:none;transition:all .3s cubic-bezier(.34,1.56,.64,1);transform-origin:bottom right}
      #kairos-agent-panel.open{transform:scale(1) translateY(0);opacity:1;pointer-events:auto}
      .ka-header{padding:16px 20px;background:linear-gradient(135deg,rgba(167,139,250,.12) 0%,rgba(10,10,15,.95) 100%);border-bottom:1px solid rgba(167,139,250,.15);display:flex;align-items:center;gap:12px}
      .ka-header-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#A78BFA,#7C3AED);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
      .ka-header-info h3{font-family:'Inter',sans-serif;font-size:15px;font-weight:700;color:#fff;margin:0}
      .ka-header-info p{font-size:12px;color:#A78BFA;margin:0;display:flex;align-items:center;gap:4px}
      .ka-header-info p::before{content:'';width:6px;height:6px;border-radius:50%;background:#10B981;display:inline-block}
      .ka-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin;scrollbar-color:rgba(167,139,250,.3) transparent}
      .ka-messages::-webkit-scrollbar{width:4px}.ka-messages::-webkit-scrollbar-thumb{background:rgba(167,139,250,.3);border-radius:2px}
      .ka-msg{max-width:85%;padding:12px 16px;border-radius:16px;font-size:13.5px;line-height:1.6;animation:ka-fadeIn .3s ease}
      .ka-msg.bot{align-self:flex-start;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-bottom-left-radius:4px;color:#E5E7EB}
      .ka-msg.user{align-self:flex-end;background:linear-gradient(135deg,rgba(167,139,250,.2),rgba(124,58,237,.15));border:1px solid rgba(167,139,250,.3);border-bottom-right-radius:4px;color:#fff}
      .ka-msg strong{color:#A78BFA}.ka-msg code{font-size:.82em}
      @keyframes ka-fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      .ka-quick-replies{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      .ka-quick-btn{padding:6px 14px;border-radius:20px;font-size:12px;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.3);color:#A78BFA;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif;white-space:nowrap}
      .ka-quick-btn:hover{background:rgba(167,139,250,.25);transform:translateY(-1px)}
      .ka-input-area{padding:12px 16px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;align-items:center;background:rgba(0,0,0,.3)}
      .ka-input{flex:1;padding:10px 14px;border-radius:24px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:13.5px;outline:none;font-family:'Inter',sans-serif;transition:border-color .3s}
      .ka-input::placeholder{color:#6B7280}.ka-input:focus{border-color:rgba(167,139,250,.4)}
      .ka-send{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#A78BFA,#7C3AED);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
      .ka-send:hover{transform:scale(1.08)}.ka-send:disabled{opacity:.4;cursor:default;transform:none}.ka-send svg{width:16px;height:16px;fill:#fff}
      .ka-typing{display:flex;align-items:center;gap:4px;padding:12px 16px;align-self:flex-start}
      .ka-typing span{width:6px;height:6px;border-radius:50%;background:#A78BFA;animation:ka-bounce 1.4s ease-in-out infinite}
      .ka-typing span:nth-child(2){animation-delay:.2s}.ka-typing span:nth-child(3){animation-delay:.4s}
      @keyframes ka-bounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}
      .ka-powered{text-align:center;padding:4px;font-size:10px;color:#4B5563;background:rgba(0,0,0,.4)}
      @media(max-width:480px){#kairos-agent-panel{right:8px;bottom:88px;width:calc(100vw - 16px);height:calc(100vh - 110px);max-height:calc(100vh - 110px);border-radius:12px}#kairos-agent-btn{bottom:16px;right:16px}}
    `;
    document.head.appendChild(style);

    const btn = document.createElement('button'); btn.id = 'kairos-agent-btn';
    btn.setAttribute('aria-label', 'Abrir chat de Kairos Wallet');
    btn.innerHTML = `<svg class="chat-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg><svg class="close-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg><div id="kairos-agent-badge">1</div>`;
    document.body.appendChild(btn);

    const panel = document.createElement('div'); panel.id = 'kairos-agent-panel';
    panel.innerHTML = `<div class="ka-header"><div class="ka-header-avatar">📱</div><div class="ka-header-info"><h3>Kairos Wallet Agent</h3><p>Online — Tu asistente de wallet</p></div></div><div class="ka-messages" id="ka-messages"></div><div class="ka-input-area"><input class="ka-input" id="ka-input" type="text" placeholder="Pregúntame lo que quieras..." autocomplete="off"/><button class="ka-send" id="ka-send" aria-label="Enviar"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></div><div class="ka-powered">Powered by Kairos 777 AI ✦</div>`;
    document.body.appendChild(panel);

    let isOpen = false, hasOpened = false;
    const messagesEl = document.getElementById('ka-messages'), inputEl = document.getElementById('ka-input'), sendBtn = document.getElementById('ka-send'), badge = document.getElementById('kairos-agent-badge');
    const topicLabels = { what_is:'¿Qué es Kairos?', how_to_use:'¿Cómo empiezo?', send:'Enviar', receive:'Recibir', balance:'Mi balance', networks:'Redes', gas:'Gas/Comisiones', how_to_buy:'Comprar KAIROS', price:'Precio', security:'Seguridad', trade:'Trading', contract:'Contrato', wallet_connect:'WalletConnect', ecosystem:'Ecosistema', founder:'Equipo', reserves:'Reservas', stablecoin:'Stablecoin', whitepaper:'Whitepaper', help:'Ayuda' };

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
    if (!sessionStorage.getItem('kairos-wallet-agent-seen')) { setTimeout(() => { if (!isOpen) { btn.style.animation = 'none'; btn.offsetHeight; btn.style.animation = 'kairos-pulse 0.5s ease-in-out 3'; setTimeout(() => btn.style.animation = 'kairos-pulse 2s ease-in-out infinite', 1500); } }, 8000); sessionStorage.setItem('kairos-wallet-agent-seen', '1'); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createWidget);
  else createWidget();
})();
