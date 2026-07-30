import { useEffect, useRef, useState, type TouchList as ReactTouchList } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface PhotoLightboxProps {
  src: string;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function distanceBetweenTouches(touches: ReactTouchList): number {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );
}

/** Full-screen photo viewer, rendered via a portal to `document.body` so it
 * escapes the card stack's/flip's own CSS transforms (a `position: fixed`
 * descendant of a transformed ancestor is positioned relative to that
 * ancestor, not the viewport -- a portal is the only way around that here).
 * The default fit-to-screen size is already large enough on desktop, so
 * zoom is only wired up for touch: two-finger pinch to zoom in, drag to pan
 * once zoomed. Click/tap anywhere (image included) closes it. */
export function PhotoLightbox({ src, onClose }: PhotoLightboxProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(
    null,
  );
  const pinchRef = useRef<{ initialDistance: number; initialScale: number } | null>(null);

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

  function onPointerDown(e: React.PointerEvent<HTMLImageElement>) {
    if (scale <= 1) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLImageElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: drag.startOffsetX + (e.clientX - drag.startX),
      y: drag.startOffsetY + (e.clientY - drag.startY),
    });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onTouchStart(e: React.TouchEvent<HTMLImageElement>) {
    if (e.touches.length === 2) {
      pinchRef.current = { initialDistance: distanceBetweenTouches(e.touches), initialScale: scale };
    }
  }

  function onTouchMove(e: React.TouchEvent<HTMLImageElement>) {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const distance = distanceBetweenTouches(e.touches);
      const nextScale =
        pinchRef.current.initialScale * (distance / pinchRef.current.initialDistance);
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale)));
    }
  }

  function onTouchEnd(e: React.TouchEvent<HTMLImageElement>) {
    if (e.touches.length < 2) pinchRef.current = null;
  }

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
          src={src}
          alt=""
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            cursor: scale > 1 ? "grab" : "default",
          }}
          className="max-h-[85vh] max-w-[90vw] touch-none rounded-lg object-contain shadow-2xl transition-transform select-none"
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
