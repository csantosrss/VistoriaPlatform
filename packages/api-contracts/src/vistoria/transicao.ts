import { z } from "zod";
import { StatusVistoriaSchema } from "./status.js";

/**
 * Schemas Zod para a timeline da SAGA de uma Vistoria.
 *
 * Endpoint correspondente: `GET /api/v1/vistorias/:id/transicoes`.
 * Cada entrada representa uma transição persistida em `vistoria_transicoes`.
 */
export const VistoriaTransicaoSchema = z.object({
  id: z.string().uuid(),
  vistoriaId: z.string().uuid(),
  tenantId: z.string().uuid(),
  de: StatusVistoriaSchema.nullable(),
  para: StatusVistoriaSchema,
  motivo: z.string().nullable(),
  executadoPor: z.string().uuid().nullable(),
  correlationId: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type VistoriaTransicao = z.infer<typeof VistoriaTransicaoSchema>;

export const ListVistoriaTransicoesResponseSchema = z.object({
  data: z.array(VistoriaTransicaoSchema),
});
export type ListVistoriaTransicoesResponse = z.infer<
  typeof ListVistoriaTransicoesResponseSchema
>;
