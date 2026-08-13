/**
 * Particle — Phase 3 version with full physics and noise-driven drift.
 *
 * What changed from Phase 2:
 *   - Acceleration field: particles receive forces each frame (from Perlin noise)
 *   - Size decay: particles shrink as they age, not just fade
 *   - Velocity cap: prevents particles from accelerating forever
 *   - Noise offset: each particle samples from a different part of the noise
 *     field so they don't all drift identically
 *   - Hue variation: slight random color shift at spawn for richer visuals
 *
 * The noise-driven movement works like this:
 *   1. Each frame, we sample p5.noise() at the particle's position
 *   2. The noise value (0–1) maps to an angle (0–2π)
 *   3. We create a small force vector in that direction
 *   4. The force is added to acceleration, which is added to velocity
 *   5. Result: particles follow smooth, curving paths that feel organic
 */

export class Particle {
  // Position in pixel coordinates.
  x = 0;
  y = 0;

  // Velocity in pixels/second.
  vx = 0;
  vy = 0;

  // Acceleration — reset each frame, accumulated from forces.
  ax = 0;
  ay = 0;

  // Visual properties.
  r = 255;
  g = 255;
  b = 255;
  opacity = 1;
  size = 4;
  initialSize = 4;

  // Lifetime.
  maxLifetime = 1;
  age = 0;

  // Noise sampling offset — unique per particle so they don't cluster.
  noiseOffsetX = 0;
  noiseOffsetY = 0;

  // Pool management.
  alive = false;

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
    this.ax = 0;
    this.ay = 0;
    this.r = r;
    this.g = g;
    this.b = b;
    this.opacity = 1;
    this.size = size;
    this.initialSize = size;
    this.maxLifetime = lifetime;
    this.age = 0;
    this.alive = true;

    // Random noise offset so each particle follows a unique path
    // through the Perlin noise field.
    this.noiseOffsetX = Math.random() * 1000;
    this.noiseOffsetY = Math.random() * 1000;
  }

  /**
   * Apply a force to this particle (accumulated into acceleration).
   * Call this before update() each frame.
   */
  applyForce(fx: number, fy: number): void {
    this.ax += fx;
    this.ay += fy;
  }

  /**
   * Update physics and lifetime.
   * @param dt — delta time in seconds
   */
  update(dt: number): void {
    if (!this.alive) return;

    // Apply acceleration to velocity.
    this.vx += this.ax * dt;
    this.vy += this.ay * dt;

    // Reset acceleration for next frame's force accumulation.
    this.ax = 0;
    this.ay = 0;

    // Cap velocity to prevent runaway acceleration.
    const maxSpeed = 300; // pixels/second
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      this.vx *= scale;
      this.vy *= scale;
    }

    // Move.
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Framerate-independent damping.
    // pow(0.96, 60) ≈ 0.085 — particles lose ~91% of velocity per second.
    const damping = Math.pow(0.96, dt * 60);
    this.vx *= damping;
    this.vy *= damping;

    // Age.
    this.age += dt;
    const lifeRatio = this.age / this.maxLifetime;

    // Fade out: quick ramp up, slow fade out.
    // Using smoothstep-like curve for more pleasing visual.
    if (lifeRatio < 0.1) {
      // Fade in over first 10% of life.
      this.opacity = lifeRatio / 0.1;
    } else {
      // Fade out over remaining 90%.
      const fadeRatio = (lifeRatio - 0.1) / 0.9;
      this.opacity = 1 - fadeRatio * fadeRatio; // quadratic ease-out
    }

    // Shrink over lifetime.
    this.size = this.initialSize * (1 - lifeRatio * 0.6); // shrink to 40% of original

    // Die.
    if (this.age >= this.maxLifetime) {
      this.alive = false;
    }
  }
}