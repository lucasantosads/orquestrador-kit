#!/usr/bin/env bash
# test-orq-pause.sh — ticket 514 (24/09/2026): o orq-pause.sh trata AS DUAS
# sentinelas de pausa, e o STATUS nomeia a que está ativa.
#
# A pausa vale com qualquer uma de duas sentinelas (lib.sh, pausa_ativa): o
# `pausar_file` do config (docs/fila/PAUSAR) e o PAUSA_FILE (docs/fila/.orq-pause).
# O --off só removia o .orq-pause: com PAUSAR presente ele dizia "fila RETOMADA"
# e a fila seguia pausada. O STATUS dizia só "pausado".
#
# CHECKOUT SINTÉTICO fora de git em diretório temporário (o lib.sh cai em
# MAIN_CHECKOUT = ROOT = ORQ_EXEC_ROOT), com o 000-config.json REAL. Nenhum
# modelo, nenhuma escrita fora do diretório temporário.
#
#   1 · as duas presentes: --status lista as duas, com o conteúdo;
#   2 · --off remove as duas, diz quais removeu, e pausa_ativa fica falso;
#   3 · só PAUSAR presente (o caso que falhava): --off remove PAUSAR;
#   4 · pausa_motivo devolve caminho + conteúdo;
#   5 · nenhuma presente: --status "ativa (sem pausa)", --off não inventa remoção;
#   6 · local-loop pausado: STATUS.md com "MOTIVO   pausado (docs/fila/PAUSAR: ...)";
#   7 · (kit, K12-F) pausar/retomar pelo orq-pause.sh gravam PAUSA/RETOMADA na trilha.
#   (O `orq retomar` do kit NÃO apaga o legado: o scripts/orq só escreve o
#   pausar_file, e o legado vira PAUSAR pelo --migrar, migrar_pausa.)
#
# Uso: bash scripts/orquestrador/test-orq-pause.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# (idioma do kit, peça 7b-9: o checkout sai do git, nunca de "$AQUI/../..")
CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --show-toplevel 2>/dev/null || true)"

FALHAS=0
ok()   { printf '  ok   %s\n' "$*"; }
falha(){ printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS+1)); }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/docs/fila/runs" "$TMP/node_modules/.bin"
cp "$CHECKOUT_REAL/docs/fila/000-config.json" "$TMP/docs/fila/000-config.json"
ln -s "$CHECKOUT_REAL/node_modules/.bin/tsx" "$TMP/node_modules/.bin/tsx"

PAUSAR="$TMP/$(jq -r '.pausar_file' "$TMP/docs/fila/000-config.json")"
ORQ_PAUSE="$TMP/docs/fila/.orq-pause"

pausa() { ORQ_EXEC_ROOT="$TMP" ORQ_TESTE=1 bash "$AQUI/orq-pause.sh" "$@" 2>&1; }
no_lib() { ORQ_EXEC_ROOT="$TMP" ORQ_TESTE=1 bash -c "source '$AQUI/lib.sh'; set +e; $1" 2>&1; }

echo "== 1 · as duas sentinelas presentes: --status lista as duas =="
echo "2026-09-24 10:00 | via orq pausar" > "$PAUSAR"
echo "2026-09-24 10:01 | via orq-pause.sh" > "$ORQ_PAUSE"
out="$(pausa --status)"
printf '%s\n' "$out" | sed 's/^/    /'
[ "$(printf '%s\n' "$out" | grep -c '^PAUSADA: ')" = 2 ] && ok "duas linhas PAUSADA" || falha "esperava duas linhas PAUSADA"
printf '%s' "$out" | grep -qF 'docs/fila/PAUSAR: 2026-09-24 10:00 | via orq pausar' \
  && ok "PAUSAR com caminho e conteúdo" || falha "PAUSAR ausente do --status"
printf '%s' "$out" | grep -qF 'docs/fila/.orq-pause: 2026-09-24 10:01 | via orq-pause.sh' \
  && ok ".orq-pause com caminho e conteúdo" || falha ".orq-pause ausente do --status"

