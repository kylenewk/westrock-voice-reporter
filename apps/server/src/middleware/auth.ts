import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { Client } from "@hubspot/api-client";
import { config } from "../config.js";
import { TokenStore } from "../services/tokenStore.js";
import { getValidAccessToken } from "../services/tokenRefresh.js";

declare module "fastify" {
  interface FastifyRequest {
    hubspotClient?: Client;
    hubspotPortalId?: string;
    hubspotOwnerId?: string;
  }
}

export function authPlugin(tokenStore: TokenStore) {
  // Wrap with fastify-plugin (fp) to break encapsulation.
  // Without fp, hooks registered inside a plugin only apply to that
  // plugin's scope — NOT to sibling plugins (like route plugins).
  // fp ensures this hook applies to ALL routes in the app.
  return fp(async function (app: FastifyInstance) {
    app.decorateRequest("hubspotClient", undefined);
    app.decorateRequest("hubspotPortalId", undefined);
    app.decorateRequest("hubspotOwnerId", undefined);

    app.addHook(
      "preHandler",
      async (request: FastifyRequest, reply: FastifyReply) => {
        // Skip auth for auth routes and health check
        if (
          request.url.startsWith("/api/auth/") ||
          request.url === "/health"
        ) {
          return;
        }

        const authHeader = request.headers.authorization;

        if (authHeader?.startsWith("Bearer ")) {
          // OAuth path: look up user token
          const serverToken = authHeader.slice(7);
          const userToken = await tokenStore.get(serverToken);

          if (!userToken) {
            reply.code(401).send({ error: "Invalid or expired token" });
            return;
          }

          try {
            const accessToken = await getValidAccessToken(
              userToken,
              tokenStore
            );
            request.hubspotClient = new Client({ accessToken });
            request.hubspotPortalId = userToken.portalId;
            request.hubspotOwnerId = userToken.hubspotOwnerId;
          } catch {
            reply
              .code(401)
              .send({ error: "HubSpot token expired. Please re-authenticate." });
            return;
          }
        } else if (config.hubspot.accessToken) {
          // Fallback: use PAT token (backward compatibility)
          request.hubspotClient = new Client({
            accessToken: config.hubspot.accessToken,
          });
          request.hubspotPortalId = config.hubspot.portalId;
          request.hubspotOwnerId = config.hubspot.defaultOwnerId;
        }
        // If neither is available, hubspotClient remains undefined — routes use mock data
      }
    );
  });
}
