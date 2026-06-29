import { HttpException, HttpStatus } from '@nestjs/common';

// Nest 当前版本没有内置 TooManyRequestsException，这里显式定义 429，避免框架版本差异。
export class RateLimitExceededException extends HttpException {
  constructor(message = 'rate limit exceeded, please retry later') {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
