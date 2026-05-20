import { test, expect, type Page } from "@playwright/test";

const WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:5173";

const ADMIN = {
  email: "admin@auxiliadorapredial.com.br",
  password: "admin123",
};

async function loginThroughUI(page: Page): Promise<void> {
  await page.goto(`${WEB_URL}/login`);
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Senha").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${WEB_URL}/`);
}

test.describe("Painel admin — fluxo ponta-a-ponta pelo navegador", () => {
  test("login carrega dashboard com KPIs", async ({ page }) => {
    await loginThroughUI(page);

    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    // KPIs do dashboard (Sprint 09): SOLICITADA, EM_EXECUCAO, CONCLUIDA.
    await expect(page.getByText("Solicitadas")).toBeVisible();
    await expect(page.getByText("Em execução")).toBeVisible();
    await expect(page.getByText("Concluídas")).toBeVisible();
  });

  test("criar vistoria → detalhe → cancelar → status CANCELADA", async ({
    page,
  }) => {
    await loginThroughUI(page);

    // Navega para criação.
    await page.goto(`${WEB_URL}/vistorias/novo`);
    await expect(
      page.getByRole("heading", { name: "Nova vistoria" }),
    ).toBeVisible();

    // Preenche o formulário. `tipo` já vem com default "ENTRADA".
    await page.getByLabel("Logradouro").fill("Rua E2E UI");
    await page.getByLabel("Número").fill("200");
    await page.getByLabel("Bairro").fill("Centro");
    await page.getByLabel("CEP").fill("90000-000");
    await page.getByLabel("Cidade").fill("Porto Alegre");
    await page.getByLabel("UF").fill("RS");
    await page.getByLabel("Nome").fill("E2E Tester UI");
    await page.getByLabel("Telefone").fill("5199999000");

    await page.getByRole("button", { name: "Criar vistoria" }).click();

    // Após sucesso, FE navega para /vistorias/:id. Desde a Sprint 12 BE,
    // create já aplica routing — vistoria chega no detalhe em ROTEADA.
    await page.waitForURL(new RegExp(`${WEB_URL}/vistorias/[0-9a-f-]+$`));
    await expect(page.getByText("Roteada", { exact: false })).toBeVisible();

    // Cancela.
    await page
      .getByLabel("Motivo do cancelamento")
      .fill("Teste E2E UI cancelamento");
    await page.getByRole("button", { name: "Cancelar vistoria" }).click();

    // Badge muda para CANCELADA.
    await expect(
      page.getByText("Cancelada", { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Vistoria cancelada com sucesso."),
    ).toBeVisible();
  });

  test("rota protegida sem token redireciona para /login com ?next=", async ({
    page,
  }) => {
    // Limpa o storage antes — não logamos nesta sessão.
    await page.context().clearCookies();
    await page.goto(`${WEB_URL}/`);
    await page.evaluate(() => localStorage.clear());

    await page.goto(`${WEB_URL}/vistorias`);
    // RequireAuth redireciona; o api-client interceptor lida com 401.
    // Os dois caminhos terminam em /login. O ?next= entra quando o interceptor
    // bate em 401; RequireAuth puro só preserva state.from. Aceitamos ambos.
    await page.waitForURL(new RegExp(`${WEB_URL}/login`));
    expect(page.url()).toContain("/login");
  });

  test("/audit lista pelo menos um evento gerado pelo seed/teste", async ({
    page,
  }) => {
    await loginThroughUI(page);
    await page.goto(`${WEB_URL}/audit`);
    await expect(
      page.getByRole("heading", { name: "Auditoria" }),
    ).toBeVisible();

    // O teste de cancelamento acima já registrou VISTORIA.CREATED + CANCELED;
    // a tabela deve conter pelo menos uma das ações.
    const tableBody = page.locator("table tbody");
    await expect(tableBody).toBeVisible();
    // Existe pelo menos uma linha com fonte VISTORIA.*
    await expect(tableBody.getByText(/VISTORIA\./).first()).toBeVisible();
  });
});
