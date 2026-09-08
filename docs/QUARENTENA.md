# Quarentena

Testes que vieram do harness do conteudos-infinitos e ainda não rodam no kit.
Nenhum foi afrouxado: as asserções estão intactas, só o caso está `it.skip` com o
motivo na linha acima. Sair da quarentena = a peça citada ficar pronta e o `skip`
voltar a ser `it`.

Regra: verde por afrouxamento não conta. Nada aqui perdeu asserção, trocou `toBe`
por `toBeDefined` nem foi apagado.

## Aberta

### Balde 1 · exigem um checkout com `docs/fila` no lugar onde o `lib.sh` mora

O `lib.sh` resolve a fila pelo diretório do PRÓPRIO arquivo
(`ROOT="${ORQ_EXEC_ROOT:-$(cd "$ORQ_LIB_DIR/../.." && pwd)}"`, `lib.sh:24`, e
`FILA_DIR="$MAIN_CHECKOUT/docs/fila"`, `lib.sh:42`). Rodar o motor a partir de
`<kit>/scripts/orquestrador/` faz o kit ser o checkout — e o kit não tem fila.
Sai com **K7** (fixture de repo), não com mudança de motor.

| Arquivo | Caso | Motivo |
|---|---|---|
| `test/orquestrador-agendamento.test.ts` | `sem claude no PATH: rc 127 e mensagem com o PATH usado` | O wrapper faz `source lib.sh` antes do check de PATH; o source morre em `jq` (rc 2) por falta de `docs/fila/000-config.json`, então o rc 127 nunca chega. |
| `test/orquestrador-isolamento-teste.test.ts` | `event fora de ORQ_EXEC_ROOT não chega à trilha real, e diz por quê` | `bashSemFixture` faz `source lib.sh` SEM `ORQ_EXEC_ROOT` de propósito (é o cenário do acidente); sem config o `jq` morre antes do `escrita RECUSADA`. |
| `test/orquestrador-isolamento-teste.test.ts` | `status_set fora do fixture não reescreve o STATUS real` | Idem. |
| `test/orquestrador-isolamento-teste.test.ts` | `custo_registrar fora do fixture não toca o ledger real` | Idem. |
| `test/orquestrador-isolamento-teste.test.ts` | `test-drenagem.sh: fixture recebe os eventos, produção não recebe nada` | Roda `test-drenagem.sh` de verdade, que copia `$CHECKOUT_REAL/docs/fila/000-config.json` (`test-drenagem.sh:25,29`). |

### Balde 2 · asseveram sobre a fila / roadmap do repo INSTALADO

Dado local do repo alvo, não comportamento do motor. Também sai com **K7**, contra
o repo de fixture.

| Arquivo | Caso | Motivo |
|---|---|---|
| `test/orquestrador-agendamento.test.ts` | `loga em docs/fila/runs/launchd.log, que o git ignora` | Lê `docs/fila/runs/.gitignore` do repo instalado. A primeira asserção (o wrapper cita o caminho) é do motor e passa; a segunda é do repo. |
| `test/orquestrador-gates.test.ts` | `nenhum ticket da fila usa mais "main...HEAD" em critério de escopo` | `grep` em `docs/fila/*.md` — os tickets são do repo instalado. |
| `test/orquestrador-liberacoes.test.ts` | `lint-mapa.py passa sem WARN sobre liberações` | `lint-mapa.py` abre `docs/roadmap/mapa.json`, `docs/roadmap/MAPA.md`, `docs/fila/000-config.json`, `docs/fila/liberacoes.json` e `docs/fila/*.md` do repo instalado (`scripts/roadmap/lint-mapa.py:2-4,97,117`). |

## Fora do vitest, mesma causa

`test-lib-config.sh`, `test-drenagem.sh` e `test-retry-worktree.sh` saem com rc 2
pelo mesmo motivo. Não estão em `it.skip` (não são vitest); o que cada um exige
está no relatório da etapa 1 e em `docs/PECAS.md`, peça K7.

## Saíram da quarentena

(nenhum ainda)
