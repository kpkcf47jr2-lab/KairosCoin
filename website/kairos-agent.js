/* ═══════════════════════════════════════════════════════════════
   KAIROS 777 — AI Agent Widget
   Smart conversational agent for kairos-777.com
   "In God We Trust"
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Knowledge Base ──
  const KB = {
    greeting: "👋 ¡Hola! Soy el asistente virtual de **Kairos 777**. ¿En qué te puedo ayudar hoy?",
    greetingEN: "👋 Hi! I'm the **Kairos 777** virtual assistant. How can I help you today?",

    topics: {
      what_is: {
        keywords: ['qué es kairos','que es kairos','what is kairos','about kairos','qué es esto','explain','explicar','acerca','cuéntame','tell me'],
        answer: `**KairosCoin (KAIROS)** es una stablecoin respaldada 1:1 con el dólar estadounidense (1 KAIROS = 1 USD). 

Creada por **Kairos 777 Inc**, una empresa registrada en Florida, EE.UU., fundada por Mario Isaac.

🔹 **Estable** — Mantiene paridad con USD
🔹 **Multi-chain** — Disponible en BSC, Base, Arbitrum y Polygon
🔹 **Transparente** — Reservas verificables en tiempo real
🔹 **Segura** — Smart contract auditado con OpenZeppelin v5.4

¿Te gustaría saber cómo comprar KAIROS o conocer nuestro ecosistema completo?`
      },

      how_to_buy: {
        keywords: ['comprar','buy','adquirir','purchase','cómo compro','how to buy','donde compro','where buy','obtener','get kairos','quiero comprar','want to buy'],
        answer: `¡Comprar KAIROS es muy sencillo! 💰

**Opción 1: Con tarjeta de crédito/débito**
→ Ve a [kairos-777.com/buy.html](https://kairos-777.com/buy.html)
→ Ingresa la cantidad en USD
→ Paga con Visa, Mastercard, o Apple Pay
→ Recibe KAIROS automáticamente en tu wallet

**Opción 2: Transferencia de stablecoins**
→ Envía USDT, USDC o BUSD a nuestra dirección de depósito
→ Recibe KAIROS equivalente en tu wallet

**Opción 3: Swap en DEX**
→ Usa PancakeSwap en BSC
→ Contrato: \`0x14D41707269c7D8b8DFa5095b38824a46dA05da3\`

¿Necesitas ayuda con algún paso específico?`
      },

      ecosystem: {
        keywords: ['ecosistema','ecosystem','productos','products','servicios','services','que ofrecen','what you offer','plataforma','platform','todo lo que tienen'],
        answer: `**Kairos 777** es un ecosistema financiero completo 🏛️

🔸 **KairosCoin (KAIROS)** — Stablecoin USD-pegged
   → [kairos-777.com/coin.html](https://kairos-777.com/coin.html)

🔸 **Kairos Trade** — Plataforma de trading algorítmico
   → 33+ pares crypto · Apalancamiento hasta 150x
   → Bots de trading con AI
   → [kairos-trade.netlify.app](https://kairos-trade.netlify.app)

🔸 **Kairos Wallet** — Wallet multi-chain
   → Envía, recibe y gestiona KAIROS
   → [kairos-wallet.netlify.app](https://kairos-wallet.netlify.app)

🔸 **Reservas Transparentes** — Verificación en tiempo real
   → [kairos-777.com/reserves.html](https://kairos-777.com/reserves.html)

¿Qué producto te interesa más?`
      },

      price: {
        keywords: ['precio','price','valor','value','cuánto vale','how much','cotización','rate','cost','costo'],
        answer: `**1 KAIROS = 1 USD** siempre 💵

KAIROS es una **stablecoin** — su precio está fijado al dólar estadounidense. No sube ni baja como Bitcoin o Ethereum.

Esto lo hace perfecto para:
✅ Ahorrar en dólares digitales
✅ Enviar remesas sin volatilidad
✅ Trading con base estable
✅ Pagos internacionales

¿Quieres saber cómo comprar?`
      },

      security: {
        keywords: ['seguro','safe','seguridad','security','confiable','trust','audited','auditado','scam','estafa','legítimo','legitimate','hack'],
        answer: `La seguridad es nuestra prioridad #1 🛡️

**Empresa Registrada**
→ Kairos 777 Inc — Florida, EE.UU.
→ Fundador: Mario Isaac

**Smart Contract Seguro**
→ Basado en OpenZeppelin v5.4 (estándar de la industria)
→ Función de pausa de emergencia
→ Verificado en BSCScan

**Reservas Transparentes**
→ 100% respaldado por USD y stablecoins
→ Auditoría verificable en [reserves](https://kairos-777.com/reserves.html)

**Infraestructura Protegida**
→ HTTPS en todas las plataformas
→ Verificación de firmas en webhooks
→ Autenticación por wallet (EIP-191)

¿Tienes alguna pregunta específica sobre seguridad?`
      },

      wallet: {
        keywords: ['wallet','billetera','monedero','app','aplicación','guardar','almacenar','store','enviar','send','recibir','receive'],
        answer: `**Kairos Wallet** es nuestra billetera digital 📱

🔹 **Multi-chain** — BSC, Base, Arbitrum, Polygon
🔹 **Envío y recepción** de KAIROS y otros tokens
🔹 **Interfaz simple** — Diseñada para todos
🔹 **Segura** — Tus llaves, tus fondos

📲 Accede desde: [kairos-wallet.netlify.app](https://kairos-wallet.netlify.app)

¿Necesitas ayuda para configurar tu wallet?`
      },

      trade: {
        keywords: ['trade','trading','operar','bots','bot','algoritmo','algorithmic','apalancamiento','leverage','pares','pairs','invertir','invest'],
        answer: `**Kairos Trade** — Trading de nivel institucional 📊

🔸 **33+ pares** de criptomonedas
🔸 **Hasta 150x** de apalancamiento
🔸 **Bots algorítmicos** con inteligencia artificial
🔸 **Gráficos** en tiempo real con TradingView
🔸 **Sin spreads ocultos** — Precios transparentes

📊 Accede desde: [kairos-trade.netlify.app](https://kairos-trade.netlify.app)

⚠️ Operar con apalancamiento conlleva riesgo. Opera responsablemente.

¿Te gustaría saber cómo empezar a operar?`
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
        answer: `**Kairos 777 Inc** fue fundada por **Mario Isaac** 🏛️

→ Empresa registrada en **Florida, Estados Unidos**
→ Visión: Democratizar el acceso a finanzas estables y trading algorítmico
→ Filosofía: *"In God We Trust"*

Mario Isaac creó Kairos 777 con la misión de ofrecer herramientas financieras seguras, transparentes y accesibles para todos.

¿Te gustaría conocer más sobre nuestra misión?`
      },

      reserves: {
        keywords: ['reservas','reserves','respaldo','backing','auditoría','audit','proof','prueba','colateral','collateral','backed'],
        answer: `**Reservas de KAIROS** — 100% transparente 🏦

Cada KAIROS está respaldado 1:1 por activos reales:
→ **USDT** (Tether)
→ **USDC** (Circle)
→ **BUSD** (Binance USD)

📊 Verifica las reservas en tiempo real:
→ [kairos-777.com/reserves.html](https://kairos-777.com/reserves.html)

La transparencia es uno de nuestros valores fundamentales. Cualquiera puede verificar el respaldo en cualquier momento.

¿Tienes preguntas sobre las reservas?`
      },

      help: {
        keywords: ['ayuda','help','soporte','support','contacto','contact','problema','problem','error','issue','no funciona','not working'],
        answer: `**¿Necesitas ayuda?** 🤝

Puedo asistirte con:
1️⃣ **Comprar KAIROS** — Proceso paso a paso
2️⃣ **Wallet** — Configuración y uso
3️⃣ **Trading** — Cómo empezar a operar
4️⃣ **Seguridad** — Verificación y confianza
5️⃣ **Información técnica** — Contratos, chains

Escribe tu pregunta y te ayudaré 😊

Para soporte directo, contacta: info@kairos-777.com`
      },

      stablecoin: {
        keywords: ['stablecoin','estable','stable','dólar','dollar','usd','moneda estable','peg','paridad','parity'],
        answer: `**¿Qué es una stablecoin?** 💡

Una stablecoin es una criptomoneda diseñada para mantener un precio estable, generalmente $1 USD.

**KAIROS** es una stablecoin porque:
✅ Cada token está respaldado 1:1 con USD
✅ Puedes comprar y vender siempre a ~$1
✅ No tiene la volatilidad de Bitcoin o Ethereum
✅ Ideal para pagos, ahorros y trading

A diferencia de USDT o USDC, KAIROS está diseñado específicamente para el ecosistema Kairos 777, con integración nativa en nuestra plataforma de trading y wallet.

¿Quieres saber más sobre cómo funciona?`
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
→ [kairos-777.com/whitepaper.html](https://kairos-777.com/whitepaper.html)

¿Tienes preguntas específicas sobre el whitepaper?`
      }
    },

    fallback: `No estoy seguro de entender tu pregunta 🤔

Puedo ayudarte con:
• **¿Qué es KAIROS?** — Info sobre el token
• **¿Cómo comprar?** — Paso a paso
• **Ecosistema** — Todos nuestros productos
• **Seguridad** — Cómo protegemos tus fondos
• **Trading** — Plataforma de trading
• **Wallet** — Billetera digital

Escribe tu pregunta o elige un tema 😊`,

    quickReplies: [
      { label: '¿Qué es KAIROS?', topic: 'what_is' },
      { label: '¿Cómo comprar?', topic: 'how_to_buy' },
      { label: 'Ecosistema', topic: 'ecosystem' },
      { label: 'Seguridad', topic: 'security' },
    ]
  };

  // ── Smart Matching ──
  function findBestMatch(input) {
    const normalized = input.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
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
    // Check for greeting
    const greetings = ['hola','hello','hi','hey','buenas','saludos','good morning','good afternoon','qué tal','que tal','buenos días','buenas tardes','sup','yo'];
    const normalizedInput = input.toLowerCase().trim();
    
    if (greetings.some(g => normalizedInput === g || normalizedInput.startsWith(g + ' ') || normalizedInput.startsWith(g + ','))) {
      return { text: `¡Hola! 😊 Bienvenido a **Kairos 777**. ¿En qué te puedo ayudar?\n\nPuedes preguntarme sobre nuestro token KAIROS, cómo comprarlo, nuestra plataforma de trading, o cualquier otra cosa.`, showQuickReplies: true };
    }

    // Check for thanks
    const thanks = ['gracias','thanks','thank you','thx','ty','valeu','merci'];
    if (thanks.some(t => normalizedInput.includes(t))) {
      return { text: `¡Con mucho gusto! 😊 Si necesitas algo más, no dudes en preguntar. Estamos aquí para ayudarte.\n\n🌟 **Kairos 777** — *In God We Trust*`, showQuickReplies: false };
    }

    // Check for goodbye
    const byes = ['adiós','adios','bye','chao','hasta luego','see you','nos vemos'];
    if (byes.some(b => normalizedInput.includes(b))) {
      return { text: `¡Hasta pronto! 👋 Recuerda que estoy disponible 24/7 si tienes alguna pregunta.\n\n🔗 [kairos-777.com](https://kairos-777.com)`, showQuickReplies: false };
    }

    // Topic matching
    const match = findBestMatch(input);
    if (match) {
      return { text: KB.topics[match].answer, showQuickReplies: false };
    }

    // Fallback
    return { text: KB.fallback, showQuickReplies: true };
  }

  // ── Simple Markdown to HTML ──
  function md(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(212,175,55,0.15);padding:2px 6px;border-radius:4px;font-size:0.85em;word-break:break-all;">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#60A5FA;text-decoration:underline;">$1</a>')
      .replace(/→/g, '<span style="color:#D4AF37;">→</span>')
      .replace(/\n/g, '<br>');
  }

  // ── Create Widget ──
  function createWidget() {
    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
      #kairos-agent-btn {
        position: fixed; bottom: 24px; right: 24px; z-index: 10000;
        width: 60px; height: 60px; border-radius: 50%;
        background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);
        border: none; cursor: pointer;
        box-shadow: 0 4px 20px rgba(212,175,55,0.4), 0 0 40px rgba(212,175,55,0.1);
        display: flex; align-items: center; justify-content: center;
        transition: all 0.3s ease;
        animation: kairos-pulse 2s ease-in-out infinite;
      }
      #kairos-agent-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(212,175,55,0.6);
      }
      #kairos-agent-btn svg { width: 28px; height: 28px; fill: #0D0D0D; }
      #kairos-agent-btn.open svg.chat-icon { display: none; }
      #kairos-agent-btn.open svg.close-icon { display: block; }
      #kairos-agent-btn:not(.open) svg.chat-icon { display: block; }
      #kairos-agent-btn:not(.open) svg.close-icon { display: none; }

      @keyframes kairos-pulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(212,175,55,0.4), 0 0 40px rgba(212,175,55,0.1); }
        50% { box-shadow: 0 4px 30px rgba(212,175,55,0.6), 0 0 60px rgba(212,175,55,0.2); }
      }

      #kairos-agent-badge {
        position: absolute; top: -2px; right: -2px;
        width: 18px; height: 18px; border-radius: 50%;
        background: #EF4444; border: 2px solid #0D0D0D;
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
        background: #0A0A0F;
        border: 1px solid rgba(212,175,55,0.2);
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(212,175,55,0.05);
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
        background: linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(13,13,13,0.95) 100%);
        border-bottom: 1px solid rgba(212,175,55,0.15);
        display: flex; align-items: center; gap: 12px;
      }
      .ka-header-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        background: linear-gradient(135deg, #D4AF37, #B8860B);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }
      .ka-header-info h3 {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 15px; font-weight: 700; color: #fff; margin: 0;
      }
      .ka-header-info p {
        font-size: 12px; color: #D4AF37; margin: 0;
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
        scrollbar-color: rgba(212,175,55,0.3) transparent;
      }
      .ka-messages::-webkit-scrollbar { width: 4px; }
      .ka-messages::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 2px; }

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
        background: linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1));
        border: 1px solid rgba(212,175,55,0.3);
        border-bottom-right-radius: 4px;
        color: #fff;
      }
      .ka-msg strong { color: #D4AF37; }
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
        background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.3);
        color: #D4AF37; cursor: pointer; transition: all 0.2s;
        font-family: 'Inter', sans-serif; white-space: nowrap;
      }
      .ka-quick-btn:hover {
        background: rgba(212,175,55,0.25); transform: translateY(-1px);
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
      .ka-input:focus { border-color: rgba(212,175,55,0.4); }
      .ka-send {
        width: 38px; height: 38px; border-radius: 50%;
        background: linear-gradient(135deg, #D4AF37, #B8860B);
        border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; flex-shrink: 0;
      }
      .ka-send:hover { transform: scale(1.08); }
      .ka-send:disabled { opacity: 0.4; cursor: default; transform: none; }
      .ka-send svg { width: 16px; height: 16px; fill: #0D0D0D; }

      .ka-typing {
        display: flex; align-items: center; gap: 4px; padding: 12px 16px;
        align-self: flex-start;
      }
      .ka-typing span {
        width: 6px; height: 6px; border-radius: 50%; background: #D4AF37;
        animation: ka-bounce 1.4s ease-in-out infinite;
      }
      .ka-typing span:nth-child(2) { animation-delay: 0.2s; }
      .ka-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes ka-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-6px); opacity: 1; }
      }

      /* Powered by */
      .ka-powered {
        text-align: center; padding: 4px; font-size: 10px; color: #4B5563;
        background: rgba(0,0,0,0.4);
      }

      /* Mobile */
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

    // Create button
    const btn = document.createElement('button');
    btn.id = 'kairos-agent-btn';
    btn.setAttribute('aria-label', 'Abrir chat de Kairos 777');
    btn.innerHTML = `
      <svg class="chat-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
      <svg class="close-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      <div id="kairos-agent-badge">1</div>
    `;
    document.body.appendChild(btn);

    // Create panel
    const panel = document.createElement('div');
    panel.id = 'kairos-agent-panel';
    panel.innerHTML = `
      <div class="ka-header">
        <div class="ka-header-avatar">🪙</div>
        <div class="ka-header-info">
          <h3>Kairos Agent</h3>
          <p>Online — Listo para ayudarte</p>
        </div>
      </div>
      <div class="ka-messages" id="ka-messages"></div>
      <div class="ka-input-area">
        <input class="ka-input" id="ka-input" type="text" placeholder="Escribe tu pregunta..." autocomplete="off" />
        <button class="ka-send" id="ka-send" aria-label="Enviar">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div class="ka-powered">Powered by Kairos 777 AI ✦</div>
    `;
    document.body.appendChild(panel);

    // ── State ──
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

      // Simulate thinking delay (300-800ms)
      const delay = 300 + Math.random() * 500;
      setTimeout(() => {
        hideTyping();
        const response = getResponse(text);
        addMessage(response.text, 'bot', response.showQuickReplies);
        sendBtn.disabled = false;
        inputEl.focus();
      }, delay);
    }

    // ── Events ──
    btn.addEventListener('click', () => {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      btn.classList.toggle('open', isOpen);

      if (isOpen && !hasOpened) {
        hasOpened = true;
        badge.classList.add('hidden');
        // Welcome message
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

    // ── Auto-open after 8 seconds on first visit ──
    if (!sessionStorage.getItem('kairos-agent-seen')) {
      setTimeout(() => {
        if (!isOpen) {
          // Subtle attention animation
          btn.style.animation = 'none';
          btn.offsetHeight; // reflow
          btn.style.animation = 'kairos-pulse 0.5s ease-in-out 3';
          setTimeout(() => { btn.style.animation = 'kairos-pulse 2s ease-in-out infinite'; }, 1500);
        }
      }, 8000);
      sessionStorage.setItem('kairos-agent-seen', '1');
    }
  }

  // ── Init ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }

})();
