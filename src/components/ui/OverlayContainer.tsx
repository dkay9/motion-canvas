"use client";

/**
 * OverlayContainer — wraps all UI elements with auto-hide fade.
 *
 * When the user stops moving their mouse, all UI fades out so the
 * canvas has the user's full attention. Moving the mouse brings
 * everything back instantly.
 *
 * Uses CSS opacity + pointer-events for the fade so hidden UI
 * can't be accidentally clicked.
 */

import { useAutoHide } from "@/hooks/useAutoHide";

interface OverlayContainerProps {
  children: React.ReactNode;
  /** Whether the overlay system is active (only when tracking is ready). */
  active: boolean;
}

export function OverlayContainer({ children, active }: OverlayContainerProps) {
  const visible = useAutoHide(3000);

  // Always show if not in active tracking mode.
  const shouldShow = !active || visible;

  return (
    <div
      className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-500"
      style={{
        opacity: shouldShow ? 1 : 0,
      }}
    >
      {/* Re-enable pointer events on child containers that need interaction. */}
      <div className={shouldShow ? "pointer-events-auto" : "pointer-events-none"}>
        {children}
      </div>
    </div>
  );
}