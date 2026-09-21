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
  "${ORQ_TSX[@]}" -e "
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

# --- SEM PROGRESSO PERSISTENTE (peça 7a-3) -----------------------------------
# A memória da 7a-2 só vale dentro de UMA drenagem: no disparo seguinte o mesmo
# ticket volta a ser escolhido, aborta de novo, e nada para a repetição. No
# Comarka isso foi o 440: 19 execuções entre 18/09 e 21/09, todas com attempt
# vazio. Este contador PERSISTE entre disparos em runs/<id>/.sem-progresso
# ("N|primeira|ultima") e, no limite, BLOQUEIA o ticket.
#
# Conta SÓ a volta em que o ticket segue pendente sem cooldown. Não conta:
# adiamento (com cooldown, ou com evento ADIADO/nota "adiado" sem cooldown), e
# a volta em que a branch alvo avançou. Zera quando o ticket sai de pendente e
# quando a branch alvo avança na vez dele. Limite: `sem_progresso_limite` do
# config, 3 quando ausente ou inválida.
#
# Dois defeitos do disjuntor do Comarka que ficaram de fora de propósito: lá o
# status muda SEM commit (a árvore fica suja e o preflight do próximo ticket
# aborta), e a causa é só a última linha com ERRO|fatal|FAIL da saída. Aqui o
# bloqueio passa pelo `ticket_commit`, e a causa vem do DESFECHO que o executor
# gravou na trilha, com a saída como reserva.
sem_progresso_arquivo() { printf '%s/%s/.sem-progresso\n' "$RUNS_BASE" "$1"; }
sem_progresso_zerar()   { rm -f "$(sem_progresso_arquivo "$1")" 2>/dev/null || true; }

# sem_progresso_incrementar <id> -> imprime "N|primeira|ultima" já gravado.
sem_progresso_incrementar() {
  local f n=0 primeira agora linha
  f="$(sem_progresso_arquivo "$1")"; agora="$(ts)"; primeira="$agora"
  if [ -f "$f" ]; then
    linha="$(head -1 "$f" 2>/dev/null || true)"
    n="${linha%%|*}"; primeira="$(printf '%s' "$linha" | cut -d'|' -f2)"
    case "$n" in ''|*[!0-9]*) n=0; primeira="$agora" ;; esac
    [ -n "$primeira" ] || primeira="$agora"
  fi
  n=$((n + 1))
  if escrita_de_teste_permitida "$f"; then
    mkdir -p "$(dirname "$f")" 2>/dev/null || true
    printf '%s|%s|%s\n' "$n" "$primeira" "$agora" > "$f" 2>/dev/null || true
  fi
  printf '%s|%s|%s\n' "$n" "$primeira" "$agora"
}

# sem_progresso_limite -> inteiro >= 1; 3 quando a chave falta ou é inválida.
sem_progresso_limite() {
  local l
  l="$(cfg '.sem_progresso_limite // empty' 2>/dev/null || true)"
  case "$l" in ''|*[!0-9]*|0) l=3 ;; esac
  printf '%s\n' "$l"
}

# staging_sha -> o commit da branch alvo agora (vazio se ela não existe). A ref
# é a mesma em todo worktree do repo; lida no checkout principal.
staging_sha() { git -C "$MAIN_CHECKOUT" rev-parse -q --verify "refs/heads/$BRANCH_ALVO" 2>/dev/null || true; }

# trilha_linhas -> quantas linhas a trilha tem agora (0 se não existe).
trilha_linhas() {
  local n
  n="$(wc -l < "$EVENTS_FILE" 2>/dev/null | tr -d ' ')" || n=0
  case "$n" in ''|*[!0-9]*) n=0 ;; esac
  printf '%s\n' "$n"
}

# eventos_do_ticket_desde <n> <id> -> as linhas da trilha depois da n-ésima que
# são DESTE ticket, mais o EXECUTOR_MORREU sem ticket (o executor que morre no
# preflight ainda não sabe de quem é a vez e grava id "—").
eventos_do_ticket_desde() {
  tail -n +"$(( $1 + 1 ))" "$EVENTS_FILE" 2>/dev/null \
    | awk -v id="$2" '$2 == id || ($2 == "—" && $3 == "EXECUTOR_MORREU")' || true
}

