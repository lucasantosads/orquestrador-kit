#!/usr/bin/env bash
# test-painel-lento.sh — um repo lento não segura o painel (peça K12-J).
#
# Caso real: com o comarka-operacional (92 pendentes), o /api/estado esperava
# até 60 s pelo pendentes_razoes dele, e repetia a espera a cada minuto. Aqui,
# numa CÓPIA do motor, o pendentes_razoes do repo `lento` dorme 30 s antes de
# responder. O /api/estado tem de responder abaixo de 1 s, duas vezes seguidas,
# com o repo rápido completo e o lento marcado "apurando"; depois do timeout, o
# lento aparece "sem apurar" com a hora da última tentativa, o processo dele
# morreu, e a próxima tentativa só vem depois do recuo.
#
# Uso: bash scripts/orquestrador/test-painel-lento.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/repos"; export ORQ_EXEC_ROOT
TMP="$(dirname "$ORQ_EXEC_ROOT")"
PID_SRV=''
trap '[ -z "$PID_SRV" ] || kill "$PID_SRV" 2>/dev/null; pkill -f "sleep 30.4242" 2>/dev/null; rm -rf "$TMP"' EXIT
# shellcheck source=test-fixture-painel.sh
source "$AQUI/test-fixture-painel.sh"
set +e

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
confere() { if [ "$2" = "$3" ]; then ok "$1"; else falha "$1: esperado '$2', veio '$3'"; fi; }

fp_launchctl_stub "$TMP"; touch "$TMP/stub-descarregado"

# a cópia do motor, com o pendentes_razoes do repo `lento` dormindo 30 s
cp -R "$AQUI" "$TMP/motor"
cat >> "$TMP/motor/local-loop.sh" <<LENTO

# --- só no teste K12-J: o repo \`lento\` demora 30 s para apurar ---
eval "orig_\$(declare -f pendentes_razoes)"
pendentes_razoes() {
  case "\$MAIN_CHECKOUT" in */lento) echo "tentativa \$(date +%s)" >> "$TMP/tentativas-lento"; sleep 30.4242 ;; esac
  orig_pendentes_razoes "\$@"
}
LENTO

R="$ORQ_EXEC_ROOT/rapido"; fp_repo "$R"
fp_ticket "$R" 100 pendente
fp_ticket "$R" 101 pendente '["humano:cred-1"]'
fp_status "$R" ocioso — — — "drenagem encerrada"
L="$ORQ_EXEC_ROOT/lento"; fp_repo "$L"
fp_ticket "$L" 200 pendente '["humano:do-lento"]'
fp_status "$L" ocioso — — — "drenagem encerrada"
export ORQ_REPOS="$TMP/repos.json"
fp_repos "$ORQ_REPOS" "$R" "$L"
export ORQ_PAINEL_RAZOES_TIMEOUT=4   # 10 s em produção; 4 aqui, para o teste não esperar

python3 "$TMP/motor/orq-painel.py" --porta 0 > "$TMP/srv.log" 2>&1 &
PID_SRV=$!; disown "$PID_SRV" 2>/dev/null || true
for i in $(seq 1 50); do
  URL="$(sed -n 's|^orq-painel em \(http://[0-9.:]*\).*|\1|p' "$TMP/srv.log" | head -1)"; [ -n "$URL" ] && break; sleep 0.1
done
[ -n "$URL" ] || { echo "servidor não subiu:"; cat "$TMP/srv.log"; exit 1; }
echo "  servidor em $URL"

# get <arquivo> -> segundos da chamada (o corpo vai para o arquivo); teto de 8 s
get() { curl -s --max-time 8 -o "$1" -w '%{time_total}' "$URL/api/estado"; }
rapido_abaixo_de_1s() { awk -v t="$1" 'BEGIN { exit !(t + 0 < 1.0) }'; }

