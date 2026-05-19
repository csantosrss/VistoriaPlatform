import { describe, it, expect } from "vitest";
import { loginSchema } from "./login.schema";

describe("loginSchema", () => {
  const valid = {
    email: "admin@auxiliadorapredial.com.br",
    password: "admin123",
  };

  it("aceita input válido", () => {
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    const r = loginSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("rejeita senha curta (<6)", () => {
    const r = loginSchema.safeParse({ ...valid, password: "abc" });
    expect(r.success).toBe(false);
  });

  it("rejeita senha longa (>72)", () => {
    const r = loginSchema.safeParse({ ...valid, password: "x".repeat(73) });
    expect(r.success).toBe(false);
  });
});
