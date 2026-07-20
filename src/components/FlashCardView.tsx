import { useState } from "react";
import { Layers, RotateCcw, Tag } from "lucide-react";
import type { Category, FlashCard, StarColor } from "../types";
import { StarButton } from "./StarButton";

interface FlashCardViewProps {
  card: FlashCard;
  categories: Category[];
  starColors: StarColor[];
  onToggleCardStar: () => void;
  onToggleQuestionStar: (qaId: string) => void;
}

type RevealMode = null | "all" | string;

export function FlashCardView({
  card,
  categories,
  starColors,
  onToggleCardStar,
  onToggleQuestionStar,
}: FlashCardViewProps) {
  const [reveal, setReveal] = useState<RevealMode>(null);
  const flipped = reveal !== null;

  const categoryNames = card.categoryIds
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[];

  const focusedItem =
    typeof reveal === "string" && reveal !== "all"
      ? card.items.find((item) => item.id === reveal)
      : null;

  return (
    <div className="flip-scene w-full">
      <div
        className={`flip-card relative min-h-90 w-full ${flipped ? "is-flipped" : ""}`}
      >
        {/* FRONT */}
        <div className="flip-face rounded-2xl border border-slate-200 bg-surface-light p-5 shadow-sm dark:border-slate-700 dark:bg-surface-dark relative flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
                {card.topic}
              </h3>
              {categoryNames.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {categoryNames.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-text-secondary-light dark:bg-slate-800 dark:text-text-secondary-dark"
                    >
                      <Tag size={11} />
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <StarButton
              starColorId={card.starColorId}
              starColors={starColors}
              onToggle={onToggleCardStar}
              title="Star this topic"
            />
          </div>

          <ol className="mt-4 flex-1 space-y-1.5 overflow-y-auto">
            {card.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setReveal(item.id)}
                  className="group flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-action/5 dark:hover:bg-action/10"
                >
                  <span className="mt-0.5 shrink-0 text-sm font-medium text-action">
                    {item.number}.
                  </span>
                  <span className="flex-1 text-sm text-text-primary-light dark:text-text-primary-dark">
                    {item.question}
                  </span>
                  <StarButton
                    starColorId={item.starColorId}
                    starColors={starColors}
                    onToggle={() => onToggleQuestionStar(item.id)}
                    title="Star this question"
                  />
                </button>
              </li>
            ))}
            {card.items.length === 0 && (
              <li className="py-6 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
                No questions yet. Add some content to this card.
              </li>
            )}
          </ol>

          <button
            type="button"
            onClick={() => setReveal("all")}
            disabled={card.items.length === 0}
            className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-action px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Layers size={16} />
            Flip Card: Show All Answers
          </button>
        </div>

        {/* BACK */}
        <div className="flip-face flip-face-back absolute inset-0 flex flex-col rounded-2xl border border-slate-200 bg-surface-light p-5 shadow-sm dark:border-slate-700 dark:bg-surface-dark">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
              {card.topic}
            </h3>
            <button
              type="button"
              onClick={() => setReveal(null)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-text-secondary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
            >
              <RotateCcw size={13} />
              Back
            </button>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto">
            {focusedItem ? (
              <div className="flex h-full flex-col">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-action">
                    {focusedItem.number}.
                  </span>
                  <p className="flex-1 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
                    {focusedItem.question}
                  </p>
                  <StarButton
                    starColorId={focusedItem.starColorId}
                    starColors={starColors}
                    onToggle={() => onToggleQuestionStar(focusedItem.id)}
                    title="Star this question"
                  />
                </div>
                <div className="mt-4 flex flex-1 items-center justify-center rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/60">
                  <p className="text-base font-medium text-text-primary-light dark:text-text-primary-dark">
                    {focusedItem.answer}
                  </p>
                </div>
              </div>
            ) : (
              <ol className="space-y-3">
                {card.items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-action">
                        {item.number}.
                      </span>
                      <span className="flex-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        {item.question}
                      </span>
                    </div>
                    <p className="mt-1 pl-5 text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                      {item.answer}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
