import { useRef } from "react";
import type { MouseEvent } from "react";

/** Backdrop click-to-close that ignores a drag which starts inside the
 * modal (e.g. selecting text in a field) and merely releases over the
 * backdrop -- only a press AND release that both land directly on the
 * backdrop count as a close. Spread the returned handlers onto the
 * backdrop element. */
export function useBackdropClose(onClose: () => void) {
  const pressedOnBackdrop = useRef(false);

  return {
    onMouseDown: (e: MouseEvent) => {
      pressedOnBackdrop.current = e.target === e.currentTarget;
    },
    onClick: (e: MouseEvent) => {
      if (pressedOnBackdrop.current && e.target === e.currentTarget) {
        onClose();
      }
    },
  };
}
