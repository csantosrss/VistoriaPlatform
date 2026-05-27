import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useCreateCobertura } from "../hooks/use-create-cobertura";
import { useIbgeMunicipios } from "../hooks/use-ibge-municipios";
import { useIbgeUfs } from "../hooks/use-ibge-ufs";
import { useNominatimBairros } from "../hooks/use-nominatim-bairros";

/**
 * Form para adicionar uma área de cobertura do vistoriador.
 *
 * UX:
 *  - UF: select com 27 estados do IBGE (cache localStorage; fallback input
 *    livre se IBGE estiver fora do ar).
 *  - Cidade: combobox via `<input list="...">` com municípios da UF
 *    selecionada (Tanstack Query staleTime 24h). Bairro só habilita
 *    quando cidade preenchida.
 *  - Bairro: input com datalist preenchido por Nominatim (S35 FE).
 *    Debounce 350ms; cache 1h por (uf, cidade, prefix); fallback gracioso
 *    para input livre se Nominatim falhar.
 *  - Mensagem clara em 409 (mostra qual regra existente bloqueia).
 */
export function AddCoberturaForm({ userId }: { userId: string }) {
  const ufsQuery = useIbgeUfs();
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const municipiosQuery = useIbgeMunicipios(uf);
  const bairrosQuery = useNominatimBairros(bairro, cidade, uf);
  const mut = useCreateCobertura(userId);

  const reset = () => {
    setCidade("");
    setBairro("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uf) return;
    mut.mutate(
      {
        uf,
        cidade: cidade || undefined,
        bairro: bairro || undefined,
      },
      { onSuccess: reset },
    );
  };

  const ufsList = ufsQuery.data ?? [];
  const ibgeOffline = ufsQuery.isError;
  const municipios = municipiosQuery.data ?? [];

  const errorMessage = mut.error
    ? isAxiosError(mut.error) && mut.error.response?.data?.message
      ? String(mut.error.response.data.message)
      : (mut.error.message ?? "Falha ao criar cobertura.")
    : null;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="uf">UF</Label>
        {ibgeOffline ? (
          <Input
            id="uf"
            maxLength={2}
            value={uf}
            onChange={(e) => setUf(e.target.value.toUpperCase())}
            placeholder="SP"
          />
        ) : (
          <Select
            id="uf"
            value={uf}
            onChange={(e) => {
              setUf(e.target.value);
              setCidade("");
              setBairro("");
            }}
          >
            <option value="">Selecione</option>
            {ufsList.map((u) => (
              <option key={u.sigla} value={u.sigla}>
                {u.sigla} — {u.nome}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cidade">Cidade (opcional)</Label>
        <Input
          id="cidade"
          list="municipios-list"
          value={cidade}
          disabled={!uf}
          onChange={(e) => {
            setCidade(e.target.value);
            if (!e.target.value) setBairro("");
          }}
          placeholder={uf ? "Comece a digitar..." : "Selecione a UF primeiro"}
        />
        <datalist id="municipios-list">
          {municipios.map((m) => (
            <option key={m.nome} value={m.nome} />
          ))}
        </datalist>
        <p className="text-xs text-muted-foreground">
          Vazio = cobre toda a UF. Digite para escolher uma cidade específica.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bairro">Bairro (opcional)</Label>
        <Input
          id="bairro"
          list="bairros-list"
          value={bairro}
          disabled={!cidade}
          onChange={(e) => setBairro(e.target.value)}
          placeholder={
            cidade ? "Bairro específico..." : "Selecione a cidade primeiro"
          }
        />
        <datalist id="bairros-list">
          {(bairrosQuery.data ?? []).map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
        <p className="text-xs text-muted-foreground">
          Sugestões via OpenStreetMap (Nominatim). Pode digitar livre se o
          bairro não aparecer.
        </p>
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!uf || mut.isPending}>
          {mut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Adicionar cobertura
        </Button>
      </div>
    </form>
  );
}
