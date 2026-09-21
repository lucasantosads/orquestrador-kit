#!/usr/bin/env bash
# test-sem-progresso-limite.sh — contador PERSISTENTE de sem-progresso (peça
# 7a-3). Porte dos casos 1 a 4 do test-disjuntor.sh do comarka-operacional para
# o `drenar()` do kit. Cada chamada de `drenar` é um disparo do launchd.
#
#   1. ticket que sempre aborta antes do agente: contador 1, 2, 3 em disparos
#      seguidos; no 3º vira bloqueado, COMMITADO pelo ticket_commit, com a
#      última causa tirada do DESFECHO do executor na nota, e o evento
#      `BLOQUEADO motivo=sem_progresso` na trilha. Depois não é mais escolhido.
#   2. adiamento não conta: nem o com cooldown (mark_adiado do motor), nem o
#      sem cooldown (evento ADIADO + nota "adiado", sem arquivo de cooldown).
#   3. staging que avança na vez do ticket zera o contador.
#   4. o limite vem do config (`sem_progresso_limite`); valor inválido cai no 3.
#
# Dois defeitos do disjuntor do Comarka que este teste impede de voltar: status
# mudado sem commit, e causa tirada só da última linha com ERRO|fatal|FAIL.
#
# Uso: bash scripts/orquestrador/test-sem-progresso-limite.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP="$(dirname "$ORQ_EXEC_ROOT")"
trap 'rm -rf "$TMP"' EXIT
# shellcheck source=test-fixture-drenagem.sh
source "$AQUI/test-fixture-drenagem.sh"
fx_config "$ORQ_EXEC_ROOT" '.sem_progresso_limite = 3'
fx_ticket "$ORQ_EXEC_ROOT" 901
fx_git "$ORQ_EXEC_ROOT"
LOCAL_LOOP_SOURCED=1
# shellcheck source=local-loop.sh
source "$AQUI/local-loop.sh"
set +e

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

FILA="$ORQ_EXEC_ROOT/docs/fila"
MODO="$TMP/modo"      # aborta | adia-cooldown | adia-sem-cooldown | avanca
CALLS="$TMP/calls"; : > "$CALLS"

ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
merge_em_alvo() { return 0; }
cleanup_frente() { return 0; }

# O executor STUB imita o executor real em cada desfecho, INCLUSIVE no que ele
# grava na trilha — é de lá que a drenagem tira a causa.
run_executor_once() {
  local f="$2" id
  id="$(ticket_field "$f" '.id')"
  echo "$id" >> "$CALLS"
  case "$(cat "$MODO")" in
    aborta)
      # igual ao 440: o executor cria o attempt e morre no `worktree add`
      # (set -e), depois de TICKET_EM_CURSO — o trap grava EXECUTOR_MORREU.
      mkdir -p "$RUNS_BASE/$id/attempt-0"
      echo "[orq] ticket $id (t-$id) · worktree fx-$id"
      echo "Preparing worktree (new branch 'frente/$id')" >&2
      echo "fatal: '/tmp/_worktrees/fx-$id' already exists" >&2
      echo "FAIL linha de ruído que não é a causa" >&2
      event "$id" EXECUTOR_MORREU "rc=128" "fase=worktree"
      return 128 ;;
    adia-cooldown)
      # executor.sh:1051-1053: evento ADIADO e mark_adiado (que ARMA cooldown).
      event "$id" ADIADO "motivo=rate_limit" "attempt=1"
      mark_adiado "$f" executor "rate limit"
      return 0 ;;
    adia-sem-cooldown)
      # adiamento que NÃO arma cooldown (o desenho do Comarka para 529/500/503):
      # o ticket segue pendente e o cooldown não está ativo.
      event "$id" ADIADO "motivo=erro_transitorio" "attempt=1"
      ticket_set_nota "$f" "adiado (executor) por erro transitório em $(date +%s)$RANDOM"
      ticket_commit "$f" "fila: $id adiado (executor)"
      return 0 ;;
    avanca)
      # staging-auto anda uma vez na vez do ticket; depois ele volta a abortar
      # (senão a drenagem o reescolheria: staging andou = progresso).
      local sha
      sha="$(git -C "$ORQ_EXEC_ROOT" commit-tree "staging-auto^{tree}" -p staging-auto -m "avanço de staging")"
      git -C "$ORQ_EXEC_ROOT" update-ref refs/heads/staging-auto "$sha"
      echo aborta > "$MODO"
      return 0 ;;
  esac
}

