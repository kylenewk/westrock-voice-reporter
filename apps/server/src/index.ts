import Fastify from "fastify";
import cors from "@fastify/cors";
import { config, validateConfig } from "./config.js";
import { dealsRoutes } from "./routes/deals.js";
import { interviewRoutes } from "./routes/interview.js";
import { reportRoutes } from "./routes/report.js";

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

  // Register routes
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
