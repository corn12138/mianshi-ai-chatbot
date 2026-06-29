import { Injectable } from '@nestjs/common';
import type { ChatMessage } from '../chat/types';
import { normalizeMathExpressionText } from './math-expression';
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
    if (expression && (this.hasCalculationTrigger(text) || this.isStandaloneCalculation(message, expression))) {
      // 计算场景走安全四则运算工具，不让模型或后端执行任意代码。
      return [{ name: 'calculate_expression', arguments: { expression } }];
    }

    if (
      this.includesAny(text, [
        '几点',
        '几点了',
        '时间',
        '日期',
        '几号',
        '星期几',
        '周几',
        '北京时间',
        '上海时间',
        'current time',
        'time now',
        'now',
        'today',
      ])
    ) {
      // 时间问题默认查询上海时区，和题目中的本地演示场景保持一致。
      return [{ name: 'get_current_time', arguments: { timezone: this.extractTimezone(text) } }];
    }

    if (
      this.includesAny(text, [
        '待办',
        'todo',
        '提醒',
        '提醒我',
        '记一下',
        '帮我记',
        '记录一下',
        '创建任务',
        '建个任务',
        '加个任务',
        '安排一下',
      ])
    ) {
      return [
        {
          name: 'create_todo',
          arguments: {
            title: this.extractTodoTitle(message),
            dueDate: this.extractTodoDueDate(text),
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
    if (this.includesAny(text, ['年假', '年休', '休假', '假期', '请假', 'annual leave', 'leave policy'])) {
      return 'annual_leave';
    }
    if (this.includesAny(text, ['报销', '报账', '发票', '费用', '差旅', '垫付', 'expense', 'reimburse'])) {
      return 'expense';
    }
    if (this.includesAny(text, ['远程', '居家', '在家办公', '远程办公', 'remote', 'wfh', 'work from home'])) {
      return 'remote_work';
    }
    if (this.includesAny(text, ['vpn', '邮箱', '电脑', 'it', '账号', '密码', '网络', '设备', '登录', 'service desk'])) {
      return 'it_support';
    }
    if (this.includesAny(text, ['福利', '五险', '社保', '公积金', '体检', '商业保险', '薪资福利', 'benefit'])) {
      return 'benefits';
    }
    if (this.includesAny(text, ['入职', '新人', '新员工', '试用期', '转正', '导师', 'onboarding'])) {
      return 'onboarding';
    }
    if (this.includesAny(text, ['采购', '设备申请', '办公用品', '软件订阅', '供应商', 'procurement', 'purchase'])) {
      return 'procurement';
    }
    if (this.includesAny(text, ['会议室', '访客', '会议预订', '预约会议', '日历', 'meeting room', 'visitor'])) {
      return 'meeting_room';
    }
    if (
      this.includesAny(text, ['安全', '合规', '客户数据', '源代码', '脱敏', '保密', '权限', '上传', 'security', 'compliance'])
    ) {
      return 'security_compliance';
    }
    if (this.includesAny(text, ['加班', '调休', '补休', '考勤', 'overtime'])) return 'overtime';

    // 简单识别“那/这个/上面”等追问，用历史工具调用判断是否延续政策场景。
    const isFollowUp = this.includesAny(text, ['刚才', '上面', '这个', '这个呢', '那', '那这个', '也', '还', '适用吗', '怎么办']);
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
    // 支持“创建待办：xxx”“提醒我明天 xxx”“帮我记一下 xxx”等常见说法。
    const afterColon = message.includes(':') || message.includes('：') ? message.split(/[:：]/).pop()?.trim() : undefined;
    const rawTitle = afterColon || message.trim();
    const cleaned = rawTitle
      .replace(/^(请|麻烦)?(帮我|给我)?(创建|新增|添加|加一个|加个|建一个|建个)?(一个)?(待办|todo|任务)/i, '')
      .replace(/^(请|麻烦)?(提醒我|帮我提醒|帮我记一下|帮我记|记一下|记录一下|安排一下)/i, '')
      .replace(/^(今天|今晚|明天|后天|下周[一二三四五六日天]?|下星期[一二三四五六日天]?|本周[一二三四五六日天]?|这周[一二三四五六日天]?)/, '')
      .trim();
    return cleaned || rawTitle;
  }

  private extractTodoDueDate(text: string) {
    if (this.includesAny(text, ['今天', '今晚', 'today'])) return '今天';
    if (this.includesAny(text, ['明天', 'tomorrow'])) return '明天';
    if (this.includesAny(text, ['后天'])) return '后天';
    const weekMatch = text.match(/(下周[一二三四五六日天]?|下星期[一二三四五六日天]?|本周[一二三四五六日天]?|这周[一二三四五六日天]?)/);
    if (weekMatch) return weekMatch[0];
    const dateMatch = text.match(/\d{1,2}\s*月\s*\d{1,2}\s*(日|号)?/);
    return dateMatch?.[0].replace(/\s+/g, '');
  }

  private extractCalculationExpression(message: string) {
    // 从自然语言里抽出最像数学表达式的片段，例如“帮我算一下 2 的 3 次方 + 2”。
    const normalized = this.normalizeCalculationText(message);
    const candidates = normalized.match(/[0-9+\-*/^%().\s]+/g) ?? [];
    return candidates
      .map((candidate) => candidate.trim())
      .filter(Boolean)
      .sort((left, right) => right.length - left.length)
      .find((candidate) => this.looksLikeCalculationExpression(candidate));
  }

  private normalizeCalculationText(message: string) {
    return normalizeMathExpressionText(message);
  }

  private hasCalculationTrigger(text: string) {
    return this.includesAny(text, [
      '计算',
      '算一下',
      '算下',
      '帮我算',
      '算算',
      '求值',
      '结果',
      '等于',
      '=',
      'calculate',
      'what is',
      'evaluate',
    ]);
  }

  private isStandaloneCalculation(message: string, expression: string) {
    return this.normalizeCalculationText(message).replace(/\s+/g, '') === expression.replace(/\s+/g, '');
  }

  private looksLikeCalculationExpression(expression: string) {
    const compact = expression.replace(/\s+/g, '');
    if (!/[0-9]/.test(compact) || compact.length < 3) return false;
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(compact)) return false;
    return /(\*\*|[+*/^%])/.test(compact) || /^-?\d+(\.\d+)?-\d+(\.\d+)?/.test(compact);
  }

  private extractTimezone(text: string) {
    if (this.includesAny(text, ['utc', '协调世界时', '世界标准时间'])) return 'UTC';
    if (this.includesAny(text, ['东京', '日本', 'tokyo', 'japan'])) return 'Asia/Tokyo';
    if (this.includesAny(text, ['新加坡', 'singapore'])) return 'Asia/Singapore';
    if (this.includesAny(text, ['纽约', 'new york', '美东', 'eastern time', 'est', 'edt'])) return 'America/New_York';
    if (this.includesAny(text, ['洛杉矶', '旧金山', '加州', '美西', 'los angeles', 'pacific time', 'pst', 'pdt'])) {
      return 'America/Los_Angeles';
    }
    if (this.includesAny(text, ['伦敦', '英国', 'london', 'uk'])) return 'Europe/London';
    if (this.includesAny(text, ['巴黎', '德国', '法国', 'paris', 'berlin'])) return 'Europe/Paris';
    return 'Asia/Shanghai';
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
