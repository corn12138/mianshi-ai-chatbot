import { describe, expect, it } from 'vitest';
import { calculateExpression } from './calculator.tool';

describe('calculateExpression', () => {
  it('calculates arithmetic expressions without using code execution', async () => {
    await expect(calculateExpression({ expression: '128*7+36' })).resolves.toBe('计算结果：128*7+36 = 932');
    await expect(calculateExpression({ expression: '（10 + 2）×3' })).resolves.toBe('计算结果：(10+2)*3 = 36');
  });

  it('rejects unsafe or invalid expressions', async () => {
    await expect(calculateExpression({ expression: 'process.exit()' })).rejects.toThrow(
      'expression may only contain numbers',
    );
    await expect(calculateExpression({ expression: '1/0' })).rejects.toThrow('division by zero');
  });
});
