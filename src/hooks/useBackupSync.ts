import { useCallback, useEffect, useRef, useState } from "react";
import { getBackup, putBackup } from "../api/backup";
import { uploadPhoto, deletePhotoBlob } from "../api/photos";
import { canonicalize } from "../lib/canonicalSnapshot";
import {
  collectUnsyncedHashes,
  rehydratePhotosForRestore,
  withResolvedPhotoUrls,
} from "../lib/photoSync";
import * as db from "../db/db";
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

/** Uploads every photo referenced in `cards` that doesn't have a
 * `remoteUrl` anywhere yet (deduped by hash -- see `collectUnsyncedHashes`),
 * and broadcasts every resolved URL (newly uploaded or already known from
 * another item sharing the hash) back into local state via
 * `applyRemoteUrlsForHashes` so it's persisted even if the app closes right
 * after. Returns the full hash->url map actually resolved this pass, for
 * the caller to fold into the snapshot it's about to PUT without waiting
 * on a React re-render. */
async function syncPendingPhotos(
  token: string,
  userId: string,
  cards: BackupSnapshot["cards"],
  applyRemoteUrlsForHashes: (updates: Map<string, string>) => void,
  onToast: (message: string) => void,
): Promise<Map<string, string>> {
  const hashes = collectUnsyncedHashes(cards);
  const resolved = new Map<string, string>();
  const toUpload: string[] = [];
  for (const [hash, url] of hashes) {
    if (url) resolved.set(hash, url);
    else toUpload.push(hash);
  }

  let failures = 0;
  for (const hash of toUpload) {
    try {
      const blob = await db.getPhoto(hash);
      if (!blob) continue;
      resolved.set(hash, await uploadPhoto(token, userId, hash, blob));
    } catch {
      failures += 1;
    }
  }

  if (resolved.size > 0) applyRemoteUrlsForHashes(resolved);
  if (failures > 0) {
    onToast(
      `Couldn't upload ${failures} photo${failures === 1 ? "" : "s"} -- will retry automatically.`,
    );
  }
  return resolved;
}

/** Best-effort: a delete that fails (e.g. offline right now) just leaves an
 * orphaned blob in storage rather than blocking the sync -- an accepted
 * limitation, consistent with this app's existing whole-snapshot,
 * no-versioning tolerance for simplicity over robustness. */
async function processPendingBlobDeletions(
  token: string,
  drainPendingBlobDeletions: () => string[],
): Promise<void> {
  const urls = drainPendingBlobDeletions();
  if (urls.length === 0) return;
  await Promise.allSettled(urls.map((url) => deletePhotoBlob(token, url)));
}

