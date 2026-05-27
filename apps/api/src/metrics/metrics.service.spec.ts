import { Test } from "@nestjs/testing";
import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  let service: MetricsService;

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();
    service = ref.get(MetricsService);
    await ref.init();
  });

  it("expõe http_requests_total e http_request_duration_seconds após observe", async () => {
    service.observe("GET", "/api/v1/health", 200, 0.012);
    service.observe("POST", "/api/v1/auth/login", 401, 0.083);

    const text = await service.registry.metrics();

    expect(text).toContain("http_requests_total");
    // Ordem das labels no exposition format não é garantida — match por conteúdo.
    expect(text).toMatch(/http_requests_total\{[^}]*method="GET"[^}]*\} 1/);
    expect(text).toMatch(
      /http_requests_total\{[^}]*route="\/api\/v1\/health"[^}]*\} 1/,
    );
    expect(text).toContain("http_request_duration_seconds_bucket");
  });

  it("inclui default metrics do Node.js no registry", async () => {
    const text = await service.registry.metrics();
    expect(text).toContain("process_cpu_user_seconds_total");
    expect(text).toContain("nodejs_eventloop_lag_seconds");
  });
});
