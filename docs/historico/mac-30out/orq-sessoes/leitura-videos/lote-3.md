# Lote 3
## Rendimento por vídeo
- v052 Stanford, aula 3: verificação (título ausente no arquivo, primeira linha é "Vídeo do YouTube"): médio, a parte sobre o Weaver traz filtro e pesos medidos para o consenso de juízes e um resultado negativo para a verificação por rubrica feita só com prompt; o resto é treino de verificador e não serve ao kit
- v046 Stanford: avaliação agêntica e tarefas de longo horizonte (título ausente no arquivo): médio, traz o gap entre os horizontes de 50% e 80% com números, uma taxonomia de falhas do agente e a falha "promete ler a referência e não lê"; metade do vídeo é tendência de mercado
- v044 Stanford: aula de encerramento, direções futuras (título ausente no arquivo): baixo, só a meta-verificação (DeepSeekMath V2) e a validação por execução repetida de tarefa gerada (Absolute Zero) servem; o resto é fine-tuning e inteligência por watt

## Itens

### L3-01 Consenso de juízes só com filtro de qualidade e peso medido
- tipo: SUBSTITUI o item 25
- fonte: v052 "your verifiers should be above a certain quality to even be let in the pool of verifiers"
- o que a fonte diz: o Weaver primeiro filtra os verificadores ruins contra um pequeno conjunto rotulado ("a very important step") e depois dá um peso por verificador (naive Bayes ou regressão logística). Funciona com 1% dos rótulos (versão não supervisionada). A média simples ajuda, mas "not in a monotonic way". A verificação multiagente por rubrica, só com prompt (MAV), "doesn't do that much better or actually worse in these two cases than majority voting". O sinal vem da discordância: "if all of them agree... we are not learning anything new".
- como entra no kit: o consenso entre juízes paralelos só entra com (a) cada juiz medido no corpus do juiz e excluído abaixo de um piso de acerto e (b) peso por juiz igual ao acerto medido, recalculado quando o corpus muda. Variante de prompt que sempre concorda com outra já existente não entra no pool. Voto simples entre juízes com prompts diferentes não é aceito como melhoria sem A/B no corpus.
- ataca: C5 | C2 | custo
- marco: A
- evidência: medida (Llama 3.1 8B com pool de verificadores de até 8B chega a ~70% de média, no nível do voto majoritário de 70B; com 70B, 86,2%, comparável ao o3-mini)

### L3-02 Seleção por juiz piora quando N cresce demais
- tipo: DETALHE do experimento best-of-N (já listado)
- fonte: v052 "they stopped at 100 samples because that's where they get most of the gains anyway"
- o que a fonte diz: no GSM8K, a seleção pelo verificador melhora até ~400 amostras por problema e cai em 800, porque "if two solutions are too close to each other... it can't distinguish". Os autores pararam em 100. O voto majoritário, por comparação, para de ajudar antes de 50 amostras.
- como entra no kit: o experimento best-of-N mede a aprovação final por N (N = 2, 3, 5) e para no menor N depois do qual a curva fica plana. Registrar também os casos em que o juiz escolheu entre candidatos com diff quase igual, que são exatamente os casos em que a escolha degrada.
- ataca: C5 | custo
- marco: C
- evidência: medida (pico perto de 400, queda em 800, operação em 100; valores de acurácia não ditos na transcrição)

### L3-03 Gerador grande com verificador menor bate o inverso
- tipo: NOVO
- fonte: v052 "the larger generator helps with a smaller verifier, it does better than vice versa"
- o que a fonte diz: comparando 6B e 175B (GPT-3), gerador maior com verificador menor rendeu mais do que gerador menor com verificador maior. A autora justifica que gerar é, em média, mais difícil do que verificar e diz que o ponto ótimo de Pareto entre os tamanhos está em aberto. Ressalva: eram verificadores treinados, não juízes por prompt.
- como entra no kit: no roteamento por risco (marco C), testar em sombra o juiz num modelo abaixo do executor nos tickets de risco baixo, medindo a concordância com o juiz atual no corpus do juiz antes de adotar. Não inverter o padrão (executor barato com juiz caro) sem medir.
- ataca: custo
- marco: C
- evidência: medida (sem número na transcrição)

### L3-04 Dimensionar o ticket pelo horizonte de 80%, não pelo de 50%
- tipo: NOVO
- fonte: v046 "15 minutes is what Cloud 3.7 can achieve 80% of the time versus 59 minutes 50% of the time"
- o que a fonte diz: o METR (170 tarefas: SWAA 66, HCAST 97, RE-Bench 7) mede o horizonte pelo tempo que um humano com cerca de 5 anos de experiência leva, usando a média geométrica dos tempos. Claude 3.7 Sonnet: 59 min com 50% de sucesso e cerca de 15 min com 80%. O horizonte dobra a cada 7 meses. Em PRs internos, o modelo rende no tempo de um prestador sem contexto, que é de 5 a 18 vezes mais lento que o mantenedor do repo.
- como entra no kit: campo `minutos_humano_estimado` no ticket (o planejador preenche e o validador avisa acima de um teto) e a métrica de aprovação de primeira (C2) quebrada por faixa desse campo. A faixa em que C2 cai abaixo de 70% vira o teto para refatiar. Complementa o teto de diff de 300 linhas, que mede só o tamanho do resultado.
- ataca: C2 | C1
- marco: D
- evidência: medida (59 min e 15 min; ver Números a conferir)

