import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Search, Trash2 } from 'lucide-react';
import api, { extractErrorMessage } from '../services/api';
import type { Journey, Vehicle } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { formatDateShort, formatDuration } from '../utils/formatters';

export function MyJourneysPage() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Published' | 'Draft'>('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [jRes, vRes] = await Promise.all([
        api.get<{ journeys: Journey[] }>('/journeys'),
        api.get<{ vehicles: Vehicle[] }>('/vehicles'),
      ]);
      setJourneys(jRes.data.journeys || []);
      setVehicles(vRes.data.vehicles || []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load journeys.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return journeys.filter((j) => {
      if (statusFilter !== 'all' && j.status !== statusFilter) return false;
      if (vehicleFilter !== 'all' && j.vehicleId !== vehicleFilter) return false;
      if (!q) return true;
      return (
        j.title.toLowerCase().includes(q) ||
        j.startLocation.toLowerCase().includes(q) ||
        j.endLocation.toLowerCase().includes(q)
      );
    });
  }, [journeys, query, statusFilter, vehicleFilter]);

  const totalDistance = journeys.reduce((sum, j) => sum + (j.distanceKm || 0), 0);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This also removes its timeline and charging logs.`)) {
      return;
    }
    try {
      await api.delete(`/journeys/${id}`);
      setJourneys((prev) => prev.filter((j) => j._id !== id));
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to delete journey.'));
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-serif-display italic text-3xl sm:text-4xl text-[var(--text)]">
            Your journeys
          </h1>
          <p className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
            {journeys.length} {journeys.length === 1 ? 'trip' : 'trips'} ·{' '}
            {totalDistance.toLocaleString()} km logged
          </p>
        </div>

        <Link
          to="/journeys/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-[var(--primary-fg)] hover:opacity-90 transition-opacity whitespace-nowrap self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Start a journey</span>
        </Link>
      </div>

      {journeys.length > 0 && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, origin, or destination..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
              {(['all', 'Published', 'Draft'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === tab
                      ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab}
                </button>
              ))}
            </div>

            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.brand} {v.model}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-80 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Screen 2: EVJ-02 Curving Road Empty State */
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center space-y-5">
          <svg
            viewBox="0 0 220 120"
            className="w-52 h-28 mx-auto text-[var(--primary)]"
            fill="none"
          >
            <path
              d="M10 105 C65 102, 70 65, 110 58 C150 51, 155 24, 205 22"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="6 6"
              opacity="0.7"
            />
            <circle cx="205" cy="22" r="6" fill="currentColor" />
            <circle cx="205" cy="22" r="14" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
            <path d="M10 108 H210" stroke="var(--border)" strokeWidth="1" />
          </svg>
          <div className="space-y-1.5">
            <h2 className="font-serif-display italic text-3xl text-[var(--text)]">
              {journeys.length === 0
                ? 'Your first road trip is waiting.'
                : 'No journeys match your filters.'}
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
              {journeys.length === 0
                ? 'Capture every destination, fast-charge stop, and scenic overlook in one calm journal.'
                : 'Try adjusting your search query or clearing active filters.'}
            </p>
          </div>
          {journeys.length === 0 && (
            <Link
              to="/journeys/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-fg)]"
            >
              <Plus className="h-4 w-4" />
              <span>Start a journey</span>
            </Link>
          )}
        </div>
      ) : (
        /* Screen 3: Hero Cover Cards with Instrument Serif italic titles */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((j, idx) => (
            <motion.div
              key={j._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.2) }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col justify-between"
            >
              <Link to={`/journeys/${j._id}`} className="group block relative">
                <div className="aspect-[16/10] overflow-hidden relative">
                  <ResilientImage
                    src={j.coverImage}
                    alt={j.title}
                    fallbackType="journey"
                    fallbackLabel={j.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-white/75 tabular-nums">
                    <span>{j.visibility}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDateShort(j.startDate)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{j.distanceKm} km</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDuration(j.durationMinutes)}</span>
                  </div>
                  <h2 className="font-serif-display italic text-2xl sm:text-3xl text-white leading-tight">
                    {j.title}
                  </h2>
                  <p className="text-xs text-white/75">
                    {j.startLocation} → {j.endLocation}
                    {j.vehicle ? ` · ${j.vehicle.brand} ${j.vehicle.model}` : ''}
                  </p>
                </div>
              </Link>

              <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-xs">
                <span className="font-mono text-[var(--text-muted)] tabular-nums">
                  {j.chargingStopsCount || 0} charges · {j.totalEnergyKwh || 0} kWh · {j.status}
                </span>
                <div className="flex items-center gap-4">
                  <Link
                    to={`/journeys/${j._id}/edit`}
                    className="text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(j._id, j.title)}
                    className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
