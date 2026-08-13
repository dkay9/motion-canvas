"use client";

import { useEffect, useRef } from "react";
import p5 from "p5";
import type { HandTrackingResult, Landmark } from "@/types/hand";
import { FINGERTIP_INDICES } from "@/types/hand";
import { ParticlePool } from "@/lib/particles/particle-pool";
import { HandSpeedTracker } from "@/lib/particles/hand-speed";

/** Base colors per fingertip — Phase 3 adds random variation around these. */
const FINGER_COLORS: [number, number, number][] = [
  [255, 107, 107], // thumb  — red
  [255, 217, 61],  // index  — yellow
  [107, 203, 119], // middle — green
  [77, 150, 255],  // ring   — blue
  [155, 89, 182],  // pinky  — purple
];

/** Subtle ambient particle colors — muted, low saturation. */
const AMBIENT_COLORS: [number, number, number][] = [
  [60, 60, 80],
  [50, 70, 60],
  [70, 50, 70],
  [60, 70, 50],
];

/**
 * Add random color variation to a base color.
 * Returns a new [r, g, b] with slight shifts for visual richness.
 */
function varyColor(
  r: number,
  g: number,
  b: number,
  amount: number = 30
): [number, number, number] {
  return [
    Math.max(0, Math.min(255, r + (Math.random() - 0.5) * amount)),
    Math.max(0, Math.min(255, g + (Math.random() - 0.5) * amount)),
    Math.max(0, Math.min(255, b + (Math.random() - 0.5) * amount)),
  ];
}

interface P5CanvasProps {
  landmarksRef: React.RefObject<HandTrackingResult | null>;
}

export function P5Canvas({ landmarksRef }: P5CanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<p5 | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      const pool = new ParticlePool(300);

      // One speed tracker per hand (max 2).
      const speedTrackers: HandSpeedTracker[] = [
        new HandSpeedTracker(),
        new HandSpeedTracker(),
      ];

      // Smoothed fingertip positions for lerp interpolation.
      let smoothPositions: { x: number; y: number }[][] = [];

      let lastFrameTime = 0;
      let elapsedTime = 0; // total time for noise evolution

      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.style("display", "block");
        p.background(8, 9, 13);
        p.noiseSeed(42); // consistent noise field across sessions
        p.noiseDetail(4, 0.5); // 4 octaves, 0.5 falloff — rich detail
        lastFrameTime = p.millis();
      };

      p.draw = () => {
        const now = p.millis();
        const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
        lastFrameTime = now;
        elapsedTime += dt;

        // Trail fade — lower alpha = longer trails.
        // Phase 3 uses a very low alpha for dreamy, persistent trails.
        p.blendMode(p.BLEND);
        p.noStroke();
        p.fill(8, 9, 13, 20);
        p.rect(0, 0, p.width, p.height);

        const result = landmarksRef.current;

        if (result && result.hands.length > 0) {
          // Ensure smoothPositions arrays exist for each hand.
          while (smoothPositions.length < result.hands.length) {
            smoothPositions.push(
              FINGERTIP_INDICES.map(() => ({ x: p.width / 2, y: p.height / 2 }))
            );
          }
          if (smoothPositions.length > result.hands.length) {
            smoothPositions = smoothPositions.slice(0, result.hands.length);
            // Reset speed trackers for disappeared hands.
            for (let i = result.hands.length; i < speedTrackers.length; i++) {
              speedTrackers[i].reset();
            }
          }

          for (let h = 0; h < result.hands.length; h++) {
            const hand = result.hands[h];

            // Lerp smoothing.
            for (let f = 0; f < FINGERTIP_INDICES.length; f++) {
              const lmIndex = FINGERTIP_INDICES[f];
              const lm: Landmark = hand.landmarks[lmIndex];

              const targetX = lm.x * p.width;
              const targetY = lm.y * p.height;

              const smooth = smoothPositions[h][f];
              smooth.x = p.lerp(smooth.x, targetX, 0.3);
              smooth.y = p.lerp(smooth.y, targetY, 0.3);
            }

            // Calculate hand speed from smoothed positions.
            const speedData = speedTrackers[h].update(smoothPositions[h], dt);

            // Speed-based spawn parameters.
            // Clamp speed to a usable range (0–800 px/s is typical hand movement).
            const avgSpeed = Math.min(speedData.average, 800);
            const speedNorm = avgSpeed / 800; // 0–1 normalized

            // Spawn particles at each fingertip.
            for (let f = 0; f < FINGERTIP_INDICES.length; f++) {
              const smooth = smoothPositions[h][f];
              const fingerSpeed = Math.min(speedData.perFinger[f], 800);
              const fingerSpeedNorm = fingerSpeed / 800;
              const direction = speedData.directions[f];

              // How many particles to spawn this frame for this finger.
              // Slow movement: 1 particle. Fast: up to 3.
              const spawnCount = Math.floor(1 + fingerSpeedNorm * 2);

              // Spread: how far from the fingertip particles can appear.
              // Slow = tight (10px), fast = wide (80px).
              const spread = 10 + fingerSpeedNorm * 70;

              // Initial velocity: particles inherit some hand momentum.
              // Plus random spread for visual interest.
              const baseSpeed = 20 + fingerSpeedNorm * 100;

              for (let s = 0; s < spawnCount; s++) {
                const [cr, cg, cb] = varyColor(...FINGER_COLORS[f], 40);

                // Offset spawn position by spread amount.
                const offsetX = (Math.random() - 0.5) * spread;
                const offsetY = (Math.random() - 0.5) * spread;

                // Velocity: partially in hand direction, partially random.
                const randomAngle = Math.random() * Math.PI * 2;
                const vx =
                  Math.cos(direction) * baseSpeed * 0.5 + // hand direction
                  Math.cos(randomAngle) * baseSpeed * 0.5; // random
                const vy =
                  Math.sin(direction) * baseSpeed * 0.5 +
                  Math.sin(randomAngle) * baseSpeed * 0.5 -
                  15; // slight upward drift

                // Size: larger when moving fast.
                const size = 2 + Math.random() * 3 + fingerSpeedNorm * 3;

                // Lifetime: slightly longer when moving slow (concentrated).
                const lifetime = 1.5 + Math.random() * 1.5 - speedNorm * 0.5;

                pool.spawn(
                  smooth.x + offsetX,
                  smooth.y + offsetY,
                  vx,
                  vy,
                  cr, cg, cb,
                  size,
                  lifetime
                );
              }
            }
          }
        }

        // Ambient particles — subtle background atmosphere.
        // Spawn a few random particles each frame regardless of hand presence.
        if (Math.random() < 0.3) {
          const color =
            AMBIENT_COLORS[Math.floor(Math.random() * AMBIENT_COLORS.length)];
          pool.spawn(
            Math.random() * p.width,
            Math.random() * p.height,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            color[0],
            color[1],
            color[2],
            Math.random() * 2 + 1,
            3 + Math.random() * 3 // long life, slow fade
          );
        }

        // Apply Perlin noise forces, then update physics, then draw.
        pool.applyNoiseForces(p, elapsedTime);
        pool.update(dt);
        pool.draw(p);
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        p.background(8, 9, 13);
      };
    };

    p5Ref.current = new p5(sketch, containerRef.current);

    return () => {
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, [landmarksRef]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}