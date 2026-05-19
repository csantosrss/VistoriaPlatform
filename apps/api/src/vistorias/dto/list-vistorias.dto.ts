import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { StatusVistoria, TipoVistoria } from "@prisma/client";

export class ListVistoriasQueryDto {
  @IsOptional()
  @IsEnum(StatusVistoria)
  status?: StatusVistoria;

  @IsOptional()
  @IsEnum(TipoVistoria)
  tipo?: TipoVistoria;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  vistoriadorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
