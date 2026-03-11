import { API_BASE_URL } from "../constants/config";
import { getAuthToken, clearAuthToken } from "./auth";
import type {
  DealSummary,
  DealDetail,
  DealContext,
  InterviewMessage,
  StructuredReport,
  UploadResult,
} from "../types";

async function request<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number; retries?: number }
): Promise<T> {
  const { timeoutMs = 30000, retries = 0, ...fetchOptions } = options || {};

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions?.headers as Record<string, string>),
  };

  // Attach auth token if available
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // Wait before retrying (1s, then 2s)
      await new Promise((r) => setTimeout(r, attempt * 1000));
      console.log(`[API] Retry ${attempt}/${retries} for ${path}`);
    }

    // Use AbortController for timeout — prevents "Network request failed"
    // on long-running requests like report generation
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      if (response.status === 401) {
        await clearAuthToken();
        throw new Error("Authentication expired. Please log in again.");
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`API error ${response.status}: ${body}`);
      }
      return await response.json();
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        throw new Error(
          "Request timed out. The server may be busy — please try again."
        );
      }
      // Auth errors should not be retried
      if (err.message?.includes("Authentication expired")) {
        throw err;
      }
      lastError = err;
      // Only retry on network-level failures (not HTTP errors)
      if (attempt < retries && isNetworkError(err)) {
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("Request failed");
}

function isNetworkError(err: any): boolean {
  const msg = err?.message?.toLowerCase() || "";
  return (
    msg.includes("network request failed") ||
    msg.includes("network error") ||
    msg.includes("failed to fetch") ||
    msg.includes("load failed")
  );
}

// Auth
export async function getAuthStatus(): Promise<{ authenticated: boolean; portalId?: string; mode?: string }> {
  return request("/api/auth/me");
}

export async function logout(): Promise<void> {
  await request("/api/auth/logout", { method: "POST" });
  await clearAuthToken();
}

// Deals
export async function searchDeals(
  query: string,
  ownerId?: string,
  offset?: number
): Promise<{ deals: DealSummary[]; total: number }> {
  const params = new URLSearchParams({ q: query });
  if (ownerId) params.append("ownerId", ownerId);
  if (offset) params.append("offset", String(offset));
  return request(`/api/deals?${params}`);
}

export async function getDealDetail(dealId: string): Promise<DealDetail> {
  return request(`/api/deals/${dealId}`);
}

// Interview
export async function startInterview(
  dealId: string
): Promise<{ sessionId: string; greeting: string; dealContext: DealContext }> {
  return request("/api/interview/start", {
    method: "POST",
    body: JSON.stringify({ dealId }),
  });
}

export async function sendInterviewMessage(
  sessionId: string,
  transcript: string
): Promise<{ response: string; interviewComplete: boolean }> {
  return request("/api/interview/message", {
    method: "POST",
    body: JSON.stringify({ sessionId, transcript }),
  });
}

export async function endInterview(
  sessionId: string
): Promise<{ transcript: InterviewMessage[] }> {
  return request("/api/interview/end", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

// Report
export async function generateReport(
  sessionId: string
): Promise<{ report: StructuredReport }> {
  return request("/api/report/generate", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
    timeoutMs: 120000, // 2 minutes — report generation calls Claude API
    retries: 2, // Retry on network failures (e.g. after phone sleep)
  });
}

// TTS — returns base64 audio data URI for playback via expo-av
const TTS_FETCH_TIMEOUT_MS = 15000;

export async function synthesizeSpeech(text: string): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/tts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (response.status === 401) {
      await clearAuthToken();
      throw new Error("Authentication expired. Please log in again.");
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`TTS API error ${response.status}: ${body}`);
    }

    // Convert response to a base64 data URI that expo-av can play
    const arrayBuffer = await response.arrayBuffer();
    const base64 = _arrayBufferToBase64(arrayBuffer);
    return `data:audio/mpeg;base64,${base64}`;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("TTS request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function _arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Process in chunks to avoid call stack overflow with String.fromCharCode
  const CHUNK_SIZE = 8192;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    parts.push(String.fromCharCode(...chunk));
  }
  return btoa(parts.join(""));
}

export async function uploadReport(
  dealId: string,
  report: StructuredReport,
  options: {
    createNote: boolean;
    logCall: boolean;
    updateDeal: boolean;
    dealUpdates?: Record<string, string>;
  }
): Promise<UploadResult> {
  return request("/api/report/upload", {
    method: "POST",
    body: JSON.stringify({ dealId, report, options }),
    timeoutMs: 60000, // HubSpot upload can involve multiple API calls
    retries: 2,
  });
}
