#!/usr/bin/env bash
# launchd-run.sh — wrapper de disparo do local-loop, chamado pelo launchd
# (com.comarka.ci-orquestrador) a cada StartInterval.
#
# ADAPTADO do comarka-operacional a partir da EVIDÊNCIA DESTE repo, não copiado:
#   - PAUSA: lá o sentinela é `docs/fila/.orq-pause`; aqui quem manda é o
#     `pausar_file` do config (`docs/fila/PAUSAR`), lido pelo próprio loop.
#   - ENV: lá o wrapper carrega `$HOME/.env.orquestrador`. Aqui NÃO carrega nada:
#     `lib.sh:env_key_present`/`env_value` já leem `<repo>/.env.local`, que é
#     onde SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (preflight_env_keys) moram
#     neste checkout. Carregar env por dois caminhos é a receita para o loop
#     rodar contra ambiente diferente do que o preflight de identidade conferiu.
#   - Log: `docs/fila/runs/launchd.log` (runs_dir do config; a pasta é ignorada
#     pelo git, então o wrapper não suja a árvore e o preflight do run seguinte
#     não morre por "árvore suja").
#
# NÃO implementa lock, cooldown, pausa nem pré-voo próprios: tudo isso é do
# LOOP, que é a fonte única de estado. Dois locks = deadlock.
#
# O que ele FAZ desde a peça 11, e por quê: antes de disparar, olha o snapshot.
# Se o STATUS está `executando` com `DESDE` além do `claude_timeout_secs`, o
# processo daquele estado não existe mais — recupera e segue. SÓ DEPOIS pergunta
# se há drenagem em curso, e pergunta ao LOCKFILE DO PRÓPRIO LOOP (fonte única,
# por repo), nunca a um `pgrep` global. Não é um segundo "outro loop rodando?":
# é a mesma resposta, lida no mesmo lugar, na ordem que impede um estado morto de
# comer 22 h de disparos.
#
# Uso manual (mesma coisa que o launchd faz): bash scripts/orquestrador/launchd-run.sh

# TESTABILIDADE: com LAUNCHD_RUN_SOURCED=1 o arquivo só DEFINE funções, nada
# roda — mesma convenção do local-loop.sh.

set -euo pipefail

# SEM comando externo aqui: o PATH ainda não foi montado, e sob o launchd ele
# chega quase vazio. `dirname` já era usado nesta linha e já falhava — o antigo
# `REPO_DIR` saía errado em silêncio e o run só não quebrava porque ninguém o
# usava antes do `cd`. `${var%/*}`, `cd` e `pwd` são builtins: não dependem de
# PATH nenhum.
ORQ_LIB_DIR="${BASH_SOURCE[0]%/*}"
[ "$ORQ_LIB_DIR" = "${BASH_SOURCE[0]}" ] && ORQ_LIB_DIR="."
ORQ_LIB_DIR="$(cd "$ORQ_LIB_DIR" && pwd)"

# node: o launchd não herda o PATH do shell interativo, e o nvm vive fora dos
# diretórios de sistema. Sem isso, `npx tsx` (gates, decisão, lock) não existe —
# e nem o `jq` que o lib.sh usa na primeira linha.
if [ -n "${NODE_DIR:-}" ] && [ -x "$NODE_DIR/node" ]; then
  NODE_BIN_DIR="$NODE_DIR"
