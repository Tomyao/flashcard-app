import { useState } from "react";
import { CloudDownload, HardDrive } from "lucide-react";

interface BackupConflictModalProps {
  remoteUpdatedAt: string;
  onUseBackup: () => void;
  onKeepLocal: () => void;
}

const CONFIRM_PHRASE = "overwrite";

/** Deliberately not dismissible (no backdrop click, no Escape, no close
 * button) -- the user must make an explicit choice about which copy of
 * their data wins. "Keep Local" additionally requires typing a confirm
 * phrase, since it permanently discards the cloud backup -- possibly the
 * only copy of data synced from another device. */
export function BackupConflictModal({
  remoteUpdatedAt,
  onUseBackup,
  onKeepLocal,
}: BackupConflictModalProps) {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const formattedDate = new Date(remoteUpdatedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-surface-light shadow-xl dark:border-slate-700 dark:bg-surface-dark">
        <div className="border-b border-slate-200 p-5 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
            Backup doesn't match this device
          </h2>
          <p className="mt-1.5 text-sm text-text-secondary-light dark:text-text-secondary-dark">
            Your cloud backup is different from the flashcards on this device.
            Choose which copy to keep.
          </p>
        </div>

        {!confirming ? (
          <div className="space-y-3 p-5">
            <button
              type="button"
              onClick={onUseBackup}
              className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <CloudDownload size={18} className="mt-0.5 shrink-0 text-action" />
              <span>
                <span className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                  Use Backup
                </span>
                <span className="block text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  Replace this device's data with the backup from {formattedDate}.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <HardDrive size={18} className="mt-0.5 shrink-0 text-action" />
              <span>
                <span className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                  Keep Local
                </span>
                <span className="block text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  This will overwrite your cloud backup with this device's data.
                </span>
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 p-5">
            <p className="text-sm text-text-primary-light dark:text-text-primary-dark">
              This permanently deletes the backup from {formattedDate} and
              replaces it with this device's data. It can't be undone.
            </p>
            <label className="block text-sm">
              <span className="text-text-secondary-light dark:text-text-secondary-dark">
                Type <span className="font-mono font-semibold text-error">{CONFIRM_PHRASE}</span> to
                confirm.
              </span>
              <input
                type="text"
                autoFocus
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-app-light px-3 py-2 text-sm text-text-primary-light outline-none focus:border-action dark:border-slate-700 dark:bg-app-dark dark:text-text-primary-dark"
                placeholder={CONFIRM_PHRASE}
              />
            </label>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setConfirmText("");
                }}
                className="flex-1 cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-text-primary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-primary-dark dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmText !== CONFIRM_PHRASE}
                onClick={onKeepLocal}
                className="flex-1 cursor-pointer rounded-lg bg-error px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Overwrite Backup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
