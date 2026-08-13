/**
 * MediaPipe hand landmark types.
 *
 * Each hand has 21 landmarks. Each landmark is a normalized (0–1)
 * coordinate where:
 *   x = horizontal (0=left, 1=right of the video frame)
 *   y = vertical   (0=top, 1=bottom)
 *   z = depth      (relative to wrist, negative = toward camera)
 *
 * When the webcam is mirrored, we flip x so the experience
 * feels like looking in a mirror.
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** Named indices for the 21 hand landmarks. */
export const LANDMARK = {
  WRIST: 0,

  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,

  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,

  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,

  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,

  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

/** Fingertip landmark indices — the ones we care about most for drawing. */
export const FINGERTIP_INDICES = [
  LANDMARK.THUMB_TIP,
  LANDMARK.INDEX_TIP,
  LANDMARK.MIDDLE_TIP,
  LANDMARK.RING_TIP,
  LANDMARK.PINKY_TIP,
] as const;

/** A single detected hand with its full landmark array. */
export interface HandData {
  landmarks: Landmark[];
  handedness: "Left" | "Right";
}

/** The result shape from our hand tracker per frame. */
export interface HandTrackingResult {
  hands: HandData[];
  timestamp: number;
}

/**
 * Gesture types detected from landmark distances.
 * Phase 4 adds the full gesture detector — these types are defined
 * here so the whole codebase shares them from the start.
 */
export type GestureType = "none" | "pinch" | "fist" | "spread" | "point";

export interface GestureResult {
  type: GestureType;
  confidence: number;
}