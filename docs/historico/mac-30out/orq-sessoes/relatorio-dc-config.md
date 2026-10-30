# ADOCAO-DASHBOARD, CONFIG: relatório do PASSO 0 (22/10/2026)

Kit `~/Projetos/orquestrador-kit` main `a001fde` (VERSAO `2.1.0-dev`) · clone `~/Projetos/dashboard-comercial-orq` main `072b62ec` · Comarka `c16e2b8` · CI `e1541e2`.
Artefatos: `~/orq-sessoes/dc-config/000-config.revisado.json`, `~/orq-sessoes/dc-config/dry-run.out`, este arquivo.

## 0. Achado que muda o passo 2: o `--novo` não tem `--dry-run`

- Uso declarado: `bash instalar.sh --novo <repo>`, sem flag (`instalar.sh:101`, `:110`). Só o `--atualizar` aceita `--dry-run` (`:100`, `:105`, `:451`).
- O despacho passa só o 1º argumento: `--novo) shift; novo "${1:-}" ;;` (`instalar.sh:736`). Não há parsing de flag em `novo()` (`:631-729`).
- Consequência: `--novo <clone> --dry-run` **instalaria de verdade** (o `--dry-run` é ignorado). Não rodei essa ordem.
- Rodei a única ordem inofensiva, `--novo --dry-run <clone>`: o repo vira a string `--dry-run`, cai em `die` (`:635`), rc 2, nada escrito. Saída crua em `dry-run.out`:

```
$ bash ~/Projetos/orquestrador-kit/instalar.sh --novo --dry-run ~/Projetos/dashboard-comercial-orq
instalar.sh: '--dry-run' não é um diretório
rc=2
```

- O cabeçalho do instalador ainda diz que o `--novo` "sai 2" por não existir (`instalar.sh:4-6`) e o README diz "hoje só `--verificar`"; o código já tem o `--novo` (peça K8b-6, `:555`). Os dois textos estão desatualizados (é defeito de doc do kit, a registrar em `docs/defeitos/` se o Lucas quiser).
- Um ensaio que mostre o que o `--novo` faria precisa rodar contra uma cópia descartável (por exemplo `git clone` do clone num tmp). Fica fora do escopo desta sessão; está na pergunta L1.

`git status --short` no clone, antes e depois (de `dry-run.out`), e de novo no fim da sessão:

```
# git status --short (antes):
# fim status antes
# git status --short (depois):
# fim status depois
$ git -C ~/Projetos/dashboard-comercial-orq status --short | wc -l
       0
```

Desvio de escopo, para registro: gravei por engano dois temporários (`.tmp-comarka.json`, `.tmp-ci.json`) em `~/orq-sessoes/dc-config/` e os movi para o scratchpad da sessão logo depois. `ls -A ~/orq-sessoes/dc-config` agora: `000-config.revisado.json dry-run.out`.

## 1. Pergunta, resposta, arquivo:linha

