import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Send, X } from 'lucide-react';
import api, { extractErrorMessage } from '../services/api';
import type { JourneyComment } from '../types';
import { useAuthStore } from '../store/authStore';
import { ResilientImage } from './ResilientImage';
import { formatRelativeTime } from '../utils/formatters';

interface CommentsSheetProps {
  journeyId: string | null;
  open: boolean;
  onClose: () => void;
  onCountChange?: (journeyId: string, newCount: number) => void;
}

export function CommentsSheet({
  journeyId,
  open,
  onClose,
  onCountChange,
}: CommentsSheetProps) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<JourneyComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<JourneyComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !journeyId) return;
    setLoading(true);
    setError('');
    api
      .get<{ comments: JourneyComment[] }>(`/journeys/${journeyId}/comments`)
      .then((res) => setComments(res.data.comments || []))
      .catch((err) => setError(extractErrorMessage(err, 'Unable to load comments.')))
      .finally(() => setLoading(false));
  }, [open, journeyId]);

  if (!open || !journeyId) return null;

  const totalCount = comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length || 0),
    0
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post<{ comments: JourneyComment[] }>(
        `/journeys/${journeyId}/comments`,
        {
          text: text.trim(),
          parentId: replyTo ? replyTo._id : null,
        }
      );
      const updated = res.data.comments || [];
      setComments(updated);
      setText('');
      setReplyTo(null);
      const count = updated.reduce(
        (sum, c) => sum + 1 + (c.replies?.length || 0),
        0
      );
      onCountChange?.(journeyId, count);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not post comment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    try {
      const res = await api.post<{ isLiked: boolean; likesCount: number }>(
        `/comments/${commentId}/like`
      );
      const patch = (list: JourneyComment[]): JourneyComment[] =>
        list.map((c) => ({
          ...c,
          ...(c._id === commentId
            ? { isLiked: res.data.isLiked, likesCount: res.data.likesCount }
            : {}),
          replies: c.replies ? patch(c.replies) : [],
        }));
      setComments((prev) => patch(prev));
    } catch {
      // Ignore transient error
    }
  };

  const renderComment = (c: JourneyComment, isReply = false) => (
    <div key={c._id} className={isReply ? 'pl-8 pt-3' : 'py-3.5'}>
      <div className="flex items-start gap-3">
        <Link to={`/u/${c.author.username}`} onClick={onClose} className="shrink-0">
          <ResilientImage
            src={c.author.avatar}
            alt={c.author.name}
            fallbackType="avatar"
            className={`${isReply ? 'h-6 w-6' : 'h-8 w-8'} rounded-full object-cover border border-[var(--border)]`}
          />
        </Link>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Link
              to={`/u/${c.author.username}`}
              onClick={onClose}
              className="font-semibold text-[var(--text)] hover:underline"
            >
              {c.author.name}
            </Link>
            <span className="text-[var(--text-muted)]">@{c.author.username}</span>
            <span className="font-mono text-[var(--text-muted)]">
              · {formatRelativeTime(c.createdAt)}
            </span>
          </div>
          <p className="text-sm text-[var(--text)] leading-relaxed">{c.text}</p>
          <div className="flex items-center gap-4 pt-1 text-xs text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => handleLikeComment(c._id)}
              className={`inline-flex items-center gap-1 transition-colors ${
                c.isLiked ? 'text-[var(--danger)]' : 'hover:text-[var(--text)]'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${c.isLiked ? 'fill-current' : ''}`} />
              {c.likesCount > 0 && (
                <span className="font-mono tabular-nums">{c.likesCount}</span>
              )}
            </button>
            {!isReply && user && (
              <button
                type="button"
                onClick={() => setReplyTo(c)}
                className="hover:text-[var(--text)] font-medium"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {!isReply && c.replies && c.replies.length > 0 && (
        <div className="space-y-1">
          {c.replies.map((r) => renderComment(r, true))}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-[78vh] sm:h-[620px] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
            Comments · {totalCount}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-label="Close comments"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-5 divide-y divide-[var(--border)]">
          {loading ? (
            <div className="py-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-[var(--surface-2)] animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="py-6 text-xs text-[var(--danger)]">{error}</div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--text-muted)]">
              No comments yet. Start the conversation.
            </div>
          ) : (
            comments.map((c) => renderComment(c))
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
          {replyTo && (
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] bg-[var(--surface-2)] rounded-lg px-3 py-1.5">
              <span>Replying to @{replyTo.author.username}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-[var(--text)] hover:underline"
              >
                Cancel
              </button>
            </div>
          )}

          {user ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <ResilientImage
                src={user.avatar}
                alt={user.name}
                fallbackType="avatar"
                className="h-8 w-8 rounded-full object-cover border border-[var(--border)] shrink-0"
              />
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-fg)] disabled:opacity-40 transition-opacity shrink-0"
                aria-label="Send comment"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Sign in to reply or leave charging tips.</span>
              <Link
                to="/login"
                className="font-semibold text-[var(--primary)] hover:underline"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
