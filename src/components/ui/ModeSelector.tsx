"use client";

/**
 * ModeSelector — bottom bar for switching visual modes.
 * Highlights the active mode with a pill indicator.
 */

import { MODE_ORDER, MODE_LABELS } from "@/lib/particles/modes";
import type { VisualMode } from "@/lib/particles/modes";

interface ModeSelectorProps {
  currentMode: VisualMode;
  onSelect: (mode: VisualMode) => void;
}

/** Icons for each mode. */
const MODE_ICONS: Record<VisualMode, string> = {
  trails: "✨",
  forceField: "🌀",
  symmetry: "🦋",
  freeDraw: "🖌",
};

export function ModeSelector({ currentMode, onSelect }: ModeSelectorProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20
                    flex items-center gap-1 px-1.5 py-1 bg-black/50
                    backdrop-blur-md rounded-full border border-white/5">
      {MODE_ORDER.map((mode) => {
        const isActive = currentMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onSelect(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
                        text-xs transition-all duration-200 cursor-pointer
                        ${isActive
                          ? "bg-white/15 text-white font-medium shadow-sm shadow-white/5"
                          : "text-white/40 hover:text-white/70 hover:bg-white/5"
                        }`}
          >
            <span className="text-[11px]">{MODE_ICONS[mode]}</span>
            <span>{MODE_LABELS[mode]}</span>
          </button>
        );
      })}
    </div>
  );
}