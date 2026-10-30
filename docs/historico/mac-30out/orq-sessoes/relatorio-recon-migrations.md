# Recon de migrations no Comarka OS e inventário dos outros repos (passo 0 com o adendo H e I)

Data: 18/10/2026, 13:58. Só leitura. Nenhuma conexão com banco, nenhum valor de segredo lido (do `.env.local` só os nomes das variáveis), git só com `GIT_OPTIONAL_LOCKS=0`.
Retrato: `main b01d9d5` (12:52), `origin/staging-auto 5f5aecf` (13:54), `origin/staging-apolo 8ab3d2b` (13:53). O loop estava rodando durante a leitura: entre a primeira e a segunda passada entrou mais 1 migration (364 viraram 365). Valem os números da segunda passada.

Arquivos desta sessão em `~/orq-sessoes/recon-migrations/`:
- `arquivos-migrations.tsv`: 365 arquivos de migration, com versão, hora da versão, nome, padrão, branches, primeiro commit, entrada em cada branch, ticket e fila (passo E e adendo H).
- `tickets-migration.tsv`: 863 tickets que citam migration ou tocam `supabase/migrations` (passos D e F).
- `inventario.py`, `casos.py`: os scripts que geram os dois TSV. `inventario.out`, `casos.out`: a saída crua deles.

Nome das etapas do aplicador neste relatório: **MIG-0 a MIG-9**. O M0.5 do plano vira **MIG-0.5**.

---

## Resumo em 10 linhas

1. **Ninguém aplica migration por CLI ou psql.** Não há `supabase` nem `psql` instalados no Mac, e o histórico do shell tem 0 ocorrências de `supabase db push`, `psql` ou `npx supabase`. Os três caminhos que o Lucas citou são, na prática, um só: **`apply_migration` (ou `execute_sql`) do conector do Supabase do claude.ai**, chamado de um chat, de uma sessão do Claude Code no terminal ou pela skill `aplicar-migration-ddl`. Por isso 448 de 491 versões são a hora da aplicação.
2. **O executor do loop não consegue aplicar hoje**, mas a única barreira é a allowlist de permissões do `claude -p`. O conector **carrega** no headless: 5044, 5045 e 5048 tentaram `list_projects` e foram negados, e 475 tentou `execute_sql` e foi negado. Não há `--strict-mcp-config` nem `--settings` na chamada (`executor.sh:573-577`).
3. Boa parte do plano já existe em forma artesanal, criada entre 17 e 18/10: nome do arquivo como versão canônica com o ledger ajustado depois (MIG-0.5), classificador expansão/contração (`checar-promocao.py --classificar`, MIG-1/MIG-8), espera por token `humano:migration-<id>-aplicada` sem bloquear (MIG-2) e trava de schema na promoção que lê o banco vivo.
4. **A trava real não aparece nos runs como erro de banco.** As 3.716 linhas "does not exist" dos runs de 14 dias são todas de mocks de teste (`os_audit_log`, `clientes.notion_id`). Nenhum gate do motor consulta o banco.
5. A trava aparece como **espera humana**. Agora há **15 tickets pendentes** parados porque falta um token de migration, 2 deles atrás de SQL que já está pronto (1332 e 5215). Em 14 dias foram 122 tokens de migration liberados à mão, 62 só em 17/10, em 28 commits no `liberacoes.json`.
6. O segundo custo é a **divergência de versão entre o arquivo e o ledger**: 38 commits de renome ou alinhamento em 14 dias, 4 pausas da fila por `publicar.sh` de migrations e 1 bloqueio por teste com caminho fixo (5202, consertado pelo 5206).
7. Repo x banco: 272 arquivos em `supabase/migrations` (na união das três branches) contra 491 versões no ledger. Mais 91 arquivos legados em `migrations/` (sem versão) e 36 com versão de 8 dígitos (13 deles repetem `20260612`).
8. Código e schema no mesmo ticket é raro: só **9 tickets** tocam `supabase/migrations` e `src/` juntos. Dependência só por migration é comum: **140 tickets** dependem de token humano de migration (109 tokens distintos).
9. **O dashboard-comercial usa o mesmo banco** (`ogfnojbbvumujzfklkhh` fixo no `src`) e tem 93 + 113 arquivos de migration próprios. Para o aplicador, ele não é "outro repo": divide o mesmo ledger. O conteudos-infinitos usa outro banco (`vcmkssdnqandxseglhee`) e numeração sequencial de 4 dígitos.
10. A frente paralela (P1 a P9, S1 a S17) não tem peça de migration. Ela encosta em 6 pontos: S3 (camada 9 do validador = schema vivo), P6/S5 (`liberacao_ok`), P7/S15 (chamada endurecida), P8/S10 (juiz no `orq-runner` parado), S12 e S13 (guarda).

---

## 1. Pergunta, resposta, arquivo:linha (A a I)

### A. Onde nascem

