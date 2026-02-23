// Kairos Trade — AI Assistant Chat
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Brain, Zap, BarChart3, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import useStore from '../../store/useStore';
import aiService from '../../services/ai';

export default function AIChat() {
  const { aiMessages, addAiMessage, aiLoading, setAiLoading, clearAiMessages, currentPrice, selectedPair, priceChange24h } = useStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleSend = async () => {
    if (!input.trim() || aiLoading) return;

    const userMsg = { role: 'user', content: input.trim(), time: new Date().toLocaleTimeString() };
    addAiMessage(userMsg);
    setInput('');
    setAiLoading(true);

    try {
      const marketContext = currentPrice ? {
        symbol: selectedPair,
        price: currentPrice,
        changePercent: priceChange24h,
        high: currentPrice * 1.02,
        low: currentPrice * 0.98,
        volume: 0,
        quoteVolume: 0,
      } : null;

      const response = await aiService.chat(input.trim(), marketContext);

      addAiMessage({
        role: 'assistant',
        content: response.text,
        strategy: response.strategy,
        time: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      addAiMessage({
        role: 'assistant',
        content: `❌ Error: ${err.message}`,
        time: new Date().toLocaleTimeString(),
      });
    }

    setAiLoading(false);
  };

  const quickActions = [
    { label: 'Analiza el mercado', icon: BarChart3, prompt: `Analiza ${selectedPair} ahora mismo` },
    { label: 'Dame una estrategia', icon: Zap, prompt: `Dame una estrategia de trading para ${selectedPair}` },
    { label: '¿Cómo ves BTC?', icon: Sparkles, prompt: '¿Cómo ves Bitcoin hoy?' },
  ];

  const renderMessage = (msg, i) => {
    const isUser = msg.role === 'user';
    return (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`max-w-[85%] rounded-2xl p-3 ${isUser
          ? 'bg-[var(--gold)] text-black rounded-br-md'
          : 'bg-[var(--dark-3)] text-[var(--text)] rounded-bl-md'
        }`}>
          {!isUser && (
            <div className="flex items-center gap-1 mb-1">
              <Brain size={12} className="text-[var(--gold)]" />
              <span className="text-[10px] text-[var(--gold)] font-bold">Kairos AI</span>
            </div>
          )}
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {msg.content.split('\n').map((line, j) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={j} className="font-bold my-0.5">{line.replace(/\*\*/g, '')}</p>;
              }
              if (line.startsWith('•') || line.startsWith('-')) {
                return <p key={j} className="ml-2">{line}</p>;
              }
              return <p key={j}>{line}</p>;
            })}
          </div>

          {/* Strategy card */}
          {msg.strategy && (
            <div className="mt-2 p-2 bg-[var(--dark-4)] rounded-xl border border-[var(--gold)]/20">
              <div className="flex items-center gap-1 mb-1">
                <Zap size={12} className="text-[var(--gold)]" />
                <span className="text-xs font-bold text-[var(--gold)]">Estrategia Lista</span>
              </div>
              <p className="text-xs">{msg.strategy.name || 'Auto Strategy'}</p>
              <button
                onClick={() => {
                  useStore.getState().addStrategy(msg.strategy);
                  addAiMessage({ role: 'assistant', content: '✅ Estrategia guardada. Puedes activarla desde el panel de Bots.', time: new Date().toLocaleTimeString() });
                }}
                className="mt-1 px-3 py-1 bg-[var(--gold)] text-black text-xs font-bold rounded-lg"
              >
                Activar Estrategia
              </button>
            </div>
          )}

          <p className={`text-[10px] mt-1 ${isUser ? 'text-black/50' : 'text-[var(--text-dim)]'}`}>{msg.time}</p>
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
              <p className="text-[10px] text-[var(--text-dim)]">Asistente de trading inteligente</p>
            </div>
          </div>
          <button onClick={clearAiMessages} className="p-1.5 text-[var(--text-dim)] hover:text-[var(--red)] transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {aiMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Brain size={48} className="text-[var(--gold)] mb-4" />
            <h3 className="text-lg font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
              Kairos AI
            </h3>
            <p className="text-sm text-[var(--text-dim)] mb-6 max-w-xs">
              Tu asistente de trading con inteligencia artificial. Pregúntame cualquier cosa sobre el mercado.
            </p>
            <div className="space-y-2 w-full max-w-xs">
              {quickActions.map((qa, i) => {
                const Icon = qa.icon;
                return (
                  <button
                    key={i}
                    onClick={() => { setInput(qa.prompt); }}
                    className="w-full flex items-center gap-2 p-3 bg-[var(--dark-3)] border border-[var(--border)] rounded-xl text-sm hover:border-[var(--gold)]/30 transition-colors text-left"
                  >
                    <Icon size={16} className="text-[var(--gold)] shrink-0" />
                    {qa.label}
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
              <div className="flex items-center gap-1">
                <Brain size={12} className="text-[var(--gold)]" />
                <span className="text-[10px] text-[var(--gold)] font-bold">Kairos AI</span>
              </div>
              <div className="flex gap-1 mt-1">
                <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-bounce" style={{ animationDelay: '300ms' }} />
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
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pregunta sobre el mercado, pide estrategias..."
            className="flex-1 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || aiLoading}
            className="px-4 py-2 bg-[var(--gold)] text-black rounded-xl hover:bg-[var(--gold-light)] transition-colors disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
