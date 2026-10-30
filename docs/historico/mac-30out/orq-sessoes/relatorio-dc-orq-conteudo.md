# Relatório: dc-orq-conteudo (ADOCAO-DASHBOARD, conteúdo do repo)

Sessão de 22/10/2026. Worktree `~/Projetos/_worktrees/dc-orq-conteudo`, branch `docs/dc-orq-conteudo`, HEAD = main = `d8be96d`.
Kit: `~/Projetos/orquestrador-kit` HEAD `a001fde`. Comarka: `~/Projetos/comarka-operacional` HEAD `c16e2b8` (lido só por `git show`, com `GIT_OPTIONAL_LOCKS=0`).
Estado: **PASSO 0 aprovado (respostas L1-L6); P0-P4 commitadas. Sem push, sem merge.**

---

## PASSO 0

### 1. CLAUDE.md atual do dashboard: o que está errado ou velho

| Pergunta | Resposta | Onde |
|---|---|---|
| Gerenciador | O arquivo diz pnpm (`pnpm test && pnpm run build`, `ERR_PNPM_IGNORED_BUILDS`) e manda "decidir `git rm`" do `package-lock.json`. Errado: o repo só tem `package-lock.json` (não existe `pnpm-lock.yaml`) e a decisão é npm. | CLAUDE.md:165; `git ls-files` lista só `package-lock.json` |
| Stack | "Next.js 14". O `package.json` tem `next ^15.5.15` e `react ^19.2.5`, `engines.node 22.x`. | CLAUDE.md:12; package.json:5-7, `next`/`react` |
| Notion | Aparece na stack como fonte. DC-0002 tirou a integração (`a0bcc60`, `1a8afbd`…`1db9ffe`); hoje não há `@notionhq`, `api.notion` nem `NOTION_*` em src/scripts. Ficam 58 arquivos com `notion_id` / `*_notion_mirror`, que são nomes legados de coluna e tabela no Supabase, não integração. | CLAUDE.md:12; `git grep` em src |
| Workflow | "Claude (chat) gera prompt .md → Claude Code executa" como único fluxo (INVIOLÁVEL). Com o loop, ticket de fila passa a ser a outra entrada. Precisa dos dois caminhos. | CLAUDE.md:14-15 |
| Integrador | Contradição interna: :140 diz que a sessão integradora "faz merge em main, push e deploy"; :142 diz que "nenhuma sessão roda `vercel --prod` nem push, deploy e push são do Lucas". A decisão de hoje ("só uma sessão, ou o Lucas, integra e publica, sempre pelo `dc-deploy`") resolve isso. | CLAUDE.md:140, :141, :142 |
| Uma sessão por worktree | "Nunca orquestrar múltiplos worktrees de uma sessão" fica ambíguo com o motor, que cria um worktree por ticket. A regra vale para sessão humana, não para o loop. | CLAUDE.md:139 |
| docs/backups | Parágrafo inteiro para dizer "não use". Cabe em uma linha. | CLAUDE.md:96 |
| Estado CTWA | Diz "F1 feita, não commitada/deployada". Está commitada desde `c21a40a` (31/07) e a flag segue `false` em `src/app/api/webhooks/ghl/route.ts:42`. Um "estado atual" de julho não pertence ao CLAUDE.md. | CLAUDE.md:156-165 |
| Versão do cabeçalho | "v2.2, 13/07/2026" e "Regras de engenharia v2.3". As regras seguiram mudando até 15/10. | CLAUDE.md:2, :102 |
| Typecheck | O baseline 246 está certo como teto. O `f3b7892` (DC-0003) mediu 246 → 245. Gate do dia 1: ≤ 246. | CLAUDE.md:145; commit `f3b7892` |
| C0 e zona protegida | C0 lista só as tabelas analíticas. Faltam `ghl_comercial`, `dashboard_readonly`, `perf_*`, `ia_prompts` (ver item 4: há conflito). | CLAUDE.md:50-53 |
| Tamanho | 165 linhas, mas 33.056 bytes. Uma linha chega a 2.160 caracteres. Só as seções de domínio (:17-:127) somam cerca de 12 KB de cânone (fórmulas, fontes, no-show). Não cabe em 150 linhas legíveis sem tirar o cânone do arquivo (pergunta L1). | `wc -c`, `awk length` |

### 2. Comarka: o que vale para o dashboard

| Regra ou lição do Comarka | Vale? | Onde |
|---|---|---|
| `git add` por pathspec, `git status` + `git diff --cached --stat` antes do commit, commit a cada unidade que passa no tsc | Vale | comarka CLAUDE.md:31-33 |
| Nunca push; publicar é do Lucas por script | Vale. No dashboard o equivalente é o `dc-deploy` com `git archive` | CLAUDE.md:34 |
| Nenhum commit no checkout principal; toda mudança nasce em worktree a partir da `origin/main` | Vale. Hoje o checkout principal do dashboard está em `fix/aprovacoes-fila-cobrancas` (`befa44a`), ou seja, é usado para trabalho | CLAUDE.md:35-37; `git worktree list` |
| Nenhum commit na worktree da staging-auto, que só recebe merge da main | Vale (a staging-auto ainda não existe no dashboard) | CLAUDE.md:38 |
| Pausa (`PAUSAR`) congela main e staging | Vale, com o nome novo do kit (`docs/fila/PAUSAR`) | CLAUDE.md:39; kit instalar.sh:256 |
| Registro contínuo em ESTADO-ATUAL (60 linhas, prova por item) | Vale; é a skill protocolo-sessao | CLAUDE.md:41-44 |
| Conferir git, ledger e fila antes de afirmar "feito" | Vale | CLAUDE.md:45-46 |
| Sessão curta, um assunto, frase de abertura da próxima | Vale | CLAUDE.md:23-29 |
| Migration: escrever o `.sql` e parar; aplicar só com ok ao SQL mostrado; proibido DDL por `execute_sql` ou pelo editor; versão livre no **ledger** (banco compartilhado: a faixa de versões é disputada pelos dois repos) | Vale integralmente (mesmo banco) | rules/banco.md, seção Migration |
| Expansão/contração (`-- fase:`) | Vale como prática; sem `checar-promocao.py` no dashboard, fica como regra escrita | rules/banco.md |
| Testes no `include` do tsconfig contam no gate; UUID de fixture RFC-4122 | Vale | rules/testes.md |
| Teste que protege decisão do Lucas não se recalcula | Vale. É exatamente o contrário do DC-0001 (lá o teste estava errado; ver item 5) | rules/testes.md |
| Critério de build por código de saída, nunca substring | Vale | rules/fila.md |
| PLAYBOOK §1-§6 (código verifica, amnésia, fail-fast, fronteira é código, guards físicos, tsc contra baseline) | Vale; já vem no seed do kit | comarka docs/orquestrador/PLAYBOOK.md:9-88 |
| Lições de campo do loop (allowlist, critério negativo, aceite) | Vale; o seed traz as herdadas | PLAYBOOK.md:90-1099 |
| Só do Comarka | `plano.py`/`compromissos.json` (o dashboard não tem), skills `verificar`/`publicar`/`aplicar-migration-ddl`, hooks `guarda-ferramenta.py`/`sessao-tamanho.py`, `PRODUCT.md`, `rules/ui.md`, Apolo, staging-apolo | CLAUDE.md:11-22, :40, :52-58 |

### 3. O que o `instalar.sh --novo` cria ou altera

| Caminho | Origem | Conflito com esta sessão? | Onde |
|---|---|---|---|
| `scripts/orquestrador/`, `scripts/orq`, `scripts/roadmap/`, `docs/orquestrador/skill/` + VERSAO, testes de harness | cópia do motor | Não (fora do escopo) | instalar.sh:597-621, :653 |
| `docs/fila/000-config.json` (formulário com `<placeholders>`), `_TEMPLATE.md`, `decisoes-pendentes.md`, `liberacoes.json` v2, `rascunhos/.gitkeep`, `runs/.gitignore`, `runs/custo.json` | templates do kit | Não. O `--novo` **recusa** se `docs/fila` existir (:641) | instalar.sh:661-670, :699-709 |
| `docs/roadmap/mapa.json`, `docs/roadmap/MAPA.md` | templates | Não | :673-674 |
| **`docs/orquestrador/PLAYBOOK.md`** | `doutrina/templates/PLAYBOOK-seed.md` (164 linhas) | **Sim.** O PLAYBOOK do loop mora aqui, e é onde o Comarka o tem (`docs/orquestrador/PLAYBOOK.md`, 1.099 linhas). Um `docs/PLAYBOOK.md` criaria um segundo PLAYBOOK. | :675 |
| `docs/orquestrador/PECAS.md` | seed | Não | :676 |
| `.gitignore` | **acrescenta** `docs/fila/PAUSAR` e `docs/fila/runs/` com comentário; não reescreve | Não (não vou tocar `.gitignore`) | :626-627, :682-695 |
| `CLAUDE.md` | **não toca** | Não | busca por `CLAUDE.md` em instalar.sh: zero escrita |

Regra do instalador que decide o caminho: `copiar_se_ausente` nunca sobrescreve (:588-593). Se este branch criar `docs/orquestrador/PLAYBOOK.md` antes, o `--novo` imprime "já existe (não sobrescrevo)" e o seed não entra. Por isso a proposta abaixo é escrever o PLAYBOOK **nesse** caminho, já contendo o seed do kit `a001fde` na íntegra, mais as lições do dashboard.

Achado que muda o COMPROMISSO: o schema do ticket exige `"id"` com padrão `^\d{3}[a-z]?$` (`schemas/ticket.schema.json`, validado em `gate-ticket.ts:61` e conferido com o nome do arquivo em :398). **`DC-0004` não passa como id de ticket da fila.** No Comarka, `C-XXXX` é o compromisso (item do plano) e o ticket carrega `"compromisso": "C-XXXX"` com id numérico (comarka CLAUDE.md:19). Proposta: DC-XXXX = compromisso; ticket de fila = id de 3 dígitos com `"compromisso": "DC-XXXX"` (pergunta L3).

### 4. Os 8 parâmetros

| Parâmetro | Proposta | Base |
|---|---|---|
| PLANO | `docs/sessao/STATUS-PLANO.md`, escrito à mão: lista de DC-XXXX com objetivo e ponteiro. O status de ticket nunca é escrito nele; vem de `bash scripts/orq fila` (pós-instalação). | skill §1.2; o dashboard não tem `plano.py` |
| RETRATO | `docs/sessao/ESTADO-ATUAL.md` (máx. 60 linhas, modelo da skill §3) | skill §3 |
| DECISOES | `docs/sessao/decisoes-AAAA-MM-DD.md` | skill §0 |
| FILA | `bash scripts/orq fila` · `orq ticket <id>` · `orq decisoes` · `orq validar` (existem no kit: scripts/orq:473-487). Só valem depois do `--novo`. | kit scripts/orq |
| AMBIENTES | `main` (protegida, só o integrador mexe, pelo `dc-deploy`) · `staging-auto` (branch alvo do loop; **ainda não existe**) · worktrees humanas em `~/Projetos/_worktrees/dc-<assunto>` · do loop em `~/Projetos/_worktrees/dc-orq-<id>` e `dc-orq-staging-auto` (o motor monta o nome como prefixo + id e faz `worktree remove --force` nele: executor.sh:292-299, lib.sh:872) | `git branch -a`; kit |
| BANCO | Supabase `ogfnojbbvumujzfklkhh`, leitura por `execute_sql` (MCP), agregada e com `limit`; `information_schema.columns` antes de citar coluna | CLAUDE.md:12, :15 |
| ZONA_PROTEGIDA | ver abaixo | migrations + `src` |
| COMPROMISSO | `DC-XXXX` (item do plano; ver item 3) | decisão do CONTEXTO + schema |

**ZONA_PROTEGIDA, conferida contra o repo.** Varri `src/`, `scripts/`, `supabase/migrations/`, `migrations/` e `sql/` com o mesmo critério do motor (`.from('t')…insert|update|upsert|delete` e SQL de escrita/DDL; o motor usa esse regex em enforcement-core.ts:474-483 e congela por nome em :534).

| Lista | Tabelas | O dashboard escreve hoje? |
|---|---|---|
| C0 analítico | `clientes_receita`, `leads_crm*`, `trafego_*`, `ads_metadata`, `ads_performance`, `vw_atribuicao_proporcional`, `fn_mql_sql_by_month` | (já era C0) |
| `trafego_regras_historico` | | **Sim, em 6 rotas**, não só na exceção autorizada: `api/trafego/regras-historico/route.ts:40` (autorizada) e também `api/ia/avaliar-alerta-trafego/route.ts:186`, `api/meta/{ativar:53, duplicar:53, editar-budget:66, pausar:64}/route.ts` |
| `ghl_comercial` | `ghl_etapa_mapa`, `ghl_user_map`, `ghl_funnel_snapshot`, `ghl_sdr_alerts`, `ghl_unmapped_users`, `ghl_etapas_nao_mapeadas` | **Sim, 5 delas**: `ghl_user_map` (5 rotas, inclui `delete` em `api/admin/ghl-user-map/route.ts:171`), `ghl_funnel_snapshot` (`delete`+`insert` em `api/ghl-funnel/sync/route.ts:141,146`), `ghl_sdr_alerts` (`cron/reconcilia-mql:76`), `ghl_unmapped_users` (2), `ghl_etapas_nao_mapeadas` (`lib/ghl-etapa.ts:119`). DDL de criação está em `migrations/` deste repo |
| `dashboard_readonly` | `meta_form_leads`, `meta_lead_matching_status`, `creative_scores`, `ai_ad_creatives`, `ai_adset_targeting`, `ai_alerts`, `ai_performance_snapshots`, `ai_placement_analysis`, `ai_usage_log` | **Sim, 8 de 9** (ex.: `creative_scores` 11 escritas, `meta_form_leads` 7). O DDL de criação é deste repo (`supabase/migrations/20260503_p64_ad_intelligence_v2_tables.sql`, `20260717_meta_form_leads_match_method.sql`) |
| `perf_*` | | **Sim, 11 escritas** (`api/auth/perf-meta/callback/route.ts:121,138`, `api/perf/ad-accounts/route.ts:66-102`) |
| `ia_prompts` | | **Sim**: `api/config/ia-dossie/route.ts:85` (insert), `:99` (update) |

Leitura: no Comarka, `ghl_comercial` e `dashboard_readonly` são "só leitura **para o OS**" porque são **do dashboard** (comarka rules/banco.md, "Só leitura para o OS"). Já `perf_*` e `ia_prompts` estão em `os_owned_excecoes`, ou seja, são **do OS**, e o dashboard escreve neles. Com essas tabelas em `no_write_tables`, o enforcement reprova qualquer diff do loop que contenha essas escritas, inclusive manutenção das rotas que já as fazem. Não reabro a decisão; a pergunta L2 só pede a confirmação com esse dado na mesa. Varredura extra de `meta_*`: o dashboard escreve `meta_lead_matching_runs` (11), `meta_form_leads` (7), `meta_lead_matching_log` (2) e `meta_api_error_log` (1). Nenhuma das `meta_*` do OS (`meta_connections`, `meta_ad_accounts`, `meta_insights_cache`, `meta_lead_forms`, `meta_sync_logs`, `meta_agency_connection`, `client_meta_accounts`) tem escrita aqui. Proposta: congelar as 7 do OS por nome (`meta_*` inteiro não pode virar prefixo, porque bloquearia as 4 do dashboard). Fora isso, nenhuma tabela nova apareceu além da lista.

### 5. Lições confirmadas (primeiras entradas do PLAYBOOK)

| Lição | Prova |
|---|---|
| **Teste de integração lendo `.env.local` do disco com service role escreveu em produção.** O `grace-softdelete-v128.integration.test.ts` fazia `readFileSync("../../.env.local")` e pegava `SUPABASE_SERVICE_ROLE_KEY`; rodou contra produção em 04/09, 10/09 e 16/09 com um `vitest run` comum. Resíduo: 2 linhas `TESTE-V128-SOFTDELETE CLIENTE A/B` em `clientes_notion_mirror`, apagadas em 22/10 com backup. | `git show 0f24c41^:src/__tests__/grace-softdelete-v128.integration.test.ts` linhas 18, 24, 28, 30, 51; fix `0f24c41` (alvo só `TEST_SUPABASE_*`, aborta se a URL contém o id de produção); barreira da suíte padrão `5ed537c` (`src/__tests__/setup-sem-credencial.ts`, controle negativo 3/3 vermelho sem o setup); `docs/reconciliacao/2026-10-22-delete-teste-v128.sql:2-27` |
| **`.retry()` inexistente no postgrest-js do lockfile; o teste só passava com node_modules emprestado.** `barreira-sem-credencial.test.ts:36` chamava `.retry(false)`, que não existe no `@supabase/postgrest-js 2.101.1` do `package-lock.json` (TypeError e TS2339). | `f3b7892` (corpo do commit: validação com node_modules do `npm ci`, 97 arquivos e 1.257 testes rc=0, controle negativo 3/3 vermelho, tsc 246 → 245); merge `d8be96d` |
| **Teste errado depois da mudança de base de comissão (DC-0001).** A base da comissão do closer passou de LTV para `valor_entrada` em 07/05 (`d70498b`); os testes de `calcularComissaoCloserPorContratos` continuaram esperando LTV até 22/10, e a função não tinha chamador. O teste estava errado, não a função. | `47f8afb` (29/04, base LTV) → `d70498b` (07/05, `valor_entrada`) → `2657215` (22/10, remove função e os 3 casos; `comissao-canonica.ts` intocado) |
| Achado lateral (não pedido): 3º teste que escapou da análise, pego pela barreira | `28b7e6e` (`equipe-cargo-colaborador`, via `closers-diretores.ts:80`) |

---

## Proposta de caminhos (precisa do ok)

1. **PLAYBOOK em `docs/orquestrador/PLAYBOOK.md`**, não em `docs/PLAYBOOK.md`. É o caminho que o `--novo` usa e o do Comarka; evita dois PLAYBOOKs. O arquivo nasce com o `PLAYBOOK-seed.md` do kit `a001fde` íntegro (164 linhas) e uma seção "Lições do dashboard" no fim.
2. **Cânone de domínio fora do CLAUDE.md** (fórmulas, datas, atribuição, tabelas banidas, fontes canônicas, no-show, MRR, time): movido **sem editar uma palavra** para `docs/CANONICO.md`, com uma linha de ponteiro no CLAUDE.md por seção e as 10 regras que mais causam erro repetidas em uma linha cada. Sem isso o CLAUDE.md não cabe em 150 linhas legíveis (pergunta L1).
3. `docs/sessao/` como no CONTEXTO, com o nome do diário `decisoes-2026-10-22.md`.

## Esqueleto dos arquivos

