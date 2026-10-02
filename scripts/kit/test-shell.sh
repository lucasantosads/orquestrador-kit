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
# E os do painel (peça K12), que montam N repos num mktemp -d
# (test-fixture-painel.sh) e rodam o orq-painel.py contra eles; python3, sem rede:
#   test-painel-visao.sh            visão geral: precisa de você, estado com tempo, bloqueados (A)
#   test-painel-detalhe.sh          detalhe do repo: 6 indicadores, prontos, hora a hora, disputados (B)
#   test-painel-pausa.sh            ações: PAUSAR e a pausa na trilha, disparo só ocioso (C)
#   test-painel-alarmes.sh          alarmes em frase: launchd, mudo, pausa furada/longa, execução longa (D)
#   test-painel-lento.sh            um repo lento não segura o /api/estado; recuo e processo morto no timeout (J)
#
# E os do porte do Actus (branch porte-actus, 24/09/2026):
#   test-gate-prevoo.sh             o gate de ticket roda antes da worktree; modos 'bloqueia' e 'aviso' (c404986)
#   test-tentativas-persistidas.sh  o contador já está no arquivo quando o processo morre; done zera (f3aaa89, casos novos)
#   test-orq-pause.sh               --off/--status tratam as duas sentinelas; trilha PAUSA/RETOMADA; orq retomar com o legado (514)
#
# E o do probe de modelo (ORQ-07):
#   test-preflight.sh               papel PENDENTE_* aborta antes de gastar; recusa de modelo; juiz por stub
#
# E o do contador do DIFF-CAP (porte do comarka 6307912, 02/10/2026):
#   test-diff-lines.sh              DIFF_LINES = inserções + deleções do numstat; binário zero; vazio 0
#
# E um que mora no KIT, não no fixture, porque instancia o PRÓPRIO fixture
# (roda depois do laço, pelo caminho do kit):
#   scripts/kit/test-fixture-gates.sh  a worktree do motor passa nos gates REAIS do config (e2e de 27/09)
#
# Cada um monta o PRÓPRIO `ORQ_EXEC_ROOT` num `mktemp -d` (drenagem e retry) ou
# trabalha direto no checkout (lib-config); nada aqui precisa exportar
# `ORQ_EXEC_ROOT` por fora — fazer isso sobrescreveria o isolamento que cada
# script declara antes do `source`, que é justamente o que o
# orquestrador-isolamento-teste.test.ts cobra.
#
# `test-preflight.sh` ficou de fora até 01/10/2026 porque chamava a API da
# Anthropic (a sondagem paga de US$ 0,34, peça 10 do PLAYBOOK). Não chama mais:
# o probe roda num ROOT sintético com papel PENDENTE_*, que aborta ANTES do
# `claude_run`, e o juiz roda por `--stub-juiz`. Mesmo assim ele roda aqui com
# um `claude` FALSO na frente do PATH, que só registra a chamada: se uma
# regressão desarmar o abort, o falso responde no lugar do real, nada é cobrado,
# e este script FALHA ao achar a chamada no registro.
#
# Uso: bash scripts/kit/test-shell.sh

set -uo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh test-adiamentos-limite.sh test-reprovado-sub.sh test-notificacao-ambiente.sh test-reabertura-humana.sh test-painel-visao.sh test-painel-detalhe.sh test-painel-pausa.sh test-painel-alarmes.sh test-painel-lento.sh test-gate-prevoo.sh test-tentativas-persistidas.sh test-orq-pause.sh test-preflight.sh test-diff-lines.sh'

FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
  printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
}
# O `claude` falso do test-preflight.sh: registra e falha, nunca responde.
CLAUDE_FALSO="$(mktemp -d)"
cat > "$CLAUDE_FALSO/claude" <<'FALSO'
#!/bin/sh
printf '%s\n' "$*" >> "$(dirname "$0")/chamadas.log"
exit 1
FALSO
chmod +x "$CLAUDE_FALSO/claude"
trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1 || true; rm -rf "$CLAUDE_FALSO"' EXIT

printf '== testes de shell do motor · fixture em %s ==\n\n' "$FX"

FALHAS=0
PLACAR=''
for s in $SCRIPTS; do
  printf -- '--- %s ---\n' "$s"
  if [ "$s" = test-preflight.sh ]; then
    PATH="$CLAUDE_FALSO:$PATH" bash "$FX/scripts/orquestrador/$s"
    rc=$?
    if [ -s "$CLAUDE_FALSO/chamadas.log" ]; then
      printf 'FALHA: o test-preflight.sh chamou o claude (o real seria PAGO):\n' >&2
      sed 's/^/  | /' "$CLAUDE_FALSO/chamadas.log" >&2
      [ "$rc" = 0 ] && rc=3
    fi
  else
    bash "$FX/scripts/orquestrador/$s"
    rc=$?
  fi
  printf '\nrc(%s) = %s\n\n' "$s" "$rc"
  PLACAR="$PLACAR  rc=$rc  $s
"
  [ "$rc" = 0 ] || FALHAS=$((FALHAS + 1))
done

# Fora do laço: instancia o próprio fixture, então roda do kit.
printf -- '--- %s ---\n' 'test-fixture-gates.sh (kit)'
bash "$KIT/scripts/kit/test-fixture-gates.sh"
rc=$?
printf '\nrc(%s) = %s\n\n' 'test-fixture-gates.sh' "$rc"
PLACAR="$PLACAR  rc=$rc  test-fixture-gates.sh (kit)
"
[ "$rc" = 0 ] || FALHAS=$((FALHAS + 1))

printf '== placar ==\n%s' "$PLACAR"
[ "$FALHAS" = 0 ] && { printf 'TODOS OS SCRIPTS SAÍRAM rc 0\n'; exit 0; }
printf '%s SCRIPT(S) COM rc != 0\n' "$FALHAS"
exit 1
