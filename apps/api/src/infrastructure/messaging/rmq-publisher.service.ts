import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import * as amqp from "amqplib";
import type { ChannelModel, Channel } from "amqplib";
import { TypedConfigService } from "../../config/typed-config.service";

export interface PublishOptions {
  routingKey: string;
  payload: unknown;
  correlationId?: string;
  headers?: Record<string, string>;
}

@Injectable()
export class RmqPublisher implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RmqPublisher.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(private readonly config: TypedConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get("RABBITMQ_URL");
    const exchange = this.config.get("RABBITMQ_EXCHANGE");
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(exchange, "topic", { durable: true });
      this.logger.log(`Connected to RabbitMQ; exchange "${exchange}" asserted`);
    } catch (err) {
      this.logger.error(
        { err },
        "Failed to connect to RabbitMQ; publish will throw",
      );
    }
  }

  async publish({
    routingKey,
    payload,
    correlationId,
    headers,
  }: PublishOptions): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }
    const exchange = this.config.get("RABBITMQ_EXCHANGE");
    const buffer = Buffer.from(JSON.stringify(payload));
    this.channel.publish(exchange, routingKey, buffer, {
      contentType: "application/json",
      persistent: true,
      correlationId,
      headers,
      timestamp: Date.now(),
    });
  }

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (err) {
      this.logger.warn({ err }, "Error while closing RabbitMQ resources");
    }
  }
}
