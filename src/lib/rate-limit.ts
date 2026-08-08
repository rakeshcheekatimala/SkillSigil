import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitResult = { success: boolean; remaining: number };

const memory = new Map<string, { count: number; reset: number }>();

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number,
): LimitResult {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.reset < now) {
    memory.set(key, { count: 1, reset: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }
  entry.count += 1;
  return { success: true, remaining: limit - entry.count };
}

export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<LimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const redis = new Redis({ url, token });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        opts.limit,
        `${Math.ceil(opts.windowMs / 1000)} s`,
      ),
      prefix: "skillsigil",
    });
    const res = await limiter.limit(key);
    return { success: res.success, remaining: res.remaining };
  }

  return memoryLimit(key, opts.limit, opts.windowMs);
}
