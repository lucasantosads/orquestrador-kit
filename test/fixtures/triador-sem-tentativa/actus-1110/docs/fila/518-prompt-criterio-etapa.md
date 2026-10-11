# 518

```json
{
  "id": "518",
  "bloco": "B3",
  "frente": "criterios-etapa",
  "origem": "humano",
  "slug": "prompt-criterio-etapa",
  "objetivo": "BLOQUEADO ate o 517 sair do bloqueio. Em src/lib/comercial/analise/prompt.ts: montarChamada(ctx, criterio?) com segundo argumento OPCIONAL; com undefined, null ou criterio de entrada e saida vazios, system e user sao byte a byte os de hoje (o golden do 516 segue verde SEM tocar nos literais). Com criterio, a chave criterios_da_etapa_crm { etapa, criterio_entrada, criterio_saida } entra por spread condicional no FIM do objeto de <CONTEXTO_NEGOCIO>, depois de script_da_etapa, mais UMA linha instrutiva no user so quando ha criterio. Exporte PROMPT_CRITERIOS_VERSAO = 'v1-criterio-ghl'. NUCLEO_ANALISE e FORMATO_SAIDA sem diff. Tipo do criterio em tipos.ts. Testes novos em prompt.test.ts provam posicao da chave e a linha so com criterio. FORA DE ESCOPO: camada2.ts (o caminho headline continua chamando montarChamada(ctx)).",
  "pathspec_allowlist": [
    "src/lib/comercial/analise/prompt.ts",
    "src/lib/comercial/analise/tipos.ts",
    "src/lib/comercial/analise/prompt.test.ts"
  ],
  "dependencias": [
    "516",
    "517"
  ],
  "diff_estimado": 160,
  "risco": "alto",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "prompt.test verde (golden do 516 intacto) (le o rc do vitest)",
      "cmd": "node_modules/.bin/vitest run src/lib/comercial/analise/prompt.test.ts >/dev/null 2>&1 && echo TESTS_OK",
      "espera": "TESTS_OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: (a) golden do 516 sem alteracao nos literais e verde; (b) chave nova no fim de <CONTEXTO_NEGOCIO>; (c) linha instrutiva so com criterio; (d) NUCLEO_ANALISE e FORMATO_SAIDA sem diff; (e) constante de versao exportada.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "bloqueado 23/09/2026 (triagem): aguarda o 517 (decisao da fonte da etapa do GHL da conversa).",
  "tentativas": 0
}
```
