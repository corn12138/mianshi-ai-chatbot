import { describe, expect, it } from 'vitest';
import { ToolRouter } from './tool-router';

describe('ToolRouter', () => {
  const router = new ToolRouter();

  it('routes HR policy questions to lookup_hr_policy', () => {
    const intents = router.route({ message: '公司年假政策是什么？', history: [] });
    expect(intents).toEqual([{ name: 'lookup_hr_policy', arguments: { topic: 'annual_leave' } }]);
  });

  it('routes todo requests to create_todo', () => {
    const intents = router.route({ message: '帮我创建一个待办：明天提交报销', history: [] });
    expect(intents[0]?.name).toBe('create_todo');
    expect(intents[0]?.arguments.title).toBe('明天提交报销');
  });

  it('routes time questions to get_current_time', () => {
    const intents = router.route({ message: '现在几点？', history: [] });
    expect(intents[0]?.name).toBe('get_current_time');
  });
});
