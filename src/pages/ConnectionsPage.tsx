import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import api, { extractErrorMessage } from '../services/api';
import type { ConnectionUser } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { useAuthStore } from '../store/authStore';

interface ConnectionsResponse {
  profile: {
    _id: string;
    name: string;
    username: string;
  };
  followers: ConnectionUser[];
  following: ConnectionUser[];
}

export function ConnectionsPage() {
  const { handle } = useParams<{ handle: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const initialTab =
    searchParams.get('tab') === 'following' ? 'following' : 'followers';
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab);
  const [data, setData] = useState<ConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    api
      .get<ConnectionsResponse>(`/users/u/${handle}/connections`)
      .then((res) => setData(res.data))
      .catch((err) => setError(extractErrorMessage(err, 'Unable to load connections.')))
      .finally(() => setLoading(false));
  }, [handle]);

  const handleToggleFollow = async (targetUserId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const res = await api.post<{ isFollowing: boolean }>(
      `/users/${targetUserId}/follow`
    );
    if (!data) return;
    const patch = (list: ConnectionUser[]) =>
      list.map((u) =>
        u._id === targetUserId ? { ...u, isFollowing: res.data.isFollowing } : u
      );
    setData({
      ...data,
      followers: patch(data.followers),
      following: patch(data.following),
    });
  };

  if (loading) {
    return <div className="h-80 rounded-2xl bg-[var(--surface)] animate-pulse" />;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-6 text-sm text-[var(--danger)]">
        {error || 'Connections unavailable.'}
      </div>
    );
  }

  const activeList = tab === 'followers' ? data.followers : data.following;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link
          to={`/u/${data.profile.username}`}
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>@{data.profile.username}</span>
        </Link>
      </div>

      <div className="flex items-baseline gap-3">
        <h1 className="font-serif-display italic text-3xl text-[var(--text)]">
          {tab === 'followers' ? 'Followers' : 'Following'}
        </h1>
        <span className="font-mono text-sm text-[var(--text-muted)] tabular-nums">
          {activeList.length}
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 w-fit">
        {(['followers', 'following'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setSearchParams({ tab: t });
            }}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--text-muted)]">
          {tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          {activeList.map((u) => (
            <div
              key={u._id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <Link
                to={`/u/${u.username}`}
                className="flex items-center gap-3.5 min-w-0 flex-1"
              >
                <ResilientImage
                  src={u.avatar}
                  alt={u.name}
                  fallbackType="avatar"
                  className="h-10 w-10 rounded-full object-cover border border-[var(--border)] shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--text)] truncate">
                      {u.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] truncate">
                      @{u.username}
                    </span>
                  </div>
                  {u.bio && (
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                      {u.bio}
                    </p>
                  )}
                </div>
              </Link>

              {user?._id !== u._id && (
                <button
                  type="button"
                  onClick={() => handleToggleFollow(u._id)}
                  className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-semibold shrink-0 transition-colors ${
                    u.isFollowing
                      ? 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]'
                      : u.followsYou
                        ? 'border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10'
                        : 'bg-[var(--primary)] text-[var(--primary-fg)]'
                  }`}
                >
                  {u.isFollowing ? (
                    <>
                      <span>Following</span>
                      <Check className="h-3.5 w-3.5 text-[var(--primary)]" />
                    </>
                  ) : u.followsYou ? (
                    <span>Follow back</span>
                  ) : (
                    <span>Follow</span>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
