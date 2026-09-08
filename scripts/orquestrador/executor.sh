#!/usr/bin/env bash
# executor.sh — motor do Orquestrador Autônomo (ORQ-05b).
#
# CASCA FINA por desenho, igual ao enforcement: o bash não decide nem julga.
#   gates    -> gates.ts    (ORQ-04): motor genérico que itera .gates[] na ordem
#   decisão  -> decisao.ts  (ORQ-05a) via decisao-cli.ts: recusa, adiar/reprovar,
#               retry, meta.json, nome da worktree
#   barreira -> enforcement.sh (ORQ-03)
# Nada disso é reimplementado aqui. Se uma regra precisar mudar, muda no TS
# testado, não neste arquivo.
#
# Uso: executor.sh [--id <id> | --ticket <arquivo>] [--dry] [--stub <cmd>]
#   --dry   não chama modelo: o agente vira um stub, mas worktree, enforcement,
#           gates e decisão rodam de verdade.
#   --stub  comando que substitui o `claude` (recebe o prompt em stdin, trabalha
#           dentro da worktree). Usado pela prova e pelos testes.
#   --stub-juiz  idem, para a chamada do JUIZ (passo 7): recebe o prompt do juiz
#           em stdin e imprime o envelope cru. Sem ele, --dry/--stub PULAM o
#           juiz — dry-run não inventa veredito.
#
# NÃO faz merge em staging-auto (ORQ-06) e não tem dev server, Notion nem email.

set -euo pipefail
ORQ_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$ORQ_LIB_DIR/lib.sh"

DRY=0; STUB=""; STUB_JUIZ=""; TICKET=""; TID=""; RECONCILE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --id) TID="$2"; shift ;;
    --ticket) TICKET="$2"; shift ;;
    --dry) DRY=1 ;;
    --stub) STUB="$2"; DRY=1; shift ;;
    --stub-juiz) STUB_JUIZ="$2"; shift ;;
    --reconcile) RECONCILE=1 ;;
    *) die "arg desconhecido: $1" ;;
  esac
  shift
done

decisao() { npx tsx "$ORQ_LIB_DIR/decisao-cli.ts" "$MAIN_CHECKOUT" "$@"; }

# fase <nome> — snapshot E variável lida pelo trap de saída. Duas escritas com um
# nome só: uma fase que só existe no STATUS.md some quando o processo morre, e é
# justamente aí que alguém quer saber em que fase ele estava.
fase() { FASE_EM_CURSO="$1"; status_set "fase=$1"; }

# --- 1 · PREFLIGHT ----------------------------------------------------------
# Tudo aqui é FATAL e roda ANTES de qualquer gasto: divergência aborta o run
# inteiro sem consumir tentativa. Ordem por custo: sintaxe e JSON primeiro,
# identidade depois, sondagem do modelo por último.
preflight() {
  log "preflight: sintaxe, fila, identidade, env$([ "$DRY" != 1 ] && echo ', claude')"
  local s f k
  for s in executor.sh enforcement.sh lib.sh orq-pause.sh; do
    [ -f "$ORQ_LIB_DIR/$s" ] && { bash -n "$ORQ_LIB_DIR/$s" || die "preflight: $s com erro de sintaxe"; }
  done
  jq -e . "$CONFIG" >/dev/null 2>&1 || die "preflight: $CONFIG não é JSON válido"
  for f in $(ticket_files); do
    ticket_json "$f" | jq -e . >/dev/null 2>&1 || die "preflight: bloco json inválido em $(basename "$f")"
  done

  # Árvore de EXECUÇÃO limpa. O checkout principal pode estar sujo à vontade —
  # o guard vale para onde o run acontece.
  local sujo; sujo="$(git -C "$ROOT" --no-optional-locks status --porcelain | head -5)"
  [ -z "$sujo" ] || die "preflight: árvore de execução suja em $ROOT — commite ou stashe antes:
$sujo"
  # Lock de git: só é FATAL se algum processo estiver de fato com o arquivo
  # aberto (via lsof). Sem isso, qualquer lock deixado para tras por um
  # ambiente que nao consegue fazer unlink (ex.: montagem via bridge) trava
  # o loop para sempre, mesmo sem ninguem realmente segurando o lock.
  local locks lk vivos="" orfaos=""
  locks="$(find "$ROOT/.git" -maxdepth 1 -name '*.lock' 2>/dev/null)"
  if [ -n "$locks" ]; then
    while IFS= read -r lk; do
      [ -n "$lk" ] || continue
      if command -v lsof >/dev/null 2>&1; then
        if lsof -- "$lk" >/dev/null 2>&1; then
          vivos="$vivos $lk"
        else
          orfaos="$orfaos $lk"
        fi
      else
        vivos="$vivos $lk"
      fi
    done <<< "$locks"
    [ -z "$vivos" ] || die "preflight: lock de git em uso por outro processo: $vivos"
    if [ -n "$orfaos" ]; then
      log "preflight: removendo lock(s) de git orfao(s), sem processo dono:$orfaos"
      for lk in $orfaos; do
        rm -f "$lk" 2>/dev/null
        # Alguns ambientes (ex.: montagem via bridge) recusam unlink mesmo com
        # permissao de escrita normal; rename costuma funcionar onde rm falha.
        [ -e "$lk" ] && mv -f "$lk" "$lk.orfao.$(date +%s)" 2>/dev/null
        [ -e "$lk" ] && die "preflight: lock orfao nao pode ser removido nem renomeado: $lk"
      done
    fi
  fi

  # Identidade: repo e ambiente certos. CFG_AMBIENTE_ID é o nome deste repo para
  # o campo que o comarka-os chama de supabase_project_id.
  local origin id_repo="?" id_amb="?" url ref
  if [ -n "$CFG_REPO_ORIGIN" ] && [ "$CFG_REPO_ORIGIN" != null ]; then
    origin="$(git -C "$MAIN_CHECKOUT" remote get-url origin 2>/dev/null || true)"
    case "$origin" in
      *"$CFG_REPO_ORIGIN"*) id_repo="${CFG_REPO_ORIGIN##*/}" ;;
      *) die "preflight: repo errado — origin='$origin' não contém '$CFG_REPO_ORIGIN'" ;;
    esac
  fi
  if [ -n "$CFG_AMBIENTE_ID" ] && [ "$CFG_AMBIENTE_ID" != null ]; then
    url="$(env_value SUPABASE_URL)"
    ref="$(printf '%s' "$url" | sed -E 's#^https?://##; s#/.*$##; s#\..*$##')"
    [ "$ref" = "$CFG_AMBIENTE_ID" ] || die "preflight: ambiente errado — esperado $CFG_AMBIENTE_ID, obtido '${ref:-vazio}'"
    id_amb="$ref"
  fi
  log "identidade: repo=$id_repo · ambiente=$id_amb"

  local faltando=""
  while IFS= read -r k; do
    [ -z "$k" ] && continue
    env_key_present "$k" || faltando="$faltando $k"
  done < <(cfg '.preflight_env_keys[]?' 2>/dev/null)
  [ -n "$faltando" ] && die "preflight: env faltando (nem no processo nem em .env.local):$faltando"

  probe_modelos

  # Branch alvo criada da PROTEGIDA (lida do config pelo lib.sh). Sem push.
  ensure_branch_alvo
  log "preflight: ok (alvo=$CFG_BRANCH_ALVO, protegida=$(cfg '.branch_protegida'))"
}

