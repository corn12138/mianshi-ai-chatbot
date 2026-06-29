import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import type { ChatRequestDto } from './dto';

@Controller('api/chat')
export class ChatController {
  // Explicit token: the `tsx`/esbuild dev runtime does not emit reflected
  // `design:paramtypes` metadata, so without @Inject the service is injected as
  // `undefined` and requests fail at runtime (see Review 004 follow-up).
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @Post()
  chat(@Body() body: ChatRequestDto) {
    return this.chatService.chat(body);
  }
}
