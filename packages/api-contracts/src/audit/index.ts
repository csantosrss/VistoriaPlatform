import { z } from "zod";

/**
 * Schemas Zod compartilhados FE↔BE para consulta de audit logs.
 * Endpoint correspondente: GET /api/v1/audit-logs.
 */

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().nullable(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  correlationId: z.string().nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

export const ListAuditLogsQuerySchema = z.object({
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>;

export const ListAuditLogsResponseSchema = z.object({
  data: z.array(AuditLogSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type ListAuditLogsResponse = z.infer<typeof ListAuditLogsResponseSchema>;
