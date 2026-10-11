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

# Sem o `claude` (7f-b4): a passada segue só com extração (--sem-modelo: nem
# chamada, nem reserva no teto), e o job.log ganha UMA linha
# MODELO_INDISPONIVEL por dia (UTC, o dia do teto); a marca do dia fica em
# <resolvedor>/modelo-indisponivel.
CLAUDE="${ORQ_TRIADOR_CLAUDE:-claude}"
SEM_MODELO=()
if ! command -v "$CLAUDE" >/dev/null 2>&1; then
  SEM_MODELO=(--sem-modelo)
  DIR_RES="${ORQ_RESOLVEDOR_DIR:-$HOME/.orq/resolvedor}"
  hoje="$(date -u +%Y-%m-%d)"
  if [ "$(cat "$DIR_RES/modelo-indisponivel" 2>/dev/null || true)" != "$hoje" ]; then
    printf '%s MODELO_INDISPONIVEL %s fora do PATH (%s): passadas de hoje so com extracao, sem modelo e sem teto\n' "$(agora)" "$CLAUDE" "$PATH"
    mkdir -p "$DIR_RES"
    printf '%s\n' "$hoje" > "$DIR_RES/modelo-indisponivel"
  fi
fi

printf '%s passada\n' "$(agora)"
bash "$KIT/scripts/orq" resolver ${SEM_MODELO[@]+"${SEM_MODELO[@]}"} "$@"
