// Kairos Trade — Multi-Chart Layout (Elite Feature)
// Display 2x2 or 1x2 charts with different timeframes simultaneously
import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { TIMEFRAMES, POPULAR_PAIRS } from '../../constants';
import { calculateEMA, calculateSMA } from '../../services/indicators';
import marketData from '../../services/marketData';
import { toApiPair, formatPair, QUOTE } from '../../utils/pairUtils';
import useStore from '../../store/useStore';
import { Grid3x3, Columns, Rows, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

// Single mini chart component
function MiniChart({ pair, timeframe, height = 300, onPriceUpdate }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const emaRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const chart = createChart(container, {
      width: rect.width || 400,
      height: height - 30,
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E11' },
        textColor: '#848E9C',
        fontFamily: 'Inter, sans-serif',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#1E222D' },
        horzLines: { color: '#1E222D' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: {
        borderColor: '#1E222D',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: { borderColor: '#1E222D' },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderDownColor: '#F6465D',
      borderUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
      wickUpColor: '#0ECB81',
    });

    const emaSeries = chart.addLineSeries({
      color: '#D4AF37',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    candleRef.current = candleSeries;
    emaRef.current = emaSeries;

    // Load data
    const apiPair = toApiPair(pair);
    marketData.getCandles(apiPair, timeframe, 200).then(candles => {
      if (candles && candles.length > 0) {
        const chartData = candles.map(c => ({
          time: Math.floor(c.time / 1000),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        candleSeries.setData(chartData);

        // EMA 20
        const closes = candles.map(c => c.close);
        const ema20 = calculateEMA(closes, 20);
        const emaData = ema20
          .map((v, i) => v ? { time: chartData[i]?.time, value: v } : null)
          .filter(Boolean);
        emaSeries.setData(emaData);

        chart.timeScale().fitContent();

        // Update price
        const last = candles[candles.length - 1];
        if (last && onPriceUpdate) {
          onPriceUpdate(last.close);
        }
      }
    }).catch(() => {});

    // WebSocket for live updates
    const wsSymbol = apiPair.toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@kline_${timeframe}`);
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.k) {
          const candle = {
            time: Math.floor(data.k.t / 1000),
            open: parseFloat(data.k.o),
            high: parseFloat(data.k.h),
            low: parseFloat(data.k.l),
            close: parseFloat(data.k.c),
          };
          candleSeries.update(candle);
          if (onPriceUpdate) onPriceUpdate(candle.close);
        }
      } catch {}
    };
    wsRef.current = ws;

    // Resize
    const ro = new ResizeObserver(() => {
      const r = container.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        try { chart.applyOptions({ width: r.width, height: r.height - 30 }); } catch (e) { /* disposed */ }
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      ws.close();
      chart.remove();
    };
  }, [pair, timeframe, height]);

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[var(--dark)] border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Mini header */}
      <div className="flex items-center justify-between px-2 py-1 bg-[var(--dark-2)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--gold)]">{formatPair(pair)}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--text-dim)] font-mono">{timeframe}</span>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}

// Layout presets
const LAYOUTS = {
  '2x2': { cols: 2, rows: 2, label: '2×2', icon: Grid3x3 },
  '1x2': { cols: 2, rows: 1, label: '1×2', icon: Columns },
  '2x1': { cols: 1, rows: 2, label: '2×1', icon: Rows },
  '1x3': { cols: 3, rows: 1, label: '1×3', icon: Columns },
};

const DEFAULT_CHARTS = [
  { pair: 'BTCKAIROS', timeframe: '1m' },
  { pair: 'BTCKAIROS', timeframe: '5m' },
  { pair: 'BTCKAIROS', timeframe: '15m' },
  { pair: 'BTCKAIROS', timeframe: '1h' },
];

export default function MultiChart() {
  const { selectedPair } = useStore();
  const [layout, setLayout] = useState('2x2');
  const [charts, setCharts] = useState(() => {
    const pair = selectedPair || 'BTCKAIROS';
    return [
      { pair, timeframe: '1m' },
      { pair, timeframe: '5m' },
      { pair, timeframe: '15m' },
      { pair, timeframe: '1h' },
    ];
  });
  const [prices, setPrices] = useState({});

  const layoutConfig = LAYOUTS[layout];
  const visibleCharts = charts.slice(0, layoutConfig.cols * layoutConfig.rows);

  const updateTimeframe = (index, tf) => {
    setCharts(prev => prev.map((c, i) => i === index ? { ...c, timeframe: tf } : c));
  };

  const updatePair = (index, pair) => {
    setCharts(prev => prev.map((c, i) => i === index ? { ...c, pair } : c));
  };

  const syncAllPairs = () => {
    const pair = selectedPair || 'BTCKAIROS';
    setCharts(prev => prev.map(c => ({ ...c, pair })));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--dark-2)] border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-bold text-[var(--gold)] mr-2">Multi-Chart</span>
        
        {/* Layout buttons */}
        <div className="flex gap-1 bg-[var(--dark)] rounded-lg p-0.5">
          {Object.entries(LAYOUTS).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => setLayout(key)}
                className={`px-2 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-colors
                  ${layout === key ? 'bg-[var(--gold)]/20 text-[var(--gold)]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}
              >
                <Icon size={12} /> {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Sync button */}
        <button
          onClick={syncAllPairs}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-colors"
        >
          <RefreshCw size={11} /> Sync Par
        </button>

        {/* Per-chart timeframe selectors */}
        {visibleCharts.map((chart, i) => (
          <select
            key={i}
            value={chart.timeframe}
            onChange={(e) => updateTimeframe(i, e.target.value)}
            className="text-[10px] bg-[var(--dark)] border border-[var(--border)] rounded px-1 py-0.5 text-[var(--text-dim)]"
            title={`Chart ${i + 1}`}
          >
            {TIMEFRAMES.map(tf => (
              <option key={tf.value} value={tf.value}>{tf.label}</option>
            ))}
          </select>
        ))}
      </div>

      {/* Chart Grid */}
      <div
        className="flex-1 min-h-0 p-1 gap-1"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${layoutConfig.cols}, 1fr)`,
          gridTemplateRows: `repeat(${layoutConfig.rows}, 1fr)`,
        }}
      >
        {visibleCharts.map((chart, i) => (
          <MiniChart
            key={`${chart.pair}-${chart.timeframe}-${i}-${layout}`}
            pair={chart.pair}
            timeframe={chart.timeframe}
            onPriceUpdate={(price) => setPrices(p => ({ ...p, [i]: price }))}
          />
        ))}
      </div>
    </div>
  );
}
