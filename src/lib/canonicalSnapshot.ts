import type { BackupSnapshot, Photo } from "../types";

function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** `hash` is deterministic across devices (unlike a per-device local id),
 * so -- unlike photo bytes themselves -- it's safe to include here. This is
 * what lets two devices holding the identical photo agree even while one
 * hasn't finished uploading it yet. */
function canonicalPhoto(photo: Photo | null): { hash: string; remoteUrl: string | null } | null {
  return photo ? { hash: photo.hash, remoteUrl: photo.remoteUrl } : null;
}

/** Deterministic JSON string for a snapshot, used to compare local data
 * against a fetched backup for equality. Top-level arrays are sorted by id
 * (their `getAll()` order isn't guaranteed) and each entity is rebuilt with
 * a fixed key order, since round-tripping through JSON/Mongo can otherwise
 * reorder keys and produce spurious mismatches. */
export function canonicalize(snapshot: BackupSnapshot): string {
  const categories = [...snapshot.categories]
    .sort(byId)
    .map((c) => ({ id: c.id, name: c.name, isDefault: c.isDefault }));

  const cards = [...snapshot.cards]
    .sort(byId)
    .map((c) => ({
      id: c.id,
      topic: c.topic,
      categoryIds: c.categoryIds,
      starColorId: c.starColorId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      items: c.items.map((i) => ({
        id: i.id,
        number: i.number,
        question: i.question,
        answer: i.answer,
        questionPhoto: canonicalPhoto(i.questionPhoto),
        answerPhoto: canonicalPhoto(i.answerPhoto),
        starColorId: i.starColorId,
      })),
    }));

  const starColors = [...snapshot.starColors]
    .sort(byId)
    .map((c) => ({ id: c.id, name: c.name, color: c.color, isDefault: c.isDefault }));

  return JSON.stringify({
    categories,
    cards,
    starColors,
    activeStarColorId: snapshot.activeStarColorId,
  });
}
