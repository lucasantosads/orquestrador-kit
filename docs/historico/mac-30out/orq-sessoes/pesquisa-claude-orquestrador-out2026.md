# Pesquisa: Claude e mercado aplicados ao orquestrador-kit (18/10/2026)

Destino sugerido: `~/orq-sessoes/pesquisa-claude-orquestrador-out2026.md`.
Base: docs oficiais (code.claude.com, platform.claude.com, support.claude.com), CHANGELOG.md do Claude Code até 2.1.302, blogs de engenharia da Anthropic e 25 ferramentas e papers do mercado. Estado do kit cruzado com a memória do projeto (main `85c49a6`, Claude Code 2.1.296 no executor, resolvedor ligado no Comarka).

Legenda: **[doc]** confirmado em doc oficial; **[medido]** número com método; **[relato]** relato sem método; **[testar]** não confirmado, precisa de spike.

---

## 1. Riscos que já existem hoje (corrigir antes de qualquer peça nova)

| # | Achado | Por que importa | Ação |
|---|---|---|---|
| R1 | `claude -p` **executa os hooks do `.claude/settings.json` do projeto e conecta o `.mcp.json` sem diálogo de confiança**, salvo com `--bare` [doc, headless] | O executor roda numa worktree cujo conteúdo o próprio agente pode alterar entre tentativas; um settings versionado vira execução de comando fora do enforcement | Passar `--setting-sources user` (ou só `--settings <json do kit>`) e `--strict-mcp-config --mcp-config '{"mcpServers":{}}'` no executor, juiz e triador |
| R2 | Precedência de autenticação: `ANTHROPIC_API_KEY` presente no ambiente **sempre vence** a assinatura em `-p` [doc, authentication] | Se a variável vazar para o plist do launchd, o loop passa a cobrar por API sem ninguém ver | Wrapper com `env -u ANTHROPIC_API_KEY` (enquanto a decisão for assinatura) e pré-voo checando `claude auth status` |
| R3 | **Auto memory ligada por padrão e compartilhada entre worktrees do mesmo repo** [doc, memory] | Aprendizado de um ticket vaza para o próximo; tira o determinismo do replay e do modo sombra | `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` no ambiente do executor, juiz e triador |
| R4 | Sem `--permission-mode` explícito, o run pode iniciar no modo embutido (pode ser `auto`, com classificador) [doc, headless] | Comportamento muda com a versão do CLI sem mudança no kit | Fixar `--permission-mode dontAsk` (nega o que pediria aprovação, mantém allow) |
| R5 | 2.1.302 liga **fork subagents por padrão em `-p`** e põe subagentes em foreground [doc, CHANGELOG; a página de subagentes ainda diz o contrário] | Subagente herda a conversa e pode sair da allowlist derivada | `CLAUDE_CODE_FORK_SUBAGENT=0` e `--disallowedTools Agent` no executor |
| R6 | 2.1.296 (versão do executor) tem o defeito "`-p` não imprime nada quando um settings falha na validação", corrigido na 2.1.299 [doc, CHANGELOG] | Run mudo vira EXECUTOR_MORREU sem causa | Subir de versão só com canário (item 3.9) |
| R7 | Executor ainda chama aliases (`model=sonnet` no events.log) e `.executor_model` fixo | Alias muda de alvo quando sai modelo novo; o Gas Town quebrou numa troca de modelo [relato] | Fixar IDs completos (`claude-sonnet-5-5`, `claude-opus-5-5`) no config |

Custo: todos são flags e variáveis de ambiente. Cabem numa peça só, com teste que assevera os argumentos montados pelo `executor.sh`.

---

## 2. O que o kit já faz e o mercado confirma (não mexer)

- Worktree isolada por ticket, staging sem push, kill switch, trilha e ledger: igual Copilot agent, Conductor, Sculptor. Manter worktree manual (`git worktree add`); o `--worktree` nativo parte de `origin/HEAD` e não limpa em `-p` [doc].
- Enforcement por diff como barreira final: o spike de 10/10 mostrou o contorno por `sed`/`printf`; a doc confirma que o sandbox nativo **não** protege arquivo dentro da própria worktree [doc, sandboxing]. O diff continua obrigatório.
- Gates mecânicos antes do juiz: é o conselho central de "Demystifying evals" e "Building effective agents" [doc].
- Dependências entre tickets com OCIOSO e razão: equivale ao `bd ready` do beads.
- Triador por classe com modos sombra/auto e ledger de desfecho: mais maduro que tudo que achei publicado; nenhum produto expõe isso.
- Pipeline sequencial sem multiagente: a Anthropic mede ~15x tokens em multiagente e diz que tarefas com dependência (código) são má escolha [doc].

---

## 3. O que falta, por impacto nos critérios de pronto

