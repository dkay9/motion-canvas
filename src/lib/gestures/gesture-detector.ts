import type { Landmark, GestureResult, GestureType } from "@/types/hand";
import { LANDMARK } from "@/types/hand";

/** Euclidean distance between two landmarks in normalized space. */
function dist(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the center of the palm from the base knuckle landmarks.
 * Uses wrist + the 4 finger MCP joints for a stable center estimate.
 */
function palmCenter(landmarks: Landmark[]): Landmark {
  const indices = [
    LANDMARK.WRIST,
    LANDMARK.INDEX_MCP,
    LANDMARK.MIDDLE_MCP,
    LANDMARK.RING_MCP,
    LANDMARK.PINKY_MCP,
  ];
  let x = 0, y = 0, z = 0;
  for (const i of indices) {
    x += landmarks[i].x;
    y += landmarks[i].y;
    z += landmarks[i].z;
  }
  const n = indices.length;
  return { x: x / n, y: y / n, z: z / n };
}

/** Palm size estimate — distance from wrist to middle MCP. Used to normalize thresholds. */
function palmSize(landmarks: Landmark[]): number {
  return dist(landmarks[LANDMARK.WRIST], landmarks[LANDMARK.MIDDLE_MCP]);
}

// ─── Individual gesture detectors ─────────────────────────────────

/**
 * Pinch: thumb tip and index tip close together.
 * Threshold is relative to palm size for scale-independence.
 */
function detectPinch(landmarks: Landmark[]): number {
  const thumbIndex = dist(
    landmarks[LANDMARK.THUMB_TIP],
    landmarks[LANDMARK.INDEX_TIP]
  );
  const palm = palmSize(landmarks);
  if (palm < 0.01) return 0; // hand too small / bad detection

  const ratio = thumbIndex / palm;

  // ratio < 0.4 = strong pinch, 0.4–0.7 = weak pinch, > 0.7 = no pinch
  if (ratio < 0.4) return 1;
  if (ratio < 0.7) return 1 - (ratio - 0.4) / 0.3;
  return 0;
}

/**
 * Fist: all fingertips close to palm center.
 * We check that all 4 non-thumb fingertips are curled inward.
 */
function detectFist(landmarks: Landmark[]): number {
  const palm = palmCenter(landmarks);
  const pSize = palmSize(landmarks);
  if (pSize < 0.01) return 0;

  const fingertips = [
    LANDMARK.INDEX_TIP,
    LANDMARK.MIDDLE_TIP,
    LANDMARK.RING_TIP,
    LANDMARK.PINKY_TIP,
  ];

  // For each fingertip, check if it's close to the palm center.
  // "Close" means within 1.2x palm size.
  let curledCount = 0;
  let totalRatio = 0;

  for (const tip of fingertips) {
    const d = dist(landmarks[tip], palm);
    const ratio = d / pSize;
    totalRatio += ratio;
    if (ratio < 1.2) curledCount++;
  }

  // All 4 fingers must be curled.
  if (curledCount < 4) return 0;

  // Confidence based on how close the average ratio is to ideal (0.6).
  const avgRatio = totalRatio / fingertips.length;
  if (avgRatio < 0.6) return 1;
  if (avgRatio < 1.2) return 1 - (avgRatio - 0.6) / 0.6;
  return 0;
}

/**
 * Spread: all fingers extended and far apart from each other.
 * We check both extension (fingertip far from wrist) and separation
 * (adjacent fingertips far from each other).
 */
function detectSpread(landmarks: Landmark[]): number {
  const pSize = palmSize(landmarks);
  if (pSize < 0.01) return 0;

  const fingertips = [
    LANDMARK.THUMB_TIP,
    LANDMARK.INDEX_TIP,
    LANDMARK.MIDDLE_TIP,
    LANDMARK.RING_TIP,
    LANDMARK.PINKY_TIP,
  ];

  const wrist = landmarks[LANDMARK.WRIST];

  // Check extension: all fingertips should be far from wrist.
  let allExtended = true;
  for (const tip of fingertips) {
    const d = dist(landmarks[tip], wrist);
    if (d / pSize < 1.8) {
      allExtended = false;
      break;
    }
  }
  if (!allExtended) return 0;

  // Check separation: adjacent fingertips should be far apart.
  let totalSeparation = 0;
  for (let i = 0; i < fingertips.length - 1; i++) {
    totalSeparation += dist(landmarks[fingertips[i]], landmarks[fingertips[i + 1]]);
  }
  const avgSeparation = totalSeparation / (fingertips.length - 1);
  const sepRatio = avgSeparation / pSize;

  // sepRatio > 0.8 = well spread, 0.5–0.8 = weak, < 0.5 = not spread
  if (sepRatio > 0.8) return 1;
  if (sepRatio > 0.5) return (sepRatio - 0.5) / 0.3;
  return 0;
}

/**
 * Point: index finger extended, all others curled.
 * We check that index tip is far from wrist while other fingertips
 * are close to the palm.
 */
function detectPoint(landmarks: Landmark[]): number {
  const pSize = palmSize(landmarks);
  const palm = palmCenter(landmarks);
  if (pSize < 0.01) return 0;

  // Index must be extended.
  const indexDist = dist(landmarks[LANDMARK.INDEX_TIP], landmarks[LANDMARK.WRIST]);
  const indexExtended = indexDist / pSize > 2.0;
  if (!indexExtended) return 0;

  // Other fingers must be curled (close to palm center).
  const otherTips = [
    LANDMARK.MIDDLE_TIP,
    LANDMARK.RING_TIP,
    LANDMARK.PINKY_TIP,
  ];

  let curledCount = 0;
  for (const tip of otherTips) {
    const d = dist(landmarks[tip], palm);
    if (d / pSize < 1.3) curledCount++;
  }

  // At least 2 of 3 non-index fingers must be curled.
  // (Thumb is excluded — it's often ambiguous during pointing.)
  if (curledCount < 2) return 0;

  return curledCount === 3 ? 1 : 0.7;
}

// ─── Main detection function ──────────────────────────────────────

/**
 * Detect the current gesture from a hand's landmarks.
 * Returns the highest-priority matching gesture with its confidence.
 */
export function detectGesture(landmarks: Landmark[]): GestureResult {
  if (landmarks.length < 21) {
    return { type: "none", confidence: 0 };
  }

  // Check in priority order.
  const pinchConf = detectPinch(landmarks);
  if (pinchConf > 0.5) {
    return { type: "pinch", confidence: pinchConf };
  }

  const pointConf = detectPoint(landmarks);
  if (pointConf > 0.5) {
    return { type: "point", confidence: pointConf };
  }

  const fistConf = detectFist(landmarks);
  if (fistConf > 0.5) {
    return { type: "fist", confidence: fistConf };
  }

  const spreadConf = detectSpread(landmarks);
  if (spreadConf > 0.5) {
    return { type: "spread", confidence: spreadConf };
  }

  return { type: "none", confidence: 1 };
}