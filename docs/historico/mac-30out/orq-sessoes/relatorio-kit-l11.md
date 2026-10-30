# Relatório kit L11: gate de instável (porte do Comarka 86dec07 Fix A e 9ee36a9)

Worktree `~/Projetos/_worktrees/kit-l11`, branch `kit/l11`, base `9420eb0`. Comarka lido em `6995f49`
(main), só com `git show/log/merge-base` sob `GIT_OPTIONAL_LOCKS=0` e leitura de `docs/fila/runs`.

## PASSO 0 (só leitura; nada foi escrito além deste relatório)

### Shas

- `86dec07` e `9ee36a9` estão na main do Comarka (`merge-base --is-ancestor`). `dc90c8d`, `906259f` e
  `bb59341` não estão; só `backup/fix-motor-gate-vitest-3commits`. Depois do `9ee36a9`, um único
  commit da main toca esses arquivos (`63415ea`, diff de remoção isento do diff_cap, sem relação).
- O texto do `86dec07` (Fix A) é o `dc90c8d` mais a guarda do `906259f` (here-string) e o aviso
  ao juiz; o teste vai de 21 casos (dc90c8d) para 24 (86dec07).

### Tabela

| # | Pergunta | Resposta | arquivo:linha |
|---|---|---|---|
| 1a | `roda_vitest_isolado` (Comarka) | `( cd wt && npx vitest run <arq> ) > saida 2>&1 < /dev/null`. Um arquivo, uma vez, sem timeout. O stdin fechado é porque roda dentro de `while read`. | comarka `86dec07` lib.sh:+873 |
| 1b | `vitest_instaveis` (Comarka) | Lê os arquivos com FAIL. Guardas, nesta ordem: (1) `Unhandled Error` na saída: não reroda; (2) `Test Files N failed` diferente do nº de FAIL lidos: não reroda; (3) "com relação" = casa a allowlist (mais a ampliada) ou `teste_cita` um arquivo da allowlist que o diff tocou: vai para o resto, nunca reroda; (4) mais de 3 sem relação = "base quebrada": não reroda e tudo conta. Cada um dos restantes roda isolado e gera `rundir/isolado-<n>.txt`. Se passa, vai para `INST_TESTES`, `rundir/instaveis.txt` e `runs/instaveis.log` (TSV com data, id e arquivo). Se falha, vai para `INST_RESTO`. | comarka `86dec07` lib.sh:+880-930 |
| 1c | `decide_instaveis` e a ordem (Comarka) | Chamado logo depois de `gate_vitest` e antes de `decide_vizinhos`. Tudo instável (resto vazio): `GATE_VITEST_OK=true`. Mistura: `vitest_vizinhos` recebe `[ignorar]` e decide o vizinho sem o instável. | comarka `86dec07` executor.sh:+482-494, +725-728 |
| 1d | Juiz (Comarka) | Com `instaveis.txt` não vazio, o "gates: todos verdes" vira "tsc/build verdes; vitest vermelho SÓ em teste sem relação com o diff que passou rodado isolado", seguido da lista. | comarka `86dec07` avaliador.sh:115-122 |
| 1e | `registra_instavel` (9ee36a9) | Best-effort (sempre rc 0). Anexa ao `instaveis.log`. No 3º registro do mesmo arquivo (awk com igualdade exata no campo 3), cria uma vez `runs/instabilidade/instavel-<slug>.md`: rascunho com os 3 registros e o JSON de ticket com `id: PREENCHER` e `criterios_aceite: []`. Loga `INSTABILIDADE:`. | comarka `9ee36a9` lib.sh:+891-918 |
| 1f | `test-gate-instavel.sh` | 24 asserções em 8 seções. A: passa isolado (4). B: falha isolado (2). C: 4 sem relação, base quebrada, e 3 sem relação rerodando os 3 (4). D: cita a allowlist (1). E: mistura com o vizinho (5). F: mistura com instável que falha isolado (2). G: Unhandled, Unhandled seguido de 300 KB sob pipefail e contagem que não bate (3). H: ordem no executor, avaliador e `unset` (3). Fixtures **sintéticas**: o gerador `vitest_saida` imita a vitest 3 com ANSI. Só o nome `orfas` vem do caso real. | comarka `9ee36a9:scripts/orquestrador/test-gate-instavel.sh` |
| 1g | `test-instavel-recorrente.sh` | 18 asserções em 7 seções. A: 2 registros (2). B: o 3º registro gera o rascunho com título, registros, JSON e log (5). C: o 4º não duplica (4). D: arquivos diferentes (1). E: `a.test.ts` contra `a.test.tsx` (1). F: `vitest_instaveis` 3 vezes (2). G: diretório sem escrita (3). Fixtures sintéticas; o nome `test/estado-plano-orfas.test.ts` é real. | comarka `9ee36a9:scripts/orquestrador/test-instavel-recorrente.sh` |
| 2a | Caminho do FAIL no kit, passo 1 | `gates.ts` roda os gates na ordem e **para no primeiro que reprova** (`rodarGates`). O `gates.txt` guarda o placar mais um **recorte de no máximo 40 linhas** do gate que falhou (`recorteDeFalha`), nunca a saída inteira. | gates.ts:371-399, :417-426, :515-518; executor.sh:1221 |
| 2b | Passo 2: vizinho (7a) | Exige `ENF_OK=1`, `gates_rc!=0`, `VIZ_AMPLIADA` vazio, gates não interrompidos e `so_testes_reprovaram`. Daí `decisao vizinhos` (`decidirVizinhos`): **um FAIL que não seja vizinho cancela tudo**. | executor.sh:1245-1275; decisao.ts:821-845 |
| 2c | Passo 3: base vermelha (7b) | Mesmas condições, mais `CRITERIOS_FALHOS` vazio e nenhuma decisão de vizinho. `arquivosBaseVermelha`: todo FAIL fora do diff e da allowlist (mais a ampliada) leva a `BASE_VERMELHA`, depois `BLOQUEADO base_vermelha`, sem juiz, sem retry e sem consumir tentativa. | executor.sh:1284-1302; decisao.ts:791-798; executor.sh:1646-1654 |
| 2d | Passo 4: o resto | Juiz pulado. `criteriosFalhos += "gates reprovados"` e `decisao desfecho`: **reprovado**, consome tentativa. O diagnóstico do retry leva o FAIL do instável como se fosse do ticket. | executor.sh:1309-1314, :1340-1342; decisao.ts:413 |
| 2e | Ramos em que um instável hoje bloqueia ou reprova | (i) Instável sozinho, critérios verdes: **BLOQUEADO base_vermelha** (2c). (ii) Instável com critério vermelho: **reprovado** e a tentativa é consumida (2d). (iii) Instável com vizinho legítimo: o vizinho é cancelado ("X falha e não é vizinho"); com critérios verdes vira **base_vermelha**, senão reprovado. (iv) Tentativa já ampliada (`VIZ_AMPLIADA`): sem 7a; instável sozinho dá base_vermelha, e instável com ampliado ainda vermelho dá reprovado. (v) `vizinho_na_base` roda o vizinho na base; se um instável cair ali, o resultado é "vermelho" e não amplia. (vi) Instável junto de teste próprio vermelho: reprovado (desfecho certo, mas o diagnóstico vem com ruído). | executor.sh:1245, :1284, :1060-1081 |
| 2f | Achado que muda o plano | Pelo fail-fast do 2a, **o gate depois do de testes não roda** quando a suíte fica vermelha (no Comarka a ordem é tsc, vitest, build). Tirar o instável da conta e marcar gates ok aprovaria **sem build**. O Comarka não tem esse problema porque `gate_vitest` e `gate_build` são separados no executor dele. | gates.ts:371-399; `comarka docs/fila/000-config.json` .gates |
| 3a | O que a 8e-P5 resolveu | O `ORQ_GATE=1` no spawn de todo gate faz o `describeHarness` pular os 19 testes de harness vendorizados. Isso cobre só o caso do dashboard de 24/10. | gates.ts:439; test/fixtures/orq-harness.ts:24; CONTRATO.md:2238-2244 |
| 3b | O que sobra | Instável de **produto**. Comarka, `runs/instaveis.log` (motor do Comarka, 19/10 a 28/10): **32 registros**, sendo 29 de `test/estado-plano-orfas.test.ts`, 2 de `test/sem-segredo-no-repo.test.ts` e 1 de `test/fetch-json-teto.test.ts`. O 5263 (24/10 16:03) teve dois instáveis no mesmo run. Cada registro é um run que o motor do kit bloquearia em base_vermelha ou reprovaria. | `comarka docs/fila/runs/instaveis.log` |
| 3c | Caso real mais próximo | **Comarka 1523 attempt-1, 28/10 13:50.** `gate-vitest.txt` de 398 KB, `FAIL test/estado-plano-orfas.test.ts > ... arquivo inexistente: 'sem leitura (' e rc 0, nunca zero`, `Test Files 1 failed \| 1418 passed (1419)`. O `isolado-1.txt` passou (6/6, 1,58 s). Nos repos com o motor do kit (`conteudos-infinitos`, `actus-saas`, `~/.orq/repos.json`), o `events.log` tem **0** `base_vermelha` e 0 `VIZINHO`: no kit o caso medido é só o do dashboard (já atacado). A fixture do kit `gates-510c-attempt-0.txt` (hook timeout de 10000 ms no 0283, fora do diff) tem a forma de instável, mas nunca foi rerodada isolada: não dá para afirmar que era instável. | `comarka docs/fila/runs/1523/attempt-1/{gate-vitest,isolado-1,instaveis}.txt`; test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt |
| 4a | Custo do isolamento | No 1523, a suíte levou 41,5 s e o isolado 1,58 s (cerca de 3 s de relógio: gate às 13:50:30, isolado às 13:50:33). Com o teto do Comarka de 3 arquivos, fica por volta de 10 s no pior caso. O Comarka não tem timeout no isolado, e o kit também não tem no `vizinho_na_base`. O único watchdog que existe é o do `claude_run`. | comarka `86dec07` lib.sh:+873; kit executor.sh:1060-1068; lib.sh:1512 |
| 4b | Ambiente | Deve rodar na **worktree do ticket** (`$wt`, `node_modules` já linkado), com `NO_COLOR=1 FORCE_COLOR=0 ORQ_GATE=1`, que é a paridade com `execBash`; sem `ORQ_GATE`, um arquivo de harness rodaria isolado num ambiente diferente do gate. Runner: o mesmo `VIZINHO_CMD_BASE` (`npx --no-install vitest run`), com a mesma limitação de monorepo já registrada no PECAS (item 8c "runner da conferência"). | gates.ts:435-440; executor.sh:1058, :1066 |
| 4c | Saída inteira | As guardas de Unhandled e de contagem precisam da saída **inteira** do vitest, e o kit só guarda o recorte de 40 linhas. O título `⎯ Unhandled Errors ⎯` não casa `PADRAO_FALHA` e só entra na cauda se houver menos de 40 linhas marcadas: a guarda ficaria aberta. Com 40 marcadas não há cauda e falta o `Test Files`, então a guarda de contagem fecha (não reroda), que é o lado seguro. | gates.ts:414-426 |
| 5 | Juiz | `montarPromptJuiz` diz "Os gates mecânicos JÁ PASSARAM" e anexa o `gates.txt` inteiro, que mostraria `FALHA testes`. Campos opcionais seguem a regra "ausente, sai byte a byte como antes". Os tetos de 200 linhas e 8 KB são do bloco de commits (`TETO_COMMITS_*`). O bloco de instáveis tem no máximo 3 arquivos (teto do isolamento), cerca de 6 linhas e menos de 1 KB, então não precisa de teto novo. Entra como campo `instaveis?: string[]` e um bloco logo antes de "SAÍDA DOS GATES MECÂNICOS", lido de `rundir/instaveis.txt` no jq do `run_juiz`. | juiz.ts:85-138, :158, :473-488, :605-655; executor.sh:855-865 |
| 6 | Guarda de Unhandled sem SIGPIPE | No Comarka: `grep -q 'Unhandled Error' <<<"$limpo"`. Com `printf \| grep -q`, sob pipefail, o grep fecha cedo, o printf de saída grande morre com 141 e o `if` lê "não achou": a guarda falhava aberta (caso G1b, 300 KB). O kit não tem nada parecido: `grep Unhandled` em lib.sh, executor.sh e decisao.ts dá vazio. O padrão do kit lê arquivo direto (`grep -qi 'reexecutar' "$rundir/gates.txt"`), sem pipe. Se a guarda morar em TS (decisao.ts), o problema não existe por construção. O caso de 300 KB vira teste mesmo assim. | comarka `86dec07` lib.sh:+896-900; kit lib.sh:15, executor.sh:23, :1223 |
| 7 | Registro no kit | `RUNS_BASE/instaveis.log` (= `<main>/<runs_dir>/instaveis.log`), TSV igual ao do Comarka (data, id, arquivo); fica fora da zona do agente, onde o motor já grava `runs/<id>/`. Mais um evento novo na trilha, `INSTAVEL arquivos=<...> attempt=<n>` (CONTRATO). Ação do 3º registro sem rascunho: **uma linha em `docs/fila/decisoes-pendentes.md` via `decisao_pendente`**, uma vez por arquivo, mais um evento `INSTAVEL_RECORRENTE arquivo=<f> registros=3`. Dado que pesa: no Comarka o rascunho saiu em 19/10 13:40 (o registro do 1382, com o `9ee36a9` já no ar) e o mesmo teste foi registrado mais **25 vezes** depois disso, até 28/10 14:01. O rascunho sozinho não mudou nada. | lib.sh:112, :399, :1222-1232; `comarka docs/fila/runs/instabilidade/instavel-test-estado-plano-orfas-test-ts.md` |
| 8 | Nome em docs/PECAS.md | Não existe L11 nem L6 a L10 definidos em PECAS (L6 só é citado no item 8d). A série L tem L5a (feita) e L5b (pendente). "L11" está livre, sem conflito. Precisa entrar: um item em FEITAS no fim, com sha, teste e evidência; os dois eventos novos no CONTRATO; as 5 linhas na tabela da migração (`docs/migracao-comarka.md:178-185`). | docs/PECAS.md:1106-1116; docs/migracao-comarka.md:178-185 |

