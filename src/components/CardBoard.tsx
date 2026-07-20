import type { Category, FlashCard, StarColor } from "../types";
import { NO_CATEGORY_ID } from "../types";
import { CardStack } from "./CardStack";

interface CardBoardProps {
  cards: FlashCard[];
  categories: Category[];
  starColors: StarColor[];
  selectedCategoryId: string;
  starredOnly: boolean;
  onToggleCardStar: (cardId: string) => void;
  onToggleQuestionStar: (cardId: string, qaId: string) => void;
  onEditCard: (card: FlashCard) => void;
  onDeleteCard: (cardId: string) => void;
}

function isStarred(card: FlashCard): boolean {
  return card.starColorId !== null || card.items.some((i) => i.starColorId !== null);
}

function matchesCategory(card: FlashCard, categoryId: string): boolean {
  return categoryId === NO_CATEGORY_ID
    ? card.categoryIds.length === 0
    : card.categoryIds.includes(categoryId);
}

export function CardBoard({
  cards,
  categories,
  starColors,
  selectedCategoryId,
  starredOnly,
  onToggleCardStar,
  onToggleQuestionStar,
  onEditCard,
  onDeleteCard,
}: CardBoardProps) {
  const deck = cards
    .filter((c) => (starredOnly ? isStarred(c) : true))
    .filter((c) =>
      selectedCategoryId === "all" ? true : matchesCategory(c, selectedCategoryId),
    );

  if (deck.length === 0) {
    return <EmptyState starredOnly={starredOnly} />;
  }

  return (
    <CardStack
      cards={deck}
      categories={categories}
      starColors={starColors}
      resetKey={`${selectedCategoryId}|${starredOnly}`}
      onToggleCardStar={onToggleCardStar}
      onToggleQuestionStar={onToggleQuestionStar}
      onEditCard={onEditCard}
      onDeleteCard={onDeleteCard}
    />
  );
}

function EmptyState({ starredOnly }: { starredOnly: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
        {starredOnly
          ? "No starred topics or questions here yet."
          : "No flashcards here yet."}
      </p>
    </div>
  );
}
