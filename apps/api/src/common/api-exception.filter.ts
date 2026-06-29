import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

interface ErrorPayload {
  code: string;
  message: string;
  requestId: string;
}

// 统一 API 错误格式，前端只展示安全 message，避免把堆栈或上游响应体透出给用户。
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();
    const request = context.getRequest<{ headers?: Record<string, string | string[] | undefined> }>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload: ErrorPayload = {
      code: this.toErrorCode(status),
      message: this.toSafeMessage(exception, status),
      requestId: this.resolveRequestId(request.headers),
    };

    response.status(status).send(payload);
  }

  private toSafeMessage(exception: unknown, status: number): string {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (this.isRecord(exceptionResponse)) {
      const message = exceptionResponse.message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
        return message.join('; ');
      }
    }

    return status >= 500 ? 'Service temporarily unavailable' : exception.message;
  }

  private toErrorCode(status: number): string {
    if (status === HttpStatus.BAD_REQUEST) return 'BAD_REQUEST';
    if (status === HttpStatus.UNAUTHORIZED) return 'UNAUTHORIZED';
    if (status === HttpStatus.TOO_MANY_REQUESTS) return 'TOO_MANY_REQUESTS';
    if (status === HttpStatus.SERVICE_UNAVAILABLE) return 'SERVICE_UNAVAILABLE';
    return status >= 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`;
  }

  private resolveRequestId(headers?: Record<string, string | string[] | undefined>): string {
    const fromHeader = headers?.['x-request-id'];
    if (typeof fromHeader === 'string' && fromHeader.trim()) {
      return fromHeader.trim();
    }
    return crypto.randomUUID();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
