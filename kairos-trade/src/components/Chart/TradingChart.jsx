// Kairos Trade — Professional Trading Chart (TradingView Lightweight Charts)
import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { TIMEFRAMES, POPULAR_PAIRS } from '../../constants';
import { calculateEMA, calculateRSI, calculateBollingerBands, calculateSMA } from '../../services/indicators';
import marketData from '../../services/marketData';
import { toApiPair, getBase, QUOTE } from '../../utils/pairUtils';
import useStore from '../../store/useStore';
import { Search, TrendingUp } from 'lucide-react';

export default function TradingChart() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const indicatorSeriesRef = useRef([]);
  const wsCleanupRef = useRef(null);

  const { selectedPair, selectedTimeframe, setSelectedPair, setSelectedTimeframe, setCurrentPrice, setPriceChange24h } = useStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndicators, setActiveIndicators] = useState(['ema20']);

  // Initialize chart ONCE
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    // Ensure container has dimensions before creating chart
    const rect = container.getBoundingClientRect();
    const initWidth = rect.width || container.clientWidth || 800;
    const initHeight = rect.height || container.clientHeight || 500;

    const chart = createChart(container, {
      width: initWidth,
      height: initHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E11' },
        textColor: '#848E9C',
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1E222D' },
        horzLines: { color: '#1E222D' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#3B82F6', width: 1, style: 2, labelBackgroundColor: '#3B82F6' },
        horzLine: { color: '#3B82F6', width: 1, style: 2, labelBackgroundColor: '#3B82F6' },
      },
      timeScale: {
        borderColor: '#1E222D',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
      rightPriceScale: {
        borderColor: '#1E222D',
        scaleMargins: { top: 0.05, bottom: 0.2 },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderUpColor: '#0ECB81',
      borderDownColor: '#F6465D',
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#3B82F622',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Force resize after layout settles (handles AnimatePresence transitions)
    const resizeAfterLayout = () => {
      const r = container.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        chart.applyOptions({ width: r.width, height: r.height });
      }
    };
    requestAnimationFrame(resizeAfterLayout);
    setTimeout(resizeAfterLayout, 100);
    setTimeout(resizeAfterLayout, 300);

    // Responsive resize
    const ro = new ResizeObserver(entries => {
      if (!entries || !entries[0]) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chart.applyOptions({ width, height });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Load candle data when pair/timeframe changes
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiPair = toApiPair(selectedPair);
        const [candles, ticker] = await Promise.all([
          marketData.getCandles(apiPair, selectedTimeframe, 500),
          marketData.get24hrTicker(apiPair),
        ]);

        if (cancelled) return;

        if (!candles || candles.length === 0) {
          setError('No se recibieron datos de Binance');
          setLoading(false);
          return;
        }

        // Set candle data
        if (candleSeriesRef.current) {
          candleSeriesRef.current.setData(candles);
        }

        // Set volume data
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(candles.map(c => ({
            time: c.time,
            value: c.volume || 0,
            color: c.close >= c.open ? 'rgba(14,203,129,0.2)' : 'rgba(246,70,93,0.2)',
          })));
        }

        // Update store
        setCurrentPrice(ticker.price);
        setPriceChange24h(ticker.changePercent);

        // Apply indicators (safely)
        try {
          applyIndicators(candles);
        } catch (indErr) {
          console.warn('Indicator error (non-fatal):', indErr);
        }

        // Fit content
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      } catch (err) {
        console.error('Chart data load error:', err);
        if (!cancelled) setError(`Error cargando datos: ${err.message}`);
      }

      if (!cancelled) setLoading(false);
    };

    load();

    // WebSocket real-time updates
    if (wsCleanupRef.current) {
      wsCleanupRef.current();
    }

    wsCleanupRef.current = marketData.connectStream(toApiPair(selectedPair), {
      onTicker: (data) => {
        setCurrentPrice(data.price);
        setPriceChange24h(data.changePercent);
      },
      onCandle: (candle) => {
        if (candleSeriesRef.current) {
          candleSeriesRef.current.update(candle);
        }
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.update({
            time: candle.time,
            value: candle.volume || 0,
            color: candle.close >= candle.open ? 'rgba(14,203,129,0.2)' : 'rgba(246,70,93,0.2)',
          });
        }
      },
    });

    return () => {
      cancelled = true;
      if (wsCleanupRef.current) {
        wsCleanupRef.current();
        wsCleanupRef.current = null;
      }
    };
  }, [selectedPair, selectedTimeframe]);

  // Apply technical indicators (safe)
  const applyIndicators = (candles) => {
    if (!chartRef.current) return;

    // Remove old indicators
    indicatorSeriesRef.current.forEach(s => {
      try { chartRef.current?.removeSeries(s); } catch {}
    });
    indicatorSeriesRef.current = [];

    const closes = candles.map(c => c.close);
    const times = candles.map(c => c.time);

    activeIndicators.forEach(ind => {
      try {
        if (ind === 'ema20') {
          const ema = calculateEMA(closes, 20);
          const validData = ema.map((v, i) => (v != null && isFinite(v)) ? { time: times[i], value: v } : null).filter(Boolean);
          if (validData.length > 0) {
            const series = chartRef.current.addLineSeries({ color: '#3B82F6', lineWidth: 1.5, title: 'EMA 20', lastValueVisible: false, priceLineVisible: false });
            series.setData(validData);
            indicatorSeriesRef.current.push(series);
          }
        }
        if (ind === 'ema50') {
          const ema = calculateEMA(closes, 50);
          const validData = ema.map((v, i) => (v != null && isFinite(v)) ? { time: times[i], value: v } : null).filter(Boolean);
          if (validData.length > 0) {
            const series = chartRef.current.addLineSeries({ color: '#8B5CF6', lineWidth: 1.5, title: 'EMA 50', lastValueVisible: false, priceLineVisible: false });
            series.setData(validData);
            indicatorSeriesRef.current.push(series);
          }
        }
        if (ind === 'sma200') {
          const sma = calculateSMA(closes, 200);
          const validData = sma.map((v, i) => (v != null && isFinite(v)) ? { time: times[i], value: v } : null).filter(Boolean);
          if (validData.length > 0) {
            const series = chartRef.current.addLineSeries({ color: '#FF6D00', lineWidth: 1, title: 'SMA 200', lastValueVisible: false, priceLineVisible: false });
            series.setData(validData);
            indicatorSeriesRef.current.push(series);
          }
        }
        if (ind === 'bb') {
          const bb = calculateBollingerBands(closes);
          const upperData = bb.upper.map((v, i) => (v != null && isFinite(v)) ? { time: times[i], value: v } : null).filter(Boolean);
          const lowerData = bb.lower.map((v, i) => (v != null && isFinite(v)) ? { time: times[i], value: v } : null).filter(Boolean);
          if (upperData.length > 0) {
            const upperS = chartRef.current.addLineSeries({ color: '#9C27B0', lineWidth: 1, lineStyle: 2, title: 'BB Upper', lastValueVisible: false, priceLineVisible: false });
            const lowerS = chartRef.current.addLineSeries({ color: '#9C27B0', lineWidth: 1, lineStyle: 2, title: 'BB Lower', lastValueVisible: false, priceLineVisible: false });
            upperS.setData(upperData);
            lowerS.setData(lowerData);
            indicatorSeriesRef.current.push(upperS, lowerS);
          }
        }
      } catch (e) {
        console.warn(`Indicator ${ind} error:`, e);
      }
    });
  };

  // Re-apply indicators when toggled
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const load = async () => {
      try {
        const candles = await marketData.getCandles(toApiPair(selectedPair), selectedTimeframe, 500);
        applyIndicators(candles);
      } catch {}
    };
    load();
  }, [activeIndicators]);

  const toggleIndicator = (ind) => {
    setActiveIndicators(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  return (
    <div className="flex flex-col w-full flex-1 min-h-0">
      {/* Chart toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
        {/* Pair selector */}
        <div className="relative">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--dark-3)] rounded-lg text-sm font-bold hover:bg-[var(--dark-4)] transition-colors"
          >
            <Search size={13} className="text-[var(--text-dim)]" />
            {selectedPair}
          </button>
          {searchOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-[var(--dark-3)] border border-[var(--border)] rounded-xl shadow-xl z-50 p-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                placeholder="Buscar par..."
                className="w-full text-sm mb-2"
                autoFocus
              />
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {POPULAR_PAIRS
                  .filter(p => p.includes(searchQuery))
                  .map(pair => (
                    <button
                      key={pair}
                      onClick={() => { setSelectedPair(pair); setSearchOpen(false); setSearchQuery(''); }}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors
                        ${pair === selectedPair ? 'bg-[var(--gold)]/15 text-[var(--gold)]' : 'text-[var(--text-dim)] hover:bg-[var(--dark-4)] hover:text-[var(--text)]'}`}
                    >
                      {pair}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeframes */}
        <div className="flex items-center gap-0.5 bg-[var(--dark-3)] rounded-lg p-0.5">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              onClick={() => setSelectedTimeframe(tf.value)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors
                ${selectedTimeframe === tf.value ? 'bg-[var(--gold)] text-white font-bold' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-1 ml-auto">
          <TrendingUp size={13} className="text-[var(--text-dim)]" />
          {[
            { id: 'ema20', label: 'EMA 20', color: '#3B82F6' },
            { id: 'ema50', label: 'EMA 50', color: '#8B5CF6' },
            { id: 'sma200', label: 'SMA 200', color: '#FF6D00' },
            { id: 'bb', label: 'BB', color: '#9C27B0' },
          ].map(ind => (
            <button
              key={ind.id}
              onClick={() => toggleIndicator(ind.id)}
              className={`px-2 py-0.5 text-[11px] rounded transition-all
                ${activeIndicators.includes(ind.id)
                  ? 'font-semibold'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              style={activeIndicators.includes(ind.id) ? { color: ind.color, background: `${ind.color}15` } : {}}
            >
              {ind.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container — MUST have explicit height */}
      <div
        ref={chartContainerRef}
        className="relative"
        style={{ flex: '1 1 0%', minHeight: 0, overflow: 'hidden' }}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: 'rgba(11,14,17,0.85)' }}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[var(--text-dim)]">Cargando {selectedPair}...</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: 'rgba(11,14,17,0.9)' }}>
            <div className="text-center">
              <p className="text-sm text-[var(--red)] mb-2">{error}</p>
              <button
                onClick={() => { setError(null); setLoading(true); }}
                className="px-4 py-2 text-xs bg-[var(--gold)] text-white rounded-lg font-semibold"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
