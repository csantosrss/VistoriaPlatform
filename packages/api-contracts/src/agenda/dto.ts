import { z } from "zod";

/**
 * Schemas Zod para a agenda dos vistoriadores (Sprint 17 BE).
 *
 * Endpoints associados (todos sob `ADMIN`/`GESTOR` por escolha de produto,
 * decisão tomada antes da implementação):
 *  - `POST   /api/v1/vistoriadores/:id/agenda` (bulk-create de slots)
 *  - `GET    /api/v1/vistoriadores/:id/agenda?from&to`
 *  - `PATCH  /api/v1/vistoriadores/:id/agenda/:slotId`
 *  - `DELETE /api/v1/vistoriadores/:id/agenda/:slotId`
 *
 * Slot serve a dois conceitos via flag `disponivel`:
 *  - `disponivel = true`  → janela LIVRE (default)  → routing pode atribuir.
 *  - `disponivel = false` → janela OCUPADA/bloqueada (férias, indisp.).
 *
 * O routing **não** consulta a agenda na Sprint 17. Integração fica para
 * sprint futura quando o produto pedir atribuição automática.
 */

export const AgendaSlotSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  vistoriadorId: z.string().uuid(),
  inicio: z.string().datetime(),
  fim: z.string().datetime(),
  disponivel: z.boolean(),
  motivo: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AgendaSlot = z.infer<typeof AgendaSlotSchema>;

export const AgendaSlotInputSchema = z
  .object({
    inicio: z.string().datetime(),
    fim: z.string().datetime(),
    disponivel: z.boolean().optional().default(true),
    motivo: z.string().max(500).optional(),
  })
  .refine((s) => new Date(s.fim) > new Date(s.inicio), {
    message: "`fim` deve ser maior que `inicio`",
    path: ["fim"],
  });
export type AgendaSlotInput = z.infer<typeof AgendaSlotInputSchema>;

export const CreateAgendaSlotsRequestSchema = z.object({
  slots: z.array(AgendaSlotInputSchema).min(1).max(200),
});
export type CreateAgendaSlotsRequest = z.infer<
  typeof CreateAgendaSlotsRequestSchema
>;

export const UpdateAgendaSlotRequestSchema = z
  .object({
    inicio: z.string().datetime().optional(),
    fim: z.string().datetime().optional(),
    disponivel: z.boolean().optional(),
    motivo: z.string().max(500).nullable().optional(),
  })
  .refine(
    (s) => {
      if (s.inicio !== undefined && s.fim !== undefined) {
        return new Date(s.fim) > new Date(s.inicio);
      }
      return true;
    },
    {
      message: "`fim` deve ser maior que `inicio` quando ambos são informados",
      path: ["fim"],
    },
  );
export type UpdateAgendaSlotRequest = z.infer<
  typeof UpdateAgendaSlotRequestSchema
>;

export const ListAgendaSlotsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  disponivel: z.coerce.boolean().optional(),
});
export type ListAgendaSlotsQuery = z.infer<typeof ListAgendaSlotsQuerySchema>;

export const ListAgendaSlotsResponseSchema = z.object({
  data: z.array(AgendaSlotSchema),
});
export type ListAgendaSlotsResponse = z.infer<
  typeof ListAgendaSlotsResponseSchema
>;