# --- 1b · PROBE DE MODELO (ORQ-07) ------------------------------------------
# Roda ANTES de criar worktree e ANTES de qualquer tentativa. Existe porque o
# `claude` NÃO falha com código de erro em modelo desconhecido: ele responde
# texto e o run termina com diff vazio, que o harness lia como reprovação de
# MÉRITO — queimando os 3 retries em ~75s por um erro de config. Medido no voo
# do ORQ-06 com PENDENTE_TK104.
#
# Fronteira do politica_adiamento aplicada aqui:
#   config errada (papel pendente, id recusado) -> ABORTA (die). Não é
#     transitório: repetir amanhã dá o mesmo resultado.
#   claude mudo/limitado (rede, cota, sessão, timeout) -> ADIA, arma cooldown e
#     sai 0, sem consumir tentativa.
probe_modelos() {
  [ "$(cfg '.preflight_probe')" != "false" ] || { log "probe: desligado no config"; return 0; }

  local papel modelo pendentes=""
  for papel in executor_model avaliador_model retry_final_model; do
    modelo="$(cfg ".$papel")"
    decisao modelo-indefinido "$modelo" >/dev/null 2>&1 && pendentes="$pendentes $papel=$modelo"
  done
  if [ -n "$pendentes" ]; then
    die "preflight: modelo por papel não definido —$pendentes.
Isso é ERRO DE CONFIGURAÇÃO, não falha do ticket: abortando sem criar worktree,
sem chamar modelo e sem consumir tentativa. Desbloqueio: $(cfg '.restricao_execucao.desbloqueio')"
  fi

  [ "$DRY" = 1 ] && { log "probe: dry-run, sondagem pulada"; return 0; }

  # GATE DE ORÇAMENTO antes da sondagem: ela também é uma chamada paga.
  if [ "$(orcamento_veredito '---')" = dia ]; then
    log "probe: teto diário de orçamento atingido — sondagem pulada, nenhuma chamada feita"
    return 0
  fi

  local m out rc=0
  m="$(cfg '.executor_model')"
  out="$(mktemp)"
  # json aqui também: a sondagem custa, e custo não medido é custo que escapa do
  # gate. A detecção de modelo recusado é por TEXTO e sobrevive ao envelope JSON.
  claude_run "$ROOT" "$out" 60 -- -p "responda apenas: ok" --output-format json --model "$m" || rc=$?
  custo_registrar probe '---' 0 "$out"

  # ADIA: rede/sessão/cota/relógio. Não é defeito de nada — o ambiente caiu.
  if is_adiavel "$out" "$rc"; then
    log "probe: claude em limite/timeout na sondagem — adiando (cooldown armado, zero tentativa)"
    cooldown_arm; rm -f "$out"; exit 0
  fi
  # ABORTA: o CLI respondeu, mas recusando o modelo. Config errada.
  if decisao modelo-recusado < "$out" >/dev/null 2>&1; then
    local trecho; trecho="$(grep -iE 'model' "$out" | head -1)"
    rm -f "$out"
    die "preflight: o claude RECUSOU o modelo '$m' — $trecho
Erro de CONFIGURAÇÃO: abortando sem criar worktree e sem consumir tentativa."
  fi
  if [ "$rc" != 0 ]; then
    # "checar login/instalação" era um PALPITE: a saída real do CLI estava no
    # $out e era apagada na linha seguinte, então toda sondagem que falhava
    # produzia a mesma frase, qualquer que fosse a causa. Aqui a saída crua vira
    # evidência em runs/ (nome com timestamp: sondagem que falha duas vezes tem
    # duas causas possíveis, e sobrescrever apagaria a primeira) e o trecho final
    # vai para o log — que é onde alguém lê antes de abrir arquivo nenhum.
    local dest="$RUNS_BASE/probe-falha-$(date -u '+%Y%m%dT%H%M%SZ').txt" trecho
    mkdir -p "$RUNS_BASE" 2>/dev/null || true
    cp "$out" "$dest" 2>/dev/null || true
    trecho="$(tail -c 800 "$out" 2>/dev/null | strip_ansi | tr '\n' ' ' | sed -e 's/  */ /g')"
    rm -f "$out"
    log "probe: claude rc=$rc — saída crua em $dest"
    die "preflight: claude CLI falhou na sondagem (rc=$rc). Saída crua em $dest
${trecho:-(o CLI não escreveu NADA em stdout nem stderr — rc=$rc é tudo o que houve)}"
  fi
  rm -f "$out"
  log "probe: modelo '$m' respondeu ok"
}

# --- 2 · WORKTREE -----------------------------------------------------------
# pacotes_do_checkout — um caminho RELATIVO ao MAIN_CHECKOUT por linha (a raiz
# sai como `.`): todo diretorio que tenha node_modules PROPRIO.
#
# Antes desta funcao (peca K6a) a lista era `for d in "" apps/web services/*/`:
# a arvore do conteudos-infinitos escrita DENTRO do motor. Num monorepo com
# outra forma — packages/, apps/api, libs/ — o motor deixava pacote sem
# node_modules na worktree e o gate reprovava por AMBIENTE, nao por codigo.
#
# `-not -path '*/node_modules/*'` e obrigatorio: sem ele, toda dependencia que
# traz o proprio node_modules viraria "pacote" e a lista teria centenas de
# entradas. `-maxdepth 3` cobre raiz (1), apps/web (2) e services/x (3), que e
# a profundidade real de monorepo npm/pnpm; mais fundo e node_modules aninhado.
#
# `LC_ALL=C sort` NAO e higiene: e o que reproduz, item a item, a ordem que a
# lista fixa produzia para o CI — `.` (0x2E) antes de `apps/web` antes de
# `services/*`, estes em ordem de glob. Ordem decide qual symlink e criado antes
# de qual; "o CI nao faz nada diferente" e afirmacao sobre a saida inteira.
pacotes_do_checkout() {
  local nm rel
  while IFS= read -r nm; do
    [ -n "$nm" ] || continue
    rel="$(dirname "$nm")"
    rel="${rel#"$MAIN_CHECKOUT"}"; rel="${rel#/}"
    printf '%s\n' "${rel:-.}"
  done < <(find "$MAIN_CHECKOUT" -maxdepth 3 -type d -name node_modules \
             -not -path '*/node_modules/*' 2>/dev/null) | LC_ALL=C sort
}

# node_modules e' SYMLINK compartilhado entre todas as worktrees (nao copia).
# O cache de dep-optimization do Vite (node_modules/.vite) fica DENTRO dele: se
# o ticket anterior mudou codigo em apps/web, o cache guarda o grafo de
# dependencias do codigo ANTIGO e o vitest desta worktree falha ao coletar
# (apps/web some do placar por inteiro, nao um teste isolado). Confirmado: medido
# "8 pacotes, 714p" em 5 tickets seguidos = total 9 pacotes (791) menos exatamente
# os 77 testes de apps/web, toda vez. Limpar forca o vite a reotimizar contra o
# codigo ATUAL antes de CADA tentativa — inclusive a que reaproveita a worktree,
# que nao passa por setup_worktree e ficaria com o cache da tentativa anterior.
limpa_cache_vite() {
  local d
  while IFS= read -r d; do
    [ -n "$d" ] || continue
    rm -rf "$MAIN_CHECKOUT/$d/node_modules/.vite" 2>/dev/null || true
  done < <(pacotes_do_checkout)
  return 0
}

# linkar_node_modules <worktree> — um symlink por pacote detectado, apontando
# para o node_modules do checkout PRINCIPAL (nunca copia: sao gigabytes).
# Existe como funcao propria, e nao inline no setup_worktree, porque e ela o
# efeito observavel da deteccao — e o teste precisa poder cobra-la sem montar
# um repositorio git so para exercitar uma lista.
linkar_node_modules() {
  local wt="$1" d origem destino
  while IFS= read -r d; do
    [ -n "$d" ] || continue
    origem="$MAIN_CHECKOUT/$d/node_modules"; destino="$wt/$d/node_modules"
    [ -e "$origem" ] || continue
    mkdir -p "$(dirname "$destino")"
    ln -sfn "$origem" "$destino"
  done < <(pacotes_do_checkout)
  return 0
}

# O NOME vem do decisao.ts (prefixo do config + id sanitizado): ../_worktrees é
# compartilhado com outros repos e o cleanup remove a pasta — colisão de nome
# apagaria trabalho alheio.
setup_worktree() {
  local id="$1" wt="$2" branch
  branch="frente/$id"
  git -C "$ROOT" worktree remove --force "$wt" >/dev/null 2>&1 || true
  git -C "$ROOT" worktree prune >/dev/null 2>&1 || true
  git -C "$ROOT" branch -D "$branch" >/dev/null 2>&1 || true
  git -C "$ROOT" worktree add -b "$branch" "$wt" "$CFG_BRANCH_ALVO" >/dev/null
  # node_modules e .env.local não são versionados e só existem no principal.
  # Linkar só a raiz deixa cada pacote aninhado sem os próprios tipos, e o gate
  # de typecheck daquele pacote reprova com centenas de erros que não são código
  # (medido no CI: ~1700 em apps/web). Quais pacotes existem é DETECTADO
  # (pacotes_do_checkout), não adivinhado por nome de diretório.
  linkar_node_modules "$wt"
  limpa_cache_vite
  # ACHADO em aberto (peça K6/pureza): esta lista continua FIXA. Generalizá-la
  # para os pacotes detectados passaria a linkar .env.local de pacote que hoje
  # não recebe link — mudança de comportamento fora do escopo desta peça.
  local d
  for d in "" apps/web; do
    [ -e "$MAIN_CHECKOUT/${d:+$d/}.env.local" ] && ln -sfn "$MAIN_CHECKOUT/${d:+$d/}.env.local" "$wt/${d:+$d/}.env.local"
  done
  return 0
}

# Apaga SÓ o worktree/branch efêmeros. Nunca toca runs/<id>: a evidência vive no
# checkout principal e sobrevive a reprova.
cleanup_worktree() {
  local id="$1" wt="$2" branch
  branch="frente/$id"
  git -C "$ROOT" worktree remove --force "$wt" >/dev/null 2>&1 || true
  branch_existe "$branch" && git -C "$ROOT" branch -D "$branch" >/dev/null 2>&1 || true
  return 0
}

# --- 3 · PROMPT -------------------------------------------------------------
# tools_do_ticket <arquivo-ticket> -> a string de `--allowedTools` deste ticket.
#
# UMA fonte para as duas bocas (peça 0e-c): é esta string que vai no
# `--allowedTools` da chamada E é dela que sai a lista do bloco "COMO RODAR
# COMANDOS" do prompt. Lista fixa no prompt recriaria, em texto, o desalinhamento
# que a peça 0c matou no código — o agente lendo uma lista e a permissão
# concedendo outra. Quem decide continua sendo o TS testado (`toolsDoTicket`, em
# `perfil.ts`); o bash só transporta.
tools_do_ticket() {
  local file="$1" cmds
  cmds="$(ticket_json "$file" | jq -c '[.criterios_aceite[]?.cmd // empty]')"
  decisao tools "$cmds"
}

