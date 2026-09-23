#!/usr/bin/env bash
# test-fixture-painel.sh — NÃO é teste: é o molde de repos que os test-painel-*.sh
# CARREGAM (source) para montar N repos instalados num `mktemp -d`, com fila,
# config, trilha e STATUS escritos aqui, sem nunca ler `docs/fila` de repo real.
#
# Quem carrega declara o isolamento ANTES (`export ORQ_TESTE=1` e
# `ORQ_EXEC_ROOT="$(mktemp -d)/..."`) e define `AQUI` (o diretório do motor).
# O config sai do mesmo molde da drenagem (`fx_config`), com as duas chaves que
# o painel lê a mais: `claude_timeout_secs` e `launchd`.
#
# Rodado direto, só avisa e sai 0.

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  echo "test-fixture-painel.sh é molde carregado pelos test-painel-*.sh; não roda sozinho"
  exit 0
fi

# shellcheck source=test-fixture-drenagem.sh
source "$AQUI/test-fixture-drenagem.sh"

# fp_epoch_hoje <HH:MM:SS> -> epoch de hoje nessa hora (relógio local).
# O painel lê `ORQ_PAINEL_AGORA` no lugar do relógio: sem isso, um teste rodado
# às 00:03 veria "hoje" sem nenhum dos eventos que acabou de escrever.
fp_epoch_hoje() {
  date -j -f '%Y-%m-%d %H:%M:%S' "$(date +%Y-%m-%d) $1" +%s 2>/dev/null \
    || date -d "$(date +%Y-%m-%d) $1" +%s
}

# fp_iso <epoch> -> o carimbo que `event()` grava (`%Y-%m-%dT%H:%M:%S%z`).
fp_iso() { date -r "$1" '+%Y-%m-%dT%H:%M:%S%z' 2>/dev/null || date -d "@$1" '+%Y-%m-%dT%H:%M:%S%z'; }

# fp_hhmm <epoch> [formato] -> hora local formatada.
fp_fmt() { date -r "$1" "+${2:-%H:%M:%S}" 2>/dev/null || date -d "@$1" "+${2:-%H:%M:%S}"; }

# fp_repo <raiz> [filtro-jq do config] — um repo instalado mínimo, sem git: o
# painel não usa git, e o lib.sh fora de git cai em MAIN_CHECKOUT = ROOT.
fp_repo() {
  local raiz="$1" filtro="${2:-.}"
  fx_config "$raiz" ".claude_timeout_secs = 1800 | .launchd = {\"label\": \"org.fixture.$(basename "$raiz")\", \"start_interval\": 1800} | $filtro"
}

# fp_ticket <raiz> <id> <status> [dependencias-json] [campos-json] — o primeiro
# bloco ```json é o ticket; os campos extras entram por merge.
fp_ticket() {
  local raiz="$1" id="$2" st="$3" deps="${4:-[]}" extra="${5:-}"
  [ -n "$extra" ] || extra='{}'
  {
    printf '# %s\n\n```json\n' "$id"
    jq -n --arg id "$id" --arg st "$st" --argjson deps "$deps" --argjson extra "$extra" '
      {id: $id, slug: ("t-" + $id), status: $st, objetivo: ("Objetivo do " + $id + ". Segunda frase."),
       pathspec_allowlist: ["src/a.ts"], dependencias: $deps, criterios_aceite: [],
       risco: "baixo", notas_status: ""} + $extra'
    printf '```\n\nprosa do ticket, ignorada.\n\n```json\n{"id": "999", "status": "done"}\n```\n'
  } > "$raiz/docs/fila/$id-t-$id.md"
}

# fp_evento <raiz> <epoch> <id> <EVENTO> [campos...] — uma linha da trilha, no
# formato de `event()`.
fp_evento() {
  local raiz="$1" ep="$2" id="$3" ev="$4"; shift 4
  mkdir -p "$raiz/docs/fila/runs"
  printf '%s %s %s%s\n' "$(fp_iso "$ep")" "$id" "$ev" "${*:+ $*}" >> "$raiz/docs/fila/runs/events.log"
}

# fp_status <raiz> <estado> <ticket> <desde> <ultimo> [motivo] — o STATUS.md como
# `status_render` o escreve.
fp_status() {
  local raiz="$1"
  mkdir -p "$raiz/docs/fila/runs"
  {
    printf 'ORQUESTRADOR · %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    printf 'ESTADO   %s\nTICKET   %s\nDESDE    %s\nFASE     %s\n' "$2" "$3" "$4" "$([ "$2" = executando ] && echo agente || echo —)"
    printf 'FILA     —\nSTAGING  —\nÚLTIMO   %s\n' "$5"
    [ -z "${6:-}" ] || printf 'MOTIVO   %s\n' "$6"
  } > "$raiz/docs/fila/runs/STATUS.md"
}

# fp_repos <arquivo> <raiz>... — o ~/.orq/repos.json do painel.
fp_repos() {
  local arq="$1"; shift
  printf '%s\n' "$@" | jq -R . | jq -s '{"$schema_versao": 1, repos: map({caminho: .})}' > "$arq"
}

# fp_painel [args] — o painel sob teste, com os repos e o relógio do fixture.
fp_painel() { python3 "$AQUI/orq-painel.py" "$@"; }
