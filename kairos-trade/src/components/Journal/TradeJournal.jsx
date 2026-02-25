// Kairos Trade — Trade Journal (Elite Feature)
// Manual notes, tags, screenshots, and post-mortem analysis per trade
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Tag, Search, Filter, ArrowUpRight, ArrowDownRight,
  MessageSquare, Star, StarOff, ChevronDown, ChevronUp, Plus,
  X, Camera, Calendar, TrendingUp, TrendingDown, Hash
} from 'lucide-react';
import useStore from '../../store/useStore';

const EMOTION_TAGS = ['😎 Confiado', '😰 Nervioso', '🤔 Dudoso', '😤 Impulsivo', '🧘 Disciplinado', '🎯 Enfocado'];
const SETUP_TAGS = ['Breakout', 'Pullback', 'Reversal', 'Scalp', 'Swing', 'Trend Following', 'Mean Reversion', 'News'];

export default function TradeJournal() {
  const { tradeHistory } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kairos_journal') || '{}'); } catch { return {}; }
  });
  const [filterTag, setFilterTag] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // date, pnl, rating
  const [expandedId, setExpandedId] = useState(null);

  // Save notes to localStorage
  const saveNote = (tradeId, noteData) => {
    const updated = { ...notes, [tradeId]: { ...notes[tradeId], ...noteData, updatedAt: Date.now() } };
    setNotes(updated);
    localStorage.setItem('kairos_journal', JSON.stringify(updated));
  };

  // Filter and sort trades
  const filteredTrades = useMemo(() => {
    let trades = [...(tradeHistory || [])];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      trades = trades.filter(t =>
        (t.pair || t.symbol || '').toLowerCase().includes(q) ||
        (t.botName || '').toLowerCase().includes(q) ||
        (notes[t.id]?.note || '').toLowerCase().includes(q) ||
        (notes[t.id]?.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (filterTag !== 'all') {
      trades = trades.filter(t => (notes[t.id]?.tags || []).includes(filterTag));
    }

    trades.sort((a, b) => {
      if (sortBy === 'pnl') return Math.abs(b.pnl || 0) - Math.abs(a.pnl || 0);
      if (sortBy === 'rating') return (notes[b.id]?.rating || 0) - (notes[a.id]?.rating || 0);
      return new Date(b.closedAt || b.time || 0) - new Date(a.closedAt || a.time || 0);
    });

    return trades;
  }, [tradeHistory, searchQuery, filterTag, sortBy, notes]);

  // All used tags
  const allTags = useMemo(() => {
    const tags = new Set();
    Object.values(notes).forEach(n => (n.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [notes]);

  // Trade detail card
  const TradeDetail = ({ trade }) => {
    const tradeNotes = notes[trade.id] || {};
    const [localNote, setLocalNote] = useState(tradeNotes.note || '');
    const [localTags, setLocalTags] = useState(tradeNotes.tags || []);
    const [localEmotion, setLocalEmotion] = useState(tradeNotes.emotion || '');
    const [localSetup, setLocalSetup] = useState(tradeNotes.setup || '');
    const [localRating, setLocalRating] = useState(tradeNotes.rating || 0);
    const [localLesson, setLocalLesson] = useState(tradeNotes.lesson || '');

    const handleSave = () => {
      saveNote(trade.id, {
        note: localNote,
        tags: localTags,
        emotion: localEmotion,
        setup: localSetup,
        rating: localRating,
        lesson: localLesson,
      });
    };

    const toggleTag = (tag) => {
      setLocalTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="overflow-hidden"
      >
        <div className="p-4 bg-[var(--dark)] border-t border-[var(--border)] space-y-4">
          {/* Trade summary */}
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-[var(--text-dim)]">Entrada</p>
              <p className="font-mono font-bold">${(trade.entryPrice || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[var(--text-dim)]">Salida</p>
              <p className="font-mono font-bold">${(trade.exitPrice || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[var(--text-dim)]">Duración</p>
              <p className="font-bold">
                {trade.closedAt && trade.time
                  ? (() => {
                    const ms = new Date(trade.closedAt) - new Date(trade.time);
                    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
                    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
                    return `${(ms / 3600000).toFixed(1)}h`;
                  })()
                  : '—'
                }
              </p>
            </div>
            <div>
              <p className="text-[var(--text-dim)]">Bot</p>
              <p className="font-bold">{trade.botName || '—'}</p>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="text-[10px] text-[var(--text-dim)] block mb-1">Calificación del Trade</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setLocalRating(star)}
                  className="transition-colors"
                >
                  {star <= localRating
                    ? <Star size={16} className="text-[var(--gold)] fill-[var(--gold)]" />
                    : <StarOff size={16} className="text-[var(--text-dim)]" />
                  }
                </button>
              ))}
            </div>
          </div>

          {/* Emotion */}
          <div>
            <label className="text-[10px] text-[var(--text-dim)] block mb-1">Estado Emocional</label>
            <div className="flex gap-1.5 flex-wrap">
              {EMOTION_TAGS.map(e => (
                <button
                  key={e}
                  onClick={() => setLocalEmotion(localEmotion === e ? '' : e)}
                  className={`px-2 py-1 text-[10px] rounded-full transition-colors ${localEmotion === e ? 'bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30' : 'bg-white/5 text-[var(--text-dim)] border border-[var(--border)]'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Setup type */}
          <div>
            <label className="text-[10px] text-[var(--text-dim)] block mb-1">Tipo de Setup</label>
            <div className="flex gap-1.5 flex-wrap">
              {SETUP_TAGS.map(s => (
                <button
                  key={s}
                  onClick={() => setLocalSetup(localSetup === s ? '' : s)}
                  className={`px-2 py-1 text-[10px] rounded-full transition-colors ${localSetup === s ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-[var(--text-dim)] border border-[var(--border)]'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Custom tags */}
          <div>
            <label className="text-[10px] text-[var(--text-dim)] block mb-1">Tags Personalizados</label>
            <div className="flex gap-1.5 flex-wrap">
              {localTags.map(tag => (
                <span key={tag} className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded-full flex items-center gap-1">
                  <Hash size={8} /> {tag}
                  <button onClick={() => toggleTag(tag)} className="hover:text-white"><X size={10} /></button>
                </span>
              ))}
              <button
                onClick={() => {
                  const tag = prompt('Nombre del tag:');
                  if (tag?.trim()) toggleTag(tag.trim());
                }}
                className="px-2 py-0.5 text-[10px] bg-white/5 text-[var(--text-dim)] rounded-full flex items-center gap-1 hover:bg-white/10"
              >
                <Plus size={10} /> Tag
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-[var(--text-dim)] block mb-1">Notas del Trade</label>
            <textarea
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              placeholder="¿Por qué tomaste este trade? ¿Qué observaste?"
              className="w-full bg-[var(--dark-2)] border border-[var(--border)] rounded-lg p-2 text-xs h-20 resize-none focus:border-[var(--gold)]/50 outline-none"
            />
          </div>

          {/* Lesson learned */}
          <div>
            <label className="text-[10px] text-[var(--text-dim)] block mb-1">📚 Lección Aprendida</label>
            <textarea
              value={localLesson}
              onChange={(e) => setLocalLesson(e.target.value)}
              placeholder="¿Qué harías diferente la próxima vez?"
              className="w-full bg-[var(--dark-2)] border border-[var(--border)] rounded-lg p-2 text-xs h-16 resize-none focus:border-[var(--gold)]/50 outline-none"
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full py-2 bg-[var(--gold)] text-white font-bold text-sm rounded-xl hover:bg-[var(--gold-light)] transition-colors"
          >
            Guardar Notas
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen size={22} className="text-[var(--gold)]" /> Trade Journal
          </h1>
          <p className="text-sm text-[var(--text-dim)]">Documenta, analiza y mejora tu trading</p>
        </div>
        <div className="text-sm text-[var(--text-dim)]">
          {filteredTrades.length} trades
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Search */}
        <div className="flex items-center gap-1.5 bg-[var(--dark-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 flex-1 min-w-[200px] max-w-[300px]">
          <Search size={14} className="text-[var(--text-dim)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por par, bot, nota..."
            className="bg-transparent text-xs outline-none flex-1"
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-xs bg-[var(--dark-2)] border border-[var(--border)] rounded-lg px-2 py-1.5"
        >
          <option value="date">Más reciente</option>
          <option value="pnl">Mayor P&L</option>
          <option value="rating">Mejor valorado</option>
        </select>

        {/* Tag filter */}
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="text-xs bg-[var(--dark-2)] border border-[var(--border)] rounded-lg px-2 py-1.5"
        >
          <option value="all">Todos los tags</option>
          {allTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
          {SETUP_TAGS.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      {/* Stats summary */}
      {filteredTrades.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            {
              label: 'Win Rate',
              value: `${(filteredTrades.filter(t => t.pnl > 0).length / filteredTrades.length * 100).toFixed(0)}%`,
              color: 'text-emerald-400',
            },
            {
              label: 'Con Notas',
              value: `${filteredTrades.filter(t => notes[t.id]?.note).length}`,
              color: 'text-[var(--gold)]',
            },
            {
              label: 'Avg Rating',
              value: (() => {
                const rated = filteredTrades.filter(t => notes[t.id]?.rating > 0);
                return rated.length > 0
                  ? `${(rated.reduce((s, t) => s + notes[t.id].rating, 0) / rated.length).toFixed(1)} ★`
                  : '—';
              })(),
              color: 'text-yellow-400',
            },
            {
              label: 'Top Setup',
              value: (() => {
                const setups = {};
                filteredTrades.forEach(t => {
                  const s = notes[t.id]?.setup;
                  if (s) setups[s] = (setups[s] || 0) + 1;
                });
                const top = Object.entries(setups).sort((a, b) => b[1] - a[1])[0];
                return top ? top[0] : '—';
              })(),
              color: 'text-blue-400',
            },
          ].map((stat, i) => (
            <div key={i} className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-3 text-center">
              <p className="text-[10px] text-[var(--text-dim)]">{stat.label}</p>
              <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Trade list */}
      {filteredTrades.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <BookOpen size={48} className="text-[var(--text-dim)] mb-4" />
          <h2 className="text-lg font-bold mb-2">Sin trades registrados</h2>
          <p className="text-sm text-[var(--text-dim)]">
            Los trades se registran automáticamente cuando tus bots ejecutan operaciones.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredTrades.map(trade => {
            const tradeNotes = notes[trade.id] || {};
            const isExpanded = expandedId === trade.id;
            const pnl = trade.pnl || 0;
            const isWin = pnl > 0;

            return (
              <div key={trade.id} className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : trade.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  {/* Win/Loss indicator */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isWin ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                    {isWin ? <ArrowUpRight size={16} className="text-emerald-400" /> : <ArrowDownRight size={16} className="text-red-400" />}
                  </div>

                  {/* Trade info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono">{trade.pair || trade.symbol || '—'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${trade.side === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {(trade.side || '—').toUpperCase()}
                      </span>
                      {tradeNotes.rating > 0 && (
                        <span className="text-[10px] text-yellow-400">{'★'.repeat(tradeNotes.rating)}</span>
                      )}
                      {tradeNotes.emotion && (
                        <span className="text-[10px]">{tradeNotes.emotion.split(' ')[0]}</span>
                      )}
                      {tradeNotes.setup && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{tradeNotes.setup}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[var(--text-dim)] mt-0.5">
                      <span>{new Date(trade.closedAt || trade.time || Date.now()).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>${(trade.entryPrice || 0).toFixed(2)} → ${(trade.exitPrice || 0).toFixed(2)}</span>
                      {trade.botName && <span>🤖 {trade.botName}</span>}
                      {tradeNotes.note && <MessageSquare size={10} className="text-[var(--gold)]" />}
                    </div>
                  </div>

                  {/* P&L */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </p>
                  </div>

                  {/* Expand */}
                  {isExpanded ? <ChevronUp size={14} className="text-[var(--text-dim)]" /> : <ChevronDown size={14} className="text-[var(--text-dim)]" />}
                </button>

                <AnimatePresence>
                  {isExpanded && <TradeDetail trade={trade} />}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
