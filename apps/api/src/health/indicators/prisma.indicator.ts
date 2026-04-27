import { Injectable } from "@nestjs/common";
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from "@nestjs/terminus";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly indicators: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(key);
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return indicator.up();
    } catch (err) {
      return indicator.down({
        message: err instanceof Error ? err.message : "Database unreachable",
      });
    }
  }
}
