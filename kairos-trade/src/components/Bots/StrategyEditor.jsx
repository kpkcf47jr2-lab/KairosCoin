// Kairos Trade — Strategy Editor (Code Editor + Backtest + Templates)
// Better than Pine Script — simpler, faster, more intuitive
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2, Play, Save, Copy, Clipboard, X, ChevronDown, Zap, TrendingUp,
  AlertTriangle, CheckCircle, BarChart3, Clock, Trophy, ArrowDownRight,
  Target, Percent, BookOpen, MessageSquare, Sparkles, RotateCcw, FileCode,
} from 'lucide-react';
import { executeScript, validateScript, backtestScript, SCRIPT_TEMPLATES, CHATGPT_PROMPT } from '../../services/kairosScript';
import { marketData } from '../../services/marketData';

// ─── Syntax highlighting (lightweight, no dependencies) ───
function highlightCode(code) {
  if (!code) return '';

  // Escape HTML
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comments
  html = html.replace(/(\/\/.*$)/gm, '<span class="ks-comment">$1</span>');

  // Strings
  html = html.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="ks-string">$1</span>');

  // Numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="ks-number">$1</span>');

  // Keywords
  html = html.replace(/\b(const|let|var|if|else|return|true|false|null|undefined)\b/g, '<span class="ks-keyword">$1</span>');

  // Kairos functions (indicators)
  html = html.replace(/\b(ema|sma|rsi|macd|bb|vwap|crossover|crossunder|highest|lowest|avg|change|percentChange)\b/g, '<span class="ks-function">$1</span>');

  // Actions
  html = html.replace(/\b(buy|sell|config|log|alert)\b/g, '<span class="ks-action">$1</span>');

  // Data variables
  html = html.replace(/\b(close|open|high|low|volume|price|barIndex)\b/g, '<span class="ks-data">$1</span>');

  // Properties
  html = html.replace(/\.(line|signal|histogram|upper|middle|lower|stopLoss|takeProfit)\b/g, '.<span class="ks-property">$1</span>');

  return html;
}

