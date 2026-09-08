#!/usr/bin/env bash
# test-instalar.sh — os três casos do `instalar.sh --verificar` (peça K5).
#
#   (a) contra o repo de FIXTURE recém-instanciado  -> idêntico, rc 0
#   (b) contra uma CÓPIA do fixture com um byte a mais em lib.sh
#                                                    -> `diferente ... lib.sh`, rc 1
#   (c) contra ~/Projetos/conteudos-infinitos (SÓ LEITURA)
#                                                    -> o resultado real, seja qual for
#   (d) contra uma CÓPIA do fixture com um byte a mais em
#       scripts/roadmap/lint-mapa.py                 -> `diferente ... lint-mapa.py`, rc 1
#   (h) --verificar/--atualizar cobrem os testes do harness que o kit vendoriza,
#       e NÃO tocam teste do produto (peça K8d)
#   (g) --atualizar com scripts/roadmap/lint-mapa.py modificado e NÃO commitado
#                                                    -> recusa nomeando o caminho, rc 1;
#                                                       com --forcar, passa e avisa (K8c)
#       (peça K5b: scripts/roadmap/ É motor vendorizado — `orq mapa lint` roda
#        `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT,
#        scripts/orq:226 — e sem este caso um lint desatualizado passa por
#        "idêntico".)
#
# (c) não é assertivo por decisão: o checkout do CI é o repo de verdade de outra
# pessoa, e o kit não manda nele. Diferença ali é ACHADO — vira linha de
# relatório e, se for o caso, peça —, nunca falha deste script. O que ele
# imprime é a saída crua, para ser colada.
#
# Uso: bash scripts/kit/test-instalar.sh

set -uo pipefail

# --- ORQ_TESTE=1 para TUDO que roda daqui (peça K6e) --------------------------
# Duas travas de uma variável só:
#   1. `lib.sh` (escrita_de_teste_permitida) recusa escrever trilha/STATUS/custo
#      fora de `$ORQ_EXEC_ROOT` — e quem roda motor aqui é o `fixture.sh`, que
#      declara o próprio `ORQ_EXEC_ROOT` antes do `source`;
#   2. `instalar-launchd.sh` recusa INSTALAR o job do launchd. Este script não
#      chama o instalador hoje, e é exatamente por isso que a variável entra
#      agora: em 2026-09-08 um teste que "só ia renderizar o plist" carregou um
#      job de verdade apontando para um fixture em /private/tmp, por 1h40. A
#      guarda tem de estar de pé ANTES de alguém precisar dela.
export ORQ_TESTE=1

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CI_CHECKOUT="${ORQ_CI_CHECKOUT:-$HOME/Projetos/conteudos-infinitos}"

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

FX="$(bash "$KIT/scripts/kit/fixture.sh")" || { printf 'ERRO: fixture.sh falhou\n' >&2; exit 2; }
COPIA="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
COPIA_ROADMAP="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
COPIA_UPD="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
COPIA_EXTRA="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
COPIA_SUJA="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
COPIA_TESTES="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1; rm -rf "$COPIA" "$COPIA_ROADMAP" "$COPIA_UPD" "$COPIA_EXTRA" "$COPIA_SUJA" "$COPIA_TESTES"' EXIT

# --- (a) ---------------------------------------------------------------------
echo "== (a) fixture recém-instanciado =="
saida="$(bash "$KIT/instalar.sh" --verificar "$FX" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
printf '%s' "$saida" | grep -q "idêntico ao kit $(cat "$KIT/VERSAO")" \
  && ok "diz 'idêntico ao kit <VERSAO>'" || falha "não disse 'idêntico ao kit <VERSAO>'"

# --- (b) ---------------------------------------------------------------------
echo
echo "== (b) cópia do fixture com UM byte a mais em lib.sh =="
mkdir -p "$COPIA/repo"
cp -R "$FX/." "$COPIA/repo/"
# Um byte, literalmente: o menor estrago que ainda é estrago.
printf 'x' >> "$COPIA/repo/scripts/orquestrador/lib.sh"
saida="$(bash "$KIT/instalar.sh" --verificar "$COPIA/repo" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
printf '%s' "$saida" | grep -qE '^diferente +scripts/orquestrador/lib\.sh$' \
  && ok "lista 'diferente scripts/orquestrador/lib.sh'" || falha "não listou o lib.sh como diferente"
# NEGATIVO: um byte em lib.sh não pode arrastar mais nada para a lista.
n="$(printf '%s\n' "$saida" | grep -cE '^(diferente|só no kit|só no repo) ')"
[ "$n" = 1 ] && ok "exatamente 1 diferença, não uma cascata" || falha "$n diferenças (esperava 1)"

