import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
  redis = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN,
  });
}

export { redis };
