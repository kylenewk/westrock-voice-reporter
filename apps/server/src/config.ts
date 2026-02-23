export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "0.0.0.0",

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: "claude-opus-4-6" as const,
  },

  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN || "",
    defaultOwnerId: process.env.HUBSPOT_OWNER_ID || "211824246",
    portalId: process.env.HUBSPOT_PORTAL_ID || "4936417",
  },

  session: {
    ttlMs: 30 * 60 * 1000, // 30 minutes
  },
} as const;

export function validateConfig(): void {
  if (!config.anthropic.apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }
  if (!config.hubspot.accessToken) {
    console.warn("WARNING: HUBSPOT_ACCESS_TOKEN not set. HubSpot features will not work.");
  }
}