**CLAUDE.md (teto 150 linhas, alvo ≤ 100 caracteres por linha)**
```
# Dashboard Comercial (Comarka Ads)                                   ~4
O que é / não é · prod URL · Next 15 + React 19 + TS + Supabase + Vercel + npm
## Parâmetros da sessão (protocolo-sessao)                             ~10
PLANO · RETRATO · DECISOES · FILA · AMBIENTES · BANCO · ZONA_PROTEGIDA · COMPROMISSO
## Zona protegida (= no_write_tables do loop, uma lista só)            ~14
C0 analítico · trafego_regras_historico (+exceção 29/09) · ghl_comercial · dashboard_readonly
· perf_* · ia_prompts · exceção de trigger 07/10 · nunca DDL/grant/RLS/trigger/delete sem ok
## Banco                                                               ~8
mesmo projeto do Comarka · migration: escreve o .sql e para · versão livre no ledger
· information_schema antes de coluna · CREATE-only · views security_invoker · matview nasce no cron
## Comandos (npm)                                                      ~10
npm ci · npm test (sem credencial) · npm run test:integration (só TEST_SUPABASE_*)
· tsc ≤ 246 (comando exato, sem .next/ nem next-env.d.ts) · npm run build
## Testes                                                              ~8
node_modules só do npm ci · suíte padrão sem credencial · controle negativo no relatório
· teste que protege decisão não se recalcula; teste contra regra velha se corrige
## Git, integração e deploy                                            ~16
worktree por assunto em _worktrees/dc-<assunto> · pathspec · 1 commit por peça
· nunca push/merge/--no-verify · integrador único pelo dc-deploy · deploy por git archive
· hook pre-push · staging-auto só recebe merge · PAUSAR congela
## Fluxos de trabalho                                                  ~6
prompt do chat → sessão  |  ticket de fila → loop (dc-orq-*)
## Regras de engenharia (1 linha cada)                                 ~18
falhe alto · vazio ≠ falha · catch mudo · monitor sem consumidor · .trim() · premissa
envelhecida · horário na consulta · baseline sobre artefato · função no banco exige fonte na main
## Cânone de domínio → docs/CANONICO.md (ponteiros + 10 invariantes)   ~20
## Notion: não é fonte nem destino; notion_id e *_notion_mirror são nomes legados  ~2
## Páginas protegidas · Time e exclusões · Glossário → CANONICO        ~4
```

**docs/orquestrador/PLAYBOOK.md (seed 164 + lições, teto ~230)**
```
[seed do kit a001fde, íntegro]
## Lições do dashboard
### 22/10/2026: teste de integração com .env.local e service role escreveu em produção
  Data · Causa · Regra · Prova (commits)
### 22/10/2026: método inexistente na versão do lockfile, teste verde com node_modules emprestado
### 22/10/2026: teste preso a regra velha (base de comissão) por 5 meses
```

**docs/sessao/ESTADO-ATUAL.md (teto 60)**: modelo da skill §3; `main: d8be96d  staging: (não existe)`; Feito com prova; Pendente; Bloqueado; Lucas precisa.

**docs/sessao/STATUS-PLANO.md (teto 60)**: tabela DC-XXXX | objetivo | estado declarado | prova; nota "status de ticket só por `orq fila`". DC-0001, 0002, 0003 como feitos (commits) e DC-0004 = adoção do orquestrador.

**docs/sessao/decisoes-2026-10-22.md (teto 80)**: as decisões do CONTEXTO, com data e quem decidiu, mais as respostas de L1-L6.

## Perguntas que só o Lucas responde

- **L1.** Posso mover o cânone de domínio, sem editar, para `docs/CANONICO.md` e deixar no CLAUDE.md só ponteiros e as invariantes? (Alternativa: CLAUDE.md fica acima de 150 linhas.)
- **L2.** A zona protegida congela no loop tabelas que o próprio dashboard escreve hoje: 5 `ghl_*`, 8 do `dashboard_readonly`, `perf_*` (11 escritas), `ia_prompts` (2) e `trafego_regras_historico` em 6 rotas (a exceção do CLAUDE.md fala em 1). Confirma a lista assim, sabendo que o loop não poderá mexer nessas rotas? **L2b:** `trafego_regras_historico` é escrita por 5 rotas fora da exceção de 29/09; registro isso como pendência (ticket) ou a exceção cobre essas rotas? **L2c:** entram na lista, por nome, as 7 tabelas `meta_*` do OS (o dashboard não escreve nenhuma delas)?
- **L3.** DC-XXXX como compromisso e ticket de fila com id de 3 dígitos + `"compromisso": "DC-XXXX"`, como no Comarka? O schema do kit não aceita `DC-0004` como id.
- **L4.** PLAYBOOK em `docs/orquestrador/PLAYBOOK.md` (com o seed dentro) em vez de `docs/PLAYBOOK.md`?
- **L5.** O prefixo `dc-orq-` fica reservado ao loop? Esta worktree (`dc-orq-conteudo`) já o usa; não colide com `dc-orq-<id numérico>`, mas a regra para humanos passaria a ser "nunca nomear worktree `dc-orq-*`".
- **L6.** O checkout principal (`~/Projetos/dashboard-comercial`) está em `fix/aprovacoes-fila-cobrancas`. Adoto a regra do Comarka "nenhum commit no checkout principal"?

---

## Confirmações pedidas no ok

- **`no_write_tables` aceita padrão?** Não: só nome literal. `parteDeTabela` escapa `*` (`kit a001fde scripts/orquestrador/enforcement-core.ts:460-462`) e `violacoesDeTabela` casa `^nome$` (:534-539); `config-chaves.ts:71`: "lista = congeladas por nome". `prefixos_sem_ddl` só cobre CREATE/ALTER/DROP, não escrita.
- **Tabelas `perf_*` reais, conferidas nas migrations.** O dashboard não cria nenhuma (`supabase/migrations`, `migrations`, `sql`: zero `CREATE TABLE perf_`). Nas migrations do Comarka (`c16e2b8`), 53 `CREATE TABLE perf_*`:
  `perf_ad_accounts`, `perf_analises`, `perf_cliente_cor_override`, `perf_cliente_metas`, `perf_cliente_verba`, `perf_colunas_template`, `perf_colunas_visualizacao`, `perf_conta_metas`, `perf_criativos`, `perf_crm_conexoes`, `perf_crm_etapas`, `perf_crm_oportunidade_historico`, `perf_crm_oportunidades`, `perf_crm_pipelines`, `perf_crm_reconciliacoes`, `perf_crm_reprocesso`, `perf_equipe_telefones`, `perf_eventos_produtividade`, `perf_fechamento_tokens`, `perf_fechamentos`, `perf_fechamentos_informados`, `perf_formas_pagamento`, `perf_ghl_locations`, `perf_health_snapshot`, `perf_hook_tipos`, `perf_ia_credenciais`, `perf_ia_modelos`, `perf_ia_uso`, `perf_insights_daily`, `perf_lead_eventos`, `perf_leads`, `perf_leituras_relacao`, `perf_meta_campanhas`, `perf_meta_connections`, `perf_meta_discovery`, `perf_meta_receita`, `perf_nichos`, `perf_nps_disparo_fila`, `perf_nps_respostas`, `perf_nps_tokens`, `perf_otimizacoes`, `perf_portal_tokens`, `perf_portal_venda_confirmacoes`, `perf_promessas`, `perf_qualificacao_regras`, `perf_ranking_foto_mensal`, `perf_relacao_sugestoes`, `perf_relatorios_gerados`, `perf_reuniao`, `perf_sync_logs`, `perf_tese_premissas`, `perf_teses`, `perf_vacuo_tratado`.
  Mais duas de `os_owned_excecoes` sem `CREATE TABLE` no grep: `perf_ia_analises`, `perf_meta_ad_map`. O dashboard referencia 4: `perf_ad_accounts`, `perf_insights_daily`, `perf_meta_connections`, `perf_sync_logs`. A lista final do config deve sair de `information_schema.tables` (banco), na etapa do `--novo`; esta sessão não consulta o banco.
- **`trafego_*` e `leads_crm*` também precisam ser enumerados** (mesma regra). Nas migrations do dashboard: `trafego_account_managers`, `trafego_ad_accounts`, `trafego_anomalias`, `trafego_client_account_history`, `trafego_clients`, `trafego_criativo_metricas`, `trafego_criativos`, `trafego_performance_temporal`, `trafego_regras_historico`, `trafego_regras_otimizacao`; o código usa ainda `trafego_thresholds_alertas`. `leads_crm*` no código: `leads_crm`, `leads_crm_historico` (+ views `leads_crm_public`, `leads_crm_historico_public`).
- **`--verificar` compara o PLAYBOOK?** Não. Só `comparar_dir docs/orquestrador/skill` (`instalar.sh:190-191`); comentário `:19` e `:400-401`: "não toca … PLAYBOOK, nem PECAS do repo". As únicas linhas com PLAYBOOK no instalador são comentários e a cópia do `--novo` (`:675`).
- **`--novo` sobrescreve?** Não. `copiar_se_ausente` imprime "já existe … (não sobrescrevo)" e retorna (`instalar.sh:588-593`), chamado em `:675`.

## Escolha a declarar (P0)

Além das regras de negócio, movi junto, byte a byte, as **Regras de engenharia** (texto integral, antigas linhas 102-123), as **Proteções obrigatórias** (95-100) e o bloco **ESTADO ATUAL CTWA** (156-164, regra canônica de atribuição a anúncio e frentes F2-F5). Motivo: o CLAUDE.md novo só cabe com essas regras em uma linha, e o texto integral com os incidentes não podia sumir. A linha 165 (pnpm/build) não foi movida: foi apagada na P1. O bloco CTWA chegou ao CANONICO com o texto velho ("ainda não em produção"); não editei, porque L1 pede movimento sem reescrita. Fica para correção em peça própria.

## Peças

### 7ed5e09 docs(canonico): move as regras de domínio do CLAUDE.md para docs/CANONICO.md, byte a byte

```
 CLAUDE.md        | 123 -----------------------------------------------------
 docs/CANONICO.md | 127 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 127 insertions(+), 123 deletions(-)
```

### 682a8c4 docs(claude): reescreve o CLAUDE.md para a adoção do orquestrador

```
 CLAUDE.md | 137 ++++++++++++++++++++++++++++++++++++++++++++++++--------------
 1 file changed, 106 insertions(+), 31 deletions(-)
```

### 2717248 docs(orquestrador): PLAYBOOK com o seed do kit a001fde e as lições do dashboard

```
 docs/orquestrador/PLAYBOOK.md | 237 ++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 237 insertions(+)
```

### b9dc967 docs(sessao): retrato, status do plano e decisões de 22/10 (DC-0004)

```
 docs/sessao/ESTADO-ATUAL.md        | 32 +++++++++++++++++++++++++++++
 docs/sessao/STATUS-PLANO.md        | 22 ++++++++++++++++++++
 docs/sessao/decisoes-2026-10-22.md | 41 ++++++++++++++++++++++++++++++++++++++
 3 files changed, 95 insertions(+)
```

### Prova da P0 (movimento byte a byte)

```
$ diff <(git show d8be96d:CLAUDE.md | sed -n "17,127p;153,164p") <(git show 7ed5e09:docs/CANONICO.md | tail -n +5) && echo IDENTICO
IDENTICO
$ diff <(git show d8be96d:CLAUDE.md | sed -e "153,164d" -e "17,127d") <(git show 7ed5e09:CLAUDE.md) && echo RESTO_INTACTO
RESTO_INTACTO
$ sha256 das linhas movidas (origem) e do CANONICO sem cabeçalho
95f55d8553a348b97a47fa9a795747dce8fe0beb83482f93ae181c61c72d0326  -
95f55d8553a348b97a47fa9a795747dce8fe0beb83482f93ae181c61c72d0326  -
$ git diff --stat d8be96d 7ed5e09
 CLAUDE.md        | 123 -----------------------------------------------------
 docs/CANONICO.md | 127 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 127 insertions(+), 123 deletions(-)
$ cabeçalho adicionado (4 linhas, únicas que não vieram do CLAUDE.md)
# Cânone de domínio: Dashboard Comercial

> Movido byte a byte do `CLAUDE.md` (v2.2) em 22/10/2026, sem edição de texto. Itens datados valem pela data em que foram escritos; o estado vivo (banco, git) vence este arquivo.

```

### Prova da P2 (seed íntegro)

```
$ diff <(git -C ~/Projetos/orquestrador-kit show a001fde:doutrina/templates/PLAYBOOK-seed.md) <(git show 2717248:docs/orquestrador/PLAYBOOK.md | head -164) && echo SEED_IDENTICO
SEED_IDENTICO
```

### Critérios de pronto

```
$ grep -ci pnpm CLAUDE.md
0
$ grep -ni notion CLAUDE.md
10:Notion não é fonte nem destino de dado (DC-0002). `notion_id` e `*_notion_mirror` são nomes legados no banco.
$ wc -l -c CLAUDE.md
     117    9121 CLAUDE.md
$ grep -c 'd8be96d' docs/sessao/ESTADO-ATUAL.md
4
```

## Diffs crus

### 7ed5e09 docs(canonico): move as regras de domínio do CLAUDE.md para docs/CANONICO.md, byte a byte

