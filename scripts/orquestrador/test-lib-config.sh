#!/usr/bin/env bash
# test-lib-config.sh — prova que o lib.sh portado (ORQ-01) lê o 000-config.json
# REAL deste repo e que is_adiavel cobre as causas de TEXTO de politica_adiamento.
#
# 7 causas, e a 7ª não é de texto. `veredito do juiz ilegível` entrou em
# `causas_que_adiam` na sessão B junto com o juiz, e é a única que NÃO chega por
# padrão na saída do CLI: ela vem do campo `juizIlegivel`, que o `decisao.ts` lê
# ANTES de qualquer causa de mérito (o juiz roda depois de o agente sair com
# rc=0, então o curto-circuito de `exitCode === 0` engoliria o sinal). Por isso a
# tabela de `is_adiavel` abaixo tem 6 entradas e a contagem cobra 7: quem tentar
# fechar essa diferença escrevendo um caso de texto para o juiz vai atrás de um
# padrão que não existe.
#
# Não é mock: carrega o lib.sh de verdade, que resolve as raízes por
# git rev-parse --git-common-dir e lê docs/fila/000-config.json do checkout
# principal. Se o config não for lido corretamente, este script sai != 0.
#
# Uso: bash scripts/orquestrador/test-lib-config.sh

set -uo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "$AQUI/lib.sh"

FALHAS=0
ok()   { printf '  ok   %s\n' "$*"; }
falha(){ printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS+1)); }

echo "== raízes resolvidas pelo lib.sh =="
echo "  ROOT           = $ROOT"
echo "  MAIN_CHECKOUT  = $MAIN_CHECKOUT"
echo "  CONFIG         = $CONFIG"
[ -f "$CONFIG" ] && ok "config encontrado no caminho resolvido" \
                 || falha "config NÃO encontrado — resolução de raiz quebrada"

echo
echo "== valores lidos do config REAL =="
echo "  ambiente_id      = $CFG_AMBIENTE_ID"
echo "  repo_origin      = $CFG_REPO_ORIGIN"
echo "  diff_cap_linhas  = $CFG_DIFF_CAP"
echo "  branch_alvo      = $CFG_BRANCH_ALVO"
echo "  max_retries      = $CFG_MAX_RETRIES"

# Confere contra leitura direta por jq: se o lib divergir do arquivo, é bug.
esperado_amb="$(jq -r '.ambiente_id' "$CONFIG")"
esperado_cap="$(jq -r '.diff_cap_linhas' "$CONFIG")"
[ "$CFG_AMBIENTE_ID" = "$esperado_amb" ] && [ -n "$CFG_AMBIENTE_ID" ] && [ "$CFG_AMBIENTE_ID" != null ] \
  && ok "ambiente_id bate com o arquivo" || falha "ambiente_id divergente ou vazio"
[ "$CFG_DIFF_CAP" = "$esperado_cap" ] && [ "$CFG_DIFF_CAP" = 600 ] \
  && ok "diff_cap = 600 (o NOSSO, não o 2500 do comarka-os)" || falha "diff_cap inesperado: $CFG_DIFF_CAP"

echo
echo "== causas de adiamento declaradas no config =="
CAUSAS="$(jq -r '.politica_adiamento.causas_que_adiam[]' "$CONFIG")"
printf '%s\n' "$CAUSAS" | sed 's/^/  - /'
n_causas="$(printf '%s\n' "$CAUSAS" | grep -c .)"
[ "$n_causas" = 7 ] && ok "7 causas declaradas" || falha "esperava 7 causas, achei $n_causas"
# A 7ª é nomeada, não só contada: se alguém trocar o rótulo, o teste tem que
# apontar QUAL causa sumiu — contagem sozinha não diz nada a quem for consertar.
printf '%s\n' "$CAUSAS" | grep -qi 'juiz' \
  && ok "a causa do juiz ilegível está declarada" \
  || falha "sumiu a causa 'veredito do juiz ilegível' de causas_que_adiam"

echo
echo "== is_adiavel cobre cada causa =="
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# caso <rótulo> <texto-do-output> <rc> <esperado: adia|nao-adia>
caso() {
  local rotulo="$1" texto="$2" rc="$3" esperado="$4" f
  f="$TMP/out.txt"; printf '%s\n' "$texto" > "$f"
  if is_adiavel "$f" "$rc"; then real=adia; else real=nao-adia; fi
  [ "$real" = "$esperado" ] && ok "$rotulo -> $real" || falha "$rotulo -> $real (esperava $esperado)"
}

caso "erro de conexão (ECONNREFUSED)"      "Error: connect ECONNREFUSED 127.0.0.1:443" 1 adia
caso "erro de conexão (socket hang up)"    "API Error: socket hang up"                 1 adia
caso "sessão expirada"                     "Error: session expired, please log in again" 1 adia
caso "sessão expirada (token)"             "token expired — reauthenticate"            1 adia
caso "rate limit"                          "Request rejected (429): rate_limit_error"  1 adia
caso "quota estourada"                     "usage limit reached — credit balance too low" 1 adia
caso "timeout de claude_timeout_secs"      "(irrelevante)"                             124 adia
caso "gate interrompido (SIGINT)"          "(irrelevante)"                             130 adia
caso "gate interrompido (SIGHUP)"          "(irrelevante)"                             129 adia

# Gate duplo: texto que MENCIONA a falha mas rc=0 não pode adiar — senão um
# ticket sobre implementar rate limiting se auto-adia para sempre.
caso "menção a rate limit com rc=0"        "implementamos rate limit no endpoint"      0 nao-adia
caso "menção a sessão expirada com rc=0"   "tratamos session expired na UI"            0 nao-adia
# Falha de mérito continua reprovando (não vira adiamento).
caso "erro real de código"                 "error TS2322: Type 'string' is not assignable" 1 nao-adia

echo
if [ "$FALHAS" = 0 ]; then
  echo "TODOS OS CHECKS PASSARAM"
  exit 0
fi
echo "$FALHAS CHECK(S) FALHARAM"
exit 1
