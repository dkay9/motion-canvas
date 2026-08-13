"use client";

/**
 * WebcamPreview — small PiP webcam view with landmarks.
 *
 * Phase 2 change: the video element is created programmatically by
 * useHandTracking (not rendered in JSX). This component receives
 * videoRef which points to that hidden element, and draws its frames
 * onto a small canvas using drawImage().
 */

import { useEffect, useRef, useCallback } from "react";
import type { HandTrackingResult } from "@/types/hand";
import { FINGERTIP_INDICES } from "@/types/hand";

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const FINGER_COLORS = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#9b59b6"];

function getLandmarkColor(index: number): string {
  if (index <= 4) return FINGER_COLORS[0];
  if (index <= 8) return FINGER_COLORS[1];
  if (index <= 12) return FINGER_COLORS[2];
  if (index <= 16) return FINGER_COLORS[3];
  return FINGER_COLORS[4];
}

interface WebcamPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarksRef: React.RefObject<HandTrackingResult | null>;
}

export function WebcamPreview({ videoRef, landmarksRef }: WebcamPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !video || !ctx) {
      rafRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    if (canvas.width !== 240 || canvas.height !== 180) {
      canvas.width = 240;
      canvas.height = 180;
    }

    // Draw mirrored video frame.
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -240, 0, 240, 180);
    ctx.restore();

    // Draw landmarks.
    const result = landmarksRef.current;
    if (result && result.hands.length > 0) {
      const w = canvas.width;
      const h = canvas.height;

      for (const hand of result.hands) {
        const lm = hand.landmarks;

        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        for (const [a, b] of HAND_CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo(lm[a].x * w, lm[a].y * h);
          ctx.lineTo(lm[b].x * w, lm[b].y * h);
          ctx.stroke();
        }

        for (let i = 0; i < lm.length; i++) {
          const x = lm[i].x * w;
          const y = lm[i].y * h;
          const isFingertip = (FINGERTIP_INDICES as readonly number[]).includes(i);
          const radius = isFingertip ? 4 : 2;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = getLandmarkColor(i);
          ctx.fill();
        }
      }
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, [videoRef, landmarksRef]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawLoop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [drawLoop]);

  return (
    <div className="absolute bottom-20 left-4 z-20 rounded-lg overflow-hidden
                    border border-white/10 shadow-2xl shadow-black/50">
      <canvas
        ref={canvasRef}
        className="w-60 h-45 block"
      />
    </div>
  );
}