| Pergunta | Resposta | arquivo:linha (kit a001fde, salvo indicação) |
|---|---|---|
| Sintaxe do `--novo` | `bash instalar.sh --novo <repo>`, 1 argumento | `instalar.sh:101`, `:110`, `:736` |
| `--novo` tem `--dry-run`? | Não. Flag extra é ignorada em silêncio | `instalar.sh:736`, `:631-633` |
| Quem tem `--dry-run` | `--atualizar` (lista, sai 0) e `instalar-launchd.sh` (renderiza o plist) | `instalar.sh:105`, `:451`; `scripts/orquestrador/instalar-launchd.sh:44-50` |
| Recusa: sem git | `RECUSADO`, rc 1 | `instalar.sh:638-639` |
| Recusa: `docs/fila` já existe | `RECUSADO`, manda usar `--atualizar` | `instalar.sh:641-642` |
| Recusa: sem tsx | `RECUSADO` antes do 1º byte; o clone tem `node_modules/.bin/tsx` (tsx `^4.21.0`) | `instalar.sh:648`, `:79`, `:92-95` |
| Checa árvore limpa ou branch? | **Não.** Escreve direto no checkout, na branch em que ele estiver | `instalar.sh:631-729` (não há checagem) |
| Cria `staging-auto`? | Não. Quem cria é o preflight do executor, local e sem push, a partir de `branch_protegida` | `lib.sh:853-858` |
| PLAYBOOK existente | Preservado: `já existe ... (não sobrescrevo)`. O clone já tem `docs/orquestrador/PLAYBOOK.md` | `instalar.sh:587-593`, `:675` |
| `.gitignore` | Acrescenta `docs/fila/PAUSAR` e `docs/fila/runs/` com comentário (o do clone não tem nenhuma das duas) | `instalar.sh:626-627`, `:684-700` |
| `PAUSAR` | Não é criado; só entra no `.gitignore` | `instalar.sh:626` |
| O que o `--novo` cria | motor (`scripts/orquestrador/`, `scripts/orq`, `scripts/roadmap/`, `docs/orquestrador/skill/` + VERSAO), 20 `.ts` + 7 fixtures de harness em `test/`, `docs/fila/{000-config.json,_TEMPLATE.md,decisoes-pendentes.md,liberacoes.json (v2 vazio),rascunhos/.gitkeep,runs/.gitignore,runs/custo.json}`, `docs/roadmap/{mapa.json,MAPA.md}`, `docs/orquestrador/{PLAYBOOK.md,PECAS.md}` se ausentes | `instalar.sh:563-580`, `:597-621`, `:658-708`; `scripts/kit/vendorizado.sh` |
| Launchd no `--novo`? | Não. É passo separado, e recusa sem `launchd.label` | `instalar.sh:576-579`; `instalar-launchd.sh:62-68` |
| Template do config | `doutrina/templates/config.json` (349 linhas, `$schema_versao: 2`) | `doutrina/templates/config.json:2` |
| Schema de validação do config | **Não existe JSON Schema de config.** `schemas/` só tem `ticket`, `liberacoes` e `motivo_categoria`. O validador é `orq config` → `config-cli.ts` (placeholders, chaves obrigatórias, papel de gate, `migrations.dir`, `linkar_env` booleano) | `scripts/orquestrador/config-cli.ts:90-185`; lista em `config-chaves.ts:36-129`; `scripts/orq:80-92` |
| Gate de typecheck por contagem existe? | **Sim.** `tipo: "baseline"`, `baseline: N`, `direcao: "max"` (padrão): ok se contagem ≤ N, e quem decide é a contagem, não o exit. Exit ≠ 0 sem linha contada reprova (gate mudo). `contagem_regex` opcional (padrão `error TS\d+`, conta linhas). `preparo[]` roda antes, com rc ignorado | `gates.ts:27-49`, `:161`, `:175-212`, `:229-246`, `:285` |
| Como os gates rodam | `bash -c <cmd>` com cwd na raiz da worktree; `node_modules` é symlink do checkout principal | `gates.ts:331`; `executor.sh:1179`, `:275-307` |
| Prefixo de worktree | `<worktrees_dir>/<worktrees_prefixo><id>`; staging = `<prefixo>staging-auto` | `lib.sh:872`; `config-chaves.ts:78` |
| `no_write_tables` aceita padrão? | Não, nome literal (já confirmado na sessão anterior) | `enforcement-core.ts:460-462`, `:534-539` |
| `prefixos_sem_ddl` | Só CREATE/ALTER/DROP, e exige ≥ 1 caractere depois do prefixo (`prefixo\w+`) | `enforcement-core.ts:594-608` |
| Identidade de banco sem `.env` | `ambiente_id` não vazio compara com o ref de `SUPABASE_URL` do `.env.local` do principal; sem `.env` o preflight morre. Vazio desliga | `executor.sh:117-121`; template `:205` ("ou vazio se não aplicável") |
| `canal_notificacao` | qualquer valor ≠ `notificacao_nativa` cai no arquivo | `lib.sh:1358`; `config-chaves.ts:87` |

## 3. Gate de typecheck

Existe (tabela acima). O rascunho usa:

```json
{ "nome": "typecheck", "papel": "typecheck",
  "preparo": ["rm -rf .next", "rm -f next-env.d.ts tsconfig.tsbuildinfo"],
  "cmd": "node_modules/.bin/tsc --noEmit",
  "tipo": "baseline", "baseline": 246, "direcao": "max",
  "contagem_regex": "^(?!\\.next/).*error TS\\d+" }
```