### Escopo que o PASSO 0 mostra faltar (pedir antes de escrever)

1. **`scripts/orquestrador/gates.ts`**, por causa dos achados 2f e 4c. Precisa de duas coisas pequenas.
   (a) Gravar a saída inteira do gate que reprovou num arquivo (`--saida-falha <arq>`).
   (b) `--retomar-depois <gate>`: roda só os gates que vêm depois na ordem. Sem isso, um instável
   fora da conta aprova sem build.
2. **`scripts/orquestrador/decisao.ts` e `decisao-cli.ts`**. A classificação "sem relação com o diff"
   no kit é a régua da 8c: diff, allowlist, ampliada e vizinho C11 (`testesVizinhos`, árvore do
   base_ticket). O kit não tem `teste_cita` (grep vazio). Classificar em bash seria uma segunda
   régua, que pode divergir da 8c. Pela recomendação, `lib.sh` fica só com `roda_vitest_isolado` e
   `registra_instavel`.
3. **`scripts/kit/test-shell.sh`**: uma linha no `SCRIPTS` (`:81`). A lista é fechada; sem isso,
   `test-gate-instavel.sh` e `test-instavel-recorrente.sh` não rodam no fechamento.

### Plano das peças (revisado; tetos contam teste)

- **P1. Classificação pura** (decisao.ts `instaveisCandidatos` e o subcomando `decisao instaveis`).
  Entrada: a saída inteira, o diff, a allowlist com a ampliada e os vizinhos C11. Saída:
  `{rerodar[], resto[], motivo}`, com as guardas Unhandled, contagem e teto de 3. Vitest com
  fixture **copiada do 1523** (as linhas 3820-3856 do `gate-vitest.txt` real: o bloco FAIL e o
  resumo) e do 5263 (dois arquivos). Caso Unhandled seguido de 300 KB. Vermelho antes: a função não
  existe. **Teto 90.**
