# ADOCAO-DASHBOARD: paridade com o Comarka OS (Passo 0)

Data: 22/10/2026. Só leitura. Shas lidos: kit main `d3ce1b0`, Comarka main `c16e2b8` (working tree = main nos arquivos citados), dashboard main `3cbc587`.
Prefixos: C = `~/Projetos/comarka-operacional`, K = `~/Projetos/orquestrador-kit`, D = `~/Projetos/dashboard-comercial` (lido como `git show main:<arquivo>`). O = `scripts/orquestrador/`.

## Resumo: o que é obrigatório antes do primeiro ticket

1. **Motor, bloqueador 1: o `.env.local` vai para a worktree.** O kit linka o `.env.local` do checkout principal dentro da worktree do ticket (K O/executor.sh:312-313). O `.env.local` do dashboard aponta para o único banco, que é produção (D vitest.config.ts:8-11: "um `vitest run` comum já escreveu nele três vezes"). Precisa de um lote no kit que desligue esse link por config, com teto de ~20 linhas e teste.
2. **Motor, bloqueador 2: o kit assume que a `main` está no checkout principal.** O kit lê a fila e faz o autocommit em `MAIN_CHECKOUT` (K O/lib.sh:35, O/local-loop.sh:798-801). No dashboard, o checkout principal está em `fix/aprovacoes-fila-cobrancas` (576 commits, contra 806 da main), e a `main` está presa na worktree `_worktrees/dc-deploy`, que é do integrador (D CLAUDE.md:130-133). Isso é decisão do Lucas (I1), não lote.
3. **Motor:** a zona proibida entra como lista `no_write_tables`, mais `prefixos_sem_ddl` e `no_write_paths` (seção F). Não depende do L6.
4. **Motor:** o gate de typecheck por baseline 246 é obrigatório, porque o build não barra tipo (D next.config.mjs:14 `ignoreBuildErrors: true`). A suíte roda só a config padrão, que exclui integração.
5. **Motor:** o MIG-A já deixa o dashboard `somente_leitura` no banco `comarka` (~/.orq/repos.json). Fica assim.
6. **Repo:** CLAUDE.md com o bloco de parâmetros do protocolo (seção E), a seção C0 reescrita do ponto de vista do dashboard e o caminho real do build.
7. **Repo:** o PLAYBOOK-seed do kit já traz 13 das lições genéricas do Comarka. As outras ~30 genéricas entram como conteúdo de repo antes do primeiro ticket. As específicas ficam de fora.
8. **Repo:** o primeiro lote de tickets passa pelo `orq validar`, com C11, C13 e C14 do 8a, e o template de ticket sai com critério que usa `$BASE_REF`.
9. **Sessão:** RETRATO, DECISOES e PLANO criados vazios em `claude/`. FILA = `scripts/orq fila|validar|ticket`. ZONA_PROTEGIDA = a mesma lista do `no_write_tables`.
10. **Pode esperar:** a guarda PreToolUse (L6), a multi-fila (L7), o esforço por papel e a regex de limite (L5), o recon (L10), a promoção e o gate streak.

---

## A. Por que o Comarka acerta

As classes são as dos 89 resgates de 04 a 17/10 (`medicao-comarka/out/14d/resumo.json`, `intervencoes_por_tipo`). "Ataca" diz para qual classe o mecanismo foi desenhado. Efeito medido por mecanismo: **sem evidência**, porque a medição conta resgates e não atribui causa. Um ponto importante: os 22 resgates de allowlist são todos de antes do teste vizinho existir (`convergencia-comarka-kit.md:156`).

