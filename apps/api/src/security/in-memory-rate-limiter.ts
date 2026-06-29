import { Injectable } from '@nestjs/common';
import { RateLimitExceededException } from '../common/rate-limit-exceeded.exception';
import { readBooleanEnv, readPositiveIntEnv } from '../config/runtime-config';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitCheck {
  ip: string;
  userId: string;
  sessionId?: string;
}

interface RateLimitRule {
  key: string;
  maxRequests: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  ipMaxRequests: number;
  userMaxRequests: number;
  sessionMaxRequests: number;
}

export function getRateLimitConfig(): RateLimitConfig {
  return {
    enabled: readBooleanEnv('RATE_LIMIT_ENABLED', true),
    windowMs: readPositiveIntEnv('RATE_LIMIT_WINDOW_MS', 60_000),
    ipMaxRequests: readPositiveIntEnv('RATE_LIMIT_IP_PER_WINDOW', 120),
    userMaxRequests: readPositiveIntEnv('RATE_LIMIT_USER_PER_WINDOW', 60),
    sessionMaxRequests: readPositiveIntEnv('RATE_LIMIT_SESSION_PER_WINDOW', 30),
  };
}

@Injectable()
export class InMemoryRateLimiter {
  // 进程内限流用于本地 MVP 和单实例演示；多实例部署时应替换为 Redis/网关限流。
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    private readonly config: RateLimitConfig = getRateLimitConfig(),
    private readonly now: () => number = () => Date.now(),
  ) {}

  assertAllowed(check: RateLimitCheck) {
    if (!this.config.enabled) return;

    const rules: RateLimitRule[] = [
      { key: `ip:${check.ip}`, maxRequests: this.config.ipMaxRequests },
      { key: `user:${check.userId}`, maxRequests: this.config.userMaxRequests },
    ];

    if (check.sessionId) {
      rules.push({ key: `session:${check.sessionId}`, maxRequests: this.config.sessionMaxRequests });
    }

    for (const rule of rules) {
      this.assertRuleAllowed(rule);
    }
  }

  private assertRuleAllowed(rule: RateLimitRule) {
    const currentTime = this.now();
    const bucket = this.resolveBucket(rule.key, currentTime);

    if (bucket.count >= rule.maxRequests) {
      throw new RateLimitExceededException('rate limit exceeded, please retry later');
    }

    bucket.count += 1;
  }

  private resolveBucket(key: string, currentTime: number): RateLimitBucket {
    const existing = this.buckets.get(key);
    if (existing && existing.resetAt > currentTime) {
      return existing;
    }

    const created = {
      count: 0,
      resetAt: currentTime + this.config.windowMs,
    };
    this.buckets.set(key, created);
    this.cleanupExpired(currentTime);
    return created;
  }

  private cleanupExpired(currentTime: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= currentTime) {
        this.buckets.delete(key);
      }
    }
  }
}
