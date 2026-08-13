"use client";

/**
 * useHandTracking — manages the full webcam → MediaPipe → landmarks pipeline.
 *
 * What this hook does:
 *   1. Requests webcam permission and opens a video stream
 *   2. Initializes the HandTracker (loads MediaPipe model)
 *   3. Runs detection in a requestAnimationFrame loop
 *   4. Stores the latest HandTrackingResult in a ref (not state!)
 *
 * Why a ref instead of state?
 *   Detection runs at 15–20fps. If we stored results in React state,
 *   we'd trigger 15–20 React re-renders per second for data that only
 *   the p5.js canvas (which reads from the ref directly) cares about.
 *   The ref gives us a stable, zero-cost bridge between the detection
 *   loop and the render loop.
 *
 * The hook DOES use state for:
 *   - `status`: "idle" | "requesting" | "loading" | "ready" | "error"
 *     This drives UI changes (loading spinners, error messages).
 *   - `error`: string | null — human-readable error message
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { HandTracker } from "@/lib/mediapipe/hand-tracker";
import type { HandTrackingResult } from "@/types/hand";

export type TrackingStatus =
  | "idle"
  | "requesting"
  | "loading"
  | "ready"
  | "error";

interface UseHandTrackingReturn {
  /** The video element ref — attach to a <video> element in your JSX. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Latest detection result — read this from your render loop. */
  landmarksRef: React.RefObject<HandTrackingResult | null>;
  /** Current pipeline status for UI feedback. */
  status: TrackingStatus;
  /** Error message if status is "error". */
  error: string | null;
  /** Call this to start the pipeline (webcam + MediaPipe). */
  start: () => Promise<void>;
  /** Call this to stop everything and release resources. */
  stop: () => void;
}

export function useHandTracking(): UseHandTrackingReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<HandTrackingResult | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  /**
   * The detection loop. Runs via requestAnimationFrame but MediaPipe
   * naturally throttles itself — it won't process faster than it can.
   * Typically lands at 15–25fps depending on device GPU.
   */
  const detectLoop = useCallback(() => {
    const video = videoRef.current;
    const tracker = trackerRef.current;

    if (!video || !tracker || !tracker.isReady) return;

    // Only detect when the video has actual frame data.
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const result = tracker.detect(video, performance.now());
      if (result) {
        landmarksRef.current = result;
      }
    }

    rafIdRef.current = requestAnimationFrame(detectLoop);
  }, []);

  const start = useCallback(async () => {
    try {
      setStatus("requesting");
      setError(null);

      // Step 1: Get webcam stream.
      // We request 640x480 — high enough for good landmark detection,
      // low enough to keep MediaPipe fast. The video isn't displayed
      // at full quality anyway (it's either a small PiP or hidden).
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;

      // Step 2: Attach stream to video element.
      const video = videoRef.current;
      if (!video) throw new Error("Video element not mounted");

      video.srcObject = stream;
      await video.play();

      // Step 3: Initialize MediaPipe (loads model from CDN).
      setStatus("loading");
      const tracker = new HandTracker();
      await tracker.initialize({ numHands: 2 });
      trackerRef.current = tracker;

      // Step 4: Start detection loop.
      setStatus("ready");
      rafIdRef.current = requestAnimationFrame(detectLoop);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access to use hand tracking."
          : err instanceof DOMException && err.name === "NotFoundError"
            ? "No camera found. Please connect a webcam."
            : err instanceof Error
              ? err.message
              : "An unknown error occurred";

      setError(message);
      setStatus("error");
    }
  }, [detectLoop]);

  const stop = useCallback(() => {
    // Cancel detection loop.
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Destroy MediaPipe tracker.
    trackerRef.current?.destroy();
    trackerRef.current = null;

    // Stop all webcam tracks (turns off the camera light).
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    // Clear video element.
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    landmarksRef.current = null;
    setStatus("idle");
    setError(null);
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { videoRef, landmarksRef, status, error, start, stop };
}