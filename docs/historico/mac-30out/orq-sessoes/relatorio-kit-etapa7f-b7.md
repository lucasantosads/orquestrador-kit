# Relatório da etapa 7f-b7: PASSO 0 (18/10/2026)

Branch `kit/etapa7f7`, worktree `~/Projetos/_worktrees/kit-etapa7f7`, base `bd94754`.
**Só leitura.** Nenhum commit, nenhuma escrita além deste relatório.
- Comarka: só `GIT_OPTIONAL_LOCKS=0 git show/ls-tree` e leitura de arquivos.
- `~/.orq`: só leitura.
- `launchctl`: nenhum. `claude -p`: nenhum.

Os scripts de medição estão no scratchpad desta sessão, que é temporário:
`/private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-etapa7f7/fbe97d88-334f-44e4-bc71-e3cd61c98f38/scratchpad/`
(`allow22.py`, `al.py`, `pausas.py`). Na etapa, eles vão para `~/orq-sessoes/7f-b7/`.

## Achado que muda a P1

**No Comarka, um ticket nunca fica `pendente` entre a 1ª reprova e a 2ª tentativa.**

- A reprova vira retry **no mesmo processo** (`drive_ticket`, `continue`). No 1006, a tentativa 2 começa no mesmo segundo em que a 1 reprova:
  `[orq 15:05:30] ticket 1006: reprovado — retry 1/2` e, logo depois, `[orq 15:05:30] === ticket 1006 … tentativa 2`.
- O status fica `em_execucao` a série inteira. Entre tentativas, só a nota muda (`reprovado (tentativa N): …`).
- Reprova por enforcement **não existe** no Comarka: `fora_do_pathspec` vai direto a `bloqueado`, em qualquer tentativa. Esse caso já é o caminho do R1 de hoje (D6b/D8).
- A única forma de um ticket ficar `pendente` com a última tentativa reprovada é a pausa por gate sistêmico. Foram 7 casos em 14 dias (802, 761, 851, 741a, 707, 953, 921), nenhum de allowlist.
- **Firmeza.** Depois de uma reprova só, a D6 nunca é firme: ela exige o mesmo vermelho em pelo menos 2 tentativas (decisão da 7f-b1-7). A D6b exige o bloqueio do enforcement, que no Comarka já é `bloqueado`.

**Os 22 resgates de allowlist foram feitos com o ticket já `BLOQUEADO`, e não "antes" disso.**
- Todo ticket que falhou estava com `BLOQUEADO` como último desfecho no `local-loop.log` antes do commit humano. A tabela do item 4 mostra caso a caso.
- O R1 não agiu nos 13 depois de 11/10 por classificação, não por momento:
  - 4 por "mais de um vermelho fora da allowlist";
  - 7 por palpite (D7, D8, D11);
  - 1 por forma de R2;
  - 1 (1006) antes da D6b existir.

**Consequência.** A P1, como está escrita, age em 0 dos 22 e, no Comarka, só em ticket pausado por gate. O replay da P2 sairia "zero divergente" por vacuidade.

**O que os dados mostram como alavanca.** Nos 4 casos de "mais de um vermelho" (924a, 1054, 1055b, 1058), o humano pôs na allowlist **exatamente os mesmos 2 testes** que o resolvedor nomeou e recusou. A proposta P1' está abaixo.

## Tabela: pergunta, resposta, arquivo:linha

### 1. Dono do motor, CONTRATO §17, CHANGELOG

| pergunta | resposta | arquivo:linha |
|---|---|---|
| Quem pode mexer no motor | Só uma etapa, em worktree própria, com vermelho antes e merge humano. Sem push nem merge pela sessão | `CLAUDE.md:3-11` |
| O que a §17 (7f-b5) fixou | Pulado 1×/dia, leitor sem duplicata, aviso de pausa, veredito de gate, trava de tentativa nova, R8 | `CONTRATO.md:1521-1646` |
| Aviso de pausa hoje | Um aviso por sha do sentinela: macOS, iMessage se configurado, e uma linha `pausa` no ledger | `CONTRATO.md:1550-1566` |
| Trava de tentativa nova | `em_execucao`, entrada nova ou mexida em `runs/<id>/`, ou log com `=== ticket <id> (` | `CONTRATO.md:1605-1616` |
| CHANGELOG 7f-b2 a 7f-b5 | Lido. A 7f-b5 "trocou a ação na reprova por uma trava" | `CHANGELOG.md:933-1066` (a frase: `:1031`) |

### 2. Código do resolvedor

