"use client";

/**
 * GestureIndicator — shows the currently active gesture with a subtle badge.
 */

interface GestureIndicatorProps {
  gesture: string;
}

const GESTURE_INFO: Record<string, { icon: string; label: string }> = {
  pinch: { icon: "🤏", label: "Color Cycle" },
  fist: { icon: "✊", label: "Freeze" },
  spread: { icon: "🖐", label: "Mode + Chord" },
  point: { icon: "☝️", label: "Precision" },
};

export function GestureIndicator({ gesture }: GestureIndicatorProps) {
  if (gesture === "none") return null;

  const info = GESTURE_INFO[gesture];
  if (!info) return null;

  return (
    <div className="absolute bottom-16 left-4 z-20 flex items-center gap-2
                    px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full
                    text-xs text-white/80 border border-white/5
                    animate-[fadeIn_0.15s_ease-out]">
      <span>{info.icon}</span>
      <span>{info.label}</span>
    </div>
  );
}