import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { TypedConfigService } from "../config/typed-config.service";
import * as bcrypt from "bcryptjs";
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
} from "@vistoria/api-contracts";
import type { AuthenticatedUser, JwtPayload } from "./jwt-payload.interface";

type TokenType = "access" | "refresh";

interface IssuedTokens {
  access: string;
  expiresIn: string;
  refresh: string;
  refreshExpiresIn: string;
}

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
    const tokens = await this.issueTokens(authUser);

    this.logger.log(
      { userId: authUser.id, tenantId: authUser.tenantId },
      "Login bem-sucedido.",
    );

    return { ...tokens, user: authUser };
  }

  async refresh(input: RefreshRequest): Promise<RefreshResponse> {
    let payload: JwtPayload & { type?: TokenType };
    try {
      payload = await this.jwt.verifyAsync<JwtPayload & { type?: TokenType }>(
        input.refresh,
      );
    } catch {
      throw new UnauthorizedException("Refresh token inválido ou expirado.");
    }
    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Token não é um refresh token.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: { select: { active: true } } },
    });
    if (!user || !user.active || !user.tenant?.active) {
      throw new UnauthorizedException("Usuário ou tenant inativo.");
    }

    const authUser: AuthUser = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      roles: user.roles,
    };
    const tokens = await this.issueTokens(authUser);
    return { ...tokens, user: authUser };
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

  private async issueTokens(user: AuthUser): Promise<IssuedTokens> {
    const base: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: user.roles,
    };
    const expiresIn = this.config.get("JWT_EXPIRES_IN");
    const refreshExpiresIn = this.config.get("JWT_REFRESH_EXPIRES_IN");
    const [access, refresh] = await Promise.all([
      this.jwt.signAsync({ ...base, type: "access" satisfies TokenType }),
      this.jwt.signAsync(
        { ...base, type: "refresh" satisfies TokenType },
        { expiresIn: refreshExpiresIn },
      ),
    ]);
    return { access, expiresIn, refresh, refreshExpiresIn };
  }
}
