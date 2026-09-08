# Inventário da frota de orquestradores · 07/09/2026

Fase 0 do programa de padronização (um kit, N configs, um painel). Fonte: dois recons só-leitura rodados na máquina do Lucas em 07/09 (11:58 e 12:15). Cada célula vem do disco; onde não veio, está escrito "a confirmar". Destino: `docs/orquestrador/INVENTARIO-2026-09-07.md` do repo do kit.

## 1. Frota

| Repo | Checkout | Origin | Git em 07/09 | Loop | launchd |
|---|---|---|---|---|---|
| comarka-operacional | `~/Projetos/comarka-operacional` | `lucasantosads/comarka-os` | main em dia; 2 tickets modificados sem commit (309a, 342) | pausado (`docs/fila/.orq-pause` presente); harness commitado hoje 10:49 (`b5e587e`) | `com.comarka.orquestrador` 1800 s; `com.comarka.orq-server` (KeepAlive, PID 780) |
| actus-saas | `~/Projetos/actus-saas` | `lucasantosads/actus-saas` | main ahead 1; 2 tickets modificados (114, 115) | rodando; sem sentinela de pausa; harness parado desde 16/08 | `com.actus.orquestrador` 1800 s |
| conteudos-infinitos | `~/Projetos/conteudos-infinitos` | `lucasantosads/conteudos-infinitos` | main ahead 8, árvore limpa; worktree `ci-harness-d` em `harness/etapa4` com 9 commits a mergear | rodando (ocioso às 11:58; ticket 248 mergeado 11:28) | `com.conteudos.orquestrador` 1800 s |
| dashboard-comercial | `~/Projetos/dashboard-comercial` | `lucasantosads/dashboard-comercial` | em `recon/e2.1`, 11 à frente e 47 atrás de main; 19 worktrees; `package-lock.json` e `pnpm-lock.yaml` no disco | sem orquestrador | nenhum |

Fora dos repos:

- Nenhum loop vivo às 12:15; só o painel.
- Painel: `comarka-operacional/scripts/orquestrador/orq-server.py` (1.356 linhas) importa `orq-painel.py` (579) e a taxonomia de `orq-telemetria.py`; escreve `~/orq-painel/index.html` e `estado.json`; `orq-painel.py` notifica o macOS quando o estado piora.
- Skill-mãe: nenhum `SKILL.md` de `orquestrador-autonomo` no disco até 6 níveis; a fonte é o upload no Claude.ai. Cópias vendorizadas: Comarka 21 arquivos (v2 com patch), Actus 7 (v1), CI 21 (v2).
- Node: v24.19.0 via nvm mais um segundo `node` em `~/.local/bin`. Os três `launchd-run.sh` fixam o PATH a partir de `NODE_DIR`/`NODE_BIN_DIR` com fallback para nvm/brew.
- Lixo em `~/Library/LaunchAgents`: `com.comarka.orquestrador.plist.bak` e `.plist.repo-noturno` (inertes).
- Gerador de tickets do Comarka (`gera_tickets.py`, plano v4.1, `guardas.json`, `tokens.txt`) vive em `~/fila-v41/` e `~/Downloads/fila-v41/`, fora do repo.

## 2. Matriz repo × item do contrato

