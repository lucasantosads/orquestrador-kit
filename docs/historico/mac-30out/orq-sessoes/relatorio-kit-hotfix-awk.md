# Relatório · kit · hotfix-awk

Branch `kit/hotfix-awk`, worktree `~/Projetos/_worktrees/kit-hotfix-awk`, base `596ca4c`.
Commits: **H1 `685de81`** (teste + conserto), **H2 `b3f6890`** (CHANGELOG + PECAS). Nenhum push.

> **Nota de ambiente:** todas as suítes rodaram com `node_modules` por SYMLINK para o checkout
> principal (`~/Projetos/orquestrador-kit/node_modules`, mesmo commit `596ca4c`, nenhuma
> instalação). O symlink é humano: não entrou em `git add`, não foi removido nem escrito.
> `git status` durante toda a sessão: só `?? node_modules` além dos arquivos da peça.

## PASSO 0

**Item 1** (já conferido): árvore limpa em `596ca4c`.
**Item 2**: `node_modules -> /Users/lucasantos/Projetos/orquestrador-kit/node_modules`;
`node_modules/.bin/vitest -> ../vitest/vitest.mjs`; `vitest/2.1.9 darwin-arm64 node-v24.19.0`.

**Item 3 — o que li**
- `CHANGELOG.md`: é cronológico (o mais novo no FIM). Li o topo (2.1.0-dev, etapas 1-2) e o fim
  (7a, 7b, K12 até K12-J). A 7a-8 não tem linha própria; a régua de AMBIENTE aparece na 7b-2
  (`cfb5cf3`) e na 7b-5 (`052ac50`).
- `docs/PECAS.md` (fim): backlog até K15; sem seção de hotfix.
- `local-loop.sh:500-650`: `:540` `norm="$(causa_normalizada …)"`; `:541`
  `awk -F'\t' -v c="$norm" … '$2 == c && $1 != id'` contra `causas_vistas`, que guarda o `norm`
  CRU (`:548`). O `-v` converte `\n` literal em quebra real; o `$2` mantém o literal — nunca
  casa. `sem_progresso_causa` (`:209`) termina em `uma_linha` e `causa_normalizada` (`:286`) é
  sed, que preserva o `\n`.
- `executor.sh:66-67`: `die "preflight: árvore de execução suja em $ROOT — commite ou stashe
  antes:<quebra>$sujo"`; `preflight_ou_adia` (`:1265-1283`) passa a causa por `uma_linha`
  (quebra → `\n` literal) e grava `ADIADO motivo=preflight causa=…`.
- `decisao.ts`: `PADRAO_CAUSA` (`:192`), `detectarCausaInfra` (`:283`), `subDaLinha` (`:501`) —
  regex em TS, sem awk; fora do defeito.
- Testes: os da 7a-8 NÃO estão no `test-drenagem.sh`; moram em
  `scripts/orquestrador/test-ambiente.sh` (e o equivalente sobre o ADIADO, 7b-2, em
  `test-ambiente-adiado.sh`). A 7b-5 mora em `test-notificacao-ambiente.sh`.
  `scripts/kit/test-shell.sh` encadeia os 19 scripts contra o fixture. Nenhum caso de
  AMBIENTE usava causa com `\n` — por isso o defeito passou.
- Linha de base: `test-ambiente.sh` rc 0 antes de qualquer escrita.

**Item 4 — `awk … -v` em `scripts/orquestrador`**

| arquivo:linha | variável | recebe |
|---|---|---|
| `local-loop.sh:187` | `id="$2"` | só id |
| `local-loop.sh:541` | `c="$norm"` / `id="$prox_id"` | **TEXTO LIVRE (causa)** / id |
| `executor.sh:1121` | `id="$id"` | só id |
| `lib.sh:171` | `f="$tmpjson"` | caminho (mktemp) |
| `lib.sh:220` | `id="$id"` | só id |
| `test-painel-lento.sh:66` | `t="$1"` | número |

Uma única ocorrência com texto livre, no `local-loop.sh`: sem parada, nenhum outro arquivo do
motor foi tocado.

## Vermelho (antes do conserto; caso 4 novo no `test-ambiente.sh`)

```
== 1. preflight recusa TODO ticket, 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  ok    0 bloqueados depois de 3 disparos
  ok    contadores zerados (nenhum .sem-progresso)
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas ao executor por disparo (máx: 2)
  trilha: 2026-09-24T15:01:24-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
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

== 4. árvore suja: causa com \n literal, 4 disparos (o teto de adiamentos) ==
  --- disparo 7 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 8 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 9 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 10 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  FALHA AMBIENTE não disparou uma vez por drenagem (3 no total)
  trilha: 2026-09-24T15:01:24-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  FALHA evento fora do formato
  FALHA bloqueado por ambiente: 906=bloqueado 907=bloqueado

3 CHECK(S) FALHARAM
rc=1
```

