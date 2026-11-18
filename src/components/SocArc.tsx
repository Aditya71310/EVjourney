import { motion } from 'motion/react';

interface SocArcProps {
  startSOC: number;
  endSOC: number;
  size?: number;
}

export function SocArc({ startSOC, endSOC, size = 96 }: SocArcProps) {
  const safeStart = Math.max(0, Math.min(100, startSOC));
  const safeEnd = Math.max(0, Math.min(100, endSOC));
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const arcFraction = 0.75; // 270 deg gauge
  const trackLength = circumference * arcFraction;
  const fillLength = trackLength * (safeEnd / 100);
  const startOffset = trackLength * (safeStart / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[135deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${trackLength} ${circumference}`}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ strokeDasharray: `${startOffset} ${circumference}` }}
          animate={{ strokeDasharray: `${fillLength} ${circumference}` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="font-mono text-xs font-semibold tabular-nums text-[var(--text)]">
          {safeStart}% → <span className="text-[var(--primary)]">{safeEnd}%</span>
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">SOC</div>
      </div>
    </div>
  );
}