Base de decisão: a medição do Comarka de 04 a 17/10 deu C2 74,0% e C1 zero com 89 resgates (allowlist 22, critério 12, pausa manual 9, motor 8, writeback 7, gate_streak 7, dependência 7). O alvo é C1, não C2.

### 3.1 Stop hook que roda o gate rápido antes de encerrar (C2 e custo)
- [doc] Hook `Stop` com exit 2 ou `decision: "block"` faz o agente continuar com o stderr como feedback; `"onFailure": "block"` (2.1.295+) falha fechado se o hook não rodar; checar `stop_hook_active`; o CLI força parada após 8 bloqueios seguidos.
- Aplicação: o executor só consegue terminar com typecheck e critérios do ticket verdes. Reprova que hoje gasta tentativa inteira vira correção na mesma sessão.
- Atenção: o hook entra por `--settings` do kit (não pelo settings do repo, ver R1). O Comarka já tem guarda PreToolUse fail-closed no `6bea005`, então o desenho converge com ele.

### 3.2 Testes e critérios fora do alcance do agente (C2 real, antirreward hacking)
- [medido] ImpossibleBench: com spec em conflito com teste, modelos editam o teste em 50% a 76% dos casos; deixar testes só leitura é o meio-termo que menos derruba desempenho, "especialmente para Claude". METR: pedir "não trapaceie" não muda nada.
- Aplicação: regra de enforcement nova: arquivo de teste **já existente** só pode ganhar linhas (asserção removida ou trocada reprova) a menos que o ticket declare `testes_reescritos`. Testes novos seguem livres.

### 3.3 Saída "spec impossível" para o executor (C1)
- [medido] Dar ao agente uma forma legítima de sinalizar spec impossível derrubou trapaça de 54% para 9% no GPT-5; efeito menor no Claude, por isso vem junto da 3.2.
- Aplicação: o executor grava `runs/<id>/attempt-N/spec-impossivel.json` com motivo e evidência; o motor manda para `refatiar` **sem consumir tentativa** e o triador recebe evidência pronta (encaixa em R2/R3). Trava: no máximo 1 por ticket, e o juiz confere a alegação.

### 3.4 Quarentena de flaky (C1)
- [medido] Google: 0,5% dos testes pequenos e 14% dos grandes são flaky; com 1.000 testes a 0,1% cada, 63% dos PRs pegam uma falha falsa.
- Aplicação: teste que falhou no gate roda de novo sozinho no mesmo commit; se alternar, vira causa `flaky` (ambiente, sem tentativa gasta), vai para `docs/fila/flaky.json` e o painel mostra. Ataca parte dos 7 gate_streak e das pausas.

### 3.5 Retry com saída curta do gate e contexto limpo (C2)
- [relato] Anthropic (compilador C): saída de teste curta e greppável, detalhe em arquivo, evita "context pollution". [medido] Augment e OpenHands: variância alta entre rodadas, retry limpo vale tanto quanto escalar modelo; parada antecipada guiada por sinal usa 1,35 tentativa em média.
- Aplicação: o kit já manda o motivo do juiz no retry; falta mandar as últimas N linhas do gate que falhou mais o caminho do log, nunca o log inteiro.

### 3.6 Gate anti-placeholder e antideleção (C2)
- [relato] Ralph loop e o incidente das 48 mil deleções: stubs, `TODO`, `.skip`, deleção em massa.
- Aplicação: quase zero código, porque a regra F (`padroes_proibidos_no_diff`) já existe. Falta o pacote de padrões no config padrão do kit (`TODO` novo, `it.skip`, `xit`, `throw new Error("not implemented")`) e um teto de linhas removidas fora da allowlist.

### 3.7 429 lido do próprio stream (C1, K15)
- [doc] Com `--output-format stream-json --verbose`, o CLI emite `system/api_retry` com `error_status` e categoria (`rate_limit`, `overloaded`, `billing_error`, `account_on_hold`); o evento `init` traz `plugins[]` e `plugin_errors[]`; o resultado final traz `subtype` (`error_max_turns`, `error_max_budget_usd`, `error_during_execution`).
- [doc] Limites de sessão e semanal da assinatura são da conta e compartilhados entre modelos: trocar de modelo não resolve; `--fallback-model` não dispara em rate limit.
- Aplicação: o executor passa de `json` para `stream-json`, classifica causa pelo evento (sem regex em texto) e o evento `init` vira a checagem de "mod carregou" que a 7g exige. Isso é a base honesta para o lock global da K15.

