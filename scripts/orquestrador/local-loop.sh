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
sem_progresso_incrementar() { contador_incrementar "$(sem_progresso_arquivo "$1")"; }

# contador_incrementar <arquivo> -> soma 1 no contador "N|primeira|ultima" do
# arquivo e imprime a linha gravada. É o mesmo formato para os dois contadores
# persistentes da drenagem: .sem-progresso (7a-3) e .adiamentos (7b-3).
contador_incrementar() {
  local f="$1" n=0 primeira agora linha
  agora="$(ts)"; primeira="$agora"
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

# --- TETO DE ADIAMENTOS CONSECUTIVOS (peça 7b-3) -----------------------------
# Adiamento não tinha teto. No Comarka o 315a foi adiado 8 vezes seguidas, cerca
# de 3 h de modelo, e a nota dizia "timeout 1500s" numa execução de 9 s. Este
# contador PERSISTE entre disparos em runs/<id>/.adiamentos ("N|primeira|
# ultima") e, no limite, BLOQUEIA o ticket com a causa REAL: a medida do último
# ADIADO (motivo, rc e duração, ou a causa do preflight), nunca só o rótulo.
#
# Conta: o ADIADO sem cooldown. NÃO conta nem zera: o adiado COM cooldown
# (rate_limit, quota), que é o limite da conta e não do ticket; com cooldown a
# drenagem para no primeiro, e o primeiro pendente em ordem acumularia sozinho.
# Zera: o ticket sair de pendente (aprovado, bloqueado, refatiar) ou a branch
# alvo avançar na vez dele. Limite: `adiamentos_limite` do config, 4 quando
# ausente ou inválido. Como o sem-progresso, o bloqueio espera o fim da
# drenagem e não vale se ela terminar em AMBIENTE (7a-8).
adiamentos_arquivo() { printf '%s/%s/.adiamentos\n' "$RUNS_BASE" "$1"; }
adiamentos_zerar()   { rm -f "$(adiamentos_arquivo "$1")" 2>/dev/null || true; }

# adiamentos_limite -> inteiro >= 1; 4 quando a chave falta ou é inválida.
adiamentos_limite() {
  local l
  l="$(cfg '.adiamentos_limite // empty' 2>/dev/null || true)"
  case "$l" in ''|*[!0-9]*|0) l=4 ;; esac
  printf '%s\n' "$l"
}

# causa_real_do_adiado <eventos> -> a medida do último ADIADO destes eventos:
#   "preflight: <causa>"                      (recusa de preflight)
#   "<motivo> (rc=<rc>, <dur> de execução)"   (qualquer outro)
causa_real_do_adiado() {
  local ult campos m rc dur c
  ult="$(printf '%s\n' "$1" | awk '$3 == "ADIADO"' | tail -1)"
  [ -n "$ult" ] || { printf 'adiado sem evento na trilha'; return 0; }
  campos=" $(printf '%s' "$ult" | cut -d' ' -f4-) "
  m="$(printf '%s' "$campos" | sed -n 's/.* motivo=\([^ ]*\) .*/\1/p')"
  rc="$(printf '%s' "$campos" | sed -n 's/.* rc=\([^ ]*\) .*/\1/p')"
  dur="$(printf '%s' "$campos" | sed -n 's/.* dur=\([^ ]*\) .*/\1/p')"
  c="$(printf '%s' "$campos" | sed -n 's/.* causa=\(.*\) $/\1/p')"
  if [ -n "$c" ]; then printf '%s: %s' "${m:-adiado}" "$c"
  else printf '%s (rc=%s, %s de execução)' "${m:-adiado}" "${rc:-?}" "${dur:-?}"; fi
}

