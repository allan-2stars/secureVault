"use client";

import { useEffect, useState } from "react";

const ONLINE_LABEL = "Online";
const OFFLINE_LABEL = "Offline";

export function ConnectionStatus() {
  // This local state stores whether the browser currently thinks it is online.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Read the initial browser connection state when the component loads.
    setIsOnline(window.navigator.onLine);

    // These handlers update the label whenever the browser goes online/offline.
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      // Cleanup avoids leaving old event listeners behind.
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    // aria-live helps screen readers announce connection changes.
    <div className="status-pill" aria-live="polite">
      <strong>Connection</strong>
      {isOnline ? ONLINE_LABEL : OFFLINE_LABEL}
    </div>
  );
}
