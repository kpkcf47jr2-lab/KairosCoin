/* ═══════════════════════════════════════════════════════════════
   KAIROS 777 — AI Agent Widget (Trade Edition)
   Smart conversational agent for Kairos 777
   "In God We Trust"
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Knowledge Base ──
  const KB = {
    greeting: "👋 ¡Hola! Soy el asistente de **Kairos 777**. ¿Tienes dudas sobre trading, pares, apalancamiento, o cómo funciona la plataforma? ¡Pregúntame lo que necesites!",

    topics: {
      what_is: {
        keywords: ['qué es kairos','que es kairos','what is kairos','about kairos','qué es esto','explain','explicar','acerca','cuéntame','tell me'],
        answer: `**Kairos 777** es un ecosistema financiero completo creado por **Kaizen LLC**, empresa registrada en Florida, EE.UU. 🏛️

Nuestro ecosistema incluye:

🔸 **KairosCoin (KAIROS)** — Stablecoin 1:1 con USD, disponible en BSC, Base, Arbitrum y Polygon
🔸 **Kairos 777** — Donde estás ahora 📊 Trading algorítmico con 33+ pares y hasta 150x
🔸 **Kairos Wallet** — Billetera multi-chain para gestionar tus activos
🔸 **Reservas Transparentes** — Verificación en tiempo real del respaldo

🔹 **Seguro** — Smart contracts auditados con OpenZeppelin v5.4
🔹 **Transparente** — Reservas verificables por cualquiera
🔹 **Innovador** — Trading con bots de inteligencia artificial

¿Te gustaría saber más sobre cómo operar aquí?`
      },

      how_to_trade: {
        keywords: ['cómo operar','como operar','how to trade','empezar','start','comenzar','begin','primeros pasos','getting started','tutorial','guía','guide'],
        answer: `**¡Empieza a operar en Kairos 777!** 🚀

**Paso 1:** Conecta tu wallet (MetaMask, Trust Wallet, etc.)
**Paso 2:** Elige un par de trading (ej: BTC/USD, ETH/USD)
**Paso 3:** Selecciona el apalancamiento (1x hasta 150x)
**Paso 4:** Abre tu posición (Long o Short)
**Paso 5:** Monitorea y cierra cuando quieras

💡 **Consejos para principiantes:**
→ Empieza con apalancamiento bajo (2x-5x)
→ Usa stop-loss para proteger tu capital
→ No inviertas más de lo que puedes perder

⚠️ El trading con apalancamiento conlleva riesgo significativo.

¿Necesitas ayuda con algo específico?`
      },

      pairs: {
        keywords: ['pares','pairs','par','pair','mercados','markets','qué puedo operar','what can i trade','lista','list','activos','assets','crypto'],
        answer: `**33+ pares disponibles en Kairos 777** 📊

**Crypto Majors:**
→ BTC/USD · ETH/USD · BNB/USD · SOL/USD

**Altcoins populares:**
→ DOGE/USD · AVAX/USD · MATIC/USD · LINK/USD
→ UNI/USD · AAVE/USD · ARB/USD · OP/USD

**Pares con KAIROS:**
→ KAIROS/USDT · KAIROS/BNB

Todos con datos en tiempo real de TradingView.

¿Te interesa algún par en particular?`
      },

      leverage: {
        keywords: ['apalancamiento','leverage','x','multiplicador','multiplier','margen','margin','150x','100x','50x'],
        answer: `**Apalancamiento en Kairos 777** ⚡

Ofrecemos apalancamiento flexible:
→ **1x** — Sin apalancamiento (spot)
→ **2x-10x** — Conservador (recomendado para principiantes)
→ **10x-50x** — Moderado
→ **50x-150x** — Agresivo (traders experimentados)

📐 **Ejemplo:** Con $100 y apalancamiento 10x:
→ Tu posición vale $1,000
→ Si sube 5%, ganas $50 (50% de tu capital)
→ Si baja 10%, pierdes tu inversión

⚠️ **A mayor apalancamiento, mayor riesgo.** Usa stop-loss siempre.

¿Quieres aprender a configurar stop-loss?`
      },

      bots: {
        keywords: ['bot','bots','automatizado','automated','algoritmo','algorithm','ai','inteligencia artificial','estrategia','strategy','auto'],
        answer: `**Bots de Trading con AI** 🤖

Kairos 777 incluye bots algorítmicos inteligentes:

🔸 **Grid Bot** — Compra y vende automáticamente en rangos
🔸 **DCA Bot** — Dollar Cost Averaging automatizado
🔸 **Trend Bot** — Sigue tendencias con AI
🔸 **Scalping Bot** — Operaciones rápidas de pequeñas ganancias

**Ventajas:**
✅ Opera 24/7 sin emociones
✅ Configuración personalizable
✅ Backtesting con datos históricos
✅ Alertas en tiempo real

¿Te gustaría saber cuál bot es mejor para tu estilo?`
      },

      fees: {
        keywords: ['comisiones','fees','costo','cost','cuánto cobra','how much cost','tarifas','rates','spread','spreads'],
        answer: `**Comisiones transparentes** 💰

🔸 **Trading Spot:** 0.1% por operación
🔸 **Futuros/Perps:** 0.05% maker · 0.07% taker
🔸 **Sin spreads ocultos** — Precios directos del mercado
🔸 **Sin comisiones de depósito** en crypto
🔸 **Sin cuota mensual** — Paga solo cuando operas

💡 **Tip:** Usa KAIROS como colateral para obtener descuentos en comisiones.

¿Necesitas más información?`
      },

      how_to_buy: {
        keywords: ['comprar','buy','adquirir','purchase','cómo compro','how to buy','donde compro','where buy','obtener','get kairos','quiero comprar','want to buy','depositar','deposit'],
        answer: `**¿Cómo obtener KAIROS para operar?** 💰

**Opción 1: Compra directa con tarjeta**
→ Ve a [kairos-777.com/buy](https://kairos-777.com/buy.html)
→ Paga con Visa, Mastercard o Apple Pay
→ Recibe KAIROS en tu wallet

**Opción 2: Transferencia de stablecoins**
→ Envía USDT, USDC o BUSD
→ Recibe KAIROS equivalente

**Opción 3: Swap en DEX**
→ Usa PancakeSwap en BSC
→ Contrato: \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`

Una vez tengas KAIROS, conéctalo como colateral en Kairos 777.

¿Necesitas ayuda paso a paso?`
      },

      ecosystem: {
        keywords: ['ecosistema','ecosystem','productos','products','servicios','services','que ofrecen','what you offer','plataforma','platform','todo lo que tienen'],
        answer: `**Kairos 777** — Ecosistema financiero completo 🏛️

🔸 **KairosCoin (KAIROS)** — Stablecoin USD-pegged
   → [kairos-777.com](https://kairos-777.com)

🔸 **Kairos 777** — Donde estás ahora 📊
   → 33+ pares · Hasta 150x apalancamiento · Bots AI

🔸 **Kairos Wallet** — Billetera multi-chain
   → [kairos-wallet.netlify.app](https://kairos-wallet.netlify.app)

🔸 **Reservas Transparentes** — Verificación en tiempo real
   → [kairos-777.com/reserves](https://kairos-777.com/reserves.html)

¿Qué producto te interesa más?`
      },

      price: {
        keywords: ['precio','price','valor','value','cuánto vale','how much','cotización','rate','cost','costo kairos'],
        answer: `**1 KAIROS = 1 USD** siempre 💵

KAIROS es una **stablecoin** — su precio está fijado al dólar estadounidense. No sube ni baja como Bitcoin.

Es perfecto como **colateral de trading**:
✅ Sin riesgo de depreciación del colateral
✅ Cálculos de ganancia/pérdida claros
✅ Margen estable para tus posiciones

¿Quieres saber cómo comprar?`
      },

      security: {
        keywords: ['seguro','safe','seguridad','security','confiable','trust','audited','auditado','scam','estafa','legítimo','legitimate','hack','fondos'],
        answer: `**Seguridad en Kairos 777** 🛡️

**Empresa Registrada**
→ Kairos 777 Inc — Florida, EE.UU.
→ Fundada por: Kaizen LLC

**Fondos Protegidos**
→ Smart contracts basados en OpenZeppelin v5.4
→ Tus fondos permanecen en tu wallet
→ Non-custodial — Tus llaves, tus fondos

**Infraestructura**
→ HTTPS en todas las conexiones
→ Verificación de firmas
→ Precios verificados vía oráculos

¿Tienes alguna pregunta específica sobre seguridad?`
      },

      wallet: {
        keywords: ['wallet','billetera','monedero','conectar','connect','metamask','trust wallet','guardar','almacenar'],
        answer: `**Conectar tu Wallet** 🔗

Kairos 777 soporta múltiples wallets:
→ **MetaMask** — La más popular
→ **Trust Wallet** — Ideal para móvil
→ **WalletConnect** — Compatible con 200+ wallets

**Para conectar:**
1. Haz clic en "Connect Wallet" arriba
2. Elige tu wallet
3. Aprueba la conexión
4. ¡Listo para operar!

También puedes usar **Kairos Wallet**:
→ [kairos-wallet.netlify.app](https://kairos-wallet.netlify.app)

¿Necesitas ayuda para conectar?`
      },

      contract: {
        keywords: ['contrato','contract','address','dirección','bscscan','token address','smart contract','verificar','verify','chain','cadena','red','network'],
        answer: `**Direcciones del contrato KAIROS** 📋

🔸 **BSC:** \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`
🔸 **Base:** \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`
🔸 **Arbitrum:** \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`
🔸 **Polygon:** \`0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9\`

Verificar en BSCScan:
→ [Ver en BSCScan](https://bscscan.com/token/0x14D41707269c7D8b8DFa5095b38824a46dA05da3)

¿Necesitas algo más?`
      },

      founder: {
        keywords: ['fundador','founder','mario','isaac','quién creó','who created','team','equipo','creador','creator','dueño','owner','ceo'],
        answer: `**Kairos 777 Inc** fue fundada por **Kaizen LLC** 🏛️

→ Empresa registrada en **Florida, Estados Unidos**
→ Visión: Democratizar el acceso a finanzas estables y trading algorítmico
→ Filosofía: *"In God We Trust"*

Kaizen LLC creó Kairos 777 con la misión de ofrecer herramientas financieras seguras, transparentes y accesibles para todos.

¿Te gustaría conocer más sobre nuestra misión?`
      },

      risk: {
        keywords: ['riesgo','risk','liquidación','liquidation','perder','lose','pérdida','loss','stop loss','stop-loss','peligro','danger'],
        answer: `**Gestión de Riesgo** ⚠️

El trading con apalancamiento es de alto riesgo. Recomendaciones:

🔸 **Stop-Loss** — Configura siempre un stop-loss
🔸 **Position Size** — No arriesgues más del 2% por operación
🔸 **Apalancamiento** — Empieza con 2x-5x máximo
🔸 **Diversificación** — No pongas todo en un solo par
🔸 **Emociones** — No operes por impulso o venganza

📊 **Regla de oro:** Solo opera con dinero que puedes permitirte perder.

¿Quieres aprender más sobre gestión de riesgo?`
      },

      help: {
        keywords: ['ayuda','help','soporte','support','contacto','contact','problema','problem','error','issue','no funciona','not working'],
        answer: `**¿Necesitas ayuda?** 🤝

Puedo asistirte con:
1️⃣ **Cómo empezar** — Tutorial paso a paso
2️⃣ **Pares de trading** — Qué mercados operar
3️⃣ **Apalancamiento** — Cómo funciona
4️⃣ **Bots de AI** — Trading automatizado
5️⃣ **Comisiones** — Precios transparentes
6️⃣ **Seguridad** — Protección de fondos

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
✅ Ideal como colateral estable para trading

En Kairos 777, puedes usar KAIROS como base para todas tus operaciones.

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
• **¿Cómo empezar a operar?** — Tutorial
• **Pares de trading** — 33+ mercados
• **Apalancamiento** — De 1x a 150x
• **Bots AI** — Trading automatizado
• **Comisiones** — Precios claros
• **Seguridad** — Protección de fondos

Escribe tu pregunta o elige un tema 😊`,

    quickReplies: [
      { label: '¿Cómo empiezo?', topic: 'how_to_trade' },
      { label: 'Pares disponibles', topic: 'pairs' },
      { label: 'Apalancamiento', topic: 'leverage' },
      { label: 'Bots AI', topic: 'bots' },
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
      return { text: `¡Hola! 😊 Bienvenido a **Kairos 777**. ¿En qué te puedo ayudar?\n\nPuedes preguntarme sobre pares de trading, apalancamiento, bots AI, comisiones, o cualquier duda sobre la plataforma.`, showQuickReplies: true };
    }

    const thanks = ['gracias','thanks','thank you','thx','ty','valeu','merci'];
    if (thanks.some(t => normalizedInput.includes(t))) {
      return { text: `¡Con mucho gusto! 😊 Si necesitas algo más, estoy aquí 24/7.\n\n📊 **Kairos 777** — *In God We Trust*`, showQuickReplies: false };
    }

    const byes = ['adiós','adios','bye','chao','hasta luego','see you','nos vemos'];
    if (byes.some(b => normalizedInput.includes(b))) {
      return { text: `¡Hasta pronto! 👋 ¡Que tus trades sean exitosos!\n\n📊 [kairos-trade.netlify.app](https://kairos-trade.netlify.app)`, showQuickReplies: false };
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
      .replace(/`([^`]+)`/g, '<code style="background:rgba(96,165,250,0.15);padding:2px 6px;border-radius:4px;font-size:0.85em;word-break:break-all;">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#60A5FA;text-decoration:underline;">$1</a>')
      .replace(/→/g, '<span style="color:#60A5FA;">→</span>')
      .replace(/\n/g, '<br>');
  }

  // ── Create Widget ──
  function createWidget() {
    const style = document.createElement('style');
    style.textContent = `
      #kairos-agent-btn {
        position: fixed; bottom: 24px; right: 24px; z-index: 10000;
        width: 60px; height: 60px; border-radius: 50%;
        background: linear-gradient(135deg, #60A5FA 0%, #2563EB 100%);
        border: none; cursor: pointer;
        box-shadow: 0 4px 20px rgba(96,165,250,0.4), 0 0 40px rgba(96,165,250,0.1);
        display: flex; align-items: center; justify-content: center;
        transition: all 0.3s ease;
        animation: kairos-pulse 2s ease-in-out infinite;
      }
      #kairos-agent-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(96,165,250,0.6);
      }
      #kairos-agent-btn svg { width: 28px; height: 28px; fill: #fff; }
      #kairos-agent-btn.open svg.chat-icon { display: none; }
      #kairos-agent-btn.open svg.close-icon { display: block; }
      #kairos-agent-btn:not(.open) svg.chat-icon { display: block; }
      #kairos-agent-btn:not(.open) svg.close-icon { display: none; }

      @keyframes kairos-pulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(96,165,250,0.4), 0 0 40px rgba(96,165,250,0.1); }
        50% { box-shadow: 0 4px 30px rgba(96,165,250,0.6), 0 0 60px rgba(96,165,250,0.2); }
      }

      #kairos-agent-badge {
        position: absolute; top: -2px; right: -2px;
        width: 18px; height: 18px; border-radius: 50%;
        background: #EF4444; border: 2px solid #0B0E11;
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
        background: #0B0E11;
        border: 1px solid rgba(96,165,250,0.2);
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(96,165,250,0.05);
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
        background: linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(11,14,17,0.95) 100%);
        border-bottom: 1px solid rgba(96,165,250,0.15);
        display: flex; align-items: center; gap: 12px;
      }
      .ka-header-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        background: linear-gradient(135deg, #60A5FA, #2563EB);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }
      .ka-header-info h3 {
        font-family: 'Inter', sans-serif;
        font-size: 15px; font-weight: 700; color: #fff; margin: 0;
      }
      .ka-header-info p {
        font-size: 12px; color: #60A5FA; margin: 0;
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
        scrollbar-color: rgba(96,165,250,0.3) transparent;
      }
      .ka-messages::-webkit-scrollbar { width: 4px; }
      .ka-messages::-webkit-scrollbar-thumb { background: rgba(96,165,250,0.3); border-radius: 2px; }

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
        background: linear-gradient(135deg, rgba(96,165,250,0.2), rgba(37,99,235,0.15));
        border: 1px solid rgba(96,165,250,0.3);
        border-bottom-right-radius: 4px;
        color: #fff;
      }
      .ka-msg strong { color: #60A5FA; }
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
        background: rgba(96,165,250,0.1); border: 1px solid rgba(96,165,250,0.3);
        color: #60A5FA; cursor: pointer; transition: all 0.2s;
        font-family: 'Inter', sans-serif; white-space: nowrap;
      }
      .ka-quick-btn:hover {
        background: rgba(96,165,250,0.25); transform: translateY(-1px);
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
      .ka-input:focus { border-color: rgba(96,165,250,0.4); }
      .ka-send {
        width: 38px; height: 38px; border-radius: 50%;
        background: linear-gradient(135deg, #60A5FA, #2563EB);
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
        width: 6px; height: 6px; border-radius: 50%; background: #60A5FA;
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
    btn.setAttribute('aria-label', 'Abrir chat de Kairos 777');
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
        <div class="ka-header-avatar">📊</div>
        <div class="ka-header-info">
          <h3>Kairos 777 Agent</h3>
          <p>Online — Tu asistente de trading</p>
        </div>
      </div>
      <div class="ka-messages" id="ka-messages"></div>
      <div class="ka-input-area">
        <input class="ka-input" id="ka-input" type="text" placeholder="Pregunta sobre trading..." autocomplete="off" />
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

    if (!sessionStorage.getItem('kairos-trade-agent-seen')) {
      setTimeout(() => {
        if (!isOpen) {
          btn.style.animation = 'none';
          btn.offsetHeight;
          btn.style.animation = 'kairos-pulse 0.5s ease-in-out 3';
          setTimeout(() => { btn.style.animation = 'kairos-pulse 2s ease-in-out infinite'; }, 1500);
        }
      }, 8000);
      sessionStorage.setItem('kairos-trade-agent-seen', '1');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }

})();
