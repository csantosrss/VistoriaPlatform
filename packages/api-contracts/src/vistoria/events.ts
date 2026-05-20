import { z } from "zod";
import { StatusVistoriaSchema } from "./status.js";

/**
 * Payload do evento `vistoria.status.changed` publicado pelo IN
 * (`packages/integrations` → `RmqVistoriaStatusWriter`) no exchange
 * `vistoria.events`. BE consome este evento desde a Sprint 12 e aplica
 * a transição na SAGA de forma idempotente.
 *
 * Espelha o shape do `VistoriaStatusUpdate` (port). Não é um schema de
 * request/response HTTP — é o contrato entre publisher (IN) e consumer
 * (BE) cruzando o broker.
 */
export const VistoriaStatusChangedEventSchema = z.object({
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