| pergunta | resposta | arquivo:linha |
|---|---|---|
| Onde decide a elegibilidade | A passada só itera `ordenarBloqueados`, que filtra por `status === 'bloqueado'` | `scripts/orquestrador/resolvedor/passada.ts:220`, `:91-109`; `triador/triar.ts:196-210` (`:207`) |
| Decisão R1 | Age só com `firme && fonte !== 'modelo'` e regra D6 ou D6b; em sombra, só propõe | `resolvedor/decidir.ts:45-49` |
| D6b | O enforcement da última tentativa barrou um arquivo só, e ele estava vermelho fora nessa tentativa ou na anterior | `triador/extrair.ts:239-259` |
| D6 firme | O mesmo vermelho fora em pelo menos 2 tentativas; com 1 só, sai `R1?` | `triador/extrair.ts:261-275` (`:271`) |
| Recusa com mais de um vermelho | `fora.length !== 1` vira "um conserto só não destrava" | `resolvedor/r1.ts:111` |
| Uma ação por ticket | Qualquer `acao` anterior no ledger para o repo e o id (para sempre, não por tentativa) | `resolvedor/acoes.ts:76-78`; `ledger.ts:55` |
| Git livre | Sem `index.lock`/`HEAD.lock` e sem processo `git`, esperando até 60 s | `resolvedor/repo.ts:142-162` |
| Tentativa nova e `em_execucao` | Relidas depois da espera do git; o ticket tem de estar como foi lido | `resolvedor/repo.ts:107-137` (`:109`), `:184-186` |
| `RESOLVEDOR_PAUSADO` | No começo da passada, entre repos e entre tickets | `resolvedor/caminhos.ts:29`; `passada.ts:182`, `:200`, `:221` |
| Volta para sombra | 2 desfechos ruins seguidos em auto | `resolvedor/promocao.ts:9-10`, `:62` |
| Aviso de pausa | Dedupe pelo sha no ledger; macOS; iMessage; linha `pausa` no ledger | `resolvedor/pausa.ts:117`, `:121`, `:123`, `:125-134` |
| Sentinelas lidas | `pausar_file`, `docs/fila/PAUSAR`, `docs/fila/.orq-pause` | `resolvedor/pausa.ts:36-59` |
| Chamada na passada | `avisarPausa` antes da triagem, fora do dry-run | `resolvedor/passada.ts:207-212` |
| Resquício de `na_reprova` | **Nenhum** no código, nos testes ou nos docs. A chave nunca entrou em código: a 7f-b5 a removeu no desenho. Só aparece na frase do CHANGELOG | `CHANGELOG.md:1031` |

### 3. Comarka (só leitura)

| pergunta | resposta | arquivo:linha |
|---|---|---|
| Onde fica a reprova da 1ª tentativa | Três lugares: a nota do ticket `reprovado (tentativa N): <motivo>`, uma entrada `resultado: reprovado` em `runs/<id>/meta.json` (`attempt`, `ts`) e as linhas `ticket <id>: reprovado — retry k/2` no `local-loop.log` | `scripts/orquestrador/executor.sh:660-713`; `lib.sh:855` (`write_meta`); `executor.sh:802` |
| Evidência por tentativa | `runs/<id>/attempt-N/` (gates, `prompt.txt`, `enforcement.json`). Uma série nova arquiva a anterior em `attempt-N.prevK` | `executor.sh:500-516` (ex.: `runs/1006/attempt-1.prev1`) |
| Quando fica pendente entre tentativas | **Nunca.** O retry é imediato no mesmo `drive_ticket` e o status segue `em_execucao` | `executor.sh:554` (`em_execucao`), `:799-803` (`continue`) |
| Quando fica pendente com a última reprovada | Só na pausa por gate sistêmico (o ticket volta a pendente) | `executor.sh:785-792`, `:808-813`; log: 7 casos em 14 dias |
| Enforcement | Falhou, `bloqueado` direto (não é reprova) | `executor.sh:627-652` |
| Fim da série | Circuit breaker (o mesmo motivo duas vezes) ou retries esgotados: `bloqueado` | `executor.sh:777-797`, `:815-817` |
| O que impede o resolvedor de editar ticket em execução | `em_execucao` cobre toda a série. O `mkdir attempt-N` e a linha `=== ticket` vêm antes de reler o ticket (`build_prompt`). `tentativaNova` pega os dois; o ticket tem de estar igual ao lido; git livre | `executor.sh:516`, `:527`, `:550`, `:554`; `resolvedor/repo.ts:107-137` |
| Contagem em 14 dias | 176 reprovas com retry. Depois delas, o desfecho seguinte: APROVADO 70, BLOQUEADO 66, outra reprova 33, PAUSADO 7 | `local-loop.log` de 04/10 a 18/10 (`allow22.py`) |
| Loop do kit (actus, conteudos) | Também faz retry no mesmo processo, mas **não** marca `em_execucao`: o ticket fica `pendente` durante a série. Uma P1 no kit precisaria de "série encerrada" pelo `events.log` (INICIO sem desfecho), senão tocaria ticket em execução | `scripts/orquestrador/executor.sh:1403-1420` (kit); `grep em_execucao` no executor do kit: 0 |

### 4. As 22 linhas de allowlist (`out/14d/intervencoes.csv`)

**Antes de 11/10: 9. Depois: 13.**