### 3.8 Juiz mais barato, mais estável e calibrado (C2 e custo)
- [doc] `--json-schema` no `claude -p` devolve `structured_output` validado por estrutura (faixas numéricas validar no código). Troca o parse manual do juiz e do triador sem mudar de canal.
- [medido] Juiz LLM tem viés de autopreferência e é deslocado por pistas no prompt. Aplicação: o juiz recebe spec, diff e saída dos gates, **não** o resumo "fiz X porque Y" do executor. Conferir o que o `contexto_juiz` (porte do Actus) manda hoje.
- [medido] OpenHands: critic calibrado em "PR sobreviveu" chega a AUC 0,69; calibrado em benchmark fica no acaso. Aplicação: medir toda semana o veredito do juiz contra reabertura e revert em staging; os dados já estão no ledger e nas 4 reaberturas da medição.
- [doc] Modelos: Haiku 5.5 é o indicado oficialmente para classificação e roteamento; Opus 5.5 não aceita desligar thinking. Trocar o triador de Opus para Haiku ou Sonnet só por replay (a 7f-b1b já tem replay sem custo).

### 3.9 Canário de versão e de modelo (C1)
- Conjunto fixo de ~20 tickets done do Comarka (replay em sombra, sem escrita) roda antes de subir o Claude Code (2.1.296 para 2.1.302) ou trocar modelo. Compara C2 e custo. Reaproveita a infraestrutura do modo sombra que já está decidida.

### 3.10 Telemetria nativa (observabilidade, 7g)
- [doc] `CLAUDE_CODE_ENABLE_TELEMETRY=1` exporta `claude_code.api_request` (custo e tokens por chamada), `api_error`, `api_retries_exhausted` e `tool_decision` com `source: hook`.
- Aplicação: resolve o achado do spike (negação do mod não aparece em `permission_denials`): a negação aparece em `tool_decision`. Exportador `console`/arquivo basta; sem servidor.

### 3.11 Sandbox nativo como segunda camada (7h)
- [doc] `sandbox.enabled`, `failIfUnavailable: true`, `allowUnsandboxedCommands: false`, `denyRead` para `~/.ssh`, `~/.aws`, rede com `allowedDomains` vazio. O alvo de `>` é checado contra regras `Edit` allow/deny; `sed -i` dentro da worktree passa [testar].
- Aplicação: bloqueia vazamento de credencial e rede durante o executor (padrão Codex: segredos e internet só no setup). Não substitui o diff. Spike primeiro no macOS (seatbelt).

---

## 4. Decisão de negócio pendente: assinatura x chave de API

- [doc, suporte] Hoje `claude -p` e Agent SDK consomem a cota da assinatura; a mudança anunciada para 15/06 foi pausada. O mesmo artigo recomenda chave de API para automação compartilhada em produção; os termos dizem que os limites anunciados do Pro/Max assumem "uso individual ordinário".
- Leitura: 3 a 4 repos em loop 24h numa assinatura é exatamente o perfil que gera o 429 e fica na zona cinzenta da política.
- Opção A (mínimo): juiz e triador em chave de API num workspace próprio com limite de gasto no Console; executor segue na assinatura. Custo estimado do triador hoje: ~US$ 0,35/dia no Comarka.
- Opção B: tudo em chave de API, com cota por repo via workspace. Fim do 429 compartilhado; custo passa a ser token real.
- Detalhe técnico: limite definido no Console volta como HTTP 400; teto mensal do tier volta como 429 sem `retry-after` e não adianta retry. Precisam virar causas distintas na tabela de causas.

---

## 5. O que NÃO adotar (e por quê)

- Agent teams, dynamic workflows, `/deep-research` no motor: perdem controle de worktree, diff e allowlist; agent teams ~7x tokens [doc].
- Best-of-N paralelo: +6 pontos no OpenHands [medido], mas multiplica custo e piora o 429.
- `--worktree` nativo, Routines, Managed Agents, Claude Code na web para o executor: base `origin/HEAD`, sem limpeza em `-p`, repo na infraestrutura da Anthropic sem ZDR, e Routines consomem a mesma cota.
- Batch API para juiz/triador: 50% mais barato, mas o laço precisa de resposta em minutos; só serve para relatório noturno.
- AGENTS.md gerado por LLM: piorou resultado e custou ~20% mais [medido]. CLAUDE.md curto e humano, lições com uma linha cada.
- claude-flow/Ruflo, Tessl spec-as-source: sem prática verificável.

---

## 6. Plano proposto (encaixe no backlog)

