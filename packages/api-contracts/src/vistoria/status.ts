import { z } from "zod";

/**
 * Os 9 estados da SAGA de Vistoria.
 * Definidos em CLAUDE.md raiz (princípio arquitetural #5):
 * SOLICITADA → ROTEADA → AGENDADA → CONFIRMADA → EM_EXECUCAO →
 * LAUDO_PENDENTE → LAUDO_APROVADO → CONCLUIDA | CANCELADA
 */
export const StatusVistoriaSchema = z.enum([
  "SOLICITADA",
  "ROTEADA",
  "AGENDADA",
  "CONFIRMADA",
  "EM_EXECUCAO",
  "LAUDO_PENDENTE",
  "LAUDO_APROVADO",
  "CONCLUIDA",
  "CANCELADA",
]);

export type StatusVistoria = z.infer<typeof StatusVistoriaSchema>;

/** Estados que admitem transição para CANCELADA. */
export const STATUS_CANCELAVEIS: ReadonlyArray<StatusVistoria> = [
  "SOLICITADA",
  "ROTEADA",
  "AGENDADA",
  "CONFIRMADA",
];

/** Estados terminais (não admitem mais transições). */
export const STATUS_TERMINAIS: ReadonlyArray<StatusVistoria> = [
  "CONCLUIDA",
  "CANCELADA",
];

export const TipoVistoriaSchema = z.enum(["ENTRADA", "SAIDA"]);
export type TipoVistoria = z.infer<typeof TipoVistoriaSchema>;
