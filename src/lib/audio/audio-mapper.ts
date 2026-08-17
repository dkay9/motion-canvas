/**
 * AudioMapper — translates hand tracking data into audio parameters.
 *
 * The mapping strategy:
 *
 * 1. NOTE SELECTION (which note plays):
 *    Uses a combination of hand x-position and y-position.
 *    x-position selects the base note in the scale.
 *    y-position shifts octaves — high hand = higher octave.
 *    Result is an index into the pentatonic scale (0–15).
 *
 * 2. VOLUME (how loud):
 *    Mapped from hand speed. Still hand = silent, fast = loud.
 *    Smoothed with exponential moving average to avoid jitter.
 *    This means you only hear sound when you're actually moving,
 *    which feels responsive and intentional.
 *
 * 3. CHORD TRIGGER:
 *    Spread gesture triggers a chord via callback.
 *    The AudioEngine cycles through chord voicings.
 *
 * All values are smoothed to prevent the jittery, unpleasant sound
 * that direct mapping would produce.
 */

export interface AudioParams {
  /** Index into the pentatonic scale (0–15). */
  noteIndex: number;
  /** Volume level 0–1. */
  volume: number;
  /** Whether a hand is detected (to start/stop notes). */
  handPresent: boolean;
}

export class AudioMapper {
  private smoothedVolume = 0;
  private smoothedNoteIndex = 0;

  /**
   * Map hand position and speed to audio parameters.
   *
   * @param xNorm — hand x position normalized 0–1 (left to right)
   * @param yNorm — hand y position normalized 0–1 (top to bottom)
   * @param speed — hand speed in pixels/second
   * @param handPresent — whether a hand is currently detected
   */
  update(
    xNorm: number,
    yNorm: number,
    speed: number,
    handPresent: boolean
  ): AudioParams {
    if (!handPresent) {
      // Fade out smoothly when hand disappears.
      this.smoothedVolume *= 0.9;
      return {
        noteIndex: Math.round(this.smoothedNoteIndex),
        volume: this.smoothedVolume,
        handPresent: false,
      };
    }

    // ── Note index ──
    // x-position maps to notes within an octave (0–4 in pentatonic).
    // y-position maps to octave selection.
    // Combined: 0–15 index across 3 octaves of pentatonic.
    const notesPerOctave = 5;
    const octave = Math.floor((1 - yNorm) * 3); // 0, 1, or 2 (inverted: top = high)
    const noteInOctave = Math.floor(xNorm * notesPerOctave);
    const rawNoteIndex = octave * notesPerOctave + noteInOctave;

    // Smooth note index to prevent rapid jumping.
    // Use a higher smoothing factor than volume — we want notes to
    // change deliberately, not on every tiny hand movement.
    this.smoothedNoteIndex +=
      (rawNoteIndex - this.smoothedNoteIndex) * 0.08;

    // ── Volume ──
    // Map speed to 0–1. Speeds below 30px/s are considered "still".
    // Speeds above 500px/s are "maximum volume".
    const speedNorm = Math.max(0, Math.min(1, (speed - 30) / 470));

    // Smooth volume changes.
    this.smoothedVolume += (speedNorm - this.smoothedVolume) * 0.12;

    return {
      noteIndex: Math.round(this.smoothedNoteIndex),
      volume: this.smoothedVolume,
      handPresent: true,
    };
  }

  /** Reset when tracking stops. */
  reset(): void {
    this.smoothedVolume = 0;
    this.smoothedNoteIndex = 0;
  }
}