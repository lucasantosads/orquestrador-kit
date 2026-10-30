# Relatório · sessão do kit · etapa 2 · o kit instancia um repo e prova uma instalação

Repo `~/Projetos/orquestrador-kit`, branch `main`, 2026-09-08.
Base: `bdc7b2c` (K4, fim da etapa 1). Fim: `dfc9d69`. Nada foi pushado.

## O que mudou

A etapa 1 deixou o kit rodando os próprios testes contra um checkout de PAPEL
(`test/fixtures/checkout/`: uma fila e um config, fora de git). Isso bastava para
604 casos e deixava 8 em quarentena mais 3 shell tests em rc 2 — todos pela mesma
causa: o motor resolve a fila pelo diretório onde o `lib.sh` MORA (`lib.sh:24`,
`lib.sh:42`), e rodá-lo de `<kit>/scripts/orquestrador/` faz o KIT ser o checkout.
O kit não tem fila, e não deve ter: a fila é do repo instalado.

Esta etapa deu ao kit um repo instalado de verdade para apontar. `fixture/` é o
template; `scripts/kit/fixture.sh` o instancia num tmp com o motor **vendorizado
dentro**. Rodar o motor de `<fixture>/scripts/orquestrador/` faz o fixture ser o
checkout — que é o cenário real. As 8 quarentenas caíram sem que nenhuma asserção
fosse tocada: mudou o CAMINHO (qual `lib.sh`, qual `cwd`, qual `docs/fila/runs`),
não a régua.

**Motor intocado, como pedido:**

```
$ git diff bdc7b2c..dfc9d69 --stat -- scripts/orquestrador scripts/orq doutrina _referencia-ci
(vazio)
```

## Commits (um por peça)

| sha | peça |
|---|---|
| `4500bb2` | K7a · `fixture/` (template) e `scripts/kit/fixture.sh` (instanciador) |
| `67c485e` | K7b · as 8 quarentenas voltam a `it` e os 3 shell tests saem rc 0 |
| `0f023a6` | K5 · `instalar.sh --verificar <repo>` |
| `dfc9d69` | docs da etapa 2 (K7 e K5 em FEITAS) + `scripts/kit/fixture-e2e.sh`, não executado |

`git status -sb` no fim: `## main`, limpo.
`ls -d /tmp/orq-fixture* /tmp/orq-verificar*`: nenhum — todo tmp criado foi removido.

## Placar

```
$ npx vitest run --reporter=dot
 Test Files  24 passed (24)
      Tests  612 passed (612)
```

612 verdes, **0 skipped**. Era 604 + 8 em quarentena.

```
$ npx tsc --noEmit
(limpo, rc 0)
```

```
$ bash scripts/kit/test-shell.sh
== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
TODOS OS SCRIPTS SAÍRAM rc 0
```

Os três saíam rc 2. `test-preflight.sh` continua fora: chama a API.

## Os três casos do `instalar.sh --verificar`, saída crua

```
$ bash scripts/kit/test-instalar.sh
== (a) fixture recém-instanciado ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
  |            repo /private/tmp/orq-fixture-VHj4Mf/repo
  |
  | carimbo    2.1.0-dev
  |
  |
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    diz 'idêntico ao kit <VERSAO>'

== (b) cópia do fixture com UM byte a mais em lib.sh ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
  |            repo /private/tmp/orq-verificar-aLYewV/repo
  |
  | carimbo    2.1.0-dev
  |
  | diferente   scripts/orquestrador/lib.sh
  |
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    exatamente 1 diferença, não uma cascata

== (c) /Users/lucasantos/Projetos/conteudos-infinitos (SÓ LEITURA — o resultado é achado, não gate) ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
  |            repo /Users/lucasantos/Projetos/conteudos-infinitos
  |
  | repo sem VERSAO
  |
  |
  | idêntico ao kit 2.1.0-dev
  (rc 0 — informativo)

TODOS OS CHECKS PASSARAM
```

