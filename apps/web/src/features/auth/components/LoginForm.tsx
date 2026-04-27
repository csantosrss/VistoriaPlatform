import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "../schemas/login.schema";
import { useLogin } from "../hooks/use-login";

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", tenantSlug: "" },
  });
  const { mutate, isPending, error } = useLogin();

  const submitting = isSubmitting || isPending;

  return (
    <form
      onSubmit={handleSubmit((values) => mutate(values))}
      className="space-y-4"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="tenantSlug">Tenant</Label>
        <Input
          id="tenantSlug"
          placeholder="auxiliadora"
          autoComplete="organization"
          {...register("tenantSlug")}
        />
        {errors.tenantSlug && (
          <p className="text-xs text-destructive">
            {errors.tenantSlug.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com.br"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">
          {error.message ?? "Falha ao autenticar."} Endpoint ainda não
          disponível (BE Sprint 03+).
        </p>
      )}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Entrar
      </Button>
    </form>
  );
}
