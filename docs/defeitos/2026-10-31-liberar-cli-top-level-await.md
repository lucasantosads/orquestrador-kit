# Defeito: `orq liberar` morre em repo sem `"type": "module"`

Origem: dashboard-comercial, consertado lá em `a015c150` ("fix(orq): liberar-cli sem top-level await", 28/10/2026). A fila do actus-saas também registrou o sintoma ("Gravado com jq: orq liberar ainda falha (top-level await no liberar-cli.ts)", `test/fixtures/triador-sem-tentativa/actus-1110/docs/fila/liberacoes.json:8`). Estado: **consertado na etapa L13b, P1** (`3d8d114`); o pendente do `migrations/cli.ts` **consertado na etapa L14, P4** (`a229f34`). O próximo `--atualizar` não devolve mais o bug ao dashboard.

## O que aconteceu

`orq liberar` roda `scripts/orquestrador/liberar-cli.ts` pelo `tsx`. O `tsx` escolhe o formato pelo `package.json` mais próximo: sem `"type": "module"` (o caso do dashboard) o arquivo vira CJS, e o `const { writeFileSync } = await import('node:fs')` dentro do `if (chamadoComoCli())` (kit `liberar-cli.ts:126`) é top-level await. O esbuild recusa a transformação e o CLI morre antes da primeira linha:

```
ERROR: Top-level await is currently not supported with the "cjs" output format
```

## Por que nenhum teste do kit pegou

- `package.json:5` do kit e `fixture/package.json:5` têm `"type": "module"`: tudo que o kit roda pelo `tsx` é ESM.
- `test/orquestrador-liberar-migrar.test.ts` importa `liberar()` como função (linha 20, só a decisão pura) e roda o verbo por `scripts/orq` (`orq()` do harness), que chama o `liberar-cli.ts` do próprio kit, sob o `package.json` do kit.
- `test-instalar.sh` e `test-shell.sh` não chamam `orq liberar`.

## Varredura (esbuild `--format=cjs` em todo `scripts/orquestrador/**/*.ts`)

| onde | afetado? | destino |
|---|---|---|
| `scripts/orquestrador/liberar-cli.ts:126` | sim | consertado: `writeFileSync` no import estático (porte do `a015c150`, mesmos blobs `6c84d25..2989728`) |
| `scripts/orquestrador/migrations/cli.ts:176` (`process.exit(await main(...))`) | sim, mesmo erro | consertado na L14-P4 (`a229f34`): `void main(...).then((rc) => process.exit(rc))` |

Nenhum outro arquivo falha a transformação em CJS.

## Critério executável

- `test/orquestrador-liberar-migrar.test.ts`, "orq liberar: num repo instalado sem \"type\": \"module\"": copia `scripts/orquestrador` para um tmp com `package.json` sem `type`, roda o `liberar-cli.ts` pelo `tsx` e espera rc 0, `LIBERADO humano:migration-0025` e o token no arquivo. Vermelho antes: `ERROR: Top-level await is currently not supported with the "cjs" output format` (stderr do `tsx`).
- `migrations/cli.ts` (L14-P4): "orq migrations também roda como CJS", no mesmo describe, roda o `migrations/cli.ts` sem verbo pelo `tsx` num tmp sem `type` e espera rc 2, `[orq migrations] falta o verbo` e nenhum `Top-level await` no stderr. Vermelho antes: `migrations/cli.ts:176:74: ERROR: Top-level await is currently not supported with the "cjs" output format`. Nova varredura do esbuild `--format=cjs` nos 64 `.ts` de `scripts/` (L14, PASSO 0): só este arquivo falhava.
