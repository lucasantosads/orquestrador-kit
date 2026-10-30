#!/usr/bin/env bash
# test-sem-cor.sh — critérios e gates rodam sem cor (etapa 7d-1b, peça 5).
#
# O vitest 2.x colore a saída quando FORCE_COLOR (qualquer valor, inclusive 0)
# ou CI estão no ambiente e NO_COLOR não está (tinyrainbow). Colorido, o placar
# chega como "Tests \e[22m \e[1m\e[32m2 passed", e um `grep -E 'Tests +[0-9]+
# passed'` DENTRO do comando não casa: o strip_ansi do executor só limpa a saída
# depois que o pipeline inteiro já rodou. Foi o 016 do conteudos-infinitos
# (vitest 4 com cor).
#
# O run_criterios já exportava NO_COLOR=1 (executor.sh:454); os GATES herdavam
# o ambiente de quem chamou o executor. Agora os dois rodam com NO_COLOR=1 e
# FORCE_COLOR=0 — NO_COLOR desliga o vitest; FORCE_COLOR=0 desliga quem segue o
# supports-color/chalk, que ignora NO_COLOR.
#
# Executor DE VERDADE (test-fixture-executor.sh), vitest REAL do node_modules do
# checkout, rodando um projeto de dois testes num tmp; o ambiente de quem chama
# tem FORCE_COLOR=1:
#   1 · o gate `vitest run | grep -cE 'Tests +[0-9]+ passed'` passa;
#   2 · o critério com o mesmo pipeline, espera 1, passa;
#   3 · controle: o mesmo vitest com FORCE_COLOR=1 e sem NO_COLOR colore mesmo
#       (senão o caso não prova nada).
#
# Uso: bash scripts/orquestrador/test-sem-cor.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP_RAIZ="$(dirname "$ORQ_EXEC_ROOT")"
source "$AQUI/test-fixture-executor.sh"
trap 'fxe_limpa; rm -rf "$TMP_RAIZ"' EXIT

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

VITEST="$FXE_NM/.bin/vitest"
[ -x "$VITEST" ] || { echo "ERRO: $VITEST ausente — o teste precisa do vitest do checkout"; exit 2; }

fxe_novo '.max_retries = 0'
VT="$FXE/vt"
mkdir -p "$VT"
printf "import { it, expect } from 'vitest'\nit('a', () => expect(1).toBe(1))\nit('b', () => expect(2).toBe(2))\n" > "$VT/a.test.ts"
echo 'export default {}' > "$VT/vitest.config.mjs"
PIPE="cd '$VT' && '$VITEST' run 2>&1 | grep -cE 'Tests +[0-9]+ passed'"

echo "== 3 · controle: FORCE_COLOR=1 sem NO_COLOR colore o placar do vitest =="
cru="$(cd "$VT" && env -u NO_COLOR FORCE_COLOR=1 "$VITEST" run 2>&1 | grep -a 'Tests ' || true)"
case "$cru" in
  *$'\e['*) ok "o placar sai com escape ANSI" ;;
  *) falha "o vitest não coloriu com FORCE_COLOR=1 — o caso não prova nada: $cru" ;;
esac

# O gate de testes do fixture passa a ser o pipeline que lê o placar.
fxe_gate test "$PIPE"
# O critério do ticket 901 passa a ser o mesmo pipeline, espera 1.
f="$FXE/repo/docs/fila/$FXE_ID-t.md"
awk '/^```json$/{f=1;next} f&&/^```$/{exit} f' "$f" \
  | jq --arg c "$PIPE" '.criterios_aceite[0].cmd = $c | .criterios_aceite[0].espera = "1"' > "$FXE/ticket.json" \
  && { printf '# %s\n\n```json\n' "$FXE_ID"; cat "$FXE/ticket.json"; printf '```\n'; } > "$f"
grep -q '"espera": "1"' "$f" || { echo "ERRO: não consegui trocar o critério do ticket"; exit 2; }
git -C "$FXE/repo" commit -qam "fixture: critério lê o placar do vitest"

echo
echo "== 1 e 2 · executor com FORCE_COLOR=1 no ambiente: gate e critério leem o placar sem cor =="
export FORCE_COLOR=1
unset NO_COLOR
fxe_roda
unset FORCE_COLOR
att="$(dirname "$(ls "$FXE/repo/docs/fila/runs/$FXE_ID"/attempt-*/gates.txt 2>/dev/null | head -1)")"
if [ ! -f "$att/gates.txt" ]; then
  falha "o executor não chegou aos gates: $(tail -5 "$FXE/saida")"
else
  grep -qE '^ok +test' "$att/gates.txt" \
    && ok "gate 'test' aprovado com o placar lido por grep" \
    || falha "gate 'test' reprovado: $(grep -E '^(ok|FALHA)' "$att/gates.txt" | tr '\n' ' ')"
  awk '/^### o arquivo existe/{f=1} f && /^saida:/{print; exit}' "$att/criterios.txt" | grep -qx 'saida: 1' \
    && ok "critério: saída '1' (o placar casou)" \
    || falha "critério: $(awk '/^### /{f=1} f && /^saida:/{print; exit}' "$att/criterios.txt")"
fi

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