| Mecanismo | Camada | Onde (C, main c16e2b8) | Classe que ataca |
|---|---|---|---|
| validar-fila, 16 camadas | motor (pre-commit) | `scripts/validar-fila.py` (1775 linhas); `REGRAS_NOVAS_COMO_ERRO = False` em :75 (camadas 6, 7, 9, 13 e 14 saem como WARN, :60); hook `.githooks/pre-commit:36-44` aborta o commit com rc≠0 | critério 12 (camadas forma, discrim, colchete, contagem que conta comentário, espera literal, contraprova); allowlist 22 (camada 15, teste vizinho; camada 6, testes afetados); dependência 7 (camada 4, dependência órfã) |
| Guarda PreToolUse (6bea005) | motor (`.claude`) | `.claude/hooks/guarda-ferramenta.py` 278 linhas: SQL em C0 via MCP (:224-241, token `c0-migration-<nome>` em :233); `motivo_git` :159 (add amplo, `--no-verify`, push, hooksPath); `SCRIPTS_DO_LUCAS` :133; segredos. Registro em `.claude/settings.json:10-18`, matcher `Bash\|Read\|mcp__.*__(execute_sql\|apply_migration)`, `onFailure: block` | nenhuma das 89 (entrou em 18/10, depois da janela). Ataca qualidade e segurança: escrita em C0 e add amplo. Sem evidência medida |
| Agentes recon e juiz-diff | sessão (`.claude/agents`) | `.claude/agents/recon.md:4-5` (haiku, low); `juiz-diff.md` (opus, high). Chamados só por prosa: CLAUDE.md:28 e skill publicar. Nenhum script os chama. Não confundir com o `run_recon` mecânico do executor (C O/executor.sh:326) | o `run_recon` mecânico ataca o caso obsoleto. Os agentes: sem evidência |
| Esforço por modelo | motor (`.claude`) | `.claude/settings.json:4-7` modelSettings (opus high, sonnet medium, haiku low). Nenhum `--effort` no motor | sem evidência. O F7 da convergência diz que nem estava valendo |
| Ampliação com teste vizinho (457856c) | motor | C O/lib.sh:835 `vitest_vizinhos`; C O/executor.sh:460-487 `viz_allow_cands`/`decide_vizinhos`; :568 grava `allowlist-ampliada.txt`; O/enforcement.sh lê o arquivo (C O/executor.sh:691) | allowlist 22 |
| Critério em bash isolado (31104d0) | motor | C O/executor.sh:30 `roda_cmd_isolado`; :223 `run_criterios`; C O/lib.sh:693 `criterio_match` | critério 12 |
| Evidência da tentativa preservada | motor | C O/lib.sh:763 `preservar_rundir` (`attempt-N.prevK`); chamado em C O/executor.sh:550-555, com `die` se o mv falhar | diagnóstico de todas as classes. Não reduz resgate sozinho |
| Regex de limite de sessão (6ad8fbd) | motor | C O/lib.sh:391 `RATE_LIMIT_REGEX` com `hit your [a-z ]{0,30}limit` | sem evidência nos 89. Evita queimar ticket por limite (PLAYBOOK C:247) |
| Autocommit de status | motor | C O/local-loop.sh:418 `autocommit_status_fila`; :316 `rebase_status_fila`; :300 `reabertura_humana` | writeback 7, reabertura 4. Tem o defeito F5, que leva o arquivo inteiro |
| Dependência entre filas (6df04cc) | motor | C O/lib.sh:118 `ticket_file_by_id_qualquer_fila`; :162 `deps_resolvidas` | dependência 7 |
| Ritual de staging e promoção | motor (scripts do Lucas) | `scripts/ritual-staging.sh` (296), `publicar.sh` (317), `promover-plataforma.sh` (228), `promover-apolo.sh` (331), `scripts/roadmap/checar-promocao.py` (536) | nenhuma classe dos 89. Protege a main e o schema na promoção |
| Gate streak e pausa | motor | C O/lib.sh:455-459 (`PAUSA_FILE`, `PAUSA_LOOP_FILE`, `pausa_ativa`); :492 `gate_streak_limite`, :513 registrar, :554 pausar; `docs/fila/000-config.json:24` limite 4 | **gera** gate_streak 7 e pausa_gate_streak 5 (29 h parado). É recuperação com custo, e tem o defeito do 762/851 |
| Zona C0 | motor (config) | `docs/fila/000-config.json:35-80` `c0_intocavel` (no_write_tables :37, no_write_prefixes :45, ghl_comercial :49, dashboard_readonly :57, os_owned_excecoes :68) | segurança. Não é classe dos 89 |
| PLAYBOOK | repo | `docs/orquestrador/PLAYBOOK.md` 1099 linhas; §7 em :90 | C3: 12 dias sem lição nova (`resumo.json` C3) |
| CLAUDE.md e rules | repo | `CLAUDE.md` 61 linhas: C0 :5-9, plano :11-21, sessão curta :23-29; `.claude/rules/*.md` (331 linhas em 9 arquivos) | critério e allowlist, por meio da regra `rules/fila.md` na geração do ticket. Sem evidência medida |
| Plano (o "STATUS-PLANO") | sessão | **não existe `claude/STATUS-PLANO.md`**. O plano é `docs/plano/compromissos.json` (711 linhas) mais `scripts/roadmap/plano.py` (579 linhas), que gera `docs/plano/STATUS.md` (CLAUDE.md:12-14), injetado pelo hook SessionStart (`.claude/settings.json:34-39`) | erro de sessão. Fora dos 89 |
| ESTADO-ATUAL | sessão | `claude/ESTADO-ATUAL.md`, 17 linhas; regra em CLAUDE.md:27 e :42-44 | idem |
| Diário de decisões | sessão | `claude/decisoes-diagnosticos-22out.md` (um só arquivo, 78 linhas) | idem |
| estado-fila.py e prontos.py | sessão | `scripts/roadmap/estado-fila.py` (87 linhas; **escreve** `_estado.json`, :56 e :82); `prontos.py` (75 linhas) | dependência: quem está travado e por quê |
| Zona protegida da sessão | sessão | CLAUDE.md:5-9, mais a guarda e `test/c0-guard.test.ts` | segurança |
| Hook de tamanho de sessão | sessão | `.claude/settings.json:23-28` (`sessao-tamanho.py`); CLAUDE.md:26 | custo de sessão |

## B. O kit hoje

`git log --oneline -1 main` = **`d3ce1b0` 8c-6**. A seção B da convergência ficou defasada: o L1 e a maior parte do L2 já entraram como 8b (`9b0addc`, `b2f9547`, `2495d4a`, `fc11aea`).

