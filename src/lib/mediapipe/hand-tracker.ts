/**
 * HandTracker — wraps MediaPipe's HandLandmarker for our use case.
 *
 * How MediaPipe HandLandmarker works:
 *   1. You load a pre-trained .task model from CDN (or bundle it)
 *   2. You create a HandLandmarker instance with options (num hands, confidence, etc.)
 *   3. You feed it video frames via `detectForVideo(videoElement, timestamp)`
 *   4. It returns an object with `landmarks` (normalized 0–1) and `handedness`
 *
 * The model file is ~5MB (full) or ~3MB (lite). We load from Google's CDN
 * which is cached aggressively by browsers. The model initializes once,
 * then detection runs per-frame.
 *
 * We use VIDEO running mode (not LIVE_STREAM) so we control exactly when
 * detection happens — this lets us decouple detection rate from render rate.
 */

import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { HandData, HandTrackingResult, Landmark } from "@/types/hand";

/** CDN base for MediaPipe WASM + model files. */
const MEDIAPIPE_WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

export interface HandTrackerOptions {
  /** Max hands to detect (1 or 2). Default: 2. */
  numHands?: number;
  /** Minimum detection confidence 0–1. Default: 0.5. */
  minDetectionConfidence?: number;
  /** Minimum tracking confidence 0–1. Default: 0.5. */
  minTrackingConfidence?: number;
}

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private _isReady = false;

  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Initialize the HandLandmarker. This is async because it loads
   * the WASM runtime and the model file from CDN.
   *
   * Call this once, early in the app lifecycle. It takes 1-3 seconds
   * depending on network and device.
   */
  async initialize(options: HandTrackerOptions = {}): Promise<void> {
    const {
      numHands = 2,
      minDetectionConfidence = 0.5,
      minTrackingConfidence = 0.5,
    } = options;

    // FilesetResolver loads the WASM binary + glue code that MediaPipe
    // needs to run inference in the browser. This is separate from the
    // model file.
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);

    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        // "GPU" uses WebGL delegate for inference, much faster than CPU.
        // Falls back to CPU automatically if WebGL isn't available.
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands,
      minHandDetectionConfidence: minDetectionConfidence,
      minHandPresenceConfidence: minDetectionConfidence,
      minTrackingConfidence,
    });

    this._isReady = true;
  }

  /**
   * Run detection on a single video frame.
   *
   * Returns our cleaned-up HandTrackingResult with mirrored x-coordinates
   * (since the webcam feed is visually mirrored, the landmark x values
   * need to be flipped: `1 - x`).
   *
   * @param video - The HTMLVideoElement with the webcam stream
   * @param timestamp - Performance.now() or video.currentTime * 1000.
   *   MediaPipe uses this to track temporal consistency between frames.
   *   MUST be monotonically increasing — never send the same timestamp twice.
   */
  detect(video: HTMLVideoElement, timestamp: number): HandTrackingResult | null {
    if (!this.landmarker || !this._isReady) return null;

    const result: HandLandmarkerResult = this.landmarker.detectForVideo(
      video,
      timestamp
    );

    if (!result.landmarks || result.landmarks.length === 0) {
      return { hands: [], timestamp };
    }

    const hands: HandData[] = result.landmarks.map((handLandmarks, i) => {
      // Mirror x-coordinates since our webcam is CSS-mirrored.
      // Without this, moving your hand left would move landmarks right.
      const mirrored: Landmark[] = handLandmarks.map((lm) => ({
        x: 1 - lm.x,
        y: lm.y,
        z: lm.z,
      }));

      const handedness =
        result.handedness[i]?.[0]?.categoryName === "Left" ? "Left" : "Right";

      return { landmarks: mirrored, handedness };
    });

    return { hands, timestamp };
  }

  /** Clean up resources. Call on component unmount. */
  destroy(): void {
    this.landmarker?.close();
    this.landmarker = null;
    this._isReady = false;
  }
}