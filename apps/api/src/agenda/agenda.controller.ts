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
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { AgendaService } from "./agenda.service";
import { CreateAgendaSlotsDto } from "./dto/create-agenda-slots.dto";
import { UpdateAgendaSlotDto } from "./dto/update-agenda-slot.dto";
import { ListAgendaSlotsQueryDto } from "./dto/list-agenda-slots.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type {
  AgendaSlot,
  ListAgendaSlotsResponse,
} from "@vistoria/api-contracts";

@ApiTags("agenda")
@Controller({ path: "vistoriadores/:vistoriadorId/agenda", version: "1" })
@Roles(Role.ADMIN, Role.GESTOR)
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
}
