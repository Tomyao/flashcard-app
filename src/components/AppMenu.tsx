import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogIn, LogOut, Save, Layers } from "lucide-react";

interface AppMenuProps {
  userEmail: string | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onSave: () => void;
  saveDisabled: boolean;
  saveLabel: string;
}

export function AppMenu({
  userEmail,
  onOpenAuthModal,
  onLogout,
  onSave,
  saveDisabled,
  saveLabel,
}: AppMenuProps) {
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex cursor-pointer items-center gap-2 rounded-lg py-1 pr-1.5 text-text-primary-light hover:bg-slate-100 dark:text-text-primary-dark dark:hover:bg-slate-800"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-action text-white">
          <Layers size={18} />
        </span>
        <span className="text-lg font-semibold">Flashcards</span>
        <ChevronDown
          size={14}
          className={`text-text-secondary-light transition-transform dark:text-text-secondary-dark ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-surface-light py-1 shadow-lg dark:border-slate-700 dark:bg-surface-dark"
        >
          {userEmail ? (
            <>
              <div className="truncate px-3 py-1.5 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
                {userEmail}
              </div>
              <MenuItem
                icon={<Save size={14} />}
                label={saveLabel}
                disabled={saveDisabled}
                onSelect={() => {
                  onSave();
                  setOpen(false);
                }}
              />
              <MenuItem
                icon={<LogOut size={14} />}
                label="Log Out"
                onSelect={() => {
                  onLogout();
                  setOpen(false);
                }}
              />
            </>
          ) : (
            <MenuItem
              icon={<LogIn size={14} />}
              label="Log In"
              onSelect={() => {
                onOpenAuthModal();
                setOpen(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  disabled,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      disabled={disabled}
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm font-medium text-text-primary-light hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-text-primary-dark dark:hover:bg-slate-800"
    >
      {icon}
      {label}
    </button>
  );
}
