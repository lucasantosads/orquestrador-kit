# Migrations 18/10: decisões do chat do Orquestrador (itens 1 a 5)

Data: 18/10/2026, tarde. Branch `motor/mcp-estrito-1810`, worktree `~/Projetos/_worktrees/motor-mcp-1810`, sobre `origin/main b01d9d5`. Nada publicado, nada aplicado no banco, nenhum push.

## Resumo

| Item | Estado |
|---|---|
| 1. Executor e juiz sem conector | **Feito e testado.** Commits `be29327` e `3a778e2` (`MOTOR:`). Teste vermelho antes (4 falhas), verde depois (9 ok). Falta publicar |
| 2. Regra de um caminho só | **Feito.** `CLAUDE.md`, `.claude/rules/banco.md`, skill e mensagem da guarda (`b75aedc`, `06ba023`). Falta publicar |
| 3. Linha de base em 18/10 | **Feito** no mesmo par de commits. Pendência: versionar a lista das 491 versões do ledger de 18/10 para a skill comparar |
| 4. Destravar a fila | **Não apliquei.** A skill só roda quando o Lucas digita `/aplicar-migration-ddl`, e a leitura do banco foi negada nesta sessão. Conferência estática pronta: **3 podem ir, o 1337 não pode** (quebra o dashboard-comercial). O `20261007190900` está absorvido |
| 5. Levantamento | **Feito pelo repo e pelo mapa do banco de 03/10** (`docs/mapa/raw/`). A leitura ao vivo foi negada. Os 32 arquivos: nenhum "nunca aplicado" com objeto ausente comprovado. As 29: 28 do dashboard-comercial e 1 do Comarka |

Para publicar (o Lucas roda): `bash scripts/publicar.sh motor/mcp-estrito-1810 /Users/lucasantos/Projetos/_worktrees/motor-mcp-1810 06ba023`

---

## 1. Executor e juiz sem o conector do Supabase

O que mudou:
- `lib.sh`: `ORQ_MCP_VAZIO="$ORQ_LIB_DIR/mcp-vazio.json"`, um caminho absoluto. O arquivo novo `scripts/orquestrador/mcp-vazio.json` contém `{"mcpServers": {}}`.
- `executor.sh` (chamada do executor, linha 577) e `avaliador.sh` (chamada do juiz, linha 136): `--mcp-config "$ORQ_MCP_VAZIO" --strict-mcp-config`.
- O probe do preflight (`executor.sh:894`) também recebeu as flags. Achado da revisão independente: sem elas, um `mcp-vazio.json` ausente passaria no preflight e queimaria tentativa do ticket, em vez de abortar com "zero tentativa".

Diff do motor:

```diff
--- a/scripts/orquestrador/avaliador.sh
+++ b/scripts/orquestrador/avaliador.sh
@@ -133,6 +133,7 @@ av_claude_rc=0
 claude_run "$ROOT" "$RUNDIR/avaliador-claude.txt" "$AV_TIMEOUT" -- \
     -p "$(cat "$PROMPT_FILE")" --allowedTools "Read" \
     --disallowedTools "Bash,Edit,Write,WebFetch,WebSearch" \
+    --mcp-config "$ORQ_MCP_VAZIO" --strict-mcp-config \
     --output-format text --model "$AV_MODEL" || av_claude_rc=$?
--- a/scripts/orquestrador/executor.sh
+++ b/scripts/orquestrador/executor.sh
@@ -574,6 +574,7 @@ run_ticket() {
         -p "$(cat "$rundir/prompt.txt")" \
         --allowedTools "$ALLOWED_TOOLS" \
         --disallowedTools "$DISALLOWED_TOOLS" \
+        --mcp-config "$ORQ_MCP_VAZIO" --strict-mcp-config \
         --output-format text --model "$exec_model" || claude_rc=$?
@@ -890,7 +891,8 @@ preflight() {
-    claude_run "$ROOT" "$probe" 60 -- -p "responda apenas: ok" --output-format text --model "$pm" || rc=$?
+    claude_run "$ROOT" "$probe" 60 -- -p "responda apenas: ok" \
+      --mcp-config "$ORQ_MCP_VAZIO" --strict-mcp-config --output-format text --model "$pm" || rc=$?
--- a/scripts/orquestrador/lib.sh
+++ b/scripts/orquestrador/lib.sh
@@ -626,6 +626,15 @@ mark_adiado() {
+# --- MCP do motor: nenhum -----------------------------------------------------
+# Executor e juiz chamam `claude -p` com --strict-mcp-config --mcp-config
+# "$ORQ_MCP_VAZIO": só valem os servidores deste JSON, e ele não tem nenhum.
+# Decisão de 18/10/2026: sem isso, o conector do Supabase da conta claude.ai
+# carregava no headless, barrado só pela allowlist (runs 5044, 5045, 5048:
+# "list_projects negado"; 475: "execute_sql ... negado").
+# Teste: test-mcp-estrito.sh.
+ORQ_MCP_VAZIO="$ORQ_LIB_DIR/mcp-vazio.json"
--- /dev/null
+++ b/scripts/orquestrador/mcp-vazio.json
+{
+  "mcpServers": {}
+}
```

