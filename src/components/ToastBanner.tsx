import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

export function ToastBanner() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon =
            t.tone === 'error'
              ? AlertCircle
              : t.tone === 'info'
                ? Info
                : CheckCircle2;
          const toneClass =
            t.tone === 'error'
              ? 'text-[var(--danger)] border-[var(--danger)]/40'
              : t.tone === 'info'
                ? 'text-[var(--accent)] border-[var(--border)]'
                : 'text-[var(--primary)] border-[var(--primary)]/40';

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto flex items-center gap-3 rounded-xl border bg-[var(--surface)]/95 backdrop-blur-md px-4 py-3 shadow-xl ${toneClass}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium text-[var(--text)] flex-1">
                {t.message}
              </span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-[var(--text-muted)] hover:text-[var(--text)]"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
