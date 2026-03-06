import Fastify from "fastify";
import cors from "@fastify/cors";
import { config, validateConfig } from "./config.js";
import { authPlugin } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { dealsRoutes } from "./routes/deals.js";
import { interviewRoutes } from "./routes/interview.js";
import { reportRoutes } from "./routes/report.js";
import { createTokenStore } from "./services/tokenStore.js";

async function main() {
  validateConfig();

  const app = Fastify({
    logger: true,
  });

  // CORS for mobile app
  await app.register(cors, {
    origin: true,
  });

  // Parse JSON bodies
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      try {
        done(null, JSON.parse(body as string));
      } catch (err: any) {
        done(err);
      }
    }
  );

  // Create token store for OAuth tokens
  const tokenStore = createTokenStore();

  // Auth middleware — resolves per-request HubSpot client
  await app.register(authPlugin(tokenStore));

  // Register routes
  await app.register(authRoutes(tokenStore));
  await app.register(dealsRoutes);
  await app.register(interviewRoutes);
  await app.register(reportRoutes);

  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // Start server
  await app.listen({ port: config.port, host: config.host });
  console.log(`Server running at http://${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
