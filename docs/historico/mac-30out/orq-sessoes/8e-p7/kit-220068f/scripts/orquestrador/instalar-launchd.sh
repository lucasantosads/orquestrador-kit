#!/bin/bash
set -euo pipefail

# Instalacao assistida do agendamento do Orquestrador Autonomo.
#
# Resolve os caminhos DESTE repo e DESTA maquina (checkout + node), le do
# docs/fila/000-config.json o que e do REPO (launchd.label,
# launchd.start_interval), renderiza com.orquestrador.plist.template e carrega o
# job no dominio gui do usuario. NUNCA usa `kickstart -k` - matar um run vivo
# por cima e proibido.
#
# Uso:
#   bash scripts/orquestrador/instalar-launchd.sh            instala e carrega
#   bash scripts/orquestrador/instalar-launchd.sh --dry-run  so imprime o plist
#   bash scripts/orquestrador/instalar-launchd.sh --permitir-tmp
#                                                 instala mesmo de um checkout
#                                                 sob /tmp (veja a guarda K6e)
#
# PORTABILIDADE: CHECKOUT sai do proprio arquivo; NODE_DIR sai do `which node`.
# Rodar este script e o ato que "hospeda" o loop aqui.
#
# POR QUE O LABEL VEM DO CONFIG E NAO DAQUI (peca K6c). Ate 2026-09-08 este
# script tinha `LABEL="com.conteudos.orquestrador"` numa variavel e montava o
# caminho do template a partir dela. Instalado em outro repo, ele carregaria o
# job do conteudos-infinitos: para o launchd, dois repos com o mesmo label sao o
# MESMO job, e o segundo bootstrap derruba o primeiro em silencio.
#
# E por que ele RECUSA em vez de inventar um label a partir do nome do
# diretorio: label inventado nao produz erro visivel. Produz um SEGUNDO job
# carregado ao lado do que ja existia, os dois disparando no mesmo checkout, e
# ninguem descobre isso ate ver duas drenagens concorrendo pelo mesmo lock.
# Recusar e barulhento; adivinhar e silencioso e caro.
#
# POR QUE ELE RECUSA CHECKOUT SOB /tmp (peca K6e). Incidente de 2026-09-08: o
# "vermelho antes" da K6c chamou ESTE script com `--dry-run` contra a versao
# vendorizada DENTRO de um fixture; aquela versao nao conhecia a flag, ignorou-a
# e instalou de verdade. Das 12:24 as 14:05 o job `com.conteudos.orquestrador`
# apontou para `/private/tmp/orq-fixture-6qRp23`, tres ticks morreram com rc 127
# e nada alarmou. A licao nao e "escreva a flag antes": e que um checkout
# descartavel NUNCA e destino de instalacao, e que a guarda tem de morar em quem
# instala, nao em quem chama. Fixture vive em /tmp; repo de verdade, nao.
# `--dry-run` continua valendo la (renderizar nao instala) e `--permitir-tmp`
# existe para o caso raro em que alguem hospeda o loop num tmp de proposito — e
# entao a decisao esta escrita na linha de comando de quem a tomou.

DRY=0
PERMITIR_TMP=0
for a in "$@"; do
  case "$a" in
    --dry-run)      DRY=1 ;;
    --permitir-tmp) PERMITIR_TMP=1 ;;
    *) echo "uso: $0 [--dry-run] [--permitir-tmp]" >&2; exit 2 ;;
  esac
done

UID_NUM="$(id -u)"
CHECKOUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG="$CHECKOUT/docs/fila/000-config.json"
TEMPLATE="$CHECKOUT/scripts/orquestrador/com.orquestrador.plist.template"

[ -f "$CONFIG" ] || { echo "ERRO: config ausente: $CONFIG" >&2; exit 1; }
[ -f "$TEMPLATE" ] || { echo "ERRO: template ausente: $TEMPLATE" >&2; exit 1; }

# --- o que e do REPO, e sai do config ----------------------------------------
LABEL="$(jq -r '.launchd.label // empty' "$CONFIG" 2>/dev/null || true)"
if [ -z "$LABEL" ]; then
  echo "ERRO: defina launchd.label no config; o CI usa com.conteudos.orquestrador" >&2
  echo "      (config: $CONFIG)" >&2
  echo "      Um label por repo. Sem essa chave este script NAO escolhe um por voce:" >&2
  echo "      label inventado carrega um SEGUNDO job ao lado do antigo, em silencio." >&2
  exit 1
fi

# start_interval e opcional: 1800 e o numero MEDIDO (a justificativa esta no
# template). Faltar aqui nao e ambiguidade perigosa como o label — um intervalo
# errado atrasa a fila, um label errado junta dois repos num job so.
START_INTERVAL="$(jq -r '.launchd.start_interval // empty' "$CONFIG" 2>/dev/null || true)"
case "$START_INTERVAL" in
  ''|*[!0-9]*) START_INTERVAL=1800; echo "aviso: launchd.start_interval ausente ou nao-numerico; usando 1800 (o medido)." >&2 ;;
esac

GERADO="$CHECKOUT/scripts/orquestrador/$LABEL.plist"
DST="$HOME/Library/LaunchAgents/$LABEL.plist"

