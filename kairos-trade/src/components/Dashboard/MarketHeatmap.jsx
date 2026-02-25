// Kairos Trade — Market Heatmap (Color-coded crypto performance grid)
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Grid3x3, RefreshCw, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import useStore from '../../store/useStore';
import marketData from '../../services/marketData';
import { toDisplayPair, getBase } from '../../utils/pairUtils';

const PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
  'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT', 'UNIUSDT',
  'LTCUSDT', 'ATOMUSDT', 'ARBUSDT', 'OPUSDT', 'NEARUSDT', 'FTMUSDT',
  'APTUSDT', 'INJUSDT', 'SUIUSDT', 'SEIUSDT', 'TIAUSDT', 'JUPUSDT',
];

export default function MarketHeatmap() {
  const { setPage, setSelectedPair } = useStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [sortBy, setSortBy] = useState('change'); // change | volume | name

  const loadData = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        PAIRS.map(async (pair) => {
          try {
            const t = await marketData.get24hrTicker(pair);
            return t;
          } catch { return null; }
        })
      );
      setData(results.filter(Boolean));
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Heatmap load error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 60000);
    return () => clearInterval(iv);
  }, []);

  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'change') return Math.abs(b.changePercent) - Math.abs(a.changePercent);
    if (sortBy === 'volume') return (b.volume || 0) - (a.volume || 0);
    return getBase(a.symbol).localeCompare(getBase(b.symbol));
  });

  const maxAbsChange = Math.max(...data.map(d => Math.abs(d.changePercent || 0)), 1);

  const getColor = (change) => {
    const intensity = Math.min(Math.abs(change) / Math.max(maxAbsChange * 0.7, 1), 1);
    if (change >= 0) return `rgba(16, 185, 129, ${0.08 + intensity * 0.45})`;
    return `rgba(239, 68, 68, ${0.08 + intensity * 0.45})`;
  };

  const getBorderColor = (change) => {
    const intensity = Math.min(Math.abs(change) / Math.max(maxAbsChange * 0.7, 1), 1);
    if (change >= 0) return `rgba(16, 185, 129, ${0.15 + intensity * 0.3})`;
    return `rgba(239, 68, 68, ${0.15 + intensity * 0.3})`;
  };

  const handleClick = (symbol) => {
    setSelectedPair(toDisplayPair(symbol));
    setPage('chart');
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Grid3x3 size={20} className="text-[var(--gold)]" />
            Market Heatmap
          </h1>
          <p className="text-xs text-[var(--text-dim)]">
            Rendimiento 24h de las principales criptomonedas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-[10px] text-[var(--text-dim)] flex items-center gap-1">
              <Clock size={10} />
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--dark-3)] text-[var(--text-dim)] rounded-lg text-xs hover:text-[var(--gold)] transition-all border border-[var(--border)]"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex gap-1 bg-[var(--dark-3)] rounded-lg p-1 w-fit">
        {[
          { id: 'change', label: 'Por Cambio' },
          { id: 'volume', label: 'Por Volumen' },
          { id: 'name', label: 'Alfabético' },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setSortBy(s.id)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              sortBy === s.id ? 'bg-[var(--gold)] text-white font-bold' : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {data.length > 0 && (
        <div className="flex gap-4 text-xs">
          <span className="text-emerald-400 font-semibold">
            ↑ {data.filter(d => d.changePercent >= 0).length} subiendo
          </span>
          <span className="text-red-400 font-semibold">
            ↓ {data.filter(d => d.changePercent < 0).length} bajando
          </span>
          <span className="text-[var(--text-dim)]">
            Avg: {(data.reduce((s, d) => s + d.changePercent, 0) / data.length).toFixed(2)}%
          </span>
        </div>
      )}

      {/* Heatmap grid */}
      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-[var(--text-dim)]" />
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {sortedData.map((ticker, i) => {
            const base = getBase(ticker.symbol);
            const change = ticker.changePercent || 0;
            const isUp = change >= 0;
            return (
              <motion.button
                key={ticker.symbol}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => handleClick(ticker.symbol)}
                className="rounded-xl p-3 text-center transition-all hover:scale-[1.04] group relative"
                style={{
                  background: getColor(change),
                  border: `1px solid ${getBorderColor(change)}`,
                }}
              >
                {/* Coin symbol */}
                <p className="text-base font-bold mb-1">{base}</p>

                {/* Price */}
                <p className="text-[11px] font-mono text-[var(--text)] mb-1">
                  ${ticker.price?.toLocaleString(undefined, { maximumFractionDigits: ticker.price > 100 ? 0 : 2 })}
                </p>

                {/* Change */}
                <div className={`flex items-center justify-center gap-0.5 text-sm font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {isUp ? '+' : ''}{change.toFixed(2)}%
                </div>

                {/* Hover indicator */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ boxShadow: `0 0 20px ${isUp ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}` }} />
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 text-[10px] text-[var(--text-dim)]">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: 'rgba(239,68,68,0.4)' }} />
          <span>Gran caída</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: 'rgba(239,68,68,0.15)' }} />
          <span>Leve caída</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: 'rgba(16,185,129,0.15)' }} />
          <span>Leve subida</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: 'rgba(16,185,129,0.4)' }} />
          <span>Gran subida</span>
        </div>
      </div>
    </div>
  );
}
