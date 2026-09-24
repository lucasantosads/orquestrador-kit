#!/usr/bin/env bash
# test-reprovado-sub.sh · sub-motivo, escalada e corte de repetição (peça 7b-4).
#
# 82 de 82 retries do kit escalaram para opus, porque toda reprovação caía em
# criterio_qualidade e criterio_qualidade = ESCALAR. Agora o REPROVADO e o RETRY
# dizem QUAL mérito reprovou (sub=juiz|criterio|gate_<papel>|exit), e só o juiz
# escala: critério vermelho, gate vermelho e exit repetem com o mesmo modelo.
# Permissão negada com critério vermelho é mérito e não escala (decisão deste
# programa, oposta à do patch local do Actus).
#
# E o corte: se o 2º REPROVADO do mesmo ticket trouxer o mesmo sub e o mesmo
# diff=, o ticket vai para bloqueado com motivo=repeticao, sem 3ª volta. O caso
# é o 461 do Actus: diff 717/717/717, três tentativas pagas, duas em opus.
#
#   A. critério vermelho (com permissão negada): REPROVADO sub=criterio, RETRY
#      com o MESMO modelo; nunca opus.
#   B. juiz reprovando: REPROVADO sub=juiz, RETRY model=opus.
#   C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo.
#   D. trilha fixture do 461 (REPROVADO diff=717 do Actus) + a mesma
#      reprovação: BLOQUEADO motivo=repeticao na hora, sem RETRY.
#   E. max_retries vale no TOTAL, não por drenagem: reprovou e adiou numa
#      execução, na seguinte só restam as tentativas que sobraram.
#
# Uso: bash scripts/orquestrador/test-reprovado-sub.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP_RAIZ="$(dirname "$ORQ_EXEC_ROOT")"
# shellcheck source=test-fixture-executor.sh
source "$AQUI/test-fixture-executor.sh"

# TIMEOUT DO AGENTE FALSO, proporcional à carga (porte, item j; padrão do 629
# do Actus: o tempo do caso é explícito e dito, nenhuma asserção muda). Com o
# claude_timeout_secs de 2 s do molde, este script falhava de forma
# intermitente na suíte inteira com a máquina carregada (load 5–7, 24/09/2026):
# o agente falso, que só escreve linhas, levava rc 124 e a tentativa virava
# ADIADO timeout em vez do desfecho que o caso mede. Base de 10 s por chamada
# do agente vezes o fator de carga (load de 1 min / núcleos, arredondado para
# cima, mínimo 1), calculado UMA vez aqui e impresso.
TIMEOUT_AGENTE_BASE_SECS=10
_nucleos="$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 1)"
_load1="$(sysctl -n vm.loadavg 2>/dev/null | awk '{print $2}' | tr ',' '.' || true)"
[ -n "$_load1" ] || _load1="$(awk '{print $1}' /proc/loadavg 2>/dev/null || echo 0)"
_fator="$(awk -v l="$_load1" -v n="$_nucleos" 'BEGIN { f = l / (n > 0 ? n : 1); c = int(f); if (c < f) c++; if (c < 1) c = 1; print c }')"
FXE_CLAUDE_TIMEOUT=$((TIMEOUT_AGENTE_BASE_SECS * _fator)); export FXE_CLAUDE_TIMEOUT
printf '  (timeout do agente falso: %s s = %s s x fator de carga %s; load1=%s, núcleos=%s)\n' \
  "$FXE_CLAUDE_TIMEOUT" "$TIMEOUT_AGENTE_BASE_SECS" "$_fator" "$_load1" "$_nucleos"
trap 'fxe_limpa; rm -rf "$TMP_RAIZ"' EXIT
# A trilha do 461 vai EMBUTIDA (peça 7b-9): este script viaja para todo repo
# instalado, e lá não existe o test/fixtures/ do kit. Origem: linhas 434 a 437
# de ~/Projetos/actus-saas/docs/fila/runs/events.log (HEAD f438730), copiadas
# byte a byte em 2026-09-21, só leitura; cksum 1004446157 411. A mesma cópia
# está no kit em test/fixtures/trilha/actus-461-reprovado.log, e um caso do
# vitest (orquestrador-sub-repeticao.test.ts) cobra que as duas são iguais.
FIXTURE_461="$TMP_RAIZ/actus-461-reprovado.log"
cat > "$FIXTURE_461" <<'TRILHA_461'
2026-09-15T11:46:34-0300 461 INICIO attempt=1 model=sonnet
2026-09-15T11:52:56-0300 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
2026-09-15T11:53:34-0300 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
2026-09-15T11:53:34-0300 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
TRILHA_461

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
trilha() { fxe_eventos | sed 's/^[^ ]* /  | /'; }
tem()    { fxe_eventos | grep -Eq "$1"; }

echo "== A. critério vermelho, com permissão negada: mérito, mesmo modelo =="
fxe_novo '.max_retries = 1'; fxe_criterio falhou; fxe_fila negado:5 negado:6
fxe_roda
tem " 901 PERMISSAO_NEGADA " && ok "a permissão negada foi registrada" || falha "sem PERMISSAO_NEGADA"
tem " 901 REPROVADO motivo=criterio_qualidade sub=criterio " && ok "REPROVADO sub=criterio" || falha "REPROVADO sem sub=criterio"
tem " 901 RETRY attempt=2 model=sonnet .*sub=criterio" && ok "RETRY com o mesmo modelo (sonnet), sub=criterio" || falha "RETRY não manteve o modelo"
grep -q 'model=opus' "$FXE/chamadas" && falha "o agente foi chamado em opus" || ok "nenhuma chamada em opus"
tem " 901 ADIADO " && falha "permissão negada virou adiamento" || ok "não adiou (permissão negada não é ambiente)"
trilha; fxe_limpa

