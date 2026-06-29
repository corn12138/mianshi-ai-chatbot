import { describe, expect, it } from 'vitest';
import { ToolRegistry } from './tool-registry';
import type { ToolIntent } from './tools.types';

describe('ToolRegistry', () => {
  const registry = new ToolRegistry();

  it('returns a structured ok record for valid arguments', async () => {
    const record = await registry.execute({
      name: 'lookup_hr_policy',
      arguments: { topic: 'annual_leave' },
    });

    expect(record.name).toBe('lookup_hr_policy');
    expect(record.arguments).toEqual({ topic: 'annual_leave' });
    expect(record.ok).toBe(true);
    expect(record.result).toContain('年假');
  });

  it('captures invalid tool arguments without throwing', async () => {
    const record = await registry.execute({
      name: 'lookup_hr_policy',
      arguments: { topic: 'unknown_topic' },
    });

    expect(record.ok).toBe(false);
    expect(record.result).toMatch(/topic must be/);
  });

  it('captures missing required arguments without throwing', async () => {
    const record = await registry.execute({
      name: 'create_todo',
      arguments: {},
    });

    expect(record.ok).toBe(false);
    expect(record.result).toBe('title is required');
  });

  it('executes the safe calculator tool', async () => {
    const record = await registry.execute({
      name: 'calculate_expression',
      arguments: { expression: '128*7+36' },
    });

    expect(record.ok).toBe(true);
    expect(record.result).toBe('计算结果：128*7+36 = 932');
  });

  it('handles unknown tool names safely', async () => {
    const record = await registry.execute({
      name: 'does_not_exist',
      arguments: {},
    } as unknown as ToolIntent);

    expect(record.ok).toBe(false);
    expect(record.result).toContain('Unknown tool');
  });
});