### L3-05 Taxonomia de falhas do agente para o extrator de transcrição
- tipo: DETALHE do item 12
- fonte: v046 "prematurely it abandons the tasks... the model will basically get into a repetitive loop"
- o que a fonte diz: as falhas de GPT-4 e o1 nas tarefas do METR caem em: planejamento ruim, escolha errada de ferramenta, matemática ou raciocínio errado, abandono prematuro (não sabe como seria o sucesso) e loop repetitivo (repete a ação de maior probabilidade depois de falhar). O loop era frequente no GPT-4 e caiu no o1.
- como entra no kit: o extrator do item 12 rotula cada tentativa reprovada com uma dessas 5 classes, por regra quando der (loop = mesma tool call com os mesmos argumentos 3 vezes ou mais; abandono = fim sem rodar os critérios) e por LLM no resto. O agrupador semanal (item 14) passa a contar por classe.
- ataca: C3 | C1
- marco: C
- evidência: medida (gráfico por modelo, sem números na transcrição)

### L3-06 Referência prometida e não lida
- tipo: DETALHE do item 21
- fonte: v046 "the models will promise to look at the reference data but then actually not look at it"
- o que a fonte diz: no GDPval (cerca de 70% das tarefas exigem arquivos de referência), a falha mais comum em todos os modelos é a de seguir instruções. O modelo diz que vai consultar a referência, não consulta e a substitui por algo inventado. Erros de formatação vêm em segundo lugar.
- como entra no kit: gate mecânico: todo arquivo listado como referência ou contexto obrigatório no ticket precisa aparecer como Read na transcrição stream-json da tentativa. Se não aparecer, o gate reprova antes do juiz, com a objeção "referência X não lida".
- ataca: C2 | C5
- marco: A
- evidência: medida (categoria de falha mais frequente; sem percentual na transcrição)

### L3-07 Meta-verificação das objeções do juiz
- tipo: DETALHE do item 1
- fonte: v044 "do these identified issues actually exist? Does the score follow from the issue?"
- o que a fonte diz: no DeepSeekMath V2, o verificador (LLM como juiz) às vezes inventa erros, e o LLM-juiz comum declara válidas provas inválidas. O meta-verificador revisa a análise do verificador com duas perguntas: o problema apontado existe? a nota segue dos problemas apontados? Humanos anotaram a qualidade dessas análises. Com o laço gerador e verificador, a nota de prova sobe em 8 iterações e chega a ~42% com best-of-32 no IMO Shortlist 2024.
- como entra no kit: antes de uma reprova virar retry, uma passada barata confere cada objeção: o arquivo:linha existe no diff e o trecho mostra o problema alegado? A objeção que não se sustenta é descartada e registrada no ledger (item 14) como "objeção inventada". Se o veredito era reprova e não sobra nenhuma objeção, vira estado insuficiente e não reprova. A taxa de objeções inventadas passa a ser métrica do juiz.
- ataca: C2 | C5
- marco: A
- evidência: medida (42% com best-of-32; o ganho isolado do meta-verificador não tem número na transcrição)

### L3-08 Tarefa gerada só entra depois de validada por execução repetida
- tipo: DETALHE das guardas do planejador (já planejado)
- fonte: v044 "if you run these inputs multiple times, you get exactly the same outputs"
- o que a fonte diz: no Absolute Zero, a tarefa que o próprio modelo propõe só entra no buffer depois de checar a integridade do programa (executa sem erro), passar por checagem de segurança e mostrar determinismo (várias execuções dão a mesma saída). A recompensa do propositor é 0 se a taxa de sucesso do resolvedor é 0; caso contrário, é 1 menos a taxa média, o que favorece dificuldade moderada.
- como entra no kit: para ticket escrito pelo planejador, cada critério executável roda 2 vezes na base antes de o ticket entrar na fila e precisa dar o mesmo resultado nas duas, senão volta ao planejador como instável. Junta com o vermelho-antes (8f) e o gate de teste instável (L11), que estão pendentes.
- ataca: C1 (critério) | C2
- marco: D
- evidência: relato de praticante (paper descrito na aula; sem número para essa checagem)

### L3-09 Candidatos do mesmo modelo e prompt saem parecidos
- tipo: DETALHE do experimento best-of-N (já listado)
- fonte: v044 "it will not have very diverse responses, even at high temperatures"
- o que a fonte diz: um único modelo gerando os dados produz soluções muito parecidas, mesmo com temperatura alta, e o ganho para depois de algumas iterações. Com vários agentes (multiagent fine-tuning), a dissimilaridade de embedding se mantém. A versão ingênua, "something that people do in practice", é usar modelos diferentes ou prompts diferentes.
- como entra no kit: no best-of-N, os N candidatos variam o modelo ou o enquadramento do prompt (não só a semente) e o experimento registra a similaridade entre os diffs candidatos. Se os candidatos saem quase iguais, o N extra é custo sem ganho.
- ataca: C2 | custo
- marco: C
- evidência: medida em fine-tuning (dissimilaridade de embedding sem número); a transferência para o best-of-N é inferência

## Números a conferir
- v046: horizonte de 80% do Claude 3.7 dito como "15 minutes" e, antes, como "8 to 10 minutes"; "five weeks shorter" parece erro de transcrição
- v046: HCAST "1 minute to 30 hours" e o RE-Bench com tarefas de até 8 h
- v046: GDPval com "30, 20 tasks" (provavelmente 1320) e 220 no conjunto gold; Claude Opus 4.1 com 47,6% de vitórias mais empates; GPT-5 com 1,6x de custo e 1,4x de velocidade (a ordem pode estar trocada)
- v046: DeepScholar com importância de documento abaixo de 12,5%, precisão de 90% e cobertura de fatos de 50% com as fontes perfeitas
- v052: pico do verificador perto de 400 amostras; destilado de 400M com 97% da acurácia e 99% a menos de computação
- v044: tokens do Google "1.3 bilhões" (deve ser quatrilhão); nota de 42% com best-of-32 no IMO Shortlist 2024
