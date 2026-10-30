# Lote 4
## Rendimento por vídeo
- v048 Stanford: busca em código (AlphaCode, AlphaCode 2) e busca agêntica (Search-o1) (título ausente no arquivo, primeira linha é "Vídeo do YouTube"): médio, traz a ordem exata do funil de seleção do AlphaCode 2 com números, a perda medida entre cobertura e seleção e a extração por documento do Search-o1; o resto é pré-treino e logística de aula
- v053 Stanford: escala em tempo de inferência (Monkeys, Snell, Archon) (título ausente no arquivo): médio, traz a lacuna geração e verificação com o voto majoritário estagnando, a repartição por dificuldade entre revisão sequencial e modelo maior e a fusão do Archon com regras de ordem entre operadores; metade é revisão de aula anterior
- v054 Stanford CS329A, aula de abertura (título ausente no arquivo): baixo, é panorama de LLMs e logística do curso; o único dado novo (3 ou 4 corretas em 10.000 amostras) só reforça L4-01

## Itens

### L4-01 Medir a perda da seleção separada da cobertura no best-of-N
- tipo: DETALHE do experimento best-of-N (já listado)
- fonte: v048 "there is definitely some bottlenecking happening in the selection stage"
- o que a fonte diz: no AlphaCode, com tentativas ilimitadas (pass@k) a taxa passa de 40%, mas submetendo só 10 escolhidos (10@k) fica em cerca de 30%; a diferença é perda da etapa de seleção. Em v053, o voto majoritário "plateaus after 10 or 50 samples" enquanto a cobertura segue subindo, porque nos problemas difíceis a resposta certa aparece 1 a 3 vezes em 1.000 ou 10.000 amostras (v054: "maybe like three or four of them were correct"). A cobertura medida por teste também engana: na matemática conferiram à mão e cerca de 97 a 98% das marcadas como certas eram certas; no código, "your unit tests don't have true coverage".
- como entra no kit: o experimento best-of-N registra duas colunas por ticket: cobertura (algum dos N candidatos passou todos os gates) e seleção (o candidato escolhido passou gates e juiz). A diferença entre as duas é a perda do seletor e decide onde investir (mais N ou melhor seletor). Seleção por convergência entre candidatos (o diff que mais se repete) fica proibida como seletor. Uma amostra dos candidatos que passaram os gates é conferida à mão para estimar a taxa de falso positivo do próprio gate.
- ataca: C5 | C2 | custo
- marco: C
- evidência: medida (pass@k acima de 40% contra 10@k de cerca de 30%; voto estagna entre 10 e 50 amostras)

### L4-02 Ordem do funil de seleção: gate, agrupar por comportamento, um por grupo, juiz
- tipo: DETALHE do experimento best-of-N (já listado), complementa L3-02
- fonte: v048 "they're going to aggregate and keep the top 10 largest clusters... pick the best candidate per cluster"
- o que a fonte diz: AlphaCode 2, na ordem: amostrar com temperatura e metadados do prompt randomizados; executar nos testes de exemplo e descartar o que falha ou não compila (sai 95%, sobram cerca de 50 mil); agrupar por comportamento em entradas de teste geradas por um modelo à parte (sintaxe diferente, semântica igual cai no mesmo grupo); manter os 10 maiores grupos; o modelo de pontuação (nota de 0 a 1) escolhe o melhor de cada grupo. Com 100 amostras iguala o AlphaCode com 1 milhão. Aviso dito: amostrar 10x mais sem ganhar diversidade "you're actually not going to improve".
- como entra no kit: no best-of-N, o juiz nunca recebe todos os candidatos. Primeiro os gates mecânicos eliminam; depois os sobreviventes são agrupados por assinatura de comportamento (conjunto de testes e critérios que passam, mais arquivos tocados); só um representante por grupo vai ao juiz. Campo `grupos_distintos` no registro do experimento: se for 1 com N maior que 1, o N extra foi custo sem diversidade. Isso evita o caso de L3-02 (juiz escolhendo entre diffs quase iguais).
- ataca: C5 | custo
- marco: C
- evidência: medida (95% descartados, cerca de 50 mil restantes, 10 grupos; 100 amostras igualam 1 milhão; 43% contra 25% na mesma escala de amostras)

