import type { ComposeReplyInput, LlmPlan, LlmPlanInput, LlmProvider } from './llm-provider.interface';
import { requestChatCompletion } from './llm-http';

// 通用 OpenAI-compatible provider 用于展示扩展能力，不影响默认 mock MVP。
// 它是“多模型 / 中转站 / 公司内部网关”的统一接入点：任何暴露
// OpenAI 兼容 /chat/completions 的服务（OpenAI、One API、LiteLLM、OpenRouter、
// 内部网关等）都可以通过 OPENAI_BASE_URL 指向，无需为每个网关单独写 provider。
export class OpenAICompatibleProvider implements LlmProvider {
  readonly mode = 'llm' as const;
  private readonly baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  private readonly model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  private readonly apiKey = process.env.OPENAI_API_KEY;
  // OPENAI_PROVIDER_LABEL 让前端模式徽标显示具体网关名（如 Company Gateway），
  // 这样评审能直观看出当前接的是哪条链路；缺省时退回中性的 "OpenAI Compatible"。
  private readonly providerLabel = process.env.OPENAI_PROVIDER_LABEL ?? 'OpenAI Compatible';
  readonly info = {
    // name 固定为 openai-compatible，保持前后端契约稳定；区分网关靠 label。
    name: 'openai-compatible',
    label: this.providerLabel,
    model: this.model,
    baseUrl: this.baseUrl,
  } as const;

  async plan(input: LlmPlanInput): Promise<LlmPlan> {
    // 通用 provider 不做 function calling，工具触发交给本地 ToolRouter 保持稳定。
    const content = await this.complete([
      {
        role: 'system',
        content:
          'You are planning an internal employee assistant response. Return a short direct reply only. Local tool routing is handled by the server.',
      },
      ...input.history.map((message) => ({ role: message.role, content: message.content })),
      { role: 'user', content: input.message },
    ]);

    return { directReply: content };
  }

  async composeReply(input: ComposeReplyInput): Promise<string> {
    if (input.toolCalls.length === 0) {
      // 普通对话直接沿用 plan 阶段结果，减少一次模型请求。
      return input.directReply ?? '收到。';
    }

    // 有工具结果时再请求模型总结，确保最终答复包含本地工具事实。
    return this.complete([
      {
        role: 'system',
        content: 'Answer in Chinese. Use the provided tool results as facts and keep the answer concise.',
      },
      { role: 'user', content: input.message },
      {
        role: 'system',
        content: `Tool results:\n${input.toolCalls
          .map((toolCall) => `${toolCall.name}: ${toolCall.result}`)
          .join('\n')}`,
      },
    ]);
  }

  private async complete(messages: Array<{ role: string; content: string }>) {
    // AppModule 已经检查 Key，这里保留 provider 自身的防御式校验。
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required for openai-compatible mode');
    }

    // 统一走 llm-http：带超时、错误脱敏，错误信息不含 Key 或上游响应体。
    const message = await requestChatCompletion({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      body: {
        model: this.model,
        messages,
        temperature: 0.2,
      },
    });

    const content = message.content?.trim();
    if (!content) {
      // 空回复对调用方是一种失败：抛出标准化错误，交给 ChatService 包装成稳定响应。
      throw new Error('LLM provider returned no content');
    }

    return content;
  }
}
