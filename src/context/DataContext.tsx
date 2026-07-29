import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { BackupSnapshot, Category, FlashCard, Photo, QA, StarColor } from "../types";
import { NO_CATEGORY_ID } from "../types";
import * as db from "../db/db";

/** Every non-null photo reference on a card, both slots, all items. */
function photosOf(items: QA[]): Photo[] {
  const photos: Photo[] = [];
  for (const item of items) {
    if (item.questionPhoto) photos.push(item.questionPhoto);
    if (item.answerPhoto) photos.push(item.answerPhoto);
  }
  return photos;
}

/** Photos are content-hash keyed and can be shared by more than one QA item
 * (dedup), so a photo removed from one card must not be deleted while
 * another card (or another slot on the same card) still points to the same
 * hash. Checks `hash` against every card in `allCards` before authorizing a
 * delete. */
function isHashStillReferenced(hash: string, allCards: FlashCard[]): boolean {
  return allCards.some((card) => photosOf(card.items).some((p) => p.hash === hash));
}

const ACTIVE_STAR_COLOR_KEY = "flashcards:activeStarColorId";

export interface DataContextValue {
  loading: boolean;
  categories: Category[];
  cards: FlashCard[];
  starColors: StarColor[];
  activeStarColorId: string;
  setActiveStarColorId: (id: string) => void;

