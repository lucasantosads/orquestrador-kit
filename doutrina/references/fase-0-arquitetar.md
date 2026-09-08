# Fase 0: arquitetar junto com o dono

A única fase em que o dono está na sala. Sessão **interativa** no Claude Code (`/arquitetar`), nunca headless. Saída: os artefatos que o loop vai consumir sem perguntar nada. Se a Fase 0 termina com pergunta em aberto, a Fase 2 vai chutar a resposta, e chute do executor custa cota.

Duas portas:

| Porta | Quando | Primeiro passo |
|---|---|---|
| **Greenfield** | repo vazio ou só scaffold | brief do zero |
| **Brownfield** | repo com código, com ou sem loop | recon do repo ANTES de qualquer conversa de produto |

## 1. BMAD enxuto: o que entra e o que fica de fora

BMAD vendorizado em `docs/orquestrador/bmad/` (regra zero: headless não vê nada fora do repo). **Ficam 3 papéis; saem 3.**

| Papel | Fica? | Motivo |
|---|---|---|
| Analyst | sim | brief, problema, usuário, restrições, fora de escopo |
| PM | sim | PRD por épico, priorização, DoD por épico |
| Architect | sim | stack, fronteiras, dados, ADRs, zona proibida |
| Scrum Master | não | o planejador do loop é o SM. Dois donos do mesmo papel = dois estados |
| Dev | não | o executor do loop é o Dev |
| QA | não | gates mecânicos + juiz são o QA |

Stories do BMAD **nunca** viram ticket. O gerador de stories foi testado e descartado: story sem `cmd + espera`, sem recon no disco e sem allowlist é ticket ruim com cara de pronto. Épico vira **bloco**; story vira **frente**; ticket só nasce na Fase 2, pelo planejador, atravessando o gate de ticket.

Superpowers (plugin oficial Anthropic: brainstorm → plano → implementação → review) é a disciplina de condução da sessão. Usa-se a parte brainstorm → plano. Implementação e review pertencem ao loop.

## 2. O comando `/arquitetar`

Template em `templates/arquitetar.md` (vai para `.claude/commands/arquitetar.md` no repo). Sequência fixa, cada passo com "pronto quando":

### 2.0 Recon (só brownfield, obrigatório)
Script, não conversa. `orq recon` gera `docs/recon-<data>.md` com: árvore de módulos (repo map), lockfile e package manager, runner de testes e cobertura real, typecheck e contagem de erros, build, diretório de migrations, tabelas/entidades encontradas, rotas, envs referenciadas, dívidas visíveis (TODO/FIXME, `skip` em testes, `any`). **Pronto quando:** o arquivo existe e o dono confirmou que reconhece o projeto descrito nele. Tudo que a arquitetura citar depois precisa aparecer no recon ou ser declarado como novo.

### 2.1 Brief (Analyst)
Perguntas de uma em uma, não questionário. Saída `docs/brief.md`: problema, para quem, resultado esperado em número, restrições (prazo, stack imposta, integrações obrigatórias), **fora de escopo explícito** (mínimo 3 itens). **Pronto quando:** o dono lê e não corrige nada.

### 2.2 PRD (PM)
Saída `docs/prd.md`: funcionalidades agrupadas em épicos, cada épico com **DoD verificável por humano em uma sessão** (o que o dono abre, clica ou consulta para dizer "pronto") e prioridade. Nada de story. **Pronto quando:** cada épico tem DoD e o dono ordenou os épicos.

### 2.3 Arquitetura (Architect)
Saída `docs/arquitetura.md` + `docs/adr/NNNN-*.md` (um ADR por decisão de stack ou fronteira; template em `templates/ADR.md`). Obrigatório definir aqui, porque o config nasce disto:
- Stack e comandos reais de typecheck, teste, build, lint
- Modelo de dados e **zona proibida** (o que o loop nunca escreve, tabela por tabela)
- Fronteiras de módulo: quais diretórios pertencem a que frente (vira `pathspec_allowlist` comum da frente)
- **Paths de alto risco** (auth, billing, schema, RLS): juiz forte obrigatório
- Identidade (origin, ref do banco/ambiente)
- Estratégia de teste: o que é unit, o que é smoke na staging, qual é o `smoke_cmd`

