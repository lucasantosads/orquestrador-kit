#!/usr/bin/env bash
# fixture-e2e.sh — o fixture atravessa o loop de ponta a ponta (peça K7-e2e).
#
# ESTE SCRIPT GASTA DINHEIRO. É o único do kit que chama a API da Anthropic:
# uma sondagem de modelo (preflight_probe) e as tentativas do executor + o juiz,
# nos modelos e no teto que o 000-config.json DO FIXTURE declara. Não rode sem
# ter lido, no config instanciado, `modelos`, `orcamento.usd_ticket` e
# `claude_timeout_secs` — o script os imprime antes de começar, e exige
# confirmação (ORQ_E2E_OK=1) para seguir.
#
# O que ele faz: instancia o fixture, roda UMA drenagem (`local-loop.sh` do
# fixture, com watchdog de claude_timeout_secs + 120 s) e imprime a evidência.
# O fixture NÃO é removido no fim: se o ticket reprovar, o diff da tentativa e o
# veredito cru são o resultado, e apagá-los seria apagar o achado.
#
# Nenhum push acontece nem pode acontecer: o origin do fixture é
# git@example.invalid:..., reservado pela RFC 2606. Se o loop tentasse publicar,
# falharia alto — e isso também seria resultado.
#
# A EVIDÊNCIA É COPIADA PARA O KIT antes de qualquer outra coisa (peça K7c). O
# fixture mora num tmp: `--limpar`, um reboot ou uma faxina do sistema levam
# junto os attempt-*/ , o events.log e o custo.json — que são o único registro do
# que o loop fez. Foi o que aconteceu com o run de 2026-09-08 11:54: sobrou o
# custo.json, e a trilha do run só existe hoje porque alguém a colou na mensagem
# do commit 8525c49.
#
# Uso: ORQ_E2E_OK=1 bash scripts/kit/fixture-e2e.sh

set -uo pipefail

# --- ORQ_TESTE=1, com UMA exceção nomeada (peça K6e) --------------------------
# A variável liga a guarda do `instalar-launchd.sh`, que RECUSA instalar o job
# do launchd a partir de um checkout de teste. É a trava que faltava em
# 2026-09-08, quando um "vermelho antes" carregou um job apontando para um
# fixture em /private/tmp por 1h40.
#
# A EXCEÇÃO é o `local-loop.sh` da drenagem, e ela foi conferida no `lib.sh`
# antes de ser escrita: `escrita_de_teste_permitida` (lib.sh:168) recusa toda
# escrita de trilha, STATUS e custo que caia fora de `$ORQ_EXEC_ROOT` — e o
# `local-loop.sh` NUNCA define essa variável (nem ele, nem o `executor.sh`, nem
# o `launchd-run.sh`: `grep -n ORQ_EXEC_ROOT` neles não devolve nada). Com
# ORQ_TESTE=1 e ORQ_EXEC_ROOT vazio, a drenagem rodaria e a trilha do fixture
# ficaria VAZIA — o e2e existe justamente para produzir essa trilha. Então o
# loop roda com `env -u ORQ_TESTE`, e a guarda do instalador sobra pelo outro
# caminho, o do /tmp, que o fixture satisfaz sempre.
export ORQ_TESTE=1

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CFG_TEMPLATE="$KIT/fixture/docs/fila/000-config.json"

# Destino da evidência. Variável para o teste poder apontá-lo para um tmp — o
# teste desta peça não pode escrever no docs/e2e/ de verdade.
E2E_DOCS="${ORQ_E2E_DOCS:-$KIT/docs/e2e}"

# preservar_evidencia <fixture> [carimbo]
#
# Copia, do fixture para <E2E_DOCS>/<AAAA-MM-DD-HHMM>-<id>/:
#   docs/fila/runs/<id>/attempt-*/   INTEIRO (gates.txt, criterios.txt,
#                                    enforcement.json, meta.json, prompts, diff)
#   docs/fila/runs/events.log        a trilha
#   docs/fila/runs/custo.json        o ledger
#
# `*.log` -> `*.log.txt` porque o .gitignore do kit barra `*.log` (linha 3), e
# evidência que o git não versiona não é evidência preservada — é arquivo no
# disco de alguém. Renomear é preferível a abrir exceção no .gitignore: a
# exceção valeria para todo `docs/e2e/**` futuro, inclusive para log que
# ninguém revisou.
#
# Imprime, na última linha do stdout, o caminho do diretório criado.
preservar_evidencia() {
  local fx="$1" carimbo="${2:-$(date '+%Y-%m-%d-%H%M')}"
  local runs="$fx/docs/fila/runs" id dest rd

  # O id do run sai do DISCO, não de um argumento: o e2e roda uma drenagem, mas
  # nada garante que ela processe um ticket só, e inventar o id aqui seria
  # nomear a pasta com uma suposição.
  id=''
  for rd in "$runs"/[0-9]*/; do
    [ -d "$rd" ] || continue
    rd="${rd%/}"; id="${id:+$id-}$(basename "$rd")"
  done
  dest="$E2E_DOCS/$carimbo-${id:-sem-run}"
  mkdir -p "$dest"

  for rd in "$runs"/[0-9]*/; do
    [ -d "$rd" ] || continue
    rd="${rd%/}"
    mkdir -p "$dest/$(basename "$rd")"
    cp -R "$rd/." "$dest/$(basename "$rd")/" 2>/dev/null || true
  done
  [ -f "$runs/events.log" ]  && cp "$runs/events.log"  "$dest/events.log"
  [ -f "$runs/custo.json" ]  && cp "$runs/custo.json"  "$dest/custo.json"

  # `find -exec mv` e não um glob: os .log moram em profundidades diferentes
  # (runs/ e attempt-*/), e glob não recursivo deixaria os de dentro para trás —
  # que é justamente onde está o log do agente.
  find "$dest" -type f -name '*.log' -exec sh -c 'mv "$1" "$1.txt"' _ {} \; 2>/dev/null || true

  printf 'evidência preservada em: %s\n' "$dest" >&2
  printf '%s\n' "$dest"
}

