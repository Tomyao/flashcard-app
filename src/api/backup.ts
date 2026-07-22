import { apiFetch, ApiError } from "./client";
import type { BackupSnapshot } from "../types";

interface BackupResponse {
  data: BackupSnapshot;
  updatedAt: string;
}

/** Returns null if the user has no backup yet, rethrows any other failure. */
export async function getBackup(token: string): Promise<BackupResponse | null> {
  try {
    return await apiFetch<BackupResponse>("/api/backup", { token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function putBackup(
  token: string,
  snapshot: BackupSnapshot,
): Promise<{ updatedAt: string }> {
  return apiFetch<{ updatedAt: string }>("/api/backup", {
    method: "PUT",
    body: snapshot,
    token,
  });
}
