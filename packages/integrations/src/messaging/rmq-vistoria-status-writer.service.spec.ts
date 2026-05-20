import { RmqVistoriaStatusWriter } from "./rmq-vistoria-status-writer.service";

describe("RmqVistoriaStatusWriter.update (sem canal)", () => {
  it("não falha quando o canal não está conectado — apenas loga warn", async () => {
    const writer = new RmqVistoriaStatusWriter({
      get: () => undefined,
    } as never);
    // não chamamos onModuleInit — canal fica null
    await expect(
      writer.update({
        vistoriaId: "v-1",
        tenantId: "t-1",
        newStatus: "AGENDADA",
        source: "rede-vistorias",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("RmqVistoriaStatusWriter.update (com canal mockado)", () => {
  function buildWriter() {
    const writer = new RmqVistoriaStatusWriter({
      get: (key: string, def?: unknown) => {
        if (key === "RABBITMQ_URL") return undefined;
        if (key === "RABBITMQ_EXCHANGE") return "vistoria.events";
        return def;
      },
    } as never);
    const publish = jest.fn();
    (writer as unknown as { channel: unknown }).channel = { publish };
    (writer as unknown as { exchange: string }).exchange = "vistoria.events";
    return { writer, publish };
  }

  it("publica no exchange com routing key vistoria.status.changed", async () => {
    const { writer, publish } = buildWriter();
    await writer.update({
      vistoriaId: "v-1",
      tenantId: "t-1",
      newStatus: "AGENDADA",
      source: "rede-vistorias",
      correlationId: "corr-123",
    });

    expect(publish).toHaveBeenCalledTimes(1);
    const [exchange, routingKey, buffer, opts] = publish.mock.calls[0];
    expect(exchange).toBe("vistoria.events");
    expect(routingKey).toBe("vistoria.status.changed");
    expect(JSON.parse(buffer.toString("utf8"))).toMatchObject({
      vistoriaId: "v-1",
      newStatus: "AGENDADA",
      source: "rede-vistorias",
    });
    expect(opts.correlationId).toBe("corr-123");
    expect(opts.headers).toMatchObject({
      source: "rede-vistorias",
      tenantId: "t-1",
    });
  });

  it("gera eventId quando ausente e envia no payload + messageId + header", async () => {
    const { writer, publish } = buildWriter();
    await writer.update({
      vistoriaId: "v-1",
      tenantId: "t-1",
      newStatus: "AGENDADA",
      source: "rede-vistorias",
    });
    const [, , buffer, opts] = publish.mock.calls[0];
    const payload = JSON.parse(buffer.toString("utf8"));
    expect(payload.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(opts.messageId).toBe(payload.eventId);
    expect(opts.headers.eventId).toBe(payload.eventId);
  });

  it("respeita eventId fornecido pelo caller (idempotência cross-publisher)", async () => {
    const { writer, publish } = buildWriter();
    const fixed = "00000000-0000-4000-8000-000000000001";
    await writer.update({
      eventId: fixed,
      vistoriaId: "v-1",
      tenantId: "t-1",
      newStatus: "EM_EXECUCAO",
      source: "conceitual",
    });
    const [, , buffer, opts] = publish.mock.calls[0];
    const payload = JSON.parse(buffer.toString("utf8"));
    expect(payload.eventId).toBe(fixed);
    expect(opts.messageId).toBe(fixed);
  });
});