- **P2. gates.ts**: `--saida-falha` e `--retomar-depois`. Vitest sobre `rodarGates` e a CLI com a
  config do fixture (`typecheck`, `test`) mais um gate depois. Vermelho antes: a flag é ignorada e o
  gate seguinte não roda. **Teto 60.**
- **P3. executor.sh e lib.sh: isolamento no fluxo.** `roda_vitest_isolado` (worktree, ORQ_GATE=1,
  sem cor, `VIZINHO_CMD_BASE`) e `registra_instavel` (só o log). No executor, depois do gate e antes
  da 7a, com o gate de papel `testes` reprovado:
  - `decisao instaveis`, depois isolado por arquivo;
  - tudo instável: `gates.ts --retomar-depois` anexa ao `gates.txt` e `gates_rc` vem dele;
  - mistura: 7a e 7b recebem o `gatesTxt` sem os instáveis;
  - falhou isolado: o fluxo de hoje.

  Vale também quando há critério vermelho. `test-gate-instavel.sh` porta as seções A a G sobre o
  executor real (com um dublê do isolado). O vermelho antes é a fixture do 1523: hoje sai
  `BLOQUEADO base_vermelha`. **Teto 130** (o Comarka gastou 92 só no executor, sem a retomada de
  gates).
- **P4. Juiz.** `instaveis?: string[]` no `EntradaPrompt`, o bloco antes de "SAÍDA DOS GATES" e o arg
  no jq do `run_juiz`. Vitest: com o campo, o bloco aparece; sem ele, o prompt sai byte a byte
  igual. Vermelho antes: o prompt não tem o bloco. **Teto 40.**
