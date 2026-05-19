import { defineConfig } from "@playwright/test";

/**
 * Configuração do Playwright para testes E2E da Plataforma de Vistorias.
 *
 * Suposição: docker compose + migrations já rodaram. Em dev: `pnpm dev:all`.
 * Em CI: ver `.github/workflows/ci.yml` job `e2e`.
 *
 * A propriedade `webServer` inicia o `pnpm dev` automaticamente apontando
 * para o apps/api. Em CI rodamos `apps/api` em modo build, em dev local
 * reutilizamos qualquer servidor já em pé.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: process.env.CI
    ? {
        command: "pnpm --filter @vistoria/api start",
        url: "http://localhost:3000/v1/health",
        timeout: 120_000,
        reuseExistingServer: false,
      }
    : {
        command: "pnpm --filter @vistoria/api dev",
        url: "http://localhost:3000/v1/health",
        timeout: 120_000,
        reuseExistingServer: true,
      },
});
