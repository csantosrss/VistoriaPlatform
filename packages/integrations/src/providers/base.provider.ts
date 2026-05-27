import { Logger, NotImplementedException } from "@nestjs/common";
import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import type {
  AgendamentoDto,
  AgendamentoResult,
  CancelarDto,
  ConsultaResult,
  IVistoriaProvider,
  PartnerHealth,
  ProviderId,
} from "../types/provider";

export interface ProviderHttpOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  retries?: number;
}

/**
 * Base com Axios pré-configurado: timeout, retry exponencial em 5xx e network errors,
 * e propagação de correlation-id se presente em `config.headers['x-correlation-id']`.
 *
 * Subclasses concretas implementam `agendar`, `consultar`, etc., chamando `this.http`.
 */
export abstract class BaseHttpProvider implements IVistoriaProvider {
  abstract readonly providerId: ProviderId;
  protected readonly logger: Logger;
  protected readonly http: AxiosInstance;

  constructor(opts: ProviderHttpOptions) {
    this.logger = new Logger(this.constructor.name);
    this.http = axios.create({
      baseURL: opts.baseUrl,
      timeout: opts.timeoutMs ?? 10_000,
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    axiosRetry(this.http, {
      retries: opts.retries ?? 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (err) =>
        axiosRetry.isNetworkOrIdempotentRequestError(err) ||
        (err.response?.status !== undefined && err.response.status >= 500),
    });
  }

  abstract agendar(dto: AgendamentoDto): Promise<AgendamentoResult>;
  abstract consultar(
    externalId: string,
    tenantId: string,
  ): Promise<ConsultaResult>;
  abstract cancelar(dto: CancelarDto): Promise<void>;
  abstract receberWebhook(payload: unknown): Promise<void>;

  async healthCheck(): Promise<PartnerHealth> {
    const started = Date.now();
    try {
      await this.http.get("/health", this.healthCheckConfig());
      return {
        provider: this.providerId,
        healthy: true,
        latencyMs: Date.now() - started,
        checkedAt: new Date(),
      };
    } catch (err) {
      return {
        provider: this.providerId,
        healthy: false,
        latencyMs: Date.now() - started,
        message: err instanceof Error ? err.message : "unknown error",
        checkedAt: new Date(),
      };
    }
  }

  /** Subclasses podem sobrepor para apontar para um endpoint diferente. */
  protected healthCheckConfig(): AxiosRequestConfig {
    return { timeout: 5_000 };
  }

  protected notImplemented(method: string): never {
    throw new NotImplementedException(
      `${this.providerId}.${method} ainda não implementado (Sprint 03 entrega skeleton; integração real depende da entidade Vistoria do BE Sprint 03+).`,
    );
  }
}
