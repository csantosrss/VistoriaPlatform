import type { StatusVistoria } from "@vistoria/api-contracts";

/**
 * Token de injeção (string) usado pelo NestJS para resolver a implementação
 * de {@link VistoriaStatusWriterPort} em runtime. Consumidores (apps/api)
 * podem sobrescrever passando `provide: VISTORIA_STATUS_WRITER, useClass: X`.
 */
export const VISTORIA_STATUS_WRITER = "VISTORIA_STATUS_WRITER";

/**
 * Sinaliza ao consumidor (apps/api) que a SAGA precisa transitar.
 *
 * IN escreve via essa interface; **não** importa diretamente o domínio do
 * apps/api (proibido pelo CLAUDE.md de IN). A implementação default é
 * publicar um evento no exchange `vistoria.events` (ver
 * {@link RmqVistoriaStatusWriter}); o BE assina e aplica a transição.
 *
 * Caso o consumidor queira fornecer uma implementação direta (síncrona
 * por exemplo), pode trocar via DI no `IntegrationsModule.forRoot()`.
 */
export interface VistoriaStatusWriterPort {
  update(input: VistoriaStatusUpdate): Promise<void>;
}

export interface VistoriaStatusUpdate {
  vistoriaId: string;
  /** Identificador interno do tenant, propagado para o consumidor. */
  tenantId: string;
  newStatus: StatusVistoria;
  /** Motivo opcional (ex.: razão de cancelamento). */
  motivo?: string;
  /** ProviderId originador do evento (`rede-vistorias`, `conceitual`, etc). */
  source: string;
  /** Correlation-id propagado do request. */
  correlationId?: string;
  /** Payload bruto recebido do parceiro (para audit). */
  rawPayload?: unknown;
}
