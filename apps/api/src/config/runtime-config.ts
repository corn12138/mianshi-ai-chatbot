// 运行时配置读取集中放在这里，避免各模块散落解析环境变量。
// 默认值都偏向“本地演示不受阻”，生产部署时再通过 .env 或平台配置收紧。
export function readPositiveIntEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

// 布尔环境变量只接受明确的 true，避免空串或拼写错误意外开启敏感能力。
export function readBooleanEnv(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === 'true';
}