O (c) é o pronto-quando da peça K5 no PECAS ("contra o checkout do CI em 711ab5e
devolve idêntico") e vai além dele: o CI está 4 commits à frente (`91cf60b`), e

```
$ git -C ~/Projetos/conteudos-infinitos log --oneline 711ab5e..HEAD -- scripts/orquestrador scripts/orq docs/orquestrador/skill
(vazio)
```

ou seja, a etapa 5 de lá não tocou o motor. **Nenhuma diferença inesperada.**
`repo sem VERSAO` é o esperado: o carimbo nasce com a vendorização do kit, e o CI
foi vendorizado antes de ele existir.

## Achados (viraram peça, não remendo)

1. **`--verificar` não cobre `scripts/roadmap/`** (peça K5b, nova).
   `orq mapa lint` roda `python3 scripts/roadmap/lint-mapa.py` a partir do
   MAIN_CHECKOUT (`scripts/orq:226`), logo `scripts/roadmap/` É motor vendorizado
   — o `fixture.sh` já o copia, senão o subcomando morre com "No such file". Mas o
   escopo do `--verificar`, como o brief e o PECAS o escrevem, são três caminhos:
   um `lint-mapa.py` desatualizado no repo passa por "idêntico". **Não ampliei o
   escopo em K5**: alargá-lo em silêncio é pior que a lacuna.

2. **`typecheck_marca` carrega premissa de repo** (foi para K6, item (c)).
   `executor.sh:415-424` combina dois gates por NOME fixo, `typecheck_root` e
   `typecheck_web` — nomes do monorepo do CI. Num repo cujo gate se chame
   `typecheck` (o fixture) a função devolve `nao-rodou` para um gate que rodou e
   passou. Não é fatal hoje (só alimenta a linha de evento `event_gate`), e por
   isso **não virou mudança de motor nesta etapa**.

3. **`/tmp` é symlink de `/private/tmp` no macOS, e isso quebrava o gate em
   silêncio.** O guard de CLI do `gate-ticket.ts` compara `import.meta.url` (que o
   node resolve fisicamente) com `resolve(process.argv[1])`. Com o caminho lógico,
   `orq validar` saía **rc 0 sem imprimir nada** — gate silencioso, que é pior que
   gate quebrado. Resolvido no kit, sem tocar o motor: o `fixture.sh` imprime o
   caminho físico (`pwd -P`). Fica registrado porque o mesmo buraco espera
   qualquer repo instalado sob um caminho com symlink.

## Decisões que divergem do brief, e o porquê

- **`preflight_probe: true`**, não `false`. Ligá-lo custa uma sondagem paga por
  drenagem real. Desligá-lo derruba 5 checks da seção 4 do
  `test-retry-worktree.sh`, que exercita `probe_modelos` inteiro (com `claude_run`
  stubado, sem chamada paga) contra ESTE config; com `false`, `executor.sh:146` sai
  cedo. Entre "config que economiza" e "teste do motor que passa a mentir",
  escolhi o teste.
- **`docs/fila/runs/.gitignore` é escrito pelo `fixture.sh`, não versionado.** O
  `.gitignore` da raiz do fixture ignora `docs/fila/runs/` como o brief pede; o
  arquivo interno fica no DISCO e fora do índice — que é exatamente o que o
  `orquestrador-agendamento.test.ts` lê. Versioná-lo exigiria `git add -f`.
- **`_TEMPLATE.md` e `PLAYBOOK.md` do fixture vêm de `doutrina/templates/`** na
  instanciação, não de uma segunda cópia dentro de `fixture/`. Duplicar 6 KB de
  doutrina dentro do template é exatamente como as cópias divergem.
- **O ticket 001 ganhou um 5º critério em K7b** (`git diff --name-only
  $BASE_REF...HEAD -- <paths> | wc -l | tr -d ' '`, espera `2`). O caso
  `nenhum ticket da fila usa mais "main...HEAD"` cobra também a forma POSITIVA
  (`$BASE_REF...HEAD` presente em algum critério). É a forma canônica dos tickets
  reais do CI, e o gate segue aprovando o ticket sem violação.

## O que NÃO foi feito, e por quê

**K7-e2e (a travessia paga do loop) não rodou: falta o "OK e2e".**
`scripts/kit/fixture-e2e.sh` está escrito, commitado e recusa rodar sem
`ORQ_E2E_OK=1`. O anúncio que ele imprime antes de qualquer coisa:

```
$ bash scripts/kit/fixture-e2e.sh
== o que esta execução vai fazer ==
  comando        bash <fixture>/scripts/orquestrador/local-loop.sh (UMA drenagem)
  ticket         001 soma-de-negativos (docs/fila/001-soma-de-negativos.md)
  executor       sonnet
  juiz (alto)    opus
  juiz (baixo)   sonnet
  retry final    opus
  sondagem       preflight_probe = true (chamada paga antes do ticket)
  orçamento      usd_ticket = 1 · usd_dia = 5
  timeout        claude_timeout_secs = 900
  ESTA CHAMADA É PAGA.

recusado: rode com ORQ_E2E_OK=1 para confirmar que o gasto está autorizado.
(rc 2)
```

Watchdog = `claude_timeout_secs + 120` = 1020 s, com a técnica do `claude_run`
(`lib.sh:964-986`): process group próprio e TERM no GRUPO, porque o macOS não tem
`timeout`/`gtimeout` e sem isso o `claude` filho vira órfão e segue queimando cota
depois do corte. O fixture NÃO é removido no fim — se o ticket reprovar, o diff da
tentativa e o veredito cru SÃO o resultado.

---

# Diff cru, commit a commit


## `4500bb2` — K7a: fixture/ (template) e scripts/kit/fixture.sh (instanciador)

```
4500bb244038f71e4554d1d7f27bc193eb012705
K7a: fixture/ (template) e scripts/kit/fixture.sh (instanciador)

fixture/ é o repo mínimo em forma de template: package.json/vitest/tsconfig,
uma função pura em src/soma.ts com teste verde, a fila (000-config.json schema
2, liberacoes.json, decisoes-pendentes.md, rascunhos/, o ticket 001) e o
roadmap de um bloco/uma frente.

O 000-config.json é mínimo por construção: só as chaves que o motor lê hoje,
levantadas por `grep -ohE "cfg '[^']*'" scripts/orquestrador/*.sh` mais os
acessos diretos dos .ts (enforcement-core.ts:128,211; decisao.ts:71,113,277,363;
juiz.ts:64-76; gates.ts:176-178). Cada chave traz um comentário `_<chave>` com a
procedência do valor.

Dois valores não são escolha estética, e o disco diz por quê:
  - diff_cap_linhas = 600 e as 7 causas de politica_adiamento: test-lib-config.sh
    :50,:58,:61 cobra os números exatos;
  - preflight_probe = true: test-retry-worktree.sh:216 exercita probe_modelos
    inteiro (com claude_run stubado) contra este config; com `false` o
    executor.sh:146 sai cedo e aquela seção cai em 5 falhas.

scripts/kit/fixture.sh instancia em /tmp/orq-fixture-XXXXXX/repo — nunca dentro
do kit, nunca em ~/Projetos — e vendoriza o motor no mesmo mapa do ORIGEM.md
(scripts/orquestrador/, scripts/orq, scripts/roadmap/, doutrina/ ->
docs/orquestrador/skill/), que é o que a peça K8 vai reaproveitar. O caminho sai
FÍSICO (`pwd -P`) de propósito: no macOS /tmp é symlink de /private/tmp, e o
guard de CLI do gate-ticket.ts compara `import.meta.url` com
`resolve(process.argv[1])` — com o caminho lógico, `orq validar` saía 0 sem
imprimir nada.

scripts/roadmap/ entra na vendorização porque `orq mapa lint` roda
`python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT (scripts/orq:226).

Zero mudança em scripts/orquestrador/**, scripts/orq, doutrina/ e _referencia-ci/**.

Pronto quando (medido):
  FX=$(bash scripts/kit/fixture.sh)
  bash $FX/scripts/orq            -> ESTADO ocioso / FILA 1 pendente
  bash $FX/scripts/orq validar --pendentes -> rc 0, zero violação
  cd $FX && npx vitest run        -> 1 arquivo, 3 testes, verde
  npx tsc --noEmit                -> limpo
  python3 scripts/roadmap/lint-mapa.py -> 10 passaram, 0 falharam, 0 aviso
  git status -sb                  -> limpo

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013KUjZwVRT1xAq4N4TKVhh6


 fixture/docs/fila/000-config.json          | 273 +++++++++++++++++++++++++++++
 fixture/docs/fila/001-soma-de-negativos.md |  74 ++++++++
 fixture/docs/fila/decisoes-pendentes.md    |   8 +
 fixture/docs/fila/liberacoes.json          |   3 +
 fixture/docs/fila/rascunhos/.gitkeep       |   0
 fixture/docs/orquestrador/PECAS.md         |  11 ++
 fixture/docs/roadmap/MAPA.md               |  20 +++
 fixture/docs/roadmap/mapa.json             |  33 ++++
 fixture/gitignore                          |  22 +++
 fixture/package.json                       |  20 +++
 fixture/src/soma.ts                        |  12 ++
 fixture/test/soma.test.ts                  |  16 ++
 fixture/tsconfig.json                      |  23 +++
 fixture/vitest.config.ts                   |   9 +
 scripts/kit/fixture.sh                     | 175 ++++++++++++++++++
 15 files changed, 699 insertions(+)
```

### diff

```diff
diff --git a/fixture/docs/fila/000-config.json b/fixture/docs/fila/000-config.json
new file mode 100644
index 0000000..f684496
--- /dev/null
+++ b/fixture/docs/fila/000-config.json
@@ -0,0 +1,273 @@
+{
+  "$schema_versao": 2,
+  "descricao": "Config do repo de FIXTURE do kit. Mínimo por construção: só as chaves que o motor LÊ hoje, levantadas por grep no disco (grep -ohE \"cfg '[^']*'\" scripts/orquestrador/*.sh, mais os acessos diretos dos .ts). Cada chave traz um comentário _<chave> com a procedência do valor.",
+  "_procedencia_geral": "Valores de forma vêm de doutrina/templates/config.json; valores de conteúdo, de _referencia-ci/000-config.ci.json (o config REAL do conteudos-infinitos @711ab5e) quando um teste do motor cobra o número exato; o resto é do fixture.",
+
+  "branch_alvo": "staging-auto",
+  "_branch_alvo": "doutrina/templates/config.json:branch_alvo — lido por lib.sh:53 (CFG_BRANCH_ALVO).",
+  "branch_protegida": "main",
+  "_branch_protegida": "local-loop.sh:28 lê '.branch_protegida' (o template chama de branch_principal; o motor lê ESTE nome).",
+
+  "max_retries": 2,
+  "_max_retries": "_referencia-ci/000-config.ci.json:max_retries — lido por lib.sh:54 e decisao.ts:273.",
+  "cooldown_minutes": 60,
+  "_cooldown_minutes": "_referencia-ci/000-config.ci.json:cooldown_minutes — lido por lib.sh (cooldown_arm).",
+
+  "politica_adiamento": {
+    "regra": "Falha de INFRAESTRUTURA adia. Nunca reprova.",
+    "causas_que_adiam": [
+      "erro de conexão",
+      "sessão expirada",
+      "rate limit",
+      "quota estourada",
+      "timeout de claude_timeout_secs",
+      "gate interrompido no meio",
+      "veredito do juiz ilegível"
+    ],
+    "efeito": {
+      "status": "pendente",
+      "conta_como_retry": false,
+      "cooldown": "grava runs/.cooldown-until = agora + cooldown_minutes"
+    }
+  },
+  "_politica_adiamento": "As 7 causas, na ordem, de _referencia-ci/000-config.ci.json — test-lib-config.sh:58 cobra exatamente 7 e :61 cobra a do juiz pelo nome; decisao.ts:113 itera a lista.",
+
+  "politica_retry": {
+    "por_causa": {
+      "diff_cap": {
+        "modelo": "MANTER",
+        "acao": "estreitar o escopo no prompt de retry (fatiar o ticket, reduzir pathspec_allowlist)"
+      },
+      "enforcement": {
+        "modelo": "MANTER",
+        "acao": "estreitar o escopo no prompt de retry (respeitar a pathspec_allowlist, sair da zona proibida)"
+      },
+      "criterio_qualidade": {
+        "modelo": "ESCALAR",
+        "acao": "subir para retry_final_model e repetir com o mesmo escopo"
+      }
+    },
+    "proibicao": "NUNCA escalar modelo por falha de tamanho (diff_cap) nem por violação de fronteira (enforcement)."
+  },
+  "_politica_retry": "_referencia-ci/000-config.ci.json:politica_retry, sem os campos _porque — decisao.ts:277 indexa por_causa[causa] e rejeita config que mande escalar por diff_cap/enforcement.",
+
+  "migrations_dir": "db/migrations",
+  "_migrations_dir": "enforcement-core.ts:128 usa para classificar .sql como artefato inerte. O fixture não tem banco; o diretório existe só para a chave não ser nula.",
+  "sql_pendente_dir": "docs/sql-pendente",
+  "_sql_pendente_dir": "enforcement-core.ts:128, mesmo par que migrations_dir.",
+
+  "worktrees_dir": "../_worktrees",
+  "_worktrees_dir": "RELATIVO ao checkout principal (lib.sh:77). Como o fixture é instanciado em <tmp>/repo, isto resolve para <tmp>/_worktrees — nunca ~/Projetos/_worktrees.",
+  "worktrees_prefixo": "fx-",
+  "_worktrees_prefixo": "decisao.ts:363. 'fx-' em vez do 'ci-' do conteudos-infinitos: prefixo diferente é o que impede colisão de nome de worktree entre repos.",
+
+  "runs_dir": "docs/fila/runs",
+  "_runs_dir": "doutrina/templates/config.json:runs_dir — lib.sh:72 (RUNS_BASE).",
+  "liberacoes_file": "docs/fila/liberacoes.json",
+  "_liberacoes_file": "doutrina/templates/config.json — lib.sh:56 (CFG_LIBERACOES).",
+  "decisoes_file": "docs/fila/decisoes-pendentes.md",
+  "_decisoes_file": "doutrina/templates/config.json — lib.sh:723.",
+  "pausar_file": "docs/fila/PAUSAR",
+  "_pausar_file": "doutrina/templates/config.json — lib.sh:615 (kill switch em arquivo).",
+
+  "modelos": {
+    "classificador": "haiku",
+    "executor": "sonnet",
+    "planejador": "sonnet",
+    "juiz_baixo": "sonnet",
+    "juiz_alto": "opus",
+    "juiz_ticket": "opus",
+    "retry_final": "opus"
+  },
+  "executor_model": "sonnet",
+  "avaliador_model": "opus",
+  "retry_final_model": "opus",
+  "_modelos": "Escada de _referencia-ci/000-config.ci.json (sonnet/opus/opus). juiz.ts:76 lê modelos.juiz_alto/juiz_baixo; executor.sh:149 e decisao.ts:292 leem os três aliases v1.",
+
+  "restricao_execucao": {
+    "ativa": false,
+    "tickets_permitidos": [],
+    "recusa_exit_code": 78,
+    "recusa_mensagem": "RECUSADO: há modelo por papel em PENDENTE_* e a restrição de execução está ativa.",
+    "desbloqueio": "preencha executor_model/avaliador_model/retry_final_model em docs/fila/000-config.json"
+  },
+  "_restricao_execucao": "decisao.ts:71 lê o objeto inteiro; executor.sh:154 lê .desbloqueio na mensagem de aborto. Inativa aqui: nenhum papel é PENDENTE_*.",
+
+  "diff_cap_linhas": 600,
+  "_diff_cap_linhas": "600 de _referencia-ci/000-config.ci.json — test-lib-config.sh:50 cobra literalmente 600 ('o NOSSO, não o 2500 do comarka-os').",
+  "claude_timeout_secs": 900,
+  "_claude_timeout_secs": "Metade do 1800 do CI: o ticket do fixture é de ~40 linhas e um timeout longo só atrasa o diagnóstico quando o agente trava.",
+  "claude_max_turns": 40,
+  "_claude_max_turns": "doutrina/templates/config.json:claude_max_turns (o CI usa 80; 40 basta para um ticket de dois arquivos).",
+
+  "preflight_probe": true,
+  "_preflight_probe": "LIGADO, e não por gosto: executor.sh:146 sai cedo quando o valor é `false`, e test-retry-worktree.sh:216 exercita `probe_modelos` inteiro (com `claude_run` stubado, sem chamada paga) contra ESTE config — com `false` a seção 4 daquele teste cai em 5 falhas. O preço é uma sondagem real de ~60s ('responda apenas: ok') por drenagem de verdade, que o gate de orçamento mede e o custo.json registra.",
+  "preflight_env_keys": [],
+  "_preflight_env_keys": "Vazio: executor.sh:123 itera esta lista e aborta por env faltando. O fixture não tem serviço externo nenhum.",
+
+  "commit_checkpoint": {
+    "obrigatorio": true,
+    "quando": "a cada unidade lógica que passe typecheck + teste — não só no fim do ticket",
+    "_regra": "Passou typecheck e teste? Commita. Trabalho verificado e não commitado não existe."
+  },
+  "_commit_checkpoint": "executor.sh lê .commit_checkpoint.quando e ._regra para montar o prompt; texto de _referencia-ci/000-config.ci.json.",
+
+  "repo_origin_deve_conter": "fixture/orq-fixture",
+  "_repo_origin_deve_conter": "Casa o origin FALSO que o scripts/kit/fixture.sh registra (git@example.invalid:fixture/orq-fixture.git). executor.sh:104-108 aborta o run inteiro se o origin não contiver isto.",
+  "ambiente_id": "orqfixture",
+  "_ambiente_id": "executor.sh:111-114 compara com o ref extraído de SUPABASE_URL do .env.local, que o fixture.sh escreve como https://orqfixture.supabase.co. test-lib-config.sh:48 cobra que não seja vazio nem null.",
+
+  "zona_proibida": {
+    "descricao": "Tudo que o loop NUNCA escreve. Globs relativos à raiz do repo.",
+    "revisado_humano": true,
+    "no_write_paths": [
+      ".env*",
+      "**/.env*",
+      "docs/orquestrador/**",
+      "scripts/orquestrador/**"
+    ],
+    "no_write_credenciais": {
+      "padroes": [
+        "**/*.pem",
+        "**/*.key",
+        "**/id_rsa*",
+        "**/credentials*",
+        "**/secrets*"
+      ]
+    },
+    "no_write_tables": "TODAS"
+  },
+  "_zona_proibida": "Recorte do de _referencia-ci/000-config.ci.json: enforcement-core.ts:211-215 lê no_write_paths + no_write_credenciais.padroes, e :212 trata no_write_tables == 'TODAS' como negação total. Sem banco no fixture, 'TODAS' é a leitura honesta.",
+
+  "paths_harness": [
+    "scripts/orquestrador/**",
+    "docs/orquestrador/**",
+    "docs/fila/000-config.json",
+    ".claude/**"
+  ],
+  "_paths_harness": "doutrina/templates/config.json:paths_harness, sem mudança — o motor vendorizado mora nos mesmos caminhos aqui. Lido pelo check 5 de scripts/roadmap/lint-mapa.py.",
+
+  "_execucao_dos_gates": {
+    "ordem_obrigatoria": [
+      "typecheck",
+      "test"
+    ],
+    "interrupcao": "NAO_VALE_PARCIALMENTE"
+  },
+  "_ordem": "gates.ts:176-178 ordena .gates[] por esta lista e ERRA se divergir. Dois gates porque o package.json do fixture tem dois scripts: typecheck e test.",
+
+  "gates": [
+    {
+      "nome": "typecheck",
+      "cmd": "npm run typecheck",
+      "tipo": "exit_code",
+      "descricao": "tsc --noEmit do package.json do fixture."
+    },
+    {
+      "nome": "test",
+      "cmd": "npm test",
+      "tipo": "exit_code",
+      "descricao": "vitest run do package.json do fixture."
+    }
+  ],
+  "_gates": "cmd = os scripts do fixture/package.json, verificados no disco. tipo exit_code (não baseline): o fixture nasce com 0 erro de tipo e 3 testes verdes, então não há erro herdado a tolerar.",
+
+  "canal_notificacao": "arquivo",
+  "_canal_notificacao": "lib.sh:820-823: qualquer valor diferente de 'notificacao_nativa' faz a notificação ficar SÓ no arquivo runs/notificacoes.log. É o padrão que a peça K10 quer para todo repo.",
+  "push_suprimido": true,
+  "_push_suprimido": "O origin do fixture é inválido de propósito (example.invalid). Publicar daqui não é opção — e lib.sh:staging_linha já imprime 'push suprimido' no snapshot.",
+
+  "juiz": {
+    "diff_max_baixo": 300,
+    "max_tokens_veredicto": 300,
+    "paths_alto_risco": [],
+    "palavras_alto_risco": [
+      "auth",
+      "login",
+      "senha",
+      "token",
+      "pagamento",
+      "billing",
+      "migration",
+      "schema",
+      "rls",
+      "permiss"
+    ]
+  },
+  "_juiz": "juiz.ts:64-76 lê os quatro campos. paths_alto_risco VAZIO: o fixture só tem src/ e test/, e listar glob que não casa nada seria config decorativa. As palavras são as do doutrina/templates/config.json.",
+
+  "gate_ticket": {
+    "juiz_para_humano": false,
+    "max_paths_allowlist": 8,
+    "timeout_cmd_secs": 120,
+    "cmd_prefixos_permitidos": [
+      "npx vitest run",
+      "npx tsc",
+      "npm run test",
+      "npm run typecheck",
+      "node scripts/",
+      "test -f",
+      "test -s",
+      "grep -",
+      "jq "
+    ],
+    "filtros_permitidos": [
+      "grep",
+      "wc",
+      "head",
+      "tail",
+      "jq",
+      "cut",
+      "sort",
+      "uniq",
+      "tr"
+    ],
+    "proibido_no_cmd": [
+      "$(",
+      "`",
+      "sh -c",
+      "bash",
+      "eval",
+      "sudo",
+      "rm ",
+      "curl http",
+      "curl https",
+      "wget",
+      "> ",
+      ">>"
+    ]
+  },
+  "_gate_ticket": "gate-ticket.ts:carregarCfg lê SÓ proibido_no_cmd e cmd_prefixos_permitidos (os dois nomes conferidos no disco). Os prefixos são o subconjunto do doutrina/templates/config.json que existe neste fixture: sem npm run build, sem npm run lint, sem curl (não há servidor local).",
+
+  "orcamento": {
+    "usd_dia": 5,
+    "tokens_dia": 2000000,
+    "usd_ticket": 1,
+    "custo_file": "docs/fila/runs/custo.json",
+    "campos_usage": {
+      "custo_usd": "total_cost_usd",
+      "tokens_in": "usage.input_tokens",
+      "tokens_out": "usage.output_tokens",
+      "tokens_cache": "usage.cache_read_input_tokens"
+    }
+  },
+  "_orcamento": "campos_usage copiados de _referencia-ci/000-config.ci.json (nomes confirmados lá por sondagem real de claude -p --output-format json). Os TETOS são do fixture e propositalmente baixos: usd_ticket 1 contra os 10 do CI — um ticket de dois arquivos que passe de US$ 1 é sintoma, não trabalho.",
+
+  "executor": {
+    "auto_verificacao_max": 2,
+    "modo_arquiteto_para_alto": false,
+    "saida_compactada": true,
+    "narracao_proibida": true,
+    "trailer_commit": "Orq-Ticket"
+  },
+  "_executor": "local-loop.sh:95 lê .executor.trailer_commit para o trailer do merge commit; o resto é o default de doutrina/templates/config.json.",
+
+  "proibicoes_absolutas": [
+    "nunca push na branch principal",
+    "nunca escrever na zona proibida",
+    "nunca tocar credenciais/segredos",
+    "nunca escrever em paths_harness pela fila",
+    "git add sempre por pathspec explícito"
+  ],
+  "_proibicoes_absolutas": "doutrina/templates/config.json, sem as duas linhas de DDL/banco: o fixture não tem banco."
+}
diff --git a/fixture/docs/fila/001-soma-de-negativos.md b/fixture/docs/fila/001-soma-de-negativos.md
new file mode 100644
index 0000000..6b0698d
--- /dev/null
+++ b/fixture/docs/fila/001-soma-de-negativos.md
@@ -0,0 +1,74 @@
+# Ticket: soma só dos negativos
+
+> A **fonte de verdade de máquina** é o bloco ```json abaixo. Os scripts do
+> orquestrador leem e escrevem SÓ esse bloco (via jq). A prosa é para humanos
+> e é ignorada pela automação.
+
+## Objetivo (prosa)
+
+`src/soma.ts` hoje exporta uma função só: `soma(numeros)`, que soma a lista
+inteira (verificado no disco — o arquivo tem 11 linhas e um único `export`).
+Este ticket pede a função irmã, `somaNegativos(numeros)`, que soma só os
+elementos menores que zero, mais o caso de teste que a exercita.
+
+Recon feito: os dois paths da allowlist existem no disco (`src/soma.ts` e
+`test/soma.test.ts`, ambos versionados no commit inicial do fixture). Nenhum
+arquivo novo é criado, por isso `cria_novo` é lista vazia.
+
+É o ticket mais barato que ainda é um ticket de verdade: uma unidade lógica,
+uma camada, um critério `alvo` que só fica verde depois da implementação.
+
+## Campos de máquina
+
+```json
+{
+  "id": "001",
+  "bloco": "B0",
+  "frente": "B0-F1",
+  "slug": "soma-de-negativos",
+  "origem": "humano",
+  "objetivo": "Adicione a src/soma.ts a função exportada somaNegativos(numeros: number[]): number, que devolve a soma APENAS dos elementos menores que zero (lista sem negativos devolve 0), e acrescente a test/soma.test.ts um caso chamado 'somaNegativos soma só os menores que zero' que verifique somaNegativos([-2, 3, -4]) === -6 e somaNegativos([1, 2]) === 0. FORA DE ESCOPO: alterar a função soma existente, mexer em qualquer outro arquivo, instalar dependência.",
+  "pathspec_allowlist": [
+    "src/soma.ts",
+    "test/soma.test.ts"
+  ],
+  "cria_novo": [],
+  "dependencias": [],
+  "diff_estimado": 20,
+  "risco": "",
+  "criterios_aceite": [
+    {
+      "tipo": "guarda",
+      "descricao": "typecheck não regride: nenhum erro de tipo no fixture",
+      "cmd": "npx tsc --noEmit 2>&1 | grep -c 'error TS'",
+      "espera": "0"
+    },
+    {
+      "tipo": "alvo",
+      "descricao": "o caso novo de somaNegativos aparece no relatório do vitest (DEVE estar ausente antes de implementar)",
+      "cmd": "npx vitest run test/soma.test.ts --reporter=verbose 2>&1 | grep -E 'somaNegativos'",
+      "espera": "somaNegativos"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "a suíte inteira segue verde",
+      "cmd": "npx vitest run 2>&1 | grep -cE 'Tests +[0-9]+ passed'",
+      "espera": "1"
+    },
+    {
+      "tipo": "avaliador",
+      "descricao": "avaliador: a função nova é EXPORTADA e o teste novo a IMPORTA e a chama — arquivo que existe mas ninguém importa não conta; nenhuma asserção do teste existente foi removida, afrouxada ou marcada como skip; a função soma original continua byte-idêntica.",
+      "cmd": "true",
+      "espera": "avaliador"
+    }
+  ],
+  "status": "pendente",
+  "notas_status": "",
+  "hash_candidato": "",
+  "sinal_hash": "",
+  "gate_ok": "",
+  "pid": null,
+  "iniciado_em": "",
+  "adiado_ate": ""
+}
+```
diff --git a/fixture/docs/fila/decisoes-pendentes.md b/fixture/docs/fila/decisoes-pendentes.md
new file mode 100644
index 0000000..e41c05f
--- /dev/null
+++ b/fixture/docs/fila/decisoes-pendentes.md
@@ -0,0 +1,8 @@
+# Decisões pendentes (escrito pela máquina, resolvido pelo dono)
+
+> Uma linha por pendência. Resolvida em `/arquitetar --decisoes`; a decisão vai para onde mora
+> (ADR, mapa.json, config, liberações) e a linha é removida. Lista com mais de 10 linhas
+> significa MAPA ambíguo: voltar à Fase 0.
+
+| Data | Origem | Frente/Ticket | Pergunta | O que a máquina viu |
+|---|---|---|---|---|
diff --git a/fixture/docs/fila/liberacoes.json b/fixture/docs/fila/liberacoes.json
new file mode 100644
index 0000000..5f72bb8
--- /dev/null
+++ b/fixture/docs/fila/liberacoes.json
@@ -0,0 +1,3 @@
+{
+  "tokens": []
+}
diff --git a/fixture/docs/fila/rascunhos/.gitkeep b/fixture/docs/fila/rascunhos/.gitkeep
new file mode 100644
index 0000000..e69de29
diff --git a/fixture/docs/orquestrador/PECAS.md b/fixture/docs/orquestrador/PECAS.md
new file mode 100644
index 0000000..3eebb86
--- /dev/null
+++ b/fixture/docs/orquestrador/PECAS.md
@@ -0,0 +1,11 @@
+# PEÇAS — backlog do orq-fixture
+
+> Backlog, não histórico. Uma linha de objetivo · evidência no disco · teste que prova.
+
+## FEITAS
+
+(nenhuma)
+
+## PENDENTES
+
+(nenhuma — a fila do fixture é o ticket 001 e mais nada)
diff --git a/fixture/docs/roadmap/MAPA.md b/fixture/docs/roadmap/MAPA.md
new file mode 100644
index 0000000..ff420ef
--- /dev/null
+++ b/fixture/docs/roadmap/MAPA.md
@@ -0,0 +1,20 @@
+# MAPA do roadmap: orq-fixture
+
+> Fonte única do roadmap, junto com `mapa.json` (máquina). `orq mapa lint` confere que os
+> IDs daqui e de lá são os mesmos. Um bloco, uma frente: o fixture existe para atravessar o
+> loop, não para ter roadmap.
+
+## Convenções
+- Bloco = épico. Tem DoD verificável por humano em uma sessão.
+- Frente = unidade que o planejador decompõe. Tem allowlist comum, deps por ID e status.
+- Ticket = único nível que entra na fila.
+- Status de frente: `rascunho` → `pronta` → `em_andamento` → `concluida` | `bloqueada_humano`.
+
+## B0 · Aritmética mínima
+**Por que existe:** o ticket 001 precisa pertencer a uma frente; sem bloco e frente o lint do mapa não tem o que conferir.
+**DoD (gate humano):** `npx vitest run` verde e `npx tsc --noEmit` limpo, com as funções de `src/soma.ts` exercitadas uma a uma.
+**Gates humanos:** nenhum — o fixture não depende de nada fora dele.
+
+| Frente | Entrega | Allowlist comum | Deps | Status |
+|---|---|---|---|---|
+| B0-F1 | Funções puras de soma em `src/soma.ts`, com teste por caso | `src/**`, `test/**` | nenhuma | pronta |
diff --git a/fixture/docs/roadmap/mapa.json b/fixture/docs/roadmap/mapa.json
new file mode 100644
index 0000000..f7a5db0
--- /dev/null
+++ b/fixture/docs/roadmap/mapa.json
@@ -0,0 +1,33 @@
+{
+  "$schema_versao": 1,
+  "projeto": "orq-fixture",
+  "blocos": [
+    {
+      "id": "B0",
+      "nome": "Aritmética mínima",
+      "por_que": "O fixture precisa de uma frente real para o ticket 001 pertencer a alguma coisa; sem bloco e frente, o lint do mapa não tem o que conferir.",
+      "dod": [
+        "src/soma.ts exporta as funções que os testes de test/soma.test.ts exercitam",
+        "npx vitest run sai verde e npx tsc --noEmit sai limpo"
+      ],
+      "gates_humanos": [],
+      "status": "em_andamento",
+      "frentes": [
+        {
+          "id": "B0-F1",
+          "entrega": "Funções puras de soma em src/soma.ts, com teste por caso em test/soma.test.ts",
+          "allowlist": [
+            "src/**",
+            "test/**"
+          ],
+          "cria_novo": false,
+          "deps": [],
+          "adrs": [],
+          "status": "pronta",
+          "tickets_estimados": 1,
+          "lotes_descartados_consecutivos": 0
+        }
+      ]
+    }
+  ]
+}
diff --git a/fixture/gitignore b/fixture/gitignore
new file mode 100644
index 0000000..4897d5a
--- /dev/null
+++ b/fixture/gitignore
@@ -0,0 +1,22 @@
+# .gitignore do repo de fixture. O nome no template é `gitignore` (sem ponto) e o
+# scripts/kit/fixture.sh o renomeia ao instanciar: um `.gitignore` de verdade
+# aqui dentro valeria para a árvore do KIT, não só para o fixture.
+
+# As DUAS formas de node_modules, de propósito (é a lição já paga em
+# _referencia-ci/gitignore.ci): `node_modules/` com barra só casa DIRETÓRIO, e
+# aqui — como nas worktrees do executor — node_modules é um SYMLINK. Sem a forma
+# sem barra ele aparece como `?? node_modules` no porcelain, que é exatamente o
+# que o preflight de árvore limpa reprova.
+node_modules
+node_modules/
+
+# Evidência de run é efêmera. docs/fila/runs/.gitignore continua no DISCO (o
+# fixture.sh o escreve) e fora do índice: é dele que o teste do wrapper do
+# launchd lê o `*`.
+docs/fila/runs/
+
+# Kill switch da fila: estado local da máquina, nunca versionado.
+docs/fila/PAUSAR
+
+# Só existe pela chave SUPABASE_URL que o preflight de identidade confere.
+.env.local
diff --git a/fixture/package.json b/fixture/package.json
new file mode 100644
index 0000000..14c2b8d
--- /dev/null
+++ b/fixture/package.json
@@ -0,0 +1,20 @@
+{
+  "name": "orq-fixture",
+  "version": "0.0.1",
+  "private": true,
+  "type": "module",
+  "description": "Repo mínimo que o kit instancia para exercitar o motor ponta a ponta. Não é biblioteca: existe só para atravessar o loop.",
+  "engines": {
+    "node": ">=20"
+  },
+  "scripts": {
+    "test": "vitest run",
+    "typecheck": "tsc --noEmit"
+  },
+  "devDependencies": {
+    "@types/node": "^22.20.0",
+    "tsx": "^4.19.0",
+    "typescript": "^5.6.0",
+    "vitest": "^2.1.0"
+  }
+}
diff --git a/fixture/src/soma.ts b/fixture/src/soma.ts
new file mode 100644
index 0000000..1f20217
--- /dev/null
+++ b/fixture/src/soma.ts
@@ -0,0 +1,12 @@
+/**
+ * A única unidade de código do fixture: função pura, sem I/O e sem dependência.
+ *
+ * O ticket 001 pede uma segunda função ao lado desta. Se o loop entregar, é
+ * AQUI que o diff aparece — e é por isso que `src/soma.ts` é um dos dois paths
+ * da `pathspec_allowlist` do ticket.
+ */
+
+/** Soma todos os números da lista. Lista vazia soma 0. */
+export function soma(numeros: number[]): number {
+  return numeros.reduce((acc, n) => acc + n, 0);
+}
diff --git a/fixture/test/soma.test.ts b/fixture/test/soma.test.ts
new file mode 100644
index 0000000..951ce73
--- /dev/null
+++ b/fixture/test/soma.test.ts
@@ -0,0 +1,16 @@
+import { describe, it, expect } from 'vitest';
+import { soma } from '../src/soma.js';
+
+describe('soma', () => {
+  it('soma uma lista de positivos', () => {
+    expect(soma([1, 2, 3])).toBe(6);
+  });
+
+  it('lista vazia soma 0', () => {
+    expect(soma([])).toBe(0);
+  });
+
+  it('mistura de sinais soma o total, sem filtrar', () => {
+    expect(soma([-2, 3, -4])).toBe(-3);
+  });
+});
diff --git a/fixture/tsconfig.json b/fixture/tsconfig.json
new file mode 100644
index 0000000..345969c
--- /dev/null
+++ b/fixture/tsconfig.json
@@ -0,0 +1,23 @@
+{
+  "compilerOptions": {
+    "target": "ES2022",
+    "module": "NodeNext",
+    "moduleResolution": "NodeNext",
+    "lib": ["ES2022"],
+    "types": ["node"],
+    "strict": true,
+    "noUncheckedIndexedAccess": true,
+    "exactOptionalPropertyTypes": true,
+    "noImplicitOverride": true,
+    "verbatimModuleSyntax": true,
+    "resolveJsonModule": true,
+    "esModuleInterop": true,
+    "skipLibCheck": true,
+    "forceConsistentCasingInFileNames": true,
+    "noEmit": true,
+    "outDir": "dist",
+    "rootDir": "."
+  },
+  "include": ["src", "test"],
+  "exclude": ["node_modules", "dist", "scripts", "docs"]
+}
diff --git a/fixture/vitest.config.ts b/fixture/vitest.config.ts
new file mode 100644
index 0000000..93f09b2
--- /dev/null
+++ b/fixture/vitest.config.ts
@@ -0,0 +1,9 @@
+import { defineConfig } from 'vitest/config';
+
+export default defineConfig({
+  test: {
+    include: ['test/**/*.test.ts'],
+    environment: 'node',
+    globals: false,
+  },
+});
diff --git a/scripts/kit/fixture.sh b/scripts/kit/fixture.sh
new file mode 100644
index 0000000..c0b8108
--- /dev/null
+++ b/scripts/kit/fixture.sh
@@ -0,0 +1,175 @@
+#!/usr/bin/env bash
+# fixture.sh — INSTANCIA o repo de fixture (peça K7a).
+#
+# `fixture/` no kit é TEMPLATE: arquivos soltos, sem .git, sem motor dentro.
+# Este script transforma o template num repo de verdade, num diretório
+# temporário, com a cópia VENDORIZADA do motor dentro — e é essa cópia que a
+# peça K8 (`instalar.sh --novo`) vai reaproveitar: o mapa origem→destino daqui é
+# o mesmo do ORIGEM.md.
+#
+# CONTRATO DE SAÍDA: a ÚLTIMA linha do stdout é o caminho do fixture e nada
+# mais. Todo log vai para stderr. É o que permite `FX="$(bash scripts/kit/fixture.sh)"`.
+#
+# Onde ele NUNCA cria nada: dentro do kit e dentro de ~/Projetos. O fixture vive
+# em /tmp/orq-fixture-XXXXXX/repo, e as worktrees do motor caem em
+# /tmp/orq-fixture-XXXXXX/_worktrees (é o `worktrees_dir: "../_worktrees"` do
+# config resolvido contra o checkout principal, lib.sh:77) — nunca no
+# ~/Projetos/_worktrees compartilhado.
+#
+# O origin é FALSO por construção (git@example.invalid:fixture/orq-fixture.git):
+# `example.invalid` é reservado pela RFC 2606 e não resolve. Se o loop um dia
+# tentar push, falha alto — e isso é resultado de teste, não acidente.
+#
+# Uso:
+#   bash scripts/kit/fixture.sh              instancia e imprime o caminho (padrão)
+#   bash scripts/kit/fixture.sh --manter     idem (explícito; nada é removido)
+#   bash scripts/kit/fixture.sh --limpar DIR remove o fixture DIR e o tmp que o contém
+
+set -euo pipefail
+
+KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
+PREFIXO=/tmp/orq-fixture-
+
+log() { printf '[fixture] %s\n' "$*" >&2; }
+die() { printf '[fixture ERRO] %s\n' "$*" >&2; exit 1; }
+
+# --- --limpar -----------------------------------------------------------------
+# Só apaga o que TEM a cara de um fixture nosso: o pai precisa começar com
+# $PREFIXO. rm -rf num caminho vindo de argumento, sem essa trava, é como se
+# apaga o diretório errado uma vez só.
+limpar() {
+  local alvo="${1:-}" pai
+  [ -n "$alvo" ] || die "--limpar exige o caminho do fixture"
+  [ -d "$alvo" ] || { log "nada a limpar: '$alvo' não é diretório"; return 0; }
+  alvo="$(cd "$alvo" && pwd -P)"
+  pai="$(dirname "$alvo")"
+  case "$pai" in
+    "$(cd /tmp && pwd -P)"/orq-fixture-*) : ;;
+    *) die "recuso apagar '$alvo': o pai '$pai' não é um tmp de fixture ($PREFIXO*)" ;;
+  esac
+  # As worktrees do motor moram no MESMO tmp; apagar só o repo deixaria lixo.
+  rm -rf "$pai"
+  log "removido: $pai"
+}
+
+case "${1:-}" in
+  --limpar) shift; limpar "${1:-}"; exit 0 ;;
+  --manter|'') : ;;
+  *) die "opção desconhecida: $1 (use --manter ou --limpar <dir>)" ;;
+esac
+
+# --- pré-condições ------------------------------------------------------------
+for f in fixture/package.json fixture/docs/fila/000-config.json scripts/orq \
+         scripts/orquestrador/lib.sh doutrina/SKILL.md VERSAO; do
+  [ -e "$KIT/$f" ] || die "o kit não tem '$f' — este script roda de dentro do kit"
+done
+[ -d "$KIT/node_modules" ] || die "o kit não tem node_modules — rode 'npm install' antes (o fixture o compartilha por symlink)"
+
+# --- 1. tmp + árvore ----------------------------------------------------------
+# `pwd -P` NÃO é higiene: no macOS /tmp é symlink de /private/tmp, e o guard de
+# CLI do gate-ticket.ts compara `import.meta.url` (que o node resolve fisicamente)
+# com `resolve(process.argv[1])`. Passar o caminho lógico faz a comparação falhar
+# e `orq validar` sair 0 sem imprimir nada — gate silencioso, que é pior que gate
+# quebrado. Medido: com /tmp/... o relatório vinha vazio; com /private/tmp/..., não.
+TMP="$(cd "$(mktemp -d "${PREFIXO}XXXXXX")" && pwd -P)"
+FX="$TMP/repo"
+mkdir -p "$FX" "$TMP/_worktrees"
+log "tmp: $TMP"
+
+# --- 2. o template ------------------------------------------------------------
+# cp -R do CONTEÚDO (a barra final importa no macOS: sem ela o cp aninharia
+# 'fixture' dentro do destino).
+cp -R "$KIT/fixture/." "$FX/"
+mv "$FX/gitignore" "$FX/.gitignore"
+
+# --- 3. o motor, vendorizado --------------------------------------------------
+# Este bloco É a vendorização: o mesmo mapa origem→destino do ORIGEM.md, que a
+# peça K8 vai reaproveitar no `instalar.sh --novo`.
+#   kit scripts/orquestrador/  ->  repo scripts/orquestrador/
+#   kit scripts/orq            ->  repo scripts/orq
+#   kit scripts/roadmap/       ->  repo scripts/roadmap/
+#   kit doutrina/              ->  repo docs/orquestrador/skill/
+#   kit VERSAO                 ->  repo docs/orquestrador/skill/VERSAO
+mkdir -p "$FX/scripts" "$FX/docs/orquestrador/skill"
+cp -R "$KIT/scripts/orquestrador" "$FX/scripts/orquestrador"
+cp "$KIT/scripts/orq" "$FX/scripts/orq"
+chmod +x "$FX/scripts/orq"
+# scripts/roadmap TAMBÉM é motor, e o disco prova: `orq mapa lint` roda
+# `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT (scripts/orq:226).
+# Sem esta cópia o subcomando morre com "No such file or directory" no repo instalado.
+cp -R "$KIT/scripts/roadmap" "$FX/scripts/roadmap"
+# Plist INSTANCIADO não é motor: é artefato de uma máquina (caminhos absolutos).
+# Só o .template atravessa. Regra por sufixo, não por nome: o nome do plist muda
+# por repo, e um dia (peça K6) vira com.orquestrador.plist.template.
+find "$FX/scripts/orquestrador" -name '*.plist' ! -name '*.plist.template' -exec rm -f {} +
+cp -R "$KIT/doutrina/." "$FX/docs/orquestrador/skill/"
+cp "$KIT/VERSAO" "$FX/docs/orquestrador/skill/VERSAO"
+
+# Os dois artefatos que a doutrina manda vir do template, e não de uma segunda
+# cópia dentro de fixture/: duplicar aqui é como as cópias divergem.
+cp "$KIT/doutrina/templates/TICKET.md" "$FX/docs/fila/_TEMPLATE.md"
+cp "$KIT/doutrina/templates/PLAYBOOK-seed.md" "$FX/docs/orquestrador/PLAYBOOK.md"
+
+# --- 4. runs/ (não versionado) ------------------------------------------------
+# Mesma convenção do checkout real: o próprio diretório se ignora. O
+# .gitignore da raiz já exclui docs/fila/runs/, então este arquivo fica no disco
+# e fora do índice — que é exatamente o que o teste do wrapper do launchd lê.
+mkdir -p "$FX/docs/fila/runs"
+cat > "$FX/docs/fila/runs/.gitignore" <<'GI'
+# Evidência de run é efêmera: fica no disco, nunca no git.
+# Sem isto, o run suja a árvore e o preflight do run SEGUINTE morre.
+*
+!.gitkeep
+!.gitignore
+GI
+printf '{"dias":{}}\n' > "$FX/docs/fila/runs/custo.json"
+
+# --- 5. node_modules e .env.local --------------------------------------------
+# node_modules por SYMLINK para o do kit: as devDependencies do fixture são as
+# mesmas (fixture/package.json), e instalar de novo custaria minutos por run.
+ln -sfn "$KIT/node_modules" "$FX/node_modules"
+# .env.local existe por causa de UMA chave: o preflight de identidade
+# (executor.sh:111-114) extrai o ref de SUPABASE_URL e o compara com
+# `ambiente_id`. Não versionado, como em qualquer repo de verdade.
+printf 'SUPABASE_URL=https://orqfixture.supabase.co\n' > "$FX/.env.local"
+
+# --- 6. git -------------------------------------------------------------------
+git -C "$FX" init -q -b main 2>/dev/null || {
+  git -C "$FX" init -q
+  git -C "$FX" symbolic-ref HEAD refs/heads/main
+}
+git -C "$FX" remote add origin 'git@example.invalid:fixture/orq-fixture.git'
+# Identidade fixa: o fixture não herda a do usuário, e um `user.email` ausente
+# na máquina faria o commit inicial falhar — com o repo já meio montado.
+git -C "$FX" config user.name  'orq fixture'
+git -C "$FX" config user.email 'fixture@example.invalid'
+
+# git add SEMPRE por pathspec explícito (proibicoes_absolutas do config).
+git -C "$FX" add -- \
+  .gitignore package.json vitest.config.ts tsconfig.json \
+  src test docs scripts
+git -C "$FX" commit -q -m 'fixture: repo mínimo + motor vendorizado do kit' \
+  -m "Kit VERSAO: $(cat "$KIT/VERSAO")"
+
+# branch alvo a partir de main, sem checkout: é ela que o loop mergeia.
+git -C "$FX" branch staging-auto main
+
+# --- 7. snapshot inicial ------------------------------------------------------
+# `orq` sem argumento lê runs/STATUS.md. Um repo recém-instalado ainda não tem
+# snapshot; semear `ocioso` é o que o próprio loop faria ao encerrar a primeira
+# drenagem — e faz o fixture responder à pergunta "em que estado você está?"
+# desde o primeiro segundo.
+(
+  cd "$FX"
+  ORQ_EXEC_ROOT="$FX" bash -c '
+    source scripts/orquestrador/lib.sh
+    status_set "estado=ocioso" "fase=—" "ticket=—" \
+      "motivo=fixture recém-instanciado; nenhuma drenagem rodou"
+  '
+) >&2
+
+log "instanciado (branches: main, staging-auto; origin falso; node_modules -> $KIT/node_modules)"
+log "para remover:  bash scripts/kit/fixture.sh --limpar $FX"
+
+# ÚLTIMA LINHA DO STDOUT: o caminho, e nada mais.
+printf '%s\n' "$FX"
```

## `67c485e` — K7b: as 8 quarentenas voltam a `it` e os 3 shell tests saem rc 0

```
67c485e318c6f4a1d758dafd09b9710637d44b5b
K7b: as 8 quarentenas voltam a `it` e os 3 shell tests saem rc 0

