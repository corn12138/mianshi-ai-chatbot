import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import type { ChatRequestDto } from './dto';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  chat(@Body() body: ChatRequestDto) {
    return this.chatService.chat(body);
  }
}
