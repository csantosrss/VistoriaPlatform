import { AlertCircle, Circle, CircleCheck, CircleDot } from "lucide-react";
import type {
  StatusVistoria,
  VistoriaTransicao,
} from "@vistoria/api-contracts";
import { Skeleton } from "@/components/ui/skeleton";
import { useVistoriaTransicoes } from "../hooks/use-vistoria-transicoes";

const STATUS_LABEL: Record<StatusVistoria, string> = {
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

function iconFor(status: StatusVistoria, isLast: boolean) {
  if (status === "CANCELADA") return AlertCircle;
  if (status === "CONCLUIDA" || status === "LAUDO_APROVADO") return CircleCheck;
  return isLast ? CircleDot : Circle;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

function TimelineItem({
  transicao,
  isLast,
}: {
  transicao: VistoriaTransicao;
  isLast: boolean;
}) {
  const Icon = iconFor(transicao.para, isLast);
  const accent =
    transicao.para === "CANCELADA"
      ? "text-destructive"
      : transicao.para === "CONCLUIDA" || transicao.para === "LAUDO_APROVADO"
        ? "text-emerald-600 dark:text-emerald-500"
        : "text-primary";
  return (
    <li className="relative pl-8">
      <span
        className={`absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center ${accent}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      {!isLast && (
        <span
          aria-hidden
          className="absolute left-3 top-7 h-full w-px bg-border"
        />
      )}
      <div className="pb-6">
        <p className="text-sm font-medium">
          {transicao.de ? `${STATUS_LABEL[transicao.de]} → ` : ""}
          {STATUS_LABEL[transicao.para]}
        </p>
        <p className="text-xs text-muted-foreground">
          {fmt(transicao.createdAt)}
        </p>
        {transicao.motivo && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">Motivo:</span> {transicao.motivo}
          </p>
        )}
      </div>
    </li>
  );
}

export function VistoriaTransicoesTimeline({ id }: { id: string }) {
  const { data, isLoading, isError, error } = useVistoriaTransicoes(id);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Falha ao carregar timeline: {(error as Error)?.message ?? "erro"}.
      </p>
    );
  }
  if (!data || data.data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma transição registrada ainda.
      </p>
    );
  }
  return (
    <ol className="relative" data-testid="vistoria-timeline">
      {data.data.map((t, i) => (
        <TimelineItem
          key={t.id}
          transicao={t}
          isLast={i === data.data.length - 1}
        />
      ))}
    </ol>
  );
}
