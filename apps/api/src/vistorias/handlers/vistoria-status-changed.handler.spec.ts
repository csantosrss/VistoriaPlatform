import { StatusVistoria } from "@prisma/client";
import { VistoriaStatusChangedHandler } from "./vistoria-status-changed.handler";
import type { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type {
  RmqMessageMeta,
  RmqSubscriber,
} from "../../infrastructure/messaging/rmq-subscriber.service";

const META: RmqMessageMeta = { routingKey: "vistoria.status.changed" };

describe("VistoriaStatusChangedHandler", () => {
  const tx = {
    vistoria: { findFirst: jest.fn(), update: jest.fn() },
    vistoriaTransicao: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<void>) =>
      fn(tx),
    ),
  } as unknown as PrismaService;
  const subscriber = { subscribe: jest.fn() } as unknown as RmqSubscriber;
  const handler = new VistoriaStatusChangedHandler(prisma, subscriber);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("aplica transição válida: cria transicao + audit", async () => {
    tx.vistoria.findFirst.mockResolvedValue({
      id: "v-1",
      tenantId: "t-1",
      status: StatusVistoria.AGENDADA,
    });
    tx.vistoria.update.mockResolvedValue({ id: "v-1" });

    await handler.handle(
      {
        vistoriaId: "11111111-1111-1111-1111-111111111111",
        tenantId: "22222222-2222-2222-2222-222222222222",
        newStatus: StatusVistoria.EM_EXECUCAO,
        source: "rede-vistorias",
      },
      META,
    );

    expect(tx.vistoria.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: StatusVistoria.EM_EXECUCAO }),
      }),
    );
    expect(tx.vistoriaTransicao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        de: StatusVistoria.AGENDADA,
        para: StatusVistoria.EM_EXECUCAO,
        executadoPor: null,
      }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "VISTORIA.STATUS_CHANGED",
        userId: null,
      }),
    });
  });

  it("é idempotente: descarta quando status atual === newStatus", async () => {
    tx.vistoria.findFirst.mockResolvedValue({
      id: "v-1",
      tenantId: "t-1",
      status: StatusVistoria.EM_EXECUCAO,
    });

    await handler.handle(
      {
        vistoriaId: "11111111-1111-1111-1111-111111111111",
        tenantId: "22222222-2222-2222-2222-222222222222",
        newStatus: StatusVistoria.EM_EXECUCAO,
        source: "rede-vistorias",
      },
      META,
    );

    expect(tx.vistoria.update).not.toHaveBeenCalled();
    expect(tx.vistoriaTransicao.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("bloqueia transição saindo de estado terminal (CONCLUIDA)", async () => {
    tx.vistoria.findFirst.mockResolvedValue({
      id: "v-1",
      tenantId: "t-1",
      status: StatusVistoria.CONCLUIDA,
    });

    await handler.handle(
      {
        vistoriaId: "11111111-1111-1111-1111-111111111111",
        tenantId: "22222222-2222-2222-2222-222222222222",
        newStatus: StatusVistoria.EM_EXECUCAO,
        source: "rede-vistorias",
      },
      META,
    );

    expect(tx.vistoria.update).not.toHaveBeenCalled();
  });

  it("payload inválido: descarta sem executar a transação", async () => {
    await handler.handle({ malformed: true }, META);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("registra handler no onModuleInit", () => {
    handler.onModuleInit();
    expect(subscriber.subscribe).toHaveBeenCalledWith(
      "vistoria.status.changed",
      expect.any(Function),
    );
  });
});
