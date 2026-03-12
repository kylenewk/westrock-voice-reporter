import { FastifyInstance } from "fastify";
import { searchDeals, getDeal } from "../services/hubspot.js";
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

export function getMockDealDetail(dealId: string): DealDetail {
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
        description: "Multi-year coffee supply agreement for hotel chain beverage program.",
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
      {
        id: "contact-002",
        firstname: "Tom",
        lastname: "Rivera",
        email: "tom.rivera@example.com",
        jobtitle: "VP Food & Beverage",
        company: deal?.customer_name || "Test Customer",
      },
    ],
    company: {
      id: "company-001",
      name: deal?.customer_name || "Test Customer",
      domain: "example.com",
      industry: "Food & Beverage",
    },
    notes: [
      {
        id: "note-001",
        body: "Met with Jane Smith and Tom Rivera at their corporate office. Discussed switching from Competitor Coffee Co. due to inconsistent quality on their dark roast blend. They are interested in our Roasted Coffee line — specifically ground coffee for in-room brewing and Keurig-compatible pods for their lobby cafe. Volume estimate: ~75,000 lbs/year across 120 properties. Jane requested 3 sample SKUs for internal tasting. Decision timeline: Q2 2026. Key concern: supply chain reliability during peak season.",
        createdAt: "2026-02-20T14:30:00Z",
      },
      {
        id: "note-002",
        body: "Sent roasted coffee samples (Colombian Medium Roast ground, House Blend K-Cups, Dark Roast ground) to Jane Smith via FedEx. Tracking number shared. Expected delivery: Feb 28. Tom Rivera mentioned they are also evaluating Folgers and Farmer Brothers. Need to follow up on tasting results by mid-March.",
        createdAt: "2026-02-26T10:00:00Z",
      },
    ],
    calls: [
      {
        id: "call-001",
        title: "Call Report: Initial Discovery Call",
        body: "30-minute intro call with Jane Smith. She outlined their current coffee program: 120 hotels, in-room ground coffee and lobby K-Cup stations. Current supplier is Competitor Coffee Co. on a 2-year contract expiring June 2026. Pain points: inconsistent roast quality, slow response to complaints, no sustainability certifications. Jane is the day-to-day contact; Tom Rivera (VP F&B) is the final decision maker. Budget: ~$2.10/lb for ground, open to premium for better quality. Next step: Schedule in-person meeting to present full product line.",
        createdAt: "2026-02-10T16:00:00Z",
      },
    ],
  };
}

export async function dealsRoutes(app: FastifyInstance) {
  // Search deals
  app.get<{
    Querystring: { q?: string; ownerId?: string; limit?: string; offset?: string };
  }>("/api/deals", async (request, reply) => {
    if (!request.hubspotClient) {
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
    // Only filter by owner when explicitly requested via query param.
    // Without this, users can search ALL deals they have access to.
    try {
      const result = await searchDeals(
        request.hubspotClient,
        q || "",
        ownerId || undefined,
        parseInt(limit || "20", 10),
        parseInt(offset || "0", 10)
      );
      return result;
    } catch (err: any) {
      request.log.error({ err, query: q }, "Deal search failed");
      const message = err?.body?.message || err?.message || "HubSpot search failed";
      reply.code(502).send({
        error: `Deal search failed: ${message}`,
        details: err?.body?.category || undefined,
      });
    }
  });

  // Get deal detail
  app.get<{ Params: { id: string } }>("/api/deals/:id", async (request, reply) => {
    if (!request.hubspotClient) {
      return getMockDealDetail(request.params.id);
    }

    try {
      const detail = await getDeal(request.hubspotClient, request.params.id);
      return detail;
    } catch (err: any) {
      request.log.error({ err, dealId: request.params.id }, "Failed to fetch deal");
      const status = err?.code === 404 || err?.statusCode === 404 ? 404 : 502;
      reply.code(status).send({
        error: `Failed to fetch deal: ${err.message}`,
      });
    }
  });
}
