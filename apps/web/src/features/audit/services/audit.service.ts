import { apiClient } from "@/lib/api-client";
import {
  ListAuditLogsResponseSchema,
  type ListAuditLogsQuery,
  type ListAuditLogsResponse,
} from "@vistoria/api-contracts";

export async function listAuditLogs(
  query: Partial<ListAuditLogsQuery> = {},
): Promise<ListAuditLogsResponse> {
  const { data } = await apiClient.get("/api/v1/audit-logs", { params: query });
  return ListAuditLogsResponseSchema.parse(data);
}