Teste novo: `scripts/orquestrador/test-mcp-estrito.sh`. Um `claude` falso grava a linha montada, um argumento por linha. O teste exercita o executor de verdade (`executor.sh --ticket`, com `ORQ_EXEC_ROOT=orq-runner`, como no loop) e o juiz de verdade (`avaliador.sh` com reprova, rc=10). Ele confere quatro coisas: o token `--strict-mcp-config`, o `--mcp-config` seguido de um caminho absoluto, que o arquivo existe e que o arquivo tem `mcpServers == {}`.

```
# antes da mudança
== A. executor.sh: chamada do executor ==
  ✗ executor: falta --strict-mcp-config
  ✗ executor: falta --mcp-config <arquivo>
== B. avaliador.sh: chamada do juiz ==
  ✓ juiz rodou e reprovou pelo stub (rc=10)
  ✗ juiz: falta --strict-mcp-config
  ✗ juiz: falta --mcp-config <arquivo>
== resultado: 1 ok, 4 falhas ==
# depois
== resultado: 9 ok, 0 falhas ==
```

Regressão: `test-adiado.sh` 27 ok · `test-parser-verdict.sh` 16 ok · `test-cooldown-causa.sh` 10 ok · `test-preserva-evidencia.sh` 10 ok · `test-vizinho-vitest.sh` 23 ok · `scripts/test-guarda-ferramenta.py` 16 ok. Não rodei o gate completo de tsc, vitest e build; o `publicar.sh` roda no passo 4.

Revisão independente (um agente que não viu o trabalho): **aprova, nada bloqueante.** Dos achados dela, apliquei:
- as flags no probe;
- o teste exige caminho absoluto;
- a mensagem da guarda não manda mais para o editor SQL;
- a descrição da skill diz que ela é o caminho único;
- texto sobre chat e terminal;
- o `update` do ledger só dentro da skill;
- MIG-A definido.

Ficaram de fora três notas menores sobre o teste: ele copia arquivos da árvore de trabalho, não do git; a limpeza usa um `_worktrees` compartilhado no tmp, padrão que já existia; e falta checar a posição do `-p`.

**Em aberto:**
- Nenhum teste prova que o CLI real deixa de carregar o conector com `--strict-mcp-config`; a ajuda do CLI diz que sim. Conferir no primeiro run real depois da publicação: o "list_projects negado" tem de sumir dos `claude-output.txt`.
- Divergência de regra: `rules/motor.md` pede o prefixo `PORTE-PENDENTE:` e diz que o motor pertence ao kit. Usei `MOTOR:` porque a decisão de vocês pede esse prefixo. O porte para o `orquestrador-kit` segue pendente.

## 2 e 3. Um caminho só e linha de base

- `CLAUDE.md:9`: um caminho só até o aplicador de migrations do orquestrador-kit (MIG-A). Toda migration no `ogfnojbbvumujzfklkhh` passa pela skill, numa sessão do Claude Code. O que for escrito num chat do claude.ai ou no terminal vira `.sql` e passa pela skill. Proibido `apply_migration` fora da skill e DDL por `execute_sql` ou pelo editor SQL.
- `.claude/rules/banco.md` (seção Migration):
  - a regra completa, com o motivo (448 de 491 versões com a hora da aplicação);
  - a proibição de escrever em `supabase_migrations.schema_migrations` fora do passo 3 da skill;
  - a linha de base de 18/10: nada aplicado antes é renomeado, nem arquivo nem ledger. "Aplicado antes" é a versão que já estava no ledger no cruzamento de 18/10;
  - a frase de 17/10 ganhou a ressalva "só no que for aplicado de 18/10 em diante".
