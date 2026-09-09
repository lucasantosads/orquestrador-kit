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
COPIA_MIGRAR="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1; rm -rf "$COPIA" "$COPIA_ROADMAP" "$COPIA_UPD" "$COPIA_EXTRA" "$COPIA_SUJA" "$COPIA_TESTES" "$COPIA_MIGRAR"' EXIT

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


# --- (i) · K8b-3 · --migrar: pause file, liberações e o relato do .gitignore --
# O cenário é o repo LEGADO de verdade: kill switch no nome antigo
# (`docs/fila/.orq-pause`, que é o que os TRÊS repos têm no .gitignore hoje) e
# liberacoes.json na forma do Actus (strings sem prefixo). O `--atualizar`
# sozinho não encosta em nada disso; `--migrar` é o pedido explícito.
echo
echo "== (i) --atualizar --migrar: .orq-pause -> PAUSAR, liberações -> v2 =="
mkdir -p "$COPIA_MIGRAR/repo"
cp -R "$FX/." "$COPIA_MIGRAR/repo/"
MIG="$COPIA_MIGRAR/repo"
rm -f "$MIG/docs/fila/PAUSAR"
MOTIVO='2026-09-05 09:12 | pausado para aplicar migration 0255'
printf '%s\n' "$MOTIVO" > "$MIG/docs/fila/.orq-pause"
cp "$KIT/test/fixtures/liberacoes/actus-tokens-sem-prefixo.json" "$MIG/docs/fila/liberacoes.json"
ANTES_LIB_MIG="$(cksum < "$MIG/docs/fila/liberacoes.json")"
ANTES_GI="$(cksum < "$MIG/.gitignore")"

echo "-- (i1) --migrar --dry-run: mostra tudo e NÃO escreve --"
saida="$(bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar --dry-run 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
printf '%s' "$saida" | grep -q 'motivo preservado: 2026-09-05 09:12' \
  && ok "o dry-run mostra o motivo que seria preservado" || falha "não mostrou o motivo"
printf '%s' "$saida" | grep -q '^+      "token": "humano:migration-0255-aplicada"' \
  && ok "o dry-run traz o DIFF das liberações, não um resumo" || falha "não imprimiu o diff das liberações"
[ -f "$MIG/docs/fila/.orq-pause" ] && [ ! -f "$MIG/docs/fila/PAUSAR" ] \
  && ok "o .orq-pause continua lá e nenhum PAUSAR foi criado" || falha "o --dry-run RENOMEOU o pause file"
[ "$(cksum < "$MIG/docs/fila/liberacoes.json")" = "$ANTES_LIB_MIG" ] \
  && ok "liberacoes.json intacto" || falha "o --dry-run ESCREVEU no liberacoes.json"
[ -f "$MIG/docs/fila/liberacoes.json.bak" ] \
  && falha "o --dry-run criou .bak" || ok "nenhum .bak foi criado"

