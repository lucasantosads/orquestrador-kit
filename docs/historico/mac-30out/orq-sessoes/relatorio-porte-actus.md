# Relatório porte-actus: rebase, j2 e fechamento

Sessão fb415487, 24/09/2026, 18:10–22:25 (-0300). Worktree `~/Projetos/_worktrees/kit-porte-actus`, branch `porte-actus`.
HEAD final **`ea28962`**, sobre main `b3f6890`. Sem push, sem merge, sem worktree nova, sem `claude -p`, sem escrita no conteudos-infinitos nem no actus-saas. O symlink `node_modules` está intacto.
Logs de tudo em `/private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-porte-actus/fb415487-6dcc-4745-8b2f-eea365360049/scratchpad/` (subpastas `j/`, `pecas/`, `fechamento/`).

**O que é meu e o que herdei.** As peças a até i foram escritas pela sessão b67b5c43. Eu as herdei. O que **verifiquei** nelas:
- o contra-teste de cada peça no próprio commit (§3);
- a simulação do gate (§6);
- as suítes do fechamento (§8).

O que **só herdei**, sem conferir no actus-saas:
- os SHAs de origem no Actus (vêm das mensagens de commit e do relatório de status);
- a fidelidade de cada porte ao original;
- os números de suíte gravados em cada commit.

As peças **j2** (commit) e o **contra-teste do j** são meus.

## 1. Brief
`~/orq-sessoes/brief-porte-actus.md` está gravado como **AUSENTE**. A primeira mensagem de usuário do transcript b67b5c43 (linha 4 do jsonl, 13:59Z) é a ordem de registrar o PORTE-PENDENTE no actus-saas, e não o brief do porte. O arquivo aponta as mensagens que tratam do porte (linhas 1479, 1600 e 2366 do jsonl), sem copiar o texto delas. O escopo desta sessão veio das duas mensagens de coordenação de 24/09.

## 2. Rebase sobre main (`b3f6890`)
- **1ª tentativa:** a..h aplicaram; o **i** conflitou em `CHANGELOG.md`, porque as duas pontas acrescentam uma seção depois da mesma linha 699. Rodei `git rebase --abort`, parei e reportei.
- **2ª tentativa, com autorização:** as duas seções ficaram inteiras, a do hotfix-awk primeiro e a do porte depois, com uma linha em branco entre elas.
  - Conferi que nenhuma linha da main foi removida.
  - Conferi que o acréscimo é byte a byte o do commit i.
  - `git rebase --continue` terminou com rc 0 e sem outro conflito.
- **Depois do rebase:** `test-ambiente.sh` sozinho deu rc 0, e o **caso 4 do hotfix segue verde** ("1 AMBIENTE em cada um dos 4 disparos", "906 e 907 não bloqueados").
- **SHAs antes → depois:** a d5efe1a→017e3cc · b 9eebef1→89e0afc · c 2652000→1259eca · d 69e1e9b→8557f7a · e 7aa291d→ab1d848 · f 4cd219b→262feea · j 411b88f→886b656 · g fbbd6dd→bea11e7 · h ac10faa→957c178 · i 1a649b9→f4605b7.
- **Achado:** a seção do porte no `CHANGELOG.md` cita os SHAs **de antes do rebase** (d5efe1a…). Não editei o texto, conforme a instrução. Também não há entrada de CHANGELOG para o j2 (§5).

## 3. Peças: origem no Actus e o teste que falha sem cada uma

Método: para cada peça, copiei a árvore **do próprio commit** para o scratchpad (`git archive`, com git próprio e `node_modules` apontando para o mesmo destino do worktree). Rodei os testes da peça em verde, reverti **só o código** do commit (os testes ficam) e rodei de novo. Os testes de shell rodam dentro do fixture instanciado pelo `fixture.sh`, como no `test-shell.sh`.

Por que não no HEAD: a reversão de a, b, c, d, e e do 624 não aplica limpo no HEAD, porque commits posteriores mexem nas mesmas linhas. Para o j2, a árvore é o próprio HEAD. Logs: `pecas/<peça>-{verde,vermelho}-*.log`.

| Peça (sha) | Origem no Actus (herdada) | Verde com a peça | Sem a peça (o que falha) |
|---|---|---|---|
| a `017e3cc` | aab3f4e, a15daca, c7e81bc | vitest 90/90 | **38 de 90 falham**: `gate-grep-q` (ex.: "901 (o critério real do 431) reprova, e pela regra do grep -q") e `gate-vitest-aviso` |
| b `89e0afc` | c404986 | vitest 62/62, `test-gate-prevoo.sh` rc 0 | **`test-gate-prevoo.sh` rc 1, 17 FALHA** ("o ticket 901 foi EXECUTADO com critério inválido", "status=aguardando_merge (esperado bloqueado)"); vitest 2 falham (`toolchain-tsx` "as 15 chamadas…", `tools-derivadas` "todo caminho de desfecho nomeado marca DESFECHO_NOMEADO") |
| c `1259eca` | 76af390 (622) | 14/14 | **9 de 14** em `contexto-juiz.test.ts` (ex.: "(d) caminho que não existe na branch alvo: violação que nomeia o caminho") |
| d `8557f7a` | 08afb3e, 43fccdd, 9ecd02b, 8eec421 (625), ae29dcd, 9e109cb, 274a216 (629) | vitest 117/117, `test-drenagem.sh` e `test-tentativas-persistidas.sh` rc 0 | **9 de 117**: `criterio-merito` ("critério com rc 126/127 = adiado por ambiente"), `teto-adiamento-ambiente` ("3 adiamentos consecutivos por ambiente = bloqueado"), `decisao` ("os 8 rótulos…"), `doutrina-v2` ("as 8 causas…"). **Os 2 scripts de shell seguem verdes sem a peça.** O teste do cooldown (9e109cb) e o das tentativas persistidas não discriminam a peça, porque o comportamento que eles medem já existia no kit (7b-2, 7b-4). |
| e `ab1d848` | 0aa3c83 (623), 77aa9a3 (626) | 43/43 | **9 de 43**: `gates-fonte-unica` ("sem --config o gates.ts falha alto…", "(b) … gates_ausentes=typecheck_scripts…") e `retry-feedback-juiz` ("623 (a): o motivo do juiz chega ao prompt de retry") |
| f `262feea` | 7f64c80 (630), 284a147 (632), 0c093de (631) | vitest 96/96, `test-reprovado-sub.sh` rc 0 | **14 de 96**: `arquivo-solto` ("sequência do 513…"), `base-vermelha`, `fila-json-quebrado`, `migrar-config`. `test-reprovado-sub.sh` **segue verde sem a peça**, porque a mudança do caso C nesta peça é de entrada do teste. |
| j `886b656` | nenhuma (só kit; padrão do 629) | ver §4 | **sem contra-teste válido** (§4) |
| g `bea11e7` | a196762 (514) | `test-orq-pause.sh` rc 0 | **rc 1, 15 FALHA** ("esperava duas linhas PAUSADA", "PAUSAR ausente do --status", ".orq-pause ausente do --status") |
| h/627 `957c178` | 0e2d2ad | vitest inteiro 1304/1304 | **Nenhum teste falha.** Sem o bloco do prompt, o vitest inteiro segue 1304/1304 (`TZ=UTC`, §8). Nenhum teste cita "EVIDÊNCIA É O QUE O TRABALHO FEZ". **O 627 não tem teste.** |
| h/628 `957c178` | d825b2c | 47/47 (`contexto-juiz-fixtures` + `juiz`) | **6 de 47** em `contexto-juiz-fixtures` ("(a)(d) o corpo INTEIRO do helper, com arquivo:linha, entra no prompt, lido da BASE"). Revertidos: `juiz.ts` e os 2 hunks do `run_juiz` no `executor.sh`. |
| h/624 `957c178` | 8d16413 | 11/11 | **`gate-regex-exemplos.test.ts` falha inteiro**, mas por **import**: `TypeError: execRegexPadrao is not a function`. O vermelho é real, porém não chega a exercitar a regra caso a caso. Revertidos: `gate-ticket.ts` e `TICKET.md`. |
| i `f4605b7` | nenhuma (documentação e config do fixture) | `test-lib-config.sh` rc 0 | **`test-lib-config.sh` rc 1** ("esperava 8 causas, achei 7", "sumiu a causa 'falha de ambiente da worktree'"), com só o `fixture/docs/fila/000-config.json` revertido. A lista do `vendorizado.sh` não tem teste próprio: ela é exercida pelo caso (h) do `test-instalar.sh`. |
| **j2** `ea28962` | nenhuma (defeito do kit, exposto pelo hotfix-awk) | `test-ambiente.sh` rc 0 | **rc 1, 5 FALHA**: "bloqueado pelo teto de adiamento por ambiente: 908=bloqueado 909=bloqueado", "esperava 8 AMBIENTE_ADIAMENTO_DESFEITO, há 0" |

O ac10faa/957c178 não foi reescrito, conforme o item 3. As três partes da h foram verificadas em separado, com patches parciais do mesmo commit (`pecas/h627.patch`, `h628.patch`, `h624.patch`).

## 4. Item j: sem contra-teste válido, porque a falha original não é reproduzível sob carga

Os 3 arquivos voltaram a `411b88f^` no próprio worktree e foram restaurados com `git checkout HEAD --`. Nenhum commit novo, porque o conteúdo não mudou.

**Erro de procedimento que invalidou as 2 primeiras rodadas.** O shell da sessão é zsh, e `for f in $F` não separou a lista de arquivos. A reversão não aconteceu, e as duas rodadas "antigo, livre" rodaram **com o j presente**. Refiz com `bash -c`. Os logs daquelas rodadas foram renomeados para `j/novo-livre-*.log`.

As 4 condições testadas com a versão antiga, sem o j:

| # | Condição | test-reabertura-humana | test-reprovado-sub | test-shell inteiro |
|---|---|---|---|---|
| 1 | máquina livre, load1 ~4 | rc 0 (12 s) | rc 0 (24 s) | — |
| 2 | 1 `for(;;){}` por núcleo (10), load1 até 77 | — | — | **rc 0**, 22/22 (336 s) |
| 3 | 2 por núcleo (20), load1 45–57, 3 rodadas | rc 0 ×3 | rc 0 ×3 | — |
| 4 | a mesma de (2), agora com o j restaurado: load1 até 122, timeout do agente de 80 s e 120 s | rc 0 | rc 0 | rc 1, só por `test-painel-lento.sh` (§7) |

Com o j restaurado e carga residual (load1 22–26, fator 3, timeout de 30 s), os dois deram rc 0.

**Conclusão.** A falha intermitente da linha de base (rc 124 com o `claude_timeout_secs` de 2 s) não aparece sob demanda, nem com o dobro de carga. O j tira esse limite, mas não há um vermelho→verde para mostrar. Isso bate com o que a mensagem do próprio commit j já dizia.

