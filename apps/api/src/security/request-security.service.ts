import { Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

export interface ChatHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

export interface RequestIdentity {
  userId: string;
  ip: string;
  authenticated: boolean;
  authSource: 'anonymous-demo' | 'bearer-token';
}

@Injectable()
export class RequestSecurityService {
  resolveIdentity(request: ChatHttpRequest): RequestIdentity {
    const ip = this.resolveClientIp(request);
    const configuredToken = process.env.API_BEARER_TOKEN?.trim();

    // 未配置 API_BEARER_TOKEN 时保持开放题的零配置演示体验；配置后即启用服务端 Bearer 校验。
    if (!configuredToken) {
      return {
        userId: `anonymous:${ip}`,
        ip,
        authenticated: false,
        authSource: 'anonymous-demo',
      };
    }

    const providedToken = this.extractBearerToken(request.headers);
    if (!providedToken || !this.safeEqual(providedToken, configuredToken)) {
      throw new UnauthorizedException('valid bearer token is required');
    }

    return {
      userId: 'bearer-token-user',
      ip,
      authenticated: true,
      authSource: 'bearer-token',
    };
  }

  private resolveClientIp(request: ChatHttpRequest): string {
    const forwardedFor = this.header(request.headers, 'x-forwarded-for');
    if (forwardedFor) {
      // 网关场景通常把原始 IP 放在第一个位置；生产中应由可信代理层规范化。
      return forwardedFor.split(',')[0]?.trim() || 'unknown';
    }

    return request.ip?.trim() || 'unknown';
  }

  private extractBearerToken(headers?: Record<string, string | string[] | undefined>): string | undefined {
    const authorization = this.header(headers, 'authorization');
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim();
  }

  private header(headers: Record<string, string | string[] | undefined> | undefined, name: string): string | undefined {
    if (!headers) return undefined;

    const direct = headers[name];
    if (typeof direct === 'string') return direct;
    if (Array.isArray(direct)) return direct[0];

    const foundKey = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
    const value = foundKey ? headers[foundKey] : undefined;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}