export function useBackupSync({ data, auth, onToast }: UseBackupSyncOptions): BackupSyncResult {
  const { replaceAll, applyRemoteUrlsForHashes, drainPendingBlobDeletions } = data;
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
    const userId = auth.user.id;
    setStatus("checking");

    (async () => {
      try {
        const backup = await getBackup(token);
        const localSnapshot = latestDataRef.current;
        const localCanonical = canonicalize(localSnapshot);

        if (!backup) {
          // Nothing to conflict with -- always pushing, so uploading
          // photos first (rather than during the compare below) isn't
          // wasted work.
          setStatus("syncing");
          const resolvedUrls = await syncPendingPhotos(
            token,
            userId,
            localSnapshot.cards,
            applyRemoteUrlsForHashes,
            onToast,
          );
          const toPush = withResolvedPhotoUrls(localSnapshot, resolvedUrls);
          await putBackup(token, toPush);
          lastSyncedSnapshotRef.current = canonicalize(toPush);
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
  }, [data.loading, auth.initializing, auth.user, auth.token, onToast, applyRemoteUrlsForHashes]);

  // Auto-save every 60s while logged in, only when data has actually changed.
  useEffect(() => {
    if (!auth.token || !auth.user) return;
    const token = auth.token;
    const userId = auth.user.id;

    const id = window.setInterval(() => {
      if (statusRef.current !== "idle") return;
      const snapshot = latestDataRef.current;
      const canonical = canonicalize(snapshot);
      if (canonical === lastSyncedSnapshotRef.current) return;

      setStatus("syncing");
      void (async () => {
        try {
          const resolvedUrls = await syncPendingPhotos(
            token,
            userId,
            snapshot.cards,
            applyRemoteUrlsForHashes,
            onToast,
          );
          await processPendingBlobDeletions(token, drainPendingBlobDeletions);
          const toPush = withResolvedPhotoUrls(snapshot, resolvedUrls);
          await putBackup(token, toPush);
          lastSyncedSnapshotRef.current = canonicalize(toPush);
          setLastSavedAt(Date.now());
          setStatus("idle");
        } catch (err) {
          onToast(errorMessage(err, "Auto-save failed."));
          setStatus("idle");
        }
      })();
    }, AUTO_SAVE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [auth.token, auth.user, onToast, applyRemoteUrlsForHashes, drainPendingBlobDeletions]);

  const manualSave = useCallback(() => {
    if (!auth.token || !auth.user) return;
    if (statusRef.current === "syncing" || statusRef.current === "conflict") return;

    const token = auth.token;
    const userId = auth.user.id;
    const snapshot = latestDataRef.current;
    setStatus("syncing");
    void (async () => {
      try {
        const resolvedUrls = await syncPendingPhotos(
          token,
          userId,
          snapshot.cards,
          applyRemoteUrlsForHashes,
          onToast,
        );
        await processPendingBlobDeletions(token, drainPendingBlobDeletions);
        const toPush = withResolvedPhotoUrls(snapshot, resolvedUrls);
        await putBackup(token, toPush);
        lastSyncedSnapshotRef.current = canonicalize(toPush);
        setLastSavedAt(Date.now());
        setStatus("idle");
      } catch (err) {
        onToast(errorMessage(err, "Save failed."));
        setStatus("idle");
      }
    })();
  }, [auth.token, auth.user, onToast, applyRemoteUrlsForHashes, drainPendingBlobDeletions]);

  const resolveConflict = useCallback(
    (choice: "useBackup" | "keepLocal") => {
      if (!conflict || !auth.token || !auth.user) return;
      const token = auth.token;
      const userId = auth.user.id;

      if (choice === "useBackup") {
        setStatus("syncing");
        void rehydratePhotosForRestore(conflict.remoteData)
          .then(async ({ snapshot, photosToSeed, droppedCount }) => {
            await replaceAll(snapshot, photosToSeed);
            lastSyncedSnapshotRef.current = canonicalize(snapshot);
            setConflict(null);
            setStatus("idle");
            onToast("Restored from backup");
            if (droppedCount > 0) {
              onToast(
                `${droppedCount} photo${droppedCount === 1 ? "" : "s"} couldn't be restored -- ` +
                  "they weren't backed up from any device and aren't present locally either.",
              );
            }
          })
          .catch((err) => {
            onToast(errorMessage(err, "Couldn't restore from backup."));
            setStatus("conflict");
          });
      } else {
        const snapshot = latestDataRef.current;
        setStatus("syncing");
        void (async () => {
          try {
            const resolvedUrls = await syncPendingPhotos(
              token,
              userId,
              snapshot.cards,
              applyRemoteUrlsForHashes,
              onToast,
            );
            await processPendingBlobDeletions(token, drainPendingBlobDeletions);
            const toPush = withResolvedPhotoUrls(snapshot, resolvedUrls);
            await putBackup(token, toPush);
            lastSyncedSnapshotRef.current = canonicalize(toPush);
            setLastSavedAt(Date.now());
            setConflict(null);
            setStatus("idle");
          } catch (err) {
            onToast(errorMessage(err, "Couldn't update the backup."));
            setStatus("conflict");
          }
        })();
      }
    },
    [
      conflict,
      auth.token,
      auth.user,
      replaceAll,
      onToast,
      applyRemoteUrlsForHashes,
      drainPendingBlobDeletions,
    ],
  );

  return { status, conflict, lastSavedAt, manualSave, resolveConflict };
}