  createCategory: (name: string) => Promise<Category>;
  renameCategory: (id: string, name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;

  saveCard: (input: {
    id?: string;
    topic: string;
    categoryIds: string[];
    items: Array<{
      id?: string;
      question: string;
      answer: string;
      questionPhoto?: Photo | null;
      answerPhoto?: Photo | null;
    }>;
  }) => Promise<FlashCard>;
  removeCard: (id: string) => Promise<void>;

  toggleCardStar: (cardId: string) => Promise<void>;
  toggleQuestionStar: (cardId: string, qaId: string) => Promise<void>;

  createStarColor: (name: string, color: string) => Promise<StarColor>;
  updateStarColor: (
    id: string,
    updates: { name?: string; color?: string },
  ) => Promise<void>;
  /** Re-applies default-first + alphabetical order; call once an edit is committed (e.g. on blur). */
  reorderStarColors: () => void;
  removeStarColor: (id: string) => Promise<void>;

  /** Wipes local IndexedDB/state and replaces it with a backup snapshot
   * pulled from the server, seeding any photo blobs the restore had to
   * fetch (see `rehydratePhotosForRestore` in `lib/photoSync.ts`). */
  replaceAll: (
    snapshot: BackupSnapshot,
    photosToSeed?: Array<{ hash: string; blob: Blob }>,
  ) => Promise<void>;

  /** Patches in a freshly learned Vercel Blob URL for every photo reference
   * (across all cards) sharing the given content hash and not yet synced. */
  applyRemoteUrlsForHashes: (updates: Map<string, string>) => void;
  /** Pops and returns every Blob URL queued for deletion since the last
   * drain (photos replaced/removed while editing or deleting a card), so a
   * caller (the sync hook) can process each exactly once. */
  drainPendingBlobDeletions: () => string[];
}

const DataContext = createContext<DataContextValue | null>(null);

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Keeps the built-in default (No Category / Default star color) pinned to
 * the top, with everything else alphabetical below it. Re-applied after
 * every load, create, and rename so the order never drifts. */
function sortDefaultFirst<T extends { isDefault: boolean; name: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return Number(b.isDefault) - Number(a.isDefault);
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

/** Cards are edited in a modal rather than in place, so -- unlike star
 * colors -- there's no live-typing row to disturb; safe to re-sort
 * immediately whenever a topic is created or changed. */
function sortByTopic(items: FlashCard[]): FlashCard[] {
  return [...items].sort((a, b) =>
    a.topic.localeCompare(b.topic, undefined, { sensitivity: "base" }),
  );
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [starColors, setStarColors] = useState<StarColor[]>([]);
  const [activeStarColorId, setActiveStarColorIdState] = useState<string>("");
  /** Blob URLs queued for remote deletion by saveCard/removeCard's photo
   * cleanup, drained by the sync hook -- a plain ref since queuing one
   * shouldn't itself trigger a re-render. */
  const pendingBlobDeletionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      await db.ensureSeedData();
      const [cats, allCards, colors] = await Promise.all([
        db.getCategories(),
        db.getCards(),
        db.getStarColors(),
      ]);
      setCategories(sortDefaultFirst(cats));
      setCards(sortByTopic(allCards));
      setStarColors(sortDefaultFirst(colors));

      const stored = localStorage.getItem(ACTIVE_STAR_COLOR_KEY);
      const fallback = colors.find((c) => c.isDefault)?.id ?? colors[0]?.id ?? "";
      setActiveStarColorIdState(
        stored && colors.some((c) => c.id === stored) ? stored : fallback,
      );
      setLoading(false);
    })();
  }, []);

  const setActiveStarColorId = useCallback((id: string) => {
    setActiveStarColorIdState(id);
    localStorage.setItem(ACTIVE_STAR_COLOR_KEY, id);
  }, []);

  // Categories

  const createCategory = useCallback(async (name: string) => {
    const category: Category = { id: uid("cat"), name, isDefault: false };
    await db.putCategory(category);
    setCategories((prev) => sortDefaultFirst([...prev, category]));
    return category;
  }, []);

  const renameCategory = useCallback(async (id: string, name: string) => {
    if (id === NO_CATEGORY_ID) return;
    setCategories((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (!existing) return prev;
      const updated = { ...existing, name };
      void db.putCategory(updated);
      return sortDefaultFirst(prev.map((c) => (c.id === id ? updated : c)));
    });
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    if (id === NO_CATEGORY_ID) return;
    await db.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setCards((prev) =>
      prev.map((card) =>
        card.categoryIds.includes(id)
          ? { ...card, categoryIds: card.categoryIds.filter((c) => c !== id) }
          : card,
      ),
    );
  }, []);

  // Cards

  const saveCard = useCallback(
    async (input: {
      id?: string;
      topic: string;
      categoryIds: string[];
      items: Array<{
        id?: string;
        question: string;
        answer: string;
        questionPhoto?: Photo | null;
        answerPhoto?: Photo | null;
      }>;
    }) => {
      const now = Date.now();
      let result!: FlashCard;
      setCards((prev) => {
        const existing = input.id
          ? prev.find((c) => c.id === input.id)
          : undefined;

        const items: QA[] = input.items.map((draft, index) => {
          const original = existing?.items.find((i) => i.id === draft.id);
          return {
            id: original?.id ?? uid("qa"),
            number: index + 1,
            question: draft.question,
            answer: draft.answer,
            questionPhoto: draft.questionPhoto ?? null,
            answerPhoto: draft.answerPhoto ?? null,
            starColorId: original?.starColorId ?? null,
          };
        });

        const updated: FlashCard = existing
          ? {
              ...existing,
              topic: input.topic,
              categoryIds: input.categoryIds,
              items,
              updatedAt: now,
            }
          : {
              id: uid("card"),
              topic: input.topic,
              categoryIds: input.categoryIds,
              items,
              starColorId: null,
              createdAt: now,
              updatedAt: now,
            };

        result = updated;
        void db.putCard(updated);
        const next = existing
          ? prev.map((c) => (c.id === updated.id ? updated : c))
          : [...prev, updated];

        // Any photo that was on the card before this edit but isn't
        // anywhere on it now -- and isn't referenced by any other card
        // either (dedup) -- is genuinely orphaned: delete the local blob,
        // and if it had made it to the cloud, queue the remote copy for
        // deletion too.
        if (existing) {
          const keptHashes = new Set(photosOf(items).map((p) => p.hash));
          const removed = new Map<string, Photo>();
          for (const photo of photosOf(existing.items)) {
            if (!keptHashes.has(photo.hash) && !removed.has(photo.hash)) {
              removed.set(photo.hash, photo);
            }
          }
          for (const [hash, photo] of removed) {
            if (!isHashStillReferenced(hash, next)) {
              void db.deletePhoto(hash);
              if (photo.remoteUrl) pendingBlobDeletionsRef.current.add(photo.remoteUrl);
            }
          }
        }

        return sortByTopic(next);
      });
      return result;
    },
    [],
  );

  const mutateCard = useCallback(
    (id: string, mutate: (card: FlashCard) => FlashCard) => {
      setCards((prev) => {
        const existing = prev.find((c) => c.id === id);
        if (!existing) return prev;
        const updated = { ...mutate(existing), updatedAt: Date.now() };
        void db.putCard(updated);
        return prev.map((c) => (c.id === id ? updated : c));
      });
    },
    [],
  );

  const removeCard = useCallback(async (id: string) => {
    await db.deleteCard(id);
    setCards((prev) => {
      const target = prev.find((c) => c.id === id);
      const next = prev.filter((c) => c.id !== id);
      if (target) {
        const removed = new Map<string, Photo>();
        for (const photo of photosOf(target.items)) {
          if (!removed.has(photo.hash)) removed.set(photo.hash, photo);
        }
        for (const [hash, photo] of removed) {
          if (!isHashStillReferenced(hash, next)) {
            void db.deletePhoto(hash);
            if (photo.remoteUrl) pendingBlobDeletionsRef.current.add(photo.remoteUrl);
          }
        }
      }
      return next;
    });
  }, []);

  // Starring

  const toggleCardStar = useCallback(
    async (cardId: string) => {
      mutateCard(cardId, (card) => ({
        ...card,
        starColorId:
          card.starColorId === activeStarColorId ? null : activeStarColorId,
      }));
    },
    [mutateCard, activeStarColorId],
  );

  const toggleQuestionStar = useCallback(
    async (cardId: string, qaId: string) => {
      mutateCard(cardId, (card) => ({
        ...card,
        items: card.items.map((item) =>
          item.id === qaId
            ? {
                ...item,
                starColorId:
                  item.starColorId === activeStarColorId
                    ? null
                    : activeStarColorId,
              }
            : item,
        ),
      }));
    },
    [mutateCard, activeStarColorId],
  );

  // Star colors

  const createStarColor = useCallback(async (name: string, color: string) => {
    const starColor: StarColor = { id: uid("star"), name, color, isDefault: false };
    await db.putStarColor(starColor);
    setStarColors((prev) => sortDefaultFirst([...prev, starColor]));
    return starColor;
  }, []);

  const updateStarColor = useCallback(
    async (id: string, updates: { name?: string; color?: string }) => {
      // Deliberately doesn't re-sort here: the name field updates on every
      // keystroke, and resorting mid-edit would make the row jump around
      // while the user is still typing. reorderStarColors() settles it once
      // editing is done (see StarColorOverlay's onBlur).
      setStarColors((prev) => {
        const existing = prev.find((c) => c.id === id);
        if (!existing) return prev;
        const updated = {
          ...existing,
          name: updates.name ?? existing.name,
          color: updates.color ?? existing.color,
        };
        void db.putStarColor(updated);
        return prev.map((c) => (c.id === id ? updated : c));
      });
    },
    [],
  );

  const reorderStarColors = useCallback(() => {
    setStarColors((prev) => sortDefaultFirst(prev));
  }, []);

  const removeStarColor = useCallback(
    async (id: string) => {
      const target = starColors.find((c) => c.id === id);
      if (!target || target.isDefault) return;
      await db.deleteStarColor(id);
      setStarColors((prev) => prev.filter((c) => c.id !== id));
      setCards((prev) =>
        prev.map((card) => ({
          ...card,
          starColorId: card.starColorId === id ? null : card.starColorId,
          items: card.items.map((item) =>
            item.starColorId === id ? { ...item, starColorId: null } : item,
          ),
        })),
      );
      if (activeStarColorId === id) {
        const fallback = starColors.find((c) => c.isDefault)?.id ?? "";
        setActiveStarColorId(fallback);
      }
    },
    [starColors, activeStarColorId, setActiveStarColorId],
  );

  // Backup restore

  const replaceAll = useCallback(
    async (snapshot: BackupSnapshot, photosToSeed: Array<{ hash: string; blob: Blob }> = []) => {
      await db.replaceAll(
        {
          categories: snapshot.categories,
          cards: snapshot.cards,
          starColors: snapshot.starColors,
        },
        photosToSeed,
      );
      setCategories(sortDefaultFirst(snapshot.categories));
      setCards(sortByTopic(snapshot.cards));
      setStarColors(sortDefaultFirst(snapshot.starColors));
      const fallback =
        snapshot.starColors.find((c) => c.isDefault)?.id ?? snapshot.starColors[0]?.id ?? "";
      setActiveStarColorId(
        snapshot.starColors.some((c) => c.id === snapshot.activeStarColorId)
          ? snapshot.activeStarColorId
          : fallback,
      );
    },
    [setActiveStarColorId],
  );

  // Photo sync

  const applyRemoteUrlsForHashes = useCallback((updates: Map<string, string>) => {
    if (updates.size === 0) return;
    setCards((prev) => {
      let anyChanged = false;
      const next = prev.map((card) => {
        let cardChanged = false;
        const items = card.items.map((item) => {
          const q = item.questionPhoto;
          const a = item.answerPhoto;
          const nextQ =
            q && !q.remoteUrl && updates.has(q.hash)
              ? { ...q, remoteUrl: updates.get(q.hash)! }
              : q;
          const nextA =
            a && !a.remoteUrl && updates.has(a.hash)
              ? { ...a, remoteUrl: updates.get(a.hash)! }
              : a;
          if (nextQ === q && nextA === a) return item;
          cardChanged = true;
          return { ...item, questionPhoto: nextQ, answerPhoto: nextA };
        });
        if (!cardChanged) return card;
        anyChanged = true;
        const updated = { ...card, items };
        void db.putCard(updated);
        return updated;
      });
      return anyChanged ? next : prev;
    });
  }, []);

  const drainPendingBlobDeletions = useCallback((): string[] => {
    const urls = Array.from(pendingBlobDeletionsRef.current);
    pendingBlobDeletionsRef.current.clear();
    return urls;
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      loading,
      categories,
      cards,
      starColors,
      activeStarColorId,
      setActiveStarColorId,
      createCategory,
      renameCategory,
      removeCategory,
      saveCard,
      removeCard,
      toggleCardStar,
      toggleQuestionStar,
      createStarColor,
      updateStarColor,
      reorderStarColors,
      removeStarColor,
      replaceAll,
      applyRemoteUrlsForHashes,
      drainPendingBlobDeletions,
    }),
    [
      loading,
      categories,
      cards,
      starColors,
      activeStarColorId,
      setActiveStarColorId,
      createCategory,
      renameCategory,
      removeCategory,
      saveCard,
      removeCard,
      toggleCardStar,
      toggleQuestionStar,
      createStarColor,
      updateStarColor,
      reorderStarColors,
      removeStarColor,
      replaceAll,
      applyRemoteUrlsForHashes,
      drainPendingBlobDeletions,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
