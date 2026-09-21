#!/usr/bin/env bash
# test-drenagem-sem-progresso.sh — um ticket que não avança NÃO encerra a
# drenagem inteira (peça 7a-2). Porte do teste homônimo do comarka-operacional
# para o `drenar()` do kit.
#
# Fila de 3: 901 e 902 abortam ANTES do agente (o executor sai rc 1 sem tocar no
# status, como num preflight que morre) e 903 é saudável (vai a
# aguardando_merge, a drenagem mergeia). Até a 7a-2 a drenagem encerrava no 901
# ("sem progresso em 901") e o 903 nunca era tocado: uma chamada só. Agora são
# três chamadas numa drenagem, o 903 vira done, e ela ainda TERMINA — no máximo
# N chamadas, N = processáveis no início. Acima disso é loop.
#
# Uso: bash scripts/orquestrador/test-drenagem-sem-progresso.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
trap 'rm -rf "$(dirname "$ORQ_EXEC_ROOT")"' EXIT
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
CALLS="$(dirname "$ORQ_EXEC_ROOT")/calls"; : > "$CALLS"
ARGS="$(dirname "$ORQ_EXEC_ROOT")/args"; : > "$ARGS"

# --- stubs: nada de worktree, merge ou executor de verdade --------------------
ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
merge_em_alvo() { return 0; }
cleanup_frente() { return 0; }
run_executor_once() {
  local id
  printf '%s\n' "$1" >> "$ARGS"
  id="$(ticket_field "$2" '.id')"
  echo "$id" >> "$CALLS"
  case "$id" in
    901|902)
      echo "[orq ERRO] preflight: árvore de execução suja em $ORQ_EXEC_ROOT (ticket $id)" >&2
      return 1 ;;
    *)
      ticket_set_status "$2" aguardando_merge
      return 0 ;;
  esac
}

N="$(pendentes_processaveis)"
echo "== fila: 901 e 902 abortam antes do agente, 903 é saudável (N=$N) =="
drenar > "$(dirname "$ORQ_EXEC_ROOT")/out" 2>&1
sed 's/^/  | /' "$(dirname "$ORQ_EXEC_ROOT")/out" | grep -E 'sem progresso|ticket 90|encerra' || true

n="$(grep -c . "$CALLS")"
seq_calls="$(tr '\n' ' ' < "$CALLS")"
[ "$n" = 3 ] && ok "executor chamado 3x numa drenagem: $seq_calls" \
  || falha "esperava 3 chamadas (901, 902, 903), obtive $n: '$seq_calls' — <3 = ticket travado segurou a fila"
[ "$n" -le "$N" ] && ok "terminou em <= N=$N chamadas (sem loop)" || falha "LOOP: $n chamadas com N=$N"
[ "$seq_calls" = "901 902 903 " ] && ok "cada ticket tentado UMA vez, na ordem da fila" \
  || falha "ordem/repetição inesperada: '$seq_calls'"
[ "$(sort -u "$ARGS")" = "--ticket" ] && ok "o executor recebe --ticket (não reescolhe)" \
  || falha "executor chamado sem --ticket: $(sort -u "$ARGS" | tr '\n' ' ')"

[ "$(ticket_field "$FILA/903-t.md" '.status')" = done ] && ok "o saudável (903) foi processado: done" \
  || falha "903 devia estar done, está $(ticket_field "$FILA/903-t.md" '.status')"
for id in 901 902; do
  [ "$(ticket_field "$FILA/$id-t.md" '.status')" = pendente ] && ok "$id segue pendente (não mudou de status)" \
    || falha "$id mudou de status: $(ticket_field "$FILA/$id-t.md" '.status')"
done

fim="$(grep ' DRENAGEM_FIM ' "$FILA/runs/events.log" | tail -1)"
echo "  trilha: $fim"
case "$fim" in *"aprovados=1 "*) ok "DRENAGEM_FIM conta o aprovado" ;; *) falha "DRENAGEM_FIM sem aprovados=1" ;; esac
case "$fim" in *"sem_progresso=2 "*) ok "DRENAGEM_FIM conta os 2 sem progresso em contador próprio" ;;
  *) falha "DRENAGEM_FIM sem sem_progresso=2" ;; esac

mot="$(jq -r '.motivo // ""' "$FILA/runs/.status.json" 2>/dev/null)"
echo "  STATUS motivo: $mot"
case "$mot" in *901*902*) ok "motivo_ocioso lista TODOS os pulados (901 e 902)" ;;
  *) falha "motivo_ocioso não lista os dois pulados: '$mot'" ;; esac

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