- **P5. Recorrência.** No 3º registro do mesmo arquivo (igualdade exata), `decisao_pendente` uma vez
  e os eventos `INSTAVEL` e `INSTAVEL_RECORRENTE`. Nenhum rascunho. `test-instavel-recorrente.sh`
  porta A a E e G (F vira "3 registros pelo fluxo da P3"), mais a linha no `test-shell.sh`.
  **Teto 70.**
- **P6. Docs.** PECAS (L11 em FEITAS, mais pendências: timeout do isolado e runner de monorepo),
  CONTRATO (os dois eventos, `instaveis.log`, `rundir/instaveis.txt` e `isolado-<n>.txt`) e as 5
  linhas da migração. **Teto 40.**

Total cerca de 430 linhas. O Comarka gastou 441 com o Fix B e 141 no 9ee36a9.

### Perguntas que só o Lucas responde

1. Libera `gates.ts` no escopo (P2)? Sem isso, a única saída segura é ligar o instável só quando o
   gate de testes for o último da ordem. Isso não cobre o Comarka (tsc, vitest, build) e anula a
   paridade da sombra.
2. A classificação fica em `decisao.ts`/`decisao-cli.ts` com a régua da 8c (recomendado), ou em
   `lib.sh` com um `teste_cita` portado do Comarka (duas réguas)?
