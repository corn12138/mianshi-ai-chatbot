import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { validateChatRequest } from './dto';

describe('validateChatRequest', () => {
  it('trims a valid message and session id', () => {
    const request = validateChatRequest({
      sessionId: ' web_abc-123 ',
      message: '  你好  ',
    });

    expect(request).toEqual({
      sessionId: 'web_abc-123',
      message: '你好',
    });
  });

  it('rejects non-object payloads', () => {
    expect(() => validateChatRequest(null)).toThrow(BadRequestException);
  });

  it('rejects blank or non-string messages', () => {
    expect(() => validateChatRequest({ message: '   ' })).toThrow('message is required');
    expect(() => validateChatRequest({ message: 123 })).toThrow('message must be a string');
  });

  it('enforces message length and session id format limits', () => {
    expect(() =>
      validateChatRequest(
        {
          message: 'abcdef',
          sessionId: 'bad:session',
        },
        { maxMessageLength: 5, maxSessionIdLength: 128 },
      ),
    ).toThrow('message must be at most 5 characters');

    expect(() =>
      validateChatRequest(
        {
          message: 'abc',
          sessionId: 'bad:session',
        },
        { maxMessageLength: 10, maxSessionIdLength: 128 },
      ),
    ).toThrow('sessionId may only contain letters');
  });
});
