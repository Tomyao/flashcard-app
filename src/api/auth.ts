import { apiFetch } from "./client";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function register(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: { email, password },
  });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function logout(token: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST", token });
}

export function me(token: string): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>("/api/auth/me", { token });
}
