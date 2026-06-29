import type { ChatMessage } from '../chat/types';

// 当前实现没有持久化 SessionRecord，但保留类型描述后续数据库迁移目标。
export interface SessionRecord {
  id: string;
  messages: ChatMessage[];
  updatedAt?: number;
  expiresAt?: number;
}
