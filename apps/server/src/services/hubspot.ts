import { Client } from "@hubspot/api-client";
import type {
  DealSearchResult,
  HubSpotDealSummary,
  DealDetail,
  HubSpotContact,
  HubSpotCompany,
  HubSpotNote,
  HubSpotCall,
} from "../types/hubspot.js";
import type { DealContext, ContactSummary, NoteSummary } from "../types/interview.js";
import type { StructuredReport, UploadOptions, UploadResult } from "../types/report.js";
import { formatReportHtml, formatReportPlainText } from "./reportFormatter.js";

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
  client: Client,
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

  try {
    // Primary search: use HubSpot's native `query` parameter which searches
    // default deal properties (dealname, pipeline, dealstage, description).
    const searchRequest: any = {
      properties: DEAL_PROPERTIES,
      limit,
      after: offset > 0 ? String(offset) : undefined,
      sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
    };

    if (query) {
      searchRequest.query = query;
    }

    if (filterGroups.length > 0) {
      searchRequest.filterGroups = filterGroups;
    }

    console.log("[searchDeals] Searching with:", JSON.stringify({
      query: query || "(empty)",
      hasFilterGroups: filterGroups.length > 0,
      limit,
      offset,
    }));

    const response = await client.crm.deals.searchApi.doSearch(searchRequest);

    console.log("[searchDeals] Got", response.results?.length || 0, "results, total:", response.total);

    let results = response.results || [];

    // If the primary search returned 0 results and we have a query,
    // try a fallback search using CONTAINS_TOKEN on customer_name
    // (custom property not covered by HubSpot's full-text query).
    if (results.length === 0 && query) {
      try {
        console.log("[searchDeals] Trying fallback search on customer_name...");
        const fallbackGroups: any[] = [{
          filters: [
            { propertyName: "customer_name", operator: "CONTAINS_TOKEN", value: query },
          ],
        }];

        if (ownerId) {
          fallbackGroups[0].filters.push(
            { propertyName: "hubspot_owner_id", operator: "EQ", value: ownerId }
          );
        }

        const fallbackResponse = await client.crm.deals.searchApi.doSearch({
          filterGroups: fallbackGroups,
          properties: DEAL_PROPERTIES,
          limit,
          after: offset > 0 ? String(offset) : undefined,
          sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
        } as any);

        if ((fallbackResponse.results || []).length > 0) {
          console.log("[searchDeals] Fallback found", fallbackResponse.results!.length, "results");
          results = fallbackResponse.results || [];
        }
      } catch (fallbackErr: any) {
        // customer_name property may not exist — silently skip fallback
        console.log("[searchDeals] Fallback search skipped:", fallbackErr?.message);
      }
    }

    const deals: HubSpotDealSummary[] = results.map((d: any) => ({
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

    return { deals, total: response.total || deals.length };
  } catch (err: any) {
    console.error("[searchDeals] HubSpot search error:", err?.message || err);
    if (err?.body) {
      try {
        const body = typeof err.body === "string" ? JSON.parse(err.body) : err.body;
        console.error("[searchDeals] Error body:", JSON.stringify(body));
      } catch {}
    }
    throw err;
  }
}

/** Strip HTML tags from a string, returning plain text. */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function getDeal(client: Client, dealId: string): Promise<DealDetail> {
  const deal = await client.crm.deals.basicApi.getById(dealId, DEAL_PROPERTIES);

  // Fetch contacts, company, notes, and calls associations in parallel
  const [contacts, company, notes, calls] = await Promise.all([
    // Fetch associated contacts
    (async (): Promise<HubSpotContact[]> => {
      try {
        const assocResponse = await client.apiRequest({
          method: "GET",
          path: `/crm/v3/objects/deals/${dealId}/associations/contacts`,
        });
        const assocData: any = await assocResponse.json();
        if (assocData.results && assocData.results.length > 0) {
          const contactIds = assocData.results.map((a: any) => a.toObjectId || a.id);
          const contactsResponse = await client.crm.contacts.batchApi.read({
            inputs: contactIds.map((id: string) => ({ id })),
            properties: ["firstname", "lastname", "email", "jobtitle", "company"],
            propertiesWithHistory: [],
          });
          return (contactsResponse.results || []).map((c: any) => ({
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
      return [];
    })(),
    // Fetch associated company
    (async (): Promise<HubSpotCompany | null> => {
      try {
        const compAssocResponse = await client.apiRequest({
          method: "GET",
          path: `/crm/v3/objects/deals/${dealId}/associations/companies`,
        });
        const compAssocData: any = await compAssocResponse.json();
        if (compAssocData.results && compAssocData.results.length > 0) {
          const compId = compAssocData.results[0].toObjectId || compAssocData.results[0].id;
          const compResponse = await client.crm.companies.basicApi.getById(
            compId,
            ["name", "domain", "industry"]
          );
          return {
            id: compResponse.id,
            name: compResponse.properties.name || null,
            domain: compResponse.properties.domain || null,
            industry: compResponse.properties.industry || null,
          };
        }
      } catch {
        // No associated company
      }
      return null;
    })(),
    // Fetch associated notes
    (async (): Promise<HubSpotNote[]> => {
      try {
        const assocResponse = await client.apiRequest({
          method: "GET",
          path: `/crm/v3/objects/deals/${dealId}/associations/notes`,
        });
        const assocData: any = await assocResponse.json();
        if (assocData.results && assocData.results.length > 0) {
          const noteIds = assocData.results
            .map((a: any) => a.toObjectId || a.id)
            .slice(0, 10); // Cap at 10 most recent
          const notesResponse = await client.apiRequest({
            method: "POST",
            path: "/crm/v3/objects/notes/batch/read",
            body: {
              inputs: noteIds.map((id: string) => ({ id })),
              properties: ["hs_note_body", "hs_timestamp"],
            },
          });
          const notesData: any = await notesResponse.json();
          return (notesData.results || [])
            .map((n: any) => ({
              id: n.id,
              body: stripHtml(n.properties.hs_note_body || ""),
              createdAt: n.properties.hs_timestamp || n.createdAt || "",
            }))
            .filter((n: HubSpotNote) => n.body.length > 0)
            .sort((a: HubSpotNote, b: HubSpotNote) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
      } catch (err) {
        console.log("[getDeal] Notes fetch skipped:", (err as any)?.message);
      }
      return [];
    })(),
    // Fetch associated calls
    (async (): Promise<HubSpotCall[]> => {
      try {
        const assocResponse = await client.apiRequest({
          method: "GET",
          path: `/crm/v3/objects/deals/${dealId}/associations/calls`,
        });
        const assocData: any = await assocResponse.json();
        if (assocData.results && assocData.results.length > 0) {
          const callIds = assocData.results
            .map((a: any) => a.toObjectId || a.id)
            .slice(0, 10); // Cap at 10 most recent
          const callsResponse = await client.apiRequest({
            method: "POST",
            path: "/crm/v3/objects/calls/batch/read",
            body: {
              inputs: callIds.map((id: string) => ({ id })),
              properties: ["hs_call_title", "hs_call_body", "hs_timestamp"],
            },
          });
          const callsData: any = await callsResponse.json();
          return (callsData.results || [])
            .map((c: any) => ({
              id: c.id,
              title: c.properties.hs_call_title || "",
              body: c.properties.hs_call_body || "",
              createdAt: c.properties.hs_timestamp || c.createdAt || "",
            }))
            .filter((c: HubSpotCall) => c.body.length > 0 || c.title.length > 0)
            .sort((a: HubSpotCall, b: HubSpotCall) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
      } catch (err) {
        console.log("[getDeal] Calls fetch skipped:", (err as any)?.message);
      }
      return [];
    })(),
  ]);

  return { deal: { id: deal.id, properties: deal.properties as any }, contacts, company, notes, calls };
}

/** Truncate a string to a max length, adding ellipsis if cut. */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

export function buildDealContext(detail: DealDetail): DealContext {
  const p = detail.deal.properties;

  // Build contact summaries
  const contacts: ContactSummary[] = detail.contacts.map((c) => ({
    name: [c.firstname, c.lastname].filter(Boolean).join(" ") || "Unknown",
    title: c.jobtitle || "",
    email: c.email || "",
  }));

  // Merge notes and calls into a single timeline, sorted by date descending
  const noteSummaries: NoteSummary[] = [];

  for (const note of detail.notes || []) {
    noteSummaries.push({
      date: note.createdAt ? new Date(note.createdAt).toISOString().split("T")[0] : "",
      content: truncate(note.body, 500),
    });
  }

  for (const call of detail.calls || []) {
    const prefix = call.title ? `${call.title}: ` : "Call: ";
    noteSummaries.push({
      date: call.createdAt ? new Date(call.createdAt).toISOString().split("T")[0] : "",
      content: truncate(prefix + call.body, 500),
    });
  }

  // Sort by date descending and cap at 10
  noteSummaries.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  const previousNotes = noteSummaries.slice(0, 10);

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
    description: p.description || "",
    contacts,
    companyName: detail.company?.name || "",
    companyIndustry: detail.company?.industry || "",
    previousNotes,
  };
}

export async function uploadReport(
  client: Client,
  portalId: string,
  ownerId: string,
  dealId: string,
  report: StructuredReport,
  options: UploadOptions
): Promise<UploadResult> {
  const result: UploadResult = {
    dealUpdated: false,
    hubspotUrl: `https://app.hubspot.com/contacts/${portalId}/deal/${dealId}`,
  };

  // 1 & 2. Create NOTE and log CALL in parallel (independent operations)
  const [noteResult, callResult] = await Promise.all([
    options.createNote
      ? (async () => {
          const noteBody = formatReportHtml(report);
          const noteResponse = await client.crm.objects.notes.basicApi.create({
            properties: {
              hs_note_body: noteBody,
              hs_timestamp: new Date().toISOString(),
              hubspot_owner_id: ownerId,
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
          return noteResponse.id;
        })()
      : Promise.resolve(undefined),
    options.logCall
      ? (async () => {
          const callBody = formatReportPlainText(report);
          const customerName = report.attendees.find(
            (a) => !a.company?.toLowerCase().includes("westrock")
          )?.company || "Customer";

          const callResponse = await client.crm.objects.calls.basicApi.create({
            properties: {
              hs_call_title: `Call Report: ${customerName} - ${report.callDate}`,
              hs_call_body: callBody,
              hs_call_direction: "OUTBOUND",
              hs_call_status: "COMPLETED",
              hs_timestamp: new Date().toISOString(),
              hubspot_owner_id: ownerId,
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
          return callResponse.id;
        })()
      : Promise.resolve(undefined),
  ]);

  if (noteResult) result.noteId = noteResult;
  if (callResult) result.callId = callResult;

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
      await client.crm.deals.basicApi.update(dealId, { properties: updates });
      result.dealUpdated = true;
    }
  }

  return result;
}
