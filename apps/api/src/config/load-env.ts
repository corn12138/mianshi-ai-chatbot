import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

// API 包运行目录可能是仓库根目录或 apps/api，因此同时查找两处 .env。
const envPaths = [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    // 不覆盖已存在的 shell 环境变量，便于临时用 LLM_PROVIDER=mock 做验证。
    dotenv.config({ path: envPath, override: false, quiet: true });
  }
}
