import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLlmTimeoutMs, requestChatCompletion } from './llm-http';

describe('llm-http', () => {
  afterEach(() => {
    // 每个用例后还原 fetch 桩和超时环境变量，避免相互污染。
    vi.unstubAllGlobals();
    delete process.env.LLM_REQUEST_TIMEOUT_MS;
  });

  describe('getLlmTimeoutMs', () => {
    it('defaults to 15000ms when unset', () => {
      delete process.env.LLM_REQUEST_TIMEOUT_MS;
      expect(getLlmTimeoutMs()).toBe(15000);
    });

    it('honors a valid positive override', () => {
      process.env.LLM_REQUEST_TIMEOUT_MS = '2000';
      expect(getLlmTimeoutMs()).toBe(2000);
    });

    it('falls back to default for invalid or non-positive values', () => {
      process.env.LLM_REQUEST_TIMEOUT_MS = '-1';
      expect(getLlmTimeoutMs()).toBe(15000);
      process.env.LLM_REQUEST_TIMEOUT_MS = 'abc';
      expect(getLlmTimeoutMs()).toBe(15000);
    });
  });

  describe('requestChatCompletion', () => {
    it('returns the first choice message on success', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
        })),
      );

      const message = await requestChatCompletion({
        baseUrl: 'https://gateway.example.com/v1',
        apiKey: 'replace-with-your-key',
        body: { model: 'x', messages: [] },
      });

      expect(message.content).toBe('hi');
    });

    it('throws a sanitized error with only the status code on non-ok responses', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
          ok: false,
          status: 401,
          json: async () => ({}),
        })),
      );

      // 精确匹配：helper 只把状态码放进错误信息，不读取/拼接任何上游响应体。
      // 这正是不泄漏 Key 或请求回显的关键保证。
      await expect(
        requestChatCompletion({
          baseUrl: 'https://gateway.example.com/v1',
          apiKey: 'replace-with-your-key',
          body: {},
        }),
      ).rejects.toThrow(/^LLM provider request failed: 401$/);
    });

    it('maps an aborted request to a timeout error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          // 模拟 AbortController 触发的中断：fetch 抛出 name 为 AbortError 的错误。
          const error = new Error('aborted');
          error.name = 'AbortError';
          throw error;
        }),
      );

      await expect(
        requestChatCompletion({
          baseUrl: 'https://gateway.example.com/v1',
          apiKey: 'replace-with-your-key',
          body: {},
          timeoutMs: 5,
        }),
      ).rejects.toThrow('LLM provider request timed out');
    });

    it('maps other network errors to a generic sanitized error without leaking details', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          // 底层网络错误可能含内网 IP/host，断言它不会进入对外错误信息。
          throw new Error('ECONNREFUSED 10.0.0.1:443');
        }),
      );

      await expect(
        requestChatCompletion({
          baseUrl: 'https://gateway.example.com/v1',
          apiKey: 'replace-with-your-key',
          body: {},
        }),
      ).rejects.toThrow(/^LLM provider request failed$/);
    });
  });
});
