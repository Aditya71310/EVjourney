import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Download, Plus } from 'lucide-react';
import api, { extractErrorMessage } from '../services/api';
import type { AnalyticsData, Journey, Vehicle } from '../types';
import { EvAnalyticsCharts } from '../components/EvAnalyticsCharts';
import { TripCostCalculator } from '../components/TripCostCalculator';

type RangeOption = 'all' | '6m' | '12m';

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [range, setRange] = useState<RangeOption>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get<AnalyticsData>('/users/analytics', {
        params: { vehicleId: selectedVehicle, range },
      }),
      api.get<{ journeys: Journey[] }>('/journeys'),
    ])
      .then(([analyticsRes, journeysRes]) => {
        setAnalytics(analyticsRes.data);
        setVehicles(analyticsRes.data.vehicles || []);
        setJourneys(journeysRes.data.journeys || []);
      })
      .catch((err) => setError(extractErrorMessage(err, 'Failed to load EV analytics.')))
      .finally(() => setLoading(false));
  }, [selectedVehicle, range]);

  const handleExportCsv = () => {
    if (!analytics?.journeySeries.length) return;
    const headers = [
      'Title',
      'Date',
      'Vehicle',
      'Start',
      'Destination',
      'Distance_km',
      'Duration_min',
      'Charged_kWh',
      'Consumed_kWh',
      'Efficiency_km_per_kWh',
      'Charging_Cost_INR',
    ];
    const rows = analytics.journeySeries.map((j) =>
      [
        `"${j.title.replace(/"/g, '""')}"`,
        j.startDate.slice(0, 10),
        `"${j.vehicleName.replace(/"/g, '""')}"`,
        `"${j.startLocation.replace(/"/g, '""')}"`,
        `"${j.endLocation.replace(/"/g, '""')}"`,
        j.distanceKm,
        j.durationMinutes,
        j.energyKwh,
        j.estimatedConsumedKwh,
        j.efficiencyKmPerKwh,
        j.chargingCost,
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ev-journey-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !analytics) {
    return (
      <div className="space-y-8">
        <div className="h-14 rounded-xl bg-[var(--surface)] animate-pulse" />
        <div className="h-28 rounded-2xl bg-[var(--surface)] animate-pulse" />
        <div className="h-72 rounded-2xl bg-[var(--surface)] animate-pulse" />
        <div className="h-80 rounded-2xl bg-[var(--surface)] animate-pulse" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-6 text-sm text-[var(--danger)]">
        {error || 'Unable to load analytics.'}
      </div>
    );
  }

  const { summary } = analytics;

  return (
    <div className="space-y-10 pb-10">
      {/* Header & Interactive Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="space-y-1">
          <h1 className="font-serif-display italic text-3xl sm:text-4xl text-[var(--text)] tracking-tight">
            EV Analytics & Cost Lab
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Measure real-world electric efficiency, monthly travel patterns, and fuel savings vs petrol and diesel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Vehicle Filter */}
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            aria-label="Filter analytics by EV"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-medium text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="all">All Vehicles ({vehicles.length})</option>
            {vehicles.map((v) => (
              <option key={v._id} value={v._id}>
                {v.brand} {v.model}
              </option>
            ))}
          </select>

          {/* Timeframe Segmented Control */}
          <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-1">
            {[
              { id: '6m' as const, label: '6 Months' },
              { id: '12m' as const, label: '12 Months' },
              { id: 'all' as const, label: 'All Time' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRange(opt.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  range === opt.id
                    ? 'bg-[var(--primary-bg)] text-[var(--primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {analytics.journeySeries.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-[var(--primary)]" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {analytics.journeySeries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center space-y-3">
          <BarChart3 className="h-8 w-8 text-[var(--primary)] mx-auto opacity-80" />
          <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
            No journeys match this filter
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Log an electric road trip or switch your vehicle/timeframe filter to inspect telemetry charts.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {(selectedVehicle !== 'all' || range !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedVehicle('all');
                  setRange('all');
                }}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)]"
              >
                Reset Filters
              </button>
            )}
            <Link
              to="/journeys/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-fg)]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Journey</span>
            </Link>
          </div>
        </div>
      ) : (
        <EvAnalyticsCharts
          metrics={{
            totalJourneys: summary.totalJourneys,
            totalDistanceKm: summary.totalDistanceKm,
            totalChargingStops: summary.totalChargingStops,
            totalEnergyKwh: summary.totalEnergyKwh,
            totalChargingCost: summary.totalChargingCost,
            avgEfficiencyKmPerKwh: summary.avgEfficiencyKmPerKwh,
            avgDurationMinutes: summary.avgDurationMinutes,
            totalEstimatedConsumedKwh: summary.totalEstimatedConsumedKwh,
          }}
          journeys={journeys}
          analytics={analytics}
        />
      )}

      {/* Trip Cost Calculator (EV vs Petrol vs Diesel) */}
      <TripCostCalculator
        journeys={journeys}
        vehicles={vehicles}
        defaultEfficiencyKmPerKwh={summary.avgEfficiencyKmPerKwh || 6.2}
        totalLoggedDistanceKm={summary.totalDistanceKm}
      />
    </div>
  );
}
