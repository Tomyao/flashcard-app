import { CloudDownload, HardDrive } from "lucide-react";

interface BackupConflictModalProps {
  remoteUpdatedAt: string;
  onUseBackup: () => void;
  onKeepLocal: () => void;
}

/** Deliberately not dismissible (no backdrop click, no Escape, no close
 * button) -- the user must make an explicit choice about which copy of
 * their data wins. */
export function BackupConflictModal({
  remoteUpdatedAt,
  onUseBackup,
  onKeepLocal,
}: BackupConflictModalProps) {
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
            onClick={onKeepLocal}
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
      </div>
    </div>
  );
}
