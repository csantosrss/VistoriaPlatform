import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { TypedConfigService } from "../config/typed-config.service";
import * as bcrypt from "bcryptjs";
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
} from "@vistoria/api-contracts";
import type { AuthenticatedUser, JwtPayload } from "./jwt-payload.interface";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: TypedConfigService,
  ) {}

  async login(input: LoginRequest): Promise<LoginResponse> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email },
      include: { tenant: { select: { active: true } } },
    });

    if (!user || !user.passwordHash || !user.active || !user.tenant?.active) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const authUser: AuthUser = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      roles: user.roles,
    };

    const payload: JwtPayload = {
      sub: authUser.id,
      tenantId: authUser.tenantId,
      email: authUser.email,
      roles: authUser.roles,
    };

    const access = await this.jwt.signAsync(payload);
    const expiresIn = this.config.get("JWT_EXPIRES_IN");

    this.logger.log(
      { userId: authUser.id, tenantId: authUser.tenantId },
      "Login bem-sucedido.",
    );

    return { access, expiresIn, user: authUser };
  }

  async findUser(current: AuthenticatedUser): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: current.id },
    });
    if (!user || !user.active) {
      throw new UnauthorizedException("Usuário inativo ou inexistente.");
    }
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      roles: user.roles,
    };
  }
}