"Último desfecho no loop" é a última linha `ticket <id>: …` do `local-loop.log` antes do commit humano.

| data | commit | ticket(s) | `resolvedor_teria_agido` | último desfecho no loop | o que o R1 fez (ledger) |
|---|---|---|---|---|---|
| 05/10 16:04 | `09e85d2` | 762 | sim R1 | BLOQUEADO (motivo repetido) | (antes do R1) |
| 06/10 14:19 | `9d7ef4d` | 856 | sim R1 | BLOQUEADO | (antes) |
| 07/10 19:10 | `2d79bee` | 711a | sim R1 | BLOQUEADO (retries) | (antes) |
| 08/10 05:20 | `ae22bc3` (embutida) | 711b3 | sim R1 | APROVADO 00:49 (a edição veio antes, no writeback) | (antes) |
| 08/10 12:00 | `c3cde4a` | 889, 892, 897, 903 | nao | APROVADO (release de migrations, não resgate) | — |
| 08/10 18:56 | `90b5727` | 826 | nao | BLOQUEADO (retries) | (antes) |
| 09/10 11:50 | `676ca51` | 898, 898b | só proposta R2 | APROVADO (release) | — |
| 09/10 18:06 | `4dc5d71` | 950 | sim R1 | BLOQUEADO | (antes) |
| 10/10 21:19 | `7787af3` | 840, 929 | nao | BLOQUEADO | (antes; gabarito da 7f-b2) |
| 11/10 00:42 | `079d3f4` | 952a, 972 | nao | APROVADO (release) | — |
| 11/10 11:02 | `cc8d388` | 932 | sim R5 | APROVADO (release) | — |
| 11/10 12:27 | `5525c7d` | 1006 | sim R1 | BLOQUEADO (enforcement) | aviso `R1?` D6 (D6b ainda não existia) |
| 12/10 11:08 | `4b5dd2e` (embutida) | 318c, 933, 934b, 935 | nao | BLOQUEADO | 318c: aviso R5 D5; 933/934b/935: proposta R2 |
| 12/10 11:28 | `af768b0` | 966 | nao | BLOQUEADO | aviso R1 D7 (palpite) |
| 12/10 11:29 | `05d951e` | 830 | nao | BLOQUEADO (retries) | — |
| 12/10 13:09 | `ab4e95c` | 854 | sem dado | BLOQUEADO | aviso R1 D7, R2? D10, R5 D5 |
| 12/10 20:19 | `638e003` | 855 | nao | BLOQUEADO | aviso R1 D7 |
| 13/10 00:33 | `c00ee4b` | 924a | sim R1 | BLOQUEADO | **nao_agiu: mais de um vermelho** |
| 14/10 11:21 | `b7a3eea` (embutida) | 1053, 1053b, 1054, 1055b, 1056b, 1101, 924c | sim R1 | todos BLOQUEADOS antes e APROVADOS depois do resgate | 1053/1053b: D7 e R2; **1054, 1055b: mais de um vermelho**; 924c: R2 D11 |
| 14/10 19:22 | `cf2fe3a` | 1059 | nao | BLOQUEADO (retries) | aviso R1 D11 |
| 15/10 11:58 | `8324362` | 1058 | sim R1 | BLOQUEADO | **nao_agiu: mais de um vermelho** (2×) |
| 17/10 05:34 | `75db690` (embutida) | 1195 | nao | APROVADO 03:54 (a edição veio antes) | aviso R1 D8 |

**Na hora da edição: 0 ticket pendente depois de reprova.**

A coluna `resolvedor_teria_agido` é otimista: diz "sim R1" em 924a, 1053, 1054, 1055b, 1058 e outros, onde o ledger mostra que o R1 recusou ou só avisou.

**Os 4 de "mais de um vermelho", contra o humano** (testes que o humano acrescentou à allowlist no commit):

| ticket | os vermelhos que o R1 nomeou | o que o humano acrescentou |
|---|---|---|
| 924a | conta-entregas-vazio-unico, visao-aceite-mockup | os mesmos 2 |
| 1054 | resolver-cliente-rota-diagnostico, resolver-cliente-rota-resumo | os mesmos 2 |
| 1055b | acoes-recomendadas-chave, relatorio-sem-cliente-id | os mesmos 2 |
| 1058 | negocio-temperatura, quem-cuida | os mesmos 2 (e mais conserto de fixtures: a conferir na P2) |

Também recusados por "mais de um vermelho", fora dos 22: 1009, 999c e 1060 (este com 5 ou mais vermelhos).

**Os 89 resgates por tipo, antes e depois de 11/10:**

| tipo | antes | depois | total |
|---|---|---|---|
| allowlist | 9 | 13 | 22 |
| criterio | 7 | 5 | 12 |
| pausa_manual | 1 | 8 | 9 |
| motor | 0 | 8 | 8 |
| writeback | 4 | 3 | 7 |
| gate_streak | 5 | 2 | 7 |
| dependencia | 4 | 3 | 7 |
| outro | 2 | 4 | 6 |
| pausa_gate_streak | 4 | 1 | 5 |
| reabertura | 2 | 2 | 4 |
| config | 1 | 1 | 2 |
| **total** | **39** | **50** | **89** |

