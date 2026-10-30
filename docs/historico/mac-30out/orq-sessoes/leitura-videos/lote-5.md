# Lote 5
## Rendimento por vídeo
- v050 Vídeo do YouTube (aula Stanford: LATS, SPRINT, SWIRL): médio, traz dois casos em que a técnica NÃO funciona (ação irreversível; problema pequeno) e um achado medido sobre filtrar por processo versus por resultado, mas tudo é treino de modelo e a ponte para o kit é indireta
- v051 Vídeo do YouTube (aula Stanford: ReAct, RLEF, Constitutional AI): baixo, testes públicos e privados repetem o item 10 e retry com feedback repete o item 2; sobra só a ressalva de que o feedback não ajuda o modelo base sozinho
- v029 Architecting Agent Memory, Richmond Alake (MongoDB): baixo, propaganda de MongoDB e taxonomia de memória sem número, sem regra e sem medição; zero itens
- v031 Turning Agent Memory Into Skills That Work, Will Lyon (Neo4j): médio, a ideia de skill ancorada em evidência com detecção de obsolescência e divisão por coerência melhora o item 15; o ganho medido (SkillsBench) aparece sem número

## Itens

### L5-01 Retry com feedback só vale se medir contra amostra nova
- tipo: DETALHE do item 2
- fonte: v051 "os modelos base tipicamente não se beneficiam do acesso apenas a soluções defeituosas e feedback de execução"
- o que a fonte diz: no RLEF (Llama 3.1, CodeContests), o loop roda os testes públicos, devolve a falha ao modelo e repete até passar ou até o limite de turnos; só depois os testes privados decidem a recompensa. O ganho vem do treino com feedback a cada turno: com RLEF, os turnos 2 e 3 têm menos saídas erradas e consertam o código ("edits mais direcionados porque você pode olhar onde errou"); sem esse treino, os edits das tentativas seguintes não acertam. Um aluno levanta que reward binário não basta para problema difícil e que seria preciso o rastro do erro; o professor responde "é bem possível".
- como entra no kit: na curva de aprovação por tentativa (item 16), separar a 2ª tentativa com retry informado de uma reamostragem em sessão nova sem objeções nem diff anterior, rodando a segunda em sombra numa amostra de reprovas. Se a informada não ganhar, o retry informado não está pagando o contexto extra.
- ataca: C2 | custo
- marco: C
- evidência: relato de praticante (resultado de paper citado em aula, sem número na transcrição)

### L5-02 Lição do PLAYBOOK ancorada em evidência, com obsolescência e divisão por coerência
- tipo: DETALHE do item 15
- fonte: v031 "if that skill essentially becomes stale, if any of that underlying data changes, is removed, or becomes contradictory"
- o que a fonte diz: a skill destilada da memória tem cada passo ligado aos dados que a geraram (chamadas de ferramenta e entidades). Um curador em segundo plano marca a skill como obsoleta quando esses dados mudam, somem ou se contradizem. Heurísticas antes de gerar: escopo primeiro (entidade, conversa ou workspace), cobertura (todo passo ancorado) e coerência (detecção de comunidades no grafo: skill que mistura comunidades deve ser dividida). O pipeline tem 7 etapas, quase todas determinísticas; o LLM só redige as afirmações e a descrição.
- como entra no kit: cada lição do PLAYBOOK ganha um campo de lastro (ids de tentativa, commits e caminhos arquivo:símbolo que a motivaram). Um checador determinístico, sem LLM, marca a lição como "suspeita" quando um caminho citado deixa de existir na staging ou quando o defeito citado foi revertido, e a lição suspeita sai do contexto do executor até alguém revisar. Lição que cita duas superfícies sem relação é recusada na entrada e precisa ser dividida.
- ataca: C2 | C3
- marco: A
- evidência: relato de praticante (o paper APE relata "aumento significativo" no SkillsBench, sem número na transcrição)

### L5-03 Busca em árvore e best-of-N só onde a ação é reversível
- tipo: DETALHE do experimento best-of-N (já listado)
- fonte: v050 "existem cenários em que tomar uma ação pode ser irreversível" (trecho original: "there are scenarios where taking an action may be irreversible")
- o que a fonte diz: o LATS (ICML 2024) expande vários ramos e executa as ações no ambiente para pontuar cada estado (juiz LLM de 0 a 1 somado à frequência da ação em amostragem, por exemplo 50 amostras), retropropaga e anexa uma reflexão ao fim de cada trajetória. O professor aponta dois limites: o paper não analisou custo versus benefício, e a técnica não se aplica quando executar a ação tem efeito real (o exemplo é pagar por um serviço).
- como entra no kit: se o experimento best-of-N rodar, o despachante só abre N ramos para ticket cujo diff e cujos critérios ficam inteiramente dentro da worktree. Ticket com migration, cron, chamada a API externa ou escrita em banco de produção roda em ramo único. Registrar o custo por ramo desde o primeiro lote, porque é a lacuna que o próprio paper deixou.
- ataca: C5 | custo
- marco: C
- evidência: opinião (ressalva do professor sobre o paper)

