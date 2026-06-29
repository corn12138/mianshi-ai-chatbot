import { describe, expect, it } from 'vitest';
import { calculateExpression } from './calculator.tool';

describe('calculateExpression', () => {
  it('calculates arithmetic expressions without using code execution', async () => {
    await expect(calculateExpression({ expression: '128*7+36' })).resolves.toBe('计算结果：128*7+36 = 932');
    await expect(calculateExpression({ expression: '（10 + 2）×3' })).resolves.toBe('计算结果：(10+2)*3 = 36');
    await expect(calculateExpression({ expression: '2**3+2' })).resolves.toBe('计算结果：2**3+2 = 10');
    await expect(calculateExpression({ expression: '2 的 3 次方 + 2' })).resolves.toBe('计算结果：2^3+2 = 10');
    await expect(calculateExpression({ expression: '50% * 200' })).resolves.toBe('计算结果：50%*200 = 100');
    await expect(calculateExpression({ expression: '1,200 + 300' })).resolves.toBe('计算结果：1200+300 = 1500');
    await expect(calculateExpression({ expression: '二加三' })).resolves.toBe('计算结果：2+3 = 5');
    await expect(calculateExpression({ expression: '五十乘以二' })).resolves.toBe('计算结果：50*2 = 100');
    await expect(calculateExpression({ expression: '2(3+4)' })).resolves.toBe('计算结果：2*(3+4) = 14');
    await expect(calculateExpression({ expression: '百分之五十 * 200' })).resolves.toBe('计算结果：50%*200 = 100');
  });

  it('rejects unsafe or invalid expressions', async () => {
    await expect(calculateExpression({ expression: 'process.exit()' })).rejects.toThrow(
      'expression may only contain numbers and supported operators',
    );
    await expect(calculateExpression({ expression: '1/0' })).rejects.toThrow('division by zero');
    await expect(calculateExpression({ expression: '2***3' })).rejects.toThrow('expression contains invalid number');
    await expect(calculateExpression({ expression: '999999999999999**2' })).rejects.toThrow(
      'expression result is too large',
    );
  });
});