| Mecanismo do A | Kit | Evidência (K) |
|---|---|---|
| validar-fila | **equivalente** na validação, **não tem** pre-commit | regras e severidades em `O/gate-ticket.ts:105-139` (7 órfã = erro :123; C13 origin/ = aviso :132; C14 = erro :133; C11 vizinho = aviso :137). Roda por `orq validar` (`scripts/orq:480`) e no pré-voo do executor. `instalar.sh` não instala hook (grep sem resultado). Camadas que faltam: **L10** |
| Guarda PreToolUse | **não tem → L6** | sem hook em `instalar.sh` nem em `O/`. Só o piso `--disallowedTools` (`O/executor.sh:343`) |
| recon / juiz-diff | recon **não tem → L10**. Juiz independente **igual**, com outro desenho. juiz-diff na publicação: **não tem** | juiz `--allowedTools "" --max-turns 1`, modelo por risco (`O/juiz.ts:77-79`, `O/executor.sh:806`) |
| Esforço por modelo | **não tem → L5** | só `--model` (`O/executor.sh:806`, `:1072`); grep `effort` só acha comentário "best-effort" |
| Teste vizinho | **igual** (8c) | `O/executor.sh:981` `vizinho_na_base`, :1184 |
| Critério isolado | **igual, e melhor** | `O/executor.sh:516` (`env -u SHELLOPTS -u BASHOPTS BASE_REF=… bash`), :525-529 (126/127 = ambiente) |
| Evidência preservada | **equivalente** | `O/executor.sh:850` `slot_base_attempt` (attempt-N monotônico) |
| Regex de limite | **parcial → L5** | `O/lib.sh:926`: tem "usage limit" e "5-hour session limit", não tem "hit your … limit" |
| Autocommit | **igual, já corrigido** (8b-1) | `O/local-loop.sh:796-826` (confere a branch em :799, `commit_motor` :818); campos em `O/campos-do-motor.json` |
| Dependência | **igual numa fila**. Prioridade e multi-fila: **não tem → L4, L7** | `O/lib.sh:122` (ordem = `find … \| sort`) |
| Ritual de staging | **não tem** promoção. Merge local em staging **equivalente**, sem push (D4 da convergência) | `O/local-loop.sh:95` (assunto do merge) |
| Gate streak / pausa | streak **não tem** (base vermelha no lugar); pausa com dono **igual** (8b-3) | `O/config-tabela.ts:439`; `O/resolvedor/gate-streak.ts:57` |
| Zona C0 | **igual**, com nomes diferentes | `O/enforcement-core.ts:89-102` (tipo), `:474-486` (`tabelasEscritas`, incluindo `.from('x')…update(` em TS), `:532` (`violacoesDeTabela`), chamada para todo arquivo que não é prosa em `:758-767`; obrigatória em `O/config-chaves.ts:68`. **Drift do template:** `doutrina/templates/config.json:208-221` escreve `no_write_prefixes`, `readonly_ok` e `excecoes_os_owned`, que o motor não lê |
| PLAYBOOK | **equivalente** | `doutrina/templates/PLAYBOOK-seed.md` (164 linhas), instalado como `docs/orquestrador/PLAYBOOK.md` (`instalar.sh:572`) |
| CLAUDE.md | **não tem** | `instalar.sh:563-579` lista o que o `--novo` cria, e CLAUDE.md não está na lista |
| Sessão: PLANO, RETRATO, DECISOES | **não tem** | idem |
| Scripts de fila | **equivalente, mais rico** | `scripts/orq`: `fila` (:35, :473), `validar` (:480), `ticket`, `erro`, `eventos`, `custo`, `decisoes`, `prevoo`. Classes `passou/travou/refatiar/aguarda/pendente/andando` em `O/fila-read.ts:88-99`. **Diferença:** não há "prontos para rodar agora" com o ranking de quem trava mais, como no `prontos.py`. O `aguarda` cobre o caso de dependência. Para uma fila só, o `orq fila` cobre o papel |

## C. O dashboard hoje (main 3cbc587)

**Atenção:** o checkout principal está em `fix/aprovacoes-fila-cobrancas` (`befa44a`, 576 commits). A main está em `3cbc587` (806 commits) e fica presa na worktree `~/Projetos/_worktrees/dc-deploy`. São 26 worktrees registradas (`git worktree list`). O subagente leu a branch velha; tudo abaixo foi refeito sobre a main.

