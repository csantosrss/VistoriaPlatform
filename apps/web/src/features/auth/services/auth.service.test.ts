import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearSession,
  getStoredToken,
  getStoredUser,
  persistSession,
} from "./auth.service";

const FAKE_USER = {
  id: "9a9b9d6a-2c3a-4c8b-8e0d-3a4b5c6d7e8f",
  tenantId: "0b0a0c0d-1e1f-4a4b-9c9d-2e2f3a3b4c4d",
  email: "admin@x.com.br",
  name: "Admin Auxiliadora",
  roles: ["ADMIN", "GESTOR"] as const,
};

describe("auth.service session helpers", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("persistSession + getStoredToken/User", () => {
    persistSession({
      access: "x".repeat(40),
      expiresIn: "15m",
      user: { ...FAKE_USER, roles: [...FAKE_USER.roles] },
    });
    expect(getStoredToken()).toBe("x".repeat(40));
    expect(getStoredUser()?.email).toBe(FAKE_USER.email);
  });

  it("clearSession remove tudo", () => {
    persistSession({
      access: "x".repeat(40),
      expiresIn: "15m",
      user: { ...FAKE_USER, roles: [...FAKE_USER.roles] },
    });
    clearSession();
    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it("getStoredUser retorna null se JSON for inválido", () => {
    localStorage.setItem("auth.user", "{not-json}");
    expect(getStoredUser()).toBeNull();
  });

  it("getStoredUser retorna null se shape não bater com o schema", () => {
    localStorage.setItem("auth.user", JSON.stringify({ foo: "bar" }));
    expect(getStoredUser()).toBeNull();
  });
});
