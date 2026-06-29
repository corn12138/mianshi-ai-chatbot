import { Injectable } from '@nestjs/common';
import type { ChatMessage } from '../chat/types';

@Injectable()
export class InMemorySessionStore {
  private readonly sessions = new Map<string, ChatMessage[]>();

  resolveSessionId(sessionId?: string): string {
    const id = sessionId?.trim() || `session_${crypto.randomUUID()}`;
    if (!this.sessions.has(id)) {
      this.sessions.set(id, []);
    }

    return id;
  }

  getMessages(sessionId: string): ChatMessage[] {
    return [...(this.sessions.get(sessionId) ?? [])];
  }

  appendMessages(sessionId: string, messages: ChatMessage[]) {
    const current = this.sessions.get(sessionId) ?? [];
    this.sessions.set(sessionId, [...current, ...messages]);
  }
}