3. Libera uma linha em `scripts/kit/test-shell.sh` para os dois testes novos?
4. Ação do 3º registro: `decisao_pendente` uma vez por arquivo, mais o evento (recomendado), ou só o
   evento? O rascunho fica fora, como recomendado.
5. Timeout no isolado: sem timeout, igual ao `vizinho_na_base` (recomendado, com pendência no
   PECAS), ou um watchdog no molde do `claude_run`, que custa cerca de 15 linhas?
6. Teto de 3 arquivos sem relação: o mesmo do Comarka (recomendado)?

Parado aqui, esperando o ok.

---

## EXECUÇÃO (depois do ok do Lucas, 28/10/2026)

Respostas do ok:
- `gates.ts` entra com as duas flags;
- a classificação fica em `decisao.ts`/`decisao-cli.ts`, com a régua da 8c;
- uma linha no `SCRIPTS` do `test-shell.sh`;
- no 3º registro, `decisao_pendente` mais `INSTAVEL_RECORRENTE`, sem rascunho;
- sem timeout;
- teto de 3.

Branch `kit/l11`, base `9420eb0`, 8 commits, **sem push e sem merge**. O CONTRATO do kit está na raiz (`CONTRATO.md`, não `docs/CONTRATO.md`); foi editado lá.

| Commit | Peça | Linhas (+/-, com teste, sem fixture) | Teto do plano |
|---|---|---|---|
| `a25c6fe` | P1 classificação (`decisao.ts`, `decisao-cli.ts`) | +174 (59 de código, 115 de teste) | 90: **estourou no teste** |
| `8abfbd6` | P2 `gates.ts --saida-falha --retomar-depois` | +113 -4 (23 de código) | 60: **estourou no teste** |
| `15d22c4` | P3 executor e lib.sh | +217 -5 (100 de código) | 130: **estourou** |
| `f4498a8` | P4 juiz | +58 -1 | 40: estourou por 18 |
| `a2a2713` | P5 recorrência | +108 -3 (12 de código) | 70: estourou no teste |
| `ac00a47` | P6 docs, mais a troca de travessão no texto novo de P1 a P5 | +86 -15 | 40: estourou (CONTRATO §24 com 44) |
| `38464ee` | complemento da P3: censo `ORQ_TSX` de 14 para 15 | +5 -4 | não previsto |
| `c6d9de4` | complemento da P3: linhas reais em heredoc no `test-gate-instavel.sh` | +101 -3 | não previsto |

