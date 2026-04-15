"use client";

import { useEffect, useState } from "react";

const ONLINE_LABEL = "Online";
const OFFLINE_LABEL = "Offline";

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(window.navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="status-pill" aria-live="polite">
      <strong>Connection</strong>
      {isOnline ? ONLINE_LABEL : OFFLINE_LABEL}
    </div>
  );
}
