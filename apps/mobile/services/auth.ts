import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../constants/config";

const TOKEN_KEY = "auth_token";
const PORTAL_KEY = "portal_id";

// In-memory cache (fast access after first load)
let authToken: string | null = null;
let portalId: string | null = null;

/**
 * Load persisted auth credentials from secure storage.
 * Call this once on app startup before checking auth state.
 */
export async function loadPersistedAuth(): Promise<boolean> {
  try {
    const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
    const storedPortal = await SecureStore.getItemAsync(PORTAL_KEY);
    if (storedToken) {
      authToken = storedToken;
      portalId = storedPortal;
      console.log("[Auth] Restored persisted session");
      return true;
    }
  } catch (e: any) {
    console.warn("[Auth] Failed to load persisted auth:", e.message);
  }
  return false;
}

export function getAuthToken(): string | null {
  return authToken;
}

export async function setAuthToken(
  token: string,
  portal?: string
): Promise<void> {
  authToken = token;
  if (portal) portalId = portal;
  // Persist to secure storage
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (portal) {
      await SecureStore.setItemAsync(PORTAL_KEY, portal);
    }
    console.log("[Auth] Credentials persisted to secure storage");
  } catch (e: any) {
    console.warn("[Auth] Failed to persist auth:", e.message);
  }
}

export async function clearAuthToken(): Promise<void> {
  authToken = null;
  portalId = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(PORTAL_KEY);
    console.log("[Auth] Cleared persisted credentials");
  } catch (e: any) {
    console.warn("[Auth] Failed to clear persisted auth:", e.message);
  }
}

export function getPortalId(): string | null {
  return portalId;
}

export function isAuthenticated(): boolean {
  return !!authToken;
}

export async function startOAuthFlow(): Promise<void> {
  const authUrl = `${API_BASE_URL}/api/auth/hubspot`;
  await Linking.openURL(authUrl);
}

export function parseAuthCallback(
  url: string
): { token: string; portalId?: string } | null {
  try {
    const parsed = Linking.parse(url);
    const token = parsed.queryParams?.token as string | undefined;
    if (token) {
      return {
        token,
        portalId: (parsed.queryParams?.portalId as string) || undefined,
      };
    }
  } catch {
    // Invalid URL
  }
  return null;
}