| Item | comarka-operacional | actus-saas | conteudos-infinitos | dashboard-comercial |
|---|---|---|---|---|
| Motor | bash (executor 889, local-loop 278, lib 647) + TS (enforcement-core, fila-read, lock, perfil, telemetria, relatorio-email, writeback-notion) + 6 python; 7.313 linhas | Node/mjs completo (executor 556, local-loop 395, launchd-run 60; enforcement, avaliador, pre-voo, telemetria, sql-pendentes, fila-read, ticket-md); 5.845 linhas | bash no ciclo (executor 1006, local-loop 238, lib 883, launchd-run 63) + TS nos decisores (decisao, decisao-cli, juiz, gates, diagnostico, enforcement-core, lock, perfil, fila-read); 5.173 linhas | ausente |
| Testes do harness | 2 vitest (enforcement, lock) + 6 shell (adiado, cleanup-worktree, cooldown-causa, drenagem, gate-streak, parser-verdict) | 11 suítes .mjs, uma por módulo | 16 vitest + 4 shell (drenagem, lib-config, preflight, retry-worktree) | 0 |
| `scripts/orq` | ausente | ausente | presente (11,8 KB), funcionando | ausente |
| `000-config.json` | schema 1 + `c0_intocavel`, `gate_streak_limite`, `perfis_tools`, `writeback_notion`, `supabase_project_id`, `preflight_probe` | schema 1 + `migrations_faixa_loop`, `zona_proibida`, `ambiente_id` | schema 2 aditivo: chaves v1 convivendo com v2 (`modelos`, `orcamento`, `paths_harness`, `pausar_file`, `push_suprimido`, `planejador`, `gate_ticket`, `claude_max_turns`, `sql_pendente_dir`, `testes_quarentena`…) | ausente |
| Kill switch | `docs/fila/.orq-pause` (58 ocorrências no ciclo) | nenhum: zero ocorrências de pausa nos quatro arquivos do ciclo | `pausar_file` → `docs/fila/PAUSAR`; `pausa_ativa` já lê também o arquivo legado; `orq-pause.sh` sobrando no diretório | n/a |
| `liberacoes.json` | duas listas: `liberadas` 24 objetos (campo `em`) + `tokens` 30 strings; sem prefixo `humano:` | `tokens` 5 strings, sem prefixo | `tokens` 7 strings, com prefixo | ausente |
| STATUS / events / custo | ausentes (runs tem logs, `telemetria.md` e um `attempt-2` solto na raiz) | ausentes (runs tem logs, `relatorio-ultimo.md`, relatórios de pré-voo, `sql-pendentes-*.sql`) | presentes | ausente |
| Trailer `Orq-Ticket` | 0 | 0 | 70 commits | 0 |
| Push da staging pelo loop | não (`DISALLOWED_TOOLS` + prompt) | SIM, ao aprovar (`validarBranchPush`; teste "ticket aprovado → done + push da branch_alvo") | não (`push_suprimido`) | n/a |
| Schema de ticket | 3 gerações: 259 de 390 sem `bloco`; v3 (onda, serie, camada, tam, frente); v4.1 (perfil, lane, recon_esperado); `tipo` em 313 de 3.019 critérios; ids com sufixo (309a) | v1 + `bloco` em todos; `tentativas_consumidas`; `tipo` em 0 de 313 | v2 em 51 de 73 (risco, frente, diff_estimado, cria_novo, origem, sinal_hash, hash_candidato, gate_ok, adiado_ate); `tipo` em 811 de 949; ids com sufixo (001a, 001b) | ausente |
| Status em uso | pendente 56 · done 304 · bloqueado 6 · obsoleto 24 | pendente 4 · done 49 · bloqueado 2 · obsoleto 1 | pendente 8 · done 63 · bloqueado 1 · refatiar 1 | n/a |
| Doutrina · PLAYBOOK · PECAS | skill v2 com patch + FIXES, CHANGELOG-v3, avaliacao-bmad, 214-harness-manutencao; PLAYBOOK sim; PECAS não | skill v1; PLAYBOOK sim; PECAS não | skill v2 (`EXECUTOR.md` dentro de `skill/`); PLAYBOOK do harness em `docs/orquestrador/` (o `docs/PLAYBOOK.md` é do produto, não é duplicata); PECAS sim; launchd.md | nada |
| Roadmap | `docs/roadmap` não existe | `MAPA.md` + `S6-plano-de-dados.md`, sem `mapa.json` | `mapa.json` + `MAPA.md` | não |
| Worktrees | `_worktrees/orq-runner`, `_worktrees/staging-auto` (sem prefixo de repo) | `staging-staging-auto`; `orq-212` e `orq-321` (tickets não limpos); fantasma bloqueada em `/sessions/rcw-…/fix-staging-gates`; 10 de feature | `ci-staging-auto`; `ci-harness-d` (`harness/etapa4`) | 19 worktrees, 4 esquemas de prefixo |
| node_modules | symlink do checkout principal | symlink, com cuidados de store pnpm | symlink + purga de `node_modules/.vite` + sub-node_modules do monorepo | n/a |
| Toolchain | npm + `.nvmrc`; sem script `typecheck` | pnpm; `typecheck` existe | npm, monorepo (`typecheck:root`, `typecheck:web`) | npm e pnpm-lock; sem `typecheck` |
| Notificação | `relatorio-email.ts` (ativo: a confirmar) | `telemetria.mjs` + `relatorio-ultimo.md` | arquivo (`runs/notificacoes.log`) | n/a |
| SQL / migrations | `migrations_dir` | `migrations_dir` + `migrations_faixa_loop` (faixa 0250+, reservada 0200–0249) + `sql-pendentes.mjs` + `ultima-migration-aplicada.txt` | `migrations_dir` + `sql_pendente_dir` | n/a |
| Ferramentas do agente | blacklist fixa no `executor.sh` (push, reset, psql, supabase, curl, rm, web) + `perfis_tools` (mapa de 19 linhas) | lista estática (2 ocorrências de allowedTools) | allowlist derivada dos `cmd` do ticket e dos gates (`perfil.ts`, 177 linhas) + `--max-turns` real + `permission_denials` lidos | n/a |
| caffeinate | sim | não | sim | n/a |