### L4-03 Fusão dos candidatos como variante de seleção
- tipo: NOVO
- fonte: v053 "that can on its own improve the quality of responses over Oracle selection"
- o que a fonte diz: no Archon, a fusão dá ao LLM a pergunta mais as k respostas e pede uma resposta sintetizada. Escolher uma ao acaso fica abaixo de ranquear pelo modelo, que fica abaixo do oráculo; a fusão supera o oráculo, e ranquear antes e fundir só as 5 melhores supera fundir todas. Regras de ordem achadas por teste: a primeira camada é sempre geração, uma técnica por camada, crítico sempre antes de ranqueador ou fusor, gerador de teste sempre seguido de avaliador. Três camadas de crítico e fusor bateram o melhor modelo sozinho e o melhor modelo 8 vezes com uma camada de fusão; média de 14,1% acima de GPT-4o e Claude 3.5 Sonnet em pass@1. A busca da arquitetura usou otimização bayesiana num conjunto separado, com objetivo acurácia por número de chamadas.
- como entra no kit: onde a saída é texto e não diff (lote do planejador, decomposição de L2-05, relatório do triador), testar a cadeia crítico, ranqueador, fusão das 5 melhores contra a escolha de uma, medindo no corpus próprio. Para diff de código não fundir: lá a arquitetura vencedora do Archon foi gerar muitos, gerar testes e avaliar, que é o que o kit já faz.
- ataca: C2 | C1 (spec)
- marco: D
- evidência: medida (14,1% médio; a vantagem da fusão sobre o oráculo foi mostrada em gráfico sem número; benchmarks de instrução, raciocínio, matemática e código, não repo real)

### L4-04 Fácil pede revisão sequencial, difícil pede modelo maior
- tipo: DETALHE do roteamento por risco e da escalada de modelo (já existe e já planejado)
- fonte: v053 "for the hardest problem, it seems like larger models like a more pre-training or larger models still do better"
- o que a fonte diz: no Snell (MATH, 12 mil de treino e 500 de teste), a dificuldade é medida pelo pass@1 do modelo em várias amostras e dividida em 5 faixas. Nas faixas fáceis, a melhor alocação tem muito mais revisão sequencial do que amostragem paralela; nas faixas 4 e 5 a proporção ótima muda e "it's harder to say". Para fáceis e médios, computação de inferência rende mais do que modelo maior; para os mais difíceis, modelo maior ganha mesmo com orçamento grande de inferência. No v048, o AlphaCode 2 confirma: modelo base melhor cortou de 1 milhão para 100 amostras para o mesmo resultado ("making the model better is a slightly easier axis than scaling the number of samples").
- como entra no kit: a curva de aprovação por tentativa (item 16) é quebrada por faixa de dificuldade (minutos_humano_estimado de L3-04 ou nível de revisão do item 18). Na faixa em que a 2ª e a 3ª tentativa no mesmo modelo quase não convertem, a escalada de modelo passa a valer já na 1ª reprova em vez de esperar o retry. Na faixa fácil, retry no modelo barato continua sendo o padrão.
- ataca: C2 | custo
- marco: C
- evidência: medida (gráficos por faixa sem número na transcrição)

