import { useState } from "react";
import { Check, Plus, Star, Trash2, X } from "lucide-react";
import type { StarColor } from "../types";

interface StarColorOverlayProps {
  open: boolean;
  onClose: () => void;
  starColors: StarColor[];
  activeStarColorId: string;
  onSelectActive: (id: string) => void;
  onCreate: (name: string, color: string) => void;
  onUpdate: (id: string, updates: { name?: string; color?: string }) => void;
  onDelete: (id: string) => void;
}

export function StarColorOverlay({
  open,
  onClose,
  starColors,
  activeStarColorId,
  onSelectActive,
  onCreate,
  onUpdate,
  onDelete,
}: StarColorOverlayProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#4f46e5");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-surface-light p-5 shadow-xl dark:border-slate-700 dark:bg-surface-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
            <Star size={18} className="text-action" />
            Star Colors
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1.5 text-text-secondary-light hover:bg-slate-100 dark:text-text-secondary-dark dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Pick the active color, or manage your color-to-name mappings. New
          stars use the active color.
        </p>

        <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {starColors.map((sc) => (
            <li
              key={sc.id}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                sc.id === activeStarColorId
                  ? "border-action bg-action/5"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectActive(sc.id)}
                title="Set as active color"
                className="flex shrink-0 cursor-pointer items-center justify-center"
              >
                <Star
                  size={20}
                  color={sc.color}
                  fill={sc.color}
                  strokeWidth={1.5}
                />
              </button>
              <input
                type="color"
                value={sc.color}
                onChange={(e) => onUpdate(sc.id, { color: e.target.value })}
                className="h-7 w-7 shrink-0 cursor-pointer rounded border border-slate-200 bg-transparent dark:border-slate-700"
                title="Change color"
              />
              <input
                type="text"
                value={sc.name}
                onChange={(e) => onUpdate(sc.id, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-text-primary-light hover:border-slate-200 focus:border-action focus:outline-none dark:text-text-primary-dark dark:hover:border-slate-700"
              />
              {sc.id === activeStarColorId && (
                <Check size={16} className="shrink-0 text-action" />
              )}
              {!sc.isDefault && (
                <button
                  type="button"
                  onClick={() => onDelete(sc.id)}
                  title="Delete color"
                  className="shrink-0 cursor-pointer rounded-full p-1 text-text-secondary-light hover:bg-error/10 hover:text-error dark:text-text-secondary-dark"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>

        <form
          className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-700"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) return;
            onCreate(name, newColor);
            setNewName("");
          }}
        >
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-9 w-9 shrink-0 cursor-pointer rounded border border-slate-200 bg-transparent dark:border-slate-700"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New color name..."
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 py-1.5 text-sm text-text-primary-light focus:border-action focus:outline-none dark:border-slate-700 dark:text-text-primary-dark"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-action px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={15} />
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
