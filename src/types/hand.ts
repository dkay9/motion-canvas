/**
 * Hand tracking + gesture types — Phase 4 version.
 *
 * Added: ColorPalette type and palette definitions for gesture-driven
 * color cycling.
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

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

export const FINGERTIP_INDICES = [
  LANDMARK.THUMB_TIP,
  LANDMARK.INDEX_TIP,
  LANDMARK.MIDDLE_TIP,
  LANDMARK.RING_TIP,
  LANDMARK.PINKY_TIP,
] as const;

export interface HandData {
  landmarks: Landmark[];
  handedness: "Left" | "Right";
}

export interface HandTrackingResult {
  hands: HandData[];
  timestamp: number;
}

export type GestureType = "none" | "pinch" | "fist" | "spread" | "point";

export interface GestureResult {
  type: GestureType;
  confidence: number;
}

// ─── Color palettes ────────────────────────────────────────────────

/** A named color palette with 5 colors (one per fingertip). */
export interface ColorPalette {
  name: string;
  colors: [number, number, number][]; // 5 RGB tuples
}

/** Available palettes — cycled by pinch gesture. */
export const PALETTES: ColorPalette[] = [
  {
    name: "Neon",
    colors: [
      [255, 107, 107], // red
      [255, 217, 61],  // yellow
      [107, 203, 119], // green
      [77, 150, 255],  // blue
      [155, 89, 182],  // purple
    ],
  },
  {
    name: "Ocean",
    colors: [
      [0, 200, 200],   // cyan
      [0, 150, 255],   // azure
      [100, 220, 255], // sky
      [0, 100, 200],   // deep blue
      [150, 255, 220], // seafoam
    ],
  },
  {
    name: "Sunset",
    colors: [
      [255, 80, 50],   // red-orange
      [255, 160, 30],  // orange
      [255, 220, 80],  // gold
      [255, 100, 100], // salmon
      [200, 50, 80],   // crimson
    ],
  },
  {
    name: "Aurora",
    colors: [
      [0, 255, 150],   // electric green
      [100, 200, 255], // ice blue
      [200, 100, 255], // violet
      [0, 220, 200],   // teal
      [255, 150, 255], // pink
    ],
  },
  {
    name: "Ember",
    colors: [
      [255, 60, 20],   // fire red
      [255, 120, 0],   // orange
      [255, 200, 0],   // bright yellow
      [200, 40, 0],    // dark red
      [255, 80, 60],   // coral
    ],
  },
  {
    name: "Monochrome",
    colors: [
      [255, 255, 255], // white
      [200, 200, 200], // light gray
      [150, 150, 150], // mid gray
      [220, 220, 255], // cool white
      [255, 240, 220], // warm white
    ],
  },
];