#!/usr/bin/env bash
# test-preflight.sh — prova o probe de modelo do ORQ-07.
#
# Carrega o executor em modo SOURCED (só define funções) e exercita
# probe_modelos() com configs SINTÉTICAS. O que importa é o que NÃO acontece:
# nenhuma worktree criada, nenhum retry consumido, nenhuma chamada paga.
#
# POR QUE ROOT SINTÉTICO, e não o config real (conserto de 2026-09-03):
# a seção 1 chamava `probe_modelos` com o config REAL e afirmava que ele
# abortava por papel `PENDENTE_*`. Isso deixou de ser verdade quando os três
# papéis foram preenchidos — e a consequência não foi só um teste vermelho:
# sem o abort, o probe seguia até o `claude_run` e fazia uma CHAMADA PAGA de
# verdade, gravada no `custo.json` do checkout principal. Um script de teste
# que gasta dinheiro toda vez que roda é pior que um teste quebrado.
#
# A proteção em si não é obsoleta: ela vale para qualquer papel que volte a
# ficar pendente. Por isso o cenário mora agora num ROOT sintético com o papel
# em PENDENTE_*, onde o abort acontece ANTES de qualquer gasto — e o config
# real ganha o que lhe cabe: a asserção de INVARIANTE de que nenhum papel está
# pendente hoje.
#
# A seção 5 (peça 6 da sessão B) estende o mesmo princípio ao JUIZ: ele roda
# inteiro por `--stub-juiz`, num ROOT sintético, e o teste termina conferindo
# que custo.json continua vazio.
#
# Uso: bash scripts/orquestrador/test-preflight.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ISOLAMENTO (peça 0d): a trilha, o STATUS e o ledger de custo DESTE script vivem
# num fixture temporário, e o `ORQ_TESTE=1` faz o `lib.sh` RECUSAR qualquer
# escrita fora dele. Sem as duas linhas, o `source` abaixo herda o checkout
# PRINCIPAL — `lib.sh` resolve `MAIN_CHECKOUT` por `git rev-parse
# --git-common-dir`, de qualquer worktree — e um `event` disparado aqui grava na
# trilha de produção. Foi assim que os `EXECUTOR_MORREU` espúrios de 2026-09-04
# 20:45/20:47 entraram no `events.log` real.
CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
CHECKOUT_REAL="$(git -C "$CHECKOUT_REAL" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##' || true)"
[ -n "$CHECKOUT_REAL" ] || CHECKOUT_REAL="$(cd "$AQUI/../.." && pwd)"
CONFIG_REAL="$CHECKOUT_REAL/docs/fila/000-config.json"
export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
mkdir -p "$ORQ_EXEC_ROOT/docs/fila/runs"
cp "$CONFIG_REAL" "$ORQ_EXEC_ROOT/docs/fila/000-config.json"
trap 'rm -rf "$(dirname "$ORQ_EXEC_ROOT")"' EXIT
EXECUTOR_SOURCED=1
# shellcheck source=executor.sh
source "$AQUI/executor.sh"
set +e   # rc != 0 é o resultado esperado de metade dos casos

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }

PAPEIS="executor_model avaliador_model retry_final_model"
DESBLOQUEIO_FIXTURE="DESBLOQUEIO-DO-FIXTURE"

# fixture_pendente <papel> -> imprime a raiz de um ROOT sintético cujo config é
# o REAL com UM papel trocado por PENDENTE_*. Fora de git de propósito: assim o
# lib.sh cai em MAIN_CHECKOUT=ROOT e a fila/runs/custo do fixture ficam isoladas
# do checkout principal.
fixture_pendente() {
  local papel="$1" fx
  fx="$(mktemp -d)" || return 1
  mkdir -p "$fx/docs/fila/runs"
  jq --arg p "$papel" --arg d "$DESBLOQUEIO_FIXTURE" '
      .[$p] = "PENDENTE_FIXTURE"
    | .restricao_execucao.ativa = true
    | .restricao_execucao.desbloqueio = $d
  ' "$CONFIG_REAL" > "$fx/docs/fila/000-config.json" || return 1
  echo "$fx"
}