test/fixtures/orq-harness.ts ganha `checkoutReal()`: instancia o repo de fixture
(scripts/kit/fixture.sh) uma vez por ARQUIVO de teste — cache em variável de
módulo, e o vitest dá um registro de módulos por arquivo — e o remove no
`afterAll`, pelo próprio `fixture.sh --limpar` (é ele que sabe que as worktrees
do motor moram no tmp pai, e é ele que tem a trava contra apagar caminho
alheio).

Os 8 casos passam a apontar para o motor VENDORIZADO dentro do fixture, onde
existe docs/fila. Nenhuma asserção foi tocada: o que mudou em cada caso é o
CAMINHO — qual lib.sh é carregado, qual cwd o processo recebe, qual
docs/fila/runs é lido. O detalhe caso a caso está em docs/QUARENTENA.md, seção
"Saíram da quarentena".

Onde a cópia do kit continua sendo lida como FONTE (os casos que grepam o
launchd-run.sh, a ordem de ORQ_TESTE/ORQ_EXEC_ROOT antes do source), ela
continua: afirmação sobre o motor lê o motor.

Um caso do balde 2 exigiu dado no fixture, não afrouxamento: o
`nenhum ticket da fila usa mais "main...HEAD"` cobra também a forma POSITIVA
(`$BASE_REF...HEAD` presente), então o ticket 001 ganhou o critério de escopo na
forma canônica dos tickets reais do CI
(`git diff --name-only $BASE_REF...HEAD -- <paths> | wc -l | tr -d ' '`).
O ticket segue aprovado pelo gate sem violação.

