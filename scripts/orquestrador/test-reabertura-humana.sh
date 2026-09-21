#!/usr/bin/env bash
# test-reabertura-humana.sh · contagem de tentativas commitada, e devolução
# humana que zera os contadores (peça 7b-8).
#
# Desde a 7b-4 o contador de retry mora no campo `tentativas` do ticket. Duas
# perguntas antes do merge:
#
#   1. A gravação é COMMITADA? O executor grava tentativas+1 antes de cada
#      tentativa; se isso deixasse docs/fila sujo, o preflight do disparo
#      seguinte recusaria por árvore suja. O `claude` falso registra o git
#      status do checkout principal a cada chamada: depois de um REPROVADO e
#      um RETRY, docs/fila tem de estar limpo.
#   2. Devolução humana. Um ticket bloqueado por max_retries que um humano
#      devolve para pendente (editando o status e commitando, como o lote 14
#      fez com o 235) tem de rodar de novo com tudo zerado: tentativas,
#      .sem-progresso e .adiamentos. Roda uma drenagem DE VERDADE (drenar() do
#      local-loop.sh vendorizado, chamando o executor.sh real).
#
# Uso: bash scripts/orquestrador/test-reabertura-humana.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP_RAIZ="$(dirname "$ORQ_EXEC_ROOT")"
# shellcheck source=test-fixture-executor.sh
source "$AQUI/test-fixture-executor.sh"
trap 'fxe_limpa; rm -rf "$TMP_RAIZ"' EXIT

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
tem()   { fxe_eventos | grep -Eq "$1"; }
RUNS() { printf '%s/repo/docs/fila/runs/901' "$FXE"; }

# drenagem_real — uma drenagem inteira, com o local-loop.sh e o executor.sh
# vendorizados no fixture, o `claude` falso no PATH e o isolamento de teste.
drenagem_real() {
  ( cd "$FXE/repo" && export ORQ_TESTE=1 ORQ_EXEC_ROOT="$FXE/repo" PATH="$FXE/bin:$PATH" LOCAL_LOOP_SOURCED=1 \
      && source "$FXE/repo/scripts/orquestrador/local-loop.sh" && drenar ) >> "$FXE/saida-drenagem" 2>&1
}

echo "== 1. a contagem de tentativas é commitada: docs/fila limpo depois de REPROVADO e RETRY =="
fxe_novo '.max_retries = 2'
fxe_criterio falhou; fxe_juiz '{"aprovado": true, "motivo": "ok", "criterios_falhos": []}'
fxe_fila linhas:5 linhas:6 linhas:7
fxe_roda
tem ' 901 REPROVADO .* attempt=1 ' && tem ' 901 RETRY attempt=2 ' && ok "houve REPROVADO e RETRY" || falha "sem REPROVADO e RETRY"
sed 's/^/  | /' "$FXE/status-chamadas"
sujo="$(grep -v '^== chamada' "$FXE/status-chamadas" || true)"
[ -z "$sujo" ] && ok "docs/fila limpo no checkout principal em TODA chamada (inclusive depois de REPROVADO+RETRY)" || falha "docs/fila sujo durante a execução: $sujo"
[ -z "$(git -C "$FXE/repo" status --porcelain -- docs/fila)" ] && ok "docs/fila limpo no fim" || falha "sujo no fim: $(git -C "$FXE/repo" status --porcelain -- docs/fila)"
# O log vai para uma variável antes do grep: `git log | grep -q` sob pipefail
# falha por SIGPIPE quando o grep acha cedo (o `| grep -q` que o gate de ticket
# do Actus reprova em critério, aab3f4e).
log_ticket="$(git -C "$FXE/repo" log --format=%s -- docs/fila/901-t.md)"
printf '%s\n' "$log_ticket" | sed 's/^/  | /'
printf '%s\n' "$log_ticket" | grep -qx 'fila: 901 tentativa 2' && ok "commit 'fila: 901 tentativa 2' no log" || falha "sem o commit da tentativa 2"
[ "$(fxe_status)" = bloqueado ] && [ "$(fxe_campo '.tentativas')" = 3 ] && ok "bloqueado por max_retries com tentativas=3" || falha "status=$(fxe_status) tentativas=$(fxe_campo '.tentativas')"

