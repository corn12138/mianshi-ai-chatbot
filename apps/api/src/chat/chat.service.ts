import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { ChatRequestDto } from './dto';
import type { ChatMessage, ChatResponse } from './types';
import { InMemorySessionStore } from '../session/in-memory-session.store';
import { LLM_PROVIDER, type LlmProvider } from '../llm/llm-provider.interface';
import { ToolRouter } from '../tools/tool-router';
import { ToolRegistry } from '../tools/tool-registry';

@Injectable()
export class ChatService {
  // Tokens are declared explicitly so dependency injection does not rely on
  // reflected `design:paramtypes` metadata. The `tsx`/esbuild dev runtime does
  // not emit that metadata, so without these the API fails to boot under
  // `pnpm dev` (see docs/development/claude-review-log.md Review 004).
  constructor(
    @Inject(InMemorySessionStore) private readonly sessions: InMemorySessionStore,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Inject(ToolRouter) private readonly toolRouter: ToolRouter,
    @Inject(ToolRegistry) private readonly toolRegistry: ToolRegistry,
  ) {}

  async chat(body: ChatRequestDto): Promise<ChatResponse> {
    const message = body.message?.trim();
    if (!message) {
      throw new BadRequestException('message is required');
    }

    const sessionId = this.sessions.resolveSessionId(body.sessionId);
    const history = this.sessions.getMessages(sessionId);
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    const plan = await this.llm.plan({ message, history });
    const intents = this.toolRouter.route({
      message,
      history,
      providerIntents: plan.toolIntents,
    });

    const toolCalls = [];
    for (const intent of intents) {
      toolCalls.push(await this.toolRegistry.execute(intent));
    }

    const reply = await this.llm.composeReply({
      message,
      history,
      directReply: plan.directReply,
      toolCalls,
    });

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: reply,
      createdAt: new Date().toISOString(),
      toolCalls,
    };

    this.sessions.appendMessages(sessionId, [userMessage, assistantMessage]);

    return {
      sessionId,
      reply,
      messages: this.sessions.getMessages(sessionId),
      toolCalls,
      mode: this.llm.mode,
    };
  }
}
