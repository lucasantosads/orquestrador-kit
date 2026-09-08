# Fase 2 autoalimentada: gate de ticket, planejador, sentinela, orçamento, promoção

Contrato do **que** existe e **qual o formato**. O **como** (shell, node, python) é decisão local, escrita a partir da evidência do repo. Regras 13 a 20 da SKILL detalhadas aqui.

## 0. Anatomia de uma drenagem (um processo, um lock)

```
disparo (agendador ou ciclo do modo contínuo)
  0. lock (pid + idade máx) · ler config · ler kill switches (PAUSAR, loops.*.ativo)
  1. pré-voo ⚡ (identidade, auth do agente, toolchain, fila, orçamento do dia)
  2. staleness: em_execucao com pid morto/idade > timeout → pendente + nota
  3. EXECUTOR: drena pendentes processáveis (deps ok, cooldown ok, orçamento ok), sentinela primeiro
     3a. ticket humano sem `gate_ok` ⇒ passos 1 a 6 do gate antes de gastar; falha ⇒ `refatiar` + decisão pendente
     3b. re-teste vermelho (script): todo `alvo` já verde na staging ⇒ `descartado motivo=ja_verde`, zero gasto
     3c. `risco` vazio ⇒ classificar agora (passo 6) antes de escolher o juiz
  4. SENTINELA (se ativo e houve ≥1 merge nesta drenagem): coleta sinais → candidatos
  5. PLANEJADOR (se ativo e pendentes < limiar): próxima frente pronta → candidatos
  6. GATE DE TICKET: todo candidato gerado em 4 e 5 → pendente | descartado
  7. writeback (STATUS, MAPA/PRD, espelhos) · relatório se for dia de relatório
  8. notificação de fim · liberar lock
```

Planejador e sentinela **nunca** rodam fora dessa sequência. Não há daemon deles. Modo contínuo = `sleep intervalo_min` e volta ao passo 0, relendo tudo.

## 1. Estados e campos novos do ticket

| Status | Quem escreve | Significado |
|---|---|---|
| `candidato` | planejador, sentinela | gerado, aguardando gate de ticket |
| `descartado` | gate de ticket | reprovou no gate; `notas_status` diz em qual passo. Nunca reexecutado; hash guardado 7 dias |
| `pendente` | gate (ou humano) | pronto para o executor |
| `em_execucao` | executor | + `pid`, `iniciado_em` |
| `done` | executor | mergeado na staging |
| `bloqueado` | executor | retries esgotados; branch preservada |
| `refatiar` | executor (gates mecânicos) ou gate 3a | diff cap / fora da allowlist / zona proibida / ticket humano reprovado no gate. `origem: planejador` ⇒ entra no context pack do próximo lote da frente, o planejador o substitui por tickets menores e o script marca o original `descartado motivo=refatiado`. `origem: humano` ⇒ linha em `decisoes-pendentes.md`. Não consome retry, não recebe retry |

`adiado` continua sendo **evento**, não status: o ticket volta a `pendente` com `adiado_ate` e `notas_status`.

Campos novos no JSON do ticket (ver `templates/TICKET.md`): `frente`, `origem` (`humano | planejador | sentinela`), `risco` (`baixo | alto`, preenchido pelo gate), `diff_estimado` (linhas, declarado por quem escreve), `hash_candidato` (sha256 de objetivo + allowlist + critérios + **deps**, para que a reemissão com dependência acrescentada seja um candidato novo), `sinal_hash` (só sentinela), `gate_ok` (timestamp do último gate verde), `criterios_aceite[].tipo` (`alvo | guarda | avaliador`).

## 2. Gate de ticket (7 passos, fail-fast, barato primeiro)

Roda para todo `candidato`. Tickets `origem: humano` passam pelos passos 1 a 6 no pré-voo cat. 8 e, quando entram depois disso, no passo 3a da drenagem antes de qualquer gasto (juiz opcional via `gate_ticket.juiz_para_humano`). Cada passo grava evidência em `runs/gate/<id>/`.