- `.claude/skills/aplicar-migration-ddl/SKILL.md`:
  - a descrição e o corpo dizem que a skill é o caminho único;
  - o passo 4 cobra alinhamento só do que estava fora do ledger em 18/10, e o anterior só se lista. Antes ele mandava alinhar desde 20261016, o que colidiria com a linha de base.
- `.claude/hooks/guarda-ferramenta.py:241`: a mensagem de bloqueio em C0 aponta para a skill, não para o editor.

Pendência: versionar no repo a lista das 491 versões do ledger de 18/10, por exemplo em `supabase/conferencia/`. Sem ela, a linha de base depende da data de aplicação, que o ledger não guarda depois do alinhamento (achado da revisão). A lista está com o chat, que fez o SELECT.

## 4. Fila de hoje: conferência antes da skill

Não apliquei nada. Os motivos:
- A skill tem `disable-model-invocation`: só roda quando o Lucas digita `/aplicar-migration-ddl` numa sessão do Claude Code no repo.
- O SELECT de conferência nesta sessão foi negado pelo classificador de permissões. Não contornei por outro caminho (por exemplo, `checar-promocao.py --aplicar` lendo o token do `.env.local`).
- Falta, portanto, o passo 0 da skill (`checar-promocao.py --aplicar`, que lê o banco), a ser rodado na sessão da skill.

Conferência feita (estática, sem banco):

| Ordem | Migration | Onde está | Ticket | C0 | Classificador (`--classificar`, sem banco) | Na produção (cruzamento do chat, 14:10) | Veredito |
|---|---|---|---|---|---|---|---|
| 1 | `20261017230300_inteligencia_comercial_nota_ghl` (173 linhas) | staging-apolo | 5199 (done) | não toca | expansão, sem destrutivo | ausente | **pode ir** pela skill (destrava 5200, 1267, 1269) |
| 2 | `20261018001000_inteligencia_capacidade_registro` (305 linhas) | staging-apolo | 5215 (done) | não toca | expansão, sem destrutivo | ausente | **pode ir** (destrava 5216, 5217, 1311) |
| 3 | `20261018003100_nps_fila_e_resposta_por_contato` (55 linhas) | staging-auto | 1332 (done) | não toca | expansão declarada, 0 `drop constraint` (já separado pelo 1363, `0e7f235`) | ausente | **pode ir** (destrava 1329 e 1334; o 1329 também espera a contração depois) |
| 4 | `20261018003200_employees_public_sem_anon` (44 linhas) | staging-auto | 1337 (done) | não toca | **contração** (`revoke`) | ausente | **não aplicar** |

**Por que o 1337 não pode ir:** ele revoga o SELECT de `anon` e `authenticated` em `employees_public`. O dashboard-comercial (mesmo banco) lê essa view no navegador com a chave anon: `src/lib/supabase.ts:4-6` cria o cliente com `NEXT_PUBLIC_SUPABASE_ANON_KEY`, e as páginas são `"use client"`. Leituras na `origin/main` do dashboard:
- `src/app/time/meu-portal/comunicados/page.tsx:67`
- `src/app/time/meu-portal/perfil/page.tsx:93`
- `src/app/time/meu-portal/tarefas/page.tsx:74`
- `src/app/time/meu-portal/trilha/page.tsx:72`
- `src/components/time/portal-conteudo-page.tsx:47`
- `src/components/config/IntegracoesSection.tsx:850`

A própria migration diz no cabeçalho, linhas 24-25: "grep por employees_public no repo do dashboard comercial. Se aparecer leitura pelo navegador (chave anon), NAO aplicar e avisar." O recon dela só olhou o `src` do Comarka. Para destravar, o dashboard precisa antes trocar essas leituras por rota com service role. Isso é ticket do dashboard, e o 1337 vira contração com `-- depois-de:` apontando para ele.

