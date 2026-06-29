import { describe, expect, it } from 'vitest';
import { getCurrentTime } from './time.tool';

describe('getCurrentTime', () => {
  it('uses the default demo timezone when no timezone is provided', async () => {
    await expect(getCurrentTime({})).resolves.toContain('Asia/Shanghai');
  });

  it('normalizes common timezone aliases', async () => {
    await expect(getCurrentTime({ timezone: 'new york' })).resolves.toContain('America/New_York');
    await expect(getCurrentTime({ timezone: 'UTC' })).resolves.toContain('UTC');
  });

  it('rejects invalid timezone arguments with stable messages', async () => {
    await expect(getCurrentTime({ timezone: 123 })).rejects.toThrow('timezone must be a string when provided');
    await expect(getCurrentTime({ timezone: 'Mars/Base' })).rejects.toThrow('timezone must be a valid IANA timezone');
  });
});