| # | Passo | Verde quando | Falha ⇒ |
|---|---|---|---|
| 1 | Lint de schema | JSON válido; campos obrigatórios; **`id` NÃO é validado contra faixa de bloco — IDs são sequenciais globais** (regra da v2; era faixa por bloco na v1); `bloco` e `frente` existem em `mapa.json` **e a frente pertence ao bloco declarado**; deps por `id` existentes; ≥1 critério `tipo: alvo` | descartado `schema` |
| 2 | Recon no disco | todo path da allowlist existe OU é `cria_novo`; todo arquivo/rota/tabela citado em `objetivo` existe (`git ls-files`, grep de rotas, lista de tabelas do recon); allowlist ∩ zona proibida = ∅; allowlist ∩ paths do harness = ∅ | descartado `recon` |
| 3 | Teste vermelho | em worktree descartável na HEAD da staging, com timeout `gate_ticket.timeout_cmd_secs`: cada critério `alvo` roda e **não** atinge `espera`; critérios `guarda` podem atingir. Classificação do vermelho: rc 126/127, "command not found", erro de sintaxe do shell, timeout ⇒ `invalido`. Precisa: ≥1 alvo `vermelho_valido`, zero `invalido`, zero alvo `verde` | descartado `vermelho` |
| 4 | Cap | `diff_estimado ≤ diff_cap_ticket` (600 default); allowlist ≤ `max_paths_allowlist`; allowlist com `*.test.*` ⇒ existe critério `avaliador` anti-afrouxamento | descartado `cap` |
| 5 | Sobreposição | allowlist ∩ allowlist de qualquer `pendente`/`em_execucao`/`candidato` do mesmo lote = ∅ OU dependência declarada entre eles | descartado `sobreposicao` (o planejador recebe o motivo e reemite com dep no próximo lote) |
| 6 | Classe de risco | script: qualquer path em `paths_alto_risco` ou palavra de `palavras_alto_risco` no objetivo ⇒ `alto`. Sem match ⇒ classificador barato (JSON `{"risco":"baixo|alto","motivo":""}`); falha de parse ⇒ `alto` | nunca falha; só classifica |
| 7 | Juiz de ticket | modelo forte, só `origem ≠ humano`. Vê: JSON do ticket, recon do passo 2, resultado do passo 3, frente no mapa. Cobra: granularidade, critério robusto, allowlist mínima, integração (não só existência), anti-afrouxamento, e que o critério `alvo` não possa ser satisfeito por teste tautológico (`expect(true)`), o que o juiz de diff também cobra depois. JSON `{"aprovado":bool,"motivo":"","ajustes_sugeridos":[]}`; falha de parse ⇒ candidato fica `candidato` (adiado), não descartado | descartado `juiz` com motivo |

**Segurança do passo 3 (executa comando escrito por modelo):** o `cmd` é quebrado em segmentos por `|`, `&&` e `;`. O **primeiro** segmento precisa começar com um item de `gate_ticket.cmd_prefixos_permitidos` (prefixos explícitos: `npm run test`, nunca `npm run` genérico, que alcançaria `npm run deploy`); os demais precisam ser filtros de `gate_ticket.filtros_permitidos` (`grep`, `wc`, `head`, `tail`, `jq`, `cut`, `sort`, `uniq`, `tr`). Qualquer token de `gate_ticket.proibido_no_cmd` (`$(`, crase, `>` que não seja `2>&1`, `sh -c`, `bash`, `eval`, `sudo`, `rm `, `curl` para host que não seja localhost) ⇒ `invalido`. Referência a qualquer path de `paths_harness` ⇒ `invalido`. Roda em worktree descartável, sem `.env` de produção, com timeout, e o worktree é removido depois. Critério HTTP (`curl localhost`) só é permitido se `gate_ticket.servidor_local_cmd` existir: o harness sobe o servidor na worktree com env de teste antes de rodar e derruba depois; sem isso, remova os prefixos `curl` da lista. Critério `alvo` deve rodar em menos de `timeout_cmd_secs`: suíte inteira é gate do harness, não critério de ticket. Tudo isso vale igualmente para o executor ao rodar critérios (passo 5 do pipeline).

**PRECEDÊNCIA entre `cmd_prefixos_permitidos` e `proibido_no_cmd` (decisão humana, 2026-09-07).** O
config já anotava o conflito em `_conflito_conhecido`: `proibido_no_cmd` veta `$(`, `> ` e `>>`, e
critérios REAIS da fila usam os três — por isso `test $(` está em `cmd_prefixos_permitidos`. A regra,
implementada em `scripts/orquestrador/gate-ticket.ts`:

- **(a)** a isenção por prefixo vale só para o **primeiro segmento** do `cmd`. Emendou `&&`, `|` ou
  `;`, cada segmento é avaliado por conta própria e o veto **volta a valer nos seguintes** — prefixo
  permitido autoriza UM comando, não tudo que vier pendurado nele;
