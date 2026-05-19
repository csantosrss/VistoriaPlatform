import { Injectable, Logger } from "@nestjs/common";
import type { TipoVistoria } from "@vistoria/api-contracts";
import type { ProviderId } from "../types/provider";

export interface ProviderRoutingInput {
  tenantId: string;
  tipo: TipoVistoria;
  enderecoUf: string;
  enderecoCidade?: string;
  /** Permite forçar um provider específico (override manual). */
  preferredProviderId?: ProviderId;
}

export interface ProviderRoutingDecision {
  providerId: ProviderId;
  reason: string;
}

const UF_PARA_PROVIDER: Readonly<Record<string, ProviderId>> = {
  // Rede Vistorias atende capitais grandes — alinhe com QI/IN quando tiver
  // tabela definitiva. Por ora é heurística inicial e auditável.
  SP: "rede-vistorias",
  RJ: "rede-vistorias",
  MG: "rede-vistorias",
  PR: "rede-vistorias",
  RS: "rede-vistorias",
  // Conceitual atende Centro-Oeste e Norte
  DF: "conceitual",
  GO: "conceitual",
  MT: "conceitual",
  AM: "conceitual",
  PA: "conceitual",
};

/**
 * Escolhe o ProviderId para uma Vistoria. Estratégia inicial:
 *
 * 1. Se o tenant pediu um override, respeita.
 * 2. Vistorias de SAIDA (devolução) — sempre `interno` (equipe da Auxiliadora
 *    valida a saída para evitar conflito de interesse).
 * 3. UF mapeada → provider da tabela.
 * 4. Fallback: `interno`.
 */
@Injectable()
export class ProviderRoutingService {
  private readonly logger = new Logger(ProviderRoutingService.name);

  decide(input: ProviderRoutingInput): ProviderRoutingDecision {
    if (input.preferredProviderId) {
      return {
        providerId: input.preferredProviderId,
        reason: "preferredProviderId-override",
      };
    }
    if (input.tipo === "SAIDA") {
      return {
        providerId: "interno",
        reason: "tipo=SAIDA roteado para equipe interna",
      };
    }
    const fromMap = UF_PARA_PROVIDER[input.enderecoUf.toUpperCase()];
    if (fromMap) {
      return {
        providerId: fromMap,
        reason: `UF ${input.enderecoUf} → ${fromMap}`,
      };
    }
    this.logger.warn(
      { tenantId: input.tenantId, uf: input.enderecoUf },
      "Sem regra de routing para a UF; fallback para provider interno.",
    );
    return {
      providerId: "interno",
      reason: `UF ${input.enderecoUf} sem rota; fallback interno`,
    };
  }
}