# foi_adiado <eventos> <nota_antes> <nota_depois> -> 0 se a volta foi adiamento.
# O sinal principal é o evento ADIADO que o executor grava; a nota nova que
# começa com "adiado" é reserva, para o caminho que adia sem passar por ele.
foi_adiado() {
  printf '%s\n' "$1" | awk '$3 == "ADIADO" { achou = 1 } END { exit achou ? 0 : 1 }' && return 0
  [ "$3" != "$2" ] || return 1
  case "$3" in adiado*) return 0 ;; esac
  return 1
}

# sem_progresso_causa <eventos> <saida-do-executor> <rc> <nota_antes> <nota_depois>
# -> UMA linha dizendo por que a volta não progrediu, nesta ordem de preferência:
#   1. o desfecho na trilha: EXECUTOR_MORREU vira "executor morreu (rc, fase)"
#      mais a mensagem de erro do executor ([orq ERRO] ou fatal:) quando houver;
#      qualquer outro evento do ticket entra como está;
#   2. a nota que o executor escreveu nesta volta (ex.: "recusado: ...");
#   3. a última linha [orq ERRO] ou fatal: da saída;
#   4. a última linha com ERRO|fatal|FAIL (a régua do Comarka, só como reserva);
#   5. "executor saiu rc=N sem desfecho registrado".
sem_progresso_causa() {
  local evs="$1" out="$2" rc="$3" nota_antes="$4" nota_depois="$5" ult ev campos erro c='' r f
  ult="$(printf '%s\n' "$evs" | grep -v '^$' | tail -1 || true)"
  erro="$(grep -E '^\[orq ERRO\]|^fatal:' "$out" 2>/dev/null | tail -1 | sed 's/^\[orq ERRO\] *//' || true)"
  if [ -n "$ult" ]; then
    ev="$(printf '%s' "$ult" | awk '{print $3}')"
    campos="$(printf '%s' "$ult" | cut -d' ' -f4-)"
    if [ "$ev" = EXECUTOR_MORREU ]; then
      r="$(printf ' %s ' "$campos" | sed -n 's/.* rc=\([^ ]*\) .*/\1/p')"
      f="$(printf ' %s ' "$campos" | sed -n 's/.* fase=\([^ ]*\) .*/\1/p')"
      c="executor morreu (rc=${r:-?}, fase=${f:-?})${erro:+: $erro}"
    else
      c="$ev $campos"
    fi
  elif [ -n "$nota_depois" ] && [ "$nota_depois" != "$nota_antes" ]; then
    c="$nota_depois"
  elif [ -n "$erro" ]; then
    c="$erro"
  else
    c="$(grep -E 'ERRO|fatal|FAIL' "$out" 2>/dev/null | tail -1 || true)"
  fi
  [ -n "$c" ] || c="executor saiu rc=$rc sem desfecho registrado"
  uma_linha "$(printf '%s' "$c" | tr -d '\r')" 300
}

# --- OCIOSO QUE DIZ POR QUÊ (peça 7a-4) --------------------------------------
# O CI ficou 12 dias parado com 4 pendentes presos atrás de dependências
# bloqueadas, e a única coisa escrita, a cada disparo, era "sem ticket
# processável". A pergunta que alguém faz nessa hora é "por que cada um não
# roda?", e a resposta estava no disco o tempo todo. Agora ela vai para a
# trilha (evento OCIOSO) e para o STATUS.
#
# ocioso_razoes <tentados> <adiados> -> "<id> <razao>" por pendente, uma linha
# cada; rc 1 (saída descartável) se algum pendente for processável agora.
# Razão, nesta ordem de precedência:
#   a de `razao_nao_processavel` (dependência, liberação, adiado_ate) — é a
#     razão ESTRUTURAL e vence as outras, que passam sozinhas;
#   sem_progresso / adiado — pulado nesta drenagem (memória da 7a-2);
#   cooldown:<HH:MM> — liberado, mas o cooldown global ainda vale.
ocioso_razoes() {
  local f id r tent=" ${1:-} " adi=" ${2:-} " ate=''
  cooldown_active && ate="$(cooldown_ate)"
  for f in $(ticket_files); do
    [ "$(ticket_field "$f" '.status')" = pendente ] || continue
    id="$(ticket_field "$f" '.id')"
    r="$(razao_nao_processavel "$f" 2>/dev/null || true)"
    if [ -z "$r" ]; then
      case "$adi" in *" $id "*) r=adiado ;; esac
    fi
    if [ -z "$r" ]; then
      case "$tent" in *" $id "*) r=sem_progresso ;; esac
    fi
    if [ -z "$r" ] && cooldown_active; then r="cooldown:${ate:-?}"; fi
    [ -n "$r" ] || return 1
    printf '%s %s\n' "$id" "$r"
  done
  return 0
}

