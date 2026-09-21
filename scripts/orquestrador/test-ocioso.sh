#!/usr/bin/env bash
# test-ocioso.sh — a drenagem que termina sem processável DIZ POR QUÊ (peça 7a-4).
#
# O caso real (ci-processaveis-21-09): 12 dias parado com 4 pendentes presos
# atrás de dependências bloqueadas, e a única coisa escrita era "sem ticket
# processável". Aqui a mesma forma de fila:
#   241b bloqueado; 244 depende de 241b;
#   231 depende de uma liberação humana ausente; 232 depende de 231 (pendente).
# Nenhum é processável: a drenagem grava UM evento OCIOSO pendentes=N com a
# razão de cada pendente, e o STATUS diz a mesma coisa em texto legível.
# Depois: pulado por sem-progresso, cooldown, e os fins que NÃO gravam OCIOSO.
#
# Uso: bash scripts/orquestrador/test-ocioso.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP="$(dirname "$ORQ_EXEC_ROOT")"
trap 'rm -rf "$TMP"' EXIT
# shellcheck source=test-fixture-drenagem.sh
source "$AQUI/test-fixture-drenagem.sh"
fx_config "$ORQ_EXEC_ROOT"
fx_ticket "$ORQ_EXEC_ROOT" 241b '[]' bloqueado
fx_ticket "$ORQ_EXEC_ROOT" 244 '["241b"]'
fx_ticket "$ORQ_EXEC_ROOT" 231 '["humano:migration-0031"]'
fx_ticket "$ORQ_EXEC_ROOT" 232 '["230b", "231"]'
fx_ticket "$ORQ_EXEC_ROOT" 230b '[]' done
fx_git "$ORQ_EXEC_ROOT"
LOCAL_LOOP_SOURCED=1
# shellcheck source=local-loop.sh
source "$AQUI/local-loop.sh"
set +e

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

FILA="$ORQ_EXEC_ROOT/docs/fila"
TRILHA="$FILA/runs/events.log"
CALLS="$TMP/calls"; : > "$CALLS"

ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
merge_em_alvo() { return 0; }
cleanup_frente() { return 0; }
run_executor_once() {
  local id; id="$(ticket_field "$2" '.id')"
  echo "$id" >> "$CALLS"
  echo "[orq ERRO] preflight: árvore de execução suja (ticket $id)" >&2
  return 1
}
ultimo_ocioso() { grep ' OCIOSO ' "$TRILHA" 2>/dev/null | tail -1; }
n_ocioso()      { grep -c ' OCIOSO ' "$TRILHA" 2>/dev/null || true; }

echo "== 1. 244 atrás de 241b bloqueado, 232 atrás de 231 pendente (sem liberação) =="
drenar > "$TMP/out.1" 2>&1
[ ! -s "$CALLS" ] && ok "nenhum executor chamado (nada processável)" || falha "executor chamado: $(tr '\n' ' ' < "$CALLS")"
oc="$(ultimo_ocioso)"
echo "  trilha: $oc"
case "$oc" in *" --- OCIOSO pendentes=3 "*) ok "evento OCIOSO pendentes=3" ;; *) falha "sem 'OCIOSO pendentes=3' na trilha" ;; esac
case "$oc" in *" 244=dependencia:241b:bloqueado"*) ok "244: dependência 241b em bloqueado" ;; *) falha "razão do 244 ausente" ;; esac
case "$oc" in *" 232=dependencia:231:pendente"*) ok "232: dependência 231 em pendente" ;; *) falha "razão do 232 ausente" ;; esac
case "$oc" in *" 231=liberacao:humano:migration-0031"*) ok "231: liberação humano:migration-0031 ausente" ;; *) falha "razão do 231 ausente" ;; esac
[ "$(n_ocioso)" = 1 ] && ok "UM evento por drenagem" || falha "esperava 1 OCIOSO, há $(n_ocioso)"
linhas_sem_ts="$(grep -cvE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' "$TRILHA" || true)"
[ "$linhas_sem_ts" = 0 ] && ok "trilha continua uma linha por evento (nenhuma linha sem timestamp)" \
  || falha "$linhas_sem_ts linha(s) sem timestamp na trilha"
