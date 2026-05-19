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
  it("publica no exchange com routing key vistoria.status.changed", async () => {
    const writer = new RmqVistoriaStatusWriter({
      get: (key: string, def?: unknown) => {
        if (key === "RABBITMQ_URL") return undefined;
        if (key === "RABBITMQ_EXCHANGE") return "vistoria.events";
        return def;
      },
    } as never);
    // injeta canal mockado
    const publish = jest.fn();
    (writer as unknown as { channel: unknown }).channel = { publish };
    (writer as unknown as { exchange: string }).exchange = "vistoria.events";

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
});
