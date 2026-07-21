import type { Category, StarColor, StarFilterScope, StarFilterState } from "../types";
import { CategoryDropdown } from "./CategoryDropdown";
import { StarFilterDropdown } from "./StarFilterDropdown";

interface FilterBarProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  starColors: StarColor[];
  starFilter: StarFilterState;
  onToggleStarFilterColor: (id: string) => void;
  onSelectAllStarFilterColors: () => void;
  onClearStarFilterColors: () => void;
  onChangeStarFilterScope: (scope: StarFilterScope) => void;
  onToggleStarFilterUnstarred: () => void;
}

export function FilterBar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onDeleteCategory,
  starColors,
  starFilter,
  onToggleStarFilterColor,
  onSelectAllStarFilterColors,
  onClearStarFilterColors,
  onChangeStarFilterScope,
  onToggleStarFilterUnstarred,
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
        <StarFilterDropdown
          starColors={starColors}
          filter={starFilter}
          onToggleColor={onToggleStarFilterColor}
          onSelectAllColors={onSelectAllStarFilterColors}
          onClearColors={onClearStarFilterColors}
          onChangeScope={onChangeStarFilterScope}
          onToggleUnstarred={onToggleStarFilterUnstarred}
        />
      </div>
    </div>
  );
}
