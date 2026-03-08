export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "0.0.0.0",

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: "claude-haiku-4-5-20251001" as const,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    ttsModel: "tts-1" as const,
    ttsVoice: "nova" as const,
  },

  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN || "",
    defaultOwnerId: process.env.HUBSPOT_OWNER_ID || "211824246",
    portalId: process.env.HUBSPOT_PORTAL_ID || "4936417",
    // OAuth settings (optional — enables multi-user auth)
    clientId: process.env.HUBSPOT_CLIENT_ID || "",
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET || "",
    redirectUri: process.env.HUBSPOT_REDIRECT_URI || "",
    scopes: (
      process.env.HUBSPOT_SCOPES ||
      "crm.objects.deals.read crm.objects.deals.write crm.objects.contacts.read crm.objects.companies.read"
    ).split(" "),
  },

  auth: {
    mobileRedirectUri: process.env.MOBILE_REDIRECT_URI || "westrock-reporter://auth/callback",
    tokenTtlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  },

  redis: {
    url: process.env.REDIS_URL || "",
  },

  session: {
    ttlMs: 30 * 60 * 1000, // 30 minutes
  },
};

export function validateConfig(): void {
  if (!config.anthropic.apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }
  if (!config.openai.apiKey) {
    console.warn(
      "WARNING: OPENAI_API_KEY not set. Cloud TTS will not work (will fall back to native speech)."
    );
  }
  if (!config.hubspot.accessToken && !config.hubspot.clientId) {
    console.warn(
      "WARNING: Neither HUBSPOT_ACCESS_TOKEN nor HUBSPOT_CLIENT_ID is set. HubSpot features will not work."
    );
  }
}