### 5. Pausas do ledger (`~/.orq/resolvedor/ledger.jsonl`, 69 linhas `pausa`)

Todas com `macos: enviada` e `imessage: nao_configurado`. Por repo: Comarka 67, conteudos-infinitos 2.

| motivo / dono | total | em 17 e 18/10 |
|---|---|---|
| `dono: publicar.sh` | 37 | 11 |
| sem `dono:` (manual, vigia, pull, porte) | 10 | 1 (o vigia do login expirado) |
| `ritual-staging em andamento` (sem `dono:`) | 7 | 1 |
| `dono: promocao` | 5 | 0 |
| `dono: promocao-apolo` | 5 | 4 |
| `dono: Lucas` | 2 | 0 |
| `dono: manual` | 2 | 0 |
| gate sistêmico | 1 | 0 |
| **total** | **69** | **17** |

**Duração: não está registrada em lugar nenhum.**
- O ledger só tem o início. O `local-loop.log` só registra a pausa quando um run começa durante ela.
- O que dá para medir:
  - **mínima** ("vista no loop"), de 0 a 19 min para `publicar.sh`;
  - **teto** (até a pausa seguinte do repo), que não é o fim da pausa: `publicar.sh` tem mediana de 17,5 min e máximo de 1168 min; 13 de 37 têm mais de 30 min até a seguinte.
- Logo, o limite de 30 min não tem calibração nos dados. Sugiro que a P3 grave o fim da pausa (pergunta 6).

Uma pausa com dono `publicar.sh` é **falha**: `publicar FALHOU (2026-10-15 13:11) no passo 6/7 push`. Esta deveria avisar na hora (pergunta 4).

## Plano das peças (teto de linhas, sem os fixtures)

Escrevo os dois caminhos da P1; a escolha é sua (pergunta 1).

**P1 literal: elegibilidade na reprova.** Código ≤ 120 linhas, teste ≤ 180.
- `passada.ts`: lista de elegíveis = bloqueados + pendentes cuja última entrada do meta é `reprovado`, com `na_reprova` do repo diferente de `diagnostico`.
- `modos.ts`: `na_reprova` no item, padrão `sombra`.
- `repo.ts`: "série encerrada". No legado: o ticket fora de `em_execucao`. No kit: o último INICIO do `events.log` com desfecho.
- `acoes.ts`: uma ação por (ticket, tentativa).
- Vermelho antes: o 802 ou o 953 pausado por gate (caso real de pendente depois de reprova), mais um ticket `em_execucao` que nunca é tocado.
- **Efeito esperado no Comarka: ~0**, porque a D6 não fica firme com uma tentativa só e o enforcement já bloqueia.

**P1' (recomendada): R1 com mais de um vermelho.** Código ≤ 80 linhas, teste ≤ 180.
- `r1.ts:111`: aceitar N vermelhos fora quando **cada** um sai firme por si (D6 persistente ou D6b) e acoplado. Vão todos para a allowlist, com uma guarda de contagem por teste.
- Um commit só, que conta como uma ação.
- Recusa como hoje: qualquer um palpite, ou mais de 3 vermelhos (o 1060).
- Vermelho antes: o 924a real (evidência copiada de `runs/924a/`) não age no motor atual, e age igual ao humano no novo.
- Pode vir junto com a P1 literal, se você quiser as duas.

**P2: replay sem custo.** Teste ≤ 150 linhas mais fixtures copiadas de `runs/<id>/` do Comarka.
- Para cada uma das 22 linhas, o que o motor novo faria (com a mesma evidência) contra o que o humano fez.
- Aceite: zero divergente, e os casos sem ação listados com o motivo.
- Com a P1', o esperado é 4 iguais (924a, 1054, 1055b, 1058; o 1058 talvez "igual e mais") e 18 sem ação, com o motivo de cada um.

**P3: pausa com dono silenciosa.** Código ≤ 80 linhas, teste ≤ 150.
- `pausa.ts`: o dono sai da 1ª linha (`dono: X |`). Com X em `pausa_dono` do item no repos.json (padrão `["publicar.sh"]`), a linha `pausa` vai ao ledger com `notificacao: {macos: "silenciada", …}` e `dono`.
- Na passada seguinte, com o mesmo sha e `agora − ts ≥ pausa_dono_max_min` (padrão 30), avisa uma vez (`pausa_longa` no ledger).
- Pausa sem dono: como hoje.
- Vermelho antes: as 17 linhas reais de 17 e 18/10 como sentinelas.
  - No motor atual: 17 notificações.
  - No novo, abaixo do limite: 6 (as 11 de `publicar.sh` silenciam); só com `promocao-apolo` na lista, 2.

**P4: docs.** CONTRATO §18, CHANGELOG, PECAS com os shas.

