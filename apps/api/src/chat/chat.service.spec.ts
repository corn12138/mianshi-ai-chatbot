import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ChatService } from './chat.service';
import { InMemorySessionStore } from '../session/in-memory-session.store';
import { MockLlmProvider } from '../llm/mock-llm.provider';
import { LlmConcurrencyLimiter } from '../llm/llm-concurrency-limiter';
import type { LlmPlan, LlmProvider } from '../llm/llm-provider.interface';
import { ToolRouter } from '../tools/tool-router';
import { ToolRegistry } from '../tools/tool-registry';

function createService() {
  return new ChatService(
    new InMemorySessionStore(),
    new MockLlmProvider(),
    new LlmConcurrencyLimiter(),
    new ToolRouter(),
    new ToolRegistry(),
  );
}

class BlockingLlmProvider implements LlmProvider {
  readonly mode = 'llm' as const;
  readonly info = {
    name: 'openai-compatible' as const,
    label: 'Blocking Gateway',
    model: 'slow-model',
    baseUrl: 'https://gateway.example.com/v1',
  };

  constructor(
    private readonly onPlanStarted: () => void,
    private readonly waitForRelease: () => Promise<void>,
  ) {}

  async plan(): Promise<LlmPlan> {
    this.onPlanStarted();
    await this.waitForRelease();
    return { directReply: '慢请求完成' };
  }

  async composeReply(): Promise<string> {
    return '慢请求完成';
  }
}

// 模拟一个总是失败的真实 provider，用来验证超时/错误的脱敏与兜底行为。
// 抛出的文本已是 llm-http 的标准化安全消息（不含 Key/响应体）。
class FailingLlmProvider implements LlmProvider {
  readonly mode = 'llm' as const;
  readonly info = {
    name: 'openai-compatible' as const,
    label: 'Failing Gateway',
    model: 'broken-model',
    baseUrl: 'https://gateway.example.com/v1',
  };

  async plan(): Promise<LlmPlan> {
    throw new Error('LLM provider request timed out');
  }

  async composeReply(): Promise<string> {
    throw new Error('LLM provider request timed out');
  }
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

  it('covers richer mock policy topics in the final assistant reply', async () => {
    const service = createService();

    const response = await service.chat({ message: '福利和五险一金怎么查？' });

    expect(response.toolCalls[0]?.name).toBe('lookup_hr_policy');
    expect(response.toolCalls[0]?.arguments).toEqual({ topic: 'benefits' });
    expect(response.reply).toContain('五险一金');
    expect(response.reply).toContain('年度体检');
  });

  it('includes calculator tool results in the final assistant reply', async () => {
    const service = createService();

    const response = await service.chat({ message: '帮我计算 128*7+36' });

    expect(response.toolCalls[0]?.name).toBe('calculate_expression');
    expect(response.reply).toContain('128*7+36 = 932');
  });

  it('rejects blank messages', async () => {
    const service = createService();

    await expect(service.chat({ message: '   ' })).rejects.toThrow('message is required');
  });

  it('returns a sanitized 503 and does not pollute history when the provider fails', async () => {
    // 默认不开启兜底：真实模型失败时应抛出稳定的 503，而不是 500。
    delete process.env.LLM_FALLBACK_TO_MOCK;
    const sessions = new InMemorySessionStore();
    const service = new ChatService(
      sessions,
      new FailingLlmProvider(),
      new LlmConcurrencyLimiter(),
      new ToolRouter(),
      new ToolRegistry(),
    );

    const sessionId = 'test-session-failure';

    let caught: unknown;
    try {
      await service.chat({ sessionId, message: '现在几点？' });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ServiceUnavailableException);
    // 错误信息必须是脱敏文本，不能泄漏 Key 或上游响应体。
    expect((caught as Error).message).toBe('LLM provider request timed out');
    // 失败这一轮的 user/assistant 消息不能写入历史。
    expect(sessions.getMessages(sessionId)).toHaveLength(0);
  });

  it('falls back to mock when LLM_FALLBACK_TO_MOCK=true', async () => {
    process.env.LLM_FALLBACK_TO_MOCK = 'true';
    try {
      const sessions = new InMemorySessionStore();
      const service = new ChatService(
        sessions,
        new FailingLlmProvider(),
        new LlmConcurrencyLimiter(),
        new ToolRouter(),
        new ToolRegistry(),
      );

      const response = await service.chat({ message: '公司年假政策是什么？' });

      // 兜底后由本地 mock 产出，mode/provider 如实显示 mock，而不是伪装成真实模型。
      expect(response.mode).toBe('mock');
      expect(response.provider.name).toBe('mock');
      // 工具仍由本地路由触发，结果进入最终回复，演示链路不中断。
      expect(response.toolCalls[0]?.name).toBe('lookup_hr_policy');
      expect(response.reply).toContain('年假政策');
      expect(response.messages).toHaveLength(2);
    } finally {
      delete process.env.LLM_FALLBACK_TO_MOCK;
    }
  });

  it('rejects concurrent real LLM requests for the same session', async () => {
    let releasePlan!: () => void;
    let resolvePlanStarted!: () => void;
    const planStarted = new Promise<void>((resolve) => {
      resolvePlanStarted = resolve;
    });
    const releaseSignal = new Promise<void>((resolve) => {
      releasePlan = resolve;
    });

    const sessions = new InMemorySessionStore();
    const limiter = new LlmConcurrencyLimiter({ maxGlobalRequests: 10, maxSessionRequests: 1 });
    const service = new ChatService(
      sessions,
      new BlockingLlmProvider(resolvePlanStarted, () => releaseSignal),
      limiter,
      new ToolRouter(),
      new ToolRegistry(),
    );

    const first = service.chat({ sessionId: 'web_concurrent', message: '你好' });
    await planStarted;

    await expect(service.chat({ sessionId: 'web_concurrent', message: '第二个请求' })).rejects.toThrow(
      'session LLM concurrency limit exceeded',
    );

    releasePlan();
    await expect(first).resolves.toMatchObject({
      sessionId: 'web_concurrent',
      reply: '慢请求完成',
    });
  });
});
