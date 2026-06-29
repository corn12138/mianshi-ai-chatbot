import { describe, expect, it } from 'vitest';
import { ChatService } from './chat.service';
import { InMemorySessionStore } from '../session/in-memory-session.store';
import { MockLlmProvider } from '../llm/mock-llm.provider';
import { ToolRouter } from '../tools/tool-router';
import { ToolRegistry } from '../tools/tool-registry';

function createService() {
  return new ChatService(
    new InMemorySessionStore(),
    new MockLlmProvider(),
    new ToolRouter(),
    new ToolRegistry(),
  );
}

describe('ChatService', () => {
  it('keeps multi-turn context across follow-up questions', async () => {
    const service = createService();

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

  it('includes the HR policy tool result in the final assistant reply', async () => {
    const service = createService();

    const response = await service.chat({ message: '公司年假政策是什么？' });

    expect(response.mode).toBe('mock');
    expect(response.provider.name).toBe('mock');
    expect(response.provider.model).toBe('deterministic-local-mock');
    expect(response.reply).toContain('年假政策');
    // The persisted assistant message must carry the same final reply.
    const assistant = response.messages.at(-1);
    expect(assistant?.role).toBe('assistant');
    expect(assistant?.content).toContain('年假政策');
  });

  it('includes the created todo in the final assistant reply', async () => {
    const service = createService();

    const response = await service.chat({
      message: '帮我创建一个待办：明天提交报销',
    });

    expect(response.toolCalls[0]?.name).toBe('create_todo');
    expect(response.reply).toContain('已创建待办');
    expect(response.reply).toContain('明天提交报销');
  });

  it('includes the current-time tool result in the final assistant reply', async () => {
    const service = createService();

    const response = await service.chat({ message: '现在几点？' });

    expect(response.toolCalls[0]?.name).toBe('get_current_time');
    // Assert on the deterministic timezone label, never the exact timestamp.
    expect(response.reply).toContain('Asia/Shanghai');
  });

  it('rejects blank messages', async () => {
    const service = createService();

    await expect(service.chat({ message: '   ' })).rejects.toThrow('message is required');
  });
});
