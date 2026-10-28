#!/usr/bin/env bash
# test-instavel-recorrente.sh: o 3º registro do mesmo teste instável vira uma
# decisão pendente (etapa L11, porte do 9ee36a9 do Comarka SEM o rascunho de
# ticket, decisão do Lucas de 28/10).
#
# No Comarka o rascunho de runs/instabilidade/ saiu em 19/10 13:40 e o mesmo
# test/estado-plano-orfas.test.ts foi registrado mais 25 vezes até 28/10: o
# rascunho sozinho não mudou nada. Aqui, registra_instavel (lib.sh) anexa em
# runs/instaveis.log e, no 3º registro do mesmo arquivo (igualdade exata), põe
# UMA linha em docs/fila/decisoes-pendentes.md e o evento INSTAVEL_RECORRENTE.
#   A · 2 registros do mesmo arquivo: nada.
#   B · 3º registro: uma linha (arquivo e os 3 registros), commitada, e o evento.
#   C · 4º registro: segue uma linha e um evento; o log tem 4.
#   D · 3 registros de arquivos diferentes: nada.
#   E · a.test.ts x2, a.test.tsx x1 e xa.test.ts x1: nada (comparação exata).
#   F · runs/instaveis.log sem escrita: devolve 0.
#   G · nenhum rascunho de ticket em lugar nenhum.
#
# Uso: bash scripts/orquestrador/test-instavel-recorrente.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP_RAIZ="$(dirname "$ORQ_EXEC_ROOT")"
source "$AQUI/test-fixture-executor.sh"
trap 'chmod -R u+w "${FXE:-/nonexistent}" 2>/dev/null; fxe_limpa; rm -rf "$TMP_RAIZ"' EXIT

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

A=test/estado-plano-orfas.test.ts
novo() { fxe_limpa; FXE_ID=901; fxe_novo; R="$FXE/repo"; LOGF="$R/docs/fila/runs/instaveis.log"; DEC="$R/docs/fila/decisoes-pendentes.md"; }
# reg <id> <arquivo>... : uma chamada de registra_instavel por arquivo, com o lib.sh do fixture.
reg() {
  local id="$1"; shift
  ( cd "$R" && ORQ_EXEC_ROOT="$R" bash -c 'source scripts/orquestrador/lib.sh; set +e; id="$1"; shift
      for a in "$@"; do registra_instavel "$id" "$a"; echo "rc=$?"; done' _ "$id" "$@" ) >> "$FXE/reg.out" 2>&1
}
nlinhas() { { cat "$DEC" 2>/dev/null || true; } | grep -c "INSTÁVEL RECORRENTE" || true; }
nev()     { { cat "$R/docs/fila/runs/events.log" 2>/dev/null || true; } | grep -c " INSTAVEL_RECORRENTE " || true; }
nlog()    { awk -F'\t' -v a="$1" '$3 == a {c++} END {print c+0}' "$LOGF" 2>/dev/null; }

echo "== A · 2 registros do mesmo arquivo =="
novo
reg 1001 "$A"; reg 1002 "$A"
[ "$(nlog "$A")" = 2 ] && ok "2 linhas no instaveis.log" || falha "A log: $(nlog "$A")"
[ "$(nlinhas)" = 0 ] && [ "$(nev)" = 0 ] && ok "nem decisão pendente nem evento" || falha "A: linhas=$(nlinhas) eventos=$(nev)"

echo "== B · 3º registro =="
reg 1003 "$A"
[ "$(nlinhas)" = 1 ] && ok "uma linha em decisoes-pendentes.md" || falha "B: $(nlinhas) linhas: $(tail -2 "$DEC")"
l="$(grep "INSTÁVEL RECORRENTE" "$DEC" 2>/dev/null)"
r=0; for t in 1001 1002 1003; do case "$l" in *" $t"*) ;; *) r=1 ;; esac; done
case "$l" in *"| $A |"*) ;; *) r=1 ;; esac
[ "$r" = 0 ] && ok "a linha tem o arquivo e os 3 registros" || falha "B linha: $l"
git -C "$R" diff --quiet -- docs/fila/decisoes-pendentes.md && ok "commitada" || falha "B: decisoes-pendentes.md sujo"
case "$(grep ' INSTAVEL_RECORRENTE ' "$R/docs/fila/runs/events.log" 2>/dev/null)" in
  *" 1003 INSTAVEL_RECORRENTE arquivo=$A registros=3"*) ok "evento INSTAVEL_RECORRENTE" ;;
  *) falha "B evento: $(grep INSTAVEL "$R/docs/fila/runs/events.log" 2>/dev/null)" ;;
esac

echo "== C · 4º registro =="
reg 1004 "$A"
[ "$(nlog "$A")" = 4 ] && [ "$(nlinhas)" = 1 ] && [ "$(nev)" = 1 ] && ok "log 4, uma linha, um evento" || falha "C: log=$(nlog "$A") linhas=$(nlinhas) eventos=$(nev)"

echo "== D · 3 registros de arquivos diferentes =="
novo
reg 1 test/x.test.ts test/y.test.ts test/z.test.ts
[ "$(nlinhas)" = 0 ] && [ "$(nev)" = 0 ] && ok "nada" || falha "D: linhas=$(nlinhas) eventos=$(nev)"

echo "== E · a.test.ts x2, a.test.tsx x1, xa.test.ts x1 =="
novo
reg 1 test/a.test.ts test/a.test.tsx test/a.test.ts test/xa.test.ts
[ "$(nlinhas)" = 0 ] && [ "$(nev)" = 0 ] && ok "nada (comparação exata)" || falha "E: linhas=$(nlinhas) eventos=$(nev)"

echo "== F · instaveis.log sem escrita =="
novo
: > "$LOGF"; chmod 444 "$LOGF"
: > "$FXE/reg.out"; reg 1 "$A" "$A" "$A"
chmod 644 "$LOGF"
[ "$(grep -c '^rc=0$' "$FXE/reg.out")" = 3 ] && ok "devolve 0 nas 3 chamadas" || falha "F: $(cat "$FXE/reg.out")"

echo "== G · nenhum rascunho de ticket =="
novo
reg 1 "$A" "$A" "$A"
[ -z "$(find "$R/docs" -name 'instavel-*' -o -path '*instabilidade*' 2>/dev/null)" ] \
  && [ "$(git -C "$R" status --porcelain -- docs/fila | grep -v 'decisoes-pendentes' | grep -c '\.md$')" = 0 ] \
  && ok "nem runs/instabilidade/ nem ticket novo na fila" || falha "G: $(find "$R/docs" -name 'instavel-*')"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