# probe_no_fixture <raiz> -> roda probe_modelos com aquele ROOT, ecoa a saída.
# Subshell própria: ORQ_EXEC_ROOT só vale para esta execução.
probe_no_fixture() {
  ORQ_EXEC_ROOT="$1" EXECUTOR_SOURCED=1 \
    bash -c "source '$AQUI/executor.sh'; probe_modelos" 2>&1
}

# Worktrees contadas no lugar REAL (não no fixture): o abort não pode criar
# worktree em canto nenhum, e é o _worktrees de verdade que importa aqui.
WT_REAL="$CHECKOUT_REAL/$(jq -r '.worktrees_dir' "$CONFIG_REAL")"
wt_antes="$(ls "$WT_REAL" 2>/dev/null | wc -l | tr -d ' ')"

echo "== 1 · papel em PENDENTE_* aborta (ROOT sintético, zero gasto) =="
fx="$(fixture_pendente executor_model)"
saida="$(probe_no_fixture "$fx")"; rc=$?
[ "$rc" != 0 ] && ok "abortou (rc=$rc)" || falha "não abortou (rc=$rc)"
printf '%s' "$saida" | grep -q "ERRO DE CONFIGURAÇÃO" && ok "diz que é erro de config" || falha "mensagem não classifica como config"
printf '%s' "$saida" | grep -q "sem consumir tentativa" && ok "diz que não consome tentativa" || falha "não menciona tentativa"
printf '%s' "$saida" | grep -q "$DESBLOQUEIO_FIXTURE" && ok "aponta o desbloqueio LIDO DO CONFIG" || falha "não aponta o desbloqueio do config"
# A mensagem tem que nomear o papel pendente: "algum papel está pendente" não
# diz em qual arquivo mexer.
printf '%s' "$saida" | grep -q "executor_model" && ok "nomeia o papel pendente" || falha "não nomeia o papel pendente"
# NEGATIVO do gasto: nenhuma chamada ao modelo chegou a acontecer.
printf '%s' "$saida" | grep -q "probe: modelo" && falha "chegou a sondar o modelo (gasto!)" || ok "nenhuma sondagem disparada"
[ ! -s "$fx/docs/fila/runs/custo.json" ] && ok "nada gravado no custo.json do fixture" || falha "registrou custo (houve chamada paga)"

echo
echo "== 1b · qualquer um dos três papéis pendente basta =="
for papel in $PAPEIS; do
  fxp="$(fixture_pendente "$papel")"
  s="$(probe_no_fixture "$fxp")"; r=$?
  if [ "$r" != 0 ] && printf '%s' "$s" | grep -q "$papel"; then
    ok "$papel pendente => aborta nomeando o papel"
  else
    falha "$papel pendente NÃO abortou como esperado (rc=$r)"
  fi
  rm -rf "$fxp"
done

echo
echo "== 1c · INVARIANTE do config real: nenhum papel pendente hoje =="
# Substitui o cenário obsoleto. Não chama probe_modelos com o config real de
# propósito: essa chamada é PAGA. Aqui só se pergunta ao decisao.ts se algum
# papel voltou a ser marcador — que é o gatilho da restrição.
for papel in $PAPEIS; do
  valor="$(jq -r ".$papel" "$CONFIG_REAL")"
  if decisao modelo-indefinido "$valor" >/dev/null 2>&1; then
    falha "$papel voltou a ser marcador ($valor) — a restrição está armada"
  else
    ok "$papel definido ($valor)"
  fi
done

echo
echo "== 2 · id de modelo inexistente é RECUSADO pelo texto do CLI =="
# A detecção é pura (decisao.ts): estas são as respostas reais do CLI.
for amostra in \
  '[claude-code:unrecognized_model] {"model":"modelo-que-nao-existe"}' \
  "There's an issue with the selected model (xyz-9). It may not exist" \
  '"PENDENTE_TK104" is not a model this version of Claude Code recognizes'
do
  printf '%s' "$amostra" | decisao modelo-recusado >/dev/null 2>&1 \
    && ok "recusa detectada: ${amostra:0:44}…" || falha "NÃO detectou: ${amostra:0:44}…"
done
printf '%s' 'ok' | decisao modelo-recusado >/dev/null 2>&1 \
  && falha "resposta normal marcada como recusa" || ok "resposta normal não é recusa"