| Pergunta | Resposta | Evidência |
|---|---|---|
| Pastas com migration (fora de node_modules e .git) | `supabase/migrations` (253 na main, 263 na staging-auto, 261 na staging-apolo; 272 na união), `supabase/migrations/perf` (1), `supabase/migrations_descartadas` (1), `migrations/` na raiz (91, legado), `supabase/reversao` (2 `.reverter.sql`), `supabase/conferencia` (1), `docs/fila/runs/ddl-13out` (4 cópias), `docs/specs/sql` (22 rascunhos), `sql/` (1) | `find` e `git ls-tree` (seção 2.1) |
| Padrão de nome | Atual: `AAAAMMDDHHMMSS_nome.sql`. Legado de maio a setembro: `AAAAMMDD_nome.sql` (36). Na raiz: `migration-*.sql` sem versão (91) | `inventario.out` |
| Segundos 00 x hora real | 148 com segundos ≠ 00 (versão = hora da aplicação, ou arquivo renomeado para ela) e 90 com segundos 00 (horário inventado na escrita). Dos 51 arquivos novos em 14 dias, 47 têm segundos 00 | `inventario.out` |
| Sem os 14 dígitos no começo | 127: os 91 de `migrations/` e 36 com 8 dígitos (35 em `supabase/migrations` e 1 em `perf/`; bate com as "35 antigas" do 1353) | `inventario.out`, lista completa |
| Versões repetidas | `20260612` ×13, `20260620` ×4, `20260628` ×4, `20260525` ×3, `20260602` ×3, `20260626` ×2 e **`20260817000000` ×2** (`employees_senha_scrypt` e `os_audit_log`) | `inventario.out` |
| Nomes repetidos | `nps_coleta` (`20260612_` e `20260818000000_`). O `os_audit_log` repetido que o chat viu na produção casa com a versão `20260817000000` duplicada no repo | `inventario.out` |
| Guarda de nome | `test/migrations-versao.test.ts` (ticket 1353) existe **só na staging-auto**; congela as 35 fora do padrão e a versão repetida | `git ls-tree` por branch; `docs/fila/1353-*.md` |
| Quantas por fila em 14 dias (04 a 18/10, primeiro commit em qualquer ref) | **51**: Apolo 31, Comarka 18, sem ticket 2. Por dia: 17/10 = 19 e 18/10 = 17 | `inventario.out` |

### B. Quem aplica e como (com o adendo H na seção H)

| Pergunta | Resposta | Evidência |
|---|---|---|
| O executor headless pode aplicar? | **Não, por permissão.** A allowlist não tem nenhuma ferramenta MCP (`executor.sh:61`). A lista negada inclui `psql`, `supabase`, `npx supabase` e `curl` (`executor.sh:63`). O prompt proíbe (`executor.sh:104-105`). Em `-p`, ferramenta fora da allowlist é negada | `scripts/orquestrador/executor.sh:61,63,104-105,573-577` |
| O conector do Supabase está habilitado no headless? | **Sim, carrega.** A chamada não passa `--strict-mcp-config` nem `--settings`, então o conector do claude.ai vem junto. Prova: 5044/5045/5048 (15/10) "list_projects negado por permissão" e 475 (19/09) "execute_sql ... negado" | `runs/5044/attempt-1/claude-output.txt:10`, `runs/5045/attempt-1/claude-output.txt:6`, `runs/5048/attempt-1/claude-output.txt:1`, `runs/475/attempt-2/claude-output.txt:15` |
| `.mcp.json` | Não existe no Comarka. `~/.claude.json` tem `mcpServers` vazio (global e projeto). O conector vem da conta do claude.ai | `ls .mcp.json`; `~/.claude.json` |
| `.claude/settings*.json` | `settings.json:12`: hook `guarda-ferramenta.py` em `Bash\|Read\|mcp__.*__(execute_sql\|apply_migration)`. `settings.local.json:4,7` libera `mcp__plugin_supabase_supabase__execute_sql/apply_migration`, mas o plugin do Supabase **não está instalado** (só vercel e hostinger) e o arquivo não é versionado, então não vai para as worktrees. `~/.claude/settings.local.json:4` libera `mcp__claude_ai_Supabase__execute_sql`, mas é o "local" do projeto `~`, que não vale nas worktrees (o 475 foi negado depois de 12/08, data do arquivo) | arquivos citados |
| A guarda barra aplicação? | **Só em C0.** `execute_sql` ou `apply_migration` que não toca tabela C0 passa (`return None` quando não há achado) | `.claude/hooks/guarda-ferramenta.py:224-241` |
| O enforcement barra? | Só no diff: linha nova com `apply_migration\|supabase db push\|psql\|execute_sql`. Não olha o que o agente executou | `scripts/orquestrador/enforcement-core.ts:189-190,231-233` |
| `proibicoes_absolutas` | "nunca aplicar DDL (só escrever .sql em supabase/migrations/)" | `docs/fila/000-config.json:111` |
| Regra escrita | "Nunca aplique migration" com a exceção da skill | `CLAUDE.md:8`; `.claude/rules/banco.md:33-34` |
| Algum ritual ou script aplica? | **Nenhum.** `publicar.sh` e `ritual-staging.sh`: 0 menções a migration, DDL ou supabase. `promover-plataforma.sh` e `promover-apolo.sh` **não aplicam**: rodam a trava e imprimem "aplique pela skill" | `promover-plataforma.sh:157-164,221-222`; `promover-apolo.sh:40-41,251-259,323-324` |
| Quem aplica com regra | A skill `aplicar-migration-ddl` (só quando o Lucas digita): mostra o SQL, roda `apply_migration` depois do ok, depois `update supabase_migrations.schema_migrations set version=<arquivo>` e confere com `list_migrations` | `.claude/skills/aplicar-migration-ddl/SKILL.md:14,22-28` |
| `orq-runner` | Worktree de execução em `_worktrees/orq-runner`, detached em `3037d25` (11/10). O `.env.local` é link para o do principal. Não tem `.claude/settings.json` nem hooks (só `rules` e `skills`). O executor não roda o claude nele (roda na worktree do ticket, que nasce da staging-auto com hook), mas o juiz roda (P8/S10) | `ls -la`, `git -C orq-runner log -1` |

