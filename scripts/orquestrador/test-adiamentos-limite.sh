#!/usr/bin/env bash
# test-adiamentos-limite.sh · teto de adiamentos consecutivos (peça 7b-3).
#
# O caso que originou a peça: no Comarka, o 315a foi adiado 8 vezes seguidas,
# cerca de 3 h de modelo, e o rótulo dizia "timeout 1500s" numa execução de
# 9 s. Adiamento não tinha teto, e a causa escrita era o RÓTULO, não a medida.
#
#   A. executor real: rc 124 em 0 s com timeout de 30 s NÃO é timeout; a trilha
#      e a nota trazem a medida (rc e duração).
#   B. drenagem: o mesmo ticket adiado em todo disparo bloqueia no 4º, com
#      notas_status "adiado 4 vezes: <causa real>", commit e BLOQUEADO
#      motivo=adiamentos.
#   C. adiado que depois aprova zera o contador.
#   D. adiamento COM cooldown (limite remoto) não conta nem zera.
#   E. o limite vem do config (adiamentos_limite), 4 quando ausente ou inválido.
#   F. AMBIENTE (mesma causa em dois tickets) desfaz o que somou na drenagem.
#
# Uso: bash scripts/orquestrador/test-adiamentos-limite.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP="$(dirname "$ORQ_EXEC_ROOT")"
# shellcheck source=test-fixture-executor.sh
source "$AQUI/test-fixture-executor.sh"
trap 'fxe_limpa; rm -rf "$TMP"' EXIT

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

echo "== A. executor real: rc 124 em 0 s com timeout de 30 s não é timeout =="
fxe_novo '.claude_timeout_secs = 30'; fxe_claude rc124; fxe_roda
ev="$(fxe_eventos | grep ' 901 ADIADO ' || true)"
echo "  trilha: ${ev#* }"
case "$ev" in *" motivo=timeout "*) falha "rotulou como timeout uma execução de 0 s" ;; *" ADIADO "*) ok "ADIADO, e não com motivo=timeout" ;; *) falha "não adiou" ;; esac
case "$ev" in *" rc=124 dur=0s "*|*" rc=124 dur=1s "*) ok "a trilha traz a medida (rc=124, duração real)" ;; *) falha "sem a medida na trilha" ;; esac
echo "  nota: $(fxe_nota)"
case "$(fxe_nota)" in *timeout*) falha "a nota diz timeout" ;; *"rc=124"*) ok "a nota traz rc=124 e não diz timeout" ;; *) falha "nota sem a medida" ;; esac
fxe_limpa

# --- drenagem, com o executor stubado ----------------------------------------
# shellcheck source=test-fixture-drenagem.sh
source "$AQUI/test-fixture-drenagem.sh"
fx_config "$ORQ_EXEC_ROOT"
for id in 901 902; do fx_ticket "$ORQ_EXEC_ROOT" "$id"; done
fx_ticket "$ORQ_EXEC_ROOT" 902 '[]' done
fx_git "$ORQ_EXEC_ROOT"
LOCAL_LOOP_SOURCED=1
# shellcheck source=local-loop.sh
source "$AQUI/local-loop.sh"
set +e

FILA="$ORQ_EXEC_ROOT/docs/fila"
TRILHA="$FILA/runs/events.log"
MODO="$TMP/modo"   # adia | aprova | limite | mesmo
ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
merge_em_alvo() { return 0; }
cleanup_frente() { return 0; }
# O executor da 7b: o ADIADO que ele grava, com a medida.
run_executor_once() {
  local f="$2" id; id="$(ticket_field "$2" '.id')"
  case "$(cat "$MODO")" in
    adia)   event "$id" ADIADO "motivo=gate_interrompido" "attempt=1" "rc=124" "dur=9s" "cooldown=nao" ;;
    mesmo)  event "$id" ADIADO "motivo=servidor" "attempt=1" "rc=1" "dur=4s" "cooldown=nao" ;;
    limite) cooldown_arm >/dev/null 2>&1
            event "$id" ADIADO "motivo=rate_limit" "attempt=1" "rc=1" "dur=2s" "cooldown=sim" ;;
    aprova) ticket_set_status "$f" aguardando_merge; ticket_commit "$f" "stub: $id aprovado"
            event "$id" APROVADO "merge=aguardando" "dur=30s" "attempt=1" ;;
  esac
  return 0
}
contador() { cut -d'|' -f1 "$RUNS_BASE/$1/.adiamentos" 2>/dev/null || true; }
st()       { ticket_field "$FILA/$1-t.md" '.status'; }
nota()     { ticket_field "$FILA/$1-t.md" '.notas_status // ""'; }
disparo()  {
  drenar > "$TMP/out.$1" 2>&1
  echo "  --- disparo $1 ($(cat "$MODO")): 901=$(st 901)/$(contador 901)"
}

