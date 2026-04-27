import { z } from "zod";

/**
 * Payload do webhook da Conceitual.
 * Recebido em POST /api/v1/integrations/webhooks/conceitual.
 * Conceitual usa nomenclatura em português.
 */
export const ConceitualStatusSchema = z.enum([
  "AGUARDANDO",
  "AGENDADA",
  "EM_VISTORIA",
  "AGUARDANDO_LAUDO",
  "LAUDO_OK",
  "FINALIZADA",
  "CANCELADA",
]);

export type ConceitualStatus = z.infer<typeof ConceitualStatusSchema>;

export const ConceitualWebhookSchema = z.object({
  evento: z.enum([
    "vistoria.atualizada",
    "vistoria.cancelada",
    "laudo.aprovado",
  ]),
  idVistoria: z.string().min(1),
  idExterno: z.string().min(1).optional(),
  situacao: ConceitualStatusSchema,
  dataAgendada: z.string().datetime().optional(),
  vistoriador: z
    .object({
      id: z.string(),
      nome: z.string(),
    })
    .optional(),
  urlLaudo: z.string().url().optional(),
  ocorrenciaEm: z.string().datetime(),
});

export type ConceitualWebhook = z.infer<typeof ConceitualWebhookSchema>;
