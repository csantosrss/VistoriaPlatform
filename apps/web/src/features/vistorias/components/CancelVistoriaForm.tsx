import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import {
  CancelVistoriaRequestSchema,
  type CancelVistoriaRequest,
} from "@vistoria/api-contracts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCancelVistoria } from "../hooks/use-cancel-vistoria";

export function CancelVistoriaForm({ id }: { id: string }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CancelVistoriaRequest>({
    resolver: zodResolver(CancelVistoriaRequestSchema),
    defaultValues: { motivo: "" },
  });
  const { mutate, isPending, error, isSuccess } = useCancelVistoria();
  const submitting = isSubmitting || isPending;

  const errorMessage = error
    ? isAxiosError(error) && error.response?.status === 409
      ? "Não é possível cancelar nesse estado da SAGA."
      : (error.message ?? "Falha ao cancelar.")
    : null;

  return (
    <form
      onSubmit={handleSubmit((values) =>
        mutate(
          { id, input: values },
          { onSuccess: () => reset({ motivo: "" }) },
        ),
      )}
      className="space-y-3"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="motivo">Motivo do cancelamento</Label>
        <Textarea
          id="motivo"
          rows={3}
          placeholder="Mínimo 3 caracteres."
          {...register("motivo")}
        />
        {errors.motivo && (
          <p className="text-xs text-destructive">{errors.motivo.message}</p>
        )}
      </div>
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      {isSuccess && (
        <p className="text-sm text-success">Vistoria cancelada com sucesso.</p>
      )}
      <Button type="submit" variant="destructive" disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Cancelar vistoria
      </Button>
    </form>
  );
}
