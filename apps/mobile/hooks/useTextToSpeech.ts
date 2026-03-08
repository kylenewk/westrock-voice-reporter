import { useState, useCallback, useRef, useEffect } from "react";
import { Audio } from "expo-av";
import * as api from "../services/api";

// Safety timeout — if audio never finishes, auto-resolve
const TTS_TIMEOUT_MS = 30000;

// Lazy-loaded expo-speech as fallback for offline/error scenarios
let _speechLib: any = null;
let _speechLoadAttempted = false;

function getSpeechLib(): any {
  if (_speechLoadAttempted) return _speechLib;
  _speechLoadAttempted = true;
  try {
    _speechLib = require("expo-speech");
  } catch (e: any) {
    console.warn("[TTS] Failed to load expo-speech fallback:", e.message);
  }
  return _speechLib;
}

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsSpeaking(false);
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
  }, []);

  /**
   * Fallback: use native expo-speech if cloud TTS fails (network error, etc.)
   */
  const speakFallback = useCallback(
    (text: string, resolve: () => void): void => {
      const Speech = getSpeechLib();
      if (!Speech) {
        console.warn("[TTS] Fallback expo-speech not available either");
        setIsSpeaking(false);
        resolve();
        return;
      }
      console.log("[TTS] Falling back to native expo-speech");

      let resolved = false;
      const doResolve = () => {
        if (resolved) return;
        resolved = true;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsSpeaking(false);
        resolveRef.current = null;
        resolve();
      };

      resolveRef.current = doResolve;

      timeoutRef.current = setTimeout(() => {
        console.warn("[TTS] Fallback timeout");
        try {
          Speech.stop();
        } catch {}
        doResolve();
      }, TTS_TIMEOUT_MS);

      try {
        Speech.speak(text, {
          language: "en-US",
          rate: 1.1,
          pitch: 1.05,
          onDone: doResolve,
          onStopped: doResolve,
          onError: () => doResolve(),
        });
      } catch {
        doResolve();
      }
    },
    []
  );

  const speak = useCallback(
    async (text: string): Promise<void> => {
      // NOTE: Audio session is configured once by useInterview before the
      // interview starts. We do NOT touch the audio session here to avoid
      // conflicts with expo-speech-recognition.

      return new Promise<void>(async (resolve) => {
        setIsSpeaking(true);
        resolveRef.current = resolve;

        // Safety timeout
        timeoutRef.current = setTimeout(() => {
          console.warn("[TTS] Timeout — forcing resolve after", TTS_TIMEOUT_MS, "ms");
          cleanup();
        }, TTS_TIMEOUT_MS);

        try {
          console.log(
            "[TTS] Requesting cloud TTS:",
            text.substring(0, 80) + (text.length > 80 ? "..." : "")
          );

          // 1. Fetch audio from server (OpenAI nova voice)
          const audioUri = await api.synthesizeSpeech(text);

          // 2. Create and play sound via expo-av
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioUri },
            { shouldPlay: true }
          );
          soundRef.current = sound;

          // 3. Listen for playback completion
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              console.log("[TTS] Cloud audio playback finished");
              cleanup();
            }
          });

          console.log("[TTS] Cloud audio playing (nova voice)");
        } catch (err: any) {
          console.warn("[TTS] Cloud TTS failed:", err.message);
          // Clear the timeout set for cloud TTS; fallback manages its own
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          // Fall back to native iOS speech
          speakFallback(text, resolve);
        }
      });
    },
    [cleanup, speakFallback]
  );

  const stop = useCallback(() => {
    // Stop expo-av playback
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
    }
    // Also stop expo-speech in case fallback is active
    try {
      const Speech = getSpeechLib();
      if (Speech) Speech.stop();
    } catch {}
    cleanup();
  }, [cleanup]);

  return { isSpeaking, speak, stop };
}
