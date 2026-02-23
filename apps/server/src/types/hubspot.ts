export interface HubSpotDeal {
  id: string;
  properties: Record<string, string | null>;
}

export interface DealSearchResult {
  deals: HubSpotDealSummary[];
  total: number;
}

export interface HubSpotDealSummary {
  id: string;
  dealname: string;
  dealstage: string;
  pipeline: string;
  customer_name: string | null;
  channel: string | null;
  segment_type: string | null;
  amount: string | null;
  closedate: string | null;
  hubspot_owner_id: string | null;
}

export interface HubSpotContact {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  jobtitle: string | null;
  company: string | null;
}

export interface HubSpotCompany {
  id: string;
  name: string | null;
  domain: string | null;
  industry: string | null;
}

export interface DealDetail {
  deal: HubSpotDeal;
  contacts: HubSpotContact[];
  company: HubSpotCompany | null;
}
