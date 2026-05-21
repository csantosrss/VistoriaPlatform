import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Cobre os endpoints novos da Sprint 17 BE:
 *   - POST /api/v1/users
 *   - GET  /api/v1/users
 *   - PATCH /api/v1/users/:id
 *   - DELETE /api/v1/users/:id (soft-delete)
 *   - POST /api/v1/vistoriadores/:id/agenda
 *   - GET  /api/v1/vistoriadores/:id/agenda
 *   - PATCH /api/v1/vistoriadores/:id/agenda/:slotId
 *   - DELETE /api/v1/vistoriadores/:id/agenda/:slotId
 *
 * Cada teste cria um vistoriador único (email com timestamp) para evitar
 * colisão entre execuções no mesmo DB.
 */

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

test.describe("Users CRUD", () => {
  test("cria, lista, atualiza e desativa vistoriador", async ({ request }) => {
    const access = await login(request);
    const auth = { Authorization: `Bearer ${access}` };
    const email = uniqueEmail("vist");

    // create
    const create = await request.post("/api/v1/users", {
      headers: auth,
      data: {
        email,
        name: "Vistoriador E2E",
        password: "senha-forte-e2e-1",
        roles: ["VISTORIADOR"],
      },
    });
    expect(create.status()).toBe(201);
    const created = await create.json();
    expect(created.email).toBe(email);
    expect(created.roles).toContain("VISTORIADOR");
    expect(created.active).toBe(true);
    const userId = created.id as string;

    // list filtra por role VISTORIADOR
    const list = await request.get(
      `/api/v1/users?role=VISTORIADOR&pageSize=100`,
      { headers: auth },
    );
    expect(list.status()).toBe(200);
    const listBody = await list.json();
    expect(listBody.data.some((u: { id: string }) => u.id === userId)).toBe(
      true,
    );

    // patch nome
    const patch = await request.patch(`/api/v1/users/${userId}`, {
      headers: auth,
      data: { name: "Vistoriador Editado" },
    });
    expect(patch.status()).toBe(200);
    const patched = await patch.json();
    expect(patched.name).toBe("Vistoriador Editado");

    // soft-delete
    const del = await request.delete(`/api/v1/users/${userId}`, {
      headers: auth,
    });
    expect(del.status()).toBe(200);
    const deleted = await del.json();
    expect(deleted.active).toBe(false);

    // audit registra USER.CREATED + USER.UPDATED + USER.DEACTIVATED
    const audit = await request.get(
      `/api/v1/audit-logs?resourceType=User&resourceId=${userId}`,
      { headers: auth },
    );
    expect(audit.status()).toBe(200);
    const auditBody = await audit.json();
    const actions = auditBody.data.map((l: { action: string }) => l.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "USER.CREATED",
        "USER.UPDATED",
        "USER.DEACTIVATED",
      ]),
    );
  });

  test("não permite criar dois users com o mesmo email no tenant", async ({
    request,
  }) => {
    const access = await login(request);
    const auth = { Authorization: `Bearer ${access}` };
    const email = uniqueEmail("dup");

    const first = await request.post("/api/v1/users", {
      headers: auth,
      data: {
        email,
        name: "Primeiro",
        password: "senha-forte-1",
        roles: ["VISTORIADOR"],
      },
    });
    expect(first.status()).toBe(201);

    const second = await request.post("/api/v1/users", {
      headers: auth,
      data: {
        email,
        name: "Segundo",
        password: "senha-forte-2",
        roles: ["VISTORIADOR"],
      },
    });
    expect(second.status()).toBe(409);
  });
});

test.describe("Agenda CRUD", () => {
  test("cria slots, lista, atualiza e remove", async ({ request }) => {
    const access = await login(request);
    const auth = { Authorization: `Bearer ${access}` };

    // cria vistoriador
    const userResp = await request.post("/api/v1/users", {
      headers: auth,
      data: {
        email: uniqueEmail("agenda"),
        name: "Vistoriador Agenda",
        password: "senha-forte-1",
        roles: ["VISTORIADOR"],
      },
    });
    expect(userResp.status()).toBe(201);
    const vist = await userResp.json();

    // cria 2 slots em lote
    const create = await request.post(
      `/api/v1/vistoriadores/${vist.id}/agenda`,
      {
        headers: auth,
        data: {
          slots: [
            {
              inicio: "2026-06-01T08:00:00.000Z",
              fim: "2026-06-01T18:00:00.000Z",
              disponivel: true,
            },
            {
              inicio: "2026-06-02T08:00:00.000Z",
              fim: "2026-06-02T18:00:00.000Z",
              disponivel: false,
              motivo: "Bloqueado para férias",
            },
          ],
        },
      },
    );
    expect(create.status()).toBe(201);
    const createdSlots = (await create.json()).data;
    expect(createdSlots).toHaveLength(2);

    // list devolve em ASC
    const list = await request.get(`/api/v1/vistoriadores/${vist.id}/agenda`, {
      headers: auth,
    });
    expect(list.status()).toBe(200);
    const listed = (await list.json()).data;
    expect(listed.length).toBeGreaterThanOrEqual(2);
    expect(new Date(listed[0].inicio).getTime()).toBeLessThanOrEqual(
      new Date(listed[1].inicio).getTime(),
    );

    // patch disponivel + motivo
    const slotId = createdSlots[0].id;
    const patch = await request.patch(
      `/api/v1/vistoriadores/${vist.id}/agenda/${slotId}`,
      {
        headers: auth,
        data: { disponivel: false, motivo: "Bloqueio pontual" },
      },
    );
    expect(patch.status()).toBe(200);
    const patched = await patch.json();
    expect(patched.disponivel).toBe(false);
    expect(patched.motivo).toBe("Bloqueio pontual");

    // delete
    const del = await request.delete(
      `/api/v1/vistoriadores/${vist.id}/agenda/${slotId}`,
      { headers: auth },
    );
    expect(del.status()).toBe(204);
  });

  test("rejeita slot com fim <= inicio", async ({ request }) => {
    const access = await login(request);
    const auth = { Authorization: `Bearer ${access}` };
    const userResp = await request.post("/api/v1/users", {
      headers: auth,
      data: {
        email: uniqueEmail("agenda-invalid"),
        name: "X",
        password: "senha-forte-1",
        roles: ["VISTORIADOR"],
      },
    });
    const vist = await userResp.json();

    const bad = await request.post(`/api/v1/vistoriadores/${vist.id}/agenda`, {
      headers: auth,
      data: {
        slots: [
          {
            inicio: "2026-06-01T18:00:00.000Z",
            fim: "2026-06-01T08:00:00.000Z",
          },
        ],
      },
    });
    expect(bad.status()).toBe(400);
  });

  test("rejeita agenda em usuário sem role VISTORIADOR", async ({
    request,
  }) => {
    const access = await login(request);
    const auth = { Authorization: `Bearer ${access}` };
    const gestor = await request.post("/api/v1/users", {
      headers: auth,
      data: {
        email: uniqueEmail("gestor"),
        name: "Gestor",
        password: "senha-forte-1",
        roles: ["GESTOR"],
      },
    });
    const gestorBody = await gestor.json();

    const response = await request.post(
      `/api/v1/vistoriadores/${gestorBody.id}/agenda`,
      {
        headers: auth,
        data: {
          slots: [
            {
              inicio: "2026-06-01T08:00:00.000Z",
              fim: "2026-06-01T18:00:00.000Z",
            },
          ],
        },
      },
    );
    expect(response.status()).toBe(400);
  });
});
