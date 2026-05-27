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

    // Sprint 29 FE: a tela agora é calendário mensal com drawer.
    // Confirma cabeçalho dos dias da semana e clica num dia (15 do mês corrente).
    await expect(page.getByText("Dom", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^15\b/ }).first().click();

    // Drawer abre com "+ Novo slot neste dia".
    const drawer = page.getByRole("complementary");
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: /Novo slot/i }).click();

    // Form inline traz defaults 08:00/09:00 — sobrescreve com plantão de 18h.
    await drawer
      .getByLabel("Fim")
      .fill(
        new Date(new Date().setHours(18, 0, 0, 0)).toISOString().slice(0, 16),
      );
    await drawer.getByPlaceholder(/Motivo/i).fill("Plantão E2E");
    await drawer.getByRole("button", { name: "Adicionar" }).click();

    // Slot aparece na tabela do drawer com badge "Livre".
    await expect(drawer.getByText("Livre")).toBeVisible();
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
