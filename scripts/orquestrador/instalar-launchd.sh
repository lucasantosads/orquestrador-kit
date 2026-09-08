#!/bin/bash
set -euo pipefail

# Instalacao assistida do agendamento do Orquestrador Autonomo
# (conteudos-infinitos).
#
# Resolve os caminhos DESTA maquina (repo + node), gera o plist final a partir
# do template versionado e o carrega no dominio gui do usuario. NUNCA usa
# `kickstart -k` - matar um run vivo por cima e proibido.
#
# PORTABILIDADE: REPO_DIR sai do proprio arquivo; NODE_DIR sai do `which node`.
# Rodar este script e o ato que "hospeda" o loop aqui.
#
# ADAPTADO do comarka-operacional em 06/set/2026. Este repo tinha
# launchd-run.sh (o wrapper que o plist chama) mas NENHUM plist e nenhum
# instalador: o loop so rodava quando alguem o disparava a mao. Tirar o
# .orq-pause nao resolvia porque nao havia job agendado para retomar.
# As diferencas em relacao ao original sao tres - label, REPO_DIR (que sai
# daqui, entao se adapta sozinho) e o StartInterval/log do template, cada uma
# justificada em com.conteudos.orquestrador.plist.template.

UID_NUM="$(id -u)"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LABEL="com.conteudos.orquestrador"
TEMPLATE="$REPO_DIR/scripts/orquestrador/$LABEL.plist.template"
GERADO="$REPO_DIR/scripts/orquestrador/$LABEL.plist"
DST="$HOME/Library/LaunchAgents/$LABEL.plist"

if ! command -v node >/dev/null 2>&1; then
  echo "ERRO: node nao esta no PATH desta maquina." >&2
  exit 1
fi
NODE_BIN="$(command -v node)"
NODE_DIR="$(cd "$(dirname "$NODE_BIN")" && pwd)"

[ -f "$TEMPLATE" ] || { echo "ERRO: template ausente: $TEMPLATE" >&2; exit 1; }
[ -x "$REPO_DIR/scripts/orquestrador/launchd-run.sh" ] || {
  echo "ERRO: launchd-run.sh ausente ou sem +x" >&2; exit 1; }

# O plist manda stdout/stderr para docs/fila/runs/. Sem a pasta, o launchd nao
# carrega o job e a falha aparece so no log do sistema.
mkdir -p "$REPO_DIR/docs/fila/runs"

echo "REPO_DIR = $REPO_DIR"
echo "NODE_DIR = $NODE_DIR  ($("$NODE_BIN" -v))"
echo ""

sed -e "s|__REPO_DIR__|$REPO_DIR|g" \
    -e "s|__NODE_DIR__|$NODE_DIR|g" \
    "$TEMPLATE" > "$GERADO"

if grep -q "__REPO_DIR__\|__NODE_DIR__" "$GERADO"; then
  echo "ERRO: placeholder nao resolvido em $GERADO" >&2
  exit 1
fi
echo "plist gerado: $GERADO"

mkdir -p "$HOME/Library/LaunchAgents"
cp "$GERADO" "$DST"
echo "plist instalado: $DST"

if launchctl print "gui/$UID_NUM/$LABEL" >/dev/null 2>&1; then
  echo "job ja carregado - bootout antes de recarregar (NUNCA kickstart -k)."
  launchctl bootout "gui/$UID_NUM/$LABEL" 2>/dev/null || true
else
  echo "nenhum job carregado previamente."
fi

launchctl bootstrap "gui/$UID_NUM" "$DST"
echo "bootstrap OK: $LABEL carregado em gui/$UID_NUM"

echo ""
echo "verificar:   launchctl print gui/$UID_NUM/$LABEL | head -20"
echo "log do job:  tail -f $REPO_DIR/docs/fila/runs/launchd-agent.log"
echo "log do loop: tail -f $REPO_DIR/docs/fila/runs/launchd.log"
echo "pausar fila: ./scripts/orquestrador/orq-pause.sh \"motivo\""
echo "desinstalar: launchctl bootout gui/$UID_NUM/$LABEL && rm -f \"$DST\""
