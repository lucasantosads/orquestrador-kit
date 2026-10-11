#!/bin/bash
# job.sh — o que o launchd roda a cada 300 s (com.orq.resolvedor, etapa 7f-b2).
#
# Uma passada do resolvedor sobre todos os repos do ~/.orq/repos.json, cada um
# no seu modo. Antes de qualquer coisa, o interruptor: existindo
# ~/.orq/RESOLVEDOR_PAUSADO (ou ORQ_RESOLVEDOR_PAUSADO), sai em 0 sem chamar o
# node. A trava global e as travas por ação estão no resolvedor (passada.ts,
# acoes.ts, repo.ts).
set -euo pipefail

PAUSADO="${ORQ_RESOLVEDOR_PAUSADO:-$HOME/.orq/RESOLVEDOR_PAUSADO}"
agora() { date -u +%Y-%m-%dT%H:%M:%SZ; }

if [ -e "$PAUSADO" ]; then
  printf '%s resolvedor pausado (%s): nada rodou\n' "$(agora)" "$PAUSADO"
  exit 0
fi

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
printf '%s passada\n' "$(agora)"
bash "$KIT/scripts/orq" resolver "$@"
