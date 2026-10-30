# Relatório de status: porte-actus (pausa de coordenação)

Data: 24/09/2026, entre 17:17 e 17:30 (-0300). Worktree: `~/Projetos/_worktrees/kit-porte-actus`, branch `porte-actus`, HEAD `4cd219b`.
Tudo abaixo foi feito só com leitura. Nenhum commit, nenhum `instalar.sh`, nenhuma escrita em repo. Os únicos arquivos gravados foram este relatório e scripts e saídas no scratchpad da sessão.

## 0. Antes de tudo: o estado não bate com a mensagem de pausa, e há outra sessão escrevendo nesta worktree

1. **O commit f existe.** A mensagem fala dos commits de `d5efe1a` a `7aa291d` e de 4 arquivos novos não commitados. Os 4 (`test/fixtures/orquestrador-base-vermelha/`, `test/orquestrador-arquivo-solto.test.ts`, `test/orquestrador-base-vermelha.test.ts`, `test/orquestrador-fila-json-quebrado.test.ts`) já estão commitados em **`4cd219b` porte-actus f** (17:14:52). A branch tem 6 commits, a–f.
2. **Não havia 15 arquivos modificados.** Às 17:17 o `git status` mostrava 3 modificados (`test-fixture-executor.sh`, `test-reabertura-humana.sh`, `test-reprovado-sub.sh`: +43 linhas, "item j") e `node_modules` não rastreado. Os 15+4 da mensagem parecem ser o estado de antes do commit f.
3. **Outra sessão Claude continua trabalhando nesta worktree durante a pausa.** Às **17:23:00** o processo bash PID 45648 (scratchpad `/private/tmp/claude-501/-Users-lucasantos/b67b5c43-e77d-41de-bb85-af758a35eb53/`) fez o seguinte:
   - copiou os 3 arquivos do item j para `.../b67b5c43.../scratchpad/j-novos/`;
   - **sobrescreveu os 3 na worktree com a versão do HEAD** (`git show HEAD:... > arquivo`);
   - rodou `scripts/kit/test-shell.sh` com um `node -e "for(;;){}"` por núcleo (10 núcleos a 100%). Isso explica o **load 100** da máquina;
   - vai copiar os 3 de volta quando terminar. Às 17:27 ainda rodava (etime 04:26).

   Por isso, **agora** o `git status` mostra só `?? node_modules`: as mudanças do item j não estão na worktree. O backup está íntegro (+17, +17, +9 = as mesmas 43 linhas que vi às 17:17). Guardei uma cópia de segurança em `/private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-porte-actus/32d2abb5-0226-4db3-90e4-3a0a28a95090/scratchpad/item-j.patch` (aplicável com `git apply`). **Não mexi em nada**: se a outra sessão terminar normalmente, ela mesma restaura.
   **Ação de coordenação:** a pausa não chegou (ou não foi respeitada) nessa sessão `b67b5c43`. Ela precisa ser parada ou avisada, e depois é preciso conferir se o item j voltou para a worktree.
4. **A minha rodada de `test-shell` ficou contaminada.** Ela rodou das 17:21:50 às 17:26:42, em paralelo com a da outra sessão a partir das 17:23. As duas usam os mesmos caminhos de fixture: apareceram `fatal: '/tmp/_worktrees/fx-901' already exists` e `branch 'frente/902' está em uso por outra worktree` na minha saída. Além disso, os scripts do item j foram trocados no meio da rodada. O rc 0 dela **não vale como evidência**, e a rodada da outra sessão (o "contra-teste" do item j) também está contaminada pela minha.

**Atualização 17:31:** o processo 45648 terminou e os 3 arquivos do item j voltaram para a worktree (`git status`: os 3 com `M`). O item j está de novo presente. A sessão `b67b5c43` continua sem ter recebido a pausa, e o contra-teste dela está contaminado (item 0.4).

## 1. Origem do brief e escopo de escrita

- **Não tenho o texto do brief.** Esta sessão começou com a mensagem de pausa e não herdou o contexto de quem fez os commits a–f (que muito provavelmente é a sessão `b67b5c43`, citada no item 0.3). Em `~/orq-sessoes/` não existe arquivo de brief do porte. O `grep` por `porte-actus|PORTE-PENDENTE` só acha `levantamento-bloqueios.md` e `relatorio-actus-bloqueados-e-fila.md`, que não são brief. Quem tem o brief é a sessão `b67b5c43` ou o coordenador.
- **Escopo inferido dos commits** (não é o autorizado, é o que foi tocado): na worktree `kit-porte-actus`, branch `porte-actus`, `scripts/orquestrador/*`, `test/*` (testes e fixtures) e `scripts/kit/test-shell.sh`. Nenhum commit toca `CHANGELOG.md`, `docs/PECAS.md`, o `actus-saas` ou o `conteudos-infinitos`.

