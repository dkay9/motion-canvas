"use client";

/**
 * Phase 4 — Main page with gesture indicators.
 *
 * Added:
 *   - Gesture state display (bottom-left, above webcam preview)
 *   - Palette name indicator (top center, flashes on change)
 *   - Freeze indicator (overlay when canvas is frozen)
 *   - Gesture hints (shows which gestures are available)
 */

import { useState, useCallback } from "react";
import { useHandTracking, type TrackingStatus } from "@/hooks/useHandTracking";
import { P5Canvas } from "@/components/canvas/P5Canvas";
import { WebcamPreview } from "@/components/camera/WebcamPreview";

export default function Home() {
  const { videoRef, landmarksRef, status, error, start, stop } =
    useHandTracking();

  const [currentGesture, setCurrentGesture] = useState("none");
  const [paletteName, setPaletteName] = useState("Neon");
  const [frozen, setFrozen] = useState(false);
  const [showPaletteFlash, setShowPaletteFlash] = useState(false);

  const handleGestureChange = useCallback((gesture: string) => {
    setCurrentGesture(gesture);
  }, []);

  const handlePaletteChange = useCallback((name: string) => {
    setPaletteName(name);
    setShowPaletteFlash(true);
    setTimeout(() => setShowPaletteFlash(false), 1200);
  }, []);

  const handleFreezeChange = useCallback((isFrozen: boolean) => {
    setFrozen(isFrozen);
  }, []);

  return (
    <main className="relative flex-1 flex items-center justify-center overflow-hidden">
      {/* Layer 1: p5.js canvas */}
      <P5Canvas
        landmarksRef={landmarksRef}
        onGestureChange={handleGestureChange}
        onPaletteChange={handlePaletteChange}
        onFreezeChange={handleFreezeChange}
      />

      {/* Layer 2: Webcam preview */}
      {status === "ready" && (
        <WebcamPreview videoRef={videoRef} landmarksRef={landmarksRef} />
      )}

      {/* Idle state */}
      {status === "idle" && <StartScreen onStart={start} />}

      {/* Loading states */}
      {(status === "requesting" || status === "loading") && (
        <LoadingScreen status={status} />
      )}

      {/* Error state */}
      {status === "error" && (
        <ErrorScreen message={error} onRetry={start} />
      )}

      {/* Ready state overlays */}
      {status === "ready" && (
        <>
          <ReadyOverlay onStop={stop} />

          {/* Gesture indicator */}
          <GestureIndicator gesture={currentGesture} />

          {/* Palette flash */}
          {showPaletteFlash && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20
                            px-4 py-2 bg-white/10 backdrop-blur-md rounded-full
                            text-sm text-white/90 font-medium
                            animate-[fadeInOut_1.2s_ease-in-out]">
              {paletteName}
            </div>
          )}

          {/* Freeze indicator */}
          {frozen && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                            z-20 px-6 py-3 bg-black/60 backdrop-blur-md rounded-xl
                            text-white/80 text-lg font-medium pointer-events-none">
              ❄ Frozen — make a fist to unfreeze
            </div>
          )}

          {/* Gesture hints */}
          <GestureHints />
        </>
      )}
    </main>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function GestureIndicator({ gesture }: { gesture: string }) {
  if (gesture === "none") return null;

  const labels: Record<string, { icon: string; label: string }> = {
    pinch: { icon: "🤏", label: "Pinch — Color Cycle" },
    fist: { icon: "✊", label: "Fist — Freeze Toggle" },
    spread: { icon: "🖐", label: "Spread" },
    point: { icon: "☝️", label: "Point — Precision Mode" },
  };

  const info = labels[gesture];
  if (!info) return null;

  return (
    <div className="absolute bottom-52 left-4 z-20 flex items-center gap-2
                    px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full
                    text-xs text-white/80">
      <span>{info.icon}</span>
      <span>{info.label}</span>
    </div>
  );
}

function GestureHints() {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10
                    flex items-center gap-4 px-4 py-2 bg-black/40
                    backdrop-blur-sm rounded-full text-[10px] text-white/40">
      <span>🤏 Color</span>
      <span>✊ Freeze</span>
      <span>☝️ Precision</span>
      <span>🖐 Flash</span>
    </div>
  );
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center z-10">
      <div className="text-5xl">✋</div>
      <h1 className="text-3xl font-bold tracking-tight">Motion Canvas</h1>
      <p className="text-white/60 leading-relaxed">
        Create art with your hands. This app uses your webcam to track hand
        movements and turn them into particle trails and visual art.
      </p>
      <p className="text-white/40 text-sm">
        Your camera feed stays on your device — nothing is uploaded.
      </p>
      <button
        onClick={onStart}
        className="mt-2 px-8 py-3 bg-white text-black font-semibold rounded-full
                   hover:bg-white/90 active:scale-95 transition-all cursor-pointer"
      >
        Enable Camera
      </button>
    </div>
  );
}

function LoadingScreen({ status }: { status: TrackingStatus }) {
  const message =
    status === "requesting"
      ? "Requesting camera access…"
      : "Loading hand tracking model…";

  return (
    <div className="flex flex-col items-center gap-4 z-10">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      <p className="text-white/60 text-sm">{message}</p>
    </div>
  );
}

function ErrorScreen({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 max-w-md text-center z-10">
      <div className="text-4xl">⚠️</div>
      <p className="text-red-400">{message || "Something went wrong"}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-white/10 border border-white/20 rounded-full
                   hover:bg-white/20 transition-colors text-sm cursor-pointer"
      >
        Try Again
      </button>
    </div>
  );
}

function ReadyOverlay({ onStop }: { onStop: () => void }) {
  return (
    <>
      <div className="absolute top-10 left-4 z-10 flex items-center gap-2 px-3 py-1.5
                      bg-black/50 backdrop-blur-sm rounded-full text-xs text-white/70">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        Hand tracking active
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10
                      px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full
                      text-xs text-white/50">
        Phase 4: Gesture Detection — try pinch, fist, point, or spread
      </div>

      <button
        onClick={onStop}
        className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-black/50
                   backdrop-blur-sm rounded-full text-xs text-white/70
                   hover:bg-black/70 transition-colors cursor-pointer"
      >
        Stop
      </button>
    </>
  );
}