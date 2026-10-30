# Lote 2
## Rendimento por vídeo
- v061 AI Agents Full Course 2026: Master Agentic AI (2 Hours): médio, 7 itens aproveitáveis (formato de regra, contexto fixo medido, consenso com enquadramentos, perguntas reversas, debate, batch), quase tudo relato sem medida, e o resto é técnica de prompt já coberta ou negócio.
- v093 5.4 Build a Multi-Agent Research Assistant: baixo, repete orquestrador, crítico com teto, fan-out limitado e trilha por spans já cobertos; só a regra de expor contradição em vez de escolher lado é nova.
- v083 What Are Hierarchical AI Agents?: baixo, os modos de falha do planejador (dependência perdida, sobre-decomposição) e o telefone sem fio já estão nas guardas do planejador e no item 9.
- v084 Build AI Corporations: baixo, os 4 pilares da spec já existem como fora_de_escopo[], allowlist e critérios; sobra a ideia de marcha baixa para código crítico novo.
- v095 5.2 How AI Agents Talk: médio, dá o contrato de handoff com 4 campos e o modo de falha de estado compartilhado sobrescrito (versionar ou só anexar).
- v102 Mastering Multi-Agent Orchestration with Google Cloud ADK: baixo, demo genérica; único dado útil é o erro de saída verbosa corrigido com teto de 300 palavras e formato fixo.

## Itens

### L2-01 Handoff com 4 campos obrigatórios, nem histórico nem resumo
- tipo: DETALHE do item 9
- fonte: v095 "Drop any one of these and the receiver has to guess."
- o que a fonte diz: o que passa de um agente para o outro precisa levar objetivo, contexto como dado, artefatos (o trabalho até aqui) e restrições ("cite every claim, keep it under 150 words"). Duas formas erradas: despejar o histórico inteiro (contexto explode, custo sobe a cada salto) ou resumo vago em prosa (perde citações e números exatos, e o receptor inventa o que falta). O contrato é tipado e validado na fronteira, rejeitando payload malformado.
- como entra no kit: validador na entrada passa a exigir os 4 blocos no ticket (objetivo/objetivo_pai, contexto como lista de caminhos ou arquivo:linha, artefatos existentes a reaproveitar, restrições); campo de contexto só em prosa sem caminho nem número gera aviso. O mesmo esquema vale para o pacote do retry (item 2) e para o material do juiz.
- ataca: C1 (classe critério e allowlist, que são spec) | C2
- marco: A
- evidência: opinião

### L2-02 Estado compartilhado versionado ou só-anexar
- tipo: NOVO
- fonte: v095 "Two agents overwrite the same slot, so version it or make writes append only."; v061 "it resets the chat file because previous runs may have that"
- o que a fonte diz: no quadro compartilhado (blackboard), o modo de falha é dois agentes sobrescreverem o mesmo campo; a correção é versionar o campo ou tornar a escrita só-anexar. No v061 o orquestrador zera o arquivo de chat no início de cada rodada porque restos da rodada anterior contaminam a nova.
- como entra no kit: escrita do estado do ticket (status, tentativas, writeback) passa a ser ledger só-anexar ou com versão e compare-and-swap; escrita com versão velha falha alto em vez de sobrescrever. Arquivos de estado por rodada nascem limpos e o resto da rodada anterior vai para arquivo datado. Medir se a classe writeback (7 resgates em 14 dias) cai.
- ataca: C1 (classe writeback)
- marco: A
- evidência: opinião

### L2-03 Contradição exposta, nunca resolvida em silêncio
- tipo: NOVO
- fonte: v093 "surface the conflict in the draft instead of silently picking a side"
- o que a fonte diz: quando os achados de dois pesquisadores se contradizem, o escritor deve mostrar o conflito no rascunho em vez de escolher um lado sem avisar. Está na lista de falhas que o orquestrador deve tratar, junto com worker que morre e crítico em laço.
- como entra no kit: o relatório do executor ganha o campo conflitos[] (ticket diz X, código ou base diz Y, com arquivo:linha) e o status spec_conflitante, que encerra a tentativa sem gastar teto e vai para o triador na classe spec. O juiz reprova diff que resolveu contradição de spec sem declarar no relatório (cruza com item 21).
- ataca: C1 (51% dos resgates são de spec) | C5
- marco: A
- evidência: opinião

