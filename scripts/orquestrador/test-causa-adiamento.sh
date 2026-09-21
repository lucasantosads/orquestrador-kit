#!/usr/bin/env bash
# test-causa-adiamento.sh · a tabela de causas do adiamento (peça 7b-2).
#
# Porte do test-cooldown-causa.sh do Comarka, e o que ele não cobria. Roda o
# executor.sh DE VERDADE num repo de fixture (test-fixture-executor.sh), com um
# `claude` falso e gates controlados pelo caso. Zero modelo, zero rede.
#
# A regra: COOLDOWN só para limite REMOTO (rate_limit, quota). Timeout local,
# 5xx/overloaded e crash de runner de gate ADIAM sem cooldown, sem consumir
# tentativa e sem escalar modelo. Recusa de preflight vira ADIADO
# motivo=preflight, nunca EXECUTOR_MORREU.
#
#   A. timeout (rc 124 do watchdog)       -> ADIADO timeout, SEM cooldown
#   B. 429                                 -> ADIADO rate_limit, COM cooldown
#   C. 503 / overloaded                    -> ADIADO servidor, SEM cooldown
#   D. gate de testes sem placar           -> ADIADO gate_crash, sem RETRY, sem opus
#   E. tsc ausente (rc 127)                -> ADIADO gate_crash
#   F. tsc com "error TS"                  -> REPROVADO (mérito), nunca ADIADO
#   G. recusa de preflight (árvore suja)   -> ADIADO motivo=preflight causa=...,
#                                             nenhuma linha EXECUTOR_MORREU, rc 0
#
# Uso: bash scripts/orquestrador/test-causa-adiamento.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ISOLAMENTO (peça 0d): nada deste script carrega o lib.sh, mas o contrato vale
# igual. O executor roda em processo próprio, com ORQ_TESTE=1 e ORQ_EXEC_ROOT no
# repo do fixture (fxe_roda).
export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP_RAIZ="$(dirname "$ORQ_EXEC_ROOT")"
# shellcheck source=test-fixture-executor.sh
source "$AQUI/test-fixture-executor.sh"
trap 'fxe_limpa; rm -rf "$TMP_RAIZ"' EXIT

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
trilha() { printf '%s\n' "$(fxe_eventos)" | sed 's/^[^ ]* /  | /'; }

# adiado_sem_gasto <motivo> — o que todo adiamento de infra tem de cumprir.
adiado_sem_gasto() {
  local m="$1" ev
  ev="$(fxe_eventos)"
  [ "$(fxe_status)" = pendente ] && ok "ticket segue pendente" || falha "status=$(fxe_status)"
  printf '%s\n' "$ev" | grep -q " 901 ADIADO motivo=$m " \
    && ok "trilha: ADIADO motivo=$m" || falha "sem ADIADO motivo=$m"
  printf '%s\n' "$ev" | grep -q ' REPROVADO \| RETRY \| BLOQUEADO ' \
    && falha "houve REPROVADO/RETRY/BLOQUEADO" || ok "nenhum REPROVADO, RETRY ou BLOQUEADO"
  [ "$(fxe_tentativas)" = 1 ] && ok "uma tentativa só (nada consumido)" || falha "$(fxe_tentativas) tentativas"
  grep -q 'model=opus' "$FXE/chamadas" && falha "escalou para opus" || ok "não escalou modelo"
}

echo "== A. timeout local (rc 124 do watchdog): adia SEM cooldown =="
fxe_novo; fxe_claude sleep; fxe_roda
adiado_sem_gasto timeout
fxe_cooldown && falha "cooldown armado num timeout local" || ok "cooldown NÃO armado"
printf '%s\n' "$(fxe_eventos)" | grep -q ' ADIADO .*cooldown=nao' && ok "evento diz cooldown=nao" || falha "evento sem cooldown=nao"
case "$(fxe_nota)" in *timeout*) ok "nota registra timeout" ;; *) falha "nota: $(fxe_nota)" ;; esac
trilha; fxe_limpa

echo
echo "== B. 429: adia COM cooldown =="
fxe_novo; fxe_claude 429; fxe_roda
adiado_sem_gasto rate_limit
fxe_cooldown && ok "cooldown ARMADO (limite remoto)" || falha "cooldown não armado num 429"
printf '%s\n' "$(fxe_eventos)" | grep -q ' ADIADO .*cooldown=sim' && ok "evento diz cooldown=sim" || falha "evento sem cooldown=sim"
trilha; fxe_limpa

echo
echo "== C. 503 / overloaded: adia SEM cooldown =="
fxe_novo; fxe_claude 503; fxe_roda
adiado_sem_gasto servidor
fxe_cooldown && falha "cooldown armado num 5xx" || ok "cooldown NÃO armado"
trilha; fxe_limpa

echo
echo "== D. gate de testes que não rodou (sem placar): gate_crash =="
fxe_novo
fxe_gate test 'echo "Error: Cannot find module vitest/package.json" >&2; exit 1'
fxe_roda
adiado_sem_gasto gate_crash
fxe_cooldown && falha "cooldown armado num crash de gate" || ok "cooldown NÃO armado"
trilha; fxe_limpa

echo
echo "== E. tsc ausente (rc 127, command not found): gate_crash =="
fxe_novo
fxe_gate typecheck 'tsc-que-nao-existe --noEmit'
fxe_roda
adiado_sem_gasto gate_crash
trilha; fxe_limpa

echo
echo "== F. tsc que rodou e apontou erro de código: mérito, não adia =="
fxe_novo '.max_retries = 0'
fxe_gate typecheck 'echo "src/a.ts(1,14): error TS2322: Type string is not assignable to type number."; exit 2'
fxe_roda
ev="$(fxe_eventos)"
printf '%s\n' "$ev" | grep -q ' 901 REPROVADO ' && ok "REPROVADO (mérito)" || falha "não reprovou"
printf '%s\n' "$ev" | grep -q ' 901 ADIADO ' && falha "adiou um erro de código" || ok "não adiou"
trilha; fxe_limpa

echo
echo "== G. recusa de preflight (árvore de execução suja): ADIADO motivo=preflight =="
fxe_novo
printf 'sujeira\n' > "$FXE/repo/lixo.txt"
fxe_roda
ev="$(fxe_eventos)"
[ "$FXE_RC" = 0 ] && ok "executor sai 0" || falha "executor saiu rc=$FXE_RC"
printf '%s\n' "$ev" | grep -q ' 901 ADIADO motivo=preflight causa=.*árvore de execução suja' \
  && ok "trilha: ADIADO motivo=preflight com a causa" || falha "sem ADIADO motivo=preflight causa=..."
printf '%s\n' "$ev" | grep -q 'EXECUTOR_MORREU' && falha "gravou EXECUTOR_MORREU" || ok "nenhuma linha EXECUTOR_MORREU"
[ "$(printf '%s\n' "$ev" | grep -c ' ADIADO ')" = 1 ] && ok "um evento, uma linha" || falha "ADIADO em mais de uma linha"
[ "$(fxe_status)" = pendente ] && ok "ticket segue pendente" || falha "status=$(fxe_status)"
fxe_cooldown && falha "cooldown armado por preflight" || ok "cooldown NÃO armado"
trilha; fxe_limpa

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