Prova com o próprio `gates.ts` do kit (`ordenarGates`, `contarNaSaida`, `avaliaGate` importados), saída crua:

```
ordem: typecheck,testes,build
contagem (esperado 2): 2          # 3 linhas, 1 delas em .next/ — excluída
n=245 exit=2 -> true
n=246 exit=2 -> true
n=247 exit=2 -> false
exit=2 sem linha -> false         # gate mudo reprova
rc=0
```

O preparo existe porque o `tsconfig.json` do clone tem `"incremental": true` e inclui `.next/types/**/*.ts` e `next-env.d.ts`. Hoje o clone tem `tsconfig.tsbuildinfo` e não tem `.next` nem `next-env.d.ts`.

**Atenção, o 246 tem de ser medido de novo depois do `--novo`:** o `tsconfig` inclui `**/*.ts` e só exclui `node_modules`, `scripts`, `docs/backups`. Os 20 `.ts` de harness que o `--novo` copia para `test/` entram no typecheck. O `vitest.config.ts` não restringe `include`, então os 19 testes de harness também entram na suíte (hoje 97 arquivos e 1257 testes).

## 4. Paridade com Comarka (`c16e2b8`) e CI (`e1541e2`)

O Comarka em HEAD ainda é **`$schema_versao: 1`** e usa nomes v1. Não serve de modelo de chave v2; o CI serve.

| Chave | Comarka | CI | Rascunho DC | Importa porque |
|---|---|---|---|---|
| `$schema_versao` | 1 | 2 | 2 | decisão fechada |
| prefixo de worktree | `worktree_prefix: "orq-comarka-"` (nome v1) | `worktrees_prefixo: "ci-"` | `worktrees_prefixo: "dc-orq-"` | o motor v2 lê `worktrees_prefixo` |
| `branch_protegida` | ausente | `main` | `main` | obrigatória (`config-chaves.ts:60`) |
| identidade de banco | `supabase_project_id: ogfn…` (+ `.env.local` com SUPABASE_URL) | `ambiente_id: vcmk…` | `ambiente_id: ""` | sem `.env` no clone, preenchido = preflight morre (L3) |
| `preflight_env_keys` | `SESSION_SECRET`, `SUPABASE_URL` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `[]` | sem `.env` |
| zona | `c0_intocavel{no_write_tables(6), no_write_prefixes[trafego_, vw_], ghl_comercial, dashboard_readonly, os_owned_excecoes}` | `zona_proibida.no_write_tables: "TODAS"` | `zona_proibida.no_write_tables` com 81 nomes + `prefixos_sem_ddl` | o motor v2 só lê `zona_proibida.*` (template `:212`); listas por dono não são lidas |
| gates | `tsc_baseline` 3 + escopo `qualificacao`, `npx`, `npm run build` | preparo `limpeza_artefatos`, `npm run typecheck:*`, placar por pacote | binário local, baseline 246, preparo dentro do gate | decisões fechadas |
| `diff_cap_linhas` | 900 (medido em 308 runs) | 600 | 2500 (template) | L7 |
| `claude_timeout_secs` / `claude_max_turns` | 1500 / — | 1800 / 80 | 1800 / 40 (template) | L7 |
| modelos | IDs completos `claude-sonnet-5-5`/`claude-opus-5-5` (decisão do Lucas de 18/10) | aliases `sonnet`/`opus` | aliases do template | L6 |
| `canal_notificacao` | — | `arquivo` (topo; `relatorio.canal` removido) | `arquivo`, idem | decisão fechada |
| `orcamento` | ausente | 50 / 5M / 10 | placeholders `<DECISÃO DO LUCAS…>` | decisão do Lucas; nada copiado |
| `campos_usage` | — | `total_cost_usd`, `usage.*` (sondados na máquina) | os do CI | reconfirmar no pré-voo cat. 8 |
| `paths_harness` | — | + `_TEMPLATE.md`, `docs/roadmap/**` | + `scripts/orq`, `scripts/roadmap/**`, `_TEMPLATE.md` | sem `docs/roadmap/**` (L9) |
| `gate_streak_limite`, `writeback_notion`, `perfis_tools` | presentes (v1) | — | — | o v2 não lê; não entram |
| `sql_pendente_dir`, `politica_schema`, `e2e_banco`, `commit_checkpoint` | — | presentes | ausentes | opcionais; L10 |
| `launchd.label` | (job `com.comarka.orquestrador`) | `com.conteudos.orquestrador` | `com.dashboard-comercial.orquestrador` | ver §5 |