ordem="$(awk '{print $3}' "$TRILHA" | grep -E 'OCIOSO|DRENAGEM_FIM' | tr '\n' ' ')"
[ "$ordem" = "OCIOSO DRENAGEM_FIM " ] && ok "OCIOSO vem antes do DRENAGEM_FIM" || falha "ordem: $ordem"
echo "  STATUS.md:"; sed 's/^/    /' "$FILA/runs/STATUS.md"
mot="$(grep '^MOTIVO' "$FILA/runs/STATUS.md")"
case "$mot" in *"sem ticket processável"*) ok "STATUS mantém o motivo de sempre" ;; *) falha "STATUS perdeu o motivo" ;; esac
case "$mot" in *"244 espera 241b (bloqueado)"*) ok "STATUS: 244 espera 241b (bloqueado)" ;; *) falha "STATUS sem a razão do 244" ;; esac
case "$mot" in *"232 espera 231 (pendente)"*) ok "STATUS: 232 espera 231 (pendente)" ;; *) falha "STATUS sem a razão do 232" ;; esac
case "$mot" in *"231 sem liberação humano:migration-0031"*) ok "STATUS: 231 sem liberação" ;; *) falha "STATUS sem a razão do 231" ;; esac
fim="$(grep ' DRENAGEM_FIM ' "$TRILHA" | tail -1)"
case "$fim" in *motivo=*) falha "DRENAGEM_FIM mudou de forma" ;; *) ok "DRENAGEM_FIM sem campo novo" ;; esac

echo
echo "== 2. pendente pulado por sem-progresso nesta drenagem =="
fx_ticket "$ORQ_EXEC_ROOT" 250
git -C "$ORQ_EXEC_ROOT" add -- docs/fila/250-t.md && git -C "$ORQ_EXEC_ROOT" commit -q -m "fixture: 250"
: > "$CALLS"; drenar > "$TMP/out.2" 2>&1
oc="$(ultimo_ocioso)"; echo "  trilha: $oc"
[ "$(tr '\n' ' ' < "$CALLS")" = "250 " ] && ok "250 foi tentado uma vez" || falha "chamadas: $(tr '\n' ' ' < "$CALLS")"
case "$oc" in *" --- OCIOSO pendentes=4 "*" 250=sem_progresso"*) ok "250: pulado por sem-progresso" ;; *) falha "OCIOSO sem 250=sem_progresso" ;; esac
grep -q '^MOTIVO .*250 sem progresso' "$FILA/runs/STATUS.md" && ok "STATUS: 250 sem progresso" || falha "STATUS: $(grep '^MOTIVO' "$FILA/runs/STATUS.md")"

echo
echo "== 3. cooldown ativo: o liberado espera o cooldown =="
agora="$(date +%s)"; ate=$((agora + 1800))
mkdir -p "$(dirname "$COOLDOWN_FILE")"; echo "$ate" > "$COOLDOWN_FILE"
hora="$(date -r "$ate" '+%H:%M' 2>/dev/null || date -d "@$ate" '+%H:%M')"
: > "$CALLS"; drenar > "$TMP/out.3" 2>&1
oc="$(ultimo_ocioso)"; echo "  trilha: $oc"
case "$oc" in *" 250=cooldown:$hora"*) ok "250: cooldown até $hora" ;; *) falha "OCIOSO sem 250=cooldown:$hora" ;; esac
case "$oc" in *" 244=dependencia:241b:bloqueado"*) ok "a razão de dependência vence o cooldown" ;; *) falha "244 perdeu a razão real" ;; esac
grep -q "^MOTIVO .*250 em cooldown até $hora" "$FILA/runs/STATUS.md" && ok "STATUS: 250 em cooldown até $hora" || falha "STATUS: $(grep '^MOTIVO' "$FILA/runs/STATUS.md")"
rm -f "$COOLDOWN_FILE"

echo
echo "== 4. fins que NÃO gravam OCIOSO =="
antes="$(n_ocioso)"
: > "$FILA/PAUSAR"; drenar > "$TMP/out.4" 2>&1; rm -f "$FILA/PAUSAR"
[ "$(n_ocioso)" = "$antes" ] && ok "pausa: sem OCIOSO (quem pausou já sabe)" || falha "pausa gravou OCIOSO"
for id in 244 231 232 250; do ticket_set_status "$FILA/$id-t.md" done; done
drenar > "$TMP/out.5" 2>&1
[ "$(n_ocioso)" = "$antes" ] && ok "sem pendente nenhum: sem OCIOSO" || falha "fila sem pendente gravou OCIOSO"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
