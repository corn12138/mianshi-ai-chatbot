import { Injectable } from '@nestjs/common';
import { readPositiveIntEnv } from '../config/runtime-config';
import type { ChatMessage } from '../chat/types';

interface StoredSession {
  messages: ChatMessage[];
  updatedAt: number;
}

export interface InMemorySessionStoreOptions {
  ttlMs: number;
  maxSessions: number;
  maxMessagesPerSession: number;
}

export function getSessionStoreOptions(): InMemorySessionStoreOptions {
  return {
    ttlMs: readPositiveIntEnv('SESSION_TTL_MS', 2 * 60 * 60 * 1000),
    maxSessions: readPositiveIntEnv('SESSION_MAX_COUNT', 1000),
    maxMessagesPerSession: readPositiveIntEnv('SESSION_MAX_MESSAGES', 40),
  };
}

@Injectable()
export class InMemorySessionStore {
  // MVP 使用进程内 Map，避免引入数据库；TTL 和容量限制用于防止本地演示服务被无限撑大。
  private readonly sessions = new Map<string, StoredSession>();

  constructor(
    private readonly options: InMemorySessionStoreOptions = getSessionStoreOptions(),
    private readonly now: () => number = () => Date.now(),
  ) {}

  resolveSessionId(sessionId?: string): string {
    this.cleanupExpired();

    // 如果前端没有传 sessionId，后端生成一个可用于 curl 的临时会话。
    const id = sessionId?.trim() || `session_${crypto.randomUUID()}`;
    if (!this.sessions.has(id)) {
      this.ensureCapacityForNewSession();
      this.sessions.set(id, { messages: [], updatedAt: this.now() });
    }

    return id;
  }

  getMessages(sessionId: string): ChatMessage[] {
    const session = this.getActiveSession(sessionId);
    if (!session) return [];

    session.updatedAt = this.now();
    // 返回副本，避免调用方直接修改 Map 中保存的历史消息。
    return [...session.messages];
  }

  appendMessages(sessionId: string, messages: ChatMessage[]) {
    const session = this.getActiveSession(sessionId) ?? this.createSession(sessionId);

    // 追加而不是覆盖，保证多轮上下文可被后续问题读取。
    session.messages = [...session.messages, ...messages].slice(-this.options.maxMessagesPerSession);
    session.updatedAt = this.now();
  }

  private createSession(sessionId: string): StoredSession {
    this.cleanupExpired();
    this.ensureCapacityForNewSession();

    const session = { messages: [], updatedAt: this.now() };
    this.sessions.set(sessionId, session);
    return session;
  }

  private getActiveSession(sessionId: string): StoredSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    if (this.isExpired(session)) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    return session;
  }

  private cleanupExpired() {
    for (const [sessionId, session] of this.sessions) {
      if (this.isExpired(session)) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private ensureCapacityForNewSession() {
    while (this.sessions.size >= this.options.maxSessions) {
      const oldestSessionId = this.findOldestSessionId();
      if (!oldestSessionId) return;
      this.sessions.delete(oldestSessionId);
    }
  }

  private findOldestSessionId(): string | undefined {
    let oldestSessionId: string | undefined;
    let oldestUpdatedAt = Number.POSITIVE_INFINITY;

    for (const [sessionId, session] of this.sessions) {
      if (session.updatedAt < oldestUpdatedAt) {
        oldestUpdatedAt = session.updatedAt;
        oldestSessionId = sessionId;
      }
    }

    return oldestSessionId;
  }

  private isExpired(session: StoredSession): boolean {
    return this.now() - session.updatedAt >= this.options.ttlMs;
  }
}
