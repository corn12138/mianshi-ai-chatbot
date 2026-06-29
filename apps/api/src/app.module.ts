import { Module } from '@nestjs/common';
import { ChatController } from './chat/chat.controller';
import { ChatService } from './chat/chat.service';
import { InMemorySessionStore } from './session/in-memory-session.store';
import { LLM_PROVIDER } from './llm/llm-provider.interface';
import { DeepSeekProvider } from './llm/deepseek.provider';
import { MockLlmProvider } from './llm/mock-llm.provider';
import { OpenAICompatibleProvider } from './llm/openai-compatible.provider';
import { LlmConcurrencyLimiter } from './llm/llm-concurrency-limiter';
import { InMemoryRateLimiter } from './security/in-memory-rate-limiter';
import { RequestSecurityService } from './security/request-security.service';
import { ToolRegistry } from './tools/tool-registry';
import { ToolRouter } from './tools/tool-router';

@Module({
  controllers: [ChatController],
  providers: [
    ChatService,
    InMemorySessionStore,
    RequestSecurityService,
    InMemoryRateLimiter,
    LlmConcurrencyLimiter,
    ToolRegistry,
    ToolRouter,
    {
      provide: LLM_PROVIDER,
      useFactory: () => {
        // DeepSeek 是可选增强；只有显式选择且存在本地 Key 时才启用真实请求。
        if (process.env.LLM_PROVIDER === 'deepseek') {
          const hasDeepSeekKey = Boolean(process.env.DEEPSEEK_API_KEY ?? process.env.DeepSeek_KEY);
          if (hasDeepSeekKey) {
            return new DeepSeekProvider();
          }

          // 没有 Key 时回退 mock，保证题目要求的“无 API Key 可体验”不会被破坏。
          console.warn('LLM_PROVIDER=deepseek but no DEEPSEEK_API_KEY or DeepSeek_KEY was found; falling back to mock.');
        }

        // OpenAI-compatible provider 同样是可选真实模型模式，不作为 MVP 启动前提。
        if (process.env.LLM_PROVIDER === 'openai-compatible' && process.env.OPENAI_API_KEY) {
          return new OpenAICompatibleProvider();
        }

        // 默认 provider 必须是本地 deterministic mock，方便评审直接启动仓库。
        return new MockLlmProvider();
      },
    },
  ],
})
export class AppModule {}
