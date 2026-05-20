import { AgendamentoOrchestrator } from "./agendamento-orchestrator.service";
import type { RmqSubscriber } from "../messaging/rmq-subscriber.service";
import type { ConceitualProvider } from "../providers/conceitual.provider";
import type { InternoProvider } from "../providers/interno.provider";
import type { RedeVistoriasProvider } from "../providers/rede-vistorias.provider";

function makeProvider(name: string) {
  return {
    providerId: name,
    agendar: jest.fn().mockResolvedValue({
      externalId: "EXT-1",
      status: "AGENDADA",
    }),
    consultar: jest.fn(),
    cancelar: jest.fn(),
    receberWebhook: jest.fn(),
    healthCheck: jest.fn(),
  };
}

const VALID_PAYLOAD = {
  eventId: "11111111-1111-4111-8111-111111111111",
  vistoriaId: "22222222-2222-4222-8222-222222222222",
  tenantId: "33333333-3333-4333-8333-333333333333",
  providerId: "rede-vistorias" as const,
  reason: "UF SP → rede-vistorias",
  tipo: "ENTRADA" as const,
  enderecoCompleto: "Rua A, 123 — Centro, São Paulo/SP",
  cep: "01000-000",
  contato: { nome: "Cliente", telefone: "11999999999" },
};

describe("AgendamentoOrchestrator", () => {
  let subscriber: RmqSubscriber;
  let rede: ReturnType<typeof makeProvider>;
  let conceitual: ReturnType<typeof makeProvider>;
  let interno: ReturnType<typeof makeProvider>;
  let orchestrator: AgendamentoOrchestrator;

  beforeEach(() => {
    subscriber = { subscribe: jest.fn() } as unknown as RmqSubscriber;
    rede = makeProvider("rede-vistorias");
    conceitual = makeProvider("conceitual");
    interno = makeProvider("interno");
    orchestrator = new AgendamentoOrchestrator(
      subscriber,
      rede as unknown as RedeVistoriasProvider,
      conceitual as unknown as ConceitualProvider,
      interno as unknown as InternoProvider,
    );
  });

  it("registra subscribe('vistoria.routed', ...) no onModuleInit", () => {
    orchestrator.onModuleInit();
    expect(subscriber.subscribe).toHaveBeenCalledWith(
      "vistoria.routed",
      expect.any(Function),
    );
  });

  it("dispara agendar() no provider rede-vistorias", async () => {
    await orchestrator.handle(VALID_PAYLOAD);
    expect(rede.agendar).toHaveBeenCalledWith(
      expect.objectContaining({
        vistoriaId: VALID_PAYLOAD.vistoriaId,
        tenantId: VALID_PAYLOAD.tenantId,
        enderecoCompleto: VALID_PAYLOAD.enderecoCompleto,
      }),
    );
    expect(conceitual.agendar).not.toHaveBeenCalled();
    expect(interno.agendar).not.toHaveBeenCalled();
  });

  it("dispara agendar() no provider interno quando providerId='interno'", async () => {
    await orchestrator.handle({ ...VALID_PAYLOAD, providerId: "interno" });
    expect(interno.agendar).toHaveBeenCalledTimes(1);
    expect(rede.agendar).not.toHaveBeenCalled();
  });

  it("descarta payload inválido sem chamar providers", async () => {
    await orchestrator.handle({ malformed: true });
    expect(rede.agendar).not.toHaveBeenCalled();
    expect(conceitual.agendar).not.toHaveBeenCalled();
    expect(interno.agendar).not.toHaveBeenCalled();
  });

  it("não relança quando agendar() do provider falha (log + ack)", async () => {
    rede.agendar.mockRejectedValueOnce(new Error("provider 500"));
    await expect(orchestrator.handle(VALID_PAYLOAD)).resolves.toBeUndefined();
  });

  it("converte dataPreferida ISO para Date antes de passar ao agendar()", async () => {
    await orchestrator.handle({
      ...VALID_PAYLOAD,
      dataPreferida: "2026-06-01T12:00:00.000Z",
    });
    expect(rede.agendar).toHaveBeenCalledWith(
      expect.objectContaining({
        dataPreferida: new Date("2026-06-01T12:00:00.000Z"),
      }),
    );
  });
});
