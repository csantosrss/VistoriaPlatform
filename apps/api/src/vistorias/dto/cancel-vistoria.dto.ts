import { IsString, Length } from "class-validator";

export class CancelVistoriaDto {
  @IsString()
  @Length(3, 500)
  motivo!: string;
}
