import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Image as ImageIcon, Plus, Trash2, X } from "lucide-react";
import type { Category, FlashCard, Photo } from "../types";
import { NO_CATEGORY_ID } from "../types";
import * as db from "../db/db";
import { compressImage, hashBlob } from "../lib/imageCompression";
import { useLocalPhotoUrl } from "../hooks/useLocalPhotoUrl";

interface DraftItem {
  id: string;
  question: string;
  answer: string;
  questionPhoto: Photo | null;
  answerPhoto: Photo | null;
}

type PhotoSlot = "questionPhoto" | "answerPhoto";

interface HasPhotos {
  questionPhoto: Photo | null;
  answerPhoto: Photo | null;
}

/** All photo hashes referenced anywhere across a set of items (both slots). */
function hashesOf(items: HasPhotos[]): Set<string> {
  const hashes = new Set<string>();
  for (const item of items) {
    if (item.questionPhoto) hashes.add(item.questionPhoto.hash);
    if (item.answerPhoto) hashes.add(item.answerPhoto.hash);
  }
  return hashes;
}

interface PhotoFieldProps {
  label: string;
  photo: Photo | null;
  onAttach: (file: File) => void;
  onRemove: () => void;
}

/** Attach/replace/remove control for one side (question or answer) of one
 * item. Doesn't delete anything itself on replace/remove -- a hash can be
 * shared by other items (dedup), so only the session-end sweep (see
 * `sweepAbandonedSessionPhotos` below) and, on actual save,
 * `DataContext.saveCard`'s reference-counted cleanup are allowed to delete
 * a blob. */
