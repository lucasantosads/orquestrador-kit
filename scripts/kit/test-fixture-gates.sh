#!/usr/bin/env bash
# test-fixture-gates.sh — a worktree que o motor monta no fixture passa nos
# gates REAIS do config, sem agente e sem juiz. Zero modelo, zero rede.
#
# Existe por causa do e2e pago de 27/09 (docs/e2e/2026-09-27-1851-001): o
# `pacotes_do_checkout` do K6a (d613b07) só casava `node_modules` DIRETÓRIO, o
# do fixture é SYMLINK para o do kit, e a worktree nasceu sem `node_modules`.
# O gate de typecheck morreu com `sh: tsc: command not found` (exit 127), o
# ticket foi ADIADO por gate_crash e o executor gastou US$ 0,58 procurando o
# vitest no disco. Nenhum teste grátis via isso:
#   - test/orquestrador-pacotes.test.ts criava `node_modules` com mkdir;
#   - o molde test-fixture-executor.sh troca os gates por `bash <tmp>/gates/*.sh`
#     com caminho absoluto, e um gate assim não precisa de `node_modules`.
# Aqui nada é trocado: fixture de verdade (`fixture.sh`), `setup_worktree` do
# executor.sh vendorizado nele, e o `gates.ts --run-cli` com o `.gates[]` do
# 000-config.json do fixture — os mesmos `npm run typecheck` e `npm test` que o
# e2e roda. É pré-requisito do `fixture-e2e.sh`: e2e pago só com este verde.
#
# Uso: bash scripts/kit/test-fixture-gates.sh   (rc 0 = verde)

set -uo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
  printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
}
trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1 || true' EXIT

WT="$(dirname "$FX")/_worktrees/fx-teste-gates"
SAIDA="$(dirname "$FX")/gates.txt"
FALHAS=0
falha() { printf 'FALHA: %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
ok()    { printf 'ok: %s\n' "$*"; }

printf '== gates reais numa worktree do motor · fixture em %s ==\n\n' "$FX"

# O mesmo `setup_worktree` que o executor chama antes do agente, com o motor
# VENDORIZADO no fixture (o que o e2e roda), não o do kit.
(
  cd "$FX" || exit 2
  export ORQ_EXEC_ROOT="$FX" EXECUTOR_SOURCED=1
  # shellcheck disable=SC1091
  source scripts/orquestrador/lib.sh
  # shellcheck disable=SC1091
  source scripts/orquestrador/executor.sh
  set +e
  setup_worktree teste-gates "$WT"
) || { falha "setup_worktree saiu rc=$?"; }

if [ -L "$WT/node_modules" ] && [ -d "$WT/node_modules" ]; then
  ok "a worktree tem node_modules (symlink -> $(readlink "$WT/node_modules"))"
else
  falha "a worktree NÃO tem node_modules — pacotes_do_checkout devolveu: [$(
    cd "$FX" && ORQ_EXEC_ROOT="$FX" EXECUTOR_SOURCED=1 bash -c \
      'source scripts/orquestrador/lib.sh; source scripts/orquestrador/executor.sh; set +e; pacotes_do_checkout' \
      2>/dev/null | tr '\n' ' ')]"
fi

# gates.ts exatamente como o executor.sh o chama: --run-cli <worktree> e o config
# do checkout PRINCIPAL (fonte única, 626). Sem PATH extra: o do chamador.
"$FX/node_modules/.bin/tsx" "$FX/scripts/orquestrador/gates.ts" \
  --run-cli "$WT" --config "$FX/docs/fila/000-config.json" > "$SAIDA" 2>&1
rc=$?
printf '\n--- gates.txt ---\n'; cat "$SAIDA"; printf -- '--- fim (rc=%s) ---\n\n' "$rc"

[ "$rc" = 0 ] && ok "gates.ts rc=0" || falha "gates.ts rc=$rc"
if grep -qx 'VEREDITO: APROVADO' "$SAIDA"; then ok 'VEREDITO: APROVADO'; else falha 'gates.txt sem "VEREDITO: APROVADO"'; fi
# Todo gate do config aparece como `ok` — um gate pulado não é gate verde.
for g in $(jq -r '.gates[].nome' "$FX/docs/fila/000-config.json"); do
  if grep -qE "^ok +$g " "$SAIDA"; then ok "gate $g"; else falha "gate $g não saiu 'ok'"; fi
done

git -C "$FX" worktree remove --force "$WT" >/dev/null 2>&1 || true

printf '\n'
if [ "$FALHAS" = 0 ]; then
  printf 'test-fixture-gates: VERDE\n'; exit 0
fi
printf 'test-fixture-gates: %s falha(s)\n' "$FALHAS"; exit 1