Código de motor somado: cerca de 230 linhas. Os tetos estouraram pelo lado dos testes: todos são executáveis com caso real e o da P3 roda o executor de verdade. Não reescrevi histórico. Os dois complementos da P3 saíram como commits próprios, achados no fechamento (abaixo).

### Onde ficou (arquivo:linha no HEAD `c6d9de4`)

- `scripts/orquestrador/decisao.ts:900` `TETO_INSTAVEIS`, `:920` `instaveisCandidatos`
- `scripts/orquestrador/decisao-cli.ts:147` subcomando `instaveis` (vizinhos C11 da árvore do base_ticket)
- `scripts/orquestrador/gates.ts:377-385` `rodarGates(..., depoisDe)`; CLI `--retomar-depois` (rc 2 para gate fora da ordem) e `--saida-falha`
- `scripts/orquestrador/executor.sh:1260` `--saida-falha "$rundir/gate-falha.txt"`; `:1271-1300` seção 7 (retomada em `:1284`, mistura em `:1295`); `:1058` `decide_instaveis`; `:863` `instaveis` no jq do `run_juiz`; 7a e 7b leem `$GATES_DECIDE`
- `scripts/orquestrador/lib.sh:1636` `roda_vitest_isolado` (passou = rc 0 **e** `Test Files N passed`); `:1647` `registra_instavel`
- `scripts/orquestrador/juiz.ts:146` campo `instaveis`; `:193` `blocoInstaveis`
- `CONTRATO.md` §24 e os eventos `INSTAVEL` e `INSTAVEL_RECORRENTE` na tabela; `docs/PECAS.md`: L11 em FEITAS e duas pendentes (o isolado sem timeout; o `GATE` com `testes=falha`); `docs/migracao-comarka.md`: as linhas do dc90c8d, 906259f, 86dec07, bb59341 e 9ee36a9.

### Vermelho e verde por peça (saída crua, cortada nas linhas de resultado)

**P1** (`TZ=UTC node_modules/.bin/vitest run test/orquestrador-instaveis-l11.test.ts`), contra `9420eb0`:
```
   × L11-P1 · instaveisCandidatos: quem roda isolado > 1523: o FAIL fora do diff e da allowlist é candidato
   × ... > 5263: os dois FAIL sem relação são candidatos, na ordem da saída
   × ... > FAIL na allowlist (glob), no diff ou vizinho C11: conta, nunca reroda
   × ... > Unhandled Errors: nada reroda, mesmo com 300 KB depois do título
   × ... > 'Test Files N failed' que não bate com os FAIL lidos (ou some): nada reroda
   × ... > teto de undefined: 4 sem relação é base quebrada; 3 rerodam
   × ... > nenhum FAIL legível: nada reroda
   × L11-P1 · decisao-cli instaveis ... > teste que importa item de src/ da allowlist é vizinho (conta); o outro reroda
     → instaveisCandidatos is not a function
AssertionError: subcomando desconhecido: instaveis
      Tests  8 failed (8)
rc=1
```
Verde: `Tests  8 passed (8)`. Fixtures copiadas cruas (com ANSI) de `runs/1523/attempt-1/gate-vitest.txt:3818-3856` e `runs/5263/attempt-1/gate-vitest.txt:3530-3581` (`test/fixtures/instavel-l11/ORIGEM.md`).

**P2** (`vitest run test/orquestrador-gates-l11.test.ts`), contra `a25c6fe`:
```
   × L11-P2 · gates.ts --saida-falha e --retomar-depois > --saida-falha grava a saída inteira do gate que reprovou; o stdout não muda
   × L11-P2 · gates.ts --saida-falha e --retomar-depois > --retomar-depois vitest roda só o build; nome que não existe falha alto
AssertionError: expected 1 to be +0 // Object.is equality
      Tests  2 failed | 1 passed (3)
rc=1
```
O caso que passou no vermelho é o "sem flag: para no vitest, o build não roda": ele guarda que, sem as flags, a saída fica como antes. Verde: 3/3, mais `orquestrador-gates.test.ts` e `-fonte-unica` (40/40).

