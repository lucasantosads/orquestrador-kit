#!/usr/bin/env bash
# sonda-mcp.sh — mede, com o `claude` REAL, se `--strict-mcp-config` tira os MCP
# da conta da chamada `claude -p` (2.1.8).
#
# ESTE SCRIPT GASTA DINHEIRO: duas chamadas `claude -p --model haiku --max-turns 1`
# (centavos). Exige ORQ_SONDA_OK=1.
#
# Fonte da lista: o evento `init` do `--output-format stream-json --verbose`, que
# traz o campo `tools` com o que o CLI carregou. Não pergunta nada ao modelo: a
# lista é do CLI, não uma resposta para julgar.
#
# CONTROLE NEGATIVO: a chamada SEM a flag precisa mostrar pelo menos um
# `mcp__claude_ai_*`. Se mostrar zero, a máquina não tem conector claude.ai e a
# medição não prova nada: rc 3 (inconclusivo), nunca "passou".
#
# SAÍDA: por padrão só o RESUMO (contagens e, das ferramentas de escrita em
# SENTINELAS, as que apareceram), no stdout e em <tmp>/resumo.txt. A lista
# completa diz quais conectores a conta do dono tem; ela só sai com
# --lista-completa, e mesmo assim só em <tmp>/lista-completa-*.txt, nunca no
# stdout e nunca dentro de um repo git (o script recusa se o tmp cair num).
# Sem --lista-completa, o stream-json cru é apagado depois da contagem.
#
# Uso: ORQ_SONDA_OK=1 bash scripts/kit/sonda-mcp.sh [--lista-completa] [modelo]
# rc 0 = sem flag > 0 e com flag = 0; rc 1 = com flag ainda há MCP; rc 3 = inconclusivo.

set -uo pipefail

LISTA_COMPLETA=0
MODELO=haiku
for a in "$@"; do
  case "$a" in
    --lista-completa) LISTA_COMPLETA=1 ;;
    -*) echo "opção desconhecida: $a" >&2; exit 2 ;;
    *) MODELO="$a" ;;
  esac
done

[ "${ORQ_SONDA_OK:-0}" = 1 ] || { echo 'recusado: chamada paga; rode com ORQ_SONDA_OK=1' >&2; exit 2; }
command -v claude >/dev/null 2>&1 || { echo 'ERRO: claude fora do PATH' >&2; exit 2; }
command -v jq >/dev/null 2>&1 || { echo 'ERRO: jq fora do PATH' >&2; exit 2; }

# Ferramentas de ESCRITA cuja presença o resumo nomeia (o resto vira só contagem).
SENTINELAS='^mcp__claude_ai_(GHL__execute_operation|Supabase__execute_sql)$'

DIR="$(mktemp -d "${TMPDIR:-/tmp}/orq-sonda-mcp.XXXXXX")"
if git -C "$DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERRO: $DIR está dentro de um repo git; a saída da sonda nunca vai para repo" >&2
  rm -rf "$DIR"; exit 2
fi
RESUMO="$DIR/resumo.txt"

{
  echo "# Saída da scripts/kit/sonda-mcp.sh, $(date '+%d/%m/%Y')."
  echo "# Fonte: evento init do claude -p --output-format stream-json --verbose --model $MODELO --max-turns 1, cwd vazio."
  echo "# Só nomes de ferramenta; nenhum dado de conta."
} > "$RESUMO"

# medir <rotulo> [flags...] -> acrescenta ao resumo a linha de contagem e as sentinelas
medir() {
  local rot="$1"; shift
  local out="$DIR/$rot.jsonl" tools="$DIR/$rot.tools"
  ( cd "$DIR" && claude -p 'responda apenas: ok' --model "$MODELO" --max-turns 1 \
      --output-format stream-json --verbose "$@" ) > "$out" 2>&1
  jq -r 'select(.type=="system" and .subtype=="init") | .tools[]' "$out" 2>/dev/null > "$tools"
  local n; n="$(grep -c '^mcp__claude_ai_' "$tools" || true)"
  {
    echo
    jq -r --arg r "$rot" 'select(.type=="system" and .subtype=="init")
      | "== \($r): claude \(.claude_code_version), mcp_servers=\(.mcp_servers|length), tools=\(.tools|length), mcp__claude_ai_*='"$n"'"' "$out" 2>/dev/null \
      || echo "== $rot: sem evento init (veja a saída crua)"
    grep -E "$SENTINELAS" "$tools" || true
  } >> "$RESUMO"
  printf '%s\n' "$n" > "$DIR/$rot.n"
  if [ "$LISTA_COMPLETA" = 1 ]; then
    grep '^mcp__' "$tools" > "$DIR/lista-completa-$rot.txt" || true
  else
    rm -f "$out"
  fi
  rm -f "$tools"
}

medir sem-flag
medir com-flag --strict-mcp-config

cat "$RESUMO"
printf '\nresumo em: %s\n' "$RESUMO"
[ "$LISTA_COMPLETA" = 1 ] && printf 'lista completa (fora de repo): %s/lista-completa-*.txt\n' "$DIR"

SEM="$(cat "$DIR/sem-flag.n")"; COM="$(cat "$DIR/com-flag.n")"
if [ "${SEM:-0}" -eq 0 ]; then
  echo 'INCONCLUSIVO: sem a flag já não há mcp__claude_ai_* (controle negativo não disparou)'; exit 3
fi
if [ "${COM:-0}" -ne 0 ]; then
  echo "FALHOU: com --strict-mcp-config ainda há $COM mcp__claude_ai_*"; exit 1
fi
echo "OK: sem flag $SEM, com flag 0"
