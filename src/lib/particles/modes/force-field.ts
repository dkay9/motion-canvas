/**
 * Force Field mode — palm acts as a gravity well.
 *
 * How it works:
 *   1. Ambient particles spawn randomly across the canvas each frame
 *   2. The palm center exerts a gravitational pull on all alive particles
 *   3. Open hand = attract (particles spiral inward)
 *   4. The closer a particle is to the palm, the stronger the force
 *   5. Particles that reach the palm center get a burst of energy outward
 *
 * This creates a beautiful vortex effect where particles orbit and
 * spiral around your hand. Moving the hand drags the vortex with it.
 *
 * Unlike trails mode, we don't spawn at fingertips — the interesting
 * visuals come from the ambient particles being influenced by the field.
 */

import type { ModeContext } from "./types";
import { LANDMARK } from "@/types/hand";

function varyColor(
  r: number, g: number, b: number, amount: number = 20
): [number, number, number] {
  return [
    Math.max(0, Math.min(255, r + (Math.random() - 0.5) * amount)),
    Math.max(0, Math.min(255, g + (Math.random() - 0.5) * amount)),
    Math.max(0, Math.min(255, b + (Math.random() - 0.5) * amount)),
  ];
}

export function forceFieldMode(ctx: ModeContext): void {
  const { p, pool, landmarks, colors, canvasWidth, canvasHeight } = ctx;

  // Calculate palm center in pixel space.
  const palmIndices = [
    LANDMARK.WRIST,
    LANDMARK.INDEX_MCP,
    LANDMARK.MIDDLE_MCP,
    LANDMARK.RING_MCP,
    LANDMARK.PINKY_MCP,
  ];

  let palmX = 0, palmY = 0;
  for (const idx of palmIndices) {
    palmX += landmarks[idx].x * canvasWidth;
    palmY += landmarks[idx].y * canvasHeight;
  }
  palmX /= palmIndices.length;
  palmY /= palmIndices.length;

  // Spawn ambient particles more aggressively in this mode.
  for (let i = 0; i < 3; i++) {
    const colorSet = colors[Math.floor(Math.random() * colors.length)];
    const [cr, cg, cb] = varyColor(...colorSet, 30);

    // Spawn around the edges and random positions.
    let sx: number, sy: number;
    if (Math.random() < 0.4) {
      // Edge spawning — particles drift in from canvas borders.
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0: sx = Math.random() * canvasWidth; sy = 0; break;
        case 1: sx = canvasWidth; sy = Math.random() * canvasHeight; break;
        case 2: sx = Math.random() * canvasWidth; sy = canvasHeight; break;
        default: sx = 0; sy = Math.random() * canvasHeight; break;
      }
    } else {
      sx = Math.random() * canvasWidth;
      sy = Math.random() * canvasHeight;
    }

    pool.spawn(
      sx, sy,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      cr, cg, cb,
      Math.random() * 3 + 1.5,
      4 + Math.random() * 3 // longer lifetime for orbiting
    );
  }

  // Apply gravitational force to all alive particles toward palm center.
  const gravityStrength = 180; // pixels/second² at reference distance
  const minDist = 30; // prevent infinite force at zero distance

  for (const particle of pool.particles) {
    if (!particle.alive) continue;

    const dx = palmX - particle.x;
    const dy = palmY - particle.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    if (dist < minDist) {
      // Too close — give a gentle outward push to prevent collapse.
      const pushAngle = Math.atan2(dy, dx) + Math.PI;
      particle.applyForce(
        Math.cos(pushAngle) * 40,
        Math.sin(pushAngle) * 40
      );
      continue;
    }

    // Gravity: force = strength / distance (inverse linear, not inverse square,
    // because inverse square is too extreme at close range for visual appeal).
    const force = gravityStrength / dist;

    // Normalize direction and apply force.
    const nx = dx / dist;
    const ny = dy / dist;

    // Add a tangential component for orbital motion instead of direct collapse.
    // This makes particles spiral rather than fall straight in.
    const tangentX = -ny; // perpendicular to the direction toward palm
    const tangentY = nx;
    const tangentStrength = force * 0.6;

    particle.applyForce(
      nx * force + tangentX * tangentStrength,
      ny * force + tangentY * tangentStrength
    );
  }
}