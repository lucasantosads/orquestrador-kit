# PLAYBOOK do Orquestrador — seed

> Memória viva do loop. **Todo incidente vira uma linha aqui, no mesmo commit que o corrige.**
> As lições abaixo já foram pagas com incidente real no repo de origem — este repo começa com elas, não do zero.

## Princípios
- **Código verifica, modelo julga.** Aprovação vem de comando executável; a opinião do modelo sobre o próprio trabalho não conta.
- **Amnésia por design.** Cada braço reconstrói o estado da fonte única (fila + git); nada de estado implícito entre rodadas.
- **Fail-fast por custo.** Cheque barato antes de gasto caro, sempre.
- **A fronteira é código.** Allowlist + guards físicos; prompt é desejo, enforcement é lei.
- **Fonte única de estado.** Fila/status/evidência num único checkout.

## Lições de campo (herdadas)
- **Faixa livre no disco ≠ faixa livre no ledger.** Antes de reservar faixa de migrations/IDs, checar reservas DOCUMENTADAS (CLAUDE.md, ledger, docs de arquitetura), não só `ls` no diretório. Reserva documentada de módulo futuro prevalece sobre disco vazio.
- **Pasta existente ≠ spec presente.** Um `mkdir` sobrevive a um `unzip` falho; preflight e pré-voo verificam CONTEÚDO dos arquivos (`test -s`, contagem em `git ls-files`), nunca só o diretório.
- **Headless não enxerga skill de chat.** `claude -p` via launchd/cron/CI só lê o que está no repo — a doutrina TEM que estar vendorizada em `docs/orquestrador/skill/` e o prompt do executor referencia a cópia local. Instalação que dependia de skill externa rodou sem spec.
- **Log ≠ verdade; git é o ground truth.** Um "aprovado" no log era outro ticket rodando de casa paralela.
- **Executor da casa errada cria ESTADO PARALELO** — dois estados que parecem válidos. Preflight de identidade é obrigatório e fatal.
- **Lock robusto = pid + idade máxima + cleanup em TODO caminho de saída** + auto-limpeza de órfão no início.
- **Deps referenciam o campo `id` do JSON, nunca o nome do arquivo.**
- **Campo fora do schema é ignorado em silêncio** — valide nomes contra o schema.
- **`tail -f` prende o terminal** — leitura pontual quando for encadear comandos.
- **Gerador de story ≠ gerador de ticket.** O gate é critério executável + verificação de fonte. "Existe no brief" ≠ existe no disco: todo nome de tabela é verificado no repo, inclusive em brief humano.
- **Nunca reinício forçado do serviço com run vivo** — checar lock/pid antes; reinício por cima = dois executores na mesma fila.
- **Parser do veredicto: falha de parse = adiado, nunca reprovação.** Incidente real: juiz aprovou, parser declarou ilegível, trabalho bom foi descartado. Preserve sempre o output CRU do juiz.
- **Branch de ticket bloqueado não é deletada** até revisão humana — o commit é evidência recuperável (sha fica em runs/, mas branch viva é mais barata de auditar).
- **Writeback externo é upsert de seção única**, nunca append (duplica a cada sync).
- **Relatório com credencial ausente cai para arquivo local** — falha silenciosa esconde o placar.
- **Allowlists sobrepostas entre tickets pendentes exigem dep explícita** — senão o segundo nasce de base velha e o merge conflita no registry compartilhado.
- **Critério de UI cobra integração, não existência** — componente criado mas nunca importado/montado passa em "arquivo existe" e falha em produção; o juiz deve cobrar o import/mount.
- **Merge manual guiado: resolução completa ANTES de qualquer add/commit** — placeholder no meio do fluxo mandou markers de conflito pro origin.
- **Build ≠ typecheck** em setups com `ignoreBuildErrors` — o gate real é o typecheck explícito contra baseline.

## Lições de campo (triadas do PLAYBOOK do conteudos-infinitos, set/2026)

> **Procedência e critério.** As 15 abaixo saíram de uma triagem do
> `PLAYBOOK.md` do repo conteudos-infinitos (129 lições registradas entre 01 e
> 08/set/2026, lido só para leitura). Entrou o que passa nos TRÊS filtros:
> (1) é sobre o MECANISMO do orquestrador, não sobre o produto, a stack ou o
> roadmap daquele repo; (2) foi PAGA — incidente ou medição, nunca preferência
> de desenho; (3) muda o que alguém FARIA num repo novo. Cada uma traz a data e
> a origem, porque lição sem procedência vira folclore em três meses.
>
> As outras 114 não são piores: são locais, ou já estão na SKILL.md, ou são
> variações destas. A triagem do resto é a peça K10b do kit.

