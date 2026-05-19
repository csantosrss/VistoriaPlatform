import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { AuthService } from "./auth.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { TypedConfigService } from "../config/typed-config.service";

describe("AuthService.login", () => {
  let service: AuthService;
  const prismaMock = {
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
  };
  const jwtMock = { signAsync: jest.fn().mockResolvedValue("fake.jwt.token") };
  const configMock = {
    get: jest.fn((key: string) => (key === "JWT_EXPIRES_IN" ? "15m" : "")),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: TypedConfigService, useValue: configMock },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "u-1",
      tenantId: "t-1",
      email: "admin@example.com",
      name: "Admin",
      passwordHash: bcrypt.hashSync("senha-correta", 10),
      active: true,
      roles: [Role.ADMIN],
      tenant: { active: true },
      ...overrides,
    };
  }

  it("retorna { access, expiresIn, user } quando credenciais conferem", async () => {
    prismaMock.user.findFirst.mockResolvedValue(makeUser());
    const result = await service.login({
      email: "admin@example.com",
      password: "senha-correta",
    });
    expect(result.access).toBe("fake.jwt.token");
    expect(result.expiresIn).toBe("15m");
    expect(result.user).toMatchObject({
      id: "u-1",
      tenantId: "t-1",
      email: "admin@example.com",
      roles: [Role.ADMIN],
    });
    expect(jwtMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: "u-1", tenantId: "t-1" }),
    );
  });

  it("rejeita com 401 quando o usuário não existe", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    await expect(
      service.login({ email: "n@n", password: "qualquer" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtMock.signAsync).not.toHaveBeenCalled();
  });

  it("rejeita com 401 quando o usuário está inativo", async () => {
    prismaMock.user.findFirst.mockResolvedValue(makeUser({ active: false }));
    await expect(
      service.login({ email: "admin@example.com", password: "senha-correta" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejeita com 401 quando o tenant está inativo", async () => {
    prismaMock.user.findFirst.mockResolvedValue(
      makeUser({ tenant: { active: false } }),
    );
    await expect(
      service.login({ email: "admin@example.com", password: "senha-correta" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejeita com 401 quando a senha está errada", async () => {
    prismaMock.user.findFirst.mockResolvedValue(makeUser());
    await expect(
      service.login({
        email: "admin@example.com",
        password: "senha-errada",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
