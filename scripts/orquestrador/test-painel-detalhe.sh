#!/usr/bin/env bash
# test-painel-detalhe.sh — o DETALHE do repo no painel (peça K12, bloco B).
#
# Um repo com um dia de trilha escrito à mão, para que cada indicador tenha
# valor EXATO conhecido de antemão (relógio do painel às 12:00 de hoje):
#   801  09:00-09:10 reprova (juiz), 09:12-09:30 aprova na 2ª   = 28 min
#   802  10:00-10:10 aprova na 1ª                                = 10 min
#   803  10:20-10:26 aprova na 1ª                                =  6 min
#   804  11:00-11:05 reprova (critério), segue pendente
#   pausa pelo painel das 06:00 às 08:00
# O que o contrato não tem (a última promoção) sai "sem dado", nunca estimado.
#
# Uso: bash scripts/orquestrador/test-painel-detalhe.sh

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
h() { fp_epoch_hoje "$1"; }

D="$ORQ_EXEC_ROOT/delta"; fp_repo "$D"
fp_ticket "$D" 801 done
fp_ticket "$D" 802 done
fp_ticket "$D" 803 done
fp_ticket "$D" 804 pendente '["820"]' '{"pathspec_allowlist": ["src/outro.ts"]}'
fp_ticket "$D" 810 pendente '[]' '{"pathspec_allowlist": ["src/geral.tsx", "src/a.ts"], "objetivo": "Painel ganha metas por tipo. Detalhe que não entra."}'
fp_ticket "$D" 811 pendente '[]' '{"pathspec_allowlist": ["src/geral.tsx"]}'
fp_ticket "$D" 812 pendente '["810"]' '{"pathspec_allowlist": ["src/geral.tsx", "src/page.tsx"]}'
fp_ticket "$D" 813 pendente '["humano:x-1"]' '{"pathspec_allowlist": ["src/page.tsx"]}'
fp_ticket "$D" 820 bloqueado '[]' '{"pathspec_allowlist": ["src/geral.tsx"], "notas_status": "enforcement: tocou fora da allowlist"}'
fp_evento "$D" "$(h 06:00:00)" --- PAUSA motivo=manutencao por=painel
fp_evento "$D" "$(h 08:00:00)" --- RETOMADA por=painel dur=120min
fp_evento "$D" "$(h 09:00:00)" 801 INICIO attempt=1 model=sonnet
fp_evento "$D" "$(h 09:10:00)" 801 REPROVADO motivo=criterio_qualidade sub=juiz attempt=1 diff=50
fp_evento "$D" "$(h 09:12:00)" 801 INICIO attempt=2 model=opus
fp_evento "$D" "$(h 09:30:00)" 801 APROVADO merge=aguardando dur=1080s attempt=2
fp_evento "$D" "$(h 10:00:00)" 802 INICIO attempt=1 model=sonnet
fp_evento "$D" "$(h 10:10:00)" 802 APROVADO merge=aguardando dur=600s attempt=1
fp_evento "$D" "$(h 10:20:00)" 803 INICIO attempt=1 model=sonnet
fp_evento "$D" "$(h 10:26:00)" 803 APROVADO merge=aguardando dur=360s attempt=1
fp_evento "$D" "$(h 11:00:00)" 804 INICIO attempt=1 model=sonnet
fp_evento "$D" "$(h 11:05:00)" 804 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=20
fp_evento "$D" "$(h 11:30:00)" 820 BLOQUEADO motivo=enforcement attempt=2
fp_status "$D" ocioso — — "820 BLOQUEADO 11:30:00" "drenagem encerrada"
HOJE="$(date +%Y-%m-%d)"
jq -n --arg d "$HOJE" '{dias: {($d): [{custo_usd: 0.5}, {custo_usd: 0.25}], "2000-01-01": [{custo_usd: 9}]}}' > "$D/docs/fila/runs/custo.json"

export ORQ_REPOS="$TMP/repos.json"
fp_repos "$ORQ_REPOS" "$D"
EST="$TMP/estado.json"
fp_painel --estado > "$EST" 2> "$TMP/err"; rc=$?
confere "painel --estado sai 0" 0 "$rc"
[ -s "$TMP/err" ] && sed 's/^/  stderr: /' "$TMP/err"
q() { jq -r ".repos[0].detalhe | $1" "$EST" 2>/dev/null; }