# --- AMBIENTE NÃO BLOQUEIA A FILA (peça 7a-8) --------------------------------
# Uma recusa de preflight (árvore suja, lock de git, identidade) mata o executor
# para TODO ticket, igual. Sem esta peça cada drenagem somava +1 em todos os
# pendentes e, no 3º disparo, a fila inteira ia para bloqueado por um problema
# que não é de ticket nenhum.
#
# causa_normalizada <causa> <id> -> a causa sem o que varia de ticket para
# ticket: caminhos, o id do próprio ticket, shas e números. Número puro vira
# <n> ANTES da regra de sha: um pid de 4 dígitos num ticket e de 9 no outro
# têm de normalizar igual, e 7+ dígitos casariam como sha. Duas causas
# normalizadas iguais em tickets DIFERENTES na mesma drenagem = ambiente.
causa_normalizada() {
  local id_re
  id_re="$(printf '%s' "$2" | sed 's/[][\.*^$/+?(){}|]/\\&/g')"
  printf '%s' "$1" | sed -E \
    -e "s#(^|[[:space:]'\"(=])(~|\\.\\.?)?/[^[:space:]:;,()'\"]+#\\1<caminho>#g" \
    -e "s/(^|[^[:alnum:]])${id_re}([^[:alnum:]]|\$)/\\1<id>\\2/g" \
    -e "s/(^|[^[:alnum:]])${id_re}([^[:alnum:]]|\$)/\\1<id>\\2/g" \
    -e 's/(^|[^[:alnum:]])[0-9]+([^[:alnum:]]|$)/\1<n>\2/g' \
    -e 's/(^|[^[:alnum:]])[0-9]+([^[:alnum:]]|$)/\1<n>\2/g' \
    -e 's/(^|[^[:alnum:]])[0-9a-f]{7,40}([^[:alnum:]]|$)/\1<sha>\2/g' \
    -e 's/(^|[^[:alnum:]])[0-9a-f]{7,40}([^[:alnum:]]|$)/\1<sha>\2/g' \
    -e 's/[0-9]+/<n>/g' \
    -e 's/[[:space:]]+/ /g'
}

# sem_progresso_desfazer <backup> -> devolve cada contador somado nesta
# drenagem ao que era antes. Backup: uma linha "<id><TAB><linha anterior>" por
# ticket, linha anterior vazia = o arquivo não existia.
sem_progresso_desfazer() { contador_desfazer "$1" .sem-progresso; }

# contador_desfazer <backup> <nome-do-arquivo> -> o mesmo, para qualquer um dos
# contadores em runs/<id>/<nome-do-arquivo>.
contador_desfazer() {
  local bid blinha f nome="$2"
  while IFS=$'\t' read -r bid blinha <&3; do
    [ -n "$bid" ] || continue
    f="$RUNS_BASE/$bid/$nome"
    escrita_de_teste_permitida "$f" || continue
    if [ -z "$blinha" ]; then rm -f "$f" 2>/dev/null || true
    else printf '%s\n' "$blinha" > "$f" 2>/dev/null || true; fi
  done 3<<EOF
$1
EOF
}

# adiamentos_ambiente_desfazer <backup> -> o mesmo para o `adiamentos_ambiente`
# que o executor grava no JSON do ticket (teto de 3, porte-actus d). Backup:
# uma linha "<id><TAB><arquivo><TAB><valor anterior>" por ticket chamado nesta
# drenagem. Sem isto a absolvição da 7a-8 desfazia o `.adiamentos` e deixava
# este avançar: dois tickets adiados por 'ambiente' iam a bloqueado pelo teto
# no 3º disparo, com o loop dizendo AMBIENTE nos dois primeiros (porte-actus
# j2). Só mexe em ticket ainda pendente e cujo valor mudou; cada desfeito vai
# para a trilha com o de/para, e o ticket é commitado como o executor faz.
adiamentos_ambiente_desfazer() {
  local bid bfile bval atual
  while IFS=$'\t' read -r bid bfile bval <&3; do
    [ -n "$bid" ] && [ -f "$bfile" ] || continue
    [ "$(ticket_field "$bfile" '.status')" = pendente ] || continue
    atual="$(ticket_adiamentos_ambiente "$bfile")"
    [ "$atual" != "$bval" ] || continue
    if [ "$bval" = 0 ]; then ticket_zera_adiamentos_ambiente "$bfile"
    else ticket_set_adiamentos_ambiente "$bfile" "$bval"; fi
    ticket_commit "$bfile" "fila: $bid adiamentos_ambiente $atual -> $bval (drenagem terminou em AMBIENTE)"
    event "$bid" AMBIENTE_ADIAMENTO_DESFEITO "adiamentos_ambiente=$atual->$bval"
  done 3<<EOF
$1
EOF
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
  local linhas
  linhas="$(pendentes_razoes "${1:-}" "${2:-}")"
  case "
$linhas" in *" pronto"*) return 1 ;; esac
  [ -z "$linhas" ] || printf '%s\n' "$linhas"
  return 0
}

