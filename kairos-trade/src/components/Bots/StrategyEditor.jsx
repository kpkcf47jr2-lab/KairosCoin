// Kairos Trade — Strategy Editor v2.0
// Clean, intuitive design — similar style to Broker Manager
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2, Play, Save, Copy, Clipboard, X, Zap, TrendingUp,
  AlertTriangle, CheckCircle, BarChart3, Trophy, ArrowDownRight,
  Target, BookOpen, RotateCcw, ChevronRight, Info,
} from 'lucide-react';
import { executeScript, validateScript, backtestScript, SCRIPT_TEMPLATES } from '../../services/kairosScript';
import { marketData } from '../../services/marketData';
import { toApiPair } from '../../utils/pairUtils';

// ─── Smart code extraction from clipboard ───
function extractCodeFromText(raw) {
  let text = raw;
  const codeBlocks = [...text.matchAll(/```(?:javascript|js|jsx)?\s*\n([\s\S]*?)```/g)];
  if (codeBlocks.length > 0) {
    text = codeBlocks.reduce((best, m) => m[1].length > best.length ? m[1] : best, '');
  }
  const lines = text.split('\n');
  const codeLines = [];
  let insideCode = false;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();
    if (!insideCode && !trimmed) continue;
    const isCodeLine =
      trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*') ||
      trimmed.startsWith('*') || trimmed.startsWith('*/') ||
      /^(config|const |let |var |if |else|for |while |function |return |buy|sell|log|alert|\{|\}|\(|\)|\/\/)/.test(trimmed) ||
      /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[\(=\.\[]/.test(trimmed) ||
      /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[+\-*/%<>&|!]/.test(trimmed) ||
      /^\}/.test(trimmed);
    if (isCodeLine) { insideCode = true; codeLines.push(line); }
    else if (insideCode) {
      const remaining = lines.slice(idx);
      const hasMore = remaining.some(l => /^(\/\/|config|const |let |var |if |else|buy|sell|log)/.test(l.trim()));
      if (!hasMore) break;
    }
  }
  return codeLines.join('\n').trim() || text.trim();
}

