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

// Index 0 is the nearer ghost (painted on top, for correct depth), index 1
// the farther one (painted behind, only present with 3+ cards left in the
// deck). When both exist, the nearer one leans left so "painted on top" and
// "leans left, shows over the right-leaning one" agree instead of fighting
// each other. With only one ghost (exactly 2 cards left), there's no such
// ordering to satisfy, so it leans right instead -- see ghostRotate below.
const LEFT_LEAN_DEG = -5;
const RIGHT_LEAN_DEG = 3.5;
const GHOST_OFFSETS = [
  { y: 14, scale: 0.965, opacity: 0.9 },
  { y: 27, scale: 0.93, opacity: 0.75 },
];

const CARD_MIN_HEIGHT = 300;
/** How much accumulated wheel deltaY it takes to cross one card. A single
 * mouse-wheel notch (~100) moves exactly one card; a fast trackpad flick,
 * which sums to much more than that over its motion, carries through many
 * cards at once -- momentum scrolling rather than one-card-per-tick. */
const WHEEL_UNITS_PER_CARD = 100;
/** A trackpad flick delivers wheel events with only a few milliseconds
 * between them; a genuinely new, separate scroll action -- the user having
 * actually stopped and started again -- arrives much later than that. Events
 * closer together than this are treated as the same continuous gesture, so a
 * fast flick keeps carrying through the deck even when it happens to pass
 * over a card with a scrollable question/answer list. Only once the gap
 * exceeds this (the deck has settled) does that list start capturing the
 * wheel to scroll its own content. */
const MOMENTUM_GAP_MS = 180;
/** matches <main>'s bottom padding (py-6) in App.tsx, plus a little breathing room */
const BOTTOM_PAGE_SPACE = 32;

/** Walks up from the wheel event's target (stopping at `boundary`) looking
 * for an element that both opts into vertical scrolling and actually
 * overflows -- as opposed to one that merely has `overflow-y-auto` set but
 * fits its content. */
