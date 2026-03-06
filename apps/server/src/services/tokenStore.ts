import Redis from "ioredis";
import { config } from "../config.js";
import { UserToken } from "../types/auth.js";

export interface TokenStore {
  get(id: string): Promise<UserToken | undefined>;
  set(id: string, token: UserToken): Promise<void>;
  delete(id: string): Promise<void>;
}

// ---------- In-memory store (development) ----------

class MemoryTokenStore implements TokenStore {
  private tokens = new Map<string, UserToken>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(ttlMs: number) {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, token] of this.tokens) {
        if (now - new Date(token.createdAt).getTime() > ttlMs) {
          this.tokens.delete(id);
        }
      }
    }, 60_000);
  }

  async get(id: string) {
    return this.tokens.get(id);
  }

  async set(id: string, token: UserToken) {
    this.tokens.set(id, token);
  }

  async delete(id: string) {
    this.tokens.delete(id);
  }
}

// ---------- Redis store (production) ----------

class RedisTokenStore implements TokenStore {
  private redis: Redis;
  private ttlSeconds: number;
  private prefix = "token:";

  constructor(redisUrl: string, ttlMs: number) {
    this.redis = new Redis(redisUrl);
    this.ttlSeconds = Math.ceil(ttlMs / 1000);

    this.redis.on("error", (err) => {
      console.error("Redis token store connection error:", err.message);
    });

    this.redis.on("connect", () => {
      console.log("Token store connected to Redis");
    });
  }

  async get(id: string): Promise<UserToken | undefined> {
    const data = await this.redis.get(this.prefix + id);
    if (!data) return undefined;
    return JSON.parse(data) as UserToken;
  }

  async set(id: string, token: UserToken): Promise<void> {
    await this.redis.set(
      this.prefix + id,
      JSON.stringify(token),
      "EX",
      this.ttlSeconds
    );
  }

  async delete(id: string): Promise<void> {
    await this.redis.del(this.prefix + id);
  }
}

// ---------- Factory ----------

export function createTokenStore(): TokenStore {
  const ttlMs = config.auth.tokenTtlMs;

  if (config.redis.url) {
    console.log("Using Redis token store");
    return new RedisTokenStore(config.redis.url, ttlMs);
  }

  console.log("Using in-memory token store (set REDIS_URL for production)");
  return new MemoryTokenStore(ttlMs);
}
