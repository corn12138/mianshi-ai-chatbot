// ToolName 是工具执行白名单；新增工具时需要同步 Registry、Router 和 provider schema。
export type ToolName = 'lookup_hr_policy' | 'create_todo' | 'get_current_time' | 'calculate_expression';

// ToolIntent 表示“准备调用什么工具以及传什么参数”，还不是执行结果。
export interface ToolIntent {
  name: ToolName;
  arguments: Record<string, unknown>;
}

// ToolCallRecord 是工具执行后的审计记录，会返回前端并写入 assistant 消息。
export interface ToolCallRecord extends ToolIntent {
  result: string;
  ok: boolean;
}

// ToolDefinition 封装工具元信息和执行函数，便于 Registry 统一调度。
export interface ToolDefinition {
  name: ToolName;
  description: string;
  execute(args: Record<string, unknown>): Promise<string>;
}