| Ordem | Peça | Conteúdo | Por que nessa ordem |
|---|---|---|---|
| 0 | Spike só leitura (sem custo de modelo relevante) | Confirmar no Mac: R1 a R5, `stream-json` com `api_retry`/`init`, Stop hook com `onFailure`, `tool_decision` no OTel, sandbox com `sed -i` e `>` | Metade dos itens é [testar]; nada vira peça sem prova |
| 1 | 7i "endurecer a chamada" | R1 a R7 como flags/env no executor, juiz e triador, com teste de argumentos | Fecha risco real, quase sem lógica nova |
| 2 | 7j "terminar verde" | Stop hook do gate rápido (3.1), saída curta no retry (3.5), padrões anti-placeholder no config padrão (3.6) | Maior ganho de C2 por linha de código |
| 3 | 7k "não culpar o ticket pelo ambiente" | stream-json e causas por evento (3.7), quarentena de flaky (3.4), spec impossível (3.3) | Ataca C1 direto: gate_streak, pausas, critério |
| 4 | 7g revisada | Guarda-escopo por hook PreToolUse (convergindo com o `6bea005` do Comarka) em vez de mod, com `init` e `tool_decision` provando a carga; 3.2 (testes só crescem) | Hook é o mecanismo que o kit e o Comarka já dominam; mod pode aprovar por cima de deny por padrão [doc] |
| 5 | Juiz | `--json-schema`, contexto sem autoexplicação, calibração semanal (3.8) | Depende do ledger de desfecho que já existe |
| 6 | 7h | Sandbox nativo como segunda camada (3.11) | Depois do spike no macOS |
| contínuo | Canário | 20 tickets em sombra antes de subir versão ou trocar modelo (3.9) | Usa a mesma máquina do modo sombra do Comarka |

Cada peça segue o modo de trabalho: worktree no kit, vermelho-antes, um commit por peça, relatório em `~/orq-sessoes/`, nada instalado no Comarka antes da sombra. Itens 3.1, 3.4 e 3.6 entram também como SUGERIR_AO_COMARKA na sessão de convergência.

---

## 7. Calibração da meta (C2 70%)

- PRs de agentes em repos públicos: 59% a 84% de merge, Claude Code entre 59% e 84% conforme o estudo [medido]. SWE-bench Pro (tarefas de ~107 linhas em 4 arquivos): topo 61,5% [medido].
- "Passou nos gates" superestima "correto" em ~6 pontos [medido].
- C2 de 74% no Comarka já está na faixa alta do mercado. O que separa o kit do C1 é retry e triagem: com 74% por tentativa, acertar 3 de 3 seguidas é ~40% (pass^k). Por isso o plano prioriza causas de ambiente e spec, não acerto de primeira.

---

## Fontes

Claude Code: https://code.claude.com/docs/en/headless · https://code.claude.com/docs/en/cli-reference · https://code.claude.com/docs/en/hooks · https://code.claude.com/docs/en/hooks-guide · https://code.claude.com/docs/en/sandboxing · https://code.claude.com/docs/en/permissions · https://code.claude.com/docs/en/env-vars · https://code.claude.com/docs/en/monitoring-usage · https://code.claude.com/docs/en/memory · https://code.claude.com/docs/en/authentication · https://code.claude.com/docs/en/worktrees · https://code.claude.com/docs/en/plugins/mods/overview · https://code.claude.com/docs/en/best-practices · https://code.claude.com/docs/en/errors · https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md

Plataforma: https://platform.claude.com/docs/en/about-claude/models/overview · https://platform.claude.com/docs/en/build-with-claude/structured-outputs · https://platform.claude.com/docs/en/build-with-claude/prompt-caching · https://platform.claude.com/docs/en/api/rate-limits · https://platform.claude.com/docs/en/manage-claude/usage-cost-api · https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan · https://code.claude.com/docs/en/legal-and-compliance

Engenharia Anthropic: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents · https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents · https://www.anthropic.com/engineering/building-effective-agents · https://www.anthropic.com/engineering/multi-agent-research-system · https://anthropic.com/engineering/building-c-compiler · https://anthropic.com/engineering/claude-code-sandboxing

Mercado e papers: https://arxiv.org/html/2510.20270v1 (ImpossibleBench) · https://metr.org/blog/2025-06-05-recent-reward-hacking · https://openhands.dev/blog/20260305-learning-to-verify-ai-generated-code · https://www.augmentcode.com/blog/1-open-source-agent-on-swe-bench-verified-by-combining-claude-3-7-and-o1 · https://arxiv.org/abs/2603.17973 (TDAD) · https://arxiv.org/html/2602.11988v1 (AGENTS.md) · https://arxiv.org/abs/2410.21819 · https://arxiv.org/abs/2604.16790 · https://www.trunk.io/blog/what-we-learned-from-analyzing-20-2-million-ci-jobs-in-trunk-flaky-tests-part-1 · https://www.alphaxiv.org/abs/2601.15195 · https://labs.scale.com/leaderboard/swe_bench_pro · https://arxiv.org/abs/2503.15223 · https://openai.com/index/harness-engineering · https://ghuntley.com/ralph/ · https://github.com/steveyegge/beads · https://simonwillison.net/2026/Aug/4/steve-yegge/ · https://kiro.dev/docs/specs/correctness/ · https://github.com/github/spec-kit · https://docs.factory.com/droid-exec/overview · https://imbue.com/blog/containers