echo
echo "== B. juiz reprovando: escala =="
fxe_novo '.max_retries = 1'
fxe_juiz '{"aprovado": false, "motivo": "o teste não cobre o caso vazio", "criterios_falhos": []}'
fxe_fila linhas:5 linhas:6
fxe_roda
tem " 901 REPROVADO motivo=criterio_qualidade sub=juiz " && ok "REPROVADO sub=juiz" || falha "REPROVADO sem sub=juiz"
tem " 901 RETRY attempt=2 model=opus .*sub=juiz" && ok "RETRY model=opus, sub=juiz" || falha "o juiz reprovou e não escalou"
[ "$(sed -n 2p "$FXE/chamadas")" = "agente model=opus" ] && ok "a 2ª chamada do agente foi em opus" || falha "2ª chamada: $(sed -n 2p "$FXE/chamadas")"
trilha; fxe_limpa

echo
echo "== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo =="
# O teste vermelho é DO ticket: está na allowlist. Com o porte do 632 do Actus,
# teste vermelho SÓ fora do diff e da allowlist é base vermelha (bloqueia), não
# mérito — e a intenção deste caso é o teste do próprio agente falhando.
FXE_ALLOWLIST='["src/a.ts", "test/a.test.ts"]' fxe_novo '.max_retries = 1'
fxe_gate test 'echo " FAIL  test/a.test.ts > soma"; echo " Tests  1 failed | 3 passed (4)"; exit 1'
fxe_fila linhas:5 linhas:6
fxe_roda
tem " 901 REPROVADO motivo=criterio_qualidade sub=gate_testes " && ok "REPROVADO sub=gate_testes" || falha "REPROVADO sem sub=gate_testes"
tem " 901 RETRY attempt=2 model=sonnet .*sub=gate_testes" && ok "RETRY com o mesmo modelo" || falha "gate vermelho escalou"
trilha; fxe_limpa

echo
echo "== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora =="
FXE_ID=461 fxe_novo '.diff_cap_linhas = 1000'; FXE_ID=461
cp "$FIXTURE_461" "$FXE/repo/docs/fila/runs/events.log" && ok "trilha fixture do 461 no lugar" || falha "fixture ausente: $FIXTURE_461"
fxe_criterio falhou; fxe_claude negado:717
fxe_roda
tem " 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717" && ok "a reprovação desta execução: sub=criterio diff=717" || falha "reprovação fora do esperado"
tem " 461 BLOQUEADO motivo=repeticao" && ok "BLOQUEADO motivo=repeticao" || falha "não bloqueou por repetição"
[ "$(fxe_status)" = bloqueado ] && ok "ticket bloqueado" || falha "status=$(fxe_status)"
tem " 461 RETRY " && falha "houve RETRY (3ª volta)" || ok "nenhum RETRY"
[ "$(grep -c . "$FXE/chamadas")" = 1 ] && ok "uma chamada paga só" || falha "$(grep -c . "$FXE/chamadas") chamadas"
echo "  nota: $(fxe_nota)"
case "$(fxe_nota)" in *repeti*"diff=717"*) ok "a nota diz repetição e o diff" ;; *) falha "nota sem a repetição" ;; esac
trilha; fxe_limpa; FXE_ID=901

echo
echo "== E. max_retries vale no total, não por drenagem =="
fxe_novo '.max_retries = 2'; fxe_criterio falhou
fxe_fila linhas:5 503 linhas:6 linhas:7 linhas:8
fxe_roda
echo "  --- 1ª execução: tentativas=$(fxe_campo '.tentativas // 0') status=$(fxe_status)"
[ "$(fxe_status)" = pendente ] && ok "1ª execução: reprovou, adiou, segue pendente" || falha "status=$(fxe_status)"
[ "$(fxe_campo '.tentativas // 0')" = 1 ] && ok "1 tentativa consumida, persistida no ticket (o adiado devolveu a sua)" || falha "tentativas=$(fxe_campo '.tentativas // 0')"
fxe_roda
echo "  --- 2ª execução: tentativas=$(fxe_campo '.tentativas // 0') status=$(fxe_status)"
n="$(fxe_eventos | grep -c ' 901 REPROVADO ')"
[ "$n" = 3 ] && ok "3 reprovações no total (max_retries 2 + 1)" || falha "$n reprovações no total"
tem " 901 INICIO attempt=2 model=sonnet" && ok "a 2ª execução começa em attempt=2" || falha "a 2ª execução recomeçou do zero"
tem " 901 BLOQUEADO motivo=criterio_qualidade attempt=3" && ok "BLOQUEADO na attempt=3" || falha "não bloqueou na attempt=3"
tem " 901 INICIO attempt=4 " && falha "houve 4ª tentativa" || ok "nenhuma 4ª tentativa"
trilha; fxe_limpa

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
