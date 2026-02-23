// In development, point to your local server
// In production, replace with your deployed server URL
export const API_BASE_URL = __DEV__
  ? "http://localhost:3001"
  : "https://your-server.example.com";

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
