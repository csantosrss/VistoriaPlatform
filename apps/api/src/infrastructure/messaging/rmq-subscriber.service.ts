import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import * as amqp from "amqplib";
import type { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import { TypedConfigService } from "../../config/typed-config.service";

export interface RmqMessageMeta {
  routingKey: string;
  correlationId?: string;
  headers?: Record<string, unknown>;
}

export type RmqHandler = (
  payload: unknown,
  meta: RmqMessageMeta,
) => Promise<void>;

/**
 * Consumer RabbitMQ do lado do `apps/api`. Cria sua própria fila durável
 * (`apps-api.events`) ligada ao exchange `vistoria.events` com binding
 * `vistoria.#`, e despacha mensagens para handlers registrados via
 * {@link subscribe}.
 *
 * Mantido em paralelo ao subscriber do `@vistoria/integrations` (que
 * pertence ao IN) para preservar o contrato de boundary: IN publica,
 * BE consome — sem cross-import de módulos NestJS dinâmicos.
 *
 * Em ausência de `RABBITMQ_URL` (ex.: testes unitários) o serviço fica
 * no-op silencioso — `subscribe()` aceita handlers mas o consumer nunca
 * será iniciado.
 */
@Injectable()
export class RmqSubscriber implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RmqSubscriber.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly handlers = new Map<string, RmqHandler[]>();
  private queueName = "";

  constructor(private readonly config: TypedConfigService) {}

  /** Registra um handler para uma routing-key exata. Pode ser chamado antes do init. */
  subscribe(routingKey: string, handler: RmqHandler): void {
    const existing = this.handlers.get(routingKey) ?? [];
    existing.push(handler);
    this.handlers.set(routingKey, existing);
  }

  async onModuleInit(): Promise<void> {
    const url = this.config.get("RABBITMQ_URL");
    const exchange = this.config.get("RABBITMQ_EXCHANGE");
    if (!url) {
      this.logger.warn(
        "RABBITMQ_URL não definida; RmqSubscriber inativo (handlers ficam registrados mas nenhuma mensagem será consumida)",
      );
      return;
    }
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(exchange, "topic", { durable: true });
      const q = await this.channel.assertQueue("apps-api.events", {
        durable: true,
        deadLetterExchange: `${exchange}.dlx`,
      });
      this.queueName = q.queue;
      await this.channel.bindQueue(this.queueName, exchange, "vistoria.#");
      await this.channel.consume(
        this.queueName,
        (msg) => void this.dispatch(msg),
        { noAck: false },
      );
      this.logger.log(
        `Subscribed to ${exchange} (routing "vistoria.#") via queue "${this.queueName}"`,
      );
    } catch (err) {
      this.logger.error({ err }, "Failed to connect to RabbitMQ");
    }
  }

  private async dispatch(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;
    const routingKey = msg.fields.routingKey;
    const handlers = this.handlers.get(routingKey) ?? [];
    if (handlers.length === 0) {
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
            headers: msg.properties.headers as Record<string, unknown>,
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
