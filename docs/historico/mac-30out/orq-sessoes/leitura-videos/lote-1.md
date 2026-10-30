# Lote 1
## Rendimento por vídeo
- v063 Most Valuable Skill of 2026: Managing AI Agents: baixo, quase tudo é opinião e venda de Devin; sobram o smoke E2E que dispara triagem e o resumo diário com link para o artefato real.
- v089 7.4 AI Agent Cost Control: 6 Levers to Cut Tokens & Latency: médio, números concretos de antes e depois, mas as alavancas já estão no plano (teto, roteamento, cache, contexto); o que acrescenta é a régua de verificação do corte e as métricas do painel.
- v088 7.3 Evaluating AI Agents: Golden Sets, LLM-as-Judge & Catching Regressions: médio, o caso da regressão escondida (relevância sobe, groundedness cai 12 pontos) dá forma concreta ao gate por dimensão; o resto repete o eval já planejado.
- v100 Orchestrator-Workers & Evaluator-Optimizer: alto, traz as medidas de autocorreção sem fato externo e de autopreferência do avaliador, que mexem no retry e no descarte do juiz de outra família.
- v101 Como Orquestrar Agentes de IA com Uma Skill DE GRAÇA: baixo, demo de skill de roteamento; só o degrau de 70% de cota é número novo.
- v099 The Agentic Engineer Workflow You Need In 2026: baixo, fluxo pessoal com 4 terminais e opiniões; nada que o kit já não tenha (worktree, esforço por tarefa, PR pequeno).
- v079 How AI agents & Claude skills work: médio, contagem de tokens de contexto fixo contra divulgação progressiva e o método de gravar a regra só depois da execução corrigida.
- v024 Building the future of agents with Claude: baixo, conversa institucional da Anthropic; limpeza de tool results com lápide e memória já estão cobertas por saídas em arquivo e PLAYBOOK.

## Itens

### L1-01 Retry só paga quando chega fato externo novo
- tipo: DETALHE do item 2
- fonte: v100 "The loop pays exactly when the evaluator knows something the generator doesn't."
- o que a fonte diz: cita Huang e colegas (Google DeepMind, ICLR 2024, "LLMs cannot self-correct reasoning yet"): sem feedback externo o modelo não se corrige e às vezes piora. Self-Refine (Madaan e colegas, NeurIPS 2023): média de 20% de melhora, diálogo de 25% para 74%, matemática "modest". Com avaliador externo (compilador, suíte de teste, schema, consulta a banco) o loop funciona. O ganho estabiliza depois do primeiro refinamento e cada rodada custa 2n+1 chamadas em série.
- como entra no kit: cada tentativa recebe a etiqueta do tipo de feedback que a motivou (externo: gate com saída nova; interno: só objeção do juiz). Na curva por tentativa (item 16), medir conversão separada por etiqueta; se reprova só do juiz não converter na 2ª tentativa, o teto para esse caso cai para 1 retry e o resto vai para bloqueio.
- ataca: C2 | custo
- marco: A
- evidência: medida (artigos citados pelo autor, números a conferir)

### L1-02 Autopreferência do avaliador do mesmo modelo
- tipo: NOVO (pressiona o descarte de "juiz de outra família de modelo")
- fonte: v100 "ChatGPT favors its own assessment 10% more and Claude 25% more"
- o que a fonte diz: no self-refine, o avaliador confrontado com o próprio resultado dizia "everything looks good" em 94% das instâncias de matemática. Cita Zhang e colegas (NeurIPS 2023): ChatGPT favorece a própria avaliação 10% a mais e Claude 25% a mais. O próprio autor diz não saber se é correlação ou causa.
- como entra no kit: no corpus do juiz, medir a taxa de aprovação indevida (defeito que passa) quando juiz e executor são o mesmo modelo. Se o C5 do juiz no corpus ficar acima de 5% e a diferença contra um juiz de outro modelo passar de 10 pontos, reabrir o item descartado como experimento em sombra.
- ataca: C5
- marco: B
- evidência: medida (artigo citado pelo autor, atribuição e números a conferir)