- **Número que reinicia nunca nomeia arquivo que persiste.** (2026-09-04,
  conteudos-infinitos.) Ao devolver um ticket para `pendente`, a drenagem
  seguinte recomeçou o contador de retry em 0 — correto — e nomeou o diretório
  de evidência com esse mesmo número. `runs/227/attempt-0/` ficou com o prompt e
  a saída de hoje ao lado dos gates de ontem, e a evidência da **única
  reprovação legítima que aquele loop já tinha produzido** foi destruída, sem
  cópia. Contador de retry e slot de evidência são duas coisas.

- **O remédio do retry tem de ser aplicado na árvore onde a doença existe.**
  (2026-09-04, conteudos-infinitos.) O juiz reprovou com razão; o retry recriou
  a worktree do zero; o agente abriu uma árvore vazia, não achou nada do que o
  diagnóstico mandava corrigir e devolveu diff 0 em 15 s e 3 s. Duas tentativas
  queimadas em 18 segundos e um ticket BLOQUEADO a uma correção de distância.
  **Reprovação boa virou bloqueio injusto.** Retry reaproveita a worktree quando
  o enforcement da tentativa anterior passou.

- **Trabalho verificado não se perde por falta de `git commit`.** (2026-09-04,
  conteudos-infinitos.) O agente gastou 22 turnos e US$ 0,52, escreveu 150 linhas
  em três arquivos e saiu sem commitar. O pipeline mede `git diff base...HEAD`,
  viu **diff 0**, e a worktree seria removida com tudo dentro. O harness passou a
  commitar por ele antes de medir — e não é indulto: é o contrário, porque o
  `git add -A` do harness inclui de propósito o arquivo fora da allowlist, que
  antes passava batido com diff 0 e agora é REPROVADO pelo enforcement.

- **Morte por sinal é o desfecho que um harness ingênuo não sabe contar.**
  (2026-09-04, conteudos-infinitos.) Um executor morreu entre a chamada do agente
  e o registro de custo. Não havia `trap`, o rc era descartado (`say "executor
  rc!=0"`, sem o número) e a chamada rodava sob `|| rc=$?`, que DESLIGA o
  `errexit`. Não deu para saber quem mandou o sinal. A lição é sobre o buraco,
  não sobre a causa: se o harness não sabe contar uma morte, ele conta como
  "nada aconteceu".

- **Evidência falsa é pior que evidência ausente.** (2026-09-07,
  conteudos-infinitos.) Um evento de morte espúrio na trilha é indistinguível de
  morte de verdade: quem lê depois conta mortes que não houve e vai procurar
  causa onde não há defeito. Por isso a correção foi uma GUARDA no código, não
  disciplina de quem escreve teste — **disciplina não sobrevive à sexta-feira**.

- **Script de teste nunca escreve na trilha de produção.** (2026-09-07,
  conteudos-infinitos.) O corolário do anterior, e a forma que a guarda tomou:
  escrita de trilha, STATUS e custo só é permitida dentro do `ORQ_EXEC_ROOT`
  declarado. Um teste que suja a trilha real produz exatamente a evidência falsa
  do item acima.

- **A trilha é append-only, e a correção honesta de um registro append-only é
  uma ANOTAÇÃO ao lado.** (2026-09-07, conteudos-infinitos.) Não se apaga linha
  de trilha para consertar o que ela diz. Acrescenta-se um evento de anotação
  que aponta para a linha errada e explica. Editar o passado é como um log deixa
  de ser prova.

- **Evento de trilha nunca contém quebra de linha.** (2026-09-07,
  conteudos-infinitos.) Uma linha por transição só é uma promessa verificável se
  o comando que entrou no evento não puder quebrá-la. Truncar por caractere não
  basta: `cut -c` é orientado a LINHA e deixa passar o `\n` do meio.

- **A guarda contra disparo concorrente é POR REPO, e por isso é o lockfile.**
  (2026-09-02 e 2026-09-07, conteudos-infinitos.) `pgrep -f local-loop` global
  pegou o loop de OUTRO repo na mesma máquina e teria abortado a sessão sem
  motivo — duas vezes, com um mês de intervalo. Dois orquestradores na mesma
  máquina são operação NORMAL. A pergunta vai ao `.local-loop.lock` do
  `runs_dir` deste checkout; `kill -0` é sonda de vida, não sinal.

- **Snapshot congelado come disparos em silêncio; a staleness vem PRIMEIRO.**
  (2026-09-07, conteudos-infinitos.) O STATUS ficou em `executando` por **22 h**,
  e todos os disparos do agendador saíram com exit 0 sem fazer nada: cada um
  perguntava "já há drenagem em curso?" e acreditava no snapshot. Perguntar isso
  primeiro é confiar num estado que ninguém está mantendo. Aplique a staleness
  antes (tempo além do timeout = processo morto), recupere e SIGA; o lock
  continua sendo a autoridade sobre concorrência.

