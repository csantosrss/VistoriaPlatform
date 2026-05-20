import { defineConfig } from "@playwright/test";

/**
 * Configuração do Playwright para testes E2E da Plataforma de Vistorias.
 *
 * - Em dev local: `pnpm dev:all` já levantou docker + apps; o config reusa.
 * - Em CI: `webServer[]` sobe `apps/api` (dist) e `apps/web` (vite dev com proxy).
 *
 * Por que `node dist/main.js` no CI ao invés de `nest start --watch`?
 * O modo --watch ocasionalmente reporta "Found 0 errors" sem subir o Node
 * (issue herdado do BE Sprint 07). `node dist/main.js` é determinístico.
 * Local em dev seguimos com `nest dev` por DX.
 *
 * Testes de UI navegam diretamente para `http://localhost:5173` — o `baseURL`
 * default aponta para o api (porta 3000) e cobre o caso usual (`request`).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: process.env.CI
    ? [
        {
          command:
            "pnpm --filter @vistoria/api build && pnpm --filter @vistoria/api start",
          url: "http://localhost:3000/v1/health",
          timeout: 180_000,
          reuseExistingServer: false,
        },
        {
          command: "pnpm --filter @vistoria/web dev",
          url: "http://localhost:5173",
          timeout: 120_000,
          reuseExistingServer: false,
        },
      ]
    : [
        {
          command: "pnpm --filter @vistoria/api dev",
          url: "http://localhost:3000/v1/health",
          timeout: 120_000,
          reuseExistingServer: true,
        },
        {
          command: "pnpm --filter @vistoria/web dev",
          url: "http://localhost:5173",
          timeout: 120_000,
          reuseExistingServer: true,
        },
      ],
});
