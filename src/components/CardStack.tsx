import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import type { Category, FlashCard, StarColor } from "../types";
import { FlashCardView } from "./FlashCardView";

interface CardStackProps {
  cards: FlashCard[];
  categories: Category[];
  starColors: StarColor[];
  /** changes whenever the active filter changes, so the stack resets to the top */
  resetKey: string;
  onToggleCardStar: (cardId: string) => void;
  onToggleQuestionStar: (cardId: string, qaId: string) => void;
  onEditCard: (card: FlashCard) => void;
  onDeleteCard: (cardId: string) => void;
}

const GHOST_OFFSETS = [
  { y: 14, rotate: 3.5, scale: 0.965, opacity: 0.9 },
  { y: 27, rotate: -5, scale: 0.93, opacity: 0.75 },
];

const SWIPE_MS = 380;
const CARD_MIN_HEIGHT = 300;
/** matches <main>'s bottom padding (py-6) in App.tsx, plus a little breathing room */
const BOTTOM_PAGE_SPACE = 32;

const variants = {
  enter: (dir: number) => ({
    y: dir > 0 ? 26 : -26,
    rotate: dir > 0 ? 3 : -3,
    scale: 0.95,
    opacity: 0,
  }),
  center: { y: 0, rotate: 0, scale: 1, opacity: 1 },
  exit: (dir: number) => ({
    y: dir > 0 ? -34 : 34,
    rotate: dir > 0 ? -6 : 6,
    scale: 0.96,
    opacity: 0,
  }),
};

export function CardStack({
  cards,
  categories,
  starColors,
  resetKey,
  onToggleCardStar,
  onToggleQuestionStar,
  onEditCard,
  onDeleteCard,
}: CardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const indexRef = useRef(0);
  const cooldownRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const belowRef = useRef<HTMLDivElement>(null);
  const [stackHeight, setStackHeight] = useState<number | null>(null);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  // Size the deck to whatever vertical space is actually available, so a
  // card's full content fits without needing to scroll.
  useLayoutEffect(() => {
    function recalc() {
      const container = containerRef.current;
      if (!container) return;
      const top = container.getBoundingClientRect().top;
      const belowHeight = belowRef.current?.offsetHeight ?? 0;
      const available = window.innerHeight - top - belowHeight - BOTTOM_PAGE_SPACE;
      setStackHeight(Math.max(CARD_MIN_HEIGHT, Math.floor(available)));
    }
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [cards.length, categories.length, resetKey]);

  // Reset to the top of the deck whenever the active filter changes.
  useEffect(() => {
    setCurrentIndex(0);
  }, [resetKey]);

  // Keep the index in range if the deck shrinks (e.g. a card is deleted).
  useEffect(() => {
    setCurrentIndex((i) => Math.min(i, Math.max(cards.length - 1, 0)));
  }, [cards.length]);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      if (cooldownRef.current) return;
      const next = indexRef.current + dir;
      if (next < 0 || next > cards.length - 1) return;
      cooldownRef.current = true;
      window.setTimeout(() => {
        cooldownRef.current = false;
      }, SWIPE_MS);
      setDirection(dir);
      setCurrentIndex(next);
    },
    [cards.length],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 8) return;
      navigate(e.deltaY > 0 ? 1 : -1);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [navigate]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      navigate(1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      navigate(-1);
    }
  }

  const currentCard: FlashCard | undefined = cards[currentIndex];
  if (!currentCard) return null;

  const ghosts = [cards[currentIndex + 1], cards[currentIndex + 2]];

  return (
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        tabIndex={0}
        role="group"
        aria-label={`Flashcard stack, card ${currentIndex + 1} of ${cards.length}`}
        onKeyDown={onKeyDown}
        className={`relative w-full max-w-md focus:outline-none ${stackHeight === null ? "h-120" : ""}`}
        style={stackHeight !== null ? { height: stackHeight } : undefined}
      >
        {ghosts.map((ghost, i) =>
          ghost ? (
            <div
              key={ghost.id}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl border border-slate-200 bg-surface-light shadow-md dark:border-slate-700 dark:bg-surface-dark"
              style={{
                transform: `translateY(${GHOST_OFFSETS[i].y}px) rotate(${GHOST_OFFSETS[i].rotate}deg) scale(${GHOST_OFFSETS[i].scale})`,
                opacity: GHOST_OFFSETS[i].opacity,
              }}
            />
          ) : null,
        )}

        <AnimatePresence custom={direction} initial={false}>
          <motion.div
            key={currentCard.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="absolute inset-0"
          >
            <FlashCardView
              card={currentCard}
              categories={categories}
              starColors={starColors}
              onToggleCardStar={() => onToggleCardStar(currentCard.id)}
              onToggleQuestionStar={(qaId) =>
                onToggleQuestionStar(currentCard.id, qaId)
              }
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div ref={belowRef} className="flex flex-col items-center gap-2 pt-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={currentIndex === 0}
            title="Previous card"
            className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 p-1.5 text-text-secondary-light hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-14 text-center text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            {currentIndex + 1} / {cards.length}
          </span>
          <button
            type="button"
            onClick={() => navigate(1)}
            disabled={currentIndex === cards.length - 1}
            title="Next card"
            className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 p-1.5 text-text-secondary-light hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
          >
            <ChevronRight size={16} />
          </button>

          <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <button
            type="button"
            onClick={() => onEditCard(currentCard)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-secondary-light hover:bg-slate-100 dark:text-text-secondary-dark dark:hover:bg-slate-800"
          >
            <Pencil size={12} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDeleteCard(currentCard.id)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-secondary-light hover:bg-error/10 hover:text-error dark:text-text-secondary-dark"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>

        <p className="text-xs text-text-secondary-light/70 dark:text-text-secondary-dark/70">
          Scroll to flip through the deck
        </p>
      </div>
    </div>
  );
}
