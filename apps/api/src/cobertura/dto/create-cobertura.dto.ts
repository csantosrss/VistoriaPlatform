import { IsOptional, IsString, Length } from "class-validator";

export class CreateCoberturaDto {
  @IsString()
  @Length(2, 2)
  uf!: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  cidade?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  bairro?: string | null;
}
