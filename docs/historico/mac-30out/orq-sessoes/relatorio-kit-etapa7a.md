# Relatório · kit etapa 7a · drenagem que não para e diz por quê

Worktree `~/Projetos/_worktrees/kit-etapa7a`, branch `kit/etapa7a`, 21/09/2026. Nenhum push,
nenhum merge, nenhuma chamada ao Claude, nenhuma escrita em conteudos-infinitos, actus-saas
ou comarka-operacional. Tudo roda no bash 3.2 do macOS (`/bin/bash`, GNU bash 3.2.57); os
testes novos foram rodados com ele explicitamente.

## Passo 0 · o que foi lido, e como o drenar() escolhe

1. Revisão Comarka x kit (G1, itens 1 e 2, peça 2), o caso real do CI, CONTRATO 4.1 e 8,
   PECAS, CHANGELOG, `local-loop.sh`, `lib.sh`, `test-drenagem.sh`, `config-chaves.ts` e
   `config-tabela.ts`, e os moldes do Comarka (`local-loop.sh:108-142` e `:200-268`,
   `test-drenagem-sem-progresso.sh`, `test-disjuntor.sh`, `test-drenagem.sh:11-21`).
2. `drenar()` (`local-loop.sh:119`) chama `proximo_pendente` (`local-loop.sh:141`), que é
   `lib.sh:555-562`: percorre `ticket_files` (`lib.sh:121-123`, `find | sort`, ordem
   alfabética) e devolve o primeiro `pendente` com `deps_resolvidas` (`lib.sh:529-552`).
3. Chama `run_executor_once --ticket "$prox"` (`local-loop.sh:164`); o executor não reescolhe
   (`executor.sh:1193`, `if [ -n "$TICKET" ]; then file="$TICKET"`).
4. Pendente sem cooldown depois da chamada: `local-loop.sh:197-201` encerrava a drenagem
   inteira. Sem processável: só `MOTIVO_FILA_VAZIA` (`lib.sh:869`).
5. Não existe schema de config em `schemas/`: o registro é `config-chaves.ts` e o formulário
   v2 é `doutrina/templates/config.json`. Ver "Decisões tomadas" abaixo.

## Decisões tomadas dentro do brief (para conferir)

