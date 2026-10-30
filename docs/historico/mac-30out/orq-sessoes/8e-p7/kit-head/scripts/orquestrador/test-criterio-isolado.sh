#!/usr/bin/env bash
# test-criterio-isolado.sh — o critério roda num bash NOVO, sem herdar o
# `set -euo pipefail` do executor (etapa 7f-b6, peça P0).
#
# O run_criterios rodava `eval "$cmd"` num subshell do executor, e o subshell
# herda as opções do pai (executor.sh:23, `set -euo pipefail`). Um critério
# escrito para o shell comum mudava de sentido lá dentro:
#   - `${X}` de variável não definida aborta com "unbound variable" (-u);
#   - `n=$(grep -c ... arq | tr ...) && echo` sem ocorrência: o grep sai 1, o
#     pipefail faz o pipeline sair 1, e o `&&` corta o echo que imprimiria o 0.
#   (O -e não age: o eval estava dentro de uma lista `&&`, onde o -e é ignorado.)
# Foi o 933, o 934b e o 935 do comarka-operacional em 12/10: "line 231: b:
# unbound variable" no lugar da saída do critério. O conserto do Comarka é o
# 31104d0; este é o mesmo conserto no motor do kit.
#
# Executor DE VERDADE (test-fixture-executor.sh), um ticket com seis critérios:
#   1 · variável não definida: imprime a expansão vazia, não aborta;
#   2 · `n=$(grep -c ... | tr -d ' ') && echo` sem ocorrência: imprime n=0,
#       não some no pipefail;
#   3 · BASE_REF continua chegando ao critério (staging-auto);
#   4 · contra-teste: critério que deve falhar continua falhando (grep -c 0, espera 1);
#   5 · contra-teste: `test -n` de variável vazia continua falhando;
#   6 · comando inexistente continua rc 127 → "NÃO EXECUTADO" (ambiente).
#
# Uso: bash scripts/orquestrador/test-criterio-isolado.sh

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

fxe_novo '.max_retries = 0'
f="$FXE/repo/docs/fila/$FXE_ID-t.md"
CRITERIOS="$(jq -n '[
  {tipo: "alvo", descricao: "c1 variavel vazia",
   cmd: "test -f src/a.ts && echo \"v=${NAO_DEFINIDA_7F6}fim\"", espera: "v=fim"},
  {tipo: "alvo", descricao: "c2 grep -c sem ocorrencia",
   cmd: "n=$(grep -c NAO_TEM_ISSO src/a.ts | tr -d \" \") && echo \"n=$n\"", espera: "n=0"},
  {tipo: "alvo", descricao: "c3 base ref",
   cmd: "echo \"base=$BASE_REF\"", espera: "base=staging-auto"},
  {tipo: "alvo", descricao: "c4 contra grep -c",
   cmd: "grep -c NAO_TEM_ISSO src/a.ts", espera: "1"},
  {tipo: "alvo", descricao: "c5 contra test -n",
   cmd: "test -n \"${NAO_DEFINIDA_7F6:-}\" && echo ok", espera: "ok"},
  {tipo: "alvo", descricao: "c6 comando inexistente",
   cmd: "comando-inexistente-7f6", espera: "ok"}]')"
awk '/^```json$/{f=1;next} f&&/^```$/{exit} f' "$f" \
  | jq --argjson c "$CRITERIOS" '.criterios_aceite = $c' > "$FXE/ticket.json" \
  && { printf '# %s\n\n```json\n' "$FXE_ID"; cat "$FXE/ticket.json"; printf '```\n'; } > "$f"
grep -q 'c6 comando inexistente' "$f" || { echo "ERRO: não consegui trocar os critérios do ticket"; exit 2; }
git -C "$FXE/repo" commit -qam "fixture: seis critérios"

fxe_roda
att="$(dirname "$(ls "$FXE/repo/docs/fila/runs/$FXE_ID"/attempt-*/criterios.txt 2>/dev/null | head -1)")"
[ -f "$att/criterios.txt" ] || { echo "ERRO: o executor não chegou aos critérios: $(tail -5 "$FXE/saida")"; exit 2; }

saida_de() { awk -v d="### $1" '$0 == d {f=1; next} f && /^saida:/ {sub(/^saida: ?/, ""); print; exit}' "$att/criterios.txt"; }
passou()   { ! grep -q "critério FALHA: $1 " "$FXE/saida"; }

echo "== 1 · variável não definida não aborta o critério =="
s="$(saida_de 'c1 variavel vazia')"
[ "$s" = "v=fim" ] && passou 'c1 variavel vazia' && ok "saída 'v=fim'" || falha "c1: saída '$s'"

echo "== 2 · grep -c sem ocorrência imprime 0 =="
s="$(saida_de 'c2 grep -c sem ocorrencia')"
[ "$s" = "n=0" ] && passou 'c2 grep -c sem ocorrencia' && ok "saída 'n=0'" || falha "c2: saída '$s'"

echo "== 3 · BASE_REF chega ao critério =="
s="$(saida_de 'c3 base ref')"
[ "$s" = "base=staging-auto" ] && ok "saída '$s'" || falha "c3: saída '$s'"

echo "== 4 · contra-teste: grep -c 0 contra espera 1 continua falhando =="
s="$(saida_de 'c4 contra grep -c')"
[ "$s" = "0" ] && ! passou 'c4 contra grep -c' && ok "saída '0' e critério FALHA" || falha "c4: saída '$s'"

echo "== 5 · contra-teste: test -n de variável vazia continua falhando =="
! passou 'c5 contra test -n' && ok "critério FALHA" || falha "c5 passou"

echo "== 6 · comando inexistente continua NÃO EXECUTADO (rc 127) =="
grep -q 'critério NÃO EXECUTADO (rc=127): c6 comando inexistente' "$FXE/saida" \
  && ok "rc 127 visto" || falha "c6: $(grep 'c6' "$FXE/saida" | tr '\n' ' ')"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
