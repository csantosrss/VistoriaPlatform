import { useState } from "react";
import { Loader2, Lock, X } from "lucide-react";
import { isAxiosError } from "axios";
import type { BulkOpResponse } from "@vistoria/api-contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBulkBlockAgenda } from "../hooks/use-bulk-block-agenda";

interface Props {
  vistoriadorId: string;
  defaultFromIso: string;
  defaultToIso: string;
  onClose: () => void;
}

function toIsoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function describeError(err: unknown): string {
  if (isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) return msg.join("; ");
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Falha desconhecida";
}

export function BulkBlockDialog({
  vistoriadorId,
  defaultFromIso,
  defaultToIso,
  onClose,
}: Props) {
  const [from, setFrom] = useState(toIsoDay(new Date(defaultFromIso)));
  const [to, setTo] = useState(toIsoDay(new Date(defaultToIso)));
  const [motivo, setMotivo] = useState("");
  const [result, setResult] = useState<BulkOpResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mut = useBulkBlockAgenda(vistoriadorId);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) return;
    setError(null);
    try {
      const r = await mut.mutateAsync({
        from: new Date(`${from}T00:00:00`).toISOString(),
        to: new Date(`${to}T23:59:59`).toISOString(),
        motivo: motivo || undefined,
      });
      setResult(r);
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Bloquear período"
    >
      <div className="w-full max-w-md rounded-lg border bg-card shadow-lg">
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold">Bloquear período</h3>
            <p className="text-xs text-muted-foreground">
              Bloqueia em uma transação todos os slots livres no intervalo.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 px-5 py-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="bb-from">De</Label>
              <Input
                id="bb-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bb-to">Até</Label>
              <Input
                id="bb-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="bb-motivo">Motivo (opcional)</Label>
            <Input
              id="bb-motivo"
              placeholder="Ex.: férias, plantão, capacitação..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {result && (
            <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs">
              <p className="font-medium">
                {result.affectedCount} slot(s) bloqueado(s).
              </p>
              {result.excluded && result.excluded.length > 0 && (
                <p className="text-muted-foreground">
                  {result.excluded.length} ignorado(s) — primeiro motivo:{" "}
                  {result.excluded[0].reason}
                </p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={mut.isPending}
            >
              {result ? "Fechar" : "Cancelar"}
            </Button>
            <Button type="submit" disabled={mut.isPending || result !== null}>
              {mut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {result ? "Concluído" : "Bloquear"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