- **Onde a chave foi registrada.** `config-chaves.ts` (a tabela do que o motor lê) e
  `doutrina/templates/config.json` (o formulário `$schema_versao: 2`, o único artefato de
  schema de config do kit). NÃO em `NOVAS` de `config-tabela.ts`: pôr lá faz o `--migrar`
  acrescentar a chave ao proposto de todo repo instalado, e quebra
  `test/orquestrador-migrar-config.test.ts` ("no CI a migração só acrescenta
  launchd.label"), que está fora do escopo de escrita. A chave é opcional com padrão 3 no
  código, então nenhum repo precisa dela para ter o comportamento.
- **Formato do OCIOSO.** UM evento por drenagem (`--- OCIOSO pendentes=N <id>=<razão> ...`),
  não um por pendente: com 32 pendentes e um disparo a cada 30 min, um evento por pendente
  seriam mais de 1.500 linhas por dia de fila parada.
- **Staging que avança.** O kit não media o HEAD da branch alvo na drenagem; passou a medir
  (`staging_sha`, a ref `refs/heads/<alvo>` no checkout principal) antes e depois do
  executor. Avançou com o ticket ainda pendente: conta como progresso e zera o contador.
- **Causa do bloqueio.** Ordem: evento do ticket na trilha nesta volta (EXECUTOR_MORREU vira
  "executor morreu (rc, fase)" mais a linha `[orq ERRO]`/`fatal:` da saída), depois a nota
  nova, depois a linha `[orq ERRO]`/`fatal:`, e só então a régua do Comarka
  (`ERRO|fatal|FAIL`). A saída do executor passou a ir por `tee`: continua no log em tempo
  real e fica numa cópia temporária para isso.
- **Helper de fixture.** `scripts/orquestrador/test-fixture-drenagem.sh` é molde carregado
  (source) pelos três testes novos; rodado direto, avisa e sai 0.
- **node_modules.** O worktree não tinha `node_modules`; criei um symlink para o do checkout
  principal para rodar o vitest. É ignorado pelo git (aparece como `??`) e não entrou em
  commit nenhum.


## 7a-1 · test-drenagem.sh com fixture própria, sem docs/fila do checkout

sha: `f6cd542`

### Vermelho (contra o código ANTES da mudança)

```
cp: /Users/lucasantos/Projetos/orquestrador-kit/docs/fila/000-config.json: No such file or directory
jq: error: Could not open file /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.qoAfDYTyTb/checkout/docs/fila/000-config.json: No such file or directory
rc=2
```

### Verde

```
== config lida ==
  branch_alvo=staging-auto  branch_protegida=main
  ok    alvo != protegida

== merge_em_alvo RECUSA a branch protegida ==
  ok    alvo == protegida => rc=2 (recusado)
  ok    recusa diz o motivo
  (worktree de teste: /Users/lucasantos/Projetos/orquestrador-kit, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (6ff6f29f)

== drenar TRATA o status refatiar (regra 19) ==
  ok    refatiar NÃO vai para o merge
  ok    a drenagem diz que o ticket voltou
  ok    seguiu para o próximo ticket (executor chamado para: 901 902 )
  ok    o placar da drenagem conta os 2 refatiados
  ok    não conta como aprovado nem como bloqueado

TODOS OS CHECKS PASSARAM
rc=0
```

### Diff

```diff
commit f6cd542f1c10dd844a27bb6c9bc8b5120130ab77

7a-1: test-drenagem.sh com fixture própria, sem docs/fila do checkout

Fila e config nascem em heredoc dentro de mktemp -d. Rodado na raiz do kit
(que não tem docs/fila) o script saía rc 2 no cp do config; agora sai rc 0 e o
assert "seguiu para o próximo ticket" afirma as duas chamadas ao executor, na
ordem da fila, em vez de só a ausência da frase "sem progresso".

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>


diff --git a/scripts/orquestrador/test-drenagem.sh b/scripts/orquestrador/test-drenagem.sh
index 9ac84d0..e1ace04 100755
--- a/scripts/orquestrador/test-drenagem.sh
+++ b/scripts/orquestrador/test-drenagem.sh
@@ -19,14 +19,47 @@ AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
 # --git-common-dir`, de qualquer worktree — e um `event` disparado aqui grava na
 # trilha de produção. Foi assim que os `EXECUTOR_MORREU` espúrios de 2026-09-04
 # 20:45/20:47 entraram no `events.log` real.
+#
+# FIXTURE PRÓPRIA (peça 7a-1): fila e config nascem AQUI, em heredoc, e nada é
+# copiado do checkout. Até a 7a-1 o config vinha de
+# `$CHECKOUT_REAL/docs/fila/000-config.json`, que o KIT não tem (a fila é do
+# repo instalado): rodado na raiz do kit o `cp` falhava, o `source` morria no
+# `jq` e o script saía rc 2 — e o assert "seguiu para o próximo ticket" nunca
+# tinha sido exercido fora de um fixture vendorizado. O checkout real continua
+# sendo usado para UMA coisa, só leitura: provar que a branch protegida dele
+# não se move (casos 2 e 3).
 CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
 CHECKOUT_REAL="$(git -C "$CHECKOUT_REAL" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
 [ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
-CONFIG_REAL="$CHECKOUT_REAL/docs/fila/000-config.json"
+
+# escrever_config <raiz> — o 000-config.json MÍNIMO que o lib.sh e o
+# local-loop.sh leem no carregamento e na drenagem (config-chaves.ts). Nada de
+# gate, juiz ou modelo: o executor aqui é sempre stub.
+escrever_config() {
+  mkdir -p "$1/docs/fila/runs"
+  cat > "$1/docs/fila/000-config.json" <<'JSON'
+{ "$schema_versao": 2,
+  "branch_alvo": "staging-auto", "branch_protegida": "main",
+  "max_retries": 2, "cooldown_minutes": 60, "diff_cap_linhas": 600,
+  "migrations_dir": "db/migrations", "worktrees_dir": "../_worktrees",
+  "worktrees_prefixo": "fx-", "runs_dir": "docs/fila/runs",
+  "liberacoes_file": "docs/fila/liberacoes.json",
+  "decisoes_file": "docs/fila/decisoes-pendentes.md",
+  "pausar_file": "docs/fila/PAUSAR",
+  "repo_origin_deve_conter": "example.invalid", "ambiente_id": "fixture",
+  "canal_notificacao": "arquivo",
+  "executor": { "trailer_commit": "Orq-Ticket" },
+  "orcamento": { "custo_file": "docs/fila/runs/custo.json",
+                 "usd_dia": 50, "tokens_dia": 5000000, "usd_ticket": 5,
+                 "campos_usage": { "custo_usd": "total_cost_usd", "tokens_in": "usage.input_tokens",
+                                   "tokens_out": "usage.output_tokens", "tokens_cache": "usage.cache_read_input_tokens" } } }
+JSON
+  echo '{"$schema_versao": 2, "tokens": []}' > "$1/docs/fila/liberacoes.json"
+}
+
 export ORQ_TESTE=1
 ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
-mkdir -p "$ORQ_EXEC_ROOT/docs/fila/runs"
-cp "$CONFIG_REAL" "$ORQ_EXEC_ROOT/docs/fila/000-config.json"
+escrever_config "$ORQ_EXEC_ROOT"
 trap 'rm -rf "$(dirname "$ORQ_EXEC_ROOT")"' EXIT
 LOCAL_LOOP_SOURCED=1
 # shellcheck source=local-loop.sh
@@ -83,8 +116,7 @@ echo "== drenar TRATA o status refatiar (regra 19) =="
 # mergear um ticket assim, não o conta como aprovado nem como bloqueado, e
 # segue para o próximo em vez de parar por "sem progresso".
 fx="$(mktemp -d)"
-mkdir -p "$fx/docs/fila/runs"
-cp "$CONFIG_REAL" "$fx/docs/fila/000-config.json"
+escrever_config "$fx"
 for id in 901 902; do
   cat > "$fx/docs/fila/$id-t.md" <<TICKET
 # $id
@@ -105,6 +137,7 @@ saida="$(ORQ_EXEC_ROOT="$fx" LOCAL_LOOP_SOURCED=1 bash -c "
   merge_em_alvo() { echo 'MERGE TENTADO' >&2; return 0; }
   run_executor_once() {
     # o executor devolveria o ticket em refatiar; aqui só o status importa
+    echo \"CHAMADA \$(ticket_field \"\$2\" .id)\" >&2
     ticket_set_status \"\$2\" refatiar
     return 0
   }
@@ -115,8 +148,15 @@ printf '%s' "$saida" | grep -q "MERGE TENTADO" \
   && falha "tentou mergear um ticket em refatiar" || ok "refatiar NÃO vai para o merge"
 printf '%s' "$saida" | grep -q "voltou para REFATIAR" \
   && ok "a drenagem diz que o ticket voltou" || falha "refatiar passou em silêncio"
-printf '%s' "$saida" | grep -q "sem progresso" \
-  && falha "encerrou por 'sem progresso' em vez de seguir" || ok "seguiu para o próximo ticket"
+# "Seguiu" é afirmado pelo que ACONTECEU, não só pela ausência da frase: as
+# duas chamadas, na ordem da fila. Sem a primeira linha o assert passaria com
+# uma drenagem que nem começou.
+chamadas="$(printf '%s\n' "$saida" | sed -n 's/^CHAMADA //p' | tr '\n' ' ')"
+if [ "$chamadas" = "901 902 " ] && ! printf '%s' "$saida" | grep -q "sem progresso"; then
+  ok "seguiu para o próximo ticket (executor chamado para: $chamadas)"
+else
+  falha "não seguiu para o próximo: chamadas='$chamadas'"
+fi
 grep -q "DRENAGEM_FIM .*refatiar=2" "$fx/docs/fila/runs/events.log" 2>/dev/null \
   && ok "o placar da drenagem conta os 2 refatiados" \
   || falha "refatiar não apareceu no DRENAGEM_FIM: $(grep DRENAGEM_FIM "$fx/docs/fila/runs/events.log" 2>/dev/null | tail -1)"
```

## 7a-2 · a drenagem pula o ticket que não avança em vez de encerrar

sha: `05b2898`

### Vermelho (contra o código ANTES da mudança)

```
== fila: 901 e 902 abortam antes do agente, 903 é saudável (N=3) ==
  | [2026-09-21 12:04:26-0300] ticket 901 (3 processáveis)
  | [orq ERRO] preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.XGkerTn3zw/checkout (ticket 901)
  | [2026-09-21 12:04:26-0300]   ticket 901 segue pendente sem cooldown (sem progresso) — encerrando
  | [2026-09-21 12:04:26-0300] drenagem encerrada: 0 aprovado(s) e mergeado(s)
  | [2026-09-21 12:04:26-0300] notificação: nada a notificar (0 processados, motivo 'sem progresso em 901') — silêncio
  FALHA esperava 3 chamadas (901, 902, 903), obtive 1: '901 ' — <3 = ticket travado segurou a fila
  ok    terminou em <= N=3 chamadas (sem loop)
  FALHA ordem/repetição inesperada: '901 '
  ok    o executor recebe --ticket (não reescolhe)
  FALHA 903 devia estar done, está pendente
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-09-21T12:04:26-0300 --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=0 refatiar=0 dur=0min
  FALHA DRENAGEM_FIM sem aprovados=1
  FALHA DRENAGEM_FIM sem sem_progresso=2
  STATUS motivo: sem progresso em 901
  FALHA motivo_ocioso não lista os dois pulados: 'sem progresso em 901'

6 CHECK(S) FALHARAM
rc=1
```

### Verde

```
== fila: 901 e 902 abortam antes do agente, 903 é saudável (N=3) ==
  | [2026-09-21 12:05:26-0300] ticket 901 (3 processáveis)
  | [orq ERRO] preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.OBOnX8FOPr/checkout (ticket 901)
  | [2026-09-21 12:05:26-0300]   ticket 901 segue pendente sem cooldown (sem progresso) — marcado como tentado nesta drenagem; segue para o próximo não tentado
  | [2026-09-21 12:05:27-0300] ticket 902 (3 processáveis)
  | [orq ERRO] preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.OBOnX8FOPr/checkout (ticket 902)
  | [2026-09-21 12:05:27-0300]   ticket 902 segue pendente sem cooldown (sem progresso) — marcado como tentado nesta drenagem; segue para o próximo não tentado
  | [2026-09-21 12:05:27-0300] ticket 903 (3 processáveis)
  | [2026-09-21 12:05:27-0300] nenhum processável não tentado — encerrando (aprovados: 1; sem progresso: 901 902)
  | [2026-09-21 12:05:27-0300] drenagem encerrada: 1 aprovado(s) e mergeado(s)
  ok    executor chamado 3x numa drenagem: 901 902 903 
  ok    terminou em <= N=3 chamadas (sem loop)
  ok    cada ticket tentado UMA vez, na ordem da fila
  ok    o executor recebe --ticket (não reescolhe)
  ok    o saudável (903) foi processado: done
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-09-21T12:05:27-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 sem_progresso=2 dur=0min
  ok    DRENAGEM_FIM conta o aprovado
  ok    DRENAGEM_FIM conta os 2 sem progresso em contador próprio
  STATUS motivo: sem progresso em 901 902
  ok    motivo_ocioso lista TODOS os pulados (901 e 902)

TODOS OS CHECKS PASSARAM
rc=0
```

### Diff

```diff
commit 05b28988aec44db56989d98f94b5c8b6d5678e87

7a-2: a drenagem pula o ticket que não avança em vez de encerrar

O ticket que segue pendente sem cooldown entra na memória da drenagem (string
separada por espaço, bash 3.2) e proximo_pendente passa a pulá-lo; o break só
acontece quando não resta processável fora da memória. DRENAGEM_FIM ganha o
contador sem_progresso=, que também entra em processados, e o motivo ocioso
lista todos os ids pulados.

Prova: test-drenagem-sem-progresso.sh (porte do Comarka) com 901 e 902
abortando antes do agente e 903 saudável: 3 chamadas ao executor numa drenagem
e o 903 vira done. Antes, 1 chamada. test-fixture-drenagem.sh é o molde de
fila em mktemp -d que os testes da 7a carregam.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>


diff --git a/scripts/orquestrador/lib.sh b/scripts/orquestrador/lib.sh
index 83c305c..0da37bc 100755
--- a/scripts/orquestrador/lib.sh
+++ b/scripts/orquestrador/lib.sh
@@ -551,11 +551,22 @@ deps_resolvidas() {
   return 0
 }
 
-# proximo_pendente -> caminho do primeiro ticket pendente com deps resolvidas.
+# proximo_pendente [ids] -> caminho do primeiro ticket pendente com deps
+# resolvidas, PULANDO os ids da lista (separados por espaço).
+#
+# A lista é a memória de UMA drenagem (peça 7a-2): o ticket que já foi tentado
+# nesta drenagem e não avançou fica de fora da seleção, para que a drenagem siga
+# para o próximo em vez de reescolhê-lo para sempre. String e não array: o
+# motor roda no bash 3.2 do macOS, sem array associativo. Sem argumento, o
+# comportamento é o de sempre — é assim que o executor a chama.
 proximo_pendente() {
-  local f
+  local f id pular=" ${1:-} "
   for f in $(ticket_files); do
     [ "$(ticket_field "$f" '.status')" = "pendente" ] || continue
+    if [ -n "${1:-}" ]; then
+      id="$(ticket_field "$f" '.id')"
+      case "$pular" in *" $id "*) continue ;; esac
+    fi
     if deps_resolvidas "$f"; then echo "$f"; return 0; fi
   done
   return 0
diff --git a/scripts/orquestrador/local-loop.sh b/scripts/orquestrador/local-loop.sh
index 99b21c0..2f2e1aa 100755
--- a/scripts/orquestrador/local-loop.sh
+++ b/scripts/orquestrador/local-loop.sh
@@ -119,6 +119,9 @@ run_executor_once() {
 drenar() {
   local stwt drenados=0 bloqueados=0 adiados=0 refatiados=0 prox prox_id st t0 dur orc motivo_ocioso=''
   local mortos_antes mortos processados
+  # MEMÓRIA DA DRENAGEM (peça 7a-2): ids tentados que não avançaram, separados
+  # por espaço (bash 3.2: sem array associativo). Só vale dentro desta chamada.
+  local tentados='' sem_progresso=0
   stwt="$(ensure_staging_worktree)"
   t0="$(date +%s)"
   # EXECUTOR_MORREU conta como ticket PROCESSADO (peça 13), e a drenagem não tem
@@ -138,11 +141,17 @@ drenar() {
       motivo_ocioso="cooldown ~$(cooldown_remaining_min)min"; break
     fi
 
-    prox="$(proximo_pendente)"
-    [ -n "$prox" ] || {
-      say "fila sem ticket processável — encerrando (aprovados: $drenados)"
-      motivo_ocioso="$MOTIVO_FILA_VAZIA"; break
-    }
+    prox="$(proximo_pendente "$tentados")"
+    if [ -z "$prox" ]; then
+      if [ -n "$tentados" ]; then
+        say "nenhum processável não tentado — encerrando (aprovados: $drenados; sem progresso: ${tentados% })"
+        motivo_ocioso="sem progresso em ${tentados% }"
+      else
+        say "fila sem ticket processável — encerrando (aprovados: $drenados)"
+        motivo_ocioso="$MOTIVO_FILA_VAZIA"
+      fi
+      break
+    fi
     prox_id="$(ticket_field "$prox" '.id')"
 
     # GATE DE ORÇAMENTO (regra 17), antes de gastar processo com o executor.
@@ -194,23 +203,31 @@ drenar() {
       adiados=$((adiados + 1))
     fi
 
-    # Anti-loop: se o ticket segue pendente sem cooldown, nada progrediu.
+    # Anti-loop (peça 7a-2): o ticket que segue pendente sem cooldown não
+    # progrediu. Até a 7a-2 isso encerrava a drenagem INTEIRA — um ticket que
+    # aborta antes do agente travava a fila toda, a cada disparo, e os outros
+    # pendentes nunca eram tocados (no Comarka, o 315a deixou 32 parados a noite
+    # toda). Agora ele entra na memória da drenagem e ela segue para o próximo
+    # NÃO tentado. Termina: cada volta sem progresso tira um id da seleção, então
+    # são no máximo N voltas assim (N = processáveis). O `break` fica no topo do
+    # laço, quando `proximo_pendente` não acha mais ninguém fora da memória.
     if [ "$(ticket_field "$prox" '.status')" = "pendente" ] && ! cooldown_active; then
-      say "  ticket $prox_id segue pendente sem cooldown (sem progresso) — encerrando"
-      motivo_ocioso="sem progresso em $prox_id"; break
+      tentados="$tentados$prox_id "
+      sem_progresso=$((sem_progresso + 1))
+      say "  ticket $prox_id segue pendente sem cooldown (sem progresso) — marcado como tentado nesta drenagem; segue para o próximo não tentado"
     fi
   done
   dur=$(( ($(date +%s) - t0 + 30) / 60 ))
   say "drenagem encerrada: $drenados aprovado(s) e mergeado(s)"
   event '---' DRENAGEM_FIM "aprovados=$drenados" "bloqueados=$bloqueados" "adiados=$adiados" \
-    "refatiar=$refatiados" "dur=${dur}min"
+    "refatiar=$refatiados" "sem_progresso=$sem_progresso" "dur=${dur}min"
   status_set "estado=ocioso" "fase=—" "ticket=—" "motivo=${motivo_ocioso:-drenagem encerrada}"
 
   # PEÇA 13: notifica só quando houve o que notificar. A decisão (e a memória do
   # "fila vazia já avisada") mora no lib.sh; aqui só se conta o que aconteceu.
   mortos=$(( $(contar_eventos EXECUTOR_MORREU) - mortos_antes ))
   [ "$mortos" -ge 0 ] || mortos=0
-  processados=$(( drenados + bloqueados + adiados + refatiados + mortos ))
+  processados=$(( drenados + bloqueados + adiados + refatiados + sem_progresso + mortos ))
   if deve_notificar "$processados" "$motivo_ocioso"; then
     notificar_fim "$drenados" "$bloqueados" "$adiados" "$dur"
   else
diff --git a/scripts/orquestrador/test-drenagem-sem-progresso.sh b/scripts/orquestrador/test-drenagem-sem-progresso.sh
new file mode 100644
index 0000000..005a66e
--- /dev/null
+++ b/scripts/orquestrador/test-drenagem-sem-progresso.sh
@@ -0,0 +1,93 @@
+#!/usr/bin/env bash
+# test-drenagem-sem-progresso.sh — um ticket que não avança NÃO encerra a
+# drenagem inteira (peça 7a-2). Porte do teste homônimo do comarka-operacional
+# para o `drenar()` do kit.
+#
+# Fila de 3: 901 e 902 abortam ANTES do agente (o executor sai rc 1 sem tocar no
+# status, como num preflight que morre) e 903 é saudável (vai a
+# aguardando_merge, a drenagem mergeia). Até a 7a-2 a drenagem encerrava no 901
+# ("sem progresso em 901") e o 903 nunca era tocado: uma chamada só. Agora são
+# três chamadas numa drenagem, o 903 vira done, e ela ainda TERMINA — no máximo
+# N chamadas, N = processáveis no início. Acima disso é loop.
+#
+# Uso: bash scripts/orquestrador/test-drenagem-sem-progresso.sh
+
+set -uo pipefail
+AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
+
+export ORQ_TESTE=1
+ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
+trap 'rm -rf "$(dirname "$ORQ_EXEC_ROOT")"' EXIT
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
+CALLS="$(dirname "$ORQ_EXEC_ROOT")/calls"; : > "$CALLS"
+ARGS="$(dirname "$ORQ_EXEC_ROOT")/args"; : > "$ARGS"
+
+# --- stubs: nada de worktree, merge ou executor de verdade --------------------
+ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
+merge_em_alvo() { return 0; }
+cleanup_frente() { return 0; }
+run_executor_once() {
+  local id
+  printf '%s\n' "$1" >> "$ARGS"
+  id="$(ticket_field "$2" '.id')"
+  echo "$id" >> "$CALLS"
+  case "$id" in
+    901|902)
+      echo "[orq ERRO] preflight: árvore de execução suja em $ORQ_EXEC_ROOT (ticket $id)" >&2
+      return 1 ;;
+    *)
+      ticket_set_status "$2" aguardando_merge
+      return 0 ;;
+  esac
+}
+
+N="$(pendentes_processaveis)"
+echo "== fila: 901 e 902 abortam antes do agente, 903 é saudável (N=$N) =="
+drenar > "$(dirname "$ORQ_EXEC_ROOT")/out" 2>&1
+sed 's/^/  | /' "$(dirname "$ORQ_EXEC_ROOT")/out" | grep -E 'sem progresso|ticket 90|encerra' || true
+
+n="$(grep -c . "$CALLS")"
+seq_calls="$(tr '\n' ' ' < "$CALLS")"
+[ "$n" = 3 ] && ok "executor chamado 3x numa drenagem: $seq_calls" \
+  || falha "esperava 3 chamadas (901, 902, 903), obtive $n: '$seq_calls' — <3 = ticket travado segurou a fila"
+[ "$n" -le "$N" ] && ok "terminou em <= N=$N chamadas (sem loop)" || falha "LOOP: $n chamadas com N=$N"
+[ "$seq_calls" = "901 902 903 " ] && ok "cada ticket tentado UMA vez, na ordem da fila" \
+  || falha "ordem/repetição inesperada: '$seq_calls'"
+[ "$(sort -u "$ARGS")" = "--ticket" ] && ok "o executor recebe --ticket (não reescolhe)" \
+  || falha "executor chamado sem --ticket: $(sort -u "$ARGS" | tr '\n' ' ')"
+
+[ "$(ticket_field "$FILA/903-t.md" '.status')" = done ] && ok "o saudável (903) foi processado: done" \
+  || falha "903 devia estar done, está $(ticket_field "$FILA/903-t.md" '.status')"
+for id in 901 902; do
+  [ "$(ticket_field "$FILA/$id-t.md" '.status')" = pendente ] && ok "$id segue pendente (não mudou de status)" \
+    || falha "$id mudou de status: $(ticket_field "$FILA/$id-t.md" '.status')"
+done
+
+fim="$(grep ' DRENAGEM_FIM ' "$FILA/runs/events.log" | tail -1)"
+echo "  trilha: $fim"
+case "$fim" in *"aprovados=1 "*) ok "DRENAGEM_FIM conta o aprovado" ;; *) falha "DRENAGEM_FIM sem aprovados=1" ;; esac
+case "$fim" in *"sem_progresso=2 "*) ok "DRENAGEM_FIM conta os 2 sem progresso em contador próprio" ;;
+  *) falha "DRENAGEM_FIM sem sem_progresso=2" ;; esac
+
+mot="$(jq -r '.motivo // ""' "$FILA/runs/.status.json" 2>/dev/null)"
+echo "  STATUS motivo: $mot"
+case "$mot" in *901*902*) ok "motivo_ocioso lista TODOS os pulados (901 e 902)" ;;
+  *) falha "motivo_ocioso não lista os dois pulados: '$mot'" ;; esac
+
+echo
+if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
diff --git a/scripts/orquestrador/test-fixture-drenagem.sh b/scripts/orquestrador/test-fixture-drenagem.sh
new file mode 100644
index 0000000..e904b98
--- /dev/null
+++ b/scripts/orquestrador/test-fixture-drenagem.sh
@@ -0,0 +1,71 @@
+#!/usr/bin/env bash
+# test-fixture-drenagem.sh — NÃO é teste: é o molde de fila que os testes de
+# drenagem da etapa 7a CARREGAM (source) para montar fila e config num
+# `mktemp -d`, sem nunca ler `docs/fila` do checkout nem config de repo real.
+#
+# Quem carrega declara o isolamento ANTES (`export ORQ_TESTE=1` e
+# `ORQ_EXEC_ROOT="$(mktemp -d)/..."`), chama `fx_config`/`fx_ticket`/`fx_git`
+# e só DEPOIS carrega o `local-loop.sh`: o `lib.sh` lê o config no carregamento.
+#
+# Rodado direto, só avisa e sai 0.
+
+if [ "${BASH_SOURCE[0]}" = "$0" ]; then
+  echo "test-fixture-drenagem.sh é molde carregado pelos test-*.sh da 7a; não roda sozinho"
+  exit 0
+fi
+
+# fx_config <raiz> [filtro-jq] — o 000-config.json MÍNIMO que o lib.sh e o
+# local-loop.sh leem (config-chaves.ts), mais o liberacoes.json vazio. O filtro
+# opcional ajusta o config do caso (ex.: '.sem_progresso_limite = 1').
+fx_config() {
+  local raiz="$1" filtro="${2:-.}"
+  mkdir -p "$raiz/docs/fila/runs"
+  jq "$filtro" > "$raiz/docs/fila/000-config.json" <<'JSON'
+{ "$schema_versao": 2,
+  "branch_alvo": "staging-auto", "branch_protegida": "main",
+  "max_retries": 2, "cooldown_minutes": 60, "diff_cap_linhas": 600,
+  "migrations_dir": "db/migrations", "worktrees_dir": "../_worktrees",
+  "worktrees_prefixo": "fx-", "runs_dir": "docs/fila/runs",
+  "liberacoes_file": "docs/fila/liberacoes.json",
+  "decisoes_file": "docs/fila/decisoes-pendentes.md",
+  "pausar_file": "docs/fila/PAUSAR",
+  "repo_origin_deve_conter": "example.invalid", "ambiente_id": "fixture",
+  "canal_notificacao": "arquivo",
+  "executor": { "trailer_commit": "Orq-Ticket" },
+  "orcamento": { "custo_file": "docs/fila/runs/custo.json",
+                 "usd_dia": 50, "tokens_dia": 5000000, "usd_ticket": 5,
+                 "campos_usage": { "custo_usd": "total_cost_usd", "tokens_in": "usage.input_tokens",
+                                   "tokens_out": "usage.output_tokens", "tokens_cache": "usage.cache_read_input_tokens" } } }
+JSON
+  echo '{"$schema_versao": 2, "tokens": []}' > "$raiz/docs/fila/liberacoes.json"
+}
+
+# fx_ticket <raiz> <id> [dependencias-json] [status] — um ticket mínimo.
+fx_ticket() {
+  local raiz="$1" id="$2" deps="${3:-[]}" st="${4:-pendente}"
+  cat > "$raiz/docs/fila/$id-t.md" <<TICKET
+# $id
+
+\`\`\`json
+{"id": "$id", "slug": "t-$id", "status": "$st", "origem": "humano",
+ "objetivo": "x", "pathspec_allowlist": ["src/a.ts"], "dependencias": $deps,
+ "criterios_aceite": [], "notas_status": ""}
+\`\`\`
+TICKET
+}
+
+# fx_git <raiz> — faz da raiz um repo git com a fila commitada, para que o
+# `ticket_commit` REAL rode e o teste possa afirmar o commit (o disjuntor do
+# Comarka mudava status sem commitar, e é isso que não pode voltar).
+# `runs/` fica fora do índice, como num repo instalado.
+fx_git() {
+  local raiz="$1"
+  git -C "$raiz" init -q -b main
+  git -C "$raiz" config user.email fixture@example.invalid
+  git -C "$raiz" config user.name fixture
+  git -C "$raiz" config commit.gpgsign false
+  printf 'docs/fila/runs/\n' > "$raiz/.gitignore"
+  git -C "$raiz" add -A
+  git -C "$raiz" commit -q -m "fixture: fila inicial"
+  git -C "$raiz" branch staging-auto
+}
```

## 7a-3 · contador persistente de sem-progresso que bloqueia no limite

sha: `6e458e1`

### Vermelho (contra o código ANTES da mudança)

```
== 1. ticket 901 sempre aborta: 1, 2, 3 -> bloqueado ==
  --- disparo 1 (aborta): chamadas [901 ] 901=
  FALHA disparo 1: esperava contador 1, obtive ''
  --- disparo 2 (aborta): chamadas [901 ] 901=
  FALHA disparo 2: esperava 2, obtive ''
  ok    abaixo do limite, segue pendente
  --- disparo 3 (aborta): chamadas [901 ] 901=
  FALHA esperava 901 bloqueado no 3º disparo, está pendente
  nota: 
  FALHA nota fora do formato: 
  FALHA trilha sem BLOQUEADO motivo=sem_progresso
  ok    o bloqueio foi COMMITADO (árvore limpa no ticket)
  FALHA último commit do ticket não é o do bloqueio
  FALHA commit não carrega o status bloqueado
  ok    contador zerado ao mudar de status
  --- disparo 4 (aborta): chamadas [901 ] 901=
  FALHA bloqueado foi escolhido de novo

== 2. adiamento não conta ==
  --- disparo 5 (aborta): chamadas [901 902 ] 901=
  FALHA esperava 902 em 1, obtive ''
  --- disparo 6 (adia-cooldown): chamadas [901 ] 901=
  FALHA adiamento com cooldown contou: ''
  ok    (o mark_adiado armou cooldown, como no motor)
  --- disparo 7 (adia-sem-cooldown): chamadas [901 902 ] 901=
  FALHA adiamento sem cooldown contou: ''
  --- disparo 8 (adia-sem-cooldown): chamadas [901 902 ] 901=
  FALHA segundo adiamento contou: ''
  FALHA adiado sem cooldown reescolhido: [901 902 ]
  --- disparo 9 (aborta): chamadas [901 902 ] 901=
  FALHA esperava 2, obtive ''

== 3. staging que avança na vez do ticket zera ==
  --- disparo 10 (aborta): chamadas [901 902 ] 901=
  FALHA esperava 1 depois do avanço, obtive ''
  ok    902 não bloqueou
  FALHA chamadas inesperadas: [901 902 ]

== 4. o limite vem do config ==
  --- disparo 11 (aborta): chamadas [901 903 ] 901=
  FALHA com limite 1, 903 devia bloquear; está pendente
  FALHA nota: 
scripts/orquestrador/test-sem-progresso-limite.sh: line 160: sem_progresso_limite: command not found
scripts/orquestrador/test-sem-progresso-limite.sh: line 160: sem_progresso_limite: command not found
  FALHA limite inválido virou ''
scripts/orquestrador/test-sem-progresso-limite.sh: line 162: sem_progresso_limite: command not found
scripts/orquestrador/test-sem-progresso-limite.sh: line 162: sem_progresso_limite: command not found
  FALHA limite ausente virou ''

20 CHECK(S) FALHARAM
rc=1
```

### Verde

```
== 1. ticket 901 sempre aborta: 1, 2, 3 -> bloqueado ==
  --- disparo 1 (aborta): chamadas [901 ] 901=1
  ok    disparo 1: contador 1
  --- disparo 2 (aborta): chamadas [901 ] 901=2
  ok    disparo 2: contador 2 (persistiu entre disparos)
  ok    abaixo do limite, segue pendente
  --- disparo 3 (aborta): chamadas [901 ] 901=
  ok    disparo 3: 901 bloqueado no limite
  nota: sem_progresso: 3 disparos sem progresso entre 2026-09-21 12:10:03-0300 e 2026-09-21 12:10:03-0300; última causa: executor morreu (rc=128, fase=worktree): fatal: '/tmp/_worktrees/fx-901' already exists
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
rc=0
```

### Diff

```diff
commit 6e458e14f495b547d8a623d05057cd20d993fa3e

7a-3: contador persistente de sem-progresso que bloqueia no limite

runs/<id>/.sem-progresso ("N|primeira|ultima") soma entre disparos a volta em
que o ticket segue pendente sem cooldown e sem a branch alvo andar. No limite
(sem_progresso_limite, padrão 3) o ticket vai para bloqueado pelo ticket_set +
ticket_commit, com notas_status citando a última causa, e a trilha ganha
BLOQUEADO motivo=sem_progresso n= limite=. Adiamento não conta (com cooldown,
ou com evento ADIADO/nota "adiado" sem cooldown); sair de pendente ou a branch
alvo avançar zera.

A causa vem do desfecho que o executor gravou na trilha (EXECUTOR_MORREU vira
"executor morreu (rc, fase)" mais a linha [orq ERRO]/fatal:), depois da nota
nova, e só por último da linha ERRO|fatal|FAIL. A saída do executor segue para
o log por tee e fica numa cópia para isso.

Chave registrada em config-chaves.ts e no formulário v2
(doutrina/templates/config.json); NÃO em NOVAS de config-tabela.ts, para o
--migrar não mudar o proposto dos repos instalados.

Prova: test-sem-progresso-limite.sh, porte dos casos 1 a 4 do test-disjuntor.sh
do Comarka. Antes, o ticket nunca bloqueava.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>


diff --git a/doutrina/templates/config.json b/doutrina/templates/config.json
index 029cbce..3c97f62 100644
--- a/doutrina/templates/config.json
+++ b/doutrina/templates/config.json
@@ -10,6 +10,8 @@
   "max_retries": 2,
   "cooldown_minutes": 60,
   "_cooldown": "Adiamento por limite (rate limit/quota/timeout/orçamento) grava runs/.cooldown-until. NÃO conta como retry; status volta a pendente.",
+  "sem_progresso_limite": 3,
+  "_sem_progresso_limite": "Peça 7a-3 (local-loop.sh:160). Disparos seguidos em que o ticket segue pendente sem cooldown e sem a branch alvo andar, contados em runs/<id>/.sem-progresso. No limite o ticket vai para bloqueado, commitado, com a última causa em notas_status, e a trilha ganha BLOQUEADO motivo=sem_progresso. Adiamento não conta; sair de pendente ou a branch alvo avançar zera. Ausente ou inválida = 3.",
   "migrations_dir": "<ex: supabase/migrations | db/migrations>",
   "worktrees_dir": "../_worktrees",
   "runs_dir": "docs/fila/runs",
diff --git a/scripts/orquestrador/config-chaves.ts b/scripts/orquestrador/config-chaves.ts
index 1251223..f257830 100644
--- a/scripts/orquestrador/config-chaves.ts
+++ b/scripts/orquestrador/config-chaves.ts
@@ -69,6 +69,7 @@ export const CHAVES_CONFIG: ChaveConfig[] = [
   { chave: 'politica_adiamento.causas_que_adiam', onde: 'decisao.ts:113', obrigatoria: true, nota: 'sem ela nada é adiável: falha de infra viraria reprovação' },
   { chave: 'politica_retry.por_causa', onde: 'decisao.ts:277', obrigatoria: true },
   { chave: 'cooldown_minutes', onde: 'lib.sh:572', obrigatoria: false, nota: 'default 60 no código' },
+  { chave: 'sem_progresso_limite', onde: 'local-loop.sh:160', obrigatoria: false, nota: 'peça 7a-3: disparos seguidos sem progresso até bloquear o ticket; ausente ou inválida = 3 no código' },
   { chave: 'worktrees_prefixo', onde: 'lib.sh:498, decisao.ts:363', obrigatoria: true, nota: 'prefixo diferente por repo é o que impede colisão de worktree' },
   { chave: 'restricao_execucao', onde: 'decisao.ts:71, executor.sh:156', obrigatoria: false, nota: 'inativa quando ausente' },
   { chave: 'sql_pendente_dir', onde: 'enforcement-core.ts:128, executor.sh:359', obrigatoria: false, nota: 'só importa em repo com banco' },
diff --git a/scripts/orquestrador/local-loop.sh b/scripts/orquestrador/local-loop.sh
index 2f2e1aa..ba9a47f 100755
--- a/scripts/orquestrador/local-loop.sh
+++ b/scripts/orquestrador/local-loop.sh
@@ -115,6 +115,117 @@ run_executor_once() {
   bash "$ORQ_LIB_DIR/executor.sh" "$@"
 }
 
+# --- SEM PROGRESSO PERSISTENTE (peça 7a-3) -----------------------------------
+# A memória da 7a-2 só vale dentro de UMA drenagem: no disparo seguinte o mesmo
+# ticket volta a ser escolhido, aborta de novo, e nada para a repetição. No
+# Comarka isso foi o 440: 19 execuções entre 18/09 e 21/09, todas com attempt
+# vazio. Este contador PERSISTE entre disparos em runs/<id>/.sem-progresso
+# ("N|primeira|ultima") e, no limite, BLOQUEIA o ticket.
+#
+# Conta SÓ a volta em que o ticket segue pendente sem cooldown. Não conta:
+# adiamento (com cooldown, ou com evento ADIADO/nota "adiado" sem cooldown), e
+# a volta em que a branch alvo avançou. Zera quando o ticket sai de pendente e
+# quando a branch alvo avança na vez dele. Limite: `sem_progresso_limite` do
+# config, 3 quando ausente ou inválida.
+#
+# Dois defeitos do disjuntor do Comarka que ficaram de fora de propósito: lá o
+# status muda SEM commit (a árvore fica suja e o preflight do próximo ticket
+# aborta), e a causa é só a última linha com ERRO|fatal|FAIL da saída. Aqui o
+# bloqueio passa pelo `ticket_commit`, e a causa vem do DESFECHO que o executor
+# gravou na trilha, com a saída como reserva.
+sem_progresso_arquivo() { printf '%s/%s/.sem-progresso\n' "$RUNS_BASE" "$1"; }
+sem_progresso_zerar()   { rm -f "$(sem_progresso_arquivo "$1")" 2>/dev/null || true; }
+
+# sem_progresso_incrementar <id> -> imprime "N|primeira|ultima" já gravado.
+sem_progresso_incrementar() {
+  local f n=0 primeira agora linha
+  f="$(sem_progresso_arquivo "$1")"; agora="$(ts)"; primeira="$agora"
+  if [ -f "$f" ]; then
+    linha="$(head -1 "$f" 2>/dev/null || true)"
+    n="${linha%%|*}"; primeira="$(printf '%s' "$linha" | cut -d'|' -f2)"
+    case "$n" in ''|*[!0-9]*) n=0; primeira="$agora" ;; esac
+    [ -n "$primeira" ] || primeira="$agora"
+  fi
+  n=$((n + 1))
+  if escrita_de_teste_permitida "$f"; then
+    mkdir -p "$(dirname "$f")" 2>/dev/null || true
+    printf '%s|%s|%s\n' "$n" "$primeira" "$agora" > "$f" 2>/dev/null || true
+  fi
+  printf '%s|%s|%s\n' "$n" "$primeira" "$agora"
+}
+
+# sem_progresso_limite -> inteiro >= 1; 3 quando a chave falta ou é inválida.
+sem_progresso_limite() {
+  local l
+  l="$(cfg '.sem_progresso_limite // empty' 2>/dev/null || true)"
+  case "$l" in ''|*[!0-9]*|0) l=3 ;; esac
+  printf '%s\n' "$l"
+}
+
+# staging_sha -> o commit da branch alvo agora (vazio se ela não existe). A ref
+# é a mesma em todo worktree do repo; lida no checkout principal.
+staging_sha() { git -C "$MAIN_CHECKOUT" rev-parse -q --verify "refs/heads/$BRANCH_ALVO" 2>/dev/null || true; }
+
+# trilha_linhas -> quantas linhas a trilha tem agora (0 se não existe).
+trilha_linhas() {
+  local n
+  n="$(wc -l < "$EVENTS_FILE" 2>/dev/null | tr -d ' ')" || n=0
+  case "$n" in ''|*[!0-9]*) n=0 ;; esac
+  printf '%s\n' "$n"
+}
+
+# eventos_do_ticket_desde <n> <id> -> as linhas da trilha depois da n-ésima que
+# são DESTE ticket, mais o EXECUTOR_MORREU sem ticket (o executor que morre no
+# preflight ainda não sabe de quem é a vez e grava id "—").
+eventos_do_ticket_desde() {
+  tail -n +"$(( $1 + 1 ))" "$EVENTS_FILE" 2>/dev/null \
+    | awk -v id="$2" '$2 == id || ($2 == "—" && $3 == "EXECUTOR_MORREU")' || true
+}
+
+# foi_adiado <eventos> <nota_antes> <nota_depois> -> 0 se a volta foi adiamento.
+# O sinal principal é o evento ADIADO que o executor grava; a nota nova que
+# começa com "adiado" é reserva, para o caminho que adia sem passar por ele.
+foi_adiado() {
+  printf '%s\n' "$1" | awk '$3 == "ADIADO" { achou = 1 } END { exit achou ? 0 : 1 }' && return 0
+  [ "$3" != "$2" ] || return 1
+  case "$3" in adiado*) return 0 ;; esac
+  return 1
+}
+
+# sem_progresso_causa <eventos> <saida-do-executor> <rc> <nota_antes> <nota_depois>
+# -> UMA linha dizendo por que a volta não progrediu, nesta ordem de preferência:
+#   1. o desfecho na trilha: EXECUTOR_MORREU vira "executor morreu (rc, fase)"
+#      mais a mensagem de erro do executor ([orq ERRO] ou fatal:) quando houver;
+#      qualquer outro evento do ticket entra como está;
+#   2. a nota que o executor escreveu nesta volta (ex.: "recusado: ...");
+#   3. a última linha [orq ERRO] ou fatal: da saída;
+#   4. a última linha com ERRO|fatal|FAIL (a régua do Comarka, só como reserva);
+#   5. "executor saiu rc=N sem desfecho registrado".
+sem_progresso_causa() {
+  local evs="$1" out="$2" rc="$3" nota_antes="$4" nota_depois="$5" ult ev campos erro c='' r f
+  ult="$(printf '%s\n' "$evs" | grep -v '^$' | tail -1 || true)"
+  erro="$(grep -E '^\[orq ERRO\]|^fatal:' "$out" 2>/dev/null | tail -1 | sed 's/^\[orq ERRO\] *//' || true)"
+  if [ -n "$ult" ]; then
+    ev="$(printf '%s' "$ult" | awk '{print $3}')"
+    campos="$(printf '%s' "$ult" | cut -d' ' -f4-)"
+    if [ "$ev" = EXECUTOR_MORREU ]; then
+      r="$(printf ' %s ' "$campos" | sed -n 's/.* rc=\([^ ]*\) .*/\1/p')"
+      f="$(printf ' %s ' "$campos" | sed -n 's/.* fase=\([^ ]*\) .*/\1/p')"
+      c="executor morreu (rc=${r:-?}, fase=${f:-?})${erro:+: $erro}"
+    else
+      c="$ev $campos"
+    fi
+  elif [ -n "$nota_depois" ] && [ "$nota_depois" != "$nota_antes" ]; then
+    c="$nota_depois"
+  elif [ -n "$erro" ]; then
+    c="$erro"
+  else
+    c="$(grep -E 'ERRO|fatal|FAIL' "$out" 2>/dev/null | tail -1 || true)"
+  fi
+  [ -n "$c" ] || c="executor saiu rc=$rc sem desfecho registrado"
+  uma_linha "$(printf '%s' "$c" | tr -d '\r')" 300
+}
+
 # --- DRENAGEM ----------------------------------------------------------------
 drenar() {
   local stwt drenados=0 bloqueados=0 adiados=0 refatiados=0 prox prox_id st t0 dur orc motivo_ocioso=''
@@ -122,6 +233,8 @@ drenar() {
   # MEMÓRIA DA DRENAGEM (peça 7a-2): ids tentados que não avançaram, separados
   # por espaço (bash 3.2: sem array associativo). Só vale dentro desta chamada.
   local tentados='' sem_progresso=0
+  # O que a drenagem lê do executor ALÉM do status (peça 7a-3).
+  local ev_antes sha_antes sha_depois nota_antes nota_depois exe_out exe_rc evs sp n lim causa primeira ultima
   stwt="$(ensure_staging_worktree)"
   t0="$(date +%s)"
   # EXECUTOR_MORREU conta como ticket PROCESSADO (peça 13), e a drenagem não tem
@@ -170,7 +283,14 @@ drenar() {
 
     say "ticket $prox_id ($(pendentes_processaveis) processáveis)"
 
-    run_executor_once --ticket "$prox" && say "  executor rc=0" || say "  executor rc!=0 (não fatal; reavalia a fila)"
+    # Antes da chamada: onde a trilha estava, onde a branch alvo estava e a
+    # nota do ticket. É a régua do que ESTA volta produziu. A saída do executor
+    # vai para o log como sempre (tee) e fica numa cópia para a causa.
+    ev_antes="$(trilha_linhas)"; sha_antes="$(staging_sha)"
+    nota_antes="$(ticket_field "$prox" '.notas_status // ""')"
+    exe_out="$(mktemp 2>/dev/null || echo "${TMPDIR:-/tmp}/orq-executor-saida.$$")"
+    run_executor_once --ticket "$prox" 2>&1 | tee "$exe_out" && exe_rc=0 || exe_rc="${PIPESTATUS[0]}"
+    if [ "$exe_rc" = 0 ]; then say "  executor rc=0"; else say "  executor rc=$exe_rc (não fatal; reavalia a fila)"; fi
 
     st="$(ticket_field "$prox" '.status')"
     if [ "$st" = "aguardando_merge" ]; then
@@ -211,11 +331,48 @@ drenar() {
     # NÃO tentado. Termina: cada volta sem progresso tira um id da seleção, então
     # são no máximo N voltas assim (N = processáveis). O `break` fica no topo do
     # laço, quando `proximo_pendente` não acha mais ninguém fora da memória.
-    if [ "$(ticket_field "$prox" '.status')" = "pendente" ] && ! cooldown_active; then
-      tentados="$tentados$prox_id "
-      sem_progresso=$((sem_progresso + 1))
-      say "  ticket $prox_id segue pendente sem cooldown (sem progresso) — marcado como tentado nesta drenagem; segue para o próximo não tentado"
+    #
+    # Peça 7a-3: a volta sem progresso também SOMA no contador persistente, e
+    # no limite o ticket vai para bloqueado. Saiu de pendente: contador zera.
+    if [ "$(ticket_field "$prox" '.status')" != "pendente" ]; then
+      sem_progresso_zerar "$prox_id"
+    elif ! cooldown_active; then
+      evs="$(eventos_do_ticket_desde "$ev_antes" "$prox_id")"
+      nota_depois="$(ticket_field "$prox" '.notas_status // ""')"
+      sha_depois="$(staging_sha)"
+      if [ -n "$sha_antes" ] && [ "$sha_antes" != "$sha_depois" ]; then
+        # A branch alvo andou na vez dele: algo foi aprovado e mergeado, então
+        # houve progresso. Não entra na memória e o contador zera.
+        say "  $BRANCH_ALVO avançou na vez de $prox_id (${sha_antes:0:8} -> ${sha_depois:0:8}) — conta como progresso; contador zerado"
+        sem_progresso_zerar "$prox_id"
+      elif foi_adiado "$evs" "$nota_antes" "$nota_depois"; then
+        # Adiado sem cooldown: não é defeito do ticket e não conta. Entra na
+        # memória mesmo assim, senão a drenagem o reescolheria em seguida.
+        tentados="$tentados$prox_id "
+        adiados=$((adiados + 1))
+        say "  ticket $prox_id adiado sem cooldown — não conta como sem progresso; segue para o próximo não tentado"
+      else
+        causa="$(sem_progresso_causa "$evs" "$exe_out" "$exe_rc" "$nota_antes" "$nota_depois")"
+        sp="$(sem_progresso_incrementar "$prox_id")"
+        n="${sp%%|*}"; lim="$(sem_progresso_limite)"
+        if [ "$n" -ge "$lim" ]; then
+          primeira="$(printf '%s' "$sp" | cut -d'|' -f2)"; ultima="${sp##*|}"
+          ticket_set "$prox" '.status = "bloqueado" | .notas_status = $n' \
+            --arg n "sem_progresso: $n disparos sem progresso entre $primeira e $ultima; última causa: $causa"
+          ticket_commit "$prox" "fila: $prox_id bloqueado (sem_progresso, $n disparos)"
+          event "$prox_id" BLOQUEADO "motivo=sem_progresso" "n=$n" "limite=$lim"
+          status_set "ultimo=$prox_id BLOQUEADO $(date '+%H:%M:%S') (sem progresso em $n disparos)"
+          sem_progresso_zerar "$prox_id"
+          say "  SEM PROGRESSO: $prox_id bloqueado após $n disparos ($primeira .. $ultima); última causa: $causa"
+          bloqueados=$((bloqueados + 1))
+        else
+          tentados="$tentados$prox_id "
+          sem_progresso=$((sem_progresso + 1))
+          say "  ticket $prox_id segue pendente sem cooldown (sem progresso $n/$lim) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: $causa"
+        fi
+      fi
     fi
+    rm -f "$exe_out"
   done
   dur=$(( ($(date +%s) - t0 + 30) / 60 ))
   say "drenagem encerrada: $drenados aprovado(s) e mergeado(s)"
diff --git a/scripts/orquestrador/test-sem-progresso-limite.sh b/scripts/orquestrador/test-sem-progresso-limite.sh
new file mode 100644
index 0000000..41465ae
--- /dev/null
+++ b/scripts/orquestrador/test-sem-progresso-limite.sh
@@ -0,0 +1,166 @@
+#!/usr/bin/env bash
+# test-sem-progresso-limite.sh — contador PERSISTENTE de sem-progresso (peça
+# 7a-3). Porte dos casos 1 a 4 do test-disjuntor.sh do comarka-operacional para
+# o `drenar()` do kit. Cada chamada de `drenar` é um disparo do launchd.
+#
+#   1. ticket que sempre aborta antes do agente: contador 1, 2, 3 em disparos
+#      seguidos; no 3º vira bloqueado, COMMITADO pelo ticket_commit, com a
+#      última causa tirada do DESFECHO do executor na nota, e o evento
+#      `BLOQUEADO motivo=sem_progresso` na trilha. Depois não é mais escolhido.
+#   2. adiamento não conta: nem o com cooldown (mark_adiado do motor), nem o
+#      sem cooldown (evento ADIADO + nota "adiado", sem arquivo de cooldown).
+#   3. staging que avança na vez do ticket zera o contador.
+#   4. o limite vem do config (`sem_progresso_limite`); valor inválido cai no 3.
+#
+# Dois defeitos do disjuntor do Comarka que este teste impede de voltar: status
+# mudado sem commit, e causa tirada só da última linha com ERRO|fatal|FAIL.
+#
+# Uso: bash scripts/orquestrador/test-sem-progresso-limite.sh
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
+fx_config "$ORQ_EXEC_ROOT" '.sem_progresso_limite = 3'
+fx_ticket "$ORQ_EXEC_ROOT" 901
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
+MODO="$TMP/modo"      # aborta | adia-cooldown | adia-sem-cooldown | avanca
+CALLS="$TMP/calls"; : > "$CALLS"
+
+ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
+merge_em_alvo() { return 0; }
+cleanup_frente() { return 0; }
+
+# O executor STUB imita o executor real em cada desfecho, INCLUSIVE no que ele
+# grava na trilha — é de lá que a drenagem tira a causa.
+run_executor_once() {
+  local f="$2" id
+  id="$(ticket_field "$f" '.id')"
+  echo "$id" >> "$CALLS"
+  case "$(cat "$MODO")" in
+    aborta)
+      # igual ao 440: o executor cria o attempt e morre no `worktree add`
+      # (set -e), depois de TICKET_EM_CURSO — o trap grava EXECUTOR_MORREU.
+      mkdir -p "$RUNS_BASE/$id/attempt-0"
+      echo "[orq] ticket $id (t-$id) · worktree fx-$id"
+      echo "Preparing worktree (new branch 'frente/$id')" >&2
+      echo "fatal: '/tmp/_worktrees/fx-$id' already exists" >&2
+      echo "FAIL linha de ruído que não é a causa" >&2
+      event "$id" EXECUTOR_MORREU "rc=128" "fase=worktree"
+      return 128 ;;
+    adia-cooldown)
+      # executor.sh:1051-1053: evento ADIADO e mark_adiado (que ARMA cooldown).
+      event "$id" ADIADO "motivo=rate_limit" "attempt=1"
+      mark_adiado "$f" executor "rate limit"
+      return 0 ;;
+    adia-sem-cooldown)
+      # adiamento que NÃO arma cooldown (o desenho do Comarka para 529/500/503):
+      # o ticket segue pendente e o cooldown não está ativo.
+      event "$id" ADIADO "motivo=erro_transitorio" "attempt=1"
+      ticket_set_nota "$f" "adiado (executor) por erro transitório em $(date +%s)$RANDOM"
+      ticket_commit "$f" "fila: $id adiado (executor)"
+      return 0 ;;
+    avanca)
+      # staging-auto anda uma vez na vez do ticket; depois ele volta a abortar
+      # (senão a drenagem o reescolheria: staging andou = progresso).
+      local sha
+      sha="$(git -C "$ORQ_EXEC_ROOT" commit-tree "staging-auto^{tree}" -p staging-auto -m "avanço de staging")"
+      git -C "$ORQ_EXEC_ROOT" update-ref refs/heads/staging-auto "$sha"
+      echo aborta > "$MODO"
+      return 0 ;;
+  esac
+}
+
+contador() { cut -d'|' -f1 "$RUNS_BASE/$1/.sem-progresso" 2>/dev/null || true; }
+st()       { ticket_field "$FILA/$1-t.md" '.status'; }
+nota()     { ticket_field "$FILA/$1-t.md" '.notas_status'; }
+disparo()  {
+  : > "$CALLS"
+  drenar > "$TMP/out.$1" 2>&1
+  echo "  --- disparo $1 ($(cat "$MODO")): chamadas [$(tr '\n' ' ' < "$CALLS")] 901=$(contador 901)"
+}
+
+echo "== 1. ticket 901 sempre aborta: 1, 2, 3 -> bloqueado =="
+echo aborta > "$MODO"
+disparo 1; [ "$(contador 901)" = 1 ] && ok "disparo 1: contador 1" || falha "disparo 1: esperava contador 1, obtive '$(contador 901)'"
+disparo 2; [ "$(contador 901)" = 2 ] && ok "disparo 2: contador 2 (persistiu entre disparos)" || falha "disparo 2: esperava 2, obtive '$(contador 901)'"
+[ "$(st 901)" = pendente ] && ok "abaixo do limite, segue pendente" || falha "bloqueou antes do limite: $(st 901)"
+disparo 3
+[ "$(st 901)" = bloqueado ] && ok "disparo 3: 901 bloqueado no limite" || falha "esperava 901 bloqueado no 3º disparo, está $(st 901)"
+echo "  nota: $(nota 901)"
+nota 901 | grep -Eq "^sem_progresso: 3 disparos sem progresso entre .+ e .+; última causa: executor morreu \(rc=128, fase=worktree\): fatal: '/tmp/_worktrees/fx-901' already exists$" \
+  && ok "nota cita a última causa pelo DESFECHO do executor (EXECUTOR_MORREU + linha fatal), não pela linha FAIL" \
+  || falha "nota fora do formato: $(nota 901)"
+grep -Eq ' 901 BLOQUEADO motivo=sem_progresso( |$)' "$FILA/runs/events.log" \
+  && ok "trilha: 901 BLOQUEADO motivo=sem_progresso" || falha "trilha sem BLOQUEADO motivo=sem_progresso"
+[ -z "$(git -C "$ORQ_EXEC_ROOT" status --porcelain -- docs/fila/901-t.md)" ] \
+  && ok "o bloqueio foi COMMITADO (árvore limpa no ticket)" || falha "bloqueio deixou o ticket sujo, sem commit"
+git -C "$ORQ_EXEC_ROOT" log -1 --format=%s -- docs/fila/901-t.md | grep -q '^fila: 901 bloqueado (sem_progresso' \
+  && ok "commit: $(git -C "$ORQ_EXEC_ROOT" log -1 --format=%s -- docs/fila/901-t.md)" || falha "último commit do ticket não é o do bloqueio"
+git -C "$ORQ_EXEC_ROOT" show HEAD:docs/fila/901-t.md | grep -q '"status": "bloqueado"' \
+  && ok "o status bloqueado está no commit, não só no disco" || falha "commit não carrega o status bloqueado"
+[ -z "$(contador 901)" ] && ok "contador zerado ao mudar de status" || falha "contador devia zerar ao bloquear: '$(contador 901)'"
+disparo 4; grep -qx 901 "$CALLS" && falha "bloqueado foi escolhido de novo" || ok "disparo 4: bloqueado não é mais escolhido"
+
+echo
+echo "== 2. adiamento não conta =="
+fx_ticket "$ORQ_EXEC_ROOT" 902
+git -C "$ORQ_EXEC_ROOT" add -- docs/fila/902-t.md && git -C "$ORQ_EXEC_ROOT" commit -q -m "fixture: 902"
+echo aborta > "$MODO"; disparo 5
+[ "$(contador 902)" = 1 ] && ok "902 aborta: contador 1" || falha "esperava 902 em 1, obtive '$(contador 902)'"
+echo adia-cooldown > "$MODO"; disparo 6
+[ "$(contador 902)" = 1 ] && ok "adiado com cooldown (mark_adiado): não conta" || falha "adiamento com cooldown contou: '$(contador 902)'"
+cooldown_active && ok "(o mark_adiado armou cooldown, como no motor)" || falha "mark_adiado não armou cooldown"
+rm -f "$COOLDOWN_FILE"
+echo adia-sem-cooldown > "$MODO"; disparo 7
+[ "$(contador 902)" = 1 ] && ok "adiado SEM cooldown (evento ADIADO): não conta" || falha "adiamento sem cooldown contou: '$(contador 902)'"
+cooldown_active && falha "cooldown ativo onde não devia" || true
+disparo 8
+[ "$(contador 902)" = 1 ] && ok "segundo adiamento sem cooldown também não conta" || falha "segundo adiamento contou: '$(contador 902)'"
+[ "$(tr '\n' ' ' < "$CALLS")" = "902 " ] && ok "adiado sem cooldown não é reescolhido na mesma drenagem" \
+  || falha "adiado sem cooldown reescolhido: [$(tr '\n' ' ' < "$CALLS")]"
+echo aborta > "$MODO"; disparo 9
+[ "$(contador 902)" = 2 ] && ok "abort depois dos adiamentos volta a contar (2)" || falha "esperava 2, obtive '$(contador 902)'"
+
+echo
+echo "== 3. staging que avança na vez do ticket zera =="
+# Antes: 2. No disparo 10 o staging anda (zera) e o ticket aborta em seguida,
+# na mesma drenagem (conta 1). Sem o zero seria 3, e bloquearia.
+echo avanca > "$MODO"; disparo 10
+[ "$(contador 902)" = 1 ] && ok "staging avançou: zerou e recomeçou em 1" || falha "esperava 1 depois do avanço, obtive '$(contador 902)'"
+[ "$(st 902)" = pendente ] && ok "902 não bloqueou" || falha "902 bloqueou: $(st 902)"
+[ "$(tr '\n' ' ' < "$CALLS")" = "902 902 " ] && ok "com staging andando, a drenagem voltou ao ticket (progresso)" \
+  || falha "chamadas inesperadas: [$(tr '\n' ' ' < "$CALLS")]"
+
+echo
+echo "== 4. o limite vem do config =="
+jq '.sem_progresso_limite = 1' "$FILA/000-config.json" > "$TMP/c" && mv "$TMP/c" "$FILA/000-config.json"
+ticket_set_status "$FILA/902-t.md" bloqueado; ticket_commit "$FILA/902-t.md" "fixture: 902 fora"
+fx_ticket "$ORQ_EXEC_ROOT" 903
+git -C "$ORQ_EXEC_ROOT" add -- docs/fila/903-t.md && git -C "$ORQ_EXEC_ROOT" commit -q -m "fixture: 903"
+echo aborta > "$MODO"; disparo 11
+[ "$(st 903)" = bloqueado ] && ok "sem_progresso_limite=1 no config: bloqueia no 1º disparo" || falha "com limite 1, 903 devia bloquear; está $(st 903)"
+nota 903 | grep -q '^sem_progresso: 1 disparos sem progresso' && ok "nota com o limite do config" || falha "nota: $(nota 903)"
+jq '.sem_progresso_limite = "x"' "$FILA/000-config.json" > "$TMP/c" && mv "$TMP/c" "$FILA/000-config.json"
+[ "$(sem_progresso_limite)" = 3 ] && ok "valor inválido no config cai no padrão 3" || falha "limite inválido virou '$(sem_progresso_limite)'"
+jq 'del(.sem_progresso_limite)' "$FILA/000-config.json" > "$TMP/c" && mv "$TMP/c" "$FILA/000-config.json"
+[ "$(sem_progresso_limite)" = 3 ] && ok "chave ausente: padrão 3" || falha "limite ausente virou '$(sem_progresso_limite)'"
+
+echo
+if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
```

## 7a-4 · ocioso que diz por quê (evento OCIOSO e o motivo no STATUS)

sha: `3a62c5e`

### Vermelho (contra o código ANTES da mudança)

```
== 1. 244 atrás de 241b bloqueado, 232 atrás de 231 pendente (sem liberação) ==
  ok    nenhum executor chamado (nada processável)
  trilha: 
  FALHA sem 'OCIOSO pendentes=3' na trilha
  FALHA razão do 244 ausente
  FALHA razão do 232 ausente
  FALHA razão do 231 ausente
  FALHA esperava 1 OCIOSO, há 0
  ok    trilha continua uma linha por evento (nenhuma linha sem timestamp)
  FALHA ordem: DRENAGEM_FIM 
  STATUS.md:
    ORQUESTRADOR · 2026-09-21 12:11:52
    ESTADO   ocioso
    TICKET   —
    DESDE    —
    FASE     —
    FILA     3 pendente · 1 bloqueado · 1 done
    STAGING  93399e5 · push suprimido (publicar é humano neste repo)
    ÚLTIMO   —
    MOTIVO   sem ticket processável
  ok    STATUS mantém o motivo de sempre
  FALHA STATUS sem a razão do 244
  FALHA STATUS sem a razão do 232
  FALHA STATUS sem a razão do 231
  ok    DRENAGEM_FIM sem campo novo

== 2. pendente pulado por sem-progresso nesta drenagem ==
  trilha: 
  ok    250 foi tentado uma vez
  FALHA OCIOSO sem 250=sem_progresso
  FALHA STATUS: MOTIVO   sem progresso em 250

== 3. cooldown ativo: o liberado espera o cooldown ==
  trilha: 
  FALHA OCIOSO sem 250=cooldown:12:41
  FALHA 244 perdeu a razão real
  FALHA STATUS: MOTIVO   cooldown ~30min

== 4. fins que NÃO gravam OCIOSO ==
  ok    pausa: sem OCIOSO (quem pausou já sabe)
  ok    sem pendente nenhum: sem OCIOSO

14 CHECK(S) FALHARAM
rc=1
```

### Verde

```
== 1. 244 atrás de 241b bloqueado, 232 atrás de 231 pendente (sem liberação) ==
  ok    nenhum executor chamado (nada processável)
  trilha: 2026-09-21T12:12:50-0300 --- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
  ok    evento OCIOSO pendentes=3
  ok    244: dependência 241b em bloqueado
  ok    232: dependência 231 em pendente
  ok    231: liberação humano:migration-0031 ausente
  ok    UM evento por drenagem
  ok    trilha continua uma linha por evento (nenhuma linha sem timestamp)
  ok    OCIOSO vem antes do DRENAGEM_FIM
  STATUS.md:
    ORQUESTRADOR · 2026-09-21 12:12:50
    ESTADO   ocioso
    TICKET   —
    DESDE    —
    FASE     —
    FILA     3 pendente · 1 bloqueado · 1 done
    STAGING  394d211 · push suprimido (publicar é humano neste repo)
    ÚLTIMO   —
    MOTIVO   sem ticket processável: 231 sem liberação humano:migration-0031 · 232 espera 231 (pendente) · 244 espera 241b (bloqueado)
  ok    STATUS mantém o motivo de sempre
  ok    STATUS: 244 espera 241b (bloqueado)
  ok    STATUS: 232 espera 231 (pendente)
  ok    STATUS: 231 sem liberação
  ok    DRENAGEM_FIM sem campo novo

== 2. pendente pulado por sem-progresso nesta drenagem ==
  trilha: 2026-09-21T12:12:50-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=sem_progresso
  ok    250 foi tentado uma vez
  ok    250: pulado por sem-progresso
  ok    STATUS: 250 sem progresso

== 3. cooldown ativo: o liberado espera o cooldown ==
  trilha: 2026-09-21T12:12:51-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=cooldown:12:42
  ok    250: cooldown até 12:42
  ok    a razão de dependência vence o cooldown
  ok    STATUS: 250 em cooldown até 12:42

== 4. fins que NÃO gravam OCIOSO ==
  ok    pausa: sem OCIOSO (quem pausou já sabe)
  ok    sem pendente nenhum: sem OCIOSO

TODOS OS CHECKS PASSARAM
rc=0
```

### Diff

```diff
commit 3a62c5ec88e1f953185db6973bc0771cf29a75af

7a-4: ocioso que diz por quê (evento OCIOSO e o motivo no STATUS)

Quando a drenagem termina sem processável e há pendente, grava UM evento
OCIOSO pendentes=N com um campo <id>=<razão> por pendente, logo antes do
DRENAGEM_FIM: dependencia:<id>:<status>, liberacao:<token>, adiado_ate:<data>,
sem_progresso/adiado (pulado nesta drenagem) ou cooldown:<HH:MM>. O MOTIVO do
STATUS repete a razão em texto ("244 espera 241b (bloqueado)"). Pausa e fila
sem pendente não gravam.

A razão estrutural sai de razao_nao_processavel (lib.sh), que o
deps_resolvidas passa a usar com as mesmas linhas de log: "por que não roda"
e "roda ou não roda" são a mesma régua. cooldown_ate dá a hora de expiração.
Evento novo no vocabulário do CONTRATO 4.1.

Prova: test-ocioso.sh com 244 atrás de 241b bloqueado e 232 atrás de 231
pendente (este sem liberação). Antes, só "sem ticket processável".

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>


diff --git a/CONTRATO.md b/CONTRATO.md
index be3961c..98d10e2 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -187,9 +187,30 @@ Estes, e só estes, são emitidos hoje (`grep -rn '^\s*event ' scripts/`):
 | `DECISAO_PENDENTE` | `lib.sh:744` | `origem=` |
 | `ANOTACAO` | `lib.sh:274` | `nota=` |
 | `PREVOO_NOGO` | `local-loop.sh:prevoo_ou_sai` | `item=cat.0\|cat.1\|cat.6` |
+| `OCIOSO` | `local-loop.sh:drenar` (peça 7a-4) | `pendentes=` e um `<id>=<razão>` por pendente; ver abaixo |
 
 `motivo=` é sempre token curto e estável (grepável), nunca frase.
 
+**`OCIOSO`** (peça 7a-4) sai UMA vez por drenagem, logo antes do
+`DRENAGEM_FIM`, quando ela termina sem nenhum pendente processável e há ao menos
+um pendente. Não sai em pausa (quem pausou já sabe) nem com a fila sem
+pendente. Uma linha só, como todo evento; cada pendente vira um campo
+`<id>=<razão>`, e a razão é, nesta precedência:
+
+```
+--- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
+```
+
+- `dependencia:<id>:<status>` (ou `:inexistente`), `liberacao:<token>` e
+  `adiado_ate:<AAAA-MM-DD>` vêm de `razao_nao_processavel` (`lib.sh`), a mesma
+  régua do `deps_resolvidas`: "por que não roda" e "roda ou não roda" não
+  divergem. A razão estrutural vence as de baixo, que passam sozinhas;
+- `sem_progresso` / `adiado`: liberado, mas pulado nesta drenagem (peça 7a-2);
+- `cooldown:<HH:MM>`: liberado, mas o cooldown global vale até essa hora.
+
+O `MOTIVO` do STATUS repete a razão em texto (`244 espera 241b (bloqueado) ·
+231 sem liberação humano:migration-0031`), cortado em 6 com "e mais N".
+
 ### 4.2 A linha `GATE`
 
 Um evento por passagem de gates (`event_gate`, `executor.sh:530-545`). Campos,
diff --git a/scripts/orquestrador/lib.sh b/scripts/orquestrador/lib.sh
index 0da37bc..f08f7fc 100755
--- a/scripts/orquestrador/lib.sh
+++ b/scripts/orquestrador/lib.sh
@@ -524,33 +524,57 @@ liberacao_ok() {
   return 1
 }
 
-# deps_resolvidas <arquivo> -> 0 se o ticket está LIBERADO para rodar agora:
-# dependências satisfeitas E nenhum adiamento com data ainda vigente.
-deps_resolvidas() {
+# razao_nao_processavel <arquivo> -> vazio se o ticket está LIBERADO para rodar
+# agora; senão UMA razão curta, sem espaço, grepável:
+#   adiado_ate:<AAAA-MM-DD>          adiamento por orçamento ainda vigente
+#   liberacao:<token-inteiro>        dependência humana sem liberação
+#   dependencia:<id>:<status>        dependência que não está done
+#   dependencia:<id>:inexistente     dependência que não existe na fila
+# É a MESMA régua do `deps_resolvidas` (que a usa), para que "por que não
+# roda?" (evento OCIOSO, peça 7a-4) e "roda ou não roda?" nunca divirjam. Para
+# na primeira razão, na ordem das `dependencias` do ticket.
+razao_nao_processavel() {
   local file="$1" dep tf st ate
   # adiado_ate no futuro (adiamento por orçamento) = não processável hoje. Fica
   # aqui, e não em proximo_pendente, porque quem seleciona ticket são DOIS
   # lugares (executor e drenagem) e os dois já passam por esta função.
   ate="$(ticket_field "$file" '.adiado_ate // empty' 2>/dev/null || true)"
   if [ -n "$ate" ] && [[ "$ate" > "$(hoje)" ]]; then
-    log "  adiado até $ate: $(ticket_field "$file" '.id')"
-    return 1
+    printf 'adiado_ate:%s\n' "$ate"; return 0
   fi
   while IFS= read -r dep; do
     [ -z "$dep" ] && continue
     if [[ "$dep" == humano:* ]]; then
       # Token INTEIRO, com prefixo: é a forma que liberacoes.json guarda.
-      liberacao_ok "$dep" || { log "  dep pendente: $dep (sem liberação humana)"; return 1; }
+      liberacao_ok "$dep" || { printf 'liberacao:%s\n' "$dep"; return 0; }
     else
       tf="$(ticket_file_by_id "$dep")"
-      [ -n "$tf" ] || { log "  dep inexistente: $dep"; return 1; }
+      [ -n "$tf" ] || { printf 'dependencia:%s:inexistente\n' "$dep"; return 0; }
       st="$(ticket_field "$tf" '.status')"
-      [ "$st" = "done" ] || { log "  dep não-done: $dep (status=$st)"; return 1; }
+      [ "$st" = "done" ] || { printf 'dependencia:%s:%s\n' "$dep" "$st"; return 0; }
     fi
   done < <(ticket_field "$file" '.dependencias[]?')
   return 0
 }
 
+# deps_resolvidas <arquivo> -> 0 se o ticket está LIBERADO para rodar agora:
+# dependências satisfeitas E nenhum adiamento com data ainda vigente. A decisão
+# é a de `razao_nao_processavel`; aqui só se loga a razão.
+deps_resolvidas() {
+  local file="$1" r dep
+  r="$(razao_nao_processavel "$file")"
+  [ -n "$r" ] || return 0
+  case "$r" in
+    adiado_ate:*) log "  adiado até ${r#adiado_ate:}: $(ticket_field "$file" '.id')" ;;
+    liberacao:*)  log "  dep pendente: ${r#liberacao:} (sem liberação humana)" ;;
+    dependencia:*:inexistente)
+      dep="${r#dependencia:}"; log "  dep inexistente: ${dep%:*}" ;;
+    dependencia:*)
+      dep="${r#dependencia:}"; log "  dep não-done: ${dep%:*} (status=${dep##*:})" ;;
+  esac
+  return 1
+}
+
 # proximo_pendente [ids] -> caminho do primeiro ticket pendente com deps
 # resolvidas, PULANDO os ids da lista (separados por espaço).
 #
@@ -689,6 +713,15 @@ cooldown_active() {
   [ "$now" -lt "$until" ]
 }
 
+# cooldown_ate -> a hora (HH:MM, relógio local) em que o cooldown expira; vazio
+# se não há cooldown legível. `date -r` é o do macOS, `date -d @` o do GNU.
+cooldown_ate() {
+  local until
+  until="$(cat "$COOLDOWN_FILE" 2>/dev/null || true)"
+  case "$until" in ''|*[!0-9]*) return 0 ;; esac
+  date -r "$until" '+%H:%M' 2>/dev/null || date -d "@$until" '+%H:%M' 2>/dev/null || true
+}
+
 # cooldown_remaining_min -> minutos (arredondados p/ cima) até o cooldown expirar.
 cooldown_remaining_min() {
   local until now
diff --git a/scripts/orquestrador/local-loop.sh b/scripts/orquestrador/local-loop.sh
index ba9a47f..7e0a0e4 100755
--- a/scripts/orquestrador/local-loop.sh
+++ b/scripts/orquestrador/local-loop.sh
@@ -226,13 +226,70 @@ sem_progresso_causa() {
   uma_linha "$(printf '%s' "$c" | tr -d '\r')" 300
 }
 
+# --- OCIOSO QUE DIZ POR QUÊ (peça 7a-4) --------------------------------------
+# O CI ficou 12 dias parado com 4 pendentes presos atrás de dependências
+# bloqueadas, e a única coisa escrita, a cada disparo, era "sem ticket
+# processável". A pergunta que alguém faz nessa hora é "por que cada um não
+# roda?", e a resposta estava no disco o tempo todo. Agora ela vai para a
+# trilha (evento OCIOSO) e para o STATUS.
+#
+# ocioso_razoes <tentados> <adiados> -> "<id> <razao>" por pendente, uma linha
+# cada; rc 1 (saída descartável) se algum pendente for processável agora.
+# Razão, nesta ordem de precedência:
+#   a de `razao_nao_processavel` (dependência, liberação, adiado_ate) — é a
+#     razão ESTRUTURAL e vence as outras, que passam sozinhas;
+#   sem_progresso / adiado — pulado nesta drenagem (memória da 7a-2);
+#   cooldown:<HH:MM> — liberado, mas o cooldown global ainda vale.
+ocioso_razoes() {
+  local f id r tent=" ${1:-} " adi=" ${2:-} " ate=''
+  cooldown_active && ate="$(cooldown_ate)"
+  for f in $(ticket_files); do
+    [ "$(ticket_field "$f" '.status')" = pendente ] || continue
+    id="$(ticket_field "$f" '.id')"
+    r="$(razao_nao_processavel "$f" 2>/dev/null || true)"
+    if [ -z "$r" ]; then
+      case "$adi" in *" $id "*) r=adiado ;; esac
+    fi
+    if [ -z "$r" ]; then
+      case "$tent" in *" $id "*) r=sem_progresso ;; esac
+    fi
+    if [ -z "$r" ] && cooldown_active; then r="cooldown:${ate:-?}"; fi
+    [ -n "$r" ] || return 1
+    printf '%s %s\n' "$id" "$r"
+  done
+  return 0
+}
+
+# ocioso_legivel <linhas de ocioso_razoes> -> a mesma coisa para humano, numa
+# linha: "244 espera 241b (bloqueado) · 231 sem liberação humano:x". Corta em
+# 6 e diz quantos ficaram de fora: o STATUS é para ler de relance.
+ocioso_legivel() {
+  printf '%s\n' "$1" | awk '
+    NF < 2 { next }
+    {
+      id = $1; r = $2; t = ""
+      if (r ~ /^dependencia:/) {
+        sub(/^dependencia:/, "", r); n = split(r, p, ":")
+        t = id " espera " p[1] " (" p[n] ")"
+      } else if (r ~ /^liberacao:/)  { sub(/^liberacao:/, "", r);  t = id " sem liberação " r }
+      else if (r ~ /^adiado_ate:/)   { sub(/^adiado_ate:/, "", r); t = id " adiado até " r }
+      else if (r ~ /^cooldown:/)     { sub(/^cooldown:/, "", r);   t = id " em cooldown até " r }
+      else if (r == "sem_progresso") { t = id " sem progresso" }
+      else if (r == "adiado")        { t = id " adiado" }
+      else                           { t = id " " r }
+      n_ok++
+      if (n_ok <= 6) out = out (out == "" ? "" : " · ") t
+    }
+    END { if (n_ok > 6) out = out " · e mais " (n_ok - 6); printf "%s", out }'
+}
+
 # --- DRENAGEM ----------------------------------------------------------------
 drenar() {
   local stwt drenados=0 bloqueados=0 adiados=0 refatiados=0 prox prox_id st t0 dur orc motivo_ocioso=''
   local mortos_antes mortos processados
   # MEMÓRIA DA DRENAGEM (peça 7a-2): ids tentados que não avançaram, separados
   # por espaço (bash 3.2: sem array associativo). Só vale dentro desta chamada.
-  local tentados='' sem_progresso=0
+  local tentados='' sem_progresso=0 adiados_sc='' razoes motivo_status campos id r
   # O que a drenagem lê do executor ALÉM do status (peça 7a-3).
   local ev_antes sha_antes sha_depois nota_antes nota_depois exe_out exe_rc evs sp n lim causa primeira ultima
   stwt="$(ensure_staging_worktree)"
@@ -349,6 +406,7 @@ drenar() {
         # Adiado sem cooldown: não é defeito do ticket e não conta. Entra na
         # memória mesmo assim, senão a drenagem o reescolheria em seguida.
         tentados="$tentados$prox_id "
+        adiados_sc="$adiados_sc$prox_id "
         adiados=$((adiados + 1))
         say "  ticket $prox_id adiado sem cooldown — não conta como sem progresso; segue para o próximo não tentado"
       else
@@ -376,9 +434,25 @@ drenar() {
   done
   dur=$(( ($(date +%s) - t0 + 30) / 60 ))
   say "drenagem encerrada: $drenados aprovado(s) e mergeado(s)"
+  # OCIOSO (peça 7a-4): a drenagem acabou sem processável e há pendente. UM
+  # evento por drenagem, com a razão de cada pendente — uma linha, como toda a
+  # trilha. Pausa não entra: é a palavra do humano, e quem pausou já sabe.
+  motivo_status="${motivo_ocioso:-drenagem encerrada}"
+  if [ "$motivo_ocioso" != pausado ] && razoes="$(ocioso_razoes "$tentados" "$adiados_sc")" && [ -n "$razoes" ]; then
+    campos=''; n=0
+    while read -r id r; do
+      [ -n "$id" ] || continue
+      campos="$campos $id=$r"; n=$((n + 1))
+    done <<EOF
+$razoes
+EOF
+    event '---' OCIOSO "pendentes=$n" "${campos# }"
+    motivo_status="$motivo_status: $(ocioso_legivel "$razoes")"
+    say "ocioso: $(ocioso_legivel "$razoes")"
+  fi
   event '---' DRENAGEM_FIM "aprovados=$drenados" "bloqueados=$bloqueados" "adiados=$adiados" \
     "refatiar=$refatiados" "sem_progresso=$sem_progresso" "dur=${dur}min"
-  status_set "estado=ocioso" "fase=—" "ticket=—" "motivo=${motivo_ocioso:-drenagem encerrada}"
+  status_set "estado=ocioso" "fase=—" "ticket=—" "motivo=$motivo_status"
 
   # PEÇA 13: notifica só quando houve o que notificar. A decisão (e a memória do
   # "fila vazia já avisada") mora no lib.sh; aqui só se conta o que aconteceu.
diff --git a/scripts/orquestrador/test-ocioso.sh b/scripts/orquestrador/test-ocioso.sh
new file mode 100644
index 0000000..46ffb51
--- /dev/null
+++ b/scripts/orquestrador/test-ocioso.sh
@@ -0,0 +1,113 @@
+#!/usr/bin/env bash
+# test-ocioso.sh — a drenagem que termina sem processável DIZ POR QUÊ (peça 7a-4).
+#
+# O caso real (ci-processaveis-21-09): 12 dias parado com 4 pendentes presos
+# atrás de dependências bloqueadas, e a única coisa escrita era "sem ticket
+# processável". Aqui a mesma forma de fila:
+#   241b bloqueado; 244 depende de 241b;
+#   231 depende de uma liberação humana ausente; 232 depende de 231 (pendente).
+# Nenhum é processável: a drenagem grava UM evento OCIOSO pendentes=N com a
+# razão de cada pendente, e o STATUS diz a mesma coisa em texto legível.
+# Depois: pulado por sem-progresso, cooldown, e os fins que NÃO gravam OCIOSO.
+#
+# Uso: bash scripts/orquestrador/test-ocioso.sh
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
+fx_ticket "$ORQ_EXEC_ROOT" 241b '[]' bloqueado
+fx_ticket "$ORQ_EXEC_ROOT" 244 '["241b"]'
+fx_ticket "$ORQ_EXEC_ROOT" 231 '["humano:migration-0031"]'
+fx_ticket "$ORQ_EXEC_ROOT" 232 '["230b", "231"]'
+fx_ticket "$ORQ_EXEC_ROOT" 230b '[]' done
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
+CALLS="$TMP/calls"; : > "$CALLS"
+
+ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
+merge_em_alvo() { return 0; }
+cleanup_frente() { return 0; }
+run_executor_once() {
+  local id; id="$(ticket_field "$2" '.id')"
+  echo "$id" >> "$CALLS"
+  echo "[orq ERRO] preflight: árvore de execução suja (ticket $id)" >&2
+  return 1
+}
+ultimo_ocioso() { grep ' OCIOSO ' "$TRILHA" 2>/dev/null | tail -1; }
+n_ocioso()      { grep -c ' OCIOSO ' "$TRILHA" 2>/dev/null || true; }
+
+echo "== 1. 244 atrás de 241b bloqueado, 232 atrás de 231 pendente (sem liberação) =="
+drenar > "$TMP/out.1" 2>&1
+[ ! -s "$CALLS" ] && ok "nenhum executor chamado (nada processável)" || falha "executor chamado: $(tr '\n' ' ' < "$CALLS")"
+oc="$(ultimo_ocioso)"
+echo "  trilha: $oc"
+case "$oc" in *" --- OCIOSO pendentes=3 "*) ok "evento OCIOSO pendentes=3" ;; *) falha "sem 'OCIOSO pendentes=3' na trilha" ;; esac
+case "$oc" in *" 244=dependencia:241b:bloqueado"*) ok "244: dependência 241b em bloqueado" ;; *) falha "razão do 244 ausente" ;; esac
+case "$oc" in *" 232=dependencia:231:pendente"*) ok "232: dependência 231 em pendente" ;; *) falha "razão do 232 ausente" ;; esac
+case "$oc" in *" 231=liberacao:humano:migration-0031"*) ok "231: liberação humano:migration-0031 ausente" ;; *) falha "razão do 231 ausente" ;; esac
+[ "$(n_ocioso)" = 1 ] && ok "UM evento por drenagem" || falha "esperava 1 OCIOSO, há $(n_ocioso)"
+linhas_sem_ts="$(grep -cvE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' "$TRILHA" || true)"
+[ "$linhas_sem_ts" = 0 ] && ok "trilha continua uma linha por evento (nenhuma linha sem timestamp)" \
+  || falha "$linhas_sem_ts linha(s) sem timestamp na trilha"
+ordem="$(awk '{print $3}' "$TRILHA" | grep -E 'OCIOSO|DRENAGEM_FIM' | tr '\n' ' ')"
+[ "$ordem" = "OCIOSO DRENAGEM_FIM " ] && ok "OCIOSO vem antes do DRENAGEM_FIM" || falha "ordem: $ordem"
+echo "  STATUS.md:"; sed 's/^/    /' "$FILA/runs/STATUS.md"
+mot="$(grep '^MOTIVO' "$FILA/runs/STATUS.md")"
+case "$mot" in *"sem ticket processável"*) ok "STATUS mantém o motivo de sempre" ;; *) falha "STATUS perdeu o motivo" ;; esac
+case "$mot" in *"244 espera 241b (bloqueado)"*) ok "STATUS: 244 espera 241b (bloqueado)" ;; *) falha "STATUS sem a razão do 244" ;; esac
+case "$mot" in *"232 espera 231 (pendente)"*) ok "STATUS: 232 espera 231 (pendente)" ;; *) falha "STATUS sem a razão do 232" ;; esac
+case "$mot" in *"231 sem liberação humano:migration-0031"*) ok "STATUS: 231 sem liberação" ;; *) falha "STATUS sem a razão do 231" ;; esac
+fim="$(grep ' DRENAGEM_FIM ' "$TRILHA" | tail -1)"
+case "$fim" in *motivo=*) falha "DRENAGEM_FIM mudou de forma" ;; *) ok "DRENAGEM_FIM sem campo novo" ;; esac
+
+echo
+echo "== 2. pendente pulado por sem-progresso nesta drenagem =="
+fx_ticket "$ORQ_EXEC_ROOT" 250
+git -C "$ORQ_EXEC_ROOT" add -- docs/fila/250-t.md && git -C "$ORQ_EXEC_ROOT" commit -q -m "fixture: 250"
+: > "$CALLS"; drenar > "$TMP/out.2" 2>&1
+oc="$(ultimo_ocioso)"; echo "  trilha: $oc"
+[ "$(tr '\n' ' ' < "$CALLS")" = "250 " ] && ok "250 foi tentado uma vez" || falha "chamadas: $(tr '\n' ' ' < "$CALLS")"
+case "$oc" in *" --- OCIOSO pendentes=4 "*" 250=sem_progresso"*) ok "250: pulado por sem-progresso" ;; *) falha "OCIOSO sem 250=sem_progresso" ;; esac
+grep -q '^MOTIVO .*250 sem progresso' "$FILA/runs/STATUS.md" && ok "STATUS: 250 sem progresso" || falha "STATUS: $(grep '^MOTIVO' "$FILA/runs/STATUS.md")"
+
+echo
+echo "== 3. cooldown ativo: o liberado espera o cooldown =="
+agora="$(date +%s)"; ate=$((agora + 1800))
+mkdir -p "$(dirname "$COOLDOWN_FILE")"; echo "$ate" > "$COOLDOWN_FILE"
+hora="$(date -r "$ate" '+%H:%M' 2>/dev/null || date -d "@$ate" '+%H:%M')"
+: > "$CALLS"; drenar > "$TMP/out.3" 2>&1
+oc="$(ultimo_ocioso)"; echo "  trilha: $oc"
+case "$oc" in *" 250=cooldown:$hora"*) ok "250: cooldown até $hora" ;; *) falha "OCIOSO sem 250=cooldown:$hora" ;; esac
+case "$oc" in *" 244=dependencia:241b:bloqueado"*) ok "a razão de dependência vence o cooldown" ;; *) falha "244 perdeu a razão real" ;; esac
+grep -q "^MOTIVO .*250 em cooldown até $hora" "$FILA/runs/STATUS.md" && ok "STATUS: 250 em cooldown até $hora" || falha "STATUS: $(grep '^MOTIVO' "$FILA/runs/STATUS.md")"
+rm -f "$COOLDOWN_FILE"
+
+echo
+echo "== 4. fins que NÃO gravam OCIOSO =="
+antes="$(n_ocioso)"
+: > "$FILA/PAUSAR"; drenar > "$TMP/out.4" 2>&1; rm -f "$FILA/PAUSAR"
+[ "$(n_ocioso)" = "$antes" ] && ok "pausa: sem OCIOSO (quem pausou já sabe)" || falha "pausa gravou OCIOSO"
+for id in 244 231 232 250; do ticket_set_status "$FILA/$id-t.md" done; done
+drenar > "$TMP/out.5" 2>&1
+[ "$(n_ocioso)" = "$antes" ] && ok "sem pendente nenhum: sem OCIOSO" || falha "fila sem pendente gravou OCIOSO"
+
+echo
+if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
```

## 7a-5 · docs

sha: `97e492c`. Peça de documentação, sem vermelho.

```diff
commit 97e492c260b4ae74522b3a1444527de728af4dbc

7a-5: docs da etapa 7a (PECAS, CHANGELOG e CONTRATO)

PECAS: 7a-1 a 7a-4 em FEITAS com sha, evidência e teste. CHANGELOG: seção
da etapa 7a. CONTRATO: runs/<id>/.sem-progresso em 1.3; DRENAGEM_FIM com
refatiar= e sem_progresso=, BLOQUEADO motivo=sem_progresso n= limite= e a
regra do contador em 4.1; a chave sem_progresso_limite em 8.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>


diff --git a/CHANGELOG.md b/CHANGELOG.md
index cf09bba..b4b2380 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -598,3 +598,35 @@ Medido no Actus de novo (mesmo comando, só leitura, árvore em 21 linhas de `gi
 6b —, e **uma linha nova** na previsão de recusa, a do tsx, com `pnpm add -D tsx@^4.19.0`
 escolhido pelo `pnpm-lock.yaml` de lá. Relatório:
 `~/orq-sessoes/relatorio-kit-etapa6c.md`.
+
+### Etapa 7a · drenagem que não para e diz por quê
+
+Quatro peças de motor, quatro commits, saídas da revisão Comarka x kit
+(`~/orq-sessoes/revisao-comarka-vs-kit.md`, linha G1 e itens 1 e 2). O gatilho foi o CI: 12
+dias parado com 4 pendentes presos atrás de dependências bloqueadas, e a trilha dizendo só
+"sem ticket processável" a cada disparo.
+
+- **7a-1** `f6cd542`: `test-drenagem.sh` monta fila e config em heredoc num `mktemp -d`.
+  Na raiz do kit ele saía rc 2 no `cp` do config, e o assert "seguiu para o próximo" nunca
+  tinha rodado; agora sai rc 0 e afirma as duas chamadas ao executor.
+- **7a-2** `05b2898`: o ticket que não avança entra na memória da drenagem e ela segue para
+  o próximo não tentado, em vez de encerrar. `DRENAGEM_FIM` ganha `sem_progresso=`. Porte do
+  `test-drenagem-sem-progresso.sh` do Comarka: 3 chamadas numa drenagem (antes, 1).
+- **7a-3** `6e458e1`: `runs/<id>/.sem-progresso` persiste entre disparos e, no limite
+  (`sem_progresso_limite`, padrão 3), bloqueia o ticket COMMITADO, com a última causa
+  tirada do desfecho do executor e `BLOQUEADO motivo=sem_progresso` na trilha. Adiamento não
+  conta, staging que avança zera. Casos 1 a 4 do `test-disjuntor.sh` do Comarka portados
+  (antes, nunca bloqueava).
+- **7a-4** `3a62c5e`: evento `OCIOSO pendentes=N` com a razão de cada pendente, e a mesma
+  razão no `MOTIVO` do STATUS. `razao_nao_processavel` é a régua única, usada também pelo
+  `deps_resolvidas`.
+
+Os testes novos (`test-drenagem-sem-progresso.sh`, `test-sem-progresso-limite.sh`,
+`test-ocioso.sh`) e o molde `test-fixture-drenagem.sh` rodam no bash 3.2 do macOS. Eles
+ainda NÃO estão na lista do `scripts/kit/test-shell.sh`, que ficou fora do escopo desta
+etapa (7b).
+
+O que o CI faz diferente: a primeira drenagem depois da instalação grava um `OCIOSO` com
+os 4 pendentes (medido sobre uma cópia da fila, com o `git status` do CI em 0 linhas antes e
+depois), e um ticket que abortar antes do agente para de segurar a fila e, no terceiro
+disparo, vai para `bloqueado`. Relatório: `~/orq-sessoes/relatorio-kit-etapa7a.md`.
diff --git a/CONTRATO.md b/CONTRATO.md
index 98d10e2..3b37217 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -71,6 +71,7 @@ se ela sujar a árvore, o preflight do run SEGUINTE morre.
 | `custo.json` | ledger de custo (§5); caminho vem de `cfg .orcamento.custo_file` |
 | `<id>/meta.json` | array de tentativas daquele ticket (§5.2) |
 | `<id>/attempt-N/` | evidência de UMA tentativa (§5.3) |
+| `<id>/.sem-progresso` | contador persistente de disparos sem progresso, `N\|primeira\|ultima` (peça 7a-3, §4.1 `BLOQUEADO`) |
 | `.local-loop.lock` | lock da drenagem (pid + idade) |
 | `.cooldown-until` | adiamento por limite (`lib.sh:567`) |
 | `.notificacao-fila-vazia` | marca de notificação já emitida |
@@ -168,7 +169,7 @@ Estes, e só estes, são emitidos hoje (`grep -rn '^\s*event ' scripts/`):
 | Evento | Onde | Campos que carrega |
 |---|---|---|
 | `DRENAGEM_INICIO` | `local-loop.sh:129,241` | `alvo=` `processaveis=` · ou `motivo=pausado` |
-| `DRENAGEM_FIM` | `local-loop.sh:205,242` | `aprovados=` `bloqueados=` `adiados=` `dur=` [`motivo=`] |
+| `DRENAGEM_FIM` | `local-loop.sh:drenar,main_local_loop` | `aprovados=` `bloqueados=` `adiados=` `refatiar=` `sem_progresso=` `dur=` · ou, na pausa, `aprovados=` `bloqueados=` `adiados=` `dur=` `motivo=pausado` |
 | `INICIO` | `executor.sh:1032` | `attempt=` `model=` |
 | `WORKTREE` | `executor.sh:1026` | `modo=reaproveitada` `de=` `base=` |
 | `GATE` | `executor.sh:539` | ver §4.2 |
@@ -176,7 +177,7 @@ Estes, e só estes, são emitidos hoje (`grep -rn '^\s*event ' scripts/`):
 | `APROVADO` | `executor.sh:1048` | `merge=aguardando` `dur=` `attempt=` |
 | `REPROVADO` | `executor.sh:1057` | `motivo=` `attempt=` `diff=` |
 | `ADIADO` | `executor.sh:1039` | `motivo=` `attempt=` |
-| `BLOQUEADO` | `executor.sh:1064`, `local-loop.sh:181` | `motivo=` [`attempt=`] |
+| `BLOQUEADO` | `executor.sh:1064`, `local-loop.sh:drenar` | `motivo=` [`attempt=`] · da drenagem: `motivo=merge_falhou`, ou `motivo=sem_progresso` `n=` `limite=` |
 | `RETRY` | `executor.sh:1077` | `attempt=` `model=` `motivo=` |
 | `REFATIAR` | `executor.sh:896` | `motivo=` `arquivos=` |
 | `MERGE` | `local-loop.sh:173` | `alvo=` `sha=` |
@@ -191,6 +192,25 @@ Estes, e só estes, são emitidos hoje (`grep -rn '^\s*event ' scripts/`):
 
 `motivo=` é sempre token curto e estável (grepável), nunca frase.
 
+**`DRENAGEM_FIM sem_progresso=`** (peça 7a-2) conta as voltas em que o ticket
+seguiu `pendente` sem cooldown. Até a 7a-2 a primeira delas ENCERRAVA a
+drenagem; agora o id entra numa memória da drenagem (`proximo_pendente
+"<ids>"` o pula) e ela segue para o próximo não tentado, até não sobrar
+processável fora da memória. O `MOTIVO` do STATUS lista todos os pulados
+(`sem progresso em 901 902`).
+
+**`BLOQUEADO motivo=sem_progresso n=<N> limite=<L>`** (peça 7a-3): a mesma
+volta sem progresso soma em `runs/<id>/.sem-progresso`, que PERSISTE entre
+disparos. No limite (`sem_progresso_limite`, §8) o ticket vai para
+`bloqueado` pelo `ticket_set` + `ticket_commit` (commitado, nunca só no
+disco), com `notas_status` = `sem_progresso: <N> disparos sem progresso entre
+<primeira> e <ultima>; última causa: <causa>`. A causa é o DESFECHO do
+executor na trilha (`EXECUTOR_MORREU` vira `executor morreu (rc=, fase=)` mais
+a linha `[orq ERRO]`/`fatal:` da saída); sem desfecho, a nota nova, e só por
+último a linha com `ERRO|fatal|FAIL`. Não conta: adiamento (com cooldown, ou
+com `ADIADO`/nota `adiado` sem cooldown). Zera: o ticket sair de `pendente`, ou
+a branch alvo avançar na vez dele.
+
 **`OCIOSO`** (peça 7a-4) sai UMA vez por drenagem, logo antes do
 `DRENAGEM_FIM`, quando ela termina sem nenhum pendente processável e há ao menos
 um pendente. Não sai em pausa (quem pausou já sabe) nem com a fila sem
@@ -447,6 +467,15 @@ O snapshot diz `push suprimido (publicar é humano neste repo)` **sempre**
 chave como registro da decisão é legítimo; tratá-la como o que segura o push é
 confiar num interruptor que não está ligado a nada.
 
+**`sem_progresso_limite`** (peça 7a-3, opcional, padrão **3**): quantos
+disparos seguidos um ticket pode seguir `pendente` sem progresso antes de ir
+para `bloqueado` (§4.1, `BLOQUEADO motivo=sem_progresso`). Lida a cada volta
+(`local-loop.sh:sem_progresso_limite`); ausente, zero ou não numérica vale 3.
+Está em `config-chaves.ts` e no formulário v2 (`doutrina/templates/config.json`),
+e **não** na tabela de chaves novas do `--migrar` (`config-tabela.ts:NOVAS`): um
+repo instalado segue com o padrão do código sem que a migração mude o proposto
+dele.
+
 **`000-config.proposto.json` é NOME RESERVADO do instalador.** É onde o
 `migrar-config.ts --propor` escreve e de onde o `--aplicar` lê. Desde a peça M1
 o `--propor` **RECUSA** (rc 1) se o arquivo já existir, e o `instalar.sh
diff --git a/docs/PECAS.md b/docs/PECAS.md
index bc645fc..735e64b 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -692,6 +692,56 @@
   *O que o CI faz diferente:* NADA — nenhuma linha de motor mudou. O config do CI segue com
   `false` e o `fixture/` do kit com `true`: dois repos, dois valores, um comportamento.
 
+- **7a-1 · `test-drenagem.sh` com fixture própria** (`f6cd542`). Fila e config nascem em
+  heredoc dentro de `mktemp -d`; nada é copiado de `docs/fila` do checkout. O checkout real
+  segue lido para uma coisa só, a prova de que a branch protegida não se move.
+  *Evidência:* `~/orq-sessoes/revisao-comarka-vs-kit.md` §3 item 1; rodado na raiz do kit (que
+  não tem `docs/fila`) o `cp` do config falhava e o script saía rc 2, então o assert "seguiu
+  para o próximo ticket" nunca tinha rodado fora de um fixture vendorizado.
+  *Teste:* o próprio script, rc 0 na raiz do kit; o assert passou a afirmar as duas chamadas
+  ao executor, na ordem da fila, em vez de só a ausência da frase "sem progresso".
+
+- **7a-2 · a drenagem pula o ticket que não avança** (`05b2898`). O ticket que segue
+  `pendente` sem cooldown entra na memória da drenagem (string separada por espaço, bash
+  3.2), `proximo_pendente "<ids>"` passa a pulá-lo, e o `break` só acontece quando não resta
+  processável fora da memória. `DRENAGEM_FIM` ganha `sem_progresso=`, que também entra em
+  `processados`; o motivo ocioso lista todos os pulados. O executor não reescolhe: recebe
+  `--ticket` (`executor.sh:1193`).
+  *Evidência:* revisão §2 linha G1 e §3 item 2; `local-loop.sh:197-201` encerrava a drenagem
+  INTEIRA no primeiro ticket sem progresso.
+  *Teste:* `scripts/orquestrador/test-drenagem-sem-progresso.sh` (porte do Comarka): 901 e
+  902 abortam antes do agente, 903 é saudável. 3 chamadas numa drenagem e o 903 vira `done`;
+  **antes, 1 chamada**.
+
+- **7a-3 · contador persistente de sem-progresso** (`6e458e1`). `runs/<id>/.sem-progresso`
+  soma entre disparos; no limite (`sem_progresso_limite`, padrão 3) o ticket vai para
+  `bloqueado` pelo `ticket_commit`, com `notas_status` citando a última causa, e a trilha
+  ganha `BLOQUEADO motivo=sem_progresso n= limite=`. Adiamento não conta; sair de `pendente`
+  ou a branch alvo avançar zera. A causa vem do desfecho do executor na trilha
+  (`EXECUTOR_MORREU` mais a linha `[orq ERRO]`/`fatal:`), e só como reserva da linha com
+  `ERRO|fatal|FAIL`: os dois defeitos do disjuntor do Comarka (status sem commit, causa pela
+  última linha) ficaram de fora. A chave está em `config-chaves.ts` e no formulário v2, e
+  não em `NOVAS`: o `--migrar` não muda o proposto de quem já está instalado.
+  *Evidência:* revisão §3 item 2 e §5 peça 2; Comarka 440 com 19 execuções vazias.
+  *Teste:* `scripts/orquestrador/test-sem-progresso-limite.sh`, casos 1 a 4 do
+  `test-disjuntor.sh` do Comarka portados ao `drenar()` do kit (bloqueia no 3º disparo e
+  COMMITA; adiamento com e sem cooldown não conta; staging que avança zera; limite do config,
+  inválido cai em 3). **Antes, nunca bloqueava.**
+
+- **7a-4 · ocioso que diz por quê** (`3a62c5e`). Quando a drenagem termina sem processável
+  e há pendente, UM evento `OCIOSO pendentes=N` com um `<id>=<razão>` por pendente
+  (`dependencia:<id>:<status>`, `liberacao:<token>`, `adiado_ate:<data>`, `sem_progresso`,
+  `adiado`, `cooldown:<HH:MM>`), e o `MOTIVO` do STATUS diz o mesmo em texto. A razão
+  estrutural sai de `razao_nao_processavel`, que o `deps_resolvidas` passou a usar: "por que
+  não roda" e "roda ou não roda" são a mesma régua. Pausa e fila sem pendente não gravam.
+  *Evidência:* `~/orq-sessoes/ci-processaveis-21-09.txt`, o CI 12 dias parado com 4
+  pendentes e só "sem ticket processável". Rodado sobre uma CÓPIA da fila do CI:
+  `232 espera 231 (bloqueado) · 236 espera 231 (bloqueado) · 243 espera 242 (bloqueado) ·
+  244 espera 242 (bloqueado)`.
+  *Teste:* `scripts/orquestrador/test-ocioso.sh`, com 244 atrás de 241b bloqueado e 232 atrás
+  de 231 pendente (sem liberação), mais sem-progresso, cooldown e os fins que não gravam.
+  **Antes, só "sem ticket processável".**
+
 
 ## PENDENTES
 
```

## Fechamento

### Suítes

Resumo: o vitest tem 1 falha e o test-instalar.sh tem 2, e as três **já falham em `main`**
(`6ff6f29`, rodado numa cópia por `git archive`). As três dependem de arquivo real de outro
repo nesta máquina: o config do actus-saas, e o ticket 306 do comarka-operacional. Na cópia
de `main` o vitest mostra uma falha a mais, `orquestrador-launchd-config`, que é artefato da
cópia não ser repo git. O test-shell.sh sai rc 0.

Os três testes novos NÃO estão no `scripts/kit/test-shell.sh`, porque ele ficou fora do
escopo de escrita; rodados à parte, no bash 3.2, saem rc 0 (saídas logo abaixo das suítes).

#### vitest (branch kit/etapa7a)

```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7a

 ✓ test/orquestrador-enforcement.test.ts (47 tests) 23ms
 ✓ test/orquestrador-enforcement-actus.test.ts (104 tests) 36ms
 ✓ test/orquestrador-prevoo.test.ts (34 tests) 18ms
 ✓ test/orquestrador-decisao.test.ts (37 tests) 6ms
 ✓ test/orquestrador-liberar-migrar.test.ts (37 tests) 2842ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > o resultado da migração PASSA no leitor do motor: todo token resolve 360ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > libera, sai 0 e o arquivo passa a ter o token 322ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > o token liberado DESTRAVA o ticket que dependia dele 570ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > duplicata: rc 1, RECUSADO, e o arquivo NÃO muda 637ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > arquivo em v1: recusa e manda migrar, sem tocar em nada 303ms
stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > actus-saas: em TODO ticket migrado, só o bloco muda
actus-saas: 0 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > comarka-operacional: em TODO ticket migrado, só o bloco muda
comarka-operacional: 31 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > conteudos-infinitos: em TODO ticket migrado, só o bloco muda
conteudos-infinitos: 0 ticket(s) migrados

 ✓ test/orquestrador-migrar-tickets.test.ts (32 tests) 2980ms
   ✓ a prosa não se move UM BYTE > comarka-operacional: a fila no disco do repo NÃO é tocada 402ms
   ✓ os dois renomes, na posição original da chave > a fila real do Comarka: UMA linha muda por ticket, e é sempre a mesma 406ms
   ✓ --dry-run e --aplicar > --dry-run não escreve 451ms
   ✓ --dry-run e --aplicar > --aplicar grava e NÃO deixa .bak (o ticket é versionado; o git é o backup) 374ms
   ✓ --dry-run e --aplicar > rodar de novo é no-op 446ms
   ✓ --dry-run e --aplicar > o migrado continua parseável pelo leitor do motor 441ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 4236ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 496ms
   ✓ a CLI é o contrato que `orq validar` repassa > com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>` 411ms
   ✓ a CLI é o contrato que `orq validar` repassa > --relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação 390ms
   ✓ a CLI é o contrato que `orq validar` repassa > --pendentes pega SÓ os pendentes 408ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 828ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 405ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > rc 1 e a linha de violação, chamado PELO symlink 463ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 816ms
 ✓ test/orquestrador-gates.test.ts (29 tests) 1207ms
   ✓ critérios do executor — strip de ANSI > saída COLORIDA casa o mesmo critério que a saída limpa 314ms
 ✓ test/doutrina-v2.test.ts (30 tests) 11ms
 ✓ test/orquestrador-toolchain-tsx.test.ts (30 tests) 4481ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > tsx_local_ok responde pelo binário DO REPO, e é `test -x` 440ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > COM tsx no lugar, o guard passa e o loop segue para o kill switch 359ms
   ✓ cat.7 · toolchain > `orq prevoo` no fixture continua GO, com a cat.7 na saída 313ms
   ✓ instalar.sh · recusa repo sem tsx > com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx) 809ms
 ✓ test/orquestrador-refatiar.test.ts (39 tests) 5457ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > diff acima do cap: refatiar, contaComoRetry false 422ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > arquivo fora da allowlist (enforcement): refatiar 373ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > zona proibida entra pelo MESMO campo — é a barreira que classifica 404ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > refatiar NÃO gera retry (o plano diz deveTentar=false) 419ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry 736ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar 382ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa 338ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a mesma pendência duas vezes não vira duas linhas 595ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > NEGATIVO: origem planejador NÃO gera decisão pendente (volta ao lote da frente) 363ms
   ✓ o retry recebe o JSON, não o texto livre > o CLI monta o JSON a partir do rundir de verdade 373ms
 ✓ test/orquestrador-lock.test.ts (34 tests) 9ms
 ✓ test/orq-cli.test.ts (42 tests) 5900ms
   ✓ orq validar — o gate de ticket, com o rc repassado > fila limpa: rc 0 e nenhuma linha 345ms
 ✓ test/orquestrador-tools-derivadas.test.ts (32 tests) 8ms
 ✓ test/orquestrador-launchd-config.test.ts (15 tests) 792ms
   ✓ peça K6e · com --permitir-tmp, a instalação inteira passa pelo STUB > chama bootout e bootstrap no stub, e o launchd real nunca é tocado 339ms
 ✓ test/orquestrador-juiz.test.ts (39 tests) 6588ms
   ✓ LIXO é adiado, nunca reprovado > o parse do CLI sai com rc 3 (o código que o executor lê como ADIADO) 484ms
   ✓ LIXO é adiado, nunca reprovado > a fronteira está no decisao.ts: juizIlegivel ADIA e NÃO conta retry 389ms
   ✓ LIXO é adiado, nunca reprovado > NEGATIVO: sem o campo, o mesmo sinal segue aprovando como antes 361ms
   ✓ modelo por classe de risco (custo-e-contexto §7) > o CLI devolve classe + modelo juntos (é o que o shell consome) 449ms
   ✓ ponta a ponta com --stub-juiz > veredito aprovado: JUIZ_APROVADO=true e evidência gravada 801ms
   ✓ ponta a ponta com --stub-juiz > o prompt gravado carrega o critério avaliador e o bloco anti-afrouxamento 743ms
   ✓ ponta a ponta com --stub-juiz > veredito reprovado: motivo e criterios_falhos ficam disponíveis para o retry 741ms
   ✓ ponta a ponta com --stub-juiz > lixo: ILEGIVEL=1, nenhum veredito.json, e o CRU continua lá para auditoria 676ms
   ✓ ponta a ponta com --stub-juiz > a trilha registra o veredito, a classe e o modelo, com attempt 1-based 821ms
   ✓ ponta a ponta com --stub-juiz > o risco sobe pelo objetivo e leva o modelo forte junto 663ms
   ✓ ponta a ponta com --stub-juiz > NEGATIVO: --dry sem --stub-juiz pula o juiz e não inventa veredito 453ms
 ✓ test/orquestrador-piso-tools.test.ts (23 tests) 7ms
 ✓ test/orquestrador-agendamento.test.ts (21 tests) 170ms
 ✓ test/orquestrador-trilha.test.ts (22 tests) 2574ms
   ✓ o merge commit carrega o trailer, e o git o devolve > git log --grep acha o merge pelo trailer 470ms
   ✓ o merge commit carrega o trailer, e o git o devolve > NEGATIVO: o trailer é ancorado — 901 não casa 9012 392ms
   ✓ o prompt do executor cobra o trailer no commit do agente > o prompt montado nomeia o trailer e o id 304ms
   ✓ trilha e STATUS contam a primeira tentativa como 1 > a trilha REAL sai 1-based: o juiz na primeira tentativa registra attempt=1 353ms
 ✓ test/orquestrador-envelope.test.ts (25 tests) 1540ms
 ✓ test/orquestrador-gate-baseline.test.ts (21 tests) 5ms
 ✓ test/orquestrador-custo.test.ts (38 tests) 9409ms
   ✓ custo_registrar grava o consumo real da chamada > duas chamadas somam no mesmo dia, uma linha cada 346ms
   ✓ custo_registrar grava o consumo real da chamada > papel e ticket distinguem as chamadas (é o que o orq custo agrega) 372ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue com ledger corrompido: o executor é chamado 1073ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue sem ledger nenhum: o executor é chamado 1113ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o executor nunca é chamado 671ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > STATUS.md fica ocioso com MOTIVO orcamento 646ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o ticket fica adiado, sem consumir tentativa, e a trilha registra 633ms
   ✓ teto por TICKET adia só aquele ticket e a fila segue > adia o 901 por orcamento_ticket e passa ao 902 1009ms
 ✓ test/orquestrador-datar-liberacoes.test.ts (11 tests) 1358ms
 ✓ test/orq-versao-config.test.ts (16 tests) 2930ms
   ✓ orq config > READ-ONLY: nem versao nem config escrevem no repo 301ms
 ✓ test/orquestrador-push-suprimido.test.ts (14 tests) 8ms
 ✓ test/orquestrador-observabilidade.test.ts (38 tests) 5597ms
   ✓ status_set reescreve o snapshot INTEIRO > NUNCA append: 20 transições e o arquivo continua do mesmo tamanho 1611ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > mudou o status de um ticket, mudou o placar — sem passar fila= nenhum 375ms
 ✓ test/orquestrador-trilha-gate-papel.test.ts (9 tests) 2257ms
 ✓ test/orquestrador-dois-blocos-json.test.ts (13 tests) 578ms
 ✓ test/orquestrador-adiamento-actus.test.ts (13 tests) 4ms
 ✓ test/orquestrador-pausa-e-prompt.test.ts (17 tests) 4263ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sem o arquivo, a drenagem NÃO para por pausa (o guard não é sempre-verdadeiro) 529ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > o ticket em curso termina; o seguinte não começa 474ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > encerra em ocioso com MOTIVO pausado, não em erro 480ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > nada mais mudou no prompt: objetivo, allowlist, gates e proibições seguem lá 327ms
 ✓ test/orquestrador-isolamento-teste.test.ts (10 tests) 1595ms
   ✓ o test-*.sh rodando de verdade não deixa marca na trilha real > test-drenagem.sh: fixture recebe os eventos, produção não recebe nada 1013ms
 ✓ test/kit-e2e-evidencia.test.ts (7 tests) 329ms
 ✓ test/orquestrador-liberacoes.test.ts (11 tests) 1726ms
   ✓ o arquivo REAL do repo resolve as dependências que declara > cada token do arquivo real resolve via liberacao_ok 660ms
 ✓ test/orquestrador-pacotes.test.ts (6 tests) 1325ms
 ✓ test/orquestrador-prefixo-aspas.test.ts (13 tests) 21ms
 ✓ test/orquestrador-morte-por-sinal.test.ts (11 tests) 2687ms
   ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2200ms
 ✓ test/orquestrador-disparo-congelado.test.ts (13 tests) 3475ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > a recuperação deixa rastro na trilha e limpa o STATUS 320ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > lock com pid MORTO não segura disparo nenhum => segue 307ms
   ✓ orq mostra MORTO, não executando > com o STATUS congelado, o snapshot diz MORTO e há quanto tempo 329ms
   ✓ orq mostra MORTO, não executando > com o STATUS são, mostra o que sempre mostrou 389ms
 ✓ test/orquestrador-trilha-uma-linha.test.ts (8 tests) 922ms
 ✓ test/orquestrador-prompt-como-rodar.test.ts (10 tests) 3ms
 ✓ test/orquestrador-liberacoes-formatos.test.ts (28 tests) 8440ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > os 5 tokens do arquivo real resolvem a dependência `humano:<token>` 530ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > TODOS os 47 tokens únicos do arquivo real resolvem 5009ms
   ✓ o que o CI faz diferente: NADA > os 7 resolvem, e NENHUM grava aviso (a forma do CI não é legada) 796ms
 ✓ test/orquestrador-reparo-trilha.test.ts (10 tests) 1525ms
 ❯ test/orquestrador-migrar-config.test.ts (47 tests | 1 failed) 14859ms
   ✓ a migração não apaga nada > actus-saas: o arquivo no disco do repo NÃO é tocado 498ms
   ✓ a migração não apaga nada > comarka-operacional: o arquivo no disco do repo NÃO é tocado 462ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > antes da migração, a linha é a de hoje (é a medida de referência) 301ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --dry-run não escreve nem o proposto 444ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --propor grava 000-config.proposto.json e NÃO toca o oficial 404ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --aplicar move o proposto QUE FOI REVISADO, não um recalculado 870ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > o relatório do --dry-run traz o veredito do `orq config` sobre o PROPOSTO 494ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > --dry-run continua não gravando: ele AVISA da recusa e segue relatando 409ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > sem proposto no disco, o --propor grava como sempre (a guarda não é sempre-verdadeira) 524ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > o migrador NÃO conhece o nome da revisão: não lê, não escreve, não apaga 463ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > a CLI distingue RECUSA (rc 1) de erro de uso (rc 2) 352ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > com proposto pré-existente: rc 1, recusa dita, e o arquivo intacto byte a byte 2494ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > o resto da migração roda: a recusa é do config, não do --migrar inteiro 1911ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > sem proposto pré-existente, o --migrar volta a sair 0 e a gravar 2225ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > --dry-run com proposto pré-existente: rc 0, avisa, e não escreve 2152ms
   × os dois configs reais: quanto o proposto melhora, e o que sobra > actus-saas: o proposto tem MENOS violações que o original, e o resto é decisão local 261ms
     → o relatório tem de trazer o veredito do orq config: expected null to be truthy
 ✓ test/orquestrador-notificacao.test.ts (25 tests) 15658ms
   ✓ o fallback em arquivo é escrito SEMPRE > sem osascript: só o arquivo, e o log diz por quê 6836ms
   ✓ o fallback em arquivo é escrito SEMPRE > COM osascript: o arquivo é escrito do mesmo jeito 353ms
   ✓ o fallback em arquivo é escrito SEMPRE > osascript que falha não derruba a drenagem e o arquivo continua valendo 417ms
   ✓ o que vai no título e no corpo > título: placar de aprovados e bloqueados 390ms
   ✓ o que vai no título e no corpo > corpo: duração e o ÚLTIMO do snapshot 504ms
   ✓ o que vai no título e no corpo > sem snapshot ainda, o corpo sai com — em vez de quebrar 342ms
   ✓ fila sem processável: avisa uma vez, e só uma > a PRIMEIRA drenagem vazia escreve exatamente uma linha 586ms
   ✓ fila sem processável: avisa uma vez, e só uma > a SEGUNDA drenagem vazia não escreve nada (é o spam do launchd) 721ms
   ✓ fila sem processável: avisa uma vez, e só uma > dez ticks seguidos com a fila vazia continuam valendo uma linha só 1779ms
   ✓ fila sem processável: avisa uma vez, e só uma > processar de novo REARMA o aviso de fila vazia 839ms
   ✓ drenagem que PROCESSOU notifica, com o placar > aprovado: uma linha, placar 1 aprovado 423ms
   ✓ drenagem que PROCESSOU notifica, com o placar > bloqueado: uma linha, placar 1 bloqueado 316ms
   ✓ drenagem que PROCESSOU notifica, com o placar > adiado por orçamento: uma linha, corpo com adiados 1 334ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU conta como processado, ainda que nada tenha sido aprovado 378ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU que já estava na trilha ANTES não conta (a conta é do trecho) 466ms

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
      Tests  1 failed | 1104 passed (1105)
   Start at  12:14:59
   Duration  19.68s (transform 665ms, setup 0ms, collect 10.28s, tests 117.86s, environment 4ms, prepare 1.57s)

