#!/usr/bin/env bash
# local-loop.sh — DRENAGEM do Orquestrador Autônomo (ORQ-06).
#
# Chama o executor em série enquanto houver ticket processável; quando um ticket
# é aprovado, é AQUI que ele vira merge em staging-auto. O executor aprova, a
# drenagem mergeia — separação de propósito: quem julga não publica.
#
# Portado de comarka-os, sem: writeback Notion e relatório por email.
# canal_notificacao deste repo = log em arquivo, só isso.
#
# GUARDS INVIOLÁVEIS:
#   - NUNCA mergeia nem faz checkout de branch_protegida (main). Guard explícito
#     em merge_em_alvo(), testado em test-drenagem.sh.
#   - Worktree de staging sujo ABORTA o merge (não arrisca).
#   - Sem push: publicar é humano (o comarka pusha por ticket; aqui não).
#
# TESTABILIDADE: com LOCAL_LOOP_SOURCED=1 o arquivo só DEFINE funções, nada roda.

set -euo pipefail
ORQ_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$ORQ_LIB_DIR/lib.sh"

# REPO resolvido por git, nunca hardcoded: o comarka fixa $HOME/Projetos/<nome>
# e isso quebra em qualquer outra máquina ou checkout.
REPO="$MAIN_CHECKOUT"
BRANCH_ALVO="$CFG_BRANCH_ALVO"
BRANCH_PROTEGIDA="$(cfg '.branch_protegida')"
LOG="$RUNS_BASE/local-loop.log"
LOCK="$RUNS_BASE/.local-loop.lock"
LOCK_MAX_AGE=7200

ts()  { date '+%Y-%m-%d %H:%M:%S%z'; }
say() { printf '[%s] %s\n' "$(ts)" "$*"; }

# --- LOCK (lock.ts do ORQ-02 decide se é órfão) ------------------------------
# Formato: linha 1 = PID, linha 2 = epoch. A decisão de "stale?" é do TS testado.
lock_stale() {
  [ -f "$LOCK" ] || return 1
  npx tsx -e "
    import {parseLockFile, isLockStale} from '$ORQ_LIB_DIR/lock.js';
    import {readFileSync} from 'node:fs';
    const l = parseLockFile(readFileSync('$LOCK','utf8'));
    if (!l) process.exit(0);
    const vivo = (pid) => { try { process.kill(pid, 0); return true } catch { return false } };
    process.exit(isLockStale(l, Math.floor(Date.now()/1000), $LOCK_MAX_AGE, vivo) ? 0 : 1);
  "
}

lock_adquirir() {
  mkdir -p "$(dirname "$LOCK")"
  if [ -f "$LOCK" ]; then
    if lock_stale; then
      say "lock órfão (pid $(head -1 "$LOCK" 2>/dev/null)) — removendo"
      event '---' RECUPERADO "motivo=lock-orfao" "pid=$(head -1 "$LOCK" 2>/dev/null || echo '?')"
      rm -f "$LOCK"
    else
      say "outro run vivo (pid $(head -1 "$LOCK" 2>/dev/null)) — encerrando"
      return 1
    fi
  fi
  printf '%s\n%s\n' "$$" "$(date +%s)" > "$LOCK"
  trap 'rm -f "$LOCK"' EXIT
  return 0
}