scripts/kit/test-shell.sh encadeia os três testes de shell contra um fixture
instanciado e imprime o rc de cada um. test-preflight.sh fica fora: chama a API
da Anthropic.

Zero mudança em scripts/orquestrador/**, scripts/orq, doutrina/ e _referencia-ci/**.

Medido:
  npx vitest run          -> 24 arquivos, 612 passam, 0 skipped
  npx tsc --noEmit        -> limpo
  bash scripts/kit/test-shell.sh -> rc 0 nos três
  nenhum /private/tmp/orq-fixture-* sobra depois da suíte

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013KUjZwVRT1xAq4N4TKVhh6


 docs/QUARENTENA.md                         | 57 +++++++++++++++++-----------
 fixture/docs/fila/001-soma-de-negativos.md |  6 +++
 scripts/kit/test-shell.sh                  | 53 ++++++++++++++++++++++++++
 test/fixtures/orq-harness.ts               | 61 ++++++++++++++++++++++++++++++
 test/orquestrador-agendamento.test.ts      | 30 +++++++++++----
 test/orquestrador-gates.test.ts            | 12 ++++--
 test/orquestrador-isolamento-teste.test.ts | 52 ++++++++++++++-----------
 test/orquestrador-liberacoes.test.ts       | 16 ++++++--
 8 files changed, 228 insertions(+), 59 deletions(-)
```

### diff

```diff
diff --git a/docs/QUARENTENA.md b/docs/QUARENTENA.md
index 767f122..1f36f8a 100644
--- a/docs/QUARENTENA.md
+++ b/docs/QUARENTENA.md
@@ -10,39 +10,52 @@ por `toBeDefined` nem foi apagado.
 
 ## Aberta
 
-### Balde 1 · exigem um checkout com `docs/fila` no lugar onde o `lib.sh` mora
+(nenhuma)
+
+## Saíram da quarentena
+
+Todas as 8 saíram com **K7b** (`4e0048a`), pela mesma porta: o
+`test/fixtures/orq-harness.ts` ganhou `checkoutReal()`, que instancia o repo de
+fixture (`scripts/kit/fixture.sh`, peça K7a) uma vez por arquivo de teste e o
+remove no `afterAll`. Os casos passaram a apontar para o motor **vendorizado
+dentro do fixture** — onde existe `docs/fila` —, não para a cópia do kit.
+
+Nenhuma asserção foi tocada. O que mudou em cada caso foi só o CAMINHO: qual
+`lib.sh` é carregado, qual `cwd` o processo recebe, qual `docs/fila/runs` é lido.
+
+### Balde 1 · exigiam um checkout com `docs/fila` no lugar onde o `lib.sh` mora
 
 O `lib.sh` resolve a fila pelo diretório do PRÓPRIO arquivo
 (`ROOT="${ORQ_EXEC_ROOT:-$(cd "$ORQ_LIB_DIR/../.." && pwd)}"`, `lib.sh:24`, e
 `FILA_DIR="$MAIN_CHECKOUT/docs/fila"`, `lib.sh:42`). Rodar o motor a partir de
-`<kit>/scripts/orquestrador/` faz o kit ser o checkout — e o kit não tem fila.
-Sai com **K7** (fixture de repo), não com mudança de motor.
+`<kit>/scripts/orquestrador/` fazia o kit ser o checkout — e o kit não tem fila.
+Rodá-lo a partir de `<fixture>/scripts/orquestrador/` faz o fixture ser o
+checkout, que é o cenário de verdade. **Zero mudança no motor.**
 
-| Arquivo | Caso | Motivo |
+| Arquivo | Caso | O que passou a apontar para o fixture |
 |---|---|---|
-| `test/orquestrador-agendamento.test.ts` | `sem claude no PATH: rc 127 e mensagem com o PATH usado` | O wrapper faz `source lib.sh` antes do check de PATH; o source morre em `jq` (rc 2) por falta de `docs/fila/000-config.json`, então o rc 127 nunca chega. |
-| `test/orquestrador-isolamento-teste.test.ts` | `event fora de ORQ_EXEC_ROOT não chega à trilha real, e diz por quê` | `bashSemFixture` faz `source lib.sh` SEM `ORQ_EXEC_ROOT` de propósito (é o cenário do acidente); sem config o `jq` morre antes do `escrita RECUSADA`. |
-| `test/orquestrador-isolamento-teste.test.ts` | `status_set fora do fixture não reescreve o STATUS real` | Idem. |
+| `test/orquestrador-agendamento.test.ts` | `sem claude no PATH: rc 127 e mensagem com o PATH usado` | `rodarWrapper` executa `WRAPPER_FX` (a cópia do fixture) com `cwd` no fixture. A cópia do kit continua sendo lida como FONTE pelos casos que grepam o arquivo. |
+| `test/orquestrador-isolamento-teste.test.ts` | `event fora de ORQ_EXEC_ROOT não chega à trilha real, e diz por quê` | `bashSemFixture` faz `source` do `lib.sh` do fixture, `cwd` no fixture. Continua SEM `ORQ_EXEC_ROOT` — o cenário do acidente é exatamente esse. |
+| `test/orquestrador-isolamento-teste.test.ts` | `status_set fora do fixture não reescreve o STATUS real` | Idem; `STATUS_REAL` é o `runs/STATUS.md` do fixture. |
 | `test/orquestrador-isolamento-teste.test.ts` | `custo_registrar fora do fixture não toca o ledger real` | Idem. |
-| `test/orquestrador-isolamento-teste.test.ts` | `test-drenagem.sh: fixture recebe os eventos, produção não recebe nada` | Roda `test-drenagem.sh` de verdade, que copia `$CHECKOUT_REAL/docs/fila/000-config.json` (`test-drenagem.sh:25,29`). |
+| `test/orquestrador-isolamento-teste.test.ts` | `test-drenagem.sh: fixture recebe os eventos, produção não recebe nada` | Roda o `test-drenagem.sh` do fixture, que resolve `CHECKOUT_REAL` para o fixture (`test-drenagem.sh:22`) e acha o config em `:25,:29`. |
 
-### Balde 2 · asseveram sobre a fila / roadmap do repo INSTALADO
+### Balde 2 · asseveravam sobre a fila / roadmap do repo INSTALADO
 
-Dado local do repo alvo, não comportamento do motor. Também sai com **K7**, contra
-o repo de fixture.
+Dado local do repo alvo. Passaram a asseverar sobre o fixture, que é o repo
+instalado deste kit. Nenhum virou tautologia: cada um continua podendo falhar.
 
-| Arquivo | Caso | Motivo |
+| Arquivo | Caso | O que passou a apontar para o fixture, e por que ainda mede |
 |---|---|---|
-| `test/orquestrador-agendamento.test.ts` | `loga em docs/fila/runs/launchd.log, que o git ignora` | Lê `docs/fila/runs/.gitignore` do repo instalado. A primeira asserção (o wrapper cita o caminho) é do motor e passa; a segunda é do repo. |
-| `test/orquestrador-gates.test.ts` | `nenhum ticket da fila usa mais "main...HEAD" em critério de escopo` | `grep` em `docs/fila/*.md` — os tickets são do repo instalado. |
-| `test/orquestrador-liberacoes.test.ts` | `lint-mapa.py passa sem WARN sobre liberações` | `lint-mapa.py` abre `docs/roadmap/mapa.json`, `docs/roadmap/MAPA.md`, `docs/fila/000-config.json`, `docs/fila/liberacoes.json` e `docs/fila/*.md` do repo instalado (`scripts/roadmap/lint-mapa.py:2-4,97,117`). |
-
-## Fora do vitest, mesma causa
+| `test/orquestrador-agendamento.test.ts` | `loga em docs/fila/runs/launchd.log, que o git ignora` | Lê `docs/fila/runs/.gitignore` do fixture. Falha de verdade se o `fixture.sh` parar de escrever esse arquivo — e a primeira asserção (o wrapper cita o caminho) continua sendo do motor. |
+| `test/orquestrador-gates.test.ts` | `nenhum ticket da fila usa mais "main...HEAD" em critério de escopo` | `grep` em `docs/fila/*.md` do fixture. Exigiu que o ticket 001 ganhasse o critério de escopo na forma canônica (`git diff --name-only $BASE_REF...HEAD -- … \| wc -l \| tr -d ' '`, a mesma forma dos tickets reais do CI). A asserção negativa (`main...HEAD` em lugar nenhum) vale para a fila inteira do fixture, `_TEMPLATE.md` incluído. |
+| `test/orquestrador-liberacoes.test.ts` | `lint-mapa.py passa sem WARN sobre liberações` | Roda o lint com `cwd` no fixture, que tem os cinco arquivos que ele abre (`scripts/roadmap/lint-mapa.py:2-4,97,117`). O check 10 lê `liberacao_ok` do `lib.sh` VENDORIZADO ali — se a vendorização levar um `lib.sh` que não consulta `.tokens`, o WARN aparece. |
 
-`test-lib-config.sh`, `test-drenagem.sh` e `test-retry-worktree.sh` saem com rc 2
-pelo mesmo motivo. Não estão em `it.skip` (não são vitest); o que cada um exige
-está no relatório da etapa 1 e em `docs/PECAS.md`, peça K7.
+## Fora do vitest, mesma causa — também saíram
 
-## Saíram da quarentena
+`test-lib-config.sh`, `test-drenagem.sh` e `test-retry-worktree.sh` saíam com
+rc 2 pelo mesmo motivo e agora saem rc 0, rodados a partir da cópia vendorizada
+dentro do fixture. O encadeador é `scripts/kit/test-shell.sh`.
 
-(nenhum ainda)
+`test-preflight.sh` continua FORA: chama a API da Anthropic (sondagem paga).
+Não é quarentena por defeito — é uma peça própria, com OK humano explícito.
diff --git a/fixture/docs/fila/001-soma-de-negativos.md b/fixture/docs/fila/001-soma-de-negativos.md
index 6b0698d..cde2f49 100644
--- a/fixture/docs/fila/001-soma-de-negativos.md
+++ b/fixture/docs/fila/001-soma-de-negativos.md
@@ -55,6 +55,12 @@ uma camada, um critério `alvo` que só fica verde depois da implementação.
       "cmd": "npx vitest run 2>&1 | grep -cE 'Tests +[0-9]+ passed'",
       "espera": "1"
     },
+    {
+      "tipo": "guarda",
+      "descricao": "escopo: o diff da worktree toca exatamente os dois arquivos da allowlist",
+      "cmd": "git diff --name-only $BASE_REF...HEAD -- src/soma.ts test/soma.test.ts | wc -l | tr -d ' '",
+      "espera": "2"
+    },
     {
       "tipo": "avaliador",
       "descricao": "avaliador: a função nova é EXPORTADA e o teste novo a IMPORTA e a chama — arquivo que existe mas ninguém importa não conta; nenhuma asserção do teste existente foi removida, afrouxada ou marcada como skip; a função soma original continua byte-idêntica.",
diff --git a/scripts/kit/test-shell.sh b/scripts/kit/test-shell.sh
new file mode 100644
index 0000000..74db212
--- /dev/null
+++ b/scripts/kit/test-shell.sh
@@ -0,0 +1,53 @@
+#!/usr/bin/env bash
+# test-shell.sh — os testes do motor que NÃO são vitest, contra o repo de
+# fixture (peça K7b).
+#
+# São três, e os três morriam com rc 2 no kit pela MESMA causa: cada um resolve
+# `CHECKOUT_REAL` a partir do próprio diretório (`$AQUI/../..`) e de lá copia
+# `docs/fila/000-config.json` — arquivo que o kit não tem, porque a fila é do
+# repo INSTALADO. Rodando a cópia que o `fixture.sh` vendoriza dentro do
+# fixture, `$AQUI/../..` é o fixture, e o config está lá.
+#
+#   test-lib-config.sh    lê o config pelo lib.sh (CONFIG = <checkout>/docs/fila/000-config.json)
+#   test-drenagem.sh      copia $CHECKOUT_REAL/docs/fila/000-config.json (linhas 25 e 29)
+#   test-retry-worktree.sh  idem (linhas 32 e 36)
+#
+# Cada um monta o PRÓPRIO `ORQ_EXEC_ROOT` num `mktemp -d` (drenagem e retry) ou
+# trabalha direto no checkout (lib-config); nada aqui precisa exportar
+# `ORQ_EXEC_ROOT` por fora — fazer isso sobrescreveria o isolamento que cada
+# script declara antes do `source`, que é justamente o que o
+# orquestrador-isolamento-teste.test.ts cobra.
+#
+# FICA DE FORA, por decisão: `test-preflight.sh`. Ele chama a API da Anthropic
+# (sondagem paga). Entra numa peça própria, com OK humano explícito.
+#
+# Uso: bash scripts/kit/test-shell.sh
+
+set -uo pipefail
+
+KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
+SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh'
+
+FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
+  printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
+}
+trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1 || true' EXIT
+
+printf '== testes de shell do motor · fixture em %s ==\n\n' "$FX"
+
+FALHAS=0
+PLACAR=''
+for s in $SCRIPTS; do
+  printf -- '--- %s ---\n' "$s"
+  bash "$FX/scripts/orquestrador/$s"
+  rc=$?
+  printf '\nrc(%s) = %s\n\n' "$s" "$rc"
+  PLACAR="$PLACAR  rc=$rc  $s
+"
+  [ "$rc" = 0 ] || FALHAS=$((FALHAS + 1))
+done
+
+printf '== placar ==\n%s' "$PLACAR"
+[ "$FALHAS" = 0 ] && { printf 'TODOS OS SCRIPTS SAÍRAM rc 0\n'; exit 0; }
+printf '%s SCRIPT(S) COM rc != 0\n' "$FALHAS"
+exit 1
diff --git a/test/fixtures/orq-harness.ts b/test/fixtures/orq-harness.ts
index d5f9128..aefe755 100644
--- a/test/fixtures/orq-harness.ts
+++ b/test/fixtures/orq-harness.ts
@@ -8,6 +8,7 @@
  * nos casos de escrita, MEXER em) docs/fila do checkout principal — que é a
  * fonte única da fila real. O fixture é sempre um dir temporário puro.
  */
+import { afterAll } from 'vitest';
 import { spawnSync } from 'node:child_process';
 import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
 import { tmpdir } from 'node:os';
@@ -24,6 +25,66 @@ export const LIB = join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh');
  */
 export const FX_CHECKOUT = join(import.meta.dirname, 'checkout');
 
