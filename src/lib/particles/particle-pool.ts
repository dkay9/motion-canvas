/**
 * ParticlePool — pre-allocates particles and recycles them.
 *
 * Why object pooling matters here:
 *   At 60fps, spawning 5 particles per frame (one per fingertip) = 300
 *   allocations per second. Each `new Particle()` creates a JS object
 *   on the heap. When particles die, they become garbage. The garbage
 *   collector eventually pauses the main thread to clean up — causing
 *   visible frame drops ("jank").
 *
 *   Object pooling avoids this entirely. We allocate all 300 particles
 *   once at startup. When we need a new particle, we find a dead one
 *   in the pool and reset it. When it dies, it stays in the array —
 *   just marked `alive = false`. Zero allocations, zero GC pressure.
 *
 * The pool uses a simple linear scan to find dead particles. With 300
 * particles this takes ~microseconds and isn't worth optimizing with
 * a free list until we hit thousands.
 */

import { Particle } from "./particle";
import type p5 from "p5";

const DEFAULT_POOL_SIZE = 300;

export class ParticlePool {
  readonly particles: Particle[];
  private nextScanIndex = 0;

  constructor(size: number = DEFAULT_POOL_SIZE) {
    // Pre-allocate everything upfront.
    this.particles = Array.from({ length: size }, () => new Particle());
  }

  /**
   * Find a dead particle and spawn it with the given properties.
   * Returns the particle if one was available, null if the pool is full.
   *
   * Uses a rotating scan index so we don't always start from index 0 —
   * this spreads the search evenly across the array.
   */
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

    // Pool exhausted — all 300 particles alive. Drop this spawn.
    return null;
  }

  /** Update all alive particles. */
  update(dt: number): void {
    for (const p of this.particles) {
      p.update(dt);
    }
  }

  /**
   * Draw all alive particles using p5's drawing API.
   * Called inside the p5 draw() function.
   */
  draw(p: p5): void {
    p.noStroke();
    for (const particle of this.particles) {
      if (!particle.alive) continue;

      p.fill(particle.r, particle.g, particle.b, particle.opacity * 255);
      p.circle(particle.x, particle.y, particle.size);
    }
  }

  /** How many particles are currently alive. Useful for debug display. */
  get activeCount(): number {
    let count = 0;
    for (const p of this.particles) {
      if (p.alive) count++;
    }
    return count;
  }
}