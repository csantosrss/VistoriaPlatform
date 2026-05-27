import { test, expect } from "@playwright/test";

/**
 * Endpoint /metrics Prometheus (Sprint 31 QI → Sprint 32 BE).
 *
 * Bug latente do ciclo 6: o controller foi entregue como `@Controller({ path:
 * "metrics", version: undefined })`, mas o `defaultVersion: "1"` global do
 * `main.ts` aplica a versão mesmo assim — o endpoint ficou em `/v1/metrics`
 * em vez de `/metrics`. Resultado: o scraper do Prometheus (configurado em
 * `infra/prometheus/prometheus.yml` para `:3000/metrics`) marca o target
 * `vistoria-api` como DOWN.
 *
 * Esta spec é o **contrato executável** da correção: `/metrics` puro deve
 * responder 200 com Content-Type Prometheus. A versão `/v1/metrics` pode
 * existir ou não — não importa para o scraper.
 */

test.describe("Endpoint /metrics Prometheus", () => {
  test("GET /metrics responde 200 com content-type text/plain Prometheus", async ({
    request,
  }) => {
    const r = await request.get("/metrics");
    expect(r.status()).toBe(200);
    const ct = r.headers()["content-type"] ?? "";
    expect(ct).toMatch(/text\/plain/);
    expect(ct).toMatch(/version=0\.0\.4/);
  });

  test("GET /metrics expõe http_requests_total + métricas Node default", async ({
    request,
  }) => {
    // Bate em /v1/health antes para garantir que o counter ganhou ao menos 1 sample.
    await request.get("/v1/health");
    const r = await request.get("/metrics");
    const body = await r.text();
    expect(body).toContain("http_requests_total");
    expect(body).toContain("http_request_duration_seconds_bucket");
    expect(body).toContain("nodejs_version_info");
    expect(body).toContain('service="vistoria-api"');
  });
});
