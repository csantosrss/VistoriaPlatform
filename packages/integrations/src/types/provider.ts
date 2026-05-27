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
  /**
   * Opcional: vistoriador já pré-atribuído pelo BE/routing (Sprint 18 IN).
   * Reservado para quando a integração entre routing e agenda for ligada.
   * Hoje providers ignoram este campo.
   */
  vistoriadorId?: string;
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

export interface CancelarDto {
  /** ID retornado pelo parceiro (`externalId`) — ou o `vistoriaId` interno no caso do `interno`. */
  externalId: string;
  /** Tenant da Vistoria que está sendo cancelada. Sprint 18 IN: adicionado para o consumer BE conseguir aplicar a transição com tenant isolation. */
  tenantId: string;
  /** Motivo opcional (encaminhado ao audit log). */
  motivo?: string;
}

/**
 * Contrato comum a todos os parceiros (e ao provider Interno da Auxiliadora).
 * Toda implementação deve ser idempotente em `cancelar` e tolerante a `consultar` em vistorias inexistentes.
 *
 * Sprint 18 IN: `cancelar` passou a aceitar `CancelarDto` (com `tenantId`)
 * em vez de `externalId` solto. Breaking minor da port; única chamada
 * existente era em `InternoProvider.cancelar` que publicava com `tenantId: ""`.
 */
export interface IVistoriaProvider {
  readonly providerId: ProviderId;
  agendar(dto: AgendamentoDto): Promise<AgendamentoResult>;
  /**
   * Sprint 28 IN: assinatura ganha `tenantId` para o `InternoProvider`
   * conseguir aplicar tenant isolation via {@link VistoriaReaderPort}.
   * Adapters HTTP de parceiros (Rede Vistorias, Conceitual) ignoram o
   * campo — o tenant deles fica implícito nas credenciais por API key.
   */
  consultar(externalId: string, tenantId: string): Promise<ConsultaResult>;
  cancelar(dto: CancelarDto): Promise<void>;
  receberWebhook(payload: unknown): Promise<void>;
  healthCheck(): Promise<PartnerHealth>;
}
