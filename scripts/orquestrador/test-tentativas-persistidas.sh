#!/usr/bin/env bash
# test-tentativas-persistidas.sh — prova que o contador de retry SOBREVIVE à
# drenagem (regressão do 612 no kit). Porte do Actus (f3aaa89): no kit a peça
# é a 7b-4; daqui só entram os casos que o kit não cobria (3 e 4) e o 1.
#
# O 612 (harness .mjs) persistia `tentativas_consumidas` no ticket. O kit
# 2.1.0-dev (0bc0bf2, 11/09/2026) trocou o motor e o contador voltou a ser a
# variável `attempt` do drive_ticket, que nasce 0 a cada drenagem: um ticket que
# reprova, adia e volta ganha max_retries de novo. O 481 acumulou 18 attempts;
# o 431 mostrava "tentativas": 0 com "max_retries 2 atingido".
#
# O que se prova, com `run_attempt` STUBADO num ROOT sintético (git de verdade,
# fila de verdade, decisao-cli de verdade com o config REAL, ZERO modelo):
#   1 · drenagem 1: reprovado, depois adiado por ambiente -> tentativas = 1
#       (o adiamento NÃO consome);
#   2 · (não portado para o kit: coberto pelo caso E do test-reprovado-sub.sh,
#       e o roteiro de reprovações iguais cai no corte por repetição da 7b-4);
#   3 · crash no meio da tentativa: o contador JÁ está no arquivo;
#   4 · aprovado não consome; a transição para done zera.
#
# Uso: bash scripts/orquestrador/test-tentativas-persistidas.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ISOLAMENTO (peça 0d) — mesmo cabeçalho do test-retry-worktree.sh.
# (idioma do kit, peça 7b-9: o checkout sai do git, nunca de "$AQUI/../..")
CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(git -C "$AQUI" rev-parse --show-toplevel 2>/dev/null || true)"
CONFIG_REAL="$CHECKOUT_REAL/docs/fila/000-config.json"
export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
mkdir -p "$ORQ_EXEC_ROOT/docs/fila/runs"
cp "$CONFIG_REAL" "$ORQ_EXEC_ROOT/docs/fila/000-config.json"
trap 'rm -rf "$(dirname "$ORQ_EXEC_ROOT")"' EXIT
set +e

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

MAX="$(jq -r '.max_retries' "$CONFIG_REAL")"

fixture_repo() {
  local tmp fx
  tmp="$(mktemp -d)" || return 1
  fx="$tmp/repo"
  mkdir -p "$fx/docs/fila/runs" "$fx/src" "$tmp/_worktrees" || return 1
  cp "$CONFIG_REAL" "$fx/docs/fila/000-config.json" || return 1
  cat > "$fx/docs/fila/901-da-vez.md" <<'TICKET'
# 901

```json
{
  "id": "901",
  "bloco": "B6",
  "slug": "da-vez",
  "risco": "",
  "status": "pendente",
  "origem": "humano",
  "objetivo": "escreve src/a.ts",
  "pathspec_allowlist": ["src/a.ts"],
  "dependencias": [],
  "criterios_aceite": [
    {"tipo": "alvo", "descricao": "o arquivo existe", "cmd": "test -f src/a.ts && echo ok", "espera": "ok"}
  ]
}
```
TICKET
  printf 'base\n' > "$fx/src/base.ts"
  (
    cd "$fx" \
      && git init -q -b main . \
      && git add -A \
      && git -c user.email=t@t -c user.name=t commit -qm base \
      && git branch "$(jq -r '.branch_alvo' "$fx/docs/fila/000-config.json")"
  ) >/dev/null 2>&1 || return 1
  echo "$fx"
}

tentativas() { jq -r '.tentativas // "ausente"' < <(awk '/^```json/{f=1;next} f&&/^```/{exit} f' "$1/docs/fila/901-da-vez.md"); }
status_de()  { jq -r '.status' < <(awk '/^```json/{f=1;next} f&&/^```/{exit} f' "$1/docs/fila/901-da-vez.md"); }