**P3** (`bash scripts/orquestrador/test-gate-instavel.sh`), com o executor.sh e o lib.sh de `8abfbd6` (a versão final do teste):
```
  FALHA status bloqueado: bloqueado: base_vermelha — gate testes falhou só em arquivo(s) fora do diff e da allowlist: test/estado-plano-orfas.test.ts; evidência: ...
  FALHA instaveis.txt:
  FALHA isolado-1.txt:
  FALHA instaveis.log ausente
  FALHA evento:
  FALHA o build não rodou
  FALHA gates.txt sem retomada
  FALHA juiz não chamado
  FALHA juiz.prompt.txt sem o bloco de instáveis
  ok    BLOQUEADO base_vermelha (test/estado-plano-orfas.test.ts)
  FALHA B: instaveis.txt=
  ok    sem retomada
  FALHA C: status bloqueado,  ... 901 BLOQUEADO motivo=base_vermelha arquivos=test/estado-plano-orfas.test.ts attempt=1
  ok    juiz não chamado
  FALHA D instaveis.txt:
  FALHA D: ... 901 BLOQUEADO motivo=base_vermelha arquivos=test/estado-plano-orfas.test.ts,test/sem-segredo-no-repo.test.ts attempt=1
  ok    sem isolado
  ok    BLOQUEADO base_vermelha
  FALHA F: isolado-1.txt:
  ok    nada em instaveis.txt, BLOQUEADO base_vermelha
14 CHECK(S) FALHARAM
rc=1
```
É o vermelho pedido: o 1523 sai **BLOQUEADO base_vermelha** no motor anterior. Verde: casos A a F, `TODOS OS CHECKS PASSARAM`. No caso A o fluxo inteiro passa por:
- vitest isolado real;
- `isolado-1.txt`;
- `instaveis.log`;
- evento `INSTAVEL arquivos=test/estado-plano-orfas.test.ts gate=test resto=`;
- build na retomada;
- juiz chamado e `aguardando_merge`.

Guarda nova, que o Comarka não tem: rc 0 sem nenhum teste rodado (`passWithNoTests`) não conta como instável. Sem ela, o caso F falha:
```
== F · rc 0 sem teste rodado (passWithNoTests) não é instável ==
  ok    rerodou: o vitest não achou o arquivo e saiu 0
  FALHA F: instaveis.txt=test/estado-plano-orfas.test.ts,
1 CHECK(S) FALHARAM
```
Efeito colateral esperado: o contra-teste do 8c (`orquestrador-vizinhos-8c-executor.test.ts`, "outro-alheio") passou a declarar o arquivo instável. Ele usa um runner dublê sempre verde no `VIZINHO_CMD_BASE`, que agora é também o runner do isolado. O teste foi ajustado para o arquivo falhar isolado (`'vermelho'`), que é o que ele quer provar, e passou a cobrar o `isolado-1.txt`.

**P4** (`vitest run test/orquestrador-juiz-instaveis-l11.test.ts` mais o caso A), contra `15d22c4`:
```
   × L11-P4 · bloco de instáveis no prompt do juiz > com instáveis: o bloco lista os arquivos, logo antes da saída dos gates
      Tests  1 failed | 1 passed (2)
rc=1
  FALHA juiz.prompt.txt sem o bloco de instáveis
1 CHECK(S) FALHARAM
rc=1
```
Verde: 2/2 e o caso A. As suítes do juiz (8 arquivos, 75 testes) seguem verdes; sem o campo, o prompt sai byte a byte igual.

**P5** (`bash scripts/orquestrador/test-instavel-recorrente.sh`), contra `f4498a8`:
```
  FALHA B: 0 linhas — | data | origem | alvo | pergunta | visto |
  FALHA B linha:
  FALHA B evento:
  FALHA C: log=4 linhas=0 eventos=0
4 CHECK(S) FALHARAM
rc=1
```
Verde: casos A a G. A linha real gerada:
`| 2026-10-28 | executor-instavel | test/estado-plano-orfas.test.ts | INSTÁVEL RECORRENTE: test/estado-plano-orfas.test.ts falhou na suíte sem relação com o diff e passou isolado 3 vezes; estabilizar o teste? | registros: 151 (2026-10-28 16:55); 152 (...); 153 (...) (runs/instaveis.log) |`

