import { z } from "zod";

/**
 * Payload do webhook da Rede Vistorias.
 * Recebido em POST /api/v1/integrations/webhooks/rede-vistorias.
 * Documentado em https://api.redevistorias.com.br/docs (placeholder).
 */
export const RedeVistoriasStatusSchema = z.enum([
  "PENDING",
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "REPORT_PENDING",
  "COMPLETED",
  "CANCELED",
]);

export type RedeVistoriasStatus = z.infer<typeof RedeVistoriasStatusSchema>;

export const RedeVistoriasWebhookSchema = z.object({
  event: z.enum([
    "inspection.updated",
    "inspection.canceled",
    "report.approved",
  ]),
  inspectionId: z.string().min(1),
  externalId: z.string().min(1).optional(),
  status: RedeVistoriasStatusSchema,
  scheduledAt: z.string().datetime().optional(),
  inspector: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
  reportUrl: z.string().url().optional(),
  occurredAt: z.string().datetime(),
});

export type RedeVistoriasWebhook = z.infer<typeof RedeVistoriasWebhookSchema>;