rc=1
```

#### vitest em main (comparação, cópia por git archive)

Só o placar e as falhas:

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  test/orquestrador-launchd-config.test.ts > o template não carrega nome de repo nenhum > nenhum .plist instanciado está versionado (só o .template)
 FAIL  test/orquestrador-migrar-config.test.ts > os dois configs reais: quanto o proposto melhora, e o que sobra > actus-saas: o proposto tem MENOS violações que o original, e o resto é decisão local
 Test Files  2 failed | 41 passed (43)
      Tests  2 failed | 1103 passed (1105)
rc=1
```

#### scripts/kit/test-shell.sh

```
[fixture] tmp: /tmp/orq-fixture-9bCwTO
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-9bCwTO/repo
== testes de shell do motor · fixture em /tmp/orq-fixture-9bCwTO/repo ==

--- test-lib-config.sh ---
== raízes resolvidas pelo lib.sh ==
  ROOT           = /tmp/orq-fixture-9bCwTO/repo
  MAIN_CHECKOUT  = /private/tmp/orq-fixture-9bCwTO/repo
  CONFIG         = /private/tmp/orq-fixture-9bCwTO/repo/docs/fila/000-config.json
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
  (worktree de teste: /private/tmp/orq-fixture-9bCwTO/repo, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (3252d102)

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
  ok    gravou a evidência em runs/ (probe-falha-20260921T151555Z.txt)
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

== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
TODOS OS SCRIPTS SAÍRAM rc 0
rc=0
```

