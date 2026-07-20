import type { Category, FlashCard, StarColor } from "../types";
import { NO_CATEGORY_ID } from "../types";
import { CardTile } from "./CardTile";

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
  const baseCards = starredOnly ? cards.filter(isStarred) : cards;

  function renderGrid(list: FlashCard[]) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((card) => (
          <CardTile
            key={card.id}
            card={card}
            categories={categories}
            starColors={starColors}
            onToggleCardStar={() => onToggleCardStar(card.id)}
            onToggleQuestionStar={(qaId) => onToggleQuestionStar(card.id, qaId)}
            onEdit={() => onEditCard(card)}
            onDelete={() => onDeleteCard(card.id)}
          />
        ))}
      </div>
    );
  }

  if (selectedCategoryId !== "all") {
    const filtered = baseCards.filter((c) => matchesCategory(c, selectedCategoryId));
    if (filtered.length === 0) {
      return <EmptyState starredOnly={starredOnly} />;
    }
    return renderGrid(filtered);
  }

  const noCategory = categories.find((c) => c.id === NO_CATEGORY_ID);
  const orderedCategories = [
    ...(noCategory ? [noCategory] : []),
    ...categories.filter((c) => c.id !== NO_CATEGORY_ID),
  ];

  const sections = orderedCategories
    .map((cat) => ({
      category: cat,
      cards: baseCards.filter((c) => matchesCategory(c, cat.id)),
    }))
    .filter((section) => section.cards.length > 0);

  if (sections.length === 0) {
    return <EmptyState starredOnly={starredOnly} />;
  }

  return (
    <div className="space-y-8">
      {sections.map(({ category, cards: sectionCards }) => (
        <section key={category.id}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary-light dark:text-text-secondary-dark">
            {category.name}
            <span className="ml-2 text-xs font-normal normal-case text-text-secondary-light/70 dark:text-text-secondary-dark/70">
              {sectionCards.length} card{sectionCards.length === 1 ? "" : "s"}
            </span>
          </h2>
          {renderGrid(sectionCards)}
        </section>
      ))}
    </div>
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