if ! command -v node >/dev/null 2>&1; then
  echo "ERRO: node nao esta no PATH desta maquina." >&2
  exit 1
fi
NODE_BIN="$(command -v node)"
NODE_DIR="$(cd "$(dirname "$NODE_BIN")" && pwd)"

[ -x "$CHECKOUT/scripts/orquestrador/launchd-run.sh" ] || {
  echo "ERRO: launchd-run.sh ausente ou sem +x" >&2; exit 1; }

# renderiza -> stdout. Um lugar so monta o plist, e o --dry-run mostra
# exatamente o que a instalacao gravaria.
renderiza() {
  sed -e "s|{{LABEL}}|$LABEL|g" \
      -e "s|{{CHECKOUT}}|$CHECKOUT|g" \
      -e "s|{{NODE_DIR}}|$NODE_DIR|g" \
      -e "s|{{START_INTERVAL}}|$START_INTERVAL|g" \
      "$TEMPLATE"
}

# --- GUARDA K6e: de onde este script NAO instala -----------------------------
# Roda DEPOIS do --dry-run? Nao: antes. O --dry-run e liberado explicitamente
# dentro dela, para que a guarda seja um lugar so e ninguem precise lembrar de
# duas ordens de checagem. O que ela barra e a INSTALACAO, nunca a renderizacao.
#
# Dois sinais, e os dois bastam sozinhos:
#   caminho  o checkout resolvido esta sob /tmp ou /private/tmp (no macOS /tmp e
#            symlink de /private/tmp, entao os dois lados sao testados: logico e
#            fisico). E onde o scripts/kit/fixture.sh instancia.
#   ORQ_TESTE=1  a declaracao explicita "quem esta rodando e script de TESTE" que
#            o lib.sh ja usa para recusar escrita fora do fixture. Um teste pode
#            copiar o fixture para fora de /tmp; a variavel viaja junto.
CHECKOUT_FIS="$(cd "$CHECKOUT" && pwd -P)"
sob_tmp=0
case "$CHECKOUT/"     in /tmp/*|/private/tmp/*) sob_tmp=1 ;; esac
case "$CHECKOUT_FIS/" in /tmp/*|/private/tmp/*) sob_tmp=1 ;; esac

if [ "$DRY" = 0 ] && [ "$PERMITIR_TMP" = 0 ]; then
  if [ "${ORQ_TESTE:-0}" = 1 ]; then
    echo "ERRO: ORQ_TESTE=1 — RECUSO instalar o job do launchd." >&2
    echo "      checkout: $CHECKOUT" >&2
    echo "      ORQ_TESTE=1 declara que quem esta rodando e script de TESTE, e" >&2
    echo "      teste nao carrega job no launchd desta maquina (incidente de" >&2
    echo "      2026-09-08). Use --dry-run para ver o plist, ou --permitir-tmp" >&2
    echo "      se a instalacao e mesmo o que voce quer." >&2
    exit 1
  fi
  if [ "$sob_tmp" = 1 ]; then
    echo "ERRO: checkout sob /tmp — RECUSO instalar o job do launchd." >&2
    echo "      checkout: $CHECKOUT" >&2
    echo "      (fisico:  $CHECKOUT_FIS)" >&2
    echo "      Um checkout descartavel nao e destino de instalacao: em" >&2
    echo "      2026-09-08 um job do launchd ficou 1h40 apontando para um" >&2
    echo "      fixture em /private/tmp, com tres ticks mortos em rc 127." >&2
    echo "      Use --dry-run para ver o plist, ou --permitir-tmp se voce" >&2
    echo "      hospeda o loop neste caminho de proposito." >&2
    exit 1
  fi
fi

if [ "$DRY" = 1 ]; then
  echo "# --dry-run: nada e escrito, nada e carregado." >&2
  echo "# LABEL          = $LABEL          (launchd.label)" >&2
  echo "# START_INTERVAL = $START_INTERVAL (launchd.start_interval)" >&2
  echo "# CHECKOUT       = $CHECKOUT" >&2
  echo "# NODE_DIR       = $NODE_DIR  ($("$NODE_BIN" -v))" >&2
  echo "# gravaria em    = $DST" >&2
  renderiza
  exit 0
fi

# O plist manda stdout/stderr para docs/fila/runs/. Sem a pasta, o launchd nao
# carrega o job e a falha aparece so no log do sistema.
mkdir -p "$CHECKOUT/docs/fila/runs"

echo "LABEL    = $LABEL"
echo "CHECKOUT = $CHECKOUT"
echo "NODE_DIR = $NODE_DIR  ($("$NODE_BIN" -v))"
echo ""

renderiza > "$GERADO"

if grep -q '{{' "$GERADO"; then
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
echo "log do job:  tail -f $CHECKOUT/docs/fila/runs/launchd-agent.log"
echo "log do loop: tail -f $CHECKOUT/docs/fila/runs/launchd.log"
echo "pausar fila: ./scripts/orq pausar \"motivo\""
echo "desinstalar: launchctl bootout gui/$UID_NUM/$LABEL && rm -f \"$DST\""
