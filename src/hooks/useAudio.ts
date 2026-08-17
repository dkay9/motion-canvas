"use client";

/**
 * useAudio — manages audio engine lifecycle in React.
 *
 * Audio has a specific initialization requirement: Tone.start() must
 * be called inside a user gesture handler. This hook provides:
 *   - initAudio() — call from a button click handler
 *   - toggleMute() — call from a UI toggle
 *   - audioEngine ref — for the p5 draw loop to call updateNote()
 *   - audioMapper ref — for translating hand data to audio params
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { AudioEngine } from "@/lib/audio/audio-engine";
import { AudioMapper } from "@/lib/audio/audio-mapper";

interface UseAudioReturn {
  /** Initialize audio (must be called from a click handler). */
  initAudio: () => Promise<void>;
  /** Toggle mute on/off. */
  toggleMute: () => void;
  /** Whether audio has been initialized. */
  isReady: boolean;
  /** Whether audio is currently muted. */
  isMuted: boolean;
  /** Direct ref to audio engine for the render loop. */
  engineRef: React.RefObject<AudioEngine | null>;
  /** Direct ref to audio mapper for the render loop. */
  mapperRef: React.RefObject<AudioMapper | null>;
}

export function useAudio(): UseAudioReturn {
  const engineRef = useRef<AudioEngine | null>(null);
  const mapperRef = useRef<AudioMapper | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const initAudio = useCallback(async () => {
    if (engineRef.current?.isReady) return;

    const engine = new AudioEngine();
    await engine.initialize();
    engineRef.current = engine;

    const mapper = new AudioMapper();
    mapperRef.current = mapper;

    setIsReady(true);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (!engineRef.current) return;
    const muted = engineRef.current.toggleMute();
    setIsMuted(muted);
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
      mapperRef.current = null;
    };
  }, []);

  return { initAudio, toggleMute, isReady, isMuted, engineRef, mapperRef };
}