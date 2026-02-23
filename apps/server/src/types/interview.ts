export interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface InterviewSession {
  id: string;
  dealId: string;
  dealContext: DealContext;
  messages: InterviewMessage[];
  createdAt: string;
  completed: boolean;
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
