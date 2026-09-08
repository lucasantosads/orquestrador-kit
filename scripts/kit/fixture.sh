#!/usr/bin/env bash
# fixture.sh — INSTANCIA o repo de fixture (peça K7a).
#
# `fixture/` no kit é TEMPLATE: arquivos soltos, sem .git, sem motor dentro.
# Este script transforma o template num repo de verdade, num diretório
# temporário, com a cópia VENDORIZADA do motor dentro — e é essa cópia que a
# peça K8 (`instalar.sh --novo`) vai reaproveitar: o mapa origem→destino daqui é
# o mesmo do ORIGEM.md.
#
# CONTRATO DE SAÍDA: a ÚLTIMA linha do stdout é o caminho do fixture e nada
# mais. Todo log vai para stderr. É o que permite `FX="$(bash scripts/kit/fixture.sh)"`.
#
# Onde ele NUNCA cria nada: dentro do kit e dentro de ~/Projetos. O fixture vive
# em /tmp/orq-fixture-XXXXXX/repo, e as worktrees do motor caem em
# /tmp/orq-fixture-XXXXXX/_worktrees (é o `worktrees_dir: "../_worktrees"` do
# config resolvido contra o checkout principal, lib.sh:77) — nunca no
# ~/Projetos/_worktrees compartilhado.
#
# O origin é FALSO por construção (git@example.invalid:fixture/orq-fixture.git):
# `example.invalid` é reservado pela RFC 2606 e não resolve. Se o loop um dia
# tentar push, falha alto — e isso é resultado de teste, não acidente.
#
# Uso:
#   bash scripts/kit/fixture.sh              instancia e imprime o caminho (padrão)
#   bash scripts/kit/fixture.sh --manter     idem (explícito; nada é removido)
#   bash scripts/kit/fixture.sh --limpar DIR remove o fixture DIR e o tmp que o contém

set -euo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PREFIXO=/tmp/orq-fixture-

log() { printf '[fixture] %s\n' "$*" >&2; }
die() { printf '[fixture ERRO] %s\n' "$*" >&2; exit 1; }

# --- --limpar -----------------------------------------------------------------
# Só apaga o que TEM a cara de um fixture nosso: o pai precisa começar com
# $PREFIXO. rm -rf num caminho vindo de argumento, sem essa trava, é como se
# apaga o diretório errado uma vez só.
limpar() {
  local alvo="${1:-}" pai
  [ -n "$alvo" ] || die "--limpar exige o caminho do fixture"
  [ -d "$alvo" ] || { log "nada a limpar: '$alvo' não é diretório"; return 0; }
  alvo="$(cd "$alvo" && pwd -P)"
  pai="$(dirname "$alvo")"
  case "$pai" in
    "$(cd /tmp && pwd -P)"/orq-fixture-*) : ;;
    *) die "recuso apagar '$alvo': o pai '$pai' não é um tmp de fixture ($PREFIXO*)" ;;
  esac
  # As worktrees do motor moram no MESMO tmp; apagar só o repo deixaria lixo.
  rm -rf "$pai"
  log "removido: $pai"
}

case "${1:-}" in
  --limpar) shift; limpar "${1:-}"; exit 0 ;;
  --manter|'') : ;;
  *) die "opção desconhecida: $1 (use --manter ou --limpar <dir>)" ;;
esac

# --- pré-condições ------------------------------------------------------------
for f in fixture/package.json fixture/docs/fila/000-config.json scripts/orq \
         scripts/orquestrador/lib.sh doutrina/SKILL.md VERSAO; do
  [ -e "$KIT/$f" ] || die "o kit não tem '$f' — este script roda de dentro do kit"
done
[ -d "$KIT/node_modules" ] || die "o kit não tem node_modules — rode 'npm install' antes (o fixture o compartilha por symlink)"

# --- 1. tmp + árvore ----------------------------------------------------------
# `pwd -P` NÃO é higiene: no macOS /tmp é symlink de /private/tmp, e o guard de
# CLI do gate-ticket.ts compara `import.meta.url` (que o node resolve fisicamente)
# com `resolve(process.argv[1])`. Passar o caminho lógico faz a comparação falhar
# e `orq validar` sair 0 sem imprimir nada — gate silencioso, que é pior que gate
# quebrado. Medido: com /tmp/... o relatório vinha vazio; com /private/tmp/..., não.
TMP="$(cd "$(mktemp -d "${PREFIXO}XXXXXX")" && pwd -P)"
FX="$TMP/repo"
mkdir -p "$FX" "$TMP/_worktrees"
log "tmp: $TMP"

# --- 2. o template ------------------------------------------------------------
# cp -R do CONTEÚDO (a barra final importa no macOS: sem ela o cp aninharia
# 'fixture' dentro do destino).
cp -R "$KIT/fixture/." "$FX/"
mv "$FX/gitignore" "$FX/.gitignore"

