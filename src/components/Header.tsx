import { Layers, Moon, Plus, Star, Sun } from "lucide-react";

interface HeaderProps {
  isDark: boolean;
  onToggleDark: () => void;
  onOpenStarColors: () => void;
  onOpenNewCard: () => void;
}

export function Header({
  isDark,
  onToggleDark,
  onOpenStarColors,
  onOpenNewCard,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-app-light/90 backdrop-blur dark:border-slate-800 dark:bg-app-dark/90">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 text-text-primary-light dark:text-text-primary-dark">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-action text-white">
            <Layers size={18} />
          </span>
          <span className="text-lg font-semibold">Flashcards</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenStarColors}
            title="Manage star colors"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-text-secondary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
          >
            <Star size={16} />
            <span className="hidden sm:inline">Star Colors</span>
          </button>
          <button
            type="button"
            onClick={onToggleDark}
            title="Toggle dark mode"
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 p-2 text-text-secondary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={onOpenNewCard}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-action px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Card</span>
          </button>
        </div>
      </div>
    </header>
  );
}
