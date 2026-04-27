import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy, type StrategyOptions } from "passport-jwt";
import { TypedConfigService } from "../config/typed-config.service";
import type { AuthenticatedUser, JwtPayload } from "./jwt-payload.interface";
import { resolveRsaKeyPair } from "./keys";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: TypedConfigService) {
    const { publicKey } = resolveRsaKeyPair({
      privateKey: config.get("JWT_PRIVATE_KEY"),
      publicKey: config.get("JWT_PUBLIC_KEY"),
      isProduction: config.get("NODE_ENV") === "production",
    });
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ["RS256"],
      issuer: config.get("JWT_ISSUER"),
      audience: config.get("JWT_AUDIENCE"),
    };
    super(options);
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException("Invalid token payload");
    }
    return {
      id: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      roles: payload.roles ?? [],
    };
  }
}