### L5-04 Exemplo para imitar só de tentativa limpa; sinal para aprender também de tentativa com bom processo
- tipo: DETALHE do item 24
- fonte: v050 "quando nossos dados de treinamento foram filtrados apenas por processo ... isso parece ajudar mais"
- o que a fonte diz: no SWIRL (Gemma 2 27B gerando cerca de 50K trajetórias de HotpotQA e GSM8K), um juiz LLM pontua cada passo vendo só o contexto anterior e a consulta da ferramenta, sem a saída da ferramenta. Para RL, filtrar por processo (passos aprovados por maioria do juiz, sem olhar a resposta final) rendeu mais do que filtrar por resultado ou por processo e resultado, porque trajetória só com acerto não ensina o que o modelo ainda não sabia resolver. Para SFT (imitação) foi o contrário: venceu o filtro de processo e resultado juntos, porque imitar trajetória errada estraga. A generalização medida foi de 65 para 71 no HotpotQA treinando só em GSM8K, contra 65 para 73 treinando no próprio HotpotQA.
- como entra no kit: o que entra no prompt do executor como exemplo a imitar (diff de referência, ticket irmão resolvido) só vem de tentativa aprovada de primeira e sem objeção do avaliador de processo. Já o agente de melhoria semanal (item 24) e o ledger de objeções (item 14) também leem tentativas reprovadas cujo processo foi limpo, porque é ali que aparece o que o executor ainda não acerta.
- ataca: C2 | C5
- marco: C
- evidência: medida (65 para 71 e 65 para 73; a comparação entre os filtros aparece sem número na transcrição; é treino de modelo, a transposição para exemplos no prompt é inferência)

### L5-05 Decompor em paralelo piora problema pequeno
- tipo: DETALHE das guardas do planejador (sobre-decomposição, já listada)
- fonte: v050 "Se o número de tokens gerados no processo de pensamento é pequeno, provavelmente há menos oportunidade de paralelismo ... podemos ser piores que o baseline"
- o que a fonte diz: o SPRINT (NeurIPS 2025; SFT em 6K trajetórias de matemática no R1 destilado Qwen 7B) ensina o modelo a emitir planos independentes de uma vez e executá-los em paralelo. Corta cerca de 40% dos tokens sequenciais e sobe 3,5 pontos de acurácia, mas o ganho se concentra nos problemas que exigem mais pensamento; nos curtos, planejar e executar fica pior que o baseline (RFT). Os primeiros estágios exploram mais planos em paralelo e os últimos convergem para um só.
- como entra no kit: a guarda de sobre-decomposição usa um piso de tamanho: o planejador não divide um objetivo cuja estimativa cabe num ticket só (abaixo do teto de 300 linhas do item 8). Registrar por lote quantos tickets filhos ficaram com diff abaixo de um piso, por exemplo 30 linhas, como sinal de decomposição excessiva.
- ataca: C2 | custo
- marco: D
- evidência: medida (40% e 3,5 pontos; a perda nos problemas curtos aparece sem número; é treino de modelo, a ponte para o planejador é inferência)

## Números a conferir
- v029 "10 to 21 tools" no contexto como orientação da OpenAI: provavelmente "10 a 20"
- v029 Hubel e Wiesel ("Hobelum Weisel") ganharam o Nobel em 1981, não "no fim dos anos 90"
- v051 Apple Remote de 2005 descrito como "22 decades ago": são cerca de 2 décadas
- v051 ReAct 66,6 contra 82,1 de especialistas humanos no WebShop: confirmar se é score ou taxa de sucesso
- v051 constituição com "16 princípios" e pós-treino com "talvez 5%" do compute
- v050 SPRINT: 6K trajetórias, salto de "três e meio por cento" e redução de "algo como 40%" nos tokens sequenciais
- v050 SWIRL: "Gemma 227B" deve ser Gemma 2 27B; cerca de 50K trajetórias; 65 para 71 e 65 para 73; de 100 a 10.000 exemplos de treino
- v050 "a system card do Sonnet 4.5 diz que o prompt incentiva usar ferramentas pelo menos 100 vezes": afirmação a conferir na fonte
- nomes corrigidos: Voyager AI = Voyage AI; Memorize = memorizz; Charles Parker = Charles Packer (MemGPT/Letta); Hotbot QA = HotpotQA; SORA/SORAD = SWIRL; spring/screen = SPRINT; Column = COLM; "código de nuvem" = Claude Code; APE é o nome como transcrito, conferir o nome do paper da Neo4j