## 3. Os três motores, medidos (recon 2)

### 3.1 Presença de mecanismos no ciclo de vida (ocorrências por termo)

| Mecanismo | CI (bash) | Actus (mjs) | Comarka (bash) |
|---|---|---|---|
| orçamento / custo | 27 / 47 | 0 / 1 | 0 / 4 |
| STATUS.md / events.log / Orq-Ticket | 2 / 2 / 1 | 0 / 0 / 0 | 0 / 0 / 0 |
| commit wip | 3 | 0 | 0 |
| max-turns | 6 | 0 | 0 |
| refatiar | 20 | 0 | 0 |
| pausa | 29 | 0 | 58 |
| trap | 8 | 1 | 2 |
| stale (lock / em_execucao) | 5 | 1 | 1 |
| adiado / cooldown | 40 / 31 | 13 / 32 | 31 / 47 |
| lock | 36 | 43 | 8 |
| diff_cap | 6 | 2 | 1 |
| pnpm | 0 | 2 | 0 |
| setsid / pgid | 0 | 0 | 0 |

### 3.2 Arquitetura

- CI: o bash é um driver que chama TS para decidir (`decisao-cli.ts`, `juiz.ts`, `gates.ts`, `diagnostico.ts`, `perfil.ts`, `enforcement-core.ts`). O bash guarda preflight, worktree, prompt, critérios, gates, slots de tentativa, commit wip, diff.patch, refatiar, meta, merge, trap, lock, cooldown, pausa, adiado, orçamento, STATUS/events/custo. 28 funções no executor, 10 no loop, ~60 na lib.
- Actus: funções puras com injeção de dependência (`deps`), uma por responsabilidade (`montarPromptExecutor`, `extrairVeredicto`, `detectarAdiamento`, `escolherModelo`, `excedeuDiffCap`, `executarTicket`; `lockEstaVivo`, `cooldownAtivo`, `recuperarOrfaos`, `drenar`; `checar*` do pré-voo). Escolha de modelo só por tentativa (sem risco). Sem STATUS/events/custo/orçamento/refatiar/wip/max-turns/pausa/trailer.
- Comarka: mesmo desenho do CI numa geração anterior, com C0 no enforcement, `gate_streak`, `perfis_tools`, e-mail e writeback Notion.

### 3.3 O que cada um testa