elif command -v node >/dev/null 2>&1; then
  # `command -v` é builtin; `dirname` não seria — e aqui ainda não há PATH.
  NODE_BIN_DIR="$(command -v node)"
  NODE_BIN_DIR="$(cd "${NODE_BIN_DIR%/*}" && pwd)"
else
  echo "[launchd-run] ERRO: node não encontrado (defina NODE_DIR no plist)." >&2
  exit 127
fi

export PATH="$NODE_BIN_DIR:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# shellcheck source=lib.sh
source "$ORQ_LIB_DIR/lib.sh"

REPO_DIR="$MAIN_CHECKOUT"
LOG="$RUNS_BASE/launchd.log"
LOCK="$RUNS_BASE/.local-loop.lock"

# --- QUEM ESTÁ NO CAMINHO DO DISPARO (peça 11) -------------------------------
# drenagem_viva -> 0 se HÁ drenagem viva NESTE repo.
#
# A guarda é POR REPO, e por isso a pergunta é feita ao lockfile de
# `$RUNS_BASE`, não a um `pgrep -f local-loop` global: dois orquestradores na
# mesma máquina são operação normal (PLAYBOOK, 2026-09-02 — um `grep` global já
# pegou o loop do comarka-operacional e teria abortado sessão sem motivo). O
# lock mora dentro do repo, então o pid que ele guarda é o do loop DESTE repo.
drenagem_viva() {
  local pid
  [ -f "$LOCK" ] || return 1
  pid="$(head -1 "$LOCK" 2>/dev/null || true)"
  case "$pid" in ''|*[!0-9]*) return 1 ;; esac
  kill -0 "$pid" 2>/dev/null
}

# decidir_disparo -> ecoa `recupera` | `em-curso` | `segue`, e RECUPERA quando é
# o caso. A ORDEM é a peça inteira:
#
#   1. STALENESS PRIMEIRO. `DESDE` além de `claude_timeout_secs` significa
#      processo morto — o `claude_run` mata o grupo ao fim do timeout, então
#      nada legítimo sobrevive a ele. Recupera (evento + STATUS limpo) e SEGUE.
#   2. SÓ ENTÃO "já há drenagem em curso". Perguntar isso primeiro é o que fez
#      um STATUS congelado em `executando` desde 06/09 12:38 comer 22 h de
#      disparos do launchd, todos com exit 0: a resposta vinha de um estado que
#      ninguém mais estava mantendo.
#
# Recuperar com processo vivo é seguro: o lock do próprio loop continua sendo a
# autoridade sobre concorrência, e o disparo que segue encerra em 0 se houver
# mesmo alguém drenando. O que se recupera aqui é o SNAPSHOT, não a fila.
decidir_disparo() {
  local congelado ha
  congelado="$(status_congelado_secs)"
  if [ -n "$congelado" ]; then
    ha="$(dur_humana "$congelado")"
    event '---' RECUPERADO "motivo=status-congelado" "desde=$(status_campo desde)" "ha=$ha"
    status_set "estado=ocioso" "fase=—" "ticket=—" "motivo=morto: STATUS ficou em executando por $ha"
    echo recupera
    return 0
  fi
  if drenagem_viva; then
    echo em-curso
    return 0
  fi
  echo segue
}

main_launchd() {
  # Sem `claude` no PATH o disparo inteiro é perda de tempo: falha alto AQUI, em
  # vez de deixar o executor descobrir isso depois de criar worktree.
  if ! command -v claude >/dev/null 2>&1; then
    echo "[launchd-run] ERRO: 'claude' fora do PATH: $PATH" >&2
    exit 127
  fi

  mkdir -p "$(dirname "$LOG")"
  cd "$REPO_DIR"

  # caffeinate -i: impede o sono ocioso durante o run. Sem isso a máquina dorme no
  # meio de uma chamada e o attempt volta "computer went to sleep" — que o harness
  # classifica como ADIADO (is_interrompido), mas o ciclo foi perdido do mesmo jeito.
  local CAFFEINATE=""
  command -v caffeinate >/dev/null 2>&1 && CAFFEINATE="caffeinate -i"

  {
    echo "=== [launchd-run] início $(date '+%Y-%m-%d %H:%M:%S %z') (pid $$) ==="
    local decisao_disparo; decisao_disparo="$(decidir_disparo)"
    case "$decisao_disparo" in
      recupera)
        echo "[launchd-run] STATUS estava congelado em 'executando' — recuperado; seguindo com o disparo."
        ;;
      em-curso)
        echo "[launchd-run] drenagem viva neste repo (pid $(head -1 "$LOCK" 2>/dev/null || echo '?')) — nada a fazer."
        echo "=== [launchd-run] fim    $(date '+%Y-%m-%d %H:%M:%S %z') (exit 0, em curso) ==="
        return 0
        ;;
    esac
    # O lock é do loop: se outro disparo estiver vivo, ele mesmo encerra em 0 e
    # este bloco só registra que passou. Nada de matar processo por aqui.
    local code
    if $CAFFEINATE bash "$ORQ_LIB_DIR/local-loop.sh"; then code=0; else code=$?; fi
    echo "=== [launchd-run] fim    $(date '+%Y-%m-%d %H:%M:%S %z') (exit $code) ==="
  } >>"$LOG" 2>&1
}

[ "${LAUNCHD_RUN_SOURCED:-0}" = 1 ] || main_launchd
