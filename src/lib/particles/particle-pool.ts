/**
 * ParticlePool — Phase 3 version with Perlin noise forces.
 *
 * What changed:
 *   - draw() now renders with glow effects (shadow blur)
 *   - applyNoiseForces() samples Perlin noise to push particles
 *   - update() calls noise forces before physics update
 *   - Ambient particles: spawn random background particles for atmosphere
 *
 * The Perlin noise force field:
 *   We treat the canvas as a grid of invisible wind currents. At each
 *   particle's position, we sample noise(x * scale, y * scale, time)
 *   to get a value 0–1. This maps to an angle, giving us a force direction.
 *   The scale controls how "zoomed in" the noise is — smaller scale means
 *   larger, smoother swirls. The time offset makes the field evolve.
 *
 *   scale = 0.003 gives swirl patterns about 300px across.
 *   force magnitude = 50 gives gentle drift without overpowering velocity.
 */

import { Particle } from "./particle";
import type p5 from "p5";

const DEFAULT_POOL_SIZE = 300;

export class ParticlePool {
  readonly particles: Particle[];
  private nextScanIndex = 0;

  constructor(size: number = DEFAULT_POOL_SIZE) {
    this.particles = Array.from({ length: size }, () => new Particle());
  }

  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    r: number,
    g: number,
    b: number,
    size?: number,
    lifetime?: number
  ): Particle | null {
    const len = this.particles.length;

    for (let i = 0; i < len; i++) {
      const index = (this.nextScanIndex + i) % len;
      const p = this.particles[index];

      if (!p.alive) {
        p.spawn(x, y, vx, vy, r, g, b, size ?? 4, lifetime ?? 1.5);
        this.nextScanIndex = (index + 1) % len;
        return p;
      }
    }

    return null;
  }

  /**
   * Apply Perlin noise forces to all alive particles.
   * Must be called before update() each frame so forces are accumulated
   * before physics integration.
   *
   * @param p — the p5 instance (for noise() function)
   * @param time — elapsed time in seconds (for evolving noise field)
   */
  applyNoiseForces(p: p5, time: number): void {
    // Noise field parameters.
    const noiseScale = 0.003; // smaller = larger swirls
    const forceMagnitude = 50; // pixels/second² — gentle push

    for (const particle of this.particles) {
      if (!particle.alive) continue;

      // Sample noise at this particle's position + its unique offset.
      // The time component makes the field evolve smoothly.
      const noiseVal = p.noise(
        (particle.x + particle.noiseOffsetX) * noiseScale,
        (particle.y + particle.noiseOffsetY) * noiseScale,
        time * 0.3 // slow time evolution
      );

      // Map noise value to angle (0–1 → 0–2π).
      const angle = noiseVal * Math.PI * 4; // *4 instead of *2 for more variation

      // Create force vector.
      const fx = Math.cos(angle) * forceMagnitude;
      const fy = Math.sin(angle) * forceMagnitude;

      particle.applyForce(fx, fy);
    }
  }

  /** Update all alive particles. */
  update(dt: number): void {
    for (const p of this.particles) {
      p.update(dt);
    }
  }

  /**
   * Draw all alive particles with glow effects.
   *
   * Rendering strategy for beauty:
   *   1. Large soft glow circle (low opacity, big radius) — creates halo
   *   2. Bright core circle (higher opacity, actual size) — sharp center
   *   This two-pass approach gives particles a luminous, ethereal quality
   *   without expensive shader effects.
   */
  draw(p: p5): void {
    p.noStroke();
    // Use ADD blend mode for luminous, light-like particles.
    // When particles overlap, their light adds together instead of
    // painting over each other. This creates beautiful bright spots
    // where trails converge.
    p.blendMode(p.ADD);

    for (const particle of this.particles) {
      if (!particle.alive || particle.opacity <= 0.01) continue;

      const alpha = particle.opacity * 255;

      // Outer glow — large, soft, low opacity.
      p.fill(particle.r, particle.g, particle.b, alpha * 0.15);
      p.circle(particle.x, particle.y, particle.size * 4);

      // Core — bright and sharp.
      p.fill(particle.r, particle.g, particle.b, alpha * 0.8);
      p.circle(particle.x, particle.y, particle.size);

      // Hot center — near-white for intensity.
      p.fill(255, 255, 255, alpha * 0.3);
      p.circle(particle.x, particle.y, particle.size * 0.4);
    }

    // Reset blend mode so UI elements draw normally.
    p.blendMode(p.BLEND);
  }

  get activeCount(): number {
    let count = 0;
    for (const p of this.particles) {
      if (p.alive) count++;
    }
    return count;
  }
}