const timezoneAliases: Record<string, string> = {
  shanghai: 'Asia/Shanghai',
  beijing: 'Asia/Shanghai',
  'asia/shanghai': 'Asia/Shanghai',
  utc: 'UTC',
  tokyo: 'Asia/Tokyo',
  singapore: 'Asia/Singapore',
  'new york': 'America/New_York',
  nyc: 'America/New_York',
  london: 'Europe/London',
  paris: 'Europe/Paris',
  berlin: 'Europe/Paris',
  'los angeles': 'America/Los_Angeles',
  la: 'America/Los_Angeles',
};

export async function getCurrentTime(args: Record<string, unknown>) {
  // 允许调用方传 IANA timezone；未传时使用演示默认时区。
  const timezone = normalizeTimezone(args.timezone);

  // Intl 负责真实时间格式化，避免手写日期字符串产生本地化问题。
  const formatter = createFormatter(timezone);

  return `当前 ${timezone} 时间是 ${formatter.format(new Date())}。`;
}

function normalizeTimezone(raw: unknown) {
  if (raw === undefined || raw === null || raw === '') {
    return 'Asia/Shanghai';
  }

  if (typeof raw !== 'string') {
    throw new Error('timezone must be a string when provided');
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return 'Asia/Shanghai';
  }

  return timezoneAliases[trimmed.toLowerCase()] ?? trimmed;
}

function createFormatter(timezone: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: timezone,
    });
  } catch {
    throw new Error('timezone must be a valid IANA timezone');
  }
}
