import type { ChatMessage } from '../chat/types';
import type { ToolIntent, ToolName } from '../tools/tools.types';
import type { ComposeReplyInput, LlmPlan, LlmPlanInput, LlmProvider } from './llm-provider.interface';
import { requestChatCompletion, type ChatCompletionMessage } from './llm-http';

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

// DeepSeek provider 是可选真实模型模式；默认 mock 仍保证无 Key 可运行。
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
    // plan 阶段把历史和工具 schema 发给 DeepSeek，让模型有机会返回 tool_calls。
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
      // directReply 用于普通问题；toolIntents 用于工具问题。
      directReply: message.content?.trim(),
      toolIntents: this.toToolIntents(message.tool_calls ?? []),
    };
  }

  async composeReply(input: ComposeReplyInput): Promise<string> {
    if (input.toolCalls.length === 0) {
      // 没有工具结果时直接返回模型规划阶段生成的普通回复。
      return input.directReply ?? '收到。';
    }

    // 真实模型不直接执行工具，只基于本地工具执行后的事实做总结。
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
    // 工具 schema 与本地 ToolRegistry 保持同名，便于模型 tool_calls 映射。
    return [
      {
        type: 'function',
        function: {
          name: 'lookup_hr_policy',
          description: '查询 mock HR/IT/行政/安全内部政策，优先传受控 topic；不确定时可传 query。',
          parameters: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                enum: [
                  'annual_leave',
                  'expense',
                  'remote_work',
                  'it_support',
                  'benefits',
                  'onboarding',
                  'procurement',
                  'meeting_room',
                  'security_compliance',
                  'overtime',
                ],
                description: '内部政策或员工服务主题。',
              },
              query: {
                type: 'string',
                description: '自然语言查询文本，例如“在家办公怎么申请”。',
              },
            },
            required: [],
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
      {
        type: 'function',
        function: {
          name: 'calculate_expression',
          description: '安全计算受控数学表达式，支持 + - * / ** ^ % 括号、中文乘除加减和次方说法。',
          parameters: {
            type: 'object',
            properties: {
              expression: {
                type: 'string',
                description: '待计算表达式，例如 128*7+36。',
              },
            },
            required: ['expression'],
          },
        },
      },
    ];
  }

  private toToolIntents(toolCalls: DeepSeekToolCall[]): ToolIntent[] {
    // 只接收白名单工具名，防止模型返回不存在的工具污染执行链路。
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
    // 类型守卫把外部模型字符串收窄为本地可执行工具名。
    return (
      value === 'lookup_hr_policy' ||
      value === 'create_todo' ||
      value === 'get_current_time' ||
      value === 'calculate_expression'
    );
  }

  private parseArguments(value?: string) {
    // 模型 arguments 是 JSON 字符串；解析失败时降级为空对象，让工具校验返回错误。
    if (!value) return {};

    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  private toDeepSeekHistory(history: ChatMessage[]): DeepSeekMessage[] {
    // 只传最近 12 条 user/assistant 消息，控制请求体大小并过滤非模型角色。
    return history
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-12)
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }));
  }

  private async complete(messages: DeepSeekMessage[]) {
    // compose 阶段不再携带工具 schema，只让模型根据事实生成最终答复。
    const message = await this.chat(messages);
    const content = message.content?.trim();
    if (!content) {
      // 空回复视为失败，抛出标准化错误，交给 ChatService 统一包装成稳定响应。
      throw new Error('LLM provider returned no content');
    }
    return content;
  }

  private async chat(messages: DeepSeekMessage[], tools?: DeepSeekTool[]): Promise<ChatCompletionMessage> {
    // 构造函数只在有 Key 时创建 provider；这里保留运行时保护，避免误配置泄漏成空请求。
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY or DeepSeek_KEY is required for deepseek mode');
    }

    // 日志只输出 provider/model/endpoint，不输出 API Key，便于录屏证明真实请求。
    console.info(`[llm] provider=deepseek model=${this.model} endpoint=${this.baseUrl}/chat/completions tools=${tools ? 'auto' : 'none'}`);

    // 统一走 llm-http：自带超时与错误脱敏，错误信息不含 Key、Authorization 或响应体。
    return requestChatCompletion({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      body: {
        model: this.model,
        messages,
        ...(tools ? { tools, tool_choice: 'auto' } : {}),
        stream: false,
        thinking: { type: this.thinking },
        temperature: 0.2,
      },
    });
  }
}
