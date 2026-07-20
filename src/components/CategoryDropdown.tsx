import { useEffect, useRef, useState } from "react";
import { ChevronDown, Layers, X } from "lucide-react";
import type { Category } from "../types";

interface CategoryDropdownProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  onDeleteCategory: (id: string) => void;
}

export function CategoryDropdown({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onDeleteCategory,
}: CategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const selectedLabel =
    selectedCategoryId === "all"
      ? "All Categories"
      : (categories.find((c) => c.id === selectedCategoryId)?.name ?? "All Categories");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-text-primary-light hover:bg-slate-100 dark:border-slate-700 dark:text-text-primary-dark dark:hover:bg-slate-800"
      >
        <Layers
          size={14}
          className="text-text-secondary-light dark:text-text-secondary-dark"
        />
        {selectedLabel}
        <ChevronDown
          size={14}
          className={`text-text-secondary-light transition-transform dark:text-text-secondary-dark ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-surface-light py-1 shadow-lg dark:border-slate-700 dark:bg-surface-dark"
        >
          <DropdownItem
            label="All Categories"
            active={selectedCategoryId === "all"}
            onSelect={() => {
              onSelectCategory("all");
              setOpen(false);
            }}
          />
          {categories.map((cat) => (
            <DropdownItem
              key={cat.id}
              label={cat.name}
              active={selectedCategoryId === cat.id}
              onSelect={() => {
                onSelectCategory(cat.id);
                setOpen(false);
              }}
              onDelete={
                cat.isDefault
                  ? undefined
                  : () => {
                      onDeleteCategory(cat.id);
                      setOpen(false);
                    }
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  label,
  active,
  onSelect,
  onDelete,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      role="option"
      aria-selected={active}
      className={`group flex items-center gap-1 px-1.5 ${active ? "bg-action/10" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
    >
      <button
        type="button"
        onClick={onSelect}
        className={`flex-1 cursor-pointer truncate rounded-md px-2 py-1.5 text-left text-sm font-medium ${
          active
            ? "text-action"
            : "text-text-primary-light dark:text-text-primary-dark"
        }`}
      >
        {label}
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete category"
          className="shrink-0 cursor-pointer rounded-full p-1 text-text-secondary-light opacity-0 hover:bg-error/10 hover:text-error group-hover:opacity-100 dark:text-text-secondary-dark"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
