#!/usr/bin/env bash
# test-shell.sh — os testes do motor que NÃO são vitest, contra o repo de
# fixture (peça K7b).
#
# São três, e os três morriam com rc 2 no kit pela MESMA causa: cada um resolve
# `CHECKOUT_REAL` a partir do próprio diretório (`$AQUI/../..`) e de lá copia
# `docs/fila/000-config.json` — arquivo que o kit não tem, porque a fila é do
# repo INSTALADO. Rodando a cópia que o `fixture.sh` vendoriza dentro do
# fixture, `$AQUI/../..` é o fixture, e o config está lá.
#
#   test-lib-config.sh    lê o config pelo lib.sh (CONFIG = <checkout>/docs/fila/000-config.json)
#   test-drenagem.sh      copia $CHECKOUT_REAL/docs/fila/000-config.json (linhas 25 e 29)
#   test-retry-worktree.sh  idem (linhas 32 e 36)
#
# Mais os três da etapa 7a, que já nascem com fixture própria (fila e config em
# heredoc num mktemp -d, via test-fixture-drenagem.sh) e não leem o checkout:
#   test-drenagem-sem-progresso.sh  a drenagem pula o ticket que não avança (7a-2)
#   test-sem-progresso-limite.sh    contador persistente que bloqueia no limite (7a-3)
#   test-ocioso.sh                  o evento OCIOSO diz por que cada pendente não roda (7a-4)
#   test-rc-executor.sh             o rc do executor atravessa o tee da drenagem (7a-7)
#   test-ambiente.sh                a mesma causa em dois tickets é ambiente e não bloqueia a fila (7a-8)
#
# E os da etapa 7b. Os que rodam o executor DE VERDADE montam um repo git num
# mktemp -d com o motor vendorizado e um `claude` falso no PATH
# (test-fixture-executor.sh); zero modelo, zero rede:
#   test-causa-adiamento.sh         a tabela de causas: cooldown só para limite remoto (7b-2)
#   test-ambiente-adiado.sh         a régua de AMBIENTE vale sobre o ADIADO sem cooldown (7b-2)
#   test-adiamentos-limite.sh       teto de adiamentos seguidos, com a causa real na nota (7b-3)
#   test-reprovado-sub.sh           sub-motivo, escalada só com juiz, repetição, tentativas persistidas (7b-4)
#   test-notificacao-ambiente.sh    o aviso de AMBIENTE só na entrada e na saída (7b-5)
#   test-reabertura-humana.sh       tentativas commitadas; devolução humana zera os contadores (7b-8)
#
# Cada um monta o PRÓPRIO `ORQ_EXEC_ROOT` num `mktemp -d` (drenagem e retry) ou
# trabalha direto no checkout (lib-config); nada aqui precisa exportar
# `ORQ_EXEC_ROOT` por fora — fazer isso sobrescreveria o isolamento que cada
# script declara antes do `source`, que é justamente o que o
# orquestrador-isolamento-teste.test.ts cobra.
#
# FICA DE FORA, por decisão: `test-preflight.sh`. Ele chama a API da Anthropic
# (sondagem paga). Entra numa peça própria, com OK humano explícito.
#
# Uso: bash scripts/kit/test-shell.sh

set -uo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh test-adiamentos-limite.sh test-reprovado-sub.sh test-notificacao-ambiente.sh test-reabertura-humana.sh'

FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
  printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
}
trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1 || true' EXIT

printf '== testes de shell do motor · fixture em %s ==\n\n' "$FX"

FALHAS=0
PLACAR=''
for s in $SCRIPTS; do
  printf -- '--- %s ---\n' "$s"
  bash "$FX/scripts/orquestrador/$s"
  rc=$?
  printf '\nrc(%s) = %s\n\n' "$s" "$rc"
  PLACAR="$PLACAR  rc=$rc  $s
"
  [ "$rc" = 0 ] || FALHAS=$((FALHAS + 1))
done

printf '== placar ==\n%s' "$PLACAR"
[ "$FALHAS" = 0 ] && { printf 'TODOS OS SCRIPTS SAÍRAM rc 0\n'; exit 0; }
printf '%s SCRIPT(S) COM rc != 0\n' "$FALHAS"
exit 1
