import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * Valida a cadeia async BE↔IN entregue nas Sprints 12 (BE) e 13 (IN)
 * sem depender do BE Sprint 17 publicar `vistoria.routed`:
 *
 *   create vistoria → injetamos `vistoria.routed` via RMQ Management API
 *     → AgendamentoOrchestrator (IN) consome → InternoProvider.agendar()
 *       publica `vistoria.status.changed` (AGENDADA) → BE consumer
 *         aplica AGENDADA + VistoriaTransicao + AuditLog
 *           → /vistorias/:id/transicoes contém SOLICITADA → ROTEADA → AGENDADA
 *
 * Quando BE Sprint 17 publicar `vistoria.routed` automaticamente, este
 * teste pode ser simplificado (omitir o publish manual) — a asserção
 * final permanece a mesma.
 */

const ADMIN_CREDS = {
  email: "admin@auxiliadorapredial.com.br",
  password: "admin123",
};

const RMQ_MGMT_URL = process.env.E2E_RMQ_MGMT_URL ?? "http://localhost:15672";
const RMQ_USER = process.env.E2E_RMQ_USER ?? "vistoria";
const RMQ_PASS = process.env.E2E_RMQ_PASS ?? "vistoria";

async function login(request: APIRequestContext): Promise<{
  access: string;
  tenantId: string;
}> {
  const response = await request.post("/api/v1/auth/login", {
    data: ADMIN_CREDS,
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  return { access: body.access, tenantId: body.user.tenantId };
}

async function publishRouted(
  eventPayload: Record<string, unknown>,
): Promise<void> {
  // RabbitMQ Management API: POST /api/exchanges/{vhost}/{exchange}/publish.
  // Default vhost "/" precisa ser URL-encoded como %2F.
  const url = `${RMQ_MGMT_URL}/api/exchanges/%2F/vistoria.events/publish`;
  const auth = Buffer.from(`${RMQ_USER}:${RMQ_PASS}`).toString("base64");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      properties: {
        content_type: "application/json",
        delivery_mode: 2,
        message_id: eventPayload.eventId as string,
      },
      routing_key: "vistoria.routed",
      payload: JSON.stringify(eventPayload),
      payload_encoding: "string",
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RMQ publish falhou: HTTP ${response.status} — ${text}`);
  }
  const body = (await response.json()) as { routed: boolean };
  if (!body.routed) {
    throw new Error(
      "RMQ publish OK mas mensagem não foi roteada — nenhuma queue está bound em vistoria.routed",
    );
  }
}

test.describe("Fluxo async BE↔IN — orchestrator de vistoria.routed", () => {
  test("vistoria.routed → orchestrator → InternoProvider → AGENDADA na timeline", async ({
    request,
  }) => {
    const { access, tenantId } = await login(request);
    const auth = { Authorization: `Bearer ${access}` };

    // 1) Cria vistoria do tipo SAIDA — força routing para "interno"
    //    (ProviderRoutingService.decide retorna "interno" para SAIDA).
    const create = await request.post("/api/v1/vistorias", {
      headers: auth,
      data: {
        tipo: "SAIDA",
        enderecoLogradouro: "Rua Orchestrator",
        enderecoNumero: "42",
        enderecoBairro: "Centro",
        enderecoCidade: "Porto Alegre",
        enderecoUf: "RS",
        enderecoCep: "90000-000",
        contatoNome: "Tester Orchestrator",
        contatoTelefone: "5199990042",
      },
    });
    expect(create.status()).toBe(201);
    const vistoria = await create.json();
    expect(vistoria.status).toBe("ROTEADA");
    expect(vistoria.providerId).toBe("interno");

    // 2) Injeta o evento que BE Sprint 17 publicará automaticamente.
    //    Payload espelha o `VistoriaRoutedEventSchema` (@vistoria/api-contracts).
    await publishRouted({
      eventId: randomUUID(),
      vistoriaId: vistoria.id,
      tenantId,
      providerId: "interno",
      reason: "tipo=SAIDA roteado para equipe interna",
      tipo: "SAIDA",
      enderecoCompleto: "Rua Orchestrator, 42 — Centro, Porto Alegre/RS",
      cep: "90000-000",
      contato: {
        nome: "Tester Orchestrator",
        telefone: "5199990042",
      },
    });

    // 3) Aguarda a cadeia processar (orchestrator → provider → status writer
    //    → BE consumer). Poll na timeline até AGENDADA aparecer.
    await expect
      .poll(
        async () => {
          const res = await request.get(
            `/api/v1/vistorias/${vistoria.id}/transicoes`,
            { headers: auth },
          );
          if (res.status() !== 200) return null;
          const body = await res.json();
          return body.data.map((t: { para: string }) => t.para);
        },
        {
          message: "esperando transição para AGENDADA via cadeia async",
          timeout: 15_000,
          intervals: [500, 1000, 1500],
        },
      )
      .toEqual(expect.arrayContaining(["SOLICITADA", "ROTEADA", "AGENDADA"]));

    // 4) Confirma que o detalhe da vistoria também reflete AGENDADA.
    const detail = await request.get(`/api/v1/vistorias/${vistoria.id}`, {
      headers: auth,
    });
    expect(detail.status()).toBe(200);
    const detailBody = await detail.json();
    expect(detailBody.status).toBe("AGENDADA");

    // 5) Audit log deve ter VISTORIA.STATUS_CHANGED com userId=null.
    const audit = await request.get(
      `/api/v1/audit-logs?resourceType=Vistoria&resourceId=${vistoria.id}&action=VISTORIA.STATUS_CHANGED`,
      { headers: auth },
    );
    expect(audit.status()).toBe(200);
    const auditBody = await audit.json();
    expect(auditBody.data.length).toBeGreaterThanOrEqual(1);
    expect(auditBody.data[0].userId).toBeNull();
  });
});
