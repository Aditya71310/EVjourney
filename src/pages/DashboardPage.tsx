import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BatteryCharging, CarFront, Compass, Plus, Route, Zap } from 'lucide-react';
import api, { extractErrorMessage } from '../services/api';
import type { AnalyticsData, DashboardMetrics, Journey, User, Vehicle } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { EvAnalyticsCharts } from '../components/EvAnalyticsCharts';
import { TripCostCalculator } from '../components/TripCostCalculator';
import { VehicleSilhouette } from '../components/VehicleSilhouette';
import { formatDateShort, formatINR } from '../utils/formatters';

interface DashboardResponse {
  user: User;
  metrics: DashboardMetrics;
  analytics?: AnalyticsData;
  recentJourneys: Journey[];
  vehicles: Vehicle[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get<DashboardResponse>('/users/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(extractErrorMessage(err, 'Failed to load dashboard.')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-16 rounded-xl bg-[var(--surface)] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-60 rounded-xl bg-[var(--surface)] animate-pulse" />
          <div className="h-60 rounded-xl bg-[var(--surface)] animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-6 text-sm text-[var(--danger)]">
        {error || 'Unable to load dashboard.'}
      </div>
    );
  }

  const { user, metrics, analytics, recentJourneys, vehicles } = data;

  return (
    <div className="space-y-10 pb-8">
      {/* Welcome Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <ResilientImage
            src={user.avatar}
            alt={user.name}
            fallbackType="avatar"
            className="h-14 w-14 rounded-full object-cover border border-[var(--border)] shrink-0"
          />
          <div className="space-y-0.5">
            <h1 className="font-serif-display italic text-3xl sm:text-4xl text-[var(--text)] tracking-tight">
              Welcome back, {user.name.split(' ')[0]}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {user.city
                ? `${user.city}${user.country ? `, ${user.country}` : ''}`
                : `@${user.username}`}
              {' · '}
              {vehicles.length} {vehicles.length === 1 ? 'EV registered' : 'EVs registered'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/garage/new"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] transition-colors whitespace-nowrap"
          >
            <CarFront className="h-4 w-4 text-[var(--primary)]" />
            <span>Add EV</span>
          </Link>
          <Link
            to="/journeys/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-[var(--primary-fg)] hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Create Journey</span>
          </Link>
        </div>
      </div>

      {/* 4-Column Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Journeys',
            value: String(metrics.totalJourneys),
            sub: 'Logged expeditions',
            icon: Compass,
          },
          {
            label: 'Distance Travelled',
            value: `${metrics.totalDistanceKm.toLocaleString()} km`,
            sub: 'Electric road miles',
            icon: Route,
          },
          {
            label: 'Charging Stops',
            value: String(metrics.totalChargingStops),
            sub: `Total spend ${formatINR(metrics.totalChargingCost)}`,
            icon: BatteryCharging,
          },
          {
            label: 'Energy Added',
            value: `${metrics.totalEnergyKwh} kWh`,
            sub: 'Cumulative session energy',
            icon: Zap,
          },
        ].map(({ label, value, sub, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2.5"
          >
            <div className="flex items-center justify-between text-[var(--text-muted)]">
              <span className="text-xs font-medium">{label}</span>
              <Icon className="h-4 w-4 text-[var(--primary)]" />
            </div>
            <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-[var(--text)]">
              {value}
            </div>
            <p className="text-xs text-[var(--text-muted)]">{sub}</p>
          </div>
        ))}
      </div>

      {/* Advanced EV Analytics Dashboard (6 Interactive Dimensions) */}
      <EvAnalyticsCharts
        metrics={metrics}
        journeys={recentJourneys}
        analytics={analytics}
        showFullHeaderLink
      />

      {/* Interactive Trip Cost Calculator (EV vs Petrol vs Diesel) */}
      <TripCostCalculator
        journeys={recentJourneys}
        vehicles={vehicles}
        defaultEfficiencyKmPerKwh={metrics.avgEfficiencyKmPerKwh || 6.2}
        totalLoggedDistanceKm={metrics.totalDistanceKm}
      />

      {/* Recent Journeys */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
            Recent Journeys
          </h2>
          <Link
            to="/journeys"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
          >
            <span>View all journeys</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentJourneys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center space-y-3">
            <Compass className="h-8 w-8 text-[var(--primary)] mx-auto opacity-80" />
            <h3 className="font-serif-display italic text-xl text-[var(--text)]">
              No road trips logged yet
            </h3>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
              Document your first electric road trip with route stops, photos, and charging
              statistics.
            </p>
            <div className="pt-2">
              <Link
                to="/journeys/new"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-fg)]"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Journey</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {recentJourneys.map((journey) => (
              <Link
                key={journey._id}
                to={`/journeys/${journey._id}`}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:border-[var(--primary)] transition-colors"
              >
                <div className="aspect-[16/9] overflow-hidden relative">
                  <ResilientImage
                    src={journey.coverImage}
                    alt={journey.title}
                    fallbackType="journey"
                    fallbackLabel={journey.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <div className="absolute left-4 bottom-3 right-4 text-white">
                    <h3 className="font-serif-display italic text-2xl truncate">
                      {journey.title}
                    </h3>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {journey.startLocation} → {journey.endLocation}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono tabular-nums shrink-0">
                    <span>{formatDateShort(journey.startDate)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[var(--primary)]">{journey.distanceKm} km</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Registered Vehicles */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
            Your EV Garage
          </h2>
          <Link
            to="/garage"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
          >
            <span>Manage garage</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {vehicles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center space-y-3">
            <CarFront className="h-7 w-7 text-[var(--primary)] mx-auto opacity-80" />
            <p className="text-sm text-[var(--text-muted)]">
              Add your electric vehicle to start tracking battery capacity and road trips.
            </p>
            <Link
              to="/garage/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-fg)]"
            >
              Add Vehicle
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {vehicles.map((v) => (
              <Link
                key={v._id}
                to={`/garage/${v._id}/edit`}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:border-[var(--primary)] transition-colors flex flex-col justify-between"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <ResilientImage
                    src={v.photo}
                    alt={`${v.brand} ${v.model}`}
                    fallbackType="vehicle"
                    fallbackLabel={`${v.brand} ${v.model}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                      <span className="font-mono tabular-nums">{v.batteryCapacity} kWh</span>
                      {v.isDefault && (
                        <span className="text-[var(--primary)] font-medium">
                          Default EV
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif-display italic text-xl truncate text-[var(--text)]">
                      {v.brand} {v.model}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {v.nickname ? `${v.nickname} · ` : ''}
                      {v.variant || v.colour}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)]">
                    <VehicleSilhouette
                      model={v.model}
                      colour={v.colour}
                      batteryCapacity={v.batteryCapacity}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
