#!/usr/bin/env bash
# test-painel-pausa.sh — as AÇÕES do painel e a pausa na trilha (peça K12, bloco C).
#
# A única escrita no repo alvo é criar ou apagar o `pausar_file` do config
# (docs/fila/PAUSAR), e cada uma deixa UMA linha na trilha: `PAUSA motivo=
# por=painel` e `RETOMADA por=painel dur=`. O legado `.orq-pause` é lido e NUNCA
# escrito (nem apagado). Não existe "pausar agora": o motor não mata executor.
# O disparo (kickstart, sem -k) só com STATUS ocioso.
#
# O servidor sobe de verdade numa porta livre; o launchctl é um stub escrito
# aqui, no mktemp -d, que só registra a chamada.
#
# Uso: bash scripts/orquestrador/test-painel-pausa.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/repos"; export ORQ_EXEC_ROOT
TMP="$(dirname "$ORQ_EXEC_ROOT")"
PID_SRV=''
trap '[ -z "$PID_SRV" ] || kill "$PID_SRV" 2>/dev/null; rm -rf "$TMP"' EXIT
# shellcheck source=test-fixture-painel.sh
source "$AQUI/test-fixture-painel.sh"
set +e

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
confere() { if [ "$2" = "$3" ]; then ok "$1"; else falha "$1: esperado '$2', veio '$3'"; fi; }

fp_launchctl_stub "$TMP"

R="$ORQ_EXEC_ROOT/rho"; fp_repo "$R"
fp_ticket "$R" 100 pendente
fp_status "$R" executando "100 t-100 · tentativa 1/3" "$(date +%H:%M:%S)" —
S="$ORQ_EXEC_ROOT/sigma"; fp_repo "$S"
fp_ticket "$S" 200 pendente
fp_status "$S" ocioso — — — pausado
printf '2026-09-01 10:00 | pausa antiga, do tempo do .orq-pause\n' > "$S/docs/fila/.orq-pause"
LEGADO_ANTES="$(cat "$S/docs/fila/.orq-pause")"

export ORQ_REPOS="$TMP/repos.json"
fp_repos "$ORQ_REPOS" "$R" "$S"

fp_servidor_sobe "$TMP" || { echo "servidor não subiu:"; cat "$TMP/srv.log"; exit 1; }
echo "  servidor em $URL"

# retrato do repo: tudo menos PAUSAR e a trilha, que são as duas escritas permitidas
retrato() { (cd "$1" && find . -type f ! -path ./docs/fila/PAUSAR ! -path ./docs/fila/runs/events.log | sort | xargs shasum 2>/dev/null); }
ANTES="$(retrato "$R")"

echo "== 1. pausar: cria o PAUSAR do contrato e grava PAUSA na trilha =="
resp="$(fp_post acao '{"acao":"pausar","repo":"rho","motivo":"leva da tarde"}')"
confere "HTTP 200" 200 "$(fp_http)"
[ -f "$R/docs/fila/PAUSAR" ] && ok "docs/fila/PAUSAR criado" || falha "PAUSAR não criado"
grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} \| leva da tarde$' "$R/docs/fila/PAUSAR" 2>/dev/null \
  && ok "conteúdo no formato do §7: <AAAA-MM-DD HH:MM> | motivo" || falha "conteúdo: $(cat "$R/docs/fila/PAUSAR" 2>/dev/null)"
ult="$(tail -1 "$R/docs/fila/runs/events.log" 2>/dev/null)"
case "$ult" in *" --- PAUSA motivo=leva-da-tarde por=painel") ok "trilha: $ult" ;; *) falha "trilha sem PAUSA: '$ult'" ;; esac
case "$resp" in *"ENTRE tickets"*) ok "a resposta explica que para ENTRE tickets" ;; *) falha "resposta sem a explicação: $resp" ;; esac
[ ! -e "$R/docs/fila/.orq-pause" ] && ok ".orq-pause nunca é escrito" || falha "o painel escreveu .orq-pause"
confere "nada mais mudou no repo" "$ANTES" "$(retrato "$R")"

echo
echo "== 2. pausar de novo: recusa, sem segunda linha =="
n_antes="$(grep -c ' PAUSA ' "$R/docs/fila/runs/events.log")"
fp_post acao '{"acao":"pausar","repo":"rho"}' >/dev/null
confere "HTTP 409" 409 "$(fp_http)"
confere "sem PAUSA duplicada" "$n_antes" "$(grep -c ' PAUSA ' "$R/docs/fila/runs/events.log")"

