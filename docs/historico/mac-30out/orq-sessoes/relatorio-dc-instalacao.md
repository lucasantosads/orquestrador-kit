# ADOCAO-DASHBOARD, INSTALAÇÃO: relatório (22/10/2026)

Kit `~/Projetos/orquestrador-kit` main `a001fde` (VERSAO `2.1.0-dev`), só leitura. Comarka `c16e2b8`, só leitura (`GIT_OPTIONAL_LOCKS=0`, só `show`, `grep` e `rev-parse`).
Cópia de ensaio `~/Projetos/_ensaio/dc-novo` (main `072b62ec`). Worktree `~/Projetos/_worktrees/dc-instalacao`, branch `orq/instalacao`, base `072b62e`.
O loop não rodou. Nesta sessão não houve launchctl, push, merge, npm install, `claude -p`, API nem banco.

## 0. Resumo

| Prova (worktree, árvore final) | Resultado |
|---|---|
| `--novo` | rc 0, mesma saída da cópia (só muda o bloco do `orq config`, ver §3) |
| `config-cli.ts docs/fila/000-config.json` | **0 violações**, rc 0 |
| tsc (`error TS` fora de `.next/`) | **245** (gate ≤ 246). São os mesmos 245 da base de antes do `--novo`, provado com diff da lista |
| vitest (suíte padrão) | **rc 0**: 115 arquivos, 1433 testes |
| vitest `test/orquestrador-*` | rc 0: 18 de 19 arquivos (o `arquivo-solto` está excluído), 176 testes |
| build (o `cmd` do gate, via `bash -c`, sem `.env`) | **rc 0**, `✓ Generating static pages (278/278)` |
| `instalar.sh --verificar` | **rc 0**, `idêntico ao kit 2.1.0-dev` |
| árvore depois dos commits | `git status --short \| wc -l` → `0` |
| `.env*` | só `./.env.example`, versionado, com todos os segredos vazios (§2.4) |

Foram 4 commits, não 3. O quarto (exclusão de 1 teste no `vitest.config.ts` e pendência no PLAYBOOK) foi autorizado pelo Lucas no meio da sessão, opção 3 com condições (§1.3).

Três achados do ensaio mudaram o config ou o repo:
1. **`restricao_execucao` é obrigatória e o template não traz.** Sem ela, todo `drive_ticket` sai RECUSADO (§1.2).
2. **O build sem `.env` falha.** O gate passou a levar 3 variáveis Supabase fictícias (§1.4).
3. **Um teste de harness do kit crava valores do CI.** Ele foi excluído do vitest, sozinho (§1.3).

## 1. Passo A, ensaio na cópia

### 1.1 Sequência e rc

| # | Passo | rc / resultado |
|---|---|---|
| 1 | tsc antes do `--novo` | 245 |
| 2 | `bash instalar.sh --novo ~/Projetos/_ensaio/dc-novo` | rc 0 (template com 26 violações, como previsto) |
| 3 | config final copiado; `bash scripts/orq config` | 0 violações |
| 4 | tsc | **246**, +1: `scripts/orquestrador/gate-ticket.ts(520,7): error TS2769`. O arquivo entra pelo import dos testes de harness, e o exclude `scripts` não segura arquivo puxado por import |
| 5 | L5 disparou (246 > 245): exclude `test/orquestrador-*` e `test/fixtures/**` no tsconfig | tsc 245, diff da lista contra o passo 1: idêntico |
| 6 | vitest | **rc 1**: 8 falhas em 3 arquivos de harness |
| 7 | causa: `restricao_execucao` ausente (§1.2); chave acrescentada | vitest rc 1: 2 falhas, ambas em `arquivo-solto` |
| 8 | causa: teste crava valores do CI (§1.3); pergunta ao Lucas; exclusão de 1 arquivo | vitest rc 0, 115 arquivos e 1433 testes; `orquestrador-*` 18/18 e 176 testes |
| 9 | build sem `.env` | **rc 1**: `Error: supabaseUrl is required` em `/api/admin/auditoria-comissao` |
| 10 | gate de build com 3 variáveis fictícias (§1.4) | rc 0, 278/278 páginas |
| 11 | `--verificar` | rc 0, `idêntico ao kit 2.1.0-dev` |

`git status --short` da cópia no fim:

```
 M .gitignore
 M tsconfig.json
 M vitest.config.ts
?? docs/fila/
?? docs/orquestrador/PECAS.md
?? docs/orquestrador/skill/
?? docs/roadmap/
?? scripts/orq
?? scripts/orquestrador/
?? scripts/roadmap/
?? test/
```

### 1.2 `restricao_execucao`: obrigatória para o motor, ausente no template, invisível para o `orq config`

O harness lê o config vivo do repo (`test/fixtures/orq-harness.ts:113-117`). Os 8 testes falharam do mesmo jeito com o config final e com o template cru. Com o config do fixture do kit (o do CI), os 3 arquivos passaram 14/14. Reproduzi a drenagem do teste à mão:

```
scripts/orquestrador/decisao.ts:75
  if (!r.ativa || pendentes.length === 0) return { permitido: true, exitCode: 0 }
TypeError: Cannot read properties of undefined (reading 'ativa')
    at avaliaRestricaoExecucao (decisao.ts:75:10)
    at decisao-cli.ts:56:15
[orq 20:16:40] RECUSADO (1):
```

`executor.sh` chama `decisao restricao` a cada ticket. Sem o objeto, **todo ticket real seria RECUSADO**, não só o de teste. O config do CI já documenta esse caso no campo `_porque_a_chave_continua_aqui`. O conserto foi só de config: o objeto entra com `ativa: false`, `tickets_permitidos: []`, `recusa_exit_code: 78` e a `recusa_mensagem` do CI. Depois disso, 6 das 8 falhas sumiram.

### 1.3 `test/orquestrador-arquivo-solto.test.ts` crava o config do CI

As 2 falhas que sobraram:

```
:156  {"ok":false,"violations":[{"tipo":"fora_do_pathspec","detalhe":"rascunho.sql"}]}: expected false to be true
:219  expected '... RETRY attempt=2 model=claude-sonnet-5-5 motivo=arquivo_solto ...' to contain 'model=sonnet'
```

- `:149-156` espera que `insert into public.leads` viole a zona proibida. No CI, `no_write_tables` é `"TODAS"`; aqui são 81 nomes, e `leads` não está entre eles.
- `:219` espera `model=sonnet` literal, e o L6 trocou para ID completo.

Controle negativo, saída crua:

```
modelos→aliases + no_write_tables "TODAS":  controle_ci_rc=0   Tests 6 passed (6)
só no_write_tables "TODAS":                 so_zona_rc=1       × ... mantém o modelo ... (1 failed | 5 passed)
config final restaurado:                    cmp → config_final_restaurado
```

Nenhum script lê `testes_quarentena` (grep vazio em `scripts/`), então não havia saída pelo config. Perguntei ao Lucas e ele escolheu a opção 3 com estas condições, todas cumpridas:

1. Excluir só esse arquivo no `vitest.config.ts`, sem glob. Ver o diff no commit `46e9f44`.
2. Fazer commit separado, citando o defeito do kit: `46e9f44`.
3. Antes do commit, provar que o `--verificar` segue rc 0 e que os outros `orquestrador-*` passam. Na worktree, antes do commit 4: `verificar_rc=0`; `ls test/orquestrador-*.test.ts | wc -l` → 19; `vitest run test/orquestrador-` → `Test Files 18 passed (18)`, `Tests 176 passed (176)`; `grep -c arquivo-solto` na saída → 0.
4. Registrar no relatório (aqui e no §6) e no fim do `docs/orquestrador/PLAYBOOK.md` ("Pendência (22/10/2026) — teste vendorizado `arquivo-solto` assume o config do CI").

### 1.4 Build sem `.env`

