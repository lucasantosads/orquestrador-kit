#!/usr/bin/env bash
# test-retry-worktree.sh — prova a peça 0: retry na MESMA worktree, patch por
# tentativa e stderr real da sondagem.
#
# O caso que originou as três: runs/227. A tentativa 1 foi reprovada pelo JUIZ
# com um diff de 178 linhas; as tentativas 2 e 3 saíram com diff 0 em 15s e 3s.
# Não foi o agente que desistiu — a worktree era recriada do zero a cada retry,
# então o agente abria uma árvore vazia e o "corrija exatamente isto" apontava
# para linhas que não existiam mais. Sem `diff.patch` gravado, nem dava para
# distinguir "não fez nada" de "não tinha o que corrigir": o meta.json só guarda
# o NÚMERO de linhas.
#
# Tudo roda em ROOT SINTÉTICO (git de verdade, fila de verdade, ZERO modelo):
# `run_attempt` entra como stub, porque o que se prova aqui é a decisão do
# `drive_ticket` sobre a worktree — não o pipeline de gates.
#
# Uso: bash scripts/orquestrador/test-retry-worktree.sh

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

# (CONFIG_REAL vem do cabeçalho de isolamento acima — o config do checkout de
# verdade, não a cópia do fixture.)

# fixture_repo -> imprime a raiz de um ROOT sintético que é um GIT DE VERDADE
# (worktree add precisa disso), com branch alvo, um ticket pendente e a fila
# isolada. Fica em <tmp>/repo de propósito: worktrees_dir é '../_worktrees' e
# assim as worktrees do teste nascem dentro do tmp, nunca no _worktrees real.
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
  "slug": "da-vez",
  "status": "pendente",
  "origem": "humano",
  "objetivo": "escreve src/a.ts e o teste que o cobre",
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

