# Leitura para o motor, lote 6 (handoffs de 15 a 18/10/2026)

Fonte: 19 arquivos em ~/Downloads/trancricoes/pipeline/leitura-motor/handoffs/. Conferido contra docs/PLAYBOOK.md, a lista de docs/defeitos/ (19 arquivos), docs/PECAS.md do orquestrador-kit e os itens 1 a 28 do base.md. Ficaram de fora por já estarem cobertos: regex de "You've hit your session limit" (PECAS, cooldown 7b), login expirado contando no disjuntor (defeito 2026-10-28), ticket lido do working tree sem commit (defeito 2026-10-16), teste vizinho contra lista fechada da allowlist (PECAS 8c), rename de migration para o ledger (MIG-A), painel ocioso com motivo (K12, 7a-4).

### L6-01 Autocommit do loop faz push sem rebase e colide com o publicar.sh
- tipo: DEFEITO NÃO REGISTRADO
- fonte: HANDOFF-15out-f1-lote1-apolo.md, "Causa: `autocommit_status_fila` em scripts/orquestrador/local-loop.sh faz push sem pull --rebase antes."
- o que aconteceu: às 13:28 o loop apolo fez o autocommit de status no checkout principal no mesmo minuto em que o publicar.sh empurrou c3587e5. O push do loop falhou (commit ficou local) e o passo 7 do publicar.sh não conseguiu o pull --ff-only. Resolvido à mão com pull --rebase e push. O conserto ficou como PORTE-PENDENTE e não chegou ao kit.
- onde já devia estar: docs/defeitos
- ataca: C1
- marco: B

### L6-02 Ids de ticket colidem entre sessões paralelas
- tipo: IDEIA DE MOTOR
- fonte: HANDOFF-16out-noite-lote-49-apolo.md, "Ids nasceram como 5080 a 5128 e foram deslocados +50"; HANDOFF-17out-sessao-lote4-adr014.md, "os ids foram conferidos na origin, não no checkout local onde a outra sessão escrevia"
- o que aconteceu: três colisões em dois dias (lote de 49 deslocado +50; lote 4 do ADR-014 colidindo com o lote de 38 em 11 ids, com 3 já done; 5179/5180 duplicados numa branch). Cada uma custou renumeração manual, prompt de salvamento e um publicar.sh morto. A K10 decidiu "ID sequencial global", mas não existe reserva: falta um `orq reservar-ids N` que grave a faixa reservada na origin antes de a sessão escrever.
- onde já devia estar: PECAS
- ataca: C1
- marco: D

### L6-03 Publicação concorrente sem trava e pausa órfã do publicar.sh morto
- tipo: DEFEITO NÃO REGISTRADO
- fonte: HANDOFF-15out-loop-apolo.md, "Duas sessões publicando juntas = 'interrompido por sinal'"; HANDOFF-17out-tarde-migrations-lote38.md, "pausa órfã renomeada para `.orq-pause.orfa-lote4-1404`"
- o que aconteceu: a regra "uma publicação por vez, conferir que .orq-pause não existe" vive só na cabeça das sessões. O publicar.sh do lote4 foi morto às 14:20 e deixou a .orq-pause global sem dono, segurando os dois loops até alguém renomear. Falta trava de publicação com pid e uma pausa do publicar.sh que se reconheça órfã quando o pid morre.
- onde já devia estar: docs/defeitos
- ataca: C1
- marco: B

### L6-04 publicar.sh faz cherry-pick só do sha passado e perde commits de baixo
- tipo: DEFEITO NÃO REGISTRADO
- fonte: HANDOFF-17out-madrugada.md, "com origin/main andando, publicar.sh faz cherry-pick so do sha passado e perde os commits de baixo"
- o que aconteceu: uma branch com vários commits publicada depois de a origin/main andar perde todos menos o último. O contorno é rebase manual obrigatório antes de cada publicar.sh, escrito no bloco que o Lucas cola. O script devia recusar (ou rebasear) quando a branch tem mais de um commit à frente da origin/main.
- onde já devia estar: docs/defeitos
- ataca: C1
- marco: B