- CI (16 vitest + 4 shell): formato da trilha (`<iso8601> <id> <EVENTO> chave=valor`, 1-based, sem `\n`), 429 e conexão recusada adiam sem consumir retry, juiz ilegível adia, derivação de permissões (`cada comando de gate vira uma permissão Bash(...:*)`, composto só na forma exata, vazio não vira nada), ledger de custo por dia e orçamento por ticket, baseline aceita placar maior, classificação de artefato (`artefato_sql | prosa | executavel`), config que mandasse escalar por diff_cap/enforcement é rejeitada, anti-afrouxamento só quando a allowlist tem teste, credencial em `.sql` reprova, refatiar por arquivo fora da allowlist, lock órfão por PID morto, liberações (arquivo vazio/ausente/corrompido), notificação por canal, "a única escrita é o pausar_file".
- Actus (11 suítes): enforcement A (allowlist), B (faixa de migrations, faixa reservada, diretório, número ilegível), C (escrita em tabela via cliente supabase e SQL, por schema), D (colunas-sombra `etapa_v2_*`); pré-voo (spec vendorizada ≥ 5 arquivos, identidade, autenticação do claude incluindo "mudo", estrutura da fila); `detectarAdiamento` (timeout, rate limit, exit ≠ 0 com stdout vazio, texto real do incidente, case-insensitive); diff cap sem juiz; placar/telemetria com CLI `--json` tolerante a lixo; drenagem real (órfão volta a pendente sem consumir tentativa, lock vivo não roubado, executor que morre grava `executor.exit.txt`, morte de infra aborta a fila sem queimar o próximo, auth quebrada aborta a drenagem inteira, cooldown encerra cedo, aprovado faz push e libera lock).
- Comarka (2 vitest + 6 shell): semântica de glob da allowlist, bloqueio de ALTER/TRIGGER/DROP VIEW em C0, `apply_migration`/`psql`, escrita em C0 via cliente, janela de comentário (menção em comentário não é escrita; comentário no fim da linha não isenta), isenção de fixture de DDL em `test/*.test.ts`, lock stale por idade > 2 h ou PID morto (com clock skew e limite exato), perfil desconhecido usa tools default; shell: adiado, cleanup de worktree, cooldown por causa, drenagem, gate streak, parser de veredito.

### 3.4 Forks CI × Comarka

| Arquivo | CI | Comarka | Diff |
|---|---|---|---|
| `enforcement-core.ts` | 292 | 258 | 348 linhas |
| `fila-read.ts` | 105 | 90 | 33 |
| `lock.ts` | 40 | 37 | 7 |
| `perfil.ts` | 177 (derivação de tools) | 19 (mapa perfil → tools) | 162 |

Três enforcements com regras disjuntas (CI: artefato/anti-afrouxamento/credencial/refatiar; Comarka: C0 com DDL/TRIGGER/VIEW, janela de comentário, isenção de fixture; Actus: faixa de migrations, escrita por schema/tabela, colunas-sombra). O kit precisa da união por config, com as três suítes.

### 3.5 Painel

`orq-server.py` (1.356) + `orq-painel.py` (579), Python. Lê `docs/fila/*.md`, `runs/*/meta.json`, `runs/.cooldown-until`, `.orq-pause`, `liberacoes.json` (as duas listas) e `launchctl list`. Mapa `LABELS` repo → label cruzado com os plists; motivo de reprova por tentativa via `runs/<t>/attempt-N/verdict.json` com os 8 baldes de `orq-telemetria.py`; ações numa allowlist fechada (pausar/retomar via `.orq-pause`, `kickstart` sem `-k`); push, merge, SQL e DDL ausentes por construção. Não lê STATUS/events (não existem fora do CI) e não sabe pausar o CI (`PAUSAR`).

## 4. Decisões (estado em 07/09)

Legenda: **fechada** = vale a partir de agora; **recomendada** = aguarda OK do Lucas.

