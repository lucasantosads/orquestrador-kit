# 521

```json
{
  "id": "521",
  "bloco": "B3",
  "frente": "criterios-etapa",
  "origem": "humano",
  "slug": "criterios-shadow-telemetria",
  "objetivo": "BLOQUEADO ate 519 e 520. Escreva supabase/migrations/0286_criterios_shadow_telemetria.sql (reservado na triagem de 23/09; reconferir em staging-auto) no molde de supabase/migrations/0262_etapa_v2_telemetria.sql: por tenant e por criterios_v2_versao, quantas analises tem sombra e a divergencia v1 x v2, somente leitura, ‹segredo› only; helper de leitura no molde de src/lib/comercial/analise/etapa-shadow-telemetria.test.ts. Nenhuma tela le a sombra como headline.",
  "pathspec_allowlist": [
    "supabase/migrations/0286_criterios_shadow_telemetria.sql",
    "src/lib/comercial/analise/criterios-shadow-telemetria.ts",
    "src/lib/comercial/analise/criterios-shadow-telemetria.test.ts"
  ],
  "cria_novo": [
    "supabase/migrations/0286_criterios_shadow_telemetria.sql",
    "src/lib/comercial/analise/criterios-shadow-telemetria.ts",
    "src/lib/comercial/analise/criterios-shadow-telemetria.test.ts"
  ],
  "dependencias": [
    "519",
    "520"
  ],
  "diff_estimado": 200,
  "risco": "alto",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "teste da telemetria verde (le o rc do vitest)",
      "cmd": "node_modules/.bin/vitest run src/lib/comercial/analise/criterios-shadow-telemetria.test.ts >/dev/null 2>&1 && echo TESTS_OK",
      "espera": "TESTS_OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: (a) somente leitura, ‹segredo› only, por tenant e versao; (b) nenhuma tela usa a sombra como headline.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "bloqueado 23/09/2026 (triagem): aguarda 519 e 520.",
  "tentativas": 0
}
```
