import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiConflictResponse,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CoberturaService } from "./cobertura.service";
import { CreateCoberturaDto } from "./dto/create-cobertura.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type {
  ListCoberturasResponse,
  VistoriadorCobertura,
} from "@vistoria/api-contracts";

@ApiTags("cobertura")
@Controller({ path: "users/:userId/cobertura", version: "1" })
@Roles(Role.ADMIN, Role.GESTOR)
export class CoberturaController {
  constructor(private readonly service: CoberturaService) {}

  @Get()
  @ApiOperation({
    summary:
      "Lista as áreas de cobertura do vistoriador (UF asc, cidade asc, bairro asc).",
  })
  @ApiOkResponse({ description: "Coberturas." })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId", ParseUUIDPipe) userId: string,
  ): Promise<ListCoberturasResponse> {
    return this.service.list(user, userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Cria uma área de cobertura. Body: { uf, cidade?, bairro? }. Hierarquia: só UF (cobre toda UF), UF+cidade (cobre toda cidade), UF+cidade+bairro (só o bairro).",
  })
  @ApiCreatedResponse({ description: "Cobertura criada." })
  @ApiConflictResponse({
    description:
      "Cobertura conflita com regra existente (redundância em qualquer direção).",
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() dto: CreateCoberturaDto,
  ): Promise<VistoriadorCobertura> {
    return this.service.create(user, userId, dto);
  }

  @Delete(":coberturaId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove uma cobertura do vistoriador." })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("coberturaId", ParseUUIDPipe) coberturaId: string,
  ): Promise<void> {
    return this.service.remove(user, userId, coberturaId);
  }
}
