"use client";

import { useEffect, useRef } from "react";
import p5 from "p5";
import type { HandTrackingResult, Landmark } from "@/types/hand";
import { FINGERTIP_INDICES, PALETTES, LANDMARK } from "@/types/hand";
import { ParticlePool } from "@/lib/particles/particle-pool";
import { HandSpeedTracker } from "@/lib/particles/hand-speed";
import { detectGesture } from "@/lib/gestures/gesture-detector";
import { GestureStateMachine } from "@/lib/gestures/gesture-state";

const AMBIENT_COLORS: [number, number, number][] = [
  [60, 60, 80],
  [50, 70, 60],
  [70, 50, 70],
  [60, 70, 50],
];

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
  onGestureChange?: (gesture: string) => void;
  onPaletteChange?: (name: string) => void;
  onFreezeChange?: (frozen: boolean) => void;
}

export function P5Canvas({
  landmarksRef,
  onGestureChange,
  onPaletteChange,
  onFreezeChange,
}: P5CanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<p5 | null>(null);

  const stateRef = useRef({
    paletteIndex: 0,
    frozen: false,
    pointMode: false,
    spreadFlash: 0,
  });

  const callbacksRef = useRef({ onGestureChange, onPaletteChange, onFreezeChange });
  callbacksRef.current = { onGestureChange, onPaletteChange, onFreezeChange };

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      const pool = new ParticlePool(300);
      const speedTrackers: HandSpeedTracker[] = [
        new HandSpeedTracker(),
        new HandSpeedTracker(),
      ];

      const gestureStates: GestureStateMachine[] = [
        new GestureStateMachine({
          onPinch: () => {
            const state = stateRef.current;
            state.paletteIndex = (state.paletteIndex + 1) % PALETTES.length;
            callbacksRef.current.onPaletteChange?.(
              PALETTES[state.paletteIndex].name
            );
          },
          onFist: () => {
            const state = stateRef.current;
            state.frozen = !state.frozen;
            callbacksRef.current.onFreezeChange?.(state.frozen);
          },
          onSpread: () => {
            stateRef.current.spreadFlash = 0.4;
          },
          onPoint: () => {
            stateRef.current.pointMode = true;
          },
          onGestureChange: (gesture) => {
            if (gesture !== "point") {
              stateRef.current.pointMode = false;
            }
            callbacksRef.current.onGestureChange?.(gesture);
          },
        }),
        new GestureStateMachine({
          onPinch: () => {
            const state = stateRef.current;
            state.paletteIndex = (state.paletteIndex + 1) % PALETTES.length;
            callbacksRef.current.onPaletteChange?.(
              PALETTES[state.paletteIndex].name
            );
          },
          onFist: () => {
            const state = stateRef.current;
            state.frozen = !state.frozen;
            callbacksRef.current.onFreezeChange?.(state.frozen);
          },
          onSpread: () => {
            stateRef.current.spreadFlash = 0.4;
          },
        }),
      ];

      let smoothPositions: { x: number; y: number }[][] = [];
      let lastFrameTime = 0;
      let elapsedTime = 0;

      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.style("display", "block");
        p.background(8, 9, 13);
        p.noiseSeed(42);
        p.noiseDetail(4, 0.5);
        lastFrameTime = p.millis();
      };

      p.draw = () => {
        const now = p.millis();
        const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
        lastFrameTime = now;
        elapsedTime += dt;

        const state = stateRef.current;

        // Spread flash effect.
        if (state.spreadFlash > 0) {
          state.spreadFlash -= dt;
          const flashAlpha = Math.max(0, state.spreadFlash / 0.4) * 40;
          p.blendMode(p.BLEND);
          p.noStroke();
          p.fill(255, 255, 255, flashAlpha);
          p.rect(0, 0, p.width, p.height);
        }

        // Trail fade.
        p.blendMode(p.BLEND);
        p.noStroke();
        p.fill(8, 9, 13, 20);
        p.rect(0, 0, p.width, p.height);

        const result = landmarksRef.current;
        const currentPalette = PALETTES[state.paletteIndex];

        // ────────────────────────────────────────────────────────
        // GESTURE DETECTION — runs ALWAYS, even when frozen.
        // This is separated from particle spawning so that
        // fist-to-unfreeze works while the canvas is frozen.
        // ────────────────────────────────────────────────────────
        if (result && result.hands.length > 0) {
          for (let h = 0; h < result.hands.length; h++) {
            const gestureResult = detectGesture(result.hands[h].landmarks);
            gestureStates[h].update(gestureResult);
          }
        }

        // ────────────────────────────────────────────────────────
        // FREEZE CHECK — if frozen, draw existing particles but
        // skip spawning, physics, and noise forces.
        // ────────────────────────────────────────────────────────
        if (state.frozen) {
          pool.draw(p);

          // Subtle frozen overlay.
          p.blendMode(p.BLEND);
          p.noStroke();
          p.fill(255, 255, 255, 15);
          p.rect(0, 0, p.width, p.height);
          return;
        }

        // ────────────────────────────────────────────────────────
        // PARTICLE SPAWNING — only runs when NOT frozen.
        // ────────────────────────────────────────────────────────
        if (result && result.hands.length > 0) {
          // Ensure smoothPositions arrays exist for each hand.
          while (smoothPositions.length < result.hands.length) {
            smoothPositions.push(
              FINGERTIP_INDICES.map(() => ({ x: p.width / 2, y: p.height / 2 }))
            );
          }
          if (smoothPositions.length > result.hands.length) {
            smoothPositions = smoothPositions.slice(0, result.hands.length);
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

            const speedData = speedTrackers[h].update(smoothPositions[h], dt);

            // Point mode: single fine line from index finger only.
            if (state.pointMode) {
              const indexSmooth = smoothPositions[h][1];
              const [cr, cg, cb] = varyColor(
                ...currentPalette.colors[1],
                15
              );

              for (let s = 0; s < 2; s++) {
                pool.spawn(
                  indexSmooth.x + (Math.random() - 0.5) * 3,
                  indexSmooth.y + (Math.random() - 0.5) * 3,
                  (Math.random() - 0.5) * 5,
                  (Math.random() - 0.5) * 5 - 5,
                  cr, cg, cb,
                  1.5 + Math.random(),
                  2 + Math.random()
                );
              }
              continue;
            }

            // Normal multi-finger spawning.
            const avgSpeed = Math.min(speedData.average, 800);
            const speedNorm = avgSpeed / 800;

            for (let f = 0; f < FINGERTIP_INDICES.length; f++) {
              const smooth = smoothPositions[h][f];
              const fingerSpeed = Math.min(speedData.perFinger[f], 800);
              const fingerSpeedNorm = fingerSpeed / 800;
              const direction = speedData.directions[f];

              const spawnCount = Math.floor(1 + fingerSpeedNorm * 2);
              const spread = 10 + fingerSpeedNorm * 70;
              const baseSpeed = 20 + fingerSpeedNorm * 100;

              for (let s = 0; s < spawnCount; s++) {
                const [cr, cg, cb] = varyColor(
                  ...currentPalette.colors[f],
                  40
                );

                const offsetX = (Math.random() - 0.5) * spread;
                const offsetY = (Math.random() - 0.5) * spread;

                const randomAngle = Math.random() * Math.PI * 2;
                const vx =
                  Math.cos(direction) * baseSpeed * 0.5 +
                  Math.cos(randomAngle) * baseSpeed * 0.5;
                const vy =
                  Math.sin(direction) * baseSpeed * 0.5 +
                  Math.sin(randomAngle) * baseSpeed * 0.5 -
                  15;

                const size = 2 + Math.random() * 3 + fingerSpeedNorm * 3;
                const lifetime = 1.5 + Math.random() * 1.5 - speedNorm * 0.5;

                pool.spawn(
                  smooth.x + offsetX,
                  smooth.y + offsetY,
                  vx, vy,
                  cr, cg, cb,
                  size,
                  lifetime
                );
              }
            }
          }
        }

        // Ambient particles.
        if (Math.random() < 0.3) {
          const color =
            AMBIENT_COLORS[Math.floor(Math.random() * AMBIENT_COLORS.length)];
          pool.spawn(
            Math.random() * p.width,
            Math.random() * p.height,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            color[0], color[1], color[2],
            Math.random() * 2 + 1,
            3 + Math.random() * 3
          );
        }

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