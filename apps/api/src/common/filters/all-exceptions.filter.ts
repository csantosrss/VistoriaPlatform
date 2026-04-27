import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import type { Request, Response } from "express";

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  correlationId?: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const baseMessage =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: "Internal server error" };

    const body: ErrorResponseBody = {
      statusCode: status,
      message:
        typeof baseMessage === "string"
          ? baseMessage
          : ((baseMessage as { message?: string | string[] }).message ??
            "Error"),
      error:
        exception instanceof HttpException
          ? exception.name
          : "InternalServerError",
      correlationId: request.correlationId,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          err: exception,
          correlationId: request.correlationId,
          path: request.url,
        },
        "Unhandled exception",
      );
    } else {
      this.logger.warn(
        { status, correlationId: request.correlationId, path: request.url },
        "Handled exception",
      );
    }

    response.status(status).json(body);
  }
}
