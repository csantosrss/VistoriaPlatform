import { test, expect } from "@playwright/test";

test.describe("Health endpoints", () => {
  test("GET /v1/health responde ok com todos os indicadores up", async ({
    request,
  }) => {
    const response = await request.get("/v1/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.info).toMatchObject({
      database: { status: "up" },
      redis: { status: "up" },
      rabbitmq: { status: "up" },
    });
  });

  test("GET /api/v1/health/liveness responde 200 mesmo sem depender de infra", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/health/liveness");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });
});
