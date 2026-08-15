/**
 * Free Draw mode — direct painting on the canvas.
 *
 * Unlike other modes where particles drift and die quickly, free draw
 * creates persistent marks:
 *   - Very long particle lifetimes (8-12 seconds)
 *   - Minimal velocity (particles stay where they're placed)
 *   - No Perlin noise drift (marks should stay put)
 *   - Brush size controlled by hand y-position (high = small, low = large)
 *   - Color influenced by hand x-position (shifts through the palette)
 *
 * The result is more like finger painting than generative art —
 * deliberate, controllable marks that build up over time.
 *
 * Since particles have very long lifetimes, the pool fills up faster.
 * We spawn fewer particles per frame to compensate, relying on the
 * slow movement to create dense coverage.
 */

import type { ModeContext } from "./types";

export function freeDrawMode(ctx: ModeContext): void {
  const { pool, fingerPositions, speedData, colors, canvasWidth, canvasHeight } = ctx;

  for (let f = 0; f < fingerPositions.length; f++) {
    const pos = fingerPositions[f];
    const fingerSpeed = Math.min(speedData.perFinger[f], 800);

    // Only spawn when the finger is actually moving — prevents
    // blobs from forming when the hand is stationary.
    if (fingerSpeed < 15) continue;

    // Brush size from y-position: top of canvas = small (2px), bottom = large (12px).
    const yNorm = pos.y / canvasHeight;
    const brushSize = 2 + yNorm * 10;

    // Color from x-position: smoothly interpolate across the palette.
    // Map x position to a float index across the 5 palette colors.
    const xNorm = pos.x / canvasWidth;
    const colorIndex = xNorm * (colors.length - 1);
    const colorA = colors[Math.floor(colorIndex)];
    const colorB = colors[Math.min(Math.ceil(colorIndex), colors.length - 1)];
    const t = colorIndex - Math.floor(colorIndex);

    const cr = colorA[0] + (colorB[0] - colorA[0]) * t;
    const cg = colorA[1] + (colorB[1] - colorA[1]) * t;
    const cb = colorA[2] + (colorB[2] - colorA[2]) * t;

    // Slight random variation.
    const vr = Math.max(0, Math.min(255, cr + (Math.random() - 0.5) * 15));
    const vg = Math.max(0, Math.min(255, cg + (Math.random() - 0.5) * 15));
    const vb = Math.max(0, Math.min(255, cb + (Math.random() - 0.5) * 15));

    // Spawn with near-zero velocity — marks stay where placed.
    pool.spawn(
      pos.x + (Math.random() - 0.5) * brushSize * 0.5,
      pos.y + (Math.random() - 0.5) * brushSize * 0.5,
      (Math.random() - 0.5) * 2, // tiny drift
      (Math.random() - 0.5) * 2,
      vr, vg, vb,
      brushSize * (0.7 + Math.random() * 0.6),
      8 + Math.random() * 4 // very long lifetime
    );
  }
}