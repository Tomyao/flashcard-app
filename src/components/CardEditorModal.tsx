import { useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { Category, FlashCard } from "../types";
import { NO_CATEGORY_ID } from "../types";

interface DraftItem {
  id: string;
  question: string;
  answer: string;
}

interface CardEditorModalProps {
  open: boolean;
  onClose: () => void;
  card: FlashCard | null;
  categories: Category[];
  onCreateCategory: (name: string) => Promise<Category>;
  onSave: (input: {
    topic: string;
    categoryIds: string[];
    items: Array<{ id?: string; question: string; answer: string }>;
  }) => void;
  onDeleteCard?: () => void;
}

function toDraftItems(card: FlashCard | null): DraftItem[] {
  if (!card || card.items.length === 0) {
    return [{ id: crypto.randomUUID(), question: "", answer: "" }];
  }
  return card.items.map((item) => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
  }));
}

export function CardEditorModal({
  open,
  onClose,
  card,
  categories,
  onCreateCategory,
  onSave,
  onDeleteCard,
}: CardEditorModalProps) {
  const [topic, setTopic] = useState(card?.topic ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(
    card?.categoryIds ?? [],
  );
  const [items, setItems] = useState<DraftItem[]>(() => toDraftItems(card));
  const [newCategoryName, setNewCategoryName] = useState("");

  if (!open) return null;

  const customCategories = categories.filter((c) => !c.isDefault);

  function resetAndClose() {
    setTopic(card?.topic ?? "");
    setCategoryIds(card?.categoryIds ?? []);
    setItems(toDraftItems(card));
    setNewCategoryName("");
    onClose();
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const created = await onCreateCategory(name);
    setCategoryIds((prev) => [...prev, created.id]);
    setNewCategoryName("");
  }

  function updateItem(id: string, field: "question" | "answer", value: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), question: "", answer: "" },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) =>
      prev.length > 1 ? prev.filter((item) => item.id !== id) : prev,
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanTopic = topic.trim();
    if (!cleanTopic) return;
    const isOriginalId = (id: string) =>
      card?.items.some((original) => original.id === id) ?? false;
    const cleanItems = items
      .map((item) => ({
        id: isOriginalId(item.id) ? item.id : undefined,
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question && item.answer);
    if (cleanItems.length === 0) return;
    onSave({ topic: cleanTopic, categoryIds, items: cleanItems });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={resetAndClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-surface-light shadow-xl dark:border-slate-700 dark:bg-surface-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
            {card ? "Edit Flashcard" : "New Flashcard"}
          </h2>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1.5 text-text-secondary-light hover:bg-slate-100 dark:text-text-secondary-dark dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5"
          id="card-editor-form"
        >
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Cell Biology"
            required
            className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm text-text-primary-light focus:border-action focus:outline-none dark:border-slate-700 dark:text-text-primary-dark"
          />

          <label className="mt-4 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
            Categories
          </label>
          <p className="mt-0.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
            Leave unchecked to file this card under "No Category".
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {customCategories.map((cat) => {
              const active = categoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-action bg-action text-white"
                      : "border-slate-200 text-text-secondary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
            {categoryIds.length === 0 && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-text-secondary-light dark:bg-slate-800 dark:text-text-secondary-dark">
                {categories.find((c) => c.id === NO_CATEGORY_ID)?.name ??
                  "No Category"}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreateCategory();
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 py-1.5 text-sm text-text-primary-light focus:border-action focus:outline-none dark:border-slate-700 dark:text-text-primary-dark"
            />
            <button
              type="button"
              onClick={() => void handleCreateCategory()}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-text-secondary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
            >
              <Plus size={13} />
              Add
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
              Questions &amp; Answers
            </label>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-action/10 px-2.5 py-1 text-xs font-medium text-action hover:bg-action/20"
            >
              <Plus size={13} />
              Add pair
            </button>
          </div>

          <ol className="mt-2 space-y-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-2 text-sm font-medium text-action">
                    {index + 1}.
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) =>
                        updateItem(item.id, "question", e.target.value)
                      }
                      placeholder="Question"
                      className="w-full rounded-md border border-slate-200 bg-transparent px-2.5 py-1.5 text-sm text-text-primary-light focus:border-action focus:outline-none dark:border-slate-700 dark:text-text-primary-dark"
                    />
                    <input
                      type="text"
                      value={item.answer}
                      onChange={(e) =>
                        updateItem(item.id, "answer", e.target.value)
                      }
                      placeholder="Answer"
                      className="w-full rounded-md border border-slate-200 bg-transparent px-2.5 py-1.5 text-sm text-text-primary-light focus:border-action focus:outline-none dark:border-slate-700 dark:text-text-primary-dark"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    className="mt-1.5 shrink-0 cursor-pointer rounded-full p-1 text-text-secondary-light hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-30 dark:text-text-secondary-dark"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </form>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
          {card && onDeleteCard ? (
            <button
              type="button"
              onClick={onDeleteCard}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-error hover:bg-error/10"
            >
              <Trash2 size={15} />
              Delete card
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetAndClose}
              className="cursor-pointer rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-text-secondary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="card-editor-form"
              className="cursor-pointer rounded-lg bg-action px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {card ? "Save Changes" : "Create Card"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
