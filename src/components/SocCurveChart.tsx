import { useState } from 'react';
import type { TimelineEvent } from '../types';

interface SocCurveChartProps {
  startSOC: number;
  endSOC: number;
  events: TimelineEvent[];
}

interface ChartPoint {
  label: string;
  kind: string;
  soc: number;
  isCharge: boolean;
  energyKwh?: number;
}

export function SocCurveChart({ startSOC, endSOC, events }: SocCurveChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Build chronological SOC points from start -> events -> end
  const points: ChartPoint[] = [];
  points.push({
    label: 'Departure',
    kind: 'Start',
    soc: Math.max(0, Math.min(100, startSOC)),
    isCharge: false,
  });

  const ordered = [...events].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  ordered.forEach((ev, idx) => {
    if (ev.type === 'Charging stop' && ev.chargingDetail) {
      points.push({
        label: `${ev.location || ev.title} (Arrive)`,
        kind: 'Arrival',
        soc: Math.max(0, Math.min(100, ev.chargingDetail.startSOC)),
        isCharge: false,
      });
      points.push({
        label: `${ev.chargingDetail.chargerName || ev.title} (Charged)`,
        kind: 'Charging stop',
        soc: Math.max(0, Math.min(100, ev.chargingDetail.endSOC)),
        isCharge: true,
        energyKwh: ev.chargingDetail.energyKwh,
      });
    } else if (ev.type !== 'Starting point' && ev.type !== 'Destination') {
      const prevSoc = points[points.length - 1]?.soc ?? startSOC;
      const frac = (idx + 1) / Math.max(1, ordered.length + 1);
      const interpolated = Math.round(prevSoc - (prevSoc - endSOC) * (0.28 * frac + 0.12));
      points.push({
        label: ev.title,
        kind: ev.type,
        soc: Math.max(5, Math.min(99, interpolated)),
        isCharge: false,
      });
    }
  });

  points.push({
    label: 'Destination',
    kind: 'Arrival',
    soc: Math.max(0, Math.min(100, endSOC)),
    isCharge: false,
  });

  const width = 640;
  const height = 165;
  const padX = 28;
  const padY = 20;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const coords = points.map((pt, i) => {
    const x = padX + (points.length > 1 ? (i / (points.length - 1)) * plotW : plotW / 2);
    const y = padY + (1 - pt.soc / 100) * plotH;
    return { ...pt, x, y };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(height - padY).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(height - padY).toFixed(1)} Z`
      : '';

  const active = hoveredIdx !== null ? coords[hoveredIdx] : null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-serif-display italic text-xl text-[var(--text)]">
            Battery State-of-Charge Curve
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Hover any node to inspect arrival battery %, recharge jumps, and kWh added.
          </p>
        </div>
        <div className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
          {active ? (
            <span className="text-[var(--primary)]">
              {active.label} · {active.soc}%
              {active.energyKwh ? ` (+${active.energyKwh} kWh)` : ''}
            </span>
          ) : (
            <span>
              {startSOC}% → <strong className="text-[var(--primary)]">{endSOC}%</strong>
            </span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-40 overflow-visible"
        role="img"
        aria-label="Battery state of charge profile across journey stops"
      >
        <defs>
          <linearGradient id="soc-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal percentage grid lines */}
        {[20, 50, 80, 100].map((pct) => {
          const y = padY + (1 - pct / 100) * plotH;
          return (
            <g key={pct}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
              <text
                x={0}
                y={y + 3}
                fontSize="9"
                fill="var(--text-muted)"
                fontFamily="JetBrains Mono, monospace"
              >
                {pct}%
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill="url(#soc-area-grad)" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {coords.map((pt, idx) => (
          <g
            key={`${pt.label}-${idx}`}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="cursor-pointer"
          >
            <circle
              cx={pt.x}
              cy={pt.y}
              r={pt.isCharge ? 6 : 4.5}
              fill={pt.isCharge ? 'var(--accent)' : 'var(--surface)'}
              stroke={pt.isCharge ? 'var(--accent)' : 'var(--primary)'}
              strokeWidth="2.2"
            />
            <text
              x={pt.x}
              y={pt.y - 10}
              textAnchor="middle"
              fontSize="9.5"
              fill={pt.isCharge ? 'var(--accent)' : 'var(--text)'}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
            >
              {pt.soc}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
