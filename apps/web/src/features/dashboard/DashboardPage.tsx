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
import { useVistorias } from "@/features/vistorias/hooks/use-vistorias";

interface KpiSpec {
  title: string;
  description: string;
  statuses: StatusVistoria[];
}

const KPIS: KpiSpec[] = [
  {
    title: "Solicitadas",
    description: "Aguardando roteamento",
    statuses: ["SOLICITADA"],
  },
  {
    title: "Em execução",
    description: "Em campo no momento",
    statuses: ["EM_EXECUCAO"],
  },
  {
    title: "Concluídas",
    description: "Total histórico (todas as datas)",
    statuses: ["CONCLUIDA"],
  },
];

function KpiCard({ spec }: { spec: KpiSpec }) {
  // pageSize=1 economiza payload — só queremos o `total`.
  const { data, isLoading, isError } = useVistorias({
    status: spec.statuses[0],
    pageSize: 1,
  });
  return (
    <Card>
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
          <div className="text-3xl font-semibold">{data?.total ?? 0}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral da plataforma de vistorias.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {KPIS.map((spec) => (
          <KpiCard key={spec.title} spec={spec} />
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