# Source-safe: com ORQ_E2E_SOURCED=1 só define funções e NÃO gasta nada.
[ "${ORQ_E2E_SOURCED:-0}" = 1 ] && return 0

printf '== o que esta execução vai fazer ==\n'
printf '  comando        bash <fixture>/scripts/orquestrador/local-loop.sh (UMA drenagem)\n'
printf '  ticket         001 soma-de-negativos (docs/fila/001-soma-de-negativos.md)\n'
printf '  executor       %s\n' "$(jq -r '.executor_model' "$CFG_TEMPLATE")"
printf '  juiz (alto)    %s\n' "$(jq -r '.modelos.juiz_alto' "$CFG_TEMPLATE")"
printf '  juiz (baixo)   %s\n' "$(jq -r '.modelos.juiz_baixo' "$CFG_TEMPLATE")"
printf '  retry final    %s\n' "$(jq -r '.retry_final_model' "$CFG_TEMPLATE")"
printf '  sondagem       preflight_probe = %s (chamada paga antes do ticket)\n' "$(jq -r '.preflight_probe' "$CFG_TEMPLATE")"
printf '  orçamento      usd_ticket = %s · usd_dia = %s\n' \
  "$(jq -r '.orcamento.usd_ticket' "$CFG_TEMPLATE")" "$(jq -r '.orcamento.usd_dia' "$CFG_TEMPLATE")"
printf '  timeout        claude_timeout_secs = %s\n' "$(jq -r '.claude_timeout_secs' "$CFG_TEMPLATE")"
printf '  ESTA CHAMADA É PAGA.\n\n'

if [ "${ORQ_E2E_OK:-0}" != 1 ]; then
  printf 'recusado: rode com ORQ_E2E_OK=1 para confirmar que o gasto está autorizado.\n' >&2
  exit 2
fi

command -v claude >/dev/null 2>&1 || { printf 'ERRO: claude fora do PATH\n' >&2; exit 2; }

FX="$(bash "$KIT/scripts/kit/fixture.sh")" || { printf 'ERRO: fixture.sh falhou\n' >&2; exit 2; }
printf '\nfixture: %s  (NÃO é removido no fim — a evidência mora nele)\n\n' "$FX"

TOUT=$(( $(jq -r '.claude_timeout_secs' "$FX/docs/fila/000-config.json") + 120 ))

# Watchdog portátil: o macOS não tem `timeout`/`gtimeout`. Mesma técnica do
# `claude_run` do lib.sh (lib.sh:964-986) — process group próprio e TERM no
# GRUPO, senão o `claude` filho vira órfão e segue queimando cota depois do
# corte.
printf '== drenagem (watchdog %ss) ==\n' "$TOUT"
t0=$(date +%s)
# `env -u ORQ_TESTE`: a exceção explicada no topo. Sem isto a drenagem roda e
# não grava trilha nenhuma — o e2e voltaria a perder a própria evidência.
( set -m; exec env -u ORQ_TESTE bash "$FX/scripts/orquestrador/local-loop.sh" ) &
LOOP_PID=$!
( sleep "$TOUT"
  kill -TERM -"$LOOP_PID" 2>/dev/null || kill -TERM "$LOOP_PID" 2>/dev/null
  sleep 10
  kill -KILL -"$LOOP_PID" 2>/dev/null || kill -KILL "$LOOP_PID" 2>/dev/null
) >/dev/null 2>&1 &
WPID=$!
RC=0; wait "$LOOP_PID" 2>/dev/null || RC=$?
kill "$WPID" 2>/dev/null || true; wait "$WPID" 2>/dev/null || true
case "$RC" in 143|137) RC=124 ;; esac
printf 'local-loop rc=%s  (%ss)\n\n' "$RC" "$(( $(date +%s) - t0 ))"

# ANTES de qualquer outra coisa: a evidência sai do tmp e entra no kit. Se uma
# das seções de relatório abaixo morrer, o registro do run já está salvo.
EVIDENCIA="$(preservar_evidencia "$FX")"

secao() { printf '\n===== %s =====\n' "$*"; }

secao 'bash scripts/orq'
bash "$FX/scripts/orq" 2>&1 || true

secao 'tail -20 docs/fila/runs/events.log'
tail -20 "$FX/docs/fila/runs/events.log" 2>&1 || true

secao 'git log --oneline staging-auto -3'
git -C "$FX" log --oneline staging-auto -3 2>&1 || true

secao 'docs/fila/runs/custo.json'
jq . "$FX/docs/fila/runs/custo.json" 2>&1 || cat "$FX/docs/fila/runs/custo.json" 2>&1 || true

secao 'status do ticket 001'
sed -n '/```json/,/```/p' "$FX/docs/fila/001-soma-de-negativos.md" | jq -r '.status, .notas_status' 2>/dev/null \
  || grep -n '"status"' "$FX/docs/fila/001-soma-de-negativos.md"

secao 'tail -30 docs/fila/runs/local-loop.log'
tail -30 "$FX/docs/fila/runs/local-loop.log" 2>&1 || true

secao 'origin (tem de ser inválido; nenhum push é possível)'
git -C "$FX" remote -v

printf '\nfixture preservado em: %s\n' "$FX"
printf 'para remover:  bash scripts/kit/fixture.sh --limpar %s\n' "$FX"
printf 'EVIDÊNCIA (no kit, versionável): %s\n' "$EVIDENCIA"
exit "$RC"