# --- (d) · K5b ---------------------------------------------------------------
echo
echo "== (d) cópia do fixture com UM byte a mais em scripts/roadmap/lint-mapa.py =="
mkdir -p "$COPIA_ROADMAP/repo"
cp -R "$FX/." "$COPIA_ROADMAP/repo/"
printf '#x\n' >> "$COPIA_ROADMAP/repo/scripts/roadmap/lint-mapa.py"
saida="$(bash "$KIT/instalar.sh" --verificar "$COPIA_ROADMAP/repo" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
printf '%s' "$saida" | grep -qE '^diferente +scripts/roadmap/lint-mapa\.py$' \
  && ok "lista 'diferente scripts/roadmap/lint-mapa.py'" || falha "não listou o lint-mapa.py como diferente"
n="$(printf '%s\n' "$saida" | grep -cE '^(diferente|só no kit|só no repo) ')"
[ "$n" = 1 ] && ok "exatamente 1 diferença, não uma cascata" || falha "$n diferenças (esperava 1)"

# --- (e) · K8a ---------------------------------------------------------------
echo
echo "== (e) --atualizar: dry-run, recusa sem pausa, e o conserto =="
mkdir -p "$COPIA_UPD/repo"
cp -R "$FX/." "$COPIA_UPD/repo/"
UPD="$COPIA_UPD/repo"
# lib.sh ENVELHECIDO **e commitado**: é o estado real de um repo instalado com
# um kit anterior — o motor velho está no git dele, não pendurado na árvore.
printf '\n# linha de um kit mais velho\n' >> "$UPD/scripts/orquestrador/lib.sh"
git -C "$UPD" add -- scripts/orquestrador/lib.sh >/dev/null 2>&1
git -C "$UPD" commit -q -m 'motor: kit anterior' >/dev/null 2>&1
ANTES_LIB="$(cksum < "$UPD/scripts/orquestrador/lib.sh")"

echo "-- (e1) --dry-run lista 'diferente' e NÃO escreve --"
saida="$(bash "$KIT/instalar.sh" --atualizar "$UPD" --dry-run 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
printf '%s' "$saida" | grep -qE '^diferente +scripts/orquestrador/lib\.sh$' \
  && ok "lista 'diferente scripts/orquestrador/lib.sh'" || falha "não listou o lib.sh como diferente"
[ "$(cksum < "$UPD/scripts/orquestrador/lib.sh")" = "$ANTES_LIB" ] \
  && ok "o lib.sh do repo NÃO foi tocado pelo --dry-run" || falha "o --dry-run ESCREVEU no repo"

echo "-- (e2) --atualizar sem pausa: recusa com rc 1 --"
rm -f "$UPD/docs/fila/PAUSAR" "$UPD/docs/fila/.orq-pause"
saida="$(bash "$KIT/instalar.sh" --atualizar "$UPD" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
printf '%s' "$saida" | grep -qi 'pausad' \
  && ok "a recusa diz que o loop não está pausado" || falha "a recusa não explicou a pausa"
[ "$(cksum < "$UPD/scripts/orquestrador/lib.sh")" = "$ANTES_LIB" ] \
  && ok "o repo continua intacto depois da recusa" || falha "a recusa ESCREVEU no repo"

echo "-- (e2b) com PAUSAR, mas com modificação não commitada no motor: recusa --"
printf '2026-09-08 12:00 | atualizando o motor\n' > "$UPD/docs/fila/PAUSAR"
printf 'trabalho meio feito\n' > "$UPD/scripts/orquestrador/nao-commitado.txt"
saida="$(bash "$KIT/instalar.sh" --atualizar "$UPD" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
printf '%s' "$saida" | grep -q 'não commitada' \
  && ok "a recusa diz que há modificação não commitada" || falha "a recusa não citou o não commitado"
printf '%s' "$saida" | grep -q 'nao-commitado.txt' \
  && ok "a recusa NOMEIA o caminho" || falha "a recusa não nomeou o caminho"
[ "$(cksum < "$UPD/scripts/orquestrador/lib.sh")" = "$ANTES_LIB" ] \
  && ok "o repo continua intacto depois da recusa 3" || falha "a recusa 3 ESCREVEU no repo"
rm -f "$UPD/scripts/orquestrador/nao-commitado.txt"

echo "-- (e3) --atualizar com PAUSAR e motor limpo: atualiza e fica idêntico --"
saida="$(bash "$KIT/instalar.sh" --atualizar "$UPD" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
printf '%s' "$saida" | grep -q "idêntico ao kit $(cat "$KIT/VERSAO")" \
  && ok "o --verificar do fim diz 'idêntico ao kit <VERSAO>'" || falha "não ficou idêntico"
cmp -s "$KIT/scripts/orquestrador/lib.sh" "$UPD/scripts/orquestrador/lib.sh" \
  && ok "o lib.sh do repo é o do kit" || falha "o lib.sh do repo continua envelhecido"
