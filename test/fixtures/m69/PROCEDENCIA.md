# test/fixtures/m69: procedência (etapa M69, 07/11/2026)

Copiadas só com leitura (`GIT_OPTIONAL_LOCKS=0 git show HEAD:<caminho>`), byte a byte. Conferi com `cmp` que a cópia é igual ao working tree de cada repo.

| arquivo | origem | cksum |
|---|---|---|
| `config-comarka.json` | comarka-operacional `d234e07`, `docs/fila/000-config.json` | `3794107889 8065` |
| `config-ci.json` | conteudos-infinitos `e1541e2`, `docs/fila/000-config.json` | `2955789644 34521` |
| `config-dashboard.json` | dashboard-comercial-orq `29820bf9`, `docs/fila/000-config.json` | `141491498 30498` |
| `baseline-tsc-dashboard.json` | dashboard-comercial-orq `29820bf9`, `docs/orquestrador/baseline-tsc.json` (o `baseline_arquivo` do gate typecheck) | — |
| `config-comarka-migrado.json` | `config-comarka.json` passado por `scripts/orquestrador/migrar-config.ts --propor` do kit `ee8c4a7` | — |

Por que o Comarka vai migrado: o config dele roda hoje no motor legado de lá e não tem `_execucao_dos_gates`, então o `gates.ts` do kit não roda sobre o cru. O proposto pelo migrador tem os gates de lá iguais (com `tsc_baseline` → `baseline`) e a ordem derivada. É a forma que o config vai ter depois do corte do C-0052. Os placeholders que o migrador deixa (orçamento, juiz, launchd) não entram em gate, prompt nem tools.

`ouro/`: as saídas do motor `ee8c4a7` (antes da M69) com esses configs, gravadas por `M69_GRAVAR_OURO=1 vitest run test/orquestrador-selecao-ouro.test.ts` antes de qualquer mudança em `scripts/`:

- `<repo>-prompt.txt` e `<repo>-tools.txt`: prompt e `--allowedTools` de uma tentativa real (`run_attempt`, com o `claude_run` interceptado);
- `<repo>-{verde,vermelho}-gates.txt`, `-gate-falha.txt` e `-chamadas.txt`: `gates.ts --run-cli` com os comandos em stub. A saída de vitest é real (`test/fixtures/instavel-l11`). Os `ms` saem normalizados.

Etapa KF (M-68): o `kit` de `CONFIGS` é o config vivo da fila do kit, `docs/fila-kit/000-config.json` (sem cópia). Os `kit-*.txt` do `ouro/` foram gravados num clone descartável no commit `ee8c4a7` (motor anterior à M69), com este harness, este teste e esse config copiados para dentro, por `M69_GRAVAR_OURO=1 vitest run test/orquestrador-selecao-ouro.test.ts -t kit`. Os gates `shell` e `instalar` chamam `bash scripts/kit/*.sh`: o checkout de papel ganha esses dois scripts como stub (o mesmo dos outros comandos), verdes nos dois cenários; o vermelho é o do vitest. Mudar esse config regrava os `kit-*.txt`.

## diffs-comarka/ (P2)

`GIT_OPTIONAL_LOCKS=0 git diff --name-status <sha>^1 <sha>` no comarka-operacional, só leitura. Nos merges `frente/<id>`, o primeiro pai é a `staging-auto` antes do ticket, então o diff é o do ticket.

| arquivo | sha | o que é |
|---|---|---|
| `src-1008.ns` | `aab851b` | merge do ticket 1008: uma rota em src e um teste novo |
| `docs-1023.ns` | `f5a0fee` | merge do ticket 1023: só um doc |
| `migration-1012.ns` | `cdf7249` | merge do ticket 1012: só uma migration |
| `apaga-1016.ns` | `2c7b887` | merge do ticket 1016: apaga 6 scripts da raiz e cria um teste |
| `package-022aac1.ns` | `022aac1` | commit de dependência: package.json e package-lock.json |
| `fixture-c4409dc.ns` | `c4409dc` | commit que muda `test/fixtures/ghl-escopos-app.txt` |
| `helper-4009a64.ns` | `4009a64` | commit que cria `test/helpers/carregar-tsx.ts` |
| `renomeia-823ad7a.ns` | `823ad7a` | commit que renomeia uma migration (R100) |
