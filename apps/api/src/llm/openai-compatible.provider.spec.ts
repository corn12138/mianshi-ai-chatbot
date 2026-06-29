import { afterEach, describe, expect, it } from 'vitest';
import { OpenAICompatibleProvider } from './openai-compatible.provider';

// provider 在构造时读取 process.env，因此每个用例先设环境变量再实例化，最后清理。
describe('OpenAICompatibleProvider', () => {
  afterEach(() => {
    delete process.env.OPENAI_PROVIDER_LABEL;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_MODEL;
  });

  it('defaults the provider label to "OpenAI Compatible"', () => {
    delete process.env.OPENAI_PROVIDER_LABEL;
    const provider = new OpenAICompatibleProvider();
    expect(provider.info.label).toBe('OpenAI Compatible');
    expect(provider.info.name).toBe('openai-compatible');
  });

  it('uses OPENAI_PROVIDER_LABEL so the frontend can show the gateway identity', () => {
    process.env.OPENAI_PROVIDER_LABEL = 'Company Gateway';
    process.env.OPENAI_BASE_URL = 'https://llm-gateway.example.com/v1';
    process.env.OPENAI_MODEL = 'company-chat-model';

    const provider = new OpenAICompatibleProvider();

    expect(provider.info.label).toBe('Company Gateway');
    expect(provider.info.model).toBe('company-chat-model');
    expect(provider.info.baseUrl).toBe('https://llm-gateway.example.com/v1');
    // name 保持稳定，区分不同网关只依赖 label，不破坏前后端契约。
    expect(provider.info.name).toBe('openai-compatible');
  });
});
