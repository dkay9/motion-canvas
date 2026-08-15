"use client";

/**
 * P5Canvas — Phase 5 version with visual modes.
 *
 * Changes from Phase 4:
 *   - Mode system: each mode is a function called per-hand per-frame
 *   - Spread gesture now cycles modes instead of flash
 *   - Free draw mode skips Perlin noise forces (marks should stay put)
 *   - Force field mode applies its own gravity forces
 *   - currentMode tracked in stateRef, exposed via callback
 */

import { useEffect, useRef } from "react";
import p5 from "p5";
import type { HandTrackingResult, Landmark } from "@/types/hand";
import { FINGERTIP_INDICES, PALETTES } from "@/types/hand";
import { ParticlePool } from "@/lib/particles/particle-pool";
import { HandSpeedTracker } from "@/lib/particles/hand-speed";
import { detectGesture } from "@/lib/gestures/gesture-detector";
import { GestureStateMachine } from "@/lib/gestures/gesture-state";
import { MODES, MODE_ORDER, MODE_LABELS } from "@/lib/particles/modes";
import type { VisualMode, ModeContext } from "@/lib/particles/modes";

const AMBIENT_COLORS: [number, number, number][] = [
  [60, 60, 80],
  [50, 70, 60],
  [70, 50, 70],
  [60, 70, 50],
];

interface P5CanvasProps {
  landmarksRef: React.RefObject<HandTrackingResult | null>;
  onGestureChange?: (gesture: string) => void;
  onPaletteChange?: (name: string) => void;
  onFreezeChange?: (frozen: boolean) => void;
  onModeChange?: (mode: VisualMode, label: string) => void;
  /** Externally set mode (from UI selector). */
  externalMode?: VisualMode;
}

export function P5Canvas({
  landmarksRef,
  onGestureChange,
  onPaletteChange,
  onFreezeChange,
  onModeChange,
  externalMode,
}: P5CanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<p5 | null>(null);

  const stateRef = useRef({
    paletteIndex: 0,
    frozen: false,
    pointMode: false,
    modeIndex: 0,
    currentMode: "trails" as VisualMode,
  });

  const callbacksRef = useRef({
    onGestureChange, onPaletteChange, onFreezeChange, onModeChange,
  });
  callbacksRef.current = {
    onGestureChange, onPaletteChange, onFreezeChange, onModeChange,
  };

  // Handle external mode changes from UI.
  useEffect(() => {
    if (externalMode && externalMode !== stateRef.current.currentMode) {
      const idx = MODE_ORDER.indexOf(externalMode);
      if (idx !== -1) {
        stateRef.current.modeIndex = idx;
        stateRef.current.currentMode = externalMode;
      }
    }
  }, [externalMode]);

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      const pool = new ParticlePool(300);
      const speedTrackers: HandSpeedTracker[] = [
        new HandSpeedTracker(),
        new HandSpeedTracker(),
      ];

      function cycleMode(): void {
        const state = stateRef.current;
        state.modeIndex = (state.modeIndex + 1) % MODE_ORDER.length;
        state.currentMode = MODE_ORDER[state.modeIndex];
        callbacksRef.current.onModeChange?.(
          state.currentMode,
          MODE_LABELS[state.currentMode]
        );
      }

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
            cycleMode();
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
            cycleMode();
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

        // Trail fade — free draw uses much slower fade for persistent marks.
        p.blendMode(p.BLEND);
        p.noStroke();
        const fadeAlpha = state.currentMode === "freeDraw" ? 5 : 20;
        p.fill(8, 9, 13, fadeAlpha);
        p.rect(0, 0, p.width, p.height);

        const result = landmarksRef.current;
        const currentPalette = PALETTES[state.paletteIndex];

        // Gesture detection — always runs.
        if (result && result.hands.length > 0) {
          for (let h = 0; h < result.hands.length; h++) {
            const gestureResult = detectGesture(result.hands[h].landmarks);
            gestureStates[h].update(gestureResult);
          }
        }

        // Freeze check.
        if (state.frozen) {
          pool.draw(p);
          p.blendMode(p.BLEND);
          p.noStroke();
          p.fill(255, 255, 255, 15);
          p.rect(0, 0, p.width, p.height);
          return;
        }

        // Particle spawning via current mode.
        if (result && result.hands.length > 0) {
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

            // Point mode overrides current mode — precision drawing.
            if (state.pointMode) {
              const indexSmooth = smoothPositions[h][1];
              const [cr, cg, cb] = currentPalette.colors[1];
              for (let s = 0; s < 2; s++) {
                pool.spawn(
                  indexSmooth.x + (Math.random() - 0.5) * 3,
                  indexSmooth.y + (Math.random() - 0.5) * 3,
                  (Math.random() - 0.5) * 5,
                  (Math.random() - 0.5) * 5 - 5,
                  cr + (Math.random() - 0.5) * 15,
                  cg + (Math.random() - 0.5) * 15,
                  cb + (Math.random() - 0.5) * 15,
                  1.5 + Math.random(),
                  2 + Math.random()
                );
              }
              continue;
            }

            // Call current mode's spawn function.
            const modeCtx: ModeContext = {
              p,
              pool,
              fingerPositions: smoothPositions[h],
              landmarks: hand.landmarks,
              speedData,
              dt,
              elapsedTime,
              colors: currentPalette.colors,
              canvasWidth: p.width,
              canvasHeight: p.height,
            };

            MODES[state.currentMode](modeCtx);
          }
        }

        // Ambient particles (skip in free draw — it's about deliberate marks).
        if (state.currentMode !== "freeDraw" && Math.random() < 0.3) {
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

        // Perlin noise forces (skip in free draw — marks should stay put).
        if (state.currentMode !== "freeDraw") {
          pool.applyNoiseForces(p, elapsedTime);
        }

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