import { useEffect } from "react";
import { X } from "lucide-react";

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

const TOAST_DURATION_MS = 4000;

/** A brief, dismissible notification pinned to the top of the whole app --
 * above any open modal -- so it stays visible even if the user closes or
 * clicks away from whatever they were doing when the error happened. */
export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed left-1/2 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-start gap-2 rounded-lg border border-slate-200 bg-surface-light p-3 text-sm text-error shadow-xl dark:border-slate-700 dark:bg-surface-dark"
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 cursor-pointer rounded-full p-0.5 text-text-secondary-light hover:bg-slate-100 dark:text-text-secondary-dark dark:hover:bg-slate-800"
      >
        <X size={14} />
      </button>
    </div>
  );
}
