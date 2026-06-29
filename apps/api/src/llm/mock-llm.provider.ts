import type { ComposeReplyInput, LlmPlan, LlmPlanInput, LlmProvider } from './llm-provider.interface';

export class MockLlmProvider implements LlmProvider {
  readonly mode = 'mock' as const;
  readonly info = {
    name: 'mock',
    label: 'Mock LLM',
    model: 'deterministic-local-mock',
  } as const;

  async plan(input: LlmPlanInput): Promise<LlmPlan> {
    const text = input.message.toLowerCase();

    if (text.includes('你好') || text.includes('hello')) {
      return {
        directReply:
          '你好，我是内部员工 AI 助手。你可以问 HR/IT 政策、让我创建待办，或查询当前时间。',
      };
    }

    return {
      directReply: '我会基于当前会话上下文回答；如果问题适合工具处理，我会自动调用本地工具。',
    };
  }

  async composeReply(input: ComposeReplyInput): Promise<string> {
    if (input.toolCalls.length === 0) {
      const contextHint =
        input.history.length > 0 ? `我已保留前面 ${input.history.length} 条上下文。` : '这是本轮会话的开始。';
      return `${input.directReply ?? '收到。'}${contextHint}`;
    }

    const toolSummary = input.toolCalls
      .map((toolCall) => {
        const status = toolCall.ok ? '成功' : '失败';
        return `- ${toolCall.name} ${status}：${toolCall.result}`;
      })
      .join('\n');

    return `我判断这个问题需要调用内部工具，工具结果如下：\n${toolSummary}\n\n基于以上结果，这是给你的答复：${input.toolCalls
      .map((toolCall) => toolCall.result)
      .join(' ')}`;
  }
}
