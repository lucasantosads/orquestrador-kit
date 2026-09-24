#!/usr/bin/env bash
# test-gate-prevoo.sh — prova que o executor roda o gate de ticket ANTES da
# worktree (21/09/2026).
#
# Até aqui o gate-ticket.ts só existia como ferramenta de quem ESCREVE ticket: o
# loop nunca o chamava, e um critério com `| grep -q` (431, 472) ou com saída
# textual do vitest rodava, gastava tentativas e reprovava pelo motivo errado.
# Agora `drive_ticket` chama o gate no ticket selecionado: VIOLAÇÃO (não aviso)
# = ticket em `bloqueado`, nota com as violações, sem worktree, sem consumir
# tentativa, rc 0 — a drenagem segue para o próximo.
#
# ROOT SINTÉTICO (git de verdade, fila de verdade, gate-ticket.ts de verdade com
# o config REAL, ZERO modelo). `run_attempt` é stub: ele só imprime ENTRADA, que é
# a prova de que o ticket foi EXECUTADO.
#
#   1 · ticket com `| grep -q` em pipe: não executa, bloqueia, nota com a
#       violação, sem worktree, tentativas intocadas;
#   2 · ticket limpo (com AVISO de caminho fora da allowlist): executa — aviso
#       não bloqueia;
#   3 · drenagem com os dois: bloqueia o primeiro e SEGUE para o segundo;
#   4 · gate que não roda (rc 1 sem violação): falha alta, ticket bom intocado;
#   5 · modo 'aviso' (porte, 24/09/2026): o ticket com violação executa, evento
#       GATE_TICKET_AVISO na trilha;
#   6 · chave gate_ticket.modo_pre_voo ausente: vale 'aviso', dito no log;
#   7 · valor desconhecido: falha alta.
#
# Uso: bash scripts/orquestrador/test-gate-prevoo.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ISOLAMENTO (peça 0d) — mesmo cabeçalho do test-retry-worktree.sh.
# (idioma do kit, peça 7b-9: o checkout sai do git, nunca de "$AQUI/../..")
CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --show-toplevel 2>/dev/null || true)"
CONFIG_REAL="$CHECKOUT_REAL/docs/fila/000-config.json"
export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
mkdir -p "$ORQ_EXEC_ROOT/docs/fila/runs"
cp "$CONFIG_REAL" "$ORQ_EXEC_ROOT/docs/fila/000-config.json"
trap 'rm -rf "$(dirname "$ORQ_EXEC_ROOT")"' EXIT
set +e

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