## 5. j2: a regra de AMBIENTE não deixava o `adiamentos_ambiente` voltar (`ea28962`)

- **Defeito.** Quando a regra de AMBIENTE dispara, ela desfaz o `.adiamentos` do RUNS_BASE, mas não o `adiamentos_ambiente` que a peça d grava no JSON do ticket. Com dois tickets adiados por `ambiente` na mesma causa, o loop dizia AMBIENTE nos disparos 1 e 2. No 3º, o próprio executor bloqueava os dois pelo teto de 3, antes de a régua rodar.
- **Teste** (`test-ambiente.sh`, caso 5). O executor falso repete o bloco do teto do `executor.sh` (ADIADO motivo=ambiente, soma no JSON, bloqueio no teto). A causa traz `\n` literal. São 4 disparos.
  - **Vermelho** (`j2-vermelho.log`): `adiamentos_ambiente` 1 → 2 → **908 e 909 bloqueados no 3º disparo**; 5 FALHA.
  - **Verde:** 4 AMBIENTE, contador em 0 e ticket pendente **depois de cada disparo**, 8 eventos `AMBIENTE_ADIAMENTO_DESFEITO adiamentos_ambiente=1->0`, tudo commitado.
- **Conserto** (`local-loop.sh`).
  - A drenagem guarda o `adiamentos_ambiente` de cada ticket antes de chamar o executor.
  - No AMBIENTE, `adiamentos_ambiente_desfazer` devolve o valor de antes a cada ticket ainda pendente cujo valor mudou.
  - Cada devolução faz `ticket_commit` e grava um evento `AMBIENTE_ADIAMENTO_DESFEITO` na trilha.
  - O evento entrou no vocabulário fechado do CONTRATO §4.1.
- **Continua valendo:** um ticket sozinho com `ambiente` segue indo ao teto, porque sem um segundo ticket na mesma causa não há AMBIENTE.
- **Falta:** não há entrada no CHANGELOG para o j2 (a seção do porte ficou intocada, conforme instrução).

## 6. Gate de ticket: simulação done-como-pendente (default `aviso` não foi mudado)

Script: `gate-done2.ts` e `gate-done3.ts` (scratchpad). Eles importam o `gate-ticket.ts` do HEAD e rodam em memória. `git status docs/fila` antes e depois: 0 mudanças nos dois repos.

| Repo | done | Marcados, sem o check 10 (624) | Marcados, com o check 10 (HEAD) | Marcados pela regra do vitest textual |
|---|---|---|---|---|
| conteudos-infinitos | 84 | **84/84** | 84/84 | 73 tickets |
| actus-saas | 143 | **72/143** | **114/143** | 48 tickets |

Os números da coordenação (84 de 84 e 72 de 143) são os de antes da peça h. O check 10 (`exemplos_regex`) sozinho marca 77 tickets done no CI e 63 no Actus: nenhum ticket antigo declara exemplos. É mais um motivo para manter o `aviso`.

**Três exemplos reais de ticket done marcado pela regra do vitest com saída textual, e por que passaram:**

1. **actus-saas 110** (`110-token-expira-em.md`), critério "Suite verde": `node_modules/.bin/vitest run 2>&1 | tail -5`, espera `passed`.
   - A regra marca com razão: `passed` casa também com `Tests 1 failed | 5 passed`, então esse critério aprovaria uma suíte vermelha.
   - Passou porque a suíte estava verde de fato. `runs/110/attempt-1/criterios.txt` mostra a saída `Test Files 98 passed (98) / Tests 1061 passed (1061)`, e o gate de testes da mesma tentativa rodou à parte.
   - O critério não provou nada que o gate já não provasse. Ele só não mentiu porque nada falhou.
2. **actus-saas 265** (`265-teste-guarda-location-reivindicada.md`): `vitest run --reporter verbose 2>&1 | grep -qiE "reivindic|outro tenant|ja pertence|recusa" && echo GUARDA_OK`.
   - O critério lê **o nome do teste** na saída verbose, e o nome aparece com o teste passando ou falhando. Ele mede "o caso existe", não "o caso passa".
   - Passou (`GUARDA_OK`) porque os nomes estavam lá. O verde de verdade veio de outro critério do mesmo ticket, que usa o rc (`vitest run >/dev/null 2>&1 && echo TESTS_OK`), e do gate (1242/1242).
3. **conteudos-infinitos 216** (`216-intencao-keywords-nao-zera.md`): `npx vitest run test/intencao-keywords.test.ts 2>&1 | grep -cE 'Tests +[0-9]+ passed'`, espera `1`; e a guarda `npm test 2>&1 | grep -cE 'Tests +[0-9]+ passed'`, espera `1`.
   - Passou com saída `1`, e o gate da tentativa registra `testes_por_pacote … 1240p/0f`.
   - Aqui a regra é **conservadora demais**: com falha, o vitest imprime `Tests  1 failed | 5 passed`, e `Tests +[0-9]+ passed` exige o número colado em `passed` logo depois de `Tests`. Esse padrão só casa com zero falhas.
   - O critério é equivalente ao rc na prática, mas a regra o marca porque só olha "vitest seguido de pipe". É o padrão dominante no CI: 107 ocorrências com `grep -cE 'Tests +[0-9]+ passed'` e 29 sem o `-c`.

Não conferi se algum dos casos marcados é o falso positivo do `vitest.config.ts` (§7).

## 7. Fora de escopo (só listado, nada mexido)
- **315dacf** (Actus): corrige 471→481 num comentário. O kit ainda diz "(471)" em `scripts/orquestrador/test-drenagem.sh:170`.
- **`liberar-cli.ts:126`**: `await import('node:fs')` no topo, que quebra no tsx/CJS. Continua igual.
- **`executor.sh:28`**: `DRY=0; STUB=""; …` zera o `STUB` quando o arquivo é carregado com `source`. Continua igual, e não existe `ORQ_PROIBE_CLAUDE_REAL`.
- **Falso positivo do `vitest.config.ts`**: em `gate-ticket.ts:325`, `(?<![\w-])vitest(?![\w-])` casa `vitest.config.ts`, porque o `.` não está em `[\w-]`. Continua igual.
- **Achado: `test-painel-lento.sh` falha sob carga.** Foi na condição 4 da §4 (1 burner por núcleo, load1 entre 74 e 122 durante a rodada, 18:28–18:34). Saída crua:
  ```
  --- test-painel-lento.sh ---
    servidor em http://127.0.0.1:64466
  == 1. duas chamadas seguidas respondem abaixo de 1 s ==
    FALHA 1ª chamada levou 1.394359s
    ok    2ª chamada em 0.001077s
  (demais checks ok)
  1 CHECK(S) FALHARAM
  rc(test-painel-lento.sh) = 1
  ```
  É a mesma falha da 1ª rodada do commit f (load 7,6). O limite de 1 s é absoluto e não escala com a carga. Não mexi.
- **Achado: vitest vermelho entre 21:00 e 24:00 local.** 19 testes em `orquestrador-custo` (15), `orquestrador-trilha` (3) e `orquestrador-notificacao` (1) comparam a data UTC com a local (`expected [ '2026-09-24' ] to deeply equal [ '2026-09-25' ]`). Falham igual **sem** o j2 (conferido). Com `TZ=UTC` dá 1304/1304. Existia antes deste porte.
- **Achado:** `test-gate-prevoo.sh`, rodado solto no worktree, dá rc 1 ("não consegui montar o fixture"). Ele lê `docs/fila/000-config.json` do checkout principal, que não existe. O modo suportado é pelo `test-shell.sh`, dentro do fixture, onde dá rc 0.
- **Ambiente:** ficaram 34 diretórios `/tmp/orq-fixture-*` de rodadas anteriores. Não sei quais são de qual sessão, então não apaguei. Durante o fechamento havia um `claude -p` do loop do Comarka OS rodando (outro repo, não iniciado por mim), com load1 entre 6 e 15.

## 8. Suítes do fechamento
Rodadas uma de cada vez, sem carga artificial, no HEAD `ea28962`, de 22:15 a 22:21. Load1 entre 6 e 15, por causa do loop do Comarka citado acima. O rc foi capturado de cada comando, sem `| tail`.

| Suíte | rc | Resultado |
|---|---|---|
| `npx tsc --noEmit` | **0** | 0 linhas |
| `npx vitest run` | **1** | 19 falhas de 1304, as falhas de fuso da §7 (22:16 local = 01:16 UTC). Com `TZ=UTC`, no mesmo HEAD, 20 min antes: 1304/1304, rc 0 |
| `scripts/kit/test-shell.sh` | **0** | 22/22 |
| `scripts/kit/test-instalar.sh` | **0** | 0 FALHA; o caso (c) foi pulado (sem `ORQ_CI_CHECKOUT`) |
| `scripts/orquestrador/test-drenagem.sh` | **0** | |
| `scripts/orquestrador/test-ambiente.sh` | **0** | inclui o caso 4 (hotfix) e o 5 (j2) |

## 9. Dry-runs
| Comando | rc | Diferenças | Nota |
|---|---|---|---|
| `bash instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run` | 0 | 42 | "O --atualizar de verdade RECUSARIA: … não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause" |
| `bash instalar.sh --atualizar ~/Projetos/actus-saas --dry-run` | 0 | 43 | a mesma recusa por falta de pausa |

Não criei sentinela. O `git status --porcelain` dos dois repos ficou igual antes e depois (0 linhas). Saídas completas em `fechamento/dryrun-*.log`.

## 10. Estado final
```
$ git log --oneline main..HEAD
ea28962 porte-actus j2: AMBIENTE absolvido não deixa o adiamentos_ambiente avançar
f4605b7 porte-actus i: CONTRATO §11, CHANGELOG, dicionário do ticket e TESTES_HARNESS do porte
957c178 porte-actus h: evidência fabricada (627), definições para o juiz (628), exemplos_regex (624)
bea11e7 porte-actus g: orq-pause trata as duas sentinelas; STATUS nomeia a ativa (514)
886b656 porte-actus j: timeout do agente falso proporcional à carga em dois testes de shell
262feea porte-actus f: JSON quebrado falha alto (630), base vermelha (632), arquivo solto (631)
ab1d848 porte-actus e: motivo do juiz no retry, retry sem mudança (623) e gates de fonte única (626)
8557f7a porte-actus d: causa 'ambiente', teto por ambiente e cooldown — na estrutura do kit
1259eca porte-actus c: contexto_juiz — referência fora do diff chega ao juiz (622)
89e0afc porte-actus b: gate de ticket vira pré-voo do drive_ticket, com modo aviso|bloqueia
017e3cc porte-actus a: regras do gate de ticket vindas do Actus

$ git status
On branch porte-actus
Untracked files:
	node_modules
```
Sem push.