- **(b)** redirecionamento isento é só `2>&1`, `>/dev/null` e `2>/dev/null`. Qualquer `>` ou `>>`
  para arquivo real **reprova sempre**, inclusive dentro de prefixo permitido: critério de aceite que
  escreve arquivo deixou de ser medição e virou efeito colateral;
- **(c)** `sh -c`, `bash`, `eval`, `sudo`, `rm`, `curl`, `wget` e crase **nunca** são isentos, em
  segmento nenhum;
- **(d)** o relatório do gate lista, por ticket, quais critérios passaram por isenção e por qual
  prefixo. **Isenção silenciosa é como o repo perde a regra de vista.**

O nome da chave é `gate_ticket.proibido_no_cmd`, e só ele: não existe `padroes_proibidos` no config.

Custo do gate: passos 1 a 5 são script (zero token). Passo 6 é barato e raro. Passo 7 é o único caro e só existe para candidato de máquina.

## 3. Planejador

**Gatilho:** `pendentes < planejador.limiar_fila` (3) e `planejador.ativo: true` e orçamento do dia com folga ≥ `planejador.reserva_orcamento_pct` (20%).

**Seleção da frente:** em `mapa.json`, a primeira frente com `status: pronta`, deps satisfeitas (frentes `concluida`), do bloco de menor ID em andamento. Uma frente por drenagem.

**Entrada (context pack da frente, montado por script, cap `contexto.cap_tokens_planejador`):**
1. Texto da frente no mapa (objetivo, allowlist comum, DoD do bloco)
2. Assinaturas dos arquivos da allowlist via repo map (não o conteúdo inteiro)
3. ADRs referenciados pela frente
4. Tickets já existentes da frente (id, objetivo, status), para continuidade e para não repetir; tickets `refatiar` da frente com o motivo, para substituir
5. Descartes dos últimos 7 dias da frente: motivo + objetivo resumido (≤ 20 entradas; aprendizado barato)
6. Regras de granularidade e o schema do ticket (do TICKET.md vendorizado)

**Saída:** lote de `planejador.lote` (3 a 5) candidatos JSON, cada um com `diff_estimado`, deps entre si quando a allowlist se sobrepõe, `origem: planejador`, IDs **sequenciais globais, continuando do maior ID já usado na fila** (o script atribui o ID, o modelo não). Modelo médio. Falha de parse ⇒ lote inteiro descartado como `parse`, evento `REPOSICAO motivo=parse`, e o planejador não roda de novo nesta drenagem.

**Pós-gate:** `n_descartados == lote` duas drenagens seguidas ⇒ frente `bloqueada_humano` + linha em `decisoes-pendentes.md` com os motivos agregados. O planejador não insiste.

**Fechamento de frente:** todos os tickets da frente `done` ⇒ frente `concluida` (writeback em mapa.json + MAPA.md + checkbox no PRD). Todas as frentes do bloco `concluida` ⇒ decisão pendente "validar DoD do bloco <id>" (gate humano; o bloco só fecha na Fase 3).

**Dry-run:** `planejador.modo: dry_run` gera candidatos e os deixa em `candidato` depois do gate (gate roda, promoção não). Humano promove com `orq promover <id>` ou descarta. A taxa de promoção sem edição é o critério de maturidade para `modo: auto`.

**O planejador nunca:** cria frente ou bloco, edita mapa além de status, escreve em paths do harness, gera ticket para frente que não está `pronta`, ultrapassa o lote.

## 4. Sentinela

**Gatilho:** `sentinela.ativo: true` e ≥1 merge na drenagem corrente (ou `sentinela.rodar_sem_merge: true` para varredura diária).

**Fontes (todas read-only; config `sentinela.fontes[]`):**

| Fonte | Coleta | Sinal |
|---|---|---|
| `suite_completa` | suíte inteira na HEAD da staging (não só a do ticket) | teste que falha: arquivo + nome |
| `smoke` | `smoke_cmd` contra preview/staging | rc ≠ 0 ou substring de erro |
| `runtime_errors` | provedor de deploy (ex.: Vercel runtime errors do deploy da staging), janela `sentinela.janela_min` | tipo + frame normalizado + contagem |
| `advisors` | provedor de banco (ex.: Supabase advisors) | categoria + objeto |
| `log_grep` | `grep -E` em logs locais/CI com padrões do config | linha normalizada |

