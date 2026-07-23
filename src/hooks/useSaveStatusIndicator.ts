import { useEffect, useRef, useState } from "react";
import type { SyncStatus } from "./useBackupSync";

export type SaveIndicator = "loggedOut" | "saving" | "saved" | "loggedIn";

/** Minimum time "Saving…" stays on screen once shown, even if the request
 * actually finishes faster -- avoids a jarring saving->saved flash. */
const MIN_SAVING_DISPLAY_MS = 1200;
/** How long "Saved!" stays on screen before reverting to "Logged in". */
const SAVED_DISPLAY_MS = 2500;

/** Derives the header's account/save indicator from the raw sync state. */
export function useSaveStatusIndicator(
  status: SyncStatus,
  lastSavedAt: number | null,
  loggedIn: boolean,
): SaveIndicator {
  const [display, setDisplay] = useState<SaveIndicator>("loggedIn");

  const savingStartedAtRef = useRef<number | null>(null);
  const handledSavedAtRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    function clearPendingTimers() {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    }

    if (status === "syncing") {
      if (savingStartedAtRef.current === null) savingStartedAtRef.current = Date.now();
      clearPendingTimers();
      setDisplay("saving");
      return;
    }

    // Left "syncing" (or was never in it -- e.g. initial mount, or a
    // checking/conflict transition unrelated to a save).
    const startedAt = savingStartedAtRef.current;
    savingStartedAtRef.current = null;
    if (startedAt === null) return;

    const succeeded = lastSavedAt !== null && lastSavedAt !== handledSavedAtRef.current;
    if (!succeeded) {
      setDisplay("loggedIn");
      return;
    }
    handledSavedAtRef.current = lastSavedAt;

    const remaining = Math.max(0, MIN_SAVING_DISPLAY_MS - (Date.now() - startedAt));
    const showSavedTimer = window.setTimeout(() => {
      setDisplay("saved");
      const revertTimer = window.setTimeout(() => setDisplay("loggedIn"), SAVED_DISPLAY_MS);
      timersRef.current.push(revertTimer);
    }, remaining);
    timersRef.current.push(showSavedTimer);
  }, [status, lastSavedAt]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  if (!loggedIn) return "loggedOut";
  return display;
}
