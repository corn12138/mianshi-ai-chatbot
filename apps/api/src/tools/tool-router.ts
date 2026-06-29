import { Injectable } from '@nestjs/common';
import type { ChatMessage } from '../chat/types';
import type { ToolIntent } from './tools.types';

@Injectable()
export class ToolRouter {
  route(input: {
    message: string;
    history: ChatMessage[];
    providerIntents?: ToolIntent[];
  }): ToolIntent[] {
    const providerIntents = input.providerIntents ?? [];
    if (providerIntents.length > 0) {
      return this.dedupe(providerIntents);
    }

    return this.dedupe(this.routeByRules(input.message, input.history));
  }

  private routeByRules(message: string, history: ChatMessage[]): ToolIntent[] {
    const text = message.toLowerCase();

    if (this.includesAny(text, ['几点', '时间', 'current time', 'now'])) {
      return [{ name: 'get_current_time', arguments: { timezone: 'Asia/Shanghai' } }];
    }

    if (this.includesAny(text, ['待办', 'todo', '提醒', '记一下', '创建任务'])) {
      return [
        {
          name: 'create_todo',
          arguments: {
            title: this.extractTodoTitle(message),
            dueDate: this.includesAny(text, ['明天', 'tomorrow']) ? '明天' : undefined,
          },
        },
      ];
    }

    const topic = this.detectPolicyTopic(text, history);
    if (topic) {
      return [{ name: 'lookup_hr_policy', arguments: { topic } }];
    }

    return [];
  }

  private detectPolicyTopic(text: string, history: ChatMessage[]) {
    if (this.includesAny(text, ['年假', '休假', 'annual leave'])) return 'annual_leave';
    if (this.includesAny(text, ['报销', '发票', 'expense'])) return 'expense';
    if (this.includesAny(text, ['远程', '居家', 'remote'])) return 'remote_work';
    if (this.includesAny(text, ['vpn', '邮箱', '电脑', 'it', '账号'])) return 'it_support';

    const isFollowUp = this.includesAny(text, ['刚才', '上面', '这个', '那']);
    const hadPolicy = history.some((message) =>
      message.toolCalls?.some((toolCall) => toolCall.name === 'lookup_hr_policy'),
    );

    if (isFollowUp && hadPolicy) {
      return 'remote_work';
    }

    return undefined;
  }

  private extractTodoTitle(message: string) {
    return message.split(/[:：]/).pop()?.trim() || message.trim();
  }

  private includesAny(text: string, keywords: string[]) {
    return keywords.some((keyword) => text.includes(keyword));
  }

  private dedupe(intents: ToolIntent[]) {
    const seen = new Set<string>();
    return intents.filter((intent) => {
      const key = `${intent.name}:${JSON.stringify(intent.arguments)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
