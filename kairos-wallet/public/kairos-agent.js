/* ═══════════════════════════════════════════════════════════════
   KAIROS 777 — AI Agent Widget (Wallet Edition)
   Smart conversational agent for Kairos Wallet
   "In God We Trust"
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Knowledge Base ──
  const KB = {
    greeting: "👋 ¡Hola! Soy el asistente de **Kairos Wallet**. ¿Tienes dudas sobre cómo enviar, recibir, o gestionar tus KAIROS? ¡Pregúntame lo que necesites!",

    topics: {
      what_is: {
        keywords: ['qué es kairos','que es kairos','what is kairos','about kairos','qué es esto','explain','explicar','acerca','cuéntame','tell me'],
        answer: `**Kairos 777** es un ecosistema financiero completo creado por **Kaizen LLC**, empresa registrada en Florida, EE.UU. 🏛️

Nuestro ecosistema incluye:

🔸 **KairosCoin (KAIROS)** — Stablecoin 1:1 con USD, disponible en BSC, Base, Arbitrum y Polygon
🔸 **Kairos Wallet** — Donde estás ahora 📱 Tu billetera multi-chain segura
🔸 **Kairos Trade** — Plataforma de trading algorítmico con 33+ pares y hasta 150x
🔸 **Reservas Transparentes** — Verificación en tiempo real del respaldo

🔹 **Seguro** — Smart contracts auditados con OpenZeppelin v5.4
🔹 **Transparente** — Reservas verificables por cualquiera
🔹 **Innovador** — Trading con bots de inteligencia artificial

¿Te gustaría saber más sobre cómo usar tu wallet?`
      },

      how_to_use: {
        keywords: ['cómo uso','como uso','how to use','empezar','start','comenzar','begin','primeros pasos','getting started','tutorial','guía','guide','configurar','setup'],
        answer: `**¡Empieza a usar Kairos Wallet!** 🚀

**Paso 1:** Conecta tu wallet existente (MetaMask, Trust Wallet, etc.)
  → O crea una nueva wallet directamente aquí

**Paso 2:** Añade la red BSC si no la tienes
  → Chain ID: 56 · RPC: https://bsc-dataseed.binance.org

**Paso 3:** ¡Listo! Ya puedes:
  → Enviar y recibir KAIROS
  → Ver tu balance en tiempo real
  → Gestionar tokens en múltiples chains

💡 **Tip:** Necesitas un poco de BNB para pagar gas en transacciones BSC.

¿Necesitas ayuda con algo específico?`
      },

      send: {
        keywords: ['enviar','send','transferir','transfer','mandar','envío'],
        answer: `**Enviar KAIROS** 📤

1. Haz clic en **"Enviar"** en la pantalla principal
2. Ingresa la **dirección del destinatario** (0x...)
3. Ingresa la **cantidad** de KAIROS a enviar
4. Revisa los detalles y confirma la transacción
5. Aprueba en tu wallet (MetaMask/Trust Wallet)

⚡ **Importante:**
→ Verifica siempre la dirección del destinatario
→ Necesitas BNB para gas (~$0.10 por transacción)
→ Las transacciones son irreversibles

¿Tienes alguna duda sobre el envío?`
      },

      receive: {
        keywords: ['recibir','receive','depositar','deposit','mi dirección','my address','qr','código'],
        answer: `**Recibir KAIROS** 📥

1. Haz clic en **"Recibir"** en la pantalla principal
2. Copia tu **dirección de wallet** o comparte el código QR
3. Envía la dirección a quien te va a transferir KAIROS

📋 **Tu dirección** empieza con 0x... — es la misma para todas las chains EVM (BSC, Base, Arbitrum, Polygon).

💡 **Tip:** Verifica que el remitente envíe en la **misma red** (BSC es la principal).

¿Necesitas algo más?`
      },

      balance: {
        keywords: ['balance','saldo','cuánto tengo','how much','fondos','funds','ver','check','consultar'],
        answer: `**Ver tu Balance** 💰

Tu balance se muestra en la pantalla principal de Kairos Wallet:
→ **KAIROS** — Tu stablecoin (1 KAIROS = 1 USD)
→ **BNB** — Para pagar gas de transacciones
→ **Otros tokens** — Si los has añadido

📊 El balance se actualiza en tiempo real desde la blockchain.

**Multi-chain:**
→ Puedes ver tu balance en BSC, Base, Arbitrum y Polygon
→ Cambia de red en las configuraciones

¿Necesitas ayuda con algo más?`
      },

      networks: {
        keywords: ['redes','networks','chain','cadena','bsc','base','arbitrum','polygon','cambiar red','switch network','multi-chain','multichain'],
        answer: `**Redes soportadas** 🌐

Kairos Wallet soporta múltiples blockchains:

🔸 **BSC (BNB Smart Chain)** — Red principal
   → Chain ID: 56 · Gas: ~$0.10
   → Contrato: \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`

🔸 **Base** — Layer 2 de Ethereum  
   → Chain ID: 8453 · Gas: ~$0.01

🔸 **Arbitrum** — Layer 2 de Ethereum
   → Chain ID: 42161 · Gas: ~$0.02

🔸 **Polygon** — Sidechain de Ethereum
   → Chain ID: 137 · Gas: ~$0.01
   → Contrato: \`0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9\`

¿En qué red necesitas ayuda?`
      },

      gas: {
        keywords: ['gas','comisión','fee','fees','costo','cost','bnb','pagar','cuánto cuesta','how much cost','transacción'],
        answer: `**Gas y comisiones** ⛽

Para enviar KAIROS necesitas pagar **gas** en la moneda nativa de la red:

🔸 **BSC** → Necesitas **BNB** (~$0.05-0.15 por tx)
🔸 **Base** → Necesitas **ETH** (~$0.01 por tx)
🔸 **Arbitrum** → Necesitas **ETH** (~$0.02 por tx)
🔸 **Polygon** → Necesitas **POL** (~$0.01 por tx)

💡 **Tip:** Mantén siempre un poco de BNB en tu wallet para gas. Con $5 de BNB tienes para ~50+ transacciones.

→ Compra BNB en cualquier exchange (Binance, KuCoin, etc.)

¿Necesitas más información?`
      },

      how_to_buy: {
        keywords: ['comprar','buy','adquirir','purchase','cómo compro','how to buy','donde compro','where buy','obtener','get kairos','quiero comprar','want to buy'],
        answer: `**¿Cómo obtener KAIROS?** 💰

**Opción 1: Compra directa con tarjeta**
→ Ve a [kairos-777.com/buy](https://kairos-777.com/buy.html)
→ Paga con Visa, Mastercard o Apple Pay
→ Recibe KAIROS directo en tu wallet

**Opción 2: Transferencia de stablecoins**
→ Envía USDT, USDC o BUSD
→ Recibe KAIROS equivalente

**Opción 3: Swap en DEX**
→ Usa PancakeSwap en BSC
→ Contrato: \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`

Una vez comprado, aparecerá automáticamente en tu Kairos Wallet.

¿Necesitas ayuda paso a paso?`
      },

      ecosystem: {
        keywords: ['ecosistema','ecosystem','productos','products','servicios','services','que ofrecen','what you offer','plataforma','platform','todo lo que tienen'],
        answer: `**Kairos 777** — Ecosistema financiero completo 🏛️

🔸 **KairosCoin (KAIROS)** — Stablecoin USD-pegged
   → [kairos-777.com](https://kairos-777.com)

🔸 **Kairos Wallet** — Donde estás ahora 📱
   → Envía, recibe y gestiona KAIROS

🔸 **Kairos Trade** — Trading algorítmico
   → 33+ pares · Hasta 150x · Bots AI
   → [kairos-trade.netlify.app](https://kairos-trade.netlify.app)

🔸 **Reservas Transparentes** — Verificación en tiempo real
   → [kairos-777.com/reserves](https://kairos-777.com/reserves.html)

¿Qué producto te interesa más?`
      },

      price: {
        keywords: ['precio','price','valor','value','cuánto vale','how much','cotización','rate','costo kairos'],
        answer: `**1 KAIROS = 1 USD** siempre 💵

KAIROS es una **stablecoin** — su precio está fijado al dólar estadounidense. No sube ni baja como Bitcoin.

Es perfecto para:
✅ Ahorrar en dólares digitales
✅ Enviar remesas sin volatilidad
✅ Base estable para trading
✅ Pagos internacionales

¿Quieres saber cómo comprar?`
      },

      security: {
        keywords: ['seguro','safe','seguridad','security','confiable','trust','audited','auditado','scam','estafa','legítimo','legitimate','hack','proteger','protect','llaves','keys','private key'],
        answer: `**Seguridad en Kairos Wallet** 🛡️

**Tus llaves, tus fondos**
→ Kairos Wallet es **non-custodial**
→ Nosotros NUNCA tenemos acceso a tus fondos
→ Tu clave privada permanece solo en tu dispositivo

**Empresa Registrada**
→ Kairos 777 Inc — Florida, EE.UU.
→ Fundada por: Kaizen LLC

**Consejos de seguridad:**
✅ Nunca compartas tu frase semilla (seed phrase)
✅ Usa contraseña fuerte en MetaMask
✅ Verifica siempre las direcciones antes de enviar
✅ No hagas clic en links sospechosos
✅ Guarda tu seed phrase offline

¿Tienes alguna pregunta sobre seguridad?`
      },

      trade: {
        keywords: ['trade','trading','operar','bots','bot','invertir','invest','exchange','intercambiar','swap'],
        answer: `**¿Quieres operar con KAIROS?** 📊

Visita **Kairos Trade** — nuestra plataforma de trading:

🔸 **33+ pares** de criptomonedas
🔸 **Hasta 150x** de apalancamiento
🔸 **Bots algorítmicos** con inteligencia artificial
🔸 **Gráficos** en tiempo real

📊 Accede desde: [kairos-trade.netlify.app](https://kairos-trade.netlify.app)

Usa KAIROS como colateral estable para tus operaciones.

⚠️ El trading con apalancamiento conlleva riesgo.

¿Necesitas más información?`
      },

      contract: {
        keywords: ['contrato','contract','address','dirección','bscscan','token address','smart contract','verificar','verify','añadir token','add token','importar','import'],
        answer: `**Añadir KAIROS a tu Wallet** 📋

Si KAIROS no aparece automáticamente, añádelo manualmente:

**En BSC/Base/Arbitrum:**
→ Contrato: \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`
→ Símbolo: KAIROS
→ Decimales: 18

**En Polygon:**
→ Contrato: \`0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9\`
→ Símbolo: KAIROS
→ Decimales: 18

Verificar en BSCScan:
→ [Ver en BSCScan](https://bscscan.com/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3)

¿Necesitas ayuda para importar el token?`
      },

      founder: {
        keywords: ['fundador','founder','quién creó','who created','team','equipo','creador','creator','dueño','owner','ceo','kaizen'],
        answer: `**Kairos 777 Inc** fue fundada por **Kaizen LLC** 🏛️

→ Empresa registrada en **Florida, Estados Unidos**
→ Visión: Democratizar el acceso a finanzas estables y trading algorítmico
→ Filosofía: *"In God We Trust"*

Kaizen LLC creó Kairos 777 con la misión de ofrecer herramientas financieras seguras, transparentes y accesibles para todos.

¿Te gustaría conocer más sobre nuestra misión?`
      },

      help: {
        keywords: ['ayuda','help','soporte','support','contacto','contact','problema','problem','error','issue','no funciona','not working'],
        answer: `**¿Necesitas ayuda?** 🤝

Puedo asistirte con:
1️⃣ **Cómo empezar** — Configura tu wallet
2️⃣ **Enviar KAIROS** — Paso a paso
3️⃣ **Recibir KAIROS** — Tu dirección y QR
4️⃣ **Redes** — BSC, Base, Arbitrum, Polygon
5️⃣ **Gas** — Comisiones de transacción
6️⃣ **Seguridad** — Protege tus fondos

Escribe tu pregunta y te ayudaré 😊

Para soporte directo: info@kairos-777.com`
      },

      stablecoin: {
        keywords: ['stablecoin','estable','stable','dólar','dollar','usd','moneda estable','peg','paridad','parity'],
        answer: `**¿Qué es una stablecoin?** 💡

Una stablecoin es una criptomoneda diseñada para mantener un precio estable, generalmente $1 USD.

**KAIROS** es una stablecoin porque:
✅ Cada token está respaldado 1:1 con USD
✅ Puedes comprar y vender siempre a ~$1
✅ No tiene la volatilidad de BTC o ETH
✅ Ideal para ahorro, pagos y remesas

En Kairos Wallet puedes gestionar tus KAIROS de forma segura y sencilla.

¿Quieres saber más?`
      },

      whitepaper: {
        keywords: ['whitepaper','white paper','documento','paper','technical','técnico','documentación','documentation'],
        answer: `**Whitepaper de KairosCoin** 📄

Nuestro whitepaper detalla:
→ Arquitectura técnica del token
→ Mecanismo de respaldo y estabilidad
→ Gobernanza y transparencia
→ Hoja de ruta del ecosistema

📖 Lee el whitepaper completo:
→ [kairos-777.com/whitepaper](https://kairos-777.com/whitepaper.html)

¿Tienes preguntas específicas?`
      }
    },

    fallback: `No estoy seguro de entender tu pregunta 🤔

Puedo ayudarte con:
• **¿Cómo empezar?** — Configura tu wallet
• **Enviar KAIROS** — Transferir fondos
• **Recibir KAIROS** — Tu dirección
• **Redes** — Multi-chain soportado
• **Gas/Comisiones** — Costos de transacción
• **Seguridad** — Protege tus fondos

Escribe tu pregunta o elige un tema 😊`,

    quickReplies: [
      { label: '¿Cómo empiezo?', topic: 'how_to_use' },
      { label: 'Enviar KAIROS', topic: 'send' },
      { label: 'Recibir KAIROS', topic: 'receive' },
      { label: 'Seguridad', topic: 'security' },
    ]
  };

  // ── Smart Matching ──
  function findBestMatch(input) {
    const normalized = input.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿¡?!.,;:'"]/g, '');

    let bestMatch = null;
    let bestScore = 0;

    for (const [topicKey, topic] of Object.entries(KB.topics)) {
      for (const keyword of topic.keywords) {
        const normalizedKw = keyword.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        if (normalized.includes(normalizedKw)) {
          const score = normalizedKw.length;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = topicKey;
          }
        }
      }
    }

    return bestMatch;
  }

  function getResponse(input) {
    const greetings = ['hola','hello','hi','hey','buenas','saludos','good morning','good afternoon','qué tal','que tal','buenos días','buenas tardes','sup','yo'];
    const normalizedInput = input.toLowerCase().trim();
    
    if (greetings.some(g => normalizedInput === g || normalizedInput.startsWith(g + ' ') || normalizedInput.startsWith(g + ','))) {
      return { text: `¡Hola! 😊 Bienvenido a **Kairos Wallet**. ¿En qué te puedo ayudar?\n\nPuedes preguntarme sobre cómo enviar o recibir KAIROS, redes soportadas, comisiones, seguridad, o cualquier duda.`, showQuickReplies: true };
    }

    const thanks = ['gracias','thanks','thank you','thx','ty','valeu','merci'];
    if (thanks.some(t => normalizedInput.includes(t))) {
      return { text: `¡Con mucho gusto! 😊 Si necesitas algo más, estoy aquí 24/7.\n\n📱 **Kairos Wallet** — *In God We Trust*`, showQuickReplies: false };
    }

    const byes = ['adiós','adios','bye','chao','hasta luego','see you','nos vemos'];
    if (byes.some(b => normalizedInput.includes(b))) {
      return { text: `¡Hasta pronto! 👋 Tus KAIROS están seguros con nosotros.\n\n📱 [kairos-wallet.netlify.app](https://kairos-wallet.netlify.app)`, showQuickReplies: false };
    }

    const match = findBestMatch(input);
    if (match) {
      return { text: KB.topics[match].answer, showQuickReplies: false };
    }

    return { text: KB.fallback, showQuickReplies: true };
  }

  // ── Simple Markdown to HTML ──
  function md(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(139,92,246,0.15);padding:2px 6px;border-radius:4px;font-size:0.85em;word-break:break-all;">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#A78BFA;text-decoration:underline;">$1</a>')
      .replace(/→/g, '<span style="color:#A78BFA;">→</span>')
      .replace(/\n/g, '<br>');
  }

  // ── Create Widget ──
  function createWidget() {
    const style = document.createElement('style');
    style.textContent = `
      #kairos-agent-btn {
        position: fixed; bottom: 24px; right: 24px; z-index: 10000;
        width: 60px; height: 60px; border-radius: 50%;
        background: linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%);
        border: none; cursor: pointer;
        box-shadow: 0 4px 20px rgba(167,139,250,0.4), 0 0 40px rgba(167,139,250,0.1);
        display: flex; align-items: center; justify-content: center;
        transition: all 0.3s ease;
        animation: kairos-pulse 2s ease-in-out infinite;
      }
      #kairos-agent-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(167,139,250,0.6);
      }
      #kairos-agent-btn svg { width: 28px; height: 28px; fill: #fff; }
      #kairos-agent-btn.open svg.chat-icon { display: none; }
      #kairos-agent-btn.open svg.close-icon { display: block; }
      #kairos-agent-btn:not(.open) svg.chat-icon { display: block; }
      #kairos-agent-btn:not(.open) svg.close-icon { display: none; }

      @keyframes kairos-pulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(167,139,250,0.4), 0 0 40px rgba(167,139,250,0.1); }
        50% { box-shadow: 0 4px 30px rgba(167,139,250,0.6), 0 0 60px rgba(167,139,250,0.2); }
      }

      #kairos-agent-badge {
        position: absolute; top: -2px; right: -2px;
        width: 18px; height: 18px; border-radius: 50%;
        background: #EF4444; border: 2px solid #0a0a0f;
        font-size: 10px; color: #fff; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.3s;
      }
      #kairos-agent-badge.hidden { transform: scale(0); }

      #kairos-agent-panel {
        position: fixed; bottom: 96px; right: 24px; z-index: 10000;
        width: 380px; max-width: calc(100vw - 32px);
        height: 520px; max-height: calc(100vh - 140px);
        border-radius: 16px; overflow: hidden;
        background: #0a0a0f;
        border: 1px solid rgba(167,139,250,0.2);
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(167,139,250,0.05);
        display: flex; flex-direction: column;
        transform: scale(0.8) translateY(20px); opacity: 0;
        pointer-events: none;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        transform-origin: bottom right;
      }
      #kairos-agent-panel.open {
        transform: scale(1) translateY(0); opacity: 1;
        pointer-events: auto;
      }

      .ka-header {
        padding: 16px 20px;
        background: linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(10,10,15,0.95) 100%);
        border-bottom: 1px solid rgba(167,139,250,0.15);
        display: flex; align-items: center; gap: 12px;
      }
      .ka-header-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        background: linear-gradient(135deg, #A78BFA, #7C3AED);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }
      .ka-header-info h3 {
        font-family: 'Inter', sans-serif;
        font-size: 15px; font-weight: 700; color: #fff; margin: 0;
      }
      .ka-header-info p {
        font-size: 12px; color: #A78BFA; margin: 0;
        display: flex; align-items: center; gap: 4px;
      }
      .ka-header-info p::before {
        content: ''; width: 6px; height: 6px; border-radius: 50%;
        background: #10B981; display: inline-block;
      }

      .ka-messages {
        flex: 1; overflow-y: auto; padding: 16px;
        display: flex; flex-direction: column; gap: 12px;
        scrollbar-width: thin;
        scrollbar-color: rgba(167,139,250,0.3) transparent;
      }
      .ka-messages::-webkit-scrollbar { width: 4px; }
      .ka-messages::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.3); border-radius: 2px; }

      .ka-msg {
        max-width: 85%; padding: 12px 16px;
        border-radius: 16px; font-size: 13.5px; line-height: 1.6;
        animation: ka-fadeIn 0.3s ease;
      }
      .ka-msg.bot {
        align-self: flex-start;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.08);
        border-bottom-left-radius: 4px;
        color: #E5E7EB;
      }
      .ka-msg.user {
        align-self: flex-end;
        background: linear-gradient(135deg, rgba(167,139,250,0.2), rgba(124,58,237,0.15));
        border: 1px solid rgba(167,139,250,0.3);
        border-bottom-right-radius: 4px;
        color: #fff;
      }
      .ka-msg strong { color: #A78BFA; }
      .ka-msg code { font-size: 0.82em; }

      @keyframes ka-fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .ka-quick-replies {
        display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;
      }
      .ka-quick-btn {
        padding: 6px 14px; border-radius: 20px; font-size: 12px;
        background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.3);
        color: #A78BFA; cursor: pointer; transition: all 0.2s;
        font-family: 'Inter', sans-serif; white-space: nowrap;
      }
      .ka-quick-btn:hover {
        background: rgba(167,139,250,0.25); transform: translateY(-1px);
      }

      .ka-input-area {
        padding: 12px 16px;
        border-top: 1px solid rgba(255,255,255,0.06);
        display: flex; gap: 8px; align-items: center;
        background: rgba(0,0,0,0.3);
      }
      .ka-input {
        flex: 1; padding: 10px 14px; border-radius: 24px;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
        color: #fff; font-size: 13.5px; outline: none;
        font-family: 'Inter', sans-serif;
        transition: border-color 0.3s;
      }
      .ka-input::placeholder { color: #6B7280; }
      .ka-input:focus { border-color: rgba(167,139,250,0.4); }
      .ka-send {
        width: 38px; height: 38px; border-radius: 50%;
        background: linear-gradient(135deg, #A78BFA, #7C3AED);
        border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; flex-shrink: 0;
      }
      .ka-send:hover { transform: scale(1.08); }
      .ka-send:disabled { opacity: 0.4; cursor: default; transform: none; }
      .ka-send svg { width: 16px; height: 16px; fill: #fff; }

      .ka-typing {
        display: flex; align-items: center; gap: 4px; padding: 12px 16px;
        align-self: flex-start;
      }
      .ka-typing span {
        width: 6px; height: 6px; border-radius: 50%; background: #A78BFA;
        animation: ka-bounce 1.4s ease-in-out infinite;
      }
      .ka-typing span:nth-child(2) { animation-delay: 0.2s; }
      .ka-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes ka-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-6px); opacity: 1; }
      }

      .ka-powered {
        text-align: center; padding: 4px; font-size: 10px; color: #4B5563;
        background: rgba(0,0,0,0.4);
      }

      @media (max-width: 480px) {
        #kairos-agent-panel {
          right: 8px; bottom: 88px;
          width: calc(100vw - 16px);
          height: calc(100vh - 110px);
          max-height: calc(100vh - 110px);
          border-radius: 12px;
        }
        #kairos-agent-btn { bottom: 16px; right: 16px; }
      }
    `;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'kairos-agent-btn';
    btn.setAttribute('aria-label', 'Abrir chat de Kairos Wallet');
    btn.innerHTML = `
      <svg class="chat-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
      <svg class="close-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      <div id="kairos-agent-badge">1</div>
    `;
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'kairos-agent-panel';
    panel.innerHTML = `
      <div class="ka-header">
        <div class="ka-header-avatar">📱</div>
        <div class="ka-header-info">
          <h3>Kairos Wallet Agent</h3>
          <p>Online — Tu asistente de wallet</p>
        </div>
      </div>
      <div class="ka-messages" id="ka-messages"></div>
      <div class="ka-input-area">
        <input class="ka-input" id="ka-input" type="text" placeholder="Pregunta sobre tu wallet..." autocomplete="off" />
        <button class="ka-send" id="ka-send" aria-label="Enviar">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div class="ka-powered">Powered by Kairos 777 AI ✦</div>
    `;
    document.body.appendChild(panel);

    let isOpen = false;
    let hasOpened = false;
    const messagesEl = document.getElementById('ka-messages');
    const inputEl = document.getElementById('ka-input');
    const sendBtn = document.getElementById('ka-send');
    const badge = document.getElementById('kairos-agent-badge');

    function addMessage(text, type, showQuickReplies) {
      const div = document.createElement('div');
      div.className = `ka-msg ${type}`;
      div.innerHTML = md(text);
      messagesEl.appendChild(div);

      if (showQuickReplies) {
        const qr = document.createElement('div');
        qr.className = 'ka-quick-replies';
        KB.quickReplies.forEach(r => {
          const b = document.createElement('button');
          b.className = 'ka-quick-btn';
          b.textContent = r.label;
          b.onclick = () => {
            qr.remove();
            handleUserInput(r.label);
          };
          qr.appendChild(b);
        });
        messagesEl.appendChild(qr);
      }

      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function showTyping() {
      const div = document.createElement('div');
      div.className = 'ka-typing';
      div.id = 'ka-typing';
      div.innerHTML = '<span></span><span></span><span></span>';
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function hideTyping() {
      const el = document.getElementById('ka-typing');
      if (el) el.remove();
    }

    function handleUserInput(text) {
      if (!text.trim()) return;
      addMessage(text, 'user', false);
      inputEl.value = '';
      sendBtn.disabled = true;
      showTyping();
      const delay = 300 + Math.random() * 500;
      setTimeout(() => {
        hideTyping();
        const response = getResponse(text);
        addMessage(response.text, 'bot', response.showQuickReplies);
        sendBtn.disabled = false;
        inputEl.focus();
      }, delay);
    }

    btn.addEventListener('click', () => {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      btn.classList.toggle('open', isOpen);

      if (isOpen && !hasOpened) {
        hasOpened = true;
        badge.classList.add('hidden');
        setTimeout(() => {
          addMessage(KB.greeting, 'bot', true);
        }, 400);
      }

      if (isOpen) {
        setTimeout(() => inputEl.focus(), 400);
      }
    });

    sendBtn.addEventListener('click', () => handleUserInput(inputEl.value));
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserInput(inputEl.value);
      }
    });

    if (!sessionStorage.getItem('kairos-wallet-agent-seen')) {
      setTimeout(() => {
        if (!isOpen) {
          btn.style.animation = 'none';
          btn.offsetHeight;
          btn.style.animation = 'kairos-pulse 0.5s ease-in-out 3';
          setTimeout(() => { btn.style.animation = 'kairos-pulse 2s ease-in-out infinite'; }, 1500);
        }
      }, 8000);
      sessionStorage.setItem('kairos-wallet-agent-seen', '1');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }

})();
