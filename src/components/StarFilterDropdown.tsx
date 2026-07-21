import { useEffect, useRef, useState } from "react";
import { ChevronDown, Star, StarOff } from "lucide-react";
import type { StarColor, StarFilterScope, StarFilterState } from "../types";

interface StarFilterDropdownProps {
  starColors: StarColor[];
  filter: StarFilterState;
  onToggleColor: (id: string) => void;
  onSelectAllColors: () => void;
  onClearColors: () => void;
  onChangeScope: (scope: StarFilterScope) => void;
  onToggleUnstarred: () => void;
}

const SCOPE_OPTIONS: { value: StarFilterScope; label: string }[] = [
  { value: "both", label: "Starred cards or questions" },
  { value: "cards", label: "Starred cards" },
  { value: "questions", label: "Starred questions" },
];

export function StarFilterDropdown({
  starColors,
  filter,
  onToggleColor,
  onSelectAllColors,
  onClearColors,
  onChangeScope,
  onToggleUnstarred,
}: StarFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = filter.colorIds.size > 0 || filter.unstarred;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          active
            ? "border-amber-400 bg-amber-400/10 text-amber-600 dark:text-amber-400"
            : "border-slate-200 text-text-secondary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-secondary-dark dark:hover:bg-slate-800"
        }`}
      >
        {filter.unstarred ? (
          <StarOff size={14} />
        ) : (
          <Star size={14} fill={active ? "currentColor" : "none"} />
        )}
        Star Filter
        {filter.colorIds.size > 0 && (
          <span className="rounded-full bg-amber-400/20 px-1.5 text-xs">
            {filter.colorIds.size}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-surface-light p-3 shadow-lg dark:border-slate-700 dark:bg-surface-dark">
          <ul>
            <li>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={filter.unstarred}
                  onChange={onToggleUnstarred}
                  className="shrink-0 cursor-pointer accent-action"
                />
                <StarOff
                  size={14}
                  className="shrink-0 text-text-secondary-light dark:text-text-secondary-dark"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                  Unstarred
                </span>
              </label>
            </li>
          </ul>

          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary-light dark:text-text-secondary-dark">
              Colors
            </span>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={onSelectAllColors}
                className="cursor-pointer text-action hover:underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={onClearColors}
                className="cursor-pointer text-text-secondary-light hover:underline dark:text-text-secondary-dark"
              >
                Clear
              </button>
            </div>
          </div>

          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {starColors.map((sc) => (
              <li key={sc.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={filter.colorIds.has(sc.id)}
                    onChange={() => onToggleColor(sc.id)}
                    className="shrink-0 cursor-pointer accent-action"
                  />
                  <Star
                    size={14}
                    color={sc.color}
                    fill={sc.color}
                    strokeWidth={1.5}
                    className="shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary-light dark:text-text-primary-dark">
                    {sc.name}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary-light dark:text-text-secondary-dark">
              Filter by
            </span>
            <ul className="mt-2 space-y-1">
              {SCOPE_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <input
                      type="radio"
                      name="star-filter-scope"
                      checked={filter.scope === opt.value}
                      onChange={() => onChangeScope(opt.value)}
                      className="shrink-0 cursor-pointer accent-action"
                    />
                    <span className="text-sm text-text-primary-light dark:text-text-primary-dark">
                      {opt.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
