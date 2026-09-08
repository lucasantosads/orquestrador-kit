# Ferramentas externas: onde cada uma entra (e onde não entra)

Regra: cada ferramenta entra por **um** módulo, com fronteira escrita, e a doutrina continua valendo (script antes de modelo, gate antes de juiz, git como verdade). Ferramenta que quer ser o orquestrador inteiro entra só na borda. Ferramenta que resolve um problema pontual entra no núcleo. Nenhuma ferramenta escreve na fila.

## Entram no núcleo

| Ferramenta | Módulo | Fronteira |
|---|---|---|
| **claude-task-master** | Fase 0, conversor MAPA (`orq mapa importar`) | `parse-prd` → tasks com deps → adaptador converte em **frentes** de `mapa.json`. Nunca em tickets. `tasks.json` é espelho descartável; fonte é `mapa.json`. `expand` pode sugerir quebra de frente grande, mas quem marca `pronta` é o dono |
| **Aider (repo map)** | `orq mapa-repo` | só o módulo de repo map (tree-sitter + ranking). O binário do Aider não roda no loop |
| **RTK (proxy de tokens)** | executor, wrapper de comandos | reescreve saída de `git diff`, runner, typecheck. Entra só se a medição cortar ≥30% dos tokens de saída |
| **Superpowers** (Anthropic) | Fase 0, sessão `/arquitetar` | brainstorm → plano. Implementação e review pertencem ao loop |
| **BMAD (enxuto)** | Fase 0 | Analyst, PM, Architect. SM, Dev e QA removidos do vendoring |

## Entram na borda

| Ferramenta | Papel | Fronteira |
|---|---|---|
| **OpenHands Agent Canvas** | painel + agendador (Fase 2/3) | conecta ao Claude Code via ACP, roda em servidor sempre ligado, dispara por cron/webhook usando a assinatura existente. Só **dispara** o `local-loop` e **exibe** `STATUS.md`/relatório. Automação do Canvas que cria tarefa = segunda fonte de estado = proibido. O agente OpenHands nativo não substitui o executor (não passa pelos gates) |
| **Notion** | espelho do MAPA e do relatório | writeback upsert de seção única; nunca lê de volta |
| **Toolkit de quality gates (ESLint/Biome)** | Fase 1 brownfield | migração warning → erro rastreada, regra por regra |
| **Hooks fail-safe** (Claude Code) | harness | hook que quebra a sessão em vez de falhar seguro é incidente; todo hook do repo retorna rc 0 com log em caso de erro próprio |

## Ficam de fora do loop (servem à operação, não ao orquestrador)

| Ferramenta | Por que não no loop | Onde serve |
|---|---|---|
| **CrewAI** | multiagente conversacional é o oposto de gate mecânico; papéis que se avaliam entre si = falso-verde por consenso | protótipo rápido de fluxo de conteúdo |
| **LangGraph / LangGraph.js** | mesmo motivo | agentes de produto com estado (atendimento, analista comercial), humano no loop, retomada |
| **Cloudflare AI Gateway** | cache de resposta tem hit zero em ticket único | SaaS com chamadas repetidas: cache com TTL, log por tenant (custo por cliente), rate limit, fallback de provedor. Começar pelo atendimento (maior repetição) |
| **OpenHands agent (nativo)** | não passa pelo enforcement, gates nem juiz | automações de manutenção fora do repo do loop (revisão de PR, varredura de segurança, deploy de docs) |
| **Ponytail, Caveman, Obsidian, agent-browser** | persona e memória interativa não têm papel headless | sessão interativa do dono, se gostar |
| **BMAD completo (SM/Dev/QA)** | compete com o loop pelo mesmo papel | nada |

## Critério para adicionar ferramenta nova

Antes de entrar, responder por escrito no PLAYBOOK: (1) qual módulo, (2) qual fronteira, (3) qual métrica prova que valeu (tokens por ticket aprovado, aprovação de primeira ou tempo humano por semana), (4) como sair dela. Sem os quatro, não entra. Ferramenta que entra "porque parecia legal" é a dívida mais comum em stacks de agentes.
