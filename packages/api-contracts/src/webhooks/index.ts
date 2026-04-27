export * from "./rede-vistorias";
export * from "./conceitual";

import type { StatusVistoria } from "../vistoria/status";
import type { RedeVistoriasStatus } from "./rede-vistorias";
import type { ConceitualStatus } from "./conceitual";

/** Mapping Rede Vistorias → enum unificado. */
export const REDE_VISTORIAS_TO_STATUS: Readonly<
  Record<RedeVistoriasStatus, StatusVistoria>
> = {
  PENDING: "SOLICITADA",
  SCHEDULED: "AGENDADA",
  CONFIRMED: "CONFIRMADA",
  IN_PROGRESS: "EM_EXECUCAO",
  REPORT_PENDING: "LAUDO_PENDENTE",
  COMPLETED: "CONCLUIDA",
  CANCELED: "CANCELADA",
};

/** Mapping Conceitual → enum unificado. */
export const CONCEITUAL_TO_STATUS: Readonly<
  Record<ConceitualStatus, StatusVistoria>
> = {
  AGUARDANDO: "SOLICITADA",
  AGENDADA: "AGENDADA",
  EM_VISTORIA: "EM_EXECUCAO",
  AGUARDANDO_LAUDO: "LAUDO_PENDENTE",
  LAUDO_OK: "LAUDO_APROVADO",
  FINALIZADA: "CONCLUIDA",
  CANCELADA: "CANCELADA",
};