## Verde (depois do conserto)

```
== 1. preflight recusa TODO ticket, 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  ok    0 bloqueados depois de 3 disparos
  ok    contadores zerados (nenhum .sem-progresso)
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas ao executor por disparo (máx: 2)
  trilha: 2026-09-24T15:01:49-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
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

== 4. árvore suja: causa com \n literal, 4 disparos (o teto de adiamentos) ==
  --- disparo 7 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 8 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 9 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 10 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  ok    1 AMBIENTE em cada um dos 4 disparos
  trilha: 2026-09-24T15:02:00-0300 --- AMBIENTE tickets=906,907 causa=ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> — commite ou stashe antes:\n M src/a.ts\n?? tmp-<id>.log
  ok    evento com 906,907 e o \n literal na causa
  ok    906 e 907 não bloqueados

TODOS OS CHECKS PASSARAM
rc=0
```

Nenhuma asserção existente foi alterada: o diff do teste só acrescenta linhas, exceto o comentário da variável `MODO` (`# preflight | proprio` → `# preflight | proprio | suja`).

## Diff cru · H1 `685de81`

```diff
commit 685de810b4d279600acc0d5050f6f5e3afdfd452
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Thu Sep 24 15:02:28 2026 -0300

    hotfix-awk: a causa entra no awk por ENVIRON, não por -v
    
    `awk -v` interpreta escapes. A causa da recusa de preflight por árvore suja
    carrega `\n` literal (o `uma_linha` do executor.sh), então em local-loop.sh:541
    ela nunca era igual a si mesma em `causas_vistas`, a regra de AMBIENTE da 7a-8
    não disparava e cada ticket somava adiamento até bloquear (269 e 270 do
    conteudos-infinitos, 22/09).
    
    test-ambiente.sh ganha o caso 4: dois tickets recusados com o texto real da
    árvore suja, 4 disparos, um AMBIENTE por disparo e nenhum bloqueado.
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

diff --git a/scripts/orquestrador/local-loop.sh b/scripts/orquestrador/local-loop.sh
index 1e04753..fb1e17f 100755
--- a/scripts/orquestrador/local-loop.sh
+++ b/scripts/orquestrador/local-loop.sh
@@ -537,8 +537,13 @@ drenar() {
         # timeout, 5xx e gate que não rodou adiam sem cooldown: em todos, a
         # mesma causa em dois tickets é o ambiente. A causa do adiado é o
         # próprio evento (`ADIADO motivo=... causa=...` ou `... rc= dur=`).
+        #
+        # A causa entra no awk por ENVIRON, nunca por `-v`: o `-v` interpreta
+        # escapes, e a causa carrega `\n` literal (o `uma_linha` da recusa de
+        # árvore suja). Com `-v` ela nunca era igual a si mesma, e o AMBIENTE
+        # não disparava (269 e 270 do conteudos-infinitos, 22/09).
         norm="$(causa_normalizada "$causa" "$prox_id")"
-        outro="$(printf '%s\n' "$causas_vistas" | awk -F'\t' -v c="$norm" -v id="$prox_id" '$2 == c && $1 != id { print $1; exit }')"
+        outro="$(printf '%s\n' "$causas_vistas" | ORQ_CAUSA_NORM="$norm" awk -F'\t' -v id="$prox_id" '$2 == ENVIRON["ORQ_CAUSA_NORM"] && $1 != id { print $1; exit }')"
         if [ -n "$outro" ]; then
           sem_progresso_desfazer "$sp_backup"
           contador_desfazer "$ad_backup" .adiamentos
diff --git a/scripts/orquestrador/test-ambiente.sh b/scripts/orquestrador/test-ambiente.sh
index 55d6b67..a264e6b 100644
--- a/scripts/orquestrador/test-ambiente.sh
+++ b/scripts/orquestrador/test-ambiente.sh
@@ -16,6 +16,10 @@
 #      contadores zerados, 3 eventos AMBIENTE, no máximo 2 chamadas por disparo.
 #   2. causas diferentes em tickets diferentes NÃO são ambiente: cada um soma.
 #   3. um ticket sozinho travado continua bloqueando no 3º disparo (7a-3).
+#   4. árvore suja: a causa do preflight carrega `\n` LITERAL (o `$sujo` do
+#      executor.sh passa por `uma_linha`). A comparação de causas não pode
+#      interpretar esse escape: 4 disparos, 1 AMBIENTE em cada, 0 bloqueados.
+#      Foi assim que o 269 e o 270 do conteudos-infinitos bloquearam em 22/09.
 #
 # Uso: bash scripts/orquestrador/test-ambiente.sh
 
@@ -42,7 +46,7 @@ falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
 
 FILA="$ORQ_EXEC_ROOT/docs/fila"
 TRILHA="$FILA/runs/events.log"
-MODO="$TMP/modo"     # preflight | proprio
+MODO="$TMP/modo"     # preflight | proprio | suja
 CALLS="$TMP/calls"
 
 ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
@@ -72,6 +76,16 @@ run_executor_once() {
       esac
       event "$id" EXECUTOR_MORREU "rc=128" "fase=worktree"
       return 128 ;;
+    suja)
+      # O texto REAL da recusa (executor.sh, preflight), pelo mesmo caminho do
+      # `preflight_ou_adia`: a quebra de linha antes do `$sujo` vira `\n`
+      # literal no `uma_linha`, e é assim que ela chega à trilha.
+      local causa
+      causa="$(uma_linha "preflight: árvore de execução suja em $ORQ_EXEC_ROOT — commite ou stashe antes:
+ M src/a.ts
+?? tmp-$id.log" 300)"
+      event "$id" ADIADO "motivo=preflight" "causa=$causa"
+      return 0 ;;
   esac
 }
 contador() { cut -d'|' -f1 "$RUNS_BASE/$1/.sem-progresso" 2>/dev/null || true; }
@@ -129,6 +143,24 @@ grep -Eq ' 904 BLOQUEADO motivo=sem_progresso( |$)' "$TRILHA" && ok "trilha: 904
 [ -z "$(git -C "$ORQ_EXEC_ROOT" status --porcelain -- docs/fila/904-t.md)" ] && ok "bloqueio commitado" || falha "bloqueio sem commit"
 [ "$(n_amb)" = "$antes" ] && ok "nenhum AMBIENTE no caso isolado" || falha "caso isolado virou AMBIENTE"
 
+echo
+echo "== 4. árvore suja: causa com \\n literal, 4 disparos (o teto de adiamentos) =="
+ticket_set_status "$FILA/904-t.md" done; ticket_commit "$FILA/904-t.md" "fixture: 904 fora"
+for id in 906 907; do fx_ticket "$ORQ_EXEC_ROOT" "$id"; git -C "$ORQ_EXEC_ROOT" add -- "docs/fila/$id-t.md"; done
+git -C "$ORQ_EXEC_ROOT" commit -q -m "fixture: 906 907"
+echo suja > "$MODO"
+um_por_disparo=1
+for d in 7 8 9 10; do
+  antes="$(n_amb)"; disparo "$d"
+  [ "$(n_amb)" = $((antes + 1)) ] || um_por_disparo=0
+done
+[ "$um_por_disparo" = 1 ] && ok "1 AMBIENTE em cada um dos 4 disparos" || falha "AMBIENTE não disparou uma vez por drenagem ($(n_amb) no total)"
+amb="$(grep ' AMBIENTE ' "$TRILHA" | tail -1)"
+echo "  trilha: $amb"
+case "$amb" in *" --- AMBIENTE tickets=906,907 causa="*'antes:\n M '*) ok "evento com 906,907 e o \\n literal na causa" ;; *) falha "evento fora do formato" ;; esac
+[ "$(st 906)" != bloqueado ] && [ "$(st 907)" != bloqueado ] && ok "906 e 907 não bloqueados" \
+  || falha "bloqueado por ambiente: 906=$(st 906) 907=$(st 907)"
+
 echo
 if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
 echo "$FALHAS CHECK(S) FALHARAM"; exit 1
```