// ──────────────────────────────────────────
// CODE EDITOR — visible text, working colors
// ──────────────────────────────────────────
function CodeEditor({ code, onChange, error }) {
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = e.target.selectionStart;
      const end = e.target.selectionEnd;
      onChange(code.substring(0, s) + '  ' + code.substring(end));
      setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = s + 2; }, 0);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const cleaned = extractCodeFromText(pasted);
    const ta = e.target;
    const s = ta.selectionStart;
    const end = ta.selectionEnd;
    const newCode = code.substring(0, s) + cleaned + code.substring(end);
    onChange(newCode);
  };

  const lineCount = (code || '').split('\n').length;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.08)'}` }}>
      {error && (
        <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={13} style={{ color: '#ef4444' }} />
          <span className="text-xs" style={{ color: '#ef4444' }}>{typeof error === 'string' ? error : String(error)}</span>
        </div>
      )}
      <div className="flex" style={{ background: '#0d1117' }}>
        <div className="select-none text-right pr-3 pl-3 pt-4 pb-4 shrink-0 font-mono text-[11px] leading-6"
          style={{ color: '#484f58', background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)', minWidth: 44 }}>
          {Array.from({ length: Math.max(lineCount, 12) }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="flex-1 p-4 font-mono text-[12px] leading-6 resize-none outline-none"
          style={{ background: '#0d1117', color: '#c9d1d9', caretColor: '#3B82F6', minHeight: 260 }}
          placeholder="// Pega o escribe tu código aquí..."
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// BACKTEST RESULTS
// ──────────────────────────────────────────
function BacktestResults({ results }) {
  if (!results) return null;
  const { trades, finalBalance, totalTrades, wins, losses, winRate, totalPnl, maxDrawdown, profitFactor } = results;
  const ok = totalPnl >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Balance', value: `$${finalBalance.toFixed(0)}`, icon: BarChart3, color: ok ? '#00DC82' : '#ef4444' },
          { label: 'Win Rate', value: `${winRate.toFixed(0)}%`, icon: Trophy, color: winRate >= 50 ? '#00DC82' : '#ef4444' },
          { label: 'Drawdown', value: `${maxDrawdown.toFixed(1)}%`, icon: ArrowDownRight, color: maxDrawdown < 10 ? '#00DC82' : '#ef4444' },
          { label: 'Profit F.', value: profitFactor === Infinity ? '∞' : profitFactor.toFixed(2), icon: Target, color: profitFactor >= 1.5 ? '#00DC82' : '#ef4444' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <s.icon size={16} className="mx-auto mb-1" style={{ color: s.color }} />
            <p className="text-[10px]" style={{ color: '#8b949e' }}>{s.label}</p>
            <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs px-4 py-2.5 rounded-xl" style={{ background: 'var(--surface-2)' }}>
        <span style={{ color: '#8b949e' }}>Trades: <b style={{ color: '#c9d1d9' }}>{totalTrades}</b></span>
        <span style={{ color: '#00DC82' }}>✓ {wins}</span>
        <span style={{ color: '#ef4444' }}>✗ {losses}</span>
        <span className="ml-auto font-bold text-sm" style={{ color: ok ? '#00DC82' : '#ef4444' }}>
          {ok ? '+' : ''}${totalPnl.toFixed(2)}
        </span>
      </div>
      {trades.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <table className="w-full text-[11px]">
            <thead><tr style={{ color: '#8b949e', borderBottom: '1px solid var(--border)' }}>
              <th className="text-left p-2.5 text-[10px]">Tipo</th>
              <th className="text-right p-2.5 text-[10px]">Entrada</th>
              <th className="text-right p-2.5 text-[10px]">Salida</th>
              <th className="text-right p-2.5 text-[10px]">P&L</th>
            </tr></thead>
            <tbody>
              {trades.slice(-8).reverse().map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="p-2.5 font-bold" style={{ color: t.side === 'buy' ? '#00DC82' : '#ef4444' }}>
                    {t.side === 'buy' ? 'LONG' : 'SHORT'}
                  </td>
                  <td className="p-2.5 text-right" style={{ color: '#c9d1d9' }}>${t.entryPrice?.toFixed(2)}</td>
                  <td className="p-2.5 text-right" style={{ color: '#c9d1d9' }}>${t.exitPrice?.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-bold" style={{ color: t.pnl >= 0 ? '#00DC82' : '#ef4444' }}>
                    {t.pnl >= 0 ? '+' : ''}${t.pnl?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// ──────────────────────────────────────────
// MAIN STRATEGY EDITOR — clean & intuitive
// ──────────────────────────────────────────
export default function StrategyEditor({ onSave, onClose, initialCode, initialName, editMode = false }) {
  const [name, setName] = useState(initialName || '');
  const [code, setCode] = useState(initialCode || '');
  const [error, setError] = useState(null);
  const [view, setView] = useState('editor');
  const [backtestResults, setBacktestResults] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testPair, setTestPair] = useState('BTCKAIROS');
  const [testTimeframe, setTestTimeframe] = useState('1h');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (code?.trim()) {
        const r = validateScript(code);
        setError(r.valid ? null : r.error);
      } else { setError(null); }
    }, 600);
    return () => clearTimeout(t);
  }, [code]);

  const handleBacktest = async () => {
    setTesting(true); setBacktestResults(null);
    try {
      const candles = await marketData.getCandles(toApiPair(testPair), testTimeframe, 500);
      if (!candles || candles.length < 50) { setError('No hay suficientes datos'); setTesting(false); return; }
      setBacktestResults(backtestScript(code, candles, { initialBalance: 1000, riskPercent: 2 }));
    } catch (err) { setError(`Error: ${err.message}`); }
    setTesting(false);
  };

  const handleSave = () => {
    if (!name.trim()) { setError('Escribe un nombre para tu estrategia'); return; }
    const v = validateScript(code);
    if (!v.valid) { setError(v.error); return; }
    onSave?.({ name: name.trim(), code, type: 'custom_script' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePasteBtn = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) { setCode(extractCodeFromText(text)); setBacktestResults(null); }
    } catch { /* denied */ }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(59,130,246,0.03)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <Code2 size={20} style={{ color: '#3B82F6' }} />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: '#c9d1d9' }}>{editMode ? 'Editar Estrategia' : 'Crear Estrategia'}</h3>
            <p className="text-xs" style={{ color: '#8b949e' }}>Escribe código, elige un template o pega desde ChatGPT</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <X size={16} style={{ color: '#8b949e' }} />
          </button>
        )}
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div className="flex px-5 pt-3 gap-1">
        {[
          { id: 'editor', label: 'Editor', icon: Code2 },
          { id: 'templates', label: 'Templates', icon: BookOpen },
          { id: 'help', label: 'Referencia', icon: Info },
        ].map(tab => {
          const active = view === tab.id;
          return (
            <button key={tab.id} onClick={() => setView(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-xs font-semibold transition-all"
              style={{
                background: active ? 'var(--surface-2)' : 'transparent',
                color: active ? '#3B82F6' : '#8b949e',
                borderBottom: active ? '2px solid #3B82F6' : '2px solid transparent',
              }}>
              <tab.icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-5 space-y-4">

        {/* ═══ EDITOR VIEW ═══ */}
        {view === 'editor' && (
          <>
            {/* Name input */}
            <div>
              <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: '#8b949e' }}>NOMBRE DE LA ESTRATEGIA</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Mi Bot Scalper"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-1 focus:ring-[#D4AF37]"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: '#c9d1d9' }} />
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={handlePasteBtn}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
                style={{ background: 'rgba(0,220,130,0.08)', border: '1px solid rgba(0,220,130,0.2)', color: '#00DC82' }}>
                <Clipboard size={14} /> Pegar Código
              </button>
              <button onClick={() => navigator.clipboard?.writeText(code)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: '#c9d1d9' }}>
                <Copy size={14} /> Copiar
              </button>
              <button onClick={() => { setCode(''); setBacktestResults(null); }}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: '#8b949e' }}>
                <X size={14} /> Limpiar
              </button>
            </div>

            {/* Code editor */}
            <CodeEditor code={code} onChange={(c) => { setCode(c); setBacktestResults(null); }} error={error} />

            {/* ═══ BACKTEST section — separated from Save ═══ */}
            <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(0,220,130,0.03)', border: '1px solid rgba(0,220,130,0.1)' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <Play size={13} style={{ color: '#00DC82' }} />
                <span className="text-[11px] font-bold" style={{ color: '#00DC82' }}>Backtest</span>
                <span className="text-[10px]" style={{ color: '#6b7280' }}>— Prueba tu código con datos reales antes de activar el bot</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={testPair} onChange={(e) => setTestPair(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold outline-none"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: '#c9d1d9' }}>
                  {['BTCKAIROS', 'ETHKAIROS', 'BNBKAIROS', 'SOLKAIROS', 'XRPKAIROS'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={testTimeframe} onChange={(e) => setTestTimeframe(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold outline-none"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: '#c9d1d9' }}>
                  {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => <option key={tf} value={tf}>{tf}</option>)}
                </select>
                <button onClick={handleBacktest} disabled={testing || !!error || !code?.trim()}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background: 'rgba(0,220,130,0.12)', border: '1px solid rgba(0,220,130,0.25)', color: '#00DC82' }}>
                  {testing ? <RotateCcw size={12} className="animate-spin" /> : <Play size={12} />}
                  {testing ? 'Probando...' : 'Ejecutar Test'}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {backtestResults && <BacktestResults results={backtestResults} />}
            </AnimatePresence>

            {/* ═══ SAVE button — full width, clearly separated ═══ */}
            <button onClick={handleSave} disabled={!!error || !code?.trim() || !name?.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: saved ? 'rgba(0,220,130,0.15)' : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: saved ? '#00DC82' : '#fff', border: 'none' }}>
              {saved ? <><CheckCircle size={15} /> Estrategia Guardada</> : <><Save size={15} /> Guardar Estrategia</>}
            </button>
          </>
        )}

        {/* ═══ TEMPLATES VIEW ═══ */}
        {view === 'templates' && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: '#8b949e' }}>
              Haz clic en un template para cargarlo en el editor. Puedes modificarlo después.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SCRIPT_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => { setCode(t.code); if (!name) setName(t.name); setView('editor'); setBacktestResults(null); }}
                  className="flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:brightness-110"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <Zap size={18} style={{ color: '#3B82F6' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold" style={{ color: '#c9d1d9' }}>{t.name}</h4>
                    <p className="text-[11px] mt-0.5" style={{ color: '#8b949e' }}>{t.description}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-lg font-bold shrink-0"
                    style={{
                      color: t.difficulty === 'Principiante' ? '#00DC82' : t.difficulty === 'Intermedio' ? '#3B82F6' : '#A855F7',
                      background: t.difficulty === 'Principiante' ? 'rgba(0,220,130,0.1)' : t.difficulty === 'Intermedio' ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)',
                    }}>
                    {t.difficulty}
                  </span>
                  <ChevronRight size={16} style={{ color: '#484f58' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ HELP VIEW ═══ */}
        {view === 'help' && (
          <div className="space-y-4">
            <p className="text-xs" style={{ color: '#8b949e' }}>Funciones disponibles en Kairos Script.</p>

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="px-4 py-2.5" style={{ background: 'rgba(97,175,239,0.06)', borderBottom: '1px solid var(--border)' }}>
                <span className="text-xs font-bold" style={{ color: '#61AFEF' }}>📊 Indicadores</span>
              </div>
              {[
                ['ema(periodo)', 'Media Móvil Exponencial'],
                ['sma(periodo)', 'Media Móvil Simple'],
                ['rsi(periodo)', 'Fuerza Relativa (0-100)'],
                ['macd(f, s, sig)', '.line .signal .histogram'],
                ['bb(periodo, std)', '.upper .middle .lower'],
                ['vwap()', 'Precio Promedio por Volumen'],
              ].map(([fn, desc]) => (
                <div key={fn} className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <code className="text-xs font-bold" style={{ color: '#61AFEF' }}>{fn}</code>
                  <span className="text-[10px]" style={{ color: '#8b949e' }}>{desc}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="px-4 py-2.5" style={{ background: 'rgba(224,108,117,0.06)', borderBottom: '1px solid var(--border)' }}>
                <span className="text-xs font-bold" style={{ color: '#E06C75' }}>⚡ Acciones</span>
              </div>
              {[
                ['buy()', 'Señal de COMPRA'],
                ['sell()', 'Señal de VENTA'],
                ['config({ stopLoss, takeProfit })', 'SL/TP en %'],
                ['log("msg")', 'Log del bot'],
              ].map(([fn, desc]) => (
                <div key={fn} className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <code className="text-xs font-bold" style={{ color: '#E06C75' }}>{fn}</code>
                  <span className="text-[10px]" style={{ color: '#8b949e' }}>{desc}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="px-4 py-2.5" style={{ background: 'rgba(0,220,130,0.06)', borderBottom: '1px solid var(--border)' }}>
                <span className="text-xs font-bold" style={{ color: '#00DC82' }}>🔍 Detección</span>
              </div>
              {[
                ['crossover(a, b)', 'A cruza arriba de B'],
                ['crossunder(a, b)', 'A cruza abajo de B'],
                ['highest(ind, n)', 'Máximo en N barras'],
                ['lowest(ind, n)', 'Mínimo en N barras'],
                ['avg(ind, n)', 'Promedio en N barras'],
                ['percentChange(ind, n)', 'Cambio % en N barras'],
              ].map(([fn, desc]) => (
                <div key={fn} className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <code className="text-xs font-bold" style={{ color: '#00DC82' }}>{fn}</code>
                  <span className="text-[10px]" style={{ color: '#8b949e' }}>{desc}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <span className="text-xs font-bold" style={{ color: '#56B6C2' }}>📈 Variables</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {['close', 'open', 'high', 'low', 'volume', 'price', 'barIndex'].map(v => (
                  <code key={v} className="text-[11px] px-2.5 py-1 rounded-lg font-bold"
                    style={{ background: 'rgba(86,182,194,0.1)', color: '#56B6C2', border: '1px solid rgba(86,182,194,0.2)' }}>
                    {v}
                  </code>
                ))}
              </div>
            </div>

            <button onClick={() => setView('editor')}
              className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:brightness-110"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3B82F6' }}>
              <Code2 size={14} /> Volver al Editor
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}