import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Category, FlashCard, QA, StarColor } from "../types";
import { NO_CATEGORY_ID } from "../types";
import * as db from "../db/db";

const ACTIVE_STAR_COLOR_KEY = "flashcards:activeStarColorId";

interface DataContextValue {
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
    items: Array<{ id?: string; question: string; answer: string }>;
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

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [starColors, setStarColors] = useState<StarColor[]>([]);
  const [activeStarColorId, setActiveStarColorIdState] = useState<string>("");

  useEffect(() => {
    (async () => {
      await db.ensureSeedData();
      const [cats, allCards, colors] = await Promise.all([
        db.getCategories(),
        db.getCards(),
        db.getStarColors(),
      ]);
      setCategories(sortDefaultFirst(cats));
      setCards(allCards);
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
      items: Array<{ id?: string; question: string; answer: string }>;
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
        return existing
          ? prev.map((c) => (c.id === updated.id ? updated : c))
          : [...prev, updated];
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
    setCards((prev) => prev.filter((c) => c.id !== id));
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
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
