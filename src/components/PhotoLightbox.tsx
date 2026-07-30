import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface PhotoLightboxProps {
  src: string;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function distanceBetweenTouches(touches: TouchList): number {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );
}

type Gesture =
  | { type: "pan"; startX: number; startY: number; startOffsetX: number; startOffsetY: number }
  | { type: "pinch"; initialDistance: number; initialScale: number }
  | null;

/** Full-screen photo viewer, rendered via a portal to `document.body` so it
 * escapes the card stack's/flip's own CSS transforms (a `position: fixed`
 * descendant of a transformed ancestor is positioned relative to that
 * ancestor, not the viewport -- a portal is the only way around that here).
 * The default fit-to-screen size is already large enough on desktop, so
 * zoom is only wired up for touch: two-finger pinch to zoom in, one-finger
 * drag to pan once zoomed. Click/tap anywhere (image included) closes it.
 *
 * Touch handling is done via a manually-attached, non-passive listener
 * (like `CardStack`'s wheel/touch handling) rather than JSX's
 * `onTouchMove` -- React binds touch listeners passively under the hood,
 * which silently no-ops `preventDefault()`, letting the browser's own
 * pinch-zoom/scroll run at the same time as ours and fight it. The
 * transform itself is written straight to the DOM via a ref on every
 * move rather than through React state, so a fast gesture isn't gated
 * behind a render each frame -- combined, this is what actually makes the
 * gesture feel 1:1 instead of laggy. Only Touch Events are used (no
 * Pointer Events) since a single element mixing both for pan vs. pinch
 * caused the two to fire and interfere during a two-finger gesture. */
export function PhotoLightbox({ src, onClose }: PhotoLightboxProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const transformRef = useRef({ scale: 1, x: 0, y: 0 });
  const gestureRef = useRef<Gesture>(null);

  // Lock page scroll while the lightbox is open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    function applyTransform() {
      const { scale, x, y } = transformRef.current;
      if (img) img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }

    function startPan(touch: Touch) {
      gestureRef.current = {
        type: "pan",
        startX: touch.clientX,
        startY: touch.clientY,
        startOffsetX: transformRef.current.x,
        startOffsetY: transformRef.current.y,
      };
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        gestureRef.current = {
          type: "pinch",
          initialDistance: distanceBetweenTouches(e.touches),
          initialScale: transformRef.current.scale,
        };
      } else if (e.touches.length === 1 && transformRef.current.scale > 1) {
        startPan(e.touches[0]);
      }
    }

    function onTouchMove(e: TouchEvent) {
      const gesture = gestureRef.current;
      if (!gesture) return;
      e.preventDefault();

      if (gesture.type === "pinch" && e.touches.length === 2) {
        const distance = distanceBetweenTouches(e.touches);
        transformRef.current.scale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, gesture.initialScale * (distance / gesture.initialDistance)),
        );
      } else if (gesture.type === "pan" && e.touches.length === 1) {
        const touch = e.touches[0];
        transformRef.current.x = gesture.startOffsetX + (touch.clientX - gesture.startX);
        transformRef.current.y = gesture.startOffsetY + (touch.clientY - gesture.startY);
      }
      applyTransform();
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length === 0) {
        gestureRef.current = null;
        // Snap back if pinched below the minimum -- no reason to leave the
        // image panned/off-center once it's back to unzoomed.
        if (transformRef.current.scale <= 1) {
          transformRef.current = { scale: 1, x: 0, y: 0 };
          applyTransform();
        }
      } else if (e.touches.length === 1 && transformRef.current.scale > 1) {
        // Lifting one finger out of a pinch -- resume as a pan from here
        // instead of just stopping.
        startPan(e.touches[0]);
      } else {
        gestureRef.current = null;
      }
    }

    img.addEventListener("touchstart", onTouchStart, { passive: true });
    img.addEventListener("touchmove", onTouchMove, { passive: false });
    img.addEventListener("touchend", onTouchEnd, { passive: true });
    img.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      img.removeEventListener("touchstart", onTouchStart);
      img.removeEventListener("touchmove", onTouchMove);
      img.removeEventListener("touchend", onTouchEnd);
      img.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return createPortal(
    <motion.div
      key="photo-lightbox"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      // React bubbles portaled events through the *React* tree, not the
      // DOM tree -- this overlay is a React descendant of whatever card
      // row opened it, so an unstopped click here would still reach that
      // row's flip handler even though it's rendered into document.body.
      // Only the explicit close button (below) is allowed to close this.
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          style={{ transform: "translate(0px, 0px) scale(1)" }}
          className="max-h-[85vh] max-w-[90vw] touch-none rounded-lg object-contain shadow-2xl select-none will-change-transform"
        />
      </motion.div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute top-4 right-4 cursor-pointer rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
      >
        <X size={20} />
      </button>
    </motion.div>,
    document.body,
  );
}
