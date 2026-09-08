#!/usr/bin/env bash
# extrair-do-ci.sh (v2): importa o harness do conteudos-infinitos (CI) para o orquestrador-kit.
#
# Uso:
#   bash extrair-do-ci.sh                     dry-run: lista origem -> destino, não escreve nada
#   bash extrair-do-ci.sh --aplicar           copia os arquivos e escreve VERSAO, ORIGEM.md, CHANGELOG.md, README.md
#   bash extrair-do-ci.sh --aplicar --forcar  idem, mesmo que o kit já tenha scripts/orquestrador
#
# Regras:
#   - só copia arquivo RASTREADO pelo git do CI (git ls-files): nunca node_modules, nunca runs/, nunca .env
#   - não altera o CI; não commita no kit (o commit é humano, por pathspec explícito)
#   - o plist instanciado (com.conteudos.orquestrador.plist) fica de fora; o template entra
#   - compatível com o bash 3.2 do macOS

set -euo pipefail

CI="${CI:-$HOME/Projetos/conteudos-infinitos}"
KIT="${KIT:-$HOME/Projetos/orquestrador-kit}"
MODO=dry-run
FORCAR=0
for a in "$@"; do
  case "$a" in
    --aplicar) MODO=aplicar ;;
    --forcar)  FORCAR=1 ;;
    *) echo "argumento desconhecido: $a" >&2; exit 2 ;;
  esac
done
die() { echo "ERRO: $*" >&2; exit 1; }

# --- pré-condições -----------------------------------------------------------
[ -d "$CI/.git" ]  || die "CI não é repo git: $CI"
[ -d "$KIT/.git" ] || die "KIT não é repo git: $KIT (cria o orquestrador-kit no GitHub e clona em ~/Projetos antes)"
[ "$(git -C "$CI" branch --show-current)" = main ] || die "CI precisa estar em main"
[ -z "$(git -C "$CI" status --porcelain --untracked-files=no)" ] || die "CI tem modificação não commitada em arquivo rastreado; commita ou descarta antes"
CI_SHA="$(git -C "$CI" rev-parse --short HEAD)"
CI_SHA_LONGO="$(git -C "$CI" rev-parse HEAD)"
CI_DATA="$(git -C "$CI" log -1 --format=%ci)"

if ! git -C "$KIT" rev-parse --verify -q HEAD >/dev/null 2>&1; then
  git -C "$KIT" symbolic-ref HEAD refs/heads/main
fi
[ "$(git -C "$KIT" branch --show-current)" = main ] || die "KIT precisa estar em main"
[ -z "$(git -C "$KIT" status --porcelain)" ] || die "KIT tem arquivo modificado ou não rastreado; limpa antes"
if [ "$FORCAR" -eq 0 ] && [ -e "$KIT/scripts/orquestrador" ]; then
  die "KIT já tem scripts/orquestrador; use --forcar para sobrescrever"
fi

# --- o que vai, e para onde --------------------------------------------------
# origem no CI | diretório de destino no kit
MAPA='scripts/orquestrador|scripts/orquestrador
scripts/orq|scripts
scripts/roadmap|scripts/roadmap
docs/orquestrador/skill|doutrina
docs/orquestrador/launchd.md|docs
test/orq*|test'

# referências do CI, com nome próprio, em _referencia-ci/ (a sessão do kit deriva templates delas)
REFS='docs/fila/000-config.json|_referencia-ci/000-config.ci.json
docs/fila/_TEMPLATE.md|_referencia-ci/_TEMPLATE.ci.md
docs/orquestrador/PECAS.md|_referencia-ci/PECAS.ci.md
docs/orquestrador/PLAYBOOK.md|_referencia-ci/PLAYBOOK.ci.md
docs/roadmap/mapa.json|_referencia-ci/mapa.ci.json
docs/roadmap/MAPA.md|_referencia-ci/MAPA.ci.md
.gitignore|_referencia-ci/gitignore.ci
package.json|_referencia-ci/package.ci.json'

EXCLUIR='(^|/)com\.conteudos\.orquestrador\.plist$'

LISTA="$(mktemp)"
trap 'rm -f "$LISTA"' EXIT

printf '%s\n' "$MAPA" | while IFS='|' read -r origem destdir; do
  [ -n "$origem" ] || continue
  git -C "$CI" ls-files -- "$origem" | grep -Ev "$EXCLUIR" | while read -r f; do
    if [ -d "$CI/$origem" ]; then rel="${f#$origem/}"; else rel="$(basename "$f")"; fi
    printf '%s\t%s\n' "$f" "$destdir/$rel"
  done
done >> "$LISTA"

printf '%s\n' "$REFS" | while IFS='|' read -r origem dest; do
  [ -n "$origem" ] || continue
  if git -C "$CI" ls-files --error-unmatch -- "$origem" >/dev/null 2>&1; then
    printf '%s\t%s\n' "$origem" "$dest"
  else
    echo "AVISO: referência não rastreada no CI, pulando: $origem" >&2
  fi
done >> "$LISTA"

git -C "$CI" ls-files -- 'vitest.config.*' 'tsconfig*.json' | while read -r f; do
  printf '%s\t%s\n' "$f" "_referencia-ci/$(basename "$f")"
done >> "$LISTA"

# dedupe (um pathspec pode casar o mesmo arquivo duas vezes), preservando a ordem
awk '!s[$0]++' "$LISTA" > "$LISTA.d" && mv "$LISTA.d" "$LISTA"

