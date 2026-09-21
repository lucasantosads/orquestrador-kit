#!/usr/bin/env bash
# test-ambiente.sh — ambiente não bloqueia a fila (peça 7a-8).
#
# O furo da 7a-3: uma recusa de preflight (árvore suja, lock de git, identidade)
# mata o executor para TODO ticket, igual. Cada drenagem somava +1 em todos os
# pendentes e, no 3º disparo, a fila inteira ia para bloqueado por um problema
# que não é de ticket nenhum.
#
# A regra: a causa é NORMALIZADA (sem id de ticket, sha, número, caminho) antes
# de somar. A mesma causa normalizada em OUTRO ticket na mesma drenagem é
# ambiente: ninguém soma nesta drenagem (a soma do primeiro é desfeita), a
# trilha ganha AMBIENTE causa=<normalizada> tickets=<ids>, a drenagem para com
# motivo ambiente e o STATUS diz a causa.
#
#   1. 3 pendentes, preflight recusando todos, 3 disparos: 0 bloqueados,
#      contadores zerados, 3 eventos AMBIENTE, no máximo 2 chamadas por disparo.
#   2. causas diferentes em tickets diferentes NÃO são ambiente: cada um soma.
#   3. um ticket sozinho travado continua bloqueando no 3º disparo (7a-3).
#
# Uso: bash scripts/orquestrador/test-ambiente.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP="$(dirname "$ORQ_EXEC_ROOT")"
trap 'rm -rf "$TMP"' EXIT
# shellcheck source=test-fixture-drenagem.sh
source "$AQUI/test-fixture-drenagem.sh"
fx_config "$ORQ_EXEC_ROOT" '.sem_progresso_limite = 3'
for id in 901 902 903; do fx_ticket "$ORQ_EXEC_ROOT" "$id"; done
fx_git "$ORQ_EXEC_ROOT"
LOCAL_LOOP_SOURCED=1
# shellcheck source=local-loop.sh
source "$AQUI/local-loop.sh"
set +e

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

FILA="$ORQ_EXEC_ROOT/docs/fila"
TRILHA="$FILA/runs/events.log"
MODO="$TMP/modo"     # preflight | proprio
CALLS="$TMP/calls"

ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
merge_em_alvo() { return 0; }
cleanup_frente() { return 0; }
run_executor_once() {
  local id; id="$(ticket_field "$2" '.id')"
  echo "$id" >> "$CALLS"
  case "$(cat "$MODO")" in
    preflight)
      # Igual ao executor real: o `die` do preflight sai ANTES de
      # TICKET_EM_CURSO, então o trap grava EXECUTOR_MORREU com id "—" e
      # fase "?". A mensagem carrega o que varia de ticket para ticket: o id,
      # um sha, um pid e um caminho — é isso que a normalização tira.
      # O pid tem 4 dígitos num ticket e 9 no outro, de propósito: número
      # comprido não pode normalizar diferente de número curto.
      local pid=4242; [ "$id" = 902 ] && pid=123456789
      echo "[orq ERRO] preflight: lock de git em uso por outro processo: $ORQ_EXEC_ROOT/.git/index.lock (pid $pid, vez do $id, HEAD $(printf '%07x' $RANDOM$RANDOM)a)" >&2
      event "—" EXECUTOR_MORREU "rc=1" "fase=?"
      return 1 ;;
    proprio)
      # Causa PRÓPRIA de cada ticket: o texto muda de verdade, não só o id.
      case "$id" in
        904) echo "[orq ERRO] recusado: o ticket $id pede cmd fora do prefixo permitido" >&2 ;;
        905) echo "fatal: branch 'frente/$id' está em uso por outra worktree" >&2 ;;
        *)   echo "[orq ERRO] critério $id sem cmd executável" >&2 ;;
      esac
      event "$id" EXECUTOR_MORREU "rc=128" "fase=worktree"
      return 128 ;;
  esac
}
contador() { cut -d'|' -f1 "$RUNS_BASE/$1/.sem-progresso" 2>/dev/null || true; }
st()       { ticket_field "$FILA/$1-t.md" '.status'; }
n_amb()    { grep -c ' AMBIENTE ' "$TRILHA" 2>/dev/null || true; }
disparo()  {
  : > "$CALLS"
  drenar > "$TMP/out.$1" 2>&1
  echo "  --- disparo $1 ($(cat "$MODO")): chamadas [$(tr '\n' ' ' < "$CALLS")]" \
       "901=$(st 901)/$(contador 901) 902=$(st 902)/$(contador 902) 903=$(st 903)/$(contador 903)"
}

