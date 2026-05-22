import { test, expect, type Page } from "@playwright/test";

const WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:5173";

const ADMIN = {
  email: "admin@auxiliadorapredial.com.br",
  password: "admin123",
};

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@e2e.test`;
}

async function loginThroughUI(page: Page): Promise<void> {
  await page.goto(`${WEB_URL}/login`);
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Senha").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${WEB_URL}/`);
}

test.describe("Users + Agenda — fluxo pelo navegador", () => {
  test("criar vistoriador → cadastrar slot na agenda → ver na lista", async ({
    page,
  }) => {
    await loginThroughUI(page);

    // Vai para /users e clica em "Novo usuário".
    await page.getByRole("link", { name: "Usuários" }).click();
    await page.waitForURL(`${WEB_URL}/users`);
    await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();

    await page.getByRole("link", { name: "Novo usuário" }).click();
    await page.waitForURL(`${WEB_URL}/users/novo`);
    await expect(
      page.getByRole("heading", { name: "Novo usuário" }),
    ).toBeVisible();

    // Preenche o form (VISTORIADOR já marcado por default).
    const email = uniqueEmail("vist-ui");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Nome completo").fill("Vistoriador UI");
    await page
      .getByLabel("Senha (mínimo 8 caracteres)")
      .fill("senha-forte-ui-1");
    await page.getByRole("button", { name: "Criar usuário" }).click();

    // FE navega para /users/:id.
    await page.waitForURL(new RegExp(`${WEB_URL}/users/[0-9a-f-]+$`));
    await expect(page.getByRole("heading", { name: "Usuário" })).toBeVisible();
    await expect(page.getByText("Ativo")).toBeVisible();

    // Atalho "Abrir agenda" só aparece para VISTORIADOR.
    await expect(
      page.getByRole("link", { name: "Abrir agenda" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Abrir agenda" }).click();

    await page.waitForURL(
      new RegExp(`${WEB_URL}/vistoriadores/[0-9a-f-]+/agenda$`),
    );
    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();

    // Preenche o form de novo slot (datetime-local x2).
    // ISO sem timezone: YYYY-MM-DDTHH:MM
    await page.getByLabel("Início").fill("2026-06-01T08:00");
    await page.getByLabel("Fim").fill("2026-06-01T18:00");
    await page.getByLabel(/Motivo/).fill("Plantão E2E");
    await page.getByRole("button", { name: "Adicionar slot" }).click();

    // O slot aparece na tabela com badge "Disponível" e o motivo.
    await expect(page.getByText("Disponível").first()).toBeVisible();
    await expect(page.getByText("Plantão E2E")).toBeVisible();

    // Toggle Bloquear inline.
    await page.getByRole("button", { name: "Bloquear" }).first().click();
    await expect(page.getByText("Bloqueado").first()).toBeVisible();
  });

  test("filtro 'apenas ativos' some o vistoriador desativado", async ({
    page,
  }) => {
    await loginThroughUI(page);

    // Cria + abre detalhe + desativa.
    await page.goto(`${WEB_URL}/users/novo`);
    const email = uniqueEmail("desativ");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Nome completo").fill("Para Desativar");
    await page.getByLabel("Senha (mínimo 8 caracteres)").fill("senha-forte-1");
    await page.getByRole("button", { name: "Criar usuário" }).click();
    await page.waitForURL(new RegExp(`${WEB_URL}/users/[0-9a-f-]+$`));
    await page.getByRole("button", { name: "Desativar usuário" }).click();
    await expect(page.getByText("Inativo")).toBeVisible();

    // Lista com filtro "apenas ativos" (default) não mostra.
    await page.goto(`${WEB_URL}/users`);
    await expect(page.getByText(email)).toHaveCount(0);

    // Desmarca "apenas ativos" → aparece.
    await page.getByLabel("Apenas ativos").uncheck();
    await expect(page.getByText(email)).toBeVisible();
  });
});
