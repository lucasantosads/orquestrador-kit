#!/usr/bin/env bash
# orq-pause.sh [motivo]  -> pausa a fila (sentinela em disco)
# orq-pause.sh --off     -> retoma
# orq-pause.sh --status  -> mostra o estado
#
# PORTE (ORQ-02): vindo de comarka-os, sem adaptação. O caminho já era relativo
# ao próprio script; o sentinela é o mesmo PAUSA_FILE que o lib.sh lê.
set -euo pipefail
F="$(cd "$(dirname "$0")/../.." && pwd)/docs/fila/.orq-pause"
if [ "${1:-}" = "--off" ]; then
  rm -f "$F" && echo "fila RETOMADA (sentinela removido)"
elif [ "${1:-}" = "--status" ]; then
  [ -f "$F" ] && echo "PAUSADA: $(cat "$F")" || echo "ativa (sem pausa)"
else
  printf '%s | %s\n' "$(date '+%Y-%m-%d %H:%M')" "${1:-pausa manual}" > "$F"
  echo "fila PAUSADA: $(cat "$F")"
  echo "obs: nao interrompe o ticket em curso; para entre tickets."
fi
