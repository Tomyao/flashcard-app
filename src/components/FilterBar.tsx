import { Star } from "lucide-react";
import type { Category } from "../types";
import { CategoryDropdown } from "./CategoryDropdown";

interface FilterBarProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  starredOnly: boolean;
  onToggleStarredOnly: () => void;
}

export function FilterBar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onDeleteCategory,
  starredOnly,
  onToggleStarredOnly,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-2">
      <CategoryDropdown
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={onSelectCategory}
        onDeleteCategory={onDeleteCategory}
      />

      <div className="ml-auto">
        <button
          type="button"
          onClick={onToggleStarredOnly}
          aria-pressed={starredOnly}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            starredOnly
              ? "border-amber-400 bg-amber-400/10 text-amber-600 dark:text-amber-400"
              : "border-slate-200 text-text-secondary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
          }`}
        >
          <Star size={14} fill={starredOnly ? "currentColor" : "none"} />
          Starred Only
        </button>
      </div>
    </div>
  );
}
