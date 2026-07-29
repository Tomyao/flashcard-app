import type { BackupSnapshot, FlashCard, Photo } from "../types";
import * as db from "../db/db";

/** Maps every hash referenced anywhere in `cards` to a known `remoteUrl` if
 * any item sharing that hash already has one, else `null`. A `null` entry
 * is what still needs an actual upload; a non-null entry only needs to be
 * broadcast (via `DataContext.applyRemoteUrlsForHashes`) to any other item
 * sharing the hash that hasn't learned the URL yet. */
export function collectUnsyncedHashes(cards: FlashCard[]): Map<string, string | null> {
  const hashes = new Map<string, string | null>();
  for (const card of cards) {
    for (const item of card.items) {
      for (const photo of [item.questionPhoto, item.answerPhoto]) {
        if (!photo) continue;
        if (photo.remoteUrl && !hashes.get(photo.hash)) {
          hashes.set(photo.hash, photo.remoteUrl);
        } else if (!hashes.has(photo.hash)) {
          hashes.set(photo.hash, null);
        }
      }
    }
  }
  return hashes;
}

/** Returns a copy of `snapshot` with every photo reference that's missing a
 * `remoteUrl` patched in from `resolved` (hash -> url), if present. Lets a
 * caller build the exact backup payload to PUT right after uploading,
 * without waiting for a React re-render to reflect the same change in
 * `data.cards`. */
export function withResolvedPhotoUrls(
  snapshot: BackupSnapshot,
  resolved: Map<string, string>,
): BackupSnapshot {
  if (resolved.size === 0) return snapshot;
  return {
    ...snapshot,
    cards: snapshot.cards.map((card) => ({
      ...card,
      items: card.items.map((item) => ({
        ...item,
        questionPhoto:
          item.questionPhoto && !item.questionPhoto.remoteUrl && resolved.has(item.questionPhoto.hash)
            ? { ...item.questionPhoto, remoteUrl: resolved.get(item.questionPhoto.hash)! }
            : item.questionPhoto,
        answerPhoto:
          item.answerPhoto && !item.answerPhoto.remoteUrl && resolved.has(item.answerPhoto.hash)
            ? { ...item.answerPhoto, remoteUrl: resolved.get(item.answerPhoto.hash)! }
            : item.answerPhoto,
      })),
    })),
  };
}

export interface RehydrateResult {
  snapshot: BackupSnapshot;
  photosToSeed: Array<{ hash: string; blob: Blob }>;
  /** Count of photo references dropped because the bytes were missing both
   * locally and remotely -- genuinely unrecoverable on this device. */
  droppedCount: number;
}

/** Prepares an incoming backup snapshot for `DataContext.replaceAll`: for
 * every unique photo hash referenced in `remote.cards`, checks whether this
 * device already has the bytes locally (the fix for the gap where a photo
 * exists on the very device doing the restore but hadn't finished
 * uploading yet -- see the plan's Context section) before ever touching the
 * network. Only fetches from `remoteUrl` when the hash is missing locally,
 * and only drops a reference when it's missing from both. */
export async function rehydratePhotosForRestore(
  remote: BackupSnapshot,
): Promise<RehydrateResult> {
  const uniquePhotos = new Map<string, Photo>();
  for (const card of remote.cards) {
    for (const item of card.items) {
      if (item.questionPhoto) uniquePhotos.set(item.questionPhoto.hash, item.questionPhoto);
      if (item.answerPhoto) uniquePhotos.set(item.answerPhoto.hash, item.answerPhoto);
    }
  }

  const resolved = new Map<string, Photo | null>();
  const photosToSeed: Array<{ hash: string; blob: Blob }> = [];
  let droppedCount = 0;

  for (const [hash, photo] of uniquePhotos) {
    const local = await db.getPhoto(hash);
    if (local) {
      resolved.set(hash, photo);
      continue;
    }

    if (photo.remoteUrl) {
      try {
        const response = await fetch(photo.remoteUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        photosToSeed.push({ hash, blob: await response.blob() });
        resolved.set(hash, photo);
        continue;
      } catch {
        // Falls through to "dropped" below.
      }
    }

    resolved.set(hash, null);
    droppedCount += 1;
  }

  const cards: FlashCard[] = remote.cards.map((card) => ({
    ...card,
    items: card.items.map((item) => ({
      ...item,
      questionPhoto: item.questionPhoto ? resolved.get(item.questionPhoto.hash) ?? null : null,
      answerPhoto: item.answerPhoto ? resolved.get(item.answerPhoto.hash) ?? null : null,
    })),
  }));

  return { snapshot: { ...remote, cards }, photosToSeed, droppedCount };
}
