import type { StatusVistoria, TipoVistoria } from "@vistoria/api-contracts";

export type ProviderId = "rede-vistorias" | "conceitual" | "interno";

export interface AgendamentoDto {
  /** ID interno da Vistoria (gerado pelo BE). */
  vistoriaId: string;
  tenantId: string;
  tipo: TipoVistoria;
  enderecoCompleto: string;
  cep: string;
  dataPreferida?: Date;
  observacoes?: string;
  contato: {
    nome: string;
    telefone: string;
    email?: string;
  };
}

export interface AgendamentoResult {
  /** ID retornado pelo parceiro (`externalId`). */
  externalId: string;
  /** Status atual já mapeado para o enum unificado. */
  status: StatusVistoria;
  dataAgendada?: Date;
  vistoriadorAtribuido?: {
    nome: string;
    contato?: string;
  };
}

export interface ConsultaResult {
  externalId: string;
  status: StatusVistoria;
  dataAgendada?: Date;
  laudoUrl?: string;
  observacoes?: string;
}

export interface PartnerHealth {
  provider: ProviderId;
  healthy: boolean;
  latencyMs?: number;
  message?: string;
  checkedAt: Date;
}

/**
 * Contrato comum a todos os parceiros (e ao provider Interno da Auxiliadora).
 * Toda implementação deve ser idempotente em `cancelar` e tolerante a `consultar` em vistorias inexistentes.
 */
export interface IVistoriaProvider {
  readonly providerId: ProviderId;
  agendar(dto: AgendamentoDto): Promise<AgendamentoResult>;
  consultar(externalId: string): Promise<ConsultaResult>;
  cancelar(externalId: string): Promise<void>;
  receberWebhook(payload: unknown): Promise<void>;
  healthCheck(): Promise<PartnerHealth>;
}
