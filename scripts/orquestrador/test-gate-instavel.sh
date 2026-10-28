#!/usr/bin/env bash
# test-gate-instavel.sh: gate de testes com teste instável (etapa L11, porte do
# 86dec07 Fix A e do test-gate-instavel.sh do Comarka).
#
# Caso real: Comarka 1523 attempt-1 (28/10 13:50). A suíte de 41 s falhou só em
# test/estado-plano-orfas.test.ts, fora do diff e da allowlist; isolado, 6/6
# verdes em 1,6 s. No kit isso era BLOQUEADO base_vermelha (executor.sh, 7b).
#
# Executor DE VERDADE (test-fixture-executor.sh). O gate `test` imprime a saída
# real do 1523 (test/fixtures/instavel-l11/) e sai 1; o gate `build` vem depois
# na ordem (como no Comarka: tsc, vitest, build). O isolado é o vitest REAL do
# node_modules do checkout, sobre um test/estado-plano-orfas.test.ts do fixture
# que passa (ou falha, no caso B):
#   A · instável que passa isolado: sai da conta, o build roda na retomada, o
#       juiz é chamado e o ticket vai a aguardando_merge; instaveis.txt,
#       isolado-1.txt, runs/instaveis.log e o evento INSTAVEL gravados.
#   B · o mesmo arquivo falha isolado: BLOQUEADO base_vermelha, como antes.
#   C · instável que passa, build reprova na retomada: reprovado, nunca aprovado.
#   D · 5263 (dois FAIL): o que passa isolado sai, o que falha isolado é a base
#       vermelha (só ele em arquivos=).
#   E · Unhandled Errors na saída: nada reroda, base_vermelha.
#   F · o arquivo não existe na worktree e o vitest tem passWithNoTests: rc 0 sem
#       teste rodado não é instável (base_vermelha).
#
# Uso: bash scripts/orquestrador/test-gate-instavel.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIT="$(git -C "$AQUI" rev-parse --show-toplevel)"
FIXT="$KIT/test/fixtures/instavel-l11"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP_RAIZ="$(dirname "$ORQ_EXEC_ROOT")"
source "$AQUI/test-fixture-executor.sh"
trap 'fxe_limpa; rm -rf "$TMP_RAIZ"' EXIT

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
[ -x "$FXE_NM/.bin/vitest" ] || { echo "ERRO: $FXE_NM/.bin/vitest ausente; o isolado precisa do vitest do checkout"; exit 2; }

ORFAS=test/estado-plano-orfas.test.ts
SEGREDO=test/sem-segredo-no-repo.test.ts

# caso <saida do gate test> <orfas passa isolado: 1|0> [build rc] [segredo passa: 1|0] [sem o orfas: 1]
caso() {
  local saida="$1" orfas="$2" build="${3:-0}" segredo="${4:-0}" sem="${5:-0}" r
  fxe_limpa; FXE_ID=901; fxe_novo '.max_retries = 0'
  r="$FXE/repo"
  jq --arg b "bash $FXE/gates/build.sh" '.gates += [{nome: "build", cmd: $b, tipo: "exit_code"}]
      | ._execucao_dos_gates.ordem_obrigatoria += ["build"]' "$r/docs/fila/000-config.json" > "$FXE/cfg" \
    && mv "$FXE/cfg" "$r/docs/fila/000-config.json"
  fxe_gate test "cat '$saida'; exit 1"
  fxe_gate build "echo build >> '$FXE/build-rodou'; exit $build"
  mkdir -p "$r/test"
  printf "import { it, expect } from 'vitest'\nit('orfas', () => expect(%s).toBe(1))\n" "$orfas" > "$r/$ORFAS"
  printf "import { it, expect } from 'vitest'\nit('segredo', () => expect(%s).toBe(1))\n" "$segredo" > "$r/$SEGREDO"
  [ "$sem" = 0 ] || { rm "$r/$ORFAS"; echo 'export default { test: { passWithNoTests: true } }' > "$r/vitest.config.mjs"; }
  git -C "$r" add -A && git -C "$r" commit -qm "fixture: gate build e testes do caso" && git -C "$r" branch -f staging-auto main
  fxe_juiz '{"aprovado": true, "motivo": "ok", "criterios_falhos": []}'
  fxe_roda
  ATT="$r/docs/fila/runs/901/attempt-0"
}
ev() { fxe_eventos | grep " 901 $1 " | tail -1; }

echo "== A · 1523: instável que passa isolado sai da conta =="
caso "$FIXT/vitest-1523-attempt-1.txt" 1
[ "$(fxe_status)" = aguardando_merge ] && ok "status aguardando_merge" \
  || falha "status $(fxe_status): $(fxe_nota | head -c 300)"
