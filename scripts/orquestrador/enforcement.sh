#!/usr/bin/env bash
# enforcement.sh — barreira do Orquestrador Autônomo. Roda ANTES do avaliador.
# Coleta o diff do worktree do ticket e o audita via enforcement-core.ts.
# Falha (exit 1) se o diff sai do pathspec, toca zona proibida, escreve em
# tabela, aplica migration ou carrega credencial.
#
# Uso: enforcement.sh --worktree <wt> --ticket <f> --base <sha> --out <json>
# Saída: 0 ok | 1 violação. Escreve o resultado JSON em --out.
#
# PORTE (ORQ-03): casca vinda de comarka-os. Mudou só o payload — lá ele carrega
# `c0_intocavel` (allowlist de tabelas); aqui carrega o 000-config.json INTEIRO.
#
# ORQ-12 — POR QUE O CONFIG VAI INTEIRO. Este payload era montado com uma
# projeção jq escrita à mão: `{migrations_dir, politica_schema, zona_proibida}`.
# O ORQ-08 acrescentou `sql_pendente_dir` ao config e o ORQ-11 ensinou o core a
# ler o campo — mas ninguém tocou nesta linha, então o campo chegava `null` no
# core. Efeito: os testes liam o config do disco e passavam, e SÓ a produção
# reprovava, porque só a produção passava pela projeção. `docs/sql-pendente/`
# deixava de ser diretório de artefato e o ticket 002 era reprovado pelo
# conteúdo do .sql que ele fora mandado produzir.
#
# A projeção manual é a falha: cada campo novo do config é um campo que alguém
# pode esquecer aqui, e esquecer NÃO dá erro — degrada em silêncio. Mandando
# `.`, o core recebe o que o config tem; ele já lê só os campos que conhece
# (EnforceConfig é subconjunto estrutural). O config não guarda segredo — só
# caminhos, globs e política —, então mandá-lo inteiro não amplia superfície.

set -euo pipefail
ORQ_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$ORQ_LIB_DIR/lib.sh"

WT=""; TICKET=""; BASE=""; OUT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --worktree) WT="$2"; shift ;;
    --ticket) TICKET="$2"; shift ;;
    --base) BASE="$2"; shift ;;
    --out) OUT="$2"; shift ;;
    *) die "arg desconhecido: $1" ;;
  esac
  shift
done
[ -n "$WT" ] && [ -n "$TICKET" ] && [ -n "$OUT" ] || die "enforcement: args faltando"
[ -n "$BASE" ] || BASE="$(git -C "$WT" merge-base "$CFG_BRANCH_ALVO" HEAD)"

changed="$(git -C "$WT" diff --name-only "$BASE"...HEAD)"
diff_content="$(git -C "$WT" diff "$BASE"...HEAD)"

payload="$(jq -n \
  --argjson changedFiles "$(printf '%s' "$changed" | jq -Rn '[inputs | select(length>0)]')" \
  --argjson allowlist "$(ticket_json "$TICKET" | jq '.pathspec_allowlist')" \
  --arg diff "$diff_content" \
  --argjson config "$(cfg '.')" \
  '{changedFiles:$changedFiles, allowlist:$allowlist, diff:$diff, config:$config}')"

set +e
result="$(printf '%s' "$payload" | ( cd "$ROOT" && "${ORQ_TSX[@]}" scripts/orquestrador/enforcement-core.ts --run-cli ))"
rc=$?
set -e

printf '%s\n' "$result" > "$OUT"
exit "$rc"
