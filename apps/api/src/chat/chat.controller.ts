import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { validateChatRequest, type ChatRequestDto } from './dto';
import { InMemoryRateLimiter } from '../security/in-memory-rate-limiter';
import { RequestSecurityService, type ChatHttpRequest } from '../security/request-security.service';

@Controller('api/chat')
export class ChatController {
  // Explicit token: the `tsx`/esbuild dev runtime does not emit reflected
  // `design:paramtypes` metadata, so without @Inject the service is injected as
  // `undefined` and requests fail at runtime (see Review 004 follow-up).
  constructor(
    @Inject(ChatService) private readonly chatService: ChatService,
    @Inject(RequestSecurityService) private readonly requestSecurity: RequestSecurityService,
    @Inject(InMemoryRateLimiter) private readonly rateLimiter: InMemoryRateLimiter,
  ) {}

  @Post()
  chat(@Body() body: ChatRequestDto, @Req() request: ChatHttpRequest) {
    // Controller 层先做外部输入校验，限流和鉴权才能拿到可靠的 sessionId/message。
    const chatRequest = validateChatRequest(body);
    const identity = this.requestSecurity.resolveIdentity(request);

    // 三层限流：IP、用户、session。当前实现是进程内版本，生产可替换为 Redis/网关。
    this.rateLimiter.assertAllowed({
      ip: identity.ip,
      userId: identity.userId,
      sessionId: chatRequest.sessionId,
    });

    return this.chatService.chat(chatRequest);
  }
}
