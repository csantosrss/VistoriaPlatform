import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { AgendaService } from "./agenda.service";
import { BulkBlockAgendaDto } from "./dto/bulk-block-agenda.dto";
import { BulkDeleteAgendaDto } from "./dto/bulk-delete-agenda.dto";
import { BulkUpdateAgendaDto } from "./dto/bulk-update-agenda.dto";
import { CreateAgendaSlotsDto } from "./dto/create-agenda-slots.dto";
import { UpdateAgendaSlotDto } from "./dto/update-agenda-slot.dto";
import { ListAgendaSlotsQueryDto } from "./dto/list-agenda-slots.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type {
  AgendaSlot,
  BulkOpResponse,
  ListAgendaSlotsResponse,
} from "@vistoria/api-contracts";

/**
 * RBAC (Sprint 27 BE):
 *  - `ADMIN`/`GESTOR`: irrestrito no tenant.
 *  - `VISTORIADOR`: só pode acessar a própria agenda (`vistoriadorId == user.id`).
 *    Validação fina vive em `AgendaService.assertCanAccessAgendaOf` — o decorator
 *    abaixo só garante que o token tem ao menos uma role conhecida.
 */
@ApiTags("agenda")
@Controller({ path: "vistoriadores/:vistoriadorId/agenda", version: "1" })
@Roles(Role.ADMIN, Role.GESTOR, Role.VISTORIADOR)
export class AgendaController {
  constructor(private readonly service: AgendaService) {}

  @Get()
  @ApiOperation({
    summary:
      "Lista slots de agenda do vistoriador no período (asc por inicio). Filtros: from, to (ISO datetime), disponivel.",
  })
  @ApiOkResponse({ description: "Slots da agenda." })
  @ApiNotFoundResponse({ description: "Vistoriador não encontrado." })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vistoriadorId", ParseUUIDPipe) vistoriadorId: string,
    @Query() query: ListAgendaSlotsQueryDto,
  ): Promise<ListAgendaSlotsResponse> {
    return this.service.list(user, vistoriadorId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Cria slots em lote para o vistoriador. Até 200 slots por chamada.",
  })
  @ApiCreatedResponse({ description: "Slots criados." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vistoriadorId", ParseUUIDPipe) vistoriadorId: string,
    @Body() dto: CreateAgendaSlotsDto,
  ): Promise<ListAgendaSlotsResponse> {
    return this.service.create(user, vistoriadorId, dto);
  }

  @Patch(":slotId")
  @ApiOperation({
    summary:
      "Atualização parcial do slot. Valida `fim > inicio` quando ambos são informados.",
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vistoriadorId", ParseUUIDPipe) vistoriadorId: string,
    @Param("slotId", ParseUUIDPipe) slotId: string,
    @Body() dto: UpdateAgendaSlotDto,
  ): Promise<AgendaSlot> {
    return this.service.update(user, vistoriadorId, slotId, dto);
  }

  @Delete(":slotId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove um slot da agenda." })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vistoriadorId", ParseUUIDPipe) vistoriadorId: string,
    @Param("slotId", ParseUUIDPipe) slotId: string,
  ): Promise<void> {
    return this.service.remove(user, vistoriadorId, slotId);
  }

  @Post(":bulk-block")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Bloqueia em transação todos os slots disponíveis do vistoriador no intervalo [from, to]. Slots já bloqueados ficam em `excluded`.",
  })
  @ApiOkResponse({ description: "Resultado da operação." })
  @ApiForbiddenResponse({
    description: "Vistoriador tentou acessar agenda de outro user.",
  })
  bulkBlock(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vistoriadorId", ParseUUIDPipe) vistoriadorId: string,
    @Body() dto: BulkBlockAgendaDto,
  ): Promise<BulkOpResponse> {
    return this.service.bulkBlock(user, vistoriadorId, dto);
  }

  @Post(":bulk-update")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Aplica patch (disponivel e/ou motivo) em até 200 slots por IDs em uma transação. IDs fora do tenant aparecem em `excluded`.",
  })
  @ApiOkResponse({ description: "Resultado da operação." })
  bulkUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vistoriadorId", ParseUUIDPipe) vistoriadorId: string,
    @Body() dto: BulkUpdateAgendaDto,
  ): Promise<BulkOpResponse> {
    return this.service.bulkUpdate(user, vistoriadorId, dto);
  }

  @Delete(":bulk-delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Remove até 200 slots por IDs em uma transação. IDs fora do tenant aparecem em `excluded`.",
  })
  @ApiOkResponse({ description: "Resultado da operação." })
  bulkDelete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vistoriadorId", ParseUUIDPipe) vistoriadorId: string,
    @Body() dto: BulkDeleteAgendaDto,
  ): Promise<BulkOpResponse> {
    return this.service.bulkDelete(user, vistoriadorId, dto);
  }
}