contador() { cut -d'|' -f1 "$RUNS_BASE/$1/.sem-progresso" 2>/dev/null || true; }
st()       { ticket_field "$FILA/$1-t.md" '.status'; }
nota()     { ticket_field "$FILA/$1-t.md" '.notas_status'; }
disparo()  {
  : > "$CALLS"
  drenar > "$TMP/out.$1" 2>&1
  echo "  --- disparo $1 ($(cat "$MODO")): chamadas [$(tr '\n' ' ' < "$CALLS")] 901=$(contador 901)"
}

echo "== 1. ticket 901 sempre aborta: 1, 2, 3 -> bloqueado =="
echo aborta > "$MODO"
disparo 1; [ "$(contador 901)" = 1 ] && ok "disparo 1: contador 1" || falha "disparo 1: esperava contador 1, obtive '$(contador 901)'"
disparo 2; [ "$(contador 901)" = 2 ] && ok "disparo 2: contador 2 (persistiu entre disparos)" || falha "disparo 2: esperava 2, obtive '$(contador 901)'"
[ "$(st 901)" = pendente ] && ok "abaixo do limite, segue pendente" || falha "bloqueou antes do limite: $(st 901)"
disparo 3
[ "$(st 901)" = bloqueado ] && ok "disparo 3: 901 bloqueado no limite" || falha "esperava 901 bloqueado no 3º disparo, está $(st 901)"
echo "  nota: $(nota 901)"
nota 901 | grep -Eq "^sem_progresso: 3 disparos sem progresso entre .+ e .+; última causa: executor morreu \(rc=128, fase=worktree\): fatal: '/tmp/_worktrees/fx-901' already exists$" \
  && ok "nota cita a última causa pelo DESFECHO do executor (EXECUTOR_MORREU + linha fatal), não pela linha FAIL" \
  || falha "nota fora do formato: $(nota 901)"
grep -Eq ' 901 BLOQUEADO motivo=sem_progresso( |$)' "$FILA/runs/events.log" \
  && ok "trilha: 901 BLOQUEADO motivo=sem_progresso" || falha "trilha sem BLOQUEADO motivo=sem_progresso"
[ -z "$(git -C "$ORQ_EXEC_ROOT" status --porcelain -- docs/fila/901-t.md)" ] \
  && ok "o bloqueio foi COMMITADO (árvore limpa no ticket)" || falha "bloqueio deixou o ticket sujo, sem commit"
git -C "$ORQ_EXEC_ROOT" log -1 --format=%s -- docs/fila/901-t.md | grep -q '^fila: 901 bloqueado (sem_progresso' \
  && ok "commit: $(git -C "$ORQ_EXEC_ROOT" log -1 --format=%s -- docs/fila/901-t.md)" || falha "último commit do ticket não é o do bloqueio"
git -C "$ORQ_EXEC_ROOT" show HEAD:docs/fila/901-t.md | grep -q '"status": "bloqueado"' \
  && ok "o status bloqueado está no commit, não só no disco" || falha "commit não carrega o status bloqueado"
[ -z "$(contador 901)" ] && ok "contador zerado ao mudar de status" || falha "contador devia zerar ao bloquear: '$(contador 901)'"
disparo 4; grep -qx 901 "$CALLS" && falha "bloqueado foi escolhido de novo" || ok "disparo 4: bloqueado não é mais escolhido"

