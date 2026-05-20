import { z } from "zod";
import { StatusVistoriaSchema } from "./status.js";

/**
 * Schema Zod do agregado de KPIs do painel admin.
 *
 * Endpoint correspondente: `GET /api/v1/vistorias/stats`. Substitui as 3
 * chamadas paralelas que o dashboard fazia (Sprint 09) por uma agregação
 * server-side em uma única query (`groupBy status`).
 */
export const VistoriaStatsResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  byStatus: z.record(StatusVistoriaSchema, z.number().int().nonnegative()),
});
export type VistoriaStatsResponse = z.infer<typeof VistoriaStatsResponseSchema>;
