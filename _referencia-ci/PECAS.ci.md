# PEÇAS — backlog do harness

> **Backlog, não histórico.** O que já aconteceu e o porquê ficam em
> `docs/orquestrador/PLAYBOOK.md`, que só cresce. Aqui fica o que ainda vai acontecer, em ordem, e
> uma peça sai desta lista quando entra lá.
>
> Existe porque as peças `0`–`0d` viviam só na memória de sessão: `0d` não aparecia em arquivo
> nenhum e `0c` só existia em comentário de código (`executor.sh:518`, `perfil.ts:125`,
> `diagnostico.ts:30`, `decisao-cli.ts:53`). Lista que só existe no chat some com o chat.
>
> **Formato de cada peça:** uma linha de objetivo · evidência (commit, linha, ticket) · teste que
> prova. Sem os três, não é peça — é ideia.
>
> Escopo: `scripts/orquestrador/**`, `scripts/orq`, `scripts/roadmap/**` e `docs/orquestrador/**`.
> A fila nunca escreve aqui (zona proibida, `no_write_paths`).

## FEITAS

- **Peça 0 · retry na mesma worktree.** Retry reaproveita worktree e commit quando o enforcement da
  tentativa anterior passou; `diff.patch` por tentativa; stderr da sondagem preservado.
  *Evidência:* `3435f53`; o 227 queimou duas tentativas em 18 s (diff 0 em 15 s e 3 s) porque o
  remédio era aplicado numa árvore onde a doença não existia.
  *Teste:* `scripts/orquestrador/test-retry-worktree.sh`.

- **Peça 0b · requeue não destrói evidência, e trabalho não commitado não se perde.** `slot_base_attempt`
  lê o disco e a numeração continua (`attempt-3`, `attempt-4`); `meta.json` ganhou `dir`;
  `commit_do_agente` commita `wip(<id>)` antes de medir o diff.
  *Evidência:* `0e3eec8`; em `runs/227/attempt-0/` o `prompt.txt` e o `claude.txt` da única
  reprovação legítima do loop foram sobrescritos e não têm cópia; na mesma rodada o agente escreveu
  150 linhas e saiu sem commitar, e o pipeline viu diff 0.
  *Teste:* `scripts/orquestrador/test-retry-worktree.sh:218` (caso de produção do `runs/227`).

- **Peça 0c · `--allowedTools` derivado do ticket, `--max-turns` real, `permission_denials` lidos.**
  A allowlist sai dos `cmd` dos gates **e** dos `criterios_aceite` (`toolsDoTicket`); `claude_max_turns`
  deixa de ser config morto; o campo `permission_denials` do envelope vira evento `PERMISSAO_NEGADA`.
  *Evidência:* `df3f12f`; o agente do 227 levou três negativas em `npm run typecheck` (o prompt
  nomeia o gate, a permissão concedia `Bash(npm run typecheck:root:*)`) e gastou 22 turnos e
  US$ 0,52 contra uma parede.
  *Teste:* `test/orquestrador-tools-derivadas.test.ts`.

- **Peça 0d · isolamento de teste: script de teste nunca escreve na trilha de produção.** Os três
  `test-*.sh` declaram `ORQ_TESTE=1` + `ORQ_EXEC_ROOT="$(mktemp -d)/checkout"` ANTES do `source`
  (depois não adianta: `RUNS_BASE` já foi resolvido), e `escrita_de_teste_permitida` no `lib.sh`
  recusa trilha, STATUS e ledger fora do fixture. `anotacao <texto>` grava `ANOTACAO` — a correção
  honesta de um registro append-only é uma anotação ao lado, nunca uma reescrita.
  *Evidência:* `0186d81`; três `EXECUTOR_MORREU rc=1 fase=?` espúrios na trilha real (linhas 153,
  155 e 156: 04/09 20:45:00, 20:47:00 e 20:47:09), sem drenagem por trás; e o `test-preflight.sh`
  já tinha custado US$ 0,34 em chamadas pagas por rodar contra o config real (peça 10 do PLAYBOOK).
  *Teste:* `test/orquestrador-isolamento-teste.test.ts` — a recusa fora do fixture, a escrita normal
  dentro dele, a ordem das declarações nos três scripts, e o `test-drenagem.sh` rodando de verdade
  sem deixar marca na trilha real.

