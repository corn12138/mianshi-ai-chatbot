import { describe, expect, it } from 'vitest';
import { RateLimitExceededException } from '../common/rate-limit-exceeded.exception';
import { InMemoryRateLimiter } from './in-memory-rate-limiter';

describe('InMemoryRateLimiter', () => {
  it('limits requests by IP, user, and session within the same window', () => {
    let now = 0;
    const limiter = new InMemoryRateLimiter(
      {
        enabled: true,
        windowMs: 1000,
        ipMaxRequests: 10,
        userMaxRequests: 10,
        sessionMaxRequests: 2,
      },
      () => now,
    );

    const check = { ip: '127.0.0.1', userId: 'anonymous:127.0.0.1', sessionId: 'web_1' };
    limiter.assertAllowed(check);
    limiter.assertAllowed(check);
    expect(() => limiter.assertAllowed(check)).toThrow(RateLimitExceededException);

    now = 1001;
    expect(() => limiter.assertAllowed(check)).not.toThrow();
  });

  it('can be disabled for local troubleshooting', () => {
    const limiter = new InMemoryRateLimiter({
      enabled: false,
      windowMs: 1000,
      ipMaxRequests: 0,
      userMaxRequests: 0,
      sessionMaxRequests: 0,
    });

    expect(() =>
      limiter.assertAllowed({ ip: '127.0.0.1', userId: 'anonymous:127.0.0.1', sessionId: 'web_1' }),
    ).not.toThrow();
  });
});
