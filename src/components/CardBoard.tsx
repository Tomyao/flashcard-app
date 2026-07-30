import type { Category, FlashCard, StarColor, StarFilterState } from "../types";
import { NO_CATEGORY_ID } from "../types";
import { CardStack } from "./CardStack";

interface CardBoardProps {
  cards: FlashCard[];
  categories: Category[];
  starColors: StarColor[];
  selectedCategoryIds: Set<string>;
  starFilter: StarFilterState;
  onToggleCardStar: (cardId: string) => void;
  onToggleQuestionStar: (cardId: string, qaId: string) => void;
  onEditCard: (card: FlashCard) => void;
  onDeleteCard: (cardId: string) => void;
}

function matchesStarFilter(card: FlashCard, filter: StarFilterState): boolean {
  if (filter.unstarred) {
    const cardUnstarred = card.starColorId === null;
    const questionsUnstarred = card.items.every((i) => i.starColorId === null);
    switch (filter.scope) {
      case "cards":
        return cardUnstarred;
      case "questions":
        return questionsUnstarred;
      case "both":
        return cardUnstarred && questionsUnstarred;
    }
  }
  if (filter.colorIds.size === 0) return true;
  const cardMatch =
    card.starColorId !== null && filter.colorIds.has(card.starColorId);
  const questionMatch = card.items.some(
    (i) => i.starColorId !== null && filter.colorIds.has(i.starColorId),
  );
  switch (filter.scope) {
    case "cards":
      return cardMatch;
    case "questions":
      return questionMatch;
    case "both":
      return cardMatch || questionMatch;
  }
}

/** A card must belong to every selected category to match -- an empty
 * selection means "All Flashcards" (no filtering). */
function matchesCategory(card: FlashCard, categoryIds: Set<string>): boolean {
  if (categoryIds.size === 0) return true;
  for (const categoryId of categoryIds) {
    const inCategory =
      categoryId === NO_CATEGORY_ID
        ? card.categoryIds.length === 0
        : card.categoryIds.includes(categoryId);
    if (!inCategory) return false;
  }
  return true;
}

export function CardBoard({
  cards,
  categories,
  starColors,
  selectedCategoryIds,
  starFilter,
  onToggleCardStar,
  onToggleQuestionStar,
  onEditCard,
  onDeleteCard,
}: CardBoardProps) {
  const deck = cards
    .filter((c) => matchesStarFilter(c, starFilter))
    .filter((c) => matchesCategory(c, selectedCategoryIds));

  const starFilterActive = starFilter.colorIds.size > 0 || starFilter.unstarred;

  if (deck.length === 0) {
    return <EmptyState starFilterActive={starFilterActive} />;
  }

  const resetKey = `${[...selectedCategoryIds].sort().join(",")}|${starFilter.scope}|${starFilter.unstarred}|${[...starFilter.colorIds].sort().join(",")}`;

  return (
    <CardStack
      cards={deck}
      categories={categories}
      starColors={starColors}
      resetKey={resetKey}
      onToggleCardStar={onToggleCardStar}
      onToggleQuestionStar={onToggleQuestionStar}
      onEditCard={onEditCard}
      onDeleteCard={onDeleteCard}
    />
  );
}

function EmptyState({ starFilterActive }: { starFilterActive: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
        {starFilterActive
          ? "No cards match the current star filter."
          : "No flashcards here yet."}
      </p>
    </div>
  );
}
