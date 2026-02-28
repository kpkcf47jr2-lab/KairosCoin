/* ═══════════════════════════════════════════════════════════════
   KAIROS EXCHANGE — AI Agent Widget v2.0
   Smart conversational agent with fuzzy matching, context
   memory, response variations, and natural conversation flow.
   Blue theme matching Kairos Exchange branding.
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
      "¡Hola! 😊 Soy tu asistente de **Kairos Exchange**. ¿En qué te puedo ayudar?",
      "¡Hey! 👋 Bienvenido al **DEX Aggregator** más inteligente. ¿Qué quieres saber?",
      "¡Hola! Soy el agente de **Kairos Exchange** 🔄 ¿Tienes dudas sobre cómo hacer swaps, rutas, o fees?"
    ],

    topics: {
      que_es: {
        keywords: ['que es', 'what is', 'exchange', 'dex', 'agregador', 'aggregator', 'kairos exchange'],
        responses: [
          "**Kairos Exchange** es un DEX Aggregator que busca el **mejor precio** para tus swaps escaneando 100+ DEXes en 5 blockchains. 🔍\n\nEn vez de ir a PancakeSwap o Uniswap directamente, nosotros comparamos TODOS y te damos la mejor ruta.",
          "Es como un **buscador de vuelos** pero para crypto swaps ✈️ Conectamos con PancakeSwap, Uniswap, SushiSwap, Curve, y 100+ más para encontrar el precio óptimo.\n\nSolo conecta tu wallet, elige tokens, y nosotros nos encargamos.",
          "**Kairos Exchange** = mejor precio, menos slippage, más tokens. Agregamos liquidez de todos los DEXes en un solo lugar. 🚀"
        ]
      },
      como_funciona: {
        keywords: ['como funciona', 'how', 'como', 'usar', 'use', 'tutorial', 'pasos', 'steps'],
        responses: [
          "¡Súper fácil! 3 pasos:\n\n1️⃣ **Conecta** tu wallet (MetaMask, Trust, etc.)\n2️⃣ **Selecciona** el token que vendes y el que compras\n3️⃣ Ingresa el monto y haz clic en **Swap**\n\nNosotros buscamos la mejor ruta automáticamente. 🔄",
          "Funciona así:\n\n🔍 Escaneamos 100+ DEXes en tiempo real\n📊 Comparamos precios y split routes\n✅ Ejecutas con un solo clic\n\nTodo on-chain, sin custodia. Tus tokens siempre son tuyos."
        ]
      },
      fees: {
        keywords: ['fee', 'comision', 'costo', 'tarifa', 'cuanto cobra', 'precio', 'descuento', 'discount'],
        responses: [
          "Nuestro fee es **0.15%** por swap — uno de los más bajos del mercado. 💎\n\n🎉 **Bonus**: Si tienes **KAIROS tokens**, pagas solo **0.075%** (50% de descuento).\n\nEl fee se descuenta del output, nunca del input.",
          "**0.15%** base fee. Pero si eres holder de KAIROS, ¡es solo **0.075%**! 🏆\n\nComparación:\n• Uniswap: 0.30%\n• 1inch: 0% (pero cobran spread oculto)\n• Kairos: 0.15% transparente (o 0.075% con KAIROS)"
        ]
      },
      chains: {
        keywords: ['chain', 'cadena', 'red', 'network', 'bsc', 'ethereum', 'polygon', 'arbitrum', 'base', 'blockchain'],
        responses: [
          "Soportamos **5 blockchains**:\n\n🟡 **BSC** — BNB Chain (la más popular)\n🔵 **Ethereum** — El OG\n💜 **Polygon** — Fees bajísimos\n🔴 **Arbitrum** — Layer 2 rápido\n🔵 **Base** — El nuevo by Coinbase\n\nCambia de cadena con un clic arriba. 👆",
          "¡Multi-chain! Puedes hacer swaps en:\n• BSC, Ethereum, Polygon, Arbitrum, Base\n\nCada cadena tiene sus propios DEXes y tokens. Selecciona la cadena arriba y nosotros mostramos los tokens disponibles."
        ]
      },
      tokens: {
        keywords: ['token', 'moneda', 'coin', 'kairos', 'bnb', 'usdt', 'usdc', 'wbtc', 'eth'],
        responses: [
          "Soportamos **miles de tokens** en cada cadena 🪙\n\nAlgunos populares:\n• **KAIROS** — Nuestro token (1 KAIROS = 1 USD)\n• BNB, ETH, MATIC, ARB\n• USDT, USDC, BUSD, DAI\n• WBTC, LINK, UNI, CAKE\n\nSi no ves un token, pega la dirección del contrato en el buscador.",
          "Puedes intercambiar cualquier token ERC-20/BEP-20. Solo pega la dirección si no aparece en la lista.\n\n⭐ **KAIROS** es especial: te da descuento en fees y es parte del ecosistema Kairos 777."
        ]
      },
      rutas: {
        keywords: ['ruta', 'route', 'routing', 'split', 'mejor precio', 'best price', 'optimizar'],
        responses: [
          "Nuestro **Smart Order Routing** divide tu trade en múltiples rutas para conseguir el mejor precio. 🧠\n\nPor ejemplo, si cambias 10 BNB por USDT:\n• 60% via PancakeSwap (mejor rate)\n• 25% via SushiSwap\n• 15% via DODO\n\nResult: más USDT que yendo a un solo DEX.",
          "El routing funciona así:\n\n1. Consultamos todos los DEXes disponibles\n2. Calculamos la ruta óptima (puede ser split)\n3. Si dividir en 2-3 DEXes da mejor precio, lo hacemos\n\nVes un desglose visual después de cada cotización. 📊"
        ]
      },
      slippage: {
        keywords: ['slippage', 'deslizamiento', 'tolerancia', 'price impact', 'impacto'],
        responses: [
          "**Slippage** es la diferencia entre el precio esperado y el real.\n\n⚙️ En Settings puedes configurar:\n• 0.1% — Swaps menores\n• 0.5% — Recomendado (default)\n• 1.0% — Tokens volátiles\n• 3.0% — Solo si es necesario\n\nSi el precio cambia más que tu tolerancia, la TX se revierte automáticamente.",
          "El slippage es tu protección contra cambios de precio. Default es 0.5%.\n\n⚠️ Si pones slippage muy bajo, tu TX puede fallar.\n⚠️ Si pones muy alto, podrías perder dinero.\n\n0.5% es el sweet spot para la mayoría de trades."
        ]
      },
      mev: {
        keywords: ['mev', 'sandwich', 'front run', 'frontrun', 'bot', 'safe mode', 'proteccion', 'seguro'],
        responses: [
          "¡Buena pregunta! 🛡️ **Safe Mode** protege contra ataques MEV:\n\n• **Sandwich attacks**: Un bot compra antes de ti y vende después\n• **Front-running**: Alguien copia tu TX con más gas\n\nCon Safe Mode ON, tu transacción va por un **mempool privado** (Flashbots). Los bots no pueden verla.",
          "**MEV Protection** (Safe Mode):\n\nSin protección: tu TX es pública → bots pueden atacarte\nCon Safe Mode: TX va directo al validador → invisible para bots 🔒\n\nActívalo en Settings. Recomendado para trades grandes."
        ]
      },
      wallet: {
        keywords: ['wallet', 'billetera', 'metamask', 'trust', 'conectar', 'connect'],
        responses: [
          "Soportamos cualquier wallet compatible con EVM:\n\n🦊 **MetaMask** (la más popular)\n💎 **Trust Wallet**\n🌊 **Coinbase Wallet**\n🔗 **WalletConnect** (cualquier wallet)\n\nHaz clic en **Connect Wallet** arriba a la derecha. 👆",
          "Para conectar:\n1. Clic en 'Connect Wallet'\n2. Selecciona tu wallet (MetaMask, Trust, etc.)\n3. Aprueba la conexión\n\nNunca tenemos acceso a tus llaves privadas. Todo es on-chain y descentralizado. 🔐"
        ]
      },
      seguridad: {
        keywords: ['seguro', 'seguridad', 'safe', 'security', 'confianza', 'trust', 'robo', 'hack'],
        responses: [
          "Tu seguridad es nuestra prioridad 🔐\n\n✅ **Non-custodial**: Nunca tocamos tus fondos\n✅ **Smart contracts auditados** con OpenZeppelin\n✅ **Emergency pause** (circuit breaker)\n✅ **MEV protection** via Safe Mode\n✅ Open source y verificable en BSCScan\n\nTus tokens van directamente del DEX a tu wallet.",
          "Kairos Exchange es **100% descentralizado**:\n\n• No guardamos fondos (non-custodial)\n• Contratos con AccessControl + ReentrancyGuard\n• Emergency withdraw si algo falla\n• Fee cap máximo de 1% (safety)\n• Contratos pausables por guardian"
        ]
      },
      kairos_token: {
        keywords: ['kairos token', 'kairos coin', 'comprar kairos', 'buy kairos', 'stablecoin'],
        responses: [
          "**KAIROS** es un stablecoin pegado al USD (1 KAIROS = 1 USD) 💰\n\nBeneficios de tener KAIROS:\n• 🏆 **50% descuento** en fees del Exchange\n• 🔒 Estabilidad de stablecoin\n• 🌐 Multi-chain: BSC, Base, Arbitrum, Polygon\n\nContrato BSC: `0x14D41707269c7D8b8DFa5095b38824a46dA05da3`",
          "KAIROS es la moneda del ecosistema Kairos 777:\n\n• Stablecoin 1:1 con USD\n• Fee discount en el Exchange\n• Disponible en 4 cadenas\n\n💡 Tip: Compra KAIROS aquí mismo — selecciona como token de compra."
        ]
      },
      dex_list: {
        keywords: ['cuales dex', 'que dex', 'pancakeswap', 'uniswap', 'sushiswap', 'curve', 'lista dex'],
        responses: [
          "Agregamos de 100+ DEXes. Los principales:\n\n🥞 **PancakeSwap** V2 & V3\n🦄 **Uniswap** V2 & V3\n🍣 **SushiSwap**\n🔴 **Curve**\n⚖️ **Balancer**\n🐤 **DODO**\n💎 **KyberSwap**\n🔷 **Bancor**\n🎩 **TraderJoe**\n⚔️ **Camelot**\n🚴 **Velodrome/Aerodrome**\n\n...y muchos más por cadena.",
          "Depende de la cadena:\n\n**BSC**: PancakeSwap, DODO, Biswap, ApeSwap...\n**Ethereum**: Uniswap, SushiSwap, Curve, Balancer...\n**Arbitrum**: Camelot, SushiSwap, GMX...\n**Base**: Aerodrome, BaseSwap...\n**Polygon**: QuickSwap, SushiSwap...\n\nNosotros buscamos en TODOS para ti."
        ]
      },
      error_swap: {
        keywords: ['error', 'fallo', 'fail', 'revert', 'no funciona', 'problema'],
        responses: [
          "Si tu swap falla, puede ser por:\n\n1️⃣ **Slippage muy bajo** → Sube a 1% o 3%\n2️⃣ **Gas insuficiente** → Asegúrate de tener BNB/ETH para gas\n3️⃣ **Token con tax** → Algunos tokens cobran impuesto, necesitas más slippage\n4️⃣ **Liquidez insuficiente** → Prueba un monto menor\n\nSi persiste, intenta cambiar de ruta o DEX.",
          "Tips para errores:\n\n• Sube slippage a 1-3%\n• Verifica que tienes gas nativo (BNB, ETH...)\n• Si el token tiene fee/tax, necesitas slippage = tax + 0.5%\n• Prueba un monto más pequeño\n• Revisa que estás en la cadena correcta"
        ]
      },
      ecosistema: {
        keywords: ['ecosistema', 'ecosystem', 'kairos 777', 'kaizen', 'mario', 'plataforma'],
        responses: [
          "**Kairos Exchange** es parte del ecosistema **Kairos 777**:\n\n🌐 **Website**: kairos-777.com\n📊 **Trading**: Kairos 777 (trading platform)\n👛 **Wallet**: Kairos Wallet (gestión de assets)\n🔄 **Exchange**: Kairos Exchange (DEX aggregator)\n\nTodo creado por **Kaizen LLC**, fundado por **Mario Isaac**.",
          "El ecosistema completo:\n\n• **Kairos 777** — Trading social + bots\n• **Kairos Wallet** — Tu wallet personal\n• **Kairos Exchange** — DEX Aggregator (estás aquí)\n• **KAIROS Token** — Stablecoin USD-pegged\n\n🙏 In God We Trust"
        ]
      },
      gastos: {
        keywords: ['gas', 'gwei', 'costo transaccion', 'cuanto cuesta'],
        responses: [
          "Costos por cadena (aproximado):\n\n🟡 **BSC**: ~$0.05-0.50 por swap\n🔵 **Ethereum**: ~$2-20 (varía mucho)\n💜 **Polygon**: ~$0.01-0.10\n🔴 **Arbitrum**: ~$0.10-1.00\n🔵 **Base**: ~$0.05-0.50\n\nBSC y Polygon son las más baratas. Te mostramos el estimado antes de confirmar.",
          "El gas lo cobra la blockchain, no nosotros. Cada cadena tiene costos diferentes.\n\n💡 **Tip**: BSC y Polygon tienen gas muy bajo. Para montos pequeños, evita Ethereum mainnet."
        ]
      },
      contacto: {
        keywords: ['contacto', 'soporte', 'ayuda', 'support', 'contact', 'email'],
        responses: [
          "¿Necesitas ayuda personalizada?\n\n📧 Email: support@kairos-777.com\n🌐 Website: kairos-777.com\n📄 Whitepaper: kairos-777.com/whitepaper.html\n\nTambién puedes preguntarme aquí — estoy para ayudarte. 😊",
          "Estoy aquí para ayudarte con cualquier duda del Exchange. Si necesitas soporte técnico:\n\n📧 support@kairos-777.com\n🌐 kairos-777.com"
        ]
      },
    },

    fallbacks: [
      "Hmm, no estoy seguro de eso. 🤔 Prueba preguntar sobre: **swaps, fees, rutas, cadenas, MEV protection**, o **cómo funciona el Exchange**.",
      "No tengo info sobre eso aún. Pero puedo ayudarte con: cómo hacer swaps, las cadenas soportadas, fees, slippage, y seguridad. 💡",
      "¿Podrías reformular? Soy experto en: DEX aggregation, rutas de swap, fees, cadenas, y el ecosistema Kairos. 😊"
    ],

    followUps: {
      que_es: "💡 ¿Quieres saber cómo funciona o cuáles son los fees?",
      como_funciona: "🔍 ¿Te interesa saber sobre las rutas o el Safe Mode?",
      fees: "💎 ¿Sabías que puedes obtener 50% descuento con KAIROS tokens?",
      rutas: "🛡️ ¿Sabías que tenemos protección MEV con Safe Mode?",
      mev: "⚙️ Actívalo en Settings → Safe Mode → ON",
      slippage: "💡 También tenemos Safe Mode para protección extra.",
      chains: "🔄 ¿En qué cadena quieres operar?",
      seguridad: "🔐 ¿Quieres saber más sobre MEV protection?",
    }
  };

  // ── Topic Matching ──
  function matchTopic(input) {
    const n = norm(input);
    const words = n.split(' ');

    // Greeting check
    const greetWords = ['hola', 'hello', 'hey', 'hi', 'buenas', 'saludos', 'buenos dias', 'que tal'];
    if (greetWords.some(g => n.includes(g)) && words.length <= 4) {
      return { topic: '__greeting', score: 1 };
    }

    let bestTopic = null, bestScore = 0;

    for (const [topicId, topic] of Object.entries(KB.topics)) {
      let score = 0;
      for (const kw of topic.keywords) {
        const kwWords = kw.split(' ');
        if (kwWords.length > 1) {
          // Multi-word keyword: check if phrase exists in input
          if (n.includes(kw)) { score += 3; continue; }
        }
        for (const w of words) {
          for (const kw2 of kwWords) {
            const sim = wordSimilar(w, kw2);
            if (sim >= 0.7) score += sim * 2;
          }
        }
      }
      if (score > bestScore) { bestScore = score; bestTopic = topicId; }
    }

    return bestScore >= 1.2 ? { topic: bestTopic, score: bestScore } : null;
  }

  // ── Generate Response ──
  function respond(input) {
    CTX.turnCount++;
    CTX.history.push(input);

    // Thank you / goodbye
    const n = norm(input);
    if (['gracias','thanks','thank you','ty'].some(t => n.includes(t))) {
      return "¡De nada! 😊 Si tienes más preguntas sobre el Exchange, aquí estaré. Happy swapping! 🔄";
    }
    if (['adios','bye','chao','nos vemos'].some(t => n.includes(t))) {
      return "¡Hasta luego! 👋 Que tus swaps siempre sean al mejor precio. In God We Trust 🙏";
    }

    const match = matchTopic(input);
    if (!match) return pickRandom(KB.fallbacks);

    if (match.topic === '__greeting') return pickRandom(KB.greetings);

    const topic = KB.topics[match.topic];
    let response = pickRandom(topic.responses);

    // Add follow-up if different from last topic
    if (match.topic !== CTX.lastTopic && KB.followUps[match.topic]) {
      response += '\n\n' + KB.followUps[match.topic];
    }

    CTX.lastTopic = match.topic;
    return response;
  }

  // ── Simple Markdown ──
  function md(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code style="background:rgba(59,130,246,0.15);padding:1px 5px;border-radius:4px;font-size:0.85em">$1</code>')
      .replace(/\n/g, '<br>');
  }

  // ═══════════════════════════════════════════════
  //  WIDGET UI — Blue Theme
  // ═══════════════════════════════════════════════

  function initWidget() {
    const ACCENT = '#3B82F6';
    const ACCENT2 = '#2563EB';
    const BG_DARK = '#0B0E15';
    const BG_CARD = '#131722';

    // Styles
    const style = document.createElement('style');
    style.textContent = `
      #kairos-agent-fab { position:fixed; bottom:20px; right:20px; width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg,${ACCENT},${ACCENT2}); color:#fff; border:none; cursor:pointer; box-shadow:0 4px 20px rgba(59,130,246,0.3); z-index:9998; display:flex; align-items:center; justify-content:center; transition:transform 0.2s; font-size:22px; }
      #kairos-agent-fab:hover { transform:scale(1.08); }
      #kairos-agent-window { position:fixed; bottom:86px; right:20px; width:380px; max-height:520px; display:none; flex-direction:column; border-radius:16px; overflow:hidden; box-shadow:0 8px 40px rgba(0,0,0,0.5); z-index:9999; font-family:'Inter',system-ui,sans-serif; border:1px solid rgba(59,130,246,0.15); }
      #kairos-agent-window.open { display:flex; animation:kSlideUp 0.3s ease; }
      @keyframes kSlideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      #ka-header { background:linear-gradient(135deg,${ACCENT},${ACCENT2}); padding:14px 16px; display:flex; align-items:center; justify-content:space-between; }
      #ka-header h3 { color:#fff; font-size:14px; font-weight:700; margin:0; display:flex; align-items:center; gap:8px; }
      #ka-header button { background:rgba(255,255,255,0.2); border:none; color:#fff; width:28px; height:28px; border-radius:8px; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; }
      #ka-messages { flex:1; overflow-y:auto; padding:12px; background:${BG_DARK}; display:flex; flex-direction:column; gap:8px; min-height:300px; max-height:380px; }
      .ka-msg { max-width:85%; padding:10px 14px; border-radius:14px; font-size:13px; line-height:1.5; animation:kFade 0.3s ease; word-wrap:break-word; }
      .ka-msg.bot { background:${BG_CARD}; color:rgba(255,255,255,0.85); border:1px solid rgba(255,255,255,0.05); align-self:flex-start; border-bottom-left-radius:4px; }
      .ka-msg.user { background:rgba(59,130,246,0.15); color:rgba(255,255,255,0.9); align-self:flex-end; border-bottom-right-radius:4px; border:1px solid rgba(59,130,246,0.2); }
      .ka-msg strong { color:${ACCENT}; }
      .ka-msg code { background:rgba(59,130,246,0.1); padding:1px 5px; border-radius:4px; font-size:0.85em; }
      @keyframes kFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      #ka-input-row { display:flex; padding:10px 12px; background:${BG_CARD}; border-top:1px solid rgba(255,255,255,0.05); gap:8px; }
      #ka-input-row input { flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 14px; color:#fff; font-size:13px; outline:none; }
      #ka-input-row input:focus { border-color:rgba(59,130,246,0.4); }
      #ka-input-row input::placeholder { color:rgba(255,255,255,0.3); }
      #ka-input-row button { background:linear-gradient(135deg,${ACCENT},${ACCENT2}); border:none; color:#fff; width:38px; height:38px; border-radius:10px; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:opacity 0.2s; }
      #ka-input-row button:hover { opacity:0.85; }
      @media (max-width:480px) {
        #kairos-agent-window { right:8px; left:8px; bottom:80px; width:auto; max-height:70vh; }
      }
    `;
    document.head.appendChild(style);

    // FAB
    const fab = document.createElement('button');
    fab.id = 'kairos-agent-fab';
    fab.innerHTML = '🔄';
    fab.title = 'Kairos Exchange Agent';
    document.body.appendChild(fab);

    // Window
    const win = document.createElement('div');
    win.id = 'kairos-agent-window';
    win.innerHTML = `
      <div id="ka-header">
        <h3><span style="font-size:18px">🔄</span> Kairos Exchange Agent</h3>
        <button id="ka-close">✕</button>
      </div>
      <div id="ka-messages"></div>
      <div id="ka-input-row">
        <input id="ka-input" type="text" placeholder="Ask about swaps, routes, fees..." autocomplete="off" />
        <button id="ka-send">➤</button>
      </div>
    `;
    document.body.appendChild(win);

    // Logic
    const msgs = win.querySelector('#ka-messages');
    const input = win.querySelector('#ka-input');
    let isOpen = false;

    function addMsg(text, type) {
      const div = document.createElement('div');
      div.className = `ka-msg ${type}`;
      div.innerHTML = md(text);
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function send() {
      const val = input.value.trim();
      if (!val) return;
      addMsg(val, 'user');
      input.value = '';
      setTimeout(() => addMsg(respond(val), 'bot'), 300 + Math.random() * 400);
    }

    fab.onclick = () => {
      isOpen = !isOpen;
      win.classList.toggle('open', isOpen);
      fab.innerHTML = isOpen ? '✕' : '🔄';
      if (isOpen && msgs.children.length === 0) {
        addMsg(pickRandom(KB.greetings), 'bot');
      }
      if (isOpen) setTimeout(() => input.focus(), 200);
    };

    win.querySelector('#ka-close').onclick = () => {
      isOpen = false;
      win.classList.remove('open');
      fab.innerHTML = '🔄';
    };

    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    win.querySelector('#ka-send').onclick = send;
  }

  // ── Init ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