function PhotoField({ label, photo, onAttach, onRemove }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const url = useLocalPhotoUrl(photo?.hash);

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAttach(file);
          e.target.value = "";
        }}
      />
      {photo ? (
        <>
          {url && (
            <img
              src={url}
              alt=""
              className="h-10 w-10 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-700"
            />
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-text-secondary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
          >
            Replace photo
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label} photo`}
            className="cursor-pointer rounded-md p-1 text-text-secondary-light hover:bg-error/10 hover:text-error dark:text-text-secondary-dark"
          >
            <Trash2 size={13} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs font-medium text-text-secondary-light hover:bg-slate-100 dark:border-slate-600 dark:text-text-secondary-dark dark:hover:bg-slate-800"
        >
          <ImageIcon size={13} />
          Add {label} photo
        </button>
      )}
    </div>
  );
}

interface AutoGrowTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}

/** A single-line-by-default textarea that grows to fit its content, so a
 * long question or answer stays fully readable instead of scrolling off
 * to the side the way a single-line input would. */
function AutoGrowTextarea({ value, onChange, placeholder, required }: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full resize-none overflow-hidden rounded-md border border-slate-200 bg-transparent px-2.5 py-1.5 text-sm text-text-primary-light focus:border-action focus:outline-none dark:border-slate-700 dark:text-text-primary-dark"
    />
  );
}

interface CardEditorModalProps {
  open: boolean;
  onClose: () => void;
  card: FlashCard | null;
  categories: Category[];
  /** All cards in the app -- used only to check whether a photo the user is
   * abandoning mid-session is still referenced by some other (already
   * saved) card before deleting its blob; see `sweepAbandonedSessionPhotos`. */
  cards: FlashCard[];
  onCreateCategory: (name: string) => Promise<Category>;
  onSave: (input: {
    topic: string;
    categoryIds: string[];
    items: Array<{
      id?: string;
      question: string;
      answer: string;
      questionPhoto: Photo | null;
      answerPhoto: Photo | null;
    }>;
  }) => void;
}

function toDraftItems(card: FlashCard | null): DraftItem[] {
  if (!card || card.items.length === 0) {
    return [
      {
        id: crypto.randomUUID(),
        question: "",
        answer: "",
        questionPhoto: null,
        answerPhoto: null,
      },
    ];
  }
  return card.items.map((item) => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
    questionPhoto: item.questionPhoto,
    answerPhoto: item.answerPhoto,
  }));
}

export function CardEditorModal({
  open,
  onClose,
  card,
  categories,
  cards,
  onCreateCategory,
  onSave,
}: CardEditorModalProps) {
  const [topic, setTopic] = useState(card?.topic ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(
    card?.categoryIds ?? [],
  );
  const [items, setItems] = useState<DraftItem[]>(() => toDraftItems(card));
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryNameError, setCategoryNameError] = useState<string | null>(
    null,
  );

  // Photos that belonged to `card` before this editing session started --
  // never eligible for the abandoned-photo sweep below, since only
  // DataContext.saveCard's own (cross-card) diff is allowed to clean those
  // up, once a save actually commits.
  const originalHashesRef = useRef<Set<string>>(new Set());
  // Every hash newly created (attached) during this editing session. A
  // fresh instance each time the modal opens -- not on every keystroke --
  // since this same component instance can be toggled open/closed
  // repeatedly for the same card (see App.tsx's `key={editingCard?.id}`).
  const sessionCreatedHashesRef = useRef<Set<string>>(new Set());

  // Re-initializes the draft from `card` every time the modal opens --
  // not just on mount. Creating a new card keeps `card` as `null` across
  // saves (see App.tsx's `openNewCard`), so this same instance gets
  // reopened for the next new card rather than remounted; without this,
  // the draft would still hold whatever was just submitted instead of a
  // blank form.
  useEffect(() => {
    if (!open) return;
    setTopic(card?.topic ?? "");
    setCategoryIds(card?.categoryIds ?? []);
    setItems(toDraftItems(card));
    setNewCategoryName("");
    setCategoryNameError(null);
    originalHashesRef.current = hashesOf(toDraftItems(card));
    sessionCreatedHashesRef.current = new Set();
  }, [open, card]);

  if (!open) return null;

  const customCategories = categories.filter((c) => !c.isDefault);

  function isHashReferencedElsewhere(hash: string): boolean {
    return cards.some(
      (c) =>
        c.items.some(
          (i) => i.questionPhoto?.hash === hash || i.answerPhoto?.hash === hash,
        ),
    );
  }

  /** Deletes any hash created during this session that didn't make it into
   * `finalItems` (whatever's actually being kept -- the saved items, or the
   * reverted-to-original items on cancel) and isn't still needed by some
   * other already-saved card. This is the only place that cleans up a
   * photo that was attached and then replaced/removed before ever being
   * saved -- `saveCard`'s diff only knows about the card's state from
   * before the modal opened, so a photo that only ever existed mid-session
   * is invisible to it. */
  function sweepAbandonedSessionPhotos(finalItems: HasPhotos[]) {
    const keptHashes = hashesOf(finalItems);
    for (const hash of sessionCreatedHashesRef.current) {
      if (!keptHashes.has(hash) && !isHashReferencedElsewhere(hash)) {
        void db.deletePhoto(hash);
      }
    }
    sessionCreatedHashesRef.current = new Set();
  }

  function resetAndClose() {
    sweepAbandonedSessionPhotos(toDraftItems(card));
    setTopic(card?.topic ?? "");
    setCategoryIds(card?.categoryIds ?? []);
    setItems(toDraftItems(card));
    setNewCategoryName("");
    setCategoryNameError(null);
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
    const isDuplicate = categories.some(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
    if (isDuplicate) {
      setCategoryNameError("A category with this name already exists.");
      return;
    }
    const created = await onCreateCategory(name);
    setCategoryIds((prev) => [...prev, created.id]);
    setNewCategoryName("");
    setCategoryNameError(null);
  }

  function updateItem(id: string, field: "question" | "answer", value: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function attachPhoto(id: string, slot: PhotoSlot, file: File) {
    void (async () => {
      const compressed = await compressImage(file);
      const hash = await hashBlob(compressed);
      await db.putPhoto(hash, compressed);
      if (!originalHashesRef.current.has(hash)) {
        sessionCreatedHashesRef.current.add(hash);
      }
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [slot]: { hash, remoteUrl: null } } : item,
        ),
      );
    })();
  }

  function removePhoto(id: string, slot: PhotoSlot) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [slot]: null } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question: "",
        answer: "",
        questionPhoto: null,
        answerPhoto: null,
      },
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
        questionPhoto: item.questionPhoto,
        answerPhoto: item.answerPhoto,
      }))
      .filter((item) => item.question && item.answer);
    if (cleanItems.length === 0) return;
    sweepAbandonedSessionPhotos(cleanItems);
    onSave({ topic: cleanTopic, categoryIds, items: cleanItems });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-surface-light shadow-xl dark:border-slate-700 dark:bg-surface-dark">
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
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                setCategoryNameError(null);
              }}
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
          {categoryNameError && (
            <p className="mt-1 text-xs text-error">{categoryNameError}</p>
          )}

          <label className="mt-5 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
            Questions &amp; Answers
          </label>

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
                    <div>
                      <AutoGrowTextarea
                        value={item.question}
                        onChange={(value) => updateItem(item.id, "question", value)}
                        placeholder="Question"
                        required
                      />
                      <PhotoField
                        label="question"
                        photo={item.questionPhoto}
                        onAttach={(file) => attachPhoto(item.id, "questionPhoto", file)}
                        onRemove={() => removePhoto(item.id, "questionPhoto")}
                      />
                    </div>
                    <div>
                      <AutoGrowTextarea
                        value={item.answer}
                        onChange={(value) => updateItem(item.id, "answer", value)}
                        placeholder="Answer"
                        required
                      />
                      <PhotoField
                        label="answer"
                        photo={item.answerPhoto}
                        onAttach={(file) => attachPhoto(item.id, "answerPhoto", file)}
                        onRemove={() => removePhoto(item.id, "answerPhoto")}
                      />
                    </div>
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

          <button
            type="button"
            onClick={addItem}
            className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-action/40 bg-action/5 px-2.5 py-2 text-sm font-medium text-action hover:bg-action/10"
          >
            <Plus size={14} />
            Add pair
          </button>
        </form>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
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
  );
}