- **Peça 0e · o loop deixa de gastar turno contra a própria permissão.** Três defeitos do mesmo
  circuito — o agente monta comando que nenhuma permissão cobriria, o harness deriva permissão que
  não cobre nada, e a trilha que registra as duas coisas está ilegível. Juntos numa peça porque
  separados cada um conserta meia ponta e nenhum fecha o circuito; **nesta ordem interna**, porque
  a trilha é o instrumento de medida das outras duas.

  **(a) Evento na trilha nunca contém `\n`.** `PERMISSAO_NEGADA` — e qualquer evento que carregue
  comando — grava o comando com `\n` escapado e truncado em **160 caracteres**.
  *Evidência:* medido em 2026-09-05 13:40, com o loop drenando: `docs/fila/runs/events.log` tinha
  **427 linhas, 243 eventos e 184 linhas sem timestamp** — continuação de evento quebrado. Trinta
  minutos antes eram 413/237/176: **o dano cresce a cada drenagem.** A linha **253** (ticket 234,
  13:31:45) corta em `cmds=cd /Users/lucasantos/Projetos/_worktrees/ci-234` e derrama um heredoc
  Python inteiro nas linhas 254-259; a 227 e a 234 mostram o mesmo com
  `cd … && npx tsc … | head -60 | npm --prefix …`. O truncamento já existe em `permissoes_negadas`
  (`executor.sh:518-539`); o escape é que falta.
  *Teste:* alimentar `permissoes_negadas` com o comando multi-linha REAL da linha 253 e afirmar que
  o evento sai em **uma** linha, com `\n` literal e no máximo 160 caracteres de comando.
  *Feito:* `3af530d` — `uma_linha` no `lib.sh`, aplicada dentro do `event()` (ponto de
  estrangulamento: nenhum chamador precisa lembrar do assunto), e `permissoes_negadas` passou a
  escapar ANTES de truncar. `test/orquestrador-trilha-uma-linha.test.ts`.

  **(a2) Reparo único do `events.log`, uma vez só.** Cada linha sem timestamp é recolhida para a
  linha do evento anterior, com `\n` escapado, **conteúdo preservado byte a byte** — nada é
  descartado, nada é reescrito. Ao final, um evento `ANOTACAO` registra que o reparo aconteceu.
  **Não é reescrita de história: é correção de formato.** O que a trilha afirmou continua afirmado,
  na mesma ordem e com os mesmos bytes; o que muda é onde as quebras de linha estão. Sem isto, todo
  `grep`, `tail` e contagem sobre a trilha continua mentindo sobre os eventos já gravados, inclusive
  os que a peça 0d precisa ler.
  *Teste:* depois do reparo, **100% das linhas começam com timestamp** e **o número de eventos é o
  mesmo de antes** (contagem tirada imediatamente antes de reparar — o arquivo cresce enquanto o
  loop roda, então o número absoluto não serve de constante).
  *Feito:* `5ce5e38` — `scripts/orquestrador/reparar-trilha.sh`, com cópia crua do antes, as duas
  invariantes conferidas ANTES de trocar o arquivo, recusa (rc=2) se a trilha começa com linha órfã
  e no-op na segunda passagem. `test/orquestrador-reparo-trilha.test.ts`, sobre o recorte real
  253-382 da trilha de produção.

  **(b) A derivação de `allowedTools` entende aspas.** `prefixoDeCmd` corta no primeiro `|`
  (`perfil.ts:77`) sem saber se ele está dentro de aspas — e num `grep -E` ele quase sempre está.
  *Evidência:* medido nos 5 tickets do lote 8 (246-250): **20 critérios** cujo prefixo derivado fica
  com aspas abertas. Ex.: `test $(grep -cE 'export const WARN_(TRENDS|PERGUNTAS)_DEGRADADO' …)` vira
  a permissão `Bash(test $(grep -cE 'export const WARN_(TRENDS)` — que não casa nada e não autoriza
  nada. Os cinco tickets já estão em `main` e vão drenar assim.
  *Teste:* `prefixoDeCmd` sobre esses 20 `cmd` reais devolve prefixo com aspas balanceadas.
  *Feito:* `1b0dd27` — `prefixoDeCmd` passou a varrer caractere a caractere e só corta no `|` ou no
  espaço duplo que esteja FORA de aspas e FORA de `$(…)`; `$(…)` entra junto porque um `|` ali é do
  subcomando, e cortar nele deixaria parêntese aberto. Medido no corpus real de novo: **21** dos 105
  critérios de 246-250 (a peça anotou 20; o 250 foi reescrito desde então).
  `test/orquestrador-prefixo-aspas.test.ts`, com a derivação ANTIGA escrita no teste para medir o
  dano que ela causava.

  **(c) O prompt do agente ganha bloco fixo "COMO RODAR COMANDOS".** Três regras: o `cwd` já é a raiz
  da worktree, **nunca** prefixe com `cd`; **um comando por chamada**, sem `&&` nem `|` encadeando
  ferramentas diferentes; e os comandos autorizados são exatamente estes — seguidos da lista, na
  forma exata. **Requisito, não sugestão:** a lista é gerada da MESMA string que vai em
  `--allowedTools` (`executor.sh:633`, `toolsDoTicket` em `perfil.ts:125`) — `BASE_TOOLS` mais os
  `cmd` dos gates mais os `cmd` dos critérios, variando por ticket. Lista fixa no prompt recria, em
  texto, o desalinhamento que a peça 0c matou no código; e sem **(b)** a lista gerada ainda estaria
  errada, que é a razão de (b) vir antes de (c).
  *Evidência:* o **230 perdeu 6 turnos** e o **234 perdeu 4** em `permission_denials` por `cd &&` e
  por pipes (`events.log` 227, 234, 253). É a repetição do incidente do 227 que gerou a peça 0c, por
  outra porta: lá a permissão não cobria o comando, aqui o agente monta um comando que nenhuma
  permissão poderia cobrir.
  *Teste:* o `prompt.txt` de uma tentativa contém o bloco e a lista, e a lista bate item a item com
  o argumento `--allowedTools` daquela chamada.
  *Feito:* `24cb0ae` — `tools_do_ticket` no `executor.sh` é a fonte única; `run_attempt` deriva uma
  vez e passa a MESMA variável para o `build_prompt` e para o `--allowedTools`, e `build_prompt`
  deriva sozinho quando o argumento falta, para que não exista prompt sem lista.
  `test/orquestrador-prompt-como-rodar.test.ts` roda `run_attempt` de verdade com `claude_run`
  interceptado: o `prompt.txt` e o `--allowedTools` comparados são os da MESMA chamada.

