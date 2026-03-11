import { FastifyInstance } from "fastify";
import { generateReport } from "../services/claude.js";
import { uploadReport } from "../services/hubspot.js";
import type { StructuredReport, UploadOptions } from "../types/report.js";

export async function reportRoutes(app: FastifyInstance) {
  // Generate structured report from interview
  // Longer timeout: Claude API call to generate the full report can take 30-60s
  app.post<{
    Body: { sessionId: string };
  }>("/api/report/generate", { config: { rawBody: false } }, async (request, reply) => {
    const { sessionId } = request.body || {};
    if (!sessionId || typeof sessionId !== "string") {
      reply.code(400).send({ error: "sessionId is required" });
      return;
    }

    // Extend timeout for this route — report generation is CPU-heavy on Claude's side
    request.raw.setTimeout(120000);

    try {
      const report = await generateReport(sessionId);
      return { report };
    } catch (err: any) {
      if (err.message?.includes("not found")) {
        reply.code(404).send({ error: err.message });
        return;
      }
      request.log.error(err, "Report generation failed");
      reply.code(500).send({
        error: "Failed to generate report",
        detail: err.message,
      });
    }
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

    const { dealId, report, options } = request.body || {};
    if (!dealId || !report || !options) {
      reply.code(400).send({ error: "dealId, report, and options are required" });
      return;
    }

    try {
      const result = await uploadReport(
        request.hubspotClient,
        request.hubspotPortalId || "",
        request.hubspotOwnerId || "",
        dealId,
        report,
        options
      );
      return result;
    } catch (err: any) {
      request.log.error(err, "Report upload failed");
      reply.code(500).send({
        error: "Failed to upload report to HubSpot",
        detail: err.message,
      });
    }
  });
}
