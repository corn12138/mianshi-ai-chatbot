import type { ComposeReplyInput, LlmPlan, LlmPlanInput, LlmProvider } from './llm-provider.interface';

// Mock provider 是默认体验路径：不依赖网络、不需要 Key，输出可预测。
export class MockLlmProvider implements LlmProvider {
  readonly mode = 'mock' as const;
  readonly info = {
    name: 'mock',
    label: 'Mock LLM',
    model: 'deterministic-local-mock',
  } as const;

  async plan(input: LlmPlanInput): Promise<LlmPlan> {
    // mock 的计划阶段只生成基础回复，工具意图交给 ToolRouter 的规则兜底。
    const text = input.message.toLowerCase();

    if (this.includesAny(text, ['介绍一下自己', '你是谁', '能做什么', '帮助', 'help', 'hello', '你好'])) {
      return {
        directReply:
          '你好，我是内部员工 AI 助手。当前 mock 模式可以稳定演示：内部政策查询、报销/福利/入职/采购/会议室/安全合规问答、创建待办、查询时间、四则运算，以及基于同一 session 的多轮追问。',
      };
    }

    if (this.includesAny(text, ['限制', '边界', '生产', '安全吗', '上线'])) {
      return {
        directReply:
          '当前是本地 MVP 演示：mock 模式不依赖外部 Key，适合验证核心流程；安全、限流、LLM 并发和 session 容量已有基础保护，但生产环境还应接入 SSO、Redis/数据库、审计日志和压测。',
      };
    }

    if (this.includesAny(text, ['谢谢', '感谢', 'thanks'])) {
      return {
        directReply: '不客气。你可以继续追问上一条政策，也可以让我创建待办、查询时间或做一个简单计算。',
      };
    }

    return {
      directReply:
        '我会基于当前会话上下文回答；如果问题适合工具处理，我会自动调用本地工具。你可以试试：报销政策、福利政策、入职流程、会议室预订、安全合规、计算 128*7+36。',
    };
  }

  async composeReply(input: ComposeReplyInput): Promise<string> {
    if (input.toolCalls.length === 0) {
      // 没有工具调用时仍提示上下文数量，方便演示多轮上下文已被保留。
      const contextHint =
        input.history.length > 0 ? `我已保留前面 ${input.history.length} 条上下文。` : '这是本轮会话的开始。';
      return `${input.directReply ?? '收到。'}${contextHint}`;
    }

    // 有工具调用时，最终回复必须明确包含每个工具的结果，满足题目硬性要求。
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

  private includesAny(text: string, keywords: string[]) {
    return keywords.some((keyword) => text.includes(keyword));
  }
}
