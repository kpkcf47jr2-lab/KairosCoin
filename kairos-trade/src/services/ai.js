// Kairos Trade — AI Trading Expert v2.0
// Full market analysis engine with Kairos Script generation, chart control, and technical expertise
// Works 100% locally — no API key needed

import marketData from './marketData';
import { calculateEMA, calculateSMA, calculateRSI, calculateMACD, calculateBollingerBands, calculateVWAP, detectCrossover, detectDivergence } from './indicators';
import { CHATGPT_PROMPT } from './kairosScript';

// ═══════════════════════════════════════════════════════════
// KNOWLEDGE BASE — Trading Education & Terminology
// ═══════════════════════════════════════════════════════════

const KB = {
  ema: 'La **EMA (Media Móvil Exponencial)** da más peso a los precios recientes. EMA 20 corto plazo, EMA 50 mediano, EMA 200 largo. Cuando EMA rápida cruza encima de la lenta = señal de compra (Golden Cross). Cuando cruza debajo = señal de venta (Death Cross).',
  sma: 'La **SMA (Media Móvil Simple)** es el promedio aritmético de los últimos N precios. SMA 200 es la referencia institucional de tendencia a largo plazo.',
  rsi: 'El **RSI (Índice de Fuerza Relativa)** mide momentum en escala 0-100. RSI > 70 = sobrecompra (posible caída), RSI < 30 = sobreventa (posible rebote). Divergencias RSI son señales muy poderosas.',
  macd: 'El **MACD** mide momentum con: línea MACD (EMA12 − EMA26), línea de señal (EMA9 del MACD), e histograma. Cruce alcista = compra. Histograma creciente = momentum positivo.',
  bollinger: 'Las **Bandas de Bollinger** forman un canal de volatilidad (SMA ± 2σ). Precio toca banda superior = posible sobrecompra. Compresión (Squeeze) = explosión de volatilidad inminente.',
  vwap: 'El **VWAP** es el precio promedio ponderado por volumen del día. Price > VWAP = sesgo alcista. Es la principal referencia institucional intraday.',
  fibonacci: 'Los retrocesos de **Fibonacci** (23.6%, 38.2%, 50%, 61.8%) identifican soporte/resistencia. El 61.8% (golden ratio) es el nivel más respetado.',
  soporte: '**Soporte** es donde la demanda frena la caída. **Resistencia** donde la oferta frena la subida. Cuando un soporte se rompe, se convierte en resistencia y viceversa.',
  tendencia: '**Tendencia alcista** = máximos y mínimos más altos. **Bajista** = máximos y mínimos más bajos. **Nunca operes contra la tendencia principal.**',
  scalping: '**Scalping** busca ganancias rápidas (0.1-0.5%) en timeframes 1-5 min. Requiere spread bajo, ejecución rápida, y disciplina.',
  swing: '**Swing trading** captura movimientos de 2-10% en días o semanas. Timeframes 4h y 1D. Mejor ratio riesgo/recompensa que scalping.',
  day_trading: '**Day trading** abre y cierra en el mismo día. Timeframes 5m-1h. No hay riesgo overnight.',
  riesgo: '**Regla del 1-2%**: Nunca arriesgues más del 1-2% por trade. Si tienes $10,000, pérdida máxima por operación = $100-200.',
  stop_loss: 'El **Stop Loss** es obligatorio. Métodos: porcentaje fijo (1-3%), debajo de soporte, ATR multiplier, o swing low/high.',
  take_profit: '**Take Profit** debe ser al menos 2x tu Stop Loss (ratio 1:2 mínimo). Usa trailing stops para movimientos grandes.',
  position: '**Position sizing**: Capital × Riesgo% ÷ (Entrada − StopLoss) = Cantidad. Esto controla tu riesgo sin importar el resultado.',
  doji: '**Doji** = apertura ≈ cierre. Indica indecisión. Después de tendencia fuerte = posible reversal.',
  engulfing: '**Engulfing bullish** = vela roja + verde que la envuelve. Señal alcista fuerte en soporte.',
  hammer: '**Hammer** = mecha inferior larga en fondo bajista. Indica rechazo de precios bajos = posible reversal alcista.',
  doble_techo: '**Doble techo** = dos máximos iguales. Reversal bajista. Confirmar con ruptura del neckline.',
  hch: '**Cabeza y hombros** = tres máximos, central más alto. El patrón de reversal más confiable.',
  liquidez: '**Liquidez** se concentra en máximos/mínimos iguales, números redondos y zonas de alto volumen. Market Makers buscan liquidez antes de moverse.',
  order_block: '**Order Block** = zona de órdenes institucionales. Última vela antes de movimiento impulsivo. Precio regresa a estas zonas.',
  funding: '**Funding rate** en futuros indica consenso. Funding muy positivo = exceso de longs, posible caída. Negativo = exceso de shorts, posible subida.',
  bitcoin: '**Bitcoin (BTC)** es la referencia. ~70% de altcoins siguen a BTC. Siempre analiza BTC primero.',
  altseason: '**Altseason** = altcoins superan a Bitcoin (BTC dominance baja). Se identifica cuando ETH/BTC sube.',
  halving: '**Halving** reduce emisión BTC a la mitad cada ~4 años. Históricamente precede bull runs de 12-18 meses.',
  apalancamiento: '**Apalancamiento** multiplica tu exposición. 10x = ganas/pierdes 10 veces más rápido. Para principiantes: máximo 3x. Profesionales: 5-10x con SL estricto.',
  volumen: '**Volumen** confirma movimientos. Ruptura con volumen alto = real. Ruptura sin volumen = probable fake out. Volumen creciente en tendencia = saludable.',
};

