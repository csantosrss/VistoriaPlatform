import { Injectable } from "@nestjs/common";
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from "@nestjs/terminus";
import * as amqp from "amqplib";
import { TypedConfigService } from "../../config/typed-config.service";

@Injectable()
export class RabbitMQHealthIndicator {
  constructor(
    private readonly indicators: HealthIndicatorService,
    private readonly config: TypedConfigService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(key);
    let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
    try {
      connection = await amqp.connect(this.config.get("RABBITMQ_URL"));
      return indicator.up();
    } catch (err) {
      return indicator.down({
        message: err instanceof Error ? err.message : "RabbitMQ unreachable",
      });
    } finally {
      try {
        await connection?.close();
      } catch {
        // ignore close errors during health check
      }
    }
  }
}