build_prompt() {
  local file="$1" motivo="$2" tools="${3:-}" id objetivo allow criterios spec="" lista
  id="$(ticket_field "$file" '.id')"
  objetivo="$(ticket_field "$file" '.objetivo')"
  allow="$(ticket_field "$file" '.pathspec_allowlist | join("\n  - ")')"
  criterios="$(ticket_json "$file" | jq -r '.criterios_aceite[]? |
    if .espera == "avaliador" then "  - \(.descricao)\n      [julgado pelo avaliador — NAO execute]"
    else "  - \(.descricao)\n      cmd:   \(.cmd)\n      espera: \(.espera)" end')"
  # A doutrina do EXECUTOR é o extrato, não a SKILL inteira (regra 18 e
  # custo-e-contexto §2): a SKILL.md é para humanos, juiz de ticket e planejador.
  # Apontar o executor para ela é 23k de contexto que não muda o veredicto e onde
  # ele tem onde se perder.
  [ -f "$MAIN_CHECKOUT/docs/orquestrador/skill/EXECUTOR.md" ] && spec="A doutrina que vale para você está em docs/orquestrador/skill/EXECUTOR.md (leitura, NUNCA escrita). NÃO leia docs/orquestrador/skill/SKILL.md nem docs/orquestrador/skill/references/: não muda o que você tem de fazer e queima contexto."

  # A lista vem da MESMA string que vai em `--allowedTools`, quebrada na vírgula
  # exatamente como o CLI a lê. Sem argumento, deriva — assim nenhum chamador
  # consegue montar um prompt sem a lista, nem com uma lista de outra fonte.
  [ -n "$tools" ] || tools="$(tools_do_ticket "$file")"
  lista="$(printf '%s' "$tools" | tr ',' '\n' | sed 's/^/  - /')"

  cat <<EOF
Você é um engenheiro executando um ticket da fila deste repo de forma autônoma.

TICKET ${id}
Objetivo: ${objetivo}

Só pode tocar arquivos que casem com estes globs (pathspec allowlist):
  - ${allow}

Critérios de aceite (o avaliador vai cobrar exatamente isto):
${criterios}
${spec}

REGRAS INVIOLÁVEIS (o enforcement reprova o diff que violar qualquer uma):
- BANCO: zero escrita. Nenhuma tabela, nenhum ambiente, sem DML e sem DDL, por
  nenhuma via (MCP, supabase-js, psql, script, seed, fixture, teste).
- SQL só como ARQUIVO .sql, e só sob $(cfg '.migrations_dir') ou $(cfg '.sql_pendente_dir').
  Dentro desses arquivos o DDL/DML é o ARTEFATO pedido e é permitido escrever.
  O que NUNCA pode é APLICAR: nada de supabase db push, psql, apply_migration,
  execute_sql, prisma migrate ou MCP de banco em script nenhum. O ticket termina
  com o .sql commitado e a aplicação pendente de humano.
- Zona proibida: $(cfg '.zona_proibida.no_write_paths | join(", ")').
- NUNCA dê git push. NUNCA escreva credencial/segredo, nem em teste ou fixture.
- git add SEMPRE por pathspec explícito (nunca 'git add -A' ou 'git add .').

COMO RODAR COMANDOS
- O cwd da sua sessão JÁ É a raiz da worktree deste ticket. NUNCA prefixe
  comando com 'cd': o caminho que você escreveria não existe do lado de cá, e a
  permissão é dada ao comando, não ao 'cd ... && comando'.
- UM comando por chamada. Nada de '&&' nem de '|' emendando ferramentas
  diferentes: a permissão cobre o comando, e o encadeado não é nenhum deles.
- Os comandos autorizados são EXATAMENTE estes, nesta forma:
${lista}
Qualquer outra coisa é NEGADA pela permissão — e permissão negada não é
obstáculo que se contorna tentando de novo: o muro não se move sozinho. Se o que
você precisa rodar não está na lista, siga sem ele e diga isso no fim.

ENTREGA:
1. Implemente o objetivo respeitando a allowlist.
2. Os gates deste repo, nesta ordem: $(cfg '._execucao_dos_gates.ordem_obrigatoria | join(" -> ")').
3. COMMIT POR CHECKPOINT (obrigatório): $(cfg '.commit_checkpoint.quando').
   $(cfg '.commit_checkpoint._regra')
   Arquivo escrito e não commitado conta como NADA FEITO: o trabalho é medido por
   'git diff' contra a base, e o worktree é descartado ao final.
4. TRAILER, no ÚLTIMO commit do ticket: uma linha sozinha no fim da mensagem,
   exatamente '$(cfg '.executor.trailer_commit'): ${id}'. É por ele que o loop
   acha depois o que este ticket mudou (git log --grep), não pelo log do harness.
${motivo:+
REPROVAÇÃO ANTERIOR (corrija exatamente isto):
${motivo}}
EOF
}

# --- 5 · CRITÉRIOS (veredito mecânico: código verifica, modelo julga) --------
# Devolve, em CRITERIOS_FALHOS, a lista dos que reprovaram. Critério marcado
# 'avaliador' não roda aqui — é julgamento, não comando.
#
# strip_ansi: o vitest 4.x (apps/web) MANTÉM escapes ANSI mesmo com a saída
# redirecionada para arquivo/pipe — a linha do placar chega como
# "Tests \e[22m \e[1m\e[32m90 passed", e um critério 'Tests +[0-9]+ passed'
# nunca casa. Medido: `npx vitest run ... | grep -cE 'Tests +[0-9]+ passed'` dá 0
# enquanto `grep -c passed` dá 2. Os tickets que rodam a suíte da RAIZ (vitest
# 2.x, sem cor) passavam — o recorte era exato. A cegueira é do HARNESS, não do
# critério: limpar aqui torna TODO critério imune a cor, presente e futuro.
# LC_ALL=C obrigatorio: sob locale UTF-8 o sed do macOS usa ordem de COLACAO e
# recusa ranges como [@-_] com "invalid character range" — em C a ordem e a de
# byte. Tres regras: CSI (\e[...m, a cor do vitest), OSC (titulo de terminal,
# \e]0;...\a) e escape simples de um caractere. Texto UTF-8 passa intacto.
strip_ansi() { LC_ALL=C sed -E $'s/\x1b\\[[0-9;:?]*[\x20-\x2f]*[\x40-\x7e]//g; s/\x1b\\][^\x07]*\x07//g; s/\x1b[\x20-\x2f]*[\x30-\x7e]//g'; }
CRITERIOS_FALHOS=""; CRITERIOS_TOTAL=0
run_criterios() {
  local file="$1" wt="$2" rundir="$3" n=0 desc cmd esp out
  CRITERIOS_FALHOS=""; CRITERIOS_TOTAL=0
  while IFS=$'\x1f' read -r desc cmd esp; do
    [ -z "${desc:-}" ] && continue
    [ "$esp" = "avaliador" ] && continue
    n=$((n + 1))
    # BASE_REF = base REAL da branch do ticket: a worktree nasce de branch_alvo
    # (setup_worktree: `worktree add -b frente/<id> <wt> $CFG_BRANCH_ALVO`), lido
    # do config — nunca hardcodado. Critério de ESCOPO NEGATIVO deve usar
    # "$BASE_REF...HEAD" e NUNCA "main...HEAD": o merge-base com a protegida é o
    # ponto onde a branch alvo divergiu, então "main...HEAD" inclui TODO ticket já
    # mergeado na alvo e o gate fica inalcançável — pior a cada ticket aprovado.
    out="$( ( cd "$wt" && export BASE_REF="$CFG_BRANCH_ALVO" NO_COLOR=1 && eval "$cmd" ) 2>&1 | strip_ansi || true )"
    printf '### %s\ncmd: %s\nespera: %s\nsaida: %s\n\n' "$desc" "$cmd" "$esp" "$out" >> "$rundir/criterios.txt"
    if criterio_match "$out" "$esp"; then
      log "  critério ok: $desc"
    else
      log "  critério FALHA: $desc (esperava '$esp')"
      CRITERIOS_FALHOS="${CRITERIOS_FALHOS:+$CRITERIOS_FALHOS; }$desc"
    fi
  # join("\u001f") em vez de @tsv: @tsv ESCAPA barra invertida (dobra \ -> \\),
  # o que corrompe qualquer cmd com regex escapado (ex.: grep -E 'fetch\(') —
  # confirmado reproduzindo o pipeline isolado (ticket 005). join() concatena cru,
  # sem escapar; \x1f (unit separator) evita colisao com conteudo real de campo.
  done < <(ticket_json "$file" | jq -r '.criterios_aceite[]? | [.descricao, .cmd, (.espera|tostring)] | join("\u001f")')
  CRITERIOS_TOTAL="$n"
  log "  critérios avaliados: $n"
}

