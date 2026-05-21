import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import {
  CreateUserRequestSchema,
  RoleSchema,
  type CreateUserRequest,
} from "@vistoria/api-contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateUser } from "../hooks/use-create-user";

const ROLES = RoleSchema.options;

export function UserForm() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserRequest>({
    resolver: zodResolver(CreateUserRequestSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      roles: ["VISTORIADOR"],
      active: true,
    },
  });
  const { mutate, isPending, error } = useCreateUser();
  const submitting = isSubmitting || isPending;

  const errorMessage = error
    ? isAxiosError(error) && error.response?.data?.message
      ? String(error.response.data.message)
      : (error.message ?? "Falha ao criar usuário.")
    : null;

  return (
    <form
      onSubmit={handleSubmit((values) => mutate(values))}
      className="space-y-6"
      noValidate
    >
      <section className="space-y-3">
        <Field id="email" label="E-mail" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="off"
            {...register("email")}
          />
        </Field>
        <Field id="name" label="Nome completo" error={errors.name?.message}>
          <Input id="name" {...register("name")} />
        </Field>
        <Field
          id="password"
          label="Senha (mínimo 8 caracteres)"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
        </Field>
      </section>

      <section className="space-y-3">
        <Label>Roles</Label>
        <Controller
          control={control}
          name="roles"
          render={({ field }) => (
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLES.map((role) => {
                const checked = field.value?.includes(role);
                return (
                  <label
                    key={role}
                    className="flex items-center gap-2 rounded-md border border-input p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={!!checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...(field.value ?? []), role]
                          : (field.value ?? []).filter((r) => r !== role);
                        field.onChange(next);
                      }}
                    />
                    <span>{role}</span>
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.roles && (
          <p className="text-xs text-destructive">
            Selecione pelo menos uma role.
          </p>
        )}
      </section>

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar usuário
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
