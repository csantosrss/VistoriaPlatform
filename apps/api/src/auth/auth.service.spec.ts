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
  const jwtMock = {
    signAsync: jest.fn(async (payload: { type?: string }) =>
      payload.type === "refresh" ? "fake.refresh.token" : "fake.access.token",
    ),
    verifyAsync: jest.fn(),
  };
  const configMock = {
    get: jest.fn((key: string) =>
      key === "JWT_EXPIRES_IN"
        ? "15m"
        : key === "JWT_REFRESH_EXPIRES_IN"
          ? "7d"
          : "",
    ),
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

  it("retorna { access, refresh, expiresIn, refreshExpiresIn, user } quando credenciais conferem", async () => {
    prismaMock.user.findFirst.mockResolvedValue(makeUser());
    const result = await service.login({
      email: "admin@example.com",
      password: "senha-correta",
    });
    expect(result.access).toBe("fake.access.token");
    expect(result.refresh).toBe("fake.refresh.token");
    expect(result.expiresIn).toBe("15m");
    expect(result.refreshExpiresIn).toBe("7d");
    expect(result.user).toMatchObject({
      id: "u-1",
      tenantId: "t-1",
      email: "admin@example.com",
      roles: [Role.ADMIN],
    });
    expect(jwtMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: "u-1", type: "access" }),
    );
    expect(jwtMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: "u-1", type: "refresh" }),
      expect.objectContaining({ expiresIn: "7d" }),
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

describe("AuthService.refresh", () => {
  let service: AuthService;
  const prismaMock = {
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
  };
  const jwtMock = {
    signAsync: jest.fn(async (payload: { type?: string }) =>
      payload.type === "refresh" ? "new.refresh.token" : "new.access.token",
    ),
    verifyAsync: jest.fn(),
  };
  const configMock = {
    get: jest.fn((key: string) =>
      key === "JWT_EXPIRES_IN"
        ? "15m"
        : key === "JWT_REFRESH_EXPIRES_IN"
          ? "7d"
          : "",
    ),
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

  it("renova tokens quando o refresh é válido e usuário ativo", async () => {
    jwtMock.verifyAsync.mockResolvedValue({
      sub: "u-1",
      tenantId: "t-1",
      email: "admin@example.com",
      roles: [Role.ADMIN],
      type: "refresh",
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      tenantId: "t-1",
      email: "admin@example.com",
      name: "Admin",
      roles: [Role.ADMIN],
      active: true,
      tenant: { active: true },
    });

    const result = await service.refresh({ refresh: "any.refresh.token" });
    expect(result.access).toBe("new.access.token");
    expect(result.refresh).toBe("new.refresh.token");
  });

  it("rejeita refresh quando o token é access (type errado)", async () => {
    jwtMock.verifyAsync.mockResolvedValue({
      sub: "u-1",
      tenantId: "t-1",
      email: "admin@example.com",
      roles: [Role.ADMIN],
      type: "access",
    });

    await expect(
      service.refresh({ refresh: "an.access.token" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejeita refresh quando o token está expirado/inválido", async () => {
    jwtMock.verifyAsync.mockRejectedValue(new Error("jwt expired"));

    await expect(
      service.refresh({ refresh: "expired.token" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejeita refresh quando usuário está inativo", async () => {
    jwtMock.verifyAsync.mockResolvedValue({
      sub: "u-1",
      tenantId: "t-1",
      email: "admin@example.com",
      roles: [Role.ADMIN],
      type: "refresh",
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      tenantId: "t-1",
      active: false,
      tenant: { active: true },
      email: "x",
      name: "x",
      roles: [],
    });

    await expect(
      service.refresh({ refresh: "any.token" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
