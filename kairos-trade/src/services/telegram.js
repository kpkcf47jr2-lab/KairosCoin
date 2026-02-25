// Kairos Trade — Telegram Notification Service
// Sends trade alerts, bot status, and signals to Telegram via Bot API

class TelegramService {
  constructor() {
    this.botToken = null;
    this.chatId = null;
    this.enabled = false;
    this.queue = [];
    this.sending = false;
    this.rateLimitDelay = 100; // ms between messages (Telegram limit: 30 msg/sec)
  }

  // ─── Configure ───
  configure(botToken, chatId) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.enabled = !!(botToken && chatId);
    if (this.enabled) {
      console.log('[Telegram] Configured:', chatId);
    }
  }

  // ─── Load from settings ───
  loadFromSettings(settings) {
    if (settings?.telegramBotToken && settings?.telegramChatId) {
      this.configure(settings.telegramBotToken, settings.telegramChatId);
    }
  }

  // ─── Test connection ───
  async testConnection() {
    if (!this.botToken || !this.chatId) {
      return { ok: false, error: 'Bot token y Chat ID requeridos' };
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: '✅ *Kairos Trade conectado*\n\nRecibirás notificaciones de:\n• Trades ejecutados\n• Señales de bot\n• Alertas de precio\n• Estado del sistema',
          parse_mode: 'Markdown',
        }),
      });
      const data = await res.json();
      if (data.ok) return { ok: true };
      return { ok: false, error: data.description || 'Error desconocido' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // ─── Send message (queued) ───
  async send(text, parseMode = 'Markdown') {
    if (!this.enabled) return;
    this.queue.push({ text, parseMode });
    this._processQueue();
  }

  async _processQueue() {
    if (this.sending || this.queue.length === 0) return;
    this.sending = true;

    while (this.queue.length > 0) {
      const { text, parseMode } = this.queue.shift();
      try {
        await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
            parse_mode: parseMode,
            disable_web_page_preview: true,
          }),
        });
      } catch (err) {
        console.warn('[Telegram] Send error:', err.message);
      }
      if (this.queue.length > 0) {
        await new Promise(r => setTimeout(r, this.rateLimitDelay));
      }
    }
    this.sending = false;
  }

  // ─── Pre-formatted notifications ───

  notifyTradeOpen(botName, side, symbol, price, quantity, broker) {
    const emoji = side === 'buy' ? '🟢' : '🔴';
    const text = `${emoji} *TRADE ABIERTO*\n\n`
      + `📊 Bot: *${botName}*\n`
      + `💱 Par: \`${symbol}\`\n`
      + `📈 Lado: *${side.toUpperCase()}*\n`
      + `💰 Precio: \`$${parseFloat(price).toFixed(2)}\`\n`
      + `📦 Cantidad: \`${parseFloat(quantity).toFixed(6)}\`\n`
      + `🏦 Broker: ${broker || 'N/A'}\n`
      + `⏰ ${new Date().toLocaleString('es')}`;
    this.send(text);
  }

  notifyTradeClose(botName, side, symbol, entryPrice, exitPrice, pnl, reason) {
    const emoji = pnl >= 0 ? '💚' : '💔';
    const reasonMap = {
      stop_loss: '🛑 Stop Loss',
      trailing_stop: '📐 Trailing Stop',
      take_profit: '🎯 Take Profit',
      signal: '📊 Señal',
    };
    const text = `${emoji} *TRADE CERRADO*\n\n`
      + `📊 Bot: *${botName}*\n`
      + `💱 Par: \`${symbol}\`\n`
      + `📈 ${side.toUpperCase()}: \`$${parseFloat(entryPrice).toFixed(2)}\` → \`$${parseFloat(exitPrice).toFixed(2)}\`\n`
      + `${pnl >= 0 ? '✅' : '❌'} P&L: *${pnl >= 0 ? '+' : ''}$${parseFloat(pnl).toFixed(2)}*\n`
      + `📌 Razón: ${reasonMap[reason] || reason || 'Manual'}\n`
      + `⏰ ${new Date().toLocaleString('es')}`;
    this.send(text);
  }

  notifyBotStarted(botName, pair, strategy, broker) {
    const text = `🤖 *BOT ACTIVADO*\n\n`
      + `📊 *${botName}*\n`
      + `💱 Par: \`${pair}\`\n`
      + `🎯 Estrategia: ${strategy || 'Custom'}\n`
      + `🏦 Broker: ${broker || 'Demo'}\n`
      + `⏰ ${new Date().toLocaleString('es')}`;
    this.send(text);
  }

  notifyBotStopped(botName, totalTrades, totalPnl) {
    const text = `⏹️ *BOT DETENIDO*\n\n`
      + `📊 *${botName}*\n`
      + `📈 Trades totales: ${totalTrades || 0}\n`
      + `💰 P&L total: *${(totalPnl || 0) >= 0 ? '+' : ''}$${(totalPnl || 0).toFixed(2)}*\n`
      + `⏰ ${new Date().toLocaleString('es')}`;
    this.send(text);
  }

  notifyAlert(type, pair, price, message) {
    const text = `🔔 *ALERTA: ${type.toUpperCase()}*\n\n`
      + `💱 Par: \`${pair}\`\n`
      + `💰 Precio: \`$${parseFloat(price).toFixed(2)}\`\n`
      + `📝 ${message}\n`
      + `⏰ ${new Date().toLocaleString('es')}`;
    this.send(text);
  }

  notifyError(botName, error) {
    const text = `⚠️ *ERROR*\n\n`
      + `📊 Bot: *${botName}*\n`
      + `❌ \`${error}\`\n`
      + `⏰ ${new Date().toLocaleString('es')}`;
    this.send(text);
  }

  notifyDailySummary(stats) {
    const text = `📊 *RESUMEN DIARIO*\n\n`
      + `📈 Trades: ${stats.totalTrades}\n`
      + `✅ Ganados: ${stats.wins} (${stats.winRate?.toFixed(1)}%)\n`
      + `❌ Perdidos: ${stats.losses}\n`
      + `💰 P&L Total: *${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl?.toFixed(2)}*\n`
      + `📉 Max Drawdown: ${stats.maxDrawdown?.toFixed(1)}%\n`
      + `🏆 Mejor trade: +$${stats.bestTrade?.toFixed(2)}\n`
      + `\n_Kairos Trade — ${new Date().toLocaleDateString('es')}_`;
    this.send(text);
  }
}

export const telegramService = new TelegramService();
export default telegramService;
