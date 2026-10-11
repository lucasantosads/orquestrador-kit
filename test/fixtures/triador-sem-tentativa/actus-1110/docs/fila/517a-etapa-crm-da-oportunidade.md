# 517a

```json
{
  "id": "517a",
  "bloco": "B3",
  "frente": "criterios-etapa",
  "origem": "humano",
  "slug": "etapa-crm-da-oportunidade",
  "objetivo": "PRODUCAO PROIBIDA: nao rode SQL, nao chame API. Recon ja feito (prosa do ticket, com arquivo:linha); reconfira os nomes no disco antes de escrever. OBJETIVO: ao processar um evento de oportunidade do GHL (job ghl_ingest_lead, src/lib/connectors/ghl/ingest.ts:65 ingestGhlLead), gravar em comercial.conversations.etapa_crm o pipelineStageId CRU do GHL (texto, sem traducao) na conversa do contato. (1) src/lib/connectors/ghl/types.ts: GhlLeadEvent ganha contactId e opportunityId lidos SEPARADOS (contactId|contact_id; opportunityId|opportunity_id, e o id do topo quando type comeca com 'Opportunity') e stageAtualizadoEm (lastStageChangeAt|dateUpdated|date_updated|updatedAt), sem mudar a identidade externalId de hoje (types.ts:71-74). (2) supabase/migrations/0288_conversa_etapa_crm_oportunidade.sql, CREATE-only (nenhum create or replace, nenhum alter de objeto existente): tabela comercial.conversa_oportunidade_etapa (tenant_id, ghl_opportunity_id, ghl_contact_id, ghl_stage_id, atualizada_em, created_at, updated_at; PK (tenant_id, ghl_opportunity_id); RLS ligada, sem policy para authenticated) e public.fn_conversa_etapa_crm_registrar(p_tenant_id uuid, p_ghl_contact_id text, p_ghl_opportunity_id text, p_ghl_stage_id text, p_atualizada_em timestamptz) returns jsonb, SECURITY DEFINER, set search_path to '', grant so a ‹segredo›: upsert da oportunidade que so avanca se p_atualizada_em (coalesce com now()) for >= o gravado; depois acha a conversa por tenant_id + external_id = 'ghlwf:' || p_ghl_contact_id + deleted_at is null e faz update de etapa_crm = ghl_stage_id da oportunidade de MAIOR atualizada_em daquele contato (REGRA: contato com mais de uma oportunidade = vale a de atualizacao mais recente; escreva-a num comentario da funcao). NUNCA insere em comercial.conversations: contato sem conversa devolve {status:'sem_conversa'} e o chamador loga (log.info com tenant_id e opportunity_id, sem telefone). Devolve {status:'atualizada', conversation_id, ghl_stage_id} no caso positivo. (3) ingest.ts: depois do upsert do lead, se o evento tem contactId, opportunityId e stageId, chama a RPC pelo svc (deps injetavel, como insertLead/updateLead em :163-180); faltando qualquer um, nao chama e loga o campo ausente. Falha da RPC sobe como erro do job (nunca engolida). TESTE test/etapa-crm-oportunidade-0288.integration.test.ts em PGlite (molde src/lib/comercial/analise/motor.integration.test.ts), aplicando a 0288: (a) evento de oportunidade grava etapa_crm na conversa ghlwf:<contactId>; (b) contra-teste: duas oportunidades do mesmo contato, a mais recente vence mesmo chegando PRIMEIRO (a antiga chega depois e nao regride); (c) no MESMO it: contato sem conversa devolve sem_conversa e a contagem de comercial.conversations nao muda, e a conversa existente de outro contato foi atualizada (assercao positiva); (d) conversa de outro tenant com o mesmo external_id nao e tocada. Os testes existentes de src/lib/connectors/ghl continuam verdes sem afrouxar assercao. FORA DE ESCOPO: backfill (517b), leitura do criterio (517), pipeline_id, public.leads, rotas de webhook, aplicar SQL.",
  "pathspec_allowlist": [
    "supabase/migrations/0288_conversa_etapa_crm_oportunidade.sql",
    "src/lib/connectors/ghl/types.ts",
    "src/lib/connectors/ghl/types.test.ts",
    "src/lib/connectors/ghl/ingest.ts",
    "src/lib/connectors/ghl/ingest.test.ts",
    "test/etapa-crm-oportunidade-0288.integration.test.ts"
  ],
  "cria_novo": [
    "supabase/migrations/0288_conversa_etapa_crm_oportunidade.sql",
    "test/etapa-crm-oportunidade-0288.integration.test.ts"
  ],
  "dependencias": [
    "515",
    "humano:fonte-etapa-ghl-conversa-decidida",
    "humano:ghl-evento-oportunidade-confirmado"
  ],
  "diff_estimado": 320,
  "risco": "alto",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "teste de integracao da 0288 verde (le o rc do vitest)",
      "cmd": "node_modules/.bin/vitest run test/etapa-crm-oportunidade-0288.integration.test.ts >/dev/null 2>&1 && echo TESTS_OK",
      "espera": "TESTS_OK"
    },
    {
      "tipo": "alvo",
      "descricao": "testes do conector GHL continuam verdes (le o rc do vitest)",
      "cmd": "node_modules/.bin/vitest run src/lib/connectors/ghl >/dev/null 2>&1 && echo TESTS_OK",
      "espera": "TESTS_OK"
    },
    {
      "tipo": "alvo",
      "descricao": "a funcao nova existe na 0288",
      "cmd": "{ grep -ciE 'create[[:space:]]+function[[:space:]]+public\\.fn_conversa_etapa_crm_registrar' supabase/migrations/0288_conversa_etapa_crm_oportunidade.sql || true; }",
      "espera": "^1$",
      "exemplos_regex": [
        {
          "regex": "create[[:space:]]+function[[:space:]]+public\\.fn_conversa_etapa_crm_registrar",
          "positivo": "create function public.fn_conversa_etapa_crm_registrar(",
          "negativo": "create or replace function public.fn_conversa_etapa_crm_registrar(",
          "flags": "-iE"
        }
      ]
    },
    {
      "tipo": "guarda",
      "descricao": "0288 e CREATE-only: nenhum create or replace",
      "cmd": "{ grep -ciE 'create[[:space:]]+or[[:space:]]+replace' supabase/migrations/0288_conversa_etapa_crm_oportunidade.sql || true; }",
      "espera": "^0$",
      "exemplos_regex": [
        {
          "regex": "create[[:space:]]+or[[:space:]]+replace",
          "positivo": "create or replace function public.fn_analise_contexto(",
          "negativo": "create function public.fn_conversa_etapa_crm_registrar(",
          "flags": "-iE"
        }
      ]
    },
    {
      "tipo": "guarda",
      "descricao": "0288 nunca cria conversa: nenhum insert em comercial.conversations",
      "cmd": "{ grep -ciE 'insert[[:space:]]+into[[:space:]]+comercial\\.conversations([[:space:]]|\\()' supabase/migrations/0288_conversa_etapa_crm_oportunidade.sql || true; }",
      "espera": "^0$",
      "exemplos_regex": [
        {
          "regex": "insert[[:space:]]+into[[:space:]]+comercial\\.conversations([[:space:]]|\\()",
          "positivo": "  insert into comercial.conversations (tenant_id, external_id)",
          "negativo": "  insert into comercial.conversa_oportunidade_etapa (tenant_id, ghl_opportunity_id)",
          "flags": "-iE"
        }
      ]
    },
    {
      "tipo": "guarda",
      "descricao": "nada fora da allowlist (grep -v conta o que sobra)",
      "cmd": "{ git diff --name-only $BASE_REF...HEAD | grep -vcE '^supabase/migrations/0288_conversa_etapa_crm_oportunidade\\.sql$|^src/lib/connectors/ghl/(types|ingest)(\\.test)?\\.ts$|^test/etapa-crm-oportunidade-0288\\.integration\\.test\\.ts$' || true; }",
      "espera": "^0$",
      "exemplos_regex": [
        {
          "regex": "^supabase/migrations/0288_conversa_etapa_crm_oportunidade\\.sql$|^src/lib/connectors/ghl/(types|ingest)(\\.test)?\\.ts$|^test/etapa-crm-oportunidade-0288\\.integration\\.test\\.ts$",
          "positivo": "src/lib/connectors/ghl/ingest.test.ts",
          "negativo": "src/lib/jobs/runner.ts"
        }
      ]
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: (a) etapa_crm recebe o pipelineStageId cru, sem traducao, so por RPC definer ‹segredo›-only; (b) nenhum insert em comercial.conversations e contato sem conversa so loga; (c) regra 'vale a oportunidade de atualizacao mais recente' escrita na funcao e provada no contra-teste com a antiga chegando depois; (d) o it de contato sem conversa tem assercao positiva de outra conversa atualizada; (e) identidade externalId do lead inalterada e falha da RPC sobe como erro do job; (f) 0288 CREATE-only com RLS na tabela nova.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "bloqueado 24/09/2026 (criacao): PASSO 0 do Lucas mandou PARAR se o evento nao chega. O caminho no codigo existe (rotas -> ghl_ingest_lead -> ingestGhlLead), mas a evidencia de producao (leads.etapa_atual parado em 29/07, zero na Covas) indica que nenhum evento de oportunidade e processado, e os escopos registrados da Covas nao tem opportunities.readonly. Configuracao necessaria na prosa (PASSO 0, itens 1-4). Liberar com humano:ghl-evento-oportunidade-confirmado e mudar status para pendente. 24/09/2026: CONFIRMADO em producao pelo chat de auditoria: nos ultimos 30 dias webhook_events so tem OutboundMessage, InboundMessage, ConversationUnreadUpdate, INSTALL e UNINSTALL; ZERO eventos de oportunidade nos dois tenants. Segue bloqueado ate humano:ghl-evento-oportunidade-confirmado (configuracao do app no GHL, PASSO 0 itens 1-4).",
  "tentativas": 0
}
```