### L6-05 Staging do loop diverge da origin e o ritual roda com ticket em curso
- tipo: DEFEITO NÃO REGISTRADO
- fonte: HANDOFF-16out-noite-migrations-tokens.md, "Loop apolo travado por staging-apolo local divergente (merge do 5067 sem push contra ritual das 18:27)" e "Ritual do apolo rodou com o loop no meio de um ticket"
- o que aconteceu: o loop mergeou um ticket na staging-apolo local enquanto o ritual empurrou outro merge na origin. O loop travou até um merge --no-ff manual. A própria sessão propôs: o loop resolve sozinho a divergência quando o único commit local é dele, e o ritual recusa enquanto há ticket em execução.
- onde já devia estar: docs/defeitos
- ataca: C1
- marco: B

### L6-06 Dois loops no mesmo repo não existem no kit
- tipo: IDEIA DE MOTOR
- fonte: HANDOFF-15out-loop-apolo.md, "No cartão Apolo, pausar/retomar ficam desligados"; HANDOFF-17out-madrugada.md, "Item 25 do backlog (resolvedor do apolo) precisa de mudanca no orquestrador-kit (docs/fila fixo no kit)"; HANDOFF-16out-noite-lote-49-apolo.md, "O validar-fila roda na staging-auto; o loop, na staging-apolo"
- o que aconteceu: o Comarka roda plataforma e apolo com filas, staging e worktree próprias. A pausa global de uma sessão (Meta) segurou os dois loops; o painel não pausa o segundo; o resolvedor só enxerga docs/fila; o validar-fila valida contra a base errada, e critério que compara com a base nasce "reprovado por dívida pré-existente". O kit não tem conceito de N filas por repo, cada uma com base, pausa e resolvedor próprios.
- onde já devia estar: PECAS
- ataca: C1
- marco: B

### L6-07 Gate não executa o SQL: ticket de migration fica done com bug
- tipo: IDEIA DE MOTOR
- fonte: HANDOFF-17out-manha-migrations-apolo.md, "BUG 5142 fn_fato_crm_dia_calcular: `round(double precision, integer) does not exist`"; HANDOFF-16out-noite-migrations-tokens.md, "'(75) 98122-8387' virava '(75) [CEP]7'"
- o que aconteceu: para ticket *-sql, done é "migration proposta". Passaram pelo juiz e só apareceram no teste a seco humano: round(double) em 5142 e 5169, máscara de telefone em 5070, 16 perguntas em vez de 17 no 5067, gravar do 5183 que falha pela PK. Cada um virou ticket de conserto. Ideia: o gate aplica a migration num banco efêmero (ou em transação desfeita no banco de sombra) e roda a função com o dia de teste antes do juiz.
- onde já devia estar: PECAS
- ataca: C5
- marco: A

### L6-08 validar-fila aprova forma, não aderência à semente do roadmap
- tipo: IDEIA DE MOTOR
- fonte: HANDOFF-15out-f1-lote1-apolo.md, "Mas a revisao reescreveu 13/13: validar-fila nao mede aderencia a semente."
- o que aconteceu: o escritor v0 passou no gate F0 (12/13 no validar-fila), mas a revisão humana reescreveu todos. No lote F1-2, 0 de 7 utilizáveis (deps erradas, forma recusada). Falta um check que confronte o ticket com a semente de origem (deps, tabelas, critérios citados) antes de contar como "ticket bom".
- onde já devia estar: PECAS
- ataca: C2
- marco: D

### L6-09 Escritor em paralelo repete versão de migration
- tipo: DETALHE do item migrations.faixa (PECAS, K11a)
- fonte: HANDOFF-16out-lote-f1-2-apolo.md, "versao de migration repetida quando roda em paralelo"
- o que aconteceu: a regra de faixa confere que o número está dentro da faixa, não que é único entre os tickets pendentes e os arquivos já no dir. O escritor rodando em paralelo gerou versões iguais. A sessão pediu checagem de versão repetida e de cria_novo fora da allowlist no validador.
- onde já devia estar: PECAS
- ataca: C1
- marco: D