#### scripts/kit/test-instalar.sh (branch kit/etapa7a)

```
[fixture] tmp: /tmp/orq-fixture-jt1w4o
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-jt1w4o/repo
== (a) fixture recém-instanciado ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-fixture-jt1w4o/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    diz 'idêntico ao kit <VERSAO>'

== (b) cópia do fixture com UM byte a mais em lib.sh ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-yGAkzP/repo
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
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-0RN8A2/repo
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
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-w4cP3u/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  | 
  | O --atualizar de verdade RECUSARIA, por:
  |   · o loop de '/private/tmp/orq-verificar-w4cP3u/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  |   (a recusa não impede este dry-run de listar tudo)
  ok    rc 0
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    o lib.sh do repo NÃO foi tocado pelo --dry-run
-- (e2) --atualizar sem pausa: recusa com rc 1 --
  | RECUSADO: o loop de '/private/tmp/orq-verificar-w4cP3u/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  ok    rc 1
  ok    a recusa diz que o loop não está pausado
  ok    o repo continua intacto depois da recusa
-- (e2b) com PAUSAR, mas com modificação não commitada no motor: recusa --
  | ?? scripts/orquestrador/nao-commitado.txt
  | RECUSADO: '/private/tmp/orq-verificar-w4cP3u/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA o caminho
  ok    o repo continua intacto depois da recusa 3
-- (e3) --atualizar com PAUSAR e motor limpo: atualiza e fica idêntico --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-w4cP3u/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-w4cP3u/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-w4cP3u/repo
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
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-nUCns6/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-nUCns6/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | só no repo  scripts/orquestrador/so-do-repo.py
  | 
  | 1 diferença(s)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-nUCns6/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 1 (há 'só no repo' — o verificador do fim conta como diferença)
  ok    so-do-repo.py SOBREVIVEU
  ok    listado como 'só no repo'

== (g) --atualizar recusa com scripts/roadmap/ sujo, e --forcar passa ==
  |  M scripts/roadmap/lint-mapa.py
  | RECUSADO: '/private/tmp/orq-verificar-sWjRux/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA scripts/roadmap/lint-mapa.py
  ok    o lint-mapa.py do repo continua intacto depois da recusa
-- (g2) com --forcar: passa, avisa, e o lint-mapa.py vira o do kit --
  |  M scripts/roadmap/lint-mapa.py
  | --forcar: passando por cima de 1 caminho(s) modificado(s) no motor do repo.
  | 
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-sWjRux/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-sWjRux/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-sWjRux/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    avisa que passou por cima
  ok    o lint-mapa.py do repo é o do kit

== (h) --verificar/--atualizar cobrem os testes do harness ==
-- (h1) --verificar acusa o teste envelhecido --
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-GEGGMB/repo
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
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-GEGGMB/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-GEGGMB/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-GEGGMB/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    test/orquestrador-pacotes.test.ts do repo é o do kit
  ok    test/produto.test.ts intacto
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
-- (h3) a suíte do REPO passa com os testes que o kit instalou --
  |    ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2138ms
  | 
  |  Test Files  8 passed (8)
  |       Tests  62 passed (62)
  |    Start at  12:16:00
  |    Duration  3.70s (transform 141ms, setup 0ms, collect 3.99s, tests 4.87s, environment 1ms, prepare 289ms)
  ok    npx vitest run no repo: rc 0

== (i) --atualizar --migrar: .orq-pause -> PAUSAR, liberações -> v2 ==
-- (i1) --migrar --dry-run: mostra tudo e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-MrFC0g/repo
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
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-MrFC0g/repo/docs/fila/liberacoes.json)
  |            --dry-run: NADA é escrito
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | --- /private/tmp/orq-verificar-MrFC0g/repo/docs/fila/liberacoes.json (atual)
  | +++ /private/tmp/orq-verificar-MrFC0g/repo/docs/fila/liberacoes.json (v2 proposto)
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
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-MrFC0g/repo/docs/fila)
  |            --dry-run: NADA é escrito
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-MrFC0g/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-MrFC0g/repo/docs/fila/000-config.json
  |                --dry-run: NADA é escrito
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | 
  | --- /private/tmp/orq-verificar-MrFC0g/repo/docs/fila/000-config.json (oficial, INTOCADO)
  | +++ /private/tmp/orq-verificar-MrFC0g/repo/docs/fila/000-config.proposto.json (proposto)
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
  | CONFIG   /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/orq-cfg-kfnnnU/000-config.json
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
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
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
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-MrFC0g/repo/docs/fila/liberacoes.json)
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | @@ -1,9 +1,35 @@
  | 
  | GRAVADO. Cópia do estado anterior em /private/tmp/orq-verificar-MrFC0g/repo/docs/fila/liberacoes.json.bak
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-MrFC0g/repo/docs/fila)
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-MrFC0g/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-MrFC0g/repo/docs/fila/000-config.json
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
  | PROPOSTO gravado em /private/tmp/orq-verificar-MrFC0g/repo/docs/fila/000-config.proposto.json. O oficial NÃO foi tocado.
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /private/tmp/orq-verificar-MrFC0g/repo/docs/fila/000-config.proposto.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | O config NÃO foi aplicado, e isso é a peça funcionando. Passo humano:
  | 
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
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
  FALHA o renome não foi aplicado
  FALHA o nome antigo continua lá
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
  | NOVO       kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-novo-eRlbYR
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
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-novo-eRlbYR
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | --- orq config (o formulário ainda está em branco; é assim que ele nasce) ---
  | CONFIG   /private/tmp/orq-novo-eRlbYR/docs/fila/000-config.json
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
  |   cd /private/tmp/orq-novo-eRlbYR
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
  | RECUSADO: '/private/tmp/orq-sem-tsx-SWlmue' não tem node_modules/.bin/tsx: o motor do orquestrador é TypeScript e nenhuma parte dele roda sem tsx. Instale a dependência de DESENVOLVIMENTO no repo, com o loop pausado, e repita: npm i -D tsx@^4.19.0   (ou o equivalente do gerenciador deste repo)
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

== (c) /Users/lucasantos/Projetos/conteudos-infinitos (SÓ LEITURA — o resultado é achado, não gate) ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /Users/lucasantos/Projetos/conteudos-infinitos
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/config-chaves.ts
  | diferente   scripts/orquestrador/lib.sh
  | diferente   scripts/orquestrador/local-loop.sh
  | só no kit   scripts/orquestrador/test-drenagem-sem-progresso.sh
  | diferente   scripts/orquestrador/test-drenagem.sh
  | só no kit   scripts/orquestrador/test-fixture-drenagem.sh
  | só no kit   scripts/orquestrador/test-ocioso.sh
  | só no kit   scripts/orquestrador/test-sem-progresso-limite.sh
  | só no kit   docs/orquestrador/skill/references/higiene-de-execucao.md
  | diferente   docs/orquestrador/skill/templates/config.json
  | 
  | 10 diferença(s)
  (rc 1 — informativo)

2 CHECK(S) FALHARAM
rc=1
```

