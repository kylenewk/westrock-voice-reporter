export interface UserToken {
  /** Server-issued opaque auth token (the key) */
  id: string;
  /** HubSpot OAuth access token */
  accessToken: string;
  /** HubSpot OAuth refresh token */
  refreshToken: string;
  /** Epoch ms when access token expires */
  expiresAt: number;
  /** HubSpot portal ID for this user */
  portalId: string;
  /** HubSpot user ID (from token info) */
  hubspotUserId: string;
  /** HubSpot owner ID (if discoverable) */
  hubspotOwnerId?: string;
  /** When this record was created */
  createdAt: string;
  /** When tokens were last refreshed */
  updatedAt: string;
}