### C. Como o motor trata

| Pergunta | Resposta | Evidência |
|---|---|---|
| Menções a migration no motor | O prompt proíbe aplicar; o enforcement acha aplicação no diff; `lib.sh` lê `migrations_dir` e `liberacoes_file`; `orq-granularidade.py` marca "G migration + codigo no mesmo ticket" | `executor.sh:104`; `enforcement-core.ts:8,190`; `lib.sh:62-64`; `orq-granularidade.py:78,171-173` |
| Gates que consultam o banco | **Nenhum gate do loop.** Os gates são tsc, vitest e build (`000-config.json`, `gates`). O critério com `localhost` sobe `npm run dev` na :3004 com o `.env.local` (banco de produção), então um critério HTTP pode bater no banco | `executor.sh:190-208,247` |
| Quem lê o banco fora do loop | `validar-fila.py` camada 9 "schema vivo" (`colunas_escritas` contra `information_schema` ou OpenAPI do PostgREST; WARN porque `REGRAS_NOVAS_COMO_ERRO = False`). `checar-promocao.py` (snapshot de colunas, funções, únicos e **ledger** pela API de gestão com `SUPABASE_ACCESS_TOKEN`; fail-closed) | `validar-fila.py:75,1113-1118,1206-1242`; `checar-promocao.py:28,38-52,248-275` |
| Schema ausente no banco: o que acontece | Os gates não percebem: os testes mockam o Supabase e o código tem fail-safe `503 aguardando_migration` (`test/audit.test.ts`). O ticket aprova e mergeia na staging. A falta aparece **na promoção**: `checar-promocao.py` BLOQUEIA com rc=1 ("código pedindo o que o banco não tem") | `promover-plataforma.sh:158-164` |
| Se um critério HTTP falhar por schema | Vira `reprovado` (gasta tentativa). `max_retries`=2, então até 3 tentativas. Motivo idêntico na 2ª dispara o circuit breaker e o ticket fica `bloqueado` com nota "motivo repetido: provável defeito de spec/harness". Se o mesmo gate reprovou o ticket anterior, a fila **pausa** (gate_streak) em vez de bloquear | `executor.sh:774-817`; `000-config.json` `max_retries` |
| Ticket que espera schema | Fica `pendente` e **não é selecionado** enquanto `humano:migration-<id>-aplicada` não estiver em `liberacoes.json`: log "dep pendente", zero tentativa, zero bloqueio | `lib.sh:154-167`; `.claude/rules/fila.md:32-35` |

### D. Casos reais de trava

Ver seção 3. Números: 863 tickets citam migration (o texto é largo porque quase todo ticket traz "nunca aplique migration"). **186 tocam `supabase/migrations` na allowlist**. 81 dos 863 já estiveram `bloqueado` ou `refatiar` no histórico do git, 48 estão `obsoleto` e 227 tiveram mais de 1 tentativa (não é tudo por migration). Nos runs de 14 dias: "does not exist" 4.681 linhas, "relation" 4.689, "column" 1.540, "migration" 17.893. **Das linhas `relation/column ... does not exist`, 3.716 estão em `gate-vitest.txt` e são todas de mocks.** Nenhuma está em `criterios.txt`, `dev-server.txt` ou `verdict.json` como erro de banco. A medição `intervencoes.csv` (14d) tem 65 de 333 linhas ligadas a migration/DDL/ledger. O resolvedor tem 9 linhas, todas pausa de `publicar.sh` de migrations ou falso positivo. Commits `Orq-Vigia`: 0.

### E. Repo x banco

`~/orq-sessoes/recon-migrations/arquivos-migrations.tsv` (365 linhas e cabeçalho). Colunas: `arquivo, pasta, versao, versao_hora, nome, padrao, branches, add_commit, add_data, staging_auto_data, staging_apolo_data, main_commit, main_data, ticket, fila, assunto`. As datas estão em horário local (-03), e `versao_hora` é a versão lida como horário (o ledger está em UTC).

### F. Mistura de código e schema

| Pergunta | Resposta | Evidência |
|---|---|---|
| Tickets que tocam `supabase/migrations` e `src/` no mesmo ticket | **9** (8 done, 1 pendente) de 186 que tocam migration | `casos.out` |
| Tickets que dependem de outro só por migration | **140** dependem de token humano de migration (`humano:migration-*`, `ddl-*`, `*-aplicada`; 109 tokens distintos). **160** dependem de ticket cuja allowlist (fora test/docs) é só migration. 235 têm um dos dois | `casos.out` |
| Agora | 15 pendentes com token de migration faltando (lista na seção 3) | `liberacoes.json` cruzado com os tickets |
| Regra | Regra de 18/10: código depende de `humano:migration-<id>-aplicada`, nunca só do id do ticket SQL; contração nunca no mesmo ticket que o código. A família `migration#-aplicada` é a dependência humana mais comum (106) | `.claude/rules/fila.md:32-35` |

### G. Outros repos (só inventário)

