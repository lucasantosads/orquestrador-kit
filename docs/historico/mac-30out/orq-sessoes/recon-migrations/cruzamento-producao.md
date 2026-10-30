# Cruzamento repo x producao (ogfnojbbvumujzfklkhh), 18/10/2026 ~14:10, so SELECT

Base: 272 arquivos de supabase/migrations (uniao main + staging-auto + staging-apolo, do arquivos-migrations.tsv) x 491 linhas de supabase_migrations.schema_migrations. Nome comparado sem o prefixo numerico.

- Versao igual e nome igual: 151
- Versao igual e nome diferente: 1 (20260701214803: arquivo backfill_tasks_port_e_fase2_advpro, producao fase2_metodo_advpro_e_vinculo_etapa)
- Casou so pelo nome (versao diferente): 84
- Arquivo sem producao (nem versao nem nome): 38
- Producao sem arquivo: 256 (05=107, 06=58, 07=35, 08=11, 09=16, 10=29)

Arquivos sem producao recentes (provaveis pendentes de aplicacao):
20261007190900_churn_fecha_leitura_anon, 20261017230300_inteligencia_comercial_nota_ghl, 20261018001000_inteligencia_capacidade_registro, 20261018003100_nps_fila_e_resposta_por_contato, 20261018003200_employees_public_sem_anon, 20261019000100_nps_fila_sai_chave_notion (contracao)

Arquivos sem producao antigos (aplicados com outro nome, descartados ou nunca aplicados; conferir objeto no banco):
20260525_meta_insights_campaigns, 20260525_cs_module_tables, 20260601_create_perf_teses, 20260601_perf_nichos, 20260620_tkt-dossie_* (4), 20260623_tkt-rbac_v2_ops_permissao_fundacao, 20260626_ops_esta_na_subarvore, 20260628_perf_reuniao, 20260628_perf_health_snapshot, 20260715000000_meta_ad_accounts_cliente_id, 20260716000002_ops_acoes_recomendadas, 20260818000001_vw_onboarding_atraso_ancora, 20260819000000_employees_drop_senha_legado, 20260903120000_revoke_anon_views_publicas, 20260916_perf_crm_cliente, 20260921120000_espelho_config_funil_campanha, 20260922100001 a 20260922100012 (d1 a d12, 12 arquivos), 20260929000002_employees_nivel_acesso

Producao sem arquivo desde 04/10 (DDL aplicada fora do repo do Comarka): 29
plano_metas_* (6), regras_lead (2), webinar_* (18), revoke_anon_audit_baseline_metrics, folha_pagamento_employee_id, clientes_receita_status_log, perf_lead_eventos_tipo_ctwa, trava_exclusoes_meses_fechados_leads
