import { test, expect, type Page } from "@playwright/test";

/**
 * E2E browser-based do card "Áreas de cobertura" em /users/:id (Sprint 24 FE).
 *
 * Pedido pendente do DOC Sprint 25 — entregue aqui pelo QI Sprint 26. Cobre o
 * caminho que o usuário valida visualmente: criar vistoriador → abrir detalhe
 * → cadastrar cobertura via UF + cidade (autocomplete IBGE) → ver na lista →
 * tentar duplicata → mensagem amigável.
 */

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

async function createVistoriadorViaUI(page: Page): Promise<string> {
  await page.goto(`${WEB_URL}/users/novo`);
  const email = uniqueEmail("cob-ui");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Nome completo").fill("Vistoriador Cobertura UI");
  await page.getByLabel("Senha (mínimo 8 caracteres)").fill("senha-forte-ui-1");
  // Garante providerId quando role é VISTORIADOR (Sprint 22 BE).
  const providerSelect = page.getByLabel(/Provider/i);
  if (await providerSelect.isVisible().catch(() => false)) {
    await providerSelect.selectOption("interno");
  }
  await page.getByRole("button", { name: "Criar usuário" }).click();
  await page.waitForURL(new RegExp(`${WEB_URL}/users/[0-9a-f-]+$`));
  return email;
}

test.describe("Cobertura geográfica — fluxo pelo navegador", () => {
  test("cadastra cobertura via autocomplete IBGE e vê na lista", async ({
    page,
  }) => {
    await loginThroughUI(page);
    await createVistoriadorViaUI(page);

    // O card "Áreas de cobertura" só aparece para VISTORIADOR.
    const card = page.getByRole("region", { name: /Áreas de cobertura/i });
    await expect(card).toBeVisible();

    // UF selecionada via select (IBGE populou as 27 UFs).
    await card.getByLabel(/UF/i).selectOption("SP");

    // Cidade: input com datalist IBGE. Digita "São Paulo" e confirma.
    const cidade = card.getByLabel(/Cidade/i);
    await cidade.fill("São Paulo");

    // Bairro livre.
    const bairro = card.getByLabel(/Bairro/i);
    if (await bairro.isVisible().catch(() => false)) {
      await bairro.fill("Pinheiros");
    }

    await card.getByRole("button", { name: /Adicionar/i }).click();

    // Cobertura aparece na lista sem reload.
    await expect(card.getByText("SP")).toBeVisible();
    await expect(card.getByText(/São Paulo/i)).toBeVisible();
  });

  test("bloqueia duplicata com mensagem amigável (não vaza 409)", async ({
    page,
  }) => {
    await loginThroughUI(page);
    await createVistoriadorViaUI(page);

    const card = page.getByRole("region", { name: /Áreas de cobertura/i });

    // 1ª cobertura SP (wide).
    await card.getByLabel(/UF/i).selectOption("SP");
    await card.getByRole("button", { name: /Adicionar/i }).click();
    await expect(card.getByText("SP")).toBeVisible();

    // Tenta SP/São Paulo — deveria ser bloqueado como redundante.
    await card.getByLabel(/UF/i).selectOption("SP");
    await card.getByLabel(/Cidade/i).fill("São Paulo");
    await card.getByRole("button", { name: /Adicionar/i }).click();

    // Mensagem amigável (não JSON cru). Aceita "redundante" ou "já cadastrad"
    // (case-insensitive). FE formata o 409 do BE de forma legível.
    const erro = card.getByText(/redundante|já cadastrad/i);
    await expect(erro).toBeVisible();
  });
});