| Repo | Pastas e quantidade | Ferramenta | project_id | Observação |
|---|---|---|---|---|
| dashboard-comercial (`befa44a`, 19/09; última migration em 09/09) | `supabase/migrations` 93 (1 só com 14 dígitos, o resto `AAAAMMDD_`), `migrations/` 113 (`migration-*.sql`), `scripts/migrations` 2, `docs/migrations` 1, `docs/migrations-propostas` 1 | SQL puro + `@supabase/supabase-js` (sem prisma/drizzle) | Sem `supabase/config.toml` nem `.temp/project-ref`. URL **`ogfnojbbvumujzfklkhh.supabase.co` fixa em `src`**: o mesmo banco do Comarka. O `.env.local` também tem `SUPABASE_FTMTMZ_*` (outro projeto, só o nome) | Divide o ledger com o Comarka |
| conteudos-infinitos (`e1541e2`, 14/10) | `supabase/migrations` 35, numeração `0001_` a `0035_` | SQL puro + supabase-js | Sem `config.toml`. `docs/adr/0005-...md` cita `vcmkssdnqandxseglhee`. O `.env.local` tem `SUPABASE_PROJECT_REF` (valor não lido) | ADR-0005: arquivo e parada; aplicação humana via MCP com `get_advisors` depois; status `aguardando_acao_humana`; migration sempre em ticket sozinho |
| (kit, para referência) `orquestrador-kit 85c49a6` | — | — | — | Já tem `migrations.dir`, `migrations.faixa` e `faixas_reservadas` (numeração por faixa do Actus) e `liberacao_ok` com três formatos de token (`lib.sh:605-615`; `config-chaves.ts:102-104`). `aguardando_acao_humana` só aparece em config de fixture, não no código |

### H. Caminhos de aplicação no `ogfnojbbvumujzfklkhh`

| Caminho | Ferramenta | De onde | Versão gravada | Confere antes o que já foi aplicado? | Evidência |
|---|---|---|---|---|---|
| 1. Lucas "pelo terminal" | **Não é CLI.** Sem `supabase`, `psql`, docker ou postgres instalados; 0 ocorrências no histórico do zsh e do bash. Na prática é uma sessão do Claude Code no terminal chamando o conector (caminho 3) ou o editor SQL do painel | Mac do Lucas | Conector: hora da aplicação. Editor SQL: **nenhuma linha no ledger** | Não | `which`, `grep -c` no histórico; 9 notas de liberação sem "MCP" (ex.: `ddl-1050-aplicada`, `ddl-auditoria-dupla`) |
| 2. Chats do claude.ai com o conector | `mcp__claude_ai_Supabase__apply_migration` / `execute_sql` | claude.ai (fora do repo) | `apply_migration` grava a hora da aplicação (UTC); `execute_sql` com DDL **não grava nada** | Só se o chat lembrar; nada mecânico. A guarda do repo não vale ali | Nota `migration-5181-aplicada`: "aplicada 17/10 14h26-14h30 via MCP pelo chat (Lucas autorizou)" |
| 3. Sessões do Claude Code no repo | Skill `aplicar-migration-ddl`, ou `apply_migration` direto com ok no prompt de permissão | Checkout principal ou worktree | Hora da aplicação; desde 17/10 a skill roda `update ... set version = '<versão do arquivo>'` no mesmo ok | **Sim, na skill:** passo 0 `checar-promocao.py --aplicar` (lê o ledger e o schema, bloqueia contração que quebra código vivo); passo 3 confere que a versão do arquivo não existe no ledger; passo 4 `list_migrations` | `SKILL.md:14,22-28`; nota `migration-5223-aplicada`: "via apply_migration com ok do Lucas; ledger alinhado ao nome do arquivo" |
| 4. Loop (executor headless) | Nenhum hoje; conector carregado e negado por permissão | worktree do ticket | — | — | seção B |
| Trava de leitura (não aplica) | `checar-promocao.py` via API de gestão (`POST /v1/projects/<ref>/database/query`) com `SUPABASE_ACCESS_TOKEN`, presente no `.env.local` (só o nome lido). Esse mesmo token **executa qualquer SQL, DDL inclusive**: é o caminho natural de um aplicador sem MCP | promover-*.sh, skill | — | Lê `schema_migrations` no snapshot | `checar-promocao.py:38-52,254-275` |

Medição das notas em `liberacoes.json` (tokens `migration-*`/`ddl-*` com `em` ≥ 04/10): 122 tokens, **99 com "via MCP" ou "apply_migration"** na nota, 9 sem MCP. Todas `por: lucas`. Por dia: 15/10 = 11, 16/10 = 12, **17/10 = 62**, 18/10 = 16.

**O conector está em modo só leitura?** Não há configuração dele em arquivo nenhum (`.mcp.json` não existe, as settings só têm permissões, o `orq-runner` não tem settings). Ele vem da conta do claude.ai. A lista de ferramentas que ele expõe nesta própria sessão inclui `apply_migration`, `create_branch`, `deploy_edge_function`, `pause_project` e `create_project`: pela lista, **não está em só leitura** (o modo `read_only` do servidor do Supabase não expõe as ferramentas de escrita). Conferir no painel do conector.