# pendentes_razoes <tentados> <adiados> -> "<id> <razao>" por pendente, com a
# MESMA precedência do ocioso_razoes, e `pronto` para o que roda agora. É a
# régua do OCIOSO sem o corte do primeiro processável: o painel (peça K12) a
# chama para saber, de cada pendente, se roda e, se não, por quê — "o painel
# diz" e "a trilha diz" não podem divergir.
pendentes_razoes() {
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
    printf '%s %s\n' "$id" "${r:-pronto}"
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
  # Peça 7a-8: causas vistas nesta drenagem ("<id><TAB><normalizada>"), o
  # backup dos contadores somados, e os bloqueios que esperam o fim da drenagem
  # (só valem se ela não terminar em ambiente).
  local causas_vistas='' sp_backup='' a_bloquear='' norm outro ambiente_causa='' adiado=0
  # Peça 7b-3: o mesmo par (backup, bloqueios que esperam o fim) para o
  # contador de adiamentos.
  local ad_backup='' a_bloquear_ad='' ad
  # porte-actus j2: o `adiamentos_ambiente` do JSON de cada ticket chamado,
  # antes da chamada, para a absolvição por AMBIENTE devolver.
  local amb_backup=''
  local bid bfile bsp blim bcausa
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
      motivo_ocioso="pausado ($(pausa_motivo))"; break
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

    # Peça 7b-8: devolução humana (bloqueado -> pendente) zera tentativas,
    # .sem-progresso e .adiamentos ANTES da chamada e antes da régua desta volta,
    # para valer mesmo que o executor seja recusado no preflight.
    reabertura_humana "$prox" || true

    # Antes da chamada: onde a trilha estava, onde a branch alvo estava e a
    # nota do ticket. É a régua do que ESTA volta produziu. A saída do executor
    # vai para o log como sempre (tee) e fica numa cópia para a causa.
    ev_antes="$(trilha_linhas)"; sha_antes="$(staging_sha)"
    nota_antes="$(ticket_field "$prox" '.notas_status // ""')"
    amb_backup="$amb_backup$prox_id"$'\t'"$prox"$'\t'"$(ticket_adiamentos_ambiente "$prox")"$'\n'
    exe_out="$(mktemp 2>/dev/null || echo "${TMPDIR:-/tmp}/orq-executor-saida.$$")"
    run_executor_once --ticket "$prox" 2>&1 | tee "$exe_out" && exe_rc=0 || exe_rc="${PIPESTATUS[0]}"
    if [ "$exe_rc" = 0 ]; then say "  executor rc=0"; else say "  executor rc=$exe_rc (não fatal; reavalia a fila)"; fi

    st="$(ticket_field "$prox" '.status')"
    if [ "$st" = "aguardando_merge" ]; then
      status_set "fase=merge"
      if merge_em_alvo "$prox_id" "$stwt"; then
        ticket_set_status "$prox" done
        ticket_zera_tentativas "$prox"
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
      adiamentos_zerar "$prox_id"
    elif ! cooldown_active; then
      evs="$(eventos_do_ticket_desde "$ev_antes" "$prox_id")"
      nota_depois="$(ticket_field "$prox" '.notas_status // ""')"
      sha_depois="$(staging_sha)"
      if [ -n "$sha_antes" ] && [ "$sha_antes" != "$sha_depois" ]; then
        # A branch alvo andou na vez dele: algo foi aprovado e mergeado, então
        # houve progresso. Não entra na memória e o contador zera.
        say "  $BRANCH_ALVO avançou na vez de $prox_id (${sha_antes:0:8} -> ${sha_depois:0:8}) — conta como progresso; contador zerado"
        sem_progresso_zerar "$prox_id"
        adiamentos_zerar "$prox_id"
      else
        adiado=0
        foi_adiado "$evs" "$nota_antes" "$nota_depois" && adiado=1
        causa="$(sem_progresso_causa "$evs" "$exe_out" "$exe_rc" "$nota_antes" "$nota_depois")"
        # Peça 7a-8: a mesma causa normalizada já apareceu nesta drenagem para
        # OUTRO ticket? Então não é do ticket, é do ambiente: ninguém soma nesta
        # drenagem (desfaz o que já foi somado), nenhum bloqueio pendente vale,
        # a trilha ganha AMBIENTE e a drenagem para.
        #
        # Peça 7b-2: a régua vale também para o ADIADO sem cooldown. A recusa de
        # preflight virou `ADIADO motivo=preflight causa=...`, e sessão caída,
        # timeout, 5xx e gate que não rodou adiam sem cooldown: em todos, a
        # mesma causa em dois tickets é o ambiente. A causa do adiado é o
        # próprio evento (`ADIADO motivo=... causa=...` ou `... rc= dur=`).
        #
        # A causa entra no awk por ENVIRON, nunca por `-v`: o `-v` interpreta
        # escapes, e a causa carrega `\n` literal (o `uma_linha` da recusa de
        # árvore suja). Com `-v` ela nunca era igual a si mesma, e o AMBIENTE
        # não disparava (269 e 270 do conteudos-infinitos, 22/09).
        norm="$(causa_normalizada "$causa" "$prox_id")"
        outro="$(printf '%s\n' "$causas_vistas" | ORQ_CAUSA_NORM="$norm" awk -F'\t' -v id="$prox_id" '$2 == ENVIRON["ORQ_CAUSA_NORM"] && $1 != id { print $1; exit }')"
        if [ -n "$outro" ]; then
          sem_progresso_desfazer "$sp_backup"
          contador_desfazer "$ad_backup" .adiamentos
          adiamentos_ambiente_desfazer "$amb_backup"
          sp_backup=''; a_bloquear=''; sem_progresso=0; ad_backup=''; a_bloquear_ad=''; amb_backup=''
          tentados="$tentados$prox_id "
          [ "$adiado" = 0 ] || adiados=$((adiados + 1))
          event '---' AMBIENTE "tickets=$outro,$prox_id" "causa=$norm"
          say "  AMBIENTE: $outro e $prox_id pararam pela mesma causa ($norm) — nada soma nesta drenagem; encerrando"
          motivo_ocioso=ambiente; ambiente_causa="$norm"
          rm -f "$exe_out"; break
        fi
        causas_vistas="$causas_vistas$prox_id"$'\t'"$norm"$'\n'
        if [ "$adiado" = 1 ]; then
          # Adiado sem cooldown: não é defeito do ticket e não conta. Entra na
          # memória mesmo assim, senão a drenagem o reescolheria em seguida.
          tentados="$tentados$prox_id "
          adiados_sc="$adiados_sc$prox_id "
          adiados=$((adiados + 1))
          say "  ticket $prox_id adiado sem cooldown — não conta como sem progresso; segue para o próximo não tentado. Causa: $causa"
          # Peça 7b-3: soma no contador de adiamentos; no limite, bloqueia no fim.
          ad_backup="$ad_backup$prox_id"$'\t'"$(head -1 "$(adiamentos_arquivo "$prox_id")" 2>/dev/null || true)"$'\n'
          ad="$(contador_incrementar "$(adiamentos_arquivo "$prox_id")")"
          n="${ad%%|*}"; lim="$(adiamentos_limite)"
          if [ "$n" -ge "$lim" ]; then
            a_bloquear_ad="$a_bloquear_ad$prox_id"$'\t'"$prox"$'\t'"$ad"$'\t'"$lim"$'\t'"$(causa_real_do_adiado "$evs")"$'\n'
            say "  ticket $prox_id atingiu o limite de adiamentos ($n/$lim) — bloqueia no fim da drenagem, se ela não terminar em ambiente"
          else
            say "  ticket $prox_id adiado $n/$lim vez(es) seguidas"
          fi
        else
          sp_backup="$sp_backup$prox_id"$'\t'"$(head -1 "$(sem_progresso_arquivo "$prox_id")" 2>/dev/null || true)"$'\n'
          sp="$(sem_progresso_incrementar "$prox_id")"
          n="${sp%%|*}"; lim="$(sem_progresso_limite)"
          if [ "$n" -ge "$lim" ]; then
            # O bloqueio espera o FIM da drenagem: se um ticket seguinte parar pela
            # mesma causa, era ambiente e este não pode ter sido bloqueado por ela.
            tentados="$tentados$prox_id "
            a_bloquear="$a_bloquear$prox_id"$'\t'"$prox"$'\t'"$sp"$'\t'"$lim"$'\t'"$causa"$'\n'
            say "  ticket $prox_id atingiu o limite de sem progresso ($n/$lim) — bloqueia no fim da drenagem, se ela não terminar em ambiente. Causa: $causa"
          else
            tentados="$tentados$prox_id "
            sem_progresso=$((sem_progresso + 1))
            say "  ticket $prox_id segue pendente sem cooldown (sem progresso $n/$lim) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: $causa"
          fi
        fi
      fi
    fi
    rm -f "$exe_out"
  done
  # Os bloqueios por sem-progresso que esperaram o fim da drenagem (7a-8). Se
  # ela terminou em ambiente, a lista já foi esvaziada.
  while IFS=$'\t' read -r bid bfile bsp blim bcausa <&3; do
    [ -n "$bid" ] || continue
    n="${bsp%%|*}"; primeira="$(printf '%s' "$bsp" | cut -d'|' -f2)"; ultima="${bsp##*|}"
    ticket_set "$bfile" '.status = "bloqueado" | .notas_status = $n' \
      --arg n "sem_progresso: $n disparos sem progresso entre $primeira e $ultima; última causa: $bcausa"
    ticket_commit "$bfile" "fila: $bid bloqueado (sem_progresso, $n disparos)"
    event "$bid" BLOQUEADO "motivo=sem_progresso" "n=$n" "limite=$blim"
    status_set "ultimo=$bid BLOQUEADO $(date '+%H:%M:%S') (sem progresso em $n disparos)"
    sem_progresso_zerar "$bid"
    say "  SEM PROGRESSO: $bid bloqueado após $n disparos ($primeira .. $ultima); última causa: $bcausa"
    bloqueados=$((bloqueados + 1))
  done 3<<EOF
$a_bloquear
EOF
  # Os bloqueios por adiamentos (7b-3), com a mesma regra: só se a drenagem não
  # terminou em ambiente. A nota é a causa REAL, a medida do último ADIADO.
  while IFS=$'\t' read -r bid bfile bsp blim bcausa <&3; do
    [ -n "$bid" ] || continue
    n="${bsp%%|*}"
    ticket_set "$bfile" '.status = "bloqueado" | .notas_status = $n' --arg n "adiado $n vezes: $bcausa"
    ticket_commit "$bfile" "fila: $bid bloqueado (adiamentos, $n disparos)"
    event "$bid" BLOQUEADO "motivo=adiamentos" "n=$n" "limite=$blim"
    status_set "ultimo=$bid BLOQUEADO $(date '+%H:%M:%S') (adiado $n vezes)"
    adiamentos_zerar "$bid"
    sem_progresso_zerar "$bid"
    say "  ADIAMENTOS: $bid bloqueado após $n adiamentos seguidos; causa real: $bcausa"
    bloqueados=$((bloqueados + 1))
  done 3<<EOF
$a_bloquear_ad
EOF
  dur=$(( ($(date +%s) - t0 + 30) / 60 ))
  say "drenagem encerrada: $drenados aprovado(s) e mergeado(s)"
  # OCIOSO (peça 7a-4): a drenagem acabou sem processável e há pendente. UM
  # evento por drenagem, com a razão de cada pendente — uma linha, como toda a
  # trilha. Pausa não entra: é a palavra do humano, e quem pausou já sabe.
  motivo_status="${motivo_ocioso:-drenagem encerrada}"
  [ "$motivo_ocioso" != ambiente ] || motivo_status="ambiente: $ambiente_causa"
  if [ "$motivo_ocioso" != pausado ] && [ "$motivo_ocioso" != ambiente ] && razoes="$(ocioso_razoes "$tentados" "$adiados_sc")" && [ -n "$razoes" ]; then
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
  # Peça 7b-5: AMBIENTE avisa na entrada e na saída, e cala no meio. A causa da
  # entrada é lida ANTES da transição, que apaga a memória na saída.
  local causa_avisada trans
  causa_avisada="$(causa_ambiente_avisada)"
  trans="$(transicao_ambiente "$motivo_ocioso" "$ambiente_causa")"
  case "$trans" in
    entrou)
      notificar "Orquestrador: AMBIENTE, a fila parou" \
        "a mesma causa em dois tickets não é do ticket: $ambiente_causa. Nada somou nem bloqueou; avisa de novo quando sair."
      ;;
    calado)
      say "notificação: drenagem ainda em AMBIENTE, já avisado — silêncio" ;;
    saiu)
      # Um aviso só, e ele carrega o placar: a drenagem que tirou a fila do
      # ambiente não manda também o cartão de fim. A memória da fila vazia é
      # mantida pela mesma chamada de sempre, sem notificar por ela.
      deve_notificar "$processados" "$motivo_ocioso" >/dev/null 2>&1 || true
      notificar "Orquestrador: ambiente normalizado, $drenados aprovados, $bloqueados bloqueados" \
        "saiu de AMBIENTE (${causa_avisada:-causa não registrada}) · duração ${dur}min · adiados $adiados"
      ;;
    *)
      if deve_notificar "$processados" "$motivo_ocioso"; then
        notificar_fim "$drenados" "$bloqueados" "$adiados" "$dur"
      else
        say "notificação: nada a notificar (0 processados, motivo '${motivo_ocioso:-—}') — silêncio"
      fi ;;
  esac
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
    # Ticket 514: o MOTIVO nomeia a sentinela ativa e o conteúdo dela.
    status_set "estado=ocioso" "fase=—" "ticket=—" "motivo=pausado ($(pausa_motivo))"
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
