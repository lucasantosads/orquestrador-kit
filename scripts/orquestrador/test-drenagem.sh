#!/usr/bin/env bash
# test-drenagem.sh — prova os guards da drenagem sem tocar o repo.
# Carrega o local-loop.sh em modo SOURCED (só define funções, nada roda) e
# exercita merge_em_alvo() nos caminhos que precisam RECUSAR.
#
# A segunda seção (peça 6 da sessão B) exercita `drenar` inteira num ROOT
# sintético, para o caminho de `refatiar`: ROOT sintético porque `drenar`
# ESCREVE status de ticket, e rodá-la contra o checkout real mexeria na fila.
#
# Uso: bash scripts/orquestrador/test-drenagem.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ISOLAMENTO (peça 0d): a trilha, o STATUS e o ledger de custo DESTE script vivem
# num fixture temporário, e o `ORQ_TESTE=1` faz o `lib.sh` RECUSAR qualquer
# escrita fora dele. Sem as duas linhas, o `source` abaixo herda o checkout
# PRINCIPAL — `lib.sh` resolve `MAIN_CHECKOUT` por `git rev-parse
# --git-common-dir`, de qualquer worktree — e um `event` disparado aqui grava na
# trilha de produção. Foi assim que os `EXECUTOR_MORREU` espúrios de 2026-09-04
# 20:45/20:47 entraram no `events.log` real.
#
# FIXTURE PRÓPRIA (peça 7a-1): fila e config nascem AQUI, em heredoc, e nada é
# copiado do checkout. Até a 7a-1 o config vinha de
# `$CHECKOUT_REAL/docs/fila/000-config.json`, que o KIT não tem (a fila é do
# repo instalado): rodado na raiz do kit o `cp` falhava, o `source` morria no
# `jq` e o script saía rc 2 — e o assert "seguiu para o próximo ticket" nunca
# tinha sido exercido fora de um fixture vendorizado. O checkout real continua
# sendo usado para UMA coisa, só leitura: provar que a branch protegida dele
# não se move (casos 2 e 3).
CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
CHECKOUT_REAL="$(git -C "$CHECKOUT_REAL" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"

# escrever_config <raiz> — o 000-config.json MÍNIMO que o lib.sh e o
# local-loop.sh leem no carregamento e na drenagem (config-chaves.ts). Nada de
# gate, juiz ou modelo: o executor aqui é sempre stub.
escrever_config() {
  mkdir -p "$1/docs/fila/runs"
  cat > "$1/docs/fila/000-config.json" <<'JSON'
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
  echo '{"$schema_versao": 2, "tokens": []}' > "$1/docs/fila/liberacoes.json"
}

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
escrever_config "$ORQ_EXEC_ROOT"
trap 'rm -rf "$(dirname "$ORQ_EXEC_ROOT")"' EXIT
LOCAL_LOOP_SOURCED=1
# shellcheck source=local-loop.sh
source "$AQUI/local-loop.sh"
# lib.sh (via local-loop.sh) liga `set -e`; aqui rc != 0 é o RESULTADO esperado
# de metade dos casos, então errexit tem que sair.
set +e

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

echo "== config lida =="
echo "  branch_alvo=$BRANCH_ALVO  branch_protegida=$BRANCH_PROTEGIDA"
[ "$BRANCH_ALVO" != "$BRANCH_PROTEGIDA" ] && ok "alvo != protegida" || falha "alvo é a protegida"

echo
echo "== merge_em_alvo RECUSA a branch protegida =="

# Caso 1: alvo configurado como a própria protegida.
BRANCH_ALVO_ORIG="$BRANCH_ALVO"
BRANCH_ALVO="$BRANCH_PROTEGIDA"
saida="$(merge_em_alvo 000 /tmp 2>&1)"; rc=$?
BRANCH_ALVO="$BRANCH_ALVO_ORIG"
[ "$rc" = 2 ] && ok "alvo == protegida => rc=2 (recusado)" || falha "alvo == protegida deu rc=$rc"
printf '%s' "$saida" | grep -q "PROTEGIDA" && ok "recusa diz o motivo" || falha "recusa sem motivo claro"