echo
echo "== 2. devolução humana: bloqueado -> pendente num commit humano zera tudo =="
printf '2|2026-09-20 10:00:00-0300|2026-09-20 11:00:00-0300\n' > "$(RUNS)/.sem-progresso"
printf '3|2026-09-20 10:00:00-0300|2026-09-20 12:00:00-0300\n' > "$(RUNS)/.adiamentos"
sed -i.bak 's/"status": "bloqueado"/"status": "pendente"/' "$FXE/repo/docs/fila/901-t.md" && rm -f "$FXE/repo/docs/fila/901-t.md.bak"
git -C "$FXE/repo" commit -q -am "humano: 901 devolvido para pendente"
[ "$(fxe_status)" = pendente ] && [ "$(fxe_campo '.tentativas')" = 3 ] && ok "antes da drenagem: pendente, tentativas=3, .sem-progresso=2, .adiamentos=3" || falha "fixture: status=$(fxe_status)"
ev_antes="$(fxe_eventos | grep -c .)"
# A drenagem: 1ª tentativa reprova, a 2ª cai em 503 (adiada sem cooldown). Com
# a contagem zerada, o ticket fica pendente com tentativas=1; sem zerar, ele
# rodaria a attempt=4 e bloquearia na hora.
fxe_fila linhas:8 503
drenagem_real
novos="$(fxe_eventos | tail -n +"$((ev_antes + 1))")"
printf '%s\n' "$novos" | sed 's/^[^ ]* /  | /'
printf '%s\n' "$novos" | grep -q ' 901 INICIO attempt=1 ' && ok "a drenagem executou o ticket a partir de attempt=1" || falha "não recomeçou em attempt=1"
printf '%s\n' "$novos" | grep -q ' 901 BLOQUEADO ' && falha "bloqueou de novo" || ok "não bloqueou na hora"
printf '%s\n' "$novos" | grep -q ' 901 RETRY attempt=2 ' && ok "com retry disponível (RETRY attempt=2)" || falha "sem RETRY"
[ "$(fxe_status)" = pendente ] && ok "segue pendente (a 2ª tentativa adiou)" || falha "status=$(fxe_status)"
[ "$(fxe_campo '.tentativas')" = 1 ] && ok "tentativas=1 (zerada e somada uma reprovação)" || falha "tentativas=$(fxe_campo '.tentativas')"
[ ! -f "$(RUNS)/.sem-progresso" ] && ok ".sem-progresso zerado" || falha ".sem-progresso: $(cat "$(RUNS)/.sem-progresso")"
[ "$(cut -d'|' -f1 "$(RUNS)/.adiamentos" 2>/dev/null)" = 1 ] && ok ".adiamentos recomeçou em 1 (era 3; sem zerar seria 4 e bloquearia)" || falha ".adiamentos: $(cat "$(RUNS)/.adiamentos" 2>/dev/null)"
printf '%s\n' "$novos" | grep -q ' 901 RECUPERADO motivo=reaberto de=bloqueado$' && ok "trilha: RECUPERADO motivo=reaberto de=bloqueado" || falha "sem RECUPERADO motivo=reaberto"
[ -z "$(git -C "$FXE/repo" status --porcelain -- docs/fila)" ] && ok "docs/fila limpo depois da drenagem (o zero também foi commitado)" || falha "sujo: $(git -C "$FXE/repo" status --porcelain -- docs/fila)"

echo
echo "== 3. a devolução zera UMA vez: a drenagem seguinte continua de onde parou =="
fxe_fila linhas:11
ev_antes="$(fxe_eventos | grep -c .)"
drenagem_real
novos="$(fxe_eventos | tail -n +"$((ev_antes + 1))")"
printf '%s\n' "$novos" | grep -q ' 901 INICIO attempt=2 ' && ok "recomeça em attempt=2 (não zera de novo)" || falha "INICIO: $(printf '%s\n' "$novos" | grep INICIO | head -1)"
printf '%s\n' "$novos" | grep -q 'RECUPERADO motivo=reaberto' && falha "zerou de novo" || ok "nenhum RECUPERADO novo"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
