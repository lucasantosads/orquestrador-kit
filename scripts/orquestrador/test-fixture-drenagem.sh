#!/usr/bin/env bash
# test-fixture-drenagem.sh — NÃO é teste: é o molde de fila que os testes de
# drenagem da etapa 7a CARREGAM (source) para montar fila e config num
# `mktemp -d`, sem nunca ler `docs/fila` do checkout nem config de repo real.
#
# Quem carrega declara o isolamento ANTES (`export ORQ_TESTE=1` e
# `ORQ_EXEC_ROOT="$(mktemp -d)/..."`), chama `fx_config`/`fx_ticket`/`fx_git`
# e só DEPOIS carrega o `local-loop.sh`: o `lib.sh` lê o config no carregamento.
#
# Rodado direto, só avisa e sai 0.

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  echo "test-fixture-drenagem.sh é molde carregado pelos test-*.sh da 7a; não roda sozinho"
  exit 0
fi

# fx_config <raiz> [filtro-jq] — o 000-config.json MÍNIMO que o lib.sh e o
# local-loop.sh leem (config-chaves.ts), mais o liberacoes.json vazio. O filtro
# opcional ajusta o config do caso (ex.: '.sem_progresso_limite = 1').
fx_config() {
  local raiz="$1" filtro="${2:-.}"
  mkdir -p "$raiz/docs/fila/runs"
  jq "$filtro" > "$raiz/docs/fila/000-config.json" <<'JSON'
{ "$schema_versao": 2,
  "branch_alvo": "staging-auto", "branch_protegida": "main",
  "max_retries": 2, "cooldown_minutes": 60, "diff_cap_linhas": 600,
  "migrations_dir": "db/migrations", "worktrees_dir": "../_worktrees",
  "worktrees_prefixo": "fx-", "runs_dir": "docs/fila/runs",
  "liberacoes_file": "docs/fila/liberacoes.json",
  "decisoes_file": "docs/fila/decisoes-pendentes.md",
  "pausar_file": "docs/fila/PAUSAR",
  "repo_origin_deve_conter": "example.invalid", "ambiente_id": "fixture",
  "canal_notificacao": "arquivo",
  "executor": { "trailer_commit": "Orq-Ticket" },
  "orcamento": { "custo_file": "docs/fila/runs/custo.json",
                 "usd_dia": 50, "tokens_dia": 5000000, "usd_ticket": 5,
                 "campos_usage": { "custo_usd": "total_cost_usd", "tokens_in": "usage.input_tokens",
                                   "tokens_out": "usage.output_tokens", "tokens_cache": "usage.cache_read_input_tokens" } } }
JSON
  echo '{"$schema_versao": 2, "tokens": []}' > "$raiz/docs/fila/liberacoes.json"
}

# fx_ticket <raiz> <id> [dependencias-json] [status] — um ticket mínimo.
fx_ticket() {
  local raiz="$1" id="$2" deps="${3:-[]}" st="${4:-pendente}"
  cat > "$raiz/docs/fila/$id-t.md" <<TICKET
# $id

\`\`\`json
{"id": "$id", "slug": "t-$id", "status": "$st", "origem": "humano",
 "objetivo": "x", "pathspec_allowlist": ["src/a.ts"], "dependencias": $deps,
 "criterios_aceite": [], "notas_status": ""}
\`\`\`
TICKET
}

# fx_git <raiz> — faz da raiz um repo git com a fila commitada, para que o
# `ticket_commit` REAL rode e o teste possa afirmar o commit (o disjuntor do
# Comarka mudava status sem commitar, e é isso que não pode voltar).
# `runs/` fica fora do índice, como num repo instalado.
fx_git() {
  local raiz="$1"
  git -C "$raiz" init -q -b main
  git -C "$raiz" config user.email fixture@example.invalid
  git -C "$raiz" config user.name fixture
  git -C "$raiz" config commit.gpgsign false
  printf 'docs/fila/runs/\n' > "$raiz/.gitignore"
  git -C "$raiz" add -A
  git -C "$raiz" commit -q -m "fixture: fila inicial"
  git -C "$raiz" branch staging-auto
}
