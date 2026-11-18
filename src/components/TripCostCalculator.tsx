import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calculator, Droplets, Fuel, Leaf, RotateCcw, Zap } from 'lucide-react';
import type { Journey, Vehicle } from '../types';
import { formatINR } from '../utils/formatters';

interface TripCostCalculatorProps {
  journeys?: Journey[];
  vehicles?: Vehicle[];
  defaultEfficiencyKmPerKwh?: number;
  totalLoggedDistanceKm?: number;
}

type ChartViewMode = 'tripCost' | 'annualCost' | 'savings';

const EV_PRESETS = [
  { id: 'suv', label: 'SUV EV · 6.2', eff: 6.2 },
  { id: 'sedan', label: 'Sedan EV · 7.4', eff: 7.4 },
  { id: 'compact', label: 'Hatch EV · 7.8', eff: 7.8 },
];

export function TripCostCalculator({
  journeys = [],
  vehicles = [],
  defaultEfficiencyKmPerKwh = 6.2,
  totalLoggedDistanceKm = 0,
}: TripCostCalculatorProps) {
  const initialDistance =
    journeys[0]?.distanceKm && journeys[0].distanceKm > 0 ? journeys[0].distanceKm : 350;

  const [distanceKm, setDistanceKm] = useState<number>(initialDistance);
  const [roundTrip, setRoundTrip] = useState<boolean>(false);

  // EV inputs: Efficiency & Energy Price
  const [evEfficiency, setEvEfficiency] = useState<number>(
    defaultEfficiencyKmPerKwh > 1 ? Number(defaultEfficiencyKmPerKwh.toFixed(1)) : 6.2
  );
  const [energyPrice, setEnergyPrice] = useState<number>(12);

  // ICE (Petrol & Diesel) inputs: Efficiency & Fuel Price
  const [petrolEfficiency, setPetrolEfficiency] = useState<number>(14);
  const [petrolPrice, setPetrolPrice] = useState<number>(104);

  const [dieselEfficiency, setDieselEfficiency] = useState<number>(18);
  const [dieselPrice, setDieselPrice] = useState<number>(92);

  // Annual distance & chart view selector
  const [annualKm, setAnnualKm] = useState<number>(15000);
  const [chartView, setChartView] = useState<ChartViewMode>('tripCost');

  const effectiveDistance = Math.max(1, distanceKm * (roundTrip ? 2 : 1));

  const results = useMemo(() => {
    const safeEvEff = Math.max(1, evEfficiency);
    const safePetrolEff = Math.max(2, petrolEfficiency);
    const safeDieselEff = Math.max(2, dieselEfficiency);

    const evKwh = effectiveDistance / safeEvEff;
    const evCost = evKwh * energyPrice;
    const evCostPerKm = evCost / effectiveDistance;

    const petrolLitres = effectiveDistance / safePetrolEff;
    const petrolCost = petrolLitres * petrolPrice;
    const petrolCostPerKm = petrolCost / effectiveDistance;

    const dieselLitres = effectiveDistance / safeDieselEff;
    const dieselCost = dieselLitres * dieselPrice;
    const dieselCostPerKm = dieselCost / effectiveDistance;

    const savingsVsPetrol = Math.max(0, petrolCost - evCost);
    const savingsVsDiesel = Math.max(0, dieselCost - evCost);
    const pctSavedVsPetrol = petrolCost > 0 ? Math.round((savingsVsPetrol / petrolCost) * 100) : 0;
    const pctSavedVsDiesel = dieselCost > 0 ? Math.round((savingsVsDiesel / dieselCost) * 100) : 0;

    // Tailpipe CO2: Petrol ~2.31 kg/L, Diesel ~2.68 kg/L, EV 0 kg tailpipe
    const petrolCo2Kg = petrolLitres * 2.31;
    const dieselCo2Kg = dieselLitres * 2.68;

    const annualEvCost = (annualKm / safeEvEff) * energyPrice;
    const annualPetrolCost = (annualKm / safePetrolEff) * petrolPrice;
    const annualDieselCost = (annualKm / safeDieselEff) * dieselPrice;

    return {
      evKwh,
      evCost,
      evCostPerKm,
      petrolLitres,
      petrolCost,
      petrolCostPerKm,
      petrolCo2Kg,
      dieselLitres,
      dieselCost,
      dieselCostPerKm,
      dieselCo2Kg,
      savingsVsPetrol,
      savingsVsDiesel,
      pctSavedVsPetrol,
      pctSavedVsDiesel,
      annualEvCost,
      annualPetrolCost,
      annualDieselCost,
      annualSavingsVsPetrol: Math.max(0, annualPetrolCost - annualEvCost),
      annualSavingsVsDiesel: Math.max(0, annualDieselCost - annualEvCost),
      annualCo2AvoidedPetrolKg: (annualKm / safePetrolEff) * 2.31,
    };
  }, [
    effectiveDistance,
    evEfficiency,
    energyPrice,
    petrolEfficiency,
    petrolPrice,
    dieselEfficiency,
    dieselPrice,
    annualKm,
  ]);

  const chartData = useMemo(() => {
    if (chartView === 'annualCost') {
      return [
        {
          name: 'Electric (EV)',
          cost: Math.round(results.annualEvCost),
          unitLabel: `${Math.round(annualKm / Math.max(1, evEfficiency))} kWh/yr`,
          fill: '#2DD4BF',
        },
        {
          name: 'Diesel ICE',
          cost: Math.round(results.annualDieselCost),
          unitLabel: `${Math.round(annualKm / Math.max(2, dieselEfficiency))} L/yr`,
          fill: '#94A3B8',
        },
        {
          name: 'Petrol ICE',
          cost: Math.round(results.annualPetrolCost),
          unitLabel: `${Math.round(annualKm / Math.max(2, petrolEfficiency))} L/yr`,
          fill: '#FBBF24',
        },
      ];
    }

    if (chartView === 'savings') {
      return [
        {
          name: 'Saved vs Diesel',
          cost: Math.round(results.savingsVsDiesel),
          unitLabel: `${results.pctSavedVsDiesel}% cheaper`,
          fill: '#34D399',
        },
        {
          name: 'Saved vs Petrol',
          cost: Math.round(results.savingsVsPetrol),
          unitLabel: `${results.pctSavedVsPetrol}% cheaper`,
          fill: '#2DD4BF',
        },
      ];
    }

    return [
      {
        name: 'Electric (EV)',
        cost: Math.round(results.evCost),
        unitLabel: `${results.evKwh.toFixed(1)} kWh · ₹${results.evCostPerKm.toFixed(2)}/km`,
        fill: '#2DD4BF',
      },
      {
        name: 'Diesel ICE',
        cost: Math.round(results.dieselCost),
        unitLabel: `${results.dieselLitres.toFixed(1)} L · ₹${results.dieselCostPerKm.toFixed(2)}/km`,
        fill: '#94A3B8',
      },
      {
        name: 'Petrol ICE',
        cost: Math.round(results.petrolCost),
        unitLabel: `${results.petrolLitres.toFixed(1)} L · ₹${results.petrolCostPerKm.toFixed(2)}/km`,
        fill: '#FBBF24',
      },
    ];
  }, [
    chartView,
    results,
    annualKm,
    evEfficiency,
    dieselEfficiency,
    petrolEfficiency,
  ]);

  const handleReset = () => {
    setDistanceKm(initialDistance);
    setRoundTrip(false);
    setEvEfficiency(
      defaultEfficiencyKmPerKwh > 1 ? Number(defaultEfficiencyKmPerKwh.toFixed(1)) : 6.2
    );
    setEnergyPrice(12);
    setPetrolEfficiency(14);
    setPetrolPrice(104);
    setDieselEfficiency(18);
    setDieselPrice(92);
    setAnnualKm(15000);
    setChartView('tripCost');
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-6">
      {/* Header & Quick Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="font-serif-display italic text-2xl sm:text-3xl text-[var(--text)]">
              Trip Cost Calculator
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Compare journey expenditure and annual savings between an Electric Vehicle and equivalent Petrol or Diesel ICE vehicles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {totalLoggedDistanceKm > 0 && (
            <button
              type="button"
              onClick={() => {
                setDistanceKm(totalLoggedDistanceKm);
                setRoundTrip(false);
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                distanceKm === totalLoggedDistanceKm && !roundTrip
                  ? 'border-[var(--primary)] bg-[var(--primary-bg)] text-[var(--primary)]'
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--primary)]'
              }`}
            >
              Logged Total ({totalLoggedDistanceKm} km)
            </button>
          )}
          {journeys.slice(0, 2).map((j) => (
            <button
              key={j._id}
              type="button"
              onClick={() => {
                setDistanceKm(j.distanceKm || 250);
                setRoundTrip(false);
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                distanceKm === j.distanceKm && !roundTrip
                  ? 'border-[var(--primary)] bg-[var(--primary-bg)] text-[var(--primary)]'
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--primary)]'
              }`}
            >
              {j.title.split(' ').slice(0, 2).join(' ')} ({j.distanceKm} km)
            </button>
          ))}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 5 cols: Input Fields (Distance, Efficiency, Fuel/Energy Price) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Distance Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="calc-distance-input"
                className="text-xs font-semibold text-[var(--text)]"
              >
                Distance (km)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRoundTrip((v) => !v)}
                  aria-pressed={roundTrip}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border transition-colors whitespace-nowrap ${
                    roundTrip
                      ? 'border-[var(--primary)] bg-[var(--primary-bg)] text-[var(--primary)]'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  Round trip (×2)
                </button>
                <span className="font-mono text-sm font-semibold tabular-nums text-[var(--primary)]">
                  {effectiveDistance.toLocaleString()} km
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={20}
                max={2500}
                step={10}
                value={Math.min(2500, distanceKm)}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                aria-label="Distance slider"
                className="flex-1 accent-[var(--primary)] cursor-pointer"
              />
              <input
                id="calc-distance-input"
                type="number"
                min={1}
                max={50000}
                value={distanceKm}
                onChange={(e) => setDistanceKm(Math.max(1, Number(e.target.value) || 0))}
                className="w-24 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-right font-mono text-xs tabular-nums text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* 2. EV Efficiency & Energy Price */}
          <div className="border-t border-[var(--border)] pt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)]">
                <Zap className="h-3.5 w-3.5" />
                <span>Electric Vehicle (EV)</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {vehicles.slice(0, 2).map((v) => {
                  const estEff = v.batteryCapacity > 90 ? 5.6 : 6.8;
                  return (
                    <button
                      key={v._id}
                      type="button"
                      onClick={() => setEvEfficiency(estEff)}
                      className="rounded-md bg-[var(--surface-2)] px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors whitespace-nowrap"
                    >
                      {v.model}
                    </button>
                  );
                })}
                {EV_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setEvEfficiency(p.eff)}
                    className="rounded-md bg-[var(--surface-2)] px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors whitespace-nowrap"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[11px] text-[var(--text-muted)] block">
                  EV Efficiency (km/kWh)
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  step={0.1}
                  value={evEfficiency}
                  onChange={(e) => setEvEfficiency(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs tabular-nums text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] text-[var(--text-muted)] block">
                  Energy Price (₹/kWh)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={energyPrice}
                  onChange={(e) => setEnergyPrice(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs tabular-nums text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[var(--text-muted)]">Tariff presets:</span>
              {[
                { label: 'Home AC · ₹8', price: 8 },
                { label: 'Blended · ₹12', price: 12 },
                { label: 'Fast DC · ₹18', price: 18 },
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setEnergyPrice(t.price)}
                  className={`rounded-md px-2 py-0.5 font-mono transition-colors ${
                    energyPrice === t.price
                      ? 'bg-[var(--primary-bg)] text-[var(--primary)] font-semibold'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Petrol & Diesel Efficiency + Fuel Price */}
          <div className="border-t border-[var(--border)] pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                <Fuel className="h-3.5 w-3.5" />
                <span>Petrol ICE</span>
              </div>
              <label className="block space-y-1">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Efficiency (km/L)
                </span>
                <input
                  type="number"
                  min={2}
                  max={50}
                  step={0.5}
                  value={petrolEfficiency}
                  onChange={(e) =>
                    setPetrolEfficiency(Math.max(2, Number(e.target.value) || 2))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-xs tabular-nums text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Fuel Price (₹/L)
                </span>
                <input
                  type="number"
                  min={1}
                  max={400}
                  step={1}
                  value={petrolPrice}
                  onChange={(e) => setPetrolPrice(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-xs tabular-nums text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text)]">
                <Droplets className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span>Diesel ICE</span>
              </div>
              <label className="block space-y-1">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Efficiency (km/L)
                </span>
                <input
                  type="number"
                  min={2}
                  max={50}
                  step={0.5}
                  value={dieselEfficiency}
                  onChange={(e) =>
                    setDieselEfficiency(Math.max(2, Number(e.target.value) || 2))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-xs tabular-nums text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Fuel Price (₹/L)
                </span>
                <input
                  type="number"
                  min={1}
                  max={400}
                  step={1}
                  value={dieselPrice}
                  onChange={(e) => setDieselPrice(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-xs tabular-nums text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right 7 cols: Recharts Comparison Bar Chart + Savings Breakdown */}
        <div className="lg:col-span-7 lg:border-l lg:border-[var(--border)] lg:pl-8 space-y-6">
          {/* Estimated Savings Highlight Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--primary-bg)]/55 rounded-xl p-4 sm:p-5">
            <div className="space-y-1">
              <span className="text-xs text-[var(--text-muted)]">
                Estimated savings vs Petrol
              </span>
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-[var(--primary)]">
                  {formatINR(results.savingsVsPetrol)}
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-400">
                  {results.pctSavedVsPetrol}% cheaper
                </span>
              </div>
            </div>

            <div className="space-y-1 sm:border-l sm:border-[var(--border)] sm:pl-5">
              <span className="text-xs text-[var(--text-muted)]">
                Estimated savings vs Diesel
              </span>
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-[var(--primary)]">
                  {formatINR(results.savingsVsDiesel)}
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-400">
                  {results.pctSavedVsDiesel}% cheaper
                </span>
              </div>
            </div>
          </div>

          {/* Recharts BarChart Comparison */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--text)]">
                {chartView === 'tripCost'
                  ? `Cost Comparison for ${effectiveDistance.toLocaleString()} km`
                  : chartView === 'annualCost'
                  ? `Projected Annual Fuel Cost (${annualKm.toLocaleString()} km/yr)`
                  : `Trip Savings Using EV (${effectiveDistance.toLocaleString()} km)`}
              </span>

              <div className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-2)] p-1">
                {[
                  { id: 'tripCost' as const, label: 'Trip Cost' },
                  { id: 'savings' as const, label: 'EV Savings' },
                  { id: 'annualCost' as const, label: 'Annual Cost' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setChartView(tab.id)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                      chartView === tab.id
                        ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 14, right: 16, left: 4, bottom: 8 }}
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fill: 'var(--text-muted)',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val: number) => `₹${val.toLocaleString('en-IN')}`}
                    width={72}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-2)', opacity: 0.45 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload as {
                        name: string;
                        cost: number;
                        unitLabel: string;
                      };
                      return (
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 shadow-xl text-xs space-y-1">
                          <div className="font-semibold text-[var(--text)]">{item.name}</div>
                          <div className="font-mono font-bold text-sm text-[var(--primary)] tabular-nums">
                            {formatINR(item.cost)}
                          </div>
                          <div className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                            {item.unitLabel}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="cost" radius={[8, 8, 0, 0]} maxBarSize={76}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Powertrain Comparison Matrix */}
          <div className="border-t border-[var(--border)] pt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="py-2 text-left font-medium">Metric</th>
                  <th className="py-2 text-right font-medium text-[var(--primary)]">Electric</th>
                  <th className="py-2 text-right font-medium">Diesel</th>
                  <th className="py-2 text-right font-medium text-[var(--accent)]">Petrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-mono tabular-nums">
                <tr>
                  <td className="py-2.5 font-sans text-[var(--text-muted)]">Trip expenditure</td>
                  <td className="py-2.5 text-right font-semibold text-[var(--primary)]">
                    {formatINR(results.evCost)}
                  </td>
                  <td className="py-2.5 text-right text-[var(--text)]">
                    {formatINR(results.dieselCost)}
                  </td>
                  <td className="py-2.5 text-right text-[var(--text)]">
                    {formatINR(results.petrolCost)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans text-[var(--text-muted)]">Running cost / km</td>
                  <td className="py-2.5 text-right text-[var(--primary)]">
                    ₹{results.evCostPerKm.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right text-[var(--text)]">
                    ₹{results.dieselCostPerKm.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right text-[var(--text)]">
                    ₹{results.petrolCostPerKm.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans text-[var(--text-muted)]">Energy / fuel used</td>
                  <td className="py-2.5 text-right text-[var(--text)]">
                    {results.evKwh.toFixed(1)} kWh
                  </td>
                  <td className="py-2.5 text-right text-[var(--text)]">
                    {results.dieselLitres.toFixed(1)} L
                  </td>
                  <td className="py-2.5 text-right text-[var(--text)]">
                    {results.petrolLitres.toFixed(1)} L
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans text-[var(--text-muted)]">Tailpipe CO₂</td>
                  <td className="py-2.5 text-right text-emerald-400">0 kg</td>
                  <td className="py-2.5 text-right text-[var(--text-muted)]">
                    {results.dieselCo2Kg.toFixed(1)} kg
                  </td>
                  <td className="py-2.5 text-right text-[var(--text-muted)]">
                    {results.petrolCo2Kg.toFixed(1)} kg
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Annual Ownership Projection */}
          <div className="border-t border-[var(--border)] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text)]">
                <Leaf className="h-3.5 w-3.5 text-emerald-400" />
                <span>Annual EV Ownership Projection</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[10000, 15000, 25000].map((kmOption) => (
                  <button
                    key={kmOption}
                    type="button"
                    onClick={() => setAnnualKm(kmOption)}
                    className={`rounded-md px-2 py-1 text-[11px] font-mono tabular-nums transition-colors ${
                      annualKm === kmOption
                        ? 'bg-[var(--primary-bg)] text-[var(--primary)] font-semibold'
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {(kmOption / 1000).toFixed(0)}k km/yr
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono tabular-nums text-xs">
              <div>
                <span className="block text-[11px] font-sans text-[var(--text-muted)]">
                  Saved vs Petrol / yr
                </span>
                <span className="text-base font-bold text-[var(--primary)]">
                  {formatINR(results.annualSavingsVsPetrol)}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-sans text-[var(--text-muted)]">
                  Saved vs Diesel / yr
                </span>
                <span className="text-base font-bold text-emerald-400">
                  {formatINR(results.annualSavingsVsDiesel)}
                </span>
              </div>
              <div className="hidden sm:block">
                <span className="block text-[11px] font-sans text-[var(--text-muted)]">
                  CO₂ avoided / yr
                </span>
                <span className="text-base font-bold text-[var(--text)]">
                  {Math.round(results.annualCo2AvoidedPetrolKg)} kg
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
