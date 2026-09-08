# Quarentena

Testes que vieram do harness do conteudos-infinitos e ainda não rodam no kit.
Nenhum foi afrouxado: as asserções estão intactas, só o caso está `it.skip` com o
motivo na linha acima. Sair da quarentena = a peça citada ficar pronta e o `skip`
voltar a ser `it`.

Regra: verde por afrouxamento não conta. Nada aqui perdeu asserção, trocou `toBe`
por `toBeDefined` nem foi apagado.

## Aberta

(nenhuma)

## Saíram da quarentena

Todas as 8 saíram com **K7b** (`67c485e`), pela mesma porta: o
`test/fixtures/orq-harness.ts` ganhou `checkoutReal()`, que instancia o repo de
fixture (`scripts/kit/fixture.sh`, peça K7a) uma vez por arquivo de teste e o
remove no `afterAll`. Os casos passaram a apontar para o motor **vendorizado
dentro do fixture** — onde existe `docs/fila` —, não para a cópia do kit.

Nenhuma asserção foi tocada. O que mudou em cada caso foi só o CAMINHO: qual
`lib.sh` é carregado, qual `cwd` o processo recebe, qual `docs/fila/runs` é lido.

### Balde 1 · exigiam um checkout com `docs/fila` no lugar onde o `lib.sh` mora

O `lib.sh` resolve a fila pelo diretório do PRÓPRIO arquivo
(`ROOT="${ORQ_EXEC_ROOT:-$(cd "$ORQ_LIB_DIR/../.." && pwd)}"`, `lib.sh:24`, e
`FILA_DIR="$MAIN_CHECKOUT/docs/fila"`, `lib.sh:42`). Rodar o motor a partir de
`<kit>/scripts/orquestrador/` fazia o kit ser o checkout — e o kit não tem fila.
Rodá-lo a partir de `<fixture>/scripts/orquestrador/` faz o fixture ser o
checkout, que é o cenário de verdade. **Zero mudança no motor.**

| Arquivo | Caso | O que passou a apontar para o fixture |
|---|---|---|
| `test/orquestrador-agendamento.test.ts` | `sem claude no PATH: rc 127 e mensagem com o PATH usado` | `rodarWrapper` executa `WRAPPER_FX` (a cópia do fixture) com `cwd` no fixture. A cópia do kit continua sendo lida como FONTE pelos casos que grepam o arquivo. |
| `test/orquestrador-isolamento-teste.test.ts` | `event fora de ORQ_EXEC_ROOT não chega à trilha real, e diz por quê` | `bashSemFixture` faz `source` do `lib.sh` do fixture, `cwd` no fixture. Continua SEM `ORQ_EXEC_ROOT` — o cenário do acidente é exatamente esse. |
| `test/orquestrador-isolamento-teste.test.ts` | `status_set fora do fixture não reescreve o STATUS real` | Idem; `STATUS_REAL` é o `runs/STATUS.md` do fixture. |
| `test/orquestrador-isolamento-teste.test.ts` | `custo_registrar fora do fixture não toca o ledger real` | Idem. |
| `test/orquestrador-isolamento-teste.test.ts` | `test-drenagem.sh: fixture recebe os eventos, produção não recebe nada` | Roda o `test-drenagem.sh` do fixture, que resolve `CHECKOUT_REAL` para o fixture (`test-drenagem.sh:22`) e acha o config em `:25,:29`. |

### Balde 2 · asseveravam sobre a fila / roadmap do repo INSTALADO

Dado local do repo alvo. Passaram a asseverar sobre o fixture, que é o repo
instalado deste kit. Nenhum virou tautologia: cada um continua podendo falhar.

| Arquivo | Caso | O que passou a apontar para o fixture, e por que ainda mede |
|---|---|---|
| `test/orquestrador-agendamento.test.ts` | `loga em docs/fila/runs/launchd.log, que o git ignora` | Lê `docs/fila/runs/.gitignore` do fixture. Falha de verdade se o `fixture.sh` parar de escrever esse arquivo — e a primeira asserção (o wrapper cita o caminho) continua sendo do motor. |
| `test/orquestrador-gates.test.ts` | `nenhum ticket da fila usa mais "main...HEAD" em critério de escopo` | `grep` em `docs/fila/*.md` do fixture. Exigiu que o ticket 001 ganhasse o critério de escopo na forma canônica (`git diff --name-only $BASE_REF...HEAD -- … \| wc -l \| tr -d ' '`, a mesma forma dos tickets reais do CI). A asserção negativa (`main...HEAD` em lugar nenhum) vale para a fila inteira do fixture, `_TEMPLATE.md` incluído. |
| `test/orquestrador-liberacoes.test.ts` | `lint-mapa.py passa sem WARN sobre liberações` | Roda o lint com `cwd` no fixture, que tem os cinco arquivos que ele abre (`scripts/roadmap/lint-mapa.py:2-4,97,117`). O check 10 lê `liberacao_ok` do `lib.sh` VENDORIZADO ali — se a vendorização levar um `lib.sh` que não consulta `.tokens`, o WARN aparece. |

## Fora do vitest, mesma causa — também saíram

`test-lib-config.sh`, `test-drenagem.sh` e `test-retry-worktree.sh` saíam com
rc 2 pelo mesmo motivo e agora saem rc 0, rodados a partir da cópia vendorizada
dentro do fixture. O encadeador é `scripts/kit/test-shell.sh`.

`test-preflight.sh` continua FORA: chama a API da Anthropic (sondagem paga).
Não é quarentena por defeito — é uma peça própria, com OK humano explícito.
