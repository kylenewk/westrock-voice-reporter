import { Client } from "@hubspot/api-client";
import { config } from "../config.js";
import type {
  DealSearchResult,
  HubSpotDealSummary,
  DealDetail,
  HubSpotContact,
  HubSpotCompany,
} from "../types/hubspot.js";
import type { DealContext } from "../types/interview.js";
import type { StructuredReport, UploadOptions, UploadResult } from "../types/report.js";
import { formatReportHtml, formatReportPlainText } from "./reportFormatter.js";

const hubspotClient = new Client({ accessToken: config.hubspot.accessToken });

const DEAL_PROPERTIES = [
  "dealname",
  "dealstage",
  "pipeline",
  "customer_name",
  "channel",
  "segment_type",
  "amount",
  "closedate",
  "incumbent_supplier",
  "next_step",
  "probability_of_closing",
  "hubspot_owner_id",
  "competitive_coffee_pricing",
  "description",
];

export async function searchDeals(
  query: string,
  ownerId?: string,
  limit = 20,
  offset = 0
): Promise<DealSearchResult> {
  const filterGroups: Array<{
    filters: Array<{ propertyName: string; operator: string; value?: string }>;
  }> = [];

  if (ownerId) {
    filterGroups.push({
      filters: [
        { propertyName: "hubspot_owner_id", operator: "EQ", value: ownerId },
      ],
    });
  }

  const response = await hubspotClient.crm.deals.searchApi.doSearch({
    query: query || undefined,
    filterGroups: filterGroups.length > 0 ? filterGroups : undefined,
    properties: DEAL_PROPERTIES,
    limit,
    after: offset > 0 ? String(offset) : undefined,
    sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
  } as any);

  const deals: HubSpotDealSummary[] = (response.results || []).map((d: any) => ({
    id: d.id,
    dealname: d.properties.dealname || "",
    dealstage: d.properties.dealstage || "",
    pipeline: d.properties.pipeline || "",
    customer_name: d.properties.customer_name || null,
    channel: d.properties.channel || null,
    segment_type: d.properties.segment_type || null,
    amount: d.properties.amount || null,
    closedate: d.properties.closedate || null,
    hubspot_owner_id: d.properties.hubspot_owner_id || null,
  }));

  return { deals, total: response.total || 0 };
}

export async function getDeal(dealId: string): Promise<DealDetail> {
  const deal = await hubspotClient.crm.deals.basicApi.getById(dealId, DEAL_PROPERTIES);

  // Fetch associated contacts via REST API
  let contacts: HubSpotContact[] = [];
  try {
    const assocResponse = await hubspotClient.apiRequest({
      method: "GET",
      path: `/crm/v3/objects/deals/${dealId}/associations/contacts`,
    });
    const assocData: any = await assocResponse.json();
    if (assocData.results && assocData.results.length > 0) {
      const contactIds = assocData.results.map((a: any) => a.toObjectId || a.id);
      const contactsResponse = await hubspotClient.crm.contacts.batchApi.read({
        inputs: contactIds.map((id: string) => ({ id })),
        properties: ["firstname", "lastname", "email", "jobtitle", "company"],
        propertiesWithHistory: [],
      });
      contacts = (contactsResponse.results || []).map((c: any) => ({
        id: c.id,
        firstname: c.properties.firstname || null,
        lastname: c.properties.lastname || null,
        email: c.properties.email || null,
        jobtitle: c.properties.jobtitle || null,
        company: c.properties.company || null,
      }));
    }
  } catch {
    // Associations may not exist
  }

  // Fetch associated company via REST API
  let company: HubSpotCompany | null = null;
  try {
    const compAssocResponse = await hubspotClient.apiRequest({
      method: "GET",
      path: `/crm/v3/objects/deals/${dealId}/associations/companies`,
    });
    const compAssocData: any = await compAssocResponse.json();
    if (compAssocData.results && compAssocData.results.length > 0) {
      const compId = compAssocData.results[0].toObjectId || compAssocData.results[0].id;
      const compResponse = await hubspotClient.crm.companies.basicApi.getById(
        compId,
        ["name", "domain", "industry"]
      );
      company = {
        id: compResponse.id,
        name: compResponse.properties.name || null,
        domain: compResponse.properties.domain || null,
        industry: compResponse.properties.industry || null,
      };
    }
  } catch {
    // No associated company
  }

  return { deal: { id: deal.id, properties: deal.properties as any }, contacts, company };
}