// Keyword → KB key mapping
const KB_MAP = {
  ema: ['ema', 'media movil exponencial', 'exponential moving', 'golden cross', 'death cross'],
  sma: ['sma', 'media movil simple', 'simple moving'],
  rsi: ['rsi', 'fuerza relativa', 'relative strength', 'sobrecompra', 'sobreventa', 'overbought', 'oversold'],
  macd: ['macd', 'convergencia divergencia', 'histograma'],
  bollinger: ['bollinger', 'bandas de bollinger', 'bollinger bands', 'squeeze', 'bb '],
  vwap: ['vwap', 'precio ponderado', 'volume weighted'],
  fibonacci: ['fibonacci', 'fibo', 'retroceso', 'golden ratio', '61.8'],
  soporte: ['soporte', 'resistencia', 'support', 'resistance', 'nivel clave'],
  tendencia: ['tendencia', 'trend', 'alcista', 'bajista', 'lateral', 'rango'],
  scalping: ['scalping', 'scalp', 'escalpeo'],
  swing: ['swing trading', 'swing trade'],
  day_trading: ['day trading', 'intradia', 'intraday'],
  riesgo: ['riesgo', 'risk management', 'money management', 'gestion de riesgo'],
  stop_loss: ['stop loss', 'stoploss', 'parar perdida'],
  take_profit: ['take profit', 'tomar ganancia', 'objetivo de ganancia'],
  position: ['position sizing', 'tamano de posicion', 'cuanto invertir', 'cuanto comprar', 'cuanto arriesgar'],
  doji: ['doji', 'vela de indecision'],
  engulfing: ['engulfing', 'envolvente', 'patron de vela'],
  hammer: ['hammer', 'martillo', 'pin bar'],
  doble_techo: ['doble techo', 'double top', 'doble suelo', 'double bottom'],
  hch: ['cabeza y hombros', 'head and shoulders', 'hch'],
  liquidez: ['liquidez', 'liquidity', 'market maker'],
  order_block: ['order block', 'bloque de orden', 'smc', 'smart money'],
  funding: ['funding', 'funding rate'],
  bitcoin: ['dominancia', 'btc dominance'],
  altseason: ['altseason', 'alt season', 'altcoins'],
  halving: ['halving', 'halvening'],
  apalancamiento: ['apalancamiento', 'leverage', 'margen', 'margin'],
  volumen: ['volumen', 'volume', 'vol '],
};

// ═══════════════════════════════════════════════════════════
// AI SERVICE
// ═══════════════════════════════════════════════════════════

class AIService {
  constructor() {
    this.apiKey = null;
    this.model = 'gpt-4o-mini';
    this.conversationHistory = [];
    this._cache = new Map();
    this._cacheTTL = 30000;
  }

  setApiKey(key) { this.apiKey = key; }

