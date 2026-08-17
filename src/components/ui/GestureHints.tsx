"use client";

/**
 * GestureHints — shows available gestures, auto-dismisses after first gesture.
 *
 * The hints appear when tracking starts and fade away once the user
 * performs their first gesture, indicating they understand the controls.
 * A small "?" button lets them bring hints back.
 */

import { useState, useEffect } from "react";

interface GestureHintsProps {
  /** Current detected gesture — used to auto-dismiss. */
  currentGesture: string;
}

const HINTS = [
  { icon: "🤏", label: "Pinch", action: "Change colors" },
  { icon: "✊", label: "Fist", action: "Freeze" },
  { icon: "☝️", label: "Point", action: "Precision draw" },
  { icon: "🖐", label: "Spread", action: "Switch mode" },
];

export function GestureHints({ currentGesture }: GestureHintsProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Auto-dismiss after first non-"none" gesture.
  useEffect(() => {
    if (currentGesture !== "none" && !dismissed) {
      // Delay dismissal so the user sees the gesture feedback first.
      const timer = setTimeout(() => setDismissed(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [currentGesture, dismissed]);

  const visible = (!dismissed || showHelp);

  return (
    <>
      {/* Hints bar */}
      <div
        className={`absolute top-14 left-1/2 -translate-x-1/2 z-20
                    flex items-center gap-3 px-4 py-2 bg-black/50
                    backdrop-blur-md rounded-full border border-white/5
                    transition-all duration-500
                    ${visible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 -translate-y-2 pointer-events-none"
                    }`}
      >
        {HINTS.map((hint) => (
          <div key={hint.label} className="flex items-center gap-1 text-[10px] text-white/50">
            <span>{hint.icon}</span>
            <span className="text-white/30">{hint.action}</span>
          </div>
        ))}
      </div>

      {/* Help button — only shows after hints are dismissed */}
      {dismissed && !showHelp && (
        <button
          onClick={() => setShowHelp(true)}
          onMouseLeave={() => setShowHelp(false)}
          className="absolute top-14 right-4 z-20 w-7 h-7 flex items-center
                     justify-center bg-black/40 backdrop-blur-md rounded-full
                     text-xs text-white/30 cursor-pointer hover:text-white/60
                     hover:bg-black/60 transition-all border border-white/5"
        >
          ?
        </button>
      )}

      {/* Close help on mouse leave */}
      {showHelp && (
        <button
          onClick={() => setShowHelp(false)}
          className="absolute top-14 right-4 z-20 w-7 h-7 flex items-center
                     justify-center bg-white/10 backdrop-blur-md rounded-full
                     text-xs text-white/60 cursor-pointer hover:bg-white/20
                     transition-all border border-white/5"
        >
          ✕
        </button>
      )}
    </>
  );
}