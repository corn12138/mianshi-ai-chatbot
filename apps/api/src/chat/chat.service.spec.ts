import { describe, expect, it } from 'vitest';
import { ChatService } from './chat.service';
import { InMemorySessionStore } from '../session/in-memory-session.store';
import { MockLlmProvider } from '../llm/mock-llm.provider';
import { ToolRouter } from '../tools/tool-router';
import { ToolRegistry } from '../tools/tool-registry';

describe('ChatService', () => {
  it('keeps context and returns tool results', async () => {
    const service = new ChatService(
      new InMemorySessionStore(),
      new MockLlmProvider(),
      new ToolRouter(),
      new ToolRegistry(),
    );

    const first = await service.chat({ message: '公司年假政策是什么？' });
    expect(first.toolCalls[0]?.name).toBe('lookup_hr_policy');
    expect(first.messages).toHaveLength(2);

    const second = await service.chat({
      sessionId: first.sessionId,
      message: '那远程办公呢？',
    });
    expect(second.sessionId).toBe(first.sessionId);
    expect(second.messages).toHaveLength(4);
    expect(second.toolCalls[0]?.name).toBe('lookup_hr_policy');
  });
});