| # | Ponto | Decisão | Estado |
|---|---|---|---|
| 1 | Base do motor | Kit v2.1 = CI (driver bash + decisores TS + `orq` + observabilidade). Absorve do Actus: pré-voo, regras de enforcement B/C/D, `detectarAdiamento`, placar/telemetria. Absorve do Comarka: regras C0 e janela de comentário, `perfis_tools` como mapa opcional. Driver em Node = peça 2 do kit (depois do gate de ticket), com os cenários de drenagem do Actus como spec. | recomendada |
| 2 | Onde o kit vive | Repo git `lucasantosads/orquestrador-kit` (VERSAO, CHANGELOG, testes, fixture, `instalar.sh`). Doutrina = pasta `doutrina/` do repo; a skill do Claude.ai é gerada dela. Vendorizado por cópia em `docs/orquestrador/skill/` + `scripts/orquestrador/` + `scripts/orq`; hash conferido no pré-voo. | recomendada |
| 3 | Kill switch | `docs/fila/PAUSAR` (conteúdo = motivo). O kit lê `.orq-pause` por uma versão; o CI já faz isso (`pausa_ativa`). | fechada |
| 4 | `liberacoes.json` | `{"$schema_versao":2,"tokens":[{"token","liberado_em","por","nota"}]}`. Token gravado com `humano:`; a comparação ignora o prefixo por uma versão. Tipos fechados: `migration`, `shadow-ok`, `ddl-excecao`, `excecao`, `decisao`. Migração junta `liberadas` + `tokens` do Comarka e renomeia `em`. `orq liberar` é a única forma de escrever. | fechada |
| 5 | Agendamento | Job único `com.comarka.orq.loop` lendo `~/.orq/repos.json`, lock em `~/.orq/lock`, `max_tickets_por_passada` por repo, NO-GO num repo pula para o próximo. `orq drenar` continua funcionando por repo. Plists antigos saem na adoção. | recomendada |
| 6 | IDs | Sequencial global, sufixo de letra permitido (`^\d{3}[a-z]?$`), `bloco` como campo. | fechada |
| 7 | Push da staging | `push_staging_automatico`, `false` nos quatro. Muda o Actus, que hoje pusha ao aprovar. | fechada; confirmar Actus |
| 8 | Notificação | `notificacao.canal = arquivo` nos quatro; painel deixa de notificar. | fechada |
| 9 | Schema de ticket | União com `$schema_versao`. Status: `pendente`, `em_execucao`, `done`, `bloqueado`, `obsoleto`, `refatiar` (`pausado` sai). `risco` obrigatório; `tipo` obrigatório em critério de ticket pendente ou novo (done nunca é reescrito). Renomes: `tentativas_consumidas` → `tentativas`, `recon_esperado` → `recon`. Opcionais: `perfil`, `lane`, `origem`, `sinal_hash`, `hash_candidato`, `gate_ok`, `adiado_ate`. Validador recusa `alvo` que já passa contra HEAD e `guarda` que já falha. | fechada |
| 10 | Roadmap | `docs/roadmap/mapa.json` (máquina) + `MAPA.md` (humano); Notion só espelho. | fechada |
| 11 | Worktrees | `~/Projetos/_worktrees/<slug>/{staging-auto,orq-runner,tkt-<id>,harness-<x>}`; só para novas. | fechada |
| 12 | Zona proibida | Recurso do kit por config: paths que vencem a allowlist, tabelas/prefixos com DDL/TRIGGER/VIEW, janela de comentário, faixa de migrations (com faixa reservada), escrita por schema/tabela, colunas-sombra, identificadores banidos, `no_delete_tables`. `zonas-compartilhadas.json` para o banco `ogfnojbbvumujzfklkhh`. | fechada |
| 13 | Ordem de adoção | CI → fixture → Actus → Comarka → painel → DC. | recomendada |
| 14 | `orq` | `status`, `fila`, `eventos N`, `erro`, `ticket <id>`, `custo`, `mapa status\|lint`, `sondar`, `validar`, `prevoo`, `config`, `diag`, `pausar [motivo]`, `retomar`, `liberar <token>`, `drenar`, `runbook`, `sync`, `launchd instalar\|atualizar\|remover`, `versao`. | fechada |
| 15 | Migrations no banco compartilhado | Timestamp daqui em diante; faixa opcional no config (o Actus já usa). Aplica na fase do DC. | fechada |
| 16 | node_modules | Symlink do checkout principal (é o que os três fazem); `toolchain.package_manager` decide os cuidados de pnpm. | fechada |
| 17 | Ferramentas | Allowlist derivada do ticket e dos gates (CI) + piso de blacklist vindo de `proibicoes_absolutas` (Comarka) + `perfis_tools` opcional. | fechada |
| 18 | Painel | Fica em Python, entra no kit como observador fora do loop, refatorado para ler só o contrato (STATUS, events, custo, liberacoes v2, PAUSAR, tickets). `LABELS` → `repos.json`; ações via `orq`; notificação nativa desligada. | fechada |
| 19 | Python no kit | Só o painel. `validar-fila.py` e `lint-mapa.py` viram TS (`gate-ticket.ts`, `lint-mapa.ts`). `orq-telemetria.py`, `orq-granularidade.py`, `orq-contrato.py` e `gera_tickets.py` entram em triagem na fase do Comarka. | fechada |

