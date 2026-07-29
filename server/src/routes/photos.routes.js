import { Router } from "express";
import { handleUpload } from "@vercel/blob/client";
import { del } from "@vercel/blob";
import { photoLimiter } from "../middleware/rateLimit.js";

const router = Router();

// Content-addressed: the client names the blob after the sha-256 hash of
// the (compressed) bytes, so re-uploading identical content from a second
// device just overwrites the same object instead of accumulating
// duplicates. Server can only validate this pathname, not rewrite it --
// the client picks it before calling upload().
const PATHNAME_PATTERN = /^users\/([^/]+)\/([a-f0-9]{64})\.jpg$/;

router.post("/upload-token", photoLimiter, async (req, res) => {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const match = PATHNAME_PATTERN.exec(pathname);
        if (!match || match[1] !== req.userId) {
          throw new Error("Invalid photo path");
        }
        return {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 8 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // No DB write needed here -- the resulting blob URL travels back
        // to the client via upload()'s return value and is persisted as
        // part of the card data itself on the next backup PUT. This
        // callback won't fire on localhost; use ngrok or similar to
        // exercise it locally.
      },
    });
    res.json(jsonResponse);
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Upload token request failed" });
  }
});

router.post("/delete", photoLimiter, async (req, res, next) => {
  try {
    const { url } = req.body ?? {};
    if (typeof url !== "string") {
      return res.status(400).json({ error: "Missing url" });
    }

    let pathname;
    try {
      pathname = new URL(url).pathname;
    } catch {
      return res.status(400).json({ error: "Malformed url" });
    }

    if (!pathname.startsWith(`/users/${req.userId}/`)) {
      return res.status(403).json({ error: "Not your photo" });
    }

    await del(url);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
