// Points to Render deployment in both dev and production.
// Override with EXPO_PUBLIC_API_URL env var if needed.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://westrock-voice-reporter.onrender.com";

export const COLORS = {
  primary: "#1a1a2e",
  secondary: "#16213e",
  accent: "#0f3460",
  highlight: "#e94560",
  success: "#00b894",
  warning: "#fdcb6e",
  error: "#d63031",
  background: "#f8f9fa",
  surface: "#ffffff",
  text: "#2d3436",
  textSecondary: "#636e72",
  textLight: "#b2bec3",
  border: "#dfe6e9",
  listening: "#0984e3",
  processing: "#6c5ce7",
  speaking: "#00b894",
} as const;
