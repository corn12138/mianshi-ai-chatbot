import type { ChatMessage } from '../chat/types';
import type { ToolCallRecord, ToolIntent } from '../tools/tools.types';

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export interface LlmPlanInput {
  message: string;
  history: ChatMessage[];
}

export interface LlmPlan {
  directReply?: string;
  toolIntents?: ToolIntent[];
}

export interface ComposeReplyInput extends LlmPlanInput {
  directReply?: string;
  toolCalls: ToolCallRecord[];
}

export interface LlmProviderInfo {
  name: 'mock' | 'deepseek' | 'openai-compatible';
  label: string;
  model: string;
  baseUrl?: string;
}

export interface LlmProvider {
  mode: 'mock' | 'llm';
  info: LlmProviderInfo;
  plan(input: LlmPlanInput): Promise<LlmPlan>;
  composeReply(input: ComposeReplyInput): Promise<string>;
}