// ─── Code Editor Component ───
function CodeEditor({ code, onChange, error, readOnly = false }) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const lines = (code || '').split('\n');
  const lineCount = lines.length;

  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current && lineNumbersRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = (e) => {
    if (readOnly) return;

    // Tab support
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      onChange(newCode);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }

    // Auto-close brackets
    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
    if (pairs[e.key]) {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const selected = code.substring(start, end);
      const newCode = code.substring(0, start) + e.key + selected + pairs[e.key] + code.substring(end);
      onChange(newCode);
      setTimeout(() => {
        e.target.selectionStart = start + 1;
        e.target.selectionEnd = start + 1 + selected.length;
      }, 0);
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden border" style={{ background: '#0a0c10', borderColor: error ? 'var(--red)' : 'var(--border)' }}>
      {/* Editor header */}
      <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold tracking-wider uppercase"
        style={{ background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
        <FileCode size={12} className="text-[var(--gold)]" />
        <span>Kairos Script</span>
        {error && <span className="ml-auto text-[var(--red)] normal-case tracking-normal flex items-center gap-1">
          <AlertTriangle size={10} /> {error}
        </span>}
      </div>

      <div className="flex" style={{ height: 320 }}>
        {/* Line numbers */}
        <div ref={lineNumbersRef} className="select-none text-right pr-3 pl-3 pt-3 overflow-hidden shrink-0 font-mono text-xs leading-[1.65]"
          style={{ color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', width: 48 }}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code area */}
        <div className="relative flex-1 overflow-hidden">
          {/* Syntax highlighted layer */}
          <pre ref={highlightRef} className="absolute inset-0 p-3 font-mono text-xs leading-[1.65] overflow-auto pointer-events-none whitespace-pre-wrap break-words"
            style={{ color: 'var(--text)' }}
            dangerouslySetInnerHTML={{ __html: highlightCode(code) }} />

          {/* Textarea (transparent, on top) */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            spellCheck={false}
            className="absolute inset-0 w-full h-full p-3 font-mono text-xs leading-[1.65] resize-none outline-none bg-transparent caret-[var(--gold)]"
            style={{ color: 'transparent', caretColor: 'var(--gold)', WebkitTextFillColor: 'transparent' }}
            placeholder="// Escribe o pega tu estrategia aquí..."
          />
        </div>
      </div>
    </div>
  );
}

// ─── Backtest Results Panel ───
function BacktestResults({ results, onClose }) {
  if (!results) return null;

  const { trades, equityCurve, finalBalance, totalTrades, wins, losses, winRate, totalPnl, maxDrawdown, profitFactor } = results;
  const isProfit = totalPnl >= 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Balance Final', value: `$${finalBalance.toFixed(2)}`, icon: BarChart3, color: isProfit ? 'var(--green)' : 'var(--red)' },
          { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, icon: Trophy, color: winRate >= 50 ? 'var(--green)' : 'var(--red)' },
          { label: 'Max Drawdown', value: `${maxDrawdown.toFixed(1)}%`, icon: ArrowDownRight, color: maxDrawdown < 10 ? 'var(--green)' : 'var(--red)' },
          { label: 'Profit Factor', value: profitFactor === Infinity ? '∞' : profitFactor.toFixed(2), icon: Target, color: profitFactor >= 1.5 ? 'var(--green)' : 'var(--red)' },
        ].map((stat, i) => (
          <div key={i} className="rounded-lg p-2.5 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <stat.icon size={14} className="mx-auto mb-1" style={{ color: stat.color }} />
            <p className="text-[10px] text-[var(--text-dim)]">{stat.label}</p>
            <p className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--surface-2)' }}>
        <span className="text-[var(--text-dim)]">Total trades: <b className="text-[var(--text)]">{totalTrades}</b></span>
        <span className="text-[var(--green)]">Ganados: <b>{wins}</b></span>
        <span className="text-[var(--red)]">Perdidos: <b>{losses}</b></span>
        <span className="ml-auto font-bold" style={{ color: isProfit ? 'var(--green)' : 'var(--red)' }}>
          {isProfit ? '+' : ''}${totalPnl.toFixed(2)}
        </span>
      </div>

      {/* Equity curve (mini canvas) */}
      <EquityCurveMini data={equityCurve} />

      {/* Recent trades list */}
      {trades.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[var(--text-dim)] text-[10px]" style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left p-2">Tipo</th>
                <th className="text-right p-2">Entrada</th>
                <th className="text-right p-2">Salida</th>
                <th className="text-right p-2">P&L</th>
                <th className="text-right p-2">Razón</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(-10).reverse().map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className={`p-2 font-bold ${t.side === 'buy' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {t.side === 'buy' ? 'LONG' : 'SHORT'}
                  </td>
                  <td className="p-2 text-right text-[var(--text)]">${t.entryPrice?.toFixed(2)}</td>
                  <td className="p-2 text-right text-[var(--text)]">${t.exitPrice?.toFixed(2)}</td>
                  <td className={`p-2 text-right font-bold ${t.pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {t.pnl >= 0 ? '+' : ''}${t.pnl?.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-[var(--text-dim)]">{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// ─── Mini Equity Curve ───
function EquityCurveMini({ data }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const dw = canvas.offsetWidth;
    const dh = canvas.offsetHeight;

    ctx.clearRect(0, 0, dw, dh);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, dh);
    const isProfit = data[data.length - 1] >= data[0];
    gradient.addColorStop(0, isProfit ? 'rgba(0,220,130,0.2)' : 'rgba(255,71,87,0.2)');
    gradient.addColorStop(1, 'transparent');

    // Draw
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * dw;
      const y = dh - ((v - min) / range) * (dh - 8) - 4;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = isProfit ? '#00DC82' : '#FF4757';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fill
    ctx.lineTo(dw, dh);
    ctx.lineTo(0, dh);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [data]);

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider">Equity Curve</span>
        <span className="text-[10px] text-[var(--text-dim)]">{data?.length || 0} bars</span>
      </div>
      <canvas ref={canvasRef} className="w-full" style={{ height: 80 }} />
    </div>
  );
}

// ─── Main Strategy Editor Component ───
export default function StrategyEditor({ onSave, onClose, initialCode, initialName, editMode = false }) {
  const [name, setName] = useState(initialName || '');
  const [code, setCode] = useState(initialCode || SCRIPT_TEMPLATES[SCRIPT_TEMPLATES.length - 1].code);
  const [error, setError] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [backtestResults, setBacktestResults] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testPair, setTestPair] = useState('BTCUSDT');
  const [testTimeframe, setTestTimeframe] = useState('1h');
  const [saved, setSaved] = useState(false);

  // Validate on code change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (code?.trim()) {
        const result = validateScript(code);
        setError(result.valid ? null : result.error);
      } else {
        setError(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [code]);

  const handleTestStrategy = async () => {
    setTesting(true);
    setBacktestResults(null);
    try {
      // Fetch historical candles
      const candles = await marketData.getCandles(testPair, testTimeframe, 500);
      if (!candles || candles.length < 50) {
        setError('No hay suficientes datos para el backtest');
        setTesting(false);
        return;
      }

      const results = backtestScript(code, candles, { initialBalance: 1000, riskPercent: 2 });
      setBacktestResults(results);
    } catch (err) {
      setError(`Error en backtest: ${err.message}`);
    }
    setTesting(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Dale un nombre a tu estrategia');
      return;
    }
    const validation = validateScript(code);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    onSave?.({ name: name.trim(), code, type: 'custom_script' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLoadTemplate = (template) => {
    setCode(template.code);
    if (!name) setName(template.name);
    setShowTemplates(false);
    setBacktestResults(null);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard?.writeText(CHATGPT_PROMPT);
    setShowPrompt(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) {
        setCode(text);
        setBacktestResults(null);
      }
    } catch {
      // Clipboard access denied
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <Code2 size={18} className="text-[var(--gold)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold">{editMode ? 'Editar Estrategia' : 'Nueva Estrategia Custom'}</h3>
            <p className="text-[10px] text-[var(--text-dim)]">Escribe código o pega desde ChatGPT</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors">
            <X size={16} className="text-[var(--text-dim)]" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Strategy name */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi Estrategia EMA Cross"
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--surface-2)]"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <BookOpen size={13} /> Templates
          </button>
          <button onClick={handlePaste}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--surface-2)]"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <Clipboard size={13} /> Pegar
          </button>
          <button onClick={() => navigator.clipboard?.writeText(code)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--surface-2)]"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <Copy size={13} /> Copiar
          </button>
          <button onClick={() => setShowPrompt(!showPrompt)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: 'var(--gold)' }}>
            <Sparkles size={13} /> Prompt ChatGPT
          </button>
          <button onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--surface-2)]"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
            <MessageSquare size={13} /> Ayuda
          </button>
        </div>

        {/* Templates dropdown */}
        <AnimatePresence>
          {showTemplates && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {SCRIPT_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => handleLoadTemplate(t)}
                    className="text-left p-3 rounded-lg transition-colors hover:bg-[var(--dark-3)]"
                    style={{ border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={12} className="text-[var(--gold)]" />
                      <span className="text-xs font-bold text-[var(--text)]">{t.name}</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-dim)] leading-relaxed">{t.description}</p>
                    <span className="text-[9px] mt-1.5 inline-block px-1.5 py-0.5 rounded-md font-bold uppercase"
                      style={{
                        color: t.difficulty === 'Principiante' ? 'var(--green)' : t.difficulty === 'Intermedio' ? 'var(--gold)' : '#A855F7',
                        background: t.difficulty === 'Principiante' ? 'rgba(0,220,130,0.1)' : t.difficulty === 'Intermedio' ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)',
                      }}>
                      {t.difficulty}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ChatGPT prompt helper */}
        <AnimatePresence>
          {showPrompt && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[var(--gold)]" />
                  <span className="text-xs font-bold text-[var(--gold)]">Genera estrategias con ChatGPT</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  1. Copia este prompt → 2. Pégalo en ChatGPT → 3. Dile qué estrategia quieres → 4. Copia el código que te dé → 5. Pégalo aquí
                </p>
                <div className="p-2 rounded-lg font-mono text-[10px] max-h-24 overflow-y-auto"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                  {CHATGPT_PROMPT.slice(0, 200)}...
                </div>
                <button onClick={handleCopyPrompt}
                  className="w-full py-2 btn-gold rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                  <Copy size={12} /> Copiar Prompt Completo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help panel */}
        <AnimatePresence>
          {showHelp && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="p-4 rounded-xl space-y-3 max-h-48 overflow-y-auto" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <h4 className="text-xs font-bold text-[var(--gold)]">Funciones Disponibles</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
                  {[
                    ['ema(periodo)', 'Media Móvil Exponencial'],
                    ['sma(periodo)', 'Media Móvil Simple'],
                    ['rsi(periodo)', 'Fuerza Relativa (0-100)'],
                    ['macd(f, s, sig)', 'MACD → .line .signal .histogram'],
                    ['bb(periodo, std)', 'Bollinger → .upper .middle .lower'],
                    ['vwap()', 'Precio Promedio por Volumen'],
                    ['crossover(a, b)', 'A cruza arriba de B'],
                    ['crossunder(a, b)', 'A cruza abajo de B'],
                    ['highest(ind, n)', 'Máximo en N períodos'],
                    ['lowest(ind, n)', 'Mínimo en N períodos'],
                    ['buy()', 'Señal de compra'],
                    ['sell()', 'Señal de venta'],
                    ['config({...})', 'stopLoss, takeProfit (%)'],
                    ['log("msg")', 'Registrar mensaje'],
                  ].map(([fn, desc]) => (
                    <div key={fn} className="flex items-baseline gap-2 py-0.5">
                      <span className="text-[var(--gold)] shrink-0">{fn}</span>
                      <span className="text-[var(--text-dim)]">{desc}</span>
                    </div>
                  ))}
                </div>
                <h4 className="text-xs font-bold text-[var(--gold)] pt-2">Variables</h4>
                <p className="text-[10px] text-[var(--text-dim)] font-mono">
                  close, open, high, low, volume, price, barIndex
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Code Editor */}
        <CodeEditor code={code} onChange={(c) => { setCode(c); setBacktestResults(null); }} error={error} />

        {/* Backtest controls */}
        <div className="flex items-center gap-3">
          <select value={testPair} onChange={(e) => setTestPair(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select value={testTimeframe} onChange={(e) => setTestTimeframe(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>

          <button onClick={handleTestStrategy} disabled={testing || !!error}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
            style={{ background: 'rgba(0,220,130,0.1)', border: '1px solid rgba(0,220,130,0.2)', color: 'var(--green)' }}>
            {testing ? <RotateCcw size={13} className="animate-spin" /> : <Play size={13} />}
            {testing ? 'Testeando...' : 'Backtest'}
          </button>

          <div className="flex-1" />

          <button onClick={handleSave} disabled={!!error || !code?.trim()}
            className="flex items-center gap-1.5 px-5 py-2 btn-gold rounded-lg text-xs font-bold disabled:opacity-40">
            {saved ? <CheckCircle size={13} /> : <Save size={13} />}
            {saved ? 'Guardada!' : 'Guardar Estrategia'}
          </button>
        </div>

        {/* Backtest results */}
        <AnimatePresence>
          {backtestResults && (
            <BacktestResults results={backtestResults} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