# --- MERGE EM staging-auto ---------------------------------------------------
# GUARD: mergear na branch protegida é recusado antes de qualquer git. Não é
# comentário — é a condição que test-drenagem.sh exercita.
merge_em_alvo() {
  local id="$1" stwt="$2" alvo_atual branch
  branch="frente/$id"
  if [ "$BRANCH_ALVO" = "$BRANCH_PROTEGIDA" ]; then
    say "ABORTA: branch_alvo='$BRANCH_ALVO' é a branch PROTEGIDA — merge recusado"
    return 2
  fi
  alvo_atual="$(git -C "$stwt" rev-parse --abbrev-ref HEAD)"
  if [ "$alvo_atual" = "$BRANCH_PROTEGIDA" ]; then
    say "ABORTA: worktree de merge está em '$alvo_atual' (protegida) — merge recusado"
    return 2
  fi
  if [ -n "$(git -C "$stwt" --no-optional-locks status --porcelain)" ]; then
    say "ABORTA: worktree de $BRANCH_ALVO sujo — não arrisca merge"
    return 1
  fi
  branch_existe "$branch" || { say "  branch $branch não existe — nada a mergear"; return 1; }
  # DUAS marcas no mesmo commit, e nenhuma substitui a outra:
  #   "(ticket <id>)" no assunto — é o que `reconcile_merged` já procura;
  #   trailer "Orq-Ticket: <id>" em parágrafo próprio — é o que a QUARENTENA da
  #   sentinela e o relatório leem (`git log --grep`, autoalimentacao §4).
  # O NOME do trailer vem do config (`executor.trailer_commit`): trailer é
  # contrato entre o loop e quem lê o git depois, e contrato mora no config.
  local trailer; trailer="$(cfg '.executor.trailer_commit')"
  if git -C "$stwt" merge --no-ff "$branch" \
       -m "orq: $branch (ticket $id) em $BRANCH_ALVO" -m "$trailer: $id" >/dev/null 2>&1; then
    say "  merge ok: $branch -> $BRANCH_ALVO ($(git -C "$stwt" rev-parse --short HEAD))"
    return 0
  fi
  git -C "$stwt" merge --abort >/dev/null 2>&1 || true
  say "  ERRO: merge de $branch falhou (abortado, $BRANCH_ALVO intacta)"
  return 1
}

pendentes_processaveis() {
  local f n=0
  for f in $(ticket_files); do
    [ "$(ticket_field "$f" '.status')" = "pendente" ] || continue
    deps_resolvidas "$f" >/dev/null 2>&1 && n=$((n + 1))
  done
  echo "$n"
}

# Isolada para ser substituível por stub nos testes.
run_executor_once() {
  bash "$ORQ_LIB_DIR/executor.sh" "$@"
}

