import { Star } from "lucide-react";
import type { StarColor } from "../types";

interface StarButtonProps {
  starColorId: string | null;
  starColors: StarColor[];
  onToggle: () => void;
  size?: "sm" | "md";
  title?: string;
}

export function StarButton({
  starColorId,
  starColors,
  onToggle,
  size = "sm",
  title,
}: StarButtonProps) {
  const activeColor = starColorId
    ? starColors.find((c) => c.id === starColorId)?.color
    : null;
  const dimension = size === "sm" ? 18 : 22;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={title ?? (activeColor ? "Remove star" : "Star this")}
      aria-pressed={Boolean(activeColor)}
      className="inline-flex shrink-0 items-center justify-center rounded-full p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
    >
      <Star
        size={dimension}
        color={activeColor ?? "#94a3b8"}
        fill={activeColor ?? "none"}
        strokeWidth={1.75}
      />
    </button>
  );
}