# ocioso_legivel <linhas de ocioso_razoes> -> a mesma coisa para humano, numa
# linha: "244 espera 241b (bloqueado) · 231 sem liberação humano:x". Corta em
# 6 e diz quantos ficaram de fora: o STATUS é para ler de relance.
ocioso_legivel() {
  printf '%s\n' "$1" | awk '
    NF < 2 { next }
    {
      id = $1; r = $2; t = ""
      if (r ~ /^dependencia:/) {
        sub(/^dependencia:/, "", r); n = split(r, p, ":")
        t = id " espera " p[1] " (" p[n] ")"
      } else if (r ~ /^liberacao:/)  { sub(/^liberacao:/, "", r);  t = id " sem liberação " r }
      else if (r ~ /^adiado_ate:/)   { sub(/^adiado_ate:/, "", r); t = id " adiado até " r }
      else if (r ~ /^cooldown:/)     { sub(/^cooldown:/, "", r);   t = id " em cooldown até " r }
      else if (r == "sem_progresso") { t = id " sem progresso" }
      else if (r == "adiado")        { t = id " adiado" }
      else                           { t = id " " r }
      n_ok++
      if (n_ok <= 6) out = out (out == "" ? "" : " · ") t
    }
    END { if (n_ok > 6) out = out " · e mais " (n_ok - 6); printf "%s", out }'
}