function findScrollableAncestor(
  target: EventTarget | null,
  boundary: HTMLElement,
): HTMLElement | null {
  let el = target instanceof HTMLElement ? target : null;
  while (el && el !== boundary) {
    const style = window.getComputedStyle(el);
    const scrollsY = style.overflowY === "auto" || style.overflowY === "scroll";
    if (scrollsY && el.scrollHeight > el.clientHeight + 1) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

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
  // Tracked by card id rather than raw position: cards are kept sorted
  // alphabetically, so editing the very card you're looking at can move it
  // elsewhere in the deck. Tracking by id means you keep looking at the same
  // card across a reorder instead of whatever now sits at the old index.
  const [currentCardId, setCurrentCardId] = useState<string | null>(
    () => cards[0]?.id ?? null,
  );
  const [direction, setDirection] = useState(1);
  const indexRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const belowRef = useRef<HTMLDivElement>(null);
  const [stackHeight, setStackHeight] = useState<number | null>(null);
  /** Continuous "virtual scroll" position, in wheel-delta units, kept in
   * sync with the current index. Lets a fast flick accumulate across many
   * small wheel events instead of being capped at one card per event. */
  const scrollPosRef = useRef(0);
  /** Timestamp of the last wheel event that was stack-directed (as opposed
   * to one that scrolled a card's content). Used to tell a fast flick's
   * continuous stream of events apart from a genuinely new scroll action
   * that starts after the deck has settled. */
  const lastStackWheelAtRef = useRef(0);

  const foundIndex = currentCardId
    ? cards.findIndex((c) => c.id === currentCardId)
    : -1;
  const currentIndex = foundIndex >= 0 ? foundIndex : 0;

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

  const prevResetKeyRef = useRef(resetKey);

  // Whenever the active filter changes, jump to the top of the new deck.
  // Otherwise (same filter, but `cards` changed -- an edit, a delete, a
  // reorder from resorting), stay on the same card if it's still in the
  // deck; if it vanished, fall back to whatever now sits near its old
  // position rather than jumping back to the top.
  useEffect(() => {
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      scrollPosRef.current = 0;
      setCurrentCardId(cards[0]?.id ?? null);
      return;
    }
    const stillPresent = cards.some((c) => c.id === currentCardId);
    if (!stillPresent) {
      const fallbackIndex = Math.max(0, Math.min(indexRef.current, cards.length - 1));
      scrollPosRef.current = fallbackIndex * WHEEL_UNITS_PER_CARD;
      setCurrentCardId(cards[fallbackIndex]?.id ?? null);
    }
  }, [cards, resetKey, currentCardId]);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      const next = Math.max(0, Math.min(cards.length - 1, indexRef.current + dir));
      if (next === indexRef.current) return;
      scrollPosRef.current = next * WHEEL_UNITS_PER_CARD;
      setDirection(dir);
      setCurrentCardId(cards[next]?.id ?? null);
    },
    [cards],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      // Only a wheel event that was itself stack-directed (no scrollable
      // content under it, or continuing a flick already in progress) counts
      // toward "still mid-gesture". A run of events that were all just
      // scrolling a list's text must never flip into stack momentum, no
      // matter how quickly they arrive -- otherwise reading down a long
      // card by spinning the wheel would eject you to the next card.
      const isContinuingGesture =
        performance.now() - lastStackWheelAtRef.current < MOMENTUM_GAP_MS;

      // If the wheel is over a genuinely overflowing area (a long
      // question/answer list) AND the deck has actually settled here (this
      // isn't just a fast flick still carrying momentum through a card that
      // happens to scroll), that area owns the wheel entirely -- it just
      // scrolls, and never flips the card. To go to the next card while
      // hovering scrollable content, use the Prev/Next buttons, arrow keys,
      // or move off the list first. The scroll is applied manually (rather
      // than left to the browser's default action) since the stack's layered
      // absolute positioning can otherwise confuse the browser's scroll
      // hit-testing.
      const scrollable = findScrollableAncestor(e.target, el as HTMLElement);
      if (scrollable && !isContinuingGesture) {
        e.preventDefault();
        scrollable.scrollTop += e.deltaY;
        return;
      }

      // Momentum: accumulate raw wheel motion into a continuous position and
      // derive the card index from it, instead of moving exactly one card
      // per event. A single wheel notch still lands on the next card, but a
      // fast flick's much larger total delta carries through several cards
      // in one go.
      lastStackWheelAtRef.current = performance.now();
      e.preventDefault();
      const maxPos = Math.max(cards.length - 1, 0) * WHEEL_UNITS_PER_CARD;
      scrollPosRef.current = Math.max(
        0,
        Math.min(maxPos, scrollPosRef.current + e.deltaY),
      );
      const targetIndex = Math.round(scrollPosRef.current / WHEEL_UNITS_PER_CARD);
      if (targetIndex !== indexRef.current) {
        setDirection(targetIndex > indexRef.current ? 1 : -1);
        setCurrentCardId(cards[targetIndex]?.id ?? null);
      }
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
  // With a second ghost behind it, the nearer one leans left (to correctly
  // overlap the right-leaning farther one). With only one ghost, there's
  // nothing behind it to overlap, so it leans right instead.
  const ghostRotate = [ghosts[1] ? LEFT_LEAN_DEG : RIGHT_LEAN_DEG, RIGHT_LEAN_DEG];

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
        {/* Painted farthest-first (index 1, then 0) so each nearer card
            correctly layers on top of the one behind it -- and (see
            ghostRotate above) that's also the same card that should show
            over the right-leaning one, so both constraints agree. */}
        {[1, 0].map((i) => {
          const ghost = ghosts[i];
          if (!ghost) return null;
          return (
            <div
              key={ghost.id}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl border border-slate-200 bg-surface-light shadow-md dark:border-slate-700 dark:bg-surface-dark"
              style={{
                transform: `translateY(${GHOST_OFFSETS[i].y}px) rotate(${ghostRotate[i]}deg) scale(${GHOST_OFFSETS[i].scale})`,
                opacity: GHOST_OFFSETS[i].opacity,
              }}
            />
          );
        })}

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
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-error hover:bg-error/10"
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
