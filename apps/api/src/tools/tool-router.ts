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
      // 真实模型如果已经给出工具计划，优先尊重模型计划。
      return this.dedupe(providerIntents);
    }

    // mock 模式或模型未触发工具时，用规则路由保证核心演示稳定。
    return this.dedupe(this.routeByRules(input.message, input.history));
  }

  private routeByRules(message: string, history: ChatMessage[]): ToolIntent[] {
    const text = message.toLowerCase();

    const expression = this.extractCalculationExpression(message);
    if (expression && this.includesAny(text, ['计算', '算一下', '算下', 'calculate', '等于', '='])) {
      // 计算场景走安全四则运算工具，不让模型或后端执行任意代码。
      return [{ name: 'calculate_expression', arguments: { expression } }];
    }

    if (this.includesAny(text, ['几点', '时间', 'current time', 'now'])) {
      // 时间问题默认查询上海时区，和题目中的本地演示场景保持一致。
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
      // HR/IT 政策查询统一路由到 mock 业务信息工具。
      return [{ name: 'lookup_hr_policy', arguments: { topic } }];
    }

    return [];
  }

  private detectPolicyTopic(text: string, history: ChatMessage[]) {
    // 先匹配明确主题，避免 follow-up 规则误判。
    if (this.includesAny(text, ['年假', '休假', 'annual leave'])) return 'annual_leave';
    if (this.includesAny(text, ['报销', '发票', 'expense'])) return 'expense';
    if (this.includesAny(text, ['远程', '居家', 'remote'])) return 'remote_work';
    if (this.includesAny(text, ['vpn', '邮箱', '电脑', 'it', '账号'])) return 'it_support';
    if (this.includesAny(text, ['福利', '五险', '公积金', '体检', '商业保险', 'benefit'])) return 'benefits';
    if (this.includesAny(text, ['入职', '新人', '试用期', 'onboarding'])) return 'onboarding';
    if (this.includesAny(text, ['采购', '设备申请', '软件订阅', 'procurement'])) return 'procurement';
    if (this.includesAny(text, ['会议室', '访客', '会议预订', 'meeting room'])) return 'meeting_room';
    if (this.includesAny(text, ['安全', '合规', '客户数据', '源代码', '脱敏', 'security'])) return 'security_compliance';
    if (this.includesAny(text, ['加班', '调休', 'overtime'])) return 'overtime';

    // 简单识别“那/这个/上面”等追问，用历史工具调用判断是否延续政策场景。
    const isFollowUp = this.includesAny(text, ['刚才', '上面', '这个', '那']);
    const hadPolicy = history.some((message) =>
      message.toolCalls?.some((toolCall) => toolCall.name === 'lookup_hr_policy'),
    );

    if (isFollowUp && hadPolicy) {
      // MVP 中把政策追问示例落到远程办公，方便演示多轮上下文影响路由。
      return 'remote_work';
    }

    return undefined;
  }

  private extractTodoTitle(message: string) {
    // 支持“创建待办：xxx”的常见输入；没有冒号时保留整句作为标题。
    return message.split(/[:：]/).pop()?.trim() || message.trim();
  }

  private extractCalculationExpression(message: string) {
    // 从自然语言里抽出最像四则运算的片段，例如“帮我算一下 128*7+36”。
    const candidates = message.match(/[0-9０-９+\-*/×÷().（）\s]+/g) ?? [];
    return candidates
      .map((candidate) => candidate.trim())
      .find((candidate) => /[0-9０-９]/.test(candidate) && /[+\-*/×÷]/.test(candidate));
  }

  private includesAny(text: string, keywords: string[]) {
    // 当前 MVP 用关键词路由，后续可替换为更完整的意图分类。
    return keywords.some((keyword) => text.includes(keyword));
  }

  private dedupe(intents: ToolIntent[]) {
    // 同一工具和参数只执行一次，避免模型和规则重复触发。
    const seen = new Set<string>();
    return intents.filter((intent) => {
      const key = `${intent.name}:${JSON.stringify(intent.arguments)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
