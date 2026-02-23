// Kairos Trade — Technical Indicators Engine
// All calculations are local — no external API needed

export function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  const ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export function calculateSMA(data, period) {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { sma.push(null); continue; }
    const slice = data.slice(i - period + 1, i + 1);
    sma.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return sma;
}

export function calculateRSI(closes, period = 14) {
  const rsi = new Array(period).fill(null);
  let avgGain = 0, avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
    rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
  }
  return rsi;
}

export function calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = calculateEMA(macdLine, signal);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macd: macdLine, signal: signalLine, histogram };
}

export function calculateBollingerBands(closes, period = 20, stdDev = 2) {
  const sma = calculateSMA(closes, period);
  const upper = [], lower = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(null); lower.push(null); continue; }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const sd = Math.sqrt(variance) * stdDev;
    upper.push(mean + sd);
    lower.push(mean - sd);
  }
  return { upper, middle: sma, lower };
}

export function calculateVWAP(candles) {
  let cumVol = 0, cumTP = 0;
  return candles.map(c => {
    const tp = (c.high + c.low + c.close) / 3;
    cumTP += tp * c.volume;
    cumVol += c.volume;
    return cumVol > 0 ? cumTP / cumVol : tp;
  });
}

// ─── Signal detection ───
export function detectCrossover(line1, line2, index) {
  if (index < 1) return null;
  const prev1 = line1[index - 1], curr1 = line1[index];
  const prev2 = line2[index - 1], curr2 = line2[index];
  if (prev1 <= prev2 && curr1 > curr2) return 'bullish_cross';
  if (prev1 >= prev2 && curr1 < curr2) return 'bearish_cross';
  return null;
}

export function detectDivergence(prices, indicator, lookback = 14) {
  if (prices.length < lookback * 2) return null;
  const len = prices.length;
  const recentPriceHigh = Math.max(...prices.slice(len - lookback));
  const prevPriceHigh = Math.max(...prices.slice(len - lookback * 2, len - lookback));
  const recentIndHigh = Math.max(...indicator.slice(len - lookback).filter(v => v !== null));
  const prevIndHigh = Math.max(...indicator.slice(len - lookback * 2, len - lookback).filter(v => v !== null));

  if (recentPriceHigh > prevPriceHigh && recentIndHigh < prevIndHigh) return 'bearish_divergence';
  if (recentPriceHigh < prevPriceHigh && recentIndHigh > prevIndHigh) return 'bullish_divergence';
  return null;
}
