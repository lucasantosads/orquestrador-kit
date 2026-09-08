#!/usr/bin/env bash
# fixture-e2e.sh — o fixture atravessa o loop de ponta a ponta (peça K7-e2e).
#
# ESTE SCRIPT GASTA DINHEIRO. É o único do kit que chama a API da Anthropic:
# uma sondagem de modelo (preflight_probe) e as tentativas do executor + o juiz,
# nos modelos e no teto que o 000-config.json DO FIXTURE declara. Não rode sem
# ter lido, no config instanciado, `modelos`, `orcamento.usd_ticket` e
# `claude_timeout_secs` — o script os imprime antes de começar, e exige
# confirmação (ORQ_E2E_OK=1) para seguir.
#
# O que ele faz: instancia o fixture, roda UMA drenagem (`local-loop.sh` do
# fixture, com watchdog de claude_timeout_secs + 120 s) e imprime a evidência.
# O fixture NÃO é removido no fim: se o ticket reprovar, o diff da tentativa e o
# veredito cru são o resultado, e apagá-los seria apagar o achado.
#
# Nenhum push acontece nem pode acontecer: o origin do fixture é
# git@example.invalid:..., reservado pela RFC 2606. Se o loop tentasse publicar,
# falharia alto — e isso também seria resultado.
#
# Uso: ORQ_E2E_OK=1 bash scripts/kit/fixture-e2e.sh

set -uo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CFG_TEMPLATE="$KIT/fixture/docs/fila/000-config.json"

printf '== o que esta execução vai fazer ==\n'
printf '  comando        bash <fixture>/scripts/orquestrador/local-loop.sh (UMA drenagem)\n'
printf '  ticket         001 soma-de-negativos (docs/fila/001-soma-de-negativos.md)\n'
printf '  executor       %s\n' "$(jq -r '.executor_model' "$CFG_TEMPLATE")"
printf '  juiz (alto)    %s\n' "$(jq -r '.modelos.juiz_alto' "$CFG_TEMPLATE")"
printf '  juiz (baixo)   %s\n' "$(jq -r '.modelos.juiz_baixo' "$CFG_TEMPLATE")"
printf '  retry final    %s\n' "$(jq -r '.retry_final_model' "$CFG_TEMPLATE")"
printf '  sondagem       preflight_probe = %s (chamada paga antes do ticket)\n' "$(jq -r '.preflight_probe' "$CFG_TEMPLATE")"
printf '  orçamento      usd_ticket = %s · usd_dia = %s\n' \
  "$(jq -r '.orcamento.usd_ticket' "$CFG_TEMPLATE")" "$(jq -r '.orcamento.usd_dia' "$CFG_TEMPLATE")"
printf '  timeout        claude_timeout_secs = %s\n' "$(jq -r '.claude_timeout_secs' "$CFG_TEMPLATE")"
printf '  ESTA CHAMADA É PAGA.\n\n'

if [ "${ORQ_E2E_OK:-0}" != 1 ]; then
  printf 'recusado: rode com ORQ_E2E_OK=1 para confirmar que o gasto está autorizado.\n' >&2
  exit 2
fi

command -v claude >/dev/null 2>&1 || { printf 'ERRO: claude fora do PATH\n' >&2; exit 2; }

FX="$(bash "$KIT/scripts/kit/fixture.sh")" || { printf 'ERRO: fixture.sh falhou\n' >&2; exit 2; }
printf '\nfixture: %s  (NÃO é removido no fim — a evidência mora nele)\n\n' "$FX"

TOUT=$(( $(jq -r '.claude_timeout_secs' "$FX/docs/fila/000-config.json") + 120 ))

# Watchdog portátil: o macOS não tem `timeout`/`gtimeout`. Mesma técnica do
# `claude_run` do lib.sh (lib.sh:964-986) — process group próprio e TERM no
# GRUPO, senão o `claude` filho vira órfão e segue queimando cota depois do
# corte.
printf '== drenagem (watchdog %ss) ==\n' "$TOUT"
t0=$(date +%s)
( set -m; exec bash "$FX/scripts/orquestrador/local-loop.sh" ) &
LOOP_PID=$!
( sleep "$TOUT"
  kill -TERM -"$LOOP_PID" 2>/dev/null || kill -TERM "$LOOP_PID" 2>/dev/null
  sleep 10
  kill -KILL -"$LOOP_PID" 2>/dev/null || kill -KILL "$LOOP_PID" 2>/dev/null
) >/dev/null 2>&1 &
WPID=$!
RC=0; wait "$LOOP_PID" 2>/dev/null || RC=$?
kill "$WPID" 2>/dev/null || true; wait "$WPID" 2>/dev/null || true
case "$RC" in 143|137) RC=124 ;; esac
printf 'local-loop rc=%s  (%ss)\n\n' "$RC" "$(( $(date +%s) - t0 ))"

secao() { printf '\n===== %s =====\n' "$*"; }

secao 'bash scripts/orq'
bash "$FX/scripts/orq" 2>&1 || true

secao 'tail -20 docs/fila/runs/events.log'
tail -20 "$FX/docs/fila/runs/events.log" 2>&1 || true

secao 'git log --oneline staging-auto -3'
git -C "$FX" log --oneline staging-auto -3 2>&1 || true

secao 'docs/fila/runs/custo.json'
jq . "$FX/docs/fila/runs/custo.json" 2>&1 || cat "$FX/docs/fila/runs/custo.json" 2>&1 || true

secao 'status do ticket 001'
sed -n '/```json/,/```/p' "$FX/docs/fila/001-soma-de-negativos.md" | jq -r '.status, .notas_status' 2>/dev/null \
  || grep -n '"status"' "$FX/docs/fila/001-soma-de-negativos.md"

secao 'tail -30 docs/fila/runs/local-loop.log'
tail -30 "$FX/docs/fila/runs/local-loop.log" 2>&1 || true

secao 'origin (tem de ser inválido; nenhum push é possível)'
git -C "$FX" remote -v

printf '\nfixture preservado em: %s\n' "$FX"
printf 'para remover:  bash scripts/kit/fixture.sh --limpar %s\n' "$FX"
exit "$RC"
