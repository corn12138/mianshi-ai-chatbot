import { Injectable } from '@nestjs/common';
import { createTodo } from './todo.tool';
import { getCurrentTime } from './time.tool';
import { lookupHrPolicy } from './hr-policy.tool';
import type { ToolCallRecord, ToolDefinition, ToolIntent, ToolName } from './tools.types';

@Injectable()
export class ToolRegistry {
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
  };

  async execute(intent: ToolIntent): Promise<ToolCallRecord> {
    const tool = this.tools[intent.name];
    if (!tool) {
      return {
        ...intent,
        ok: false,
        result: `Unknown tool: ${intent.name}`,
      };
    }

    try {
      return {
        ...intent,
        ok: true,
        result: await tool.execute(intent.arguments),
      };
    } catch (error) {
      return {
        ...intent,
        ok: false,
        result: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }
}