## 5. Rascunho: escolhas

- `launchd.label`: **`com.dashboard-comercial.orquestrador`**. `launchctl list | grep -iE 'orq|comarka'` (só leitura) devolveu `com.comarka.orquestrador`, `com.orq.resolvedor`, `com.actus.orquestrador`, `com.comarka.orquestrador-apolo`, `com.comarka.orq-server`, `com.conteudos.orquestrador`. Não colide com nenhum.
- Gates com binários locais reais do clone (todos existem em `node_modules/.bin/`): `tsc`, `vitest`, `next`. O lint ficou vazio (`.eslintrc.json` existe, mas não medi o lint).
- `orcamento.usd_dia`, `tokens_dia`, `usd_ticket` = `"<DECISÃO DO LUCAS: …>"`. Escolhi placeholder em vez de `null` porque `null` sai como "chave obrigatória ausente" (`config-cli.ts:102-110`) e o placeholder sai como decisão pendente. Os dois reprovam. O validador não aceita nenhum valor não numérico, e é isso que queremos: o loop não roda.
- `zona_proibida.revisado_humano: false`, porque a revisão é do Lucas.
- `no_write_paths`: páginas protegidas (`src/app/trafego/{visao-geral,relatorios,relatorio-auto}/**`, `src/app/dre/**`, `src/app/api/financeiro/dre/**`), `src/lib/comissao-canonica.ts`, `CLAUDE.md`, `docs/CANONICO.md`, `docs/backups/**`, `docs/deploy/**`, `.vercel/**`, `.github/workflows/**`, `.env*`.
- `prefixos_sem_ddl`: `trafego_`, `perf_`, `leads_crm`, `fn_mql_`, `vw_`.

### `no_write_tables` (81 nomes): tabela, motivo, fonte

