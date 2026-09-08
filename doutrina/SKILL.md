---
name: orquestrador-autonomo
description: Montar e operar um orquestrador autônomo de desenvolvimento num repositório, novo ou existente. Fase 0 arquiteta junto com o dono (BMAD enxuto + Superpowers) e gera o roadmap; Fase 1 monta a fundação (gates que medem); Fase 2 roda em loop autoalimentado (planejador escreve tickets, executor implementa em worktree via Claude Code headless, gates mecânicos + juiz-LLM validam, sentinela transforma bugs em tickets); Fase 3 promove para produção com merge humano. Use esta skill sempre que o usuário quiser: criar/replicar um orquestrador, "fábrica de tickets", loop autônomo, fila que se alimenta sozinha, esteira de agentes, executor+avaliador, arquitetar um projeto novo para rodar no loop, escrever tickets para a fila, integrar task-master/aider/RTK/Agent Canvas ao loop, ou diagnosticar um loop existente.
---

# Orquestrador Autônomo v2: doutrina replicável

Sistema provado em produção (Comarka OS, ago/2026): 19 tickets aprovados na primeira noite, ciclos 100% autônomos, cada regra abaixo paga por um incidente real. A v2 adiciona o que faltava para tirar o humano da operação: o loop passa a **escrever os próprios tickets** (planejador), **transformar bugs em tickets** (sentinela) e **nascer junto com o projeto** (Fase 0).

**MOTOR ÚNICO VERSIONADO.** Esta skill transfere a lógica; o `orquestrador-kit` transfere o
CÓDIGO. Não existe "gerar a implementação em cada repo": existe UM motor, versionado, sem
premissa de repo, instalado por `bash instalar.sh --novo <repo>` e atualizado por
`--atualizar`. O que varia entre repos vive inteiro em `docs/fila/000-config.json` — gates,
zona proibida, identidade, modelos, orçamento, branch de staging, prefixo de worktree.

Isto substitui a regra v1 "nunca copie scripts de outro repo". A regra estava certa sobre o
sintoma e errada sobre o remédio: copiar carrega premissa local, mas *reimplementar* carrega
premissa nova a cada repo — e três implementações do mesmo loop divergem em silêncio, cada
uma com os próprios bugs, nenhuma com os testes das outras. A premissa local se combate
tirando-a do código, não multiplicando o código. Três premissas do repo de origem foram
extraídas do motor em set/2026 e cada uma virou config ou detecção: nome de pacote do
monorepo, nome de gate na linha `GATE`, e label do launchd.

**Corolário operacional: editar o motor vendorizado dentro de um repo é NO-GO no pré-voo.**
`bash instalar.sh --verificar <repo>` compara byte a byte; divergência é o repo tendo saído
do kit. Mudança de motor é sessão no kit, com teste, e chega no repo por `--atualizar`. Um
motor editado no lugar é um motor sem teste, sem revisão e sem caminho de volta.

## As 4 fases (o mapa inteiro)

```
FASE 0  ARQUITETAR   interativo, dono + agente. BMAD enxuto dentro do repo.
                     Saída: brief, PRD, arquitetura, ADRs, MAPA (blocos → frentes), config.
                     Recorrente: toda decisão que a máquina não pode tomar volta para cá.
FASE 1  FUNDAÇÃO     gates que existem e medem. Greenfield: scaffold + suite + baseline.
                     Brownfield: remediação do que falta. Termina em pré-voo GO total.
FASE 2  LOOPS        uma drenagem = pré-voo ⚡ → executor → sentinela → planejador → aviso.
                     Roda agendado ou contínuo. Sem humano no caminho feliz.
FASE 3  PROMOÇÃO     relatório semanal gerado pela máquina. Merge staging → principal: humano.
```

Portas de entrada: **projeto novo** entra na Fase 0 do zero; **projeto existente** entra na Fase 0 em modo brownfield (recon do repo antes de arquitetar o que falta). Detalhes: `references/fase-0-arquitetar.md`, `references/fundacao.md`, `references/autoalimentacao.md`.

## Arquitetura da Fase 2 (o desenho que funciona)

