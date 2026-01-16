"use client";

import { isTestMode } from "@/lib/test-mode";

export function TestModeBanner() {
  if (!isTestMode()) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 font-bold z-50 shadow-md text-xs sm:text-sm flex justify-center items-center gap-4">
      <span>⚠️ TEST MODE: 6 QNS | 5 MIN DURATION | 3 MIN LOBBY ⚠️</span>
      <a 
        href="/api/reset-session" 
        target="_blank" 
        rel="noopener noreferrer"
        className="underline text-white hover:text-red-200"
      >
        [Reset Session]
      </a>
    </div>
  );
}
