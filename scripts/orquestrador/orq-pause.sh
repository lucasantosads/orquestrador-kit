#!/usr/bin/env bash
# orq-pause.sh [motivo]  -> pausa a fila (sentinela em disco)
# orq-pause.sh --off     -> retoma: remove AS DUAS sentinelas
# orq-pause.sh --status  -> lista cada sentinela presente, com o conteúdo
#
# PORTE (ORQ-02): vindo de comarka-os. O sentinela escrito aqui é o PAUSA_FILE
# do lib.sh (docs/fila/.orq-pause, na raiz de execução).
#
# Ticket 514 (23/09/2026): a pausa vale com QUALQUER uma de duas sentinelas
# (lib.sh, pausa_ativa): o `pausar_file` do config (docs/fila/PAUSAR, no checkout
# principal, que o `orq pausar` escreve) e o PAUSA_FILE. O --off só removia o
# PAUSA_FILE: com docs/fila/PAUSAR presente ele dizia "fila RETOMADA" e a fila
# seguia pausada. Agora os caminhos vêm do lib.sh, a mesma fonte do pausa_ativa,
# e --off/--status tratam os dois. No kit, pausar e retomar por aqui também
# gravam PAUSA/RETOMADA na trilha (K12-F), como `orq pausar/retomar` e o painel.
set -euo pipefail
# shellcheck source=./lib.sh
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

rel() { local p="${1#"$MAIN_CHECKOUT"/}"; printf '%s' "${p#"$ROOT"/}"; }

if [ "${1:-}" = "--off" ]; then
  n=0
  ini="$(pausa_inicio_epoch 2>/dev/null || true)"
  for f in "$CFG_PAUSAR_FILE" "$PAUSA_FILE"; do
    if [ -f "$f" ]; then
      rm -f "$f"
      echo "removida: $(rel "$f")"
      n=$((n + 1))
    fi
  done
  if [ "$n" = 0 ]; then
    echo "fila já estava ativa (nenhuma sentinela presente)"
  else
    # A mesma linha da trilha que `orq retomar` e o painel gravam (K12-F).
    retomada_registrar terminal "$ini"
    echo "fila RETOMADA ($n sentinela(s) removida(s))"
  fi
elif [ "${1:-}" = "--status" ]; then
  n=0
  for f in "$CFG_PAUSAR_FILE" "$PAUSA_FILE"; do
    if [ -f "$f" ]; then
      echo "PAUSADA: $(rel "$f"): $(cat "$f")"
      n=$((n + 1))
    fi
  done
  [ "$n" = 0 ] && echo "ativa (sem pausa)"
  exit 0
else
  printf '%s | %s\n' "$(date '+%Y-%m-%d %H:%M')" "${1:-pausa manual}" > "$PAUSA_FILE"
  pausa_registrar terminal "${1:-pausa manual}"
  echo "fila PAUSADA: $(cat "$PAUSA_FILE")"
  echo "obs: nao interrompe o ticket em curso; para entre tickets."
fi
