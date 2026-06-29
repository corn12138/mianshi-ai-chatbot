import { describe, expect, it } from 'vitest';
import { RateLimitExceededException } from '../common/rate-limit-exceeded.exception';
import { LlmConcurrencyLimiter } from './llm-concurrency-limiter';

describe('LlmConcurrencyLimiter', () => {
  it('does not consume concurrency slots in mock mode', () => {
    const limiter = new LlmConcurrencyLimiter({ maxGlobalRequests: 1, maxSessionRequests: 1 });

    const releaseA = limiter.acquire('web_1', 'mock');
    const releaseB = limiter.acquire('web_1', 'mock');

    releaseA();
    releaseB();
    expect(() => limiter.acquire('web_1', 'mock')).not.toThrow();
  });

  it('limits real LLM requests globally and per session', () => {
    const limiter = new LlmConcurrencyLimiter({ maxGlobalRequests: 1, maxSessionRequests: 1 });
    const release = limiter.acquire('web_1', 'llm');

    expect(() => limiter.acquire('web_1', 'llm')).toThrow(RateLimitExceededException);
    expect(() => limiter.acquire('web_2', 'llm')).toThrow(RateLimitExceededException);

    release();
    expect(() => limiter.acquire('web_2', 'llm')).not.toThrow();
  });
});