#### scripts/kit/test-instalar.sh em main (comparação)

```
  FALHA o renome não foi aplicado
  FALHA o nome antigo continua lá
2 CHECK(S) FALHARAM
rc=1
```

#### Os testes novos, no bash 3.2

`test-drenagem.sh`: TODOS OS CHECKS PASSARAM

`test-drenagem-sem-progresso.sh`: TODOS OS CHECKS PASSARAM

`test-sem-progresso-limite.sh`: TODOS OS CHECKS PASSARAM

`test-ocioso.sh`: TODOS OS CHECKS PASSARAM

### bash instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run

`git status --porcelain` do CI: 0 linhas antes, 0 depois. O `--atualizar` de verdade
**recusaria por falta de pausa**. A recusa fica registrada e NÃO criei pausa.

```
ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.

VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
           repo /Users/lucasantos/Projetos/conteudos-infinitos

carimbo    2.1.0-dev

diferente   scripts/orquestrador/config-chaves.ts
diferente   scripts/orquestrador/lib.sh
diferente   scripts/orquestrador/local-loop.sh
só no kit   scripts/orquestrador/test-drenagem-sem-progresso.sh
diferente   scripts/orquestrador/test-drenagem.sh
só no kit   scripts/orquestrador/test-fixture-drenagem.sh
só no kit   scripts/orquestrador/test-ocioso.sh
só no kit   scripts/orquestrador/test-sem-progresso-limite.sh
só no kit   docs/orquestrador/skill/references/higiene-de-execucao.md
diferente   docs/orquestrador/skill/templates/config.json

10 diferença(s)

O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/conteudos-infinitos' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  (a recusa não impede este dry-run de listar tudo)
rc=0
```

### O que o OCIOSO diria no CI hoje

Rodado sobre uma CÓPIA de `docs/fila` do conteudos-infinitos no scratchpad (rsync sem
`runs/`), com `ocioso_razoes` e `ocioso_legivel` desta branch; o CI ficou com 0 linhas de
`git status` antes e depois:

```
232 dependencia:231:bloqueado
236 dependencia:231:bloqueado
243 dependencia:242:bloqueado
244 dependencia:242:bloqueado
---
232 espera 231 (bloqueado) · 236 espera 231 (bloqueado) · 243 espera 242 (bloqueado) · 244 espera 242 (bloqueado)
```

Esse é o sinal que faltou nos 12 dias: os quatro estão presos atrás de 231 e 242, os dois
bloqueados.

### git log --oneline main..kit/etapa7a

```
97e492c 7a-5: docs da etapa 7a (PECAS, CHANGELOG e CONTRATO)
3a62c5e 7a-4: ocioso que diz por quê (evento OCIOSO e o motivo no STATUS)
6e458e1 7a-3: contador persistente de sem-progresso que bloqueia no limite
05b2898 7a-2: a drenagem pula o ticket que não avança em vez de encerrar
f6cd542 7a-1: test-drenagem.sh com fixture própria, sem docs/fila do checkout
```

## O que ficou para a 7b

- **`scripts/kit/test-shell.sh` rodar os três testes novos** (`test-drenagem-sem-progresso.sh`,
  `test-sem-progresso-limite.sh`, `test-ocioso.sh`). Ele tem lista fixa e ficou fora do
  escopo de escrita. Também `test/orquestrador-isolamento-teste.test.ts` lista só três
  scripts na checagem de "isolamento antes do source". Os novos seguem o contrato (export
  ORQ_TESTE, ORQ_EXEC_ROOT em mktemp, depois o source), mas não estão trancados por ele.
- **Adiamento sem cooldown de verdade.** No kit, hoje, todo adiamento arma cooldown
  (`lib.sh:mark_adiado`), então o ramo "adiado sem cooldown não conta" só roda com stub.
  Ele fica pronto para o item 3 da revisão (timeout e 5xx adiando sem cooldown).
- **Colisão de worktree de outro repo (revisão J1/item 9).** O sem-progresso agora BLOQUEIA
  esse ticket no 3º disparo com a causa certa na nota; recusar o `worktree add` como
  `ambiente`, sem consumir disparo, é outra peça.
- **Três falhas anteriores e ambientais**: o vitest do actus-saas
  (`orquestrador-migrar-config`, "actus-saas: o proposto tem MENOS violações") e as duas do
  `(i5c)` do test-instalar.sh (o ticket 306 do Comarka). Nenhuma é desta etapa; as duas
  leem arquivo vivo de outro repo e quebram quando ele muda.
- **Travessões nos comentários e logs do motor.** Os textos desta etapa (docs, relatório,
  mensagens de commit) saíram sem travessão; os comentários e as mensagens `say` novas
  seguem o estilo do motor e têm alguns. Se a regra valer também para código, é uma
  passada mecânica numa peça própria. Os valores `—` da trilha e do STATUS (id sem ticket,
  `fase=—`) são dado e não mudam.

---

# Acréscimo · 7a-6 e 7a-7 (antes do merge)

Mesmas regras da etapa. Escopo ampliado para `scripts/kit/test-shell.sh` e a lista de
isolamento de `test/orquestrador-isolamento-teste.test.ts`. Sem push, sem merge.

## 7a-6 · os três testes novos entram na suíte

sha: `cd0f951`. `test-shell.sh` passa a rodar e citar `test-drenagem-sem-progresso.sh`,
`test-sem-progresso-limite.sh` e `test-ocioso.sh`; a checagem "isolamento antes do source"
do vitest passa a trancar os três (10 para 13 casos naquele arquivo).

### Vermelho (grep dos três nomes, antes)

```
$ grep -nE "test-drenagem-sem-progresso|test-sem-progresso-limite|test-ocioso" scripts/kit/test-shell.sh test/orquestrador-isolamento-teste.test.ts
rc=1
```

### Verde (grep, depois)

```
$ grep -nE "test-drenagem-sem-progresso|test-sem-progresso-limite|test-ocioso" scripts/kit/test-shell.sh test/orquestrador-isolamento-teste.test.ts
scripts/kit/test-shell.sh:17:#   test-drenagem-sem-progresso.sh  a drenagem pula o ticket que não avança (7a-2)
scripts/kit/test-shell.sh:18:#   test-sem-progresso-limite.sh    contador persistente que bloqueia no limite (7a-3)
scripts/kit/test-shell.sh:19:#   test-ocioso.sh                  o evento OCIOSO diz por que cada pendente não roda (7a-4)
scripts/kit/test-shell.sh:35:SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh'
test/orquestrador-isolamento-teste.test.ts:29:  'test-drenagem-sem-progresso.sh',
test/orquestrador-isolamento-teste.test.ts:30:  'test-sem-progresso-limite.sh',
test/orquestrador-isolamento-teste.test.ts:31:  'test-ocioso.sh',
rc=0
```

### Verde (bash scripts/kit/test-shell.sh)

```
[fixture] tmp: /tmp/orq-fixture-TDyYVi
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-TDyYVi/repo
== testes de shell do motor · fixture em /tmp/orq-fixture-TDyYVi/repo ==

--- test-lib-config.sh ---
== raízes resolvidas pelo lib.sh ==
  ROOT           = /tmp/orq-fixture-TDyYVi/repo
  MAIN_CHECKOUT  = /private/tmp/orq-fixture-TDyYVi/repo
  CONFIG         = /private/tmp/orq-fixture-TDyYVi/repo/docs/fila/000-config.json
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
  (worktree de teste: /private/tmp/orq-fixture-TDyYVi/repo, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (4cc96fd5)

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
  ok    gravou a evidência em runs/ (probe-falha-20260921T151950Z.txt)
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
  | [2026-09-21 12:19:53-0300] ticket 901 (3 processáveis)
  | [orq ERRO] preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.3nSDgcsEHn/checkout (ticket 901)
  | [2026-09-21 12:19:53-0300]   ticket 901 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.3nSDgcsEHn/checkout (ticket 901)
  | [2026-09-21 12:19:53-0300] ticket 902 (3 processáveis)
  | [orq ERRO] preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.3nSDgcsEHn/checkout (ticket 902)
  | [2026-09-21 12:19:53-0300]   ticket 902 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.3nSDgcsEHn/checkout (ticket 902)
  | [2026-09-21 12:19:53-0300] ticket 903 (3 processáveis)
  | [2026-09-21 12:19:54-0300] nenhum processável não tentado — encerrando (aprovados: 1; sem progresso: 901 902)
  | [2026-09-21 12:19:54-0300] drenagem encerrada: 1 aprovado(s) e mergeado(s)
  | [2026-09-21 12:19:54-0300] ocioso: 901 sem progresso · 902 sem progresso
  ok    executor chamado 3x numa drenagem: 901 902 903 
  ok    terminou em <= N=3 chamadas (sem loop)
  ok    cada ticket tentado UMA vez, na ordem da fila
  ok    o executor recebe --ticket (não reescolhe)
  ok    o saudável (903) foi processado: done
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-09-21T12:19:54-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 sem_progresso=2 dur=0min
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
  nota: sem_progresso: 3 disparos sem progresso entre 2026-09-21 12:19:54-0300 e 2026-09-21 12:19:55-0300; última causa: executor morreu (rc=128, fase=worktree): fatal: '/tmp/_worktrees/fx-901' already exists
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
  trilha: 2026-09-21T12:19:58-0300 --- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
  ok    evento OCIOSO pendentes=3
  ok    244: dependência 241b em bloqueado
  ok    232: dependência 231 em pendente
  ok    231: liberação humano:migration-0031 ausente
  ok    UM evento por drenagem
  ok    trilha continua uma linha por evento (nenhuma linha sem timestamp)
  ok    OCIOSO vem antes do DRENAGEM_FIM
  STATUS.md:
    ORQUESTRADOR · 2026-09-21 12:19:58
    ESTADO   ocioso
    TICKET   —
    DESDE    —
    FASE     —
    FILA     3 pendente · 1 bloqueado · 1 done
    STAGING  1fd71e1 · push suprimido (publicar é humano neste repo)
    ÚLTIMO   —
    MOTIVO   sem ticket processável: 231 sem liberação humano:migration-0031 · 232 espera 231 (pendente) · 244 espera 241b (bloqueado)
  ok    STATUS mantém o motivo de sempre
  ok    STATUS: 244 espera 241b (bloqueado)
  ok    STATUS: 232 espera 231 (pendente)
  ok    STATUS: 231 sem liberação
  ok    DRENAGEM_FIM sem campo novo

== 2. pendente pulado por sem-progresso nesta drenagem ==
  trilha: 2026-09-21T12:19:59-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=sem_progresso
  ok    250 foi tentado uma vez
  ok    250: pulado por sem-progresso
  ok    STATUS: 250 sem progresso

== 3. cooldown ativo: o liberado espera o cooldown ==
  trilha: 2026-09-21T12:19:59-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=cooldown:12:49
  ok    250: cooldown até 12:49
  ok    a razão de dependência vence o cooldown
  ok    STATUS: 250 em cooldown até 12:49

== 4. fins que NÃO gravam OCIOSO ==
  ok    pausa: sem OCIOSO (quem pausou já sabe)
  ok    sem pendente nenhum: sem OCIOSO

TODOS OS CHECKS PASSARAM

rc(test-ocioso.sh) = 0

== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
  rc=0  test-drenagem-sem-progresso.sh
  rc=0  test-sem-progresso-limite.sh
  rc=0  test-ocioso.sh
TODOS OS SCRIPTS SAÍRAM rc 0
rc=0
```

### Verde (vitest do isolamento)

```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7a

 ✓ test/orquestrador-isolamento-teste.test.ts (13 tests) 825ms
   ✓ o test-*.sh rodando de verdade não deixa marca na trilha real > test-drenagem.sh: fixture recebe os eventos, produção não recebe nada 488ms

 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  12:20:00
   Duration  1.29s (transform 18ms, setup 0ms, collect 320ms, tests 825ms, environment 0ms, prepare 30ms)

rc=0
```

### Diff

```diff
commit cd0f95173d7b7a2304e0e879ccb95e803e33b92f

7a-6: os três testes da etapa 7a entram no test-shell.sh e no isolamento

scripts/kit/test-shell.sh passa a rodar test-drenagem-sem-progresso.sh,
test-sem-progresso-limite.sh e test-ocioso.sh contra o fixture, e cita cada
um na saída e no placar. A checagem "isolamento antes do source" do vitest
(orquestrador-isolamento-teste.test.ts) passa a trancar os três.

Vermelho: grep dos três nomes nos dois arquivos devolvia nada (rc 1).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>


diff --git a/scripts/kit/test-shell.sh b/scripts/kit/test-shell.sh
index 74db212..602e6d0 100644
--- a/scripts/kit/test-shell.sh
+++ b/scripts/kit/test-shell.sh
@@ -12,6 +12,12 @@
 #   test-drenagem.sh      copia $CHECKOUT_REAL/docs/fila/000-config.json (linhas 25 e 29)
 #   test-retry-worktree.sh  idem (linhas 32 e 36)
 #
+# Mais os três da etapa 7a, que já nascem com fixture própria (fila e config em
+# heredoc num mktemp -d, via test-fixture-drenagem.sh) e não leem o checkout:
+#   test-drenagem-sem-progresso.sh  a drenagem pula o ticket que não avança (7a-2)
+#   test-sem-progresso-limite.sh    contador persistente que bloqueia no limite (7a-3)
+#   test-ocioso.sh                  o evento OCIOSO diz por que cada pendente não roda (7a-4)
+#
 # Cada um monta o PRÓPRIO `ORQ_EXEC_ROOT` num `mktemp -d` (drenagem e retry) ou
 # trabalha direto no checkout (lib-config); nada aqui precisa exportar
 # `ORQ_EXEC_ROOT` por fora — fazer isso sobrescreveria o isolamento que cada
@@ -26,7 +32,7 @@
 set -uo pipefail
 
 KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
-SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh'
+SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh'
 
 FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
   printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
diff --git a/test/orquestrador-isolamento-teste.test.ts b/test/orquestrador-isolamento-teste.test.ts
index 739f7b0..201a2ba 100644
--- a/test/orquestrador-isolamento-teste.test.ts
+++ b/test/orquestrador-isolamento-teste.test.ts
@@ -21,7 +21,15 @@ import { spawnSync } from 'node:child_process';
 import { criarFixture, bashNoFixture, ler, REPO_ROOT, checkoutReal } from './fixtures/orq-harness.js';
 
 const ORQ_DIR = join(REPO_ROOT, 'scripts', 'orquestrador');
-const SCRIPTS = ['test-drenagem.sh', 'test-preflight.sh', 'test-retry-worktree.sh'];
+const SCRIPTS = [
+  'test-drenagem.sh',
+  'test-preflight.sh',
+  'test-retry-worktree.sh',
+  // etapa 7a: os três montam fila e config num mktemp -d (test-fixture-drenagem.sh)
+  'test-drenagem-sem-progresso.sh',
+  'test-sem-progresso-limite.sh',
+  'test-ocioso.sh',
+];
 
 /**
  * O checkout PRINCIPAL — o dono da trilha de "produção" deste teste — é o repo
```

## 7a-7 · o rc do executor atravessa o tee

sha: `84958eb`.

**Como o rc chega ao loop.** `scripts/orquestrador/local-loop.sh:349`:

```
run_executor_once --ticket "$prox" 2>&1 | tee "$exe_out" && exe_rc=0 || exe_rc="${PIPESTATUS[0]}"
```

O rc de um pipeline é o do último comando, o `tee`. Duas coisas juntas fazem o do executor
chegar: o `pipefail` (`local-loop.sh:19` e `lib.sh:15`, `set -euo pipefail`) deixa o
pipeline falhar quando o executor falha, e desvia para o ramo `||`; nesse ramo,
`PIPESTATUS[0]` é o rc do primeiro comando, o executor. Com executor 0 e `tee` falhando, o
`||` também é tomado e lê `PIPESTATUS[0]` = 0: o rc do `tee` nunca é o que fica em
`exe_rc`. O `exe_rc` é usado em `local-loop.sh:350` (linha `executor rc=N` do log) e em
`:413` (causa do sem-progresso).

**O teste nasceu VERDE.** O rc já atravessava; isto é cobertura nova, sem vermelho
inventado e sem mudança de motor. Para mostrar que o teste não passa por vacuidade, fiz uma
contraprova numa CÓPIA fora do repo (scratchpad), trocando a linha 349 por uma que lê o rc
do `tee` (`PIPESTATUS[1]`): 9 checks falham. Isso não é vermelho da peça, é a prova de que
o teste morde.

Dependência que fica registrada: sem `pipefail` a primeira forma leria o rc do `tee`. O
teste checa que o `pipefail` está ligado dentro da drenagem, e ele vem do `set -euo
pipefail` do topo do `local-loop.sh`.

### Primeira rodada, contra o código antes do commit (nasceu verde)

```
== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) ==
  ok    pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)

== o rc do executor atravessa o tee ==
  --- A: executor sai 3, tee sai 0 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:20:59-0300 e 2026-09-21 12:20:59-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    A: o log vê rc=3
  ok    A: a causa do bloqueio carrega rc=3
  --- B: executor sai 0, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:20:59-0300 e 2026-09-21 12:20:59-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    B: o log vê rc=0
  ok    B: a causa do bloqueio carrega rc=0
  --- C: executor sai 0, tee sai 5 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:21:00-0300 e 2026-09-21 12:21:00-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    C: o log vê rc=0
  ok    C: a causa do bloqueio carrega rc=0
  --- D: executor sai 3, tee sai 5 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:21:00-0300 e 2026-09-21 12:21:00-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    D: o log vê rc=3
  ok    D: a causa do bloqueio carrega rc=3

TODOS OS CHECKS PASSARAM
rc=0
```

### Contraprova (cópia com exe_rc lido do tee; NÃO é o repo)

```
$ sed -n 349p <cópia>/local-loop.sh
    run_executor_once --ticket "$prox" 2>&1 | tee "$exe_out"; exe_rc="${PIPESTATUS[1]}"   # MUTAÇÃO: rc do tee
== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) ==
  ok    pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)

== o rc do executor atravessa o tee ==
  --- A: executor sai 3, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:21:22-0300 e 2026-09-21 12:21:22-0300; última causa: executor saiu rc=0 sem desfecho registrado
  FALHA A: esperava 'executor rc=3', o log diz 'executor rc=0'
  FALHA A: a causa não carrega rc=3
  FALHA A: o rc do tee (0) vazou para o loop
  --- B: executor sai 0, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:21:23-0300 e 2026-09-21 12:21:23-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    B: o log vê rc=0
  ok    B: a causa do bloqueio carrega rc=0
  --- C: executor sai 0, tee sai 5 -> log 'executor rc=5'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:21:23-0300 e 2026-09-21 12:21:23-0300; última causa: executor saiu rc=5 sem desfecho registrado
  FALHA C: esperava 'executor rc=0', o log diz 'executor rc=5'
  FALHA C: a causa não carrega rc=0
  FALHA C: o rc do tee (5) vazou para o loop
  --- D: executor sai 3, tee sai 5 -> log 'executor rc=5'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:21:23-0300 e 2026-09-21 12:21:23-0300; última causa: executor saiu rc=5 sem desfecho registrado
  FALHA D: esperava 'executor rc=3', o log diz 'executor rc=5'
  FALHA D: a causa não carrega rc=3
  FALHA D: o rc do tee (5) vazou para o loop

9 CHECK(S) FALHARAM
rc=1
```

### Verde (depois do commit)

```
== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) ==
  ok    pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)

== o rc do executor atravessa o tee ==
  --- A: executor sai 3, tee sai 0 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:21:39-0300 e 2026-09-21 12:21:39-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    A: o log vê rc=3
  ok    A: a causa do bloqueio carrega rc=3
  --- B: executor sai 0, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:21:39-0300 e 2026-09-21 12:21:39-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    B: o log vê rc=0
  ok    B: a causa do bloqueio carrega rc=0
  --- C: executor sai 0, tee sai 5 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:21:39-0300 e 2026-09-21 12:21:39-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    C: o log vê rc=0
  ok    C: a causa do bloqueio carrega rc=0
  --- D: executor sai 3, tee sai 5 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:21:40-0300 e 2026-09-21 12:21:40-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    D: o log vê rc=3
  ok    D: a causa do bloqueio carrega rc=3

TODOS OS CHECKS PASSARAM
rc=0
```

### Diff

```diff
commit 84958eb7fd080998d97538780e31c52ac6d2efe0

7a-7: teste de que o rc do executor atravessa o tee da drenagem

local-loop.sh:349 faz "run_executor_once ... | tee" e lê o rc no ramo ||
por PIPESTATUS[0]; quem desvia para esse ramo quando o executor falha é o
pipefail (local-loop.sh:19, lib.sh:15). test-rc-executor.sh prova com
executor stub (rc 3; rc 0 sem desfecho) e tee stub (rc 0 e rc 5) que o loop
vê o rc do executor no log e na causa do bloqueio, e nunca o do tee.

O teste nasceu VERDE: o rc já atravessava, e isto é cobertura nova, sem
mudança de motor. Contraprova numa cópia fora do repo (exe_rc lido de
PIPESTATUS[1], o rc do tee): 9 checks falham. Entra no test-shell.sh e na
checagem de isolamento do vitest.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>


diff --git a/scripts/kit/test-shell.sh b/scripts/kit/test-shell.sh
index 602e6d0..95bd161 100644
--- a/scripts/kit/test-shell.sh
+++ b/scripts/kit/test-shell.sh
@@ -17,6 +17,7 @@
 #   test-drenagem-sem-progresso.sh  a drenagem pula o ticket que não avança (7a-2)
 #   test-sem-progresso-limite.sh    contador persistente que bloqueia no limite (7a-3)
 #   test-ocioso.sh                  o evento OCIOSO diz por que cada pendente não roda (7a-4)
+#   test-rc-executor.sh             o rc do executor atravessa o tee da drenagem (7a-7)
 #
 # Cada um monta o PRÓPRIO `ORQ_EXEC_ROOT` num `mktemp -d` (drenagem e retry) ou
 # trabalha direto no checkout (lib-config); nada aqui precisa exportar
@@ -32,7 +33,7 @@
 set -uo pipefail
 
 KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
-SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh'
+SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh'
 
 FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
   printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
diff --git a/scripts/orquestrador/test-rc-executor.sh b/scripts/orquestrador/test-rc-executor.sh
new file mode 100644
index 0000000..be6d922
--- /dev/null
+++ b/scripts/orquestrador/test-rc-executor.sh
@@ -0,0 +1,91 @@
+#!/usr/bin/env bash
+# test-rc-executor.sh — o rc do EXECUTOR atravessa o `tee` da drenagem (peça 7a-7).
+#
+# Desde a 7a-3 a saída do executor vai por `tee` (local-loop.sh:349):
+#   run_executor_once ... 2>&1 | tee "$exe_out" && exe_rc=0 || exe_rc="${PIPESTATUS[0]}"
+# O rc de um pipeline é o do ÚLTIMO comando, o tee, que quase sempre sai 0. Quem
+# faz o rc do executor chegar ao loop são duas coisas juntas: `pipefail`
+# (local-loop.sh:19, lib.sh:15), que deixa o pipeline falhar quando o executor
+# falha e desvia para o ramo `||`, e o `PIPESTATUS[0]` lido nesse ramo, que é
+# o rc do PRIMEIRO comando. Aqui se prova que o loop enxerga exatamente o rc
+# do executor, e nunca o do tee:
+#   A. executor sai 3 sem desfecho, tee 0         -> loop vê 3
+#   B. executor sai 0 sem desfecho, tee 0         -> loop vê 0
+#   C. executor sai 0, tee sai 5                  -> loop vê 0 (não 5)
+#   D. executor sai 3, tee sai 5                  -> loop vê 3 (não 5)
+# "Vê" em dois lugares: a linha "executor rc=N" do log, e a causa do bloqueio
+# por sem-progresso (limite 1), que sem desfecho na trilha cai em
+# "executor saiu rc=N sem desfecho registrado".
+#
+# Uso: bash scripts/orquestrador/test-rc-executor.sh
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
+fx_config "$ORQ_EXEC_ROOT" '.sem_progresso_limite = 1'
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
+RC_EXEC="$TMP/rc-exec"
+RC_TEE="$TMP/rc-tee"
+
+ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
+merge_em_alvo() { return 0; }
+cleanup_frente() { return 0; }
+# Executor stub: não grava evento, não mexe em status nem nota, não imprime
+# linha de erro. O único sinal que ele deixa é o rc.
+run_executor_once() {
+  echo "stub do executor para $(ticket_field "$2" '.id'), saindo com $(cat "$RC_EXEC")"
+  return "$(cat "$RC_EXEC")"
+}
+# tee stub: faz o trabalho do tee de verdade (a cópia da saída continua
+# existindo) e sai com o rc escolhido pelo caso.
+tee() { command tee "$@"; return "$(cat "$RC_TEE")"; }
+
+caso() {  # caso <letra> <id> <rc-executor> <rc-tee>
+  local letra="$1" id="$2" re="$3" rt="$4" nota linha
+  echo "$re" > "$RC_EXEC"; echo "$rt" > "$RC_TEE"
+  fx_ticket "$ORQ_EXEC_ROOT" "$id"
+  git -C "$ORQ_EXEC_ROOT" add -- "docs/fila/$id-t.md" && git -C "$ORQ_EXEC_ROOT" commit -q -m "fixture: $id"
+  drenar > "$TMP/out.$letra" 2>&1
+  linha="$(grep -o 'executor rc=[0-9]*' "$TMP/out.$letra" | head -1)"
+  nota="$(ticket_field "$FILA/$id-t.md" '.notas_status')"
+  echo "  --- $letra: executor sai $re, tee sai $rt -> log '$linha'; nota: $nota"
+  [ "$linha" = "executor rc=$re" ] && ok "$letra: o log vê rc=$re" || falha "$letra: esperava 'executor rc=$re', o log diz '$linha'"
+  case "$nota" in
+    *"última causa: executor saiu rc=$re sem desfecho registrado") ok "$letra: a causa do bloqueio carrega rc=$re" ;;
+    *) falha "$letra: a causa não carrega rc=$re" ;;
+  esac
+  [ "$re" = "$rt" ] || case "$nota$linha" in *"rc=$rt"*) falha "$letra: o rc do tee ($rt) vazou para o loop" ;; esac
+}
+
+echo "== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) =="
+case "$(set -o | awk '$1 == "pipefail" { print $2 }')" in
+  on) ok "pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)" ;;
+  *)  falha "pipefail desligado: o rc do tee mascararia o do executor" ;;
+esac
+
+echo
+echo "== o rc do executor atravessa o tee =="
+caso A 801 3 0
+caso B 802 0 0
+caso C 803 0 5
+caso D 804 3 5
+
+echo
+if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
diff --git a/test/orquestrador-isolamento-teste.test.ts b/test/orquestrador-isolamento-teste.test.ts
index 201a2ba..04a84c9 100644
--- a/test/orquestrador-isolamento-teste.test.ts
+++ b/test/orquestrador-isolamento-teste.test.ts
@@ -29,6 +29,7 @@ const SCRIPTS = [
   'test-drenagem-sem-progresso.sh',
   'test-sem-progresso-limite.sh',
   'test-ocioso.sh',
+  'test-rc-executor.sh',
 ];
 
 /**
```

