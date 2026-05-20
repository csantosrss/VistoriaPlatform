import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiOkResponse } from "@nestjs/swagger";
import { VistoriasService } from "./vistorias.service";
import { CreateVistoriaDto } from "./dto/create-vistoria.dto";
import { CancelVistoriaDto } from "./dto/cancel-vistoria.dto";
import { ListVistoriasQueryDto } from "./dto/list-vistorias.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type {
  ListVistoriaTransicoesResponse,
  ListVistoriasResponse,
  Vistoria,
  VistoriaStatsResponse,
} from "@vistoria/api-contracts";

@ApiTags("vistorias")
@Controller({ path: "vistorias", version: "1" })
export class VistoriasController {
  constructor(private readonly service: VistoriasService) {}

  @Get()
  @ApiOperation({
    summary:
      "Lista vistorias do tenant com filtros opcionais por status, tipo e período.",
  })
  @ApiOkResponse({ description: "Página de vistorias." })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListVistoriasQueryDto,
  ): Promise<ListVistoriasResponse> {
    return this.service.list(user, query);
  }

  @Get("stats")
  @ApiOperation({
    summary:
      "Agregado de KPIs do tenant: total e contagem por StatusVistoria. Substitui as 3 chamadas paralelas do dashboard.",
  })
  @ApiOkResponse({ description: "Totais agregados por status." })
  stats(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VistoriaStatsResponse> {
    return this.service.stats(user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retorna uma vistoria do tenant." })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Vistoria> {
    return this.service.findOne(user, id);
  }

  @Get(":id/transicoes")
  @ApiOperation({
    summary:
      "Lista a timeline de transições da SAGA da vistoria (mais antiga primeiro).",
  })
  @ApiOkResponse({ description: "Transições da vistoria." })
  listTransicoes(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ListVistoriaTransicoesResponse> {
    return this.service.listTransicoes(user, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Cria uma nova solicitação de vistoria. Aplica routing imediato e devolve com status ROTEADA + providerId definidos.",
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVistoriaDto,
  ): Promise<Vistoria> {
    return this.service.create(user, dto);
  }

  @Post(":id/cancelar")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Cancela uma vistoria. Apenas estados SOLICITADA/ROTEADA/AGENDADA/CONFIRMADA podem ser cancelados.",
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelVistoriaDto,
  ): Promise<Vistoria> {
    return this.service.cancel(user, id, dto);
  }
}
