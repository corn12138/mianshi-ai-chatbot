import { Injectable } from '@nestjs/common';
import { RateLimitExceededException } from '../common/rate-limit-exceeded.exception';
import { readPositiveIntEnv } from '../config/runtime-config';

export interface LlmConcurrencyConfig {
  maxGlobalRequests: number;
  maxSessionRequests: number;
}

export function getLlmConcurrencyConfig(): LlmConcurrencyConfig {
  return {
    maxGlobalRequests: readPositiveIntEnv('LLM_MAX_CONCURRENT_REQUESTS', 20),
    maxSessionRequests: readPositiveIntEnv('LLM_MAX_CONCURRENT_REQUESTS_PER_SESSION', 2),
  };
}

@Injectable()
export class LlmConcurrencyLimiter {
  // 当前是单进程 semaphore；生产多实例时应迁移到网关、队列或 Redis 计数器。
  private globalInFlight = 0;
  private readonly sessionInFlight = new Map<string, number>();

  constructor(private readonly config: LlmConcurrencyConfig = getLlmConcurrencyConfig()) {}

  acquire(sessionId: string, mode: 'mock' | 'llm'): () => void {
    // mock 模式不访问外部 provider，不占用真实 LLM 并发预算，避免影响开放题零配置体验。
    if (mode === 'mock') {
      return () => undefined;
    }

    const sessionCount = this.sessionInFlight.get(sessionId) ?? 0;
    if (this.globalInFlight >= this.config.maxGlobalRequests) {
      throw new RateLimitExceededException('LLM concurrency limit exceeded, please retry later');
    }

    if (sessionCount >= this.config.maxSessionRequests) {
      throw new RateLimitExceededException('session LLM concurrency limit exceeded, please retry later');
    }

    this.globalInFlight += 1;
    this.sessionInFlight.set(sessionId, sessionCount + 1);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.globalInFlight = Math.max(0, this.globalInFlight - 1);

      const nextSessionCount = Math.max(0, (this.sessionInFlight.get(sessionId) ?? 1) - 1);
      if (nextSessionCount === 0) {
        this.sessionInFlight.delete(sessionId);
      } else {
        this.sessionInFlight.set(sessionId, nextSessionCount);
      }
    };
  }
}