- **Critério com `$(...)` sobre arquivo que ainda não existe falha com rc 2, não
  com veredito.** (2026-09-02, conteudos-infinitos.) `test $(wc -l < ausente) -ge
  10` vira "unknown condition" — erro de shell, indistinguível de bug do gate.
  Guarde a existência primeiro: `test -s a && test $(grep -c '' a) -ge 10 && echo ok`.

- **`espera` é igualdade exata.** (2026-09-02, conteudos-infinitos.) "não-zero"
  não existe como valor esperado. A forma que funciona é o `cmd` decidir e
  imprimir: `... && echo ok`, com `espera: "ok"`.

- **O que o ticket NÃO pode tocar fica FORA da allowlist, não num critério.**
  (2026-09-02, conteudos-infinitos.) O enforcement reprova o diff ANTES do juiz,
  e isso é mais forte que qualquer guarda escrita como critério. Critério é o que
  o ticket precisa provar; allowlist é o que ele pode alcançar.

- **Grep de critério casa comentário, e o comentário mente sobre o código.**
  (2026-09-05, conteudos-infinitos.) Um guard contava 3 ocorrências de um termo:
  uma no código e duas em comentário. Ancore o critério num trecho que só existe
  no código — e prefira o símbolo com pontuação (`hash_dedupe:`) à palavra solta.

- **Erro fora da allowlist não é retry: é ticket mal escrito.** (2026-09-07,
  conteudos-infinitos.) Cinco tentativas do mesmo ticket reprovaram no MESMO gate
  com os MESMOS três erros, todos em arquivos fora da própria allowlist. O agente
  da última tentativa escreveu o diagnóstico dentro do diff — *"o conserto é de
  quatro linhas, todas fora daqui"* — e ainda assim reprovou, porque não podia
  tocá-las. Antes de conceder retry a um ticket reprovado por gate, compare o
  arquivo do erro com a allowlist.

## Regras v2 (pagas por design, não por incidente; rebaixe se a evidência contradisser)
- **Candidato não é ticket.** Gerado por máquina entra como `candidato`; só o gate promove. O gate descarta, nunca conserta.
- **Teste vermelho antes de implementar.** Critério `alvo` que já passa não mede nada; é a raiz de "aprovado sem fazer nada". Vermelho pelo motivo errado (rc 126/127, timeout, sintaxe) é `invalido` e descarta.
- **Planejador decompõe, não inventa.** Frente que não está `pronta` não existe para ele. Dúvida vira `decisoes-pendentes.md`, não escopo.
- **Sinal só vira ticket com threshold + baseline + quarentena.** Arquivo mergeado pelo loop nas últimas 24h ⇒ decisão humana, não ticket; senão o loop oscila corrige-quebra-corrige.
- **Orçamento é gate.** Estourou = adiado + aviso. "Só este" é como se estoura.
- **Contexto por script, com cap.** Executor nunca explora o repo; recebe pack derivado do ticket + assinaturas do repo map.
- **Reprovação mecânica não gera retry.** Fora da allowlist, acima do cap, zona proibida ⇒ `refatiar` de volta a quem escreveu.
- **Harness, roadmap e doutrina nunca passam pela fila**, nem como bug da sentinela.
- **Planejador e sentinela são fases da drenagem**, sob o mesmo lock. Daemon paralelo deles = segundo estado.
- **Prefixo estável no prompt ou o cache não existe.** Timestamp/pid/tentativa sempre no fim. Medir `tokens_cache/tokens_in`.
- **Motor único versionado.** Não se escreve orquestrador por repo: instala-se o do kit
  (`instalar.sh --novo`) e o que varia vive no `000-config.json`. Editar o motor vendorizado
  aqui dentro é NO-GO no pré-voo — `instalar.sh --verificar` é quem afirma isso.
- **Canal de notificação padrão é ARQUIVO.** O loop roda headless: canal que depende de
  sessão gráfica falha exatamente quando ninguém está olhando. Qualquer outro canal é
  acréscimo, e mantém o fallback em arquivo.
- **ID de ticket é ordem de fila, sequencial global.** Faixa por bloco vira prioridade por
  bloco, porque o loop drena em ordem de ID. A pertença mora nos campos `bloco` e `frente`.
- **`risco` é derivado, não exigido.** Quem escreve o ticket deixa a chave vazia; o passo 6
  do gate a preenche. Pedir a classificação ao autor troca uma medida por uma opinião.
