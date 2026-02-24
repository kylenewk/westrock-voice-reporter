import { FastifyInstance } from "fastify";
import {
  startSession,
  getSession,
  getGreeting,
  sendMessage,
  streamMessage,
  getTranscript,
} from "../services/claude.js";
import { getDeal, buildDealContext } from "../services/hubspot.js";
import { getMockDealDetail, hubspotEnabled } from "./deals.js";

export async function interviewRoutes(app: FastifyInstance) {
  // Start a new interview session
  app.post<{
    Body: { dealId: string };
  }>("/api/interview/start", async (request, reply) => {
    const { dealId } = request.body;

    // Fetch deal context (from HubSpot or mock data)
    const dealDetail = hubspotEnabled
      ? await getDeal(dealId)
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
  });

  // Send a message (non-streaming)
  app.post<{
    Body: { sessionId: string; transcript: string };
  }>("/api/interview/message", async (request, reply) => {
    const { sessionId, transcript } = request.body;
    const result = await sendMessage(sessionId, transcript);
    return result;
  });

  // Send a message (SSE streaming)
  app.post<{
    Body: { sessionId: string; transcript: string };
  }>("/api/interview/message/stream", async (request, reply) => {
    const { sessionId, transcript } = request.body;

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      for await (const chunk of streamMessage(sessionId, transcript)) {
        const data = JSON.stringify(chunk);
        reply.raw.write(`data: ${data}\n\n`);
      }
    } catch (error: any) {
      const errData = JSON.stringify({
        type: "error",
        content: error.message || "Unknown error",
      });
      reply.raw.write(`data: ${errData}\n\n`);
    }

    reply.raw.end();
  });

  // End interview early
  app.post<{
    Body: { sessionId: string };
  }>("/api/interview/end", async (request, reply) => {
    const { sessionId } = request.body;
    const session = await getSession(sessionId);
    if (!session) {
      reply.code(404);
      return { error: "Session not found" };
    }
    session.completed = true;
    return { transcript: await getTranscript(sessionId) };
  });
}