### L6-10 Classe de bloqueio repetida não vira aviso na entrada
- tipo: LIÇÃO PERDIDA
- fonte: HANDOFF-15out-f1-lote1-apolo.md, "provavel fixture com id nao-UUID, mesma classe do 1058" e "WARN no validar-fila para ticket que usa lerEspelhoPorEntrada ... com teste de fixture nao-UUID"
- o que aconteceu: 1058 e depois 1060 bloquearam 2x cada pela mesma classe (fixture com id não UUID). A lição só ficou no handoff. Regra geral faltando: classe de bloqueio vista 2 vezes ganha uma camada de aviso no validador na entrada, citando o caso.
- onde já devia estar: PLAYBOOK
- ataca: C1
- marco: A

### L6-11 Camadas 15 e 16 do validador do Comarka sem porte
- tipo: LIÇÃO PERDIDA
- fonte: HANDOFF-16out-noite-migrations-tokens.md, "1138: recon era falso positivo (grep '/api/cron/apolo' casava /api/cron/apolo-atendimento)"; HANDOFF-17out-madrugada.md, "Camadas 15 (teste vizinho) e 16 (grep de rota sem delimitador) dao ERRO"
- o que aconteceu: grep de recon sem delimitador deu falso positivo e marcou o 1138 como já feito; teste vizinho fora da allowlist virou reprova. O Comarka ganhou duas camadas novas na branch fix/harness-reprovas-1317 (PORTE-PENDENTE). O kit não tem nenhuma das duas.
- onde já devia estar: PECAS
- ataca: C1
- marco: B

### L6-12 Migration com drop ou delete cancelada pelo aplicador
- tipo: DETALHE do item MIG-A ("aviso de classe vira trava")
- fonte: HANDOFF-17out-manha-migrations-apolo.md, "O app cancela qualquer migration com drop"
- o que aconteceu: `drop trigger if exists` em tabela nova, `drop table if exists pg_temp` e `delete` no corpo da função fizeram o aplicador cancelar 5140, 5170 e 5196. A sessão editou o .sql à mão (desvio do arquivo) ou mandou pela skill. O escritor e o validador deviam recusar drop inútil em tabela nova e marcar o ticket como "vai pela skill" já na entrada.
- onde já devia estar: PECAS
- ataca: C1
- marco: A

### L6-13 Token derivado da promoção liberado à mão
- tipo: IDEIA DE MOTOR
- fonte: HANDOFF-16out-noite-migrations-tokens.md, "liberar-na-main.py: libera apolo-<id>-na-main so com C1-C3 do ADR-008"; HANDOFF-17out-manha-migrations-apolo.md, "liberar é registro"
- o que aconteceu: tokens como apolo-<id>-na-main são fato mecânico (o commit do ticket está na main), mas dependem de sessão humana; um script ad hoc foi escrito para isso. O loop ficou 17 h parado esperando tokens assim. A promoção devia liberar sozinha todo token cuja condição é verificável no git.
- onde já devia estar: PECAS
- ataca: C1
- marco: A

### L6-14 Done não é produção: promoção atrasada sem alarme
- tipo: DETALHE do item K12 (painel, "última promoção (sem campo no contrato)")
- fonte: HANDOFF-17out-vigia-tarde.md, "Prompt A (promover staging-auto → main, 176 commits)"; HANDOFF-17out-sessao-lote4-adr014.md, "A última promoção staging-auto → main foi em 15/10"
- o que aconteceu: captura de conversas GHL e crons do Apolo ficaram done na staging-auto por 2 dias; o banco seguia com zero linhas e só um recon manual achou a causa. O painel devia mostrar idade e tamanho da promoção pendente e alarmar acima de um limite.
- onde já devia estar: PECAS
- ataca: C5
- marco: C

### L6-15 Pre-commit do validar-fila não aguenta lote grande e vira --no-verify
- tipo: DETALHE do defeito 2026-10-07-validar-fila-timeout-deixa-tsc-orfao
- fonte: HANDOFF-16out-noite-lote-49-apolo.md, "o pre-commit usa 45 s e nao aguenta tsc em 49 tickets, por isso `--no-verify`"; HANDOFF-17out-tarde-lote-38.md, "o `git commit` do Lucas nao concluiu; provavel hook pre-commit"
- o que aconteceu: três lotes (49, 38, 42 tickets) só entraram com --no-verify, e um commit ficou staged sem concluir, calado. O defeito registrado fala do timeout e do tsc órfão, não do custo por lote: falta validar uma vez por lote (tsc e vitest compartilhados) e registrar no commit a prova da validação feita por fora.
- onde já devia estar: docs/defeitos
- ataca: C1
- marco: A

