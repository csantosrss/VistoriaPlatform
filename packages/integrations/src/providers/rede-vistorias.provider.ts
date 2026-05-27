import { BadGatewayException, Injectable } from "@nestjs/common";
import {
  REDE_VISTORIAS_TO_STATUS,
  RedeVistoriasStatusSchema,
  RedeVistoriasWebhookSchema,
  type RedeVistoriasStatus,
  type StatusVistoria,
} from "@vistoria/api-contracts";
import { z } from "zod";
import type {
  AgendamentoDto,
  AgendamentoResult,
  CancelarDto,
  ConsultaResult,
  ProviderId,
} from "../types/provider";
import { BaseHttpProvider, type ProviderHttpOptions } from "./base.provider";

// Schemas das respostas da API da Rede Vistorias. Documentação real seria o
// contrato deles; até lá assumimos um shape REST razoável e validamos com Zod
// para falhar previsivelmente se o parceiro mudar.
const AgendarResponseSchema = z.object({
  inspectionId: z.string().min(1),
  status: RedeVistoriasStatusSchema,
  scheduledAt: z.string().datetime().optional(),
  inspector: z
    .object({
      id: z.string(),
      name: z.string(),
      contact: z.string().optional(),
    })
    .optional(),
});

const ConsultarResponseSchema = z.object({
  inspectionId: z.string().min(1),
  status: RedeVistoriasStatusSchema,
  scheduledAt: z.string().datetime().optional(),
  reportUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

@Injectable()
export class RedeVistoriasProvider extends BaseHttpProvider {
  readonly providerId: ProviderId = "rede-vistorias";

  constructor(opts: ProviderHttpOptions) {
    super(opts);
  }

  static mapStatus(partnerStatus: RedeVistoriasStatus): StatusVistoria {
    return REDE_VISTORIAS_TO_STATUS[partnerStatus];
  }

  async agendar(dto: AgendamentoDto): Promise<AgendamentoResult> {
    const body = {
      externalRef: dto.vistoriaId,
      tenantRef: dto.tenantId,
      type: dto.tipo === "ENTRADA" ? "ENTRY" : "EXIT",
      address: dto.enderecoCompleto,
      zipCode: dto.cep,
      preferredDate: dto.dataPreferida?.toISOString(),
      notes: dto.observacoes,
      contact: dto.contato,
    };
    const res = await this.http.post("/inspections", body);
    const parsed = this.parseOrFail(AgendarResponseSchema, res.data, "agendar");
    return {
      externalId: parsed.inspectionId,
      status: RedeVistoriasProvider.mapStatus(parsed.status),
      dataAgendada: parsed.scheduledAt
        ? new Date(parsed.scheduledAt)
        : undefined,
      vistoriadorAtribuido: parsed.inspector
        ? { nome: parsed.inspector.name, contato: parsed.inspector.contact }
        : undefined,
    };
  }

  async consultar(
    externalId: string,
    _tenantId: string,
  ): Promise<ConsultaResult> {
    const res = await this.http.get(
      `/inspections/${encodeURIComponent(externalId)}`,
    );
    const parsed = this.parseOrFail(
      ConsultarResponseSchema,
      res.data,
      "consultar",
    );
    return {
      externalId: parsed.inspectionId,
      status: RedeVistoriasProvider.mapStatus(parsed.status),
      dataAgendada: parsed.scheduledAt
        ? new Date(parsed.scheduledAt)
        : undefined,
      laudoUrl: parsed.reportUrl,
      observacoes: parsed.notes,
    };
  }

  async cancelar(dto: CancelarDto): Promise<void> {
    await this.http.post(
      `/inspections/${encodeURIComponent(dto.externalId)}/cancel`,
      dto.motivo ? { reason: dto.motivo } : undefined,
    );
  }

  async receberWebhook(payload: unknown): Promise<void> {
    // Apenas valida; o WebhookController orquestra mapeamento → statusWriter.
    RedeVistoriasWebhookSchema.parse(payload);
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
        "Resposta da Rede Vistorias fora do schema",
      );
      throw new BadGatewayException(
        `Resposta inválida do parceiro rede-vistorias em ${op}`,
      );
    }
    return parsed.data;
  }
}
