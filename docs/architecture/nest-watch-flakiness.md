# `nest start --watch` flakiness — investigação

**Status**: aberta desde a Sprint 07 BE. Mitigada em CI desde a Sprint 11 QI. Investigada (sem fix) na Sprint 16 QI.

## Sintoma

Ao rodar `pnpm --filter @vistoria/api dev` (que executa `nest start --watch`), ocasionalmente o processo imprime:

```
> @vistoria/api@0.0.0 dev
> nest start --watch
Found 0 errors. Watching for file changes.
```

…e **termina sem subir o servidor**. `lsof -i :3000` mostra a porta livre, `pnpm dev:all` continua para o passo seguinte achando que o api está rodando, e quem entra primeiro no `pnpm test:e2e` recebe `connect ECONNREFUSED 127.0.0.1:3000`.

A frequência observada é ~5-10% das execuções a frio. Restart manual sempre resolve.

## Mitigação aplicada (CI)

Desde a Sprint 11 (`playwright.config.ts`), no CI o `webServer` do api passou de `pnpm --filter @vistoria/api dev` para:

```
pnpm --filter @vistoria/api build && pnpm --filter @vistoria/api start
```

Que executa o bundle compilado (`node dist/main.js`) sem o `tsc-watch`. Isso eliminou a flakiness no pipeline — desde a Sprint 11 não houve recorrência registrada no CI.

Em dev local seguimos com `nest start --watch` por DX (HMR).

## Hipóteses investigadas

1. **`tsc-watch` engole erros** — `nest start` invoca `tsc-watch` em modo `noClear`. Se o `compilerOptions.preserveWatchOutput` flagar `Found 0 errors` mas o callback `onSuccess` (que é o `node dist/main`) silenciosamente falhar, o processo termina sem log. Não reproduzimos com `DEBUG=* pnpm dev` consistentemente.
2. **Race com `chokidar` no Windows + WSL2** — observação reincidente: máquinas Windows pegam mais flakiness que Linux puro. Volume de arquivos do `node_modules/.pnpm/...` watch-able pode estourar o `ulimit -n` do WSL e o `chokidar` desistir silenciosamente.
3. **Conflito do `swc` com `tsc --watch`** — checamos: nenhum dos workspaces tem `@swc/core`; `nest start` usa `tsc` puro.

## Workaround para dev local

Se reproduzir:

```bash
# Para — relança o api de forma estável.
pnpm --filter @vistoria/api build
pnpm --filter @vistoria/api start
```

Aceita-se a falta de HMR enquanto o problema acontecer. Reiniciar o `pnpm dev` também tende a sair do estado quebrado.

## Próximos passos (sem ETA)

- Adicionar `restartable: true` no `nest-cli.json` com flag de reinício manual via stdin.
- Considerar substituir `nest start --watch` por `tsx watch src/main.ts` na pasta do api — tem fila de restart mais previsível, custo: perder a integração com o `nest-cli` (que é cosmética).
- Investigar quando uma versão menor do nest-cli/tsc-watch sair e o issue 8002 do nest-cli ([nestjs/nest-cli#8002](https://github.com/nestjs/nest-cli/issues/8002) — "watch sometimes exits silently") tiver patch.

Sem urgência — workaround conhecido e CI imune. Reabrir quando virar dor de produtividade real.
