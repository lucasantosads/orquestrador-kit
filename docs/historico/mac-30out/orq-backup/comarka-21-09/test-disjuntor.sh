#!/usr/bin/env bash
# test-disjuntor.sh — disjuntor de retry sem progresso (21/09, incidente 440).
# Exercita a função REAL drenar() de local-loop.sh contra uma fila-fixture, com
# stubs de executor. Cada chamada de drenar() = um disparo do launchd.
# Prova:
#   1. ticket que sempre aborta antes do agente: contador 1, 2, 3 em disparos
#      seguidos, e no 3º vira bloqueado com a causa (última linha de erro) e o
#      log ganha uma linha começando com "DISJUNTOR".
#   2. adiamento 529/500/503 (exit 31 no avaliador -> mark_adiado sem cooldown)
#      NÃO incrementa o contador.
#   3. staging-auto avançar na vez do ticket zera o contador.
#   4. o limite vem do 000-config.json (disjuntor_sem_progresso_limite).
set -uo pipefail
ORQ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fail() { echo "FAIL: $*"; exit 1; }

FIX="$(mktemp -d)"
trap 'rm -rf "$FIX"' EXIT
mkdir -p "$FIX/scripts/orquestrador" "$FIX/docs/fila/runs"
cp "$ORQ/lib.sh" "$FIX/scripts/orquestrador/lib.sh"
cat > "$FIX/docs/fila/000-config.json" <<'JSON'
{ "branch_alvo":"staging-auto", "max_retries":2, "cooldown_minutes":60,
  "migrations_dir":"supabase/migrations", "worktrees_dir":"../_worktrees",
  "runs_dir":"docs/fila/runs", "liberacoes_file":"docs/fila/liberacoes.json",
  "disjuntor_sem_progresso_limite": 3 }
