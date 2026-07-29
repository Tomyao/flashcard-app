const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

/** Downscales an image to fit within MAX_DIMENSION and re-encodes it as
 * JPEG, so a full-resolution phone photo doesn't bloat IndexedDB or, once
 * synced, Blob storage/transfer. Flashcard photos (textbook pages, diagrams)
 * rarely need more than this. */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("Image encoding failed");
    return blob;
  } finally {
    bitmap.close();
  }
}

/** SHA-256 of the blob's bytes, as lowercase hex. Used as the photo's
 * content-addressed identity -- stable across devices, unlike a random id. */
export async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
