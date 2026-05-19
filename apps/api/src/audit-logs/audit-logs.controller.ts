import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiOkResponse } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { AuditLogsService } from "./audit-logs.service";
import { ListAuditLogsQueryDto } from "./dto/list-audit-logs.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type { ListAuditLogsResponse } from "@vistoria/api-contracts";

@ApiTags("audit-logs")
@Controller({ path: "audit-logs", version: "1" })
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GESTOR)
  @ApiOperation({
    summary:
      "Lista audit logs do tenant com filtros por resourceType, resourceId, action, userId, intervalo.",
  })
  @ApiOkResponse({ description: "Página de audit logs." })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<ListAuditLogsResponse> {
    return this.service.list(user, query);
  }
}
