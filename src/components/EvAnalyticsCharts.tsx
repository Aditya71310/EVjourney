import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BatteryCharging,
  Clock,
  Fuel,
  Gauge,
  IndianRupee,
  Leaf,
  Route,
  Zap,
} from 'lucide-react';
import type {
  AnalyticsData,
  DashboardMetrics,
  Journey,
  MonthlyTravelPoint,
} from '../types';
import { formatDateShort, formatDuration, formatINR } from '../utils/formatters';

interface EvAnalyticsChartsProps {
  metrics: DashboardMetrics;
  journeys: Journey[];
  analytics?: AnalyticsData | null;
  showFullHeaderLink?: boolean;
}

type MonthlyMetricKey = 'distanceKm' | 'energyKwh' | 'chargingCost' | 'durationHours' | 'trips';
type TripMetricMode = 'efficiency' | 'duration';

const MONTHLY_OPTIONS: { key: MonthlyMetricKey; label: string; unit: string }[] = [
  { key: 'distanceKm', label: 'Distance', unit: 'km' },
  { key: 'energyKwh', label: 'Electricity', unit: 'kWh' },
  { key: 'chargingCost', label: 'Spend', unit: '₹' },
  { key: 'durationHours', label: 'Duration', unit: 'hrs' },
  { key: 'trips', label: 'Trips', unit: 'trips' },
];

