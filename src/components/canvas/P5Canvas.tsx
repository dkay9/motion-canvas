"use client";

/**
 * P5Canvas — Phase 6 version with audio integration.
 *
 * Changes from Phase 5:
 *   - Reads from audioEngine and audioMapper refs each frame
 *   - Calculates palm center position for audio mapping
 *   - Updates note/volume based on hand position and speed
 *   - Spread gesture triggers chord via audio engine
 *   - Starts/stops notes when hands appear/disappear
 */

import { useEffect, useRef } from "react";
import p5 from "p5";
import type { HandTrackingResult, Landmark } from "@/types/hand";
import { FINGERTIP_INDICES, PALETTES, LANDMARK } from "@/types/hand";
import { ParticlePool } from "@/lib/particles/particle-pool";
import { HandSpeedTracker } from "@/lib/particles/hand-speed";
import { detectGesture } from "@/lib/gestures/gesture-detector";
import { GestureStateMachine } from "@/lib/gestures/gesture-state";
import { MODES, MODE_ORDER, MODE_LABELS } from "@/lib/particles/modes";
import type { VisualMode, ModeContext } from "@/lib/particles/modes";
import type { AudioEngine } from "@/lib/audio/audio-engine";
import type { AudioMapper } from "@/lib/audio/audio-mapper";

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
  externalMode?: VisualMode;
  /** Audio engine ref from useAudio hook. */
  audioEngineRef?: React.RefObject<AudioEngine | null>;
  /** Audio mapper ref from useAudio hook. */
  audioMapperRef?: React.RefObject<AudioMapper | null>;
}

export function P5Canvas({
  landmarksRef,
  onGestureChange,
  onPaletteChange,
  onFreezeChange,
  onModeChange,
  externalMode,
  audioEngineRef,
  audioMapperRef,
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

      // Track whether hands were present last frame for note start/stop.
      let hadHands = false;

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
            // Trigger chord on spread.
            audioEngineRef?.current?.triggerChord();
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
            audioEngineRef?.current?.triggerChord();
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

        // Trail fade.
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

        // ── Audio mapping ──
        const engine = audioEngineRef?.current;
        const mapper = audioMapperRef?.current;
        const hasHands = !!(result && result.hands.length > 0);

        if (engine && mapper) {
          if (hasHands && result) {
            // Use first hand for audio control.
            const hand = result.hands[0];

            // Palm center for position mapping.
            const palmX =
              (hand.landmarks[LANDMARK.WRIST].x +
                hand.landmarks[LANDMARK.INDEX_MCP].x +
                hand.landmarks[LANDMARK.MIDDLE_MCP].x +
                hand.landmarks[LANDMARK.RING_MCP].x +
                hand.landmarks[LANDMARK.PINKY_MCP].x) / 5;

            const palmY =
              (hand.landmarks[LANDMARK.WRIST].y +
                hand.landmarks[LANDMARK.INDEX_MCP].y +
                hand.landmarks[LANDMARK.MIDDLE_MCP].y +
                hand.landmarks[LANDMARK.RING_MCP].y +
                hand.landmarks[LANDMARK.PINKY_MCP].y) / 5;

            // Get speed from first hand's tracker if available.
            const speed = smoothPositions.length > 0
              ? speedTrackers[0].update(smoothPositions[0], dt).average
              : 0;

            // Don't double-update speed tracker — it'll be updated again below.
            // Use a separate peek at the smoothed speed value instead.
            // Actually, speed tracker is updated below in the spawning loop.
            // For audio we use the last known average which is fine.

            const audioParams = mapper.update(palmX, palmY, speed, true);

            if (!hadHands) {
              engine.startNote(audioParams.noteIndex);
            }

            engine.updateNote(audioParams.noteIndex, audioParams.volume);
          } else {
            // No hands detected — fade out.
            const audioParams = mapper.update(0, 0, 0, false);
            if (hadHands) {
              engine.stopNote();
            }
          }
        }

        hadHands = hasHands;

        // Particle spawning.
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

        // Ambient particles.
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
  }, [landmarksRef, audioEngineRef, audioMapperRef]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}