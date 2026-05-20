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

  it("cancelar() publica CANCELADA via writer", async () => {
    await provider.cancelar("V1");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        vistoriaId: "V1",
        newStatus: "CANCELADA",
        source: "interno",
      }),
    );
  });

  it("consultar() ainda é NotImplemented (port BE→IN ausente)", async () => {
    await expect(provider.consultar("V1")).rejects.toThrow(/port BE→IN/);
  });

  it("webhook is a no-op", async () => {
    await expect(provider.receberWebhook({})).resolves.toBeUndefined();
  });
});
