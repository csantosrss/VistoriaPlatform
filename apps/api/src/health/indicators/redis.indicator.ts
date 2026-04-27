import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from "@nestjs/terminus";
import Redis from "ioredis";
import { TypedConfigService } from "../../config/typed-config.service";

@Injectable()
export class RedisHealthIndicator implements OnApplicationShutdown {
  private readonly client: Redis;

  constructor(
    private readonly indicators: HealthIndicatorService,
    config: TypedConfigService,
  ) {
    this.client = new Redis(config.get("REDIS_URL"), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(key);
    try {
      if (this.client.status === "wait" || this.client.status === "end") {
        await this.client.connect();
      }
      const pong = await this.client.ping();
      if (pong !== "PONG") {
        return indicator.down({ message: `Unexpected response: ${pong}` });
      }
      return indicator.up();
    } catch (err) {
      return indicator.down({
        message: err instanceof Error ? err.message : "Redis unreachable",
      });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.status !== "end") {
      this.client.disconnect();
    }
  }
}
