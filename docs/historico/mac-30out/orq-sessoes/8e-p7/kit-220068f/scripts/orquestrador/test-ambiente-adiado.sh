#!/usr/bin/env bash
# test-ambiente-adiado.sh · a regra de AMBIENTE da 7a-8 vale sobre o ADIADO
# (peça 7b-2).
#
# Desde a 7b-2 a recusa de preflight não mata mais o executor: ela vira ADIADO
# motivo=preflight causa=<uma linha>, sem cooldown. E todo adiamento sem
# cooldown (sessão caída, timeout, 5xx, crash de gate) segue a mesma régua: a
# MESMA causa normalizada em dois tickets na mesma drenagem é ambiente, não
# ticket. Sem isso, um login caído adiava a fila inteira a cada disparo.
#
#   1. preflight recusa TODO ticket (ADIADO motivo=preflight): 3 disparos, 3
#      AMBIENTE, no máximo 2 chamadas por disparo, STATUS diz ambiente.
#   2. sessão caída em todo ticket (ADIADO motivo=sessao, sem cooldown): AMBIENTE.
#   3. adiamentos com causas DIFERENTES não são ambiente: a drenagem segue.
#
# Uso: bash scripts/orquestrador/test-ambiente-adiado.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP="$(dirname "$ORQ_EXEC_ROOT")"
trap 'rm -rf "$TMP"' EXIT
# shellcheck source=test-fixture-drenagem.sh
source "$AQUI/test-fixture-drenagem.sh"
fx_config "$ORQ_EXEC_ROOT"
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
MODO="$TMP/modo"     # preflight | sessao | proprio
CALLS="$TMP/calls"

ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
merge_em_alvo() { return 0; }
cleanup_frente() { return 0; }
# O executor da 7b-2: o que ele grava na trilha em cada adiamento, e o rc 0.
run_executor_once() {
  local id; id="$(ticket_field "$2" '.id')"
  echo "$id" >> "$CALLS"
  case "$(cat "$MODO")" in
    preflight)
      local pid=4242; [ "$id" = 902 ] && pid=123456789
      echo "[orq ERRO] preflight: lock de git em uso por outro processo: $ORQ_EXEC_ROOT/.git/index.lock (pid $pid)" >&2
      event "$id" ADIADO "motivo=preflight" \
        "causa=preflight: lock de git em uso por outro processo: $ORQ_EXEC_ROOT/.git/index.lock (pid $pid, vez do $id, HEAD $(printf '%07x' $RANDOM$RANDOM)a)" ;;
    sessao)
      event "$id" ADIADO "motivo=sessao" "attempt=1" "rc=1" "dur=3s" "cooldown=nao" ;;
    proprio)
      case "$id" in
        901) event "$id" ADIADO "motivo=timeout" "attempt=1" "rc=124" "dur=1801s" "cooldown=nao" ;;
        902) event "$id" ADIADO "motivo=gate_crash" "attempt=1" "rc=0" "dur=40s" "cooldown=nao" ;;
        *)   event "$id" ADIADO "motivo=servidor" "attempt=1" "rc=1" "dur=5s" "cooldown=nao" ;;
      esac ;;
  esac
  return 0
}
st()     { ticket_field "$FILA/$1-t.md" '.status'; }
n_amb()  { grep -c ' AMBIENTE ' "$TRILHA" 2>/dev/null || true; }
disparo() {
  : > "$CALLS"
  drenar > "$TMP/out.$1" 2>&1
  echo "  --- disparo $1 ($(cat "$MODO")): chamadas [$(tr '\n' ' ' < "$CALLS")]" \
       "901=$(st 901) 902=$(st 902) 903=$(st 903)"
}

echo "== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos =="
echo preflight > "$MODO"
max=0
for d in 1 2 3; do
  disparo "$d"
  n="$(grep -c . "$CALLS")"; [ "$n" -gt "$max" ] && max="$n"
done
[ "$(n_amb)" = 3 ] && ok "3 eventos AMBIENTE (um por disparo)" || falha "esperava 3 AMBIENTE, há $(n_amb)"
[ "$max" -le 2 ] && ok "no máximo 2 chamadas por disparo (máx: $max)" || falha "um disparo chamou o executor $max vezes"
amb="$(grep ' AMBIENTE ' "$TRILHA" | tail -1)"
echo "  trilha: $amb"
case "$amb" in *" --- AMBIENTE tickets=901,902 causa="*) ok "evento com os tickets que colidiram" ;; *) falha "evento fora do formato" ;; esac
causa="${amb#* causa=}"
case "$causa" in
  *901*|*902*|*"$ORQ_EXEC_ROOT"*) falha "causa não normalizada: $causa" ;;
  *"ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)") ok "causa normalizada, com o motivo preflight" ;;
  *) falha "causa perdeu o texto: $causa" ;;
esac
bl=0; for id in 901 902 903; do [ "$(st "$id")" = bloqueado ] && bl=$((bl + 1)); done
[ "$bl" = 0 ] && ok "0 bloqueados" || falha "$bl bloqueado(s)"
mot="$(grep '^MOTIVO' "$FILA/runs/STATUS.md")"
echo "  STATUS: $mot"
case "$mot" in *"ambiente: "*"preflight: lock de git"*) ok "STATUS diz ambiente e a causa" ;; *) falha "STATUS sem a causa de ambiente" ;; esac

echo
echo "== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE =="
echo sessao > "$MODO"; antes="$(n_amb)"; disparo 4
[ "$(n_amb)" = $((antes + 1)) ] && ok "um AMBIENTE" || falha "sem AMBIENTE para sessão caída em 2 tickets"
[ "$(grep -c . "$CALLS")" -le 2 ] && ok "parou na 2ª chamada" || falha "chamou $(grep -c . "$CALLS") vezes"
grep ' AMBIENTE ' "$TRILHA" | tail -1 | grep -q 'causa=ADIADO motivo=sessao' \
  && ok "causa: ADIADO motivo=sessao" || falha "causa: $(grep ' AMBIENTE ' "$TRILHA" | tail -1)"

echo
echo "== 3. adiamentos com causas DIFERENTES não são ambiente =="
echo proprio > "$MODO"; antes="$(n_amb)"; disparo 5
[ "$(n_amb)" = "$antes" ] && ok "nenhum AMBIENTE" || falha "causas diferentes viraram AMBIENTE"
[ "$(tr '\n' ' ' < "$CALLS")" = "901 902 903 " ] && ok "a drenagem seguiu pelos três" || falha "chamadas: $(tr '\n' ' ' < "$CALLS")"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
