import { Injectable } from "@nestjs/common";
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from "@nestjs/terminus";
import * as amqp from "amqplib";
import { TypedConfigService } from "../../config/typed-config.service";

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
  constructor(private readonly config: TypedConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
    try {
      connection = await amqp.connect(this.config.get("RABBITMQ_URL"));
      return this.getStatus(key, true);
    } catch (err) {
      const result = this.getStatus(key, false, {
        message: err instanceof Error ? err.message : "RabbitMQ unreachable",
      });
      throw new HealthCheckError("RabbitMQ check failed", result);
    } finally {
      try {
        await connection?.close();
      } catch {
        // ignore close errors during health check
      }
    }
  }
}
