import { describe, expect, it } from 'vitest';
import { createTodo } from './todo.tool';

describe('createTodo', () => {
  it('normalizes title and due date text', async () => {
    const result = await createTodo({ title: '  提交   报销  ', dueDate: ' 下周 五 ' });

    expect(result).toContain('提交 报销');
    expect(result).toContain('截止时间：下周五');
  });

  it('rejects invalid or oversized arguments', async () => {
    await expect(createTodo({ title: '' })).rejects.toThrow('title is required');
    await expect(createTodo({ title: 'a'.repeat(121) })).rejects.toThrow('title must be at most 120 characters');
    await expect(createTodo({ title: '提交报销', dueDate: 123 })).rejects.toThrow(
      'dueDate must be a string when provided',
    );
  });
});
