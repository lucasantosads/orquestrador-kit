# ORIGEM

Harness importado do conteudos-infinitos em 2026-09-08 10:57.

- repo: lucasantosads/conteudos-infinitos
- commit: 711ab5e34a11bb927e8f11e034f3a14150685c40 (2026-09-08 09:56:44 -0300)
- arquivos: 81, 922098 bytes, listados abaixo (origem no CI -> destino no kit)
- script: scripts/kit/extrair-do-ci.sh (rodar de novo com --forcar para reimportar)

```
scripts/orquestrador/com.conteudos.orquestrador.plist.template -> scripts/orquestrador/com.conteudos.orquestrador.plist.template
scripts/orquestrador/decisao-cli.ts -> scripts/orquestrador/decisao-cli.ts
scripts/orquestrador/decisao.ts -> scripts/orquestrador/decisao.ts
scripts/orquestrador/diagnostico.ts -> scripts/orquestrador/diagnostico.ts
scripts/orquestrador/enforcement-core.ts -> scripts/orquestrador/enforcement-core.ts
scripts/orquestrador/enforcement.sh -> scripts/orquestrador/enforcement.sh
scripts/orquestrador/executor.sh -> scripts/orquestrador/executor.sh
scripts/orquestrador/fila-read.ts -> scripts/orquestrador/fila-read.ts
scripts/orquestrador/gate-ticket.ts -> scripts/orquestrador/gate-ticket.ts
scripts/orquestrador/gates.ts -> scripts/orquestrador/gates.ts
scripts/orquestrador/instalar-launchd.sh -> scripts/orquestrador/instalar-launchd.sh
scripts/orquestrador/juiz.ts -> scripts/orquestrador/juiz.ts
scripts/orquestrador/launchd-run.sh -> scripts/orquestrador/launchd-run.sh
scripts/orquestrador/lib.sh -> scripts/orquestrador/lib.sh
scripts/orquestrador/local-loop.sh -> scripts/orquestrador/local-loop.sh
scripts/orquestrador/lock.ts -> scripts/orquestrador/lock.ts
scripts/orquestrador/orq-pause.sh -> scripts/orquestrador/orq-pause.sh
scripts/orquestrador/perfil.ts -> scripts/orquestrador/perfil.ts
scripts/orquestrador/reparar-trilha.sh -> scripts/orquestrador/reparar-trilha.sh
scripts/orquestrador/test-drenagem.sh -> scripts/orquestrador/test-drenagem.sh
scripts/orquestrador/test-lib-config.sh -> scripts/orquestrador/test-lib-config.sh
scripts/orquestrador/test-preflight.sh -> scripts/orquestrador/test-preflight.sh
scripts/orquestrador/test-retry-worktree.sh -> scripts/orquestrador/test-retry-worktree.sh
scripts/orq -> scripts/orq
scripts/roadmap/lint-mapa.py -> scripts/roadmap/lint-mapa.py
docs/orquestrador/skill/CHANGELOG-v2.md -> doutrina/CHANGELOG-v2.md
docs/orquestrador/skill/EXECUTOR.md -> doutrina/EXECUTOR.md
docs/orquestrador/skill/SKILL.md -> doutrina/SKILL.md
docs/orquestrador/skill/references/autoalimentacao.md -> doutrina/references/autoalimentacao.md
docs/orquestrador/skill/references/custo-e-contexto.md -> doutrina/references/custo-e-contexto.md
docs/orquestrador/skill/references/fase-0-arquitetar.md -> doutrina/references/fase-0-arquitetar.md
docs/orquestrador/skill/references/ferramentas.md -> doutrina/references/ferramentas.md
docs/orquestrador/skill/references/fundacao.md -> doutrina/references/fundacao.md
docs/orquestrador/skill/references/observabilidade.md -> doutrina/references/observabilidade.md
docs/orquestrador/skill/references/pre-voo.md -> doutrina/references/pre-voo.md
docs/orquestrador/skill/references/setup.md -> doutrina/references/setup.md
docs/orquestrador/skill/templates/ADR.md -> doutrina/templates/ADR.md
docs/orquestrador/skill/templates/EXECUTOR.md -> doutrina/templates/EXECUTOR.md
docs/orquestrador/skill/templates/MAPA.md -> doutrina/templates/MAPA.md
docs/orquestrador/skill/templates/PLAYBOOK-seed.md -> doutrina/templates/PLAYBOOK-seed.md
docs/orquestrador/skill/templates/TICKET.md -> doutrina/templates/TICKET.md
docs/orquestrador/skill/templates/arquitetar.md -> doutrina/templates/arquitetar.md
docs/orquestrador/skill/templates/config.json -> doutrina/templates/config.json
docs/orquestrador/skill/templates/decisoes-pendentes.md -> doutrina/templates/decisoes-pendentes.md
docs/orquestrador/skill/templates/mapa.json -> doutrina/templates/mapa.json
docs/orquestrador/skill/templates/relatorio-promocao.md -> doutrina/templates/relatorio-promocao.md
docs/orquestrador/launchd.md -> docs/launchd.md
test/orq-cli.test.ts -> test/orq-cli.test.ts
test/orquestrador-agendamento.test.ts -> test/orquestrador-agendamento.test.ts
test/orquestrador-custo.test.ts -> test/orquestrador-custo.test.ts
test/orquestrador-decisao.test.ts -> test/orquestrador-decisao.test.ts
test/orquestrador-disparo-congelado.test.ts -> test/orquestrador-disparo-congelado.test.ts
test/orquestrador-enforcement.test.ts -> test/orquestrador-enforcement.test.ts
test/orquestrador-envelope.test.ts -> test/orquestrador-envelope.test.ts
test/orquestrador-gate-ticket.test.ts -> test/orquestrador-gate-ticket.test.ts
test/orquestrador-gates.test.ts -> test/orquestrador-gates.test.ts
test/orquestrador-isolamento-teste.test.ts -> test/orquestrador-isolamento-teste.test.ts
test/orquestrador-juiz.test.ts -> test/orquestrador-juiz.test.ts
test/orquestrador-liberacoes.test.ts -> test/orquestrador-liberacoes.test.ts
test/orquestrador-lock.test.ts -> test/orquestrador-lock.test.ts
test/orquestrador-morte-por-sinal.test.ts -> test/orquestrador-morte-por-sinal.test.ts
test/orquestrador-notificacao.test.ts -> test/orquestrador-notificacao.test.ts
test/orquestrador-observabilidade.test.ts -> test/orquestrador-observabilidade.test.ts
test/orquestrador-pausa-e-prompt.test.ts -> test/orquestrador-pausa-e-prompt.test.ts
test/orquestrador-prefixo-aspas.test.ts -> test/orquestrador-prefixo-aspas.test.ts
test/orquestrador-prompt-como-rodar.test.ts -> test/orquestrador-prompt-como-rodar.test.ts
test/orquestrador-refatiar.test.ts -> test/orquestrador-refatiar.test.ts
test/orquestrador-reparo-trilha.test.ts -> test/orquestrador-reparo-trilha.test.ts
test/orquestrador-tools-derivadas.test.ts -> test/orquestrador-tools-derivadas.test.ts
test/orquestrador-trilha-uma-linha.test.ts -> test/orquestrador-trilha-uma-linha.test.ts
test/orquestrador-trilha.test.ts -> test/orquestrador-trilha.test.ts
docs/fila/000-config.json -> _referencia-ci/000-config.ci.json
docs/fila/_TEMPLATE.md -> _referencia-ci/_TEMPLATE.ci.md
docs/orquestrador/PECAS.md -> _referencia-ci/PECAS.ci.md
docs/orquestrador/PLAYBOOK.md -> _referencia-ci/PLAYBOOK.ci.md
docs/roadmap/mapa.json -> _referencia-ci/mapa.ci.json
docs/roadmap/MAPA.md -> _referencia-ci/MAPA.ci.md
.gitignore -> _referencia-ci/gitignore.ci
package.json -> _referencia-ci/package.ci.json
tsconfig.json -> _referencia-ci/tsconfig.json
vitest.config.ts -> _referencia-ci/vitest.config.ts
```

## Adendo · 2026-09-08 · K2 (helpers de teste que ficaram no CI)

O extrator trouxe `test/*.test.ts` mas não os helpers que eles importam. Copiados
depois, do mesmo commit 711ab5e do conteudos-infinitos:

| origem no CI | destino no kit | blob sha (CI @711ab5e) |
|---|---|---|
| `test/fixtures/orq-harness.ts` | `test/fixtures/orq-harness.ts` | `db20a21a6532f994e6dc4f60505517b03aff5e44` |

Cópia byte-idêntica (`git hash-object` do kit == `git rev-parse 711ab5e:<path>` do
CI). O harness importa só `node:*`, então não arrastou mais nada do `test/` do CI.

`test/db.ts` NÃO entra no kit e não é pendência: não existe no CI. A string
`from './db.js'` que aparece em `test/orquestrador-enforcement.test.ts:300` é
conteúdo de um diff SINTÉTICO passado como argumento para o enforcement — não é
um import. Nenhuma linha de import do kit referencia `db.js`.