| Tabela | Motivo | Fonte |
|---|---|---|
| `clientes_receita` | C0 analítico | CLAUDE.md do clone, Zona protegida; Comarka `c0_intocavel.no_write_tables` |
| `leads_crm` | C0 analítico | idem |
| `leads_crm_historico` | C0 analítico | idem |
| `ads_metadata` | C0 analítico | idem |
| `ads_performance` | C0 analítico | idem |
| `vw_atribuicao_proporcional` | C0 analítico (view) | CLAUDE.md do clone |
| `fn_mql_sql_by_month` | C0 analítico (função; escrita por nome não se aplica, DDL coberta por `fn_mql_`) | CLAUDE.md do clone; Comarka `c0_intocavel` |
| `trafego_account_managers` | C0 `trafego_*` | `CREATE TABLE` em `supabase/migrations` do clone |
| `trafego_ad_accounts` | C0 `trafego_*` | idem |
| `trafego_anomalias` | C0 `trafego_*` | idem |
| `trafego_client_account_history` | C0 `trafego_*` | idem |
| `trafego_clients` | C0 `trafego_*` | idem |
| `trafego_criativo_metricas` | C0 `trafego_*` | idem |
| `trafego_criativos` | C0 `trafego_*` | idem |
| `trafego_performance_temporal` | C0 `trafego_*` | idem |
| `trafego_regras_historico` | C0; exceção só por ticket com `orq liberar` | idem; CLAUDE.md (linha própria) |
| `trafego_regras_otimizacao` | C0 `trafego_*` | idem |
| `trafego_thresholds_alertas` | C0 `trafego_*` | `.from()` em `src/` (3×), sem CREATE no clone |
| `meta_connections` | Comarka OS | CLAUDE.md do clone; Comarka `os_owned_excecoes` |
| `meta_ad_accounts` | Comarka OS | idem |
| `meta_insights_cache` | Comarka OS | idem |
| `meta_lead_forms` | Comarka OS | idem |
| `meta_sync_logs` | Comarka OS | idem |
| `meta_agency_connection` | Comarka OS | idem |
| `client_meta_accounts` | Comarka OS | idem |
| `ia_prompts` | Comarka OS até o Lucas definir; o dashboard escreve (4 `.from`) | CLAUDE.md do clone; Comarka `os_owned_excecoes` |
| 53 `perf_*`: `perf_ad_accounts`, `perf_analises`, `perf_cliente_cor_override`, `perf_cliente_metas`, `perf_cliente_verba`, `perf_colunas_template`, `perf_colunas_visualizacao`, `perf_conta_metas`, `perf_criativos`, `perf_crm_conexoes`, `perf_crm_etapas`, `perf_crm_oportunidade_historico`, `perf_crm_oportunidades`, `perf_crm_pipelines`, `perf_crm_reconciliacoes`, `perf_crm_reprocesso`, `perf_equipe_telefones`, `perf_eventos_produtividade`, `perf_fechamento_tokens`, `perf_fechamentos`, `perf_fechamentos_informados`, `perf_formas_pagamento`, `perf_ghl_locations`, `perf_health_snapshot`, `perf_hook_tipos`, `perf_ia_credenciais`, `perf_ia_modelos`, `perf_ia_uso`, `perf_insights_daily`, `perf_lead_eventos`, `perf_leads`, `perf_leituras_relacao`, `perf_meta_campanhas`, `perf_meta_connections`, `perf_meta_discovery`, `perf_meta_receita`, `perf_nichos`, `perf_nps_disparo_fila`, `perf_nps_respostas`, `perf_nps_tokens`, `perf_otimizacoes`, `perf_portal_tokens`, `perf_portal_venda_confirmacoes`, `perf_promessas`, `perf_qualificacao_regras`, `perf_ranking_foto_mensal`, `perf_relacao_sugestoes`, `perf_relatorios_gerados`, `perf_reuniao`, `perf_sync_logs`, `perf_tese_premissas`, `perf_teses`, `perf_vacuo_tratado` | Comarka OS | `CREATE TABLE perf_*` nas migrations do Comarka `c16e2b8` (`git ls-tree` + `git cat-file`, 53 únicos, recontado nesta sessão) |
| `perf_ia_analises`, `perf_meta_ad_map` | Comarka OS | Comarka `c0_intocavel.os_owned_excecoes` (sem CREATE no grep) |

Fora da lista, por desenho (o loop pode escrever): `ghl_comercial` (6) e `dashboard_readonly` (9). Também fica fora `leads_crm_rt3`, que aparece 1× em `src/` e pode ser nome de canal realtime, não tabela (L8). Views `leads_crm_public`/`leads_crm_historico_public` não entram por nome; a DDL delas cai em `leads_crm`.
Contagem: `jq '.zona_proibida.no_write_tables|length'` → `81`; duplicadas → `0`.

## 6. Validação com o validador do kit

Não há JSON Schema de config no kit. O validador é o `config-cli.ts` (o `orq config`), rodado com o tsx do kit:

```
$ node_modules/.bin/tsx scripts/orquestrador/config-cli.ts /Users/lucasantos/orq-sessoes/dc-config/000-config.revisado.json
CONFIG   /Users/lucasantos/orq-sessoes/dc-config/000-config.revisado.json
  orcamento.usd_dia: placeholder não preenchido: "<DECISÃO DO LUCAS: teto USD/dia>"
  orcamento.tokens_dia: placeholder não preenchido: "<DECISÃO DO LUCAS: teto tokens/dia>"
  orcamento.usd_ticket: placeholder não preenchido: "<DECISÃO DO LUCAS: teto USD/ticket>"

3 violação(ões)
rc=1
--- controle negativo: template cru
26 violação(ões)
template cru rc=1
```

As 3 violações que sobram são as do orçamento, e é proposital. O resto passa.

## 7. Diff do rascunho contra o template (folhas; sem as notas `_dc_*` e sem a lista de 81 tabelas, que está no §5)