# --- 7b · UM EVENTO POR PASSAGEM DE GATES (contrato §2) ---------------------
# gate_marca <gates.txt> <nome> -> ok | falha | nao-rodou
# O motor de gates (gates.ts --run-cli) imprime "ok   <nome> ...ms" ou
# "FALHA <nome> ...". Gate que nao aparece NAO rodou: o motor para no primeiro
# que reprova, e "nao rodou" e informacao diferente de "passou".
gate_marca() {
  local f="$1" nome="$2" linha
  linha="$(grep -E "^(ok|FALHA) +$nome( |$)" "$f" 2>/dev/null | head -1 || true)"
  case "$linha" in
    ok*)    echo ok ;;
    FALHA*) echo falha ;;
    *)      echo nao-rodou ;;
  esac
}

# Combina os dois gates de typecheck deste repo (root e web) numa marca so:
# falha de qualquer um e falha do typecheck.
typecheck_marca() {
  local f="$1" r w
  r="$(gate_marca "$f" typecheck_root)"; w="$(gate_marca "$f" typecheck_web)"
  case "$r/$w" in
    *falha*) echo falha ;;
    ok/ok)   echo ok ;;
    *)       echo nao-rodou ;;
  esac
}

# event_gate <id> <rundir> <enf_ok>
# fora_do_pathspec= so entra quando o ENFORCEMENT reprova: e o dado que
# transforma um beco sem saida em ticket acionavel (colisao de teste na SKILL).
event_gate() {
  local id="$1" rundir="$2" enf_ok="$3" gt="$2/gates.txt" fora="" n_falhos=0
  [ -z "$CRITERIOS_FALHOS" ] || n_falhos="$(printf '%s' "$CRITERIOS_FALHOS" | awk -F';' '{print NF}')"
  if [ "$enf_ok" = 0 ] && [ -s "$rundir/enforcement.json" ]; then
    fora="$(jq -r '[.violations[]? | select(.tipo == "fora_do_pathspec") | .detalhe] | join(",")' \
      "$rundir/enforcement.json" 2>/dev/null || true)"
  fi
  event "$id" GATE \
    "typecheck=$(typecheck_marca "$gt")" \
    "testes=$(gate_marca "$gt" testes_por_pacote)" \
    "enforcement=$([ "$enf_ok" = 1 ] && echo ok || echo falha)" \
    "criterios=$(( CRITERIOS_TOTAL - n_falhos ))/$CRITERIOS_TOTAL" \
    "build=$(gate_marca "$gt" build)" \
    ${fora:+"fora_do_pathspec=$fora"}
}

# --- 7c · JUIZ DE DIFF (passo 7 do pipeline) --------------------------------
# O ÚNICO passo que custa modelo depois do agente, e por isso o ÚLTIMO: roda só
# com enforcement, typecheck, testes, critérios e build TODOS verdes e com o
# diff dentro do cap (fail-fast por custo, regra 6). Diff caro de julgar que já
# reprovou mecanicamente não vale um julgamento.
#
# INDEPENDÊNCIA (custo-e-contexto §7): a entrada é diff cru + gates.txt +
# critérios do ticket. Nunca o prompt do executor (que está no mesmo rundir e
# NÃO entra aqui), nunca o stdout do agente. Sem ferramenta nenhuma
# (--allowedTools "" + instrução explícita no prompt) e --max-turns 1: o juiz
# lê o que recebeu e responde, não investiga.
JUIZ_ROU=0; JUIZ_APROVADO=""; JUIZ_MOTIVO=""; JUIZ_FALHOS=""; JUIZ_ILEGIVEL=0
juiz() { npx tsx "$ORQ_LIB_DIR/juiz.ts" --run-cli "$MAIN_CHECKOUT" "$@"; }

run_juiz() {
  local file="$1" wt="$2" rundir="$3" base="$4" attempt="$5"
  local id nivel modelo classe prompt raw rc=0 vd prc=0 arquivos
  JUIZ_ROU=0; JUIZ_APROVADO=""; JUIZ_MOTIVO=""; JUIZ_FALHOS=""; JUIZ_ILEGIVEL=0
  id="$(ticket_field "$file" '.id')"

  # Nível pela classe de risco (custo-e-contexto §7): paths do DIFF (não os da
  # allowlist — o que importa é onde o agente mexeu), palavra do objetivo,
  # tamanho do diff, e sempre alto no retry final.
  arquivos="$(git -C "$wt" diff --name-only "$base"...HEAD | jq -Rn '[inputs | select(length>0)]')"
  nivel="$(jq -n --argjson a "$arquivos" --arg o "$(ticket_field "$file" '.objetivo')" \
      --argjson d "$DIFF_LINES" \
      --argjson rf "$([ "$attempt" -ge "$CFG_MAX_RETRIES" ] && echo true || echo false)" \
      '{arquivos:$a, objetivo:$o, diffLines:$d, retryFinal:$rf}' | juiz nivel)"
  modelo="$(printf '%s' "$nivel" | jq -r '.modelo')"
  classe="$(printf '%s' "$nivel" | jq -r '.classe')"

  prompt="$rundir/juiz.prompt.txt"; raw="$rundir/juiz.raw.json"
  jq -n --arg id "$id" --arg o "$(ticket_field "$file" '.objetivo')" \
      --argjson c "$(ticket_json "$file" | jq '[.criterios_aceite[]? | {tipo, descricao, cmd, espera: (.espera|tostring)}]')" \
      --argjson al "$(ticket_json "$file" | jq '.pathspec_allowlist // []')" \
      --arg diff "$(git -C "$wt" diff "$base"...HEAD)" \
      --arg gates "$(cat "$rundir/gates.txt" 2>/dev/null || true)" \
      --arg nota "$([ "${COMMIT_DO_HARNESS:-0}" = 1 ] && printf '%s' \
        'O agente saiu sem commitar e o COMMIT DESTE DIFF FOI DADO PELO HARNESS (wip). O trabalho pode estar num ponto intermediário e a mensagem de commit não é do agente — julgue o diff, não o commit.')" \
      '{id:$id, objetivo:$o, criterios:$c, allowlist:$al, diff:$diff, gates:$gates, nota:$nota}' \
    | juiz prompt > "$prompt"

  fase juiz
  log "  juiz: risco $classe ($(printf '%s' "$nivel" | jq -r '.motivo')) · modelo $modelo"
  if [ -n "$STUB_JUIZ" ]; then
    ( cd "$wt" && eval "$STUB_JUIZ" ) < "$prompt" > "$raw" 2>&1 || rc=$?
  elif [ "$DRY" = 1 ]; then
    log "  juiz: dry-run sem --stub-juiz — PULADO (dry-run não inventa veredito)"
    return 0
  else
    claude_run "$wt" "$raw" "$(cfg '.claude_timeout_secs')" -- \
      -p "$(cat "$prompt")" --output-format json --model "$modelo" \
      --allowedTools "" --max-turns 1 || rc=$?
    custo_registrar juiz "$id" "$attempt" "$raw"
  fi
  JUIZ_ROU=1

  # Veredito ILEGÍVEL = ADIADO, nunca reprovado (armadilha do parser na SKILL).
  # Chamada que caiu em limite/timeout cai aqui pelo mesmo caminho: nos dois
  # casos não houve julgamento do TRABALHO, e o remédio é o mesmo — devolver o
  # ticket sem consumir tentativa. O CRU fica em juiz.raw.json justamente para
  # que a auditoria depois não dependa do parser.
  vd="$(juiz parse < "$raw" 2>/dev/null)" || prc=$?
  if [ "$prc" != 0 ] || [ -z "$vd" ]; then
    JUIZ_ILEGIVEL=1
    log "  juiz: veredito ILEGÍVEL (rc chamada=$rc) — ADIADO, cru preservado em $raw"
    event "$id" JUIZ "veredito=ilegivel" "classe=$classe" "modelo=$modelo" "attempt=$((attempt + 1))"
    return 0
  fi
  JUIZ_APROVADO="$(printf '%s' "$vd" | jq -r '.aprovado')"
  JUIZ_MOTIVO="$(printf '%s' "$vd" | jq -r '.motivo')"
  JUIZ_FALHOS="$(printf '%s' "$vd" | jq -r '.criterios_falhos[]?' | paste -sd';' - | sed 's/;/; /g')"
  printf '%s\n' "$vd" > "$rundir/juiz.veredito.json"
  log "  juiz: $([ "$JUIZ_APROVADO" = true ] && echo APROVADO || echo REPROVADO) — $JUIZ_MOTIVO"
  event "$id" JUIZ "veredito=$([ "$JUIZ_APROVADO" = true ] && echo aprovado || echo reprovado)" \
    "classe=$classe" "modelo=$modelo" "attempt=$((attempt + 1))"
  return 0
}

# --- 2b · SLOT DE EVIDÊNCIA (peça 0b) ---------------------------------------
# slot_base_attempt <id> -> o primeiro índice de `attempt-N` LIVRE em runs/<id>.
#
# O bug que isto fecha: `drive_ticket` recomeça `attempt=0` a CADA drenagem — o
# contador é de retry, e retry é por rodada. O diretório de evidência era nomeado
# pelo mesmo número, então o requeue de um ticket que já tinha attempt-0..2
# escrevia por cima do attempt-0. Medido em runs/227 (2026-09-04 20:15): o
# `prompt.txt` e o `claude.txt` da primeira tentativa — a que produziu o diff de
# 178 linhas e a reprovação LEGÍTIMA do juiz — foram destruídos, e o que sobrou
# foi um diretório meio de hoje (prompt, saída do agente) e meio de ontem
# (gates, critérios, veredito, evidência do juiz). Evidência sobrescrita não é
# evidência: ninguém consegue dizer depois de qual rodada é cada arquivo.
#
# A numeração continua de onde parou, não reinicia e não ganha sufixo: um ticket
# tem UMA sequência de tentativas em disco, monotônica, e `meta.json` guarda o
# `dir` de cada registro para amarrar contador de retry a diretório.
slot_base_attempt() {
  local id="$1" d n max=-1
  for d in "$RUNS_BASE/$id"/attempt-*; do
    [ -d "$d" ] || continue
    n="${d##*/attempt-}"
    case "$n" in ''|*[!0-9]*) continue ;; esac
    [ "$n" -gt "$max" ] && max="$n"
  done
  echo $((max + 1))
}