echo "== 1. duas chamadas seguidas respondem abaixo de 1 s =="
t1="$(get "$TMP/e1.json")"; t2="$(get "$TMP/e2.json")"
rapido_abaixo_de_1s "$t1" && ok "1ª chamada em ${t1}s" || falha "1ª chamada levou ${t1}s"
rapido_abaixo_de_1s "$t2" && ok "2ª chamada em ${t2}s" || falha "2ª chamada levou ${t2}s"

echo
echo "== 2. o repo rápido vem completo; o lento vem marcado =="
confere "rápido: razões apuradas" ok "$(jq -r '.repos[0].razoes.estado' "$TMP/e2.json" 2>/dev/null)"
confere "rápido: 1 pronto" 1 "$(jq -r '.repos[0].contagem.prontos' "$TMP/e2.json" 2>/dev/null)"
confere "rápido: o token dele está na faixa" "humano:cred-1" "$(jq -r '[.precisa[].token] | join(" ")' "$TMP/e2.json" 2>/dev/null)"
confere "lento: apurando" apurando "$(jq -r '.repos[1].razoes.estado' "$TMP/e2.json" 2>/dev/null)"
case "$(jq -r '.repos[1].erro' "$TMP/e2.json" 2>/dev/null)" in *apurando*) ok "lento: o cartão diz que está apurando" ;; *) falha "lento: cartão sem 'apurando'" ;; esac
confere "lento: fora da conta da faixa, e dito" lento "$(jq -r '[.precisa_fora[].repo] | join(" ")' "$TMP/e2.json" 2>/dev/null)"

echo
echo "== 3. depois do timeout: sem apurar, com a hora da última tentativa, e o processo morto =="
est=''
for i in $(seq 1 60); do
  get "$TMP/e3.json" >/dev/null
  est="$(jq -r '.repos[1].razoes.estado' "$TMP/e3.json" 2>/dev/null)"; [ "$est" = falhou ] && break; sleep 0.2
done
confere "lento: sem apurar" falhou "$est"
ult="$(jq -r '.repos[1].razoes.ultima_tentativa' "$TMP/e3.json" 2>/dev/null)"
case "$ult" in [0-2][0-9]:[0-5][0-9]) ok "última tentativa às $ult" ;; *) falha "sem a hora da última tentativa: '$ult'" ;; esac
case "$(jq -r '.repos[1].erro' "$TMP/e3.json" 2>/dev/null)" in *"última tentativa às $ult"*) ok "o cartão diz a última tentativa" ;; *) falha "cartão: $(jq -r '.repos[1].erro' "$TMP/e3.json")" ;; esac
pr="$(jq -r '.repos[1].razoes.proxima_em_seg' "$TMP/e3.json" 2>/dev/null)"
[ -n "$pr" ] && [ "$pr" != null ] && [ "$pr" -ge 50 ] && [ "$pr" -le 60 ] && ok "recuo de 1 min: próxima em ${pr}s" || falha "recuo: próxima em '$pr'"
sleep 0.5
pgrep -f "sleep 30.4242" >/dev/null && falha "o pendentes_razoes do lento segue vivo depois do timeout" || ok "o processo do lento morreu no timeout"
confere "rápido segue completo" ok "$(jq -r '.repos[0].razoes.estado' "$TMP/e3.json" 2>/dev/null)"

echo
echo "== 4. no recuo, nada de tentar de novo a cada chamada =="
for i in 1 2 3; do t="$(get "$TMP/e4.json")"; rapido_abaixo_de_1s "$t" || falha "chamada no recuo levou ${t}s"; done
confere "uma tentativa só" 1 "$(grep -c . "$TMP/tentativas-lento" 2>/dev/null || echo 0)"

echo
echo "== launchctl: só o stub, nunca o do sistema (K12-E) =="
fp_launchctl_confere

echo
[ "$FALHAS" = 0 ] && { echo "TODOS OS CHECKS PASSARAM"; exit 0; }
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
