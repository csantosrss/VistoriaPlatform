import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { STATUS_CANCELAVEIS } from "@vistoria/api-contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVistoria } from "./hooks/use-vistoria";
import { VistoriaStatusBadge } from "./components/VistoriaStatusBadge";
import { CancelVistoriaForm } from "./components/CancelVistoriaForm";

function fmt(dt: string | null): string {
  return dt ? new Date(dt).toLocaleString("pt-BR") : "—";
}

export function VistoriaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useVistoria(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/vistorias">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Vistoria</h2>
        {data && <VistoriaStatusBadge status={data.status} />}
      </div>

      {isLoading && <Skeleton className="h-64" />}

      {isError && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Falha ao carregar vistoria
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
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Dados</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <Field label="Tipo" value={data.tipo} />
              <Field label="ID" value={data.id} mono />
              <Field
                label="Endereço"
                value={`${data.enderecoLogradouro}, ${data.enderecoNumero}${data.enderecoComplemento ? ` — ${data.enderecoComplemento}` : ""}`}
              />
              <Field
                label="Bairro / Cidade / UF"
                value={`${data.enderecoBairro} · ${data.enderecoCidade}/${data.enderecoUf}`}
              />
              <Field label="CEP" value={data.enderecoCep} />
              <Field label="Contato" value={data.contatoNome} />
              <Field label="Telefone" value={data.contatoTelefone} />
              <Field label="E-mail" value={data.contatoEmail ?? "—"} />
              <Field label="Provider" value={data.providerId ?? "—"} mono />
              <Field
                label="Vistoriador"
                value={data.vistoriadorId ?? "—"}
                mono
              />
              <Field label="Agendado para" value={fmt(data.agendadoPara)} />
              <Field label="Concluído em" value={fmt(data.concluidoEm)} />
              <Field label="Cancelado em" value={fmt(data.canceladoEm)} />
              <Field
                label="Motivo cancelamento"
                value={data.canceladoMotivo ?? "—"}
              />
              <Field label="Criado em" value={fmt(data.createdAt)} />
              <Field label="Atualizado em" value={fmt(data.updatedAt)} />
              {data.observacoes && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="whitespace-pre-wrap">{data.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cancelar</CardTitle>
            </CardHeader>
            <CardContent>
              {STATUS_CANCELAVEIS.includes(data.status) ? (
                <CancelVistoriaForm id={data.id} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Status atual ({data.status}) não admite cancelamento. Estados
                  canceláveis: {STATUS_CANCELAVEIS.join(", ")}.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={mono ? "break-all font-mono text-xs" : "break-words text-sm"}
      >
        {value}
      </p>
    </div>
  );
}