````diff
diff --git a/CLAUDE.md b/CLAUDE.md
index 503dcdd..2a21e34 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -14,117 +14,6 @@ Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui (dark), Supabase (`ogfnoj
 ## WORKFLOW (INVIOLÁVEL)
 Lucas descreve a demanda → Claude (chat) gera prompt estruturado .md → Claude Code executa. Todo prompt contém: contexto acumulado, premissas inegociáveis, PASSO 0 de pré-leitura obrigatória, tarefas numeradas, revisão final obrigatória e lista explícita de NÃO FAZER. Diagnóstico SEMPRE antes de correção: confirmar causa-raiz com queries reais no Supabase (`information_schema.columns` primeiro — nunca assumir nome de coluna).
 
-## FÓRMULAS CANÔNICAS (NUNCA ALTERAR SEM APROVAÇÃO EXPLÍCITA)
-- **ROAS = entrada confirmada (contratos status='ativo') / investimento.** NUNCA LTV. NUNCA incluir `pendente_aprovacao`.
-- **Investimento**: SEMPRE via `getInvestimentoMensal()` em `src/lib/metricas/investimento.ts` (Meta API + fallback `ads_performance`). NUNCA `config_mensal`. Inclui anúncios pausados que gastaram no período.
-- **CPL** = investimento / leads (ponderado, nunca média simples).
-- **MQL/SQL**: primeira passagem do lead por etapa com `classificacao` em `config_funil_etapas`, via `leads_crm_historico` (MIN(changed_at) em BRT), fallback etapa atual para leads sem histórico.
-  - Período custom → `getMqlSqlByPeriodo()` / `fn_mql_sql_by_periodo` (evento dentro do range).
-  - Mês fechado → `getMqlSqlByMonth()` / `fn_mql_sql_by_month`.
-  - %MQL > 100% é possível e correto (lead de um mês qualificando no seguinte).
-- **Comissão**: somente via `comissao-canonica.ts`. Nunca criar sistema paralelo.
-- **Contratos `pendente_aprovacao` NÃO contam** como receita confirmada (fora de MRR, novos clientes e denominador de ROAS).
-- **No-show remarcado continua contando como no-show.** Remarcação cria evento novo; não anula nem substitui o no-show anterior. (Regra de negócio, Lucas, 15/09/2026.) São dois eventos, não um corrigindo o outro — "no-show seguido de reunião" NÃO é inflação de no-show. Na ingestão da agenda: linha em `no_show` com agendamento cancelado no GHL é o comportamento esperado e NÃO gera alerta (ticket 038).
-- **MRR — 3 números distintos, nunca conflatar:**
-  1. MRR canônico (headline) = `clientes_receita WHERE status_financeiro='ativo'`
-  2. Carteira ativa total = `clientes_receita WHERE status='ativo'` (≠ MRR; não rotular como MRR)
-  3. "MRR contratado" = `contratos.mrr` (vendido, não necessariamente ativo)
-  `clientes_receita` tem DUAS colunas de status (`status` = ciclo de vida; `status_financeiro` = financeiro).
-
-## DATAS E TEMPO
-- Agregação temporal de leads: `ghl_created_at AT TIME ZONE 'America/Sao_Paulo'`. NUNCA `created_at` de `leads_crm` (poluído por imports em lote).
-- `mes_referencia` de leads NUNCA é sobrescrito (trigger SQL protege). Formato TEXT `'YYYY-MM'`.
-- ⚠️ `mes_referencia` é TEXT em `contratos`/`despesas` e DATE em `custos_agencia_mensal`/`financeiro_fluxo_caixa` — normalizar em agregações cross-table.
-- `ghl_created_at`/`ghl_etapa_atual` são preenchidos pelo cron `/api/sync` às 06:00 UTC do dia seguinte — NULLs intradiários no dia corrente são esperados, não regressão.
-- Presets de data rolling: `dataFim = ontem`, `dataInicio = hoje - N` (espelha Meta Manager, exclui hoje).
-
-## ATRIBUIÇÃO
-- Cutoff universal: `ATRIBUICAO_INICIO_DATA = 2026-04-03`. Toda vinculação de origem (ad_id, lead→contrato, reunião→contrato, coortes) vale só desta data em diante.
-- Lead → anúncio: `leads_crm.ad_id` → `ads_metadata` (COALESCE com campos do próprio lead).
-- Contratos ↔ `clientes_receita`: via `lead_id` / `normalize_cliente_nome()`. NUNCA `cliente_id` (aponta para tabela quebrada, match zero).
-- L.Meta canônico: `onsite_conversion.lead_grouped` (não `"lead"`, que inclui pixel).
-- Roteamento de campanha: `ads_metadata.objetivo`. NUNCA `tipo_campanha` (70/87 nulls).
-- `vw_atribuicao_lead_mes`: usar LATERAL JOIN (nunca OR join — duplica lead_id e aborta refresh silenciosamente). v2 em criação deriva qualificação do histórico.
-- `contratos.valor_total_projeto` é GENERATED ALWAYS — remover de qualquer payload de INSERT/UPDATE (usar `buildContratoPayload` em `src/lib/contratos/build-contrato-payload.ts`).
-
-## TABELAS C0 (compartilhadas com o Comarka OS)
-C0 = `clientes_receita`, `leads_crm*`, `trafego_*`, `ads_metadata`, `ads_performance`, `vw_atribuicao_proporcional`. Proibido DDL, grant, RLS ou trigger nelas a partir deste repo, e nenhuma rota do comercial escreve nelas por conta própria.
-- **Exceção de escrita autorizada (29/09/2026, decisão do Lucas):** `POST /api/trafego/regras-historico` grava em `trafego_regras_historico` exatamente a linha que a tela `/trafego/alertas` já gravava (`ad_id`, `acao` ∈ {`ignorada`, `falsa_positiva`}, `valor_metrica_no_momento: 0`, `observacao`) **mais `aplicada_por = employeeId` da sessão**. Só admin ou gestor de tráfego (`employees.is_gestor_trafego`; SDR e closer = 403). Qualquer outra escrita em C0 precisa de aprovação explícita.
-- **Exceção de DDL autorizada (07/10/2026, decisão do Lucas; aplicada 08/10):** UM trigger em `clientes_receita`, `trg_clientes_receita_status_log` (AFTER UPDATE OF `status`, `status_financeiro`), que chama `fn_clientes_receita_status_log()` (SECURITY DEFINER) e grava em `clientes_receita_status_log` (tabela nova, só `service_role` lê). Migration: `supabase/migrations/20261007200000_clientes_receita_status_log.sql`; spec: `docs/specs/historico-status-receita.md`. **Escopo exato: só esse trigger.** O trigger de `updated_at` (`supabase/migrations/20261007200100_clientes_receita_updated_at.sql`) NÃO está coberto — fica sem aplicar até o Comarka OS trocar `computeChurnMes` para `churn_log` (`docs/specs/ticket-comarka-os-churn.md`) e exige nova aprovação. Nenhuma outra exceção à regra CREATE-only.
-
-## TABELAS BANIDAS (NUNCA USAR)
-`clientes` (trigger quebrado), `vw_churn_mensal` (sem guarda de status — usar `vw_admin_churn_mensal`), `vw_trafego_funil_mensal`, `lancamentos_despesa` (vazia/legado — custos vêm de `despesas`).
-⚠️ **COLUNA BANIDA: `ads_performance.leads`** (e o `cpl` derivado dela) — coluna crua da Meta (action `"lead"` = `lead_grouped` + `fb_pixel_lead`), infla 4-66% por campanha; fonte canônica de lead Meta = `onsite_conversion.lead_grouped` (e `leads_crm` por ad para análise por anúncio via `leads-canonicos.ts`). Nunca ler em cálculo/auditoria. A coluna segue no schema e segue sendo ESCRITA pelo sync — NUNCA renomear/alterar/dropar (5 matviews dependem dela no REFRESH); o banimento é de LEITURA (cutover Onda 2, 2026-07-17).
-Aposentados como fonte: `lancamentos_diarios.ganhos` e `mrr_dia`.
-⚠️ **COLUNA BANIDA PARA LEITURA: `config_mensal.leads_totais`** (06/10/2026, decisão do Lucas). É um contador mantido por trigger — `trg_increment_leads` (+1 no INSERT em `leads_crm`), `trg_decrement_leads` (−1 no DELETE) e a RPC `incrementar_leads` — e deriva da contagem real (medido 06/10: jan −62, fev −57, mar −116, jun +2, ago +4, set +1, out −7). **Só escrita via trigger**; nunca ler em cálculo, tela ou fallback. Coluna e triggers ficam (CREATE-only, nunca DROP). Fonte canônica: `src/lib/metricas/leads-mes.ts` (falha de leitura ⇒ `null`/'n/d', nunca 0 e nunca o contador).
-  - **Exceção registrada ao eixo `ghl_created_at`:** a **contagem mensal de leads** usa `leads_crm` por **`mes_referencia`**, alinhada ao `_audit_baseline_metrics_v2.leads_totais_mes` (`SELECT count(*) FROM leads_crm WHERE mes_referencia=…`). Os dois eixos NÃO batem (ago/2026: 455 por `mes_referencia` × 425 por `ghl_created_at`) — declare qual usou.
-  - Leituras remanescentes conhecidas (06/10): ramo legado do `calcKpis` para jan–mar/2026 (em shadow contra `leads_crm`) e `src/app/api/auditoria/route.ts` (sem consumidor no repo). Não criar novas.
-⚠️ MORTAS: `lead_funnel_events` (sem eventos desde 10/05/2026) e `v_funnel_by_ad` (órfã, derivada dela) — não usar nenhuma das duas como fonte. Os objetos ficam inertes no banco (regra CREATE-only, nunca DROP).
-
-## FONTES CANÔNICAS
-- Reuniões: `src/lib/reunioes-frescas.ts` sobre `lancamentos_diarios` (sync GCal). A matview `vw_reunioes_consolidada` é MATVIEW e DEPENDE do cron horário `refresh_trafego_views_hourly` — cadastrada nele em 13/07/2026 (ficou congelada mai→jul/2026 por nunca ter sido cadastrada; descongelada na mesma data). Zero consumidores de código hoje; se voltar a ser consumida, confira o frescor via `fn_derivacao_gaps()`.
-- No-show — CUTOVER EXECUTADO (Onda 2, 17/07/2026, flip automático pós-20/07): canônico = `getNoShowCanonico()` em `src/lib/no-show-canonico.ts`, com **QUEBRA DE SÉRIE explícita em 2026-05-01**: pré-maio = `lancamentos_diarios.no_show` (coluna `data`; abr 33 CONFIRMADO com a operação) · maio+ = `leads_crm_historico` etapa `'no_show'` via `fn_no_show_por_periodo` (GHL). As duas fontes NUNCA são costuradas/reconciliadas — período que cruza a fronteira expõe as fatias + `quebra_de_serie=true`; UI sinaliza a quebra (tendência não comparável através dela). Até 2026-07-20 (fim do shadow) o oficial em tela ainda é o proxy `MAX(no_show, agendadas − realizadas)`; depois o flip é automático. FALHE ALTO: sem leitura ⇒ null/'n/d', nunca zero.
-  - **TAXA de no-show — canônico próprio, set-consistente**: `getNoShowTaxa()` em `src/lib/no-show-taxa.ts` / `fn_no_show_taxa_por_periodo` (maio+). A taxa NÃO usa `lancamentos_diarios.reunioes_marcadas` (fonte manual esparsa) nem cruza janelas temporais. Numerador ⊂ denominador por construção, do MESMO conjunto de linhas: **denominador** = reuniões RESOLVIDAS no período = linhas cuja etapa anterior **DERIVADA por `LAG(etapa_nova) OVER (PARTITION BY lead_id ORDER BY changed_at)`** é `'reuniao_agendada'` (`changed_at` BRT na janela, por LINHA de transição); **numerador** = subconjunto com `etapa_nova='no_show'`. Referência (SELECT puro DERIVADO 20/07): mai 77/18/23,4% · jun 84/16/19,0% · jul 65/6/9,2% (parcial; à referência r3 original dava 61/6/9,8%, driftou no mesmo dia = mês aberto). `periodo_incompleto=true` quando o período alcança o mês corrente (sync de transições atrasa → taxa instável) — quem exibir DEVE sinalizar. ⚠️ **BLINDAGEM (r3)**: a etapa anterior é DERIVADA por LAG, NUNCA lida da coluna `leads_crm_historico.etapa_anterior` — essa coluna está QUEBRADA na ingestão desde jul/2026 (etapas de AVANÇO gravam NULL, só as de PERDA gravam a origem; 82% de `proposta_enviada` NULL em julho), o que pela coluna derrubava o denominador de julho a 27 e inflava a taxa a 33,3% (vs ~9,2% real, ~3,4x). A derivação BLINDA contra o bug, NÃO o corrige (ticket Infra/Dados separado; a coluna segue se degradando). ⚠️ **DIVERGÊNCIA vs headline**: em julho o numerador derivado dá 6, contra 9 do headline `fn_no_show_por_periodo` — 3 linhas cuja coluna dizia `'reuniao_agendada'` mas cuja sequência real era `follow_up`/`remarketing` (leads `579fb16c…`, `ce00fb6b…`, `643d96c0…`). A derivada é mais fiel; ESTA série diverge do headline de propósito — `fn_no_show_por_periodo` NÃO foi alterada nesta rodada. ⚠️ LIMITAÇÃO CONHECIDA: este numerador (só de `'reuniao_agendada'`, mai=18) DIFERE do headline (1ª passagem qualquer origem, mai=21); os 3 de maio vieram de `desqualificado`/`ligacao`/`oportunidade` — métricas distintas de propósito, não conflatar nem "corrigir".
-  - **DUAS DEFINIÇÕES DE NO-SHOW, LADO A LADO — medem coisas diferentes e NÃO se reconciliam** (08/09/2026):
-    | | **No-show (agenda)** | **No-show (CRM) — canônico headline** |
-    |---|---|---|
-    | Fonte | `lancamentos_diarios.no_show`, derivado de `lancamentos_diarios_eventos` | `leads_crm_historico` etapa `'no_show'` via `fn_no_show_por_periodo` |
-    | Definição | evento de agenda que o closer confirmou como no-show, **um a um** | lead que **alguém moveu** para a etapa `no_show` no CRM |
-    | Preenchido por | closer, no portal, no dia | quem lembrar de mexer no CRM |
-    | Vale para | mai/2026+ (fluxo por eventos; `CUTOFF_EVENTOS = 2026-05-01`) | mai/2026+ (quebra de série; pré-maio = a coluna) |
-    | Exibido em | `/analise-dias`, `/relatorio` — rotulados **"(agenda)"** | `getNoShowCanonico()`, shadow do `/relatorio` |
-
-    Divergência medida (agenda × CRM): mai 25×21 · jun 24×16 · jul 35×28 · ago 22×28 · **set 6×0**. Tabela completa e explicação em `docs/auditoria/2026-09-no-show-agenda-vs-crm.md`.
-    Setembro é o caso didático: 6 no-shows confirmados evento a evento na agenda, 0 no CRM porque o time não move a etapa. Nenhum dos dois é "o errado" — **são conjuntos diferentes**, e a regra de NUNCA costurar as fontes vale entre estas duas também.
-    ⚠️ `lancamentos_sdr.no_show` é uma **QUARTA** fonte (as outras três: agenda, CRM, e o proxy `marcadas − feitas`): digitação manual do SDR, tabela distinta. Alimenta `/sdr` e `/relatorio-sdr`, rotulados **"(SDR)"**. ⚰️ **FONTE MORTA**: 6 linhas no total, de 2026-01-31 a **2026-04-03**. Desde maio essas telas mostram vazio ou dado de abril e ninguém reclamou em 5 meses. Registrado, não corrigido (08/09/2026).
-    ⚠️ Todo número de no-show em tela DEVE carregar a origem no rótulo. Foi a ausência disso que deixou três fontes conflitantes conviverem sem ninguém notar.
-  - ⚠️ ETAPA MORTA `reuniao_feita`: ZERO eventos em `leads_crm_historico` desde sempre (mai/jun/jul = 0). Configurada e nunca usada — NÃO derivar nada dela (a "Taxa Comparecimento" via `reunioes_feitas` vem de `lancamentos_diarios`, não desta etapa). Objeto fica inerte (CREATE-only, nunca DROP).
-- **Receita realizada — `pagamentos_mensais` MANDA (`status='pago'`, campo `valor_pago`).** Decisão do Lucas (D11, 11/09/2026). `recebimentos_mensais` é **SECUNDÁRIA como receita** — nunca a fonte do headline, nunca somada à outra. Motivo: `pagamentos_mensais` tem composição auditável (linhas nominais + `created_at` de carga), e foi ela que permitiu nomear as divergências do ticket 028 §7.3.1; `config_mensal.receita_realizada` está **aposentada** como fonte de receita (mesma decisão).
-  - ⚠️ **`recebimentos_mensais` segue CANÔNICA como base de COMISSÃO** (`comissao-canonica.ts`, 5 leituras) — ela tem `closer_id`, `contrato_id`, `plataforma` e `asaas_pagamento_id`, que `pagamentos_mensais` NÃO tem. "Secundária" vale só para receita. **NUNCA migrar comissão para `pagamentos_mensais`.**
-  - ⚠️ **As duas NÃO são intercambiáveis e NUNCA se somam.** `recebimentos_mensais` só começa em **2026-03** (jan/fev/nov-2025 não existem nela). Em março `pagamentos` dá R$ 141.387/83 linhas e `recebimentos` R$ 137.887/76 — e o Δ de R$ 3.500 é **saldo líquido** de 12 linhas só em `pagamentos` (R$ 11.500) contra 5 só em `recebimentos` (R$ 8.000): `pagamentos_mensais` **não é superset**. De **mai/2026 em diante** a divergência muda de natureza (as mesmas linhas nas duas com status diferente — 32 `pendente` em maio que são `pago` na outra), então **somar duplica receita**. Diagnóstico completo: `docs/tickets/ticket-032-divergencia-pagamentos-vs-recebimentos-mensais.md`.
-  - ⚠️ `pagamentos_mensais` **não tem status `reembolsado`** (só `pago`/`pendente`/`parcial`/`perdoado`/`parceria`/`previsto`) — a fonte canônica **não sabe expressar estorno**, e `recebimentos_mensais` sabe. Estorno em tela é lacuna conhecida, não zero.
-  - ⚠️ As duas **não têm chave comum** (`pagamentos.cliente_id` uuid × `recebimentos.cliente_nome` TEXT). Junção só por `normalize_cliente_nome()`, que erra nos dois sentidos — não casa variantes do mesmo cliente e colide homônimos (`Thiago araujo`/`Thiago Araujo`). Não usar como chave em código de produção enquanto o ticket 022 estiver aberto.
-- Custos: `despesas` (tem `deleted_at`)
-- Contratos: tabela `contratos` (nunca `clientes`)
-- Status de contrato em uso: `rascunho`, `pendente_aprovacao`, `ativo`, `cancelado` (churn real), `cancelado_invalido` (nunca foi venda)
-- ⚠️ `clientes_receita` e `leads_crm` NÃO têm `deleted_at` — nunca filtrar por ela nessas tabelas.
-
-## TIME E EXCLUSÕES
-Lucas = diretor (`closer_id a987d655-88d0-490b-ad73-efe04843a2ec`), `recebe_comissao=false`, EXCLUÍDO de CAC e rankings (constante `CLOSER_DIRETOR_IDS`). Fernando: bônus R$500, excluído de CAC. Closers: Mariana, Rogério, Larissa. SDR: Davi.
-
-## PROTEÇÕES OBRIGATÓRIAS EM TODA MUDANÇA
-1. ⚠️ **`docs/backups/` é CONVENÇÃO DORMENTE — não seguir.** Última entrada 18/05/2026; as mudanças desde então (inclusive o fix do /dashboard de 03/09 e o do /crm de 04/09) não geraram backup e não devem gerar. **A reversão é coberta pelo histórico da branch**: toda mudança nasce em branch própria, com `main` intacto até o merge — `git revert`/`git diff` fazem o que a pasta fazia, sem cópia manual que envelhece. Os arquivos existentes ficam onde estão (CREATE-only vale para o repo também). Registrado em 04/09/2026 para a convenção parar de entrar nos prompts como se estivesse viva.
-2. Shadow mode para qualquer mudança de cálculo visível (valor antigo + novo lado a lado por 7 dias)
-3. Comparar contra `_audit_baseline_metrics_v2` (tabela public, 52 rows) ao final; divergência >0.5% fora do escopo → PARAR E REPORTAR
-4. Soft delete sempre; nunca DELETE físico
-5. Ambiguidade real → pausar e reportar, nunca chutar
-
-## REGRAS DE ENGENHARIA (v2.3 — lições dos 7 falsos-verdes: Data Health, _check_ingestao_gap, matview de reuniões, no_show, webhook tl;dv, getEventsForRange, upsert do gcal_sync)
-- **VAZIO E FALHA SÃO FATOS DIFERENTES — E O TIPO TEM QUE OBRIGAR A DISTINGUIR** (08/09/2026): três leituras nesta base devolviam lista vazia em erro e o chamador lia isso como "não havia nada". `getEventsForRange` (3 caminhos: sem token, HTTP não-2xx, exceção) fazia um apagão total do Google Calendar ser indistinguível de um dia sem reunião, com o run reportando verde. Corrigido para `{ ok: true, eventos } | { ok: false, falha }` — **nunca reintroduza retorno de array cru em leitura de fonte externa**. Ver `src/lib/google-calendar.ts` e `src/app/api/cron/sync-gcal/route.ts`. Teste dos caminhos de falha: `scripts/testes/teste-5bis-falha-leitura-gcal.ts`.
-- **`catch { }` MUDO É PROIBIDO EM ESCRITA DE MONITOR** (08/09/2026): o `sync-gcal` gravava status em `ultima_execucao` e `detalhes`, colunas que NÃO EXISTEM em `sistema_integracao_status` (as reais são `ultimo_ping_em`, `ultimo_ping_sucesso_em`, `mensagem_erro`). O upsert falhava em TODA execução e o `catch { /* best effort */ }` engolia. Nunca houve linha `gcal_sync`: o painel de saúde não mostrava a fonte, e a ausência passou por "sem problema". Monitor que não escreve é pior que monitor ausente — a ausência pelo menos é visível. Se a gravação do monitor pode falhar em silêncio, ela vai.
-- **MONITOR SEM CONSUMIDOR MORRE** (08/09/2026): `fn_ingestao_gaps()` acusava `tldv = critico` havia **387 horas** e detectou o apagão do webhook no primeiro dia. O instrumento existia, estava certo e ativo. Ninguém olhou. Detecção não é alerta: alerta é o caminho até uma pessoa. Ao criar monitor, entregue o consumidor junto.
-- **CREDENCIAL DE ENV NASCE COM `.trim()`** (15/09/2026, decisão do Lucas): toda leitura NOVA de credencial de `process.env` é `process.env.X?.trim() || undefined`. Desde o deploy de 11/09 a ingestão da agenda tomou 401 do GHL em 100% dos runs, enquanto health-check e `/api/sync`, com a MESMA env, ficavam verdes. Hipótese: `\n` no fim de `GHL_LOCATION_ID` na Vercel — o parser de URL descarta `\n` no path/template string, mas `URLSearchParams` o codifica como `%0A`. O mesmo segredo funciona numa rota e falha em outra, e o monitor de quem não usa `URLSearchParams` fica verde. As leituras antigas sem trim são **pendência conhecida** (`docs/tickets/ticket-036-credenciais-de-env-sem-trim.md`) — não corrigir de carona.
-- **FALHE ALTO**: nunca fallback mudo, nunca verde/zero por falta de leitura. Zero e "não sei" são coisas DIFERENTES: falha de leitura ⇒ `'n/d'`/status de erro, nunca 0. Um gate que silencia não é proteção.
-  - **Falha de leitura NUNCA vira zero na tela.** Os dois padrões proibidos, ambos causadores do incidente de 03-04/09/2026:
-    - `count || 0` — erro de permissão vira contagem zero
-    - `data ?? []` / `data || []` — erro vira lista vazia, e a tela renderiza "não há registros"
-  - Onde a leitura pode falhar, o estado de erro tem que ser distinto do estado vazio, e visível ao usuário. **Precedente:** o /crm exibiu 0 leads em todos os meses, com 3.929 no banco, sem um único aviso na tela.
-- **PREMISSA ENVELHECIDA**: card/ticket de bug com mais de 7 dias tem a premissa RECONFIRMADA com query real antes de virar prompt. Card velho é hipótese, não diagnóstico (ex.: "o refresh vai mudar números em tela" — quando o código já tinha migrado da matview).
-- **MATVIEW NASCE NO CRON**: nenhuma matview é criada sem ser cadastrada no cron de refresh na MESMA migration (foi omissão de cadastro que congelou `vw_reunioes_consolidada` por 2 meses). O frescor de derivação é vigiado por `fn_derivacao_gaps()`.
-- **1 SESSÃO POR WORKTREE**: o worktree é CRIADO E VERIFICADO antes da sessão abrir; a sessão CONFIRMA seu diretório (`pwd` + `git rev-parse --show-toplevel` + branch) no passo 0.0 ANTES de trabalhar. NUNCA `git checkout` de outra branch no worktree — checkout no diretório compartilhado muda o HEAD de todas as sessões.
-- **BANCO É FATO**: nenhum DROP/REPLACE de objeto de produção sem colar a definição VIVA (`pg_get_functiondef`/`pg_get_constraintdef`) no relatório ANTES da mudança. Arquivo de migration é intenção; banco é fato — eles divergem.
-- **TESTE QUE NÃO FOI VISTO FALHANDO NÃO CONTA COMO TESTE** (09/09/2026): todo teste de guard, de invariante ou de rollback precisa de **controle negativo demonstrado**, e o resultado do controle negativo entra no relatório. Verde sem controle negativo não é evidência: um teste que nunca falha e um teste que não testa nada são indistinguíveis de fora. Três casos desta base, todos reais:
-  - o teste da 6.1 só valeu depois de ser rodado contra uma rota adulterada com `.not("lead_id","is",null)` no GET — e falhar;
-  - o teste de idempotência da ingestão passou na primeira execução com **zero itens nos dois runs**: o mês já estava ingerido, nada foi escrito, tudo verde, provando nada. Só valeu depois de estragar uma linha de propósito;
-  - a migration idempotente dos DDL só valeu depois de detectar uma constraint homônima com um valor a mais — a primeira tentativa de controle usou uma constraint mais ESTREITA e o próprio Postgres barrou antes (23514), o que não testava a migration, testava o Postgres.
-  A mesma lição vale para DDL: `if not exists` que aceita qualquer estado existente não é idempotente, é cego — "já existe, então está certo" é a família do fallback mudo.
-- **O HORÁRIO QUE VOCÊ ESTÁ VENDO PODE ESTAR NA SUA CONSULTA, NÃO NO DADO** (09/09/2026): 9 eventos "às 21:00 BRT / 00:00 UTC" pareciam prova de derivação de data em UTC. Não eram: o `event_start` deles é uma **data pura** (`"2026-06-05"`, evento de dia inteiro do Google), sem hora nenhuma. As 21:00 apareciam porque a query de diagnóstico fazia `::timestamptz` numa data pura — meia-noite UTC, 21h BRT do dia anterior. **O horário estava na consulta.** Antes de concluir "bug de fuso", confira o valor CRU da coluna, sem cast. É a mesma família do baseline de 313: diagnóstico por artefato do próprio diagnóstico.
-- **BASELINE MEDIDO SOBRE ARTEFATO GERADO NÃO É BASELINE** (09/09/2026): a barra de delta-0 foi mantida o dia inteiro contra **313** erros de `npx tsc --noEmit`. O baseline real é **279** — os outros 34 vinham de `.next/types/`, cache de build local. Deu certo por acidente: o cache era o mesmo dos dois lados de cada comparação, então o delta continuou honesto. Bastaria alguém limpar o `.next` no meio para o número "melhorar" sozinho e a gente caçar fantasma. **Toda medição de delta-0 exclui `.next/`**; um número que parece dado e é resíduo de build é a mesma família do `DEFAULT 0` e do `data ?? []`. Achado durante o rebase sobre a main (ticket 018, Risco 5).
-- **FUNÇÃO NO BANCO EXIGE FONTE NO MAIN**: nenhuma função/migration é aplicada em produção sem que o código correspondente seja mergeado em `main` no MESMO ciclo. Em 13/07 o main ficou 5 funções atrás do banco (fn_ingestao_gaps, fn_ingestao_horas_sem_fds, fn_cobertura_atribuicao/normaliza_canal_v2, fn_no_show_por_periodo, fn_derivacao_gaps) — se a branch sumisse, haveria função em produção SEM FONTE.
-
-## PÁGINAS PROTEGIDAS (fórmulas calibradas — não alterar sem aprovação explícita)
-`/trafego/visao-geral`, `/trafego/relatorios`, `/trafego/relatorio-auto`, `/dre`.
-
 ## GIT / DEPLOY
 - Fluxo: `git add` SELETIVO no worktree da feature → merge em `main` no `~/Projetos/_worktrees/dc-deploy` → `git pull --ff-only origin main` → deploy por **`git archive`** do commit (abaixo) → registrar a linha em `docs/deploy/registro-producao.md` → validação autenticada em NAVEGADOR anônimo (nunca curl — middleware de auth mascara 404 com 401/307).
 - **Deploy = `git archive` do commit, NUNCA `vercel --prod` direto na worktree** (29/09/2026). Motivo: o `vercel --prod` sobe o DISCO, não o commit — arquivos não rastreados, modificações não commitadas e resíduo local vão junto, e o que roda em produção deixa de ser o SHA registrado (a `dc-deploy` subia `Checking`/`No`, lixo não versionado de 19/09, em todo deploy). Receita:
@@ -150,16 +39,4 @@ Lucas = diretor (`closer_id a987d655-88d0-490b-ad73-efe04843a2ec`), `recebe_comi
 ## DDL (Supabase)
 Migrations CREATE-only (nunca ALTER/DROP em objetos existentes). Colunas novas nullable. Views novas com `security_invoker=true` + `REVOKE ALL` de anon/authenticated. Matviews: UNIQUE INDEX para REFRESH CONCURRENTLY. `pg_cron` ativo (refresh horário via `refresh_trafego_views_hourly`).
 
-## GLOSSÁRIO
-MRR = receita recorrente mensal | LTV = valor total do contrato | CAC = custo por cliente | CPL = custo por lead | CPMQL = custo por MQL | Closer = vendedor | SDR = qualificador | GHL = GoHighLevel | Churn = cancelamento real (`cancelado`)
-
-## ESTADO ATUAL — Atribuição fantasma CTWA (2026-07-31)
-Diagnóstico completo em `docs/diagnosticos/2026-07-31-atribuicao-fantasma-campaign-id-sem-ad-id.md`.
-- **`SINTESE_CTWA_ATIVA = false`** em `src/app/api/webhooks/ghl/route.ts` — a síntese CTWA (que fabricava `campaign_id` sem `ad_id`/`ctwa_clid` e sem guarda de data) está **DESATIVADA localmente, AINDA NÃO EM PRODUÇÃO** (F1 feita, não commitada/deployada). O código da síntese foi **mantido de propósito atrás da flag** (auditoria/reversão) — **não remover**. Onde a síntese seria acionada, o webhook agora só registra observabilidade em `sistema_auditoria` (`acao='ctwa_sintese_suprimida'`).
-- **Regra canônica de atribuição a anúncio:** um lead só é atribuído a anúncio/campanha se tiver **`ad_id` OU `ctwa_clid` OU `leadgen_id`**. `session_source='Social media'` **sem `ctwa_clid` NÃO é anúncio** (CTWA real sempre traz `ctwa_clid`; `whatsapp_coex` = WhatsApp Coexistence do GHL, não é origem de anúncio).
-- **Frentes abertas (não iniciadas):**
-  - **F2** — recuperar `ad_id` de 386 leads tier 1 (abr–jun) que ficaram com `ad_id` NULL.
-  - **F3** — anular `campaign_id` dos 93 leads fabricados pela síntese (limpeza de dados, soft/auditada).
-  - **F4** — guarda de leitura (aplicar a regra canônica nos consumidores: `vw_atribuicao_lead_mes`/`_v2`, `por-entidade.ts`, `visao-geral-v2`, `mql-sql`, `leads-drilldown`, `canal-breakdown.ts`) + shadow mode.
-  - **F5** — migrar `canal_normalizado` v1→v2 (páginas `/canais`, `/analise-dias`, `/funil-tempo`; **bloqueador:** a view `leads_crm_public` expõe v1 e **não** expõe `canal_normalizado_v2`).
 - ⚠️ **Validação de build:** `pnpm test && pnpm run build` **não conclui neste ambiente** — o pnpm 11 roda um `verify-deps-before-run` que aborta em `ERR_PNPM_IGNORED_BUILDS` (scripts de build de `esbuild`/`sharp`/`@sentry/cli`/`unrs-resolver` não aprovados). Destravar exige `pnpm approve-builds` ou `pnpm.onlyBuiltDependencies` no `package.json` (decisão do Lucas). `next build` roda limpo por binário direto (252/252 páginas, exit 0). `package-lock.json` está **versionado** apesar do projeto ser pnpm — decidir `git rm` (pendente autorização).
diff --git a/docs/CANONICO.md b/docs/CANONICO.md
new file mode 100644
index 0000000..2b13812
--- /dev/null
+++ b/docs/CANONICO.md
@@ -0,0 +1,127 @@
+# Cânone de domínio: Dashboard Comercial
+
+> Movido byte a byte do `CLAUDE.md` (v2.2) em 22/10/2026, sem edição de texto. Itens datados valem pela data em que foram escritos; o estado vivo (banco, git) vence este arquivo.
+
+## FÓRMULAS CANÔNICAS (NUNCA ALTERAR SEM APROVAÇÃO EXPLÍCITA)
+- **ROAS = entrada confirmada (contratos status='ativo') / investimento.** NUNCA LTV. NUNCA incluir `pendente_aprovacao`.
+- **Investimento**: SEMPRE via `getInvestimentoMensal()` em `src/lib/metricas/investimento.ts` (Meta API + fallback `ads_performance`). NUNCA `config_mensal`. Inclui anúncios pausados que gastaram no período.
+- **CPL** = investimento / leads (ponderado, nunca média simples).
+- **MQL/SQL**: primeira passagem do lead por etapa com `classificacao` em `config_funil_etapas`, via `leads_crm_historico` (MIN(changed_at) em BRT), fallback etapa atual para leads sem histórico.
+  - Período custom → `getMqlSqlByPeriodo()` / `fn_mql_sql_by_periodo` (evento dentro do range).
+  - Mês fechado → `getMqlSqlByMonth()` / `fn_mql_sql_by_month`.
+  - %MQL > 100% é possível e correto (lead de um mês qualificando no seguinte).
+- **Comissão**: somente via `comissao-canonica.ts`. Nunca criar sistema paralelo.
+- **Contratos `pendente_aprovacao` NÃO contam** como receita confirmada (fora de MRR, novos clientes e denominador de ROAS).
+- **No-show remarcado continua contando como no-show.** Remarcação cria evento novo; não anula nem substitui o no-show anterior. (Regra de negócio, Lucas, 15/09/2026.) São dois eventos, não um corrigindo o outro — "no-show seguido de reunião" NÃO é inflação de no-show. Na ingestão da agenda: linha em `no_show` com agendamento cancelado no GHL é o comportamento esperado e NÃO gera alerta (ticket 038).
+- **MRR — 3 números distintos, nunca conflatar:**
+  1. MRR canônico (headline) = `clientes_receita WHERE status_financeiro='ativo'`
+  2. Carteira ativa total = `clientes_receita WHERE status='ativo'` (≠ MRR; não rotular como MRR)
+  3. "MRR contratado" = `contratos.mrr` (vendido, não necessariamente ativo)
+  `clientes_receita` tem DUAS colunas de status (`status` = ciclo de vida; `status_financeiro` = financeiro).
+
+## DATAS E TEMPO
+- Agregação temporal de leads: `ghl_created_at AT TIME ZONE 'America/Sao_Paulo'`. NUNCA `created_at` de `leads_crm` (poluído por imports em lote).
+- `mes_referencia` de leads NUNCA é sobrescrito (trigger SQL protege). Formato TEXT `'YYYY-MM'`.
+- ⚠️ `mes_referencia` é TEXT em `contratos`/`despesas` e DATE em `custos_agencia_mensal`/`financeiro_fluxo_caixa` — normalizar em agregações cross-table.
+- `ghl_created_at`/`ghl_etapa_atual` são preenchidos pelo cron `/api/sync` às 06:00 UTC do dia seguinte — NULLs intradiários no dia corrente são esperados, não regressão.
+- Presets de data rolling: `dataFim = ontem`, `dataInicio = hoje - N` (espelha Meta Manager, exclui hoje).
+
+## ATRIBUIÇÃO
+- Cutoff universal: `ATRIBUICAO_INICIO_DATA = 2026-04-03`. Toda vinculação de origem (ad_id, lead→contrato, reunião→contrato, coortes) vale só desta data em diante.
+- Lead → anúncio: `leads_crm.ad_id` → `ads_metadata` (COALESCE com campos do próprio lead).
+- Contratos ↔ `clientes_receita`: via `lead_id` / `normalize_cliente_nome()`. NUNCA `cliente_id` (aponta para tabela quebrada, match zero).
+- L.Meta canônico: `onsite_conversion.lead_grouped` (não `"lead"`, que inclui pixel).
+- Roteamento de campanha: `ads_metadata.objetivo`. NUNCA `tipo_campanha` (70/87 nulls).
+- `vw_atribuicao_lead_mes`: usar LATERAL JOIN (nunca OR join — duplica lead_id e aborta refresh silenciosamente). v2 em criação deriva qualificação do histórico.
+- `contratos.valor_total_projeto` é GENERATED ALWAYS — remover de qualquer payload de INSERT/UPDATE (usar `buildContratoPayload` em `src/lib/contratos/build-contrato-payload.ts`).
+
+## TABELAS C0 (compartilhadas com o Comarka OS)
+C0 = `clientes_receita`, `leads_crm*`, `trafego_*`, `ads_metadata`, `ads_performance`, `vw_atribuicao_proporcional`. Proibido DDL, grant, RLS ou trigger nelas a partir deste repo, e nenhuma rota do comercial escreve nelas por conta própria.
+- **Exceção de escrita autorizada (29/09/2026, decisão do Lucas):** `POST /api/trafego/regras-historico` grava em `trafego_regras_historico` exatamente a linha que a tela `/trafego/alertas` já gravava (`ad_id`, `acao` ∈ {`ignorada`, `falsa_positiva`}, `valor_metrica_no_momento: 0`, `observacao`) **mais `aplicada_por = employeeId` da sessão**. Só admin ou gestor de tráfego (`employees.is_gestor_trafego`; SDR e closer = 403). Qualquer outra escrita em C0 precisa de aprovação explícita.
+- **Exceção de DDL autorizada (07/10/2026, decisão do Lucas; aplicada 08/10):** UM trigger em `clientes_receita`, `trg_clientes_receita_status_log` (AFTER UPDATE OF `status`, `status_financeiro`), que chama `fn_clientes_receita_status_log()` (SECURITY DEFINER) e grava em `clientes_receita_status_log` (tabela nova, só `service_role` lê). Migration: `supabase/migrations/20261007200000_clientes_receita_status_log.sql`; spec: `docs/specs/historico-status-receita.md`. **Escopo exato: só esse trigger.** O trigger de `updated_at` (`supabase/migrations/20261007200100_clientes_receita_updated_at.sql`) NÃO está coberto — fica sem aplicar até o Comarka OS trocar `computeChurnMes` para `churn_log` (`docs/specs/ticket-comarka-os-churn.md`) e exige nova aprovação. Nenhuma outra exceção à regra CREATE-only.
+
+## TABELAS BANIDAS (NUNCA USAR)
+`clientes` (trigger quebrado), `vw_churn_mensal` (sem guarda de status — usar `vw_admin_churn_mensal`), `vw_trafego_funil_mensal`, `lancamentos_despesa` (vazia/legado — custos vêm de `despesas`).
+⚠️ **COLUNA BANIDA: `ads_performance.leads`** (e o `cpl` derivado dela) — coluna crua da Meta (action `"lead"` = `lead_grouped` + `fb_pixel_lead`), infla 4-66% por campanha; fonte canônica de lead Meta = `onsite_conversion.lead_grouped` (e `leads_crm` por ad para análise por anúncio via `leads-canonicos.ts`). Nunca ler em cálculo/auditoria. A coluna segue no schema e segue sendo ESCRITA pelo sync — NUNCA renomear/alterar/dropar (5 matviews dependem dela no REFRESH); o banimento é de LEITURA (cutover Onda 2, 2026-07-17).
+Aposentados como fonte: `lancamentos_diarios.ganhos` e `mrr_dia`.
+⚠️ **COLUNA BANIDA PARA LEITURA: `config_mensal.leads_totais`** (06/10/2026, decisão do Lucas). É um contador mantido por trigger — `trg_increment_leads` (+1 no INSERT em `leads_crm`), `trg_decrement_leads` (−1 no DELETE) e a RPC `incrementar_leads` — e deriva da contagem real (medido 06/10: jan −62, fev −57, mar −116, jun +2, ago +4, set +1, out −7). **Só escrita via trigger**; nunca ler em cálculo, tela ou fallback. Coluna e triggers ficam (CREATE-only, nunca DROP). Fonte canônica: `src/lib/metricas/leads-mes.ts` (falha de leitura ⇒ `null`/'n/d', nunca 0 e nunca o contador).
+  - **Exceção registrada ao eixo `ghl_created_at`:** a **contagem mensal de leads** usa `leads_crm` por **`mes_referencia`**, alinhada ao `_audit_baseline_metrics_v2.leads_totais_mes` (`SELECT count(*) FROM leads_crm WHERE mes_referencia=…`). Os dois eixos NÃO batem (ago/2026: 455 por `mes_referencia` × 425 por `ghl_created_at`) — declare qual usou.
+  - Leituras remanescentes conhecidas (06/10): ramo legado do `calcKpis` para jan–mar/2026 (em shadow contra `leads_crm`) e `src/app/api/auditoria/route.ts` (sem consumidor no repo). Não criar novas.
+⚠️ MORTAS: `lead_funnel_events` (sem eventos desde 10/05/2026) e `v_funnel_by_ad` (órfã, derivada dela) — não usar nenhuma das duas como fonte. Os objetos ficam inertes no banco (regra CREATE-only, nunca DROP).
+
+## FONTES CANÔNICAS
+- Reuniões: `src/lib/reunioes-frescas.ts` sobre `lancamentos_diarios` (sync GCal). A matview `vw_reunioes_consolidada` é MATVIEW e DEPENDE do cron horário `refresh_trafego_views_hourly` — cadastrada nele em 13/07/2026 (ficou congelada mai→jul/2026 por nunca ter sido cadastrada; descongelada na mesma data). Zero consumidores de código hoje; se voltar a ser consumida, confira o frescor via `fn_derivacao_gaps()`.
+- No-show — CUTOVER EXECUTADO (Onda 2, 17/07/2026, flip automático pós-20/07): canônico = `getNoShowCanonico()` em `src/lib/no-show-canonico.ts`, com **QUEBRA DE SÉRIE explícita em 2026-05-01**: pré-maio = `lancamentos_diarios.no_show` (coluna `data`; abr 33 CONFIRMADO com a operação) · maio+ = `leads_crm_historico` etapa `'no_show'` via `fn_no_show_por_periodo` (GHL). As duas fontes NUNCA são costuradas/reconciliadas — período que cruza a fronteira expõe as fatias + `quebra_de_serie=true`; UI sinaliza a quebra (tendência não comparável através dela). Até 2026-07-20 (fim do shadow) o oficial em tela ainda é o proxy `MAX(no_show, agendadas − realizadas)`; depois o flip é automático. FALHE ALTO: sem leitura ⇒ null/'n/d', nunca zero.
+  - **TAXA de no-show — canônico próprio, set-consistente**: `getNoShowTaxa()` em `src/lib/no-show-taxa.ts` / `fn_no_show_taxa_por_periodo` (maio+). A taxa NÃO usa `lancamentos_diarios.reunioes_marcadas` (fonte manual esparsa) nem cruza janelas temporais. Numerador ⊂ denominador por construção, do MESMO conjunto de linhas: **denominador** = reuniões RESOLVIDAS no período = linhas cuja etapa anterior **DERIVADA por `LAG(etapa_nova) OVER (PARTITION BY lead_id ORDER BY changed_at)`** é `'reuniao_agendada'` (`changed_at` BRT na janela, por LINHA de transição); **numerador** = subconjunto com `etapa_nova='no_show'`. Referência (SELECT puro DERIVADO 20/07): mai 77/18/23,4% · jun 84/16/19,0% · jul 65/6/9,2% (parcial; à referência r3 original dava 61/6/9,8%, driftou no mesmo dia = mês aberto). `periodo_incompleto=true` quando o período alcança o mês corrente (sync de transições atrasa → taxa instável) — quem exibir DEVE sinalizar. ⚠️ **BLINDAGEM (r3)**: a etapa anterior é DERIVADA por LAG, NUNCA lida da coluna `leads_crm_historico.etapa_anterior` — essa coluna está QUEBRADA na ingestão desde jul/2026 (etapas de AVANÇO gravam NULL, só as de PERDA gravam a origem; 82% de `proposta_enviada` NULL em julho), o que pela coluna derrubava o denominador de julho a 27 e inflava a taxa a 33,3% (vs ~9,2% real, ~3,4x). A derivação BLINDA contra o bug, NÃO o corrige (ticket Infra/Dados separado; a coluna segue se degradando). ⚠️ **DIVERGÊNCIA vs headline**: em julho o numerador derivado dá 6, contra 9 do headline `fn_no_show_por_periodo` — 3 linhas cuja coluna dizia `'reuniao_agendada'` mas cuja sequência real era `follow_up`/`remarketing` (leads `579fb16c…`, `ce00fb6b…`, `643d96c0…`). A derivada é mais fiel; ESTA série diverge do headline de propósito — `fn_no_show_por_periodo` NÃO foi alterada nesta rodada. ⚠️ LIMITAÇÃO CONHECIDA: este numerador (só de `'reuniao_agendada'`, mai=18) DIFERE do headline (1ª passagem qualquer origem, mai=21); os 3 de maio vieram de `desqualificado`/`ligacao`/`oportunidade` — métricas distintas de propósito, não conflatar nem "corrigir".
+  - **DUAS DEFINIÇÕES DE NO-SHOW, LADO A LADO — medem coisas diferentes e NÃO se reconciliam** (08/09/2026):
+    | | **No-show (agenda)** | **No-show (CRM) — canônico headline** |
+    |---|---|---|
+    | Fonte | `lancamentos_diarios.no_show`, derivado de `lancamentos_diarios_eventos` | `leads_crm_historico` etapa `'no_show'` via `fn_no_show_por_periodo` |
+    | Definição | evento de agenda que o closer confirmou como no-show, **um a um** | lead que **alguém moveu** para a etapa `no_show` no CRM |
+    | Preenchido por | closer, no portal, no dia | quem lembrar de mexer no CRM |
+    | Vale para | mai/2026+ (fluxo por eventos; `CUTOFF_EVENTOS = 2026-05-01`) | mai/2026+ (quebra de série; pré-maio = a coluna) |
+    | Exibido em | `/analise-dias`, `/relatorio` — rotulados **"(agenda)"** | `getNoShowCanonico()`, shadow do `/relatorio` |
+
+    Divergência medida (agenda × CRM): mai 25×21 · jun 24×16 · jul 35×28 · ago 22×28 · **set 6×0**. Tabela completa e explicação em `docs/auditoria/2026-09-no-show-agenda-vs-crm.md`.
+    Setembro é o caso didático: 6 no-shows confirmados evento a evento na agenda, 0 no CRM porque o time não move a etapa. Nenhum dos dois é "o errado" — **são conjuntos diferentes**, e a regra de NUNCA costurar as fontes vale entre estas duas também.
+    ⚠️ `lancamentos_sdr.no_show` é uma **QUARTA** fonte (as outras três: agenda, CRM, e o proxy `marcadas − feitas`): digitação manual do SDR, tabela distinta. Alimenta `/sdr` e `/relatorio-sdr`, rotulados **"(SDR)"**. ⚰️ **FONTE MORTA**: 6 linhas no total, de 2026-01-31 a **2026-04-03**. Desde maio essas telas mostram vazio ou dado de abril e ninguém reclamou em 5 meses. Registrado, não corrigido (08/09/2026).
+    ⚠️ Todo número de no-show em tela DEVE carregar a origem no rótulo. Foi a ausência disso que deixou três fontes conflitantes conviverem sem ninguém notar.
+  - ⚠️ ETAPA MORTA `reuniao_feita`: ZERO eventos em `leads_crm_historico` desde sempre (mai/jun/jul = 0). Configurada e nunca usada — NÃO derivar nada dela (a "Taxa Comparecimento" via `reunioes_feitas` vem de `lancamentos_diarios`, não desta etapa). Objeto fica inerte (CREATE-only, nunca DROP).
+- **Receita realizada — `pagamentos_mensais` MANDA (`status='pago'`, campo `valor_pago`).** Decisão do Lucas (D11, 11/09/2026). `recebimentos_mensais` é **SECUNDÁRIA como receita** — nunca a fonte do headline, nunca somada à outra. Motivo: `pagamentos_mensais` tem composição auditável (linhas nominais + `created_at` de carga), e foi ela que permitiu nomear as divergências do ticket 028 §7.3.1; `config_mensal.receita_realizada` está **aposentada** como fonte de receita (mesma decisão).
+  - ⚠️ **`recebimentos_mensais` segue CANÔNICA como base de COMISSÃO** (`comissao-canonica.ts`, 5 leituras) — ela tem `closer_id`, `contrato_id`, `plataforma` e `asaas_pagamento_id`, que `pagamentos_mensais` NÃO tem. "Secundária" vale só para receita. **NUNCA migrar comissão para `pagamentos_mensais`.**
+  - ⚠️ **As duas NÃO são intercambiáveis e NUNCA se somam.** `recebimentos_mensais` só começa em **2026-03** (jan/fev/nov-2025 não existem nela). Em março `pagamentos` dá R$ 141.387/83 linhas e `recebimentos` R$ 137.887/76 — e o Δ de R$ 3.500 é **saldo líquido** de 12 linhas só em `pagamentos` (R$ 11.500) contra 5 só em `recebimentos` (R$ 8.000): `pagamentos_mensais` **não é superset**. De **mai/2026 em diante** a divergência muda de natureza (as mesmas linhas nas duas com status diferente — 32 `pendente` em maio que são `pago` na outra), então **somar duplica receita**. Diagnóstico completo: `docs/tickets/ticket-032-divergencia-pagamentos-vs-recebimentos-mensais.md`.
+  - ⚠️ `pagamentos_mensais` **não tem status `reembolsado`** (só `pago`/`pendente`/`parcial`/`perdoado`/`parceria`/`previsto`) — a fonte canônica **não sabe expressar estorno**, e `recebimentos_mensais` sabe. Estorno em tela é lacuna conhecida, não zero.
+  - ⚠️ As duas **não têm chave comum** (`pagamentos.cliente_id` uuid × `recebimentos.cliente_nome` TEXT). Junção só por `normalize_cliente_nome()`, que erra nos dois sentidos — não casa variantes do mesmo cliente e colide homônimos (`Thiago araujo`/`Thiago Araujo`). Não usar como chave em código de produção enquanto o ticket 022 estiver aberto.
+- Custos: `despesas` (tem `deleted_at`)
+- Contratos: tabela `contratos` (nunca `clientes`)
+- Status de contrato em uso: `rascunho`, `pendente_aprovacao`, `ativo`, `cancelado` (churn real), `cancelado_invalido` (nunca foi venda)
+- ⚠️ `clientes_receita` e `leads_crm` NÃO têm `deleted_at` — nunca filtrar por ela nessas tabelas.
+
+## TIME E EXCLUSÕES
+Lucas = diretor (`closer_id a987d655-88d0-490b-ad73-efe04843a2ec`), `recebe_comissao=false`, EXCLUÍDO de CAC e rankings (constante `CLOSER_DIRETOR_IDS`). Fernando: bônus R$500, excluído de CAC. Closers: Mariana, Rogério, Larissa. SDR: Davi.
+
+## PROTEÇÕES OBRIGATÓRIAS EM TODA MUDANÇA
+1. ⚠️ **`docs/backups/` é CONVENÇÃO DORMENTE — não seguir.** Última entrada 18/05/2026; as mudanças desde então (inclusive o fix do /dashboard de 03/09 e o do /crm de 04/09) não geraram backup e não devem gerar. **A reversão é coberta pelo histórico da branch**: toda mudança nasce em branch própria, com `main` intacto até o merge — `git revert`/`git diff` fazem o que a pasta fazia, sem cópia manual que envelhece. Os arquivos existentes ficam onde estão (CREATE-only vale para o repo também). Registrado em 04/09/2026 para a convenção parar de entrar nos prompts como se estivesse viva.
+2. Shadow mode para qualquer mudança de cálculo visível (valor antigo + novo lado a lado por 7 dias)
+3. Comparar contra `_audit_baseline_metrics_v2` (tabela public, 52 rows) ao final; divergência >0.5% fora do escopo → PARAR E REPORTAR
+4. Soft delete sempre; nunca DELETE físico
+5. Ambiguidade real → pausar e reportar, nunca chutar
+
+## REGRAS DE ENGENHARIA (v2.3 — lições dos 7 falsos-verdes: Data Health, _check_ingestao_gap, matview de reuniões, no_show, webhook tl;dv, getEventsForRange, upsert do gcal_sync)
+- **VAZIO E FALHA SÃO FATOS DIFERENTES — E O TIPO TEM QUE OBRIGAR A DISTINGUIR** (08/09/2026): três leituras nesta base devolviam lista vazia em erro e o chamador lia isso como "não havia nada". `getEventsForRange` (3 caminhos: sem token, HTTP não-2xx, exceção) fazia um apagão total do Google Calendar ser indistinguível de um dia sem reunião, com o run reportando verde. Corrigido para `{ ok: true, eventos } | { ok: false, falha }` — **nunca reintroduza retorno de array cru em leitura de fonte externa**. Ver `src/lib/google-calendar.ts` e `src/app/api/cron/sync-gcal/route.ts`. Teste dos caminhos de falha: `scripts/testes/teste-5bis-falha-leitura-gcal.ts`.
+- **`catch { }` MUDO É PROIBIDO EM ESCRITA DE MONITOR** (08/09/2026): o `sync-gcal` gravava status em `ultima_execucao` e `detalhes`, colunas que NÃO EXISTEM em `sistema_integracao_status` (as reais são `ultimo_ping_em`, `ultimo_ping_sucesso_em`, `mensagem_erro`). O upsert falhava em TODA execução e o `catch { /* best effort */ }` engolia. Nunca houve linha `gcal_sync`: o painel de saúde não mostrava a fonte, e a ausência passou por "sem problema". Monitor que não escreve é pior que monitor ausente — a ausência pelo menos é visível. Se a gravação do monitor pode falhar em silêncio, ela vai.
+- **MONITOR SEM CONSUMIDOR MORRE** (08/09/2026): `fn_ingestao_gaps()` acusava `tldv = critico` havia **387 horas** e detectou o apagão do webhook no primeiro dia. O instrumento existia, estava certo e ativo. Ninguém olhou. Detecção não é alerta: alerta é o caminho até uma pessoa. Ao criar monitor, entregue o consumidor junto.
+- **CREDENCIAL DE ENV NASCE COM `.trim()`** (15/09/2026, decisão do Lucas): toda leitura NOVA de credencial de `process.env` é `process.env.X?.trim() || undefined`. Desde o deploy de 11/09 a ingestão da agenda tomou 401 do GHL em 100% dos runs, enquanto health-check e `/api/sync`, com a MESMA env, ficavam verdes. Hipótese: `\n` no fim de `GHL_LOCATION_ID` na Vercel — o parser de URL descarta `\n` no path/template string, mas `URLSearchParams` o codifica como `%0A`. O mesmo segredo funciona numa rota e falha em outra, e o monitor de quem não usa `URLSearchParams` fica verde. As leituras antigas sem trim são **pendência conhecida** (`docs/tickets/ticket-036-credenciais-de-env-sem-trim.md`) — não corrigir de carona.
+- **FALHE ALTO**: nunca fallback mudo, nunca verde/zero por falta de leitura. Zero e "não sei" são coisas DIFERENTES: falha de leitura ⇒ `'n/d'`/status de erro, nunca 0. Um gate que silencia não é proteção.
+  - **Falha de leitura NUNCA vira zero na tela.** Os dois padrões proibidos, ambos causadores do incidente de 03-04/09/2026:
+    - `count || 0` — erro de permissão vira contagem zero
+    - `data ?? []` / `data || []` — erro vira lista vazia, e a tela renderiza "não há registros"
+  - Onde a leitura pode falhar, o estado de erro tem que ser distinto do estado vazio, e visível ao usuário. **Precedente:** o /crm exibiu 0 leads em todos os meses, com 3.929 no banco, sem um único aviso na tela.
+- **PREMISSA ENVELHECIDA**: card/ticket de bug com mais de 7 dias tem a premissa RECONFIRMADA com query real antes de virar prompt. Card velho é hipótese, não diagnóstico (ex.: "o refresh vai mudar números em tela" — quando o código já tinha migrado da matview).
+- **MATVIEW NASCE NO CRON**: nenhuma matview é criada sem ser cadastrada no cron de refresh na MESMA migration (foi omissão de cadastro que congelou `vw_reunioes_consolidada` por 2 meses). O frescor de derivação é vigiado por `fn_derivacao_gaps()`.
+- **1 SESSÃO POR WORKTREE**: o worktree é CRIADO E VERIFICADO antes da sessão abrir; a sessão CONFIRMA seu diretório (`pwd` + `git rev-parse --show-toplevel` + branch) no passo 0.0 ANTES de trabalhar. NUNCA `git checkout` de outra branch no worktree — checkout no diretório compartilhado muda o HEAD de todas as sessões.
+- **BANCO É FATO**: nenhum DROP/REPLACE de objeto de produção sem colar a definição VIVA (`pg_get_functiondef`/`pg_get_constraintdef`) no relatório ANTES da mudança. Arquivo de migration é intenção; banco é fato — eles divergem.
+- **TESTE QUE NÃO FOI VISTO FALHANDO NÃO CONTA COMO TESTE** (09/09/2026): todo teste de guard, de invariante ou de rollback precisa de **controle negativo demonstrado**, e o resultado do controle negativo entra no relatório. Verde sem controle negativo não é evidência: um teste que nunca falha e um teste que não testa nada são indistinguíveis de fora. Três casos desta base, todos reais:
+  - o teste da 6.1 só valeu depois de ser rodado contra uma rota adulterada com `.not("lead_id","is",null)` no GET — e falhar;
+  - o teste de idempotência da ingestão passou na primeira execução com **zero itens nos dois runs**: o mês já estava ingerido, nada foi escrito, tudo verde, provando nada. Só valeu depois de estragar uma linha de propósito;
+  - a migration idempotente dos DDL só valeu depois de detectar uma constraint homônima com um valor a mais — a primeira tentativa de controle usou uma constraint mais ESTREITA e o próprio Postgres barrou antes (23514), o que não testava a migration, testava o Postgres.
+  A mesma lição vale para DDL: `if not exists` que aceita qualquer estado existente não é idempotente, é cego — "já existe, então está certo" é a família do fallback mudo.
+- **O HORÁRIO QUE VOCÊ ESTÁ VENDO PODE ESTAR NA SUA CONSULTA, NÃO NO DADO** (09/09/2026): 9 eventos "às 21:00 BRT / 00:00 UTC" pareciam prova de derivação de data em UTC. Não eram: o `event_start` deles é uma **data pura** (`"2026-06-05"`, evento de dia inteiro do Google), sem hora nenhuma. As 21:00 apareciam porque a query de diagnóstico fazia `::timestamptz` numa data pura — meia-noite UTC, 21h BRT do dia anterior. **O horário estava na consulta.** Antes de concluir "bug de fuso", confira o valor CRU da coluna, sem cast. É a mesma família do baseline de 313: diagnóstico por artefato do próprio diagnóstico.
+- **BASELINE MEDIDO SOBRE ARTEFATO GERADO NÃO É BASELINE** (09/09/2026): a barra de delta-0 foi mantida o dia inteiro contra **313** erros de `npx tsc --noEmit`. O baseline real é **279** — os outros 34 vinham de `.next/types/`, cache de build local. Deu certo por acidente: o cache era o mesmo dos dois lados de cada comparação, então o delta continuou honesto. Bastaria alguém limpar o `.next` no meio para o número "melhorar" sozinho e a gente caçar fantasma. **Toda medição de delta-0 exclui `.next/`**; um número que parece dado e é resíduo de build é a mesma família do `DEFAULT 0` e do `data ?? []`. Achado durante o rebase sobre a main (ticket 018, Risco 5).
+- **FUNÇÃO NO BANCO EXIGE FONTE NO MAIN**: nenhuma função/migration é aplicada em produção sem que o código correspondente seja mergeado em `main` no MESMO ciclo. Em 13/07 o main ficou 5 funções atrás do banco (fn_ingestao_gaps, fn_ingestao_horas_sem_fds, fn_cobertura_atribuicao/normaliza_canal_v2, fn_no_show_por_periodo, fn_derivacao_gaps) — se a branch sumisse, haveria função em produção SEM FONTE.
+
+## PÁGINAS PROTEGIDAS (fórmulas calibradas — não alterar sem aprovação explícita)
+`/trafego/visao-geral`, `/trafego/relatorios`, `/trafego/relatorio-auto`, `/dre`.
+
+## GLOSSÁRIO
+MRR = receita recorrente mensal | LTV = valor total do contrato | CAC = custo por cliente | CPL = custo por lead | CPMQL = custo por MQL | Closer = vendedor | SDR = qualificador | GHL = GoHighLevel | Churn = cancelamento real (`cancelado`)
+
+## ESTADO ATUAL — Atribuição fantasma CTWA (2026-07-31)
+Diagnóstico completo em `docs/diagnosticos/2026-07-31-atribuicao-fantasma-campaign-id-sem-ad-id.md`.
+- **`SINTESE_CTWA_ATIVA = false`** em `src/app/api/webhooks/ghl/route.ts` — a síntese CTWA (que fabricava `campaign_id` sem `ad_id`/`ctwa_clid` e sem guarda de data) está **DESATIVADA localmente, AINDA NÃO EM PRODUÇÃO** (F1 feita, não commitada/deployada). O código da síntese foi **mantido de propósito atrás da flag** (auditoria/reversão) — **não remover**. Onde a síntese seria acionada, o webhook agora só registra observabilidade em `sistema_auditoria` (`acao='ctwa_sintese_suprimida'`).
+- **Regra canônica de atribuição a anúncio:** um lead só é atribuído a anúncio/campanha se tiver **`ad_id` OU `ctwa_clid` OU `leadgen_id`**. `session_source='Social media'` **sem `ctwa_clid` NÃO é anúncio** (CTWA real sempre traz `ctwa_clid`; `whatsapp_coex` = WhatsApp Coexistence do GHL, não é origem de anúncio).
+- **Frentes abertas (não iniciadas):**
+  - **F2** — recuperar `ad_id` de 386 leads tier 1 (abr–jun) que ficaram com `ad_id` NULL.
+  - **F3** — anular `campaign_id` dos 93 leads fabricados pela síntese (limpeza de dados, soft/auditada).
+  - **F4** — guarda de leitura (aplicar a regra canônica nos consumidores: `vw_atribuicao_lead_mes`/`_v2`, `por-entidade.ts`, `visao-geral-v2`, `mql-sql`, `leads-drilldown`, `canal-breakdown.ts`) + shadow mode.
+  - **F5** — migrar `canal_normalizado` v1→v2 (páginas `/canais`, `/analise-dias`, `/funil-tempo`; **bloqueador:** a view `leads_crm_public` expõe v1 e **não** expõe `canal_normalizado_v2`).
````

### 682a8c4 docs(claude): reescreve o CLAUDE.md para a adoção do orquestrador

````diff
diff --git a/CLAUDE.md b/CLAUDE.md
index 2a21e34..91792e5 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -1,42 +1,117 @@
-# CONTEXTO DO PROJETO — Dashboard Comercial Comarka Ads
-## Versão 2.2 — 13/07/2026 (substitui integralmente a v2.1; incorpora incidentes A/B/C de 13/07)
+# Dashboard Comercial (Comarka Ads)
 
-## O QUE É
-Cockpit de aquisição da Comarka Ads (agência de tráfego pago para o nicho jurídico). Usado por Lucas (diretor) e Flávio (Head de Tráfego) para decisões de alocação de budget na aquisição de clientes advogados. NÃO é ferramenta de cliente nem dashboard operacional de gestores de tráfego.
+Cockpit de aquisição da Comarka Ads (tráfego pago para advogados). Usado por Lucas (diretor) e Flávio
+(Head de Tráfego) para decidir alocação de budget. Não é ferramenta de cliente nem de gestor de tráfego.
+Produção: https://dashboard-comercial-one.vercel.app · repo `dashboard-comercial`.
+Não confundir com o Comarka OS (`comarka-operacional`): repo e projeto Vercel separados, mesmo Supabase.
 
-URL produção: https://dashboard-comercial-one.vercel.app
-Repo: `dashboard-comercial` | Worktree de deploy: `~/Projetos/_worktrees/dc-deploy` (o antigo `~/dashboard-comercial-deploy` foi perdido na reorg de pastas de 05/08; tudo migrou para `~/Projetos/`)
-NÃO confundir com `comarka-os`/`comarka-operacional` (repo e projeto Vercel separados, mesmo Supabase — nunca misturar).
+Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind, shadcn/ui, Supabase, Vercel (deploy manual),
+n8n Cloud, Meta Ads API, GHL. Node 22. Gerenciador: **npm** (`package-lock.json` é o lockfile).
+Notion não é fonte nem destino de dado (DC-0002). `notion_id` e `*_notion_mirror` são nomes legados no banco.
 
-## STACK
-Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui (dark), Supabase (`ogfnojbbvumujzfklkhh`), Vercel (deploy MANUAL apenas), n8n Cloud (`comarka.app.n8n.cloud`), Meta Ads API (conta `act_2851365261838044`), GHL (location `DlN4Ua95aZZCaR8qA5Nh`), Notion.
+## Cânone de domínio
+Fórmulas, datas, atribuição, fontes canônicas, tabelas banidas, no-show, MRR, time, páginas protegidas,
+proteções de cálculo, regras de engenharia (texto integral) e glossário: **`docs/CANONICO.md`**.
+Leia a seção certa antes de mexer em métrica, fonte, atribuição ou tela protegida. Mudar fórmula canônica
+ou página protegida exige aprovação explícita do Lucas.
 
-## WORKFLOW (INVIOLÁVEL)
-Lucas descreve a demanda → Claude (chat) gera prompt estruturado .md → Claude Code executa. Todo prompt contém: contexto acumulado, premissas inegociáveis, PASSO 0 de pré-leitura obrigatória, tarefas numeradas, revisão final obrigatória e lista explícita de NÃO FAZER. Diagnóstico SEMPRE antes de correção: confirmar causa-raiz com queries reais no Supabase (`information_schema.columns` primeiro — nunca assumir nome de coluna).
+## Parâmetros da sessão (skill protocolo-sessao)
+| Parâmetro | Valor |
+|---|---|
+| PLANO | `docs/sessao/STATUS-PLANO.md` (compromissos DC-XXXX; status de ticket nunca escrito à mão) |
+| RETRATO | `docs/sessao/ESTADO-ATUAL.md` (máx. 60 linhas, sobrescrito a cada marco) |
+| DECISOES | `docs/sessao/decisoes-AAAA-MM-DD.md` |
+| FILA | `bash scripts/orq fila` · `orq ticket <id>` · `orq decisoes` · `orq validar` (após o `--novo`) |
+| AMBIENTES | ver "Ambientes" abaixo |
+| BANCO | Supabase `ogfnojbbvumujzfklkhh`, leitura por `execute_sql` (MCP), agregada e com `limit` |
+| ZONA_PROTEGIDA | ver "Zona protegida" abaixo |
+| COMPROMISSO | `DC-XXXX` |
 
-## GIT / DEPLOY
-- Fluxo: `git add` SELETIVO no worktree da feature → merge em `main` no `~/Projetos/_worktrees/dc-deploy` → `git pull --ff-only origin main` → deploy por **`git archive`** do commit (abaixo) → registrar a linha em `docs/deploy/registro-producao.md` → validação autenticada em NAVEGADOR anônimo (nunca curl — middleware de auth mascara 404 com 401/307).
-- **Deploy = `git archive` do commit, NUNCA `vercel --prod` direto na worktree** (29/09/2026). Motivo: o `vercel --prod` sobe o DISCO, não o commit — arquivos não rastreados, modificações não commitadas e resíduo local vão junto, e o que roda em produção deixa de ser o SHA registrado (a `dc-deploy` subia `Checking`/`No`, lixo não versionado de 19/09, em todo deploy). Receita:
+## Compromissos e tickets
+- `DC-XXXX` é o compromisso (item do plano). Ticket da fila tem `id` de 3 dígitos (`^\d{3}[a-z]?$`, schema
+  do kit) e leva `"compromisso": "DC-XXXX"`. `DC-0004` nunca é id de ticket.
+- Status de ticket só pelos comandos de FILA. Antes de afirmar feito/não feito: git log, ledger, FILA.
+
+## Ambientes
+- `main`: protegida. Só o integrador mexe, pelo `~/Projetos/_worktrees/dc-deploy`.
+- `staging-auto`: branch alvo do loop. **Ainda não existe**; nasce na etapa do `instalar.sh --novo`.
+- Worktree humana: `~/Projetos/_worktrees/dc-<assunto>`, a partir da `origin/main`.
+- `dc-orq-<id>` e `dc-orq-staging-auto` são **reservados ao loop** (o motor faz `worktree remove --force`
+  nesses nomes). Humano nunca nomeia worktree `dc-orq-*`. Exceção única: `dc-orq-conteudo`, que some no merge.
+- O checkout principal (`~/Projetos/dashboard-comercial`) é área do Lucas; nenhuma regra exige branch nele.
+
+## Zona protegida
+O loop nunca escreve, por nenhuma via, nas tabelas "dentro". Vale a regra geral do Banco para todas.
+
+| Tabela ou grupo | Dono | Regra para o loop |
+|---|---|---|
+| C0 analítico: `clientes_receita`, `leads_crm`, `leads_crm_historico`, `ads_metadata`, `ads_performance`, `vw_atribuicao_proporcional`, `fn_mql_sql_by_month`, `trafego_*` | compartilhado (núcleo analítico) | dentro: zero escrita, zero DDL. Exceções históricas em `docs/CANONICO.md` (TABELAS C0) |
+| `trafego_regras_historico` | compartilhado (C0) | dentro. Só `src/app/api/trafego/regras-historico/route.ts:40`, e só com liberação por ticket (`orq liberar`). As outras 5 rotas que escrevem nela são pendência no PLAYBOOK |
+| `meta_*` do OS, por nome: `meta_connections`, `meta_ad_accounts`, `meta_insights_cache`, `meta_lead_forms`, `meta_sync_logs`, `meta_agency_connection`, `client_meta_accounts` | Comarka OS | dentro |
+| `perf_*` e `ia_prompts` | Comarka OS, até o Lucas definir | dentro. O dashboard escreve hoje em `perf_*` e `ia_prompts`: o loop não toca essas rotas |
+| `ghl_comercial`: `ghl_etapa_mapa`, `ghl_user_map`, `ghl_funnel_snapshot`, `ghl_sdr_alerts`, `ghl_unmapped_users`, `ghl_etapas_nao_mapeadas` | dashboard | fora: o loop pode escrever |
+| `dashboard_readonly`: `meta_form_leads`, `meta_lead_matching_status`, `creative_scores`, `ai_ad_creatives`, `ai_adset_targeting`, `ai_alerts`, `ai_performance_snapshots`, `ai_placement_analysis`, `ai_usage_log` | dashboard | fora: o loop pode escrever |
+| config do loop | — | `zona_proibida.no_write_tables` do `docs/fila/000-config.json` segue esta tabela. O motor só aceita nome literal (kit `enforcement-core.ts:460-462`): `perf_*`, `trafego_*` e `leads_crm*` entram enumerados. O config é feito na etapa do `--novo`, fora desta sessão |
+
+## Banco
+- Mesmo projeto do Comarka OS. Schema nunca de memória: `information_schema.columns` antes de citar coluna.
+- **Nenhum DDL, grant, RLS, trigger ou delete em produção sem mostrar o comando exato e esperar o ok do
+  Lucas.** Leitura roda direto.
+- Migration: escreva o `.sql` em `supabase/migrations/` e pare. Versão livre no **ledger**
+  (`supabase_migrations.schema_migrations`), não só na pasta: os dois repos disputam a faixa.
+  O `.sql` aplicado entra na `main` no mesmo ciclo. Proibido DDL pelo editor SQL do Supabase.
+- CREATE-only: nunca ALTER/DROP em objeto existente; coluna nova nullable; view nova com
+  `security_invoker=true` + `REVOKE ALL` de anon/authenticated; matview com UNIQUE INDEX e cadastrada no
+  cron `refresh_trafego_views_hourly` na mesma migration.
+- Antes de DROP/REPLACE aprovado: cole a definição viva (`pg_get_functiondef`) no relatório.
+- Soft delete sempre. Falha de leitura vira `'n/d'`, nunca 0 nem lista vazia.
+
+## Comandos (npm)
+```bash
+npm ci                         # único node_modules que vale para teste e typecheck
+npm test                       # suíte padrão, sem credencial (setup recusa *.supabase.co)
+npm run test:integration       # só contra TEST_SUPABASE_URL + TEST_SUPABASE_SERVICE_ROLE_KEY
+npx tsc --noEmit 2>&1 | grep 'error TS' | grep -vc '^\.next/'   # typecheck, sem next-env.d.ts
+npm run build >/dev/null 2>&1 && echo BUILD_OK
+```
+- Typecheck: **245 erros hoje** (medido em `f3b7892`). **Gate do dia 1: ≤ 246.** Mede-se em árvore limpa
+  (sem `.next/` nem `next-env.d.ts`, que são artefato de build); delta se prova erro a erro, não pelo total.
+
+## Testes
+- Teste só vale com `node_modules` do `npm ci` deste lockfile. node_modules emprestado não prova nada.
+- A suíte padrão roda sem credencial. Teste nunca lê `.env*` do disco nem usa service role de produção.
+- Teste de guard ou invariante entra com controle negativo demonstrado, e o resultado vai no relatório.
+- Teste que protege decisão do Lucas não se recalcula. Teste preso a regra que mudou se corrige ou sai.
+
+## Git, integração e deploy
+- `git add` só por pathspec. Antes do commit: `git status` + `git diff --cached --stat`. Um commit por peça.
+- Nunca `--no-verify`, nunca `git checkout` de outra branch numa worktree compartilhada.
+- **Integrador único**: só uma sessão por vez (ou o Lucas) faz merge em `main`, push e deploy, sempre pelo
+  `dc-deploy`. Outra sessão entrega a branch (nome + SHA + gate) e para. A integradora abre conferindo
+  `git reflog -n 10 main`; merge que ela não fez é para parar e reportar.
+- Nenhum push nem deploy sem autorização explícita do Lucas. O hook `pre-push` do clone principal pede
+  `PUSH` no terminal para `refs/heads/main`; ninguém contorna (nada de `core.hooksPath`, tty simulado,
+  outro refspec). Push bloqueado: parar e reportar.
+- `staging-auto` só recebe merge (da `main` e do loop); nenhum commit nasce na worktree dela.
+  `docs/fila/PAUSAR` presente congela merge e push na `main` e na `staging-auto`.
+- Deploy = `git archive` do commit, nunca `vercel --prod` na worktree (sobe o disco, não o commit):
   ```bash
   SHA=$(git -C ~/Projetos/_worktrees/dc-deploy rev-parse --short main)
   rm -rf /tmp/dc-release && mkdir /tmp/dc-release
   git -C ~/Projetos/_worktrees/dc-deploy archive "$SHA" | tar -x -C /tmp/dc-release
-  cp -R ~/Projetos/_worktrees/dc-deploy/.vercel /tmp/dc-release/   # link do projeto (não versionado)
+  cp -R ~/Projetos/_worktrees/dc-deploy/.vercel /tmp/dc-release/
   cd /tmp/dc-release && vercel --prod
   ```
-  O diretório de release só contém arquivos rastreados do commit. Anote SHA + `dpl_…` + "método: archive" no registro.
-- 1 sessão de Claude Code por worktree. Nunca orquestrar múltiplos worktrees de uma sessão.
-- **INTEGRADOR ÚNICO** (29/09/2026, decisão do Lucas): **só uma sessão por vez faz merge em `main`, push e deploy** do dashboard comercial — a sessão integradora, que é a dona do `dc-deploy`. Qualquer outra sessão trabalha na worktree dela e **entrega a branch** (nome + SHA + gate); não faz `merge` em `main`, não faz push de `main`, não faz deploy e não roda comandos que mudem o HEAD do `dc-deploy`. Motivo: em 29/09 duas sessões usaram o `dc-deploy` ao mesmo tempo; uma mergeou dois lotes em `main` (`1e94f83`, `4501db9`) enquanto a outra preparava um push aprovado, e o `main` local deixou de ser o que tinha sido revisado. Ao abrir, a sessão integradora confere `git reflog -n 10 main` — merge que ela não fez é para PARAR E REPORTAR.
-- NENHUM push/deploy sem autorização explícita do Lucas.
-- **Nenhuma sessão roda `vercel --prod` nem push no `main`; deploy e push são do Lucas no terminal. Só uma sessão por vez mexe no `dc-deploy`.** (29/09/2026, decisão do Lucas.)
-- **HOOK PRE-PUSH NO MAIN** (29/09/2026, decisão do Lucas): push para `refs/heads/main` exige que o Lucas digite `PUSH` no terminal. O hook fica em `.git/hooks/pre-push` do clone principal (não versionado; vale para todas as worktrees, que compartilham o `.git`) e lê a resposta de `/dev/tty` — sem terminal, o push é bloqueado. **Nenhuma sessão contorna a trava**: nada de `--no-verify`, `core.hooksPath` apontado para outro lugar, edição/remoção do hook, `/dev/tty` simulado ou push por outro remoto/refspec que chegue ao `main`. Push bloqueado pelo hook é para PARAR E REPORTAR ao Lucas, não para tentar de novo por outro caminho.
-- TypeScript: barra de qualidade = delta-0 erros novos sobre o baseline da working tree (não zero absoluto).
-  - **Baseline = 246 erros de código-fonte em árvore limpa** (medido em `a1f5bbc`, 29/09/2026, worktree nova sem `.next/` nem `next-env.d.ts`). Histórico: 313 (até 09/09, inflado por `.next/types`) → 279 (09/09–29/09, ainda inflado) → 246.
-  - Os 279 incluíam **33 erros criados por `next-env.d.ts`**, arquivo GERADO pelo `next build`/`next dev` e ignorado pelo git (`.gitignore:39`). Ele referencia `next/navigation-types/compat/navigation`, que torna `usePathname()`/`useParams()` anuláveis (`'pathname' is possibly 'null'`). Prova (29/09): árvore limpa em `a1f5bbc` = 246; a mesma árvore + só o `next-env.d.ts` do `dc-deploy` = 279; + só o `.next/types` = 246. O `node_modules` não muda o total.
-  - A contagem **IGNORA `.next/` e roda sem `next-env.d.ts`** (worktree limpa, ou `git archive` do commit): `npx tsc --noEmit 2>&1 | grep 'error TS' | grep -vc '^\.next/'`. Artefato de build não entra na barra de qualidade — `next-env.d.ts` é artefato de build, igual ao `.next/`. Base e ponta de uma comparação são medidas no MESMO ambiente.
-  - Delta-0 se prova comparando **erro a erro**, não pelo total: erro deslocado de linha por inserção acima dele parece novo e não é.
-
-## DDL (Supabase)
-Migrations CREATE-only (nunca ALTER/DROP em objetos existentes). Colunas novas nullable. Views novas com `security_invoker=true` + `REVOKE ALL` de anon/authenticated. Matviews: UNIQUE INDEX para REFRESH CONCURRENTLY. `pg_cron` ativo (refresh horário via `refresh_trafego_views_hourly`).
-
-- ⚠️ **Validação de build:** `pnpm test && pnpm run build` **não conclui neste ambiente** — o pnpm 11 roda um `verify-deps-before-run` que aborta em `ERR_PNPM_IGNORED_BUILDS` (scripts de build de `esbuild`/`sharp`/`@sentry/cli`/`unrs-resolver` não aprovados). Destravar exige `pnpm approve-builds` ou `pnpm.onlyBuiltDependencies` no `package.json` (decisão do Lucas). `next build` roda limpo por binário direto (252/252 páginas, exit 0). `package-lock.json` está **versionado** apesar do projeto ser pnpm — decidir `git rm` (pendente autorização).
+  Depois: linha em `docs/deploy/registro-producao.md` (SHA, `dpl_…`, "método: archive") e validação
+  autenticada em navegador anônimo (curl engana: o middleware mascara 404 com 401/307).
+
+## Fluxos de trabalho
+- **Sessão**: Lucas descreve, o chat gera o prompt (contexto, premissas, PASSO 0 de leitura, tarefas,
+  revisão final, NÃO FAZER), a sessão roda numa worktree `dc-<assunto>` e entrega a branch.
+- **Loop**: ticket na fila (`docs/fila/NNN-*.md`), executado pelo motor em `dc-orq-<id>`, merge na
+  `staging-auto`. Lições do loop e incidentes: `docs/orquestrador/PLAYBOOK.md`, no mesmo commit do conserto.
+- Diagnóstico antes de correção: causa raiz confirmada com query real. Card com mais de 7 dias tem a
+  premissa reconfirmada. Ambiguidade real: pausar e reportar, nunca chutar.
+- Mudança de cálculo visível: shadow mode (antigo e novo lado a lado por 7 dias) e comparação com
+  `_audit_baseline_metrics_v2`; divergência > 0,5% fora do escopo é para parar e reportar.
+- Prova é saída crua (diff, `cat -n`, resultado de query). Resumo de subagente não valida nada.
````

### 2717248 docs(orquestrador): PLAYBOOK com o seed do kit a001fde e as lições do dashboard

````diff
diff --git a/docs/orquestrador/PLAYBOOK.md b/docs/orquestrador/PLAYBOOK.md
new file mode 100644
index 0000000..907e192
--- /dev/null
+++ b/docs/orquestrador/PLAYBOOK.md
@@ -0,0 +1,237 @@
+# PLAYBOOK do Orquestrador — seed
+
+> Memória viva do loop. **Todo incidente vira uma linha aqui, no mesmo commit que o corrige.**
+> As lições abaixo já foram pagas com incidente real no repo de origem — este repo começa com elas, não do zero.
+
+## Princípios
+- **Código verifica, modelo julga.** Aprovação vem de comando executável; a opinião do modelo sobre o próprio trabalho não conta.
+- **Amnésia por design.** Cada braço reconstrói o estado da fonte única (fila + git); nada de estado implícito entre rodadas.
+- **Fail-fast por custo.** Cheque barato antes de gasto caro, sempre.
+- **A fronteira é código.** Allowlist + guards físicos; prompt é desejo, enforcement é lei.
+- **Fonte única de estado.** Fila/status/evidência num único checkout.
+
+## Lições de campo (herdadas)
+- **Faixa livre no disco ≠ faixa livre no ledger.** Antes de reservar faixa de migrations/IDs, checar reservas DOCUMENTADAS (CLAUDE.md, ledger, docs de arquitetura), não só `ls` no diretório. Reserva documentada de módulo futuro prevalece sobre disco vazio.
+- **Pasta existente ≠ spec presente.** Um `mkdir` sobrevive a um `unzip` falho; preflight e pré-voo verificam CONTEÚDO dos arquivos (`test -s`, contagem em `git ls-files`), nunca só o diretório.
+- **Headless não enxerga skill de chat.** `claude -p` via launchd/cron/CI só lê o que está no repo — a doutrina TEM que estar vendorizada em `docs/orquestrador/skill/` e o prompt do executor referencia a cópia local. Instalação que dependia de skill externa rodou sem spec.
+- **Log ≠ verdade; git é o ground truth.** Um "aprovado" no log era outro ticket rodando de casa paralela.
+- **Executor da casa errada cria ESTADO PARALELO** — dois estados que parecem válidos. Preflight de identidade é obrigatório e fatal.
+- **Lock robusto = pid + idade máxima + cleanup em TODO caminho de saída** + auto-limpeza de órfão no início.
+- **Deps referenciam o campo `id` do JSON, nunca o nome do arquivo.**
+- **Campo fora do schema é ignorado em silêncio** — valide nomes contra o schema.
+- **`tail -f` prende o terminal** — leitura pontual quando for encadear comandos.
+- **Gerador de story ≠ gerador de ticket.** O gate é critério executável + verificação de fonte. "Existe no brief" ≠ existe no disco: todo nome de tabela é verificado no repo, inclusive em brief humano.
+- **Nunca reinício forçado do serviço com run vivo** — checar lock/pid antes; reinício por cima = dois executores na mesma fila.
+- **Parser do veredicto: falha de parse = adiado, nunca reprovação.** Incidente real: juiz aprovou, parser declarou ilegível, trabalho bom foi descartado. Preserve sempre o output CRU do juiz.
+- **Branch de ticket bloqueado não é deletada** até revisão humana — o commit é evidência recuperável (sha fica em runs/, mas branch viva é mais barata de auditar).
+- **Writeback externo é upsert de seção única**, nunca append (duplica a cada sync).
+- **Relatório com credencial ausente cai para arquivo local** — falha silenciosa esconde o placar.
+- **Allowlists sobrepostas entre tickets pendentes exigem dep explícita** — senão o segundo nasce de base velha e o merge conflita no registry compartilhado.
+- **Critério de UI cobra integração, não existência** — componente criado mas nunca importado/montado passa em "arquivo existe" e falha em produção; o juiz deve cobrar o import/mount.
+- **Merge manual guiado: resolução completa ANTES de qualquer add/commit** — placeholder no meio do fluxo mandou markers de conflito pro origin.
+- **Build ≠ typecheck** em setups com `ignoreBuildErrors` — o gate real é o typecheck explícito contra baseline.
+
+## Lições de campo (triadas do PLAYBOOK do conteudos-infinitos, set/2026)
+
+> **Procedência e critério.** As 15 abaixo saíram de uma triagem do
+> `PLAYBOOK.md` do repo conteudos-infinitos (129 lições registradas entre 01 e
+> 08/set/2026, lido só para leitura). Entrou o que passa nos TRÊS filtros:
+> (1) é sobre o MECANISMO do orquestrador, não sobre o produto, a stack ou o
+> roadmap daquele repo; (2) foi PAGA — incidente ou medição, nunca preferência
+> de desenho; (3) muda o que alguém FARIA num repo novo. Cada uma traz a data e
+> a origem, porque lição sem procedência vira folclore em três meses.
+>
+> As outras 114 não são piores: são locais, ou já estão na SKILL.md, ou são
+> variações destas. A triagem do resto é a peça K10b do kit.
+
+- **Número que reinicia nunca nomeia arquivo que persiste.** (2026-09-04,
+  conteudos-infinitos.) Ao devolver um ticket para `pendente`, a drenagem
+  seguinte recomeçou o contador de retry em 0 — correto — e nomeou o diretório
+  de evidência com esse mesmo número. `runs/227/attempt-0/` ficou com o prompt e
+  a saída de hoje ao lado dos gates de ontem, e a evidência da **única
+  reprovação legítima que aquele loop já tinha produzido** foi destruída, sem
+  cópia. Contador de retry e slot de evidência são duas coisas.
+
+- **O remédio do retry tem de ser aplicado na árvore onde a doença existe.**
+  (2026-09-04, conteudos-infinitos.) O juiz reprovou com razão; o retry recriou
+  a worktree do zero; o agente abriu uma árvore vazia, não achou nada do que o
+  diagnóstico mandava corrigir e devolveu diff 0 em 15 s e 3 s. Duas tentativas
+  queimadas em 18 segundos e um ticket BLOQUEADO a uma correção de distância.
+  **Reprovação boa virou bloqueio injusto.** Retry reaproveita a worktree quando
+  o enforcement da tentativa anterior passou.
+
+- **Trabalho verificado não se perde por falta de `git commit`.** (2026-09-04,
+  conteudos-infinitos.) O agente gastou 22 turnos e US$ 0,52, escreveu 150 linhas
+  em três arquivos e saiu sem commitar. O pipeline mede `git diff base...HEAD`,
+  viu **diff 0**, e a worktree seria removida com tudo dentro. O harness passou a
+  commitar por ele antes de medir — e não é indulto: é o contrário, porque o
+  `git add -A` do harness inclui de propósito o arquivo fora da allowlist, que
+  antes passava batido com diff 0 e agora é REPROVADO pelo enforcement.
+
+- **Morte por sinal é o desfecho que um harness ingênuo não sabe contar.**
+  (2026-09-04, conteudos-infinitos.) Um executor morreu entre a chamada do agente
+  e o registro de custo. Não havia `trap`, o rc era descartado (`say "executor
+  rc!=0"`, sem o número) e a chamada rodava sob `|| rc=$?`, que DESLIGA o
+  `errexit`. Não deu para saber quem mandou o sinal. A lição é sobre o buraco,
+  não sobre a causa: se o harness não sabe contar uma morte, ele conta como
+  "nada aconteceu".
+
+- **Evidência falsa é pior que evidência ausente.** (2026-09-07,
+  conteudos-infinitos.) Um evento de morte espúrio na trilha é indistinguível de
+  morte de verdade: quem lê depois conta mortes que não houve e vai procurar
+  causa onde não há defeito. Por isso a correção foi uma GUARDA no código, não
+  disciplina de quem escreve teste — **disciplina não sobrevive à sexta-feira**.
+
+- **Script de teste nunca escreve na trilha de produção.** (2026-09-07,
+  conteudos-infinitos.) O corolário do anterior, e a forma que a guarda tomou:
+  escrita de trilha, STATUS e custo só é permitida dentro do `ORQ_EXEC_ROOT`
+  declarado. Um teste que suja a trilha real produz exatamente a evidência falsa
+  do item acima.
+
+- **A trilha é append-only, e a correção honesta de um registro append-only é
+  uma ANOTAÇÃO ao lado.** (2026-09-07, conteudos-infinitos.) Não se apaga linha
+  de trilha para consertar o que ela diz. Acrescenta-se um evento de anotação
+  que aponta para a linha errada e explica. Editar o passado é como um log deixa
+  de ser prova.
+
+- **Evento de trilha nunca contém quebra de linha.** (2026-09-07,
+  conteudos-infinitos.) Uma linha por transição só é uma promessa verificável se
+  o comando que entrou no evento não puder quebrá-la. Truncar por caractere não
+  basta: `cut -c` é orientado a LINHA e deixa passar o `\n` do meio.
+
+- **A guarda contra disparo concorrente é POR REPO, e por isso é o lockfile.**
+  (2026-09-02 e 2026-09-07, conteudos-infinitos.) `pgrep -f local-loop` global
+  pegou o loop de OUTRO repo na mesma máquina e teria abortado a sessão sem
+  motivo — duas vezes, com um mês de intervalo. Dois orquestradores na mesma
+  máquina são operação NORMAL. A pergunta vai ao `.local-loop.lock` do
+  `runs_dir` deste checkout; `kill -0` é sonda de vida, não sinal.
+
+- **Snapshot congelado come disparos em silêncio; a staleness vem PRIMEIRO.**
+  (2026-09-07, conteudos-infinitos.) O STATUS ficou em `executando` por **22 h**,
+  e todos os disparos do agendador saíram com exit 0 sem fazer nada: cada um
+  perguntava "já há drenagem em curso?" e acreditava no snapshot. Perguntar isso
+  primeiro é confiar num estado que ninguém está mantendo. Aplique a staleness
+  antes (tempo além do timeout = processo morto), recupere e SIGA; o lock
+  continua sendo a autoridade sobre concorrência.
+
+- **Critério com `$(...)` sobre arquivo que ainda não existe falha com rc 2, não
+  com veredito.** (2026-09-02, conteudos-infinitos.) `test $(wc -l < ausente) -ge
+  10` vira "unknown condition" — erro de shell, indistinguível de bug do gate.
+  Guarde a existência primeiro: `test -s a && test $(grep -c '' a) -ge 10 && echo ok`.
+
+- **`espera` é igualdade exata.** (2026-09-02, conteudos-infinitos.) "não-zero"
+  não existe como valor esperado. A forma que funciona é o `cmd` decidir e
+  imprimir: `... && echo ok`, com `espera: "ok"`.
+
+- **O que o ticket NÃO pode tocar fica FORA da allowlist, não num critério.**
+  (2026-09-02, conteudos-infinitos.) O enforcement reprova o diff ANTES do juiz,
+  e isso é mais forte que qualquer guarda escrita como critério. Critério é o que
+  o ticket precisa provar; allowlist é o que ele pode alcançar.
+
+- **Grep de critério casa comentário, e o comentário mente sobre o código.**
+  (2026-09-05, conteudos-infinitos.) Um guard contava 3 ocorrências de um termo:
+  uma no código e duas em comentário. Ancore o critério num trecho que só existe
+  no código — e prefira o símbolo com pontuação (`hash_dedupe:`) à palavra solta.
+
+- **Erro fora da allowlist não é retry: é ticket mal escrito.** (2026-09-07,
+  conteudos-infinitos.) Cinco tentativas do mesmo ticket reprovaram no MESMO gate
+  com os MESMOS três erros, todos em arquivos fora da própria allowlist. O agente
+  da última tentativa escreveu o diagnóstico dentro do diff — *"o conserto é de
+  quatro linhas, todas fora daqui"* — e ainda assim reprovou, porque não podia
+  tocá-las. Antes de conceder retry a um ticket reprovado por gate, compare o
+  arquivo do erro com a allowlist.
+
+## Regras v2 (pagas por design, não por incidente; rebaixe se a evidência contradisser)
+- **Candidato não é ticket.** Gerado por máquina entra como `candidato`; só o gate promove. O gate descarta, nunca conserta.
+- **Teste vermelho antes de implementar.** Critério `alvo` que já passa não mede nada; é a raiz de "aprovado sem fazer nada". Vermelho pelo motivo errado (rc 126/127, timeout, sintaxe) é `invalido` e descarta.
+- **Planejador decompõe, não inventa.** Frente que não está `pronta` não existe para ele. Dúvida vira `decisoes-pendentes.md`, não escopo.
+- **Sinal só vira ticket com threshold + baseline + quarentena.** Arquivo mergeado pelo loop nas últimas 24h ⇒ decisão humana, não ticket; senão o loop oscila corrige-quebra-corrige.
+- **Orçamento é gate.** Estourou = adiado + aviso. "Só este" é como se estoura.
+- **Contexto por script, com cap.** Executor nunca explora o repo; recebe pack derivado do ticket + assinaturas do repo map.
+- **Reprovação mecânica não gera retry.** Fora da allowlist, acima do cap, zona proibida ⇒ `refatiar` de volta a quem escreveu.
+- **Harness, roadmap e doutrina nunca passam pela fila**, nem como bug da sentinela.
+- **Planejador e sentinela são fases da drenagem**, sob o mesmo lock. Daemon paralelo deles = segundo estado.
+- **Prefixo estável no prompt ou o cache não existe.** Timestamp/pid/tentativa sempre no fim. Medir `tokens_cache/tokens_in`.
+- **Motor único versionado.** Não se escreve orquestrador por repo: instala-se o do kit
+  (`instalar.sh --novo`) e o que varia vive no `000-config.json`. Editar o motor vendorizado
+  aqui dentro é NO-GO no pré-voo — `instalar.sh --verificar` é quem afirma isso.
+- **Canal de notificação padrão é ARQUIVO.** O loop roda headless: canal que depende de
+  sessão gráfica falha exatamente quando ninguém está olhando. Qualquer outro canal é
+  acréscimo, e mantém o fallback em arquivo.
+- **ID de ticket é ordem de fila, sequencial global.** Faixa por bloco vira prioridade por
+  bloco, porque o loop drena em ordem de ID. A pertença mora nos campos `bloco` e `frente`.
+- **`risco` é derivado, não exigido.** Quem escreve o ticket deixa a chave vazia; o passo 6
+  do gate a preenche. Pedir a classificação ao autor troca uma medida por uma opinião.
+
+---
+
+## Lições do dashboard comercial
+
+> Do repo `dashboard-comercial`, antes da instalação do loop. O texto acima é o seed do kit
+> `a001fde` (`doutrina/templates/PLAYBOOK-seed.md`), sem edição.
+
+## Lição (22/10/2026) — teste de integração lia `.env.local` e escreveu em produção
+
+`src/__tests__/grace-softdelete-v128.integration.test.ts` lia `../../.env.local` do disco com
+`readFileSync` e usava `SUPABASE_SERVICE_ROLE_KEY` dali. Um `vitest run` comum, numa máquina com
+`.env.local` de produção, rodou o teste contra o banco real em 04/09, 10/09 e 16/09. Resíduo: duas
+linhas `TESTE-V128-SOFTDELETE CLIENTE A/B` em `clientes_notion_mirror`, apagadas em 22/10 com backup
+(`docs/reconciliacao/2026-10-22-delete-teste-v128.sql`). A guarda `PERMITIR_ESCRITA_PRODUCAO`
+(`dc0dc45`, 16/09) veio depois e só trocou o acidente por um interruptor: ligado, o alvo seguia
+sendo produção.
+
+Causa: o alvo do teste vinha do arquivo de credenciais da máquina, não de uma variável própria de teste.
+
+Regra: teste nunca lê `.env*` do disco. Integração só contra `TEST_SUPABASE_URL` +
+`TEST_SUPABASE_SERVICE_ROLE_KEY`; faltando uma, a suíte pula; URL com o id de produção aborta antes de
+conectar. A suíte padrão roda sem credencial: o setup apaga as variáveis do Supabase e recusa fetch
+para `*.supabase.co`, e reprova o teste que tentou, mesmo com `catch` mudo no app.
+
+Prova: `0f24c41` (alvo `TEST_*`; sem `TEST_*` 5 skipped rc=0; URL de produção abortada rc=1);
+`5ed537c` (barreira; controle negativo 3/3 vermelho sem o setup); `28b7e6e` (terceiro teste indireto
+que a barreira pegou).
+
+## Lição (22/10/2026) — método inexistente na versão do lockfile, verde só com node_modules emprestado
+
+`src/__tests__/barreira-sem-credencial.test.ts:36` chamava `.retry(false)`. O
+`@supabase/postgrest-js 2.101.1` do `package-lock.json` não tem esse método: TypeError na suíte e
+TS2339 no typecheck. O teste passou na sessão que o escreveu porque o `node_modules` dela veio de outra
+versão. O verde provava a dependência emprestada, não o código.
+
+Causa: validação com `node_modules` que não saiu do `npm ci` do lockfile do commit.
+
+Regra: teste e typecheck só valem com `node_modules` do `npm ci` deste lockfile. Worktree sem
+`node_modules` próprio roda `npm ci` antes do gate; symlink ou cópia de outra árvore não conta.
+
+Prova: `f3b7892` (com `npm ci`: 97 arquivos, 1.257 testes, rc=0; controle negativo 3/3 vermelho;
+typecheck 246 → 245, só o TS2339 sai); merge `d8be96d`.
+
+## Lição (22/10/2026) — teste preso à base de comissão antiga por cinco meses (DC-0001)
+
+A base da comissão do closer passou de LTV (`47f8afb`, 29/04) para `valor_entrada` (`d70498b`, 07/05).
+Os três casos de teste de `calcularComissaoCloserPorContratos` continuaram esperando LTV até 22/10, e
+a função já não tinha chamador em `src/` nem `scripts/`. O teste estava errado, não a função.
+
+Causa: a mudança de regra de negócio não varreu os testes que fixavam a regra antiga, e a função sem
+chamador manteve esses testes vivos sem que nada em produção dependesse deles.
+
+Regra: mudança de regra de negócio varre os testes que fixam a regra anterior no mesmo commit. Teste
+que protege decisão vigente do Lucas não se recalcula; teste preso a regra substituída se corrige ou
+sai junto com o código morto. A fonte única de comissão é `comissao-canonica.ts`.
+
+Prova: `2657215` (remove a função e os três casos; `comissao-canonica.ts` intocado).
+
+## Pendência (22/10/2026) — `trafego_regras_historico` escrita fora da rota autorizada
+
+A exceção de escrita de 29/09 cobre só `src/app/api/trafego/regras-historico/route.ts:40`. Outras 5
+rotas também inserem nessa tabela C0:
+
+- `src/app/api/ia/avaliar-alerta-trafego/route.ts:186`
+- `src/app/api/meta/ativar/route.ts:53`
+- `src/app/api/meta/duplicar/route.ts:53`
+- `src/app/api/meta/editar-budget/route.ts:66`
+- `src/app/api/meta/pausar/route.ts:64`
+
+Nada foi alterado. Vira um compromisso DC de investigação (quem chama, desde quando, se o Comarka OS
+lê essas linhas). Até lá, o loop não toca nenhuma das seis rotas; a autorizada só com liberação por
+ticket (`orq liberar`).
````

### b9dc967 docs(sessao): retrato, status do plano e decisões de 22/10 (DC-0004)

````diff
diff --git a/docs/sessao/ESTADO-ATUAL.md b/docs/sessao/ESTADO-ATUAL.md
new file mode 100644
index 0000000..e122565
--- /dev/null
+++ b/docs/sessao/ESTADO-ATUAL.md
@@ -0,0 +1,32 @@
+# Estado atual (22/10/2026 15:55)
+main: d8be96d  staging: (não existe; nasce no `instalar.sh --novo`)
+Produção: ffb7592 (`dpl_DuRA6a5qm2XtJrtGBK1A9SBmbkGY`, DC-0002). d8be96d só mexe em teste.
+
+## Feito
+- DC-0001: remove `calcularComissaoCloserPorContratos` e os testes presos à base LTV (prova: commit 2657215)
+- DC-0002: integração Notion removida e publicada (prova: commit ffb7592, registro-producao.md:11)
+- DC-0003: barreira sem credencial sem `.retry()`, validada com `npm ci` (prova: commit f3b7892, merge d8be96d)
+- Suíte padrão sem credencial e integração só contra `TEST_SUPABASE_*` (prova: commits 5ed537c, 0f24c41)
+- DC-0004, conteúdo do repo para o `--novo`, na branch `docs/dc-orq-conteudo` (a integrar):
+  - P0 cânone de domínio movido byte a byte para `docs/CANONICO.md` (prova: commit 7ed5e09)
+  - P1 CLAUDE.md reescrito, 117 linhas (prova: commit 682a8c4)
+  - P2 `docs/orquestrador/PLAYBOOK.md` = seed do kit a001fde + 3 lições (prova: commit 2717248)
+  - P3 este retrato, STATUS-PLANO e decisões do dia (prova: o commit desta peça)
+
+## Pendente
+- Integrar `docs/dc-orq-conteudo` na `main` (integrador, pelo `dc-deploy`).
+- DC-0004, etapa do `--novo`: clone dedicado ao loop, `instalar.sh --novo`, preencher
+  `docs/fila/000-config.json` (no_write_tables enumerado conforme a zona do CLAUDE.md), `orq config`
+  com 0 violações, pré-voo, ticket-fixture até a `staging-auto`, só então o launchd.
+- DC-0005: investigar as 5 rotas que escrevem em `trafego_regras_historico` fora da exceção
+  (lista em `docs/orquestrador/PLAYBOOK.md`, seção Pendência).
+- Dois tickets de receita registrados sem DC (`docs/tickets-avulsos-2026-10-22.md`).
+
+## Bloqueado
+- Lista enumerada de `perf_*`, `trafego_*` e `leads_crm*` para o config: precisa de leitura do banco
+  (`information_schema.tables`), que esta sessão não fez por regra. Base das migrations no relatório.
+
+## Lucas precisa
+- Revisar e integrar a branch `docs/dc-orq-conteudo` (4 commits sobre d8be96d).
+- Definir o dono final de `perf_*` e `ia_prompts` (hoje: lado do OS, dentro da zona).
+- Abrir DC-0005 como compromisso de investigação, ou dizer outro número.
diff --git a/docs/sessao/STATUS-PLANO.md b/docs/sessao/STATUS-PLANO.md
new file mode 100644
index 0000000..d8c7667
--- /dev/null
+++ b/docs/sessao/STATUS-PLANO.md
@@ -0,0 +1,22 @@
+# Status do plano: compromissos DC
+
+Atualizado em 22/10/2026. Lista de compromissos, escrita à mão. **Status de ticket da fila nunca é
+escrito aqui**: depois do `--novo`, ele sai de `bash scripts/orq fila`. A coluna "estado" é a do
+compromisso, e cada "feito" cita a prova.
+
+| Compromisso | Objetivo | Estado | Prova ou próximo passo |
+|---|---|---|---|
+| DC-0001 | Remover código de comissão sem chamador e o teste preso à base LTV | feito, na main | commit 2657215 |
+| DC-0002 | Tirar o Notion do dashboard (nem fonte nem destino) | feito, em produção | ffb7592, `dpl_DuRA6a5qm2XtJrtGBK1A9SBmbkGY` |
+| DC-0003 | Barreira sem credencial sem `.retry()` (postgrest-js 2.101.1) | feito, na main | f3b7892, merge d8be96d |
+| DC-0004 | Adotar o orquestrador-kit (`instalar.sh --novo`) com paridade ao Comarka OS | em andamento | conteúdo na branch `docs/dc-orq-conteudo`; falta o `--novo` |
+| DC-0005 | Investigar as 5 rotas que escrevem em `trafego_regras_historico` fora da exceção | proposto (Lucas confirma o número) | `docs/orquestrador/PLAYBOOK.md`, Pendência 22/10 |
+
+## Fora do plano, registrado
+- `config_mensal.receita_realizada` sobrescreve "Receita Confirmada" (jan–abr/2026) e o "Anterior" do
+  card compara bases diferentes: `docs/tickets-avulsos-2026-10-22.md`. Sem DC; exigem shadow mode.
+
+## Regras deste arquivo
+- Compromisso novo = linha nova aqui, no mesmo commit em que a decisão é registrada em DECISOES.
+- Ticket da fila tem id de 3 dígitos e `"compromisso": "DC-XXXX"`; o id DC nunca é id de ticket.
+- Pausar, cancelar ou substituir um compromisso exige o motivo na própria linha.
diff --git a/docs/sessao/decisoes-2026-10-22.md b/docs/sessao/decisoes-2026-10-22.md
new file mode 100644
index 0000000..377a9a9
--- /dev/null
+++ b/docs/sessao/decisoes-2026-10-22.md
@@ -0,0 +1,41 @@
+# Decisões e diagnósticos: 22/10/2026
+
+Todas do Lucas, na sessão `dc-orq-conteudo` (adoção do orquestrador no dashboard, DC-0004).
+
+## Decisões que vieram prontas
+- D1. Prefixo de compromisso `DC-XXXX`. Gerenciador npm; o CLAUDE.md que falava em pnpm estava errado.
+- D2. Banco `ogfnojbbvumujzfklkhh` compartilhado com o Comarka. ZONA_PROTEGIDA e `no_write_tables` são
+  uma lista só.
+- D3. A plataforma não lê nem escreve no Notion.
+- D4. Integrador único: só uma sessão (ou o Lucas) integra e publica, sempre pelo `dc-deploy`.
+- D5. Teste só vale com `node_modules` do `npm ci`; a suíte padrão roda sem credencial.
+- D6. Nenhum DDL, grant, RLS, trigger ou delete em produção sem mostrar o comando e esperar o ok.
+- D7. Gate de typecheck no dia 1: ≤ 246 erros. Medida de hoje: 245 (`f3b7892`).
+
+## Decisões do PASSO 0 (respostas L1 a L6)
+- L1. Regras de negócio movidas byte a byte para `docs/CANONICO.md`, num commit só de movimento
+  (7ed5e09). O CLAUDE.md aponta para lá.
+- L2. A zona sai de um mapa de dono, não da lista do Comarka. Fora: `ghl_comercial` e
+  `dashboard_readonly` (dono: dashboard). Dentro: C0 analítico, as 7 `meta_*` do OS por nome, `perf_*` e
+  `ia_prompts` (lado do OS até o Lucas definir), `trafego_regras_historico` (rota autorizada só com
+  `orq liberar`; as outras 5 rotas viram pendência no PLAYBOOK, sem mexer em código).
+- L3. Vence o schema do kit: ticket com id de 3 dígitos; DC-XXXX é o compromisso.
+- L4. PLAYBOOK em `docs/orquestrador/PLAYBOOK.md`, com o seed do kit e as três lições no fim.
+- L5. `dc-orq-<id>` é do loop; humano nunca nomeia worktree `dc-orq-*`. `dc-orq-conteudo` é a exceção
+  e some no merge.
+- L6. O checkout principal é área do Lucas; a regra é o integrador único, sem exigir branch nele.
+- AMBIENTES: a `staging-auto` ainda não existe e nasce na etapa do `--novo`.
+
+## Diagnósticos (causa e evidência)
+- `no_write_tables` só aceita nome literal: `parteDeTabela` escapa `*`
+  (kit a001fde, `scripts/orquestrador/enforcement-core.ts:460-462`; nota em `config-chaves.ts:71`).
+  `perf_*`, `trafego_*` e `leads_crm*` precisam ser enumerados no config.
+- O `--novo` não sobrescreve `docs/orquestrador/PLAYBOOK.md` (`copiar_se_ausente`, instalar.sh:588-593,
+  :675) e o `--verificar` não o compara (só `docs/orquestrador/skill`, instalar.sh:190-191; comentário :19).
+- Schema do ticket exige `^\d{3}[a-z]?$` (kit `schemas/ticket.schema.json`, `gate-ticket.ts:61`).
+- O dashboard escreve em tabelas que a lista do Comarka trata como do dashboard (`ghl_*`, `creative_scores`,
+  `meta_form_leads`, `ai_*`) e também em `perf_*` (11 escritas) e `ia_prompts` (2), que o Comarka trata
+  como do OS. Varredura com o regex do motor (`enforcement-core.ts:474-483`) sobre `src/` e `scripts/`.
+- `trafego_regras_historico`: 6 rotas escrevem; a exceção de 29/09 cobre 1.
+- Três lições confirmadas por commit, registradas no PLAYBOOK: `0f24c41`/`5ed537c` (`.env.local` e
+  service role em produção), `f3b7892` (`.retry()` fora do lockfile), `2657215` (teste na base antiga).
````

## P4: proibições do CANONICO pelo nome no CLAUDE.md

Motivo: o executor do loop carrega o CLAUDE.md, não o `docs/CANONICO.md`. Seção nova "Antes de qualquer
mudança" (CLAUDE.md:17-53), logo depois do ponteiro do cânone. As linhas que já existiam em Banco, Comandos,
Testes, Git e Fluxos e repetiam essas regras saíram de lá (DROP/REPLACE, soft delete, `'n/d'`, cron da matview,
"entra na main no mesmo ciclo", artefato de build, controle negativo, checkout, premissa de 7 dias, ambiguidade,
shadow, `_audit_baseline_metrics_v2`, aprovação de fórmula/página). O CANONICO não mudou
(`git diff --quiet 7ed5e09 HEAD -- docs/CANONICO.md` → inalterado).

### Cobertura: título do CANONICO, linhas, linha do CLAUDE.md que cobre

| Título do CANONICO | Linhas | CLAUDE.md |
|---|---|---|
| FÓRMULAS CANÔNICAS | 5-21 | 22-23 |
| DATAS E TEMPO | 22-28 | 26 |
| ATRIBUIÇÃO | 29-37 | 27-28 |
| TABELAS C0 | 38-42 | 85-86 (tabela da Zona protegida) |
| TABELAS BANIDAS | 43-51 | 19-21 |
| FONTES CANÔNICAS | 52-79 | 30-31 |
| TIME E EXCLUSÕES | 80-82 | 32 |
| PROTEÇÕES OBRIGATÓRIAS: 1 backups | 84 | 35 |
| PROTEÇÕES: 2 shadow mode | 85 | 36 |
| PROTEÇÕES: 3 `_audit_baseline_metrics_v2` | 86 | 37 |
| PROTEÇÕES: 4 soft delete | 87 | 38 |
| PROTEÇÕES: 5 ambiguidade | 88 | 39 |
| REGRAS DE ENGENHARIA: vazio e falha | 91 | 41 |
| REGRAS DE ENGENHARIA: `catch {}` mudo em monitor | 92 | 42 |
| REGRAS DE ENGENHARIA: monitor sem consumidor | 93 | 42 |
| REGRAS DE ENGENHARIA: credencial com `.trim()` | 94 | 43 |
| REGRAS DE ENGENHARIA: falhe alto | 95-99 | 44 |
| REGRAS DE ENGENHARIA: premissa envelhecida | 100 | 45 |
| REGRAS DE ENGENHARIA: matview nasce no cron | 101 | 46 |
| REGRAS DE ENGENHARIA: 1 sessão por worktree | 102 | 47 |
| REGRAS DE ENGENHARIA: banco é fato | 103 | 48 |
| REGRAS DE ENGENHARIA: teste visto falhando | 104-108 | 49 |
| REGRAS DE ENGENHARIA: horário na consulta | 109 | 50 |
| REGRAS DE ENGENHARIA: baseline sobre artefato | 110 | 51 |
| REGRAS DE ENGENHARIA: função no banco exige fonte | 111 | 52 |
| PÁGINAS PROTEGIDAS | 113-115 | 24-25 |
| GLOSSÁRIO | 116-118 | sem proibição (só ponteiro, CLAUDE.md:13-15) |
| ESTADO ATUAL CTWA | 119-127 | 33-34 |
| (regra de ticket) | — | 53 |

### Diff cru da P4

````diff
diff --git a/CLAUDE.md b/CLAUDE.md
index 91792e5..20fc944 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -12,8 +12,45 @@ Notion não é fonte nem destino de dado (DC-0002). `notion_id` e `*_notion_mirr
 ## Cânone de domínio
 Fórmulas, datas, atribuição, fontes canônicas, tabelas banidas, no-show, MRR, time, páginas protegidas,
 proteções de cálculo, regras de engenharia (texto integral) e glossário: **`docs/CANONICO.md`**.
-Leia a seção certa antes de mexer em métrica, fonte, atribuição ou tela protegida. Mudar fórmula canônica
-ou página protegida exige aprovação explícita do Lucas.
+Leia a seção certa antes de mexer em métrica, fonte, atribuição ou tela protegida.
+
+## Antes de qualquer mudança
+Proibições pelo nome. Motivo e texto integral em `docs/CANONICO.md`, na linha citada.
+- Banidas (:43): `clientes`, `vw_churn_mensal`, `vw_trafego_funil_mensal`, `lancamentos_despesa`,
+  `lead_funnel_events`, `v_funnel_by_ad`; nunca ler `ads_performance.leads` (nem o `cpl` dela) nem
+  `config_mensal.leads_totais`; `lancamentos_diarios.ganhos` e `mrr_dia` não são fonte.
+- Fórmulas (:5): ROAS, investimento, CPL, MQL/SQL, comissão (só `comissao-canonica.ts`) e MRR não mudam sem
+  aprovação explícita do Lucas.
+- Páginas protegidas (:113): `/trafego/visao-geral`, `/trafego/relatorios`, `/trafego/relatorio-auto`,
+  `/dre`. Não mudam sem aprovação explícita do Lucas.
+- Datas (:22): leads por `ghl_created_at` em BRT, nunca `created_at`; nunca sobrescreva `mes_referencia`.
+- Atribuição (:29): contrato ↔ `clientes_receita` nunca por `cliente_id`; nunca `tipo_campanha`; nunca OR join
+  em `vw_atribuicao_lead_mes`; `valor_total_projeto` nunca entra em payload.
+- Fontes (:52): nunca some nem costure fontes de no-show ou de receita; comissão nunca migra para
+  `pagamentos_mensais`; nunca filtre `deleted_at` em `clientes_receita` ou `leads_crm`.
+- Time (:80): diretor (`CLOSER_DIRETOR_IDS`) fora de CAC e de rankings; Fernando fora de CAC.
+- CTWA (:119): não remova a síntese atrás de `SINTESE_CTWA_ATIVA`; sem `ad_id`, `ctwa_clid` ou
+  `leadgen_id`, o lead não é de anúncio.
+- Proteções (:83-89):
+  - Não crie backup em `docs/backups/`: a reversão é o histórico da branch.
+  - Mudança de cálculo visível vai em shadow mode: antigo e novo lado a lado por 7 dias.
+  - Compare com `_audit_baseline_metrics_v2` no fim; divergência > 0,5% fora do escopo: pare e reporte.
+  - Soft delete sempre; nunca DELETE físico.
+  - Ambiguidade real: pause e reporte, nunca chute.
+- Engenharia (:90-112):
+  - Leitura de fonte externa nunca devolve array cru: `{ ok: true, … } | { ok: false, falha }`.
+  - Nunca `catch {}` mudo em escrita de monitor; monitor novo nasce com consumidor.
+  - Credencial nova de `process.env` nasce com `?.trim() || undefined` (antigas: ticket 036, não de carona).
+  - Falha de leitura nunca vira 0 nem lista vazia (`count || 0`, `data ?? []`): mostre `'n/d'`.
+  - Card ou ticket com mais de 7 dias: reconfirme a premissa com query antes de agir.
+  - Matview só nasce cadastrada no cron de refresh, na mesma migration.
+  - Nunca `git checkout` de outra branch em worktree; confirme `pwd`, toplevel e branch antes de agir.
+  - Antes de DROP/REPLACE aprovado, cole a definição viva (`pg_get_functiondef`) no relatório.
+  - Teste de guard ou invariante sem controle negativo demonstrado, e relatado, não conta.
+  - Antes de concluir bug de fuso, confira o valor cru da coluna, sem cast.
+  - Baseline nunca medido sobre artefato de build (`.next/`, `next-env.d.ts`).
+  - Função ou migration aplicada em produção entra na `main` no mesmo ciclo.
+- Ticket que toca cálculo, fórmula, página protegida ou tabela C0 cita a seção do CANONICO que leu.
 
 ## Parâmetros da sessão (skill protocolo-sessao)
 | Parâmetro | Valor |
@@ -59,12 +96,10 @@ O loop nunca escreve, por nenhuma via, nas tabelas "dentro". Vale a regra geral
   Lucas.** Leitura roda direto.
 - Migration: escreva o `.sql` em `supabase/migrations/` e pare. Versão livre no **ledger**
   (`supabase_migrations.schema_migrations`), não só na pasta: os dois repos disputam a faixa.
-  O `.sql` aplicado entra na `main` no mesmo ciclo. Proibido DDL pelo editor SQL do Supabase.
+  Proibido DDL pelo editor SQL do Supabase.
 - CREATE-only: nunca ALTER/DROP em objeto existente; coluna nova nullable; view nova com
-  `security_invoker=true` + `REVOKE ALL` de anon/authenticated; matview com UNIQUE INDEX e cadastrada no
-  cron `refresh_trafego_views_hourly` na mesma migration.
-- Antes de DROP/REPLACE aprovado: cole a definição viva (`pg_get_functiondef`) no relatório.
-- Soft delete sempre. Falha de leitura vira `'n/d'`, nunca 0 nem lista vazia.
+  `security_invoker=true` + `REVOKE ALL` de anon/authenticated; matview com UNIQUE INDEX, no cron
+  `refresh_trafego_views_hourly`.
 
 ## Comandos (npm)
 ```bash
@@ -74,18 +109,17 @@ npm run test:integration       # só contra TEST_SUPABASE_URL + TEST_SUPABASE_SE
 npx tsc --noEmit 2>&1 | grep 'error TS' | grep -vc '^\.next/'   # typecheck, sem next-env.d.ts
 npm run build >/dev/null 2>&1 && echo BUILD_OK
 ```
-- Typecheck: **245 erros hoje** (medido em `f3b7892`). **Gate do dia 1: ≤ 246.** Mede-se em árvore limpa
-  (sem `.next/` nem `next-env.d.ts`, que são artefato de build); delta se prova erro a erro, não pelo total.
+- Typecheck: **245 erros hoje** (medido em `f3b7892`). **Gate do dia 1: ≤ 246.** Mede-se em árvore limpa;
+  delta se prova erro a erro, não pelo total.
 
 ## Testes
 - Teste só vale com `node_modules` do `npm ci` deste lockfile. node_modules emprestado não prova nada.
 - A suíte padrão roda sem credencial. Teste nunca lê `.env*` do disco nem usa service role de produção.
-- Teste de guard ou invariante entra com controle negativo demonstrado, e o resultado vai no relatório.
 - Teste que protege decisão do Lucas não se recalcula. Teste preso a regra que mudou se corrige ou sai.
 
 ## Git, integração e deploy
 - `git add` só por pathspec. Antes do commit: `git status` + `git diff --cached --stat`. Um commit por peça.
-- Nunca `--no-verify`, nunca `git checkout` de outra branch numa worktree compartilhada.
+- Nunca `--no-verify`.
 - **Integrador único**: só uma sessão por vez (ou o Lucas) faz merge em `main`, push e deploy, sempre pelo
   `dc-deploy`. Outra sessão entrega a branch (nome + SHA + gate) e para. A integradora abre conferindo
   `git reflog -n 10 main`; merge que ela não fez é para parar e reportar.
@@ -110,8 +144,5 @@ npm run build >/dev/null 2>&1 && echo BUILD_OK
   revisão final, NÃO FAZER), a sessão roda numa worktree `dc-<assunto>` e entrega a branch.
 - **Loop**: ticket na fila (`docs/fila/NNN-*.md`), executado pelo motor em `dc-orq-<id>`, merge na
   `staging-auto`. Lições do loop e incidentes: `docs/orquestrador/PLAYBOOK.md`, no mesmo commit do conserto.
-- Diagnóstico antes de correção: causa raiz confirmada com query real. Card com mais de 7 dias tem a
-  premissa reconfirmada. Ambiguidade real: pausar e reportar, nunca chutar.
-- Mudança de cálculo visível: shadow mode (antigo e novo lado a lado por 7 dias) e comparação com
-  `_audit_baseline_metrics_v2`; divergência > 0,5% fora do escopo é para parar e reportar.
+- Diagnóstico antes de correção: causa raiz confirmada com query real.
 - Prova é saída crua (diff, `cat -n`, resultado de query). Resumo de subagente não valida nada.
````

## Fechamento

```
$ git log --oneline origin/main..HEAD
5737120 docs(claude): proibições do CANONICO pelo nome no CLAUDE.md (P4)
b9dc967 docs(sessao): retrato, status do plano e decisões de 22/10 (DC-0004)
2717248 docs(orquestrador): PLAYBOOK com o seed do kit a001fde e as lições do dashboard
682a8c4 docs(claude): reescreve o CLAUDE.md para a adoção do orquestrador
7ed5e09 docs(canonico): move as regras de domínio do CLAUDE.md para docs/CANONICO.md, byte a byte
$ git diff --stat origin/main..HEAD
 CLAUDE.md                          | 301 +++++++++++++++++--------------------
 docs/CANONICO.md                   | 127 ++++++++++++++++
 docs/orquestrador/PLAYBOOK.md      | 237 +++++++++++++++++++++++++++++
 docs/sessao/ESTADO-ATUAL.md        |  32 ++++
 docs/sessao/STATUS-PLANO.md        |  22 +++
 docs/sessao/decisoes-2026-10-22.md |  41 +++++
 6 files changed, 601 insertions(+), 159 deletions(-)
$ wc -c CLAUDE.md
   11285 CLAUDE.md
$ git status --short
```

Sem push, sem merge. Nada em docs/fila, scripts/, src/, .env ou banco.
