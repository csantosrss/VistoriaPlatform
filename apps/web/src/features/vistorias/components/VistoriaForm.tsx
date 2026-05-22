import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import {
  CreateVistoriaRequestSchema,
  TipoVistoriaSchema,
  type CreateVistoriaRequest,
} from "@vistoria/api-contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateVistoria } from "../hooks/use-create-vistoria";

export function VistoriaForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateVistoriaRequest>({
    resolver: zodResolver(CreateVistoriaRequestSchema),
    defaultValues: {
      tipo: "ENTRADA",
      codigoImovelExterno: "",
      enderecoLogradouro: "",
      enderecoNumero: "",
      enderecoComplemento: "",
      enderecoBairro: "",
      enderecoCidade: "",
      enderecoUf: "",
      enderecoCep: "",
      contatoNome: "",
      contatoTelefone: "",
      contatoEmail: "",
      observacoes: "",
    },
  });
  const { mutate, isPending, error } = useCreateVistoria();
  const submitting = isSubmitting || isPending;

  const errorMessage = error
    ? isAxiosError(error) && error.response?.data?.message
      ? String(error.response.data.message)
      : (error.message ?? "Falha ao criar vistoria.")
    : null;

  return (
    <form
      onSubmit={handleSubmit((values) =>
        mutate({
          ...values,
          enderecoComplemento: values.enderecoComplemento || null,
          contatoEmail: values.contatoEmail || null,
          observacoes: values.observacoes || null,
        }),
      )}
      className="space-y-6"
      noValidate
    >
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Identificação
        </h3>
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <Field
            id="codigoImovelExterno"
            label="Código do imóvel (ERP)"
            error={errors.codigoImovelExterno?.message}
          >
            <Input
              id="codigoImovelExterno"
              placeholder="Ex.: IMV-2026-001"
              {...register("codigoImovelExterno")}
            />
          </Field>
          <div className="grid gap-2">
            <Label htmlFor="tipo">Tipo de vistoria</Label>
            <Select id="tipo" {...register("tipo")}>
              {TipoVistoriaSchema.options.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Endereço
        </h3>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Field
            id="enderecoLogradouro"
            label="Logradouro"
            error={errors.enderecoLogradouro?.message}
          >
            <Input
              id="enderecoLogradouro"
              {...register("enderecoLogradouro")}
            />
          </Field>
          <Field
            id="enderecoNumero"
            label="Número"
            error={errors.enderecoNumero?.message}
          >
            <Input id="enderecoNumero" {...register("enderecoNumero")} />
          </Field>
        </div>
        <Field
          id="enderecoComplemento"
          label="Complemento (opcional)"
          error={errors.enderecoComplemento?.message}
        >
          <Input
            id="enderecoComplemento"
            {...register("enderecoComplemento")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="enderecoBairro"
            label="Bairro"
            error={errors.enderecoBairro?.message}
          >
            <Input id="enderecoBairro" {...register("enderecoBairro")} />
          </Field>
          <Field
            id="enderecoCep"
            label="CEP"
            error={errors.enderecoCep?.message}
          >
            <Input
              id="enderecoCep"
              placeholder="00000-000"
              {...register("enderecoCep")}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Field
            id="enderecoCidade"
            label="Cidade"
            error={errors.enderecoCidade?.message}
          >
            <Input id="enderecoCidade" {...register("enderecoCidade")} />
          </Field>
          <Field id="enderecoUf" label="UF" error={errors.enderecoUf?.message}>
            <Input id="enderecoUf" maxLength={2} {...register("enderecoUf")} />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Contato
        </h3>
        <Field
          id="contatoNome"
          label="Nome"
          error={errors.contatoNome?.message}
        >
          <Input id="contatoNome" {...register("contatoNome")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="contatoTelefone"
            label="Telefone"
            error={errors.contatoTelefone?.message}
          >
            <Input id="contatoTelefone" {...register("contatoTelefone")} />
          </Field>
          <Field
            id="contatoEmail"
            label="E-mail (opcional)"
            error={errors.contatoEmail?.message}
          >
            <Input
              id="contatoEmail"
              type="email"
              {...register("contatoEmail")}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Observações
        </h3>
        <Field
          id="observacoes"
          label="Observações (opcional)"
          error={errors.observacoes?.message}
        >
          <Textarea id="observacoes" rows={4} {...register("observacoes")} />
        </Field>
      </section>

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar vistoria
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