```
mapa.json (frentes prontas)             sinais (suite, smoke, runtime errors, advisors)
      │                                          │
   PLANEJADOR (fila < limiar)                 SENTINELA (pós-merge)
      │ candidatos                               │ candidatos de bug
      └──────────────► GATE DE TICKET ◄──────────┘
                       1. lint de schema
                       2. recon no disco (todo path/rota/tabela citado existe)
                       3. teste vermelho (critérios-alvo FALHAM na base atual)
                       4. cap de diff estimado + allowlist
                       5. sobreposição com pendentes ⇒ dependência obrigatória
                       6. classe de risco (script; modelo barato só na dúvida)
                       7. juiz de ticket (modelo forte; só para origem ≠ humano)
                              │ pendente
fila (docs/fila/*.md, JSON como fonte de máquina)
  → local-loop (drenagem inteira por disparo; lock único; cooldown; orçamento)
    → executor (por ticket): worktree limpa → context pack → claude -p headless → commit
      → PIPELINE FAIL-FAST (barato primeiro, caro depois):
         1. preflight de identidade (repo + banco certos; divergência = aborta)
         2. enforcement por diff (allowlist + zona proibida; falha o processo)
         3. typecheck vs baseline (nunca vs zero absoluto)
         4. suite de testes (inclui o teste do próprio enforcement)
         5. critérios mecânicos do ticket (cmd + espera)
         6. build
         7. SÓ ENTÃO o juiz-LLM (nível por classe de risco; independente)
    → aprovado: merge --no-ff em staging + push da staging + writeback
    → reprovado: retry com diagnóstico estruturado (máx N; último com modelo forte)
    → adiado: rate-limit/timeout/pré-condição/orçamento → pendente SEM consumir retry
    → refatiar: reprovação MECÂNICA (diff cap, fora da allowlist) → volta ao planejador, sem retry
```

Papéis: **script decide o que dá para decidir sem modelo; modelo barato classifica; modelo médio executa e planeja; modelo forte julga e faz o último retry.** O juiz nunca lê resumo do executor: só diff cru + outputs dos gates + critérios do ticket. Planejador e sentinela são **fases da mesma drenagem**, no mesmo processo e sob o mesmo lock do executor. Nunca daemons paralelos: um segundo braço escrevendo na fila viola a fonte única de estado.

## As 12 regras inegociáveis (v1, pagas com incidente)

1. **Critério executável ou não entra na fila.** Todo aceite é `cmd` + `espera` rodável por máquina. "Funciona" sem comando não é critério. Subjetivo vira critério de juiz explícito, nunca prosa solta.
2. **A fronteira é código, não prompt.** O que o loop pode tocar = `pathspec_allowlist` verificada no diff + guards físicos que **falham o processo**. Instrução no prompt é desejo; enforcement é lei.
3. **Três estados, não dois.** aprovado / reprovado / **adiado**. Limite de API, timeout e dependência ausente não consomem tentativa: voltam a pendente com cooldown. Sem isso o loop se auto-esgota.
4. **Fonte única de estado.** Fila + git num único checkout. Qualquer braço rodando de casa paralela cria dois estados que parecem ambos válidos, pior que falhar.
5. **Log não é verdade; git é o ground truth.** Toda auditoria termina em `git log`/diff, nunca no relatório do agente. Modelo declara concluído sem executar; o git não mente.
6. **Fail-fast por custo.** Nenhuma chamada cara (juiz, retry) antes de todos os cheques baratos passarem. Diff acima do cap reprova mecanicamente ("fatiar o ticket") sem gastar juiz.
7. **Fronteiras duras fora da autonomia, sempre:** push na branch principal, DDL aplicada (o loop só *escreve* `.sql`), escrita em zonas proibidas, credenciais, gasto real de dinheiro. Dependência de humano é cidadã da fila: `humano:<token>` resolvida por um arquivo de liberações.
8. **Evidência é sagrada.** Prompt, diff cru, output do juiz e de cada gate ficam preservados em `runs/<id>/attempt-N/`. Foi o cru do juiz que provou, num incidente real, que o parser errava, não o veredicto processado.
9. **Read-back sempre; amnésia por design.** Depois de escrever estado, reler do disco/git. Cada rodada reconstrói o estado da fonte única, nunca de memória de execução anterior.
10. **Todo incidente vira linha no PLAYBOOK no mesmo commit que o corrige.** A doutrina só vale se for memória viva.
11. **Todo comando de preparação tem rc checado.** Criar worktree, copiar env, resolver base: se falhar, **aborta o ticket**, nunca segue. `cmd || abortar` em cada passo de preparação, sem exceção. (Incidente real: `git worktree add` falhou com "already exists", o executor seguiu e rodou o agente num diretório órfão.)
12. **Estado de segurança mora em arquivo, nunca em variável de ambiente.** Supressão de push, modo dry-run, travas temporárias, kill switches: tudo em `docs/fila/000-config.json` ou arquivo-sentinela versionável, lido a cada disparo e entre tickets. Flag que depende de quem digitou o comando lembrar do prefixo é flag que um dia falta.

