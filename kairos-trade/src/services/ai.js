// Kairos Trade — AI Service
// Market analysis, strategy generation, conversational assistant

const SYSTEM_PROMPT = `Eres Kairos AI, el asistente de trading más avanzado del mundo.
Eres parte de Kairos Trade, la plataforma de trading automatizado de Kairos 777 Inc.

Tu especialidad:
- Análisis técnico (EMA, RSI, MACD, Bollinger Bands, VWAP, estructura de mercado)
- Generación de estrategias de trading automáticas
- Análisis de sentimiento del mercado
- Gestión de riesgo
- Educación en trading

Reglas:
- Responde en español siempre
- Sé directo, conciso y profesional
- Cuando generes estrategias, usa formato JSON estructurado
- Nunca des consejos financieros personales — eres una herramienta de análisis
- Si te piden una estrategia, incluye SIEMPRE: entry, exit, stopLoss, takeProfit, timeframe
- Usa datos técnicos reales cuando los tengas disponibles

Cuando generes una estrategia, responde con un bloque JSON así:
\`\`\`strategy
{
  "name": "Nombre de la estrategia",
  "pair": "BTCUSDT",
  "timeframe": "1h",
  "entry": { "condition": "EMA 20 cruza por encima de EMA 50", "indicator": "ema_cross", "params": { "fast": 20, "slow": 50 } },
  "exit": { "condition": "RSI > 70", "indicator": "rsi", "params": { "period": 14, "threshold": 70 } },
  "stopLoss": "1.5%",
  "takeProfit": "3%",
  "riskReward": "1:2"
}
\`\`\``;

class AIService {
  constructor() {
    this.apiKey = null;
    this.model = 'gpt-4o-mini';
    this.conversationHistory = [];
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  // ─── Chat with AI ───
  async chat(message, marketContext = null) {
    // Build context-aware message
    let enrichedMessage = message;
    if (marketContext) {
      enrichedMessage += `\n\n[Datos del mercado actual]\nPar: ${marketContext.symbol}\nPrecio: $${marketContext.price}\nCambio 24h: ${marketContext.changePercent}%\nVolumen: ${marketContext.volume}\nMáximo 24h: $${marketContext.high}\nMínimo 24h: $${marketContext.low}`;
    }

    this.conversationHistory.push({ role: 'user', content: enrichedMessage });

    // If no API key, use built-in analysis engine
    if (!this.apiKey) {
      return this._localAnalysis(message, marketContext);
    }

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...this.conversationHistory.slice(-20), // Keep last 20 messages
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'API error');
      }

      const data = await res.json();
      const reply = data.choices[0].message.content;
      this.conversationHistory.push({ role: 'assistant', content: reply });

      return {
        text: reply,
        strategy: this._extractStrategy(reply),
        usage: data.usage,
      };
    } catch (err) {
      console.error('AI error:', err);
      return this._localAnalysis(message, marketContext);
    }
  }

  // ─── Built-in analysis (no API key needed) ───
  _localAnalysis(message, ctx) {
    const msg = message.toLowerCase();

    // Strategy generation
    if (msg.includes('estrategia') || msg.includes('strategy')) {
      const pair = ctx?.symbol || 'BTCUSDT';
      const strategy = {
        name: `Kairos Auto Strategy — ${pair}`,
        pair,
        timeframe: '1h',
        entry: {
          condition: 'EMA 20 cruza por encima de EMA 50 + RSI < 30',
          indicator: 'ema_cross_rsi',
          params: { fastEma: 20, slowEma: 50, rsiPeriod: 14, rsiOversold: 30 },
        },
        exit: {
          condition: 'RSI > 70 o EMA 20 cruza por debajo de EMA 50',
          indicator: 'rsi_overbought',
          params: { rsiOverbought: 70 },
        },
        stopLoss: '2%',
        takeProfit: '4%',
        riskReward: '1:2',
      };

      const text = `📊 **Estrategia generada para ${pair}**\n\n` +
        `**Entrada:** ${strategy.entry.condition}\n` +
        `**Salida:** ${strategy.exit.condition}\n` +
        `**Stop Loss:** ${strategy.stopLoss}\n` +
        `**Take Profit:** ${strategy.takeProfit}\n` +
        `**Risk/Reward:** ${strategy.riskReward}\n\n` +
        `Puedes activar esta estrategia desde el panel de bots.`;

      this.conversationHistory.push({ role: 'assistant', content: text });
      return { text, strategy };
    }

    // Market analysis
    if (msg.includes('analiz') || msg.includes('mercado') || msg.includes('market') || msg.includes('cómo ves')) {
      let analysis = '';
      if (ctx) {
        const trend = ctx.changePercent > 0 ? 'alcista' : ctx.changePercent < -0 ? 'bajista' : 'lateral';
        const strength = Math.abs(ctx.changePercent);
        const momentum = strength > 3 ? 'fuerte' : strength > 1 ? 'moderado' : 'débil';

        analysis = `📈 **Análisis de ${ctx.symbol}**\n\n` +
          `**Precio:** $${ctx.price?.toLocaleString()}\n` +
          `**Tendencia 24h:** ${trend} (${ctx.changePercent > 0 ? '+' : ''}${ctx.changePercent?.toFixed(2)}%)\n` +
          `**Momentum:** ${momentum}\n` +
          `**Rango 24h:** $${ctx.low?.toLocaleString()} — $${ctx.high?.toLocaleString()}\n` +
          `**Volumen:** $${(ctx.quoteVolume / 1e6)?.toFixed(1)}M\n\n` +
          (ctx.changePercent > 2 ? '⚡ El mercado muestra fuerza compradora. Considerar compras en retrocesos.\n' :
           ctx.changePercent < -2 ? '⚠️ Presión vendedora activa. Esperar confirmación de soporte.\n' :
           '📊 Mercado en consolidación. Esperar ruptura para tomar posición.\n') +
          `\n💡 Recomendación: ${trend === 'alcista' ? 'Buscar entradas en pullbacks al EMA 20.' : trend === 'bajista' ? 'Precaución. Esperar divergencia RSI para posible reversal.' : 'Operar rango — comprar soporte, vender resistencia.'}`;
      } else {
        analysis = '📊 Necesito datos del mercado para analizar. Selecciona un par de trading primero.';
      }
      this.conversationHistory.push({ role: 'assistant', content: analysis });
      return { text: analysis, strategy: null };
    }

    // Default response
    const defaultReply = `🤖 Soy **Kairos AI**, tu asistente de trading.\n\n` +
      `Puedo ayudarte con:\n` +
      `• **"Analiza BTC"** — Análisis técnico del mercado\n` +
      `• **"Dame una estrategia para ETHUSDT"** — Generar estrategia automática\n` +
      `• **"¿Cómo ves el mercado?"** — Visión general\n` +
      `• **"Configura un bot"** — Ayuda con automatización\n\n` +
      `¿En qué te puedo ayudar?`;

    this.conversationHistory.push({ role: 'assistant', content: defaultReply });
    return { text: defaultReply, strategy: null };
  }

  // ─── Extract strategy JSON from AI response ───
  _extractStrategy(text) {
    const match = text.match(/```strategy\n([\s\S]*?)```/);
    if (match) {
      try { return JSON.parse(match[1]); }
      catch { return null; }
    }
    return null;
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

export const aiService = new AIService();
export default aiService;
