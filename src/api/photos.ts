import { upload } from "@vercel/blob/client";
import { apiFetch, API_BASE_URL } from "./client";

/** Uploads a photo blob to Vercel Blob under a content-addressed path
 * (`users/{userId}/{hash}.jpg`) that the server's `/api/photos/upload-token`
 * route validates before issuing a client token. Re-uploading the same
 * hash overwrites the same object rather than creating a duplicate. */
export async function uploadPhoto(
  token: string,
  userId: string,
  hash: string,
  blob: Blob,
): Promise<string> {
  const result = await upload(`users/${userId}/${hash}.jpg`, blob, {
    access: "public",
    handleUploadUrl: `${API_BASE_URL}/api/photos/upload-token`,
    headers: { Authorization: `Bearer ${token}` },
  });
  return result.url;
}

export function deletePhotoBlob(token: string, url: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/api/photos/delete", {
    method: "POST",
    body: { url },
    token,
  });
}
