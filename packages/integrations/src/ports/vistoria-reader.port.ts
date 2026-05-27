import type { StatusVistoria } from "@vistoria/api-contracts";

/**
 * Token de injeção para a {@link VistoriaReaderPort}. Consumidores
 * (`apps/api`) registram a implementação concreta — tipicamente um adapter
 * sobre o `VistoriaService`/Prisma — via
 * `{ provide: VISTORIA_READER, useClass: VistoriaReaderAdapter }`.
 *
 * Sprint 28 IN: criado para destravar `InternoProvider.consultar()`. O port
 * fica em `packages/integrations` (não em `apps/api`) porque o **caller** é
 * IN; o BE só fornece o adapter. Mantém a regra "IN não importa do domínio
 * do BE" do CLAUDE.md.
 */
export const VISTORIA_READER = "VISTORIA_READER";

/**
 * Snapshot mínimo de uma Vistoria suficiente para alimentar o
 * `ConsultaResult` do `IVistoriaProvider`. Não expõe campos sensíveis (PII
 * de contato fica fora — `consultar()` retorna apenas estado operacional).
 */
export interface VistoriaSnapshot {
  vistoriaId: string;
  tenantId: string;
  status: StatusVistoria;
  /** `codigoImovelExterno` do BE — equivale ao `externalId` do `ConsultaResult`. */
  codigoImovelExterno: string | null;
  vistoriadorId: string | null;
  agendadoPara: Date | null;
  concluidoEm: Date | null;
  canceladoEm: Date | null;
  canceladoMotivo: string | null;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Port BE→IN para leitura de Vistoria. Implementação default vive em
 * `apps/api` (adapter sobre Prisma). Adapters de provider que precisarem ler
 * o estado da vistoria (ex.: `InternoProvider.consultar`) injetam esta port
 * como `@Optional()` — quando não estiver disponível, devem cair em
 * `NotImplementedException` para preservar forward-compat.
 *
 * Retorna `null` quando a vistoria não existe ou não pertence ao tenant —
 * implementação deve aplicar tenant isolation antes de devolver.
 */
export interface VistoriaReaderPort {
  read(vistoriaId: string, tenantId: string): Promise<VistoriaSnapshot | null>;
}