**Arquivo x hora da aplicação (commits; a lista da produção vem do chat):**
- A coluna `add_data` é o primeiro commit do caminho em qualquer ref, e `main_data`, `staging_auto_data` e `staging_apolo_data` dizem quando ele entrou em cada branch. Atenção: arquivo renomeado aparece com a data do commit de renome.
- Distância entre a hora da versão (lida como UTC) e o primeiro commit, em `supabase/migrations`: com segundos ≠ 00, n=58, mediana 6,6 h, 10 com mais de 24 h. Com segundos 00, n=86, mediana 3,5 h, 3 com mais de 24 h. Nenhum caso de versão mais de 24 h no futuro.
- **Arquivo entrou bem depois da aplicação provável:** 8 arquivos de maio e junho entraram todos no commit `e761deb` (03/07): de 225 a 1.160 h depois (`20260515202549_liga_missoes_streaks` ... `20260623193215_ia_prompts_piloto_dossie`). Mais `20260825000004/5` (26 h e 27 h).
- **Arquivo antes da aplicação:** é o fluxo normal desde 16/10 (o `.sql` nasce no ticket com segundos 00 e a aplicação vem horas depois). O cruzamento com o ledger fica para o chat: `versao` do TSV contra `version` da produção, e `add_data` contra a versão gravada.

### I. Frente paralela (plano revisado, sugestões e etapa 8a)

Nenhuma peça trata migration. Pontos de contato:

| Item | O que é | Relação com MIG | Recomendação |
|---|---|---|---|
| **S3** (sugestões) | Camadas 6, 7, 9, 13 e 14 do `validar-fila` como erro para ticket novo | A **camada 9 é "schema vivo"** (`colunas_escritas` contra o banco). É o validador na entrada do MIG-1 | MIG-1 reaproveita a camada 9; não criar outro validador de colunas. Combinar quem promove a 9 para erro |
| **P6 / S5, S6** | `liberacao_ok` ler `liberadas[]` e `tokens[]`; dependência de `obsoleto` resolvida | O MIG-2 vive de token `humano:migration-*` | MIG-2 depois de S5, sem mexer em `liberacao_ok` em paralelo |
| **P7 / S15** | Chamada endurecida: `--permission-mode dontAsk`, `--settings` do motor, modelos fixos | Falta o item que o MIG precisa: **`--strict-mcp-config`** (ou desligar o conector do claude.ai no executor e no juiz) | Entrar como linha a mais na P7, não como peça MIG |
| **P8 / S10** | O juiz roda no `orq-runner`, parado em `3037d25` (11/10) | O juiz do MIG-4 não pode herdar isso | MIG-4 usa o juiz consertado pela P8 |
| **S12** | `promover-plataforma.sh` em `SCRIPTS_DO_LUCAS` da guarda | Os promover-*.sh já rodam a trava de schema | Sem colisão; o MIG-5 vai pedir a mesma proteção para o script aplicador |
| **S13** | Guarda bloquear Grep em `.env*` | O aplicador vai usar `SUPABASE_ACCESS_TOKEN` do `.env.local` | Coerente: o aplicador lê o token por código, nunca o modelo |
| **P1** (C11 v2 híbrida, etapa 8a) | Teste acoplado que cita arquivo da allowlist, migrations inclusive | O 5202 caiu por teste com caminho fixo de migration | Sem duplicar; a decisão "nome do arquivo nunca muda" (17/10) elimina a causa |
| **C11** | Regra de gate do kit (teste citado) | Nome ocupado | As etapas são MIG-0 a MIG-9, como pedido |

---

## 2. Números, comandos e saída crua

### 2.1 Pastas e contagens
```
$ for d in migrations supabase/migrations supabase/migrations_descartadas sql; do echo "== $d: $(find $d -type f | wc -l)"; done
== migrations: 91 | supabase/migrations: 254 (253 + perf/) | supabase/migrations_descartadas: 1 | sql: 1
$ find . -path ./node_modules -prune -o -path ./.git -prune -o -name '*.sql' -print | sed 's|/[^/]*$||' | sort | uniq -c
 253 ./supabase/migrations   91 ./migrations   22 ./docs/specs/sql   4 ./docs/fila/runs/ddl-13out
   2 ./supabase/reversao      1 ./supabase/migrations/perf  1 ./supabase/migrations_descartadas
   1 ./supabase/conferencia   1 ./sql  1 ./scripts/mapa  1 ./docs/port  1 ./docs/backups  1 ./docs  1 .
$ for b in main origin/staging-auto origin/staging-apolo; do git ls-tree --name-only $b supabase/migrations/ | grep -c '\.sql$'; done
main: 253   origin/staging-auto: 263   origin/staging-apolo: 261
```

### 2.2 `python3 -I inventario.py` (trecho de `inventario.out`)
```
arquivos (uniao main+staging-auto+staging-apolo): 365
por pasta: {'migrations': 91, 'supabase/migrations': 272, 'supabase/migrations/perf': 1, 'supabase/migrations_descartadas': 1}
por padrao: {'sem_prefixo': 91, '14dig_ssNN': 148, '8dig': 36, '14dig_ss00': 90}
versoes repetidas em supabase/migrations: {'20260525': 3, '20260602': 3, '20260612': 13, '20260620': 4, '20260626': 2, '20260628': 4, '20260817000000': 2}
nomes (sem versao) repetidos: nps_coleta -> ['supabase/migrations/20260612_nps_coleta.sql', 'supabase/migrations/20260818000000_nps_coleta.sql']
adicionadas desde 2026-10-04 (primeiro commit, qualquer ref): 51
  por fila: {'comarka': 18, 'sem_ticket': 2, 'apolo': 31}
  por dia: {'10-05': 1, '10-06': 1, '10-08': 2, '10-10': 2, '10-12': 2, '10-14': 3, '10-16': 4, '10-17': 19, '10-18': 17}
  por padrao: {'14dig_ss00': 47, '14dig_ssNN': 4}
H: horas entre versao (nome, lida como UTC) e primeiro commit; n = 144
  14dig_ssNN: n=58 mediana=6.6h  >+24h=10  <-24h=0
  14dig_ss00: n=86 mediana=3.5h  >+24h=3  <-24h=0
```

