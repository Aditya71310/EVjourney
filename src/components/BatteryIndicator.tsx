import { motion } from 'motion/react';
import { BatteryCharging, ArrowRight } from 'lucide-react';

interface BatteryIndicatorProps {
  startSOC: number;
  endSOC: number;
  energyKwh?: number;
  compact?: boolean;
}

export function BatteryIndicator({
  startSOC,
  endSOC,
  energyKwh,
  compact = false,
}: BatteryIndicatorProps) {
  const safeStart = Math.max(0, Math.min(100, startSOC));
  const safeEnd = Math.max(0, Math.min(100, endSOC));
  const isGain = safeEnd >= safeStart;
  const delta = Math.abs(safeEnd - safeStart);

  const barColor =
    safeEnd <= 15
      ? 'bg-[#F87171]'
      : safeEnd <= 35
        ? 'bg-[#FBBF24]'
        : 'bg-[#2DD4BF]';

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-mono tabular-nums text-neutral-700 dark:text-[#FAFAFA]">
          <BatteryCharging
            className={`w-4 h-4 ${isGain ? 'text-[#2DD4BF]' : 'text-[#FBBF24]'}`}
          />
          <span>{safeStart}%</span>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-400 dark:text-[#A1A1AA]" />
          <span className="font-semibold">{safeEnd}%</span>
        </div>
        <span className="font-mono tabular-nums text-neutral-500 dark:text-[#A1A1AA]">
          {isGain ? `+${delta}%` : `-${delta}%`}
          {energyKwh !== undefined && energyKwh > 0 ? ` · ${energyKwh} kWh` : ''}
        </span>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-[#141417] border border-neutral-300 dark:border-[#2E2E33]">
        {/* Initial SOC baseline */}
        <div
          className="absolute inset-y-0 left-0 bg-neutral-400/50 dark:bg-[#FAFAFA]/20"
          style={{ width: `${Math.min(safeStart, safeEnd)}%` }}
        />
        {/* Animated end state */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: safeEnd / 100 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: 'left' }}
          className={`absolute inset-y-0 left-0 w-full ${barColor} opacity-90`}
        />
      </div>
    </div>
  );
}
