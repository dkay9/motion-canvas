/**
 * Trails mode — the default.
 *
 * Each fingertip spawns particles that drift, fade, and die.
 * Hand speed controls spread and spawn rate.
 * This is essentially the Phase 3/4 behavior extracted into a mode function.
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

export function trailsMode(ctx: ModeContext): void {
  const { pool, fingerPositions, speedData, colors } = ctx;

  const avgSpeed = Math.min(speedData.average, 800);
  const speedNorm = avgSpeed / 800;

  for (let f = 0; f < fingerPositions.length; f++) {
    const pos = fingerPositions[f];
    const fingerSpeed = Math.min(speedData.perFinger[f], 800);
    const fingerSpeedNorm = fingerSpeed / 800;
    const direction = speedData.directions[f];

    const spawnCount = Math.floor(1 + fingerSpeedNorm * 2);
    const spread = 10 + fingerSpeedNorm * 70;
    const baseSpeed = 20 + fingerSpeedNorm * 100;

    for (let s = 0; s < spawnCount; s++) {
      const [cr, cg, cb] = varyColor(...colors[f], 40);

      const offsetX = (Math.random() - 0.5) * spread;
      const offsetY = (Math.random() - 0.5) * spread;

      const randomAngle = Math.random() * Math.PI * 2;
      const vx =
        Math.cos(direction) * baseSpeed * 0.5 +
        Math.cos(randomAngle) * baseSpeed * 0.5;
      const vy =
        Math.sin(direction) * baseSpeed * 0.5 +
        Math.sin(randomAngle) * baseSpeed * 0.5 - 15;

      const size = 2 + Math.random() * 3 + fingerSpeedNorm * 3;
      const lifetime = 1.5 + Math.random() * 1.5 - speedNorm * 0.5;

      pool.spawn(
        pos.x + offsetX, pos.y + offsetY,
        vx, vy,
        cr, cg, cb,
        size, lifetime
      );
    }
  }
}