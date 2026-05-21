import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from "class-validator";
import { Role } from "@prisma/client";

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

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