Sem variáveis, `next build` sai 1 ao coletar dados de página: `/api/admin/auditoria-comissao` cria o cliente Supabase no import do módulo. Consertar no app (cliente criado sob demanda) é mudança de código e ficou fora. O gate agora leva valores **fictícios, não secretos**, só das 3 chaves que `src/` lê (`NEXT_PUBLIC_SUPABASE_URL` 368×, `SUPABASE_SERVICE_ROLE_KEY` 362×, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 2×):

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=build-sem-env SUPABASE_SERVICE_ROLE_KEY=build-sem-env node_modules/.bin/next build
```

A porta 9 em localhost é inalcançável. O gate prova que o app compila, não que funciona em runtime. O controle negativo é o passo 9 (rc 1). **Confirmar com o Lucas.**

## 2. Passo B, instalação real nesta worktree

### 2.1 Lugar

```
pwd                         /Users/lucasantos/Projetos/_worktrees/dc-instalacao
git rev-parse --show-toplevel  /Users/lucasantos/Projetos/_worktrees/dc-instalacao
branch                      orq/instalacao      HEAD 072b62e      status 0 linhas
node_modules vs package-lock.json: lock_pkgs 827 ausentes_nao_opcionais 0 versao_diferente 0
```

### 2.2 Saída crua das provas (árvore final, antes dos commits 2-4 e de novo depois)

```
tsc_rc=2
tsc_erros_fora_next=245
MESMOS_245_DA_BASE_PRE_NOVO        # diff contra a cópia antes do --novo, caminho absoluto normalizado
CONFIG   /Users/lucasantos/Projetos/_worktrees/dc-instalacao/docs/fila/000-config.json
0 violações — o config está preenchido e as chaves que o motor lê estão lá.
config_rc=0
verificar_rc=0
VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
           repo /Users/lucasantos/Projetos/_worktrees/dc-instalacao
carimbo    2.1.0-dev
idêntico ao kit 2.1.0-dev
arquivos test/orquestrador-*.test.ts:       19
vitest_orq_rc=0
 Test Files  18 passed (18)
      Tests  176 passed (176)
arquivo-solto rodou? 0
vitest_rc=0
 Test Files  115 passed (115)
      Tests  1433 passed (1433)
build_rc=0
 ✓ Generating static pages (278/278)