echo "== 1. preflight recusa TODO ticket, 3 disparos =="
echo preflight > "$MODO"
max=0
for d in 1 2 3; do
  disparo "$d"
  n="$(grep -c . "$CALLS")"; [ "$n" -gt "$max" ] && max="$n"
done
bl=0; for id in 901 902 903; do [ "$(st "$id")" = bloqueado ] && bl=$((bl + 1)); done
[ "$bl" = 0 ] && ok "0 bloqueados depois de 3 disparos" || falha "$bl ticket(s) bloqueado(s) por ambiente"
[ -z "$(contador 901)$(contador 902)$(contador 903)" ] && ok "contadores zerados (nenhum .sem-progresso)" \
  || falha "contadores: 901='$(contador 901)' 902='$(contador 902)' 903='$(contador 903)'"
[ "$(n_amb)" = 3 ] && ok "3 eventos AMBIENTE (um por disparo)" || falha "esperava 3 AMBIENTE, há $(n_amb)"
[ "$max" -le 2 ] && ok "no máximo 2 chamadas ao executor por disparo (máx: $max)" || falha "um disparo chamou o executor $max vezes"
amb="$(grep ' AMBIENTE ' "$TRILHA" | tail -1)"
echo "  trilha: $amb"
case "$amb" in *" --- AMBIENTE tickets=901,902 causa="*) ok "evento com os tickets que colidiram" ;; *) falha "evento fora do formato" ;; esac
causa="${amb#* causa=}"
case "$causa" in *901*|*902*|*"$ORQ_EXEC_ROOT"*|*index.lock*) falha "causa não normalizada: $causa" ;;
  *"preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)") ok "causa normalizada (sem id, sha, número, caminho)" ;;
  *) falha "causa perdeu o texto: $causa" ;; esac
fim="$(grep ' DRENAGEM_FIM ' "$TRILHA" | tail -1)"
case "$fim" in *"bloqueados=0 "*"sem_progresso=0 "*) ok "DRENAGEM_FIM: bloqueados=0 sem_progresso=0" ;; *) falha "DRENAGEM_FIM: $fim" ;; esac
mot="$(grep '^MOTIVO' "$FILA/runs/STATUS.md")"
echo "  STATUS: $mot"
case "$mot" in *"ambiente: "*"preflight: lock de git em uso"*) ok "STATUS diz ambiente e a causa" ;; *) falha "STATUS sem a causa de ambiente" ;; esac
[ "$(jq -r '.motivo' "$FILA/runs/.status.json" | cut -d: -f1)" = ambiente ] && ok "motivo_ocioso=ambiente" || falha "motivo não começa por ambiente"

echo
echo "== 2. causas próprias em tickets diferentes NÃO são ambiente =="
for id in 901 902 903; do ticket_set_status "$FILA/$id-t.md" done; ticket_commit "$FILA/$id-t.md" "fixture: $id fora"; done
for id in 904 905; do fx_ticket "$ORQ_EXEC_ROOT" "$id"; git -C "$ORQ_EXEC_ROOT" add -- "docs/fila/$id-t.md"; done
git -C "$ORQ_EXEC_ROOT" commit -q -m "fixture: 904 905"
echo proprio > "$MODO"; antes="$(n_amb)"; disparo 4
[ "$(contador 904)" = 1 ] && [ "$(contador 905)" = 1 ] && ok "904 e 905 somam 1 cada" || falha "904='$(contador 904)' 905='$(contador 905)'"
[ "$(n_amb)" = "$antes" ] && ok "nenhum AMBIENTE" || falha "causas diferentes viraram AMBIENTE"

echo
echo "== 3. um ticket sozinho travado continua bloqueando no 3º disparo =="
ticket_set_status "$FILA/905-t.md" done; ticket_commit "$FILA/905-t.md" "fixture: 905 fora"
disparo 5; disparo 6
[ "$(st 904)" = bloqueado ] && ok "904 bloqueado no 3º disparo" || falha "904 devia estar bloqueado, está $(st 904) ($(contador 904))"
grep -Eq ' 904 BLOQUEADO motivo=sem_progresso( |$)' "$TRILHA" && ok "trilha: 904 BLOQUEADO motivo=sem_progresso" || falha "sem BLOQUEADO do 904"
[ -z "$(git -C "$ORQ_EXEC_ROOT" status --porcelain -- docs/fila/904-t.md)" ] && ok "bloqueio commitado" || falha "bloqueio sem commit"
[ "$(n_amb)" = "$antes" ] && ok "nenhum AMBIENTE no caso isolado" || falha "caso isolado virou AMBIENTE"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