---

# Revisão 2 (25/09/2026, sessão a7258ae0)

Worktree `~/Projetos/_worktrees/kit-porte-actus`, branch `porte-actus`. A sessão partiu do HEAD `ea28962`, com a árvore limpa (só `?? node_modules`, symlink intacto). O HEAD final é **`9365f5e`**: 14 commits sobre main `b3f6890`. Sem push, merge, rebase, worktree nova, `claude -p`, nem escrita no actus-saas, conteudos-infinitos ou comarka-operacional. A leitura dos dois repos foi em memória (`git status --porcelain docs/fila` = 0 linhas nos dois). `docs/PECAS.md` não registra o porte e não foi tocado. Os logs estão no scratchpad desta sessão (`k/`, `l/`, `fechamento/`), que é volátil: o scratchpad da sessão fb415487 citado acima **já não existe**. Por isso as saídas cruas estão coladas aqui.

## R2.1 Peças
| Peça | Commit | Arquivos | Vermelho (sem a peça) | Verde |
|---|---|---|---|---|
| k (627) | `6366b55` | `test/orquestrador-prompt-evidencia.test.ts` | **6 de 6 falham por asserção** ("bloco … ausente do prompt") | 6/6 |
| l (624) | `dce7f9e` | `test/orquestrador-gate-regex-casos.test.ts`, `test/fixtures/gate-regex-casos-reais/criterios.json` | **13 de 18 falham por asserção** (`expected [] to deeply equal [...]`, CLI `expected +0 to be 1`); os 5 aceitos passam, como devem | 18/18 |
| m | `9365f5e` | `CHANGELOG.md` (só a seção do porte) | — | — |

**Método do vermelho.** Copiei o HEAD da peça com `git archive` para o scratchpad, com `node_modules` apontando para o mesmo destino. Pus o teste novo na cópia e reverti **só o código** da peça:
- **k:** removi o hunk do 627 do `executor.sh` (6 linhas, `executor.sh:399-404`). O patch aplicado é o inverso exato do hunk do 957c178.
- **l:** `gate-ticket.ts` voltou ao conteúdo de `957c178^`. O arquivo não mudou depois do h (`git log 957c178..HEAD -- gate-ticket.ts` vazio). O teste l importa só `lerFila` e `validar`, que já existiam antes do 624, e por isso o vermelho é de asserção, não de import.

**Casos reais do l.** O trecho foi copiado byte a byte e conferido contra o original por script:

| Chave | Origem | O que o check marca |
|---|---|---|
| `ci_012` | conteudos-infinitos `95c115a` `012-loop-nao-suja-arvore.md` [0] | grep -cE sem exemplos (regra 1) |
| `ci_015` | conteudos-infinitos `f039a03` `015-historico-paginacao-backend.md` [2] | awk com dois literais, sem exemplos |
| `ci_002` | conteudos-infinitos `b731b10` `002-sql-remocao-usuarios-e2e.md` [3] | grep -ciE: um exemplo sem `flags` falha, com `-iE` passa |
| `actus_631` | actus-saas `2da6723` `631-arquivo-solto-reprova-por-merito.md` [8] | o 1º `grep -E '^[+-][^+-]'` ficou sem exemplo (o 2º tem) |

Os tickets do CI não têm `tipo` (formato antigo). O `tipo` foi acrescentado na fixture, e o check 10 não olha esse campo.

## R2.2 Simulação do check 10, refeita
O script do fb415487 sumiu com o scratchpad dele. Refiz a simulação com `l/sim10.ts`, que importa o `gate-ticket.ts` do HEAD e roda `checarExemplosRegex` em todo critério de ticket `done`, só em memória.
- **conteudos-infinitos:** 77 de 84 marcados, o mesmo número do relatório.
- **actus-saas:** **76 de 143** marcados. O relatório diz 63, e **não reconciliei** a diferença. O script de lá não existe mais, e o `docs/fila` do Actus não mudou desde 24/09 22h.
- **Tipos de violação:**
  - "sem exemplos": CI 295 critérios, Actus 106 (grep) + 6 (awk);
  - "padrão sem exemplo correspondente": Actus 26 critérios.

## R2.3 Achado: defeito do check 10 (não mexido, reportado)
O caso é o actus-saas `510b-resgate-escopo-528.md` [5]. Um padrão ERE entre **aspas duplas com `\"` escapado** não tem `regex` de exemplo que passe no check 10:
- O `padroesDoCmd` compara o padrão **depois** do parse do shell (`'perdida'|"perdida"|…`).
- A regra 2 exige o `regex` **literal no cmd cru** (`'perdida'|\"perdida\"|…`).
- Com o `regex` pós-shell, a mensagem é "regex de exemplo … não aparece literal no cmd". Com o `regex` cru, é "padrão … do cmd (grep) sem exemplo correspondente em exemplos_regex".

Isso foi provado em memória com o `gate-ticket.ts` do HEAD. Com `modo_pre_voo` em `aviso` (o padrão do template), só gera aviso. Em `bloqueia`, barra um critério correto, e o contorno é reescrever o cmd sem `\"`. O código fica em `gate-ticket.ts:659`: a regra 2 usa `cmd.includes(e.regex)`, e o `padroesDoCmd` fica em `:516`. Nenhum teste fixa esse comportamento.

## R2.4 Fuso (só leitura)
1. **Arquivos:**
   - **Testes** (19 falhas: 15 + 3 + 1): `test/orquestrador-custo.test.ts:18` e `:263-264` (`HOJE`/amanhã por `toISOString()`, UTC), `test/orquestrador-trilha.test.ts:217` (`HOJE` UTC), `test/orquestrador-notificacao.test.ts:275` (chave do dia em UTC).
   - **Código** (dia **local**): `scripts/orquestrador/lib.sh:1283-1284` (`hoje()` e `proximo_dia()` com `date '+%Y-%m-%d'`), usados por `custo_registrar` (`:1299`), `orcamento_veredito` (`:1348`, `:1369`), `mark_adiado_orcamento` (`:1388`) e `proximo_pendente` (`:676`, `adiado_ate`). Também `scripts/orq:215` (`orq custo`: `dia` local), que filtra a trilha, cujo timestamp é UTC (`lib.sh:1095`, `date -u`).
   - Entre 21:00 e 24:00 de -03, o dia local e o UTC divergem.
2. **No diff da branch:** nenhum dos 3 testes e nem `scripts/orq` aparecem em `git diff --stat main..HEAD`. O `lib.sh` aparece, mas **nenhuma** linha adicionada ou removida toca `hoje`, `proximo_dia`, `date`, `custo_registrar`, `orcamento_veredito`, `mark_adiado_orcamento` ou `adiado_ate`. `hoje()`/`proximo_dia()` vêm de `e6b3360` (08/09) no main.
3. **Prova direta:** com `TZ=Pacific/Kiritimati` (+14, dia local ≠ UTC às 10:31 de -03), uma cópia do **main** falha nos mesmos **19** (trilha 3, custo 15, notificação 1). No HEAD, o vitest inteiro no mesmo fuso falha exatamente nos 19. **Registro: defeito anterior ao porte.**

## R2.5 Suítes do fechamento (HEAD `9365f5e`, 10:32–10:37 de -03, load1 ~4–6)
Uma de cada vez, rc capturado de cada comando para arquivo, sem `| tail`.

| Suíte | rc | Resultado |
|---|---|---|
| `npx tsc --noEmit` | **0** | 0 linhas |
| `TZ=UTC npx vitest run` | **0** | 62 arquivos, 1328/1328 (eram 1304; +6 do k, +18 do l) |
| `npx vitest run` (sem TZ, 10:33 de -03, mesmo dia em UTC) | **0** | 1328/1328. Fora da janela 21–24h; na janela, falham os 19 da R2.4 |
| `bash scripts/kit/test-shell.sh` | **0** | 22/22 scripts rc 0, "TODOS OS SCRIPTS SAÍRAM rc 0" (inclui `test-painel-lento.sh` rc 0) |
| `bash scripts/orquestrador/test-ambiente.sh` | **0** | "TODOS OS CHECKS PASSARAM", 0 FALHA (caso 5 do j2: 8 AMBIENTE_ADIAMENTO_DESFEITO) |

## R2.6 Pendências que ficaram fora do escopo de escrita
- Os testes novos de k e l **não estão** no `TESTES_HARNESS` de `scripts/kit/vendorizado.sh`, que fica fora do escopo de escrita. Com isso, um repo instalado não os recebe, e o registro está no CHANGELOG.
- O defeito da R2.3.
- O fuso (R2.4) segue como estava.

## R2.7 Estado final
```
$ git log --oneline main..HEAD
9365f5e porte-actus m: CHANGELOG do porte com os SHAs de depois do rebase; entradas j2, k, l
dce7f9e porte-actus l: check 10 (exemplos_regex, 624) caso a caso, com casos reais
6366b55 porte-actus k: teste do 627 (evidência fabricada) no prompt real do run_attempt
ea28962 porte-actus j2: AMBIENTE absolvido não deixa o adiamentos_ambiente avançar
f4605b7 porte-actus i: CONTRATO §11, CHANGELOG, dicionário do ticket e TESTES_HARNESS do porte
957c178 porte-actus h: evidência fabricada (627), definições para o juiz (628), exemplos_regex (624)
bea11e7 porte-actus g: orq-pause trata as duas sentinelas; STATUS nomeia a ativa (514)
886b656 porte-actus j: timeout do agente falso proporcional à carga em dois testes de shell
262feea porte-actus f: JSON quebrado falha alto (630), base vermelha (632), arquivo solto (631)
ab1d848 porte-actus e: motivo do juiz no retry, retry sem mudança (623) e gates de fonte única (626)
8557f7a porte-actus d: causa 'ambiente', teto por ambiente e cooldown — na estrutura do kit
1259eca porte-actus c: contexto_juiz — referência fora do diff chega ao juiz (622)
89e0afc porte-actus b: gate de ticket vira pré-voo do drive_ticket, com modo aviso|bloqueia
017e3cc porte-actus a: regras do gate de ticket vindas do Actus

$ git status
On branch porte-actus
Untracked files:
  (use "git add <file>..." to include in what will be committed)
	node_modules

nothing added to commit but untracked files present (use "git add" to track)
```

## R2.8 Saídas cruas

