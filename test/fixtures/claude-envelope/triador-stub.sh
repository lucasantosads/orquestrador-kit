#!/usr/bin/env bash
# triador-stub.sh — o `claude` dos testes do triador (etapa 7f): NUNCA chama API.
# Registra os argumentos e o tamanho da entrada em $STUB_LOG, guarda a entrada
# em $STUB_ENTRADA (se definido) e responde o conteúdo de $STUB_RESPOSTA (o
# envelope de `claude -p --output-format json`). Sai com $STUB_RC (padrão 0).
entrada="$(cat)"
printf '%s\t%s\n' "$*" "${#entrada}" >> "${STUB_LOG:-/dev/null}"
if [ -n "${STUB_ENTRADA:-}" ]; then printf '%s' "$entrada" > "$STUB_ENTRADA"; fi
cat "${STUB_RESPOSTA:?STUB_RESPOSTA sem valor}"
exit "${STUB_RC:-0}"