## As 8 regras da v2 (pagas por design; rebaixe para "hipótese" se a evidência contradisser)

13. **Ticket gerado por máquina é candidato, não ticket.** Só vira `pendente` depois do gate de ticket inteiro. Candidato que falha é `descartado` com motivo, nunca "corrigido" pelo gate. O planejador aprende pelo motivo no lote seguinte; o gate não conserta.
14. **Teste vermelho antes de implementar.** Todo critério do tipo `alvo` precisa FALHAR na base atual antes do ticket entrar. Critério que já passa não mede nada e é a raiz de "aprovado sem fazer nada". Guardas de regressão (typecheck não regride) são tipo `guarda` e podem estar verdes.
15. **Planejador decompõe; nunca inventa.** Só transforma em tickets frentes que o dono escreveu no MAPA e marcou `pronta`. Ambiguidade, dependência não mapeada ou conflito com ADR vira linha em `decisoes-pendentes.md` e a frente fica `bloqueada_humano`. Loop que cria escopo para si mesmo queima cota em coisa que ninguém pediu.
16. **Sinal só vira ticket com threshold, baseline e quarentena.** Sentinela abre ticket para hash novo em relação à baseline, com N ocorrências na janela, que não toque arquivo mergeado pelo próprio loop nas últimas 24h nem paths do harness. Fora disso: decisão pendente para humano. Sem isso a sentinela é a maior geradora de ticket inútil e de oscilação corrige-quebra-corrige.
17. **Orçamento é gate, não relatório.** Teto diário e por ticket em tokens/USD, contabilizado por script a partir do usage real. Estourou = adiado + notificação, nunca "termina só este".
18. **Contexto é montado por script, com cap.** O executor recebe context pack derivado mecanicamente do ticket (arquivos da allowlist + assinaturas do que ela importa via repo map + ADR relevante), nunca o repo inteiro nem exploração livre. Modelo médio com contexto pequeno erra menos que modelo forte com contexto grande.
19. **Reprovação mecânica não gera retry.** Diff fora da allowlist, acima do cap ou em zona proibida devolve o ticket como `refatiar` ao planejador (ou ao humano se `origem: humano`). Retry é só para erro de implementação com todos os cheques mecânicos verdes.
20. **Harness, roadmap e doutrina nunca passam pela fila.** Nem como ticket do planejador, nem como bug da sentinela. Mudança neles é sessão interativa com diff revisado por humano. Corolário: bug que a sentinela detecta em `scripts/orquestrador/**` ou `docs/orquestrador/**` vira decisão pendente, nunca candidato.

## Custo e token (as alavancas, em ordem de impacto)

Detalhe e números em `references/custo-e-contexto.md`. Resumo obrigatório:

