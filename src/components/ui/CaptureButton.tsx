"use client";

/**
 * CaptureButton — screenshots the p5 canvas.
 *
 * Phase 7: saves locally as a downloaded PNG.
 * Phase 8: will upload to Supabase gallery instead.
 *
 * We find the p5 canvas element in the DOM and call toDataURL() on it.
 * The button shows a brief flash animation on capture.
 */

import { useState, useCallback } from "react";

interface CaptureButtonProps {
  /** Optional callback when capture completes (for Phase 8 gallery upload). */
  onCapture?: (dataUrl: string) => void;
}

export function CaptureButton({ onCapture }: CaptureButtonProps) {
  const [flashing, setFlashing] = useState(false);
  const [captured, setCaptured] = useState(false);

  const handleCapture = useCallback(() => {
    // Find the p5 canvas — it's the first canvas child of the container div.
    const canvas = document.querySelector("canvas.p5Canvas") as HTMLCanvasElement
      ?? document.querySelector("main canvas") as HTMLCanvasElement;

    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");

    if (onCapture) {
      onCapture(dataUrl);
    } else {
      // Phase 7: download locally.
      const link = document.createElement("a");
      link.download = `motion-canvas-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }

    // Flash feedback.
    setFlashing(true);
    setCaptured(true);
    setTimeout(() => setFlashing(false), 200);
    setTimeout(() => setCaptured(false), 2000);
  }, [onCapture]);

  return (
    <>
      {/* Screen flash effect. */}
      {flashing && (
        <div className="fixed inset-0 z-50 bg-white/30 pointer-events-none
                        animate-[flashOut_0.2s_ease-out_forwards]" />
      )}

      <button
        onClick={handleCapture}
        className="absolute bottom-6 right-6 z-20 flex items-center gap-2
                   px-4 py-2 bg-black/50 backdrop-blur-md rounded-full
                   text-xs cursor-pointer hover:bg-white/10 transition-all
                   border border-white/5 active:scale-95"
      >
        <span className="text-sm">📸</span>
        <span className="text-white/70">
          {captured ? "Saved!" : "Capture"}
        </span>
      </button>
    </>
  );
}