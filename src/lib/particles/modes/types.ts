/**
 * Shared interface for all visual modes.
 *
 * Each mode implements a single function that handles particle spawning
 * for one frame. The mode receives everything it needs:
 *   - p5 instance for noise/random/lerp
 *   - particle pool for spawning
 *   - hand positions (smoothed, in pixel space)
 *   - hand speed data
 *   - delta time
 *   - current color palette
 *   - canvas dimensions
 *
 * Modes do NOT handle rendering — the pool's draw() handles that
 * uniformly. Modes only control spawning behavior and can optionally
 * apply custom forces to existing particles.
 */

import type p5 from "p5";
import type { ParticlePool } from "@/lib/particles/particle-pool";
import type { SpeedData } from "@/lib/particles/hand-speed";
import type { Landmark } from "@/types/hand";

export interface ModeContext {
  p: p5;
  pool: ParticlePool;
  /** Smoothed fingertip positions in pixel space. Length = 5. */
  fingerPositions: { x: number; y: number }[];
  /** All 21 landmarks for this hand (normalized 0–1). */
  landmarks: Landmark[];
  speedData: SpeedData;
  dt: number;
  elapsedTime: number;
  /** Current palette colors. Length = 5, one per finger. */
  colors: [number, number, number][];
  canvasWidth: number;
  canvasHeight: number;
}

export type ModeFn = (ctx: ModeContext) => void;

export type VisualMode = "trails" | "forceField" | "symmetry" | "freeDraw";

export const MODE_LABELS: Record<VisualMode, string> = {
  trails: "Trails",
  forceField: "Force Field",
  symmetry: "Symmetry",
  freeDraw: "Free Draw",
};

export const MODE_ORDER: VisualMode[] = [
  "trails",
  "forceField",
  "symmetry",
  "freeDraw",
];