### k · vermelho (sem o hunk do 627)
```

 RUN  v2.1.9 /private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-porte-actus/a7258ae0-86c4-44e4-b864-66d39498baa3/scratchpad/k/arv

 ❯ test/orquestrador-prompt-evidencia.test.ts (6 tests | 6 failed) 1050ms
   × 627 · o prompt da primeira tentativa carrega a regra contra evidência fabricada > o bloco existe, depois de COMO RODAR COMANDOS e antes de ENTREGA 2ms
     → bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER" ausente do prompt: expected -1 to be greater than -1
   × 627 · o prompt da primeira tentativa carrega a regra contra evidência fabricada > regra 1: nada escrito só para o critério passar, nem admitindo que é artificial 0ms
     → bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER" ausente do prompt: expected undefined to be defined
   × 627 · o prompt da primeira tentativa carrega a regra contra evidência fabricada > regra 2: critério suspeito se relata com o marcador CRITÉRIO SUSPEITO, não se contorna 0ms
     → bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER" ausente do prompt: expected undefined to be defined
   × 627 · o prompt da primeira tentativa carrega a regra contra evidência fabricada > regra 3: vermelho honesto é aceitável; verde fabricado é reprovação 0ms
     → bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER" ausente do prompt: expected undefined to be defined
   × 627 · o prompt da primeira tentativa carrega a regra contra evidência fabricada > regra 4: temporário só em /tmp, nada fora da allowlist na worktree 0ms
     → bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER" ausente do prompt: expected undefined to be defined
   × 627 · o retry também carrega o bloco > com REPROVAÇÃO ANTERIOR, o bloco segue lá, antes do motivo 1047ms
     → bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER" ausente do prompt de retry: expected -1 to be greater than -1

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-prompt-evidencia.test.ts > 627 · o prompt da primeira tentativa carrega a regra contra evidência fabricada > o bloco existe, depois de COMO RODAR COMANDOS e antes de ENTREGA
AssertionError: bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER" ausente do prompt: expected -1 to be greater than -1
 ❯ test/orquestrador-prompt-evidencia.test.ts:86:58
     84|     const iEvid = prompt.indexOf(TITULO);
     85|     const iEntrega = prompt.indexOf('ENTREGA:');
     86|     expect(iEvid, `bloco "${TITULO}" ausente do prompt`).toBeGreaterTh…
       |                                                          ^
     87|     expect(iComo).toBeGreaterThan(-1);
     88|     expect(iEvid).toBeGreaterThan(iComo);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

 FAIL  test/orquestrador-prompt-evidencia.test.ts > 627 · o prompt da primeira tentativa carrega a regra contra evidência fabricada > regra 1: nada escrito só para o critério passar, nem admitindo que é artificial
AssertionError: bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER" ausente do prompt: expected undefined to be defined
 ❯ bloco test/orquestrador-prompt-evidencia.test.ts:75:57
     73| function bloco(prompt: string): string {
     74|   const depois = prompt.split(TITULO)[1];
     75|   expect(depois, `bloco "${TITULO}" ausente do prompt`).toBeDefined();
       |                                                         ^
     76|   return (depois ?? '').split('\n\n')[0] ?? '';
     77| }
 ❯ test/orquestrador-prompt-evidencia.test.ts:93:15

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯

 FAIL  test/orquestrador-prompt-evidencia.test.ts > 627 · o prompt da primeira tentativa carrega a regra contra evidência fabricada > regra 2: critério suspeito se relata com o marcador CRITÉRIO SUSPEITO, não se contorna
AssertionError: bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER" ausente do prompt: expected undefined to be defined
 ❯ bloco test/orquestrador-prompt-evidencia.test.ts:75:57
     73| function bloco(prompt: string): string {
     74|   const depois = prompt.split(TITULO)[1];
     75|   expect(depois, `bloco "${TITULO}" ausente do prompt`).toBeDefined();
       |                                                         ^
     76|   return (depois ?? '').split('\n\n')[0] ?? '';
     77| }
 ❯ test/orquestrador-prompt-evidencia.test.ts:99:15

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯

 FAIL  test/orquestrador-prompt-evidencia.test.ts > 627 · o prompt da primeira tentativa carrega a regra contra evidência fabricada > regra 3: vermelho honesto é aceitável; verde fabricado é reprovação
AssertionError: bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER" ausente do prompt: expected undefined to be defined
 ❯ bloco test/orquestrador-prompt-evidencia.test.ts:75:57
     73| function bloco(prompt: string): string {
     74|   const depois = prompt.split(TITULO)[1];
     75|   expect(depois, `bloco "${TITULO}" ausente do prompt`).toBeDefined();
       |                                                         ^
     76|   return (depois ?? '').split('\n\n')[0] ?? '';
     77| }
 ❯ test/orquestrador-prompt-evidencia.test.ts:105:15

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/6]⎯

 FAIL  test/orquestrador-prompt-evidencia.test.ts > 627 · o prompt da primeira tentativa carrega a regra contra evidência fabricada > regra 4: temporário só em /tmp, nada fora da allowlist na worktree
AssertionError: bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER" ausente do prompt: expected undefined to be defined
 ❯ bloco test/orquestrador-prompt-evidencia.test.ts:75:57
     73| function bloco(prompt: string): string {
     74|   const depois = prompt.split(TITULO)[1];
     75|   expect(depois, `bloco "${TITULO}" ausente do prompt`).toBeDefined();
       |                                                         ^
     76|   return (depois ?? '').split('\n\n')[0] ?? '';
     77| }
 ❯ test/orquestrador-prompt-evidencia.test.ts:111:12

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/6]⎯

 FAIL  test/orquestrador-prompt-evidencia.test.ts > 627 · o retry também carrega o bloco > com REPROVAÇÃO ANTERIOR, o bloco segue lá, antes do motivo
AssertionError: bloco "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER" ausente do prompt de retry: expected -1 to be greater than -1
 ❯ test/orquestrador-prompt-evidencia.test.ts:120:67
    118|     const iEvid = prompt.indexOf(TITULO);
    119|     const iMotivo = prompt.indexOf('REPROVAÇÃO ANTERIOR');
    120|     expect(iEvid, `bloco "${TITULO}" ausente do prompt de retry`).toBe…
       |                                                                   ^
    121|     expect(iMotivo).toBeGreaterThan(iEvid);
    122|     expect(prompt).toContain('critério 1 vermelho: 0 citações');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/6]⎯

 Test Files  1 failed (1)
      Tests  6 failed (6)
   Start at  10:26:40
   Duration  2.83s (transform 17ms, setup 0ms, collect 1.64s, tests 1.05s, environment 0ms, prepare 30ms)

rc_vermelho=1
```

### k · verde
```

 RUN  v2.1.9 /private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-porte-actus/a7258ae0-86c4-44e4-b864-66d39498baa3/scratchpad/k/arv

 ✓ test/orquestrador-prompt-evidencia.test.ts (6 tests) 1060ms
   ✓ 627 · o retry também carrega o bloco > com REPROVAÇÃO ANTERIOR, o bloco segue lá, antes do motivo 1059ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  10:26:43
   Duration  2.25s (transform 15ms, setup 0ms, collect 1.07s, tests 1.06s, environment 0ms, prepare 31ms)

rc_verde=0
```

