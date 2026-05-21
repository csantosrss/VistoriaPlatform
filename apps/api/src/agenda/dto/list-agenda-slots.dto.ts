import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsOptional } from "class-validator";

export class ListAgendaSlotsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  disponivel?: boolean;
}