## Fechamento do acréscimo

As 3 falhas antigas continuam, e são as únicas: no vitest, a do config real do actus-saas;
no test-instalar.sh, as duas do `(i5c)`, que lê o ticket 306 do comarka-operacional.
vitest: 1108 passam (antes 1104, mais os 4 casos de isolamento). test-shell.sh: 7 scripts,
todos rc 0.

### vitest

```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7a

 ✓ test/orquestrador-enforcement.test.ts (47 tests) 23ms
 ✓ test/orquestrador-enforcement-actus.test.ts (104 tests) 26ms
 ✓ test/orquestrador-prevoo.test.ts (34 tests) 8ms
 ✓ test/orquestrador-decisao.test.ts (37 tests) 9ms
 ✓ test/orquestrador-liberar-migrar.test.ts (37 tests) 2741ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > o resultado da migração PASSA no leitor do motor: todo token resolve 353ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > libera, sai 0 e o arquivo passa a ter o token 312ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > o token liberado DESTRAVA o ticket que dependia dele 560ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > duplicata: rc 1, RECUSADO, e o arquivo NÃO muda 608ms
stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > actus-saas: em TODO ticket migrado, só o bloco muda
actus-saas: 0 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > comarka-operacional: em TODO ticket migrado, só o bloco muda
comarka-operacional: 30 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > conteudos-infinitos: em TODO ticket migrado, só o bloco muda
conteudos-infinitos: 0 ticket(s) migrados

 ✓ test/orquestrador-migrar-tickets.test.ts (32 tests) 2627ms
   ✓ a prosa não se move UM BYTE > comarka-operacional: a fila no disco do repo NÃO é tocada 376ms
   ✓ os dois renomes, na posição original da chave > a fila real do Comarka: UMA linha muda por ticket, e é sempre a mesma 383ms
   ✓ --dry-run e --aplicar > --dry-run não escreve 393ms
   ✓ --dry-run e --aplicar > --aplicar grava e NÃO deixa .bak (o ticket é versionado; o git é o backup) 352ms
   ✓ --dry-run e --aplicar > rodar de novo é no-op 370ms
   ✓ --dry-run e --aplicar > o migrado continua parseável pelo leitor do motor 334ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 4159ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 413ms
   ✓ a CLI é o contrato que `orq validar` repassa > com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>` 383ms
   ✓ a CLI é o contrato que `orq validar` repassa > --relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação 405ms
   ✓ a CLI é o contrato que `orq validar` repassa > --pendentes pega SÓ os pendentes 400ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 877ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 426ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > rc 1 e a linha de violação, chamado PELO symlink 423ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 813ms
 ✓ test/orquestrador-gates.test.ts (29 tests) 1030ms
 ✓ test/doutrina-v2.test.ts (30 tests) 10ms
 ✓ test/orquestrador-toolchain-tsx.test.ts (30 tests) 4205ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > tsx_local_ok responde pelo binário DO REPO, e é `test -x` 422ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > COM tsx no lugar, o guard passa e o loop segue para o kill switch 325ms
   ✓ cat.7 · toolchain > `orq prevoo` no fixture continua GO, com a cat.7 na saída 319ms
   ✓ instalar.sh · recusa repo sem tsx > com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx) 801ms
 ✓ test/orquestrador-refatiar.test.ts (39 tests) 5235ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > diff acima do cap: refatiar, contaComoRetry false 380ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > arquivo fora da allowlist (enforcement): refatiar 382ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > zona proibida entra pelo MESMO campo — é a barreira que classifica 352ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > refatiar NÃO gera retry (o plano diz deveTentar=false) 380ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry 760ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar 350ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa 324ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a mesma pendência duas vezes não vira duas linhas 582ms
   ✓ o retry recebe o JSON, não o texto livre > o CLI monta o JSON a partir do rundir de verdade 396ms
 ✓ test/orquestrador-lock.test.ts (34 tests) 6ms
 ✓ test/orq-cli.test.ts (42 tests) 5705ms
   ✓ orq validar — o gate de ticket, com o rc repassado > ticket torto: rc 1, e a linha nomeia arquivo e campo 304ms
 ✓ test/orquestrador-launchd-config.test.ts (15 tests) 569ms
 ✓ test/orquestrador-tools-derivadas.test.ts (32 tests) 4ms
 ✓ test/orquestrador-juiz.test.ts (39 tests) 6265ms
   ✓ LIXO é adiado, nunca reprovado > o parse do CLI sai com rc 3 (o código que o executor lê como ADIADO) 376ms
   ✓ LIXO é adiado, nunca reprovado > a fronteira está no decisao.ts: juizIlegivel ADIA e NÃO conta retry 375ms
   ✓ LIXO é adiado, nunca reprovado > NEGATIVO: sem o campo, o mesmo sinal segue aprovando como antes 358ms
   ✓ modelo por classe de risco (custo-e-contexto §7) > o CLI devolve classe + modelo juntos (é o que o shell consome) 341ms
   ✓ ponta a ponta com --stub-juiz > veredito aprovado: JUIZ_APROVADO=true e evidência gravada 754ms
   ✓ ponta a ponta com --stub-juiz > o prompt gravado carrega o critério avaliador e o bloco anti-afrouxamento 766ms
   ✓ ponta a ponta com --stub-juiz > veredito reprovado: motivo e criterios_falhos ficam disponíveis para o retry 722ms
   ✓ ponta a ponta com --stub-juiz > lixo: ILEGIVEL=1, nenhum veredito.json, e o CRU continua lá para auditoria 663ms
   ✓ ponta a ponta com --stub-juiz > a trilha registra o veredito, a classe e o modelo, com attempt 1-based 712ms
   ✓ ponta a ponta com --stub-juiz > o risco sobe pelo objetivo e leva o modelo forte junto 724ms
   ✓ ponta a ponta com --stub-juiz > NEGATIVO: --dry sem --stub-juiz pula o juiz e não inventa veredito 470ms
 ✓ test/orquestrador-piso-tools.test.ts (23 tests) 14ms
 ✓ test/orquestrador-agendamento.test.ts (21 tests) 170ms
 ✓ test/orquestrador-trilha.test.ts (22 tests) 2657ms
   ✓ o merge commit carrega o trailer, e o git o devolve > git log --grep acha o merge pelo trailer 467ms
   ✓ o merge commit carrega o trailer, e o git o devolve > NEGATIVO: o trailer é ancorado — 901 não casa 9012 433ms
   ✓ o prompt do executor cobra o trailer no commit do agente > o prompt montado nomeia o trailer e o id 309ms
   ✓ trilha e STATUS contam a primeira tentativa como 1 > a trilha REAL sai 1-based: o juiz na primeira tentativa registra attempt=1 372ms
 ✓ test/orquestrador-envelope.test.ts (25 tests) 1608ms
 ✓ test/orquestrador-gate-baseline.test.ts (21 tests) 5ms
 ✓ test/orquestrador-custo.test.ts (38 tests) 9198ms
   ✓ custo_registrar grava o consumo real da chamada > duas chamadas somam no mesmo dia, uma linha cada 336ms
   ✓ custo_registrar grava o consumo real da chamada > papel e ticket distinguem as chamadas (é o que o orq custo agrega) 355ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue com ledger corrompido: o executor é chamado 1031ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue sem ledger nenhum: o executor é chamado 1004ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > ticket adiado até amanhã não é processável hoje 316ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o executor nunca é chamado 655ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > STATUS.md fica ocioso com MOTIVO orcamento 681ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o ticket fica adiado, sem consumir tentativa, e a trilha registra 645ms
   ✓ teto por TICKET adia só aquele ticket e a fila segue > adia o 901 por orcamento_ticket e passa ao 902 949ms
 ✓ test/orquestrador-datar-liberacoes.test.ts (11 tests) 1360ms
 ✓ test/orq-versao-config.test.ts (16 tests) 2972ms
   ✓ orq config > READ-ONLY: nem versao nem config escrevem no repo 312ms
 ✓ test/orquestrador-push-suprimido.test.ts (14 tests) 7ms
 ✓ test/orquestrador-observabilidade.test.ts (38 tests) 5455ms
   ✓ status_set reescreve o snapshot INTEIRO > NUNCA append: 20 transições e o arquivo continua do mesmo tamanho 1537ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > mudou o status de um ticket, mudou o placar — sem passar fila= nenhum 388ms
 ✓ test/orquestrador-trilha-gate-papel.test.ts (9 tests) 2198ms
 ✓ test/orquestrador-dois-blocos-json.test.ts (13 tests) 551ms
 ✓ test/orquestrador-adiamento-actus.test.ts (13 tests) 4ms
 ✓ test/orquestrador-pausa-e-prompt.test.ts (17 tests) 4244ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sem o arquivo, a drenagem NÃO para por pausa (o guard não é sempre-verdadeiro) 521ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > o ticket em curso termina; o seguinte não começa 500ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > encerra em ocioso com MOTIVO pausado, não em erro 484ms
 ✓ test/orquestrador-isolamento-teste.test.ts (14 tests) 1476ms
   ✓ o test-*.sh rodando de verdade não deixa marca na trilha real > test-drenagem.sh: fixture recebe os eventos, produção não recebe nada 875ms
 ✓ test/kit-e2e-evidencia.test.ts (7 tests) 276ms
 ✓ test/orquestrador-pacotes.test.ts (6 tests) 1136ms
 ✓ test/orquestrador-liberacoes.test.ts (11 tests) 1482ms
   ✓ o arquivo REAL do repo resolve as dependências que declara > cada token do arquivo real resolve via liberacao_ok 575ms
 ✓ test/orquestrador-prefixo-aspas.test.ts (13 tests) 5ms
 ✓ test/orquestrador-disparo-congelado.test.ts (13 tests) 3082ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS congelado E lock com pid VIVO => recupera (a staleness vence) 307ms
   ✓ orq mostra MORTO, não executando > com o STATUS são, mostra o que sempre mostrou 301ms
 ✓ test/orquestrador-morte-por-sinal.test.ts (11 tests) 2588ms
   ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2199ms
 ✓ test/orquestrador-prompt-como-rodar.test.ts (10 tests) 2ms
 ✓ test/orquestrador-trilha-uma-linha.test.ts (8 tests) 673ms
 ✓ test/orquestrador-liberacoes-formatos.test.ts (28 tests) 7987ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > os 5 tokens do arquivo real resolvem a dependência `humano:<token>` 538ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > TODOS os 47 tokens únicos do arquivo real resolvem 4840ms
   ✓ o que o CI faz diferente: NADA > os 7 resolvem, e NENHUM grava aviso (a forma do CI não é legada) 647ms
 ✓ test/orquestrador-reparo-trilha.test.ts (10 tests) 1304ms
 ❯ test/orquestrador-migrar-config.test.ts (47 tests | 1 failed) 14226ms
   ✓ a migração não apaga nada > actus-saas: o arquivo no disco do repo NÃO é tocado 451ms
   ✓ a migração não apaga nada > comarka-operacional: o arquivo no disco do repo NÃO é tocado 417ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --dry-run não escreve nem o proposto 408ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --propor grava 000-config.proposto.json e NÃO toca o oficial 425ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --aplicar move o proposto QUE FOI REVISADO, não um recalculado 785ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > o relatório do --dry-run traz o veredito do `orq config` sobre o PROPOSTO 416ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > --dry-run continua não gravando: ele AVISA da recusa e segue relatando 410ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > sem proposto no disco, o --propor grava como sempre (a guarda não é sempre-verdadeira) 381ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > o migrador NÃO conhece o nome da revisão: não lê, não escreve, não apaga 434ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > a CLI distingue RECUSA (rc 1) de erro de uso (rc 2) 369ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > com proposto pré-existente: rc 1, recusa dita, e o arquivo intacto byte a byte 2604ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > o resto da migração roda: a recusa é do config, não do --migrar inteiro 1946ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > sem proposto pré-existente, o --migrar volta a sair 0 e a gravar 2197ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > --dry-run com proposto pré-existente: rc 0, avisa, e não escreve 1925ms
   × os dois configs reais: quanto o proposto melhora, e o que sobra > actus-saas: o proposto tem MENOS violações que o original, e o resto é decisão local 236ms
     → o relatório tem de trazer o veredito do orq config: expected null to be truthy
 ✓ test/orquestrador-notificacao.test.ts (25 tests) 14639ms
   ✓ o fallback em arquivo é escrito SEMPRE > sem osascript: só o arquivo, e o log diz por quê 6707ms
   ✓ o fallback em arquivo é escrito SEMPRE > COM osascript: o arquivo é escrito do mesmo jeito 350ms
   ✓ o fallback em arquivo é escrito SEMPRE > osascript que falha não derruba a drenagem e o arquivo continua valendo 318ms
   ✓ o que vai no título e no corpo > título: placar de aprovados e bloqueados 336ms
   ✓ o que vai no título e no corpo > corpo: duração e o ÚLTIMO do snapshot 476ms
   ✓ o que vai no título e no corpo > sem snapshot ainda, o corpo sai com — em vez de quebrar 345ms
   ✓ fila sem processável: avisa uma vez, e só uma > a PRIMEIRA drenagem vazia escreve exatamente uma linha 397ms
   ✓ fila sem processável: avisa uma vez, e só uma > a SEGUNDA drenagem vazia não escreve nada (é o spam do launchd) 735ms
   ✓ fila sem processável: avisa uma vez, e só uma > dez ticks seguidos com a fila vazia continuam valendo uma linha só 1674ms
   ✓ fila sem processável: avisa uma vez, e só uma > processar de novo REARMA o aviso de fila vazia 737ms
   ✓ drenagem que PROCESSOU notifica, com o placar > aprovado: uma linha, placar 1 aprovado 375ms
   ✓ drenagem que PROCESSOU notifica, com o placar > adiado por orçamento: uma linha, corpo com adiados 1 313ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU conta como processado, ainda que nada tenha sido aprovado 338ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU que já estava na trilha ANTES não conta (a conta é do trecho) 407ms

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
      Tests  1 failed | 1108 passed (1109)
   Start at  12:21:49
   Duration  18.20s (transform 534ms, setup 0ms, collect 9.35s, tests 111.94s, environment 5ms, prepare 1.55s)

rc=1
```

### scripts/kit/test-shell.sh

```
[fixture] tmp: /tmp/orq-fixture-iUPwOS
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-iUPwOS/repo
== testes de shell do motor · fixture em /tmp/orq-fixture-iUPwOS/repo ==

--- test-lib-config.sh ---
== raízes resolvidas pelo lib.sh ==
  ROOT           = /tmp/orq-fixture-iUPwOS/repo
  MAIN_CHECKOUT  = /private/tmp/orq-fixture-iUPwOS/repo
  CONFIG         = /private/tmp/orq-fixture-iUPwOS/repo/docs/fila/000-config.json
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
  (worktree de teste: /private/tmp/orq-fixture-iUPwOS/repo, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (4fc73379)

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
  ok    gravou a evidência em runs/ (probe-falha-20260921T152213Z.txt)
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
  | [2026-09-21 12:22:16-0300] ticket 901 (3 processáveis)
  | [orq ERRO] preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.wlN2BfbFbh/checkout (ticket 901)
  | [2026-09-21 12:22:17-0300]   ticket 901 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.wlN2BfbFbh/checkout (ticket 901)
  | [2026-09-21 12:22:17-0300] ticket 902 (3 processáveis)
  | [orq ERRO] preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.wlN2BfbFbh/checkout (ticket 902)
  | [2026-09-21 12:22:17-0300]   ticket 902 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.wlN2BfbFbh/checkout (ticket 902)
  | [2026-09-21 12:22:17-0300] ticket 903 (3 processáveis)
  | [2026-09-21 12:22:17-0300] nenhum processável não tentado — encerrando (aprovados: 1; sem progresso: 901 902)
  | [2026-09-21 12:22:17-0300] drenagem encerrada: 1 aprovado(s) e mergeado(s)
  | [2026-09-21 12:22:17-0300] ocioso: 901 sem progresso · 902 sem progresso
  ok    executor chamado 3x numa drenagem: 901 902 903 
  ok    terminou em <= N=3 chamadas (sem loop)
  ok    cada ticket tentado UMA vez, na ordem da fila
  ok    o executor recebe --ticket (não reescolhe)
  ok    o saudável (903) foi processado: done
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-09-21T12:22:17-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 sem_progresso=2 dur=0min
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
  nota: sem_progresso: 3 disparos sem progresso entre 2026-09-21 12:22:17-0300 e 2026-09-21 12:22:18-0300; última causa: executor morreu (rc=128, fase=worktree): fatal: '/tmp/_worktrees/fx-901' already exists
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
  trilha: 2026-09-21T12:22:21-0300 --- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
  ok    evento OCIOSO pendentes=3
  ok    244: dependência 241b em bloqueado
  ok    232: dependência 231 em pendente
  ok    231: liberação humano:migration-0031 ausente
  ok    UM evento por drenagem
  ok    trilha continua uma linha por evento (nenhuma linha sem timestamp)
  ok    OCIOSO vem antes do DRENAGEM_FIM
  STATUS.md:
    ORQUESTRADOR · 2026-09-21 12:22:21
    ESTADO   ocioso
    TICKET   —
    DESDE    —
    FASE     —
    FILA     3 pendente · 1 bloqueado · 1 done
    STAGING  3d18d51 · push suprimido (publicar é humano neste repo)
    ÚLTIMO   —
    MOTIVO   sem ticket processável: 231 sem liberação humano:migration-0031 · 232 espera 231 (pendente) · 244 espera 241b (bloqueado)
  ok    STATUS mantém o motivo de sempre
  ok    STATUS: 244 espera 241b (bloqueado)
  ok    STATUS: 232 espera 231 (pendente)
  ok    STATUS: 231 sem liberação
  ok    DRENAGEM_FIM sem campo novo

== 2. pendente pulado por sem-progresso nesta drenagem ==
  trilha: 2026-09-21T12:22:21-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=sem_progresso
  ok    250 foi tentado uma vez
  ok    250: pulado por sem-progresso
  ok    STATUS: 250 sem progresso

== 3. cooldown ativo: o liberado espera o cooldown ==
  trilha: 2026-09-21T12:22:22-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=cooldown:12:52
  ok    250: cooldown até 12:52
  ok    a razão de dependência vence o cooldown
  ok    STATUS: 250 em cooldown até 12:52

== 4. fins que NÃO gravam OCIOSO ==
  ok    pausa: sem OCIOSO (quem pausou já sabe)
  ok    sem pendente nenhum: sem OCIOSO

TODOS OS CHECKS PASSARAM

rc(test-ocioso.sh) = 0

--- test-rc-executor.sh ---
== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) ==
  ok    pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)

== o rc do executor atravessa o tee ==
  --- A: executor sai 3, tee sai 0 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:22:22-0300 e 2026-09-21 12:22:22-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    A: o log vê rc=3
  ok    A: a causa do bloqueio carrega rc=3
  --- B: executor sai 0, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:22:23-0300 e 2026-09-21 12:22:23-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    B: o log vê rc=0
  ok    B: a causa do bloqueio carrega rc=0
  --- C: executor sai 0, tee sai 5 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:22:23-0300 e 2026-09-21 12:22:23-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    C: o log vê rc=0
  ok    C: a causa do bloqueio carrega rc=0
  --- D: executor sai 3, tee sai 5 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:22:23-0300 e 2026-09-21 12:22:23-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    D: o log vê rc=3
  ok    D: a causa do bloqueio carrega rc=3

TODOS OS CHECKS PASSARAM

rc(test-rc-executor.sh) = 0

== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
  rc=0  test-drenagem-sem-progresso.sh
  rc=0  test-sem-progresso-limite.sh
  rc=0  test-ocioso.sh
  rc=0  test-rc-executor.sh
TODOS OS SCRIPTS SAÍRAM rc 0
rc=0
```

### scripts/kit/test-instalar.sh

```
[fixture] tmp: /tmp/orq-fixture-xdqfM9
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-xdqfM9/repo
== (a) fixture recém-instanciado ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-fixture-xdqfM9/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    diz 'idêntico ao kit <VERSAO>'

== (b) cópia do fixture com UM byte a mais em lib.sh ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-pxinir/repo
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
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-Gs4fyP/repo
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
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-gFKqLO/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  | 
  | O --atualizar de verdade RECUSARIA, por:
  |   · o loop de '/private/tmp/orq-verificar-gFKqLO/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  |   (a recusa não impede este dry-run de listar tudo)
  ok    rc 0
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    o lib.sh do repo NÃO foi tocado pelo --dry-run
-- (e2) --atualizar sem pausa: recusa com rc 1 --
  | RECUSADO: o loop de '/private/tmp/orq-verificar-gFKqLO/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  ok    rc 1
  ok    a recusa diz que o loop não está pausado
  ok    o repo continua intacto depois da recusa
-- (e2b) com PAUSAR, mas com modificação não commitada no motor: recusa --
  | ?? scripts/orquestrador/nao-commitado.txt
  | RECUSADO: '/private/tmp/orq-verificar-gFKqLO/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA o caminho
  ok    o repo continua intacto depois da recusa 3
-- (e3) --atualizar com PAUSAR e motor limpo: atualiza e fica idêntico --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-gFKqLO/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-gFKqLO/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-gFKqLO/repo
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
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-xGtNnp/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-xGtNnp/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | só no repo  scripts/orquestrador/so-do-repo.py
  | 
  | 1 diferença(s)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-xGtNnp/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 1 (há 'só no repo' — o verificador do fim conta como diferença)
  ok    so-do-repo.py SOBREVIVEU
  ok    listado como 'só no repo'

== (g) --atualizar recusa com scripts/roadmap/ sujo, e --forcar passa ==
  |  M scripts/roadmap/lint-mapa.py
  | RECUSADO: '/private/tmp/orq-verificar-fyX8U6/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA scripts/roadmap/lint-mapa.py
  ok    o lint-mapa.py do repo continua intacto depois da recusa
-- (g2) com --forcar: passa, avisa, e o lint-mapa.py vira o do kit --
  |  M scripts/roadmap/lint-mapa.py
  | --forcar: passando por cima de 1 caminho(s) modificado(s) no motor do repo.
  | 
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-fyX8U6/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-fyX8U6/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-fyX8U6/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    avisa que passou por cima
  ok    o lint-mapa.py do repo é o do kit

== (h) --verificar/--atualizar cobrem os testes do harness ==
-- (h1) --verificar acusa o teste envelhecido --
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-1QnagI/repo
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
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-1QnagI/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-1QnagI/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-1QnagI/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    test/orquestrador-pacotes.test.ts do repo é o do kit
  ok    test/produto.test.ts intacto
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
-- (h3) a suíte do REPO passa com os testes que o kit instalou --
  |    ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2139ms
  | 
  |  Test Files  8 passed (8)
  |       Tests  62 passed (62)
  |    Start at  12:22:25
  |    Duration  3.63s (transform 127ms, setup 0ms, collect 3.63s, tests 4.39s, environment 1ms, prepare 306ms)
  ok    npx vitest run no repo: rc 0

== (i) --atualizar --migrar: .orq-pause -> PAUSAR, liberações -> v2 ==
-- (i1) --migrar --dry-run: mostra tudo e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-DR0kIV/repo
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
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-DR0kIV/repo/docs/fila/liberacoes.json)
  |            --dry-run: NADA é escrito
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | --- /private/tmp/orq-verificar-DR0kIV/repo/docs/fila/liberacoes.json (atual)
  | +++ /private/tmp/orq-verificar-DR0kIV/repo/docs/fila/liberacoes.json (v2 proposto)
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
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-DR0kIV/repo/docs/fila)
  |            --dry-run: NADA é escrito
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-DR0kIV/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-DR0kIV/repo/docs/fila/000-config.json
  |                --dry-run: NADA é escrito
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | 
  | --- /private/tmp/orq-verificar-DR0kIV/repo/docs/fila/000-config.json (oficial, INTOCADO)
  | +++ /private/tmp/orq-verificar-DR0kIV/repo/docs/fila/000-config.proposto.json (proposto)
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
  | CONFIG   /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/orq-cfg-P5Qon9/000-config.json
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
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
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
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-DR0kIV/repo/docs/fila/liberacoes.json)
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | @@ -1,9 +1,35 @@
  | 
  | GRAVADO. Cópia do estado anterior em /private/tmp/orq-verificar-DR0kIV/repo/docs/fila/liberacoes.json.bak
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-DR0kIV/repo/docs/fila)
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-DR0kIV/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-DR0kIV/repo/docs/fila/000-config.json
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
  | PROPOSTO gravado em /private/tmp/orq-verificar-DR0kIV/repo/docs/fila/000-config.proposto.json. O oficial NÃO foi tocado.
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /private/tmp/orq-verificar-DR0kIV/repo/docs/fila/000-config.proposto.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | O config NÃO foi aplicado, e isso é a peça funcionando. Passo humano:
  | 
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
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
  FALHA o renome não foi aplicado
  FALHA o nome antigo continua lá
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
  | NOVO       kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-novo-OljTTx
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
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-novo-OljTTx
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | --- orq config (o formulário ainda está em branco; é assim que ele nasce) ---
  | CONFIG   /private/tmp/orq-novo-OljTTx/docs/fila/000-config.json
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
  |   cd /private/tmp/orq-novo-OljTTx
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
  | RECUSADO: '/private/tmp/orq-sem-tsx-XkzdOr' não tem node_modules/.bin/tsx: o motor do orquestrador é TypeScript e nenhuma parte dele roda sem tsx. Instale a dependência de DESENVOLVIMENTO no repo, com o loop pausado, e repita: npm i -D tsx@^4.19.0   (ou o equivalente do gerenciador deste repo)
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

== (c) /Users/lucasantos/Projetos/conteudos-infinitos (SÓ LEITURA — o resultado é achado, não gate) ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /Users/lucasantos/Projetos/conteudos-infinitos
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/config-chaves.ts
  | diferente   scripts/orquestrador/lib.sh
  | diferente   scripts/orquestrador/local-loop.sh
  | só no kit   scripts/orquestrador/test-drenagem-sem-progresso.sh
  | diferente   scripts/orquestrador/test-drenagem.sh
  | só no kit   scripts/orquestrador/test-fixture-drenagem.sh
  | só no kit   scripts/orquestrador/test-ocioso.sh
  | só no kit   scripts/orquestrador/test-rc-executor.sh
  | só no kit   scripts/orquestrador/test-sem-progresso-limite.sh
  | só no kit   docs/orquestrador/skill/references/higiene-de-execucao.md
  | diferente   docs/orquestrador/skill/templates/config.json
  | 
  | 11 diferença(s)
  (rc 1 — informativo)

