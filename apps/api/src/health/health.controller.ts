import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  type HealthCheckResult,
} from "@nestjs/terminus";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { PrismaHealthIndicator } from "./indicators/prisma.indicator";
import { RedisHealthIndicator } from "./indicators/redis.indicator";
import { RabbitMQHealthIndicator } from "./indicators/rabbitmq.indicator";

@ApiTags("health")
@Public()
@Controller({ path: "health", version: undefined })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly rabbitmq: RabbitMQHealthIndicator,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.isHealthy("database"),
      () => this.redis.isHealthy("redis"),
      () => this.rabbitmq.isHealthy("rabbitmq"),
    ]);
  }

  @Get("liveness")
  @HttpCode(HttpStatus.OK)
  liveness(): { status: "ok" } {
    return { status: "ok" };
  }
}
