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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  // Attach auth token if available
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
    throw new Error("Authentication expired. Please log in again.");
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }
  return response.json();
}

// Auth
export async function getAuthStatus(): Promise<{ authenticated: boolean; portalId?: string; mode?: string }> {
  return request("/api/auth/me");
}

export async function logout(): Promise<void> {
  await request("/api/auth/logout", { method: "POST" });
  clearAuthToken();
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
