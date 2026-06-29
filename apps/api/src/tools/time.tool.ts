export async function getCurrentTime(args: Record<string, unknown>) {
  // 允许调用方传 IANA timezone；未传时使用演示默认时区。
  const timezone = typeof args.timezone === 'string' ? args.timezone : 'Asia/Shanghai';

  // Intl 负责真实时间格式化，避免手写日期字符串产生本地化问题。
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: timezone,
  });

  return `当前 ${timezone} 时间是 ${formatter.format(new Date())}。`;
}