**Fechamento:** `npx tsc --noEmit`, `TZ=UTC node_modules/.bin/vitest run`, `bash scripts/kit/test-shell.sh` e `bash scripts/kit/test-instalar.sh`, com saída crua e rc.

## Perguntas que só você responde

1. **P1:** a literal (inerte no Comarka, ~0 casos), a P1' (os 4 de "mais de um vermelho", iguais ao humano) ou as duas?
2. **Se a literal ficar:** no kit o ticket fica `pendente` durante a série. Posso usar "INICIO sem desfecho no `events.log`" como `em_execucao` do kit?
3. **"Uma ação por ticket":** hoje vale para sempre. Na P1', o commit com N testes conta como 1 ação? E "por tentativa" (do brief) substitui o "para sempre" de hoje, ou só vale para a P1 literal?
4. **P3:** `dono: publicar.sh | motivo: publicar FALHOU …` deve avisar na hora? Recomendo que sim: `FALHOU` no motivo nunca silencia.
5. **P3, lista padrão:** só `publicar.sh` (o brief), ou também `promocao-apolo` (5 em 14 dias, 4 só em 17 e 18/10)? E `ritual-staging`, que não escreve `dono:` e por isso continuaria avisando?
6. **P3:** gravo também `pausa_fim` no ledger (quando o sentinela some) para medir a duração da próxima vez? São cerca de 10 linhas. Sem isso, os 30 min seguem sem calibração.
7. **Nomes das chaves no item do repos.json:** `na_reprova` (se a P1 literal ficar), `pausa_dono` (lista) e `pausa_dono_max_min`. Servem?

Paro aqui e espero o seu ok.

---

# Execução (18/10/2026, depois do ok)

**4 commits em `kit/etapa7f7`, sem push e sem merge.** Escrita só no worktree, em `~/orq-sessoes/7f-b7/` e neste relatório.
- `~/.orq` e Comarka: só leitura. No Comarka, só `GIT_OPTIONAL_LOCKS=0 git show/log/rev-parse/ls-tree` e leitura de arquivos.
- `launchctl`: nenhum. `claude -p`: nenhum. `--no-verify`: nenhum.

Os scripts de medição do PASSO 0 foram copiados para `~/orq-sessoes/7f-b7/` antes da 1ª peça.

| peça | commit | vermelho (motor anterior) | verde |
|---|---|---|---|
| P1' · R1 com mais de um vermelho, tudo ou nada; uma ação por bloqueio, teto de 2 | `8264ad1` 7f-b7-1 | 7 de 7 contra `bd94754`. Os 4 casos reais saem com "mais de um vermelho fora da allowlist … um conserto só não destrava"; a regra de ação sai com "segunda vez bloqueado depois de uma ação". Arquivo: `7f-b7/p1-vermelho.txt` | 7/7 |
| P2 · replay dos 13 resgates | `04ad1e7` 7f-b7-2 | 2 de 4 contra `bd94754`: `expected [ '1006' ] to deeply equal [ '1006', '1054', '1055b', '1058' ]`, e o motivo do 924a. Arquivo: `7f-b7/p2-vermelho.txt` | 4/4. Arquivos: `7f-b7/p2-verde.txt`, `7f-b7/p2-replay.json` |
| P3 · pausa com dono silenciosa | `37320b8` 7f-b7-3 | 5 de 5 contra `04ad1e7`. As 17 pausas reais de 17 e 18/10 notificam 17 vezes (`expected [ …(17) ] to deeply equal [ Array(2) ]`). Arquivo: `7f-b7/p3-vermelho.txt` | 5/5: notificam 2 |
| P4 · docs | `a00e999` 7f-b7-4 | — | CONTRATO §18 (e a nota em §14.5), CHANGELOG, PECAS |

Cada vermelho é o teste do próprio commit rodado contra o motor anterior. No commit, o diff do `scripts/` foi guardado em patch, o `scripts/` voltou ao commit anterior e o patch foi reaplicado depois.

## Desvios do combinado (decida se ficam)

**1. "Uma ação por ticket por assinatura" virou "por bloqueio".**
- O resolvedor recusa quando a assinatura **ou** o `bloqueado_em` repete uma ação anterior (`acoes.ts:87-90`).
- O motivo: a assinatura lê o mtime do arquivo do ticket (`leitor-legado-comarka.ts:244-246`).
  - Reescrever o ticket sem série nova muda a assinatura. Isso acontece com o `orq desfazer` ou com o writeback do loop.
  - Com a regra literal, o resolvedor agiria de novo no ticket que o humano acabou de desfazer.
  - Três testes antigos travam exatamente isso: `acoes.test.ts:112`, `desfazer.test.ts:61` e `ledger.test.ts:101`.
- `bloqueado_em` é o `bloqueio.quando`, o fim da série pelo `meta.json`. Uma série nova sempre o muda.
- A regra é pelo menos tão restrita quanto a literal. A 2ª ação numa série nova e o teto de 2 estão como você pediu (`acoes.ts:71`, `:91-93`).

