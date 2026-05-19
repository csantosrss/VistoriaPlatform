import type { StatusVistoria } from "@vistoria/api-contracts";
import { Badge, type BadgeProps } from "@/components/ui/badge";

const VARIANT: Record<StatusVistoria, BadgeProps["variant"]> = {
  SOLICITADA: "secondary",
  ROTEADA: "outline",
  AGENDADA: "default",
  CONFIRMADA: "default",
  EM_EXECUCAO: "warning",
  LAUDO_PENDENTE: "warning",
  LAUDO_APROVADO: "success",
  CONCLUIDA: "success",
  CANCELADA: "destructive",
};

const LABEL: Record<StatusVistoria, string> = {
  SOLICITADA: "Solicitada",
  ROTEADA: "Roteada",
  AGENDADA: "Agendada",
  CONFIRMADA: "Confirmada",
  EM_EXECUCAO: "Em execução",
  LAUDO_PENDENTE: "Laudo pendente",
  LAUDO_APROVADO: "Laudo aprovado",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export function VistoriaStatusBadge({ status }: { status: StatusVistoria }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