# --- DRENAGEM ----------------------------------------------------------------
drenar() {
  local stwt drenados=0 bloqueados=0 adiados=0 refatiados=0 prox prox_id st t0 dur orc motivo_ocioso=''
  local mortos_antes mortos processados
  # MEMÓRIA DA DRENAGEM (peça 7a-2): ids tentados que não avançaram, separados
  # por espaço (bash 3.2: sem array associativo). Só vale dentro desta chamada.
  local tentados='' sem_progresso=0 adiados_sc='' razoes motivo_status campos id r
  # O que a drenagem lê do executor ALÉM do status (peça 7a-3).
  local ev_antes sha_antes sha_depois nota_antes nota_depois exe_out exe_rc evs sp n lim causa primeira ultima
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

    prox="$(proximo_pendente "$tentados")"
    if [ -z "$prox" ]; then
      if [ -n "$tentados" ]; then
        say "nenhum processável não tentado — encerrando (aprovados: $drenados; sem progresso: ${tentados% })"
        motivo_ocioso="sem progresso em ${tentados% }"
      else
        say "fila sem ticket processável — encerrando (aprovados: $drenados)"
        motivo_ocioso="$MOTIVO_FILA_VAZIA"
      fi
      break
    fi
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

    # Antes da chamada: onde a trilha estava, onde a branch alvo estava e a
    # nota do ticket. É a régua do que ESTA volta produziu. A saída do executor
    # vai para o log como sempre (tee) e fica numa cópia para a causa.
    ev_antes="$(trilha_linhas)"; sha_antes="$(staging_sha)"
    nota_antes="$(ticket_field "$prox" '.notas_status // ""')"
    exe_out="$(mktemp 2>/dev/null || echo "${TMPDIR:-/tmp}/orq-executor-saida.$$")"
    run_executor_once --ticket "$prox" 2>&1 | tee "$exe_out" && exe_rc=0 || exe_rc="${PIPESTATUS[0]}"
    if [ "$exe_rc" = 0 ]; then say "  executor rc=0"; else say "  executor rc=$exe_rc (não fatal; reavalia a fila)"; fi

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

    # Anti-loop (peça 7a-2): o ticket que segue pendente sem cooldown não
    # progrediu. Até a 7a-2 isso encerrava a drenagem INTEIRA — um ticket que
    # aborta antes do agente travava a fila toda, a cada disparo, e os outros
    # pendentes nunca eram tocados (no Comarka, o 315a deixou 32 parados a noite
    # toda). Agora ele entra na memória da drenagem e ela segue para o próximo
    # NÃO tentado. Termina: cada volta sem progresso tira um id da seleção, então
    # são no máximo N voltas assim (N = processáveis). O `break` fica no topo do
    # laço, quando `proximo_pendente` não acha mais ninguém fora da memória.
    #
    # Peça 7a-3: a volta sem progresso também SOMA no contador persistente, e
    # no limite o ticket vai para bloqueado. Saiu de pendente: contador zera.
    if [ "$(ticket_field "$prox" '.status')" != "pendente" ]; then
      sem_progresso_zerar "$prox_id"
    elif ! cooldown_active; then
      evs="$(eventos_do_ticket_desde "$ev_antes" "$prox_id")"
      nota_depois="$(ticket_field "$prox" '.notas_status // ""')"
      sha_depois="$(staging_sha)"
      if [ -n "$sha_antes" ] && [ "$sha_antes" != "$sha_depois" ]; then
        # A branch alvo andou na vez dele: algo foi aprovado e mergeado, então
        # houve progresso. Não entra na memória e o contador zera.
        say "  $BRANCH_ALVO avançou na vez de $prox_id (${sha_antes:0:8} -> ${sha_depois:0:8}) — conta como progresso; contador zerado"
        sem_progresso_zerar "$prox_id"
      elif foi_adiado "$evs" "$nota_antes" "$nota_depois"; then
        # Adiado sem cooldown: não é defeito do ticket e não conta. Entra na
        # memória mesmo assim, senão a drenagem o reescolheria em seguida.
        tentados="$tentados$prox_id "
        adiados_sc="$adiados_sc$prox_id "
        adiados=$((adiados + 1))
        say "  ticket $prox_id adiado sem cooldown — não conta como sem progresso; segue para o próximo não tentado"
      else
        causa="$(sem_progresso_causa "$evs" "$exe_out" "$exe_rc" "$nota_antes" "$nota_depois")"
        sp="$(sem_progresso_incrementar "$prox_id")"
        n="${sp%%|*}"; lim="$(sem_progresso_limite)"
        if [ "$n" -ge "$lim" ]; then
          primeira="$(printf '%s' "$sp" | cut -d'|' -f2)"; ultima="${sp##*|}"
          ticket_set "$prox" '.status = "bloqueado" | .notas_status = $n' \
            --arg n "sem_progresso: $n disparos sem progresso entre $primeira e $ultima; última causa: $causa"
          ticket_commit "$prox" "fila: $prox_id bloqueado (sem_progresso, $n disparos)"
          event "$prox_id" BLOQUEADO "motivo=sem_progresso" "n=$n" "limite=$lim"
          status_set "ultimo=$prox_id BLOQUEADO $(date '+%H:%M:%S') (sem progresso em $n disparos)"
          sem_progresso_zerar "$prox_id"
          say "  SEM PROGRESSO: $prox_id bloqueado após $n disparos ($primeira .. $ultima); última causa: $causa"
          bloqueados=$((bloqueados + 1))
        else
          tentados="$tentados$prox_id "
          sem_progresso=$((sem_progresso + 1))
          say "  ticket $prox_id segue pendente sem cooldown (sem progresso $n/$lim) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: $causa"
        fi
      fi
    fi
    rm -f "$exe_out"
  done
  dur=$(( ($(date +%s) - t0 + 30) / 60 ))
  say "drenagem encerrada: $drenados aprovado(s) e mergeado(s)"
  # OCIOSO (peça 7a-4): a drenagem acabou sem processável e há pendente. UM
  # evento por drenagem, com a razão de cada pendente — uma linha, como toda a
  # trilha. Pausa não entra: é a palavra do humano, e quem pausou já sabe.
  motivo_status="${motivo_ocioso:-drenagem encerrada}"
  if [ "$motivo_ocioso" != pausado ] && razoes="$(ocioso_razoes "$tentados" "$adiados_sc")" && [ -n "$razoes" ]; then
    campos=''; n=0
    while read -r id r; do
      [ -n "$id" ] || continue
      campos="$campos $id=$r"; n=$((n + 1))
    done <<EOF
$razoes
EOF
    event '---' OCIOSO "pendentes=$n" "${campos# }"
    motivo_status="$motivo_status: $(ocioso_legivel "$razoes")"
    say "ocioso: $(ocioso_legivel "$razoes")"
  fi
  event '---' DRENAGEM_FIM "aprovados=$drenados" "bloqueados=$bloqueados" "adiados=$adiados" \
    "refatiar=$refatiados" "sem_progresso=$sem_progresso" "dur=${dur}min"
  status_set "estado=ocioso" "fase=—" "ticket=—" "motivo=$motivo_status"

  # PEÇA 13: notifica só quando houve o que notificar. A decisão (e a memória do
  # "fila vazia já avisada") mora no lib.sh; aqui só se conta o que aconteceu.
  mortos=$(( $(contar_eventos EXECUTOR_MORREU) - mortos_antes ))
  [ "$mortos" -ge 0 ] || mortos=0
  processados=$(( drenados + bloqueados + adiados + refatiados + sem_progresso + mortos ))
  if deve_notificar "$processados" "$motivo_ocioso"; then
    notificar_fim "$drenados" "$bloqueados" "$adiados" "$dur"
  else
    say "notificação: nada a notificar (0 processados, motivo '${motivo_ocioso:-—}') — silêncio"
  fi
}

