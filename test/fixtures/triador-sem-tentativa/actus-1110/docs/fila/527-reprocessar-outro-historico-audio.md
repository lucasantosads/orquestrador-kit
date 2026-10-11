# 527

```json
{
  "id": "527",
  "bloco": "B4",
  "frente": "ingestao-ghl",
  "origem": "humano",
  "slug": "reprocessar-outro-historico-audio",
  "objetivo": "BLOQUEADO ate 496 done e a causa corrigida (525 ou 526). Estender src/lib/comercial/midia/reprocessar.ts (do 496) para selecionar mensagens tipo outro com metadata.tipoFonte = 'ghlwf:recuperado_detalhe' e conteudoNaoRecuperado = true, resolver o messageId pelo webhook_event de origem (external_id = webhook_events.id, diagnostico do 509) e, SO quando o anexo de audio for resolvido, trocar a mensagem para audio com ReferenciaMidia via referenciaMidiaAudioGhl (nunca ponteiro inventado). Rodar duas vezes nao duplica messages nem midia; teto por execucao respeitado.",
  "pathspec_allowlist": [
    "src/lib/comercial/midia/reprocessar.ts",
    "src/lib/comercial/midia/reprocessar.test.ts",
    "src/app/api/jobs/reprocessar-midias/route.ts"
  ],
  "dependencias": [
    "496",
    "humano:506-causa-corrigida"
  ],
  "diff_estimado": 260,
  "risco": "alto",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "teste do reprocessador verde (le o rc do vitest)",
      "cmd": "node_modules/.bin/vitest run src/lib/comercial/midia/reprocessar.test.ts >/dev/null 2>&1 && echo TESTS_OK",
      "espera": "TESTS_OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: (a) so vira audio quando o anexo e resolvido; (b) idempotente com fake com estado; (c) teto respeitado; (d) chave do messageId pelo webhook_event de origem.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "bloqueado 23/09/2026 (triagem): aguarda 496 done e a causa corrigida pelo 525 ou pelo 526 (dependencia OU, por isso via token). Liberar com humano:506-causa-corrigida.",
  "tentativas": 0
}
```
