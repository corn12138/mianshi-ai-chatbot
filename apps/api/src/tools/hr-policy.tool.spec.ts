import { describe, expect, it } from 'vitest';
import { lookupHrPolicy } from './hr-policy.tool';

describe('lookupHrPolicy', () => {
  it('accepts controlled topics', async () => {
    await expect(lookupHrPolicy({ topic: 'annual_leave' })).resolves.toContain('年假政策');
  });

  it('maps natural language query aliases to mock policy topics', async () => {
    await expect(lookupHrPolicy({ query: '我想在家办公怎么申请？' })).resolves.toContain('远程办公政策');
    await expect(lookupHrPolicy({ query: 'VPN 登不上怎么办？' })).resolves.toContain('IT 支持');
    await expect(lookupHrPolicy({ query: '五险一金和体检在哪里看？' })).resolves.toContain('福利政策');
  });

  it('returns a safe catalog fallback for unmatched natural language queries', async () => {
    await expect(lookupHrPolicy({ query: '公司食堂有什么菜？' })).resolves.toContain('当前可查询主题');
  });

  it('rejects invalid controlled topics', async () => {
    await expect(lookupHrPolicy({ topic: 'unknown_topic' })).rejects.toThrow('topic must be one of');
  });
});
