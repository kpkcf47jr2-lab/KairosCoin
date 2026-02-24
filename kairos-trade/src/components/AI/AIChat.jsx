// Kairos Trade — AI Trading Expert Chat v2.0
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Brain, Zap, BarChart3, Sparkles, Trash2, Code, Copy, Check, ArrowRightLeft, BookOpen, Target } from 'lucide-react';
import useStore from '../../store/useStore';
import aiService from '../../services/ai';
import { formatPair } from '../../utils/pairUtils';

export default function AIChat() {
  const { aiMessages, addAiMessage, aiLoading, setAiLoading, clearAiMessages, currentPrice, selectedPair, priceChange24h, setSelectedPair, setPage } = useStore();
  const [input, setInput] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleSend = useCallback(async (overrideMsg) => {
    const msg = overrideMsg || input.trim();
    if (!msg || aiLoading) return;

    addAiMessage({ role: 'user', content: msg, time: new Date().toLocaleTimeString() });
    if (!overrideMsg) setInput('');
    setAiLoading(true);

    try {
      const ctx = currentPrice ? {
        symbol: selectedPair, price: currentPrice, changePercent: priceChange24h,
        high: currentPrice * 1.02, low: currentPrice * 0.98, volume: 0, quoteVolume: 0,
      } : null;

      const response = await aiService.chat(msg, ctx);

      // Handle pair change action
      if (response.action?.type === 'changePair') {
        setSelectedPair(response.action.pair);
      }

      addAiMessage({
        role: 'assistant',
        content: response.text,
        strategy: response.strategy,
        kairosScript: response.kairosScript,
        action: response.action,
        time: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      addAiMessage({ role: 'assistant', content: `❌ Error: ${err.message}`, time: new Date().toLocaleTimeString() });
    }

    setAiLoading(false);
  }, [input, aiLoading, currentPrice, selectedPair, priceChange24h]);

  const copyScript = (code, idx) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const quickActions = [
    { label: `Analiza ${formatPair(selectedPair)}`, icon: BarChart3, prompt: `Analiza ${selectedPair}` },
    { label: 'Crea un Script Bot', icon: Code, prompt: `Crea un kairos script ganador para ${selectedPair}` },
    { label: 'Estrategia ganadora', icon: Target, prompt: `Dame una estrategia para ${formatPair(selectedPair)} según el mercado` },
    { label: '¿Qué es el RSI?', icon: BookOpen, prompt: '¿Qué es el RSI y cómo se usa?' },
    { label: 'Muéstrame SOLUSDT', icon: ArrowRightLeft, prompt: 'Muéstrame SOLUSDT' },
    { label: 'Ayuda', icon: Sparkles, prompt: '¿Qué puedes hacer?' },
  ];

  // ─── Render Markdown-like text ───
  const renderText = (text) => {
    return text.split('\n').map((line, j) => {
      // Bold
      let parts = line.split(/(\*\*.*?\*\*)/g);
      const rendered = parts.map((p, k) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={k}>{p.slice(2, -2)}</strong>;
        }
        // Italic
        if (p.startsWith('_') && p.endsWith('_')) {
          return <em key={k} className="text-[var(--text-dim)]">{p.slice(1, -1)}</em>;
        }
        return p;
      });

      if (line.startsWith('━━') || line.startsWith('──')) {
        return <div key={j} className="border-t border-[var(--border)] my-1.5 pt-1">{rendered}</div>;
      }
      if (line.startsWith('•') || line.startsWith('- ')) {
        return <p key={j} className="ml-2 my-0.5">{rendered}</p>;
      }
      if (line === '') return <div key={j} className="h-1" />;
      return <p key={j} className="my-0.5">{rendered}</p>;
    });
  };

  const renderMessage = (msg, i) => {
    const isUser = msg.role === 'user';
    return (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`max-w-[90%] rounded-2xl p-3 ${isUser
          ? 'bg-[var(--gold)] text-white rounded-br-md'
          : 'bg-[var(--dark-3)] text-[var(--text)] rounded-bl-md'
        }`}>
          {!isUser && (
            <div className="flex items-center gap-1 mb-1.5">
              <Brain size={12} className="text-[var(--gold)]" />
              <span className="text-[10px] text-[var(--gold)] font-bold">Kairos AI</span>
            </div>
          )}

          <div className="text-[13px] whitespace-pre-wrap leading-relaxed">
            {renderText(msg.content)}
          </div>

          {/* Pair change badge */}
          {msg.action?.type === 'changePair' && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--gold)]/10 border border-[var(--gold)]/20 rounded-lg">
                <ArrowRightLeft size={12} className="text-[var(--gold)]" />
                <span className="text-xs text-[var(--gold)] font-semibold">Gráfico: {msg.action.pair}</span>
              </div>
              <button
                onClick={() => { setSelectedPair(msg.action.pair); setPage('chart'); }}
                className="px-2 py-1 text-[11px] bg-[var(--dark-4)] text-[var(--text-dim)] hover:text-[var(--gold)] rounded-lg transition-colors"
              >
                Ver gráfico →
              </button>
            </div>
          )}

          {/* Strategy card */}
          {msg.strategy && (
            <div className="mt-2 p-2.5 bg-[var(--dark-4)] rounded-xl border border-[var(--gold)]/20">
              <div className="flex items-center gap-1 mb-1">
                <Zap size={12} className="text-[var(--gold)]" />
                <span className="text-xs font-bold text-[var(--gold)]">Estrategia</span>
              </div>
              <p className="text-xs mb-1">{msg.strategy.name || 'Auto Strategy'}</p>
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-dim)]">
                <span>SL: {msg.strategy.stopLoss}</span>
                <span>TP: {msg.strategy.takeProfit}</span>
                <span>R:R: {msg.strategy.riskReward}</span>
              </div>
              <button
                onClick={() => {
                  useStore.getState().addStrategy(msg.strategy);
                  addAiMessage({ role: 'assistant', content: '✅ Estrategia guardada. Actívala desde **Bots** → crear bot con esta estrategia.', time: new Date().toLocaleTimeString() });
                }}
                className="mt-1.5 px-3 py-1 bg-[var(--gold)] text-white text-xs font-bold rounded-lg hover:bg-[var(--gold-light)] transition-colors"
              >
                Guardar Estrategia
              </button>
            </div>
          )}

          {/* Kairos Script code block */}
          {msg.kairosScript && (
            <div className="mt-2 rounded-xl overflow-hidden border border-[var(--gold)]/20">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--gold)]/10">
                <div className="flex items-center gap-1.5">
                  <Code size={12} className="text-[var(--gold)]" />
                  <span className="text-[11px] font-bold text-[var(--gold)]">Kairos Script</span>
                </div>
                <button
                  onClick={() => copyScript(msg.kairosScript, i)}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-[var(--dark)] rounded-md text-[var(--text-dim)] hover:text-[var(--gold)] transition-colors"
                >
                  {copiedIdx === i ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                </button>
              </div>
              <pre className="p-3 bg-[#0B0E11] text-[11px] leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">
                <code className="text-[var(--text-secondary)]">{msg.kairosScript}</code>
              </pre>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--dark-4)]">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(msg.kairosScript);
                    setCopiedIdx(i);
                    setTimeout(() => setCopiedIdx(null), 2000);
                    setPage('bots');
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-[var(--gold)] text-white text-[11px] font-bold rounded-lg hover:bg-[var(--gold-light)] transition-colors"
                >
                  <Zap size={11} /> Copiar e ir a Bots
                </button>
                <button
                  onClick={() => setPage('strategies')}
                  className="px-2 py-1 text-[11px] text-[var(--text-dim)] hover:text-[var(--gold)] transition-colors"
                >
                  Ver Scripts →
                </button>
              </div>
            </div>
          )}

          <p className={`text-[10px] mt-1.5 ${isUser ? 'text-white/60' : 'text-[var(--text-dim)]'}`}>{msg.time}</p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--dark-2)] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--gold)]/20 flex items-center justify-center">
              <Brain size={18} className="text-[var(--gold)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Kairos AI</h2>
              <p className="text-[10px] text-[var(--text-dim)]">Experto de trading • Análisis en tiempo real</p>
            </div>
          </div>
          <button onClick={() => { clearAiMessages(); aiService.clearHistory(); }} className="p-1.5 text-[var(--text-dim)] hover:text-[var(--red)] transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {aiMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Brain size={48} className="text-[var(--gold)] mb-4" />
            <h3 className="text-lg font-bold mb-1">Kairos AI</h3>
            <p className="text-sm text-[var(--text-dim)] mb-4 max-w-xs">
              Experto en trading. Analizo el mercado, genero estrategias y creo código para bots automáticos.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {quickActions.map((qa, i) => {
                const Icon = qa.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSend(qa.prompt)}
                    className="flex items-center gap-2 p-2.5 bg-[var(--dark-3)] border border-[var(--border)] rounded-xl text-[12px] hover:border-[var(--gold)]/30 transition-colors text-left"
                  >
                    <Icon size={14} className="text-[var(--gold)] shrink-0" />
                    <span className="truncate">{qa.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {aiMessages.map(renderMessage)}

        {aiLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--dark-3)] rounded-2xl rounded-bl-md p-3">
              <div className="flex items-center gap-1 mb-1">
                <Brain size={12} className="text-[var(--gold)]" />
                <span className="text-[10px] text-[var(--gold)] font-bold">Kairos AI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] text-[var(--text-dim)]">Analizando mercado...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--dark-2)] shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Analiza BTC, crea un script, ¿qué es RSI?..."
            className="flex-1 text-sm"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || aiLoading}
            className="px-4 py-2 bg-[var(--gold)] text-white rounded-xl hover:bg-[var(--gold-light)] transition-colors disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
