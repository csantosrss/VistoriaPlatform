import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from "class-validator";
import { Role } from "@prisma/client";
import type { UserProviderId } from "./create-user.dto";

const PROVIDER_IDS = ["rede-vistorias", "conceitual", "interno"] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(8, 72)
  password?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Role, { each: true })
  roles?: Role[];

  @IsOptional()
  @IsIn(PROVIDER_IDS)
  providerId?: UserProviderId;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