Gerado com `jq paths(scalars)`. Esse filtro omite booleanos `false`, então a troca booleana vai à mão: `worktree.linkar_env: true → false`. Chaves acrescentadas sem par no template: `canal_notificacao`, `gates[*].papel`, `gates[0].{direcao,contagem_regex,preparo}`, `gates[2].preparo`. Chaves removidas: `relatorio.canal`, `gates[0].baseline_scope_regex`.

```
< ambiente_id	"<ref do banco/projeto, ou vazio se não aplicável>"
> ambiente_id	""
< branch_protegida	"<a branch que o loop NUNCA empurra — ex.: main>"
> branch_protegida	"main"
> canal_notificacao	"arquivo"
< gate_ticket.cmd_prefixos_permitidos  npx vitest run | npx jest | npx tsc | npm run test | npm run typecheck | npm run lint | npm run build | node scripts/ | test -f | test -s | grep - | jq  | curl -s http://localhost | curl -sf http://localhost
> gate_ticket.cmd_prefixos_permitidos  node_modules/.bin/vitest run | node_modules/.bin/tsc | node scripts/ | test -f | test -s | grep - | jq
< gate_ticket.servidor_local_cmd	"<ex: npm run dev -- --port 3000 | …>"
> gate_ticket.servidor_local_cmd	""
< gates.0.baseline 0 · baseline_scope_regex "<…>" · cmd "<ex: npx tsc --noEmit>"
> gates.0.baseline 246 · cmd "node_modules/.bin/tsc --noEmit" · direcao "max" · contagem_regex "^(?!\\.next/).*error TS\\d+" · papel "typecheck" · preparo ["rm -rf .next","rm -f next-env.d.ts tsconfig.tsbuildinfo"]
< gates.1.cmd	"<ex: npx vitest run>"
> gates.1.cmd	"node_modules/.bin/vitest run" · papel "testes"
< gates.2.cmd	"<ex: npm run build>"
> gates.2.cmd	"node_modules/.bin/next build" · papel "build" · preparo ["rm -rf .next"]
< juiz.paths_alto_risco	<ex: supabase/**> | <ex: src/auth/**> | <ex: src/billing/**>
> juiz.paths_alto_risco	supabase/** | src/middleware.ts | src/lib/auth/** | src/lib/auth.ts | src/lib/auth-guard.ts | src/app/api/auth/** | src/app/login/** | src/lib/supabase.ts | src/lib/supabase-admin.ts | src/lib/comissao-canonica.ts | src/lib/comissao/** | src/lib/calculos.ts | src/lib/kpis.ts | src/lib/atribuicao.ts | src/lib/ad-attribution.ts | src/app/api/webhooks/**
< launchd.label	"<ex: com.suaorg.orquestrador — OBRIGATÓRIO, um por repo>"
> launchd.label	"com.dashboard-comercial.orquestrador"
< lint.cmd	"<ex: npx eslint . --max-warnings=999999>"
> lint.cmd	""
< migrations_dir	"<ex: supabase/migrations | db/migrations>"
> migrations_dir	"supabase/migrations"
< orcamento.campos_usage.*	"<campo>"
> orcamento.campos_usage	custo_usd total_cost_usd · tokens_in usage.input_tokens · tokens_out usage.output_tokens · tokens_cache usage.cache_read_input_tokens
< orcamento.usd_dia 50 · tokens_dia 5000000 · usd_ticket 5
> orcamento.usd_dia/tokens_dia/usd_ticket	"<DECISÃO DO LUCAS: …>"
< paths_harness	scripts/orquestrador/** | docs/orquestrador/** | docs/fila/000-config.json | .claude/**
> paths_harness	scripts/orquestrador/** | scripts/orq | scripts/roadmap/** | docs/orquestrador/** | docs/fila/000-config.json | docs/fila/_TEMPLATE.md | .claude/**
< preflight_env_keys	<ENV_OBRIGATORIA_1> | <ENV_OBRIGATORIA_2>
> preflight_env_keys	[]
> proibicoes_absolutas.regras +	nunca ler .env* nem usar service role de produção em teste | nunca rodar npm run test:integration | nunca DELETE físico; soft delete sempre
< relatorio.canal	"<notificacao_nativa | webhook_url | email>"
< repo_origin_deve_conter	"<org/repo>"
> repo_origin_deve_conter	"lucasantosads/dashboard-comercial"
< sentinela.smoke_cmd	"<ex: curl -sf http://localhost:3000/api/health>"
> sentinela.smoke_cmd	""
< worktree.linkar_env	true
> worktree.linkar_env	false
< worktrees_prefixo	"<prefixo curto …>"
> worktrees_prefixo	"dc-orq-"
< zona_proibida.no_write_paths[2]	"<outros caminhos que o loop nunca escreve>"
> zona_proibida.no_write_paths +	.vercel/** | .github/workflows/** | docs/backups/** | docs/deploy/** | docs/CANONICO.md | CLAUDE.md | src/lib/comissao-canonica.ts | src/app/trafego/visao-geral/** | src/app/trafego/relatorios/** | src/app/trafego/relatorio-auto/** | src/app/dre/** | src/app/api/financeiro/dre/**
< zona_proibida.no_write_tables	["<tabela_compartilhada_1>"]
> zona_proibida.no_write_tables	81 nomes (§5)
< zona_proibida.prefixos_sem_ddl	<prefixo_proibido_> | vw_
> zona_proibida.prefixos_sem_ddl	trafego_ | perf_ | leads_crm | fn_mql_ | vw_
```