### 2.3 `python3 -I casos.py` (`casos.out`)
```
tickets parseados: 1590 {'comarka': 1422, 'hold': 1, 'apolo': 167}
citam migration (texto) ou tocam supabase/migrations: 863
  por status: {'done': 779, 'obsoleto': 48, 'pendente': 34, 'em_execucao': 2}
tocam supabase/migrations (allowlist): 186 {('comarka','done'): 71, ('comarka','obsoleto'): 10, ('comarka','pendente'): 4, ('apolo','done'): 94, ('apolo','pendente'): 6, ('apolo','em_execucao'): 1}
F1 tocam supabase/migrations E src/ no mesmo ticket: 9 | por status: {'done': 8, 'pendente': 1}
F2 dependem de token humano de migration: 140 | tokens distintos: 109
F2 dependem de ticket que so entrega migration: 160
F2 qualquer um dos dois: 235
ja estiveram bloqueado/refatiar (git): 81
obsoletos: 48 | tent>1: 227
familias de dep humano (top): migration#-aplicada 106, decisao-D# 64, decisao-chave-oficial-cliente-id 48, mockups-ficha-na-staging 34, apolo#-na-main 31, apolo-schema-exposto 28, ...
```

### 2.4 Runs de 14 dias
```
$ find docs/fila/runs -type f -mtime -14 ! -name local-loop.log ! -name launchd-agent.log | wc -l     -> 12638
padrão                               | linhas | arquivos
does not exist                       |  4681  |  954
relation                             |  4689  |  958
column                               |  1540  | 1062
migration                            | 17893  | 3177
relation "[^"]*" does not exist      |  2810  |  943
column [^ ]* does not exist          |   929  |  929
PGRST20[0-5]|42P01|42703|PGRST116    |    22  |   16
$ grep -Eio 'relation "[^"]*" does not exist|column [^ ]* does not exist' ... | por arquivo
3716 gate-vitest.txt   10 diff.raw   10 avaliador-prompt.txt   3 prompt.txt
mensagens: 2787 relation "os_audit_log" (test/audit.test.ts, mock "tabela ausente → 503 aguardando_migration")
           929 column clientes.notion_id (test/acoes-recomendadas-chave.test.ts, mock 42703)
           14 "y", 4 "despesas", 2 "x", 2 "client_interaction_records", 1 "perf_insights_daily"
em criterios.txt / dev-server.txt / verdict.json / meta.json: só 892/attempt-1 (aprovado; citação no veredito)
```

### 2.5 Liberações e alinhamento de ledger (14 dias)
```
$ git log main --since=2026-10-04 -- docs/fila/liberacoes.json | grep -Eic 'migration|ddl|aplicad'   -> 28 commits
tokens migration/ddl com em >= 04/10: 122 {10-05:3, 10-07:1, 10-08:3, 10-11:5, 10-12:2, 10-13:3, 10-14:4, 10-15:11, 10-16:12, 10-17:62, 10-18:16}
notas com "via MCP"/apply_migration: 99 | sem MCP: 9
$ git log --all --since=2026-10-04 --format='%h %ci %s' | grep -Ei 'ledger|renomead|alinha nome' | sort -u | wc -l   -> 38
resolvedor/ledger.jsonl com migration|schema|ddl: 9 (4 pausas "publicar fix/migrations-1100-1110-versao", "fix/migrations-versao-ledger", "spec-migrations-5043-5048", "ledger-canonico-1710")
```

### 2.6 Ferramentas no Mac
```
$ which supabase psql docker postgres pg_ctl   -> not found (todos)
$ grep -a -c '<padrão>' ~/.zsh_history ~/.bash_history   (supabase db push | supabase migration | npx supabase | psql | supabase link | db execute) -> 0 em todos
$ grep -o '^[A-Z_]*=' .env.local  -> contém SUPABASE_ACCESS_TOKEN, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL; não contém SUPABASE_DB_URL
```

---

## 3. Casos reais de trava (até 10)

