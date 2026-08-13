"use client";

/**
 * Phase 1 — Main page.
 *
 * Shows a permission prompt, then the webcam feed with landmark overlay.
 * This is the simplest version: prove hand tracking works before adding
 * particles, gestures, or audio.
 *
 * The page handles three states:
 *   idle      → "Start" button (user hasn't interacted yet)
 *   loading   → spinner + status text (webcam + model loading)
 *   ready     → full-screen webcam with landmark dots
 *   error     → error message with retry option
 */

import { useHandTracking, type TrackingStatus } from "@/hooks/useHandTracking";
import { WebcamView } from "@/components/camera/WebcamView";

export default function Home() {
  const { videoRef, landmarksRef, status, error, start, stop } =
    useHandTracking();

  return (
    <main className="relative flex-1 flex items-center justify-center overflow-hidden">
      {/* Webcam + landmarks — always mounted but video only plays when started. */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          status === "ready" ? "opacity-100" : "opacity-0"
        }`}
      >
        <WebcamView videoRef={videoRef} landmarksRef={landmarksRef} />
      </div>

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

      {/* Ready state: show landmark count indicator. */}
      {status === "ready" && (
        <ReadyOverlay landmarksRef={landmarksRef} onStop={stop} />
      )}
    </main>
  );
}

/** Landing prompt — explains what the app needs and why. */
function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center z-10">
      <div className="text-5xl">✋</div>
      <h1 className="text-3xl font-bold tracking-tight">Motion Canvas</h1>
      <p className="text-white/60 leading-relaxed">
        Create art with your hands. This app uses your webcam to track hand
        movements and turn them into visual art and music.
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

/** Loading indicator while webcam + model initialize. */
function LoadingScreen({ status }: { status: TrackingStatus }) {
  const message =
    status === "requesting"
      ? "Requesting camera access…"
      : "Loading hand tracking model…";

  return (
    <div className="flex flex-col items-center gap-4 z-10">
      {/* Simple CSS spinner */}
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      <p className="text-white/60 text-sm">{message}</p>
    </div>
  );
}

/** Error display with retry. */
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

/** Minimal overlay shown when tracking is active. */
function ReadyOverlay({
  landmarksRef,
  onStop,
}: {
  landmarksRef: React.RefObject<import("@/types/hand").HandTrackingResult | null>;
  onStop: () => void;
}) {
  return (
    <>
      {/* Top-left status badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5
                      bg-black/50 backdrop-blur-sm rounded-full text-xs text-white/70">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        Hand tracking active
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10
                      px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full
                      text-xs text-white/50">
        Move your hand in front of the camera — Phase 1: Landmark Visualization
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