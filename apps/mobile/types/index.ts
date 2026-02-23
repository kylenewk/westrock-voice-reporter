export interface DealSummary {
  id: string;
  dealname: string;
  dealstage: string;
  pipeline: string;
  customer_name: string | null;
  channel: string | null;
  segment_type: string | null;
  amount: string | null;
  closedate: string | null;
}

export interface DealContext {
  dealId: string;
  dealName: string;
  customerName: string;
  pipeline: string;
  pipelineId: string;
  dealStage: string;
  dealStageId: string;
  channel: string;
  segmentType: string;
  amount: string;
  closeDate: string;
  incumbentSupplier: string;
  lastUpdate: string;
  probabilityOfClosing: string;
}

export interface DealDetail {
  deal: { id: string; properties: Record<string, string | null> };
  contacts: Contact[];
  company: Company | null;
}

export interface Contact {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  jobtitle: string | null;
  company: string | null;
}

export interface Company {
  id: string;
  name: string | null;
  domain: string | null;
  industry: string | null;
}

export interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface StructuredReport {
  callDate: string;
  callType: "phone" | "in-person" | "video";
  attendees: { name: string; title: string; company: string }[];
  summary: string;
  topicsDiscussed: string[];
  keyInsights: string[];
  actionItems: { action: string; owner: string; dueDate: string | null }[];
  nextSteps: { step: string; timeline: string }[];
  competitorMentions: { competitor: string; context: string }[];
  dealStageRecommendation: {
    currentStage: string;
    recommendedStage: string;
    rationale: string;
  };
  customerSentiment: "positive" | "neutral" | "negative" | "mixed";
  followUpDate: string | null;
  pricingNotes: string | null;
  volumeNotes: string | null;
}

export interface UploadResult {
  noteId?: string;
  callId?: string;
  dealUpdated: boolean;
  hubspotUrl: string;
}

export type InterviewState =
  | "idle"
  | "greeting"
  | "listening"
  | "processing"
  | "responding"
  | "summarizing"
  | "complete";
