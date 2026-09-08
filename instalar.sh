#!/usr/bin/env bash
# instalar.sh — instalador do kit do Orquestrador Autônomo.
#
# Nesta etapa existe UM verbo: `--verificar`. `--novo` e `--atualizar` são a
# peça K8 e, se chamados, dizem isso e saem 2 — verbo que finge existir é pior
# que verbo ausente.
#
#   bash instalar.sh --verificar <repo>
#
# O que ele prova: a cópia VENDORIZADA do motor dentro de `<repo>` é idêntica à
# do kit. É a decisão 2 do inventário (vendorizado por cópia, hash conferido no
# pré-voo) reduzida ao mínimo que dá para checar sem rodar nada.
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
#     por repo (e a peça K6 vai trocá-lo por com.orquestrador.plist.template).
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

  --verificar <repo>   compara o motor vendorizado em <repo> com o do kit
  --novo <repo>        (peça K8)
  --atualizar <repo>   (peça K8)
USO
}

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

  comparar_dir 'scripts/orquestrador' \
    "$KIT/scripts/orquestrador" "$repo/scripts/orquestrador" \
    -x '*.plist' -x runs
  comparar_arquivo 'scripts/orq' "$KIT/scripts/orq" "$repo/scripts/orq"
  comparar_dir 'scripts/roadmap' \
    "$KIT/scripts/roadmap" "$repo/scripts/roadmap"
  comparar_dir 'docs/orquestrador/skill' \
    "$KIT/doutrina" "$repo/docs/orquestrador/skill" \
    -x VERSAO -x runs

  printf '\n'
  if [ "$DIFERENCAS" = 0 ]; then
    printf 'idêntico ao kit %s\n' "$VERSAO"
    return 0
  fi
  printf '%s diferença(s)\n' "$DIFERENCAS"
  return 1
}

case "${1:-}" in
  --verificar)  shift; verificar "${1:-}" ;;
  --novo|--atualizar)
    printf 'ainda não: peça K8\n'
    exit 2
    ;;
  -h|--help|'') uso; [ -z "${1:-}" ] && exit 2 || exit 0 ;;
  *) uso >&2; die "verbo desconhecido: $1" ;;
esac
