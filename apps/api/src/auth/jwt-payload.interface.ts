import { Role } from "@prisma/client";

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  roles: Role[];
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  roles: Role[];
}
