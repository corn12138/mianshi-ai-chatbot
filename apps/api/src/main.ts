import './config/load-env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { readPositiveIntEnv } from './config/runtime-config';

async function bootstrap() {
  // Fastify 适配器启动更轻量，当前 MVP 不依赖 Express 特有能力。
  // bodyLimit 是第一道请求体大小保护，避免异常 payload 进入 Nest 管道。
  const bodyLimit = readPositiveIntEnv('CHAT_REQUEST_BODY_LIMIT_BYTES', 64 * 1024);
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ bodyLimit }));

  app.useGlobalFilters(new ApiExceptionFilter());

  // API 服务统一加安全响应头。CSP 对 API 返回足够收紧；Web 仍由 Vite/静态站点自己负责页面策略。
  app.getHttpAdapter().getInstance().addHook('onRequest', async (_request, reply) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'no-referrer');
    reply.header('x-frame-options', 'DENY');
    reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    reply.header('content-security-policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");

    if (process.env.NODE_ENV === 'production') {
      reply.header('strict-transport-security', 'max-age=15552000; includeSubDomains');
    }
  });

  // 默认只允许本地 Vite 前端访问；多个来源可用逗号分隔，便于本地改端口演示。
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

  app.enableCors({
    origin: webOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  });

  // 端口默认 3000，但保留 PORT 覆盖以避开本机端口冲突。
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`AI Chatbot API listening on http://localhost:${port}`);
}

bootstrap();