echo
echo "== 3 · o que NÃO aconteceu =="
# Worktrees: contadas no lugar REAL — o abort não pode criar worktree em canto
# nenhum, nem no fixture nem fora dele.
wt_depois="$(ls "$WT_REAL" 2>/dev/null | wc -l | tr -d ' ')"
[ "$wt_antes" = "$wt_depois" ] && ok "nenhuma worktree criada ($wt_antes antes, $wt_depois depois)" \
  || falha "worktrees mudaram: $wt_antes -> $wt_depois"
# Attempt e cooldown: conferidos NO FIXTURE. Antes esta checagem olhava o
# runs/ do checkout principal, onde attempts de tickets reais vivem por
# desenho — `runs/000` existir ali não diz nada sobre este teste.
attempts="$(ls -A "$fx/docs/fila/runs" 2>/dev/null | grep -vc '^\.')"
[ "$attempts" = 0 ] && ok "nenhum attempt gravado no fixture" || falha "$attempts entrada(s) criada(s) em runs/"
[ ! -f "$fx/docs/fila/runs/.cooldown-until" ] && ok "cooldown NÃO armado (erro de config não é adiamento)" \
  || falha "cooldown armado (config errada não deve armar)"
rm -rf "$fx"

echo
echo "== 4 · fronteira: sondagem limitada ADIA, não aborta =="
# Envelopes REAIS do CLI (capturados em 2026-09-03, CLI 2.1.259) — a cobertura
# fina da fronteira mora em test/orquestrador-envelope.test.ts; aqui fica só o
# smoke de que o lib.sh carregado por este script concorda com ela.
tmp="$(mktemp)"
FIXT="$(cd "$AQUI/../.." && pwd)/test/fixtures/claude-envelope"
if [ -s "$FIXT/rate-limit-429.txt" ]; then
  is_adiavel "$FIXT/rate-limit-429.txt" 1 && ok "429 real => adiável" || falha "429 real não classificado como adiável"
  is_adiavel "$FIXT/conexao-recusada.txt" 1 && ok "conexão recusada real => adiável" || falha "conexão real não classificada como adiável"
else
  falha "fixtures de envelope ausentes em $FIXT"
fi
: > "$tmp"
is_adiavel "$tmp" 1 && ok "saída vazia com rc!=0 => adiável (CLI não falou)" || falha "saída vazia não classificada como adiável"
printf '[claude-code:unrecognized_model] {}\n' > "$tmp"
is_adiavel "$tmp" 1 && falha "modelo recusado tratado como adiável (deveria abortar)" || ok "modelo recusado NÃO é adiável"
rm -f "$tmp"

echo
echo "== 5 · JUIZ (passo 7): stub, evidência e ZERO gasto =="
# O juiz é a única chamada paga nova do pipeline. Este bloco existe para provar
# que ele roda inteiro — nível, prompt, veredito, evidência — SEM tocar o
# modelo: `--stub-juiz` substitui a chamada, e a asserção final é o negativo do
# gasto (nada em custo.json), a mesma proteção que a seção 1 ganhou depois de o
# probe ter cobrado US$ 0,34 rodando este script.

# fixture_juiz -> ROOT sintético com config real, um ticket e uma worktree git.
fixture_juiz() {
  local fx wt
  fx="$(mktemp -d)" || return 1
  mkdir -p "$fx/docs/fila/runs/901/attempt-0"
  cp "$CONFIG_REAL" "$fx/docs/fila/000-config.json" || return 1
  cat > "$fx/docs/fila/901-da-vez.md" <<'TICKET'
# 901

```json
{
  "id": "901",
  "slug": "da-vez",
  "status": "pendente",
  "origem": "humano",
  "objetivo": "monta o card na home e prova que ele aparece",
  "pathspec_allowlist": ["apps/web/src/app/home/Card.tsx", "apps/web/test/card.test.tsx"],
  "dependencias": [],
  "criterios_aceite": [
    {"tipo": "alvo", "descricao": "o card existe", "cmd": "test -f x && echo ok", "espera": "ok"},
    {"tipo": "avaliador", "descricao": "o card e IMPORTADO e MONTADO na page", "cmd": "true", "espera": "avaliador"}
  ]
}
```
TICKET
  printf 'ok   testes_por_pacote   10ms [9 pacotes, 711p/0f]\nVEREDITO: APROVADO\n' \
    > "$fx/docs/fila/runs/901/attempt-0/gates.txt"
  wt="$fx/wt"; mkdir -p "$wt"; printf 'base\n' > "$wt/a.txt"
  ( cd "$wt" && git init -q && git add a.txt \
    && git -c user.email=t@t -c user.name=t commit -qm base ) >/dev/null 2>&1 || return 1
  echo "$fx"
}

