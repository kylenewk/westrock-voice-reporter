import { FastifyInstance } from "fastify";
import { generateReport } from "../services/claude.js";
import { uploadReport } from "../services/hubspot.js";
import type { StructuredReport, UploadOptions } from "../types/report.js";

export async function reportRoutes(app: FastifyInstance) {
  // Generate structured report from interview
  app.post<{
    Body: { sessionId: string };
  }>("/api/report/generate", async (request, reply) => {
    const { sessionId } = request.body;
    const report = await generateReport(sessionId);
    return { report };
  });

  // Upload report to HubSpot
  app.post<{
    Body: {
      dealId: string;
      report: StructuredReport;
      options: UploadOptions;
    };
  }>("/api/report/upload", async (request, reply) => {
    if (!request.hubspotClient) {
      reply.code(400).send({ error: "HubSpot not configured or not authenticated" });
      return;
    }

    const { dealId, report, options } = request.body;
    const result = await uploadReport(
      request.hubspotClient,
      request.hubspotPortalId || "",
      request.hubspotOwnerId || "",
      dealId,
      report,
      options
    );
    return result;
  });
}