[ "$(cat "$UPD/docs/orquestrador/skill/VERSAO")" = "$(cat "$KIT/VERSAO")" ] \
  && ok "docs/orquestrador/skill/VERSAO carimbado" || falha "VERSAO não foi carimbado"
printf '%s' "$saida" | grep -q 'git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill' \
  && ok "imprime a linha de commit com pathspec explícito" || falha "não imprimiu a linha de commit"
# NEGATIVO: a fila do repo é do repo, não do kit.
[ -f "$UPD/docs/fila/000-config.json" ] && [ -f "$UPD/docs/fila/001-soma-de-negativos.md" ] \
  && ok "docs/fila/** intacta" || falha "o --atualizar mexeu em docs/fila/**"
[ -f "$UPD/docs/fila/PAUSAR" ] \
  && ok "o PAUSAR do repo continua lá (o kit não retoma o loop por conta própria)" \
  || falha "o --atualizar removeu o PAUSAR"

# --- (f) · K8a · o que só existe no repo sobrevive ---------------------------
echo
echo "== (f) arquivo só do repo sobrevive ao --atualizar e aparece como 'só no repo' =="
mkdir -p "$COPIA_EXTRA/repo"
cp -R "$FX/." "$COPIA_EXTRA/repo/"
EXT="$COPIA_EXTRA/repo"
printf '# script que só existe neste repo\nprint("eu moro aqui")\n' \
  > "$EXT/scripts/orquestrador/so-do-repo.py"
# Commitado: um arquivo NÃO commitado no motor é justamente o que a recusa 3 barra.
git -C "$EXT" add -- scripts/orquestrador/so-do-repo.py >/dev/null 2>&1
git -C "$EXT" commit -q -m 'repo: script próprio no motor' >/dev/null 2>&1
printf '2026-09-08 12:00 | atualizando o motor\n' > "$EXT/docs/fila/PAUSAR"
saida="$(bash "$KIT/instalar.sh" --atualizar "$EXT" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 1 ] && ok "rc 1 (há 'só no repo' — o verificador do fim conta como diferença)" \
  || falha "rc $rc (esperava 1: 'só no repo' é diferença)"
[ -f "$EXT/scripts/orquestrador/so-do-repo.py" ] \
  && ok "so-do-repo.py SOBREVIVEU" || falha "o --atualizar APAGOU o que só existia no repo"
printf '%s' "$saida" | grep -qE '^só no repo +scripts/orquestrador/so-do-repo\.py$' \
  && ok "listado como 'só no repo'" || falha "não apareceu como 'só no repo'"

# --- (g) · K8c · a recusa 3 cobre scripts/roadmap/ ---------------------------
# Desde K5b o --atualizar ESCREVE em scripts/roadmap/ (é motor vendorizado: `orq
# mapa lint` roda python3 scripts/roadmap/lint-mapa.py a partir do MAIN_CHECKOUT,
# scripts/orq:226). A recusa por árvore suja conferia só os três caminhos que a
# K8a enumerava, então um lint-mapa.py modificado e não commitado era apagado em
# silêncio — a única classe de arquivo que o instalador escrevia sem vigiar.
echo
echo "== (g) --atualizar recusa com scripts/roadmap/ sujo, e --forcar passa =="
mkdir -p "$COPIA_SUJA/repo"
cp -R "$FX/." "$COPIA_SUJA/repo/"
SUJO="$COPIA_SUJA/repo"
printf '2026-09-08 12:00 | atualizando o motor\n' > "$SUJO/docs/fila/PAUSAR"
# Modificação NÃO commitada, e com conteúdo reconhecível: é ela que tem de
# sobreviver à recusa e sumir com o --forcar.
printf '\n# regra local que ninguem commitou\n' >> "$SUJO/scripts/roadmap/lint-mapa.py"
ANTES_LINT="$(cksum < "$SUJO/scripts/roadmap/lint-mapa.py")"

saida="$(bash "$KIT/instalar.sh" --atualizar "$SUJO" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
printf '%s' "$saida" | grep -q 'não commitada' \
  && ok "a recusa diz que há modificação não commitada" || falha "a recusa não citou o não commitado"
printf '%s' "$saida" | grep -q 'scripts/roadmap/lint-mapa.py' \
  && ok "a recusa NOMEIA scripts/roadmap/lint-mapa.py" || falha "a recusa não nomeou o lint-mapa.py"
[ "$(cksum < "$SUJO/scripts/roadmap/lint-mapa.py")" = "$ANTES_LINT" ] \
  && ok "o lint-mapa.py do repo continua intacto depois da recusa" || falha "a recusa ESCREVEU no repo"