# juiz_no_fixture <raiz> <cmd-do-stub> -> ecoa a saída de run_juiz + as variáveis.
juiz_no_fixture() {
  local fx="$1" stub="$2"
  ORQ_EXEC_ROOT="$fx" EXECUTOR_SOURCED=1 bash -c "
    source '$AQUI/executor.sh' --stub-juiz \"$stub\"
    set +e
    DIFF_LINES=12
    base=\"\$(git -C '$fx/wt' rev-parse HEAD)\"
    run_juiz \"\$(ticket_file_by_id 901)\" '$fx/wt' '$fx/docs/fila/runs/901/attempt-0' \"\$base\" 0
    echo \"VARS APROVADO=\$JUIZ_APROVADO ILEGIVEL=\$JUIZ_ILEGIVEL ROU=\$JUIZ_ROU\"
  " 2>&1
}

fxj="$(fixture_juiz)"
if [ -z "$fxj" ]; then
  falha "não consegui montar o fixture do juiz"
else
  RUNDIR="$fxj/docs/fila/runs/901/attempt-0"
  ENVELOPE_OK='{\"type\":\"result\",\"is_error\":false,\"result\":\"{\\\"aprovado\\\":true,\\\"motivo\\\":\\\"integra\\\",\\\"criterios_falhos\\\":[]}\",\"total_cost_usd\":0.02}'
  saida="$(juiz_no_fixture "$fxj" "printf '%s' '$ENVELOPE_OK'")"
  printf '%s' "$saida" | grep -q "APROVADO=true ILEGIVEL=0 ROU=1" \
    && ok "veredito válido lido do envelope" || falha "veredito válido NÃO foi lido: $(printf '%s' "$saida" | tail -2)"
  [ -s "$RUNDIR/juiz.prompt.txt" ] && ok "prompt gravado (evidência, regra 8)" || falha "juiz.prompt.txt ausente"
  [ -s "$RUNDIR/juiz.raw.json" ]   && ok "output CRU preservado"              || falha "juiz.raw.json ausente"
  # O critério `avaliador` só existe por esta via: até a peça 1 ele era pulado.
  grep -q "IMPORTADO e MONTADO" "$RUNDIR/juiz.prompt.txt" 2>/dev/null \
    && ok "o critério avaliador chega ao prompt" || falha "critério avaliador não chegou ao prompt"
  grep -q "ANTI-AFROUXAMENTO" "$RUNDIR/juiz.prompt.txt" 2>/dev/null \
    && ok "allowlist com *.test.* liga o anti-afrouxamento" || falha "anti-afrouxamento ausente com teste na allowlist"
  # NEGATIVO: o prompt do EXECUTOR mora no mesmo rundir e não pode vazar aqui.
  grep -q "REGRAS INVIOLÁVEIS" "$RUNDIR/juiz.prompt.txt" 2>/dev/null \
    && falha "o prompt do executor vazou para o juiz (independência quebrada)" \
    || ok "o juiz não recebe o prompt do executor"

  rm -f "$RUNDIR/juiz.veredito.json"
  saida="$(juiz_no_fixture "$fxj" "printf 'desculpe, nao consegui avaliar'")"
  printf '%s' "$saida" | grep -q "ILEGIVEL=1" \
    && ok "lixo => ILEGÍVEL (o executor adia, não reprova)" || falha "lixo não foi classificado como ilegível"
  [ ! -f "$RUNDIR/juiz.veredito.json" ] \
    && ok "nenhum veredito inventado a partir de lixo" || falha "gravou veredito a partir de lixo"

  # O NEGATIVO DO GASTO, como na seção 1: com stub, nenhuma chamada é feita.
  [ ! -s "$fxj/docs/fila/runs/custo.json" ] \
    && ok "nada gravado em custo.json (nenhuma chamada paga)" || falha "registrou custo — houve chamada PAGA"
  rm -rf "$fxj"
fi

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
