// 安全计算工具只解析四则运算，不使用 eval / Function，避免把用户输入当代码执行。
export async function calculateExpression(args: Record<string, unknown>) {
  const expression = args.expression;
  if (typeof expression !== 'string' || !expression.trim()) {
    throw new Error('expression is required');
  }

  const normalized = normalizeExpression(expression);
  if (normalized.length > 80) {
    throw new Error('expression must be at most 80 characters');
  }

  if (!/^[0-9+\-*/().\s]+$/.test(normalized)) {
    throw new Error('expression may only contain numbers and + - * / ( )');
  }

  const parser = new ArithmeticParser(normalized);
  const result = parser.parse();
  const displayResult = Number.isInteger(result) ? String(result) : String(Number(result.toFixed(6)));
  return `计算结果：${normalized.replace(/\s+/g, '')} = ${displayResult}`;
}

function normalizeExpression(expression: string) {
  return expression
    .replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - '０'.charCodeAt(0)))
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .trim();
}

class ArithmeticParser {
  private index = 0;

  constructor(private readonly input: string) {}

  parse() {
    const value = this.parseExpression();
    this.skipSpaces();
    if (this.index !== this.input.length) {
      throw new Error('expression contains invalid syntax');
    }
    return value;
  }

  private parseExpression(): number {
    let value = this.parseTerm();

    while (true) {
      this.skipSpaces();
      if (this.consume('+')) {
        value += this.parseTerm();
      } else if (this.consume('-')) {
        value -= this.parseTerm();
      } else {
        return value;
      }
    }
  }

  private parseTerm(): number {
    let value = this.parseFactor();

    while (true) {
      this.skipSpaces();
      if (this.consume('*')) {
        value *= this.parseFactor();
      } else if (this.consume('/')) {
        const divisor = this.parseFactor();
        if (divisor === 0) {
          throw new Error('division by zero is not allowed');
        }
        value /= divisor;
      } else {
        return value;
      }
    }
  }

  private parseFactor(): number {
    this.skipSpaces();

    if (this.consume('+')) return this.parseFactor();
    if (this.consume('-')) return -this.parseFactor();

    if (this.consume('(')) {
      const value = this.parseExpression();
      this.skipSpaces();
      if (!this.consume(')')) {
        throw new Error('missing closing parenthesis');
      }
      return value;
    }

    return this.parseNumber();
  }

  private parseNumber(): number {
    this.skipSpaces();
    const start = this.index;

    while (this.index < this.input.length && /[0-9.]/.test(this.input[this.index] ?? '')) {
      this.index += 1;
    }

    const raw = this.input.slice(start, this.index);
    if (!raw || raw.split('.').length > 2) {
      throw new Error('expression contains invalid number');
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new Error('expression contains invalid number');
    }

    return value;
  }

  private consume(char: string) {
    if (this.input[this.index] !== char) {
      return false;
    }
    this.index += 1;
    return true;
  }

  private skipSpaces() {
    while (this.input[this.index] === ' ') {
      this.index += 1;
    }
  }
}
