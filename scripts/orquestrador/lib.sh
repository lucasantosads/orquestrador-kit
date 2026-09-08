#!/usr/bin/env bash
# lib.sh — helpers compartilhados do Orquestrador Autônomo.
# Sourced por executor.sh / avaliador.sh / enforcement.sh.
# Requisitos: bash, git, jq, awk. Nada que gaste dinheiro ou aplique DDL.
#
# PORTE (ORQ-01): vindo de comarka-os (scripts/orquestrador/lib.sh), repo irmão
# com o orquestrador em produção. Adaptações desta porta, e SÓ estas:
#   1. Identidade: lá o config expõe .supabase_project_id; aqui é .ambiente_id.
#   2. is_adiavel: a política deste repo (politica_adiamento.causas_que_adiam)
#      lista 6 causas; a de lá cobria limite/quota/timeout e interrupção de
#      ambiente. Erro de conexão e sessão expirada entraram explicitamente.
# Não vieram: baseline_scope_regex e diff_cap do config deles (o nosso baseline
# é 0 e o diff_cap é 600), nem nada de Notion, email ou dev server.

set -euo pipefail

# --- Raízes ---------------------------------------------------------------
# ROOT = raiz de EXECUÇÃO do run (git ops + guard de árvore suja do executor).
# Por padrão é o checkout de invocação (dois níveis acima deste arquivo), mas o
# local-loop pode apontá-lo para um worktree LIMPO dedicado via ORQ_EXEC_ROOT.
# Assim o guard de sujeira vale para a árvore de EXECUÇÃO — NUNCA para o
# checkout principal, que pode estar sujo à vontade.
ORQ_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${ORQ_EXEC_ROOT:-$(cd "$ORQ_LIB_DIR/../.." && pwd)}"

# MAIN_CHECKOUT = checkout PRINCIPAL (pai do .git comum). É a FONTE ÚNICA da fila:
# docs/fila (tickets, config, liberações) e docs/fila/runs (evidência) vivem SÓ
# aqui, e o executor lê/escreve status SEMPRE aqui — mesmo rodando de outro
# worktree. Resolver a fila contra ROOT fazia o run gravar status numa cópia
# paralela: o status aprovado nunca chegava ao canônico e a drenagem
# re-selecionava um ticket já pronto. node_modules/.env.local (não-versionados)
# e worktrees_dir também são relativos a ELE — não à raiz de execução.
_git_common="$(git -C "$ROOT" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
if [ -n "$_git_common" ] && [ -d "$_git_common" ]; then
  MAIN_CHECKOUT="$(cd "$_git_common/.." && pwd)"
else
  MAIN_CHECKOUT="$ROOT"   # fallback: fora de git (fixtures de teste), execução == principal
fi

# Fila/config/runs: SEMPRE no checkout principal (fonte única), nunca no ROOT de
# execução. Sob fixture não-git, MAIN_CHECKOUT cai em ROOT e isto resolve igual.
FILA_DIR="$MAIN_CHECKOUT/docs/fila"
CONFIG="$FILA_DIR/000-config.json"

# --- Logging --------------------------------------------------------------
log()  { printf '[orq %s] %s\n' "$(date -u +%H:%M:%S 2>/dev/null || echo '--:--:--')" "$*" >&2; }
die()  { printf '[orq ERRO] %s\n' "$*" >&2; exit 1; }

# --- Config ---------------------------------------------------------------
cfg() { jq -r "$1" "$CONFIG"; }

CFG_BRANCH_ALVO="$(cfg '.branch_alvo')"
CFG_MAX_RETRIES="$(cfg '.max_retries')"
CFG_MIGRATIONS_DIR="$(cfg '.migrations_dir')"
CFG_RUNS_DIR="$(cfg '.runs_dir')"
CFG_LIBERACOES="$MAIN_CHECKOUT/$(cfg '.liberacoes_file')"
CFG_WORKTREES_DIR="$(cfg '.worktrees_dir')"
CFG_DIFF_CAP="$(cfg '.diff_cap_linhas')"

# --- Identidade (ADAPTAÇÃO 1) ------------------------------------------------
# Trava de identidade: antes de qualquer gasto, o executor confirma repo e
# ambiente certos. O origin do checkout DEVE conter CFG_REPO_ORIGIN; o
# identificador de ambiente extraído do .env DEVE ser igual a CFG_AMBIENTE_ID.
# Divergência = aborta o run inteiro, zero tentativa.
# O config do comarka-os chama esse campo de `supabase_project_id`; o nosso
# chama `ambiente_id` — é a única diferença de nome, o papel é o mesmo.
CFG_REPO_ORIGIN="$(cfg '.repo_origin_deve_conter')"
CFG_AMBIENTE_ID="$(cfg '.ambiente_id')"

# Base ABSOLUTA da evidência de runs — canônica no checkout principal (fonte
# única), independente da raiz de execução.
RUNS_BASE="$MAIN_CHECKOUT/$CFG_RUNS_DIR"

# Base ABSOLUTA dos worktrees, resolvida contra o checkout PRINCIPAL (não o de
# invocação). worktrees_dir é relativo (ex.: ../_worktrees); normaliza para
# absoluto para nunca dobrar. O dir base já existe; se não, mantém o caminho cru.
WORKTREES_BASE="$(cd "$MAIN_CHECKOUT/$CFG_WORKTREES_DIR" 2>/dev/null && pwd || echo "$MAIN_CHECKOUT/$CFG_WORKTREES_DIR")"

# --- Tickets --------------------------------------------------------------
# Arquivos de ticket: docs/fila/NNN-*.md  (exclui _TEMPLATE.md).
ticket_files() {
  find "$FILA_DIR" -maxdepth 1 -type f -name '[0-9]*.md' 2>/dev/null | sort
}

# Extrai o bloco ```json ... ``` de um ticket .md.
ticket_json() {
  awk '
    /^```json$/ { inblk=1; next }
    inblk && /^```$/ { inblk=0; next }
    inblk { print }
  ' "$1"
}

# ticket_field <arquivo> <jq-filter>
ticket_field() { ticket_json "$1" | jq -r "$2"; }

# ticket_file_by_id <id>  ->  caminho do .md, ou vazio.
ticket_file_by_id() {
  local id="$1" f
  for f in $(ticket_files); do
    [ "$(ticket_field "$f" '.id')" = "$id" ] && { echo "$f"; return 0; }
  done
  return 0
}

# ticket_set <arquivo> <jq-filter> [args-extra-do-jq...]
# Reescreve SÓ o bloco json do .md preservando o resto (prosa) intacto.
# Ex.: ticket_set f '.status = $s' --arg s done
ticket_set() {
  local file="$1" filter="$2"; shift 2
  local tmpjson tmpout
  tmpjson="$(mktemp)"; tmpout="$(mktemp)"
  ticket_json "$file" | jq "$@" "$filter" > "$tmpjson"
  awk -v f="$tmpjson" '
    /^```json$/ { print; while ((getline line < f) > 0) print line; close(f); inblk=1; next }
    inblk && /^```$/ { print; inblk=0; next }
    inblk { next }
    { print }
  ' "$file" > "$tmpout"
  mv "$tmpout" "$file"
  rm -f "$tmpjson"
}

ticket_set_status() { ticket_set "$1" '.status = $s' --arg s "$2"; }
ticket_set_nota()   { ticket_set "$1" '.notas_status = $v' --arg v "$2"; }

# ticket_commit <arquivo> <mensagem>
# Commita a mudança de status/nota do ticket no MAIN_CHECKOUT imediatamente
# apos escreve-la. Sem isso a arvore fica suja entre disparos e o preflight
# do PROXIMO ticket aborta com "arvore de execucao suja" — incidente visto
# 6+ vezes (ver ticket 012). Pathspec explicito, nunca `git add -A`/`.`
# (regra do PLAYBOOK). Idempotente: sem diff staged, nao cria commit vazio.
ticket_commit() {
  local file="$1" msg="$2"
  git -C "$MAIN_CHECKOUT" add -- "$file"
  git -C "$MAIN_CHECKOUT" diff --cached --quiet -- "$file" || \
    git -C "$MAIN_CHECKOUT" commit -q -m "$msg" -- "$file"
}

