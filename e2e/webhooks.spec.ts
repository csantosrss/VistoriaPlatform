import { createHmac } from "node:crypto";
import { test, expect } from "@playwright/test";

/**
 * Os secrets dev abaixo precisam casar com `apps/api/.env.example` — qualquer
 * mudança lá quebra esse caminho. Em produção, são variáveis secretas.
 */
const RV_SECRET = "dev-rv-webhook-secret-do-not-use-in-prod";
const CC_SECRET = "dev-conceitual-webhook-secret-do-not-use-in-prod";

function signHex(secret: string, body: unknown): string {
  const raw = Buffer.from(JSON.stringify(body));
  return createHmac("sha256", secret).update(raw).digest("hex");
}

test.describe("Webhook endpoint @Public() bypass do JwtGuard", () => {
  test("POST /api/v1/integrations/webhooks/rede-vistorias sem JWT retorna 403 (HMAC), não 401", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/v1/integrations/webhooks/rede-vistorias",
      {
        data: {
          event: "inspection.updated",
          inspectionId: "rv-x",
          status: "CONFIRMED",
          occurredAt: "2026-05-19T00:00:00.000Z",
        },
        headers: { "x-rv-signature": "deadbeef" },
      },
    );
    // 403 ForbiddenException da assinatura inválida prova que o
    // JwtGuard liberou (caso contrário voltaria 401 UnauthorizedException).
    expect(response.status()).toBe(403);
  });

  test("POST para provider desconhecido retorna 403 (signature ainda é o primeiro check)", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/v1/integrations/webhooks/inexistente",
      {
        data: {},
        headers: { "x-rv-signature": "deadbeef" },
      },
    );
    expect(response.status()).toBe(403);
  });
});

test.describe("Webhook Rede Vistorias — caminho feliz HMAC", () => {
  test("HMAC válido + externalId presente → 204", async ({ request }) => {
    // externalId aponta para uma Vistoria inexistente: o controller ainda
    // publica em vistoria.events sem checar persistência. Confirmação E2E
    // de que a Vistoria mudou de status fica para BE Sprint 12 quando o
    // handler do RmqSubscriber for registrado.
    const body = {
      event: "inspection.updated",
      inspectionId: "rv-inexistente-123",
      externalId: "00000000-0000-0000-0000-000000000000",
      status: "CONFIRMED",
      occurredAt: "2026-05-19T00:00:00.000Z",
    };
    const response = await request.post(
      "/api/v1/integrations/webhooks/rede-vistorias",
      {
        data: body,
        headers: {
          "x-rv-signature": signHex(RV_SECRET, body),
          "x-correlation-id": "e2e-rv-happy-path",
        },
      },
    );
    expect(response.status()).toBe(204);
  });

  test("HMAC válido + sem externalId → 204 (drop silencioso, sem efeito na SAGA)", async ({
    request,
  }) => {
    const body = {
      event: "inspection.updated",
      inspectionId: "rv-sem-externalid",
      status: "CONFIRMED",
      occurredAt: "2026-05-19T00:00:00.000Z",
    };
    const response = await request.post(
      "/api/v1/integrations/webhooks/rede-vistorias",
      {
        data: body,
        headers: { "x-rv-signature": signHex(RV_SECRET, body) },
      },
    );
    // O parceiro não passou `externalId`; controller loga warn e responde
    // 204 sem chamar o statusWriter (vide IN Sprint 08).
    expect(response.status()).toBe(204);
  });
});

test.describe("Webhook Conceitual — caminho feliz HMAC", () => {
  test("HMAC válido + idExterno presente → 204", async ({ request }) => {
    const body = {
      evento: "vistoria.atualizada",
      idVistoria: "cc-inexistente-456",
      idExterno: "00000000-0000-0000-0000-000000000001",
      situacao: "FINALIZADA",
      ocorrenciaEm: "2026-05-19T00:00:00.000Z",
    };
    const response = await request.post(
      "/api/v1/integrations/webhooks/conceitual",
      {
        data: body,
        headers: {
          "x-conceitual-signature": signHex(CC_SECRET, body),
          "x-correlation-id": "e2e-cc-happy-path",
        },
      },
    );
    expect(response.status()).toBe(204);
  });
});