- **Peça 11 · o disparo do launchd deixa de ficar refém de um STATUS congelado.** `launchd-run.sh`
  aplica a checagem de STALENESS — `DESDE` além de `claude_timeout_secs` ⇒ processo morto ⇒ recupera
  (evento na trilha, STATUS limpo) e SEGUE — **antes** de decidir "já há drenagem em curso"; e `orq`
  passa a mostrar `MORTO há Xh` nesse caso, em vez de `executando`. A guarda por processo é **por
  repo** — o pid do lock em `runs/`, nunca um `pgrep` global: dois orquestradores na mesma máquina é
  operação normal (`PLAYBOOK.md`, 2026-09-02).
  *Evidência:* STATUS congelado em `executando` desde 06/09 12:38 bloqueou **22 h de disparos do
  launchd**, todos com exit 0. O snapshot dizia `executando` o tempo inteiro e nada estava rodando:
  a única coisa viva ali era o campo `estado`.
  *Teste:* fixture com `desde_epoch` além do timeout **e** lock com pid VIVO decide `recupera` (a
  staleness vence a guarda de processo — é isto que "antes" quer dizer), grava `RECUPERADO` e
  dispara; com `desde_epoch` recente e pid vivo decide `em-curso` e não dispara; `orq` sobre o
  primeiro fixture imprime `MORTO há`.
  *Feito:* `380ccb1` — `status_congelado_secs`/`dur_humana` no `lib.sh` (leitura pura, compartilhada
  para que `orq` e `launchd-run.sh` não divirjam); `decidir_disparo` no wrapper, com a staleness
  primeiro; `orq` troca a linha ESTADO NA LEITURA, sem reescrever o arquivo. De quebra, o wrapper
  passou a resolver o próprio caminho só com builtins: o `dirname` que estava ali roda ANTES do
  `export PATH` e falhava em silêncio sob o launchd. `test/orquestrador-disparo-congelado.test.ts`.