  // ─── Main entry ───
  async chat(message, marketContext = null) {
    this.conversationHistory.push({ role: 'user', content: message });
    try {
      const intent = this._parseIntent(message);
      if (this.apiKey) return await this._openAI(message, marketContext, intent);
      return await this._engine(message, marketContext, intent);
    } catch (err) {
      console.error('Kairos AI error:', err);
      const fb = { text: `⚠️ Error: ${err.message}. Intenta de nuevo.`, strategy: null, kairosScript: null, action: null };
      this.conversationHistory.push({ role: 'assistant', content: fb.text });
      return fb;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INTENT PARSER
  // ═══════════════════════════════════════════════════════════

  _parseIntent(message) {
    const msg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Detect pair mentions
    const pm = message.match(/\b([A-Z]{2,10})(USDT|USD|BTC|ETH|BNB|BUSD)\b/i) ||
      message.match(/\b(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|AVAX|DOT|MATIC|LINK|UNI|ATOM|NEAR|APT|ARB|OP|SUI|TIA|JUP|WIF|PEPE|SHIB|LTC|BCH|EOS|TRX|FIL|AAVE|MKR|COMP|SNX|CRV|INJ|SEI|MANTA|STRK|PYTH)\b/i);
    const detectedPair = pm ? (pm[0].toUpperCase().endsWith('USDT') ? pm[0].toUpperCase() : pm[0].toUpperCase() + 'USDT') : null;

    return {
      changePair: !!(msg.match(/\b(cambi|muestra|ponme|pon |abre|ver |quiero ver|busca|grafico de)\b/)),
      analyze: !!(msg.match(/\b(analiz|analisis|como ves|como esta|que ves|revis|resumen|overview)\b/)),
      strategy: !!(msg.match(/\b(estrategia|estratergia|strategy)\b/)),
      kairosScript: !!(msg.match(/\b(script|codigo|code|kairos script)\b/) || (msg.includes('bot') && msg.match(/\b(crea|genera|haz|dame)\b/))),
      education: !!(msg.match(/\b(que es|explica|como funciona|ensen|aprend|como se|que significa|diferencia|que son)\b/)),
      risk: !!(msg.match(/\b(riesgo|stop loss|position siz|gestion|cuanto debo|cuanto arriesg)\b/)),
      predict: !!(msg.match(/\b(subir|bajar|precio|target|objetivo|va a|prediccion|pronostico|proyeccion)\b/)),
      greeting: !!(msg.match(/^(hola|hey|buenas|saludos|hi|hello|que tal|buenos dias|buenas noches|buenas tardes)\b/)),
      help: !!(msg.match(/\b(ayuda|help|puedes|que sabes|funciones|que haces|capacidades)\b/)),
      detectedPair,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // LOCAL ENGINE — Full analysis without API key
  // ═══════════════════════════════════════════════════════════

  async _engine(message, ctx, intent) {
    const msg = message.toLowerCase();

    if (intent.greeting) {
      return this._reply(`👋 ¡Hola! Soy **Kairos AI**, tu experto de trading.\n\n` +
        `Puedo:\n• 📊 **Analizar cualquier par** — "Analiza ETHUSDT"\n• 🎯 **Generar estrategias** — "Dame una estrategia para SOL"\n` +
        `• 💻 **Crear Kairos Script** — "Crea un script para BTC"\n• 🔄 **Cambiar el gráfico** — "Muéstrame SOLUSDT"\n` +
        `• 📚 **Enseñarte trading** — "¿Qué es el RSI?"\n\n¿En qué te ayudo?`);
    }

    if (intent.help) {
      return this._reply(`🤖 **Kairos AI — Capacidades**\n\n` +
        `📊 **Análisis Técnico** — Calculo EMA, SMA, RSI, MACD, BB, VWAP en tiempo real. Detecto cruces, divergencias, y señales.\n\n` +
        `🎯 **Estrategias** — Genero estrategias basadas en el estado actual del mercado con SL/TP calculados.\n\n` +
        `💻 **Kairos Script** — Creo código que puedes copiar → paste en un Script Bot → el bot lo ejecuta automáticamente.\n\n` +
        `🔄 **Control del Gráfico** — "Muéstrame SOL" y cambio el par en pantalla.\n\n` +
        `📚 **Educación** — Pregúntame sobre cualquier indicador, patrón o concepto.\n\n` +
        `Prueba: **"Analiza BTC y crea un script ganador"**`);
    }

    // Change pair
    if (intent.changePair && intent.detectedPair) {
      const pair = intent.detectedPair;
      try {
        const a = await this._analyze(pair);
        return this._reply(`🔄 **Cambiando a ${pair}**\n\n${this._quickSummary(pair, a)}\n\n¿Quieres un análisis completo o un script para ${pair}?`, null, null, { type: 'changePair', pair });
      } catch {
        return this._reply(`🔄 **Cambiando a ${pair}**\nCargando datos...`, null, null, { type: 'changePair', pair });
      }
    }

    // Kairos Script
    if (intent.kairosScript || (intent.strategy && (msg.includes('script') || msg.includes('codigo') || msg.includes('bot')))) {
      const pair = intent.detectedPair || ctx?.symbol || 'BTCUSDT';
      return await this._genScript(pair, ctx);
    }

    // Strategy
    if (intent.strategy) {
      const pair = intent.detectedPair || ctx?.symbol || 'BTCUSDT';
      return await this._genStrategy(pair, ctx);
    }

    // Analyze / predict
    if (intent.analyze || intent.predict) {
      const pair = intent.detectedPair || ctx?.symbol || 'BTCUSDT';
      return await this._fullAnalysis(pair, ctx);
    }

    // Education
    if (intent.education || intent.risk) return this._educate(message);

    // Pair mentioned without clear intent → analyze + change
    if (intent.detectedPair) {
      const pair = intent.detectedPair;
      return await this._fullAnalysis(pair, ctx, { type: 'changePair', pair });
    }

    // Try knowledge base
    const kb = this._matchKB(msg);
    if (kb) return this._reply(kb);

    // Fallback
    return this._reply(`🤖 Entiendo: "${message}"\n\nPuedo:\n• 📊 **"Analiza BTCUSDT"** — Análisis técnico\n• 💻 **"Crea un script para ETH"** — Código para bot\n• 🔄 **"Muéstrame SOLUSDT"** — Cambiar gráfico\n• 📚 **"¿Qué es el MACD?"** — Educación\n\n¿Qué necesitas?`);
  }

  // ═══════════════════════════════════════════════════════════
  // MARKET ANALYSIS ENGINE
  // ═══════════════════════════════════════════════════════════

  async _analyze(pair, tf = '1h', limit = 200) {
    const key = `${pair}_${tf}`;
    const c = this._cache.get(key);
    if (c && Date.now() - c.ts < this._cacheTTL) return c.data;

    const [candles, ticker] = await Promise.all([
      marketData.getCandles(pair, tf, limit),
      marketData.get24hrTicker(pair),
    ]);

    if (!candles || candles.length < 50) throw new Error(`Datos insuficientes para ${pair}`);

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    const len = closes.length;

    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes, 12, 26, 9);
    const bb = calculateBollingerBands(closes, 20, 2);
    const vwap = calculateVWAP(candles);

    const price = closes[len - 1];
    const e20 = ema20[len - 1], e50 = ema50[len - 1], s200 = sma200[len - 1];
    const rsiV = rsi[len - 1];
    const mLine = macd.macd[len - 1], mSig = macd.signal[len - 1], mHist = macd.histogram[len - 1];
    const bbU = bb.upper[len - 1], bbL = bb.lower[len - 1], bbM = bb.middle[len - 1];
    const vwapV = vwap[len - 1];

    const shortT = price > e20 ? 'alcista' : 'bajista';
    const midT = price > e50 ? 'alcista' : 'bajista';
    const longT = s200 ? (price > s200 ? 'alcista' : 'bajista') : 'indefinida';
    const aligned = e20 > e50 && (s200 ? e50 > s200 : true);

    const emaCross = detectCrossover(ema20, ema50, len - 1);
    const macdCross = detectCrossover(macd.macd, macd.signal, len - 1);
    const rsiDiv = detectDivergence(closes, rsi, 14);

    const bbWidth = bbU && bbL ? (bbU - bbL) / bbM * 100 : 0;
    const prevBBW = [];
    for (let i = Math.max(0, len - 20); i < len; i++) {
      if (bb.upper[i] && bb.lower[i] && bb.middle[i]) prevBBW.push((bb.upper[i] - bb.lower[i]) / bb.middle[i] * 100);
    }
    const avgBBW = prevBBW.length > 0 ? prevBBW.reduce((a, b) => a + b, 0) / prevBBW.length : bbWidth;
    const squeeze = bbWidth < avgBBW * 0.75;

    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volRatio = volumes[len - 1] / avgVol;

    const resistance = Math.max(...highs.slice(-20));
    const support = Math.min(...lows.slice(-20));

    // Bull score 0-100
    let score = 50;
    if (shortT === 'alcista') score += 8;
    if (midT === 'alcista') score += 8;
    if (longT === 'alcista') score += 8;
    if (aligned) score += 6;
    if (rsiV > 50 && rsiV < 70) score += 5;
    if (rsiV < 30) score += 10;
    if (rsiV > 70) score -= 10;
    if (mHist > 0) score += 5;
    if (macdCross === 'bullish_cross') score += 10;
    if (macdCross === 'bearish_cross') score -= 10;
    if (emaCross === 'bullish_cross') score += 10;
    if (emaCross === 'bearish_cross') score -= 10;
    if (price > vwapV) score += 5;
    if (rsiDiv === 'bullish_divergence') score += 8;
    if (rsiDiv === 'bearish_divergence') score -= 8;
    if (volRatio > 1.5) score += (shortT === 'alcista' ? 5 : -5);
    score = Math.max(0, Math.min(100, score));

    const data = {
      pair, price, ticker,
      ind: { ema20: e20, ema50: e50, sma200: s200, rsi: rsiV, macdLine: mLine, macdSig: mSig, macdHist: mHist, bbU, bbL, bbM, bbWidth, squeeze, vwap: vwapV },
      trend: { short: shortT, mid: midT, long: longT, aligned, emaCross },
      signals: { rsiDiv, macdCross, volRatio, avgVol },
      levels: { support, resistance },
      score, candles,
    };

    this._cache.set(key, { data, ts: Date.now() });
    return data;
  }

  // ─── Full analysis response ───
  async _fullAnalysis(pair, ctx, action = null) {
    try {
      const a = await this._analyze(pair);
      const { price, ind, trend, signals, levels, score, ticker } = a;

      let bias, emoji;
      if (score >= 70) { bias = 'FUERTEMENTE ALCISTA'; emoji = '🟢🟢'; }
      else if (score >= 55) { bias = 'MODERADAMENTE ALCISTA'; emoji = '🟢'; }
      else if (score >= 45) { bias = 'NEUTRAL / LATERAL'; emoji = '🟡'; }
      else if (score >= 30) { bias = 'MODERADAMENTE BAJISTA'; emoji = '🔴'; }
      else { bias = 'FUERTEMENTE BAJISTA'; emoji = '🔴🔴'; }

      const sigs = [];
      if (trend.emaCross === 'bullish_cross') sigs.push('✅ **Golden Cross** — EMA20 cruzó encima de EMA50');
      if (trend.emaCross === 'bearish_cross') sigs.push('❌ **Death Cross** — EMA20 cruzó debajo de EMA50');
      if (signals.macdCross === 'bullish_cross') sigs.push('✅ **MACD Bullish Cross**');
      if (signals.macdCross === 'bearish_cross') sigs.push('❌ **MACD Bearish Cross**');
      if (ind.rsi < 30) sigs.push('⚡ **RSI Sobreventa** — Posible rebote');
      if (ind.rsi > 70) sigs.push('⚠️ **RSI Sobrecompra** — Posible corrección');
      if (signals.rsiDiv === 'bullish_divergence') sigs.push('🔥 **Divergencia RSI Alcista** — Reversal probable');
      if (signals.rsiDiv === 'bearish_divergence') sigs.push('⚠️ **Divergencia RSI Bajista**');
      if (ind.squeeze) sigs.push('💥 **BB Squeeze** — Explosión inminente');
      if (signals.volRatio > 2) sigs.push(`📊 **Volumen ${signals.volRatio.toFixed(1)}x** sobre promedio`);
      if (trend.aligned) sigs.push('📈 **EMAs Alineadas** — Tendencia fuerte');

      let rec;
      if (score >= 65) rec = `🟢 **BUSCAR COMPRAS** en pullback a EMA20 ($${ind.ema20.toFixed(2)}). SL debajo EMA50. TP: $${levels.resistance.toFixed(2)}.`;
      else if (score >= 45) rec = `🟡 **ESPERAR** — Operar rango $${levels.support.toFixed(2)} - $${levels.resistance.toFixed(2)}.`;
      else rec = `🔴 **PRECAUCIÓN** — Evitar longs. Short target: $${levels.support.toFixed(2)}.`;

      const cp = ticker?.changePercent || 0;
      const text = `📊 **ANÁLISIS — ${pair}**\n\n` +
        `**Precio:** $${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `**24h:** ${cp >= 0 ? '+' : ''}${cp.toFixed(2)}% | **Vol:** $${((ticker?.quoteVolume || 0) / 1e6).toFixed(1)}M\n\n` +
        `━━ **INDICADORES** ━━\n` +
        `• EMA 20: $${ind.ema20.toFixed(2)} ${price > ind.ema20 ? '✅' : '❌'}\n` +
        `• EMA 50: $${ind.ema50.toFixed(2)} ${price > ind.ema50 ? '✅' : '❌'}\n` +
        (ind.sma200 ? `• SMA 200: $${ind.sma200.toFixed(2)} ${price > ind.sma200 ? '✅' : '❌'}\n` : '') +
        `• RSI: ${ind.rsi?.toFixed(1)} ${ind.rsi > 70 ? '⚠️' : ind.rsi < 30 ? '⚡' : '🟢'}\n` +
        `• MACD: ${ind.macdHist > 0 ? '🟢' : '🔴'} ${ind.macdHist?.toFixed(4)}\n` +
        `• BB: ${ind.bbWidth.toFixed(2)}% ${ind.squeeze ? '💥 SQUEEZE' : ''}\n` +
        `• VWAP: $${ind.vwap.toFixed(2)} ${price > ind.vwap ? '✅' : '❌'}\n\n` +
        `━━ **TENDENCIA** ━━\n` +
        `Corto: **${trend.short}** | Medio: **${trend.mid}** | Largo: **${trend.long}**\n` +
        `EMAs alineadas: ${trend.aligned ? '✅' : '❌'}\n\n` +
        `━━ **NIVELES** ━━\n` +
        `Soporte: $${levels.support.toFixed(2)} | Resistencia: $${levels.resistance.toFixed(2)}\n\n` +
        (sigs.length > 0 ? `━━ **SEÑALES** ━━\n${sigs.join('\n')}\n\n` : '') +
        `━━ **VEREDICTO** ━━\n` +
        `${emoji} **${bias}** (Score: ${score}/100)\n\n` +
        `${rec}\n\n` +
        `💡 _Di "crea un script para ${pair}" para generar código automático._`;

      return this._reply(text, null, null, action);
    } catch (err) {
      if (ctx) return this._basicAnalysis(ctx);
      throw err;
    }
  }

  _quickSummary(pair, a) {
    const { price, ind, trend, score } = a;
    const e = score >= 60 ? '🟢' : score >= 40 ? '🟡' : '🔴';
    return `${e} **${pair}** — $${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}\nRSI: ${ind.rsi?.toFixed(1)} | MACD: ${ind.macdHist > 0 ? '🟢' : '🔴'} | Tendencia: ${trend.short}\nScore: **${score}/100**`;
  }

  _basicAnalysis(ctx) {
    const t = ctx.changePercent > 0 ? 'alcista' : 'bajista';
    return this._reply(`📈 **${ctx.symbol}** — $${ctx.price?.toLocaleString()}\nCambio 24h: ${ctx.changePercent > 0 ? '+' : ''}${ctx.changePercent?.toFixed(2)}%\nTendencia: ${t}\n\n⚠️ Para análisis completo con indicadores, carga el gráfico primero.`);
  }

  // ═══════════════════════════════════════════════════════════
  // STRATEGY GENERATOR
  // ═══════════════════════════════════════════════════════════

  async _genStrategy(pair, ctx) {
    try {
      const a = await this._analyze(pair);
      const { ind, trend, score, levels, signals, price } = a;

      let type, name, entry, exit, sl, tp, tf, reason;

      if (score >= 65 && trend.aligned) {
        type = 'ema_cross'; name = `Tendencia Alcista — ${pair}`;
        entry = `EMA 20 > EMA 50 + RSI > 40`; exit = `RSI > 75 o precio < EMA 50`;
        sl = Math.max(1.5, ((price - levels.support) / price * 100)).toFixed(1);
        tp = Math.max(parseFloat(sl) * 2, ((levels.resistance - price) / price * 100)).toFixed(1);
        tf = '1h'; reason = `EMAs alineadas, Score ${score}/100.`;
      } else if (ind.rsi < 35 && signals.rsiDiv === 'bullish_divergence') {
        type = 'ema_cross_rsi'; name = `RSI Reversal — ${pair}`;
        entry = `RSI < 30 + Divergencia alcista`; exit = `RSI > 65`;
        sl = '2'; tp = '5'; tf = '4h'; reason = `RSI ${ind.rsi.toFixed(1)} con divergencia alcista.`;
      } else if (ind.squeeze) {
        type = 'ema_cross'; name = `BB Breakout — ${pair}`;
        entry = `Precio rompe BB superior + volumen alto`; exit = `Precio vuelve dentro de BB`;
        sl = (ind.bbWidth / 2).toFixed(1); tp = (ind.bbWidth * 1.5).toFixed(1); tf = '1h';
        reason = `BB Squeeze (${ind.bbWidth.toFixed(2)}%). Explosión inminente.`;
      } else if (score <= 35) {
        type = 'rsi'; name = `Short Bajista — ${pair}`;
        entry = `Rechazo en EMA 20 + RSI < 50`; exit = `RSI < 25 o soporte`;
        sl = '2'; tp = '4'; tf = '1h'; reason = `Score bajista ${score}/100.`;
      } else {
        type = 'ema_cross_rsi'; name = `Range Trading — ${pair}`;
        entry = `Compra en soporte $${levels.support.toFixed(2)} + RSI < 40`; exit = `RSI > 65 o resistencia`;
        sl = ((price - levels.support) / price * 100 + 0.5).toFixed(1);
        tp = ((levels.resistance - price) / price * 100).toFixed(1); tf = '1h';
        reason = `Lateral, Score ${score}/100.`;
      }

      const rr = (parseFloat(tp) / parseFloat(sl)).toFixed(1);
      const strategy = {
        name, pair, timeframe: tf,
        entry: { condition: entry, indicator: type, params: type === 'ema_cross' ? { fast: 20, slow: 50 } : { fastEma: 20, slowEma: 50, rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 70 } },
        exit: { condition: exit, indicator: 'rsi_overbought', params: { rsiOverbought: 70 } },
        stopLoss: `${sl}%`, takeProfit: `${tp}%`, riskReward: `1:${rr}`,
      };

      const text = `🎯 **ESTRATEGIA — ${pair}**\n\n**${name}**\n\n` +
        `📊 **Razón:** ${reason}\n\n` +
        `**Entrada:** ${entry}\n**Salida:** ${exit}\n` +
        `**SL:** ${sl}% | **TP:** ${tp}% | **R:R:** 1:${rr}\n**TF:** ${tf}\n\n` +
        `Activa con el botón de abajo, o di **"crea un script"** para código de bot.`;

      return this._reply(text, strategy);
    } catch {
      const strategy = {
        name: `Auto — ${pair}`, pair, timeframe: '1h',
        entry: { condition: 'EMA Cross + RSI', indicator: 'ema_cross_rsi', params: { fastEma: 20, slowEma: 50, rsiPeriod: 14, rsiOversold: 35 } },
        exit: { condition: 'RSI > 70', indicator: 'rsi_overbought', params: { rsiOverbought: 70 } },
        stopLoss: '2%', takeProfit: '4%', riskReward: '1:2',
      };
      return this._reply(`🎯 **Estrategia para ${pair}**\n\nEMA Cross + RSI\nSL: 2% | TP: 4% | R:R: 1:2\n\nActiva con el botón.`, strategy);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // KAIROS SCRIPT GENERATOR
  // ═══════════════════════════════════════════════════════════

  async _genScript(pair, ctx) {
    try {
      const a = await this._analyze(pair);
      const { ind, trend, score, levels } = a;

      let script, desc;

      if (score >= 65 && trend.aligned) {
        desc = `Tendencia alcista, Score ${score}/100. EMAs alineadas.`;
        script = `// Tendencia Alcista — ${pair}
// Generado por Kairos AI | Score: ${score}/100
// ─────────────────────────────
// EMA20: $${ind.ema20.toFixed(2)} | EMA50: $${ind.ema50.toFixed(2)} | RSI: ${ind.rsi.toFixed(1)}

const fast = ema(20);
const slow = ema(50);
const momentum = rsi(14);
const m = macd(12, 26, 9);
const v = vwap();

// Compra: Pullback en tendencia alcista
if (close > slow && momentum > 40 && momentum < 70) {
  if (crossover(fast, slow) || (close > fast && m.histogram > 0)) {
    buy();
    log("Compra: Tendencia alcista + momentum positivo");
  }
}

// Rebote en VWAP
if (close > v && crossover(close, fast) && momentum < 60) {
  buy();
  log("Compra: Rebote VWAP");
}

// Venta: Sobrecompra o pérdida de tendencia
if (momentum > 75 || crossunder(fast, slow)) {
  sell();
  log("Venta: " + (momentum > 75 ? "RSI alto" : "Death cross"));
}

config({ stopLoss: ${Math.max(1.5, ((ind.ema20 - levels.support) / ind.ema20 * 100)).toFixed(1)}, takeProfit: ${Math.max(3, ((levels.resistance - ind.ema20) / ind.ema20 * 100)).toFixed(1)} });`;
      } else if (score <= 35) {
        desc = `Tendencia bajista, Score ${score}/100.`;
        script = `// Tendencia Bajista — ${pair}
// Generado por Kairos AI | Score: ${score}/100
// ─────────────────────────────

const fast = ema(20);
const slow = ema(50);
const momentum = rsi(14);
const m = macd(12, 26, 9);

// Short: rechazo de EMA en bajista
if (close < slow && momentum < 55) {
  if (crossunder(fast, slow) || (close < fast && m.histogram < 0)) {
    sell();
    log("Short: Rechazo EMA bajista");
  }
}

// Cubrir: RSI sobreventa extrema
if (momentum < 25) {
  buy();
  log("Cubrir: RSI extremo");
}

config({ stopLoss: 2, takeProfit: 4 });`;
      } else if (ind.squeeze) {
        desc = `BB Squeeze detectado. Volatility breakout.`;
        script = `// BB Breakout — ${pair}
// Generado por Kairos AI | BB Width: ${ind.bbWidth.toFixed(2)}%
// ─────────────────────────────

const bands = bb(20, 2);
const momentum = rsi(14);
const m = macd(12, 26, 9);

// Breakout alcista
if (close > bands.upper && momentum > 50 && momentum < 80 && m.histogram > 0) {
  buy();
  log("Breakout alcista BB");
}

// Breakout bajista
if (close < bands.lower && momentum < 50 && momentum > 20 && m.histogram < 0) {
  sell();
  log("Breakout bajista BB");
}

// Salida
if (close < bands.middle && change(close, 3) < 0) {
  sell();
  log("Salida: momentum perdido");
}

config({ stopLoss: ${(ind.bbWidth / 2).toFixed(1)}, takeProfit: ${(ind.bbWidth * 1.5).toFixed(1)} });`;
      } else if (ind.rsi < 35 || ind.rsi > 65) {
        const os = ind.rsi < 35;
        desc = `RSI ${ind.rsi.toFixed(1)} — ${os ? 'Sobreventa' : 'Sobrecompra'}.`;
        script = `// RSI Reversal — ${pair}
// Generado por Kairos AI | RSI: ${ind.rsi.toFixed(1)}
// ─────────────────────────────

const momentum = rsi(14);
const fast = ema(20);
const slow = ema(50);
const m = macd(12, 26, 9);

${os ? `// Compra en sobreventa
if (momentum < 30 && m.histogram > m.signal) {
  buy();
  log("Compra: RSI sobreventa + MACD girando");
}
if (momentum < 35 && crossover(fast, slow)) {
  buy();
  log("Compra: RSI bajo + Golden Cross");
}
if (momentum > 65) {
  sell();
  log("Venta: tomar ganancia");
}` : `// Venta en sobrecompra
if (momentum > 70 && m.histogram < m.signal) {
  sell();
  log("Venta: RSI sobrecompra");
}
if (momentum < 40) {
  buy();
  log("Cubrir: RSI normalizado");
}`}

config({ stopLoss: 2, takeProfit: 4.5 });`;
      } else {
        desc = `Mercado lateral. Rango $${levels.support.toFixed(2)} — $${levels.resistance.toFixed(2)}.`;
        script = `// Rango — ${pair}
// Generado por Kairos AI | Score: ${score}/100
// Soporte: $${levels.support.toFixed(2)} | Resistencia: $${levels.resistance.toFixed(2)}
// ─────────────────────────────

const bands = bb(20, 2);
const momentum = rsi(14);
const v = vwap();

// Compra en soporte
if (close < bands.lower && momentum < 35) {
  buy();
  log("Compra: soporte BB + RSI bajo");
}
if (crossover(close, v) && momentum < 50) {
  buy();
  log("Compra: rebote VWAP");
}

// Venta en resistencia
if (close > bands.upper && momentum > 65) {
  sell();
  log("Venta: resistencia BB + RSI alto");
}
if (momentum > 75) {
  sell();
  log("Venta: RSI sobrecompra");
}

config({ stopLoss: ${Math.max(1.5, ((levels.resistance - levels.support) / levels.support * 100 / 3)).toFixed(1)}, takeProfit: ${Math.max(2.5, ((levels.resistance - levels.support) / levels.support * 100 * 0.6)).toFixed(1)} });`;
      }

      const text = `💻 **KAIROS SCRIPT — ${pair}**\n\n📊 ${desc}\n\n` +
        `**Cómo usar:**\n1. Copia el código\n2. Ve a **Bots** → Script Bot\n3. Pega → Backtest → Activar\n\n` +
        `_Basado en análisis real — Score: ${score}/100_`;

      return this._reply(text, null, script);
    } catch {
      const script = this._genericScript(pair);
      return this._reply(`💻 **KAIROS SCRIPT — ${pair}**\n\nScript multi-indicador profesional.\n\n**Cómo usar:** Copia → Bots → Script Bot → Backtest → Activar`, null, script);
    }
  }

  _genericScript(pair) {
    return `// Multi-Indicador — ${pair}
// Generado por Kairos AI
// ─────────────────────────────

const fast = ema(20);
const slow = ema(50);
const momentum = rsi(14);
const m = macd(12, 26, 9);
const bands = bb(20, 2);
const v = vwap();

// COMPRA
if (crossover(fast, slow) && momentum > 40 && momentum < 65) {
  buy();
  log("Compra: Golden Cross + RSI ok");
}
if (close < bands.lower && momentum < 30) {
  buy();
  log("Compra: Sobreventa + soporte BB");
}
if (crossover(close, v) && close > fast && momentum > 45) {
  buy();
  log("Compra: VWAP breakout");
}

// VENTA
if (crossunder(fast, slow) && momentum < 55) {
  sell();
  log("Venta: Death Cross");
}
if (momentum > 75 && close > bands.upper) {
  sell();
  log("Venta: Sobrecompra + resistencia BB");
}
if (crossunder(m.line, m.signal) && momentum > 60) {
  sell();
  log("Venta: MACD bearish cross");
}

config({ stopLoss: 2, takeProfit: 4.5 });`;
  }

  // ═══════════════════════════════════════════════════════════
  // EDUCATION ENGINE
  // ═══════════════════════════════════════════════════════════

  _educate(message) {
    const kb = this._matchKB(message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    if (kb) return this._reply(kb);
    return this._reply(`📚 Puedo enseñarte sobre:\n\n` +
      `**Indicadores:** RSI, EMA, SMA, MACD, Bollinger, VWAP, Fibonacci\n` +
      `**Conceptos:** Scalping, Swing, Day Trading, Tendencia, Soporte/Resistencia\n` +
      `**Riesgo:** Stop Loss, Take Profit, Position Sizing, Apalancamiento\n` +
      `**Patrones:** Doji, Engulfing, Hammer, Doble Techo, Cabeza y Hombros\n` +
      `**Avanzado:** Liquidez, Order Blocks, Smart Money, Volumen\n\nPregunta lo que quieras.`);
  }

  _matchKB(msg) {
    const hits = [];
    for (const [key, keywords] of Object.entries(KB_MAP)) {
      if (keywords.some(kw => msg.includes(kw))) hits.push(KB[key]);
    }
    if (hits.length === 0) return null;
    return `📚 **Kairos Academy**\n\n${hits.join('\n\n')}\n\n💡 _¿Quieres que analice un par usando esto? Di "Analiza" + par._`;
  }

  // ═══════════════════════════════════════════════════════════
  // OPENAI (Enhanced)
  // ═══════════════════════════════════════════════════════════

  async _openAI(message, ctx, intent) {
    let extra = '';
    if ((intent.analyze || intent.strategy || intent.kairosScript) && (intent.detectedPair || ctx?.symbol)) {
      try {
        const a = await this._analyze(intent.detectedPair || ctx.symbol);
        extra = `\n\n[DATOS REAL-TIME — ${a.pair}]\nPrecio: $${a.price}\nEMA20: $${a.ind.ema20.toFixed(2)}\nEMA50: $${a.ind.ema50.toFixed(2)}\n` +
          `RSI: ${a.ind.rsi.toFixed(1)}\nMACD: ${a.ind.macdHist.toFixed(6)}\nBB Width: ${a.ind.bbWidth.toFixed(2)}%\n` +
          `Tendencia: ${a.trend.short}/${a.trend.mid}\nScore: ${a.score}/100\nSoporte: $${a.levels.support.toFixed(2)}\nResistencia: $${a.levels.resistance.toFixed(2)}`;
      } catch {}
    }

    const sys = `Eres Kairos AI, experto de trading de Kairos Trade (Kairos 777 Inc). Responde en español. Sé directo y profesional. Usa datos reales proporcionados. Nunca des consejos financieros personales. Incluye siempre SL/TP en estrategias.` +
      (intent.kairosScript ? `\n\nPara Kairos Script:\n${CHATGPT_PROMPT}` : '');

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: sys },
            ...this.conversationHistory.slice(-20).map(m => ({ role: m.role, content: m.content + (m.role === 'user' ? extra : '') })),
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const reply = data.choices[0].message.content;

      let action = null;
      if (intent.changePair && intent.detectedPair) action = { type: 'changePair', pair: intent.detectedPair };

      const scriptMatch = reply.match(/```(?:javascript|kairos|js)?\n([\s\S]*?)```/);
      const kairosScript = scriptMatch ? scriptMatch[1].trim() : null;

      this.conversationHistory.push({ role: 'assistant', content: reply });
      return {
        text: reply.replace(/```(?:javascript|kairos|js)?\n[\s\S]*?```/g, '').trim(),
        strategy: this._extractStrategy(reply),
        kairosScript,
        action,
      };
    } catch {
      return await this._engine(message, ctx, intent);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  _reply(text, strategy = null, kairosScript = null, action = null) {
    this.conversationHistory.push({ role: 'assistant', content: text });
    return { text, strategy, kairosScript, action };
  }

  _extractStrategy(text) {
    const m = text.match(/```strategy\n([\s\S]*?)```/);
    if (m) { try { return JSON.parse(m[1]); } catch {} }
    return null;
  }

  clearHistory() {
    this.conversationHistory = [];
    this._cache.clear();
  }
}

export const aiService = new AIService();
export default aiService;