echo
echo "== 2. adiamento não conta =="
fx_ticket "$ORQ_EXEC_ROOT" 902
git -C "$ORQ_EXEC_ROOT" add -- docs/fila/902-t.md && git -C "$ORQ_EXEC_ROOT" commit -q -m "fixture: 902"
echo aborta > "$MODO"; disparo 5
[ "$(contador 902)" = 1 ] && ok "902 aborta: contador 1" || falha "esperava 902 em 1, obtive '$(contador 902)'"
echo adia-cooldown > "$MODO"; disparo 6
[ "$(contador 902)" = 1 ] && ok "adiado com cooldown (mark_adiado): não conta" || falha "adiamento com cooldown contou: '$(contador 902)'"
cooldown_active && ok "(o mark_adiado armou cooldown, como no motor)" || falha "mark_adiado não armou cooldown"
rm -f "$COOLDOWN_FILE"
echo adia-sem-cooldown > "$MODO"; disparo 7
[ "$(contador 902)" = 1 ] && ok "adiado SEM cooldown (evento ADIADO): não conta" || falha "adiamento sem cooldown contou: '$(contador 902)'"
cooldown_active && falha "cooldown ativo onde não devia" || true
disparo 8
[ "$(contador 902)" = 1 ] && ok "segundo adiamento sem cooldown também não conta" || falha "segundo adiamento contou: '$(contador 902)'"
[ "$(tr '\n' ' ' < "$CALLS")" = "902 " ] && ok "adiado sem cooldown não é reescolhido na mesma drenagem" \
  || falha "adiado sem cooldown reescolhido: [$(tr '\n' ' ' < "$CALLS")]"
echo aborta > "$MODO"; disparo 9
[ "$(contador 902)" = 2 ] && ok "abort depois dos adiamentos volta a contar (2)" || falha "esperava 2, obtive '$(contador 902)'"

echo
echo "== 3. staging que avança na vez do ticket zera =="
# Antes: 2. No disparo 10 o staging anda (zera) e o ticket aborta em seguida,
# na mesma drenagem (conta 1). Sem o zero seria 3, e bloquearia.
echo avanca > "$MODO"; disparo 10
[ "$(contador 902)" = 1 ] && ok "staging avançou: zerou e recomeçou em 1" || falha "esperava 1 depois do avanço, obtive '$(contador 902)'"
[ "$(st 902)" = pendente ] && ok "902 não bloqueou" || falha "902 bloqueou: $(st 902)"
[ "$(tr '\n' ' ' < "$CALLS")" = "902 902 " ] && ok "com staging andando, a drenagem voltou ao ticket (progresso)" \
  || falha "chamadas inesperadas: [$(tr '\n' ' ' < "$CALLS")]"

echo
echo "== 4. o limite vem do config =="
jq '.sem_progresso_limite = 1' "$FILA/000-config.json" > "$TMP/c" && mv "$TMP/c" "$FILA/000-config.json"
ticket_set_status "$FILA/902-t.md" bloqueado; ticket_commit "$FILA/902-t.md" "fixture: 902 fora"
fx_ticket "$ORQ_EXEC_ROOT" 903
git -C "$ORQ_EXEC_ROOT" add -- docs/fila/903-t.md && git -C "$ORQ_EXEC_ROOT" commit -q -m "fixture: 903"
echo aborta > "$MODO"; disparo 11
[ "$(st 903)" = bloqueado ] && ok "sem_progresso_limite=1 no config: bloqueia no 1º disparo" || falha "com limite 1, 903 devia bloquear; está $(st 903)"
nota 903 | grep -q '^sem_progresso: 1 disparos sem progresso' && ok "nota com o limite do config" || falha "nota: $(nota 903)"
jq '.sem_progresso_limite = "x"' "$FILA/000-config.json" > "$TMP/c" && mv "$TMP/c" "$FILA/000-config.json"
[ "$(sem_progresso_limite)" = 3 ] && ok "valor inválido no config cai no padrão 3" || falha "limite inválido virou '$(sem_progresso_limite)'"
jq 'del(.sem_progresso_limite)' "$FILA/000-config.json" > "$TMP/c" && mv "$TMP/c" "$FILA/000-config.json"
[ "$(sem_progresso_limite)" = 3 ] && ok "chave ausente: padrão 3" || falha "limite ausente virou '$(sem_progresso_limite)'"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
