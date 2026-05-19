#!/usr/bin/env node
// Bootstrap dos arquivos .env do projeto.
// Copia cada *.env.example mapeado abaixo para o .env correspondente,
// pulando se o destino já existir. Roda em qualquer plataforma (Windows/Linux/Mac).
//
// Uso:
//   pnpm setup          (executa esse script)
//   pnpm dev:all        (depende de pnpm setup)

import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), "..");

/** @type {Array<[string, string]>} pares [example, destino] */
const targets = [
  ["apps/api/.env.example", "apps/api/.env"],
  ["apps/web/.env.example", "apps/web/.env"],
];

let created = 0;
let skipped = 0;
let missing = 0;

for (const [example, dest] of targets) {
  const examplePath = resolve(root, example);
  const destPath = resolve(root, dest);

  if (!existsSync(examplePath)) {
    console.warn(`[setup-env] ⚠ ${example} não encontrado, pulando.`);
    missing++;
    continue;
  }
  if (existsSync(destPath)) {
    console.log(`[setup-env] ✓ ${dest} já existe — preservado.`);
    skipped++;
    continue;
  }
  copyFileSync(examplePath, destPath);
  console.log(`[setup-env] + ${dest} criado a partir de ${example}.`);
  created++;
}

console.log(
  `[setup-env] resumo: ${created} criado(s), ${skipped} preservado(s), ${missing} faltando.`,
);
