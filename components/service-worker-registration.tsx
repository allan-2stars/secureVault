"use client";

import { useEffect } from "react";

import { isDesktopRuntime } from "@/lib/vault/runtime";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // The service worker is only registered in production so local development
    // stays simple and does not get confusing cached behavior.
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    // The desktop runtime serves a local packaged frontend and should avoid
    // browser-style service worker caching around the local API boundary.
    if (isDesktopRuntime) {
      return;
    }

    // Some browsers or environments may not support service workers.
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // Register the app shell caching script.
    void navigator.serviceWorker.register("/sw.js");
  }, []);

  // This component exists only for the side effect above, so it renders nothing.
  return null;
}