## Diff cru · H2 `b3f6890`

```diff
commit b3f68908228c33082f1f00d297a38d3cf07a5f75
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Thu Sep 24 15:02:49 2026 -0300

    hotfix-awk: CHANGELOG e PECAS registram o 685de81
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

diff --git a/CHANGELOG.md b/CHANGELOG.md
index 037e487..9bb7de2 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -698,3 +698,16 @@ launchd morreu três vezes em rc 127 e nada alarmou.
 O que um repo instalado ganha ao atualizar: `scripts/orquestrador/orq-painel.py` e os
 quatro `test-painel-*.sh`; nenhum comportamento do loop muda (o `OCIOSO` sai igual).
 Relatório: `~/orq-sessoes/relatorio-kit-k12.md`.
+
+### hotfix-awk · a causa de AMBIENTE com `\n` literal
+
+- **hotfix-awk** `685de81`: em `local-loop.sh:541` a causa normalizada entrava no awk por
+  `-v`, que interpreta escapes. A recusa de preflight por árvore suja traz `\n` literal (a
+  lista do `git status` passa pelo `uma_linha`), a causa nunca era igual a si mesma e a
+  régua de AMBIENTE da 7a-8 não disparava: cada ticket somava adiamento até bloquear. Agora
+  a causa vai por `ENVIRON`. Das 6 ocorrências de `awk -v` no motor, só essa recebia texto
+  livre. Caso 4 do `test-ambiente.sh`.
+
+O que um repo instalado ganha ao atualizar: com a árvore de execução suja, a drenagem para
+em AMBIENTE no segundo ticket e ninguém bloqueia. Foi o que bloqueou o 269 e o 270 do
+conteudos-infinitos em 22/09. Relatório: `~/orq-sessoes/relatorio-kit-hotfix-awk.md`.
diff --git a/docs/PECAS.md b/docs/PECAS.md
index dd210ce..247b9f5 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -913,6 +913,18 @@
   `launchd.start_interval`, com job carregado e sem PAUSAR; e o `last exit code` != 0 é
   alarme próprio. Os dois negativos da spec (janela ok; job descarregado) estão no teste.
 
+- **hotfix-awk · a causa de AMBIENTE entra no awk sem escapes** (`685de81`). Em
+  `local-loop.sh:541` a causa normalizada ia por `awk -v`, que interpreta escapes: a recusa
+  de preflight por árvore suja carrega `\n` literal, nunca casava consigo mesma em
+  `causas_vistas`, e a régua da 7a-8 não disparava. Agora vai por `ENVIRON`. Das 6
+  ocorrências de `awk -v` em `scripts/orquestrador`, era a única com texto livre (as outras
+  recebem id, caminho de mktemp ou número).
+  *Evidência:* 269 e 270 do conteudos-infinitos bloqueados por adiamentos em 22/09
+  (`~/orq-sessoes/levantamento-bloqueios.md`, Avisos); `executor.sh:66-67` e
+  `preflight_ou_adia` montam a causa com a quebra que o `uma_linha` vira `\n`.
+  *Teste:* caso 4 do `test-ambiente.sh`, com o texto real da recusa: 4 disparos, 1 AMBIENTE
+  em cada, 906 e 907 pendentes. **Antes, nenhum AMBIENTE e os dois bloqueados no 4º.**
+
 ## PENDENTES
 
 - **K6d · `scripts/kit/pureza.sh`.** O grep que TRANCA a pureza: em CÓDIGO (não em
```