**P6**: só doc e a troca de travessão; sem teste próprio (o fechamento cobre).

### Achados do fechamento (consertados, cada um em commit próprio)

1. **Censo de `ORQ_TSX`.** O `orquestrador-toolchain-tsx.test.ts` conta as chamadas `"${ORQ_TSX[@]}"` e acusou 15 contra 14: a retomada da P3 é uma chamada nova. Ajustado para 15 (16 com o `orq config`), mesmo ajuste do porte do Actus (`c404986`). Commit `38464ee`.
2. **Fixtures fora do alcance do test-shell.** No laço do `test-shell.sh`, o `test-gate-instavel.sh` roda num fixture que não leva `test/fixtures/`, e o gate virava `gate_crash` (rc 1). As linhas reais do 1523 e do 5263 foram embutidas em heredoc, sem cor, que é como o gate do kit grava (`NO_COLOR=1`); a cor segue coberta na P1. Vermelho refeito contra `8abfbd6`. Commit `c6d9de4`.

### Fechamento (HEAD `c6d9de4`, saída crua)

```
$ npx tsc --noEmit
rc=0

$ TZ=UTC node_modules/.bin/vitest run
 Test Files  119 passed (119)
      Tests  1870 passed (1870)
   Duration  67.19s (transform 1.34s, setup 0ms, collect 21.80s, tests 529.16s, environment 16ms, prepare 5.38s)
rc=0

$ bash scripts/kit/test-shell.sh
== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
  rc=0  test-drenagem-sem-progresso.sh
  rc=0  test-sem-progresso-limite.sh
  rc=0  test-ocioso.sh
  rc=0  test-rc-executor.sh
  rc=0  test-ambiente.sh
  rc=0  test-causa-adiamento.sh
  rc=0  test-ambiente-adiado.sh
  rc=0  test-adiamentos-limite.sh
  rc=0  test-reprovado-sub.sh
  rc=0  test-notificacao-ambiente.sh
  rc=0  test-reabertura-humana.sh
  rc=0  test-painel-visao.sh
  rc=0  test-painel-detalhe.sh
  rc=0  test-painel-pausa.sh
  rc=0  test-painel-alarmes.sh
  rc=0  test-painel-lento.sh
  rc=0  test-gate-prevoo.sh
  rc=0  test-tentativas-persistidas.sh
  rc=0  test-orq-pause.sh
  rc=0  test-preflight.sh
  rc=0  test-diff-lines.sh
  rc=0  test-sem-cor.sh
  rc=0  test-criterio-isolado.sh
  rc=0  test-gate-instavel.sh
  rc=0  test-instavel-recorrente.sh
  rc=0  test-fixture-gates.sh (kit)
TODOS OS SCRIPTS SAÍRAM rc 0
rc=0

$ bash scripts/kit/test-instalar.sh
  ...
  ok    nenhum cita test/fixtures, ORQ_KIT ou caminho que sobe para fora de scripts/orquestrador
  ok    a trava reprova a linha que quebrou no CI

== (c) ORQ_CI_CHECKOUT não setado (SÓ LEITURA — o resultado é achado, não gate) ==
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
rc=0
```

### O que fica para o merge humano e para a sombra

- O comportamento novo só vale nos repos instalados depois do merge e do `instalar.sh --atualizar`. No Comarka, a paridade da sombra agora pode ser medida contra o `runs/instaveis.log` dele, que tem 32 registros de 19/10 a 28/10.
- O evento `GATE` segue com `testes=falha` quando o gate sai da conta por instável (pendência no PECAS). O painel e o triador não sabem do instável.
- O isolado não tem timeout (decisão; pendência no PECAS).
- O `~/.orq/` e o Comarka foram só lidos, com git sob `GIT_OPTIONAL_LOCKS=0`. **Desvio da regra:** no PASSO 0 usei `git merge-base --is-ancestor` (leitura pura, sem escrita) para conferir se os shas estão na main. Ele não está na lista permitida (log, show, cat-file, ls-tree, diff, rev-parse); o resto foi `log` e `show`. Nenhum `claude -p`, nenhum push, nenhum `--no-verify`.

Parado aqui.
