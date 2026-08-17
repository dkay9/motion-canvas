"use client";

/**
 * StatusBar — top bar with tracking status, sound toggle, and stop button.
 * Consolidates the scattered top-area controls into one clean row.
 */

interface StatusBarProps {
  audioReady: boolean;
  isMuted: boolean;
  onSoundToggle: () => void;
  onStop: () => void;
  paletteName: string;
}

export function StatusBar({
  audioReady,
  isMuted,
  onSoundToggle,
  onStop,
  paletteName,
}: StatusBarProps) {
  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
      {/* Left: tracking status + palette */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5
                        bg-black/50 backdrop-blur-md rounded-full text-xs text-white/70
                        border border-white/5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Tracking
        </div>
        <div className="px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full
                        text-xs text-white/50 border border-white/5">
          {paletteName}
        </div>
      </div>

      {/* Right: sound + stop */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSoundToggle}
          className="flex items-center gap-2 px-3 py-1.5 bg-black/50
                     backdrop-blur-md rounded-full text-xs cursor-pointer
                     hover:bg-white/10 transition-colors border border-white/5"
        >
          <span>{!audioReady || isMuted ? "🔇" : "🔊"}</span>
          <span className="text-white/70">
            {!audioReady ? "Sound" : isMuted ? "Muted" : "On"}
          </span>
        </button>

        <button
          onClick={onStop}
          className="px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full
                     text-xs text-white/70 cursor-pointer hover:bg-white/10
                     transition-colors border border-white/5"
        >
          ✕
        </button>
      </div>
    </div>
  );
}