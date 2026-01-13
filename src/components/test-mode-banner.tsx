"use client";

import { isTestMode } from "@/lib/test-mode";

export function TestModeBanner() {
  if (!isTestMode()) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 font-bold z-50 shadow-md text-xs sm:text-sm">
      ⚠️ TEST MODE: 6 QNS | DB DURATION | 3 MIN ENTRY ⚠️
    </div>
  );
}
