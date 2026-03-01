import { useState, useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";
import * as Speech from "expo-speech";

// Preferred voice names in order of naturalness
const PREFERRED_NAMES = ["Ava", "Zoe", "Samantha", "Allison", "Nicky"];

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const resolveRef = useRef<(() => void) | null>(null);
  const selectedVoice = useRef<string | undefined>(undefined);

  // On mount, find the best available voice
  useEffect(() => {
    if (Platform.OS !== "ios") return;

    Speech.getAvailableVoicesAsync().then((voices) => {
      const enUS = voices.filter(
        (v) => v.language === "en-US" || v.identifier?.includes("en-US")
      );

      // Score each voice: higher is better
      const scored = enUS.map((v) => {
        const id = v.identifier.toLowerCase();
        const q = String(v.quality || "").toLowerCase();
        let score = 0;

        // Quality tier scoring
        if (id.includes("premium") || q.includes("premium")) score += 1000;
        else if (id.includes("enhanced") || q.includes("enhanced")) score += 500;
        else if (id.includes("compact") && !id.includes("super-compact")) score += 100;
        else if (id.includes("super-compact")) score += 10;

        // Preferred name bonus
        const nameIndex = PREFERRED_NAMES.findIndex((n) =>
          id.includes(n.toLowerCase())
        );
        if (nameIndex >= 0) score += (PREFERRED_NAMES.length - nameIndex) * 10;

        return { voice: v, score };
      });

      scored.sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        selectedVoice.current = scored[0].voice.identifier;
        console.log(`[TTS] Selected: ${scored[0].voice.identifier} (score: ${scored[0].score})`);
      }
    });
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      setIsSpeaking(true);

      Speech.speak(text, {
        language: "en-US",
        voice: selectedVoice.current,
        rate: 0.93,
        pitch: 1.05,
        onDone: () => {
          setIsSpeaking(false);
          resolveRef.current = null;
          resolve();
        },
        onStopped: () => {
          setIsSpeaking(false);
          resolveRef.current = null;
          resolve();
        },
        onError: () => {
          setIsSpeaking(false);
          resolveRef.current = null;
          resolve();
        },
      });
    });
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
  }, []);

  return { isSpeaking, speak, stop };
}
