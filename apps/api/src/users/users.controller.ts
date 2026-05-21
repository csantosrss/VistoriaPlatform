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
  ApiForbiddenResponse,
  ApiConflictResponse,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ListUsersQueryDto } from "./dto/list-users.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type { ListUsersResponse, User } from "@vistoria/api-contracts";

@ApiTags("users")
@Controller({ path: "users", version: "1" })
@Roles(Role.ADMIN, Role.GESTOR)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @ApiOperation({
    summary:
      "Lista usuários do tenant. Filtros opcionais: role, active, q (busca em email/name).",
  })
  @ApiOkResponse({ description: "Página de usuários." })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListUsersQueryDto,
  ): Promise<ListUsersResponse> {
    return this.service.list(user, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retorna um usuário do tenant." })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<User> {
    return this.service.findOne(user, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Cria um usuário no tenant. Senha em texto plano é hasheada com bcrypt antes de persistir.",
  })
  @ApiCreatedResponse({ description: "Usuário criado." })
  @ApiConflictResponse({ description: "Já existe usuário com este e-mail." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ): Promise<User> {
    return this.service.create(user, dto);
  }

  @Patch(":id")
  @ApiOperation({
    summary:
      "Atualização parcial do usuário (name, roles, active, password). Pelo menos um campo é obrigatório.",
  })
  @ApiOkResponse({ description: "Usuário atualizado." })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.service.update(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Desativa um usuário (soft-delete: active=false). O ADMIN não pode se desativar.",
  })
  @ApiOkResponse({ description: "Usuário desativado." })
  @ApiForbiddenResponse({ description: "ADMIN tentando se desativar." })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<User> {
    return this.service.deactivate(user, id);
  }
}
