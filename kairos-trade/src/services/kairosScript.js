// Kairos Trade — Kairos Script Engine
// Sandboxed strategy execution — users paste code, bots execute trades
// Simpler than Pine Script, more powerful than MQL4

import { calculateEMA, calculateSMA, calculateRSI, calculateMACD, calculateBollingerBands, calculateVWAP, detectCrossover } from './indicators';

// ─── Indicator Result wrapper (auto-converts to number in comparisons) ───
class Indicator {
  constructor(series) {
    this._series = series.map(v => v ?? 0);
    this._value = this._series[this._series.length - 1] || 0;
  }
  valueOf() { return this._value; }
  toString() { return String(this._value); }
  get value() { return this._value; }
  get series() { return this._series; }
  prev(n = 1) { return this._series[this._series.length - 1 - n] || 0; }
  toFixed(d) { return this._value.toFixed(d); }
}

// ─── Build the sandboxed context from market data ───
function buildContext(candles) {
  const closes = candles.map(c => c.close);
  const opens = candles.map(c => c.open);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);
  const len = closes.length;

  // Signal accumulator
  let signal = null;
  let scriptConfig = { stopLoss: 2, takeProfit: 4 };
  const logs = [];

  // ─── Indicator functions (return Indicator objects) ───
  const ema = (period = 20) => new Indicator(calculateEMA(closes, period));
  const sma = (period = 20) => new Indicator(calculateSMA(closes, period));
  const rsi = (period = 14) => new Indicator(calculateRSI(closes, period));

  const macd = (fast = 12, slow = 26, sig = 9) => {
    const result = calculateMACD(closes, fast, slow, sig);
    return {
      line: new Indicator(result.macd),
      signal: new Indicator(result.signal),
      histogram: new Indicator(result.histogram),
      valueOf() { return result.histogram[len - 1] || 0; },
    };
  };

  const bb = (period = 20, stdDev = 2) => {
    const result = calculateBollingerBands(closes, period, stdDev);
    return {
      upper: new Indicator(result.upper),
      middle: new Indicator(result.middle),
      lower: new Indicator(result.lower),
    };
  };

  const vwap = () => new Indicator(calculateVWAP(candles));

  // ─── Crossover detection ───
  const crossover = (a, b) => {
    // Accept Indicator objects or numbers
    const seriesA = a instanceof Indicator ? a.series : (typeof a === 'number' ? [a, a] : []);
    const seriesB = b instanceof Indicator ? b.series : (typeof b === 'number' ? [b, b] : []);
    if (seriesA.length < 2 || seriesB.length < 2) return false;
    const i = Math.min(seriesA.length, seriesB.length) - 1;
    return seriesA[i - 1] <= seriesB[i - 1] && seriesA[i] > seriesB[i];
  };

  const crossunder = (a, b) => {
    const seriesA = a instanceof Indicator ? a.series : (typeof a === 'number' ? [a, a] : []);
    const seriesB = b instanceof Indicator ? b.series : (typeof b === 'number' ? [b, b] : []);
    if (seriesA.length < 2 || seriesB.length < 2) return false;
    const i = Math.min(seriesA.length, seriesB.length) - 1;
    return seriesA[i - 1] >= seriesB[i - 1] && seriesA[i] < seriesB[i];
  };

  // ─── Action functions ───
  const buy = (opts = {}) => {
    signal = { type: 'buy', ...opts };
  };

  const sell = (opts = {}) => {
    signal = { type: 'sell', ...opts };
  };

  const config = (opts = {}) => {
    Object.assign(scriptConfig, opts);
  };

  const log = (msg) => {
    logs.push(String(msg));
  };

  const alert = (msg) => {
    logs.push(`⚠️ ${String(msg)}`);
  };

  // ─── Data access ───
  const close = new Indicator(closes);
  const open = new Indicator(opens);
  const high = new Indicator(highs);
  const low = new Indicator(lows);
  const volume = new Indicator(volumes);
  const price = closes[len - 1] || 0;
  const barIndex = len - 1;

  // ─── Utility math functions ───
  const highest = (ind, period) => {
    const s = ind instanceof Indicator ? ind.series : closes;
    const slice = s.slice(-period);
    return Math.max(...slice.filter(v => v != null));
  };

  const lowest = (ind, period) => {
    const s = ind instanceof Indicator ? ind.series : closes;
    const slice = s.slice(-period);
    return Math.min(...slice.filter(v => v != null));
  };

  const avg = (ind, period) => {
    const s = ind instanceof Indicator ? ind.series : closes;
    const slice = s.slice(-period).filter(v => v != null);
    return slice.reduce((a, b) => a + b, 0) / (slice.length || 1);
  };

  const change = (ind, period = 1) => {
    const s = ind instanceof Indicator ? ind.series : closes;
    const curr = s[s.length - 1] || 0;
    const prev = s[s.length - 1 - period] || 0;
    return curr - prev;
  };

  const percentChange = (ind, period = 1) => {
    const s = ind instanceof Indicator ? ind.series : closes;
    const curr = s[s.length - 1] || 0;
    const prev = s[s.length - 1 - period] || 0;
    return prev !== 0 ? ((curr - prev) / prev) * 100 : 0;
  };

  // All available sandbox variables
  const sandbox = {
    // Indicators
    ema, sma, rsi, macd, bb, vwap,
    // Series data
    close, open, high, low, volume, price, barIndex,
    // Signal detection
    crossover, crossunder,
    // Actions
    buy, sell, config, log, alert,
    // Utilities
    highest, lowest, avg, change, percentChange,
    // Safe math
    Math, Number, parseInt, parseFloat,
    isNaN, isFinite,
    // No access to: window, document, fetch, eval, Function, setTimeout, etc.
  };

  return { sandbox, getSignal: () => signal, getConfig: () => scriptConfig, getLogs: () => logs };
}

