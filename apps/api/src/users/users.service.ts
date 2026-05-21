import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type User as UserModel } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import type {
  ListUsersResponse,
  User as UserDto,
} from "@vistoria/api-contracts";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import type { ListUsersQueryDto } from "./dto/list-users.dto";

const BCRYPT_ROUNDS = 10;

function toDto(u: UserModel): UserDto {
  return {
    id: u.id,
    tenantId: u.tenantId,
    email: u.email,
    name: u.name,
    roles: u.roles,
    active: u.active,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    actor: AuthenticatedUser,
    input: CreateUserDto,
  ): Promise<UserDto> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: { tenantId: actor.tenantId, email: input.email },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          "Já existe um usuário com este e-mail no tenant.",
        );
      }
      const user = await tx.user.create({
        data: {
          tenantId: actor.tenantId,
          email: input.email,
          name: input.name,
          passwordHash,
          roles: input.roles,
          active: input.active ?? true,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "USER.CREATED",
          resourceType: "User",
          resourceId: user.id,
          after: {
            email: user.email,
            name: user.name,
            roles: user.roles,
            active: user.active,
          } as Prisma.InputJsonValue,
        },
      });
      return user;
    });
    return toDto(result);
  }

  async list(
    actor: AuthenticatedUser,
    query: ListUsersQueryDto,
  ): Promise<ListUsersResponse> {
    const where: Prisma.UserWhereInput = {
      tenantId: actor.tenantId,
      ...(query.role ? { roles: { has: query.role } } : {}),
      ...(typeof query.active === "boolean" ? { active: query.active } : {}),
      ...(query.q
        ? {
            OR: [
              { email: { contains: query.q, mode: "insensitive" } },
              { name: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: data.map(toDto),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<UserDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!user) {
      throw new NotFoundException("Usuário não encontrado.");
    }
    return toDto(user);
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateUserDto,
  ): Promise<UserDto> {
    if (
      !input.name &&
      !input.password &&
      !input.roles &&
      input.active === undefined
    ) {
      throw new BadRequestException("Nenhum campo informado para atualização.");
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findFirst({
        where: { id, tenantId: actor.tenantId },
      });
      if (!current) {
        throw new NotFoundException("Usuário não encontrado.");
      }
      const data: Prisma.UserUpdateInput = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.roles !== undefined) data.roles = input.roles;
      if (input.active !== undefined) data.active = input.active;
      if (input.password !== undefined) {
        data.passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      }
      const updated = await tx.user.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "USER.UPDATED",
          resourceType: "User",
          resourceId: id,
          before: {
            name: current.name,
            roles: current.roles,
            active: current.active,
            passwordChanged: input.password !== undefined,
          } as Prisma.InputJsonValue,
          after: {
            name: updated.name,
            roles: updated.roles,
            active: updated.active,
          } as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
    return toDto(result);
  }

  async deactivate(actor: AuthenticatedUser, id: string): Promise<UserDto> {
    if (actor.id === id) {
      throw new ForbiddenException(
        "Você não pode desativar a si mesmo. Peça a outro ADMIN.",
      );
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findFirst({
        where: { id, tenantId: actor.tenantId },
      });
      if (!current) {
        throw new NotFoundException("Usuário não encontrado.");
      }
      if (!current.active) {
        return current;
      }
      const updated = await tx.user.update({
        where: { id },
        data: { active: false },
      });
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "USER.DEACTIVATED",
          resourceType: "User",
          resourceId: id,
          before: { active: true } as Prisma.InputJsonValue,
          after: { active: false } as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
    return toDto(result);
  }
}
