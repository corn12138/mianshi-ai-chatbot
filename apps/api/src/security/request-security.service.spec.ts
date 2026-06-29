import { UnauthorizedException } from '@nestjs/common';
import { afterEach, describe, expect, it } from 'vitest';
import { RequestSecurityService } from './request-security.service';

describe('RequestSecurityService', () => {
  afterEach(() => {
    delete process.env.API_BEARER_TOKEN;
  });

  it('allows anonymous demo identity when no bearer token is configured', () => {
    const service = new RequestSecurityService();
    const identity = service.resolveIdentity({ ip: '127.0.0.1', headers: {} });

    expect(identity).toEqual({
      userId: 'anonymous:127.0.0.1',
      ip: '127.0.0.1',
      authenticated: false,
      authSource: 'anonymous-demo',
    });
  });

  it('requires a matching bearer token when configured', () => {
    process.env.API_BEARER_TOKEN = 'local-demo-token';
    const service = new RequestSecurityService();

    expect(() => service.resolveIdentity({ ip: '127.0.0.1', headers: {} })).toThrow(UnauthorizedException);
    expect(() =>
      service.resolveIdentity({
        ip: '127.0.0.1',
        headers: { authorization: 'Bearer wrong-token' },
      }),
    ).toThrow(UnauthorizedException);

    const identity = service.resolveIdentity({
      ip: '127.0.0.1',
      headers: { authorization: 'Bearer local-demo-token' },
    });

    expect(identity.authenticated).toBe(true);
    expect(identity.authSource).toBe('bearer-token');
  });

  it('uses x-forwarded-for as the client IP hook for gateway deployments', () => {
    const service = new RequestSecurityService();
    const identity = service.resolveIdentity({
      ip: '10.0.0.2',
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.2' },
    });

    expect(identity.ip).toBe('203.0.113.10');
  });
});
