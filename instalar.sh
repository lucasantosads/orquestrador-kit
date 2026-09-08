#!/usr/bin/env bash
# instalar.sh — instalador do kit do Orquestrador Autônomo.
#
# Dois verbos: `--verificar` (K5) e `--atualizar` (K8a). `--novo` é a peça K8b
# e, se chamado, diz isso e sai 2 — verbo que finge existir é pior que verbo
# ausente.
#
#   bash instalar.sh --verificar <repo>
#   bash instalar.sh --atualizar <repo> [--dry-run] [--forcar]
#
# O que o `--verificar` prova: a cópia VENDORIZADA do motor dentro de `<repo>` é
# idêntica à do kit. É a decisão 2 do inventário (vendorizado por cópia, hash
# conferido no pré-voo) reduzida ao mínimo que dá para checar sem rodar nada.
#
# O que o `--atualizar` faz: copia o motor do kit POR CIMA do de `<repo>` e
# carimba `docs/orquestrador/skill/VERSAO`. É `cp`, não `rsync --delete`: nada
# que só exista no repo é apagado — o que sobra aparece como `só no repo` no
# `--verificar` que ele imprime no fim. Não toca `docs/fila/**` (tickets,
# `000-config.json`, `liberacoes.json`), nem PLAYBOOK, nem PECAS do repo:
# migração de artefato legado é a peça K8b.
#
# O mapa origem -> destino é o do ORIGEM.md, e o mesmo que o
# scripts/kit/fixture.sh usa para instanciar:
#
#   kit scripts/orquestrador/   <->   <repo>/scripts/orquestrador/
#   kit scripts/orq             <->   <repo>/scripts/orq
#   kit scripts/roadmap/        <->   <repo>/scripts/roadmap/
#   kit doutrina/               <->   <repo>/docs/orquestrador/skill/
#
# scripts/roadmap/ entrou na comparação em K5b, e não por simetria: `orq mapa
# lint` roda `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT
# (scripts/orq:226), então aquele diretório É motor vendorizado — o
# scripts/kit/fixture.sh já o copiava. Sem esta linha, um lint-mapa.py
# desatualizado no repo passava por "idêntico".
#
# O que NÃO entra na comparação, e por quê:
#   *.plist que não termine em .plist.template — é o plist INSTANCIADO, gerado
#     por instalar-launchd.sh com caminhos absolutos DESTA máquina. Artefato
#     local, não motor. A regra é por sufixo e não por nome porque o nome muda
#     por repo: desde a peça K6c o nome do plist instanciado é o
#     `launchd.label` do config, e o template é com.orquestrador.plist.template.
#   runs — evidência de execução, efêmera por contrato.
#   VERSAO — carimbo da vendorização, não conteúdo da doutrina: ele existe no
#     destino e não na origem, então compará-lo acusaria diferença em toda
#     instalação correta. É checado à parte, e a ausência dele não é erro nesta
#     versão (repo vendorizado antes do carimbo existir).
#
# Saída: uma linha por diferença (`diferente` / `só no kit` / `só no repo`) e
# rc 1; ou `idêntico ao kit <VERSAO>` e rc 0.

set -euo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSAO="$(cat "$KIT/VERSAO")"

die() { printf 'instalar.sh: %s\n' "$*" >&2; exit 2; }

uso() {
  cat <<'USO'
uso: bash instalar.sh --verificar <repo>
     bash instalar.sh --atualizar <repo> [--dry-run] [--forcar]

  --verificar <repo>   compara o motor vendorizado em <repo> com o do kit
  --atualizar <repo>   copia o motor do kit por cima do de <repo>
      --dry-run        só lista o que mudaria (idêntico ao --verificar) e sai 0
      --forcar         segue mesmo com modificação não commitada no motor do repo
                       (NÃO passa por cima da pausa nem do STATUS)
  --novo <repo>        (peça K8b)
USO
}

# recusa <mensagem> — rc 1, e a mensagem diz O QUÊ. Distinto do die() (rc 2, erro
# de uso): recusa é o instalador funcionando e dizendo não.
recusa() { printf 'RECUSADO: %s\n' "$*" >&2; exit 1; }