### L2-04 Perguntas reversas em 5 categorias antes do contrato
- tipo: DETALHE do reforço já listado guardas do planejador (suposicoes[])
- fonte: v061 "ask the user five dynamically generated clarifying questions to surface non-obvious preferences, assumptions, and constraints"
- o que a fonte diz: antes de qualquer construção não trivial, o agente analisa o pedido em 5 frentes: requisitos declarados, suposições implícitas, pontos de decisão, modos de falha e escolhas de gosto. Faz 5 perguntas, e as respostas alimentam um contrato de 4 seções (objetivo, restrições, formato, falha) que o humano aprova antes da execução. Antes de redigir, o agente inspeciona o estado atual (abriu o site existente e tirou prints).
- como entra no kit: o planejador, antes de escrever o lote, preenche as 5 categorias por ticket; ponto de decisão e escolha de gosto sem resposta viram pergunta na caixa de decisões (item 17) e o ticket não entra na fila até ter resposta; suposição implícita vira suposicoes[]; modo de falha vira falhas[].
- ataca: C1 (classe critério) | C2
- marco: D
- evidência: relato de praticante

### L2-05 Decomposição repetida com enquadramentos e 3 faixas de concordância
- tipo: DETALHE do item 25
- fonte: v061 "every one of them will get slightly different analytical framing to maximize the diversity of ideas"
- o que a fonte diz: N agentes (o autor usou 10) recebem a mesma pergunta com enquadramentos diferentes ("conservative", "assume limited time and budget", "only focus on what is measurable and provable", "end user perspective"). O pai agrega em consenso, divergente e outlier (1 de 10): consenso se faz, divergente se pensa antes, outlier pode ser ideia boa ou alucinação. Custo relatado de US$ 3 a 4 por rodada.
- como entra no kit: em sombra, o planejador gera a decomposição 3 a 5 vezes com enquadramentos fixos (mínimo de tickets, risco primeiro, só o verificável); fronteira de ticket ou dependência que aparece em minoria marca o trecho como ambíguo e manda para a caixa de decisões em vez de virar ticket. Medir se tickets marcados concentram resgates de spec.
- ataca: C1 (spec) | custo
- marco: D
- evidência: relato de praticante

### L2-06 Formato da regra aprendida com "porque" obrigatório
- tipo: DETALHE do item 15
- fonte: v061 "The format is category, never or always do X because Y."
- o que a fonte diz: arquivo de regras que o próprio agente edita: lido inteiro no início da sessão, regras numeradas em sequência, imperativas, no formato "categoria: NUNCA/SEMPRE faça X porque Y". Gatilhos para escrever regra: usuário corrige a saída, usuário rejeita abordagem, bug causado por suposição errada, usuário declara preferência. O autor supõe que com cerca de mil regras elas começam a se atrapalhar, mas diz que não chegou a esse limite.
- como entra no kit: o validador do PLAYBOOK rejeita lição sem categoria, sem NUNCA/SEMPRE e sem "porque"; o gatilho "bug causado por suposição errada" vira origem válida de lição a partir do post-mortem; contagem de regras ativas fica no painel como sinal de inchaço.
- ataca: C3
- marco: A
- evidência: relato de praticante

### L2-07 Contexto fixo da sessão medido no turno zero
- tipo: DETALHE do item 12
- fonte: v061 "we're still at 9,000 used"
- o que a fonte diz: com /context, antes de qualquer mensagem a sessão já tinha cerca de 9 mil tokens: prompt de sistema e CLAUDE.md 4,9 mil, memória 2 mil, skills 1,7 mil, mensagens 8. O autor diz que isso é perto de 10% da janela e que tende a crescer com CLAUDE.md, memória e skills. A compactação automática dispara perto de 155 mil de 200 mil e descarta saídas de ferramentas.
- como entra no kit: o extrator do item 12 registra os tokens fixos do claude -p no turno zero por repo e por ticket, com teto e alarme quando CLAUDE.md, skills ou mods passam do teto; tentativa que chega à compactação é marcada e o ticket vai para refatiar.
- ataca: C2 | custo
- marco: C
- evidência: medida (uma sessão do autor: 9 mil, 4,9 mil, 2 mil, 1,7 mil)

