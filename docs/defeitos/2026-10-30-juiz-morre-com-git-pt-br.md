# Defeito: o juiz morre com o git em pt_BR

Origem: dashboard-comercial (clone `~/Projetos/dashboard-comercial-orq`), 30/10/2026, tickets 001 e 037 (base `2f8e6d1f`), consertado lá em `bfebb2e1` ("juiz lê a base com git em LC_ALL=C"). No kit, achado no fechamento da etapa L13: com a shell em `LANG=pt_BR.UTF-8` e sem `LC_ALL`, 3 testes do juiz falhavam na main (`fb1f98e`) e o `test-instalar.sh` caía no check (h3). Estado: **consertado na etapa L13, P6** (`9ba027e`). O dashboard já tem o seu.

## O que aconteceu

`juiz.ts:lerDaBase` lê o arquivo da base com `git show <base>:<path>` e decide "ausente na base" pelo texto do erro, com regex em inglês (`does not exist in|exists on disk, but not in`). Com o git em pt_BR a mensagem é `fatal: o caminho '<p>' não existe em '<base>'` (tradução do `git.mo`, conferida no git 2.56.0 desta máquina). O regex não casava, toda leitura de arquivo novo virava `Error: git show … falhou`, e o executor morria na fase de critérios depois dos gates verdes.

## Varredura do motor (grep por texto de saída ou erro do git)

| onde | o que lê | afetado? | destino |
|---|---|---|---|
| `scripts/orquestrador/juiz.ts:472` (`lerDaBase`) | `does not exist in`, `exists on disk, but not in` | sim | consertado: `LC_ALL=C`/`LANG=C` no `git show` e regex aceitando as duas línguas (porte do `bfebb2e1`) |
| `scripts/orquestrador/triador/leitor-legado-comarka.ts:177` | `overwritten by merge:` no log do loop do Comarka | sim: em pt_BR a linha é "Suas alterações locais … seriam substituídas pelo merge:" e o D1 sumia | consertado: regex aceita `substituíd[ao]s pelo merge:` (o log é do Comarka, o kit não controla o locale de quem escreveu) |
| `scripts/orquestrador/local-loop.sh:212` | linha `^fatal:` da saída do executor | não: o git mantém o prefixo `fatal:` em pt_BR (conferido) | nada |
| `scripts/orquestrador/decisao.ts:49` | `does not exist` do erro de modelo | não é git (CLI do claude) | nada |
| `merge_em_alvo` (`local-loop.sh`), `gate-ticket.ts` (`cat-file -t`, `rev-parse --verify`) | rc, não texto | não | nada |

Pendente: nenhum achado do grep ficou de fora. O motor não força locale em nenhuma outra chamada de git, mas as outras decidem por rc ou leem saída porcelana.

## Critério executável

- `test/orquestrador-contexto-juiz-fixtures.test.ts` (628 (a)(d) e (b)) e `test/orquestrador-juiz-citacoes.test.ts` (P3 001/0) passam com `LANG=pt_BR.UTF-8` e sem `LC_ALL`. Vermelho antes: `Error: git show …:test/fixtures/payloads.js falhou: fatal: o caminho 'test/fixtures/payloads.js' não existe em '…'`.
- `test/orquestrador-triador-extrair.test.ts`, "L13 P6": o caso 36-940 com a linha do git traduzida acha o mesmo `merge_recusado` que em inglês. Vermelho antes: `expected undefined to deeply equal [ Array(1) ]`.