echo
echo "== B. sempre adiado: bloqueia no 4º disparo com a causa real =="
echo adia > "$MODO"
for d in 1 2 3; do disparo "$d"; done
[ "$(contador 901)" = 3 ] && ok "contador em 3 depois de 3 disparos" || falha "contador='$(contador 901)'"
[ "$(st 901)" = pendente ] && ok "abaixo do limite, segue pendente" || falha "status=$(st 901)"
disparo 4
[ "$(st 901)" = bloqueado ] && ok "bloqueado no 4º disparo" || falha "esperava bloqueado, está $(st 901)"
echo "  nota: $(nota 901)"
case "$(nota 901)" in "adiado 4 vezes: "*) ok "nota começa por 'adiado 4 vezes: '" ;; *) falha "nota fora do formato" ;; esac
case "$(nota 901)" in *timeout*) falha "a causa real virou rótulo de timeout" ;; *"gate_interrompido"*"rc=124"*"9s"*) ok "a causa é a medida: motivo, rc=124 e 9s" ;; *) falha "nota sem a medida" ;; esac
grep -Eq ' 901 BLOQUEADO motivo=adiamentos n=4 limite=4( |$)' "$TRILHA" && ok "trilha: BLOQUEADO motivo=adiamentos n=4 limite=4" || falha "sem BLOQUEADO motivo=adiamentos"
[ -z "$(git -C "$ORQ_EXEC_ROOT" status --porcelain -- docs/fila/901-t.md)" ] && ok "bloqueio commitado" || falha "bloqueio sem commit"
git -C "$ORQ_EXEC_ROOT" log -1 --format=%s -- docs/fila/901-t.md | grep -q 'bloqueado (adiamentos' && ok "commit do bloqueio" || falha "último commit: $(git -C "$ORQ_EXEC_ROOT" log -1 --format=%s -- docs/fila/901-t.md)"
[ -z "$(contador 901)" ] && ok "contador zerado ao bloquear" || falha "contador='$(contador 901)'"

echo
echo "== C. adiado que depois aprova zera o contador =="
ticket_set "$FILA/901-t.md" '.status = "pendente" | .notas_status = ""'; ticket_commit "$FILA/901-t.md" "fixture: 901 reaberto"
echo adia > "$MODO"; disparo 5; disparo 6
[ "$(contador 901)" = 2 ] && ok "2 adiamentos contados" || falha "contador='$(contador 901)'"
echo aprova > "$MODO"; disparo 7
[ "$(st 901)" = done ] && ok "aprovado e mergeado" || falha "status=$(st 901)"
[ -z "$(contador 901)" ] && ok "contador zerado pela aprovação" || falha "contador='$(contador 901)'"
ticket_set "$FILA/901-t.md" '.status = "pendente" | .notas_status = ""'; ticket_commit "$FILA/901-t.md" "fixture: 901 reaberto"
echo adia > "$MODO"; disparo 8
[ "$(contador 901)" = 1 ] && ok "recomeça em 1, não em 3" || falha "contador='$(contador 901)'"

echo
echo "== D. adiamento COM cooldown não conta nem zera =="
echo limite > "$MODO"; disparo 9
[ "$(contador 901)" = 1 ] && ok "contador segue 1" || falha "contador='$(contador 901)'"
rm -f "$COOLDOWN_FILE"

echo
echo "== E. o limite vem do config =="
jq '.adiamentos_limite = 2' "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"
git -C "$ORQ_EXEC_ROOT" commit -q -am "fixture: adiamentos_limite 2"
echo adia > "$MODO"; disparo 10
[ "$(st 901)" = bloqueado ] && ok "com limite 2, bloqueia no 2º" || falha "status=$(st 901) contador='$(contador 901)'"
grep -Eq ' 901 BLOQUEADO motivo=adiamentos n=2 limite=2( |$)' "$TRILHA" && ok "trilha diz n=2 limite=2" || falha "sem n=2 limite=2"
for v in '"x"' '0' '-3' '"quatro"'; do
  jq ".adiamentos_limite = $v" "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"
  [ "$(adiamentos_limite)" = 4 ] && ok "limite inválido ($v) vira 4" || falha "limite inválido ($v) virou '$(adiamentos_limite)'"
done 2>/dev/null
jq 'del(.adiamentos_limite)' "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"
[ "$(adiamentos_limite)" = 4 ] && ok "limite ausente vira 4" || falha "limite ausente virou '$(adiamentos_limite)'"
git -C "$ORQ_EXEC_ROOT" commit -q -am "fixture: limite padrão"

echo
echo "== F. AMBIENTE desfaz o que somou na drenagem =="
ticket_set "$FILA/901-t.md" '.status = "pendente" | .notas_status = ""'; ticket_commit "$FILA/901-t.md" "fixture: 901 reaberto"
echo adia > "$MODO"; disparo 11
[ "$(contador 901)" = 1 ] && ok "901 em 1 (antes do ambiente)" || falha "901='$(contador 901)'"
ticket_set "$FILA/902-t.md" '.status = "pendente" | .notas_status = ""'; ticket_commit "$FILA/902-t.md" "fixture: 902 reaberto"
echo mesmo > "$MODO"; antes="$(grep -c ' AMBIENTE ' "$TRILHA")"; disparo 12
[ "$(grep -c ' AMBIENTE ' "$TRILHA")" = $((antes + 1)) ] && ok "um AMBIENTE" || falha "sem AMBIENTE"
[ "$(contador 901)" = 1 ] && [ -z "$(contador 902)" ] && ok "901 volta a 1 e 902 não soma" || falha "901='$(contador 901)' 902='$(contador 902)'"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
