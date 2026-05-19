import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { APP_GUARD } from "@nestjs/core";
import { TypedConfigService } from "../config/typed-config.service";
import { PrismaModule } from "../infrastructure/prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { JwtGuard } from "./guards/jwt.guard";
import { RolesGuard } from "./guards/roles.guard";
import { resolveRsaKeyPair } from "./keys";

@Global()
@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService) => {
        const { privateKey, publicKey } = resolveRsaKeyPair({
          privateKey: config.get("JWT_PRIVATE_KEY"),
          publicKey: config.get("JWT_PUBLIC_KEY"),
          isProduction: config.get("NODE_ENV") === "production",
        });
        return {
          privateKey,
          publicKey,
          signOptions: {
            algorithm: "RS256",
            expiresIn: config.get("JWT_EXPIRES_IN"),
            issuer: config.get("JWT_ISSUER"),
            audience: config.get("JWT_AUDIENCE"),
          },
          verifyOptions: {
            algorithms: ["RS256"],
            issuer: config.get("JWT_ISSUER"),
            audience: config.get("JWT_AUDIENCE"),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule, PassportModule, AuthService],
})
export class AuthModule {}
