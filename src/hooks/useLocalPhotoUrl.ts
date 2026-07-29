import { useEffect, useRef, useState } from "react";
import * as db from "../db/db";

/** Resolves a photo's content hash to a displayable object URL, reading the
 * blob from IndexedDB. Revokes the previous URL before creating the next
 * one and on unmount, and guards against a stale lookup finishing after
 * `hash` has already changed again. */
export function useLocalPhotoUrl(hash: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!hash) {
      setUrl(null);
      return;
    }

    void db.getPhoto(hash).then((blob) => {
      if (cancelled) return;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const next = blob ? URL.createObjectURL(blob) : null;
      urlRef.current = next;
      setUrl(next);
    });

    return () => {
      cancelled = true;
    };
  }, [hash]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  return url;
}
