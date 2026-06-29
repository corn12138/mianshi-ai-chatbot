import type { ChatMessage } from '../chat/types';
import type { ToolCallRecord, ToolIntent } from '../tools/tools.types';

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

// provider 的 plan 阶段只负责“先判断”，不直接执行工具。
export interface LlmPlanInput {
  message: string;
  history: ChatMessage[];
}

// toolIntents 允许真实模型建议工具；directReply 允许普通问题直接回答。
export interface LlmPlan {
  directReply?: string;
  toolIntents?: ToolIntent[];
}

// compose 阶段拿到工具执行结果后，生成用户最终看到的 assistant 回复。
export interface ComposeReplyInput extends LlmPlanInput {
  directReply?: string;
  toolCalls: ToolCallRecord[];
}

// provider 元信息会返回给前端，用来展示 mock 或真实模型模式。
export interface LlmProviderInfo {
  name: 'mock' | 'deepseek' | 'openai-compatible';
  label: string;
  model: string;
  baseUrl?: string;
}

// 所有模型接入都实现同一接口，ChatService 不关心具体厂商。
export interface LlmProvider {
  mode: 'mock' | 'llm';
  info: LlmProviderInfo;
  plan(input: LlmPlanInput): Promise<LlmPlan>;
  composeReply(input: ComposeReplyInput): Promise<string>;
}
