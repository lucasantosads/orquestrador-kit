# 520

```json
{
  "id": "520",
  "bloco": "B3",
  "frente": "criterios-etapa",
  "origem": "humano",
  "slug": "criterios-shadow-fiacao",
  "objetivo": "BLOQUEADO ate 517, 518 e 519. Em src/lib/comercial/analise/camada2.ts, depois do registro da analise (mesmo ponto do classificador de etapa, ~L545): se e so se fn_analise_criterio_etapa devolveu criterio, faz a segunda chamada com montarChamada(ctx, criterio) -> parseRespostaAnalise -> avaliarScore -> fn_analise_criterios_v2_registrar. Sem criterio: nenhuma chamada extra, nenhuma escrita. Fail-open (log.warn, sombra nula). Ledger com nome de operacao distinto de analise_conversa. Parametros de fn_analise_registrar_v2 inalterados. TESTE em camada2.test.ts (molde do bloco do classificador, ~L766): sem criterio, uma chamada ao provider e a RPC da sombra nao e chamada; com criterio, duas chamadas e a sombra gravada; falha na sombra nao derruba a analise.",
  "pathspec_allowlist": [
    "src/lib/comercial/analise/camada2.ts",
    "src/lib/comercial/analise/camada2.test.ts"
  ],
  "dependencias": [
    "517",
    "518",
    "519"
  ],
  "diff_estimado": 220,
  "risco": "alto",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "camada2.test verde (le o rc do vitest)",
      "cmd": "node_modules/.bin/vitest run src/lib/comercial/analise/camada2.test.ts >/dev/null 2>&1 && echo TESTS_OK",
      "espera": "TESTS_OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: (a) sombra so com criterio e depois do registro; (b) fail-open; (c) operacao distinta no ledger; (d) headline inalterada, provada por teste.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "bloqueado 23/09/2026 (triagem): aguarda 517, 518 e 519.",
  "tentativas": 0
}
```
