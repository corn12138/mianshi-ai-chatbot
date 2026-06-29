import { describe, expect, it } from 'vitest';
import { InMemorySessionStore } from './in-memory-session.store';
import type { ChatMessage } from '../chat/types';

function message(content: string): ChatMessage {
  return {
    role: 'user',
    content,
    createdAt: '2026-06-29T00:00:00.000Z',
  };
}

describe('InMemorySessionStore', () => {
  it('trims old messages when a session exceeds the configured capacity', () => {
    const store = new InMemorySessionStore({
      ttlMs: 1000,
      maxSessions: 10,
      maxMessagesPerSession: 3,
    });

    const sessionId = store.resolveSessionId('web_1');
    store.appendMessages(sessionId, [message('1'), message('2'), message('3'), message('4')]);

    expect(store.getMessages(sessionId).map((item) => item.content)).toEqual(['2', '3', '4']);
  });

  it('expires idle sessions by TTL', () => {
    let now = 0;
    const store = new InMemorySessionStore(
      {
        ttlMs: 1000,
        maxSessions: 10,
        maxMessagesPerSession: 10,
      },
      () => now,
    );

    const sessionId = store.resolveSessionId('web_1');
    store.appendMessages(sessionId, [message('hello')]);

    now = 1000;
    expect(store.getMessages(sessionId)).toEqual([]);
  });

  it('evicts the least recently updated session when the store is full', () => {
    let now = 0;
    const store = new InMemorySessionStore(
      {
        ttlMs: 10_000,
        maxSessions: 2,
        maxMessagesPerSession: 10,
      },
      () => now,
    );

    store.resolveSessionId('web_1');
    now = 1;
    store.resolveSessionId('web_2');
    now = 2;
    store.resolveSessionId('web_3');

    expect(store.getMessages('web_1')).toEqual([]);
    expect(store.resolveSessionId('web_2')).toBe('web_2');
    expect(store.resolveSessionId('web_3')).toBe('web_3');
  });
});