- **Stack:** Next `^15.5.15` (D package.json; o CLAUDE.md:12 ainda diz "Next.js 14"), React 19, TS 5, supabase-js 2, vitest 4, Sentry. Node `22.x`. npm com `package-lock.json`. Não tem `pnpm-lock.yaml`, mas o CLAUDE.md:165 fala em pnpm. Não é monorepo.
- **Teste:** `npm test` = `vitest run`, ou o binário `node_modules/.bin/vitest run`. A config padrão exclui `**/*.integration.test.ts` (D vitest.config.ts:15). A integração exige `PERMITIR_ESCRITA_PRODUCAO=1` (vitest.integration.config.ts).
- **Typecheck:** não há script. O comando do CLAUDE.md:142-146 é `node_modules/.bin/tsc --noEmit 2>&1 | grep 'error TS' | grep -vc '^\.next/'`. **Baseline = 246** em árvore limpa, medido em `a1f5bbc` (CLAUDE.md:143). Barra = delta-0, **erro a erro** (:146).
- **Build:** `node_modules/.bin/next build`. O build **não barra tipo nem lint** (D next.config.mjs:11 e :14). "252/252 páginas, exit 0" vale para o checkout com env (CLAUDE.md:165). Em worktree sem env: **sem evidência**.
- **Suíte:** 95 arquivos de teste e 1154 casos `it`/`test` (contagem por grep na main). 37 arquivos citam supabase (mock ou não: sem evidência). **Tempo e estado: sem evidência.** A cópia fora do repo para rodar sem env foi negada pela permissão, e rodar no checkout carregaria `.env.local` de produção. Comando para o Lucas (seção I).
- **CLAUDE.md:** 165 linhas na main. Seções: C0 :50, banidas :55, engenharia :102, git/deploy :128, DDL :150. Não tem AGENTS.md. `.claude/` na main tem só `commands/` e `skills/`; não tem `settings.json` nem hooks.
- **tsconfig:** strict (:10), incremental (:18). `include` = `next-env.d.ts`, `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts` (:31-35). `exclude` = node_modules, scripts, docs/backups (:37-40). `next-env.d.ts` está no gitignore (:39), então worktree limpa = 246.
- **Hooks:** não tem pre-commit, husky, lint-staged nem hooksPath. Só `.git/hooks/pre-push` (não versionado), que exige digitar `PUSH` via `/dev/tty` para a main (:4-11).
- **Branches:** 93 locais e 82 remotas. **Não existe `staging*`.** Regra de integrador único: só a sessão dona do `dc-deploy` faz merge na main (CLAUDE.md:130-133).
- **Tabelas que o repo escreve** (grep `.from('x')` seguido de `insert|update|upsert|delete` em até 3 linhas, src/ da main). Em C0 pelo Comarka:
  - `leads_crm` 35 (ex. `src/app/api/aprovacoes/route.ts:302`)
  - `clientes_receita` 23 (`aprovacoes/route.ts:625`)
  - `ads_metadata` 10 (`api/meta/ativar/route.ts:45`)
  - `leads_crm_historico` 6 (`aprovacoes/route.ts:961`)
  - `trafego_*` 12 tabelas, 23 pontos (`trafego_regras_historico` 7, que é a exceção do CLAUDE.md:52)
  - em `ghl_comercial`/`dashboard_readonly`: `ghl_user_map` 5, `ghl_funnel_snapshot` 2, `ghl_sdr_alerts` 1, `meta_form_leads` 3, `creative_scores` 11, `ai_alerts` 1, `ai_usage_log` 1.
- **Tabelas que o Comarka diz que são do OS** (`os_owned_excecoes`, C 000-config.json:68) e que **o dashboard também escreve**: `perf_meta_connections` (`src/app/api/auth/perf-meta/callback/route.ts:121`, `:138`), `ia_prompts` (`src/app/api/config/ia-dossie/route.ts:85`, `:99`). Também `perf_ad_accounts`, `perf_sync_logs` e `perf_insights_daily` (`src/app/api/perf/*`); o CLAUDE.md do Comarka (:7) diz "`perf_*` são do OS".
- **Migrations:** 131 em `supabase/migrations` (a última é `20261022120000_receitas_avulsas.sql`, commit 8d6e252 de 22/10), 113 em `migrations/` e 7 em `sql/`. 44 arquivos têm ALTER, trigger, policy, grant ou revoke em tabela C0. Os mais novos: `20261007200000_clientes_receita_status_log.sql` (a exceção autorizada no CLAUDE.md:53) e `…200100_clientes_receita_updated_at.sql` (não autorizada, :53).

## D. Paridade

