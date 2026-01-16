"use client";

import { isTestMode } from "@/lib/test-mode";
import { useEffect, useState } from "react";

export function TestModeBanner() {
  const [info, setInfo] = useState<{ duration: number; lobby: number } | null>(null);

  useEffect(() => {
    if (!isTestMode()) return;

    // Fetch session details using a default test school (sch_01)
    fetch('/api/session?schoolId=sch_01')
      .then(res => res.json())
      .then(data => {
        if (data.durationMinutes) {
          setInfo({
            duration: data.durationMinutes,
            lobby: data.entryWindowMinutes || 30 // Default to 30 if undefined
          });
        }
      })
      .catch(err => console.error("Failed to fetch test session info:", err));
  }, []);

  if (!isTestMode()) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 font-bold z-50 shadow-md text-xs sm:text-sm flex justify-center items-center gap-4">
      <span>
        ⚠️ TEST MODE: 6 QNS | {info ? `${info.duration} MIN DURATION` : '...'} | {info ? `${info.lobby} MIN LOBBY` : '...'} ⚠️
      </span>
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
