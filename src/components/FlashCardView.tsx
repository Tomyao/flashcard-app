import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { RotateCcw, Tag } from "lucide-react";
import type { Category, FlashCard, Photo, StarColor } from "../types";
import { StarButton } from "./StarButton";
import { PhotoLightbox } from "./PhotoLightbox";
import { useLocalPhotoUrl } from "../hooks/useLocalPhotoUrl";

/** Below this length (after trimming), an answer reads as a caption -- a
 * single word or short phrase -- and looks better centered under its photo
 * than left-aligned with a ragged ends. Longer answers are left-aligned so
 * multi-line text reads naturally instead of every line being centered. */
const SHORT_ANSWER_MAX_LENGTH = 20;

function isShortAnswer(answer: string): boolean {
  return answer.trim().length <= SHORT_ANSWER_MAX_LENGTH;
}

interface PhotoThumbProps {
  photo: Photo | null;
}

/** Prefers the local IndexedDB blob (works fully offline); falls back to
 * the Vercel Blob URL directly if this device never had/kept the local
 * copy (e.g. a photo synced from another device that hasn't been fetched
 * here yet). Styled like a physical photo print -- a white border
 * (heavier at the bottom, like a Polaroid) and a slight tilt -- rather
 * than a plain inline thumbnail. The white frame is deliberately
 * theme-invariant (no dark: override): a real printed photo wouldn't
 * change color with the app's theme. One consistent size everywhere --
 * question and answer photos, front face and back face alike. */
function PhotoThumb({ photo }: PhotoThumbProps) {
  const localUrl = useLocalPhotoUrl(photo?.hash);
  const src = localUrl ?? photo?.remoteUrl ?? null;
  const [open, setOpen] = useState(false);
  if (!src) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // This sits inside rows that flip/reveal the card on click --
          // opening the photo must win, not the flip.
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="View full photo"
        className="mb-6 h-48 w-40 shrink-0 -rotate-2 cursor-zoom-in"
      >
        <div className="h-full w-full rounded-sm bg-white p-2 pb-4 shadow-lg">
          <img src={src} alt="" className="h-full w-full rounded-[1px] object-cover" />
        </div>
      </button>
      <AnimatePresence>
        {open && <PhotoLightbox src={src} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

interface QuestionBlockProps {
  number: number;
  question: string;
  photo: Photo | null;
  starColorId: string | null;
  starColors: StarColor[];
  onToggleStar: () => void;
  textClassName: string;
}

/** The question number, text, and star always sit on one line -- whether
 * or not the question has a photo -- so text position never shifts
 * depending on photo presence. A photo, when there is one, is centered on
 * its own line below that row. Shared by the front-face list, the
 * back-face focused item, and the back-face "all" list so the three stay
 * in sync. */
function QuestionBlock({
  number,
  question,
  photo,
  starColorId,
  starColors,
  onToggleStar,
  textClassName,
}: QuestionBlockProps) {
  return (
    <div>
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-sm font-medium text-action">{number}.</span>
        <p className={`flex-1 ${textClassName}`}>{question}</p>
        <StarButton
          starColorId={starColorId}
          starColors={starColors}
          onToggle={onToggleStar}
          title="Star this question"
        />
      </div>
      {photo && (
        <div className="mt-2 flex justify-center">
          <PhotoThumb photo={photo} />
        </div>
      )}
    </div>
  );
}

interface AnswerBlockProps {
  answer: string;
  photo: Photo | null;
}

/** Same compact box regardless of whether it's the one answer being
 * revealed on its own or one entry among all of them -- it sizes to its
 * content rather than stretching to fill whatever space is available. */
function AnswerBlock({ answer, photo }: AnswerBlockProps) {
  return (
    <div className="mt-2 flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/60">
      <p
        className={`text-base font-medium text-text-primary-light dark:text-text-primary-dark ${
          isShortAnswer(answer) ? "text-center" : "w-full text-left"
        }`}
      >
        {answer}
      </p>
      <PhotoThumb photo={photo} />
    </div>
  );
}

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
    <div className="flip-scene h-full w-full">
      <div
        className={`flip-card relative h-full w-full ${flipped ? "is-flipped" : ""}`}
      >
        {/* FRONT */}
        <div
          className="flip-face absolute inset-0 flex flex-col rounded-2xl border border-slate-200 bg-surface-light p-5 shadow-lg dark:border-slate-700 dark:bg-surface-dark"
          inert={flipped}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    if (card.items.length > 0) setReveal("all");
                  }}
                  title="Flip card: show all answers"
                  className="w-full cursor-pointer text-left text-text-primary-light hover:text-action hover:underline dark:text-text-primary-dark disabled:cursor-not-allowed disabled:no-underline"
                  disabled={card.items.length === 0}
                >
                  {card.topic}
                </button>
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
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setReveal(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setReveal(item.id);
                    }
                  }}
                  className="group w-full cursor-pointer rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-action/5 dark:hover:bg-action/10"
                >
                  <QuestionBlock
                    number={item.number}
                    question={item.question}
                    photo={item.questionPhoto}
                    starColorId={item.starColorId}
                    starColors={starColors}
                    onToggleStar={() => onToggleQuestionStar(item.id)}
                    textClassName="text-sm text-text-primary-light dark:text-text-primary-dark"
                  />
                </div>
              </li>
            ))}
            {card.items.length === 0 && (
              <li className="py-6 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
                No questions yet. Add some content to this card.
              </li>
            )}
          </ol>
        </div>

        {/* BACK */}
        <div
          className="flip-face flip-face-back absolute inset-0 flex flex-col rounded-2xl border border-slate-200 bg-surface-light p-5 shadow-lg dark:border-slate-700 dark:bg-surface-dark"
          inert={!flipped}
        >
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
              <div>
                <QuestionBlock
                  number={focusedItem.number}
                  question={focusedItem.question}
                  photo={focusedItem.questionPhoto}
                  starColorId={focusedItem.starColorId}
                  starColors={starColors}
                  onToggleStar={() => onToggleQuestionStar(focusedItem.id)}
                  textClassName="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark"
                />
                <AnswerBlock answer={focusedItem.answer} photo={focusedItem.answerPhoto} />
              </div>
            ) : (
              <ol className="space-y-4">
                {card.items.map((item) => (
                  <li key={item.id}>
                    <QuestionBlock
                      number={item.number}
                      question={item.question}
                      photo={item.questionPhoto}
                      starColorId={item.starColorId}
                      starColors={starColors}
                      onToggleStar={() => onToggleQuestionStar(item.id)}
                      textClassName="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark"
                    />
                    <AnswerBlock answer={item.answer} photo={item.answerPhoto} />
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