# --- 7f · PERMISSÃO NEGADA AO AGENTE (peça 0c) ------------------------------
# permissoes_negadas <arquivo-de-saida-do-agente> -> preenche PERMISSOES_NEGADAS
#
# O envelope traz `permission_denials[]` e o harness ignorava o campo inteiro. No
# 227 eram TRÊS, todas `npm run typecheck`, e nada disso aparecia no log nem no
# diagnóstico do retry: do lado de fora, a tentativa parecia simplesmente ter
# rendido pouco. Permissão negada é a única falha em que repetir a tentativa é
# garantidamente inútil — o muro não se move sozinho.
PERMISSOES_NEGADAS='[]'
permissoes_negadas() {
  local saida="$1" file="${2:-}" n
  PERMISSOES_NEGADAS='[]'
  [ -s "$saida" ] || return 0
  PERMISSOES_NEGADAS="$(jq -s -c '
      map(select(type == "object")) | last // {}
      | [.permission_denials[]? | (.tool_input.command // .tool_name // empty)]
    ' "$saida" 2>/dev/null || echo '[]')"
  [ -n "$PERMISSOES_NEGADAS" ] || PERMISSOES_NEGADAS='[]'
  n="$(printf '%s' "$PERMISSOES_NEGADAS" | jq -r 'length' 2>/dev/null || echo 0)"
  [ "$n" -gt 0 ] || return 0
  log "  permissão NEGADA $n vez(es) ao agente: $(printf '%s' "$PERMISSOES_NEGADAS" | jq -r 'unique | join(" | ")')"
  # ESCAPA e SÓ ENTÃO trunca (peça 0e-a). `cut -c1-160` é orientado a LINHA: num
  # comando multi-linha ele corta CADA linha em 160 e mantém todas — foi assim
  # que o heredoc Python inteiro do 234 foi parar nas linhas 254-259 da trilha
  # (evento de 2026-09-05 13:31:45). Com o `\n` já escapado, o corte vale para o
  # comando inteiro, que é o que "160 caracteres de comando" sempre quis dizer.
  local cmds
  cmds="$(uma_linha "$(printf '%s' "$PERMISSOES_NEGADAS" | jq -r 'unique | join(" | ")')" 160)"
  [ -n "$file" ] && event "$(ticket_field "$file" '.id')" PERMISSAO_NEGADA "n=$n" "cmds=$cmds"
  return 0
}

# --- 7e · O COMMIT QUE O AGENTE NÃO DEU (peça 0b) ---------------------------
# commit_do_agente <arquivo-ticket> <worktree>
#
# O prompt manda commitar por checkpoint e avisa que arquivo não commitado conta
# como NADA FEITO. Isso é verdade sobre a MEDIÇÃO — `git diff base...HEAD` não vê
# árvore suja — mas nunca foi uma boa razão para JOGAR FORA o trabalho. Medido em
# runs/227 (requeue de 2026-09-04 20:15): o agente gastou 22 turnos e US$ 0,52,
# escreveu 150 linhas em três arquivos, abortou sem commitar, e a worktree ia ser
# removida com tudo dentro. O que se perde aí não é uma tentativa: é a única
# cópia do trabalho.
#
# Então o harness commita por ele e SEGUE o pipeline normal — enforcement, gates,
# critérios, juiz. Não é indulto: o commit só torna o trabalho VISÍVEL para a
# barreira, que continua reprovando o que sair da allowlist ou tocar zona
# proibida. Antes, um agente que escrevia fora do escopo e não commitava passava
# batido com diff 0; agora ele é julgado.
#
# `git add -A` aqui, e SÓ aqui: a doutrina proíbe isso ao AGENTE, cujo `add` não
# passa por barreira nenhuma antes do commit. O do harness passa — o enforcement
# roda logo depois e vê exatamente o que foi commitado. Restringir a add por
# allowlist esconderia do enforcement justamente o arquivo fora do escopo que ele
# existe para pegar.
COMMIT_DO_HARNESS=0
commit_do_agente() {
  local file="$1" wt="$2" id em nm
  COMMIT_DO_HARNESS=0
  [ -n "$(git -C "$wt" --no-optional-locks status --porcelain 2>/dev/null)" ] || return 0
  id="$(ticket_field "$file" '.id')"
  # Identidade só é forçada quando NÃO há uma configurada: sobrescrever a do
  # repo faria todo commit de checkpoint do loop mudar de autor.
  em="$(git -C "$wt" config user.email 2>/dev/null || true)"; [ -n "$em" ] || em="orquestrador@local"
  nm="$(git -C "$wt" config user.name  2>/dev/null || true)"; [ -n "$nm" ] || nm="orquestrador"
  if git -C "$wt" add -A >/dev/null 2>&1 &&
     git -C "$wt" -c user.email="$em" -c user.name="$nm" commit -q \
       -m "wip($id): agente saiu sem commitar" \
       -m "$(cfg '.executor.trailer_commit'): $id" >/dev/null 2>&1; then
    COMMIT_DO_HARNESS=1
    log "  commit do harness: o agente saiu sem commitar — trabalho commitado como wip($id) e julgado normalmente"
    event "$id" COMMIT_HARNESS "motivo=agente-saiu-sem-commitar"
  else
    log "  commit do harness: FALHOU — o trabalho não commitado fica de fora do diff"
  fi
  return 0
}

# --- 7d · O PATCH DA TENTATIVA (evidência) ----------------------------------
# grava_diff_patch <worktree> <base> <rundir>
# Roda logo depois do agente e ANTES de qualquer descarte de worktree. Sem ele a
# evidência de uma tentativa reprovada era só o NÚMERO de linhas no meta.json —
# e "diffLines: 0" não distingue "o agente não fez nada" de "a worktree nasceu
# vazia" (runs/227: tentativas 2 e 3 com diff 0 em 15s e 3s). Com o patch em mão
# a diferença se lê no arquivo.
grava_diff_patch() {
  local wt="$1" base="$2" rundir="$3"
  mkdir -p "$rundir"
  git -C "$wt" diff "$base"...HEAD > "$rundir/diff.patch" 2>/dev/null || : > "$rundir/diff.patch"
  return 0
}

# --- 8 · UMA TENTATIVA ------------------------------------------------------
# Ordem fixa: agente -> diff -> enforcement -> gates -> critérios -> decisão.
# Enforcement ANTES dos gates de propósito: diff que sai do escopo ou toca zona
# proibida não merece 20s de suíte.
# `$7` (base_fixo) é a BASE DO TICKET, não o HEAD desta tentativa: com retry na
# mesma worktree o HEAD de entrada já carrega o commit da tentativa anterior, e
# medir contra ele faria o diff, o enforcement e o juiz enxergarem só a correção
# — nunca o trabalho inteiro que vai ser mergeado. Vazio = comportamento antigo
# (HEAD atual), que é o certo quando a worktree acabou de nascer.
RESULT=""; MOTIVO=""; DIFF_LINES=0; DUR=0; ENF_OK=1
run_attempt() {
  local file="$1" wt="$2" rundir="$3" modelo="$4" motivo_anterior="$5" attempt="${6:-0}" base_fixo="${7:-}"
  local prompt saida rc=0 t0 base sinal veredito tools
  mkdir -p "$rundir"
  prompt="$rundir/prompt.txt"; saida="$rundir/claude.txt"
  # DERIVADA UMA VEZ, usada nas duas bocas (peça 0e-c): o bloco "COMO RODAR
  # COMANDOS" do prompt e o `--allowedTools` da chamada. Duas derivações seriam
  # duas listas, e o dia em que divergissem seria o dia em que o agente gastaria
  # turno contra a própria permissão de novo.
  tools="$(tools_do_ticket "$file")"
  build_prompt "$file" "$motivo_anterior" "$tools" > "$prompt"
  base="${base_fixo:-$(git -C "$wt" rev-parse HEAD)}"

  t0="$(date +%s)"
  if [ -n "$STUB" ]; then
    log "  agente: STUB ($STUB)"
    ( cd "$wt" && eval "$STUB" ) < "$prompt" > "$saida" 2>&1 || rc=$?
  elif [ "$DRY" = 1 ]; then
    log "  agente: dry-run (nenhum modelo chamado)"; : > "$saida"
  else
    # ALLOWLIST DERIVADA DO TICKET (peça 0c): os `cmd` dos critérios entram junto
    # com os dos gates — `$tools`, derivada lá em cima e já impressa no prompt.
    # Permissão que não cobre o que o ticket manda rodar é um beco: o agente do
    # 227 levou 3 negativas em `npm run typecheck` e saiu sem commitar.
    local turns
    # --max-turns REAL: `claude_max_turns` estava no config e ninguém passava a
    # flag (só o juiz, com 1). Config que ninguém lê é pior que config ausente —
    # dá a impressão de teto onde não há nenhum.
    turns="$(cfg '.claude_max_turns')"
    case "$turns" in ''|null|*[!0-9]*) turns=40 ;; esac
    fase agente
    log "  agente: claude -p --model $modelo (--max-turns $turns)"
    # Saída em JSON: é a ÚNICA forma de ter usage real para o gate de orçamento
    # (regra 17). O diff continua vindo do git, não do stdout — o que o agente
    # diz que fez nunca foi entrada de nada aqui.
    claude_run "$wt" "$saida" "$(cfg '.claude_timeout_secs')" -- \
      -p "$(cat "$prompt")" --output-format json --model "$modelo" \
      --max-turns "$turns" --allowedTools "$tools" || rc=$?
    custo_registrar executor "$(ticket_field "$file" '.id')" "$attempt" "$saida"
  fi
  DUR=$(( $(date +%s) - t0 ))
  fase pos-agente
  permissoes_negadas "$saida" "$file"
  commit_do_agente "$file" "$wt"
  DIFF_LINES="$(git -C "$wt" diff "$base"...HEAD --numstat | awk '{s+=$1+$2} END{print s+0}')"
  log "  diff: $DIFF_LINES linha(s) em $DUR s"
  # ANTES do enforcement e de qualquer descarte: o patch é evidência, e evidência
  # que só existe quando o desfecho é bom não serve para diagnosticar o ruim.
  grava_diff_patch "$wt" "$base" "$rundir"

  # 6 · enforcement sobre o diff (ORQ-03)
  # ENF_OK é GLOBAL (não `local`): é ele que o drive_ticket lê para decidir se a
  # próxima tentativa reaproveita esta worktree ou nasce limpa.
  ENF_OK=1
  fase enforcement
  if ! "$ORQ_LIB_DIR/enforcement.sh" --worktree "$wt" --ticket "$file" --base "$base" \
        --out "$rundir/enforcement.json" >/dev/null 2>&1; then
    ENF_OK=0
    log "  enforcement: VIOLAÇÃO (ver $rundir/enforcement.json)"
  else
    log "  enforcement: ok"
  fi

  # 7 · gates pelo motor genérico (ORQ-04). NUNCA npm run test:web cru: o npm não
  # propaga a flag de exclusão e o E2E que escreve no Supabase voltaria ao gate.
  local gates_rc=0
  fase gates
  npx tsx "$ORQ_LIB_DIR/gates.ts" --run-cli "$wt" > "$rundir/gates.txt" 2>&1 || gates_rc=$?
  log "  gates: $([ "$gates_rc" = 0 ] && echo APROVADO || echo "REPROVADO (rc=$gates_rc)")"
  grep -qi 'reexecutar' "$rundir/gates.txt" && log "  gates: interrompidos — conjunto não vale parcialmente"

  fase critérios
  run_criterios "$file" "$wt" "$rundir"
  event_gate "$(ticket_field "$file" '.id')" "$rundir" "$ENF_OK"

  # 7c · JUIZ — só com TODO o mecânico verde e o diff dentro do cap. Julgar um
  # diff que já reprovou é gasto sem hipótese: o remédio dele não é opinião.
  JUIZ_ROU=0; JUIZ_APROVADO=""; JUIZ_MOTIVO=""; JUIZ_FALHOS=""; JUIZ_ILEGIVEL=0
  if [ "$ENF_OK" = 1 ] && [ "$gates_rc" = 0 ] && [ -z "$CRITERIOS_FALHOS" ] \
     && [ "$DIFF_LINES" -le "$CFG_DIFF_CAP" ]; then
    run_juiz "$file" "$wt" "$rundir" "$base" "$attempt"
  else
    log "  juiz: pulado — gate mecânico já reprovou (fail-fast por custo)"
  fi

  # 8 · decisão — toda no decisao.ts
  # ORQ-11: enforcement vai em CAMPO PRÓPRIO, não mais empurrado para dentro de
  # criteriosFalhos. Como critério, ele virava causa criterio_qualidade e ESCALAVA
  # o modelo — e violação de fronteira não é falha de capacidade. Gate reprovado
  # segue como critério: aí a falha é de qualidade mesmo.
  sinal="$(jq -n --argjson e "${rc:-0}" --arg s "$(tail -c 4000 "$saida" 2>/dev/null || true)" \
    --argjson d "$DIFF_LINES" --argjson gi "$(grep -qi 'reexecutar' "$rundir/gates.txt" && echo true || echo false)" \
    --argjson enf "$([ "$ENF_OK" = 0 ] && echo true || echo false)" \
    --argjson cf "$(printf '%s' "$CRITERIOS_FALHOS" | jq -Rn '[inputs | select(length>0)]')" \
    '{exitCode:$e, saida:$s, diffLines:$d, gateInterrompido:$gi, enforcementViolado:$enf, criteriosFalhos:$cf}')"
  if [ "$gates_rc" != 0 ]; then
    sinal="$(printf '%s' "$sinal" | jq '.criteriosFalhos += ["gates reprovados"]')"
  fi
  # Juiz ilegível ADIA (campo próprio, lido pelo decisao.ts antes de qualquer
  # causa de mérito); juiz que REPROVOU entra pelo mesmo caminho dos gates —
  # criteriosFalhos —, levando motivo e criterios_falhos para o diagnóstico.
  if [ "$JUIZ_ILEGIVEL" = 1 ]; then
    sinal="$(printf '%s' "$sinal" | jq '.juizIlegivel = true')"
  elif [ "$JUIZ_ROU" = 1 ] && [ "$JUIZ_APROVADO" = false ]; then
    sinal="$(printf '%s' "$sinal" | jq --arg m "juiz: $JUIZ_MOTIVO" \
      --argjson jf "$(jq -c '.criterios_falhos // []' "$rundir/juiz.veredito.json" 2>/dev/null || echo '[]')" \
      '.criteriosFalhos += ([$m] + $jf)')"
  fi
  veredito="$(printf '%s' "$sinal" | decisao desfecho)"
  RESULT="$(printf '%s' "$veredito" | jq -r '.desfecho')"
  MOTIVO="$(printf '%s' "$veredito" | jq -r '.motivo')"
  printf '%s\n' "$veredito" > "$rundir/veredito.json"
  log "  desfecho: $RESULT — $MOTIVO"
}

# --- 8c · REFATIAR (regra 19) e DIAGNÓSTICO ESTRUTURADO (§6) ----------------
# arquivos_do_refatiar <rundir> — a lista que vai para notas_status, para o
# evento e para a decisão pendente. Sem ela a linha em decisoes-pendentes.md
# diria "a allowlist não cobre alguma coisa", que não é acionável.
arquivos_do_refatiar() {
  local rundir="$1" fora=""
  if [ -s "$rundir/enforcement.json" ]; then
    fora="$(jq -r '[.violations[]? | .detalhe] | join(", ")' "$rundir/enforcement.json" 2>/dev/null || true)"
  fi
  printf '%s' "${fora:-diff de $DIFF_LINES linhas acima do cap de $CFG_DIFF_CAP}"
}

# marca_refatiar <arquivo-ticket> <rundir> <token-da-causa>
# NÃO consome retry, NÃO recebe retry. `origem: humano` (toda a fila hoje) gera
# a linha em decisoes-pendentes.md, porque a pergunta — ampliar a allowlist ou
# fatiar o ticket? — é de produto, não de máquina. `origem: planejador` não gera:
# o motivo entra no context pack do próximo lote da frente (autoalimentacao §1).
marca_refatiar() {
  local file="$1" rundir="$2" tok="$3" id origem arquivos
  id="$(ticket_field "$file" '.id')"
  origem="$(ticket_field "$file" '.origem // "humano"')"
  arquivos="$(arquivos_do_refatiar "$rundir")"
  ticket_set_status "$file" "refatiar"
  ticket_set_nota "$file" "refatiar ($tok): $arquivos — não consome tentativa; resolver ampliando a allowlist ou fatiando o ticket"
  ticket_commit "$file" "fila: $id refatiar"
  event "$id" REFATIAR "motivo=$tok" "arquivos=$arquivos"
  if [ "$origem" = humano ]; then
    decisao_pendente humano-executor "$id" \
      "allowlist não cobre $arquivos: ampliar ou fatiar?" \
      "$MOTIVO (evidência em $rundir)"
  else
    log "  refatiar de origem '$origem': volta ao planejador, sem decisão pendente"
  fi
  status_set "estado=ocioso" "ultimo=$id REFATIAR $(date '+%H:%M:%S') (${DUR}s)" "motivo=refatiar: $tok"
  log "REFATIAR: $MOTIVO"
}

# diagnostico_retry <arquivo-ticket> <rundir> — o JSON de <=500 tokens que vira
# o `motivo` do retry (custo-e-contexto §6). Falha do diagnóstico não pode custar
# o retry: sem JSON, cai no texto livre de antes.
diagnostico_retry() {
  local file="$1" rundir="$2" d
  d="$(jq -n --argjson al "$(ticket_json "$file" | jq '.pathspec_allowlist // []')" \
        --argjson cf "$(printf '%s' "$CRITERIOS_FALHOS" | jq -Rn '[inputs | select(length>0) | split("; ")[]]')" \
        --argjson pn "${PERMISSOES_NEGADAS:-[]}" \
        '{allowlist:$al, criteriosFalhos:$cf, permissoesNegadas:$pn}' \
      | npx tsx "$ORQ_LIB_DIR/diagnostico.ts" --run-cli "$rundir" 2>/dev/null || true)"
  if [ -z "$d" ]; then
    log "  diagnóstico: não consegui montar o JSON — retry segue com o motivo em texto"
    printf '%s' "$MOTIVO"
    return 0
  fi
  printf '%s' "$d"
}

# --- 9 · TELEMETRIA ---------------------------------------------------------
grava_meta() {
  local rundir="$1" attempt="$2" modelo="$3" registro metaf="$1/../meta.json"
  # `dir` é o que amarra o contador de retry (que reinicia por drenagem) ao
  # diretório de evidência (que é contínuo por ticket). Sem ele, dois registros
  # com `attempt: 0` de rodadas diferentes são indistinguíveis no meta.json — e
  # foi assim que o requeue do 227 passou despercebido até a worktree aparecer.
  registro="$(jq -n --argjson a "$attempt" --arg m "$modelo" --argjson d "$DUR" \
    --argjson dl "$DIFF_LINES" --arg r "$RESULT" --arg ts "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
    '{attempt:$a, modelo:$m, duracaoSecs:$d, diffLines:$dl, resultado:$r, ts:$ts}' | decisao meta)"
  registro="$(printf '%s' "$registro" | jq -c --arg dir "$(basename "$rundir")" \
    --argjson ch "$([ "${COMMIT_DO_HARNESS:-0}" = 1 ] && echo true || echo false)" \
    '. + {dir:$dir, commitDoHarness:$ch}')"
  metaf="$(dirname "$rundir")/meta.json"
  [ -s "$metaf" ] || echo '[]' > "$metaf"
  jq --argjson r "$registro" '. + [$r]' "$metaf" > "$metaf.tmp" && mv "$metaf.tmp" "$metaf"
}

