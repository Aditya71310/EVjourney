import { useState } from 'react';
import { Check, Globe, Lock, Users, X } from 'lucide-react';
import type { JourneyVisibility } from '../types';

interface VisibilitySheetProps {
  open: boolean;
  current: JourneyVisibility;
  onClose: () => void;
  onSave: (visibility: JourneyVisibility) => Promise<void>;
}

const OPTIONS: {
  value: JourneyVisibility;
  title: string;
  desc: string;
  icon: typeof Lock;
}[] = [
  {
    value: 'Private',
    title: 'Just you',
    desc: 'Only visible in your own journeys.',
    icon: Lock,
  },
  {
    value: 'Followers',
    title: 'Followers',
    desc: 'People who follow you can view.',
    icon: Users,
  },
  {
    value: 'Public',
    title: 'Public',
    desc: 'Anyone in EV Journey can discover.',
    icon: Globe,
  },
];

export function VisibilitySheet({
  open,
  current,
  onClose,
  onSave,
}: VisibilitySheetProps) {
  const [selected, setSelected] = useState<JourneyVisibility>(current);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onSave(selected);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif-display italic text-2xl text-[var(--text)]">
            Who can see this?
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {OPTIONS.map(({ value, title, desc, icon: Icon }) => {
            const active = selected === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSelected(value)}
                className={`w-full flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors ${
                  active
                    ? 'border-[var(--primary)] bg-[var(--primary-bg)]/40'
                    : 'border-[var(--border)] bg-[var(--surface-2)]/50 hover:border-[var(--text-muted)]/50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      active
                        ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                        : 'bg-[var(--surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {title}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">{desc}</div>
                  </div>
                </div>
                {active && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-fg)] shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={saving}
            onClick={handleConfirm}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-fg)] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving
              ? 'Updating...'
              : selected === 'Private'
                ? 'Save as Private'
                : 'Publish journey'}
          </button>
          <p className="text-center text-xs text-[var(--text-muted)]">
            You can change this anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
