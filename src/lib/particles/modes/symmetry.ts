/**
 * Symmetry mode — horizontal mirroring for mandala-like patterns.
 *
 * How it works:
 *   For every particle spawned at position (x, y), we also spawn a
 *   mirrored particle at (canvasWidth - x, y) with horizontally
 *   flipped velocity. This creates perfect bilateral symmetry.
 *
 * The visual effect is striking: drawing on one side of the canvas
 * automatically produces a mirror image. Combined with Perlin noise
 * (which is also roughly symmetric at large scales), the result
 * resembles kaleidoscope or mandala patterns.
 *
 * We use the same speed-responsive spawning as trails mode, just
 * with the mirror duplication added.
 */

import type { ModeContext } from "./types";

function varyColor(
  r: number, g: number, b: number, amount: number = 30
): [number, number, number] {
  return [
    Math.max(0, Math.min(255, r + (Math.random() - 0.5) * amount)),
    Math.max(0, Math.min(255, g + (Math.random() - 0.5) * amount)),
    Math.max(0, Math.min(255, b + (Math.random() - 0.5) * amount)),
  ];
}

export function symmetryMode(ctx: ModeContext): void {
  const { pool, fingerPositions, speedData, colors, canvasWidth } = ctx;

  const avgSpeed = Math.min(speedData.average, 800);
  const speedNorm = avgSpeed / 800;

  for (let f = 0; f < fingerPositions.length; f++) {
    const pos = fingerPositions[f];
    const fingerSpeed = Math.min(speedData.perFinger[f], 800);
    const fingerSpeedNorm = fingerSpeed / 800;
    const direction = speedData.directions[f];

    const spawnCount = Math.floor(1 + fingerSpeedNorm * 2);
    const spread = 8 + fingerSpeedNorm * 50;
    const baseSpeed = 15 + fingerSpeedNorm * 80;

    for (let s = 0; s < spawnCount; s++) {
      const [cr, cg, cb] = varyColor(...colors[f], 35);

      const offsetX = (Math.random() - 0.5) * spread;
      const offsetY = (Math.random() - 0.5) * spread;

      const randomAngle = Math.random() * Math.PI * 2;
      const vx =
        Math.cos(direction) * baseSpeed * 0.5 +
        Math.cos(randomAngle) * baseSpeed * 0.5;
      const vy =
        Math.sin(direction) * baseSpeed * 0.5 +
        Math.sin(randomAngle) * baseSpeed * 0.5 - 10;

      const size = 2 + Math.random() * 2.5 + fingerSpeedNorm * 2;
      const lifetime = 1.8 + Math.random() * 1.5 - speedNorm * 0.3;

      // Original particle.
      pool.spawn(
        pos.x + offsetX, pos.y + offsetY,
        vx, vy,
        cr, cg, cb,
        size, lifetime
      );

      // Mirrored particle — flip x position and x velocity.
      const mirrorX = canvasWidth - (pos.x + offsetX);
      pool.spawn(
        mirrorX, pos.y + offsetY,
        -vx, vy,
        cr, cg, cb,
        size, lifetime
      );
    }
  }
}