### L4-05 Marcadores de incerteza na fala do executor
- tipo: DETALHE do item 12
- fonte: v048 "anything that quantifies uncertainty in the reasoning chains goes down substantially"
- o que a fonte diz: no Search-o1, a lacuna de conhecimento aparece no raciocínio como palavras de incerteza ("perhaps", "alternatively", "wait", "likely"); sem busca, a suposição feita ali se propaga em cascata até a resposta final errada. O paper contou essas palavras nas cadeias e elas caem muito quando o modelo busca e extrai a informação. Não há número na transcrição.
- como entra no kit: o extrator do item 12 conta marcadores de incerteza no texto do executor (inclusive em PT: "provavelmente", "talvez", "imagino que", "deve ser") e registra onde aparecem sem uma leitura ou busca logo depois. Tentativa com marcador sem verificação seguinte vai para o material do juiz como ponto a conferir e entra no agrupador semanal como sinal de ticket com contexto faltando.
- ataca: C2 | C1 (spec)
- marco: C
- evidência: medida (contagem citada do paper, sem número na transcrição)

### L4-06 Extrair o trecho relevante por documento antes de pôr no contexto
- tipo: DETALHE do contexto enxuto do juiz e da recon de fonte do planejador (já planejados)
- fonte: v048 "as you increase the number of documents for direct reasoning and for rag, the accuracy does not go up"
- o que a fonte diz: no Search-o1, colar os documentos inteiros (RAG agêntico) atrapalhou o raciocínio no exemplo de química; o módulo "reason in documents" lê cada documento à parte, junto com a consulta atual e o raciocínio anterior, extrai só o trecho útil e insere isso. Com RAG direto a acurácia no GPQA não sobe com mais documentos; com a extração sobe. Também ficou à frente em multi-hop (HotpotQA, 2WikiMultihopQA, MuSiQue, Bamboogle).
- como entra no kit: na recon de fonte do planejador e na montagem do material do juiz, cada arquivo de referência passa por uma extração (trecho com caminho:linha mais o motivo de ser relevante) em vez de entrar inteiro. Medir no corpus do juiz o acerto com material inteiro contra material extraído antes de adotar.
- ataca: C2 | C5 | custo
- marco: C
- evidência: medida (curva por número de documentos no GPQA, sem número na transcrição)

### L4-07 Confiança declarada pelo modelo não vira limiar
- tipo: NOVO
- fonte: v048 "if it's 50% correct, it will still be overconfident, it'll be like 80% very confident"
- o que a fonte diz: a probabilidade que o modelo dá às próprias saídas é mal calibrada e puxa para excesso de confiança: com 50% de acerto real ele se dá cerca de 80%. Isso aparece também como resistência a corrigir a resposta. A autora diz que modelos diferentes se comportam diferente.
- como entra no kit: nenhum gate, roteamento ou promoção a auto do triador usa a confiança declarada pelo juiz, pelo executor ou pelo triador como limiar. Se algum campo de confiança existir no veredito, ele é só registrado e calibrado contra o desfecho no ledger (item 14) antes de pesar em qualquer decisão.
- ataca: C5
- marco: A
- evidência: relato de praticante (50% e 80% ditos como exemplo, sem estudo citado)

## Números a conferir
- v048: AlphaCode "top 54%", "average ranking of 54.3" e "outperforming 46 percent" descrevem o mesmo resultado de jeitos diferentes; "competitive with 28%" não bate com eles
- v048: 10@k de "30%" contra pass@k "above 40%" lidos de gráfico; AlphaCode 2 com 43% contra 25%, percentil 85 e 99,5% em duas competições; 700 GB de código do GitHub
- v048: exemplo de química com "10 átomos de carbono" e depois "14" na mesma frase, trecho traduzido e confuso
- v053: "LLAMA38B" é Llama 3 8B, "3Bench" é SWE-bench, "Cloud 3.5" é Claude 3.5 Sonnet, "Arcan" é Archon e "ITAS" é a busca de arquitetura de inferência; "lei de poder exponencial" mistura as duas curvas (exponencial por problema, lei de potência no conjunto)
- v053: conferência manual "97, 8%" (97 ou 98%); Archon 14,1% acima de GPT-4o e Claude 3.5 Sonnet
- v054: BERT com "3.8 million parameters" está errado (BERT large tem cerca de 340 milhões); temperatura "beyond like 1.2" ruim