# --- DRENAGEM ----------------------------------------------------------------
drenar() {
  local stwt drenados=0 bloqueados=0 adiados=0 refatiados=0 prox prox_id st t0 dur orc motivo_ocioso=''
  local mortos_antes mortos processados
  stwt="$(ensure_staging_worktree)"
  t0="$(date +%s)"
  # EXECUTOR_MORREU conta como ticket PROCESSADO (peça 13), e a drenagem não tem
  # como sabê-lo pelo rc: o executor morre num processo filho e o registro dele é
  # a trilha. Conta antes, conta depois — a diferença é o que morreu AQUI.
  mortos_antes="$(contar_eventos EXECUTOR_MORREU)"
  say "drenagem iniciando (alvo=$BRANCH_ALVO, worktree=$stwt)"
  event '---' DRENAGEM_INICIO "alvo=$BRANCH_ALVO" "processaveis=$(pendentes_processaveis)"
  status_set "estado=executando" "fase=drenagem" "ticket=—" "motivo="
  while :; do
    if pausa_ativa; then
      say "PAUSA ativa: $(pausa_motivo) — encerrando entre tickets"
      motivo_ocioso=pausado; break
    fi
    if cooldown_active; then
      say "COOLDOWN ~$(cooldown_remaining_min)min — encerrando; próximo disparo retoma"
      motivo_ocioso="cooldown ~$(cooldown_remaining_min)min"; break
    fi

    prox="$(proximo_pendente)"
    [ -n "$prox" ] || {
      say "fila sem ticket processável — encerrando (aprovados: $drenados)"
      motivo_ocioso="$MOTIVO_FILA_VAZIA"; break
    }
    prox_id="$(ticket_field "$prox" '.id')"

    # GATE DE ORÇAMENTO (regra 17), antes de gastar processo com o executor.
    # "dia": encerra a drenagem em ocioso. "ticket": adia SÓ este e segue com os
    # outros — o teto por ticket não é motivo para parar a fila inteira.
    orc="$(orcamento_veredito "$prox_id")"
    if [ "$orc" = dia ]; then
      say "ORÇAMENTO: teto diário atingido ($(custo_resumo_dia)) — adiando $prox_id e encerrando"
      mark_adiado_orcamento "$prox" dia
      adiados=$((adiados + 1)); motivo_ocioso=orcamento; break
    elif [ "$orc" = ticket ]; then
      say "ORÇAMENTO: $prox_id já consumiu o teto por ticket — adiando e seguindo para o próximo"
      mark_adiado_orcamento "$prox" ticket
      adiados=$((adiados + 1)); continue
    fi

    say "ticket $prox_id ($(pendentes_processaveis) processáveis)"

    run_executor_once --ticket "$prox" && say "  executor rc=0" || say "  executor rc!=0 (não fatal; reavalia a fila)"

    st="$(ticket_field "$prox" '.status')"
    if [ "$st" = "aguardando_merge" ]; then
      status_set "fase=merge"
      if merge_em_alvo "$prox_id" "$stwt"; then
        ticket_set_status "$prox" done
        ticket_set_nota "$prox" "mergeado em $BRANCH_ALVO pela drenagem"
        ticket_commit "$prox" "fila: $prox_id done (mergeado em $BRANCH_ALVO)"
        event "$prox_id" MERGE "alvo=$BRANCH_ALVO" "sha=$(git -C "$stwt" rev-parse --short HEAD 2>/dev/null || echo '?')"
        status_set "ultimo=$prox_id DONE $(date '+%H:%M:%S') (merge em $BRANCH_ALVO)"
        cleanup_frente "$prox_id"
        drenados=$((drenados + 1))
      else
        ticket_set_status "$prox" bloqueado
        ticket_set_nota "$prox" "aprovado mas merge em $BRANCH_ALVO falhou"
        ticket_commit "$prox" "fila: $prox_id bloqueado (merge falhou)"
        event "$prox_id" BLOQUEADO "motivo=merge_falhou"
        status_set "ultimo=$prox_id BLOQUEADO $(date '+%H:%M:%S') (merge falhou)"
        bloqueados=$((bloqueados + 1))
      fi
    elif [ "$st" = "bloqueado" ]; then
      bloqueados=$((bloqueados + 1))
    elif [ "$st" = "refatiar" ]; then
      # Nem aprovado, nem bloqueado, nem adiado: voltou por reprovação MECÂNICA
      # (regra 19) e espera decisão humana. Sem contador próprio ele sumiria do
      # placar da drenagem, que é como um ticket vira invisível.
      say "  ticket $prox_id voltou para REFATIAR — segue para o próximo"
      refatiados=$((refatiados + 1))
    elif [ "$st" = "pendente" ] && cooldown_active; then
      adiados=$((adiados + 1))
    fi

    # Anti-loop: se o ticket segue pendente sem cooldown, nada progrediu.
    if [ "$(ticket_field "$prox" '.status')" = "pendente" ] && ! cooldown_active; then
      say "  ticket $prox_id segue pendente sem cooldown (sem progresso) — encerrando"
      motivo_ocioso="sem progresso em $prox_id"; break
    fi
  done
  dur=$(( ($(date +%s) - t0 + 30) / 60 ))
  say "drenagem encerrada: $drenados aprovado(s) e mergeado(s)"
  event '---' DRENAGEM_FIM "aprovados=$drenados" "bloqueados=$bloqueados" "adiados=$adiados" \
    "refatiar=$refatiados" "dur=${dur}min"
  status_set "estado=ocioso" "fase=—" "ticket=—" "motivo=${motivo_ocioso:-drenagem encerrada}"

  # PEÇA 13: notifica só quando houve o que notificar. A decisão (e a memória do
  # "fila vazia já avisada") mora no lib.sh; aqui só se conta o que aconteceu.
  mortos=$(( $(contar_eventos EXECUTOR_MORREU) - mortos_antes ))
  [ "$mortos" -ge 0 ] || mortos=0
  processados=$(( drenados + bloqueados + adiados + refatiados + mortos ))
  if deve_notificar "$processados" "$motivo_ocioso"; then
    notificar_fim "$drenados" "$bloqueados" "$adiados" "$dur"
  else
    say "notificação: nada a notificar (0 processados, motivo '${motivo_ocioso:-—}') — silêncio"
  fi
}

cleanup_frente() {
  local id="$1" nome
  nome="$(npx tsx "$ORQ_LIB_DIR/decisao-cli.ts" "$MAIN_CHECKOUT" worktree "$id")"
  git -C "$ROOT" worktree remove --force "$WORKTREES_BASE/$nome" >/dev/null 2>&1 || true
  git -C "$ROOT" branch -D "frente/$id" >/dev/null 2>&1 || true
  return 0
}