JSON
echo '{"liberadas":[]}' > "$FIX/docs/fila/liberacoes.json"
mk_ticket() {
  cat > "$FIX/docs/fila/$1-dummy.md" <<MD
# dummy $1
\`\`\`json
{ "id": "$1", "slug": "dummy-$1", "status": "pendente", "dependencias": [], "criterios_aceite": [], "notas_status": "" }
\`\`\`
MD
}
HEADF="$FIX/head"; echo "aaaaaaaa0000" > "$HEADF"
MODO="$FIX/modo"   # aborta | adia | aprova-sem-status

export LOCAL_LOOP_SOURCED=1
# shellcheck disable=SC1091
source "$FIX/scripts/orquestrador/lib.sh"
# shellcheck disable=SC1090
source "$ORQ/local-loop.sh"
set +e
REPO="$FIX"; BRANCH_ALVO="staging-auto"; STWT="$FIX/stwt"

git() {
  case "$*" in
    *"rev-parse HEAD"*) cat "$HEADF" ;;
    *) : ;;
  esac
}
cooldown_active() { return 1; }
run_executor_once() {
  local id="$1" f; f="$(ticket_file_by_id "$id")"
  case "$(cat "$MODO")" in
    aborta)
      # igual ao 440: executor cria o attempt e sai no worktree add.
      mkdir -p "$RUNS_BASE/$id/attempt-1"
      echo "[orq] === ticket $id (dummy-$id) — tentativa 1 · modo: real ==="
      echo "[orq ERRO] git worktree add falhou: Preparing worktree (new branch 'frente/$id')" >&2
      echo "fatal: '/tmp/_worktrees/orq-$id' already exists" >&2
      return 1 ;;
    adia)
      mark_adiado "$f" "avaliador" "erro transitorio de servidor (529/500/503)" "nao"
      return 0 ;;
    avanca)
      # staging-auto anda uma vez na vez do ticket; depois ele volta a abortar
      # (senão drenar() reselecionaria para sempre: HEAD mexeu = progresso).
      printf 'bbbb%s\n' "$RANDOM" > "$HEADF"; echo aborta > "$MODO"; return 0 ;;
  esac
}
contador() { cat "$RUNS_BASE/$1/.sem-progresso" 2>/dev/null | cut -d'|' -f1 || true; }
st()       { ticket_field "$FIX/docs/fila/$1-dummy.md" '.status'; }
disparo()  { echo "--- disparo $1 ($(cat "$MODO")) ---"; drenar > "$FIX/out.$1" 2>&1; grep -E 'disjuntor|DISJUNTOR|ERRO|fatal' "$FIX/out.$1"; }

echo "===== 1. ticket 901 sempre aborta: 1, 2, 3 -> bloqueado ====="
mk_ticket 901; echo aborta > "$MODO"
disparo 1; echo "contador=$(contador 901) status=$(st 901)"
[ "$(contador 901)" = 1 ] || fail "esperava contador 1"
disparo 2; echo "contador=$(contador 901) status=$(st 901)"
[ "$(contador 901)" = 2 ] || fail "esperava contador 2"
disparo 3; echo "contador=$(contador 901 || true) status=$(st 901)"
[ "$(st 901)" = bloqueado ] || fail "esperava 901 bloqueado no 3º disparo"
grep -q '^\[.*\] DISJUNTOR: ticket 901' "$FIX/out.3" || fail "log sem linha DISJUNTOR"
echo "notas_status: $(ticket_field "$FIX/docs/fila/901-dummy.md" '.notas_status')"
ticket_field "$FIX/docs/fila/901-dummy.md" '.notas_status' | grep -q "^disjuntor: 3 execucoes sem progresso entre .* e .*; attempt vazio = executor abortou antes do agente; causa: fatal: '/tmp/_worktrees/orq-901' already exists$" || fail "nota fora do formato"
[ -z "$(contador 901)" ] || fail "contador devia zerar ao mudar de status"
disparo 4; grep -q 901 "$FIX/out.4" && fail "bloqueado nao deveria ser selecionado de novo"
echo "OK 1"

echo; echo "===== 2. adiamento 529/500/503 (exit 31) nao incrementa ====="
mk_ticket 902
echo aborta > "$MODO"; disparo 5; echo "contador=$(contador 902)"
[ "$(contador 902)" = 1 ] || fail "esperava 1 antes do adiamento"
echo adia > "$MODO";   disparo 6; echo "contador=$(contador 902) nota=$(ticket_field "$FIX/docs/fila/902-dummy.md" '.notas_status')"
[ "$(contador 902)" = 1 ] || fail "adiamento exit 31 NAO pode incrementar"
disparo 7; echo "contador=$(contador 902)"
[ "$(contador 902)" = 1 ] || fail "segundo adiamento (nota nova) tambem nao conta"
echo aborta > "$MODO"; disparo 8; echo "contador=$(contador 902) status=$(st 902)"
[ "$(contador 902)" = 2 ] || fail "abort depois do adiamento volta a contar (2)"
echo "OK 2"

echo; echo "===== 3. staging-auto avanca na vez do ticket: zera ====="
# Antes: contador 2. No disparo 9 o staging anda (zera) e em seguida o ticket
# aborta na mesma drenagem (conta 1). Sem o zero seria 3 e bloquearia.
echo avanca > "$MODO"; disparo 9; echo "contador=$(contador 902) status=$(st 902)"
[ "$(contador 902)" = 1 ] || fail "staging-auto avancou: contador devia zerar e recomecar em 1"
[ "$(st 902)" = pendente ] || fail "902 nao pode ter bloqueado"
echo "OK 3"

echo; echo "===== 4. limite vem do config ====="
mk_ticket 903; sem_progresso_zerar 902
jq '.disjuntor_sem_progresso_limite = 1' "$FIX/docs/fila/000-config.json" > "$FIX/c" && mv "$FIX/c" "$FIX/docs/fila/000-config.json"
ticket_set_status "$FIX/docs/fila/902-dummy.md" bloqueado
disparo 11; echo "status 903=$(st 903)"
[ "$(st 903)" = bloqueado ] || fail "com limite 1 no config, bloqueia na 1ª"
echo "OK 4"
echo; echo "OK: disjuntor conta 1,2,3 e bloqueia; exit 31 nao conta; avanço zera; limite do config"
