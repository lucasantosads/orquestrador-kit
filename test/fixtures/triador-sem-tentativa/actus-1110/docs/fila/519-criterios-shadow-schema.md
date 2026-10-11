# 519

```json
{
  "id": "519",
  "bloco": "B3",
  "frente": "criterios-etapa",
  "origem": "humano",
  "slug": "criterios-shadow-schema",
  "objetivo": "BLOQUEADO ate o 517 sair do bloqueio. Escreva supabase/migrations/0285_criterios_shadow.sql (reservado na triagem de 23/09; reconferir em staging-auto), CREATE-only e ADITIVO: colunas nullable em comercial.analyses (criterios_v2 jsonb, criterios_v2_versao text, criterios_v2_ghl_stage_ref uuid), sem backfill; public.fn_analise_criterios_v2_registrar no molde de fn_analise_etapa_v2_registrar (supabase/migrations/0171_etapa_classificador_shadow.sql:82, :112-119): escreve SO as colunas criterios_v2*, guarda de tenant no WHERE, ‹segredo› only; e, no lugar de view (o loop nao cria objeto com prefixo vw_), public.fn_criterios_shadow_comparar(p_tenant_id uuid) somente leitura, ‹segredo› only, devolvendo v1 x v2 por analise. NAO toca fn_analise_registrar_v2, score nem funnel_stage_id; nunca escreve o literal da coluna congelada (etapa_ + canonica). TESTE PGlite: a RPC so escreve as colunas novas e id de outro tenant falha alto. FORA DE ESCOPO: camada2.ts, aplicar SQL.",
  "pathspec_allowlist": [
    "supabase/migrations/0285_criterios_shadow.sql",
    "test/criterios-shadow-0285.integration.test.ts"
  ],
  "cria_novo": [
    "supabase/migrations/0285_criterios_shadow.sql",
    "test/criterios-shadow-0285.integration.test.ts"
  ],
  "dependencias": [
    "517"
  ],
  "diff_estimado": 240,
  "risco": "alto",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "teste de integracao da 0285 verde (le o rc do vitest)",
      "cmd": "node_modules/.bin/vitest run test/criterios-shadow-0285.integration.test.ts >/dev/null 2>&1 && echo TESTS_OK",
      "espera": "TESTS_OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: (a) aditivo puro, sem backfill; (b) RPC de escrita so toca criterios_v2* com guarda de tenant; (c) comparacao por funcao, nenhuma view vw_; (d) headline intocada.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "bloqueado 23/09/2026 (triagem): aguarda o 517 (decisao da fonte da etapa do GHL da conversa).",
  "tentativas": 0
}
```
