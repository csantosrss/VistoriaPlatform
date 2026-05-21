import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import type { Role } from "@vistoria/api-contracts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsers } from "./hooks/use-users";

const ROLES: Role[] = ["ADMIN", "GESTOR", "VISTORIADOR", "CLIENTE", "PARCEIRO"];

export function UsersListPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [activeOnly, setActiveOnly] = useState(true);
  const { data, isLoading, isError } = useUsers({
    ...(q ? { q } : {}),
    ...(role ? { role } : {}),
    ...(activeOnly ? { active: true } : {}),
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Usuários</h2>
          <p className="text-muted-foreground">
            Gestão de usuários do tenant — vistoriadores, gestores, clientes e
            parceiros.
          </p>
        </div>
        <Button asChild>
          <Link to="/users/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo usuário
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Busca em e-mail ou nome (case-insensitive).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_220px_160px]">
            <Input
              placeholder="Buscar por e-mail ou nome..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as Role | "")}
            >
              <option value="">Todas as roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
              Apenas ativos
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : isError ? (
            <p className="p-4 text-sm text-destructive">
              Falha ao carregar usuários.
            </p>
          ) : data?.data.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhum usuário encontrado.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">E-mail</th>
                  <th className="px-4 py-2 text-left font-medium">Nome</th>
                  <th className="px-4 py-2 text-left font-medium">Roles</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((u) => (
                  <tr key={u.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-2">{u.name}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r} variant="outline" className="text-xs">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={u.active ? "success" : "secondary"}>
                        {u.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/users/${u.id}`}>Abrir</Link>
                      </Button>
                      {u.roles.includes("VISTORIADOR") && (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/vistoriadores/${u.id}/agenda`}>
                            Agenda
                          </Link>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
