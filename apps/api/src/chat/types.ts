import type { ToolCallRecord } from '../tools/tools.types';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  createdAt: string;
  toolCalls?: ToolCallRecord[];
}

export interface ChatRequest {
  sessionId?: string;
  message: string;
}

export interface ChatResponse {
  sessionId: string;
  reply: string;
  messages: ChatMessage[];
  toolCalls: ToolCallRecord[];
  mode: 'mock' | 'llm';
}
