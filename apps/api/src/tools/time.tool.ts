export async function getCurrentTime(args: Record<string, unknown>) {
  const timezone = typeof args.timezone === 'string' ? args.timezone : 'Asia/Shanghai';
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: timezone,
  });

  return `当前 ${timezone} 时间是 ${formatter.format(new Date())}。`;
}