**Normalização:** sinal = `{hash, fonte, arquivo, linha, mensagem_normalizada, ocorrencias, primeira_vez, ultima_vez}`. `hash` = sha256 de `fonte + arquivo + mensagem sem números/ids/timestamps`. Tudo em `runs/sentinela/sinais.json` (sobrescrito) e `runs/sentinela/baseline.json` (o que já era conhecido).

**Regras para virar candidato (todas obrigatórias):**
1. `hash` não está na baseline (é novo) OU está mas com `ocorrencias` ≥ 3× a baseline
2. `ocorrencias ≥ sentinela.ocorrencias_min` (3) dentro de `janela_min` (fontes `suite` e `smoke` contam como 3 por serem determinísticas)
3. Não há ticket `candidato | pendente | em_execucao` com o mesmo `sinal_hash` (dedupe)
4. `arquivo` não foi tocado por merge do loop nas últimas `sentinela.quarentena_horas` (24). Se foi ⇒ **quarentena**: decisão pendente com o ticket que tocou o arquivo, evento `QUARENTENA`
5. `arquivo` fora de `paths_harness` e `zona_proibida` (senão decisão pendente, regra 20)
6. Cap: `sentinela.max_candidatos_drenagem` (3) e `max_candidatos_dia` (6)

**Candidato de bug:** modelo médio recebe o sinal + trecho do arquivo (via repo map, cap) e escreve o ticket. Regra dura: o critério `alvo` principal é o **comando de reprodução** derivado do sinal (rodar o teste que falha, `curl` da rota que dá 500, query do advisor). Se o modelo não consegue produzir reprodução executável, não há candidato: decisão pendente com o sinal. O gate de ticket roda igual (o teste vermelho aqui é a reprodução falhando, o que fecha o ciclo).

**Staging vermelha (o caso que travaria a fila inteira):** se `suite_completa` falha na HEAD da staging, a drenagem seguinte só processa tickets `origem: sentinela` (congelamento). O executor de qualquer outro ticket reprovaria no gate de testes por culpa alheia e queimaria retries. Antes de abrir candidato, o teste que falhou roda 3×: passou ≥1 ⇒ suspeita de flaky ⇒ decisão pendente propondo `testes_quarentena` (nunca adicionado automaticamente); falhou 3× ⇒ candidato de regressão. Se o candidato bloqueia, a fila continua congelada e a notificação diz isso. Por que a staging pode ficar vermelha se todo merge passou nos gates: worktrees nascem sequencialmente da staging atualizada, então conflito semântico entre tickets não passa; o que resta é flaky, push externo na staging ou ambiente. Por isso o executor faz `git fetch` + fast-forward da staging antes de criar a worktree (rc checado, regra 11).

**Rastreamento dos merges do loop:** todo merge commit na staging carrega o trailer `Orq-Ticket: <id>`. A quarentena (regra 4 acima) e o relatório usam `git log --since=<quarentena_horas>h --grep='Orq-Ticket:'` + `--name-only`, nunca o log do harness (regra 5: git é a verdade).

**Baseline:** promovida a cada relatório semanal: sinais que viraram ticket `done` saem; sinais em decisão pendente ficam; sinais novos não tratados entram com marcação `ignorado_ate` se o humano decidir. Sinal que reaparece depois de `done` ⇒ candidato com `dependencias: [id do ticket anterior]` e prioridade alta (regressão).

**A sentinela nunca:** escreve em provedores externos, aplica migration, reinicia serviço, abre ticket para harness/doutrina/roadmap, ultrapassa o cap.

## 5. Orçamento e kill switches

**Contabilidade:** cada chamada de modelo (executor, juiz, classificador, planejador, sentinela, juiz de ticket) grava em `runs/custo.json`: `{data, papel, ticket, tokens_in, tokens_out, tokens_cache, custo_usd}` a partir do usage real (`claude -p --output-format json` expõe custo e usage; confirmar os nomes dos campos na versão instalada, no pré-voo cat. 8). Agregado por dia e por ticket.

**Gates de orçamento (config `orcamento`):**

| Teto | Checado | Estourou ⇒ |
|---|---|---|
| `usd_dia` / `tokens_dia` | antes de cada chamada de modelo | evento `ORCAMENTO`, todos os pendentes viram adiado com `adiado_ate` = próximo dia, notificação, drenagem encerra |
| `usd_ticket` | antes de cada tentativa | ticket adiado até revisão (`notas_status: orcamento_ticket`), não bloqueado |
| `planejador.reserva_orcamento_pct` | antes do planejador | planejador pula esta drenagem |
| `contexto.cap_tokens_executor` / `cap_tokens_planejador` | ao montar context pack | pack truncado por prioridade (allowlist > assinaturas > ADR), nunca chamada acima do cap |

