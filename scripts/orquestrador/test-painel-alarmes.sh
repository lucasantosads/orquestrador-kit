#!/usr/bin/env bash
# test-painel-alarmes.sh — os ALARMES do painel (peças K12 bloco D e K12a).
#
# Cada alarme é uma linha de TEXTO, nunca só cor, e cada um tem o seu caso real:
#   launchd_exit    last exit code != 0 no launchctl print (08/09: três ticks rc 127)
#   mudo            job carregado, sem PAUSAR, e nenhum DRENAGEM_INICIO há mais
#                   de 2x o start_interval
#   pausa_furada    PAUSAR de pé e a drenagem seguiu depois dele (09/09)
#   pausa_longa     PAUSAR há mais de 40 min (13/09: 11h pausado de madrugada)
#   execucao_longa  ticket em execução além do claude_timeout_secs + margem
# Mais os NEGATIVOS: dentro da janela, job descarregado (repo desagendado de
# propósito não é incidente), pausa respeitada, retry do ticket que já corria.
#
# O launchctl é um stub escrito aqui, no mktemp -d; o relógio é ORQ_PAINEL_AGORA.
#
# Uso: bash scripts/orquestrador/test-painel-alarmes.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/repos"; export ORQ_EXEC_ROOT
TMP="$(dirname "$ORQ_EXEC_ROOT")"
trap 'rm -rf "$TMP"' EXIT
# shellcheck source=test-fixture-painel.sh
source "$AQUI/test-fixture-painel.sh"
set +e

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
confere() { if [ "$2" = "$3" ]; then ok "$1"; else falha "$1: esperado '$2', veio '$3'"; fi; }

AGORA="$(fp_epoch_hoje 12:00:00)"; export ORQ_PAINEL_AGORA="$AGORA"
fp_launchctl_stub "$TMP"
export ORQ_REPOS="$TMP/repos.json"

# repo_novo <nome> — um repo ocioso com um pendente pronto e trilha vazia.
repo_novo() {
  local r="$ORQ_EXEC_ROOT/$1"
  rm -rf "$r"; fp_repo "$r"; fp_ticket "$r" 100 pendente
  fp_status "$r" ocioso — — — "drenagem encerrada"
  fp_repos "$ORQ_REPOS" "$r"
  RP="$r"
}
estado() { fp_painel --estado 2>"$TMP/err"; }
alarmes() { estado | jq -r '[.repos[0].alarmes[].id] | join(" ")' 2>/dev/null; }
texto()   { estado | jq -r --arg id "$1" '.repos[0].alarmes[] | select(.id == $id) | .texto' 2>/dev/null; }
tem() { # tem <descrição> <id> <trecho do texto>
  local tx; tx="$(texto "$2")"
  case "$tx" in *"$3"*) ok "$1: $tx" ;; *) falha "$1: alarme '$2' com '$3' ausente (alarmes: '$(alarmes)', texto: '$tx')" ;; esac
}
nenhum() { local a; a="$(alarmes)"; [ -z "$a" ] && ok "$1: silêncio" || falha "$1: esperava silêncio, veio '$a'"; }

echo "== 1. launchd_exit: last exit code != 0 =="
repo_novo a1; fp_evento "$RP" $((AGORA - 600)) --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
echo 127 > "$TMP/stub-exit"
tem "rc 127 com trilha recente" launchd_exit "rc 127"
confere "o card diz travado" travado "$(estado | jq -r '.repos[0].estado.tipo')"
echo 0 > "$TMP/stub-exit"
nenhum "rc 0 e drenagem dentro da janela"
echo 127 > "$TMP/stub-exit"; touch "$TMP/stub-descarregado"
nenhum "job NÃO carregado (desagendado de propósito)"
rm -f "$TMP/stub-descarregado"; echo 0 > "$TMP/stub-exit"

echo
echo "== 2. mudo: nenhum DRENAGEM_INICIO há mais de 2x o start_interval =="
repo_novo a2; fp_evento "$RP" $((AGORA - 3 * 1800)) --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
tem "DRENAGEM_INICIO de 3x o start_interval atrás" mudo "há 1h30"
tem "e diz o intervalo do job" mudo "a cada 30 min"
confere "o card diz travado" travado "$(estado | jq -r '.repos[0].estado.tipo')"
repo_novo a2b; fp_evento "$RP" $((AGORA - 1800)) --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
nenhum "DRENAGEM_INICIO dentro de 2x o start_interval"
repo_novo a2c; fp_evento "$RP" $((AGORA - 3 * 1800)) --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
touch "$TMP/stub-descarregado"; nenhum "velho, mas job descarregado"; rm -f "$TMP/stub-descarregado"
repo_novo a2d
tem "trilha sem nenhum DRENAGEM_INICIO, job carregado" mudo "nenhum DRENAGEM_INICIO"