# Caso 2: o worktree de merge está NA protegida (o checkout principal está em
# main). Aqui o alvo está certo, mas o destino real não — tem que recusar igual.
# O checkout REAL de propósito: o que se prova aqui é que a branch protegida
# do repo de verdade não se move. A trilha é que fica no fixture.
principal="$CHECKOUT_REAL"
branch_do_principal="$(git -C "$principal" rev-parse --abbrev-ref HEAD)"
echo "  (worktree de teste: $principal, em '$branch_do_principal')"
if [ "$branch_do_principal" = "$BRANCH_PROTEGIDA" ]; then
  saida="$(merge_em_alvo 000 "$principal" 2>&1)"; rc=$?
  [ "$rc" = 2 ] && ok "worktree em '$BRANCH_PROTEGIDA' => rc=2 (recusado)" || falha "worktree na protegida deu rc=$rc"
  printf '%s' "$saida" | grep -q "protegida" && ok "recusa nomeia a protegida" || falha "recusa sem menção à protegida"
else
  echo "  (pulado: o checkout principal não está em $BRANCH_PROTEGIDA agora)"
fi

# Caso 3: e a protegida continua intacta — nenhum merge aconteceu.
antes="$(git -C "$principal" rev-parse "$BRANCH_PROTEGIDA")"
merge_em_alvo 000 "$principal" >/dev/null 2>&1 || true
depois="$(git -C "$principal" rev-parse "$BRANCH_PROTEGIDA")"
[ "$antes" = "$depois" ] && ok "$BRANCH_PROTEGIDA intacta (${antes:0:8})" || falha "$BRANCH_PROTEGIDA MUDOU"

echo
echo "== drenar TRATA o status refatiar (regra 19) =="
# ROOT SINTÉTICO, nunca o checkout real: `drenar` escreve status de ticket e
# commita. O executor entra como stub que devolve o ticket em `refatiar`, que é
# o desfecho novo da peça 2 — o que se prova aqui é que a drenagem NÃO tenta
# mergear um ticket assim, não o conta como aprovado nem como bloqueado, e
# segue para o próximo em vez de parar por "sem progresso".
fx="$(mktemp -d)"
escrever_config "$fx"
for id in 901 902; do
  cat > "$fx/docs/fila/$id-t.md" <<TICKET
# $id

\`\`\`json
{"id": "$id", "slug": "t", "status": "pendente", "origem": "humano",
 "objetivo": "x", "pathspec_allowlist": ["src/a.ts"], "dependencias": [],
 "criterios_aceite": []}
\`\`\`
TICKET
done

saida="$(ORQ_EXEC_ROOT="$fx" LOCAL_LOOP_SOURCED=1 bash -c "
  source '$AQUI/local-loop.sh'
  set +e
  ensure_staging_worktree() { echo /tmp; }
  ticket_commit() { return 0; }
  merge_em_alvo() { echo 'MERGE TENTADO' >&2; return 0; }
  run_executor_once() {
    # o executor devolveria o ticket em refatiar; aqui só o status importa
    echo \"CHAMADA \$(ticket_field \"\$2\" .id)\" >&2
    ticket_set_status \"\$2\" refatiar
    return 0
  }
  drenar
" 2>&1)"

printf '%s' "$saida" | grep -q "MERGE TENTADO" \
  && falha "tentou mergear um ticket em refatiar" || ok "refatiar NÃO vai para o merge"
printf '%s' "$saida" | grep -q "voltou para REFATIAR" \
  && ok "a drenagem diz que o ticket voltou" || falha "refatiar passou em silêncio"
# "Seguiu" é afirmado pelo que ACONTECEU, não só pela ausência da frase: as
# duas chamadas, na ordem da fila. Sem a primeira linha o assert passaria com
# uma drenagem que nem começou.
chamadas="$(printf '%s\n' "$saida" | sed -n 's/^CHAMADA //p' | tr '\n' ' ')"
if [ "$chamadas" = "901 902 " ] && ! printf '%s' "$saida" | grep -q "sem progresso"; then
  ok "seguiu para o próximo ticket (executor chamado para: $chamadas)"
else
  falha "não seguiu para o próximo: chamadas='$chamadas'"
fi
grep -q "DRENAGEM_FIM .*refatiar=2" "$fx/docs/fila/runs/events.log" 2>/dev/null \
  && ok "o placar da drenagem conta os 2 refatiados" \
  || falha "refatiar não apareceu no DRENAGEM_FIM: $(grep DRENAGEM_FIM "$fx/docs/fila/runs/events.log" 2>/dev/null | tail -1)"
grep -q "DRENAGEM_FIM aprovados=0 bloqueados=0" "$fx/docs/fila/runs/events.log" 2>/dev/null \
  && ok "não conta como aprovado nem como bloqueado" || falha "refatiar contaminou outro contador"
rm -rf "$fx"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
