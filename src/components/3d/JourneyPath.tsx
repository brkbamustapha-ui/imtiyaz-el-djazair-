"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Lightweight SVG stand-in for the IELTS "progress path". Rendering this as
 * animated SVG instead of a second WebGL canvas keeps the page fast.
 */
export function JourneyPath({ steps }: { steps: string[] }) {
  const reduced = useReducedMotion();
  const count = Math.max(2, steps.length);

  return (
    <div className="relative w-full overflow-x-auto no-scrollbar" role="img" aria-label={steps.join(" → ")}>
      <svg viewBox={`0 0 ${count * 160} 160`} className="h-40 w-full min-w-[640px]" aria-hidden>
        <defs>
          <linearGradient id="journey-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--c-primary)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="var(--c-accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--c-primary)" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        <motion.path
          d={buildPath(count)}
          fill="none"
          stroke="url(#journey-line)"
          strokeWidth="2.4"
          strokeLinecap="round"
          initial={reduced ? undefined : { pathLength: 0 }}
          whileInView={reduced ? undefined : { pathLength: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
        />

        {steps.map((label, index) => {
          const x = 80 + index * 160;
          const y = index % 2 === 0 ? 62 : 98;
          return (
            <motion.g
              key={`${label}-${index}`}
              initial={reduced ? undefined : { opacity: 0, scale: 0.6 }}
              whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: 0.18 * index + 0.2, duration: 0.5 }}
            >
              <circle cx={x} cy={y} r="16" fill="var(--c-surface-2)" stroke="var(--c-accent)" strokeWidth="1.4" />
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fill="var(--c-accent)"
              >
                {index + 1}
              </text>
              <text
                x={x}
                y={index % 2 === 0 ? y - 30 : y + 42}
                textAnchor="middle"
                fontSize="12.5"
                fill="var(--c-muted)"
              >
                {label}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

function buildPath(count: number): string {
  let d = "M 80 62";
  for (let index = 1; index < count; index += 1) {
    const x = 80 + index * 160;
    const y = index % 2 === 0 ? 62 : 98;
    const prevX = 80 + (index - 1) * 160;
    d += ` C ${prevX + 80} ${index % 2 === 0 ? 98 : 62}, ${x - 80} ${y}, ${x} ${y}`;
  }
  return d;
}