# drenagem <raiz> <desfecho>... — UMA chamada de drive_ticket. Cada execução de
# run_attempt consome o próximo desfecho da lista: reprovado | adiado | aprovado
# | crash (o processo morre no meio da tentativa, antes de qualquer veredito).
drenagem() {
  local fx="$1"; shift
  printf '%s\n' "$@" > "$fx/.roteiro"
  ORQ_EXEC_ROOT="$fx" EXECUTOR_SOURCED=1 bash -c "
    source '$AQUI/executor.sh'
    set +e
    ticket_commit() { return 0; }
    cooldown_arm() { return 0; }
    run_attempt() {
      local file=\"\$1\" wt=\"\$2\" rundir=\"\$3\" attempt=\"\${6:-0}\" desf
      mkdir -p \"\$rundir\"
      desf=\"\$(head -1 '$fx/.roteiro')\"; sed -i.bak 1d '$fx/.roteiro'
      echo \"ENTRADA attempt=\$attempt desfecho=\$desf tentativas_no_arquivo=\$(ticket_field \"\$file\" '.tentativas // \"ausente\"')\"
      case \"\$desf\" in
        crash)    exit 9 ;;
        reprovado) RESULT=reprovado; MOTIVO='criterio: saida vazia'; CAUSA=criterio_qualidade; CONTA=true ;;
        adiado)   RESULT=adiado; MOTIVO='infraestrutura: ambiente'; CAUSA=ambiente; CONTA=false ;;
        aprovado) RESULT=aprovado; MOTIVO=ok; CAUSA=nenhuma; CONTA=false ;;
      esac
      ENF_OK=1; DUR=1; DIFF_LINES=0
      printf '{\"desfecho\":\"%s\",\"causa\":\"%s\",\"motivo\":\"%s\",\"contaComoRetry\":%s}\n' \"\$RESULT\" \"\$CAUSA\" \"\$MOTIVO\" \"\$CONTA\" > \"\$rundir/veredito.json\"
    }
    drive_ticket \"\$(ticket_file_by_id 901)\"
  " 2>&1
}

echo "== 1 · drenagem 1: reprovado + adiado(ambiente) -> tentativas = 1 =="
fx="$(fixture_repo)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  s1="$(drenagem "$fx" reprovado adiado)"
  printf '%s\n' "$s1" | grep -q "ENTRADA attempt=0 desfecho=reprovado" \
    && ok "drenagem 1 começa em attempt=0 (ticket sem campo = 0)" || falha "drenagem 1 não começou em 0: $(printf '%s' "$s1" | grep ENTRADA)"
  [ "$(tentativas "$fx")" = 1 ] \
    && ok "depois de reprovado+adiado: tentativas=1 no arquivo" || falha "tentativas=$(tentativas "$fx") depois da drenagem 1 (esperado 1)"
  [ "$(status_de "$fx")" = pendente ] \
    && ok "o adiamento devolve o ticket a pendente" || falha "status=$(status_de "$fx") depois do adiamento"

  # O caso 2 do Actus (a drenagem 2 continua de onde parou e bloqueia em
  # max_retries) NÃO foi portado: no kit ele é o caso E do test-reprovado-sub.sh
  # (peça 7b-4), e o roteiro dele (reprovações IGUAIS em sequência) cai no corte
  # por repetição da mesma peça, que bloqueia na 2ª reprovação igual — decisão
  # do Lucas de 24/09/2026: tentativas persistidas é a do kit.
  rm -rf "$(dirname "$fx")"
fi

echo
echo "== 3 · crash no meio da tentativa: o contador já está no arquivo =="
fx="$(fixture_repo)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  s3="$(drenagem "$fx" crash)"
  printf '%s\n' "$s3" | grep -q "ENTRADA attempt=0 desfecho=crash tentativas_no_arquivo=1" \
    && ok "a tentativa foi persistida ANTES de rodar (o agente já via tentativas=1)" \
    || falha "no início da tentativa o arquivo dizia: $(printf '%s' "$s3" | grep -o 'tentativas_no_arquivo=[^ ]*' || echo '(sem ENTRADA)')"
  [ "$(tentativas "$fx")" = 1 ] \
    && ok "depois do crash: tentativas=1 (a tentativa morta conta)" || falha "tentativas=$(tentativas "$fx") depois do crash (esperado 1)"
  rm -rf "$(dirname "$fx")"
fi

echo
echo "== 4 · aprovado não consome; done zera =="
fx="$(fixture_repo)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  drenagem "$fx" reprovado aprovado >/dev/null
  [ "$(tentativas "$fx")" = 1 ] \
    && ok "reprovado+aprovado: tentativas=1 (o aprovado não soma)" || falha "tentativas=$(tentativas "$fx") depois de aprovar (esperado 1)"
  rm -rf "$(dirname "$fx")"
fi
# A transição para done mora na drenagem (local-loop.sh), que mergeia: a linha
# que zera tem que estar no MESMO bloco que grava o status done.
bloco_done="$(grep -n 'ticket_set_status "\$prox" done' "$AQUI/local-loop.sh" | head -1 | cut -d: -f1)"
if [ -n "$bloco_done" ] && sed -n "$((bloco_done - 2)),$((bloco_done + 3))p" "$AQUI/local-loop.sh" | grep -q 'ticket_zera_tentativas "\$prox"'; then
  ok "local-loop.sh zera tentativas junto com o status done"
else
  falha "local-loop.sh não zera tentativas na transição para done"
fi

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
