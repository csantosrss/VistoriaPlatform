import { test, expect, type APIRequestContext } from "@playwright/test";

const ADMIN_CREDS = {
  email: "admin@auxiliadorapredial.com.br",
  password: "admin123",
};

async function login(request: APIRequestContext): Promise<{
  access: string;
  refresh: string;
  userId: string;
  tenantId: string;
}> {
  const response = await request.post("/api/v1/auth/login", {
    data: ADMIN_CREDS,
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.access).toBeTruthy();
  expect(body.refresh).toBeTruthy();
  return {
    access: body.access,
    refresh: body.refresh,
    userId: body.user.id,
    tenantId: body.user.tenantId,
  };
}

test.describe("Auth + Vistorias E2E", () => {
  test("login devolve JWT válido + GET /me retorna o mesmo usuário", async ({
    request,
  }) => {
    const { access, userId } = await login(request);

    const me = await request.get("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${access}` },
    });
    expect(me.status()).toBe(200);
    const meBody = await me.json();
    expect(meBody.id).toBe(userId);
    expect(meBody.email).toBe(ADMIN_CREDS.email);
    expect(meBody.roles).toEqual(expect.arrayContaining(["ADMIN"]));
  });

  test("login com senha errada retorna 401", async ({ request }) => {
    const response = await request.post("/api/v1/auth/login", {
      data: { email: ADMIN_CREDS.email, password: "senha-incorreta" },
    });
    expect(response.status()).toBe(401);
  });

  test("/me sem token retorna 401", async ({ request }) => {
    const response = await request.get("/api/v1/auth/me");
    expect(response.status()).toBe(401);
  });

  test("ciclo Vistoria: cria, lista, cancela, vê no audit", async ({
    request,
  }) => {
    const { access } = await login(request);
    const auth = { Authorization: `Bearer ${access}` };

    // create
    const create = await request.post("/api/v1/vistorias", {
      headers: auth,
      data: {
        tipo: "ENTRADA",
        enderecoLogradouro: "Rua E2E",
        enderecoNumero: "100",
        enderecoBairro: "Centro",
        enderecoCidade: "Porto Alegre",
        enderecoUf: "RS",
        enderecoCep: "90000-000",
        contatoNome: "E2E Tester",
        contatoTelefone: "5199999000",
      },
    });
    expect(create.status()).toBe(201);
    const created = await create.json();
    expect(created.status).toBe("ROTEADA");
    expect(created.providerId).toBeTruthy();
    const id = created.id as string;

    // list contains it
    const list = await request.get("/api/v1/vistorias?page=1&pageSize=50", {
      headers: auth,
    });
    expect(list.status()).toBe(200);
    const listed = await list.json();
    expect(listed.data.some((v: { id: string }) => v.id === id)).toBe(true);

    // cancel
    const cancel = await request.post(`/api/v1/vistorias/${id}/cancelar`, {
      headers: auth,
      data: { motivo: "Teste automático Playwright" },
    });
    expect(cancel.status()).toBe(200);
    const cancelled = await cancel.json();
    expect(cancelled.status).toBe("CANCELADA");
    expect(cancelled.canceladoMotivo).toBe("Teste automático Playwright");

    // cancel again -> 409
    const cancelAgain = await request.post(`/api/v1/vistorias/${id}/cancelar`, {
      headers: auth,
      data: { motivo: "tentativa duplicada" },
    });
    expect(cancelAgain.status()).toBe(409);

    // audit registers VISTORIA.CANCELED para esse resourceId
    const audit = await request.get(
      `/api/v1/audit-logs?resourceType=Vistoria&resourceId=${id}`,
      { headers: auth },
    );
    expect(audit.status()).toBe(200);
    const auditBody = await audit.json();
    const actions = auditBody.data.map((l: { action: string }) => l.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "VISTORIA.CREATED",
        "VISTORIA.ROUTED",
        "VISTORIA.CANCELED",
      ]),
    );
  });

  test("refresh token renova o par e o novo access acessa /me", async ({
    request,
  }) => {
    const { refresh } = await login(request);

    const refreshed = await request.post("/api/v1/auth/refresh", {
      data: { refresh },
    });
    expect(refreshed.status()).toBe(200);
    const body = await refreshed.json();
    expect(body.access).toBeTruthy();
    expect(body.refresh).toBeTruthy();
    expect(body.refresh).not.toBe(refresh);

    const me = await request.get("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${body.access}` },
    });
    expect(me.status()).toBe(200);
  });

  test("refresh com token inválido retorna 401", async ({ request }) => {
    const response = await request.post("/api/v1/auth/refresh", {
      data: { refresh: "x".repeat(50) },
    });
    expect(response.status()).toBe(401);
  });

  test("refresh usando access token (type errado) retorna 401", async ({
    request,
  }) => {
    const { access } = await login(request);
    const response = await request.post("/api/v1/auth/refresh", {
      data: { refresh: access },
    });
    expect(response.status()).toBe(401);
  });

  test("GET /vistorias/stats devolve total + byStatus", async ({ request }) => {
    const { access } = await login(request);
    const response = await request.get("/api/v1/vistorias/stats", {
      headers: { Authorization: `Bearer ${access}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body.total).toBe("number");
    expect(body.byStatus).toBeDefined();
    expect(typeof body.byStatus.SOLICITADA).toBe("number");
    expect(typeof body.byStatus.ROTEADA).toBe("number");
    expect(typeof body.byStatus.CONCLUIDA).toBe("number");
    expect(typeof body.byStatus.CANCELADA).toBe("number");
  });

  test("GET /vistorias/:id/transicoes devolve a timeline da SAGA", async ({
    request,
  }) => {
    const { access } = await login(request);
    const auth = { Authorization: `Bearer ${access}` };

    const create = await request.post("/api/v1/vistorias", {
      headers: auth,
      data: {
        tipo: "ENTRADA",
        enderecoLogradouro: "Rua Transicao",
        enderecoNumero: "1",
        enderecoBairro: "Centro",
        enderecoCidade: "Porto Alegre",
        enderecoUf: "RS",
        enderecoCep: "90000-000",
        contatoNome: "Tester",
        contatoTelefone: "5199999000",
      },
    });
    const created = await create.json();
    const id = created.id as string;

    const transicoes = await request.get(`/api/v1/vistorias/${id}/transicoes`, {
      headers: auth,
    });
    expect(transicoes.status()).toBe(200);
    const body = await transicoes.json();
    expect(Array.isArray(body.data)).toBe(true);
    // criação registra duas transições: null→SOLICITADA, SOLICITADA→ROTEADA
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.data[0].de).toBeNull();
    expect(body.data[0].para).toBe("SOLICITADA");
    expect(body.data[1].de).toBe("SOLICITADA");
    expect(body.data[1].para).toBe("ROTEADA");
    expect(body.data[1].motivo).toBeTruthy();
  });
});
