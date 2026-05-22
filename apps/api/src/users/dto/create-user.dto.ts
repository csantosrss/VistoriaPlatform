import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from "class-validator";
import { Role } from "@prisma/client";

const PROVIDER_IDS = ["rede-vistorias", "conceitual", "interno"] as const;
export type UserProviderId = (typeof PROVIDER_IDS)[number];

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @Length(8, 72)
  password!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Role, { each: true })
  roles!: Role[];

  /** Sprint 22 BE — obrigatório quando `roles` inclui VISTORIADOR
   * (validado no service, não no DTO, porque envolve cross-field). */
  @IsOptional()
  @IsIn(PROVIDER_IDS)
  providerId?: UserProviderId;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
