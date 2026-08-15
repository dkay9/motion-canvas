/**
 * Mode registry — maps mode names to their spawn functions.
 */

import type { ModeFn, VisualMode } from "./types";
import { trailsMode } from "./trails";
import { forceFieldMode } from "./force-field";
import { symmetryMode } from "./symmetry";
import { freeDrawMode } from "./free-draw";

export { type VisualMode, MODE_LABELS, MODE_ORDER } from "./types";
export type { ModeContext } from "./types";

export const MODES: Record<VisualMode, ModeFn> = {
  trails: trailsMode,
  forceField: forceFieldMode,
  symmetry: symmetryMode,
  freeDraw: freeDrawMode,
};