--- depois dos 4 commits ---
verificar_final_rc=0
git status --short | wc -l → 0
config_commitado_igual_ao_final    # git show HEAD:docs/fila/000-config.json | cmp - <config final>
```

Contagens da suíte: antes do `--novo`, 97 arquivos e 1257 testes (sessão anterior). Com o harness, 116 e 1439. Com a exclusão, 115 e 1433 (saíram 1 arquivo e 6 testes).

### 2.3 `orq config` numa worktree valida o checkout principal

No `--novo` da worktree, o `orq config` final imprimiu:

```
CONFIG   /Users/lucasantos/Projetos/dashboard-comercial/docs/fila/000-config.json
ilegível: ENOENT: no such file or directory
```

Isso é por desenho (`scripts/orq:82-84`, raiz via `--git-common-dir`): o loop roda no checkout principal. Por isso validei a worktree chamando direto `node_modules/.bin/tsx scripts/orquestrador/config-cli.ts <worktree>/docs/fila/000-config.json`. Nada foi escrito em `~/Projetos/dashboard-comercial`: `docs/fila` continua inexistente lá, e o `config-cli` só lê.

### 2.4 `.env*`

```
$ find . -name '.env*' -not -path './node_modules/*' -not -path './.git/*'
./.env.example
$ git ls-files | grep -E '(^|/)\.env'
.env.example
```

Todos os segredos do `.env.example` estão vazios (`len=0`). Só 3 chaves têm valor e nenhuma é segredo: `NEXT_PUBLIC_SUPABASE_URL` (31 chars), `ASAAS_BASE_URL` (28) e `ASAAS_ENV` (10). Nenhum valor tem prefixo de token (`eyJ`, `sk-`, `EAA`, `pk_`, `ghp_`). Não existe `.env`, `.env.local` nem outro `.env*`.

## 3. Git

```
$ git log --oneline origin/main..HEAD
46e9f44 vitest: exclui test/orquestrador-arquivo-solto.test.ts (defeito do kit)
795ca9f tsconfig: exclui test/orquestrador-* e test/fixtures/** (L5)
e417beb fila: config final do dashboard-comercial (L1-L11)
9c44b85 orquestrador: instalação inicial, kit 2.1.0-dev (--novo)
```

`git diff --stat origin/main..HEAD`, saída inteira:

```
 .gitignore                                         |    5 +
 docs/fila/000-config.json                          |  492 +++++
 docs/fila/_TEMPLATE.md                             |  112 ++
 docs/fila/decisoes-pendentes.md                    |    8 +
 docs/fila/liberacoes.json                          |    4 +
 docs/fila/rascunhos/.gitkeep                       |    0
 docs/orquestrador/PECAS.md                         |   42 +
 docs/orquestrador/PLAYBOOK.md                      |   17 +
 docs/orquestrador/skill/CHANGELOG-v2.md            |   25 +
 docs/orquestrador/skill/EXECUTOR.md                |   29 +
 docs/orquestrador/skill/SKILL.md                   |  260 +++
 docs/orquestrador/skill/VERSAO                     |    1 +
 .../skill/references/autoalimentacao.md            |  203 ++
 .../skill/references/custo-e-contexto.md           |  100 +
 .../skill/references/fase-0-arquitetar.md          |   86 +
 docs/orquestrador/skill/references/ferramentas.md  |   37 +
 docs/orquestrador/skill/references/fundacao.md     |   55 +
 .../skill/references/higiene-de-execucao.md        |   82 +
 .../skill/references/observabilidade.md            |  129 ++
 docs/orquestrador/skill/references/pre-voo.md      |   63 +
 docs/orquestrador/skill/references/setup.md        |  156 ++
 docs/orquestrador/skill/templates/ADR.md           |   19 +
 docs/orquestrador/skill/templates/EXECUTOR.md      |   29 +
 docs/orquestrador/skill/templates/MAPA.md          |   29 +
 docs/orquestrador/skill/templates/PECAS-seed.md    |   42 +
 docs/orquestrador/skill/templates/PLAYBOOK-seed.md |  164 ++
 docs/orquestrador/skill/templates/TICKET.md        |  112 ++
 docs/orquestrador/skill/templates/arquitetar.md    |   18 +
 docs/orquestrador/skill/templates/config.json      |  349 ++++
 .../skill/templates/decisoes-pendentes.md          |    8 +
 docs/orquestrador/skill/templates/mapa.json        |   39 +
 .../skill/templates/relatorio-promocao.md          |   40 +
 docs/roadmap/MAPA.md                               |   29 +
 docs/roadmap/mapa.json                             |   39 +
 scripts/orq                                        |  490 +++++
 scripts/orquestrador/campos-do-motor.json          |    1 +
 .../orquestrador/com.orquestrador.plist.template   |   78 +
 scripts/orquestrador/config-chaves.ts              |  132 ++
 scripts/orquestrador/config-cli.ts                 |  254 +++
 scripts/orquestrador/config-tabela.ts              |  472 +++++
 scripts/orquestrador/decisao-cli.ts                |  156 ++
 scripts/orquestrador/decisao.ts                    |  894 +++++++++
 scripts/orquestrador/diagnostico.ts                |  289 +++
 scripts/orquestrador/enforcement-core.ts           |  855 +++++++++
 scripts/orquestrador/enforcement.sh                |   74 +
 scripts/orquestrador/executor.sh                   | 1862 ++++++++++++++++++
 scripts/orquestrador/fila-read.ts                  |  105 +
 scripts/orquestrador/gate-ticket.ts                | 2030 ++++++++++++++++++++
 scripts/orquestrador/gates.ts                      |  371 ++++
 scripts/orquestrador/instalar-launchd.sh           |  192 ++
 scripts/orquestrador/juiz.ts                       |  624 ++++++
 scripts/orquestrador/launchd-run.sh                |  152 ++
 scripts/orquestrador/lib.sh                        | 1620 ++++++++++++++++
 scripts/orquestrador/liberacoes-core.ts            |  257 +++
 scripts/orquestrador/liberar-cli.ts                |  133 ++
 scripts/orquestrador/local-loop.sh                 |  860 +++++++++
 scripts/orquestrador/lock.ts                       |   40 +
 scripts/orquestrador/migrar-comum.ts               |  125 ++
 scripts/orquestrador/migrar-config.ts              |  384 ++++
 scripts/orquestrador/migrar-liberacoes.ts          |  190 ++
 scripts/orquestrador/migrar-tickets.ts             |  237 +++
 scripts/orquestrador/migrations/aplicar.ts         |  187 ++
 scripts/orquestrador/migrations/arquivos.ts        |   48 +
 scripts/orquestrador/migrations/caminhos.ts        |   75 +
 scripts/orquestrador/migrations/cli.ts             |  176 ++
 scripts/orquestrador/migrations/config.ts          |  210 ++
 scripts/orquestrador/migrations/liberacao.ts       |  116 ++
 scripts/orquestrador/migrations/plano.ts           |  121 ++
 scripts/orquestrador/migrations/sql.ts             |  187 ++
 scripts/orquestrador/migrations/supabase.ts        |  153 ++
 scripts/orquestrador/orq-painel.py                 | 1504 +++++++++++++++
 scripts/orquestrador/orq-pause.sh                  |   54 +
 scripts/orquestrador/perfil.ts                     |  329 ++++
 scripts/orquestrador/prevoo.ts                     |  485 +++++
 scripts/orquestrador/reparar-trilha.sh             |   87 +
 scripts/orquestrador/resolvedor/acoes.ts           |  240 +++
 scripts/orquestrador/resolvedor/caminhos.ts        |  130 ++
 scripts/orquestrador/resolvedor/cli.ts             |   58 +
 .../resolvedor/com.orq.resolvedor.plist.template   |   48 +
 scripts/orquestrador/resolvedor/decidir.ts         |   56 +
 scripts/orquestrador/resolvedor/desfazer.ts        |   68 +
 scripts/orquestrador/resolvedor/desfecho.ts        |  206 ++
 scripts/orquestrador/resolvedor/diff.ts            |   38 +
 scripts/orquestrador/resolvedor/gate-streak.ts     |  223 +++
 scripts/orquestrador/resolvedor/humano.ts          |   66 +
 scripts/orquestrador/resolvedor/instalar-job.sh    |  110 ++
 scripts/orquestrador/resolvedor/job.sh             |   39 +
 scripts/orquestrador/resolvedor/ledger.ts          |   55 +
 scripts/orquestrador/resolvedor/modos.ts           |  155 ++
 scripts/orquestrador/resolvedor/passada.ts         |  262 +++
 scripts/orquestrador/resolvedor/pausa.ts           |  213 ++
 scripts/orquestrador/resolvedor/promocao.ts        |   76 +
 scripts/orquestrador/resolvedor/r1.ts              |  197 ++
 scripts/orquestrador/resolvedor/r2.ts              |  225 +++
 scripts/orquestrador/resolvedor/r5.ts              |   74 +
 scripts/orquestrador/resolvedor/repo.ts            |  235 +++
 scripts/orquestrador/resolvedor/sobreposicao.ts    |  104 +
 scripts/orquestrador/resolvedor/ticket-md.ts       |  230 +++
 scripts/orquestrador/test-adiamentos-limite.sh     |  144 ++
 scripts/orquestrador/test-ambiente-adiado.sh       |  117 ++
 scripts/orquestrador/test-ambiente.sh              |  216 +++
 scripts/orquestrador/test-causa-adiamento.sh       |  122 ++
 scripts/orquestrador/test-criterio-isolado.sh      |   93 +
 scripts/orquestrador/test-diff-lines.sh            |   59 +
 .../orquestrador/test-drenagem-sem-progresso.sh    |   98 +
 scripts/orquestrador/test-drenagem.sh              |  279 +++
 scripts/orquestrador/test-fixture-drenagem.sh      |   71 +
 scripts/orquestrador/test-fixture-executor.sh      |  199 ++
 scripts/orquestrador/test-fixture-painel.sh        |  162 ++
 scripts/orquestrador/test-gate-prevoo.sh           |  365 ++++
 scripts/orquestrador/test-lib-config.sh            |  131 ++
 scripts/orquestrador/test-notificacao-ambiente.sh  |   79 +
 scripts/orquestrador/test-ocioso.sh                |  113 ++
 scripts/orquestrador/test-orq-pause.sh             |  111 ++
 scripts/orquestrador/test-painel-alarmes.sh        |  137 ++
 scripts/orquestrador/test-painel-detalhe.sh        |  132 ++
 scripts/orquestrador/test-painel-lento.sh          |  110 ++
 scripts/orquestrador/test-painel-pausa.sh          |  155 ++
 scripts/orquestrador/test-painel-visao.sh          |  267 +++
 scripts/orquestrador/test-preflight.sh             |  285 +++
 scripts/orquestrador/test-rc-executor.sh           |   91 +
 scripts/orquestrador/test-reabertura-humana.sh     |  115 ++
 scripts/orquestrador/test-reprovado-sub.sh         |  140 ++
 scripts/orquestrador/test-retry-worktree.sh        |  363 ++++
 scripts/orquestrador/test-sem-cor.sh               |   86 +
 scripts/orquestrador/test-sem-progresso-limite.sh  |  166 ++
 .../orquestrador/test-tentativas-persistidas.sh    |  174 ++
 scripts/orquestrador/triador/cli.ts                |  106 +
 scripts/orquestrador/triador/comum.ts              |  205 ++
 scripts/orquestrador/triador/corrida.ts            |  108 ++
 scripts/orquestrador/triador/extrair.ts            |  340 ++++
 scripts/orquestrador/triador/git.ts                |   37 +
 scripts/orquestrador/triador/leitor-kit.ts         |  270 +++
 .../orquestrador/triador/leitor-legado-comarka.ts  |  559 ++++++
 scripts/orquestrador/triador/leitor.ts             |   63 +
 scripts/orquestrador/triador/mascara.ts            |   26 +
 scripts/orquestrador/triador/modelo.ts             |  535 ++++++
 scripts/orquestrador/triador/prompt.ts             |  114 ++
 scripts/orquestrador/triador/recorte.ts            |  124 ++
 scripts/orquestrador/triador/saida.ts              |  231 +++
 scripts/orquestrador/triador/tipos.ts              |  190 ++
 scripts/orquestrador/triador/triar.ts              |  243 +++
 scripts/roadmap/lint-mapa.py                       |  150 ++
 test/fixtures/criterios/lote8-246-250.json         |  527 +++++
 .../901-fixture-grep-q-em-pipe.md                  |   28 +
 .../902-fixture-grep-c-controle.md                 |   27 +
 .../gate-ticket-grep-q/903-fixture-488-antigo.md   |   53 +
 test/fixtures/orq-harness.ts                       |  268 +++
 .../gates-510c-attempt-0.txt                       |   21 +
 test/fixtures/trilha/events-quebrado.log           |  130 ++
 test/fixtures/trilha/permissao-negada-234.cmd      |   23 +
 test/orquestrador-ambiente-merito.test.ts          |   97 +
 test/orquestrador-arquivo-solto.test.ts            |  226 +++
 test/orquestrador-base-vermelha.test.ts            |  227 +++
 test/orquestrador-contexto-juiz-fixtures.test.ts   |  240 +++
 test/orquestrador-contexto-juiz.test.ts            |  246 +++
 test/orquestrador-criterio-merito.test.ts          |  135 ++
 test/orquestrador-fila-json-quebrado.test.ts       |  167 ++
 test/orquestrador-gate-grep-q.test.ts              |   65 +
 test/orquestrador-gate-regex-exemplos.test.ts      |  181 ++
 test/orquestrador-gate-vitest-aviso.test.ts        |   96 +
 test/orquestrador-gates-fonte-unica.test.ts        |  172 ++
 test/orquestrador-morte-por-sinal.test.ts          |  199 ++
 test/orquestrador-pacotes.test.ts                  |  179 ++
 test/orquestrador-prefixo-aspas.test.ts            |  129 ++
 test/orquestrador-prompt-como-rodar.test.ts        |  170 ++
 test/orquestrador-reparo-trilha.test.ts            |  135 ++
 test/orquestrador-retry-feedback-juiz.test.ts      |  171 ++
 test/orquestrador-teto-adiamento-ambiente.test.ts  |  178 ++
 test/orquestrador-trilha-uma-linha.test.ts         |  119 ++
 tsconfig.json                                      |    4 +-
 vitest.config.ts                                   |   10 +-
 172 files changed, 34642 insertions(+), 2 deletions(-)
```

## 4. Chaves que mudaram em relação ao rascunho

As notas `_dc_*` mudaram junto. Os booleanos foram comparados à parte: só entrou `restricao_execucao.ativa: false`.

| Chave | Rascunho | Final | Fonte |
|---|---|---|---|
| `modelos.classificador` | `haiku` | `claude-haiku-5-5` | L6. O Comarka não tem classificador; usei o mesmo padrão de ID |
| `modelos.{executor,planejador,juiz_baixo}`, `executor_model` | `sonnet` | `claude-sonnet-5-5` | L6; Comarka `c16e2b8` `executor_model` |
| `modelos.{juiz_alto,juiz_ticket,retry_final}`, `avaliador_model`, `retry_final_model` | `opus` | `claude-opus-5-5` | L6; Comarka `avaliador_model`, `retry_final_model` |
| `diff_cap_linhas` | 2500 | 900 | L7; Comarka `docs/fila/000-config.json:21` |
| `claude_timeout_secs` | 1800 | 1500 | L7; Comarka `:22` |
| `claude_max_turns` | 40 | 40 (sem mudança) | L7: **o Comarka não tem a chave** e o executor dele não passa `--max-turns`. Ficou 40, que é o valor do template e o fallback do kit (`executor.sh:1101`). O `config-tabela.ts:308` do kit sugere 80 (CI). **Confirmar com o Lucas** |
| `orcamento.usd_dia` | placeholder | 10 | L4 |
| `orcamento.usd_ticket` | placeholder | 1.5 | L4 |
| `orcamento.tokens_dia` | placeholder | 1000000 | L4, formato inteiro do template (`config.json:188`). **Valor recomendado, confirmar com o Lucas.** Mantém a proporção do template (10/50 de 5M). `lib.sh` soma só `tokens_in + tokens_out`, sem cache |
| `zona_proibida.no_write_paths` | 14 itens | 13: saiu `src/app/api/financeiro/dre/**` | L9: `docs/CANONICO.md:113-115` lista a página `/dre`, não a API. `src/app/dre/**` fica |
| `restricao_execucao` | ausente | `{ativa:false, tickets_permitidos:[], recusa_exit_code:78, recusa_mensagem}` | ensaio §1.2; valores do config do CI (`test/fixtures/checkout` do kit) |
| `gates[build].cmd` | `node_modules/.bin/next build` | com as 3 variáveis fictícias | ensaio §1.4 |
| `gates[build].descricao` | `next build sem erro.` | explica as variáveis fictícias | idem |
| `descricao` | "RASCUNHO…" | cita as respostas L1-L11 | — |
| `ambiente_id` | `""` | `""` (nota `_dc_` reescrita) | L3 |
| `prefixos_sem_ddl` | com `vw_` | com `vw_` (nota reescrita) | L8. `leads_crm_rt3` é canal realtime (`src/hooks/use-crm-data.ts:321`, `supabase.channel`): fica fora |

Chaves que **não** entraram:
- `sql_pendente_dir`: o kit lê (`enforcement-core.ts:234`, `executor.sh:432`), mas o template não tem valor (grep vazio em `doutrina/`).
- `commit_checkpoint.quando` e `commit_checkpoint._regra`: o kit lê (`executor.sh:462-463`), mas o template também não tem valor.

Pela regra do L10, nenhuma das três entra. Ficam para o Lucas, se ele quiser.

Seguem pendentes de confirmação, sem mudança nesta sessão:
- `zona_proibida.revisado_humano: false`. Nenhum script do motor lê a chave (grep vazio). Ela é registro da revisão do Lucas.
- `campos_usage`: não foram sondados de novo (`claude -p` proibido).
- `juiz.paths_alto_risco`: não foi validado glob a glob.

## 5. Config final inteiro (`docs/fila/000-config.json` em `46e9f44`)

```json
{
  "$schema_versao": 2,
  "descricao": "Config do Orquestrador Autônomo v2 para dashboard-comercial (Comarka Ads). Derivado de doutrina/templates/config.json do kit a001fde (rascunho da sessão ADOCAO-DASHBOARD CONFIG, 22/10/2026) com as respostas L1-L11 do Lucas aplicadas na sessão ADOCAO-DASHBOARD INSTALAÇÃO. Todo valor que mudou em relação ao template tem a razão no _dc_* vizinho.",
  "branch_alvo": "staging-auto",
  "branch_principal": "main",
  "_branch_protegida": "O motor lê ESTE nome (local-loop.sh:28, executor.sh:130) — `branch_principal` é o alias de leitura humana. É a branch que o loop NUNCA empurra; deixá-la ausente faz o `jq -r` devolver a string \"null\", e a proibição passa a valer para uma branch chamada \"null\".",
  "branch_protegida": "main",
  "worktrees_prefixo": "dc-orq-",
  "_worktrees_prefixo": "lib.sh:498, decisao.ts:363. Prefixo diferente por repo é o que impede dois repos de colidirem na mesma worktree; um default igual para todos anularia a única coisa que a chave faz.",
  "max_retries": 2,
  "cooldown_minutes": 60,
  "_cooldown": "Adiamento por limite (rate limit/quota/timeout/orçamento) grava runs/.cooldown-until. NÃO conta como retry; status volta a pendente.",
  "sem_progresso_limite": 3,
  "_sem_progresso_limite": "Peça 7a-3 (local-loop.sh:160). Disparos seguidos em que o ticket segue pendente sem cooldown e sem a branch alvo andar, contados em runs/<id>/.sem-progresso. No limite o ticket vai para bloqueado, commitado, com a última causa em notas_status, e a trilha ganha BLOQUEADO motivo=sem_progresso. Adiamento não conta; sair de pendente ou a branch alvo avançar zera. Ausente ou inválida = 3.",
  "adiamentos_limite": 4,
  "_adiamentos_limite": "Peça 7b-3 (local-loop.sh:adiamentos_limite). Adiamentos SEM cooldown seguidos (timeout, 5xx, sessão, gate que não rodou, recusa de preflight), contados em runs/<id>/.adiamentos. No limite o ticket vai para bloqueado, commitado, com notas_status 'adiado N vezes: <causa real>' (a medida do último ADIADO: motivo, rc e duração, ou a causa do preflight), e a trilha ganha BLOQUEADO motivo=adiamentos. Adiado com cooldown (rate_limit, quota) não conta nem zera; sair de pendente ou a branch alvo avançar zera. Ausente ou inválida = 4.",
  "migrations_dir": "supabase/migrations",
  "worktrees_dir": "../_worktrees",
  "worktree": {
    "linkar_env": false
  },
  "_worktree": "Etapa 8d. `linkar_env`: true (ou ausente) liga o .env.local do checkout principal (raiz e apps/web) na worktree do ticket, e gates, critérios, agente e juiz rodam com ele à vista. Use false quando esse arquivo tiver credencial que o loop não pode ter (ex.: banco de produção): nada de .env* entra, e o evento WORKTREE env=nao-linkado vai para o events.log. Só booleano: qualquer outro valor aborta o preflight. O preflight de identidade continua lendo o .env.local do principal, sem exportar nada.",
  "runs_dir": "docs/fila/runs",
  "liberacoes_file": "docs/fila/liberacoes.json",
  "decisoes_file": "docs/fila/decisoes-pendentes.md",
  "pausar_file": "docs/fila/PAUSAR",
  "mapa_json": "docs/roadmap/mapa.json",
  "mapa_md": "docs/roadmap/MAPA.md",
  "repo_map": "docs/orquestrador/REPO-MAP.md",
  "playbook": "docs/orquestrador/PLAYBOOK.md",
  "_modo": "agendado = uma drenagem por disparo. continuo = drenagens em sequência no MESMO processo com sleep de intervalo_min, relendo config e kill switches a cada ciclo. dry_run = executor roda gates mas não mergeia; planejador só gera candidatos.",
  "modo": "agendado",
  "intervalo_min": 30,
  "_push_suprimido": "INFORMATIVO, não é interruptor (peça D11). Nenhum script do motor lê esta chave: ela não está em config-chaves.ts e o valor não muda comportamento nenhum — o CI a tem em false e mesmo assim não pusha. Quem impede o push é (1) proibicoes_absolutas.tools com Bash(git push:*), que sai na flag --disallowedTools E é tirado da allowlist derivada do ticket, e (2) branch_protegida, que o local-loop recusa mergear e da qual o executor só CRIA branch. O snapshot diz 'push suprimido' sempre (lib.sh:staging_linha), por construção e não por config. Escreva-a como registro da decisão; não a trate como o que segura o push.",
  "push_suprimido": false,
  "loops": {
    "_descricao": "Kill switches por loop. Nascem desligados exceto executor. Ligar na ordem: executor → sentinela → planejador (dry_run) → planejador (auto).",
    "executor": {
      "ativo": true
    },
    "sentinela": {
      "ativo": false
    },
    "planejador": {
      "ativo": false,
      "modo": "dry_run"
    }
  },
  "_modelos": "Escada: script decide o que dá; classificador barato; executor/planejador médio; juiz forte. Modelo forte em papel que não seja juiz_alto, juiz_ticket ou retry_final é bug de config (pré-voo cat. 8). Nomes v1 (executor_model, avaliador_model, retry_final_model) mantidos como alias e devem bater com modelos.*. Use o identificador aceito pela versão instalada do Claude Code (alias curto ou id completo do modelo).",
  "modelos": {
    "classificador": "claude-haiku-5-5",
    "executor": "claude-sonnet-5-5",
    "planejador": "claude-sonnet-5-5",
    "juiz_baixo": "claude-sonnet-5-5",
    "juiz_alto": "claude-opus-5-5",
    "juiz_ticket": "claude-opus-5-5",
    "retry_final": "claude-opus-5-5"
  },
  "executor_model": "claude-sonnet-5-5",
  "avaliador_model": "claude-opus-5-5",
  "retry_final_model": "claude-opus-5-5",
  "_economia": "diff_cap_linhas: acima reprova mecanicamente (refatiar) sem juiz. diff_cap_ticket: cap DECLARADO no gate de ticket (menor que o mecânico de propósito: o estimado sempre erra para baixo). claude_timeout_secs: estouro = adiado.",
  "diff_cap_linhas": 900,
  "diff_cap_ticket": 600,
  "claude_timeout_secs": 1500,
  "claude_max_turns": 40,
  "preflight_env_keys": [],
  "executor": {
    "auto_verificacao_max": 2,
    "modo_arquiteto_para_alto": false,
    "saida_compactada": true,
    "narracao_proibida": true,
    "trailer_commit": "Orq-Ticket",
    "_trailer_commit": "Todo merge commit do loop na staging carrega o trailer 'Orq-Ticket: <id>'. Quarentena da sentinela e relatório leem o git, não o log."
  },
  "contexto": {
    "_descricao": "Context pack montado por script. Truncamento por prioridade: ticket > arquivos da allowlist > assinaturas via repo map > ADR > PLAYBOOK #executor.",
    "cap_tokens_executor": 15000,
    "cap_tokens_planejador": 12000,
    "cap_tokens_repo_map": 4000,
    "cap_linhas_arquivo": 400,
    "playbook_max_linhas": 30
  },
  "juiz": {
    "_descricao": "Nível por classe de risco. baixo: gates verdes E diff ≤ diff_max_baixo E nenhum path em paths_alto_risco. Qualquer outro caso: alto.",
    "diff_max_baixo": 300,
    "max_tokens_veredicto": 300,
    "paths_alto_risco": [
      "supabase/**",
      "src/middleware.ts",
      "src/lib/auth/**",
      "src/lib/auth.ts",
      "src/lib/auth-guard.ts",
      "src/app/api/auth/**",
      "src/app/login/**",
      "src/lib/supabase.ts",
      "src/lib/supabase-admin.ts",
      "src/lib/comissao-canonica.ts",
      "src/lib/comissao/**",
      "src/lib/calculos.ts",
      "src/lib/kpis.ts",
      "src/lib/atribuicao.ts",
      "src/lib/ad-attribution.ts",
      "src/app/api/webhooks/**"
    ],
    "palavras_alto_risco": [
      "auth",
      "login",
      "senha",
      "token",
      "pagamento",
      "billing",
      "migration",
      "schema",
      "rls",
      "permiss"
    ],
    "_dc_paths_alto_risco": "Proposta a partir do disco (ls src/lib, find src/app). Não validado glob a glob com git ls-files; conferir antes do primeiro run."
  },
  "gate_ticket": {
    "_descricao": "7 passos para todo candidato de máquina. Tickets humanos: passos 1 a 6 no pré-voo cat. 8; juiz opcional.",
    "juiz_para_humano": false,
    "max_paths_allowlist": 8,
    "timeout_cmd_secs": 120,
    "modo_pre_voo": "aviso",
    "_modo_pre_voo": "Pré-voo do gate de ticket no drive_ticket (porte do Actus, c404986 e 624): 'aviso' registra as violações no log e na trilha (GATE_TICKET_AVISO) e deixa o ticket seguir; 'bloqueia' marca o ticket bloqueado antes da worktree, sem consumir tentativa. Ausente = 'aviso'. Gate que não roda é falha alta nos dois.",
    "severidade": {},
    "_severidade": "Severidade por regra do gate de ticket (etapa 7d-1b): objeto regra -> erro|aviso|off por cima da tabela REGRAS do gate-ticket.ts. Vazio = a tabela, que aplica a calibração de 25/09 (ERRO só com zero falso positivo nos done dos três repos). 'bloqueia' no modo_pre_voo bloqueia SÓ por regra erro. Ex.: {\"6q\": \"erro\", \"6a:rm \": \"off\"}. Regra ou valor desconhecido é falha alta.",
    "cmd_prefixos_permitidos": [
      "node_modules/.bin/vitest run",
      "node_modules/.bin/tsc",
      "node scripts/",
      "test -f",
      "test -s",
      "grep -",
      "jq "
    ],
    "descartados_ttl_dias": 7,
    "lotes_descartados_para_bloquear_frente": 2,
    "filtros_permitidos": [
      "grep",
      "wc",
      "head",
      "tail",
      "jq",
      "cut",
      "sort",
      "uniq",
      "tr"
    ],
    "proibido_no_cmd": [
      "$(",
      "`",
      "sh -c",
      "bash",
      "eval",
      "sudo",
      "rm ",
      "curl http",
      "curl https",
      "wget",
      "> ",
      ">>"
    ],
    "_proibido_no_cmd": "Checar por token de palavra e por regex, não por substring ('rm ' não pode casar 'form '). curl: qualquer host que não seja localhost/127.0.0.1 é proibido, em qualquer segmento. Único redirecionamento permitido: 2>&1. Path de paths_harness em qualquer segmento = invalido.",
    "servidor_local_cmd": "",
    "_dc_cmd_prefixos_permitidos": "Template sem npx/npm run (decisão: binário local) e sem os dois curl (servidor_local_cmd vazio). Se o Lucas quiser critérios com npm run, é decisão dele."
  },
  "planejador": {
    "limiar_fila": 3,
    "lote": 3,
    "max_frentes_por_drenagem": 1,
    "reserva_orcamento_pct": 20
  },
  "sentinela": {
    "_descricao": "Todas as fontes read-only. Começar com suite_completa e smoke; runtime_errors e advisors só com credencial read-only no ambiente do agendador.",
    "fontes": [
      "suite_completa",
      "smoke"
    ],
    "smoke_cmd": "",
    "ocorrencias_min": 3,
    "janela_min": 1440,
    "quarentena_horas": 24,
    "max_candidatos_drenagem": 3,
    "max_candidatos_dia": 6,
    "rodar_sem_merge": false,
    "log_grep_padroes": [],
    "_dc_smoke_cmd": "Vazio: sentinela nasce desligada (loops.sentinela.ativo false) e o smoke de produção passa pelo middleware (curl engana, CLAUDE.md Deploy)."
  },
  "orcamento": {
    "_descricao": "Gate, não relatório. Nasce alto por 2 semanas de medição, depois fixa com 30% de folga sobre a mediana. Estourou = adiado + notificação.",
    "usd_dia": 10,
    "tokens_dia": 1000000,
    "usd_ticket": 1.5,
    "custo_file": "docs/fila/runs/custo.json",
    "campos_usage": {
      "custo_usd": "total_cost_usd",
      "tokens_in": "usage.input_tokens",
      "tokens_out": "usage.output_tokens",
      "tokens_cache": "usage.cache_read_input_tokens"
    },
    "_dc_orcamento": "L4: usd_dia 10 e usd_ticket 1.5 decididos. tokens_dia 1000000 é VALOR RECOMENDADO (inteiro, formato do template; 10/50 do teto de 5M do template, na mesma proporção do usd_dia), confirmar com o Lucas. lib.sh soma só tokens_in + tokens_out, sem cache.",
    "_dc_campos_usage": "Nomes do config do CI (conteudos-infinitos e1541e2), confirmados lá por sondagem de claude -p nesta máquina. NÃO resondados nesta sessão (claude -p proibido): reconfirmar no pré-voo cat. 8."
  },
  "relatorio": {
    "dia_semana": "sex",
    "fallback_arquivo": true,
    "_dc_canal": "Chave canal removida, como no CI: o canal é canal_notificacao no topo. Duas chaves de canal seriam duas fontes."
  },
  "_identidade": "Antes de qualquer gasto: origin DEVE conter repo_origin_deve_conter; identificador do banco/ambiente do .env DEVE bater com ambiente_id. Divergência = aborta o run inteiro.",
  "repo_origin_deve_conter": "lucasantosads/dashboard-comercial",
  "ambiente_id": "",
  "paths_harness": [
    "scripts/orquestrador/**",
    "scripts/orq",
    "scripts/roadmap/**",
    "docs/orquestrador/**",
    "docs/fila/000-config.json",
    "docs/fila/_TEMPLATE.md",
    ".claude/**"
  ],
  "_zona_proibida": "Etapa 8d: só chaves que o enforcement lê (config-chaves.ts). no_write_paths e no_write_credenciais.padroes são globs de caminho; no_write_tables é \"TODAS\" ou a lista de tabelas congeladas por nome; prefixos_sem_ddl (o antigo no_write_prefixes) proíbe CREATE/ALTER/DROP de objeto com o prefixo. O motor NÃO tem regra de leitura (o antigo readonly_ok) nem de ownership (o antigo excecoes_os_owned): tabela fora de no_write_tables pode ser escrita, e ninguém fica protegido por uma lista que o motor não lê.",
  "zona_proibida": {
    "descricao": "Tudo que o loop NUNCA escreve nem gera DDL. Revisado por humano (revisado_humano: true) antes do primeiro run.",
    "revisado_humano": false,
    "no_write_paths": [
      ".env*",
      "**/.env*",
      ".vercel/**",
      ".github/workflows/**",
      "docs/backups/**",
      "docs/deploy/**",
      "docs/CANONICO.md",
      "CLAUDE.md",
      "src/lib/comissao-canonica.ts",
      "src/app/trafego/visao-geral/**",
      "src/app/trafego/relatorios/**",
      "src/app/trafego/relatorio-auto/**",
      "src/app/dre/**"
    ],
    "no_write_credenciais": {
      "padroes": [
        "**/*.pem",
        "**/*.key",
        "**/id_rsa*",
        "**/credentials*",
        "**/secrets*"
      ]
    },
    "no_write_tables": [
      "clientes_receita",
      "leads_crm",
      "leads_crm_historico",
      "ads_metadata",
      "ads_performance",
      "vw_atribuicao_proporcional",
      "fn_mql_sql_by_month",
      "trafego_account_managers",
      "trafego_ad_accounts",
      "trafego_anomalias",
      "trafego_client_account_history",
      "trafego_clients",
      "trafego_criativo_metricas",
      "trafego_criativos",
      "trafego_performance_temporal",
      "trafego_regras_historico",
      "trafego_regras_otimizacao",
      "trafego_thresholds_alertas",
      "meta_connections",
      "meta_ad_accounts",
      "meta_insights_cache",
      "meta_lead_forms",
      "meta_sync_logs",
      "meta_agency_connection",
      "client_meta_accounts",
      "ia_prompts",
      "perf_ad_accounts",
      "perf_analises",
      "perf_cliente_cor_override",
      "perf_cliente_metas",
      "perf_cliente_verba",
      "perf_colunas_template",
      "perf_colunas_visualizacao",
      "perf_conta_metas",
      "perf_criativos",
      "perf_crm_conexoes",
      "perf_crm_etapas",
      "perf_crm_oportunidade_historico",
      "perf_crm_oportunidades",
      "perf_crm_pipelines",
      "perf_crm_reconciliacoes",
      "perf_crm_reprocesso",
      "perf_equipe_telefones",
      "perf_eventos_produtividade",
      "perf_fechamento_tokens",
      "perf_fechamentos",
      "perf_fechamentos_informados",
      "perf_formas_pagamento",
      "perf_ghl_locations",
      "perf_health_snapshot",
      "perf_hook_tipos",
      "perf_ia_analises",
      "perf_ia_credenciais",
      "perf_ia_modelos",
      "perf_ia_uso",
      "perf_insights_daily",
      "perf_lead_eventos",
      "perf_leads",
      "perf_leituras_relacao",
      "perf_meta_ad_map",
      "perf_meta_campanhas",
      "perf_meta_connections",
      "perf_meta_discovery",
      "perf_meta_receita",
      "perf_nichos",
      "perf_nps_disparo_fila",
      "perf_nps_respostas",
      "perf_nps_tokens",
      "perf_otimizacoes",
      "perf_portal_tokens",
      "perf_portal_venda_confirmacoes",
      "perf_promessas",
      "perf_qualificacao_regras",
      "perf_ranking_foto_mensal",
      "perf_relacao_sugestoes",
      "perf_relatorios_gerados",
      "perf_reuniao",
      "perf_sync_logs",
      "perf_tese_premissas",
      "perf_teses",
      "perf_vacuo_tratado"
    ],
    "prefixos_sem_ddl": [
      "trafego_",
      "perf_",
      "leads_crm",
      "fn_mql_",
      "vw_"
    ],
    "_dc_no_write_paths": "L9: páginas protegidas de docs/CANONICO.md:113-115 (/trafego/visao-geral, /trafego/relatorios, /trafego/relatorio-auto, /dre), src/lib/comissao-canonica.ts, CLAUDE.md e docs/CANONICO.md. src/app/api/financeiro/dre/** saiu: a lista do CANONICO nomeia a página /dre, não a API. docs/backups/** é proibido pelo CLAUDE.md (:83-89).",
    "_dc_no_write_tables": "Nome literal (enforcement-core.ts:460-462 escapa *, :534-539 casa ^nome$). Mapa de dono do CLAUDE.md do clone (Zona protegida). Tabela, motivo e fonte de cada linha no relatorio-dc-config.md. perf_* saiu das migrations do Comarka (c16e2b8), não do banco: conferir com information_schema na etapa do --novo.",
    "_dc_prefixos_sem_ddl": "Regra E (enforcement-core.ts:594-608) exige ao menos 1 caractere depois do prefixo (\\w+): leads_crm pega leads_crm_historico mas não CREATE de leads_crm puro; ALTER/DROP TABLE de nome congelado já cai na regra C. L8: vw_ fica, o loop não cria view nova. leads_crm_rt3 fica fora de no_write_tables: é nome de canal realtime (src/hooks/use-crm-data.ts:321, supabase.channel), não tabela."
  },
  "_gates_papel": "Chave OPCIONAL por gate (peça K6b): \"papel\": \"typecheck\" | \"testes\" | \"build\" | \"lint\". É ela que decide o que a linha GATE da trilha diz sobre cada gate. Quando ausente, o papel é INFERIDO do nome (executor.sh, papel_do_gate: *typecheck*/*tsc*/*types* → typecheck; *lint* → lint; *build*/*compil* → build; *test*/*spec* → testes). Declare-a quando o nome do gate não disser o papel — um gate chamado `verificacao` sai como nao-configurado sem ela. Papel que não existe em gate nenhum do config aparece na trilha como `nao-configurado`, nunca `nao-rodou`.",
  "launchd": {
    "label": "com.dashboard-comercial.orquestrador",
    "start_interval": 1800
  },
  "_launchd": "Peça K6c. `label` é o Label do job do launchd e NÃO tem default: scripts/orquestrador/instalar-launchd.sh RECUSA sem ele, em vez de inventar um. Label inventado não dá erro visível — carrega um SEGUNDO job ao lado do antigo, os dois disparando no mesmo checkout. Um label por repo: para o launchd, dois repos com o mesmo label são o MESMO job. `start_interval` é o StartInterval em segundos; 1800 é o valor medido em 06/set/2026 (mediana 294s, p90 2509s por ticket), e a medição inteira está no comentário do com.orquestrador.plist.template — refaça-a antes de trocar o número.",
  "_execucao_dos_gates": {
    "_descricao": "gates.ts:176-177. `ordem_obrigatoria` tem de listar os MESMOS nomes de `gates[]`, na mesma ordem: rodar fora de ordem invalida o resultado mesmo que todos os comandos saiam verdes. Gate de `tipo: preparacao` (limpeza de artefato) vem primeiro — um artefato de build velho JÁ dessincronizou tsc e build numa sessão real, e sem humano olhando isso vira APROVAÇÃO FALSA.",
    "ordem_obrigatoria": [
      "typecheck",
      "testes",
      "build"
    ],
    "interrupcao": "NAO_VALE_PARCIALMENTE",
    "_interrupcao": "Gate interrompido no meio (timeout, kill, máquina dormindo) NÃO conta como parcialmente aprovado: nenhum resultado anterior é reaproveitado e a sequência reexecuta inteira. Um gate só vale quando a ordem completa rodou de ponta a ponta na mesma execução."
  },
  "politica_adiamento": {
    "regra": "Falha de INFRAESTRUTURA adia. Nunca reprova.",
    "_porque": "Reprovar por queda de conexão consome retry e, no limite, bloqueia um ticket que nunca foi julgado pelo mérito. O executor não errou — o ambiente caiu. Só o AVALIADOR reprova, e só por conteúdo do diff.",
    "causas_que_adiam": [
      "erro de conexão",
      "sessão expirada",
      "rate limit",
      "quota estourada",
      "timeout de claude_timeout_secs",
      "gate interrompido no meio",
      "veredito do juiz ilegível",
      "falha de ambiente da worktree"
    ],
    "efeito": {
      "status": "pendente",
      "conta_como_retry": false,
      "cooldown": "grava runs/.cooldown-until = agora + cooldown_minutes"
    }
  },
  "politica_retry": {
    "_descricao": "decisao.ts:277, e decisao.ts REJEITA a config que mandar o contrário. A causa da reprovação decide o que muda no retry: tamanho, fronteira e qualidade são problemas diferentes e não compartilham remédio.",
    "por_causa": {
      "diff_cap": {
        "modelo": "MANTER",
        "acao": "estreitar o escopo no prompt de retry (fatiar o ticket, reduzir pathspec_allowlist)",
        "_porque": "Estourar diff_cap é falha de TAMANHO, não de capacidade. Um modelo mais forte escreve o mesmo excesso — só mais caro."
      },
      "enforcement": {
        "modelo": "MANTER",
        "acao": "estreitar o escopo no prompt de retry (respeitar a pathspec_allowlist, sair da zona proibida)",
        "_porque": "Violação de FRONTEIRA não é falha de qualidade. Um modelo mais forte cruza a mesma fronteira."
      },
      "criterio_qualidade": {
        "modelo": "ESCALAR",
        "acao": "subir para retry_final_model e repetir com o mesmo escopo",
        "_porque": "Reprovação do avaliador é falha de CAPACIDADE; aí escalar é o remédio certo."
      },
      "arquivo_solto": {
        "modelo": "MANTER",
        "acao": "remover o arquivo solto da worktree"
      }
    },
    "proibicao": "NUNCA escalar modelo por falha de tamanho (diff_cap) nem por violação de fronteira (enforcement)."
  },
  "gates": [
    {
      "nome": "typecheck",
      "papel": "typecheck",
      "preparo": [
        "rm -rf .next",
        "rm -f next-env.d.ts tsconfig.tsbuildinfo"
      ],
      "cmd": "node_modules/.bin/tsc --noEmit",
      "tipo": "baseline",
      "baseline": 246,
      "direcao": "max",
      "contagem_regex": "^(?!\\.next/).*error TS\\d+",
      "descricao": "Contagem de linhas 'error TS' fora de .next/ menor ou igual a 246 (gate do dia 1 do CLAUDE.md; 245 medidos em f3b7892). gates.ts:229-246: em max quem decide é a contagem; exit != 0 sem nenhuma linha contada reprova.",
      "_dc_baseline": "REMEDIR depois do --novo: o tsconfig inclui **/*.ts e não exclui test/, e o --novo vendoriza 20 arquivos .ts de harness em test/ (scripts/kit/vendorizado.sh). scripts/ já está no exclude. O preparo apaga .next, next-env.d.ts e o tsbuildinfo (incremental: true no tsconfig)."
    },
    {
      "nome": "testes",
      "papel": "testes",
      "cmd": "node_modules/.bin/vitest run",
      "tipo": "exit_code",
      "descricao": "Suíte padrão verde, sem credencial (setup-sem-credencial.ts recusa *.supabase.co). Medido no clone: 97 arquivos, 1257 testes. Nunca test:integration.",
      "_dc_testes": "O vitest.config.ts não restringe include: os 19 testes de harness que o --novo copia para test/ entram nesta suíte. Remedir depois do --novo."
    },
    {
      "nome": "build",
      "papel": "build",
      "preparo": [
        "rm -rf .next"
      ],
      "cmd": "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=build-sem-env SUPABASE_SERVICE_ROLE_KEY=build-sem-env node_modules/.bin/next build",
      "tipo": "exit_code",
      "descricao": "next build sem erro, sem .env. As 3 variáveis Supabase do comando são FICTÍCIAS (localhost porta 9, inalcançável; chave literal build-sem-env): sem elas o next build morre na coleta de dados de página.",
      "_dc_build": "Achado no ensaio (22/10): sem .env, next build sai 1 com `supabaseUrl is required` ao coletar /api/admin/auditoria-comissao (createClient no import do módulo). Consertar no app (cliente preguiçoso) é mudança de código, fora do escopo; o gate recebe valores fictícios, não secretos, só das 3 chaves que src/ lê (NEXT_PUBLIC_SUPABASE_URL 368x, SUPABASE_SERVICE_ROLE_KEY 362x, NEXT_PUBLIC_SUPABASE_ANON_KEY 2x). Prova: o gate reprova compilação; não prova runtime. Confirmar com o Lucas."
    }
  ],
  "lint": {
    "cmd": "",
    "descricao": "Só regras já em erro. Warnings não são falha nem permissão.",
    "_dc_lint": "Vazio: há .eslintrc.json e next lint no package.json, mas o lint não foi medido nesta sessão. Preencher só depois de medido, com regras já em erro."
  },
  "testes_quarentena": [],
  "proibicoes_absolutas": {
    "regras": [
      "nunca push na branch principal",
      "nunca aplicar DDL (só escrever arquivo de migration)",
      "nunca escrever na zona proibida",
      "nunca tocar credenciais/segredos",
      "nunca gastar dinheiro",
      "nunca escrever em paths_harness pela fila",
      "git add sempre por pathspec explícito",
      "nunca ler .env* nem usar service role de produção em teste",
      "nunca rodar npm run test:integration",
      "nunca DELETE físico; soft delete sempre"
    ],
    "tools": [
      "Bash(git push:*)",
      "Bash(git reset:*)",
      "Bash(psql:*)",
      "Bash(supabase:*)",
      "Bash(npx supabase:*)",
      "Bash(curl:*)",
      "Bash(rm:*)",
      "WebFetch",
      "WebSearch",
      "Bash(pnpm install:*)",
      "Bash(npm install:*)",
      "Bash(npm ci:*)"
    ]
  },
  "_proibicoes_absolutas_tools": "T17 · o PISO de --disallowedTools. `regras` e a prosa de sempre; `tools` e a lista que o motor passa em --disallowedTools (executor.sh:tools_proibidas) e que tambem sai da allowlist derivada do ticket (perfil.ts:filtrarPeloPiso) — o ticket pede, o config nega, o config ganha. `pnpm install`/`npm install`/`npm ci` estao aqui porque o node_modules da worktree e LINKADO para o store do checkout principal: um install la purga o store do repo de verdade, nao o da worktree descartavel.",
  "_dc_worktrees_prefixo": "CLAUDE.md do clone, seção Ambientes: dc-orq-<id> e dc-orq-staging-auto são reservados ao loop. lib.sh:872 monta a staging como <worktrees_dir>/<prefixo><branch_alvo> = ../_worktrees/dc-orq-staging-auto.",
  "_dc_worktree": "Decisão fechada: linkar_env false. O clone do loop não tem .env; nenhuma credencial de produção entra na worktree.",
  "_dc_preflight_env_keys": "Vazio porque o clone não tem .env (executor.sh:126-131 morre com env faltando). Ver ambiente_id.",
  "canal_notificacao": "arquivo",
  "_dc_canal_notificacao": "Decisão fechada. lib.sh:1358; qualquer valor != notificacao_nativa cai no arquivo.",
  "_dc_ambiente_id": "L3: vazio. Desliga a checagem de banco (executor.sh:117). O clone do loop não tem .env; com o ref preenchido (ogfnojbbvumujzfklkhh), executor.sh:118-120 compararia com SUPABASE_URL do .env.local do principal e o preflight morreria em todo run.",
  "_dc_launchd": "Proposto. Não colide com os 6 labels de launchctl list (22/10 16:59): com.comarka.orquestrador, com.comarka.orquestrador-apolo, com.comarka.orq-server, com.orq.resolvedor, com.actus.orquestrador, com.conteudos.orquestrador.",
  "_dc_modelos": "L6: IDs completos, como o Comarka (c16e2b8: executor_model claude-sonnet-5-5, avaliador_model/retry_final_model claude-opus-5-5). O Comarka não tem classificador: claude-haiku-5-5 segue o mesmo padrão de ID.",
  "_dc_economia": "L7: diff_cap_linhas 900 e claude_timeout_secs 1500 são os do Comarka (c16e2b8). O Comarka não tem claude_max_turns (e o executor dele não passa --max-turns): fica 40, o do template e o fallback do executor do kit (executor.sh:1101). Confirmar com o Lucas.",
  "restricao_execucao": {
    "ativa": false,
    "tickets_permitidos": [],
    "recusa_exit_code": 78,
    "recusa_mensagem": "RECUSADO: há modelo por papel em PENDENTE_* e a restrição de execução está ativa. Preencha executor_model/avaliador_model/retry_final_model — não escolha um modelo padrão, não siga em frente.",
    "_dc_restricao_execucao": "Achado no ensaio (sessão INSTALAÇÃO, 22/10): o template do kit a001fde não tem esta chave e o orq config não a cobra, mas decisao.ts:72-75 (avaliaRestricaoExecucao) lê r.ativa sem guarda e executor.sh chama `decisao restricao` a cada ticket. Sem o objeto, TypeError e RECUSADO em todo drive_ticket (provado na cópia: 8 testes de harness vermelhos). Valores do config do CI (test/fixtures/checkout do kit): ativa false, allowlist vazia, exit 78. Desligada porque nenhum papel está em PENDENTE_*. Defeito do kit, listado no relatório."
  }
}
```

## 6. Comandos do Lucas depois do merge

O merge é seu, pelo `dc-deploy`: `orq/instalacao` (`46e9f44`) entra na `main`, e o push precisa da sua autorização. Depois, no clone do loop:

```bash
# 1. trazer a main com a instalação (o clone não tem mudança local: status 0 em 22/10)
git -C ~/Projetos/dashboard-comercial-orq pull --ff-only origin main
git -C ~/Projetos/dashboard-comercial-orq log --oneline -1          # tem de ser o merge de orq/instalacao

