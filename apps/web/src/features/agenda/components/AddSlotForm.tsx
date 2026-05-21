import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateAgendaSlots } from "../hooks/use-create-agenda-slots";

/**
 * Form mínimo para adicionar um slot (datetime-local x2 + disponivel + motivo).
 * Bulk creation existe no BE mas a UI v1 cria um slot por vez para evitar
 * fricção. Quando o produto pedir, dá para evoluir para um seletor de
 * janela recorrente (ex.: "seg-sex 8h-18h por 4 semanas").
 */
export function AddSlotForm({ vistoriadorId }: { vistoriadorId: string }) {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [disponivel, setDisponivel] = useState(true);
  const [motivo, setMotivo] = useState("");
  const mut = useCreateAgendaSlots(vistoriadorId);

  const reset = () => {
    setInicio("");
    setFim("");
    setMotivo("");
    setDisponivel(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inicio || !fim) return;
    mut.mutate(
      {
        slots: [
          {
            inicio: new Date(inicio).toISOString(),
            fim: new Date(fim).toISOString(),
            disponivel,
            motivo: motivo || undefined,
          },
        ],
      },
      { onSuccess: reset },
    );
  };

  const errorMessage = mut.error
    ? isAxiosError(mut.error) && mut.error.response?.data?.message
      ? String(mut.error.response.data.message)
      : (mut.error.message ?? "Falha ao criar slot.")
    : null;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="inicio">Início</Label>
          <Input
            id="inicio"
            type="datetime-local"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fim">Fim</Label>
          <Input
            id="fim"
            type="datetime-local"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={disponivel}
            onChange={(e) => setDisponivel(e.target.checked)}
          />
          Disponível (desmarque para bloquear)
        </label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="motivo">Motivo (opcional)</Label>
        <Input
          id="motivo"
          placeholder="Ex.: férias, plantão, capacitação..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={500}
        />
      </div>
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Adicionar slot
        </Button>
      </div>
    </form>
  );
}
