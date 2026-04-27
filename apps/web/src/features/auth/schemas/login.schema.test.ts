import { describe, it, expect } from "vitest";
import { loginSchema } from "./login.schema";

describe("loginSchema", () => {
  const valid = {
    email: "admin@auxiliadora.com.br",
    password: "password123",
    tenantSlug: "auxiliadora",
  };

  it("accepts valid input", () => {
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid email", () => {
    const r = loginSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("rejects short password", () => {
    const r = loginSchema.safeParse({ ...valid, password: "short" });
    expect(r.success).toBe(false);
  });

  it("rejects tenant with uppercase", () => {
    const r = loginSchema.safeParse({ ...valid, tenantSlug: "Auxiliadora" });
    expect(r.success).toBe(false);
  });
});
