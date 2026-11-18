import { PlusSquare, Share, Smartphone, X, Zap } from 'lucide-react';
import { ResilientImage } from './ResilientImage';

interface InstallPwaModalProps {
  open: boolean;
  onClose: () => void;
}

export function InstallPwaModal({ open, onClose }: InstallPwaModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-48">
          <ResilientImage
            src="/src/assets/images/journey_coastal_overlook_1794937948348.jpg"
            alt="Sunset coastal highway"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-black/45 to-black/20" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute inset-x-5 bottom-4">
            <h2 className="font-serif-display italic text-3xl text-white leading-tight">
              Keep your journeys one tap away.
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-[var(--primary)]">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">EV Journey App</div>
              <div className="text-xs text-[var(--text-muted)]">
                Install on iOS or Android for offline highway logging
              </div>
            </div>
          </div>

          <ol className="space-y-3 text-xs text-[var(--text)]">
            <li className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-3.5 py-2.5">
              <span className="font-mono font-semibold text-[var(--primary)]">01</span>
              <Share className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
              <span>Tap your browser&apos;s Share or Menu button</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-3.5 py-2.5">
              <span className="font-mono font-semibold text-[var(--primary)]">02</span>
              <PlusSquare className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
              <span>Choose &ldquo;Add to Home Screen&rdquo; or &ldquo;Install App&rdquo;</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-3.5 py-2.5">
              <span className="font-mono font-semibold text-[var(--primary)]">03</span>
              <Smartphone className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
              <span>Launch full-screen directly from your home screen</span>
            </li>
          </ol>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-fg)] hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
