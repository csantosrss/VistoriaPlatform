import { Injectable } from "@nestjs/common";
import { Prisma, type AuditLog as AuditLogModel } from "@prisma/client";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type { ListAuditLogsQueryDto } from "./dto/list-audit-logs.dto";
import type { AuditLog, ListAuditLogsResponse } from "@vistoria/api-contracts";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";

function toDto(log: AuditLogModel): AuditLog {
  return {
    id: log.id,
    tenantId: log.tenantId,
    userId: log.userId,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    before: log.before as unknown,
    after: log.after as unknown,
    correlationId: log.correlationId,
    ip: log.ip,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
  };
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    actor: AuthenticatedUser,
    query: ListAuditLogsQueryDto,
  ): Promise<ListAuditLogsResponse> {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: actor.tenantId,
      ...(query.resourceType ? { resourceType: query.resourceType } : {}),
      ...(query.resourceId ? { resourceId: query.resourceId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map(toDto),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }
}
