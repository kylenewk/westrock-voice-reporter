import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter for expensive endpoints.
 * Keyed by IP + path prefix. Not suitable for multi-instance deployments
 * (use Redis-backed rate limiting in production at scale).
 */
const buckets = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) {
      buckets.delete(key);
    }
  }
}, 60_000);

interface RateLimitOpts {
  /** Max requests per window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Route prefix to match (e.g. "/api/interview") */
  prefix: string;
}

function checkRateLimit(
  ip: string,
  opts: RateLimitOpts
): { allowed: boolean; retryAfterMs: number } {
  const key = `${ip}:${opts.prefix}`;
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count < opts.max) {
    entry.count++;
    return { allowed: true, retryAfterMs: 0 };
  }

  return { allowed: false, retryAfterMs: entry.resetAt - now };
}

const RATE_LIMITS: RateLimitOpts[] = [
  { prefix: "/api/interview", max: 30, windowMs: 60_000 },
  { prefix: "/api/tts", max: 60, windowMs: 60_000 },
  { prefix: "/api/report", max: 10, windowMs: 60_000 },
];

async function rateLimitPlugin(app: FastifyInstance) {
  app.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const matchedLimit = RATE_LIMITS.find((rl) =>
        request.url.startsWith(rl.prefix)
      );
      if (!matchedLimit) return;

      const ip = request.ip;
      const { allowed, retryAfterMs } = checkRateLimit(ip, matchedLimit);

      if (!allowed) {
        reply
          .code(429)
          .header("Retry-After", String(Math.ceil(retryAfterMs / 1000)))
          .send({ error: "Too many requests. Please try again later." });
      }
    }
  );
}

export const rateLimit = fp(rateLimitPlugin);