echo "-- (i2) --migrar aplica: renomeia preservando o motivo, e migra as liberações --"
saida="$(bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar 2>&1)"; rc=$?
printf '%s\n' "$saida" | grep -vE '^[-+ ]' | sed 's/^/  | /'
[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
[ ! -f "$MIG/docs/fila/.orq-pause" ] && [ -f "$MIG/docs/fila/PAUSAR" ] \
  && ok ".orq-pause virou PAUSAR" || falha "o pause file não foi renomeado"
[ "$(cat "$MIG/docs/fila/PAUSAR")" = "$MOTIVO" ] \
  && ok "o MOTIVO foi preservado byte a byte" || falha "o motivo se perdeu no rename"
[ "$(jq -r '."$schema_versao"' "$MIG/docs/fila/liberacoes.json")" = 2 ] \
  && ok "liberacoes.json em v2" || falha "liberacoes.json não virou v2"
[ "$(jq -r '.tokens[0].token' "$MIG/docs/fila/liberacoes.json")" = 'humano:migration-0255-aplicada' ] \
  && ok "o token ganhou o prefixo humano:" || falha "o prefixo não foi acrescentado"
[ "$(cksum < "$MIG/docs/fila/liberacoes.json.bak")" = "$ANTES_LIB_MIG" ] \
  && ok ".bak tem o conteúdo ANTERIOR, byte a byte" || falha ".bak não bate com o original"
# NEGATIVO que dá nome à peça: o instalador NÃO edita o .gitignore do repo.
[ "$(cksum < "$MIG/.gitignore")" = "$ANTES_GI" ] \
  && ok "o .gitignore do repo NÃO foi editado" || falha "o instalador editou o .gitignore do repo"
printf '%s' "$saida" | grep -q 'git commit -m .fila: migrada' \
  && ok "sugere um SEGUNDO commit, separado, para os dados migrados" || falha "não sugeriu o commit da fila"

echo "-- (i3) rodar de novo é no-op, e o .bak NÃO é sobrescrito --"
CK_BAK="$(cksum < "$MIG/docs/fila/liberacoes.json.bak")"
saida="$(bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar 2>&1)"; rc=$?
[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
printf '%s' "$saida" | grep -q 'já está em v2' \
  && ok "a migração diz que não há o que fazer" || falha "a segunda passada não é no-op"
printf '%s' "$saida" | grep -q 'não existe docs/fila/.orq-pause' \
  && ok "a pausa também é no-op" || falha "a pausa não é idempotente"
[ "$(cksum < "$MIG/docs/fila/liberacoes.json.bak")" = "$CK_BAK" ] \
  && ok ".bak preservado (é o estado ANTES da PRIMEIRA migração)" || falha ".bak foi sobrescrito"

echo "-- (i4) .orq-pause E PAUSAR juntos: NÃO migra, e diz por quê --"
printf 'outra pausa, de outro dia\n' > "$MIG/docs/fila/.orq-pause"
saida="$(bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar --dry-run 2>&1)"
printf '%s' "$saida" | grep -q 'AMBOS existem' \
  && ok "recusa migrar com os dois presentes" || falha "não avisou que os dois existem"
[ "$(cat "$MIG/docs/fila/PAUSAR")" = "$MOTIVO" ] \
  && ok "o PAUSAR existente não foi sobrescrito" || falha "sobrescreveu o PAUSAR"
rm -f "$MIG/docs/fila/.orq-pause"

echo "-- (i5) o relato de .gitignore pergunta ao GIT, e nomeia o que falta --"
# Um repo sem NENHUMA das duas linhas: o relato tem de acusar as duas.
SEM_GI="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
mkdir -p "$SEM_GI/docs/fila"
git -C "$SEM_GI" init -q 2>/dev/null
saida="$(cd "$KIT" && bash instalar.sh --atualizar "$SEM_GI" --migrar --dry-run 2>&1)"
printf '%s' "$saida" | grep -q 'FALTA    docs/fila/PAUSAR' \
  && ok "acusa docs/fila/PAUSAR faltando" || falha "não acusou o PAUSAR"
printf '%s' "$saida" | grep -q 'FALTA    docs/fila/runs/' \
  && ok "acusa docs/fila/runs/ faltando" || falha "não acusou o runs/"
printf '%s' "$saida" | grep -q 'NÃO edita o .gitignore' \
  && ok "diz que não edita o .gitignore do repo" || falha "não disse que não edita"
# E o NEGATIVO que só um `git check-ignore` acerta: o CI não tem
# `docs/fila/runs/` no .gitignore da raiz e mesmo assim ignora tudo lá, por
# causa do docs/fila/runs/.gitignore com `*`. Um grep por linha literal diria
# que falta uma linha que não falta.
printf 'docs/fila/PAUSAR\n' > "$SEM_GI/.gitignore"
mkdir -p "$SEM_GI/docs/fila/runs"
printf '*\n!.gitignore\n' > "$SEM_GI/docs/fila/runs/.gitignore"
saida="$(cd "$KIT" && bash instalar.sh --atualizar "$SEM_GI" --migrar --dry-run 2>&1)"
printf '%s' "$saida" | grep -q 'ok       docs/fila/runs/ já é ignorado' \
  && ok "runs/ ignorado por runs/.gitignore conta como ok (é como o CI faz)" \
  || falha "não reconheceu o runs/.gitignore com '*'"
rm -rf "$SEM_GI"

echo "-- (i5b) K8b-4: o config é PROPOSTO, nunca aplicado pelo instalador --"
# O fixture nasce em schema 2 e completo; para exercitar a proposta, o config
# dele vira o do Comarka (schema 1, com c0_intocavel e tsc_baseline).
CFG_ANTES="$(cksum < "$MIG/docs/fila/000-config.json")"
COMARKA_CFG="$HOME/Projetos/comarka-operacional/docs/fila/000-config.json"
if [ -f "$COMARKA_CFG" ]; then
  cp "$COMARKA_CFG" "$MIG/docs/fila/000-config.json"
  CK_V1="$(cksum < "$MIG/docs/fila/000-config.json")"
  saida="$(bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar 2>&1)"
  printf '%s' "$saida" | grep -q 'supabase_project_id → ambiente_id' \
    && ok "relata o renome supabase_project_id → ambiente_id" || falha "não relatou o renome"
  printf '%s' "$saida" | grep -q "tipo 'tsc_baseline' → 'baseline'" \
    && ok "relata a conversão do tipo do gate" || falha "não relatou o tipo do gate"
  printf '%s' "$saida" | grep -q 'MANTIDA (própria do comarka-operacional, para a K11 decidir): c0_intocavel' \
    && ok "c0_intocavel vira item NOMEADO do relatório" || falha "não nomeou o c0_intocavel"
  printf '%s' "$saida" | grep -q 'AINDA AUSENTE, e a tabela não cobre: zona_proibida' \
    && ok "grita que zona_proibida continua ausente" || falha "não acusou a zona_proibida ausente"
  [ "$(cksum < "$MIG/docs/fila/000-config.json")" = "$CK_V1" ] \
    && ok "o 000-config.json OFICIAL não foi tocado" || falha "o instalador SOBRESCREVEU o config oficial"
  [ -f "$MIG/docs/fila/000-config.proposto.json" ] \
    && ok "000-config.proposto.json gravado ao lado" || falha "não gravou o proposto"
  [ "$(jq -r '."$schema_versao"' "$MIG/docs/fila/000-config.proposto.json")" = 2 ] \
    && ok "o proposto está em schema 2" || falha "o proposto não é schema 2"
  [ "$(jq -r '.c0_intocavel.no_write_prefixes[0]' "$MIG/docs/fila/000-config.proposto.json")" = 'trafego_' ] \
    && ok "c0_intocavel atravessa INTACTA para o proposto" || falha "o c0_intocavel se perdeu"
  printf '%s' "$saida" | grep -q 'O config NÃO foi aplicado' \
    && ok "diz que não aplicou, e dá os 4 passos humanos" || falha "não explicou o passo humano"
  rm -f "$MIG/docs/fila/000-config.proposto.json"
else
  printf '  PULADO: %s não existe nesta máquina\n' "$COMARKA_CFG"
fi

echo "-- (i5c) K8b-5: bloco JSON dos pendentes, prosa intacta byte a byte --"
COMARKA_FILA="$HOME/Projetos/comarka-operacional/docs/fila"
if [ -d "$COMARKA_FILA" ]; then
  # Um ticket REAL do Comarka, com recon_esperado e prosa de verdade, copiado
  # para a fila do fixture. Nada é escrito no repo de origem.
  TK_ORIG="$COMARKA_FILA/306-perf-leads-ingest-ghl-completa.md"
  if [ -f "$TK_ORIG" ]; then
    cp "$TK_ORIG" "$MIG/docs/fila/306-perf-leads-ingest-ghl-completa.md"
    TK="$MIG/docs/fila/306-perf-leads-ingest-ghl-completa.md"
    # A prosa é tudo antes do bloco ```json — é ela que não pode se mover.
    PROSA_ANTES="$(awk '/^```json$/{exit} {print}' "$TK" | cksum)"
    saida="$(bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar 2>&1)"
    grep -q '"recon":' "$TK" \
      && ok "recon_esperado virou recon no ticket real" || falha "o renome não foi aplicado"
    grep -q '"recon_esperado":' "$TK" \
      && falha "o nome antigo continua lá" || ok "o nome antigo saiu do bloco"
    [ "$(awk '/^```json$/{exit} {print}' "$TK" | cksum)" = "$PROSA_ANTES" ] \
      && ok "a PROSA é byte a byte a mesma" || falha "a migração mexeu na prosa"
    [ -f "$TK.bak" ] \
      && falha "criou .bak de ticket (o git é o backup)" || ok "nenhum .bak de ticket"
    printf '%s' "$saida" | grep -q 'orq validar --pendentes' \
      && ok "o relatório roda o orq validar sobre a fila migrada" || falha "não rodou o orq validar"
    # O NEGATIVO da peça: `orq validar` RELATA e não corrige.
    CK_TK="$(cksum < "$TK")"
    bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar >/dev/null 2>&1
    [ "$(cksum < "$TK")" = "$CK_TK" ] \
      && ok "o orq validar não CORRIGIU o ticket (segunda passada é no-op)" || falha "algo reescreveu o ticket"
    rm -f "$TK"
  else
    printf '  PULADO: %s não existe\n' "$TK_ORIG"
  fi
else
  printf '  PULADO: %s não existe nesta máquina\n' "$COMARKA_FILA"
fi

echo "-- (i6) --dry-run PREVÊ a recusa em vez de dizer que está tudo bem --"
rm -f "$MIG/docs/fila/PAUSAR"
saida="$(bash "$KIT/instalar.sh" --atualizar "$MIG" --dry-run 2>&1)"; rc=$?
[ "$rc" = 0 ] && ok "o dry-run continua saindo 0 (ele não é o gate)" || falha "rc $rc"
printf '%s' "$saida" | grep -q 'RECUSARIA' \
  && ok "o dry-run avisa que o --atualizar de verdade recusaria" || falha "o dry-run não previu a recusa"
printf '%s' "$saida" | grep -qi 'não está pausado' \
  && ok "e diz o motivo (sem pausa)" || falha "não disse o motivo"
printf '%s\n' "$MOTIVO" > "$MIG/docs/fila/PAUSAR"

# --- (j) · K8b-6 · --novo num repo git sem docs/fila --------------------------
# O pronto-quando da peça: repo temporário vazio → --novo → `orq config` lista os
# placeholders (e NENHUMA chave ausente) → `--verificar` idêntico.
echo
echo "== (j) --novo: repo git sem docs/fila =="
NOVO="$(mktemp -d /tmp/orq-novo-XXXXXX)"
trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1; rm -rf "$COPIA" "$COPIA_ROADMAP" "$COPIA_UPD" "$COPIA_EXTRA" "$COPIA_SUJA" "$COPIA_TESTES" "$COPIA_MIGRAR" "$NOVO"' EXIT
( cd "$NOVO" && git init -q && printf 'node_modules/\n' > .gitignore \
  && git add -A && git -c user.email=t@example.invalid -c user.name=t commit -qm inicial ) >/dev/null 2>&1
# node_modules por symlink: o motor é TypeScript, e desde a peça T1 o `--novo`
# RECUSA repo sem `node_modules/.bin/tsx` (caso (k) abaixo). Antes da T1 este
# link existia por outro motivo — sem ele o `npx` tentava BAIXAR o tsx da rede
# no meio de um teste —, e é essa ida à rede que a peça tirou do caminho.
ln -sfn "$KIT/node_modules" "$NOVO/node_modules"

echo "-- (j1) o repo nasce inteiro --"
saida="$(bash "$KIT/instalar.sh" --novo "$NOVO" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
for f in docs/fila/000-config.json docs/fila/_TEMPLATE.md docs/fila/liberacoes.json \
         docs/fila/decisoes-pendentes.md docs/fila/rascunhos/.gitkeep \
         docs/roadmap/mapa.json docs/roadmap/MAPA.md \
         docs/orquestrador/PLAYBOOK.md docs/orquestrador/PECAS.md \
         docs/orquestrador/skill/SKILL.md docs/orquestrador/skill/VERSAO \
         scripts/orq scripts/orquestrador/lib.sh scripts/roadmap/lint-mapa.py \
         test/fixtures/orq-harness.ts docs/fila/runs/.gitignore; do
  [ -e "$NOVO/$f" ] && ok "criou $f" || falha "NÃO criou $f"
done
[ "$(cat "$NOVO/docs/orquestrador/skill/VERSAO")" = "$(cat "$KIT/VERSAO")" ] \
  && ok "VERSAO carimbado" || falha "VERSAO não carimbado"
[ "$(jq -r '."$schema_versao"' "$NOVO/docs/fila/liberacoes.json")" = 2 ] \
  && ok "liberacoes.json nasce em v2" || falha "liberacoes.json não nasce em v2"

echo "-- (j2) NADA de launchd: agendar é passo separado --"
[ -z "$(find "$NOVO" -name '*.plist' ! -name '*.plist.template' 2>/dev/null)" ] \
  && ok "nenhum plist instanciado no repo" || falha "o --novo instanciou um plist"
printf '%s' "$saida" | grep -q 'SÓ ENTÃO agendar' \
  && ok "os próximos passos põem o agendamento por ÚLTIMO" || falha "não explicou a ordem"

echo "-- (j3) orq config: só placeholders, NENHUMA chave ausente --"
saida_cfg="$( cd "$NOVO" && bash scripts/orq config 2>&1 )"; rc=$?
[ "$rc" = 1 ] && ok "rc 1 (formulário em branco é config inválido, e tem de ser)" || falha "rc $rc (esperava 1)"
printf '%s' "$saida_cfg" | grep -q 'placeholder não preenchido' \
  && ok "lista os placeholders" || falha "não listou placeholder nenhum"
printf '%s' "$saida_cfg" | grep -q 'chave obrigatória ausente' \
  && falha "o template do kit está INCOMPLETO: falta chave obrigatória" \
  || ok "nenhuma chave obrigatória AUSENTE (o template só precisa ser preenchido)"

echo "-- (j4) --verificar: idêntico ao kit --"
saida="$(bash "$KIT/instalar.sh" --verificar "$NOVO" 2>&1)"; rc=$?
printf '%s\n' "$saida" | tail -3 | sed 's/^/  | /'
[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
printf '%s' "$saida" | grep -q "idêntico ao kit $(cat "$KIT/VERSAO")" \
  && ok "idêntico ao kit" || falha "não ficou idêntico"

echo "-- (j5) .gitignore: acrescenta o que falta, preserva o que havia --"
grep -qx 'node_modules/' "$NOVO/.gitignore" \
  && ok "a linha que já existia sobreviveu" || falha "o --novo apagou o .gitignore do repo"
grep -qx 'docs/fila/PAUSAR' "$NOVO/.gitignore" \
  && ok "acrescentou docs/fila/PAUSAR" || falha "não acrescentou o PAUSAR"
git -C "$NOVO" check-ignore -q docs/fila/runs/x \
  && ok "docs/fila/runs/ é ignorado (o git confirma)" || falha "runs/ não é ignorado"

echo "-- (j6) rodar de novo RECUSA: com fila, o verbo é --atualizar --"
saida="$(bash "$KIT/instalar.sh" --novo "$NOVO" 2>&1)"; rc=$?
[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
printf '%s' "$saida" | grep -q 'já tem docs/fila' \
  && ok "a recusa diz por quê e aponta o --atualizar" || falha "recusa sem explicação"

echo "-- (j7) repo que não é git: RECUSA antes de escrever qualquer coisa --"
SEMGIT="$(mktemp -d /tmp/orq-novo-XXXXXX)"
saida="$(bash "$KIT/instalar.sh" --novo "$SEMGIT" 2>&1)"; rc=$?
[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
printf '%s' "$saida" | grep -q 'não é um repositório git' \
  && ok "a recusa nomeia a causa" || falha "recusa sem causa"
[ -z "$(ls -A "$SEMGIT")" ] \
  && ok "não escreveu NADA no diretório recusado" || falha "escreveu antes de recusar"
rm -rf "$SEMGIT"

# --- (k) · T1 · repo sem tsx: recusa nomeada, e o --dry-run só avisa ----------
# O bloqueante B-1 da revisão de adoção do Actus (2026-09-09), reduzido ao que o
# instalador pode provar: o motor é TypeScript e o `lib.sh` resolve o binário em
# `<checkout>/node_modules/.bin/tsx`. Instalar num repo sem essa dependência
# entrega um orquestrador que só falha no primeiro disparo do launchd — onde
# ninguém está olhando. A recusa é do instalador porque é o único momento com um
# humano na frente.
echo
echo "== (k) T1 · sem node_modules/.bin/tsx =="
SEM_TSX="$(mktemp -d /tmp/orq-sem-tsx-XXXXXX)"
trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1; rm -rf "$COPIA" "$COPIA_ROADMAP" "$COPIA_UPD" "$COPIA_EXTRA" "$COPIA_SUJA" "$COPIA_TESTES" "$COPIA_MIGRAR" "$NOVO" "$SEM_TSX"' EXIT
cp -R "$FX/." "$SEM_TSX/"
rm -f "$SEM_TSX/node_modules"            # no fixture ele é symlink para o do kit
printf 'pausado para o teste\n' > "$SEM_TSX/docs/fila/PAUSAR"

echo "-- (k1) --atualizar RECUSA, nomeando o caminho e o comando --"
saida="$(bash "$KIT/instalar.sh" --atualizar "$SEM_TSX" 2>&1)"; rc=$?
printf '%s\n' "$saida" | sed 's/^/  | /'
[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
printf '%s' "$saida" | grep -q 'RECUSADO' && ok "diz RECUSADO" || falha "não diz RECUSADO"
printf '%s' "$saida" | grep -q 'node_modules/.bin/tsx' \
  && ok "nomeia node_modules/.bin/tsx" || falha "não nomeia o caminho"
printf '%s' "$saida" | grep -qE 'tsx@\^[0-9]' && ok "dá a linha de instalação" || falha "não dá a linha"

echo "-- (k2) --forcar NÃO dispensa (forçar copiaria um motor que não roda) --"
bash "$KIT/instalar.sh" --atualizar "$SEM_TSX" --forcar >/dev/null 2>&1; rc=$?
[ "$rc" = 1 ] && ok "rc 1 com --forcar" || falha "rc $rc com --forcar (esperava 1)"

echo "-- (k3) --dry-run SÓ AVISA: sai 0, prevê a recusa e não escreve nada --"
antes="$(git -C "$SEM_TSX" status --porcelain 2>/dev/null)"
saida="$(bash "$KIT/instalar.sh" --atualizar "$SEM_TSX" --dry-run 2>&1)"; rc=$?
[ "$rc" = 0 ] && ok "rc 0 (o dry-run não é o gate)" || falha "rc $rc (esperava 0)"
printf '%s' "$saida" | grep -q 'RECUSARIA' && ok "prevê a recusa" || falha "não prevê a recusa"
printf '%s' "$saida" | grep -q 'node_modules/.bin/tsx' \
  && ok "e diz qual" || falha "não diz qual"
[ "$antes" = "$(git -C "$SEM_TSX" status --porcelain 2>/dev/null)" ] \
  && ok "árvore idêntica antes e depois" || falha "o dry-run escreveu"

echo "-- (k4) com o tsx de volta, o --atualizar segue normalmente --"
ln -sfn "$KIT/node_modules" "$SEM_TSX/node_modules"
saida="$(bash "$KIT/instalar.sh" --atualizar "$SEM_TSX" 2>&1)"; rc=$?
[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
printf '%s' "$saida" | grep -q 'node_modules/.bin/tsx' \
  && falha "ainda reclama do tsx" || ok "nenhuma reclamação de tsx"

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
