import type { ToolCallRecord } from '../tools/tools.types';
import type { LlmProviderInfo } from '../llm/llm-provider.interface';

// system 角色预留给未来扩展；当前持久化历史主要使用 user/assistant。
export type ChatRole = 'user' | 'assistant' | 'system';

// ChatMessage 是 session store、API 响应和前端渲染共享的消息模型。
export interface ChatMessage {
  role: ChatRole;
  content: string;
  createdAt: string;
  toolCalls?: ToolCallRecord[];
}

// ChatRequest 是服务层内部契约，DTO 保持宽松以便做手动校验。
export interface ChatRequest {
  sessionId?: string;
  message: string;
}

// ChatResponse 返回完整消息、工具结果和 provider 信息，支撑功能演示与录屏说明。
export interface ChatResponse {
  sessionId: string;
  reply: string;
  messages: ChatMessage[];
  toolCalls: ToolCallRecord[];
  mode: 'mock' | 'llm';
  provider: LlmProviderInfo;
}
