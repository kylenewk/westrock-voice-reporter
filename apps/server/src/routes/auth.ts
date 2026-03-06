import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";
import { TokenStore } from "../services/tokenStore.js";
import { UserToken } from "../types/auth.js";

// In-memory state store for CSRF protection during OAuth flow
const pendingStates = new Map<string, number>();

// Clean up expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, created] of pendingStates) {
    if (now - created > 5 * 60 * 1000) {
      pendingStates.delete(state);
    }
  }
}, 5 * 60 * 1000);

export function authRoutes(tokenStore: TokenStore) {
  return async function (app: FastifyInstance) {
    // Initiate OAuth flow — redirects user to HubSpot consent screen
    app.get("/api/auth/hubspot", async (request, reply) => {
      if (!config.hubspot.clientId || !config.hubspot.redirectUri) {
        reply.code(500).send({
          error:
            "OAuth not configured. Set HUBSPOT_CLIENT_ID and HUBSPOT_REDIRECT_URI.",
        });
        return;
      }

      const state = uuidv4();
      pendingStates.set(state, Date.now());

      const params = new URLSearchParams({
        client_id: config.hubspot.clientId,
        redirect_uri: config.hubspot.redirectUri,
        scope: config.hubspot.scopes.join(" "),
        state,
      });

      reply.redirect(
        `https://app.hubspot.com/oauth/authorize?${params.toString()}`
      );
    });

    // OAuth callback — exchanges code for tokens
    app.get<{
      Querystring: { code?: string; state?: string; error?: string };
    }>("/api/auth/hubspot/callback", async (request, reply) => {
      const { code, state, error } = request.query;

      if (error) {
        reply.code(400).send({ error: `OAuth denied: ${error}` });
        return;
      }

      if (!code || !state) {
        reply.code(400).send({ error: "Missing code or state parameter" });
        return;
      }

      // Validate state to prevent CSRF
      if (!pendingStates.has(state)) {
        reply.code(400).send({ error: "Invalid or expired state parameter" });
        return;
      }
      pendingStates.delete(state);

      // Exchange code for tokens
      const tokenResponse = await fetch(
        "https://api.hubapi.com/oauth/v1/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: config.hubspot.clientId,
            client_secret: config.hubspot.clientSecret,
            redirect_uri: config.hubspot.redirectUri,
            code,
          }),
        }
      );

      if (!tokenResponse.ok) {
        const body = await tokenResponse.text();
        request.log.error({ body }, "HubSpot token exchange failed");
        reply.code(500).send({ error: "Failed to exchange code for tokens" });
        return;
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      // Fetch token info to get portal ID and user ID
      const infoResponse = await fetch(
        `https://api.hubapi.com/oauth/v1/access-tokens/${tokenData.access_token}`
      );

      let portalId = "";
      let hubspotUserId = "";

      if (infoResponse.ok) {
        const info = (await infoResponse.json()) as {
          hub_id: number;
          user_id: number;
        };
        portalId = String(info.hub_id);
        hubspotUserId = String(info.user_id);
      }

      // Generate server auth token and store
      const serverToken = uuidv4();
      const now = new Date().toISOString();

      const userToken: UserToken = {
        id: serverToken,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        portalId,
        hubspotUserId,
        createdAt: now,
        updatedAt: now,
      };

      await tokenStore.set(serverToken, userToken);

      // Redirect to mobile app with the server token
      const redirectParams = new URLSearchParams({
        token: serverToken,
        portalId,
      });
      reply.redirect(
        `${config.auth.mobileRedirectUri}?${redirectParams.toString()}`
      );
    });

    // Logout — remove stored token
    app.post("/api/auth/logout", async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        await tokenStore.delete(token);
      }
      return { success: true };
    });

    // Get current user info
    app.get("/api/auth/me", async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const userToken = await tokenStore.get(token);
        if (userToken) {
          return {
            authenticated: true,
            portalId: userToken.portalId,
            hubspotUserId: userToken.hubspotUserId,
            hubspotOwnerId: userToken.hubspotOwnerId,
          };
        }
      }

      // PAT fallback or no auth
      if (config.hubspot.accessToken) {
        return {
          authenticated: true,
          portalId: config.hubspot.portalId,
          mode: "pat",
        };
      }

      return { authenticated: false };
    });
  };
}
