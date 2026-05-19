import { test, expect } from "@playwright/test";

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
