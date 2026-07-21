import { useEffect, useState } from "react";
import { Pencil, Plus, Star, Trash2, X } from "lucide-react";
import type { StarColor } from "../types";

interface StarColorOverlayProps {
  open: boolean;
  onClose: () => void;
  starColors: StarColor[];
  activeStarColorId: string;
  onSelectActive: (id: string) => void;
  onCreate: (name: string, color: string) => void;
  onUpdate: (id: string, updates: { name?: string; color?: string }) => void;
  onReorder: () => void;
  onDelete: (id: string) => void;
  /** Surfaces a message in the app-wide toast rather than inline here, so it
   * stays visible even if the user closes this overlay right after. */
  onRenameError: (message: string) => void;
}

interface StarColorNameFieldProps {
  starColor: StarColor;
  starColors: StarColor[];
  onRename: (id: string, name: string) => void;
  onDuplicate: () => void;
}

/** Displays the name as plain text -- so clicking it selects the color like
 * the rest of the row -- with a dedicated pencil icon to switch into an
 * editable field. Renames commit on blur/Enter rather than on every
 * keystroke, so a duplicate name can be caught and reverted instead of
 * being committed live as the user types. */
function StarColorNameField({
  starColor,
  starColors,
  onRename,
  onDuplicate,
}: StarColorNameFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(starColor.name);

  useEffect(() => {
    if (!editing) setDraft(starColor.name);
  }, [starColor.name, editing]);

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === starColor.name) {
      setDraft(starColor.name);
      return;
    }
    const isDuplicate = starColors.some(
      (c) => c.id !== starColor.id && c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      onDuplicate();
      setDraft(starColor.name);
      return;
    }
    onRename(starColor.id, trimmed);
  }

  if (editing) {
    return (
      <input
        type="text"
        value={draft}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setDraft(starColor.name);
            setEditing(false);
          }
        }}
        className="min-w-0 flex-1 rounded-md border border-action bg-transparent px-1.5 py-1 text-sm text-text-primary-light focus:outline-none dark:text-text-primary-dark"
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <span className="min-w-0 flex-1 truncate text-sm text-text-primary-light dark:text-text-primary-dark">
        {starColor.name}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        title="Rename"
        className="shrink-0 cursor-pointer rounded-full p-1 text-text-secondary-light hover:bg-slate-100 dark:text-text-secondary-dark dark:hover:bg-slate-800"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}

export function StarColorOverlay({
  open,
  onClose,
  starColors,
  activeStarColorId,
  onSelectActive,
  onCreate,
  onUpdate,
  onReorder,
  onDelete,
  onRenameError,
}: StarColorOverlayProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#4f46e5");
  const [nameError, setNameError] = useState<string | null>(null);

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
              <div
                className="relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center"
                title="Change color"
              >
                <Star
                  size={20}
                  color={sc.color}
                  fill={sc.color}
                  strokeWidth={1.5}
                />
                <input
                  type="color"
                  value={sc.color}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdate(sc.id, { color: e.target.value })}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelectActive(sc.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectActive(sc.id);
                  }
                }}
                title="Set as active color"
                className="min-w-0 flex-1 cursor-pointer"
              >
                <StarColorNameField
                  starColor={sc}
                  starColors={starColors}
                  onRename={(id, name) => {
                    onUpdate(id, { name });
                    onReorder();
                  }}
                  onDuplicate={() =>
                    onRenameError(
                      "Unable to rename. Another star color already has the same name.",
                    )
                  }
                />
              </div>
              {!sc.isDefault && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(sc.id);
                  }}
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
          className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) return;
            const isDuplicate = starColors.some(
              (c) => c.name.toLowerCase() === name.toLowerCase(),
            );
            if (isDuplicate) {
              setNameError("A star color with this name already exists.");
              return;
            }
            onCreate(name, newColor);
            setNewName("");
            setNameError(null);
          }}
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-9 w-9 shrink-0 cursor-pointer rounded border border-slate-200 bg-transparent dark:border-slate-700"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNameError(null);
              }}
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
          </div>
          {nameError && (
            <p className="mt-1.5 text-xs text-error">{nameError}</p>
          )}
        </form>
      </div>
    </div>
  );
}
