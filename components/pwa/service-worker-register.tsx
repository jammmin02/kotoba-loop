"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js (static-asset caching only, see that file). Skipped in
 * dev — `next dev`'s HMR and rebuild-per-request model don't mix with a cache-first
 * service worker, so `next start`/production is the only place this runs.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  return null;
}
