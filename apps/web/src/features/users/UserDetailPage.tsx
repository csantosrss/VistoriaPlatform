import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarDays } from "lucide-react";
import {
  ProviderIdSchema,
  type ProviderId,
  type Role,
  type UpdateUserRequest,
} from "@vistoria/api-contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CoberturaCard } from "@/features/cobertura/components/CoberturaCard";
import { useUser } from "./hooks/use-user";
import { useUpdateUser } from "./hooks/use-update-user";
import { useDeactivateUser } from "./hooks/use-deactivate-user";

const ROLES: Role[] = ["ADMIN", "GESTOR", "VISTORIADOR", "CLIENTE", "PARCEIRO"];
const PROVIDER_IDS = ProviderIdSchema.options;

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: user, isLoading, isError } = useUser(id);
  const updateMut = useUpdateUser(id ?? "");
  const deactivateMut = useDeactivateUser(id ?? "");
  const [name, setName] = useState<string | undefined>();
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<Role[] | undefined>();
  const [providerId, setProviderId] = useState<ProviderId | undefined>();

  const effectiveName = name ?? user?.name ?? "";
  const effectiveRoles = roles ?? user?.roles ?? [];
  const effectiveProviderId =
    providerId !== undefined
      ? providerId
      : ((user?.providerId ?? "interno") as ProviderId);
  const isVistoriador = effectiveRoles.includes("VISTORIADOR");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: UpdateUserRequest = {};
    if (name !== undefined && name !== user?.name) patch.name = name;
    if (password) patch.password = password;
    if (roles && JSON.stringify(roles) !== JSON.stringify(user?.roles)) {
      patch.roles = roles;
    }
    // providerId só viaja se a role final inclui VISTORIADOR e mudou.
    if (
      effectiveRoles.includes("VISTORIADOR") &&
      effectiveProviderId !== user?.providerId
    ) {
      patch.providerId = effectiveProviderId;
    }
    if (Object.keys(patch).length === 0) return;
    updateMut.mutate(patch, {
      onSuccess: () => {
        setPassword("");
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Usuário</h2>
        {user && (
          <Badge variant={user.active ? "success" : "secondary"}>
            {user.active ? "Ativo" : "Inativo"}
          </Badge>
        )}
        {user?.providerId && <Badge variant="outline">{user.providerId}</Badge>}
      </div>

      {isLoading && <Skeleton className="h-64" />}

      {isError && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Falha ao carregar usuário
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {user && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Editar</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={effectiveName}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Nova senha (deixe vazio para manter)
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Roles</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ROLES.map((role) => {
                      const checked = effectiveRoles.includes(role);
                      return (
                        <label
                          key={role}
                          className="flex items-center gap-2 rounded-md border border-input p-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...effectiveRoles, role]
                                : effectiveRoles.filter((r) => r !== role);
                              setRoles(next);
                            }}
                          />
                          <span>{role}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {isVistoriador && (
                  <div className="space-y-2">
                    <Label htmlFor="providerId">Provider</Label>
                    <Select
                      id="providerId"
                      value={effectiveProviderId}
                      onChange={(e) =>
                        setProviderId(e.target.value as ProviderId)
                      }
                    >
                      {PROVIDER_IDS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Canal do vistoriador. Necessário para cadastrar agenda e
                      cobertura.
                    </p>
                  </div>
                )}

                {updateMut.error && (
                  <p className="text-sm text-destructive">
                    {(updateMut.error as Error).message}
                  </p>
                )}
                {updateMut.isSuccess && !updateMut.isPending && (
                  <p className="text-sm text-emerald-600">Alterações salvas.</p>
                )}
                <div className="flex justify-end">
                  <Button type="submit" disabled={updateMut.isPending}>
                    Salvar alterações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {user.roles.includes("VISTORIADOR") && (
              <Card>
                <CardHeader>
                  <CardTitle>Agenda</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/vistoriadores/${user.id}/agenda`}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Abrir agenda
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Desativar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.active ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Desativação é soft-delete: o login bate em 401, mas
                      registros mantêm a referência.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={deactivateMut.isPending}
                      onClick={() => deactivateMut.mutate()}
                    >
                      Desativar usuário
                    </Button>
                    {deactivateMut.error && (
                      <p className="text-xs text-destructive">
                        {(deactivateMut.error as Error).message}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Usuário já está inativo.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coberturas geográficas só fazem sentido para VISTORIADOR. */}
          {user.roles.includes("VISTORIADOR") && (
            <div className="lg:col-span-3">
              <CoberturaCard userId={user.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
