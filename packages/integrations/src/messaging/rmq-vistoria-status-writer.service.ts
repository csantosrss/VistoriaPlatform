import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as amqp from "amqplib";
import type {
  VistoriaStatusUpdate,
  VistoriaStatusWriterPort,
} from "../ports/vistoria-status-writer.port";

const ROUTING_KEY = "vistoria.status.changed";

/**
 * Implementação default de {@link VistoriaStatusWriterPort} que publica
 * a transição como evento topic no exchange `vistoria.events`.
 *
 * BE assina `vistoria.status.changed` num sprint próximo para aplicar a
 * mudança na entidade Vistoria + criar VistoriaTransicao + AuditLog.
 */
@Injectable()
export class RmqVistoriaStatusWriter
  implements VistoriaStatusWriterPort, OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(RmqVistoriaStatusWriter.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private exchange = "vistoria.events";

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>("RABBITMQ_URL");
    this.exchange = this.config.get<string>(
      "RABBITMQ_EXCHANGE",
      "vistoria.events",
    );
    if (!url) {
      this.logger.warn(
        "RABBITMQ_URL não definida; RmqVistoriaStatusWriter inativo (writes vão silenciosamente falhar)",
      );
      return;
    }
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, "topic", {
        durable: true,
      });
      this.logger.log(
        `RmqVistoriaStatusWriter conectado ao exchange "${this.exchange}"`,
      );
    } catch (err) {
      this.logger.error({ err }, "Falha ao conectar no RabbitMQ");
    }
  }

  async update(input: VistoriaStatusUpdate): Promise<void> {
    if (!this.channel) {
      this.logger.warn(
        { vistoriaId: input.vistoriaId, newStatus: input.newStatus },
        "Channel indisponível; evento descartado",
      );
      return;
    }
    const body = Buffer.from(JSON.stringify(input), "utf8");
    this.channel.publish(this.exchange, ROUTING_KEY, body, {
      persistent: true,
      contentType: "application/json",
      correlationId: input.correlationId,
      headers: {
        source: input.source,
        tenantId: input.tenantId,
      },
    });
    this.logger.log(
      {
        vistoriaId: input.vistoriaId,
        newStatus: input.newStatus,
        source: input.source,
      },
      `Publicado ${ROUTING_KEY}`,
    );
  }

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (err) {
      this.logger.warn({ err }, "Erro ao fechar recursos RabbitMQ");
    }
  }
}