| # | Ticket | Data | Motivo | Tempo parado | Como destravou |
|---|---|---|---|---|---|
| 1 | **1332 → 1329, 1334** (agora) | 17/10 23:52 (`.sql` pronto) | A migration criava a chave nova do NPS e derrubava a antiga numa só, e o job da main usa a antiga: nenhuma ordem de aplicação funciona. O 1363 separa em expansão e contração, e ele mesmo espera `humano:promocao-segura-publicada` | Mais de 15 h e contando (1329 e 1334 pendentes) | Ainda parado. A contração `20261019000100` (commit `0e7f235`) já está na staging |
| 2 | **5215 → 5216, 5217, 1311** (agora) | 18/10 13:39 (done) | Esperam `humano:migration-5215-aplicada` | Mais de 1 h e contando | Ainda parado |
| 3 | **cadeia 5199/5208/5209/5210/5226/1374/1375 → 1267, 1269, 1305, 1307, 1309, 1325, 1375, 1376, 5200** (agora) | 17 e 18/10 | Os tickets SQL ainda estão pendentes ou `em_execucao`; os de código esperam a aplicação de cada um, em série | Indeterminado | A fila não anda sem o ciclo "aplica, libera token" |
| 4 | **5202** (bloqueado → 5206) | 17/10 ~21:00 | O teste do eventos v2 lia a migration por um caminho fixo; o renome para a versão do ledger quebrou o teste na promoção | ~35 min | 5206 (`8b44e97`): o teste acha a migration pelo sufixo. Daí a decisão de 17/10 de nunca renomear (`522f37c`) |
| 5 | **898** | 08/10 13:47 → 21:10 | 5 reprovas: o corpo da migration divergia da spec (faltava `on delete cascade/set null`). Depois do done, a migration foi renomeada para a versão aplicada (`676ca51`, 09/10) e o token `ddl-898` foi liberado à mão (`628472d`) | ~7,5 h, 6 tentativas | Lucas aplicou via MCP às 18h14, conferiu e liberou |
| 6 | **407a** | 29/09 → 02/10 | 8 tentativas. O critério exigia timestamp maior que o do 691 com nome de migration fixo: impossível (medição #14) | ~3 dias | Lucas `0bf46f8`: renomeia e compara com `ls-tree origin/staging-auto` |
| 7 | **739** | 03/10 17:21 → 06/10 17:10 | Faltava a FK com DDL; o T2 caiu no enforcement; critério contava comentários fora da allowlist (medição #19) | ~72 h | FK aplicada à mão (`113647b`/`7f8e543`, renome para o ledger), token `ddl-penalizacoes-fk` (`bb70829`) |
| 8 | **760** | 05/10 15:10 → 17:25 | Base vermelha: `test/migrations-policy-idempotente.test.ts:212` quebrou com o renome de uma migration já aplicada (`8e8b525`, "alinha nome ao ledger") | ~2,2 h, 3 tentativas | `ea77243`: guarda `pg_policies` na migration da base |
| 9 | **306b** | 19/09 → 24/09 | O enforcement barrou a migration de origem fora da allowlist; depois esperou `humano:ddl-306b0` | ~5 dias, 5 tentativas | `41697c8` reescreveu; token liberado depois |
| 10 | **335b** | 08/09 21:19 → 09/09 15:32 | Gravava estado novo sem `supabase/migrations/**` na allowlist; o enforcement barrou (`PLAYBOOK.md:763`) | ~18 h, 6 tentativas | `e944a82` Lucas ampliou a allowlist |

Padrões que se repetem, fora da tabela:
- Pausa manual "para aplicar migration": 23 episódios e 71 h na medição até 10/10 (`medicao-comarka.md:181`).
- 4 pausas da fila por `publicar.sh` de migrations entre 14 e 18/10 (resolvedor).
- 38 commits de renome ou alinhamento de ledger em 14 dias.

---

## 4. O que faz e o que não faz sentido (MIG-0 a MIG-9)

| Etapa | Veredito | Por quê, com o que já existe |
|---|---|---|
| **MIG-0** corpus e inventário | **Faz.** Metade está feita aqui | Falta cruzar o TSV com as 491 versões da produção. Esperado: cerca de 200 versões **sem arquivo** (272 arquivos contra 491 versões, mais aplicações por `execute_sql` ou editor SQL que não deixam linha nenhuma). O corpus precisa incluir `migrations/` da raiz e as migrations do dashboard-comercial, que mexem no mesmo banco (`PLAYBOOK.md:785,891`: DDL legada fora de `supabase/migrations`) |
| **MIG-0.5** versão única | **Faz, mas a decisão já foi tomada.** Falta mecanizar e fazer o backfill | A regra de 17/10 (arquivo = versão canônica, ledger ajustado) já está na skill (`SKILL.md:23-28`) e em `banco.md:36`. A guarda estática (1353) está só na staging-auto. O que falta: (a) o aplicador gravar a versão do arquivo **na hora**, e não `apply_migration` seguido de `UPDATE`; (b) decidir o passado (448 versões com a hora da aplicação e 18 nomes divergentes); (c) a "versão" vem do config por repo (o conteudos-infinitos usa `0001`, o Actus usa faixas) |
| **MIG-1** classificador com parser e validador na entrada | **Faz, partindo do que existe** | `checar-promocao.py --classificar` já classifica expansão/contração por cabeçalho e regex. Falta um parser de verdade (corpo plpgsql, `DO $$`, `begin/commit`, GRANT/REVOKE, policy, `SECURITY DEFINER`). O validador na entrada já existe: é a camada 9 do `validar-fila` (WARN); casar com a S3. As classes A/B/C têm de ser compatíveis com a `-- fase:` obrigatória a partir de 20261019 |
| **MIG-2** `requer_migration` e espera `AGUARDA_MIGRATION` sem bloquear | **Faz pouco sentido como estado novo; faz como automação** | A espera sem bloquear **já existe**: dependência `humano:migration-<id>-aplicada` e `liberacao_ok` pulando o ticket sem tentativa (`lib.sh:154-167`). A dor está na emissão do token: 122 tokens à mão em 14 dias. O MIG-2 útil é "token emitido pelo aplicador quando o ledger mostra a versão", mais visibilidade no painel. `requer_migration` como campo pode substituir a convenção de nome do token, mas aí é preciso migrar 140 tickets. Depende da P6/S5 |
| **MIG-3** ensaio descartável, drift e estatísticas | **Drift e estatísticas fazem; o ensaio exige decisão** | Drift e estatísticas são leitura e cabem no caminho que já existe (API de gestão com `SUPABASE_ACCESS_TOKEN`, como no `checar-promocao.py`). O ensaio esbarra em três coisas: não há docker nem postgres no Mac; o branching do Supabase custa (choca com "nunca gastar dinheiro"); e não há `SUPABASE_DB_URL` para `pg_dump --schema-only`. Opção sem custo: PGlite (Postgres em WASM, via npm) com o schema reconstruído do snapshot, ainda a validar com extensões (vector, pg_cron). Sem uma linha de base, o ensaio de um repo com cerca de 200 versões sem arquivo não reproduz a produção |
| **MIG-4** juiz e sombra | **Faz** | Sombra = o aplicador propõe e decide, o humano aplica pela skill, e compara-se. Há volume para calibrar: 62 aplicações num dia. O juiz depende da P8 (`orq-runner` parado em 11/10) |
| **MIG-5** o motor aplica com aprovação de um comando | **Faz, e é o maior ganho por esforço** | Substitui os 5 passos da skill: trava, SQL, aplicação, versão e token. Precisa de: caminho de execução fora do modelo (script com a API de gestão, numa transação, gravando a versão do arquivo); a guarda reconhecer o script (como a S12); e `--strict-mcp-config` no executor e no juiz, para que o único caminho de escrita seja o aplicador |
| **MIG-6** classe A no automático | **Faz, com classe A estreita** | Candidatos: `create table`/`create function`/`create index` em objeto **novo** de schema próprio (o `inteligencia` foi 31 das 51 novas em 14 dias), coluna nullable sem default. Fora da A: GRANT para anon/authenticated (20 na produção), policy (97), `SECURITY DEFINER`, qualquer coisa em C0. "140 CREATE INDEX sem CONCURRENTLY" não é defeito em si (`apply_migration` roda em transação, onde CONCURRENTLY nem é aceito); o risco depende do tamanho da tabela, que sai das estatísticas do MIG-3 |
| **MIG-7** classe B | **Faz depois do MIG-6** | Precisa da sombra do MIG-4 com taxa de acordo medida |
| **MIG-8** classe C via expand/contract | **Já tem regra e trava; falta o gatilho** | `banco.md:47-55` e a promoção já listam "contração para aplicar agora". O MIG-8 é aplicar a contração quando o código que a dispensa chega à main (`-- depois-de:`), com a checagem `--aplicar`. 32 migrations da produção perdem dado: são estas |
| **MIG-9** outros repos | **Reordenar: o dashboard-comercial entra no MIG-0, não no MIG-9** | O dashboard grava no mesmo banco e no mesmo ledger. O aplicador tem de ser **por banco** (`project_id`), não por repo. O conteudos-infinitos é outro banco, com numeração sequencial e ADR-0005 já alinhado ao fluxo (arquivo, parada, aplicação humana, `get_advisors`); ele é o candidato natural para validar a generalidade do kit |

Ordem que os dados sugerem: MIG-0 (com o dashboard) → MIG-0.5 (backfill + aplicador gravando a versão do arquivo) → **MIG-5 em modo manual** (um comando faz o que a skill faz, e emite o token: isso já resolve a maior parte do MIG-2) → MIG-1 → MIG-3 (drift e estatísticas) → MIG-4 → MIG-6 → MIG-7 → MIG-8 → MIG-9 (conteudos-infinitos).

---

## 5. Perguntas que só o Lucas responde

1. **Chats do claude.ai e `execute_sql`:** os chats vão continuar aplicando direto na produção? Se sim, o aplicador precisa reconciliar depois do fato (drift), e não só controlar a entrada. E DDL por `execute_sql` ou pelo editor SQL deve ser proibida, já que não deixa linha no ledger?
2. **Caminho de escrita do motor:** aceita que o aplicador use a API de gestão com o `SUPABASE_ACCESS_TOKEN` que já está no `.env.local`? Ou tem de ser MCP, ou um `SUPABASE_DB_URL` novo?
3. **Ensaio:** pode instalar algo local (PGlite via npm, ou docker/postgres)? Branching do Supabase está fora por custo?
4. **Passado do ledger:** alinhar as 448 versões com a hora da aplicação aos nomes dos arquivos, ou congelar tudo antes de 16/10 como linha de base e só cobrar daqui para frente?
5. **Versões sem arquivo (~200, a confirmar no cruzamento):** gerar arquivo a partir do ledger, ou declarar como linha de base e seguir?
6. **dashboard-comercial:** alguém ainda aplica migration dele nesse banco? Ele entra no aplicador desde o MIG-0?
7. **Classe A:** quais operações você aceita sem ok seu? Objeto novo no schema `inteligencia`? Coluna nullable em tabela do OS? Policy nunca?
8. **Token:** o aplicador pode liberar `migration-<id>-aplicada` sozinho, depois de conferir no ledger, ou o token continua sendo seu?
9. **Rollback:** passa a exigir `.reverter.sql` (hoje há 2 em `supabase/reversao` e 0 rollbacks registrados) para classe B e C?
10. **Executor e juiz sem conector:** autoriza `--strict-mcp-config` (ou desligar o conector do claude.ai) no `claude -p`? É uma linha da P7 e mexe no motor.
11. **Os 15 tickets parados agora** (casos 1 a 3): ficam esperando o MIG, ou aplica pela skill como hoje?