**2. 924a: sem ação.**
- O aceite da P2 pedia que os 4 casos (924a, 1054, 1055b, 1058) virassem ação idêntica.
- No 924a, `test/conta-entregas-vazio-unico.test.ts` ficou vermelho só na tentativa 1. Os dados do diagnóstico real são:
  `vermelhos: 1:conta-entregas…, 1:visao-aceite…, 2:visao-aceite…`.
- Ele não cumpre a D6 sozinho, então a regra "tudo ou nada" que você deu barra a ação.
- Não afrouxei a regra. As ações idênticas são 4, mas o 4º caso é o **1006** (D6b, um vermelho só; já agia no motor de hoje), não o 924a.

**3. Os fixtures dos 14 casos entraram no commit da P1'.** O `montar.py` gera todos de uma vez; a P2 só os usa.

**`r1_multi`: não criei a chave.** O replay deu zero ação divergente, então a P1' fica em auto, como combinado.

## P1' · o que mudou (arquivo:linha)

| o quê | onde |
|---|---|
| `r1_testes`: cada vermelho fora com a regra que cumpre sozinho, fora do `detalhe` (que vai ao prompt do modelo, `modelo.ts:183`) | `triador/extrair.ts:40`, `:262-268`; `triador/triar.ts:116` |
| Tudo ou nada | `resolvedor/r1.ts:120-133` (motivo: `:131`) |
| Os N testes na allowlist e no critério da lista, uma guarda por teste | `resolvedor/r1.ts:136-196` (guardas: `:183`) |
| Mesmo bloqueio vai para humano; teto de 2 (a 3ª vira só aviso) | `resolvedor/acoes.ts:71`, `:85-94` |
| `testes` no ledger `acao` | `resolvedor/acoes.ts:139` |

Um diagnóstico gravado antes da etapa não tem `r1_testes`. Com mais de um vermelho, ele continua recusando até o ticket ser triado de novo.

## P2 · resultado do replay (contra o motor final)

13 linhas, 23 tickets. **14 com caso** (bloqueados antes do commit humano e com allowlist nova).

| linha | ticket | classe e regra | resultado | humano pôs | o humano fez também |
|---|---|---|---|---|---|
| 11/10 12:27 `5525c7d` | 1006 | R1 D6b | **idêntica** | quem-cuida | guarda em outra forma, critério VERDE |
| 12/10 11:08 `4b5dd2e` | 318c | sem classe | sem ação: modo diagnostico para sem classe | `nichos-teses-aba.tsx` (src) | objetivo, critérios |
| 12/10 11:28 `af768b0` | 966 | R5? D7 | sem ação: palpite | ficha-nav-colapsavel | critério novo RECALCULADO_966 |
| 12/10 11:29 `05d951e` | 830 | R2? D12 | sem ação: forma fora do R2 | 2 scripts + 1 teste | 2 critérios novos |
| 12/10 13:09 `ab4e95c` | 854 | R5? D7 | sem ação: palpite | rotas-orfas | 2 critérios novos |
| 12/10 20:19 `638e003` | 855 | R5? D7 | sem ação: palpite | adocao-predicado | critério NAO_AFROUXOU |
| 13/10 00:33 `c00ee4b` | **924a** | R1 D6 | **sem ação: tudo ou nada** (conta-entregas-vazio-unico) | os 2 | teto do diff, `excecao_tamanho` |
| 14/10 11:21 `b7a3eea` | 1053 | R2? D12 | sem ação: forma fora do R2 | papel-nas-escritas | teto, critério novo |
| 14/10 11:21 `b7a3eea` | 1053b | R1\|R2? D11 | sem ação: palpite | `espelho-legado.ts` (src) | teto, critério novo |
| 14/10 11:21 `b7a3eea` | 1054 | R1 D6 | **idêntica** (2 testes) | os 2 | **teto 720→760**, critério RECALCULADO_ROTAS_1054 |
| 14/10 11:21 `b7a3eea` | 1055b | R1 D6 | **idêntica** (2 testes) | os 2 | **teto 640→700**, critério RECALCULADO_1055B |
| 14/10 19:22 `cf2fe3a` | 1059 | R1\|R2? D11 | sem ação: palpite | 2 testes | teto, critérios |
| 15/10 11:58 `8324362` | 1058 | R1 D6 | **idêntica** (2 testes) | os 2 | **teto 480→520**, anti-afrouxamento com os 2, conserto de fixture no texto |
| 17/10 05:34 `75db690` | 1195 | R1? D8 | sem ação: palpite | reuniao-manual-registro | critério VERDE |

**Placar: 4 idênticas, 0 divergentes, 10 sem ação**, cada uma com o motivo conferido no teste.

**Sem caso: 9 tickets das mesmas linhas.**

