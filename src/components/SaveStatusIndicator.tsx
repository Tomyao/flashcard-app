import { Check, Loader2, User, UserCheck } from "lucide-react";
import type { SaveIndicator } from "../hooks/useSaveStatusIndicator";

interface SaveStatusIndicatorProps {
  indicator: SaveIndicator;
}

const CONFIG: Record<
  SaveIndicator,
  { label: string; icon: React.ReactNode; className: string }
> = {
  loggedOut: {
    label: "Logged out",
    icon: <User size={14} />,
    className: "text-text-secondary-light dark:text-text-secondary-dark",
  },
  loggedIn: {
    label: "Logged in",
    icon: <UserCheck size={14} />,
    className: "text-text-secondary-light dark:text-text-secondary-dark",
  },
  saving: {
    label: "Saving…",
    icon: <Loader2 size={14} className="animate-spin" />,
    className: "text-text-secondary-light dark:text-text-secondary-dark",
  },
  saved: {
    label: "Saved!",
    icon: <Check size={14} />,
    className: "text-success",
  },
};

export function SaveStatusIndicator({ indicator }: SaveStatusIndicatorProps) {
  const { label, icon, className } = CONFIG[indicator];

  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${className}`}>
      {icon}
      {label}
    </span>
  );
}
