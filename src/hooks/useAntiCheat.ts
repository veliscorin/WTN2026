"use client";

import { useState, useEffect, useRef } from 'react';

interface UseAntiCheatProps {
  onDisqualify: () => void;
}

export const useAntiCheat = ({ onDisqualify }: UseAntiCheatProps) => {
  const [strikeCount, setStrikeCount] = useState(0);
  const strikeCountRef = useRef(0);
  const isTabActiveRef = useRef(true);

  useEffect(() => {
    const handleViolation = () => {
      if (isTabActiveRef.current) {
        isTabActiveRef.current = false;
        strikeCountRef.current += 1;
        setStrikeCount(strikeCountRef.current);

        if (strikeCountRef.current >= 3) {
          onDisqualify();
        }
      }
    };

    const handleReturn = () => {
      isTabActiveRef.current = true;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      } else {
        handleReturn();
      }
    };

    const handleBlur = () => {
      handleViolation();
    };

    const handleFocus = () => {
      handleReturn();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [onDisqualify]);

  return { strikeCount };
};
