import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

/**
 * Agenda — calendário mensal (Sprint 29 FE).
 *
 * Cobre os 4 casos do contrato escrito pelo QI Sprint 26 + bulk-block do
 * BE Sprint 27:
 *  1. /agenda (admin) → dropdown vistoriador → calendário → click no dia →
 *     drawer → "+ Novo slot" inline → badge no dia.
 *  2. Drawer → seleção múltipla → bulk-update (Bloquear).
 *  3. Header → "Bloquear período" → modal → bulk-block em transação.
 *  4. /vistoriadores/:id/agenda renderiza a mesma página sem dropdown.
 */

const WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:5173";

const ADMIN = {
  email: "admin@auxiliadorapredial.com.br",
  password: "admin123",
};

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@e2e.test`;
}

async function loginViaApi(request: APIRequestContext): Promise<string> {
  const r = await request.post("/api/v1/auth/login", { data: ADMIN });
  expect(r.status()).toBe(200);
  return ((await r.json()) as { access: string }).access;
}

async function createVistoriadorViaApi(
  request: APIRequestContext,
  token: string,
): Promise<{ id: string; name: string; email: string }> {
  const email = uniqueEmail("agenda-ui");
  const r = await request.post("/api/v1/users", {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      email,
      name: "Vistoriador Calendário",
      password: "senha-forte-1",
      roles: ["VISTORIADOR"],
      providerId: "interno",
    },
  });
  expect(r.status()).toBe(201);
  const body = (await r.json()) as { id: string; name: string; email: string };
  return body;
}

async function loginThroughUI(page: Page): Promise<void> {
  await page.goto(`${WEB_URL}/login`);
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Senha").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${WEB_URL}/`);
}

// Próxima sexta-feira em horário comercial — escolhe um dia de semana
// "no futuro próximo" pra evitar bater com fim de semana e dias passados.
function nextFridayAt(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  const dayOfWeek = d.getDay();
  // 5 = sexta
  const delta = (5 - dayOfWeek + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d;
}

test.describe("Agenda — calendário mensal", () => {
  test("admin escolhe vistoriador, cria slot no drawer, vê badge no dia", async ({
    page,
    request,
  }) => {
    const token = await loginViaApi(request);
    const vist = await createVistoriadorViaApi(request, token);

    await loginThroughUI(page);
    await page.getByRole("link", { name: "Agenda" }).click();
    await page.waitForURL(`${WEB_URL}/agenda`);
    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();

    await page
      .getByLabel(/Selecionar vistoriador/i)
      .selectOption({ label: new RegExp(vist.name) });

    await expect(page.getByText("Dom", { exact: true })).toBeVisible();
    await expect(page.getByText("Seg", { exact: true })).toBeVisible();

    const friday = nextFridayAt(8);
    const dayBtnName = `^${friday.getDate()}\\b`;
    await page
      .getByRole("button", { name: new RegExp(dayBtnName) })
      .first()
      .click();

    const drawer = page.getByRole("complementary");
    await expect(drawer).toBeVisible();

    await drawer.getByRole("button", { name: /Novo slot/i }).click();
    // Form vem com defaults 08:00/09:00 do dia clicado — só confirma submit.
    await drawer.getByRole("button", { name: "Adicionar" }).click();

    // Slot aparece com badge "Livre" e o calendário ganha contagem.
    await expect(drawer.getByText("Livre")).toBeVisible();
    await expect(page.getByText(/1 livre/i).first()).toBeVisible();
  });

  test("seleção múltipla no drawer + bulk-update Bloquear", async ({
    page,
    request,
  }) => {
    const token = await loginViaApi(request);
    const vist = await createVistoriadorViaApi(request, token);

    // Setup: cria 2 slots no mesmo dia via API.
    const friday = nextFridayAt(8);
    const day = new Date(friday);
    day.setHours(0, 0, 0, 0);
    const slot1Inicio = new Date(day);
    slot1Inicio.setHours(8, 0, 0, 0);
    const slot1Fim = new Date(day);
    slot1Fim.setHours(9, 0, 0, 0);
    const slot2Inicio = new Date(day);
    slot2Inicio.setHours(10, 0, 0, 0);
    const slot2Fim = new Date(day);
    slot2Fim.setHours(11, 0, 0, 0);

    const r = await request.post(`/api/v1/vistoriadores/${vist.id}/agenda`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        slots: [
          {
            inicio: slot1Inicio.toISOString(),
            fim: slot1Fim.toISOString(),
            disponivel: true,
          },
          {
            inicio: slot2Inicio.toISOString(),
            fim: slot2Fim.toISOString(),
            disponivel: true,
          },
        ],
      },
    });
    expect(r.status()).toBe(201);

    await loginThroughUI(page);
    await page.goto(`${WEB_URL}/vistoriadores/${vist.id}/agenda`);
    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();

    const dayBtnName = `^${friday.getDate()}\\b`;
    await page
      .getByRole("button", { name: new RegExp(dayBtnName) })
      .first()
      .click();

    const drawer = page.getByRole("complementary");
    await drawer.getByLabel("Selecionar todos").check();
    await drawer.getByRole("button", { name: /Bloquear$/ }).click();

    // Bulk-update virou bloqueado nos 2; badge do dia agora mostra "2 bloq.".
    await expect(page.getByText(/2 bloq\./i)).toBeVisible();
  });

  test("bloqueio em lote por período via header (bulk-block)", async ({
    page,
    request,
  }) => {
    const token = await loginViaApi(request);
    const vist = await createVistoriadorViaApi(request, token);

    // Setup: 1 slot livre no mês corrente.
    const friday = nextFridayAt(8);
    const inicio = new Date(friday);
    const fim = new Date(friday);
    fim.setHours(fim.getHours() + 1);
    const r = await request.post(`/api/v1/vistoriadores/${vist.id}/agenda`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        slots: [
          {
            inicio: inicio.toISOString(),
            fim: fim.toISOString(),
            disponivel: true,
          },
        ],
      },
    });
    expect(r.status()).toBe(201);

    await loginThroughUI(page);
    await page.goto(`${WEB_URL}/vistoriadores/${vist.id}/agenda`);
    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();

    await page.getByRole("button", { name: /Bloquear período/i }).click();
    const dialog = page.getByRole("dialog", { name: /Bloquear período/i });
    await expect(dialog).toBeVisible();
    // Defaults já preenchidos com o intervalo do mês — só confirma.
    await dialog.getByLabel(/Motivo/i).fill("Férias E2E");
    await dialog.getByRole("button", { name: /^Bloquear$/ }).click();

    // O dialog mostra contagem do BulkOpResponse.
    await expect(dialog.getByText(/1 slot.*bloqueado/i)).toBeVisible();
  });

  test("deep-link /vistoriadores/:id/agenda renderiza calendário sem dropdown", async ({
    page,
    request,
  }) => {
    const token = await loginViaApi(request);
    const vist = await createVistoriadorViaApi(request, token);

    await loginThroughUI(page);
    await page.goto(`${WEB_URL}/vistoriadores/${vist.id}/agenda`);
    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
    await expect(page.getByText("Dom", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/Selecionar vistoriador/i)).toHaveCount(0);
  });
});
