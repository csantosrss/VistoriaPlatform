import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { ConfigModule } from "./config/config.module";
import type { Env } from "./config/env.schema";
import { CorrelationIdMiddleware } from "./common/middleware/correlation-id.middleware";
import { buildLoggerConfig } from "./common/logger/logger.config";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { VistoriasModule } from "./vistorias/vistorias.module";
import { UsersModule } from "./users/users.module";
import { AgendaModule } from "./agenda/agenda.module";
import { CoberturaModule } from "./cobertura/cobertura.module";
import { MetricsModule } from "./metrics/metrics.module";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";
import { VistoriaReaderAdapter } from "./vistorias/vistoria-reader.adapter";
import { IntegrationsModule } from "@vistoria/integrations";

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        buildLoggerConfig({
          NODE_ENV: config.get("NODE_ENV", { infer: true }),
          LOG_LEVEL: config.get("LOG_LEVEL", { infer: true }),
          SERVICE_NAME: config.get("SERVICE_NAME", { infer: true }),
        }),
    }),
    PrismaModule,
    MessagingModule,
    AuthModule,
    HealthModule,
    AuditLogsModule,
    VistoriasModule,
    UsersModule,
    AgendaModule,
    CoberturaModule,
    MetricsModule,
    // Sprint 28 IN: passa o adapter BE da `VistoriaReaderPort` para que o
    // `InternoProvider.consultar()` consiga ler estado via Prisma sem que
    // o package `integrations` importe do domínio do BE.
    IntegrationsModule.forRoot({ vistoriaReader: VistoriaReaderAdapter }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
