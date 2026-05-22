import {
  StatusVistoriaSchema,
  TipoVistoriaSchema,
  type StatusVistoria,
  type TipoVistoria,
} from "@vistoria/api-contracts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export interface VistoriasFiltersValue {
  status?: StatusVistoria;
  tipo?: TipoVistoria;
  codigoImovelExterno?: string;
}

interface Props {
  value: VistoriasFiltersValue;
  onChange: (v: VistoriasFiltersValue) => void;
}

export function VistoriasFilters({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="filter-status">Status</Label>
        <Select
          id="filter-status"
          value={value.status ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              status: (e.target.value || undefined) as
                | StatusVistoria
                | undefined,
            })
          }
          className="w-48"
        >
          <option value="">Todos</option>
          {StatusVistoriaSchema.options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filter-tipo">Tipo</Label>
        <Select
          id="filter-tipo"
          value={value.tipo ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              tipo: (e.target.value || undefined) as TipoVistoria | undefined,
            })
          }
          className="w-36"
        >
          <option value="">Todos</option>
          {TipoVistoriaSchema.options.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filter-codigo">Código do imóvel</Label>
        <Input
          id="filter-codigo"
          placeholder="Ex.: IMV-2026-001"
          value={value.codigoImovelExterno ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              codigoImovelExterno: e.target.value || undefined,
            })
          }
          className="w-56"
        />
      </div>
    </div>
  );
}