| motivo | tickets |
|---|---|
| Release de ticket done, sem bloqueio antes | 952a, 972, 932 |
| Allowlist não mudou no ticket | 933, 934b, 935, 924c |
| Sem bloqueio e sem allowlist nova | 1056b, 1101 |

**Atenção ao teto do diff.**
- Nos 3 casos de dois vermelhos, o humano subiu o `NO_TETO` em 40 a 60 linhas. O R1 não mexe no teto.
- Se o diff do ticket reaberto passar do teto antigo, ele reprova. Isso conta como desfecho ruim, e 2 ruins seguidos devolvem o R1 a sombra.
- Está nos PENDENTES. As 10 ações R1 reais até hoje foram todas a done, mas eram de um teste só.

## P3 · o que mudou (arquivo:linha)

| o quê | onde |
|---|---|
| Dono e passo que falhou, lidos do motivo | `resolvedor/pausa.ts:86`, `:89` |
| Pausa aberta e `pausa_fim` com `duracao_s` (só pausa registrada a partir da 7f-b7) | `resolvedor/pausa.ts:132-170` |
| `pausa_longa`: uma vez, depois do limite | `resolvedor/pausa.ts:172-182` |
| A pausa silenciosa | `resolvedor/pausa.ts:186-190` |
| `pausa_donos` (padrão `publicar.sh`, `promocao-apolo`) e `pausa_dono_max_min` (padrão 30) | `resolvedor/modos.ts:43-48`, `:112` |

**Fixture `test/fixtures/pausas-7f7`.**
- As 17 pausas de 17 e 18/10 e a FALHOU de 15/10, copiadas do ledger real.
- A 1ª linha do sentinela foi recuperada do `local-loop.log` em 10 delas.
- Em 7, o carimbo foi reconstruído da hora do ledger: o motivo é o real, e só o carimbo é refeito.
- Em 1 (ritual e vigia não têm carimbo), o motivo fica sem carimbo.

**Resultado:** com as 17 pausas reais, o motor atual notifica 17 vezes; o novo, 2 (`ritual-staging` e o vigia do login expirado). As 15 com dono (11 de `publicar.sh` e 4 de `promocao-apolo`) entram no ledger como `silenciada`.

**Pausa nova desde o PASSO 0.** O ledger real ganhou uma 18ª em 18/10 04:25Z (`publicar token-adr020`). Ela ficou fora do fixture, que guarda as 17 da medição.

## Fechamento (saída crua em `~/orq-sessoes/7f-b7/fechamento/`)

```
$ npx tsc --noEmit
tsc rc=0

$ TZ=UTC node_modules/.bin/vitest run
 Test Files  95 passed (95)
      Tests  1565 passed (1565)
vitest rc=0

$ bash scripts/kit/test-shell.sh
  rc=0  test-sem-cor.sh
  rc=0  test-criterio-isolado.sh
  rc=0  test-fixture-gates.sh (kit)
TODOS OS SCRIPTS SAÍRAM rc 0
test-shell rc=0

$ bash scripts/kit/test-instalar.sh
== (c) ORQ_CI_CHECKOUT não setado (SÓ LEITURA — o resultado é achado, não gate) ==
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)
TODOS OS CHECKS PASSARAM
test-instalar rc=0
```

**Asserções existentes que mudaram: nenhuma.** O resolvedor e o triador inteiros passaram (173 testes) a cada peça.

## Para você decidir

1. **O desvio 1.** "Por bloqueio" em vez de "por assinatura literal": fica?
2. **O 924a.** Aceita ficar sem ação pelo tudo ou nada, ou quer outra regra para o teste que ficou vermelho uma vez só?
3. **O teto do diff nos casos de dois vermelhos.** Quer que o R1 suba o `NO_TETO` (por exemplo, pela soma das linhas dos testes)? Hoje não sobe.
4. **Depois do merge.** O job pega as chaves novas pelo padrão: `pausa_donos` e `pausa_dono_max_min` não precisam estar no `repos.json` para valer.

---

# Peça 5 (18/10/2026, depois das decisões 1, 2 e 4)

Decisões registradas:
- (1) uma ação por bloqueio: aceita;
- (2) 924a sem ação: aceito, sem afrouxar;
- (4) `repos.json` sem mudança: confirmado.

**Dois commits a mais, sem push e sem merge.** Escopo de escrita igual ao das outras peças.

| peça | commit | vermelho (motor anterior) | verde |
|---|---|---|---|
| P5 · `r1_multi` isolado e `limite_apos_r1` | `1d59ce6` 7f-b7-5 | 2 de 2 contra `a00e999`. Depois de 2 reprovas por limite de tickets reabertos por `r1_multi`, o motor grava `rebaixamento` com `classe: R1`, `de: auto`, `para: sombra` e motivo "2 desfechos ruins seguidos": o R1 **inteiro** volta para sombra. Arquivo: `7f-b7/p5-vermelho.txt` | 2/2 |
| docs | `85c49a6` 7f-b7-6 | — | CONTRATO §18.2b (é a seção desta etapa; a §17 é a da 7f-b5), §18.4 e §18.5; CHANGELOG; PECAS |