# --- Observabilidade (contrato: skill/references/observabilidade.md §1 e §2) --
# Duas irmãs do `log`, no mesmo lugar onde o loop já registra progresso:
#   status_set <chave=valor>...  reescreve o snapshot INTEIRO (nunca append)
#   event <id> <EVENTO> [k=v]... anexa UMA linha à trilha
# Best-effort por desenho: telemetria nunca derruba um run. Todo caminho de erro
# termina em `return 0`.
STATUS_FILE="$RUNS_BASE/STATUS.md"
STATUS_STATE="$RUNS_BASE/.status.json"   # estado entre chamadas; o .md é derivado
EVENTS_FILE="$RUNS_BASE/events.log"

# --- ISOLAMENTO DE TESTE (peça 0d) -------------------------------------------
# `ORQ_TESTE=1` é a declaração "quem está rodando é script de TESTE". Sob ela, a
# trilha, o STATUS e o ledger de custo só podem ser escritos DENTRO do fixture
# (`$ORQ_EXEC_ROOT`). Qualquer outro destino é a trilha de PRODUÇÃO.
#
# Por que existe: `lib.sh` resolve `MAIN_CHECKOUT` por `git rev-parse
# --git-common-dir`, então um `source lib.sh` no TOPO de um script de teste —
# rodado de qualquer worktree — herda o checkout PRINCIPAL e escreve na trilha
# real. Foi por essa porta que entraram os dois `EXECUTOR_MORREU rc=1 fase=?` das
# 20:45 e 20:47 de 2026-09-04 no `events.log` real (linhas 153, 155 e 156), sem
# drenagem nenhuma por trás: evidência falsa, indistinguível de morte de verdade,
# e a peça 10 do PLAYBOOK já tinha mostrado a versão cara do mesmo buraco (o
# `test-preflight.sh` cobrando US$ 0,34 por rodar contra o config real).
#
# A recusa é SILENCIOSA no desfecho — telemetria nunca derruba run, contrato §1 —
# e RUIDOSA no log: quem esqueceu o `ORQ_EXEC_ROOT` precisa ver, e o teste que
# afirma o isolamento precisa de algo para grepar.
escrita_de_teste_permitida() {
  [ "${ORQ_TESTE:-0}" = 1 ] || return 0
  local alvo="${1:-$RUNS_BASE}" raiz="${ORQ_EXEC_ROOT:-}"
  if [ -n "$raiz" ]; then
    # FÍSICO dos dois lados. No macOS `mktemp -d` devolve /var/folders/… e o
    # `git rev-parse --path-format=absolute` devolve /private/var/folders/… para
    # o MESMO diretório (/var é symlink de /private/var). Comparar texto cru
    # recusaria escrita legítima dentro do fixture — guarda que dá falso
    # positivo é guarda que alguém desliga.
    case "$alvo/" in "${raiz%/}"/*) return 0 ;; esac
    if [ -d "$raiz" ]; then
      local raiz_fis alvo_fis
      raiz_fis="$(cd "$raiz" && pwd -P)"
      alvo_fis="$(caminho_fisico "$alvo")"
      case "$alvo_fis/" in "${raiz_fis%/}"/*) return 0 ;; esac
    fi
  fi
  log "ORQ_TESTE=1: destino '$alvo' FORA de ORQ_EXEC_ROOT='${ORQ_EXEC_ROOT:-<vazio>}' — escrita RECUSADA (é a trilha de produção)"
  return 1
}

# caminho_fisico <caminho> -> o mesmo caminho com o ancestral EXISTENTE resolvido
# fisicamente (o alvo em si pode ainda não existir: é o arquivo que se vai criar).
caminho_fisico() {
  local alvo="$1" dir="$1" resto=""
  while [ -n "$dir" ] && [ "$dir" != / ] && [ ! -d "$dir" ]; do
    resto="/${dir##*/}$resto"; dir="${dir%/*}"; [ -n "$dir" ] || dir=/
  done
  if [ -d "$dir" ]; then printf '%s%s' "$(cd "$dir" && pwd -P)" "$resto"; else printf '%s' "$alvo"; fi
}

# tickets_status_stream -> um status por linha, UM jq para a fila inteira.
# (N tickets × 2 jq por ticket fazia o status_set custar segundos.)
tickets_status_stream() {
  local f
  for f in $(ticket_files); do ticket_json "$f"; done 2>/dev/null | jq -r '.status // "?"' 2>/dev/null
}

# placar_fila -> "3 pendente · 5 bloqueado · 41 done" (ordem fixa; extras no fim).
placar_fila() {
  tickets_status_stream | awk '
    { n[$1]++ }
    END {
      split("pendente aguardando_merge refatiar bloqueado done", o, " ")
      for (i = 1; i <= 5; i++) { k = o[i]; if (k in n) { printf "%s%d %s", (s++ ? " · " : ""), n[k], k; delete n[k] } }
      for (k in n) printf "%s%d %s", (s++ ? " · " : ""), n[k], k
      if (!s) printf "sem ticket"
      printf "\n"
    }'
}

# staging_linha -> HEAD curto da branch alvo + estado do push (regra 12: a
# supressão esquecida tem que aparecer no snapshot).
staging_linha() {
  local sha
  sha="$(git -C "$ROOT" rev-parse --short "$CFG_BRANCH_ALVO" 2>/dev/null || echo '—')"
  printf '%s · push suprimido (publicar é humano neste repo)\n' "$sha"
}

# uma_linha <texto> [max] -> o texto com \n, \r e \t ESCAPADOS (dois caracteres
# cada) e, se `max` > 0, cortado em `max` caracteres.
#
# Peça 0e(a). O formato da trilha é UMA LINHA POR EVENTO, e era só convenção: um
# `\n` dentro de um valor quebrava o evento em várias linhas, e toda linha a
# partir da segunda ficava sem timestamp — invisível para `grep`, `tail`,
# contagem e para o `orq erro`, que lê a trilha por linha. Medido em 2026-09-05
# 13:40, com o loop drenando: 427 linhas, 243 eventos e 184 linhas sem timestamp;
# trinta minutos antes eram 413/237/176. O dano cresce a cada drenagem.
#
# NÃO escapa a barra invertida: o valor é comando de shell (`grep -E 'fetch\('`),
# e dobrar `\` mudaria os bytes do que a trilha afirma. O objetivo é o formato de
# UMA linha, não um encoding reversível.
uma_linha() {
  local s="${1-}" max="${2:-0}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\t'/\\t}"
  if [ "$max" -gt 0 ] && [ "${#s}" -gt "$max" ]; then s="${s:0:$max}"; fi
  printf '%s' "$s"
}

# event <id> <EVENTO> [chave=valor ...]
# Uma linha, formato fixo: <iso8601> <id> <EVENTO> chave=valor...
# `motivo=` é sempre TOKEN curto e estável (grepável), nunca frase: quem quer a
# frase abre a evidência do run.
event() {
  local id="${1:-—}" ev="${2:-?}"
  [ $# -ge 2 ] && shift 2 || shift $#
  escrita_de_teste_permitida "$EVENTS_FILE" || return 0
  mkdir -p "$RUNS_BASE" 2>/dev/null || true
  {
    printf '%s %s %s' "$(date '+%Y-%m-%dT%H:%M:%S%z' 2>/dev/null || echo '?')" \
      "$(uma_linha "$id")" "$(uma_linha "$ev")"
    # O escape é AQUI, no ponto de estrangulamento: qualquer evento que carregue
    # comando passa por esta linha, e nenhum chamador precisa lembrar do assunto.
    if [ $# -gt 0 ]; then printf ' %s' "$(uma_linha "$*")"; fi
    printf '\n'
  } >> "$EVENTS_FILE" 2>/dev/null || true
  return 0
}

# anotacao <texto> — evento `ANOTACAO` na trilha (peça 0d).
#
# É como o harness registra NA trilha algo que ele sabe SOBRE a trilha: evento
# espúrio, janela de teste, reparo de formato. Nunca apaga nem reescreve linha
# nenhuma — a trilha só cresce, e o que ela afirmou continua afirmado. Uma
# anotação ao lado é a única correção honesta de um registro append-only.
anotacao() { event '---' ANOTACAO "nota=${1:-}"; }

# status_set <chave=valor> ...
# Chaves: estado ticket desde desde_epoch fase ultimo motivo.
# FILA e STAGING NÃO são chaves: são relidos do disco/git a cada render (regra 9,
# read-back sempre) — snapshot com placar velho é pior que sem placar.
status_set() {
  local kv k v tmp filtro='.' arg
  local -a args=()
  escrita_de_teste_permitida "$STATUS_STATE" || return 0
  for kv in "$@"; do
    k="${kv%%=*}"; v="${kv#*=}"
    case "$k" in
      estado|ticket|desde|desde_epoch|fase|ultimo|motivo) : ;;
      *) log "status_set: chave desconhecida '$k' (ignorada)"; continue ;;
    esac
    arg="v_$k"
    args+=(--arg "$arg" "$v")
    filtro="$filtro | .$k = \$$arg"
  done
  mkdir -p "$RUNS_BASE" 2>/dev/null || true
  [ -s "$STATUS_STATE" ] || echo '{}' > "$STATUS_STATE" 2>/dev/null || return 0
  if [ ${#args[@]} -gt 0 ]; then
    tmp="$(mktemp 2>/dev/null)" || return 0
    if jq "${args[@]}" "$filtro" "$STATUS_STATE" > "$tmp" 2>/dev/null; then
      mv -f "$tmp" "$STATUS_STATE" 2>/dev/null || rm -f "$tmp"
    else
      rm -f "$tmp"
    fi
  fi
  status_render
  return 0
}

# status_render — REESCREVE $STATUS_FILE inteiro a partir do estado + do disco.
# Nunca append: se o arquivo crescer, está errado (contrato §1).
status_render() {
  local estado ticket desde desde_epoch fase ultimo motivo tmp agora decorrido tout resta
  escrita_de_teste_permitida "$STATUS_FILE" || return 0
  [ -s "$STATUS_STATE" ] || return 0
  IFS=$'\t' read -r estado ticket desde desde_epoch fase ultimo motivo < <(
    jq -r '[(.estado // "—"), (.ticket // "—"), (.desde // "—"), (.desde_epoch // "0"),
            (.fase // "—"), (.ultimo // "—"), (.motivo // "")] | @tsv' "$STATUS_STATE" 2>/dev/null
  ) || return 0

  # Ocioso não tem ticket nem fase: campo preenchido aqui é estado velho lido
  # como atual, que é a origem nº 1 de diagnóstico errado.
  if [ "$estado" = ocioso ] || [ "$estado" = encerrado ]; then ticket='—'; fase='—'; fi

  decorrido=""
  if [ "$estado" = executando ] && [ "$desde_epoch" != 0 ]; then
    agora="$(date +%s 2>/dev/null || echo 0)"
    decorrido=" ($(( (agora - desde_epoch) / 60 ))min)"
    tout="$(cfg '.claude_timeout_secs' 2>/dev/null)"
    case "$tout" in ''|null|*[!0-9]*) tout="" ;; esac
    if [ -n "$tout" ]; then
      resta=$(( (desde_epoch + tout - agora) / 60 ))
      [ "$resta" -ge 0 ] && decorrido="$decorrido · timeout em ${resta}min"
    fi
  fi

  tmp="$(mktemp 2>/dev/null)" || return 0
  {
    printf 'ORQUESTRADOR · %s\n' "$(date '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo '?')"
    printf 'ESTADO   %s\n' "$estado"
    printf 'TICKET   %s\n' "$ticket"
    printf 'DESDE    %s%s\n' "$desde" "$decorrido"
    printf 'FASE     %s\n' "$fase"
    printf 'FILA     %s\n' "$(placar_fila)"
    printf 'STAGING  %s\n' "$(staging_linha)"
    printf 'ÚLTIMO   %s\n' "$ultimo"
    if [ "$estado" != executando ] && [ -n "$motivo" ]; then printf 'MOTIVO   %s\n' "$motivo"; fi
  } > "$tmp" 2>/dev/null && mv -f "$tmp" "$STATUS_FILE" 2>/dev/null || rm -f "$tmp"
  return 0
}

# --- STATUS CONGELADO (peça 11) ----------------------------------------------
# LEITURA pura, compartilhada pelo `orq` e pelo `launchd-run.sh`. Mora aqui, e
# não em cada um, porque duas implementações da mesma pergunta divergem no
# primeiro ajuste — e a pergunta é "o que o snapshot diz é verdade agora?".

# status_campo <chave> -> o valor no estado, ou vazio.
status_campo() {
  [ -s "$STATUS_STATE" ] || return 0
  jq -r --arg k "$1" '.[$k] // empty' "$STATUS_STATE" 2>/dev/null || true
}

# status_congelado_secs -> há quantos segundos o STATUS está `executando` ALÉM do
# `claude_timeout_secs`; vazio se não está congelado.
#
# A régua é o timeout da chamada porque é o teto de tudo que o executor faz num
# passo: `claude_run` mata o grupo de processos ao fim dele. `DESDE` mais velho
# que isso não é "demorando" — é processo que não existe mais e STATUS que ficou.
# Em 2026-09-06 o STATUS ficou `executando` desde 12:38 e assim passou 22 h,
# enquanto todo disparo do launchd saía 0.
status_congelado_secs() {
  local estado epoch tout agora
  estado="$(status_campo estado)"
  [ "$estado" = executando ] || return 0
  epoch="$(status_campo desde_epoch)"
  case "$epoch" in ''|*[!0-9]*) return 0 ;; esac
  [ "$epoch" -gt 0 ] || return 0
  tout="$(cfg '.claude_timeout_secs' 2>/dev/null)"
  case "$tout" in ''|null|*[!0-9]*) return 0 ;; esac
  agora="$(date +%s 2>/dev/null || echo 0)"
  [ $((agora - epoch)) -gt "$tout" ] || return 0
  printf '%s' $((agora - epoch))
}

# dur_humana <segundos> -> "22h", "45min", "12s". Para humano ler, não para parse.
dur_humana() {
  local s="${1:-0}"
  case "$s" in ''|*[!0-9]*) s=0 ;; esac
  if   [ "$s" -ge 3600 ]; then printf '%sh' $((s / 3600))
  elif [ "$s" -ge 60 ];   then printf '%smin' $((s / 60))
  else                         printf '%ss' "$s"; fi
}

# status_ticket_inicio <id> <slug> <attempt> <max> — TICKET + DESDE num lugar só.
status_ticket_inicio() {
  status_set "estado=executando" "ticket=$1 $2 · tentativa $(( $3 + 1 ))/$(( $4 + 1 ))" \
    "desde=$(date '+%H:%M:%S' 2>/dev/null || echo '?')" "desde_epoch=$(date +%s 2>/dev/null || echo 0)" \
    "fase=agente" "motivo="
}

# motivo_token <veredito-json> -> token curto e grepável para o `motivo=`.
# Usa a `causa` do decisao.ts (diff_cap, enforcement, criterio_qualidade,
# rate_limit, timeout, ...), que já é estável; só cai no texto se faltar.
motivo_token() {
  local v="$1" t
  t="$(printf '%s' "$v" | jq -r '.causa // empty' 2>/dev/null || true)"
  if [ -z "$t" ]; then
    t="$(norm_motivo "$(printf '%s' "$v" | jq -r '.motivo // empty' 2>/dev/null || true)" \
      | tr ' ' '-' | cut -c1-32)"
  fi
  printf '%s' "${t:-desconhecido}"
}

# --- Dependências ---------------------------------------------------------
# liberacao_ok <token-INTEIRO>  (ex.: liberacao_ok "humano:migration-0025")
#
# Formato CANÔNICO de liberacoes.json — o que o arquivo, a doutrina e o lint do
# mapa usam: {"tokens": ["humano:<token>", ...]}, com o token INTEIRO, prefixo
# incluído. A v1 consultava `.liberadas[] | select(.token == $t)` com o token
# SEM o prefixo: nenhum token liberado resolvia dependência nenhuma, e o ticket
# ficava pendente para sempre em silêncio (PLAYBOOK 2026-09-03).
#
# COMPAT por UMA versão: o formato antigo (.liberadas[].token, sem prefixo)
# ainda resolve, mas grava AVISO no log. Sai na próxima mudança de schema.
liberacao_ok() {
  local token="$1"
  [ -f "$CFG_LIBERACOES" ] || return 1
  jq -e --arg t "$token" '(.tokens // []) | index($t) != null' \
    "$CFG_LIBERACOES" >/dev/null 2>&1 && return 0
  if jq -e --arg t "${token#humano:}" '(.liberadas // []) | any(.token == $t)' \
       "$CFG_LIBERACOES" >/dev/null 2>&1; then
    log "AVISO: '$token' liberado pelo formato ANTIGO (.liberadas[].token, sem prefixo)."
    log "AVISO: migre $CFG_LIBERACOES para {\"tokens\": [\"$token\"]} — o formato antigo sai na próxima versão."
    return 0
  fi
  return 1
}

# deps_resolvidas <arquivo> -> 0 se o ticket está LIBERADO para rodar agora:
# dependências satisfeitas E nenhum adiamento com data ainda vigente.
deps_resolvidas() {
  local file="$1" dep tf st ate
  # adiado_ate no futuro (adiamento por orçamento) = não processável hoje. Fica
  # aqui, e não em proximo_pendente, porque quem seleciona ticket são DOIS
  # lugares (executor e drenagem) e os dois já passam por esta função.
  ate="$(ticket_field "$file" '.adiado_ate // empty' 2>/dev/null || true)"
  if [ -n "$ate" ] && [[ "$ate" > "$(hoje)" ]]; then
    log "  adiado até $ate: $(ticket_field "$file" '.id')"
    return 1
  fi
  while IFS= read -r dep; do
    [ -z "$dep" ] && continue
    if [[ "$dep" == humano:* ]]; then
      # Token INTEIRO, com prefixo: é a forma que liberacoes.json guarda.
      liberacao_ok "$dep" || { log "  dep pendente: $dep (sem liberação humana)"; return 1; }
    else
      tf="$(ticket_file_by_id "$dep")"
      [ -n "$tf" ] || { log "  dep inexistente: $dep"; return 1; }
      st="$(ticket_field "$tf" '.status')"
      [ "$st" = "done" ] || { log "  dep não-done: $dep (status=$st)"; return 1; }
    fi
  done < <(ticket_field "$file" '.dependencias[]?')
  return 0
}

# proximo_pendente -> caminho do primeiro ticket pendente com deps resolvidas.
proximo_pendente() {
  local f
  for f in $(ticket_files); do
    [ "$(ticket_field "$f" '.status')" = "pendente" ] || continue
    if deps_resolvidas "$f"; then echo "$f"; return 0; fi
  done
  return 0
}

# --- Git / branch alvo ----------------------------------------------------
branch_existe() { git -C "$ROOT" show-ref --verify --quiet "refs/heads/$1"; }

# Garante a branch alvo (staging-auto), criando-a da branch protegida se faltar.
# Sem push.
ensure_branch_alvo() {
  if ! branch_existe "$CFG_BRANCH_ALVO"; then
    local base; base="$(cfg '.branch_protegida')"
    log "criando branch alvo $CFG_BRANCH_ALVO a partir de $base (local, sem push)"
    git -C "$ROOT" branch "$CFG_BRANCH_ALVO" "$base"
  fi
}

# Caminho do worktree da branch alvo (para merges sem tocar o checkout principal).
#
# PREFIXADO, como todo worktree deste loop. worktrees_dir (../_worktrees) é
# COMPARTILHADO entre repos — o próprio config avisa disso em _worktrees_prefixo,
# mas o prefixo só estava sendo aplicado aos worktrees de TICKET. O de staging
# nascia como "<base>/<branch_alvo>", que colide com o worktree homônimo de
# outro repo: como o outro repo também tem uma branch chamada staging-auto e a
# árvore dele está limpa, os DOIS guards de merge_em_alvo passam e a drenagem
# tenta mergear no repo errado. Medido neste checkout: o diretório pertencia a
# comarka-operacional, e só não houve escrita porque a ref frente/<id> não
# existe lá — o merge morreu em "not something we can merge", por acidente.
staging_worktree_path() { echo "$WORKTREES_BASE/$(cfg '.worktrees_prefixo')$CFG_BRANCH_ALVO"; }

# Caminho ABSOLUTO do .git comum a que um diretório pertence; vazio se não for
# repo. É o que distingue "nosso worktree" de "worktree de outro repo com o
# mesmo nome" — comparar por nome de branch ou por árvore limpa NÃO distingue.
git_common_abs() {
  (cd "$1" 2>/dev/null && cd "$(git rev-parse --git-common-dir 2>/dev/null)" 2>/dev/null && pwd) || true
}

ensure_staging_worktree() {
  local wt nosso dele; wt="$(staging_worktree_path)"
  ensure_branch_alvo
  nosso="$(git_common_abs "$ROOT")"
  if [ -d "$wt" ]; then
    # Diretório preexistente NÃO é prova de que é nosso. Verifica o dono antes
    # de reusar: adotar worktree alheio é como a drenagem foi parar noutro repo.
    dele="$(git_common_abs "$wt")"
    if [ "$dele" != "$nosso" ]; then
      die "worktree de merge '$wt' NÃO pertence a este repo.
  dono encontrado: ${dele:-<não é um repo git>}
  esperado:        $nosso
$WORKTREES_BASE é compartilhado entre repos; reusar esse diretório mergearia no
repo errado. Remova/renomeie o diretório, ou ajuste worktrees_prefixo/branch_alvo
no config. Nenhum merge foi tentado."
    fi
  else
    log "adicionando worktree de $CFG_BRANCH_ALVO em $wt"
    git -C "$ROOT" worktree add "$wt" "$CFG_BRANCH_ALVO" >/dev/null
  fi
  echo "$wt"
}

# ticket_mergeado_em_alvo <id> -> 0 se existe um merge deste ticket na branch
# alvo. O avaliador grava a marca "... (ticket <id>) em <alvo>" no merge; um
# merge MANUAL com a mesma marca também conta. Base do reconcile de status.
ticket_mergeado_em_alvo() {
  local id="$1"
  branch_existe "$CFG_BRANCH_ALVO" || return 1
  git -C "$ROOT" log "$CFG_BRANCH_ALVO" --grep "(ticket $id)" --oneline 2>/dev/null | grep -q .
}

# --- Resiliência a limite de assinatura (rate limit / quota / sobrecarga) ----
# Padrões REAIS emitidos pelo claude CLI 2.x em modo -p ao bater o limite da
# assinatura Max/Pro ou sobrecarga da API: tipos de erro `rate_limit_error`,
# `overloaded_error`/529, `usage_cap_reached`; mensagens "usage limit reached",
# "Request rejected (429)", "credit balance ... too low", "5-hour session limit".
# ERE portável (sem \b — BSD grep do macOS): 429/529 casam com o formato
# "(429)"/"Request rejected"/"error 429", não um "429" solto qualquer.
# Cobre as causas 'rate limit' e 'quota estourada' do politica_adiamento.
RATE_LIMIT_REGEX='rate[ _-]?limit|rate_limit_error|limit reached|usage limit|usage_cap_reached|overloaded|too many requests|quota|capacity|credit balance|5-hour session limit|\(429\)|\(529\)|(error|status|rejected[^0-9]{0,20})[ (]?42[0-9]|529 '

# is_rate_limited <output_file> <rc> -> 0 se a chamada ao claude bateu num limite.
# GATE DUPLO por design (distingue limite de erro real):
#   1. rc != 0  — a chamada FALHOU. Um run que só *menciona* "rate limit" no
#      texto (ex.: ticket sobre implementar rate limiting) sai com rc=0 e NUNCA
#      dispara adiamento.
#   2. o output casa RATE_LIMIT_REGEX (case-insensitive).
is_rate_limited() {
  local out="$1" rc="${2:-1}"
  [ "$rc" != 0 ] || return 1
  [ -f "$out" ] || return 1
  LC_ALL=C grep -qiE "$RATE_LIMIT_REGEX" "$out"
}

# --- Cooldown compartilhado ---------------------------------------------------
# Arquivo (epoch de expiração) que sinaliza "não dispare novos runs até lá".
# Vive em runs/ (efêmero). Escrito quando um ticket é adiado por limite; lido
# pelo local-loop para encerrar cedo e não bater no mesmo limite no disparo
# seguinte.
COOLDOWN_FILE="$ROOT/$CFG_RUNS_DIR/.cooldown-until"

# cooldown_arm -> grava (agora + cooldown_minutes, default 60) no COOLDOWN_FILE.
cooldown_arm() {
  local mins now until
  mins="$(cfg '.cooldown_minutes' 2>/dev/null)"
  case "$mins" in ''|null|*[!0-9]*) mins=60 ;; esac
  now="$(date +%s 2>/dev/null || echo 0)"
  until=$((now + mins * 60))
  mkdir -p "$(dirname "$COOLDOWN_FILE")" 2>/dev/null || true
  echo "$until" > "$COOLDOWN_FILE" 2>/dev/null || true
  log "  cooldown armado: sem novos runs por ${mins}min (até epoch $until)"
}

# cooldown_active -> 0 se o cooldown ainda está valendo (agora < expiração).
cooldown_active() {
  [ -f "$COOLDOWN_FILE" ] || return 1
  local until now
  until="$(cat "$COOLDOWN_FILE" 2>/dev/null || echo 0)"
  case "$until" in ''|*[!0-9]*) return 1 ;; esac
  now="$(date +%s 2>/dev/null || echo 0)"
  [ "$now" -lt "$until" ]
}

# cooldown_remaining_min -> minutos (arredondados p/ cima) até o cooldown expirar.
cooldown_remaining_min() {
  local until now
  until="$(cat "$COOLDOWN_FILE" 2>/dev/null || echo 0)"
  case "$until" in ''|*[!0-9]*) echo 0; return ;; esac
  now="$(date +%s 2>/dev/null || echo 0)"
  local rem=$(( (until - now + 59) / 60 ))
  [ "$rem" -lt 0 ] && rem=0
  echo "$rem"
}

# --- PAUSA MANUAL (estado de segurança mora em ARQUIVO) -----------------------
# Sentinela em disco. Env var morre com o processo — no comarka-os isso custou
# um "pausar a fila" que só teve saída matando processo a mão, porque a variável
# só existia no ambiente da invocação.
#
# DOIS caminhos, de propósito:
#   CFG_PAUSAR_FILE  o do config (`pausar_file`), no checkout PRINCIPAL — é o que
#                    a doutrina, o pré-voo (cat. 8) e o `orq pausar` usam, e o
#                    que vale como fonte única.
#   PAUSA_FILE       o sentinela v1, relativo à raiz de EXECUÇÃO. Continua sendo
#                    lido para que uma pausa já colocada por alguém não seja
#                    silenciosamente ignorada por esta mudança.
# Qualquer um dos dois presente = pausado.
CFG_PAUSAR_FILE="$MAIN_CHECKOUT/$(cfg '.pausar_file')"
PAUSA_FILE="$ROOT/docs/fila/.orq-pause"

# pausa_ativa -> 0 se a fila está pausada.
pausa_ativa() { [ -f "$CFG_PAUSAR_FILE" ] || [ -f "$PAUSA_FILE" ]; }

# pausa_motivo -> conteúdo do sentinela que estiver presente.
pausa_motivo() {
  local f
  for f in "$CFG_PAUSAR_FILE" "$PAUSA_FILE"; do
    [ -f "$f" ] && { cat "$f" 2>/dev/null || true; return 0; }
  done
  echo "sem motivo registrado"
}

# --- Interrupção de ambiente (ADAPTAÇÃO 2) -----------------------------------
# Falha de AMBIENTE da máquina — sono, rede, sessão caindo — distinta de limite
# de cota. Não arma cooldown: o próximo disparo pode rodar na hora.
# No comarka-os isso nasceu de um attempt que saiu com "API Error: Your computer
# went to sleep mid-response", diff 0, e o harness contou como reprovação de
# mérito, queimando o retry final de um ticket que já tinha passado em todos os
# critérios mecânicos duas vezes.
#
# ADAPTAÇÃO: politica_adiamento.causas_que_adiam deste repo lista 6 causas. As
# de rede e de sessão ganharam padrões explícitos aqui — o regex de lá cobria
# ECONNRESET/ETIMEDOUT/socket hang up/network error, mas nada de sessão expirada
# nem de conexão recusada.
INTERRUPCAO_REGEX='went to sleep|API Error|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|EPIPE|socket hang up|network error|connection (reset|refused|closed|error)|fetch failed|session expired|sess[aã]o expirada|invalid session|session not found|not authenticated|please (log ?in|sign ?in) again|reauthenticate|token expired'

# is_interrompido <output_file> <rc> -> 0 se foi interrupção de ambiente.
# GATE DUPLO igual ao is_rate_limited: exige rc!=0 E casamento de texto, para
# que um ticket que MENCIONE "API Error" no código não dispare adiamento.
is_interrompido() {
  local out="$1" rc="${2:-1}"
  [ "$rc" != 0 ] || return 1
  [ -f "$out" ] || return 1
  LC_ALL=C grep -qiE "$INTERRUPCAO_REGEX" "$out"
}

# --- Envelope ausente (A9) ---------------------------------------------------
# Toda chamada paga do harness passa --output-format json, e um `claude -p` que
# CHEGOU a rodar sempre imprime o envelope — inclusive quando o desfecho é erro
# (`is_error:true` com a mensagem em `.result`; medido nesta máquina no CLI
# 2.1.259, tanto para 429 quanto para conexão recusada). Saída VAZIA com rc!=0
# é a assinatura de um CLI que morreu ANTES de falar: sem login, credencial
# expirada, binário ausente, processo morto por fora.
#
# Nada disso é defeito do diff. Sem esta regra, o caminho caía em `exit N` =>
# reprovado por criterio_qualidade e QUEIMAVA retry de um ticket que nunca
# chegou a ser julgado — o mesmo desenho de falha do rc=130.
#
# Contrapartida aceita e deliberada: com login caído o preflight passa a ADIAR
# (com cooldown) em vez de abortar. Adiar se recupera sozinho no próximo
# disparo; reprovação, não.
#
# Como o claude_run junta stdout+stderr no mesmo arquivo, "vazio" aqui é o
# arquivo inteiro sem um byte — erro de uso do CLI (`unknown option`) escreve em
# stderr, cai no arquivo e NÃO passa por aqui.
sem_envelope() {
  local out="$1" rc="${2:-1}"
  [ "$rc" != 0 ] || return 1
  [ ! -s "$out" ]
}

# is_adiavel <output_file> <rc> -> 0 se o desfecho deve ser ADIADO (não reprova).
# Cobre as 6 causas de politica_adiamento.causas_que_adiam:
#   timeout de claude_timeout_secs -> rc 124 (normalizado pelo claude_run)
#   gate interrompido no meio      -> rc 129/130 (morto por fora) ou is_interrompido
#   erro de conexão, sessão expirada -> is_interrompido
#   rate limit, quota estourada      -> is_rate_limited
# Nenhuma delas é defeito do código, então nenhuma queima retry.
is_adiavel() {
  local out="$1" rc="${2:-1}"
  [ "$rc" = 124 ] && return 0    # claude_run cortou por timeout (normalizado p/ 124)
  # 129 SIGHUP (terminal fechou), 130 SIGINT (Ctrl-C / sessão interrompida):
  # o agente foi MORTO por fora, não falhou por mérito. No comarka-os um ticket
  # saiu 3x com rc=130 e diff 0 em ~1s cada, queimando os dois retries e a
  # tentativa final em 37 segundos, sem nenhum defeito de código.
  { [ "$rc" = 129 ] || [ "$rc" = 130 ]; } && return 0
  sem_envelope "$out" "$rc" && return 0   # o CLI não chegou a emitir envelope
  is_interrompido "$out" "$rc" && return 0
  is_rate_limited "$out" "$rc"
}

# mark_adiado <arquivo_ticket> <origem> [detalhe]
# Desfecho ADIADO: status VOLTA a pendente (nunca bloqueado), nota com
# timestamp, cooldown armado. NÃO mexe em retries — quem conta retry é o
# drive_ticket, e o caminho de adiamento nunca passa por lá, então a tentativa
# não é consumida.
mark_adiado() {
  local file="$1" origem="${2:-executor}" detalhe="${3:-limite da sessão}" ts id
  ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || echo '?')"
  id="$(ticket_field "$file" '.id')"
  ticket_set_status "$file" "pendente"
  ticket_set_nota "$file" "adiado ($origem) por $detalhe em $ts — retomará no próximo disparo"
  ticket_commit "$file" "fila: $id adiado ($origem)"
  cooldown_arm
  log "  adiado: $detalhe — retomará no próximo disparo (origem: $origem, $ts)"
}

# --- DECISÃO PENDENTE (o que a máquina não pode decidir volta para o dono) ----
# Uma LINHA por pendência na tabela de docs/fila/decisoes-pendentes.md (regra 15
# e §1 de autoalimentacao). Nunca reescreve o arquivo: acrescenta uma linha e
# DEDUPLICA por ticket + pergunta — a mesma drenagem pode voltar ao mesmo ticket
# e uma tabela com a pendência repetida é uma tabela que ninguém lê.
#
# O `|` é o separador da tabela: qualquer um vindo do conteúdo vira `/`, senão a
# linha quebra a coluna e a pendência some da renderização.
CFG_DECISOES_FILE="$MAIN_CHECKOUT/$(cfg '.decisoes_file')"

# decisao_pendente <origem> <ticket-ou-frente> <pergunta> <o-que-a-maquina-viu>
decisao_pendente() {
  local origem="$1" alvo="$2" pergunta="$3" visto="$4" linha
  local esc_p esc_v
  esc_p="$(printf '%s' "$pergunta" | tr '|\n' '/ ')"
  esc_v="$(printf '%s' "$visto"    | tr '|\n' '/ ')"
  linha="| $(hoje) | $origem | $alvo | $esc_p | $esc_v |"
  if [ -f "$CFG_DECISOES_FILE" ] && grep -Fqx "$linha" "$CFG_DECISOES_FILE" 2>/dev/null; then
    log "  decisão pendente já registrada para $alvo — nada a acrescentar"
    return 0
  fi
  [ -f "$CFG_DECISOES_FILE" ] || {
    log "  decisão pendente: $CFG_DECISOES_FILE não existe — nada escrito"
    return 0
  }
  printf '%s\n' "$linha" >> "$CFG_DECISOES_FILE" 2>/dev/null || return 0
  git -C "$MAIN_CHECKOUT" add -- "$CFG_DECISOES_FILE" 2>/dev/null || true
  git -C "$MAIN_CHECKOUT" diff --cached --quiet -- "$CFG_DECISOES_FILE" 2>/dev/null || \
    git -C "$MAIN_CHECKOUT" commit -q -m "fila: decisão pendente ($alvo)" -- "$CFG_DECISOES_FILE" 2>/dev/null || true
  event "$alvo" DECISAO_PENDENTE "origem=$origem"
  log "  decisão pendente registrada: $alvo"
  return 0
}

# --- NOTIFICAÇÃO DE FIM DE DRENAGEM (contrato §4) -----------------------------
# "Acabou?" não pode exigir polling — polling manual vira não olhar.
#
# FALLBACK EM ARQUIVO SEMPRE, inclusive quando o canal nativo funciona. A
# armadilha conhecida é o contrário: relatório que só existe no canal, e no dia
# em que o canal falha (credencial, máquina sem GUI, sessão do launchd sem
# acesso ao Notification Center) ninguém descobre que a drenagem terminou —
# nem depois, porque não sobrou registro.
NOTIF_FILE="$RUNS_BASE/notificacoes.log"

# --- PEÇA 13: notificação só quando houve o que notificar ---------------------
# Cartão que chega quando nada aconteceu treina o operador a ignorar o cartão que
# importa. Em 07/09 11:0x o launchd cuspiu "0 aprovados · duração 0min · último
# —" a cada tick enquanto o 240 ainda rodava: a drenagem não achava processável,
# encerrava em 0 e notificava mesmo assim.
#
# A regra tem duas metades, e a segunda é a que não pode virar spam:
#   1. processou ao menos um ticket (aprovado, bloqueado, adiado, refatiado ou
#      EXECUTOR_MORREU) -> notifica SEMPRE;
#   2. fila sem processável -> notifica só na PRIMEIRA vez desde a última
#      drenagem que processou. Daí o marcador em disco: a memória tem de
#      sobreviver ao fim do processo, porque cada tick do launchd é um processo
#      novo e a repetição é exatamente o que se quer calar.
# Qualquer outro fim com zero processados (pausa, cooldown, sem progresso) cala:
# nenhum deles é "a fila acabou", e quem pausou já sabe que pausou.
NOTIF_VAZIA_FILE="$RUNS_BASE/.notificacao-fila-vazia"

# MOTIVO do fim de drenagem por fila vazia. Constante compartilhada porque a
# decisão de notificar compara com ela: string repetida em dois arquivos é dois
# arquivos que divergem no dia em que alguém reescreve a frase.
MOTIVO_FILA_VAZIA='sem ticket processável'

# contar_eventos <EVENTO> -> quantas linhas da trilha são desse evento.
# Serve para medir o que aconteceu DURANTE um trecho: conta antes, conta depois.
contar_eventos() {
  local n
  n="$(grep -c " ${1:-} " "$EVENTS_FILE" 2>/dev/null)" || n=0
  case "$n" in ''|*[!0-9]*) n=0 ;; esac
  printf '%s\n' "$n"
}

# deve_notificar <processados> <motivo_ocioso> -> rc 0 = notifica.
#
# Além de decidir, MANTÉM o marcador — decisão e memória no mesmo lugar para que
# não exista caminho que notifique sem lembrar, nem que lembre sem notificar.
deve_notificar() {
  local processados="${1:-0}" motivo="${2:-}"
  case "$processados" in ''|*[!0-9]*) processados=0 ;; esac
  if [ "$processados" -gt 0 ]; then
    rm -f "$NOTIF_VAZIA_FILE" 2>/dev/null || true
    return 0
  fi
  [ "$motivo" = "$MOTIVO_FILA_VAZIA" ] || return 1
  if [ -e "$NOTIF_VAZIA_FILE" ]; then return 1; fi
  mkdir -p "$RUNS_BASE" 2>/dev/null || true
  : > "$NOTIF_VAZIA_FILE" 2>/dev/null || true
  return 0
}

# notificar_fim <aprovados> <bloqueados> <adiados> <dur_min>
notificar_fim() {
  local ap="${1:-0}" bl="${2:-0}" ad="${3:-0}" dur="${4:-0}" titulo corpo ultimo canal
  ultimo="$(jq -r '.ultimo // "—"' "$STATUS_STATE" 2>/dev/null || echo '—')"
  titulo="Orquestrador CI: $ap aprovados, $bl bloqueados"
  corpo="duração ${dur}min · adiados $ad · último: ${ultimo:-—}"
  # 1) arquivo, sempre e primeiro: é a única entrega garantida.
  mkdir -p "$RUNS_BASE" 2>/dev/null || true
  printf '%s | %s | %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z' 2>/dev/null || echo '?')" "$titulo" "$corpo" \
    >> "$NOTIF_FILE" 2>/dev/null || true

  # 2) canal nativo, best-effort.
  canal="$(cfg '.canal_notificacao' 2>/dev/null || echo '')"
  if [ "$canal" != notificacao_nativa ]; then
    log "notificação: canal '$canal' não é nativo — só arquivo ($NOTIF_FILE)"
    return 0
  fi
  if ! command -v osascript >/dev/null 2>&1; then
    log "notificação: osascript ausente — só arquivo ($NOTIF_FILE)"
    return 0
  fi
  # Aspas e barras quebram o literal do AppleScript: saem antes de entrar.
  local t c
  t="$(printf '%s' "$titulo" | tr -d '"\\')"
  c="$(printf '%s' "$corpo"  | tr -d '"\\')"
  if osascript -e "display notification \"$c\" with title \"$t\"" >/dev/null 2>&1; then
    log "notificação: enviada (e registrada em $NOTIF_FILE)"
  else
    log "notificação: osascript falhou — vale o arquivo ($NOTIF_FILE)"
  fi
  return 0
}

# --- ORÇAMENTO E CUSTO (regra 17: orçamento é GATE, não relatório) ------------
# Contabilidade real, por script, a partir do usage que o CLI devolve. Os NOMES
# dos campos vêm do config (`orcamento.campos_usage`), confirmados por sondagem
# nesta máquina — nunca chutados aqui: mudou o CLI, muda o config, não o código.
CFG_CUSTO_FILE="$MAIN_CHECKOUT/$(cfg '.orcamento.custo_file')"

hoje()        { date '+%Y-%m-%d' 2>/dev/null || echo '1970-01-01'; }
proximo_dia() { date -v+1d '+%Y-%m-%d' 2>/dev/null || date -d '+1 day' '+%Y-%m-%d' 2>/dev/null || hoje; }

# custo_registrar <papel> <ticket> <attempt> <arquivo-de-saida-do-claude>
# Acrescenta um registro em dias.<AAAA-MM-DD>[]. FALHA DE PARSE NUNCA BLOQUEIA:
# loga e segue. Custo é contabilidade; barrar um ticket porque o usage veio
# ilegível troca um problema de medição por um problema de entrega.
custo_registrar() {
  local papel="$1" ticket="$2" attempt="$3" out="$4"
  local dia reg="" tmp p_custo p_in p_out p_cache
  escrita_de_teste_permitida "$CFG_CUSTO_FILE" || return 0
  [ -s "$out" ] || { log "  custo: saída vazia — sem usage para registrar ($papel/$ticket)"; return 0; }
  p_custo="$(cfg '.orcamento.campos_usage.custo_usd')"
  p_in="$(cfg '.orcamento.campos_usage.tokens_in')"
  p_out="$(cfg '.orcamento.campos_usage.tokens_out')"
  p_cache="$(cfg '.orcamento.campos_usage.tokens_cache')"
  dia="$(hoje)"
  # O arquivo carrega stdout+stderr juntos (claude_run redireciona os dois), então
  # nem sempre é JSON puro. Duas tentativas, nesta ordem: arquivo inteiro como
  # fluxo de JSON; senão, a última linha que É um objeto JSON.
  local bruto
  bruto="$(jq -s -c 'map(select(type == "object")) | last // empty' "$out" 2>/dev/null || true)"
  [ -n "$bruto" ] || bruto="$(grep -o '^{.*}$' "$out" 2>/dev/null | tail -1 || true)"
  if [ -n "$bruto" ]; then
    reg="$(printf '%s' "$bruto" | jq -c --arg d "$dia" --arg pa "$papel" --arg tk "$ticket" \
            --argjson at "${attempt:-0}" --arg pc "$p_custo" --arg pi "$p_in" --arg po "$p_out" --arg pch "$p_cache" '
          {data: $d, papel: $pa, ticket: $tk, attempt: $at,
           tokens_in:    ((getpath($pi  | split("."))) // 0),
           tokens_out:   ((getpath($po  | split("."))) // 0),
           tokens_cache: ((getpath($pch | split("."))) // 0),
           custo_usd:    ((getpath($pc  | split("."))) // 0)}' 2>/dev/null || true)"
  fi
  if [ -z "$reg" ]; then
    log "  custo: usage ilegível em $out — seguindo sem registrar (custo nunca bloqueia ticket)"
    return 0
  fi
  mkdir -p "$(dirname "$CFG_CUSTO_FILE")" 2>/dev/null || true
  [ -s "$CFG_CUSTO_FILE" ] || echo '{"dias":{}}' > "$CFG_CUSTO_FILE" 2>/dev/null || return 0
  tmp="$(mktemp 2>/dev/null)" || return 0
  if jq --arg d "$dia" --argjson r "$reg" '.dias[$d] = ((.dias[$d] // []) + [$r])' \
       "$CFG_CUSTO_FILE" > "$tmp" 2>/dev/null; then
    mv -f "$tmp" "$CFG_CUSTO_FILE" 2>/dev/null || rm -f "$tmp"
    log "  custo: $papel/$ticket US$ $(printf '%s' "$reg" | jq -r '.custo_usd') · $(printf '%s' "$reg" | jq -r '.tokens_in + .tokens_out') tok"
  else
    rm -f "$tmp"
    log "  custo: não consegui gravar $CFG_CUSTO_FILE — seguindo"
  fi
  return 0
}

# orcamento_veredito <ticket-id> -> "ok" | "dia" | "ticket"
# Roda ANTES de cada chamada cara. "dia": teto diário (USD ou tokens) atingido.
# "ticket": o que este ticket já consumiu atingiu orcamento.usd_ticket, então a
# PRÓXIMA tentativa é a que estouraria.
# FAIL-OPEN, com aviso. O ledger é MEDIÇÃO: ausente, vazio, corrompido ou com
# forma inesperada, o veredito é "ok" e a fila segue — parar a entrega porque a
# contabilidade quebrou troca um problema por um pior. O aviso não é decoração:
# um "ok" silencioso de arquivo ilegível é indistinguível de um "ok" de consumo
# zero, e é assim que um teto deixa de valer sem ninguém notar.
orcamento_veredito() {
  local id="${1:-—}" v
  if [ ! -s "$CFG_CUSTO_FILE" ]; then
    log "  orçamento: sem ledger legível em $CFG_CUSTO_FILE — veredito ok (fail-open)"
    echo ok; return 0
  fi
  v="$(jq -r --arg d "$(hoje)" --arg t "$id" \
     --argjson tu "$(cfg '.orcamento.usd_dia')" \
     --argjson tt "$(cfg '.orcamento.tokens_dia')" \
     --argjson ut "$(cfg '.orcamento.usd_ticket')" '
    (.dias[$d] // []) as $r
    | ($r | map(.custo_usd // 0) | add // 0) as $usd
    | ($r | map((.tokens_in // 0) + (.tokens_out // 0)) | add // 0) as $tok
    | ($r | map(select(.ticket == $t) | .custo_usd // 0) | add // 0) as $tusd
    | if $usd >= $tu or $tok >= $tt then "dia"
      elif $tusd >= $ut then "ticket"
      else "ok" end' "$CFG_CUSTO_FILE" 2>/dev/null || true)"
  case "$v" in
    ok|dia|ticket) printf '%s\n' "$v" ;;
    *) log "  orçamento: ledger ilegível em $CFG_CUSTO_FILE — veredito ok (fail-open; custo nunca para a fila)"
       echo ok ;;
  esac
}

# custo_resumo_dia -> "US$ 7.40/50 · 38000/5000000 tok" (para evento e STATUS).
custo_resumo_dia() {
  [ -s "$CFG_CUSTO_FILE" ] || { printf 'US$ 0/%s' "$(cfg '.orcamento.usd_dia')"; return 0; }
  jq -r --arg d "$(hoje)" --argjson tu "$(cfg '.orcamento.usd_dia')" --argjson tt "$(cfg '.orcamento.tokens_dia')" '
    (.dias[$d] // []) as $r
    | "US$ \((($r | map(.custo_usd // 0) | add // 0) * 100 | round) / 100)/\($tu) · \($r | map((.tokens_in // 0) + (.tokens_out // 0)) | add // 0)/\($tt) tok"
  ' "$CFG_CUSTO_FILE" 2>/dev/null || printf 'US$ ?'
}

# mark_adiado_orcamento <arquivo_ticket> <escopo: dia|ticket>
# ADIADO, não reprovado: volta a pendente com adiado_ate = próximo dia e NÃO
# passa pelo contador de retry (regra 3). Sem isso o teto de orçamento comeria
# as tentativas de um ticket que nunca chegou a rodar.
mark_adiado_orcamento() {
  local file="$1" escopo="${2:-dia}" id ate token
  id="$(ticket_field "$file" '.id')"
  ate="$(proximo_dia)"
  case "$escopo" in
    ticket) token=orcamento_ticket ;;
    *)      token=orcamento ;;
  esac
  ticket_set "$file" '.status = "pendente" | .adiado_ate = $a | .notas_status = $n' \
    --arg a "$ate" --arg n "$token — teto de orçamento atingido em $(hoje); retoma em $ate"
  ticket_commit "$file" "fila: $id adiado ($token)"
  event "$id" ORCAMENTO "escopo=$escopo" "adiado_ate=$ate" "consumo=$(custo_resumo_dia)"
  log "  ADIADO por orçamento ($token): retoma em $ate, sem consumir tentativa"
}

# --- Timeout portável para `claude -p` (macOS não tem coreutils `timeout`) -----
# claude_run <workdir> <outfile> <secs> -- <args de claude...>
# Roda `claude <args>` a partir de <workdir>, com stdout+stderr em <outfile>, e
# CORTA em <secs> via watchdog puro-bash (TERM, depois KILL). Retorna o rc do
# claude; se foi cortado pelo watchdog, NORMALIZA para 124 (convenção do timeout)
# para o is_adiavel tratar como adiamento de infra, não reprova.
claude_run() {
  local dir="$1" outf="$2" secs="$3"; shift 3
  [ "${1:-}" = "--" ] && shift
  local rc=0
  # Process group próprio: o watchdog mata o GRUPO, não só a casca.
  # Sem `set -m` + `exec`, $pid é o subshell e o `claude` filho vira órfão
  # (PPID 1), seguindo a queimar cota depois do desfecho por timeout.
  ( set -m; cd "$dir" && exec claude "$@" ) > "$outf" 2>&1 &
  local pid=$!
  ( sleep "$secs"
    kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
    sleep 10
    kill -KILL -"$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null
  ) >/dev/null 2>&1 &
  local wpid=$!
  wait "$pid" 2>/dev/null || rc=$?
  # claude terminou sozinho: mata o watchdog para não segurar o run 30min.
  kill "$wpid" 2>/dev/null || true
  wait "$wpid" 2>/dev/null || true
  # 143 = TERM, 137 = KILL: foi o watchdog que cortou => timeout.
  if [ "$rc" = 143 ] || [ "$rc" = 137 ]; then rc=124; fi
  return "$rc"
}

# --- Veredicto mecânico de critério (código verifica, modelo julga) -----------
# criterio_match <saida> <espera> -> 0 se casa. Regra:
#   - 'espera' puramente numérica  => IGUALDADE exata (evita "13" casar "3");
#   - 'espera' não-numérica        => igualdade OU match como regex ERE.
# Ambos os lados são trimados (espaços das pontas). Multi-linha: no caso regex,
# casa se QUALQUER linha bater; no caso numérico, compara a saída trimada inteira.
criterio_match() {
  local out esp
  out="$(printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  esp="$(printf '%s' "$2" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  case "$esp" in
    ''|*[!0-9]*) : ;;                       # não é número puro -> segue p/ regex
    *) [ "$out" = "$esp" ]; return $? ;;     # número puro -> igualdade exata
  esac
  [ "$out" = "$esp" ] && return 0
  printf '%s' "$out" | grep -qE -- "$esp"
}

# --- Normalização de motivo (circuit breaker) ---------------------------------
# Dois motivos "iguais na essência" (mesma falha, attempt/números diferentes)
# devem colidir. Minúsculas, sem dígitos, espaços colapsados.
norm_motivo() {
  printf '%s' "$1" | tr 'A-Z' 'a-z' | tr -cs 'a-z ' ' ' | tr -s ' ' \
    | sed -e 's/^ *//' -e 's/ *$//'
}

