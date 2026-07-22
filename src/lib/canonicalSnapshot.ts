import type { BackupSnapshot } from "../types";

function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
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
