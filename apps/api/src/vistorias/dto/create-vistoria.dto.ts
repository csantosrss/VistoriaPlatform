import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from "class-validator";
import { TipoVistoria } from "@prisma/client";

export class CreateVistoriaDto {
  @IsEnum(TipoVistoria)
  tipo!: TipoVistoria;

  /** Sprint 22 BE — obrigatório. Código do imóvel no sistema externo (ERP). */
  @IsString()
  @Length(1, 100)
  codigoImovelExterno!: string;

  @IsString()
  @Length(1, 200)
  enderecoLogradouro!: string;

  @IsString()
  @Length(1, 20)
  enderecoNumero!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  enderecoComplemento?: string | null;

  @IsString()
  @Length(1, 100)
  enderecoBairro!: string;

  @IsString()
  @Length(1, 100)
  enderecoCidade!: string;

  @IsString()
  @Length(2, 2)
  enderecoUf!: string;

  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, {
    message: "enderecoCep deve ter 8 dígitos (com ou sem hífen).",
  })
  enderecoCep!: string;

  @IsString()
  @Length(1, 120)
  contatoNome!: string;

  @IsString()
  @Length(8, 20)
  contatoTelefone!: string;

  @IsOptional()
  @IsEmail()
  contatoEmail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string | null;
}
