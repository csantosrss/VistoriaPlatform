import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVistorias } from "./hooks/use-vistorias";
import { VistoriaStatusBadge } from "./components/VistoriaStatusBadge";
import {
  VistoriasFilters,
  type VistoriasFiltersValue,
} from "./components/VistoriasFilters";

const PAGE_SIZE = 20;

export function VistoriasListPage() {
  const [filters, setFilters] = useState<VistoriasFiltersValue>({});
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useVistorias({
    ...filters,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vistorias</h2>
          <p className="text-muted-foreground">
            Listagem com filtros por status e tipo. Paginação 20 por página.
          </p>
        </div>
        <Button asChild>
          <Link to="/vistorias/novo">
            <Plus className="mr-2 h-4 w-4" />
            Nova vistoria
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <VistoriasFilters
            value={filters}
            onChange={(v) => {
              setFilters(v);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}

      {isError && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Falha ao listar vistorias
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
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Endereço</th>
                    <th className="px-4 py-3 font-medium">Cidade/UF</th>
                    <th className="px-4 py-3 font-medium">Contato</th>
                    <th className="px-4 py-3 font-medium">Criada em</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        Nenhuma vistoria para os filtros atuais.
                      </td>
                    </tr>
                  )}
                  {data.data.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <VistoriaStatusBadge status={v.status} />
                      </td>
                      <td className="px-4 py-3">{v.tipo}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/vistorias/${v.id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {v.enderecoLogradouro}, {v.enderecoNumero}
                          {v.enderecoComplemento
                            ? ` — ${v.enderecoComplemento}`
                            : ""}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {v.enderecoCidade}/{v.enderecoUf}
                      </td>
                      <td className="px-4 py-3">{v.contatoNome}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(v.createdAt).toLocaleString("pt-BR")}
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
