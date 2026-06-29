import type { ComposeReplyInput, LlmPlan, LlmPlanInput, LlmProvider } from './llm-provider.interface';

export class OpenAICompatibleProvider implements LlmProvider {
  readonly mode = 'llm' as const;
  private readonly baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  private readonly model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  private readonly apiKey = process.env.OPENAI_API_KEY;

  async plan(input: LlmPlanInput): Promise<LlmPlan> {
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
      return input.directReply ?? '收到。';
    }

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
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required for openai-compatible mode');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content?.trim() || '模型没有返回内容。';
  }
}
