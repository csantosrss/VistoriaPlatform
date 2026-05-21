import { z } from "zod";
import { StatusVistoriaSchema, TipoVistoriaSchema } from "./status.js";

/**
 * Payload do evento `vistoria.status.changed` publicado pelo IN
 * (`packages/integrations` → `RmqVistoriaStatusWriter`) no exchange
 * `vistoria.events`. BE consome este evento desde a Sprint 12 e aplica
 * a transição na SAGA de forma idempotente.
 *
 * Espelha o shape do `VistoriaStatusUpdate` (port). Não é um schema de
 * request/response HTTP — é o contrato entre publisher (IN) e consumer
 * (BE) cruzando o broker.
 *
 * `eventId` foi adicionado na Sprint 13 IN para permitir dedup por
 * identificador único no futuro (ADR-015). Optional para retro-compat
 * com publishers pré-13; o writer atual sempre preenche.
 */
export const VistoriaStatusChangedEventSchema = z.object({
  eventId: z.string().uuid().optional(),
  vistoriaId: z.string().uuid(),
  tenantId: z.string().uuid(),
  newStatus: StatusVistoriaSchema,
  motivo: z.string().optional(),
  source: z.string().min(1),
  correlationId: z.string().optional(),
  rawPayload: z.unknown().optional(),
});
export type VistoriaStatusChangedEvent = z.infer<
  typeof VistoriaStatusChangedEventSchema
>;

/**
 * Payload do evento `vistoria.routed` que o BE publicará no exchange
 * `vistoria.events` ao decidir um provider para uma Vistoria recém-criada.
 *
 * IN consome via `AgendamentoOrchestrator` e dispara `agendar()` no
 * provider correspondente. Carrega o snapshot necessário para o
 * `agendar()` (Sprint 13 IN: payload-thick para evitar IN→BE read).
 *
 * **Estado atual (Sprint 13)**: schema definido, IN já consome; BE ainda
 * não publica (pedido em `docs/agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md`).
 * Quando BE Sprint 16 publicar, o caminho async fecha sem mais mudanças no IN.
 */
export const VistoriaRoutedEventSchema = z.object({
  eventId: z.string().uuid(),
  vistoriaId: z.string().uuid(),
  tenantId: z.string().uuid(),
  providerId: z.enum(["rede-vistorias", "conceitual", "interno"]),
  reason: z.string().min(1),
  tipo: TipoVistoriaSchema,
  enderecoCompleto: z.string().min(1),
  cep: z.string().min(8),
  contato: z.object({
    nome: z.string().min(1),
    telefone: z.string().min(8),
    email: z.string().email().optional(),
  }),
  observacoes: z.string().optional(),
  dataPreferida: z.string().datetime().optional(),
  correlationId: z.string().optional(),
  /**
   * Sprint 18 IN: vistoriador pré-atribuído pelo BE quando o routing
   * começar a consultar a agenda. Opcional — providers ignoram se ausente.
   */
  vistoriadorId: z.string().uuid().optional(),
});
export type VistoriaRoutedEvent = z.infer<typeof VistoriaRoutedEventSchema>;