echo "== 4 · pausa_motivo devolve caminho + conteúdo das duas =="
m="$(no_lib pausa_motivo)"
echo "    $m"
[ "$m" = "docs/fila/PAUSAR: 2026-09-24 10:00 | via orq pausar; docs/fila/.orq-pause: 2026-09-24 10:01 | via orq-pause.sh" ] \
  && ok "pausa_motivo nomeia as duas" || falha "pausa_motivo inesperado: $m"

echo "== 2 · --off remove as duas e pausa_ativa fica falso =="
out="$(pausa --off)"
printf '%s\n' "$out" | sed 's/^/    /'
printf '%s' "$out" | grep -qF 'removida: docs/fila/PAUSAR' && ok "diz que removeu PAUSAR" || falha "não citou PAUSAR"
printf '%s' "$out" | grep -qF 'removida: docs/fila/.orq-pause' && ok "diz que removeu .orq-pause" || falha "não citou .orq-pause"
[ ! -e "$PAUSAR" ] && [ ! -e "$ORQ_PAUSE" ] && ok "os dois arquivos sumiram" || falha "sobrou sentinela"
no_lib 'pausa_ativa && echo ATIVA || echo LIVRE' | grep -qx LIVRE && ok "pausa_ativa falso" || falha "pausa_ativa ainda verdadeiro"

echo "== 3 · só PAUSAR presente (o caso que falhava): --off remove PAUSAR =="
echo "2026-09-24 11:00 | so PAUSAR" > "$PAUSAR"
no_lib 'pausa_ativa && echo ATIVA || echo LIVRE' | grep -qx ATIVA && ok "pausado por PAUSAR antes do --off" || falha "PAUSAR não pausa"
out="$(pausa --off)"
printf '%s\n' "$out" | sed 's/^/    /'
[ ! -e "$PAUSAR" ] && ok "PAUSAR removido" || falha "PAUSAR continua lá"
printf '%s' "$out" | grep -qF 'fila RETOMADA (1 sentinela(s) removida(s))' && ok "conta uma removida" || falha "contagem errada"
no_lib 'pausa_ativa && echo ATIVA || echo LIVRE' | grep -qx LIVRE && ok "pausa_ativa falso" || falha "fila segue pausada"

echo "== 5 · nenhuma presente =="
out="$(pausa --status)"
[ "$out" = "ativa (sem pausa)" ] && ok "--status: ativa (sem pausa)" || falha "--status inesperado: $out"
out="$(pausa --off)"
printf '%s' "$out" | grep -qF 'nenhuma sentinela presente' && ok "--off não inventa remoção" || falha "--off inesperado: $out"
printf '%s' "$out" | grep -q 'removida:' && falha "--off disse que removeu algo" || ok "nenhuma linha 'removida:'"

echo "== 6 · local-loop pausado: o STATUS nomeia a sentinela =="
echo "2026-09-24 12:00 | pausa do teste" > "$PAUSAR"
ORQ_EXEC_ROOT="$TMP" ORQ_TESTE=1 bash "$AQUI/local-loop.sh" > "$TMP/local-loop.out" 2>&1
st="$(cat "$TMP/docs/fila/runs/STATUS.md" 2>/dev/null || true)"
printf '%s\n' "$st" | grep -E '^(ESTADO|MOTIVO)' | sed 's/^/    /'
printf '%s' "$st" | grep -qxF 'MOTIVO   pausado (docs/fila/PAUSAR: 2026-09-24 12:00 | pausa do teste)' \
  && ok "MOTIVO com a sentinela e o conteúdo" \
  || { falha "STATUS sem a sentinela"; sed 's/^/    | /' "$TMP/local-loop.out" | tail -15; }
rm -f "$PAUSAR"

echo "== 7 · (kit, K12-F) pausar e retomar pelo orq-pause.sh gravam PAUSA e RETOMADA na trilha =="
EV="$TMP/docs/fila/runs/events.log"
: > "$EV"
pausa "pausa do caso 7" >/dev/null
grep -q ' --- PAUSA .*por=terminal' "$EV" && ok "PAUSA por=terminal na trilha" || falha "sem PAUSA na trilha: $(cat "$EV")"
pausa --off >/dev/null
grep -q ' --- RETOMADA por=terminal dur=' "$EV" && ok "RETOMADA por=terminal na trilha" || falha "sem RETOMADA na trilha: $(cat "$EV")"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OK"; exit 0; else echo "$FALHAS FALHA(S)"; exit 1; fi
