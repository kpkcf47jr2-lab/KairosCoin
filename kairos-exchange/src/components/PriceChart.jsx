import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';

const COINGECKO_IDS = {
  56: 'binancecoin', 1: 'ethereum', 8453: 'ethereum', 42161: 'ethereum', 137: 'matic-network',
};

export default function PriceChart() {
  const { t } = useTranslation();
  const { chainId, sellToken, buyToken } = useStore();
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Determine which token to chart (prefer non-native)
    const tokenId = COINGECKO_IDS[chainId] || 'binancecoin';

    setLoading(true);
    setError(null);

    // Fetch CoinGecko market chart data
    fetch(`https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=${timeframe}`)
      .then(r => r.json())
      .then(data => {
        if (!data.prices?.length) {
          setError('No data');
          setLoading(false);
          return;
        }

        // Clear previous chart
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }

        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: 200,
          layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: 'rgba(255,255,255,0.3)',
            fontSize: 10,
          },
          grid: {
            vertLines: { color: 'rgba(255,255,255,0.03)' },
            horzLines: { color: 'rgba(255,255,255,0.03)' },
          },
          crosshair: {
            vertLine: { color: 'rgba(59,130,246,0.3)', width: 1 },
            horzLine: { color: 'rgba(59,130,246,0.3)', width: 1 },
          },
          rightPriceScale: {
            borderColor: 'rgba(255,255,255,0.05)',
          },
          timeScale: {
            borderColor: 'rgba(255,255,255,0.05)',
            timeVisible: timeframe === '1',
          },
          handleScroll: false,
          handleScale: false,
        });

        const areaSeries = chart.addAreaSeries({
          lineColor: '#3B82F6',
          topColor: 'rgba(59,130,246,0.3)',
          bottomColor: 'rgba(59,130,246,0.01)',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        });

        const chartData = data.prices.map(([time, value]) => ({
          time: Math.floor(time / 1000),
          value,
        }));

        areaSeries.setData(chartData);
        chart.timeScale().fitContent();
        chartRef.current = chart;

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
          }
        });
        resizeObserver.observe(containerRef.current);

        setLoading(false);

        return () => {
          resizeObserver.disconnect();
        };
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chainId, timeframe]);

  const TIMEFRAMES = [
    { label: '24H', value: '1' },
    { label: '7D', value: '7' },
    { label: '30D', value: '30' },
    { label: '90D', value: '90' },
  ];

  const nativeName = { 56: 'BNB', 1: 'ETH', 8453: 'ETH', 42161: 'ETH', 137: 'MATIC' };

  return (
    <div className="w-full max-w-[460px] mx-auto mt-4 mb-2">
      <div className="glass-card p-4 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-white/40">{nativeName[chainId] || 'Token'}/USD</span>
          <div className="flex gap-1">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                  timeframe === tf.value
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-white/30 hover:text-white/50'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={containerRef} className="w-full" style={{ height: 200 }}>
          {loading && (
            <div className="flex items-center justify-center h-full">
              <svg className="animate-spin h-5 w-5 text-brand-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          )}
          {error && !loading && (
            <div className="flex items-center justify-center h-full text-xs text-white/20">
              Chart unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