# 2. conferir no clone, que é onde o orq config resolve a raiz
cd ~/Projetos/dashboard-comercial-orq
bash scripts/orq config                                             # 0 violações
bash ~/Projetos/orquestrador-kit/instalar.sh --verificar "$PWD"     # rc 0

# 3. staging-auto: NÃO precisa criar à mão. O preflight do executor cria a branch local, sem push,
#    a partir de branch_protegida (executor.sh:135 → lib.sh:853-858, ensure_branch_alvo).
#    Ela não existe hoje no clone (git branch -a --list '*staging*' vazio).
#    A worktree de staging vai nascer em ~/Projetos/_worktrees/dc-orq-staging-auto (lib.sh:872).

# 4. launchd, com o label do config (com.dashboard-comercial.orquestrador)
bash scripts/orquestrador/instalar-launchd.sh --dry-run             # só imprime o plist; confira Label e caminhos
bash scripts/orquestrador/instalar-launchd.sh

# 5. primeiro tick, sem -k (não mata instância em execução)
launchctl kickstart gui/$(id -u)/com.dashboard-comercial.orquestrador
bash scripts/orq fila
```

Antes do passo 4, o kit pede pré-voo (`docs/orquestrador/skill/references/pre-voo.md`, categorias 0 a 6) e um ticket-fixture trivial atravessando o loop. A fila hoje não tem ticket.

## 7. Defeitos do kit para a próxima sessão do kit (L11; o kit não foi tocado)

Herdados da sessão CONFIG:
1. **`--novo` não tem `--dry-run` e aceita flag extra em silêncio.** O despacho é `--novo) shift; novo "${1:-}"` (`instalar.sh:736`): `--novo <repo> --dry-run` instala de verdade, e `--novo --dry-run <repo>` morre em `'--dry-run' não é um diretório`.
2. **O cabeçalho do `instalar.sh` (`:4-6`) e o README estão desatualizados:** dizem que o `--novo` não existe ("sai 2", "hoje só `--verificar`").
3. **O `--novo` não confere branch nem árvore limpa** (`instalar.sh:631-729`): escreve no checkout em que estiver.

Novos, achados no ensaio:
4. **O template não traz `restricao_execucao`, o `orq config` não a cobra e o motor quebra sem ela.** `decisao.ts:72-75` lê `r.ativa` sem guarda, e o resultado é TypeError e RECUSADO em todo `drive_ticket`. Um config que passa no `orq config` com 0 violações não roda nenhum ticket. Conserto sugerido no kit: entrar em `config-chaves.ts` como obrigatória e no template, ou ganhar guarda em `avaliaRestricaoExecucao`.
5. **`test/orquestrador-arquivo-solto.test.ts` crava valores do CI:** `model=sonnet` em `:219` e `public.leads` congelada em `:149-156`, embora o harness leia o config vivo. Quebra em repo com IDs completos ou `no_write_tables` enumerada. Saída: ler o config vivo (o modelo de `modelos.executor`, uma tabela de `no_write_tables[0]` ou `"TODAS"`) ou mover os casos para a suíte do kit. Quando o `--atualizar` trouxer o conserto, a exclusão sai do `vitest.config.ts` do dashboard.
6. **Os testes de harness puxam `scripts/orquestrador/*.ts` para o tsc do repo por import,** mesmo com `scripts` no exclude. Aqui foi +1 erro (`gate-ticket.ts(520,7) TS2769`). Todo repo com tsconfig `**/*.ts` vai precisar do exclude do L5, e o `--novo` não avisa.

Observação, não defeito: o `orq config` dentro de uma worktree valida o checkout principal (`scripts/orq:82-84`). Isso está correto para o loop, mas confunde quem instala numa worktree. A mensagem do `--novo` poderia dizer qual config está validando.

## 8. Desvios desta sessão

- Um `tsc` mal redirecionado gravou `/var/folders/_7/.../T/x` (66.518 bytes, saída de tsc). Apaguei logo depois (`ls` e `rm` na mesma linha). Nenhum arquivo de repo foi afetado.
- Escrevi em `vitest.config.ts` e `docs/orquestrador/PLAYBOOK.md`, fora da lista de escrita original, com a autorização do Lucas no meio da sessão (§1.3).
- Os temporários da sessão ficaram no scratchpad: `/private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-dc-instalacao/7542147b-7bc4-4c47-ae63-ef4ab2fe9e9e/scratchpad/` (saídas cruas de tsc, vitest, build e `--novo`, mais o config final).
- A cópia `~/Projetos/_ensaio/dc-novo` ficou com a instalação sem commit e sem `.next/`. Pode ser apagada.
