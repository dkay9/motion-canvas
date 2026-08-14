/**
 * GestureStateMachine — debounced gesture tracking with event callbacks.
 *
 * The problem this solves:
 *   Raw gesture detection flickers. One frame detects "pinch", the next
 *   "none", the next "pinch" again. This is because landmark positions
 *   jitter slightly between frames, pushing distances across thresholds.
 *
 * The solution:
 *   Require N consecutive frames of the same gesture before committing
 *   to a state transition. This is called "debouncing" or "hysteresis."
 *
 *   Additionally, we track whether a gesture has been "consumed" — meaning
 *   its action has already fired. Pinch should cycle colors once per pinch,
 *   not continuously while holding the pinch. The gesture must return to
 *   "none" before it can trigger again.
 *
 * State diagram:
 *   IDLE → (N frames of gesture X) → ACTIVE(X) → (action fires, consumed=true)
 *        → (gesture changes or returns to none) → IDLE
 */

import type { GestureType, GestureResult } from "@/types/hand";

export interface GestureCallbacks {
  onPinch?: () => void;
  onFist?: () => void;
  onSpread?: () => void;
  onPoint?: () => void;
  /** Called whenever the committed gesture changes (including to "none"). */
  onGestureChange?: (gesture: GestureType) => void;
}

/** How many consecutive frames a gesture must be detected before triggering. */
const DEBOUNCE_FRAMES = 5;

/** How many consecutive "none" frames before releasing a gesture. */
const RELEASE_FRAMES = 3;

export class GestureStateMachine {
  /** The currently committed gesture (after debouncing). */
  private _currentGesture: GestureType = "none";

  /** The gesture candidate being evaluated. */
  private candidateGesture: GestureType = "none";

  /** How many consecutive frames the candidate has been seen. */
  private candidateCount = 0;

  /** Whether the current gesture's action has already fired. */
  private consumed = false;

  /** Callbacks for gesture events. */
  private callbacks: GestureCallbacks;

  constructor(callbacks: GestureCallbacks = {}) {
    this.callbacks = callbacks;
  }

  get currentGesture(): GestureType {
    return this._currentGesture;
  }

  /**
   * Feed a new detection result into the state machine.
   * Call this once per frame with the latest gesture detection.
   */
  update(detection: GestureResult): void {
    const detected = detection.type;

    if (detected === this.candidateGesture) {
      // Same gesture as candidate — increment counter.
      this.candidateCount++;
    } else {
      // Different gesture — reset candidate.
      this.candidateGesture = detected;
      this.candidateCount = 1;
    }

    // Check for state transition.
    if (this._currentGesture === "none") {
      // Currently idle — check if candidate should activate.
      if (
        this.candidateGesture !== "none" &&
        this.candidateCount >= DEBOUNCE_FRAMES
      ) {
        this.commitGesture(this.candidateGesture);
      }
    } else {
      // Currently in a gesture — check if we should release.
      if (
        this.candidateGesture !== this._currentGesture &&
        this.candidateCount >= RELEASE_FRAMES
      ) {
        // If the new candidate is "none", just release.
        // If it's a different gesture, release then potentially activate.
        this.releaseGesture();

        // If switching directly to a new gesture (not via "none"),
        // immediately commit if candidate has enough frames.
        if (
          this.candidateGesture !== "none" &&
          this.candidateCount >= DEBOUNCE_FRAMES
        ) {
          this.commitGesture(this.candidateGesture);
        }
      }
    }
  }

  private commitGesture(gesture: GestureType): void {
    this._currentGesture = gesture;
    this.consumed = false;
    this.callbacks.onGestureChange?.(gesture);

    // Fire the one-shot action callback.
    this.fireAction(gesture);
  }

  private releaseGesture(): void {
    this._currentGesture = "none";
    this.consumed = false;
    this.callbacks.onGestureChange?.("none");
  }

  private fireAction(gesture: GestureType): void {
    if (this.consumed) return;
    this.consumed = true;

    switch (gesture) {
      case "pinch":
        this.callbacks.onPinch?.();
        break;
      case "fist":
        this.callbacks.onFist?.();
        break;
      case "spread":
        this.callbacks.onSpread?.();
        break;
      case "point":
        this.callbacks.onPoint?.();
        break;
    }
  }

  /** Update callbacks (e.g. when React state changes). */
  setCallbacks(callbacks: GestureCallbacks): void {
    this.callbacks = callbacks;
  }
}