## 2. Peças feitas (6 commits sobre `596ca4c`)

| Commit | O que porta | Origem no actus-saas | Vermelho antes? | Suítes (do commit) |
|---|---|---|---|---|
| `d5efe1a` a | regras do gate de ticket: `grep -q` em pipe reprova, saída textual do vitest reprova, AVISO de caminho do objetivo fora da allowlist, "PROIBIDO" não avisa | `aab3f4e`, `a15daca`, `c7e81bc` | não registrado. Dois testes do kit ajustados, "sem afrouxar" | npm test 1227/1227, typecheck 0, test-shell 19/19, test-instalar ok |
| `9eebef1` b | gate de ticket como pré-voo do `drive_ticket`, com `gate_ticket.modo_pre_voo` aviso\|bloqueia (padrão aviso) | `c404986` | não registrado | 1227/1227, tc 0, test-shell 20/20, test-instalar ok |
| `2652000` c | `contexto_juiz` (622) | `76af390` | não registrado. O hash do prompt sem o campo foi conferido | 1241/1241, tc 0, test-shell 20/20, test-instalar ok |
| `69e1e9b` d | causa `ambiente` só com critério não executado (rc 126/127), teto de 3 adiamentos consecutivos por ambiente, cooldown não global | `08afb3e`, `43fccdd`, `9ecd02b`, `8eec421` (625), `ae29dcd`, `9e109cb`, `274a216` (629, os timeouts) | não registrado | 1257/1257, tc 0, test-shell 21/21, test-instalar ok |
| `7aa291d` e | motivo do juiz no retry, `retry_sem_mudanca` (623), gates com fonte única e `gates_ausentes` corrigido (626) | `0aa3c83`, `77aa9a3` | **sim, parcial:** o caso E do `test-reprovado-sub.sh` é o contra-teste da reconciliação do 623 (sem a condição rc 0 ele vira BLOQUEADO em vez de ADIADO) | 1268/1268, tc 0, test-shell 21/21, test-instalar ok |
| `4cd219b` f | JSON quebrado falha alto (630), `base_vermelha` (632), `arquivo_solto` (631), 8ª causa no `--migrar` (ITENS_NOVOS) | `7f64c80`, `284a147`, `0c093de` | **sim, parcial:** o caso C do `test-reprovado-sub.sh` expôs a entrada do fixture (arquivo vermelho fora da allowlist) | 1285/1285, tc 0, test-instalar ok. test-shell 21/21 **na 2ª rodada**: na 1ª, `test-painel-lento.sh` falhou por tempo com load 7,6 |

Os commits não registram "rodou vermelho antes da mudança" peça a peça, fora os dois contra-testes citados. Verificar isso agora exigiria checkout da base, e a pausa proíbe.

**Rodada de hoje (17:19–17:26, só leitura, HEAD `4cd219b` + item j ainda presente até 17:23):**

| Suíte | rc | Carga (load1) | Vale? |
|---|---|---|---|
| `test-reabertura-humana.sh` (com item j) | 0, 28 s | 102 | sim |
| `test-reprovado-sub.sh` (com item j) | 0, 51 s | 102 | sim |
| `tsc --noEmit` | 0 | ~100 | sim |
| `vitest run` | 0, 58 arquivos, **1285/1285** | 95 | sim, porque o item j não toca `.ts` |
| `scripts/kit/test-shell.sh` | 0, 21/21 | 75 | **não**, contaminada (item 0.4) |
| `test-instalar.sh` | **não rodei**: ele chama o `instalar.sh --verificar`, e a pausa proíbe | | |

## 3. Trabalho não commitado

| Arquivo | Peça | Estado |
|---|---|---|
| `scripts/orquestrador/test-fixture-executor.sh` (+9) | **item j**: `FXE_CLAUDE_TIMEOUT` opcional no molde (troca o `claude_timeout_secs` de 2 s) | Pronto no conteúdo. **Não está na worktree agora**: está no backup da outra sessão e no meu `item-j.patch` |
| `scripts/orquestrador/test-reabertura-humana.sh` (+17) | item j: timeout do agente falso = 10 s × fator de carga (load1/núcleos, teto para cima, mínimo 1), padrão do 629 | Idem. Passou isolado com load 102 (rc 0) |
| `scripts/orquestrador/test-reprovado-sub.sh` (+17) | item j: o mesmo bloco | Idem. Passou isolado com load 102 (rc 0) |