# --- 8b · DIRIGE O TICKET COM RETRIES ---------------------------------------
# NUMERAÇÃO DE TENTATIVA — uma conta só, dois formatos, de propósito:
#   `$attempt`            0-based. Nomeia o diretório de evidência (attempt-0,
#                         attempt-1, ...) e o campo `attempt` do meta.json e do
#                         custo.json. NÃO muda: renomear diretório invalidaria
#                         evidência já gravada de tickets antigos.
#   trilha e STATUS       1-BASED. A primeira tentativa é `attempt=1`, tanto no
#                         events.log quanto no "tentativa 1/3" do snapshot — que
#                         já era 1-based e era o único que era.
# Mapeamento: `attempt=N` na trilha  <->  `runs/<id>/attempt-$((N-1))/`.
# `orq ticket` imprime os dois lado a lado, que é onde um humano lê junto.
# O evento RETRY anuncia a PRÓXIMA tentativa, então sai `attempt + 2`.
#
# Por que unificar: "aprovação de primeira" (custo-e-contexto §11) é contada da
# trilha como APROVADO com attempt=1. Com a trilha 0-based e o STATUS 1-based,
# a mesma tentativa tinha dois números e a métrica dependia de qual dos dois
# quem contasse tivesse lido.
#
# RETRY NA MESMA WORKTREE (peça 0) — `$reusar`:
#   enforcement da tentativa anterior PASSOU  -> a worktree e o commit ficam de
#     pé, e a tentativa seguinte começa com o diff anterior aplicado. É o que
#     torna VERDADEIRO o "corrija exatamente isto" do prompt de retry: sem isso o
#     diagnóstico apontava linhas de um trabalho que não existia mais na árvore.
#   enforcement REPROVOU (ou é a primeira tentativa) -> worktree NOVA. Diff que
#     saiu do escopo ou tocou zona proibida não é base para corrigir em cima: o
#     que se quer é justamente que aquele diff desapareça.
# Medido em runs/227: tentativa 1 reprovada pelo juiz com 178 linhas, tentativas
# 2 e 3 com diff 0 em 15s e 3s — o agente abria uma worktree vazia, não achava o
# que o diagnóstico mandava corrigir e devolvia nada.
#
# `$base_ticket` acompanha a worktree, não a tentativa: é o commit de onde a
# worktree nasceu. Reaproveitando, diff, enforcement e juiz continuam medindo o
# TRABALHO INTEIRO contra a branch alvo — nunca só a correção da vez.
drive_ticket() {
  local file="$1" id slug wt nome modelo attempt=0 plano rundir orc
  # TENTATIVA 1 DE UMA DRENAGEM NUNCA HERDA NADA (peça 0b). `reusar` e
  # `base_ticket` nascem zerados a cada chamada, e `slot` é lido do disco: o que
  # sobrou de uma rodada anterior — attempt-N antigos, worktree órfã — não pode
  # virar ponto de partida nem destino de escrita. Reaproveitar worktree é
  # decisão TOMADA DENTRO deste laço, entre um retry e o seguinte, e só ali.
  local reusar=0 base_ticket="" slot
  id="$(ticket_field "$file" '.id')"
  slug="$(ticket_field "$file" '.slug')"

  # 5 · restrição de execução ANTES de worktree e de qualquer gasto.
  local rec rc=0
  rec="$(decisao restricao "$slug")" || rc=$?
  if [ "$rc" != 0 ]; then
    log "RECUSADO ($rc): $(printf '%s' "$rec" | jq -r '.mensagem')"
    ticket_set_nota "$file" "recusado: $(printf '%s' "$rec" | jq -r '.motivo')"
    ticket_commit "$file" "fila: $id recusado"
    DESFECHO_NOMEADO=1; exit "$rc"
  fi

  nome="$(decisao worktree "$id")"
  wt="$WORKTREES_BASE/$nome"
  modelo="$(cfg '.executor_model')"
  TICKET_EM_CURSO="$id"
  slot="$(slot_base_attempt "$id")"
  log "ticket $id ($slug) · worktree $nome · modelo $modelo · evidência a partir de attempt-$slot"
  [ "$slot" = 0 ] || log "  runs/$id já tem $slot tentativa(s) de rodada anterior — a numeração continua, nada é sobrescrito"

  while :; do
    # GATE DE ORÇAMENTO, antes da worktree e de qualquer gasto (fail-fast por
    # custo, regra 6). Estourou = ADIADO, nunca "termina só este".
    orc="$(orcamento_veredito "$id")"
    if [ "$orc" != ok ]; then
      mark_adiado_orcamento "$file" "$orc"
      status_set "estado=ocioso" "fase=—" "ticket=—" "motivo=orcamento"
      DESFECHO_NOMEADO=1; return 0
    fi

    # NUMERAÇÃO — leia junto com o comentário de `drive_ticket`:
    #   `$attempt` é o índice 0-based, e é ele que nomeia o DIRETÓRIO;
    #   a trilha e o STATUS contam 1-based (`$((attempt + 1))`).
    # O diretório é nomeado pelo SLOT (contínuo por ticket), não pelo contador de
    # retry (que reinicia a cada drenagem). Sem isso o requeue sobrescreve a
    # evidência da rodada anterior — foi o que aconteceu com runs/227.
    rundir="$RUNS_BASE/$id/attempt-$((slot + attempt))"
    mkdir -p "$rundir"
    if [ "$reusar" = 1 ] && [ -e "$wt/.git" ]; then
      log "  worktree REAPROVEITADA de attempt-$((attempt - 1)) (enforcement passou): commit anterior presente, base $(printf '%.8s' "$base_ticket")"
      event "$id" WORKTREE "modo=reaproveitada" "de=attempt-$((attempt - 1))" "base=$(printf '%.8s' "$base_ticket")"
      limpa_cache_vite
    else
      setup_worktree "$id" "$wt"
      base_ticket="$(git -C "$wt" rev-parse HEAD)"
    fi
    event "$id" INICIO "attempt=$((attempt + 1))" "model=$modelo"
    status_ticket_inicio "$id" "$slug" "$attempt" "$CFG_MAX_RETRIES"
    run_attempt "$file" "$wt" "$rundir" "$modelo" "${MOTIVO_ANTERIOR:-}" "$attempt" "$base_ticket"
    grava_meta "$rundir" "$attempt" "$modelo"
    local tok; tok="$(motivo_token "$(cat "$rundir/veredito.json" 2>/dev/null || echo '{}')")"

    if [ "$RESULT" = "adiado" ]; then
      event "$id" ADIADO "motivo=$tok" "attempt=$((attempt + 1))"
      status_set "estado=ocioso" "ultimo=$id ADIADO $(date '+%H:%M:%S') (${DUR}s)" "motivo=adiado: $tok"
      DESFECHO_NOMEADO=1; mark_adiado "$file" "executor" "$MOTIVO"; cleanup_worktree "$id" "$wt"; return 0
    fi
    if [ "$RESULT" = "aprovado" ]; then
      ticket_set_status "$file" "aguardando_merge"
      ticket_set_nota "$file" "gates e critérios verdes em attempt-$attempt; merge é do ORQ-06"
      ticket_commit "$file" "fila: $id aguardando merge"
      # merge=aguardando: quem mergeia é a drenagem (ORQ-06) e ela emite o MERGE.
      event "$id" APROVADO "merge=aguardando" "dur=${DUR}s" "attempt=$((attempt + 1))"
      status_set "ultimo=$id APROVADO $(date '+%H:%M:%S') (${DUR}s)"
      log "APROVADO — merge em $CFG_BRANCH_ALVO fica para a drenagem (ORQ-06)"
      DESFECHO_NOMEADO=1; return 0
    fi
    if [ "$RESULT" = "refatiar" ]; then
      marca_refatiar "$file" "$rundir" "$tok"
      DESFECHO_NOMEADO=1; cleanup_worktree "$id" "$wt"; return 0
    fi
    event "$id" REPROVADO "motivo=$tok" "attempt=$((attempt + 1))" "diff=$DIFF_LINES"

    plano="$(printf '%s' "$(cat "$rundir/veredito.json")" | decisao retry "$attempt" "$modelo")"
    if [ "$(printf '%s' "$plano" | jq -r '.deveTentar')" != true ]; then
      ticket_set_status "$file" "bloqueado"
      ticket_set_nota "$file" "$MOTIVO ($(printf '%s' "$plano" | jq -r '.motivo'))"
      ticket_commit "$file" "fila: $id bloqueado"
      event "$id" BLOQUEADO "motivo=$tok" "attempt=$((attempt + 1))"
      status_set "estado=ocioso" "ultimo=$id BLOQUEADO $(date '+%H:%M:%S') (${DUR}s)" "motivo=bloqueado: $tok"
      DESFECHO_NOMEADO=1; log "BLOQUEADO: $MOTIVO"; cleanup_worktree "$id" "$wt"; return 0
    fi
    modelo="$(printf '%s' "$plano" | jq -r '.modelo')"
    # DIAGNÓSTICO ESTRUTURADO no lugar do texto livre (custo-e-contexto §6): o
    # motivo em prosa dizia O QUE caiu, nunca onde. Aqui vai gate, arquivo,
    # linha, esperado vs obtido, trecho e — a lição do 201 — os arquivos de
    # teste quebrados que a allowlist NÃO cobre.
    # `|| true` obrigatorio: sem ele a substituicao sai != 0 quando estreitarEscopo
    # e false, e o `set -e` mata o loop de retry sem log nenhum (attempt unico).
    MOTIVO_ANTERIOR="$(diagnostico_retry "$file" "$rundir")$( { [ "$(printf '%s' "$plano" | jq -r '.estreitarEscopo')" = true ] && printf '\n%s' "$(printf '%s' "$plano" | jq -r '.acao')"; } || true)"
    log "retry $((attempt + 1)): modelo=$modelo escalou=$(printf '%s' "$plano" | jq -r '.escalou')"
    event "$id" RETRY "attempt=$((attempt + 2))" "model=$modelo" "motivo=$tok" \
      "worktree=$([ "$ENF_OK" = 1 ] && echo reaproveitada || echo nova)"
    attempt=$((attempt + 1))
    # A worktree só sobrevive ao retry quando o enforcement aprovou o diff dela.
    if [ "$ENF_OK" = 1 ]; then
      reusar=1
    else
      reusar=0
      cleanup_worktree "$id" "$wt"
    fi
  done
}

