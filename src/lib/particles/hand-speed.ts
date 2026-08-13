/**
 * HandSpeedTracker — measures how fast each fingertip is moving.
 *
 * Speed is calculated as the distance between the current and previous
 * fingertip positions, divided by delta time. This gives us pixels-per-second
 * for each fingertip, which we use to control:
 *   - Particle spread (fast hand = wide spray)
 *   - Spawn rate (fast hand = more particles per frame)
 *   - Initial velocity magnitude (fast hand = faster particles)
 *
 * We also track an overall "hand speed" as the average across all
 * fingertips, smoothed with exponential moving average to avoid jitter.
 *
 * Positions are in pixel space (already multiplied by canvas dimensions),
 * not normalized 0–1 space.
 */

export interface SpeedData {
  /** Speed per fingertip in pixels/second. Length = 5 (one per fingertip). */
  perFinger: number[];
  /** Smoothed average speed across all fingertips. */
  average: number;
  /** Movement direction per fingertip (angle in radians). */
  directions: number[];
}

export class HandSpeedTracker {
  private prevPositions: { x: number; y: number }[] = [];
  private smoothedSpeed = 0;

  /**
   * Update with current fingertip positions and return speed data.
   *
   * @param positions — current fingertip positions in pixel space (length 5)
   * @param dt — delta time in seconds
   */
  update(
    positions: { x: number; y: number }[],
    dt: number
  ): SpeedData {
    // First frame — no previous data to compare against.
    if (this.prevPositions.length === 0 || dt <= 0) {
      this.prevPositions = positions.map((p) => ({ x: p.x, y: p.y }));
      return {
        perFinger: positions.map(() => 0),
        average: 0,
        directions: positions.map(() => 0),
      };
    }

    const perFinger: number[] = [];
    const directions: number[] = [];

    for (let i = 0; i < positions.length; i++) {
      const prev = this.prevPositions[i];
      if (!prev) {
        perFinger.push(0);
        directions.push(0);
        continue;
      }

      const dx = positions[i].x - prev.x;
      const dy = positions[i].y - prev.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Speed in pixels per second.
      perFinger.push(distance / dt);

      // Direction of movement (radians).
      directions.push(Math.atan2(dy, dx));
    }

    // Average speed across all fingertips.
    const rawAverage = perFinger.reduce((a, b) => a + b, 0) / perFinger.length;

    // Exponential moving average for smooth transitions.
    // 0.15 = responsive but not jittery. Lower = smoother but laggier.
    this.smoothedSpeed += (rawAverage - this.smoothedSpeed) * 0.15;

    // Save current positions for next frame's delta calculation.
    this.prevPositions = positions.map((p) => ({ x: p.x, y: p.y }));

    return {
      perFinger,
      average: this.smoothedSpeed,
      directions,
    };
  }

  /** Reset state when hand is lost. */
  reset(): void {
    this.prevPositions = [];
    this.smoothedSpeed = 0;
  }
}