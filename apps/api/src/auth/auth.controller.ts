import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { AuthenticatedUser } from "./jwt-payload.interface";
import type { LoginResponse, MeResponse } from "@vistoria/api-contracts";

@ApiTags("auth")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Autentica um usuário e retorna o JWT de acesso." })
  @ApiOkResponse({ description: "Login realizado." })
  @ApiUnauthorizedResponse({ description: "Credenciais inválidas." })
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.auth.login(dto);
  }

  @Get("me")
  @ApiOperation({ summary: "Retorna o usuário autenticado pelo Bearer token." })
  @ApiOkResponse({ description: "Usuário autenticado." })
  @ApiUnauthorizedResponse({ description: "Token ausente ou inválido." })
  me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    return this.auth.findUser(user);
  }
}
