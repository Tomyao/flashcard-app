import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
  onSuccess: () => void;
}

type Mode = "signin" | "signup";

export function AuthModal({ open, onClose, onLogin, onRegister, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  function reset() {
    setMode("signin");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setSubmitting(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signin") {
        await onLogin(email, password);
      } else {
        await onRegister(email, password);
      }
      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-surface-light shadow-xl dark:border-slate-700 dark:bg-surface-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
            {mode === "signin" ? "Log In" : "Create Account"}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1.5 text-text-secondary-light hover:bg-slate-100 dark:text-text-secondary-dark dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 p-5">
          <div>
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm text-text-primary-light focus:border-action focus:outline-none dark:border-slate-700 dark:text-text-primary-dark"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm text-text-primary-light focus:border-action focus:outline-none dark:border-slate-700 dark:text-text-primary-dark"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm text-text-primary-light focus:border-action focus:outline-none dark:border-slate-700 dark:text-text-primary-dark"
              />
            </div>
          )}

          {error && <p className="text-xs text-error">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full cursor-pointer rounded-lg bg-action px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Please wait…"
              : mode === "signin"
                ? "Log In"
                : "Create Account"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode((prev) => (prev === "signin" ? "signup" : "signin"));
              setError(null);
            }}
            className="w-full cursor-pointer text-center text-xs font-medium text-text-secondary-light hover:text-action dark:text-text-secondary-dark"
          >
            {mode === "signin"
              ? "Need an account? Create one"
              : "Already have an account? Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
