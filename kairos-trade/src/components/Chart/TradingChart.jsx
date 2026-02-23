// Kairos Trade — Professional Trading Chart (TradingView Lightweight Charts)
import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { TIMEFRAMES, POPULAR_PAIRS } from '../../constants';
import { calculateEMA, calculateRSI, calculateBollingerBands, calculateSMA } from '../../services/indicators';
import marketData from '../../services/marketData';
import useStore from '../../store/useStore';
import { Search, Plus, Minus, Maximize, TrendingUp } from 'lucide-react';

export default function TradingChart() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const indicatorSeriesRef = useRef([]);

  const { selectedPair, selectedTimeframe, setSelectedPair, setSelectedTimeframe, setCurrentPrice, setPriceChange24h } = useStore();

  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndicators, setActiveIndicators] = useState(['ema20']);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0A0A0F' },
        textColor: '#8888A0',
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1A1A25' },
        horzLines: { color: '#1A1A25' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#D4AF37', width: 1, style: 2 },
        horzLine: { color: '#D4AF37', width: 1, style: 2 },
      },
      timeScale: {
        borderColor: '#2A2A3A',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2A2A3A',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      handleScroll: true,
      handleScale: true,
    });

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00C853',
      downColor: '#FF1744',
      borderUpColor: '#00C853',
      borderDownColor: '#FF1744',
      wickUpColor: '#00C853',
      wickDownColor: '#FF1744',
    });

    // Volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#D4AF3733',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Load data when pair/timeframe changes
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [candles, ticker] = await Promise.all([
        marketData.getCandles(selectedPair, selectedTimeframe, 500),
        marketData.get24hrTicker(selectedPair),
      ]);

      if (candleSeriesRef.current) {
        candleSeriesRef.current.setData(candles);
      }

      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(candles.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? '#00C85333' : '#FF174433',
        })));
      }

      setCurrentPrice(ticker.price);
      setPriceChange24h(ticker.changePercent);

      // Apply indicators
      applyIndicators(candles);

      // Fit chart
      chartRef.current?.timeScale().fitContent();
    } catch (err) {
      console.error('Load chart data error:', err);
    }
    setLoading(false);
  }, [selectedPair, selectedTimeframe]);

  useEffect(() => {
    loadData();

    // Connect WebSocket for real-time updates
    const cleanup = marketData.connectStream(selectedPair, {
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
            value: candle.volume,
            color: candle.close >= candle.open ? '#00C85333' : '#FF174433',
          });
        }
      },
    });

    return cleanup;
  }, [selectedPair, selectedTimeframe, loadData]);

  // Apply technical indicators
  const applyIndicators = (candles) => {
    // Remove old indicators
    indicatorSeriesRef.current.forEach(s => {
      try { chartRef.current?.removeSeries(s); } catch {}
    });
    indicatorSeriesRef.current = [];

    const closes = candles.map(c => c.close);
    const times = candles.map(c => c.time);

    activeIndicators.forEach(ind => {
      if (ind === 'ema20') {
        const ema = calculateEMA(closes, 20);
        const series = chartRef.current.addLineSeries({ color: '#D4AF37', lineWidth: 1, title: 'EMA 20' });
        series.setData(ema.map((v, i) => ({ time: times[i], value: v })));
        indicatorSeriesRef.current.push(series);
      }
      if (ind === 'ema50') {
        const ema = calculateEMA(closes, 50);
        const series = chartRef.current.addLineSeries({ color: '#2196F3', lineWidth: 1, title: 'EMA 50' });
        series.setData(ema.map((v, i) => ({ time: times[i], value: v })));
        indicatorSeriesRef.current.push(series);
      }
      if (ind === 'sma200') {
        const sma = calculateSMA(closes, 200);
        const series = chartRef.current.addLineSeries({ color: '#FF6D00', lineWidth: 1, title: 'SMA 200' });
        series.setData(sma.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean));
        indicatorSeriesRef.current.push(series);
      }
      if (ind === 'bb') {
        const bb = calculateBollingerBands(closes);
        const upperS = chartRef.current.addLineSeries({ color: '#9C27B0', lineWidth: 1, lineStyle: 2, title: 'BB Upper' });
        const lowerS = chartRef.current.addLineSeries({ color: '#9C27B0', lineWidth: 1, lineStyle: 2, title: 'BB Lower' });
        upperS.setData(bb.upper.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean));
        lowerS.setData(bb.lower.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean));
        indicatorSeriesRef.current.push(upperS, lowerS);
      }
    });
  };

  const toggleIndicator = (ind) => {
    setActiveIndicators(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chart toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-[var(--border)] bg-[var(--dark-2)] shrink-0 flex-wrap">
        {/* Pair selector */}
        <div className="relative">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--dark-3)] rounded-lg text-sm font-bold hover:bg-[var(--dark-4)] transition-colors"
          >
            <Search size={14} />
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
                        ${pair === selectedPair ? 'bg-[var(--gold)]/20 text-[var(--gold)]' : 'text-[var(--text-dim)] hover:bg-[var(--dark-4)] hover:text-[var(--text)]'}`}
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
                ${selectedTimeframe === tf.value ? 'bg-[var(--gold)] text-black font-bold' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-[var(--text-dim)] mr-1">
            <TrendingUp size={14} className="inline" /> Indicadores:
          </span>
          {[
            { id: 'ema20', label: 'EMA 20', color: '#D4AF37' },
            { id: 'ema50', label: 'EMA 50', color: '#2196F3' },
            { id: 'sma200', label: 'SMA 200', color: '#FF6D00' },
            { id: 'bb', label: 'BB', color: '#9C27B0' },
          ].map(ind => (
            <button
              key={ind.id}
              onClick={() => toggleIndicator(ind.id)}
              className={`px-2 py-0.5 text-xs rounded-md border transition-colors
                ${activeIndicators.includes(ind.id)
                  ? 'border-current text-current'
                  : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              style={activeIndicators.includes(ind.id) ? { color: ind.color } : {}}
            >
              {ind.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div ref={chartContainerRef} className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--dark)]/80 z-10">
            <div className="text-sm text-[var(--gold)] animate-pulse">Cargando gráfico...</div>
          </div>
        )}
      </div>
    </div>
  );
}
