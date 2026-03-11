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

// Phrases that signal the AI interviewer considers the interview complete
const COMPLETION_SIGNALS = [
  "i think i have everything i need",
  "let me put together your report",
  "i have all the information i need",
  "that covers everything",
  "let me summarize",
];

function isInterviewComplete(text: string): boolean {
  const lower = text.toLowerCase();
  return COMPLETION_SIGNALS.some((signal) => lower.includes(signal));
}

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

export async function markSessionCompleted(sessionId: string): Promise<void> {
  const session = await store.get(sessionId);
  if (session) {
    session.completed = true;
    await store.set(sessionId, session);
  }
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

  if (session.completed) {
    return { response: "This interview has already been completed.", interviewComplete: true };
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

  const response = await client.messages.create(
    {
      model: config.anthropic.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: apiMessages,
    },
    { timeout: 30000 }
  );

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
  const interviewComplete = isInterviewComplete(assistantText);

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

  const interviewComplete = isInterviewComplete(fullResponse);

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

  // Retry report generation up to 2 times (JSON parsing can fail on malformed output)
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create(
        {
          model: config.anthropic.model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `Generate a structured call report from this interview transcript:\n\n${transcript}`,
            },
          ],
        },
        { timeout: 90000 }
      );

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
    } catch (err: any) {
      lastError = err;
      if (attempt === 0 && err instanceof SyntaxError) {
        console.warn("[Claude] Report JSON parse failed, retrying...");
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error("Report generation failed");
}

export async function getTranscript(sessionId: string): Promise<InterviewMessage[]> {
  const session = await store.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  return session.messages;
}