# --- Preflight de env ---------------------------------------------------------
# env_key_present <KEY> -> 0 se a chave existe (não-vazia) no processo OU está
# definida em MAIN_CHECKOUT/.env.local. Aceita o prefixo NEXT_PUBLIC_ (ex.:
# SUPABASE_URL casa NEXT_PUBLIC_SUPABASE_URL, que é a chave real do projeto).
env_key_present() {
  local k="$1" v
  v="$(printenv "$k" 2>/dev/null || true)"
  [ -n "$v" ] && return 0
  [ -f "$MAIN_CHECKOUT/.env.local" ] || return 1
  grep -qE "^(NEXT_PUBLIC_)?${k}=[^[:space:]]" "$MAIN_CHECKOUT/.env.local"
}

# env_value <KEY> -> imprime o VALOR (não só presença) do processo OU de
# MAIN_CHECKOUT/.env.local. Aceita o prefixo NEXT_PUBLIC_ (igual env_key_present).
# Tira aspas e CR/espaço das pontas. Usado pela trava de identidade de ambiente.
env_value() {
  local k="$1" v
  v="$(printenv "$k" 2>/dev/null || true)"
  if [ -z "$v" ] && [ -f "$MAIN_CHECKOUT/.env.local" ]; then
    v="$(grep -E "^(NEXT_PUBLIC_)?${k}=" "$MAIN_CHECKOUT/.env.local" | head -1 | cut -d= -f2-)"
  fi
  v="${v%$'\r'}"; v="${v#\"}"; v="${v%\"}"; v="${v#\'}"; v="${v%\'}"
  printf '%s' "$v"
}

# --- Telemetria por attempt (runs/<id>/meta.json = array de tentativas) --------
# write_meta <runs_id_dir> <attempt> <model> <dur_secs> <diff_lines> <resultado>
# Anexa um objeto ao array em <dir>/meta.json (cria [] se faltar). Best-effort:
# telemetria nunca derruba o run.
write_meta() {
  local dir="$1" attempt="$2" model="$3" dur="$4" difflines="$5" resultado="$6"
  local metaf="$dir/meta.json" ts tmp
  ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || echo '?')"
  mkdir -p "$dir" 2>/dev/null || true
  [ -s "$metaf" ] || echo '[]' > "$metaf"
  tmp="$(mktemp)"
  if jq --argjson at "${attempt:-0}" --arg m "${model:-?}" \
        --argjson d "${dur:-0}" --argjson dl "${difflines:-0}" \
        --arg r "${resultado:-?}" --arg ts "$ts" \
        '. + [{attempt:$at, model:$m, claude_dur_secs:$d, diff_lines:$dl, resultado:$r, ts:$ts}]' \
        "$metaf" > "$tmp" 2>/dev/null; then
    mv "$tmp" "$metaf"
  else
    rm -f "$tmp"
  fi
}