## Suítes (rc capturado de cada uma, saída integral em arquivo, sem `| tail`)

| suíte | rc | placar |
|---|---|---|
| `npx vitest run` | 0 | Test Files  47 passed (47); Tests  1181 passed (1181) |
| `bash scripts/kit/test-shell.sh` | 0 | 19 de 19 scripts rc 0 (inclui test-ambiente.sh e test-drenagem.sh no fixture) |
| `bash scripts/kit/test-instalar.sh` | 0 | TODOS OS CHECKS PASSARAM; (c) pulado, ORQ_CI_CHECKOUT não setado |
| `bash scripts/orquestrador/test-drenagem.sh` | 0 | TODOS OS CHECKS PASSARAM |

Placar do test-shell:

```
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
  rc=0  test-painel-visao.sh
  rc=0  test-painel-detalhe.sh
  rc=0  test-painel-pausa.sh
  rc=0  test-painel-alarmes.sh
  rc=0  test-painel-lento.sh
TODOS OS SCRIPTS SAÍRAM rc 0
```

## Dry-run · `bash instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run`

```
ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.

VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-hotfix-awk)
           repo /Users/lucasantos/Projetos/conteudos-infinitos

carimbo    2.1.0-dev

diferente   scripts/orquestrador/lib.sh
diferente   scripts/orquestrador/local-loop.sh
só no kit   scripts/orquestrador/orq-painel.py
diferente   scripts/orquestrador/test-ambiente.sh
só no kit   scripts/orquestrador/test-fixture-painel.sh
só no kit   scripts/orquestrador/test-painel-alarmes.sh
só no kit   scripts/orquestrador/test-painel-detalhe.sh
só no kit   scripts/orquestrador/test-painel-lento.sh
só no kit   scripts/orquestrador/test-painel-pausa.sh
só no kit   scripts/orquestrador/test-painel-visao.sh
diferente   scripts/orq

11 diferença(s)

O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/conteudos-infinitos' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  (a recusa não impede este dry-run de listar tudo)
rc=0
```

Diferenças: `lib.sh`, `local-loop.sh`, `test-ambiente.sh` e `scripts/orq` diferentes; `orq-painel.py`
e os cinco `test-*painel*` só no kit (a K12 ainda não foi instalada lá). **O `--atualizar` de verdade
RECUSARIA: o loop do conteudos-infinitos não está pausado.** Registrado; nenhuma sentinela foi
criada. `git status --porcelain` do conteudos-infinitos: 0 linhas antes e 0 depois do dry-run.

## O que não foi feito

Push, merge em main, instalação real no conteudos-infinitos: nada disso. O 269 e o 270 seguem
bloqueados lá; destravá-los (devolver a pendente) é decisão humana depois de instalar.