**`20261007190900_churn_fecha_leitura_anon` (ticket 900, de 07/10): absorvido, não aplicar.** Ele derruba duas policies de leitura e revoga tudo de anon e authenticated em `churn_aprovacoes` e `churn_monthly_summary`. Três dias depois, `20261010231000_revoga_anon_tabelas_sem_uso` (ticket 970) fez o `revoke all` nas mesmas duas tabelas, linhas 29-32. O cabeçalho dela diz "APLICADA via MCP em 10/10/2026", e ela casa com a produção no cruzamento. Sobra só o `drop policy` das duas policies `using (true)`, que sem grant não dão acesso nenhum. Não há token de liberação para o 900. Recomendação: não aplicar e registrar como absorvida pela 970. O arquivo não deve ser movido, porque `test/churn-fecha-leitura-anon-ddl.test.ts` o lê. Se o Lucas quiser limpar as policies, isso vira migration nova.

`20261019000100_nps_fila_sai_chave_notion`: contração, continua esperando a promoção do 1329, como decidido.

Sequência sugerida para a sessão da skill: 1, depois 2, depois 3, cada uma com o passo 0 (`checar-promocao.py --aplicar`), o SQL mostrado, o ok, `apply_migration`, o `update` da versão para o nome do arquivo, `list_migrations` e `liberar.py migration-<id>-aplicada`. Para as que ainda só existem na staging, a skill manda extrair com `git show origin/staging-<x>:<arquivo>`.

## 5. Levantamento (só leitura)

**Fonte e limite:** a leitura ao vivo foi negada nesta sessão. Usei três fontes:
- o mapa do banco vivo de 03/10 versionado no Comarka: `docs/mapa/raw/banco-tabelas.txt` (tabelas e views) e `docs/mapa/raw/banco-migrations-ledger.txt` (ledger com 327 linhas), lidos via MCP só com SELECT;
- as notas de `docs/fila/liberacoes.json`;
- o histórico do git.

O mapa não lista colunas, funções, triggers nem constraints. O que depende disso está marcado "não conferido".

### 5a. Os 32 arquivos antigos sem produção

Script e saída: `~/orq-sessoes/recon-migrations/objetos.py`, `objetos.json`, `outros-nomes.py`, `outros-nomes.out`.

