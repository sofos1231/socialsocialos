import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';

type Bucket = { tokens: number; lastRefill: number };

@Injectable()
export class RateLimitService {
  private buckets = new Map<string, Bucket>();
  private redis: Redis | null = null;

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) {
      this.redis = new Redis(url);
    }
  }

  // Simple in-memory token bucket. In prod, back with Redis.
  enforce(key: string, limit: number, refillPerSec: number) {
    if (this.redis) {
      // Token bucket using Redis INCR + TTL
      const windowSec = 60;
      const limitPerWindow = 5;
      const redisKey = `rl:${key}`;
      return this.redis.multi()
        .incr(redisKey)
        .expire(redisKey, windowSec, 'NX')
        .exec()
        .then(([[, count]]) => {
          const current = Number(count);
          if (current > limitPerWindow) {
            const retryAfterSec = 30;
            throw new HttpException({ ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' }, details: { retryAfterSec } }, HttpStatus.TOO_MANY_REQUESTS);
          }
        });
    }

    const now = Date.now();
    const bucket = this.buckets.get(key) || { tokens: limit, lastRefill: now };
    // Refill
    const elapsedSec = Math.floor((now - bucket.lastRefill) / 1000);
    if (elapsedSec > 0) {
      bucket.tokens = Math.min(limit, bucket.tokens + elapsedSec * refillPerSec);
      bucket.lastRefill = now;
    }
    if (bucket.tokens <= 0) {
      const retryAfterSec = 1; // minimal backoff
      throw new HttpException({ ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' }, details: { retryAfterSec } }, HttpStatus.TOO_MANY_REQUESTS);
    }
    bucket.tokens -= 1;
    this.buckets.set(key, bucket);
  }
}