# drive_no_fixture <raiz> <enf-da-tentativa-0>
# Roda `drive_ticket` inteiro com `run_attempt` STUBADO. O stub:
#   - monta o prompt REAL (build_prompt), para que a asserção sobre o
#     "REPROVAÇÃO ANTERIOR" seja sobre o texto que o agente receberia;
#   - grava o patch REAL (grava_diff_patch), como o run_attempt faz;
#   - imprime o que ENCONTROU na worktree ao ENTRAR — que é o dado do teste;
#   - na tentativa 0 reprova (ENF_OK vem do parâmetro), na 1 aprova para o
#     laço terminar.
drive_no_fixture() {
  local fx="$1" enf0="$2"
  ORQ_EXEC_ROOT="$fx" EXECUTOR_SOURCED=1 bash -c "
    source '$AQUI/executor.sh'
    set +e
    ticket_commit() { return 0; }
    run_attempt() {
      local file=\"\$1\" wt=\"\$2\" rundir=\"\$3\" attempt=\"\${6:-0}\" base=\"\${7:-}\"
      mkdir -p \"\$rundir\"
      [ -n \"\$base\" ] || base=\"\$(git -C \"\$wt\" rev-parse HEAD)\"
      build_prompt \"\$file\" \"\${5:-}\" > \"\$rundir/prompt.txt\"
      echo \"ENTRADA attempt=\$attempt herdado=\$(git -C \"\$wt\" diff \"\$base\"...HEAD --numstat | awk '{s+=\$1+\$2} END{print s+0}') existe_a=\$([ -f \"\$wt/src/a.ts\" ] && echo sim || echo nao)\"
      if [ \"\$attempt\" = 0 ]; then
        # o 'agente': escreve e COMMITA, como o prompt exige
        printf 'export const a = 1\n' > \"\$wt/src/a.ts\"
        git -C \"\$wt\" add src/a.ts >/dev/null 2>&1
        git -C \"\$wt\" -c user.email=t@t -c user.name=t commit -qm 'agente: a.ts' >/dev/null 2>&1
        ENF_OK=$enf0
        RESULT=reprovado; MOTIVO='juiz: o teste nao cobre o caso vazio'
        # a causa é a que o decisao.ts produziria: enforcement violado é falha de
        # FRONTEIRA; juiz/gate reprovado é falha de QUALIDADE. As duas geram
        # retry, e é exatamente por isso que a diferença precisa aparecer na
        # worktree — não no modelo escolhido.
        CAUSA=\"\$([ \"\$ENF_OK\" = 0 ] && echo enforcement || echo criterio_qualidade)\"
      else
        ENF_OK=1; RESULT=aprovado; MOTIVO=ok; CAUSA=nenhuma
      fi
      DUR=1
      DIFF_LINES=\"\$(git -C \"\$wt\" diff \"\$base\"...HEAD --numstat | awk '{s+=\$1+\$2} END{print s+0}')\"
      grava_diff_patch \"\$wt\" \"\$base\" \"\$rundir\"
      printf '{\"desfecho\":\"%s\",\"causa\":\"%s\",\"motivo\":\"%s\"}\n' \"\$RESULT\" \"\$CAUSA\" \"\$MOTIVO\" > \"\$rundir/veredito.json\"
    }
    drive_ticket \"\$(ticket_file_by_id 901)\"
  " 2>&1
}

echo "== 1 · enforcement PASSOU: a tentativa 2 herda a worktree e o commit =="
fx="$(fixture_repo)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  saida="$(drive_no_fixture "$fx" 1)"
  printf '%s\n' "$saida" | grep -q "ENTRADA attempt=1 herdado=1 existe_a=sim" \
    && ok "attempt-1 começa COM o diff da anterior (1 linha, src/a.ts na árvore)" \
    || falha "attempt-1 nasceu vazia: $(printf '%s' "$saida" | grep 'ENTRADA attempt=1' || echo '(nem chegou à tentativa 2)')"
  printf '%s' "$saida" | grep -q "worktree REAPROVEITADA" \
    && ok "o log diz que reaproveitou (e de qual tentativa)" || falha "reaproveitamento não aparece no log"
  # O ponto da peça: com o diff presente, "corrija exatamente isto" é VERDADE.
  grep -q "REPROVAÇÃO ANTERIOR" "$fx/docs/fila/runs/901/attempt-1/prompt.txt" 2>/dev/null \
    && ok "o prompt da tentativa 2 manda corrigir o apontado" || falha "prompt da tentativa 2 sem a reprovação anterior"
  grep -q "src/a.ts" "$fx/docs/fila/runs/901/attempt-1/diff.patch" 2>/dev/null \
    && ok "o patch da tentativa 2 contém o trabalho herdado" \
    || falha "diff.patch da tentativa 2 não tem o trabalho anterior"
  # A base NÃO anda com a tentativa: o diff medido é o do ticket inteiro contra
  # a branch alvo, não só o da correção da vez.
  grep -q "WORKTREE modo=reaproveitada" "$fx/docs/fila/runs/events.log" 2>/dev/null \
    && ok "a trilha registra a reaproveitação" || falha "events.log sem o registro da worktree"
  grep -q "RETRY .*worktree=reaproveitada" "$fx/docs/fila/runs/events.log" 2>/dev/null \
    && ok "o RETRY anuncia o modo da worktree" || falha "RETRY não diz o modo da worktree"
  rm -rf "$(dirname "$fx")"
fi

echo
echo "== 2 · enforcement REPROVOU: worktree NOVA (diff fora do escopo não vira base) =="
fx="$(fixture_repo)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  saida="$(drive_no_fixture "$fx" 0)"
  printf '%s\n' "$saida" | grep -q "ENTRADA attempt=1 herdado=0 existe_a=nao" \
    && ok "attempt-1 nasce LIMPA quando o enforcement reprovou" \
    || falha "herdou um diff que o enforcement recusou: $(printf '%s' "$saida" | grep 'ENTRADA attempt=1' || echo '(nem chegou à tentativa 2)')"
  printf '%s' "$saida" | grep -q "worktree REAPROVEITADA" \
    && falha "reaproveitou worktree com enforcement reprovado" || ok "não reaproveitou"
  grep -q "RETRY .*worktree=nova" "$fx/docs/fila/runs/events.log" 2>/dev/null \
    && ok "o RETRY registra que a worktree é nova" || falha "RETRY não registra worktree nova"
  rm -rf "$(dirname "$fx")"
fi

echo
echo "== 3 · diff.patch por tentativa, ANTES de qualquer descarte =="
fx="$(fixture_repo)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  # 3a · a função em si, contra um git de verdade
  base="$(git -C "$fx" rev-parse HEAD)"
  printf 'export const b = 2\n' > "$fx/src/b.ts"
  ( cd "$fx" && git add src/b.ts && git -c user.email=t@t -c user.name=t commit -qm b ) >/dev/null 2>&1
  rd="$fx/docs/fila/runs/901/attempt-0"
  grava_diff_patch "$fx" "$base" "$rd"
  [ -s "$rd/diff.patch" ] && ok "grava_diff_patch escreve o patch" || falha "diff.patch não foi escrito"
  grep -q '^+export const b = 2$' "$rd/diff.patch" 2>/dev/null \
    && ok "o patch tem o conteúdo, não só o nome do arquivo" || falha "patch sem o conteúdo do diff"
  # 3b · diff vazio ainda produz arquivo: "existe e está vazio" é uma informação
  # (o agente não commitou nada); "não existe" seria ambíguo com harness quebrado.
  rd2="$fx/docs/fila/runs/901/attempt-9"
  grava_diff_patch "$fx" "$(git -C "$fx" rev-parse HEAD)" "$rd2"
  [ -f "$rd2/diff.patch" ] && [ ! -s "$rd2/diff.patch" ] \
    && ok "diff vazio => patch vazio, mas presente" || falha "diff vazio não gerou arquivo"
  rm -rf "$(dirname "$fx")"
fi
# 3c · ORDEM: o patch é gravado ANTES do enforcement — e o enforcement é o
# primeiro passo que pode levar ao descarte da worktree.
linha_patch="$(grep -n 'grava_diff_patch "\$wt"' "$AQUI/executor.sh" | head -1 | cut -d: -f1)"
linha_enf="$(grep -n 'ORQ_LIB_DIR/enforcement.sh" --worktree' "$AQUI/executor.sh" | head -1 | cut -d: -f1)"
[ -n "$linha_patch" ] && [ -n "$linha_enf" ] && [ "$linha_patch" -lt "$linha_enf" ] \
  && ok "run_attempt grava o patch antes do enforcement" \
  || falha "o patch não é gravado antes do enforcement (patch=$linha_patch enf=$linha_enf)"

echo
echo "== 4 · sondagem com rc!=0 grava o stderr REAL, não um palpite =="
# ROOT sintético + claude_run STUBADO: nenhuma chamada paga, e a saída crua é
# conhecida, então dá para exigir que ela apareça inteira.
fxp="$(mktemp -d)"
mkdir -p "$fxp/docs/fila/runs"
cp "$CONFIG_REAL" "$fxp/docs/fila/000-config.json"
ERRO_REAL="EACCES: permission denied, open '/Users/x/.claude/config.json'"
saida="$(ORQ_EXEC_ROOT="$fxp" EXECUTOR_SOURCED=1 bash -c "
  source '$AQUI/executor.sh'
  set +e
  claude_run() { printf '%s\n' \"$ERRO_REAL\" > \"\$2\"; return 3; }
  probe_modelos
" 2>&1)"
printf '%s' "$saida" | grep -qF "$ERRO_REAL" \
  && ok "a mensagem traz a saída REAL do CLI" || falha "a saída real não aparece: $(printf '%s' "$saida" | tail -2)"
printf '%s' "$saida" | grep -q "checar login/instalação" \
  && falha "ainda chuta 'checar login/instalação'" || ok "não chuta mais a causa"
printf '%s' "$saida" | grep -q "rc=3" && ok "diz o rc observado" || falha "não diz o rc"
arq="$(ls "$fxp/docs/fila/runs"/probe-falha-*.txt 2>/dev/null | head -1)"
[ -n "$arq" ] && ok "gravou a evidência em runs/ ($(basename "$arq"))" || falha "nada gravado em runs/"
[ -n "$arq" ] && grep -qF "$ERRO_REAL" "$arq" \
  && ok "o arquivo tem a saída crua" || falha "o arquivo não tem a saída crua"
printf '%s' "$saida" | grep -q "probe: claude rc=3 — saída crua em" \
  && ok "o log aponta o arquivo antes de morrer" || falha "o log não aponta o arquivo"
rm -rf "$fxp"

echo
echo "== 5 · REQUEUE: rodada nova com attempt-0..2 antigos no disco =="
# O caso de produção da peça 0b (runs/227, 2026-09-04 20:15): ticket bloqueado
# volta para pendente, a drenagem seguinte recomeça o contador de retry em 0 e o
# diretório de evidência colide com o da rodada anterior. Aqui o requeue é caso
# de PRIMEIRA CLASSE: o fixture nasce com evidência antiga, como o disco real.
semear_attempts() {
  local fx="$1" n="$2" i
  for i in $(seq 0 $((n - 1))); do
    mkdir -p "$fx/docs/fila/runs/901/attempt-$i"
    printf 'PROMPT DA RODADA ANTIGA, tentativa %s\n' "$i" > "$fx/docs/fila/runs/901/attempt-$i/prompt.txt"
    printf '{"desfecho":"reprovado","causa":"criterio_qualidade","motivo":"ANTIGO %s"}\n' "$i" \
      > "$fx/docs/fila/runs/901/attempt-$i/veredito.json"
  done
  printf '[{"attempt":0,"dir":"attempt-0"},{"attempt":1,"dir":"attempt-1"},{"attempt":2,"dir":"attempt-2"}]\n' \
    > "$fx/docs/fila/runs/901/meta.json"
}

fx="$(fixture_repo)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  semear_attempts "$fx" 3
  md5_antes="$(md5 -q "$fx/docs/fila/runs/901/attempt-0/prompt.txt" 2>/dev/null \
    || md5sum "$fx/docs/fila/runs/901/attempt-0/prompt.txt" | cut -d' ' -f1)"
  saida="$(drive_no_fixture "$fx" 1)"
  md5_depois="$(md5 -q "$fx/docs/fila/runs/901/attempt-0/prompt.txt" 2>/dev/null \
    || md5sum "$fx/docs/fila/runs/901/attempt-0/prompt.txt" | cut -d' ' -f1)"

  # O CHECK QUE FALTAVA: a evidência antiga é intocada.
  [ "$md5_antes" = "$md5_depois" ] \
    && ok "attempt-0 da rodada antiga NÃO foi sobrescrito" \
    || falha "o requeue sobrescreveu attempt-0 (foi o bug de runs/227)"
  grep -q "RODADA ANTIGA" "$fx/docs/fila/runs/901/attempt-1/prompt.txt" 2>/dev/null \
    && ok "attempt-1 e attempt-2 antigos preservados" || falha "evidência antiga corrompida"
  # A rodada nova continua a numeração: 3 tentativas antigas => começa em 3.
  [ -f "$fx/docs/fila/runs/901/attempt-3/prompt.txt" ] \
    && ok "a rodada nova escreveu em attempt-3" || falha "attempt-3 não foi criado"
  grep -q "REGRAS INVIOLÁVEIS" "$fx/docs/fila/runs/901/attempt-3/prompt.txt" 2>/dev/null \
    && ok "attempt-3 tem o prompt DE HOJE, não o antigo" || falha "attempt-3 sem prompt novo"
  printf '%s' "$saida" | grep -q "evidência a partir de attempt-3" \
    && ok "o log anuncia o slot inicial" || falha "o log não diz de onde a evidência começa"
  # O retry desta rodada segue contando do zero: contador de retry e slot de
  # disco são coisas diferentes, e é justamente por confundi-los que o bug nasceu.
  [ -f "$fx/docs/fila/runs/901/attempt-4/prompt.txt" ] \
    && ok "o retry da rodada foi para attempt-4 (numeração contínua)" \
    || falha "o retry não continuou a numeração"
  grep -qE '"dir": ?"attempt-3"' "$fx/docs/fila/runs/901/meta.json" 2>/dev/null \
    && ok "meta.json amarra o contador de retry ao diretório (campo dir)" \
    || falha "meta.json sem o campo dir: $(tail -c 200 "$fx/docs/fila/runs/901/meta.json" 2>/dev/null)"
  # Tentativa 1 de uma drenagem nunca herda worktree: o diff da rodada anterior
  # não pode aparecer nela.
  printf '%s\n' "$saida" | grep -q "ENTRADA attempt=0 herdado=0 existe_a=nao" \
    && ok "tentativa 1 da rodada nasce limpa, apesar dos runs/ antigos" \
    || falha "tentativa 1 herdou algo: $(printf '%s' "$saida" | grep 'ENTRADA attempt=0')"
  rm -rf "$(dirname "$fx")"
fi

echo
echo "== 6 · COMMIT DO HARNESS: agente que sai sem commitar não perde trabalho =="
# runs/227: o agente escreveu 150 linhas em 3 arquivos, abortou sem commitar, e
# o pipeline mediu diff 0 — a worktree ia ser removida com o trabalho dentro.
fx="$(fixture_repo)"
if [ -z "$fx" ]; then
  falha "não consegui montar o fixture"
else
  wt="$fx/../_worktrees/wt6"; mkdir -p "$wt"
  git -C "$fx" worktree add -q -b tmp6 "$wt" staging-auto >/dev/null 2>&1
  base="$(git -C "$wt" rev-parse HEAD)"
  # o agente: escreve dentro e FORA da allowlist, e não commita
  printf 'export const a = 1\n' > "$wt/src/a.ts"
  printf 'fora do escopo\n' > "$wt/src/intruso.ts"
  saida="$(ORQ_EXEC_ROOT="$fx" EXECUTOR_SOURCED=1 bash -c "
    source '$AQUI/executor.sh'
    set +e
    commit_do_agente \"\$(ticket_file_by_id 901)\" '$wt'
    echo \"FLAG=\$COMMIT_DO_HARNESS\"
  " 2>&1)"
  printf '%s' "$saida" | grep -q "FLAG=1" && ok "o harness commitou pelo agente" || falha "não commitou: $saida"
  [ -z "$(git -C "$wt" --no-optional-locks status --porcelain)" ] \
    && ok "a worktree ficou limpa (nada solto para ser descartado)" || falha "sobrou trabalho não commitado"
  git -C "$wt" log -1 --pretty=%s | grep -q "^wip(901): agente saiu sem commitar$" \
    && ok "mensagem exata do commit" || falha "mensagem errada: $(git -C "$wt" log -1 --pretty=%s)"
  git -C "$wt" log -1 --pretty=%B | grep -q "^Orq-Ticket: 901$" \
    && ok "trailer Orq-Ticket presente" || falha "sem trailer Orq-Ticket"
  # O trabalho agora É medível — era isso que o diff 0 escondia.
  n="$(git -C "$wt" diff "$base"...HEAD --numstat | awk '{s+=$1+$2} END{print s+0}')"
  [ "$n" -ge 2 ] && ok "o diff passou a enxergar o trabalho ($n linhas)" || falha "diff continua cego ($n)"
  # E NÃO é indulto: o arquivo fora da allowlist entrou no commit de propósito,
  # para o enforcement poder reprová-lo. Escondê-lo é que seria o favor indevido.
  git -C "$wt" diff --name-only "$base"...HEAD | grep -q 'src/intruso.ts' \
    && ok "o arquivo fora do escopo foi commitado junto (o enforcement o julga)" \
    || falha "o commit do harness escondeu o arquivo fora do escopo"
  # Árvore limpa => nada a commitar => não inventa commit vazio.
  saida="$(ORQ_EXEC_ROOT="$fx" EXECUTOR_SOURCED=1 bash -c "
    source '$AQUI/executor.sh'; set +e
    commit_do_agente \"\$(ticket_file_by_id 901)\" '$wt'; echo \"FLAG=\$COMMIT_DO_HARNESS\"" 2>&1)"
  printf '%s' "$saida" | grep -q "FLAG=0" && ok "árvore limpa não gera commit vazio" || falha "commitou com árvore limpa"
  git -C "$fx" worktree remove --force "$wt" >/dev/null 2>&1
  rm -rf "$(dirname "$fx")"
fi
# ORDEM: o commit do harness roda ANTES da medição do diff — se rodasse depois,
# o trabalho seria commitado e mesmo assim medido como 0.
l_commit="$(grep -n 'commit_do_agente "\$file" "\$wt"' "$AQUI/executor.sh" | head -1 | cut -d: -f1)"
l_diff="$(grep -n '^  DIFF_LINES=' "$AQUI/executor.sh" | head -1 | cut -d: -f1)"
[ -n "$l_commit" ] && [ -n "$l_diff" ] && [ "$l_commit" -lt "$l_diff" ] \
  && ok "commit_do_agente roda antes de medir o diff" \
  || falha "ordem errada (commit=$l_commit diff=$l_diff)"

echo
echo "== 7 · o juiz é avisado de que o commit foi do harness =="
nota_render="$(printf '%s' '{"id":"901","objetivo":"x","criterios":[],"allowlist":[],"diff":"d","gates":"g","nota":"COMMIT FOI DO HARNESS"}' \
  | "${ORQ_TSX[@]}" "$AQUI/juiz.ts" --run-cli "$MAIN_CHECKOUT" prompt 2>/dev/null)"
printf '%s' "$nota_render" | grep -q "NOTA DO HARNESS SOBRE ESTA TENTATIVA:" \
  && ok "a nota entra no prompt do juiz" || falha "a nota não chegou ao prompt"
sem_nota="$(printf '%s' '{"id":"901","objetivo":"x","criterios":[],"allowlist":[],"diff":"d","gates":"g"}' \
  | "${ORQ_TSX[@]}" "$AQUI/juiz.ts" --run-cli "$MAIN_CHECKOUT" prompt 2>/dev/null)"
printf '%s' "$sem_nota" | grep -q "NOTA DO HARNESS" \
  && falha "prompt sem nota ganhou seção vazia" || ok "sem nota, o prompt sai como antes"

echo
if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
