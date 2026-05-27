import {
  Module,
  type DynamicModule,
  type Provider,
  type Type,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ConceitualProvider } from "./providers/conceitual.provider";
import { InternoProvider } from "./providers/interno.provider";
import { RedeVistoriasProvider } from "./providers/rede-vistorias.provider";
import { ProviderRoutingService } from "./routing/provider-routing.service";
import { WebhookSignatureVerifier } from "./webhooks/signature-verifier";
import { WebhookController } from "./webhooks/webhook.controller";
import { RmqSubscriber } from "./messaging/rmq-subscriber.service";
import { RmqVistoriaStatusWriter } from "./messaging/rmq-vistoria-status-writer.service";
import { AgendamentoOrchestrator } from "./orchestration/agendamento-orchestrator.service";
import { VISTORIA_STATUS_WRITER } from "./ports/vistoria-status-writer.port";
import {
  VISTORIA_READER,
  type VistoriaReaderPort,
} from "./ports/vistoria-reader.port";

/**
 * Opções do `IntegrationsModule.forRoot()`.
 *
 * Sprint 28 IN: `vistoriaReader` aceita o `Type` do adapter BE
 * (`apps/api/src/vistorias/vistoria-reader.adapter.ts`). Quando passado,
 * registra o token {@link VISTORIA_READER} para que `InternoProvider.consultar()`
 * funcione. Quando omitido, `consultar()` cai em `NotImplementedException`
 * — preserva forward-compat para consumidores legados.
 */
export interface IntegrationsModuleOptions {
  vistoriaReader?: Type<VistoriaReaderPort>;
}

@Module({})
export class IntegrationsModule {
  static forRoot(options: IntegrationsModuleOptions = {}): DynamicModule {
    const readerProviders: Provider[] = options.vistoriaReader
      ? [
          options.vistoriaReader,
          {
            provide: VISTORIA_READER,
            useExisting: options.vistoriaReader,
          },
        ]
      : [];
    return {
      module: IntegrationsModule,
      imports: [ConfigModule],
      controllers: [WebhookController],
      providers: [
        WebhookSignatureVerifier,
        InternoProvider,
        RmqSubscriber,
        ProviderRoutingService,
        RmqVistoriaStatusWriter,
        AgendamentoOrchestrator,
        {
          provide: VISTORIA_STATUS_WRITER,
          useExisting: RmqVistoriaStatusWriter,
        },
        ...readerProviders,
        {
          provide: RedeVistoriasProvider,
          inject: [ConfigService],
          useFactory: (config: ConfigService) =>
            new RedeVistoriasProvider({
              baseUrl: config.get<string>(
                "REDE_VISTORIAS_API_URL",
                "https://api.redevistorias.com.br",
              ),
              apiKey: config.get<string>("REDE_VISTORIAS_API_KEY", ""),
              timeoutMs: config.get<number>("PARTNER_HTTP_TIMEOUT_MS", 10_000),
            }),
        },
        {
          provide: ConceitualProvider,
          inject: [ConfigService],
          useFactory: (config: ConfigService) =>
            new ConceitualProvider({
              baseUrl: config.get<string>(
                "CONCEITUAL_API_URL",
                "https://api.conceitual.com.br",
              ),
              apiKey: config.get<string>("CONCEITUAL_API_KEY", ""),
              timeoutMs: config.get<number>("PARTNER_HTTP_TIMEOUT_MS", 10_000),
            }),
        },
      ],
      exports: [
        RedeVistoriasProvider,
        ConceitualProvider,
        InternoProvider,
        ProviderRoutingService,
        RmqSubscriber,
        RmqVistoriaStatusWriter,
        AgendamentoOrchestrator,
        VISTORIA_STATUS_WRITER,
        WebhookSignatureVerifier,
        ...(options.vistoriaReader ? [VISTORIA_READER] : []),
      ],
    };
  }
}