Mantidos como no template: `branch_alvo`, `max_retries`, `cooldown_minutes`, `worktrees_dir` (`../_worktrees`), `modo`, `loops` (só o executor ativo), `modelos`, `diff_cap_*`, `claude_*`, `executor`, `contexto`, `juiz.diff_max_baixo`, `gate_ticket` (fora prefixos e servidor), `planejador`, `sentinela` (fora smoke), `politica_*`, `_execucao_dos_gates`, `zona_proibida.revisado_humano: false`.

## Perguntas que só o Lucas responde

- **L1.** O `--novo` não tem `--dry-run`. Como ensaio, autoriza um `--novo` real contra uma cópia descartável (`git clone ~/Projetos/dashboard-comercial-orq` num tmp) para ver a saída e medir de novo o tsc e o vitest com o harness em `test/`? Ou o ensaio pula direto para o `--novo` real no clone?
- **L2.** O `--novo` não checa branch e escreve no checkout em que estiver. No clone, a instalação entra na `main` (`072b62e`) ou numa branch própria, e quem faz o merge?
- **L3.** `ambiente_id`: fica `""` (checagem de banco desligada, coerente com o clone sem `.env`) ou o clone recebe um `.env.local` só com `SUPABASE_URL` (sem chave) para a trava de identidade valer?
- **L4.** Orçamento: `usd_dia`, `tokens_dia`, `usd_ticket`.
- **L5.** O gate de typecheck fica em 246 mesmo se, depois do `--novo`, os `.ts` de harness em `test/` mudarem a contagem? Ou `test/orquestrador-*` e `test/fixtures/**` entram no `exclude` do tsconfig? Isso é mudança no repo, fora do config.
- **L6.** Modelos: aliases do template (`sonnet`/`opus`/`haiku`) ou IDs completos como no Comarka desde 18/10 (`claude-sonnet-5-5`, `claude-opus-5-5`)?
- **L7.** `diff_cap_linhas` (template 2500, Comarka 900, CI 600), `claude_max_turns` (40 ou 80) e `claude_timeout_secs` (1800 ou 1500).
- **L8.** `prefixos_sem_ddl` com `vw_` impede o loop de criar qualquer view nova, inclusive as do dashboard que o CLAUDE.md permite ("view nova com security_invoker"). Fica? E `leads_crm_rt3` é tabela?
- **L9.** Páginas protegidas, `comissao-canonica.ts`, `CLAUDE.md` e `docs/CANONICO.md` como `no_write_paths`: confirma? E `src/app/api/financeiro/dre/**` conta como página protegida?
- **L10.** O build sem `.env` não foi provado (rodar escreveria `.next/` no clone). Fica para o pré-voo? E entram `sql_pendente_dir` e `commit_checkpoint` (do CI)?
- **L11.** Registro no kit (`docs/defeitos/`) do `--novo` sem `--dry-run`, que aceita flag extra em silêncio, e do cabeçalho/README desatualizados?
