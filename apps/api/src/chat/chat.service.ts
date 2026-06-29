import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { validateChatRequest, type ChatRequestDto } from './dto';
import type { ChatMessage, ChatResponse } from './types';
import { InMemorySessionStore } from '../session/in-memory-session.store';
import { LLM_PROVIDER, type LlmPlan, type LlmProvider } from '../llm/llm-provider.interface';
import { MockLlmProvider } from '../llm/mock-llm.provider';
import { LlmConcurrencyLimiter } from '../llm/llm-concurrency-limiter';
import { ToolRouter } from '../tools/tool-router';
import { ToolRegistry } from '../tools/tool-registry';

@Injectable()
export class ChatService {
  // 可选的本地兜底 provider：仅在开启 LLM_FALLBACK_TO_MOCK 且真实模型失败时惰性创建。
  private fallbackProvider?: LlmProvider;

  // Tokens are declared explicitly so dependency injection does not rely on
  // reflected `design:paramtypes` metadata. The `tsx`/esbuild dev runtime does
  // not emit that metadata, so without these the API fails to boot under
  // `pnpm dev` (see docs/development/claude-review-log.md Review 004).
  constructor(
    @Inject(InMemorySessionStore) private readonly sessions: InMemorySessionStore,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Inject(LlmConcurrencyLimiter) private readonly llmConcurrency: LlmConcurrencyLimiter,
    @Inject(ToolRouter) private readonly toolRouter: ToolRouter,
    @Inject(ToolRegistry) private readonly toolRegistry: ToolRegistry,
  ) {}

  async chat(body: ChatRequestDto): Promise<ChatResponse> {
    // Service 层保留一次校验，保证绕过 Controller 的测试或未来内部调用也不能提交异常 payload。
    const { message, sessionId: requestedSessionId } = validateChatRequest(body);

    // sessionId 可由前端传入；缺省时由 store 创建，保持接口可直接 curl 调试。
    const sessionId = this.sessions.resolveSessionId(requestedSessionId);

    // history 是本轮模型计划和工具路由的上下文来源。
    const history = this.sessions.getMessages(sessionId);
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    // activeLlm 默认是注入的 provider；真实模型在某一步失败且开启兜底时会被换成 mock，
    // 之后同一轮的 plan/compose 都用它，保证返回的 mode/provider 与实际产出一致。
    let activeLlm = this.llm;
    const releaseLlmSlot = this.llmConcurrency.acquire(sessionId, activeLlm.mode);

    try {
      // 第一步先让 provider 给出普通回复或工具意图；mock/真实模型共享同一接口。
      let plan: LlmPlan;
      try {
        plan = await activeLlm.plan({ message, history });
      } catch (error) {
        // 真实 provider 失败：要么降级到 mock，要么转成稳定的 503，绝不把异常透传成 500。
        activeLlm = this.handleProviderFailure(error, activeLlm, 'plan');
        plan = await activeLlm.plan({ message, history });
      }

      // 工具触发在后端完成：优先使用模型意图，没有意图时走稳定规则路由。
      const intents = this.toolRouter.route({
        message,
        history,
        providerIntents: plan.toolIntents,
      });

      // 工具执行结果统一转成结构化记录，失败也进入最终回复而不是中断主流程。
      const toolCalls = [];
      for (const intent of intents) {
        toolCalls.push(await this.toolRegistry.execute(intent));
      }

      // 最终回复由 provider 合成，确保工具结果能自然进入 assistant 回复。
      let reply: string;
      try {
        reply = await activeLlm.composeReply({
          message,
          history,
          directReply: plan.directReply,
          toolCalls,
        });
      } catch (error) {
        // compose 阶段同样兜底；若已经在用 mock 仍失败，handleProviderFailure 会直接抛错。
        activeLlm = this.handleProviderFailure(error, activeLlm, 'composeReply');
        reply = await activeLlm.composeReply({
          message,
          history,
          directReply: plan.directReply,
          toolCalls,
        });
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
        toolCalls,
      };

      // 只在最终回复生成后写入上下文：provider 失败时上面已抛出 503，
      // 因此失败这一轮的 user/assistant 消息不会污染会话历史。
      this.sessions.appendMessages(sessionId, [userMessage, assistantMessage]);

      // 返回当前保留的 messages；session store 会做容量裁剪，避免无限返回完整历史。
      return {
        sessionId,
        reply,
        messages: this.sessions.getMessages(sessionId),
        toolCalls,
        // mode/provider 取最终真正产出的 provider：兜底成 mock 时会如实显示 mock。
        mode: activeLlm.mode,
        provider: activeLlm.info,
      };
    } finally {
      releaseLlmSlot();
    }
  }

  // 统一处理真实 provider 失败：
  // - 开启 LLM_FALLBACK_TO_MOCK 且当前还不是 mock 时，降级到本地 mock 继续本轮对话；
  // - 否则抛出脱敏后的 503，让接口有稳定、安全的失败语义。
  // 默认不开启兜底：默认行为是明确报错，避免“看起来成功其实是静默降级”的误导。
  private handleProviderFailure(
    error: unknown,
    activeLlm: LlmProvider,
    stage: 'plan' | 'composeReply',
  ): LlmProvider {
    const fallbackEnabled = process.env.LLM_FALLBACK_TO_MOCK === 'true';

    // activeLlm.mode === 'mock' 说明已经在兜底链路里仍失败，再降级没有意义。
    if (fallbackEnabled && activeLlm.mode !== 'mock') {
      console.warn(`[llm] ${stage} failed, falling back to mock:`, this.safeErrorMessage(error));
      return this.getFallbackProvider();
    }

    throw this.toServiceUnavailable(error);
  }

  // 惰性创建并缓存 mock provider，作为真实模型失败时的本地兜底。
  private getFallbackProvider(): LlmProvider {
    if (!this.fallbackProvider) {
      this.fallbackProvider = new MockLlmProvider();
    }
    return this.fallbackProvider;
  }

  // provider 层（llm-http）已经脱敏，这里再保证只对外暴露安全文本，不泄漏 Key 或上游响应体。
  private toServiceUnavailable(error: unknown): ServiceUnavailableException {
    return new ServiceUnavailableException(this.safeErrorMessage(error));
  }

  private safeErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'LLM provider request failed';
  }
}
