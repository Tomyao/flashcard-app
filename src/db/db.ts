import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Category, FlashCard, StarColor } from "../types";
import { NO_CATEGORY_ID } from "../types";

interface FlashcardDB extends DBSchema {
  categories: {
    key: string;
    value: Category;
  };
  cards: {
    key: string;
    value: FlashCard;
    indexes: { "by-updatedAt": number };
  };
  starColors: {
    key: string;
    value: StarColor;
  };
}

const DB_NAME = "flashcards-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FlashcardDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<FlashcardDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FlashcardDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("cards")) {
          const store = db.createObjectStore("cards", { keyPath: "id" });
          store.createIndex("by-updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains("starColors")) {
          db.createObjectStore("starColors", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function ensureSeedData(): Promise<void> {
  const db = await getDB();

  const noCategory = await db.get("categories", NO_CATEGORY_ID);
  if (!noCategory) {
    await db.put("categories", {
      id: NO_CATEGORY_ID,
      name: "No Category",
      isDefault: true,
    });
  }

  const allStarColors = await db.getAll("starColors");
  if (allStarColors.length === 0) {
    await db.put("starColors", {
      id: "star-default",
      name: "Default",
      color: "#eab308",
      isDefault: true,
    });
  }
}

// Categories

export async function getCategories(): Promise<Category[]> {
  const db = await getDB();
  return db.getAll("categories");
}

export async function putCategory(category: Category): Promise<void> {
  const db = await getDB();
  await db.put("categories", category);
}

export async function deleteCategory(id: string): Promise<void> {
  if (id === NO_CATEGORY_ID) return;
  const db = await getDB();
  const tx = db.transaction(["categories", "cards"], "readwrite");
  await tx.objectStore("categories").delete(id);
  const cardsStore = tx.objectStore("cards");
  const allCards = await cardsStore.getAll();
  for (const card of allCards) {
    if (card.categoryIds.includes(id)) {
      const remaining = card.categoryIds.filter((c) => c !== id);
      card.categoryIds = remaining;
      card.updatedAt = Date.now();
      await cardsStore.put(card);
    }
  }
  await tx.done;
}

// Cards

export async function getCards(): Promise<FlashCard[]> {
  const db = await getDB();
  return db.getAll("cards");
}

export async function putCard(card: FlashCard): Promise<void> {
  const db = await getDB();
  await db.put("cards", card);
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("cards", id);
}

/** Atomically wipes and rewrites categories/cards/starColors in one
 * transaction -- used when restoring a backup snapshot from the server. */
export async function replaceAll(snapshot: {
  categories: Category[];
  cards: FlashCard[];
  starColors: StarColor[];
}): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["categories", "cards", "starColors"], "readwrite");
  const categoriesStore = tx.objectStore("categories");
  const cardsStore = tx.objectStore("cards");
  const starColorsStore = tx.objectStore("starColors");

  await Promise.all([
    categoriesStore.clear(),
    cardsStore.clear(),
    starColorsStore.clear(),
  ]);

  await Promise.all([
    ...snapshot.categories.map((c) => categoriesStore.put(c)),
    ...snapshot.cards.map((c) => cardsStore.put(c)),
    ...snapshot.starColors.map((c) => starColorsStore.put(c)),
  ]);

  await tx.done;
}

// Star colors

export async function getStarColors(): Promise<StarColor[]> {
  const db = await getDB();
  return db.getAll("starColors");
}

export async function putStarColor(starColor: StarColor): Promise<void> {
  const db = await getDB();
  await db.put("starColors", starColor);
}

export async function deleteStarColor(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["starColors", "cards"], "readwrite");
  const starColorStore = tx.objectStore("starColors");
  const existing = await starColorStore.get(id);
  if (existing?.isDefault) {
    await tx.done;
    return;
  }
  await starColorStore.delete(id);
  const cardsStore = tx.objectStore("cards");
  const allCards = await cardsStore.getAll();
  for (const card of allCards) {
    let changed = false;
    if (card.starColorId === id) {
      card.starColorId = null;
      changed = true;
    }
    for (const item of card.items) {
      if (item.starColorId === id) {
        item.starColorId = null;
        changed = true;
      }
    }
    if (changed) {
      card.updatedAt = Date.now();
      await cardsStore.put(card);
    }
  }
  await tx.done;
}