**Verde (`orquestrador-resolvedor-r1-multi-isolado.test.ts`).**

(b) Com 1054 e 1055b reais num repo só, as duas ações `r1_multi` são aplicadas; depois o loop bloqueia os dois por limite. O resultado:
- desfechos `limite_apos_r1`, com `bom: null` e `subclasse: r1_multi`;
- **nenhum** `rebaixamento`: R1 segue `auto` e `r1_multi` fica ausente (vale o do R1);
- `proposta_limite` gravada no ledger:
  - 1054: `criterio[3]`, limite 720, diff 735;
  - 1055b: `criterio[3]`, limite 640, diff 668;
- **uma** notificação por ação, sem repetir na passada seguinte;
- o cmd do `NO_TETO` igual ao da ação: o limite não foi tocado.

(a) Com 1054, 1055b, 1006 e 1058 num repo só:
- 2 desfechos ruins de `r1_multi` (a nota real de 13/10, "gate vitest: suíte vermelha") registram `rebaixamento` com `classe: r1_multi`, de `auto` para `sombra`;
- o `repos.json` fica com `R1: auto` e `r1_multi: sombra`;
- em seguida, o 1006 (um teste) é **aplicado** e o 1058 (dois testes) vira **proposta**, com o ticket intacto.

**Fixture `test/fixtures/resolvedor-7f7/p5`.**
- Os casos são os reais.
- A nota do bloqueio seguinte usa o formato real do `executor.sh` do Comarka (`:796` e `:817`) e o motivo real de reprova por limite do log (963 e 994c).
- O `ESTOUROU_<n>` é **hipotético**: fica entre o teto do ticket e o teto que o humano pôs no resgate real (1054: 720 → 760, n = 735; 1055b: 640 → 700, n = 668). Não existe bloqueio real por limite depois de uma ação do R1. Está no `LEIA.md` do fixture.

## O que mudou (arquivo:linha)

| o quê | onde |
|---|---|
| A chave `r1_multi` e o modo dela (ausente: o do R1) | `resolvedor/modos.ts:60`, `:66`, `:69` |
| O modo do `r1_multi` na ação (sombra vira proposta; diagnostico, só aviso); as travas num lugar só | `resolvedor/acoes.ts:84-95`, `:111-122` |
| `subclasse` no desfecho e no `desfeito` | `resolvedor/desfecho.ts:72`; `resolvedor/desfazer.ts:66` |
| `limite_apos_r1`: a leitura da nota, `bom: null`, `proposta_limite` e a notificação | `resolvedor/desfecho.ts:60-70`, `:89`, `:106`, `:112-117` |
| O rebaixamento conta por subclasse e pula o `bom: null` | `resolvedor/promocao.ts:32`, `:43` |
| A notificação da pausa exportada para o desfecho reaproveitar | `resolvedor/pausa.ts` (`notificar`) |
| Vários casos reais num repo só | `test/resolvedor-repo.ts:219` |

Desfechos gravados antes desta peça não têm `subclasse` e contam como a classe (R1). A 1ª `r1_multi` só existe a partir da 7f-b7-1, então nenhum desfecho antigo é de `r1_multi`.

**Asserções existentes que mudaram: nenhuma.** O resolvedor e o triador passaram inteiros: 175 testes.

## Fechamento depois da P5 (saída crua em `~/orq-sessoes/7f-b7/fechamento-p5/`)

```
$ npx tsc --noEmit
tsc rc=0

$ TZ=UTC node_modules/.bin/vitest run
 Test Files  96 passed (96)
      Tests  1567 passed (1567)
vitest rc=0

$ bash scripts/kit/test-shell.sh
TODOS OS SCRIPTS SAÍRAM rc 0
test-shell rc=0

$ bash scripts/kit/test-instalar.sh
TODOS OS CHECKS PASSARAM
test-instalar rc=0
```

## Estado final da branch `kit/etapa7f7` (6 commits sobre `bd94754`)

```
85c49a6 7f-b7-6: CONTRATO §18.2b (r1_multi e limite_apos_r1), CHANGELOG e PECAS com o sha da peça 5
1d59ce6 7f-b7-5: r1_multi isolado do R1 de um teste; reprova por limite depois do resolvedor vira limite_apos_r1, só proposta
a00e999 7f-b7-4: CONTRATO §18 (...), CHANGELOG e PECAS com os shas da 7f-b7
37320b8 7f-b7-3: pausa com dono silenciosa; FALHOU notifica na hora; pausa_fim com a duração
04ad1e7 7f-b7-2: replay sem custo dos 13 resgates humanos de allowlist do Comarka depois de 11/10
8264ad1 7f-b7-1: R1 com mais de um vermelho fora da allowlist, tudo ou nada; uma ação por bloqueio, teto de 2 por ticket
```

Nenhum push e nenhum merge. O merge na `main` é seu.