### L1-03 Gate de regressão por dimensão, não pela média
- tipo: DETALHE do item 22
- fonte: v088 "This so-called improved prompt just quietly broke grounding and citations. Do not ship it."
- o que a fonte diz: mudança de prompt para respostas "mais confiantes": relevância +5, completude +2, groundedness -12, taxa de citação de 100% para 88%, aprovados caíram 3 (base 46 de 50, 92%). Confiança tirou ressalvas e com elas as citações. O gate falha o build se qualquer métrica cair abaixo do limiar, mesmo com outras subindo.
- como entra no kit: toda mudança no prompt do executor ou do juiz roda o corpus e gera tabela de delta por dimensão contra a linha de base versionada; qualquer dimensão vermelha bloqueia o merge da mudança, mesmo com C2 subindo. Casos novos vêm só de incidentes reais, nunca dos exemplos usados para escrever o prompt.
- ataca: C2 | C5
- marco: B
- evidência: relato de praticante (exemplo didático do curso, não medição real)

### L1-04 PLAYBOOK por divulgação progressiva
- tipo: NOVO
- fonte: v079 "this is 944 tokens ... if I just have the name and the description, it's just 53 tokens"
- o que a fonte diz: arquivo fixo (CLAUDE.md, agent.md) entra em toda volta; 1.000 linhas dão cerca de 7.000 tokens por volta. Skill de 116 linhas custa 944 tokens inteira e 53 só com nome e descrição; o corpo só entra quando o agente decide que precisa. Não escrever o que o modelo lê do código (stack, convenções óbvias). Manter o contexto entre vazio e 70%, porque perto de 80% a 100% o modelo piora.
- como entra no kit: PLAYBOOK vira índice (título e uma linha por lição) mais corpo por superfície; o prompt do executor carrega inteiro só o corpo das superfícies que a allowlist do ticket toca e o resto como índice com caminho. Medir tokens fixos por chamada antes e depois e C2 em sombra.
- ataca: custo | C2
- marco: C
- evidência: medida (contagem de tokens 944 contra 53); efeito na qualidade é opinião

### L1-05 Lição escrita a partir da tentativa que passou
- tipo: DETALHE do item 15
- fonte: v079 "once it fixes it and it's done it right, now you tell it with the new fix, update the skill so this doesn't happen again"
- o que a fonte diz: o autor só gera a skill depois de uma execução bem sucedida conduzida passo a passo; skill escrita sem esse contexto falha. Na falha seguinte pergunta o erro ao agente, devolve a falha, espera a correção passar e só então manda atualizar a skill. Precisou de 5 iterações para estabilizar uma skill que puxa de 8 fontes; estima 2 semanas de investimento inicial.
- como entra no kit: proposta de lição para o PLAYBOOK só é aceita com referência à tentativa reprovada e à tentativa corrigida que passou nos gates e no juiz; o texto da lição é redigido a partir do diff da tentativa que passou, não da reprova.
- ataca: C3 | C1
- marco: A
- evidência: relato de praticante

### L1-06 Degrau de cota a 70% antes da troca em 95%
- tipo: DETALHE do reforço "cota 5h e semanal com troca em 95%"
- fonte: v101 "caso seja mais 70%, ele vai estar usando o Haiku no Medium ao invés de usar o Sonnet no Medium"
- o que a fonte diz: na skill de orquestração do autor, o perfil base troca de provedor em 95% de uso; antes disso, o papel de construtor rebaixa de Sonnet medium para Haiku medium quando o uso passa de 70%. Tarefa "restrita e delicada" fica com o planejador e nunca vai para modelo gratuito. A demo custou US$ 1,9 em preço de API em 8 minutos.
- como entra no kit: na cota antes de despachar, dois limiares: acima de 70% da janela, tickets de risco baixo (pelo roteamento por risco) descem um degrau de modelo; acima de 95%, adia. Ticket de risco alto nunca desce por cota, só adia.
- ataca: custo | C1
- marco: C
- evidência: relato de praticante (demo, sem medida de qualidade)

