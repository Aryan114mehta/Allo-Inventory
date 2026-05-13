"use client";

import { useState, useEffect, useRef } from "react";

interface CountdownResult {
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

export function useCountdown(expiresAt: string | Date): CountdownResult {
  const expiryMs = new Date(expiresAt).getTime();

  const calculate = (): CountdownResult => {
    const remaining = Math.max(0, expiryMs - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    return {
      minutes: Math.floor(totalSeconds / 60),
      seconds: totalSeconds % 60,
      totalSeconds,
      isExpired: remaining === 0,
    };
  };

  const [state, setState] = useState<CountdownResult>(calculate);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.isExpired) return;

    intervalRef.current = setInterval(() => {
      const next = calculate();
      setState(next);
      if (next.isExpired && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  return state;
}
