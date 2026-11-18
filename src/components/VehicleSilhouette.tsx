interface VehicleSilhouetteProps {
  model?: string;
  colour?: string;
  batteryCapacity?: number;
  className?: string;
}

function resolveBodyHex(colour = ''): string {
  const c = colour.toLowerCase();
  if (c.includes('red') || c.includes('crimson') || c.includes('scarlet')) return '#DC2626';
  if (c.includes('blue') || c.includes('ocean') || c.includes('cobalt')) return '#3B82F6';
  if (c.includes('teal') || c.includes('cyan') || c.includes('mint')) return '#2DD4BF';
  if (c.includes('green') || c.includes('emerald') || c.includes('forest')) return '#10B981';
  if (c.includes('gold') || c.includes('amber') || c.includes('yellow')) return '#F59E0B';
  if (c.includes('white') || c.includes('pearl') || c.includes('frost')) return '#E4E4E7';
  if (c.includes('silver') || c.includes('grey') || c.includes('gray')) return '#94A3B8';
  if (c.includes('black') || c.includes('obsidian') || c.includes('night')) return '#3F3F46';
  return '#2DD4BF';
}

function detectBodyStyle(model = ''): 'sedan' | 'suv' {
  const m = model.toLowerCase();
  if (
    m.includes('model 3') ||
    m.includes('model s') ||
    m.includes('ioniq 6') ||
    m.includes('seal') ||
    m.includes('taycan') ||
    m.includes('tigor') ||
    m.includes('e-tron gt')
  ) {
    return 'sedan';
  }
  return 'suv';
}

export function VehicleSilhouette({
  model = '',
  colour = '',
  batteryCapacity,
  className = '',
}: VehicleSilhouetteProps) {
  const bodyHex = resolveBodyHex(colour);
  const style = detectBodyStyle(model);
  const estimatedRange = batteryCapacity ? Math.round(batteryCapacity * 6.4) : null;

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <svg
        viewBox="0 0 220 84"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-36 h-14 shrink-0"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`car-grad-${style}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={bodyHex} stopOpacity="0.95" />
            <stop offset="100%" stopColor={bodyHex} stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {/* Ground shadow */}
        <ellipse cx="110" cy="69" rx="88" ry="5" fill="currentColor" opacity="0.14" />

        {style === 'sedan' ? (
          <>
            <path
              d="M20 52 C22 44, 34 40, 56 38 L86 24 C104 19, 134 20, 158 34 L194 40 C203 42, 206 49, 204 56 L195 60 L25 60 Z"
              fill={`url(#car-grad-${style})`}
              stroke="var(--border)"
              strokeWidth="1.5"
            />
            <path
              d="M66 37 L89 26 C106 23, 128 24, 148 35 L146 39 L64 39 Z"
              fill="#0A0A0A"
              opacity="0.72"
            />
          </>
        ) : (
          <>
            <path
              d="M22 53 C23 42, 34 38, 52 37 L76 20 C98 17, 142 18, 166 24 L188 39 C200 41, 205 47, 204 56 L195 60 L24 60 Z"
              fill={`url(#car-grad-${style})`}
              stroke="var(--border)"
              strokeWidth="1.5"
            />
            <path
              d="M59 36 L79 23 C102 21, 138 22, 159 27 L174 37 Z"
              fill="#0A0A0A"
              opacity="0.72"
            />
          </>
        )}

        {/* Underfloor EV Battery Pack Indicator */}
        <rect
          x="64"
          y="55"
          width="92"
          height="4.5"
          rx="2.2"
          fill="var(--primary)"
          opacity="0.9"
        />

        {/* Wheels */}
        <circle cx="56" cy="59" r="12" fill="#18181B" stroke="var(--border)" strokeWidth="2" />
        <circle cx="56" cy="59" r="5" fill="#A1A1AA" />
        <circle cx="164" cy="59" r="12" fill="#18181B" stroke="var(--border)" strokeWidth="2" />
        <circle cx="164" cy="59" r="5" fill="#A1A1AA" />
      </svg>

      {estimatedRange !== null && (
        <div className="text-right space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Est. Highway Range
          </div>
          <div className="font-mono text-sm font-semibold tabular-nums text-[var(--primary)]">
            ~{estimatedRange} km
          </div>
        </div>
      )}
    </div>
  );
}
