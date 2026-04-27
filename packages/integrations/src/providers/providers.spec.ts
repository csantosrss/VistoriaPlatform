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
  const provider = new InternoProvider();

  it("reports healthy in-process", async () => {
    const health = await provider.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.provider).toBe("interno");
    expect(health.latencyMs).toBe(0);
  });

  it("throws NotImplemented for agendar", async () => {
    await expect(
      provider.agendar({
        vistoriaId: "V1",
        tenantId: "T1",
        tipo: "ENTRADA",
        enderecoCompleto: "X",
        cep: "00000-000",
        contato: { nome: "Foo", telefone: "11999999999" },
      }),
    ).rejects.toThrow(/depende de VistoriaRepository/);
  });

  it("webhook is a no-op", async () => {
    await expect(provider.receberWebhook({})).resolves.toBeUndefined();
  });
});
