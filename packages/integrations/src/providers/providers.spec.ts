import { RedeVistoriasProvider } from "./rede-vistorias.provider";
import { ConceitualProvider } from "./conceitual.provider";
import { InternoProvider } from "./interno.provider";

describe("RedeVistoriasProvider.mapStatus", () => {
  it("maps every Rede Vistorias status", () => {
    expect(RedeVistoriasProvider.mapStatus("PENDING")).toBe("SOLICITADA");
    expect(RedeVistoriasProvider.mapStatus("SCHEDULED")).toBe("AGENDADA");
    expect(RedeVistoriasProvider.mapStatus("CONFIRMED")).toBe("CONFIRMADA");
    expect(RedeVistoriasProvider.mapStatus("IN_PROGRESS")).toBe("EM_EXECUCAO");
    expect(RedeVistoriasProvider.mapStatus("REPORT_PENDING")).toBe(
      "LAUDO_PENDENTE",
    );
    expect(RedeVistoriasProvider.mapStatus("COMPLETED")).toBe("CONCLUIDA");
    expect(RedeVistoriasProvider.mapStatus("CANCELED")).toBe("CANCELADA");
  });
});

describe("ConceitualProvider.mapStatus", () => {
  it("maps every Conceitual status", () => {
    expect(ConceitualProvider.mapStatus("AGUARDANDO")).toBe("SOLICITADA");
    expect(ConceitualProvider.mapStatus("AGENDADA")).toBe("AGENDADA");
    expect(ConceitualProvider.mapStatus("EM_VISTORIA")).toBe("EM_EXECUCAO");
    expect(ConceitualProvider.mapStatus("AGUARDANDO_LAUDO")).toBe(
      "LAUDO_PENDENTE",
    );
    expect(ConceitualProvider.mapStatus("LAUDO_OK")).toBe("LAUDO_APROVADO");
    expect(ConceitualProvider.mapStatus("FINALIZADA")).toBe("CONCLUIDA");
    expect(ConceitualProvider.mapStatus("CANCELADA")).toBe("CANCELADA");
  });
});

describe("InternoProvider", () => {
  const update = jest.fn().mockResolvedValue(undefined);
  const writer = { update };
  // Sprint 28 IN: provider sem reader injetado mantém compatibilidade com
  // os cenários anteriores (consultar → NotImplementedException).
  const provider = new InternoProvider(writer);

  beforeEach(() => {
    update.mockClear();
  });

  it("reports healthy in-process", async () => {
    const health = await provider.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.provider).toBe("interno");
    expect(health.latencyMs).toBe(0);
  });

  it("agendar() publica AGENDADA via writer e devolve externalId = vistoriaId", async () => {
    const dataPreferida = new Date("2026-06-01T12:00:00Z");
    const result = await provider.agendar({
      vistoriaId: "V1",
      tenantId: "T1",
      tipo: "ENTRADA",
      enderecoCompleto: "Rua X, 1",
      cep: "00000-000",
      contato: { nome: "Foo", telefone: "11999999999" },
      dataPreferida,
    });

    expect(result.externalId).toBe("V1");
    expect(result.status).toBe("AGENDADA");
    expect(result.dataAgendada).toBe(dataPreferida);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        vistoriaId: "V1",
        tenantId: "T1",
        newStatus: "AGENDADA",
        source: "interno",
      }),
    );
  });

  it("cancelar() publica CANCELADA via writer com tenantId e motivo", async () => {
    await provider.cancelar({
      externalId: "V1",
      tenantId: "T1",
      motivo: "Cliente desistiu",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        vistoriaId: "V1",
        tenantId: "T1",
        newStatus: "CANCELADA",
        source: "interno",
        motivo: "Cliente desistiu",
      }),
    );
  });

  it("consultar() sem reader injetado → NotImplementedException", async () => {
    await expect(provider.consultar("V1", "T1")).rejects.toThrow(
      /VistoriaReaderPort não registrada/,
    );
  });

  it("consultar() com reader injetado → mapeia VistoriaSnapshot para ConsultaResult", async () => {
    const read = jest.fn().mockResolvedValue({
      vistoriaId: "V1",
      tenantId: "T1",
      status: "AGENDADA",
      codigoImovelExterno: "EXT-42",
      vistoriadorId: null,
      agendadoPara: new Date("2026-07-01T10:00:00Z"),
      concluidoEm: null,
      canceladoEm: null,
      canceladoMotivo: null,
      observacoes: "Levar fita métrica",
      createdAt: new Date("2026-06-01T00:00:00Z"),
      updatedAt: new Date("2026-06-15T00:00:00Z"),
    });
    const withReader = new InternoProvider(writer, { read });

    const result = await withReader.consultar("V1", "T1");

    expect(read).toHaveBeenCalledWith("V1", "T1");
    expect(result).toEqual({
      externalId: "EXT-42",
      status: "AGENDADA",
      dataAgendada: new Date("2026-07-01T10:00:00Z"),
      observacoes: "Levar fita métrica",
    });
  });

  it("consultar() com reader injetado → 404 quando vistoria não existe no tenant", async () => {
    const read = jest.fn().mockResolvedValue(null);
    const withReader = new InternoProvider(writer, { read });
    await expect(withReader.consultar("V-x", "T-x")).rejects.toThrow(
      /não encontrada no tenant/,
    );
  });

  it("consultar() com reader injetado → fallback de externalId para vistoriaId quando codigoImovelExterno é null", async () => {
    const read = jest.fn().mockResolvedValue({
      vistoriaId: "V2",
      tenantId: "T1",
      status: "SOLICITADA",
      codigoImovelExterno: null,
      vistoriadorId: null,
      agendadoPara: null,
      concluidoEm: null,
      canceladoEm: null,
      canceladoMotivo: null,
      observacoes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const withReader = new InternoProvider(writer, { read });
    const result = await withReader.consultar("V2", "T1");
    expect(result.externalId).toBe("V2");
  });

  it("webhook is a no-op", async () => {
    await expect(provider.receberWebhook({})).resolves.toBeUndefined();
  });
});
