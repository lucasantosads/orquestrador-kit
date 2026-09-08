#!/usr/bin/env bash
# test-instalar.sh — os três casos do `instalar.sh --verificar` (peça K5).
#
#   (a) contra o repo de FIXTURE recém-instanciado  -> idêntico, rc 0
#   (b) contra uma CÓPIA do fixture com um byte a mais em lib.sh
#                                                    -> `diferente ... lib.sh`, rc 1
#   (c) contra ~/Projetos/conteudos-infinitos (SÓ LEITURA)
#                                                    -> o resultado real, seja qual for
#   (d) contra uma CÓPIA do fixture com um byte a mais em
#       scripts/roadmap/lint-mapa.py                 -> `diferente ... lint-mapa.py`, rc 1
#       (peça K5b: scripts/roadmap/ É motor vendorizado — `orq mapa lint` roda
#        `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT,
#        scripts/orq:226 — e sem este caso um lint desatualizado passa por
#        "idêntico".)
#
# (c) não é assertivo por decisão: o checkout do CI é o repo de verdade de outra
# pessoa, e o kit não manda nele. Diferença ali é ACHADO — vira linha de
# relatório e, se for o caso, peça —, nunca falha deste script. O que ele
# imprime é a saída crua, para ser colada.
#
# Uso: bash scripts/kit/test-instalar.sh

set -uo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CI_CHECKOUT="${ORQ_CI_CHECKOUT:-$HOME/Projetos/conteudos-infinitos}"

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

FX="$(bash "$KIT/scripts/kit/fixture.sh")" || { printf 'ERRO: fixture.sh falhou\n' >&2; exit 2; }
COPIA="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
COPIA_ROADMAP="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1; rm -rf "$COPIA" "$COPIA_ROADMAP"' EXIT

# --- (a) ---------------------------------------------------------------------
echo "== (a) fixture recém-instanciado =="
saida="$(bash "$KIT/instalar.sh" --verificar "$FX" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
printf '%s' "$saida" | grep -q "idêntico ao kit $(cat "$KIT/VERSAO")" \
  && ok "diz 'idêntico ao kit <VERSAO>'" || falha "não disse 'idêntico ao kit <VERSAO>'"

# --- (b) ---------------------------------------------------------------------
echo
echo "== (b) cópia do fixture com UM byte a mais em lib.sh =="
mkdir -p "$COPIA/repo"
cp -R "$FX/." "$COPIA/repo/"
# Um byte, literalmente: o menor estrago que ainda é estrago.
printf 'x' >> "$COPIA/repo/scripts/orquestrador/lib.sh"
saida="$(bash "$KIT/instalar.sh" --verificar "$COPIA/repo" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
printf '%s' "$saida" | grep -qE '^diferente +scripts/orquestrador/lib\.sh$' \
  && ok "lista 'diferente scripts/orquestrador/lib.sh'" || falha "não listou o lib.sh como diferente"
# NEGATIVO: um byte em lib.sh não pode arrastar mais nada para a lista.
n="$(printf '%s\n' "$saida" | grep -cE '^(diferente|só no kit|só no repo) ')"
[ "$n" = 1 ] && ok "exatamente 1 diferença, não uma cascata" || falha "$n diferenças (esperava 1)"

# --- (d) · K5b ---------------------------------------------------------------
echo
echo "== (d) cópia do fixture com UM byte a mais em scripts/roadmap/lint-mapa.py =="
mkdir -p "$COPIA_ROADMAP/repo"
cp -R "$FX/." "$COPIA_ROADMAP/repo/"
printf '#x\n' >> "$COPIA_ROADMAP/repo/scripts/roadmap/lint-mapa.py"
saida="$(bash "$KIT/instalar.sh" --verificar "$COPIA_ROADMAP/repo" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
printf '%s' "$saida" | grep -qE '^diferente +scripts/roadmap/lint-mapa\.py$' \
  && ok "lista 'diferente scripts/roadmap/lint-mapa.py'" || falha "não listou o lint-mapa.py como diferente"
n="$(printf '%s\n' "$saida" | grep -cE '^(diferente|só no kit|só no repo) ')"
[ "$n" = 1 ] && ok "exatamente 1 diferença, não uma cascata" || falha "$n diferenças (esperava 1)"

# --- (c) ---------------------------------------------------------------------
echo
echo "== (c) $CI_CHECKOUT (SÓ LEITURA — o resultado é achado, não gate) =="
if [ -d "$CI_CHECKOUT" ]; then
  saida="$(bash "$KIT/instalar.sh" --verificar "$CI_CHECKOUT" 2>&1)"; rc=$?
  printf '%s\n' "$saida" | sed 's/^/  | /'
  printf '  (rc %s — informativo)\n' "$rc"
else
  printf '  (pulado: %s não existe nesta máquina)\n' "$CI_CHECKOUT"
fi

echo
[ "$FALHAS" = 0 ] && { echo "TODOS OS CHECKS PASSARAM"; exit 0; }
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