// ─── Execute a Kairos Script ───
export function executeScript(code, candles) {
  if (!code || !candles || candles.length < 2) {
    return { signal: null, config: { stopLoss: 2, takeProfit: 4 }, logs: ['No hay datos suficientes'] };
  }

  const { sandbox, getSignal, getConfig, getLogs } = buildContext(candles);

  try {
    // Block dangerous globals by passing them as undefined parameters
    const blockedGlobals = [
      'window', 'document', 'globalThis', 'self',
      'fetch', 'XMLHttpRequest', 'WebSocket',
      'eval', 'Function', 'setTimeout', 'setInterval',
      'importScripts', 'localStorage', 'sessionStorage',
      'indexedDB', 'crypto', 'navigator', 'location',
      'history', 'process', 'require', 'module', 'exports',
      '__dirname', '__filename',
    ];

    const argNames = [...Object.keys(sandbox), ...blockedGlobals];
    const argValues = [
      ...Object.values(sandbox),
      ...blockedGlobals.map(() => undefined),
    ];

    const fn = new Function(...argNames, code);
    fn(...argValues);

    return {
      signal: getSignal(),
      config: getConfig(),
      logs: getLogs(),
      error: null,
    };
  } catch (err) {
    return {
      signal: null,
      config: getConfig(),
      logs: [...getLogs(), `❌ Error: ${err.message}`],
      error: err.message,
    };
  }
}

