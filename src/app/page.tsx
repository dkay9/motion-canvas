"use client";

/**
 * Phase 5 — Main page with mode selector.
 *
 * Added:
 *   - Mode selector bar at the bottom
 *   - Mode change flash indicator
 *   - Spread gesture hint updated to show "Mode"
 *   - External mode setting from UI buttons
 */

import { useState, useCallback } from "react";
import { useHandTracking, type TrackingStatus } from "@/hooks/useHandTracking";
import { P5Canvas } from "@/components/canvas/P5Canvas";
import { WebcamPreview } from "@/components/camera/WebcamPreview";
import { MODE_ORDER, MODE_LABELS } from "@/lib/particles/modes";
import type { VisualMode } from "@/lib/particles/modes";

export default function Home() {
  const { videoRef, landmarksRef, status, error, start, stop } =
    useHandTracking();

  const [currentGesture, setCurrentGesture] = useState("none");
  const [paletteName, setPaletteName] = useState("Neon");
  const [frozen, setFrozen] = useState(false);
  const [showPaletteFlash, setShowPaletteFlash] = useState(false);
  const [currentMode, setCurrentMode] = useState<VisualMode>("trails");
  const [modeLabel, setModeLabel] = useState("Trails");
  const [showModeFlash, setShowModeFlash] = useState(false);
  const [externalMode, setExternalMode] = useState<VisualMode | undefined>(
    undefined
  );

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

  const handleModeChange = useCallback((mode: VisualMode, label: string) => {
    setCurrentMode(mode);
    setModeLabel(label);
    setShowModeFlash(true);
    setTimeout(() => setShowModeFlash(false), 1200);
  }, []);

  const handleModeSelect = useCallback((mode: VisualMode) => {
    setExternalMode(mode);
    setCurrentMode(mode);
    setModeLabel(MODE_LABELS[mode]);
    setShowModeFlash(true);
    setTimeout(() => {
      setShowModeFlash(false);
      setExternalMode(undefined); // clear so subsequent gesture changes work
    }, 1200);
  }, []);

  return (
    <main className="relative flex-1 flex items-center justify-center overflow-hidden">
      <P5Canvas
        landmarksRef={landmarksRef}
        onGestureChange={handleGestureChange}
        onPaletteChange={handlePaletteChange}
        onFreezeChange={handleFreezeChange}
        onModeChange={handleModeChange}
        externalMode={externalMode}
      />

      {status === "ready" && (
        <WebcamPreview videoRef={videoRef} landmarksRef={landmarksRef} />
      )}

      {status === "idle" && <StartScreen onStart={start} />}

      {(status === "requesting" || status === "loading") && (
        <LoadingScreen status={status} />
      )}

      {status === "error" && (
        <ErrorScreen message={error} onRetry={start} />
      )}

      {status === "ready" && (
        <>
          <ReadyOverlay onStop={stop} />
          <GestureIndicator gesture={currentGesture} />

          {showPaletteFlash && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20
                            px-4 py-2 bg-white/10 backdrop-blur-md rounded-full
                            text-sm text-white/90 font-medium
                            animate-[fadeInOut_1.2s_ease-in-out]">
              {paletteName}
            </div>
          )}

          {showModeFlash && (
            <div className="absolute top-28 left-1/2 -translate-x-1/2 z-20
                            px-4 py-2 bg-white/10 backdrop-blur-md rounded-full
                            text-sm text-white/90 font-medium
                            animate-[fadeInOut_1.2s_ease-in-out]">
              {modeLabel}
            </div>
          )}

          {frozen && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                            z-20 px-6 py-3 bg-black/60 backdrop-blur-md rounded-xl
                            text-white/80 text-lg font-medium pointer-events-none">
              ❄ Frozen — make a fist to unfreeze
            </div>
          )}

          <GestureHints />

          <ModeSelector
            currentMode={currentMode}
            onSelect={handleModeSelect}
          />
        </>
      )}
    </main>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function ModeSelector({
  currentMode,
  onSelect,
}: {
  currentMode: VisualMode;
  onSelect: (mode: VisualMode) => void;
}) {
  return (
    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20
                    flex items-center gap-1 px-2 py-1.5 bg-black/50
                    backdrop-blur-md rounded-full">
      {MODE_ORDER.map((mode) => (
        <button
          key={mode}
          onClick={() => onSelect(mode)}
          className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer ${
            currentMode === mode
              ? "bg-white/20 text-white font-medium"
              : "text-white/50 hover:text-white/70 hover:bg-white/5"
          }`}
        >
          {MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}

function GestureIndicator({ gesture }: { gesture: string }) {
  if (gesture === "none") return null;

  const labels: Record<string, { icon: string; label: string }> = {
    pinch: { icon: "🤏", label: "Pinch — Color Cycle" },
    fist: { icon: "✊", label: "Fist — Freeze Toggle" },
    spread: { icon: "🖐", label: "Spread — Mode Cycle" },
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
      <span>🖐 Mode</span>
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