# --- relatório -----------------------------------------------------------------
N="$(wc -l < "$LISTA" | tr -d ' ')"
BYTES=0
while IFS=$'\t' read -r src dst; do
  b="$(wc -c < "$CI/$src" | tr -d ' ')"
  BYTES=$((BYTES + b))
  printf '%8s  %s  ->  %s\n' "$b" "$src" "$dst"
done < "$LISTA"
echo
echo "CI @$CI_SHA ($CI_DATA)  ->  $KIT  ::  $N arquivos, $BYTES bytes"

if [ "$MODO" = dry-run ]; then
  echo
  echo "dry-run: nada foi escrito. Para copiar:  bash $0 --aplicar"
  exit 0
fi

# --- aplicar -------------------------------------------------------------------
while IFS=$'\t' read -r src dst; do
  mkdir -p "$KIT/$(dirname "$dst")"
  cp -p "$CI/$src" "$KIT/$dst"
done < "$LISTA"

printf '2.1.0-dev\n' > "$KIT/VERSAO"
mkdir -p "$KIT/scripts/kit" "$KIT/docs"
cp -p "$0" "$KIT/scripts/kit/extrair-do-ci.sh"

{
  echo "# ORIGEM"
  echo
  echo "Harness importado do conteudos-infinitos em $(date '+%Y-%m-%d %H:%M')."
  echo
  echo "- repo: lucasantosads/conteudos-infinitos"
  echo "- commit: $CI_SHA_LONGO ($CI_DATA)"
  echo "- arquivos: $N, $BYTES bytes, listados abaixo (origem no CI -> destino no kit)"
  echo "- script: scripts/kit/extrair-do-ci.sh (rodar de novo com --forcar para reimportar)"
  echo
  echo '```'
  awk -F'\t' '{ printf "%s -> %s\n", $1, $2 }' "$LISTA"
  echo '```'
} > "$KIT/ORIGEM.md"

if [ ! -e "$KIT/CHANGELOG.md" ]; then
  {
    echo "# CHANGELOG"
    echo
    echo "## 2.1.0-dev · $(date '+%Y-%m-%d')"
    echo
    echo "- Importa o harness do conteudos-infinitos @$CI_SHA (peças 0 a 13 e peça 1). Ver ORIGEM.md."
    echo "- Ainda não instala em repo nenhum: instalar.sh, fixture e testes autônomos vêm nas próximas peças."
  } > "$KIT/CHANGELOG.md"
fi

if [ ! -e "$KIT/README.md" ]; then
  cat > "$KIT/README.md" <<'EOF'
# orquestrador-kit

Uma implementação, N instalações. O motor do orquestrador autônomo (loop de tickets com Claude Code headless, gates mecânicos, juiz LLM, merge em staging-auto) vive aqui, versionado. Cada repo recebe uma cópia vendorizada por `instalar.sh` e guarda o que é local só em `docs/fila/000-config.json`.

- `scripts/orquestrador/` motor (driver bash + decisores TS) e testes shell
- `scripts/orq` CLI de leitura e operação
- `doutrina/` skill, referências e templates (vendorizada em `docs/orquestrador/skill/` de cada repo)
- `test/` vitest do harness
- `_referencia-ci/` cópias do repo de origem para derivar templates; não fazem parte do kit instalado
- `docs/` inventário, launchd, decisões

Regras: correção de harness entra AQUI primeiro e propaga por versão; nenhum script carrega premissa de repo (nome de branch, ref de banco, caminho de worktree); o que varia vive em config.
EOF
fi

if [ -e "$HOME/Downloads/INVENTARIO-2026-09-07.md" ]; then
  cp -p "$HOME/Downloads/INVENTARIO-2026-09-07.md" "$KIT/docs/INVENTARIO-2026-09-07.md"
else
  echo "AVISO: ~/Downloads/INVENTARIO-2026-09-07.md não encontrado; copia depois para $KIT/docs/" >&2
fi

# --- pós-cópia: só leitura, tudo best-effort ------------------------------------
set +e
echo
echo "--- git status do kit"
git -C "$KIT" status --short | head -60

echo
echo "--- imports relativos dos testes que NÃO resolvem no kit (a sessão do kit trata)"
grep -hoE "from ['\"]\.\.?/[^'\"]+['\"]" "$KIT"/test/*.ts 2>/dev/null \
  | sed -E "s/^from ['\"]//; s/['\"]$//" | sort -u | while read -r p; do
  base="$KIT/test/$p"
  if [ -e "$base" ] || [ -e "$base.ts" ] || [ -e "$base.js" ] || [ -e "$base.mjs" ] || [ -e "$base/index.ts" ]; then
    :
  else
    echo "FALTA: $p"
  fi
done

echo
echo "--- premissas de repo dentro dos scripts (teste de pureza: esperado zero; hoje é o tamanho do trabalho)"
grep -rn -E 'conteudos-infinitos|vcmkssdnqandxseglhee|ci-staging|ci-harness|apps/web|comarka|actus' \
  "$KIT/scripts/orquestrador" "$KIT/scripts/orq" 2>/dev/null | grep -vE '/test-[^/]*\.sh:' | head -40

echo
echo "Copiado. Nada commitado. Para commitar (pathspec explícito):"
echo "  cd $KIT && git add VERSAO CHANGELOG.md ORIGEM.md README.md scripts doutrina docs test _referencia-ci && git --no-pager diff --cached --stat | tail -3 && git commit -m 'kit: importa harness do conteudos-infinitos @$CI_SHA' && git log --oneline -1"
