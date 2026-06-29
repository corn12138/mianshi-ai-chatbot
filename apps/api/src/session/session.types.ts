import type { ChatMessage } from '../chat/types';

export interface SessionRecord {
  id: string;
  messages: ChatMessage[];
}