**Pronto quando:** `docs/fila/000-config.json` está preenchido sem placeholder e `jq .` passa.

### 2.4 Conversor MAPA
Passo que o BMAD não tem. Épicos → blocos (**sem faixa de IDs**: ID de ticket é ordem de fila, sequencial global — ver SKILL.md, Roadmap hierárquico); funcionalidades → frentes, cada frente com allowlist comum, deps por ID, DoD herdado do épico, status inicial `rascunho`. Saída: `docs/roadmap/MAPA.md` (humanos) e `docs/roadmap/mapa.json` (máquina). Templates em `templates/MAPA.md` e `templates/mapa.json`.

Opcional: `task-master parse-prd` gera a decomposição inicial com deps; o adaptador (`orq mapa importar`) converte tasks em **frentes**, nunca em tickets, e o `tasks.json` vira espelho descartável. Fonte é `mapa.json`.

**Pronto quando:** `orq mapa lint` verde (ver 3).

### 2.5 Marcar frentes `pronta`
O dono marca `pronta` só as frentes que o planejador pode decompor agora. Regra: no máximo 2 frentes `pronta` por bloco, e só de um bloco por vez no início. Frente `pronta` sem deps satisfeitas é erro de lint.

## 3. Definition of Ready da Fase 0 (checado por `orq dor`)

| Item | Verde quando |
|---|---|
| Artefatos | `docs/brief.md`, `docs/prd.md`, `docs/arquitetura.md`, ≥1 ADR, todos versionados (`git ls-files`) |
| Config | `jq .` válido, zero `<placeholder>`, `gates[].cmd` rodam (rc 0 ou baseline medido), `paths_alto_risco` e `zona_proibida` não vazios ou marcados `revisado_humano: true` |
| MAPA | `mapa.json` válido; `faixa_ids` NÃO existe na v2 (se um bloco legado ainda o traz, ele é histórico e o lint o ignora); todo bloco tem `dod` não vazio; toda frente tem `allowlist` não vazia, `bloco` existente, `deps` que existem, `status` em {rascunho, pronta, em_andamento, concluida, bloqueada_humano}; MAPA.md cita exatamente os mesmos IDs (lint cruzado) |
| Recon (brownfield) | todo path das allowlists existe no disco ou a frente está marcada `cria_novo: true` |
| Zona proibida × allowlists | interseção vazia |
| Frentes `pronta` | deps satisfeitas; ≤2 por bloco |

`orq dor` imprime a tabela e sai com rc ≠ 0 em qualquer item vermelho. Fase 1 não começa sem DoR verde.

## 4. Fase 0 é recorrente

Entrada: `docs/fila/decisoes-pendentes.md` (escrito pelo planejador e pela sentinela). Cada linha: `data · origem · frente/ticket · pergunta · opções que a máquina viu`. Sessão `/arquitetar --decisoes` percorre as pendências, o dono decide, o agente grava a decisão onde ela mora (ADR, mapa.json, config, liberações) e remove a linha. **Ritual:** 20 min, 2 a 3 vezes por semana, junto com a promoção. Se a lista passa de 10 linhas, o MAPA está ambíguo demais: volta ao 2.4.

## 5. Anti-padrões da Fase 0

- Arquitetar sem recon em brownfield. A arquitetura descreve um sistema que não existe e o gate de recon descarta todo candidato.
- Frente grande demais (> 8 tickets estimados). O planejador gera lotes que se sobrepõem e o merge conflita. Quebrar frente é trabalho do dono, não do planejador.
- DoD de épico em prosa ("usuário consegue usar"). O bloco nunca fecha porque ninguém sabe o que verificar.
- Zona proibida gerada e aceita no automático. Na dúvida, proibir; liberar depois é barato.
- Deixar BMAD completo instalado. SM/Dev/QA do BMAD vão competir com o loop na primeira sessão em que alguém invocar o papel errado.
