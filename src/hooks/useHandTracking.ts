"use client";

/**
 * useHandTracking — Phase 2 version.
 *
 * Key change from Phase 1: the video element is created programmatically,
 * not rendered in JSX. This solves the chicken-and-egg problem where
 * start() needs the video element before the "ready" UI (which contains
 * the video element) is rendered.
 *
 * The programmatic video element is hidden and never displayed directly.
 * WebcamPreview draws its frames onto a canvas using drawImage().
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
  /** Hidden video element for MediaPipe + WebcamPreview to read from. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Latest detection result — read from your render loop. */
  landmarksRef: React.RefObject<HandTrackingResult | null>;
  status: TrackingStatus;
  error: string | null;
  start: () => Promise<void>;
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

  const detectLoop = useCallback(() => {
    const video = videoRef.current;
    const tracker = trackerRef.current;

    if (!video || !tracker || !tracker.isReady) return;

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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;

      // Create a hidden video element programmatically.
      // This avoids depending on a JSX-rendered <video> that may
      // not exist yet when start() is called.
      const video = document.createElement("video");
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.muted = true; // property, not just attribute
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;

      setStatus("loading");
      const tracker = new HandTracker();
      await tracker.initialize({ numHands: 2 });
      trackerRef.current = tracker;

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
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    trackerRef.current?.destroy();
    trackerRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    // Clean up the programmatic video element.
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    landmarksRef.current = null;
    setStatus("idle");
    setError(null);
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { videoRef, landmarksRef, status, error, start, stop };
}