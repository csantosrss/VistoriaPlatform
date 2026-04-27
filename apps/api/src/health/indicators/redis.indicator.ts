import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from "@nestjs/terminus";
import Redis from "ioredis";
import { TypedConfigService } from "../../config/typed-config.service";

@Injectable()
export class RedisHealthIndicator
  extends HealthIndicator
  implements OnApplicationShutdown
{
  private readonly client: Redis;

  constructor(config: TypedConfigService) {
    super();
    this.client = new Redis(config.get("REDIS_URL"), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      if (this.client.status === "wait" || this.client.status === "end") {
        await this.client.connect();
      }
      const pong = await this.client.ping();
      if (pong !== "PONG") {
        const result = this.getStatus(key, false, {
          message: `Unexpected response: ${pong}`,
        });
        throw new HealthCheckError("Redis check failed", result);
      }
      return this.getStatus(key, true);
    } catch (err) {
      if (err instanceof HealthCheckError) {
        throw err;
      }
      const result = this.getStatus(key, false, {
        message: err instanceof Error ? err.message : "Redis unreachable",
      });
      throw new HealthCheckError("Redis check failed", result);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.status !== "end") {
      this.client.disconnect();
    }
  }
}