echo
echo "== 3. pausa_furada: PAUSAR de pé e a drenagem seguiu depois dele =="
repo_novo a3
fp_evento "$RP" $((AGORA - 1860)) --- PAUSA motivo=teste por=painel
printf '%s | teste\n' "$(fp_fmt $((AGORA - 1860)) '%Y-%m-%d %H:%M')" > "$RP/docs/fila/PAUSAR"
fp_evento "$RP" $((AGORA - 1200)) --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
tem "DRENAGEM_INICIO sem motivo=pausado depois da PAUSA" pausa_furada "$(fp_fmt $((AGORA - 1200)) %H:%M)"
repo_novo a3b
printf '%s | teste\n' "$(fp_fmt $((AGORA - 1860)) '%Y-%m-%d %H:%M')" > "$RP/docs/fila/PAUSAR"
fp_evento "$RP" $((AGORA - 2000)) 530 INICIO attempt=1 model=sonnet
fp_evento "$RP" $((AGORA - 1500)) 530 REPROVADO motivo=criterio_qualidade sub=juiz attempt=1 diff=3
fp_evento "$RP" $((AGORA - 1400)) 530 INICIO attempt=2 model=opus
fp_evento "$RP" $((AGORA - 1200)) --- DRENAGEM_INICIO alvo=staging-auto motivo=pausado
fp_evento "$RP" $((AGORA - 1200)) --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=0 dur=0min motivo=pausado
if estado | jq -e '.repos[0].alarmes[] | select(.id == "pausa_furada")' >/dev/null 2>&1; then
  falha "pausa respeitada e retry do ticket que já corria viraram alarme"
else ok "pausa respeitada (motivo=pausado) e retry do 530, que já corria: sem pausa_furada"; fi
fp_evento "$RP" $((AGORA - 600)) 531 INICIO attempt=1 model=sonnet
tem "INICIO de OUTRO ticket depois da pausa" pausa_furada "531"

echo
echo "== 4. pausa_longa: PAUSAR há mais de 40 min =="
repo_novo a4
printf '%s | madrugada\n' "$(fp_fmt $((AGORA - 41 * 60)) '%Y-%m-%d %H:%M')" > "$RP/docs/fila/PAUSAR"
fp_evento "$RP" $((AGORA - 600)) --- DRENAGEM_INICIO alvo=staging-auto motivo=pausado
tem "41 min" pausa_longa "há 41 min"
printf '%s | agora há pouco\n' "$(fp_fmt $((AGORA - 39 * 60)) '%Y-%m-%d %H:%M')" > "$RP/docs/fila/PAUSAR"
nenhum "39 min"

echo
echo "== 5. execucao_longa: além do timeout do config mais a margem =="
repo_novo a5
fp_evento "$RP" $((AGORA - 600)) --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
fp_evento "$RP" $((AGORA - 1800 - 600 - 60)) 530 INICIO attempt=1 model=sonnet
fp_status "$RP" executando "530 t-530 · tentativa 1/3" "$(fp_fmt $((AGORA - 2460)))" —
tem "41 min com timeout de 30 e margem de 10" execucao_longa "timeout é 30 min"
confere "o card diz travado" travado "$(estado | jq -r '.repos[0].estado.tipo')"
repo_novo a5b
fp_evento "$RP" $((AGORA - 600)) --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
fp_evento "$RP" $((AGORA - 1800)) 530 INICIO attempt=1 model=sonnet
fp_status "$RP" executando "530 t-530 · tentativa 1/3" "$(fp_fmt $((AGORA - 1800)))" —
nenhum "30 min, dentro do timeout mais a margem"

echo
echo "== 6. todo alarme é texto, e o que falta no config vira 'sem dado' =="
repo_novo a6; fp_evento "$RP" $((AGORA - 600)) --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
jq 'del(.launchd.start_interval) | del(.claude_timeout_secs)' "$RP/docs/fila/000-config.json" > "$TMP/c" && mv "$TMP/c" "$RP/docs/fila/000-config.json"
sd="$(estado | jq -r '.repos[0].alarmes_sem_dado | join(" | ")')"
case "$sd" in *start_interval*claude_timeout_secs*) ok "sem dado: $sd" ;; *) falha "sem_dado não nomeia as chaves: '$sd'" ;; esac
pag="$(fp_painel --html 2>/dev/null)"
case "$pag" in *"alarmes"*"texto"*) ok "a página mostra o texto do alarme" ;; *) falha "página não renderiza o texto dos alarmes" ;; esac

echo
[ "$FALHAS" = 0 ] && { echo "TODOS OS CHECKS PASSARAM"; exit 0; }
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