echo
echo "== 3. o estado diz o que cada botão pode e por quê =="
est="$(curl -s "$URL/api/estado")"
confere "rho: pausar desabilitado" false "$(printf '%s' "$est" | jq -r '.repos[0].acoes.pausar.habilitado')"
confere "rho: retomar habilitado" true "$(printf '%s' "$est" | jq -r '.repos[0].acoes.retomar.habilitado')"
confere "rho: disparo desabilitado (ticket em curso)" false "$(printf '%s' "$est" | jq -r '.repos[0].acoes.kickstart.habilitado')"
case "$(printf '%s' "$est" | jq -r '.repos[0].acoes.kickstart.motivo')" in
  *"em curso"*) ok "o motivo do disparo desabilitado está escrito" ;; *) falha "sem motivo do disparo" ;; esac
confere "sem ação 'pausar agora'" "kickstart pausar retomar" "$(printf '%s' "$est" | jq -r '.repos[0].acoes | keys | join(" ")')"

echo
echo "== 4. retomar: apaga o PAUSAR e grava RETOMADA com a duração =="
fp_post acao '{"acao":"retomar","repo":"rho"}' >/dev/null
confere "HTTP 200" 200 "$(fp_http)"
[ ! -e "$R/docs/fila/PAUSAR" ] && ok "PAUSAR apagado" || falha "PAUSAR ainda existe"
ult="$(tail -1 "$R/docs/fila/runs/events.log")"
case "$ult" in *" --- RETOMADA por=painel dur=0min") ok "trilha: $ult" ;; *) falha "trilha sem RETOMADA: '$ult'" ;; esac
confere "nada mais mudou no repo" "$ANTES" "$(retrato "$R")"
fp_post acao '{"acao":"retomar","repo":"rho"}' >/dev/null
confere "retomar sem pausa: 409" 409 "$(fp_http)"

echo
echo "== 5. legado .orq-pause: lido, nunca escrito nem apagado =="
est="$(curl -s "$URL/api/estado")"
confere "sigma aparece pausado" pausado "$(printf '%s' "$est" | jq -r '.repos[1].estado.tipo')"
confere "sigma: retomar desabilitado" false "$(printf '%s' "$est" | jq -r '.repos[1].acoes.retomar.habilitado')"
case "$(printf '%s' "$est" | jq -r '.repos[1].acoes.retomar.motivo')" in
  *".orq-pause"*) ok "o motivo nomeia o .orq-pause" ;; *) falha "motivo sem o legado" ;; esac
fp_post acao '{"acao":"retomar","repo":"sigma"}' >/dev/null
confere "POST retomar no legado: 409" 409 "$(fp_http)"
confere ".orq-pause intacto" "$LEGADO_ANTES" "$(cat "$S/docs/fila/.orq-pause" 2>/dev/null)"
[ ! -e "$S/docs/fila/PAUSAR" ] && ok "sigma continua sem PAUSAR" || falha "PAUSAR criado em sigma"

echo
echo "== 6. disparo: só com STATUS ocioso, e sem -k =="
fp_post acao '{"acao":"kickstart","repo":"rho"}' >/dev/null
confere "com ticket em curso: 409" 409 "$(fp_http)"
grep -q kickstart "$TMP/launchctl.log" 2>/dev/null && falha "launchctl kickstart chamado com ticket em curso" || ok "launchctl kickstart não chamado"
fp_status "$R" ocioso — — "100 APROVADO 10:00:00 (60s)" "drenagem encerrada"
fp_post acao '{"acao":"kickstart","repo":"rho"}' >/dev/null
confere "ocioso: 200" 200 "$(fp_http)"
confere "kickstart gui/<uid>/<label do config>, sem -k" "kickstart gui/$(id -u)/org.fixture.rho" "$(grep kickstart "$TMP/launchctl.log" | tail -1)"

echo
echo "== 7. o resto é recusado =="
fp_post acao '{"acao":"merge","repo":"rho"}' >/dev/null
confere "ação fora da allowlist: 403" 403 "$(fp_http)"
fp_post acao '{"acao":"pausar","repo":"nao-existe"}' >/dev/null
confere "repo desconhecido: 400" 400 "$(fp_http)"
cod="$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: evil.example' "$URL/api/estado")"
confere "Host estranho: 403" 403 "$cod"

echo
echo "== 8. a página: Pausar e Retomar, e o que a pausa faz =="
pag="$(curl -s "$URL/")"
for s in 'Pausar' 'Retomar' 'ENTRE tickets' 'nada é interrompido'; do
  case "$pag" in *"$s"*) ok "página contém '$s'" ;; *) falha "página sem '$s'" ;; esac
done
case "$pag" in *"Pausar agora"*) falha "página oferece 'Pausar agora'" ;; *) ok "sem 'Pausar agora'" ;; esac

echo
echo "== launchctl: só o stub, nunca o do sistema (K12-E) =="
fp_launchctl_confere

echo
[ "$FALHAS" = 0 ] && { echo "TODOS OS CHECKS PASSARAM"; exit 0; }
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
