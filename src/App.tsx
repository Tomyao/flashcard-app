import { useState } from "react";
import { Header } from "./components/Header";
import { FilterBar } from "./components/FilterBar";
import { CardBoard } from "./components/CardBoard";
import { CardEditorModal } from "./components/CardEditorModal";
import { StarColorOverlay } from "./components/StarColorOverlay";
import { useData } from "./context/DataContext";
import { useDarkMode } from "./hooks/useDarkMode";
import type { FlashCard } from "./types";

function App() {
  const data = useData();
  const [isDark, toggleDark] = useDarkMode();

  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [starredOnly, setStarredOnly] = useState(false);
  const [starColorsOpen, setStarColorsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);

  if (data.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-light dark:bg-app-dark">
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Loading your flashcards…
        </p>
      </div>
    );
  }

  function openNewCard() {
    setEditingCard(null);
    setEditorOpen(true);
  }

  function openEditCard(card: FlashCard) {
    setEditingCard(card);
    setEditorOpen(true);
  }

  function handleDeleteCard(cardId: string) {
    const card = data.cards.find((c) => c.id === cardId);
    if (!card) return;
    if (window.confirm(`Delete "${card.topic}"? This can't be undone.`)) {
      void data.removeCard(cardId);
    }
  }

  function handleDeleteCategory(categoryId: string) {
    const category = data.categories.find((c) => c.id === categoryId);
    if (!category) return;
    if (
      window.confirm(
        `Delete category "${category.name}"? Cards in it will move to No Category.`,
      )
    ) {
      void data.removeCategory(categoryId);
      if (selectedCategoryId === categoryId) setSelectedCategoryId("all");
    }
  }

  function handleDeleteStarColor(id: string) {
    const starColor = data.starColors.find((c) => c.id === id);
    if (!starColor) return;
    const usageCount = data.cards.reduce((count, card) => {
      const cardHit = card.starColorId === id ? 1 : 0;
      const itemHits = card.items.filter((i) => i.starColorId === id).length;
      return count + cardHit + itemHits;
    }, 0);
    const usageNote =
      usageCount > 0
        ? ` It's currently used on ${usageCount} star${usageCount === 1 ? "" : "s"}, which will be cleared.`
        : "";
    if (
      window.confirm(`Delete the "${starColor.name}" star color?${usageNote}`)
    ) {
      void data.removeStarColor(id);
    }
  }

  return (
    <div className="min-h-screen bg-app-light dark:bg-app-dark">
      <Header
        isDark={isDark}
        onToggleDark={toggleDark}
        onOpenStarColors={() => setStarColorsOpen(true)}
        onOpenNewCard={openNewCard}
        activeStarColor={
          data.starColors.find((c) => c.id === data.activeStarColorId)
            ?.color ?? null
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <FilterBar
          categories={data.categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          onDeleteCategory={handleDeleteCategory}
          starredOnly={starredOnly}
          onToggleStarredOnly={() => setStarredOnly((prev) => !prev)}
        />

        <div className="mt-6">
          <CardBoard
            cards={data.cards}
            categories={data.categories}
            starColors={data.starColors}
            selectedCategoryId={selectedCategoryId}
            starredOnly={starredOnly}
            onToggleCardStar={(cardId) => void data.toggleCardStar(cardId)}
            onToggleQuestionStar={(cardId, qaId) =>
              void data.toggleQuestionStar(cardId, qaId)
            }
            onEditCard={openEditCard}
            onDeleteCard={handleDeleteCard}
          />
        </div>
      </main>

      <CardEditorModal
        key={editingCard?.id ?? "new"}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        card={editingCard}
        categories={data.categories}
        onCreateCategory={data.createCategory}
        onSave={(input) =>
          void data.saveCard({ id: editingCard?.id, ...input })
        }
      />

      <StarColorOverlay
        open={starColorsOpen}
        onClose={() => {
          setStarColorsOpen(false);
          data.reorderStarColors();
        }}
        starColors={data.starColors}
        activeStarColorId={data.activeStarColorId}
        onSelectActive={data.setActiveStarColorId}
        onCreate={(name, color) => void data.createStarColor(name, color)}
        onUpdate={(id, updates) => void data.updateStarColor(id, updates)}
        onReorder={data.reorderStarColors}
        onDelete={handleDeleteStarColor}
      />
    </div>
  );
}

export default App;