### L1-07 Smoke E2E que falha abre triagem, não só alerta
- tipo: DETALHE do item 7
- fonte: v063 "it triggers a child triage session if anything goes wrong. How do I know about it?"
- o que a fonte diz: teste E2E de cadastro no navegador roda 3 vezes por semana (segunda, quarta, sexta) porque custa cerca de US$ 60 em tokens por rodada; se falha, dispara uma sessão filha de triagem e correção e avisa no Slack. O autor diz que o problema seguinte é saber quando o agente falhou e se corrigiu sozinho em silêncio.
- como entra no kit: falha do smoke na staging gera rascunho de ticket com a saída do smoke anexada e entra na caixa de decisões (item 17) para aprovação humana antes da fila; não abre PR sozinho (mantém o descartado). Registrar custo por rodada do smoke para escolher a frequência.
- ataca: C5 | C1
- marco: C
- evidência: relato de praticante (US$ 60 por rodada)

### L1-08 Resumo diário com link para o artefato de cada evento
- tipo: DETALHE do resumo diário (marco C)
- fonte: v063 "production watchdog automation that links out to real UI is just, man, that's a game changer"
- o que a fonte diz: todo dia às 9h uma automação resume em JSON os eventos dos clientes pagantes do dia anterior; cada linha traz link para ver o que aconteceu na instância real. O valor vem de clicar no que "parece estranho", que o resumo sozinho não mostra.
- como entra no kit: cada linha do resumo diário (merge, reprova, resgate, bloqueio) leva caminho do diff, da transcrição (item 12) e do veredito; métrica: fração de linhas com link válido igual a 100%.
- ataca: C1 | C5
- marco: C
- evidência: relato de praticante

### L1-09 Corte de custo só entra com trace e eval provando
- tipo: DETALHE do reforço "custo por etapa e prompt caching"
- fonte: v089 "the eval from 7.3 proves the quality held, and the trace from 7.2 proves the cost actually fell"
- o que a fonte diz: conta por etapa: pesquisadores 6 chamadas, 11.000 tokens, 8 centavos de 16; mais da metade da entrada são passagens recuperadas reenviadas a cada chamada. Corte de contexto de 3.700 para 1.500 tokens (60%) com top 4 passagens, histórico resumido e saída de ferramenta já usada descartada. Total de 20 chamadas, 22.000 tokens, 16 centavos, 9 s para 9 chamadas, 8.800 tokens, 5 centavos, cerca de 1 s até o primeiro token. Painel: dólar por execução, tokens por execução, P95 de latência, taxa de acerto de cache, custo por dia com alerta de pico.
- como entra no kit: otimizar primeiro a etapa mais cara do custo por ticket; todo corte (ex.: contexto enxuto do juiz) só entra com antes e depois de custo medido e o corpus do juiz sem regressão (L1-03). Painel do marco C ganha taxa de acerto de cache e alerta de custo diário acima da média móvel.
- ataca: custo
- marco: C
- evidência: medida (exemplo do curso com números redondos, não produção)

## Números a conferir
- v100: Self-Refine 25% para 74% em diálogo e média de 20%; 94% de "everything looks good" em matemática; autopreferência de 10% (ChatGPT) e 25% (Claude) atribuída a "Zhang e colegas, NeurIPS 2023" (atribuição suspeita, conferir o artigo); "2n+1 calls" por n rodadas.
- v088: 46 de 50 (92%), groundedness -12, citação 100% para 88%; exemplo didático, não medição real.
- v089: 16 centavos e 22.000 tokens por brief; 50.000 briefs por dia a US$ 8.000 (conta fecha); 3.700 para 1.500 tokens chamado de 60% (dá 59%); "três vezes mais barato" (16 para 5 centavos, 3,2x).
- v063: US$ 20.000 por mês em tokens, US$ 5.000 por engenheiro por mês, US$ 60 por rodada de E2E, cerca de US$ 5 por sessão; nomes de modelo "Opus 4.8", "GPT 5.6", "SWE 1.7", "Fusion" podem estar trocados pela transcrição.
- v079: "1.000 linhas, 7.000 tokens"; "25,000, 250,000 tokens" de limite está truncado na transcrição; 944 contra 53 tokens.
- v101: limiar de 70%, troca em 95%, US$ 1,9, 250 mil tokens no Codex; "GPT 6.1 sol" e "Nyan/Nine Router" provavelmente nomes mal transcritos.
