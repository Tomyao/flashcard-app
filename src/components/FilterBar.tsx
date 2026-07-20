import { Star, X } from "lucide-react";
import type { Category } from "../types";

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
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSelectCategory("all")}
        className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          selectedCategoryId === "all"
            ? "border-action bg-action text-white"
            : "border-slate-200 text-text-secondary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
        }`}
      >
        All
      </button>
      {categories.map((cat) => {
        const active = selectedCategoryId === cat.id;
        return (
          <div key={cat.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`cursor-pointer rounded-full border py-1.5 pl-3 text-sm font-medium transition-colors ${
                cat.isDefault ? "pr-3" : "pr-6"
              } ${
                active
                  ? "border-action bg-action text-white"
                  : "border-slate-200 text-text-secondary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
              }`}
            >
              {cat.name}
            </button>
            {!cat.isDefault && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCategory(cat.id);
                }}
                title="Delete category"
                className={`absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${
                  active ? "text-white hover:bg-white/20" : "text-text-secondary-light hover:bg-black/10 dark:text-text-secondary-dark"
                }`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
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
