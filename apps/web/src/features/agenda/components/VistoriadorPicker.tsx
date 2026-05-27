import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsers } from "@/features/users/hooks/use-users";

interface Props {
  value: string | null;
  onChange: (id: string) => void;
}

export function VistoriadorPicker({ value, onChange }: Props) {
  const usersQuery = useUsers({
    role: "VISTORIADOR",
    active: true,
    pageSize: 100,
  });

  if (usersQuery.isLoading) {
    return <Skeleton className="h-10 w-full max-w-sm" />;
  }

  if (usersQuery.isError || !usersQuery.data) {
    return (
      <p className="text-sm text-destructive">
        Falha ao carregar vistoriadores.
      </p>
    );
  }

  return (
    <Select
      className="max-w-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Selecionar vistoriador"
    >
      <option value="" disabled>
        Selecione um vistoriador…
      </option>
      {usersQuery.data.data.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name} ({u.email})
        </option>
      ))}
    </Select>
  );
}
