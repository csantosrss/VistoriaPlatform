import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HealthCard } from "./components/HealthCard";
import { useHealth } from "./hooks/use-health";

export function HealthPage() {
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useHealth();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Status do Sistema
          </h2>
          <p className="text-muted-foreground">
            Verificação agregada de PostgreSQL, Redis e RabbitMQ. Polling a cada
            15s.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
          />
          Atualizar
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}

      {isError && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Falha ao consultar /health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message ?? "Erro desconhecido."} Em dev,
              garanta que{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">apps/api</code>{" "}
              está rodando em{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">
                localhost:3000
              </code>
              .
            </p>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card
            className={
              data.status === "ok"
                ? "border-success/50"
                : "border-destructive/50"
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {data.status === "ok" ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                Status agregado: {data.status.toUpperCase()}
              </CardTitle>
            </CardHeader>
          </Card>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(data.details).map(([name, entry]) => (
              <HealthCard key={name} name={name} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