### L6-16 Revisor independente do lote acha o que o validador não acha
- tipo: IDEIA DE MOTOR
- fonte: HANDOFF-17out-sessao-lote4-adr014.md, "`validar-fila`: 0 erro com as camadas 15/16. Um revisor independente achou 5 defeitos bloqueantes"
- o que aconteceu: com o validador mecânico verde, um revisor LLM achou 5 defeitos bloqueantes (limiar com 2 casas, escopo GHL não declarado, nota duplicada, ordem de promoção da lib, tempo do cron). Ideia: revisão LLM do lote na entrada, com objeções ancoradas, como camada de aviso do validador.
- onde já devia estar: PECAS
- ataca: C2
- marco: A

### L6-17 Ticket mira código morto ou peça sem consumidor
- tipo: IDEIA DE MOTOR
- fonte: HANDOFF-17out-vigia-tarde.md, "1271 (substitui o 1248, que mirava o `CockpitVisaoGeral` sem uso desde o 514)"; HANDOFF-17out-tarde-lote-38.md, "a lib do veredito humano (5163) existe, mas NENHUMA rota da plataforma a chama"
- o que aconteceu: o 1248 implementou num componente que nenhuma página importa e foi o único do lote de 38 a não fechar; o 5163 ficou done sem consumidor e o F2-07 ficou pela metade sem ninguém ver. Ideia: o validador confere que o arquivo alvo é alcançável a partir de uma rota ou página, e o planejador lista lib nova sem consumidor.
- onde já devia estar: PECAS
- ataca: C2
- marco: D

### L6-18 Login expirado só o humano resolve, e ninguém é avisado
- tipo: DETALHE do defeito 2026-10-28-disjuntor-conta-falha-de-infra
- fonte: HANDOFF-17out-vigia-tarde.md, "`/login` não funciona pelo Remote Control" e "Fila pausada ... para o disjuntor não bloquear os prontos"
- o que aconteceu: o defeito pede que falha de ambiente não conte no disjuntor e encerre a drenagem. Falta a outra metade: auth expirada é ação exclusiva do humano no terminal do Mac, então o preflight devia pausar com dono e motivo e mandar aviso pela caixa de decisões, em vez de a sessão pausar à mão.
- onde já devia estar: docs/defeitos
- ataca: C1
- marco: A

### L6-19 Versão do CLI no preflight e espera de limite pelo próprio CLI
- tipo: IDEIA DE MOTOR
- fonte: HANDOFF-18out-harness-claude-code.md, "M2 versão do CLI no preflight; M3 regex de limite ...; M4 `CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS` só depois do M3"
- o que aconteceu: a mensagem de limite mudou entre versões do CLI e o limite virou reprova até alguém notar. O M3 já está no kit; M2 (registrar e exigir versão mínima do claude no preflight, com aviso quando muda) e M4 (deixar o CLI esperar o limite em vez do cooldown do motor) não aparecem no PECAS.
- onde já devia estar: PECAS
- ataca: C1
- marco: B

### L6-20 Como desenhar um lote que drena sem humano
- tipo: LIÇÃO PERDIDA
- fonte: HANDOFF-16out-noite-lote-49-apolo.md, "SQL passa de primeira (90%+)" e "arquivos que varios tickets tocam encadeados por dependencia"; HANDOFF-16out-lote3-comercial.md, "Desenho para andar sem humano"
- o que aconteceu: a noite de 17/10 aprovou 58 tickets numa drenagem porque o lote foi desenhado assim: lógica em funções SQL; cadeia por id, nunca por token humano; só o TS que lê tabela nova espera migration aplicada; arquivo compartilhado serializado por dependência; critério que compara com a base é alvo, nunca guarda. É a receita que o planejador do marco D precisa seguir, e hoje está só em handoff e no aprendizados.md do Comarka.
- onde já devia estar: PLAYBOOK
- ataca: C2
- marco: D
