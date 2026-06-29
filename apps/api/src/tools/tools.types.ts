export type ToolName = 'lookup_hr_policy' | 'create_todo' | 'get_current_time';

export interface ToolIntent {
  name: ToolName;
  arguments: Record<string, unknown>;
}

export interface ToolCallRecord extends ToolIntent {
  result: string;
  ok: boolean;
}

export interface ToolDefinition {
  name: ToolName;
  description: string;
  execute(args: Record<string, unknown>): Promise<string>;
}