| Arquivo | Situação | Evidência |
|---|---|---|
| `20260525_cs_module_tables` | **aplicado com outro nome** (fatiado) | ledger 03/10: `cs_client_profile`, `cs_client_observations`, `cs_client_meta_connections`, `cs_client_meta_snapshots`, `cs_client_meta_alerts`, `cs_client_whatsapp_summaries` (20260525160809 a 160838); as 6 tabelas existem |
| `20260525_meta_insights_campaigns` | **aplicado com outro nome** | ledger `20260525181530 meta_insights_campaign_level` (+ `fix_meta_insights_unique_constraint`); colunas não conferidas |
| `20260601_create_perf_teses` | **objeto existe; sem linha própria no ledger** | `perf_teses` no mapa de 03/10; nenhuma linha de ledger com "teses" antes de 25/08. Provável editor ou junto de outra migration |
| `20260601_perf_nichos` | **aplicado com outro nome** (provável) | `perf_nichos` existe; ledger `20260504232237 t8_t10_t11_t12_nichos_discovery_classificacao` |
| `20260620_tkt-dossie_ac_backfill_e_sync` | **aplicado com outro nome** (hífen virou sublinhado) | ledger `20260620170458 tkt_dossie_ac_backfill_e_sync` |
| `20260620_tkt-dossie_b_ponte_lead` | **aplicado com outro nome** | ledger `20260620170353 tkt_dossie_b_ponte_lead`. É o trigger em `clientes_receita` (C0) citado como incidente na guarda (`guarda-ferramenta.py:12-13`) |
| `20260620_tkt-dossie_t1_revinculo` | **aplicado com outro nome** | ledger `20260620160304 tkt_dossie_t1_revinculo` (+ `_fix_internos` 160558) |
| `20260620_tkt-dossie_t2_dossie_colunas` | **aplicado com outro nome** | ledger `20260620160307 tkt_dossie_t2_dossie_colunas` |
| `20260623_tkt-rbac_v2_ops_permissao_fundacao` | **aplicado com outro nome** | ledger `20260623182738 rbac_v2_ops_permissao_fundacao`; as 6 tabelas `ops_permissao_*`, `ops_cargo_nivel` e `ops_escopo_dados` existem |
| `20260626_ops_esta_na_subarvore` | **aplicado sem linha no ledger** | commit `9bfd03f`: "lastro SQL ... (já aplicada no banco)"; nenhum nome parecido no ledger; função não conferida |
| `20260628_perf_reuniao` | **aplicado com outro nome** | ledger `20260629170518 perf_reuniao_fundacao` |
| `20260628_perf_health_snapshot` | **aplicado com outro nome** | ledger `20260629165730 perf_health_snapshot_fundacao` |
| `20260715000000_meta_ad_accounts_cliente_id` | **nunca aplicado** (provável) | commit `d6c6663`: "migration cliente_id (nao aplicada)"; nada no ledger; coluna não conferida |
| `20260716000002_ops_acoes_recomendadas` | **aplicado com outro nome** | commit `9ff1a4d` "aplicada 15/07 via MCP, ledger 20260715205404"; ledger `ops_acoes_recomendadas_fundacao` |
| `20260818000001_vw_onboarding_atraso_ancora` | **aplicado com outro nome** | ledger `20260819233819 vw_onboarding_atraso_ancora_por_cliente` |
| `20260819000000_employees_drop_senha_legado` | **nunca aplicado** (provável) | commit `ff9122b`: "(nao aplicada, gate humano)"; nada no ledger; coluna `senha_visivel` não conferida |
| `20260903120000_revoke_anon_views_publicas` | **aplicado com outro nome** | ledger `20260903175118 revoke_anon_auth_views_publicas_fase1` |
| `20260916_perf_crm_cliente` | **aplicado com outro nome** | commit dizia "(nao aplicada)", mas o ledger tem `20260916182558 perf_crm_cliente_espelho_ghl` e as 5 tabelas `perf_crm_*` existem |
| `20260921120000_espelho_config_funil_campanha` | **espelho de documentação, não é para aplicar** | commit `8c38d29` "docs(507): espelho vivo de config_funil_campanha"; a tabela nasceu em `20260507164728 create_config_funil_campanha` |
| `20260922100001` a `20260922100012` (d1 a d12) | **aplicados sem linha no ledger** | cada um tem token `ddl-*` com nota "aplicada em 22/09 via Supabase, verificada". O ledger de 03/10 não tem nenhuma linha de 22/09 além de 4 de outro lote (`churn_log_cliente_receita_id`, `perf_leads_ghl_contact_id`, `perf_fechamentos_origem_ghl`, `335b_nps_disparo_fila`). As tabelas novas de d1, d2, d3, d5, d7, d8 e d9 existem no mapa de 03/10. d4, d6, d10, d11 e d12 só mexem em constraint ou coluna: não conferidos. Provável editor SQL ou `execute_sql`, exatamente o caminho proibido no item 2 |
| `20260929000002_employees_nivel_acesso` | **indefinido** | commit `31415d3` "tira nivel_acesso até a parte 2"; a coluna também aparece no legado `migrations/migration-schema-updates-v2.sql`; nada no ledger; coluna não conferida |

Contagem (32): 14 aplicados com outro nome (contando o tkt-dossie como 4), 14 aplicados sem linha no ledger (d1 a d12, `ops_esta_na_subarvore`, `create_perf_teses`), 2 provavelmente nunca aplicados (`meta_ad_accounts_cliente_id`, `employees_drop_senha_legado`), 1 espelho de documentação e 1 indefinido.

Para fechar ao vivo (um SELECT na sessão da skill ou no chat): colunas `meta_ad_accounts.cliente_id`, `employees.senha_visivel`, `employees.nivel_acesso`, `perf_insights_daily.link_clicks`, `perf_relatorio_cliente_config.cpl_limite`, `ops_produtos.tem_etapas_contratuais`, `perf_fechamentos.campaign_id`, `ops_template_etapas.marco_contrato`; funções `ops_esta_na_subarvore` e `fn_revincular_reunioes`; constraints `client_interaction_records_tipo_check` (d4) e `perf_qualificacao_regras_classifica_como_check` (d6, tem de aceitar `RM` e `RR`). Eu tinha montado a consulta (só SELECT em `pg_class`, `pg_proc`, `information_schema.columns`, `pg_constraint` e `has_table_privilege`), mas ela foi negada.

### 5b. As 29 migrations de outubro na produção sem arquivo no Comarka

Fonte: SELECT em `supabase_migrations.schema_migrations` (feito antes da negação; 29 linhas, todas `created_by alfalucas137@gmail.com`) cruzado com o git do dashboard-comercial e do Comarka.