echo "-- (g2) com --forcar: passa, avisa, e o lint-mapa.py vira o do kit --"
saida="$(bash "$KIT/instalar.sh" --atualizar "$SUJO" --forcar 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
printf '%s' "$saida" | grep -q -- '--forcar: passando por cima' \
  && ok "avisa que passou por cima" || falha "não avisou o que apagou"
cmp -s "$KIT/scripts/roadmap/lint-mapa.py" "$SUJO/scripts/roadmap/lint-mapa.py" \
  && ok "o lint-mapa.py do repo é o do kit" || falha "o --forcar não sobrescreveu o lint-mapa.py"

# --- (h) · K8d · os testes do harness viajam com o motor ---------------------
# Decisão da peça: teste de harness é do KIT. O repo instalado não escreve teste
# de harness — se escrever, ele vira `diferente` no --verificar e o --atualizar
# o substitui, como qualquer outro arquivo de motor. Teste do PRODUTO, que só
# existe no repo, não é tocado nem listado.
echo
echo "== (h) --verificar/--atualizar cobrem os testes do harness =="
mkdir -p "$COPIA_TESTES/repo"
cp -R "$FX/." "$COPIA_TESTES/repo/"
TST="$COPIA_TESTES/repo"
ALVO=test/orquestrador-pacotes.test.ts
mkdir -p "$TST/test"
# O fixture já nasce com os testes do harness vendorizados (fixture.sh usa a
# mesma lista do instalar.sh). Aqui um deles é ENVELHECIDO à mão, que é o estado
# real de um repo instalado com um kit anterior.
printf '// versao envelhecida, de um kit anterior\n' > "$TST/$ALVO"
# Teste do PRODUTO: só existe no repo, e tem de sobreviver intacto.
printf 'import { it, expect } from "vitest";\nit("produto", () => expect(1).toBe(1));\n' \
  > "$TST/test/produto.test.ts"
ANTES_PRODUTO="$(cksum < "$TST/test/produto.test.ts")"
printf '2026-09-08 12:00 | atualizando o motor\n' > "$TST/docs/fila/PAUSAR"
git -C "$TST" add -- test >/dev/null 2>&1
git -C "$TST" commit -q -m 'repo: testes' >/dev/null 2>&1

echo "-- (h1) --verificar acusa o teste envelhecido --"
saida="$(bash "$KIT/instalar.sh" --verificar "$TST" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
printf '%s' "$saida" | grep -qE "^diferente +$ALVO\$" \
  && ok "lista 'diferente $ALVO'" || falha "não listou o $ALVO como diferente"
printf '%s' "$saida" | grep -q 'produto.test.ts' \
  && falha "o verificador citou o teste do PRODUTO (não é dele)" \
  || ok "não cita test/produto.test.ts (teste do produto não é motor)"

echo "-- (h2) --atualizar corrige, e o teste do produto sobrevive --"
saida="$(bash "$KIT/instalar.sh" --atualizar "$TST" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
cmp -s "$KIT/$ALVO" "$TST/$ALVO" \
  && ok "$ALVO do repo é o do kit" || falha "$ALVO continua envelhecido"
[ "$(cksum < "$TST/test/produto.test.ts")" = "$ANTES_PRODUTO" ] \
  && ok "test/produto.test.ts intacto" || falha "o --atualizar mexeu no teste do produto"
printf '%s' "$saida" | grep -q "idêntico ao kit $(cat "$KIT/VERSAO")" \
  && ok "o --verificar do fim diz 'idêntico ao kit <VERSAO>'" || falha "não ficou idêntico"

echo "-- (h3) a suíte do REPO passa com os testes que o kit instalou --"
# O teste de portabilidade de verdade: os testes de harness vendorizados rodam
# DENTRO do repo instalado, contra o config DELE (que não é o do kit nem o do
# CI). Um teste que só passa no kit não é teste de harness — é teste do kit, e
# não entra na lista de scripts/kit/vendorizado.sh.
saida="$(cd "$TST" && npx vitest run --reporter=dot 2>&1)"; rc=$?
printf '%s\n' "$saida" | tail -6 | sed 's/^/  | /'
[ "$rc" = 0 ] && ok "npx vitest run no repo: rc 0" || falha "npx vitest run no repo: rc $rc"

# --- (c) ---------------------------------------------------------------------
echo
echo "== (c) $CI_CHECKOUT (SÓ LEITURA — o resultado é achado, não gate) =="
if [ -d "$CI_CHECKOUT" ]; then
  saida="$(bash "$KIT/instalar.sh" --verificar "$CI_CHECKOUT" 2>&1)"; rc=$?
  printf '%s\n' "$saida" | sed 's/^/  | /'
  printf '  (rc %s — informativo)\n' "$rc"
else
  printf '  (pulado: %s não existe nesta máquina)\n' "$CI_CHECKOUT"
fi

echo
[ "$FALHAS" = 0 ] && { echo "TODOS OS CHECKS PASSARAM"; exit 0; }
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