### L2-08 API em lote para rodadas que não têm pressa
- tipo: NOVO
- fonte: v061 "if you're comfortable waiting a day or something"
- o que a fonte diz: os provedores oferecem API em lote: envia muitas requisições de uma vez, eles atendem em até um dia nos horários de baixa carga e cobram menos. O autor não dá o desconto.
- como entra no kit: o eval permanente do juiz (200 a 400 casos) e a ablação ou best-of-N em sombra rodam pela API em lote durante a noite, fora da cota de 5h do executor; o custo dessas rodadas entra separado no custo por etapa.
- ataca: custo
- marco: C
- evidência: opinião

### L2-09 Teto de palavras e formato fixo em saída lida por humano ou por outro agente
- tipo: DETALHE do item 3
- fonte: v102 "na minha primeira iteração, eu vi que ele estava dando uma resposta muito verbal ... manter em 300 palavras"
- o que a fonte diz: a autora viu o agente de risco devolver texto prolixo e difícil de ler na primeira versão; corrigiu acrescentando ao prompt o limite de 300 palavras e um formato específico de saída. Lição dela: deixar as saídas intermediárias visíveis para depurar.
- como entra no kit: campos de texto livre do juiz, do triador e do post-mortem ganham teto de palavras no schema (rejeitar e pedir de novo se passar); o resumo diário sai em formato fixo.
- ataca: C2 | custo
- marco: C
- evidência: relato de praticante

### L2-10 Marcha baixa para código crítico novo
- tipo: DETALHE do item 18
- fonte: v084 "para as coisas realmente novas, complexas e missões-criticas do seu sistema, você tem que desligar. Você escreve o código pseudo."
- o que a fonte diz: atribuído a Charity Majors (Honeycomb): escrever código ficou barato, ser dono dele quando quebra ficou caro. Para o simples, a IA vai em marcha alta; para o novo, complexo e crítico, o humano escreve o pseudocódigo ou implementa o algoritmo difícil à mão.
- como entra no kit: ticket do nível de revisão 2 que cria lógica nova numa zona crítica da arquitetura (não só edita) exige pseudocódigo humano no campo do ticket; sem ele, o validador na entrada barra.
- ataca: C5
- marco: D
- evidência: opinião

### L2-11 Debate com papéis fixos para revisar o lote do planejador
- tipo: NOVO
- fonte: v061 "a systems thinker, a pragmatist, an edge case finder, a user advocate, and a contrarian"
- o que a fonte diz: 5 instâncias numa sala comum (chat.json), turnos em rodízio com execução paralela dentro de cada rodada, cada uma com papel fixo. Segundo o autor, sem forçar opiniões diferentes o resultado é fraco; com papéis, o debate pegou o que o consenso paralelo não pegou (ex.: contestou a premissa que todos os agentes do consenso tinham aceitado).
- como entra no kit: em sombra, o lote escrito pelo planejador passa por uma rodada com 3 papéis (caçador de casos de borda, contrário, pragmático) que só pode marcar ticket como ambíguo ou mal fatiado, nunca reescrever; marcação vira item na caixa de decisões. Medir contra resgates de spec do lote.
- ataca: C1 (spec)
- marco: D
- evidência: opinião

## Números a conferir
- v061: diz que 9 mil tokens são cerca de 10% da janela de 200 mil (dá 4,5%) e na mesma tela que restam 158 mil livres (com 9 mil usados sobrariam 191 mil; a diferença talvez seja o buffer da compactação).
- v061: compactação "perto de 155K de 200K" é estimativa do autor; a curva de qualidade de 100% para 40% ele mesmo diz que inventou.
- v061: custo por lead 0,008 + 0,005 + 0,001 + 0,015 = 0,029 confere, mas "15 dólares por dia ou 450 por mês" com Opus e "120 por mês" no misto não fecham com 1000 leads por dia (0,029 x 1000 x 30 = 870 por mês).
- v061: regra 60-30-10 (10M x 5 + 30M x 3 + 60M x 1 = 200 contra 500, economia de 60%) confere, preços por milhão são ilustrativos.
- v093: "about five-sided findings" deve ser "five cited findings" (3 pesquisadores x 5 = 15 achados citados, como diz depois); 6 chamadas solo, cerca de 20 na equipe, cerca de 30 com debate; tempo de relógio "um terço" é afirmação sem medida.