## 5. Kit v2.1: quem doa o quê

| Peça do kit | Vem de | O que carrega | Teste que vem junto |
|---|---|---|---|
| Driver do ciclo (`executor.sh`, `local-loop.sh`, `lib.sh`, `launchd-run.sh`) | CI | preflight, sondagem de modelos, worktree, prompt, critérios, gates, slots de tentativa, commit wip, retry na mesma worktree, diff.patch, refatiar, meta, merge, trap TERM/INT, staleness, lock, cooldown, pausa, adiado, orçamento, STATUS/events/custo, trailer, caffeinate, monorepo/Vite | 4 shell |
| Decisores TS | CI | `decisao.ts`, `decisao-cli.ts`, `juiz.ts` (por risco), `diagnostico.ts`, `gates.ts`, `perfil.ts`, `lock.ts`, `fila-read.ts` | 16 vitest |
| Enforcement | união dos três | regras por config: allowlist (glob), artefato/anti-afrouxamento/credencial/refatiar (CI), tabela/prefixo com DDL/TRIGGER/VIEW + janela de comentário + isenção de fixture (Comarka), faixa de migrations + escrita por schema + colunas-sombra (Actus), paths que vencem a allowlist e identificadores banidos (DC) | 3 suítes |
| Pré-voo | Actus (`pre-voo.mjs` → TS) | spec vendorizada, identidade, autenticação do claude (inclui "mudo"), estrutura da fila, relâmpago por drenagem | `pre-voo.test.mjs` |
| Detecção de adiamento | CI + Actus | `is_adiavel`/`norm_motivo` (7 causas do config) + `detectarAdiamento` (stdout vazio, texto real, case-insensitive) | ambos |
| Telemetria / placar | Actus + CI | `calcularPlacar`, `coletarRuns`, CLI `--json` sobre `custo.json` e `events.log` | `telemetria.test.mjs`, custo e observabilidade do CI |
| CLI `orq` | CI | 11 subcomandos + os novos da decisão 14 | `orq-cli.test.ts` |
| Validador de ticket (peça 1) | Comarka (`validar-fila.py`) → `gate-ticket.ts` (CI) | recon contra HEAD, `alvo`/`guarda` contra HEAD, allowlists sobrepostas sem dependência, padrões proibidos em critério | novo |
| Painel | Comarka (Python) | refatorado para o contrato | novo |
| Lint do mapa | CI (`lint-mapa.py` → TS) | 10 checks | novo |

Morrem na adoção: `executor.mjs`/`local-loop.mjs` (Actus) e o driver do Comarka; `avaliador.sh`, `avaliador.mjs`; `orq-pause.sh`; `relatorio-email.ts` (canal = arquivo); `enforcement.sh`/`enforcement.mjs` como entradas separadas. Os 25 cenários de drenagem do Actus viram a spec da peça "driver em Node".

## 6. O que os briefs não previam

