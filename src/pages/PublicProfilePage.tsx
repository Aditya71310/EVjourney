import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, MapPin } from 'lucide-react';
import api, { extractErrorMessage } from '../services/api';
import type { CoverScene, Journey } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { formatDateShort, getSceneGradient } from '../utils/formatters';
import { useAuthStore } from '../store/authStore';

interface PublicProfileResponse {
  profile: {
    _id: string;
    name: string;
    username: string;
    avatar: string;
    bio: string;
    city: string;
    country: string;
    coverScene: CoverScene;
    createdAt: string;
  };
  stats: {
    followersCount: number;
    followingCount: number;
    journeysCount: number;
  };
  isFollowing: boolean;
  isSelf: boolean;
  journeys: Journey[];
  savedJourneys: Journey[];
}

export function PublicProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'journeys' | 'saved' | 'about'>('journeys');
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    setError('');
    api
      .get<PublicProfileResponse>(`/users/u/${handle}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(extractErrorMessage(err, 'Profile not found.')))
      .finally(() => setLoading(false));
  }, [handle]);

  const handleToggleFollow = async () => {
    if (!data) return;
    if (!user) {
      navigate('/login');
      return;
    }
    setToggling(true);
    try {
      const res = await api.post<{ isFollowing: boolean; followersCount: number }>(
        `/users/${data.profile._id}/follow`
      );
      setData({
        ...data,
        isFollowing: res.data.isFollowing,
        stats: { ...data.stats, followersCount: res.data.followersCount },
      });
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <div className="h-96 rounded-2xl bg-[var(--surface)] animate-pulse" />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          to="/discover"
          className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Discover</span>
        </Link>
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-6 text-sm text-[var(--danger)]">
          {error || 'Driver not found.'}
        </div>
      </div>
    );
  }

  const { profile, stats, isFollowing, isSelf, journeys, savedJourneys } = data;
  const activeGrid = tab === 'saved' ? savedJourneys : journeys;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <Link
        to="/discover"
        className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </Link>

      {/* Cover Band & Overlapping Avatar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div
          className={`h-32 sm:h-40 w-full bg-gradient-to-br ${getSceneGradient(
            profile.coverScene
          )}`}
        />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-4">
            <ResilientImage
              src={profile.avatar}
              alt={profile.name}
              fallbackType="avatar"
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border-4 border-[var(--surface)] bg-[var(--surface-2)]"
            />

            {!isSelf && (
              <button
                type="button"
                disabled={toggling}
                onClick={handleToggleFollow}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  isFollowing
                    ? 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]'
                    : 'bg-[var(--primary)] text-[var(--primary-fg)]'
                }`}
              >
                {isFollowing ? (
                  <>
                    <span>Following</span>
                    <Check className="h-3.5 w-3.5 text-[var(--primary)]" />
                  </>
                ) : (
                  <span>Follow</span>
                )}
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <h1 className="font-serif-display italic text-3xl text-[var(--text)]">
              {profile.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>@{profile.username}</span>
              {(profile.city || profile.country) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[profile.city, profile.country].filter(Boolean).join(', ')}
                  </span>
                </>
              )}
            </div>
            {profile.bio && (
              <p className="text-sm text-[var(--text)] leading-relaxed pt-1 max-w-xl">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Tappable Stats Row */}
          <div className="grid grid-cols-3 gap-4 border-t border-[var(--border)] mt-5 pt-5">
            <Link
              to={`/u/${profile.username}/connections?tab=followers`}
              className="group"
            >
              <div className="font-mono text-xl font-semibold tabular-nums text-[var(--text)] group-hover:text-[var(--primary)]">
                {stats.followersCount}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Followers</div>
            </Link>
            <Link
              to={`/u/${profile.username}/connections?tab=following`}
              className="group"
            >
              <div className="font-mono text-xl font-semibold tabular-nums text-[var(--text)] group-hover:text-[var(--primary)]">
                {stats.followingCount}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Following</div>
            </Link>
            <div>
              <div className="font-mono text-xl font-semibold tabular-nums text-[var(--text)]">
                {stats.journeysCount}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Journeys</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 w-fit">
        {(
          [
            { id: 'journeys', label: 'Journeys' },
            { id: 'saved', label: 'Saved' },
            { id: 'about', label: 'About' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
              tab === item.id
                ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'about' ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3 text-sm">
          <div className="text-xs text-[var(--text-muted)]">Member since</div>
          <div className="font-mono">{formatDateShort(profile.createdAt)}</div>
          <div className="text-xs text-[var(--text-muted)] pt-2">Home Base</div>
          <div>
            {[profile.city, profile.country].filter(Boolean).join(', ') || 'Not specified'}
          </div>
        </div>
      ) : activeGrid.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--text-muted)]">
          {tab === 'saved'
            ? 'No saved journeys yet.'
            : 'No public journeys published yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeGrid.map((j) => (
            <Link
              key={j._id}
              to={`/journeys/${j._id}`}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
            >
              <ResilientImage
                src={j.coverImage}
                alt={j.title}
                fallbackType="journey"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 space-y-1">
                <div className="font-mono text-[11px] text-white/75 tabular-nums">
                  {j.distanceKm} km · {j.startLocation}
                </div>
                <h2 className="font-serif-display italic text-2xl text-white leading-tight">
                  {j.title}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
