import { Link } from "react-router-dom";
import type { StatusVistoria } from "@vistoria/api-contracts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVistoriasStats } from "@/features/vistorias/hooks/use-vistorias-stats";

interface KpiSpec {
  title: string;
  description: string;
  statuses: StatusVistoria[];
}

/**
 * KPIs do dashboard. Cada card soma os contadores dos status listados em
 * `statuses`, lidos do agregado `GET /vistorias/stats` (Sprint 12 BE) —
 * substituiu as 3 chamadas paralelas a `/vistorias?status=...&pageSize=1`
 * do dashboard original (Sprint 09 FE).
 *
 * KPI "Roteadas" entrou no Sprint 14 FE porque a Sprint 12 BE passou a
 * rotear vistorias inline na criação: o backlog de SOLICITADA ficava em 0
 * e a etapa de routing desaparecia da visão do gestor.
 */
const KPIS: KpiSpec[] = [
  {
    title: "Solicitadas",
    description: "Aguardando roteamento",
    statuses: ["SOLICITADA"],
  },
  {
    title: "Roteadas",
    description: "Provider definido, aguardando agendamento",
    statuses: ["ROTEADA"],
  },
  {
    title: "Em execução",
    description: "Em campo no momento",
    statuses: ["AGENDADA", "CONFIRMADA", "EM_EXECUCAO"],
  },
  {
    title: "Concluídas",
    description: "Total histórico (todas as datas)",
    statuses: ["LAUDO_APROVADO", "CONCLUIDA"],
  },
];

function sumByStatus(
  byStatus: Record<StatusVistoria, number> | undefined,
  statuses: StatusVistoria[],
): number {
  if (!byStatus) return 0;
  return statuses.reduce((acc, s) => acc + (byStatus[s] ?? 0), 0);
}

export function DashboardPage() {
  const { data, isLoading, isError } = useVistoriasStats();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral da plataforma de vistorias.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((spec) => (
          <Card key={spec.title}>
            <CardHeader>
              <CardTitle>{spec.title}</CardTitle>
              <CardDescription>{spec.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : isError ? (
                <p className="text-sm text-destructive">erro</p>
              ) : (
                <div className="text-3xl font-semibold">
                  {sumByStatus(data?.byStatus, spec.statuses)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Atalhos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Link to="/vistorias" className="font-medium underline">
            Lista de vistorias
          </Link>
          <Link to="/vistorias/novo" className="font-medium underline">
            Nova vistoria
          </Link>
          <Link to="/audit" className="font-medium underline">
            Auditoria
          </Link>
          <Link to="/health" className="font-medium underline">
            Status do sistema
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