| # | Mecanismo | Veredito | Motivo | Caminho se obrigatório e o kit não tem |
|---|---|---|---|---|
| 1 | Não linkar `.env.local` na worktree | **dia 1 obrigatório** | banco único = produção; `vitest run` já escreveu nele 3 vezes (D vitest.config.ts:8-11); o kit linka sempre (K O/executor.sh:312-313) | **lote no kit antes**: chave `worktree.linkar_env: false` (ou lista vazia), ~20 linhas mais teste de fixture. Gates e critérios rodam sem credencial |
| 2 | Fila e autocommit no checkout que está na main | **dia 1 obrigatório** | K O/lib.sh:35 e O/local-loop.sh:799 exigem `HEAD = branch_protegida` no checkout principal. Hoje ele está em `fix/…`, e a main está no `dc-deploy` | decisão I1. Sem lote se o checkout principal voltar para a main e o `dc-deploy` passar a usar `git archive` sem ter a main em checkout |
| 3 | Zona C0 (`no_write_tables` e outros) | **dia 1 obrigatório** | banco compartilhado. O enforcement do kit já reprova escrita nova por nome, em TS e SQL | config (seção F). Corrigir o drift do template (`config.json:208-221`) no kit, ~10 linhas, pode esperar se o config do dashboard for escrito à mão com os nomes que o motor lê |
| 4 | Gate de typecheck com baseline | **dia 1 obrigatório** | o build não barra tipo (next.config.mjs:14) | o kit tem `tipo: baseline` (K O/gates.ts:27-50), mas compara **contagem ≤ baseline**, e o dashboard exige delta **erro a erro** (CLAUDE.md:146). Dia 1: contagem ≤ 246. Comparação erro a erro: pode esperar (I5) |
| 5 | Critério isolado e BASE_REF | já tem | K O/executor.sh:516 | — |
| 6 | Teste vizinho | já tem | 8c | — |
| 7 | Validação de ticket (gate-ticket) | **dia 1 obrigatório** (como processo) | critério e allowlist somam 34 dos 89 no Comarka | já existe. Regra de repo: todo ticket passa por `orq validar` antes do commit na fila. O hook pre-commit pode esperar |
| 8 | Camadas do validar-fila que faltam (recon, schema vivo, embed FK) | pode esperar | o dashboard começa sem histórico de fila | L10 |
| 9 | Guarda PreToolUse | **pode esperar**, mas antes de qualquer ticket que toque SQL ou banco | o executor do kit não tem MCP do Supabase nem execute_sql. O piso `--disallowedTools` e o enforcement por diff cobrem o loop. A guarda protege as **sessões** humanas+Claude | L6 (depende do D5). Até lá, o dia 1 proíbe ticket com allowlist em `supabase/`, `migrations/` ou `sql/` |
| 10 | Autocommit só das chaves do loop | já tem | 8b-1 | — |
| 11 | Pausa com dono | já tem | 8b-3 | — |
| 12 | Evidência preservada | já tem | equivalente | — |
| 13 | Regex de limite e esforço por papel | pode esperar | sem evidência nos 89 | L5 |
| 14 | Dependência entre filas, prioridade | não se aplica / pode esperar | o dashboard terá uma fila | L4 se a ordem por nome não bastar |
| 15 | Gate streak | não se aplica | o kit tem base vermelha; o streak do Comarka gerou 29 h parado | — |
| 16 | Ritual de staging e promoção | pode esperar | o dashboard tem integrador único e deploy por `git archive` (CLAUDE.md:129-131); o loop só faz merge local em `staging-auto` | regra de repo: a staging-auto é promovida pelo integrador, como uma branch entregue |
| 17 | recon / juiz-diff como agentes de sessão | pode esperar | prosa, sem evidência | conteúdo de repo (`.claude/agents/`) quando quiser |
| 18 | PLAYBOOK | **dia 1 obrigatório** | C3 e o executor leem as lições | conteúdo de repo (abaixo) |
| 19 | CLAUDE.md com parâmetros | **dia 1 obrigatório** | protocolo-sessao §0 | conteúdo de repo (seção E) |
| 20 | RETRATO, DECISOES, PLANO | **dia 1 obrigatório** | protocolo-sessao §2-3 | conteúdo de repo |
| 21 | Scripts de FILA | já tem | `orq fila` | — |
| 22 | MIG-A aplicador | **desligado no dia 1** | já `somente_leitura: true` | — |

**Lições do PLAYBOOK do Comarka** (C docs/orquestrador/PLAYBOOK.md):
- Já no seed do kit (K PLAYBOOK-seed.md:14-32): Log≠verdade (C:94), casa errada (:97), lock (:101), deps pelo `.id` (:104), campo fora do schema (:107), tail -f (:110), story≠ticket (:113), kickstart (:118), allowlist sobreposta (:202), build≠typecheck (:173, seed :32).
- **Genéricas que faltam no seed (levar como conteúdo de repo):**
  - bullets: :123 critério HTTP 000; :131 reprova idêntica em 3+; :134 fora do repo não existe; :141 orq evolui pela fila; :151 guard com flag desligada; :197 ticket serial = trava; :207 computador dormiu = adiado; :216 um ticket, um eixo; :225 token definido e não aplicado; :229 var() em SVG; :233 watchdog `$!`; :247 interrupção ≠ reprovação; :261 pausa em env var; :272 `.next` stale (vale direto para o baseline do dashboard); :283 agendador no repo; :294 critério roda no shell que executa; :315 colisão de teste; :420 harness tem uma casa; :424 conserto de gate só vale visto.
  - seções: :334 critério negativo; :356 allowlist em diretório; :403 gate de cópia congelada; :430 validador × executor em árvores diferentes; :456 E2E parou de exercitar; :501 comentário não executa; :550 furo tapado no consumidor; :598 allowlist incompleta (:658 é duplicata); :718 spec, allowlist, duas árvores; :788 edição de ticket em disco com loop ativo; :923 critério só prova presença; :937 ausência ampla; :961 aceite × ticket superado; :974 aceite ancora no elemento; :996 não ancorar em classe; :1016 teste de estrutura não fixa a lista; :1057 recon errado some com o ticket.
- **Específicas do Comarka (não levar):** :158 ficha-types; :185 aba registrada; :326 guard aplica_migration casa comentário (já resolvido no kit pela ORQ-12, K enforcement-core.ts:14-21); :481 e :529 registros; :780 pendência `lead_atribuido`; :836 registro de prioridade.

## E. Parâmetros do protocolo para o dashboard

