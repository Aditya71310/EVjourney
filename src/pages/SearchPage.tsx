import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { History, Search as SearchIcon, X } from 'lucide-react';
import api from '../services/api';
import type { ConnectionUser, Journey, Vehicle } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { useAuthStore } from '../store/authStore';

type SearchTab = 'all' | 'people' | 'destinations' | 'vehicles' | 'journeys';

const RECENT_CHIPS = ['Sahyadri', 'Konkan', 'aanya', 'Spiti'];

const TRENDING_DESTINATIONS = [
  {
    name: 'Sahyadri',
    count: '8 journeys',
    img: '/src/assets/images/journey_mountain_pass_1794937948869.jpg',
  },
  {
    name: 'Konkan',
    count: '6 journeys',
    img: '/src/assets/images/journey_coastal_overlook_1794937948348.jpg',
  },
  {
    name: 'Spiti',
    count: '4 journeys',
    img: '/src/assets/images/journey_mountain_pass_1794937948869.jpg',
  },
  {
    name: 'Coorg',
    count: '5 journeys',
    img: '/src/assets/images/hero_ev_roadtrip_1794937947563.jpg',
  },
];

export function SearchPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('all');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<ConnectionUser[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setUsers([]);
      setJourneys([]);
      setVehicles([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      api
        .get<{ users: ConnectionUser[]; journeys: Journey[]; vehicles: Vehicle[] }>(
          `/search?q=${encodeURIComponent(q)}`
        )
        .then((res) => {
          setUsers(res.data.users || []);
          setJourneys(res.data.journeys || []);
          setVehicles(res.data.vehicles || []);
        })
        .finally(() => setLoading(false));
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  const handleFollowToggle = async (targetUserId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const res = await api.post<{ isFollowing: boolean }>(
      `/users/${targetUserId}/follow`
    );
    setUsers((prev) =>
      prev.map((u) =>
        u._id === targetUserId ? { ...u, isFollowing: res.data.isFollowing } : u
      )
    );
  };

  const hasQuery = Boolean(query.trim());

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Search Input Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, destinations, EVs, or journeys..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-10 py-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {hasQuery && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] px-2"
          >
            Cancel
          </button>
        )}
      </div>

      {!hasQuery ? (
        <div className="space-y-8 pt-2">
          {/* Recent Searches */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-[var(--text-muted)]">
              Recent searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {RECENT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQuery(chip)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs text-[var(--text)] hover:border-[var(--primary)] transition-colors"
                >
                  <History className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span>{chip}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Trending Destinations */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-[var(--text-muted)]">
              Trending now
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TRENDING_DESTINATIONS.map((dest) => (
                <button
                  key={dest.name}
                  type="button"
                  onClick={() => setQuery(dest.name)}
                  className="flex items-center gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-left hover:border-[var(--primary)] transition-colors"
                >
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                    <ResilientImage
                      src={dest.img}
                      alt={dest.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-serif-display italic text-xl text-[var(--text)]">
                      {dest.name}
                    </div>
                    <div className="font-mono text-xs text-[var(--text-muted)]">
                      {dest.count}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Search Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 w-fit">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'people', label: 'People' },
                { id: 'destinations', label: 'Destinations' },
                { id: 'vehicles', label: 'Vehicles' },
                { id: 'journeys', label: 'Journeys' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-[var(--surface)] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {(tab === 'all' || tab === 'people') && users.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-xs font-medium text-[var(--text-muted)]">People</h2>
                  <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    {users.map((u) => (
                      <div
                        key={u._id}
                        className="flex items-center justify-between gap-3 p-4"
                      >
                        <Link
                          to={`/u/${u.username}`}
                          className="flex items-center gap-3 min-w-0"
                        >
                          <ResilientImage
                            src={u.avatar}
                            alt={u.name}
                            fallbackType="avatar"
                            className="h-10 w-10 rounded-full object-cover border border-[var(--border)] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[var(--text)] truncate">
                              {u.name}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] truncate">
                              @{u.username}
                              {u.city ? ` · ${u.city}` : ''}
                            </div>
                          </div>
                        </Link>
                        {user?._id !== u._id && (
                          <button
                            type="button"
                            onClick={() => handleFollowToggle(u._id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 ${
                              u.isFollowing
                                ? 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]'
                                : 'bg-[var(--primary)] text-[var(--primary-fg)]'
                            }`}
                          >
                            {u.isFollowing ? 'Following' : 'Follow'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(tab === 'all' || tab === 'vehicles') && vehicles.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-xs font-medium text-[var(--text-muted)]">
                    Vehicles
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vehicles.map((v) => (
                      <div
                        key={v._id}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {v.brand} {v.model}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {v.variant || v.colour}
                          </div>
                        </div>
                        <span className="font-mono text-xs text-[var(--primary)]">
                          {v.batteryCapacity} kWh
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(tab === 'all' || tab === 'journeys' || tab === 'destinations') &&
                journeys.length > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-xs font-medium text-[var(--text-muted)]">
                      Journeys
                    </h2>
                    <div className="space-y-3">
                      {journeys.map((j) => (
                        <Link
                          key={j._id}
                          to={`/journeys/${j._id}`}
                          className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 hover:border-[var(--primary)] transition-colors"
                        >
                          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg">
                            <ResilientImage
                              src={j.coverImage}
                              alt={j.title}
                              fallbackType="journey"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <h3 className="font-serif-display italic text-xl text-[var(--text)] truncate">
                              {j.title}
                            </h3>
                            <p className="font-mono text-xs text-[var(--text-muted)] truncate">
                              {j.startLocation} → {j.endLocation} · {j.distanceKm} km
                              {j.author ? ` · @${j.author.username}` : ''}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

              {users.length === 0 && journeys.length === 0 && vehicles.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--text-muted)]">
                  No matches found for &ldquo;{query}&rdquo;.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
