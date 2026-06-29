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
    expect(router.route({ message: '我想在家办公怎么申请？', history: [] })).toEqual([
      { name: 'lookup_hr_policy', arguments: { topic: 'remote_work' } },
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
    expect(intents[0]?.arguments.title).toBe('提交报销');
    expect(intents[0]?.arguments.dueDate).toBe('明天');

    const reminder = router.route({ message: '提醒我后天提交报销', history: [] });
    expect(reminder[0]?.name).toBe('create_todo');
    expect(reminder[0]?.arguments.title).toBe('提交报销');
    expect(reminder[0]?.arguments.dueDate).toBe('后天');

    const weeklyTask = router.route({ message: '帮我记一下下周五同步项目风险', history: [] });
    expect(weeklyTask[0]?.name).toBe('create_todo');
    expect(weeklyTask[0]?.arguments.title).toBe('同步项目风险');
    expect(weeklyTask[0]?.arguments.dueDate).toBe('下周五');
  });

  it('routes time questions to get_current_time', () => {
    const intents = router.route({ message: '现在几点？', history: [] });
    expect(intents[0]?.name).toBe('get_current_time');

    const dateIntent = router.route({ message: '今天星期几？', history: [] });
    expect(dateIntent[0]?.name).toBe('get_current_time');

    const remoteTimezone = router.route({ message: '纽约现在几点？', history: [] });
    expect(remoteTimezone[0]).toEqual({
      name: 'get_current_time',
      arguments: { timezone: 'America/New_York' },
    });
  });

  it('routes calculation requests to calculate_expression', () => {
    const intents = router.route({ message: '帮我计算 128*7+36', history: [] });
    expect(intents).toEqual([{ name: 'calculate_expression', arguments: { expression: '128*7+36' } }]);

    expect(router.route({ message: '2**3+2', history: [] })).toEqual([
      { name: 'calculate_expression', arguments: { expression: '2**3+2' } },
    ]);
    expect(router.route({ message: '2 的 3 次方 + 2', history: [] })).toEqual([
      { name: 'calculate_expression', arguments: { expression: '2^3 + 2' } },
    ]);
    expect(router.route({ message: '二加三', history: [] })).toEqual([
      { name: 'calculate_expression', arguments: { expression: '2+3' } },
    ]);
    expect(router.route({ message: '2(3+4)', history: [] })).toEqual([
      { name: 'calculate_expression', arguments: { expression: '2*(3+4)' } },
    ]);
    expect(router.route({ message: '今天日期是 2026/06/29', history: [] })[0]?.name).toBe('get_current_time');
  });
});
