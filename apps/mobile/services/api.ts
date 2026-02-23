import { API_BASE_URL } from "../constants/config";
import type {
  DealSummary,
  DealDetail,
  DealContext,
  InterviewMessage,
  StructuredReport,
  UploadResult,
} from "../types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }
  return response.json();
}

// Deals
export async function searchDeals(
  query: string,
  ownerId?: string
): Promise<{ deals: DealSummary[]; total: number }> {
  const params = new URLSearchParams({ q: query });
  if (ownerId) params.append("ownerId", ownerId);
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
  });
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
  });
}