### l · vermelho (gate-ticket.ts em 957c178^)
```

 RUN  v2.1.9 /private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-porte-actus/a7258ae0-86c4-44e4-b864-66d39498baa3/scratchpad/l/arv

 ❯ test/orquestrador-gate-regex-casos.test.ts (18 tests | 13 failed) 118ms
   × 624 · casos reais do conteudos-infinitos > 012[0] (grep -cE no placar do vitest, sem exemplos): RECUSA pela regra 1 4ms
     → expected [] to deeply equal [ Array(1) ]
   × 624 · casos reais do conteudos-infinitos > 015[2] (awk com dois literais /.../, sem exemplos): RECUSA pela regra 1, nomeando awk 1ms
     → expected [] to deeply equal [ Array(1) ]
   × 624 · casos reais do conteudos-infinitos > 015[2] com UM exemplo só: RECUSA o literal que ficou sem exemplo 1ms
     → expected [] to deeply equal [ Array(1) ]
   × 624 · casos reais do conteudos-infinitos > 002[3] (grep -ciE): sem flags o exemplo é provado com -E e o positivo em maiúsculas NÃO casa; com flags -iE ACEITA 1ms
     → expected [] to deeply equal [ Array(1) ]
   × 624 · caso real do actus-saas > 631[8] como está no done: RECUSA o primeiro grep -E, que ficou sem exemplo (o segundo tem) 1ms
     → expected [] to deeply equal [ Array(1) ]
   × 624 · caso real do actus-saas > pelo CLI, o 631[8] do done sai com rc 1 e a mensagem 102ms
     → expected +0 to be 1 // Object.is equality
   × 624 · regras, uma por caso > recusa (regra 1): lista de exemplos vazia conta como ausente 1ms
     → expected [] to deeply equal [ Array(1) ]
   × 624 · regras, uma por caso > recusa (regra 2): regex de exemplo que não aparece literal no cmd 1ms
     → expected [] to deeply equal [ Array(1) ]
   × 624 · regras, uma por caso > recusa (regra 3): positivo que não casa 1ms
     → expected [] to deeply equal [ Array(1) ]
   × 624 · regras, uma por caso > recusa (regra 4): negativo que casa 1ms
     → expected [] to deeply equal [ Array(1) ]
   × 624 · regras, uma por caso > recusa (regra 5): \[ \] dentro de classe, no cmd e no exemplo; e o grep BSD confirma o estrago 1ms
     → expected [] to deeply equal [ …(4) ]
   × 624 · regras, uma por caso > recusa: exemplo malformado, e o padrão fica sem exemplo 1ms
     → expected [] to deeply equal [ …(2) ]
   × 624 · regras, uma por caso > recusa: regex que o /usr/bin/grep rejeita (rc 2) vira violação do ticket 1ms
     → expected [] to have a length of 1 but got +0

⎯⎯⎯⎯⎯⎯ Failed Tests 13 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · casos reais do conteudos-infinitos > 012[0] (grep -cE no placar do vitest, sem exemplos): RECUSA pela regra 1
AssertionError: expected [] to deeply equal [ Array(1) ]

- Expected
+ Received

- Array [
-   "critério passa regex a grep e não declara exemplos_regex (lista de {regex, positivo, negativo})",
- ]
+ Array []

 ❯ test/orquestrador-gate-regex-casos.test.ts:73:42
     71| describe('624 · casos reais do conteudos-infinitos', () => {
     72|   it('012[0] (grep -cE no placar do vitest, sem exemplos): RECUSA pela…
     73|     expect(check10(real('ci_012')).msgs).toEqual([SEM_EXEMPLO_GREP]);
       |                                          ^
     74|   });
     75| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/13]⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · casos reais do conteudos-infinitos > 015[2] (awk com dois literais /.../, sem exemplos): RECUSA pela regra 1, nomeando awk
AssertionError: expected [] to deeply equal [ Array(1) ]

- Expected
+ Received

- Array [
-   "critério passa regex a awk e não declara exemplos_regex (lista de {regex, positivo, negativo})",
- ]
+ Array []

 ❯ test/orquestrador-gate-regex-casos.test.ts:84:42
     82| 
     83|   it('015[2] (awk com dois literais /.../, sem exemplos): RECUSA pela …
     84|     expect(check10(real('ci_015')).msgs).toEqual([SEM_EXEMPLO_AWK]);
       |                                          ^
     85|   });
     86| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/13]⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · casos reais do conteudos-infinitos > 015[2] com UM exemplo só: RECUSA o literal que ficou sem exemplo
AssertionError: expected [] to deeply equal [ Array(1) ]

- Expected
+ Received

- Array [
-   "padrão '^  }' do cmd (awk) sem exemplo correspondente em exemplos_regex",
- ]
+ Array []

 ❯ test/orquestrador-gate-regex-casos.test.ts:91:72
     89|       { regex: 'listarRecentesPaginado', positivo: '  async listarRece…
     90|     ];
     91|     expect(check10(real('ci_015', { exemplos_regex: exemplos })).msgs)…
       |                                                                        ^
     92|       "padrão '^  }' do cmd (awk) sem exemplo correspondente em exempl…
     93|     ]);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/13]⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · casos reais do conteudos-infinitos > 002[3] (grep -ciE): sem flags o exemplo é provado com -E e o positivo em maiúsculas NÃO casa; com flags -iE ACEITA
AssertionError: expected [] to deeply equal [ Array(1) ]

- Expected
+ Received

- Array [
-   "positivo 'where email LIKE 'e2e%'' NÃO casa 'like\\s*'e2e|like\\s*'%e2e' (grep -E)",
- ]
+ Array []

 ❯ test/orquestrador-gate-regex-casos.test.ts:107:68
    105|     const re = "like\\s*'e2e|like\\s*'%e2e";
    106|     const ex = { regex: re, positivo: "where email LIKE 'e2e%'", negat…
    107|     expect(check10(real('ci_002', { exemplos_regex: [ex] })).msgs).toE…
       |                                                                    ^
    108|       `positivo 'where email LIKE 'e2e%'' NÃO casa '${re}' (grep -E)`,
    109|     ]);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/13]⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · caso real do actus-saas > 631[8] como está no done: RECUSA o primeiro grep -E, que ficou sem exemplo (o segundo tem)
AssertionError: expected [] to deeply equal [ Array(1) ]

- Expected
+ Received

- Array [
-   "padrão '^[+-][^+-]' do cmd (grep) sem exemplo correspondente em exemplos_regex",
- ]
+ Array []

 ❯ test/orquestrador-gate-regex-casos.test.ts:116:45
    114| describe('624 · caso real do actus-saas', () => {
    115|   it('631[8] como está no done: RECUSA o primeiro grep -E, que ficou s…
    116|     expect(check10(real('actus_631')).msgs).toEqual([
       |                                             ^
    117|       "padrão '^[+-][^+-]' do cmd (grep) sem exemplo correspondente em…
    118|     ]);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/13]⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · caso real do actus-saas > pelo CLI, o 631[8] do done sai com rc 1 e a mensagem
AssertionError: expected +0 to be 1 // Object.is equality

- Expected
+ Received

- 1
+ 0

 ❯ test/orquestrador-gate-regex-casos.test.ts:132:48
    130|     const { fx, id } = check10(real('actus_631'));
    131|     const r = spawnSync(TSX, [GATE_TS, '--fila', join(fx, 'docs', 'fil…
    132|     expect(r.status, `${r.stdout}${r.stderr}`).toBe(1);
       |                                                ^
    133|     expect(`${r.stdout}${r.stderr}`).toContain("padrão '^[+-][^+-]' do…
    134|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/13]⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · regras, uma por caso > recusa (regra 1): lista de exemplos vazia conta como ausente
AssertionError: expected [] to deeply equal [ Array(1) ]

- Expected
+ Received

- Array [
-   "critério passa regex a grep e não declara exemplos_regex (lista de {regex, positivo, negativo})",
- ]
+ Array []

 ❯ test/orquestrador-gate-regex-casos.test.ts:152:41
    150| 
    151|   it('recusa (regra 1): lista de exemplos vazia conta como ausente', (…
    152|     expect(check10(crit(CMD, [])).msgs).toEqual([SEM_EXEMPLO_GREP]);
       |                                         ^
    153|   });
    154| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/13]⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · regras, uma por caso > recusa (regra 2): regex de exemplo que não aparece literal no cmd
AssertionError: expected [] to deeply equal [ Array(1) ]

- Expected
+ Received

- Array [
-   "regex de exemplo 'fora' não aparece literal no cmd",
- ]
+ Array []

 ❯ test/orquestrador-gate-regex-casos.test.ts:156:95
    154| 
    155|   it('recusa (regra 2): regex de exemplo que não aparece literal no cm…
    156|     expect(check10(crit(CMD, [OK, { regex: 'fora', positivo: 'fora', n…
       |                                                                                               ^
    157|       "regex de exemplo 'fora' não aparece literal no cmd",
    158|     ]);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/13]⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · regras, uma por caso > recusa (regra 3): positivo que não casa
AssertionError: expected [] to deeply equal [ Array(1) ]

- Expected
+ Received

- Array [
-   "positivo 'app/route.ts:68' NÃO casa '(src|scripts)/[A-Za-z0-9_./()-]+:[0-9]+' (grep -E)",
- ]
+ Array []

 ❯ test/orquestrador-gate-regex-casos.test.ts:162:79
    160| 
    161|   it('recusa (regra 3): positivo que não casa', () => {
    162|     expect(check10(crit(CMD, [{ ...OK, positivo: 'app/route.ts:68' }])…
       |                                                                               ^
    163|       `positivo 'app/route.ts:68' NÃO casa '${RE}' (grep -E)`,
    164|     ]);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/13]⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · regras, uma por caso > recusa (regra 4): negativo que casa
AssertionError: expected [] to deeply equal [ Array(1) ]

- Expected
+ Received

- Array [
-   "negativo 'scripts/orq:1' CASA '(src|scripts)/[A-Za-z0-9_./()-]+:[0-9]+' (grep -E)",
- ]
+ Array []

 ❯ test/orquestrador-gate-regex-casos.test.ts:168:77
    166| 
    167|   it('recusa (regra 4): negativo que casa', () => {
    168|     expect(check10(crit(CMD, [{ ...OK, negativo: 'scripts/orq:1' }])).…
       |                                                                             ^
    169|       `negativo 'scripts/orq:1' CASA '${RE}' (grep -E)`,
    170|     ]);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/13]⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · regras, uma por caso > recusa (regra 5): \[ \] dentro de classe, no cmd e no exemplo; e o grep BSD confirma o estrago
AssertionError: expected [] to deeply equal [ …(4) ]

- Expected
+ Received

- Array [
-   "regex '(src|scripts)/[A-Za-z0-9_./\\[\\]()-]+:[0-9]+' tem \\[ ou \\] dentro de classe [...]: no /usr/bin/grep o ] fecha a classe (caso do 503)",
-   "regex de exemplo '(src|scripts)/[A-Za-z0-9_./\\[\\]()-]+:[0-9]+' tem \\[ ou \\] dentro de classe [...]",
-   "positivo 'src/app/route.ts:68' NÃO casa '(src|scripts)/[A-Za-z0-9_./\\[\\]()-]+:[0-9]+' (grep -E)",
-   "negativo 'src/A-]:1' CASA '(src|scripts)/[A-Za-z0-9_./\\[\\]()-]+:[0-9]+' (grep -E)",
- ]
+ Array []

 ❯ test/orquestrador-gate-regex-casos.test.ts:176:64
    174|     const velho = '(src|scripts)/[A-Za-z0-9_./\\[\\]()-]+:[0-9]+';
    175|     const cmd = `{ grep -cE '${velho}' docs/x.md || true; }`;
    176|     expect(check10(crit(cmd, [{ ...OK, regex: velho }])).msgs).toEqual…
       |                                                                ^
    177|       `regex '${velho}' tem \\[ ou \\] dentro de classe [...]: no /usr…
    178|       `regex de exemplo '${velho}' tem \\[ ou \\] dentro de classe [..…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/13]⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · regras, uma por caso > recusa: exemplo malformado, e o padrão fica sem exemplo
AssertionError: expected [] to deeply equal [ …(2) ]

- Expected
+ Received

- Array [
-   "exemplos_regex[0] malformado: precisa de regex, positivo, negativo (strings), flags? string, ferramenta? 'grep'|'awk'",
-   "padrão '(src|scripts)/[A-Za-z0-9_./()-]+:[0-9]+' do cmd (grep) sem exemplo correspondente em exemplos_regex",
- ]
+ Array []

 ❯ test/orquestrador-gate-regex-casos.test.ts:185:78
    183| 
    184|   it('recusa: exemplo malformado, e o padrão fica sem exemplo', () => {
    185|     expect(check10(crit(CMD, [{ regex: RE, positivo: 'src/a.ts:1' }]))…
       |                                                                              ^
    186|       "exemplos_regex[0] malformado: precisa de regex, positivo, negat…
    187|       `padrão '${RE}' do cmd (grep) sem exemplo correspondente em exem…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/13]⎯

 FAIL  test/orquestrador-gate-regex-casos.test.ts > 624 · regras, uma por caso > recusa: regex que o /usr/bin/grep rejeita (rc 2) vira violação do ticket
AssertionError: expected [] to have a length of 1 but got +0

- Expected
+ Received

