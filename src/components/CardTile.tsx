import { Pencil, Trash2 } from "lucide-react";
import type { Category, FlashCard, StarColor } from "../types";
import { FlashCardView } from "./FlashCardView";

interface CardTileProps {
  card: FlashCard;
  categories: Category[];
  starColors: StarColor[];
  onToggleCardStar: () => void;
  onToggleQuestionStar: (qaId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CardTile({
  card,
  categories,
  starColors,
  onToggleCardStar,
  onToggleQuestionStar,
  onEdit,
  onDelete,
}: CardTileProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <FlashCardView
        card={card}
        categories={categories}
        starColors={starColors}
        onToggleCardStar={onToggleCardStar}
        onToggleQuestionStar={onToggleQuestionStar}
      />
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-secondary-light hover:bg-slate-100 dark:text-text-secondary-dark dark:hover:bg-slate-800"
        >
          <Pencil size={12} />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-secondary-light hover:bg-error/10 hover:text-error dark:text-text-secondary-dark"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  );
}
