import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class AgendaSlotInputDto {
  @IsDateString()
  inicio!: string;

  @IsDateString()
  fim!: string;

  @IsOptional()
  @IsBoolean()
  disponivel?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}

export class CreateAgendaSlotsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AgendaSlotInputDto)
  slots!: AgendaSlotInputDto[];
}
