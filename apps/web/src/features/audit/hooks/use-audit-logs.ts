import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListAuditLogsQuery } from "@vistoria/api-contracts";
import { listAuditLogs } from "../services/audit.service";

export function useAuditLogs(query: Partial<ListAuditLogsQuery> = {}) {
  return useQuery({
    queryKey: ["audit-logs", query],
    queryFn: () => listAuditLogs(query),
    placeholderData: keepPreviousData,
  });
}