# --- 3 · RECONCILE ----------------------------------------------------------
# Ticket já mergeado na branch alvo — inclusive por merge MANUAL, que não passa
# por aqui — NUNCA pode seguir pendente/bloqueado: o loop o re-rodaria. Corrige
# antes de selecionar. A marca "(ticket <id>)" é gravada pela drenagem no merge.
reconcile_merged() {
  local f id st n=0
  for f in $(ticket_files); do
    st="$(ticket_field "$f" '.status')"
    [ "$st" = "done" ] && continue
    id="$(ticket_field "$f" '.id')"
    if ticket_mergeado_em_alvo "$id"; then
      log "reconcile: ticket $id já mergeado em $CFG_BRANCH_ALVO -> done (estava $st)"
      ticket_set_status "$f" done
      ticket_set_nota "$f" "reconciliado: já mergeado em $CFG_BRANCH_ALVO"
      ticket_commit "$f" "fila: $id reconciliado (done)"
      event "$id" RECUPERADO "motivo=ja-mergeado" "de=$st"
      n=$((n + 1))
    fi
  done
  log "reconcile: $n ticket(s) corrigido(s)"
}

# --- 10 · MORTE INESPERADA DEIXA RASTRO (peça 0c) ---------------------------
# O buraco medido na peça 0b: o executor do requeue do 227 morreu entre o retorno
# do agente e o registro de custo, e não deixou UMA linha — nem `die`, nem
# evento, nem código de saída (o `run_executor_once` da drenagem descarta o rc).
# Do lado de fora só sobrou "executor rc!=0" e um ticket ainda pendente, que a
# drenagem leu como "sem progresso" e encerrou.
#
# Este trap não decide nada e não muda desfecho: ele só garante que uma saída
# que NÃO passou por um dos caminhos nomeados (aprovado, reprovado, adiado,
# refatiar, bloqueado, recusado) apareça no log e na trilha com o rc. Sem isso,
# morte por sinal é o único desfecho que este harness não sabe contar.
DESFECHO_NOMEADO=0
FASE_EM_CURSO=''
TICKET_EM_CURSO=''

