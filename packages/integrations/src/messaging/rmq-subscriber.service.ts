import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as amqp from "amqplib";
import type { Channel, ChannelModel, ConsumeMessage } from "amqplib";

export type RmqHandler = (
  payload: unknown,
  meta: {
    routingKey: string;
    correlationId?: string;
    rawMessage: ConsumeMessage;
  },
) => Promise<void>;

/**
 * Subscriber RabbitMQ para o exchange topic `vistoria.events`.
 *
 * Uso (a ser feito por módulos de domínio após o BE liberar entidades):
 * ```ts
 * subscriber.subscribe('vistoria.solicitada', async (payload, meta) => { ... });
 * ```
 *
 * Sprint 03 entrega o subscriber operacional; o BE Sprint 03+ registra handlers.
 */
@Injectable()
export class RmqSubscriber implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RmqSubscriber.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly handlers = new Map<string, RmqHandler[]>();
  private queueName = "";

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>("RABBITMQ_URL");
    const exchange = this.config.get<string>(
      "RABBITMQ_EXCHANGE",
      "vistoria.events",
    );
    if (!url) {
      this.logger.warn("RABBITMQ_URL não definida; RmqSubscriber inativo");
      return;
    }
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(exchange, "topic", { durable: true });
      const q = await this.channel.assertQueue("integrations.events", {
        durable: true,
        deadLetterExchange: `${exchange}.dlx`,
      });
      this.queueName = q.queue;
      // bind genérico — handlers filtram pelo routingKey
      await this.channel.bindQueue(this.queueName, exchange, "vistoria.#");
      await this.channel.consume(
        this.queueName,
        (msg) => void this.dispatch(msg),
        {
          noAck: false,
        },
      );
      this.logger.log(
        `Subscribed to ${exchange} (routing "vistoria.#") via queue "${this.queueName}"`,
      );
    } catch (err) {
      this.logger.error({ err }, "Failed to connect to RabbitMQ");
    }
  }

  /** Registra um handler para uma routing-key específica (match exato). */
  subscribe(routingKey: string, handler: RmqHandler): void {
    const existing = this.handlers.get(routingKey) ?? [];
    existing.push(handler);
    this.handlers.set(routingKey, existing);
  }

  private async dispatch(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;
    const routingKey = msg.fields.routingKey;
    const handlers = this.handlers.get(routingKey) ?? [];
    if (handlers.length === 0) {
      // Nenhum handler — descarta com ack para não acumular na fila
      this.channel.ack(msg);
      return;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(msg.content.toString("utf8"));
    } catch {
      this.logger.error(
        { routingKey },
        "Invalid JSON payload; nack with no requeue",
      );
      this.channel.nack(msg, false, false);
      return;
    }
    try {
      await Promise.all(
        handlers.map((h) =>
          h(payload, {
            routingKey,
            correlationId: msg.properties.correlationId,
            rawMessage: msg,
          }),
        ),
      );
      this.channel.ack(msg);
    } catch (err) {
      this.logger.error(
        { err, routingKey },
        "Handler error; requeue=false → DLQ",
      );
      this.channel.nack(msg, false, false);
    }
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