2 CHECK(S) FALHARAM
rc=1
```

### git log --oneline main..kit/etapa7a

```
84958eb 7a-7: teste de que o rc do executor atravessa o tee da drenagem
cd0f951 7a-6: os três testes da etapa 7a entram no test-shell.sh e no isolamento
97e492c 7a-5: docs da etapa 7a (PECAS, CHANGELOG e CONTRATO)
3a62c5e 7a-4: ocioso que diz por quê (evento OCIOSO e o motivo no STATUS)
6e458e1 7a-3: contador persistente de sem-progresso que bloqueia no limite
05b2898 7a-2: a drenagem pula o ticket que não avança em vez de encerrar
f6cd542 7a-1: test-drenagem.sh com fixture própria, sem docs/fila do checkout
```

O item "test-shell.sh rodar os três testes novos" da lista da 7b está resolvido pela 7a-6.

---

# Acréscimo · 7a-8 (ambiente não bloqueia a fila)

sha: `b70e6e3`. Mesmas regras; sem push, sem merge.

## O que mudou

- **Normalização da causa** (`local-loop.sh:causa_normalizada`): caminhos viram
  `<caminho>`, o id do ticket vira `<id>`, número puro vira `<n>`, shas viram `<sha>`, e os
  dígitos que sobram dentro de palavras viram `<n>`. Número puro é tratado ANTES da regra de
  sha: na primeira versão um pid de 7+ dígitos casava como sha, e um pid curto num ticket e
  longo no outro dariam causas diferentes, deixando o ambiente escapar. O teste final fixa
  esse caso (pid 4242 no 901 e 123456789 no 902); a correção entrou por amend no próprio
  commit da peça, que é local.
- **Detecção.** A drenagem guarda "<id> TAB <causa normalizada>" das voltas sem progresso.
  A mesma causa normalizada para OUTRO ticket = ambiente: os contadores somados nesta
  drenagem voltam ao valor anterior (backup da linha antiga, ou remoção se não existia), os
  bloqueios pendentes caem, sai `AMBIENTE tickets=<id>,<id> causa=<normalizada>`, a drenagem
  para com `motivo_ocioso=ambiente` e o STATUS mostra `ambiente: <causa>`. Não sai OCIOSO
  nesse fim.
- **Bloqueio no fim da drenagem.** Para "não some para ninguém nesta drenagem" valer também
  para quem já estava no limite, o bloqueio por sem-progresso passou a ser aplicado depois
  do laço, e só se a drenagem não terminou em ambiente. Os testes da 7a-3 continuam verdes,
  porque o bloqueio acontece no mesmo disparo.
- **Teste da 7a-2 ajustado.** O stub dava a MESMA mensagem de preflight para 901 e 902, o
  que pela regra nova é ambiente (a versão antiga do teste, rodada contra o código novo,
  para em 2 chamadas com AMBIENTE; saída abaixo). O stub passou a dar causas próprias e
  diferentes, e o teste segue provando o pulo (3 chamadas, 903 done).
- **Notificação** (decisão, para conferir): não mexi. Com o preflight recusando, o
  executor grava EXECUTOR_MORREU e a peça 13 conta isso como processado, então a drenagem em
  ambiente NOTIFICA a cada disparo. Se isso for ruído, o conserto natural é tratar
  `ambiente` como a fila vazia (avisar só na primeira vez), numa peça da 7b.
- CONTRATO 4.1: linha `AMBIENTE` na tabela, parágrafo com a regra e exemplo, e a nota de
  que o bloqueio por sem-progresso acontece no fim da drenagem. `test-ambiente.sh` no
  `test-shell.sh` e na lista de isolamento do vitest.

## Vermelho (o teste final contra o local-loop.sh de 84958eb, antes da 7a-8)

A fila inteira bloqueada no 3º disparo, 3 chamadas por disparo, nenhum AMBIENTE:

```
== 1. preflight recusa TODO ticket, 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 903 ] 901=pendente/1 902=pendente/1 903=pendente/1
  --- disparo 2 (preflight): chamadas [901 902 903 ] 901=pendente/2 902=pendente/2 903=pendente/2
  --- disparo 3 (preflight): chamadas [901 902 903 ] 901=bloqueado/ 902=bloqueado/ 903=bloqueado/
  FALHA 3 ticket(s) bloqueado(s) por ambiente
  ok    contadores zerados (nenhum .sem-progresso)
  FALHA esperava 3 AMBIENTE, há 0
  FALHA um disparo chamou o executor 3 vezes
  trilha: 
  FALHA evento fora do formato
  FALHA causa perdeu o texto: 
  FALHA DRENAGEM_FIM: 2026-09-21T12:29:14-0300 --- DRENAGEM_FIM aprovados=0 bloqueados=3 adiados=0 refatiar=0 sem_progresso=0 dur=0min
  STATUS: MOTIVO   sem ticket processável
  FALHA STATUS sem a causa de ambiente
  FALHA motivo não começa por ambiente

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

8 CHECK(S) FALHARAM
rc=1
```

## Verde

```
== 1. preflight recusa TODO ticket, 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  ok    0 bloqueados depois de 3 disparos
  ok    contadores zerados (nenhum .sem-progresso)
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas ao executor por disparo (máx: 2)
  trilha: 2026-09-21T12:29:11-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
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
rc=0
```

## O teste antigo da 7a-2 (mesma causa em 901 e 902) contra o código novo

Esperado pela regra nova, e é por isso que o stub mudou:

```
== fila: 901 e 902 abortam antes do agente, 903 é saudável (N=3) ==
  | [2026-09-21 12:28:12-0300] ticket 901 (3 processáveis)
  | [orq ERRO] preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.4cmwdjSxsc/checkout (ticket 901)
  | [2026-09-21 12:28:13-0300]   ticket 901 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.4cmwdjSxsc/checkout (ticket 901)
  | [2026-09-21 12:28:13-0300] ticket 902 (3 processáveis)
  | [orq ERRO] preflight: árvore de execução suja em /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.4cmwdjSxsc/checkout (ticket 902)
  | [2026-09-21 12:28:13-0300]   AMBIENTE: 901 e 902 pararam pela mesma causa (preflight: árvore de execução suja em <caminho> (ticket <id>)) — nada soma nesta drenagem; encerrando
  | [2026-09-21 12:28:13-0300] drenagem encerrada: 0 aprovado(s) e mergeado(s)
  FALHA esperava 3 chamadas (901, 902, 903), obtive 2: '901 902 ' — <3 = ticket travado segurou a fila
  ok    terminou em <= N=3 chamadas (sem loop)
  FALHA ordem/repetição inesperada: '901 902 '
  ok    o executor recebe --ticket (não reescolhe)
  FALHA 903 devia estar done, está pendente
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-09-21T12:28:13-0300 --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=0 refatiar=0 sem_progresso=0 dur=0min
  FALHA DRENAGEM_FIM sem aprovados=1
  FALHA DRENAGEM_FIM sem sem_progresso=2
  STATUS motivo: ambiente: preflight: árvore de execução suja em <caminho> (ticket <id>)
  FALHA motivo_ocioso não lista os dois pulados: 'ambiente: preflight: árvore de execução suja em <caminho> (ticket <id>)'

6 CHECK(S) FALHARAM
rc=1
```

## Diff

```diff
commit b70e6e3f0b191ea146eac5fd3784eaecf4029fb2

7a-8: ambiente não bloqueia a fila (evento AMBIENTE)

Antes de somar no contador de sem-progresso, a causa é normalizada (caminhos,
id do ticket, shas e números saem). A mesma causa normalizada em OUTRO ticket
na mesma drenagem é ambiente: os contadores somados nesta drenagem voltam ao
valor anterior, os bloqueios pendentes caem, a trilha ganha
AMBIENTE tickets=<ids> causa=<normalizada>, a drenagem para com
motivo_ocioso=ambiente e o STATUS diz "ambiente: <causa>". Para isso o
bloqueio por sem-progresso passa a acontecer no fim da drenagem, e só se ela
não terminar em ambiente.

Prova: test-ambiente.sh. 3 pendentes com o preflight recusando todos, 3
disparos: 0 bloqueados, contadores zerados, 3 AMBIENTE, no máximo 2 chamadas
por disparo; causas diferentes seguem somando; um ticket sozinho travado
continua bloqueando no 3º disparo. Antes, a fila inteira ia para bloqueado
no 3º disparo.

O stub de test-drenagem-sem-progresso.sh (7a-2) dava a MESMA mensagem de
preflight para 901 e 902, o que agora é ambiente; passou a dar causas
próprias. Evento no CONTRATO 4.1; teste no test-shell.sh e no isolamento.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>


diff --git a/CONTRATO.md b/CONTRATO.md
index 3b37217..44eb628 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -189,6 +189,7 @@ Estes, e só estes, são emitidos hoje (`grep -rn '^\s*event ' scripts/`):
 | `ANOTACAO` | `lib.sh:274` | `nota=` |
 | `PREVOO_NOGO` | `local-loop.sh:prevoo_ou_sai` | `item=cat.0\|cat.1\|cat.6` |
 | `OCIOSO` | `local-loop.sh:drenar` (peça 7a-4) | `pendentes=` e um `<id>=<razão>` por pendente; ver abaixo |
+| `AMBIENTE` | `local-loop.sh:drenar` (peça 7a-8) | `tickets=<id>,<id>` `causa=<normalizada>` (a causa vai até o fim da linha); ver abaixo |
 
 `motivo=` é sempre token curto e estável (grepável), nunca frase.
 
@@ -209,7 +210,24 @@ executor na trilha (`EXECUTOR_MORREU` vira `executor morreu (rc=, fase=)` mais
 a linha `[orq ERRO]`/`fatal:` da saída); sem desfecho, a nota nova, e só por
 último a linha com `ERRO|fatal|FAIL`. Não conta: adiamento (com cooldown, ou
 com `ADIADO`/nota `adiado` sem cooldown). Zera: o ticket sair de `pendente`, ou
-a branch alvo avançar na vez dele.
+a branch alvo avançar na vez dele. Desde a peça 7a-8 o bloqueio acontece no FIM
+da drenagem, e só se ela não terminar em `AMBIENTE`.
+
+**`AMBIENTE tickets=<id>,<id> causa=<normalizada>`** (peça 7a-8). Antes de somar,
+a causa da volta sem progresso é NORMALIZADA (`local-loop.sh:causa_normalizada`):
+caminhos viram `<caminho>`, o id do ticket vira `<id>`, shas viram `<sha>` e
+números viram `<n>`. Se a mesma causa normalizada já apareceu nesta drenagem
+para OUTRO ticket, o problema não é de ticket, é de ambiente (recusa de
+preflight, lock de git, identidade): nenhum contador soma nesta drenagem (o que
+já tinha somado volta ao valor anterior), nenhum bloqueio pendente vale, a
+trilha ganha UM `AMBIENTE` com os dois tickets que colidiram, a drenagem para
+com `motivo_ocioso=ambiente` e o `MOTIVO` do STATUS é `ambiente: <causa>`. Não
+sai `OCIOSO` nesse fim. No máximo 2 chamadas ao executor por disparo com o
+ambiente quebrado. Um ticket isolado com causa própria segue a regra de cima.
+
+```
+--- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
+```
 
 **`OCIOSO`** (peça 7a-4) sai UMA vez por drenagem, logo antes do
 `DRENAGEM_FIM`, quando ela termina sem nenhum pendente processável e há ao menos
diff --git a/scripts/kit/test-shell.sh b/scripts/kit/test-shell.sh
index 95bd161..0127a18 100644
--- a/scripts/kit/test-shell.sh
+++ b/scripts/kit/test-shell.sh
@@ -18,6 +18,7 @@
 #   test-sem-progresso-limite.sh    contador persistente que bloqueia no limite (7a-3)
 #   test-ocioso.sh                  o evento OCIOSO diz por que cada pendente não roda (7a-4)
 #   test-rc-executor.sh             o rc do executor atravessa o tee da drenagem (7a-7)
+#   test-ambiente.sh                a mesma causa em dois tickets é ambiente e não bloqueia a fila (7a-8)
 #
 # Cada um monta o PRÓPRIO `ORQ_EXEC_ROOT` num `mktemp -d` (drenagem e retry) ou
 # trabalha direto no checkout (lib-config); nada aqui precisa exportar
@@ -33,7 +34,7 @@
 set -uo pipefail
 
 KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
-SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh'
+SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh'
 
 FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
   printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
diff --git a/scripts/orquestrador/local-loop.sh b/scripts/orquestrador/local-loop.sh
index 7e0a0e4..3e91c22 100755
--- a/scripts/orquestrador/local-loop.sh
+++ b/scripts/orquestrador/local-loop.sh
@@ -226,6 +226,48 @@ sem_progresso_causa() {
   uma_linha "$(printf '%s' "$c" | tr -d '\r')" 300
 }
 
+# --- AMBIENTE NÃO BLOQUEIA A FILA (peça 7a-8) --------------------------------
+# Uma recusa de preflight (árvore suja, lock de git, identidade) mata o executor
+# para TODO ticket, igual. Sem esta peça cada drenagem somava +1 em todos os
+# pendentes e, no 3º disparo, a fila inteira ia para bloqueado por um problema
+# que não é de ticket nenhum.
+#
+# causa_normalizada <causa> <id> -> a causa sem o que varia de ticket para
+# ticket: caminhos, o id do próprio ticket, shas e números. Número puro vira
+# <n> ANTES da regra de sha: um pid de 4 dígitos num ticket e de 9 no outro
+# têm de normalizar igual, e 7+ dígitos casariam como sha. Duas causas
+# normalizadas iguais em tickets DIFERENTES na mesma drenagem = ambiente.
+causa_normalizada() {
+  local id_re
+  id_re="$(printf '%s' "$2" | sed 's/[][\.*^$/+?(){}|]/\\&/g')"
+  printf '%s' "$1" | sed -E \
+    -e "s#(^|[[:space:]'\"(=])(~|\\.\\.?)?/[^[:space:]:;,()'\"]+#\\1<caminho>#g" \
+    -e "s/(^|[^[:alnum:]])${id_re}([^[:alnum:]]|\$)/\\1<id>\\2/g" \
+    -e "s/(^|[^[:alnum:]])${id_re}([^[:alnum:]]|\$)/\\1<id>\\2/g" \
+    -e 's/(^|[^[:alnum:]])[0-9]+([^[:alnum:]]|$)/\1<n>\2/g' \
+    -e 's/(^|[^[:alnum:]])[0-9]+([^[:alnum:]]|$)/\1<n>\2/g' \
+    -e 's/(^|[^[:alnum:]])[0-9a-f]{7,40}([^[:alnum:]]|$)/\1<sha>\2/g' \
+    -e 's/(^|[^[:alnum:]])[0-9a-f]{7,40}([^[:alnum:]]|$)/\1<sha>\2/g' \
+    -e 's/[0-9]+/<n>/g' \
+    -e 's/[[:space:]]+/ /g'
+}
+
+# sem_progresso_desfazer <backup> -> devolve cada contador somado nesta
+# drenagem ao que era antes. Backup: uma linha "<id><TAB><linha anterior>" por
+# ticket, linha anterior vazia = o arquivo não existia.
+sem_progresso_desfazer() {
+  local bid blinha f
+  while IFS=$'\t' read -r bid blinha <&3; do
+    [ -n "$bid" ] || continue
+    f="$(sem_progresso_arquivo "$bid")"
+    escrita_de_teste_permitida "$f" || continue
+    if [ -z "$blinha" ]; then rm -f "$f" 2>/dev/null || true
+    else printf '%s\n' "$blinha" > "$f" 2>/dev/null || true; fi
+  done 3<<EOF
+$1
+EOF
+}
+
 # --- OCIOSO QUE DIZ POR QUÊ (peça 7a-4) --------------------------------------
 # O CI ficou 12 dias parado com 4 pendentes presos atrás de dependências
 # bloqueadas, e a única coisa escrita, a cada disparo, era "sem ticket
@@ -292,6 +334,11 @@ drenar() {
   local tentados='' sem_progresso=0 adiados_sc='' razoes motivo_status campos id r
   # O que a drenagem lê do executor ALÉM do status (peça 7a-3).
   local ev_antes sha_antes sha_depois nota_antes nota_depois exe_out exe_rc evs sp n lim causa primeira ultima
+  # Peça 7a-8: causas vistas nesta drenagem ("<id><TAB><normalizada>"), o
+  # backup dos contadores somados, e os bloqueios que esperam o fim da drenagem
+  # (só valem se ela não terminar em ambiente).
+  local causas_vistas='' sp_backup='' a_bloquear='' norm outro ambiente_causa=''
+  local bid bfile bsp blim bcausa
   stwt="$(ensure_staging_worktree)"
   t0="$(date +%s)"
   # EXECUTOR_MORREU conta como ticket PROCESSADO (peça 13), e a drenagem não tem
@@ -411,18 +458,31 @@ drenar() {
         say "  ticket $prox_id adiado sem cooldown — não conta como sem progresso; segue para o próximo não tentado"
       else
         causa="$(sem_progresso_causa "$evs" "$exe_out" "$exe_rc" "$nota_antes" "$nota_depois")"
+        # Peça 7a-8: a mesma causa normalizada já apareceu nesta drenagem para
+        # OUTRO ticket? Então não é do ticket, é do ambiente: ninguém soma nesta
+        # drenagem (desfaz o que já foi somado), nenhum bloqueio pendente vale,
+        # a trilha ganha AMBIENTE e a drenagem para.
+        norm="$(causa_normalizada "$causa" "$prox_id")"
+        outro="$(printf '%s\n' "$causas_vistas" | awk -F'\t' -v c="$norm" -v id="$prox_id" '$2 == c && $1 != id { print $1; exit }')"
+        if [ -n "$outro" ]; then
+          sem_progresso_desfazer "$sp_backup"
+          sp_backup=''; a_bloquear=''; sem_progresso=0
+          tentados="$tentados$prox_id "
+          event '---' AMBIENTE "tickets=$outro,$prox_id" "causa=$norm"
+          say "  AMBIENTE: $outro e $prox_id pararam pela mesma causa ($norm) — nada soma nesta drenagem; encerrando"
+          motivo_ocioso=ambiente; ambiente_causa="$norm"
+          rm -f "$exe_out"; break
+        fi
+        causas_vistas="$causas_vistas$prox_id"$'\t'"$norm"$'\n'
+        sp_backup="$sp_backup$prox_id"$'\t'"$(head -1 "$(sem_progresso_arquivo "$prox_id")" 2>/dev/null || true)"$'\n'
         sp="$(sem_progresso_incrementar "$prox_id")"
         n="${sp%%|*}"; lim="$(sem_progresso_limite)"
         if [ "$n" -ge "$lim" ]; then
-          primeira="$(printf '%s' "$sp" | cut -d'|' -f2)"; ultima="${sp##*|}"
-          ticket_set "$prox" '.status = "bloqueado" | .notas_status = $n' \
-            --arg n "sem_progresso: $n disparos sem progresso entre $primeira e $ultima; última causa: $causa"
-          ticket_commit "$prox" "fila: $prox_id bloqueado (sem_progresso, $n disparos)"
-          event "$prox_id" BLOQUEADO "motivo=sem_progresso" "n=$n" "limite=$lim"
-          status_set "ultimo=$prox_id BLOQUEADO $(date '+%H:%M:%S') (sem progresso em $n disparos)"
-          sem_progresso_zerar "$prox_id"
-          say "  SEM PROGRESSO: $prox_id bloqueado após $n disparos ($primeira .. $ultima); última causa: $causa"
-          bloqueados=$((bloqueados + 1))
+          # O bloqueio espera o FIM da drenagem: se um ticket seguinte parar pela
+          # mesma causa, era ambiente e este não pode ter sido bloqueado por ela.
+          tentados="$tentados$prox_id "
+          a_bloquear="$a_bloquear$prox_id"$'\t'"$prox"$'\t'"$sp"$'\t'"$lim"$'\t'"$causa"$'\n'
+          say "  ticket $prox_id atingiu o limite de sem progresso ($n/$lim) — bloqueia no fim da drenagem, se ela não terminar em ambiente. Causa: $causa"
         else
           tentados="$tentados$prox_id "
           sem_progresso=$((sem_progresso + 1))
@@ -432,13 +492,30 @@ drenar() {
     fi
     rm -f "$exe_out"
   done
+  # Os bloqueios por sem-progresso que esperaram o fim da drenagem (7a-8). Se
+  # ela terminou em ambiente, a lista já foi esvaziada.
+  while IFS=$'\t' read -r bid bfile bsp blim bcausa <&3; do
+    [ -n "$bid" ] || continue
+    n="${bsp%%|*}"; primeira="$(printf '%s' "$bsp" | cut -d'|' -f2)"; ultima="${bsp##*|}"
+    ticket_set "$bfile" '.status = "bloqueado" | .notas_status = $n' \
+      --arg n "sem_progresso: $n disparos sem progresso entre $primeira e $ultima; última causa: $bcausa"
+    ticket_commit "$bfile" "fila: $bid bloqueado (sem_progresso, $n disparos)"
+    event "$bid" BLOQUEADO "motivo=sem_progresso" "n=$n" "limite=$blim"
+    status_set "ultimo=$bid BLOQUEADO $(date '+%H:%M:%S') (sem progresso em $n disparos)"
+    sem_progresso_zerar "$bid"
+    say "  SEM PROGRESSO: $bid bloqueado após $n disparos ($primeira .. $ultima); última causa: $bcausa"
+    bloqueados=$((bloqueados + 1))
+  done 3<<EOF
+$a_bloquear
+EOF
   dur=$(( ($(date +%s) - t0 + 30) / 60 ))
   say "drenagem encerrada: $drenados aprovado(s) e mergeado(s)"
   # OCIOSO (peça 7a-4): a drenagem acabou sem processável e há pendente. UM
   # evento por drenagem, com a razão de cada pendente — uma linha, como toda a
   # trilha. Pausa não entra: é a palavra do humano, e quem pausou já sabe.
   motivo_status="${motivo_ocioso:-drenagem encerrada}"
-  if [ "$motivo_ocioso" != pausado ] && razoes="$(ocioso_razoes "$tentados" "$adiados_sc")" && [ -n "$razoes" ]; then
+  [ "$motivo_ocioso" != ambiente ] || motivo_status="ambiente: $ambiente_causa"
+  if [ "$motivo_ocioso" != pausado ] && [ "$motivo_ocioso" != ambiente ] && razoes="$(ocioso_razoes "$tentados" "$adiados_sc")" && [ -n "$razoes" ]; then
     campos=''; n=0
     while read -r id r; do
       [ -n "$id" ] || continue
diff --git a/scripts/orquestrador/test-ambiente.sh b/scripts/orquestrador/test-ambiente.sh
new file mode 100644
index 0000000..55d6b67
--- /dev/null
+++ b/scripts/orquestrador/test-ambiente.sh
@@ -0,0 +1,134 @@
+#!/usr/bin/env bash
+# test-ambiente.sh — ambiente não bloqueia a fila (peça 7a-8).
+#
+# O furo da 7a-3: uma recusa de preflight (árvore suja, lock de git, identidade)
+# mata o executor para TODO ticket, igual. Cada drenagem somava +1 em todos os
+# pendentes e, no 3º disparo, a fila inteira ia para bloqueado por um problema
+# que não é de ticket nenhum.
+#
+# A regra: a causa é NORMALIZADA (sem id de ticket, sha, número, caminho) antes
+# de somar. A mesma causa normalizada em OUTRO ticket na mesma drenagem é
+# ambiente: ninguém soma nesta drenagem (a soma do primeiro é desfeita), a
+# trilha ganha AMBIENTE causa=<normalizada> tickets=<ids>, a drenagem para com
+# motivo ambiente e o STATUS diz a causa.
+#
+#   1. 3 pendentes, preflight recusando todos, 3 disparos: 0 bloqueados,
+#      contadores zerados, 3 eventos AMBIENTE, no máximo 2 chamadas por disparo.
+#   2. causas diferentes em tickets diferentes NÃO são ambiente: cada um soma.
+#   3. um ticket sozinho travado continua bloqueando no 3º disparo (7a-3).
+#
+# Uso: bash scripts/orquestrador/test-ambiente.sh
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
+fx_config "$ORQ_EXEC_ROOT" '.sem_progresso_limite = 3'
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
+MODO="$TMP/modo"     # preflight | proprio
+CALLS="$TMP/calls"
+
+ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
+merge_em_alvo() { return 0; }
+cleanup_frente() { return 0; }
+run_executor_once() {
+  local id; id="$(ticket_field "$2" '.id')"
+  echo "$id" >> "$CALLS"
+  case "$(cat "$MODO")" in
+    preflight)
+      # Igual ao executor real: o `die` do preflight sai ANTES de
+      # TICKET_EM_CURSO, então o trap grava EXECUTOR_MORREU com id "—" e
+      # fase "?". A mensagem carrega o que varia de ticket para ticket: o id,
+      # um sha, um pid e um caminho — é isso que a normalização tira.
+      # O pid tem 4 dígitos num ticket e 9 no outro, de propósito: número
+      # comprido não pode normalizar diferente de número curto.
+      local pid=4242; [ "$id" = 902 ] && pid=123456789
+      echo "[orq ERRO] preflight: lock de git em uso por outro processo: $ORQ_EXEC_ROOT/.git/index.lock (pid $pid, vez do $id, HEAD $(printf '%07x' $RANDOM$RANDOM)a)" >&2
+      event "—" EXECUTOR_MORREU "rc=1" "fase=?"
+      return 1 ;;
+    proprio)
+      # Causa PRÓPRIA de cada ticket: o texto muda de verdade, não só o id.
+      case "$id" in
+        904) echo "[orq ERRO] recusado: o ticket $id pede cmd fora do prefixo permitido" >&2 ;;
+        905) echo "fatal: branch 'frente/$id' está em uso por outra worktree" >&2 ;;
+        *)   echo "[orq ERRO] critério $id sem cmd executável" >&2 ;;
+      esac
+      event "$id" EXECUTOR_MORREU "rc=128" "fase=worktree"
+      return 128 ;;
+  esac
+}
+contador() { cut -d'|' -f1 "$RUNS_BASE/$1/.sem-progresso" 2>/dev/null || true; }
+st()       { ticket_field "$FILA/$1-t.md" '.status'; }
+n_amb()    { grep -c ' AMBIENTE ' "$TRILHA" 2>/dev/null || true; }
+disparo()  {
+  : > "$CALLS"
+  drenar > "$TMP/out.$1" 2>&1
+  echo "  --- disparo $1 ($(cat "$MODO")): chamadas [$(tr '\n' ' ' < "$CALLS")]" \
+       "901=$(st 901)/$(contador 901) 902=$(st 902)/$(contador 902) 903=$(st 903)/$(contador 903)"
+}
+
+echo "== 1. preflight recusa TODO ticket, 3 disparos =="
+echo preflight > "$MODO"
+max=0
+for d in 1 2 3; do
+  disparo "$d"
+  n="$(grep -c . "$CALLS")"; [ "$n" -gt "$max" ] && max="$n"
+done
+bl=0; for id in 901 902 903; do [ "$(st "$id")" = bloqueado ] && bl=$((bl + 1)); done
+[ "$bl" = 0 ] && ok "0 bloqueados depois de 3 disparos" || falha "$bl ticket(s) bloqueado(s) por ambiente"
+[ -z "$(contador 901)$(contador 902)$(contador 903)" ] && ok "contadores zerados (nenhum .sem-progresso)" \
+  || falha "contadores: 901='$(contador 901)' 902='$(contador 902)' 903='$(contador 903)'"
+[ "$(n_amb)" = 3 ] && ok "3 eventos AMBIENTE (um por disparo)" || falha "esperava 3 AMBIENTE, há $(n_amb)"
+[ "$max" -le 2 ] && ok "no máximo 2 chamadas ao executor por disparo (máx: $max)" || falha "um disparo chamou o executor $max vezes"
+amb="$(grep ' AMBIENTE ' "$TRILHA" | tail -1)"
+echo "  trilha: $amb"
+case "$amb" in *" --- AMBIENTE tickets=901,902 causa="*) ok "evento com os tickets que colidiram" ;; *) falha "evento fora do formato" ;; esac
+causa="${amb#* causa=}"
+case "$causa" in *901*|*902*|*"$ORQ_EXEC_ROOT"*|*index.lock*) falha "causa não normalizada: $causa" ;;
+  *"preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)") ok "causa normalizada (sem id, sha, número, caminho)" ;;
+  *) falha "causa perdeu o texto: $causa" ;; esac
+fim="$(grep ' DRENAGEM_FIM ' "$TRILHA" | tail -1)"
+case "$fim" in *"bloqueados=0 "*"sem_progresso=0 "*) ok "DRENAGEM_FIM: bloqueados=0 sem_progresso=0" ;; *) falha "DRENAGEM_FIM: $fim" ;; esac
+mot="$(grep '^MOTIVO' "$FILA/runs/STATUS.md")"
+echo "  STATUS: $mot"
+case "$mot" in *"ambiente: "*"preflight: lock de git em uso"*) ok "STATUS diz ambiente e a causa" ;; *) falha "STATUS sem a causa de ambiente" ;; esac
+[ "$(jq -r '.motivo' "$FILA/runs/.status.json" | cut -d: -f1)" = ambiente ] && ok "motivo_ocioso=ambiente" || falha "motivo não começa por ambiente"
+
+echo
+echo "== 2. causas próprias em tickets diferentes NÃO são ambiente =="
+for id in 901 902 903; do ticket_set_status "$FILA/$id-t.md" done; ticket_commit "$FILA/$id-t.md" "fixture: $id fora"; done
+for id in 904 905; do fx_ticket "$ORQ_EXEC_ROOT" "$id"; git -C "$ORQ_EXEC_ROOT" add -- "docs/fila/$id-t.md"; done
+git -C "$ORQ_EXEC_ROOT" commit -q -m "fixture: 904 905"
+echo proprio > "$MODO"; antes="$(n_amb)"; disparo 4
+[ "$(contador 904)" = 1 ] && [ "$(contador 905)" = 1 ] && ok "904 e 905 somam 1 cada" || falha "904='$(contador 904)' 905='$(contador 905)'"
+[ "$(n_amb)" = "$antes" ] && ok "nenhum AMBIENTE" || falha "causas diferentes viraram AMBIENTE"
+
+echo
+echo "== 3. um ticket sozinho travado continua bloqueando no 3º disparo =="
+ticket_set_status "$FILA/905-t.md" done; ticket_commit "$FILA/905-t.md" "fixture: 905 fora"
+disparo 5; disparo 6
+[ "$(st 904)" = bloqueado ] && ok "904 bloqueado no 3º disparo" || falha "904 devia estar bloqueado, está $(st 904) ($(contador 904))"
+grep -Eq ' 904 BLOQUEADO motivo=sem_progresso( |$)' "$TRILHA" && ok "trilha: 904 BLOQUEADO motivo=sem_progresso" || falha "sem BLOQUEADO do 904"
+[ -z "$(git -C "$ORQ_EXEC_ROOT" status --porcelain -- docs/fila/904-t.md)" ] && ok "bloqueio commitado" || falha "bloqueio sem commit"
+[ "$(n_amb)" = "$antes" ] && ok "nenhum AMBIENTE no caso isolado" || falha "caso isolado virou AMBIENTE"
+
+echo
+if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
diff --git a/scripts/orquestrador/test-drenagem-sem-progresso.sh b/scripts/orquestrador/test-drenagem-sem-progresso.sh
index 005a66e..778275b 100644
--- a/scripts/orquestrador/test-drenagem-sem-progresso.sh
+++ b/scripts/orquestrador/test-drenagem-sem-progresso.sh
@@ -3,8 +3,8 @@
 # drenagem inteira (peça 7a-2). Porte do teste homônimo do comarka-operacional
 # para o `drenar()` do kit.
 #
