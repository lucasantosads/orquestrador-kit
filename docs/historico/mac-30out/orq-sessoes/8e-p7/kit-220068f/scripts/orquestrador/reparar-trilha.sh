#!/usr/bin/env bash
# reparar-trilha.sh — REPARO ÚNICO de formato do events.log (peça 0e-a2).
#
# NÃO É REESCRITA DE HISTÓRIA: é correção de FORMATO. Cada linha sem timestamp é
# recolhida para a linha do evento anterior, com o `\n` escapado. O que a trilha
# afirmou continua afirmado, na mesma ordem e com os mesmos bytes; o que muda é
# onde as quebras de linha estão. Nada é descartado e nada é reescrito.
#
# Por que precisa existir, já que a peça 0e(a) fechou a torneira: os eventos JÁ
# GRAVADOS continuam quebrados, e enquanto estiverem, todo `grep`, `tail` e
# contagem sobre a trilha mente sobre eles — inclusive as leituras de que a peça
# 0d depende. Medido em 2026-09-05 13:40: 427 linhas para 243 eventos, 184 linhas
# órfãs. Em 2026-09-07: 670 linhas para 288 eventos.
#
# UMA VEZ SÓ, e por construção: sem linha órfã, o script não escreve nada, não
# anota nada e sai 0. Rodar de novo é no-op, não um segundo ANOTACAO.
#
# RECUSA (rc=2) se o arquivo COMEÇA com linha órfã: não há evento anterior para
# recolher, e inventar um timestamp para ela seria escrever no lugar da trilha.
# Nesse caso o caso é de humano, e o arquivo não é tocado.
#
# Uso: bash scripts/orquestrador/reparar-trilha.sh [arquivo]   (default: a trilha do config)

set -euo pipefail
ORQ_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$ORQ_LIB_DIR/lib.sh"

TRILHA="${1:-$EVENTS_FILE}"
TS_RE='^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T'

[ -s "$TRILHA" ] || { log "reparo: $TRILHA vazio ou ausente — nada a fazer"; exit 0; }

linhas_antes="$(wc -l < "$TRILHA" | tr -d ' ')"
eventos_antes="$(grep -cE "$TS_RE" "$TRILHA" || true)"
orfas="$(grep -cvE "$TS_RE" "$TRILHA" || true)"

if [ "$orfas" = 0 ]; then
  log "reparo: $TRILHA já está 100% timestampado ($eventos_antes eventos) — nada a reparar"
  exit 0
fi

if ! head -1 "$TRILHA" | grep -qE "$TS_RE"; then
  log "reparo: RECUSADO — $TRILHA começa com linha SEM timestamp, e não há evento anterior para"
  log "        recolhê-la. Inventar timestamp seria escrever no lugar da trilha. Caso de humano."
  exit 2
fi

# Cópia crua ANTES de qualquer escrita: o reparo afirma preservar bytes, e essa
# afirmação precisa ser conferível depois, não só no momento.
backup="$TRILHA.pre-reparo-$(date +%s)"
cp "$TRILHA" "$backup"

tmp="$(mktemp)"
# LC_ALL=C: byte a byte, sem interpretação de locale sobre o conteúdo.
LC_ALL=C awk '
  /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T/ {
    if (pendente) printf "\n"
    printf "%s", $0
    pendente = 1
    next
  }
  { printf "\\n%s", $0 }
  END { if (pendente) printf "\n" }
' "$TRILHA" > "$tmp"

linhas_depois="$(wc -l < "$tmp" | tr -d ' ')"
eventos_depois="$(grep -cE "$TS_RE" "$tmp" || true)"
orfas_depois="$(grep -cvE "$TS_RE" "$tmp" || true)"

# As duas invariantes, conferidas ANTES de trocar o arquivo. Reparo que não
# consegue provar que preservou os eventos não é reparo, é perda.
if [ "$eventos_depois" != "$eventos_antes" ] || [ "$orfas_depois" != 0 ]; then
  rm -f "$tmp"
  log "reparo: ABORTADO — eventos $eventos_antes -> $eventos_depois, órfãs restantes $orfas_depois."
  log "        Arquivo original INTACTO (cópia em $backup)."
  exit 1
fi

mv -f "$tmp" "$TRILHA"
log "reparo: $linhas_antes -> $linhas_depois linhas · $eventos_antes eventos (inalterado) · $orfas órfãs recolhidas"
log "        cópia crua do antes: $backup"

# A anotação é o ÚLTIMO passo, e depois da contagem: assim `eventos_depois` é
# comparável com `eventos_antes` sem descontar o próprio registro do reparo.
anotacao "reparo de formato do events.log: $orfas linha(s) sem timestamp recolhida(s) para o evento anterior, com \\n escapado; $eventos_antes eventos preservados; copia crua em $(basename "$backup")"
echo "eventos_antes=$eventos_antes eventos_depois=$eventos_depois recolhidas=$orfas backup=$backup"