Os 4 "novos" da mensagem estão commitados em `4cd219b` (peça f). Dos "15 modificados" da mensagem não sobrou nenhum além dos 3 acima.

**Leitura do item j:** o conteúdo está pronto, mas não tem contra-teste válido. A prova de que os scripts antigos falham sob carga é justamente o que a sessão `b67b5c43` estava rodando, e a rodada ficou contaminada pela minha. Observação de desenho: a carga é medida uma vez, no início do script. Com load 100 em 10 núcleos o timeout vira 100 s por chamada, o que é correto para o propósito, mas deixa um caso travado de verdade demorar muito para cair.

## 4. PORTE-PENDENTE do actus-saas (`docs/orquestrador/PORTE-PENDENTE.md` em `e01b5e0`)

A lista tem **18 linhas de commit** (6 de 22/09 + 12 do harness manual), não 17, e mais 7 defeitos na seção "sem correção", dos quais 4 já foram resolvidos pelos próprios tickets. Status contra a branch `porte-actus`:

| # | Origem | O quê | Status |
|---|---|---|---|
| 1 | `76af390` | contexto_juiz (622) | **portado** (c) |
| 2 | `ae29dcd` | teto de adiamento por ambiente | **portado** (d) |
| 3 | `c7e81bc` | "PROIBIDO" não gera aviso | **portado** (a) |
| 4 | `9e109cb` | adiamento de um ticket não arma cooldown global | **portado** (d: teste no `test-drenagem.sh`) |
| 5 | `315dacf` | comentário 471→481 | **não iniciado** (trivial). O kit ainda diz "(471)" em `test-drenagem.sh:170` |
| 6 | `9ecd02b` | ambiente não engole falha de gate nem juiz | **portado** (d) |
| 7 | `8f38783` | `tsconfig.scripts.json` (621) | **descartado, não se aplica**: o `tsconfig.json` do kit já inclui `scripts` e `test`, e o `tsc --noEmit` cobre o motor |
| 8 | `0aa3c83` | 623 motivo do juiz e `retry_sem_mudanca` | **portado** (e) |
| 9 | `8eec421` | 625 critério que rodou é mérito | **portado** (d) |
| 10 | `77aa9a3` | 626 gates de fonte única | **portado** (e, com o defeito de `gates_ausentes` corrigido) |
| 11 | `274a216` | 629 timeouts do teto de ambiente | **portado** (d). O item j não commitado estende o mesmo padrão aos scripts de shell |
| 12 | `7f64c80` | 630 JSON quebrado | **portado** (f) |
| 13 | `284a147` | 632 base_vermelha | **portado** (f) |
| 14 | `0c093de` | 631 arquivo_solto | **portado** (f) |
| 15 | `a196762` | 514 `orq-pause` com as duas sentinelas | **não iniciado**. O `orq-pause.sh` do kit só conhece `.orq-pause` (o `lib.sh` já lê as duas) |
| 16 | `0e2d2ad` | 627 bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ" no prompt | **não iniciado** |
| 17 | `d825b2c` | 628 definições dos helpers chegam ao juiz | **não iniciado** |
| 18 | `8d16413` | 624 pré-voo executa `exemplos_regex` (check 10) | **não iniciado** |

Defeitos da seção "sem correção" que não viraram ticket:

| Defeito | Status no kit |
|---|---|
| `liberar-cli.ts:126` com top-level await quebra no tsx/CJS (3 ocorrências no Actus) | **não iniciado**: a linha continua igual no kit |
| `executor.sh:28` zera o `STUB` no `source` (US$ 0,95 gastos) e a proposta `ORQ_PROIBE_CLAUDE_REAL` | **não iniciado**: a linha 28 continua igual e não há trava |
| falso positivo do `vitest.config.ts` no lookahead `(?![\w-])` | **não iniciado**: o regex continua igual em `gate-ticket.ts:320` |

Resumo: **13 portados, 1 descartado (7), 4 não iniciados na lista (315dacf, 514, 627, 628, 624; o 315dacf é só um comentário) e 3 defeitos não iniciados.** Nada está "em curso" além do item j.

## 5. Gate de ticket sobre os tickets `done` reais

Script no scratchpad (`gate-done.ts`) importa `lerFila`, `carregarCfg` e `validarTicket` do `gate-ticket.ts` desta branch e roda **em memória**. O gate só lê (`readFileSync` e `git cat-file -e`). Conferi depois: `git status docs/fila` com 0 mudanças nos dois repos. O check 10 (624) não existe no kit, então não entra na conta.

