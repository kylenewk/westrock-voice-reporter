import { FastifyInstance } from "fastify";
import { searchDeals, getDeal } from "../services/hubspot.js";
import { config } from "../config.js";
import type { DealSearchResult, DealDetail } from "../types/hubspot.js";

// --- Mock data for testing without HubSpot ---
const MOCK_DEALS: DealSearchResult = {
  total: 3,
  deals: [
    {
      id: "mock-001",
      dealname: "Acme Corp - Premium Blend Contract",
      dealstage: "qualifiedtobuy",
      pipeline: "default",
      customer_name: "Acme Corp",
      channel: "Direct",
      segment_type: "Enterprise",
      amount: "150000",
      closedate: "2026-04-15",
      hubspot_owner_id: null,
    },
    {
      id: "mock-002",
      dealname: "BrightBean Cafe - Office Supply",
      dealstage: "presentationscheduled",
      pipeline: "default",
      customer_name: "BrightBean Cafe",
      channel: "Distributor",
      segment_type: "SMB",
      amount: "28000",
      closedate: "2026-03-20",
      hubspot_owner_id: null,
    },
    {
      id: "mock-003",
      dealname: "Pacific Hotels Group - Bulk Order",
      dealstage: "decisionmakerboughtin",
      pipeline: "default",
      customer_name: "Pacific Hotels Group",
      channel: "Direct",
      segment_type: "Enterprise",
      amount: "320000",
      closedate: "2026-05-01",
      hubspot_owner_id: null,
    },
  ],
};

function getMockDeal(dealId: string): DealDetail {
  const deal = MOCK_DEALS.deals.find((d) => d.id === dealId);
  return {
    deal: {
      id: dealId,
      properties: {
        dealname: deal?.dealname || "Test Deal",
        dealstage: deal?.dealstage || "qualifiedtobuy",
        pipeline: deal?.pipeline || "default",
        customer_name: deal?.customer_name || "Test Customer",
        channel: deal?.channel || "Direct",
        segment_type: deal?.segment_type || "Enterprise",
        amount: deal?.amount || "100000",
        closedate: deal?.closedate || "2026-06-01",
        incumbent_supplier: "Competitor Coffee Co.",
        next_step: "Schedule follow-up call",
        probability_of_closing: "60",
      },
    },
    contacts: [
      {
        id: "contact-001",
        firstname: "Jane",
        lastname: "Smith",
        email: "jane.smith@example.com",
        jobtitle: "Procurement Manager",
        company: deal?.customer_name || "Test Customer",
      },
    ],
    company: {
      id: "company-001",
      name: deal?.customer_name || "Test Customer",
      domain: "example.com",
      industry: "Food & Beverage",
    },
  };
}

const hubspotEnabled = !!config.hubspot.accessToken;

export async function dealsRoutes(app: FastifyInstance) {
  // Search deals
  app.get<{
    Querystring: { q?: string; ownerId?: string; limit?: string; offset?: string };
  }>("/api/deals", async (request, reply) => {
    if (!hubspotEnabled) {
      const { q } = request.query;
      if (q) {
        const filtered = MOCK_DEALS.deals.filter((d) =>
          d.dealname.toLowerCase().includes(q.toLowerCase())
        );
        return { deals: filtered, total: filtered.length };
      }
      return MOCK_DEALS;
    }

    const { q, ownerId, limit, offset } = request.query;
    const result = await searchDeals(
      q || "",
      ownerId || config.hubspot.defaultOwnerId,
      parseInt(limit || "20", 10),
      parseInt(offset || "0", 10)
    );
    return result;
  });

  // Get deal detail
  app.get<{ Params: { id: string } }>("/api/deals/:id", async (request, reply) => {
    if (!hubspotEnabled) {
      return getMockDeal(request.params.id);
    }

    const detail = await getDeal(request.params.id);
    return detail;
  });
}
