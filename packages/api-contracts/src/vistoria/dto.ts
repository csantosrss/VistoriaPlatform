import { z } from "zod";
import { StatusVistoriaSchema, TipoVistoriaSchema } from "./status.js";

/**
 * Schemas Zod compartilhados FE↔BE para o domínio de Vistoria.
 * Cobrem o CRUD entregue no Sprint 07 BE.
 */

export const VistoriaSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  status: StatusVistoriaSchema,
  tipo: TipoVistoriaSchema,
  /** Código do imóvel no sistema externo (ERP). Sprint 22 BE — obrigatório
   * na criação; nullable no schema de leitura para preservar vistorias
   * criadas antes da migration. */
  codigoImovelExterno: z.string().nullable(),
  enderecoLogradouro: z.string(),
  enderecoNumero: z.string(),
  enderecoComplemento: z.string().nullable(),
  enderecoBairro: z.string(),
  enderecoCidade: z.string(),
  enderecoUf: z.string().length(2),
  enderecoCep: z.string(),
  contatoNome: z.string(),
  contatoTelefone: z.string(),
  contatoEmail: z.string().email().nullable(),
  observacoes: z.string().nullable(),
  vistoriadorId: z.string().uuid().nullable(),
  providerId: z.string().nullable(),
  agendadoPara: z.string().datetime().nullable(),
  concluidoEm: z.string().datetime().nullable(),
  canceladoEm: z.string().datetime().nullable(),
  canceladoMotivo: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Vistoria = z.infer<typeof VistoriaSchema>;

export const CreateVistoriaRequestSchema = z.object({
  tipo: TipoVistoriaSchema,
  /** Sprint 22 BE — obrigatório. Mín 1, máx 100 chars. Indexed para busca. */
  codigoImovelExterno: z.string().min(1).max(100),
  enderecoLogradouro: z.string().min(1).max(200),
  enderecoNumero: z.string().min(1).max(20),
  enderecoComplemento: z.string().max(100).optional().nullable(),
  enderecoBairro: z.string().min(1).max(100),
  enderecoCidade: z.string().min(1).max(100),
  enderecoUf: z.string().length(2),
  enderecoCep: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, "CEP deve ter 8 dígitos (com ou sem hífen)"),
  contatoNome: z.string().min(1).max(120),
  contatoTelefone: z.string().min(8).max(20),
  contatoEmail: z.string().email().optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
});
export type CreateVistoriaRequest = z.infer<typeof CreateVistoriaRequestSchema>;

export const CancelVistoriaRequestSchema = z.object({
  motivo: z.string().min(3).max(500),
});
export type CancelVistoriaRequest = z.infer<typeof CancelVistoriaRequestSchema>;

export const ListVistoriasQuerySchema = z.object({
  status: StatusVistoriaSchema.optional(),
  tipo: TipoVistoriaSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  vistoriadorId: z.string().uuid().optional(),
  /** Sprint 22 BE — filtro exato por código do imóvel externo. */
  codigoImovelExterno: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type ListVistoriasQuery = z.infer<typeof ListVistoriasQuerySchema>;

export const ListVistoriasResponseSchema = z.object({
  data: z.array(VistoriaSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type ListVistoriasResponse = z.infer<typeof ListVistoriasResponseSchema>;
