import { randomUUID } from "node:crypto";
import type { Params } from "nestjs-pino";
import type { IncomingMessage } from "node:http";
import { CORRELATION_ID_HEADER } from "../constants";

export function buildLoggerConfig(env: {
  NODE_ENV: "development" | "test" | "production";
  LOG_LEVEL: string;
  SERVICE_NAME: string;
}): Params {
  const isProd = env.NODE_ENV === "production";
  return {
    pinoHttp: {
      level: env.LOG_LEVEL,
      base: { service: env.SERVICE_NAME, env: env.NODE_ENV },
      genReqId: (req: IncomingMessage) => {
        const headers = req.headers ?? {};
        const fromHeader = headers[CORRELATION_ID_HEADER];
        const id = Array.isArray(fromHeader) ? fromHeader[0] : fromHeader;
        return id && id.length > 0 ? id : randomUUID();
      },
      customProps: (req) => ({
        correlationId: (req as IncomingMessage & { correlationId?: string })
          .correlationId,
      }),
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body.password",
          "req.body.token",
          "*.password",
        ],
        remove: true,
      },
      transport: isProd
        ? undefined
        : {
            target: "pino-pretty",
            options: { singleLine: true, translateTime: "SYS:HH:MM:ss.l" },
          },
    },
  };
}
