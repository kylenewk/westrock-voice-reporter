import { FastifyInstance } from "fastify";
import {
  startSession,
  getSession,
  getGreeting,
  sendMessage,
  streamMessage,
  getTranscript,
  markSessionCompleted,
} from "../services/claude.js";
import { getDeal, buildDealContext } from "../services/hubspot.js";
import { getMockDealDetail } from "./deals.js";

export async function interviewRoutes(app: FastifyInstance) {
  // Start a new interview session
  app.post<{
    Body: { dealId: string };
  }>("/api/interview/start", async (request, reply) => {
    const { dealId } = request.body || {};
    if (!dealId || typeof dealId !== "string") {
      reply.code(400).send({ error: "dealId is required" });
      return;
    }

    try {
      // Fetch deal context (from HubSpot or mock data)
      const dealDetail = request.hubspotClient
        ? await getDeal(request.hubspotClient, dealId)
        : getMockDealDetail(dealId);
      const dealContext = buildDealContext(dealDetail);

      // Create session
      const session = await startSession(dealId, dealContext);
      const greeting = await getGreeting(session);

      return {
        sessionId: session.id,
        greeting,
        dealContext,
      };
    } catch (err: any) {
      request.log.error(err, "Failed to start interview");
      reply.code(500).send({ error: "Failed to start interview", detail: err.message });
    }
  });

  // Send a message (non-streaming)
  app.post<{
    Body: { sessionId: string; transcript: string };
  }>("/api/interview/message", async (request, reply) => {
    const { sessionId, transcript } = request.body || {};
    if (!sessionId || typeof sessionId !== "string") {
      reply.code(400).send({ error: "sessionId is required" });
      return;
    }
    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      reply.code(400).send({ error: "transcript is required" });
      return;
    }

    try {
      const result = await sendMessage(sessionId, transcript);
      return result;
    } catch (err: any) {
      if (err.message?.includes("not found")) {
        reply.code(404).send({ error: err.message });
        return;
      }
      request.log.error(err, "Failed to process interview message");
      reply.code(500).send({ error: "Failed to process message", detail: err.message });
    }
  });

  // Send a message (SSE streaming)
  app.post<{
    Body: { sessionId: string; transcript: string };
  }>("/api/interview/message/stream", async (request, reply) => {
    const { sessionId, transcript } = request.body || {};
    if (!sessionId || !transcript) {
      reply.code(400).send({ error: "sessionId and transcript are required" });
      return;
    }

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Abort the Claude stream if the client disconnects
    let aborted = false;
    request.raw.on("close", () => {
      aborted = true;
    });

    try {
      for await (const chunk of streamMessage(sessionId, transcript)) {
        if (aborted) break;
        const data = JSON.stringify(chunk);
        reply.raw.write(`data: ${data}\n\n`);
      }
    } catch (error: any) {
      if (!aborted) {
        const errData = JSON.stringify({
          type: "error",
          content: error.message || "Unknown error",
        });
        reply.raw.write(`data: ${errData}\n\n`);
      }
    }

    reply.raw.end();
  });

  // End interview early
  app.post<{
    Body: { sessionId: string };
  }>("/api/interview/end", async (request, reply) => {
    const { sessionId } = request.body || {};
    if (!sessionId || typeof sessionId !== "string") {
      reply.code(400).send({ error: "sessionId is required" });
      return;
    }

    try {
      const session = await getSession(sessionId);
      if (!session) {
        reply.code(404).send({ error: "Session not found" });
        return;
      }
      await markSessionCompleted(sessionId);
      return { transcript: await getTranscript(sessionId) };
    } catch (err: any) {
      request.log.error(err, "Failed to end interview");
      reply.code(500).send({ error: "Failed to end interview", detail: err.message });
    }
  });
}
