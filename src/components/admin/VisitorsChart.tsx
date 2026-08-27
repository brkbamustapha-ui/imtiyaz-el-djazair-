"use client";

import { useMemo, useState } from "react";

/**
 * Tiny dependency-free area chart. Enough for a 30-day traffic sparkline —
 * adding a charting library for one graph is not worth the bundle.
 */
const WIDTH = 640;
const HEIGHT = 170;
const PADDING = { top: 12, right: 6, bottom: 22, left: 6 };

export function VisitorsChart({ data }: { data: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const { points, area, max } = useMemo(() => {
    const maxValue = Math.max(1, ...data.map((entry) => entry.count));
    const innerW = WIDTH - PADDING.left - PADDING.right;
    const innerH = HEIGHT - PADDING.top - PADDING.bottom;
    const step = data.length > 1 ? innerW / (data.length - 1) : innerW;

    const coords = data.map((entry, index) => {
      const x = PADDING.left + index * step;
      const y = PADDING.top + innerH - (entry.count / maxValue) * innerH;
      return { x, y };
    });

    const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const fill = `${line} L${coords[coords.length - 1]?.x ?? 0},${PADDING.top + innerH} L${coords[0]?.x ?? 0},${PADDING.top + innerH} Z`;
    return { points: line, area: fill, max: maxValue };
  }, [data]);

  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-[var(--a-muted)]">
        No page views recorded yet. Numbers appear once the site receives visitors.
      </p>
    );
  }

  const active = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-2xl font-bold">{total.toLocaleString()}</p>
        <p className="text-xs text-[var(--a-muted)]">
          {active ? `${active.date}: ${active.count} views` : `Peak ${max} / day`}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[170px] w-full"
        role="img"
        aria-label={`Page views over the last ${data.length} days, ${total} in total`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="visits-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--a-brand)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--a-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#visits-fill)" />
        <path d={points} fill="none" stroke="var(--a-brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((entry, index) => (
          <rect
            key={entry.date}
            x={(index / data.length) * WIDTH}
            y={0}
            width={WIDTH / data.length}
            height={HEIGHT}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
          />
        ))}
        <text x={PADDING.left} y={HEIGHT - 6} fontSize="10" fill="var(--a-faint)">
          {data[0]?.date.slice(5)}
        </text>
        <text x={WIDTH - PADDING.right} y={HEIGHT - 6} fontSize="10" fill="var(--a-faint)" textAnchor="end">
          {data[data.length - 1]?.date.slice(5)}
        </text>
      </svg>
    </div>
  );
}
