const chineseDigits: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const chineseUnits: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1000,
};

const chineseNumberPattern = /[零〇一二两三四五六七八九十百千万]+(?:点[零〇一二两三四五六七八九]+)?/g;

// 把自然语言里常见的数学写法归一成安全表达式字符集，后续仍由手写 parser 校验和计算。
export function normalizeMathExpressionText(input: string) {
  return input
    .replace(/百分之\s*([0-9.]+)/g, '$1%')
    .replace(/百分之([零〇一二两三四五六七八九十百千万点]+)/g, (_, value: string) => `${parseChineseNumber(value)}%`)
    .replace(chineseNumberPattern, (value) => parseChineseNumber(value))
    .replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - '０'.charCodeAt(0)))
    .replace(/，/g, ',')
    .replace(/．/g, '.')
    .replace(/＋/g, '+')
    .replace(/－/g, '-')
    .replace(/＊/g, '*')
    .replace(/／/g, '/')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/(\d),(?=\d{3}(\D|$))/g, '$1')
    .replace(/([0-9.)%]+)\s*的?\s*([0-9.]+)\s*次方/g, '$1^$2')
    .replace(/([0-9.)%]+)\s*平方/g, '$1^2')
    .replace(/[xX]/g, '*')
    .replace(/乘以|乘/g, '*')
    .replace(/除以|除/g, '/')
    .replace(/加上|加/g, '+')
    .replace(/减去|减/g, '-')
    .replace(/等于|是多少|结果/g, '')
    .replace(/([0-9.)%])\s*(?=\()/g, '$1*')
    .replace(/\)\s*(?=[0-9.])/g, ')*')
    .trim();
}

function parseChineseNumber(raw: string) {
  const [integerPart, decimalPart] = raw.split('点');
  const integer = parseChineseInteger(integerPart);
  if (!decimalPart) {
    return String(integer);
  }

  const decimal = [...decimalPart].map((char) => chineseDigits[char]).join('');
  return `${integer}.${decimal}`;
}

function parseChineseInteger(raw: string | undefined) {
  if (!raw) return 0;

  if (!/[十百千万]/.test(raw)) {
    return Number([...raw].map((char) => chineseDigits[char]).join(''));
  }

  let total = 0;
  let section = 0;
  let number = 0;

  for (const char of raw) {
    if (char in chineseDigits) {
      number = chineseDigits[char] ?? 0;
      continue;
    }

    if (char in chineseUnits) {
      section += (number || 1) * (chineseUnits[char] ?? 1);
      number = 0;
      continue;
    }

    if (char === '万') {
      total += (section + number) * 10000;
      section = 0;
      number = 0;
    }
  }

  return total + section + number;
}