| Parâmetro | Valor proposto | Base |
|---|---|---|
| PLANO | `claude/STATUS-PLANO.md` (à mão, máx. 80 linhas) | o dashboard não tem `compromissos.json` nem `plano.py`. Portar o `plano.py` (579 linhas) não é dia 1 |
| RETRATO | `claude/ESTADO-ATUAL.md` | mesmo nome do Comarka |
| DECISOES | `claude/decisoes-diagnosticos-<ddmmm>.md` | idem. O `docs/decisoes-pendentes.md` existente é do produto, não do protocolo |
| FILA | `scripts/orq fila`, `scripts/orq validar --pendentes`, `scripts/orq ticket <id>` | K scripts/orq:35, :480 |
| AMBIENTES | main = `main` (integrador: `~/Projetos/_worktrees/dc-deploy`); alvo do loop = `staging-auto` (local, sem push); worktrees do loop em `~/Projetos/_worktrees/orq-dc-<id>` | depende de I1 e I2 |
| BANCO | Supabase `ogfnojbbvumujzfklkhh` (compartilhado com o Comarka OS), leitura por `execute_sql` agregado e com limit; DDL só pela regra da seção F | D CLAUDE.md:12 |
| ZONA_PROTEGIDA | a lista `zona_proibida.no_write_tables` mais `prefixos_sem_ddl` do `docs/fila/000-config.json` (seção F) | mesma fonte nos dois lugares |
| COMPROMISSO | `DC-XXXX` | prefixo próprio, para não colidir com o C-XXXX do Comarka |

Trecho pronto para o CLAUDE.md do dashboard:

```markdown
## PROTOCOLO DE SESSÃO (skill protocolo-sessao)
- PLANO: `claude/STATUS-PLANO.md`
- RETRATO: `claude/ESTADO-ATUAL.md` (máx. 60 linhas, reescrito a cada marco)
- DECISOES: `claude/decisoes-diagnosticos-<ddmmm>.md`
- FILA: `scripts/orq fila` · `scripts/orq validar --pendentes` · `scripts/orq ticket <id>` (status de ticket só por aqui)
- AMBIENTES: `main` só no `~/Projetos/_worktrees/dc-deploy` (integrador único); loop em `staging-auto` local, sem push; worktrees do loop em `~/Projetos/_worktrees/orq-dc-<id>`
- BANCO: Supabase `ogfnojbbvumujzfklkhh`, compartilhado com o Comarka OS. Leitura agregada e com limit. Nenhuma migration aplicada pelo loop.
- ZONA_PROTEGIDA: `zona_proibida.no_write_tables` + `zona_proibida.prefixos_sem_ddl` de `docs/fila/000-config.json` (fonte única; esta seção não repete a lista)
- COMPROMISSO: `DC-XXXX`
- Ticket do loop nunca toca `supabase/`, `migrations/`, `sql/` nem `.env*`; passa por `scripts/orq validar` antes do commit na fila.
```

## F. Banco compartilhado

Leitura de base: para o Comarka, a C0 é "não escrever". Para o dashboard, boa parte dela é **produzida** por ele (`leads_crm` 35 escritas, `clientes_receita` 23, `trafego_*` 23). A regra do próprio dashboard é: sem DDL, grant, RLS ou trigger, e "nenhuma rota escreve nelas **por conta própria**" (D CLAUDE.md:51). O enforcement do kit reprova só a **linha adicionada** que escreve (K enforcement-core.ts:474-486, :758-767). Então pôr a tabela na lista bloqueia escrita nova e reescrita de uma linha que já escreve, e deixa passar o código que não muda. Isso bate com a regra do dashboard: o ticket que precisar disso bloqueia e vai para o Lucas.

Proposta de `zona_proibida` (com os nomes que o motor lê):
- `no_write_tables`:
  - C0 do Comarka: `clientes_receita`, `leads_crm`, `leads_crm_historico`, `ads_metadata`, `ads_performance`, `fn_mql_sql_by_month`, `vw_atribuicao_proporcional`;
  - do OS: `perf_meta_connections`, `perf_meta_ad_map`, `perf_ghl_locations`, `perf_ia_analises`, `ia_prompts`, `meta_connections`, `meta_ad_accounts`, `meta_insights_cache`, `meta_lead_forms`, `meta_sync_logs`, `meta_agency_connection`, `client_meta_accounts`;
  - o que o CLAUDE.md do dashboard manda preservar: `_audit_baseline_metrics_v2` e `clientes` (banida).
  - Como entra o `trafego_regras_historico`, exceção de escrita (D CLAUDE.md:52): ver I3.
- `prefixos_sem_ddl`: `trafego_`, `leads_crm`, `vw_`, `perf_`, `meta_`.
- `no_write_paths`: `supabase/**`, `migrations/**`, `sql/**`, `.env*`, `next.config.mjs`, `vercel.json`, `vitest.config.ts`, `vitest.integration.config.ts`, `**/*.integration.test.ts`, `docs/fila/000-config.json`, `docs/fila/liberacoes.json`, `scripts/orquestrador/**`, `scripts/orq`, `CLAUDE.md`.
- `no_write_credenciais.padroes`: o padrão do template.
- **Não** entram `ghl_comercial` nem `dashboard_readonly`: no Comarka elas são "não escrever porque é do dashboard". No dashboard elas são do próprio repo.

**Regra de migration:**
- O loop não cria nem aplica migration (`no_write_paths` acima).
- O MIG-A segue com o dashboard `somente_leitura: true` (~/.orq/repos.json, banco `comarka`; K O/migrations/config.ts:98).
- DDL continua manual, CREATE-only (D CLAUDE.md:151), com ok do Lucas.
- Religar o aplicador para o dashboard é decisão futura (I4).

