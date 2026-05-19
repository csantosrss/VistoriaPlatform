import { ProviderRoutingService } from "./provider-routing.service";

describe("ProviderRoutingService.decide", () => {
  const service = new ProviderRoutingService();
  const base = {
    tenantId: "t-1",
    tipo: "ENTRADA" as const,
    enderecoUf: "RS",
  };

  it("respeita preferredProviderId quando informado", () => {
    const decision = service.decide({
      ...base,
      preferredProviderId: "conceitual",
    });
    expect(decision.providerId).toBe("conceitual");
    expect(decision.reason).toMatch(/override/);
  });

  it("vistorias SAIDA são sempre roteadas para interno", () => {
    const decision = service.decide({ ...base, tipo: "SAIDA" });
    expect(decision.providerId).toBe("interno");
  });

  it("UF mapeada vai para o provider correspondente", () => {
    expect(service.decide({ ...base, enderecoUf: "SP" }).providerId).toBe(
      "rede-vistorias",
    );
    expect(service.decide({ ...base, enderecoUf: "DF" }).providerId).toBe(
      "conceitual",
    );
    expect(service.decide({ ...base, enderecoUf: "RS" }).providerId).toBe(
      "rede-vistorias",
    );
  });

  it("normaliza UF para upper-case", () => {
    expect(service.decide({ ...base, enderecoUf: "sp" }).providerId).toBe(
      "rede-vistorias",
    );
  });

  it("UF sem regra cai para interno", () => {
    const decision = service.decide({ ...base, enderecoUf: "AC" });
    expect(decision.providerId).toBe("interno");
    expect(decision.reason).toMatch(/fallback/);
  });
});
