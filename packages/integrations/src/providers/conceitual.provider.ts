import { BadGatewayException, Injectable } from "@nestjs/common";
import {
  CONCEITUAL_TO_STATUS,
  ConceitualStatusSchema,
  ConceitualWebhookSchema,
  type ConceitualStatus,
  type StatusVistoria,
} from "@vistoria/api-contracts";
import { z } from "zod";
import type {
  AgendamentoDto,
  AgendamentoResult,
  ConsultaResult,
  ProviderId,
} from "../types/provider";
import { BaseHttpProvider, type ProviderHttpOptions } from "./base.provider";

const AgendarResponseSchema = z.object({
  idVistoria: z.string().min(1),
  situacao: ConceitualStatusSchema,
  dataAgendamento: z.string().datetime().optional(),
  responsavel: z
    .object({ nome: z.string(), contato: z.string().optional() })
    .optional(),
});

const ConsultarResponseSchema = z.object({
  idVistoria: z.string().min(1),
  situacao: ConceitualStatusSchema,
  dataAgendamento: z.string().datetime().optional(),
  urlLaudo: z.string().url().optional(),
  observacoes: z.string().optional(),
});

@Injectable()
export class ConceitualProvider extends BaseHttpProvider {
  readonly providerId: ProviderId = "conceitual";

  constructor(opts: ProviderHttpOptions) {
    super(opts);
  }

  static mapStatus(partnerStatus: ConceitualStatus): StatusVistoria {
    return CONCEITUAL_TO_STATUS[partnerStatus];
  }

  async agendar(dto: AgendamentoDto): Promise<AgendamentoResult> {
    const body = {
      referenciaExterna: dto.vistoriaId,
      tenant: dto.tenantId,
      tipo: dto.tipo,
      endereco: dto.enderecoCompleto,
      cep: dto.cep,
      dataPreferida: dto.dataPreferida?.toISOString(),
      observacoes: dto.observacoes,
      contato: dto.contato,
    };
    const res = await this.http.post("/vistorias", body);
    const parsed = this.parseOrFail(AgendarResponseSchema, res.data, "agendar");
    return {
      externalId: parsed.idVistoria,
      status: ConceitualProvider.mapStatus(parsed.situacao),
      dataAgendada: parsed.dataAgendamento
        ? new Date(parsed.dataAgendamento)
        : undefined,
      vistoriadorAtribuido: parsed.responsavel
        ? {
            nome: parsed.responsavel.nome,
            contato: parsed.responsavel.contato,
          }
        : undefined,
    };
  }

  async consultar(externalId: string): Promise<ConsultaResult> {
    const res = await this.http.get(
      `/vistorias/${encodeURIComponent(externalId)}`,
    );
    const parsed = this.parseOrFail(
      ConsultarResponseSchema,
      res.data,
      "consultar",
    );
    return {
      externalId: parsed.idVistoria,
      status: ConceitualProvider.mapStatus(parsed.situacao),
      dataAgendada: parsed.dataAgendamento
        ? new Date(parsed.dataAgendamento)
        : undefined,
      laudoUrl: parsed.urlLaudo,
      observacoes: parsed.observacoes,
    };
  }

  async cancelar(externalId: string): Promise<void> {
    await this.http.post(
      `/vistorias/${encodeURIComponent(externalId)}/cancelar`,
    );
  }

  async receberWebhook(payload: unknown): Promise<void> {
    ConceitualWebhookSchema.parse(payload);
  }

  private parseOrFail<T>(
    schema: z.ZodSchema<T>,
    value: unknown,
    op: string,
  ): T {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      this.logger.error(
        { op, issues: parsed.error.issues },
        "Resposta da Conceitual fora do schema",
      );
      throw new BadGatewayException(
        `Resposta inválida do parceiro conceitual em ${op}`,
      );
    }
    return parsed.data;
  }
}
