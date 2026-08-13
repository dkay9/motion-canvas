/**
 * Particle — a single visual element with position, velocity, and lifetime.
 *
 * Phase 2 keeps this simple: particles spawn at fingertip positions,
 * drift with some initial velocity, fade over their lifetime, and die.
 * Phase 3 adds Perlin noise, acceleration, forces, and more physics.
 *
 * Every particle is pre-allocated in the pool and recycled — we never
 * `new Particle()` during the draw loop. The `alive` flag controls
 * whether update/draw should process this particle.
 *
 * All physics is delta-time based:
 *   position += velocity * dt
 * This means animation speed stays consistent whether the browser
 * runs at 30fps or 144fps. `dt` is seconds since last frame.
 */

export class Particle {
  // Position in pixel coordinates (not normalized).
  x = 0;
  y = 0;

  // Velocity in pixels per second.
  vx = 0;
  vy = 0;

  // Visual properties.
  r = 255;
  g = 255;
  b = 255;
  opacity = 1;
  size = 4;

  // Lifetime tracking.
  maxLifetime = 1; // seconds
  age = 0; // seconds elapsed since spawn

  // Pool management.
  alive = false;

  /**
   * Reset this particle for reuse. Called by the pool when recycling.
   * Sets all properties to the new spawn values and marks alive.
   */
  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    r: number,
    g: number,
    b: number,
    size: number,
    lifetime: number
  ): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.r = r;
    this.g = g;
    this.b = b;
    this.opacity = 1;
    this.size = size;
    this.maxLifetime = lifetime;
    this.age = 0;
    this.alive = true;
  }

  /**
   * Update physics and lifetime. Called once per frame.
   * @param dt — delta time in seconds (e.g. 0.016 for 60fps)
   */
  update(dt: number): void {
    if (!this.alive) return;

    // Move.
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Apply light damping so particles slow down naturally.
    const damping = Math.pow(0.97, dt * 60); // framerate-independent damping
    this.vx *= damping;
    this.vy *= damping;

    // Age and fade.
    this.age += dt;
    this.opacity = Math.max(0, 1 - this.age / this.maxLifetime);

    // Die when fully faded.
    if (this.age >= this.maxLifetime) {
      this.alive = false;
    }
  }
}