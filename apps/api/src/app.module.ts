import { Module } from '@nestjs/common';
import { ChatController } from './chat/chat.controller';
import { ChatService } from './chat/chat.service';
import { InMemorySessionStore } from './session/in-memory-session.store';
import { LLM_PROVIDER } from './llm/llm-provider.interface';
import { MockLlmProvider } from './llm/mock-llm.provider';
import { OpenAICompatibleProvider } from './llm/openai-compatible.provider';
import { ToolRegistry } from './tools/tool-registry';
import { ToolRouter } from './tools/tool-router';

@Module({
  controllers: [ChatController],
  providers: [
    ChatService,
    InMemorySessionStore,
    ToolRegistry,
    ToolRouter,
    {
      provide: LLM_PROVIDER,
      useFactory: () => {
        if (process.env.LLM_PROVIDER === 'openai-compatible' && process.env.OPENAI_API_KEY) {
          return new OpenAICompatibleProvider();
        }

        return new MockLlmProvider();
      },
    },
  ],
})
export class AppModule {}
