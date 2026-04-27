import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { PrismaHealthIndicator } from "./indicators/prisma.indicator";
import { RedisHealthIndicator } from "./indicators/redis.indicator";
import { RabbitMQHealthIndicator } from "./indicators/rabbitmq.indicator";
import { TypedConfigService } from "../config/typed-config.service";

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    TypedConfigService,
    PrismaHealthIndicator,
    RedisHealthIndicator,
    RabbitMQHealthIndicator,
  ],
})
export class HealthModule {}
