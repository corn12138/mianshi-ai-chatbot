import { Injectable } from '@nestjs/common';
import { calculateExpression } from './calculator.tool';
import { createTodo } from './todo.tool';
import { getCurrentTime } from './time.tool';
import { lookupHrPolicy } from './hr-policy.tool';
import type { ToolCallRecord, ToolDefinition, ToolIntent, ToolName } from './tools.types';

@Injectable()
export class ToolRegistry {
  // 工具表是后端唯一可执行白名单，模型返回的工具名也必须落在这里。
  private readonly tools: Record<ToolName, ToolDefinition> = {
    lookup_hr_policy: {
      name: 'lookup_hr_policy',
      description: '查询 mock HR/IT 内部政策',
      execute: lookupHrPolicy,
    },
    create_todo: {
      name: 'create_todo',
      description: '创建 mock 待办事项',
      execute: createTodo,
    },
    get_current_time: {
      name: 'get_current_time',
      description: '查询当前时间',
      execute: getCurrentTime,
    },
    calculate_expression: {
      name: 'calculate_expression',
      description: '安全计算四则运算表达式',
      execute: calculateExpression,
    },
  };

  async execute(intent: ToolIntent): Promise<ToolCallRecord> {
    // 未注册工具不会抛出到上层，而是作为失败工具调用返回给最终回复。
    const tool = this.tools[intent.name];
    if (!tool) {
      return {
        ...intent,
        ok: false,
        result: `Unknown tool: ${intent.name}`,
      };
    }

    try {
      // 每个工具内部负责参数校验；Registry 只统一包装成功/失败结构。
      return {
        ...intent,
        ok: true,
        result: await tool.execute(intent.arguments),
      };
    } catch (error) {
      // 工具失败也属于可展示结果，保证单个工具错误不打断聊天主流程。
      return {
        ...intent,
        ok: false,
        result: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }
}