echo
echo "== 1. os 6 indicadores =="
confere "tempo por ticket: média, mediana, pior (s)" "880 600 1680" "$(q '.indicadores.tempo_ticket | "\(.media_seg) \(.mediana_seg) \(.pior_seg)"')"
confere "aprovação na 1ª: 2 de 3, 67%" "2 3 67" "$(q '.indicadores.primeira | "\(.n_primeira) \(.n) \(.pct)"')"
confere "tentativas por aprovação: 5 inícios / 3 aprovações" "5 3 1.7" "$(q '.indicadores.tentativas_por_aprovacao | "\(.inicios) \(.aprovados) \(.valor)"')"
confere "fila estimada: 2 prontos × 980 s de execução por aprovação" "2 980 1960" "$(q '.indicadores.fila_estimada | "\(.prontos) \(.ritmo_seg) \(.seg)"')"
confere "ociosidade hoje: 12h menos 49 min em execução, 2h delas pausado" "40260 7200" "$(q '.indicadores.ociosidade | "\(.seg) \(.pausado_seg)"')"
confere "última promoção: sem dado, com o motivo" "null" "$(q '.indicadores.ultima_promocao.valor')"
case "$(q '.indicadores.ultima_promocao.sem_dado')" in
  *contrato*) ok "última promoção diz por que não tem dado" ;; *) falha "sem a razão do sem dado" ;; esac
confere "custo do dia (custo.json), só hoje" "0.75" "$(q '.custo_dia_usd')"

echo
echo "== 2. sem aprovação no dia, os indicadores dizem 'sem dado' em vez de zero =="
E="$ORQ_EXEC_ROOT/eco"; fp_repo "$E"; fp_ticket "$E" 900 pendente
fp_repos "$TMP/r2.json" "$E"
e2="$(ORQ_REPOS="$TMP/r2.json" fp_painel --estado 2>/dev/null)"
for k in tempo_ticket primeira tentativas_por_aprovacao fila_estimada; do
  v="$(printf '%s' "$e2" | jq -r ".repos[0].detalhe.indicadores.$k.sem_dado" 2>/dev/null)"
  case "$v" in ''|null) falha "$k sem 'sem_dado' com o dia vazio" ;; *) ok "$k: sem dado ($v)" ;; esac
done

echo
echo "== 3. bloqueados: categoria, motivo, allowlist, parado há, tentativas =="
b='.repos[0].bloqueados[0]'
confere "820: enforcement" enforcement "$(jq -r "$b.categoria" "$EST")"
confere "820: parado há 30 min" 1800 "$(jq -r "$b.parado_seg" "$EST")"
confere "820: tentativas do BLOQUEADO (sem campo no ticket)" 2 "$(jq -r "$b.tentativas" "$EST")"
confere "820: onde mexe" "src/geral.tsx" "$(jq -r "$b.allow | join(\",\")" "$EST")"

echo
echo "== 4. prontos: o que muda em uma frase, onde mexe, quantos destravam =="
confere "prontos na ordem do loop" "810 811" "$(q '[.prontos[].id] | join(" ")')"
confere "810: a primeira frase do objetivo" "Painel ganha metas por tipo." "$(q '.prontos[0].frase')"
confere "810: onde mexe" "src/geral.tsx,src/a.ts" "$(q '.prontos[0].allow | join(",")')"
confere "810 destrava 1 (o 812), 811 nenhum" "1 0" "$(q '[.prontos[].destrava] | map(tostring) | join(" ")')"

echo
echo "== 5. hora a hora: aprovado, reprova, parado =="
confere "9h: 1 aprovado, 1 reprova, 28 min em execução, 32 parado" "1 1 28 32" "$(q '.horas[9] | "\(.aprovados) \(.reprovas) \(.exec_min) \(.parado_min)"')"
confere "10h: 2 aprovados, 16 min em execução" "2 0 16 44" "$(q '.horas[10] | "\(.aprovados) \(.reprovas) \(.exec_min) \(.parado_min)"')"
confere "3h: parado a hora inteira" "0 0 0 60" "$(q '.horas[3] | "\(.aprovados) \(.reprovas) \(.exec_min) \(.parado_min)"')"
confere "horas até agora (0 a 12)" 13 "$(q '.horas | length')"

echo
echo "== 6. arquivos mais disputados entre os pendentes =="
confere "top 3" "src/geral.tsx:3 src/page.tsx:2 src/a.ts:1" "$(q '[.disputados[] | "\(.arquivo):\(.n)"] | join(" ")')"

echo
echo "== 7. a página tem a vista de detalhe =="
pag="$(fp_painel --html 2>/dev/null)"
for s in 'function detalhe' 'Hoje, hora a hora' 'Arquivos mais disputados' 'Prontos' 'sem dado'; do
  case "$pag" in *"$s"*) ok "página contém '$s'" ;; *) falha "página sem '$s'" ;; esac
done

echo
[ "$FALHAS" = 0 ] && { echo "TODOS OS CHECKS PASSARAM"; exit 0; }
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
