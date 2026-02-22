// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Sparkline Component
//  Pure SVG mini chart, no dependencies
// ═══════════════════════════════════════════════════════

import React from 'react';

/**
 * Mini sparkline chart using SVG
 * @param {{ points: number[], width, height, color, gradientId }} props
 * Points should be normalized 0-1
 */
export default function Sparkline({
  points = [],
  width = 80,
  height = 32,
  color = '#d4a017',
  negative = false,
  className = '',
}) {
  if (!points || points.length < 2) return null;

  const lineColor = negative ? '#ef4444' : color;
  const gradId = `sp_${Math.random().toString(36).slice(2, 8)}`;

  // Build SVG path
  const stepX = width / (points.length - 1);
  const padding = 2;
  const usableHeight = height - padding * 2;

  const pathPoints = points.map((p, i) => ({
    x: i * stepX,
    y: padding + usableHeight * (1 - p),
  }));

  // Smooth curve using quadratic bezier
  let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
  for (let i = 1; i < pathPoints.length; i++) {
    const prev = pathPoints[i - 1];
    const curr = pathPoints[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` Q ${cpx} ${prev.y} ${curr.x} ${curr.y}`;
  }

  // Area fill path
  const areaD = d + ` L ${pathPoints[pathPoints.length - 1].x} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        d={d}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
