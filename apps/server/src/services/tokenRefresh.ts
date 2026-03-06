import { config } from "../config.js";
import { UserToken } from "../types/auth.js";
import { TokenStore } from "./tokenStore.js";

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry

export async function getValidAccessToken(
  userToken: UserToken,
  tokenStore: TokenStore
): Promise<string> {
  if (userToken.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
    return userToken.accessToken;
  }

  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.hubspot.clientId,
      client_secret: config.hubspot.clientSecret,
      refresh_token: userToken.refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("HubSpot token refresh failed:", body);
    throw new Error("Failed to refresh HubSpot token");
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // HubSpot rotates refresh tokens — persist both new tokens
  userToken.accessToken = data.access_token;
  userToken.refreshToken = data.refresh_token;
  userToken.expiresAt = Date.now() + data.expires_in * 1000;
  userToken.updatedAt = new Date().toISOString();

  await tokenStore.set(userToken.id, userToken);

  return userToken.accessToken;
}
