"use client";

/**
 * P5Canvas — the main visual layer.
 *
 * How p5.js instance mode works with React:
 *
 *   Global mode (the p5 default) creates global functions like setup()
 *   and draw() on the window object. This conflicts with React because:
 *   - React may mount/unmount components multiple times (StrictMode, navigation)
 *   - Multiple p5 sketches would clobber each other's globals
 *   - There's no clean way to tear down global p5
 *
 *   Instance mode solves this: you pass a "sketch function" to `new p5()`.
 *   The sketch function receives a `p` object with all p5 methods scoped
 *   to that instance. You call `p.createCanvas()`, `p.background()`, etc.
 *   On unmount, `p5Instance.remove()` cleans up the canvas and event listeners.
 *
 * The lerp interpolation pattern:
 *
 *   MediaPipe gives us landmark positions at ~20fps. p5 draws at 60fps.
 *   If we just read the raw landmarks, positions would "teleport" every
 *   3 frames. Instead, we keep two copies:
 *     - `targetPositions`: the latest landmarks from MediaPipe (updates at ~20fps)
 *     - `smoothPositions`: what we actually draw (updates every frame via lerp)
 *
 *   Each frame: smoothPositions = lerp(smoothPositions, targetPositions, 0.3)
 *   This means smooth positions chase the target, moving 30% of the remaining
 *   distance each frame. The result is buttery-smooth movement even though
 *   the source data is choppy.
 */

import { useEffect, useRef } from "react";
import p5 from "p5";
import type { HandTrackingResult, Landmark } from "@/types/hand";
import { FINGERTIP_INDICES } from "@/types/hand";
import { ParticlePool } from "@/lib/particles/particle-pool";

/** Colors assigned to each fingertip for particle spawning. */
const FINGER_COLORS: [number, number, number][] = [
  [255, 107, 107], // thumb  — red
  [255, 217, 61],  // index  — yellow
  [107, 203, 119], // middle — green
  [77, 150, 255],  // ring   — blue
  [155, 89, 182],  // pinky  — purple
];

interface P5CanvasProps {
  /** Ref to latest hand tracking data — written by useHandTracking. */
  landmarksRef: React.RefObject<HandTrackingResult | null>;
}

export function P5Canvas({ landmarksRef }: P5CanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<p5 | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // The sketch function — this is where all p5 logic lives.
    // It receives `p` (the p5 instance) and defines setup + draw.
    const sketch = (p: p5) => {
      const pool = new ParticlePool(300);

      // Smoothed fingertip positions — lerp targets.
      // Outer array: one per hand (max 2).
      // Inner array: one {x, y} per fingertip (5 per hand).
      let smoothPositions: { x: number; y: number }[][] = [];

      let lastFrameTime = 0;

      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.style("display", "block");
        p.background(8, 9, 13); // match page background #08090d
        lastFrameTime = p.millis();
      };

      p.draw = () => {
        // Delta time in seconds.
        const now = p.millis();
        const dt = Math.min((now - lastFrameTime) / 1000, 0.1); // cap at 100ms to avoid spiral
        lastFrameTime = now;

        // Semi-transparent background for trail effect.
        // Instead of clearing to black each frame, we draw a translucent
        // black rect. This means previous frame's particles show through
        // slightly, creating natural motion trails.
        p.noStroke();
        p.fill(8, 9, 13, 30); // low alpha = longer trails
        p.rect(0, 0, p.width, p.height);

        // Read latest landmarks from the shared ref.
        const result = landmarksRef.current;

        if (result && result.hands.length > 0) {
          // Ensure smoothPositions has the right number of hands.
          while (smoothPositions.length < result.hands.length) {
            smoothPositions.push(
              FINGERTIP_INDICES.map(() => ({ x: p.width / 2, y: p.height / 2 }))
            );
          }
          // Trim if hands disappeared.
          if (smoothPositions.length > result.hands.length) {
            smoothPositions = smoothPositions.slice(0, result.hands.length);
          }

          for (let h = 0; h < result.hands.length; h++) {
            const hand = result.hands[h];

            for (let f = 0; f < FINGERTIP_INDICES.length; f++) {
              const lmIndex = FINGERTIP_INDICES[f];
              const lm: Landmark = hand.landmarks[lmIndex];

              // Target position in pixel coordinates.
              const targetX = lm.x * p.width;
              const targetY = lm.y * p.height;

              // Lerp smooth position toward target.
              // 0.3 = move 30% of remaining distance each frame.
              // Higher = snappier but less smooth. Lower = smoother but laggy.
              const smooth = smoothPositions[h][f];
              smooth.x = p.lerp(smooth.x, targetX, 0.3);
              smooth.y = p.lerp(smooth.y, targetY, 0.3);

              // Spawn a particle at the smoothed fingertip position.
              const [r, g, b] = FINGER_COLORS[f];

              // Random velocity for spread — gives particles life.
              const spread = 40;
              const vx = (Math.random() - 0.5) * spread;
              const vy = (Math.random() - 0.5) * spread - 20; // slight upward bias

              pool.spawn(
                smooth.x,
                smooth.y,
                vx,
                vy,
                r, g, b,
                Math.random() * 4 + 2, // size 2-6
                Math.random() * 1 + 1   // lifetime 1-2 seconds
              );
            }
          }
        }

        // Update and draw all particles.
        pool.update(dt);
        pool.draw(p);
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        // Re-fill background to avoid artifacts from the resize.
        p.background(8, 9, 13);
      };
    };

    // Create the p5 instance, mounted to our container div.
    p5Ref.current = new p5(sketch, containerRef.current);

    // Cleanup on unmount — removes the canvas and all event listeners.
    return () => {
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, [landmarksRef]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      // Prevent the container from affecting layout.
      style={{ zIndex: 0 }}
    />
  );
}