**Resposta literal: 0.** Os checks 2 e 5 a 9 só rodam em ticket `pendente`, e o pré-voo só roda no pendente selecionado. Um ticket `done` nunca é selecionado, e mesmo que fosse, só passaria pelos checks 1, 3 e 4, que todos passam. Nenhum `done` dispara `GATE_TICKET_AVISO`.

**Simulação útil: cada `done` tratado como se fosse o pendente selecionado hoje** (os outros tickets com o status real):

| Repo | Tickets | done | Marcados (≥1 violação → `GATE_TICKET_AVISO`) | Só AVISO (não marca) |
|---|---|---|---|---|
| actus-saas | 153 (143 done, 3 pendente, 6 bloqueado, 1 obsoleto) | 143 | **72** | 58 |
| conteudos-infinitos | 86 (84 done, 1 bloqueado, 1 pendente) | 84 | **84** (todos) | 0 |

Checks que mais disparam (tickets distintos / ocorrências):

- **actus-saas:**
  1. `risco` obrigatório ausente: 60 / 60
  2. `criterios_aceite[].tipo` fora de alvo\|guarda\|avaliador: 60 / 340
  3. vitest com saída textual em vez do rc: 41 / 41 (+4 e +2 em variantes `npx vitest run`)
  4. `grep -q` em pipe: 14 / 14
  5. padrão proibido (`2>&1` e redirecionamentos em `tsc`, `git diff` de migração): 8 + 5 + 4 tickets
  6. redirecionamento que escreve arquivo: 3
  7. AVISO de caminho do objetivo fora da allowlist: cerca de 10 tickets (migrações, `vitest.config.ts`, cliente GHL)
- **conteudos-infinitos:**
  1. vitest com saída textual: 52 / 73 (`cd apps/web && npx vitest…`), +16, +10, +6, +5, +4 em outras variantes. É **de longe o maior**
  2. `risco` ausente: 21 / 21
  3. `tipo` de critério inválido: 21 / 135
  4. muitas ISENÇÕES (`test $(grep -c …)` por prefixo permitido): não marcam

**Leitura:** `risco` e `tipo` vêm de tickets antigos, anteriores ao esquema atual (quase todos os marcados do Actus com 5 ou mais violações são da faixa 110–447 e 611–619). O que mostra criterio real que o gate novo pegaria é a regra do **vitest textual**, que sozinha marca a maioria do conteudos-infinitos, e o **`grep -q` em pipe** no Actus. Se o CI adotasse `modo_pre_voo: "bloqueia"`, praticamente todo ticket escrito no estilo atual do repo seria bloqueado. Isso confirma o padrão "aviso" do commit b. Não conferi se algum dos 41+52 casos de vitest é o falso positivo do `vitest.config.ts` (defeito não portado).

## 6. Conflitos ao rebasear sobre `b3f6890`

- Desde `596ca4c` a main tem `685de81` (local-loop.sh +7/-1, test-ambiente.sh +34) e `b3f6890` (CHANGELOG.md, docs/PECAS.md).
- **Interseção de arquivos entre a main e a branch: vazia.** A branch não toca `local-loop.sh`, `test-ambiente.sh`, `CHANGELOG.md` nem `PECAS.md`, e o item j também não. **Conflito textual esperado: nenhum.** O `test-shell.sh` da branch já inclui `test-ambiente.sh` na lista.
- Pontos semânticos a verificar depois do rebase (não são conflito):
  1. O hotfix faz a regra de AMBIENTE do `local-loop.sh` (mesma causa em dois tickets) **disparar de verdade** a partir de agora. Quando dispara, ela desfaz o `.adiamentos` do RUNS_BASE (`contador_desfazer`), mas **não** o `adiamentos_ambiente` que a peça d grava no JSON do ticket (`executor.sh:1407-1417`). Dois tickets adiados por `ambiente` num mesmo disparo podem, então, somar para o teto de 3 consecutivos mesmo quando o loop concluiu que o problema é do ambiente. Precisa de um teste que junte as duas regras. Não verifiquei se falha.
  2. Nenhuma das linhas novas da branch usa `awk -v` com texto livre, então o bug do hotfix não se repete ali.
  3. O CHANGELOG e o PECAS da main vão precisar das entradas das peças a–f (e j) no fechamento, porque a branch não registrou nenhuma.

## Parado

Não continuo o porte até o próximo brief. Pendência que depende do coordenador: **a sessão `b67b5c43` ainda está escrevendo nesta worktree** (item 0.3).