# ticket <dir> <id> <cmd do critério> <objetivo>
ticket() {
  local cmd_json obj_json
  cmd_json="$(jq -Rn --arg c "$3" '$c')"
  obj_json="$(jq -Rn --arg c "$4" '$c')"
  cat > "$1/docs/fila/$2-t.md" <<TICKET
# $2

\`\`\`json
{
  "id": "$2",
  "bloco": "B6",
  "slug": "t$2",
  "status": "pendente",
  "origem": "humano",
  "risco": "",
  "objetivo": $obj_json,
  "pathspec_allowlist": ["src/a$2.ts"],
  "dependencias": [],
  "criterios_aceite": [
    {"tipo": "alvo", "descricao": "c", "cmd": $cmd_json, "espera": "ok"}
  ]
}
\`\`\`
TICKET
}

RUIM='node_modules/.bin/vitest run visao 2>&1 | grep -qE "[1-9] passed" && echo ok'
BOM='test -f src/a902.ts && echo ok'

# fixture_repo [modo] — o modo vai para gate_ticket.modo_pre_voo: 'bloqueia' (o
# padrão aqui, que é o comportamento que os casos 1–4 provam), 'aviso', um valor
# qualquer, ou 'AUSENTE' (a chave sai do config).
fixture_repo() {
  local tmp fx modo="${1:-bloqueia}"
  tmp="$(mktemp -d)" || return 1
  fx="$tmp/repo"
  mkdir -p "$fx/docs/fila/runs" "$fx/src" "$tmp/_worktrees" || return 1
  if [ "$modo" = AUSENTE ]; then
    jq 'del(.gate_ticket.modo_pre_voo)' "$CONFIG_REAL" > "$fx/docs/fila/000-config.json" || return 1
  else
    jq --arg m "$modo" '.gate_ticket.modo_pre_voo = $m' "$CONFIG_REAL" > "$fx/docs/fila/000-config.json" || return 1
  fi
  ticket "$fx" 901 "$RUIM" "escreve src/a901.ts"
  # o 902 cita src/b.ts, fora da allowlist: AVISO, que não pode bloquear
  ticket "$fx" 902 "$BOM" "escreve src/a902.ts lendo src/b.ts"
  printf 'base\n' > "$fx/src/base.ts"
  (
    cd "$fx" \
      && git init -q -b main . \
      && git add -A \
      && git -c user.email=t@t -c user.name=t commit -qm base \
      && git branch "$(jq -r '.branch_alvo' "$fx/docs/fila/000-config.json")"
  ) >/dev/null 2>&1 || return 1
  echo "$fx"
}

campo() { jq -r "$2" < <(awk '/^```json/{f=1;next} f&&/^```/{exit} f' "$1"); }

# O corpo do stub do executor: sourced executor.sh, run_attempt imprime ENTRADA e
# aprova. Usado direto (casos 1 e 2) e dentro de run_executor_once (caso 3).
STUB_EXECUTOR='
  source "$AQUI_T/executor.sh"
  set +e
  ticket_commit() { return 0; }
  cooldown_arm() { return 0; }
  run_attempt() {
    local rundir="$3"
    mkdir -p "$rundir"
    echo "ENTRADA $(ticket_field "$1" ".id")"
    RESULT=aprovado; MOTIVO=ok; ENF_OK=1; DUR=1; DIFF_LINES=0
    printf "{\"desfecho\":\"aprovado\",\"causa\":\"nenhuma\",\"motivo\":\"ok\",\"contaComoRetry\":false}\n" > "$rundir/veredito.json"
  }
  drive_ticket "$(ticket_file_by_id "$TID_T")"
  echo "RC_DRIVE=$?"
'

drive() {
  ORQ_EXEC_ROOT="$1" EXECUTOR_SOURCED=1 AQUI_T="$AQUI" TID_T="$2" bash -c "$STUB_EXECUTOR" 2>&1
}

echo "== 1 · critério com '| grep -q' em pipe: bloqueia ANTES da worktree =="
fx="$(fixture_repo)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  s1="$(drive "$fx" 901)"
  f901="$fx/docs/fila/901-t.md"
  printf '%s\n' "$s1" | grep -q "ENTRADA 901" \
    && falha "o ticket 901 foi EXECUTADO com critério inválido" || ok "o ticket 901 não foi executado"
  [ "$(campo "$f901" '.status')" = bloqueado ] \
    && ok "status bloqueado" || falha "status=$(campo "$f901" '.status') (esperado bloqueado)"
  campo "$f901" '.notas_status' | grep -q "grep -q em pipe" \
    && ok "a nota lista a violação" || falha "nota sem a violação: $(campo "$f901" '.notas_status')"
  campo "$f901" '.notas_status' | grep -q "AVISO" \
    && falha "a nota trouxe AVISO junto com a violação" || ok "a nota não mistura aviso"
  [ "$(campo "$f901" '.tentativas // "ausente"')" = ausente ] \
    && ok "nenhuma tentativa consumida" || falha "tentativas=$(campo "$f901" '.tentativas')"
  [ -z "$(ls -A "$(dirname "$fx")/_worktrees" 2>/dev/null)" ] \
    && ok "nenhuma worktree criada" || falha "worktree criada: $(ls "$(dirname "$fx")/_worktrees")"
  printf '%s\n' "$s1" | grep -q "RC_DRIVE=0" \
    && ok "drive_ticket devolve 0 (não aborta)" || falha "drive_ticket não devolveu 0: $(printf '%s' "$s1" | grep RC_DRIVE)"

  echo
  echo "== 2 · ticket limpo, só com AVISO: executa =="
  s2="$(drive "$fx" 902)"
  printf '%s\n' "$s2" | grep -q "ENTRADA 902" \
    && ok "o ticket 902 foi executado (aviso não bloqueia)" || falha "o 902 não executou: $(printf '%s' "$s2" | tail -3)"
  rm -rf "$(dirname "$fx")"
fi

echo
echo "== 3 · drenagem: bloqueia o 901 e SEGUE para o 902 =="
fx="$(fixture_repo)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  s3="$(ORQ_EXEC_ROOT="$fx" LOCAL_LOOP_SOURCED=1 AQUI_T="$AQUI" STUB_T="$STUB_EXECUTOR" bash -c '
    source "$AQUI_T/local-loop.sh"
    set +e
    ensure_staging_worktree() { echo /tmp; }
    ticket_commit() { return 0; }
    merge_em_alvo() { echo "MERGE $1"; return 0; }
    cleanup_frente() { return 0; }
    run_executor_once() {
      ORQ_EXEC_ROOT="$ORQ_EXEC_ROOT" EXECUTOR_SOURCED=1 AQUI_T="$AQUI_T" \
        TID_T="$(ticket_field "$2" ".id")" bash -c "$STUB_T"
    }
    drenar
  ' 2>&1)"
  printf '%s\n' "$s3" | grep -q "ENTRADA 901" \
    && falha "a drenagem executou o 901" || ok "a drenagem não executou o 901"
  printf '%s\n' "$s3" | grep -q "MERGE 902" \
    && ok "a drenagem seguiu e mergeou o 902" || falha "o 902 não chegou ao merge: $(printf '%s' "$s3" | tail -4)"
  printf '%s\n' "$s3" | grep -q "sem progresso" \
    && falha "encerrou por 'sem progresso'" || ok "não encerrou por 'sem progresso'"
  grep -q "DRENAGEM_FIM aprovados=1 bloqueados=1" "$fx/docs/fila/runs/events.log" 2>/dev/null \
    && ok "placar: 1 aprovado, 1 bloqueado" \
    || falha "placar: $(grep DRENAGEM_FIM "$fx/docs/fila/runs/events.log" 2>/dev/null | tail -1)"
  rm -rf "$(dirname "$fx")"
fi

echo
echo "== 4 · gate que NÃO roda (tsx quebrado, rc 1 sem violação): falha alta, ticket segue pendente =="
fx="$(fixture_repo)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  s4="$(ORQ_EXEC_ROOT="$fx" EXECUTOR_SOURCED=1 AQUI_T="$AQUI" TID_T=902 bash -c "
    source \"\$AQUI_T/executor.sh\"
    set +e
    ticket_commit() { return 0; }
    gate_ticket() { echo \"Error: Cannot find module (simulado)\"; return 1; }
    run_attempt() { echo \"ENTRADA 902\"; }
    ( drive_ticket \"\$(ticket_file_by_id 902)\" ); echo \"RC_DRIVE=\$?\"
  " 2>&1)"
  printf '%s\n' "$s4" | grep -q "ENTRADA 902" \
    && falha "executou o ticket com o gate quebrado" || ok "não executou o ticket com o gate quebrado"
  printf '%s\n' "$s4" | grep -q "RC_DRIVE=0" \
    && falha "gate quebrado passou como rc 0" || ok "gate quebrado = rc != 0 (falha alta)"
  [ "$(campo "$fx/docs/fila/902-t.md" '.status')" = pendente ] \
    && ok "o ticket bom NÃO foi bloqueado por gate quebrado" || falha "status=$(campo "$fx/docs/fila/902-t.md" '.status')"
  printf '%s\n' "$s4" | grep -q "o gate não rodou" \
    && ok "o log diz que o gate não rodou" || falha "log sem o motivo: $(printf '%s' "$s4" | tail -2)"
  rm -rf "$(dirname "$fx")"
fi

echo
echo "== 5 · modo 'aviso': o ticket com violação EXECUTA, e a trilha registra o aviso =="
fx="$(fixture_repo aviso)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  s5="$(drive "$fx" 901)"
  printf '%s\n' "$s5" | grep -q "ENTRADA 901" \
    && ok "o 901 foi executado (aviso não bloqueia)" || falha "o 901 não executou em modo aviso: $(printf '%s' "$s5" | tail -3)"
  [ "$(campo "$fx/docs/fila/901-t.md" '.status')" != bloqueado ] \
    && ok "status não é bloqueado" || falha "status=bloqueado em modo aviso"
  grep -qE ' 901 GATE_TICKET_AVISO violacoes=[1-9]' "$fx/docs/fila/runs/events.log" 2>/dev/null \
    && ok "evento GATE_TICKET_AVISO na trilha" || falha "sem GATE_TICKET_AVISO: $(grep ' 901 ' "$fx/docs/fila/runs/events.log" 2>/dev/null | head -3)"
  printf '%s\n' "$s5" | grep -q "grep -q em pipe" \
    && ok "o log lista a violação" || falha "o log não lista a violação"
  rm -rf "$(dirname "$fx")"
fi

echo
echo "== 6 · chave ausente: vale 'aviso', e o log diz =="
fx="$(fixture_repo AUSENTE)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  s6="$(drive "$fx" 901)"
  printf '%s\n' "$s6" | grep -q "ENTRADA 901" \
    && ok "o 901 foi executado (ausente = aviso)" || falha "ausente não virou aviso: $(printf '%s' "$s6" | tail -3)"
  printf '%s\n' "$s6" | grep -q "modo_pre_voo ausente no config" \
    && ok "o log diz que a chave está ausente" || falha "log sem a ausência da chave"
  rm -rf "$(dirname "$fx")"
fi

echo
echo "== 7 · valor desconhecido: falha alta, nada executa =="
fx="$(fixture_repo talvez)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  s7="$(ORQ_EXEC_ROOT="$fx" EXECUTOR_SOURCED=1 AQUI_T="$AQUI" TID_T=902 bash -c "
    source \"\$AQUI_T/executor.sh\"
    set +e
    ticket_commit() { return 0; }
    run_attempt() { echo \"ENTRADA 902\"; }
    ( drive_ticket \"\$(ticket_file_by_id 902)\" ); echo \"RC_DRIVE=\$?\"
  " 2>&1)"
  printf '%s\n' "$s7" | grep -q "ENTRADA 902" \
    && falha "executou com modo inválido" || ok "não executou com modo inválido"
  printf '%s\n' "$s7" | grep -q "RC_DRIVE=0" \
    && falha "modo inválido passou como rc 0" || ok "modo inválido = rc != 0"
  printf '%s\n' "$s7" | grep -q "modo_pre_voo='talvez'" \
    && ok "o log nomeia o valor inválido" || falha "log sem o valor inválido"
  rm -rf "$(dirname "$fx")"
fi

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
