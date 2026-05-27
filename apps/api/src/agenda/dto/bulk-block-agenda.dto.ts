import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class BulkBlockAgendaDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
