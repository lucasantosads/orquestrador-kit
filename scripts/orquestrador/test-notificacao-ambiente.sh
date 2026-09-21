#!/usr/bin/env bash
# test-notificacao-ambiente.sh · o aviso de AMBIENTE só na transição (peça 7b-5).
#
# Desde a 7a-8 a drenagem que termina em AMBIENTE conta os adiados como
# processados, e a peça 13 notifica toda drenagem que processou: com o ambiente
# quebrado, um cartão a cada disparo, e cartão repetido treina o operador a
# ignorar o que importa. A regra agora é a da fila vazia: avisa quando ENTRA em
# AMBIENTE, cala nas drenagens seguintes que terminam no mesmo estado, e avisa
# UMA vez quando sai.
#
#   1. 3 disparos em AMBIENTE -> 1 aviso (o de entrada).
#   2. o 4º disparo, saudável -> 1 aviso, o de saída (com o placar da drenagem).
#   3. o 5º disparo, saudável -> volta à regra de sempre, sem aviso de saída.
#
# Uso: bash scripts/orquestrador/test-notificacao-ambiente.sh

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
NOTIF="$FILA/runs/notificacoes.log"
MODO="$TMP/modo"   # preflight | aprova
ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
merge_em_alvo() { return 0; }
cleanup_frente() { return 0; }
run_executor_once() {
  local f="$2" id; id="$(ticket_field "$2" '.id')"
  case "$(cat "$MODO")" in
    preflight) event "$id" ADIADO "motivo=preflight" "causa=preflight: árvore de execução suja em $ORQ_EXEC_ROOT (vez do $id)" ;;
    aprova)    ticket_set_status "$f" aguardando_merge; ticket_commit "$f" "stub: $id aprovado"
               event "$id" APROVADO "merge=aguardando" "dur=30s" "attempt=1" ;;
  esac
  return 0
}
avisos() { grep -c . "$NOTIF" 2>/dev/null || true; }
disparo() { drenar > "$TMP/out.$1" 2>&1; echo "  --- disparo $1 ($(cat "$MODO")): avisos=$(avisos)"; }

echo "== 1. três disparos em AMBIENTE: um aviso =="
echo preflight > "$MODO"
for d in 1 2 3; do disparo "$d"; done
[ "$(grep -c ' AMBIENTE ' "$FILA/runs/events.log")" = 3 ] && ok "3 drenagens em AMBIENTE" || falha "AMBIENTE: $(grep -c ' AMBIENTE ' "$FILA/runs/events.log")"
[ "$(avisos)" = 1 ] && ok "1 aviso em 3 disparos" || falha "$(avisos) avisos em 3 disparos"
grep -qi 'ambiente' "$NOTIF" 2>/dev/null && ok "o aviso fala de ambiente" || falha "aviso: $(cat "$NOTIF" 2>/dev/null)"
sed 's/^/  | /' "$NOTIF" 2>/dev/null

echo
echo "== 2. o 4º disparo, saudável: um aviso de saída =="
echo aprova > "$MODO"; antes="$(avisos)"; disparo 4
[ "$(avisos)" = $((antes + 1)) ] && ok "exatamente 1 aviso novo" || falha "$(( $(avisos) - antes )) avisos novos"
tail -1 "$NOTIF" | grep -qi 'ambiente' && ok "é o aviso de SAÍDA do ambiente" || falha "último aviso: $(tail -1 "$NOTIF")"
tail -1 "$NOTIF" | grep -q '3 aprovados' && ok "com o placar da drenagem (3 aprovados)" || falha "sem o placar: $(tail -1 "$NOTIF")"
tail -1 "$NOTIF" | sed 's/^/  | /'

echo
echo "== 3. o 5º disparo, saudável e sem nada: sem aviso de saída de novo =="
antes="$(avisos)"; disparo 5
tail -1 "$NOTIF" | grep -qi 'ambiente' && [ "$(avisos)" != "$antes" ] && falha "repetiu o aviso de saída" || ok "nenhum aviso de ambiente repetido"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
