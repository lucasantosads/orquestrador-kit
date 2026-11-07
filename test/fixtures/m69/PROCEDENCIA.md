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

O config da fila do próprio kit fica fora: é pendência da etapa KF, que cria `docs/fila/` no kit.