# --- comparação ---------------------------------------------------------------
# `diff -rq` fala em inglês só com LC_ALL=C. Sem isso, a máquina do usuário em
# pt_BR devolve "Os arquivos ... são diferentes" e o parser abaixo não casa
# nada — o verificador diria "idêntico" para um repo divergente, que é o único
# desfecho que este script não pode ter.
DIFERENCAS=0

# relativiza <caminho> <base> -> o caminho sem o prefixo da base.
relativiza() {
  local c="$1" b="${2%/}"
  case "$c" in "$b"/*) printf '%s' "${c#"$b"/}" ;; *) printf '%s' "$c" ;; esac
}

# comparar_dir <destino_legivel> <dir_kit> <dir_repo> [args extras do diff...]
comparar_dir() {
  local rotulo="$1" a="$2" b="$3"; shift 3
  if [ ! -d "$a" ]; then printf 'só no repo  %s/ (o KIT não tem este diretório)\n' "$rotulo"; DIFERENCAS=$((DIFERENCAS+1)); return 0; fi
  if [ ! -d "$b" ]; then printf 'só no kit   %s/ (o REPO não tem este diretório)\n' "$rotulo"; DIFERENCAS=$((DIFERENCAS+1)); return 0; fi
  local linha dir nome rel
  while IFS= read -r linha; do
    [ -n "$linha" ] || continue
    case "$linha" in
      "Files "*" and "*" differ")
        rel="${linha#Files }"; rel="${rel%% and *}"
        printf 'diferente   %s/%s\n' "$rotulo" "$(relativiza "$rel" "$a")"
        DIFERENCAS=$((DIFERENCAS+1))
        ;;
      "Only in "*)
        dir="${linha#Only in }"; nome="${dir#*: }"; dir="${dir%%: *}"
        case "$dir/" in
          "$a"/*|"$a/") rel="$(relativiza "$dir/$nome" "$a")"; printf 'só no kit   %s/%s\n' "$rotulo" "$rel" ;;
          *)            rel="$(relativiza "$dir/$nome" "$b")"; printf 'só no repo  %s/%s\n' "$rotulo" "$rel" ;;
        esac
        DIFERENCAS=$((DIFERENCAS+1))
        ;;
      *)
        # Qualquer outra linha (arquivo especial, erro de leitura) conta como
        # diferença: engolir o que não se entende é como um verificador mente.
        printf 'diferente   %s (diff disse: %s)\n' "$rotulo" "$linha"
        DIFERENCAS=$((DIFERENCAS+1))
        ;;
    esac
  done < <(LC_ALL=C diff -rq "$@" "$a" "$b" 2>&1 || true)
}

# comparar_arquivo <destino_legivel> <arq_kit> <arq_repo>
comparar_arquivo() {
  local rotulo="$1" a="$2" b="$3"
  if [ ! -f "$b" ]; then printf 'só no kit   %s\n' "$rotulo"; DIFERENCAS=$((DIFERENCAS+1)); return 0; fi
  if ! cmp -s "$a" "$b"; then printf 'diferente   %s\n' "$rotulo"; DIFERENCAS=$((DIFERENCAS+1)); fi
}

# comparar_tudo <repo> — as quatro comparações do mapa origem->destino. Existe
# separada do verificar() porque o --atualizar --dry-run mostra EXATAMENTE esta
# lista: duas listas que se pretendem iguais e são montadas em dois lugares
# divergem no primeiro caminho que alguém acrescentar.
comparar_tudo() {
  local repo="$1"
  comparar_dir 'scripts/orquestrador' \
    "$KIT/scripts/orquestrador" "$repo/scripts/orquestrador" \
    -x '*.plist' -x runs
  comparar_arquivo 'scripts/orq' "$KIT/scripts/orq" "$repo/scripts/orq"
  comparar_dir 'scripts/roadmap' \
    "$KIT/scripts/roadmap" "$repo/scripts/roadmap"
  comparar_dir 'docs/orquestrador/skill' \
    "$KIT/doutrina" "$repo/docs/orquestrador/skill" \
    -x VERSAO -x runs
}

verificar() {
  local repo="${1:-}"
  [ -n "$repo" ] || die "--verificar exige o caminho do repo"
  [ -d "$repo" ] || die "'$repo' não é um diretório"
  repo="$(cd "$repo" && pwd -P)"

  printf 'VERIFICAR  kit %s (%s)\n' "$VERSAO" "$KIT"
  printf '           repo %s\n\n' "$repo"

  # VERSAO do destino: informação, não gate. Um repo vendorizado antes do
  # carimbo existir não está errado — está sem carimbo.
  local carimbo="$repo/docs/orquestrador/skill/VERSAO"
  if [ -f "$carimbo" ]; then
    printf 'carimbo    %s\n' "$(cat "$carimbo")"
  else
    printf 'repo sem VERSAO\n'
  fi
  printf '\n'

  comparar_tudo "$repo"

  printf '\n'
  if [ "$DIFERENCAS" = 0 ]; then
    printf 'idêntico ao kit %s\n' "$VERSAO"
    return 0
  fi
  printf '%s diferença(s)\n' "$DIFERENCAS"
  return 1
}

# --- --atualizar (peça K8a) ---------------------------------------------------
# O que ele COPIA (o mesmo mapa do ORIGEM.md e do scripts/kit/fixture.sh):
#   kit scripts/orquestrador/  ->  repo scripts/orquestrador/   (sem plist instanciado)
#   kit scripts/orq            ->  repo scripts/orq
#   kit scripts/roadmap/       ->  repo scripts/roadmap/
#   kit doutrina/              ->  repo docs/orquestrador/skill/
#   kit VERSAO                 ->  repo docs/orquestrador/skill/VERSAO
#
# O que ele NÃO toca: docs/fila/** (tickets, 000-config.json, liberacoes.json),
# PLAYBOOK e PECAS do repo. Migração de artefato legado é K8b.
#
# As três recusas, e por que cada uma:
#   1. loop não pausado — copiar o motor por baixo de uma drenagem viva troca o
#      lib.sh de um executor que já está rodando. `--forcar` NÃO passa por cima:
#      não existe pressa que justifique isso.
#   2. STATUS.md diz outra coisa que não `ocioso` — mesmo motivo, por outra
#      testemunha: o snapshot é o que o próprio loop afirma sobre si. Ausência de
#      STATUS.md não é recusa (repo que nunca drenou).
#   3. modificação não commitada no motor do repo — copiar por cima apaga
#      trabalho sem registro no git. É a ÚNICA que `--forcar` dispensa, porque
#      às vezes a modificação é lixo conhecido, e aí a perda é decisão de quem
#      olhou. Os caminhos conferidos são os MESMOS que o bloco de cópia escreve,
#      `scripts/roadmap/` incluído desde a peça K8c.
atualizar() {
  local repo="" dry=0 forcar=0 a
  for a in "$@"; do
    case "$a" in
      --dry-run) dry=1 ;;
      --forcar)  forcar=1 ;;
      -*)        die "--atualizar: opção desconhecida '$a'" ;;
      *)         [ -z "$repo" ] || die "--atualizar aceita UM repo (recebi '$repo' e '$a')"; repo="$a" ;;
    esac
  done
  [ -n "$repo" ] || die "--atualizar exige o caminho do repo"
  [ -d "$repo" ] || die "'$repo' não é um diretório"
  repo="$(cd "$repo" && pwd -P)"

  if [ "$dry" = 1 ]; then
    printf 'ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.\n\n'
    verificar "$repo" || true
    return 0
  fi

  # --- recusa 1 · o loop tem de estar parado ---------------------------------
  # Os dois arquivos, porque o motor reconhece os dois (lib.sh:615-619):
  # CFG_PAUSAR_FILE (o `pausar_file` do config, `docs/fila/PAUSAR` tanto no
  # template quanto no config do CI) e o legado `docs/fila/.orq-pause`.
  if [ ! -f "$repo/docs/fila/PAUSAR" ] && [ ! -f "$repo/docs/fila/.orq-pause" ]; then
    recusa "o loop de '$repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar \"atualizando o motor\"' dentro do repo e tente de novo."
  fi

  # --- recusa 2 · o snapshot tem de dizer ocioso -----------------------------
  local status_md="$repo/docs/fila/runs/STATUS.md"
  if [ -f "$status_md" ] && ! grep -qE '^ESTADO +ocioso *$' "$status_md"; then
    recusa "docs/fila/runs/STATUS.md de '$repo' não diz 'ocioso': $(grep -E '^ESTADO' "$status_md" | head -1 | sed 's/  */ /g'). Espere a drenagem em curso terminar."
  fi

  # --- recusa 3 · o motor do repo não pode ter mudança fora do git -----------
  # A lista de caminhos é a MESMA que o bloco de cópia escreve, e é por isso que
  # ela inclui scripts/roadmap (peça K8c). Desde a K5b o --atualizar ESCREVE ali
  # — scripts/roadmap/ é motor vendorizado: `orq mapa lint` roda
  # `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT
  # (scripts/orq:226) —, mas a recusa continuava com os três caminhos que a peça
  # K8a enumerava. Um lint-mapa.py modificado e não commitado era a única coisa
  # que este script apagava sem nem avisar. Escrever e vigiar têm de ser a mesma
  # lista: divergir as duas é exatamente como se apaga trabalho em silêncio.
  local sujo=''
  if git -C "$repo" rev-parse --git-dir >/dev/null 2>&1; then
    sujo="$(git -C "$repo" status --porcelain -- \
      scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill 2>/dev/null || true)"
  fi
  if [ -n "$sujo" ] && [ "$forcar" = 0 ]; then
    printf '%s\n' "$sujo" >&2
    recusa "'$repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso."
  fi
  if [ -n "$sujo" ] && [ "$forcar" = 1 ]; then
    printf '%s\n' "$sujo" >&2
    printf -- '--forcar: passando por cima de %s caminho(s) modificado(s) no motor do repo.\n\n' \
      "$(printf '%s\n' "$sujo" | wc -l | tr -d ' ')"
  fi

  # --- a cópia ---------------------------------------------------------------
  # Staging intermediário só por causa do plist INSTANCIADO: ele é artefato de
  # uma máquina e não pode viajar. Filtrar no staging (e não no destino) é o que
  # garante que um plist do REPO nunca seja apagado por engano.
  printf 'ATUALIZAR  kit %s (%s)\n' "$VERSAO" "$KIT"
  printf '           repo %s\n\n' "$repo"
  local stage
  stage="$(mktemp -d /tmp/orq-atualizar-XXXXXX)"
  mkdir -p "$stage/orquestrador"
  cp -R "$KIT/scripts/orquestrador/." "$stage/orquestrador/"
  find "$stage/orquestrador" -name '*.plist' ! -name '*.plist.template' -exec rm -f {} +

  mkdir -p "$repo/scripts/orquestrador" "$repo/scripts/roadmap" "$repo/docs/orquestrador/skill"
  cp -R "$stage/orquestrador/." "$repo/scripts/orquestrador/"
  cp "$KIT/scripts/orq" "$repo/scripts/orq"; chmod +x "$repo/scripts/orq"
  cp -R "$KIT/scripts/roadmap/." "$repo/scripts/roadmap/"
  cp -R "$KIT/doutrina/." "$repo/docs/orquestrador/skill/"
  cp "$KIT/VERSAO" "$repo/docs/orquestrador/skill/VERSAO"
  rm -rf "$stage"
  printf 'copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO %s)\n\n' "$VERSAO"

  # --- o veredito é do verificador, não deste bloco --------------------------
  # Dizer "atualizado" sem reler o disco é como um instalador mente. O que sobrar
  # de `só no repo` aqui é justamente o que NÃO foi apagado, e é para ser lido.
  local rc=0
  verificar "$repo" || rc=$?

  printf '\ncommit sugerido, no repo, com pathspec explícito:\n'
  printf '  cd %s\n' "$repo"
  printf '  git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill\n'
  printf "  git commit -m 'motor: kit %s'\n" "$VERSAO"
  return "$rc"
}

case "${1:-}" in
  --verificar)  shift; verificar "${1:-}" ;;
  --atualizar)  shift; atualizar "$@" ;;
  --novo)
    printf 'ainda não: peça K8b\n'
    exit 2
    ;;
  -h|--help|'') uso; [ -z "${1:-}" ] && exit 2 || exit 0 ;;
  *) uso >&2; die "verbo desconhecido: $1" ;;
esac
