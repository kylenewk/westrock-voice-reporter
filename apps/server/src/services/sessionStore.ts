import Redis from "ioredis";
import { config } from "../config.js";
import { InterviewSession } from "../types/interview.js";

export interface SessionStore {
  get(id: string): Promise<InterviewSession | undefined>;
  set(id: string, session: InterviewSession): Promise<void>;
  delete(id: string): Promise<void>;
}

// ---------- In-memory store (development) ----------

class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, InterviewSession>();
  private lastAccess = new Map<string, number>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(ttlMs: number) {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id] of this.sessions) {
        const lastUsed = this.lastAccess.get(id) || 0;
        if (now - lastUsed > ttlMs) {
          this.sessions.delete(id);
          this.lastAccess.delete(id);
        }
      }
    }, 60_000);
  }

  async get(id: string) {
    const session = this.sessions.get(id);
    if (session) {
      this.lastAccess.set(id, Date.now());
    }
    return session;
  }

  async set(id: string, session: InterviewSession) {
    this.sessions.set(id, session);
    this.lastAccess.set(id, Date.now());
  }

  async delete(id: string) {
    this.sessions.delete(id);
    this.lastAccess.delete(id);
  }
}

// ---------- Redis store (production) ----------

class RedisSessionStore implements SessionStore {
  private redis: Redis;
  private ttlSeconds: number;
  private prefix = "session:";

  constructor(redisUrl: string, ttlMs: number) {
    this.redis = new Redis(redisUrl);
    this.ttlSeconds = Math.ceil(ttlMs / 1000);

    this.redis.on("error", (err) => {
      console.error("Redis connection error:", err.message);
    });

    this.redis.on("connect", () => {
      console.log("Connected to Redis");
    });
  }

  async get(id: string): Promise<InterviewSession | undefined> {
    const data = await this.redis.get(this.prefix + id);
    if (!data) return undefined;
    return JSON.parse(data) as InterviewSession;
  }

  async set(id: string, session: InterviewSession): Promise<void> {
    await this.redis.set(
      this.prefix + id,
      JSON.stringify(session),
      "EX",
      this.ttlSeconds
    );
  }

  async delete(id: string): Promise<void> {
    await this.redis.del(this.prefix + id);
  }
}

// ---------- Factory ----------

export function createSessionStore(): SessionStore {
  const ttlMs = config.session.ttlMs;

  if (config.redis.url) {
    console.log("Using Redis session store");
    return new RedisSessionStore(config.redis.url, ttlMs);
  }

  console.log("Using in-memory session store (set REDIS_URL for production)");
  return new MemorySessionStore(ttlMs);
}
