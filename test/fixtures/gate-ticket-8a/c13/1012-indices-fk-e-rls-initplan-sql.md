# Ticket 1012: índices nas FKs mais usadas e RLS das ops_* sem recálculo por linha (.sql)

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Plano de conserto, item 3.2. Só escreve o `.sql`; aplicar é do Lucas (token `humano:ddl-1012`).

- **Índices**: 21 índices em chaves estrangeiras de tabelas do OS que crescem por cliente/conta e hoje fazem varredura sequencial (advisor de 11/10: 167 FKs sem índice; escolhidas as do OS com mais varreduras ou filtro por cliente). Nenhuma tabela C0: as FKs sem índice mais varridas do banco são do comercial (`clientes_receita.lead_id`, `leads_crm.contrato_id`, `contratos.*`) e ficam fora, porque o OS não aplica DDL nelas.
- **RLS**: as 12 tabelas apontadas pelo advisor (`auth_rls_initplan`) têm a policy `service_role_only` com `auth.role() = 'service_role'`, recalculada por linha. Vira `(select auth.role()) = 'service_role'` com `alter policy` (mesma regra, avaliada uma vez por consulta).

Tabelas pequenas hoje (menos de mil linhas): o `create index` trava escrita por milissegundos.

## Campos de máquina

```json
{
  "id": "1012",
  "slug": "indices-fk-e-rls-initplan-sql",
  "lane": "dados",
  "perfil": "sql-proposta",
  "objetivo": "ORCAMENTO DE DIFF: teto de 140 linhas (so o .sql NOVO supabase/migrations/20261011100000_indices_fk_e_rls_initplan.sql). Se passar do teto, pare e reporte. CONTEXTO (plano de conserto item 3.2; advisors de performance de 11/10 e pg_stat_user_tables): 167 FKs sem indice; 12 tabelas com policy recalculada por linha (auth_rls_initplan). Escolhidas as FKs de tabelas do OS (perf_*, ops_*, tarefas_kanban) que crescem por cliente ou conta e ja tem varredura sequencial. As 12 policies se chamam service_role_only, FOR ALL, TO public, USING (auth.role() = 'service_role'::text), sem WITH CHECK. FAZER: NOVO supabase/migrations/20261011100000_indices_fk_e_rls_initplan.sql no molde de supabase/migrations/20261008140518_alerta_regra_pacing_verba.sql (cabecalho com 'APLICAR E HUMANO. Este arquivo e so a proposta versionada.', POR QUE, QUEM APLICA com token humano:ddl-1012 e Reversao; nunca escreva 'nao aplicada' no cabecalho). Conteudo: (1) 21 create index if not exists public.idx_<tabela>_<colunas> on public.<tabela> (<colunas>): perf_crm_oportunidades (pipeline_id, location_id); perf_crm_oportunidades (etapa_id, pipeline_id); perf_sync_logs (connection_id); perf_meta_campanhas (ad_account_id); perf_otimizacoes (ad_account_id); perf_meta_ad_map (ad_account_id); perf_fechamentos (ad_account_id); perf_fechamentos (tese_id); perf_promessas (cliente_id); perf_promessas (tarefa_id); ops_tarefa_ocorrencia (cliente_id); ops_tarefa_ocorrencia (tarefa_kanban_id); tarefas_kanban (escopo_id); tarefas_kanban (onboarding_etapa_id); perf_eventos_produtividade (cliente_id); perf_alerta_ocorrencias (tese_id); perf_nps_disparo_fila (cliente_id); ops_briefing_resposta (cliente_id); perf_cliente_projecao_mensal (cliente_id); perf_vacuo_tratado (cliente_id); perf_ia_uso (modelo_id). (2) Para cada uma das 12 tabelas: alter policy service_role_only on public.<tabela> using ((select auth.role()) = 'service_role'); tabelas: ops_briefing_resposta, ops_briefing_template, ops_cliente_produtos, ops_onboarding, ops_onboarding_etapas, ops_onboarding_templates, ops_produtos, ops_tarefa_ocorrencia, ops_tarefa_template, ops_template_etapas, contratual_entregas, contratual_comunicacoes. Reversao no cabecalho: drop index if exists de cada indice e alter policy de volta para auth.role() = 'service_role'. Nada de create policy, drop policy, security definer, grant/revoke ou tabela C0; nao cite nome de tabela C0 em comentario. Regras do repo: sem .json() novo em src (lerCorpoJson nas rotas); mensagens humanas sem nome de tabela; sem travessao (U+2014); getSession server-only; nenhuma escrita em zona C0 (clientes_receita, leads_crm*, trafego_*, ads_metadata, ads_performance, vw_atribuicao_proporcional). PROIBIDO remover assercao, afrouxar matcher ou usar .skip/.only. Aplicar o .sql e do Lucas (o loop so escreve o arquivo). FORA DE ESCOPO: indices nao usados (244), indices duplicados, FKs de tabela do comercial, outras policies, codigo em src.",
  "cria_novo": [
    "supabase/migrations/20261011100000_indices_fk_e_rls_initplan.sql"
  ],
  "pathspec_allowlist": [
    "supabase/migrations/20261011100000_indices_fk_e_rls_initplan.sql"
  ],
  "dependencias": [],
  "prioridade": 40,
  "recon_esperado": [
    {
      "descricao": "supabase/migrations/20261011100000_indices_fk_e_rls_initplan.sql ainda nao existe",
      "cmd": "test -e 'supabase/migrations/20261011100000_indices_fk_e_rls_initplan.sql' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "nenhuma migration cria estes indices hoje",
      "cmd": "n=$(grep -l 'idx_perf_sync_logs_connection_id' supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo SEM_INDICE || echo ST_$n",
      "espera": "SEM_INDICE"
    }
  ],
  "colunas_escritas": [
    "ops_briefing_resposta.cliente_id",
    "ops_tarefa_ocorrencia.cliente_id",
    "ops_tarefa_ocorrencia.tarefa_kanban_id",
    "perf_alerta_ocorrencias.tese_id",
    "perf_cliente_projecao_mensal.cliente_id",
    "perf_crm_oportunidades.etapa_id",
    "perf_crm_oportunidades.location_id",
    "perf_crm_oportunidades.pipeline_id",
    "perf_eventos_produtividade.cliente_id",
    "perf_fechamentos.ad_account_id",
    "perf_fechamentos.tese_id",
    "perf_ia_uso.modelo_id",
    "perf_meta_ad_map.ad_account_id",
    "perf_meta_campanhas.ad_account_id",
    "perf_nps_disparo_fila.cliente_id",
    "perf_otimizacoes.ad_account_id",
    "perf_promessas.cliente_id",
    "perf_promessas.tarefa_id",
    "perf_sync_logs.connection_id",
    "perf_vacuo_tratado.cliente_id",
    "tarefas_kanban.escopo_id",
    "tarefas_kanban.onboarding_etapa_id"
  ],
  "criterios_aceite": [
    {
      "descricao": "tsc nao regride alem do baseline de 3 (src/ e test/, sem ruido de .next)",
      "cmd": "( [ \"$(npx tsc --noEmit 2>&1 | grep 'error TS' | grep -vc '^\\.next/')\" = 3 ] ) && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'supabase/migrations/20261011100000_indices_fk_e_rls_initplan.sql' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 140 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 140 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais seguem verdes",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "so 1 .sql novo e e o dos indices e policies",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); m=$(git diff --name-only \"$b\" HEAD | grep -cF 'supabase/migrations/20261011100000_indices_fk_e_rls_initplan.sql'); [ \"$n\" = 1 ] && [ \"$m\" = 1 ] && echo SQL_CERTO || echo ST_${n}_${m}",
      "espera": "SQL_CERTO",
      "tipo": "alvo"
    },
    {
      "descricao": "21 indices e 12 alter policy com select",
      "cmd": "a=$(grep -ci 'create index if not exists' 'supabase/migrations/20261011100000_indices_fk_e_rls_initplan.sql'); b=$(grep -ci 'alter policy service_role_only' 'supabase/migrations/20261011100000_indices_fk_e_rls_initplan.sql'); c=$(grep -ci '(select auth.role())' 'supabase/migrations/20261011100000_indices_fk_e_rls_initplan.sql'); d=$(grep -ciE 'create policy|drop policy|security definer|grant |revoke ' 'supabase/migrations/20261011100000_indices_fk_e_rls_initplan.sql'); [ \"$a\" = 21 ] && [ \"$b\" = 12 ] && [ \"$c\" -ge 12 ] && [ \"$d\" = 0 ] && echo SQL_CERTO || echo ST_${a}_${b}_${c}_${d}",
      "espera": "SQL_CERTO",
      "tipo": "alvo"
    },
    {
      "descricao": "testes que varrem as migrations seguem verdes (test/c0-guard.test.ts, test/migrations-cabecalho-aplicada.test.ts, test/migrations-policy-idempotente.test.ts, test/migration-security-definer-anon.test.ts)",
      "cmd": "npx vitest run 'test/c0-guard.test.ts' 'test/migrations-cabecalho-aplicada.test.ts' 'test/migrations-policy-idempotente.test.ts' 'test/migration-security-definer-anon.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "avaliador: o .sql cria so os indices pedidos (if not exists, nas colunas da FK) e troca auth.role() por (select auth.role()) nas 12 policies com alter policy, com cabecalho de proposta, token e reversao. REPROVE se: toca tabela C0 ou do comercial; cria ou derruba policy; muda a regra da policy; falta reversao; cabecalho diz nao aplicada; mais de 1 .sql.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/c0-guard.test.ts",
      "motivo": "varrem a pasta supabase/migrations; o .sql novo segue o molde de 20261008140518 (cabecalho de proposta, sem create policy, sem security definer, sem tabela C0); se quebrar, PARE e descreva"
    },
    {
      "teste": "test/migration-security-definer-anon.test.ts",
      "motivo": "varrem a pasta supabase/migrations; o .sql novo segue o molde de 20261008140518 (cabecalho de proposta, sem create policy, sem security definer, sem tabela C0); se quebrar, PARE e descreva"
    },
    {
      "teste": "test/migrations-cabecalho-aplicada.test.ts",
      "motivo": "varrem a pasta supabase/migrations; o .sql novo segue o molde de 20261008140518 (cabecalho de proposta, sem create policy, sem security definer, sem tabela C0); se quebrar, PARE e descreva"
    },
    {
      "teste": "test/migrations-policy-idempotente.test.ts",
      "motivo": "varrem a pasta supabase/migrations; o .sql novo segue o molde de 20261008140518 (cabecalho de proposta, sem create policy, sem security definer, sem tabela C0); se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sync-log-status.test.ts",
      "motivo": "varrem a pasta supabase/migrations; o .sql novo segue o molde de 20261008140518 (cabecalho de proposta, sem create policy, sem security definer, sem tabela C0); se quebrar, PARE e descreva"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```
