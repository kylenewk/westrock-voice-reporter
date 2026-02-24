import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { InterviewSession, DealContext, InterviewMessage } from "../types/interview.js";
import { StructuredReport } from "../types/report.js";
import { buildInterviewerPrompt, buildGreeting } from "../prompts/interviewer.js";
import { buildReportGeneratorPrompt } from "../prompts/reportGenerator.js";
import { createSessionStore, SessionStore } from "./sessionStore.js";
import { v4 as uuidv4 } from "uuid";

const client = new Anthropic({ apiKey: config.anthropic.apiKey });
const store: SessionStore = createSessionStore();

export async function startSession(dealId: string, dealContext: DealContext): Promise<InterviewSession> {
  const session: InterviewSession = {
    id: uuidv4(),
    dealId,
    dealContext,
    messages: [],
    createdAt: new Date().toISOString(),
    completed: false,
  };
  await store.set(session.id, session);
  return session;
}

export async function getSession(sessionId: string): Promise<InterviewSession | undefined> {
  return store.get(sessionId);
}

export async function getGreeting(session: InterviewSession): Promise<string> {
  const greeting = buildGreeting(session.dealContext);
  session.messages.push({
    role: "assistant",
    content: greeting,
    timestamp: new Date().toISOString(),
  });
  await store.set(session.id, session);
  return greeting;
}

export async function sendMessage(
  sessionId: string,
  userTranscript: string
): Promise<{ response: string; interviewComplete: boolean }> {
  const session = await store.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Add user message
  session.messages.push({
    role: "user",
    content: userTranscript,
    timestamp: new Date().toISOString(),
  });

  // Build messages array for Claude
  const systemPrompt = buildInterviewerPrompt(session.dealContext);
  const apiMessages = session.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 1024,
    thinking: { type: "adaptive" } as any,
    system: systemPrompt,
    messages: apiMessages,
  });

  // Extract text response
  const textBlock = response.content.find((b) => b.type === "text");
  const assistantText = textBlock?.text || "Could you repeat that?";

  // Add assistant message
  session.messages.push({
    role: "assistant",
    content: assistantText,
    timestamp: new Date().toISOString(),
  });

  // Check for completion signal
  const interviewComplete = assistantText.toLowerCase().includes(
    "i think i have everything i need"
  ) || assistantText.toLowerCase().includes(
    "let me put together your report"
  );

  if (interviewComplete) {
    session.completed = true;
  }

  await store.set(sessionId, session);

  return { response: assistantText, interviewComplete };
}

export async function* streamMessage(
  sessionId: string,
  userTranscript: string
): AsyncGenerator<{ type: "token" | "done"; content: string; interviewComplete?: boolean }> {
  const session = await store.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Add user message
  session.messages.push({
    role: "user",
    content: userTranscript,
    timestamp: new Date().toISOString(),
  });

  const systemPrompt = buildInterviewerPrompt(session.dealContext);
  const apiMessages = session.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const fullParts: string[] = [];

  const stream = client.messages.stream({
    model: config.anthropic.model,
    max_tokens: 1024,
    thinking: { type: "adaptive" } as any,
    system: systemPrompt,
    messages: apiMessages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const text = event.delta.text;
      fullParts.push(text);
      yield { type: "token", content: text };
    }
  }

  const fullResponse = fullParts.join("");

  // Add to session history
  session.messages.push({
    role: "assistant",
    content: fullResponse,
    timestamp: new Date().toISOString(),
  });

  const interviewComplete =
    fullResponse.toLowerCase().includes("i think i have everything i need") ||
    fullResponse.toLowerCase().includes("let me put together your report");

  if (interviewComplete) {
    session.completed = true;
  }

  await store.set(sessionId, session);

  yield { type: "done", content: fullResponse, interviewComplete };
}

export async function generateReport(sessionId: string): Promise<StructuredReport> {
  const session = await store.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const systemPrompt = buildReportGeneratorPrompt(session.dealContext);

  // Build transcript text for the report generator
  const transcript = session.messages
    .map((m) => {
      const label = m.role === "assistant" ? "Interviewer" : "Sales Rep";
      return `${label}: ${m.content}`;
    })
    .join("\n\n");

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 4096,
    thinking: { type: "adaptive" } as any,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Generate a structured call report from this interview transcript:\n\n${transcript}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON from response - handle possible markdown wrapping
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const report: StructuredReport = JSON.parse(jsonText);
  return report;
}

export async function getTranscript(sessionId: string): Promise<InterviewMessage[]> {
  const session = await store.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  return session.messages;
}