# --- PRÉ-VOO ⚡ (peça K11a-2) -------------------------------------------------
# Roda depois do lock e da pausa, e ANTES do reconcile: em NO-GO nenhum TICKET é
# tocado e nenhum retry é consumido, que é a propriedade que o `pre-voo.mjs` do
# Actus garante. A ordem em relação ao lock é diferente da de lá de propósito:
# aqui quem protege o run alheio é o `lock_adquirir`, que sai 0 sem tocar em
# lock nenhum quando há outro vivo — então rodar o pré-voo antes dele só faria
# um run condenado gritar por cima de um run saudável. E a PAUSA vem antes de
# tudo: é a palavra do humano, e quem pausou não quer diagnóstico de ambiente.
# Nenhuma chamada paga: a sondagem de modelo é LIDA de runs/.
#
# Isolada para ser substituível por stub nos testes, como `run_executor_once`.
run_prevoo() {
  npx tsx "$ORQ_LIB_DIR/prevoo.ts" "$MAIN_CHECKOUT" 2>&1
}

prevoo_ou_sai() {
  local saida rc=0 linha token
  saida="$(run_prevoo)" || rc=$?
  if [ "$rc" = 0 ]; then
    say "pré-voo: GO ($(printf '%s' "$saida" | grep -c '^ok ') ok, $(printf '%s' "$saida" | grep -c '^info ') info)"
    return 0
  fi
  linha="$(printf '%s\n' "$saida" | grep '^NO-GO ' | head -1)"
  token="$(printf '%s' "$linha" | awk '{print $2}')"
  [ -n "$token" ] || token='?'
  say "pré-voo NO-GO: ${linha:-rc=$rc sem linha NO-GO}"
  printf '%s\n' "$saida" | while IFS= read -r l; do say "  prevoo> $l"; done
  event '---' PREVOO_NOGO "item=$token"
  notificar "Orquestrador: pré-voo NO-GO" "${linha:-rc=$rc}"
  status_set "estado=ocioso" "fase=—" "ticket=—" "motivo=prevoo_nogo $token"
  say "========== local-loop fim (pré-voo NO-GO) =========="
  exit 1
}

main_local_loop() {
  mkdir -p "$(dirname "$LOG")"
  exec >>"$LOG" 2>&1
  say "========== local-loop início (pid $$) =========="
  [ "$BRANCH_ALVO" != "$BRANCH_PROTEGIDA" ] || { say "ABORTA: branch_alvo=$BRANCH_PROTEGIDA é proibido"; exit 1; }
  lock_adquirir || exit 0
  # KILL SWITCH, leitura 1 de 2: ANTES de qualquer escrita. O reconcile mexe em
  # status de ticket, então "pausado" precisa valer antes dele — pausar e mesmo
  # assim ver a fila mudar é o que faz alguém desconfiar do kill switch. A
  # leitura 2 é no topo do laço de drenar(), entre tickets.
  if pausa_ativa; then
    say "PAUSA ativa: $(pausa_motivo) — encerrando sem tocar ticket nenhum"
    event '---' DRENAGEM_INICIO "alvo=$BRANCH_ALVO" "motivo=pausado"
    event '---' DRENAGEM_FIM "aprovados=0" "bloqueados=0" "adiados=0" "dur=0min" "motivo=pausado"
    status_set "estado=ocioso" "fase=—" "ticket=—" "motivo=pausado"
    say "========== local-loop fim (pausado) =========="
    exit 0
  fi
  # PRÉ-VOO ⚡: depois do kill switch, ANTES do reconcile — que é o primeiro
  # passo que ESCREVE em ticket. A pausa vem primeiro porque é a palavra do
  # humano: quem pausou não quer diagnóstico de ambiente, quer silêncio.
  prevoo_ou_sai
  git -C "$REPO" fetch origin --quiet 2>/dev/null || say "aviso: fetch falhou (segue offline)"
  bash "$ORQ_LIB_DIR/executor.sh" --reconcile || say "aviso: reconcile falhou (não fatal)"
  drenar
  say "========== local-loop fim =========="
}

[ "${LOCAL_LOOP_SOURCED:-0}" = 1 ] || main_local_loop
