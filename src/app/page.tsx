"use client";

/**
 * Phase 2 — Main page.
 *
 * Composites three layers:
 *   1. P5Canvas (full-screen, z-0) — particles spawning at fingertips
 *   2. WebcamPreview (bottom-left corner, z-20) — small PiP with landmarks
 *   3. UI overlays (z-10) — status badges, controls
 *
 * The data flow:
 *   useHandTracking → writes to landmarksRef
 *   P5Canvas → reads landmarksRef at 60fps, spawns particles
 *   WebcamPreview → reads landmarksRef at 60fps, draws small landmark dots
 *
 * Both consumers read from the same ref independently.
 */

import { useHandTracking, type TrackingStatus } from "@/hooks/useHandTracking";
import { P5Canvas } from "@/components/canvas/P5Canvas";
import { WebcamPreview } from "@/components/camera/WebcamPreview";

export default function Home() {
  const { videoRef, landmarksRef, status, error, start, stop } =
    useHandTracking();

  return (
    <main className="relative flex-1 flex items-center justify-center overflow-hidden">
      {/* Layer 1: p5.js canvas — always mounted, draws when tracking is ready. */}
      <P5Canvas landmarksRef={landmarksRef} />

      {/* Layer 2: Webcam preview — only shown when tracking is active. */}
      {status === "ready" && (
        <WebcamPreview videoRef={videoRef} landmarksRef={landmarksRef} />
      )}

      {/* Idle state: start button. */}
      {status === "idle" && <StartScreen onStart={start} />}

      {/* Loading states. */}
      {(status === "requesting" || status === "loading") && (
        <LoadingScreen status={status} />
      )}

      {/* Error state. */}
      {status === "error" && (
        <ErrorScreen message={error} onRetry={start} />
      )}

      {/* Ready state: overlays. */}
      {status === "ready" && <ReadyOverlay onStop={stop} />}
    </main>
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
      {/* Top-left status badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5
                      bg-black/50 backdrop-blur-sm rounded-full text-xs text-white/70">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        Hand tracking active
      </div>

      {/* Bottom center hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10
                      px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full
                      text-xs text-white/50">
        Move your hand to create particle trails — Phase 2: p5.js Integration
      </div>

      {/* Stop button */}
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