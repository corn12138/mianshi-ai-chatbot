import type { ChatMessage } from '../chat/types';
import type { ToolIntent, ToolName } from '../tools/tools.types';
import type { ComposeReplyInput, LlmPlan, LlmPlanInput, LlmProvider } from './llm-provider.interface';

type DeepSeekMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type DeepSeekToolCall = {
  function?: {
    name?: string;
    arguments?: string;
  };
};

type DeepSeekTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: DeepSeekToolCall[];
    };
  }>;
};

export class DeepSeekProvider implements LlmProvider {
  readonly mode = 'llm' as const;
  private readonly apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.DeepSeek_KEY;
  private readonly baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
  private readonly model = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash';
  private readonly thinking = process.env.DEEPSEEK_THINKING ?? 'disabled';
  readonly info = {
    name: 'deepseek',
    label: 'DeepSeek',
    model: this.model,
    baseUrl: this.baseUrl,
  } as const;

  async plan(input: LlmPlanInput): Promise<LlmPlan> {
    const message = await this.chat(
      [
        {
          role: 'system',
          content:
            '你是一个面向内部员工的 AI 助手。请用中文简洁回答。若用户问题需要查询内部政策、创建待办或查询当前时间，请优先调用可用工具；否则直接回答。',
        },
        ...this.toDeepSeekHistory(input.history),
        { role: 'user', content: input.message },
      ],
      this.toolSchemas(),
    );

    return {
      directReply: message.content?.trim(),
      toolIntents: this.toToolIntents(message.tool_calls ?? []),
    };
  }

  async composeReply(input: ComposeReplyInput): Promise<string> {
    if (input.toolCalls.length === 0) {
      return input.directReply ?? '收到。';
    }

    const toolSummary = input.toolCalls
      .map((toolCall) => {
        const status = toolCall.ok ? '成功' : '失败';
        return `${toolCall.name} ${status}: ${toolCall.result}`;
      })
      .join('\n');

    return this.complete([
      {
        role: 'system',
        content:
          '你是内部员工 AI 助手。请基于工具结果回答用户，不能编造工具结果之外的事实。回答中需要说明调用了哪个工具，并把工具结果自然融入最终答复。',
      },
      ...this.toDeepSeekHistory(input.history),
      { role: 'user', content: input.message },
      {
        role: 'system',
        content: `本轮本地工具执行结果如下：\n${toolSummary}`,
      },
    ]);
  }

  private toolSchemas(): DeepSeekTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'lookup_hr_policy',
          description: '查询 mock HR/IT 内部政策。',
          parameters: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                enum: ['annual_leave', 'expense', 'remote_work', 'it_support'],
                description: '政策主题。',
              },
            },
            required: ['topic'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_todo',
          description: '创建一个 mock 待办事项。',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '待办标题。' },
              dueDate: { type: 'string', description: '可选截止时间。' },
            },
            required: ['title'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_current_time',
          description: '查询当前时间。',
          parameters: {
            type: 'object',
            properties: {
              timezone: {
                type: 'string',
                description: 'IANA timezone，默认 Asia/Shanghai。',
              },
            },
          },
        },
      },
    ];
  }

  private toToolIntents(toolCalls: DeepSeekToolCall[]): ToolIntent[] {
    return toolCalls
      .map((toolCall) => {
        const name = toolCall.function?.name;
        if (!this.isToolName(name)) {
          return undefined;
        }

        return {
          name,
          arguments: this.parseArguments(toolCall.function?.arguments),
        };
      })
      .filter((toolCall): toolCall is ToolIntent => toolCall !== undefined);
  }

  private isToolName(value: unknown): value is ToolName {
    return value === 'lookup_hr_policy' || value === 'create_todo' || value === 'get_current_time';
  }

  private parseArguments(value?: string) {
    if (!value) return {};

    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  private toDeepSeekHistory(history: ChatMessage[]): DeepSeekMessage[] {
    return history
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-12)
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }));
  }

  private async complete(messages: DeepSeekMessage[]) {
    const message = await this.chat(messages);
    return message.content?.trim() || 'DeepSeek 没有返回内容。';
  }

  private async chat(messages: DeepSeekMessage[], tools?: DeepSeekTool[]) {
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY or DeepSeek_KEY is required for deepseek mode');
    }

    console.info(`[llm] provider=deepseek model=${this.model} endpoint=${this.baseUrl}/chat/completions tools=${tools ? 'auto' : 'none'}`);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        ...(tools ? { tools, tool_choice: 'auto' } : {}),
        stream: false,
        thinking: { type: this.thinking },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek request failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    return data.choices?.[0]?.message ?? {};
  }
}
