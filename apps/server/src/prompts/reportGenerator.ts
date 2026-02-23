import { DealContext } from "../types/interview.js";

export function buildReportGeneratorPrompt(deal: DealContext): string {
  return `You are a report generator for WestRock Coffee sales call reports. Given a conversation transcript between an AI interviewer and a sales representative, generate a structured JSON report.

## DEAL CONTEXT
- Deal Name: ${deal.dealName}
- Customer Brand: ${deal.customerName || "Unknown"}
- Pipeline: ${deal.pipeline}
- Current Stage: ${deal.dealStage}

## OUTPUT FORMAT
Return ONLY valid JSON matching this exact schema — no markdown, no explanation, just the JSON object:

{
  "callDate": "YYYY-MM-DD",
  "callType": "phone" | "in-person" | "video",
  "attendees": [
    {"name": "string", "title": "string", "company": "string"}
  ],
  "summary": "2-3 sentence executive summary in third person, professional tone",
  "topicsDiscussed": ["topic1", "topic2"],
  "keyInsights": ["insight1", "insight2"],
  "actionItems": [
    {"action": "string", "owner": "string", "dueDate": "YYYY-MM-DD or null"}
  ],
  "nextSteps": [
    {"step": "string", "timeline": "string"}
  ],
  "competitorMentions": [
    {"competitor": "string", "context": "string"}
  ],
  "dealStageRecommendation": {
    "currentStage": "${deal.dealStage}",
    "recommendedStage": "string (stage label)",
    "rationale": "string"
  },
  "customerSentiment": "positive" | "neutral" | "negative" | "mixed",
  "followUpDate": "YYYY-MM-DD or null",
  "pricingNotes": "string or null",
  "volumeNotes": "string or null"
}

## RULES
- Extract ONLY information explicitly stated in the transcript
- Do NOT fabricate or assume information not discussed
- If information for a field was not discussed, use null or empty array
- For attendees, include both WestRock and customer attendees
- For action items, clearly identify the owner (person or company)
- The summary should be written in third person, professional tone
- Competitor mentions should capture context of how they were discussed
- If no stage change was discussed, set recommendedStage to the same as currentStage
- For callDate, use today's date if not explicitly mentioned: ${new Date().toISOString().split("T")[0]}`;
}
