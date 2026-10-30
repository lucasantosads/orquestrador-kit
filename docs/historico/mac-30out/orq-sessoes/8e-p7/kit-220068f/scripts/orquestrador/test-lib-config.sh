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
# A mesma raiz que o lib.sh vai resolver (git --git-common-dir, peça 7b-9).
CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --show-toplevel 2>/dev/null || true)"
# Sem fila, nada aqui faz sentido: o kit não tem docs/fila (ela é do repo
# instalado). Falha dizendo como rodar, em vez do `jq`/`cp` crípticos de depois.
[ -f "$CHECKOUT_REAL/docs/fila/000-config.json" ] || { printf 'ERRO: %s não existe — rode via scripts/kit/test-shell.sh (ele roda este script dentro do fixture, que tem a fila)\n' "$CHECKOUT_REAL/docs/fila/000-config.json" >&2; exit 2; }
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
# `diff_cap` é conferido contra o ARQUIVO e contra a FORMA — nunca contra um
# número cravado. Até 2026-09-27 este check exigia `= 600` (o valor do
# _referencia-ci); o Actus traz 2500 (valor v1, MEDIDO: mediana 231, p90 533,
# máx 1323 em 121 tentativas) e o mesmo check ficou vermelho lá por estar
# desatualizado, não por bug — teste que falha por rotina deixa de ser sinal
# (actus-saas bf658ec, portado aqui). Trocar 600 por outro número recriaria o
# problema no próximo repo instalado. O que há para provar aqui são duas coisas,
# e o NÚMERO não é nenhuma delas: (a) o lib.sh LÊ o valor do config, em vez de
# trazer um default próprio; (b) o valor é utilizável como teto, isto é, inteiro
# positivo — `null` de chave ausente, vazio ou texto passariam despercebidos até
# o `[ "$DIFF_LINES" -le "$CFG_DIFF_CAP" ]` do executor quebrar em produção.
# Quanto DEVE valer o cap é decisão de política, e quem a guarda é o config.
[ "$CFG_DIFF_CAP" = "$esperado_cap" ] \
  && ok "diff_cap bate com o arquivo ($CFG_DIFF_CAP)" \
  || falha "diff_cap divergente: lib=$CFG_DIFF_CAP arquivo=$esperado_cap"
case "$CFG_DIFF_CAP" in
  ''|*[!0-9]*) falha "diff_cap não é inteiro: '$CFG_DIFF_CAP'" ;;
  *) [ "$CFG_DIFF_CAP" -gt 0 ] \
       && ok "diff_cap é inteiro positivo" \
       || falha "diff_cap não é positivo: $CFG_DIFF_CAP" ;;
esac

echo
echo "== causas de adiamento declaradas no config =="
CAUSAS="$(jq -r '.politica_adiamento.causas_que_adiam[]' "$CONFIG")"
printf '%s\n' "$CAUSAS" | sed 's/^/  - /'
n_causas="$(printf '%s\n' "$CAUSAS" | grep -c .)"
# 8: a 8ª ("falha de ambiente da worktree") veio do porte do Actus (§11 do
# CONTRATO) e, como a do juiz, NÃO é de texto: vem de criteriosNaoExecutados.
[ "$n_causas" = 8 ] && ok "8 causas declaradas" || falha "esperava 8 causas, achei $n_causas"
printf '%s\n' "$CAUSAS" | grep -qx 'falha de ambiente da worktree' \
  && ok "a causa de ambiente da worktree está declarada" \
  || falha "sumiu a causa 'falha de ambiente da worktree' de causas_que_adiam"
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
