import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
        <Card>
          <CardHeader>
            <CardTitle>Vistorias ativas</CardTitle>
            <CardDescription>Em andamento agora</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">—</div>
            <p className="text-xs text-muted-foreground">
              Aguardando endpoint do BE Sprint 03+
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Concluídas hoje</CardTitle>
            <CardDescription>Últimas 24h</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">—</div>
            <p className="text-xs text-muted-foreground">
              Aguardando endpoint do BE Sprint 03+
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saúde do sistema</CardTitle>
            <CardDescription>DB, Redis, RabbitMQ</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Veja a página{" "}
              <a href="/health" className="font-medium underline">
                Status
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