1. **Script antes de modelo, barato antes de forte.** Escada: script → classificador barato → executor/planejador médio → juiz forte. Forte nunca em outra coisa.
2. **Context pack mecânico** (regra 18) com cap de tokens no config. Repo map gerado a cada merge na staging (`orq mapa-repo`), consultado em vez de `ls`/`cat` livre.
3. **Prefixo estável para cache**: doutrina + config + repo map + PLAYBOOK sempre na mesma ordem e antes do ticket. Ticket e context pack por último.
4. **Auto-verificação dentro da sessão do executor, teto 2**: rodar gates do ticket antes de commitar e corrigir. Falha corrigida na sessão custa fração de um ciclo (worktree, juiz, retry).
5. **Retry com diagnóstico estruturado** (JSON ≤ 500 tokens: gate, arquivo, linha, esperado vs obtido), nunca o log inteiro.
6. **Juiz em dois níveis por classe de risco**: baixo com gates verdes e diff pequeno → juiz médio; alto (schema, auth, pagamento, regra de negócio, RLS) → forte, sempre. Veredicto JSON com cap.
7. **Saída de comando compactada** (padrão RTK) no executor: `git diff`, runner de testes e listagens filtrados por script antes de entrar no contexto.
8. **Executor não narra.** Sem resumo, sem explicação final. Output útil é commit; o juiz não lê resumo mesmo.
9. **Sentinela e planejador em lote pequeno e just-in-time** (3 a 5 candidatos, só quando a fila cai abaixo do limiar).
10. **Três números semanais em `STATUS.md`**: tokens por ticket aprovado, aprovação de primeira, causa nº 1 de reprovação. A semana ataca só a causa nº 1.

## Observabilidade obrigatória (o humano precisa ver sem escavar)

Log verboso não é observabilidade. Quatro artefatos, sempre (contrato em `references/observabilidade.md`):

- **Snapshot sobrescrito** (`runs/STATUS.md`): estado atual em ~10 linhas. A v2 acrescenta linhas `CUSTO` (hoje/teto), `PLANEJADOR` (última reposição, descartes) e `SENTINELA` (sinais novos, quarentena). **Sobrescrito**, nunca append.
- **Trilha de eventos** (`runs/events.log`): 1 linha por transição, `ts id EVENTO chave=valor`. Eventos novos da v2: `CANDIDATO`, `DESCARTADO`, `REFATIAR`, `SINAL`, `QUARENTENA`, `DECISAO_PENDENTE`, `ORCAMENTO`, `REPOSICAO`.
- **Um comando de consulta** (`orq`), read-only por construção. Subcomandos novos: `orq custo`, `orq decisoes`, `orq sinais`, `orq relatorio`.
- **Notificação de fim de drenagem** com placar, custo e decisões pendentes. "Acabou?" não exige polling.
  **O canal PADRÃO é `arquivo`** (`runs/notificacoes.log`), e não a notificação nativa do sistema. Motivo:
  o loop roda headless, sob launchd/cron/CI, muitas vezes sem sessão gráfica e às vezes noutra máquina —
  canal que depende de sessão falha exatamente quando o humano não está olhando, que é quando a notificação
  serve para alguma coisa. Arquivo é `tail`-ável, sobrevive a reboot, entra no `git`-ignore e não tem
  credencial para expirar. Qualquer outro canal é acréscimo, e todo acréscimo mantém o fallback em arquivo.

## Ciclo de vida do processo (matar o loop tem que matar o loop)

- **Executor roda em process group próprio** e o `trap` do loop encerra o grupo, não só o filho direto. Órfão continua com o ambiente da invocação anterior, inclusive **sem** as flags de segurança da invocação nova, e pode fazer push que estava suprimido. (Incidente real.)
- **Sinal não interrompe chamada síncrona.** `SIGTERM` durante um `spawnSync` do agente só é atendido quando a chamada retorna; handlers de sinal são rede para morte ENTRE tickets, não botão de parada. Parar o loop = desagendar (ou escrever `docs/fila/PAUSAR`) + esperar o disparo corrente terminar. `kill -9` garante ticket órfão e cota desperdiçada.
- **Modo contínuo** é uma sequência de drenagens com `sleep` entre elas, no mesmo processo, relendo config e kill switches a cada ciclo. Não é um `while true` em volta do executor.
- **Status `em_execucao` sempre com pid + timestamp**; toda drenagem faz staleness: pid morto ou idade > timeout ⇒ volta a `pendente` com nota. Sem isso um ticket vira zumbi e a fila parece vazia.
- **Worktree é descartada no caminho de sucesso**, não só no de erro. Branch de ticket bloqueado permanece (evidência); worktree mergeada, não. (Incidente real: 37 worktrees acumuladas.)
- **Timeout é `adiado`, não `reprovado`**, inclusive no contador de retry. Verifique na implementação; a regra 3 é fácil de escrever no doc e fácil de furar no shell.
- **Falha de autenticação do agente é `adiado`** e o pré-voo ⚡ a detecta ANTES de tocar qualquer ticket, abortando a drenagem inteira. (Incidente real: OAuth expirado → stdout vazio → lido como diff vazio → 3 tickets bloqueados por uma condição de 30 segundos.)

