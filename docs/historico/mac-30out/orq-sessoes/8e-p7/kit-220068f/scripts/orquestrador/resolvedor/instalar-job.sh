#!/bin/bash
set -euo pipefail

# instalar-job.sh — gera e instala o job do launchd do resolvedor (etapa 7f-b2,
# peça 8): label com.orq.resolvedor, a cada 300 s, `orq resolver` sobre todos
# os repos do ~/.orq/repos.json.
#
# Uso:
#   bash scripts/orquestrador/resolvedor/instalar-job.sh --dry-run   só imprime o plist
#   bash scripts/orquestrador/resolvedor/instalar-job.sh             instala e carrega (o HUMANO roda)
#   ... --permitir-tmp    instala mesmo de um checkout sob /tmp
#
# Quem instala é o humano, do checkout principal do kit depois do merge (o
# CHECKOUT do plist é o deste arquivo). As mesmas guardas do
# instalar-launchd.sh (K6e): com ORQ_TESTE=1 ou de um checkout sob /tmp, só o
# --dry-run roda. NUNCA `kickstart -k`.
#
# Parar sem desinstalar: `touch ~/.orq/RESOLVEDOR_PAUSADO` (o job sai em 0 sem
# chamar o node). Desinstalar: a última linha que este script imprime.

DRY=0
PERMITIR_TMP=0
for a in "$@"; do
  case "$a" in
    --dry-run)      DRY=1 ;;
    --permitir-tmp) PERMITIR_TMP=1 ;;
    *) echo "uso: $0 [--dry-run] [--permitir-tmp]" >&2; exit 2 ;;
  esac
done

LABEL=com.orq.resolvedor
CHECKOUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TEMPLATE="$CHECKOUT/scripts/orquestrador/resolvedor/$LABEL.plist.template"
ORQ_HOME="${ORQ_HOME:-$HOME/.orq}"
DST="$HOME/Library/LaunchAgents/$LABEL.plist"

[ -f "$TEMPLATE" ] || { echo "ERRO: template ausente: $TEMPLATE" >&2; exit 1; }
[ -f "$CHECKOUT/scripts/orquestrador/resolvedor/job.sh" ] || { echo "ERRO: job.sh ausente" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERRO: node nao esta no PATH desta maquina." >&2; exit 1; }
NODE_BIN="$(command -v node)"
NODE_DIR="$(cd "$(dirname "$NODE_BIN")" && pwd)"
# O `claude` do modelo do triador (7f-b4): sem ele no PATH do job, toda chamada
# sai `nao_iniciou` (11/10). O diretório entra no PATH do plist DEPOIS do node
# (o ~/.local/bin também tem um `node`); é o do link (`command -v`), não o alvo
# versionado, que muda a cada atualização do claude. Sem claude, nem --dry-run.
CLAUDE_BIN="$(command -v claude 2>/dev/null || true)"
if [ -z "$CLAUDE_BIN" ]; then
  echo "ERRO: claude nao esta no PATH desta maquina — RECUSO instalar o job (o modelo do triador nunca rodaria)." >&2
  exit 1
fi
CLAUDE_DIR="$(cd "$(dirname "$CLAUDE_BIN")" && pwd)"

renderiza() {
  sed -e "s|{{CHECKOUT}}|$CHECKOUT|g" \
      -e "s|{{NODE_DIR}}|$NODE_DIR|g" \
      -e "s|{{CLAUDE_DIR}}|$CLAUDE_DIR|g" \
      -e "s|{{ORQ_HOME}}|$ORQ_HOME|g" \
      "$TEMPLATE"
}

CHECKOUT_FIS="$(cd "$CHECKOUT" && pwd -P)"
sob_tmp=0
case "$CHECKOUT/"     in /tmp/*|/private/tmp/*) sob_tmp=1 ;; esac
case "$CHECKOUT_FIS/" in /tmp/*|/private/tmp/*) sob_tmp=1 ;; esac

if [ "$DRY" = 0 ] && [ "$PERMITIR_TMP" = 0 ]; then
  if [ "${ORQ_TESTE:-0}" = 1 ]; then
    echo "ERRO: ORQ_TESTE=1 — RECUSO instalar o job do launchd (use --dry-run)." >&2
    exit 1
  fi
  if [ "$sob_tmp" = 1 ]; then
    echo "ERRO: checkout sob /tmp ($CHECKOUT_FIS) — RECUSO instalar o job (use --dry-run ou --permitir-tmp)." >&2
    exit 1
  fi
fi

if [ "$DRY" = 1 ]; then
  echo "# --dry-run: nada e escrito, nada e carregado." >&2
  echo "# LABEL     = $LABEL (a cada 300 s)" >&2
  echo "# CHECKOUT  = $CHECKOUT" >&2
  echo "# NODE_DIR  = $NODE_DIR  ($("$NODE_BIN" -v))" >&2
  echo "# CLAUDE    = $CLAUDE_DIR/claude" >&2
  echo "# log       = $ORQ_HOME/resolvedor/job.log" >&2
  echo "# gravaria em $DST" >&2
  renderiza
  exit 0
fi

UID_NUM="$(id -u)"
mkdir -p "$ORQ_HOME/resolvedor" "$HOME/Library/LaunchAgents"
renderiza > "$DST.tmp"
if grep -q '{{' "$DST.tmp"; then
  rm -f "$DST.tmp"
  echo "ERRO: placeholder nao resolvido" >&2
  exit 1
fi
mv "$DST.tmp" "$DST"
echo "plist instalado: $DST"

if launchctl print "gui/$UID_NUM/$LABEL" >/dev/null 2>&1; then
  echo "job ja carregado - bootout antes de recarregar (NUNCA kickstart -k)."
  launchctl bootout "gui/$UID_NUM/$LABEL" 2>/dev/null || true
fi
launchctl bootstrap "gui/$UID_NUM" "$DST"
echo "bootstrap OK: $LABEL carregado em gui/$UID_NUM (primeira passada em 300 s)"
echo ""
echo "verificar:   launchctl print gui/$UID_NUM/$LABEL | head -20"
echo "log do job:  tail -f $ORQ_HOME/resolvedor/job.log"
echo "pausar:      touch $ORQ_HOME/RESOLVEDOR_PAUSADO"
echo "desinstalar: launchctl bootout gui/$UID_NUM/$LABEL && rm -f \"$DST\""
