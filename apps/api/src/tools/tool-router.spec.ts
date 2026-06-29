import { describe, expect, it } from 'vitest';
import { ToolRouter } from './tool-router';

describe('ToolRouter', () => {
  const router = new ToolRouter();

  it('routes HR policy questions to lookup_hr_policy', () => {
    const intents = router.route({ message: '公司年假政策是什么？', history: [] });
    expect(intents).toEqual([{ name: 'lookup_hr_policy', arguments: { topic: 'annual_leave' } }]);
  });

  it('routes more mock business policy questions to specific topics', () => {
    expect(router.route({ message: '福利和五险一金怎么查？', history: [] })).toEqual([
      { name: 'lookup_hr_policy', arguments: { topic: 'benefits' } },
    ]);
    expect(router.route({ message: '会议室和访客怎么安排？', history: [] })).toEqual([
      { name: 'lookup_hr_policy', arguments: { topic: 'meeting_room' } },
    ]);
    expect(router.route({ message: '客户数据安全合规怎么处理？', history: [] })).toEqual([
      { name: 'lookup_hr_policy', arguments: { topic: 'security_compliance' } },
    ]);
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

  it('routes calculation requests to calculate_expression', () => {
    const intents = router.route({ message: '帮我计算 128*7+36', history: [] });
    expect(intents).toEqual([{ name: 'calculate_expression', arguments: { expression: '128*7+36' } }]);
  });
});