- **Peça 12 · morte por sinal deixa rastro.** `trap` em `TERM` e `INT` além de `EXIT`: o executor
  morto por sinal grava `EXECUTOR_MORREU` (com o sinal) e **limpa o STATUS**, em vez de deixá-lo
  congelado em `executando`.
  *Evidência:* `local-loop.log` de 06/09 15:38 UTC: `gates: REPROVADO (rc=143)` seguido de
  `Terminated: 15`, e **nenhum evento na trilha**. 143 é 128+15: o processo foi morto por SIGTERM, e
  trap só de `EXIT` não roda nesse caminho — o EXIT trap só é executado por sinal quando o sinal
  está trapeado. O STATUS que sobra dessa morte é exatamente o que a peça 11 tem de recuperar.
  *Teste:* executor com os traps armados recebendo SIGTERM DE FORA grava `EXECUTOR_MORREU sinal=TERM
  rc=143` na trilha do fixture e deixa o STATUS fora de `executando`.
  *Feito:* `ea94603` — `armar_traps` arma EXIT, TERM e INT; `registrar_morte` é o registro
  compartilhado (evento + STATUS de volta ao chão) e `trap_sinal` desarma o EXIT antes de sair, para
  uma morte ser um registro. `test/orquestrador-morte-por-sinal.test.ts`, com o sinal enviado DE
  FORA por um processo irmão — `kill -TERM $$` provaria só que o handler roda quando chamado.

- **Peça 13 · notificação só quando houve o que notificar.** A drenagem notifica quando processou ao
  menos um ticket (aprovado, bloqueado, adiado, refatiado ou `EXECUTOR_MORREU`) **ou** quando a fila
  ficou sem processável pela PRIMEIRA vez desde a última drenagem que processou. Saída por lock em
  uso ou por "já há drenagem em curso" (peça 11) não notifica.
  *Evidência:* 07/09 11:0x — cartões nativos "0 aprovados · duração 0min · último —" a cada tick do
  launchd, enquanto o 240 ainda rodava. Notificação que chega quando nada aconteceu treina o
  operador a ignorar a notificação que importa.
  *Feito:* `84294ea` — `deve_notificar` no `lib.sh` decide E mantém o marcador
  `runs/.notificacao-fila-vazia`, que é ARQUIVO porque cada tick do launchd é um processo novo e é a
  repetição que se quer calar; `MOTIVO_FILA_VAZIA` virou constante compartilhada; `EXECUTOR_MORREU`
  é contado na trilha ANTES e DEPOIS do laço, porque o executor morre num processo filho e o rc não
  distingue morte de reprovação. `refatiar` entrou na conta de "processado" — o PECAS não o listava,
  mas é desfecho de executor que rodou e gastou. Medido: com o comportamento antigo, dez ticks com a
  fila vazia escreviam **dez** linhas; hoje escrevem **uma**.
  `test/orquestrador-notificacao.test.ts`.

