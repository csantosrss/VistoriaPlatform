import { test, expect, type APIRequestContext } from "@playwright/test";

const ADMIN_CREDS = {
  email: "admin@auxiliadorapredial.com.br",
  password: "admin123",
};

async function login(request: APIRequestContext): Promise<string> {
  const response = await request.post("/api/v1/auth/login", {
    data: ADMIN_CREDS,
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  return body.access as string;
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@e2e.test`;
}

test.describe("Cobertura geográfica do vistoriador", () => {
  test("cria, lista e remove cobertura; bloqueia redundância", async ({
    request,
  }) => {
    const access = await login(request);
    const auth = { Authorization: `Bearer ${access}` };

    // Cria vistoriador com providerId.
    const userResp = await request.post("/api/v1/users", {
      headers: auth,
      data: {
        email: uniqueEmail("cob"),
        name: "Vistoriador Cobertura",
        password: "senha-forte-1",
        roles: ["VISTORIADOR"],
        providerId: "interno",
      },
    });
    expect(userResp.status()).toBe(201);
    const vist = await userResp.json();

    // Cria (SP, null, null) → 201.
    const create1 = await request.post(`/api/v1/users/${vist.id}/cobertura`, {
      headers: auth,
      data: { uf: "SP" },
    });
    expect(create1.status()).toBe(201);
    const created = await create1.json();
    expect(created.uf).toBe("SP");
    expect(created.cidade).toBeNull();
    expect(created.bairro).toBeNull();
    const coberturaId = created.id as string;

    // Tenta criar (SP, São Paulo, null) → 409 (já coberto por SP wide).
    const create2 = await request.post(`/api/v1/users/${vist.id}/cobertura`, {
      headers: auth,
      data: { uf: "SP", cidade: "São Paulo" },
    });
    expect(create2.status()).toBe(409);

    // Cria (RJ, Niterói, null) → 201 (UF diferente).
    const create3 = await request.post(`/api/v1/users/${vist.id}/cobertura`, {
      headers: auth,
      data: { uf: "RJ", cidade: "Niterói" },
    });
    expect(create3.status()).toBe(201);

    // Lista → 2 coberturas.
    const list = await request.get(`/api/v1/users/${vist.id}/cobertura`, {
      headers: auth,
    });
    expect(list.status()).toBe(200);
    expect((await list.json()).data.length).toBeGreaterThanOrEqual(2);

    // Remove (SP, null, null).
    const del = await request.delete(
      `/api/v1/users/${vist.id}/cobertura/${coberturaId}`,
      { headers: auth },
    );
    expect(del.status()).toBe(204);
  });

  test("rejeita cobertura para vistoriador sem providerId", async ({
    request,
  }) => {
    const access = await login(request);
    const auth = { Authorization: `Bearer ${access}` };

    // Cria user sem role VISTORIADOR (GESTOR).
    const userResp = await request.post("/api/v1/users", {
      headers: auth,
      data: {
        email: uniqueEmail("gestor-cob"),
        name: "Gestor",
        password: "senha-forte-1",
        roles: ["GESTOR"],
      },
    });
    const u = await userResp.json();

    const response = await request.post(`/api/v1/users/${u.id}/cobertura`, {
      headers: auth,
      data: { uf: "SP" },
    });
    expect(response.status()).toBe(400);
  });
});