export function EvAnalyticsCharts({
  metrics,
  journeys,
  analytics,
  showFullHeaderLink = false,
}: EvAnalyticsChartsProps) {
  const [monthlyMetric, setMonthlyMetric] = useState<MonthlyMetricKey>('distanceKm');
  const [hoveredMonthKey, setHoveredMonthKey] = useState<string | null>(null);
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const [tripMode, setTripMode] = useState<TripMetricMode>('efficiency');
  const [hoveredEffId, setHoveredEffId] = useState<string | null>(null);

  // Build resilient fallback series if analytics wasn't passed explicitly
  const derivedSeries = useMemo(() => {
    if (analytics?.journeySeries) return analytics.journeySeries;
    return [...journeys]
      .sort(
        (a, b) =>
          new Date(a.startDate || a.createdAt).getTime() -
          new Date(b.startDate || b.createdAt).getTime()
      )
      .map((j) => {
        const cap = j.vehicle?.batteryCapacity || 60;
        const socDelta = Math.max(0, (j.startSOC || 0) - (j.endSOC || 0));
        const charged = j.totalEnergyKwh || 0;
        const consumed = Number(((cap * socDelta) / 100 + charged).toFixed(1));
        const eff = consumed > 0 && j.distanceKm > 0 ? Number((j.distanceKm / consumed).toFixed(2)) : 0;
        return {
          _id: j._id,
          title: j.title,
          startDate: j.startDate,
          startLocation: j.startLocation,
          endLocation: j.endLocation,
          distanceKm: Math.round(j.distanceKm || 0),
          durationMinutes: Math.round(j.durationMinutes || 0),
          energyKwh: Number(charged.toFixed(1)),
          estimatedConsumedKwh: consumed > 0 ? consumed : Number(((j.distanceKm || 0) * 0.16).toFixed(1)),
          chargingCost: Math.round(j.totalChargingCost || 0),
          chargingStopsCount: j.chargingStopsCount || 0,
          efficiencyKmPerKwh: eff,
          vehicleName: j.vehicle ? `${j.vehicle.brand} ${j.vehicle.model}` : 'EV',
        };
      });
  }, [analytics?.journeySeries, journeys]);

  const monthlyData: MonthlyTravelPoint[] = useMemo(() => {
    if (analytics?.monthlyPatterns?.length) return analytics.monthlyPatterns;
    const now = new Date();
    const map = new Map<string, MonthlyTravelPoint>();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, {
        monthKey: key,
        label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        trips: 0,
        distanceKm: 0,
        energyKwh: 0,
        estimatedConsumedKwh: 0,
        chargingCost: 0,
        durationMinutes: 0,
        efficiencyKmPerKwh: 0,
      });
    }
    derivedSeries.forEach((j) => {
      const d = new Date(j.startDate);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = map.get(key);
      if (!bucket) return;
      bucket.trips += 1;
      bucket.distanceKm += j.distanceKm;
      bucket.energyKwh = Number((bucket.energyKwh + j.energyKwh).toFixed(1));
      bucket.estimatedConsumedKwh = Number(
        (bucket.estimatedConsumedKwh + j.estimatedConsumedKwh).toFixed(1)
      );
      bucket.chargingCost += j.chargingCost;
      bucket.durationMinutes += j.durationMinutes;
    });
    return Array.from(map.values());
  }, [analytics?.monthlyPatterns, derivedSeries]);

  const summary = analytics?.summary;
  const totalDistanceKm = summary?.totalDistanceKm ?? metrics.totalDistanceKm;
  const totalConsumedKwh =
    summary?.totalEstimatedConsumedKwh ??
    metrics.totalEstimatedConsumedKwh ??
    (derivedSeries.reduce((s, j) => s + j.estimatedConsumedKwh, 0) || metrics.totalEnergyKwh);
  const totalChargedKwh = summary?.totalEnergyKwh ?? metrics.totalEnergyKwh;
  const totalCost = summary?.totalChargingCost ?? metrics.totalChargingCost;
  const avgEfficiency =
    summary?.avgEfficiencyKmPerKwh ??
    metrics.avgEfficiencyKmPerKwh ??
    (totalConsumedKwh > 0 ? Number((totalDistanceKm / totalConsumedKwh).toFixed(2)) : 0);
  const avgDurationMinutes =
    summary?.avgDurationMinutes ??
    metrics.avgDurationMinutes ??
    (derivedSeries.length > 0
      ? Math.round(
          derivedSeries.reduce((s, j) => s + j.durationMinutes, 0) / derivedSeries.length
        )
      : 0);
  const costPerKm =
    summary?.costPerKm ??
    (totalDistanceKm > 0 ? Number((totalCost / totalDistanceKm).toFixed(2)) : 0);

  const co2SavedKg = Math.round(totalDistanceKm * 0.12);

  // Monthly chart coordinates
  const getMonthlyValue = (m: MonthlyTravelPoint, key: MonthlyMetricKey): number => {
    if (key === 'durationHours') return Number((m.durationMinutes / 60).toFixed(1));
    if (key === 'energyKwh') return m.estimatedConsumedKwh || m.energyKwh;
    return m[key];
  };

  const activeMonthlyMeta = MONTHLY_OPTIONS.find((o) => o.key === monthlyMetric)!;
  const monthlyValues = monthlyData.map((m) => getMonthlyValue(m, monthlyMetric));
  const maxMonthlyVal = Math.max(10, ...monthlyValues);
  const activeMonth =
    monthlyData.find((m) => m.monthKey === hoveredMonthKey) ||
    [...monthlyData].reverse().find((m) => getMonthlyValue(m, monthlyMetric) > 0) ||
    monthlyData[monthlyData.length - 1];

  // Trip-by-trip chart (latest 8 chronological)
  const visibleTrips = derivedSeries.slice(-8);
  const maxTripKm = Math.max(100, ...visibleTrips.map((t) => t.distanceKm));
  const maxTripKwh = Math.max(20, ...visibleTrips.map((t) => t.estimatedConsumedKwh));
  const activeTrip = visibleTrips.find((t) => t._id === hoveredTripId) || null;

  // Efficiency / Duration chart
  const maxEff = Math.max(8, ...visibleTrips.map((t) => t.efficiencyKmPerKwh || 0));
  const maxDurHrs = Math.max(
    4,
    ...visibleTrips.map((t) => Number((t.durationMinutes / 60).toFixed(1)))
  );
  const activeEffTrip = visibleTrips.find((t) => t._id === hoveredEffId) || null;

  // AC vs DC and Network breakdown
  const networkBreakdown = analytics?.networkBreakdown || [];
  const acKwh = summary?.acEnergyKwh ?? 0;
  const dcKwh = summary?.dcEnergyKwh ?? totalChargedKwh;
  const totalAcDcKwh = Math.max(0.1, acKwh + dcKwh);
  const dcSharePct = Math.round((dcKwh / totalAcDcKwh) * 100);

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif-display italic text-2xl sm:text-3xl text-[var(--text)]">
            EV Performance & Travel Analytics
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Interactive telemetry across distance, electricity consumption, efficiency, expenditure, duration, and monthly cadence.
          </p>
        </div>
        {showFullHeaderLink && (
          <Link
            to="/analytics"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] transition-colors whitespace-nowrap shrink-0"
          >
            <Gauge className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span>Open Cost Calculator & Deep Lab</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          </Link>
        )}
      </div>

      {/* 6-Metric Core Analytics Strip (Single Elevation, Hairline Dividers) */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-[var(--border)] overflow-hidden">
        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Distance</span>
            <Route className="h-3.5 w-3.5 text-[var(--primary)]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-[var(--text)]">
            {totalDistanceKm.toLocaleString()} km
          </div>
          <p className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
            {derivedSeries.length} {derivedSeries.length === 1 ? 'trip' : 'trips'} logged
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Electricity</span>
            <Zap className="h-3.5 w-3.5 text-[var(--accent)]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-[var(--text)]">
            {totalConsumedKwh.toFixed(1)} kWh
          </div>
          <p className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
            {totalChargedKwh.toFixed(1)} kWh charged on road
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Avg Efficiency</span>
            <Gauge className="h-3.5 w-3.5 text-[var(--primary)]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-[var(--primary)]">
            {avgEfficiency.toFixed(2)} km/kWh
          </div>
          <p className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
            {avgEfficiency > 0 ? `${(100 / avgEfficiency).toFixed(1)} kWh/100km` : '—'}
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Charging Spend</span>
            <IndianRupee className="h-3.5 w-3.5 text-[var(--accent)]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-[var(--text)]">
            {formatINR(totalCost)}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
            ₹{costPerKm.toFixed(2)}/km road avg
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Avg Duration</span>
            <Clock className="h-3.5 w-3.5 text-[var(--primary)]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-[var(--text)]">
            {formatDuration(avgDurationMinutes)}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
            {summary ? `${formatDuration(summary.totalDurationMinutes)} total` : 'Per expedition'}
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Tailpipe Saved</span>
            <Leaf className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-emerald-400">
            {co2SavedKg} kg
          </div>
          <p className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
            CO₂ avoided vs ICE
          </p>
        </div>
      </div>

      {/* Primary Interactive Chart: Monthly Travel Patterns */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-serif-display italic text-xl sm:text-2xl text-[var(--text)]">
              Monthly Travel Patterns
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Track seasonal driving cadence, electricity demand, and charging expenditure month by month.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Monthly analytics metric"
            className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-[var(--surface-2)] p-1 self-start"
          >
            {MONTHLY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={monthlyMetric === opt.key}
                onClick={() => setMonthlyMetric(opt.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  monthlyMetric === opt.key
                    ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Month Readout Line */}
        {activeMonth && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-y border-[var(--border)] py-2.5 text-xs">
            <div className="flex items-center gap-2 text-[var(--text)] font-medium">
              <span>{activeMonth.label}</span>
              <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
              <span className="font-mono tabular-nums text-[var(--primary)]">
                {monthlyMetric === 'chargingCost'
                  ? formatINR(getMonthlyValue(activeMonth, monthlyMetric))
                  : `${getMonthlyValue(activeMonth, monthlyMetric)} ${activeMonthlyMeta.unit}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
              <span>{activeMonth.trips} trips</span>
              <span aria-hidden="true">·</span>
              <span>{activeMonth.distanceKm} km</span>
              <span aria-hidden="true">·</span>
              <span>{activeMonth.estimatedConsumedKwh} kWh</span>
              <span aria-hidden="true">·</span>
              <span>{formatINR(activeMonth.chargingCost)}</span>
              <span aria-hidden="true">·</span>
              <span>{formatDuration(activeMonth.durationMinutes)}</span>
            </div>
          </div>
        )}

        {/* SVG Monthly Bar + Trend Curve */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 760 220"
            className="w-full min-w-[460px] h-52 overflow-visible"
            role="img"
            aria-label={`Monthly ${activeMonthlyMeta.label} chart`}
          >
            <defs>
              <linearGradient id="evj-monthly-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.95" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id="evj-monthly-bar-amber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.95" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.25" />
              </linearGradient>
            </defs>

            {/* Horizontal gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = 20 + (1 - ratio) * 155;
              const tickVal = Math.round(maxMonthlyVal * ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={48}
                    x2={740}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray={ratio === 0 ? undefined : '3 5'}
                    strokeWidth={1}
                  />
                  <text
                    x={40}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="var(--text-muted)"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {monthlyMetric === 'chargingCost' ? `₹${tickVal}` : tickVal}
                  </text>
                </g>
              );
            })}

            {/* Connecting smooth polyline */}
            {monthlyData.length > 1 && (
              <path
                d={monthlyData
                  .map((m, idx) => {
                    const val = getMonthlyValue(m, monthlyMetric);
                    const slotW = 670 / monthlyData.length;
                    const cx = 56 + slotW * idx + slotW / 2;
                    const cy = 20 + (1 - Math.min(1, val / maxMonthlyVal)) * 155;
                    return `${idx === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke={
                  monthlyMetric === 'chargingCost' || monthlyMetric === 'energyKwh'
                    ? 'var(--accent)'
                    : 'var(--primary)'
                }
                strokeOpacity="0.45"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            )}

            {/* Bars + labels */}
            {monthlyData.map((m, idx) => {
              const val = getMonthlyValue(m, monthlyMetric);
              const slotW = 670 / Math.max(1, monthlyData.length);
              const barW = Math.min(44, slotW * 0.46);
              const cx = 56 + slotW * idx + slotW / 2;
              const barH = val > 0 ? Math.max(6, (val / maxMonthlyVal) * 155) : 3;
              const barY = 175 - barH;
              const isSelected = activeMonth?.monthKey === m.monthKey;
              const isAmber =
                monthlyMetric === 'chargingCost' || monthlyMetric === 'energyKwh';

              return (
                <g
                  key={m.monthKey}
                  onMouseEnter={() => setHoveredMonthKey(m.monthKey)}
                  onClick={() => setHoveredMonthKey(m.monthKey)}
                  className="cursor-pointer"
                >
                  {/* Hover column target */}
                  <rect
                    x={cx - slotW / 2}
                    y={10}
                    width={slotW}
                    height={195}
                    fill="transparent"
                  />
                  <rect
                    x={cx - barW / 2}
                    y={barY}
                    width={barW}
                    height={barH}
                    rx={6}
                    fill={
                      val === 0
                        ? 'var(--border)'
                        : isAmber
                        ? 'url(#evj-monthly-bar-amber)'
                        : 'url(#evj-monthly-bar)'
                    }
                    opacity={isSelected || val > 0 ? 1 : 0.45}
                  />
                  {val > 0 && (
                    <>
                      <circle
                        cx={cx}
                        cy={barY}
                        r={isSelected ? 4.5 : 3}
                        fill={isAmber ? 'var(--accent)' : 'var(--primary)'}
                        stroke="var(--surface)"
                        strokeWidth={1.5}
                      />
                      <text
                        x={cx}
                        y={barY - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill="var(--text)"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {monthlyMetric === 'chargingCost' ? formatINR(val) : val}
                      </text>
                    </>
                  )}
                  <text
                    x={cx}
                    y={198}
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight={isSelected ? '700' : '500'}
                    fill={isSelected ? 'var(--primary)' : 'var(--text-muted)'}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Two-Column Interactive Charts: (1) Distance & Electricity Consumption, (2) Efficiency & Journey Duration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 2: Distance & Electricity Consumption per Journey */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-serif-display italic text-xl text-[var(--text)]">
                Distance & Electricity Consumption
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Kilometres driven vs estimated kWh consumed per trip.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[var(--primary)]" />
                Distance (km)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[var(--accent)]" />
                Energy (kWh)
              </span>
            </div>
          </div>

          <div className="h-7 flex items-center justify-between text-xs border-b border-[var(--border)] pb-2">
            {activeTrip ? (
              <>
                <span className="font-medium text-[var(--text)] truncate pr-2">
                  {activeTrip.title}
                </span>
                <span className="font-mono tabular-nums text-[var(--primary)] whitespace-nowrap">
                  {activeTrip.distanceKm} km · {activeTrip.estimatedConsumedKwh} kWh
                </span>
              </>
            ) : (
              <span className="text-[var(--text-muted)]">
                Hover a trip bar to inspect exact km and kWh consumption.
              </span>
            )}
          </div>

          {visibleTrips.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
              Log your first EV trip to compare distance and electricity consumption.
            </div>
          ) : (
            <div className="h-48 flex items-end gap-3 pt-4">
              {visibleTrips.map((t) => {
                const distPct = Math.max(10, Math.round((t.distanceKm / maxTripKm) * 100));
                const kwhPct = Math.max(
                  8,
                  Math.round((t.estimatedConsumedKwh / maxTripKwh) * 100)
                );
                const active = hoveredTripId === t._id;
                return (
                  <Link
                    key={t._id}
                    to={`/journeys/${t._id}`}
                    onMouseEnter={() => setHoveredTripId(t._id)}
                    onMouseLeave={() => setHoveredTripId(null)}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end group min-w-0"
                  >
                    <div className="w-full flex items-end justify-center gap-1.5 h-36">
                      <div className="flex flex-col items-center justify-end h-full">
                        <span className="text-[9.5px] font-mono tabular-nums text-[var(--text-muted)] mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.distanceKm}
                        </span>
                        <div
                          style={{ height: `${distPct}%` }}
                          className={`w-4 sm:w-5 rounded-t-md transition-colors ${
                            active
                              ? 'bg-[var(--primary)]'
                              : 'bg-[var(--primary)]/80 group-hover:bg-[var(--primary)]'
                          }`}
                        />
                      </div>
                      <div className="flex flex-col items-center justify-end h-full">
                        <span className="text-[9.5px] font-mono tabular-nums text-[var(--accent)] mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.estimatedConsumedKwh}
                        </span>
                        <div
                          style={{ height: `${kwhPct}%` }}
                          className={`w-3 sm:w-4 rounded-t-md transition-colors ${
                            active
                              ? 'bg-[var(--accent)]'
                              : 'bg-[var(--accent)]/80 group-hover:bg-[var(--accent)]'
                          }`}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] truncate max-w-full">
                      {t.title.split(' ')[0]}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 3: Average Efficiency (km/kWh) & Journey Duration */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-serif-display italic text-xl text-[var(--text)]">
                {tripMode === 'efficiency'
                  ? 'Efficiency Benchmark (km/kWh)'
                  : 'Journey Duration Profile'}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {tripMode === 'efficiency'
                  ? `Per-trip efficiency against your ${avgEfficiency.toFixed(2)} km/kWh fleet mean.`
                  : `Trip durations compared to your ${formatDuration(avgDurationMinutes)} average.`}
              </p>
            </div>

            <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--surface-2)] p-1">
              <button
                type="button"
                onClick={() => setTripMode('efficiency')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  tripMode === 'efficiency'
                    ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Efficiency
              </button>
              <button
                type="button"
                onClick={() => setTripMode('duration')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  tripMode === 'duration'
                    ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Duration
              </button>
            </div>
          </div>

          <div className="h-7 flex items-center justify-between text-xs border-b border-[var(--border)] pb-2">
            {activeEffTrip ? (
              <>
                <span className="font-medium text-[var(--text)] truncate pr-2">
                  {activeEffTrip.title} · {formatDateShort(activeEffTrip.startDate)}
                </span>
                <span className="font-mono tabular-nums text-[var(--primary)] whitespace-nowrap">
                  {tripMode === 'efficiency'
                    ? `${activeEffTrip.efficiencyKmPerKwh} km/kWh`
                    : formatDuration(activeEffTrip.durationMinutes)}
                </span>
              </>
            ) : (
              <span className="text-[var(--text-muted)]">
                {tripMode === 'efficiency'
                  ? `Dashed line marks fleet average (${avgEfficiency.toFixed(2)} km/kWh).`
                  : `Dashed line marks average duration (${formatDuration(avgDurationMinutes)}).`}
              </span>
            )}
          </div>

          {visibleTrips.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
              No journey efficiency or duration data yet.
            </div>
          ) : (
            <svg
              viewBox="0 0 480 185"
              className="w-full h-48 overflow-visible"
              role="img"
              aria-label="Trip efficiency and duration comparison"
            >
              {/* Benchmark Average Line */}
              {(() => {
                const avgVal =
                  tripMode === 'efficiency'
                    ? avgEfficiency
                    : Number((avgDurationMinutes / 60).toFixed(1));
                const maxDomain = tripMode === 'efficiency' ? maxEff : maxDurHrs;
                const yAvg = 18 + (1 - Math.min(1, avgVal / maxDomain)) * 130;
                return (
                  <g>
                    <line
                      x1={38}
                      x2={470}
                      y1={yAvg}
                      y2={yAvg}
                      stroke="var(--accent)"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <text
                      x={468}
                      y={yAvg - 5}
                      textAnchor="end"
                      fontSize="9.5"
                      fontWeight="600"
                      fill="var(--accent)"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      Avg {tripMode === 'efficiency' ? `${avgVal} km/kWh` : formatDuration(avgDurationMinutes)}
                    </text>
                  </g>
                );
              })()}

              {/* Y-Axis baseline */}
              <line x1={38} x2={470} y1={148} y2={148} stroke="var(--border)" strokeWidth="1" />

              {visibleTrips.map((t, idx) => {
                const val =
                  tripMode === 'efficiency'
                    ? t.efficiencyKmPerKwh
                    : Number((t.durationMinutes / 60).toFixed(1));
                const maxDomain = tripMode === 'efficiency' ? maxEff : maxDurHrs;
                const slotW = 420 / visibleTrips.length;
                const cx = 44 + slotW * idx + slotW / 2;
                const barW = Math.min(34, slotW * 0.52);
                const barH = Math.max(8, (val / maxDomain) * 130);
                const y = 148 - barH;
                const aboveAvg =
                  tripMode === 'efficiency'
                    ? val >= avgEfficiency
                    : t.durationMinutes >= avgDurationMinutes;

                return (
                  <g
                    key={t._id}
                    onMouseEnter={() => setHoveredEffId(t._id)}
                    onMouseLeave={() => setHoveredEffId(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={cx - barW / 2}
                      y={y}
                      width={barW}
                      height={barH}
                      rx={5}
                      fill={
                        tripMode === 'efficiency'
                          ? aboveAvg
                            ? 'var(--primary)'
                            : 'var(--text-muted)'
                          : 'var(--primary)'
                      }
                      opacity={hoveredEffId === t._id ? 1 : 0.82}
                    />
                    <text
                      x={cx}
                      y={y - 6}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="600"
                      fill="var(--text)"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {tripMode === 'efficiency' ? val.toFixed(1) : `${val}h`}
                    </text>
                    <text
                      x={cx}
                      y={166}
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="var(--text-muted)"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {t.title.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Charging Expenditure & Network Mix */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
          {/* Charging Expenditure & AC/DC Split */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif-display italic text-xl text-[var(--text)]">
                  Charging Expenditure & Mix
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Total road-charging cost split by charger type and trip.
                </p>
              </div>
              <BatteryCharging className="h-4 w-4 text-[var(--primary)]" />
            </div>

            {/* Proportional DC vs AC Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="text-[var(--primary)]">
                  DC Fast · {dcKwh.toFixed(1)} kWh ({dcSharePct}%)
                </span>
                <span className="text-[var(--accent)]">
                  AC Destination · {acKwh.toFixed(1)} kWh ({100 - dcSharePct}%)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-[var(--surface-2)] overflow-hidden flex">
                <div
                  style={{ width: `${dcSharePct}%` }}
                  className="h-full bg-[var(--primary)] transition-all"
                />
                <div
                  style={{ width: `${100 - dcSharePct}%` }}
                  className="h-full bg-[var(--accent)] transition-all"
                />
              </div>
            </div>

            {/* Expenditure per journey */}
            <div className="space-y-2.5 pt-2">
              {visibleTrips.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">
                  Add charging stops inside any journey to inspect expenditure per trip.
                </p>
              ) : (
                visibleTrips.slice(-4).map((t) => {
                  const maxTripCost = Math.max(
                    500,
                    ...visibleTrips.map((x) => x.chargingCost || 0)
                  );
                  const pct = Math.max(4, Math.round((t.chargingCost / maxTripCost) * 100));
                  return (
                    <div key={t._id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text)] truncate pr-3">{t.title}</span>
                        <span className="font-mono tabular-nums text-[var(--text-muted)] shrink-0">
                          {formatINR(t.chargingCost)} · {t.energyKwh} kWh
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div
                          style={{ width: `${t.chargingCost > 0 ? pct : 0}%` }}
                          className="h-full rounded-full bg-[var(--accent)]"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Network Breakdown */}
          <div className="pt-6 lg:pt-0 lg:pl-8 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif-display italic text-xl text-[var(--text)]">
                  Charging Networks Used
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Share of sessions, kWh dispensed, and spend by provider.
                </p>
              </div>
              <Fuel className="h-4 w-4 text-[var(--accent)]" />
            </div>

            {networkBreakdown.length === 0 ? (
              <div className="py-8 text-xs text-[var(--text-muted)]">
                Log charging stops with network details (Statiq, Tata Power, Zeon, Jio-bp) to track provider expenditure.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {networkBreakdown.map((net) => {
                  const spendShare =
                    totalCost > 0 ? Math.round((net.cost / totalCost) * 100) : 0;
                  return (
                    <div key={net.network} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--text)]">{net.network}</span>
                        <span className="font-mono tabular-nums text-[var(--text)]">
                          {formatINR(net.cost)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
                        <span>
                          {net.sessions} {net.sessions === 1 ? 'session' : 'sessions'} ·{' '}
                          {net.energyKwh} kWh
                        </span>
                        <span>{spendShare}% of spend</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