cleanup_frente() {
  local id="$1" nome
  nome="$("${ORQ_TSX[@]}" "$ORQ_LIB_DIR/decisao-cli.ts" "$MAIN_CHECKOUT" worktree "$id")"
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
  "${ORQ_TSX[@]}" "$ORQ_LIB_DIR/prevoo.ts" "$MAIN_CHECKOUT" 2>&1
}

# --- TOOLCHAIN (peça T1): a checagem que precede TODAS as outras -------------
# O motor é TypeScript. Sem `tsx` no repo, a PRIMEIRA coisa que quebra não é uma
# drenagem: é o `lock_stale`, logo abaixo, que roda `tsx -e` para decidir se o
# lock é órfão. Com o `tsx` ausente ele falha, a falha é lida como "não é
# órfão", e o loop encerra com "outro run vivo" — uma resposta ERRADA, dada em
# silêncio, sobre um lock que talvez nem exista. Por isso esta checagem vem
# ANTES do lock: ela é a única que não pode depender de nada.
#
# É `test -x`, não uma execução: nada roda, nada abre rede, e o `npx` sequer é
# alcançado — `--no-install` já garantiria que ele não baixa, mas o caminho
# curto é não chegar lá.
#
# O que ela escreve, e o que deliberadamente NÃO escreve: grava `PREVOO_NOGO
# item=tsx` na trilha (append-only, e é exatamente o fato que alguém vai
# procurar depois) e notifica pelo canal. NÃO chama `status_set`: estamos ANTES
# do `lock_adquirir`, então pode haver outro run vivo, e o STATUS é dele. Nenhum
# ticket é tocado, porque o primeiro passo que escreve em ticket é o
# `--reconcile`, muito depois daqui.
tsx_ou_sai() {
  tsx_local_ok && return 0
  say "toolchain NO-GO: não existe $TSX_LOCAL executável"
  say "  o motor é TypeScript e nenhuma parte dele roda sem tsx."
  say "  passo HUMANO, com o loop pausado: pnpm add -D tsx@^4.19.0 (ou npm i -D tsx@^4.19.0)"
  event '---' PREVOO_NOGO "item=tsx"
  notificar "Orquestrador: pré-voo NO-GO" \
    "tsx ausente: $TSX_LOCAL — o motor é TypeScript e não roda sem ele (instale com o loop pausado)"
  say "========== local-loop fim (toolchain NO-GO) =========="
  exit 1
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
  # TOOLCHAIN antes de tudo: o `lock_adquirir` logo abaixo já é TypeScript
  # (`lock_stale` roda `tsx -e`), e sem tsx ele responde errado em silêncio.
  tsx_ou_sai
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
