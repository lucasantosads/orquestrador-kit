# Relatório · kit etapa 7b · decisão e custo

Worktree `~/Projetos/_worktrees/kit-etapa7b`, branch `kit/etapa7b`, 21/09/2026. Nenhum push,
nenhum merge, nenhuma chamada ao Claude, nenhum `launchctl` fora do stub, nenhuma escrita em
conteudos-infinitos, actus-saas ou comarka-operacional (os `git status` dos dois repos alvo
foram conferidos iguais antes e depois dos dry-runs). Os testes novos rodam no bash 3.2 do
macOS (`/bin/bash`). Como na 7a, o worktree ganhou um symlink `node_modules` para o do
checkout principal, ignorado pelo git e fora de todo commit.

## Passo 0 · o que foi lido, e onde o kit decidia ESCALAR e armava cooldown

Lidos: a revisão Comarka x kit (§2 linhas B2, B3, E4, F1, L1; §3 item 3); o relatório da 7a
(7a-3 e o acréscimo 7a-8); neste worktree `decisao.ts`, `executor.sh`, `lib.sh`,
`local-loop.sh`, CONTRATO §4.1, `docs/PECAS.md`; os dois testes que falhavam; no Comarka, só
leitura, `test-cooldown-causa.sh`, `test-adiado.sh`, `test-parser-verdict.sh`, `lib.sh:320-345`
e `avaliador.sh:125-145`. A pedido na sessão, também os commits do Actus `08afb3e`, `43fccdd`,
`748b31d`, `f3aaa89` e `5791209` (e, para classificar as 21 diferenças, `c404986`, `a15daca`,
`aab3f4e`, `e6fad83`, `f1e9796`, `7781241`, `f8c6e77`, `bf658ec`).

As cinco linhas (em `main`, `b70e6e3`, antes da 7b):

1. ESCALAR: `decisao.ts:298` (`if (regra.modelo === 'ESCALAR')` troca para `retry_final_model`), e a regra do config é `criterio_qualidade = ESCALAR`.
2. Tudo vira `criterio_qualidade`: `decisao.ts:229` (critério falho) e `:235` (exit != 0); o gate reprovado entra como critério em `executor.sh:864` (`criteriosFalhos += ["gates reprovados"]`).
3. 503/overloaded viravam `rate_limit`: `decisao.ts:157`.
4. Cooldown em todo adiamento: `executor.sh:1053` chama `mark_adiado`, que arma em `lib.sh:845` (`cooldown_arm`, incondicional); a sondagem também, em `executor.sh:178`.
5. Tentativas por drenagem (ajuste (a)): `executor.sh:990` (`local ... attempt=0` no `drive_ticket`) e `:1071` passa esse contador ao `decisao retry`.

## Decisões tomadas na sessão (todas perguntadas e respondidas, exceto onde dito)

- **7b-1**: `migrar-tickets.test.ts` entrou no escopo (amostra datada, números exatos, antes e
  depois por asserção); a (c) do `test-instalar.sh` só roda com `ORQ_CI_CHECKOUT`. O config do
  Actus usado é o v1 de `5b623d5^` (o fixture `test/fixtures/config/actus-000-config.json` que
  já existia é byte a byte esse blob): o teste é sobre migrar um v1, e o config vivo já é v2.
- **7b-2 · gate_crash**: em qualquer papel quando o runner não rodou (rc 126/127, command not
  found, ENOENT do binário, Missing script, saída vazia com rc != 0); no papel testes também
  sem placar e sem linha de teste falhando. Placar ou teste falhando no recorte provam que o
  runner rodou e vencem qualquer texto de erro (decisão minha, dentro da regra: um teste que
  imprime "command not found" continua mérito; há caso de teste para isso).
- **7b-2 · AMBIENTE**: a régua da 7a-8 vale sobre todo ADIADO sem cooldown, não só preflight.
- **7b-2 · rótulos** (decisão minha, dentro do brief): `servidor` e `gate_crash` são ligados
  pelos rótulos que já existem ("rate limit" e "gate interrompido"); rótulo novo faria todo
  repo instalado deixar de adiar um 503 no dia da atualização.
- **7b-2 · preflight** (decisão minha): a recusa não toca o ticket (nem nota nem commit), só
  trilha e STATUS; commitar a cada disparo com o ambiente quebrado só suja o histórico.
- **7b-3**: adiado COM cooldown não conta nem zera.
- **7b-4**: sub de linha antiga (sem `sub=`) é derivado do GATE/JUIZ da mesma tentativa; a série
  de repetição é quebrada por APROVADO, MERGE, BLOQUEADO, REFATIAR ou RECUPERADO, não por ADIADO
  (decisão minha). Tentativas persistidas entraram na 7b-4 (ajuste (a)).
- **Asserções antigas**: autorizadas as três do pedido; as outras que quebraram estão abaixo,
  cada uma ligada a uma decisão do brief.
- **7b-7**: `docs/launchd.md` (fora do escopo) ainda mostra `RunAtLoad false`, e
  `test/orquestrador-agendamento.test.ts:191-193` fixa esse doc; não mexi. Fica para a 7c.

## Asserções antigas trocadas (arquivo:linha, decisão, antes e depois)

| Arquivo:linha (antes) | Peça e decisão do brief | Antes | Depois (mesma força) |
|---|---|---|---|
| `test/orquestrador-adiamento-actus.test.ts:82-85` | 7b-2, 5xx não é rate_limit | 503 e Service Unavailable → `rate_limit` | → `servidor`, `desfecho adiado` e `cooldown false`; 429 → `rate_limit` com `cooldown true` |
| `test/orquestrador-decisao.test.ts:115-118` | 7b-2, causas novas | 7 causas: conexao, gate_interrompido, juiz_ilegivel, quota, rate_limit, sessao, timeout | as mesmas 7 + `servidor` e `gate_crash`, lista exata |
| `test/orquestrador-decisao.test.ts:215-222` | 7b-4, ESCALAR só com sub=juiz | critério falho escala | três casos: `sub=juiz` escala; `sub=criterio` e `sub=gate_testes` mantêm (modelo, escalou, estreitarEscopo afirmados nos três) |
| `test/orquestrador-tools-derivadas.test.ts:219-220` | 7b-2 (preflight vira desfecho) e 7b-4 (repetição bloqueia) | 7 marcas `DESFECHO_NOMEADO=1` | 9, e a marca exigida dentro de `preflight_ou_adia` e do ramo `motivo=repeticao` |
| `test/orquestrador-trilha.test.ts:174` | 7b-4, tentativas persistidas (ajuste a) | `attempt-$((slot + attempt))` | `attempt-$((slot + attempt - attempt0))` e `attempt0` lido de `ticket_tentativas` |

## Commits do Actus lidos (ajuste b): o que entra e o que é descartado

| Commit | Conteúdo | Destino no kit | Motivo |
|---|---|---|---|
| `08afb3e` | causa `ambiente`: impedimento declarado e permissão negada ADIAM | **descartado** | decisão do programa: permissão negada com critério vermelho é mérito (7b-4, `sub=criterio`, sem escalar); impedimento por texto o próprio Actus tirou em `748b31d` |
| `43fccdd` | "falha de ambiente da worktree" como 8ª causa em `config-tabela.ts:NOVAS` | **descartado** | mesma decisão; o rótulo no config do Actus fica inofensivo com o motor do kit (não casa nenhum `ROTULO_PARA_CAUSA`) |
| `748b31d` (1) | "resultado verde vence sinal de execução": permissão negada com tudo verde = aprovado | **compatível, já vale** | no kit permissão negada nunca foi desfecho: só alimenta o diagnóstico; com gates, critérios e juiz verdes o desfecho é aprovado |
| `748b31d` (2) | sai a detecção de impedimento por texto | **compatível** | o kit nunca teve |
| `748b31d` (3) | permissão negada + critério vermelho = adiado `ambiente` | **descartado** | é o oposto da decisão; `test-reprovado-sub.sh` caso A prova REPROVADO `sub=criterio`, RETRY sonnet |
| `f3aaa89` | tentativas persistidas no ticket | **entrou na 7b-4** | confirmado no kit (`executor.sh:990`); mesmos nomes (`ticket_tentativas`, `ticket_set_tentativas`, `ticket_zera_tentativas`) e mesma regra (consome antes, devolve se não reprovou, zera no done) |
| `5791209` | RunAtLoad true | **entrou na 7b-7** | |

## O patch local de permissoesNegadas do Actus

O que o `--atualizar` apagaria, arquivo por arquivo (do motor do Actus hoje):

- `decisao.ts`: `:93` o membro `'ambiente'` de CausaInfra; `:110` o rótulo `/ambiente|impedimento/i`; `:151` o campo `permissoesNegadas`; `:179` `houveFalhaDeResultado`; `:205-206` o ramo que devolve `'ambiente'`.
- `executor.sh`: `:713` e `:878-890`, o `permissoesNegadas:$pn` no `sinal` do jq (o de `:956`, no diagnóstico do retry, existe igual no kit e fica).
- `lib.sh`: só comentário de contagem (`7781241`, "6 das 8"); nenhuma lógica.
- `config-tabela.ts`: a 8ª causa (`43fccdd`) e ponteiros de linha (`f1e9796`, `7781241`).

**A 7b-4 cobre o que o patch queria?** Cobre o problema de CUSTO que o motivou, e decide o
oposto sobre o desfecho. O patch existia porque o 481 queimou tentativas em opus com critério
vermelho por ambiente de worktree. Com a 7b: o critério vermelho repete em sonnet (não escala),
a 2ª reprovação igual (mesmo sub, mesmo diff) bloqueia sem 3ª volta, as tentativas contam no
total e não por drenagem, e o runner de gate que não roda adia como `gate_crash`. O que a 7b
NÃO faz, por decisão: adiar um critério vermelho porque houve permissão negada. O 481 real
sairia assim: reprova em sonnet, reprova igual, bloqueia com `motivo=repeticao` e a nota
dizendo o critério; o conserto (critério que depende de `ls node_modules` na worktree) é de
ticket, e o gate de ticket do Actus (`a15daca`, `aab3f4e`, `c404986`) é o que pega isso antes.

## 7b-1 · nenhum teste do kit lê arquivo vivo de outro repo

sha: `a28fe81`

### Vermelho (as 3 falhas de hoje, cruas, em b70e6e3)

vitest (`npx vitest run`, trecho das falhas e o placar):

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-migrar-config.test.ts > os dois configs reais: quanto o proposto melhora, e o que sobra > actus-saas: o proposto tem MENOS violações que o original, e o resto é decisão local
AssertionError: o relatório tem de trazer o veredito do orq config: expected null to be truthy

- Expected: 
true

+ Received: 
null

 ❯ test/orquestrador-migrar-config.test.ts:575:79
    573|       // tabela declara não cobrir. Nenhuma é surpresa silenciosa.
    574|       const violacoes = /(\d+) violação\(ões\)/.exec(saida);
    575|       expect(violacoes, 'o relatório tem de trazer o veredito do orq c…
       |                                                                               ^
    576|       expect(saida).toMatch(/decisão\(ões\) local\(is\) esperando algu…
    577|       // O NEGATIVO que importa: nenhuma chave obrigatória sumiu do re…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed | 42 passed (43)
      Tests  1 failed | 1109 passed (1110)
   Start at  12:47:15
   Duration  19.00s (transform 730ms, setup 0ms, collect 10.09s, tests 115.13s, environment 5ms, prepare 2.14s)

rc=1
```

`bash scripts/kit/test-instalar.sh` (a (i5c) e o placar):

```
574:-- (i5c) K8b-5: bloco JSON dos pendentes, prosa intacta byte a byte --
575-  FALHA o renome não foi aplicado
576-  FALHA o nome antigo continua lá
577-  ok    a PROSA é byte a byte a mesma
578-  ok    nenhum .bak de ticket
579-  ok    o relatório roda o orq validar sobre a fila migrada
580-  ok    o orq validar não CORRIGIU o ticket (segunda passada é no-op)
581--- (i6) --dry-run PREVÊ a recusa em vez de dizer que está tudo bem --
582-  ok    o dry-run continua saindo 0 (ele não é o gate)

2 CHECK(S) FALHARAM
rc=1
```

### Números do migrar-tickets.test.ts: fila viva (antes) e amostra (depois)

Rodado contra as filas vivas, antes de reduzir (o teste inteiro passava: 32/32):

```
actus-saas: [so-o-bloco] tickets migrados verificados=0 (2 expects cada) · [disco-intocado] arquivos comparados byte a byte=100
  [_TEMPLATE] igual depois do aplicar=true
comarka-operacional: [so-o-bloco] tickets migrados verificados=32 (2 expects cada) · [disco-intocado] arquivos comparados byte a byte=582
  [uma-linha] esperados n=32 · migrados(dry-run)=32 · linhas adicionadas=32 · conjunto=["+  \"recon\": ["]
  [dry-run nao escreve] arquivos comparados=582
  [aplicar] esperados=32 migrados=32 .bak=0
  [no-op] migrados na 2a=0
  [parseavel] blocos parseados=582
conteudos-infinitos: [so-o-bloco] tickets migrados verificados=0 (2 expects cada) · [disco-intocado] arquivos comparados byte a byte=82
```

O mesmo cálculo sobre a amostra (os números que o teste passou a afirmar como exatos):

```
actus-saas: [so-o-bloco] tickets migrados verificados=0 (2 expects cada) · [disco-intocado] arquivos comparados byte a byte=6
  [_TEMPLATE] igual depois do aplicar=true
comarka-operacional: [so-o-bloco] tickets migrados verificados=3 (2 expects cada) · [disco-intocado] arquivos comparados byte a byte=7
  [uma-linha] esperados n=3 · migrados(dry-run)=3 · linhas adicionadas=3 · conjunto=["+  \"recon\": ["]
  [dry-run nao escreve] arquivos comparados=7
  [aplicar] esperados=3 migrados=3 .bak=0
  [no-op] migrados na 2a=0
  [parseavel] blocos parseados=7
conteudos-infinitos: [so-o-bloco] tickets migrados verificados=0 (2 expects cada) · [disco-intocado] arquivos comparados byte a byte=3
```

Saída crua do teste vivo, antes:

```
actus-saas: 0 ticket(s) migrados
comarka-operacional: 32 ticket(s) migrados
conteudos-infinitos: 0 ticket(s) migrados
      Tests  32 passed (32)
rc=0
```

### Verde

vitest completo:

```

 Test Files  43 passed (43)
      Tests  1110 passed (1110)
   Start at  12:55:17
   Duration  20.46s (transform 826ms, setup 0ms, collect 11.18s, tests 126.19s, environment 5ms, prepare 1.82s)

rc=0
```

test-instalar.sh (i5b, i5c, (c) e placar):

```
-- (i5b) K8b-4: o config é PROPOSTO, nunca aplicado pelo instalador --
  ok    relata o renome supabase_project_id → ambiente_id
  ok    relata a conversão do tipo do gate
  ok    c0_intocavel vira item NOMEADO do relatório
  ok    grita que zona_proibida continua ausente
  ok    o 000-config.json OFICIAL não foi tocado
  ok    000-config.proposto.json gravado ao lado
  ok    o proposto está em schema 2
  ok    c0_intocavel atravessa INTACTA para o proposto
  ok    diz que não aplicou, e dá os 4 passos humanos
-- (i5c) K8b-5: bloco JSON dos pendentes, prosa intacta byte a byte --
-- (i5c) K8b-5: bloco JSON dos pendentes, prosa intacta byte a byte --
  ok    recon_esperado virou recon no ticket real
  ok    o nome antigo saiu do bloco
  ok    a PROSA é byte a byte a mesma
  ok    nenhum .bak de ticket
  ok    o relatório roda o orq validar sobre a fila migrada
  ok    o orq validar não CORRIGIU o ticket (segunda passada é no-op)
-- (i6) --dry-run PREVÊ a recusa em vez de dizer que está tudo bem --
== (c) ORQ_CI_CHECKOUT não setado (SÓ LEITURA — o resultado é achado, não gate) ==
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
rc=0
```

Zero leitura fora do kit: os mesmos testes com `HOME` apontando para um diretório vazio:

```
$ HOME=$(mktemp -d) ./node_modules/.bin/vitest run test/orquestrador-migrar-config.test.ts test/orquestrador-migrar-tickets.test.ts

 Test Files  2 passed (2)
      Tests  79 passed (79)
   Start at  13:43:50
   Duration  11.12s (transform 62ms, setup 0ms, collect 84ms, tests 11.00s, environment 0ms, prepare 53ms)

rc=0
$ HOME=$(mktemp -d) bash scripts/kit/test-instalar.sh | tail -3
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
rc=0
```

### Diff

```
commit a28fe81999a0c5e598427477db0646da0ce1359a
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Mon Sep 21 12:56:00 2026 -0300

    7b-1: nenhum teste do kit lê arquivo vivo de outro repo (K8e)
    
    - migrar-config.test.ts lê os configs do Actus (v1, 5b623d5^) e do Comarka
      (fc8eacb) como fixtures datadas em test/fixtures/config/.
    - migrar-tickets.test.ts lê amostras das três filas em test/fixtures/filas/,
      com PROCEDENCIA.md dizendo qual ticket cobre qual ramo; os números viram
      exatos sobre a amostra (6/0, 7/3, 3/0; esperados 3; parseados 7).
    - test-instalar.sh: (i5b) e (i5c) usam o config do Comarka e o ticket 306
      (versão 38fd7cb) do kit; a (c) só roda com ORQ_CI_CHECKOUT setado.
    - Fixture ausente vira falha, não pulo.
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
---
 scripts/kit/test-instalar.sh             | 84 +++++++++++++++++---------------
 test/fixtures/config/PROCEDENCIA.md      | 15 ++++++
 test/orquestrador-migrar-config.test.ts  | 24 +++++----
 test/orquestrador-migrar-tickets.test.ts | 63 +++++++++++++++---------
 4 files changed, 113 insertions(+), 73 deletions(-)

diff --git a/scripts/kit/test-instalar.sh b/scripts/kit/test-instalar.sh
index 2108102..f9e7aef 100644
--- a/scripts/kit/test-instalar.sh
+++ b/scripts/kit/test-instalar.sh
@@ -4,8 +4,8 @@
 #   (a) contra o repo de FIXTURE recém-instanciado  -> idêntico, rc 0
 #   (b) contra uma CÓPIA do fixture com um byte a mais em lib.sh
 #                                                    -> `diferente ... lib.sh`, rc 1
-#   (c) contra ~/Projetos/conteudos-infinitos (SÓ LEITURA)
-#                                                    -> o resultado real, seja qual for
+#   (c) contra o checkout do CI em $ORQ_CI_CHECKOUT (SÓ LEITURA, e SÓ quando a
+#       variável vier setada)                        -> o resultado real, seja qual for
 #   (d) contra uma CÓPIA do fixture com um byte a mais em
 #       scripts/roadmap/lint-mapa.py                 -> `diferente ... lint-mapa.py`, rc 1
 #   (h) --verificar/--atualizar cobrem os testes do harness que o kit vendoriza,
@@ -23,6 +23,13 @@
 # relatório e, se for o caso, peça —, nunca falha deste script. O que ele
 # imprime é a saída crua, para ser colada.
 #
+# Peça 7b-1: nenhum caso deste script lê arquivo de outro repo por padrão. O
+# config do Comarka da (i5b) e o ticket 306 da (i5c) são fixtures datadas do kit
+# (test/fixtures/config/comarka-000-config.json e
+# test/fixtures/tickets/306-perf-leads-ingest-ghl-completa.md, origem e data no
+# cabeçalho ou no PROCEDENCIA.md). A (c) só roda com ORQ_CI_CHECKOUT setado:
+#   ORQ_CI_CHECKOUT=~/Projetos/conteudos-infinitos bash scripts/kit/test-instalar.sh
+#
 # Uso: bash scripts/kit/test-instalar.sh
 
 set -uo pipefail
@@ -40,7 +47,7 @@ set -uo pipefail
 export ORQ_TESTE=1
 
 KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
-CI_CHECKOUT="${ORQ_CI_CHECKOUT:-$HOME/Projetos/conteudos-infinitos}"
+CI_CHECKOUT="${ORQ_CI_CHECKOUT:-}"
 
 FALHAS=0
 ok()    { printf '  ok    %s\n' "$*"; }
@@ -388,9 +395,10 @@ rm -rf "$SEM_GI"
 
 echo "-- (i5b) K8b-4: o config é PROPOSTO, nunca aplicado pelo instalador --"
 # O fixture nasce em schema 2 e completo; para exercitar a proposta, o config
-# dele vira o do Comarka (schema 1, com c0_intocavel e tsc_baseline).
+# dele vira o do Comarka (schema 1, com c0_intocavel e tsc_baseline). Fixture
+# datada do kit (peça 7b-1), não o arquivo vivo do comarka-operacional.
 CFG_ANTES="$(cksum < "$MIG/docs/fila/000-config.json")"
-COMARKA_CFG="$HOME/Projetos/comarka-operacional/docs/fila/000-config.json"
+COMARKA_CFG="$KIT/test/fixtures/config/comarka-000-config.json"
 if [ -f "$COMARKA_CFG" ]; then
   cp "$COMARKA_CFG" "$MIG/docs/fila/000-config.json"
   # O proposto da passada anterior sai do caminho: desde a M1 ele é nome
@@ -418,42 +426,38 @@ if [ -f "$COMARKA_CFG" ]; then
     && ok "diz que não aplicou, e dá os 4 passos humanos" || falha "não explicou o passo humano"
   rm -f "$MIG/docs/fila/000-config.proposto.json"
 else
-  printf '  PULADO: %s não existe nesta máquina\n' "$COMARKA_CFG"
+  falha "fixture ausente: $COMARKA_CFG"
 fi
 
 echo "-- (i5c) K8b-5: bloco JSON dos pendentes, prosa intacta byte a byte --"
-COMARKA_FILA="$HOME/Projetos/comarka-operacional/docs/fila"
-if [ -d "$COMARKA_FILA" ]; then
-  # Um ticket REAL do Comarka, com recon_esperado e prosa de verdade, copiado
-  # para a fila do fixture. Nada é escrito no repo de origem.
-  TK_ORIG="$COMARKA_FILA/306-perf-leads-ingest-ghl-completa.md"
-  if [ -f "$TK_ORIG" ]; then
-    cp "$TK_ORIG" "$MIG/docs/fila/306-perf-leads-ingest-ghl-completa.md"
-    TK="$MIG/docs/fila/306-perf-leads-ingest-ghl-completa.md"
-    # A prosa é tudo antes do bloco ```json — é ela que não pode se mover.
-    PROSA_ANTES="$(awk '/^```json$/{exit} {print}' "$TK" | cksum)"
-    saida="$(bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar 2>&1)"
-    grep -q '"recon":' "$TK" \
-      && ok "recon_esperado virou recon no ticket real" || falha "o renome não foi aplicado"
-    grep -q '"recon_esperado":' "$TK" \
-      && falha "o nome antigo continua lá" || ok "o nome antigo saiu do bloco"
-    [ "$(awk '/^```json$/{exit} {print}' "$TK" | cksum)" = "$PROSA_ANTES" ] \
-      && ok "a PROSA é byte a byte a mesma" || falha "a migração mexeu na prosa"
-    [ -f "$TK.bak" ] \
-      && falha "criou .bak de ticket (o git é o backup)" || ok "nenhum .bak de ticket"
-    printf '%s' "$saida" | grep -q 'orq validar --pendentes' \
-      && ok "o relatório roda o orq validar sobre a fila migrada" || falha "não rodou o orq validar"
-    # O NEGATIVO da peça: `orq validar` RELATA e não corrige.
-    CK_TK="$(cksum < "$TK")"
-    bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar >/dev/null 2>&1
-    [ "$(cksum < "$TK")" = "$CK_TK" ] \
-      && ok "o orq validar não CORRIGIU o ticket (segunda passada é no-op)" || falha "algo reescreveu o ticket"
-    rm -f "$TK"
-  else
-    printf '  PULADO: %s não existe\n' "$TK_ORIG"
-  fi
+# Um ticket REAL do Comarka, com recon_esperado e prosa de verdade, como fixture
+# datada do kit (peça 7b-1): a versão de 38fd7cb, a última em que o 306 era
+# pendente. Lido do arquivo vivo, o caso quebrou quando o 306 foi para done.
+TK_ORIG="$KIT/test/fixtures/tickets/306-perf-leads-ingest-ghl-completa.md"
+if [ -f "$TK_ORIG" ]; then
+  cp "$TK_ORIG" "$MIG/docs/fila/306-perf-leads-ingest-ghl-completa.md"
+  TK="$MIG/docs/fila/306-perf-leads-ingest-ghl-completa.md"
+  # A prosa é tudo antes do bloco ```json — é ela que não pode se mover.
+  PROSA_ANTES="$(awk '/^```json$/{exit} {print}' "$TK" | cksum)"
+  saida="$(bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar 2>&1)"
+  grep -q '"recon":' "$TK" \
+    && ok "recon_esperado virou recon no ticket real" || falha "o renome não foi aplicado"
+  grep -q '"recon_esperado":' "$TK" \
+    && falha "o nome antigo continua lá" || ok "o nome antigo saiu do bloco"
+  [ "$(awk '/^```json$/{exit} {print}' "$TK" | cksum)" = "$PROSA_ANTES" ] \
+    && ok "a PROSA é byte a byte a mesma" || falha "a migração mexeu na prosa"
+  [ -f "$TK.bak" ] \
+    && falha "criou .bak de ticket (o git é o backup)" || ok "nenhum .bak de ticket"
+  printf '%s' "$saida" | grep -q 'orq validar --pendentes' \
+    && ok "o relatório roda o orq validar sobre a fila migrada" || falha "não rodou o orq validar"
+  # O NEGATIVO da peça: `orq validar` RELATA e não corrige.
+  CK_TK="$(cksum < "$TK")"
+  bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar >/dev/null 2>&1
+  [ "$(cksum < "$TK")" = "$CK_TK" ] \
+    && ok "o orq validar não CORRIGIU o ticket (segunda passada é no-op)" || falha "algo reescreveu o ticket"
+  rm -f "$TK"
 else
-  printf '  PULADO: %s não existe nesta máquina\n' "$COMARKA_FILA"
+  falha "fixture ausente: $TK_ORIG"
 fi
 
 echo "-- (i6) --dry-run PREVÊ a recusa em vez de dizer que está tudo bem --"
@@ -592,13 +596,13 @@ printf '%s' "$saida" | grep -q 'node_modules/.bin/tsx' \
 
 # --- (c) ---------------------------------------------------------------------
 echo
-echo "== (c) $CI_CHECKOUT (SÓ LEITURA — o resultado é achado, não gate) =="
-if [ -d "$CI_CHECKOUT" ]; then
+echo "== (c) ${CI_CHECKOUT:-ORQ_CI_CHECKOUT não setado} (SÓ LEITURA — o resultado é achado, não gate) =="
+if [ -n "$CI_CHECKOUT" ] && [ -d "$CI_CHECKOUT" ]; then
   saida="$(bash "$KIT/instalar.sh" --verificar "$CI_CHECKOUT" 2>&1)"; rc=$?
   printf '%s\n' "$saida" | sed 's/^/  | /'
   printf '  (rc %s — informativo)\n' "$rc"
 else
-  printf '  (pulado: %s não existe nesta máquina)\n' "$CI_CHECKOUT"
+  printf '  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente%s; o teste não lê outro repo por padrão)\n' "${CI_CHECKOUT:+ ($CI_CHECKOUT)}"
 fi
 
 echo
diff --git a/test/fixtures/config/PROCEDENCIA.md b/test/fixtures/config/PROCEDENCIA.md
index 086c3c1..c5dc58d 100644
--- a/test/fixtures/config/PROCEDENCIA.md
+++ b/test/fixtures/config/PROCEDENCIA.md
@@ -25,3 +25,18 @@ Por que uma cópia, e não ler o repo vizinho: teste que lê `~/Projetos/actus-s
 passa nesta máquina e some em qualquer outra — e passaria a MUDAR de veredito
 quando alguém editasse o config de lá, que é exatamente o arquivo que a migração
 existe para tocar. A mesma decisão de `test/fixtures/liberacoes/` (peça K8b-1).
+
+## Acréscimo da peça 7b-1 (2026-09-21)
+
+| Arquivo | Origem (só leitura) | Schema | cksum |
+|---|---|---|---|
+| `actus-000-config.json` | o mesmo arquivo de cima. Conferido em 2026-09-21: é byte a byte o blob de `~/Projetos/actus-saas` em `5b623d5^` (último commit que o tocou: `8bcbc00`, 2026-08-17), a versão v1 de antes da migração para o kit | v1 | `4252049310 7679` |
+| `comarka-000-config.json` | `~/Projetos/comarka-operacional/docs/fila/000-config.json`, HEAD `fc8eacb` (último commit que o tocou: `50c6b02`), copiado em 2026-09-21 | v1 | `3674671313 7835` |
+
+Os dois passam a ser lidos por `test/orquestrador-migrar-config.test.ts` ("os
+dois configs reais") e o do Comarka também pela (i5b) de
+`scripts/kit/test-instalar.sh`. Até a 7b-1 esses dois liam o arquivo VIVO: o
+config do Actus foi migrado para o schema 2 em `5b623d5` (2026-09-11) e o caso
+"o proposto tem MENOS violações que o original" perdeu o objeto (o relatório
+passou a dizer `0 violações`, sem o `N violação(ões)` que o caso procura). O
+teste é sobre a migração de um v1; o fixture é o v1.
diff --git a/test/orquestrador-migrar-config.test.ts b/test/orquestrador-migrar-config.test.ts
index 6f3c946..c2b42d9 100644
--- a/test/orquestrador-migrar-config.test.ts
+++ b/test/orquestrador-migrar-config.test.ts
@@ -36,15 +36,19 @@ const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
 const GATES_201 = join(REPO_ROOT, 'test', 'fixtures', 'runs-201', 'attempt-2.gates.txt');
 
 /**
- * Os configs REAIS, lidos do disco dos outros repos. SÓ LEITURA: nada aqui
- * escreve neles — cada caso copia para um `mkdtemp` antes de qualquer coisa.
+ * Os configs REAIS dos dois repos, como FIXTURES datadas (peça 7b-1): cópias
+ * byte a byte em `test/fixtures/config/`, com origem, sha e data no
+ * PROCEDENCIA.md de lá. Até a 7b-1 este teste lia o arquivo VIVO de
+ * `~/Projetos/<repo>`: passava nesta máquina, sumia em outra e mudou de
+ * veredito quando o Actus migrou o próprio config para o schema 2 (`5b623d5`).
+ * Cada caso ainda copia para um `mkdtemp` antes de qualquer coisa.
  *
- * Se um dos repos não estiver nesta máquina, o caso é PULADO com aviso, nunca
- * falso-verde: um teste que passa porque não achou o arquivo é pior que nenhum.
+ * Fixture ausente é FALHA, não pulo: ela é do kit, e um teste que passa porque
+ * não achou o arquivo é pior que nenhum.
  */
 const REPOS: Array<{ nome: string; caminho: string }> = [
-  { nome: 'actus-saas', caminho: join(process.env.HOME ?? '', 'Projetos', 'actus-saas', 'docs', 'fila', '000-config.json') },
-  { nome: 'comarka-operacional', caminho: join(process.env.HOME ?? '', 'Projetos', 'comarka-operacional', 'docs', 'fila', '000-config.json') },
+  { nome: 'actus-saas', caminho: join(REPO_ROOT, 'test', 'fixtures', 'config', 'actus-000-config.json') },
+  { nome: 'comarka-operacional', caminho: join(REPO_ROOT, 'test', 'fixtures', 'config', 'comarka-000-config.json') },
 ];
 
 function copiaReal(caminho: string): string {
@@ -164,7 +168,7 @@ describe('a migração não apaga nada', () => {
 
   for (const { nome, caminho } of REPOS) {
     it(`${nome}: TODA chave do config real sobrevive no proposto`, () => {
-      if (!existsSync(caminho)) return void console.warn(`PULADO: ${caminho} não existe nesta máquina`);
+      expect(existsSync(caminho), `fixture ausente: ${caminho}`).toBe(true);
       const original = lerJson(caminho) as Record<string, unknown>;
       const { proposto } = propor(original);
       const o = JSON.parse(proposto);
@@ -191,7 +195,7 @@ describe('a migração não apaga nada', () => {
     });
 
     it(`${nome}: o arquivo no disco do repo NÃO é tocado`, () => {
-      if (!existsSync(caminho)) return void console.warn(`PULADO: ${caminho}`);
+      expect(existsSync(caminho), `fixture ausente: ${caminho}`).toBe(true);
       const antes = readFileSync(caminho);
       const copia = copiaReal(caminho);
       migrarArquivo(copia, 'propor');
@@ -279,7 +283,7 @@ describe('gates: o vocabulário de `tipo`', () => {
     // *lint* → lint, *build*/*compil* → build, *test*/*spec* → testes. Os gates
     // reais são typecheck/testes/build (Actus) e tsc/vitest/build (Comarka).
     for (const { nome, caminho } of REPOS) {
-      if (!existsSync(caminho)) continue;
+      expect(existsSync(caminho), `fixture ausente: ${caminho}`).toBe(true);
       const cfg = lerJson(caminho) as { gates: Array<{ nome: string }> };
       for (const g of cfg.gates) {
         expect(/typecheck|tsc|types|lint|build|compil|test|spec/.test(g.nome), `${nome}: gate '${g.nome}' sem papel inferível`).toBe(true);
@@ -565,7 +569,7 @@ describe('M1 · instalar.sh --atualizar --migrar repassa a recusa', () => {
 describe('os dois configs reais: quanto o proposto melhora, e o que sobra', () => {
   for (const { nome, caminho } of REPOS) {
     it(`${nome}: o proposto tem MENOS violações que o original, e o resto é decisão local`, () => {
-      if (!existsSync(caminho)) return void console.warn(`PULADO: ${caminho}`);
+      expect(existsSync(caminho), `fixture ausente: ${caminho}`).toBe(true);
       const p = copiaReal(caminho);
       const r = migrarArquivo(p, 'dry-run');
       const saida = r.linhas.join('\n');
diff --git a/test/orquestrador-migrar-tickets.test.ts b/test/orquestrador-migrar-tickets.test.ts
index 25cebdb..d71332f 100644
--- a/test/orquestrador-migrar-tickets.test.ts
+++ b/test/orquestrador-migrar-tickets.test.ts
@@ -7,8 +7,12 @@
  * um diff que ninguém revisa — e um diff que ninguém revisa é um diff que
  * aprova o que quiser.
  *
- * Roda contra as filas REAIS dos três repos, copiadas para `mkdtemp`. Eles são
- * SÓ LEITURA nesta sessão — e um caso afirma isso, byte a byte, depois de cada
+ * Roda contra AMOSTRAS das filas reais dos três repos (peça 7b-1): cópias byte
+ * a byte em `test/fixtures/filas/<repo>/`, com a origem, o sha, a data e o
+ * ramo que cada ticket cobre no PROCEDENCIA.md de lá. Até a 7b-1 este teste
+ * lia as filas VIVAS de `~/Projetos/<repo>`, e o número que ele afirmava
+ * mudava a cada drenagem do loop de lá. Cada caso copia a amostra para
+ * `mkdtemp`, e um caso afirma, byte a byte, que a amostra não muda depois do
  * `--aplicar`.
  */
 import { describe, it, expect } from 'vitest';
@@ -23,10 +27,18 @@ import {
   ticketsDe,
 } from '../scripts/orquestrador/migrar-tickets.js';
 
-const FILAS: Array<{ nome: string; caminho: string }> = [
-  { nome: 'actus-saas', caminho: join(process.env.HOME ?? '', 'Projetos', 'actus-saas', 'docs', 'fila') },
-  { nome: 'comarka-operacional', caminho: join(process.env.HOME ?? '', 'Projetos', 'comarka-operacional', 'docs', 'fila') },
-  { nome: 'conteudos-infinitos', caminho: join(process.env.HOME ?? '', 'Projetos', 'conteudos-infinitos', 'docs', 'fila') },
+/**
+ * `arquivos` e `migrados` são os números da AMOSTRA, contados e escritos no
+ * PROCEDENCIA.md ao lado da contagem da fila viva de 2026-09-21 (100/0, 582/32,
+ * 82/0). Número exato, e não "maior que zero": a amostra é fixa, então o
+ * número é constante, e uma asserção frouxa deixaria passar um ticket que a
+ * migração deixou de ver.
+ */
+const AMOSTRAS = join(__dirname, 'fixtures', 'filas');
+const FILAS: Array<{ nome: string; caminho: string; arquivos: number; migrados: number }> = [
+  { nome: 'actus-saas', caminho: join(AMOSTRAS, 'actus-saas'), arquivos: 6, migrados: 0 },
+  { nome: 'comarka-operacional', caminho: join(AMOSTRAS, 'comarka-operacional'), arquivos: 7, migrados: 3 },
+  { nome: 'conteudos-infinitos', caminho: join(AMOSTRAS, 'conteudos-infinitos'), arquivos: 3, migrados: 0 },
 ];
 
 /** Cópia da fila num tmp. Só os `[0-9]*.md` e o `_TEMPLATE.md`. */
@@ -46,14 +58,13 @@ function copiaFila(origem: string): string {
 }
 
 /**
- * Quantos tickets a migração DEVE mexer, contados na própria cópia.
+ * Quantos tickets a migração DEVE mexer, contados na própria cópia pela REGRA
+ * (todo pendente que tenha um dos nomes antigos, e mais nenhum).
  *
- * Antes isto era uma CONSTANTE, medida no PASSO 0 — e a constante quebrou DENTRO
- * desta sessão: o loop do comarka-operacional está VIVO e drenou a fila às 16:00
- * (três tickets para `done`, um para `em_execucao`), com o que o número de
- * pendentes caiu. Teste que afirma um número sobre a fila viva de OUTRO repo
- * mede o dia, não o código. O que é constante é a REGRA: mexe em todo pendente
- * que tenha um dos nomes antigos, e em mais nenhum.
+ * Nasceu porque a constante medida no PASSO 0 da K8b-5 quebrou dentro da
+ * sessão: o loop do comarka-operacional drenou a fila viva e o número caiu. Com
+ * a amostra fixa (peça 7b-1) os casos afirmam as DUAS coisas: a regra, por
+ * esta função, e o número da amostra, por `FILAS[].migrados`.
  */
 function esperados(fila: string): number {
   let n = 0;
@@ -99,9 +110,9 @@ describe('a prosa não se move UM BYTE', () => {
     expect(Buffer.from(depois.split('```json')[0]!)).toEqual(Buffer.from(antes.split('```json')[0]!));
   });
 
-  for (const { nome, caminho } of FILAS) {
+  for (const { nome, caminho, arquivos, migrados: migradosAmostra } of FILAS) {
     it(`${nome}: em TODO ticket migrado, só o bloco muda`, () => {
-      if (!existsSync(caminho)) return void console.warn(`PULADO: ${caminho}`);
+      expect(existsSync(caminho), `amostra ausente: ${caminho}`).toBe(true);
       const fila = copiaFila(caminho);
       let migrados = 0;
       for (const f of ticketsDe(fila)) {
@@ -116,11 +127,13 @@ describe('a prosa não se move UM BYTE', () => {
         expect(ld.slice(b.fim), `${f}: prosa DEPOIS do bloco mudou`).toEqual(la.slice(b.fim));
       }
       console.info(`${nome}: ${migrados} ticket(s) migrados`);
+      expect(migrados, `${nome}: migrados na amostra`).toBe(migradosAmostra);
     });
 
     it(`${nome}: a fila no disco do repo NÃO é tocada`, () => {
-      if (!existsSync(caminho)) return void console.warn(`PULADO: ${caminho}`);
+      expect(existsSync(caminho), `amostra ausente: ${caminho}`).toBe(true);
       const antes = ticketsDe(caminho).map((f) => readFileSync(f).toString('base64'));
+      expect(antes, `${nome}: arquivos de ticket na amostra`).toHaveLength(arquivos);
       migrarFila(copiaFila(caminho), 'aplicar');
       const depois = ticketsDe(caminho).map((f) => readFileSync(f).toString('base64'));
       expect(depois).toEqual(antes);
@@ -150,10 +163,10 @@ describe('os dois renomes, na posição original da chave', () => {
 
   it('a fila real do Comarka: UMA linha muda por ticket, e é sempre a mesma', () => {
     const caminho = FILAS.find((f) => f.nome === 'comarka-operacional')!.caminho;
-    if (!existsSync(caminho)) return void console.warn('PULADO');
+    expect(existsSync(caminho), `amostra ausente: ${caminho}`).toBe(true);
     const fila = copiaFila(caminho);
     const n = esperados(fila);
-    expect(n, 'a fila real deixou de ter pendente com nome antigo — o caso perdeu o objeto').toBeGreaterThan(0);
+    expect(n, 'a amostra do Comarka tem 3 pendentes com recon_esperado (PROCEDENCIA.md)').toBe(3);
     const r = migrarFila(fila, 'dry-run');
     expect(r.migrados).toBe(n);
     const adicionadas = r.linhas.join('\n').split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
@@ -264,7 +277,7 @@ describe('a seleção de arquivos é a MESMA regra do motor', () => {
     // `tentativas_consumidas: 0`. Migrá-lo mudaria o formulário que todo ticket
     // novo copia — o que não é errado, mas é decisão, e não desta peça.
     const caminho = join(FILAS[0]!.caminho, '_TEMPLATE.md');
-    if (!existsSync(caminho)) return void console.warn('PULADO');
+    expect(existsSync(caminho), `amostra ausente: ${caminho}`).toBe(true);
     const fila = copiaFila(FILAS[0]!.caminho);
     const antes = readFileSync(join(fila, '_TEMPLATE.md'), 'utf8');
     migrarFila(fila, 'aplicar');
@@ -276,7 +289,7 @@ describe('a seleção de arquivos é a MESMA regra do motor', () => {
 describe('--dry-run e --aplicar', () => {
   it('--dry-run não escreve', () => {
     const caminho = FILAS.find((f) => f.nome === 'comarka-operacional')!.caminho;
-    if (!existsSync(caminho)) return void console.warn('PULADO');
+    expect(existsSync(caminho), `amostra ausente: ${caminho}`).toBe(true);
     const fila = copiaFila(caminho);
     const antes = ticketsDe(fila).map((f) => readFileSync(f, 'utf8'));
     migrarFila(fila, 'dry-run');
@@ -285,9 +298,10 @@ describe('--dry-run e --aplicar', () => {
 
   it('--aplicar grava e NÃO deixa .bak (o ticket é versionado; o git é o backup)', () => {
     const caminho = FILAS.find((f) => f.nome === 'comarka-operacional')!.caminho;
-    if (!existsSync(caminho)) return void console.warn('PULADO');
+    expect(existsSync(caminho), `amostra ausente: ${caminho}`).toBe(true);
     const fila = copiaFila(caminho);
     const n = esperados(fila);
+    expect(n).toBe(3);
     const r = migrarFila(fila, 'aplicar');
     expect(r.migrados).toBe(n);
     expect(readdirSync(fila).filter((x) => x.endsWith('.bak'))).toEqual([]);
@@ -296,7 +310,7 @@ describe('--dry-run e --aplicar', () => {
 
   it('rodar de novo é no-op', () => {
     const caminho = FILAS.find((f) => f.nome === 'comarka-operacional')!.caminho;
-    if (!existsSync(caminho)) return void console.warn('PULADO');
+    expect(existsSync(caminho), `amostra ausente: ${caminho}`).toBe(true);
     const fila = copiaFila(caminho);
     migrarFila(fila, 'aplicar');
     const depoisDaPrimeira = ticketsDe(fila).map((f) => readFileSync(f, 'utf8'));
@@ -307,13 +321,16 @@ describe('--dry-run e --aplicar', () => {
 
   it('o migrado continua parseável pelo leitor do motor', () => {
     const caminho = FILAS.find((f) => f.nome === 'comarka-operacional')!.caminho;
-    if (!existsSync(caminho)) return void console.warn('PULADO');
+    expect(existsSync(caminho), `amostra ausente: ${caminho}`).toBe(true);
     const fila = copiaFila(caminho);
     migrarFila(fila, 'aplicar');
+    let parseados = 0;
     for (const f of ticketsDe(fila)) {
       const m = /```json\n([\s\S]*?)\n```/.exec(readFileSync(f, 'utf8'));
       if (!m) continue;
       expect(() => JSON.parse(m[1]!), f).not.toThrow();
+      parseados += 1;
     }
+    expect(parseados).toBe(7);
   });
 });

(fixtures byte a byte, só o stat:)
 test/fixtures/config/comarka-000-config.json       | 120 ++++++++++
 test/fixtures/filas/PROCEDENCIA.md                 |  86 ++++++++
 .../fixtures/filas/actus-saas/001-fixture-smoke.md |  51 +++++
 .../actus-saas/462-rejeicao-motivo-obrigatorio.md  |  53 +++++
 .../actus-saas/471-onboarding-criterios-etapa.md   |  62 ++++++
 .../actus-saas/489-midia-downloader-por-origem.md  |  64 ++++++
 .../actus-saas/497-fila-ignora-ticket-done.md      |  59 +++++
 .../actus-saas/499-ghl-user-id-no-metadata.md      |  59 +++++
 test/fixtures/filas/actus-saas/_TEMPLATE.md        |  68 ++++++
 .../147-onboarding-id-rota-morta.md                |  55 +++++
 .../148-carteira-table-codigo-morto.md             |  48 ++++
 .../306b-perf-fechamentos-ingest.md                | 172 +++++++++++++++
 .../comarka-operacional/321-ia-insights-tese.md    |  74 +++++++
 .../comarka-operacional/322-ia-carteira-mensal.md  |  80 +++++++
 .../comarka-operacional/440-a11y-app-churn-page.md |  66 ++++++
 .../filas/comarka-operacional/496-bloco-tarefas.md |  92 ++++++++
 .../filas/comarka-operacional/_TEMPLATE.md         |  68 ++++++
 .../conteudos-infinitos/001b-higiene-lockfile.md   |  35 +++
 .../231-formulario-de-persona-guiado.md            | 241 +++++++++++++++++++++
 .../232-nome-do-nicho-na-listagem-e-na-edicao.md   | 200 +++++++++++++++++
 .../filas/conteudos-infinitos/_TEMPLATE.md         |  85 ++++++++
 .../tickets/306-perf-leads-ingest-ghl-completa.md  |  80 +++++++
 22 files changed, 1918 insertions(+)
```

## 7b-2 · tabela de causas

sha: `cfb5cf3`

### Vermelho (contra 7b-1, antes da mudança)

`/bin/bash scripts/orquestrador/test-causa-adiamento.sh`:

```
== A. timeout local (rc 124 do watchdog): adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=timeout
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  FALHA cooldown armado num timeout local
  FALHA evento sem cooldown=nao
  ok    nota registra timeout
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=timeout attempt=1

== B. 429: adia COM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=rate_limit
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown ARMADO (limite remoto)
  FALHA evento sem cooldown=sim
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=rate_limit attempt=1

== C. 503 / overloaded: adia SEM cooldown ==
  ok    ticket segue pendente
  FALHA sem ADIADO motivo=servidor
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  FALHA cooldown armado num 5xx
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=rate_limit attempt=1

== D. gate de testes que não rodou (sem placar): gate_crash ==
  FALHA status=bloqueado
  FALHA sem ADIADO motivo=gate_crash
  FALHA houve REPROVADO/RETRY/BLOQUEADO
  FALHA 3 tentativas
  FALHA escalou para opus
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=1 diff=1
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=b4ec9e0f
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=2 diff=1
  | 901 RETRY attempt=3 model=opus motivo=criterio_qualidade worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-1 base=b4ec9e0f
  | 901 INICIO attempt=3 model=opus
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=3 diff=1
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

== E. tsc ausente (rc 127, command not found): gate_crash ==
  FALHA status=bloqueado
  FALHA sem ADIADO motivo=gate_crash
  FALHA houve REPROVADO/RETRY/BLOQUEADO
  FALHA 3 tentativas
  FALHA escalou para opus
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=1 diff=1
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=67fe00b8
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=2 diff=1
  | 901 RETRY attempt=3 model=opus motivo=criterio_qualidade worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-1 base=67fe00b8
  | 901 INICIO attempt=3 model=opus
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=3 diff=1
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

== F. tsc que rodou e apontou erro de código: mérito, não adia ==
  ok    REPROVADO (mérito)
  ok    não adiou
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=1 diff=1
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=1

== G. recusa de preflight (árvore de execução suja): ADIADO motivo=preflight ==
  FALHA executor saiu rc=1
  FALHA sem ADIADO motivo=preflight causa=...
  FALHA gravou EXECUTOR_MORREU
  FALHA ADIADO em mais de uma linha
  ok    ticket segue pendente
  ok    cooldown NÃO armado
  | — EXECUTOR_MORREU rc=1 fase=?

19 CHECK(S) FALHARAM
rc=1
```

`/bin/bash scripts/orquestrador/test-ambiente-adiado.sh`:

```
== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  --- disparo 2 (preflight): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  --- disparo 3 (preflight): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  FALHA esperava 3 AMBIENTE, há 0
  FALHA um disparo chamou o executor 3 vezes
  trilha: 
  FALHA evento fora do formato
  FALHA causa perdeu o texto: 
  ok    0 bloqueados
  STATUS: MOTIVO   sem progresso em 901 902 903: 901 adiado · 902 adiado · 903 adiado
  FALHA STATUS sem a causa de ambiente

== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE ==
  --- disparo 4 (sessao): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  FALHA sem AMBIENTE para sessão caída em 2 tickets
  FALHA chamou 3 vezes
  FALHA causa: 

== 3. adiamentos com causas DIFERENTES não são ambiente ==
  --- disparo 5 (proprio): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  ok    nenhum AMBIENTE
  ok    a drenagem seguiu pelos três

8 CHECK(S) FALHARAM
rc=1
```

`vitest run test/orquestrador-causas-adiamento.test.ts` (a lista):

```
   × servidor (5xx/overloaded) sai de rate_limit > 503, Service Unavailable, overloaded e 529 viram servidor 3ms
   × cooldown só para limite remoto > 429: adiado por rate_limit, cooldown=true, sem retry 0ms
   × cooldown só para limite remoto > quota: adiado por quota, cooldown=true, sem retry 0ms
   × cooldown só para limite remoto > timeout: adiado por timeout, cooldown=false, sem retry 0ms
   × cooldown só para limite remoto > 503: adiado por servidor, cooldown=false, sem retry 0ms
   × cooldown só para limite remoto > sessão: adiado por sessao, cooldown=false, sem retry 0ms
   × cooldown só para limite remoto > conexão: adiado por conexao, cooldown=false, sem retry 0ms
   × cooldown só para limite remoto > morto por fora: adiado por gate_interrompido, cooldown=false, sem retry 0ms
   × cooldown só para limite remoto > juiz ilegível: adiado por juiz_ilegivel, cooldown=false, sem retry 0ms
   × cooldown só para limite remoto > reprovado e aprovado não armam cooldown 0ms
   × gateNaoRodou: o runner não rodou x o código está errado > testes sem placar e sem linha de teste falhando: crash 0ms
   × gateNaoRodou: o runner não rodou x o código está errado > testes com placar vermelho: mérito 0ms
   × gateNaoRodou: o runner não rodou x o código está errado > testes com linha FAIL mas sem o resumo (recorte cortado): mérito 0ms
   × gateNaoRodou: o runner não rodou x o código está errado > placar do baseline na linha FALHA: mérito 0ms
   × gateNaoRodou: o runner não rodou x o código está errado > tsc ausente (rc 127, command not found): crash em typecheck 0ms
   × gateNaoRodou: o runner não rodou x o código está errado > tsc que rodou e apontou erro de código: mérito 0ms
   × gateNaoRodou: o runner não rodou x o código está errado > rc 126 (sem permissão de execução): crash 0ms
   × gateNaoRodou: o runner não rodou x o código está errado > ENOENT do binário: crash 0ms
   × gateNaoRodou: o runner não rodou x o código está errado > npm sem o script: crash 0ms
   × gateNaoRodou: o runner não rodou x o código está errado > saída vazia com rc != 0: crash em qualquer papel 0ms
   × gateNaoRodou: o runner não rodou x o código está errado > build que rodou e falhou compilando: mérito 0ms
   × gateNaoRodou: o runner não rodou x o código está errado > gates verdes: nunca crash 0ms
   × gate_crash no desfecho > adia sem cooldown e sem retry, mesmo com "gates reprovados" em criteriosFalhos 0ms
      Tests  23 failed | 5 passed (28)
rc=1
```

### Verde

`/bin/bash scripts/orquestrador/test-causa-adiamento.sh`:

```
== A. timeout local (rc 124 do watchdog): adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=timeout
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  ok    evento diz cooldown=nao
  ok    nota registra timeout
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=timeout attempt=1 rc=124 dur=2s cooldown=nao

== B. 429: adia COM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=rate_limit
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown ARMADO (limite remoto)
  ok    evento diz cooldown=sim
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=rate_limit attempt=1 rc=1 dur=1s cooldown=sim

== C. 503 / overloaded: adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=servidor
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=1 rc=1 dur=1s cooldown=nao

== D. gate de testes que não rodou (sem placar): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=0s cooldown=nao

== E. tsc ausente (rc 127, command not found): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=0s cooldown=nao

== F. tsc que rodou e apontou erro de código: mérito, não adia ==
  ok    REPROVADO (mérito)
  ok    não adiou
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=1 diff=1
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=1

== G. recusa de preflight (árvore de execução suja): ADIADO motivo=preflight ==
  ok    executor sai 0
  ok    trilha: ADIADO motivo=preflight com a causa
  ok    nenhuma linha EXECUTOR_MORREU
  ok    um evento, uma linha
  ok    ticket segue pendente
  ok    cooldown NÃO armado
  | 901 ADIADO motivo=preflight causa=preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.QpuC8mbOi7/repo — commite ou stashe antes:\n?? lixo.txt

TODOS OS CHECKS PASSARAM
rc=0
```

`/bin/bash scripts/orquestrador/test-ambiente-adiado.sh`:

```
== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas por disparo (máx: 2)
  trilha: 2026-09-21T13:17:04-0300 --- AMBIENTE tickets=901,902 causa=ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada, com o motivo preflight
  ok    0 bloqueados
  STATUS: MOTIVO   ambiente: ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa

== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE ==
  --- disparo 4 (sessao): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    um AMBIENTE
  ok    parou na 2ª chamada
  ok    causa: ADIADO motivo=sessao

== 3. adiamentos com causas DIFERENTES não são ambiente ==
  --- disparo 5 (proprio): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  ok    nenhum AMBIENTE
  ok    a drenagem seguiu pelos três

TODOS OS CHECKS PASSARAM
rc=0
```

vitest dos quatro arquivos tocados:

```
 Test Files  4 passed (4)
      Tests  111 passed (111)
   Start at  13:17:06
   Duration  174ms (transform 81ms, setup 0ms, collect 139ms, tests 14ms, environment 0ms, prepare 121ms)

rc=0
```

### Diff

```
commit cfb5cf3a40beabfdc1f5380a7fefed141d242e1a
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Mon Sep 21 13:17:06 2026 -0300

    7b-2: tabela de causas (cooldown só para limite remoto)
    
    - decisao.ts: causas servidor (5xx, overloaded) e gate_crash, ligadas pelos
      rótulos que já existem ("rate limit", "gate interrompido"); armaCooldown só
      para rate_limit e quota; gateNaoRodou separa runner quebrado (rc 126/127,
      command not found, ENOENT, Missing script, saída vazia; em testes, sem placar
      nem teste falhando) de erro de código.
    - executor.sh: sinal leva gatesRc, gates.txt e o papel do gate que falhou;
      ADIADO grava rc, dur e cooldown; recusa de preflight vira ADIADO
      motivo=preflight causa=<uma linha>, sem EXECUTOR_MORREU; sondagem só arma
      cooldown com limite remoto.
    - lib.sh: SERVIDOR_REGEX separado do RATE_LIMIT_REGEX; mark_adiado recebe arma.
    - local-loop.sh: a régua de AMBIENTE (7a-8) vale sobre o adiado sem cooldown.
    - Testes: test-causa-adiamento.sh (executor real em fixture), test-ambiente-
      adiado.sh, causas-adiamento.test.ts; três asserções antigas atualizadas com
      a mesma força (503 vira servidor, 9 causas, 8 desfechos nomeados).
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
---
 scripts/kit/test-shell.sh                     |   8 +-
 scripts/orquestrador/decisao.ts               | 116 +++++++++++++--
 scripts/orquestrador/executor.sh              |  86 ++++++++++--
 scripts/orquestrador/lib.sh                   |  49 +++++--
 scripts/orquestrador/local-loop.sh            |  49 ++++---
 scripts/orquestrador/test-ambiente-adiado.sh  | 117 ++++++++++++++++
 scripts/orquestrador/test-causa-adiamento.sh  | 122 ++++++++++++++++
 scripts/orquestrador/test-fixture-executor.sh | 152 ++++++++++++++++++++
 test/orquestrador-adiamento-actus.test.ts     |  17 ++-
 test/orquestrador-causas-adiamento.test.ts    | 195 ++++++++++++++++++++++++++
 test/orquestrador-decisao.test.ts             |   9 +-
 test/orquestrador-isolamento-teste.test.ts    |   3 +
 test/orquestrador-tools-derivadas.test.ts     |   7 +-
 13 files changed, 871 insertions(+), 59 deletions(-)

diff --git a/scripts/kit/test-shell.sh b/scripts/kit/test-shell.sh
index 0127a18..c2292ba 100644
--- a/scripts/kit/test-shell.sh
+++ b/scripts/kit/test-shell.sh
@@ -20,6 +20,12 @@
 #   test-rc-executor.sh             o rc do executor atravessa o tee da drenagem (7a-7)
 #   test-ambiente.sh                a mesma causa em dois tickets é ambiente e não bloqueia a fila (7a-8)
 #
+# E os da etapa 7b. Os que rodam o executor DE VERDADE montam um repo git num
+# mktemp -d com o motor vendorizado e um `claude` falso no PATH
+# (test-fixture-executor.sh); zero modelo, zero rede:
+#   test-causa-adiamento.sh         a tabela de causas: cooldown só para limite remoto (7b-2)
+#   test-ambiente-adiado.sh         a régua de AMBIENTE vale sobre o ADIADO sem cooldown (7b-2)
+#
 # Cada um monta o PRÓPRIO `ORQ_EXEC_ROOT` num `mktemp -d` (drenagem e retry) ou
 # trabalha direto no checkout (lib-config); nada aqui precisa exportar
 # `ORQ_EXEC_ROOT` por fora — fazer isso sobrescreveria o isolamento que cada
@@ -34,7 +40,7 @@
 set -uo pipefail
 
 KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
-SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh'
+SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh'
 
 FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
   printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
diff --git a/scripts/orquestrador/decisao.ts b/scripts/orquestrador/decisao.ts
index edcc7a3..e0d47e4 100644
--- a/scripts/orquestrador/decisao.ts
+++ b/scripts/orquestrador/decisao.ts
@@ -87,8 +87,10 @@ export type CausaInfra =
   | 'sessao'
   | 'rate_limit'
   | 'quota'
+  | 'servidor'
   | 'timeout'
   | 'gate_interrompido'
+  | 'gate_crash'
   | 'juiz_ilegivel'
 export type CausaMerito = 'diff_cap' | 'enforcement' | 'criterio_qualidade'
 export type Desfecho = 'aprovado' | 'adiado' | 'reprovado' | 'refatiar'
@@ -97,17 +99,38 @@ export type Desfecho = 'aprovado' | 'adiado' | 'reprovado' | 'refatiar'
  * Qual causa de infra cada rótulo do config representa. O config é a
  * AUTORIDADE: causa detectada cujo rótulo não esteja em causas_que_adiam não
  * adia. Tirar um rótulo de lá desliga aquele adiamento.
+ *
+ * Peça 7b-2: as duas causas novas NÃO pedem rótulo novo. `servidor` (5xx,
+ * overloaded) era detectado como `rate_limit` até aqui e continua ligado pelo
+ * mesmo rótulo "rate limit"; `gate_crash` (runner de gate que não rodou) é da
+ * família do gate interrompido e é ligado por "gate interrompido". Pedir rótulo
+ * novo faria todo repo instalado deixar de adiar um 503 no dia da atualização.
  */
 const ROTULO_PARA_CAUSA: [RegExp, CausaInfra][] = [
   [/conex/i, 'conexao'],
   [/sess/i, 'sessao'],
   [/rate\s*limit/i, 'rate_limit'],
+  [/rate\s*limit/i, 'servidor'],
   [/quota/i, 'quota'],
   [/timeout|rel[oó]gio/i, 'timeout'],
   [/gate\s+interrompido/i, 'gate_interrompido'],
+  [/gate\s+interrompido/i, 'gate_crash'],
   [/ju[ií]z|veredito/i, 'juiz_ilegivel'],
 ]
 
+/**
+ * Peça 7b-2 · COOLDOWN só para limite REMOTO. Esperar 60 min só ajuda quando
+ * quem recusou foi a API e a recusa tem prazo (limite da assinatura, cota).
+ * Timeout local, 5xx, sessão, rede e gate que não rodou adiam SEM cooldown: do
+ * lado da API nada mudou, e parar a fila uma hora por um blip é o incidente de
+ * 02/09 do Comarka (um pkill devolveu 124 e a fila ficou 1 h parada).
+ */
+const CAUSAS_COM_COOLDOWN: readonly CausaInfra[] = ['rate_limit', 'quota']
+
+export function armaCooldown(causa: CausaInfra | CausaMerito | undefined): boolean {
+  return CAUSAS_COM_COOLDOWN.includes(causa as CausaInfra)
+}
+
 export function causasDeAdiamentoDoConfig(config: DecisaoConfig): Set<CausaInfra> {
   const out = new Set<CausaInfra>()
   for (const rotulo of config.politica_adiamento.causas_que_adiam) {
@@ -132,6 +155,14 @@ export interface SinalTentativa {
   enforcementViolado?: boolean
   /** critérios de aceite / avaliador que reprovaram por conteúdo. */
   criteriosFalhos?: string[]
+  /**
+   * Peça 7b-2 · o rc do motor de gates, o gates.txt que ele escreveu e o PAPEL
+   * (typecheck, testes, build, lint) do gate que reprovou. É com os três que
+   * `gateNaoRodou` separa "o runner não rodou" de "o código está errado".
+   */
+  gatesRc?: number
+  gatesSaida?: string
+  gatePapelFalho?: string
   /**
    * true quando o juiz (passo 7) NÃO produziu veredito legível — resposta
    * ilegível, ou a chamada do juiz caiu em limite/timeout. Nos dois casos não
@@ -150,14 +181,62 @@ const PADRAO_CAUSA: [RegExp, CausaInfra][] = [
   // indisponível, nunca reprovação do trabalho. Ficar de fora custava um retry
   // por tentativa até o ticket bloquear, sem ninguém ter julgado nada.
   [/session expired|sess[aã]o expirada|invalid session|session not found|token expired|reauthenticate|please (log ?in|sign ?in) again|failed\s+to\s+authenticate|authentication_error|not\s+authenticated|please\s+run\s+\/login|invalid\s+api\s+key/i, 'sessao'],
-  // `service unavailable` e `503` vêm da mesma lista do Actus (executor.mjs:211-221),
-  // que trata limite e INDISPONIBILIDADE como a mesma família. O `503` entra com
-  // borda de PALAVRA, e não por substring como lá: `15039 tokens` numa saída
-  // qualquer viraria adiamento.
-  [/rate[ _-]?limit|too many requests|\(429\)|overloaded|service unavailable|\b503\b/i, 'rate_limit'],
+  [/rate[ _-]?limit|too many requests|\(429\)|\b429\b/i, 'rate_limit'],
   [/quota|usage limit|usage_cap_reached|credit balance/i, 'quota'],
+  // Peça 7b-2 · INDISPONIBILIDADE não é limite. `service unavailable` e `503`
+  // vieram da lista do Actus (executor.mjs:211-221), que trata limite e
+  // indisponibilidade como a mesma família; aqui eles saem de `rate_limit` para
+  // não armar cooldown por um blip. Os números com borda de PALAVRA, e não por
+  // substring como lá: `15039 tokens` numa saída qualquer viraria adiamento.
+  // Depois de rate_limit e quota: uma saída com 429 E overloaded é limite.
+  [/overloaded|service unavailable|internal server error|bad gateway|\b(500|502|503|529)\b/i, 'servidor'],
 ]
 
+// ─── 2b · o runner do gate rodou? (peça 7b-2) ──────────────────────────────
+
+/** Sinais de que o PRÓPRIO runner não rodou: binário ausente, sem permissão, script inexistente. */
+const RUNNER_NAO_RODOU = /command not found|^\s*(ba|z)?sh: .*: (not found|Permission denied)\s*$|\bspawn\s+\S+\s+ENOENT\b|Missing script:/im
+/** Placar de testes (vitest, jest, mocha, o `[N pacotes, Xp/Yf]` do baseline). */
+const PLACAR_TESTES = /\bTests?:?\s+.*\b\d+\s+(passed|failed)\b|\b\d+\s+(passing|failing)\b|\[\d+ pacotes, \d+p\/\d+f\]/i
+/** Linha de teste que rodou e falhou: prova de que o runner rodou, mesmo sem o resumo. */
+const TESTE_FALHANDO = /^\s*(FAIL|✕|×)\s|AssertionError|\bexpected\b.*\bto\b/m
+
+/**
+ * O gate que reprovou NÃO RODOU (crash de runner), a partir do gates.txt?
+ *
+ * Em QUALQUER papel: rc 126/127 (`exit N` na linha FALHA), "command not
+ * found", ENOENT do binário, `Missing script`, ou recorte VAZIO com rc != 0.
+ * No papel `testes`, também: nenhum placar e nenhuma linha de teste falhando no
+ * recorte (o vitest que não achou o próprio módulo). Typecheck ou build que
+ * rodou e apontou erro de código continua sendo mérito.
+ *
+ * Existe porque, até aqui, gate quebrado virava `criterio_qualidade` e ESCALAVA
+ * o modelo: 82 de 82 retries do kit foram para opus, pagando capacidade para um
+ * problema de ambiente.
+ */
+export function gateNaoRodou(gatesSaida: string, papel: string): boolean {
+  const linhas = gatesSaida.split('\n')
+  const falha = linhas.find((l) => /^FALHA\s/.test(l))
+  if (!falha) return false
+  const nome = falha.split(/\s+/)[1] ?? ''
+  const rc = Number(/\bexit (\d+)\b/.exec(falha)?.[1] ?? NaN)
+  if (rc === 126 || rc === 127) return true
+  const marca = `--- recorte de ${nome} ---`
+  const i = gatesSaida.indexOf(marca)
+  const recorte = i >= 0 ? gatesSaida.slice(i + marca.length).trim() : ''
+  // Placar ou teste falhando é PROVA de que o runner rodou: vence qualquer
+  // texto de erro que um teste tenha imprimido no caminho.
+  if (PLACAR_TESTES.test(falha) || PLACAR_TESTES.test(recorte) || TESTE_FALHANDO.test(recorte)) return false
+  if (RUNNER_NAO_RODOU.test(recorte)) return true
+  if (recorte === '') return true
+  return papel === 'testes'
+}
+
+function houveGateCrash(sinal: SinalTentativa): boolean {
+  if (!sinal.gatesRc || !sinal.gatesSaida) return false
+  return gateNaoRodou(sinal.gatesSaida, sinal.gatePapelFalho ?? '')
+}
+
 /** Detecta causa de INFRA. null quando nada de infra aconteceu. */
 export function detectarCausaInfra(sinal: SinalTentativa): CausaInfra | null {
   // ANTES do curto-circuito de exitCode===0: o juiz roda DEPOIS de o agente
@@ -187,6 +266,8 @@ export interface Veredito {
   causa?: CausaInfra | CausaMerito
   motivo: string
   contaComoRetry: boolean
+  /** Peça 7b-2: o adiamento arma cooldown? Só para limite remoto (`armaCooldown`). */
+  cooldown?: boolean
 }
 
 /**
@@ -203,9 +284,10 @@ export interface Veredito {
  * ciclos pagos para chegar a uma conclusão que era do humano, não do agente.
  */
 export function decidirDesfecho(config: DecisaoConfig, sinal: SinalTentativa): Veredito {
+  const adia = causasDeAdiamentoDoConfig(config)
   const infra = detectarCausaInfra(sinal)
-  if (infra && causasDeAdiamentoDoConfig(config).has(infra)) {
-    return { desfecho: 'adiado', causa: infra, motivo: `infraestrutura: ${infra}`, contaComoRetry: false }
+  if (infra && adia.has(infra)) {
+    return { desfecho: 'adiado', causa: infra, motivo: `infraestrutura: ${infra}`, contaComoRetry: false, cooldown: armaCooldown(infra) }
   }
   if (sinal.diffLines > config.diff_cap_linhas) {
     return {
@@ -213,6 +295,7 @@ export function decidirDesfecho(config: DecisaoConfig, sinal: SinalTentativa): V
       causa: 'diff_cap',
       motivo: `diff de ${sinal.diffLines} linhas acima do cap de ${config.diff_cap_linhas}`,
       contaComoRetry: false,
+      cooldown: false,
     }
   }
   if (sinal.enforcementViolado) {
@@ -221,6 +304,20 @@ export function decidirDesfecho(config: DecisaoConfig, sinal: SinalTentativa): V
       causa: 'enforcement',
       motivo: 'barreira: violação de zona/escopo (ver enforcement.json)',
       contaComoRetry: false,
+      cooldown: false,
+    }
+  }
+  // Peça 7b-2 · DEPOIS de diff_cap e enforcement (fronteira e tamanho são
+  // certeza sobre o diff; o crash é o ambiente) e ANTES dos critérios: com o
+  // runner de gate quebrado, um critério vermelho pode ser o mesmo ambiente, e
+  // retry nenhum conserta ambiente.
+  if (houveGateCrash(sinal) && adia.has('gate_crash')) {
+    return {
+      desfecho: 'adiado',
+      causa: 'gate_crash',
+      motivo: `infraestrutura: gate_crash (o runner do gate de ${sinal.gatePapelFalho || 'papel desconhecido'} não rodou)`,
+      contaComoRetry: false,
+      cooldown: false,
     }
   }
   if (sinal.criteriosFalhos && sinal.criteriosFalhos.length > 0) {
@@ -229,12 +326,13 @@ export function decidirDesfecho(config: DecisaoConfig, sinal: SinalTentativa): V
       causa: 'criterio_qualidade',
       motivo: `critério(s) reprovado(s): ${sinal.criteriosFalhos.join('; ')}`,
       contaComoRetry: true,
+      cooldown: false,
     }
   }
   if (sinal.exitCode !== 0) {
-    return { desfecho: 'reprovado', causa: 'criterio_qualidade', motivo: `exit ${sinal.exitCode}`, contaComoRetry: true }
+    return { desfecho: 'reprovado', causa: 'criterio_qualidade', motivo: `exit ${sinal.exitCode}`, contaComoRetry: true, cooldown: false }
   }
-  return { desfecho: 'aprovado', motivo: 'gates e critérios verdes', contaComoRetry: false }
+  return { desfecho: 'aprovado', motivo: 'gates e critérios verdes', contaComoRetry: false, cooldown: false }
 }
 
 // ─── 3 · política de retry ─────────────────────────────────────────────────
diff --git a/scripts/orquestrador/executor.sh b/scripts/orquestrador/executor.sh
index 56f3c92..d328e92 100755
--- a/scripts/orquestrador/executor.sh
+++ b/scripts/orquestrador/executor.sh
@@ -140,8 +140,10 @@ $sujo"
 # Fronteira do politica_adiamento aplicada aqui:
 #   config errada (papel pendente, id recusado) -> ABORTA (die). Não é
 #     transitório: repetir amanhã dá o mesmo resultado.
-#   claude mudo/limitado (rede, cota, sessão, timeout) -> ADIA, arma cooldown e
-#     sai 0, sem consumir tentativa.
+#   claude mudo/limitado (rede, cota, sessão, timeout, 5xx) -> ADIA sem
+#     consumir tentativa: sai 75 com uma linha `[orq ADIA]`, que o
+#     `preflight_ou_adia` transforma em ADIADO motivo=preflight. Cooldown SÓ
+#     quando a causa é limite remoto (peça 7b-2).
 probe_modelos() {
   [ "$(cfg '.preflight_probe')" != "false" ] || { log "probe: desligado no config"; return 0; }
 
@@ -172,10 +174,15 @@ sem chamar modelo e sem consumir tentativa. Desbloqueio: $(cfg '.restricao_execu
   claude_run "$ROOT" "$out" 60 -- -p "responda apenas: ok" --output-format json --model "$m" || rc=$?
   custo_registrar probe '---' 0 "$out"
 
-  # ADIA: rede/sessão/cota/relógio. Não é defeito de nada — o ambiente caiu.
+  # ADIA: rede/sessão/cota/relógio/5xx. Não é defeito de nada — o ambiente caiu.
   if is_adiavel "$out" "$rc"; then
-    log "probe: claude em limite/timeout na sondagem — adiando (cooldown armado, zero tentativa)"
-    cooldown_arm; rm -f "$out"; exit 0
+    if is_rate_limited "$out" "$rc"; then
+      cooldown_arm
+      printf '[orq ADIA] probe: limite remoto na sondagem (rc=%s), cooldown armado\n' "$rc" >&2
+    else
+      printf '[orq ADIA] probe: claude indisponível na sondagem (rc=%s), sem cooldown\n' "$rc" >&2
+    fi
+    rm -f "$out"; exit 75
   fi
   # ABORTA: o CLI respondeu, mas recusando o modelo. Config errada.
   if decisao modelo-recusado < "$out" >/dev/null 2>&1; then
@@ -761,7 +768,7 @@ grava_diff_patch() {
 # medir contra ele faria o diff, o enforcement e o juiz enxergarem só a correção
 # — nunca o trabalho inteiro que vai ser mergeado. Vazio = comportamento antigo
 # (HEAD atual), que é o certo quando a worktree acabou de nascer.
-RESULT=""; MOTIVO=""; DIFF_LINES=0; DUR=0; ENF_OK=1
+RESULT=""; MOTIVO=""; DIFF_LINES=0; DUR=0; ENF_OK=1; AGENTE_RC=0
 run_attempt() {
   local file="$1" wt="$2" rundir="$3" modelo="$4" motivo_anterior="$5" attempt="${6:-0}" base_fixo="${7:-}"
   local prompt saida rc=0 t0 base sinal veredito tools
@@ -806,6 +813,7 @@ run_attempt() {
     custo_registrar executor "$(ticket_field "$file" '.id')" "$attempt" "$saida"
   fi
   DUR=$(( $(date +%s) - t0 ))
+  AGENTE_RC="$rc"
   fase pos-agente
   permissoes_negadas "$saida" "$file"
   commit_do_agente "$file" "$wt"
@@ -830,11 +838,18 @@ run_attempt() {
 
   # 7 · gates pelo motor genérico (ORQ-04). NUNCA npm run test:web cru: o npm não
   # propaga a flag de exclusão e o E2E que escreve no Supabase voltaria ao gate.
-  local gates_rc=0
+  local gates_rc=0 gate_falho="" papel_falho=""
   fase gates
   "${ORQ_TSX[@]}" "$ORQ_LIB_DIR/gates.ts" --run-cli "$wt" > "$rundir/gates.txt" 2>&1 || gates_rc=$?
   log "  gates: $([ "$gates_rc" = 0 ] && echo APROVADO || echo "REPROVADO (rc=$gates_rc)")"
   grep -qi 'reexecutar' "$rundir/gates.txt" && log "  gates: interrompidos — conjunto não vale parcialmente"
+  # Peça 7b-2: o PAPEL do gate que reprovou vai para o decisao.ts, que separa
+  # "o runner não rodou" (gate_crash, adia) de "o código está errado" (mérito).
+  if [ "$gates_rc" != 0 ]; then
+    gate_falho="$(grep -E '^FALHA ' "$rundir/gates.txt" 2>/dev/null | head -1 | awk '{print $2}' || true)"
+    [ -z "$gate_falho" ] || papel_falho="$(papel_do_gate "$gate_falho" \
+      "$(jq -r --arg n "$gate_falho" '.gates[]? | select(.nome == $n) | .papel // empty' "$CONFIG" 2>/dev/null || true)")"
+  fi
 
   fase critérios
   run_criterios "$file" "$wt" "$rundir"
@@ -859,7 +874,9 @@ run_attempt() {
     --argjson d "$DIFF_LINES" --argjson gi "$(grep -qi 'reexecutar' "$rundir/gates.txt" && echo true || echo false)" \
     --argjson enf "$([ "$ENF_OK" = 0 ] && echo true || echo false)" \
     --argjson cf "$(printf '%s' "$CRITERIOS_FALHOS" | jq -Rn '[inputs | select(length>0)]')" \
-    '{exitCode:$e, saida:$s, diffLines:$d, gateInterrompido:$gi, enforcementViolado:$enf, criteriosFalhos:$cf}')"
+    --argjson grc "$gates_rc" --arg gs "$(head -c 20000 "$rundir/gates.txt" 2>/dev/null || true)" --arg gp "$papel_falho" \
+    '{exitCode:$e, saida:$s, diffLines:$d, gateInterrompido:$gi, enforcementViolado:$enf, criteriosFalhos:$cf,
+      gatesRc:$grc, gatesSaida:$gs, gatePapelFalho:$gp}')"
   if [ "$gates_rc" != 0 ]; then
     sinal="$(printf '%s' "$sinal" | jq '.criteriosFalhos += ["gates reprovados"]')"
   fi
@@ -1048,9 +1065,14 @@ drive_ticket() {
     local tok; tok="$(motivo_token "$(cat "$rundir/veredito.json" 2>/dev/null || echo '{}')")"
 
     if [ "$RESULT" = "adiado" ]; then
-      event "$id" ADIADO "motivo=$tok" "attempt=$((attempt + 1))"
+      # Peça 7b-2: a trilha carrega a MEDIDA (rc do agente e duração real) e se
+      # o adiamento armou cooldown, que agora depende da causa (decisao.ts:
+      # armaCooldown). Sem `cooldown` no veredito, o comportamento antigo: arma.
+      local arma
+      arma="$(jq -r 'if .cooldown == false then "nao" else "sim" end' "$rundir/veredito.json" 2>/dev/null || echo sim)"
+      event "$id" ADIADO "motivo=$tok" "attempt=$((attempt + 1))" "rc=$AGENTE_RC" "dur=${DUR}s" "cooldown=$arma"
       status_set "estado=ocioso" "ultimo=$id ADIADO $(date '+%H:%M:%S') (${DUR}s)" "motivo=adiado: $tok"
-      DESFECHO_NOMEADO=1; mark_adiado "$file" "executor" "$MOTIVO"; cleanup_worktree "$id" "$wt"; return 0
+      DESFECHO_NOMEADO=1; mark_adiado "$file" "executor" "$MOTIVO" "$arma"; cleanup_worktree "$id" "$wt"; return 0
     fi
     if [ "$RESULT" = "aprovado" ]; then
       ticket_set_status "$file" "aguardando_merge"
@@ -1184,15 +1206,53 @@ armar_traps() {
   trap 'trap_sinal INT 2' INT
 }
 
+# --- 11 · RECUSA DE PREFLIGHT É ADIAMENTO (peça 7b-2) ------------------------
+# preflight_ou_adia [arquivo-ticket]
+#
+# Até a 7b-2 o `die` do preflight matava o executor, e o trap gravava
+# `EXECUTOR_MORREU rc=1 fase=?` com id "—": uma recusa de ambiente (árvore
+# suja, lock de git, identidade, sondagem sem resposta) contada como morte, sem
+# ticket e sem causa. Agora o preflight roda num subshell; recusou, o que sai é
+# UM evento `ADIADO motivo=preflight causa=<uma linha>` no ticket da vez, o
+# STATUS com a causa, e rc 0. Nenhum ticket é TOCADO (nem nota nem commit: com
+# o ambiente quebrado, commitar a cada disparo só suja o histórico) e nenhuma
+# tentativa é consumida. Cooldown, só se a sondagem achou limite remoto
+# (probe_modelos). A drenagem enxerga o ADIADO e aplica a régua de AMBIENTE da
+# 7a-8 sobre ele.
+#
+# A saída do preflight vai para o log depois que ele termina (o subshell escreve
+# num arquivo): a sondagem leva no máximo 60 s, e sem o arquivo não haveria de
+# onde tirar a causa.
+preflight_ou_adia() {
+  local file="${1:-}" err rc=0 causa id='—'
+  err="$(mktemp 2>/dev/null || echo "${TMPDIR:-/tmp}/orq-preflight.$$")"
+  ( preflight ) 2> "$err" || rc=$?
+  cat "$err" >&2 2>/dev/null || true
+  if [ "$rc" = 0 ]; then rm -f "$err"; return 0; fi
+  causa="$(awk '/^\[orq (ERRO|ADIA)\]/ { p = 1 } p' "$err" 2>/dev/null | sed -E 's/^\[orq (ERRO|ADIA)\] *//' || true)"
+  [ -n "$causa" ] || causa="preflight saiu rc=$rc: $(grep -v '^[[:space:]]*$' "$err" 2>/dev/null | tail -1 || true)"
+  rm -f "$err"
+  causa="$(uma_linha "$(printf '%s' "$causa" | tr -d '\r')" 300)"
+  [ -z "$file" ] || id="$(ticket_field "$file" '.id' 2>/dev/null || echo '—')"
+  [ -n "$id" ] && [ "$id" != null ] || id='—'
+  log "ADIADO (preflight, rc=$rc): $causa. Nenhum ticket tocado, nenhuma tentativa consumida."
+  event "$id" ADIADO "motivo=preflight" "causa=$causa"
+  status_set "estado=ocioso" "fase=—" "ticket=—" "motivo=adiado: preflight: $causa"
+  DESFECHO_NOMEADO=1
+  exit 0
+}
+
 main() {
   [ "$RECONCILE" = 1 ] && { reconcile_merged; exit 0; }
   pausa_ativa && { log "fila PAUSADA: $(pausa_motivo)"; exit 0; }
   cooldown_active && { log "cooldown ativo ($(cooldown_remaining_min) min) — encerrando"; exit 0; }
-  preflight
   local file=""
+  # O ticket da vez é conhecido ANTES do preflight quando vem por argumento (é
+  # assim que a drenagem chama): é nele que a recusa de preflight fica escrita.
   if [ -n "$TICKET" ]; then file="$TICKET"
-  elif [ -n "$TID" ]; then file="$(ticket_file_by_id "$TID")"
-  else file="$(proximo_pendente)"; fi
+  elif [ -n "$TID" ]; then file="$(ticket_file_by_id "$TID")"; fi
+  preflight_ou_adia "$file"
+  [ -n "$file" ] || file="$(proximo_pendente)"
   [ -n "$file" ] || { log "nenhum ticket pendente com dependências resolvidas"; exit 0; }
   drive_ticket "$file"
 }
diff --git a/scripts/orquestrador/lib.sh b/scripts/orquestrador/lib.sh
index f08f7fc..3cd28a6 100755
--- a/scripts/orquestrador/lib.sh
+++ b/scripts/orquestrador/lib.sh
@@ -666,10 +666,19 @@ ticket_mergeado_em_alvo() {
 # assinatura Max/Pro ou sobrecarga da API: tipos de erro `rate_limit_error`,
 # `overloaded_error`/529, `usage_cap_reached`; mensagens "usage limit reached",
 # "Request rejected (429)", "credit balance ... too low", "5-hour session limit".
-# ERE portável (sem \b — BSD grep do macOS): 429/529 casam com o formato
+# ERE portável (sem \b — BSD grep do macOS): 429 casa com o formato
 # "(429)"/"Request rejected"/"error 429", não um "429" solto qualquer.
 # Cobre as causas 'rate limit' e 'quota estourada' do politica_adiamento.
-RATE_LIMIT_REGEX='rate[ _-]?limit|rate_limit_error|limit reached|usage limit|usage_cap_reached|overloaded|too many requests|quota|capacity|credit balance|5-hour session limit|\(429\)|\(529\)|(error|status|rejected[^0-9]{0,20})[ (]?42[0-9]|529 '
+#
+# Peça 7b-2: `overloaded`, `capacity` e 529 SAÍRAM daqui para o
+# SERVIDOR_REGEX. Indisponibilidade não é limite: não tem prazo, e armar 60 min
+# de cooldown por um blip de API é o que o Comarka viu travar o 291 três vezes
+# em 03/09 (lib.sh:343 de lá).
+RATE_LIMIT_REGEX='rate[ _-]?limit|rate_limit_error|limit reached|usage limit|usage_cap_reached|too many requests|quota|credit balance|5-hour session limit|\(429\)|(error|status|rejected[^0-9]{0,20})[ (]?42[0-9]'
+
+# Erro TRANSITÓRIO de servidor (500/502/503/529, overloaded). Adia SEM cooldown.
+# Gêmeo do `servidor` do decisao.ts: os dois têm de concordar.
+SERVIDOR_REGEX='overloaded|service unavailable|internal server error|bad gateway|at capacity|API Error: 5[0-9][0-9]|\((500|502|503|529)\)|(error|status)[ (]?5(00|02|03|29)'
 
 # is_rate_limited <output_file> <rc> -> 0 se a chamada ao claude bateu num limite.
 # GATE DUPLO por design (distingue limite de erro real):
@@ -684,6 +693,15 @@ is_rate_limited() {
   LC_ALL=C grep -qiE "$RATE_LIMIT_REGEX" "$out"
 }
 
+# is_servidor <output_file> <rc> -> 0 se a chamada caiu em 5xx/overloaded.
+# Mesmo GATE DUPLO do is_rate_limited.
+is_servidor() {
+  local out="$1" rc="${2:-1}"
+  [ "$rc" != 0 ] || return 1
+  [ -f "$out" ] || return 1
+  LC_ALL=C grep -qiE "$SERVIDOR_REGEX" "$out"
+}
+
 # --- Cooldown compartilhado ---------------------------------------------------
 # Arquivo (epoch de expiração) que sinaliza "não dispare novos runs até lá".
 # Vive em runs/ (efêmero). Escrito quando um ticket é adiado por limite; lido
@@ -816,7 +834,9 @@ sem_envelope() {
 #   gate interrompido no meio      -> rc 129/130 (morto por fora) ou is_interrompido
 #   erro de conexão, sessão expirada -> is_interrompido
 #   rate limit, quota estourada      -> is_rate_limited
-# Nenhuma delas é defeito do código, então nenhuma queima retry.
+#   5xx, overloaded (peça 7b-2)      -> is_servidor
+# Nenhuma delas é defeito do código, então nenhuma queima retry. Qual delas ARMA
+# cooldown é outra pergunta: só o limite remoto (is_rate_limited).
 is_adiavel() {
   local out="$1" rc="${2:-1}"
   [ "$rc" = 124 ] && return 0    # claude_run cortou por timeout (normalizado p/ 124)
@@ -827,22 +847,33 @@ is_adiavel() {
   { [ "$rc" = 129 ] || [ "$rc" = 130 ]; } && return 0
   sem_envelope "$out" "$rc" && return 0   # o CLI não chegou a emitir envelope
   is_interrompido "$out" "$rc" && return 0
+  is_servidor "$out" "$rc" && return 0
   is_rate_limited "$out" "$rc"
 }
 
-# mark_adiado <arquivo_ticket> <origem> [detalhe]
+# mark_adiado <arquivo_ticket> <origem> [detalhe] [arma: sim|nao]
 # Desfecho ADIADO: status VOLTA a pendente (nunca bloqueado), nota com
-# timestamp, cooldown armado. NÃO mexe em retries — quem conta retry é o
-# drive_ticket, e o caminho de adiamento nunca passa por lá, então a tentativa
-# não é consumida.
+# timestamp. NÃO mexe em retries — quem conta retry é o drive_ticket, e o
+# caminho de adiamento nunca passa por lá, então a tentativa não é consumida.
+#
+# Peça 7b-2: o cooldown deixou de ser incondicional. `arma` vem do veredito
+# (`decisao.ts:armaCooldown`): `sim` só para limite REMOTO (rate_limit, quota);
+# timeout local, 5xx, sessão, rede e gate que não rodou passam `nao` e o próximo
+# disparo retoma sem espera. O padrão `sim` é o comportamento antigo, para quem
+# chamar sem o quarto argumento.
 mark_adiado() {
-  local file="$1" origem="${2:-executor}" detalhe="${3:-limite da sessão}" ts id
+  local file="$1" origem="${2:-executor}" detalhe="${3:-limite da sessão}" arma="${4:-sim}" ts id
   ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || echo '?')"
   id="$(ticket_field "$file" '.id')"
   ticket_set_status "$file" "pendente"
   ticket_set_nota "$file" "adiado ($origem) por $detalhe em $ts — retomará no próximo disparo"
   ticket_commit "$file" "fila: $id adiado ($origem)"
-  cooldown_arm
+  if [ "$arma" = nao ]; then
+    log "  causa LOCAL ou transitória: cooldown NÃO armado, o próximo disparo retoma sem espera"
+  else
+    cooldown_arm
+    log "  causa REMOTA (limite da assinatura ou cota): cooldown armado"
+  fi
   log "  adiado: $detalhe — retomará no próximo disparo (origem: $origem, $ts)"
 }
 
diff --git a/scripts/orquestrador/local-loop.sh b/scripts/orquestrador/local-loop.sh
index 3e91c22..051abe2 100755
--- a/scripts/orquestrador/local-loop.sh
+++ b/scripts/orquestrador/local-loop.sh
@@ -337,7 +337,7 @@ drenar() {
   # Peça 7a-8: causas vistas nesta drenagem ("<id><TAB><normalizada>"), o
   # backup dos contadores somados, e os bloqueios que esperam o fim da drenagem
   # (só valem se ela não terminar em ambiente).
-  local causas_vistas='' sp_backup='' a_bloquear='' norm outro ambiente_causa=''
+  local causas_vistas='' sp_backup='' a_bloquear='' norm outro ambiente_causa='' adiado=0
   local bid bfile bsp blim bcausa
   stwt="$(ensure_staging_worktree)"
   t0="$(date +%s)"
@@ -449,44 +449,55 @@ drenar() {
         # houve progresso. Não entra na memória e o contador zera.
         say "  $BRANCH_ALVO avançou na vez de $prox_id (${sha_antes:0:8} -> ${sha_depois:0:8}) — conta como progresso; contador zerado"
         sem_progresso_zerar "$prox_id"
-      elif foi_adiado "$evs" "$nota_antes" "$nota_depois"; then
-        # Adiado sem cooldown: não é defeito do ticket e não conta. Entra na
-        # memória mesmo assim, senão a drenagem o reescolheria em seguida.
-        tentados="$tentados$prox_id "
-        adiados_sc="$adiados_sc$prox_id "
-        adiados=$((adiados + 1))
-        say "  ticket $prox_id adiado sem cooldown — não conta como sem progresso; segue para o próximo não tentado"
       else
+        adiado=0
+        foi_adiado "$evs" "$nota_antes" "$nota_depois" && adiado=1
         causa="$(sem_progresso_causa "$evs" "$exe_out" "$exe_rc" "$nota_antes" "$nota_depois")"
         # Peça 7a-8: a mesma causa normalizada já apareceu nesta drenagem para
         # OUTRO ticket? Então não é do ticket, é do ambiente: ninguém soma nesta
         # drenagem (desfaz o que já foi somado), nenhum bloqueio pendente vale,
         # a trilha ganha AMBIENTE e a drenagem para.
+        #
+        # Peça 7b-2: a régua vale também para o ADIADO sem cooldown. A recusa de
+        # preflight virou `ADIADO motivo=preflight causa=...`, e sessão caída,
+        # timeout, 5xx e gate que não rodou adiam sem cooldown: em todos, a
+        # mesma causa em dois tickets é o ambiente. A causa do adiado é o
+        # próprio evento (`ADIADO motivo=... causa=...` ou `... rc= dur=`).
         norm="$(causa_normalizada "$causa" "$prox_id")"
         outro="$(printf '%s\n' "$causas_vistas" | awk -F'\t' -v c="$norm" -v id="$prox_id" '$2 == c && $1 != id { print $1; exit }')"
         if [ -n "$outro" ]; then
           sem_progresso_desfazer "$sp_backup"
           sp_backup=''; a_bloquear=''; sem_progresso=0
           tentados="$tentados$prox_id "
+          [ "$adiado" = 0 ] || adiados=$((adiados + 1))
           event '---' AMBIENTE "tickets=$outro,$prox_id" "causa=$norm"
           say "  AMBIENTE: $outro e $prox_id pararam pela mesma causa ($norm) — nada soma nesta drenagem; encerrando"
           motivo_ocioso=ambiente; ambiente_causa="$norm"
           rm -f "$exe_out"; break
         fi
         causas_vistas="$causas_vistas$prox_id"$'\t'"$norm"$'\n'
-        sp_backup="$sp_backup$prox_id"$'\t'"$(head -1 "$(sem_progresso_arquivo "$prox_id")" 2>/dev/null || true)"$'\n'
-        sp="$(sem_progresso_incrementar "$prox_id")"
-        n="${sp%%|*}"; lim="$(sem_progresso_limite)"
-        if [ "$n" -ge "$lim" ]; then
-          # O bloqueio espera o FIM da drenagem: se um ticket seguinte parar pela
-          # mesma causa, era ambiente e este não pode ter sido bloqueado por ela.
+        if [ "$adiado" = 1 ]; then
+          # Adiado sem cooldown: não é defeito do ticket e não conta. Entra na
+          # memória mesmo assim, senão a drenagem o reescolheria em seguida.
           tentados="$tentados$prox_id "
-          a_bloquear="$a_bloquear$prox_id"$'\t'"$prox"$'\t'"$sp"$'\t'"$lim"$'\t'"$causa"$'\n'
-          say "  ticket $prox_id atingiu o limite de sem progresso ($n/$lim) — bloqueia no fim da drenagem, se ela não terminar em ambiente. Causa: $causa"
+          adiados_sc="$adiados_sc$prox_id "
+          adiados=$((adiados + 1))
+          say "  ticket $prox_id adiado sem cooldown — não conta como sem progresso; segue para o próximo não tentado. Causa: $causa"
         else
-          tentados="$tentados$prox_id "
-          sem_progresso=$((sem_progresso + 1))
-          say "  ticket $prox_id segue pendente sem cooldown (sem progresso $n/$lim) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: $causa"
+          sp_backup="$sp_backup$prox_id"$'\t'"$(head -1 "$(sem_progresso_arquivo "$prox_id")" 2>/dev/null || true)"$'\n'
+          sp="$(sem_progresso_incrementar "$prox_id")"
+          n="${sp%%|*}"; lim="$(sem_progresso_limite)"
+          if [ "$n" -ge "$lim" ]; then
+            # O bloqueio espera o FIM da drenagem: se um ticket seguinte parar pela
+            # mesma causa, era ambiente e este não pode ter sido bloqueado por ela.
+            tentados="$tentados$prox_id "
+            a_bloquear="$a_bloquear$prox_id"$'\t'"$prox"$'\t'"$sp"$'\t'"$lim"$'\t'"$causa"$'\n'
+            say "  ticket $prox_id atingiu o limite de sem progresso ($n/$lim) — bloqueia no fim da drenagem, se ela não terminar em ambiente. Causa: $causa"
+          else
+            tentados="$tentados$prox_id "
+            sem_progresso=$((sem_progresso + 1))
+            say "  ticket $prox_id segue pendente sem cooldown (sem progresso $n/$lim) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: $causa"
+          fi
         fi
       fi
     fi
diff --git a/scripts/orquestrador/test-ambiente-adiado.sh b/scripts/orquestrador/test-ambiente-adiado.sh
new file mode 100644
index 0000000..26a9abd
--- /dev/null
+++ b/scripts/orquestrador/test-ambiente-adiado.sh
@@ -0,0 +1,117 @@
+#!/usr/bin/env bash
+# test-ambiente-adiado.sh · a regra de AMBIENTE da 7a-8 vale sobre o ADIADO
+# (peça 7b-2).
+#
+# Desde a 7b-2 a recusa de preflight não mata mais o executor: ela vira ADIADO
+# motivo=preflight causa=<uma linha>, sem cooldown. E todo adiamento sem
+# cooldown (sessão caída, timeout, 5xx, crash de gate) segue a mesma régua: a
+# MESMA causa normalizada em dois tickets na mesma drenagem é ambiente, não
+# ticket. Sem isso, um login caído adiava a fila inteira a cada disparo.
+#
+#   1. preflight recusa TODO ticket (ADIADO motivo=preflight): 3 disparos, 3
+#      AMBIENTE, no máximo 2 chamadas por disparo, STATUS diz ambiente.
+#   2. sessão caída em todo ticket (ADIADO motivo=sessao, sem cooldown): AMBIENTE.
+#   3. adiamentos com causas DIFERENTES não são ambiente: a drenagem segue.
+#
+# Uso: bash scripts/orquestrador/test-ambiente-adiado.sh
+
+set -uo pipefail
+AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
+
+export ORQ_TESTE=1
+ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
+TMP="$(dirname "$ORQ_EXEC_ROOT")"
+trap 'rm -rf "$TMP"' EXIT
+# shellcheck source=test-fixture-drenagem.sh
+source "$AQUI/test-fixture-drenagem.sh"
+fx_config "$ORQ_EXEC_ROOT"
+for id in 901 902 903; do fx_ticket "$ORQ_EXEC_ROOT" "$id"; done
+fx_git "$ORQ_EXEC_ROOT"
+LOCAL_LOOP_SOURCED=1
+# shellcheck source=local-loop.sh
+source "$AQUI/local-loop.sh"
+set +e
+
+FALHAS=0
+ok()    { printf '  ok    %s\n' "$*"; }
+falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
+
+FILA="$ORQ_EXEC_ROOT/docs/fila"
+TRILHA="$FILA/runs/events.log"
+MODO="$TMP/modo"     # preflight | sessao | proprio
+CALLS="$TMP/calls"
+
+ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
+merge_em_alvo() { return 0; }
+cleanup_frente() { return 0; }
+# O executor da 7b-2: o que ele grava na trilha em cada adiamento, e o rc 0.
+run_executor_once() {
+  local id; id="$(ticket_field "$2" '.id')"
+  echo "$id" >> "$CALLS"
+  case "$(cat "$MODO")" in
+    preflight)
+      local pid=4242; [ "$id" = 902 ] && pid=123456789
+      echo "[orq ERRO] preflight: lock de git em uso por outro processo: $ORQ_EXEC_ROOT/.git/index.lock (pid $pid)" >&2
+      event "$id" ADIADO "motivo=preflight" \
+        "causa=preflight: lock de git em uso por outro processo: $ORQ_EXEC_ROOT/.git/index.lock (pid $pid, vez do $id, HEAD $(printf '%07x' $RANDOM$RANDOM)a)" ;;
+    sessao)
+      event "$id" ADIADO "motivo=sessao" "attempt=1" "rc=1" "dur=3s" "cooldown=nao" ;;
+    proprio)
+      case "$id" in
+        901) event "$id" ADIADO "motivo=timeout" "attempt=1" "rc=124" "dur=1801s" "cooldown=nao" ;;
+        902) event "$id" ADIADO "motivo=gate_crash" "attempt=1" "rc=0" "dur=40s" "cooldown=nao" ;;
+        *)   event "$id" ADIADO "motivo=servidor" "attempt=1" "rc=1" "dur=5s" "cooldown=nao" ;;
+      esac ;;
+  esac
+  return 0
+}
+st()     { ticket_field "$FILA/$1-t.md" '.status'; }
+n_amb()  { grep -c ' AMBIENTE ' "$TRILHA" 2>/dev/null || true; }
+disparo() {
+  : > "$CALLS"
+  drenar > "$TMP/out.$1" 2>&1
+  echo "  --- disparo $1 ($(cat "$MODO")): chamadas [$(tr '\n' ' ' < "$CALLS")]" \
+       "901=$(st 901) 902=$(st 902) 903=$(st 903)"
+}
+
+echo "== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos =="
+echo preflight > "$MODO"
+max=0
+for d in 1 2 3; do
+  disparo "$d"
+  n="$(grep -c . "$CALLS")"; [ "$n" -gt "$max" ] && max="$n"
+done
+[ "$(n_amb)" = 3 ] && ok "3 eventos AMBIENTE (um por disparo)" || falha "esperava 3 AMBIENTE, há $(n_amb)"
+[ "$max" -le 2 ] && ok "no máximo 2 chamadas por disparo (máx: $max)" || falha "um disparo chamou o executor $max vezes"
+amb="$(grep ' AMBIENTE ' "$TRILHA" | tail -1)"
+echo "  trilha: $amb"
+case "$amb" in *" --- AMBIENTE tickets=901,902 causa="*) ok "evento com os tickets que colidiram" ;; *) falha "evento fora do formato" ;; esac
+causa="${amb#* causa=}"
+case "$causa" in
+  *901*|*902*|*"$ORQ_EXEC_ROOT"*) falha "causa não normalizada: $causa" ;;
+  *"ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)") ok "causa normalizada, com o motivo preflight" ;;
+  *) falha "causa perdeu o texto: $causa" ;;
+esac
+bl=0; for id in 901 902 903; do [ "$(st "$id")" = bloqueado ] && bl=$((bl + 1)); done
+[ "$bl" = 0 ] && ok "0 bloqueados" || falha "$bl bloqueado(s)"
+mot="$(grep '^MOTIVO' "$FILA/runs/STATUS.md")"
+echo "  STATUS: $mot"
+case "$mot" in *"ambiente: "*"preflight: lock de git"*) ok "STATUS diz ambiente e a causa" ;; *) falha "STATUS sem a causa de ambiente" ;; esac
+
+echo
+echo "== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE =="
+echo sessao > "$MODO"; antes="$(n_amb)"; disparo 4
+[ "$(n_amb)" = $((antes + 1)) ] && ok "um AMBIENTE" || falha "sem AMBIENTE para sessão caída em 2 tickets"
+[ "$(grep -c . "$CALLS")" -le 2 ] && ok "parou na 2ª chamada" || falha "chamou $(grep -c . "$CALLS") vezes"
+grep ' AMBIENTE ' "$TRILHA" | tail -1 | grep -q 'causa=ADIADO motivo=sessao' \
+  && ok "causa: ADIADO motivo=sessao" || falha "causa: $(grep ' AMBIENTE ' "$TRILHA" | tail -1)"
+
+echo
+echo "== 3. adiamentos com causas DIFERENTES não são ambiente =="
+echo proprio > "$MODO"; antes="$(n_amb)"; disparo 5
+[ "$(n_amb)" = "$antes" ] && ok "nenhum AMBIENTE" || falha "causas diferentes viraram AMBIENTE"
+[ "$(tr '\n' ' ' < "$CALLS")" = "901 902 903 " ] && ok "a drenagem seguiu pelos três" || falha "chamadas: $(tr '\n' ' ' < "$CALLS")"
+
+echo
+if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
diff --git a/scripts/orquestrador/test-causa-adiamento.sh b/scripts/orquestrador/test-causa-adiamento.sh
new file mode 100644
index 0000000..6bbda6a
--- /dev/null
+++ b/scripts/orquestrador/test-causa-adiamento.sh
@@ -0,0 +1,122 @@
+#!/usr/bin/env bash
+# test-causa-adiamento.sh · a tabela de causas do adiamento (peça 7b-2).
+#
+# Porte do test-cooldown-causa.sh do Comarka, e o que ele não cobria. Roda o
+# executor.sh DE VERDADE num repo de fixture (test-fixture-executor.sh), com um
+# `claude` falso e gates controlados pelo caso. Zero modelo, zero rede.
+#
+# A regra: COOLDOWN só para limite REMOTO (rate_limit, quota). Timeout local,
+# 5xx/overloaded e crash de runner de gate ADIAM sem cooldown, sem consumir
+# tentativa e sem escalar modelo. Recusa de preflight vira ADIADO
+# motivo=preflight, nunca EXECUTOR_MORREU.
+#
+#   A. timeout (rc 124 do watchdog)       -> ADIADO timeout, SEM cooldown
+#   B. 429                                 -> ADIADO rate_limit, COM cooldown
+#   C. 503 / overloaded                    -> ADIADO servidor, SEM cooldown
+#   D. gate de testes sem placar           -> ADIADO gate_crash, sem RETRY, sem opus
+#   E. tsc ausente (rc 127)                -> ADIADO gate_crash
+#   F. tsc com "error TS"                  -> REPROVADO (mérito), nunca ADIADO
+#   G. recusa de preflight (árvore suja)   -> ADIADO motivo=preflight causa=...,
+#                                             nenhuma linha EXECUTOR_MORREU, rc 0
+#
+# Uso: bash scripts/orquestrador/test-causa-adiamento.sh
+
+set -uo pipefail
+AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
+
+# ISOLAMENTO (peça 0d): nada deste script carrega o lib.sh, mas o contrato vale
+# igual. O executor roda em processo próprio, com ORQ_TESTE=1 e ORQ_EXEC_ROOT no
+# repo do fixture (fxe_roda).
+export ORQ_TESTE=1
+ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
+TMP_RAIZ="$(dirname "$ORQ_EXEC_ROOT")"
+# shellcheck source=test-fixture-executor.sh
+source "$AQUI/test-fixture-executor.sh"
+trap 'fxe_limpa; rm -rf "$TMP_RAIZ"' EXIT
+
+FALHAS=0
+ok()    { printf '  ok    %s\n' "$*"; }
+falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
+trilha() { printf '%s\n' "$(fxe_eventos)" | sed 's/^[^ ]* /  | /'; }
+
+# adiado_sem_gasto <motivo> — o que todo adiamento de infra tem de cumprir.
+adiado_sem_gasto() {
+  local m="$1" ev
+  ev="$(fxe_eventos)"
+  [ "$(fxe_status)" = pendente ] && ok "ticket segue pendente" || falha "status=$(fxe_status)"
+  printf '%s\n' "$ev" | grep -q " 901 ADIADO motivo=$m " \
+    && ok "trilha: ADIADO motivo=$m" || falha "sem ADIADO motivo=$m"
+  printf '%s\n' "$ev" | grep -q ' REPROVADO \| RETRY \| BLOQUEADO ' \
+    && falha "houve REPROVADO/RETRY/BLOQUEADO" || ok "nenhum REPROVADO, RETRY ou BLOQUEADO"
+  [ "$(fxe_tentativas)" = 1 ] && ok "uma tentativa só (nada consumido)" || falha "$(fxe_tentativas) tentativas"
+  grep -q 'model=opus' "$FXE/chamadas" && falha "escalou para opus" || ok "não escalou modelo"
+}
+
+echo "== A. timeout local (rc 124 do watchdog): adia SEM cooldown =="
+fxe_novo; fxe_claude sleep; fxe_roda
+adiado_sem_gasto timeout
+fxe_cooldown && falha "cooldown armado num timeout local" || ok "cooldown NÃO armado"
+printf '%s\n' "$(fxe_eventos)" | grep -q ' ADIADO .*cooldown=nao' && ok "evento diz cooldown=nao" || falha "evento sem cooldown=nao"
+case "$(fxe_nota)" in *timeout*) ok "nota registra timeout" ;; *) falha "nota: $(fxe_nota)" ;; esac
+trilha; fxe_limpa
+
+echo
+echo "== B. 429: adia COM cooldown =="
+fxe_novo; fxe_claude 429; fxe_roda
+adiado_sem_gasto rate_limit
+fxe_cooldown && ok "cooldown ARMADO (limite remoto)" || falha "cooldown não armado num 429"
+printf '%s\n' "$(fxe_eventos)" | grep -q ' ADIADO .*cooldown=sim' && ok "evento diz cooldown=sim" || falha "evento sem cooldown=sim"
+trilha; fxe_limpa
+
+echo
+echo "== C. 503 / overloaded: adia SEM cooldown =="
+fxe_novo; fxe_claude 503; fxe_roda
+adiado_sem_gasto servidor
+fxe_cooldown && falha "cooldown armado num 5xx" || ok "cooldown NÃO armado"
+trilha; fxe_limpa
+
+echo
+echo "== D. gate de testes que não rodou (sem placar): gate_crash =="
+fxe_novo
+fxe_gate test 'echo "Error: Cannot find module vitest/package.json" >&2; exit 1'
+fxe_roda
+adiado_sem_gasto gate_crash
+fxe_cooldown && falha "cooldown armado num crash de gate" || ok "cooldown NÃO armado"
+trilha; fxe_limpa
+
+echo
+echo "== E. tsc ausente (rc 127, command not found): gate_crash =="
+fxe_novo
+fxe_gate typecheck 'tsc-que-nao-existe --noEmit'
+fxe_roda
+adiado_sem_gasto gate_crash
+trilha; fxe_limpa
+
+echo
+echo "== F. tsc que rodou e apontou erro de código: mérito, não adia =="
+fxe_novo '.max_retries = 0'
+fxe_gate typecheck 'echo "src/a.ts(1,14): error TS2322: Type string is not assignable to type number."; exit 2'
+fxe_roda
+ev="$(fxe_eventos)"
+printf '%s\n' "$ev" | grep -q ' 901 REPROVADO ' && ok "REPROVADO (mérito)" || falha "não reprovou"
+printf '%s\n' "$ev" | grep -q ' 901 ADIADO ' && falha "adiou um erro de código" || ok "não adiou"
+trilha; fxe_limpa
+
+echo
+echo "== G. recusa de preflight (árvore de execução suja): ADIADO motivo=preflight =="
+fxe_novo
+printf 'sujeira\n' > "$FXE/repo/lixo.txt"
+fxe_roda
+ev="$(fxe_eventos)"
+[ "$FXE_RC" = 0 ] && ok "executor sai 0" || falha "executor saiu rc=$FXE_RC"
+printf '%s\n' "$ev" | grep -q ' 901 ADIADO motivo=preflight causa=.*árvore de execução suja' \
+  && ok "trilha: ADIADO motivo=preflight com a causa" || falha "sem ADIADO motivo=preflight causa=..."
+printf '%s\n' "$ev" | grep -q 'EXECUTOR_MORREU' && falha "gravou EXECUTOR_MORREU" || ok "nenhuma linha EXECUTOR_MORREU"
+[ "$(printf '%s\n' "$ev" | grep -c ' ADIADO ')" = 1 ] && ok "um evento, uma linha" || falha "ADIADO em mais de uma linha"
+[ "$(fxe_status)" = pendente ] && ok "ticket segue pendente" || falha "status=$(fxe_status)"
+fxe_cooldown && falha "cooldown armado por preflight" || ok "cooldown NÃO armado"
+trilha; fxe_limpa
+
+echo
+if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
diff --git a/scripts/orquestrador/test-fixture-executor.sh b/scripts/orquestrador/test-fixture-executor.sh
new file mode 100644
index 0000000..ccb7011
--- /dev/null
+++ b/scripts/orquestrador/test-fixture-executor.sh
@@ -0,0 +1,152 @@
+#!/usr/bin/env bash
+# test-fixture-executor.sh · NÃO é teste: é o molde que os testes da etapa 7b
+# CARREGAM (source) para rodar o executor.sh DE VERDADE num repo git montado num
+# `mktemp -d`, com um `claude` falso no PATH e gates que o caso controla.
+#
+# Nada aqui lê `docs/fila` do checkout nem config de repo real: o config é o
+# heredoc abaixo (as chaves do fixture do kit, com a sondagem desligada e a
+# identidade vazia), a fila é um ticket 901, e os gates chamam scripts do
+# próprio tmp. O motor deste checkout é VENDORIZADO no fixture
+# (scripts/orquestrador/, commitado), como num repo instalado: o enforcement roda
+# `scripts/orquestrador/enforcement-core.ts` a partir da raiz de execução. O
+# único empréstimo é o `node_modules` do checkout que contém este arquivo
+# (symlink, ignorado pelo git do fixture), porque o motor é TypeScript.
+#
+# Uso, de dentro de um teste:
+#   source "$AQUI/test-fixture-executor.sh"
+#   fxe_novo                      # monta $FXE/repo e imprime nada
+#   fxe_claude 429                # o que o `claude` falso faz na próxima chamada
+#   fxe_gate typecheck 'exit 0'   # corpo do script do gate
+#   fxe_roda                      # roda executor.sh --ticket 901; saída em $FXE/saida, rc em $FXE_RC
+#   fxe_status / fxe_nota / fxe_eventos / fxe_cooldown
+#
+# Rodado direto, só avisa e sai 0.
+
+if [ "${BASH_SOURCE[0]}" = "$0" ]; then
+  echo "test-fixture-executor.sh é molde carregado pelos test-*.sh da 7b; não roda sozinho"
+  exit 0
+fi
+
+FXE_AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
+FXE_NM="$(cd "$FXE_AQUI/../.." && pwd)/node_modules"
+
+# fxe_novo [filtro-jq] — um tmp novo com repo, claude falso e gates verdes. O
+# filtro opcional ajusta o config do caso (ex.: '.max_retries = 0').
+fxe_novo() {
+  local filtro="${1:-.}" r
+  FXE="$(mktemp -d)"
+  r="$FXE/repo"
+  mkdir -p "$r/docs/fila/runs" "$r/src" "$FXE/bin" "$FXE/gates" "$FXE/_worktrees"
+  printf 'exit 0\n' > "$FXE/gates/typecheck.sh"
+  printf 'echo " Tests  1 passed (1)"\nexit 0\n' > "$FXE/gates/test.sh"
+  jq "$filtro" > "$r/docs/fila/000-config.json" <<'JSON'
+{ "$schema_versao": 2,
+  "branch_alvo": "staging-auto", "branch_protegida": "main",
+  "max_retries": 2, "cooldown_minutes": 60, "diff_cap_linhas": 600,
+  "politica_adiamento": { "causas_que_adiam": [
+    "erro de conexão", "sessão expirada", "rate limit", "quota estourada",
+    "timeout de claude_timeout_secs", "gate interrompido no meio", "veredito do juiz ilegível" ] },
+  "politica_retry": { "por_causa": {
+    "diff_cap": { "modelo": "MANTER", "acao": "estreitar o escopo" },
+    "enforcement": { "modelo": "MANTER", "acao": "respeitar a allowlist" },
+    "criterio_qualidade": { "modelo": "ESCALAR", "acao": "subir para retry_final_model" } } },
+  "migrations_dir": "db/migrations", "sql_pendente_dir": "docs/sql-pendente",
+  "worktrees_dir": "../_worktrees", "worktrees_prefixo": "fxe-",
+  "runs_dir": "docs/fila/runs", "liberacoes_file": "docs/fila/liberacoes.json",
+  "decisoes_file": "docs/fila/decisoes-pendentes.md", "pausar_file": "docs/fila/PAUSAR",
+  "executor_model": "sonnet", "avaliador_model": "opus", "retry_final_model": "opus",
+  "modelos": { "juiz_baixo": "sonnet", "juiz_alto": "opus", "retry_final": "opus" },
+  "restricao_execucao": { "ativa": false, "tickets_permitidos": [], "recusa_exit_code": 78,
+    "recusa_mensagem": "RECUSADO", "desbloqueio": "n/a" },
+  "claude_timeout_secs": 2, "claude_max_turns": 5,
+  "preflight_probe": false, "preflight_env_keys": [],
+  "commit_checkpoint": { "quando": "a cada unidade", "_regra": "commita" },
+  "repo_origin_deve_conter": null, "ambiente_id": null,
+  "zona_proibida": { "no_write_paths": [".env*", "scripts/orquestrador/**"], "no_write_tables": "TODAS" },
+  "paths_harness": ["scripts/orquestrador/**"],
+  "gates": [
+    { "nome": "typecheck", "cmd": "__TC__", "tipo": "exit_code" },
+    { "nome": "test", "cmd": "__TS__", "tipo": "exit_code" } ],
+  "_execucao_dos_gates": { "ordem_obrigatoria": ["typecheck", "test"], "interrupcao": "NAO_VALE_PARCIALMENTE" },
+  "canal_notificacao": "arquivo",
+  "juiz": { "diff_max_baixo": 300, "max_tokens_veredicto": 300, "paths_alto_risco": [], "palavras_alto_risco": [] },
+  "orcamento": { "usd_dia": 50, "tokens_dia": 5000000, "usd_ticket": 5, "custo_file": "docs/fila/runs/custo.json",
+    "campos_usage": { "custo_usd": "total_cost_usd", "tokens_in": "usage.input_tokens",
+      "tokens_out": "usage.output_tokens", "tokens_cache": "usage.cache_read_input_tokens" } },
+  "executor": { "trailer_commit": "Orq-Ticket" },
+  "proibicoes_absolutas": { "regras": [], "tools": ["Bash(git push:*)"] } }
+JSON
+  # Os gates chamam scripts do tmp: o caminho só existe agora, então entra
+  # depois do heredoc, no lugar dos marcadores __TC__ e __TS__.
+  jq --arg tc "bash $FXE/gates/typecheck.sh" --arg ts "bash $FXE/gates/test.sh" \
+    '.gates[0].cmd = $tc | .gates[1].cmd = $ts' "$r/docs/fila/000-config.json" > "$r/docs/fila/000-config.json.tmp" \
+    && mv "$r/docs/fila/000-config.json.tmp" "$r/docs/fila/000-config.json"
+  echo '{"$schema_versao": 2, "tokens": []}' > "$r/docs/fila/liberacoes.json"
+  printf '| data | origem | alvo | pergunta | visto |\n|---|---|---|---|---|\n' > "$r/docs/fila/decisoes-pendentes.md"
+  cat > "$r/docs/fila/901-t.md" <<'TICKET'
+# 901
+
+```json
+{"id": "901", "slug": "t-901", "status": "pendente", "origem": "humano",
+ "objetivo": "escrever src/a.ts", "pathspec_allowlist": ["src/a.ts"], "dependencias": [],
+ "criterios_aceite": [
+   {"tipo": "alvo", "descricao": "o arquivo existe", "cmd": "test -f src/a.ts && echo ok", "espera": "ok"}],
+ "notas_status": ""}
+```
+TICKET
+  printf 'export const base = 0\n' > "$r/src/base.ts"
+  mkdir -p "$r/scripts/orquestrador"
+  cp "$FXE_AQUI"/*.sh "$FXE_AQUI"/*.ts "$r/scripts/orquestrador/"
+  printf 'docs/fila/runs/\nnode_modules\n' > "$r/.gitignore"
+  [ -e "$FXE_NM" ] && ln -s "$FXE_NM" "$r/node_modules"
+  git -C "$r" init -q -b main
+  git -C "$r" config user.email fixture@example.invalid
+  git -C "$r" config user.name fixture
+  git -C "$r" config commit.gpgsign false
+  git -C "$r" add -A
+  git -C "$r" commit -q -m "fixture: fila inicial"
+  git -C "$r" branch staging-auto
+
+  # O `claude` falso. Juiz (--max-turns 1) imprime $FXE/juiz-saida; agente faz
+  # o que $FXE/claude-modo manda. Cada chamada do agente fica em $FXE/chamadas.
+  cat > "$FXE/bin/claude" <<STUB
+#!/usr/bin/env bash
+case " \$* " in *" --max-turns 1 "*) cat "$FXE/juiz-saida" 2>/dev/null; exit 0 ;; esac
+modelo=\$(printf '%s\n' "\$@" | awk 'p { print; exit } \$0 == "--model" { p = 1 }')
+echo "agente model=\$modelo" >> "$FXE/chamadas"
+case "\$(cat "$FXE/claude-modo" 2>/dev/null || echo ok)" in
+  sleep) sleep 30 ;;
+  429) echo '{"type":"result","is_error":true,"result":"API Error: Request rejected (429) · rate_limit_error"}'; exit 1 ;;
+  503) echo '{"type":"result","is_error":true,"result":"API Error: 503 Service Unavailable · overloaded_error"}'; exit 1 ;;
+  rc124) exit 124 ;;
+  ok) printf 'export const a = 1\n' > src/a.ts
+      git add src/a.ts && git commit -qm "a" -m "Orq-Ticket: 901"
+      echo '{"type":"result","result":"feito","total_cost_usd":0}' ;;
+esac
+STUB
+  chmod +x "$FXE/bin/claude"
+  : > "$FXE/chamadas"
+  echo ok > "$FXE/claude-modo"
+}
+
+fxe_claude() { printf '%s\n' "$1" > "$FXE/claude-modo"; }
+fxe_gate()   { printf '%s\n' "$2" > "$FXE/gates/$1.sh"; }
+fxe_juiz()   { printf '%s\n' "$1" > "$FXE/juiz-saida"; }
+
+# fxe_roda — o executor.sh vendorizado no fixture (a cópia deste checkout).
+# Isolado:
+# ORQ_TESTE=1 e ORQ_EXEC_ROOT no fixture, como os testes da 7a.
+fxe_roda() {
+  FXE_RC=0
+  ( cd "$FXE/repo" && ORQ_TESTE=1 ORQ_EXEC_ROOT="$FXE/repo" PATH="$FXE/bin:$PATH" \
+      bash "$FXE/repo/scripts/orquestrador/executor.sh" --ticket "$FXE/repo/docs/fila/901-t.md" ) > "$FXE/saida" 2>&1 || FXE_RC=$?
+  return 0
+}
+
+fxe_campo()    { awk '/^```json$/{f=1;next} f&&/^```$/{exit} f' "$FXE/repo/docs/fila/901-t.md" | jq -r "$1"; }
+fxe_status()   { fxe_campo '.status'; }
+fxe_nota()     { fxe_campo '.notas_status // ""'; }
+fxe_eventos()  { cat "$FXE/repo/docs/fila/runs/events.log" 2>/dev/null || true; }
+fxe_cooldown() { [ -f "$FXE/repo/docs/fila/runs/.cooldown-until" ]; }
+fxe_tentativas() { ls -d "$FXE/repo/docs/fila/runs/901"/attempt-* 2>/dev/null | wc -l | tr -d ' '; }
+fxe_limpa()    { [ -n "${FXE:-}" ] && rm -rf "$FXE"; return 0; }
diff --git a/test/orquestrador-adiamento-actus.test.ts b/test/orquestrador-adiamento-actus.test.ts
index 2976824..e616c15 100644
--- a/test/orquestrador-adiamento-actus.test.ts
+++ b/test/orquestrador-adiamento-actus.test.ts
@@ -79,9 +79,20 @@ describe('detectarAdiamento do Actus: limite e indisponibilidade da API', () =>
     expect(detectarCausaInfra(sinal({ exitCode: 0, saida: 'done' }))).toBeNull();
   });
 
-  it('`service unavailable` e `503` entram na mesma família (eram do Actus e faltavam)', () => {
-    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'Error: Service Unavailable' }))).toBe('rate_limit');
-    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'API error (503)' }))).toBe('rate_limit');
+  // Peça 7b-2: `service unavailable` e `503` continuam ADIANDO (eram do Actus e
+  // faltavam), mas saem de `rate_limit` para `servidor`: indisponibilidade não é
+  // limite e não arma cooldown. O 429 segue `rate_limit`, e é ele que arma.
+  it('`service unavailable` e `503` adiam como `servidor`, SEM cooldown; 429 segue `rate_limit` COM cooldown', () => {
+    for (const saida of ['Error: Service Unavailable', 'API error (503)']) {
+      expect(detectarCausaInfra(sinal({ exitCode: 1, saida })), saida).toBe('servidor');
+      const v = decidirDesfecho(CONFIG, sinal({ exitCode: 1, saida }));
+      expect(v.desfecho, saida).toBe('adiado');
+      expect(v.cooldown, saida).toBe(false);
+    }
+    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'API Error: Request rejected (429)' }))).toBe('rate_limit');
+    const v429 = decidirDesfecho(CONFIG, sinal({ exitCode: 1, saida: 'API Error: Request rejected (429)' }));
+    expect(v429.desfecho).toBe('adiado');
+    expect(v429.cooldown).toBe(true);
   });
 
   it('503 dentro de um número maior NÃO é indisponibilidade', () => {
diff --git a/test/orquestrador-causas-adiamento.test.ts b/test/orquestrador-causas-adiamento.test.ts
new file mode 100644
index 0000000..8e8c2a0
--- /dev/null
+++ b/test/orquestrador-causas-adiamento.test.ts
@@ -0,0 +1,195 @@
+/**
+ * Peça 7b-2 · a tabela de causas do adiamento, na parte PURA (decisao.ts).
+ *
+ * O que muda, e o porquê de cada linha:
+ *   - COOLDOWN só para limite REMOTO (rate_limit, quota). Esperar 60 min só
+ *     ajuda quando quem recusou foi a API e a recusa tem prazo.
+ *   - 5xx e overloaded deixam de ser `rate_limit`: viram `servidor`, adiam e
+ *     NÃO armam cooldown (blip de API; o Comarka travou 3x assim em 03/09).
+ *   - crash de runner de gate (`gate_crash`) adia sem cooldown e sem retry:
+ *     em QUALQUER papel quando o runner não rodou (rc 126/127, command not
+ *     found, ENOENT do binário, Missing script, saída vazia com rc != 0); no
+ *     papel testes também quando não há placar nem linha de teste falhando.
+ *     Typecheck ou build que rodou e apontou erro de código segue mérito.
+ */
+import { describe, it, expect } from 'vitest';
+import {
+  decidirDesfecho,
+  detectarCausaInfra,
+  gateNaoRodou,
+  type DecisaoConfig,
+  type SinalTentativa,
+} from '../scripts/orquestrador/decisao.js';
+
+const CONFIG = {
+  executor_model: 'sonnet',
+  avaliador_model: 'opus',
+  retry_final_model: 'opus',
+  max_retries: 2,
+  diff_cap_linhas: 600,
+  worktrees_prefixo: 'fx-',
+  restricao_execucao: { ativa: false, tickets_permitidos: [], acao_ticket_fora_da_allowlist: 'x', recusa_exit_code: 78, recusa_mensagem: 'x' },
+  politica_adiamento: {
+    causas_que_adiam: [
+      'erro de conexão',
+      'sessão expirada',
+      'rate limit',
+      'quota estourada',
+      'timeout de claude_timeout_secs',
+      'gate interrompido no meio',
+      'veredito do juiz ilegível',
+    ],
+  },
+  politica_retry: {
+    por_causa: {
+      diff_cap: { modelo: 'MANTER', acao: 'x' },
+      enforcement: { modelo: 'MANTER', acao: 'x' },
+      criterio_qualidade: { modelo: 'ESCALAR', acao: 'x' },
+    },
+  },
+} as DecisaoConfig;
+
+const sinal = (s: Partial<SinalTentativa> = {}): SinalTentativa => ({ exitCode: 0, saida: '', diffLines: 10, ...s });
+
+/** Um gates.txt como o `gates.ts --run-cli` escreve. */
+function gatesTxt(linhaFalha: string, recorte: string, nome = 'test'): string {
+  return `ok   typecheck                 812ms\n${linhaFalha}\nVEREDITO: REPROVADO\n\n--- recorte de ${nome} ---\n${recorte}\n`;
+}
+
+describe('servidor (5xx/overloaded) sai de rate_limit', () => {
+  it('503, Service Unavailable, overloaded e 529 viram servidor', () => {
+    for (const saida of ['API Error: 503 Service Unavailable', 'Error: Service Unavailable', 'overloaded_error', 'API Error: 529 Overloaded', 'API Error: 500 Internal Server Error']) {
+      expect(detectarCausaInfra(sinal({ exitCode: 1, saida })), saida).toBe('servidor');
+    }
+  });
+
+  it('429 e rate limit continuam rate_limit', () => {
+    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'API Error: Request rejected (429) · rate_limit_error' }))).toBe('rate_limit');
+    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'Error: rate limit exceeded' }))).toBe('rate_limit');
+  });
+
+  it('503 dentro de número maior segue fora (borda de palavra)', () => {
+    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'gravou 15039 linhas' }))).toBeNull();
+  });
+});
+
+describe('cooldown só para limite remoto', () => {
+  const casos: Array<[string, Partial<SinalTentativa>, string, boolean]> = [
+    ['429', { exitCode: 1, saida: 'Request rejected (429)' }, 'rate_limit', true],
+    ['quota', { exitCode: 1, saida: 'usage limit reached' }, 'quota', true],
+    ['timeout', { exitCode: 124 }, 'timeout', false],
+    ['503', { exitCode: 1, saida: 'API Error: 503 Service Unavailable' }, 'servidor', false],
+    ['sessão', { exitCode: 1, saida: 'session expired, please log in again' }, 'sessao', false],
+    ['conexão', { exitCode: 1, saida: 'connect ECONNREFUSED 127.0.0.1:443' }, 'conexao', false],
+    ['morto por fora', { exitCode: 130 }, 'gate_interrompido', false],
+    ['juiz ilegível', { juizIlegivel: true }, 'juiz_ilegivel', false],
+  ];
+  for (const [nome, s, causa, cooldown] of casos) {
+    it(`${nome}: adiado por ${causa}, cooldown=${cooldown}, sem retry`, () => {
+      const v = decidirDesfecho(CONFIG, sinal(s));
+      expect(v.desfecho).toBe('adiado');
+      expect(v.causa).toBe(causa);
+      expect(v.cooldown).toBe(cooldown);
+      expect(v.contaComoRetry).toBe(false);
+    });
+  }
+
+  it('reprovado e aprovado não armam cooldown', () => {
+    expect(decidirDesfecho(CONFIG, sinal({ criteriosFalhos: ['x'] })).cooldown).toBe(false);
+    expect(decidirDesfecho(CONFIG, sinal()).cooldown).toBe(false);
+  });
+});
+
+describe('gateNaoRodou: o runner não rodou x o código está errado', () => {
+  it('testes sem placar e sem linha de teste falhando: crash', () => {
+    const g = gatesTxt('FALHA test                     95ms — exit 1', "Error: Cannot find module 'vitest/package.json'");
+    expect(gateNaoRodou(g, 'testes')).toBe(true);
+  });
+
+  it('testes com placar vermelho: mérito', () => {
+    const g = gatesTxt('FALHA test                   4012ms — exit 1', ' FAIL  test/a.test.ts > soma\nAssertionError: expected 2 to be 3\n Tests  1 failed | 3 passed (4)');
+    expect(gateNaoRodou(g, 'testes')).toBe(false);
+  });
+
+  it('testes com linha FAIL mas sem o resumo (recorte cortado): mérito', () => {
+    const g = gatesTxt('FALHA test                   4012ms — exit 1', ' FAIL  test/a.test.ts > soma\n × soma de negativos');
+    expect(gateNaoRodou(g, 'testes')).toBe(false);
+  });
+
+  it('placar do baseline na linha FALHA: mérito', () => {
+    const g = gatesTxt('FALHA testes_por_pacote      7951ms [8 pacotes, 861p/1f] — 1 teste(s) falhando', 'algo', 'testes_por_pacote');
+    expect(gateNaoRodou(g, 'testes')).toBe(false);
+  });
+
+  it('tsc ausente (rc 127, command not found): crash em typecheck', () => {
+    const g = gatesTxt('FALHA typecheck                12ms — exit 127', 'bash: tsc-que-nao-existe: command not found', 'typecheck');
+    expect(gateNaoRodou(g, 'typecheck')).toBe(true);
+  });
+
+  it('tsc que rodou e apontou erro de código: mérito', () => {
+    const g = gatesTxt('FALHA typecheck              2210ms — exit 2', "src/a.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'.", 'typecheck');
+    expect(gateNaoRodou(g, 'typecheck')).toBe(false);
+  });
+
+  it('rc 126 (sem permissão de execução): crash', () => {
+    const g = gatesTxt('FALHA build                     8ms — exit 126', 'bash: ./build.sh: Permission denied', 'build');
+    expect(gateNaoRodou(g, 'build')).toBe(true);
+  });
+
+  it('ENOENT do binário: crash', () => {
+    const g = gatesTxt('FALHA build                    40ms — exit 1', 'Error: spawn next ENOENT', 'build');
+    expect(gateNaoRodou(g, 'build')).toBe(true);
+  });
+
+  it('npm sem o script: crash', () => {
+    const g = gatesTxt('FALHA lint                    300ms — exit 1', 'npm error Missing script: "lint"', 'lint');
+    expect(gateNaoRodou(g, 'lint')).toBe(true);
+  });
+
+  it('saída vazia com rc != 0: crash em qualquer papel', () => {
+    const g = gatesTxt('FALHA typecheck                 5ms — exit 1', '', 'typecheck');
+    expect(gateNaoRodou(g, 'typecheck')).toBe(true);
+  });
+
+  it('build que rodou e falhou compilando: mérito', () => {
+    const g = gatesTxt('FALHA build                  9000ms — exit 1', 'Failed to compile.\n./src/a.ts:3:1 Type error: Cannot find name foo', 'build');
+    expect(gateNaoRodou(g, 'build')).toBe(false);
+  });
+
+  it('teste que rodou, falhou e imprimiu "command not found" no caminho: mérito', () => {
+    const g = gatesTxt('FALHA test                   3100ms — exit 1', ' FAIL  test/cli.test.ts > roda o binário\nsh: foo: command not found\n Tests  1 failed | 9 passed (10)');
+    expect(gateNaoRodou(g, 'testes')).toBe(false);
+  });
+
+  it('gates verdes: nunca crash', () => {
+    expect(gateNaoRodou('ok   typecheck  10ms\nok   test  20ms\nVEREDITO: APROVADO\n', 'testes')).toBe(false);
+  });
+});
+
+describe('gate_crash no desfecho', () => {
+  const crash = gatesTxt('FALHA test                     95ms — exit 1', "Error: Cannot find module 'vitest'");
+
+  it('adia sem cooldown e sem retry, mesmo com "gates reprovados" em criteriosFalhos', () => {
+    const v = decidirDesfecho(CONFIG, sinal({ gatesRc: 1, gatesSaida: crash, gatePapelFalho: 'testes', criteriosFalhos: ['gates reprovados'] }));
+    expect(v.desfecho).toBe('adiado');
+    expect(v.causa).toBe('gate_crash');
+    expect(v.cooldown).toBe(false);
+    expect(v.contaComoRetry).toBe(false);
+  });
+
+  it('enforcement violado ganha do crash (fronteira é certeza, crash é ambiente)', () => {
+    const v = decidirDesfecho(CONFIG, sinal({ gatesRc: 1, gatesSaida: crash, gatePapelFalho: 'testes', enforcementViolado: true }));
+    expect(v.desfecho).toBe('refatiar');
+  });
+
+  it('tirar "gate interrompido" de causas_que_adiam desliga o gate_crash junto', () => {
+    const cfg = { ...CONFIG, politica_adiamento: { causas_que_adiam: ['rate limit'] } } as DecisaoConfig;
+    const v = decidirDesfecho(cfg, sinal({ gatesRc: 1, gatesSaida: crash, gatePapelFalho: 'testes', criteriosFalhos: ['gates reprovados'] }));
+    expect(v.desfecho).toBe('reprovado');
+  });
+
+  it('tirar "rate limit" desliga o servidor junto (os dois vieram do mesmo rótulo)', () => {
+    const cfg = { ...CONFIG, politica_adiamento: { causas_que_adiam: ['timeout'] } } as DecisaoConfig;
+    expect(decidirDesfecho(cfg, sinal({ exitCode: 1, saida: 'API Error: 503 Service Unavailable' })).desfecho).toBe('reprovado');
+  });
+});
diff --git a/test/orquestrador-decisao.test.ts b/test/orquestrador-decisao.test.ts
index 9aaee0f..300ea06 100644
--- a/test/orquestrador-decisao.test.ts
+++ b/test/orquestrador-decisao.test.ts
@@ -110,12 +110,15 @@ describe('restricao_execucao — papel pendente bloqueia, papel definido libera'
 // ─── 2 · fronteira adiar vs reprovar ───────────────────────────────────────
 
 describe('fronteira — infra ADIA, mérito REPROVA', () => {
-  // 7 desde a peça 1 da sessão B: 'veredito do juiz ilegível' entrou em
+  // 7 rótulos desde a peça 1 da sessão B: 'veredito do juiz ilegível' entrou em
   // causas_que_adiam para que o config siga sendo a AUTORIDADE — tirar o rótulo
   // de lá desliga o adiamento por juiz ilegível junto com os outros.
-  it('as 7 causas do config são reconhecidas', () => {
+  // Peça 7b-2: os mesmos 7 rótulos ligam 9 causas. `servidor` (5xx) vem do
+  // rótulo "rate limit" e `gate_crash` do "gate interrompido"; as 7 de antes
+  // continuam todas lá.
+  it('os 7 rótulos do config ligam as 9 causas', () => {
     expect([...causasDeAdiamentoDoConfig(cfg)].sort()).toEqual(
-      ['conexao', 'gate_interrompido', 'juiz_ilegivel', 'quota', 'rate_limit', 'sessao', 'timeout'].sort(),
+      ['conexao', 'gate_crash', 'gate_interrompido', 'juiz_ilegivel', 'quota', 'rate_limit', 'servidor', 'sessao', 'timeout'].sort(),
     );
   });
 
diff --git a/test/orquestrador-isolamento-teste.test.ts b/test/orquestrador-isolamento-teste.test.ts
index 9c21b1f..8d06a2e 100644
--- a/test/orquestrador-isolamento-teste.test.ts
+++ b/test/orquestrador-isolamento-teste.test.ts
@@ -31,6 +31,9 @@ const SCRIPTS = [
   'test-ocioso.sh',
   'test-rc-executor.sh',
   'test-ambiente.sh',
+  // etapa 7b: o executor de verdade num repo de fixture (test-fixture-executor.sh)
+  'test-causa-adiamento.sh',
+  'test-ambiente-adiado.sh',
 ];
 
 /**
diff --git a/test/orquestrador-tools-derivadas.test.ts b/test/orquestrador-tools-derivadas.test.ts
index d7f5651..d0f79d1 100644
--- a/test/orquestrador-tools-derivadas.test.ts
+++ b/test/orquestrador-tools-derivadas.test.ts
@@ -215,10 +215,13 @@ describe('morte inesperada do executor deixa rastro (peça 0c, item 3)', () => {
   it('todo caminho de desfecho nomeado marca DESFECHO_NOMEADO', () => {
     // adiado, aprovado, refatiar, bloqueado, recusado e orçamento — seis. O
     // sétimo é o trap de sinal (peça 12), que marca para o trap de EXIT não
-    // registrar a mesma morte duas vezes: uma morte, um registro.
+    // registrar a mesma morte duas vezes: uma morte, um registro. O oitavo é a
+    // recusa de preflight (peça 7b-2), que virou ADIADO motivo=preflight em vez
+    // de EXECUTOR_MORREU.
     const n = (exec.match(/DESFECHO_NOMEADO=1/g) ?? []).length;
-    expect(n).toBe(7);
+    expect(n).toBe(8);
     expect(/trap_sinal\(\) \{[\s\S]*?\n\}/.exec(exec)![0]).toContain('DESFECHO_NOMEADO=1');
+    expect(/preflight_ou_adia\(\) \{[\s\S]*?\n\}/.exec(exec)![0]).toContain('DESFECHO_NOMEADO=1');
   });
 
   it('a fase é gravada em variável, não só no snapshot', () => {
```

## 7b-3 · teto de adiamentos consecutivos

sha: `dd3ecd7`

### Vermelho

Duas correções no PRÓPRIO teste depois desta rodada, antes do verde: o caso 'x' do limite inválido passava jq inválido (virou `"x"`), e o caso F abria 901 e 902 juntos, o que já é AMBIENTE no primeiro disparo (o 902 passou a ser reaberto depois). No verde, uma terceira: o padrão da trilha no caso A pedia dois espaços entre `rc=124` e `dur=`.

```
== A. executor real: rc 124 em 0 s com timeout de 30 s não é timeout ==
  trilha: 901 ADIADO motivo=timeout attempt=1 rc=124 dur=0s cooldown=nao
  FALHA rotulou como timeout uma execução de 0 s
  FALHA sem a medida na trilha
  nota: adiado (executor) por infraestrutura: timeout em 2026-09-21T16:18:18Z — retomará no próximo disparo
  FALHA a nota diz timeout

== B. sempre adiado: bloqueia no 4º disparo com a causa real ==
  --- disparo 1 (adia): 901=pendente/
  --- disparo 2 (adia): 901=pendente/
  --- disparo 3 (adia): 901=pendente/
  FALHA contador=''
  ok    abaixo do limite, segue pendente
  --- disparo 4 (adia): 901=pendente/
  FALHA esperava bloqueado, está pendente
  nota: 
  FALHA nota fora do formato
  FALHA nota sem a medida
  FALHA sem BLOQUEADO motivo=adiamentos
  ok    bloqueio commitado
  FALHA último commit: fixture: fila inicial
  ok    contador zerado ao bloquear

== C. adiado que depois aprova zera o contador ==
  --- disparo 5 (adia): 901=pendente/
  --- disparo 6 (adia): 901=pendente/
  FALHA contador=''
  --- disparo 7 (aprova): 901=done/
  ok    aprovado e mergeado
  ok    contador zerado pela aprovação
  --- disparo 8 (adia): 901=pendente/
  FALHA contador=''

== D. adiamento COM cooldown não conta nem zera ==
  --- disparo 9 (limite): 901=pendente/
  FALHA contador=''

== E. o limite vem do config ==
  --- disparo 10 (adia): 901=pendente/
  FALHA status=pendente contador=''
  FALHA sem n=2 limite=2
  FALHA limite inválido (x) virou ''
  FALHA limite inválido (0) virou ''
  FALHA limite inválido (-3) virou ''
  FALHA limite inválido ("quatro") virou ''
scripts/orquestrador/test-adiamentos-limite.sh: line 129: adiamentos_limite: command not found
scripts/orquestrador/test-adiamentos-limite.sh: line 129: adiamentos_limite: command not found
  FALHA limite ausente virou ''

== F. AMBIENTE desfaz o que somou na drenagem ==
  --- disparo 11 (adia): 901=pendente/
  FALHA 901=''
  --- disparo 12 (mesmo): 901=pendente/
  ok    um AMBIENTE
  FALHA 901='' 902=''

21 CHECK(S) FALHARAM
rc=1
```

### Verde

```
== A. executor real: rc 124 em 0 s com timeout de 30 s não é timeout ==
  trilha: 901 ADIADO motivo=gate_interrompido attempt=1 rc=124 dur=0s cooldown=nao
  ok    ADIADO, e não com motivo=timeout
  ok    a trilha traz a medida (rc=124, duração real)
  nota: adiado (executor) por infraestrutura: gate_interrompido (rc=124 em 0s, abaixo do limite de 30s: morto por fora) em 2026-09-21T16:20:45Z — retomará no próximo disparo
  ok    a nota traz rc=124 e não diz timeout

== B. sempre adiado: bloqueia no 4º disparo com a causa real ==
  --- disparo 1 (adia): 901=pendente/1
  --- disparo 2 (adia): 901=pendente/2
  --- disparo 3 (adia): 901=pendente/3
  ok    contador em 3 depois de 3 disparos
  ok    abaixo do limite, segue pendente
  --- disparo 4 (adia): 901=bloqueado/
  ok    bloqueado no 4º disparo
  nota: adiado 4 vezes: gate_interrompido (rc=124, 9s de execução)
  ok    nota começa por 'adiado 4 vezes: '
  ok    a causa é a medida: motivo, rc=124 e 9s
  ok    trilha: BLOQUEADO motivo=adiamentos n=4 limite=4
  ok    bloqueio commitado
  ok    commit do bloqueio
  ok    contador zerado ao bloquear

== C. adiado que depois aprova zera o contador ==
  --- disparo 5 (adia): 901=pendente/1
  --- disparo 6 (adia): 901=pendente/2
  ok    2 adiamentos contados
  --- disparo 7 (aprova): 901=done/
  ok    aprovado e mergeado
  ok    contador zerado pela aprovação
  --- disparo 8 (adia): 901=pendente/1
  ok    recomeça em 1, não em 3

== D. adiamento COM cooldown não conta nem zera ==
  --- disparo 9 (limite): 901=pendente/1
  ok    contador segue 1

== E. o limite vem do config ==
  --- disparo 10 (adia): 901=bloqueado/
  ok    com limite 2, bloqueia no 2º
  ok    trilha diz n=2 limite=2
  ok    limite inválido ("x") vira 4
  ok    limite inválido (0) vira 4
  ok    limite inválido (-3) vira 4
  ok    limite inválido ("quatro") vira 4
  ok    limite ausente vira 4

== F. AMBIENTE desfaz o que somou na drenagem ==
  --- disparo 11 (adia): 901=pendente/1
  ok    901 em 1 (antes do ambiente)
  --- disparo 12 (mesmo): 901=pendente/1
  ok    um AMBIENTE
  ok    901 volta a 1 e 902 não soma

TODOS OS CHECKS PASSARAM
rc=0
```

### Diff

```
commit dd3ecd7ecbbb91f7c05ac53b85a6c6f5c3ce44ea
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Mon Sep 21 13:22:22 2026 -0300

    7b-3: teto de adiamentos consecutivos, com a causa real
    
    - local-loop.sh: contador persistente runs/<id>/.adiamentos (mesmo formato do
      .sem-progresso, via contador_incrementar/contador_desfazer); conta o ADIADO
      sem cooldown; com cooldown não conta nem zera; zera ao sair de pendente ou
      com a branch alvo avançando; no limite bloqueia no fim da drenagem com
      notas_status "adiado N vezes: <causa real>", ticket_commit e BLOQUEADO
      motivo=adiamentos n= limite=; AMBIENTE desfaz o que somou.
    - adiamentos_limite (padrão 4) em config-chaves.ts e no template.
    - decisao.ts: rc 124 abaixo do teto medido é gate_interrompido (morto por
      fora), não timeout; o motivo do adiado traz rc e duração.
    - executor.sh: duracaoSecs e timeoutSecs no sinal.
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
---
 doutrina/templates/config.json                 |   2 +
 scripts/kit/test-shell.sh                      |   3 +-
 scripts/orquestrador/config-chaves.ts          |   1 +
 scripts/orquestrador/decisao.ts                |  39 ++++++-
 scripts/orquestrador/executor.sh               |   8 +-
 scripts/orquestrador/local-loop.sh             |  96 +++++++++++++++--
 scripts/orquestrador/test-adiamentos-limite.sh | 144 +++++++++++++++++++++++++
 test/orquestrador-causas-adiamento.test.ts     |  21 ++++
 test/orquestrador-isolamento-teste.test.ts     |   1 +
 9 files changed, 304 insertions(+), 11 deletions(-)

diff --git a/doutrina/templates/config.json b/doutrina/templates/config.json
index 3c97f62..ea0f144 100644
--- a/doutrina/templates/config.json
+++ b/doutrina/templates/config.json
@@ -12,6 +12,8 @@
   "_cooldown": "Adiamento por limite (rate limit/quota/timeout/orçamento) grava runs/.cooldown-until. NÃO conta como retry; status volta a pendente.",
   "sem_progresso_limite": 3,
   "_sem_progresso_limite": "Peça 7a-3 (local-loop.sh:160). Disparos seguidos em que o ticket segue pendente sem cooldown e sem a branch alvo andar, contados em runs/<id>/.sem-progresso. No limite o ticket vai para bloqueado, commitado, com a última causa em notas_status, e a trilha ganha BLOQUEADO motivo=sem_progresso. Adiamento não conta; sair de pendente ou a branch alvo avançar zera. Ausente ou inválida = 3.",
+  "adiamentos_limite": 4,
+  "_adiamentos_limite": "Peça 7b-3 (local-loop.sh:adiamentos_limite). Adiamentos SEM cooldown seguidos (timeout, 5xx, sessão, gate que não rodou, recusa de preflight), contados em runs/<id>/.adiamentos. No limite o ticket vai para bloqueado, commitado, com notas_status 'adiado N vezes: <causa real>' (a medida do último ADIADO: motivo, rc e duração, ou a causa do preflight), e a trilha ganha BLOQUEADO motivo=adiamentos. Adiado com cooldown (rate_limit, quota) não conta nem zera; sair de pendente ou a branch alvo avançar zera. Ausente ou inválida = 4.",
   "migrations_dir": "<ex: supabase/migrations | db/migrations>",
   "worktrees_dir": "../_worktrees",
   "runs_dir": "docs/fila/runs",
diff --git a/scripts/kit/test-shell.sh b/scripts/kit/test-shell.sh
index c2292ba..bfed4d4 100644
--- a/scripts/kit/test-shell.sh
+++ b/scripts/kit/test-shell.sh
@@ -25,6 +25,7 @@
 # (test-fixture-executor.sh); zero modelo, zero rede:
 #   test-causa-adiamento.sh         a tabela de causas: cooldown só para limite remoto (7b-2)
 #   test-ambiente-adiado.sh         a régua de AMBIENTE vale sobre o ADIADO sem cooldown (7b-2)
+#   test-adiamentos-limite.sh       teto de adiamentos seguidos, com a causa real na nota (7b-3)
 #
 # Cada um monta o PRÓPRIO `ORQ_EXEC_ROOT` num `mktemp -d` (drenagem e retry) ou
 # trabalha direto no checkout (lib-config); nada aqui precisa exportar
@@ -40,7 +41,7 @@
 set -uo pipefail
 
 KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
-SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh'
+SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh test-adiamentos-limite.sh'
 
 FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
   printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
diff --git a/scripts/orquestrador/config-chaves.ts b/scripts/orquestrador/config-chaves.ts
index f257830..872f5d8 100644
--- a/scripts/orquestrador/config-chaves.ts
+++ b/scripts/orquestrador/config-chaves.ts
@@ -70,6 +70,7 @@ export const CHAVES_CONFIG: ChaveConfig[] = [
   { chave: 'politica_retry.por_causa', onde: 'decisao.ts:277', obrigatoria: true },
   { chave: 'cooldown_minutes', onde: 'lib.sh:572', obrigatoria: false, nota: 'default 60 no código' },
   { chave: 'sem_progresso_limite', onde: 'local-loop.sh:160', obrigatoria: false, nota: 'peça 7a-3: disparos seguidos sem progresso até bloquear o ticket; ausente ou inválida = 3 no código' },
+  { chave: 'adiamentos_limite', onde: 'local-loop.sh:adiamentos_limite', obrigatoria: false, nota: 'peça 7b-3: adiamentos seguidos sem cooldown até bloquear o ticket com a causa real; ausente ou inválida = 4 no código' },
   { chave: 'worktrees_prefixo', onde: 'lib.sh:498, decisao.ts:363', obrigatoria: true, nota: 'prefixo diferente por repo é o que impede colisão de worktree' },
   { chave: 'restricao_execucao', onde: 'decisao.ts:71, executor.sh:156', obrigatoria: false, nota: 'inativa quando ausente' },
   { chave: 'sql_pendente_dir', onde: 'enforcement-core.ts:128, executor.sh:359', obrigatoria: false, nota: 'só importa em repo com banco' },
diff --git a/scripts/orquestrador/decisao.ts b/scripts/orquestrador/decisao.ts
index e0d47e4..285b4ee 100644
--- a/scripts/orquestrador/decisao.ts
+++ b/scripts/orquestrador/decisao.ts
@@ -163,6 +163,15 @@ export interface SinalTentativa {
   gatesRc?: number
   gatesSaida?: string
   gatePapelFalho?: string
+  /**
+   * Peça 7b-3 · a MEDIDA: quanto a chamada do agente durou de verdade e qual é
+   * o teto (`claude_timeout_secs`). Um rc 124 bem abaixo do teto não é o
+   * watchdog cortando: é o processo morto por fora (pkill, sono, outro
+   * `timeout`). No Comarka, o 315a foi rotulado "timeout 1500s" numa execução
+   * de 9 s, oito vezes seguidas.
+   */
+  duracaoSecs?: number
+  timeoutSecs?: number
   /**
    * true quando o juiz (passo 7) NÃO produziu veredito legível — resposta
    * ilegível, ou a chamada do juiz caiu em limite/timeout. Nos dois casos não
@@ -237,13 +246,39 @@ function houveGateCrash(sinal: SinalTentativa): boolean {
   return gateNaoRodou(sinal.gatesSaida, sinal.gatePapelFalho ?? '')
 }
 
+/**
+ * rc 124 é timeout só quando a duração medida alcançou o teto. Sem a medida
+ * (chamador antigo, teste de unidade), vale o rc, como sempre valeu.
+ */
+function cortadoPeloRelogio(sinal: SinalTentativa): boolean {
+  const d = sinal.duracaoSecs
+  const t = sinal.timeoutSecs
+  if (typeof d !== 'number' || typeof t !== 'number' || !(t > 0)) return true
+  return d >= t
+}
+
+/**
+ * A causa em texto, com a MEDIDA ao lado do rótulo (peça 7b-3). É o que vai para
+ * `notas_status` via mark_adiado e, no teto de adiamentos, para a nota do
+ * bloqueio: "rc=124 em 9s" diz o que aconteceu; "timeout" sozinho só repetia o
+ * rótulo.
+ */
+function motivoInfra(infra: CausaInfra, sinal: SinalTentativa): string {
+  if (typeof sinal.duracaoSecs !== 'number') return `infraestrutura: ${infra}`
+  const medida = `rc=${sinal.exitCode} em ${sinal.duracaoSecs}s`
+  if (sinal.exitCode === 124 && infra === 'gate_interrompido') {
+    return `infraestrutura: ${infra} (${medida}, abaixo do limite de ${sinal.timeoutSecs}s: morto por fora)`
+  }
+  return `infraestrutura: ${infra} (${medida})`
+}
+
 /** Detecta causa de INFRA. null quando nada de infra aconteceu. */
 export function detectarCausaInfra(sinal: SinalTentativa): CausaInfra | null {
   // ANTES do curto-circuito de exitCode===0: o juiz roda DEPOIS de o agente
   // sair com rc=0, então a tentativa inteira é bem-sucedida e o único sinal de
   // que não houve veredito é este campo.
   if (sinal.juizIlegivel) return 'juiz_ilegivel'
-  if (sinal.exitCode === 124) return 'timeout'
+  if (sinal.exitCode === 124) return cortadoPeloRelogio(sinal) ? 'timeout' : 'gate_interrompido'
   if (sinal.exitCode === 129 || sinal.exitCode === 130) return 'gate_interrompido'
   if (sinal.gateInterrompido) return 'gate_interrompido'
   // Gate duplo: texto só conta quando a chamada de fato falhou. Um ticket que
@@ -287,7 +322,7 @@ export function decidirDesfecho(config: DecisaoConfig, sinal: SinalTentativa): V
   const adia = causasDeAdiamentoDoConfig(config)
   const infra = detectarCausaInfra(sinal)
   if (infra && adia.has(infra)) {
-    return { desfecho: 'adiado', causa: infra, motivo: `infraestrutura: ${infra}`, contaComoRetry: false, cooldown: armaCooldown(infra) }
+    return { desfecho: 'adiado', causa: infra, motivo: motivoInfra(infra, sinal), contaComoRetry: false, cooldown: armaCooldown(infra) }
   }
   if (sinal.diffLines > config.diff_cap_linhas) {
     return {
diff --git a/scripts/orquestrador/executor.sh b/scripts/orquestrador/executor.sh
index d328e92..c4c920a 100755
--- a/scripts/orquestrador/executor.sh
+++ b/scripts/orquestrador/executor.sh
@@ -870,13 +870,19 @@ run_attempt() {
   # criteriosFalhos. Como critério, ele virava causa criterio_qualidade e ESCALAVA
   # o modelo — e violação de fronteira não é falha de capacidade. Gate reprovado
   # segue como critério: aí a falha é de qualidade mesmo.
+  # Peça 7b-3: o teto do relógio vai junto com a duração medida, para que o
+  # decisao.ts diga "timeout" só quando a chamada de fato chegou nele.
+  local tout; tout="$(cfg '.claude_timeout_secs')"
+  case "$tout" in ''|null|*[!0-9]*) tout=null ;; esac
   sinal="$(jq -n --argjson e "${rc:-0}" --arg s "$(tail -c 4000 "$saida" 2>/dev/null || true)" \
     --argjson d "$DIFF_LINES" --argjson gi "$(grep -qi 'reexecutar' "$rundir/gates.txt" && echo true || echo false)" \
     --argjson enf "$([ "$ENF_OK" = 0 ] && echo true || echo false)" \
     --argjson cf "$(printf '%s' "$CRITERIOS_FALHOS" | jq -Rn '[inputs | select(length>0)]')" \
     --argjson grc "$gates_rc" --arg gs "$(head -c 20000 "$rundir/gates.txt" 2>/dev/null || true)" --arg gp "$papel_falho" \
+    --argjson dur "$DUR" --argjson tout "$tout" \
     '{exitCode:$e, saida:$s, diffLines:$d, gateInterrompido:$gi, enforcementViolado:$enf, criteriosFalhos:$cf,
-      gatesRc:$grc, gatesSaida:$gs, gatePapelFalho:$gp}')"
+      gatesRc:$grc, gatesSaida:$gs, gatePapelFalho:$gp, duracaoSecs:$dur}
+     + (if $tout == null then {} else {timeoutSecs:$tout} end)')"
   if [ "$gates_rc" != 0 ]; then
     sinal="$(printf '%s' "$sinal" | jq '.criteriosFalhos += ["gates reprovados"]')"
   fi
diff --git a/scripts/orquestrador/local-loop.sh b/scripts/orquestrador/local-loop.sh
index 051abe2..8889e73 100755
--- a/scripts/orquestrador/local-loop.sh
+++ b/scripts/orquestrador/local-loop.sh
@@ -137,9 +137,14 @@ sem_progresso_arquivo() { printf '%s/%s/.sem-progresso\n' "$RUNS_BASE" "$1"; }
 sem_progresso_zerar()   { rm -f "$(sem_progresso_arquivo "$1")" 2>/dev/null || true; }
 
 # sem_progresso_incrementar <id> -> imprime "N|primeira|ultima" já gravado.
-sem_progresso_incrementar() {
-  local f n=0 primeira agora linha
-  f="$(sem_progresso_arquivo "$1")"; agora="$(ts)"; primeira="$agora"
+sem_progresso_incrementar() { contador_incrementar "$(sem_progresso_arquivo "$1")"; }
+
+# contador_incrementar <arquivo> -> soma 1 no contador "N|primeira|ultima" do
+# arquivo e imprime a linha gravada. É o mesmo formato para os dois contadores
+# persistentes da drenagem: .sem-progresso (7a-3) e .adiamentos (7b-3).
+contador_incrementar() {
+  local f="$1" n=0 primeira agora linha
+  agora="$(ts)"; primeira="$agora"
   if [ -f "$f" ]; then
     linha="$(head -1 "$f" 2>/dev/null || true)"
     n="${linha%%|*}"; primeira="$(printf '%s' "$linha" | cut -d'|' -f2)"
@@ -226,6 +231,47 @@ sem_progresso_causa() {
   uma_linha "$(printf '%s' "$c" | tr -d '\r')" 300
 }
 
+# --- TETO DE ADIAMENTOS CONSECUTIVOS (peça 7b-3) -----------------------------
+# Adiamento não tinha teto. No Comarka o 315a foi adiado 8 vezes seguidas, cerca
+# de 3 h de modelo, e a nota dizia "timeout 1500s" numa execução de 9 s. Este
+# contador PERSISTE entre disparos em runs/<id>/.adiamentos ("N|primeira|
+# ultima") e, no limite, BLOQUEIA o ticket com a causa REAL: a medida do último
+# ADIADO (motivo, rc e duração, ou a causa do preflight), nunca só o rótulo.
+#
+# Conta: o ADIADO sem cooldown. NÃO conta nem zera: o adiado COM cooldown
+# (rate_limit, quota), que é o limite da conta e não do ticket; com cooldown a
+# drenagem para no primeiro, e o primeiro pendente em ordem acumularia sozinho.
+# Zera: o ticket sair de pendente (aprovado, bloqueado, refatiar) ou a branch
+# alvo avançar na vez dele. Limite: `adiamentos_limite` do config, 4 quando
+# ausente ou inválido. Como o sem-progresso, o bloqueio espera o fim da
+# drenagem e não vale se ela terminar em AMBIENTE (7a-8).
+adiamentos_arquivo() { printf '%s/%s/.adiamentos\n' "$RUNS_BASE" "$1"; }
+adiamentos_zerar()   { rm -f "$(adiamentos_arquivo "$1")" 2>/dev/null || true; }
+
+# adiamentos_limite -> inteiro >= 1; 4 quando a chave falta ou é inválida.
+adiamentos_limite() {
+  local l
+  l="$(cfg '.adiamentos_limite // empty' 2>/dev/null || true)"
+  case "$l" in ''|*[!0-9]*|0) l=4 ;; esac
+  printf '%s\n' "$l"
+}
+
+# causa_real_do_adiado <eventos> -> a medida do último ADIADO destes eventos:
+#   "preflight: <causa>"                      (recusa de preflight)
+#   "<motivo> (rc=<rc>, <dur> de execução)"   (qualquer outro)
+causa_real_do_adiado() {
+  local ult campos m rc dur c
+  ult="$(printf '%s\n' "$1" | awk '$3 == "ADIADO"' | tail -1)"
+  [ -n "$ult" ] || { printf 'adiado sem evento na trilha'; return 0; }
+  campos=" $(printf '%s' "$ult" | cut -d' ' -f4-) "
+  m="$(printf '%s' "$campos" | sed -n 's/.* motivo=\([^ ]*\) .*/\1/p')"
+  rc="$(printf '%s' "$campos" | sed -n 's/.* rc=\([^ ]*\) .*/\1/p')"
+  dur="$(printf '%s' "$campos" | sed -n 's/.* dur=\([^ ]*\) .*/\1/p')"
+  c="$(printf '%s' "$campos" | sed -n 's/.* causa=\(.*\) $/\1/p')"
+  if [ -n "$c" ]; then printf '%s: %s' "${m:-adiado}" "$c"
+  else printf '%s (rc=%s, %s de execução)' "${m:-adiado}" "${rc:-?}" "${dur:-?}"; fi
+}
+
 # --- AMBIENTE NÃO BLOQUEIA A FILA (peça 7a-8) --------------------------------
 # Uma recusa de preflight (árvore suja, lock de git, identidade) mata o executor
 # para TODO ticket, igual. Sem esta peça cada drenagem somava +1 em todos os
@@ -255,11 +301,15 @@ causa_normalizada() {
 # sem_progresso_desfazer <backup> -> devolve cada contador somado nesta
 # drenagem ao que era antes. Backup: uma linha "<id><TAB><linha anterior>" por
 # ticket, linha anterior vazia = o arquivo não existia.
-sem_progresso_desfazer() {
-  local bid blinha f
+sem_progresso_desfazer() { contador_desfazer "$1" .sem-progresso; }
+
+# contador_desfazer <backup> <nome-do-arquivo> -> o mesmo, para qualquer um dos
+# contadores em runs/<id>/<nome-do-arquivo>.
+contador_desfazer() {
+  local bid blinha f nome="$2"
   while IFS=$'\t' read -r bid blinha <&3; do
     [ -n "$bid" ] || continue
-    f="$(sem_progresso_arquivo "$bid")"
+    f="$RUNS_BASE/$bid/$nome"
     escrita_de_teste_permitida "$f" || continue
     if [ -z "$blinha" ]; then rm -f "$f" 2>/dev/null || true
     else printf '%s\n' "$blinha" > "$f" 2>/dev/null || true; fi
@@ -338,6 +388,9 @@ drenar() {
   # backup dos contadores somados, e os bloqueios que esperam o fim da drenagem
   # (só valem se ela não terminar em ambiente).
   local causas_vistas='' sp_backup='' a_bloquear='' norm outro ambiente_causa='' adiado=0
+  # Peça 7b-3: o mesmo par (backup, bloqueios que esperam o fim) para o
+  # contador de adiamentos.
+  local ad_backup='' a_bloquear_ad='' ad
   local bid bfile bsp blim bcausa
   stwt="$(ensure_staging_worktree)"
   t0="$(date +%s)"
@@ -440,6 +493,7 @@ drenar() {
     # no limite o ticket vai para bloqueado. Saiu de pendente: contador zera.
     if [ "$(ticket_field "$prox" '.status')" != "pendente" ]; then
       sem_progresso_zerar "$prox_id"
+      adiamentos_zerar "$prox_id"
     elif ! cooldown_active; then
       evs="$(eventos_do_ticket_desde "$ev_antes" "$prox_id")"
       nota_depois="$(ticket_field "$prox" '.notas_status // ""')"
@@ -449,6 +503,7 @@ drenar() {
         # houve progresso. Não entra na memória e o contador zera.
         say "  $BRANCH_ALVO avançou na vez de $prox_id (${sha_antes:0:8} -> ${sha_depois:0:8}) — conta como progresso; contador zerado"
         sem_progresso_zerar "$prox_id"
+        adiamentos_zerar "$prox_id"
       else
         adiado=0
         foi_adiado "$evs" "$nota_antes" "$nota_depois" && adiado=1
@@ -467,7 +522,8 @@ drenar() {
         outro="$(printf '%s\n' "$causas_vistas" | awk -F'\t' -v c="$norm" -v id="$prox_id" '$2 == c && $1 != id { print $1; exit }')"
         if [ -n "$outro" ]; then
           sem_progresso_desfazer "$sp_backup"
-          sp_backup=''; a_bloquear=''; sem_progresso=0
+          contador_desfazer "$ad_backup" .adiamentos
+          sp_backup=''; a_bloquear=''; sem_progresso=0; ad_backup=''; a_bloquear_ad=''
           tentados="$tentados$prox_id "
           [ "$adiado" = 0 ] || adiados=$((adiados + 1))
           event '---' AMBIENTE "tickets=$outro,$prox_id" "causa=$norm"
@@ -483,6 +539,16 @@ drenar() {
           adiados_sc="$adiados_sc$prox_id "
           adiados=$((adiados + 1))
           say "  ticket $prox_id adiado sem cooldown — não conta como sem progresso; segue para o próximo não tentado. Causa: $causa"
+          # Peça 7b-3: soma no contador de adiamentos; no limite, bloqueia no fim.
+          ad_backup="$ad_backup$prox_id"$'\t'"$(head -1 "$(adiamentos_arquivo "$prox_id")" 2>/dev/null || true)"$'\n'
+          ad="$(contador_incrementar "$(adiamentos_arquivo "$prox_id")")"
+          n="${ad%%|*}"; lim="$(adiamentos_limite)"
+          if [ "$n" -ge "$lim" ]; then
+            a_bloquear_ad="$a_bloquear_ad$prox_id"$'\t'"$prox"$'\t'"$ad"$'\t'"$lim"$'\t'"$(causa_real_do_adiado "$evs")"$'\n'
+            say "  ticket $prox_id atingiu o limite de adiamentos ($n/$lim) — bloqueia no fim da drenagem, se ela não terminar em ambiente"
+          else
+            say "  ticket $prox_id adiado $n/$lim vez(es) seguidas"
+          fi
         else
           sp_backup="$sp_backup$prox_id"$'\t'"$(head -1 "$(sem_progresso_arquivo "$prox_id")" 2>/dev/null || true)"$'\n'
           sp="$(sem_progresso_incrementar "$prox_id")"
@@ -518,6 +584,22 @@ drenar() {
     bloqueados=$((bloqueados + 1))
   done 3<<EOF
 $a_bloquear
+EOF
+  # Os bloqueios por adiamentos (7b-3), com a mesma regra: só se a drenagem não
+  # terminou em ambiente. A nota é a causa REAL, a medida do último ADIADO.
+  while IFS=$'\t' read -r bid bfile bsp blim bcausa <&3; do
+    [ -n "$bid" ] || continue
+    n="${bsp%%|*}"
+    ticket_set "$bfile" '.status = "bloqueado" | .notas_status = $n' --arg n "adiado $n vezes: $bcausa"
+    ticket_commit "$bfile" "fila: $bid bloqueado (adiamentos, $n disparos)"
+    event "$bid" BLOQUEADO "motivo=adiamentos" "n=$n" "limite=$blim"
+    status_set "ultimo=$bid BLOQUEADO $(date '+%H:%M:%S') (adiado $n vezes)"
+    adiamentos_zerar "$bid"
+    sem_progresso_zerar "$bid"
+    say "  ADIAMENTOS: $bid bloqueado após $n adiamentos seguidos; causa real: $bcausa"
+    bloqueados=$((bloqueados + 1))
+  done 3<<EOF
+$a_bloquear_ad
 EOF
   dur=$(( ($(date +%s) - t0 + 30) / 60 ))
   say "drenagem encerrada: $drenados aprovado(s) e mergeado(s)"
diff --git a/scripts/orquestrador/test-adiamentos-limite.sh b/scripts/orquestrador/test-adiamentos-limite.sh
new file mode 100644
index 0000000..97e1cb8
--- /dev/null
+++ b/scripts/orquestrador/test-adiamentos-limite.sh
@@ -0,0 +1,144 @@
+#!/usr/bin/env bash
+# test-adiamentos-limite.sh · teto de adiamentos consecutivos (peça 7b-3).
+#
+# O caso que originou a peça: no Comarka, o 315a foi adiado 8 vezes seguidas,
+# cerca de 3 h de modelo, e o rótulo dizia "timeout 1500s" numa execução de
+# 9 s. Adiamento não tinha teto, e a causa escrita era o RÓTULO, não a medida.
+#
+#   A. executor real: rc 124 em 0 s com timeout de 30 s NÃO é timeout; a trilha
+#      e a nota trazem a medida (rc e duração).
+#   B. drenagem: o mesmo ticket adiado em todo disparo bloqueia no 4º, com
+#      notas_status "adiado 4 vezes: <causa real>", commit e BLOQUEADO
+#      motivo=adiamentos.
+#   C. adiado que depois aprova zera o contador.
+#   D. adiamento COM cooldown (limite remoto) não conta nem zera.
+#   E. o limite vem do config (adiamentos_limite), 4 quando ausente ou inválido.
+#   F. AMBIENTE (mesma causa em dois tickets) desfaz o que somou na drenagem.
+#
+# Uso: bash scripts/orquestrador/test-adiamentos-limite.sh
+
+set -uo pipefail
+AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
+
+export ORQ_TESTE=1
+ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
+TMP="$(dirname "$ORQ_EXEC_ROOT")"
+# shellcheck source=test-fixture-executor.sh
+source "$AQUI/test-fixture-executor.sh"
+trap 'fxe_limpa; rm -rf "$TMP"' EXIT
+
+FALHAS=0
+ok()    { printf '  ok    %s\n' "$*"; }
+falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
+
+echo "== A. executor real: rc 124 em 0 s com timeout de 30 s não é timeout =="
+fxe_novo '.claude_timeout_secs = 30'; fxe_claude rc124; fxe_roda
+ev="$(fxe_eventos | grep ' 901 ADIADO ' || true)"
+echo "  trilha: ${ev#* }"
+case "$ev" in *" motivo=timeout "*) falha "rotulou como timeout uma execução de 0 s" ;; *" ADIADO "*) ok "ADIADO, e não com motivo=timeout" ;; *) falha "não adiou" ;; esac
+case "$ev" in *" rc=124 dur=0s "*|*" rc=124 dur=1s "*) ok "a trilha traz a medida (rc=124, duração real)" ;; *) falha "sem a medida na trilha" ;; esac
+echo "  nota: $(fxe_nota)"
+case "$(fxe_nota)" in *timeout*) falha "a nota diz timeout" ;; *"rc=124"*) ok "a nota traz rc=124 e não diz timeout" ;; *) falha "nota sem a medida" ;; esac
+fxe_limpa
+
+# --- drenagem, com o executor stubado ----------------------------------------
+# shellcheck source=test-fixture-drenagem.sh
+source "$AQUI/test-fixture-drenagem.sh"
+fx_config "$ORQ_EXEC_ROOT"
+for id in 901 902; do fx_ticket "$ORQ_EXEC_ROOT" "$id"; done
+fx_ticket "$ORQ_EXEC_ROOT" 902 '[]' done
+fx_git "$ORQ_EXEC_ROOT"
+LOCAL_LOOP_SOURCED=1
+# shellcheck source=local-loop.sh
+source "$AQUI/local-loop.sh"
+set +e
+
+FILA="$ORQ_EXEC_ROOT/docs/fila"
+TRILHA="$FILA/runs/events.log"
+MODO="$TMP/modo"   # adia | aprova | limite | mesmo
+ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
+merge_em_alvo() { return 0; }
+cleanup_frente() { return 0; }
+# O executor da 7b: o ADIADO que ele grava, com a medida.
+run_executor_once() {
+  local f="$2" id; id="$(ticket_field "$2" '.id')"
+  case "$(cat "$MODO")" in
+    adia)   event "$id" ADIADO "motivo=gate_interrompido" "attempt=1" "rc=124" "dur=9s" "cooldown=nao" ;;
+    mesmo)  event "$id" ADIADO "motivo=servidor" "attempt=1" "rc=1" "dur=4s" "cooldown=nao" ;;
+    limite) cooldown_arm >/dev/null 2>&1
+            event "$id" ADIADO "motivo=rate_limit" "attempt=1" "rc=1" "dur=2s" "cooldown=sim" ;;
+    aprova) ticket_set_status "$f" aguardando_merge; ticket_commit "$f" "stub: $id aprovado"
+            event "$id" APROVADO "merge=aguardando" "dur=30s" "attempt=1" ;;
+  esac
+  return 0
+}
+contador() { cut -d'|' -f1 "$RUNS_BASE/$1/.adiamentos" 2>/dev/null || true; }
+st()       { ticket_field "$FILA/$1-t.md" '.status'; }
+nota()     { ticket_field "$FILA/$1-t.md" '.notas_status // ""'; }
+disparo()  {
+  drenar > "$TMP/out.$1" 2>&1
+  echo "  --- disparo $1 ($(cat "$MODO")): 901=$(st 901)/$(contador 901)"
+}
+
+echo
+echo "== B. sempre adiado: bloqueia no 4º disparo com a causa real =="
+echo adia > "$MODO"
+for d in 1 2 3; do disparo "$d"; done
+[ "$(contador 901)" = 3 ] && ok "contador em 3 depois de 3 disparos" || falha "contador='$(contador 901)'"
+[ "$(st 901)" = pendente ] && ok "abaixo do limite, segue pendente" || falha "status=$(st 901)"
+disparo 4
+[ "$(st 901)" = bloqueado ] && ok "bloqueado no 4º disparo" || falha "esperava bloqueado, está $(st 901)"
+echo "  nota: $(nota 901)"
+case "$(nota 901)" in "adiado 4 vezes: "*) ok "nota começa por 'adiado 4 vezes: '" ;; *) falha "nota fora do formato" ;; esac
+case "$(nota 901)" in *timeout*) falha "a causa real virou rótulo de timeout" ;; *"gate_interrompido"*"rc=124"*"9s"*) ok "a causa é a medida: motivo, rc=124 e 9s" ;; *) falha "nota sem a medida" ;; esac
+grep -Eq ' 901 BLOQUEADO motivo=adiamentos n=4 limite=4( |$)' "$TRILHA" && ok "trilha: BLOQUEADO motivo=adiamentos n=4 limite=4" || falha "sem BLOQUEADO motivo=adiamentos"
+[ -z "$(git -C "$ORQ_EXEC_ROOT" status --porcelain -- docs/fila/901-t.md)" ] && ok "bloqueio commitado" || falha "bloqueio sem commit"
+git -C "$ORQ_EXEC_ROOT" log -1 --format=%s -- docs/fila/901-t.md | grep -q 'bloqueado (adiamentos' && ok "commit do bloqueio" || falha "último commit: $(git -C "$ORQ_EXEC_ROOT" log -1 --format=%s -- docs/fila/901-t.md)"
+[ -z "$(contador 901)" ] && ok "contador zerado ao bloquear" || falha "contador='$(contador 901)'"
+
+echo
+echo "== C. adiado que depois aprova zera o contador =="
+ticket_set "$FILA/901-t.md" '.status = "pendente" | .notas_status = ""'; ticket_commit "$FILA/901-t.md" "fixture: 901 reaberto"
+echo adia > "$MODO"; disparo 5; disparo 6
+[ "$(contador 901)" = 2 ] && ok "2 adiamentos contados" || falha "contador='$(contador 901)'"
+echo aprova > "$MODO"; disparo 7
+[ "$(st 901)" = done ] && ok "aprovado e mergeado" || falha "status=$(st 901)"
+[ -z "$(contador 901)" ] && ok "contador zerado pela aprovação" || falha "contador='$(contador 901)'"
+ticket_set "$FILA/901-t.md" '.status = "pendente" | .notas_status = ""'; ticket_commit "$FILA/901-t.md" "fixture: 901 reaberto"
+echo adia > "$MODO"; disparo 8
+[ "$(contador 901)" = 1 ] && ok "recomeça em 1, não em 3" || falha "contador='$(contador 901)'"
+
+echo
+echo "== D. adiamento COM cooldown não conta nem zera =="
+echo limite > "$MODO"; disparo 9
+[ "$(contador 901)" = 1 ] && ok "contador segue 1" || falha "contador='$(contador 901)'"
+rm -f "$COOLDOWN_FILE"
+
+echo
+echo "== E. o limite vem do config =="
+jq '.adiamentos_limite = 2' "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"
+git -C "$ORQ_EXEC_ROOT" commit -q -am "fixture: adiamentos_limite 2"
+echo adia > "$MODO"; disparo 10
+[ "$(st 901)" = bloqueado ] && ok "com limite 2, bloqueia no 2º" || falha "status=$(st 901) contador='$(contador 901)'"
+grep -Eq ' 901 BLOQUEADO motivo=adiamentos n=2 limite=2( |$)' "$TRILHA" && ok "trilha diz n=2 limite=2" || falha "sem n=2 limite=2"
+for v in '"x"' '0' '-3' '"quatro"'; do
+  jq ".adiamentos_limite = $v" "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"
+  [ "$(adiamentos_limite)" = 4 ] && ok "limite inválido ($v) vira 4" || falha "limite inválido ($v) virou '$(adiamentos_limite)'"
+done 2>/dev/null
+jq 'del(.adiamentos_limite)' "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"
+[ "$(adiamentos_limite)" = 4 ] && ok "limite ausente vira 4" || falha "limite ausente virou '$(adiamentos_limite)'"
+git -C "$ORQ_EXEC_ROOT" commit -q -am "fixture: limite padrão"
+
+echo
+echo "== F. AMBIENTE desfaz o que somou na drenagem =="
+ticket_set "$FILA/901-t.md" '.status = "pendente" | .notas_status = ""'; ticket_commit "$FILA/901-t.md" "fixture: 901 reaberto"
+echo adia > "$MODO"; disparo 11
+[ "$(contador 901)" = 1 ] && ok "901 em 1 (antes do ambiente)" || falha "901='$(contador 901)'"
+ticket_set "$FILA/902-t.md" '.status = "pendente" | .notas_status = ""'; ticket_commit "$FILA/902-t.md" "fixture: 902 reaberto"
+echo mesmo > "$MODO"; antes="$(grep -c ' AMBIENTE ' "$TRILHA")"; disparo 12
+[ "$(grep -c ' AMBIENTE ' "$TRILHA")" = $((antes + 1)) ] && ok "um AMBIENTE" || falha "sem AMBIENTE"
+[ "$(contador 901)" = 1 ] && [ -z "$(contador 902)" ] && ok "901 volta a 1 e 902 não soma" || falha "901='$(contador 901)' 902='$(contador 902)'"
+
+echo
+if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
diff --git a/test/orquestrador-causas-adiamento.test.ts b/test/orquestrador-causas-adiamento.test.ts
index 8e8c2a0..cdeff48 100644
--- a/test/orquestrador-causas-adiamento.test.ts
+++ b/test/orquestrador-causas-adiamento.test.ts
@@ -193,3 +193,24 @@ describe('gate_crash no desfecho', () => {
     expect(decidirDesfecho(cfg, sinal({ exitCode: 1, saida: 'API Error: 503 Service Unavailable' })).desfecho).toBe('reprovado');
   });
 });
+
+describe('a causa é a medida, não o rótulo (peça 7b-3)', () => {
+  it('rc 124 em 9 s com teto de 1500 s não é timeout: é morto por fora, e o motivo traz a medida', () => {
+    const v = decidirDesfecho(CONFIG, sinal({ exitCode: 124, duracaoSecs: 9, timeoutSecs: 1500 }));
+    expect(v.desfecho).toBe('adiado');
+    expect(v.causa).toBe('gate_interrompido');
+    expect(v.motivo).toContain('rc=124 em 9s');
+    expect(v.motivo).not.toMatch(/timeout/);
+    expect(v.cooldown).toBe(false);
+  });
+
+  it('rc 124 que chegou no teto é timeout, com a medida', () => {
+    const v = decidirDesfecho(CONFIG, sinal({ exitCode: 124, duracaoSecs: 1502, timeoutSecs: 1500 }));
+    expect(v.causa).toBe('timeout');
+    expect(v.motivo).toContain('rc=124 em 1502s');
+  });
+
+  it('sem a medida (chamador antigo), rc 124 segue timeout', () => {
+    expect(decidirDesfecho(CONFIG, sinal({ exitCode: 124 })).causa).toBe('timeout');
+  });
+});
diff --git a/test/orquestrador-isolamento-teste.test.ts b/test/orquestrador-isolamento-teste.test.ts
index 8d06a2e..7e980f2 100644
--- a/test/orquestrador-isolamento-teste.test.ts
+++ b/test/orquestrador-isolamento-teste.test.ts
@@ -34,6 +34,7 @@ const SCRIPTS = [
   // etapa 7b: o executor de verdade num repo de fixture (test-fixture-executor.sh)
   'test-causa-adiamento.sh',
   'test-ambiente-adiado.sh',
+  'test-adiamentos-limite.sh',
 ];
 
 /**
```

## 7b-4 · sub-motivo, escalada, corte de repetição e tentativas persistidas

sha: `ffab528`

### Vermelho

```
== A. critério vermelho, com permissão negada: mérito, mesmo modelo ==
  ok    a permissão negada foi registrada
  FALHA REPROVADO sem sub=criterio
  FALHA RETRY não manteve o modelo
  FALHA o agente foi chamado em opus
  ok    não adiou (permissão negada não é ambiente)
  | 901 INICIO attempt=1 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=a0ad2151
  | 901 INICIO attempt=2 model=opus
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== B. juiz reprovando: escala ==
  FALHA REPROVADO sem sub=juiz
  FALHA o juiz reprovou e não escalou
  ok    a 2ª chamada do agente foi em opus
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=baixo modelo=sonnet attempt=1
  | 901 REPROVADO motivo=criterio_qualidade attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=05c647c6
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=alto modelo=opus attempt=2
  | 901 REPROVADO motivo=criterio_qualidade attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo ==
  FALHA REPROVADO sem sub=gate_testes
  FALHA gate vermelho escalou
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=a5ed40f3
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora ==
  FALHA reprovação fora do esperado
  FALHA não bloqueou por repetição
  ok    ticket bloqueado
  FALHA houve RETRY (3ª volta)
  FALHA 3 chamadas
  nota: critério(s) reprovado(s): o arquivo existe (max_retries 2 atingido)
  FALHA nota sem a repetição
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
  | 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
  | 461 RETRY attempt=2 model=opus motivo=criterio_qualidade worktree=reaproveitada
  | 461 WORKTREE modo=reaproveitada de=attempt-0 base=49d8ac92
  | 461 INICIO attempt=2 model=opus
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade attempt=2 diff=717
  | 461 RETRY attempt=3 model=opus motivo=criterio_qualidade worktree=reaproveitada
  | 461 WORKTREE modo=reaproveitada de=attempt-1 base=49d8ac92
  | 461 INICIO attempt=3 model=opus
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade attempt=3 diff=717
  | 461 BLOQUEADO motivo=criterio_qualidade attempt=3

== E. max_retries vale no total, não por drenagem ==
  --- 1ª execução: tentativas=0 status=pendente
  ok    1ª execução: reprovou, adiou, segue pendente
  FALHA tentativas=0
  --- 2ª execução: tentativas=0 status=bloqueado
  FALHA 4 reprovações no total
  FALHA a 2ª execução recomeçou do zero
  ok    BLOQUEADO na attempt=3
  ok    nenhuma 4ª tentativa
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=31f163d5
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=1 diff=6
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=31f163d5
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=2 diff=7
  | 901 RETRY attempt=3 model=opus motivo=criterio_qualidade worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-1 base=31f163d5
  | 901 INICIO attempt=3 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade attempt=3 diff=8
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

15 CHECK(S) FALHARAM
rc=1
```

### Verde

Rodado de dentro do `test-shell.sh`, o caso D falhou na primeira vez: o script roda da cópia vendorizada no repo de fixture, que não tem `test/fixtures/`. O `test-shell.sh` passou a exportar `ORQ_KIT`, e fixture ausente virou FALHA explícita.

```
== A. critério vermelho, com permissão negada: mérito, mesmo modelo ==
  ok    a permissão negada foi registrada
  ok    REPROVADO sub=criterio
  ok    RETRY com o mesmo modelo (sonnet), sub=criterio
  ok    nenhuma chamada em opus
  ok    não adiou (permissão negada não é ambiente)
  | 901 INICIO attempt=1 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=4e7bc39b
  | 901 INICIO attempt=2 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== B. juiz reprovando: escala ==
  ok    REPROVADO sub=juiz
  ok    RETRY model=opus, sub=juiz
  ok    a 2ª chamada do agente foi em opus
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=baixo modelo=sonnet attempt=1
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade sub=juiz worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=bc787018
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=alto modelo=opus attempt=2
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo ==
  ok    REPROVADO sub=gate_testes
  ok    RETRY com o mesmo modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=gate_testes worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=afd51abf
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora ==
  ok    a reprovação desta execução: sub=criterio diff=717
  ok    BLOQUEADO motivo=repeticao
  ok    ticket bloqueado
  ok    nenhum RETRY
  ok    uma chamada paga só
  nota: repetição: 2ª reprovação igual à anterior (sub=criterio, diff=717), sem 3ª volta. critério(s) reprovado(s): o arquivo existe
  ok    a nota diz repetição e o diff
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
  | 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717
  | 461 BLOQUEADO motivo=repeticao sub=criterio diff=717 attempt=1

== E. max_retries vale no total, não por drenagem ==
  --- 1ª execução: tentativas=1 status=pendente
  ok    1ª execução: reprovou, adiou, segue pendente
  ok    1 tentativa consumida, persistida no ticket (o adiado devolveu a sua)
  --- 2ª execução: tentativas=3 status=bloqueado
  ok    3 reprovações no total (max_retries 2 + 1)
  ok    a 2ª execução começa em attempt=2
  ok    BLOQUEADO na attempt=3
  ok    nenhuma 4ª tentativa
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=07ee7551
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 RETRY attempt=3 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-2 base=07ee7551
  | 901 INICIO attempt=3 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=3 diff=7
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

TODOS OS CHECKS PASSARAM
rc=0
```

### Diff

```
commit ffab5289cc19343c2eea98e0a1f3cb8d4d348589
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Mon Sep 21 13:33:48 2026 -0300

    7b-4: sub-motivo, escalada só com juiz, corte de repetição e tentativas persistidas
    
    - decisao.ts: Veredito.sub (juiz|criterio|gate_<papel>|exit) por subDoSinal;
      ESCALAR em politica_retry só com sub=juiz (critério, gate e exit repetem com
      o mesmo modelo); subDaLinha deriva o sub de linha antiga pelo GATE/JUIZ da
      mesma tentativa; ehRepeticao (mesmo sub e mesmo diff da reprovação anterior,
      série quebrada por APROVADO/MERGE/BLOQUEADO/REFATIAR/RECUPERADO).
    - executor.sh: juizReprovou no sinal; REPROVADO e RETRY com sub=; 2ª
      reprovação igual vira BLOQUEADO motivo=repeticao sem 3ª volta; contador de
      tentativas persistido no campo `tentativas` do ticket (porte do f3aaa89 do
      Actus): max_retries vale no total, não por drenagem.
    - lib.sh: ticket_tentativas / ticket_set_tentativas / ticket_zera_tentativas;
      local-loop.sh zera na transição para done.
    - Permissão negada com critério vermelho segue mérito (sub=criterio), sem
      escalar.
    - Testes: test-reprovado-sub.sh (executor real; trilha fixture do 461 do
      Actus), sub-repeticao.test.ts; asserções antigas atualizadas com a mesma
      força (escalada vira três casos; 9 desfechos nomeados; diretório por slot).
    - CONTRATO §8: ESCALAR vale só para sub=juiz.
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
---
 CONTRATO.md                                   |   9 +++
 scripts/kit/test-shell.sh                     |   6 +-
 scripts/orquestrador/decisao-cli.ts           |  10 +++
 scripts/orquestrador/decisao.ts               |  97 +++++++++++++++++++++-
 scripts/orquestrador/executor.sh              |  45 +++++++++--
 scripts/orquestrador/lib.sh                   |  18 +++++
 scripts/orquestrador/local-loop.sh            |   1 +
 scripts/orquestrador/test-fixture-executor.sh |  51 ++++++++----
 scripts/orquestrador/test-reprovado-sub.sh    | 111 ++++++++++++++++++++++++++
 test/fixtures/trilha/PROCEDENCIA.md           |  21 +++++
 test/fixtures/trilha/actus-461-reprovado.log  |   4 +
 test/orquestrador-decisao.test.ts             |  31 ++++++-
 test/orquestrador-isolamento-teste.test.ts    |   1 +
 test/orquestrador-sub-repeticao.test.ts       |  83 +++++++++++++++++++
 test/orquestrador-tools-derivadas.test.ts     |   5 +-
 test/orquestrador-trilha.test.ts              |   6 +-
 16 files changed, 470 insertions(+), 29 deletions(-)

diff --git a/CONTRATO.md b/CONTRATO.md
index 44eb628..e82da8c 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -494,6 +494,15 @@ e **não** na tabela de chaves novas do `--migrar` (`config-tabela.ts:NOVAS`): u
 repo instalado segue com o padrão do código sem que a migração mude o proposto
 dele.
 
+**`politica_retry.por_causa.<causa>.modelo = "ESCALAR"` vale só para
+`sub=juiz`** (peça 7b-4). O REPROVADO carrega o sub-motivo (`juiz`, `criterio`,
+`gate_<papel>`, `exit`; §4.1), e `decidirRetry` (`decisao.ts`) só troca para
+`retry_final_model` quando quem reprovou foi o juiz. Critério vermelho, gate
+vermelho e exit repetem com o MESMO modelo, qualquer que seja o config: nos 30
+dias até 21/09, 82 de 82 retries do kit foram para opus porque tudo caía em
+`criterio_qualidade`. `MANTER` segue como sempre, e a proibição de escalar por
+`diff_cap` e `enforcement` segue rejeitando o config que mandar o contrário.
+
 **`000-config.proposto.json` é NOME RESERVADO do instalador.** É onde o
 `migrar-config.ts --propor` escreve e de onde o `--aplicar` lê. Desde a peça M1
 o `--propor` **RECUSA** (rc 1) se o arquivo já existir, e o `instalar.sh
diff --git a/scripts/kit/test-shell.sh b/scripts/kit/test-shell.sh
index bfed4d4..eb0d99d 100644
--- a/scripts/kit/test-shell.sh
+++ b/scripts/kit/test-shell.sh
@@ -26,6 +26,7 @@
 #   test-causa-adiamento.sh         a tabela de causas: cooldown só para limite remoto (7b-2)
 #   test-ambiente-adiado.sh         a régua de AMBIENTE vale sobre o ADIADO sem cooldown (7b-2)
 #   test-adiamentos-limite.sh       teto de adiamentos seguidos, com a causa real na nota (7b-3)
+#   test-reprovado-sub.sh           sub-motivo, escalada só com juiz, repetição, tentativas persistidas (7b-4)
 #
 # Cada um monta o PRÓPRIO `ORQ_EXEC_ROOT` num `mktemp -d` (drenagem e retry) ou
 # trabalha direto no checkout (lib-config); nada aqui precisa exportar
@@ -41,7 +42,10 @@
 set -uo pipefail
 
 KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
-SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh test-adiamentos-limite.sh'
+# Os testes que leem fixture versionada do kit (test/fixtures/) a acham por aqui:
+# rodando da cópia vendorizada no repo de fixture, `$AQUI/../..` não é o kit.
+export ORQ_KIT="$KIT"
+SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh test-adiamentos-limite.sh test-reprovado-sub.sh'
 
 FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
   printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
diff --git a/scripts/orquestrador/decisao-cli.ts b/scripts/orquestrador/decisao-cli.ts
index 0ded66f..1687b67 100644
--- a/scripts/orquestrador/decisao-cli.ts
+++ b/scripts/orquestrador/decisao-cli.ts
@@ -8,6 +8,7 @@
  *   desfecho                  -> stdin = SinalTentativa; imprime Veredito
  *   retry <tentativa> <modelo>-> stdin = Veredito; imprime PlanoRetry
  *   meta                      -> stdin = entrada; imprime RegistroMeta
+ *   repeticao <sub> <diff>    -> stdin = linhas da trilha do ticket; exit 0 = repete a anterior (7b-4)
  *   disallowed                -> o piso de --disallowedTools do config (T17)
  */
 import { readFileSync } from 'node:fs'
@@ -16,6 +17,7 @@ import {
   decidirDesfecho,
   decidirRetry,
   registroMeta,
+  ehRepeticao,
   nomeWorktree,
   prefixoDeWorktree,
   modeloIndefinido,
@@ -74,6 +76,14 @@ switch (sub) {
     process.stdout.write(pisoDoConfig(config).join(','))
     break
   }
+  case 'repeticao': {
+    // Peça 7b-4. exit 0 = a reprovação atual repete a anterior (mesmo sub, mesmo
+    // diff); 1 = não repete. As linhas chegam cruas por stdin, já filtradas
+    // pelo id do ticket.
+    const linhas = readFileSync(0, 'utf8').split('\n').filter((l) => l.trim() !== '')
+    process.exit(ehRepeticao(linhas, args[0] ?? '', Number(args[1] ?? NaN)) ? 0 : 1)
+    break
+  }
   case 'worktree': {
     process.stdout.write(nomeWorktree(prefixoDeWorktree(config), args[0] ?? '') + '\n')
     break
diff --git a/scripts/orquestrador/decisao.ts b/scripts/orquestrador/decisao.ts
index 285b4ee..3aed926 100644
--- a/scripts/orquestrador/decisao.ts
+++ b/scripts/orquestrador/decisao.ts
@@ -172,6 +172,13 @@ export interface SinalTentativa {
    */
   duracaoSecs?: number
   timeoutSecs?: number
+  /**
+   * Peça 7b-4 · o juiz rodou e REPROVOU. Campo próprio porque é o único
+   * sub-motivo que escala modelo: as linhas do juiz continuam entrando em
+   * `criteriosFalhos` (para o motivo e o diagnóstico), mas quem decide o sub é
+   * este campo, não o texto.
+   */
+  juizReprovou?: boolean
   /**
    * true quando o juiz (passo 7) NÃO produziu veredito legível — resposta
    * ilegível, ou a chamada do juiz caiu em limite/timeout. Nos dois casos não
@@ -303,6 +310,23 @@ export interface Veredito {
   contaComoRetry: boolean
   /** Peça 7b-2: o adiamento arma cooldown? Só para limite remoto (`armaCooldown`). */
   cooldown?: boolean
+  /**
+   * Peça 7b-4 · QUAL mérito reprovou: `juiz`, `criterio`, `gate_<papel>` ou
+   * `exit`. Só no reprovado. `criterio_qualidade` era o balde de tudo ("162 de
+   * 162" no Actus) e tudo escalava; o sub é o que separa capacidade de ambiente.
+   */
+  sub?: string
+}
+
+/**
+ * O sub-motivo de uma reprovação de mérito, na ordem em que o pipeline para:
+ * gate (fail-fast), juiz (só roda com o mecânico verde), critério, exit.
+ */
+export function subDoSinal(sinal: SinalTentativa): string {
+  if (sinal.gatesRc) return `gate_${sinal.gatePapelFalho || 'desconhecido'}`
+  if (sinal.juizReprovou) return 'juiz'
+  if (sinal.criteriosFalhos && sinal.criteriosFalhos.length > 0) return 'criterio'
+  return 'exit'
 }
 
 /**
@@ -362,10 +386,11 @@ export function decidirDesfecho(config: DecisaoConfig, sinal: SinalTentativa): V
       motivo: `critério(s) reprovado(s): ${sinal.criteriosFalhos.join('; ')}`,
       contaComoRetry: true,
       cooldown: false,
+      sub: subDoSinal(sinal),
     }
   }
   if (sinal.exitCode !== 0) {
-    return { desfecho: 'reprovado', causa: 'criterio_qualidade', motivo: `exit ${sinal.exitCode}`, contaComoRetry: true, cooldown: false }
+    return { desfecho: 'reprovado', causa: 'criterio_qualidade', motivo: `exit ${sinal.exitCode}`, contaComoRetry: true, cooldown: false, sub: subDoSinal(sinal) }
   }
   return { desfecho: 'aprovado', motivo: 'gates e critérios verdes', contaComoRetry: false, cooldown: false }
 }
@@ -428,6 +453,21 @@ export function decidirRetry(
       `config inválida: escalar modelo por ${causa} é proibido (falha de ${causa === 'diff_cap' ? 'tamanho' : 'fronteira'}, não de capacidade)`,
     )
   }
+  // Peça 7b-4 · ESCALAR vale só para sub=juiz: é o único mérito em que um
+  // modelo mais forte é hipótese (o juiz leu o diff e achou o trabalho fraco).
+  // Critério vermelho, gate vermelho e exit repetem com o MESMO modelo: o que
+  // costuma estar errado ali é critério mal escrito, gate quebrado ou ambiente,
+  // e opus paga o mesmo muro mais caro (82 de 82 retries do kit foram opus).
+  if (regra.modelo === 'ESCALAR' && veredito.sub !== 'juiz') {
+    return {
+      deveTentar: true,
+      modelo: modeloAtual,
+      escalou: false,
+      estreitarEscopo: false,
+      acao: 'repetir com o mesmo modelo e o diagnóstico da reprovação',
+      motivo: `${causa} sub=${veredito.sub ?? '?'}: mantém modelo (só o juiz escala)`,
+    }
+  }
   if (regra.modelo === 'ESCALAR') {
     return {
       deveTentar: true,
@@ -449,6 +489,61 @@ export function decidirRetry(
   }
 }
 
+// ─── 3b · corte de repetição (peça 7b-4) ───────────────────────────────────
+
+/**
+ * O sub de uma linha REPROVADO da trilha. Linha nova traz `sub=`; linha de antes
+ * da 7b-4 não traz, e o sub é DERIVADO das linhas da mesma tentativa que vieram
+ * antes dela (desde o INICIO): GATE com um papel `=falha` vira `gate_<papel>`,
+ * JUIZ reprovado vira `juiz`, critérios abaixo do total viram `criterio`, e o
+ * resto é `exit`. É o "sub normalizado": o mesmo nome, venha de onde vier.
+ */
+export function subDaLinha(linhas: string[], i: number): string {
+  const m = / sub=(\S+)/.exec(linhas[i] ?? '')
+  if (m) return m[1]!
+  let gate = ''
+  let juiz = false
+  let criterio = false
+  for (let j = i - 1; j >= 0; j--) {
+    const l = linhas[j]!
+    const ev = l.split(' ')[2]
+    if (ev === 'INICIO') break
+    if (ev === 'GATE') {
+      const f = /\b(typecheck|testes|build|lint)=falha\b/.exec(l)
+      if (f) gate = f[1]!
+      const c = /\bcriterios=(\d+)\/(\d+)\b/.exec(l)
+      if (c && Number(c[1]) < Number(c[2])) criterio = true
+    }
+    if (ev === 'JUIZ' && / veredito=reprovado\b/.test(l)) juiz = true
+  }
+  if (gate) return `gate_${gate}`
+  if (juiz) return 'juiz'
+  if (criterio) return 'criterio'
+  return 'exit'
+}
+
+/**
+ * A reprovação ATUAL (sub, diff) repete a anterior do mesmo ticket? `linhas` são
+ * as linhas da trilha DESTE ticket, antes de a atual ser escrita. A anterior é a
+ * última REPROVADO, desde que nada tenha encerrado a série entre as duas
+ * (APROVADO, MERGE, BLOQUEADO, REFATIAR, RECUPERADO: o ticket saiu de pendente,
+ * e reabrir é decisão de humano). ADIADO no meio não quebra a série.
+ *
+ * Mesmo sub e mesmo `diff=` = o agente entregou o mesmo trabalho e o mesmo
+ * juízo o reprovou: a 3ª volta é gasto sem hipótese. O 461 do Actus foi 717,
+ * 717, 717, duas delas em opus.
+ */
+export function ehRepeticao(linhas: string[], sub: string, diff: number): boolean {
+  for (let i = linhas.length - 1; i >= 0; i--) {
+    const ev = (linhas[i] ?? '').split(' ')[2]
+    if (ev === 'APROVADO' || ev === 'MERGE' || ev === 'BLOQUEADO' || ev === 'REFATIAR' || ev === 'RECUPERADO') return false
+    if (ev !== 'REPROVADO') continue
+    const d = / diff=(\d+)\b/.exec(linhas[i]!)
+    return !!d && Number(d[1]) === diff && subDaLinha(linhas, i) === sub
+  }
+  return false
+}
+
 // ─── 4 · registro do meta.json ─────────────────────────────────────────────
 
 export interface RegistroMeta {
diff --git a/scripts/orquestrador/executor.sh b/scripts/orquestrador/executor.sh
index c4c920a..1c0e3d5 100755
--- a/scripts/orquestrador/executor.sh
+++ b/scripts/orquestrador/executor.sh
@@ -894,7 +894,7 @@ run_attempt() {
   elif [ "$JUIZ_ROU" = 1 ] && [ "$JUIZ_APROVADO" = false ]; then
     sinal="$(printf '%s' "$sinal" | jq --arg m "juiz: $JUIZ_MOTIVO" \
       --argjson jf "$(jq -c '.criterios_falhos // []' "$rundir/juiz.veredito.json" 2>/dev/null || echo '[]')" \
-      '.criteriosFalhos += ([$m] + $jf)')"
+      '.criteriosFalhos += ([$m] + $jf) | .juizReprovou = true')"
   fi
   veredito="$(printf '%s' "$sinal" | decisao desfecho)"
   RESULT="$(printf '%s' "$veredito" | jq -r '.desfecho')"
@@ -1016,7 +1016,7 @@ drive_ticket() {
   # sobrou de uma rodada anterior — attempt-N antigos, worktree órfã — não pode
   # virar ponto de partida nem destino de escrita. Reaproveitar worktree é
   # decisão TOMADA DENTRO deste laço, entre um retry e o seguinte, e só ali.
-  local reusar=0 base_ticket="" slot
+  local reusar=0 base_ticket="" slot attempt0 sub
   id="$(ticket_field "$file" '.id')"
   slug="$(ticket_field "$file" '.slug')"
 
@@ -1035,7 +1035,14 @@ drive_ticket() {
   modelo="$(cfg '.executor_model')"
   TICKET_EM_CURSO="$id"
   slot="$(slot_base_attempt "$id")"
-  log "ticket $id ($slug) · worktree $nome · modelo $modelo · evidência a partir de attempt-$slot"
+  # TENTATIVAS PERSISTIDAS (peça 7b-4, porte do f3aaa89 do Actus). O contador
+  # vinha de `attempt=0` a cada chamada, então max_retries valia POR DRENAGEM:
+  # reprovou, adiou, voltou no disparo seguinte = max_retries de novo. O 481 do
+  # Actus acumulou 18 diretórios de tentativa assim. Agora ele sai do campo
+  # `tentativas` do ticket; `attempt0` separa as duas numerações (o contador de
+  # retry, persistido, e o diretório de evidência, pelo slot contínuo).
+  attempt="$(ticket_tentativas "$file")"; attempt0="$attempt"
+  log "ticket $id ($slug) · worktree $nome · modelo $modelo · evidência a partir de attempt-$slot · tentativas já consumidas: $attempt/$((CFG_MAX_RETRIES + 1))"
   [ "$slot" = 0 ] || log "  runs/$id já tem $slot tentativa(s) de rodada anterior — a numeração continua, nada é sobrescrito"
 
   while :; do
@@ -1054,11 +1061,11 @@ drive_ticket() {
     # O diretório é nomeado pelo SLOT (contínuo por ticket), não pelo contador de
     # retry (que reinicia a cada drenagem). Sem isso o requeue sobrescreve a
     # evidência da rodada anterior — foi o que aconteceu com runs/227.
-    rundir="$RUNS_BASE/$id/attempt-$((slot + attempt))"
+    rundir="$RUNS_BASE/$id/attempt-$((slot + attempt - attempt0))"
     mkdir -p "$rundir"
     if [ "$reusar" = 1 ] && [ -e "$wt/.git" ]; then
-      log "  worktree REAPROVEITADA de attempt-$((attempt - 1)) (enforcement passou): commit anterior presente, base $(printf '%.8s' "$base_ticket")"
-      event "$id" WORKTREE "modo=reaproveitada" "de=attempt-$((attempt - 1))" "base=$(printf '%.8s' "$base_ticket")"
+      log "  worktree REAPROVEITADA de attempt-$((slot + attempt - attempt0 - 1)) (enforcement passou): commit anterior presente, base $(printf '%.8s' "$base_ticket")"
+      event "$id" WORKTREE "modo=reaproveitada" "de=attempt-$((slot + attempt - attempt0 - 1))" "base=$(printf '%.8s' "$base_ticket")"
       limpa_cache_vite
     else
       setup_worktree "$id" "$wt"
@@ -1066,8 +1073,15 @@ drive_ticket() {
     fi
     event "$id" INICIO "attempt=$((attempt + 1))" "model=$modelo"
     status_ticket_inicio "$id" "$slug" "$attempt" "$CFG_MAX_RETRIES"
+    # CONSOME a tentativa ANTES de rodar: se o processo morrer no meio, ela já
+    # está contada no ticket e o órfão não volta com o contador zerado.
+    ticket_set_tentativas "$file" "$((attempt + 1))"
+    ticket_commit "$file" "fila: $id tentativa $((attempt + 1))"
     run_attempt "$file" "$wt" "$rundir" "$modelo" "${MOTIVO_ANTERIOR:-}" "$attempt" "$base_ticket"
     grava_meta "$rundir" "$attempt" "$modelo"
+    # Só REPROVAÇÃO consome. Adiado, aprovado e refatiar devolvem o valor de
+    # antes; o commit de cada desfecho abaixo leva a devolução junto.
+    [ "$RESULT" = "reprovado" ] || ticket_set_tentativas "$file" "$attempt"
     local tok; tok="$(motivo_token "$(cat "$rundir/veredito.json" 2>/dev/null || echo '{}')")"
 
     if [ "$RESULT" = "adiado" ]; then
@@ -1094,7 +1108,22 @@ drive_ticket() {
       marca_refatiar "$file" "$rundir" "$tok"
       DESFECHO_NOMEADO=1; cleanup_worktree "$id" "$wt"; return 0
     fi
-    event "$id" REPROVADO "motivo=$tok" "attempt=$((attempt + 1))" "diff=$DIFF_LINES"
+    # SUB-MOTIVO (peça 7b-4): qual mérito reprovou. É ele que decide se o retry
+    # escala (só juiz) e é com ele que se reconhece a repetição.
+    sub="$(jq -r '.sub // "exit"' "$rundir/veredito.json" 2>/dev/null || echo exit)"
+    # CORTE DE REPETIÇÃO (peça 7b-4): a 2ª reprovação do ticket com o MESMO sub
+    # e o MESMO diff da anterior bloqueia na hora, sem 3ª volta. A anterior é
+    # lida da trilha, e pode ser de outra drenagem (o 461 do Actus: 717, 717, 717).
+    if awk -v id="$id" '$2 == id' "$EVENTS_FILE" 2>/dev/null | decisao repeticao "$sub" "$DIFF_LINES" >/dev/null 2>&1; then
+      event "$id" REPROVADO "motivo=$tok" "sub=$sub" "attempt=$((attempt + 1))" "diff=$DIFF_LINES"
+      ticket_set_status "$file" "bloqueado"
+      ticket_set_nota "$file" "repetição: 2ª reprovação igual à anterior (sub=$sub, diff=$DIFF_LINES), sem 3ª volta. $MOTIVO"
+      ticket_commit "$file" "fila: $id bloqueado (repeticao)"
+      event "$id" BLOQUEADO "motivo=repeticao" "sub=$sub" "diff=$DIFF_LINES" "attempt=$((attempt + 1))"
+      status_set "estado=ocioso" "ultimo=$id BLOQUEADO $(date '+%H:%M:%S') (${DUR}s)" "motivo=bloqueado: repeticao ($sub, diff $DIFF_LINES)"
+      DESFECHO_NOMEADO=1; log "BLOQUEADO por repetição: sub=$sub diff=$DIFF_LINES igual à reprovação anterior"; cleanup_worktree "$id" "$wt"; return 0
+    fi
+    event "$id" REPROVADO "motivo=$tok" "sub=$sub" "attempt=$((attempt + 1))" "diff=$DIFF_LINES"
 
     plano="$(printf '%s' "$(cat "$rundir/veredito.json")" | decisao retry "$attempt" "$modelo")"
     if [ "$(printf '%s' "$plano" | jq -r '.deveTentar')" != true ]; then
@@ -1114,7 +1143,7 @@ drive_ticket() {
     # e false, e o `set -e` mata o loop de retry sem log nenhum (attempt unico).
     MOTIVO_ANTERIOR="$(diagnostico_retry "$file" "$rundir")$( { [ "$(printf '%s' "$plano" | jq -r '.estreitarEscopo')" = true ] && printf '\n%s' "$(printf '%s' "$plano" | jq -r '.acao')"; } || true)"
     log "retry $((attempt + 1)): modelo=$modelo escalou=$(printf '%s' "$plano" | jq -r '.escalou')"
-    event "$id" RETRY "attempt=$((attempt + 2))" "model=$modelo" "motivo=$tok" \
+    event "$id" RETRY "attempt=$((attempt + 2))" "model=$modelo" "motivo=$tok" "sub=$sub" \
       "worktree=$([ "$ENF_OK" = 1 ] && echo reaproveitada || echo nova)"
     attempt=$((attempt + 1))
     # A worktree só sobrevive ao retry quando o enforcement aprovou o diff dela.
diff --git a/scripts/orquestrador/lib.sh b/scripts/orquestrador/lib.sh
index 3cd28a6..2d7114c 100755
--- a/scripts/orquestrador/lib.sh
+++ b/scripts/orquestrador/lib.sh
@@ -182,6 +182,24 @@ ticket_set() {
 ticket_set_status() { ticket_set "$1" '.status = $s' --arg s "$2"; }
 ticket_set_nota()   { ticket_set "$1" '.notas_status = $v' --arg v "$2"; }
 
+# --- TENTATIVAS PERSISTIDAS (peça 7b-4, porte do f3aaa89 do Actus) ------------
+# `tentativas` no ticket é a FONTE DA VERDADE do contador de retry: quantas
+# tentativas este ticket já consumiu, somando todas as drenagens. O drive_ticket
+# lê no início, grava attempt+1 ANTES de rodar a tentativa (crash no meio conta)
+# e devolve o valor anterior quando o desfecho não é reprovação (adiado,
+# aprovado, refatiar não consomem). Zera na transição para done (local-loop.sh)
+# e quando um humano reabre o ticket. Ausente ou não numérico = 0 (ticket
+# antigo). É o nome do schema (`tentativas_consumidas` é o v1, e o
+# migrar-tickets renomeia).
+ticket_tentativas() {
+  local n
+  n="$(ticket_field "$1" '.tentativas // 0' 2>/dev/null || echo 0)"
+  case "$n" in ''|*[!0-9]*) n=0 ;; esac
+  echo "$n"
+}
+ticket_set_tentativas()  { ticket_set "$1" '.tentativas = ($n | tonumber)' --arg n "$2"; }
+ticket_zera_tentativas() { ticket_set_tentativas "$1" 0; }
+
 # ticket_commit <arquivo> <mensagem>
 # Commita a mudança de status/nota do ticket no MAIN_CHECKOUT imediatamente
 # apos escreve-la. Sem isso a arvore fica suja entre disparos e o preflight
diff --git a/scripts/orquestrador/local-loop.sh b/scripts/orquestrador/local-loop.sh
index 8889e73..5a0ecbc 100755
--- a/scripts/orquestrador/local-loop.sh
+++ b/scripts/orquestrador/local-loop.sh
@@ -454,6 +454,7 @@ drenar() {
       status_set "fase=merge"
       if merge_em_alvo "$prox_id" "$stwt"; then
         ticket_set_status "$prox" done
+        ticket_zera_tentativas "$prox"
         ticket_set_nota "$prox" "mergeado em $BRANCH_ALVO pela drenagem"
         ticket_commit "$prox" "fila: $prox_id done (mergeado em $BRANCH_ALVO)"
         event "$prox_id" MERGE "alvo=$BRANCH_ALVO" "sha=$(git -C "$stwt" rev-parse --short HEAD 2>/dev/null || echo '?')"
diff --git a/scripts/orquestrador/test-fixture-executor.sh b/scripts/orquestrador/test-fixture-executor.sh
index ccb7011..bbb2b48 100644
--- a/scripts/orquestrador/test-fixture-executor.sh
+++ b/scripts/orquestrador/test-fixture-executor.sh
@@ -14,8 +14,10 @@
 #
 # Uso, de dentro de um teste:
 #   source "$AQUI/test-fixture-executor.sh"
-#   fxe_novo                      # monta $FXE/repo e imprime nada
-#   fxe_claude 429                # o que o `claude` falso faz na próxima chamada
+#   fxe_novo                      # monta $FXE/repo e imprime nada (ticket $FXE_ID, 901 por padrão)
+#   fxe_claude 429                # o que o `claude` falso faz em toda chamada do agente
+#   fxe_fila linhas:5 503 ...     # ou um modo por chamada, em ordem (o último se repete)
+#   fxe_criterio falhou           # o que o critério do ticket imprime (espera "ok")
 #   fxe_gate typecheck 'exit 0'   # corpo do script do gate
 #   fxe_roda                      # roda executor.sh --ticket 901; saída em $FXE/saida, rc em $FXE_RC
 #   fxe_status / fxe_nota / fxe_eventos / fxe_cooldown
@@ -34,6 +36,7 @@ FXE_NM="$(cd "$FXE_AQUI/../.." && pwd)/node_modules"
 # filtro opcional ajusta o config do caso (ex.: '.max_retries = 0').
 fxe_novo() {
   local filtro="${1:-.}" r
+  FXE_ID="${FXE_ID:-901}"
   FXE="$(mktemp -d)"
   r="$FXE/repo"
   mkdir -p "$r/docs/fila/runs" "$r/src" "$FXE/bin" "$FXE/gates" "$FXE/_worktrees"
@@ -83,16 +86,17 @@ JSON
     && mv "$r/docs/fila/000-config.json.tmp" "$r/docs/fila/000-config.json"
   echo '{"$schema_versao": 2, "tokens": []}' > "$r/docs/fila/liberacoes.json"
   printf '| data | origem | alvo | pergunta | visto |\n|---|---|---|---|---|\n' > "$r/docs/fila/decisoes-pendentes.md"
-  cat > "$r/docs/fila/901-t.md" <<'TICKET'
-# 901
+  echo ok > "$FXE/criterio"
+  cat > "$r/docs/fila/$FXE_ID-t.md" <<TICKET
+# $FXE_ID
 
-```json
-{"id": "901", "slug": "t-901", "status": "pendente", "origem": "humano",
+\`\`\`json
+{"id": "$FXE_ID", "slug": "t-$FXE_ID", "status": "pendente", "origem": "humano",
  "objetivo": "escrever src/a.ts", "pathspec_allowlist": ["src/a.ts"], "dependencias": [],
  "criterios_aceite": [
-   {"tipo": "alvo", "descricao": "o arquivo existe", "cmd": "test -f src/a.ts && echo ok", "espera": "ok"}],
+   {"tipo": "alvo", "descricao": "o arquivo existe", "cmd": "test -f src/a.ts && cat $FXE/criterio", "espera": "ok"}],
  "notas_status": ""}
-```
+\`\`\`
 TICKET
   printf 'export const base = 0\n' > "$r/src/base.ts"
   mkdir -p "$r/scripts/orquestrador"
@@ -114,14 +118,31 @@ TICKET
 case " \$* " in *" --max-turns 1 "*) cat "$FXE/juiz-saida" 2>/dev/null; exit 0 ;; esac
 modelo=\$(printf '%s\n' "\$@" | awk 'p { print; exit } \$0 == "--model" { p = 1 }')
 echo "agente model=\$modelo" >> "$FXE/chamadas"
-case "\$(cat "$FXE/claude-modo" 2>/dev/null || echo ok)" in
+# Fila de modos: um por chamada, o último se repete. Sem fila, o modo fixo.
+if [ -s "$FXE/claude-fila" ]; then
+  modo="\$(head -1 "$FXE/claude-fila")"
+  [ "\$(wc -l < "$FXE/claude-fila")" -gt 1 ] && { tail -n +2 "$FXE/claude-fila" > "$FXE/claude-fila.t"; mv "$FXE/claude-fila.t" "$FXE/claude-fila"; }
+else
+  modo="\$(cat "$FXE/claude-modo" 2>/dev/null || echo ok)"
+fi
+case "\$modo" in
   sleep) sleep 30 ;;
   429) echo '{"type":"result","is_error":true,"result":"API Error: Request rejected (429) · rate_limit_error"}'; exit 1 ;;
   503) echo '{"type":"result","is_error":true,"result":"API Error: 503 Service Unavailable · overloaded_error"}'; exit 1 ;;
   rc124) exit 124 ;;
   ok) printf 'export const a = 1\n' > src/a.ts
-      git add src/a.ts && git commit -qm "a" -m "Orq-Ticket: 901"
+      git add src/a.ts && git commit -qm "a" -m "Orq-Ticket: $FXE_ID"
       echo '{"type":"result","result":"feito","total_cost_usd":0}' ;;
+  linhas:*|negado:*)
+      # N linhas em src/a.ts (sobrescreve: com worktree reaproveitada, o diff
+      # contra a base é N). negado: o envelope traz permission_denials.
+      n="\${modo#*:}"; : > src/a.ts
+      i=0; while [ "\$i" -lt "\$n" ]; do echo "export const l\$i = \$i"; i=\$((i + 1)); done > src/a.ts
+      git add src/a.ts && git commit -qm "a" -m "Orq-Ticket: $FXE_ID"
+      case "\$modo" in
+        negado:*) echo '{"type":"result","result":"feito","total_cost_usd":0,"permission_denials":[{"tool_name":"Bash","tool_input":{"command":"ls -la node_modules"}}]}' ;;
+        *)        echo '{"type":"result","result":"feito","total_cost_usd":0}' ;;
+      esac ;;
 esac
 STUB
   chmod +x "$FXE/bin/claude"
@@ -129,7 +150,9 @@ STUB
   echo ok > "$FXE/claude-modo"
 }
 
-fxe_claude() { printf '%s\n' "$1" > "$FXE/claude-modo"; }
+fxe_claude() { printf '%s\n' "$1" > "$FXE/claude-modo"; rm -f "$FXE/claude-fila"; }
+fxe_fila()   { printf '%s\n' "$@" > "$FXE/claude-fila"; }
+fxe_criterio() { printf '%s\n' "$1" > "$FXE/criterio"; }
 fxe_gate()   { printf '%s\n' "$2" > "$FXE/gates/$1.sh"; }
 fxe_juiz()   { printf '%s\n' "$1" > "$FXE/juiz-saida"; }
 
@@ -139,14 +162,14 @@ fxe_juiz()   { printf '%s\n' "$1" > "$FXE/juiz-saida"; }
 fxe_roda() {
   FXE_RC=0
   ( cd "$FXE/repo" && ORQ_TESTE=1 ORQ_EXEC_ROOT="$FXE/repo" PATH="$FXE/bin:$PATH" \
-      bash "$FXE/repo/scripts/orquestrador/executor.sh" --ticket "$FXE/repo/docs/fila/901-t.md" ) > "$FXE/saida" 2>&1 || FXE_RC=$?
+      bash "$FXE/repo/scripts/orquestrador/executor.sh" --ticket "$FXE/repo/docs/fila/$FXE_ID-t.md" ) >> "$FXE/saida" 2>&1 || FXE_RC=$?
   return 0
 }
 
-fxe_campo()    { awk '/^```json$/{f=1;next} f&&/^```$/{exit} f' "$FXE/repo/docs/fila/901-t.md" | jq -r "$1"; }
+fxe_campo()    { awk '/^```json$/{f=1;next} f&&/^```$/{exit} f' "$FXE/repo/docs/fila/$FXE_ID-t.md" | jq -r "$1"; }
 fxe_status()   { fxe_campo '.status'; }
 fxe_nota()     { fxe_campo '.notas_status // ""'; }
 fxe_eventos()  { cat "$FXE/repo/docs/fila/runs/events.log" 2>/dev/null || true; }
 fxe_cooldown() { [ -f "$FXE/repo/docs/fila/runs/.cooldown-until" ]; }
-fxe_tentativas() { ls -d "$FXE/repo/docs/fila/runs/901"/attempt-* 2>/dev/null | wc -l | tr -d ' '; }
+fxe_tentativas() { ls -d "$FXE/repo/docs/fila/runs/$FXE_ID"/attempt-* 2>/dev/null | wc -l | tr -d ' '; }
 fxe_limpa()    { [ -n "${FXE:-}" ] && rm -rf "$FXE"; return 0; }
diff --git a/scripts/orquestrador/test-reprovado-sub.sh b/scripts/orquestrador/test-reprovado-sub.sh
new file mode 100644
index 0000000..9165bc0
--- /dev/null
+++ b/scripts/orquestrador/test-reprovado-sub.sh
@@ -0,0 +1,111 @@
+#!/usr/bin/env bash
+# test-reprovado-sub.sh · sub-motivo, escalada e corte de repetição (peça 7b-4).
+#
+# 82 de 82 retries do kit escalaram para opus, porque toda reprovação caía em
+# criterio_qualidade e criterio_qualidade = ESCALAR. Agora o REPROVADO e o RETRY
+# dizem QUAL mérito reprovou (sub=juiz|criterio|gate_<papel>|exit), e só o juiz
+# escala: critério vermelho, gate vermelho e exit repetem com o mesmo modelo.
+# Permissão negada com critério vermelho é mérito e não escala (decisão deste
+# programa, oposta à do patch local do Actus).
+#
+# E o corte: se o 2º REPROVADO do mesmo ticket trouxer o mesmo sub e o mesmo
+# diff=, o ticket vai para bloqueado com motivo=repeticao, sem 3ª volta. O caso
+# é o 461 do Actus: diff 717/717/717, três tentativas pagas, duas em opus.
+#
+#   A. critério vermelho (com permissão negada): REPROVADO sub=criterio, RETRY
+#      com o MESMO modelo; nunca opus.
+#   B. juiz reprovando: REPROVADO sub=juiz, RETRY model=opus.
+#   C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo.
+#   D. trilha fixture do 461 (REPROVADO diff=717 do Actus) + a mesma
+#      reprovação: BLOQUEADO motivo=repeticao na hora, sem RETRY.
+#   E. max_retries vale no TOTAL, não por drenagem: reprovou e adiou numa
+#      execução, na seguinte só restam as tentativas que sobraram.
+#
+# Uso: bash scripts/orquestrador/test-reprovado-sub.sh
+
+set -uo pipefail
+AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
+
+export ORQ_TESTE=1
+ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
+TMP_RAIZ="$(dirname "$ORQ_EXEC_ROOT")"
+# shellcheck source=test-fixture-executor.sh
+source "$AQUI/test-fixture-executor.sh"
+trap 'fxe_limpa; rm -rf "$TMP_RAIZ"' EXIT
+# O fixture mora no KIT (test/fixtures/). Rodado pelo test-shell.sh, este
+# script é a cópia vendorizada no repo de fixture, que não tem test/: o
+# test-shell.sh exporta ORQ_KIT com a raiz do kit.
+FIXTURE_461="${ORQ_KIT:-$(cd "$AQUI/../.." && pwd)}/test/fixtures/trilha/actus-461-reprovado.log"
+
+FALHAS=0
+ok()    { printf '  ok    %s\n' "$*"; }
+falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
+trilha() { fxe_eventos | sed 's/^[^ ]* /  | /'; }
+tem()    { fxe_eventos | grep -Eq "$1"; }
+
+echo "== A. critério vermelho, com permissão negada: mérito, mesmo modelo =="
+fxe_novo '.max_retries = 1'; fxe_criterio falhou; fxe_fila negado:5 negado:6
+fxe_roda
+tem " 901 PERMISSAO_NEGADA " && ok "a permissão negada foi registrada" || falha "sem PERMISSAO_NEGADA"
+tem " 901 REPROVADO motivo=criterio_qualidade sub=criterio " && ok "REPROVADO sub=criterio" || falha "REPROVADO sem sub=criterio"
+tem " 901 RETRY attempt=2 model=sonnet .*sub=criterio" && ok "RETRY com o mesmo modelo (sonnet), sub=criterio" || falha "RETRY não manteve o modelo"
+grep -q 'model=opus' "$FXE/chamadas" && falha "o agente foi chamado em opus" || ok "nenhuma chamada em opus"
+tem " 901 ADIADO " && falha "permissão negada virou adiamento" || ok "não adiou (permissão negada não é ambiente)"
+trilha; fxe_limpa
+
+echo
+echo "== B. juiz reprovando: escala =="
+fxe_novo '.max_retries = 1'
+fxe_juiz '{"aprovado": false, "motivo": "o teste não cobre o caso vazio", "criterios_falhos": []}'
+fxe_fila linhas:5 linhas:6
+fxe_roda
+tem " 901 REPROVADO motivo=criterio_qualidade sub=juiz " && ok "REPROVADO sub=juiz" || falha "REPROVADO sem sub=juiz"
+tem " 901 RETRY attempt=2 model=opus .*sub=juiz" && ok "RETRY model=opus, sub=juiz" || falha "o juiz reprovou e não escalou"
+[ "$(sed -n 2p "$FXE/chamadas")" = "agente model=opus" ] && ok "a 2ª chamada do agente foi em opus" || falha "2ª chamada: $(sed -n 2p "$FXE/chamadas")"
+trilha; fxe_limpa
+
+echo
+echo "== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo =="
+fxe_novo '.max_retries = 1'
+fxe_gate test 'echo " FAIL  test/a.test.ts > soma"; echo " Tests  1 failed | 3 passed (4)"; exit 1'
+fxe_fila linhas:5 linhas:6
+fxe_roda
+tem " 901 REPROVADO motivo=criterio_qualidade sub=gate_testes " && ok "REPROVADO sub=gate_testes" || falha "REPROVADO sem sub=gate_testes"
+tem " 901 RETRY attempt=2 model=sonnet .*sub=gate_testes" && ok "RETRY com o mesmo modelo" || falha "gate vermelho escalou"
+trilha; fxe_limpa
+
+echo
+echo "== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora =="
+FXE_ID=461 fxe_novo '.diff_cap_linhas = 1000'; FXE_ID=461
+cp "$FIXTURE_461" "$FXE/repo/docs/fila/runs/events.log" && ok "trilha fixture do 461 no lugar" || falha "fixture ausente: $FIXTURE_461"
+fxe_criterio falhou; fxe_claude negado:717
+fxe_roda
+tem " 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717" && ok "a reprovação desta execução: sub=criterio diff=717" || falha "reprovação fora do esperado"
+tem " 461 BLOQUEADO motivo=repeticao" && ok "BLOQUEADO motivo=repeticao" || falha "não bloqueou por repetição"
+[ "$(fxe_status)" = bloqueado ] && ok "ticket bloqueado" || falha "status=$(fxe_status)"
+tem " 461 RETRY " && falha "houve RETRY (3ª volta)" || ok "nenhum RETRY"
+[ "$(grep -c . "$FXE/chamadas")" = 1 ] && ok "uma chamada paga só" || falha "$(grep -c . "$FXE/chamadas") chamadas"
+echo "  nota: $(fxe_nota)"
+case "$(fxe_nota)" in *repeti*"diff=717"*) ok "a nota diz repetição e o diff" ;; *) falha "nota sem a repetição" ;; esac
+trilha; fxe_limpa; FXE_ID=901
+
+echo
+echo "== E. max_retries vale no total, não por drenagem =="
+fxe_novo '.max_retries = 2'; fxe_criterio falhou
+fxe_fila linhas:5 503 linhas:6 linhas:7 linhas:8
+fxe_roda
+echo "  --- 1ª execução: tentativas=$(fxe_campo '.tentativas // 0') status=$(fxe_status)"
+[ "$(fxe_status)" = pendente ] && ok "1ª execução: reprovou, adiou, segue pendente" || falha "status=$(fxe_status)"
+[ "$(fxe_campo '.tentativas // 0')" = 1 ] && ok "1 tentativa consumida, persistida no ticket (o adiado devolveu a sua)" || falha "tentativas=$(fxe_campo '.tentativas // 0')"
+fxe_roda
+echo "  --- 2ª execução: tentativas=$(fxe_campo '.tentativas // 0') status=$(fxe_status)"
+n="$(fxe_eventos | grep -c ' 901 REPROVADO ')"
+[ "$n" = 3 ] && ok "3 reprovações no total (max_retries 2 + 1)" || falha "$n reprovações no total"
+tem " 901 INICIO attempt=2 model=sonnet" && ok "a 2ª execução começa em attempt=2" || falha "a 2ª execução recomeçou do zero"
+tem " 901 BLOQUEADO motivo=criterio_qualidade attempt=3" && ok "BLOQUEADO na attempt=3" || falha "não bloqueou na attempt=3"
+tem " 901 INICIO attempt=4 " && falha "houve 4ª tentativa" || ok "nenhuma 4ª tentativa"
+trilha; fxe_limpa
+
+echo
+if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
diff --git a/test/fixtures/trilha/PROCEDENCIA.md b/test/fixtures/trilha/PROCEDENCIA.md
new file mode 100644
index 0000000..9a457ee
--- /dev/null
+++ b/test/fixtures/trilha/PROCEDENCIA.md
@@ -0,0 +1,21 @@
+# `test/fixtures/trilha/` · procedência
+
+## `actus-461-reprovado.log` (peça 7b-4)
+
+Linhas **434 a 437** de `~/Projetos/actus-saas/docs/fila/runs/events.log`
+(arquivo ignorado pelo git do Actus; HEAD do repo na coleta: `f438730`), copiadas
+byte a byte com `sed -n 434,437p` em **2026-09-21**, só leitura. cksum
+`1004446157 411`.
+
+É a primeira tentativa do 461 em 2026-09-15: permissão negada 3 vezes, gates
+verdes, `criterios=3/4` e `REPROVADO motivo=criterio_qualidade attempt=1
+diff=717`. As duas tentativas seguintes, em opus, repetiram `diff=717` e o mesmo
+critério vermelho (linhas 443 e 448). O teste da 7b-4 põe estas quatro linhas
+na trilha do fixture e prova que a próxima reprovação igual (mesmo sub, mesmo
+diff) bloqueia na hora, sem 3ª volta. A linha é do formato de antes da 7b-4,
+sem `sub=`: o sub dela é derivado do GATE da mesma tentativa (`criterios=3/4`
+com typecheck, testes e build ok = `criterio`).
+
+Os outros dois arquivos desta pasta (`events-quebrado.log`,
+`permissao-negada-234.cmd`) são de peças anteriores e têm a procedência nos
+testes que os usam.
diff --git a/test/fixtures/trilha/actus-461-reprovado.log b/test/fixtures/trilha/actus-461-reprovado.log
new file mode 100644
index 0000000..d8a756f
--- /dev/null
+++ b/test/fixtures/trilha/actus-461-reprovado.log
@@ -0,0 +1,4 @@
+2026-09-15T11:46:34-0300 461 INICIO attempt=1 model=sonnet
+2026-09-15T11:52:56-0300 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
+2026-09-15T11:53:34-0300 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
+2026-09-15T11:53:34-0300 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
diff --git a/test/orquestrador-decisao.test.ts b/test/orquestrador-decisao.test.ts
index 300ea06..bb9a00c 100644
--- a/test/orquestrador-decisao.test.ts
+++ b/test/orquestrador-decisao.test.ts
@@ -217,8 +217,13 @@ describe('retry — cap e fronteira MANTÊM modelo, qualidade ESCALA', () => {
     expect(p.acao).toBe(cfg.politica_retry.por_causa.diff_cap?.acao);
   });
 
-  it('POSITIVO: reprovação por qualidade escala para retry_final_model', () => {
-    const v = decidirDesfecho(cfg, sinal({ criteriosFalhos: ['avaliador: X'] }));
+  // Peça 7b-4: o caso "reprovação por qualidade escala" virou três. ESCALAR em
+  // politica_retry vale só para sub=juiz; critério e gate vermelhos repetem com
+  // o mesmo modelo. A força é a mesma: modelo, escalou e estreitarEscopo
+  // afirmados nos três.
+  it('POSITIVO: juiz reprovando (sub=juiz) escala para retry_final_model', () => {
+    const v = decidirDesfecho(cfg, sinal({ criteriosFalhos: ['juiz: X'], juizReprovou: true }));
+    expect(v.sub).toBe('juiz');
     const p = decidirRetry(cfg, v, 0, MODELO);
     expect(p.deveTentar).toBe(true);
     expect(p.modelo).toBe(cfg.retry_final_model);
@@ -226,6 +231,28 @@ describe('retry — cap e fronteira MANTÊM modelo, qualidade ESCALA', () => {
     expect(p.estreitarEscopo).toBe(false);
   });
 
+  it('NEGATIVO: critério vermelho (sub=criterio) repete com o MESMO modelo', () => {
+    const v = decidirDesfecho(cfg, sinal({ criteriosFalhos: ['avaliador: X'] }));
+    expect(v.sub).toBe('criterio');
+    const p = decidirRetry(cfg, v, 0, MODELO);
+    expect(p.deveTentar).toBe(true);
+    expect(p.modelo).toBe(MODELO);
+    expect(p.escalou).toBe(false);
+    expect(p.estreitarEscopo).toBe(false);
+  });
+
+  it('NEGATIVO: gate vermelho (sub=gate_<papel>) repete com o MESMO modelo', () => {
+    const gates = 'ok   typecheck 10ms\nFALHA test 900ms — exit 1\nVEREDITO: REPROVADO\n\n--- recorte de test ---\n FAIL  a.test.ts\n Tests  1 failed | 2 passed (3)\n';
+    const v = decidirDesfecho(cfg, sinal({ criteriosFalhos: ['gates reprovados'], gatesRc: 1, gatesSaida: gates, gatePapelFalho: 'testes' }));
+    expect(v.desfecho).toBe('reprovado');
+    expect(v.sub).toBe('gate_testes');
+    const p = decidirRetry(cfg, v, 0, MODELO);
+    expect(p.deveTentar).toBe(true);
+    expect(p.modelo).toBe(MODELO);
+    expect(p.escalou).toBe(false);
+    expect(p.estreitarEscopo).toBe(false);
+  });
+
   it('config que mandasse escalar por diff_cap é rejeitada, não obedecida', () => {
     const torto = {
       ...cfg,
diff --git a/test/orquestrador-isolamento-teste.test.ts b/test/orquestrador-isolamento-teste.test.ts
index 7e980f2..b0650a0 100644
--- a/test/orquestrador-isolamento-teste.test.ts
+++ b/test/orquestrador-isolamento-teste.test.ts
@@ -35,6 +35,7 @@ const SCRIPTS = [
   'test-causa-adiamento.sh',
   'test-ambiente-adiado.sh',
   'test-adiamentos-limite.sh',
+  'test-reprovado-sub.sh',
 ];
 
 /**
diff --git a/test/orquestrador-sub-repeticao.test.ts b/test/orquestrador-sub-repeticao.test.ts
new file mode 100644
index 0000000..9080107
--- /dev/null
+++ b/test/orquestrador-sub-repeticao.test.ts
@@ -0,0 +1,83 @@
+/**
+ * Peça 7b-4 · sub-motivo, escalada só com sub=juiz, corte de repetição.
+ *
+ * O caso real que fixa a repetição é o 461 do Actus: diff 717 em três
+ * tentativas seguidas, duas delas em opus, o mesmo critério vermelho. As
+ * quatro linhas da trilha real estão em test/fixtures/trilha/actus-461-reprovado.log
+ * (PROCEDENCIA.md ao lado); são do formato de antes da 7b-4, sem `sub=`.
+ */
+import { describe, it, expect } from 'vitest';
+import { readFileSync } from 'node:fs';
+import { join } from 'node:path';
+import { decidirDesfecho, decidirRetry, ehRepeticao, subDaLinha, subDoSinal, type DecisaoConfig, type SinalTentativa } from '../scripts/orquestrador/decisao.js';
+
+const CONFIG = {
+  executor_model: 'sonnet', avaliador_model: 'opus', retry_final_model: 'opus', max_retries: 2, diff_cap_linhas: 600,
+  worktrees_prefixo: 'fx-',
+  restricao_execucao: { ativa: false, tickets_permitidos: [], acao_ticket_fora_da_allowlist: 'x', recusa_exit_code: 78, recusa_mensagem: 'x' },
+  politica_adiamento: { causas_que_adiam: ['rate limit', 'timeout', 'gate interrompido no meio'] },
+  politica_retry: { por_causa: { diff_cap: { modelo: 'MANTER', acao: 'x' }, enforcement: { modelo: 'MANTER', acao: 'x' }, criterio_qualidade: { modelo: 'ESCALAR', acao: 'x' } } },
+} as DecisaoConfig;
+const sinal = (s: Partial<SinalTentativa> = {}): SinalTentativa => ({ exitCode: 0, saida: '', diffLines: 10, ...s });
+const TRILHA_461 = readFileSync(join(__dirname, 'fixtures', 'trilha', 'actus-461-reprovado.log'), 'utf8').split('\n').filter(Boolean);
+
+describe('subDoSinal: qual mérito reprovou', () => {
+  it('gate > juiz > critério > exit', () => {
+    expect(subDoSinal(sinal({ gatesRc: 1, gatePapelFalho: 'typecheck', criteriosFalhos: ['x'] }))).toBe('gate_typecheck');
+    expect(subDoSinal(sinal({ juizReprovou: true, criteriosFalhos: ['juiz: x'] }))).toBe('juiz');
+    expect(subDoSinal(sinal({ criteriosFalhos: ['o arquivo existe'] }))).toBe('criterio');
+    expect(subDoSinal(sinal({ exitCode: 2 }))).toBe('exit');
+  });
+
+  it('permissão negada com critério vermelho é mérito (sub=criterio) e NÃO escala', () => {
+    const s = sinal({ criteriosFalhos: ['o arquivo existe'], saida: '{"permission_denials":[{"tool_name":"Bash"}]}' });
+    const v = decidirDesfecho(CONFIG, s);
+    expect(v.desfecho).toBe('reprovado');
+    expect(v.sub).toBe('criterio');
+    const p = decidirRetry(CONFIG, v, 0, 'sonnet');
+    expect(p.modelo).toBe('sonnet');
+    expect(p.escalou).toBe(false);
+  });
+
+  it('exit != 0 sem critério: sub=exit, mesmo modelo', () => {
+    const v = decidirDesfecho(CONFIG, sinal({ exitCode: 2, saida: 'erro qualquer' }));
+    expect(v.sub).toBe('exit');
+    expect(decidirRetry(CONFIG, v, 0, 'sonnet').escalou).toBe(false);
+  });
+});
+
+describe('subDaLinha: o sub normalizado, com ou sem `sub=` na linha', () => {
+  it('linha nova: lê o sub= dela', () => {
+    expect(subDaLinha(['t 9 REPROVADO motivo=criterio_qualidade sub=gate_build attempt=1 diff=3'], 0)).toBe('gate_build');
+  });
+  it('linha do 461 (sem sub=): derivado do GATE da mesma tentativa, criterios=3/4 -> criterio', () => {
+    expect(TRILHA_461[3]).toContain('REPROVADO motivo=criterio_qualidade attempt=1 diff=717');
+    expect(subDaLinha(TRILHA_461, 3)).toBe('criterio');
+  });
+  it('GATE com testes=falha -> gate_testes; JUIZ reprovado -> juiz', () => {
+    const a = ['t 9 INICIO attempt=1', 't 9 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=ok', 't 9 REPROVADO motivo=criterio_qualidade attempt=1 diff=5'];
+    expect(subDaLinha(a, 2)).toBe('gate_testes');
+    const b = ['t 9 INICIO attempt=1', 't 9 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=ok', 't 9 JUIZ veredito=reprovado classe=alto', 't 9 REPROVADO motivo=criterio_qualidade attempt=1 diff=5'];
+    expect(subDaLinha(b, 3)).toBe('juiz');
+  });
+});
+
+describe('ehRepeticao: a 2ª reprovação igual corta', () => {
+  it('o 461: mesmo sub (criterio) e mesmo diff (717) repete', () => {
+    expect(ehRepeticao(TRILHA_461, 'criterio', 717)).toBe(true);
+  });
+  it('diff diferente (684) não repete; sub diferente não repete', () => {
+    expect(ehRepeticao(TRILHA_461, 'criterio', 684)).toBe(false);
+    expect(ehRepeticao(TRILHA_461, 'juiz', 717)).toBe(false);
+  });
+  it('ADIADO no meio não quebra a série; BLOQUEADO, APROVADO e MERGE quebram', () => {
+    expect(ehRepeticao([...TRILHA_461, 't 461 ADIADO motivo=servidor attempt=2 rc=1 dur=3s cooldown=nao'], 'criterio', 717)).toBe(true);
+    for (const ev of ['BLOQUEADO motivo=criterio_qualidade attempt=3', 'APROVADO merge=aguardando', 'MERGE alvo=staging-auto sha=abc']) {
+      expect(ehRepeticao([...TRILHA_461, `t 461 ${ev}`], 'criterio', 717), ev).toBe(false);
+    }
+  });
+  it('sem reprovação anterior, nada repete', () => {
+    expect(ehRepeticao([], 'criterio', 717)).toBe(false);
+    expect(ehRepeticao(TRILHA_461.slice(0, 3), 'criterio', 717)).toBe(false);
+  });
+});
diff --git a/test/orquestrador-tools-derivadas.test.ts b/test/orquestrador-tools-derivadas.test.ts
index d0f79d1..fd66079 100644
--- a/test/orquestrador-tools-derivadas.test.ts
+++ b/test/orquestrador-tools-derivadas.test.ts
@@ -217,9 +217,10 @@ describe('morte inesperada do executor deixa rastro (peça 0c, item 3)', () => {
     // sétimo é o trap de sinal (peça 12), que marca para o trap de EXIT não
     // registrar a mesma morte duas vezes: uma morte, um registro. O oitavo é a
     // recusa de preflight (peça 7b-2), que virou ADIADO motivo=preflight em vez
-    // de EXECUTOR_MORREU.
+    // de EXECUTOR_MORREU. O nono é o bloqueio por repetição (peça 7b-4).
     const n = (exec.match(/DESFECHO_NOMEADO=1/g) ?? []).length;
-    expect(n).toBe(8);
+    expect(n).toBe(9);
+    expect(exec).toMatch(/event "\$id" BLOQUEADO "motivo=repeticao"[\s\S]{0,300}DESFECHO_NOMEADO=1/);
     expect(/trap_sinal\(\) \{[\s\S]*?\n\}/.exec(exec)![0]).toContain('DESFECHO_NOMEADO=1');
     expect(/preflight_ou_adia\(\) \{[\s\S]*?\n\}/.exec(exec)![0]).toContain('DESFECHO_NOMEADO=1');
   });
diff --git a/test/orquestrador-trilha.test.ts b/test/orquestrador-trilha.test.ts
index 082a51c..4d88d1b 100644
--- a/test/orquestrador-trilha.test.ts
+++ b/test/orquestrador-trilha.test.ts
@@ -170,8 +170,12 @@ describe('trilha e STATUS contam a primeira tentativa como 1', () => {
   // attempt-0 e destruiu o prompt e a saída da tentativa que o juiz reprovou.
   // Agora o diretório é nomeado por um SLOT contínuo lido do disco, e é o campo
   // `dir` do meta.json que amarra contador a diretório.
+  // Peça 7b-4: o contador de retry passou a ser PERSISTIDO no ticket (começa em
+  // `attempt0`, não em 0), e o diretório desconta o ponto de partida para
+  // continuar nomeado só pelo slot contínuo desta rodada.
   it('o DIRETÓRIO é nomeado pelo slot contínuo, nunca pelo contador de retry', () => {
-    expect(exec).toContain('rundir="$RUNS_BASE/$id/attempt-$((slot + attempt))"');
+    expect(exec).toContain('rundir="$RUNS_BASE/$id/attempt-$((slot + attempt - attempt0))"');
+    expect(exec).toContain('attempt="$(ticket_tentativas "$file")"; attempt0="$attempt"');
     expect(exec).not.toContain('rundir="$RUNS_BASE/$id/attempt-$attempt"');
     expect(exec).toMatch(/slot_base_attempt\(\) \{/);
   });
```

## 7b-5 · aviso de AMBIENTE só na transição

sha: `052ac50`

### Vermelho

```
== 1. três disparos em AMBIENTE: um aviso ==
  --- disparo 1 (preflight): avisos=1
  --- disparo 2 (preflight): avisos=2
  --- disparo 3 (preflight): avisos=3
  ok    3 drenagens em AMBIENTE
  FALHA 3 avisos em 3 disparos
  FALHA aviso: 2026-09-21T13:34:21-0300 | Orquestrador CI: 0 aprovados, 0 bloqueados | duração 0min · adiados 2 · último: —
2026-09-21T13:34:22-0300 | Orquestrador CI: 0 aprovados, 0 bloqueados | duração 0min · adiados 2 · último: —
2026-09-21T13:34:22-0300 | Orquestrador CI: 0 aprovados, 0 bloqueados | duração 0min · adiados 2 · último: —
  | 2026-09-21T13:34:21-0300 | Orquestrador CI: 0 aprovados, 0 bloqueados | duração 0min · adiados 2 · último: —
  | 2026-09-21T13:34:22-0300 | Orquestrador CI: 0 aprovados, 0 bloqueados | duração 0min · adiados 2 · último: —
  | 2026-09-21T13:34:22-0300 | Orquestrador CI: 0 aprovados, 0 bloqueados | duração 0min · adiados 2 · último: —

== 2. o 4º disparo, saudável: um aviso de saída ==
  --- disparo 4 (aprova): avisos=4
  ok    exatamente 1 aviso novo
  FALHA último aviso: 2026-09-21T13:34:23-0300 | Orquestrador CI: 3 aprovados, 0 bloqueados | duração 0min · adiados 0 · último: 903 DONE 13:34:23 (merge em staging-auto)
  ok    com o placar da drenagem (3 aprovados)
  | 2026-09-21T13:34:23-0300 | Orquestrador CI: 3 aprovados, 0 bloqueados | duração 0min · adiados 0 · último: 903 DONE 13:34:23 (merge em staging-auto)

== 3. o 5º disparo, saudável e sem nada: sem aviso de saída de novo ==
  --- disparo 5 (aprova): avisos=5
  ok    nenhum aviso de ambiente repetido

3 CHECK(S) FALHARAM
rc=1
```

### Verde

```
== 1. três disparos em AMBIENTE: um aviso ==
  --- disparo 1 (preflight): avisos=1
  --- disparo 2 (preflight): avisos=1
  --- disparo 3 (preflight): avisos=1
  ok    3 drenagens em AMBIENTE
  ok    1 aviso em 3 disparos
  ok    o aviso fala de ambiente
  | 2026-09-21T13:34:45-0300 | Orquestrador: AMBIENTE, a fila parou | a mesma causa em dois tickets não é do ticket: ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>). Nada somou nem bloqueou; avisa de novo quando sair.

== 2. o 4º disparo, saudável: um aviso de saída ==
  --- disparo 4 (aprova): avisos=2
  ok    exatamente 1 aviso novo
  ok    é o aviso de SAÍDA do ambiente
  ok    com o placar da drenagem (3 aprovados)
  | 2026-09-21T13:34:46-0300 | Orquestrador: ambiente normalizado, 3 aprovados, 0 bloqueados | saiu de AMBIENTE (ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>)) · duração 0min · adiados 0

== 3. o 5º disparo, saudável e sem nada: sem aviso de saída de novo ==
  --- disparo 5 (aprova): avisos=3
  ok    nenhum aviso de ambiente repetido

TODOS OS CHECKS PASSARAM
rc=0
```

### Diff

```
commit 052ac5012dbaaf8f62ec8c0a226784e42f7fa6c2
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Mon Sep 21 13:36:23 2026 -0300

    7b-5: o aviso de AMBIENTE só na transição
    
    - lib.sh: transicao_ambiente (entrou | calado | saiu) com memória em
      runs/.notificacao-ambiente, como a da fila vazia; pausa não conta como saída.
    - local-loop.sh: avisa ao entrar em AMBIENTE com a causa, cala nas drenagens
      seguintes, e a drenagem que sai manda UM aviso de saída com o placar (no
      lugar do cartão de fim).
    - test-notificacao-ambiente.sh: 3 disparos em ambiente = 1 aviso; o 4º
      saudável = 1 aviso de saída.
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
---
 scripts/kit/test-shell.sh                         |  3 +-
 scripts/orquestrador/lib.sh                       | 33 ++++++++++
 scripts/orquestrador/local-loop.sh                | 32 +++++++--
 scripts/orquestrador/test-notificacao-ambiente.sh | 79 +++++++++++++++++++++++
 test/orquestrador-isolamento-teste.test.ts        |  1 +
 5 files changed, 142 insertions(+), 6 deletions(-)

diff --git a/scripts/kit/test-shell.sh b/scripts/kit/test-shell.sh
index eb0d99d..fc51fff 100644
--- a/scripts/kit/test-shell.sh
+++ b/scripts/kit/test-shell.sh
@@ -27,6 +27,7 @@
 #   test-ambiente-adiado.sh         a régua de AMBIENTE vale sobre o ADIADO sem cooldown (7b-2)
 #   test-adiamentos-limite.sh       teto de adiamentos seguidos, com a causa real na nota (7b-3)
 #   test-reprovado-sub.sh           sub-motivo, escalada só com juiz, repetição, tentativas persistidas (7b-4)
+#   test-notificacao-ambiente.sh    o aviso de AMBIENTE só na entrada e na saída (7b-5)
 #
 # Cada um monta o PRÓPRIO `ORQ_EXEC_ROOT` num `mktemp -d` (drenagem e retry) ou
 # trabalha direto no checkout (lib-config); nada aqui precisa exportar
@@ -45,7 +46,7 @@ KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
 # Os testes que leem fixture versionada do kit (test/fixtures/) a acham por aqui:
 # rodando da cópia vendorizada no repo de fixture, `$AQUI/../..` não é o kit.
 export ORQ_KIT="$KIT"
-SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh test-adiamentos-limite.sh test-reprovado-sub.sh'
+SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh test-adiamentos-limite.sh test-reprovado-sub.sh test-notificacao-ambiente.sh'
 
 FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
   printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
diff --git a/scripts/orquestrador/lib.sh b/scripts/orquestrador/lib.sh
index 2d7114c..4419b96 100755
--- a/scripts/orquestrador/lib.sh
+++ b/scripts/orquestrador/lib.sh
@@ -988,6 +988,39 @@ deve_notificar() {
   return 0
 }
 
+# --- PEÇA 7b-5: AMBIENTE avisa na transição, e só nela -----------------------
+# Desde a 7a-8 a drenagem que termina em AMBIENTE conta os adiados como
+# processados, e a regra 1 acima notificava toda drenagem assim: com o ambiente
+# quebrado, um cartão por disparo. A regra agora é a da fila vazia, com memória
+# em disco: avisa quando ENTRA, cala enquanto continua, avisa uma vez quando SAI.
+NOTIF_AMBIENTE_FILE="$RUNS_BASE/.notificacao-ambiente"
+
+# transicao_ambiente <motivo_ocioso> [causa] -> imprime o que a drenagem faz:
+#   entrou  terminou em ambiente e não estava: avisa (e grava a causa)
+#   calado  terminou em ambiente e já estava: silêncio
+#   saiu    não terminou em ambiente e estava: um aviso de saída (e apaga)
+#   (vazio) nada a ver com ambiente: segue a regra de sempre (deve_notificar)
+# Pausa não conta como saída: quem pausou já sabe, e o ambiente pode seguir
+# quebrado atrás da pausa.
+transicao_ambiente() {
+  local motivo="${1:-}" causa="${2:-}"
+  if [ "$motivo" = ambiente ]; then
+    if [ -e "$NOTIF_AMBIENTE_FILE" ]; then echo calado; return 0; fi
+    mkdir -p "$RUNS_BASE" 2>/dev/null || true
+    printf '%s\n' "$causa" > "$NOTIF_AMBIENTE_FILE" 2>/dev/null || true
+    echo entrou; return 0
+  fi
+  [ "$motivo" != pausado ] || return 0
+  if [ -e "$NOTIF_AMBIENTE_FILE" ]; then
+    rm -f "$NOTIF_AMBIENTE_FILE" 2>/dev/null || true
+    echo saiu
+  fi
+  return 0
+}
+
+# causa_ambiente_avisada -> a causa gravada na entrada (para o aviso de saída).
+causa_ambiente_avisada() { head -1 "$NOTIF_AMBIENTE_FILE" 2>/dev/null || true; }
+
 # notificar <titulo> <corpo> — a ENTREGA, sem nenhuma regra de quando notificar.
 #
 # Extraída do `notificar_fim` na peça K11a-2, sem mudar um byte do que ela faz:
diff --git a/scripts/orquestrador/local-loop.sh b/scripts/orquestrador/local-loop.sh
index 5a0ecbc..86764e9 100755
--- a/scripts/orquestrador/local-loop.sh
+++ b/scripts/orquestrador/local-loop.sh
@@ -630,11 +630,33 @@ EOF
   mortos=$(( $(contar_eventos EXECUTOR_MORREU) - mortos_antes ))
   [ "$mortos" -ge 0 ] || mortos=0
   processados=$(( drenados + bloqueados + adiados + refatiados + sem_progresso + mortos ))
-  if deve_notificar "$processados" "$motivo_ocioso"; then
-    notificar_fim "$drenados" "$bloqueados" "$adiados" "$dur"
-  else
-    say "notificação: nada a notificar (0 processados, motivo '${motivo_ocioso:-—}') — silêncio"
-  fi
+  # Peça 7b-5: AMBIENTE avisa na entrada e na saída, e cala no meio. A causa da
+  # entrada é lida ANTES da transição, que apaga a memória na saída.
+  local causa_avisada trans
+  causa_avisada="$(causa_ambiente_avisada)"
+  trans="$(transicao_ambiente "$motivo_ocioso" "$ambiente_causa")"
+  case "$trans" in
+    entrou)
+      notificar "Orquestrador: AMBIENTE, a fila parou" \
+        "a mesma causa em dois tickets não é do ticket: $ambiente_causa. Nada somou nem bloqueou; avisa de novo quando sair."
+      ;;
+    calado)
+      say "notificação: drenagem ainda em AMBIENTE, já avisado — silêncio" ;;
+    saiu)
+      # Um aviso só, e ele carrega o placar: a drenagem que tirou a fila do
+      # ambiente não manda também o cartão de fim. A memória da fila vazia é
+      # mantida pela mesma chamada de sempre, sem notificar por ela.
+      deve_notificar "$processados" "$motivo_ocioso" >/dev/null 2>&1 || true
+      notificar "Orquestrador: ambiente normalizado, $drenados aprovados, $bloqueados bloqueados" \
+        "saiu de AMBIENTE (${causa_avisada:-causa não registrada}) · duração ${dur}min · adiados $adiados"
+      ;;
+    *)
+      if deve_notificar "$processados" "$motivo_ocioso"; then
+        notificar_fim "$drenados" "$bloqueados" "$adiados" "$dur"
+      else
+        say "notificação: nada a notificar (0 processados, motivo '${motivo_ocioso:-—}') — silêncio"
+      fi ;;
+  esac
 }
 
 cleanup_frente() {
diff --git a/scripts/orquestrador/test-notificacao-ambiente.sh b/scripts/orquestrador/test-notificacao-ambiente.sh
new file mode 100644
index 0000000..f8e9b6c
--- /dev/null
+++ b/scripts/orquestrador/test-notificacao-ambiente.sh
@@ -0,0 +1,79 @@
+#!/usr/bin/env bash
+# test-notificacao-ambiente.sh · o aviso de AMBIENTE só na transição (peça 7b-5).
+#
+# Desde a 7a-8 a drenagem que termina em AMBIENTE conta os adiados como
+# processados, e a peça 13 notifica toda drenagem que processou: com o ambiente
+# quebrado, um cartão a cada disparo, e cartão repetido treina o operador a
+# ignorar o que importa. A regra agora é a da fila vazia: avisa quando ENTRA em
+# AMBIENTE, cala nas drenagens seguintes que terminam no mesmo estado, e avisa
+# UMA vez quando sai.
+#
+#   1. 3 disparos em AMBIENTE -> 1 aviso (o de entrada).
+#   2. o 4º disparo, saudável -> 1 aviso, o de saída (com o placar da drenagem).
+#   3. o 5º disparo, saudável -> volta à regra de sempre, sem aviso de saída.
+#
+# Uso: bash scripts/orquestrador/test-notificacao-ambiente.sh
+
+set -uo pipefail
+AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
+
+export ORQ_TESTE=1
+ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
+TMP="$(dirname "$ORQ_EXEC_ROOT")"
+trap 'rm -rf "$TMP"' EXIT
+# shellcheck source=test-fixture-drenagem.sh
+source "$AQUI/test-fixture-drenagem.sh"
+fx_config "$ORQ_EXEC_ROOT"
+for id in 901 902 903; do fx_ticket "$ORQ_EXEC_ROOT" "$id"; done
+fx_git "$ORQ_EXEC_ROOT"
+LOCAL_LOOP_SOURCED=1
+# shellcheck source=local-loop.sh
+source "$AQUI/local-loop.sh"
+set +e
+
+FALHAS=0
+ok()    { printf '  ok    %s\n' "$*"; }
+falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
+
+FILA="$ORQ_EXEC_ROOT/docs/fila"
+NOTIF="$FILA/runs/notificacoes.log"
+MODO="$TMP/modo"   # preflight | aprova
+ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
+merge_em_alvo() { return 0; }
+cleanup_frente() { return 0; }
+run_executor_once() {
+  local f="$2" id; id="$(ticket_field "$2" '.id')"
+  case "$(cat "$MODO")" in
+    preflight) event "$id" ADIADO "motivo=preflight" "causa=preflight: árvore de execução suja em $ORQ_EXEC_ROOT (vez do $id)" ;;
+    aprova)    ticket_set_status "$f" aguardando_merge; ticket_commit "$f" "stub: $id aprovado"
+               event "$id" APROVADO "merge=aguardando" "dur=30s" "attempt=1" ;;
+  esac
+  return 0
+}
+avisos() { grep -c . "$NOTIF" 2>/dev/null || true; }
+disparo() { drenar > "$TMP/out.$1" 2>&1; echo "  --- disparo $1 ($(cat "$MODO")): avisos=$(avisos)"; }
+
+echo "== 1. três disparos em AMBIENTE: um aviso =="
+echo preflight > "$MODO"
+for d in 1 2 3; do disparo "$d"; done
+[ "$(grep -c ' AMBIENTE ' "$FILA/runs/events.log")" = 3 ] && ok "3 drenagens em AMBIENTE" || falha "AMBIENTE: $(grep -c ' AMBIENTE ' "$FILA/runs/events.log")"
+[ "$(avisos)" = 1 ] && ok "1 aviso em 3 disparos" || falha "$(avisos) avisos em 3 disparos"
+grep -qi 'ambiente' "$NOTIF" 2>/dev/null && ok "o aviso fala de ambiente" || falha "aviso: $(cat "$NOTIF" 2>/dev/null)"
+sed 's/^/  | /' "$NOTIF" 2>/dev/null
+
+echo
+echo "== 2. o 4º disparo, saudável: um aviso de saída =="
+echo aprova > "$MODO"; antes="$(avisos)"; disparo 4
+[ "$(avisos)" = $((antes + 1)) ] && ok "exatamente 1 aviso novo" || falha "$(( $(avisos) - antes )) avisos novos"
+tail -1 "$NOTIF" | grep -qi 'ambiente' && ok "é o aviso de SAÍDA do ambiente" || falha "último aviso: $(tail -1 "$NOTIF")"
+tail -1 "$NOTIF" | grep -q '3 aprovados' && ok "com o placar da drenagem (3 aprovados)" || falha "sem o placar: $(tail -1 "$NOTIF")"
+tail -1 "$NOTIF" | sed 's/^/  | /'
+
+echo
+echo "== 3. o 5º disparo, saudável e sem nada: sem aviso de saída de novo =="
+antes="$(avisos)"; disparo 5
+tail -1 "$NOTIF" | grep -qi 'ambiente' && [ "$(avisos)" != "$antes" ] && falha "repetiu o aviso de saída" || ok "nenhum aviso de ambiente repetido"
+
+echo
+if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
diff --git a/test/orquestrador-isolamento-teste.test.ts b/test/orquestrador-isolamento-teste.test.ts
index b0650a0..a2f7769 100644
--- a/test/orquestrador-isolamento-teste.test.ts
+++ b/test/orquestrador-isolamento-teste.test.ts
@@ -36,6 +36,7 @@ const SCRIPTS = [
   'test-ambiente-adiado.sh',
   'test-adiamentos-limite.sh',
   'test-reprovado-sub.sh',
+  'test-notificacao-ambiente.sh',
 ];
 
 /**
```

## 7b-7 · RunAtLoad true (ajuste c)

sha: `27177af`. Template do kit antes: `com.orquestrador.plist.template:67-68`, `<false/>`.

### Vermelho

```
   × RunAtLoad true (peça 7b-7) > o template traz RunAtLoad <true/>, e não <false/> 2ms
   × RunAtLoad true (peça 7b-7) > o plist INSTALADO (bootstrap no stub, HOME descartável) sai com RunAtLoad true 49ms
AssertionError: expected '<?xml version="1.0" encoding="UTF-8"?…' to match /<key>RunAtLoad<\/ke…/key>\s*\n\s*<true\
AssertionError: expected '<?xml version="1.0" encoding="UTF-8"?…' to match /<key>RunAtLoad<\/ke…/key>\s*\n\s*<true\
      Tests  2 failed (2)
rc=1
```

### Verde

```
 ✓ test/orquestrador-runatload.test.ts (2 tests) 110ms
      Tests  2 passed (2)
rc=0
```

### Diff

```
commit 27177af89df35ce222887340e14e3c9c3c8f0ee6
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Mon Sep 21 13:38:00 2026 -0300

    7b-7: RunAtLoad true no template do plist
    
    Porte do 5791209 do Actus: com RunAtLoad false, o bootstrap de cada instalação
    carregava o job sem disparar, e o primeiro tick só vinha um StartInterval
    depois. Teste com o launchctl stubado e HOME descartável: o template e o plist
    instalado saem com <true/>, e o caminho continua sem kickstart -k.
    
    docs/launchd.md (fora do escopo desta etapa) ainda mostra o exemplo com
    RunAtLoad false; fica para a 7c.
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
---
 .../orquestrador/com.orquestrador.plist.template   |  5 ++-
 test/orquestrador-runatload.test.ts                | 51 ++++++++++++++++++++++
 2 files changed, 55 insertions(+), 1 deletion(-)

diff --git a/scripts/orquestrador/com.orquestrador.plist.template b/scripts/orquestrador/com.orquestrador.plist.template
index 885dc8d..dc7c34e 100644
--- a/scripts/orquestrador/com.orquestrador.plist.template
+++ b/scripts/orquestrador/com.orquestrador.plist.template
@@ -64,8 +64,11 @@
   <key>StartInterval</key>
   <integer>{{START_INTERVAL}}</integer>
 
+  <!-- RunAtLoad true (peca 7b-7, porte do 5791209 do Actus): com false, o
+       bootstrap de cada instalacao carrega o job e nao dispara nada, e o
+       primeiro tick so vem um StartInterval inteiro depois. -->
   <key>RunAtLoad</key>
-  <false/>
+  <true/>
 
   <key>StandardOutPath</key>
   <string>{{CHECKOUT}}/docs/fila/runs/launchd-agent.log</string>
diff --git a/test/orquestrador-runatload.test.ts b/test/orquestrador-runatload.test.ts
new file mode 100644
index 0000000..737c3d7
--- /dev/null
+++ b/test/orquestrador-runatload.test.ts
@@ -0,0 +1,51 @@
+/**
+ * Peça 7b-7 · RunAtLoad true no template do plist.
+ *
+ * O Actus consertou isto direto no motor dele em 5791209 (2026-09-12, "agente
+ * ficava mudo após cada bootstrap"): com RunAtLoad false, o `bootstrap` que o
+ * instalar-launchd.sh faz a cada instalação ou atualização carrega o job e não
+ * dispara nada; o primeiro tick só vem depois de um StartInterval inteiro
+ * (3600 s no CI), e quem acabou de instalar lê o silêncio como falha. O kit
+ * ainda entregava <false/>.
+ *
+ * Tudo com o `launchctl` STUBADO (test/fixtures/bin/launchctl) e HOME
+ * descartável: nenhum caminho deste arquivo alcança o launchd de verdade.
+ */
+import { describe, it, expect } from 'vitest';
+import { readFileSync, rmSync } from 'node:fs';
+import { join } from 'node:path';
+import { spawnSync } from 'node:child_process';
+import { REPO_ROOT, checkoutReal, comLaunchctlStub } from './fixtures/orq-harness.js';
+
+const FX = checkoutReal();
+const INSTALADOR_FX = join(FX, 'scripts', 'orquestrador', 'instalar-launchd.sh');
+const TEMPLATE = join(REPO_ROOT, 'scripts', 'orquestrador', 'com.orquestrador.plist.template');
+const LABEL_FX = JSON.parse(readFileSync(join(FX, 'docs', 'fila', '000-config.json'), 'utf8')).launchd.label as string;
+const RUN_AT_LOAD_TRUE = /<key>RunAtLoad<\/key>\s*\n\s*<true\/>/;
+
+describe('RunAtLoad true (peça 7b-7)', () => {
+  it('o template traz RunAtLoad <true/>, e não <false/>', () => {
+    const t = readFileSync(TEMPLATE, 'utf8');
+    expect(t).toMatch(RUN_AT_LOAD_TRUE);
+    expect(t).not.toMatch(/<key>RunAtLoad<\/key>\s*\n\s*<false\/>/);
+  });
+
+  it('o plist INSTALADO (bootstrap no stub, HOME descartável) sai com RunAtLoad true', () => {
+    const stub = comLaunchctlStub();
+    const gerado = join(FX, 'scripts', 'orquestrador', `${LABEL_FX}.plist`);
+    let r: ReturnType<typeof spawnSync>;
+    try {
+      r = spawnSync('bash', [INSTALADOR_FX, '--permitir-tmp'], { encoding: 'utf8', cwd: FX, env: { ...process.env, ...stub.env } });
+    } finally {
+      rmSync(gerado, { force: true });
+    }
+    expect(r.status, `${r.stdout}${r.stderr}`).toBe(0);
+    const instalado = readFileSync(join(stub.home, 'Library', 'LaunchAgents', `${LABEL_FX}.plist`), 'utf8');
+    expect(instalado).toMatch(RUN_AT_LOAD_TRUE);
+    // O caminho foi o de sempre (print, bootout, bootstrap), e nunca kickstart -k:
+    // com RunAtLoad true é o bootstrap que dispara o primeiro tick.
+    const chamadas = stub.chamadas();
+    expect(chamadas.some((c) => c.startsWith('bootstrap gui/'))).toBe(true);
+    expect(chamadas.some((c) => /kickstart/.test(c))).toBe(false);
+  });
+});
```

## 7b-6 · docs

sha: `470c237`. Sem vermelho (é documentação); vitest completo verde depois dela (1161/1161).

### Diff

```
commit 470c2378e5626b1142771ec9acc9c2db9de99ad6
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Mon Sep 21 13:39:53 2026 -0300

    7b-6: docs da etapa 7b (PECAS, CHANGELOG e CONTRATO)
    
    - PECAS: 7b-1 a 7b-5 e 7b-7 em FEITAS, com sha, evidência e teste.
    - CHANGELOG: seção da etapa 7b.
    - CONTRATO §4.1: ADIADO com rc/dur/cooldown e motivo=preflight causa=;
      REPROVADO e RETRY com sub=; BLOQUEADO motivo=repeticao e motivo=adiamentos;
      tentativas no ticket; notificação de AMBIENTE na transição. §8:
      adiamentos_limite e os 7 rótulos que ligam 9 causas. §9.4: RunAtLoad true.
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
---
 CHANGELOG.md  | 25 +++++++++++++++++
 CONTRATO.md   | 89 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
 docs/PECAS.md | 58 ++++++++++++++++++++++++++++++++++++++
 3 files changed, 168 insertions(+), 4 deletions(-)

diff --git a/CHANGELOG.md b/CHANGELOG.md
index b4b2380..8be3db9 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -630,3 +630,28 @@ O que o CI faz diferente: a primeira drenagem depois da instalação grava um `O
 os 4 pendentes (medido sobre uma cópia da fila, com o `git status` do CI em 0 linhas antes e
 depois), e um ticket que abortar antes do agente para de segurar a fila e, no terceiro
 disparo, vai para `bloqueado`. Relatório: `~/orq-sessoes/relatorio-kit-etapa7a.md`.
+
+### Etapa 7b · decisão e custo
+
+O que decide cada desfecho. Números de 22/08 a 21/09: 82 de 82 retries do kit escalaram para
+opus, o Actus gastou US$ 9,28 por ticket aprovado (US$ 3,06 no CI), todo adiamento armava
+60 min de cooldown e adiamento não tinha teto.
+
+- **7b-1** `a28fe81`: nenhum teste do kit lê arquivo vivo de outro repo. Configs, amostras de
+  fila e o ticket 306 viram fixtures datadas; a (c) do `test-instalar.sh` só com
+  `ORQ_CI_CHECKOUT`. As 3 falhas antigas saem.
+- **7b-2** `cfb5cf3`: cooldown só para limite remoto; `servidor` (5xx) e `gate_crash` adiam sem
+  cooldown e sem escalar; recusa de preflight vira `ADIADO motivo=preflight`; AMBIENTE vale
+  sobre o adiado sem cooldown.
+- **7b-3** `dd3ecd7`: teto de adiamentos (`adiamentos_limite`, padrão 4), com a causa real
+  (rc e duração) na nota; rc 124 curto não é timeout.
+- **7b-4** `ffab528`: `sub=` no REPROVADO e no RETRY, escalada só com `sub=juiz`, corte de
+  repetição, tentativas persistidas no ticket (max_retries no total).
+- **7b-5** `052ac50`: aviso de AMBIENTE só na entrada e na saída.
+- **7b-7** `27177af`: `RunAtLoad` true no template do plist.
+- **7b-6**: PECAS, este CHANGELOG e o CONTRATO.
+
+O que o CI faz diferente, ao atualizar: um 503 ou um timeout deixam de parar a fila por uma
+hora; um gate cujo runner não roda adia em vez de gastar retry em opus; um critério vermelho
+repete em sonnet; o 4º adiamento seguido do mesmo ticket o bloqueia com a causa; o job do
+launchd dispara no bootstrap. Relatório: `~/orq-sessoes/relatorio-kit-etapa7b.md`.
diff --git a/CONTRATO.md b/CONTRATO.md
index e82da8c..f10d7c4 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -175,10 +175,10 @@ Estes, e só estes, são emitidos hoje (`grep -rn '^\s*event ' scripts/`):
 | `GATE` | `executor.sh:539` | ver §4.2 |
 | `JUIZ` | `executor.sh:615,623` | `veredito=aprovado\|reprovado\|ilegivel` `classe=` `modelo=` `attempt=` |
 | `APROVADO` | `executor.sh:1048` | `merge=aguardando` `dur=` `attempt=` |
-| `REPROVADO` | `executor.sh:1057` | `motivo=` `attempt=` `diff=` |
-| `ADIADO` | `executor.sh:1039` | `motivo=` `attempt=` |
-| `BLOQUEADO` | `executor.sh:1064`, `local-loop.sh:drenar` | `motivo=` [`attempt=`] · da drenagem: `motivo=merge_falhou`, ou `motivo=sem_progresso` `n=` `limite=` |
-| `RETRY` | `executor.sh:1077` | `attempt=` `model=` `motivo=` |
+| `REPROVADO` | `executor.sh:drive_ticket` | `motivo=` `sub=` `attempt=` `diff=` (`sub=` desde a 7b-4) |
+| `ADIADO` | `executor.sh:drive_ticket`, `executor.sh:preflight_ou_adia` | `motivo=` `attempt=` `rc=` `dur=` `cooldown=sim\|nao` · recusa de preflight: `motivo=preflight` `causa=<uma linha>` (a causa vai até o fim da linha) |
+| `BLOQUEADO` | `executor.sh:drive_ticket`, `local-loop.sh:drenar` | `motivo=` [`attempt=`] · repetição: `motivo=repeticao` `sub=` `diff=` `attempt=` · da drenagem: `motivo=merge_falhou`, `motivo=sem_progresso` `n=` `limite=`, ou `motivo=adiamentos` `n=` `limite=` |
+| `RETRY` | `executor.sh:drive_ticket` | `attempt=` `model=` `motivo=` `sub=` `worktree=` |
 | `REFATIAR` | `executor.sh:896` | `motivo=` `arquivos=` |
 | `MERGE` | `local-loop.sh:173` | `alvo=` `sha=` |
 | `RECUPERADO` | `executor.sh:1105`, `local-loop.sh:55`, `launchd-run.sh:102` | `motivo=ja-mergeado\|lock-orfao\|status-congelado` |
@@ -229,6 +229,70 @@ ambiente quebrado. Um ticket isolado com causa própria segue a regra de cima.
 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
 ```
 
+**`ADIADO`: causa, medida e cooldown** (peça 7b-2). O `motivo=` do adiado é a
+causa de infra do `decisao.ts`: `conexao`, `sessao`, `rate_limit`, `quota`,
+`servidor` (5xx, overloaded; até a 7b-2 era `rate_limit`), `timeout`,
+`gate_interrompido` (morto por fora: rc 129/130, ou rc 124 bem abaixo do teto,
+peça 7b-3), `gate_crash` (o runner do gate não rodou: rc 126/127, command not
+found, ENOENT do binário, Missing script, saída vazia; no papel testes, também
+sem placar e sem teste falhando) e `juiz_ilegivel`. `rc=` e `dur=` são a
+MEDIDA da chamada do agente. `cooldown=sim` só para `rate_limit` e `quota`;
+todo o resto adia sem cooldown e o próximo disparo retoma sem espera.
+
+```
+901 ADIADO motivo=timeout attempt=1 rc=124 dur=1802s cooldown=nao
+901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=40s cooldown=nao
+901 ADIADO motivo=preflight causa=preflight: árvore de execução suja em /x/repo — commite ou stashe antes:\n?? lixo.txt
+```
+
+`motivo=preflight` substitui o `EXECUTOR_MORREU rc=1 fase=?` de id `—` que a
+recusa de preflight gravava até a 7b-2: o evento sai no ticket da vez, o
+executor sai 0, e nenhum ticket é TOCADO (nem nota nem commit). A régua de
+AMBIENTE (7a-8) vale sobre todo ADIADO sem cooldown, `preflight` incluído: a
+mesma causa normalizada em dois tickets na mesma drenagem é `AMBIENTE`.
+
+**`REPROVADO sub=`** (peça 7b-4): qual mérito reprovou, na ordem em que o
+pipeline para: `gate_<papel>` (`typecheck`, `testes`, `build`, `lint`), `juiz`,
+`criterio`, `exit`. `motivo=` segue `criterio_qualidade` para todos. O RETRY
+repete o `sub=`, e só `sub=juiz` escala modelo (§8). Permissão negada com
+critério vermelho é `sub=criterio`: mérito, sem escalar.
+
+```
+461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717
+461 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
+```
+
+**`BLOQUEADO motivo=repeticao sub= diff=`** (peça 7b-4): a reprovação que
+repete a anterior do MESMO ticket (mesmo sub, mesmo `diff=`) bloqueia na hora,
+sem 3ª volta, com `notas_status` = `repetição: 2ª reprovação igual à anterior
+(sub=, diff=), sem 3ª volta. <motivo>`. A anterior é a última `REPROVADO` do
+ticket na trilha, de qualquer drenagem, desde que nada tenha encerrado a série
+(APROVADO, MERGE, BLOQUEADO, REFATIAR, RECUPERADO; ADIADO não encerra). Linha de
+antes da 7b-4, sem `sub=`, tem o sub derivado do `GATE`/`JUIZ` da mesma
+tentativa (`criterios=3/4` com os gates ok = `criterio`).
+
+**`BLOQUEADO motivo=adiamentos n=<N> limite=<L>`** (peça 7b-3): o ADIADO sem
+cooldown soma em `runs/<id>/.adiamentos`, que persiste entre disparos. No limite
+(`adiamentos_limite`, §8) o ticket vai para `bloqueado` no fim da drenagem, pelo
+`ticket_commit`, com `notas_status` = `adiado <N> vezes: <causa real>`. A causa
+real é a MEDIDA do último ADIADO: `<motivo> (rc=<rc>, <dur> de execução)`, ou
+`preflight: <causa>`; um rc 124 de 9 s nunca vira "timeout". Adiado COM
+cooldown não conta nem zera; sair de `pendente` ou a branch alvo avançar zera;
+drenagem que termina em `AMBIENTE` desfaz o que somou.
+
+**Tentativas no ticket** (peça 7b-4): o contador de retry é o campo
+`tentativas` do ticket, e não mais um `attempt=0` por chamada. O executor grava
+`tentativas+1` (com commit) antes de cada tentativa e devolve o valor quando o
+desfecho não é reprovação; a drenagem zera ao mergear. `max_retries` vale no
+TOTAL do ticket, não por drenagem, e o `attempt=` da trilha continua de onde
+parou.
+
+**Notificação de AMBIENTE** (peça 7b-5): avisa quando a drenagem ENTRA em
+`AMBIENTE`, cala nas seguintes que terminam no mesmo estado, e a primeira que
+sai manda UM aviso de saída, com o placar, no lugar do cartão de fim. A memória
+é `runs/.notificacao-ambiente`, como a da fila vazia; pausa não conta como
+saída.
+
 **`OCIOSO`** (peça 7a-4) sai UMA vez por drenagem, logo antes do
 `DRENAGEM_FIM`, quando ela termina sem nenhum pendente processável e há ao menos
 um pendente. Não sai em pausa (quem pausou já sabe) nem com a fila sem
@@ -494,6 +558,18 @@ e **não** na tabela de chaves novas do `--migrar` (`config-tabela.ts:NOVAS`): u
 repo instalado segue com o padrão do código sem que a migração mude o proposto
 dele.
 
+**`adiamentos_limite`** (peça 7b-3, opcional, padrão **4**): quantos
+adiamentos SEM cooldown seguidos um ticket pode ter antes de ir para
+`bloqueado` (§4.1, `BLOQUEADO motivo=adiamentos`). Lida a cada volta
+(`local-loop.sh:adiamentos_limite`); ausente, zero ou não numérica vale 4. Está
+em `config-chaves.ts` e no formulário v2, e, como o `sem_progresso_limite`, não
+em `config-tabela.ts:NOVAS`.
+
+**`politica_adiamento.causas_que_adiam`: os mesmos 7 rótulos ligam 9 causas**
+(peça 7b-2). `servidor` (5xx) é ligado pelo rótulo "rate limit" e `gate_crash`
+pelo "gate interrompido": pedir rótulo novo faria todo repo instalado deixar de
+adiar um 503 no dia da atualização. Tirar o rótulo desliga as duas causas dele.
+
 **`politica_retry.por_causa.<causa>.modelo = "ESCALAR"` vale só para
 `sub=juiz`** (peça 7b-4). O REPROVADO carrega o sub-motivo (`juiz`, `criterio`,
 `gate_<papel>`, `exit`; §4.1), e `decidirRetry` (`decisao.ts`) só troca para
@@ -668,6 +744,11 @@ job ao lado do antigo. RECUSA também instalar de um checkout sob `/tmp` ou com
 `ORQ_TESTE=1`, salvo `--permitir-tmp` (peça K6e; ver `docs/PLAYBOOK.md`).
 `--dry-run` renderiza sem instalar, em qualquer caso.
 
+O plist sai com `RunAtLoad` **true** (peça 7b-7, porte do `5791209` do Actus):
+o `bootstrap` de cada instalação dispara o primeiro tick na hora, em vez de só
+depois de um `StartInterval` inteiro. `docs/launchd.md` ainda mostra o exemplo
+antigo com `false`; é divergência conhecida até a 7c.
+
 ---
 
 ## 10. Divergências conhecidas
diff --git a/docs/PECAS.md b/docs/PECAS.md
index 735e64b..bfed872 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -742,6 +742,64 @@
   de 231 pendente (sem liberação), mais sem-progresso, cooldown e os fins que não gravam.
   **Antes, só "sem ticket processável".**
 
+- **7b-1 · nenhum teste do kit lê arquivo vivo de outro repo** (`a28fe81`). Fecha a parte
+  "leitura viva" da K8e. Os configs do Actus (v1, `5b623d5^`) e do Comarka viraram fixtures
+  datadas em `test/fixtures/config/`; as três filas viraram amostras em
+  `test/fixtures/filas/<repo>/`, com PROCEDENCIA.md dizendo qual ticket cobre qual ramo do
+  `migrar-tickets.ts`, e os números afirmados passaram a ser os EXATOS da amostra; o ticket
+  306 do Comarka (versão `38fd7cb`) virou `test/fixtures/tickets/`. A (c) do
+  `test-instalar.sh` só roda com `ORQ_CI_CHECKOUT` setado. Fixture ausente é falha, não pulo.
+  *Evidência:* as 3 falhas antigas (o Actus migrou o config para o schema 2 em `5b623d5`; o
+  306 do Comarka foi para `done`).
+  *Teste:* vitest e `test-instalar.sh` rc 0 com `HOME` apontando para um diretório vazio.
+
+- **7b-2 · tabela de causas** (`cfb5cf3`). Cooldown só para `rate_limit` e `quota`. `servidor`
+  (5xx, overloaded; antes `rate_limit`), timeout, sessão, rede e `gate_crash` adiam sem
+  cooldown, sem tentativa e sem escalar. `gate_crash`: o runner do gate não rodou (rc 126/127,
+  command not found, ENOENT do binário, Missing script, saída vazia; em testes, também sem
+  placar e sem teste falhando); typecheck ou build que rodou e apontou erro segue mérito. A
+  recusa de preflight vira `ADIADO motivo=preflight causa=<uma linha>`, sem EXECUTOR_MORREU e
+  sem tocar o ticket, e a régua de AMBIENTE da 7a-8 vale sobre todo ADIADO sem cooldown.
+  *Evidência:* revisão §2 linhas E4 e F1, §3 item 3; `lib.sh:mark_adiado` armava 60 min em
+  todo adiamento.
+  *Teste:* `test-causa-adiamento.sh` (executor REAL num repo de fixture, com `claude` falso:
+  timeout sem cooldown, 429 com, 503 sem, gate de testes e tsc ausente viram `gate_crash`, tsc
+  com `error TS` é mérito, preflight vira ADIADO), `test-ambiente-adiado.sh`,
+  `test/orquestrador-causas-adiamento.test.ts`. **Antes, timeout armava cooldown, o gate
+  quebrado escalava para opus e o preflight saía como EXECUTOR_MORREU.**
+
+- **7b-3 · teto de adiamentos consecutivos** (`dd3ecd7`). `runs/<id>/.adiamentos` persiste;
+  no limite (`adiamentos_limite`, padrão 4) o ticket bloqueia com `notas_status` "adiado N
+  vezes: <causa real>", commit e `BLOQUEADO motivo=adiamentos`. A causa é a medida: rc 124
+  abaixo do teto é `gate_interrompido` (morto por fora), e o motivo traz rc e duração.
+  *Evidência:* Comarka 315a, 8 adiamentos seguidos, "timeout 1500s" numa execução de 9 s.
+  *Teste:* `test-adiamentos-limite.sh` (bloqueia no 4º, aprovação zera, cooldown neutro,
+  limite do config, AMBIENTE desfaz; rc 124 de 0 s no executor real não vira timeout).
+  **Antes, adiava para sempre.**
+
+- **7b-4 · sub-motivo, escalada e corte de repetição** (`ffab528`). REPROVADO e RETRY com
+  `sub=juiz|criterio|gate_<papel>|exit`; ESCALAR só com `sub=juiz`; a 2ª reprovação igual
+  (mesmo sub, mesmo diff) bloqueia com `motivo=repeticao`; permissão negada com critério
+  vermelho é mérito, sem escalar. E o ajuste pedido na sessão: o contador de tentativas
+  persiste no ticket (`tentativas`, porte do `f3aaa89` do Actus), e `max_retries` vale no
+  total, não por drenagem (`executor.sh:990` fazia `attempt=0` a cada chamada).
+  *Evidência:* 82 de 82 retries do kit em opus (revisão B2, B3, K4, L1); Actus 461 com
+  diff 717/717/717.
+  *Teste:* `test-reprovado-sub.sh` (executor real; trilha fixture do 461 em
+  `test/fixtures/trilha/`), `test/orquestrador-sub-repeticao.test.ts`. **Antes, RETRY
+  model=opus nos três casos, e cada drenagem recomeçava as tentativas.**
+
+- **7b-5 · aviso de AMBIENTE só na transição** (`052ac50`). Avisa ao entrar, cala no meio, e
+  a drenagem que sai manda um aviso de saída com o placar.
+  *Teste:* `test-notificacao-ambiente.sh`: 3 disparos em ambiente = 1 aviso; o 4º saudável =
+  1 aviso de saída. **Antes, 3 avisos.**
+
+- **7b-7 · RunAtLoad true no plist** (`27177af`). Porte do `5791209` do Actus.
+  *Teste:* `test/orquestrador-runatload.test.ts`, com o launchctl stubado e HOME
+  descartável. **Antes, `<false/>`.** `docs/launchd.md` ainda mostra `false` (7c).
+
+- **7b-6 · docs da etapa 7b**: esta seção, o CHANGELOG e o CONTRATO §4.1, §8 e §9.4.
+
 
 ## PENDENTES
 
```

## Fechamento

### vitest (`./node_modules/.bin/vitest run`)

```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7b

 ✓ test/orquestrador-enforcement.test.ts (47 tests) 24ms
 ✓ test/orquestrador-enforcement-actus.test.ts (104 tests) 27ms
 ✓ test/orquestrador-decisao.test.ts (39 tests) 20ms
 ✓ test/orquestrador-prevoo.test.ts (34 tests) 11ms
stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > actus-saas: em TODO ticket migrado, só o bloco muda
actus-saas: 0 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > comarka-operacional: em TODO ticket migrado, só o bloco muda
comarka-operacional: 3 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > conteudos-infinitos: em TODO ticket migrado, só o bloco muda
conteudos-infinitos: 0 ticket(s) migrados

 ✓ test/orquestrador-migrar-tickets.test.ts (32 tests) 281ms
 ✓ test/orquestrador-gates.test.ts (29 tests) 2171ms
   ✓ critérios do executor — strip de ANSI > saída COLORIDA casa o mesmo critério que a saída limpa 638ms
   ✓ critérios do executor — strip de ANSI > critério NUMÉRICO também é imune a cor (igualdade exata sobre saída colorida) 359ms
   ✓ critérios do executor — strip de ANSI > texto acentuado sobrevive ao strip (o filtro não estraga UTF-8) 303ms
 ✓ test/orquestrador-liberar-migrar.test.ts (37 tests) 4503ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > o resultado da migração PASSA no leitor do motor: todo token resolve 645ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > libera, sai 0 e o arquivo passa a ter o token 457ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > o token liberado DESTRAVA o ticket que dependia dele 983ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > duplicata: rc 1, RECUSADO, e o arquivo NÃO muda 973ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > arquivo em v1: recusa e manda migrar, sem tocar em nada 481ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 6067ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 762ms
   ✓ a CLI é o contrato que `orq validar` repassa > com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>` 600ms
   ✓ a CLI é o contrato que `orq validar` repassa > --relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação 586ms
   ✓ a CLI é o contrato que `orq validar` repassa > --pendentes pega SÓ os pendentes 592ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 1262ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 578ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > rc 1 e a linha de violação, chamado PELO symlink 570ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 1085ms
 ✓ test/orquestrador-toolchain-tsx.test.ts (30 tests) 6639ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > tsx_local_ok responde pelo binário DO REPO, e é `test -x` 728ms
   ✓ as 14 chamadas do motor passam pela resolução única > `orq config` de verdade continua respondendo no fixture (rc 0) 303ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > recusa NOMEADA: rc 1, PREVOO_NOGO item=tsx na trilha e uma notificação 418ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > SEM acesso à rede: o `npx` nunca é chamado (o stub não registrou nada) 414ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > não toca ticket nenhum, não cria lock e não reescreve o STATUS 475ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > COM tsx no lugar, o guard passa e o loop segue para o kill switch 507ms
   ✓ cat.7 · toolchain > `orq prevoo` no fixture continua GO, com a cat.7 na saída 502ms
   ✓ instalar.sh · recusa repo sem tsx > --dry-run SÓ AVISA: sai 0 e prevê a recusa, sem escrever nada 347ms
   ✓ instalar.sh · recusa repo sem tsx > com pnpm-lock.yaml a linha é `pnpm add -D`; com package-lock.json é `npm i -D` 408ms
   ✓ instalar.sh · recusa repo sem tsx > com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx) 1074ms
 ✓ test/doutrina-v2.test.ts (30 tests) 12ms
 ✓ test/orquestrador-refatiar.test.ts (39 tests) 8127ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > diff acima do cap: refatiar, contaComoRetry false 680ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > arquivo fora da allowlist (enforcement): refatiar 544ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > zona proibida entra pelo MESMO campo — é a barreira que classifica 544ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > refatiar NÃO gera retry (o plano diz deveTentar=false) 539ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry 1062ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar 642ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > status vira refatiar e a nota LISTA os arquivos 491ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a trilha registra REFATIAR com motivo= e arquivos= 454ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa 554ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a mesma pendência duas vezes não vira duas linhas 918ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > NEGATIVO: origem planejador NÃO gera decisão pendente (volta ao lote da frente) 425ms
   ✓ o retry recebe o JSON, não o texto livre > o CLI monta o JSON a partir do rundir de verdade 448ms
 ✓ test/orquestrador-lock.test.ts (34 tests) 10ms
 ✓ test/orquestrador-trilha.test.ts (22 tests) 4104ms
   ✓ o merge commit carrega o trailer, e o git o devolve > git log --grep acha o merge pelo trailer 699ms
   ✓ o merge commit carrega o trailer, e o git o devolve > NEGATIVO: o trailer é ancorado — 901 não casa 9012 641ms
   ✓ o prompt do executor cobra o trailer no commit do agente > o prompt montado nomeia o trailer e o id 462ms
   ✓ trilha e STATUS contam a primeira tentativa como 1 > a trilha REAL sai 1-based: o juiz na primeira tentativa registra attempt=1 574ms
 ✓ test/orquestrador-tools-derivadas.test.ts (32 tests) 8ms
 ✓ test/orquestrador-causas-adiamento.test.ts (32 tests) 8ms
 ✓ test/orquestrador-juiz.test.ts (39 tests) 9380ms
   ✓ LIXO é adiado, nunca reprovado > o parse do CLI sai com rc 3 (o código que o executor lê como ADIADO) 699ms
   ✓ LIXO é adiado, nunca reprovado > a fronteira está no decisao.ts: juizIlegivel ADIA e NÃO conta retry 533ms
   ✓ LIXO é adiado, nunca reprovado > NEGATIVO: sem o campo, o mesmo sinal segue aprovando como antes 508ms
   ✓ modelo por classe de risco (custo-e-contexto §7) > o CLI devolve classe + modelo juntos (é o que o shell consome) 512ms
   ✓ ponta a ponta com --stub-juiz > veredito aprovado: JUIZ_APROVADO=true e evidência gravada 1157ms
   ✓ ponta a ponta com --stub-juiz > o prompt gravado carrega o critério avaliador e o bloco anti-afrouxamento 1177ms
   ✓ ponta a ponta com --stub-juiz > veredito reprovado: motivo e criterios_falhos ficam disponíveis para o retry 1093ms
   ✓ ponta a ponta com --stub-juiz > lixo: ILEGIVEL=1, nenhum veredito.json, e o CRU continua lá para auditoria 976ms
   ✓ ponta a ponta com --stub-juiz > a trilha registra o veredito, a classe e o modelo, com attempt 1-based 975ms
   ✓ ponta a ponta com --stub-juiz > o risco sobe pelo objetivo e leva o modelo forte junto 1019ms
   ✓ ponta a ponta com --stub-juiz > NEGATIVO: --dry sem --stub-juiz pula o juiz e não inventa veredito 720ms
 ✓ test/orq-cli.test.ts (42 tests) 9351ms
   ✓ orq — imprime o STATUS.md > sem snapshot, avisa e cai no placar em vez de imprimir nada 340ms
   ✓ orq erro — último reprovado, com o recorte do gate que falhou > recorta o gate que reprovou — aqui o enforcement, com o arquivo fora da allowlist 310ms
   ✓ orq ticket <id> — última tentativa + evidência > mostra status do ticket e a ÚLTIMA tentativa do meta.json 379ms
   ✓ orq pausar / retomar — kill switch em arquivo, nunca kill de processo > retomar remove o arquivo 355ms
   ✓ orq validar — o gate de ticket, com o rc repassado > fila limpa: rc 0 e nenhuma linha 412ms
   ✓ orq validar — o gate de ticket, com o rc repassado > ticket torto: rc 1, e a linha nomeia arquivo e campo 388ms
   ✓ orq validar — o gate de ticket, com o rc repassado > --relatorio sai 0 mesmo com violação (é o modo de olhar, não de barrar) 423ms
   ✓ orq validar — o gate de ticket, com o rc repassado > validar é READ-ONLY: o .md do ticket sai byte a byte igual 404ms
   ✓ read-only por construção > é executável 368ms
 ✓ test/orquestrador-piso-tools.test.ts (23 tests) 7ms
 ✓ test/orquestrador-launchd-config.test.ts (15 tests) 976ms
 ✓ test/orquestrador-agendamento.test.ts (21 tests) 271ms
 ✓ test/orquestrador-envelope.test.ts (25 tests) 2659ms
 ✓ test/orquestrador-gate-baseline.test.ts (21 tests) 7ms
 ✓ test/orq-versao-config.test.ts (16 tests) 4144ms
   ✓ orq config > READ-ONLY: nem versao nem config escrevem no repo 423ms
 ✓ test/orquestrador-datar-liberacoes.test.ts (11 tests) 1857ms
   ✓ datadorGit contra um repo de verdade, com dois commits > cada token recebe a data e o autor do commit que o INTRODUZIU 324ms
   ✓ a migração inteira, ponta a ponta, no repo de verdade > o v2 gravado sai datado, e o relatório diz quantos 326ms
   ✓ a migração inteira, ponta a ponta, no repo de verdade > rodar de novo é no-op: já datado, nada muda 319ms
 ✓ test/orquestrador-trilha-gate-papel.test.ts (9 tests) 3793ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > a trilha diz o que os gates disseram, e build sai como nao-configurado 390ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > gate de nome próprio que REPROVA sai falha, e o que passou continua ok 374ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > gate CONFIGURADO que não chegou a rodar continua nao-rodou 466ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > produz EXATAMENTE a linha de hoje para um attempt real (runs-201 attempt-2) 466ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > os dois typecheck do CI viram um papel só, e falha de um é falha do papel 471ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > nenhum gate do CI cai em nao-configurado: o CI tem os três papéis 442ms
   ✓ papel declarado no config manda sobre o inferido do nome > um gate chamado `verificacao` com "papel": "testes" entra como testes 370ms
   ✓ papel `lint` só aparece na linha quando o repo tem gate de lint > config sem gate de lint: a linha NÃO ganha campo novo 434ms
   ✓ papel `lint` só aparece na linha quando o repo tem gate de lint > config COM gate de lint: a linha ganha lint=, depois de build= 379ms
 ✓ test/orquestrador-adiamento-actus.test.ts (13 tests) 6ms
 ✓ test/orquestrador-push-suprimido.test.ts (14 tests) 12ms
 ✓ test/orquestrador-observabilidade.test.ts (38 tests) 9017ms
   ✓ status_set reescreve o snapshot INTEIRO > NUNCA append: 20 transições e o arquivo continua do mesmo tamanho 2463ms
   ✓ status_set reescreve o snapshot INTEIRO > a transição seguinte APAGA o valor anterior (não convive com ele) 402ms
   ✓ status_set reescreve o snapshot INTEIRO > ocioso: TICKET e FASE viram — e MOTIVO explica por que a fila parou 379ms
   ✓ status_set reescreve o snapshot INTEIRO > DESDE distingue trabalhando de travado: decorrido + quanto falta p/ timeout 329ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > mudou o status de um ticket, mudou o placar — sem passar fila= nenhum 588ms
   ✓ evento GATE resume a passagem inteira numa linha > tudo verde 405ms
   ✓ evento GATE resume a passagem inteira numa linha > gate que reprovou aparece como falha; os que não rodaram, como nao-rodou 425ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement reprovado carrega fora_do_pathspec com os arquivos 445ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement verde nunca carrega fora_do_pathspec 435ms
 ✓ test/orquestrador-custo.test.ts (38 tests) 15380ms
   ✓ custo_registrar grava o consumo real da chamada > duas chamadas somam no mesmo dia, uma linha cada 659ms
   ✓ custo_registrar grava o consumo real da chamada > papel e ticket distinguem as chamadas (é o que o orq custo agrega) 590ms
   ✓ custo_registrar grava o consumo real da chamada > pega o ÚLTIMO objeto JSON: o arquivo carrega stdout + stderr, não só JSON 305ms
   ✓ falha de contabilidade NUNCA bloqueia o ticket > campos ausentes viram 0, não quebram o arquivo 339ms
   ✓ orcamento_veredito: ok | dia | ticket > teto por ticket atingido => ticket (e só para ESSE ticket) 465ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue com ledger corrompido: o executor é chamado 1545ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue sem ledger nenhum: o executor é chamado 1550ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > escopo ticket grava a nota orcamento_ticket 304ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > ticket adiado até amanhã não é processável hoje 566ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o executor nunca é chamado 1053ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > STATUS.md fica ocioso com MOTIVO orcamento 1171ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o ticket fica adiado, sem consumir tentativa, e a trilha registra 1104ms
   ✓ teto por TICKET adia só aquele ticket e a fila segue > adia o 901 por orcamento_ticket e passa ao 902 1626ms
 ✓ test/orquestrador-dois-blocos-json.test.ts (13 tests) 895ms
 ✓ test/orquestrador-pausa-e-prompt.test.ts (17 tests) 6928ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sai 0 (pausa não é falha) 435ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > o log nomeia a pausa e o motivo registrado 357ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > STATUS.md fica ocioso com MOTIVO pausado 370ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > a trilha registra a drenagem pausada, com par início/fim 350ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > NENHUM ticket é tocado (nem pelo reconcile) 438ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sem o arquivo, a drenagem NÃO para por pausa (o guard não é sempre-verdadeiro) 818ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > o sentinela legado (.orq-pause) continua pausando 402ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > o ticket em curso termina; o seguinte não começa 785ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > encerra em ocioso com MOTIVO pausado, não em erro 836ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > o prompt cita docs/orquestrador/skill/EXECUTOR.md 445ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > e manda NÃO ler SKILL.md nem references/ 391ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > não existe mais ponteiro para a SKILL como leitura recomendada 459ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > sem EXECUTOR.md no disco, o prompt sai sem ponteiro nenhum (não inventa) 429ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > nada mais mudou no prompt: objetivo, allowlist, gates e proibições seguem lá 410ms
 ✓ test/orquestrador-isolamento-teste.test.ts (20 tests) 2708ms
   ✓ o test-*.sh rodando de verdade não deixa marca na trilha real > test-drenagem.sh: fixture recebe os eventos, produção não recebe nada 1663ms
 ✓ test/orquestrador-morte-por-sinal.test.ts (11 tests) 2932ms
   ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2288ms
 ✓ test/kit-e2e-evidencia.test.ts (7 tests) 601ms
 ✓ test/orquestrador-pacotes.test.ts (6 tests) 2204ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > pacote único: só a raiz 346ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > árvore do CI simulada: os 9 pacotes, na ordem do código antigo 375ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > node_modules ANINHADO não vira pacote 353ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > diretório sem node_modules próprio fica de fora 338ms
   ✓ limpa_cache_vite purga o .vite de todo pacote detectado > apaga na raiz E nos pacotes aninhados, e não toca no resto 370ms
   ✓ a lista de pacotes é a MESMA que o linkador de worktree usa > linka node_modules de cada pacote detectado dentro da worktree 421ms
 ✓ test/orquestrador-prefixo-aspas.test.ts (13 tests) 11ms
 ✓ test/orquestrador-sub-repeticao.test.ts (10 tests) 6ms
 ✓ test/orquestrador-liberacoes.test.ts (11 tests) 2886ms
   ✓ o arquivo REAL do repo resolve as dependências que declara > cada token do arquivo real resolve via liberacao_ok 1117ms
 ✓ test/orquestrador-trilha-uma-linha.test.ts (8 tests) 1334ms
 ✓ test/orquestrador-prompt-como-rodar.test.ts (10 tests) 6ms
 ✓ test/orquestrador-runatload.test.ts (2 tests) 257ms
 ✓ test/orquestrador-disparo-congelado.test.ts (13 tests) 5721ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > executando DENTRO do timeout não está congelado 417ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > executando ALÉM do timeout está congelado, e diz há quanto tempo 413ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > ocioso nunca está congelado, por mais velho que seja o DESDE 371ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS congelado E lock com pid VIVO => recupera (a staleness vence) 591ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > a recuperação deixa rastro na trilha e limpa o STATUS 584ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS são + lock com pid vivo => em-curso (a guarda continua valendo) 503ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > lock com pid MORTO não segura disparo nenhum => segue 483ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > sem lock e sem STATUS congelado => segue 406ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > em-curso NÃO escreve na trilha: não houve o que recuperar 473ms
   ✓ a guarda por processo é POR REPO > o lock de OUTRO repo não é visto: o caminho sai do RUNS_BASE deste 446ms
   ✓ orq mostra MORTO, não executando > com o STATUS congelado, o snapshot diz MORTO e há quanto tempo 528ms
   ✓ orq mostra MORTO, não executando > com o STATUS são, mostra o que sempre mostrou 504ms
 ✓ test/orquestrador-migrar-config.test.ts (47 tests) 21401ms
   ✓ a migração não apaga nada > actus-saas: o arquivo no disco do repo NÃO é tocado 785ms
   ✓ a migração não apaga nada > comarka-operacional: o arquivo no disco do repo NÃO é tocado 569ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > antes da migração, a linha é a de hoje (é a medida de referência) 485ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > DEPOIS da migração, é caractere a caractere a MESMA linha 513ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --dry-run não escreve nem o proposto 647ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --propor grava 000-config.proposto.json e NÃO toca o oficial 650ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --aplicar move o proposto QUE FOI REVISADO, não um recalculado 1239ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > o relatório do --dry-run traz o veredito do `orq config` sobre o PROPOSTO 577ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > --dry-run continua não gravando: ele AVISA da recusa e segue relatando 537ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > sem proposto no disco, o --propor grava como sempre (a guarda não é sempre-verdadeira) 507ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > o migrador NÃO conhece o nome da revisão: não lê, não escreve, não apaga 545ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > a CLI distingue RECUSA (rc 1) de erro de uso (rc 2) 451ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > com proposto pré-existente: rc 1, recusa dita, e o arquivo intacto byte a byte 3608ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > o resto da migração roda: a recusa é do config, não do --migrar inteiro 2732ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > sem proposto pré-existente, o --migrar volta a sair 0 e a gravar 3163ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > --dry-run com proposto pré-existente: rc 0, avisa, e não escreve 3157ms
   ✓ os dois configs reais: quanto o proposto melhora, e o que sobra > actus-saas: o proposto tem MENOS violações que o original, e o resto é decisão local 597ms
   ✓ os dois configs reais: quanto o proposto melhora, e o que sobra > comarka-operacional: o proposto tem MENOS violações que o original, e o resto é decisão local 560ms
 ✓ test/orquestrador-reparo-trilha.test.ts (10 tests) 2592ms
   ✓ reparo sobre a trilha real quebrada > o número de eventos é o mesmo de antes (contagem tirada imediatamente antes) 310ms
   ✓ reparo sobre a trilha real quebrada > guarda a cópia crua do ANTES, para a preservação ser conferível depois 329ms
   ✓ uma vez só, e por construção > a segunda passagem é no-op: não escreve, não anota 450ms
 ✓ test/orquestrador-liberacoes-formatos.test.ts (28 tests) 13748ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > os 5 tokens do arquivo real resolvem a dependência `humano:<token>` 913ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > TODOS os 47 tokens únicos do arquivo real resolvem 8448ms
   ✓ o que o CI faz diferente: NADA > os 7 resolvem, e NENHUM grava aviso (a forma do CI não é legada) 1044ms
 ✓ test/orquestrador-notificacao.test.ts (25 tests) 25778ms
   ✓ o fallback em arquivo é escrito SEMPRE > sem osascript: só o arquivo, e o log diz por quê 11793ms
   ✓ o fallback em arquivo é escrito SEMPRE > COM osascript: o arquivo é escrito do mesmo jeito 464ms
   ✓ o fallback em arquivo é escrito SEMPRE > osascript que falha não derruba a drenagem e o arquivo continua valendo 431ms
   ✓ o fallback em arquivo é escrito SEMPRE > anexa: duas drenagens, duas linhas (é histórico, não snapshot) 351ms
   ✓ o que vai no título e no corpo > título: placar de aprovados e bloqueados 492ms
   ✓ o que vai no título e no corpo > corpo: duração e o ÚLTIMO do snapshot 747ms
   ✓ o que vai no título e no corpo > sem snapshot ainda, o corpo sai com — em vez de quebrar 462ms
   ✓ fila sem processável: avisa uma vez, e só uma > a PRIMEIRA drenagem vazia escreve exatamente uma linha 791ms
   ✓ fila sem processável: avisa uma vez, e só uma > a SEGUNDA drenagem vazia não escreve nada (é o spam do launchd) 1219ms
   ✓ fila sem processável: avisa uma vez, e só uma > dez ticks seguidos com a fila vazia continuam valendo uma linha só 2889ms
   ✓ fila sem processável: avisa uma vez, e só uma > processar de novo REARMA o aviso de fila vazia 1154ms
   ✓ drenagem que PROCESSOU notifica, com o placar > aprovado: uma linha, placar 1 aprovado 727ms
   ✓ drenagem que PROCESSOU notifica, com o placar > bloqueado: uma linha, placar 1 bloqueado 486ms
   ✓ drenagem que PROCESSOU notifica, com o placar > adiado por orçamento: uma linha, corpo com adiados 1 551ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU conta como processado, ainda que nada tenha sido aprovado 674ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU que já estava na trilha ANTES não conta (a conta é do trecho) 823ms
   ✓ saída sem drenagem NUNCA notifica > lock ocupado por processo vivo: local-loop encerra sem tocar o notificacoes.log 396ms
   ✓ deve_notificar: a regra, isolada > processou ≥ 1: notifica, qualquer que seja o motivo do fim 450ms
   ✓ deve_notificar: a regra, isolada > zero processados por pausa, cooldown ou sem progresso: cala sempre 364ms

 Test Files  46 passed (46)
      Tests  1161 passed (1161)
   Start at  13:40:02
   Duration  30.80s (transform 1.40s, setup 0ms, collect 16.14s, tests 178.88s, environment 6ms, prepare 2.09s)

rc=0
```

### scripts/kit/test-shell.sh

```
[fixture] tmp: /tmp/orq-fixture-UOn7TR
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7b/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-UOn7TR/repo
== testes de shell do motor · fixture em /tmp/orq-fixture-UOn7TR/repo ==

--- test-lib-config.sh ---
== raízes resolvidas pelo lib.sh ==
  ROOT           = /tmp/orq-fixture-UOn7TR/repo
  MAIN_CHECKOUT  = /private/tmp/orq-fixture-UOn7TR/repo
  CONFIG         = /private/tmp/orq-fixture-UOn7TR/repo/docs/fila/000-config.json
  ok   config encontrado no caminho resolvido

== valores lidos do config REAL ==
  ambiente_id      = orqfixture
  repo_origin      = fixture/orq-fixture
  diff_cap_linhas  = 600
  branch_alvo      = staging-auto
  max_retries      = 2
  ok   ambiente_id bate com o arquivo
  ok   diff_cap = 600 (o NOSSO, não o 2500 do comarka-os)

== causas de adiamento declaradas no config ==
  - erro de conexão
  - sessão expirada
  - rate limit
  - quota estourada
  - timeout de claude_timeout_secs
  - gate interrompido no meio
  - veredito do juiz ilegível
  ok   7 causas declaradas
  ok   a causa do juiz ilegível está declarada

== is_adiavel cobre cada causa ==
  ok   erro de conexão (ECONNREFUSED) -> adia
  ok   erro de conexão (socket hang up) -> adia
  ok   sessão expirada -> adia
  ok   sessão expirada (token) -> adia
  ok   rate limit -> adia
  ok   quota estourada -> adia
  ok   timeout de claude_timeout_secs -> adia
  ok   gate interrompido (SIGINT) -> adia
  ok   gate interrompido (SIGHUP) -> adia
  ok   menção a rate limit com rc=0 -> nao-adia
  ok   menção a sessão expirada com rc=0 -> nao-adia
  ok   erro real de código -> nao-adia

TODOS OS CHECKS PASSARAM

rc(test-lib-config.sh) = 0

--- test-drenagem.sh ---
== config lida ==
  branch_alvo=staging-auto  branch_protegida=main
  ok    alvo != protegida

== merge_em_alvo RECUSA a branch protegida ==
  ok    alvo == protegida => rc=2 (recusado)
  ok    recusa diz o motivo
  (worktree de teste: /private/tmp/orq-fixture-UOn7TR/repo, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (5f571b99)

== drenar TRATA o status refatiar (regra 19) ==
  ok    refatiar NÃO vai para o merge
  ok    a drenagem diz que o ticket voltou
  ok    seguiu para o próximo ticket (executor chamado para: 901 902 )
  ok    o placar da drenagem conta os 2 refatiados
  ok    não conta como aprovado nem como bloqueado

TODOS OS CHECKS PASSARAM

rc(test-drenagem.sh) = 0

--- test-retry-worktree.sh ---
== 1 · enforcement PASSOU: a tentativa 2 herda a worktree e o commit ==
  ok    attempt-1 começa COM o diff da anterior (1 linha, src/a.ts na árvore)
  ok    o log diz que reaproveitou (e de qual tentativa)
  ok    o prompt da tentativa 2 manda corrigir o apontado
  ok    o patch da tentativa 2 contém o trabalho herdado
  ok    a trilha registra a reaproveitação
  ok    o RETRY anuncia o modo da worktree

== 2 · enforcement REPROVOU: worktree NOVA (diff fora do escopo não vira base) ==
  ok    attempt-1 nasce LIMPA quando o enforcement reprovou
  ok    não reaproveitou
  ok    o RETRY registra que a worktree é nova

== 3 · diff.patch por tentativa, ANTES de qualquer descarte ==
  ok    grava_diff_patch escreve o patch
  ok    o patch tem o conteúdo, não só o nome do arquivo
  ok    diff vazio => patch vazio, mas presente
  ok    run_attempt grava o patch antes do enforcement

== 4 · sondagem com rc!=0 grava o stderr REAL, não um palpite ==
  ok    a mensagem traz a saída REAL do CLI
  ok    não chuta mais a causa
  ok    diz o rc observado
  ok    gravou a evidência em runs/ (probe-falha-20260921T164043Z.txt)
  ok    o arquivo tem a saída crua
  ok    o log aponta o arquivo antes de morrer

== 5 · REQUEUE: rodada nova com attempt-0..2 antigos no disco ==
  ok    attempt-0 da rodada antiga NÃO foi sobrescrito
  ok    attempt-1 e attempt-2 antigos preservados
  ok    a rodada nova escreveu em attempt-3
  ok    attempt-3 tem o prompt DE HOJE, não o antigo
  ok    o log anuncia o slot inicial
  ok    o retry da rodada foi para attempt-4 (numeração contínua)
  ok    meta.json amarra o contador de retry ao diretório (campo dir)
  ok    tentativa 1 da rodada nasce limpa, apesar dos runs/ antigos

== 6 · COMMIT DO HARNESS: agente que sai sem commitar não perde trabalho ==
  ok    o harness commitou pelo agente
  ok    a worktree ficou limpa (nada solto para ser descartado)
  ok    mensagem exata do commit
  ok    trailer Orq-Ticket presente
  ok    o diff passou a enxergar o trabalho (2 linhas)
  ok    o arquivo fora do escopo foi commitado junto (o enforcement o julga)
  ok    árvore limpa não gera commit vazio
  ok    commit_do_agente roda antes de medir o diff

== 7 · o juiz é avisado de que o commit foi do harness ==
  ok    a nota entra no prompt do juiz
  ok    sem nota, o prompt sai como antes

TODOS OS CHECKS PASSARAM

rc(test-retry-worktree.sh) = 0

--- test-drenagem-sem-progresso.sh ---
== fila: 901 e 902 abortam antes do agente, 903 é saudável (N=3) ==
  | [2026-09-21 13:40:48-0300] ticket 901 (3 processáveis)
  | [orq ERRO] recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-09-21 13:40:48-0300]   ticket 901 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-09-21 13:40:48-0300] ticket 902 (3 processáveis)
  | [2026-09-21 13:40:48-0300]   ticket 902 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: fatal: branch 'frente/902' está em uso por outra worktree
  | [2026-09-21 13:40:48-0300] ticket 903 (3 processáveis)
  | [2026-09-21 13:40:48-0300] nenhum processável não tentado — encerrando (aprovados: 1; sem progresso: 901 902)
  | [2026-09-21 13:40:48-0300] drenagem encerrada: 1 aprovado(s) e mergeado(s)
  | [2026-09-21 13:40:48-0300] ocioso: 901 sem progresso · 902 sem progresso
  ok    executor chamado 3x numa drenagem: 901 902 903 
  ok    terminou em <= N=3 chamadas (sem loop)
  ok    cada ticket tentado UMA vez, na ordem da fila
  ok    o executor recebe --ticket (não reescolhe)
  ok    o saudável (903) foi processado: done
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-09-21T13:40:48-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 sem_progresso=2 dur=0min
  ok    DRENAGEM_FIM conta o aprovado
  ok    DRENAGEM_FIM conta os 2 sem progresso em contador próprio
  STATUS motivo: sem progresso em 901 902: 901 sem progresso · 902 sem progresso
  ok    motivo_ocioso lista TODOS os pulados (901 e 902)

TODOS OS CHECKS PASSARAM

rc(test-drenagem-sem-progresso.sh) = 0

--- test-sem-progresso-limite.sh ---
== 1. ticket 901 sempre aborta: 1, 2, 3 -> bloqueado ==
  --- disparo 1 (aborta): chamadas [901 ] 901=1
  ok    disparo 1: contador 1
  --- disparo 2 (aborta): chamadas [901 ] 901=2
  ok    disparo 2: contador 2 (persistiu entre disparos)
  ok    abaixo do limite, segue pendente
  --- disparo 3 (aborta): chamadas [901 ] 901=
  ok    disparo 3: 901 bloqueado no limite
  nota: sem_progresso: 3 disparos sem progresso entre 2026-09-21 13:40:49-0300 e 2026-09-21 13:40:50-0300; última causa: executor morreu (rc=128, fase=worktree): fatal: '/tmp/_worktrees/fx-901' already exists
  ok    nota cita a última causa pelo DESFECHO do executor (EXECUTOR_MORREU + linha fatal), não pela linha FAIL
  ok    trilha: 901 BLOQUEADO motivo=sem_progresso
  ok    o bloqueio foi COMMITADO (árvore limpa no ticket)
  ok    commit: fila: 901 bloqueado (sem_progresso, 3 disparos)
  ok    o status bloqueado está no commit, não só no disco
  ok    contador zerado ao mudar de status
  --- disparo 4 (aborta): chamadas [] 901=
  ok    disparo 4: bloqueado não é mais escolhido

== 2. adiamento não conta ==
  --- disparo 5 (aborta): chamadas [902 ] 901=
  ok    902 aborta: contador 1
  --- disparo 6 (adia-cooldown): chamadas [902 ] 901=
  ok    adiado com cooldown (mark_adiado): não conta
  ok    (o mark_adiado armou cooldown, como no motor)
  --- disparo 7 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    adiado SEM cooldown (evento ADIADO): não conta
  --- disparo 8 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    segundo adiamento sem cooldown também não conta
  ok    adiado sem cooldown não é reescolhido na mesma drenagem
  --- disparo 9 (aborta): chamadas [902 ] 901=
  ok    abort depois dos adiamentos volta a contar (2)

== 3. staging que avança na vez do ticket zera ==
  --- disparo 10 (aborta): chamadas [902 902 ] 901=
  ok    staging avançou: zerou e recomeçou em 1
  ok    902 não bloqueou
  ok    com staging andando, a drenagem voltou ao ticket (progresso)

== 4. o limite vem do config ==
  --- disparo 11 (aborta): chamadas [903 ] 901=
  ok    sem_progresso_limite=1 no config: bloqueia no 1º disparo
  ok    nota com o limite do config
  ok    valor inválido no config cai no padrão 3
  ok    chave ausente: padrão 3

TODOS OS CHECKS PASSARAM

rc(test-sem-progresso-limite.sh) = 0

--- test-ocioso.sh ---
== 1. 244 atrás de 241b bloqueado, 232 atrás de 231 pendente (sem liberação) ==
  ok    nenhum executor chamado (nada processável)
  trilha: 2026-09-21T13:40:55-0300 --- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
  ok    evento OCIOSO pendentes=3
  ok    244: dependência 241b em bloqueado
  ok    232: dependência 231 em pendente
  ok    231: liberação humano:migration-0031 ausente
  ok    UM evento por drenagem
  ok    trilha continua uma linha por evento (nenhuma linha sem timestamp)
  ok    OCIOSO vem antes do DRENAGEM_FIM
  STATUS.md:
    ORQUESTRADOR · 2026-09-21 13:40:55
    ESTADO   ocioso
    TICKET   —
    DESDE    —
    FASE     —
    FILA     3 pendente · 1 bloqueado · 1 done
    STAGING  b58ef1f · push suprimido (publicar é humano neste repo)
    ÚLTIMO   —
    MOTIVO   sem ticket processável: 231 sem liberação humano:migration-0031 · 232 espera 231 (pendente) · 244 espera 241b (bloqueado)
  ok    STATUS mantém o motivo de sempre
  ok    STATUS: 244 espera 241b (bloqueado)
  ok    STATUS: 232 espera 231 (pendente)
  ok    STATUS: 231 sem liberação
  ok    DRENAGEM_FIM sem campo novo

== 2. pendente pulado por sem-progresso nesta drenagem ==
  trilha: 2026-09-21T13:40:56-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=sem_progresso
  ok    250 foi tentado uma vez
  ok    250: pulado por sem-progresso
  ok    STATUS: 250 sem progresso

== 3. cooldown ativo: o liberado espera o cooldown ==
  trilha: 2026-09-21T13:40:56-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=cooldown:14:10
  ok    250: cooldown até 14:10
  ok    a razão de dependência vence o cooldown
  ok    STATUS: 250 em cooldown até 14:10

== 4. fins que NÃO gravam OCIOSO ==
  ok    pausa: sem OCIOSO (quem pausou já sabe)
  ok    sem pendente nenhum: sem OCIOSO

TODOS OS CHECKS PASSARAM

rc(test-ocioso.sh) = 0

--- test-rc-executor.sh ---
== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) ==
  ok    pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)

== o rc do executor atravessa o tee ==
  --- A: executor sai 3, tee sai 0 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 13:40:58-0300 e 2026-09-21 13:40:58-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    A: o log vê rc=3
  ok    A: a causa do bloqueio carrega rc=3
  --- B: executor sai 0, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 13:40:58-0300 e 2026-09-21 13:40:58-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    B: o log vê rc=0
  ok    B: a causa do bloqueio carrega rc=0
  --- C: executor sai 0, tee sai 5 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 13:40:59-0300 e 2026-09-21 13:40:59-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    C: o log vê rc=0
  ok    C: a causa do bloqueio carrega rc=0
  --- D: executor sai 3, tee sai 5 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 13:40:59-0300 e 2026-09-21 13:40:59-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    D: o log vê rc=3
  ok    D: a causa do bloqueio carrega rc=3

TODOS OS CHECKS PASSARAM

rc(test-rc-executor.sh) = 0

--- test-ambiente.sh ---
== 1. preflight recusa TODO ticket, 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  ok    0 bloqueados depois de 3 disparos
  ok    contadores zerados (nenhum .sem-progresso)
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas ao executor por disparo (máx: 2)
  trilha: 2026-09-21T13:41:02-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada (sem id, sha, número, caminho)
  ok    DRENAGEM_FIM: bloqueados=0 sem_progresso=0
  STATUS: MOTIVO   ambiente: executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa
  ok    motivo_ocioso=ambiente

== 2. causas próprias em tickets diferentes NÃO são ambiente ==
  --- disparo 4 (proprio): chamadas [904 905 ] 901=done/ 902=done/ 903=done/
  ok    904 e 905 somam 1 cada
  ok    nenhum AMBIENTE

== 3. um ticket sozinho travado continua bloqueando no 3º disparo ==
  --- disparo 5 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  --- disparo 6 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  ok    904 bloqueado no 3º disparo
  ok    trilha: 904 BLOQUEADO motivo=sem_progresso
  ok    bloqueio commitado
  ok    nenhum AMBIENTE no caso isolado

TODOS OS CHECKS PASSARAM

rc(test-ambiente.sh) = 0

--- test-causa-adiamento.sh ---
== A. timeout local (rc 124 do watchdog): adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=timeout
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  ok    evento diz cooldown=nao
  ok    nota registra timeout
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=timeout attempt=1 rc=124 dur=2s cooldown=nao

== B. 429: adia COM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=rate_limit
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown ARMADO (limite remoto)
  ok    evento diz cooldown=sim
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=rate_limit attempt=1 rc=1 dur=1s cooldown=sim

== C. 503 / overloaded: adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=servidor
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=1 rc=1 dur=1s cooldown=nao

== D. gate de testes que não rodou (sem placar): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=0s cooldown=nao

== E. tsc ausente (rc 127, command not found): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=0s cooldown=nao

== F. tsc que rodou e apontou erro de código: mérito, não adia ==
  ok    REPROVADO (mérito)
  ok    não adiou
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_typecheck attempt=1 diff=1
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=1

== G. recusa de preflight (árvore de execução suja): ADIADO motivo=preflight ==
  ok    executor sai 0
  ok    trilha: ADIADO motivo=preflight com a causa
  ok    nenhuma linha EXECUTOR_MORREU
  ok    um evento, uma linha
  ok    ticket segue pendente
  ok    cooldown NÃO armado
  | 901 ADIADO motivo=preflight causa=preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.jdYCrFMOGJ/repo — commite ou stashe antes:\n?? lixo.txt

TODOS OS CHECKS PASSARAM

rc(test-causa-adiamento.sh) = 0

--- test-ambiente-adiado.sh ---
== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas por disparo (máx: 2)
  trilha: 2026-09-21T13:41:24-0300 --- AMBIENTE tickets=901,902 causa=ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada, com o motivo preflight
  ok    0 bloqueados
  STATUS: MOTIVO   ambiente: ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa

== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE ==
  --- disparo 4 (sessao): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    um AMBIENTE
  ok    parou na 2ª chamada
  ok    causa: ADIADO motivo=sessao

== 3. adiamentos com causas DIFERENTES não são ambiente ==
  --- disparo 5 (proprio): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  ok    nenhum AMBIENTE
  ok    a drenagem seguiu pelos três

TODOS OS CHECKS PASSARAM

rc(test-ambiente-adiado.sh) = 0

--- test-adiamentos-limite.sh ---
== A. executor real: rc 124 em 0 s com timeout de 30 s não é timeout ==
  trilha: 901 ADIADO motivo=gate_interrompido attempt=1 rc=124 dur=1s cooldown=nao
  ok    ADIADO, e não com motivo=timeout
  ok    a trilha traz a medida (rc=124, duração real)
  nota: adiado (executor) por infraestrutura: gate_interrompido (rc=124 em 1s, abaixo do limite de 30s: morto por fora) em 2026-09-21T16:41:28Z — retomará no próximo disparo
  ok    a nota traz rc=124 e não diz timeout

== B. sempre adiado: bloqueia no 4º disparo com a causa real ==
  --- disparo 1 (adia): 901=pendente/1
  --- disparo 2 (adia): 901=pendente/2
  --- disparo 3 (adia): 901=pendente/3
  ok    contador em 3 depois de 3 disparos
  ok    abaixo do limite, segue pendente
  --- disparo 4 (adia): 901=bloqueado/
  ok    bloqueado no 4º disparo
  nota: adiado 4 vezes: gate_interrompido (rc=124, 9s de execução)
  ok    nota começa por 'adiado 4 vezes: '
  ok    a causa é a medida: motivo, rc=124 e 9s
  ok    trilha: BLOQUEADO motivo=adiamentos n=4 limite=4
  ok    bloqueio commitado
  ok    commit do bloqueio
  ok    contador zerado ao bloquear

== C. adiado que depois aprova zera o contador ==
  --- disparo 5 (adia): 901=pendente/1
  --- disparo 6 (adia): 901=pendente/2
  ok    2 adiamentos contados
  --- disparo 7 (aprova): 901=done/
  ok    aprovado e mergeado
  ok    contador zerado pela aprovação
  --- disparo 8 (adia): 901=pendente/1
  ok    recomeça em 1, não em 3

== D. adiamento COM cooldown não conta nem zera ==
  --- disparo 9 (limite): 901=pendente/1
  ok    contador segue 1

== E. o limite vem do config ==
  --- disparo 10 (adia): 901=bloqueado/
  ok    com limite 2, bloqueia no 2º
  ok    trilha diz n=2 limite=2
  ok    limite inválido ("x") vira 4
  ok    limite inválido (0) vira 4
  ok    limite inválido (-3) vira 4
  ok    limite inválido ("quatro") vira 4
  ok    limite ausente vira 4

== F. AMBIENTE desfaz o que somou na drenagem ==
  --- disparo 11 (adia): 901=pendente/1
  ok    901 em 1 (antes do ambiente)
  --- disparo 12 (mesmo): 901=pendente/1
  ok    um AMBIENTE
  ok    901 volta a 1 e 902 não soma

TODOS OS CHECKS PASSARAM

rc(test-adiamentos-limite.sh) = 0

--- test-reprovado-sub.sh ---
== A. critério vermelho, com permissão negada: mérito, mesmo modelo ==
  ok    a permissão negada foi registrada
  ok    REPROVADO sub=criterio
  ok    RETRY com o mesmo modelo (sonnet), sub=criterio
  ok    nenhuma chamada em opus
  ok    não adiou (permissão negada não é ambiente)
  | 901 INICIO attempt=1 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=05582f6a
  | 901 INICIO attempt=2 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== B. juiz reprovando: escala ==
  ok    REPROVADO sub=juiz
  ok    RETRY model=opus, sub=juiz
  ok    a 2ª chamada do agente foi em opus
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=baixo modelo=sonnet attempt=1
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade sub=juiz worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=17fb3a13
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=alto modelo=opus attempt=2
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo ==
  ok    REPROVADO sub=gate_testes
  ok    RETRY com o mesmo modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=gate_testes worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=fad999c8
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora ==
  ok    trilha fixture do 461 no lugar
  ok    a reprovação desta execução: sub=criterio diff=717
  ok    BLOQUEADO motivo=repeticao
  ok    ticket bloqueado
  ok    nenhum RETRY
  ok    uma chamada paga só
  nota: repetição: 2ª reprovação igual à anterior (sub=criterio, diff=717), sem 3ª volta. critério(s) reprovado(s): o arquivo existe
  ok    a nota diz repetição e o diff
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
  | 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717
  | 461 BLOQUEADO motivo=repeticao sub=criterio diff=717 attempt=1

== E. max_retries vale no total, não por drenagem ==
  --- 1ª execução: tentativas=1 status=pendente
  ok    1ª execução: reprovou, adiou, segue pendente
  ok    1 tentativa consumida, persistida no ticket (o adiado devolveu a sua)
  --- 2ª execução: tentativas=3 status=bloqueado
  ok    3 reprovações no total (max_retries 2 + 1)
  ok    a 2ª execução começa em attempt=2
  ok    BLOQUEADO na attempt=3
  ok    nenhuma 4ª tentativa
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=e5984c2c
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=1s cooldown=nao
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 RETRY attempt=3 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-2 base=e5984c2c
  | 901 INICIO attempt=3 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=3 diff=7
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

TODOS OS CHECKS PASSARAM

rc(test-reprovado-sub.sh) = 0

--- test-notificacao-ambiente.sh ---
== 1. três disparos em AMBIENTE: um aviso ==
  --- disparo 1 (preflight): avisos=1
  --- disparo 2 (preflight): avisos=1
  --- disparo 3 (preflight): avisos=1
  ok    3 drenagens em AMBIENTE
  ok    1 aviso em 3 disparos
  ok    o aviso fala de ambiente
  | 2026-09-21T13:42:17-0300 | Orquestrador: AMBIENTE, a fila parou | a mesma causa em dois tickets não é do ticket: ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>). Nada somou nem bloqueou; avisa de novo quando sair.

== 2. o 4º disparo, saudável: um aviso de saída ==
  --- disparo 4 (aprova): avisos=2
  ok    exatamente 1 aviso novo
  ok    é o aviso de SAÍDA do ambiente
  ok    com o placar da drenagem (3 aprovados)
  | 2026-09-21T13:42:20-0300 | Orquestrador: ambiente normalizado, 3 aprovados, 0 bloqueados | saiu de AMBIENTE (ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>)) · duração 0min · adiados 0

== 3. o 5º disparo, saudável e sem nada: sem aviso de saída de novo ==
  --- disparo 5 (aprova): avisos=3
  ok    nenhum aviso de ambiente repetido

TODOS OS CHECKS PASSARAM

rc(test-notificacao-ambiente.sh) = 0

== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
  rc=0  test-drenagem-sem-progresso.sh
  rc=0  test-sem-progresso-limite.sh
  rc=0  test-ocioso.sh
  rc=0  test-rc-executor.sh
  rc=0  test-ambiente.sh
  rc=0  test-causa-adiamento.sh
  rc=0  test-ambiente-adiado.sh
  rc=0  test-adiamentos-limite.sh
  rc=0  test-reprovado-sub.sh
  rc=0  test-notificacao-ambiente.sh
TODOS OS SCRIPTS SAÍRAM rc 0
rc=0
```

### scripts/kit/test-instalar.sh

```
[fixture] tmp: /tmp/orq-fixture-fFcUVf
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7b/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-fFcUVf/repo
== (a) fixture recém-instanciado ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-fixture-fFcUVf/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    diz 'idêntico ao kit <VERSAO>'

== (b) cópia do fixture com UM byte a mais em lib.sh ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-ZEDXYa/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    exatamente 1 diferença, não uma cascata

== (d) cópia do fixture com UM byte a mais em scripts/roadmap/lint-mapa.py ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-lgI76S/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/roadmap/lint-mapa.py
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/roadmap/lint-mapa.py'
  ok    exatamente 1 diferença, não uma cascata

== (e) --atualizar: dry-run, recusa sem pausa, e o conserto ==
-- (e1) --dry-run lista 'diferente' e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-NWy0nV/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  | 
  | O --atualizar de verdade RECUSARIA, por:
  |   · o loop de '/private/tmp/orq-verificar-NWy0nV/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  |   (a recusa não impede este dry-run de listar tudo)
  ok    rc 0
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    o lib.sh do repo NÃO foi tocado pelo --dry-run
-- (e2) --atualizar sem pausa: recusa com rc 1 --
  | RECUSADO: o loop de '/private/tmp/orq-verificar-NWy0nV/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  ok    rc 1
  ok    a recusa diz que o loop não está pausado
  ok    o repo continua intacto depois da recusa
-- (e2b) com PAUSAR, mas com modificação não commitada no motor: recusa --
  | ?? scripts/orquestrador/nao-commitado.txt
  | RECUSADO: '/private/tmp/orq-verificar-NWy0nV/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA o caminho
  ok    o repo continua intacto depois da recusa 3
-- (e3) --atualizar com PAUSAR e motor limpo: atualiza e fica idêntico --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-NWy0nV/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-NWy0nV/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-NWy0nV/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
  ok    o lib.sh do repo é o do kit
  ok    docs/orquestrador/skill/VERSAO carimbado
  ok    imprime a linha de commit com pathspec explícito
  ok    docs/fila/** intacta
  ok    o PAUSAR do repo continua lá (o kit não retoma o loop por conta própria)

== (f) arquivo só do repo sobrevive ao --atualizar e aparece como 'só no repo' ==
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-hFseuL/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-hFseuL/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | só no repo  scripts/orquestrador/so-do-repo.py
  | 
  | 1 diferença(s)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-hFseuL/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 1 (há 'só no repo' — o verificador do fim conta como diferença)
  ok    so-do-repo.py SOBREVIVEU
  ok    listado como 'só no repo'

== (g) --atualizar recusa com scripts/roadmap/ sujo, e --forcar passa ==
  |  M scripts/roadmap/lint-mapa.py
  | RECUSADO: '/private/tmp/orq-verificar-MrUU2Y/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA scripts/roadmap/lint-mapa.py
  ok    o lint-mapa.py do repo continua intacto depois da recusa
-- (g2) com --forcar: passa, avisa, e o lint-mapa.py vira o do kit --
  |  M scripts/roadmap/lint-mapa.py
  | --forcar: passando por cima de 1 caminho(s) modificado(s) no motor do repo.
  | 
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-MrUU2Y/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-MrUU2Y/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-MrUU2Y/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    avisa que passou por cima
  ok    o lint-mapa.py do repo é o do kit

== (h) --verificar/--atualizar cobrem os testes do harness ==
-- (h1) --verificar acusa o teste envelhecido --
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-z4QSAU/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   test/orquestrador-pacotes.test.ts
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente test/orquestrador-pacotes.test.ts'
  ok    não cita test/produto.test.ts (teste do produto não é motor)
-- (h2) --atualizar corrige, e o teste do produto sobrevive --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-z4QSAU/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-z4QSAU/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-z4QSAU/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    test/orquestrador-pacotes.test.ts do repo é o do kit
  ok    test/produto.test.ts intacto
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
-- (h3) a suíte do REPO passa com os testes que o kit instalou --
  |  ✓ test/orquestrador-prompt-como-rodar.test.ts (10 tests) 3ms
  | 
  |  Test Files  8 passed (8)
  |       Tests  62 passed (62)
  |    Start at  13:42:24
  |    Duration  5.02s (transform 200ms, setup 0ms, collect 6.82s, tests 7.91s, environment 2ms, prepare 445ms)
  ok    npx vitest run no repo: rc 0

== (i) --atualizar --migrar: .orq-pause -> PAUSAR, liberações -> v2 ==
-- (i1) --migrar --dry-run: mostra tudo e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-q1M6Yf/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | === MIGRAR docs/fila/** (--dry-run: NADA é escrito) ===
  | 
  | --- pausa: docs/fila/.orq-pause -> docs/fila/PAUSAR ---
  | motivo preservado: 2026-09-05 09:12 | pausado para aplicar migration 0255
  | (--dry-run: nada foi renomeado)
  | 
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-q1M6Yf/repo/docs/fila/liberacoes.json)
  |            --dry-run: NADA é escrito
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | --- /private/tmp/orq-verificar-q1M6Yf/repo/docs/fila/liberacoes.json (atual)
  | +++ /private/tmp/orq-verificar-q1M6Yf/repo/docs/fila/liberacoes.json (v2 proposto)
  | @@ -1,9 +1,35 @@
  |  {
  | +  "$schema_versao": 2,
  |    "tokens": [
  | -    "migration-0255-aplicada",
  | -    "migration-0259-aplicada",
  | -    "migration-0260-aplicada",
  | -    "migration-0261-aplicada",
  | -    "migration-0262-aplicada"
  | +    {
  | +      "token": "humano:migration-0255-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0259-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0260-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0261-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0262-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    }
  |    ]
  |  }
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-q1M6Yf/repo/docs/fila)
  |            --dry-run: NADA é escrito
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-q1M6Yf/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-q1M6Yf/repo/docs/fila/000-config.json
  |                --dry-run: NADA é escrito
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | 
  | --- /private/tmp/orq-verificar-q1M6Yf/repo/docs/fila/000-config.json (oficial, INTOCADO)
  | +++ /private/tmp/orq-verificar-q1M6Yf/repo/docs/fila/000-config.proposto.json (proposto)
  | @@ -2,17 +2,14 @@
  |    "$schema_versao": 2,
  |    "descricao": "Config do repo de FIXTURE do kit. Mínimo por construção: só as chaves que o motor LÊ hoje, levantadas por grep no disco (grep -ohE \"cfg '[^']*'\" scripts/orquestrador/*.sh, mais os acessos diretos dos .ts). Cada chave traz um comentário _<chave> com a procedência do valor.",
  |    "_procedencia_geral": "Valores de forma vêm de doutrina/templates/config.json; valores de conteúdo, de _referencia-ci/000-config.ci.json (o config REAL do conteudos-infinitos @711ab5e) quando um teste do motor cobra o número exato; o resto é do fixture.",
  | -
  |    "branch_alvo": "staging-auto",
  |    "_branch_alvo": "doutrina/templates/config.json:branch_alvo — lido por lib.sh:53 (CFG_BRANCH_ALVO).",
  |    "branch_protegida": "main",
  |    "_branch_protegida": "local-loop.sh:28 lê '.branch_protegida' (o template chama de branch_principal; o motor lê ESTE nome).",
  | -
  |    "max_retries": 2,
  |    "_max_retries": "_referencia-ci/000-config.ci.json:max_retries — lido por lib.sh:54 e decisao.ts:273.",
  |    "cooldown_minutes": 60,
  |    "_cooldown_minutes": "_referencia-ci/000-config.ci.json:cooldown_minutes — lido por lib.sh (cooldown_arm).",
  | -
  |    "politica_adiamento": {
  |      "regra": "Falha de INFRAESTRUTURA adia. Nunca reprova.",
  |      "causas_que_adiam": [
  | @@ -31,7 +28,6 @@
  |      }
  |    },
  |    "_politica_adiamento": "As 7 causas, na ordem, de _referencia-ci/000-config.ci.json — test-lib-config.sh:58 cobra exatamente 7 e :61 cobra a do juiz pelo nome; decisao.ts:113 itera a lista.",
  | -
  |    "politica_retry": {
  |      "por_causa": {
  |        "diff_cap": {
  | @@ -50,17 +46,14 @@
  |      "proibicao": "NUNCA escalar modelo por falha de tamanho (diff_cap) nem por violação de fronteira (enforcement)."
  |    },
  |    "_politica_retry": "_referencia-ci/000-config.ci.json:politica_retry, sem os campos _porque — decisao.ts:277 indexa por_causa[causa] e rejeita config que mande escalar por diff_cap/enforcement.",
  | -
  |    "migrations_dir": "db/migrations",
  |    "_migrations_dir": "enforcement-core.ts:128 usa para classificar .sql como artefato inerte. O fixture não tem banco; o diretório existe só para a chave não ser nula.",
  |    "sql_pendente_dir": "docs/sql-pendente",
  |    "_sql_pendente_dir": "enforcement-core.ts:128, mesmo par que migrations_dir.",
  | -
  |    "worktrees_dir": "../_worktrees",
  |    "_worktrees_dir": "RELATIVO ao checkout principal (lib.sh:77). Como o fixture é instanciado em <tmp>/repo, isto resolve para <tmp>/_worktrees — nunca ~/Projetos/_worktrees.",
  |    "worktrees_prefixo": "fx-",
  |    "_worktrees_prefixo": "decisao.ts:363. 'fx-' em vez do 'ci-' do conteudos-infinitos: prefixo diferente é o que impede colisão de nome de worktree entre repos.",
  | -
  |    "runs_dir": "docs/fila/runs",
  |    "_runs_dir": "doutrina/templates/config.json:runs_dir — lib.sh:72 (RUNS_BASE).",
  |    "liberacoes_file": "docs/fila/liberacoes.json",
  | @@ -69,7 +62,6 @@
  |    "_decisoes_file": "doutrina/templates/config.json — lib.sh:723.",
  |    "pausar_file": "docs/fila/PAUSAR",
  |    "_pausar_file": "doutrina/templates/config.json — lib.sh:615 (kill switch em arquivo).",
  | -
  |    "modelos": {
  |      "classificador": "haiku",
  |      "executor": "sonnet",
  | @@ -83,7 +75,6 @@
  |    "avaliador_model": "opus",
  |    "retry_final_model": "opus",
  |    "_modelos": "Escada de _referencia-ci/000-config.ci.json (sonnet/opus/opus). juiz.ts:76 lê modelos.juiz_alto/juiz_baixo; executor.sh:149 e decisao.ts:292 leem os três aliases v1.",
  | -
  |    "restricao_execucao": {
  |      "ativa": false,
  |      "tickets_permitidos": [],
  | @@ -92,31 +83,26 @@
  |      "desbloqueio": "preencha executor_model/avaliador_model/retry_final_model em docs/fila/000-config.json"
  |    },
  |    "_restricao_execucao": "decisao.ts:71 lê o objeto inteiro; executor.sh:154 lê .desbloqueio na mensagem de aborto. Inativa aqui: nenhum papel é PENDENTE_*.",
  | -
  |    "diff_cap_linhas": 600,
  |    "_diff_cap_linhas": "600 de _referencia-ci/000-config.ci.json — test-lib-config.sh:50 cobra literalmente 600 ('o NOSSO, não o 2500 do comarka-os').",
  |    "claude_timeout_secs": 900,
  |    "_claude_timeout_secs": "Metade do 1800 do CI: o ticket do fixture é de ~40 linhas e um timeout longo só atrasa o diagnóstico quando o agente trava.",
  |    "claude_max_turns": 40,
  |    "_claude_max_turns": "doutrina/templates/config.json:claude_max_turns (o CI usa 80; 40 basta para um ticket de dois arquivos).",
  | -
  |    "preflight_probe": true,
  |    "_preflight_probe": "LIGADO, e não por gosto: executor.sh:146 sai cedo quando o valor é `false`, e test-retry-worktree.sh:216 exercita `probe_modelos` inteiro (com `claude_run` stubado, sem chamada paga) contra ESTE config — com `false` a seção 4 daquele teste cai em 5 falhas. O preço é uma sondagem real de ~60s ('responda apenas: ok') por drenagem de verdade, que o gate de orçamento mede e o custo.json registra.",
  |    "preflight_env_keys": [],
  |    "_preflight_env_keys": "Vazio: executor.sh:123 itera esta lista e aborta por env faltando. O fixture não tem serviço externo nenhum.",
  | -
  |    "commit_checkpoint": {
  |      "obrigatorio": true,
  |      "quando": "a cada unidade lógica que passe typecheck + teste — não só no fim do ticket",
  |      "_regra": "Passou typecheck e teste? Commita. Trabalho verificado e não commitado não existe."
  |    },
  |    "_commit_checkpoint": "executor.sh lê .commit_checkpoint.quando e ._regra para montar o prompt; texto de _referencia-ci/000-config.ci.json.",
  | -
  |    "repo_origin_deve_conter": "fixture/orq-fixture",
  |    "_repo_origin_deve_conter": "Casa o origin FALSO que o scripts/kit/fixture.sh registra (git@example.invalid:fixture/orq-fixture.git). executor.sh:104-108 aborta o run inteiro se o origin não contiver isto.",
  |    "ambiente_id": "orqfixture",
  |    "_ambiente_id": "executor.sh:111-114 compara com o ref extraído de SUPABASE_URL do .env.local, que o fixture.sh escreve como https://orqfixture.supabase.co. test-lib-config.sh:48 cobra que não seja vazio nem null.",
  | -
  |    "zona_proibida": {
  |      "descricao": "Tudo que o loop NUNCA escreve. Globs relativos à raiz do repo.",
  |      "revisado_humano": true,
  | @@ -138,7 +124,6 @@
  |      "no_write_tables": "TODAS"
  |    },
  |    "_zona_proibida": "Recorte do de _referencia-ci/000-config.ci.json: enforcement-core.ts:211-215 lê no_write_paths + no_write_credenciais.padroes, e :212 trata no_write_tables == 'TODAS' como negação total. Sem banco no fixture, 'TODAS' é a leitura honesta.",
  | -
  |    "paths_harness": [
  |      "scripts/orquestrador/**",
  |      "docs/orquestrador/**",
  | @@ -146,7 +131,6 @@
  |      ".claude/**"
  |    ],
  |    "_paths_harness": "doutrina/templates/config.json:paths_harness, sem mudança — o motor vendorizado mora nos mesmos caminhos aqui. Lido pelo check 5 de scripts/roadmap/lint-mapa.py.",
  | -
  |    "_execucao_dos_gates": {
  |      "ordem_obrigatoria": [
  |        "typecheck",
  | @@ -155,7 +139,6 @@
  |      "interrupcao": "NAO_VALE_PARCIALMENTE"
  |    },
  |    "_ordem": "gates.ts:176-178 ordena .gates[] por esta lista e ERRA se divergir. Dois gates porque o package.json do fixture tem dois scripts: typecheck e test.",
  | -
  |    "gates": [
  |      {
  |        "nome": "typecheck",
  | @@ -172,18 +155,15 @@
  |    ],
  |    "_gates_papel": "Chave OPCIONAL por gate (peça K6b): \"papel\": \"typecheck\" | \"testes\" | \"build\" | \"lint\". É ela que decide o que a linha GATE da trilha diz sobre cada gate. Quando ausente, o papel é INFERIDO do nome (executor.sh, papel_do_gate: *typecheck*/*tsc*/*types* → typecheck; *lint* → lint; *build*/*compil* → build; *test*/*spec* → testes). Declare-a quando o nome do gate não disser o papel — um gate chamado `verificacao` sai como nao-configurado sem ela. Papel que não existe em gate nenhum do config aparece na trilha como `nao-configurado`, nunca `nao-rodou`.",
  |    "_gates": "cmd = os scripts do fixture/package.json, verificados no disco. tipo exit_code (não baseline): o fixture nasce com 0 erro de tipo e 3 testes verdes, então não há erro herdado a tolerar.",
  | -
  |    "launchd": {
  |      "label": "com.orqfixture.orquestrador",
  |      "start_interval": 600
  |    },
  |    "_launchd": "Peça K6c. `label` é o Label do job do launchd e NÃO tem default: instalar-launchd.sh RECUSA sem ele (o CI usa com.conteudos.orquestrador). Um label por repo — para o launchd, dois repos com o mesmo label são o MESMO job, e o segundo bootstrap derruba o primeiro. `start_interval` é o StartInterval em segundos; ausente vira 1800, que é o valor MEDIDO em 06/set/2026 (a medição está no com.orquestrador.plist.template). 600 aqui só para o teste provar que o número sai do config e não do template — o fixture nunca carrega job nenhum.",
  | -
  |    "canal_notificacao": "arquivo",
  |    "_canal_notificacao": "lib.sh:820-823: qualquer valor diferente de 'notificacao_nativa' faz a notificação ficar SÓ no arquivo runs/notificacoes.log. É o padrão que a peça K10 quer para todo repo.",
  |    "push_suprimido": true,
  |    "_push_suprimido": "O origin do fixture é inválido de propósito (example.invalid). Publicar daqui não é opção — e lib.sh:staging_linha já imprime 'push suprimido' no snapshot.",
  | -
  |    "juiz": {
  |      "diff_max_baixo": 300,
  |      "max_tokens_veredicto": 300,
  | @@ -202,7 +182,6 @@
  |      ]
  |    },
  |    "_juiz": "juiz.ts:64-76 lê os quatro campos. paths_alto_risco VAZIO: o fixture só tem src/ e test/, e listar glob que não casa nada seria config decorativa. As palavras são as do doutrina/templates/config.json.",
  | -
  |    "gate_ticket": {
  |      "juiz_para_humano": false,
  |      "max_paths_allowlist": 8,
  | @@ -245,7 +224,6 @@
  |      ]
  |    },
  |    "_gate_ticket": "gate-ticket.ts:carregarCfg lê SÓ proibido_no_cmd e cmd_prefixos_permitidos (os dois nomes conferidos no disco). Os prefixos são o subconjunto do doutrina/templates/config.json que existe neste fixture: sem npm run build, sem npm run lint, sem curl (não há servidor local).",
  | -
  |    "orcamento": {
  |      "usd_dia": 5,
  |      "tokens_dia": 2000000,
  | @@ -259,7 +237,6 @@
  |      }
  |    },
  |    "_orcamento": "campos_usage copiados de _referencia-ci/000-config.ci.json (nomes confirmados lá por sondagem real de claude -p --output-format json). Os TETOS são do fixture e propositalmente baixos: usd_ticket 1 contra os 10 do CI — um ticket de dois arquivos que passe de US$ 1 é sintoma, não trabalho.",
  | -
  |    "executor": {
  |      "auto_verificacao_max": 2,
  |      "modo_arquiteto_para_alto": false,
  | @@ -268,7 +245,6 @@
  |      "trailer_commit": "Orq-Ticket"
  |    },
  |    "_executor": "local-loop.sh:95 lê .executor.trailer_commit para o trailer do merge commit; o resto é o default de doutrina/templates/config.json.",
  | -
  |    "proibicoes_absolutas": {
  |      "regras": [
  |        "nunca push na branch principal",
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/orq-cfg-OZTuAJ/000-config.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | --- .gitignore: o que o repo deve ignorar ---
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | --- orq validar --pendentes (só relatório; NADA é corrigido) ---
  ok    rc 0
  ok    o dry-run mostra o motivo que seria preservado
  ok    o dry-run traz o DIFF das liberações, não um resumo
  ok    o .orq-pause continua lá e nenhum PAUSAR foi criado
  ok    liberacoes.json intacto
  ok    nenhum .bak foi criado
-- (i2) --migrar aplica: renomeia preservando o motivo, e migra as liberações --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | 
  | === MIGRAR docs/fila/** (GRAVANDO, com .bak) ===
  | 
  | motivo preservado: 2026-09-05 09:12 | pausado para aplicar migration 0255
  | RENOMEADO.
  | 
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-q1M6Yf/repo/docs/fila/liberacoes.json)
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | @@ -1,9 +1,35 @@
  | 
  | GRAVADO. Cópia do estado anterior em /private/tmp/orq-verificar-q1M6Yf/repo/docs/fila/liberacoes.json.bak
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-q1M6Yf/repo/docs/fila)
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-q1M6Yf/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-q1M6Yf/repo/docs/fila/000-config.json
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | 
  | @@ -2,17 +2,14 @@
  | @@ -31,7 +28,6 @@
  | @@ -50,17 +46,14 @@
  | @@ -69,7 +62,6 @@
  | @@ -83,7 +75,6 @@
  | @@ -92,31 +83,26 @@
  | @@ -138,7 +124,6 @@
  | @@ -146,7 +131,6 @@
  | @@ -155,7 +139,6 @@
  | @@ -172,18 +155,15 @@
  | @@ -202,7 +182,6 @@
  | @@ -245,7 +224,6 @@
  | @@ -259,7 +237,6 @@
  | @@ -268,7 +245,6 @@
  | 
  | PROPOSTO gravado em /private/tmp/orq-verificar-q1M6Yf/repo/docs/fila/000-config.proposto.json. O oficial NÃO foi tocado.
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /private/tmp/orq-verificar-q1M6Yf/repo/docs/fila/000-config.proposto.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | O config NÃO foi aplicado, e isso é a peça funcionando. Passo humano:
  | 
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  | 
  | e um SEGUNDO commit, separado, para os dados migrados:
  | 
  | Os `.bak` NÃO entram em commit nenhum: são rede local, e o git já é o backup
  | de tudo que estava versionado. Apague-os quando o diff estiver revisado.
  ok    rc 0
  ok    .orq-pause virou PAUSAR
  ok    o MOTIVO foi preservado byte a byte
  ok    liberacoes.json em v2
  ok    o token ganhou o prefixo humano:
  ok    .bak tem o conteúdo ANTERIOR, byte a byte
  ok    o .gitignore do repo NÃO foi editado
  ok    sugere um SEGUNDO commit, separado, para os dados migrados
-- (i3a) M1: a SEGUNDA passada recusa sobrescrever o proposto da primeira --
  ok    rc 1 (recusa, não erro)
  ok    o instalador REPASSA a recusa
  ok    a mensagem dá o nome que a revisão humana deve usar
  ok    o proposto sobrevive byte a byte
-- (i3) rodar de novo é no-op, e o .bak NÃO é sobrescrito --
  ok    rc 0
  ok    a migração diz que não há o que fazer
  ok    a pausa também é no-op
  ok    .bak preservado (é o estado ANTES da PRIMEIRA migração)
-- (i4) .orq-pause E PAUSAR juntos: NÃO migra, e diz por quê --
  ok    recusa migrar com os dois presentes
  ok    o PAUSAR existente não foi sobrescrito
-- (i5) o relato de .gitignore pergunta ao GIT, e nomeia o que falta --
  ok    acusa docs/fila/PAUSAR faltando
  ok    acusa docs/fila/runs/ faltando
  ok    diz que não edita o .gitignore do repo
  ok    runs/ ignorado por runs/.gitignore conta como ok (é como o CI faz)
-- (i5b) K8b-4: o config é PROPOSTO, nunca aplicado pelo instalador --
  ok    relata o renome supabase_project_id → ambiente_id
  ok    relata a conversão do tipo do gate
  ok    c0_intocavel vira item NOMEADO do relatório
  ok    grita que zona_proibida continua ausente
  ok    o 000-config.json OFICIAL não foi tocado
  ok    000-config.proposto.json gravado ao lado
  ok    o proposto está em schema 2
  ok    c0_intocavel atravessa INTACTA para o proposto
  ok    diz que não aplicou, e dá os 4 passos humanos
-- (i5c) K8b-5: bloco JSON dos pendentes, prosa intacta byte a byte --
  ok    recon_esperado virou recon no ticket real
  ok    o nome antigo saiu do bloco
  ok    a PROSA é byte a byte a mesma
  ok    nenhum .bak de ticket
  ok    o relatório roda o orq validar sobre a fila migrada
  ok    o orq validar não CORRIGIU o ticket (segunda passada é no-op)
-- (i6) --dry-run PREVÊ a recusa em vez de dizer que está tudo bem --
  ok    o dry-run continua saindo 0 (ele não é o gate)
  ok    o dry-run avisa que o --atualizar de verdade recusaria
  ok    e diz o motivo (sem pausa)

== (j) --novo: repo git sem docs/fila ==
-- (j1) o repo nasce inteiro --
  | NOVO       kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-novo-teRHbI
  | 
  | criado     scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (VERSAO 2.1.0-dev)
  | criado     7 teste(s) de harness e 3 fixture(s) (peça K8d)
  | 
  | criado     docs/fila/rascunhos/.gitkeep
  | criado     docs/fila/000-config.json
  | criado     docs/fila/_TEMPLATE.md
  | criado     docs/fila/decisoes-pendentes.md
  | criado     docs/fila/liberacoes.json (v2 vazio)
  | criado     docs/roadmap/mapa.json
  | criado     docs/roadmap/MAPA.md
  | criado     docs/orquestrador/PLAYBOOK.md
  | criado     docs/orquestrador/PECAS.md
  | escrito    .gitignore (+2 linha(s))
  | criado     docs/fila/runs/.gitignore
  | criado     docs/fila/runs/custo.json
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-novo-teRHbI
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | --- orq config (o formulário ainda está em branco; é assim que ele nasce) ---
  | CONFIG   /private/tmp/orq-novo-teRHbI/docs/fila/000-config.json
  |   branch_protegida: placeholder não preenchido: "<a branch que o loop NUNCA empurra — ex.: main>"
  |   worktrees_prefixo: placeholder não preenchido: "<prefixo curto das worktrees deste repo — ex.: ci-, os-, fx->"
  |   migrations_dir: placeholder não preenchido: "<ex: supabase/migrations | db/migrations>"
  |   preflight_env_keys[0]: placeholder não preenchido: "<ENV_OBRIGATORIA_1>"
  |   preflight_env_keys[1]: placeholder não preenchido: "<ENV_OBRIGATORIA_2>"
  |   juiz.paths_alto_risco[0]: placeholder não preenchido: "<ex: supabase/**>"
  |   juiz.paths_alto_risco[1]: placeholder não preenchido: "<ex: src/auth/**>"
  |   juiz.paths_alto_risco[2]: placeholder não preenchido: "<ex: src/billing/**>"
  |   gate_ticket.servidor_local_cmd: placeholder não preenchido: "<ex: npm run dev -- --port 3000 | vazio se não houver critério HTTP; sem ele, remova os prefixos curl>"
  |   sentinela.smoke_cmd: placeholder não preenchido: "<ex: curl -sf http://localhost:3000/api/health>"
  |   orcamento.campos_usage.custo_usd: placeholder não preenchido: "<nome do campo de custo no JSON de claude -p --output-format json, confirmado no pré-voo cat. 8>"
  |   orcamento.campos_usage.tokens_in: placeholder não preenchido: "<campo>"
  |   orcamento.campos_usage.tokens_out: placeholder não preenchido: "<campo>"
  |   orcamento.campos_usage.tokens_cache: placeholder não preenchido: "<campo>"
  |   relatorio.canal: placeholder não preenchido: "<notificacao_nativa | webhook_url | email>"
  |   repo_origin_deve_conter: placeholder não preenchido: "<org/repo>"
  |   ambiente_id: placeholder não preenchido: "<ref do banco/projeto, ou vazio se não aplicável>"
  |   zona_proibida.no_write_tables[0]: placeholder não preenchido: "<tabela_compartilhada_1>"
  |   zona_proibida.no_write_prefixes[0]: placeholder não preenchido: "<prefixo_proibido_>"
  |   zona_proibida.readonly_ok[0]: placeholder não preenchido: "<tabelas que o loop pode SELECT mas nunca escrever>"
  |   zona_proibida.excecoes_os_owned[0]: placeholder não preenchido: "<tabelas de nome parecido mas de propriedade deste repo>"
  |   launchd.label: placeholder não preenchido: "<ex: com.suaorg.orquestrador — OBRIGATÓRIO, um por repo>"
  |   gates[0].cmd: placeholder não preenchido: "<ex: npx tsc --noEmit>"
  |   gates[0].baseline_scope_regex: placeholder não preenchido: "<regex de arquivos com erros herdados tolerados, ou vazio>"
  |   gates[1].cmd: placeholder não preenchido: "<ex: npx vitest run>"
  |   gates[2].cmd: placeholder não preenchido: "<ex: npm run build>"
  |   lint.cmd: placeholder não preenchido: "<ex: npx eslint . --max-warnings=999999>"
  | 
  | 27 violação(ões)
  | 
  | PRÓXIMOS PASSOS, nesta ordem:
  |   1. preencha docs/fila/000-config.json — cada placeholder <...> acima é uma decisão local
  |   2. bash scripts/orq config           # tem de sair 0 violações
  |   3. pré-voo: docs/orquestrador/skill/references/pre-voo.md, categorias 0 a 6
  |   4. um ticket-fixture trivial atravessa o loop, com merge na staging
  |   5. SÓ ENTÃO agendar: bash scripts/orquestrador/instalar-launchd.sh
  |      (ele RECUSA sem launchd.label, e o label é um dos placeholders do passo 1)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-novo-teRHbI
  |   git add .gitignore scripts/orquestrador scripts/orq scripts/roadmap docs \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'orquestrador: instalação inicial, kit 2.1.0-dev'
  ok    rc 0
  ok    criou docs/fila/000-config.json
  ok    criou docs/fila/_TEMPLATE.md
  ok    criou docs/fila/liberacoes.json
  ok    criou docs/fila/decisoes-pendentes.md
  ok    criou docs/fila/rascunhos/.gitkeep
  ok    criou docs/roadmap/mapa.json
  ok    criou docs/roadmap/MAPA.md
  ok    criou docs/orquestrador/PLAYBOOK.md
  ok    criou docs/orquestrador/PECAS.md
  ok    criou docs/orquestrador/skill/SKILL.md
  ok    criou docs/orquestrador/skill/VERSAO
  ok    criou scripts/orq
  ok    criou scripts/orquestrador/lib.sh
  ok    criou scripts/roadmap/lint-mapa.py
  ok    criou test/fixtures/orq-harness.ts
  ok    criou docs/fila/runs/.gitignore
  ok    VERSAO carimbado
  ok    liberacoes.json nasce em v2
-- (j2) NADA de launchd: agendar é passo separado --
  ok    nenhum plist instanciado no repo
  ok    os próximos passos põem o agendamento por ÚLTIMO
-- (j3) orq config: só placeholders, NENHUMA chave ausente --
  ok    rc 1 (formulário em branco é config inválido, e tem de ser)
  ok    lista os placeholders
  ok    nenhuma chave obrigatória AUSENTE (o template só precisa ser preenchido)
-- (j4) --verificar: idêntico ao kit --
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    idêntico ao kit
-- (j5) .gitignore: acrescenta o que falta, preserva o que havia --
  ok    a linha que já existia sobreviveu
  ok    acrescentou docs/fila/PAUSAR
  ok    docs/fila/runs/ é ignorado (o git confirma)
-- (j6) rodar de novo RECUSA: com fila, o verbo é --atualizar --
  ok    rc 1
  ok    a recusa diz por quê e aponta o --atualizar
-- (j7) repo que não é git: RECUSA antes de escrever qualquer coisa --
  ok    rc 1
  ok    a recusa nomeia a causa
  ok    não escreveu NADA no diretório recusado

== (k) T1 · sem node_modules/.bin/tsx ==
-- (k1) --atualizar RECUSA, nomeando o caminho e o comando --
  | RECUSADO: '/private/tmp/orq-sem-tsx-MeJUHC' não tem node_modules/.bin/tsx: o motor do orquestrador é TypeScript e nenhuma parte dele roda sem tsx. Instale a dependência de DESENVOLVIMENTO no repo, com o loop pausado, e repita: npm i -D tsx@^4.19.0   (ou o equivalente do gerenciador deste repo)
  ok    rc 1
  ok    diz RECUSADO
  ok    nomeia node_modules/.bin/tsx
  ok    dá a linha de instalação
-- (k2) --forcar NÃO dispensa (forçar copiaria um motor que não roda) --
  ok    rc 1 com --forcar
-- (k3) --dry-run SÓ AVISA: sai 0, prevê a recusa e não escreve nada --
  ok    rc 0 (o dry-run não é o gate)
  ok    prevê a recusa
  ok    e diz qual
  ok    árvore idêntica antes e depois
-- (k4) com o tsx de volta, o --atualizar segue normalmente --
  ok    rc 0
  ok    nenhuma reclamação de tsx

== (c) ORQ_CI_CHECKOUT não setado (SÓ LEITURA — o resultado é achado, não gate) ==
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
rc=0
```

Meta cumprida: as três com rc 0, sem falha antiga.

### bash instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run

Recusaria por falta de pausa: registrado, e não pausei.

```
ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.

VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
           repo /Users/lucasantos/Projetos/conteudos-infinitos

carimbo    2.1.0-dev

diferente   scripts/orquestrador/com.orquestrador.plist.template
diferente   scripts/orquestrador/config-chaves.ts
diferente   scripts/orquestrador/decisao-cli.ts
diferente   scripts/orquestrador/decisao.ts
diferente   scripts/orquestrador/executor.sh
diferente   scripts/orquestrador/lib.sh
diferente   scripts/orquestrador/local-loop.sh
só no kit   scripts/orquestrador/test-adiamentos-limite.sh
só no kit   scripts/orquestrador/test-ambiente-adiado.sh
só no kit   scripts/orquestrador/test-causa-adiamento.sh
só no kit   scripts/orquestrador/test-fixture-executor.sh
só no kit   scripts/orquestrador/test-notificacao-ambiente.sh
só no kit   scripts/orquestrador/test-reprovado-sub.sh
diferente   docs/orquestrador/skill/templates/config.json

14 diferença(s)

O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/conteudos-infinitos' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  (a recusa não impede este dry-run de listar tudo)
rc=0
```

### bash instalar.sh --atualizar ~/Projetos/actus-saas --dry-run

Recusaria por falta de pausa e por STATUS `executando`: registrado, e não pausei.

```
ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.

VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
           repo /Users/lucasantos/Projetos/actus-saas

carimbo    2.1.0-dev

diferente   scripts/orquestrador/com.orquestrador.plist.template
diferente   scripts/orquestrador/config-chaves.ts
diferente   scripts/orquestrador/config-tabela.ts
diferente   scripts/orquestrador/decisao-cli.ts
diferente   scripts/orquestrador/decisao.ts
diferente   scripts/orquestrador/enforcement-core.ts
diferente   scripts/orquestrador/executor.sh
diferente   scripts/orquestrador/gate-ticket.ts
diferente   scripts/orquestrador/lib.sh
diferente   scripts/orquestrador/local-loop.sh
só no kit   scripts/orquestrador/test-adiamentos-limite.sh
só no kit   scripts/orquestrador/test-ambiente-adiado.sh
só no kit   scripts/orquestrador/test-ambiente.sh
só no kit   scripts/orquestrador/test-causa-adiamento.sh
só no kit   scripts/orquestrador/test-drenagem-sem-progresso.sh
diferente   scripts/orquestrador/test-drenagem.sh
só no kit   scripts/orquestrador/test-fixture-drenagem.sh
só no kit   scripts/orquestrador/test-fixture-executor.sh
só no repo  scripts/orquestrador/test-gate-prevoo.sh
diferente   scripts/orquestrador/test-lib-config.sh
só no kit   scripts/orquestrador/test-notificacao-ambiente.sh
só no kit   scripts/orquestrador/test-ocioso.sh
só no kit   scripts/orquestrador/test-rc-executor.sh
só no kit   scripts/orquestrador/test-reprovado-sub.sh
diferente   scripts/orquestrador/test-retry-worktree.sh
só no kit   scripts/orquestrador/test-sem-progresso-limite.sh
só no repo  scripts/orquestrador/test-tentativas-persistidas.sh
diferente   docs/orquestrador/skill/templates/config.json

28 diferença(s)

O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/actus-saas' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  · docs/fila/runs/STATUS.md de '/Users/lucasantos/Projetos/actus-saas' não diz 'ocioso': ESTADO executando. Espere a drenagem em curso terminar.
  (a recusa não impede este dry-run de listar tudo)
rc=0
```

O mesmo dry-run com o kit de `main` (`~/Projetos/orquestrador-kit`, `b70e6e3`), a linha de base das 21:

```
ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.

VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
           repo /Users/lucasantos/Projetos/actus-saas

carimbo    2.1.0-dev

diferente   scripts/orquestrador/com.orquestrador.plist.template
diferente   scripts/orquestrador/config-chaves.ts
diferente   scripts/orquestrador/config-tabela.ts
diferente   scripts/orquestrador/decisao.ts
diferente   scripts/orquestrador/enforcement-core.ts
diferente   scripts/orquestrador/executor.sh
diferente   scripts/orquestrador/gate-ticket.ts
diferente   scripts/orquestrador/lib.sh
diferente   scripts/orquestrador/local-loop.sh
só no kit   scripts/orquestrador/test-ambiente.sh
só no kit   scripts/orquestrador/test-drenagem-sem-progresso.sh
diferente   scripts/orquestrador/test-drenagem.sh
só no kit   scripts/orquestrador/test-fixture-drenagem.sh
só no repo  scripts/orquestrador/test-gate-prevoo.sh
diferente   scripts/orquestrador/test-lib-config.sh
só no kit   scripts/orquestrador/test-ocioso.sh
só no kit   scripts/orquestrador/test-rc-executor.sh
diferente   scripts/orquestrador/test-retry-worktree.sh
só no kit   scripts/orquestrador/test-sem-progresso-limite.sh
só no repo  scripts/orquestrador/test-tentativas-persistidas.sh
diferente   docs/orquestrador/skill/templates/config.json

21 diferença(s)

O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/actus-saas' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  · docs/fila/runs/STATUS.md de '/Users/lucasantos/Projetos/actus-saas' não diz 'ocioso': ESTADO executando. Espere a drenagem em curso terminar.
  (a recusa não impede este dry-run de listar tudo)
```

### As 21 diferenças do Actus (contra o kit de `main`), uma a uma

A linha de base são as 21 do dry-run com o kit de `main` (`b70e6e3`, saída crua acima). Contra
esta branch são 28: as mesmas 21 mais os 6 testes novos da 7b (só no kit) e o
`decisao-cli.ts` (a 7b-4 acrescentou o subcomando `repeticao`). `--atualizar` é `cp`: arquivo
"só no repo" NÃO é apagado (`instalar.sh:16-17`).

| # | Arquivo | O que o Actus tem de próprio | Veredito |
|---|---|---|---|
| 1 | `com.orquestrador.plist.template` | `5791209` RunAtLoad true | **7b cobre** (7b-7); segue "diferente" só pelo comentário novo |
| 2 | `config-chaves.ts` | nada (o kit andou: 7a-3, 7b-3) | sem perda |
| 3 | `config-tabela.ts` | `43fccdd` 8ª causa; `7781241` e `f1e9796` comentários e ponteiros | **perda aceita**: a 8ª causa é o oposto da decisão (b); ponteiros e contagem são do Actus |
| 4 | `decisao.ts` | `08afb3e`/`748b31d` causa `ambiente`; `e6fad83` ponteiros `.mjs` marcados como históricos em comentário | `ambiente`: **perda aceita** (decisão b); "verde vence": **7b cobre** (já é o comportamento); `e6fad83`: **7d** (só comentário) |
| 5 | `enforcement-core.ts` | `e6fad83`, só comentário | **7d** (cosmético) |
| 6 | `executor.sh` | `08afb3e`/`748b31d` `permissoesNegadas` no sinal; `f3aaa89` tentativas; `c404986` gate de ticket como pré-voo do `drive_ticket` | permissoesNegadas: **perda aceita**; tentativas: **7b cobre** (7b-4); gate pré-voo: **7d, e seria PERDA hoje** |
| 7 | `gate-ticket.ts` | `aab3f4e` reprova `\| grep -q`; `a15daca` reprova saída textual do vitest e avisa caminho fora da allowlist; `c404986` flag `--violacoes` | **7d, e seria PERDA hoje** |
| 8 | `lib.sh` | `f3aaa89` funções de tentativas; `7781241` comentário | tentativas: **7b cobre** (mesmos nomes); comentário: sem efeito |
| 9 | `local-loop.sh` | `f3aaa89` zera tentativas no done | **7b cobre** (7b-4) |
| 10 | `test-ambiente.sh` (só no kit) | n/a | sem perda (7a-8 chega) |
| 11 | `test-drenagem-sem-progresso.sh` (só no kit) | n/a | sem perda |
| 12 | `test-drenagem.sh` | nada (o kit mudou na 7a-1) | sem perda |
| 13 | `test-fixture-drenagem.sh` (só no kit) | n/a | sem perda |
| 14 | `test-gate-prevoo.sh` (só no repo) | teste do `c404986` | **7d**: sobrevive ao `cp`, mas fica VERMELHO com o executor do kit, que não tem o gate pré-voo |
| 15 | `test-lib-config.sh` | `08afb3e`/`748b31d` casos `ambiente`; `bf658ec` diff_cap não cravado; `f8c6e77` diffLines 1 | `ambiente`: perda aceita; `bf658ec`/`f8c6e77`: **7d, e seria PERDA hoje**: o do kit afirma `diff_cap = 600` e 7 causas (`test-lib-config.sh:50,58`) e falha no Actus (2500 e 8) |
| 16 | `test-ocioso.sh` (só no kit) | n/a | sem perda |
| 17 | `test-rc-executor.sh` (só no kit) | n/a | sem perda |
| 18 | `test-retry-worktree.sh` | `c404986` (fixture 901 ganha `bloco` e `risco` para passar pelo pré-voo) | **7d**, junto com o gate pré-voo; sem o pré-voo, a versão do kit basta |
| 19 | `test-sem-progresso-limite.sh` (só no kit) | n/a | sem perda |
| 20 | `test-tentativas-persistidas.sh` (só no repo) | teste do `f3aaa89` (+ `c404986`) | **7b cobre o comportamento** (`test-reprovado-sub.sh` caso E); o arquivo sobrevive e é **7d** decidir se sai |
| 21 | `docs/orquestrador/skill/templates/config.json` | nada (o kit andou: 7a-3, 7b-3) | sem perda |

Resumo: a 7b cobre 1, 6 (tentativas), 8, 9 e 20, e o "verde vence" de 4. Perda aceita por
decisão: a causa `ambiente` em 3, 4, 6 e 15. **Perda real se o Actus fosse atualizado hoje**:
o gate de ticket (6, 7, 14, 18) e o `test-lib-config.sh` sem número cravado (15). Os dois são
a 7d, e o Actus não deve receber o kit antes disso.

### git log --oneline main..kit/etapa7b

```
470c237 7b-6: docs da etapa 7b (PECAS, CHANGELOG e CONTRATO)
27177af 7b-7: RunAtLoad true no template do plist
052ac50 7b-5: o aviso de AMBIENTE só na transição
ffab528 7b-4: sub-motivo, escalada só com juiz, corte de repetição e tentativas persistidas
dd3ecd7 7b-3: teto de adiamentos consecutivos, com a causa real
cfb5cf3 7b-2: tabela de causas (cooldown só para limite remoto)
a28fe81 7b-1: nenhum teste do kit lê arquivo vivo de outro repo (K8e)
```

## O que fica para a 7c (e para a 7d)

- **7c · `docs/launchd.md`** ainda mostra `RunAtLoad false` e diz "carregar o agente não é
  disparar"; `test/orquestrador-agendamento.test.ts:191-193` fixa o doc. Os dois estão fora do
  escopo desta etapa; o CONTRATO §9.4 registra a divergência.
- **7c · `test-lib-config.sh` sem números cravados** (porte do `bf658ec` e `f8c6e77` do
  Actus): hoje ele afirma `diff_cap = 600` e 7 causas, e só passa no CI e no fixture.
- **7c · notificação da recusa de preflight sem AMBIENTE**: um ticket sozinho recusado pelo
  preflight (fila de um pendente) não gera AMBIENTE; ele soma no teto de adiamentos e
  bloqueia no 4º, com a causa. É o comportamento pedido, mas o bloqueio de um ticket por um
  problema de ambiente, quando ele é o único pendente, merece uma segunda olhada.
- **7c · peça E2 da revisão** (gate streak cross-ticket por `gate_<papel>`): agora que o
  REPROVADO tem `sub=`, a contagem cross-ticket tem a chave certa.
- **7d · o que o Actus tem e o kit não**: o gate de ticket como pré-voo do `drive_ticket`
  (`c404986`), as regras `grep -q` em pipe (`aab3f4e`) e saída textual do vitest (`a15daca`),
  e os ponteiros `.mjs` como histórico (`e6fad83`). Sem isso, atualizar o Actus apaga o que
  hoje segura os critérios ruins dele.
- **Travessões nos comentários e mensagens do motor**: os textos novos desta etapa foram
  escritos sem; os que já existiam, e a mensagem do `die` do preflight que aparece como dado
  na trilha e no CONTRATO, seguem como estavam.

---

# Acréscimo · 7b-8 (antes do merge)

sha: `551e967`. Mesmas regras; sem push, sem merge.

## As duas perguntas

**1. Onde a contagem de tentativas é gravada, e se é commitada.** Gravada em
`executor.sh:1078` (`ticket_set_tentativas` com `attempt+1`) e commitada logo em seguida, em
`:1079` (`ticket_commit "fila: <id> tentativa N"`), ANTES de rodar a tentativa. A devolução
nos desfechos que não são reprovação (`:1084`) vai no commit do próprio desfecho: `mark_adiado`
(`lib.sh`), o commit do aprovado e o `marca_refatiar`. No bloqueio, `ticket_commit "fila: <id>
bloqueado"`. **Já era commitada**: o teste novo prova, com o `claude` falso registrando o
`git status --porcelain -- docs/fila` do checkout principal a cada chamada ao agente, que
docs/fila está limpo depois de REPROVADO + RETRY (chamadas 2 e 3), e o log mostra os commits
`tentativa 1`, `2`, `3`. Nada a corrigir aqui.

**2. Devolução humana.** Falhava: o ticket devolvido rodava a attempt=4 e bloqueava na hora
(vermelho abaixo). Virou a 7b-8. Regra (`decisao.ts:reabertoDeBloqueado`): status `pendente`
e o último desfecho do ticket na trilha é `BLOQUEADO`, porque o loop nunca tira um ticket de
bloqueado. Nesse caso `lib.sh:reabertura_humana` zera `tentativas` (pelo `ticket_commit`),
apaga `runs/<id>/.sem-progresso` e `.adiamentos`, e grava `RECUPERADO motivo=reaberto
de=bloqueado`, o que também impede zerar duas vezes. É chamada pela drenagem antes do
executor (`local-loop.sh`, antes da régua da volta, para valer mesmo com o preflight
recusando) e pelo executor antes de ler `tentativas` (executor chamado sozinho).

Decisões minhas, para conferir: a detecção é pela trilha (sem trilha legível, nada zera);
devolução de `refatiar` para `pendente` não está coberta (o pedido foi bloqueado); o evento
usa o `RECUPERADO` do vocabulário, com `motivo=reaberto`, em vez de um evento novo.

Duas correções no próprio teste durante a peça: `git log | grep -q` sob `pipefail` falhava por
SIGPIPE (o log passou para uma variável antes do grep); o padrão do evento esperava um espaço
depois de `de=bloqueado`, e a linha termina ali.

**Achado para a 7c (motor, fora desta peça):** a segunda drenagem do teste morria em
`ensure_staging_worktree` com "worktree de merge NÃO pertence a este repo": `git_common_abs`
(`lib.sh`) compara o dono por `pwd` lógico, e no macOS `/var/...` e `/private/var/...` são o
mesmo lugar. Só aparece quando a raiz de execução passa por symlink; o molde de teste passou a
usar o caminho físico (`pwd -P`), e o motor segue como estava.

## Vermelho (o teste final contra o motor de 470c237, por git archive num diretório temporário)

```
== 1. a contagem de tentativas é commitada: docs/fila limpo depois de REPROVADO e RETRY ==
  ok    houve REPROVADO e RETRY
  | == chamada 1
  | == chamada 2
  | == chamada 3
  ok    docs/fila limpo no checkout principal em TODA chamada (inclusive depois de REPROVADO+RETRY)
  ok    docs/fila limpo no fim
  | fila: 901 bloqueado
  | fila: 901 tentativa 3
  | fila: 901 tentativa 2
  | fila: 901 tentativa 1
  | fixture: fila inicial
  ok    commit 'fila: 901 tentativa 2' no log
  ok    bloqueado por max_retries com tentativas=3

== 2. devolução humana: bloqueado -> pendente num commit humano zera tudo ==
  ok    antes da drenagem: pendente, tentativas=3, .sem-progresso=2, .adiamentos=3
  | --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
  | 901 INICIO attempt=4 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=4 diff=8
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=4
  | --- DRENAGEM_FIM aprovados=0 bloqueados=1 adiados=0 refatiar=0 sem_progresso=0 dur=0min
  FALHA não recomeçou em attempt=1
  FALHA bloqueou de novo
  FALHA sem RETRY
  FALHA status=bloqueado
  FALHA tentativas=4
  ok    .sem-progresso zerado
  FALHA .adiamentos: 
  FALHA sem RECUPERADO motivo=reaberto
  ok    docs/fila limpo depois da drenagem (o zero também foi commitado)

== 3. a devolução zera UMA vez: a drenagem seguinte continua de onde parou ==
  FALHA INICIO: 2026-09-21T13:58:25-0300 --- DRENAGEM_INICIO alvo=staging-auto processaveis=0
  ok    nenhum RECUPERADO novo

8 CHECK(S) FALHARAM
rc=1
```

## Verde

```
== 1. a contagem de tentativas é commitada: docs/fila limpo depois de REPROVADO e RETRY ==
  ok    houve REPROVADO e RETRY
  | == chamada 1
  | == chamada 2
  | == chamada 3
  ok    docs/fila limpo no checkout principal em TODA chamada (inclusive depois de REPROVADO+RETRY)
  ok    docs/fila limpo no fim
  | fila: 901 bloqueado
  | fila: 901 tentativa 3
  | fila: 901 tentativa 2
  | fila: 901 tentativa 1
  | fixture: fila inicial
  ok    commit 'fila: 901 tentativa 2' no log
  ok    bloqueado por max_retries com tentativas=3

== 2. devolução humana: bloqueado -> pendente num commit humano zera tudo ==
  ok    antes da drenagem: pendente, tentativas=3, .sem-progresso=2, .adiamentos=3
  | --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
  | 901 RECUPERADO motivo=reaberto de=bloqueado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=8
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-3 base=7479d997
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | --- OCIOSO pendentes=1 901=adiado
  | --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=1 refatiar=0 sem_progresso=0 dur=0min
  ok    a drenagem executou o ticket a partir de attempt=1
  ok    não bloqueou na hora
  ok    com retry disponível (RETRY attempt=2)
  ok    segue pendente (a 2ª tentativa adiou)
  ok    tentativas=1 (zerada e somada uma reprovação)
  ok    .sem-progresso zerado
  ok    .adiamentos recomeçou em 1 (era 3; sem zerar seria 4 e bloquearia)
  ok    trilha: RECUPERADO motivo=reaberto de=bloqueado
  ok    docs/fila limpo depois da drenagem (o zero também foi commitado)

== 3. a devolução zera UMA vez: a drenagem seguinte continua de onde parou ==
  ok    recomeça em attempt=2 (não zera de novo)
  ok    nenhum RECUPERADO novo

TODOS OS CHECKS PASSARAM
rc=0
```

## Diff

```
commit 551e96728c66a75b5a07e3da52081bcc92a3c2c2
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Mon Sep 21 14:01:14 2026 -0300

    7b-8: devolução humana zera tentativas, .sem-progresso e .adiamentos
    
    - decisao.ts: reabertoDeBloqueado (status pendente e último desfecho do
      ticket na trilha = BLOQUEADO: o loop nunca tira ticket de bloqueado);
      decisao-cli.ts: subcomando reaberto.
    - lib.sh: reabertura_humana zera tentativas pelo ticket_commit, apaga
      .sem-progresso e .adiamentos e grava RECUPERADO motivo=reaberto
      de=bloqueado (o que também impede zerar duas vezes). Chamada pela drenagem
      antes do executor e pelo executor antes de ler tentativas.
    - test-reabertura-humana.sh: com drenagem de verdade, prova que docs/fila
      fica limpo em toda chamada (a gravação de tentativas já era commitada) e
      que o ticket devolvido recomeça em attempt=1. Antes: attempt=4 e bloqueio
      na hora.
    - test-fixture-executor.sh: tmp por caminho físico (git_common_abs compara
      /var com /private/var; achado para a 7c) e status de docs/fila por chamada.
    - CONTRATO, PECAS e CHANGELOG.
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
---
 CHANGELOG.md                                   |  4 +-
 CONTRATO.md                                    | 15 +++-
 docs/PECAS.md                                  | 11 ++-
 scripts/kit/test-shell.sh                      |  3 +-
 scripts/orquestrador/decisao-cli.ts            |  9 +++
 scripts/orquestrador/decisao.ts                | 20 ++++++
 scripts/orquestrador/executor.sh               |  4 ++
 scripts/orquestrador/lib.sh                    | 29 ++++++++
 scripts/orquestrador/local-loop.sh             |  5 ++
 scripts/orquestrador/test-fixture-executor.sh  |  9 ++-
 scripts/orquestrador/test-reabertura-humana.sh | 98 ++++++++++++++++++++++++++
 test/orquestrador-isolamento-teste.test.ts     |  1 +
 test/orquestrador-sub-repeticao.test.ts        | 21 +++++-
 13 files changed, 223 insertions(+), 6 deletions(-)

diff --git a/CHANGELOG.md b/CHANGELOG.md
index 8be3db9..e15d5df 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -649,7 +649,9 @@ opus, o Actus gastou US$ 9,28 por ticket aprovado (US$ 3,06 no CI), todo adiamen
   repetição, tentativas persistidas no ticket (max_retries no total).
 - **7b-5** `052ac50`: aviso de AMBIENTE só na entrada e na saída.
 - **7b-7** `27177af`: `RunAtLoad` true no template do plist.
-- **7b-6**: PECAS, este CHANGELOG e o CONTRATO.
+- **7b-6** `470c237`: PECAS, este CHANGELOG e o CONTRATO.
+- **7b-8**: ticket devolvido por humano de bloqueado para pendente volta com tentativas,
+  `.sem-progresso` e `.adiamentos` zerados (`RECUPERADO motivo=reaberto`).
 
 O que o CI faz diferente, ao atualizar: um 503 ou um timeout deixam de parar a fila por uma
 hora; um gate cujo runner não roda adia em vez de gastar retry em opus; um critério vermelho
diff --git a/CONTRATO.md b/CONTRATO.md
index f10d7c4..a756d95 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -181,7 +181,7 @@ Estes, e só estes, são emitidos hoje (`grep -rn '^\s*event ' scripts/`):
 | `RETRY` | `executor.sh:drive_ticket` | `attempt=` `model=` `motivo=` `sub=` `worktree=` |
 | `REFATIAR` | `executor.sh:896` | `motivo=` `arquivos=` |
 | `MERGE` | `local-loop.sh:173` | `alvo=` `sha=` |
-| `RECUPERADO` | `executor.sh:1105`, `local-loop.sh:55`, `launchd-run.sh:102` | `motivo=ja-mergeado\|lock-orfao\|status-congelado` |
+| `RECUPERADO` | `executor.sh:reconcile_merged`, `local-loop.sh:55`, `launchd-run.sh:102`, `lib.sh:reabertura_humana` | `motivo=ja-mergeado\|lock-orfao\|status-congelado` · devolução humana: `motivo=reaberto` `de=bloqueado` (7b-8) |
 | `EXECUTOR_MORREU` | `executor.sh:1136` | `rc=` `fase=` [`sinal=`] |
 | `ORCAMENTO` | `lib.sh:954` | `escopo=` `adiado_ate=` `consumo=` |
 | `COMMIT_HARNESS` | `executor.sh:725` | `motivo=agente-saiu-sem-commitar` |
@@ -287,6 +287,19 @@ desfecho não é reprovação; a drenagem zera ao mergear. `max_retries` vale no
 TOTAL do ticket, não por drenagem, e o `attempt=` da trilha continua de onde
 parou.
 
+**Devolução humana zera os contadores** (peça 7b-8). Um ticket `bloqueado` que um
+humano devolve para `pendente` (status editado e commitado) volta a rodar com
+`tentativas`, `runs/<id>/.sem-progresso` e `runs/<id>/.adiamentos` zerados. A
+regra (`decisao.ts:reabertoDeBloqueado`): status `pendente` e o último desfecho
+do ticket na trilha é `BLOQUEADO`, porque o loop nunca tira um ticket de
+bloqueado. O zero de `tentativas` passa pelo `ticket_commit`, e a trilha ganha
+`RECUPERADO motivo=reaberto de=bloqueado`, que também impede zerar duas vezes.
+Roda na drenagem antes de chamar o executor (vale mesmo com o preflight
+recusando) e no executor antes de ler `tentativas`. Toda gravação de
+`tentativas` é commitada (`executor.sh:drive_ticket`, antes de cada tentativa e
+no commit de cada desfecho): a árvore de `docs/fila` fica limpa entre uma
+tentativa e outra. Devolução de `refatiar` não está coberta.
+
 **Notificação de AMBIENTE** (peça 7b-5): avisa quando a drenagem ENTRA em
 `AMBIENTE`, cala nas seguintes que terminam no mesmo estado, e a primeira que
 sai manda UM aviso de saída, com o placar, no lugar do cartão de fim. A memória
diff --git a/docs/PECAS.md b/docs/PECAS.md
index bfed872..949abf2 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -798,7 +798,16 @@
   *Teste:* `test/orquestrador-runatload.test.ts`, com o launchctl stubado e HOME
   descartável. **Antes, `<false/>`.** `docs/launchd.md` ainda mostra `false` (7c).
 
-- **7b-6 · docs da etapa 7b**: esta seção, o CHANGELOG e o CONTRATO §4.1, §8 e §9.4.
+- **7b-6 · docs da etapa 7b** (`470c237`): esta seção, o CHANGELOG e o CONTRATO §4.1, §8 e §9.4.
+
+- **7b-8 · devolução humana zera os contadores**. Ticket bloqueado que um humano devolve
+  para pendente (o lote 14 com o 235) volta com `tentativas`, `.sem-progresso` e
+  `.adiamentos` zerados, commit pelo `ticket_commit` e `RECUPERADO motivo=reaberto
+  de=bloqueado`. A pergunta 1 da revisão pré-merge (a contagem é commitada?) já era sim:
+  `executor.sh` grava e commita antes de cada tentativa; o teste agora prova.
+  *Teste:* `test-reabertura-humana.sh`, com uma drenagem de verdade (`drenar()` chamando o
+  executor real): docs/fila limpo em toda chamada ao agente; o ticket devolvido recomeça em
+  attempt=1 e não zera duas vezes. **Antes, rodava a attempt=4 e bloqueava na hora.**
 
 
 ## PENDENTES
diff --git a/scripts/kit/test-shell.sh b/scripts/kit/test-shell.sh
index fc51fff..e39cb92 100644
--- a/scripts/kit/test-shell.sh
+++ b/scripts/kit/test-shell.sh
@@ -28,6 +28,7 @@
 #   test-adiamentos-limite.sh       teto de adiamentos seguidos, com a causa real na nota (7b-3)
 #   test-reprovado-sub.sh           sub-motivo, escalada só com juiz, repetição, tentativas persistidas (7b-4)
 #   test-notificacao-ambiente.sh    o aviso de AMBIENTE só na entrada e na saída (7b-5)
+#   test-reabertura-humana.sh       tentativas commitadas; devolução humana zera os contadores (7b-8)
 #
 # Cada um monta o PRÓPRIO `ORQ_EXEC_ROOT` num `mktemp -d` (drenagem e retry) ou
 # trabalha direto no checkout (lib-config); nada aqui precisa exportar
@@ -46,7 +47,7 @@ KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
 # Os testes que leem fixture versionada do kit (test/fixtures/) a acham por aqui:
 # rodando da cópia vendorizada no repo de fixture, `$AQUI/../..` não é o kit.
 export ORQ_KIT="$KIT"
-SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh test-adiamentos-limite.sh test-reprovado-sub.sh test-notificacao-ambiente.sh'
+SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh test-adiamentos-limite.sh test-reprovado-sub.sh test-notificacao-ambiente.sh test-reabertura-humana.sh'
 
 FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
   printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
diff --git a/scripts/orquestrador/decisao-cli.ts b/scripts/orquestrador/decisao-cli.ts
index 1687b67..50ea0a4 100644
--- a/scripts/orquestrador/decisao-cli.ts
+++ b/scripts/orquestrador/decisao-cli.ts
@@ -9,6 +9,7 @@
  *   retry <tentativa> <modelo>-> stdin = Veredito; imprime PlanoRetry
  *   meta                      -> stdin = entrada; imprime RegistroMeta
  *   repeticao <sub> <diff>    -> stdin = linhas da trilha do ticket; exit 0 = repete a anterior (7b-4)
+ *   reaberto                  -> stdin = linhas da trilha do ticket; exit 0 = último desfecho é BLOQUEADO (7b-8)
  *   disallowed                -> o piso de --disallowedTools do config (T17)
  */
 import { readFileSync } from 'node:fs'
@@ -18,6 +19,7 @@ import {
   decidirRetry,
   registroMeta,
   ehRepeticao,
+  reabertoDeBloqueado,
   nomeWorktree,
   prefixoDeWorktree,
   modeloIndefinido,
@@ -84,6 +86,13 @@ switch (sub) {
     process.exit(ehRepeticao(linhas, args[0] ?? '', Number(args[1] ?? NaN)) ? 0 : 1)
     break
   }
+  case 'reaberto': {
+    // Peça 7b-8. exit 0 = o último desfecho do ticket na trilha é BLOQUEADO
+    // (e o status atual, conferido por quem chama, é pendente): devolução humana.
+    const linhas = readFileSync(0, 'utf8').split('\n').filter((l) => l.trim() !== '')
+    process.exit(reabertoDeBloqueado(linhas) ? 0 : 1)
+    break
+  }
   case 'worktree': {
     process.stdout.write(nomeWorktree(prefixoDeWorktree(config), args[0] ?? '') + '\n')
     break
diff --git a/scripts/orquestrador/decisao.ts b/scripts/orquestrador/decisao.ts
index 3aed926..b1b58d2 100644
--- a/scripts/orquestrador/decisao.ts
+++ b/scripts/orquestrador/decisao.ts
@@ -544,6 +544,26 @@ export function ehRepeticao(linhas: string[], sub: string, diff: number): boolea
   return false
 }
 
+/**
+ * Peça 7b-8 · o ticket foi DEVOLVIDO por um humano de `bloqueado` para
+ * `pendente`? `linhas` são as linhas da trilha deste ticket; quem chama já
+ * conferiu que o status atual é `pendente`. A resposta é sim quando o último
+ * evento de desfecho do ticket é BLOQUEADO: o loop nunca tira um ticket de
+ * bloqueado, então se ele está pendente depois de um BLOQUEADO, foi a mão de
+ * alguém (o lote 14 fez isso com o 235). RECUPERADO quer dizer que a devolução
+ * já foi processada, e qualquer outro desfecho (INICIO, ADIADO, REPROVADO,
+ * APROVADO, MERGE, REFATIAR) quer dizer que o ticket já voltou a rodar.
+ */
+export function reabertoDeBloqueado(linhas: string[]): boolean {
+  const desfechos = ['BLOQUEADO', 'RECUPERADO', 'INICIO', 'ADIADO', 'REPROVADO', 'RETRY', 'APROVADO', 'MERGE', 'REFATIAR']
+  for (let i = linhas.length - 1; i >= 0; i--) {
+    const ev = (linhas[i] ?? '').split(' ')[2] ?? ''
+    if (!desfechos.includes(ev)) continue
+    return ev === 'BLOQUEADO'
+  }
+  return false
+}
+
 // ─── 4 · registro do meta.json ─────────────────────────────────────────────
 
 export interface RegistroMeta {
diff --git a/scripts/orquestrador/executor.sh b/scripts/orquestrador/executor.sh
index 1c0e3d5..7690907 100755
--- a/scripts/orquestrador/executor.sh
+++ b/scripts/orquestrador/executor.sh
@@ -1041,6 +1041,10 @@ drive_ticket() {
   # Actus acumulou 18 diretórios de tentativa assim. Agora ele sai do campo
   # `tentativas` do ticket; `attempt0` separa as duas numerações (o contador de
   # retry, persistido, e o diretório de evidência, pelo slot contínuo).
+  # Peça 7b-8: ticket devolvido por humano de bloqueado para pendente zera os
+  # contadores ANTES de ler `tentativas` (a drenagem já faz isto antes de chamar
+  # o executor; aqui cobre o executor chamado sozinho).
+  reabertura_humana "$file" || true
   attempt="$(ticket_tentativas "$file")"; attempt0="$attempt"
   log "ticket $id ($slug) · worktree $nome · modelo $modelo · evidência a partir de attempt-$slot · tentativas já consumidas: $attempt/$((CFG_MAX_RETRIES + 1))"
   [ "$slot" = 0 ] || log "  runs/$id já tem $slot tentativa(s) de rodada anterior — a numeração continua, nada é sobrescrito"
diff --git a/scripts/orquestrador/lib.sh b/scripts/orquestrador/lib.sh
index 4419b96..72069da 100755
--- a/scripts/orquestrador/lib.sh
+++ b/scripts/orquestrador/lib.sh
@@ -200,6 +200,35 @@ ticket_tentativas() {
 ticket_set_tentativas()  { ticket_set "$1" '.tentativas = ($n | tonumber)' --arg n "$2"; }
 ticket_zera_tentativas() { ticket_set_tentativas "$1" 0; }
 
+# --- DEVOLUÇÃO HUMANA ZERA OS CONTADORES (peça 7b-8) --------------------------
+# reabertura_humana <arquivo> -> 0 quando zerou (o ticket estava bloqueado e um
+# humano o devolveu para pendente); 1 quando não havia nada a fazer.
+#
+# Um ticket bloqueado por max_retries e devolvido à mão (status editado e
+# commitado, como o lote 14 fez com o 235) voltava com `tentativas` no limite:
+# rodava UMA tentativa e bloqueava de novo. O mesmo com os contadores da
+# drenagem (.sem-progresso, .adiamentos). Aqui os três zeram, o zero de
+# `tentativas` passa pelo `ticket_commit` (a árvore fica limpa, como em toda
+# transição) e a trilha ganha `RECUPERADO motivo=reaberto de=bloqueado`, que é
+# também o que impede zerar duas vezes. A decisão (o último desfecho do ticket
+# na trilha é BLOQUEADO) é do decisao.ts; sem trilha legível, nada é zerado.
+reabertura_humana() {
+  local file="$1" id
+  [ "$(ticket_field "$file" '.status' 2>/dev/null || true)" = pendente ] || return 1
+  id="$(ticket_field "$file" '.id' 2>/dev/null || true)"
+  [ -n "$id" ] && [ -s "$EVENTS_FILE" ] || return 1
+  awk -v id="$id" '$2 == id' "$EVENTS_FILE" 2>/dev/null \
+    | "${ORQ_TSX[@]}" "$ORQ_LIB_DIR/decisao-cli.ts" "$MAIN_CHECKOUT" reaberto >/dev/null 2>&1 || return 1
+  ticket_zera_tentativas "$file"
+  ticket_commit "$file" "fila: $id reaberto de bloqueado (contadores zerados)"
+  if escrita_de_teste_permitida "$RUNS_BASE/$id"; then
+    rm -f "$RUNS_BASE/$id/.sem-progresso" "$RUNS_BASE/$id/.adiamentos" 2>/dev/null || true
+  fi
+  event "$id" RECUPERADO "motivo=reaberto" "de=bloqueado"
+  log "  $id devolvido de bloqueado para pendente: tentativas, .sem-progresso e .adiamentos zerados"
+  return 0
+}
+
 # ticket_commit <arquivo> <mensagem>
 # Commita a mudança de status/nota do ticket no MAIN_CHECKOUT imediatamente
 # apos escreve-la. Sem isso a arvore fica suja entre disparos e o preflight
diff --git a/scripts/orquestrador/local-loop.sh b/scripts/orquestrador/local-loop.sh
index 86764e9..fb843ba 100755
--- a/scripts/orquestrador/local-loop.sh
+++ b/scripts/orquestrador/local-loop.sh
@@ -440,6 +440,11 @@ drenar() {
 
     say "ticket $prox_id ($(pendentes_processaveis) processáveis)"
 
+    # Peça 7b-8: devolução humana (bloqueado -> pendente) zera tentativas,
+    # .sem-progresso e .adiamentos ANTES da chamada e antes da régua desta volta,
+    # para valer mesmo que o executor seja recusado no preflight.
+    reabertura_humana "$prox" || true
+
     # Antes da chamada: onde a trilha estava, onde a branch alvo estava e a
     # nota do ticket. É a régua do que ESTA volta produziu. A saída do executor
     # vai para o log como sempre (tee) e fica numa cópia para a causa.
diff --git a/scripts/orquestrador/test-fixture-executor.sh b/scripts/orquestrador/test-fixture-executor.sh
index bbb2b48..9f5ba1a 100644
--- a/scripts/orquestrador/test-fixture-executor.sh
+++ b/scripts/orquestrador/test-fixture-executor.sh
@@ -37,7 +37,11 @@ FXE_NM="$(cd "$FXE_AQUI/../.." && pwd)/node_modules"
 fxe_novo() {
   local filtro="${1:-.}" r
   FXE_ID="${FXE_ID:-901}"
-  FXE="$(mktemp -d)"
+  # Caminho FÍSICO: no macOS o mktemp devolve /var/... e o git devolve
+  # /private/var/... para o mesmo lugar, e o ensure_staging_worktree compara o
+  # dono do worktree de merge por texto (lib.sh:git_common_abs usa pwd, não
+  # pwd -P). Achado da 7b-8, registrado para a 7c.
+  FXE="$(cd "$(mktemp -d)" && pwd -P)"
   r="$FXE/repo"
   mkdir -p "$r/docs/fila/runs" "$r/src" "$FXE/bin" "$FXE/gates" "$FXE/_worktrees"
   printf 'exit 0\n' > "$FXE/gates/typecheck.sh"
@@ -118,6 +122,9 @@ TICKET
 case " \$* " in *" --max-turns 1 "*) cat "$FXE/juiz-saida" 2>/dev/null; exit 0 ;; esac
 modelo=\$(printf '%s\n' "\$@" | awk 'p { print; exit } \$0 == "--model" { p = 1 }')
 echo "agente model=\$modelo" >> "$FXE/chamadas"
+# O git status de docs/fila no checkout PRINCIPAL no momento da chamada: é a
+# prova de que o que o executor gravou antes (tentativas, status) já foi commitado.
+{ echo "== chamada \$(grep -c . "$FXE/chamadas")"; git -C "$FXE/repo" status --porcelain -- docs/fila; } >> "$FXE/status-chamadas"
 # Fila de modos: um por chamada, o último se repete. Sem fila, o modo fixo.
 if [ -s "$FXE/claude-fila" ]; then
   modo="\$(head -1 "$FXE/claude-fila")"
diff --git a/scripts/orquestrador/test-reabertura-humana.sh b/scripts/orquestrador/test-reabertura-humana.sh
new file mode 100644
index 0000000..7513b03
--- /dev/null
+++ b/scripts/orquestrador/test-reabertura-humana.sh
@@ -0,0 +1,98 @@
+#!/usr/bin/env bash
+# test-reabertura-humana.sh · contagem de tentativas commitada, e devolução
+# humana que zera os contadores (peça 7b-8).
+#
+# Desde a 7b-4 o contador de retry mora no campo `tentativas` do ticket. Duas
+# perguntas antes do merge:
+#
+#   1. A gravação é COMMITADA? O executor grava tentativas+1 antes de cada
+#      tentativa; se isso deixasse docs/fila sujo, o preflight do disparo
+#      seguinte recusaria por árvore suja. O `claude` falso registra o git
+#      status do checkout principal a cada chamada: depois de um REPROVADO e
+#      um RETRY, docs/fila tem de estar limpo.
+#   2. Devolução humana. Um ticket bloqueado por max_retries que um humano
+#      devolve para pendente (editando o status e commitando, como o lote 14
+#      fez com o 235) tem de rodar de novo com tudo zerado: tentativas,
+#      .sem-progresso e .adiamentos. Roda uma drenagem DE VERDADE (drenar() do
+#      local-loop.sh vendorizado, chamando o executor.sh real).
+#
+# Uso: bash scripts/orquestrador/test-reabertura-humana.sh
+
+set -uo pipefail
+AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
+
+export ORQ_TESTE=1
+ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
+TMP_RAIZ="$(dirname "$ORQ_EXEC_ROOT")"
+# shellcheck source=test-fixture-executor.sh
+source "$AQUI/test-fixture-executor.sh"
+trap 'fxe_limpa; rm -rf "$TMP_RAIZ"' EXIT
+
+FALHAS=0
+ok()    { printf '  ok    %s\n' "$*"; }
+falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
+tem()   { fxe_eventos | grep -Eq "$1"; }
+RUNS() { printf '%s/repo/docs/fila/runs/901' "$FXE"; }
+
+# drenagem_real — uma drenagem inteira, com o local-loop.sh e o executor.sh
+# vendorizados no fixture, o `claude` falso no PATH e o isolamento de teste.
+drenagem_real() {
+  ( cd "$FXE/repo" && export ORQ_TESTE=1 ORQ_EXEC_ROOT="$FXE/repo" PATH="$FXE/bin:$PATH" LOCAL_LOOP_SOURCED=1 \
+      && source "$FXE/repo/scripts/orquestrador/local-loop.sh" && drenar ) >> "$FXE/saida-drenagem" 2>&1
+}
+
+echo "== 1. a contagem de tentativas é commitada: docs/fila limpo depois de REPROVADO e RETRY =="
+fxe_novo '.max_retries = 2'
+fxe_criterio falhou; fxe_juiz '{"aprovado": true, "motivo": "ok", "criterios_falhos": []}'
+fxe_fila linhas:5 linhas:6 linhas:7
+fxe_roda
+tem ' 901 REPROVADO .* attempt=1 ' && tem ' 901 RETRY attempt=2 ' && ok "houve REPROVADO e RETRY" || falha "sem REPROVADO e RETRY"
+sed 's/^/  | /' "$FXE/status-chamadas"
+sujo="$(grep -v '^== chamada' "$FXE/status-chamadas" || true)"
+[ -z "$sujo" ] && ok "docs/fila limpo no checkout principal em TODA chamada (inclusive depois de REPROVADO+RETRY)" || falha "docs/fila sujo durante a execução: $sujo"
+[ -z "$(git -C "$FXE/repo" status --porcelain -- docs/fila)" ] && ok "docs/fila limpo no fim" || falha "sujo no fim: $(git -C "$FXE/repo" status --porcelain -- docs/fila)"
+# O log vai para uma variável antes do grep: `git log | grep -q` sob pipefail
+# falha por SIGPIPE quando o grep acha cedo (o `| grep -q` que o gate de ticket
+# do Actus reprova em critério, aab3f4e).
+log_ticket="$(git -C "$FXE/repo" log --format=%s -- docs/fila/901-t.md)"
+printf '%s\n' "$log_ticket" | sed 's/^/  | /'
+printf '%s\n' "$log_ticket" | grep -qx 'fila: 901 tentativa 2' && ok "commit 'fila: 901 tentativa 2' no log" || falha "sem o commit da tentativa 2"
+[ "$(fxe_status)" = bloqueado ] && [ "$(fxe_campo '.tentativas')" = 3 ] && ok "bloqueado por max_retries com tentativas=3" || falha "status=$(fxe_status) tentativas=$(fxe_campo '.tentativas')"
+
+echo
+echo "== 2. devolução humana: bloqueado -> pendente num commit humano zera tudo =="
+printf '2|2026-09-20 10:00:00-0300|2026-09-20 11:00:00-0300\n' > "$(RUNS)/.sem-progresso"
+printf '3|2026-09-20 10:00:00-0300|2026-09-20 12:00:00-0300\n' > "$(RUNS)/.adiamentos"
+sed -i.bak 's/"status": "bloqueado"/"status": "pendente"/' "$FXE/repo/docs/fila/901-t.md" && rm -f "$FXE/repo/docs/fila/901-t.md.bak"
+git -C "$FXE/repo" commit -q -am "humano: 901 devolvido para pendente"
+[ "$(fxe_status)" = pendente ] && [ "$(fxe_campo '.tentativas')" = 3 ] && ok "antes da drenagem: pendente, tentativas=3, .sem-progresso=2, .adiamentos=3" || falha "fixture: status=$(fxe_status)"
+ev_antes="$(fxe_eventos | grep -c .)"
+# A drenagem: 1ª tentativa reprova, a 2ª cai em 503 (adiada sem cooldown). Com
+# a contagem zerada, o ticket fica pendente com tentativas=1; sem zerar, ele
+# rodaria a attempt=4 e bloquearia na hora.
+fxe_fila linhas:8 503
+drenagem_real
+novos="$(fxe_eventos | tail -n +"$((ev_antes + 1))")"
+printf '%s\n' "$novos" | sed 's/^[^ ]* /  | /'
+printf '%s\n' "$novos" | grep -q ' 901 INICIO attempt=1 ' && ok "a drenagem executou o ticket a partir de attempt=1" || falha "não recomeçou em attempt=1"
+printf '%s\n' "$novos" | grep -q ' 901 BLOQUEADO ' && falha "bloqueou de novo" || ok "não bloqueou na hora"
+printf '%s\n' "$novos" | grep -q ' 901 RETRY attempt=2 ' && ok "com retry disponível (RETRY attempt=2)" || falha "sem RETRY"
+[ "$(fxe_status)" = pendente ] && ok "segue pendente (a 2ª tentativa adiou)" || falha "status=$(fxe_status)"
+[ "$(fxe_campo '.tentativas')" = 1 ] && ok "tentativas=1 (zerada e somada uma reprovação)" || falha "tentativas=$(fxe_campo '.tentativas')"
+[ ! -f "$(RUNS)/.sem-progresso" ] && ok ".sem-progresso zerado" || falha ".sem-progresso: $(cat "$(RUNS)/.sem-progresso")"
+[ "$(cut -d'|' -f1 "$(RUNS)/.adiamentos" 2>/dev/null)" = 1 ] && ok ".adiamentos recomeçou em 1 (era 3; sem zerar seria 4 e bloquearia)" || falha ".adiamentos: $(cat "$(RUNS)/.adiamentos" 2>/dev/null)"
+printf '%s\n' "$novos" | grep -q ' 901 RECUPERADO motivo=reaberto de=bloqueado$' && ok "trilha: RECUPERADO motivo=reaberto de=bloqueado" || falha "sem RECUPERADO motivo=reaberto"
+[ -z "$(git -C "$FXE/repo" status --porcelain -- docs/fila)" ] && ok "docs/fila limpo depois da drenagem (o zero também foi commitado)" || falha "sujo: $(git -C "$FXE/repo" status --porcelain -- docs/fila)"
+
+echo
+echo "== 3. a devolução zera UMA vez: a drenagem seguinte continua de onde parou =="
+fxe_fila linhas:11
+ev_antes="$(fxe_eventos | grep -c .)"
+drenagem_real
+novos="$(fxe_eventos | tail -n +"$((ev_antes + 1))")"
+printf '%s\n' "$novos" | grep -q ' 901 INICIO attempt=2 ' && ok "recomeça em attempt=2 (não zera de novo)" || falha "INICIO: $(printf '%s\n' "$novos" | grep INICIO | head -1)"
+printf '%s\n' "$novos" | grep -q 'RECUPERADO motivo=reaberto' && falha "zerou de novo" || ok "nenhum RECUPERADO novo"
+
+echo
+if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
diff --git a/test/orquestrador-isolamento-teste.test.ts b/test/orquestrador-isolamento-teste.test.ts
index a2f7769..bb437a3 100644
--- a/test/orquestrador-isolamento-teste.test.ts
+++ b/test/orquestrador-isolamento-teste.test.ts
@@ -37,6 +37,7 @@ const SCRIPTS = [
   'test-adiamentos-limite.sh',
   'test-reprovado-sub.sh',
   'test-notificacao-ambiente.sh',
+  'test-reabertura-humana.sh',
 ];
 
 /**
diff --git a/test/orquestrador-sub-repeticao.test.ts b/test/orquestrador-sub-repeticao.test.ts
index 9080107..6a670cc 100644
--- a/test/orquestrador-sub-repeticao.test.ts
+++ b/test/orquestrador-sub-repeticao.test.ts
@@ -9,7 +9,7 @@
 import { describe, it, expect } from 'vitest';
 import { readFileSync } from 'node:fs';
 import { join } from 'node:path';
-import { decidirDesfecho, decidirRetry, ehRepeticao, subDaLinha, subDoSinal, type DecisaoConfig, type SinalTentativa } from '../scripts/orquestrador/decisao.js';
+import { decidirDesfecho, decidirRetry, ehRepeticao, reabertoDeBloqueado, subDaLinha, subDoSinal, type DecisaoConfig, type SinalTentativa } from '../scripts/orquestrador/decisao.js';
 
 const CONFIG = {
   executor_model: 'sonnet', avaliador_model: 'opus', retry_final_model: 'opus', max_retries: 2, diff_cap_linhas: 600,
@@ -81,3 +81,22 @@ describe('ehRepeticao: a 2ª reprovação igual corta', () => {
     expect(ehRepeticao(TRILHA_461.slice(0, 3), 'criterio', 717)).toBe(false);
   });
 });
+
+describe('reabertoDeBloqueado: devolução humana (peça 7b-8)', () => {
+  const L = (ev: string) => `2026-09-21T10:00:00-0300 235 ${ev}`;
+  it('último desfecho BLOQUEADO (e o status agora é pendente, conferido por quem chama): reaberto', () => {
+    expect(reabertoDeBloqueado([L('INICIO attempt=3'), L('REPROVADO motivo=criterio_qualidade attempt=3 diff=4'), L('BLOQUEADO motivo=criterio_qualidade attempt=3')])).toBe(true);
+    expect(reabertoDeBloqueado([L('BLOQUEADO motivo=adiamentos n=4 limite=4')])).toBe(true);
+  });
+  it('eventos sem desfecho depois do BLOQUEADO não mudam a resposta', () => {
+    expect(reabertoDeBloqueado([L('BLOQUEADO motivo=sem_progresso n=3 limite=3'), L('DECISAO_PENDENTE origem=humano-executor')])).toBe(true);
+  });
+  it('RECUPERADO depois do BLOQUEADO: já processado, não zera de novo', () => {
+    expect(reabertoDeBloqueado([L('BLOQUEADO motivo=criterio_qualidade attempt=3'), L('RECUPERADO motivo=reaberto de=bloqueado')])).toBe(false);
+  });
+  it('o ticket já voltou a rodar (INICIO, ADIADO) ou nunca bloqueou: não é reabertura', () => {
+    expect(reabertoDeBloqueado([L('BLOQUEADO motivo=x'), L('RECUPERADO motivo=reaberto de=bloqueado'), L('INICIO attempt=1')])).toBe(false);
+    expect(reabertoDeBloqueado([L('INICIO attempt=1'), L('ADIADO motivo=servidor attempt=1 rc=1 dur=2s cooldown=nao')])).toBe(false);
+    expect(reabertoDeBloqueado([])).toBe(false);
+  });
+});
```

## Fechamento do acréscimo

### vitest

```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7b

 ✓ test/orquestrador-enforcement.test.ts (47 tests) 21ms
 ✓ test/orquestrador-enforcement-actus.test.ts (104 tests) 22ms
 ✓ test/orquestrador-decisao.test.ts (39 tests) 8ms
 ✓ test/orquestrador-prevoo.test.ts (34 tests) 16ms
stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > actus-saas: em TODO ticket migrado, só o bloco muda
actus-saas: 0 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > comarka-operacional: em TODO ticket migrado, só o bloco muda
comarka-operacional: 3 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > conteudos-infinitos: em TODO ticket migrado, só o bloco muda
conteudos-infinitos: 0 ticket(s) migrados

 ✓ test/orquestrador-migrar-tickets.test.ts (32 tests) 165ms
 ✓ test/orquestrador-gates.test.ts (29 tests) 1401ms
   ✓ critérios do executor — strip de ANSI > saída COLORIDA casa o mesmo critério que a saída limpa 408ms
 ✓ test/orquestrador-liberar-migrar.test.ts (37 tests) 3011ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > o resultado da migração PASSA no leitor do motor: todo token resolve 426ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > libera, sai 0 e o arquivo passa a ter o token 325ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > o token liberado DESTRAVA o ticket que dependia dele 642ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > duplicata: rc 1, RECUSADO, e o arquivo NÃO muda 641ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > arquivo em v1: recusa e manda migrar, sem tocar em nada 301ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 4276ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 479ms
   ✓ a CLI é o contrato que `orq validar` repassa > com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>` 426ms
   ✓ a CLI é o contrato que `orq validar` repassa > --relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação 419ms
   ✓ a CLI é o contrato que `orq validar` repassa > --pendentes pega SÓ os pendentes 399ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 827ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 429ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > rc 1 e a linha de violação, chamado PELO symlink 401ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 876ms
 ✓ test/orquestrador-toolchain-tsx.test.ts (30 tests) 4666ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > tsx_local_ok responde pelo binário DO REPO, e é `test -x` 473ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > COM tsx no lugar, o guard passa e o loop segue para o kill switch 333ms
   ✓ cat.7 · toolchain > `orq prevoo` no fixture continua GO, com a cat.7 na saída 365ms
   ✓ instalar.sh · recusa repo sem tsx > com pnpm-lock.yaml a linha é `pnpm add -D`; com package-lock.json é `npm i -D` 310ms
   ✓ instalar.sh · recusa repo sem tsx > com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx) 860ms
 ✓ test/doutrina-v2.test.ts (30 tests) 15ms
 ✓ test/orquestrador-refatiar.test.ts (39 tests) 5757ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > diff acima do cap: refatiar, contaComoRetry false 466ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > arquivo fora da allowlist (enforcement): refatiar 375ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > zona proibida entra pelo MESMO campo — é a barreira que classifica 344ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > refatiar NÃO gera retry (o plano diz deveTentar=false) 376ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry 765ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar 405ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > status vira refatiar e a nota LISTA os arquivos 353ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa 372ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a mesma pendência duas vezes não vira duas linhas 701ms
   ✓ o retry recebe o JSON, não o texto livre > o CLI monta o JSON a partir do rundir de verdade 445ms
 ✓ test/orquestrador-lock.test.ts (34 tests) 5ms
 ✓ test/orquestrador-trilha.test.ts (22 tests) 2990ms
   ✓ o merge commit carrega o trailer, e o git o devolve > git log --grep acha o merge pelo trailer 494ms
   ✓ o merge commit carrega o trailer, e o git o devolve > NEGATIVO: o trailer é ancorado — 901 não casa 9012 426ms
   ✓ o prompt do executor cobra o trailer no commit do agente > o prompt montado nomeia o trailer e o id 396ms
   ✓ trilha e STATUS contam a primeira tentativa como 1 > a trilha REAL sai 1-based: o juiz na primeira tentativa registra attempt=1 434ms
 ✓ test/orquestrador-tools-derivadas.test.ts (32 tests) 6ms
 ✓ test/orquestrador-causas-adiamento.test.ts (32 tests) 8ms
 ✓ test/orquestrador-juiz.test.ts (39 tests) 6726ms
   ✓ LIXO é adiado, nunca reprovado > o parse do CLI sai com rc 3 (o código que o executor lê como ADIADO) 405ms
   ✓ LIXO é adiado, nunca reprovado > a fronteira está no decisao.ts: juizIlegivel ADIA e NÃO conta retry 378ms
   ✓ LIXO é adiado, nunca reprovado > NEGATIVO: sem o campo, o mesmo sinal segue aprovando como antes 393ms
   ✓ modelo por classe de risco (custo-e-contexto §7) > o CLI devolve classe + modelo juntos (é o que o shell consome) 385ms
   ✓ ponta a ponta com --stub-juiz > veredito aprovado: JUIZ_APROVADO=true e evidência gravada 845ms
   ✓ ponta a ponta com --stub-juiz > o prompt gravado carrega o critério avaliador e o bloco anti-afrouxamento 777ms
   ✓ ponta a ponta com --stub-juiz > veredito reprovado: motivo e criterios_falhos ficam disponíveis para o retry 749ms
   ✓ ponta a ponta com --stub-juiz > lixo: ILEGIVEL=1, nenhum veredito.json, e o CRU continua lá para auditoria 740ms
   ✓ ponta a ponta com --stub-juiz > a trilha registra o veredito, a classe e o modelo, com attempt 1-based 806ms
   ✓ ponta a ponta com --stub-juiz > o risco sobe pelo objetivo e leva o modelo forte junto 751ms
   ✓ ponta a ponta com --stub-juiz > NEGATIVO: --dry sem --stub-juiz pula o juiz e não inventa veredito 485ms
 ✓ test/orq-cli.test.ts (42 tests) 6549ms
   ✓ orq validar — o gate de ticket, com o rc repassado > fila limpa: rc 0 e nenhuma linha 304ms
   ✓ orq validar — o gate de ticket, com o rc repassado > ticket torto: rc 1, e a linha nomeia arquivo e campo 339ms
   ✓ orq validar — o gate de ticket, com o rc repassado > --relatorio sai 0 mesmo com violação (é o modo de olhar, não de barrar) 321ms
 ✓ test/orquestrador-piso-tools.test.ts (23 tests) 7ms
 ✓ test/orquestrador-launchd-config.test.ts (15 tests) 617ms
 ✓ test/orquestrador-agendamento.test.ts (21 tests) 185ms
 ✓ test/orquestrador-envelope.test.ts (25 tests) 1809ms
 ✓ test/orquestrador-gate-baseline.test.ts (21 tests) 10ms
 ✓ test/orquestrador-datar-liberacoes.test.ts (11 tests) 1409ms
 ✓ test/orq-versao-config.test.ts (16 tests) 3277ms
   ✓ orq config > READ-ONLY: nem versao nem config escrevem no repo 320ms
 ✓ test/orquestrador-trilha-gate-papel.test.ts (9 tests) 2589ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > gate de nome próprio que REPROVA sai falha, e o que passou continua ok 338ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > produz EXATAMENTE a linha de hoje para um attempt real (runs-201 attempt-2) 303ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > nenhum gate do CI cai em nao-configurado: o CI tem os três papéis 324ms
 ✓ test/orquestrador-adiamento-actus.test.ts (13 tests) 3ms
 ✓ test/orquestrador-observabilidade.test.ts (38 tests) 6271ms
   ✓ status_set reescreve o snapshot INTEIRO > NUNCA append: 20 transições e o arquivo continua do mesmo tamanho 1723ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > mudou o status de um ticket, mudou o placar — sem passar fila= nenhum 393ms
   ✓ evento GATE resume a passagem inteira numa linha > tudo verde 313ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement verde nunca carrega fora_do_pathspec 355ms
 ✓ test/orquestrador-push-suprimido.test.ts (14 tests) 10ms
 ✓ test/orquestrador-custo.test.ts (38 tests) 11131ms
   ✓ custo_registrar grava o consumo real da chamada > duas chamadas somam no mesmo dia, uma linha cada 479ms
   ✓ custo_registrar grava o consumo real da chamada > papel e ticket distinguem as chamadas (é o que o orq custo agrega) 403ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue com ledger corrompido: o executor é chamado 1367ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue sem ledger nenhum: o executor é chamado 1330ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > ticket adiado até amanhã não é processável hoje 346ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o executor nunca é chamado 678ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > STATUS.md fica ocioso com MOTIVO orcamento 807ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o ticket fica adiado, sem consumir tentativa, e a trilha registra 766ms
   ✓ teto por TICKET adia só aquele ticket e a fila segue > adia o 901 por orcamento_ticket e passa ao 902 1274ms
 ✓ test/orquestrador-dois-blocos-json.test.ts (13 tests) 621ms
 ✓ test/orquestrador-sub-repeticao.test.ts (14 tests) 4ms
 ✓ test/orquestrador-pausa-e-prompt.test.ts (17 tests) 5116ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > NENHUM ticket é tocado (nem pelo reconcile) 313ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sem o arquivo, a drenagem NÃO para por pausa (o guard não é sempre-verdadeiro) 578ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > o ticket em curso termina; o seguinte não começa 736ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > encerra em ocioso com MOTIVO pausado, não em erro 730ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > e manda NÃO ler SKILL.md nem references/ 301ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > não existe mais ponteiro para a SKILL como leitura recomendada 314ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > sem EXECUTOR.md no disco, o prompt sai sem ponteiro nenhum (não inventa) 313ms
 ✓ test/orquestrador-isolamento-teste.test.ts (21 tests) 2613ms
   ✓ o test-*.sh rodando de verdade não deixa marca na trilha real > test-drenagem.sh: fixture recebe os eventos, produção não recebe nada 1901ms
 ✓ test/orquestrador-pacotes.test.ts (6 tests) 1387ms
 ✓ test/orquestrador-liberacoes.test.ts (11 tests) 1797ms
   ✓ o arquivo REAL do repo resolve as dependências que declara > cada token do arquivo real resolve via liberacao_ok 705ms
 ✓ test/kit-e2e-evidencia.test.ts (7 tests) 394ms
 ✓ test/orquestrador-prefixo-aspas.test.ts (13 tests) 7ms
 ✓ test/orquestrador-morte-por-sinal.test.ts (11 tests) 2709ms
   ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2211ms
 ✓ test/orquestrador-prompt-como-rodar.test.ts (10 tests) 3ms
 ✓ test/orquestrador-disparo-congelado.test.ts (13 tests) 3789ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS congelado E lock com pid VIVO => recupera (a staleness vence) 390ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > a recuperação deixa rastro na trilha e limpa o STATUS 391ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > em-curso NÃO escreve na trilha: não houve o que recuperar 312ms
   ✓ a guarda por processo é POR REPO > o lock de OUTRO repo não é visto: o caminho sai do RUNS_BASE deste 325ms
   ✓ orq mostra MORTO, não executando > com o STATUS congelado, o snapshot diz MORTO e há quanto tempo 408ms
   ✓ orq mostra MORTO, não executando > com o STATUS são, mostra o que sempre mostrou 308ms
 ✓ test/orquestrador-trilha-uma-linha.test.ts (8 tests) 876ms
 ✓ test/orquestrador-runatload.test.ts (2 tests) 157ms
 ✓ test/orquestrador-liberacoes-formatos.test.ts (28 tests) 9406ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > os 5 tokens do arquivo real resolvem a dependência `humano:<token>` 625ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > TODOS os 47 tokens únicos do arquivo real resolvem 5686ms
   ✓ o que o CI faz diferente: NADA > os 7 resolvem, e NENHUM grava aviso (a forma do CI não é legada) 714ms
 ✓ test/orquestrador-reparo-trilha.test.ts (10 tests) 1688ms
   ✓ uma vez só, e por construção > a segunda passagem é no-op: não escreve, não anota 303ms
 ✓ test/orquestrador-migrar-config.test.ts (47 tests) 15926ms
   ✓ a migração não apaga nada > actus-saas: o arquivo no disco do repo NÃO é tocado 473ms
   ✓ a migração não apaga nada > comarka-operacional: o arquivo no disco do repo NÃO é tocado 413ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > antes da migração, a linha é a de hoje (é a medida de referência) 328ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --dry-run não escreve nem o proposto 435ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --propor grava 000-config.proposto.json e NÃO toca o oficial 403ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --aplicar move o proposto QUE FOI REVISADO, não um recalculado 885ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > o relatório do --dry-run traz o veredito do `orq config` sobre o PROPOSTO 444ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > --dry-run continua não gravando: ele AVISA da recusa e segue relatando 428ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > sem proposto no disco, o --propor grava como sempre (a guarda não é sempre-verdadeira) 442ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > o migrador NÃO conhece o nome da revisão: não lê, não escreve, não apaga 448ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > a CLI distingue RECUSA (rc 1) de erro de uso (rc 2) 417ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > com proposto pré-existente: rc 1, recusa dita, e o arquivo intacto byte a byte 2804ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > o resto da migração roda: a recusa é do config, não do --migrar inteiro 2228ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > sem proposto pré-existente, o --migrar volta a sair 0 e a gravar 2490ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > --dry-run com proposto pré-existente: rc 0, avisa, e não escreve 2277ms
   ✓ os dois configs reais: quanto o proposto melhora, e o que sobra > actus-saas: o proposto tem MENOS violações que o original, e o resto é decisão local 361ms
   ✓ os dois configs reais: quanto o proposto melhora, e o que sobra > comarka-operacional: o proposto tem MENOS violações que o original, e o resto é decisão local 309ms
 ✓ test/orquestrador-notificacao.test.ts (25 tests) 18167ms
   ✓ o fallback em arquivo é escrito SEMPRE > sem osascript: só o arquivo, e o log diz por quê 7983ms
   ✓ o fallback em arquivo é escrito SEMPRE > COM osascript: o arquivo é escrito do mesmo jeito 414ms
   ✓ o fallback em arquivo é escrito SEMPRE > osascript que falha não derruba a drenagem e o arquivo continua valendo 349ms
   ✓ o que vai no título e no corpo > título: placar de aprovados e bloqueados 388ms
   ✓ o que vai no título e no corpo > corpo: duração e o ÚLTIMO do snapshot 540ms
   ✓ o que vai no título e no corpo > sem snapshot ainda, o corpo sai com — em vez de quebrar 364ms
   ✓ fila sem processável: avisa uma vez, e só uma > a PRIMEIRA drenagem vazia escreve exatamente uma linha 499ms
   ✓ fila sem processável: avisa uma vez, e só uma > a SEGUNDA drenagem vazia não escreve nada (é o spam do launchd) 909ms
   ✓ fila sem processável: avisa uma vez, e só uma > dez ticks seguidos com a fila vazia continuam valendo uma linha só 2387ms
   ✓ fila sem processável: avisa uma vez, e só uma > processar de novo REARMA o aviso de fila vazia 1176ms
   ✓ drenagem que PROCESSOU notifica, com o placar > aprovado: uma linha, placar 1 aprovado 567ms
   ✓ drenagem que PROCESSOU notifica, com o placar > bloqueado: uma linha, placar 1 bloqueado 445ms
   ✓ drenagem que PROCESSOU notifica, com o placar > adiado por orçamento: uma linha, corpo com adiados 1 316ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU conta como processado, ainda que nada tenha sido aprovado 458ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU que já estava na trilha ANTES não conta (a conta é do trecho) 427ms

 Test Files  46 passed (46)
      Tests  1166 passed (1166)
   Start at  13:58:53
   Duration  21.54s (transform 720ms, setup 0ms, collect 11.55s, tests 127.62s, environment 5ms, prepare 1.88s)

rc=0
```

### scripts/kit/test-shell.sh

```
[fixture] tmp: /tmp/orq-fixture-ua4NUx
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7b/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-ua4NUx/repo
== testes de shell do motor · fixture em /tmp/orq-fixture-ua4NUx/repo ==

--- test-lib-config.sh ---
== raízes resolvidas pelo lib.sh ==
  ROOT           = /tmp/orq-fixture-ua4NUx/repo
  MAIN_CHECKOUT  = /private/tmp/orq-fixture-ua4NUx/repo
  CONFIG         = /private/tmp/orq-fixture-ua4NUx/repo/docs/fila/000-config.json
  ok   config encontrado no caminho resolvido

== valores lidos do config REAL ==
  ambiente_id      = orqfixture
  repo_origin      = fixture/orq-fixture
  diff_cap_linhas  = 600
  branch_alvo      = staging-auto
  max_retries      = 2
  ok   ambiente_id bate com o arquivo
  ok   diff_cap = 600 (o NOSSO, não o 2500 do comarka-os)

== causas de adiamento declaradas no config ==
  - erro de conexão
  - sessão expirada
  - rate limit
  - quota estourada
  - timeout de claude_timeout_secs
  - gate interrompido no meio
  - veredito do juiz ilegível
  ok   7 causas declaradas
  ok   a causa do juiz ilegível está declarada

== is_adiavel cobre cada causa ==
  ok   erro de conexão (ECONNREFUSED) -> adia
  ok   erro de conexão (socket hang up) -> adia
  ok   sessão expirada -> adia
  ok   sessão expirada (token) -> adia
  ok   rate limit -> adia
  ok   quota estourada -> adia
  ok   timeout de claude_timeout_secs -> adia
  ok   gate interrompido (SIGINT) -> adia
  ok   gate interrompido (SIGHUP) -> adia
  ok   menção a rate limit com rc=0 -> nao-adia
  ok   menção a sessão expirada com rc=0 -> nao-adia
  ok   erro real de código -> nao-adia

TODOS OS CHECKS PASSARAM

rc(test-lib-config.sh) = 0

--- test-drenagem.sh ---
== config lida ==
  branch_alvo=staging-auto  branch_protegida=main
  ok    alvo != protegida

== merge_em_alvo RECUSA a branch protegida ==
  ok    alvo == protegida => rc=2 (recusado)
  ok    recusa diz o motivo
  (worktree de teste: /private/tmp/orq-fixture-ua4NUx/repo, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (dd3bd3bd)

== drenar TRATA o status refatiar (regra 19) ==
  ok    refatiar NÃO vai para o merge
  ok    a drenagem diz que o ticket voltou
  ok    seguiu para o próximo ticket (executor chamado para: 901 902 )
  ok    o placar da drenagem conta os 2 refatiados
  ok    não conta como aprovado nem como bloqueado

TODOS OS CHECKS PASSARAM

rc(test-drenagem.sh) = 0

--- test-retry-worktree.sh ---
== 1 · enforcement PASSOU: a tentativa 2 herda a worktree e o commit ==
  ok    attempt-1 começa COM o diff da anterior (1 linha, src/a.ts na árvore)
  ok    o log diz que reaproveitou (e de qual tentativa)
  ok    o prompt da tentativa 2 manda corrigir o apontado
  ok    o patch da tentativa 2 contém o trabalho herdado
  ok    a trilha registra a reaproveitação
  ok    o RETRY anuncia o modo da worktree

== 2 · enforcement REPROVOU: worktree NOVA (diff fora do escopo não vira base) ==
  ok    attempt-1 nasce LIMPA quando o enforcement reprovou
  ok    não reaproveitou
  ok    o RETRY registra que a worktree é nova

== 3 · diff.patch por tentativa, ANTES de qualquer descarte ==
  ok    grava_diff_patch escreve o patch
  ok    o patch tem o conteúdo, não só o nome do arquivo
  ok    diff vazio => patch vazio, mas presente
  ok    run_attempt grava o patch antes do enforcement

== 4 · sondagem com rc!=0 grava o stderr REAL, não um palpite ==
  ok    a mensagem traz a saída REAL do CLI
  ok    não chuta mais a causa
  ok    diz o rc observado
  ok    gravou a evidência em runs/ (probe-falha-20260921T165923Z.txt)
  ok    o arquivo tem a saída crua
  ok    o log aponta o arquivo antes de morrer

== 5 · REQUEUE: rodada nova com attempt-0..2 antigos no disco ==
  ok    attempt-0 da rodada antiga NÃO foi sobrescrito
  ok    attempt-1 e attempt-2 antigos preservados
  ok    a rodada nova escreveu em attempt-3
  ok    attempt-3 tem o prompt DE HOJE, não o antigo
  ok    o log anuncia o slot inicial
  ok    o retry da rodada foi para attempt-4 (numeração contínua)
  ok    meta.json amarra o contador de retry ao diretório (campo dir)
  ok    tentativa 1 da rodada nasce limpa, apesar dos runs/ antigos

== 6 · COMMIT DO HARNESS: agente que sai sem commitar não perde trabalho ==
  ok    o harness commitou pelo agente
  ok    a worktree ficou limpa (nada solto para ser descartado)
  ok    mensagem exata do commit
  ok    trailer Orq-Ticket presente
  ok    o diff passou a enxergar o trabalho (2 linhas)
  ok    o arquivo fora do escopo foi commitado junto (o enforcement o julga)
  ok    árvore limpa não gera commit vazio
  ok    commit_do_agente roda antes de medir o diff

== 7 · o juiz é avisado de que o commit foi do harness ==
  ok    a nota entra no prompt do juiz
  ok    sem nota, o prompt sai como antes

TODOS OS CHECKS PASSARAM

rc(test-retry-worktree.sh) = 0

--- test-drenagem-sem-progresso.sh ---
== fila: 901 e 902 abortam antes do agente, 903 é saudável (N=3) ==
  | [2026-09-21 13:59:26-0300] ticket 901 (3 processáveis)
  | [orq ERRO] recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-09-21 13:59:26-0300]   ticket 901 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-09-21 13:59:27-0300] ticket 902 (3 processáveis)
  | [2026-09-21 13:59:27-0300]   ticket 902 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: fatal: branch 'frente/902' está em uso por outra worktree
  | [2026-09-21 13:59:27-0300] ticket 903 (3 processáveis)
  | [2026-09-21 13:59:27-0300] nenhum processável não tentado — encerrando (aprovados: 1; sem progresso: 901 902)
  | [2026-09-21 13:59:27-0300] drenagem encerrada: 1 aprovado(s) e mergeado(s)
  | [2026-09-21 13:59:27-0300] ocioso: 901 sem progresso · 902 sem progresso
  ok    executor chamado 3x numa drenagem: 901 902 903 
  ok    terminou em <= N=3 chamadas (sem loop)
  ok    cada ticket tentado UMA vez, na ordem da fila
  ok    o executor recebe --ticket (não reescolhe)
  ok    o saudável (903) foi processado: done
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-09-21T13:59:27-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 sem_progresso=2 dur=0min
  ok    DRENAGEM_FIM conta o aprovado
  ok    DRENAGEM_FIM conta os 2 sem progresso em contador próprio
  STATUS motivo: sem progresso em 901 902: 901 sem progresso · 902 sem progresso
  ok    motivo_ocioso lista TODOS os pulados (901 e 902)

TODOS OS CHECKS PASSARAM

rc(test-drenagem-sem-progresso.sh) = 0

--- test-sem-progresso-limite.sh ---
== 1. ticket 901 sempre aborta: 1, 2, 3 -> bloqueado ==
  --- disparo 1 (aborta): chamadas [901 ] 901=1
  ok    disparo 1: contador 1
  --- disparo 2 (aborta): chamadas [901 ] 901=2
  ok    disparo 2: contador 2 (persistiu entre disparos)
  ok    abaixo do limite, segue pendente
  --- disparo 3 (aborta): chamadas [901 ] 901=
  ok    disparo 3: 901 bloqueado no limite
  nota: sem_progresso: 3 disparos sem progresso entre 2026-09-21 13:59:28-0300 e 2026-09-21 13:59:29-0300; última causa: executor morreu (rc=128, fase=worktree): fatal: '/tmp/_worktrees/fx-901' already exists
  ok    nota cita a última causa pelo DESFECHO do executor (EXECUTOR_MORREU + linha fatal), não pela linha FAIL
  ok    trilha: 901 BLOQUEADO motivo=sem_progresso
  ok    o bloqueio foi COMMITADO (árvore limpa no ticket)
  ok    commit: fila: 901 bloqueado (sem_progresso, 3 disparos)
  ok    o status bloqueado está no commit, não só no disco
  ok    contador zerado ao mudar de status
  --- disparo 4 (aborta): chamadas [] 901=
  ok    disparo 4: bloqueado não é mais escolhido

== 2. adiamento não conta ==
  --- disparo 5 (aborta): chamadas [902 ] 901=
  ok    902 aborta: contador 1
  --- disparo 6 (adia-cooldown): chamadas [902 ] 901=
  ok    adiado com cooldown (mark_adiado): não conta
  ok    (o mark_adiado armou cooldown, como no motor)
  --- disparo 7 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    adiado SEM cooldown (evento ADIADO): não conta
  --- disparo 8 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    segundo adiamento sem cooldown também não conta
  ok    adiado sem cooldown não é reescolhido na mesma drenagem
  --- disparo 9 (aborta): chamadas [902 ] 901=
  ok    abort depois dos adiamentos volta a contar (2)

== 3. staging que avança na vez do ticket zera ==
  --- disparo 10 (aborta): chamadas [902 902 ] 901=
  ok    staging avançou: zerou e recomeçou em 1
  ok    902 não bloqueou
  ok    com staging andando, a drenagem voltou ao ticket (progresso)

== 4. o limite vem do config ==
  --- disparo 11 (aborta): chamadas [903 ] 901=
  ok    sem_progresso_limite=1 no config: bloqueia no 1º disparo
  ok    nota com o limite do config
  ok    valor inválido no config cai no padrão 3
  ok    chave ausente: padrão 3

TODOS OS CHECKS PASSARAM

rc(test-sem-progresso-limite.sh) = 0

--- test-ocioso.sh ---
== 1. 244 atrás de 241b bloqueado, 232 atrás de 231 pendente (sem liberação) ==
  ok    nenhum executor chamado (nada processável)
  trilha: 2026-09-21T13:59:34-0300 --- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
  ok    evento OCIOSO pendentes=3
  ok    244: dependência 241b em bloqueado
  ok    232: dependência 231 em pendente
  ok    231: liberação humano:migration-0031 ausente
  ok    UM evento por drenagem
  ok    trilha continua uma linha por evento (nenhuma linha sem timestamp)
  ok    OCIOSO vem antes do DRENAGEM_FIM
  STATUS.md:
    ORQUESTRADOR · 2026-09-21 13:59:34
    ESTADO   ocioso
    TICKET   —
    DESDE    —
    FASE     —
    FILA     3 pendente · 1 bloqueado · 1 done
    STAGING  9bafc52 · push suprimido (publicar é humano neste repo)
    ÚLTIMO   —
    MOTIVO   sem ticket processável: 231 sem liberação humano:migration-0031 · 232 espera 231 (pendente) · 244 espera 241b (bloqueado)
  ok    STATUS mantém o motivo de sempre
  ok    STATUS: 244 espera 241b (bloqueado)
  ok    STATUS: 232 espera 231 (pendente)
  ok    STATUS: 231 sem liberação
  ok    DRENAGEM_FIM sem campo novo

== 2. pendente pulado por sem-progresso nesta drenagem ==
  trilha: 2026-09-21T13:59:35-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=sem_progresso
  ok    250 foi tentado uma vez
  ok    250: pulado por sem-progresso
  ok    STATUS: 250 sem progresso

== 3. cooldown ativo: o liberado espera o cooldown ==
  trilha: 2026-09-21T13:59:35-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=cooldown:14:29
  ok    250: cooldown até 14:29
  ok    a razão de dependência vence o cooldown
  ok    STATUS: 250 em cooldown até 14:29

== 4. fins que NÃO gravam OCIOSO ==
  ok    pausa: sem OCIOSO (quem pausou já sabe)
  ok    sem pendente nenhum: sem OCIOSO

TODOS OS CHECKS PASSARAM

rc(test-ocioso.sh) = 0

--- test-rc-executor.sh ---
== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) ==
  ok    pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)

== o rc do executor atravessa o tee ==
  --- A: executor sai 3, tee sai 0 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 13:59:36-0300 e 2026-09-21 13:59:36-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    A: o log vê rc=3
  ok    A: a causa do bloqueio carrega rc=3
  --- B: executor sai 0, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 13:59:36-0300 e 2026-09-21 13:59:36-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    B: o log vê rc=0
  ok    B: a causa do bloqueio carrega rc=0
  --- C: executor sai 0, tee sai 5 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 13:59:37-0300 e 2026-09-21 13:59:37-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    C: o log vê rc=0
  ok    C: a causa do bloqueio carrega rc=0
  --- D: executor sai 3, tee sai 5 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 13:59:38-0300 e 2026-09-21 13:59:38-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    D: o log vê rc=3
  ok    D: a causa do bloqueio carrega rc=3

TODOS OS CHECKS PASSARAM

rc(test-rc-executor.sh) = 0

--- test-ambiente.sh ---
== 1. preflight recusa TODO ticket, 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  ok    0 bloqueados depois de 3 disparos
  ok    contadores zerados (nenhum .sem-progresso)
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas ao executor por disparo (máx: 2)
  trilha: 2026-09-21T13:59:40-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada (sem id, sha, número, caminho)
  ok    DRENAGEM_FIM: bloqueados=0 sem_progresso=0
  STATUS: MOTIVO   ambiente: executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa
  ok    motivo_ocioso=ambiente

== 2. causas próprias em tickets diferentes NÃO são ambiente ==
  --- disparo 4 (proprio): chamadas [904 905 ] 901=done/ 902=done/ 903=done/
  ok    904 e 905 somam 1 cada
  ok    nenhum AMBIENTE

== 3. um ticket sozinho travado continua bloqueando no 3º disparo ==
  --- disparo 5 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  --- disparo 6 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  ok    904 bloqueado no 3º disparo
  ok    trilha: 904 BLOQUEADO motivo=sem_progresso
  ok    bloqueio commitado
  ok    nenhum AMBIENTE no caso isolado

TODOS OS CHECKS PASSARAM

rc(test-ambiente.sh) = 0

--- test-causa-adiamento.sh ---
== A. timeout local (rc 124 do watchdog): adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=timeout
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  ok    evento diz cooldown=nao
  ok    nota registra timeout
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=timeout attempt=1 rc=124 dur=2s cooldown=nao

== B. 429: adia COM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=rate_limit
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown ARMADO (limite remoto)
  ok    evento diz cooldown=sim
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=rate_limit attempt=1 rc=1 dur=0s cooldown=sim

== C. 503 / overloaded: adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=servidor
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=1 rc=1 dur=0s cooldown=nao

== D. gate de testes que não rodou (sem placar): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=1s cooldown=nao

== E. tsc ausente (rc 127, command not found): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=1s cooldown=nao

== F. tsc que rodou e apontou erro de código: mérito, não adia ==
  ok    REPROVADO (mérito)
  ok    não adiou
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_typecheck attempt=1 diff=1
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=1

== G. recusa de preflight (árvore de execução suja): ADIADO motivo=preflight ==
  ok    executor sai 0
  ok    trilha: ADIADO motivo=preflight com a causa
  ok    nenhuma linha EXECUTOR_MORREU
  ok    um evento, uma linha
  ok    ticket segue pendente
  ok    cooldown NÃO armado
  | 901 ADIADO motivo=preflight causa=preflight: árvore de execução suja em /private/var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.fcLTaZybYH/repo — commite ou stashe antes:\n?? lixo.txt

TODOS OS CHECKS PASSARAM

rc(test-causa-adiamento.sh) = 0

--- test-ambiente-adiado.sh ---
== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas por disparo (máx: 2)
  trilha: 2026-09-21T14:00:01-0300 --- AMBIENTE tickets=901,902 causa=ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada, com o motivo preflight
  ok    0 bloqueados
  STATUS: MOTIVO   ambiente: ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa

== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE ==
  --- disparo 4 (sessao): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    um AMBIENTE
  ok    parou na 2ª chamada
  ok    causa: ADIADO motivo=sessao

== 3. adiamentos com causas DIFERENTES não são ambiente ==
  --- disparo 5 (proprio): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  ok    nenhum AMBIENTE
  ok    a drenagem seguiu pelos três

TODOS OS CHECKS PASSARAM

rc(test-ambiente-adiado.sh) = 0

--- test-adiamentos-limite.sh ---
== A. executor real: rc 124 em 0 s com timeout de 30 s não é timeout ==
  trilha: 901 ADIADO motivo=gate_interrompido attempt=1 rc=124 dur=0s cooldown=nao
  ok    ADIADO, e não com motivo=timeout
  ok    a trilha traz a medida (rc=124, duração real)
  nota: adiado (executor) por infraestrutura: gate_interrompido (rc=124 em 0s, abaixo do limite de 30s: morto por fora) em 2026-09-21T17:00:05Z — retomará no próximo disparo
  ok    a nota traz rc=124 e não diz timeout

== B. sempre adiado: bloqueia no 4º disparo com a causa real ==
  --- disparo 1 (adia): 901=pendente/1
  --- disparo 2 (adia): 901=pendente/2
  --- disparo 3 (adia): 901=pendente/3
  ok    contador em 3 depois de 3 disparos
  ok    abaixo do limite, segue pendente
  --- disparo 4 (adia): 901=bloqueado/
  ok    bloqueado no 4º disparo
  nota: adiado 4 vezes: gate_interrompido (rc=124, 9s de execução)
  ok    nota começa por 'adiado 4 vezes: '
  ok    a causa é a medida: motivo, rc=124 e 9s
  ok    trilha: BLOQUEADO motivo=adiamentos n=4 limite=4
  ok    bloqueio commitado
  ok    commit do bloqueio
  ok    contador zerado ao bloquear

== C. adiado que depois aprova zera o contador ==
  --- disparo 5 (adia): 901=pendente/1
  --- disparo 6 (adia): 901=pendente/2
  ok    2 adiamentos contados
  --- disparo 7 (aprova): 901=done/
  ok    aprovado e mergeado
  ok    contador zerado pela aprovação
  --- disparo 8 (adia): 901=pendente/1
  ok    recomeça em 1, não em 3

== D. adiamento COM cooldown não conta nem zera ==
  --- disparo 9 (limite): 901=pendente/1
  ok    contador segue 1

== E. o limite vem do config ==
  --- disparo 10 (adia): 901=bloqueado/
  ok    com limite 2, bloqueia no 2º
  ok    trilha diz n=2 limite=2
  ok    limite inválido ("x") vira 4
  ok    limite inválido (0) vira 4
  ok    limite inválido (-3) vira 4
  ok    limite inválido ("quatro") vira 4
  ok    limite ausente vira 4

== F. AMBIENTE desfaz o que somou na drenagem ==
  --- disparo 11 (adia): 901=pendente/1
  ok    901 em 1 (antes do ambiente)
  --- disparo 12 (mesmo): 901=pendente/1
  ok    um AMBIENTE
  ok    901 volta a 1 e 902 não soma

TODOS OS CHECKS PASSARAM

rc(test-adiamentos-limite.sh) = 0

--- test-reprovado-sub.sh ---
== A. critério vermelho, com permissão negada: mérito, mesmo modelo ==
  ok    a permissão negada foi registrada
  ok    REPROVADO sub=criterio
  ok    RETRY com o mesmo modelo (sonnet), sub=criterio
  ok    nenhuma chamada em opus
  ok    não adiou (permissão negada não é ambiente)
  | 901 INICIO attempt=1 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=2a17905a
  | 901 INICIO attempt=2 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== B. juiz reprovando: escala ==
  ok    REPROVADO sub=juiz
  ok    RETRY model=opus, sub=juiz
  ok    a 2ª chamada do agente foi em opus
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=baixo modelo=sonnet attempt=1
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade sub=juiz worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=855a6aa0
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=alto modelo=opus attempt=2
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo ==
  ok    REPROVADO sub=gate_testes
  ok    RETRY com o mesmo modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=gate_testes worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=d666212a
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora ==
  ok    trilha fixture do 461 no lugar
  ok    a reprovação desta execução: sub=criterio diff=717
  ok    BLOQUEADO motivo=repeticao
  ok    ticket bloqueado
  ok    nenhum RETRY
  ok    uma chamada paga só
  nota: repetição: 2ª reprovação igual à anterior (sub=criterio, diff=717), sem 3ª volta. critério(s) reprovado(s): o arquivo existe
  ok    a nota diz repetição e o diff
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
  | 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717
  | 461 BLOQUEADO motivo=repeticao sub=criterio diff=717 attempt=1

== E. max_retries vale no total, não por drenagem ==
  --- 1ª execução: tentativas=1 status=pendente
  ok    1ª execução: reprovou, adiou, segue pendente
  ok    1 tentativa consumida, persistida no ticket (o adiado devolveu a sua)
  --- 2ª execução: tentativas=3 status=bloqueado
  ok    3 reprovações no total (max_retries 2 + 1)
  ok    a 2ª execução começa em attempt=2
  ok    BLOQUEADO na attempt=3
  ok    nenhuma 4ª tentativa
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=f2bc3e58
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 RETRY attempt=3 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-2 base=f2bc3e58
  | 901 INICIO attempt=3 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=3 diff=7
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

TODOS OS CHECKS PASSARAM

rc(test-reprovado-sub.sh) = 0

--- test-notificacao-ambiente.sh ---
== 1. três disparos em AMBIENTE: um aviso ==
  --- disparo 1 (preflight): avisos=1
  --- disparo 2 (preflight): avisos=1
  --- disparo 3 (preflight): avisos=1
  ok    3 drenagens em AMBIENTE
  ok    1 aviso em 3 disparos
  ok    o aviso fala de ambiente
  | 2026-09-21T14:00:34-0300 | Orquestrador: AMBIENTE, a fila parou | a mesma causa em dois tickets não é do ticket: ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>). Nada somou nem bloqueou; avisa de novo quando sair.

== 2. o 4º disparo, saudável: um aviso de saída ==
  --- disparo 4 (aprova): avisos=2
  ok    exatamente 1 aviso novo
  ok    é o aviso de SAÍDA do ambiente
  ok    com o placar da drenagem (3 aprovados)
  | 2026-09-21T14:00:37-0300 | Orquestrador: ambiente normalizado, 3 aprovados, 0 bloqueados | saiu de AMBIENTE (ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>)) · duração 0min · adiados 0

== 3. o 5º disparo, saudável e sem nada: sem aviso de saída de novo ==
  --- disparo 5 (aprova): avisos=3
  ok    nenhum aviso de ambiente repetido

TODOS OS CHECKS PASSARAM

rc(test-notificacao-ambiente.sh) = 0

--- test-reabertura-humana.sh ---
== 1. a contagem de tentativas é commitada: docs/fila limpo depois de REPROVADO e RETRY ==
  ok    houve REPROVADO e RETRY
  | == chamada 1
  | == chamada 2
  | == chamada 3
  ok    docs/fila limpo no checkout principal em TODA chamada (inclusive depois de REPROVADO+RETRY)
  ok    docs/fila limpo no fim
  | fila: 901 bloqueado
  | fila: 901 tentativa 3
  | fila: 901 tentativa 2
  | fila: 901 tentativa 1
  | fixture: fila inicial
  ok    commit 'fila: 901 tentativa 2' no log
  ok    bloqueado por max_retries com tentativas=3

== 2. devolução humana: bloqueado -> pendente num commit humano zera tudo ==
  ok    antes da drenagem: pendente, tentativas=3, .sem-progresso=2, .adiamentos=3
  | --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
  | 901 RECUPERADO motivo=reaberto de=bloqueado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=8
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-3 base=65dd1690
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | --- OCIOSO pendentes=1 901=adiado
  | --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=1 refatiar=0 sem_progresso=0 dur=0min
  ok    a drenagem executou o ticket a partir de attempt=1
  ok    não bloqueou na hora
  ok    com retry disponível (RETRY attempt=2)
  ok    segue pendente (a 2ª tentativa adiou)
  ok    tentativas=1 (zerada e somada uma reprovação)
  ok    .sem-progresso zerado
  ok    .adiamentos recomeçou em 1 (era 3; sem zerar seria 4 e bloquearia)
  ok    trilha: RECUPERADO motivo=reaberto de=bloqueado
  ok    docs/fila limpo depois da drenagem (o zero também foi commitado)

== 3. a devolução zera UMA vez: a drenagem seguinte continua de onde parou ==
  ok    recomeça em attempt=2 (não zera de novo)
  ok    nenhum RECUPERADO novo

TODOS OS CHECKS PASSARAM

rc(test-reabertura-humana.sh) = 0

== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
  rc=0  test-drenagem-sem-progresso.sh
  rc=0  test-sem-progresso-limite.sh
  rc=0  test-ocioso.sh
  rc=0  test-rc-executor.sh
  rc=0  test-ambiente.sh
  rc=0  test-causa-adiamento.sh
  rc=0  test-ambiente-adiado.sh
  rc=0  test-adiamentos-limite.sh
  rc=0  test-reprovado-sub.sh
  rc=0  test-notificacao-ambiente.sh
  rc=0  test-reabertura-humana.sh
TODOS OS SCRIPTS SAÍRAM rc 0
rc=0
```

### scripts/kit/test-instalar.sh

```
[fixture] tmp: /tmp/orq-fixture-VWfcNR
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7b/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-VWfcNR/repo
== (a) fixture recém-instanciado ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-fixture-VWfcNR/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    diz 'idêntico ao kit <VERSAO>'

== (b) cópia do fixture com UM byte a mais em lib.sh ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-i3mzsY/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    exatamente 1 diferença, não uma cascata

== (d) cópia do fixture com UM byte a mais em scripts/roadmap/lint-mapa.py ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-3YmbQj/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/roadmap/lint-mapa.py
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/roadmap/lint-mapa.py'
  ok    exatamente 1 diferença, não uma cascata

== (e) --atualizar: dry-run, recusa sem pausa, e o conserto ==
-- (e1) --dry-run lista 'diferente' e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-pMx93a/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  | 
  | O --atualizar de verdade RECUSARIA, por:
  |   · o loop de '/private/tmp/orq-verificar-pMx93a/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  |   (a recusa não impede este dry-run de listar tudo)
  ok    rc 0
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    o lib.sh do repo NÃO foi tocado pelo --dry-run
-- (e2) --atualizar sem pausa: recusa com rc 1 --
  | RECUSADO: o loop de '/private/tmp/orq-verificar-pMx93a/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  ok    rc 1
  ok    a recusa diz que o loop não está pausado
  ok    o repo continua intacto depois da recusa
-- (e2b) com PAUSAR, mas com modificação não commitada no motor: recusa --
  | ?? scripts/orquestrador/nao-commitado.txt
  | RECUSADO: '/private/tmp/orq-verificar-pMx93a/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA o caminho
  ok    o repo continua intacto depois da recusa 3
-- (e3) --atualizar com PAUSAR e motor limpo: atualiza e fica idêntico --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-pMx93a/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-pMx93a/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-pMx93a/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
  ok    o lib.sh do repo é o do kit
  ok    docs/orquestrador/skill/VERSAO carimbado
  ok    imprime a linha de commit com pathspec explícito
  ok    docs/fila/** intacta
  ok    o PAUSAR do repo continua lá (o kit não retoma o loop por conta própria)

== (f) arquivo só do repo sobrevive ao --atualizar e aparece como 'só no repo' ==
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-cQ83ED/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-cQ83ED/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | só no repo  scripts/orquestrador/so-do-repo.py
  | 
  | 1 diferença(s)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-cQ83ED/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 1 (há 'só no repo' — o verificador do fim conta como diferença)
  ok    so-do-repo.py SOBREVIVEU
  ok    listado como 'só no repo'

== (g) --atualizar recusa com scripts/roadmap/ sujo, e --forcar passa ==
  |  M scripts/roadmap/lint-mapa.py
  | RECUSADO: '/private/tmp/orq-verificar-0AI0pp/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA scripts/roadmap/lint-mapa.py
  ok    o lint-mapa.py do repo continua intacto depois da recusa
-- (g2) com --forcar: passa, avisa, e o lint-mapa.py vira o do kit --
  |  M scripts/roadmap/lint-mapa.py
  | --forcar: passando por cima de 1 caminho(s) modificado(s) no motor do repo.
  | 
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-0AI0pp/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-0AI0pp/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-0AI0pp/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    avisa que passou por cima
  ok    o lint-mapa.py do repo é o do kit

== (h) --verificar/--atualizar cobrem os testes do harness ==
-- (h1) --verificar acusa o teste envelhecido --
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-e0W3xv/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   test/orquestrador-pacotes.test.ts
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente test/orquestrador-pacotes.test.ts'
  ok    não cita test/produto.test.ts (teste do produto não é motor)
-- (h2) --atualizar corrige, e o teste do produto sobrevive --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-e0W3xv/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-e0W3xv/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-e0W3xv/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    test/orquestrador-pacotes.test.ts do repo é o do kit
  ok    test/produto.test.ts intacto
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
-- (h3) a suíte do REPO passa com os testes que o kit instalou --
  |    ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2145ms
  | 
  |  Test Files  8 passed (8)
  |       Tests  62 passed (62)
  |    Start at  14:00:51
  |    Duration  3.72s (transform 171ms, setup 0ms, collect 4.02s, tests 4.77s, environment 1ms, prepare 364ms)
  ok    npx vitest run no repo: rc 0

== (i) --atualizar --migrar: .orq-pause -> PAUSAR, liberações -> v2 ==
-- (i1) --migrar --dry-run: mostra tudo e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-Bl5I6D/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | === MIGRAR docs/fila/** (--dry-run: NADA é escrito) ===
  | 
  | --- pausa: docs/fila/.orq-pause -> docs/fila/PAUSAR ---
  | motivo preservado: 2026-09-05 09:12 | pausado para aplicar migration 0255
  | (--dry-run: nada foi renomeado)
  | 
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-Bl5I6D/repo/docs/fila/liberacoes.json)
  |            --dry-run: NADA é escrito
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | --- /private/tmp/orq-verificar-Bl5I6D/repo/docs/fila/liberacoes.json (atual)
  | +++ /private/tmp/orq-verificar-Bl5I6D/repo/docs/fila/liberacoes.json (v2 proposto)
  | @@ -1,9 +1,35 @@
  |  {
  | +  "$schema_versao": 2,
  |    "tokens": [
  | -    "migration-0255-aplicada",
  | -    "migration-0259-aplicada",
  | -    "migration-0260-aplicada",
  | -    "migration-0261-aplicada",
  | -    "migration-0262-aplicada"
  | +    {
  | +      "token": "humano:migration-0255-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0259-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0260-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0261-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0262-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    }
  |    ]
  |  }
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-Bl5I6D/repo/docs/fila)
  |            --dry-run: NADA é escrito
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-Bl5I6D/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-Bl5I6D/repo/docs/fila/000-config.json
  |                --dry-run: NADA é escrito
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | 
  | --- /private/tmp/orq-verificar-Bl5I6D/repo/docs/fila/000-config.json (oficial, INTOCADO)
  | +++ /private/tmp/orq-verificar-Bl5I6D/repo/docs/fila/000-config.proposto.json (proposto)
  | @@ -2,17 +2,14 @@
  |    "$schema_versao": 2,
  |    "descricao": "Config do repo de FIXTURE do kit. Mínimo por construção: só as chaves que o motor LÊ hoje, levantadas por grep no disco (grep -ohE \"cfg '[^']*'\" scripts/orquestrador/*.sh, mais os acessos diretos dos .ts). Cada chave traz um comentário _<chave> com a procedência do valor.",
  |    "_procedencia_geral": "Valores de forma vêm de doutrina/templates/config.json; valores de conteúdo, de _referencia-ci/000-config.ci.json (o config REAL do conteudos-infinitos @711ab5e) quando um teste do motor cobra o número exato; o resto é do fixture.",
  | -
  |    "branch_alvo": "staging-auto",
  |    "_branch_alvo": "doutrina/templates/config.json:branch_alvo — lido por lib.sh:53 (CFG_BRANCH_ALVO).",
  |    "branch_protegida": "main",
  |    "_branch_protegida": "local-loop.sh:28 lê '.branch_protegida' (o template chama de branch_principal; o motor lê ESTE nome).",
  | -
  |    "max_retries": 2,
  |    "_max_retries": "_referencia-ci/000-config.ci.json:max_retries — lido por lib.sh:54 e decisao.ts:273.",
  |    "cooldown_minutes": 60,
  |    "_cooldown_minutes": "_referencia-ci/000-config.ci.json:cooldown_minutes — lido por lib.sh (cooldown_arm).",
  | -
  |    "politica_adiamento": {
  |      "regra": "Falha de INFRAESTRUTURA adia. Nunca reprova.",
  |      "causas_que_adiam": [
  | @@ -31,7 +28,6 @@
  |      }
  |    },
  |    "_politica_adiamento": "As 7 causas, na ordem, de _referencia-ci/000-config.ci.json — test-lib-config.sh:58 cobra exatamente 7 e :61 cobra a do juiz pelo nome; decisao.ts:113 itera a lista.",
  | -
  |    "politica_retry": {
  |      "por_causa": {
  |        "diff_cap": {
  | @@ -50,17 +46,14 @@
  |      "proibicao": "NUNCA escalar modelo por falha de tamanho (diff_cap) nem por violação de fronteira (enforcement)."
  |    },
  |    "_politica_retry": "_referencia-ci/000-config.ci.json:politica_retry, sem os campos _porque — decisao.ts:277 indexa por_causa[causa] e rejeita config que mande escalar por diff_cap/enforcement.",
  | -
  |    "migrations_dir": "db/migrations",
  |    "_migrations_dir": "enforcement-core.ts:128 usa para classificar .sql como artefato inerte. O fixture não tem banco; o diretório existe só para a chave não ser nula.",
  |    "sql_pendente_dir": "docs/sql-pendente",
  |    "_sql_pendente_dir": "enforcement-core.ts:128, mesmo par que migrations_dir.",
  | -
  |    "worktrees_dir": "../_worktrees",
  |    "_worktrees_dir": "RELATIVO ao checkout principal (lib.sh:77). Como o fixture é instanciado em <tmp>/repo, isto resolve para <tmp>/_worktrees — nunca ~/Projetos/_worktrees.",
  |    "worktrees_prefixo": "fx-",
  |    "_worktrees_prefixo": "decisao.ts:363. 'fx-' em vez do 'ci-' do conteudos-infinitos: prefixo diferente é o que impede colisão de nome de worktree entre repos.",
  | -
  |    "runs_dir": "docs/fila/runs",
  |    "_runs_dir": "doutrina/templates/config.json:runs_dir — lib.sh:72 (RUNS_BASE).",
  |    "liberacoes_file": "docs/fila/liberacoes.json",
  | @@ -69,7 +62,6 @@
  |    "_decisoes_file": "doutrina/templates/config.json — lib.sh:723.",
  |    "pausar_file": "docs/fila/PAUSAR",
  |    "_pausar_file": "doutrina/templates/config.json — lib.sh:615 (kill switch em arquivo).",
  | -
  |    "modelos": {
  |      "classificador": "haiku",
  |      "executor": "sonnet",
  | @@ -83,7 +75,6 @@
  |    "avaliador_model": "opus",
  |    "retry_final_model": "opus",
  |    "_modelos": "Escada de _referencia-ci/000-config.ci.json (sonnet/opus/opus). juiz.ts:76 lê modelos.juiz_alto/juiz_baixo; executor.sh:149 e decisao.ts:292 leem os três aliases v1.",
  | -
  |    "restricao_execucao": {
  |      "ativa": false,
  |      "tickets_permitidos": [],
  | @@ -92,31 +83,26 @@
  |      "desbloqueio": "preencha executor_model/avaliador_model/retry_final_model em docs/fila/000-config.json"
  |    },
  |    "_restricao_execucao": "decisao.ts:71 lê o objeto inteiro; executor.sh:154 lê .desbloqueio na mensagem de aborto. Inativa aqui: nenhum papel é PENDENTE_*.",
  | -
  |    "diff_cap_linhas": 600,
  |    "_diff_cap_linhas": "600 de _referencia-ci/000-config.ci.json — test-lib-config.sh:50 cobra literalmente 600 ('o NOSSO, não o 2500 do comarka-os').",
  |    "claude_timeout_secs": 900,
  |    "_claude_timeout_secs": "Metade do 1800 do CI: o ticket do fixture é de ~40 linhas e um timeout longo só atrasa o diagnóstico quando o agente trava.",
  |    "claude_max_turns": 40,
  |    "_claude_max_turns": "doutrina/templates/config.json:claude_max_turns (o CI usa 80; 40 basta para um ticket de dois arquivos).",
  | -
  |    "preflight_probe": true,
  |    "_preflight_probe": "LIGADO, e não por gosto: executor.sh:146 sai cedo quando o valor é `false`, e test-retry-worktree.sh:216 exercita `probe_modelos` inteiro (com `claude_run` stubado, sem chamada paga) contra ESTE config — com `false` a seção 4 daquele teste cai em 5 falhas. O preço é uma sondagem real de ~60s ('responda apenas: ok') por drenagem de verdade, que o gate de orçamento mede e o custo.json registra.",
  |    "preflight_env_keys": [],
  |    "_preflight_env_keys": "Vazio: executor.sh:123 itera esta lista e aborta por env faltando. O fixture não tem serviço externo nenhum.",
  | -
  |    "commit_checkpoint": {
  |      "obrigatorio": true,
  |      "quando": "a cada unidade lógica que passe typecheck + teste — não só no fim do ticket",
  |      "_regra": "Passou typecheck e teste? Commita. Trabalho verificado e não commitado não existe."
  |    },
  |    "_commit_checkpoint": "executor.sh lê .commit_checkpoint.quando e ._regra para montar o prompt; texto de _referencia-ci/000-config.ci.json.",
  | -
  |    "repo_origin_deve_conter": "fixture/orq-fixture",
  |    "_repo_origin_deve_conter": "Casa o origin FALSO que o scripts/kit/fixture.sh registra (git@example.invalid:fixture/orq-fixture.git). executor.sh:104-108 aborta o run inteiro se o origin não contiver isto.",
  |    "ambiente_id": "orqfixture",
  |    "_ambiente_id": "executor.sh:111-114 compara com o ref extraído de SUPABASE_URL do .env.local, que o fixture.sh escreve como https://orqfixture.supabase.co. test-lib-config.sh:48 cobra que não seja vazio nem null.",
  | -
  |    "zona_proibida": {
  |      "descricao": "Tudo que o loop NUNCA escreve. Globs relativos à raiz do repo.",
  |      "revisado_humano": true,
  | @@ -138,7 +124,6 @@
  |      "no_write_tables": "TODAS"
  |    },
  |    "_zona_proibida": "Recorte do de _referencia-ci/000-config.ci.json: enforcement-core.ts:211-215 lê no_write_paths + no_write_credenciais.padroes, e :212 trata no_write_tables == 'TODAS' como negação total. Sem banco no fixture, 'TODAS' é a leitura honesta.",
  | -
  |    "paths_harness": [
  |      "scripts/orquestrador/**",
  |      "docs/orquestrador/**",
  | @@ -146,7 +131,6 @@
  |      ".claude/**"
  |    ],
  |    "_paths_harness": "doutrina/templates/config.json:paths_harness, sem mudança — o motor vendorizado mora nos mesmos caminhos aqui. Lido pelo check 5 de scripts/roadmap/lint-mapa.py.",
  | -
  |    "_execucao_dos_gates": {
  |      "ordem_obrigatoria": [
  |        "typecheck",
  | @@ -155,7 +139,6 @@
  |      "interrupcao": "NAO_VALE_PARCIALMENTE"
  |    },
  |    "_ordem": "gates.ts:176-178 ordena .gates[] por esta lista e ERRA se divergir. Dois gates porque o package.json do fixture tem dois scripts: typecheck e test.",
  | -
  |    "gates": [
  |      {
  |        "nome": "typecheck",
  | @@ -172,18 +155,15 @@
  |    ],
  |    "_gates_papel": "Chave OPCIONAL por gate (peça K6b): \"papel\": \"typecheck\" | \"testes\" | \"build\" | \"lint\". É ela que decide o que a linha GATE da trilha diz sobre cada gate. Quando ausente, o papel é INFERIDO do nome (executor.sh, papel_do_gate: *typecheck*/*tsc*/*types* → typecheck; *lint* → lint; *build*/*compil* → build; *test*/*spec* → testes). Declare-a quando o nome do gate não disser o papel — um gate chamado `verificacao` sai como nao-configurado sem ela. Papel que não existe em gate nenhum do config aparece na trilha como `nao-configurado`, nunca `nao-rodou`.",
  |    "_gates": "cmd = os scripts do fixture/package.json, verificados no disco. tipo exit_code (não baseline): o fixture nasce com 0 erro de tipo e 3 testes verdes, então não há erro herdado a tolerar.",
  | -
  |    "launchd": {
  |      "label": "com.orqfixture.orquestrador",
  |      "start_interval": 600
  |    },
  |    "_launchd": "Peça K6c. `label` é o Label do job do launchd e NÃO tem default: instalar-launchd.sh RECUSA sem ele (o CI usa com.conteudos.orquestrador). Um label por repo — para o launchd, dois repos com o mesmo label são o MESMO job, e o segundo bootstrap derruba o primeiro. `start_interval` é o StartInterval em segundos; ausente vira 1800, que é o valor MEDIDO em 06/set/2026 (a medição está no com.orquestrador.plist.template). 600 aqui só para o teste provar que o número sai do config e não do template — o fixture nunca carrega job nenhum.",
  | -
  |    "canal_notificacao": "arquivo",
  |    "_canal_notificacao": "lib.sh:820-823: qualquer valor diferente de 'notificacao_nativa' faz a notificação ficar SÓ no arquivo runs/notificacoes.log. É o padrão que a peça K10 quer para todo repo.",
  |    "push_suprimido": true,
  |    "_push_suprimido": "O origin do fixture é inválido de propósito (example.invalid). Publicar daqui não é opção — e lib.sh:staging_linha já imprime 'push suprimido' no snapshot.",
  | -
  |    "juiz": {
  |      "diff_max_baixo": 300,
  |      "max_tokens_veredicto": 300,
  | @@ -202,7 +182,6 @@
  |      ]
  |    },
  |    "_juiz": "juiz.ts:64-76 lê os quatro campos. paths_alto_risco VAZIO: o fixture só tem src/ e test/, e listar glob que não casa nada seria config decorativa. As palavras são as do doutrina/templates/config.json.",
  | -
  |    "gate_ticket": {
  |      "juiz_para_humano": false,
  |      "max_paths_allowlist": 8,
  | @@ -245,7 +224,6 @@
  |      ]
  |    },
  |    "_gate_ticket": "gate-ticket.ts:carregarCfg lê SÓ proibido_no_cmd e cmd_prefixos_permitidos (os dois nomes conferidos no disco). Os prefixos são o subconjunto do doutrina/templates/config.json que existe neste fixture: sem npm run build, sem npm run lint, sem curl (não há servidor local).",
  | -
  |    "orcamento": {
  |      "usd_dia": 5,
  |      "tokens_dia": 2000000,
  | @@ -259,7 +237,6 @@
  |      }
  |    },
  |    "_orcamento": "campos_usage copiados de _referencia-ci/000-config.ci.json (nomes confirmados lá por sondagem real de claude -p --output-format json). Os TETOS são do fixture e propositalmente baixos: usd_ticket 1 contra os 10 do CI — um ticket de dois arquivos que passe de US$ 1 é sintoma, não trabalho.",
  | -
  |    "executor": {
  |      "auto_verificacao_max": 2,
  |      "modo_arquiteto_para_alto": false,
  | @@ -268,7 +245,6 @@
  |      "trailer_commit": "Orq-Ticket"
  |    },
  |    "_executor": "local-loop.sh:95 lê .executor.trailer_commit para o trailer do merge commit; o resto é o default de doutrina/templates/config.json.",
  | -
  |    "proibicoes_absolutas": {
  |      "regras": [
  |        "nunca push na branch principal",
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/orq-cfg-HssQaH/000-config.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | --- .gitignore: o que o repo deve ignorar ---
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | --- orq validar --pendentes (só relatório; NADA é corrigido) ---
  ok    rc 0
  ok    o dry-run mostra o motivo que seria preservado
  ok    o dry-run traz o DIFF das liberações, não um resumo
  ok    o .orq-pause continua lá e nenhum PAUSAR foi criado
  ok    liberacoes.json intacto
  ok    nenhum .bak foi criado
-- (i2) --migrar aplica: renomeia preservando o motivo, e migra as liberações --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | 
  | === MIGRAR docs/fila/** (GRAVANDO, com .bak) ===
  | 
  | motivo preservado: 2026-09-05 09:12 | pausado para aplicar migration 0255
  | RENOMEADO.
  | 
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-Bl5I6D/repo/docs/fila/liberacoes.json)
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | @@ -1,9 +1,35 @@
  | 
  | GRAVADO. Cópia do estado anterior em /private/tmp/orq-verificar-Bl5I6D/repo/docs/fila/liberacoes.json.bak
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-Bl5I6D/repo/docs/fila)
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-Bl5I6D/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-Bl5I6D/repo/docs/fila/000-config.json
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | 
  | @@ -2,17 +2,14 @@
  | @@ -31,7 +28,6 @@
  | @@ -50,17 +46,14 @@
  | @@ -69,7 +62,6 @@
  | @@ -83,7 +75,6 @@
  | @@ -92,31 +83,26 @@
  | @@ -138,7 +124,6 @@
  | @@ -146,7 +131,6 @@
  | @@ -155,7 +139,6 @@
  | @@ -172,18 +155,15 @@
  | @@ -202,7 +182,6 @@
  | @@ -245,7 +224,6 @@
  | @@ -259,7 +237,6 @@
  | @@ -268,7 +245,6 @@
  | 
  | PROPOSTO gravado em /private/tmp/orq-verificar-Bl5I6D/repo/docs/fila/000-config.proposto.json. O oficial NÃO foi tocado.
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /private/tmp/orq-verificar-Bl5I6D/repo/docs/fila/000-config.proposto.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | O config NÃO foi aplicado, e isso é a peça funcionando. Passo humano:
  | 
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  | 
  | e um SEGUNDO commit, separado, para os dados migrados:
  | 
  | Os `.bak` NÃO entram em commit nenhum: são rede local, e o git já é o backup
  | de tudo que estava versionado. Apague-os quando o diff estiver revisado.
  ok    rc 0
  ok    .orq-pause virou PAUSAR
  ok    o MOTIVO foi preservado byte a byte
  ok    liberacoes.json em v2
  ok    o token ganhou o prefixo humano:
  ok    .bak tem o conteúdo ANTERIOR, byte a byte
  ok    o .gitignore do repo NÃO foi editado
  ok    sugere um SEGUNDO commit, separado, para os dados migrados
-- (i3a) M1: a SEGUNDA passada recusa sobrescrever o proposto da primeira --
  ok    rc 1 (recusa, não erro)
  ok    o instalador REPASSA a recusa
  ok    a mensagem dá o nome que a revisão humana deve usar
  ok    o proposto sobrevive byte a byte
-- (i3) rodar de novo é no-op, e o .bak NÃO é sobrescrito --
  ok    rc 0
  ok    a migração diz que não há o que fazer
  ok    a pausa também é no-op
  ok    .bak preservado (é o estado ANTES da PRIMEIRA migração)
-- (i4) .orq-pause E PAUSAR juntos: NÃO migra, e diz por quê --
  ok    recusa migrar com os dois presentes
  ok    o PAUSAR existente não foi sobrescrito
-- (i5) o relato de .gitignore pergunta ao GIT, e nomeia o que falta --
  ok    acusa docs/fila/PAUSAR faltando
  ok    acusa docs/fila/runs/ faltando
  ok    diz que não edita o .gitignore do repo
  ok    runs/ ignorado por runs/.gitignore conta como ok (é como o CI faz)
-- (i5b) K8b-4: o config é PROPOSTO, nunca aplicado pelo instalador --
  ok    relata o renome supabase_project_id → ambiente_id
  ok    relata a conversão do tipo do gate
  ok    c0_intocavel vira item NOMEADO do relatório
  ok    grita que zona_proibida continua ausente
  ok    o 000-config.json OFICIAL não foi tocado
  ok    000-config.proposto.json gravado ao lado
  ok    o proposto está em schema 2
  ok    c0_intocavel atravessa INTACTA para o proposto
  ok    diz que não aplicou, e dá os 4 passos humanos
-- (i5c) K8b-5: bloco JSON dos pendentes, prosa intacta byte a byte --
  ok    recon_esperado virou recon no ticket real
  ok    o nome antigo saiu do bloco
  ok    a PROSA é byte a byte a mesma
  ok    nenhum .bak de ticket
  ok    o relatório roda o orq validar sobre a fila migrada
  ok    o orq validar não CORRIGIU o ticket (segunda passada é no-op)
-- (i6) --dry-run PREVÊ a recusa em vez de dizer que está tudo bem --
  ok    o dry-run continua saindo 0 (ele não é o gate)
  ok    o dry-run avisa que o --atualizar de verdade recusaria
  ok    e diz o motivo (sem pausa)

== (j) --novo: repo git sem docs/fila ==
-- (j1) o repo nasce inteiro --
  | NOVO       kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-novo-PrGAAV
  | 
  | criado     scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (VERSAO 2.1.0-dev)
  | criado     7 teste(s) de harness e 3 fixture(s) (peça K8d)
  | 
  | criado     docs/fila/rascunhos/.gitkeep
  | criado     docs/fila/000-config.json
  | criado     docs/fila/_TEMPLATE.md
  | criado     docs/fila/decisoes-pendentes.md
  | criado     docs/fila/liberacoes.json (v2 vazio)
  | criado     docs/roadmap/mapa.json
  | criado     docs/roadmap/MAPA.md
  | criado     docs/orquestrador/PLAYBOOK.md
  | criado     docs/orquestrador/PECAS.md
  | escrito    .gitignore (+2 linha(s))
  | criado     docs/fila/runs/.gitignore
  | criado     docs/fila/runs/custo.json
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-novo-PrGAAV
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | --- orq config (o formulário ainda está em branco; é assim que ele nasce) ---
  | CONFIG   /private/tmp/orq-novo-PrGAAV/docs/fila/000-config.json
  |   branch_protegida: placeholder não preenchido: "<a branch que o loop NUNCA empurra — ex.: main>"
  |   worktrees_prefixo: placeholder não preenchido: "<prefixo curto das worktrees deste repo — ex.: ci-, os-, fx->"
  |   migrations_dir: placeholder não preenchido: "<ex: supabase/migrations | db/migrations>"
  |   preflight_env_keys[0]: placeholder não preenchido: "<ENV_OBRIGATORIA_1>"
  |   preflight_env_keys[1]: placeholder não preenchido: "<ENV_OBRIGATORIA_2>"
  |   juiz.paths_alto_risco[0]: placeholder não preenchido: "<ex: supabase/**>"
  |   juiz.paths_alto_risco[1]: placeholder não preenchido: "<ex: src/auth/**>"
  |   juiz.paths_alto_risco[2]: placeholder não preenchido: "<ex: src/billing/**>"
  |   gate_ticket.servidor_local_cmd: placeholder não preenchido: "<ex: npm run dev -- --port 3000 | vazio se não houver critério HTTP; sem ele, remova os prefixos curl>"
  |   sentinela.smoke_cmd: placeholder não preenchido: "<ex: curl -sf http://localhost:3000/api/health>"
  |   orcamento.campos_usage.custo_usd: placeholder não preenchido: "<nome do campo de custo no JSON de claude -p --output-format json, confirmado no pré-voo cat. 8>"
  |   orcamento.campos_usage.tokens_in: placeholder não preenchido: "<campo>"
  |   orcamento.campos_usage.tokens_out: placeholder não preenchido: "<campo>"
  |   orcamento.campos_usage.tokens_cache: placeholder não preenchido: "<campo>"
  |   relatorio.canal: placeholder não preenchido: "<notificacao_nativa | webhook_url | email>"
  |   repo_origin_deve_conter: placeholder não preenchido: "<org/repo>"
  |   ambiente_id: placeholder não preenchido: "<ref do banco/projeto, ou vazio se não aplicável>"
  |   zona_proibida.no_write_tables[0]: placeholder não preenchido: "<tabela_compartilhada_1>"
  |   zona_proibida.no_write_prefixes[0]: placeholder não preenchido: "<prefixo_proibido_>"
  |   zona_proibida.readonly_ok[0]: placeholder não preenchido: "<tabelas que o loop pode SELECT mas nunca escrever>"
  |   zona_proibida.excecoes_os_owned[0]: placeholder não preenchido: "<tabelas de nome parecido mas de propriedade deste repo>"
  |   launchd.label: placeholder não preenchido: "<ex: com.suaorg.orquestrador — OBRIGATÓRIO, um por repo>"
  |   gates[0].cmd: placeholder não preenchido: "<ex: npx tsc --noEmit>"
  |   gates[0].baseline_scope_regex: placeholder não preenchido: "<regex de arquivos com erros herdados tolerados, ou vazio>"
  |   gates[1].cmd: placeholder não preenchido: "<ex: npx vitest run>"
  |   gates[2].cmd: placeholder não preenchido: "<ex: npm run build>"
  |   lint.cmd: placeholder não preenchido: "<ex: npx eslint . --max-warnings=999999>"
  | 
  | 27 violação(ões)
  | 
  | PRÓXIMOS PASSOS, nesta ordem:
  |   1. preencha docs/fila/000-config.json — cada placeholder <...> acima é uma decisão local
  |   2. bash scripts/orq config           # tem de sair 0 violações
  |   3. pré-voo: docs/orquestrador/skill/references/pre-voo.md, categorias 0 a 6
  |   4. um ticket-fixture trivial atravessa o loop, com merge na staging
  |   5. SÓ ENTÃO agendar: bash scripts/orquestrador/instalar-launchd.sh
  |      (ele RECUSA sem launchd.label, e o label é um dos placeholders do passo 1)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-novo-PrGAAV
  |   git add .gitignore scripts/orquestrador scripts/orq scripts/roadmap docs \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'orquestrador: instalação inicial, kit 2.1.0-dev'
  ok    rc 0
  ok    criou docs/fila/000-config.json
  ok    criou docs/fila/_TEMPLATE.md
  ok    criou docs/fila/liberacoes.json
  ok    criou docs/fila/decisoes-pendentes.md
  ok    criou docs/fila/rascunhos/.gitkeep
  ok    criou docs/roadmap/mapa.json
  ok    criou docs/roadmap/MAPA.md
  ok    criou docs/orquestrador/PLAYBOOK.md
  ok    criou docs/orquestrador/PECAS.md
  ok    criou docs/orquestrador/skill/SKILL.md
  ok    criou docs/orquestrador/skill/VERSAO
  ok    criou scripts/orq
  ok    criou scripts/orquestrador/lib.sh
  ok    criou scripts/roadmap/lint-mapa.py
  ok    criou test/fixtures/orq-harness.ts
  ok    criou docs/fila/runs/.gitignore
  ok    VERSAO carimbado
  ok    liberacoes.json nasce em v2
-- (j2) NADA de launchd: agendar é passo separado --
  ok    nenhum plist instanciado no repo
  ok    os próximos passos põem o agendamento por ÚLTIMO
-- (j3) orq config: só placeholders, NENHUMA chave ausente --
  ok    rc 1 (formulário em branco é config inválido, e tem de ser)
  ok    lista os placeholders
  ok    nenhuma chave obrigatória AUSENTE (o template só precisa ser preenchido)
-- (j4) --verificar: idêntico ao kit --
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    idêntico ao kit
-- (j5) .gitignore: acrescenta o que falta, preserva o que havia --
  ok    a linha que já existia sobreviveu
  ok    acrescentou docs/fila/PAUSAR
  ok    docs/fila/runs/ é ignorado (o git confirma)
-- (j6) rodar de novo RECUSA: com fila, o verbo é --atualizar --
  ok    rc 1
  ok    a recusa diz por quê e aponta o --atualizar
-- (j7) repo que não é git: RECUSA antes de escrever qualquer coisa --
  ok    rc 1
  ok    a recusa nomeia a causa
  ok    não escreveu NADA no diretório recusado

== (k) T1 · sem node_modules/.bin/tsx ==
-- (k1) --atualizar RECUSA, nomeando o caminho e o comando --
  | RECUSADO: '/private/tmp/orq-sem-tsx-j3qUCl' não tem node_modules/.bin/tsx: o motor do orquestrador é TypeScript e nenhuma parte dele roda sem tsx. Instale a dependência de DESENVOLVIMENTO no repo, com o loop pausado, e repita: npm i -D tsx@^4.19.0   (ou o equivalente do gerenciador deste repo)
  ok    rc 1
  ok    diz RECUSADO
  ok    nomeia node_modules/.bin/tsx
  ok    dá a linha de instalação
-- (k2) --forcar NÃO dispensa (forçar copiaria um motor que não roda) --
  ok    rc 1 com --forcar
-- (k3) --dry-run SÓ AVISA: sai 0, prevê a recusa e não escreve nada --
  ok    rc 0 (o dry-run não é o gate)
  ok    prevê a recusa
  ok    e diz qual
  ok    árvore idêntica antes e depois
-- (k4) com o tsx de volta, o --atualizar segue normalmente --
  ok    rc 0
  ok    nenhuma reclamação de tsx

== (c) ORQ_CI_CHECKOUT não setado (SÓ LEITURA — o resultado é achado, não gate) ==
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
rc=0
```

### git log --oneline main..kit/etapa7b

```
551e967 7b-8: devolução humana zera tentativas, .sem-progresso e .adiamentos
470c237 7b-6: docs da etapa 7b (PECAS, CHANGELOG e CONTRATO)
27177af 7b-7: RunAtLoad true no template do plist
052ac50 7b-5: o aviso de AMBIENTE só na transição
ffab528 7b-4: sub-motivo, escalada só com juiz, corte de repetição e tentativas persistidas
dd3ecd7 7b-3: teto de adiamentos consecutivos, com a causa real
cfb5cf3 7b-2: tabela de causas (cooldown só para limite remoto)
a28fe81 7b-1: nenhum teste do kit lê arquivo vivo de outro repo (K8e)
```

---

# Acréscimo · 7b-9 (teste que viaja não depende do kit)

sha: `da97b3a`. Mesmas regras; sem push, sem merge. `main` já estava em `551e967` (merge da 7b até a 7b-8 feito fora desta sessão), então `main..kit/etapa7b` é só esta peça.

## O defeito e a correção

Na instalação no conteudos-infinitos, o `test-reprovado-sub.sh` falhou 3 checks (fixture
ausente, houve RETRY, 2 chamadas): lia a trilha do 461 em
`${ORQ_KIT:-$AQUI/../..}/test/fixtures/trilha/actus-461-reprovado.log`, e fora do kit esse
caminho aponta para a raiz do repo instalado. O motor estava certo; o defeito era de
empacotamento, e eu mesmo o tinha plantado na 7b-4 ao consertar o mesmo sintoma dentro do
`test-shell.sh` com `ORQ_KIT`, em vez de tirar a dependência.

- `test-reprovado-sub.sh`: a trilha vai em heredoc (`<<'TRILHA_461'`) num arquivo do
  `mktemp -d` do próprio teste, com origem (Actus, `events.log` linhas 434-437, HEAD
  `f438730`), data (2026-09-21) e cksum num comentário. Sem `ORQ_KIT`; o `test-shell.sh` deixou
  de exportá-lo.
- A trava pegou mais quatro arquivos, corrigidos no mesmo commit:
  - `test-preflight.sh:164` lia `test/fixtures/claude-envelope/` do kit: os dois envelopes
    reais vão em heredoc, com origem e data. (Esse script segue fora do `test-shell.sh`, porque
    chama a API; conferido com `bash -n` e pelo caso de igualdade do vitest.)
  - `test-drenagem.sh:31,33`, `test-retry-worktree.sh:29,31` e `test-preflight.sh:38,40`
    subiam com `$AQUI/../..` para achar a raiz do checkout; e o molde
    `test-fixture-executor.sh:33` fazia o mesmo para achar o `node_modules`. Os quatro agora
    perguntam ao git (`rev-parse --git-common-dir`, com `--show-toplevel` como reserva). O
    alvo é o mesmo (o checkout que contém o script); o que muda é não depender da posição do
    arquivo. Deixo registrado: essas quatro não quebravam hoje, porque `scripts/orquestrador` fica
    a dois níveis da raiz no kit e no repo instalado. Corrigi porque a trava pedida as reprova.
- Trava (`scripts/kit/test-instalar.sh`, seção (v)): varre os `test-*.sh` VENDORIZADOS no
  fixture (17 hoje) e reprova, fora de linha de comentário, `test/fixtures`, `ORQ_KIT`,
  `<algo>AQUI/..` ou `/../..`. O `../_worktrees` que aparece como VALOR de config nos
  heredocs de JSON não casa (é relativo ao repo do fixture, não sobe de
  `scripts/orquestrador`). Tem o negativo: a linha exata que quebrou no CI é reprovada.
- `test/orquestrador-sub-repeticao.test.ts`: as três cópias embutidas são byte a byte as
  fixtures de `test/fixtures/`, que seguem no kit como referência.

## Vermelho

O `test-reprovado-sub.sh` de `551e967` numa cópia de `scripts/orquestrador` fora do kit
(`mktemp -d`, repo git com `node_modules` na raiz como num repo instalado, sem `test/` e sem
`ORQ_KIT`), os mesmos 3 checks do CI:

```
$ (cópia de scripts/orquestrador de 551e967 em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.JdZL2iNCFW/repo, repo git com node_modules na raiz, sem test/ e sem ORQ_KIT)
$ env -u ORQ_KIT /bin/bash scripts/orquestrador/test-reprovado-sub.sh
== A. critério vermelho, com permissão negada: mérito, mesmo modelo ==
  ok    a permissão negada foi registrada
  ok    REPROVADO sub=criterio
  ok    RETRY com o mesmo modelo (sonnet), sub=criterio
  ok    nenhuma chamada em opus
  ok    não adiou (permissão negada não é ambiente)
  | 901 INICIO attempt=1 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=0d570314
  | 901 INICIO attempt=2 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== B. juiz reprovando: escala ==
  ok    REPROVADO sub=juiz
  ok    RETRY model=opus, sub=juiz
  ok    a 2ª chamada do agente foi em opus
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=baixo modelo=sonnet attempt=1
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade sub=juiz worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=29b71980
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=alto modelo=opus attempt=2
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo ==
  ok    REPROVADO sub=gate_testes
  ok    RETRY com o mesmo modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=gate_testes worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=2ddab044
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora ==
cp: /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.JdZL2iNCFW/repo/test/fixtures/trilha/actus-461-reprovado.log: No such file or directory
  FALHA fixture ausente: /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.JdZL2iNCFW/repo/test/fixtures/trilha/actus-461-reprovado.log
  ok    a reprovação desta execução: sub=criterio diff=717
  ok    BLOQUEADO motivo=repeticao
  ok    ticket bloqueado
  FALHA houve RETRY (3ª volta)
  FALHA 2 chamadas
  nota: repetição: 2ª reprovação igual à anterior (sub=criterio, diff=717), sem 3ª volta. critério(s) reprovado(s): o arquivo existe
  ok    a nota diz repetição e o diff
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717
  | 461 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 461 WORKTREE modo=reaproveitada de=attempt-0 base=a0986d23
  | 461 INICIO attempt=2 model=sonnet
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=717
  | 461 BLOQUEADO motivo=repeticao sub=criterio diff=717 attempt=2

== E. max_retries vale no total, não por drenagem ==
  --- 1ª execução: tentativas=1 status=pendente
  ok    1ª execução: reprovou, adiou, segue pendente
  ok    1 tentativa consumida, persistida no ticket (o adiado devolveu a sua)
  --- 2ª execução: tentativas=3 status=bloqueado
  ok    3 reprovações no total (max_retries 2 + 1)
  ok    a 2ª execução começa em attempt=2
  ok    BLOQUEADO na attempt=3
  ok    nenhuma 4ª tentativa
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=ba82f7eb
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=1s cooldown=nao
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 RETRY attempt=3 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-2 base=ba82f7eb
  | 901 INICIO attempt=3 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=3 diff=7
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

3 CHECK(S) FALHARAM
rc=1
```

A trava nova contra os test-*.sh de `551e967` (seção (v) e placar do `test-instalar.sh`):

```
== (v) nenhum scripts/orquestrador/test-*.sh vendorizado depende do kit ==
  ok    17 test-*.sh vendorizados no fixture varridos
  FALHA teste vendorizado que não viaja:
  test-drenagem.sh:31:CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
  test-drenagem.sh:33:[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
  test-fixture-executor.sh:33:FXE_NM="$(cd "$FXE_AQUI/../.." && pwd)/node_modules"
  test-preflight.sh:38:CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
  test-preflight.sh:40:[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
  test-preflight.sh:164:FIXT="$(cd "$AQUI/../.." && pwd)/test/fixtures/claude-envelope"
  test-reprovado-sub.sh:38:FIXTURE_461="${ORQ_KIT:-$(cd "$AQUI/../.." && pwd)}/test/fixtures/trilha/actus-461-reprovado.log"
  test-retry-worktree.sh:29:CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
  test-retry-worktree.sh:31:[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
  ok    a trava reprova a linha que quebrou no CI

== (c) ORQ_CI_CHECKOUT não setado (SÓ LEITURA — o resultado é achado, não gate) ==

1 CHECK(S) FALHARAM
rc=1
```

## Verde

O mesmo teste, na cópia da árvore corrigida:

```
$ (cópia de scripts/orquestrador da árvore corrigida em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.Ix2BSSinf7/repo, repo git com node_modules na raiz, sem test/ e sem ORQ_KIT)
$ env -u ORQ_KIT /bin/bash scripts/orquestrador/test-reprovado-sub.sh
== A. critério vermelho, com permissão negada: mérito, mesmo modelo ==
  ok    a permissão negada foi registrada
  ok    REPROVADO sub=criterio
  ok    RETRY com o mesmo modelo (sonnet), sub=criterio
  ok    nenhuma chamada em opus
  ok    não adiou (permissão negada não é ambiente)
  | 901 INICIO attempt=1 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=f02f8738
  | 901 INICIO attempt=2 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== B. juiz reprovando: escala ==
  ok    REPROVADO sub=juiz
  ok    RETRY model=opus, sub=juiz
  ok    a 2ª chamada do agente foi em opus
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=baixo modelo=sonnet attempt=1
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade sub=juiz worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=feddaece
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=alto modelo=opus attempt=2
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo ==
  ok    REPROVADO sub=gate_testes
  ok    RETRY com o mesmo modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=gate_testes worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=13db5abc
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora ==
  ok    trilha fixture do 461 no lugar
  ok    a reprovação desta execução: sub=criterio diff=717
  ok    BLOQUEADO motivo=repeticao
  ok    ticket bloqueado
  ok    nenhum RETRY
  ok    uma chamada paga só
  nota: repetição: 2ª reprovação igual à anterior (sub=criterio, diff=717), sem 3ª volta. critério(s) reprovado(s): o arquivo existe
  ok    a nota diz repetição e o diff
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
  | 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717
  | 461 BLOQUEADO motivo=repeticao sub=criterio diff=717 attempt=1

== E. max_retries vale no total, não por drenagem ==
  --- 1ª execução: tentativas=1 status=pendente
  ok    1ª execução: reprovou, adiou, segue pendente
  ok    1 tentativa consumida, persistida no ticket (o adiado devolveu a sua)
  --- 2ª execução: tentativas=3 status=bloqueado
  ok    3 reprovações no total (max_retries 2 + 1)
  ok    a 2ª execução começa em attempt=2
  ok    BLOQUEADO na attempt=3
  ok    nenhuma 4ª tentativa
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=894871ee
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 RETRY attempt=3 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-2 base=894871ee
  | 901 INICIO attempt=3 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=3 diff=7
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

TODOS OS CHECKS PASSARAM
rc=0
```

A trava (seção (v)):

```
== (v) nenhum scripts/orquestrador/test-*.sh vendorizado depende do kit ==
  ok    17 test-*.sh vendorizados no fixture varridos
  ok    nenhum cita test/fixtures, ORQ_KIT ou caminho que sobe para fora de scripts/orquestrador
  ok    a trava reprova a linha que quebrou no CI

== (c) ORQ_CI_CHECKOUT não setado (SÓ LEITURA — o resultado é achado, não gate) ==
```

## Diff

```
commit da97b3a72c944045c16c2da90ec23b898077f233
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Mon Sep 21 15:55:10 2026 -0300

    7b-9: teste que viaja não depende do kit
    
    Na instalação no conteudos-infinitos o test-reprovado-sub.sh falhou 3 checks:
    lia a trilha do 461 em ${ORQ_KIT:-$AQUI/../..}/test/fixtures/, que fora do kit
    aponta para a raiz do repo instalado, onde a fixture não existe.
    
    - test-reprovado-sub.sh: a trilha do 461 em heredoc num mktemp, com origem e
      data em comentário; sem ORQ_KIT (e o test-shell.sh não o exporta mais).
    - test-preflight.sh: os dois envelopes reais em heredoc, pelo mesmo motivo.
    - test-drenagem.sh, test-retry-worktree.sh, test-preflight.sh e o molde
      test-fixture-executor.sh: a raiz do checkout vem do git (rev-parse), não
      de $AQUI/../..
    - test-instalar.sh (v): trava que reprova test-*.sh vendorizado citando
      test/fixtures, ORQ_KIT ou subindo com .. a partir do próprio diretório,
      com o negativo da linha que quebrou no CI.
    - vitest: as cópias embutidas são byte a byte as fixtures do kit.
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
---
 CHANGELOG.md                                  |  2 ++
 docs/PECAS.md                                 | 10 +++++++++
 scripts/kit/test-instalar.sh                  | 32 +++++++++++++++++++++++++++
 scripts/kit/test-shell.sh                     |  3 ---
 scripts/orquestrador/test-drenagem.sh         |  8 ++++---
 scripts/orquestrador/test-fixture-executor.sh |  4 +++-
 scripts/orquestrador/test-preflight.sh        | 25 ++++++++++++++++-----
 scripts/orquestrador/test-reprovado-sub.sh    | 17 ++++++++++----
 scripts/orquestrador/test-retry-worktree.sh   |  8 ++++---
 test/orquestrador-sub-repeticao.test.ts       | 22 ++++++++++++++++++
 10 files changed, 112 insertions(+), 19 deletions(-)

diff --git a/CHANGELOG.md b/CHANGELOG.md
index e15d5df..241db33 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -652,6 +652,8 @@ opus, o Actus gastou US$ 9,28 por ticket aprovado (US$ 3,06 no CI), todo adiamen
 - **7b-6** `470c237`: PECAS, este CHANGELOG e o CONTRATO.
 - **7b-8**: ticket devolvido por humano de bloqueado para pendente volta com tentativas,
   `.sem-progresso` e `.adiamentos` zerados (`RECUPERADO motivo=reaberto`).
+- **7b-9**: os `test-*.sh` vendorizados não dependem do kit (fixtures em heredoc, raiz pelo git,
+  sem `ORQ_KIT`), com trava no `test-instalar.sh`.
 
 O que o CI faz diferente, ao atualizar: um 503 ou um timeout deixam de parar a fila por uma
 hora; um gate cujo runner não roda adia em vez de gastar retry em opus; um critério vermelho
diff --git a/docs/PECAS.md b/docs/PECAS.md
index 949abf2..e9763b3 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -809,6 +809,16 @@
   executor real): docs/fila limpo em toda chamada ao agente; o ticket devolvido recomeça em
   attempt=1 e não zera duas vezes. **Antes, rodava a attempt=4 e bloqueava na hora.**
 
+- **7b-9 · teste que viaja não depende do kit**. Na instalação no CI o
+  `test-reprovado-sub.sh` falhou 3 checks: lia a trilha do 461 em `test/fixtures/` do kit, que
+  não existe no repo instalado. A trilha (e os dois envelopes do `test-preflight.sh`) vão em
+  heredoc dentro do teste, sem `ORQ_KIT`; a raiz do checkout, onde um teste precisa dela, vem
+  do git. Trava nova no `test-instalar.sh` (v): nenhum `scripts/orquestrador/test-*.sh`
+  vendorizado cita `test/fixtures`, `ORQ_KIT` ou sobe com `..` a partir do próprio diretório.
+  O vitest cobra que as cópias embutidas são as fixtures do kit, byte a byte.
+  *Teste:* o `test-reprovado-sub.sh` numa cópia de `scripts/orquestrador` fora do kit.
+  **Antes, 3 checks falhando e a trava reprovando 9 linhas em 5 arquivos.**
+
 
 ## PENDENTES
 
diff --git a/scripts/kit/test-instalar.sh b/scripts/kit/test-instalar.sh
index f9e7aef..977b4d3 100644
--- a/scripts/kit/test-instalar.sh
+++ b/scripts/kit/test-instalar.sh
@@ -594,6 +594,38 @@ saida="$(bash "$KIT/instalar.sh" --atualizar "$SEM_TSX" 2>&1)"; rc=$?
 printf '%s' "$saida" | grep -q 'node_modules/.bin/tsx' \
   && falha "ainda reclama do tsx" || ok "nenhuma reclamação de tsx"
 
+# --- (v) os testes vendorizados viajam (peça 7b-9) ---------------------------
+# Um scripts/orquestrador/test-*.sh vai para todo repo instalado. Lá não existe
+# `test/fixtures/` do kit, não existe ORQ_KIT, e o que fica acima de
+# scripts/orquestrador é o repo de OUTRA pessoa. Na instalação da 7b no CI, o
+# test-reprovado-sub.sh lia a trilha do 461 em test/fixtures/ e falhou 3 checks
+# por empacotamento, com o motor certo. A trava: fora de comentário, nenhum
+# test-*.sh vendorizado pode citar `test/fixtures`, `ORQ_KIT`, nem subir com `..`
+# a partir do próprio diretório (`$AQUI/..`, `$FXE_AQUI/..`, `/../..`). A raiz do
+# checkout, quando o teste precisa dela, vem do git (`rev-parse`), não do layout.
+echo
+echo "== (v) nenhum scripts/orquestrador/test-*.sh vendorizado depende do kit =="
+TRAVA_VIAJA='test/fixtures|ORQ_KIT|[A-Za-z_]*AQUI\}?"?/\.\.|/\.\./\.\.'
+n_viaja=0; achados_viaja=''
+for t in "$FX"/scripts/orquestrador/test-*.sh; do
+  [ -f "$t" ] || continue
+  n_viaja=$((n_viaja + 1))
+  a="$(grep -nE "$TRAVA_VIAJA" "$t" | grep -vE '^[0-9]+:[[:space:]]*#' || true)"
+  [ -z "$a" ] || achados_viaja="$achados_viaja$(printf '%s\n' "$a" | sed "s|^|  ${t##*/}:|")
+"
+done
+[ "$n_viaja" -gt 0 ] && ok "$n_viaja test-*.sh vendorizados no fixture varridos" || falha "nenhum test-*.sh vendorizado achado em $FX/scripts/orquestrador"
+if [ -z "$achados_viaja" ]; then
+  ok "nenhum cita test/fixtures, ORQ_KIT ou caminho que sobe para fora de scripts/orquestrador"
+else
+  falha "teste vendorizado que não viaja:"
+  printf '%s' "$achados_viaja"
+fi
+# O NEGATIVO da trava: ela reprova o padrão que quebrou no CI.
+printf 'FIXT="${ORQ_KIT:-$(cd "$AQUI/../.." && pwd)}/test/fixtures/trilha/x.log"\n' > "$COPIA_EXTRA/negativo-viaja.sh"
+grep -qE "$TRAVA_VIAJA" "$COPIA_EXTRA/negativo-viaja.sh" && ok "a trava reprova a linha que quebrou no CI" || falha "a trava deixou passar a linha do CI"
+rm -f "$COPIA_EXTRA/negativo-viaja.sh"
+
 # --- (c) ---------------------------------------------------------------------
 echo
 echo "== (c) ${CI_CHECKOUT:-ORQ_CI_CHECKOUT não setado} (SÓ LEITURA — o resultado é achado, não gate) =="
diff --git a/scripts/kit/test-shell.sh b/scripts/kit/test-shell.sh
index e39cb92..1d8543d 100644
--- a/scripts/kit/test-shell.sh
+++ b/scripts/kit/test-shell.sh
@@ -44,9 +44,6 @@
 set -uo pipefail
 
 KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
-# Os testes que leem fixture versionada do kit (test/fixtures/) a acham por aqui:
-# rodando da cópia vendorizada no repo de fixture, `$AQUI/../..` não é o kit.
-export ORQ_KIT="$KIT"
 SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh test-adiamentos-limite.sh test-reprovado-sub.sh test-notificacao-ambiente.sh test-reabertura-humana.sh'
 
 FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
diff --git a/scripts/orquestrador/test-drenagem.sh b/scripts/orquestrador/test-drenagem.sh
index e1ace04..98c6e7c 100755
--- a/scripts/orquestrador/test-drenagem.sh
+++ b/scripts/orquestrador/test-drenagem.sh
@@ -28,9 +28,11 @@ AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
 # tinha sido exercido fora de um fixture vendorizado. O checkout real continua
 # sendo usado para UMA coisa, só leitura: provar que a branch protegida dele
 # não se move (casos 2 e 3).
-CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
-CHECKOUT_REAL="$(git -C "$CHECKOUT_REAL" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
-[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
+# A raiz do checkout que contém este script vem do GIT, não do layout (peça
+# 7b-9): o script viaja, e subir com `..` a partir dele é depender de onde o kit
+# o põe. Worktree: o comum (o checkout principal); fora dele, o toplevel.
+CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
+[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --show-toplevel 2>/dev/null || true)"
 
 # escrever_config <raiz> — o 000-config.json MÍNIMO que o lib.sh e o
 # local-loop.sh leem no carregamento e na drenagem (config-chaves.ts). Nada de
diff --git a/scripts/orquestrador/test-fixture-executor.sh b/scripts/orquestrador/test-fixture-executor.sh
index 9f5ba1a..bd437cc 100644
--- a/scripts/orquestrador/test-fixture-executor.sh
+++ b/scripts/orquestrador/test-fixture-executor.sh
@@ -30,7 +30,9 @@ if [ "${BASH_SOURCE[0]}" = "$0" ]; then
 fi
 
 FXE_AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
-FXE_NM="$(cd "$FXE_AQUI/../.." && pwd)/node_modules"
+# O node_modules do checkout que contém este molde, achado pelo GIT e não
+# subindo com `..` a partir daqui (peça 7b-9: o molde viaja para o repo instalado).
+FXE_NM="$(git -C "$FXE_AQUI" rev-parse --show-toplevel 2>/dev/null || true)/node_modules"
 
 # fxe_novo [filtro-jq] — um tmp novo com repo, claude falso e gates verdes. O
 # filtro opcional ajusta o config do caso (ex.: '.max_retries = 0').
diff --git a/scripts/orquestrador/test-preflight.sh b/scripts/orquestrador/test-preflight.sh
index 0cd37fe..c443a74 100755
--- a/scripts/orquestrador/test-preflight.sh
+++ b/scripts/orquestrador/test-preflight.sh
@@ -35,9 +35,11 @@ AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
 # --git-common-dir`, de qualquer worktree — e um `event` disparado aqui grava na
 # trilha de produção. Foi assim que os `EXECUTOR_MORREU` espúrios de 2026-09-04
 # 20:45/20:47 entraram no `events.log` real.
-CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
-CHECKOUT_REAL="$(git -C "$CHECKOUT_REAL" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
-[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
+# A raiz do checkout que contém este script vem do GIT, não do layout (peça
+# 7b-9): o script viaja, e subir com `..` a partir dele é depender de onde o kit
+# o põe. Worktree: o comum (o checkout principal); fora dele, o toplevel.
+CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
+[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --show-toplevel 2>/dev/null || true)"
 CONFIG_REAL="$CHECKOUT_REAL/docs/fila/000-config.json"
 export ORQ_TESTE=1
 ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
@@ -161,7 +163,20 @@ echo "== 4 · fronteira: sondagem limitada ADIA, não aborta =="
 # fina da fronteira mora em test/orquestrador-envelope.test.ts; aqui fica só o
 # smoke de que o lib.sh carregado por este script concorda com ela.
 tmp="$(mktemp)"
-FIXT="$(cd "$AQUI/../.." && pwd)/test/fixtures/claude-envelope"
+# Os dois envelopes vão EMBUTIDOS (peça 7b-9): este script viaja para todo repo
+# instalado, e lá não existe o test/fixtures/ do kit. Origem: capturados nesta
+# máquina em 2026-09-03 (CLI 2.1.259), versionados no kit em
+# test/fixtures/claude-envelope/ desde 2026-09-08 (617d6ba); o vitest
+# (orquestrador-sub-repeticao.test.ts) cobra que as cópias são iguais.
+FIXT="$(mktemp -d)"
+cat > "$FIXT/rate-limit-429.txt" <<'ENVELOPE_429'
+⚠ claude.ai connectors are disabled because ANTHROPIC_API_KEY or another auth source is set and takes precedence over your claude.ai login · Unset it to load your organization's connectors
+{"duration_api_ms":0,"stop_reason":"stop_sequence","session_id":"ac00ba2d-2a06-4133-812c-61a975ecb773","total_cost_usd":0,"usage":{"output_tokens_details":{"thinking_tokens":0},"input_tokens":0,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":0,"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard","cache_creation":{"ephemeral_1h_input_tokens":0,"ephemeral_5m_input_tokens":0},"inference_geo":"","iterations":[],"speed":"standard"},"modelUsage":{},"permission_denials":[],"terminal_reason":"api_error","fast_mode_state":"off","fast_mode_disabled_reason":"sdk_opt_in_required","subagent_stats":{"spawned":0,"requested":{"background":0,"foreground":0,"unset":0},"started_in_background":0,"max_depth":0,"spawned_by_subagents":0,"completed":0,"failed":0,"killed":{"parent":0,"user":0,"system":0},"refused":{"depth_limit":0,"concurrency_limit":0,"budget":0},"by_type":{}},"is_error":true,"num_turns":1,"subtype":"success","api_error_status":429,"result":"API Error: Request rejected (429) · This request would exceed your organization rate limit. Please try again later.","type":"result","duration_ms":167,"uuid":"396d9fe5-84f8-4c2b-97db-aebeb7eecdb7","queued_turn_count":0}
+ENVELOPE_429
+cat > "$FIXT/conexao-recusada.txt" <<'ENVELOPE_CONEXAO'
+Warning: no stdin data received in 3s, proceeding without it. If piping from a slow command, redirect stdin explicitly: < /dev/null to skip, or wait longer.
+{"duration_api_ms":0,"stop_reason":"stop_sequence","session_id":"b67c7147-8be0-4135-ba2d-37dbc7358b7e","total_cost_usd":0,"usage":{"output_tokens_details":{"thinking_tokens":0},"input_tokens":0,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":0,"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard","cache_creation":{"ephemeral_1h_input_tokens":0,"ephemeral_5m_input_tokens":0},"inference_geo":"","iterations":[],"speed":"standard"},"modelUsage":{},"permission_denials":[],"terminal_reason":"api_error","fast_mode_state":"off","fast_mode_disabled_reason":"sdk_opt_in_required","subagent_stats":{"spawned":0,"requested":{"background":0,"foreground":0,"unset":0},"started_in_background":0,"max_depth":0,"spawned_by_subagents":0,"completed":0,"failed":0,"killed":{"parent":0,"user":0,"system":0},"refused":{"depth_limit":0,"concurrency_limit":0,"budget":0},"by_type":{}},"is_error":true,"num_turns":1,"subtype":"success","api_error_status":null,"result":"API Error: Connection refused — a firewall or proxy may be blocking it (ConnectionRefused)","type":"result","duration_ms":179842,"uuid":"42e55ee4-39af-412f-a0ee-6e9e0395f8ee","queued_turn_count":0}
+ENVELOPE_CONEXAO
 if [ -s "$FIXT/rate-limit-429.txt" ]; then
   is_adiavel "$FIXT/rate-limit-429.txt" 1 && ok "429 real => adiável" || falha "429 real não classificado como adiável"
   is_adiavel "$FIXT/conexao-recusada.txt" 1 && ok "conexão recusada real => adiável" || falha "conexão real não classificada como adiável"
@@ -172,7 +187,7 @@ fi
 is_adiavel "$tmp" 1 && ok "saída vazia com rc!=0 => adiável (CLI não falou)" || falha "saída vazia não classificada como adiável"
 printf '[claude-code:unrecognized_model] {}\n' > "$tmp"
 is_adiavel "$tmp" 1 && falha "modelo recusado tratado como adiável (deveria abortar)" || ok "modelo recusado NÃO é adiável"
-rm -f "$tmp"
+rm -f "$tmp"; rm -rf "$FIXT"
 
 echo
 echo "== 5 · JUIZ (passo 7): stub, evidência e ZERO gasto =="
diff --git a/scripts/orquestrador/test-reprovado-sub.sh b/scripts/orquestrador/test-reprovado-sub.sh
index 9165bc0..5d9a571 100644
--- a/scripts/orquestrador/test-reprovado-sub.sh
+++ b/scripts/orquestrador/test-reprovado-sub.sh
@@ -32,10 +32,19 @@ TMP_RAIZ="$(dirname "$ORQ_EXEC_ROOT")"
 # shellcheck source=test-fixture-executor.sh
 source "$AQUI/test-fixture-executor.sh"
 trap 'fxe_limpa; rm -rf "$TMP_RAIZ"' EXIT
-# O fixture mora no KIT (test/fixtures/). Rodado pelo test-shell.sh, este
-# script é a cópia vendorizada no repo de fixture, que não tem test/: o
-# test-shell.sh exporta ORQ_KIT com a raiz do kit.
-FIXTURE_461="${ORQ_KIT:-$(cd "$AQUI/../.." && pwd)}/test/fixtures/trilha/actus-461-reprovado.log"
+# A trilha do 461 vai EMBUTIDA (peça 7b-9): este script viaja para todo repo
+# instalado, e lá não existe o test/fixtures/ do kit. Origem: linhas 434 a 437
+# de ~/Projetos/actus-saas/docs/fila/runs/events.log (HEAD f438730), copiadas
+# byte a byte em 2026-09-21, só leitura; cksum 1004446157 411. A mesma cópia
+# está no kit em test/fixtures/trilha/actus-461-reprovado.log, e um caso do
+# vitest (orquestrador-sub-repeticao.test.ts) cobra que as duas são iguais.
+FIXTURE_461="$TMP_RAIZ/actus-461-reprovado.log"
+cat > "$FIXTURE_461" <<'TRILHA_461'
+2026-09-15T11:46:34-0300 461 INICIO attempt=1 model=sonnet
+2026-09-15T11:52:56-0300 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
+2026-09-15T11:53:34-0300 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
+2026-09-15T11:53:34-0300 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
+TRILHA_461
 
 FALHAS=0
 ok()    { printf '  ok    %s\n' "$*"; }
diff --git a/scripts/orquestrador/test-retry-worktree.sh b/scripts/orquestrador/test-retry-worktree.sh
index c78c3d8..dd77972 100755
--- a/scripts/orquestrador/test-retry-worktree.sh
+++ b/scripts/orquestrador/test-retry-worktree.sh
@@ -26,9 +26,11 @@ AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
 # --git-common-dir`, de qualquer worktree — e um `event` disparado aqui grava na
 # trilha de produção. Foi assim que os `EXECUTOR_MORREU` espúrios de 2026-09-04
 # 20:45/20:47 entraram no `events.log` real.
-CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
-CHECKOUT_REAL="$(git -C "$CHECKOUT_REAL" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
-[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
+# A raiz do checkout que contém este script vem do GIT, não do layout (peça
+# 7b-9): o script viaja, e subir com `..` a partir dele é depender de onde o kit
+# o põe. Worktree: o comum (o checkout principal); fora dele, o toplevel.
+CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
+[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --show-toplevel 2>/dev/null || true)"
 CONFIG_REAL="$CHECKOUT_REAL/docs/fila/000-config.json"
 export ORQ_TESTE=1
 ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
diff --git a/test/orquestrador-sub-repeticao.test.ts b/test/orquestrador-sub-repeticao.test.ts
index 6a670cc..c8d6e76 100644
--- a/test/orquestrador-sub-repeticao.test.ts
+++ b/test/orquestrador-sub-repeticao.test.ts
@@ -100,3 +100,25 @@ describe('reabertoDeBloqueado: devolução humana (peça 7b-8)', () => {
     expect(reabertoDeBloqueado([])).toBe(false);
   });
 });
+
+describe('as cópias EMBUTIDAS nos testes que viajam são as fixtures do kit (peça 7b-9)', () => {
+  // Os test-*.sh vão para todo repo instalado, onde test/fixtures/ não existe:
+  // por isso carregam as fixtures em heredoc. A cópia no kit segue sendo a
+  // referência, e este caso impede as duas de divergirem em silêncio.
+  const heredoc = (script: string, marca: string): string => {
+    const txt = readFileSync(join(__dirname, '..', 'scripts', 'orquestrador', script), 'utf8');
+    const ini = txt.indexOf(`<<'${marca}'\n`);
+    expect(ini, `${script} sem o heredoc ${marca}`).toBeGreaterThan(-1);
+    const corpo = txt.slice(ini + `<<'${marca}'\n`.length);
+    return corpo.slice(0, corpo.indexOf(`\n${marca}\n`) + 1);
+  };
+  const fixture = (...p: string[]) => readFileSync(join(__dirname, 'fixtures', ...p), 'utf8');
+
+  it('test-reprovado-sub.sh: a trilha do 461', () => {
+    expect(heredoc('test-reprovado-sub.sh', 'TRILHA_461')).toBe(fixture('trilha', 'actus-461-reprovado.log'));
+  });
+  it('test-preflight.sh: os dois envelopes reais', () => {
+    expect(heredoc('test-preflight.sh', 'ENVELOPE_429')).toBe(fixture('claude-envelope', 'rate-limit-429.txt'));
+    expect(heredoc('test-preflight.sh', 'ENVELOPE_CONEXAO')).toBe(fixture('claude-envelope', 'conexao-recusada.txt'));
+  });
+});
```

## Fechamento do acréscimo

### vitest

```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7b

 ✓ test/orquestrador-enforcement.test.ts (47 tests) 27ms
 ✓ test/orquestrador-enforcement-actus.test.ts (104 tests) 23ms
 ✓ test/orquestrador-decisao.test.ts (39 tests) 9ms
 ✓ test/orquestrador-prevoo.test.ts (34 tests) 12ms
stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > actus-saas: em TODO ticket migrado, só o bloco muda
actus-saas: 0 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > comarka-operacional: em TODO ticket migrado, só o bloco muda
comarka-operacional: 3 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > conteudos-infinitos: em TODO ticket migrado, só o bloco muda
conteudos-infinitos: 0 ticket(s) migrados

 ✓ test/orquestrador-migrar-tickets.test.ts (32 tests) 266ms
 ✓ test/orquestrador-gates.test.ts (29 tests) 1285ms
   ✓ critérios do executor — strip de ANSI > saída COLORIDA casa o mesmo critério que a saída limpa 361ms
 ✓ test/orquestrador-liberar-migrar.test.ts (37 tests) 3233ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > o resultado da migração PASSA no leitor do motor: todo token resolve 458ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > libera, sai 0 e o arquivo passa a ter o token 514ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > o token liberado DESTRAVA o ticket que dependia dele 623ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > duplicata: rc 1, RECUSADO, e o arquivo NÃO muda 671ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 4942ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 607ms
   ✓ a CLI é o contrato que `orq validar` repassa > com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>` 804ms
   ✓ a CLI é o contrato que `orq validar` repassa > --relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação 461ms
   ✓ a CLI é o contrato que `orq validar` repassa > --pendentes pega SÓ os pendentes 440ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 884ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 476ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > rc 1 e a linha de violação, chamado PELO symlink 428ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 818ms
 ✓ test/orquestrador-toolchain-tsx.test.ts (30 tests) 4647ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > sem o binário local, cai em `npx --no-install tsx` — nunca em `npx` cru 363ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > tsx_local_ok responde pelo binário DO REPO, e é `test -x` 539ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > COM tsx no lugar, o guard passa e o loop segue para o kill switch 311ms
   ✓ cat.7 · toolchain > `orq prevoo` no fixture continua GO, com a cat.7 na saída 335ms
   ✓ instalar.sh · recusa repo sem tsx > com pnpm-lock.yaml a linha é `pnpm add -D`; com package-lock.json é `npm i -D` 323ms
   ✓ instalar.sh · recusa repo sem tsx > com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx) 740ms
 ✓ test/doutrina-v2.test.ts (30 tests) 12ms
 ✓ test/orquestrador-refatiar.test.ts (39 tests) 6300ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > diff acima do cap: refatiar, contaComoRetry false 538ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > arquivo fora da allowlist (enforcement): refatiar 657ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > zona proibida entra pelo MESMO campo — é a barreira que classifica 435ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > refatiar NÃO gera retry (o plano diz deveTentar=false) 415ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry 827ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar 359ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a trilha registra REFATIAR com motivo= e arquivos= 324ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa 388ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a mesma pendência duas vezes não vira duas linhas 637ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > NEGATIVO: origem planejador NÃO gera decisão pendente (volta ao lote da frente) 302ms
   ✓ o retry recebe o JSON, não o texto livre > o CLI monta o JSON a partir do rundir de verdade 632ms
 ✓ test/orquestrador-trilha.test.ts (22 tests) 3030ms
   ✓ o merge commit carrega o trailer, e o git o devolve > git log --grep acha o merge pelo trailer 475ms
   ✓ o merge commit carrega o trailer, e o git o devolve > NEGATIVO: o trailer é ancorado — 901 não casa 9012 462ms
   ✓ o prompt do executor cobra o trailer no commit do agente > o prompt montado nomeia o trailer e o id 327ms
   ✓ trilha e STATUS contam a primeira tentativa como 1 > a trilha REAL sai 1-based: o juiz na primeira tentativa registra attempt=1 410ms
 ✓ test/orquestrador-lock.test.ts (34 tests) 28ms
 ✓ test/orquestrador-tools-derivadas.test.ts (32 tests) 14ms
 ✓ test/orq-cli.test.ts (42 tests) 6674ms
   ✓ orq validar — o gate de ticket, com o rc repassado > --relatorio sai 0 mesmo com violação (é o modo de olhar, não de barrar) 418ms
   ✓ orq validar — o gate de ticket, com o rc repassado > validar é READ-ONLY: o .md do ticket sai byte a byte igual 415ms
 ✓ test/orquestrador-causas-adiamento.test.ts (32 tests) 7ms
 ✓ test/orquestrador-launchd-config.test.ts (15 tests) 702ms
 ✓ test/orquestrador-piso-tools.test.ts (23 tests) 7ms
 ✓ test/orquestrador-juiz.test.ts (39 tests) 7665ms
   ✓ LIXO é adiado, nunca reprovado > o parse do CLI sai com rc 3 (o código que o executor lê como ADIADO) 557ms
   ✓ LIXO é adiado, nunca reprovado > a fronteira está no decisao.ts: juizIlegivel ADIA e NÃO conta retry 700ms
   ✓ LIXO é adiado, nunca reprovado > NEGATIVO: sem o campo, o mesmo sinal segue aprovando como antes 428ms
   ✓ modelo por classe de risco (custo-e-contexto §7) > o CLI devolve classe + modelo juntos (é o que o shell consome) 419ms
   ✓ ponta a ponta com --stub-juiz > veredito aprovado: JUIZ_APROVADO=true e evidência gravada 818ms
   ✓ ponta a ponta com --stub-juiz > o prompt gravado carrega o critério avaliador e o bloco anti-afrouxamento 760ms
   ✓ ponta a ponta com --stub-juiz > veredito reprovado: motivo e criterios_falhos ficam disponíveis para o retry 775ms
   ✓ ponta a ponta com --stub-juiz > lixo: ILEGIVEL=1, nenhum veredito.json, e o CRU continua lá para auditoria 738ms
   ✓ ponta a ponta com --stub-juiz > a trilha registra o veredito, a classe e o modelo, com attempt 1-based 898ms
   ✓ ponta a ponta com --stub-juiz > o risco sobe pelo objetivo e leva o modelo forte junto 981ms
   ✓ ponta a ponta com --stub-juiz > NEGATIVO: --dry sem --stub-juiz pula o juiz e não inventa veredito 582ms
 ✓ test/orquestrador-agendamento.test.ts (21 tests) 267ms
 ✓ test/orquestrador-envelope.test.ts (25 tests) 2103ms
 ✓ test/orquestrador-gate-baseline.test.ts (21 tests) 38ms
 ✓ test/orquestrador-datar-liberacoes.test.ts (11 tests) 1570ms
   ✓ a migração inteira, ponta a ponta, no repo de verdade > rodar de novo é no-op: já datado, nada muda 358ms
 ✓ test/orquestrador-trilha-gate-papel.test.ts (9 tests) 2730ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > produz EXATAMENTE a linha de hoje para um attempt real (runs-201 attempt-2) 316ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > os dois typecheck do CI viram um papel só, e falha de um é falha do papel 334ms
   ✓ papel declarado no config manda sobre o inferido do nome > um gate chamado `verificacao` com "papel": "testes" entra como testes 302ms
   ✓ papel `lint` só aparece na linha quando o repo tem gate de lint > config sem gate de lint: a linha NÃO ganha campo novo 316ms
   ✓ papel `lint` só aparece na linha quando o repo tem gate de lint > config COM gate de lint: a linha ganha lint=, depois de build= 357ms
 ✓ test/orq-versao-config.test.ts (16 tests) 4190ms
   ✓ orq config > placeholder <...> em qualquer valor: rc 1 e a mensagem NOMEIA a chave 345ms
   ✓ orq config > placeholder DENTRO de lista também é pego 307ms
   ✓ orq config > gate sem papel inferível e sem "papel" declarado: rc 1 e a mensagem diz o nome 306ms
   ✓ orq config > gate sem "nome": rc 1 e diz o índice 364ms
   ✓ orq config > READ-ONLY: nem versao nem config escrevem no repo 333ms
 ✓ test/orquestrador-custo.test.ts (38 tests) 11998ms
   ✓ custo_registrar grava o consumo real da chamada > duas chamadas somam no mesmo dia, uma linha cada 424ms
   ✓ custo_registrar grava o consumo real da chamada > papel e ticket distinguem as chamadas (é o que o orq custo agrega) 617ms
   ✓ orcamento_veredito: ok | dia | ticket > teto por ticket atingido => ticket (e só para ESSE ticket) 309ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue com ledger corrompido: o executor é chamado 1346ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue sem ledger nenhum: o executor é chamado 1601ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > ticket adiado até amanhã não é processável hoje 441ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o executor nunca é chamado 892ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > STATUS.md fica ocioso com MOTIVO orcamento 794ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o ticket fica adiado, sem consumir tentativa, e a trilha registra 788ms
   ✓ teto por TICKET adia só aquele ticket e a fila segue > adia o 901 por orcamento_ticket e passa ao 902 1402ms
 ✓ test/orquestrador-observabilidade.test.ts (38 tests) 6908ms
   ✓ status_set reescreve o snapshot INTEIRO > NUNCA append: 20 transições e o arquivo continua do mesmo tamanho 2034ms
   ✓ status_set reescreve o snapshot INTEIRO > a transição seguinte APAGA o valor anterior (não convive com ele) 305ms
   ✓ status_set reescreve o snapshot INTEIRO > ocioso: TICKET e FASE viram — e MOTIVO explica por que a fila parou 359ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > mudou o status de um ticket, mudou o placar — sem passar fila= nenhum 424ms
   ✓ evento GATE resume a passagem inteira numa linha > tudo verde 319ms
   ✓ evento GATE resume a passagem inteira numa linha > gate que reprovou aparece como falha; os que não rodaram, como nao-rodou 424ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement reprovado carrega fora_do_pathspec com os arquivos 328ms
 ✓ test/orquestrador-adiamento-actus.test.ts (13 tests) 5ms
 ✓ test/orquestrador-sub-repeticao.test.ts (16 tests) 5ms
 ✓ test/orquestrador-push-suprimido.test.ts (14 tests) 12ms
 ✓ test/orquestrador-dois-blocos-json.test.ts (13 tests) 633ms
 ✓ test/orquestrador-pausa-e-prompt.test.ts (17 tests) 5463ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sai 0 (pausa não é falha) 311ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > o log nomeia a pausa e o motivo registrado 307ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sem o arquivo, a drenagem NÃO para por pausa (o guard não é sempre-verdadeiro) 572ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > o ticket em curso termina; o seguinte não começa 822ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > encerra em ocioso com MOTIVO pausado, não em erro 836ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > o prompt cita docs/orquestrador/skill/EXECUTOR.md 319ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > e manda NÃO ler SKILL.md nem references/ 336ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > sem EXECUTOR.md no disco, o prompt sai sem ponteiro nenhum (não inventa) 317ms
 ✓ test/orquestrador-isolamento-teste.test.ts (21 tests) 2542ms
   ✓ o test-*.sh rodando de verdade não deixa marca na trilha real > test-drenagem.sh: fixture recebe os eventos, produção não recebe nada 1811ms
 ✓ test/orquestrador-pacotes.test.ts (6 tests) 1261ms
 ✓ test/kit-e2e-evidencia.test.ts (7 tests) 364ms
 ✓ test/orquestrador-liberacoes.test.ts (11 tests) 1747ms
   ✓ o arquivo REAL do repo resolve as dependências que declara > cada token do arquivo real resolve via liberacao_ok 718ms
 ✓ test/orquestrador-morte-por-sinal.test.ts (11 tests) 2639ms
   ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2193ms
 ✓ test/orquestrador-prefixo-aspas.test.ts (13 tests) 6ms
 ✓ test/orquestrador-disparo-congelado.test.ts (13 tests) 3592ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS congelado E lock com pid VIVO => recupera (a staleness vence) 363ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > a recuperação deixa rastro na trilha e limpa o STATUS 329ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > em-curso NÃO escreve na trilha: não houve o que recuperar 307ms
   ✓ a guarda por processo é POR REPO > o lock de OUTRO repo não é visto: o caminho sai do RUNS_BASE deste 321ms
   ✓ orq mostra MORTO, não executando > com o STATUS congelado, o snapshot diz MORTO e há quanto tempo 392ms
 ✓ test/orquestrador-prompt-como-rodar.test.ts (10 tests) 3ms
 ✓ test/orquestrador-trilha-uma-linha.test.ts (8 tests) 832ms
 ✓ test/orquestrador-liberacoes-formatos.test.ts (28 tests) 9668ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > os 5 tokens do arquivo real resolvem a dependência `humano:<token>` 728ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > TODOS os 47 tokens únicos do arquivo real resolvem 5694ms
   ✓ o que o CI faz diferente: NADA > os 7 resolvem, e NENHUM grava aviso (a forma do CI não é legada) 737ms
 ✓ test/orquestrador-runatload.test.ts (2 tests) 139ms
 ✓ test/orquestrador-reparo-trilha.test.ts (10 tests) 1563ms
 ✓ test/orquestrador-migrar-config.test.ts (47 tests) 17328ms
   ✓ a migração não apaga nada > actus-saas: o arquivo no disco do repo NÃO é tocado 605ms
   ✓ a migração não apaga nada > comarka-operacional: o arquivo no disco do repo NÃO é tocado 821ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > antes da migração, a linha é a de hoje (é a medida de referência) 331ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --dry-run não escreve nem o proposto 487ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --propor grava 000-config.proposto.json e NÃO toca o oficial 479ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --aplicar move o proposto QUE FOI REVISADO, não um recalculado 892ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > o relatório do --dry-run traz o veredito do `orq config` sobre o PROPOSTO 442ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > --dry-run continua não gravando: ele AVISA da recusa e segue relatando 442ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > sem proposto no disco, o --propor grava como sempre (a guarda não é sempre-verdadeira) 449ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > o migrador NÃO conhece o nome da revisão: não lê, não escreve, não apaga 413ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > a CLI distingue RECUSA (rc 1) de erro de uso (rc 2) 568ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > com proposto pré-existente: rc 1, recusa dita, e o arquivo intacto byte a byte 3693ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > o resto da migração roda: a recusa é do config, não do --migrar inteiro 2562ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > sem proposto pré-existente, o --migrar volta a sair 0 e a gravar 2348ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > --dry-run com proposto pré-existente: rc 0, avisa, e não escreve 1989ms
 ✓ test/orquestrador-notificacao.test.ts (25 tests) 18202ms
   ✓ o fallback em arquivo é escrito SEMPRE > sem osascript: só o arquivo, e o log diz por quê 8485ms
   ✓ o fallback em arquivo é escrito SEMPRE > COM osascript: o arquivo é escrito do mesmo jeito 412ms
   ✓ o fallback em arquivo é escrito SEMPRE > osascript que falha não derruba a drenagem e o arquivo continua valendo 368ms
   ✓ o que vai no título e no corpo > título: placar de aprovados e bloqueados 359ms
   ✓ o que vai no título e no corpo > corpo: duração e o ÚLTIMO do snapshot 497ms
   ✓ o que vai no título e no corpo > sem snapshot ainda, o corpo sai com — em vez de quebrar 353ms
   ✓ fila sem processável: avisa uma vez, e só uma > a PRIMEIRA drenagem vazia escreve exatamente uma linha 435ms
   ✓ fila sem processável: avisa uma vez, e só uma > a SEGUNDA drenagem vazia não escreve nada (é o spam do launchd) 941ms
   ✓ fila sem processável: avisa uma vez, e só uma > dez ticks seguidos com a fila vazia continuam valendo uma linha só 2030ms
   ✓ fila sem processável: avisa uma vez, e só uma > processar de novo REARMA o aviso de fila vazia 978ms
   ✓ drenagem que PROCESSOU notifica, com o placar > aprovado: uma linha, placar 1 aprovado 612ms
   ✓ drenagem que PROCESSOU notifica, com o placar > bloqueado: uma linha, placar 1 bloqueado 483ms
   ✓ drenagem que PROCESSOU notifica, com o placar > adiado por orçamento: uma linha, corpo com adiados 1 363ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU conta como processado, ainda que nada tenha sido aprovado 477ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU que já estava na trilha ANTES não conta (a conta é do trecho) 446ms

 Test Files  46 passed (46)
      Tests  1168 passed (1168)
   Start at  15:52:50
   Duration  21.87s (transform 707ms, setup 0ms, collect 11.84s, tests 134.69s, environment 6ms, prepare 2.12s)

rc=0
```

### scripts/kit/test-shell.sh

```
[fixture] tmp: /tmp/orq-fixture-qunBVG
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7b/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-qunBVG/repo
== testes de shell do motor · fixture em /tmp/orq-fixture-qunBVG/repo ==

--- test-lib-config.sh ---
== raízes resolvidas pelo lib.sh ==
  ROOT           = /tmp/orq-fixture-qunBVG/repo
  MAIN_CHECKOUT  = /private/tmp/orq-fixture-qunBVG/repo
  CONFIG         = /private/tmp/orq-fixture-qunBVG/repo/docs/fila/000-config.json
  ok   config encontrado no caminho resolvido

== valores lidos do config REAL ==
  ambiente_id      = orqfixture
  repo_origin      = fixture/orq-fixture
  diff_cap_linhas  = 600
  branch_alvo      = staging-auto
  max_retries      = 2
  ok   ambiente_id bate com o arquivo
  ok   diff_cap = 600 (o NOSSO, não o 2500 do comarka-os)

== causas de adiamento declaradas no config ==
  - erro de conexão
  - sessão expirada
  - rate limit
  - quota estourada
  - timeout de claude_timeout_secs
  - gate interrompido no meio
  - veredito do juiz ilegível
  ok   7 causas declaradas
  ok   a causa do juiz ilegível está declarada

== is_adiavel cobre cada causa ==
  ok   erro de conexão (ECONNREFUSED) -> adia
  ok   erro de conexão (socket hang up) -> adia
  ok   sessão expirada -> adia
  ok   sessão expirada (token) -> adia
  ok   rate limit -> adia
  ok   quota estourada -> adia
  ok   timeout de claude_timeout_secs -> adia
  ok   gate interrompido (SIGINT) -> adia
  ok   gate interrompido (SIGHUP) -> adia
  ok   menção a rate limit com rc=0 -> nao-adia
  ok   menção a sessão expirada com rc=0 -> nao-adia
  ok   erro real de código -> nao-adia

TODOS OS CHECKS PASSARAM

rc(test-lib-config.sh) = 0

--- test-drenagem.sh ---
== config lida ==
  branch_alvo=staging-auto  branch_protegida=main
  ok    alvo != protegida

== merge_em_alvo RECUSA a branch protegida ==
  ok    alvo == protegida => rc=2 (recusado)
  ok    recusa diz o motivo
  (worktree de teste: /private/tmp/orq-fixture-qunBVG/repo, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (eab390dc)

== drenar TRATA o status refatiar (regra 19) ==
  ok    refatiar NÃO vai para o merge
  ok    a drenagem diz que o ticket voltou
  ok    seguiu para o próximo ticket (executor chamado para: 901 902 )
  ok    o placar da drenagem conta os 2 refatiados
  ok    não conta como aprovado nem como bloqueado

TODOS OS CHECKS PASSARAM

rc(test-drenagem.sh) = 0

--- test-retry-worktree.sh ---
== 1 · enforcement PASSOU: a tentativa 2 herda a worktree e o commit ==
  ok    attempt-1 começa COM o diff da anterior (1 linha, src/a.ts na árvore)
  ok    o log diz que reaproveitou (e de qual tentativa)
  ok    o prompt da tentativa 2 manda corrigir o apontado
  ok    o patch da tentativa 2 contém o trabalho herdado
  ok    a trilha registra a reaproveitação
  ok    o RETRY anuncia o modo da worktree

== 2 · enforcement REPROVOU: worktree NOVA (diff fora do escopo não vira base) ==
  ok    attempt-1 nasce LIMPA quando o enforcement reprovou
  ok    não reaproveitou
  ok    o RETRY registra que a worktree é nova

== 3 · diff.patch por tentativa, ANTES de qualquer descarte ==
  ok    grava_diff_patch escreve o patch
  ok    o patch tem o conteúdo, não só o nome do arquivo
  ok    diff vazio => patch vazio, mas presente
  ok    run_attempt grava o patch antes do enforcement

== 4 · sondagem com rc!=0 grava o stderr REAL, não um palpite ==
  ok    a mensagem traz a saída REAL do CLI
  ok    não chuta mais a causa
  ok    diz o rc observado
  ok    gravou a evidência em runs/ (probe-falha-20260921T185320Z.txt)
  ok    o arquivo tem a saída crua
  ok    o log aponta o arquivo antes de morrer

== 5 · REQUEUE: rodada nova com attempt-0..2 antigos no disco ==
  ok    attempt-0 da rodada antiga NÃO foi sobrescrito
  ok    attempt-1 e attempt-2 antigos preservados
  ok    a rodada nova escreveu em attempt-3
  ok    attempt-3 tem o prompt DE HOJE, não o antigo
  ok    o log anuncia o slot inicial
  ok    o retry da rodada foi para attempt-4 (numeração contínua)
  ok    meta.json amarra o contador de retry ao diretório (campo dir)
  ok    tentativa 1 da rodada nasce limpa, apesar dos runs/ antigos

== 6 · COMMIT DO HARNESS: agente que sai sem commitar não perde trabalho ==
  ok    o harness commitou pelo agente
  ok    a worktree ficou limpa (nada solto para ser descartado)
  ok    mensagem exata do commit
  ok    trailer Orq-Ticket presente
  ok    o diff passou a enxergar o trabalho (2 linhas)
  ok    o arquivo fora do escopo foi commitado junto (o enforcement o julga)
  ok    árvore limpa não gera commit vazio
  ok    commit_do_agente roda antes de medir o diff

== 7 · o juiz é avisado de que o commit foi do harness ==
  ok    a nota entra no prompt do juiz
  ok    sem nota, o prompt sai como antes

TODOS OS CHECKS PASSARAM

rc(test-retry-worktree.sh) = 0

--- test-drenagem-sem-progresso.sh ---
== fila: 901 e 902 abortam antes do agente, 903 é saudável (N=3) ==
  | [2026-09-21 15:53:24-0300] ticket 901 (3 processáveis)
  | [orq ERRO] recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-09-21 15:53:24-0300]   ticket 901 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-09-21 15:53:24-0300] ticket 902 (3 processáveis)
  | [2026-09-21 15:53:24-0300]   ticket 902 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: fatal: branch 'frente/902' está em uso por outra worktree
  | [2026-09-21 15:53:24-0300] ticket 903 (3 processáveis)
  | [2026-09-21 15:53:25-0300] nenhum processável não tentado — encerrando (aprovados: 1; sem progresso: 901 902)
  | [2026-09-21 15:53:25-0300] drenagem encerrada: 1 aprovado(s) e mergeado(s)
  | [2026-09-21 15:53:25-0300] ocioso: 901 sem progresso · 902 sem progresso
  ok    executor chamado 3x numa drenagem: 901 902 903 
  ok    terminou em <= N=3 chamadas (sem loop)
  ok    cada ticket tentado UMA vez, na ordem da fila
  ok    o executor recebe --ticket (não reescolhe)
  ok    o saudável (903) foi processado: done
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-09-21T15:53:25-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 sem_progresso=2 dur=0min
  ok    DRENAGEM_FIM conta o aprovado
  ok    DRENAGEM_FIM conta os 2 sem progresso em contador próprio
  STATUS motivo: sem progresso em 901 902: 901 sem progresso · 902 sem progresso
  ok    motivo_ocioso lista TODOS os pulados (901 e 902)

TODOS OS CHECKS PASSARAM

rc(test-drenagem-sem-progresso.sh) = 0

--- test-sem-progresso-limite.sh ---
== 1. ticket 901 sempre aborta: 1, 2, 3 -> bloqueado ==
  --- disparo 1 (aborta): chamadas [901 ] 901=1
  ok    disparo 1: contador 1
  --- disparo 2 (aborta): chamadas [901 ] 901=2
  ok    disparo 2: contador 2 (persistiu entre disparos)
  ok    abaixo do limite, segue pendente
  --- disparo 3 (aborta): chamadas [901 ] 901=
  ok    disparo 3: 901 bloqueado no limite
  nota: sem_progresso: 3 disparos sem progresso entre 2026-09-21 15:53:25-0300 e 2026-09-21 15:53:26-0300; última causa: executor morreu (rc=128, fase=worktree): fatal: '/tmp/_worktrees/fx-901' already exists
  ok    nota cita a última causa pelo DESFECHO do executor (EXECUTOR_MORREU + linha fatal), não pela linha FAIL
  ok    trilha: 901 BLOQUEADO motivo=sem_progresso
  ok    o bloqueio foi COMMITADO (árvore limpa no ticket)
  ok    commit: fila: 901 bloqueado (sem_progresso, 3 disparos)
  ok    o status bloqueado está no commit, não só no disco
  ok    contador zerado ao mudar de status
  --- disparo 4 (aborta): chamadas [] 901=
  ok    disparo 4: bloqueado não é mais escolhido

== 2. adiamento não conta ==
  --- disparo 5 (aborta): chamadas [902 ] 901=
  ok    902 aborta: contador 1
  --- disparo 6 (adia-cooldown): chamadas [902 ] 901=
  ok    adiado com cooldown (mark_adiado): não conta
  ok    (o mark_adiado armou cooldown, como no motor)
  --- disparo 7 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    adiado SEM cooldown (evento ADIADO): não conta
  --- disparo 8 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    segundo adiamento sem cooldown também não conta
  ok    adiado sem cooldown não é reescolhido na mesma drenagem
  --- disparo 9 (aborta): chamadas [902 ] 901=
  ok    abort depois dos adiamentos volta a contar (2)

== 3. staging que avança na vez do ticket zera ==
  --- disparo 10 (aborta): chamadas [902 902 ] 901=
  ok    staging avançou: zerou e recomeçou em 1
  ok    902 não bloqueou
  ok    com staging andando, a drenagem voltou ao ticket (progresso)

== 4. o limite vem do config ==
  --- disparo 11 (aborta): chamadas [903 ] 901=
  ok    sem_progresso_limite=1 no config: bloqueia no 1º disparo
  ok    nota com o limite do config
  ok    valor inválido no config cai no padrão 3
  ok    chave ausente: padrão 3

TODOS OS CHECKS PASSARAM

rc(test-sem-progresso-limite.sh) = 0

--- test-ocioso.sh ---
== 1. 244 atrás de 241b bloqueado, 232 atrás de 231 pendente (sem liberação) ==
  ok    nenhum executor chamado (nada processável)
  trilha: 2026-09-21T15:53:31-0300 --- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
  ok    evento OCIOSO pendentes=3
  ok    244: dependência 241b em bloqueado
  ok    232: dependência 231 em pendente
  ok    231: liberação humano:migration-0031 ausente
  ok    UM evento por drenagem
  ok    trilha continua uma linha por evento (nenhuma linha sem timestamp)
  ok    OCIOSO vem antes do DRENAGEM_FIM
  STATUS.md:
    ORQUESTRADOR · 2026-09-21 15:53:31
    ESTADO   ocioso
    TICKET   —
    DESDE    —
    FASE     —
    FILA     3 pendente · 1 bloqueado · 1 done
    STAGING  2099568 · push suprimido (publicar é humano neste repo)
    ÚLTIMO   —
    MOTIVO   sem ticket processável: 231 sem liberação humano:migration-0031 · 232 espera 231 (pendente) · 244 espera 241b (bloqueado)
  ok    STATUS mantém o motivo de sempre
  ok    STATUS: 244 espera 241b (bloqueado)
  ok    STATUS: 232 espera 231 (pendente)
  ok    STATUS: 231 sem liberação
  ok    DRENAGEM_FIM sem campo novo

== 2. pendente pulado por sem-progresso nesta drenagem ==
  trilha: 2026-09-21T15:53:32-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=sem_progresso
  ok    250 foi tentado uma vez
  ok    250: pulado por sem-progresso
  ok    STATUS: 250 sem progresso

== 3. cooldown ativo: o liberado espera o cooldown ==
  trilha: 2026-09-21T15:53:32-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=cooldown:16:23
  ok    250: cooldown até 16:23
  ok    a razão de dependência vence o cooldown
  ok    STATUS: 250 em cooldown até 16:23

== 4. fins que NÃO gravam OCIOSO ==
  ok    pausa: sem OCIOSO (quem pausou já sabe)
  ok    sem pendente nenhum: sem OCIOSO

TODOS OS CHECKS PASSARAM

rc(test-ocioso.sh) = 0

--- test-rc-executor.sh ---
== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) ==
  ok    pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)

== o rc do executor atravessa o tee ==
  --- A: executor sai 3, tee sai 0 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 15:53:33-0300 e 2026-09-21 15:53:33-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    A: o log vê rc=3
  ok    A: a causa do bloqueio carrega rc=3
  --- B: executor sai 0, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 15:53:34-0300 e 2026-09-21 15:53:34-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    B: o log vê rc=0
  ok    B: a causa do bloqueio carrega rc=0
  --- C: executor sai 0, tee sai 5 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 15:53:34-0300 e 2026-09-21 15:53:34-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    C: o log vê rc=0
  ok    C: a causa do bloqueio carrega rc=0
  --- D: executor sai 3, tee sai 5 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 15:53:35-0300 e 2026-09-21 15:53:35-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    D: o log vê rc=3
  ok    D: a causa do bloqueio carrega rc=3

TODOS OS CHECKS PASSARAM

rc(test-rc-executor.sh) = 0

--- test-ambiente.sh ---
== 1. preflight recusa TODO ticket, 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  ok    0 bloqueados depois de 3 disparos
  ok    contadores zerados (nenhum .sem-progresso)
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas ao executor por disparo (máx: 2)
  trilha: 2026-09-21T15:53:37-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada (sem id, sha, número, caminho)
  ok    DRENAGEM_FIM: bloqueados=0 sem_progresso=0
  STATUS: MOTIVO   ambiente: executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa
  ok    motivo_ocioso=ambiente

== 2. causas próprias em tickets diferentes NÃO são ambiente ==
  --- disparo 4 (proprio): chamadas [904 905 ] 901=done/ 902=done/ 903=done/
  ok    904 e 905 somam 1 cada
  ok    nenhum AMBIENTE

== 3. um ticket sozinho travado continua bloqueando no 3º disparo ==
  --- disparo 5 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  --- disparo 6 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  ok    904 bloqueado no 3º disparo
  ok    trilha: 904 BLOQUEADO motivo=sem_progresso
  ok    bloqueio commitado
  ok    nenhum AMBIENTE no caso isolado

TODOS OS CHECKS PASSARAM

rc(test-ambiente.sh) = 0

--- test-causa-adiamento.sh ---
== A. timeout local (rc 124 do watchdog): adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=timeout
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  ok    evento diz cooldown=nao
  ok    nota registra timeout
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=timeout attempt=1 rc=124 dur=2s cooldown=nao

== B. 429: adia COM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=rate_limit
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown ARMADO (limite remoto)
  ok    evento diz cooldown=sim
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=rate_limit attempt=1 rc=1 dur=1s cooldown=sim

== C. 503 / overloaded: adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=servidor
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=1 rc=1 dur=0s cooldown=nao

== D. gate de testes que não rodou (sem placar): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=0s cooldown=nao

== E. tsc ausente (rc 127, command not found): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=0s cooldown=nao

== F. tsc que rodou e apontou erro de código: mérito, não adia ==
  ok    REPROVADO (mérito)
  ok    não adiou
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_typecheck attempt=1 diff=1
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=1

== G. recusa de preflight (árvore de execução suja): ADIADO motivo=preflight ==
  ok    executor sai 0
  ok    trilha: ADIADO motivo=preflight com a causa
  ok    nenhuma linha EXECUTOR_MORREU
  ok    um evento, uma linha
  ok    ticket segue pendente
  ok    cooldown NÃO armado
  | 901 ADIADO motivo=preflight causa=preflight: árvore de execução suja em /private/var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.dtY1FqvhZo/repo — commite ou stashe antes:\n?? lixo.txt

TODOS OS CHECKS PASSARAM

rc(test-causa-adiamento.sh) = 0

--- test-ambiente-adiado.sh ---
== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas por disparo (máx: 2)
  trilha: 2026-09-21T15:53:58-0300 --- AMBIENTE tickets=901,902 causa=ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada, com o motivo preflight
  ok    0 bloqueados
  STATUS: MOTIVO   ambiente: ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa

== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE ==
  --- disparo 4 (sessao): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    um AMBIENTE
  ok    parou na 2ª chamada
  ok    causa: ADIADO motivo=sessao

== 3. adiamentos com causas DIFERENTES não são ambiente ==
  --- disparo 5 (proprio): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  ok    nenhum AMBIENTE
  ok    a drenagem seguiu pelos três

TODOS OS CHECKS PASSARAM

rc(test-ambiente-adiado.sh) = 0

--- test-adiamentos-limite.sh ---
== A. executor real: rc 124 em 0 s com timeout de 30 s não é timeout ==
  trilha: 901 ADIADO motivo=gate_interrompido attempt=1 rc=124 dur=1s cooldown=nao
  ok    ADIADO, e não com motivo=timeout
  ok    a trilha traz a medida (rc=124, duração real)
  nota: adiado (executor) por infraestrutura: gate_interrompido (rc=124 em 1s, abaixo do limite de 30s: morto por fora) em 2026-09-21T18:54:02Z — retomará no próximo disparo
  ok    a nota traz rc=124 e não diz timeout

== B. sempre adiado: bloqueia no 4º disparo com a causa real ==
  --- disparo 1 (adia): 901=pendente/1
  --- disparo 2 (adia): 901=pendente/2
  --- disparo 3 (adia): 901=pendente/3
  ok    contador em 3 depois de 3 disparos
  ok    abaixo do limite, segue pendente
  --- disparo 4 (adia): 901=bloqueado/
  ok    bloqueado no 4º disparo
  nota: adiado 4 vezes: gate_interrompido (rc=124, 9s de execução)
  ok    nota começa por 'adiado 4 vezes: '
  ok    a causa é a medida: motivo, rc=124 e 9s
  ok    trilha: BLOQUEADO motivo=adiamentos n=4 limite=4
  ok    bloqueio commitado
  ok    commit do bloqueio
  ok    contador zerado ao bloquear

== C. adiado que depois aprova zera o contador ==
  --- disparo 5 (adia): 901=pendente/1
  --- disparo 6 (adia): 901=pendente/2
  ok    2 adiamentos contados
  --- disparo 7 (aprova): 901=done/
  ok    aprovado e mergeado
  ok    contador zerado pela aprovação
  --- disparo 8 (adia): 901=pendente/1
  ok    recomeça em 1, não em 3

== D. adiamento COM cooldown não conta nem zera ==
  --- disparo 9 (limite): 901=pendente/1
  ok    contador segue 1

== E. o limite vem do config ==
  --- disparo 10 (adia): 901=bloqueado/
  ok    com limite 2, bloqueia no 2º
  ok    trilha diz n=2 limite=2
  ok    limite inválido ("x") vira 4
  ok    limite inválido (0) vira 4
  ok    limite inválido (-3) vira 4
  ok    limite inválido ("quatro") vira 4
  ok    limite ausente vira 4

== F. AMBIENTE desfaz o que somou na drenagem ==
  --- disparo 11 (adia): 901=pendente/1
  ok    901 em 1 (antes do ambiente)
  --- disparo 12 (mesmo): 901=pendente/1
  ok    um AMBIENTE
  ok    901 volta a 1 e 902 não soma

TODOS OS CHECKS PASSARAM

rc(test-adiamentos-limite.sh) = 0

--- test-reprovado-sub.sh ---
== A. critério vermelho, com permissão negada: mérito, mesmo modelo ==
  ok    a permissão negada foi registrada
  ok    REPROVADO sub=criterio
  ok    RETRY com o mesmo modelo (sonnet), sub=criterio
  ok    nenhuma chamada em opus
  ok    não adiou (permissão negada não é ambiente)
  | 901 INICIO attempt=1 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=4dcf92a3
  | 901 INICIO attempt=2 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== B. juiz reprovando: escala ==
  ok    REPROVADO sub=juiz
  ok    RETRY model=opus, sub=juiz
  ok    a 2ª chamada do agente foi em opus
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=baixo modelo=sonnet attempt=1
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade sub=juiz worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=26316bd4
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=alto modelo=opus attempt=2
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo ==
  ok    REPROVADO sub=gate_testes
  ok    RETRY com o mesmo modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=gate_testes worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=50859bb3
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora ==
  ok    trilha fixture do 461 no lugar
  ok    a reprovação desta execução: sub=criterio diff=717
  ok    BLOQUEADO motivo=repeticao
  ok    ticket bloqueado
  ok    nenhum RETRY
  ok    uma chamada paga só
  nota: repetição: 2ª reprovação igual à anterior (sub=criterio, diff=717), sem 3ª volta. critério(s) reprovado(s): o arquivo existe
  ok    a nota diz repetição e o diff
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
  | 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717
  | 461 BLOQUEADO motivo=repeticao sub=criterio diff=717 attempt=1

== E. max_retries vale no total, não por drenagem ==
  --- 1ª execução: tentativas=1 status=pendente
  ok    1ª execução: reprovou, adiou, segue pendente
  ok    1 tentativa consumida, persistida no ticket (o adiado devolveu a sua)
  --- 2ª execução: tentativas=3 status=bloqueado
  ok    3 reprovações no total (max_retries 2 + 1)
  ok    a 2ª execução começa em attempt=2
  ok    BLOQUEADO na attempt=3
  ok    nenhuma 4ª tentativa
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=7cf8acbf
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 RETRY attempt=3 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-2 base=7cf8acbf
  | 901 INICIO attempt=3 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=3 diff=7
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

TODOS OS CHECKS PASSARAM

rc(test-reprovado-sub.sh) = 0

--- test-notificacao-ambiente.sh ---
== 1. três disparos em AMBIENTE: um aviso ==
  --- disparo 1 (preflight): avisos=1
  --- disparo 2 (preflight): avisos=1
  --- disparo 3 (preflight): avisos=1
  ok    3 drenagens em AMBIENTE
  ok    1 aviso em 3 disparos
  ok    o aviso fala de ambiente
  | 2026-09-21T15:54:30-0300 | Orquestrador: AMBIENTE, a fila parou | a mesma causa em dois tickets não é do ticket: ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>). Nada somou nem bloqueou; avisa de novo quando sair.

== 2. o 4º disparo, saudável: um aviso de saída ==
  --- disparo 4 (aprova): avisos=2
  ok    exatamente 1 aviso novo
  ok    é o aviso de SAÍDA do ambiente
  ok    com o placar da drenagem (3 aprovados)
  | 2026-09-21T15:54:33-0300 | Orquestrador: ambiente normalizado, 3 aprovados, 0 bloqueados | saiu de AMBIENTE (ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>)) · duração 0min · adiados 0

== 3. o 5º disparo, saudável e sem nada: sem aviso de saída de novo ==
  --- disparo 5 (aprova): avisos=3
  ok    nenhum aviso de ambiente repetido

TODOS OS CHECKS PASSARAM

rc(test-notificacao-ambiente.sh) = 0

--- test-reabertura-humana.sh ---
== 1. a contagem de tentativas é commitada: docs/fila limpo depois de REPROVADO e RETRY ==
  ok    houve REPROVADO e RETRY
  | == chamada 1
  | == chamada 2
  | == chamada 3
  ok    docs/fila limpo no checkout principal em TODA chamada (inclusive depois de REPROVADO+RETRY)
  ok    docs/fila limpo no fim
  | fila: 901 bloqueado
  | fila: 901 tentativa 3
  | fila: 901 tentativa 2
  | fila: 901 tentativa 1
  | fixture: fila inicial
  ok    commit 'fila: 901 tentativa 2' no log
  ok    bloqueado por max_retries com tentativas=3

== 2. devolução humana: bloqueado -> pendente num commit humano zera tudo ==
  ok    antes da drenagem: pendente, tentativas=3, .sem-progresso=2, .adiamentos=3
  | --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
  | 901 RECUPERADO motivo=reaberto de=bloqueado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=8
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-3 base=de666ff0
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | --- OCIOSO pendentes=1 901=adiado
  | --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=1 refatiar=0 sem_progresso=0 dur=0min
  ok    a drenagem executou o ticket a partir de attempt=1
  ok    não bloqueou na hora
  ok    com retry disponível (RETRY attempt=2)
  ok    segue pendente (a 2ª tentativa adiou)
  ok    tentativas=1 (zerada e somada uma reprovação)
  ok    .sem-progresso zerado
  ok    .adiamentos recomeçou em 1 (era 3; sem zerar seria 4 e bloquearia)
  ok    trilha: RECUPERADO motivo=reaberto de=bloqueado
  ok    docs/fila limpo depois da drenagem (o zero também foi commitado)

== 3. a devolução zera UMA vez: a drenagem seguinte continua de onde parou ==
  ok    recomeça em attempt=2 (não zera de novo)
  ok    nenhum RECUPERADO novo

TODOS OS CHECKS PASSARAM

rc(test-reabertura-humana.sh) = 0

== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
  rc=0  test-drenagem-sem-progresso.sh
  rc=0  test-sem-progresso-limite.sh
  rc=0  test-ocioso.sh
  rc=0  test-rc-executor.sh
  rc=0  test-ambiente.sh
  rc=0  test-causa-adiamento.sh
  rc=0  test-ambiente-adiado.sh
  rc=0  test-adiamentos-limite.sh
  rc=0  test-reprovado-sub.sh
  rc=0  test-notificacao-ambiente.sh
  rc=0  test-reabertura-humana.sh
TODOS OS SCRIPTS SAÍRAM rc 0
rc=0
```

### scripts/kit/test-instalar.sh

```
[fixture] tmp: /tmp/orq-fixture-JqnDlz
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7b/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-JqnDlz/repo
== (a) fixture recém-instanciado ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-fixture-JqnDlz/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    diz 'idêntico ao kit <VERSAO>'

== (b) cópia do fixture com UM byte a mais em lib.sh ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-5CAQCb/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    exatamente 1 diferença, não uma cascata

== (d) cópia do fixture com UM byte a mais em scripts/roadmap/lint-mapa.py ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-k4ey4W/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/roadmap/lint-mapa.py
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/roadmap/lint-mapa.py'
  ok    exatamente 1 diferença, não uma cascata

== (e) --atualizar: dry-run, recusa sem pausa, e o conserto ==
-- (e1) --dry-run lista 'diferente' e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-izJjpb/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  | 
  | O --atualizar de verdade RECUSARIA, por:
  |   · o loop de '/private/tmp/orq-verificar-izJjpb/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  |   (a recusa não impede este dry-run de listar tudo)
  ok    rc 0
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    o lib.sh do repo NÃO foi tocado pelo --dry-run
-- (e2) --atualizar sem pausa: recusa com rc 1 --
  | RECUSADO: o loop de '/private/tmp/orq-verificar-izJjpb/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  ok    rc 1
  ok    a recusa diz que o loop não está pausado
  ok    o repo continua intacto depois da recusa
-- (e2b) com PAUSAR, mas com modificação não commitada no motor: recusa --
  | ?? scripts/orquestrador/nao-commitado.txt
  | RECUSADO: '/private/tmp/orq-verificar-izJjpb/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA o caminho
  ok    o repo continua intacto depois da recusa 3
-- (e3) --atualizar com PAUSAR e motor limpo: atualiza e fica idêntico --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-izJjpb/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-izJjpb/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-izJjpb/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
  ok    o lib.sh do repo é o do kit
  ok    docs/orquestrador/skill/VERSAO carimbado
  ok    imprime a linha de commit com pathspec explícito
  ok    docs/fila/** intacta
  ok    o PAUSAR do repo continua lá (o kit não retoma o loop por conta própria)

== (f) arquivo só do repo sobrevive ao --atualizar e aparece como 'só no repo' ==
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-Xg9P6o/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-Xg9P6o/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | só no repo  scripts/orquestrador/so-do-repo.py
  | 
  | 1 diferença(s)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-Xg9P6o/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 1 (há 'só no repo' — o verificador do fim conta como diferença)
  ok    so-do-repo.py SOBREVIVEU
  ok    listado como 'só no repo'

== (g) --atualizar recusa com scripts/roadmap/ sujo, e --forcar passa ==
  |  M scripts/roadmap/lint-mapa.py
  | RECUSADO: '/private/tmp/orq-verificar-Sd8djU/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA scripts/roadmap/lint-mapa.py
  ok    o lint-mapa.py do repo continua intacto depois da recusa
-- (g2) com --forcar: passa, avisa, e o lint-mapa.py vira o do kit --
  |  M scripts/roadmap/lint-mapa.py
  | --forcar: passando por cima de 1 caminho(s) modificado(s) no motor do repo.
  | 
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-Sd8djU/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-Sd8djU/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-Sd8djU/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    avisa que passou por cima
  ok    o lint-mapa.py do repo é o do kit

== (h) --verificar/--atualizar cobrem os testes do harness ==
-- (h1) --verificar acusa o teste envelhecido --
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-8fCjmQ/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   test/orquestrador-pacotes.test.ts
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente test/orquestrador-pacotes.test.ts'
  ok    não cita test/produto.test.ts (teste do produto não é motor)
-- (h2) --atualizar corrige, e o teste do produto sobrevive --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-8fCjmQ/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-8fCjmQ/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-8fCjmQ/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    test/orquestrador-pacotes.test.ts do repo é o do kit
  ok    test/produto.test.ts intacto
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
-- (h3) a suíte do REPO passa com os testes que o kit instalou --
  |    ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2125ms
  | 
  |  Test Files  8 passed (8)
  |       Tests  62 passed (62)
  |    Start at  15:54:47
  |    Duration  3.64s (transform 117ms, setup 0ms, collect 3.77s, tests 4.61s, environment 1ms, prepare 280ms)
  ok    npx vitest run no repo: rc 0

== (i) --atualizar --migrar: .orq-pause -> PAUSAR, liberações -> v2 ==
-- (i1) --migrar --dry-run: mostra tudo e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-verificar-Q8bRP5/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | === MIGRAR docs/fila/** (--dry-run: NADA é escrito) ===
  | 
  | --- pausa: docs/fila/.orq-pause -> docs/fila/PAUSAR ---
  | motivo preservado: 2026-09-05 09:12 | pausado para aplicar migration 0255
  | (--dry-run: nada foi renomeado)
  | 
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-Q8bRP5/repo/docs/fila/liberacoes.json)
  |            --dry-run: NADA é escrito
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | --- /private/tmp/orq-verificar-Q8bRP5/repo/docs/fila/liberacoes.json (atual)
  | +++ /private/tmp/orq-verificar-Q8bRP5/repo/docs/fila/liberacoes.json (v2 proposto)
  | @@ -1,9 +1,35 @@
  |  {
  | +  "$schema_versao": 2,
  |    "tokens": [
  | -    "migration-0255-aplicada",
  | -    "migration-0259-aplicada",
  | -    "migration-0260-aplicada",
  | -    "migration-0261-aplicada",
  | -    "migration-0262-aplicada"
  | +    {
  | +      "token": "humano:migration-0255-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0259-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0260-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0261-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0262-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    }
  |    ]
  |  }
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-Q8bRP5/repo/docs/fila)
  |            --dry-run: NADA é escrito
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-Q8bRP5/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-Q8bRP5/repo/docs/fila/000-config.json
  |                --dry-run: NADA é escrito
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | 
  | --- /private/tmp/orq-verificar-Q8bRP5/repo/docs/fila/000-config.json (oficial, INTOCADO)
  | +++ /private/tmp/orq-verificar-Q8bRP5/repo/docs/fila/000-config.proposto.json (proposto)
  | @@ -2,17 +2,14 @@
  |    "$schema_versao": 2,
  |    "descricao": "Config do repo de FIXTURE do kit. Mínimo por construção: só as chaves que o motor LÊ hoje, levantadas por grep no disco (grep -ohE \"cfg '[^']*'\" scripts/orquestrador/*.sh, mais os acessos diretos dos .ts). Cada chave traz um comentário _<chave> com a procedência do valor.",
  |    "_procedencia_geral": "Valores de forma vêm de doutrina/templates/config.json; valores de conteúdo, de _referencia-ci/000-config.ci.json (o config REAL do conteudos-infinitos @711ab5e) quando um teste do motor cobra o número exato; o resto é do fixture.",
  | -
  |    "branch_alvo": "staging-auto",
  |    "_branch_alvo": "doutrina/templates/config.json:branch_alvo — lido por lib.sh:53 (CFG_BRANCH_ALVO).",
  |    "branch_protegida": "main",
  |    "_branch_protegida": "local-loop.sh:28 lê '.branch_protegida' (o template chama de branch_principal; o motor lê ESTE nome).",
  | -
  |    "max_retries": 2,
  |    "_max_retries": "_referencia-ci/000-config.ci.json:max_retries — lido por lib.sh:54 e decisao.ts:273.",
  |    "cooldown_minutes": 60,
  |    "_cooldown_minutes": "_referencia-ci/000-config.ci.json:cooldown_minutes — lido por lib.sh (cooldown_arm).",
  | -
  |    "politica_adiamento": {
  |      "regra": "Falha de INFRAESTRUTURA adia. Nunca reprova.",
  |      "causas_que_adiam": [
  | @@ -31,7 +28,6 @@
  |      }
  |    },
  |    "_politica_adiamento": "As 7 causas, na ordem, de _referencia-ci/000-config.ci.json — test-lib-config.sh:58 cobra exatamente 7 e :61 cobra a do juiz pelo nome; decisao.ts:113 itera a lista.",
  | -
  |    "politica_retry": {
  |      "por_causa": {
  |        "diff_cap": {
  | @@ -50,17 +46,14 @@
  |      "proibicao": "NUNCA escalar modelo por falha de tamanho (diff_cap) nem por violação de fronteira (enforcement)."
  |    },
  |    "_politica_retry": "_referencia-ci/000-config.ci.json:politica_retry, sem os campos _porque — decisao.ts:277 indexa por_causa[causa] e rejeita config que mande escalar por diff_cap/enforcement.",
  | -
  |    "migrations_dir": "db/migrations",
  |    "_migrations_dir": "enforcement-core.ts:128 usa para classificar .sql como artefato inerte. O fixture não tem banco; o diretório existe só para a chave não ser nula.",
  |    "sql_pendente_dir": "docs/sql-pendente",
  |    "_sql_pendente_dir": "enforcement-core.ts:128, mesmo par que migrations_dir.",
  | -
  |    "worktrees_dir": "../_worktrees",
  |    "_worktrees_dir": "RELATIVO ao checkout principal (lib.sh:77). Como o fixture é instanciado em <tmp>/repo, isto resolve para <tmp>/_worktrees — nunca ~/Projetos/_worktrees.",
  |    "worktrees_prefixo": "fx-",
  |    "_worktrees_prefixo": "decisao.ts:363. 'fx-' em vez do 'ci-' do conteudos-infinitos: prefixo diferente é o que impede colisão de nome de worktree entre repos.",
  | -
  |    "runs_dir": "docs/fila/runs",
  |    "_runs_dir": "doutrina/templates/config.json:runs_dir — lib.sh:72 (RUNS_BASE).",
  |    "liberacoes_file": "docs/fila/liberacoes.json",
  | @@ -69,7 +62,6 @@
  |    "_decisoes_file": "doutrina/templates/config.json — lib.sh:723.",
  |    "pausar_file": "docs/fila/PAUSAR",
  |    "_pausar_file": "doutrina/templates/config.json — lib.sh:615 (kill switch em arquivo).",
  | -
  |    "modelos": {
  |      "classificador": "haiku",
  |      "executor": "sonnet",
  | @@ -83,7 +75,6 @@
  |    "avaliador_model": "opus",
  |    "retry_final_model": "opus",
  |    "_modelos": "Escada de _referencia-ci/000-config.ci.json (sonnet/opus/opus). juiz.ts:76 lê modelos.juiz_alto/juiz_baixo; executor.sh:149 e decisao.ts:292 leem os três aliases v1.",
  | -
  |    "restricao_execucao": {
  |      "ativa": false,
  |      "tickets_permitidos": [],
  | @@ -92,31 +83,26 @@
  |      "desbloqueio": "preencha executor_model/avaliador_model/retry_final_model em docs/fila/000-config.json"
  |    },
  |    "_restricao_execucao": "decisao.ts:71 lê o objeto inteiro; executor.sh:154 lê .desbloqueio na mensagem de aborto. Inativa aqui: nenhum papel é PENDENTE_*.",
  | -
  |    "diff_cap_linhas": 600,
  |    "_diff_cap_linhas": "600 de _referencia-ci/000-config.ci.json — test-lib-config.sh:50 cobra literalmente 600 ('o NOSSO, não o 2500 do comarka-os').",
  |    "claude_timeout_secs": 900,
  |    "_claude_timeout_secs": "Metade do 1800 do CI: o ticket do fixture é de ~40 linhas e um timeout longo só atrasa o diagnóstico quando o agente trava.",
  |    "claude_max_turns": 40,
  |    "_claude_max_turns": "doutrina/templates/config.json:claude_max_turns (o CI usa 80; 40 basta para um ticket de dois arquivos).",
  | -
  |    "preflight_probe": true,
  |    "_preflight_probe": "LIGADO, e não por gosto: executor.sh:146 sai cedo quando o valor é `false`, e test-retry-worktree.sh:216 exercita `probe_modelos` inteiro (com `claude_run` stubado, sem chamada paga) contra ESTE config — com `false` a seção 4 daquele teste cai em 5 falhas. O preço é uma sondagem real de ~60s ('responda apenas: ok') por drenagem de verdade, que o gate de orçamento mede e o custo.json registra.",
  |    "preflight_env_keys": [],
  |    "_preflight_env_keys": "Vazio: executor.sh:123 itera esta lista e aborta por env faltando. O fixture não tem serviço externo nenhum.",
  | -
  |    "commit_checkpoint": {
  |      "obrigatorio": true,
  |      "quando": "a cada unidade lógica que passe typecheck + teste — não só no fim do ticket",
  |      "_regra": "Passou typecheck e teste? Commita. Trabalho verificado e não commitado não existe."
  |    },
  |    "_commit_checkpoint": "executor.sh lê .commit_checkpoint.quando e ._regra para montar o prompt; texto de _referencia-ci/000-config.ci.json.",
  | -
  |    "repo_origin_deve_conter": "fixture/orq-fixture",
  |    "_repo_origin_deve_conter": "Casa o origin FALSO que o scripts/kit/fixture.sh registra (git@example.invalid:fixture/orq-fixture.git). executor.sh:104-108 aborta o run inteiro se o origin não contiver isto.",
  |    "ambiente_id": "orqfixture",
  |    "_ambiente_id": "executor.sh:111-114 compara com o ref extraído de SUPABASE_URL do .env.local, que o fixture.sh escreve como https://orqfixture.supabase.co. test-lib-config.sh:48 cobra que não seja vazio nem null.",
  | -
  |    "zona_proibida": {
  |      "descricao": "Tudo que o loop NUNCA escreve. Globs relativos à raiz do repo.",
  |      "revisado_humano": true,
  | @@ -138,7 +124,6 @@
  |      "no_write_tables": "TODAS"
  |    },
  |    "_zona_proibida": "Recorte do de _referencia-ci/000-config.ci.json: enforcement-core.ts:211-215 lê no_write_paths + no_write_credenciais.padroes, e :212 trata no_write_tables == 'TODAS' como negação total. Sem banco no fixture, 'TODAS' é a leitura honesta.",
  | -
  |    "paths_harness": [
  |      "scripts/orquestrador/**",
  |      "docs/orquestrador/**",
  | @@ -146,7 +131,6 @@
  |      ".claude/**"
  |    ],
  |    "_paths_harness": "doutrina/templates/config.json:paths_harness, sem mudança — o motor vendorizado mora nos mesmos caminhos aqui. Lido pelo check 5 de scripts/roadmap/lint-mapa.py.",
  | -
  |    "_execucao_dos_gates": {
  |      "ordem_obrigatoria": [
  |        "typecheck",
  | @@ -155,7 +139,6 @@
  |      "interrupcao": "NAO_VALE_PARCIALMENTE"
  |    },
  |    "_ordem": "gates.ts:176-178 ordena .gates[] por esta lista e ERRA se divergir. Dois gates porque o package.json do fixture tem dois scripts: typecheck e test.",
  | -
  |    "gates": [
  |      {
  |        "nome": "typecheck",
  | @@ -172,18 +155,15 @@
  |    ],
  |    "_gates_papel": "Chave OPCIONAL por gate (peça K6b): \"papel\": \"typecheck\" | \"testes\" | \"build\" | \"lint\". É ela que decide o que a linha GATE da trilha diz sobre cada gate. Quando ausente, o papel é INFERIDO do nome (executor.sh, papel_do_gate: *typecheck*/*tsc*/*types* → typecheck; *lint* → lint; *build*/*compil* → build; *test*/*spec* → testes). Declare-a quando o nome do gate não disser o papel — um gate chamado `verificacao` sai como nao-configurado sem ela. Papel que não existe em gate nenhum do config aparece na trilha como `nao-configurado`, nunca `nao-rodou`.",
  |    "_gates": "cmd = os scripts do fixture/package.json, verificados no disco. tipo exit_code (não baseline): o fixture nasce com 0 erro de tipo e 3 testes verdes, então não há erro herdado a tolerar.",
  | -
  |    "launchd": {
  |      "label": "com.orqfixture.orquestrador",
  |      "start_interval": 600
  |    },
  |    "_launchd": "Peça K6c. `label` é o Label do job do launchd e NÃO tem default: instalar-launchd.sh RECUSA sem ele (o CI usa com.conteudos.orquestrador). Um label por repo — para o launchd, dois repos com o mesmo label são o MESMO job, e o segundo bootstrap derruba o primeiro. `start_interval` é o StartInterval em segundos; ausente vira 1800, que é o valor MEDIDO em 06/set/2026 (a medição está no com.orquestrador.plist.template). 600 aqui só para o teste provar que o número sai do config e não do template — o fixture nunca carrega job nenhum.",
  | -
  |    "canal_notificacao": "arquivo",
  |    "_canal_notificacao": "lib.sh:820-823: qualquer valor diferente de 'notificacao_nativa' faz a notificação ficar SÓ no arquivo runs/notificacoes.log. É o padrão que a peça K10 quer para todo repo.",
  |    "push_suprimido": true,
  |    "_push_suprimido": "O origin do fixture é inválido de propósito (example.invalid). Publicar daqui não é opção — e lib.sh:staging_linha já imprime 'push suprimido' no snapshot.",
  | -
  |    "juiz": {
  |      "diff_max_baixo": 300,
  |      "max_tokens_veredicto": 300,
  | @@ -202,7 +182,6 @@
  |      ]
  |    },
  |    "_juiz": "juiz.ts:64-76 lê os quatro campos. paths_alto_risco VAZIO: o fixture só tem src/ e test/, e listar glob que não casa nada seria config decorativa. As palavras são as do doutrina/templates/config.json.",
  | -
  |    "gate_ticket": {
  |      "juiz_para_humano": false,
  |      "max_paths_allowlist": 8,
  | @@ -245,7 +224,6 @@
  |      ]
  |    },
  |    "_gate_ticket": "gate-ticket.ts:carregarCfg lê SÓ proibido_no_cmd e cmd_prefixos_permitidos (os dois nomes conferidos no disco). Os prefixos são o subconjunto do doutrina/templates/config.json que existe neste fixture: sem npm run build, sem npm run lint, sem curl (não há servidor local).",
  | -
  |    "orcamento": {
  |      "usd_dia": 5,
  |      "tokens_dia": 2000000,
  | @@ -259,7 +237,6 @@
  |      }
  |    },
  |    "_orcamento": "campos_usage copiados de _referencia-ci/000-config.ci.json (nomes confirmados lá por sondagem real de claude -p --output-format json). Os TETOS são do fixture e propositalmente baixos: usd_ticket 1 contra os 10 do CI — um ticket de dois arquivos que passe de US$ 1 é sintoma, não trabalho.",
  | -
  |    "executor": {
  |      "auto_verificacao_max": 2,
  |      "modo_arquiteto_para_alto": false,
  | @@ -268,7 +245,6 @@
  |      "trailer_commit": "Orq-Ticket"
  |    },
  |    "_executor": "local-loop.sh:95 lê .executor.trailer_commit para o trailer do merge commit; o resto é o default de doutrina/templates/config.json.",
  | -
  |    "proibicoes_absolutas": {
  |      "regras": [
  |        "nunca push na branch principal",
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/orq-cfg-gL3iTd/000-config.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | --- .gitignore: o que o repo deve ignorar ---
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | --- orq validar --pendentes (só relatório; NADA é corrigido) ---
  ok    rc 0
  ok    o dry-run mostra o motivo que seria preservado
  ok    o dry-run traz o DIFF das liberações, não um resumo
  ok    o .orq-pause continua lá e nenhum PAUSAR foi criado
  ok    liberacoes.json intacto
  ok    nenhum .bak foi criado
-- (i2) --migrar aplica: renomeia preservando o motivo, e migra as liberações --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | 
  | === MIGRAR docs/fila/** (GRAVANDO, com .bak) ===
  | 
  | motivo preservado: 2026-09-05 09:12 | pausado para aplicar migration 0255
  | RENOMEADO.
  | 
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-Q8bRP5/repo/docs/fila/liberacoes.json)
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | @@ -1,9 +1,35 @@
  | 
  | GRAVADO. Cópia do estado anterior em /private/tmp/orq-verificar-Q8bRP5/repo/docs/fila/liberacoes.json.bak
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-Q8bRP5/repo/docs/fila)
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-Q8bRP5/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-Q8bRP5/repo/docs/fila/000-config.json
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | 
  | @@ -2,17 +2,14 @@
  | @@ -31,7 +28,6 @@
  | @@ -50,17 +46,14 @@
  | @@ -69,7 +62,6 @@
  | @@ -83,7 +75,6 @@
  | @@ -92,31 +83,26 @@
  | @@ -138,7 +124,6 @@
  | @@ -146,7 +131,6 @@
  | @@ -155,7 +139,6 @@
  | @@ -172,18 +155,15 @@
  | @@ -202,7 +182,6 @@
  | @@ -245,7 +224,6 @@
  | @@ -259,7 +237,6 @@
  | @@ -268,7 +245,6 @@
  | 
  | PROPOSTO gravado em /private/tmp/orq-verificar-Q8bRP5/repo/docs/fila/000-config.proposto.json. O oficial NÃO foi tocado.
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /private/tmp/orq-verificar-Q8bRP5/repo/docs/fila/000-config.proposto.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | O config NÃO foi aplicado, e isso é a peça funcionando. Passo humano:
  | 
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  | 
  | e um SEGUNDO commit, separado, para os dados migrados:
  | 
  | Os `.bak` NÃO entram em commit nenhum: são rede local, e o git já é o backup
  | de tudo que estava versionado. Apague-os quando o diff estiver revisado.
  ok    rc 0
  ok    .orq-pause virou PAUSAR
  ok    o MOTIVO foi preservado byte a byte
  ok    liberacoes.json em v2
  ok    o token ganhou o prefixo humano:
  ok    .bak tem o conteúdo ANTERIOR, byte a byte
  ok    o .gitignore do repo NÃO foi editado
  ok    sugere um SEGUNDO commit, separado, para os dados migrados
-- (i3a) M1: a SEGUNDA passada recusa sobrescrever o proposto da primeira --
  ok    rc 1 (recusa, não erro)
  ok    o instalador REPASSA a recusa
  ok    a mensagem dá o nome que a revisão humana deve usar
  ok    o proposto sobrevive byte a byte
-- (i3) rodar de novo é no-op, e o .bak NÃO é sobrescrito --
  ok    rc 0
  ok    a migração diz que não há o que fazer
  ok    a pausa também é no-op
  ok    .bak preservado (é o estado ANTES da PRIMEIRA migração)
-- (i4) .orq-pause E PAUSAR juntos: NÃO migra, e diz por quê --
  ok    recusa migrar com os dois presentes
  ok    o PAUSAR existente não foi sobrescrito
-- (i5) o relato de .gitignore pergunta ao GIT, e nomeia o que falta --
  ok    acusa docs/fila/PAUSAR faltando
  ok    acusa docs/fila/runs/ faltando
  ok    diz que não edita o .gitignore do repo
  ok    runs/ ignorado por runs/.gitignore conta como ok (é como o CI faz)
-- (i5b) K8b-4: o config é PROPOSTO, nunca aplicado pelo instalador --
  ok    relata o renome supabase_project_id → ambiente_id
  ok    relata a conversão do tipo do gate
  ok    c0_intocavel vira item NOMEADO do relatório
  ok    grita que zona_proibida continua ausente
  ok    o 000-config.json OFICIAL não foi tocado
  ok    000-config.proposto.json gravado ao lado
  ok    o proposto está em schema 2
  ok    c0_intocavel atravessa INTACTA para o proposto
  ok    diz que não aplicou, e dá os 4 passos humanos
-- (i5c) K8b-5: bloco JSON dos pendentes, prosa intacta byte a byte --
  ok    recon_esperado virou recon no ticket real
  ok    o nome antigo saiu do bloco
  ok    a PROSA é byte a byte a mesma
  ok    nenhum .bak de ticket
  ok    o relatório roda o orq validar sobre a fila migrada
  ok    o orq validar não CORRIGIU o ticket (segunda passada é no-op)
-- (i6) --dry-run PREVÊ a recusa em vez de dizer que está tudo bem --
  ok    o dry-run continua saindo 0 (ele não é o gate)
  ok    o dry-run avisa que o --atualizar de verdade recusaria
  ok    e diz o motivo (sem pausa)

== (j) --novo: repo git sem docs/fila ==
-- (j1) o repo nasce inteiro --
  | NOVO       kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-novo-PWRs2d
  | 
  | criado     scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (VERSAO 2.1.0-dev)
  | criado     7 teste(s) de harness e 3 fixture(s) (peça K8d)
  | 
  | criado     docs/fila/rascunhos/.gitkeep
  | criado     docs/fila/000-config.json
  | criado     docs/fila/_TEMPLATE.md
  | criado     docs/fila/decisoes-pendentes.md
  | criado     docs/fila/liberacoes.json (v2 vazio)
  | criado     docs/roadmap/mapa.json
  | criado     docs/roadmap/MAPA.md
  | criado     docs/orquestrador/PLAYBOOK.md
  | criado     docs/orquestrador/PECAS.md
  | escrito    .gitignore (+2 linha(s))
  | criado     docs/fila/runs/.gitignore
  | criado     docs/fila/runs/custo.json
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7b)
  |            repo /private/tmp/orq-novo-PWRs2d
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | --- orq config (o formulário ainda está em branco; é assim que ele nasce) ---
  | CONFIG   /private/tmp/orq-novo-PWRs2d/docs/fila/000-config.json
  |   branch_protegida: placeholder não preenchido: "<a branch que o loop NUNCA empurra — ex.: main>"
  |   worktrees_prefixo: placeholder não preenchido: "<prefixo curto das worktrees deste repo — ex.: ci-, os-, fx->"
  |   migrations_dir: placeholder não preenchido: "<ex: supabase/migrations | db/migrations>"
  |   preflight_env_keys[0]: placeholder não preenchido: "<ENV_OBRIGATORIA_1>"
  |   preflight_env_keys[1]: placeholder não preenchido: "<ENV_OBRIGATORIA_2>"
  |   juiz.paths_alto_risco[0]: placeholder não preenchido: "<ex: supabase/**>"
  |   juiz.paths_alto_risco[1]: placeholder não preenchido: "<ex: src/auth/**>"
  |   juiz.paths_alto_risco[2]: placeholder não preenchido: "<ex: src/billing/**>"
  |   gate_ticket.servidor_local_cmd: placeholder não preenchido: "<ex: npm run dev -- --port 3000 | vazio se não houver critério HTTP; sem ele, remova os prefixos curl>"
  |   sentinela.smoke_cmd: placeholder não preenchido: "<ex: curl -sf http://localhost:3000/api/health>"
  |   orcamento.campos_usage.custo_usd: placeholder não preenchido: "<nome do campo de custo no JSON de claude -p --output-format json, confirmado no pré-voo cat. 8>"
  |   orcamento.campos_usage.tokens_in: placeholder não preenchido: "<campo>"
  |   orcamento.campos_usage.tokens_out: placeholder não preenchido: "<campo>"
  |   orcamento.campos_usage.tokens_cache: placeholder não preenchido: "<campo>"
  |   relatorio.canal: placeholder não preenchido: "<notificacao_nativa | webhook_url | email>"
  |   repo_origin_deve_conter: placeholder não preenchido: "<org/repo>"
  |   ambiente_id: placeholder não preenchido: "<ref do banco/projeto, ou vazio se não aplicável>"
  |   zona_proibida.no_write_tables[0]: placeholder não preenchido: "<tabela_compartilhada_1>"
  |   zona_proibida.no_write_prefixes[0]: placeholder não preenchido: "<prefixo_proibido_>"
  |   zona_proibida.readonly_ok[0]: placeholder não preenchido: "<tabelas que o loop pode SELECT mas nunca escrever>"
  |   zona_proibida.excecoes_os_owned[0]: placeholder não preenchido: "<tabelas de nome parecido mas de propriedade deste repo>"
  |   launchd.label: placeholder não preenchido: "<ex: com.suaorg.orquestrador — OBRIGATÓRIO, um por repo>"
  |   gates[0].cmd: placeholder não preenchido: "<ex: npx tsc --noEmit>"
  |   gates[0].baseline_scope_regex: placeholder não preenchido: "<regex de arquivos com erros herdados tolerados, ou vazio>"
  |   gates[1].cmd: placeholder não preenchido: "<ex: npx vitest run>"
  |   gates[2].cmd: placeholder não preenchido: "<ex: npm run build>"
  |   lint.cmd: placeholder não preenchido: "<ex: npx eslint . --max-warnings=999999>"
  | 
  | 27 violação(ões)
  | 
  | PRÓXIMOS PASSOS, nesta ordem:
  |   1. preencha docs/fila/000-config.json — cada placeholder <...> acima é uma decisão local
  |   2. bash scripts/orq config           # tem de sair 0 violações
  |   3. pré-voo: docs/orquestrador/skill/references/pre-voo.md, categorias 0 a 6
  |   4. um ticket-fixture trivial atravessa o loop, com merge na staging
  |   5. SÓ ENTÃO agendar: bash scripts/orquestrador/instalar-launchd.sh
  |      (ele RECUSA sem launchd.label, e o label é um dos placeholders do passo 1)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-novo-PWRs2d
  |   git add .gitignore scripts/orquestrador scripts/orq scripts/roadmap docs \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'orquestrador: instalação inicial, kit 2.1.0-dev'
  ok    rc 0
  ok    criou docs/fila/000-config.json
  ok    criou docs/fila/_TEMPLATE.md
  ok    criou docs/fila/liberacoes.json
  ok    criou docs/fila/decisoes-pendentes.md
  ok    criou docs/fila/rascunhos/.gitkeep
  ok    criou docs/roadmap/mapa.json
  ok    criou docs/roadmap/MAPA.md
  ok    criou docs/orquestrador/PLAYBOOK.md
  ok    criou docs/orquestrador/PECAS.md
  ok    criou docs/orquestrador/skill/SKILL.md
  ok    criou docs/orquestrador/skill/VERSAO
  ok    criou scripts/orq
  ok    criou scripts/orquestrador/lib.sh
  ok    criou scripts/roadmap/lint-mapa.py
  ok    criou test/fixtures/orq-harness.ts
  ok    criou docs/fila/runs/.gitignore
  ok    VERSAO carimbado
  ok    liberacoes.json nasce em v2
-- (j2) NADA de launchd: agendar é passo separado --
  ok    nenhum plist instanciado no repo
  ok    os próximos passos põem o agendamento por ÚLTIMO
-- (j3) orq config: só placeholders, NENHUMA chave ausente --
  ok    rc 1 (formulário em branco é config inválido, e tem de ser)
  ok    lista os placeholders
  ok    nenhuma chave obrigatória AUSENTE (o template só precisa ser preenchido)
-- (j4) --verificar: idêntico ao kit --
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    idêntico ao kit
-- (j5) .gitignore: acrescenta o que falta, preserva o que havia --
  ok    a linha que já existia sobreviveu
  ok    acrescentou docs/fila/PAUSAR
  ok    docs/fila/runs/ é ignorado (o git confirma)
-- (j6) rodar de novo RECUSA: com fila, o verbo é --atualizar --
  ok    rc 1
  ok    a recusa diz por quê e aponta o --atualizar
-- (j7) repo que não é git: RECUSA antes de escrever qualquer coisa --
  ok    rc 1
  ok    a recusa nomeia a causa
  ok    não escreveu NADA no diretório recusado

== (k) T1 · sem node_modules/.bin/tsx ==
-- (k1) --atualizar RECUSA, nomeando o caminho e o comando --
  | RECUSADO: '/private/tmp/orq-sem-tsx-xOs4pB' não tem node_modules/.bin/tsx: o motor do orquestrador é TypeScript e nenhuma parte dele roda sem tsx. Instale a dependência de DESENVOLVIMENTO no repo, com o loop pausado, e repita: npm i -D tsx@^4.19.0   (ou o equivalente do gerenciador deste repo)
  ok    rc 1
  ok    diz RECUSADO
  ok    nomeia node_modules/.bin/tsx
  ok    dá a linha de instalação
-- (k2) --forcar NÃO dispensa (forçar copiaria um motor que não roda) --
  ok    rc 1 com --forcar
-- (k3) --dry-run SÓ AVISA: sai 0, prevê a recusa e não escreve nada --
  ok    rc 0 (o dry-run não é o gate)
  ok    prevê a recusa
  ok    e diz qual
  ok    árvore idêntica antes e depois
-- (k4) com o tsx de volta, o --atualizar segue normalmente --
  ok    rc 0
  ok    nenhuma reclamação de tsx

== (v) nenhum scripts/orquestrador/test-*.sh vendorizado depende do kit ==
  ok    17 test-*.sh vendorizados no fixture varridos
  ok    nenhum cita test/fixtures, ORQ_KIT ou caminho que sobe para fora de scripts/orquestrador
  ok    a trava reprova a linha que quebrou no CI

== (c) ORQ_CI_CHECKOUT não setado (SÓ LEITURA — o resultado é achado, não gate) ==
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
rc=0
```

### git log --oneline main..kit/etapa7b

```
da97b3a 7b-9: teste que viaja não depende do kit
```
