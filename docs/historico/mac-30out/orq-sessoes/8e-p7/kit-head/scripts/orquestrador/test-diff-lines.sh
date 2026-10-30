#!/usr/bin/env bash
# Prova o contador DIFF_LINES do executor (gate DIFF-CAP). Porte do comarka
# 6307912 (02/10): lá o executor contava `wc -l` do diff cru (cabeçalho, @@ e
# contexto inclusos) e o 723 attempt-2 reprovou com "1050 linhas > 900" quando
# o diff real era 650 (491 inserções + 159 deleções no diff.stat). O kit já
# media por numstat; este teste pina a regra para ela não regredir.
#
# Cobre:
#   A. DIFF_LINES = inserções + deleções, ignorando contexto e cabeçalhos.
#   B. arquivo binário (numstat "-") conta zero.
#   C. diff vazio dá 0, nunca string vazia.
#
# Não chama claude: extrai a linha `DIFF_LINES=` REAL do executor.sh e a avalia
# num repo-fixture sob mktemp. Uso: bash <este arquivo>
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PASS=0; FAIL=0
ok()  { printf '  ✓ %s\n' "$1"; PASS=$((PASS+1)); }
bad() { printf '  ✗ %s\n' "$1"; FAIL=$((FAIL+1)); }

LINHA="$(grep -E '^[[:space:]]*DIFF_LINES="\$\(git -C "\$wt" diff "\$base"\.\.\.HEAD --numstat' "$HERE/executor.sh" | head -1)"
if [ -z "$LINHA" ]; then
  bad "linha DIFF_LINES= com numstat não encontrada no executor.sh"
  echo "PASS=$PASS FAIL=$FAIL"; exit 1
fi

wt="$(mktemp -d)"
trap 'rm -rf "$wt"' EXIT
git -C "$wt" init -q
git -C "$wt" config user.email t@t; git -C "$wt" config user.name t
seq 1 50 > "$wt/a.txt"
git -C "$wt" add a.txt; git -C "$wt" commit -qm base
base="$(git -C "$wt" rev-parse HEAD)"

conta() { local DIFF_LINES=0; eval "$LINHA"; echo "$DIFF_LINES"; }

echo "C. diff vazio"
[ "$(conta)" = "0" ] && ok "diff vazio = 0" || bad "diff vazio deu '$(conta)'"

echo "A. inserções + deleções"
# 3 linhas trocadas (3 ins + 3 del) + 4 novas no fim + arquivo novo de 5 linhas
# = 3+3+4+5 = 15. O diff cru tem cabeçalhos e contexto e passa de 15 linhas.
sed -i.bak -e 's/^10$/dez/' -e 's/^20$/vinte/' -e 's/^30$/trinta/' "$wt/a.txt" && rm "$wt/a.txt.bak"
printf 'x\ny\nz\nw\n' >> "$wt/a.txt"
seq 1 5 > "$wt/b.txt"
git -C "$wt" add a.txt b.txt; git -C "$wt" commit -qm mudanca
v="$(conta)"; cru="$(git -C "$wt" diff "$base"...HEAD | wc -l | tr -d ' ')"
[ "$v" = "15" ] && ok "DIFF_LINES = 15 (diff cru tem $cru linhas)" || bad "DIFF_LINES esperado 15, veio '$v' (cru $cru)"

echo "B. binário conta zero"
printf '\x00\x01\x02\x03' > "$wt/c.bin"
git -C "$wt" add c.bin; git -C "$wt" commit -qm bin
v="$(conta)"
[ "$v" = "15" ] && ok "binário não soma (DIFF_LINES continua 15)" || bad "DIFF_LINES esperado 15 com binário, veio '$v'"

echo
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