[ "$(cat "$ATT/instaveis.txt" 2>/dev/null)" = "$ORFAS" ] && ok "rundir/instaveis.txt" || falha "instaveis.txt: $(cat "$ATT/instaveis.txt" 2>/dev/null)"
grep -q 'Tests  1 passed' "$ATT/isolado-1.txt" 2>/dev/null && ok "isolado-1.txt com o vitest real verde" || falha "isolado-1.txt: $(tail -5 "$ATT/isolado-1.txt" 2>/dev/null)"
grep -q $'\t901\t'"$ORFAS"'$' "$FXE/repo/docs/fila/runs/instaveis.log" 2>/dev/null && ok "runs/instaveis.log (data, ticket, arquivo)" || falha "instaveis.log ausente"
case "$(ev INSTAVEL)" in *"arquivos=$ORFAS gate=test resto="*) ok "evento INSTAVEL" ;; *) falha "evento: $(ev INSTAVEL)" ;; esac
[ -s "$FXE/build-rodou" ] && ok "o build rodou na retomada" || falha "o build não rodou"
grep -q '^--- retomada depois de test' "$ATT/gates.txt" && grep -qE '^ok +build' "$ATT/gates.txt" \
  && ok "gates.txt: a retomada anexada, build ok" || falha "gates.txt sem retomada"
[ -f "$ATT/juiz.veredito.json" ] && ok "juiz chamado" || falha "juiz não chamado"
awk '/TESTE INSTÁVEL FORA DA CONTA/{f=1} /^SAÍDA DOS GATES/{exit} f' "$ATT/juiz.prompt.txt" 2>/dev/null | grep -qx "  - $ORFAS" \
  && ok "o prompt do juiz diz que o FAIL é instável (P4)" || falha "juiz.prompt.txt sem o bloco de instáveis"

echo "== B · o mesmo arquivo falha isolado: base vermelha como antes =="
caso "$FIXT/vitest-1523-attempt-1.txt" 0
[ "$(fxe_status)" = bloqueado ] && case "$(ev BLOQUEADO)" in *"motivo=base_vermelha arquivos=$ORFAS "*) true ;; *) false ;; esac \
  && ok "BLOQUEADO base_vermelha ($ORFAS)" || falha "status $(fxe_status), $(ev BLOQUEADO)"
[ ! -s "$ATT/instaveis.txt" ] && [ -f "$ATT/isolado-1.txt" ] && ok "rerodou e nada em instaveis.txt" || falha "B: instaveis.txt=$(cat "$ATT/instaveis.txt" 2>/dev/null)"
[ ! -s "$FXE/build-rodou" ] && ok "sem retomada" || falha "B: o build rodou"

echo "== C · instável que passa, build reprova na retomada =="
caso "$FIXT/vitest-1523-attempt-1.txt" 1 1
case "$(ev REPROVADO)" in *" sub=gate_build "*) ok "REPROVADO pelo build (sub=gate_build), nunca aprovado" ;; *) falha "C: status $(fxe_status), $(ev REPROVADO) $(ev BLOQUEADO)" ;; esac
[ ! -f "$ATT/juiz.veredito.json" ] && ok "juiz não chamado" || falha "C: juiz chamado"

echo "== D · 5263: um passa isolado, o outro é a base vermelha =="
caso "$FIXT/vitest-5263-attempt-1.txt" 1 0 0
[ "$(cat "$ATT/instaveis.txt" 2>/dev/null)" = "$ORFAS" ] && ok "só o orfas em instaveis.txt" || falha "D instaveis.txt: $(cat "$ATT/instaveis.txt" 2>/dev/null)"
case "$(ev BLOQUEADO)" in *"motivo=base_vermelha arquivos=$SEGREDO "*) ok "base_vermelha só com $SEGREDO" ;; *) falha "D: $(ev BLOQUEADO)" ;; esac

echo "== E · Unhandled Errors: nada reroda =="
{ cat "$FIXT/vitest-1523-attempt-1.txt"; printf '\n⎯⎯⎯⎯ Unhandled Errors ⎯⎯⎯⎯\nError: boom\n'; } > "$TMP_RAIZ/unhandled.txt"
caso "$TMP_RAIZ/unhandled.txt" 1
[ ! -f "$ATT/isolado-1.txt" ] && ok "sem isolado" || falha "E: rerodou"
case "$(ev BLOQUEADO)" in *motivo=base_vermelha*) ok "BLOQUEADO base_vermelha" ;; *) falha "E: status $(fxe_status), $(ev BLOQUEADO)" ;; esac

echo "== F · rc 0 sem teste rodado (passWithNoTests) não é instável =="
caso "$FIXT/vitest-1523-attempt-1.txt" 1 0 0 1
grep -q 'No test files found' "$ATT/isolado-1.txt" 2>/dev/null && ok "rerodou: o vitest não achou o arquivo e saiu 0" || falha "F: isolado-1.txt: $(tail -3 "$ATT/isolado-1.txt" 2>/dev/null)"
[ ! -s "$ATT/instaveis.txt" ] && case "$(ev BLOQUEADO)" in *motivo=base_vermelha*) true ;; *) false ;; esac \
  && ok "nada em instaveis.txt, BLOQUEADO base_vermelha" || falha "F: instaveis.txt=$(cat "$ATT/instaveis.txt" 2>/dev/null), $(ev BLOQUEADO)"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