| Grupo | Versões (ledger) | De onde vieram |
|---|---|---|
| `plano_metas_*` (6): `fase_b`, `fase_b_grants`, `flags`, `salvar`, `ote` | 20261006164241 a 191029 | **dashboard-comercial**, `supabase/migrations/20261006_plano_metas_*.sql` (commits `90058cb`, `665d520`, `ed74603`, `5a9355c`, de 06/10; o `ote` tem `_REVERSAO.sql`) |
| `regras_lead`, `regras_lead_ajustes_a_b` | 20261006170823, 172221 | dashboard-comercial, `20261006_regras_lead*.sql` (`94ee950`) |
| `webinar_*` (18) de 06 e 07/10 | 20261006175952 a 20261007180010 | dashboard-comercial, `supabase/migrations/2026100[67]_webinar_*.sql` (`f5953cb`, `d693d83`, `4698ed2`, `c534df3`, `660145b`, `6a5f83c`, `e0e4fdb`, `a6c05dd`, `99795ed`, `f2e8746`, `5b41f0d`). **Três delas (`webinar_fontes_01/02/03`) têm no cabeçalho "PROPOSTA — NÃO APLICADA" e estão no ledger**: o texto de proposta foi aplicado como migration. Conferir se o corpo estava comentado |
| `create_webinar_grupo_eventos`, `create_webinar_grupo_export_eventos` | 20261015192711, 192912 | **sem arquivo em repo nenhum** (`git log -S` no dashboard só acha o desenho de 07/10). Provável chat ou sessão via conector em 15/10 |
| `revoke_anon_audit_baseline_metrics` | 20261007002527 | dashboard-comercial, `supabase/migrations/20261007002527_revoke_anon_audit_baseline_metrics.sql` (`867b4e6`) |
| `folha_pagamento_employee_id` | 20261007182619 | dashboard-comercial, `scripts/equipe/2026-10-07-folha-employee-id.EXECUTADO.sql` (`347b869`: "SQL de folha executado (07/10 15:25 via MCP)"). Arquivo em `scripts/`, não em `supabase/migrations` |
| `clientes_receita_status_log` | 20261008031443 | dashboard-comercial, `supabase/migrations/20261007200000_clientes_receita_status_log.sql` (`503ef88`: "log de status de clientes_receita (aplicado)"). Cria tabela com FK para `clientes_receita` (C0 do lado do OS) |
| `trava_exclusoes_meses_fechados_leads` | 20261015212010 | dashboard-comercial, `supabase/migrations/20261015120000_trava_exclusoes_meses_fechados_leads.sql` (`0647d4f`, na `main` do dashboard) |
| `perf_lead_eventos_tipo_ctwa` | 20261013140613 | **Comarka**, arquivo `supabase/migrations/20261013140613_perf_lead_eventos_tipo_ctwa.sql` só na branch `fix/perf-funil` (`fcc533d` e renome `e7678eb`), nunca mesclada na main nem nas stagings |

Conclusão para o plano MIG: o dashboard-comercial aplicou 27 das 29 migrations de outubro no banco do Comarka, com nome de arquivo `AAAAMMDD_` e versão = hora da aplicação. Outras 2 vieram sem arquivo nenhum. A regra de um caminho só (item 2) está gravada só no Comarka. **Ela não vale para as sessões do dashboard enquanto não estiver também no `CLAUDE.md` do dashboard-comercial.**

## Pendências e perguntas

1. Publicar a branch (linha no topo). Depois, conferir no primeiro run se o conector sumiu.
2. Portar as mudanças do motor para o orquestrador-kit (`rules/motor.md`).
3. Versionar a lista das 491 versões do ledger de 18/10 no repo, como âncora da linha de base.
4. Sessão da skill para aplicar 1, 2 e 3 (item 4), cada uma com o ok do Lucas.
5. 1337: abrir ticket no dashboard-comercial para trocar as 6 leituras anon de `employees_public` por rota com service role. Só depois disso a contração.
6. Regra de um caminho só no dashboard-comercial: gravar no `CLAUDE.md` de lá? Está fora do escopo desta sessão e do que foi decidido.
7. Liberar o SELECT de leitura (classificador de permissões) para fechar as colunas, funções e constraints do 5a e o conteúdo dos três `webinar_fontes_*`.
