"use client";

import { useEffect } from "react";

export function TitleUpdater() {
  useEffect(() => {
    const hostname = window.location.hostname;
    const baseTitle = "WTN 2026";
    
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      document.title = `(LOCAL) ${baseTitle}`;
    } else {
      // Clean up hostname for display (remove www., .com, etc if it gets too long, or just show it)
      // Displaying full hostname is usually safest for "at a glance" distinction
      document.title = `(${hostname.toUpperCase()}) ${baseTitle}`;
    }
  }, []);

  return null;
}