-# Fila de 3: 901 e 902 abortam ANTES do agente (o executor sai rc 1 sem tocar no
-# status, como num preflight que morre) e 903 é saudável (vai a
+# Fila de 3: 901 e 902 abortam ANTES do agente, cada um por uma causa própria
+# (o executor sai rc 1 sem tocar no status) e 903 é saudável (vai a
 # aguardando_merge, a drenagem mergeia). Até a 7a-2 a drenagem encerrava no 901
 # ("sem progresso em 901") e o 903 nunca era tocado: uma chamada só. Agora são
 # três chamadas numa drenagem, o 903 vira done, e ela ainda TERMINA — no máximo
@@ -46,8 +46,13 @@ run_executor_once() {
   id="$(ticket_field "$2" '.id')"
   echo "$id" >> "$CALLS"
   case "$id" in
-    901|902)
-      echo "[orq ERRO] preflight: árvore de execução suja em $ORQ_EXEC_ROOT (ticket $id)" >&2
+    # Causas PRÓPRIAS e diferentes: desde a 7a-8, a mesma causa em dois
+    # tickets na mesma drenagem é ambiente e encerra a drenagem (test-ambiente.sh).
+    901)
+      echo "[orq ERRO] recusado: o ticket $id pede cmd fora do prefixo permitido" >&2
+      return 1 ;;
+    902)
+      echo "fatal: branch 'frente/$id' está em uso por outra worktree" >&2
       return 1 ;;
     *)
       ticket_set_status "$2" aguardando_merge
diff --git a/test/orquestrador-isolamento-teste.test.ts b/test/orquestrador-isolamento-teste.test.ts
index 04a84c9..9c21b1f 100644
--- a/test/orquestrador-isolamento-teste.test.ts
+++ b/test/orquestrador-isolamento-teste.test.ts
@@ -30,6 +30,7 @@ const SCRIPTS = [
   'test-sem-progresso-limite.sh',
   'test-ocioso.sh',
   'test-rc-executor.sh',
+  'test-ambiente.sh',
 ];
 
 /**
```

## Fechamento do acréscimo

As únicas falhas são as 3 antigas: a do vitest (config real do actus-saas) e as duas do
`(i5c)` do test-instalar.sh (ticket 306 do comarka-operacional). vitest: 1109 passam (o caso
de isolamento do `test-ambiente.sh` a mais). test-shell.sh: 8 scripts, todos rc 0.

### vitest

```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7a

 ✓ test/orquestrador-enforcement.test.ts (47 tests) 29ms
 ✓ test/orquestrador-enforcement-actus.test.ts (104 tests) 20ms
 ✓ test/orquestrador-prevoo.test.ts (34 tests) 6ms
 ✓ test/orquestrador-decisao.test.ts (37 tests) 8ms
 ✓ test/orquestrador-liberar-migrar.test.ts (37 tests) 3163ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > o resultado da migração PASSA no leitor do motor: todo token resolve 419ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > libera, sai 0 e o arquivo passa a ter o token 302ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > o token liberado DESTRAVA o ticket que dependia dele 700ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > duplicata: rc 1, RECUSADO, e o arquivo NÃO muda 720ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > arquivo em v1: recusa e manda migrar, sem tocar em nada 321ms
stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > actus-saas: em TODO ticket migrado, só o bloco muda
actus-saas: 0 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > comarka-operacional: em TODO ticket migrado, só o bloco muda
comarka-operacional: 29 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > conteudos-infinitos: em TODO ticket migrado, só o bloco muda
conteudos-infinitos: 0 ticket(s) migrados

 ✓ test/orquestrador-migrar-tickets.test.ts (32 tests) 2993ms
   ✓ a prosa não se move UM BYTE > comarka-operacional: a fila no disco do repo NÃO é tocada 454ms
   ✓ os dois renomes, na posição original da chave > a fila real do Comarka: UMA linha muda por ticket, e é sempre a mesma 512ms
   ✓ --dry-run e --aplicar > --dry-run não escreve 471ms
   ✓ --dry-run e --aplicar > --aplicar grava e NÃO deixa .bak (o ticket é versionado; o git é o backup) 397ms
   ✓ --dry-run e --aplicar > rodar de novo é no-op 411ms
   ✓ --dry-run e --aplicar > o migrado continua parseável pelo leitor do motor 447ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 4411ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 445ms
   ✓ a CLI é o contrato que `orq validar` repassa > com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>` 442ms
   ✓ a CLI é o contrato que `orq validar` repassa > --relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação 449ms
   ✓ a CLI é o contrato que `orq validar` repassa > --pendentes pega SÓ os pendentes 435ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 879ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 500ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > rc 1 e a linha de violação, chamado PELO symlink 419ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 822ms
 ✓ test/orquestrador-gates.test.ts (29 tests) 1273ms
   ✓ critérios do executor — strip de ANSI > saída COLORIDA casa o mesmo critério que a saída limpa 357ms
 ✓ test/doutrina-v2.test.ts (30 tests) 12ms
 ✓ test/orquestrador-toolchain-tsx.test.ts (30 tests) 4760ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > tsx_local_ok responde pelo binário DO REPO, e é `test -x` 493ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > recusa NOMEADA: rc 1, PREVOO_NOGO item=tsx na trilha e uma notificação 311ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > SEM acesso à rede: o `npx` nunca é chamado (o stub não registrou nada) 306ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > COM tsx no lugar, o guard passa e o loop segue para o kill switch 374ms
   ✓ cat.7 · toolchain > `orq prevoo` no fixture continua GO, com a cat.7 na saída 355ms
   ✓ instalar.sh · recusa repo sem tsx > com pnpm-lock.yaml a linha é `pnpm add -D`; com package-lock.json é `npm i -D` 339ms
   ✓ instalar.sh · recusa repo sem tsx > com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx) 919ms
 ✓ test/orquestrador-refatiar.test.ts (39 tests) 5851ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > diff acima do cap: refatiar, contaComoRetry false 442ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > arquivo fora da allowlist (enforcement): refatiar 415ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > zona proibida entra pelo MESMO campo — é a barreira que classifica 401ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > refatiar NÃO gera retry (o plano diz deveTentar=false) 362ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry 851ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar 407ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > status vira refatiar e a nota LISTA os arquivos 352ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a trilha registra REFATIAR com motivo= e arquivos= 310ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa 398ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a mesma pendência duas vezes não vira duas linhas 680ms
   ✓ o retry recebe o JSON, não o texto livre > o CLI monta o JSON a partir do rundir de verdade 369ms
 ✓ test/orquestrador-lock.test.ts (34 tests) 9ms
 ✓ test/orq-cli.test.ts (42 tests) 6444ms
   ✓ orq validar — o gate de ticket, com o rc repassado > fila limpa: rc 0 e nenhuma linha 313ms
 ✓ test/orquestrador-launchd-config.test.ts (15 tests) 541ms
 ✓ test/orquestrador-juiz.test.ts (39 tests) 6775ms
   ✓ LIXO é adiado, nunca reprovado > o parse do CLI sai com rc 3 (o código que o executor lê como ADIADO) 410ms
   ✓ LIXO é adiado, nunca reprovado > a fronteira está no decisao.ts: juizIlegivel ADIA e NÃO conta retry 407ms
   ✓ LIXO é adiado, nunca reprovado > NEGATIVO: sem o campo, o mesmo sinal segue aprovando como antes 373ms
   ✓ modelo por classe de risco (custo-e-contexto §7) > o CLI devolve classe + modelo juntos (é o que o shell consome) 394ms
   ✓ ponta a ponta com --stub-juiz > veredito aprovado: JUIZ_APROVADO=true e evidência gravada 900ms
   ✓ ponta a ponta com --stub-juiz > o prompt gravado carrega o critério avaliador e o bloco anti-afrouxamento 808ms
   ✓ ponta a ponta com --stub-juiz > veredito reprovado: motivo e criterios_falhos ficam disponíveis para o retry 823ms
   ✓ ponta a ponta com --stub-juiz > lixo: ILEGIVEL=1, nenhum veredito.json, e o CRU continua lá para auditoria 736ms
   ✓ ponta a ponta com --stub-juiz > a trilha registra o veredito, a classe e o modelo, com attempt 1-based 733ms
   ✓ ponta a ponta com --stub-juiz > o risco sobe pelo objetivo e leva o modelo forte junto 728ms
   ✓ ponta a ponta com --stub-juiz > NEGATIVO: --dry sem --stub-juiz pula o juiz e não inventa veredito 456ms
 ✓ test/orquestrador-tools-derivadas.test.ts (32 tests) 11ms
 ✓ test/orquestrador-piso-tools.test.ts (23 tests) 7ms
 ✓ test/orquestrador-agendamento.test.ts (21 tests) 190ms
 ✓ test/orquestrador-trilha.test.ts (22 tests) 2829ms
   ✓ o merge commit carrega o trailer, e o git o devolve > git log --grep acha o merge pelo trailer 478ms
   ✓ o merge commit carrega o trailer, e o git o devolve > NEGATIVO: o trailer é ancorado — 901 não casa 9012 433ms
   ✓ o prompt do executor cobra o trailer no commit do agente > o prompt montado nomeia o trailer e o id 321ms
   ✓ trilha e STATUS contam a primeira tentativa como 1 > a trilha REAL sai 1-based: o juiz na primeira tentativa registra attempt=1 392ms
 ✓ test/orquestrador-envelope.test.ts (25 tests) 1828ms
 ✓ test/orquestrador-gate-baseline.test.ts (21 tests) 5ms
 ✓ test/orquestrador-custo.test.ts (38 tests) 10034ms
   ✓ custo_registrar grava o consumo real da chamada > duas chamadas somam no mesmo dia, uma linha cada 411ms
   ✓ custo_registrar grava o consumo real da chamada > papel e ticket distinguem as chamadas (é o que o orq custo agrega) 371ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue com ledger corrompido: o executor é chamado 1010ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue sem ledger nenhum: o executor é chamado 865ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > ticket adiado até amanhã não é processável hoje 300ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o executor nunca é chamado 693ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > STATUS.md fica ocioso com MOTIVO orcamento 728ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o ticket fica adiado, sem consumir tentativa, e a trilha registra 762ms
   ✓ teto por TICKET adia só aquele ticket e a fila segue > adia o 901 por orcamento_ticket e passa ao 902 1118ms
 ✓ test/orq-versao-config.test.ts (16 tests) 3119ms
   ✓ orq config > READ-ONLY: nem versao nem config escrevem no repo 317ms
 ✓ test/orquestrador-push-suprimido.test.ts (14 tests) 8ms
 ✓ test/orquestrador-datar-liberacoes.test.ts (11 tests) 1564ms
   ✓ a migração inteira, ponta a ponta, no repo de verdade > o v2 gravado sai datado, e o relatório diz quantos 313ms
 ✓ test/orquestrador-observabilidade.test.ts (38 tests) 6033ms
   ✓ status_set reescreve o snapshot INTEIRO > NUNCA append: 20 transições e o arquivo continua do mesmo tamanho 1598ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > mudou o status de um ticket, mudou o placar — sem passar fila= nenhum 420ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement reprovado carrega fora_do_pathspec com os arquivos 326ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement verde nunca carrega fora_do_pathspec 308ms
 ✓ test/orquestrador-trilha-gate-papel.test.ts (9 tests) 2517ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > nenhum gate do CI cai em nao-configurado: o CI tem os três papéis 323ms
 ✓ test/orquestrador-dois-blocos-json.test.ts (13 tests) 635ms
 ✓ test/orquestrador-adiamento-actus.test.ts (13 tests) 3ms
 ✓ test/orquestrador-pausa-e-prompt.test.ts (17 tests) 4900ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sem o arquivo, a drenagem NÃO para por pausa (o guard não é sempre-verdadeiro) 548ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > o ticket em curso termina; o seguinte não começa 593ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > encerra em ocioso com MOTIVO pausado, não em erro 538ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > e manda NÃO ler SKILL.md nem references/ 356ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > não existe mais ponteiro para a SKILL como leitura recomendada 346ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > sem EXECUTOR.md no disco, o prompt sai sem ponteiro nenhum (não inventa) 303ms
 ✓ test/orquestrador-isolamento-teste.test.ts (15 tests) 1880ms
   ✓ o test-*.sh rodando de verdade não deixa marca na trilha real > test-drenagem.sh: fixture recebe os eventos, produção não recebe nada 1135ms
 ✓ test/kit-e2e-evidencia.test.ts (7 tests) 383ms
 ✓ test/orquestrador-liberacoes.test.ts (11 tests) 1782ms
   ✓ o arquivo REAL do repo resolve as dependências que declara > cada token do arquivo real resolve via liberacao_ok 701ms
 ✓ test/orquestrador-morte-por-sinal.test.ts (11 tests) 2672ms
   ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2254ms
 ✓ test/orquestrador-pacotes.test.ts (6 tests) 1381ms
 ✓ test/orquestrador-prefixo-aspas.test.ts (13 tests) 11ms
 ✓ test/orquestrador-prompt-como-rodar.test.ts (10 tests) 2ms
 ✓ test/orquestrador-disparo-congelado.test.ts (13 tests) 3706ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > executando ALÉM do timeout está congelado, e diz há quanto tempo 326ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > ocioso nunca está congelado, por mais velho que seja o DESDE 303ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS congelado E lock com pid VIVO => recupera (a staleness vence) 371ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > a recuperação deixa rastro na trilha e limpa o STATUS 368ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS são + lock com pid vivo => em-curso (a guarda continua valendo) 326ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > em-curso NÃO escreve na trilha: não houve o que recuperar 308ms
   ✓ a guarda por processo é POR REPO > o lock de OUTRO repo não é visto: o caminho sai do RUNS_BASE deste 309ms
   ✓ orq mostra MORTO, não executando > com o STATUS congelado, o snapshot diz MORTO e há quanto tempo 313ms
 ✓ test/orquestrador-trilha-uma-linha.test.ts (8 tests) 773ms
 ✓ test/orquestrador-liberacoes-formatos.test.ts (28 tests) 9081ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > os 5 tokens do arquivo real resolvem a dependência `humano:<token>` 581ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > TODOS os 47 tokens únicos do arquivo real resolvem 5632ms
   ✓ o que o CI faz diferente: NADA > os 7 resolvem, e NENHUM grava aviso (a forma do CI não é legada) 609ms
 ✓ test/orquestrador-reparo-trilha.test.ts (10 tests) 1477ms
 ❯ test/orquestrador-migrar-config.test.ts (47 tests | 1 failed) 15593ms
   ✓ a migração não apaga nada > actus-saas: o arquivo no disco do repo NÃO é tocado 438ms
   ✓ a migração não apaga nada > comarka-operacional: o arquivo no disco do repo NÃO é tocado 458ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > antes da migração, a linha é a de hoje (é a medida de referência) 315ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > DEPOIS da migração, é caractere a caractere a MESMA linha 338ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --dry-run não escreve nem o proposto 486ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --propor grava 000-config.proposto.json e NÃO toca o oficial 448ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --aplicar move o proposto QUE FOI REVISADO, não um recalculado 914ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > o relatório do --dry-run traz o veredito do `orq config` sobre o PROPOSTO 449ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > --dry-run continua não gravando: ele AVISA da recusa e segue relatando 449ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > sem proposto no disco, o --propor grava como sempre (a guarda não é sempre-verdadeira) 405ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > o migrador NÃO conhece o nome da revisão: não lê, não escreve, não apaga 392ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > a CLI distingue RECUSA (rc 1) de erro de uso (rc 2) 423ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > com proposto pré-existente: rc 1, recusa dita, e o arquivo intacto byte a byte 2553ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > o resto da migração roda: a recusa é do config, não do --migrar inteiro 2155ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > sem proposto pré-existente, o --migrar volta a sair 0 e a gravar 2486ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > --dry-run com proposto pré-existente: rc 0, avisa, e não escreve 2237ms
   × os dois configs reais: quanto o proposto melhora, e o que sobra > actus-saas: o proposto tem MENOS violações que o original, e o resto é decisão local 306ms
     → o relatório tem de trazer o veredito do orq config: expected null to be truthy
 ✓ test/orquestrador-notificacao.test.ts (25 tests) 16355ms
   ✓ o fallback em arquivo é escrito SEMPRE > sem osascript: só o arquivo, e o log diz por quê 7717ms
   ✓ o fallback em arquivo é escrito SEMPRE > COM osascript: o arquivo é escrito do mesmo jeito 352ms
   ✓ o fallback em arquivo é escrito SEMPRE > osascript que falha não derruba a drenagem e o arquivo continua valendo 339ms
   ✓ o que vai no título e no corpo > título: placar de aprovados e bloqueados 348ms
   ✓ o que vai no título e no corpo > corpo: duração e o ÚLTIMO do snapshot 549ms
   ✓ o que vai no título e no corpo > sem snapshot ainda, o corpo sai com — em vez de quebrar 353ms
   ✓ fila sem processável: avisa uma vez, e só uma > a PRIMEIRA drenagem vazia escreve exatamente uma linha 508ms
   ✓ fila sem processável: avisa uma vez, e só uma > a SEGUNDA drenagem vazia não escreve nada (é o spam do launchd) 748ms
   ✓ fila sem processável: avisa uma vez, e só uma > dez ticks seguidos com a fila vazia continuam valendo uma linha só 1778ms
   ✓ fila sem processável: avisa uma vez, e só uma > processar de novo REARMA o aviso de fila vazia 788ms
   ✓ drenagem que PROCESSOU notifica, com o placar > aprovado: uma linha, placar 1 aprovado 412ms
   ✓ drenagem que PROCESSOU notifica, com o placar > bloqueado: uma linha, placar 1 bloqueado 315ms
   ✓ drenagem que PROCESSOU notifica, com o placar > adiado por orçamento: uma linha, corpo com adiados 1 399ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU conta como processado, ainda que nada tenha sido aprovado 369ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU que já estava na trilha ANTES não conta (a conta é do trecho) 446ms

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
   Start at  12:29:30
   Duration  20.31s (transform 605ms, setup 0ms, collect 10.54s, tests 125.07s, environment 5ms, prepare 1.49s)

rc=1
```

### scripts/kit/test-shell.sh

```
[fixture] tmp: /tmp/orq-fixture-3j9RAq
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-3j9RAq/repo
== testes de shell do motor · fixture em /tmp/orq-fixture-3j9RAq/repo ==

--- test-lib-config.sh ---
== raízes resolvidas pelo lib.sh ==
  ROOT           = /tmp/orq-fixture-3j9RAq/repo
  MAIN_CHECKOUT  = /private/tmp/orq-fixture-3j9RAq/repo
  CONFIG         = /private/tmp/orq-fixture-3j9RAq/repo/docs/fila/000-config.json
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
  (worktree de teste: /private/tmp/orq-fixture-3j9RAq/repo, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (5907e230)

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
  ok    gravou a evidência em runs/ (probe-falha-20260921T152957Z.txt)
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
  | [2026-09-21 12:30:00-0300] ticket 901 (3 processáveis)
  | [orq ERRO] recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-09-21 12:30:00-0300]   ticket 901 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-09-21 12:30:00-0300] ticket 902 (3 processáveis)
  | [2026-09-21 12:30:00-0300]   ticket 902 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: fatal: branch 'frente/902' está em uso por outra worktree
  | [2026-09-21 12:30:00-0300] ticket 903 (3 processáveis)
  | [2026-09-21 12:30:00-0300] nenhum processável não tentado — encerrando (aprovados: 1; sem progresso: 901 902)
  | [2026-09-21 12:30:00-0300] drenagem encerrada: 1 aprovado(s) e mergeado(s)
  | [2026-09-21 12:30:00-0300] ocioso: 901 sem progresso · 902 sem progresso
  ok    executor chamado 3x numa drenagem: 901 902 903 
  ok    terminou em <= N=3 chamadas (sem loop)
  ok    cada ticket tentado UMA vez, na ordem da fila
  ok    o executor recebe --ticket (não reescolhe)
  ok    o saudável (903) foi processado: done
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-09-21T12:30:00-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 sem_progresso=2 dur=0min
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
  nota: sem_progresso: 3 disparos sem progresso entre 2026-09-21 12:30:01-0300 e 2026-09-21 12:30:01-0300; última causa: executor morreu (rc=128, fase=worktree): fatal: '/tmp/_worktrees/fx-901' already exists
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
  trilha: 2026-09-21T12:30:04-0300 --- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
  ok    evento OCIOSO pendentes=3
  ok    244: dependência 241b em bloqueado
  ok    232: dependência 231 em pendente
  ok    231: liberação humano:migration-0031 ausente
  ok    UM evento por drenagem
  ok    trilha continua uma linha por evento (nenhuma linha sem timestamp)
  ok    OCIOSO vem antes do DRENAGEM_FIM
  STATUS.md:
    ORQUESTRADOR · 2026-09-21 12:30:04
    ESTADO   ocioso
    TICKET   —
    DESDE    —
    FASE     —
    FILA     3 pendente · 1 bloqueado · 1 done
    STAGING  4be7093 · push suprimido (publicar é humano neste repo)
    ÚLTIMO   —
    MOTIVO   sem ticket processável: 231 sem liberação humano:migration-0031 · 232 espera 231 (pendente) · 244 espera 241b (bloqueado)
  ok    STATUS mantém o motivo de sempre
  ok    STATUS: 244 espera 241b (bloqueado)
  ok    STATUS: 232 espera 231 (pendente)
  ok    STATUS: 231 sem liberação
  ok    DRENAGEM_FIM sem campo novo

== 2. pendente pulado por sem-progresso nesta drenagem ==
  trilha: 2026-09-21T12:30:05-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=sem_progresso
  ok    250 foi tentado uma vez
  ok    250: pulado por sem-progresso
  ok    STATUS: 250 sem progresso

== 3. cooldown ativo: o liberado espera o cooldown ==
  trilha: 2026-09-21T12:30:05-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=cooldown:13:00
  ok    250: cooldown até 13:00
  ok    a razão de dependência vence o cooldown
  ok    STATUS: 250 em cooldown até 13:00

== 4. fins que NÃO gravam OCIOSO ==
  ok    pausa: sem OCIOSO (quem pausou já sabe)
  ok    sem pendente nenhum: sem OCIOSO

TODOS OS CHECKS PASSARAM

rc(test-ocioso.sh) = 0

--- test-rc-executor.sh ---
== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) ==
  ok    pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)

== o rc do executor atravessa o tee ==
  --- A: executor sai 3, tee sai 0 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:30:06-0300 e 2026-09-21 12:30:06-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    A: o log vê rc=3
  ok    A: a causa do bloqueio carrega rc=3
  --- B: executor sai 0, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:30:06-0300 e 2026-09-21 12:30:06-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    B: o log vê rc=0
  ok    B: a causa do bloqueio carrega rc=0
  --- C: executor sai 0, tee sai 5 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:30:07-0300 e 2026-09-21 12:30:07-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    C: o log vê rc=0
  ok    C: a causa do bloqueio carrega rc=0
  --- D: executor sai 3, tee sai 5 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-09-21 12:30:07-0300 e 2026-09-21 12:30:07-0300; última causa: executor saiu rc=3 sem desfecho registrado
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
  trilha: 2026-09-21T12:30:08-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
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

== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
  rc=0  test-drenagem-sem-progresso.sh
  rc=0  test-sem-progresso-limite.sh
  rc=0  test-ocioso.sh
  rc=0  test-rc-executor.sh
  rc=0  test-ambiente.sh
TODOS OS SCRIPTS SAÍRAM rc 0
rc=0
```

### scripts/kit/test-instalar.sh

```
[fixture] tmp: /tmp/orq-fixture-4Nki0C
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-4Nki0C/repo
== (a) fixture recém-instanciado ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-fixture-4Nki0C/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    diz 'idêntico ao kit <VERSAO>'

== (b) cópia do fixture com UM byte a mais em lib.sh ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-vj8qfl/repo
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
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-3dc1QD/repo
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
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-fmYuNh/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  | 
  | O --atualizar de verdade RECUSARIA, por:
  |   · o loop de '/private/tmp/orq-verificar-fmYuNh/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  |   (a recusa não impede este dry-run de listar tudo)
  ok    rc 0
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    o lib.sh do repo NÃO foi tocado pelo --dry-run
-- (e2) --atualizar sem pausa: recusa com rc 1 --
  | RECUSADO: o loop de '/private/tmp/orq-verificar-fmYuNh/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  ok    rc 1
  ok    a recusa diz que o loop não está pausado
  ok    o repo continua intacto depois da recusa
-- (e2b) com PAUSAR, mas com modificação não commitada no motor: recusa --
  | ?? scripts/orquestrador/nao-commitado.txt
  | RECUSADO: '/private/tmp/orq-verificar-fmYuNh/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA o caminho
  ok    o repo continua intacto depois da recusa 3
-- (e3) --atualizar com PAUSAR e motor limpo: atualiza e fica idêntico --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-fmYuNh/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-fmYuNh/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-fmYuNh/repo
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
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-NCC5Ou/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-NCC5Ou/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | só no repo  scripts/orquestrador/so-do-repo.py
  | 
  | 1 diferença(s)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-NCC5Ou/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 1 (há 'só no repo' — o verificador do fim conta como diferença)
  ok    so-do-repo.py SOBREVIVEU
  ok    listado como 'só no repo'

== (g) --atualizar recusa com scripts/roadmap/ sujo, e --forcar passa ==
  |  M scripts/roadmap/lint-mapa.py
  | RECUSADO: '/private/tmp/orq-verificar-kyGesN/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA scripts/roadmap/lint-mapa.py
  ok    o lint-mapa.py do repo continua intacto depois da recusa
-- (g2) com --forcar: passa, avisa, e o lint-mapa.py vira o do kit --
  |  M scripts/roadmap/lint-mapa.py
  | --forcar: passando por cima de 1 caminho(s) modificado(s) no motor do repo.
  | 
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-kyGesN/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-kyGesN/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-kyGesN/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    avisa que passou por cima
  ok    o lint-mapa.py do repo é o do kit

== (h) --verificar/--atualizar cobrem os testes do harness ==
-- (h1) --verificar acusa o teste envelhecido --
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-FKrbSc/repo
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
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-FKrbSc/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 7 teste(s) de harness e 3 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-FKrbSc/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-FKrbSc/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    test/orquestrador-pacotes.test.ts do repo é o do kit
  ok    test/produto.test.ts intacto
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
-- (h3) a suíte do REPO passa com os testes que o kit instalou --
  |    ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2123ms
  | 
  |  Test Files  8 passed (8)
  |       Tests  62 passed (62)
  |    Start at  12:30:12
  |    Duration  3.58s (transform 110ms, setup 0ms, collect 3.57s, tests 4.38s, environment 1ms, prepare 285ms)
  ok    npx vitest run no repo: rc 0

== (i) --atualizar --migrar: .orq-pause -> PAUSAR, liberações -> v2 ==
-- (i1) --migrar --dry-run: mostra tudo e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-verificar-LDHa7Q/repo
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
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-LDHa7Q/repo/docs/fila/liberacoes.json)
  |            --dry-run: NADA é escrito
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | --- /private/tmp/orq-verificar-LDHa7Q/repo/docs/fila/liberacoes.json (atual)
  | +++ /private/tmp/orq-verificar-LDHa7Q/repo/docs/fila/liberacoes.json (v2 proposto)
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
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-LDHa7Q/repo/docs/fila)
  |            --dry-run: NADA é escrito
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-LDHa7Q/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-LDHa7Q/repo/docs/fila/000-config.json
  |                --dry-run: NADA é escrito
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | 
  | --- /private/tmp/orq-verificar-LDHa7Q/repo/docs/fila/000-config.json (oficial, INTOCADO)
  | +++ /private/tmp/orq-verificar-LDHa7Q/repo/docs/fila/000-config.proposto.json (proposto)
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
  | CONFIG   /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/orq-cfg-Me2ZH8/000-config.json
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
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
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
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-LDHa7Q/repo/docs/fila/liberacoes.json)
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | @@ -1,9 +1,35 @@
  | 
  | GRAVADO. Cópia do estado anterior em /private/tmp/orq-verificar-LDHa7Q/repo/docs/fila/liberacoes.json.bak
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-LDHa7Q/repo/docs/fila)
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-LDHa7Q/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-LDHa7Q/repo/docs/fila/000-config.json
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
  | PROPOSTO gravado em /private/tmp/orq-verificar-LDHa7Q/repo/docs/fila/000-config.proposto.json. O oficial NÃO foi tocado.
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /private/tmp/orq-verificar-LDHa7Q/repo/docs/fila/000-config.proposto.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | O config NÃO foi aplicado, e isso é a peça funcionando. Passo humano:
  | 
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
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
  FALHA o renome não foi aplicado
  FALHA o nome antigo continua lá
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
  | NOVO       kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-novo-5JFMt8
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
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /private/tmp/orq-novo-5JFMt8
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | --- orq config (o formulário ainda está em branco; é assim que ele nasce) ---
  | CONFIG   /private/tmp/orq-novo-5JFMt8/docs/fila/000-config.json
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
  |   cd /private/tmp/orq-novo-5JFMt8
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
  | RECUSADO: '/private/tmp/orq-sem-tsx-3AYWAY' não tem node_modules/.bin/tsx: o motor do orquestrador é TypeScript e nenhuma parte dele roda sem tsx. Instale a dependência de DESENVOLVIMENTO no repo, com o loop pausado, e repita: npm i -D tsx@^4.19.0   (ou o equivalente do gerenciador deste repo)
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

== (c) /Users/lucasantos/Projetos/conteudos-infinitos (SÓ LEITURA — o resultado é achado, não gate) ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7a)
  |            repo /Users/lucasantos/Projetos/conteudos-infinitos
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/config-chaves.ts
  | diferente   scripts/orquestrador/lib.sh
  | diferente   scripts/orquestrador/local-loop.sh
  | só no kit   scripts/orquestrador/test-ambiente.sh
  | só no kit   scripts/orquestrador/test-drenagem-sem-progresso.sh
  | diferente   scripts/orquestrador/test-drenagem.sh
  | só no kit   scripts/orquestrador/test-fixture-drenagem.sh
  | só no kit   scripts/orquestrador/test-ocioso.sh
  | só no kit   scripts/orquestrador/test-rc-executor.sh
  | só no kit   scripts/orquestrador/test-sem-progresso-limite.sh
  | só no kit   docs/orquestrador/skill/references/higiene-de-execucao.md
  | diferente   docs/orquestrador/skill/templates/config.json
  | 
  | 12 diferença(s)
  (rc 1 — informativo)

2 CHECK(S) FALHARAM
rc=1
```

### git log --oneline main..kit/etapa7a

```
b70e6e3 7a-8: ambiente não bloqueia a fila (evento AMBIENTE)
84958eb 7a-7: teste de que o rc do executor atravessa o tee da drenagem
cd0f951 7a-6: os três testes da etapa 7a entram no test-shell.sh e no isolamento
97e492c 7a-5: docs da etapa 7a (PECAS, CHANGELOG e CONTRATO)
3a62c5e 7a-4: ocioso que diz por quê (evento OCIOSO e o motivo no STATUS)
6e458e1 7a-3: contador persistente de sem-progresso que bloqueia no limite
05b2898 7a-2: a drenagem pula o ticket que não avança em vez de encerrar
f6cd542 7a-1: test-drenagem.sh com fixture própria, sem docs/fila do checkout
```
