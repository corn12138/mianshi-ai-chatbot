import { BadRequestException } from '@nestjs/common';
import { readPositiveIntEnv } from '../config/runtime-config';
import type { ChatRequest } from './types';

// DTO 面向外部 HTTP 入参，字段必须保持 unknown：真实请求不会遵守 TypeScript interface。
export interface ChatRequestDto {
  sessionId?: unknown;
  message?: unknown;
}

const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export interface ChatRequestLimits {
  maxMessageLength: number;
  maxSessionIdLength: number;
}

export function getChatRequestLimits(): ChatRequestLimits {
  return {
    maxMessageLength: readPositiveIntEnv('CHAT_MAX_MESSAGE_LENGTH', 4000),
    maxSessionIdLength: readPositiveIntEnv('CHAT_MAX_SESSION_ID_LENGTH', 128),
  };
}

// 手动校验比只依赖前端按钮更可靠：curl、脚本和异常 payload 都会经过这里。
export function validateChatRequest(body: unknown, limits = getChatRequestLimits()): ChatRequest {
  if (!isRecord(body)) {
    throw new BadRequestException('request body must be a JSON object');
  }

  const rawMessage = body.message;
  if (typeof rawMessage !== 'string') {
    throw new BadRequestException('message must be a string');
  }

  const message = rawMessage.trim();
  if (!message) {
    throw new BadRequestException('message is required');
  }

  if (message.length > limits.maxMessageLength) {
    throw new BadRequestException(`message must be at most ${limits.maxMessageLength} characters`);
  }

  const sessionId = validateOptionalSessionId(body.sessionId, limits.maxSessionIdLength);
  return sessionId ? { sessionId, message } : { message };
}

function validateOptionalSessionId(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('sessionId must be a string');
  }

  const sessionId = value.trim();
  if (!sessionId) {
    return undefined;
  }

  if (sessionId.length > maxLength) {
    throw new BadRequestException(`sessionId must be at most ${maxLength} characters`);
  }

  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new BadRequestException('sessionId may only contain letters, numbers, underscores, and hyphens');
  }

  return sessionId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