Orçamento nasce **medido**: duas semanas com teto alto e `orq custo` diário; depois fixa em config com 30% de folga sobre a mediana.

**Kill switches (regra 12: arquivo, nunca env):**

| Arquivo/campo | Efeito |
|---|---|
| `docs/fila/PAUSAR` (existe) | nenhum loop dispara; drenagem corrente termina o ticket e para |
| `loops.executor.ativo: false` | fila não é drenada; sentinela/planejador também não (dependem de merge/fila) |
| `loops.sentinela.ativo: false` | sem coleta |
| `loops.planejador.ativo: false` | sem reposição |
| `push_suprimido: true` | merge local na staging sem push |
| `modo: dry_run` (global) | executor roda gates mas não mergeia; planejador só candida |

Lidos no passo 0 de toda drenagem **e entre tickets**. `orq pausar` / `orq retomar` só criam/removem o arquivo; nunca matam processo.

## 6. Fase 3: promoção (o único merge humano)

**Relatório semanal** (`orq relatorio`, também disparado pelo passo 7 no dia configurado): `docs/fila/runs/relatorio-<ano>-S<semana>.md`, upsert. Conteúdo fixo:
1. Placar por bloco (done / pendente / bloqueado / descartado) e frentes concluídas
2. `git log --oneline principal..staging` agrupado por ticket, `--stat` resumido
3. Resultado do smoke e da suíte completa na HEAD da staging (rc + tempo)
4. Sinais da sentinela: novos, em quarentena, resolvidos
5. Decisões pendentes (cópia de `decisoes-pendentes.md`)
6. Custo: total, por ticket aprovado, aprovação de primeira, causa nº 1 de reprovação
7. Migrations `.sql` acumuladas aguardando aplicação humana
8. Blocos com DoD aguardando validação

**Ritual humano (20 min):** ler relatório → validar DoD de blocos → aplicar `.sql` → resolver decisões (`/arquitetar --decisoes`) → responder tokens de `liberacoes.json` → **merge staging → principal** (humano, sempre, `--no-ff`) → promover baseline da sentinela. Se o smoke do item 3 está vermelho, a promoção não acontece e o motivo vai para decisão pendente.

## 7. Contrato do `orq` (v2, tudo read-only exceto os marcados ✎)

| Comando | Faz |
|---|---|
| `orq` | STATUS.md (inclui CUSTO, PLANEJADOR, SENTINELA) |
| `orq eventos [n]` · `orq erro` · `orq fila` · `orq ticket <id>` | como v1 |
| `orq custo [dia]` | agregado do dia: por papel, por ticket, vs teto |
| `orq decisoes` | `decisoes-pendentes.md` formatado |
| `orq sinais` | sinais da sentinela: novos / quarentena / baseline |
| `orq gate <id>` | evidência dos 7 passos do gate para o candidato |
| `orq mapa lint` · `orq mapa status` | consistência MAPA.md × mapa.json; placar por frente |
| `orq dor` | Definition of Ready da Fase 0 |
| `orq relatorio` ✎ | gera/atualiza o relatório da semana (escreve só em runs/) |
| `orq mapa-repo` ✎ | regenera `docs/orquestrador/REPO-MAP.md` (escreve só esse arquivo) |
| `orq promover <id>` ✎ | candidato → pendente (uso humano no dry-run) |
| `orq pausar` / `orq retomar` ✎ | cria/remove `docs/fila/PAUSAR` |

Nenhum subcomando mata processo, edita ticket em execução ou toca a staging.

## 8. Ordem de ativação (não pule)

1. Executor maduro (tabela de maturidade da SKILL).
2. **Sentinela** com `fontes: [suite_completa, smoke]` apenas. 1 semana. Só depois `runtime_errors` e `advisors` (exigem credenciais read-only no ambiente do agendador).
3. **Gate de ticket** exercitado com tickets humanos (pré-voo cat. 8) por 1 semana: taxa de descarte de ticket humano é o termômetro da qualidade do próprio gate.
4. **Planejador em dry-run** 2 semanas.
5. **Planejador auto** com `lote: 3`, `limiar_fila: 3`.
6. **Modo contínuo** só com orçamento fixado por medição.