// ─── Validate a script (check syntax without executing) ───
export function validateScript(code) {
  if (!code || !code.trim()) return { valid: false, error: 'El script está vacío' };

  try {
    // Check for dangerous patterns
    const dangerous = [
      /\beval\s*\(/,
      /\bFunction\s*\(/,
      /\bimport\s*\(/,
      /\brequire\s*\(/,
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bWebSocket\b/,
      /\bwindow\b/,
      /\bdocument\b/,
      /\bprocess\b/,
      /\b__proto__\b/,
      /\bconstructor\s*\[/,
      /\bprototype\b/,
    ];

    for (const pattern of dangerous) {
      if (pattern.test(code)) {
        return { valid: false, error: `Código no permitido: ${pattern.source}` };
      }
    }

    // Try to parse (syntax check)
    new Function(code);
    return { valid: true, error: null };
  } catch (err) {
    return { valid: false, error: `Error de sintaxis: ${err.message}` };
  }
}

// ─── Backtest a script against historical data ───
export function backtestScript(code, candles, config = {}) {
  const { initialBalance = 1000, riskPercent = 2 } = config;
  let balance = initialBalance;
  let position = null;
  const trades = [];
  const equityCurve = [initialBalance];
  const logs = [];

  // Need at least 50 bars for indicators to warm up
  const minBars = 50;
  if (candles.length < minBars) {
    return { trades: [], equityCurve: [initialBalance], finalBalance: initialBalance, logs: ['Se necesitan al menos 50 velas'] };
  }

  // Slide through history, executing the script on each bar
  for (let i = minBars; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const currentPrice = slice[slice.length - 1].close;

    const result = executeScript(code, slice);

    if (result.error) {
      logs.push(`Bar ${i}: ${result.error}`);
      continue;
    }

    const stopLoss = result.config?.stopLoss || 2;
    const takeProfit = result.config?.takeProfit || 4;

    // Check stop loss / take profit on open position
    if (position) {
      const pnlPercent = position.side === 'buy'
        ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100
        : ((position.entryPrice - currentPrice) / position.entryPrice) * 100;

      if (pnlPercent <= -stopLoss || pnlPercent >= takeProfit) {
        const pnl = position.quantity * (currentPrice - position.entryPrice) * (position.side === 'buy' ? 1 : -1);
        balance += pnl;
        trades.push({
          ...position,
          exitPrice: currentPrice,
          exitBar: i,
          pnl,
          pnlPercent,
          reason: pnlPercent >= takeProfit ? 'Take Profit' : 'Stop Loss',
        });
        position = null;
      }
    }

    // Process signal
    if (result.signal) {
      if (result.signal.type === 'buy' && !position) {
        const quantity = (balance * (riskPercent / 100)) / currentPrice;
        position = {
          side: 'buy',
          entryPrice: currentPrice,
          quantity,
          entryBar: i,
        };
      } else if (result.signal.type === 'sell' && position?.side === 'buy') {
        const pnl = position.quantity * (currentPrice - position.entryPrice);
        balance += pnl;
        const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
        trades.push({
          ...position,
          exitPrice: currentPrice,
          exitBar: i,
          pnl,
          pnlPercent,
          reason: 'Signal',
        });
        position = null;
      } else if (result.signal.type === 'sell' && !position) {
        const quantity = (balance * (riskPercent / 100)) / currentPrice;
        position = {
          side: 'sell',
          entryPrice: currentPrice,
          quantity,
          entryBar: i,
        };
      } else if (result.signal.type === 'buy' && position?.side === 'sell') {
        const pnl = position.quantity * (position.entryPrice - currentPrice);
        balance += pnl;
        const pnlPercent = ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
        trades.push({
          ...position,
          exitPrice: currentPrice,
          exitBar: i,
          pnl,
          pnlPercent,
          reason: 'Signal',
        });
        position = null;
      }
    }

    // Record equity
    const unrealizedPnl = position
      ? position.quantity * (
          position.side === 'buy'
            ? (currentPrice - position.entryPrice)
            : (position.entryPrice - currentPrice)
        )
      : 0;
    equityCurve.push(balance + unrealizedPnl);
  }

  // Close any remaining position
  if (position) {
    const lastPrice = candles[candles.length - 1].close;
    const pnl = position.quantity * (
      position.side === 'buy'
        ? (lastPrice - position.entryPrice)
        : (position.entryPrice - lastPrice)
    );
    balance += pnl;
    trades.push({
      ...position,
      exitPrice: lastPrice,
      exitBar: candles.length - 1,
      pnl,
      pnlPercent: ((pnl / position.entryPrice) / position.quantity) * 100,
      reason: 'End of Data',
    });
  }

  const wins = trades.filter(t => t.pnl > 0).length;
  const losses = trades.filter(t => t.pnl <= 0).length;
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const maxDrawdown = calculateMaxDrawdown(equityCurve);

  return {
    trades,
    equityCurve,
    finalBalance: balance,
    totalTrades: trades.length,
    wins,
    losses,
    winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
    totalPnl,
    maxDrawdown,
    profitFactor: losses > 0 ? (trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / Math.abs(trades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0) || 1)) : wins > 0 ? Infinity : 0,
    logs,
  };
}

function calculateMaxDrawdown(equity) {
  let peak = equity[0];
  let maxDD = 0;
  for (const val of equity) {
    if (val > peak) peak = val;
    const dd = ((peak - val) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

// ─── Pre-built script templates ───
export const SCRIPT_TEMPLATES = [
  {
    id: 'ema_cross',
    name: 'EMA Crossover',
    description: 'Compra cuando EMA rápida cruza arriba de EMA lenta, vende al cruce inverso',
    difficulty: 'Principiante',
    code: `// EMA Crossover Strategy
// Señal de compra: EMA rápida cruza arriba de EMA lenta
// Señal de venta: EMA rápida cruza abajo de EMA lenta

const fast = ema(12);
const slow = ema(26);

if (crossover(fast, slow)) {
  buy();
}

if (crossunder(fast, slow)) {
  sell();
}

config({ stopLoss: 2, takeProfit: 4 });`,
  },
  {
    id: 'rsi_reversal',
    name: 'RSI Reversal',
    description: 'Compra en sobreventa (RSI < 30), vende en sobrecompra (RSI > 70)',
    difficulty: 'Principiante',
    code: `// RSI Reversal Strategy
// Compra cuando RSI está sobrevendido
// Vende cuando RSI está sobrecomprado

const rsiVal = rsi(14);

if (rsiVal < 30) {
  buy();
}

if (rsiVal > 70) {
  sell();
}

config({ stopLoss: 1.5, takeProfit: 3 });`,
  },
  {
    id: 'macd_momentum',
    name: 'MACD Momentum',
    description: 'Opera el cruce de la línea MACD con su señal',
    difficulty: 'Intermedio',
    code: `// MACD Momentum Strategy
// Señal de compra: línea MACD cruza arriba de señal
// Señal de venta: línea MACD cruza abajo de señal

const m = macd(12, 26, 9);

if (crossover(m.line, m.signal)) {
  buy();
}

if (crossunder(m.line, m.signal)) {
  sell();
}

config({ stopLoss: 2, takeProfit: 5 });`,
  },
  {
    id: 'bb_squeeze',
    name: 'Bollinger Bands Squeeze',
    description: 'Compra cuando el precio toca la banda inferior, vende en la superior',
    difficulty: 'Intermedio',
    code: `// Bollinger Bands Bounce Strategy
// Compra en banda inferior, vende en banda superior

const bands = bb(20, 2);
const rsiVal = rsi(14);

// Comprar cerca de banda inferior con RSI sobrevendido
if (close < bands.lower && rsiVal < 35) {
  buy();
}

// Vender cerca de banda superior con RSI sobrecomprado
if (close > bands.upper && rsiVal > 65) {
  sell();
}

config({ stopLoss: 1.5, takeProfit: 3 });`,
  },
  {
    id: 'triple_confirmation',
    name: 'Triple Confirmación',
    description: 'EMA + RSI + MACD confirman la señal de entrada — alta probabilidad',
    difficulty: 'Avanzado',
    code: `// Triple Confirmation Strategy
// Requiere 3 indicadores para confirmar entrada
// Alta probabilidad, menos trades pero más precisos

const ema20 = ema(20);
const ema50 = ema(50);
const rsiVal = rsi(14);
const m = macd(12, 26, 9);

// COMPRA: EMA cruce alcista + RSI < 45 + MACD positivo
if (crossover(ema20, ema50) && rsiVal < 45 && m.histogram > 0) {
  buy();
  log("Triple confirmación alcista");
}

// VENTA: EMA cruce bajista + RSI > 55 + MACD negativo
if (crossunder(ema20, ema50) && rsiVal > 55 && m.histogram < 0) {
  sell();
  log("Triple confirmación bajista");
}

config({ stopLoss: 2.5, takeProfit: 6 });`,
  },
  {
    id: 'vwap_scalper',
    name: 'VWAP Scalper',
    description: 'Scalping basado en VWAP con EMA como filtro de tendencia',
    difficulty: 'Avanzado',
    code: `// VWAP Scalper Strategy
// Compra cuando precio cruza arriba de VWAP con tendencia alcista
// Scalping rápido con stops ajustados

const v = vwap();
const trend = ema(50);
const momentum = rsi(10);

// Tendencia alcista + precio cruza VWAP hacia arriba
if (crossover(close, v) && close > trend && momentum > 50) {
  buy();
  log("Long VWAP bounce en tendencia alcista");
}

// Tendencia bajista + precio cruza VWAP hacia abajo
if (crossunder(close, v) && close < trend && momentum < 50) {
  sell();
  log("Short VWAP rejection en tendencia bajista");
}

config({ stopLoss: 0.8, takeProfit: 1.5 });`,
  },
  {
    id: 'custom_blank',
    name: 'Script Vacío',
    description: 'Empieza desde cero — escribe tu propia estrategia',
    difficulty: 'Cualquiera',
    code: `// Mi Estrategia Personalizada
// ─────────────────────────────
// Funciones disponibles:
//   ema(periodo), sma(periodo), rsi(periodo)
//   macd(fast, slow, signal), bb(periodo, stdDev), vwap()
//   crossover(a, b), crossunder(a, b)
//   highest(indicador, periodo), lowest(indicador, periodo)
//   avg(indicador, periodo), change(indicador, periodos)
//   percentChange(indicador, periodos)
//
// Variables: close, open, high, low, volume, price
// Acciones: buy(), sell(), config({ stopLoss, takeProfit })
//           log("mensaje"), alert("alerta")
//
// Tip: Pídele a ChatGPT que te genere una estrategia
//      usando estas funciones!

// Escribe tu estrategia aquí:


config({ stopLoss: 2, takeProfit: 4 });`,
  },
];

// ─── ChatGPT Prompt Generator ───
export const CHATGPT_PROMPT = `Eres un experto creando estrategias de trading para Kairos Script. Genera código usando SOLO estas funciones:

INDICADORES (retornan valores numéricos):
- ema(periodo) — Media Móvil Exponencial
- sma(periodo) — Media Móvil Simple
- rsi(periodo) — Índice de Fuerza Relativa (0-100)
- macd(fast, slow, signal) — retorna { line, signal, histogram }
- bb(periodo, stdDev) — retorna { upper, middle, lower }
- vwap() — Volume Weighted Average Price

DATOS:
- close, open, high, low, volume — valores actuales
- price — precio actual (número)

DETECCIÓN DE CRUCES:
- crossover(a, b) — true si A cruza arriba de B
- crossunder(a, b) — true si A cruza abajo de B

UTILIDADES:
- highest(indicador, periodo) — valor más alto en N períodos
- lowest(indicador, periodo) — valor más bajo en N períodos
- avg(indicador, periodo) — promedio en N períodos
- change(indicador, periodos) — cambio absoluto
- percentChange(indicador, periodos) — cambio porcentual

ACCIONES:
- buy() — señal de compra
- sell() — señal de venta
- config({ stopLoss: %, takeProfit: % }) — configurar SL/TP
- log("mensaje") — registrar mensaje

REGLAS:
1. NO uses window, document, fetch, eval, require, import
2. Solo JavaScript simple (if/else, const/let, operadores)
3. El código se ejecuta en cada vela nueva
4. Siempre incluye config() con stopLoss y takeProfit
5. Las comparaciones con indicadores funcionan directamente (ej: rsi(14) < 30)

Genera SOLO el código, sin explicaciones fuera del código. Usa comentarios en español.`;

export default { executeScript, validateScript, backtestScript, SCRIPT_TEMPLATES, CHATGPT_PROMPT };