## Colisão de teste entre tickets (a classe de falha mais cara)

Ticket que **unifica, remove ou renomeia** uma regra quebra os testes dos tickets anteriores que afirmavam a regra antiga. O agente fica preso: fazer a tarefa certa reprova no gate de testes, e os testes quebrados estão fora do `pathspec_allowlist` dele. Três remédios, os três necessários:

1. **Na escrita do ticket** (vale para humano E planejador): rodar a suíte mentalmente contra a mudança e incluir os testes dependentes na allowlist, **sempre com critério de juiz anti-afrouxamento**: "valores esperados RECALCULADOS sob a nova regra, com o porquê em comentário; nenhuma asserção removida, nenhum `toBe` trocado por `toBeDefined`, nenhum `skip`, nenhum teste deletado". O gate de ticket verifica mecanicamente: se a allowlist inclui `*.test.*`, o critério anti-afrouxamento tem que existir.
2. **No harness:** quando o gate de testes falha, extrair os **arquivos** quebrados e comparar com a allowlist. Arquivo fora dela ⇒ diagnóstico explícito no retry ("reporte no commit, não contorne") e resultado `adiado` com diagnóstico, não `bloqueado` cego.
3. **No roadmap:** tickets que tocam a mesma superfície declaram dependência por ID. O gate de ticket (passo 5) força isso.

## Como montar num repo (novo ou existente)

**Regra zero: a skill vive DENTRO do repo (vendoring obrigatório).** O loop roda headless (`claude -p`, launchd/cron/CI): não existe acesso a skills de chat, uploads ou memória de sessão. O primeiro artefato de qualquer instalação é a cópia integral desta skill (SKILL.md + references/ + templates/) em `docs/orquestrador/skill/`, commitada — e quem a copia é o `instalar.sh` do kit, junto com o motor e no mesmo carimbo de `VERSAO`. A partir daí:

- O briefing do executor são **3 arquivos + 1 derivado**: `docs/orquestrador/skill/EXECUTOR.md` (extrato de ≤ 60 linhas da doutrina, só o que o executor precisa), `docs/fila/000-config.json` (decisões locais), o ticket da vez (escopo) e o context pack gerado mecanicamente a partir do ticket. A SKILL.md completa é para humanos, juiz de ticket, planejador e sessões de manutenção. Nenhuma instrução solta fora deles.
- Evolução da doutrina = commit na cópia local + (se universal) retorno para a skill-mãe. Divergência silenciosa entre repo e skill-mãe é dívida: anote no PLAYBOOK qual regra é local e por quê.

**A skill não assume stack.** Todo comando e caminho do config nasce de **evidência no disco do repo alvo**: package manager pelo lockfile COMMITADO, runner pelo config real, build pelo script real, migrations pelo diretório real, identidade pelo `.env` real. Onde a evidência não existir, vira item de remediação da Fase 1, não um chute.

**Ordem:** `references/fase-0-arquitetar.md` → `references/fundacao.md` → `references/setup.md` (scripts) → `references/pre-voo.md` (GO/NO-GO, agora com categoria 8) → `references/autoalimentacao.md` (ligar planejador e sentinela, nesta ordem: sentinela primeiro, planejador em dry-run, depois automático). Ferramentas externas e onde cada uma entra: `references/ferramentas.md`.

Decisões que SÃO específicas de cada repo (a skill não decide por você):