# --- 3. o motor, vendorizado --------------------------------------------------
# Este bloco É a vendorização: o mesmo mapa origem→destino do ORIGEM.md, que a
# peça K8 vai reaproveitar no `instalar.sh --novo`.
#   kit scripts/orquestrador/  ->  repo scripts/orquestrador/
#   kit scripts/orq            ->  repo scripts/orq
#   kit scripts/roadmap/       ->  repo scripts/roadmap/
#   kit doutrina/              ->  repo docs/orquestrador/skill/
#   kit VERSAO                 ->  repo docs/orquestrador/skill/VERSAO
mkdir -p "$FX/scripts" "$FX/docs/orquestrador/skill"
cp -R "$KIT/scripts/orquestrador" "$FX/scripts/orquestrador"
cp "$KIT/scripts/orq" "$FX/scripts/orq"
chmod +x "$FX/scripts/orq"
# scripts/roadmap TAMBÉM é motor, e o disco prova: `orq mapa lint` roda
# `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT (scripts/orq:226).
# Sem esta cópia o subcomando morre com "No such file or directory" no repo instalado.
cp -R "$KIT/scripts/roadmap" "$FX/scripts/roadmap"
# Plist INSTANCIADO não é motor: é artefato de uma máquina (caminhos absolutos).
# Só o .template atravessa. Regra por sufixo, não por nome: o nome do plist
# instanciado é o `launchd.label` do config do repo (peça K6c), então varia.
find "$FX/scripts/orquestrador" -name '*.plist' ! -name '*.plist.template' -exec rm -f {} +
cp -R "$KIT/doutrina/." "$FX/docs/orquestrador/skill/"
cp "$KIT/VERSAO" "$FX/docs/orquestrador/skill/VERSAO"

# Os dois artefatos que a doutrina manda vir do template, e não de uma segunda
# cópia dentro de fixture/: duplicar aqui é como as cópias divergem.
cp "$KIT/doutrina/templates/TICKET.md" "$FX/docs/fila/_TEMPLATE.md"
cp "$KIT/doutrina/templates/PLAYBOOK-seed.md" "$FX/docs/orquestrador/PLAYBOOK.md"

# --- 4. runs/ (não versionado) ------------------------------------------------
# Mesma convenção do checkout real: o próprio diretório se ignora. O
# .gitignore da raiz já exclui docs/fila/runs/, então este arquivo fica no disco
# e fora do índice — que é exatamente o que o teste do wrapper do launchd lê.
mkdir -p "$FX/docs/fila/runs"
cat > "$FX/docs/fila/runs/.gitignore" <<'GI'
# Evidência de run é efêmera: fica no disco, nunca no git.
# Sem isto, o run suja a árvore e o preflight do run SEGUINTE morre.
*
!.gitkeep
!.gitignore
GI
printf '{"dias":{}}\n' > "$FX/docs/fila/runs/custo.json"

# --- 5. node_modules e .env.local --------------------------------------------
# node_modules por SYMLINK para o do kit: as devDependencies do fixture são as
# mesmas (fixture/package.json), e instalar de novo custaria minutos por run.
ln -sfn "$KIT/node_modules" "$FX/node_modules"
# .env.local existe por causa de UMA chave: o preflight de identidade
# (executor.sh:111-114) extrai o ref de SUPABASE_URL e o compara com
# `ambiente_id`. Não versionado, como em qualquer repo de verdade.
printf 'SUPABASE_URL=https://orqfixture.supabase.co\n' > "$FX/.env.local"

# --- 6. git -------------------------------------------------------------------
git -C "$FX" init -q -b main 2>/dev/null || {
  git -C "$FX" init -q
  git -C "$FX" symbolic-ref HEAD refs/heads/main
}
git -C "$FX" remote add origin 'git@example.invalid:fixture/orq-fixture.git'
# Identidade fixa: o fixture não herda a do usuário, e um `user.email` ausente
# na máquina faria o commit inicial falhar — com o repo já meio montado.
git -C "$FX" config user.name  'orq fixture'
git -C "$FX" config user.email 'fixture@example.invalid'

# git add SEMPRE por pathspec explícito (proibicoes_absolutas do config).
git -C "$FX" add -- \
  .gitignore package.json vitest.config.ts tsconfig.json \
  src test docs scripts
git -C "$FX" commit -q -m 'fixture: repo mínimo + motor vendorizado do kit' \
  -m "Kit VERSAO: $(cat "$KIT/VERSAO")"

# branch alvo a partir de main, sem checkout: é ela que o loop mergeia.
git -C "$FX" branch staging-auto main

# --- 7. snapshot inicial ------------------------------------------------------
# `orq` sem argumento lê runs/STATUS.md. Um repo recém-instalado ainda não tem
# snapshot; semear `ocioso` é o que o próprio loop faria ao encerrar a primeira
# drenagem — e faz o fixture responder à pergunta "em que estado você está?"
# desde o primeiro segundo.
(
  cd "$FX"
  ORQ_EXEC_ROOT="$FX" bash -c '
    source scripts/orquestrador/lib.sh
    status_set "estado=ocioso" "fase=—" "ticket=—" \
      "motivo=fixture recém-instanciado; nenhuma drenagem rodou"
  '
) >&2

log "instanciado (branches: main, staging-auto; origin falso; node_modules -> $KIT/node_modules)"
log "para remover:  bash scripts/kit/fixture.sh --limpar $FX"

# ÚLTIMA LINHA DO STDOUT: o caminho, e nada mais.
printf '%s\n' "$FX"
