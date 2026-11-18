import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Bookmark,
  Compass,
  Heart,
  MessageCircle,
  Search,
  Share2,
} from 'lucide-react';
import api, { extractErrorMessage } from '../services/api';
import type { Journey } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { CommentsSheet } from '../components/CommentsSheet';
import { formatRelativeTime } from '../utils/formatters';
import { useAuthStore } from '../store/authStore';

type FeedTab = 'trending' | 'following' | 'latest';

export function DiscoverPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState<FeedTab>('trending');
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCommentJourneyId, setActiveCommentJourneyId] = useState<string | null>(
    null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadFeed = async (targetTab: FeedTab) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ journeys: Journey[] }>(`/discover?tab=${targetTab}`);
      setJourneys(res.data.journeys || []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load Discover feed.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed(tab);
  }, [tab]);

  const handleLike = async (journeyId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post<{ isLiked: boolean; likesCount: number }>(
        `/journeys/${journeyId}/like`
      );
      setJourneys((prev) =>
        prev.map((j) =>
          j._id === journeyId
            ? { ...j, isLiked: res.data.isLiked, likesCount: res.data.likesCount }
            : j
        )
      );
    } catch {
      // Ignore transient error
    }
  };

  const handleSave = async (journeyId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post<{ isSaved: boolean }>(`/journeys/${journeyId}/save`);
      setJourneys((prev) =>
        prev.map((j) =>
          j._id === journeyId ? { ...j, isSaved: res.data.isSaved } : j
        )
      );
    } catch {
      // Ignore transient error
    }
  };

  const handleShare = async (journeyId: string) => {
    const url = `${window.location.origin}/journeys/${journeyId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard fallback
    }
    setCopiedId(journeyId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="font-serif-display italic text-3xl sm:text-4xl text-[var(--text)]">
            Discover
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Curated electric road trips from drivers across the network
          </p>
        </div>

        <Link
          to="/search"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--primary)] transition-colors"
          aria-label="Search journeys and drivers"
        >
          <Search className="h-4 w-4" />
        </Link>
      </div>

      {/* Tab Strip */}
      <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 w-fit">
        {(
          [
            { id: 'following', label: 'Following' },
            { id: 'trending', label: 'Trending' },
            { id: 'latest', label: 'Latest' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              tab === item.id
                ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-80 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse"
            />
          ))}
        </div>
      ) : journeys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center space-y-4">
          <Compass className="h-8 w-8 text-[var(--primary)] mx-auto opacity-80" />
          <div className="space-y-1">
            <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
              {tab === 'following'
                ? 'Follow creators to see their journeys here.'
                : 'No public journeys available yet.'}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Explore electric drivers documenting mountain passes and coastal corridors.
            </p>
          </div>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-[var(--primary-fg)]"
          >
            Find people
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {journeys.map((j, idx) => (
            <motion.article
              key={j._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.2) }}
              className="space-y-3"
            >
              {/* Author Row */}
              {j.author && (
                <div className="flex items-center justify-between px-1">
                  <Link
                    to={`/u/${j.author.username}`}
                    className="flex items-center gap-2.5 group"
                  >
                    <ResilientImage
                      src={j.author.avatar}
                      alt={j.author.name}
                      fallbackType="avatar"
                      className="h-7 w-7 rounded-full object-cover border border-[var(--border)]"
                    />
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-semibold text-[var(--text)] group-hover:underline">
                        {j.author.name}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        @{j.author.username}
                      </span>
                      <span className="font-mono text-[var(--text-muted)]">
                        · {formatRelativeTime(j.startDate)}
                      </span>
                    </div>
                  </Link>
                </div>
              )}

              {/* Journey Hero Card */}
              <Link
                to={`/journeys/${j._id}`}
                className="group block relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <ResilientImage
                    src={j.coverImage}
                    alt={j.title}
                    fallbackType="journey"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 space-y-1.5">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-white/75 tabular-nums">
                    {j.startLocation} → {j.endLocation} · {j.distanceKm} KM ·{' '}
                    {j.eventCount || j.chargingStopsCount || 0} STOPS
                  </div>
                  <h2 className="font-serif-display italic text-2xl sm:text-3xl text-white">
                    {j.title}
                  </h2>
                  {j.vehicle && (
                    <div className="text-xs text-[var(--primary)]">
                      {j.vehicle.brand} {j.vehicle.model} · {j.totalEnergyKwh || 0} kWh charged
                    </div>
                  )}
                </div>
              </Link>

              {/* Social Action Row */}
              <div className="flex items-center justify-between px-1 pt-0.5 text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleLike(j._id)}
                    className={`inline-flex items-center gap-1.5 transition-colors ${
                      j.isLiked ? 'text-[var(--danger)]' : 'hover:text-[var(--text)]'
                    }`}
                    aria-label="Like journey"
                  >
                    <Heart className={`h-4 w-4 ${j.isLiked ? 'fill-current' : ''}`} />
                    {(j.likesCount || 0) > 0 && (
                      <span className="font-mono tabular-nums">{j.likesCount}</span>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => setActiveCommentJourneyId(j._id)}
                    className="inline-flex items-center gap-1.5 hover:text-[var(--text)] transition-colors"
                    aria-label="Open comments"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {(j.commentsCount || 0) > 0 && (
                      <span className="font-mono tabular-nums">{j.commentsCount}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare(j._id)}
                    className="inline-flex items-center gap-1.5 hover:text-[var(--text)] transition-colors"
                    aria-label="Share journey"
                  >
                    <Share2 className="h-4 w-4" />
                    {copiedId === j._id && (
                      <span className="text-[var(--primary)]">Copied</span>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleSave(j._id)}
                  className={`inline-flex items-center gap-1 transition-colors ${
                    j.isSaved ? 'text-[var(--primary)]' : 'hover:text-[var(--text)]'
                  }`}
                  aria-label="Bookmark journey"
                >
                  <Bookmark className={`h-4 w-4 ${j.isSaved ? 'fill-current' : ''}`} />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <CommentsSheet
        journeyId={activeCommentJourneyId}
        open={Boolean(activeCommentJourneyId)}
        onClose={() => setActiveCommentJourneyId(null)}
        onCountChange={(jid, count) =>
          setJourneys((prev) =>
            prev.map((j) => (j._id === jid ? { ...j, commentsCount: count } : j))
          )
        }
      />
    </div>
  );
}
