export interface Attendee {
  name: string;
  title: string;
  company: string;
}

export interface ActionItem {
  action: string;
  owner: string;
  dueDate: string | null;
}

export interface NextStep {
  step: string;
  timeline: string;
}

export interface CompetitorMention {
  competitor: string;
  context: string;
}

export interface DealStageRecommendation {
  currentStage: string;
  recommendedStage: string;
  rationale: string;
}

export interface ProductDiscussed {
  category: string;
  details: string;
  sampleStatus: "not discussed" | "requested" | "sent" | "under review" | "approved" | "rejected";
  customFormulation: boolean;
}

export interface DecisionProcess {
  decisionMaker: string | null;
  evaluationCriteria: string[];
  decisionTimeline: string | null;
  otherStakeholders: string[];
}

export interface StructuredReport {
  callDate: string;
  callType: "phone" | "in-person" | "video";
  attendees: Attendee[];
  summary: string;
  productsDiscussed: ProductDiscussed[];
  topicsDiscussed: string[];
  keyInsights: string[];
  actionItems: ActionItem[];
  nextSteps: NextStep[];
  competitorMentions: CompetitorMention[];
  decisionProcess: DecisionProcess | null;
  dealStageRecommendation: DealStageRecommendation;
  customerSentiment: "positive" | "neutral" | "negative" | "mixed";
  riskFactors: string[];
  followUpDate: string | null;
  pricingNotes: string | null;
  volumeNotes: string | null;
  businessType: "new" | "competitive switch" | "expansion" | "renewal" | "not discussed";
}

export interface DealUpdates {
  next_step?: string;
  dealstage?: string;
  probability_of_closing?: string;
  competitive_coffee_pricing?: string;
}

export interface UploadOptions {
  createNote: boolean;
  logCall: boolean;
  updateDeal: boolean;
  dealUpdates?: DealUpdates;
}

export interface UploadResult {
  noteId?: string;
  callId?: string;
  dealUpdated: boolean;
  hubspotUrl: string;
}
