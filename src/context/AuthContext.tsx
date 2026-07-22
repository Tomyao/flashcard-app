import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "../api/auth";
import type { AuthUser } from "../api/auth";

const TOKEN_KEY = "flashcards:authToken";

export interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  /** True while the stored token (if any) is being validated on startup. */
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setInitializing(false);
      return;
    }
    (async () => {
      try {
        const { user: fetchedUser } = await authApi.me(stored);
        setToken(stored);
        setUser(fetchedUser);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token: newToken, user: newUser } = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { token: newToken, user: newUser } = await authApi.register(email, password);
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    const previousToken = token;
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    if (previousToken) {
      void authApi.logout(previousToken).catch(() => {});
    }
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, initializing, login, register, logout }),
    [token, user, initializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
