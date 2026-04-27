import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusVistoriaSchema } from "@vistoria/api-contracts";

const STATES = StatusVistoriaSchema.options;

export function VistoriasPlaceholderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Vistorias</h2>
        <p className="text-muted-foreground">
          Listagem e busca de vistorias — aguardando endpoints do BE Sprint 03+.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Estados da SAGA</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Os 9 estados unificados (definidos em{" "}
            <code>@vistoria/api-contracts</code>):
          </p>
          <ol className="list-decimal space-y-1 pl-6 text-sm">
            {STATES.map((state) => (
              <li key={state}>
                <code className="rounded bg-muted px-1.5 py-0.5">{state}</code>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