+// ─── Checkout REAL de fixture (peça K7) ───────────────────────────────────
+// FX_CHECKOUT acima é o checkout de PAPEL: uma fila e um config, fora de git,
+// que basta para os testes que só leem `docs/fila`. O que segue é outra coisa:
+// um repo INSTANCIADO por `scripts/kit/fixture.sh` — git de verdade, branch
+// alvo, node_modules, e a cópia VENDORIZADA do motor dentro dele.
+//
+// Por que precisa existir: `lib.sh` resolve a fila pelo diretório onde o
+// PRÓPRIO lib.sh mora (`ROOT="${ORQ_EXEC_ROOT:-$(cd "$ORQ_LIB_DIR/../.." && pwd)}"`,
+// lib.sh:24, e `FILA_DIR="$MAIN_CHECKOUT/docs/fila"`, lib.sh:42). Rodar o motor
+// a partir de `<kit>/scripts/orquestrador/` faz o KIT ser o checkout — e o kit
+// não tem fila. Rodá-lo a partir de `<fixture>/scripts/orquestrador/` faz o
+// fixture ser o checkout, que é o cenário de verdade. Era essa a causa única
+// das 8 quarentenas da K3.
+//
+// Custo: uma instanciação por ARQUIVO de teste (o cache é de módulo, e o vitest
+// dá um registro de módulos por arquivo). Remoção no `afterAll` do arquivo.
+
+let checkoutRealCache: string | null = null;
+
+/**
+ * Instancia o repo de fixture e devolve o caminho. Uma vez por arquivo de
+ * teste; o `afterAll` de remoção é registrado na primeira chamada.
+ *
+ * Chame no TOPO do arquivo de teste (fora de `describe`/`it`): é lá que o
+ * `afterAll` da raiz da suíte está disponível, e é lá que a instanciação
+ * acontece uma vez só em vez de uma por caso.
+ */
+export function checkoutReal(): string {
+  if (checkoutRealCache) return checkoutRealCache;
+  const script = join(REPO_ROOT, 'scripts', 'kit', 'fixture.sh');
+  const r = spawnSync('bash', [script], { encoding: 'utf8' });
+  if (r.status !== 0) {
+    throw new Error(`fixture.sh saiu ${r.status}:\n${r.stdout ?? ''}${r.stderr ?? ''}`);
+  }
+  // CONTRATO: a última linha do stdout é o caminho, e nada mais. Todo o log do
+  // instanciador vai para stderr justamente para esta linha existir.
+  const linhas = (r.stdout ?? '').trim().split('\n');
+  const caminho = (linhas[linhas.length - 1] ?? '').trim();
+  if (!caminho || !existsSync(caminho)) {
+    throw new Error(`fixture.sh não imprimiu um caminho utilizável: '${caminho}'`);
+  }
+  checkoutRealCache = caminho;
+  afterAll(() => {
+    limparCheckoutReal();
+  });
+  return caminho;
+}
+
+/** Remove o fixture instanciado, se houver. Idempotente. */
+export function limparCheckoutReal(): void {
+  if (!checkoutRealCache) return;
+  const script = join(REPO_ROOT, 'scripts', 'kit', 'fixture.sh');
+  // A remoção é do PRÓPRIO instanciador: ele é quem sabe que as worktrees do
+  // motor moram no tmp pai, e quem tem a trava que recusa apagar caminho que
+  // não pareça um fixture nosso. `rm -rf` aqui seria a mesma decisão tomada
+  // duas vezes, e a segunda sem a trava.
+  spawnSync('bash', [script, '--limpar', checkoutRealCache], { encoding: 'utf8' });
+  checkoutRealCache = null;
+}
+
 export interface Ticket {
   id: string;
   slug?: string;
diff --git a/test/orquestrador-agendamento.test.ts b/test/orquestrador-agendamento.test.ts
index aed3db1..e273e50 100644
--- a/test/orquestrador-agendamento.test.ts
+++ b/test/orquestrador-agendamento.test.ts
@@ -11,9 +11,22 @@ import { readFileSync, existsSync, mkdtempSync, chmodSync, statSync } from 'node
 import { tmpdir } from 'node:os';
 import { join } from 'node:path';
 import { spawnSync } from 'node:child_process';
-import { escrever, REPO_ROOT } from './fixtures/orq-harness.js';
+import { escrever, REPO_ROOT, checkoutReal } from './fixtures/orq-harness.js';
 
+/**
+ * Duas leituras diferentes do MESMO wrapper, de propósito:
+ *
+ *  - `WRAPPER` (a cópia do kit) é a FONTE: os casos que grepam o arquivo estão
+ *    afirmando coisas sobre o motor, e o motor mora aqui.
+ *  - `WRAPPER_FX` (a cópia dentro do repo de fixture instanciado) é o que
+ *    EXECUTA: o wrapper faz `source lib.sh`, e o lib.sh resolve a fila pelo
+ *    diretório onde ele mora (lib.sh:24,42). Rodando a cópia do kit, o source
+ *    morre em `jq` por falta de `docs/fila/000-config.json` e o rc do wrapper
+ *    nunca chega. Era essa a quarentena K7 deste arquivo.
+ */
 const WRAPPER = join(REPO_ROOT, 'scripts', 'orquestrador', 'launchd-run.sh');
+const FX = checkoutReal();
+const WRAPPER_FX = join(FX, 'scripts', 'orquestrador', 'launchd-run.sh');
 const DOC = join(REPO_ROOT, 'docs', 'launchd.md');
 const fonte = readFileSync(WRAPPER, 'utf8');
 /** Só o CÓDIGO: comentário citando o dono de um estado não é ler esse estado. */
@@ -38,17 +51,16 @@ function rodarWrapper(temClaude: boolean, temNode = true) {
   // HOME de mentira: o wrapper monta o PATH dele com $HOME/.local/bin, que é
   // justamente onde o `claude` desta máquina vive. Sem trocar o HOME, o teste de
   // "claude ausente" testaria a máquina, não o wrapper.
-  const r = spawnSync('/bin/bash', [WRAPPER], {
+  const r = spawnSync('/bin/bash', [WRAPPER_FX], {
     encoding: 'utf8',
-    cwd: REPO_ROOT,
+    cwd: FX,
     env: { ...process.env, HOME: lar, PATH: bin, NODE_DIR: temNode ? bin : '' },
   });
   return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
 }
 
 describe('o wrapper falha alto quando falta ferramenta', () => {
-  // QUARENTENA (K7): o wrapper faz `source lib.sh`, que resolve a fila pelo diretório onde o lib.sh MORA — exige um checkout com docs/fila/000-config.json; a fixture de repo é a peça K7.
-  it.skip('sem claude no PATH: rc 127 e mensagem com o PATH usado (não roda o loop)', () => {
+  it('sem claude no PATH: rc 127 e mensagem com o PATH usado (não roda o loop)', () => {
     const r = rodarWrapper(false);
     expect(r.rc).toBe(127);
     expect(r.saida).toMatch(/'claude' fora do PATH/);
@@ -102,10 +114,12 @@ describe('o wrapper NÃO duplica estado do loop', () => {
     expect(fonte).toMatch(/command -v caffeinate/); // ausência não pode quebrar
   });
 
-  // QUARENTENA (K7): assevera sobre docs/fila/runs/.gitignore do repo INSTALADO; o kit não tem fila própria.
-  it.skip('loga em docs/fila/runs/launchd.log, que o git ignora', () => {
+  // A primeira asserção é do MOTOR (o wrapper cita o caminho); a segunda é do
+  // REPO INSTALADO, e por isso lê o fixture: quem tem `docs/fila/runs/` é o repo
+  // que instalou o motor, não o kit.
+  it('loga em docs/fila/runs/launchd.log, que o git ignora', () => {
     expect(fonte).toContain('docs/fila/runs/launchd.log');
-    expect(readFileSync(join(REPO_ROOT, 'docs', 'fila', 'runs', '.gitignore'), 'utf8')).toContain('*');
+    expect(readFileSync(join(FX, 'docs', 'fila', 'runs', '.gitignore'), 'utf8')).toContain('*');
   });
 
   it('resolve o repo do próprio arquivo: zero caminho de usuário hardcoded', () => {
diff --git a/test/orquestrador-gates.test.ts b/test/orquestrador-gates.test.ts
index 5cae80c..3334d43 100644
--- a/test/orquestrador-gates.test.ts
+++ b/test/orquestrador-gates.test.ts
@@ -6,6 +6,7 @@ import { describe, it, expect } from 'vitest';
 import { readFileSync } from 'node:fs';
 import { join } from 'node:path';
 import { execFileSync } from 'node:child_process';
+import { checkoutReal } from './fixtures/orq-harness.js';
 import {
   ordenarGates,
   parsePlacar,
@@ -17,6 +18,10 @@ import {
 } from '../scripts/orquestrador/gates.js';
 import type { GatesConfig, Execucao, Placar } from '../scripts/orquestrador/gates.js';
 
+// Instanciado no TOPO, não dentro do caso: é aqui que o `afterAll` de remoção
+// do harness tem a raiz da suíte para se registrar.
+const FX = checkoutReal();
+
 const CONFIG_PATH = join(import.meta.dirname, 'fixtures', 'checkout', 'docs', 'fila', '000-config.json');
 const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as GatesConfig;
 
@@ -343,11 +348,12 @@ describe('critérios do executor — BASE_REF', () => {
     expect(falhos).toBe('');
   });
 
-  // QUARENTENA (K7): grep em docs/fila/*.md — os tickets são do repo instalado, não do kit.
-  it.skip('nenhum ticket da fila usa mais "main...HEAD" em critério de escopo', () => {
+  // A fila é do repo INSTALADO, não do kit: o alvo é o fixture instanciado
+  // (peça K7), cujo ticket 001 traz um critério de escopo na forma canônica.
+  it('nenhum ticket da fila usa mais "main...HEAD" em critério de escopo', () => {
     const cmds = execFileSync('bash', ['-c', `grep -h '"cmd"' docs/fila/*.md || true`], {
       encoding: 'utf8',
-      cwd: REPO_ROOT,
+      cwd: FX,
     });
     expect(cmds).not.toMatch(/main\.\.\.HEAD/);
     expect(cmds).toMatch(/\$BASE_REF\.\.\.HEAD/);
diff --git a/test/orquestrador-isolamento-teste.test.ts b/test/orquestrador-isolamento-teste.test.ts
index c253259..739f7b0 100644
--- a/test/orquestrador-isolamento-teste.test.ts
+++ b/test/orquestrador-isolamento-teste.test.ts
@@ -18,27 +18,33 @@ import { describe, it, expect } from 'vitest';
 import { readFileSync, existsSync } from 'node:fs';
 import { join } from 'node:path';
 import { spawnSync } from 'node:child_process';
-import { criarFixture, bashNoFixture, ler, REPO_ROOT, LIB } from './fixtures/orq-harness.js';
+import { criarFixture, bashNoFixture, ler, REPO_ROOT, checkoutReal } from './fixtures/orq-harness.js';
 
 const ORQ_DIR = join(REPO_ROOT, 'scripts', 'orquestrador');
 const SCRIPTS = ['test-drenagem.sh', 'test-preflight.sh', 'test-retry-worktree.sh'];
 
-/** O checkout PRINCIPAL — o dono da trilha de produção — visto daqui. */
-function checkoutReal(): string {
-  const r = spawnSync('git', ['-C', REPO_ROOT, 'rev-parse', '--path-format=absolute', '--git-common-dir'], {
-    encoding: 'utf8',
-  });
-  const comum = (r.stdout ?? '').trim();
-  return comum ? comum.replace(/\/\.git\/*$/, '') : REPO_ROOT;
-}
-const TRILHA_REAL = join(checkoutReal(), 'docs', 'fila', 'runs', 'events.log');
-const STATUS_REAL = join(checkoutReal(), 'docs', 'fila', 'runs', 'STATUS.md');
+/**
+ * O checkout PRINCIPAL — o dono da trilha de "produção" deste teste — é o repo
+ * de fixture instanciado (peça K7). Não é maquiagem: o cenário do acidente é
+ * `source lib.sh` SEM `ORQ_EXEC_ROOT`, e para o lib.sh resolver a fila (e
+ * chegar vivo até a guarda) o checkout onde ele MORA precisa ter
+ * `docs/fila/000-config.json`. O kit não tem fila; o fixture tem.
+ *
+ * A trilha real do kit continua intocada por construção: nada aqui aponta para
+ * ela, e é justamente o que se afirma — a escrita é RECUSADA antes de escolher
+ * destino.
+ */
+const FX = checkoutReal();
+/** O lib.sh que mora DENTRO do fixture (a cópia vendorizada), não o do kit. */
+const LIB_FX = join(FX, 'scripts', 'orquestrador', 'lib.sh');
+const TRILHA_REAL = join(FX, 'docs', 'fila', 'runs', 'events.log');
+const STATUS_REAL = join(FX, 'docs', 'fila', 'runs', 'STATUS.md');
 
 /** Roda bash com lib.sh SEM ORQ_EXEC_ROOT — é o cenário do acidente. */
 function bashSemFixture(corpo: string): { rc: number; saida: string } {
-  const r = spawnSync('bash', ['-c', `source "${LIB}"\nset +e\n${corpo}`], {
+  const r = spawnSync('bash', ['-c', `source "${LIB_FX}"\nset +e\n${corpo}`], {
     encoding: 'utf8',
-    cwd: REPO_ROOT,
+    cwd: FX,
     env: { ...process.env, ORQ_TESTE: '1', ORQ_EXEC_ROOT: '' },
   });
   return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
@@ -47,8 +53,7 @@ function bashSemFixture(corpo: string): { rc: number; saida: string } {
 describe('ORQ_TESTE=1 recusa escrita fora do fixture', () => {
   const marca = `MARCA-0D-${process.pid}-${Date.now()}`;
 
-  // QUARENTENA (K7): `source lib.sh` sem ORQ_EXEC_ROOT exige que o checkout onde o lib.sh mora tenha docs/fila/000-config.json.
-  it.skip('event fora de ORQ_EXEC_ROOT não chega à trilha real, e diz por quê', () => {
+  it('event fora de ORQ_EXEC_ROOT não chega à trilha real, e diz por quê', () => {
     const antes = ler(TRILHA_REAL);
     const { saida } = bashSemFixture(`event 999 ${marca}`);
     expect(saida).toContain('escrita RECUSADA');
@@ -60,8 +65,7 @@ describe('ORQ_TESTE=1 recusa escrita fora do fixture', () => {
     expect(depois.startsWith(antes)).toBe(true);
   });
 
-  // QUARENTENA (K7): mesmo motivo — o lib.sh sem ORQ_EXEC_ROOT resolve a fila pelo próprio diretório.
-  it.skip('status_set fora do fixture não reescreve o STATUS real', () => {
+  it('status_set fora do fixture não reescreve o STATUS real', () => {
     const antes = ler(STATUS_REAL);
     const { saida } = bashSemFixture(`status_set "ultimo=${marca}"`);
     expect(saida).toContain('escrita RECUSADA');
@@ -69,8 +73,7 @@ describe('ORQ_TESTE=1 recusa escrita fora do fixture', () => {
     if (antes) expect(existsSync(STATUS_REAL)).toBe(true);
   });
 
-  // QUARENTENA (K7): mesmo motivo — o lib.sh sem ORQ_EXEC_ROOT resolve a fila pelo próprio diretório.
-  it.skip('custo_registrar fora do fixture não toca o ledger real', () => {
+  it('custo_registrar fora do fixture não toca o ledger real', () => {
     const { saida } = bashSemFixture(
       `printf '{"total_cost_usd":9.99}\\n' > /tmp/${marca}.json; custo_registrar executor 999 0 /tmp/${marca}.json; rm -f /tmp/${marca}.json`,
     );
@@ -126,10 +129,15 @@ describe('cada test-*.sh declara o isolamento ANTES de carregar o lib', () => {
 });
 
 describe('o test-*.sh rodando de verdade não deixa marca na trilha real', () => {
-  // QUARENTENA (K7): roda test-drenagem.sh de verdade, que precisa de um checkout com docs/fila.
-  it.skip('test-drenagem.sh: fixture recebe os eventos, produção não recebe nada', () => {
+  it('test-drenagem.sh: fixture recebe os eventos, produção não recebe nada', () => {
     const antes = ler(TRILHA_REAL);
-    const r = spawnSync('bash', [join(ORQ_DIR, 'test-drenagem.sh')], { encoding: 'utf8', cwd: REPO_ROOT });
+    // A cópia do FIXTURE, não a do kit: o script resolve `CHECKOUT_REAL` a
+    // partir do diretório dele (`$AQUI/../..`, test-drenagem.sh:22) e de lá
+    // copia `docs/fila/000-config.json`. Rodando a do kit, não há o que copiar.
+    const r = spawnSync('bash', [join(FX, 'scripts', 'orquestrador', 'test-drenagem.sh')], {
+      encoding: 'utf8',
+      cwd: FX,
+    });
     expect(r.status).toBe(0);
     const depois = ler(TRILHA_REAL);
     // Append-only preservado, e o delta (se o loop drenou em paralelo) não tem
diff --git a/test/orquestrador-liberacoes.test.ts b/test/orquestrador-liberacoes.test.ts
index b74dcc7..c846df4 100644
--- a/test/orquestrador-liberacoes.test.ts
+++ b/test/orquestrador-liberacoes.test.ts
@@ -13,7 +13,11 @@ import { describe, it, expect } from 'vitest';
 import { readFileSync } from 'node:fs';
 import { spawnSync } from 'node:child_process';
 import { join } from 'node:path';
-import { bashComLog, criarFixture, liberacoes, REPO_ROOT } from './fixtures/orq-harness.js';
+import { bashComLog, checkoutReal, criarFixture, liberacoes, REPO_ROOT } from './fixtures/orq-harness.js';
+
+// Instanciado no TOPO, não dentro do caso: é aqui que o `afterAll` de remoção
+// do harness tem a raiz da suíte para se registrar.
+const FX = checkoutReal();
 
 /** Ticket que só pode rodar se a liberação humana existir. */
 const TICKET = { id: '900', slug: 'dep-humana', dependencias: ['humano:migration-0025'] };
@@ -78,11 +82,15 @@ describe('lint do mapa confere que o HARNESS lê o formato canônico', () => {
     expect(corpo).toContain('.tokens');
   });
 
-  // QUARENTENA (K7): lint-mapa.py lê docs/roadmap/{mapa.json,MAPA.md} e docs/fila/* do repo instalado.
-  it.skip('lint-mapa.py passa sem WARN sobre liberações', () => {
+  // O lint abre docs/roadmap/{mapa.json,MAPA.md}, docs/fila/000-config.json,
+  // docs/fila/liberacoes.json e docs/fila/*.md do repo INSTALADO
+  // (scripts/roadmap/lint-mapa.py:2-4,97,117) — por isso roda contra o fixture
+  // instanciado, que é o único repo com todos eles. O check 10, o que interessa
+  // aqui, lê `liberacao_ok` do lib.sh VENDORIZADO nesse mesmo repo.
+  it('lint-mapa.py passa sem WARN sobre liberações', () => {
     const r = spawnSync('python3', ['scripts/roadmap/lint-mapa.py'], {
       encoding: 'utf8',
-      cwd: REPO_ROOT,
+      cwd: FX,
     });
     expect(r.status, r.stdout).toBe(0);
     expect(r.stdout).not.toMatch(/WARN.*liberac/i);
```

## `0f023a6` — K5: instalar.sh --verificar <repo>

```
0f023a617e369096293522ca25b8d2e32e3419d9
K5: instalar.sh --verificar <repo>

Um verbo só nesta etapa. `--novo` e `--atualizar` imprimem "ainda não: peça K8"
e saem 2: verbo que finge existir é pior que verbo ausente.

Compara, com `diff -rq`, o mapa do ORIGEM.md (o mesmo que o
scripts/kit/fixture.sh usa para vendorizar):

  kit scripts/orquestrador/  <->  <repo>/scripts/orquestrador/
  kit scripts/orq            <->  <repo>/scripts/orq
  kit doutrina/              <->  <repo>/docs/orquestrador/skill/

Fora da comparação, com o porquê no cabeçalho do arquivo: `*.plist` que não seja
`*.plist.template` (plist INSTANCIADO, com caminhos absolutos de uma máquina —
regra por sufixo, não por nome, porque o nome muda por repo), `runs` e `VERSAO`
(carimbo da vendorização: existe no destino e não na origem, então compará-lo
acusaria diferença em toda instalação correta). `VERSAO` ausente no repo vira a
linha `repo sem VERSAO` e NÃO é erro nesta versão.

`LC_ALL=C` no diff não é higiene: sem ele, numa máquina em pt_BR o `diff -rq`
responde "Os arquivos ... são diferentes", o parser não casa nada e o
verificador diria "idêntico" para um repo divergente — o único desfecho que
este script não pode ter. Linha que o parser não reconhece também conta como
diferença, pelo mesmo motivo.

scripts/kit/test-instalar.sh, os três casos:
  (a) fixture recém-instanciado           -> idêntico ao kit 2.1.0-dev, rc 0
  (b) cópia do fixture com UM byte a mais em lib.sh
      -> `diferente   scripts/orquestrador/lib.sh`, rc 1, e o NEGATIVO de que é
         exatamente 1 diferença, não uma cascata
  (c) ~/Projetos/conteudos-infinitos (só leitura) -> `repo sem VERSAO` e
      `idêntico ao kit 2.1.0-dev`, rc 0. Achado, não gate: (c) nunca falha este
      script — o checkout do CI não é do kit.

O (c) confirma o pronto-quando da peça K5 no PECAS ("contra o checkout do CI em
711ab5e devolve idêntico") e vai além: o CI está 4 commits à frente (91cf60b) e
`git log 711ab5e..HEAD -- scripts/orquestrador scripts/orq docs/orquestrador/skill`
sai VAZIO — a etapa 5 de lá não tocou o motor.

Zero mudança em scripts/orquestrador/**, scripts/orq, doutrina/ e _referencia-ci/**.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013KUjZwVRT1xAq4N4TKVhh6


 instalar.sh                  | 148 +++++++++++++++++++++++++++++++++++++++++++
 scripts/kit/test-instalar.sh |  67 ++++++++++++++++++++
 2 files changed, 215 insertions(+)
```

### diff

```diff
diff --git a/instalar.sh b/instalar.sh
new file mode 100644
index 0000000..f13f9af
--- /dev/null
+++ b/instalar.sh
@@ -0,0 +1,148 @@
+#!/usr/bin/env bash
+# instalar.sh — instalador do kit do Orquestrador Autônomo.
+#
+# Nesta etapa existe UM verbo: `--verificar`. `--novo` e `--atualizar` são a
+# peça K8 e, se chamados, dizem isso e saem 2 — verbo que finge existir é pior
+# que verbo ausente.
+#
+#   bash instalar.sh --verificar <repo>
+#
+# O que ele prova: a cópia VENDORIZADA do motor dentro de `<repo>` é idêntica à
+# do kit. É a decisão 2 do inventário (vendorizado por cópia, hash conferido no
+# pré-voo) reduzida ao mínimo que dá para checar sem rodar nada.
+#
+# O mapa origem -> destino é o do ORIGEM.md, e o mesmo que o
+# scripts/kit/fixture.sh usa para instanciar:
+#
+#   kit scripts/orquestrador/   <->   <repo>/scripts/orquestrador/
+#   kit scripts/orq             <->   <repo>/scripts/orq
+#   kit doutrina/               <->   <repo>/docs/orquestrador/skill/
+#
+# O que NÃO entra na comparação, e por quê:
+#   *.plist que não termine em .plist.template — é o plist INSTANCIADO, gerado
+#     por instalar-launchd.sh com caminhos absolutos DESTA máquina. Artefato
+#     local, não motor. A regra é por sufixo e não por nome porque o nome muda
+#     por repo (e a peça K6 vai trocá-lo por com.orquestrador.plist.template).
+#   runs — evidência de execução, efêmera por contrato.
+#   VERSAO — carimbo da vendorização, não conteúdo da doutrina: ele existe no
+#     destino e não na origem, então compará-lo acusaria diferença em toda
+#     instalação correta. É checado à parte, e a ausência dele não é erro nesta
+#     versão (repo vendorizado antes do carimbo existir).
+#
+# Saída: uma linha por diferença (`diferente` / `só no kit` / `só no repo`) e
+# rc 1; ou `idêntico ao kit <VERSAO>` e rc 0.
+
+set -euo pipefail
+
+KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
+VERSAO="$(cat "$KIT/VERSAO")"
+
+die() { printf 'instalar.sh: %s\n' "$*" >&2; exit 2; }
+
+uso() {
+  cat <<'USO'
+uso: bash instalar.sh --verificar <repo>
+
+  --verificar <repo>   compara o motor vendorizado em <repo> com o do kit
+  --novo <repo>        (peça K8)
+  --atualizar <repo>   (peça K8)
+USO
+}
+
+# --- comparação ---------------------------------------------------------------
+# `diff -rq` fala em inglês só com LC_ALL=C. Sem isso, a máquina do usuário em
+# pt_BR devolve "Os arquivos ... são diferentes" e o parser abaixo não casa
+# nada — o verificador diria "idêntico" para um repo divergente, que é o único
+# desfecho que este script não pode ter.
+DIFERENCAS=0
+
+# relativiza <caminho> <base> -> o caminho sem o prefixo da base.
+relativiza() {
+  local c="$1" b="${2%/}"
+  case "$c" in "$b"/*) printf '%s' "${c#"$b"/}" ;; *) printf '%s' "$c" ;; esac
+}
+
+# comparar_dir <destino_legivel> <dir_kit> <dir_repo> [args extras do diff...]
+comparar_dir() {
+  local rotulo="$1" a="$2" b="$3"; shift 3
+  if [ ! -d "$a" ]; then printf 'só no repo  %s/ (o KIT não tem este diretório)\n' "$rotulo"; DIFERENCAS=$((DIFERENCAS+1)); return 0; fi
+  if [ ! -d "$b" ]; then printf 'só no kit   %s/ (o REPO não tem este diretório)\n' "$rotulo"; DIFERENCAS=$((DIFERENCAS+1)); return 0; fi
+  local linha dir nome rel
+  while IFS= read -r linha; do
+    [ -n "$linha" ] || continue
+    case "$linha" in
+      "Files "*" and "*" differ")
+        rel="${linha#Files }"; rel="${rel%% and *}"
+        printf 'diferente   %s/%s\n' "$rotulo" "$(relativiza "$rel" "$a")"
+        DIFERENCAS=$((DIFERENCAS+1))
+        ;;
+      "Only in "*)
+        dir="${linha#Only in }"; nome="${dir#*: }"; dir="${dir%%: *}"
+        case "$dir/" in
+          "$a"/*|"$a/") rel="$(relativiza "$dir/$nome" "$a")"; printf 'só no kit   %s/%s\n' "$rotulo" "$rel" ;;
+          *)            rel="$(relativiza "$dir/$nome" "$b")"; printf 'só no repo  %s/%s\n' "$rotulo" "$rel" ;;
+        esac
+        DIFERENCAS=$((DIFERENCAS+1))
+        ;;
+      *)
+        # Qualquer outra linha (arquivo especial, erro de leitura) conta como
+        # diferença: engolir o que não se entende é como um verificador mente.
+        printf 'diferente   %s (diff disse: %s)\n' "$rotulo" "$linha"
+        DIFERENCAS=$((DIFERENCAS+1))
+        ;;
+    esac
+  done < <(LC_ALL=C diff -rq "$@" "$a" "$b" 2>&1 || true)
+}
+
+# comparar_arquivo <destino_legivel> <arq_kit> <arq_repo>
+comparar_arquivo() {
+  local rotulo="$1" a="$2" b="$3"
+  if [ ! -f "$b" ]; then printf 'só no kit   %s\n' "$rotulo"; DIFERENCAS=$((DIFERENCAS+1)); return 0; fi
+  if ! cmp -s "$a" "$b"; then printf 'diferente   %s\n' "$rotulo"; DIFERENCAS=$((DIFERENCAS+1)); fi
+}
+
+verificar() {
+  local repo="${1:-}"
+  [ -n "$repo" ] || die "--verificar exige o caminho do repo"
+  [ -d "$repo" ] || die "'$repo' não é um diretório"
+  repo="$(cd "$repo" && pwd -P)"
+
+  printf 'VERIFICAR  kit %s (%s)\n' "$VERSAO" "$KIT"
+  printf '           repo %s\n\n' "$repo"
+
+  # VERSAO do destino: informação, não gate. Um repo vendorizado antes do
+  # carimbo existir não está errado — está sem carimbo.
+  local carimbo="$repo/docs/orquestrador/skill/VERSAO"
+  if [ -f "$carimbo" ]; then
+    printf 'carimbo    %s\n' "$(cat "$carimbo")"
+  else
+    printf 'repo sem VERSAO\n'
+  fi
+  printf '\n'
+
+  comparar_dir 'scripts/orquestrador' \
+    "$KIT/scripts/orquestrador" "$repo/scripts/orquestrador" \
+    -x '*.plist' -x runs
+  comparar_arquivo 'scripts/orq' "$KIT/scripts/orq" "$repo/scripts/orq"
+  comparar_dir 'docs/orquestrador/skill' \
+    "$KIT/doutrina" "$repo/docs/orquestrador/skill" \
+    -x VERSAO -x runs
+
+  printf '\n'
+  if [ "$DIFERENCAS" = 0 ]; then
+    printf 'idêntico ao kit %s\n' "$VERSAO"
+    return 0
+  fi
+  printf '%s diferença(s)\n' "$DIFERENCAS"
+  return 1
+}
+
+case "${1:-}" in
+  --verificar)  shift; verificar "${1:-}" ;;
+  --novo|--atualizar)
+    printf 'ainda não: peça K8\n'
+    exit 2
+    ;;
+  -h|--help|'') uso; [ -z "${1:-}" ] && exit 2 || exit 0 ;;
+  *) uso >&2; die "verbo desconhecido: $1" ;;
+esac
diff --git a/scripts/kit/test-instalar.sh b/scripts/kit/test-instalar.sh
new file mode 100644
index 0000000..e502272
--- /dev/null
+++ b/scripts/kit/test-instalar.sh
@@ -0,0 +1,67 @@
+#!/usr/bin/env bash
+# test-instalar.sh — os três casos do `instalar.sh --verificar` (peça K5).
+#
+#   (a) contra o repo de FIXTURE recém-instanciado  -> idêntico, rc 0
+#   (b) contra uma CÓPIA do fixture com um byte a mais em lib.sh
+#                                                    -> `diferente ... lib.sh`, rc 1
+#   (c) contra ~/Projetos/conteudos-infinitos (SÓ LEITURA)
+#                                                    -> o resultado real, seja qual for
+#
+# (c) não é assertivo por decisão: o checkout do CI é o repo de verdade de outra
+# pessoa, e o kit não manda nele. Diferença ali é ACHADO — vira linha de
+# relatório e, se for o caso, peça —, nunca falha deste script. O que ele
+# imprime é a saída crua, para ser colada.
+#
+# Uso: bash scripts/kit/test-instalar.sh
+
+set -uo pipefail
+
+KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
+CI_CHECKOUT="${ORQ_CI_CHECKOUT:-$HOME/Projetos/conteudos-infinitos}"
+
+FALHAS=0
+ok()    { printf '  ok    %s\n' "$*"; }
+falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
+
+FX="$(bash "$KIT/scripts/kit/fixture.sh")" || { printf 'ERRO: fixture.sh falhou\n' >&2; exit 2; }
+COPIA="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
+trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1; rm -rf "$COPIA"' EXIT
+
+# --- (a) ---------------------------------------------------------------------
+echo "== (a) fixture recém-instanciado =="
+saida="$(bash "$KIT/instalar.sh" --verificar "$FX" 2>&1)"; rc=$?
+printf '%s\n' "$saida" | sed 's/^/  | /'
+[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
+printf '%s' "$saida" | grep -q "idêntico ao kit $(cat "$KIT/VERSAO")" \
+  && ok "diz 'idêntico ao kit <VERSAO>'" || falha "não disse 'idêntico ao kit <VERSAO>'"
+
+# --- (b) ---------------------------------------------------------------------
+echo
+echo "== (b) cópia do fixture com UM byte a mais em lib.sh =="
+mkdir -p "$COPIA/repo"
+cp -R "$FX/." "$COPIA/repo/"
+# Um byte, literalmente: o menor estrago que ainda é estrago.
+printf 'x' >> "$COPIA/repo/scripts/orquestrador/lib.sh"
+saida="$(bash "$KIT/instalar.sh" --verificar "$COPIA/repo" 2>&1)"; rc=$?
+printf '%s\n' "$saida" | sed 's/^/  | /'
+[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
+printf '%s' "$saida" | grep -qE '^diferente +scripts/orquestrador/lib\.sh$' \
+  && ok "lista 'diferente scripts/orquestrador/lib.sh'" || falha "não listou o lib.sh como diferente"
+# NEGATIVO: um byte em lib.sh não pode arrastar mais nada para a lista.
+n="$(printf '%s\n' "$saida" | grep -cE '^(diferente|só no kit|só no repo) ')"
+[ "$n" = 1 ] && ok "exatamente 1 diferença, não uma cascata" || falha "$n diferenças (esperava 1)"
+
+# --- (c) ---------------------------------------------------------------------
+echo
+echo "== (c) $CI_CHECKOUT (SÓ LEITURA — o resultado é achado, não gate) =="
+if [ -d "$CI_CHECKOUT" ]; then
+  saida="$(bash "$KIT/instalar.sh" --verificar "$CI_CHECKOUT" 2>&1)"; rc=$?
+  printf '%s\n' "$saida" | sed 's/^/  | /'
+  printf '  (rc %s — informativo)\n' "$rc"
+else
+  printf '  (pulado: %s não existe nesta máquina)\n' "$CI_CHECKOUT"
+fi
+
+echo
+[ "$FALHAS" = 0 ] && { echo "TODOS OS CHECKS PASSARAM"; exit 0; }
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
```

## `dfc9d69` — docs da etapa 2 (K7 e K5 em FEITAS) e scripts/kit/fixture-e2e.sh, não executado

```
dfc9d69b6e10356ca0127087a271e99f47c224ce
docs da etapa 2 (K7 e K5 em FEITAS) e scripts/kit/fixture-e2e.sh, não executado

docs/PECAS.md: K7 e K5 saem de PENDENTES com sha (`4500bb2`/`67c485e` e
`0f023a6`). Entram três peças novas, todas com evidência no disco:

  K7-e2e  a travessia PAGA do loop. O script existe e recusa rodar sem
          ORQ_E2E_OK=1; falta o OK humano, não código.
  K5b     ACHADO: `orq mapa lint` roda `python3 scripts/roadmap/lint-mapa.py`
          (scripts/orq:226), logo `scripts/roadmap/` É motor vendorizado — o
          fixture.sh já o copia —, mas o escopo do `--verificar` são só três
          caminhos. Um lint desatualizado no repo passa por "idêntico". Não
          ampliei em K5: o escopo estava escrito na peça, e alargá-lo em
          silêncio é pior que a lacuna.
  K6(c)   ACHADO: `typecheck_marca` (executor.sh:415-424) combina dois gates
          por NOME fixo, `typecheck_root` e `typecheck_web` — nomes do monorepo
          do CI. Num repo cujo gate se chame `typecheck` a função devolve
          `nao-rodou` para um gate que rodou e passou. Não é fatal hoje (só
          alimenta a linha de evento), e por isso NÃO virou mudança de motor
          nesta etapa. Fica com K6, onde os nomes saem para o config.

docs/QUARENTENA.md já tinha sido reescrito em K7b; aqui só o sha do commit que
o fechou (o `--amend` daquele commit o havia deixado apontando para um objeto
que não existe mais).

scripts/kit/fixture-e2e.sh entra ESCRITO E NÃO EXECUTADO. Imprime, antes de
qualquer coisa, o que vai acontecer — comando, modelos por papel lidos do
config, `preflight_probe`, `usd_ticket`, `claude_timeout_secs` — e sai 2 sem
`ORQ_E2E_OK=1`. O watchdog é a técnica do `claude_run` (lib.sh:964-986), com
process group próprio, porque o macOS não tem `timeout`/`gtimeout` e sem o TERM
no GRUPO o `claude` filho vira órfão e segue queimando cota depois do corte.
O fixture NÃO é removido no fim: se o ticket reprovar, o diff da tentativa e o
veredito cru SÃO o resultado.

Zero mudança em scripts/orquestrador/**, scripts/orq, doutrina/ e _referencia-ci/**.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013KUjZwVRT1xAq4N4TKVhh6


 CHANGELOG.md               | 28 ++++++++++++-
 README.md                  |  6 +++
 docs/PECAS.md              | 87 +++++++++++++++++++++++++++++++----------
 docs/QUARENTENA.md         |  2 +-
 scripts/kit/fixture-e2e.sh | 97 ++++++++++++++++++++++++++++++++++++++++++++++
 5 files changed, 198 insertions(+), 22 deletions(-)
```

### diff

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 2939f7d..feb76b4 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -3,7 +3,8 @@
 ## 2.1.0-dev · 2026-09-08
 
 - Importa o harness do conteudos-infinitos @711ab5e (peças 0 a 13 e peça 1). Ver ORIGEM.md.
-- Ainda não instala em repo nenhum: instalar.sh e fixture vêm nas próximas peças (K5, K7).
+- Já VERIFICA uma instalação (`instalar.sh --verificar`) e já INSTANCIA um repo de fixture
+  (`scripts/kit/fixture.sh`). Instalar de verdade (`--novo`/`--atualizar`) é K8.
 
 ### Etapa 1 — o kit fica de pé (roda os próprios testes, sem o checkout do CI)
 
@@ -20,3 +21,28 @@
 Ainda vermelho, por falta da fixture de repo (K7): `test-lib-config.sh`,
 `test-drenagem.sh` e `test-retry-worktree.sh`, todos rc 2 — os três precisam de um
 checkout com `docs/fila`.
+
+### Etapa 2 — o kit instancia um repo e prova uma instalação
+
+- **K7a** `4500bb2` — `fixture/` (template do repo mínimo) e `scripts/kit/fixture.sh`
+  (instanciador). O fixture nasce em `/tmp/orq-fixture-XXXXXX/repo`, com o motor
+  vendorizado dentro (`scripts/orquestrador/`, `scripts/orq`, `scripts/roadmap/`,
+  `doutrina/` → `docs/orquestrador/skill/`, mais o carimbo `VERSAO`), `node_modules` por
+  symlink, `main` + `staging-auto` e um origin FALSO (`example.invalid`, RFC 2606) que
+  nunca recebe push. O `000-config.json` é mínimo por levantamento no disco: só as chaves
+  que o motor lê, cada uma com um comentário `_<chave>` dizendo de onde veio o valor.
+- **K7b** `67c485e` — as 8 quarentenas de K3 voltam a `it` e passam; `npx vitest run` sai
+  **612 passam, 0 skipped**. O harness ganhou `checkoutReal()`, que instancia o fixture uma
+  vez por arquivo de teste e o remove no `afterAll`. Nenhuma asserção foi tocada — só o
+  caminho: qual `lib.sh`, qual `cwd`, qual `docs/fila/runs`. `scripts/kit/test-shell.sh`
+  encadeia `test-lib-config.sh`, `test-drenagem.sh` e `test-retry-worktree.sh` contra o
+  fixture: rc 0 nos três (saíam rc 2). `test-preflight.sh` fica fora: chama a API.
+- **K5** `0f023a6` — `instalar.sh --verificar <repo>`: `diff -rq` do motor do kit contra o
+  vendorizado no repo, ignorando plist instanciado, `runs` e `VERSAO`; `idêntico ao kit
+  <VERSAO>` com rc 0, ou `diferente` / `só no kit` / `só no repo` com rc 1. `--novo` e
+  `--atualizar` dizem "ainda não: peça K8" e saem 2. `scripts/kit/test-instalar.sh` roda os
+  três casos. Contra `~/Projetos/conteudos-infinitos`: `repo sem VERSAO` + idêntico, rc 0.
+
+Ainda fora, esperando OK humano: a travessia PAGA do loop
+(`scripts/kit/fixture-e2e.sh`, peça K7-e2e no `docs/PECAS.md`). O script existe e recusa
+rodar sem `ORQ_E2E_OK=1`.
diff --git a/README.md b/README.md
index c2e51f0..cf79603 100644
--- a/README.md
+++ b/README.md
@@ -4,7 +4,13 @@ Uma implementação, N instalações. O motor do orquestrador autônomo (loop de
 
 - `scripts/orquestrador/` motor (driver bash + decisores TS) e testes shell
 - `scripts/orq` CLI de leitura e operação
+- `scripts/roadmap/` lint do MAPA — também vendorizado (`orq mapa lint` o chama no repo instalado)
+- `scripts/kit/` ferramentas do KIT, que não vão para repo nenhum: `fixture.sh` (instancia o repo
+  de fixture), `test-shell.sh`, `test-instalar.sh`, `fixture-e2e.sh`, `extrair-do-ci.sh`
 - `doutrina/` skill, referências e templates (vendorizada em `docs/orquestrador/skill/` de cada repo)
+- `fixture/` TEMPLATE do repo mínimo que o `scripts/kit/fixture.sh` instancia num tmp para
+  exercitar o motor ponta a ponta
+- `instalar.sh` hoje só `--verificar <repo>` (`--novo`/`--atualizar` são a peça K8)
 - `test/` vitest do harness
 - `_referencia-ci/` cópias do repo de origem para derivar templates; não fazem parte do kit instalado
 - `docs/` inventário, launchd, decisões
diff --git a/docs/PECAS.md b/docs/PECAS.md
index 60d4827..e84976a 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -48,15 +48,65 @@
   *Teste:* não tem teste próprio (é documento); o que ele afirma sobre o disco está verificado
   por `grep`/`cat` nas linhas citadas em cada peça.
 
+- **K7 · fixture de repo.** `fixture/` é o TEMPLATE (arquivos soltos, sem `.git`): toolchain,
+  `src/soma.ts` + teste verde, a fila (`000-config.json` schema 2 mínimo, `liberacoes.json`,
+  `decisoes-pendentes.md`, `rascunhos/`, o ticket 001) e o roadmap de um bloco/uma frente.
+  `scripts/kit/fixture.sh` INSTANCIA: `/tmp/orq-fixture-XXXXXX/repo`, motor vendorizado dentro,
+  `node_modules` por symlink, `git init -b main` + `staging-auto`, origin falso
+  (`git@example.invalid:fixture/orq-fixture.git`), e o caminho na última linha do stdout.
+  *Evidência:* `4500bb2` (K7a) e `67c485e` (K7b); inventário §8 item 2. O config é mínimo por
+  levantamento no disco, não por memória: `grep -ohE "cfg '[^']*'" scripts/orquestrador/*.sh` mais
+  os acessos diretos de `enforcement-core.ts:128,211`, `decisao.ts:71,113,277,363`, `juiz.ts:64-76`
+  e `gates.ts:176-178`. Dois valores são cobrados por teste do motor, não escolhidos:
+  `diff_cap_linhas = 600` e as 7 causas de `politica_adiamento` (`test-lib-config.sh:50,58,61`), e
+  `preflight_probe = true` (`test-retry-worktree.sh:216` exercita `probe_modelos` inteiro com
+  `claude_run` stubado; com `false`, `executor.sh:146` sai cedo e a seção 4 cai em 5 falhas).
+  `scripts/roadmap/` entra na vendorização porque `orq mapa lint` roda
+  `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT (`scripts/orq:226`).
+  *Teste:* `npx vitest run` — 24 arquivos, **612 passam, 0 em quarentena**;
+  `bash scripts/kit/test-shell.sh` — rc 0 nos três; `bash $FX/scripts/orq` diz
+  `ESTADO ocioso` / `FILA 1 pendente`; `bash $FX/scripts/orq validar --pendentes` sai 0;
+  `python3 scripts/roadmap/lint-mapa.py` dentro do fixture: 10 passaram, 0 falharam, 0 aviso.
+  *Falta:* a travessia PAGA do loop (`scripts/kit/fixture-e2e.sh`) espera OK humano — ver K7-e2e
+  em PENDENTES.
+
+- **K5 · `instalar.sh --verificar`.** `diff -rq` entre `scripts/orquestrador/**`, `scripts/orq` e
+  `doutrina/` do kit e `scripts/orquestrador/**`, `scripts/orq` e `docs/orquestrador/skill/` de um
+  repo, ignorando o plist instanciado (`*.plist` que não seja `*.plist.template`), `runs` e
+  `VERSAO`; imprime `idêntico ao kit <VERSAO>` (rc 0) ou a lista `diferente` / `só no kit` /
+  `só no repo` (rc 1). `--novo` e `--atualizar` dizem "ainda não: peça K8" e saem 2.
+  *Evidência:* `0f023a6`; inventário §4 decisão 2 e §8 pronto-quando; o mapa origem→destino é o do
+  `ORIGEM.md`. `LC_ALL=C` no `diff` é obrigatório: sem ele, numa máquina em pt_BR o parser não casa
+  nada e o verificador diria "idêntico" para um repo divergente.
+  *Teste:* `scripts/kit/test-instalar.sh` — (a) fixture recém-instanciado: idêntico, rc 0; (b)
+  cópia com UM byte a mais em `lib.sh`: `diferente scripts/orquestrador/lib.sh`, rc 1, e o NEGATIVO
+  de que é exatamente 1 diferença; (c) `~/Projetos/conteudos-infinitos` (só leitura): `repo sem
+  VERSAO` + `idêntico ao kit 2.1.0-dev`, rc 0 — e `git log 711ab5e..HEAD -- scripts/orquestrador
+  scripts/orq docs/orquestrador/skill` sai vazio lá, ou seja, a etapa 5 do CI não tocou o motor.
+
 ## PENDENTES
 
-- **K5 · `instalar.sh --verificar`.** `diff -r` entre `scripts/orquestrador/**`, `scripts/orq` e
-  `doutrina/` do kit e `scripts/orquestrador/**`, `scripts/orq` e `docs/orquestrador/skill/` de um
-  repo, ignorando o plist instanciado e `runs/`; imprime `idêntico ao kit <VERSAO>` ou a lista de
-  diferenças; rc 0 ou 1.
-  *Evidência:* inventário §4 decisão 2 (vendorizado por cópia, hash conferido no pré-voo) e §8
-  pronto-quando. O mapa origem→destino já está em `ORIGEM.md`.
-  *Teste:* contra o checkout do CI em 711ab5e devolve idêntico.
+- **K7-e2e · o fixture atravessa o loop (PAGA, espera OK humano).**
+  `scripts/kit/fixture-e2e.sh` já existe e recusa rodar sem `ORQ_E2E_OK=1`: instancia o fixture,
+  roda UMA drenagem do `local-loop.sh` dele com watchdog de `claude_timeout_secs + 120`s (técnica
+  do `claude_run`, `lib.sh:964-986` — o macOS não tem `timeout`), e imprime `orq`, as 20 últimas
+  linhas da trilha, `git log --oneline staging-auto -3` e o `custo.json`. O fixture NÃO é removido:
+  se reprovar, o diff da tentativa e o veredito cru SÃO o resultado.
+  *Evidência:* inventário §8 item 2, pronto-quando ("um ticket-fixture trivial atravessa o loop
+  ponta a ponta e o merge aparece na staging", `doutrina/references/setup.md:55`).
+  *Teste:* ticket 001 em `done`, merge na `staging-auto` do fixture, evento `APROVADO` na trilha,
+  nenhum push (o origin é `example.invalid`; se o loop tentasse, falharia alto — e isso também
+  seria resultado).
+
+- **K5b · o `--verificar` não cobre `scripts/roadmap/`.** ACHADO da etapa 2: `orq mapa lint` roda
+  `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT (`scripts/orq:226`), então
+  `scripts/roadmap/` É motor vendorizado — o `fixture.sh` já o copia. O escopo do `--verificar`,
+  como esta peça o descreve e como K5 o entregou, são só três caminhos: um `lint-mapa.py`
+  desatualizado no repo passa por "idêntico". Não foi ampliado em K5 por decisão (o escopo estava
+  escrito; alargá-lo em silêncio é pior que a lacuna).
+  *Evidência:* `scripts/orq:226`; `scripts/kit/fixture.sh`, bloco "o motor, vendorizado".
+  *Teste:* copiar o fixture, mexer num byte de `scripts/roadmap/lint-mapa.py` e exigir
+  `diferente scripts/roadmap/lint-mapa.py` com rc 1.
 
 - **K6 · pureza.** `scripts/kit/pureza.sh`: grep em CÓDIGO (não em comentário) de
   `scripts/orquestrador/**` e `scripts/orq` por premissa de repo. As duas reais hoje:
@@ -64,22 +114,19 @@
   247) → viram `toolchain.pacotes` no config, ou leitura dos `workspaces` do `package.json`;
   (b) nome e label do plist template (`scripts/orquestrador/com.conteudos.orquestrador.plist.template`)
   → `com.orquestrador.plist.template` com `{{LABEL}}`, e `instalar-launchd.sh` deriva o label do
-  config.
+  config;
+  (c) ACHADO da etapa 2: `typecheck_marca` (`executor.sh:415-424`) combina dois gates por NOME
+  fixo, `typecheck_root` e `typecheck_web` — nomes do monorepo do CI. Num repo cujo gate se chame
+  `typecheck` (o fixture, por exemplo) a função devolve `nao-rodou` para um gate que rodou e
+  passou. Não é fatal hoje (só alimenta a linha de evento), e por isso não virou mudança de motor
+  nesta etapa; os nomes dos gates têm de sair do config, como o resto.
   *Evidência:* inventário §8 item 5; as linhas citadas, no disco.
   *Teste:* pureza = 0 em código; comentário de proveniência pode ficar.
 
-- **K7 · fixture.** `fixture/`: repo mínimo (package.json + vitest + um ticket trivial +
-  `000-config.json` schema 2) que atravessa o loop ponta a ponta localmente, sem push. É onde
-  `--novo` é exercitado.
-  *Evidência:* inventário §8 item 2 e pronto-quando. **Destrava as 8 quarentenas de K3**
-  (`docs/QUARENTENA.md`) e os três shell tests, que hoje saem rc 2 pedindo um checkout com
-  `docs/fila`: `test-lib-config.sh` (espera o config dentro do `ORQ_EXEC_ROOT` que recebe),
-  `test-drenagem.sh:25,29` e `test-retry-worktree.sh:32,36` (copiam
-  `$CHECKOUT_REAL/docs/fila/000-config.json` e montam o próprio `ORQ_EXEC_ROOT`).
-  *Teste:* o fixture atravessa o loop até a sua `staging-auto`; os 8 `it.skip` voltam a `it` e
-  passam; os três shell tests devolvem rc 0.
-
-- **K8 · `instalar.sh --novo | --atualizar`, com `--dry-run` e relatório.** Migra
+- **K8 · `instalar.sh --novo | --atualizar`, com `--dry-run` e relatório.** O `--novo` nasce do
+  bloco de vendorização do `scripts/kit/fixture.sh` (K7a), que já é o mapa origem→destino do
+  `ORIGEM.md` executado: `scripts/orquestrador/` (menos o plist instanciado), `scripts/orq`,
+  `scripts/roadmap/`, `doutrina/` → `docs/orquestrador/skill/`, mais o carimbo `VERSAO`. Migra
   `liberacoes.json` (duas listas do Comarka → objetos, `em` → `liberado_em`, prefixo `humano:`),
   pause file (`.orq-pause` → `PAUSAR`), config (mapa de chaves legadas → schema 2 limpo) e o bloco
   JSON dos tickets pendentes (prosa intacta). Nunca reescreve objetivo de ticket.
diff --git a/docs/QUARENTENA.md b/docs/QUARENTENA.md
index 1f36f8a..deae6f8 100644
--- a/docs/QUARENTENA.md
+++ b/docs/QUARENTENA.md
@@ -14,7 +14,7 @@ por `toBeDefined` nem foi apagado.
 
 ## Saíram da quarentena
 
-Todas as 8 saíram com **K7b** (`4e0048a`), pela mesma porta: o
+Todas as 8 saíram com **K7b** (`67c485e`), pela mesma porta: o
 `test/fixtures/orq-harness.ts` ganhou `checkoutReal()`, que instancia o repo de
 fixture (`scripts/kit/fixture.sh`, peça K7a) uma vez por arquivo de teste e o
 remove no `afterAll`. Os casos passaram a apontar para o motor **vendorizado
diff --git a/scripts/kit/fixture-e2e.sh b/scripts/kit/fixture-e2e.sh
new file mode 100644
index 0000000..34592b0
--- /dev/null
+++ b/scripts/kit/fixture-e2e.sh
@@ -0,0 +1,97 @@
+#!/usr/bin/env bash
+# fixture-e2e.sh — o fixture atravessa o loop de ponta a ponta (peça K7-e2e).
+#
+# ESTE SCRIPT GASTA DINHEIRO. É o único do kit que chama a API da Anthropic:
+# uma sondagem de modelo (preflight_probe) e as tentativas do executor + o juiz,
+# nos modelos e no teto que o 000-config.json DO FIXTURE declara. Não rode sem
+# ter lido, no config instanciado, `modelos`, `orcamento.usd_ticket` e
+# `claude_timeout_secs` — o script os imprime antes de começar, e exige
+# confirmação (ORQ_E2E_OK=1) para seguir.
+#
+# O que ele faz: instancia o fixture, roda UMA drenagem (`local-loop.sh` do
+# fixture, com watchdog de claude_timeout_secs + 120 s) e imprime a evidência.
+# O fixture NÃO é removido no fim: se o ticket reprovar, o diff da tentativa e o
+# veredito cru são o resultado, e apagá-los seria apagar o achado.
+#
+# Nenhum push acontece nem pode acontecer: o origin do fixture é
+# git@example.invalid:..., reservado pela RFC 2606. Se o loop tentasse publicar,
+# falharia alto — e isso também seria resultado.
+#
+# Uso: ORQ_E2E_OK=1 bash scripts/kit/fixture-e2e.sh
+
+set -uo pipefail
+
+KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
+CFG_TEMPLATE="$KIT/fixture/docs/fila/000-config.json"
+
+printf '== o que esta execução vai fazer ==\n'
+printf '  comando        bash <fixture>/scripts/orquestrador/local-loop.sh (UMA drenagem)\n'
+printf '  ticket         001 soma-de-negativos (docs/fila/001-soma-de-negativos.md)\n'
+printf '  executor       %s\n' "$(jq -r '.executor_model' "$CFG_TEMPLATE")"
+printf '  juiz (alto)    %s\n' "$(jq -r '.modelos.juiz_alto' "$CFG_TEMPLATE")"
+printf '  juiz (baixo)   %s\n' "$(jq -r '.modelos.juiz_baixo' "$CFG_TEMPLATE")"
+printf '  retry final    %s\n' "$(jq -r '.retry_final_model' "$CFG_TEMPLATE")"
+printf '  sondagem       preflight_probe = %s (chamada paga antes do ticket)\n' "$(jq -r '.preflight_probe' "$CFG_TEMPLATE")"
+printf '  orçamento      usd_ticket = %s · usd_dia = %s\n' \
+  "$(jq -r '.orcamento.usd_ticket' "$CFG_TEMPLATE")" "$(jq -r '.orcamento.usd_dia' "$CFG_TEMPLATE")"
+printf '  timeout        claude_timeout_secs = %s\n' "$(jq -r '.claude_timeout_secs' "$CFG_TEMPLATE")"
+printf '  ESTA CHAMADA É PAGA.\n\n'
+
+if [ "${ORQ_E2E_OK:-0}" != 1 ]; then
+  printf 'recusado: rode com ORQ_E2E_OK=1 para confirmar que o gasto está autorizado.\n' >&2
+  exit 2
+fi
+
+command -v claude >/dev/null 2>&1 || { printf 'ERRO: claude fora do PATH\n' >&2; exit 2; }
+
+FX="$(bash "$KIT/scripts/kit/fixture.sh")" || { printf 'ERRO: fixture.sh falhou\n' >&2; exit 2; }
+printf '\nfixture: %s  (NÃO é removido no fim — a evidência mora nele)\n\n' "$FX"
+
+TOUT=$(( $(jq -r '.claude_timeout_secs' "$FX/docs/fila/000-config.json") + 120 ))
+
+# Watchdog portátil: o macOS não tem `timeout`/`gtimeout`. Mesma técnica do
+# `claude_run` do lib.sh (lib.sh:964-986) — process group próprio e TERM no
+# GRUPO, senão o `claude` filho vira órfão e segue queimando cota depois do
+# corte.
+printf '== drenagem (watchdog %ss) ==\n' "$TOUT"
+t0=$(date +%s)
+( set -m; exec bash "$FX/scripts/orquestrador/local-loop.sh" ) &
+LOOP_PID=$!
+( sleep "$TOUT"
+  kill -TERM -"$LOOP_PID" 2>/dev/null || kill -TERM "$LOOP_PID" 2>/dev/null
+  sleep 10
+  kill -KILL -"$LOOP_PID" 2>/dev/null || kill -KILL "$LOOP_PID" 2>/dev/null
+) >/dev/null 2>&1 &
+WPID=$!
+RC=0; wait "$LOOP_PID" 2>/dev/null || RC=$?
+kill "$WPID" 2>/dev/null || true; wait "$WPID" 2>/dev/null || true
+case "$RC" in 143|137) RC=124 ;; esac
+printf 'local-loop rc=%s  (%ss)\n\n' "$RC" "$(( $(date +%s) - t0 ))"
+
+secao() { printf '\n===== %s =====\n' "$*"; }
+
+secao 'bash scripts/orq'
+bash "$FX/scripts/orq" 2>&1 || true
+
+secao 'tail -20 docs/fila/runs/events.log'
+tail -20 "$FX/docs/fila/runs/events.log" 2>&1 || true
+
+secao 'git log --oneline staging-auto -3'
+git -C "$FX" log --oneline staging-auto -3 2>&1 || true
+
+secao 'docs/fila/runs/custo.json'
+jq . "$FX/docs/fila/runs/custo.json" 2>&1 || cat "$FX/docs/fila/runs/custo.json" 2>&1 || true
+
+secao 'status do ticket 001'
+sed -n '/```json/,/```/p' "$FX/docs/fila/001-soma-de-negativos.md" | jq -r '.status, .notas_status' 2>/dev/null \
+  || grep -n '"status"' "$FX/docs/fila/001-soma-de-negativos.md"
+
+secao 'tail -30 docs/fila/runs/local-loop.log'
+tail -30 "$FX/docs/fila/runs/local-loop.log" 2>&1 || true
+
+secao 'origin (tem de ser inválido; nenhum push é possível)'
+git -C "$FX" remote -v
+
+printf '\nfixture preservado em: %s\n' "$FX"
+printf 'para remover:  bash scripts/kit/fixture.sh --limpar %s\n' "$FX"
+exit "$RC"
```

---

# Adendo · K7-e2e (rodado depois do "OK e2e") e peça 1d

Commits acrescentados: `e4a6874` (peça 1d, só o PECAS) e `8525c49` (resultado do e2e).

## Resultado: APROVADO

`local-loop rc=0`, 52 s de drenagem, uma tentativa, zero retry. Ticket 001 `done`,
merge na `staging-auto` do fixture. Nenhum push — o origin é `example.invalid` e o
loop nem tentou.

Custo real: probe US$ 0,0854668 + executor US$ 0,196733 + juiz US$ 0,0870748 =
**US$ 0,369**, contra `usd_ticket` = 1.

Fixture preservado (é onde mora a evidência):
`/private/tmp/orq-fixture-lBirWe/repo`.

## Achado do e2e: a trilha mentiu sobre os gates

```
001 GATE typecheck=nao-rodou testes=nao-rodou enforcement=ok criterios=4/4 build=nao-rodou
```

e, no MESMO attempt, `runs/001/attempt-0/gates.txt`:

```
ok   typecheck               275ms
ok   test                    330ms
VEREDITO: APROVADO
```

Causa: `event_gate` (`executor.sh:428-442`) procura os gates por NOME FIXO do
monorepo do CI — `typecheck_root`/`typecheck_web` via `typecheck_marca`, mais
`testes_por_pacote` e `build`. Num repo cujos gates se chamem `typecheck` e `test`,
todas as três marcas viram `nao-rodou`.

Não derruba o run: o desfecho sai do `gates.txt`, não da linha de evento. Mas a
trilha é o ground truth de "o que aconteceu", e aqui ela afirma "não rodou" sobre
gate que rodou e aprovou. Ficou com **K6(c)**, com teste próprio escrito na peça —
não virou mudança de motor nesta sessão.

## Peça 1d aberta (`e4a6874`, só o PECAS)

Guard de CLI do `gate-ticket.ts` (`:549-551`) compara `import.meta.url` com
`argv[1]` sem `realpath`; chamado por caminho com symlink sai rc 0 sem imprimir
nada. Conserto no motor (realpath dos dois lados) + teste que chama o gate por um
symlink e exige saída.

## Saídas cruas

### `bash scripts/orq` (do fixture)

```
ORQUESTRADOR · 2026-09-08 11:54:53
ESTADO   ocioso
TICKET   —
DESDE    11:54:09
FASE     —
FILA     1 done
STAGING  5d7c32d · push suprimido (publicar é humano neste repo)
ÚLTIMO   001 DONE 11:54:53 (merge em staging-auto)
MOTIVO   sem ticket processável
```

### `tail -20 docs/fila/runs/events.log`

```
2026-09-08T11:54:02-0300 --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
2026-09-08T11:54:09-0300 001 INICIO attempt=1 model=sonnet
2026-09-08T11:54:45-0300 001 GATE typecheck=nao-rodou testes=nao-rodou enforcement=ok criterios=4/4 build=nao-rodou
2026-09-08T11:54:52-0300 001 JUIZ veredito=aprovado classe=baixo modelo=sonnet attempt=1
2026-09-08T11:54:53-0300 001 APROVADO merge=aguardando dur=32s attempt=1
2026-09-08T11:54:53-0300 001 MERGE alvo=staging-auto sha=5d7c32d
2026-09-08T11:54:53-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 dur=1min
```

### `git log --oneline staging-auto -3`

```
5d7c32d orq: frente/001 (ticket 001) em staging-auto
eedfa19 001: adiciona somaNegativos e teste correspondente
02d1508 fixture: repo mínimo + motor vendorizado do kit
```

### `docs/fila/runs/custo.json`

```json
{
  "dias": {
    "2026-09-08": [
      { "data": "2026-09-08", "papel": "probe",    "ticket": "---", "attempt": 0,
        "tokens_in": 2,  "tokens_out": 4,    "tokens_cache": 18534,  "custo_usd": 0.0854668 },
      { "data": "2026-09-08", "papel": "executor", "ticket": "001", "attempt": 0,
        "tokens_in": 12, "tokens_out": 1801, "tokens_cache": 259975, "custo_usd": 0.19673300000000002 },
      { "data": "2026-09-08", "papel": "juiz",     "ticket": "001", "attempt": 0,
        "tokens_in": 2,  "tokens_out": 140,  "tokens_cache": 18534,  "custo_usd": 0.0870748 }
    ]
  }
}
```

### Veredito CRU do juiz

`runs/001/attempt-0/juiz.veredito.json` (o que o parser leu):

```json
{"aprovado":true,"motivo":"src/soma.ts:14-17 exporta somaNegativos, importada e chamada em test/soma.test.ts:2,16-19 com casos -6 e 0 que quebrariam se a mudança fosse revertida; testes existentes (soma.test.ts:5-15) permanecem intactos e a função soma original não foi tocada.","criterios_falhos":[]}
```

`runs/001/attempt-0/juiz.raw.json`, campo `result` (o que o CLI devolveu, antes de
qualquer parse):

```
"{\"aprovado\": true, \"motivo\": \"src/soma.ts:14-17 exporta somaNegativos, importada e chamada em test/soma.test.ts:2,16-19 com casos -6 e 0 que quebrariam se a mudança fosse revertida; testes existentes (soma.test.ts:5-15) permanecem intactos e a função soma original não foi tocada.\", \"criterios_falhos\": []}"
```

Envelope do mesmo arquivo: `"stop_reason":"end_turn"`, `"num_turns":1`,
`"subtype":"success"`, `"is_error":false`, `"total_cost_usd":0.0870748`,
modelo `claude-sonnet-5`.

### `runs/001/attempt-0/enforcement.json`

```json
{ "ok": true, "violations": [] }
```

### Diff que o agente produziu (`runs/001/attempt-0/diff.patch`)

```diff
diff --git a/src/soma.ts b/src/soma.ts
@@ -10,3 +10,8 @@
 export function soma(numeros: number[]): number {
   return numeros.reduce((acc, n) => acc + n, 0);
 }
+
+/** Soma apenas os números menores que zero. Lista sem negativos soma 0. */
+export function somaNegativos(numeros: number[]): number {
+  return numeros.filter((n) => n < 0).reduce((acc, n) => acc + n, 0);
+}
diff --git a/test/soma.test.ts b/test/soma.test.ts
@@ -1,5 +1,5 @@
 import { describe, it, expect } from 'vitest';
-import { soma } from '../src/soma.js';
+import { soma, somaNegativos } from '../src/soma.js';
@@ -13,4 +13,9 @@ describe('soma', () => {
   it('mistura de sinais soma o total, sem filtrar', () => {
     expect(soma([-2, 3, -4])).toBe(-3);
   });
+
+  it('somaNegativos soma só os menores que zero', () => {
+    expect(somaNegativos([-2, 3, -4])).toBe(-6);
+    expect(somaNegativos([1, 2])).toBe(0);
+  });
 });
```

12 linhas, dentro do `diff_cap_linhas` 600 e do `diff_estimado` 20 declarado no
ticket. Os quatro critérios de aceite passaram, `enforcement ok`.

## Diff cru dos dois commits do adendo


### `e4a6874` — peça 1d: gate mudo por symlink no caminho (achado da etapa 2)

```diff
diff --git a/docs/PECAS.md b/docs/PECAS.md
index e84976a..7d4c263 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -171,6 +171,20 @@
   *Evidência:* inventário §5 (linha do validador de ticket).
   *Teste:* um caso por check, mais o NEGATIVO do gate barrando antes do agente.
 
+- **1d · gate mudo por symlink no caminho.** O guard de CLI do `gate-ticket.ts` compara
+  `import.meta.url` com `argv[1]` sem `realpath`; chamado por caminho com symlink (macOS
+  `/tmp` → `/private/tmp`) sai 0 sem rodar nada: gate mudo. Conserto no MOTOR: `realpath`
+  dos dois lados.
+  *Evidência:* `scripts/orquestrador/gate-ticket.ts:549-551`
+  (`if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)`);
+  `resolve()` normaliza mas NÃO resolve symlink, e o `import.meta.url` que o node entrega vem
+  fisicamente resolvido. Medido na etapa 2: com o fixture em `/tmp/orq-fixture-*/repo`,
+  `orq validar --relatorio 001` saía rc 0 com stdout VAZIO; com `/private/tmp/...`, imprimia o
+  relatório. Contornado no kit (o `scripts/kit/fixture.sh` imprime `pwd -P`), não consertado —
+  o buraco espera qualquer repo instalado sob caminho com symlink.
+  *Teste:* chamar o gate por um symlink e EXIGIR saída — o caso negativo é o que falta hoje:
+  gate que sai 0 sem imprimir nada é indistinguível de gate que aprovou.
+
 - **K12 · painel.** `orq-server.py` + `orq-painel.py` do Comarka entram como `painel/`, refatorados
   para ler só o contrato (STATUS, events, custo, liberacoes v2, PAUSAR, tickets); `LABELS` →
   `~/.orq/repos.json`; ações via `orq`; notificação nativa desligada; zero `if repo`.
```

### `8525c49` — K7-e2e: o fixture atravessou o loop (drenagem real, com OK humano)

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index feb76b4..f5da9a5 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -43,6 +43,17 @@ checkout com `docs/fila`.
   `--atualizar` dizem "ainda não: peça K8" e saem 2. `scripts/kit/test-instalar.sh` roda os
   três casos. Contra `~/Projetos/conteudos-infinitos`: `repo sem VERSAO` + idêntico, rc 0.
 
-Ainda fora, esperando OK humano: a travessia PAGA do loop
-(`scripts/kit/fixture-e2e.sh`, peça K7-e2e no `docs/PECAS.md`). O script existe e recusa
-rodar sem `ORQ_E2E_OK=1`.
+- **K7-e2e** — o fixture ATRAVESSOU o loop, com OK humano, em 2026-09-08. A peça não muda
+  código: a evidência é a execução, registrada aqui e no `docs/PECAS.md`.
+  Uma drenagem de 52 s: ticket 001 `done`, merge em `staging-auto` (`5d7c32d`), evento
+  `APROVADO` na trilha, uma tentativa e zero retry. Custo real US$ 0,369 (probe 0,0855 +
+  executor 0,1967 + juiz 0,0871) contra `usd_ticket` 1. Nenhum push — o origin é
+  `example.invalid` e o loop nem tentou.
+- **1d** `e4a6874` — peça aberta (não é conserto): o guard de CLI do `gate-ticket.ts`
+  compara `import.meta.url` com `argv[1]` sem `realpath`, e chamado por caminho com symlink
+  sai rc 0 com stdout vazio — gate mudo. Contornado no kit, a consertar no motor.
+
+Achado que o e2e mediu e que ficou com K6: `event_gate` monta a linha `GATE` da trilha
+procurando gates por nome fixo do monorepo do CI, então a trilha gravou
+`typecheck=nao-rodou testes=nao-rodou build=nao-rodou` para gates que o `gates.txt` do mesmo
+attempt registra como `ok`. Não derruba o run; faz a trilha mentir.
diff --git a/docs/PECAS.md b/docs/PECAS.md
index 7d4c263..e322e7f 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -84,19 +84,24 @@
   VERSAO` + `idêntico ao kit 2.1.0-dev`, rc 0 — e `git log 711ab5e..HEAD -- scripts/orquestrador
   scripts/orq docs/orquestrador/skill` sai vazio lá, ou seja, a etapa 5 do CI não tocou o motor.
 
-## PENDENTES
+- **K7-e2e · o fixture atravessou o loop.** `scripts/kit/fixture-e2e.sh` (recusa rodar sem
+  `ORQ_E2E_OK=1`) instanciou o fixture, rodou UMA drenagem do `local-loop.sh` dele e o ticket 001
+  saiu `done` com merge na `staging-auto` do fixture. Rodado com OK humano explícito em
+  2026-09-08.
+  *Evidência:* a própria execução (esta peça não muda código): drenagem de 52 s,
+  `local-loop rc=0`, 2026-09-08 11:54 -0300. Trilha:
+  `001 INICIO attempt=1 model=sonnet` → `GATE ... enforcement=ok criterios=4/4` →
+  `JUIZ veredito=aprovado classe=baixo modelo=sonnet attempt=1` → `001 APROVADO merge=aguardando
+  dur=32s attempt=1` → `001 MERGE alvo=staging-auto sha=5d7c32d` →
+  `DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0`. Custo real: probe US$ 0,0855 +
+  executor US$ 0,1967 + juiz US$ 0,0871 = **US$ 0,369**, contra `usd_ticket` 1. Uma tentativa, zero
+  retry. Nenhum push: o origin é `git@example.invalid:...` e o loop nem tentou.
+  *Teste:* o pronto-quando do `doutrina/references/setup.md:55` ("um ticket-fixture trivial
+  atravessa o loop ponta a ponta e o merge aparece na staging"), cumprido — e os 4 critérios de
+  aceite do ticket verdes, `enforcement ok`, `gates.txt` com `ok typecheck` / `ok test` /
+  `VEREDITO: APROVADO`.
 
-- **K7-e2e · o fixture atravessa o loop (PAGA, espera OK humano).**
-  `scripts/kit/fixture-e2e.sh` já existe e recusa rodar sem `ORQ_E2E_OK=1`: instancia o fixture,
-  roda UMA drenagem do `local-loop.sh` dele com watchdog de `claude_timeout_secs + 120`s (técnica
-  do `claude_run`, `lib.sh:964-986` — o macOS não tem `timeout`), e imprime `orq`, as 20 últimas
-  linhas da trilha, `git log --oneline staging-auto -3` e o `custo.json`. O fixture NÃO é removido:
-  se reprovar, o diff da tentativa e o veredito cru SÃO o resultado.
-  *Evidência:* inventário §8 item 2, pronto-quando ("um ticket-fixture trivial atravessa o loop
-  ponta a ponta e o merge aparece na staging", `doutrina/references/setup.md:55`).
-  *Teste:* ticket 001 em `done`, merge na `staging-auto` do fixture, evento `APROVADO` na trilha,
-  nenhum push (o origin é `example.invalid`; se o loop tentasse, falharia alto — e isso também
-  seria resultado).
+## PENDENTES
 
 - **K5b · o `--verificar` não cobre `scripts/roadmap/`.** ACHADO da etapa 2: `orq mapa lint` roda
   `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT (`scripts/orq:226`), então
@@ -115,11 +120,19 @@
   (b) nome e label do plist template (`scripts/orquestrador/com.conteudos.orquestrador.plist.template`)
   → `com.orquestrador.plist.template` com `{{LABEL}}`, e `instalar-launchd.sh` deriva o label do
   config;
-  (c) ACHADO da etapa 2: `typecheck_marca` (`executor.sh:415-424`) combina dois gates por NOME
-  fixo, `typecheck_root` e `typecheck_web` — nomes do monorepo do CI. Num repo cujo gate se chame
-  `typecheck` (o fixture, por exemplo) a função devolve `nao-rodou` para um gate que rodou e
-  passou. Não é fatal hoje (só alimenta a linha de evento), e por isso não virou mudança de motor
-  nesta etapa; os nomes dos gates têm de sair do config, como o resto.
+  (c) ACHADO da etapa 2, **medido no e2e**: `event_gate` (`executor.sh:428-442`) monta a linha
+  `GATE` da trilha procurando gates por NOME FIXO do monorepo do CI — `typecheck_marca` casa
+  `typecheck_root`/`typecheck_web` (`executor.sh:415-424`), e as outras duas marcas casam
+  `testes_por_pacote` e `build`. Num repo cujos gates se chamem `typecheck` e `test` (o fixture),
+  a drenagem de 2026-09-08 gravou na trilha
+  `001 GATE typecheck=nao-rodou testes=nao-rodou enforcement=ok criterios=4/4 build=nao-rodou`
+  enquanto o `gates.txt` do mesmo attempt dizia `ok typecheck` / `ok test` /
+  `VEREDITO: APROVADO`. **A trilha afirmou "não rodou" sobre gates que rodaram e aprovaram.**
+  Não derruba o run (o desfecho sai do `gates.txt`, não da linha de evento), mas a trilha é o
+  ground truth de "o que aconteceu" — e aqui ela mente por premissa de repo. Os nomes dos gates
+  têm de sair do config, como o resto.
+  *Teste desta parte:* um repo de fixture com gates de nome próprio, e a linha `GATE` da trilha
+  refletindo o `gates.txt` — nenhum `nao-rodou` para gate que consta como `ok`.
   *Evidência:* inventário §8 item 5; as linhas citadas, no disco.
   *Teste:* pureza = 0 em código; comentário de proveniência pode ficar.
 
```
