import { FastifyInstance } from "fastify";
import { searchDeals, getDeal } from "../services/hubspot.js";
import { config } from "../config.js";

export async function dealsRoutes(app: FastifyInstance) {
  // Search deals
  app.get<{
    Querystring: { q?: string; ownerId?: string; limit?: string; offset?: string };
  }>("/api/deals", async (request, reply) => {
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
    const detail = await getDeal(request.params.id);
    return detail;
  });
}