- 1
+ 0

 ❯ test/orquestrador-gate-regex-casos.test.ts:193:18
    191|   it('recusa: regex que o /usr/bin/grep rejeita (rc 2) vira violação d…
    192|     const msgs = check10(crit("{ grep -cE 'a(' f || true; }", [{ regex…
    193|     expect(msgs).toHaveLength(1);
       |                  ^
    194|     expect(msgs[0]).toMatch(/^regex 'a\(' recusada: \/usr\/bin\/grep r…
    195|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/13]⎯

 Test Files  1 failed (1)
      Tests  13 failed | 5 passed (18)
   Start at  10:30:21
   Duration  281ms (transform 31ms, setup 0ms, collect 36ms, tests 118ms, environment 0ms, prepare 24ms)

rc_vermelho=1
```

### l · verde
```

 RUN  v2.1.9 /private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-porte-actus/a7258ae0-86c4-44e4-b864-66d39498baa3/scratchpad/l/arv

 ✓ test/orquestrador-gate-regex-casos.test.ts (18 tests) 162ms

 Test Files  1 passed (1)
      Tests  18 passed (18)
   Start at  10:30:28
   Duration  326ms (transform 35ms, setup 0ms, collect 40ms, tests 162ms, environment 0ms, prepare 20ms)

rc_verde=0
```

### Patch de reversão usado no vermelho do k
```diff
diff --git a/scripts/orquestrador/executor.sh b/scripts/orquestrador/executor.sh
index 711bebd..07e16bc 100755
--- a/scripts/orquestrador/executor.sh
+++ b/scripts/orquestrador/executor.sh
@@ -396,12 +396,6 @@ Qualquer outra coisa é NEGADA pela permissão — e permissão negada não é
 obstáculo que se contorna tentando de novo: o muro não se move sozinho. Se o que
 você precisa rodar não está na lista, siga sem ele e diga isso no fim.
 
-EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER
-- Nunca escreva conteúdo cuja única função é fazer um critério passar: citação, token, comentário, arquivo, teste ou saída que não descreve o trabalho real. Vale mesmo que o próprio texto admita que é artificial.
-- Critério que parece errado (regex que não casa com nada legítimo, comando que não tem como passar, espera que contradiz o objetivo) NÃO se contorna. Commite o trabalho real e termine com: CRITÉRIO SUSPEITO: <descricao>, o que rodou, o que saiu e por que acha que está errado.
-- Critério vermelho com relato honesto é desfecho aceitável. Critério verde com evidência fabricada é reprovação.
-- Arquivo temporário, rascunho ou saída de diagnóstico vai só para /tmp; nada fora da allowlist fica na worktree.
-
 ENTREGA:
 1. Implemente o objetivo respeitando a allowlist.
 2. Os gates deste repo, nesta ordem: $(cfg '._execucao_dos_gates.ordem_obrigatoria | join(" -> ")').
```

## R2.9 Diff cru das peças

### k `6366b55`
```diff
commit 6366b55102a5bb71ea997989c11cdeafda737ce3
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Fri Sep 25 10:26:54 2026 -0300

    porte-actus k: teste do 627 (evidência fabricada) no prompt real do run_attempt
    
    test/orquestrador-prompt-evidencia.test.ts roda run_attempt de verdade, com
    claude_run interceptado (como o 0e-c), e cobra no prompt.txt o bloco "EVIDÊNCIA
    É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER": posição entre COMO
    RODAR COMANDOS e ENTREGA, as quatro regras (nada escrito só para o critério
    passar; CRITÉRIO SUSPEITO relatado, não contornado; vermelho honesto aceitável,
    verde fabricado reprovado; temporário só em /tmp) e a presença no retry, antes
    da REPROVAÇÃO ANTERIOR.
    
    Vermelho: numa cópia do HEAD com só o hunk do 627 revertido no executor.sh,
    6 de 6 falham por asserção ("bloco ... ausente do prompt"). Verde com ele: 6/6.
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

diff --git a/test/orquestrador-prompt-evidencia.test.ts b/test/orquestrador-prompt-evidencia.test.ts
new file mode 100644
index 0000000..aac6fd5
--- /dev/null
+++ b/test/orquestrador-prompt-evidencia.test.ts
@@ -0,0 +1,124 @@
+/**
+ * Ticket 627 (porte do 0e2d2ad do Actus) — o prompt do executor ganha o bloco
+ * "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER".
+ *
+ * Causa: no 503 do Actus o critério "cita arquivo:linha" tinha um regex que o
+ * grep BSD não casava com nenhuma citação legítima, e o agente fabricou
+ * `src/A-]:1` para o critério passar. O 624 fecha o regex no gate; o 627 fecha
+ * a outra ponta: o agente é instruído a relatar o critério suspeito em vez de
+ * escrever conteúdo cuja única função é passar nele.
+ *
+ * Como o 0e(c) (orquestrador-prompt-como-rodar.test.ts), o caso central roda
+ * `run_attempt` DE VERDADE com `claude_run` interceptado: o prompt conferido é
+ * o `prompt.txt` que a chamada paga receberia, na primeira tentativa e no retry.
+ */
+import { describe, it, expect } from 'vitest';
+import { mkdirSync, writeFileSync } from 'node:fs';
+import { join } from 'node:path';
+import { spawnSync } from 'node:child_process';
+import { criarFixture, escreverTicket, ler, REPO_ROOT } from './fixtures/orq-harness.js';
+
+const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
+
+const TICKET = {
+  id: '901',
+  slug: 'cita',
+  objetivo: 'escreve docs/diagnosticos/x.md citando arquivo:linha',
+  pathspec_allowlist: ['docs/diagnosticos/x.md'],
+  criterios_aceite: [
+    {
+      tipo: 'alvo',
+      descricao: 'cita arquivo:linha',
+      cmd: "{ grep -cE '(src|scripts)/[A-Za-z0-9_./()-]+:[0-9]+' docs/diagnosticos/x.md || true; }",
+      espera: '^[1-9]',
+    },
+    { tipo: 'avaliador', descricao: 'as citações são reais', cmd: 'true', espera: 'avaliador' },
+  ],
+};
+
+const TITULO = 'EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER';
+
+/** Roda run_attempt com claude_run INTERCEPTADO e devolve o prompt.txt gerado. */
+function promptDaTentativa(motivo: string): string {
+  const fx = criarFixture([]);
+  escreverTicket(fx, TICKET);
+  const wt = join(fx, 'wt');
+  mkdirSync(join(wt, 'docs', 'diagnosticos'), { recursive: true });
+  writeFileSync(join(wt, 'docs', 'diagnosticos', 'base.md'), 'base\n');
+  const g = (...a: string[]) =>
+    spawnSync('git', ['-C', wt, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
+  spawnSync('git', ['-C', wt, 'init', '-q', '-b', 'main'], { encoding: 'utf8' });
+  g('add', '-A');
+  g('commit', '-qm', 'base');
+  const rundir = join(fx, 'docs', 'fila', 'runs', '901', 'attempt-0');
+  const script = [
+    `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
+    `source "${EXECUTOR}"`,
+    'set +e',
+    `claude_run() { local d="$1" o="$2"; printf '{}\\n' > "$o"; return 0; }`,
+    `enforcement_stub() { :; }`,
+    `run_attempt "$(ticket_file_by_id 901)" "${wt}" "${rundir}" sonnet "$T627_MOTIVO" 0`,
+  ].join('\n');
+  const r = spawnSync('bash', ['-c', script], {
+    encoding: 'utf8',
+    cwd: fx,
+    env: { ...process.env, T627_MOTIVO: motivo },
+  });
+  const prompt = ler(join(rundir, 'prompt.txt'));
+  expect(prompt, `run_attempt não gerou prompt: ${r.stderr}`).not.toBe('');
+  return prompt;
+}
+
+/** O texto do bloco: do título até a linha em branco que o fecha. */
+function bloco(prompt: string): string {
+  const depois = prompt.split(TITULO)[1];
+  expect(depois, `bloco "${TITULO}" ausente do prompt`).toBeDefined();
+  return (depois ?? '').split('\n\n')[0] ?? '';
+}
+
+describe('627 · o prompt da primeira tentativa carrega a regra contra evidência fabricada', () => {
+  const prompt = promptDaTentativa('');
+
+  it('o bloco existe, depois de COMO RODAR COMANDOS e antes de ENTREGA', () => {
+    const iComo = prompt.indexOf('COMO RODAR COMANDOS');
+    const iEvid = prompt.indexOf(TITULO);
+    const iEntrega = prompt.indexOf('ENTREGA:');
+    expect(iEvid, `bloco "${TITULO}" ausente do prompt`).toBeGreaterThan(-1);
+    expect(iComo).toBeGreaterThan(-1);
+    expect(iEvid).toBeGreaterThan(iComo);
+    expect(iEntrega).toBeGreaterThan(iEvid);
+  });
+
+  it('regra 1: nada escrito só para o critério passar, nem admitindo que é artificial', () => {
+    const b = bloco(prompt);
+    expect(b).toContain('Nunca escreva conteúdo cuja única função é fazer um critério passar');
+    expect(b).toContain('Vale mesmo que o próprio texto admita que é artificial.');
+  });
+
+  it('regra 2: critério suspeito se relata com o marcador CRITÉRIO SUSPEITO, não se contorna', () => {
+    const b = bloco(prompt);
+    expect(b).toMatch(/Critério que parece errado \(regex que não casa com nada legítimo.*\) NÃO se contorna\./);
+    expect(b).toContain('CRITÉRIO SUSPEITO: <descricao>');
+  });
+
+  it('regra 3: vermelho honesto é aceitável; verde fabricado é reprovação', () => {
+    const b = bloco(prompt);
+    expect(b).toContain('Critério vermelho com relato honesto é desfecho aceitável.');
+    expect(b).toContain('Critério verde com evidência fabricada é reprovação.');
+  });
+
+  it('regra 4: temporário só em /tmp, nada fora da allowlist na worktree', () => {
+    expect(bloco(prompt)).toContain('vai só para /tmp; nada fora da allowlist fica na worktree');
+  });
+});
+
+describe('627 · o retry também carrega o bloco', () => {
+  it('com REPROVAÇÃO ANTERIOR, o bloco segue lá, antes do motivo', () => {
+    const prompt = promptDaTentativa('critério 1 vermelho: 0 citações');
+    const iEvid = prompt.indexOf(TITULO);
+    const iMotivo = prompt.indexOf('REPROVAÇÃO ANTERIOR');
+    expect(iEvid, `bloco "${TITULO}" ausente do prompt de retry`).toBeGreaterThan(-1);
+    expect(iMotivo).toBeGreaterThan(iEvid);
+    expect(prompt).toContain('critério 1 vermelho: 0 citações');
+  });
+});
```

### l `dce7f9e`
```diff
commit dce7f9eb5f5603219befd921469a9bc558b1f185
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Fri Sep 25 10:30:38 2026 -0300

    porte-actus l: check 10 (exemplos_regex, 624) caso a caso, com casos reais
    
    test/orquestrador-gate-regex-casos.test.ts monta um ticket pendente por caso,
    roda validar() como o pré-voo e compara a lista EXATA de mensagens do campo
    criterios_aceite[0].exemplos_regex. Importa só lerFila/validar, que existiam
    antes do 624: sem o check 10 o arquivo carrega e os recusados falham por
    asserção, não por import.
    
    - Reais (test/fixtures/gate-regex-casos-reais/criterios.json, trecho copiado
      byte a byte dos tickets done): conteudos-infinitos 012[0] (grep -cE sem
      exemplos), 015[2] (awk com dois literais, sem exemplos; com um só), 002[3]
      (grep -ciE: exemplo sem flags recusa, com -iE aceita); actus-saas 631[8]
      (o primeiro grep -E ficou sem exemplo), também pelo CLI com rc 1. Cada um
      com a versão corrigida que é aceita.
    - Regras: grep -F e grep sem -E aceitos; lista vazia (1), regex fora do cmd
      (2), positivo que não casa (3), negativo que casa (4), \[ \] em classe (5,
      as 4 mensagens do 503), exemplo malformado, regex que o grep recusa (rc 2).
    
    Vermelho: numa cópia do HEAD com gate-ticket.ts em 957c178^ (o arquivo não
    mudou depois do h), 13 de 18 falham por asserção; os 5 aceitos passam, como
    devem. Verde com o 624: 18/18.
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

diff --git a/test/fixtures/gate-regex-casos-reais/criterios.json b/test/fixtures/gate-regex-casos-reais/criterios.json
new file mode 100644
index 0000000..e77e1f4
--- /dev/null
+++ b/test/fixtures/gate-regex-casos-reais/criterios.json
@@ -0,0 +1,38 @@
+{
+  "_origem": "Critérios copiados byte a byte (cmd, descricao, espera, exemplos_regex) de tickets done, só o necessário para o check 10 do gate de ticket (624). Leitura em 25/09/2026. Os tickets do conteudos-infinitos são do formato antigo, sem 'tipo': o tipo abaixo foi acrescentado aqui para o ticket passar pelo gate (o check 10 não olha o tipo).",
+  "ci_012": {
+    "_de": "conteudos-infinitos 95c115a:docs/fila/012-loop-nao-suja-arvore.md, criterios_aceite[0]",
+    "tipo": "guarda",
+    "descricao": "a suite da raiz segue verde",
+    "cmd": "npx vitest run 2>&1 | grep -cE 'Tests +[0-9]+ passed'",
+    "espera": "1"
+  },
+  "ci_015": {
+    "_de": "conteudos-infinitos f039a03:docs/fila/015-historico-paginacao-backend.md, criterios_aceite[2]",
+    "tipo": "alvo",
+    "descricao": "usa range, nao limit, no metodo novo",
+    "cmd": "awk '/listarRecentesPaginado/,/^  }/' services/persona-roteirizador/src/supabase-store.ts | grep -c '.range('",
+    "espera": "1"
+  },
+  "ci_002": {
+    "_de": "conteudos-infinitos b731b10:docs/fila/002-sql-remocao-usuarios-e2e.md, criterios_aceite[3]",
+    "tipo": "guarda",
+    "descricao": "não apaga por padrão de email (LIKE), só por id",
+    "cmd": "grep -ciE \"like\\s*'e2e|like\\s*'%e2e\" docs/sql-pendente/002-remove-usuarios-e2e.sql",
+    "espera": "0"
+  },
+  "actus_631": {
+    "_de": "actus-saas 2da6723:docs/fila/631-arquivo-solto-reprova-por-merito.md, criterios_aceite[8]",
+    "tipo": "guarda",
+    "descricao": "config e tabela: nenhuma linha alterada fora da regra arquivo_solto (grep -v conta o que sobra)",
+    "cmd": "{ git diff -U0 $BASE_REF...HEAD -- docs/fila/000-config.json scripts/orquestrador/config-tabela.ts | grep -E '^[+-][^+-]' | grep -vcE 'arquivo_solto|\"?modelo\"?: *.MANTER.,?$|\"?acao\"?: *.remover o arquivo solto da worktree.,?$|^[+-][[:space:]]*[}],?$' || true; }",
+    "espera": "^0$",
+    "exemplos_regex": [
+      {
+        "regex": "arquivo_solto|\"?modelo\"?: *.MANTER.,?$|\"?acao\"?: *.remover o arquivo solto da worktree.,?$|^[+-][[:space:]]*[}],?$",
+        "positivo": "+        acao: 'remover o arquivo solto da worktree',",
+        "negativo": "+    \"max_retries\": 3,"
+      }
+    ]
+  }
+}
diff --git a/test/orquestrador-gate-regex-casos.test.ts b/test/orquestrador-gate-regex-casos.test.ts
new file mode 100644
index 0000000..45b15df
--- /dev/null
+++ b/test/orquestrador-gate-regex-casos.test.ts
@@ -0,0 +1,196 @@
+/**
+ * Ticket 624, caso a caso — o check 10 do gate de ticket (exemplos_regex).
+ *
+ * Cada caso monta UM ticket pendente numa fila de fixture, roda o gate como o
+ * pré-voo roda (`validar`) e compara a lista EXATA de mensagens do campo
+ * `criterios_aceite[0].exemplos_regex`: aceito = lista vazia; recusado = as
+ * mensagens que o autor do ticket vai ler.
+ *
+ * Só importa o que o gate já exportava antes do 624 (`lerFila`, `validar`):
+ * sem o check 10, o arquivo carrega e os recusados falham por ASSERÇÃO (lista
+ * vazia onde se esperava a mensagem), não por import.
+ *
+ * Casos reais (test/fixtures/gate-regex-casos-reais/criterios.json): dois do
+ * conteudos-infinitos e um do actus-saas que o check marca na simulação
+ * done-como-pendente, cada um com a versão corrigida que passa. A prova é
+ * sempre no /usr/bin/grep e no /usr/bin/awk (nenhum mock do casamento).
+ */
+import { describe, it, expect } from 'vitest';
+import { readFileSync } from 'node:fs';
+import { join } from 'node:path';
+import { spawnSync } from 'node:child_process';
+import { criarFixture, escreverTicket, REPO_ROOT } from './fixtures/orq-harness.js';
+import { lerFila, validar, type GateCfg } from '../scripts/orquestrador/gate-ticket.js';
+
+const GATE_TS = join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts');
+const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
+const CFG: GateCfg = { proibido_no_cmd: [], cmd_prefixos_permitidos: [] };
+const REAIS = JSON.parse(
+  readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'gate-regex-casos-reais', 'criterios.json'), 'utf8'),
+) as Record<string, Record<string, unknown>>;
+
+/** O critério de fixture sem as chaves de proveniência (`_de`). */
+function real(nome: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
+  const { _de: _, ...c } = REAIS[nome]!;
+  return { ...c, ...extra };
+}
+
+let seq = 910;
+
+/** Mensagens do check 10 para um ticket com o critério dado como criterios_aceite[0]. */
+function check10(criterio: Record<string, unknown>): { msgs: string[]; fx: string; id: string } {
+  const fx = criarFixture([]);
+  const id = String(seq++);
+  escreverTicket(fx, {
+    id,
+    slug: `regex-${id}`,
+    bloco: 'B6',
+    risco: 'baixo',
+    objetivo: 'fixture do check 10',
+    pathspec_allowlist: ['src/nada.ts'],
+    criterios_aceite: [criterio, { tipo: 'avaliador', descricao: 'avaliador: fixture.', cmd: 'true', espera: 'avaliador' }],
+  });
+  const fila = lerFila(join(fx, 'docs', 'fila'));
+  const msgs = validar(fila.filter((t) => t.arquivo.includes(`/${id}-`)), fila, CFG)
+    .filter((v) => v.campo === 'criterios_aceite[0].exemplos_regex')
+    .map((v) => v.mensagem);
+  return { msgs, fx, id };
+}
+
+const crit = (cmd: string, exemplos?: unknown) => ({
+  tipo: 'alvo',
+  descricao: 'fixture',
+  cmd,
+  espera: '1',
+  ...(exemplos === undefined ? {} : { exemplos_regex: exemplos }),
+});
+
+const SEM_EXEMPLO_GREP = 'critério passa regex a grep e não declara exemplos_regex (lista de {regex, positivo, negativo})';
+const SEM_EXEMPLO_AWK = 'critério passa regex a awk e não declara exemplos_regex (lista de {regex, positivo, negativo})';
+
+describe('624 · casos reais do conteudos-infinitos', () => {
+  it('012[0] (grep -cE no placar do vitest, sem exemplos): RECUSA pela regra 1', () => {
+    expect(check10(real('ci_012')).msgs).toEqual([SEM_EXEMPLO_GREP]);
+  });
+
+  it('012[0] com exemplos: ACEITA; o negativo é o placar COM falha, que o padrão não casa', () => {
+    const exemplos = [
+      { regex: 'Tests +[0-9]+ passed', positivo: '      Tests  5 passed (5)', negativo: '      Tests  1 failed | 5 passed (6)' },
+    ];
+    expect(check10(real('ci_012', { exemplos_regex: exemplos })).msgs).toEqual([]);
+  });
+
+  it('015[2] (awk com dois literais /.../, sem exemplos): RECUSA pela regra 1, nomeando awk', () => {
+    expect(check10(real('ci_015')).msgs).toEqual([SEM_EXEMPLO_AWK]);
+  });
+
+  it('015[2] com UM exemplo só: RECUSA o literal que ficou sem exemplo', () => {
+    const exemplos = [
+      { regex: 'listarRecentesPaginado', positivo: '  async listarRecentesPaginado(', negativo: '  async listarRecentes(', ferramenta: 'awk' },
+    ];
+    expect(check10(real('ci_015', { exemplos_regex: exemplos })).msgs).toEqual([
+      "padrão '^  }' do cmd (awk) sem exemplo correspondente em exemplos_regex",
+    ]);
+  });
+
+  it('015[2] com os dois exemplos em awk: ACEITA', () => {
+    const exemplos = [
+      { regex: 'listarRecentesPaginado', positivo: '  async listarRecentesPaginado(', negativo: '  async listarRecentes(', ferramenta: 'awk' },
+      { regex: '^  }', positivo: '  }', negativo: '    }', ferramenta: 'awk' },
+    ];
+    expect(check10(real('ci_015', { exemplos_regex: exemplos })).msgs).toEqual([]);
+  });
+
+  it('002[3] (grep -ciE): sem flags o exemplo é provado com -E e o positivo em maiúsculas NÃO casa; com flags -iE ACEITA', () => {
+    const re = "like\\s*'e2e|like\\s*'%e2e";
+    const ex = { regex: re, positivo: "where email LIKE 'e2e%'", negativo: 'where id = any($1)' };
+    expect(check10(real('ci_002', { exemplos_regex: [ex] })).msgs).toEqual([
+      `positivo 'where email LIKE 'e2e%'' NÃO casa '${re}' (grep -E)`,
+    ]);
+    expect(check10(real('ci_002', { exemplos_regex: [{ ...ex, flags: '-iE' }] })).msgs).toEqual([]);
+  });
+});
+
+describe('624 · caso real do actus-saas', () => {
+  it('631[8] como está no done: RECUSA o primeiro grep -E, que ficou sem exemplo (o segundo tem)', () => {
+    expect(check10(real('actus_631')).msgs).toEqual([
+      "padrão '^[+-][^+-]' do cmd (grep) sem exemplo correspondente em exemplos_regex",
+    ]);
+  });
+
+  it('631[8] com o exemplo do primeiro grep acrescentado: ACEITA', () => {
+    const exemplos = [
+      ...(REAIS.actus_631!.exemplos_regex as unknown[]),
+      { regex: '^[+-][^+-]', positivo: '+    "max_retries": 3,', negativo: '+++ b/docs/fila/000-config.json' },
+    ];
+    expect(check10(real('actus_631', { exemplos_regex: exemplos })).msgs).toEqual([]);
+  });
+
+  it('pelo CLI, o 631[8] do done sai com rc 1 e a mensagem', () => {
+    const { fx, id } = check10(real('actus_631'));
+    const r = spawnSync(TSX, [GATE_TS, '--fila', join(fx, 'docs', 'fila'), id], { encoding: 'utf8' });
+    expect(r.status, `${r.stdout}${r.stderr}`).toBe(1);
+    expect(`${r.stdout}${r.stderr}`).toContain("padrão '^[+-][^+-]' do cmd (grep) sem exemplo correspondente em exemplos_regex");
+  });
+});
+
+describe('624 · regras, uma por caso', () => {
+  const RE = '(src|scripts)/[A-Za-z0-9_./()-]+:[0-9]+';
+  const CMD = `{ grep -cE '${RE}' docs/x.md || true; }`;
+  const OK = { regex: RE, positivo: 'src/app/route.ts:68', negativo: 'src/A-]:1' };
+
+  it('aceita: grep -F e grep sem -E não exigem exemplo', () => {
+    expect(check10(crit("{ grep -cF 'a|b' f || true; }")).msgs).toEqual([]);
+    expect(check10(crit("{ grep -c 'passed' f || true; }")).msgs).toEqual([]);
+  });
+
+  it('aceita: exemplo certo para o padrão do cmd', () => {
+    expect(check10(crit(CMD, [OK])).msgs).toEqual([]);
+  });
+
+  it('recusa (regra 1): lista de exemplos vazia conta como ausente', () => {
+    expect(check10(crit(CMD, [])).msgs).toEqual([SEM_EXEMPLO_GREP]);
+  });
+
+  it('recusa (regra 2): regex de exemplo que não aparece literal no cmd', () => {
+    expect(check10(crit(CMD, [OK, { regex: 'fora', positivo: 'fora', negativo: 'x' }])).msgs).toEqual([
+      "regex de exemplo 'fora' não aparece literal no cmd",
+    ]);
+  });
+
+  it('recusa (regra 3): positivo que não casa', () => {
+    expect(check10(crit(CMD, [{ ...OK, positivo: 'app/route.ts:68' }])).msgs).toEqual([
+      `positivo 'app/route.ts:68' NÃO casa '${RE}' (grep -E)`,
+    ]);
+  });
+
+  it('recusa (regra 4): negativo que casa', () => {
+    expect(check10(crit(CMD, [{ ...OK, negativo: 'scripts/orq:1' }])).msgs).toEqual([
+      `negativo 'scripts/orq:1' CASA '${RE}' (grep -E)`,
+    ]);
+  });
+
+  it('recusa (regra 5): \\[ \\] dentro de classe, no cmd e no exemplo; e o grep BSD confirma o estrago', () => {
+    const velho = '(src|scripts)/[A-Za-z0-9_./\\[\\]()-]+:[0-9]+';
+    const cmd = `{ grep -cE '${velho}' docs/x.md || true; }`;
+    expect(check10(crit(cmd, [{ ...OK, regex: velho }])).msgs).toEqual([
+      `regex '${velho}' tem \\[ ou \\] dentro de classe [...]: no /usr/bin/grep o ] fecha a classe (caso do 503)`,
+      `regex de exemplo '${velho}' tem \\[ ou \\] dentro de classe [...]`,
+      `positivo 'src/app/route.ts:68' NÃO casa '${velho}' (grep -E)`,
+      `negativo 'src/A-]:1' CASA '${velho}' (grep -E)`,
+    ]);
+  });
+
+  it('recusa: exemplo malformado, e o padrão fica sem exemplo', () => {
+    expect(check10(crit(CMD, [{ regex: RE, positivo: 'src/a.ts:1' }])).msgs).toEqual([
+      "exemplos_regex[0] malformado: precisa de regex, positivo, negativo (strings), flags? string, ferramenta? 'grep'|'awk'",
+      `padrão '${RE}' do cmd (grep) sem exemplo correspondente em exemplos_regex`,
+    ]);
+  });
+
+  it('recusa: regex que o /usr/bin/grep rejeita (rc 2) vira violação do ticket', () => {
+    const msgs = check10(crit("{ grep -cE 'a(' f || true; }", [{ regex: 'a(', positivo: 'a(', negativo: 'b' }])).msgs;
+    expect(msgs).toHaveLength(1);
+    expect(msgs[0]).toMatch(/^regex 'a\(' recusada: \/usr\/bin\/grep rc=2: .*parenthes/);
+  });
+});
```

### m `9365f5e`
```diff
commit 9365f5e25441fbb5ed684cc0cfd550f2f92a7bb9
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Fri Sep 25 10:31:00 2026 -0300

    porte-actus m: CHANGELOG do porte com os SHAs de depois do rebase; entradas j2, k, l
    
    Na seção "Porte do Actus": os SHAs de a..h trocam os de antes do rebase
    (d5efe1a…ac10faa) pelos atuais (017e3cc…957c178), e o "(este commit)" do i
    vira f4605b7. Entradas novas: j2 (ea28962), k (6366b55) e l (dce7f9e). A seção
    do hotfix-awk não foi tocada.
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

diff --git a/CHANGELOG.md b/CHANGELOG.md
index 348e3d2..9fc44c3 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -720,32 +720,47 @@ Actus vendorizou em `0bc0bf2`). Onde o kit já tinha peça própria, ficou a do
 do Actus passou a valer sobre ela. Decisões do Lucas de 24/09/2026. O contrato está no
 CONTRATO §11. Uma peça por commit, suíte inteira verde em cada um.
 
-- **a** `d5efe1a`: gate de ticket reprova `| grep -q` em pipe e leitura textual do vitest;
+- **a** `017e3cc`: gate de ticket reprova `| grep -q` em pipe e leitura textual do vitest;
   AVISO de caminho fora da allowlist (aab3f4e, a15daca, c7e81bc).
-- **b** `9eebef1`: o gate vira pré-voo do `drive_ticket` (c404986), com a chave nova
+- **b** `89e0afc`: o gate vira pré-voo do `drive_ticket` (c404986), com a chave nova
   `gate_ticket.modo_pre_voo` = `aviso` (template e `--migrar`) ou `bloqueia`.
-- **c** `2652000`: `contexto_juiz` (622).
-- **d** `69e1e9b`: causa de infra `ambiente` (8ª causa, "falha de ambiente da worktree")
+- **c** `1259eca`: `contexto_juiz` (622).
+- **d** `8557f7a`: causa de infra `ambiente` (8ª causa, "falha de ambiente da worktree")
   só quando o harness não executou o comando do critério; teto de 3 adiamentos por
   `ambiente`; cooldown e tentativas persistidas ficam os da 7b-2 e 7b-4, com os testes do
   Actus (08afb3e, 43fccdd, 9ecd02b, 625, ae29dcd, 629, 9e109cb, f3aaa89).
-- **e** `7aa291d`: motivo do juiz no retry e `retry_sem_mudanca` (623, só com o agente
+- **e** `ab1d848`: motivo do juiz no retry e `retry_sem_mudanca` (623, só com o agente
   saído rc 0 — o Actus tem o defeito); gates de fonte única (626), com a correção de
   marcação: gate pulado depois de falha não é ausente.
-- **f** `4cd219b`: JSON quebrado falha alto (630), `base_vermelha` (632), `arquivo_solto`
+- **f** `262feea`: JSON quebrado falha alto (630), `base_vermelha` (632), `arquivo_solto`
   (631, regra no template, na fixture, na config-tabela e no `--migrar`); a 8ª causa também
   no `--migrar` (`ITENS_NOVOS`: item novo no fim de uma lista que o repo já tem). A entrada
   do caso C do `test-reprovado-sub.sh` passou a ter o teste vermelho na allowlist do ticket.
-- **j** `411b88f`: timeout do agente falso proporcional à carga no `test-reprovado-sub.sh`
+- **j** `886b656`: timeout do agente falso proporcional à carga no `test-reprovado-sub.sh`
   e no `test-reabertura-humana.sh` (a falha intermitente da linha de base desta rodada).
-- **g** `fbbd6dd`: `orq-pause.sh` trata as duas sentinelas e grava na trilha; STATUS nomeia
+- **g** `bea11e7`: `orq-pause.sh` trata as duas sentinelas e grava na trilha; STATUS nomeia
   a sentinela ativa (514). `pausa_conteudo` separa a data da pausa do texto do STATUS.
-- **h** `ac10faa`: regra contra evidência fabricada no prompt (627), definições dos
+- **h** `957c178`: regra contra evidência fabricada no prompt (627), definições dos
   helpers para o juiz (628), `exemplos_regex` no gate (624).
-- **i** (este commit): CONTRATO §11, dicionário do ticket (`contexto_juiz`,
+- **i** `f4605b7`: CONTRATO §11, dicionário do ticket (`contexto_juiz`,
   `exemplos_regex`), e `TESTES_HARNESS` com os 13 testes do porte (lista aprovada pelo
   Lucas); o `fixture/` passa a ter a 8ª causa e a regra `arquivo_solto`, como um repo
   migrado.
+- **j2** `ea28962`: AMBIENTE absolvido desfaz também o `adiamentos_ambiente` do JSON do
+  ticket (a peça d o grava; a regra de AMBIENTE só desfazia o `.adiamentos` do RUNS_BASE).
+  Sem isso, dois tickets adiados por `ambiente` na mesma causa eram bloqueados pelo teto
+  no 3º disparo, antes da régua. Cada devolução commita o ticket e grava
+  `AMBIENTE_ADIAMENTO_DESFEITO` na trilha (vocabulário do CONTRATO §4.1). Teste:
+  `test-ambiente.sh`, caso 5.
+- **k** `6366b55`: teste do 627, que não tinha nenhum. `orquestrador-prompt-evidencia.test.ts`
+  roda o `run_attempt` com o `claude_run` interceptado e cobra o bloco no `prompt.txt`
+  (posição, as quatro regras, presença no retry). Sem o bloco, 6 de 6 falham.
+- **l** `dce7f9e`: o check 10 (624) caso a caso, em `orquestrador-gate-regex-casos.test.ts`,
+  com a lista exata de mensagens de cada caso aceito e recusado, e casos reais do
+  conteudos-infinitos (012, 015, 002) e do actus-saas (631) na fixture
+  `test/fixtures/gate-regex-casos-reais/`. Importa só o que o gate exportava antes do
+  624: sem o check 10, 13 de 18 falham por asserção, não por import. Os testes de k e l
+  não entraram no `TESTES_HARNESS` do `vendorizado.sh`.
 
 Testes do kit ajustados, sem afrouxar asserção: arames de contagem (chamadas `ORQ_TSX`,
 desfechos nomeados 9 → 13, causas e rótulos 7 → 8), o formato do TOTAL do `--relatorio`,
```
