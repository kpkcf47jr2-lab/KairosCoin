// Kairos Trade — Order Book Depth Chart
import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

const DEPTH_URL = 'https://api.binance.com/api/v3/depth';

export default function DepthChart({ pair = 'BTCUSDT', height = 260 }) {
  const canvasRef = useRef(null);
  const [data, setData] = useState(null);
  const [hovering, setHovering] = useState(null);
  const animRef = useRef(null);

  const fetchDepth = useCallback(async () => {
    try {
      const res = await fetch(`${DEPTH_URL}?symbol=${pair}&limit=100`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch (e) { /* silent */ }
  }, [pair]);

  useEffect(() => {
    fetchDepth();
    const iv = setInterval(fetchDepth, 3000);
    return () => clearInterval(iv);
  }, [fetchDepth]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const bids = data.bids.map(([p, q]) => [parseFloat(p), parseFloat(q)]);
    const asks = data.asks.map(([p, q]) => [parseFloat(p), parseFloat(q)]);

    if (!bids.length || !asks.length) return;

    // Cumulative volumes
    const cumBids = [];
    let cumB = 0;
    for (const [price, qty] of bids) {
      cumB += qty;
      cumBids.push([price, cumB]);
    }

    const cumAsks = [];
    let cumA = 0;
    for (const [price, qty] of asks) {
      cumA += qty;
      cumAsks.push([price, cumA]);
    }

    const midPrice = (bids[0][0] + asks[0][0]) / 2;
    const maxVol = Math.max(cumBids[cumBids.length - 1]?.[1] || 0, cumAsks[cumAsks.length - 1]?.[1] || 0);
    const allPrices = [...cumBids.map(x => x[0]), ...cumAsks.map(x => x[0])];
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const priceRange = maxP - minP || 1;

    const pad = { top: 10, bottom: 25, left: 0, right: 0 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const px = (price) => pad.left + ((price - minP) / priceRange) * cw;
    const vy = (vol) => pad.top + ch - (vol / maxVol) * ch;

    // Draw bid area (green)
    ctx.beginPath();
    ctx.moveTo(px(cumBids[0][0]), vy(0));
    for (const [price, vol] of cumBids) {
      ctx.lineTo(px(price), vy(vol));
    }
    ctx.lineTo(px(cumBids[cumBids.length - 1][0]), vy(0));
    ctx.closePath();
    const bidGrad = ctx.createLinearGradient(0, 0, 0, h);
    bidGrad.addColorStop(0, 'rgba(0,220,130,0.25)');
    bidGrad.addColorStop(1, 'rgba(0,220,130,0.02)');
    ctx.fillStyle = bidGrad;
    ctx.fill();

    // Bid line
    ctx.beginPath();
    for (let i = 0; i < cumBids.length; i++) {
      const [price, vol] = cumBids[i];
      i === 0 ? ctx.moveTo(px(price), vy(vol)) : ctx.lineTo(px(price), vy(vol));
    }
    ctx.strokeStyle = '#00DC82';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw ask area (red)
    ctx.beginPath();
    ctx.moveTo(px(cumAsks[0][0]), vy(0));
    for (const [price, vol] of cumAsks) {
      ctx.lineTo(px(price), vy(vol));
    }
    ctx.lineTo(px(cumAsks[cumAsks.length - 1][0]), vy(0));
    ctx.closePath();
    const askGrad = ctx.createLinearGradient(0, 0, 0, h);
    askGrad.addColorStop(0, 'rgba(255,59,48,0.25)');
    askGrad.addColorStop(1, 'rgba(255,59,48,0.02)');
    ctx.fillStyle = askGrad;
    ctx.fill();

    // Ask line
    ctx.beginPath();
    for (let i = 0; i < cumAsks.length; i++) {
      const [price, vol] = cumAsks[i];
      i === 0 ? ctx.moveTo(px(price), vy(vol)) : ctx.lineTo(px(price), vy(vol));
    }
    ctx.strokeStyle = '#FF3B30';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Mid price line
    const midX = px(midPrice);
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(midX, pad.top);
    ctx.lineTo(midX, h - pad.bottom);
    ctx.strokeStyle = '#3B82F680';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // Mid price label
    ctx.fillStyle = '#3B82F6';
    ctx.font = '600 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`$${midPrice.toFixed(2)}`, midX, h - pad.bottom + 14);

    // Price axis labels
    ctx.fillStyle = '#555';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`$${minP.toFixed(0)}`, pad.left + 4, h - pad.bottom + 14);
    ctx.textAlign = 'right';
    ctx.fillText(`$${maxP.toFixed(0)}`, w - pad.right - 4, h - pad.bottom + 14);

    // Hover tooltip
    if (hovering && hovering.x >= 0 && hovering.x <= w) {
      const hoverPrice = minP + (hovering.x / w) * priceRange;
      const isBid = hoverPrice < midPrice;
      const dataset = isBid ? cumBids : cumAsks;
      let closestVol = 0;
      for (const [p, v] of dataset) {
        if (isBid ? p >= hoverPrice : p <= hoverPrice) closestVol = v;
      }

      // Crosshair
      ctx.beginPath();
      ctx.setLineDash([2, 2]);
      ctx.moveTo(hovering.x, pad.top);
      ctx.lineTo(hovering.x, h - pad.bottom);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Tooltip
      const label = `$${hoverPrice.toFixed(2)} — Vol: ${closestVol.toFixed(4)}`;
      const tw = ctx.measureText(label).width + 16;
      const tx = Math.min(hovering.x - tw / 2, w - tw - 4);
      ctx.fillStyle = '#1A1B1E';
      ctx.strokeStyle = 'rgba(59,130,246,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(Math.max(tx, 4), pad.top, tw, 22, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, Math.max(tx, 4) + tw / 2, pad.top + 15);
    }
  }, [data, hovering]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const handleMouseMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHovering({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="rounded-xl overflow-hidden relative" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-xs font-bold flex items-center gap-2 text-[var(--text-secondary)]">
          <BarChart3 size={14} className="text-[var(--gold)]" /> Depth Chart
        </h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00DC82]" /> Bids</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FF3B30]" /> Asks</span>
        </div>
      </div>
      {!data ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <span className="text-xs text-[var(--text-dim)]">Cargando profundidad…</span>
        </div>
      ) : (
        <canvas ref={canvasRef} style={{ width: '100%', height }}
          onMouseMove={handleMouseMove} onMouseLeave={() => setHovering(null)} className="cursor-crosshair" />
      )}
    </motion.div>
  );
}