| Decisão local | Exemplo do repo de origem |
|---|---|
| Fronteira intocável (tabelas/paths que o loop nunca escreve) | zona C0: `clientes_receita`, `trafego_*`, `vw_*` |
| Baseline de typecheck (erros herdados tolerados, por escopo) | 3 erros, todos em `qualificacao*` |
| Gates padrão (comandos reais do projeto) | `npx tsc --noEmit` · `npx vitest run` · `npm run build` |
| Identidade (o que o preflight confirma) | origin contém `org/repo` + ref do banco no `.env` |
| Branch de staging + política de retry/cooldown/diff-cap | `staging-auto` · 2 retries · 60min · 2500 linhas |
| Paths de alto risco (juiz forte obrigatório) | `supabase/**`, `src/auth/**`, `src/billing/**` |
| Prefixos de comando permitidos em critérios | `npx vitest`, `npx tsc`, `npm run`, `node scripts/`, `curl http://localhost` |
| Fontes da sentinela e credenciais read-only | suite + smoke + Vercel runtime errors + Supabase advisors |
| Orçamento (tokens/dia, USD/dia, por ticket) | medido nas 2 primeiras semanas, depois fixado |
| Canal de notificação | **`arquivo` é o padrão** (`runs/notificacoes.log`); nativa/webhook/e-mail são opção |

### Roadmap hierárquico (anti-perdição)

```
BLOCO (épico)  → "por que existe": DoD + gates humanos. Contexto p/ humanos.
  └─ FRENTE    → "o que entrega": allowlist comum + deps por ID + status. Unidade que o planejador decompõe.
       └─ TICKET → "como verificar": cmd + espera, cabe no diff cap. ÚNICO nível que entra na fila.
```

- Fonte única: `docs/roadmap/MAPA.md` (humanos) + `docs/roadmap/mapa.json` (máquina), ambos no repo, com lint que os confere um contra o outro (`orq mapa lint`). Ferramentas externas (Notion, task-master) recebem espelho via writeback, nunca o contrário.
- **ID é ORDEM DE FILA, sequencial global — não faixa por bloco.** A v1 dava a cada bloco uma faixa
  (B1=100–199, B2=200–299…) para que o ID sozinho carregasse o contexto. O custo apareceu em campo
  (conteudos-infinitos, 2026-09-04): os blocos progridem em PARALELO e o loop drena em ordem de ID, então
  faixa por bloco vira **prioridade por bloco** — o B1 inteiro passa na frente do B2 porque começa com 1.
  Prioridade é decisão de produto e tem de ser explícita, não um efeito colateral da numeração.
  A pertença vive nos campos `bloco` e `frente` do JSON do ticket, que é onde uma máquina consegue lê-la;
  o ID carregar contexto era conveniência para o olho humano, e custava caro.
- Todo ticket declara `bloco`, `frente` e `origem`. Bloco e frente ficam FORA do prompt do executor: quanto menos contexto ele precisa, menos se perde.

## Armadilhas conhecidas (não replicar; corrigir na origem)

- **Parser do veredicto:** extrair o JSON do output cru com tolerância a lixo; **falha de parse = adiado**, nunca reprovação. Vale para juiz, classificador e planejador.
- **Branch de ticket bloqueado não é deletada** até revisão humana.
- **Writeback externo (Notion, MAPA, PRD)** é upsert de seção única, nunca append.
- **Relatório/notificação precisa de fallback em arquivo** quando a credencial faltar.
- **Merge manual guiado por humano:** resolução de conflito completa antes de qualquer `add`/`commit`.
- **Nunca reiniciar o serviço com run vivo**; checar lock/pid antes.
- **Critério vermelho pelo motivo errado:** `cmd` com typo falha antes e depois da implementação e queima os retries. O gate classifica o vermelho (rc 126/127, timeout, erro de sintaxe = `invalido`, ticket descartado).
- **Sentinela alimentando a si mesma:** bug introduzido por merge do loop, corrigido pelo loop, reintroduzido pelo próximo ticket da mesma frente. Quarentena de 24h + dependência forçada entre o bug e o ticket que tocou o arquivo.
- **Planejador repetindo candidato descartado:** todo descarte grava hash do candidato; hash repetido dentro de 7 dias é descartado sem gastar gate. Dois lotes seguidos 100% descartados ⇒ frente `bloqueada_humano`.

## Escrevendo tickets para a fila (o gargalo real)

O throughput do loop é limitado pela qualidade do ticket. Valem para humano e planejador:

- **Recon-de-fonte é gate, não etiqueta:** todo nome de tabela/rota/arquivo citado é verificado no disco antes de entrar. "Existe no brief" ≠ existe no disco.
- **Granularidade:** *um ticket = uma unidade que, se reprovar, você aceita refazer inteira.* Diff estimado > 600 linhas → fatiar. Mais de uma camada (schema + backend + UI) → fatiar por camada. Menos de ~50 linhas e mesma camada do vizinho → juntar. UI: **uma tela por ticket**.
- **Robusto > exato** nos critérios: código HTTP, contagem, substring estável.
- **Deps referenciam o campo `id` do JSON**, nunca o nome do arquivo.
- **Allowlists sobrepostas entre pendentes exigem dependência explícita.**
- Ao evoluir UI registrada em registry compartilhado, o critério de juiz cobra **integração** ("importado e montado"), não só existência.
- **Pelo menos um critério `alvo` vermelho.** Ticket só de guardas não entra.
- **`risco` é DERIVADO, não exigido de quem escreve.** Quem escreve o ticket declara a chave e a deixa
  vazia (`"risco": ""`); quem a preenche é o passo 6 do gate, por script, com modelo barato só na dúvida.
  Pedir a classificação ao autor troca uma medida por uma opinião — e o autor é justamente quem tem
  interesse em que o ticket dele seja "baixo". Vale o mesmo para `dependencias: []`: chave presente e lista
  vazia é o caso NORMAL (63 dos 74 tickets de um repo real), não campo por preencher. O gate cobra que a
  CHAVE exista, nunca que ela tenha valor — cobrar valor seria o gate reprovando ticket por não ter feito o
  que o próprio gate ainda vai fazer. (conteudos-infinitos, 2026-09-07: a primeira versão do check 2
  reprovou os 7 pendentes por isso.)

## Quem escreve o harness (fronteira permanente)

Instrumentação e correção do harness **não são ticket de fila**. O orquestrador julga o próprio trabalho pelos gates que o harness executa; se o harness se modifica sozinho, um bug dele esconde um bug dele. Quando o loop está quebrado, o conserto NUNCA vai pela fila.

**E não é feito no repo instalado.** Desde a v2 o harness é o `orquestrador-kit`: mudança no
executor/loop/enforcement/planejador/sentinela/gate de ticket é sessão **no kit**, com teste
que prova a mudança na peça que a pede, e chega nos repos por `instalar.sh --atualizar`. O
repo instalado recebe o motor; não o edita. `instalar.sh --verificar` é a asserção disso, e
diverge alto quando alguém editou no lugar.

**Por que a fronteira precisa de código e não de disciplina** (incidente real, 2026-09-08):
o "vermelho antes" de uma peça do próprio kit rodou o instalador ANTIGO — que ignorava
`--dry-run` — e CARREGOU um job de launchd de verdade, apontando para um fixture em
`/private/tmp`, por 1h40, com três disparos morrendo em `rc 127`. Ninguém percebeu porque
"job carregado" foi lido como "job saudável", e nada media o contrário; a detecção veio de um
`launchctl print` humano. O conserto não foi cuidado: foi um stub de `launchctl` no PATH dos
testes e uma RECUSA no instalador contra checkout sob `/tmp` ou com `ORQ_TESTE=1`.
Disciplina não sobrevive à sexta-feira — a mesma frase que o repo de origem já tinha escrito
sobre evidência falsa, aprendida de novo do outro lado.

## Critérios de maturidade (o que libera cada camada)

Não ligue a camada seguinte sem a anterior madura:

| Camada | Liga quando |
|---|---|
| Executor agendado | fixture ponta a ponta + teste de lock (pré-voo cat. 7) |
| Sentinela | executor com ≥7 dias sem intervenção manual E ≥70% de aprovação de primeira E PLAYBOOK sem lição nova por 3 dias |
| Planejador em dry-run (gera candidatos, humano promove) | sentinela 1 semana sem falso positivo em quarentena |
| Planejador automático | ≥80% dos candidatos do dry-run promovidos sem edição, por 2 semanas |
| Modo contínuo | orçamento fixado em config a partir de medição real E notificação de fim funcionando |

Não prometa autonomia plena antes disso. O sistema entrega ~70 a 80% da operação de execução; o que sobra para o humano é decisão de produto, DoD de bloco, promoção para produção e revisão de bloqueados.
