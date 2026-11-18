import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, ExternalLink, MapPin } from 'lucide-react';
import api, { extractErrorMessage } from '../services/api';
import type { User, Vehicle } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { VehicleSilhouette } from '../components/VehicleSilhouette';
import { formatDateShort, getSceneGradient } from '../utils/formatters';

interface ProfilePayload {
  user: User;
  stats: {
    totalJourneys: number;
    totalDistanceKm: number;
    totalChargingStops: number;
    totalEnergyKwh: number;
  };
  vehicles: Vehicle[];
}

export function ProfilePage() {
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get<ProfilePayload>('/users/profile')
      .then((res) => setData(res.data))
      .catch((err) => setError(extractErrorMessage(err, 'Failed to load profile.')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-96 rounded-2xl bg-[var(--surface)] animate-pulse" />;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-6 text-sm text-[var(--danger)]">
        {error || 'Unable to load profile.'}
      </div>
    );
  }

  const { user, stats, vehicles } = data;

  return (
    <div className="space-y-8 max-w-4xl pb-10">
      {/* Scenic Cover + Header Card */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div
          className={`h-28 sm:h-36 w-full bg-gradient-to-br ${getSceneGradient(
            user.coverScene
          )}`}
        />
        <div className="px-6 pb-6 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 sm:-mt-12 mb-4">
            <ResilientImage
              src={user.avatar}
              alt={user.name}
              fallbackType="avatar"
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border-4 border-[var(--surface)] shrink-0"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/u/${user.username}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] whitespace-nowrap"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[var(--primary)]" />
                <span>Public Profile</span>
              </Link>
              <Link
                to="/settings"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-[var(--primary-fg)] hover:opacity-90 whitespace-nowrap"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="font-serif-display italic text-3xl text-[var(--text)]">
              {user.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>@{user.username}</span>
              {(user.city || user.country) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[var(--primary)]" />
                    {[user.city, user.country].filter(Boolean).join(', ')}
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>Joined {formatDateShort(user.createdAt)}</span>
            </div>
            {user.bio && (
              <p className="text-sm text-[var(--text)]/90 max-w-xl pt-1">{user.bio}</p>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Journeys', value: String(stats.totalJourneys) },
          { label: 'Total Distance', value: `${stats.totalDistanceKm.toLocaleString()} km` },
          { label: 'Charging Stops', value: String(stats.totalChargingStops) },
          { label: 'Energy Added', value: `${stats.totalEnergyKwh} kWh` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-1"
          >
            <div className="text-xs text-[var(--text-muted)]">{item.label}</div>
            <div className="font-mono text-2xl font-semibold tabular-nums text-[var(--text)]">
              {item.value}
            </div>
          </div>
        ))}
      </section>

      {/* Garage Showcase */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
            EV Garage
          </h2>
          <Link
            to="/garage"
            className="text-xs font-medium text-[var(--primary)] hover:underline"
          >
            Manage Garage
          </Link>
        </div>
        {vehicles.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No electric vehicles added yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {vehicles.map((v) => (
              <div
                key={v._id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
              >
                <div className="flex items-center gap-4">
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-[var(--border)]">
                    <ResilientImage
                      src={v.photo}
                      alt={`${v.brand} ${v.model}`}
                      fallbackType="vehicle"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="font-mono text-xs text-[var(--primary)]">
                      {v.batteryCapacity} kWh {v.isDefault ? '· Primary' : ''}
                    </div>
                    <h3 className="font-serif-display italic text-xl truncate text-[var(--text)]">
                      {v.brand} {v.model}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {v.variant} {v.nickname ? `· "${v.nickname}"` : ''}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-[var(--border)]">
                  <VehicleSilhouette
                    model={v.model}
                    colour={v.colour}
                    batteryCapacity={v.batteryCapacity}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
