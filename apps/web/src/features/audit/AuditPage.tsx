import { useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLogs } from "./hooks/use-audit-logs";

const PAGE_SIZE = 30;

const ACTION_OPTIONS = [
  "",
  "VISTORIA.CREATED",
  "VISTORIA.CANCELED",
  "VISTORIA.STATUS_CHANGED",
  "VISTORIA.WEBHOOK_RECEIVED",
] as const;

export function AuditPage() {
  const [action, setAction] = useState<string>("");
  const [resourceId, setResourceId] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, isFetching } = useAuditLogs({
    resourceType: "Vistoria",
    action: action || undefined,
    resourceId: resourceId || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Auditoria</h2>
        <p className="text-muted-foreground">
          Eventos do recurso <code>Vistoria</code> incluindo transições de
          status disparadas por webhook (quando o BE consumir os eventos do
          Sprint 08).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="audit-action">Ação</Label>
              <Select
                id="audit-action"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className="w-64"
              >
                {ACTION_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a || "Todas"}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audit-resource-id">Resource ID</Label>
              <Input
                id="audit-resource-id"
                placeholder="uuid"
                value={resourceId}
                onChange={(e) => {
                  setResourceId(e.target.value);
                  setPage(1);
                }}
                className="w-80 font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-64" />}

      {isError && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Falha ao consultar audit logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message ?? "Erro desconhecido."}
            </p>
          </CardContent>
        </Card>
      )}

      {data && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Quando</th>
                    <th className="px-4 py-3 font-medium">Ação</th>
                    <th className="px-4 py-3 font-medium">Resource ID</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Correlation</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        Nenhum evento para os filtros atuais.
                      </td>
                    </tr>
                  )}
                  {data.data.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b align-top last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {log.resourceId ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {log.userId ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {log.correlationId ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <div className="text-muted-foreground">
                {data.total} total · página {data.page} de {totalPages}
                {isFetching && " · atualizando..."}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages || isFetching}
                >
                  Próxima
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