- **Peça 1 · gate de ticket (`scripts/orquestrador/gate-ticket.ts` + `orq validar`).** Passos 1-6 de
  `autoalimentacao.md` §2, na parte que é SCRIPT e custa zero token: bloco ```json parseável, campos
  obrigatórios do pendente, `id` `NNN[a]` igual ao prefixo do arquivo, `status` no vocabulário,
  `tipo`/`cmd`/`espera` de cada critério, padrões proibidos no `cmd`, dependência por id existente ou
  `humano:<token>`, e allowlist sobreposta entre pendentes sem dependência declarada. Uma linha por
  violação (`<arquivo>:<campo> <mensagem>`), rc 1 se houve; `--relatorio` imprime tudo e sai 0.
  *Evidência:* pré-voo B, item **8.9** segue NO-GO (`PLAYBOOK.md:85`) — enquanto for, o teste
  vermelho de cada ticket é verificado à mão, como foi em todo o lote 8.
  *Feito:* `9edbf65` — a chave do config é `gate_ticket.proibido_no_cmd` (o briefing pedia
  `padroes_proibidos`, que não existe no repo); a PRECEDÊNCIA entre prefixo permitido e padrão
  proibido virou regra escrita no `autoalimentacao.md` §2, por decisão do dono de 07/09. Rodado
  contra os 7 pendentes reais: **33 violações, 25 isenções**, saída inteira no PLAYBOOK. Nenhum
  ticket corrigido — corrigir fila é sessão de fila.
  `test/orquestrador-gate-ticket.test.ts` (41 casos) e `test/orq-cli.test.ts`.

## PENDENTES

Nesta ordem.

As peças do DISPARO (11, 12 e 13) já saíram: enquanto valeram, a fila drenava às cegas — ou não
drenava e ninguém percebia. A **1b** vem antes das numeradas porque é o resto do 8.9, e o 8.9 é o que
segura o pré-voo C.

- **Peça 1b · o gate EXECUTA o que hoje só lê.** Falta da peça 1, por decisão: `alvo` que já passa
  contra HEAD, `guarda` que já falha contra HEAD, e execução de `recon[]`. Tudo isso roda comando
  escrito por modelo, e o §2 cerca com worktree descartável, sem `.env` de produção, com
  `gate_ticket.timeout_cmd_secs` — outra peça e outra classe de risco.
  *Evidência:* o 8.9 continua NO-GO enquanto o teste vermelho não for conferido por máquina.
  *Teste:* fixture com critério `alvo` que já passa contra HEAD ⇒ descartado `vermelho`; `guarda` que
  já falha ⇒ descartado; `cmd` que estoura o timeout ⇒ `invalido`, não `vermelho`.

1. **Sondagem: uma por drenagem, zero com fila vazia.**
   *Evidência:* `probe_modelos` é chamada em `executor.sh:126`, por execução do executor, e é chamada
   **paga** (`executor.sh:161` já a protege com o gate de orçamento, o que confirma o custo).
   *Teste:* drenagem com N tickets faz 1 sondagem; drenagem com fila vazia faz 0, provado pela
   ausência de registro `probe` em `custo.json`.

2. **`orq erro` aponta a tentativa que reprovou; `orq ticket` lista todas.**
   *Evidência:* `scripts/orq:251-252`; hoje `orq erro` escolhe o recorte pela ordem do pipeline, não
   pela tentativa, então num ticket com retry ele pode explicar a tentativa errada.
   *Teste:* ticket com `attempt-3` reprovado e `attempt-4` adiado — `orq erro` cita a 3.

3. **Repo map em `docs/orquestrador/REPO-MAP.md`.**
   *Evidência:* pré-voo, item **8.8**, NO-GO desde 2026-09-03 (`PLAYBOOK.md:66` e `:85`); o context
   pack do executor prevê assinaturas via repo map (`references/custo-e-contexto.md:26`) e o arquivo
   não existe.
   *Teste:* o context pack monta com as assinaturas dos arquivos da allowlist e respeita
   `contexto.cap_tokens_executor`.

4. **Pré-voo C com 8.8 e 8.9 GO.**
   *Evidência:* os dois são os únicos NO-GO que sobraram das sessões B e C (`PLAYBOOK.md:85`).
   *Teste:* o pré-voo C roda e nenhum item fica NO-GO.

5. **Adiado é progresso.** A drenagem segue para o próximo ticket processável depois de
   `ORCAMENTO`/adiado, e `DRENAGEM_FIM` conta os adiados, inclusive `escopo=ticket`.
   *Evidência:* `lib.sh:764-778` — o adiamento por orçamento grava `adiado_ate` e emite `ORCAMENTO`,
   e `lib.sh:315-318` já sabe pular ticket adiado na seleção; o que falta é a drenagem não tratar o
   adiamento como fim de rodada.
   *Teste:* fila com [adiado, processável] termina com o segundo executado e o placar do
   `DRENAGEM_FIM` contando 1 adiado.

6. **Adiamento por orçamento reabre quando o teto sobe.** Hoje `adiado_ate` fica gravado no ticket
   (`lib.sh:775`) e a seleção o respeita (`lib.sh:315-318`) sem reler o config: subir
   `orcamento.teto_dia` não devolve o ticket à fila até a data passar.
   *Evidência:* `lib.sh:764-778`.
   *Teste:* ticket adiado por teto de US$ X volta a ser processável quando o config passa a US$ 2X,
   sem esperar o dia seguinte e sem edição manual do ticket.