1. Actus é um motor Node inteiro com teste por módulo, mas cobre uns 40% do contrato; é doador de módulos, não base.
2. Três enforcements com regras disjuntas; `enforcement-core.ts` diverge 348 linhas entre CI e Comarka.
3. Actus não tem pausa e pusha a `staging-auto` ao aprovar.
4. Só o CI escreve STATUS/events/custo; o painel lê `meta.json` porque não tinha outra coisa.
5. Skill-mãe sem casa no disco; três versões vendorizadas.
6. Painel mora dentro do Comarka (1.935 linhas Python, dois scripts) e ainda notifica o macOS.
7. CI: sessão de harness aberta (`harness/etapa4`, 9 commits, limpa) e 8 commits sem push. Comarka: harness commitado hoje e loop pausado.
8. IDs com sufixo de letra; status `refatiar`; `tipo` ausente na maioria dos critérios antigos; três gerações de schema no Comarka.
9. `liberacoes` do Comarka com duas listas e campo `em`; prefixo `humano:` só no CI; tickets referenciam `humano:decisao-D34` e o arquivo guarda `decisao-D34`.
10. Ferramentas: blacklist fixa (Comarka) contra allowlist derivada (CI).
11. node_modules já é symlink nos três; pnpm só no Actus; dois `node` no PATH, mas os wrappers do launchd já fixam o PATH.
12. Config do CI é v1 + v2 empilhados.
13. Nenhum dos três usa `setsid`/`pgid`.
14. Lixo: plists `.bak`/`.repo-noturno`; `_hold`, `_to_delete`, `.bak`, `.impeccable` em `docs/fila` do Comarka; `attempt-2` solto em `runs/`; worktree fantasma bloqueada no Actus; `orq-212`/`orq-321` não limpas; DC com 19 worktrees e lockfile duplo.
15. O gerador de tickets do Comarka vive fora do repo (`~/fila-v41/`).

## 7. Pendências humanas antes da F1

- CI: mergear `harness/etapa4` no main com o loop pausado; push do main (8 + 9 commits).
- Actus: push do commit à frente; commitar ou descartar os tickets 114 e 115 modificados; decidir se o push automático da staging acaba já.
- Comarka: confirmar que a pausa é intencional; commitar ou descartar 309a e 342.
- Antes de qualquer sessão de harness no Actus: `launchctl bootout` do `com.actus.orquestrador` (não há pausa).

## 8. Fase 1: plano e pronto-quando

1. Merge da `harness/etapa4` (peças 0d, 0e, 11, 12) no CI. Peça 13 e peça 1 (gate de ticket, absorvendo os checks do `validar-fila.py`) na mesma worktree, um commit por peça, teste junto.
2. Criar `orquestrador-kit` a partir do CI: `scripts/orquestrador/**`, `scripts/orq`, `scripts/roadmap/**`, `doutrina/` (skill v2 do CI), testes shell + vitest do harness, `VERSAO = 2.1.0`, `CHANGELOG.md`, `fixture/` (Next mínimo + vitest + 1 ticket trivial).
3. Absorções, uma sessão cada: enforcement (união por config, três suítes), pré-voo (Actus → TS, chamado pelo preflight), `detectarAdiamento` (→ `decisao.ts`), telemetria/placar (→ `orq custo`), `perfis_tools` opcional.
4. `instalar.sh --novo | --atualizar | --verificar`, todos com `--dry-run` e relatório: migra `liberacoes.json`, pause file, config (mapa de chaves legadas → schema 2 limpo), bloco JSON dos tickets pendentes (prosa intacta).
5. Teste de pureza do kit (grep por branch, ref de banco, nome de repo, caminho de worktree, prefixo de tabela: esperado zero); `CONTRATO.md`; `ticket.schema.json`; `liberacoes.schema.json`; enum `motivo_categoria` (os 8 baldes do `orq-telemetria.py`).
6. Doutrina v2: regra "nunca copie scripts" reescrita para "motor sem premissa + config"; faixa por bloco → sequencial + bloco; canal padrão = arquivo; PLAYBOOKs triados (universal → seed do kit; local marcado `[local]`).
7. Primeiro check técnico da F1: como cada loop mata o grupo de processos (nenhum usa `setsid`/`pgid`).

Pronto quando: `instalar.sh --verificar` no CI devolve "idêntico ao kit 2.1.0"; o fixture atravessa o loop até a sua `staging-auto`; testes shell + vitest verdes no kit; `orq` com todos os verbos da decisão 14.

## 9. Ainda a confirmar

- Grupo de processos: como o loop encerra netos sem `setsid`/`pgid` (CI, Comarka, Actus).
- `relatorio-email.ts` (Comarka) e a notificação do `orq-painel.py`: ativos hoje?
- Actus: `fila-read.mjs`/`ticket-md.mjs` não foram varridos por "paus"; presume-se sem pausa até prova em contrário.
