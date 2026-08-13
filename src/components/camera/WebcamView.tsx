"use client";

/**
 * WebcamView — the Phase 1 component.
 *
 * Renders:
 *   1. The webcam video feed (mirrored via CSS)
 *   2. A transparent canvas overlay at the same size
 *   3. Colored dots at each of the 21 hand landmarks
 *   4. Lines connecting landmarks to show hand skeleton
 *
 * The overlay canvas runs its own requestAnimationFrame loop,
 * reading from the shared landmarksRef. This is separate from
 * the MediaPipe detection loop — the overlay renders at display
 * refresh rate (60fps) while MediaPipe detects at 15–25fps.
 * We're just drawing the latest cached result each frame.
 */

import { useEffect, useRef, useCallback } from "react";
import type { HandTrackingResult } from "@/types/hand";
import { FINGERTIP_INDICES } from "@/types/hand";

/** MediaPipe hand skeleton connections (pairs of landmark indices). */
const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17],
];

/** Color per finger for landmark dots. */
const FINGER_COLORS = [
  "#ff6b6b", // thumb  — red
  "#ffd93d", // index  — yellow
  "#6bcb77", // middle — green
  "#4d96ff", // ring   — blue
  "#9b59b6", // pinky  — purple
];

/** Get color for a landmark index based on which finger it belongs to. */
function getLandmarkColor(index: number): string {
  if (index <= 4) return FINGER_COLORS[0];   // thumb
  if (index <= 8) return FINGER_COLORS[1];   // index
  if (index <= 12) return FINGER_COLORS[2];  // middle
  if (index <= 16) return FINGER_COLORS[3];  // ring
  return FINGER_COLORS[4];                    // pinky
}

interface WebcamViewProps {
  /** Ref to the video element managed by useHandTracking. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Ref to latest landmarks from useHandTracking. */
  landmarksRef: React.RefObject<HandTrackingResult | null>;
}

export function WebcamView({ videoRef, landmarksRef }: WebcamViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  /**
   * Draw loop — renders landmark dots and skeleton lines on the
   * overlay canvas. Runs independently at display refresh rate.
   */
  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !video || !ctx) {
      rafRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    // Match canvas size to video display size.
    const rect = video.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    // Clear previous frame.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const result = landmarksRef.current;
    if (!result || result.hands.length === 0) {
      rafRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    const w = canvas.width;
    const h = canvas.height;

    for (const hand of result.hands) {
      const lm = hand.landmarks;

      // Draw skeleton lines first (behind the dots).
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(lm[a].x * w, lm[a].y * h);
        ctx.lineTo(lm[b].x * w, lm[b].y * h);
        ctx.stroke();
      }

      // Draw landmark dots.
      for (let i = 0; i < lm.length; i++) {
        const x = lm[i].x * w;
        const y = lm[i].y * h;
        const isFingertip = (FINGERTIP_INDICES as readonly number[]).includes(i);
        const radius = isFingertip ? 8 : 4;

        // Glow effect on fingertips.
        if (isFingertip) {
          ctx.shadowColor = getLandmarkColor(i);
          ctx.shadowBlur = 12;
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = getLandmarkColor(i);
        ctx.fill();

        // Reset shadow.
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, [videoRef, landmarksRef]);

  // Start/stop the draw loop.
  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawLoop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [drawLoop]);

  return (
    <div className="relative w-full h-full">
      {/* Video element — mirrored so it feels like a mirror. */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
        playsInline
        muted
      />
      {/* Overlay canvas for landmark dots — same size, on top. */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: "scaleX(-1)" }}
      />
    </div>
  );
}