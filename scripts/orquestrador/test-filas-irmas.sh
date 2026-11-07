#!/usr/bin/env bash
# test-filas-irmas.sh · etapa c0052-B1a (M-54): o executor DE VERDADE drena a fila
# irmã escolhida por ORQ_CONFIG, num repo git de mktemp (test-fixture-executor.sh),
# com claude falso. A irmã é o config do molde com o que o apolo do Comarka troca
# por loop: branch alvo staging-apolo, prefixo fxa-, runs e pausa na pasta dela.
#
#   P2  seleção, status, worktree, runs e merge só na irmã; a raiz intocada.
#   P3  pausa e lock por fila; `orq pausar --todas` pausa a raiz e as irmãs.
#
# Uso: bash scripts/orquestrador/test-filas-irmas.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=test-fixture-executor.sh
source "$AQUI/test-fixture-executor.sh"

FALHAS=0
ok()    { printf '  ok   %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
confere() { local nome="$1"; shift; if "$@"; then ok "$nome"; else falha "$nome"; fi; }

IRMA_CFG=docs/fila/apolo/000-config.json

# irma_nova: o molde (ticket 901 na raiz) mais a fila apolo com o ticket 902.
irma_nova() {
  fxe_novo
  local r="$FXE/repo" a="$FXE/repo/docs/fila/apolo"
  mkdir -p "$a/runs"
  jq '.branch_alvo = "staging-apolo" | .worktrees_prefixo = "fxa-"
      | .runs_dir = "docs/fila/apolo/runs" | .liberacoes_file = "docs/fila/apolo/liberacoes.json"
      | .pausar_file = "docs/fila/apolo/PAUSAR" | .decisoes_file = "docs/fila/apolo/decisoes-pendentes.md"
      | .orcamento.custo_file = "docs/fila/apolo/runs/custo.json"
      | .gates[1].cmd = "bash '"$FXE"'/gates/test-irma.sh" | .juiz.paths_alto_risco = ["src/**"]' \
    "$r/docs/fila/000-config.json" > "$r/$IRMA_CFG"
  printf 'touch %s/gate-da-irma\necho " Tests  1 passed (1)"\nexit 0\n' "$FXE" > "$FXE/gates/test-irma.sh"
  cp "$r/docs/fila/liberacoes.json" "$r/docs/fila/decisoes-pendentes.md" "$a/"
  sed 's/901/902/g' "$r/docs/fila/901-t.md" > "$a/902-t.md"
  printf 'docs/fila/apolo/runs/\n' >> "$r/.gitignore"
  git -C "$r" add -A && git -C "$r" commit -qm "fixture: fila irma"
  git -C "$r" branch -f staging-auto main
  git -C "$r" branch staging-apolo main
}

irma_roda() {
  FXE_RC=0
  ( cd "$FXE/repo" && ORQ_TESTE=1 ORQ_EXEC_ROOT="$FXE/repo" ORQ_CONFIG="$IRMA_CFG" PATH="$FXE/bin:$PATH" \
      bash "$FXE/repo/scripts/orquestrador/executor.sh" --ticket "$FXE/repo/docs/fila/apolo/902-t.md" ) >> "$FXE/saida" 2>&1 || FXE_RC=$?
}
campo() { awk '/^```json$/{f=1;next} f&&/^```$/{exit} f' "$1" | jq -r "$2"; }

echo "== P2: a irmã drena só ela =="
irma_nova
r="$FXE/repo"
sel="$(cd "$r" && ORQ_TESTE=1 ORQ_EXEC_ROOT="$r" ORQ_CONFIG="$IRMA_CFG" bash -c "source '$r/scripts/orquestrador/lib.sh'; proximo_pendente")"
confere "proximo_pendente da irmã é o 902 (o 901 da raiz também está pendente)" [ "$sel" = "$r/docs/fila/apolo/902-t.md" ]

base_auto="$(git -C "$r" rev-parse staging-auto)"
fxe_juiz '{"aprovado": true, "motivo": "ok", "criterios_falhos": []}'
irma_roda
confere "executor sai 0 (rc=$FXE_RC)" [ "$FXE_RC" = 0 ]
confere "status do 902 na irmã é aguardando_merge ($(campo "$r/docs/fila/apolo/902-t.md" .status))" \
  [ "$(campo "$r/docs/fila/apolo/902-t.md" .status)" = aguardando_merge ]
confere "o 901 da raiz segue pendente" [ "$(campo "$r/docs/fila/901-t.md" .status)" = pendente ]
# O merge da drenagem (local-loop.sh, passo depois do executor) com a irmã carregada.
( cd "$r" && ORQ_TESTE=1 ORQ_EXEC_ROOT="$r" ORQ_CONFIG="$IRMA_CFG" LOCAL_LOOP_SOURCED=1 bash -c "
    source '$r/scripts/orquestrador/local-loop.sh'; set +e
    stwt=\"\$(ensure_staging_worktree)\" && echo \"stwt=\$stwt\" && merge_em_alvo 902 \"\$stwt\"" ) >> "$FXE/saida" 2>&1
confere "staging-apolo recebeu src/a.ts" git -C "$r" cat-file -e staging-apolo:src/a.ts
confere "worktree de merge com o prefixo da irmã (fxa-staging-apolo)" grep -q 'stwt=.*/fxa-staging-apolo$' "$FXE/saida"
confere "staging-auto não se moveu" [ "$(git -C "$r" rev-parse staging-auto)" = "$base_auto" ]
confere "worktree com o prefixo da irmã (fxa-902)" grep -q 'worktree fxa-902' "$FXE/saida"
confere "os gates vêm do config da irmã" [ -f "$FXE/gate-da-irma" ]
confere "o juiz lê o config da irmã (src/** é risco alto lá)" grep -q 'juiz: risco alto' "$FXE/saida"
confere "evidência em docs/fila/apolo/runs/902" [ -d "$r/docs/fila/apolo/runs/902" ]
confere "nada em docs/fila/runs/902" [ ! -e "$r/docs/fila/runs/902" ]
confere "trilha da irmã tem o 902" grep -q ' 902 ' "$r/docs/fila/apolo/runs/events.log"
[ "$FALHAS" = 0 ] || tail -40 "$FXE/saida"
fxe_limpa

echo "== P3: pausa e lock por fila =="
irma_nova
r="$FXE/repo"
# lib <fila> <comando>: o lib.sh (e o local-loop, sourced) carregados na fila pedida.
lib() {
  ( cd "$r" && ORQ_TESTE=1 ORQ_EXEC_ROOT="$r" ORQ_CONFIG="$1" LOCAL_LOOP_SOURCED=1 PATH="$FXE/bin:$PATH" bash -c "
      source '$r/scripts/orquestrador/local-loop.sh'; set +e; $2" ) 2>&1
}
echo "2026-11-07 10:00 | legado" > "$r/docs/fila/.orq-pause"
confere ".orq-pause da raiz pausa a raiz" [ "$(lib '' 'pausa_ativa && echo sim')" = sim ]
confere ".orq-pause da raiz não segura a irmã" [ -z "$(lib "$IRMA_CFG" 'pausa_ativa && echo sim')" ]
rm -f "$r/docs/fila/.orq-pause"
echo "2026-11-07 10:00 | irma" > "$r/docs/fila/apolo/PAUSAR"
confere "PAUSAR da irmã não segura a raiz" [ -z "$(lib '' 'pausa_ativa && echo sim')" ]
rm -f "$r/docs/fila/apolo/PAUSAR"
mkdir -p "$r/docs/fila/runs"
printf '%s\n%s\n' "$$" "$(date +%s)" > "$r/docs/fila/runs/.local-loop.lock"
confere "lock vivo da raiz não encerra a irmã" grep -q '^adquiriu$' <<< "$(lib "$IRMA_CFG" 'lock_adquirir && echo adquiriu')"
confere "lock vivo da raiz encerra a raiz" grep -q 'outro run vivo' <<< "$(lib '' 'lock_adquirir || echo recusou')"
rm -f "$r/docs/fila/runs/.local-loop.lock" "$r/docs/fila/apolo/runs/.local-loop.lock"

jq '.filas_irmas = ["docs/fila/apolo"]' "$r/docs/fila/000-config.json" > "$r/c.tmp" && mv "$r/c.tmp" "$r/docs/fila/000-config.json"
jq '.filas_irmas = ["docs/fila"]' "$r/$IRMA_CFG" > "$r/c.tmp" && mv "$r/c.tmp" "$r/$IRMA_CFG"
( cd "$r" && ORQ_TESTE=1 ORQ_EXEC_ROOT="$r" bash "$(git -C "$AQUI" rev-parse --show-toplevel)/scripts/orq" pausar --todas "janela de manutencao" ) >> "$FXE/saida" 2>&1
confere "--todas: PAUSAR na raiz com o motivo" grep -q '| janela de manutencao$' "$r/docs/fila/PAUSAR"
confere "--todas: PAUSAR na irmã com o motivo" grep -q '| janela de manutencao$' "$r/docs/fila/apolo/PAUSAR"
confere "--todas: PAUSA na trilha da irmã" grep -q 'PAUSA ' "$r/docs/fila/apolo/runs/events.log"
[ "$FALHAS" = 0 ] || tail -20 "$FXE/saida"
fxe_limpa

echo
if [ "$FALHAS" = 0 ]; then echo "test-filas-irmas: tudo verde"; exit 0; fi
echo "test-filas-irmas: $FALHAS falha(s)"; exit 1
