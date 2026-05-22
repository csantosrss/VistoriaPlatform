import { Loader2, Trash2 } from "lucide-react";
import type { VistoriadorCobertura } from "@vistoria/api-contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AddCoberturaForm } from "./AddCoberturaForm";
import { useCoberturas } from "../hooks/use-coberturas";
import { useDeleteCobertura } from "../hooks/use-delete-cobertura";

function tupleLabel(c: VistoriadorCobertura): string {
  if (c.bairro) return `${c.uf} · ${c.cidade} · ${c.bairro}`;
  if (c.cidade) return `${c.uf} · ${c.cidade}`;
  return `${c.uf} (toda a UF)`;
}

function scopeBadge(c: VistoriadorCobertura): React.ReactNode {
  if (c.bairro) return <Badge variant="outline">Bairro</Badge>;
  if (c.cidade) return <Badge variant="secondary">Cidade</Badge>;
  return <Badge variant="default">UF inteira</Badge>;
}

function CoberturaRow({
  cobertura,
  userId,
}: {
  cobertura: VistoriadorCobertura;
  userId: string;
}) {
  const delMut = useDeleteCobertura(userId);
  return (
    <li className="flex items-center justify-between border-b py-2 last:border-b-0">
      <div className="flex items-center gap-2">
        {scopeBadge(cobertura)}
        <span className="text-sm">{tupleLabel(cobertura)}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={delMut.isPending}
        onClick={() => delMut.mutate(cobertura.id)}
      >
        {delMut.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </Button>
    </li>
  );
}

export function CoberturaCard({ userId }: { userId: string }) {
  const { data, isLoading, isError } = useCoberturas(userId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Áreas de cobertura</CardTitle>
        <CardDescription>
          Regiões em que o vistoriador atende. Hierarquia: só UF (cobre tudo),
          UF + cidade, UF + cidade + bairro. Redundância é bloqueada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-16" />
        ) : isError ? (
          <p className="text-sm text-destructive">
            Falha ao carregar coberturas.
          </p>
        ) : data?.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma cobertura cadastrada. Use o form abaixo.
          </p>
        ) : (
          <ul className="rounded-md border">
            {data?.data.map((c) => (
              <CoberturaRow key={c.id} cobertura={c} userId={userId} />
            ))}
          </ul>
        )}
        <div className="border-t pt-4">
          <AddCoberturaForm userId={userId} />
        </div>
      </CardContent>
    </Card>
  );
}
