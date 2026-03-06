import * as Linking from "expo-linking";
import { API_BASE_URL } from "../constants/config";

// Simple in-memory token storage for now.
// In production, use expo-secure-store for encrypted persistence.
let authToken: string | null = null;
let portalId: string | null = null;

export function getAuthToken(): string | null {
  return authToken;
}

export function setAuthToken(token: string, portal?: string): void {
  authToken = token;
  if (portal) portalId = portal;
}

export function clearAuthToken(): void {
  authToken = null;
  portalId = null;
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

export function parseAuthCallback(url: string): { token: string; portalId?: string } | null {
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