# registrar_morte <rc> [sinal] — a linha na trilha e o STATUS de volta ao chão.
#
# LIMPAR O STATUS faz parte do registro (peça 12). Snapshot que fica em
# `executando` depois que o processo morreu não é informação velha: é informação
# ERRADA, e a peça 11 existe porque um desses comeu 22 h de disparos do launchd.
# Quem morre desliga a própria luz.
registrar_morte() {
  local rc="$1" sinal="${2:-}"
  log "MORTE ${sinal:+POR SINAL $sinal }INESPERADA: executor saiu com rc=$rc (ticket ${TICKET_EM_CURSO:-—}, fase ${FASE_EM_CURSO:-?})"
  event "${TICKET_EM_CURSO:-—}" EXECUTOR_MORREU "rc=$rc" "fase=${FASE_EM_CURSO:-?}" ${sinal:+"sinal=$sinal"} 2>/dev/null || true
  status_set "estado=ocioso" "fase=—" "ticket=—" \
    "motivo=executor morreu${sinal:+ por sinal $sinal} (rc=$rc, fase ${FASE_EM_CURSO:-?})" 2>/dev/null || true
  return 0
}

trap_saida() {
  local rc=$?
  [ "$DESFECHO_NOMEADO" = 1 ] && return 0
  [ "$rc" = 0 ] && return 0
  registrar_morte "$rc"
  return 0
}

# trap_sinal <nome-do-sinal> <numero> — morte por SINAL (peça 12).
#
# O trap de EXIT NÃO roda quando o processo morre por sinal não trapeado: o
# shell termina pela ação padrão do sinal, e nada mais é executado. Medido em
# 2026-09-06 15:38 UTC no `local-loop.log`: "gates: REPROVADO (rc=143)" seguido
# de "Terminated: 15" e NENHUM evento na trilha — 143 é 128+15, o executor foi
# morto por SIGTERM no meio dos gates e não deixou linha nenhuma. Do lado de
# fora, sobrava um ticket pendente e um STATUS eternamente `executando`.
#
# Desarma o EXIT antes de sair: uma morte, um registro.
trap_sinal() {
  local sinal="$1" numero="$2"
  trap - EXIT TERM INT
  DESFECHO_NOMEADO=1
  registrar_morte "$((128 + numero))" "$sinal"
  exit "$((128 + numero))"
}

# Armado numa função para que o teste exercite EXATAMENTE o que a produção arma.
armar_traps() {
  trap trap_saida EXIT
  trap 'trap_sinal TERM 15' TERM
  trap 'trap_sinal INT 2' INT
}

main() {
  [ "$RECONCILE" = 1 ] && { reconcile_merged; exit 0; }
  pausa_ativa && { log "fila PAUSADA: $(pausa_motivo)"; exit 0; }
  cooldown_active && { log "cooldown ativo ($(cooldown_remaining_min) min) — encerrando"; exit 0; }
  preflight
  local file=""
  if [ -n "$TICKET" ]; then file="$TICKET"
  elif [ -n "$TID" ]; then file="$(ticket_file_by_id "$TID")"
  else file="$(proximo_pendente)"; fi
  [ -n "$file" ] || { log "nenhum ticket pendente com dependências resolvidas"; exit 0; }
  drive_ticket "$file"
}

# Source-safe: com EXECUTOR_SOURCED=1 só define funções (test-preflight.sh usa).
# Os traps são ARMADOS AQUI, não junto da definição: sourced, o "processo que
# morreu" seria o shell do teste, e cada checagem vermelha viraria um
# EXECUTOR_MORREU na trilha do fixture. O trap é sobre a morte do EXECUTOR.
[ "${EXECUTOR_SOURCED:-0}" = 1 ] || { armar_traps; main; }
