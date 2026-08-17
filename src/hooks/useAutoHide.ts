"use client";

/**
 * useAutoHide — hides UI after N seconds of mouse/touch inactivity.
 *
 * Returns a boolean `visible` that goes false after the timeout.
 * Any mouse movement, touch, or key press resets the timer.
 *
 * The p5 canvas captures pointer events, so we listen on `window`
 * rather than a specific element.
 */

import { useState, useEffect, useRef, useCallback } from "react";

export function useAutoHide(timeoutMs: number = 3000): boolean {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    setVisible(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setVisible(false);
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    // Start the initial timer.
    resetTimer();

    const onActivity = () => resetTimer();

    window.addEventListener("mousemove", onActivity);
    window.addEventListener("touchstart", onActivity);
    window.addEventListener("keydown", onActivity);

    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("keydown", onActivity);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return visible;
}