export function buildDealContext(detail: DealDetail): DealContext {
  const p = detail.deal.properties;
  return {
    dealId: detail.deal.id,
    dealName: p.dealname || "Unknown Deal",
    customerName: p.customer_name || "",
    pipeline: p.pipeline || "",
    pipelineId: p.pipeline || "",
    dealStage: p.dealstage || "",
    dealStageId: p.dealstage || "",
    channel: p.channel || "",
    segmentType: p.segment_type || "",
    amount: p.amount || "",
    closeDate: p.closedate || "",
    incumbentSupplier: p.incumbent_supplier || "",
    lastUpdate: p.next_step || "",
    probabilityOfClosing: p.probability_of_closing || "",
  };
}

export async function uploadReport(
  dealId: string,
  report: StructuredReport,
  options: UploadOptions
): Promise<UploadResult> {
  const result: UploadResult = {
    dealUpdated: false,
    hubspotUrl: `https://app.hubspot.com/contacts/${config.hubspot.portalId}/deal/${dealId}`,
  };

  // 1. Create NOTE with HTML report
  if (options.createNote) {
    const noteBody = formatReportHtml(report);
    const noteResponse = await hubspotClient.crm.objects.notes.basicApi.create({
      properties: {
        hs_note_body: noteBody,
        hs_timestamp: new Date().toISOString(),
        hubspot_owner_id: config.hubspot.defaultOwnerId,
      } as any,
      associations: [
        {
          to: { id: dealId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED" as any,
              associationTypeId: 214, // note_to_deal
            },
          ],
        },
      ],
    } as any);
    result.noteId = noteResponse.id;
  }

  // 2. Log CALL activity
  if (options.logCall) {
    const callBody = formatReportPlainText(report);
    const customerName = report.attendees.find(
      (a) => !a.company?.toLowerCase().includes("westrock")
    )?.company || "Customer";

    const callResponse = await hubspotClient.crm.objects.calls.basicApi.create({
      properties: {
        hs_call_title: `Call Report: ${customerName} - ${report.callDate}`,
        hs_call_body: callBody,
        hs_call_direction: "OUTBOUND",
        hs_call_status: "COMPLETED",
        hs_timestamp: new Date().toISOString(),
        hubspot_owner_id: config.hubspot.defaultOwnerId,
      } as any,
      associations: [
        {
          to: { id: dealId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED" as any,
              associationTypeId: 206, // call_to_deal
            },
          ],
        },
      ],
    } as any);
    result.callId = callResponse.id;
  }

  // 3. Update deal properties
  if (options.updateDeal && options.dealUpdates) {
    const updates: Record<string, string> = {};
    if (options.dealUpdates.next_step) updates.next_step = options.dealUpdates.next_step;
    if (options.dealUpdates.dealstage) updates.dealstage = options.dealUpdates.dealstage;
    if (options.dealUpdates.probability_of_closing) {
      updates.probability_of_closing = options.dealUpdates.probability_of_closing;
    }
    if (options.dealUpdates.competitive_coffee_pricing) {
      updates.competitive_coffee_pricing = options.dealUpdates.competitive_coffee_pricing;
    }

    if (Object.keys(updates).length > 0) {
      await hubspotClient.crm.deals.basicApi.update(dealId, { properties: updates });
      result.dealUpdated = true;
    }
  }

  return result;
}