**Guarda PreToolUse (L6) antes do primeiro ticket?** Não para o loop: o executor do kit não tem ferramenta de banco, e o `no_write_paths` impede SQL no diff. Para as **sessões** (humano+Claude no dashboard com MCP do Supabase), a guarda faz falta, mas é a mesma falta que o dashboard tem hoje. Recomendo o L6 antes do primeiro ticket que precise tocar SQL, não antes do primeiro ticket.

## G. Medição

O `medir.sh` lê formatos do Comarka:
- `local-loop.log` em texto, com "PAUSA ATIVA" e "GATE STREAK" (`medir.sh:99`, `:125-129`);
- assunto de merge "orquestrador: merge frente/" (`:204`);
- caminho de motor `scripts/orquestrador/` (`:290`);
- PLAYBOOK `docs/orquestrador/PLAYBOOK.md` (`:568`, o mesmo caminho que o kit instala);
- assunto "fila: status automatico do loop" (`:287`, igual no kit, K local-loop.sh:818);
- `meta.json` em array com `claude_dur_secs` (`:85`; o kit grava igual, K lib.sh:1589-1600).

Variante `medir.sh --motor kit` (só leitura, ~60 linhas de diferença):
- pausa e bloqueio vêm do `runs/events.log` (K lib.sh:399), não do log texto;
- o merge do agente casa `^orq: frente/` (K local-loop.sh:95);
- o resolvedor casa o trailer `Orq-Resolvedor` (igual) e o loop casa `Orq-Loop` (K lib.sh:372);
- `REPO` aponta para o dashboard.

Mesma régua: C1 = dias seguidos sem intervenção; C2 = aprovado de primeira / done; C3 = dias sem lição nova no PLAYBOOK.

Meta para as duas primeiras semanas, sem baseline do dashboard (sem evidência, porque não há loop):
- C2 ≥ 60%;
- zero escrita em `no_write_tables` mergeada;
- zero `vitest` com credencial (o item 1 da D);
- C1 com pelo menos um trecho de 3 dias.

O 74,0% do Comarka veio depois de 2 meses de lições. Não uso esse número como meta da semana 1.

## H. Rascunho do `docs/fila/000-config.json` (orçamento em branco)

```json
{
  "schema": 2,
  "branch_alvo": "staging-auto",
  "branch_protegida": "main",
  "repo_origin_deve_conter": "dashboard-comercial",
  "ambiente_id": "ogfnojbbvumujzfklkhh",
  "max_retries": 3,
  "diff_cap_linhas": 400,
  "migrations_dir": "supabase/migrations",
  "runs_dir": "docs/fila/runs",
  "liberacoes_file": "docs/fila/liberacoes.json",
  "decisoes_file": "docs/fila/decisoes-pendentes.md",
  "pausar_file": "docs/fila/.orq-pause",
  "worktrees_dir": "~/Projetos/_worktrees",
  "worktrees_prefixo": "orq-dc-",
  "claude_timeout_secs": 1800,
  "claude_max_turns": 60,
  "executor_model": "sonnet",
  "retry_final_model": "opus",
  "modelos": { "executor": "sonnet", "juiz_alto": "opus", "juiz_baixo": "sonnet", "retry_final": "opus", "classificador": "haiku" },
  "worktree": { "linkar_env": false },
  "orcamento": { "custo_file": "docs/fila/runs/custo.json", "usd_dia": null, "tokens_dia": null, "usd_ticket": null },
  "gates": [
    { "nome": "typecheck", "cmd": "node_modules/.bin/tsc --noEmit 2>&1 | grep 'error TS' | grep -v '^\\.next/'", "tipo": "baseline", "baseline": 246 },
    { "nome": "testes", "cmd": "node_modules/.bin/vitest run", "tipo": "exit_code" },
    { "nome": "build", "cmd": "node_modules/.bin/next build", "tipo": "exit_code" }
  ],
  "zona_proibida": {
    "no_write_tables": ["clientes_receita","leads_crm","leads_crm_historico","ads_metadata","ads_performance","fn_mql_sql_by_month","vw_atribuicao_proporcional","perf_meta_connections","perf_meta_ad_map","perf_ghl_locations","perf_ia_analises","ia_prompts","meta_connections","meta_ad_accounts","meta_insights_cache","meta_lead_forms","meta_sync_logs","meta_agency_connection","client_meta_accounts","_audit_baseline_metrics_v2","clientes"],
    "prefixos_sem_ddl": ["trafego_","leads_crm","vw_","perf_","meta_"],
    "no_write_paths": ["supabase/**","migrations/**","sql/**",".env*","next.config.mjs","vercel.json","vitest.config.ts","vitest.integration.config.ts","**/*.integration.test.ts","docs/fila/000-config.json","docs/fila/liberacoes.json","scripts/orquestrador/**","scripts/orq","CLAUDE.md"]
  },
  "gate_ticket": { "modo_pre_voo": "bloqueia" },
  "launchd": { "label": null }
}
```

Notas sobre o rascunho:
- `worktree.linkar_env` **não existe no kit**. É a chave do lote do item 1 da D.
- O gate de build sem env: sem evidência de que passe. Se não passar, ele sai do dia 1, porque o typecheck já é o gate real.
- As chaves obrigatórias que faltam (`politica_adiamento`, `politica_retry`, `juiz.*`, `gate_ticket.cmd_prefixos_permitidos`, `_execucao_dos_gates`) saem do template do `instalar.sh --novo` sem mudança. Conferir com `scripts/orq config` depois de instalar.

