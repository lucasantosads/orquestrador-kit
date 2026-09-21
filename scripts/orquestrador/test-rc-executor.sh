#!/usr/bin/env bash
# test-rc-executor.sh — o rc do EXECUTOR atravessa o `tee` da drenagem (peça 7a-7).
#
# Desde a 7a-3 a saída do executor vai por `tee` (local-loop.sh:349):
#   run_executor_once ... 2>&1 | tee "$exe_out" && exe_rc=0 || exe_rc="${PIPESTATUS[0]}"
# O rc de um pipeline é o do ÚLTIMO comando, o tee, que quase sempre sai 0. Quem
# faz o rc do executor chegar ao loop são duas coisas juntas: `pipefail`
# (local-loop.sh:19, lib.sh:15), que deixa o pipeline falhar quando o executor
# falha e desvia para o ramo `||`, e o `PIPESTATUS[0]` lido nesse ramo, que é
# o rc do PRIMEIRO comando. Aqui se prova que o loop enxerga exatamente o rc
# do executor, e nunca o do tee:
#   A. executor sai 3 sem desfecho, tee 0         -> loop vê 3
#   B. executor sai 0 sem desfecho, tee 0         -> loop vê 0
#   C. executor sai 0, tee sai 5                  -> loop vê 0 (não 5)
#   D. executor sai 3, tee sai 5                  -> loop vê 3 (não 5)
# "Vê" em dois lugares: a linha "executor rc=N" do log, e a causa do bloqueio
# por sem-progresso (limite 1), que sem desfecho na trilha cai em
# "executor saiu rc=N sem desfecho registrado".
#
# Uso: bash scripts/orquestrador/test-rc-executor.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP="$(dirname "$ORQ_EXEC_ROOT")"
trap 'rm -rf "$TMP"' EXIT
# shellcheck source=test-fixture-drenagem.sh
source "$AQUI/test-fixture-drenagem.sh"
fx_config "$ORQ_EXEC_ROOT" '.sem_progresso_limite = 1'
fx_git "$ORQ_EXEC_ROOT"
LOCAL_LOOP_SOURCED=1
# shellcheck source=local-loop.sh
source "$AQUI/local-loop.sh"
set +e

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

FILA="$ORQ_EXEC_ROOT/docs/fila"
RC_EXEC="$TMP/rc-exec"
RC_TEE="$TMP/rc-tee"

ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
merge_em_alvo() { return 0; }
cleanup_frente() { return 0; }
# Executor stub: não grava evento, não mexe em status nem nota, não imprime
# linha de erro. O único sinal que ele deixa é o rc.
run_executor_once() {
  echo "stub do executor para $(ticket_field "$2" '.id'), saindo com $(cat "$RC_EXEC")"
  return "$(cat "$RC_EXEC")"
}
# tee stub: faz o trabalho do tee de verdade (a cópia da saída continua
# existindo) e sai com o rc escolhido pelo caso.
tee() { command tee "$@"; return "$(cat "$RC_TEE")"; }

caso() {  # caso <letra> <id> <rc-executor> <rc-tee>
  local letra="$1" id="$2" re="$3" rt="$4" nota linha
  echo "$re" > "$RC_EXEC"; echo "$rt" > "$RC_TEE"
  fx_ticket "$ORQ_EXEC_ROOT" "$id"
  git -C "$ORQ_EXEC_ROOT" add -- "docs/fila/$id-t.md" && git -C "$ORQ_EXEC_ROOT" commit -q -m "fixture: $id"
  drenar > "$TMP/out.$letra" 2>&1
  linha="$(grep -o 'executor rc=[0-9]*' "$TMP/out.$letra" | head -1)"
  nota="$(ticket_field "$FILA/$id-t.md" '.notas_status')"
  echo "  --- $letra: executor sai $re, tee sai $rt -> log '$linha'; nota: $nota"
  [ "$linha" = "executor rc=$re" ] && ok "$letra: o log vê rc=$re" || falha "$letra: esperava 'executor rc=$re', o log diz '$linha'"
  case "$nota" in
    *"última causa: executor saiu rc=$re sem desfecho registrado") ok "$letra: a causa do bloqueio carrega rc=$re" ;;
    *) falha "$letra: a causa não carrega rc=$re" ;;
  esac
  [ "$re" = "$rt" ] || case "$nota$linha" in *"rc=$rt"*) falha "$letra: o rc do tee ($rt) vazou para o loop" ;; esac
}

echo "== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) =="
case "$(set -o | awk '$1 == "pipefail" { print $2 }')" in
  on) ok "pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)" ;;
  *)  falha "pipefail desligado: o rc do tee mascararia o do executor" ;;
esac

echo
echo "== o rc do executor atravessa o tee =="
caso A 801 3 0
caso B 802 0 0
caso C 803 0 5
caso D 804 3 5

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
