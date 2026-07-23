import { useCallback, useEffect, useRef, useState } from "react";
import { getBackup, putBackup } from "../api/backup";
import { canonicalize } from "../lib/canonicalSnapshot";
import type { AuthContextValue } from "../context/AuthContext";
import type { DataContextValue } from "../context/DataContext";
import type { BackupSnapshot } from "../types";

const AUTO_SAVE_INTERVAL_MS = 60_000;

export type SyncStatus = "idle" | "checking" | "syncing" | "conflict" | "error";

export interface BackupConflict {
  remoteData: BackupSnapshot;
  remoteUpdatedAt: string;
}

interface UseBackupSyncOptions {
  data: DataContextValue;
  auth: AuthContextValue;
  onToast: (message: string) => void;
}

export interface BackupSyncResult {
  status: SyncStatus;
  conflict: BackupConflict | null;
  /** Timestamp of the most recently *successful* backup write, or null if
   * none has happened yet this session. Distinct from `status` so the UI
   * can tell a completed save apart from a failed one even though both
   * transition `status` back to "idle". */
  lastSavedAt: number | null;
  manualSave: () => void;
  resolveConflict: (choice: "useBackup" | "keepLocal") => void;
}

function snapshotOf(data: DataContextValue): BackupSnapshot {
  return {
    categories: data.categories,
    cards: data.cards,
    starColors: data.starColors,
    activeStarColorId: data.activeStarColorId,
  };
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function useBackupSync({ data, auth, onToast }: UseBackupSyncOptions): BackupSyncResult {
  const { replaceAll } = data;
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [conflict, setConflict] = useState<BackupConflict | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const statusRef = useRef<SyncStatus>(status);
  const latestDataRef = useRef<BackupSnapshot>(snapshotOf(data));
  const lastSyncedSnapshotRef = useRef<string | null>(null);
  const checkedForUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Keep the latest data available to the interval/manual-save closures
  // without resetting their effects on every keystroke.
  useEffect(() => {
    latestDataRef.current = snapshotOf(data);
  });

  // Reset the "already checked" marker whenever the user logs out, so the
  // next login (even by the same user, same session) re-runs the check.
  useEffect(() => {
    if (!auth.user) checkedForUserIdRef.current = null;
  }, [auth.user]);

  // Boot / post-login conflict check.
  useEffect(() => {
    if (data.loading || auth.initializing || !auth.user || !auth.token) return;
    if (checkedForUserIdRef.current === auth.user.id) return;
    // Mark synchronously (before the await below) so React 19 StrictMode's
    // dev double-invoke of effects can't fire this check twice.
    checkedForUserIdRef.current = auth.user.id;

    const token = auth.token;
    setStatus("checking");

    (async () => {
      try {
        const backup = await getBackup(token);
        const localSnapshot = latestDataRef.current;
        const localCanonical = canonicalize(localSnapshot);

        if (!backup) {
          setStatus("syncing");
          await putBackup(token, localSnapshot);
          lastSyncedSnapshotRef.current = localCanonical;
          setLastSavedAt(Date.now());
          setStatus("idle");
          return;
        }

        if (canonicalize(backup.data) === localCanonical) {
          lastSyncedSnapshotRef.current = localCanonical;
          setStatus("idle");
        } else {
          setConflict({ remoteData: backup.data, remoteUpdatedAt: backup.updatedAt });
          setStatus("conflict");
        }
      } catch (err) {
        onToast(errorMessage(err, "Couldn't check your backup."));
        setStatus("error");
      }
    })();
  }, [data.loading, auth.initializing, auth.user, auth.token, onToast]);

  // Auto-save every 60s while logged in, only when data has actually changed.
  useEffect(() => {
    if (!auth.token) return;
    const token = auth.token;

    const id = window.setInterval(() => {
      if (statusRef.current !== "idle") return;
      const snapshot = latestDataRef.current;
      const canonical = canonicalize(snapshot);
      if (canonical === lastSyncedSnapshotRef.current) return;

      setStatus("syncing");
      putBackup(token, snapshot)
        .then(() => {
          lastSyncedSnapshotRef.current = canonical;
          setLastSavedAt(Date.now());
          setStatus("idle");
        })
        .catch((err: unknown) => {
          onToast(errorMessage(err, "Auto-save failed."));
          setStatus("idle");
        });
    }, AUTO_SAVE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [auth.token, onToast]);

  const manualSave = useCallback(() => {
    if (!auth.token) return;
    if (statusRef.current === "syncing" || statusRef.current === "conflict") return;

    const token = auth.token;
    const snapshot = latestDataRef.current;
    setStatus("syncing");
    putBackup(token, snapshot)
      .then(() => {
        lastSyncedSnapshotRef.current = canonicalize(snapshot);
        setLastSavedAt(Date.now());
        setStatus("idle");
      })
      .catch((err: unknown) => {
        onToast(errorMessage(err, "Save failed."));
        setStatus("idle");
      });
  }, [auth.token, onToast]);

  const resolveConflict = useCallback(
    (choice: "useBackup" | "keepLocal") => {
      if (!conflict || !auth.token) return;
      const token = auth.token;

      if (choice === "useBackup") {
        void replaceAll(conflict.remoteData).then(() => {
          lastSyncedSnapshotRef.current = canonicalize(conflict.remoteData);
          setConflict(null);
          setStatus("idle");
          onToast("Restored from backup");
        });
      } else {
        const snapshot = latestDataRef.current;
        setStatus("syncing");
        void putBackup(token, snapshot)
          .then(() => {
            lastSyncedSnapshotRef.current = canonicalize(snapshot);
            setLastSavedAt(Date.now());
            setConflict(null);
            setStatus("idle");
          })
          .catch((err: unknown) => {
            onToast(errorMessage(err, "Couldn't update the backup."));
            setStatus("conflict");
          });
      }
    },
    [conflict, auth.token, replaceAll, onToast],
  );

  return { status, conflict, lastSavedAt, manualSave, resolveConflict };
}