## I. Perguntas que só o Lucas responde

1. **Checkout principal × main.** O loop exige o checkout principal (`~/Projetos/dashboard-comercial`) na `main` (K lib.sh:35, local-loop.sh:799). Hoje ele está em `fix/aprovacoes-fila-cobrancas`, e a main está no `dc-deploy`. Opções: (a) o principal volta para a main, e o `dc-deploy` deixa de ter a main em checkout (o deploy por `git archive` não precisa dela); (b) clone separado só para o loop. Qual?
2. **Autocommit na main × integrador único.** O loop commita status de ticket na main local (`fila: status automatico…`, sem push). Isso conta como "merge em main fora do integrador" (D CLAUDE.md:130-133)? Se contar, a regra do dashboard ganha uma exceção escrita para os commits `Orq-Loop` em `docs/fila/*.md`.
3. **`trafego_regras_historico`.** Entra na `no_write_tables` (e a exceção de 29/09 vira liberação por ticket) ou fica fora?
4. **Ownership em conflito.** O dashboard escreve em `perf_meta_connections` e `ia_prompts`, que o Comarka diz serem do OS (C 000-config.json:68, C CLAUDE.md:7). De quem é cada uma? A resposta muda as duas listas.
5. **Barra de typecheck.** Dia 1 com contagem ≤ 246 (o kit hoje) aceita, ou a comparação erro a erro (D CLAUDE.md:146) vira lote no kit antes?
6. **Suíte.** RETIRADO em 22/10, por correção do Lucas: não rodar vitest no dashboard, nem a suíte nem teste isolado, até a proposta "testes sem credencial" ser aprovada e aplicada. Tempo e estado da suíte seguem como sem evidência.
7. **Lote do `.env.local` no kit.** Autoriza abrir esse lote (~20 linhas) antes do primeiro ticket do dashboard?
8. **Prefixo do compromisso:** `DC-XXXX` serve?
9. **Pacote:** o CLAUDE.md:165 fala em pnpm, mas o repo só tem `package-lock.json`. O gate usa os binários de `node_modules/.bin` instalados por npm. Confirma npm?
10. **Migration `…200100_clientes_receita_updated_at.sql`.** Está na main e não está autorizada (D CLAUDE.md:53). O loop nunca vai aplicá-la, mas ela deve sair da `supabase/migrations` para o MIG-A não acusar pendente?

---
Notas de método:
- Os três subagentes foram conferidos.
- O do dashboard leu a branch velha do checkout; refiz tudo sobre a main.
- O do Comarka deixou de fora as lições :420 e :424 e errou alguns números de linha em lib.sh por 4 a 7 linhas; usei os meus.
- Uma cópia da main em scratchpad (`git archive` mais clone do node_modules) foi negada pela permissão. Por isso a suíte e o tsc não foram rodados.

---
## Adendo (22/10, tarde): ticket "testes sem credencial" no dashboard

- Branch `fix/testes-sem-credencial` em `~/Projetos/_worktrees/dc-testes-sem-credencial`, a partir da main 3cbc587, sem push:
  - `5ed537c`: barreira em `setupFiles`, mais controle negativo (sem setup: 3/3 vermelho, rc=1; com setup: 3/3 verde, rc=0);
  - `32940b1`: mock de `@/lib/supabase` em metas-plano e equipe-acesso (antes: 2 falhas BARREIRA, rc=1; depois: 47/47, rc=0);
  - `0f24c41`: integração só com `TEST_SUPABASE_*` (sem as variáveis: 5 skipped, rc=0; URL de produção: abortado em :30, rc=1).
- Hipótese do .env confirmada pelo código:
  - `vitest.config.ts` da main não tem `loadEnv`, `envDir` nem `envPrefix` (:1-22);
  - o Vite só repassa chaves com prefixo `VITE_` (`vite/dist/node/chunks/node.js:5876`, `:5898`, `:5904`).
- Suíte padrão sem as três variáveis: 3 falhas em 1236, rc=1.
  - comissao.test.ts:107 e :118: base vermelha, falham igual sem a barreira, com o arquivo idêntico ao da main;
  - equipe-cargo-colaborador.test.ts, caso "Diretor": terceiro teste indireto via closers-diretores.ts:80. Faltou na análise da manhã. Não corrigido.
- Pendência: o refresh feito na importação de `src/lib/closers-diretores.ts:80`.
- Resto em produção, lido em 22/10 só com contagem:
  - zero linhas em clientes_receita, contratos, recebimentos_mensais, pagamentos_mensais (inclusive órfãos 2026-06-01 com 111.11/222.22), audit_logs e clientes_receita_status_log (nem órfãos);
  - **2 linhas em clientes_notion_mirror** ("TESTE-V128-SOFTDELETE CLIENTE A" e "B", status "Não iniciado", cliente_id nulo), gravadas pelo trigger de insert (`migrations/migration-fluxo-entrada-clientes.sql:105`).
- npm × pnpm:
  - na main o único lockfile é `package-lock.json` (lockfileVersion 3) e o package.json não tem `packageManager`;
  - o node_modules do checkout principal tem layout pnpm (`node_modules/.modules.yaml`, `.pnpm/`).
