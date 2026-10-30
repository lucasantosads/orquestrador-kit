# Relatório · kit etapa 7f-b2 · resolvedor de bloqueios rodando sozinho

Sessão de 10/10/2026, worktree `~/Projetos/_worktrees/kit-etapa7f2`, branch `kit/etapa7f2`, a partir de
`3c59d30` (main). Nove commits, um por peça (`7f-b2-1` a `7f-b2-9`). **Sem push, sem merge, sem rebase**
(dois `--amend` locais, nos commits 5 e 9, antes de qualquer publicação: ver "Desvios"). Nenhuma escrita em
repo real, nenhum `launchctl` de verdade, nenhuma chamada de modelo (os testes rodam com `--sem-modelo`; o
`claude` do triador sob vitest é recusado). `node_modules` (symlink humano) nunca entrou em `git add`.

## Resultado

| | |
|---|---|
| Gabarito | **840 igual ao commit humano** (byte a byte, menos a `descricao` da guarda, texto livre que cita o arquivo e os números 13 e 35); **940 e 932: as mesmas duas linhas do humano** (`status` → `pendente`, nota vazia); **929: só a proposta**, com o cmd do humano letra por letra, ticket e git intocados |
| typecheck | rc=0 |
| `TZ=UTC vitest` | rc=0 · 80 arquivos, 1498 testes (base: 72 e 1443; +8 arquivos e +55 testes do resolvedor) |
| `test-shell.sh` | rc=0 (26 scripts, todos rc=0) |
| `test-drenagem.sh` | rc=0, no fixture (24 `ok`, `TODOS OS CHECKS PASSARAM`) |

Comandos para o humano:
- `~/orq-sessoes/7f-b2-primeira-passada.cmd` — a primeira passada real no comarka-operacional em `--dry-run`;
- `~/orq-sessoes/7f-b2-instalar-job.cmd` — a instalação do job `com.orq.resolvedor`.

## PASSO 0 (leitura)

**1. Triador** (`scripts/orquestrador/triador/`, inteiro), CONTRATO §13 e a spec 7f-a.
- `triar.ts:133` `triarTicket`: assinatura → (mesma: não roda, `:145`) → trava → extração → modelo só para palpite → grava; devolve `feito` e `diagnostico`. `triar.ts:183` `bloqueados(raiz)` lê o 1º bloco json de `docs/fila/<id>-*.md` com `status: "bloqueado"`. `triar.ts:223` `resolverRepo` (nome do repos.json ou caminho).
- `triar.ts:28-51` o formato do `Diagnostico` (classe, regra, firme, fonte, remédio, `extracao.fora_da_allowlist_e_do_diff`, `extracao.criterios_falhos`, `assinatura`, `bloqueio.quando`).
- `extrair.ts:184` D1 (R5 árvore suja, `requeue sim_apos:arvore_alvo_limpa`), `:207` D4 (máquina), `:214` D5 (base), `:233-243` D6 (R1 firme só com o vermelho fora em ≥ 2 tentativas; remédio `pôr <teste> na allowlist com guarda`, `:240`), `:264` D12 (`R2?`).
- `saida.ts:79` `Guarda` (lança se escreve fora da raiz ou dentro de repo do repos.json); `saida.ts:39` `lerRepos` (o mesmo `ler_repos` do painel); `saida.ts:146` assinatura; `saida.ts:160` trava O_EXCL.
- `git.ts:24` `gitLeitura`: só `show`/`log`/`rev-parse`/`ls-tree`/`status --porcelain`, com `GIT_OPTIONAL_LOCKS=0`.
- `modelo.ts:63` `lerConfigModelo`, `:414` `criarPassoModelo` (teto do dia contra `custo.json`; o resolvedor passa `teto_dia_usd` 5).
- `leitor-legado-comarka.ts:554` `lerRepoLegado`: a série é por mtime (≤ fim + 180 s) — por isso o auxiliar de teste preserva o mtime do `head.txt` reescrito (peça 2).
- `CONTRATO.md:1006-1190` §13 (triador): "não decide, não reabre, não muda status" (`:1019`); o resolvedor é a primeira peça que age.
- `~/orq-sessoes/spec-7f-triador.md:327-329` (remédio e requeue de R5 árvore e máquina), `:346` regra 2 (o triador nunca reabre: o resolvedor é outra peça), `:417` (auto-requeue fora da 7f; esta etapa é a decisão que o trouxe).

**2. Sessões do Comarka.**
- `~/orq-sessoes/primeiros-diagnosticos-comarka.md`: 840 R1 firme D6 (evidência `runs/840/attempt-1/gate-vitest.txt:1995`, `:2009`; `attempt-2/…:1990`, `:2004`), 929 `R2?` D12 (`runs/929/attempt-2/criterios.txt:97`, `a: unbound variable` em `executor.sh:231`, `set -euo pipefail` em `executor.sh:21`).
- `~/orq-sessoes/conserto-840-929.md`: o 840 ganhou o teste na allowlist, o mesmo caminho no critério "so arquivos da allowlist foram tocados" e a guarda de piso (13 it/test, 35 expect, 0 skip) com `|| true` e `${x:-…}`; o 929 ganhou `|| true` e `${v:-x}` no `criterio[12]`. O `bloqueado` era writeback não commitado (no HEAD já `pendente`).

**3. comarka-operacional** (só leitura, `GIT_OPTIONAL_LOCKS=0`, nenhum script rodou).
- `git show 7787af3`: `docs/fila/840-sai-resolver-chave-api-e.md` +11/−2 (allowlist `:37`, critério da lista `:143`, guarda nova `:181-186` depois da última `tipo: guarda` e antes do avaliador); `docs/fila/929-nichos-teses-aba.md` `:142` (só o cmd do `criterio[12]`).
- `git show 819c49a`: 940 `:223-224` e 932 `:185-186`, `bloqueado` → `done` com a nota de aprovação do juiz. **O humano reabriu; o `done` é o loop rodando depois**: `dd94c08` (merge 940, 14:50), `4d52ef7` (merge 932, 17:17), commit humano às 18:10. O gabarito exige o reabrir nas MESMAS duas linhas.
- Formato do ticket: 1º bloco ```json com `status` e `notas_status` no fim (840 `:193-194`, 929 `:234-235`); reabrir = `"status": "pendente"`, `"notas_status": ""`.
- Hook `.githooks/pre-commit` (`core.hooksPath`): roda `scripts/validar-fila.py` nos tickets do índice; "bypass consciente: --no-verify" — o resolvedor nunca usa.
- Executor: `executor.sh:231` `out="$( ( cd "$wt" && export NO_COLOR=1 FORCE_COLOR=0 && …; eval "$cmd"; } ) 2>&1 || true )"`; `lib.sh:630` `criterio_match` (número puro é igualdade; senão igual ou ERE). A prova do R2 imita os dois.
- Bloqueios no log: 840 `local-loop.log:86356`, 929 `:85996`; heads `1208ce4` (840 T2) e `95e68e2` (929 T2).

**4. `~/.orq/repos.json`** existe: 3 itens só com `caminho` (conteudos-infinitos, actus-saas, comarka-operacional); nenhum com `resolvedor` (todos ficam em `diagnostico` até o humano escrever o campo). O painel lê por `orq-painel.py:117` `ler_repos` (`caminho` e `nome`, ignora o resto do item): o campo novo não o afeta. O triador lê pela mesma regra (`saida.ts:39`).

## Peças: vermelho e verde

Vermelho de cada peça rodado contra o código da peça anterior (o módulo novo tirado do lugar e os
arquivos alterados voltados ao HEAD, depois restaurados), com a saída crua guardada.

### Peça 1 · Gabarito (fixture e teste) (`test/orquestrador-resolvedor-gabarito.test.ts`)

Vermelho (`TZ=UTC npx vitest run test/orquestrador-resolvedor-gabarito.test.ts` contra a peça anterior):

```
   × gabarito 7f-b2: 840, 929, 940, 932 > o módulo do resolvedor existe e exporta passada() 2ms
   × gabarito 7f-b2: 840, 929, 940, 932 > 840 (R1): o arquivo do commit humano, só a descricao da guarda é livre 0ms
   × gabarito 7f-b2: 840, 929, 940, 932 > 940 (R5 árvore suja): o reabrir humano, nas mesmas duas linhas 1ms
   × gabarito 7f-b2: 840, 929, 940, 932 > 932 (R5 árvore suja): o reabrir humano, nas mesmas duas linhas 0ms
   × gabarito 7f-b2: 840, 929, 940, 932 > 840: um commit só do arquivo do ticket, com o trailer R1 D6 10ms
   × gabarito 7f-b2: 840, 929, 940, 932 > 940: um commit só do arquivo do ticket, com o trailer R5 D1 9ms
   × gabarito 7f-b2: 840, 929, 940, 932 > 932: um commit só do arquivo do ticket, com o trailer R5 D1 9ms
   × gabarito 7f-b2: 840, 929, 940, 932 > 929 (R2): só a proposta, com o cmd do humano; o ticket e o git intocados 9ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: scripts/orquestrador/resolvedor/passada.ts não existe ou não exporta passada: expected null not to be null
AssertionError: a guarda do teste novo na allowlist não entrou: expected undefined to be defined
AssertionError: expected [] to deeply equal [ 222, 223 ]
AssertionError: expected [] to deeply equal [ 184, 185 ]
AssertionError: expected '.gitignore\ndocs/fila/000-config.json…' to be 'docs/fila/840-sai-resolver-chave-api-…' // Object.is equality
AssertionError: expected '.gitignore\ndocs/fila/000-config.json…' to be 'docs/fila/940-nicho-tese-agregado-lib…' // Object.is equality
AssertionError: expected '.gitignore\ndocs/fila/000-config.json…' to be 'docs/fila/932-ranking-foto-mensal-ddl…' // Object.is equality
AssertionError: sem /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/resolvedor-HsYTRv/orq/resolvedor/comarka-929/929/proposta.md: expected false to be true // Object.is equality
      Tests  8 failed (8)
rc=1
```

### Peça 2 · orq resolver: passada, ordem, decisão, --dry-run (`test/orquestrador-resolvedor-passada.test.ts`)

Vermelho (`TZ=UTC npx vitest run test/orquestrador-resolvedor-passada.test.ts` contra a peça anterior):

```
   × peça 2: a passada > o módulo existe 2ms
   × peça 2: a passada > decide pela classe e pelo modo 0ms
   × peça 2: a passada > ordena os bloqueados pelo número de tickets que esperam por eles, e tria cada um 1ms
   × peça 2: a passada > --dry-run: o repo intocado, sem ledger, e o que faria em dry-run.jsonl 241ms
   × peça 2: a passada > orq resolver --repo X --dry-run pela linha de comando 139ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: resolvedor/decidir.ts e passada.ts com decidir, ordenarBloqueados e passada: expected null not to be null
TypeError: Cannot read properties of null (reading 'decidir')
TypeError: Cannot read properties of null (reading 'ordenarBloqueados')
TypeError: Cannot read properties of null (reading 'passada')
AssertionError: expected 'jq: error: Could not open file /Users…' to be '' // Object.is equality
      Tests  5 failed (5)
rc=1
```

### Peça 3 · Ações R1 e R5 com as travas (`test/orquestrador-resolvedor-acoes.test.ts`)

Vermelho (`TZ=UTC npx vitest run test/orquestrador-resolvedor-acoes.test.ts` contra a peça anterior):

```
   × peça 3: ações R1 e R5 com as travas > o módulo existe, com a porta de escrita no repo 5ms
   × peça 3: ações R1 e R5 com as travas > segunda passada no mesmo ticket não age de novo; bloqueado outra vez vai para humano 143ms
   × peça 3: ações R1 e R5 com as travas > com git rodando ele espera, e age quando o git sai 131ms
   × peça 3: ações R1 e R5 com as travas > com git rodando além do teto ele desiste sem escrever (processo e index.lock) 133ms
   × peça 3: ações R1 e R5 com as travas > com o interruptor ele não faz nada: nem triagem, nem ledger, nem o repo 147ms
   × peça 3: ações R1 e R5 com as travas > o commit tem só o arquivo do ticket e o trailer; o resto do índice fica 252ms
   × peça 3: ações R1 e R5 com as travas > o hook do repo roda (nunca --no-verify) e, se recusa, o arquivo volta 130ms
   × peça 3: ações R1 e R5 com as travas > nenhuma escrita fora de docs/fila do ticket bloqueado 246ms
   × peça 3: ações R1 e R5 com as travas > R5 árvore suja: não reabre com a worktree alvo suja; reabre quando limpa 130ms
   × peça 3: ações R1 e R5 com as travas > R5 máquina (801, D4): só reabre com a máquina livre 216ms
   × peça 3: ações R1 e R5 com as travas > R1 com .skip no teste do branch alvo: não age 277ms
   × peça 3: ações R1 e R5 com as travas > R1 em sombra: só a proposta com o diff, o repo intocado 243ms
⎯⎯⎯⎯⎯⎯ Failed Tests 12 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: resolvedor/repo.ts com confereTicket: expected undefined to be type of 'function'
AssertionError: expected [ { repo: 'cmk', id: '940', …(8) } ] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected 17 to be greater than or equal to 900
AssertionError: expected [ { repo: 'cmk', id: '940', …(8) } ] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected false to be true // Object.is equality
AssertionError: expected [ { repo: 'cmk', id: '840', …(8) } ] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [ { repo: 'cmk', id: '932', …(8) } ] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [] to deeply equal [ Array(1) ]
AssertionError: expected [ { repo: 'cmk', id: '940', …(8) } ] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [ { repo: 'cmk', id: '801', …(8) } ] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [ { repo: 'cmk', id: '840', …(8) } ] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [ { repo: 'cmk', id: '840', …(8) } ] to deeply equal [ ObjectContaining{…} ]
      Tests  12 failed (12)
rc=1
```

### Peça 4 · R2 em sombra (`test/orquestrador-resolvedor-r2.test.ts`)

Vermelho (`TZ=UTC npx vitest run test/orquestrador-resolvedor-r2.test.ts` contra a peça anterior):

```
   × peça 4: R2 em sombra > o conserto do unbound variable é o cmd do humano, letra por letra 3ms
   × peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"R2":"sombra"}) 269ms
   × peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"padrao":"auto"}) 266ms
   × peça 4: R2 em sombra > a mesma assinatura não refaz a proposta 252ms
   × peça 4: R2 em sombra > não propõe o que aprovaria o estado não feito, nem cmd que roda o repo 255ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: resolvedor/r2.ts com consertarUnbound: expected undefined to be type of 'function'
AssertionError: expected [ { repo: 'cmk1', id: '929', …(8) } ] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [ { repo: 'cmk2', id: '929', …(8) } ] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [ { repo: 'cmk3', id: '929', …(8) } ] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [ { repo: 'cmk4', id: '929', …(8) } ] to deeply equal [ ObjectContaining{…} ]
      Tests  5 failed (5)
rc=1
```

### Peça 5 · Ledger de desfecho (`test/orquestrador-resolvedor-ledger.test.ts`)

Vermelho (`TZ=UTC npx vitest run test/orquestrador-resolvedor-ledger.test.ts` contra a peça anterior):

```
   × peça 5: ledger de desfecho > a ação: classe, regra, o que mudou, commit e tempo até destravar 793ms
   × peça 5: ledger de desfecho > desfecho done, com o tempo, uma vez só 338ms
   × peça 5: ledger de desfecho > desfecho bloqueou de novo: ruim, e o segundo bloqueio vai para humano com o motivo 235ms
   × peça 5: ledger de desfecho > desfecho humano mexeu: o json fora dos campos do motor mudou 215ms
   × peça 5: ledger de desfecho > "não consegui" com o motivo, uma linha por assinatura e motivo 172ms
   × peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > espera enquanto o ticket está bloqueado com o cmd antigo; o cmd do humano igual ao proposto é acerto 363ms
   × peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > outro cmd com a mesma saída nos estados da prova é acerto (equivalente) 356ms
   × peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > cmd com saída diferente é erro; destravar sem trocar o cmd é erro 354ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected { ts: '2026-10-11T12:00:00Z', …(13) } to deeply equal ObjectContaining{…}
AssertionError: expected [] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [] to deeply equal [ ObjectContaining{…} ]
AssertionError: expected [] to deeply equal [ ObjectContaining{…} ]
      Tests  8 failed | 1 passed (9)
rc=1
```

### Peça 6 · Promoção e rebaixamento (`test/orquestrador-resolvedor-promocao.test.ts`)

Vermelho (`TZ=UTC npx vitest run test/orquestrador-resolvedor-promocao.test.ts` contra a peça anterior):

```
   × peça 6: promoção e rebaixamento > R2 sobe para auto com 9 acertos em 10, no ledger e no repos.json; o resto do repos.json fica 398ms
   ✓ peça 6: promoção e rebaixamento > R2 com 8 acertos em 10 não sobe 396ms
   ✓ peça 6: promoção e rebaixamento > R2 com 9 acertos em 9 não sobe 358ms
   × peça 6: promoção e rebaixamento > R5 em auto com 2 desfechos ruins seguidos volta para sombra, e a mesma passada já só propõe 535ms
   × peça 6: promoção e rebaixamento > os mesmos fatos não rebaixam de novo depois que o humano devolve para auto 214ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected { nome: 'cmk', …(3) } to deeply equal ObjectContaining{…}
AssertionError: expected 'auto' to be 'sombra' // Object.is equality
AssertionError: expected 'auto' to be 'sombra' // Object.is equality
      Tests  3 failed | 5 passed (8)
rc=1
```

### Peça 7 · orq desfazer (`test/orquestrador-resolvedor-desfazer.test.ts`)

Vermelho (`TZ=UTC npx vitest run test/orquestrador-resolvedor-desfazer.test.ts` contra a peça anterior):

```
   × peça 7: orq desfazer > desfaz a ação do 840: o ticket volta ao antes, num commit só dele, e o ledger marca 759ms
   × peça 7: orq desfazer > recusa sem ação no ledger 27ms
   × peça 7: orq desfazer > recusa se o arquivo mudou depois: mudança não commitada (o loop) ou commit 233ms
   × peça 7: orq desfazer > recusa se o commit não tem o trailer da ação 237ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected 'jq: error: Could not open file /Users…' to be '' // Object.is equality
AssertionError: expected 2 to be 1 // Object.is equality
AssertionError: expected 2 to be 1 // Object.is equality
AssertionError: expected 2 to be 1 // Object.is equality
      Tests  4 failed (4)
rc=1
```

### Peça 8 · Job do launchd (`test/orquestrador-resolvedor-job.test.ts`)

Vermelho (`TZ=UTC npx vitest run test/orquestrador-resolvedor-job.test.ts` contra a peça anterior):

```
   × peça 8: o job do launchd > --dry-run só imprime o plist 5ms
   × peça 8: o job do launchd > sem --dry-run, sob teste, recusa antes de escrever ou chamar launchctl 2ms
   × peça 8: o job do launchd > o job.sh respeita o interruptor: sai em 0 sem rodar a passada 4ms
   × peça 8: o job do launchd > o job.sh roda uma passada; com outra passada segurando a trava global, nada roda 2ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: bash: /Users/lucasantos/Projetos/_worktrees/kit-etapa7f2/scripts/orquestrador/resolvedor/instalar-job.sh: No such file or directory
AssertionError: expected 127 to be 1 // Object.is equality
AssertionError: expected 127 to be +0 // Object.is equality
AssertionError: bash: /Users/lucasantos/Projetos/_worktrees/kit-etapa7f2/scripts/orquestrador/resolvedor/job.sh: No such file or directory
      Tests  4 failed (4)
rc=1
```

Notas do vermelho:
- Peça 3: a primeira tentativa do vermelho falhou por `TypeError` (o teste exigia `repo.ts` para carregar
  tudo); o carregamento passou a exigir só `passada`, e o vermelho guardado acima é o refeito, 12 de 12 por
  asserção.
- Peça 4: idem, um `statSync` de `undefined`; a asserção do item vem antes agora. Vermelho refeito: 5 de 5
  por asserção.
- Peça 5: 8 de 9 por asserção; o nono ("o loop escrevendo status, nota e tentativas não é humano mexendo") é
  negativo e passa sem a peça.
- Peça 6: 3 de 8 por asserção; os 5 que passam são negativos ("não sobe", "não volta").

### Verde

Cada peça verde no próprio arquivo e, a partir da peça 3, a suíte do resolvedor inteira. Depois da peça 3
a única falha é a do 929 no gabarito (só a proposta R2, que é a peça 4); 840, 940 e 932 já estavam verdes:

```
--- depois da peça 2
 Test Files  1 passed (1)
      Tests  5 passed (5)
rc=0
--- depois da peça 3
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 24 passed (25)
rc=1
--- depois da peça 4
 Test Files  4 passed (4)
      Tests  30 passed (30)
rc=0
--- depois da peça 5
 Test Files  5 passed (5)
      Tests  39 passed (39)
rc=0
--- depois da peça 6
 Test Files  6 passed (6)
      Tests  47 passed (47)
rc=0
--- depois da peça 7
 Test Files  8 passed (8)
      Tests  93 passed (93)
rc=0
--- depois da peça 8 (fechamento, vitest inteiro)
 Test Files  80 passed (80)
      Tests  1498 passed (1498)
rc(vitest)=0
```

Gabarito, no fim (`test/orquestrador-resolvedor-gabarito.test.ts`, 8 de 8):

```
 ✓ test/orquestrador-resolvedor-gabarito.test.ts (8 tests) 1737ms
      Tests  8 passed (8)
```

A proposta que o resolvedor grava para o 929 (repo de teste; a tabela da prova reproduz o bloqueio real:
no head da tentativa o cmd antigo aborta com `a: unbound variable`, a mesma mensagem do motor em
`executor.sh: line 231`, e o novo aprova):

````markdown
# Proposta do resolvedor: cmk 929 (R2? D12, R2 só em sombra)

Gerada em 2026-10-11T02:04:43Z sobre o diagnóstico f270e2f4b5247f2ec90c921a3f128f91d3d0a60c1aa4892a9b4279c97a996e7f. **Nada foi escrito no repo**: R2 nunca aplica nesta etapa.

## criterio[12]: page.tsx continua sem seletor de periodo nem aria-label (o seletor mora na aba)

- arquivo: `docs/fila/929-nichos-teses-aba.md`
- espera (não muda): `PERIODO_NA_ABA`
- remédio do triador: consertar criterio[12] no .md: saída "/Users/lucasantos/Projetos/comarka-operacional/scripts/orquestrador/executor.sh:"

### cmd antigo

```
test -f src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && s=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/page.tsx) && a=$(grep -cE 'aria-label|ariaLabel=' src/app/dashboard/performance/page.tsx) && t=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx); [ "$s" = 0 ] && [ "$a" = 0 ] && [ "$t" = 1 ] && echo PERIODO_NA_ABA || echo ST_${s}_${a}_${t:-0}
```

### cmd novo

```
test -f src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && s=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/page.tsx || true) && a=$(grep -cE 'aria-label|ariaLabel=' src/app/dashboard/performance/page.tsx || true) && t=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx || true); [ "${s:-x}" = 0 ] && [ "${a:-x}" = 0 ] && [ "${t:-x}" = 1 ] && echo PERIODO_NA_ABA || echo ST_${s:-x}_${a:-x}_${t:-x}
```

## Prova

O harness do executor (`set -euo pipefail`; `out="$( ( cd <arvore> && eval "$cmd" ) 2>&1 || true )"`), numa pasta temporária com cópias dos arquivos que o cmd cita.

- não feito: os arquivos no branch alvo (staging-auto): src/app/dashboard/performance/page.tsx
- head: os arquivos no head da última tentativa (5c43e623dcb1d3faaa0b0dab0113914e069b59b9): src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx, src/app/dashboard/performance/page.tsx

| estado | cmd | sob set -u | critério | saída |
|---|---|---|---|---|
| nao_feito | novo | roda | reprova | `ST_x_x_x` |
| nao_feito | antigo | aborta | reprova | `prova: line 2: s: unbound variable` |
| head | novo | roda | APROVA | `PERIODO_NA_ABA` |
| head | antigo | aborta | reprova | `prova: line 2: a: unbound variable` |

O cmd novo roda sem abortar e REPROVA o estado em que o trabalho não foi feito.

## Diff que o humano aplicaria

```diff
--- a/docs/fila/929-nichos-teses-aba.md
+++ b/docs/fila/929-nichos-teses-aba.md
@@ -141,3 +141,3 @@
       "descricao": "page.tsx continua sem seletor de periodo nem aria-label (o seletor mora na aba)",
+      "cmd": "test -f src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && s=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/page.tsx || true) && a=$(grep -cE 'aria-label|ariaLabel=' src/app/dashboard/performance/page.tsx || true) && t=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx || true); [ \"${s:-x}\" = 0 ] && [ \"${a:-x}\" = 0 ] && [ \"${t:-x}\" = 1 ] && echo PERIODO_NA_ABA || echo ST_${s:-x}_${a:-x}_${t:-x}",
-      "cmd": "test -f src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && s=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/page.tsx) && a=$(grep -cE 'aria-label|ariaLabel=' src/app/dashboard/performance/page.tsx) && t=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx); [ \"$s\" = 0 ] && [ \"$a\" = 0 ] && [ \"$t\" = 1 ] && echo PERIODO_NA_ABA || echo ST_${s}_${a}_${t:-0}",
       "espera": "PERIODO_NA_ABA"
```

````

## Desvios e decisões da sessão

- **940/932 "iguais ao humano".** O `depois` de `819c49a` é `done` com a nota do juiz porque o loop rodou
  depois do reabrir humano (merges `dd94c08` e `4d52ef7` antes do commit às 18:10). O resolvedor não faz o
  merge: o gabarito exige o reabrir humano nas MESMAS duas linhas (`status` → `pendente`, nota vazia), e o
  teste confere isso e que o resto do json é idêntico.
- **840: a `descricao` da guarda** é a única linha livre (texto humano); o teste exige o arquivo e os
  números nela, e o resto do arquivo igual byte a byte, incluindo o cmd da guarda e a posição.
- **Dois `--amend` locais.** No 7f-b2-5 o commit saiu com dois testes das peças 2 e 3 vermelhos (o `&&`
  dependia só do tsc): ambos exigiam ledger ausente, e a peça 5 passou a gravar "não consegui" no ledger,
  como pedido. As asserções passaram a exigir: dry-run não muda o ledger; git rodando não gera `acao`. No
  7f-b2-9, a data da etapa (10/10/2026, a local, como as anteriores). Nada publicado; nenhum rebase.
- **O 801** (R5 máquina, D4) do `triador-7f` serve de caso de máquina (não há gabarito humano dele).
- **"Esperando por ele"** = dependência direta, de tickets fora de `done`/`obsoleto`.
- **Modelo:** a passada usa o triador com teto de US$ 5,00/dia no mesmo `custo.json`; `--dry-run` e
  `--sem-modelo` não chamam. Nos testes, sempre `--sem-modelo`.
- **Sombra para R1/R5** grava a proposta com o diff (não pedido explicitamente, mas é o que "sombra"
  significa no modo do repo). A comparação com o humano só existe para R2, como pedido.
- **`orq desfazer` não respeita o interruptor** (é o comando do humano); a ação desfeita continua sendo
  a única do ticket.
- **R2 promovido a auto** fica registrado (ledger e repos.json), mas continua só propondo nesta etapa.
- **Comarka intocado:** só `git show/log/rev-parse` com `GIT_OPTIONAL_LOCKS=0` e leitura de arquivos
  (`montar.py` pela classe `Comarka` do `triador-7f/montar.py`); nenhum script dele rodou; nenhum
  `index.lock` criado. O `~/.orq/repos.json` real não foi alterado (o campo `resolvedor` do Comarka é o
  humano quem escreve: está no `.cmd`).

## Fechamento (uma suíte de cada vez)

```
rc(typecheck)=0
rc(vitest)=0          TZ=UTC npx vitest run · 80 arquivos, 1498 testes
rc(test-shell)=0      bash scripts/kit/test-shell.sh · 26 scripts rc=0
rc(test-drenagem.sh)=0  no fixture (bash scripts/kit/fixture.sh), 24 ok, TODOS OS CHECKS PASSARAM
```

Saída do test-shell (placar):

```
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
  rc=0  test-fixture-gates.sh (kit)
```

## Os dois comandos

`~/orq-sessoes/7f-b2-primeira-passada.cmd`:

```bash
# Primeira passada REAL do resolvedor no comarka-operacional, em --dry-run (NÃO rodada pela sessão).
# Rodar só depois do merge da kit/etapa7f2 na main, do checkout principal do kit.
# Antes, no ~/.orq/repos.json, o item do comarka-operacional ganha o campo da decisão do chat do programa
# (sem ele o repo fica em "diagnostico" e o dry-run só mostra a triagem):
#   { "caminho": "/Users/lucasantos/Projetos/comarka-operacional",
#     "resolvedor": { "padrao": "diagnostico", "R1": "auto", "R5": "auto", "R2": "sombra" } }
# --dry-run: não escreve no Comarka, não chama modelo, não toca o ledger nem grava proposta; o que faria
# (com o diff) vai para ~/.orq/resolvedor/dry-run.jsonl e para a saída. A triagem grava diagnósticos em
# ~/.orq/diagnosticos, como o `orq triar`.
cd ~/Projetos/orquestrador-kit && bash scripts/orq resolver --repo comarka-operacional --dry-run > ~/orq-sessoes/7f-b2-primeira-passada.txt 2>&1; echo "rc=$?"
```

`~/orq-sessoes/7f-b2-instalar-job.cmd`:

```bash
# Instalação do job do resolvedor (com.orq.resolvedor, a cada 300 s) — o HUMANO roda (NÃO rodada pela sessão).
# Rodar só depois do merge da kit/etapa7f2 na main e de a primeira passada em --dry-run sair como esperado
# (7f-b2-primeira-passada.cmd). O plist aponta para o checkout principal do kit.
# Ver antes o que vai ser instalado:   cd ~/Projetos/orquestrador-kit && bash scripts/orquestrador/resolvedor/instalar-job.sh --dry-run
# Parar sem desinstalar:               touch ~/.orq/RESOLVEDOR_PAUSADO
# Desinstalar:                         launchctl bootout gui/$(id -u)/com.orq.resolvedor && rm -f ~/Library/LaunchAgents/com.orq.resolvedor.plist
cd ~/Projetos/orquestrador-kit && bash scripts/orquestrador/resolvedor/instalar-job.sh; echo "rc=$?"
```

## Diff cru de cada commit

Os dados da fixture (`test/fixtures/resolvedor-7f/{casos,arvores,gabarito}/`: cópias mascaradas dos
artefatos do Comarka, reproduzíveis por `montar.py`) vão só no `--stat`; o diff entre o antes e o depois
de cada ticket está no PASSO 0 e no gabarito. O resto é o diff inteiro.

### aeb5148 7f-b2-1: gabarito do resolvedor (840, 929, 940, 932 de 7787af3 e 819c49a), teste vermelho

```diff
commit aeb51485682076334cca6d1e8bd94dc7f3002842
Author: Lucas Santos
Date: Sat Oct 10 22:53:12 2026 -0300

7f-b2-1: gabarito do resolvedor (840, 929, 940, 932 de 7787af3 e 819c49a), teste vermelho

Fixture test/fixtures/resolvedor-7f/ montada por montar.py, só leitura do
comarka-operacional: antes e depois reais dos quatro tickets, a evidência do
bloqueio do 840 e do 929 no formato dos casos do triador, e a árvore que o
criterio[12] do 929 lê (staging-auto e head da tentativa). O teste exige, a
partir do antes, o arquivo humano no 840, o reabrir nas mesmas duas linhas no
940 e no 932 (um commit só do ticket, com trailer), e só a proposta no 929.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 test/fixtures/resolvedor-7f/arvores/929/alvo.json  |   7 +
 .../src/app/dashboard/performance/page.tsx.fonte   | 101 +++++++
 test/fixtures/resolvedor-7f/arvores/929/head.json  |   8 +
 .../nichos-teses/nichos-teses-aba.tsx.fonte        | 329 +++++++++++++++++++++
 .../src/app/dashboard/performance/page.tsx.fonte   | 107 +++++++
 .../01-840-L86356/attempt-1/claude-output.txt      |  23 ++
 .../casos/01-840-L86356/attempt-1/diff.stat        |   8 +
 .../casos/01-840-L86356/attempt-1/enforcement.json |   4 +
 .../casos/01-840-L86356/attempt-1/gate-tsc.txt     |   3 +
 .../attempt-1/gate-vitest.linhas.json              | 149 ++++++++++
 .../casos/01-840-L86356/attempt-1/gate-vitest.txt  | 186 ++++++++++++
 .../casos/01-840-L86356/attempt-1/head.txt         |   1 +
 .../casos/01-840-L86356/attempt-1/presenca.json    |  11 +
 .../01-840-L86356/attempt-2/claude-output.txt      |  18 ++
 .../casos/01-840-L86356/attempt-2/diff.stat        |   9 +
 .../casos/01-840-L86356/attempt-2/enforcement.json |   4 +
 .../casos/01-840-L86356/attempt-2/gate-tsc.txt     |   3 +
 .../attempt-2/gate-vitest.linhas.json              | 153 ++++++++++
 .../casos/01-840-L86356/attempt-2/gate-vitest.txt  | 191 ++++++++++++
 .../casos/01-840-L86356/attempt-2/head.txt         |   1 +
 .../casos/01-840-L86356/attempt-2/presenca.json    |  11 +
 .../resolvedor-7f/casos/01-840-L86356/caso.json    |  12 +
 .../resolvedor-7f/casos/01-840-L86356/config.json  |   6 +
 .../casos/01-840-L86356/esperado.json              |   6 +
 .../test/nps-reacao-resposta.test.ts.fonte         | 224 ++++++++++++++
 .../test/nps-reacao-resposta.test.ts.fonte         | 224 ++++++++++++++
 .../resolvedor-7f/casos/01-840-L86356/log.txt      |  44 +++
 .../resolvedor-7f/casos/01-840-L86356/meta.json    |  18 ++
 .../resolvedor-7f/casos/01-840-L86356/serie.json   |  10 +
 .../resolvedor-7f/casos/01-840-L86356/ticket.json  | 173 +++++++++++
 .../resolvedor-7f/casos/01-840-L86356/vizinhos.tsv |   3 +
 .../02-929-L85996/attempt-1/claude-output.txt      |  20 ++
 .../02-929-L85996/attempt-1/criterios.linhas.json  |  73 +++++
 .../casos/02-929-L85996/attempt-1/criterios.txt    |  25 ++
 .../casos/02-929-L85996/attempt-1/diff.stat        |   6 +
 .../casos/02-929-L85996/attempt-1/enforcement.json |   4 +
 .../casos/02-929-L85996/attempt-1/gate-tsc.txt     |   3 +
 .../attempt-1/gate-vitest.linhas.json              |   9 +
 .../casos/02-929-L85996/attempt-1/gate-vitest.txt  |   2 +
 .../casos/02-929-L85996/attempt-1/head.txt         |   1 +
 .../casos/02-929-L85996/attempt-1/presenca.json    |  12 +
 .../02-929-L85996/attempt-2/claude-output.txt      |  20 ++
 .../02-929-L85996/attempt-2/criterios.linhas.json  |  73 +++++
 .../casos/02-929-L85996/attempt-2/criterios.txt    |  25 ++
 .../casos/02-929-L85996/attempt-2/diff.stat        |   6 +
 .../casos/02-929-L85996/attempt-2/enforcement.json |   4 +
 .../casos/02-929-L85996/attempt-2/gate-tsc.txt     |   3 +
 .../attempt-2/gate-vitest.linhas.json              |   9 +
 .../casos/02-929-L85996/attempt-2/gate-vitest.txt  |   2 +
 .../casos/02-929-L85996/attempt-2/head.txt         |   1 +
 .../casos/02-929-L85996/attempt-2/presenca.json    |  12 +
 .../resolvedor-7f/casos/02-929-L85996/caso.json    |  12 +
 .../resolvedor-7f/casos/02-929-L85996/config.json  |   6 +
 .../casos/02-929-L85996/esperado.json              |   6 +
 .../resolvedor-7f/casos/02-929-L85996/log.txt      |  30 ++
 .../resolvedor-7f/casos/02-929-L85996/meta.json    |  18 ++
 .../resolvedor-7f/casos/02-929-L85996/serie.json   |  10 +
 .../resolvedor-7f/casos/02-929-L85996/ticket.json  | 219 ++++++++++++++
 .../resolvedor-7f/casos/02-929-L85996/vizinhos.tsv |   1 +
 test/fixtures/resolvedor-7f/gabarito/840/antes.md  | 189 ++++++++++++
 test/fixtures/resolvedor-7f/gabarito/840/depois.md | 196 ++++++++++++
 .../resolvedor-7f/gabarito/840/origem.json         |   8 +
 test/fixtures/resolvedor-7f/gabarito/929/antes.md  | 237 +++++++++++++++
 test/fixtures/resolvedor-7f/gabarito/929/depois.md | 237 +++++++++++++++
 .../resolvedor-7f/gabarito/929/origem.json         |   8 +
 test/fixtures/resolvedor-7f/gabarito/932/antes.md  | 199 +++++++++++++
 test/fixtures/resolvedor-7f/gabarito/932/depois.md | 199 +++++++++++++
 .../resolvedor-7f/gabarito/932/origem.json         |   8 +
 test/fixtures/resolvedor-7f/gabarito/940/antes.md  | 226 ++++++++++++++
 test/fixtures/resolvedor-7f/gabarito/940/depois.md | 226 ++++++++++++++
 .../resolvedor-7f/gabarito/940/origem.json         |   8 +
 test/fixtures/resolvedor-7f/montar.py              | 108 +++++++
 test/orquestrador-resolvedor-gabarito.test.ts      | 124 ++++++++
 test/resolvedor-repo.ts                            | 190 ++++++++++++
 74 files changed, 4822 insertions(+)
diff --git a/test/fixtures/resolvedor-7f/montar.py b/test/fixtures/resolvedor-7f/montar.py
new file mode 100644
index 0000000..573e405
--- /dev/null
+++ b/test/fixtures/resolvedor-7f/montar.py
@@ -0,0 +1,108 @@
+#!/usr/bin/env python3
+"""montar.py — monta o gabarito do resolvedor 7f-b2 a partir do comarka-operacional.
+
+SÓ LEITURA do comarka (git com GIT_OPTIONAL_LOCKS=0, só `show`, `log` e
+`rev-parse`, pelo `Comarka` de ../triador-7f/montar.py); nenhum script do comarka
+roda; nada é escrito fora de <saida> (padrão: o diretório deste arquivo).
+
+    python3 test/fixtures/resolvedor-7f/montar.py --comarka ~/Projetos/comarka-operacional
+
+O que sai (o primeiro caso real, feito à mão em 10/10, é o gabarito):
+
+  gabarito/<id>/antes.md    o ticket como o loop deixou: bloqueado, com a nota do motor
+  gabarito/<id>/depois.md   o ticket no commit humano
+  gabarito/<id>/origem.json de onde saiu cada um
+
+    840  R1  7787af3  teste na allowlist com guarda; cmd do critério da allowlist
+    929  R2  7787af3  cmd do criterio[12] trocado (o resolvedor só PROPÕE)
+    940  R5  819c49a  árvore suja: reaberto
+    932  R5  819c49a  árvore suja: reaberto
+
+  No 7787af3 o `antes` (o pai) já está `pendente`: o `bloqueado` era writeback do
+  loop ainda não commitado (~/orq-sessoes/conserto-840-929.md, "Status"). O antes
+  daqui é o pai com status e nota do bloqueio, a nota tirada do diagnóstico real
+  (~/.orq/diagnosticos/comarka-operacional/<id>.json, `bloqueio.nota_do_motor`).
+
+  casos/<nn>-<id>-L<linha>/ a evidência do bloqueio do 840 e do 929, no formato
+  dos casos de ../triador-7f (o `monta_caso` de lá); 940 e 932 já estão lá (36 e 37).
+
+  arvores/929/{alvo,head}/  os arquivos que o criterio[12] lê, na staging-auto da
+  hora do bloqueio (o estado em que o trabalho não foi feito) e no head da
+  tentativa 2 (sufixo `.fonte`: um .tsx aqui seria coletado pelo tsc do kit).
+"""
+import argparse, importlib.util, json, os, subprocess
+
+AQUI = os.path.dirname(os.path.abspath(__file__))
+_spec = importlib.util.spec_from_file_location("montar_triador", os.path.join(AQUI, "..", "triador-7f", "montar.py"))
+T = importlib.util.module_from_spec(_spec)
+_spec.loader.exec_module(T)
+
+GABARITO = [
+    # id, arquivo, commit humano, classe
+    ("840", "docs/fila/840-sai-resolver-chave-api-e.md", "7787af3", "R1"),
+    ("929", "docs/fila/929-nichos-teses-aba.md", "7787af3", "R2"),
+    ("940", "docs/fila/940-nicho-tese-agregado-lib.md", "819c49a", "R5"),
+    ("932", "docs/fila/932-ranking-foto-mensal-ddl.md", "819c49a", "R5"),
+]
+# os bloqueios de 10/10 no local-loop.log (`ticket <id>: BLOQUEADO`)
+CASOS = [("840", 86356, "R1"), ("929", 85996, "R2")]
+ARVORE_929 = {
+    "alvo": ("staging-auto", "2026-10-10T19:21:17Z", ["src/app/dashboard/performance/page.tsx"]),
+    "head": ("head.txt da última tentativa da série", None, ["src/app/dashboard/performance/page.tsx",
+                                                     "src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx"]),
+}
+
+
+def com_bloqueio(md, nota):
+    """O pai do commit humano com o writeback do bloqueio: status e nota."""
+    velho = '  "status": "pendente",\n  "notas_status": ""\n'
+    assert md.count(velho) == 1, "esperava status pendente e nota vazia no pai"
+    return md.replace(velho, '  "status": "bloqueado",\n  "notas_status": ' + json.dumps(nota, ensure_ascii=False) + "\n")
+
+
+def main():
+    ap = argparse.ArgumentParser()
+    ap.add_argument("--comarka", default=os.path.expanduser("~/Projetos/comarka-operacional"))
+    ap.add_argument("--diag", default=os.path.expanduser("~/.orq/diagnosticos/comarka-operacional"))
+    ap.add_argument("--saida", default=AQUI)
+    a = ap.parse_args()
+    cm = T.Comarka(os.path.abspath(a.comarka))
+    for d in ("gabarito", "casos", "arvores"):
+        subprocess.run(["rm", "-rf", os.path.join(a.saida, d)], check=True)
+
+    for tid, arq, sha, classe in GABARITO:
+        depois = cm.git("show", f"{sha}:{arq}")
+        pai = cm.git("show", f"{sha}^:{arq}")
+        assert depois is not None and pai is not None, (tid, sha)
+        origem = {"id": tid, "arquivo": arq, "classe": classe, "commit_humano": cm.git("rev-parse", sha).strip()}
+        if '"status": "bloqueado"' in pai:
+            antes = pai
+            origem["antes"] = f"{sha}^:{arq}"
+        else:
+            nota = json.load(open(os.path.join(a.diag, f"{tid}.json")))["bloqueio"]["nota_do_motor"]
+            antes = com_bloqueio(pai, nota)
+            origem["antes"] = f"{sha}^:{arq} com status bloqueado e a nota_do_motor do diagnóstico real"
+        origem["depois"] = f"{sha}:{arq}"
+        dst = os.path.join(a.saida, "gabarito", tid)
+        T.escreve(os.path.join(dst, "antes.md"), T.mascarar(antes))
+        T.escreve(os.path.join(dst, "depois.md"), T.mascarar(depois))
+        T.json_escreve(os.path.join(dst, "origem.json"), origem)
+
+    for nn, (tid, L, classe) in enumerate(CASOS, 1):
+        T.monta_caso(cm, os.path.join(a.saida, "casos"), nn, tid, L, classe, None, [])
+
+    for nome, (ref, antes_de, arqs) in ARVORE_929.items():
+        if ref.startswith("head.txt"):
+            serie = json.load(open(os.path.join(a.saida, "casos", "02-929-L85996", "serie.json")))
+            sha = open(os.path.join(cm.raiz, serie[-1]["dir"], "head.txt")).read().strip()
+        else:
+            sha = cm.git("log", "-1", "--format=%H", f"--before={antes_de}", ref).strip()
+        for f in arqs:
+            txt = cm.git("show", f"{sha}:{f}")
+            assert txt is not None, (nome, sha, f)
+            T.escreve(os.path.join(a.saida, "arvores", "929", nome, f + ".fonte"), T.mascarar(txt))
+        T.json_escreve(os.path.join(a.saida, "arvores", "929", f"{nome}.json"), {"ref": ref, "sha": sha, "arquivos": arqs})
+
+
+if __name__ == "__main__":
+    main()
diff --git a/test/orquestrador-resolvedor-gabarito.test.ts b/test/orquestrador-resolvedor-gabarito.test.ts
new file mode 100644
index 0000000..8a044ca
--- /dev/null
+++ b/test/orquestrador-resolvedor-gabarito.test.ts
@@ -0,0 +1,124 @@
+/**
+ * Etapa 7f-b2, peça 1 · o gabarito do resolvedor: os quatro consertos humanos
+ * de 10/10 no comarka-operacional (`7787af3` e `819c49a`).
+ *
+ * A partir do `antes` (o ticket como o loop deixou, bloqueado), uma passada do
+ * resolvedor tem de produzir:
+ *   - 840 (R1, firme D6): o mesmo arquivo do commit humano. O teste vai para a
+ *     allowlist, o critério que lista os arquivos permitidos ganha o mesmo
+ *     caminho, a guarda de contagem entra depois da última guarda com o MESMO
+ *     cmd (13 it/test, 35 expect, medidos na staging-auto), e o ticket reabre.
+ *     Só a `descricao` da guarda é texto livre: ela tem de citar o arquivo e os
+ *     números, e é a única linha que pode diferir;
+ *   - 940 e 932 (R5 árvore suja, firme D1, com a worktree alvo limpa): o
+ *     reabrir que o humano fez. O `depois` de 819c49a já é `done` porque o loop
+ *     rodou depois do reabrir (merge dd94c08 às 14:50 e 4d52ef7 às 17:17,
+ *     commit humano às 18:10): o resolvedor tem de mudar as MESMAS duas linhas
+ *     (status e nota) para `pendente` e nota vazia, e nada mais;
+ *   - 929 (R2, palpite D12): só uma proposta fora do repo, com o cmd que o
+ *     humano escreveu; o ticket fica byte a byte igual.
+ * Cada ação é um commit só do arquivo do ticket, com o trailer
+ * `Orq-Resolvedor: <classe> <regra> <assinatura>`.
+ */
+import { existsSync, readFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterAll, beforeAll, describe, expect, it } from 'vitest'
+import { ambiente, comEnv, git, jsonDo, linhasDiferentes, repoDoCaso, type RepoCaso } from './resolvedor-repo.js'
+
+const RESOLVEDOR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'resolvedor')
+
+interface Item {
+  id: string
+  classe: string | null
+  acao: string
+  feito: string
+  commit?: string
+  proposta?: string
+}
+type Passada = (o: { repo?: string; dryRun?: boolean; semModelo?: boolean; agora?: number }) => { itens: Item[] }
+
+async function carregar(): Promise<Passada | null> {
+  try {
+    const m = (await import(pathToFileURL(join(RESOLVEDOR, 'passada.ts')).href)) as { passada?: Passada }
+    return typeof m.passada === 'function' ? m.passada : null
+  } catch {
+    return null
+  }
+}
+
+const MODOS = { padrao: 'diagnostico', R1: 'auto', R5: 'auto', R2: 'sombra' }
+
+describe('gabarito 7f-b2: 840, 929, 940, 932', () => {
+  let passada: Passada | null
+  const repos: Record<string, RepoCaso> = {}
+  const itens: Record<string, Item[]> = {}
+  let amb: ReturnType<typeof ambiente>
+  let tira: () => void
+
+  beforeAll(async () => {
+    amb = ambiente()
+    tira = comEnv(amb.env)
+    for (const id of ['840', '929', '940', '932']) repos[id] = repoDoCaso(join(amb.base, id), id, { nome: 'comarka-operacional' })
+    amb.repos(Object.entries(repos).map(([id, r]) => ({ nome: `comarka-${id}`, caminho: r.raiz, resolvedor: MODOS })))
+    passada = await carregar()
+    if (!passada) return
+    for (const id of Object.keys(repos)) itens[id] = passada({ repo: `comarka-${id}`, semModelo: true, agora: Date.parse('2026-10-11T12:00:00Z') }).itens
+  }, 120_000)
+  afterAll(() => tira?.())
+
+  it('o módulo do resolvedor existe e exporta passada()', () => {
+    expect(passada, 'scripts/orquestrador/resolvedor/passada.ts não existe ou não exporta passada').not.toBeNull()
+  })
+
+  it('840 (R1): o arquivo do commit humano, só a descricao da guarda é livre', () => {
+    const r = repos['840']!
+    const agora = readFileSync(join(r.raiz, r.ticket), 'utf8')
+    const guarda = (md: string) => (jsonDo(md).criterios_aceite as { descricao: string; cmd: string }[]).find((c) => c.cmd.startsWith('f=test/nps-reacao-resposta.test.ts;'))
+    const g = guarda(agora)
+    expect(g, 'a guarda do teste novo na allowlist não entrou').toBeDefined()
+    expect(g!.descricao).toContain('test/nps-reacao-resposta.test.ts')
+    expect(g!.descricao).toMatch(/>= 13 it\(\/test\(/)
+    expect(g!.descricao).toMatch(/>= 35 expect\(/)
+    const semDescricao = (md: string) => md.replace(JSON.stringify(guarda(md)!.descricao), '"<descricao>"')
+    expect(semDescricao(agora)).toBe(semDescricao(r.depois))
+    expect(itens['840']?.find((i) => i.id === '840')?.feito).toBe('aplicado')
+  })
+
+  for (const id of ['940', '932']) {
+    it(`${id} (R5 árvore suja): o reabrir humano, nas mesmas duas linhas`, () => {
+      const r = repos[id]!
+      const agora = readFileSync(join(r.raiz, r.ticket), 'utf8')
+      expect(linhasDiferentes(r.antes, agora)).toEqual(linhasDiferentes(r.antes, r.depois))
+      const j = jsonDo(agora)
+      expect(j.status).toBe('pendente')
+      expect(j.notas_status).toBe('')
+      expect({ ...j, status: 'x', notas_status: 'x' }).toEqual({ ...jsonDo(r.antes), status: 'x', notas_status: 'x' })
+    })
+  }
+
+  for (const [id, classe, regra] of [
+    ['840', 'R1', 'D6'],
+    ['940', 'R5', 'D1'],
+    ['932', 'R5', 'D1'],
+  ] as const) {
+    it(`${id}: um commit só do arquivo do ticket, com o trailer ${classe} ${regra}`, () => {
+      const r = repos[id]!
+      expect(git(r.raiz, 'show', '--name-only', '--format=', 'HEAD').trim()).toBe(r.ticket)
+      expect(git(r.raiz, 'log', '-1', '--format=%B')).toMatch(new RegExp(`^Orq-Resolvedor: ${classe} ${regra} [0-9a-f]{64}$`, 'm'))
+      expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('2')
+      expect(git(r.raiz, 'status', '--porcelain', '--', r.ticket)).toBe('')
+    })
+  }
+
+  it('929 (R2): só a proposta, com o cmd do humano; o ticket e o git intocados', () => {
+    const r = repos['929']!
+    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+    expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
+    const p = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'comarka-929', '929', 'proposta.md')
+    expect(existsSync(p), `sem ${p}`).toBe(true)
+    const humano = (jsonDo(r.depois).criterios_aceite as { cmd: string }[])[12]!.cmd
+    expect(readFileSync(p, 'utf8')).toContain(humano)
+    expect(itens['929']?.find((i) => i.id === '929')?.feito).toBe('proposto')
+  })
+})
diff --git a/test/resolvedor-repo.ts b/test/resolvedor-repo.ts
new file mode 100644
index 0000000..d1c2424
--- /dev/null
+++ b/test/resolvedor-repo.ts
@@ -0,0 +1,190 @@
+/**
+ * resolvedor-repo.ts — auxiliar dos testes do resolvedor (não é teste): um
+ * `~/.orq` inteiro numa pasta temporária (só por variáveis de ambiente) e repos
+ * git do legado-comarka montados a partir do gabarito de
+ * `test/fixtures/resolvedor-7f/` (840, 929, 940, 932, os casos reais de 10/10).
+ *
+ * Cada repo é um `git init` com o ticket no formato real (o `antes.md` do
+ * gabarito), a evidência do bloqueio nos números de linha originais (o
+ * `materializar` do triador) e, quando o caso precisa, a `staging-auto` com o
+ * que o resolvedor lê nela.
+ */
+import { execFileSync } from 'node:child_process'
+import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { dirname, join } from 'node:path'
+import { materializar } from './triador-repo-legado.js'
+
+export const FX_RES = join(import.meta.dirname, 'fixtures', 'resolvedor-7f')
+export const FX_TRI = join(import.meta.dirname, 'fixtures', 'triador-7f')
+export const GIT_REAL = execFileSync('bash', ['-c', 'command -v git'], { encoding: 'utf8' }).trim()
+
+/** Onde está a evidência de cada caso do gabarito. */
+export const CASO: Record<string, string> = {
+  '840': join(FX_RES, 'casos', '01-840-L86356'),
+  '929': join(FX_RES, 'casos', '02-929-L85996'),
+  '940': join(FX_TRI, '36-940-L85222'),
+  '932': join(FX_TRI, '37-932-L85272'),
+}
+
+export interface Ambiente {
+  base: string
+  env: Record<string, string>
+  /** grava o repos.json do ambiente */
+  repos: (itens: unknown[]) => void
+}
+
+/**
+ * Um `~/.orq` temporário: repos.json, diagnósticos, resolvedor, interruptor e
+ * um `pgrep` falso (ninguém rodando git, a não ser que o teste crie
+ * `<base>/git-rodando`). Devolve as variáveis; quem chama as põe no ambiente.
+ */
+export function ambiente(): Ambiente {
+  const base = mkdtempSync(join(tmpdir(), 'resolvedor-'))
+  const orq = join(base, 'orq')
+  mkdirSync(join(orq, 'diagnosticos'), { recursive: true })
+  const pgrep = join(base, 'pgrep-falso.sh')
+  writeFileSync(pgrep, `#!/bin/bash\n[ -e "${base}/git-rodando" ] && { echo 4242; exit 0; }\nexit 1\n`)
+  chmodSync(pgrep, 0o755)
+  const env = {
+    ORQ_REPOS: join(orq, 'repos.json'),
+    ORQ_DIAG_DIR: join(orq, 'diagnosticos'),
+    ORQ_RESOLVEDOR_DIR: join(orq, 'resolvedor'),
+    ORQ_RESOLVEDOR_PAUSADO: join(orq, 'RESOLVEDOR_PAUSADO'),
+    ORQ_RESOLVEDOR_PGREP: pgrep,
+    ORQ_RESOLVEDOR_ESPERA_GIT_S: '2',
+    ORQ_TRIADOR_CONFIG: join(orq, 'triador.json'),
+  }
+  const repos = (itens: unknown[]) => writeFileSync(env.ORQ_REPOS, JSON.stringify({ $schema_versao: 1, repos: itens }, null, 2) + '\n')
+  repos([])
+  return { base, env, repos }
+}
+
+export const git = (raiz: string, ...a: string[]): string =>
+  execFileSync(GIT_REAL, ['-C', raiz, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
+
+function escreve(raiz: string, rel: string, txt: string | Buffer): void {
+  mkdirSync(dirname(join(raiz, rel)), { recursive: true })
+  writeFileSync(join(raiz, rel), txt)
+}
+
+/** Os arquivos de uma árvore `.fonte` (o sufixo sai), relativos à raiz dela. */
+function fontes(dir: string, rel = ''): [string, Buffer][] {
+  const out: [string, Buffer][] = []
+  for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
+    const r = rel ? `${rel}/${e.name}` : e.name
+    if (e.isDirectory()) out.push(...fontes(dir, r))
+    else out.push([r.replace(/\.fonte$/, ''), readFileSync(join(dir, r))])
+  }
+  return out
+}
+
+/** Um commit (numa branch órfã de nome dado) só com os arquivos dados; devolve o sha. */
+function commitDe(raiz: string, branch: string, arquivos: [string, Buffer][]): string {
+  git(raiz, 'checkout', '-q', '--orphan', branch)
+  git(raiz, 'rm', '-rq', '--cached', '--ignore-unmatch', '.')
+  for (const [rel, txt] of arquivos) escreve(raiz, rel, txt)
+  git(raiz, 'add', '--', ...arquivos.map(([r]) => r))
+  git(raiz, 'commit', '-q', '-m', branch)
+  const sha = git(raiz, 'rev-parse', 'HEAD').trim()
+  for (const [rel] of arquivos) git(raiz, 'rm', '-q', '--', rel)
+  return sha
+}
+
+export interface RepoCaso {
+  raiz: string
+  /** caminho do ticket, relativo à raiz */
+  ticket: string
+  antes: string
+  depois: string
+  /** a worktree alvo (`../_worktrees/staging-auto`) */
+  alvo: string
+}
+
+/**
+ * O repo de um caso do gabarito em `<base>/<nome>`:
+ *   - branches com o que cada `head.txt` da série aponta (os fontes dos
+ *     vermelhos no 840; a árvore da tentativa no 929) e a `staging-auto`;
+ *   - a `main` com o ticket (o `antes.md`) e o config commitados;
+ *   - a evidência do bloqueio em `docs/fila/runs/` (ignorada pelo git, como no
+ *     Comarka);
+ *   - `../_worktrees/staging-auto`, um repo git limpo (ou sujo, com `arvoreSuja`).
+ */
+export function repoDoCaso(base: string, id: string, o: { nome?: string; arvoreSuja?: boolean } = {}): RepoCaso {
+  const raiz = join(base, o.nome ?? `comarka-${id}`)
+  mkdirSync(raiz, { recursive: true })
+  git(raiz, 'init', '-q', '-b', 'main')
+  git(raiz, 'config', 'user.name', 'resolvedor-teste')
+  git(raiz, 'config', 'user.email', 'r@t')
+  const d = CASO[id]!
+  const caso = JSON.parse(readFileSync(join(d, 'caso.json'), 'utf8')) as { arquivo_ticket: string }
+  const serie = JSON.parse(readFileSync(join(d, 'serie.json'), 'utf8')) as { k: number; dir: string }[]
+
+  // os heads da série e a staging-auto
+  const shas = new Map<string, string>()
+  let alvoSha: string | null = null
+  if (existsSync(join(d, 'fontes'))) {
+    for (const h of readdirSync(join(d, 'fontes'))) shas.set(h, commitDe(raiz, `head-${h.slice(0, 7)}`, fontes(join(d, 'fontes', h))))
+    alvoSha = [...shas.values()].at(-1)!
+  }
+  if (id === '929') {
+    const arv = join(FX_RES, 'arvores', '929')
+    const head = commitDe(raiz, 'frente-929', fontes(join(arv, 'head')))
+    for (const s of serie) shas.set(readFileSync(join(d, `attempt-${s.k}`, 'head.txt'), 'utf8').trim(), head)
+    alvoSha = commitDe(raiz, 'alvo-929', fontes(join(arv, 'alvo')))
+  }
+
+  git(raiz, 'checkout', '-q', '--orphan', 'main')
+  git(raiz, 'rm', '-rq', '--cached', '--ignore-unmatch', '.')
+  materializar(d, raiz)
+  const antes = readFileSync(join(FX_RES, 'gabarito', id, 'antes.md'), 'utf8')
+  const depois = readFileSync(join(FX_RES, 'gabarito', id, 'depois.md'), 'utf8')
+  writeFileSync(join(raiz, caso.arquivo_ticket), antes)
+  writeFileSync(join(raiz, '.gitignore'), 'docs/fila/runs/\n')
+  for (const s of serie) {
+    const p = join(raiz, s.dir, 'head.txt')
+    if (existsSync(p)) {
+      const velho = readFileSync(p, 'utf8').trim()
+      if (shas.has(velho)) writeFileSync(p, `${shas.get(velho)}\n`)
+    }
+  }
+  git(raiz, 'add', '--', '.gitignore', caso.arquivo_ticket, 'docs/fila/000-config.json')
+  git(raiz, 'commit', '-q', '-m', 'fila')
+  git(raiz, 'branch', 'staging-auto', alvoSha ?? 'HEAD')
+
+  const alvo = join(base, '_worktrees', 'staging-auto')
+  if (!existsSync(alvo)) {
+    mkdirSync(alvo, { recursive: true })
+    git(alvo, 'init', '-q', '-b', 'staging-auto')
+    writeFileSync(join(alvo, 'LEIA.md'), 'alvo\n')
+    git(alvo, 'add', 'LEIA.md')
+    git(alvo, 'commit', '-q', '-m', 'alvo')
+  }
+  if (o.arvoreSuja) writeFileSync(join(alvo, 'LEIA.md'), 'sujo\n')
+  return { raiz, ticket: caso.arquivo_ticket, antes, depois, alvo }
+}
+
+/** O 1º bloco json de um ticket .md. */
+export function jsonDo(md: string): Record<string, unknown> {
+  return JSON.parse(/```json\n([\s\S]*?)\n```/.exec(md)![1]!) as Record<string, unknown>
+}
+
+/** As linhas que mudaram entre dois textos de mesmo tamanho em linhas (índices). */
+export function linhasDiferentes(a: string, b: string): number[] {
+  const la = a.split('\n')
+  const lb = b.split('\n')
+  if (la.length !== lb.length) return [-1]
+  return la.flatMap((l, i) => (l === lb[i] ? [] : [i]))
+}
+
+/** Põe as variáveis do ambiente no process.env e devolve quem as tira. */
+export function comEnv(env: Record<string, string>): () => void {
+  const antes = new Map(Object.keys(env).map((k) => [k, process.env[k]]))
+  Object.assign(process.env, env)
+  return () => {
+    for (const [k, v] of antes) {
+      if (v === undefined) delete process.env[k]
+      else process.env[k] = v
+    }
+  }
+}
```

### 0677c1e 7f-b2-2: orq resolver [--repo X] [--dry-run]: passada, ordem por dependentes, decisão por classe e modo

```diff
commit 0677c1ec08a96b1074674cd804665893dc5580a4
Author: Lucas Santos
Date: Sat Oct 10 22:56:39 2026 -0300

7f-b2-2: orq resolver [--repo X] [--dry-run]: passada, ordem por dependentes, decisão por classe e modo

Uma passada: os bloqueados de cada repo do repos.json (ou o --repo), do que tem
mais tickets esperando por ele ao que tem menos; cada um pelo triador
existente; a ação sai da classe e do modo do repo (campo `resolvedor` do
repos.json: diagnostico, sombra ou auto, por classe). Em --dry-run nada muda
no repo, o modelo não roda e o ledger não nasce: o que faria vai para
dry-run.jsonl e para a saída. As ações que escrevem entram nas peças 3 e 4.

O auxiliar dos testes passa a manter o mtime do head.txt reescrito: a série do
leitor do legado é por mtime, e sem isso o 840 saía sem tentativa.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orq                                  |  15 +++
 scripts/orquestrador/resolvedor/caminhos.ts  | 128 ++++++++++++++++++++++++
 scripts/orquestrador/resolvedor/cli.ts       |  45 +++++++++
 scripts/orquestrador/resolvedor/decidir.ts   |  55 +++++++++++
 scripts/orquestrador/resolvedor/modos.ts     | 100 +++++++++++++++++++
 scripts/orquestrador/resolvedor/passada.ts   | 142 +++++++++++++++++++++++++++
 test/orquestrador-resolvedor-passada.test.ts | 120 ++++++++++++++++++++++
 test/resolvedor-repo.ts                      |   8 +-
 8 files changed, 611 insertions(+), 2 deletions(-)
diff --git a/scripts/orq b/scripts/orq
index cbf93c5..4fdb7b0 100755
--- a/scripts/orq
+++ b/scripts/orq
@@ -95,6 +95,21 @@ if [ "${1:-}" = triar ]; then
   exit $?
 fi
 
+# --- `orq resolver` (etapa 7f-b2) roda ANTES do lib.sh, e de qualquer lugar --
+# Pelo mesmo motivo do `triar`: o resolvedor trabalha sobre os repos do
+# ~/.orq/repos.json (ou o --repo), não sobre o checkout onde este `orq` está.
+# Ele é o único verbo que escreve num repo instalado sem ser o loop: só o
+# arquivo do ticket bloqueado, em commit próprio com trailer, e só no modo
+# `auto` do repo (scripts/orquestrador/resolvedor/, CONTRATO §14).
+if [ "${1:-}" = resolver ]; then
+  _root="${ORQ_EXEC_ROOT:-$(cd "$ORQ_DIR/.." && pwd)}"
+  _gc="$(git -C "$_root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
+  if [ -n "$_gc" ] && [ -d "$_gc" ]; then _main="$(cd "$_gc/.." && pwd)"; else _main="$_root"; fi
+  if [ -x "$_main/node_modules/.bin/tsx" ]; then _tsx=( "$_main/node_modules/.bin/tsx" ); else _tsx=( npx --no-install tsx ); fi
+  "${_tsx[@]}" "$ORQ_DIR/orquestrador/resolvedor/cli.ts" "$@"
+  exit $?
+fi
+
 # shellcheck source=orquestrador/lib.sh
 source "$ORQ_DIR/orquestrador/lib.sh"
 
diff --git a/scripts/orquestrador/resolvedor/caminhos.ts b/scripts/orquestrador/resolvedor/caminhos.ts
new file mode 100644
index 0000000..da7515a
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/caminhos.ts
@@ -0,0 +1,128 @@
+/**
+ * caminhos.ts — onde o resolvedor escreve FORA do repo, e a porta dessa
+ * escrita (etapa 7f-b2).
+ *
+ * Raiz: `ORQ_RESOLVEDOR_DIR`, ou `~/.orq/resolvedor`. Dentro dela:
+ *   ledger.jsonl                 cada ação, desfecho, "não consegui", promoção (peça 5)
+ *   dry-run.jsonl                o que a passada em --dry-run faria (nunca no ledger)
+ *   resolver.lock                a trava global da passada (O_EXCL; órfã depois de 15 min)
+ *   <repo>/<id>/proposta.md      a proposta em sombra (R2 sempre; R1 e R5 no modo sombra)
+ *   <repo>/<id>/proposta.json    a mesma proposta, para o ledger comparar com o humano
+ *   <repo>/<id>/acoes/<ts>/      o ticket antes e depois de cada ação aplicada (o desfazer usa)
+ *
+ * O interruptor é `ORQ_RESOLVEDOR_PAUSADO`, ou `~/.orq/RESOLVEDOR_PAUSADO`:
+ * existindo, nada roda (nem triagem, nem ledger).
+ *
+ * GUARDA: a escrita fora do repo passa por `GuardaResolvedor`, que resolve o
+ * caminho real e LANÇA se o destino não está sob a raiz (a única exceção é o
+ * próprio `repos.json`, que a promoção da peça 6 regrava), ou se está dentro de
+ * qualquer repo do `repos.json`. A escrita NO repo é outra porta (`repo.ts`).
+ */
+import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, renameSync, statSync, unlinkSync, writeFileSync, writeSync } from 'node:fs'
+import { homedir } from 'node:os'
+import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
+import { EscritaRecusada, arquivoRepos, caminhoReal, lerRepos } from '../triador/saida.js'
+
+export { EscritaRecusada }
+
+export const raizResolvedor = (): string => resolve(process.env.ORQ_RESOLVEDOR_DIR || join(homedir(), '.orq', 'resolvedor'))
+export const interruptor = (): string => resolve(process.env.ORQ_RESOLVEDOR_PAUSADO || join(homedir(), '.orq', 'RESOLVEDOR_PAUSADO'))
+export const arquivoLedger = (): string => join(raizResolvedor(), 'ledger.jsonl')
+export const arquivoDryRun = (): string => join(raizResolvedor(), 'dry-run.jsonl')
+export const dirTicket = (repo: string, id: string): string => join(raizResolvedor(), repo, id)
+
+export const dentro = (filho: string, pai: string): boolean => {
+  const r = relative(pai, filho)
+  return r === '' || (!r.startsWith('..') && !isAbsolute(r))
+}
+
+export class GuardaResolvedor {
+  readonly raiz: string
+  private readonly repos: string
+  private readonly protegidos: string[]
+
+  constructor(protegidosExtra: string[] = []) {
+    this.raiz = caminhoReal(raizResolvedor())
+    this.repos = caminhoReal(arquivoRepos())
+    this.protegidos = [...lerRepos().map((r) => r.caminho), ...protegidosExtra].map((p) => caminhoReal(p))
+    for (const p of this.protegidos) {
+      if (dentro(this.raiz, p)) throw new EscritaRecusada(`raiz do resolvedor ${this.raiz} está dentro do repo ${p}`)
+    }
+  }
+
+  confere(destino: string): string {
+    const real = caminhoReal(destino)
+    if (!dentro(real, this.raiz) && real !== this.repos) throw new EscritaRecusada(`escrita fora de ${this.raiz}: ${real}`)
+    for (const p of this.protegidos) if (dentro(real, p)) throw new EscritaRecusada(`escrita dentro do repo ${p}: ${real}`)
+    return real
+  }
+
+  escrever(destino: string, conteudo: string): void {
+    const real = this.confere(destino)
+    mkdirSync(this.confere(dirname(real)), { recursive: true })
+    // troca atômica: quem lê (o painel, a próxima passada) nunca vê meio arquivo
+    const tmp = `${real}.tmp-${process.pid}`
+    if (real !== this.repos) this.confere(tmp)
+    writeFileSync(tmp, conteudo)
+    renameSync(tmp, real)
+  }
+
+  acrescentar(destino: string, linha: string): void {
+    const real = this.confere(destino)
+    mkdirSync(this.confere(dirname(real)), { recursive: true })
+    appendFileSync(real, linha.endsWith('\n') ? linha : `${linha}\n`)
+  }
+
+  apagar(p: string): void {
+    unlinkSync(this.confere(p))
+  }
+
+  /** Cria com O_EXCL; false se já existe. */
+  criarExclusivo(p: string, conteudo: string): boolean {
+    const real = this.confere(p)
+    mkdirSync(this.confere(dirname(real)), { recursive: true })
+    let fd: number
+    try {
+      fd = openSync(real, 'wx')
+    } catch (e) {
+      if ((e as NodeJS.ErrnoException).code === 'EEXIST') return false
+      throw e
+    }
+    try {
+      writeSync(fd, conteudo)
+    } finally {
+      closeSync(fd)
+    }
+    return true
+  }
+}
+
+export const TRAVA_GLOBAL_ORFA_MS = 15 * 60 * 1000
+
+/** A trava global da passada. `null` se outra passada a segura (e ela não é órfã). */
+export function travarPassada(g: GuardaResolvedor, agora = Date.now()): (() => void) | null {
+  const p = join(g.raiz, 'resolver.lock')
+  const corpo = JSON.stringify({ pid: process.pid, hora: new Date(agora).toISOString() }) + '\n'
+  if (!g.criarExclusivo(p, corpo)) {
+    let idade = 0
+    try {
+      idade = Date.now() - statSync(p).mtimeMs
+    } catch {
+      idade = TRAVA_GLOBAL_ORFA_MS + 1
+    }
+    if (idade <= TRAVA_GLOBAL_ORFA_MS) return null
+    try {
+      g.apagar(p)
+    } catch {
+      /* outra passada levou a órfã */
+    }
+    if (!g.criarExclusivo(p, corpo)) return null
+  }
+  return () => {
+    try {
+      if (existsSync(p)) g.apagar(p)
+    } catch {
+      /* já saiu */
+    }
+  }
+}
diff --git a/scripts/orquestrador/resolvedor/cli.ts b/scripts/orquestrador/resolvedor/cli.ts
new file mode 100644
index 0000000..156b3c3
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/cli.ts
@@ -0,0 +1,45 @@
+/**
+ * cli.ts — `orq resolver` (etapa 7f-b2).
+ *
+ *   orq resolver [--repo X] [--dry-run] [--sem-modelo]
+ *
+ * <X> é um nome do `~/.orq/repos.json` ou um caminho. Sem `--repo`, todos os
+ * repos do repos.json, cada um no seu modo (modos.ts). Imprime uma linha por
+ * bloqueado, na ordem em que a passada os tratou.
+ */
+import { passada, resumo } from './passada.js'
+
+const USO_RESOLVER = 'uso: orq resolver [--repo <nome|caminho>] [--dry-run] [--sem-modelo]'
+
+export function parseResolver(argv: string[]): { repo?: string; dryRun: boolean; semModelo: boolean } {
+  const a: { repo?: string; dryRun: boolean; semModelo: boolean } = { dryRun: false, semModelo: false }
+  for (let i = 0; i < argv.length; i++) {
+    const x = argv[i]!
+    if (x === '--dry-run') a.dryRun = true
+    else if (x === '--sem-modelo') a.semModelo = true
+    else if (x === '--repo') {
+      const r = argv[++i]
+      if (!r) throw new Error(USO_RESOLVER)
+      a.repo = r
+    } else throw new Error(x.startsWith('--') ? `flag desconhecida: ${x}` : USO_RESOLVER)
+  }
+  return a
+}
+
+export function main(argv: string[]): number {
+  const [verbo, ...resto] = argv
+  try {
+    if (verbo === 'resolver') {
+      const a = parseResolver(resto)
+      const r = passada({ ...(a.repo ? { repo: a.repo } : {}), dryRun: a.dryRun, semModelo: a.semModelo })
+      process.stdout.write(`${a.dryRun ? '[dry-run] ' : ''}${resumo(r)}\n`)
+      return 0
+    }
+    throw new Error(USO_RESOLVER)
+  } catch (e) {
+    process.stderr.write(`[orq ${verbo ?? 'resolver'}] ${(e as Error).message}\n`)
+    return 1
+  }
+}
+
+if (/resolvedor\/cli\.(ts|js)$/.test(process.argv[1] ?? '')) process.exit(main(process.argv.slice(2)))
diff --git a/scripts/orquestrador/resolvedor/decidir.ts b/scripts/orquestrador/resolvedor/decidir.ts
new file mode 100644
index 0000000..37f2cad
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/decidir.ts
@@ -0,0 +1,55 @@
+/**
+ * decidir.ts — a ação de um ticket bloqueado, pela classe do diagnóstico e
+ * pelo modo do repo (decisões do chat do programa, 7f-b2). PURO.
+ *
+ * | classe (regra)              | auto              | sombra   | diagnostico |
+ * |-----------------------------|-------------------|----------|-------------|
+ * | R5 árvore suja (D1), firme  | reabrir           | proposta | nada        |
+ * | R5 máquina (D4), firme      | reabrir           | proposta | nada        |
+ * | R5 base vermelha (D5)       | aviso             | aviso    | nada        |
+ * | R1 (D6), firme              | allowlist + guarda, reabrir | proposta | nada |
+ * | R2 (firme ou palpite)       | proposta (nunca aplica nesta etapa) | proposta | nada |
+ * | R3, R4, R6, R7              | aviso             | aviso    | nada        |
+ * | palpite (`?`) fora de R2, sem classe | aviso    | aviso    | nada        |
+ *
+ * Só diagnóstico FIRME da extração dispara ação que escreve no repo: a resposta
+ * do modelo nunca é firme (triador, §13.5). R2 é a exceção que só propõe, e por
+ * isso aceita o palpite (o 929 sai `R2?` pela D12).
+ */
+import { modoDe, type Modo, type Modos } from './modos.js'
+
+export type TipoAcao = 'r1_allowlist' | 'r5_reabrir' | 'r2_proposta' | 'sombra' | 'aviso' | 'diagnostico'
+
+export interface Decisao {
+  acao: TipoAcao
+  /** a ação que o modo sombra propõe (r1_allowlist ou r5_reabrir) */
+  propoe?: 'r1_allowlist' | 'r5_reabrir'
+  modo: Modo
+  motivo: string
+}
+
+export interface DiagnosticoMin {
+  classe: string | null
+  regra: string | null
+  firme: boolean
+  fonte?: string
+}
+
+export function decidir(d: DiagnosticoMin, modos: Modos): Decisao {
+  const modo = modoDe(modos, d.classe)
+  const base = (d.classe ?? '').replace('?', '')
+  if (modo === 'diagnostico') return { acao: 'diagnostico', modo, motivo: `modo diagnostico para ${base || 'sem classe'}` }
+  if (base === 'R2') {
+    return { acao: 'r2_proposta', modo, motivo: modo === 'auto' ? 'R2 em auto: nesta etapa só propõe, nunca aplica' : 'R2 em sombra: só proposta' }
+  }
+  const firme = d.firme && d.fonte !== 'modelo'
+  const aplica = (acao: 'r1_allowlist' | 'r5_reabrir', o: string): Decisao =>
+    modo === 'auto' ? { acao, modo, motivo: o } : { acao: 'sombra', propoe: acao, modo, motivo: `${o} (em sombra: só proposta)` }
+  if (base === 'R1' && firme && d.regra === 'D6') return aplica('r1_allowlist', 'R1 firme (D6): teste acoplado na allowlist com guarda')
+  if (base === 'R5' && firme && d.regra === 'D1') return aplica('r5_reabrir', 'R5 árvore suja (D1): reabre quando a árvore alvo estiver limpa')
+  if (base === 'R5' && firme && d.regra === 'D4') return aplica('r5_reabrir', 'R5 máquina (D4): reabre quando a máquina estiver livre')
+  if (base === 'R5' && d.regra === 'D5') return { acao: 'aviso', modo, motivo: 'R5 base vermelha: só diagnóstico nesta etapa' }
+  if (!d.classe) return { acao: 'aviso', modo, motivo: 'sem classe: decisão humana' }
+  if (!firme && (base === 'R1' || base === 'R5' || d.classe.includes('|'))) return { acao: 'aviso', modo, motivo: `${d.classe} é palpite: o resolvedor só age em diagnóstico firme` }
+  return { acao: 'aviso', modo, motivo: `${d.classe}: só diagnóstico e aviso (decisão humana)` }
+}
diff --git a/scripts/orquestrador/resolvedor/modos.ts b/scripts/orquestrador/resolvedor/modos.ts
new file mode 100644
index 0000000..1767209
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/modos.ts
@@ -0,0 +1,100 @@
+/**
+ * modos.ts — o modo do resolvedor por repo e por classe, no `~/.orq/repos.json`
+ * (decisão do chat do programa, 7f-b2).
+ *
+ * Campo `resolvedor` de cada item do repos.json:
+ *   - ausente                          → "diagnostico" em toda classe (o padrão);
+ *   - uma string ("diagnostico", "sombra" ou "auto") → a mesma em toda classe;
+ *   - um objeto {"padrao": …, "R1": …, "R2": …, …} → por classe, `padrao` no resto.
+ *
+ *   diagnostico  só tria (o diagnóstico vai para ~/.orq/diagnosticos, como o `orq triar`)
+ *   sombra       tria e grava a PROPOSTA em ~/.orq/resolvedor; nunca toca o repo
+ *   auto         tria e aplica a ação da classe no ticket (com as travas de acoes.ts)
+ *
+ * O nome e o caminho saem de `lerRepos` (triador/saida.ts), a mesma leitura do
+ * painel; este arquivo só acrescenta o campo. A promoção e o rebaixamento
+ * (peça 6) regravam o campo com `gravarModo`.
+ */
+import { readFileSync } from 'node:fs'
+import { homedir } from 'node:os'
+import { resolve } from 'node:path'
+import { arquivoRepos, lerRepos, type RepoListado } from '../triador/saida.js'
+import type { GuardaResolvedor } from './caminhos.js'
+
+export const MODOS = ['diagnostico', 'sombra', 'auto'] as const
+export type Modo = (typeof MODOS)[number]
+export type Modos = { padrao: Modo } & Record<string, Modo>
+
+export interface RepoResolvedor extends RepoListado {
+  modos: Modos
+}
+
+const ehModo = (v: unknown): v is Modo => typeof v === 'string' && (MODOS as readonly string[]).includes(v)
+
+export function modosDe(campo: unknown): Modos {
+  if (ehModo(campo)) return { padrao: campo }
+  const out: Modos = { padrao: 'diagnostico' }
+  if (campo && typeof campo === 'object' && !Array.isArray(campo)) {
+    for (const [k, v] of Object.entries(campo)) if (ehModo(v) && (k === 'padrao' || /^R[1-7]$/.test(k))) out[k] = v
+  }
+  return out
+}
+
+/** O modo de uma classe (`R1`, `R5?`, `R1|R2?` → a do primeiro nome). */
+export function modoDe(m: Modos, classe: string | null): Modo {
+  const c = (classe ?? '').replace('?', '').split('|')[0] ?? ''
+  return m[c] ?? m.padrao
+}
+
+const caminhoDoItem = (it: unknown): string | null => {
+  const cam = typeof it === 'string' ? it : it && typeof it === 'object' ? (it as { caminho?: unknown }).caminho : null
+  return typeof cam === 'string' && cam.trim() ? resolve(cam.replace(/^~(?=\/|$)/, homedir())) : null
+}
+
+function itensCrus(): unknown[] {
+  try {
+    const d = JSON.parse(readFileSync(arquivoRepos(), 'utf8')) as { repos?: unknown }
+    return Array.isArray(d.repos) ? d.repos : []
+  } catch {
+    return []
+  }
+}
+
+/** Os repos do repos.json (nome e caminho como o painel lê) com os modos. */
+export function lerReposResolvedor(): RepoResolvedor[] {
+  const listados = lerRepos()
+  const crus = itensCrus().filter((it) => caminhoDoItem(it) !== null)
+  return listados.map((r, i) => {
+    const it = crus[i]
+    return { ...r, modos: modosDe(it && typeof it === 'object' ? (it as { resolvedor?: unknown }).resolvedor : undefined) }
+  })
+}
+
+/**
+ * `<repo>` da linha de comando: um nome do repos.json, ou um caminho (listado
+ * ou não). Repo fora do repos.json fica em "diagnostico".
+ */
+export function acharRepo(arg: string): RepoResolvedor {
+  const rs = lerReposResolvedor()
+  const porNome = rs.find((r) => r.nome === arg)
+  if (porNome) return porNome
+  const caminho = resolve(arg)
+  return rs.find((r) => r.caminho === caminho) ?? { nome: caminho.split('/').pop()!, caminho, modos: { padrao: 'diagnostico' } }
+}
+
+/**
+ * Regrava o modo de UMA classe de UM repo no repos.json (peça 6), mantendo o
+ * resto do arquivo. Um item que era string vira `{caminho, resolvedor}`.
+ */
+export function gravarModo(g: GuardaResolvedor, caminhoRepo: string, classe: string, modo: Modo): void {
+  const arq = arquivoRepos()
+  const d = JSON.parse(readFileSync(arq, 'utf8')) as { repos: unknown[] }
+  const i = d.repos.findIndex((it) => caminhoDoItem(it) === caminhoRepo)
+  if (i < 0) throw new Error(`repos.json sem o repo ${caminhoRepo}`)
+  const it = d.repos[i]
+  const obj: Record<string, unknown> = typeof it === 'string' ? { caminho: it } : { ...(it as Record<string, unknown>) }
+  const atual = modosDe(obj.resolvedor)
+  obj.resolvedor = { ...atual, [classe]: modo }
+  d.repos[i] = obj
+  g.escrever(arq, JSON.stringify(d, null, 2) + '\n')
+}
diff --git a/scripts/orquestrador/resolvedor/passada.ts b/scripts/orquestrador/resolvedor/passada.ts
new file mode 100644
index 0000000..dedc06e
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/passada.ts
@@ -0,0 +1,142 @@
+/**
+ * passada.ts — uma passada do resolvedor (`orq resolver`, etapa 7f-b2).
+ *
+ *   para cada repo (ou o `--repo`):
+ *     bloqueados, do que tem mais tickets esperando por ele ao que tem menos →
+ *     triagem (o triador existente, `triarTicket`) → decisão pela classe e pelo
+ *     modo (decidir.ts) → ação, ou, em --dry-run, o registro do que faria.
+ *
+ * "Esperando por ele": tickets fora de `done`/`obsoleto` com o id em
+ * `dependencias` (dependência direta). Empate: a ordem do arquivo.
+ *
+ * --dry-run não escreve no repo, não chama modelo e não toca o ledger: grava
+ * só `dry-run.jsonl` (caminhos.ts) e imprime.
+ */
+import { readdirSync, readFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { blocoJson } from '../triador/comum.js'
+import { criarPassoModelo, lerConfigModelo } from '../triador/modelo.js'
+import { Guarda, lerDiagnostico } from '../triador/saida.js'
+import { bloqueados, triarTicket, type Diagnostico } from '../triador/triar.js'
+import { GuardaResolvedor, arquivoDryRun } from './caminhos.js'
+import { decidir, type Decisao } from './decidir.js'
+import { acharRepo, lerReposResolvedor, type Modo, type RepoResolvedor } from './modos.js'
+
+export const TETO_DIA_USD = 5
+
+export interface OpcoesPassada {
+  repo?: string
+  dryRun?: boolean
+  semModelo?: boolean
+  agora?: number
+}
+
+export interface ItemPassada {
+  repo: string
+  id: string
+  dependentes: number
+  classe: string | null
+  regra: string | null
+  firme: boolean
+  modo: Modo
+  acao: Decisao['acao']
+  /** o que aconteceu: aplicado, proposto, aviso, diagnostico, faria (dry-run), nao_consegui */
+  feito: string
+  motivo: string
+  commit?: string
+  proposta?: string
+}
+
+export interface ResultadoPassada {
+  pausado: boolean
+  travado: boolean
+  itens: ItemPassada[]
+}
+
+/** Os bloqueados de um repo com o número de tickets que esperam por cada um, do maior ao menor. */
+export function ordenarBloqueados(raiz: string): { id: string; dependentes: number }[] {
+  const fila = join(raiz, 'docs/fila')
+  let nomes: string[] = []
+  try {
+    nomes = readdirSync(fila).filter((f) => /^[0-9][0-9a-z]*-.*\.md$/.test(f))
+  } catch {
+    return []
+  }
+  const conta = new Map<string, number>()
+  for (const f of nomes) {
+    const j = blocoJson(readFileSync(join(fila, f), 'utf8'))
+    if (!j || j.status === 'done' || j.status === 'obsoleto' || !Array.isArray(j.dependencias)) continue
+    for (const d of new Set(j.dependencias.filter((x): x is string => typeof x === 'string'))) conta.set(d, (conta.get(d) ?? 0) + 1)
+  }
+  return bloqueados(raiz)
+    .map((id, i) => ({ id, dependentes: conta.get(id) ?? 0, i }))
+    .sort((a, b) => b.dependentes - a.dependentes || a.i - b.i)
+    .map(({ id, dependentes }) => ({ id, dependentes }))
+}
+
+function tetoDia(): number {
+  const v = Number(process.env.ORQ_RESOLVEDOR_TETO_DIA)
+  return process.env.ORQ_RESOLVEDOR_TETO_DIA && Number.isFinite(v) && v >= 0 ? v : TETO_DIA_USD
+}
+
+/** O diagnóstico atual do ticket: o que a triagem acabou de gravar, ou o gravado com a mesma assinatura. */
+function triar(repo: RepoResolvedor, id: string, agora: number, semModelo: boolean): Diagnostico | null {
+  const modelo = semModelo ? null : criarPassoModelo({ ...lerConfigModelo(), teto_dia_usd: tetoDia() })
+  const r = triarTicket({ repo: { nome: repo.nome, caminho: repo.caminho }, id, agora, ...(modelo ? { modelo } : {}) })
+  return r.diagnostico ?? lerDiagnostico<Diagnostico>(new Guarda([repo.caminho]), repo.nome, id)
+}
+
+export interface Contexto {
+  repo: RepoResolvedor
+  id: string
+  diag: Diagnostico
+  decisao: Decisao
+  dependentes: number
+  agora: number
+  dryRun: boolean
+  g: GuardaResolvedor
+}
+
+/** O que a ação faz (ou faria). Peça 2: nenhuma ação escreve ainda. */
+export function executar(c: Contexto): Pick<ItemPassada, 'feito' | 'motivo' | 'commit' | 'proposta'> {
+  const { decisao: d } = c
+  if (d.acao === 'diagnostico' || d.acao === 'aviso') return { feito: d.acao, motivo: d.motivo }
+  if (c.dryRun) return { feito: 'faria', motivo: d.motivo }
+  return { feito: 'nao_consegui', motivo: `ação ${d.acao} ainda não implementada` }
+}
+
+export function passada(o: OpcoesPassada = {}): ResultadoPassada {
+  const agora = o.agora ?? Date.now()
+  const dryRun = o.dryRun === true
+  const repos = o.repo ? [acharRepo(o.repo)] : lerReposResolvedor()
+  const g = new GuardaResolvedor(repos.map((r) => r.caminho))
+  const itens: ItemPassada[] = []
+  for (const repo of repos) {
+    for (const { id, dependentes } of ordenarBloqueados(repo.caminho)) {
+      const diag = triar(repo, id, agora, o.semModelo === true || dryRun)
+      const base = { repo: repo.nome, id, dependentes, classe: diag?.classe ?? null, regra: diag?.regra ?? null, firme: diag?.firme ?? false }
+      if (!diag) {
+        itens.push({ ...base, modo: 'diagnostico', acao: 'aviso', feito: 'nao_consegui', motivo: 'sem diagnóstico (triagem travada por outro processo?)' })
+        continue
+      }
+      const decisao = decidir(diag, repo.modos)
+      const r = executar({ repo, id, diag, decisao, dependentes, agora, dryRun, g })
+      const item: ItemPassada = { ...base, modo: decisao.modo, acao: decisao.acao, ...r }
+      itens.push(item)
+      if (dryRun) g.acrescentar(arquivoDryRun(), JSON.stringify({ ts: new Date(agora).toISOString(), ...item, assinatura: diag.assinatura }))
+    }
+  }
+  return { pausado: false, travado: false, itens }
+}
+
+export function resumo(r: ResultadoPassada): string {
+  if (r.pausado) return 'resolvedor pausado (interruptor ligado): nada rodou'
+  if (r.travado) return 'outra passada do resolvedor está rodando: nada rodou'
+  const linhas = r.itens.map((i) =>
+    [i.repo, i.id, `deps=${i.dependentes}`, `${i.classe ?? 'sem classe'}${i.regra ? ` ${i.regra}` : ''}${i.firme ? ' firme' : ''}`, i.modo, i.acao, i.feito, i.motivo, i.commit ?? '', i.proposta ?? '']
+      .join('\t')
+      .replace(/\t+$/, ''),
+  )
+  linhas.push(`-- ${r.itens.length} bloqueado(s): ${r.itens.filter((i) => i.feito === 'aplicado').length} aplicado(s), ${r.itens.filter((i) => i.feito === 'proposto').length} proposta(s), ${r.itens.filter((i) => i.feito === 'faria').length} faria (dry-run)`)
+  return linhas.join('\n')
+}
diff --git a/test/orquestrador-resolvedor-passada.test.ts b/test/orquestrador-resolvedor-passada.test.ts
new file mode 100644
index 0000000..8d4fee5
--- /dev/null
+++ b/test/orquestrador-resolvedor-passada.test.ts
@@ -0,0 +1,120 @@
+/**
+ * Etapa 7f-b2, peça 2 · `orq resolver [--repo X] [--dry-run]`: uma passada.
+ *
+ * Pronto quando:
+ *   - a decisão sai da classe e do modo (tabela de decidir.ts);
+ *   - os bloqueados são tratados do que tem mais tickets esperando por ele ao
+ *     que tem menos (dependência direta, fora de done/obsoleto);
+ *   - cada um passa pelo triador existente (o diagnóstico fica em ORQ_DIAG_DIR);
+ *   - em --dry-run nada muda no repo (arquivo, índice, commits), o ledger não
+ *     nasce, e o que faria fica em dry-run.jsonl e na saída.
+ */
+import { spawnSync } from 'node:child_process'
+import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterAll, beforeAll, describe, expect, it } from 'vitest'
+import { ambiente, comEnv, git, repoDoCaso } from './resolvedor-repo.js'
+
+const RAIZ = join(import.meta.dirname, '..')
+const RES = join(RAIZ, 'scripts', 'orquestrador', 'resolvedor')
+
+interface Mods {
+  decidir: (d: { classe: string | null; regra: string | null; firme: boolean; fonte?: string }, m: Record<string, string>) => { acao: string; propoe?: string }
+  ordenarBloqueados: (raiz: string) => { id: string; dependentes: number }[]
+  passada: (o: { repo?: string; dryRun?: boolean; semModelo?: boolean; agora?: number }) => { itens: { id: string; acao: string; feito: string; dependentes: number }[] }
+}
+async function carregar(): Promise<Mods | null> {
+  try {
+    const imp = async (f: string) => (await import(pathToFileURL(join(RES, f)).href)) as Record<string, unknown>
+    const m = { ...(await imp('decidir.ts')), ...(await imp('passada.ts')) }
+    return typeof m.decidir === 'function' && typeof m.passada === 'function' && typeof m.ordenarBloqueados === 'function' ? (m as unknown as Mods) : null
+  } catch {
+    return null
+  }
+}
+
+const ticket = (id: string, status: string, deps: string[] = []) =>
+  `# ${id}\n\n\`\`\`json\n${JSON.stringify({ id, slug: `t${id}`, status, notas_status: '', pathspec_allowlist: ['src/x.ts'], dependencias: deps, criterios_aceite: [] }, null, 2)}\n\`\`\`\n`
+
+describe('peça 2: a passada', () => {
+  let m: Mods | null
+  let amb: ReturnType<typeof ambiente>
+  let tira: () => void
+  beforeAll(async () => {
+    amb = ambiente()
+    tira = comEnv(amb.env)
+    m = await carregar()
+  })
+  afterAll(() => tira?.())
+
+  it('o módulo existe', () => {
+    expect(m, 'resolvedor/decidir.ts e passada.ts com decidir, ordenarBloqueados e passada').not.toBeNull()
+  })
+
+  it('decide pela classe e pelo modo', () => {
+    const auto = { padrao: 'diagnostico', R1: 'auto', R5: 'auto', R2: 'sombra', R3: 'auto' }
+    const d = (classe: string | null, regra: string | null, firme: boolean, modos: Record<string, string> = auto, fonte = 'extracao') => m!.decidir({ classe, regra, firme, fonte }, modos).acao
+    expect(d('R1', 'D6', true)).toBe('r1_allowlist')
+    expect(d('R5', 'D1', true)).toBe('r5_reabrir')
+    expect(d('R5', 'D4', true)).toBe('r5_reabrir')
+    expect(d('R5', 'D5', true)).toBe('aviso')
+    expect(d('R2?', 'D12', false)).toBe('r2_proposta')
+    expect(d('R2', 'D12', true, { padrao: 'auto' })).toBe('r2_proposta')
+    expect(d('R1?', 'D6', false)).toBe('aviso')
+    expect(d('R1', 'D6', false, auto, 'modelo')).toBe('aviso')
+    expect(d('R3', null, true)).toBe('aviso')
+    expect(d(null, null, false, { padrao: 'auto' })).toBe('aviso')
+    expect(d(null, null, false)).toBe('diagnostico')
+    expect(d('R1', 'D6', true, { padrao: 'diagnostico' })).toBe('diagnostico')
+    expect(d('R2?', 'D12', false, { padrao: 'diagnostico' })).toBe('diagnostico')
+    expect(m!.decidir({ classe: 'R1', regra: 'D6', firme: true }, { padrao: 'sombra' })).toEqual(expect.objectContaining({ acao: 'sombra', propoe: 'r1_allowlist' }))
+  })
+
+  it('ordena os bloqueados pelo número de tickets que esperam por eles, e tria cada um', () => {
+    const raiz = join(amb.base, 'ordem')
+    mkdirSync(join(raiz, 'docs/fila/runs'), { recursive: true })
+    writeFileSync(join(raiz, 'docs/fila/runs/local-loop.log'), '')
+    const t = (nome: string, md: string) => writeFileSync(join(raiz, 'docs/fila', nome), md)
+    t('101-a.md', ticket('101', 'bloqueado'))
+    t('102-b.md', ticket('102', 'bloqueado'))
+    t('103-c.md', ticket('103', 'bloqueado'))
+    t('201-x.md', ticket('201', 'pendente', ['103']))
+    t('202-y.md', ticket('202', 'pendente', ['103', '101']))
+    t('203-z.md', ticket('203', 'done', ['102']))
+    t('204-w.md', ticket('204', 'obsoleto', ['102']))
+    expect(m!.ordenarBloqueados(raiz)).toEqual([
+      { id: '103', dependentes: 2 },
+      { id: '101', dependentes: 1 },
+      { id: '102', dependentes: 0 },
+    ])
+    amb.repos([{ nome: 'ordem', caminho: raiz, resolvedor: 'auto' }])
+    const r = m!.passada({ repo: 'ordem', semModelo: true })
+    expect(r.itens.map((i) => i.id)).toEqual(['103', '101', '102'])
+    for (const id of ['101', '102', '103']) expect(existsSync(join(amb.env.ORQ_DIAG_DIR!, 'ordem', `${id}.json`))).toBe(true)
+  })
+
+  it('--dry-run: o repo intocado, sem ledger, e o que faria em dry-run.jsonl', () => {
+    const r = repoDoCaso(join(amb.base, 'dry'), '840', { nome: 'comarka-operacional' })
+    amb.repos([{ nome: 'comarka-dry', caminho: r.raiz, resolvedor: { R1: 'auto' } }])
+    const headAntes = git(r.raiz, 'rev-parse', 'HEAD')
+    const res = m!.passada({ repo: 'comarka-dry', dryRun: true })
+    expect(res.itens).toEqual([expect.objectContaining({ id: '840', acao: 'r1_allowlist', feito: 'faria' })])
+    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+    expect(git(r.raiz, 'rev-parse', 'HEAD')).toBe(headAntes)
+    expect(git(r.raiz, 'status', '--porcelain')).toBe('')
+    expect(existsSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl'))).toBe(false)
+    const linhas = readFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'dry-run.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { id: string; acao: string })
+    expect(linhas.at(-1)).toEqual(expect.objectContaining({ id: '840', acao: 'r1_allowlist' }))
+  })
+
+  it('orq resolver --repo X --dry-run pela linha de comando', () => {
+    const r = repoDoCaso(join(amb.base, 'cli'), '940', { nome: 'comarka-operacional' })
+    amb.repos([{ nome: 'comarka-cli', caminho: r.raiz, resolvedor: { R5: 'auto' } }])
+    const p = spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'resolver', '--repo', 'comarka-cli', '--dry-run'], { encoding: 'utf8', env: { ...process.env, ...amb.env } })
+    expect(p.stderr).toBe('')
+    expect(p.status).toBe(0)
+    expect(p.stdout).toMatch(/^\[dry-run\] comarka-cli\t940\tdeps=\d+\tR5 D1 firme\tauto\tr5_reabrir\tfaria\t/m)
+    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+  })
+})
diff --git a/test/resolvedor-repo.ts b/test/resolvedor-repo.ts
index d1c2424..fabd81b 100644
--- a/test/resolvedor-repo.ts
+++ b/test/resolvedor-repo.ts
@@ -10,7 +10,7 @@
  * que o resolvedor lê nela.
  */
 import { execFileSync } from 'node:child_process'
-import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
+import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs'
 import { tmpdir } from 'node:os'
 import { dirname, join } from 'node:path'
 import { materializar } from './triador-repo-legado.js'
@@ -145,7 +145,11 @@ export function repoDoCaso(base: string, id: string, o: { nome?: string; arvoreS
     const p = join(raiz, s.dir, 'head.txt')
     if (existsSync(p)) {
       const velho = readFileSync(p, 'utf8').trim()
-      if (shas.has(velho)) writeFileSync(p, `${shas.get(velho)}\n`)
+      if (!shas.has(velho)) continue
+      // o mtime fica o da materialização: a série do leitor é por mtime (≤ fim + 180 s)
+      const st = statSync(p)
+      writeFileSync(p, `${shas.get(velho)}\n`)
+      utimesSync(p, st.atime, st.mtime)
     }
   }
   git(raiz, 'add', '--', '.gitignore', caso.arquivo_ticket, 'docs/fila/000-config.json')
```

### 47231ca 7f-b2-3: ações R1 e R5 (árvore suja, máquina) com as travas; gabarito 840, 940 e 932 iguais ao humano

```diff
commit 47231ca5ebde66000276df84c0070b6c30898e79
Author: Lucas Santos
Date: Sat Oct 10 23:02:20 2026 -0300

7f-b2-3: ações R1 e R5 (árvore suja, máquina) com as travas; gabarito 840, 940 e 932 iguais ao humano

R1 (firme D6): o teste vai para a allowlist, o critério que lista os arquivos
permitidos ganha o mesmo caminho, a guarda de contagem (it/test e expect do
branch alvo, zero skip/only/todo, o cmd do 840 letra por letra) entra depois
da última guarda, e o ticket reabre. R5 árvore suja (D1) reabre com a worktree
alvo limpa; máquina (D4), com carga e disco livres. Edição textual do bloco
json, conferida por parse: o resto do arquivo fica byte a byte.

Travas: uma ação por ticket (o segundo bloqueio vai para humano), interruptor,
trava global da passada, espera nenhum git rodando (processo ou lock), arquivo
como foi lido, commit --only do arquivo do ticket com o trailer
Orq-Resolvedor, nunca --no-verify (hook recusou: o arquivo volta), nenhuma
escrita fora de docs/fila do ticket. Em sombra, só proposta.md com o diff.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/resolvedor/acoes.ts     | 107 ++++++++++++
 scripts/orquestrador/resolvedor/diff.ts      |  38 ++++
 scripts/orquestrador/resolvedor/ledger.ts    |  47 +++++
 scripts/orquestrador/resolvedor/passada.ts   |  38 +++-
 scripts/orquestrador/resolvedor/r1.ts        | 161 +++++++++++++++++
 scripts/orquestrador/resolvedor/r5.ts        |  74 ++++++++
 scripts/orquestrador/resolvedor/repo.ts      | 112 ++++++++++++
 scripts/orquestrador/resolvedor/ticket-md.ts | 230 +++++++++++++++++++++++++
 test/orquestrador-resolvedor-acoes.test.ts   | 249 +++++++++++++++++++++++++++
 test/resolvedor-repo.ts                      |  10 +-
 10 files changed, 1056 insertions(+), 10 deletions(-)
diff --git a/scripts/orquestrador/resolvedor/acoes.ts b/scripts/orquestrador/resolvedor/acoes.ts
new file mode 100644
index 0000000..b48e5d4
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/acoes.ts
@@ -0,0 +1,107 @@
+/**
+ * acoes.ts — as ações R1 e R5 com as travas (etapa 7f-b2, peça 3).
+ *
+ * Travas (decisões do chat do programa):
+ *   - UMA ação por ticket: se o ledger já tem uma ação aplicada nele, o
+ *     segundo bloqueio vai para humano (não age de novo, registra);
+ *   - interruptor e trava global: passada.ts, antes de qualquer coisa;
+ *   - escrita no repo só por repo.ts (espera git, só o arquivo do ticket,
+ *     commit com trailer, nunca --no-verify, nunca push);
+ *   - fora do repo, só pela GuardaResolvedor.
+ *
+ * Modo sombra: o mesmo plano vira `proposta.md` (o diff que aplicaria), e o
+ * repo não é tocado. Em --dry-run, nem a proposta: só o registro do que faria.
+ */
+import { readFileSync } from 'node:fs'
+import { join } from 'node:path'
+import type { Diagnostico } from '../triador/triar.js'
+import { dirTicket, type GuardaResolvedor } from './caminhos.js'
+import type { Decisao } from './decidir.js'
+import { diffLinhas } from './diff.js'
+import { acoesDe, lerLedger, registrar } from './ledger.js'
+import { planejarR1, type Plano } from './r1.js'
+import { planejarR5 } from './r5.js'
+import { arquivoDoTicket, escreverEComitar, trailer } from './repo.js'
+
+export interface Feito {
+  feito: 'aplicado' | 'proposto' | 'faria' | 'nao_consegui'
+  motivo: string
+  commit?: string
+  proposta?: string
+  diff?: string
+}
+
+export interface Alvo {
+  repo: { nome: string; caminho: string }
+  id: string
+  diag: Diagnostico
+  decisao: Decisao
+  agora: number
+  dryRun: boolean
+  g: GuardaResolvedor
+}
+
+const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')
+const carimbo = (t: number) => iso(t).replace(/[-:]/g, '')
+
+/** O que mudou, em uma linha, para o ledger e a mensagem do commit. */
+function oQueMudou(tipo: 'r1_allowlist' | 'r5_reabrir', p: { teste?: string; criteriosLista?: number[]; guarda?: number; condicao?: string }): string {
+  if (tipo === 'r5_reabrir') return `reabriu (status pendente, nota vazia): ${p.condicao}`
+  const lista = p.criteriosLista?.length ? `; ${p.teste} na lista de criterio[${p.criteriosLista.join('], criterio[')}]` : ''
+  return `${p.teste} na allowlist${lista}; guarda de contagem em criterio[${p.guarda}]; reabriu (status pendente, nota vazia)`
+}
+
+export function agirR1R5(a: Alvo, tipo: 'r1_allowlist' | 'r5_reabrir'): Feito {
+  const { repo, id, diag } = a
+  const sombra = a.decisao.acao === 'sombra'
+  if (!sombra && acoesDe(lerLedger(), repo.nome, id).length) {
+    return { feito: 'nao_consegui', motivo: 'segunda vez bloqueado depois de uma ação do resolvedor: vai para humano' }
+  }
+  const rel = arquivoDoTicket(repo.caminho, id)
+  if (!rel) return { feito: 'nao_consegui', motivo: `não achei um arquivo docs/fila/${id}-*.md só` }
+  const antes = readFileSync(join(repo.caminho, rel), 'utf8')
+  const plano: Plano<{ novo: string; teste?: string; criteriosLista?: number[]; guarda?: number; condicao?: string }> =
+    tipo === 'r1_allowlist' ? planejarR1(repo.caminho, diag, antes, a.agora) : planejarR5(repo.caminho, diag, antes)
+  if (!plano.ok) return { feito: 'nao_consegui', motivo: plano.motivo }
+  const mudou = oQueMudou(tipo, plano.plano)
+  const diff = diffLinhas(antes, plano.plano.novo, rel)
+  if (a.dryRun) return { feito: 'faria', motivo: mudou, diff }
+  if (sombra) {
+    const dir = dirTicket(repo.nome, id)
+    const p = join(dir, 'proposta.md')
+    a.g.escrever(
+      p,
+      `# Proposta do resolvedor: ${repo.nome} ${id} (${diag.classe} ${diag.regra}, modo sombra)\n\n` +
+        `Gerada em ${iso(a.agora)} sobre o diagnóstico ${diag.assinatura}. Nada foi escrito no repo.\n\n` +
+        `- ação: ${tipo}\n- o que mudaria: ${mudou}\n- remédio do triador: ${diag.remedio}\n\n` +
+        `\`\`\`diff\n${diff}\`\`\`\n`,
+    )
+    a.g.escrever(join(dir, 'proposta.json'), JSON.stringify({ repo: repo.nome, id, tipo, classe: diag.classe, regra: diag.regra, assinatura: diag.assinatura, gerada_em: iso(a.agora), arquivo: rel, antes, depois: plano.plano.novo }, null, 2) + '\n')
+    return { feito: 'proposto', motivo: mudou, proposta: p, diff }
+  }
+  const classe = diag.classe!
+  const regra = diag.regra!
+  const msg = `orq-resolvedor: ${id} ${classe} ${regra}: ${mudou}\n\n${diag.remedio}\n\n${trailer(classe, regra, diag.assinatura)}\n`
+  const e = escreverEComitar(repo.caminho, id, rel, antes, plano.plano.novo, msg)
+  if (!e.ok) return { feito: 'nao_consegui', motivo: e.motivo }
+  const copia = join(dirTicket(repo.nome, id), 'acoes', carimbo(a.agora))
+  a.g.escrever(join(copia, 'antes.md'), antes)
+  a.g.escrever(join(copia, 'depois.md'), plano.plano.novo)
+  registrar(a.g, {
+    ts: iso(a.agora),
+    tipo: 'acao',
+    repo: repo.nome,
+    caminho: repo.caminho,
+    id,
+    classe,
+    regra,
+    assinatura: diag.assinatura,
+    acao: tipo,
+    mudou,
+    commit: e.commit,
+    arquivo: rel,
+    copia,
+    bloqueado_em: diag.bloqueio.quando,
+  })
+  return { feito: 'aplicado', motivo: mudou, commit: e.commit, diff }
+}
diff --git a/scripts/orquestrador/resolvedor/diff.ts b/scripts/orquestrador/resolvedor/diff.ts
new file mode 100644
index 0000000..42fa617
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/diff.ts
@@ -0,0 +1,38 @@
+/**
+ * diff.ts — diff de linhas (LCS), no formato unificado, para a proposta em
+ * sombra e para o dry-run mostrarem o que mudaria no ticket. PURO.
+ */
+export function diffLinhas(a: string, b: string, rotulo: string, contexto = 1): string {
+  const la = a.split('\n')
+  const lb = b.split('\n')
+  const n = la.length
+  const m = lb.length
+  // lcs[i][j] = tamanho do LCS de la[i..] e lb[j..]
+  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
+  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i]![j] = la[i] === lb[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!)
+  const ops: { t: ' ' | '-' | '+'; l: string; ia: number; ib: number }[] = []
+  let i = 0
+  let j = 0
+  while (i < n || j < m) {
+    if (i < n && j < m && la[i] === lb[j]) ops.push({ t: ' ', l: la[i]!, ia: i++, ib: j++ })
+    else if (j < m && (i === n || lcs[i]![j + 1]! >= lcs[i + 1]![j]!)) ops.push({ t: '+', l: lb[j]!, ia: i, ib: j++ })
+    else ops.push({ t: '-', l: la[i]!, ia: i++, ib: j })
+  }
+  const muda = ops.map((o, k) => (o.t !== ' ' ? k : -1)).filter((k) => k >= 0)
+  if (!muda.length) return ''
+  const out = [`--- a/${rotulo}`, `+++ b/${rotulo}`]
+  let k = 0
+  while (k < muda.length) {
+    const ini = Math.max(0, muda[k]! - contexto)
+    let fim = muda[k]!
+    while (k + 1 < muda.length && muda[k + 1]! - fim <= 2 * contexto + 1) fim = muda[++k]!
+    fim = Math.min(ops.length - 1, fim + contexto)
+    const h = ops.slice(ini, fim + 1)
+    const na = h.filter((o) => o.t !== '+').length
+    const nb = h.filter((o) => o.t !== '-').length
+    out.push(`@@ -${h[0]!.ia + 1},${na} +${h[0]!.ib + 1},${nb} @@`)
+    for (const o of h) out.push(`${o.t}${o.l}`)
+    k++
+  }
+  return out.join('\n') + '\n'
+}
diff --git a/scripts/orquestrador/resolvedor/ledger.ts b/scripts/orquestrador/resolvedor/ledger.ts
new file mode 100644
index 0000000..6ba8bcb
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/ledger.ts
@@ -0,0 +1,47 @@
+/**
+ * ledger.ts — `~/.orq/resolvedor/ledger.jsonl`: uma linha JSON por fato, só
+ * acrescentada (etapa 7f-b2).
+ *
+ *   acao        uma ação aplicada no repo: classe, regra, assinatura, o que
+ *               mudou, commit, arquivo, e a cópia do antes/depois
+ *               (`acoes/<ts>/`, o desfazer usa)
+ */
+import { readFileSync } from 'node:fs'
+import { arquivoLedger, type GuardaResolvedor } from './caminhos.js'
+
+export interface Entrada {
+  ts: string
+  tipo: string
+  repo: string
+  id?: string
+  classe?: string | null
+  regra?: string | null
+  assinatura?: string
+  [k: string]: unknown
+}
+
+export function lerLedger(): Entrada[] {
+  let txt = ''
+  try {
+    txt = readFileSync(arquivoLedger(), 'utf8')
+  } catch {
+    return []
+  }
+  const out: Entrada[] = []
+  for (const l of txt.split('\n')) {
+    if (!l.trim()) continue
+    try {
+      out.push(JSON.parse(l) as Entrada)
+    } catch {
+      /* linha cortada: ignora, o resto vale */
+    }
+  }
+  return out
+}
+
+export function registrar(g: GuardaResolvedor, e: Entrada): void {
+  g.acrescentar(arquivoLedger(), JSON.stringify(e))
+}
+
+/** As ações aplicadas num ticket, da mais antiga à mais nova. */
+export const acoesDe = (l: Entrada[], repo: string, id: string): Entrada[] => l.filter((e) => e.tipo === 'acao' && e.repo === repo && e.id === id)
diff --git a/scripts/orquestrador/resolvedor/passada.ts b/scripts/orquestrador/resolvedor/passada.ts
index dedc06e..22c6319 100644
--- a/scripts/orquestrador/resolvedor/passada.ts
+++ b/scripts/orquestrador/resolvedor/passada.ts
@@ -11,14 +11,19 @@
  *
  * --dry-run não escreve no repo, não chama modelo e não toca o ledger: grava
  * só `dry-run.jsonl` (caminhos.ts) e imprime.
+ *
+ * Travas da passada: o interruptor (`RESOLVEDOR_PAUSADO`) existindo, nada roda
+ * (nem triagem, nem ledger); e uma passada por vez na máquina (`resolver.lock`,
+ * O_EXCL). As travas por ação estão em acoes.ts e repo.ts.
  */
-import { readdirSync, readFileSync } from 'node:fs'
+import { existsSync, readdirSync, readFileSync } from 'node:fs'
 import { join } from 'node:path'
 import { blocoJson } from '../triador/comum.js'
 import { criarPassoModelo, lerConfigModelo } from '../triador/modelo.js'
 import { Guarda, lerDiagnostico } from '../triador/saida.js'
 import { bloqueados, triarTicket, type Diagnostico } from '../triador/triar.js'
-import { GuardaResolvedor, arquivoDryRun } from './caminhos.js'
+import { agirR1R5 } from './acoes.js'
+import { GuardaResolvedor, arquivoDryRun, interruptor, travarPassada } from './caminhos.js'
 import { decidir, type Decisao } from './decidir.js'
 import { acharRepo, lerReposResolvedor, type Modo, type RepoResolvedor } from './modos.js'
 
@@ -97,10 +102,13 @@ export interface Contexto {
   g: GuardaResolvedor
 }
 
-/** O que a ação faz (ou faria). Peça 2: nenhuma ação escreve ainda. */
-export function executar(c: Contexto): Pick<ItemPassada, 'feito' | 'motivo' | 'commit' | 'proposta'> {
+/** O que a ação faz (ou faria). */
+export function executar(c: Contexto): Pick<ItemPassada, 'feito' | 'motivo' | 'commit' | 'proposta'> & { diff?: string } {
   const { decisao: d } = c
   if (d.acao === 'diagnostico' || d.acao === 'aviso') return { feito: d.acao, motivo: d.motivo }
+  const alvo = { repo: c.repo, id: c.id, diag: c.diag, decisao: d, agora: c.agora, dryRun: c.dryRun, g: c.g }
+  if (d.acao === 'r1_allowlist' || d.acao === 'r5_reabrir') return agirR1R5(alvo, d.acao)
+  if (d.acao === 'sombra' && d.propoe) return agirR1R5(alvo, d.propoe)
   if (c.dryRun) return { feito: 'faria', motivo: d.motivo }
   return { feito: 'nao_consegui', motivo: `ação ${d.acao} ainda não implementada` }
 }
@@ -108,25 +116,39 @@ export function executar(c: Contexto): Pick<ItemPassada, 'feito' | 'motivo' | 'c
 export function passada(o: OpcoesPassada = {}): ResultadoPassada {
   const agora = o.agora ?? Date.now()
   const dryRun = o.dryRun === true
+  if (existsSync(interruptor())) return { pausado: true, travado: false, itens: [] }
   const repos = o.repo ? [acharRepo(o.repo)] : lerReposResolvedor()
   const g = new GuardaResolvedor(repos.map((r) => r.caminho))
+  const soltar = travarPassada(g)
+  if (!soltar) return { pausado: false, travado: true, itens: [] }
+  try {
+    return { pausado: false, travado: false, itens: passadaTravada(repos, g, agora, dryRun, o.semModelo === true) }
+  } finally {
+    soltar()
+  }
+}
+
+function passadaTravada(repos: RepoResolvedor[], g: GuardaResolvedor, agora: number, dryRun: boolean, semModelo: boolean): ItemPassada[] {
   const itens: ItemPassada[] = []
   for (const repo of repos) {
+    // o interruptor vale também no meio da passada: entre um ticket e outro
+    if (existsSync(interruptor())) break
     for (const { id, dependentes } of ordenarBloqueados(repo.caminho)) {
-      const diag = triar(repo, id, agora, o.semModelo === true || dryRun)
+      if (existsSync(interruptor())) break
+      const diag = triar(repo, id, agora, semModelo || dryRun)
       const base = { repo: repo.nome, id, dependentes, classe: diag?.classe ?? null, regra: diag?.regra ?? null, firme: diag?.firme ?? false }
       if (!diag) {
         itens.push({ ...base, modo: 'diagnostico', acao: 'aviso', feito: 'nao_consegui', motivo: 'sem diagnóstico (triagem travada por outro processo?)' })
         continue
       }
       const decisao = decidir(diag, repo.modos)
-      const r = executar({ repo, id, diag, decisao, dependentes, agora, dryRun, g })
+      const { diff, ...r } = executar({ repo, id, diag, decisao, dependentes, agora, dryRun, g })
       const item: ItemPassada = { ...base, modo: decisao.modo, acao: decisao.acao, ...r }
       itens.push(item)
-      if (dryRun) g.acrescentar(arquivoDryRun(), JSON.stringify({ ts: new Date(agora).toISOString(), ...item, assinatura: diag.assinatura }))
+      if (dryRun) g.acrescentar(arquivoDryRun(), JSON.stringify({ ts: new Date(agora).toISOString(), ...item, assinatura: diag.assinatura, ...(diff ? { diff } : {}) }))
     }
   }
-  return { pausado: false, travado: false, itens }
+  return itens
 }
 
 export function resumo(r: ResultadoPassada): string {
diff --git a/scripts/orquestrador/resolvedor/r1.ts b/scripts/orquestrador/resolvedor/r1.ts
new file mode 100644
index 0000000..01a7879
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/r1.ts
@@ -0,0 +1,161 @@
+/**
+ * r1.ts — a ação de R1 (teste acoplado fora da allowlist), no formato do
+ * conserto humano do 840 (7787af3, ~/orq-sessoes/conserto-840-929.md):
+ *
+ *   1. o teste vai para o fim de `pathspec_allowlist`;
+ *   2. todo critério cujo cmd lista os arquivos permitidos (todos os caminhos
+ *      da allowlist, entre aspas simples) ganha o mesmo caminho depois do
+ *      último deles — sem isso, editar o teste daria `FORA_<teste>` e o ticket
+ *      bloquearia de novo;
+ *   3. a guarda de contagem entra depois da última guarda (`tipo: guarda`), ou
+ *      antes do critério do avaliador: `it(`+`test(` e `expect(` no mínimo a
+ *      contagem ATUAL do teste no branch alvo, e zero `.skip/.only/.todo` (o
+ *      piso numérico do 711b3, com `|| true` e `${x:-…}`, que não aborta sob
+ *      `set -u`);
+ *   4. o ticket reabre (status `pendente`, nota vazia).
+ *
+ * Só planeja: devolve o .md novo ou o motivo de não conseguir. Quem escreve é
+ * acoes.ts. O git é só `gitLeitura` (show do branch alvo).
+ */
+import { readFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { gitLeitura } from '../triador/git.js'
+import type { Diagnostico } from '../triador/triar.js'
+import { acrescentarAllowlist, bloco, EdicaoRecusada, inserirCriterio, reabrir, trocarCmd } from './ticket-md.js'
+
+export type Plano<T> = { ok: true; plano: T } | { ok: false; motivo: string }
+
+export interface Contagem {
+  it: number
+  test: number
+  expect: number
+  skip: number
+}
+
+export interface PlanoR1 {
+  teste: string
+  /** o ref onde a contagem foi medida (`staging-auto` ou `origin/staging-auto`) */
+  ref: string
+  contagem: Contagem
+  /** índices dos critérios que listam os arquivos permitidos (o caminho entrou neles) */
+  criteriosLista: number[]
+  /** índice do critério novo (a guarda) no ticket novo */
+  guarda: number
+  novo: string
+}
+
+/** Contagem por LINHA, como `grep -c` (a mesma régua que a guarda usa ao rodar). */
+export function contar(fonte: string): Contagem {
+  const ls = fonte.split('\n')
+  if (ls.at(-1) === '') ls.pop()
+  const n = (f: (l: string) => boolean) => ls.filter(f).length
+  return {
+    it: n((l) => l.includes('it(')),
+    test: n((l) => l.includes('test(')),
+    expect: n((l) => l.includes('expect(')),
+    skip: n((l) => /[.](skip|only|todo)[(]/.test(l)),
+  }
+}
+
+const shellSeguro = (s: string) => (/^[A-Za-z0-9._/-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`)
+
+/** O cmd da guarda, letra por letra o do 840 (piso numérico do 711b3). */
+export function cmdGuarda(teste: string, minItTest: number, minExpect: number): string {
+  return (
+    `f=${shellSeguro(teste)}; [ -f "$f" ] || { echo APAGOU_$f; exit 0; }; ` +
+    `i=$(grep -cF 'it(' "$f" || true); t=$(grep -cF 'test(' "$f" || true); e=$(grep -cF 'expect(' "$f" || true); ` +
+    `s=$(grep -cE '[.](skip|only|todo)[(]' "$f" || true); ` +
+    `[ $(( \${i:-0} + \${t:-0} )) -ge ${minItTest} ] && [ "\${e:-0}" -ge ${minExpect} ] && [ "\${s:-x}" = 0 ] && echo CONTAGEM_MANTIDA || echo CAIU_\${i:-x}_\${t:-x}_\${e:-x}_\${s:-x}`
+  )
+}
+
+const ddmm = (agora: number) => {
+  const d = new Date(agora)
+  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
+}
+
+export function descricaoGuarda(teste: string, c: Contagem, ref: string, assinatura: string, agora: number): string {
+  return (
+    `anti-afrouxamento: ${teste} (entrou na allowlist em ${ddmm(agora)} pelo resolvedor, R1 D6 ${assinatura.slice(0, 12)}: vermelho fora da allowlist acoplado ao diff) ` +
+    `mantem >= ${c.it + c.test} it(/test( e >= ${c.expect} expect( e nao tem .skip/.only/.todo ` +
+    `(medido em ${ref} em ${ddmm(agora)}: ${c.it} it(, ${c.test} test(, ${c.expect} expect(, ${c.skip} skip/only/todo)`
+  )
+}
+
+/** O branch alvo do config do repo (`branch_alvo`, padrão `staging-auto`, o mesmo do triador). */
+export function branchAlvo(raiz: string): string {
+  try {
+    const c = JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as { branch_alvo?: unknown }
+    if (typeof c.branch_alvo === 'string' && c.branch_alvo) return c.branch_alvo
+  } catch {
+    /* sem config: o padrão */
+  }
+  return 'staging-auto'
+}
+
+/** O arquivo no branch alvo (local, depois `origin/`), por `gitLeitura`. */
+export function noAlvo(raiz: string, arquivo: string): { ref: string; texto: string } | null {
+  const alvo = branchAlvo(raiz)
+  for (const ref of [alvo, `origin/${alvo}`]) {
+    const r = gitLeitura(raiz, ['show', `${ref}:${arquivo}`])
+    if (r.rc === 0) return { ref, texto: r.stdout }
+  }
+  return null
+}
+
+export function planejarR1(raiz: string, diag: Diagnostico, md: string, agora: number): Plano<PlanoR1> {
+  const teste = /^pôr (\S+) na allowlist/.exec(diag.remedio)?.[1]
+  const fora = diag.extracao.fora_da_allowlist_e_do_diff
+  if (!teste) return { ok: false, motivo: 'o remédio do diagnóstico não nomeia o teste' }
+  if (fora.length !== 1 || fora[0] !== teste) return { ok: false, motivo: `mais de um vermelho fora da allowlist (${fora.join(', ')}): um conserto só não destrava` }
+  let j: Record<string, unknown>
+  try {
+    j = bloco(md).json
+  } catch (e) {
+    return { ok: false, motivo: (e as Error).message }
+  }
+  const al = Array.isArray(j.pathspec_allowlist) ? (j.pathspec_allowlist as unknown[]).filter((x): x is string => typeof x === 'string') : []
+  if (al.includes(teste)) return { ok: false, motivo: `${teste} já está na allowlist` }
+  const fonte = noAlvo(raiz, teste)
+  if (!fonte) return { ok: false, motivo: `${teste} não existe no branch alvo (${branchAlvo(raiz)}): sem contagem para a guarda` }
+  const c = contar(fonte.texto)
+  if (c.skip > 0) return { ok: false, motivo: `${teste} já tem ${c.skip} .skip/.only/.todo em ${fonte.ref}: a guarda exige zero` }
+  if (c.it + c.test === 0 || c.expect === 0) return { ok: false, motivo: `${teste} sem it(/test( ou expect( em ${fonte.ref}: nada a guardar` }
+
+  const cs = Array.isArray(j.criterios_aceite) ? (j.criterios_aceite as Record<string, unknown>[]) : []
+  const lista: number[] = []
+  cs.forEach((cr, i) => {
+    if (typeof cr?.cmd === 'string' && al.length > 0 && al.every((a) => (cr.cmd as string).includes(`'${a}'`))) lista.push(i)
+  })
+  let ultimaGuarda = -1
+  cs.forEach((cr, i) => {
+    if (cr?.tipo === 'guarda') ultimaGuarda = i
+  })
+  const avaliador = cs.findIndex((cr) => cr?.espera === 'avaliador')
+  const depoisDe = ultimaGuarda >= 0 ? ultimaGuarda : avaliador > 0 ? avaliador - 1 : cs.length - 1
+  if (depoisDe < 0) return { ok: false, motivo: 'ticket sem critério: não há onde pôr a guarda' }
+
+  try {
+    let novo = acrescentarAllowlist(md, teste)
+    for (const i of lista) {
+      const cmd = cs[i]!.cmd as string
+      let fim = -1
+      for (const a of al) {
+        const p = cmd.lastIndexOf(`'${a}'`)
+        if (p >= 0) fim = Math.max(fim, p + a.length + 2)
+      }
+      novo = trocarCmd(novo, i, `${cmd.slice(0, fim)} '${teste}'${cmd.slice(fim)}`)
+    }
+    novo = inserirCriterio(novo, depoisDe, {
+      descricao: descricaoGuarda(teste, c, fonte.ref, diag.assinatura, agora),
+      cmd: cmdGuarda(teste, c.it + c.test, c.expect),
+      espera: 'CONTAGEM_MANTIDA',
+      tipo: 'guarda',
+    })
+    novo = reabrir(novo)
+    return { ok: true, plano: { teste, ref: fonte.ref, contagem: c, criteriosLista: lista, guarda: depoisDe + 1, novo } }
+  } catch (e) {
+    if (e instanceof EdicaoRecusada) return { ok: false, motivo: `edição do ticket recusada: ${e.message}` }
+    throw e
+  }
+}
diff --git a/scripts/orquestrador/resolvedor/r5.ts b/scripts/orquestrador/resolvedor/r5.ts
new file mode 100644
index 0000000..c0dbbde
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/r5.ts
@@ -0,0 +1,74 @@
+/**
+ * r5.ts — quando um R5 de ambiente pode reabrir (decisão do chat do programa:
+ * reabre quando a condição some, verificável SEM rodar suíte).
+ *
+ *   árvore suja (D1)  a worktree alvo (`worktrees_dir`/`branch_alvo` do config,
+ *                     os mesmos do triador) com `git status --porcelain` vazio,
+ *                     por `gitLeitura` (GIT_OPTIONAL_LOCKS=0)
+ *   máquina (D4)      carga de 1 min por CPU ≤ 0,75 e ≥ 2 GiB livres no disco do
+ *                     repo (o sinal pode ser worker do vitest, EMFILE ou ENOSPC:
+ *                     os dois valem sempre)
+ *   base vermelha (D5) não reabre nesta etapa (decidir.ts nem chega aqui)
+ *
+ * `ORQ_RESOLVEDOR_MAQUINA` (json `{carga, cpus, livre_bytes}`) troca a leitura
+ * da máquina nos testes.
+ */
+import { existsSync, readFileSync, statfsSync } from 'node:fs'
+import { cpus, loadavg } from 'node:os'
+import { join, resolve } from 'node:path'
+import { gitLeitura } from '../triador/git.js'
+import type { Diagnostico } from '../triador/triar.js'
+import { branchAlvo, type Plano } from './r1.js'
+import { EdicaoRecusada, reabrir } from './ticket-md.js'
+
+export const CARGA_MAX_POR_CPU = 0.75
+export const LIVRE_MIN_BYTES = 2 * 1024 ** 3
+
+export function worktreeAlvo(raiz: string): string {
+  let dir = '../_worktrees'
+  try {
+    const c = JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as { worktrees_dir?: unknown }
+    if (typeof c.worktrees_dir === 'string' && c.worktrees_dir) dir = c.worktrees_dir
+  } catch {
+    /* sem config: o padrão do triador */
+  }
+  return resolve(raiz, dir, branchAlvo(raiz))
+}
+
+export function maquina(raiz: string): { carga: number; cpus: number; livre_bytes: number } {
+  const f = process.env.ORQ_RESOLVEDOR_MAQUINA
+  if (f) return JSON.parse(f) as { carga: number; cpus: number; livre_bytes: number }
+  const s = statfsSync(raiz)
+  return { carga: loadavg()[0] ?? 0, cpus: cpus().length || 1, livre_bytes: s.bavail * s.bsize }
+}
+
+/** A condição do R5 sumiu? `null` = sumiu; senão o motivo de ainda não reabrir. */
+export function condicaoR5(raiz: string, diag: Diagnostico): string | null {
+  if (diag.regra === 'D1') {
+    const wt = worktreeAlvo(raiz)
+    if (!existsSync(wt)) return `worktree alvo ${wt} não existe: não dá para ver se está limpa`
+    const r = gitLeitura(wt, ['status', '--porcelain'])
+    if (r.rc !== 0) return `git status na worktree alvo falhou (rc ${r.rc})`
+    const n = r.stdout.split('\n').filter(Boolean)
+    return n.length ? `árvore alvo ainda suja: ${n.length} arquivo(s) (${n.slice(0, 3).map((l) => l.slice(3)).join(', ')})` : null
+  }
+  if (diag.regra === 'D4') {
+    const m = maquina(raiz)
+    const porCpu = m.carga / Math.max(1, m.cpus)
+    if (porCpu > CARGA_MAX_POR_CPU) return `máquina ocupada: carga ${m.carga.toFixed(2)} em ${m.cpus} CPU(s) (> ${CARGA_MAX_POR_CPU} por CPU)`
+    if (m.livre_bytes < LIVRE_MIN_BYTES) return `disco cheio: ${(m.livre_bytes / 1024 ** 3).toFixed(1)} GiB livres (< 2 GiB)`
+    return null
+  }
+  return `R5 ${diag.regra ?? 'sem regra'}: sem condição verificável nesta etapa`
+}
+
+export function planejarR5(raiz: string, diag: Diagnostico, md: string): Plano<{ novo: string; condicao: string }> {
+  const falta = condicaoR5(raiz, diag)
+  if (falta) return { ok: false, motivo: falta }
+  try {
+    return { ok: true, plano: { novo: reabrir(md), condicao: diag.regra === 'D1' ? 'árvore alvo limpa' : 'máquina livre' } }
+  } catch (e) {
+    if (e instanceof EdicaoRecusada) return { ok: false, motivo: `edição do ticket recusada: ${e.message}` }
+    throw e
+  }
+}
diff --git a/scripts/orquestrador/resolvedor/repo.ts b/scripts/orquestrador/resolvedor/repo.ts
new file mode 100644
index 0000000..f14a663
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/repo.ts
@@ -0,0 +1,112 @@
+/**
+ * repo.ts — a ÚNICA porta de escrita do resolvedor DENTRO de um repo
+ * instalado (decisões do chat do programa, 7f-b2).
+ *
+ *   - só o arquivo do ticket bloqueado: `docs/fila/<id>-<slug>.md`, com o
+ *     caminho real dentro de `<raiz>/docs/fila` (symlink que sai de lá é recusado);
+ *   - antes de escrever, espera nenhum git rodando: nem `index.lock`/`HEAD.lock`
+ *     no git dir, nem processo `git` (`pgrep -x git`; `ORQ_RESOLVEDOR_PGREP`
+ *     troca o binário nos testes), até `ORQ_RESOLVEDOR_ESPERA_GIT_S` (60 s);
+ *   - o arquivo tem de estar como foi lido (senão outro processo mexeu: não age);
+ *   - commit só daquele arquivo (`git commit --only -- <arquivo>`: o que mais
+ *     estiver no índice fica onde está), com o trailer
+ *     `Orq-Resolvedor: <classe> <regra> <assinatura>`;
+ *   - NUNCA `--no-verify`: o hook do repo (no Comarka, validar-fila) é a
+ *     segunda trava; se ele recusar, o arquivo volta ao que era;
+ *   - nunca push, nunca outro verbo de escrita.
+ *
+ * Toda leitura de git continua em `gitLeitura` (GIT_OPTIONAL_LOCKS=0).
+ */
+import { spawnSync } from 'node:child_process'
+import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
+import { isAbsolute, join, resolve } from 'node:path'
+import { gitLeitura } from '../triador/git.js'
+import { dentro } from './caminhos.js'
+
+export class EscritaNoRepoRecusada extends Error {}
+
+/** `docs/fila/<id>-<slug>.md` do ticket (relativo à raiz), se há exatamente um. */
+export function arquivoDoTicket(raiz: string, id: string): string | null {
+  let nomes: string[] = []
+  try {
+    nomes = readdirSync(join(raiz, 'docs/fila')).filter((f) => f.startsWith(`${id}-`) && f.endsWith('.md'))
+  } catch {
+    return null
+  }
+  return nomes.length === 1 ? `docs/fila/${nomes[0]}` : null
+}
+
+/** O caminho real do arquivo do ticket, ou exceção se ele não é o ticket do id dentro de docs/fila. */
+export function confereTicket(raiz: string, id: string, rel: string): string {
+  if (isAbsolute(rel) || !new RegExp(`^docs/fila/${id.replace(/[^0-9a-z]/g, '')}-[^/]+\\.md$`).test(rel)) {
+    throw new EscritaNoRepoRecusada(`escrita fora do ticket ${id}: ${rel}`)
+  }
+  const abs = resolve(raiz, rel)
+  if (!existsSync(abs) || lstatSync(abs).isSymbolicLink()) throw new EscritaNoRepoRecusada(`ticket ${rel} não existe ou é symlink`)
+  const fila = realpathSync(join(raiz, 'docs/fila'))
+  const real = realpathSync(abs)
+  if (!dentro(real, fila) || real === fila) throw new EscritaNoRepoRecusada(`ticket ${rel} sai de docs/fila: ${real}`)
+  return real
+}
+
+const dorme = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
+
+/** Por que não dá para escrever agora (git rodando), ou `null`. */
+export function gitRodando(raiz: string): string | null {
+  const gd = gitLeitura(raiz, ['rev-parse', '--absolute-git-dir'])
+  if (gd.rc === 0) {
+    for (const f of ['index.lock', 'HEAD.lock']) if (existsSync(join(gd.stdout.trim(), f))) return `${f} no git dir`
+  }
+  const p = spawnSync(process.env.ORQ_RESOLVEDOR_PGREP || 'pgrep', ['-x', 'git'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
+  if (p.status === 0 && p.stdout.trim()) return `processo git rodando (pid ${p.stdout.trim().split('\n').join(', ')})`
+  return null
+}
+
+/** Espera nenhum git rodando; devolve o último motivo se o tempo acabou. */
+export function esperarGit(raiz: string): string | null {
+  const max = Number(process.env.ORQ_RESOLVEDOR_ESPERA_GIT_S ?? 60) * 1000
+  const ini = Date.now()
+  for (;;) {
+    const m = gitRodando(raiz)
+    if (!m) return null
+    if (Date.now() - ini >= max) return m
+    dorme(250)
+  }
+}
+
+export const trailer = (classe: string, regra: string, assinatura: string) => `Orq-Resolvedor: ${classe} ${regra} ${assinatura}`
+
+function gitEscrita(raiz: string, args: string[]): { rc: number; saida: string } {
+  if (args[0] !== 'commit' || args.includes('--no-verify') || args.includes('-n')) throw new EscritaNoRepoRecusada(`verbo de escrita proibido: git ${args.join(' ')}`)
+  const r = spawnSync('git', ['-C', raiz, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
+  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
+}
+
+export type Escrita = { ok: true; commit: string } | { ok: false; motivo: string }
+
+/**
+ * Troca o ticket de `antes` para `novo` e faz o commit só dele. Se qualquer
+ * coisa falha depois de escrever (hook, commit com outro arquivo), o arquivo
+ * volta a `antes`.
+ */
+export function escreverEComitar(raiz: string, id: string, rel: string, antes: string, novo: string, mensagem: string): Escrita {
+  const real = confereTicket(raiz, id, rel)
+  const esperando = esperarGit(raiz)
+  if (esperando) return { ok: false, motivo: `git rodando: ${esperando}` }
+  if (readFileSync(real, 'utf8') !== antes) return { ok: false, motivo: 'o ticket mudou desde a leitura: outro processo mexeu' }
+  const headAntes = gitLeitura(raiz, ['rev-parse', 'HEAD']).stdout.trim()
+  writeFileSync(real, novo)
+  const c = gitEscrita(raiz, ['commit', '--only', '-q', '-m', mensagem, '--', rel])
+  if (c.rc !== 0) {
+    writeFileSync(real, antes)
+    return { ok: false, motivo: `commit recusado (rc ${c.rc}): ${c.saida.split('\n').slice(-3).join(' | ').slice(0, 300)}` }
+  }
+  const sha = gitLeitura(raiz, ['rev-parse', 'HEAD']).stdout.trim()
+  const arquivos = gitLeitura(raiz, ['show', '--name-only', '--format=', sha]).stdout.split('\n').filter(Boolean)
+  const pai = gitLeitura(raiz, ['rev-parse', `${sha}^`]).stdout.trim()
+  if (arquivos.length !== 1 || arquivos[0] !== rel || pai !== headAntes) {
+    // não desfaz o commit de outro jeito que não seja pela mão humana: avisa alto
+    return { ok: false, motivo: `commit ${sha} inesperado (arquivos: ${arquivos.join(', ')}; pai ${pai}): conferir à mão` }
+  }
+  return { ok: true, commit: sha }
+}
diff --git a/scripts/orquestrador/resolvedor/ticket-md.ts b/scripts/orquestrador/resolvedor/ticket-md.ts
new file mode 100644
index 0000000..61d2b94
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/ticket-md.ts
@@ -0,0 +1,230 @@
+/**
+ * ticket-md.ts — edições no 1º bloco ```json de um ticket .md (CONTRATO §2)
+ * que mudam SÓ o necessário e mantêm o resto byte a byte (etapa 7f-b2).
+ *
+ * O texto não é reserializado: um analisador de JSON com posições acha o
+ * trecho exato de cada valor, e a edição troca ou insere só ali, no recuo que
+ * o arquivo já usa. Toda edição é conferida por parse: o objeto novo tem de
+ * ser IGUAL ao esperado (o antigo com a mudança pedida), senão lança
+ * `EdicaoRecusada` e nada é escrito. Assim o diff do resolvedor é o diff que um
+ * humano faria à mão (o gabarito 7787af3/819c49a da peça 1).
+ *
+ * PURO: nada aqui lê ou escreve disco.
+ */
+import { isDeepStrictEqual } from 'node:util'
+
+export class EdicaoRecusada extends Error {}
+
+interface No {
+  ini: number
+  fim: number
+  tipo: 'objeto' | 'lista' | 'valor'
+  campos?: Map<string, No>
+  itens?: No[]
+}
+
+/** Analisador de JSON que guarda [ini, fim) de cada valor. Lança em JSON inválido. */
+function analisar(t: string): No {
+  let i = 0
+  const ws = () => {
+    while (i < t.length && ' \t\n\r'.includes(t[i]!)) i++
+  }
+  const erro = (o: string): never => {
+    throw new EdicaoRecusada(`json inválido em ${i}: ${o}`)
+  }
+  const texto = (): string => {
+    const ini = i
+    if (t[i] !== '"') erro('esperava "')
+    i++
+    while (i < t.length && t[i] !== '"') i += t[i] === '\\' ? 2 : 1
+    if (t[i] !== '"') erro('string sem fim')
+    i++
+    return JSON.parse(t.slice(ini, i)) as string
+  }
+  const valor = (): No => {
+    ws()
+    const ini = i
+    const c = t[i]
+    if (c === '{') {
+      i++
+      const campos = new Map<string, No>()
+      ws()
+      if (t[i] === '}') {
+        i++
+        return { ini, fim: i, tipo: 'objeto', campos }
+      }
+      for (;;) {
+        ws()
+        const k = texto()
+        ws()
+        if (t[i] !== ':') erro('esperava :')
+        i++
+        campos.set(k, valor())
+        ws()
+        if (t[i] === ',') {
+          i++
+          continue
+        }
+        if (t[i] === '}') {
+          i++
+          return { ini, fim: i, tipo: 'objeto', campos }
+        }
+        erro('esperava , ou }')
+      }
+    }
+    if (c === '[') {
+      i++
+      const itens: No[] = []
+      ws()
+      if (t[i] === ']') {
+        i++
+        return { ini, fim: i, tipo: 'lista', itens }
+      }
+      for (;;) {
+        itens.push(valor())
+        ws()
+        if (t[i] === ',') {
+          i++
+          continue
+        }
+        if (t[i] === ']') {
+          i++
+          return { ini, fim: i, tipo: 'lista', itens }
+        }
+        erro('esperava , ou ]')
+      }
+    }
+    if (c === '"') {
+      texto()
+      return { ini, fim: i, tipo: 'valor' }
+    }
+    const m = /^(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(t.slice(i))
+    if (!m) erro('valor desconhecido')
+    i += m![0].length
+    return { ini, fim: i, tipo: 'valor' }
+  }
+  const raiz = valor()
+  ws()
+  if (i !== t.length) erro('sobra depois do json')
+  return raiz
+}
+
+export interface Bloco {
+  /** posição do texto json dentro do .md */
+  ini: number
+  fim: number
+  texto: string
+  json: Record<string, unknown>
+}
+
+/** O PRIMEIRO bloco ```json (o mesmo de `blocoJson` do triador). */
+export function bloco(md: string): Bloco {
+  const m = /```json\n([\s\S]*?)\n```/.exec(md)
+  if (!m) throw new EdicaoRecusada('ticket sem bloco ```json')
+  const ini = m.index + '```json\n'.length
+  const texto = m[1]!
+  let json: unknown
+  try {
+    json = JSON.parse(texto)
+  } catch (e) {
+    throw new EdicaoRecusada(`bloco json ilegível: ${(e as Error).message}`)
+  }
+  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new EdicaoRecusada('bloco json não é objeto')
+  return { ini, fim: ini + texto.length, texto, json: json as Record<string, unknown> }
+}
+
+/** O recuo (espaços do começo da linha) de uma posição. */
+function recuo(t: string, pos: number): string {
+  const ini = t.lastIndexOf('\n', pos - 1) + 1
+  return /^[ \t]*/.exec(t.slice(ini))![0]
+}
+
+type Edicao = { ini: number; fim: number; novo: string }
+
+function aplicar(t: string, es: Edicao[]): string {
+  let out = t
+  for (const e of [...es].sort((a, b) => b.ini - a.ini)) out = out.slice(0, e.ini) + e.novo + out.slice(e.fim)
+  return out
+}
+
+/**
+ * Aplica edições ao bloco e confere: o json novo tem de ser `esperado`.
+ * Devolve o .md inteiro.
+ */
+function editar(md: string, f: (t: string, raiz: No, json: Record<string, unknown>) => { edicoes: Edicao[]; esperado: Record<string, unknown> }): string {
+  const b = bloco(md)
+  const raiz = analisar(b.texto)
+  if (raiz.tipo !== 'objeto') throw new EdicaoRecusada('bloco json não é objeto')
+  const { edicoes, esperado } = f(b.texto, raiz, b.json)
+  const novo = aplicar(b.texto, edicoes)
+  let obtido: unknown
+  try {
+    obtido = JSON.parse(novo)
+  } catch (e) {
+    throw new EdicaoRecusada(`a edição quebrou o json: ${(e as Error).message}`)
+  }
+  if (!isDeepStrictEqual(obtido, esperado)) throw new EdicaoRecusada('a edição não deu o objeto esperado')
+  return md.slice(0, b.ini) + novo + md.slice(b.fim)
+}
+
+const campo = (n: No, k: string): No | undefined => n.campos?.get(k)
+
+/** status → `pendente`, notas_status → "" (o reabrir do humano no 840, 940 e 932). */
+export function reabrir(md: string): string {
+  return editar(md, (_t, raiz, j) => {
+    if (j.status !== 'bloqueado') throw new EdicaoRecusada(`status é ${JSON.stringify(j.status)}, não bloqueado`)
+    const es: Edicao[] = []
+    const st = campo(raiz, 'status')!
+    es.push({ ini: st.ini, fim: st.fim, novo: '"pendente"' })
+    const nt = campo(raiz, 'notas_status')
+    if (nt) es.push({ ini: nt.ini, fim: nt.fim, novo: '""' })
+    return { edicoes: es, esperado: { ...j, status: 'pendente', ...(nt ? { notas_status: '' } : {}) } }
+  })
+}
+
+/** Acrescenta um caminho no fim de `pathspec_allowlist`, no recuo dos outros. */
+export function acrescentarAllowlist(md: string, caminho: string): string {
+  return editar(md, (t, raiz, j) => {
+    const al = campo(raiz, 'pathspec_allowlist')
+    const ultimo = al?.itens?.at(-1)
+    if (!al || al.tipo !== 'lista' || !ultimo) throw new EdicaoRecusada('pathspec_allowlist ausente ou vazia')
+    const lista = j.pathspec_allowlist as unknown[]
+    return {
+      edicoes: [{ ini: ultimo.fim, fim: ultimo.fim, novo: `,\n${recuo(t, ultimo.ini)}${JSON.stringify(caminho)}` }],
+      esperado: { ...j, pathspec_allowlist: [...lista, caminho] },
+    }
+  })
+}
+
+/** Troca o `cmd` do critério `indice` de `criterios_aceite`. */
+export function trocarCmd(md: string, indice: number, novo: string): string {
+  return editar(md, (_t, raiz, j) => {
+    const c = campo(raiz, 'criterios_aceite')?.itens?.[indice]
+    const cmd = c && campo(c, 'cmd')
+    if (!cmd) throw new EdicaoRecusada(`criterio[${indice}] sem cmd`)
+    const cs = [...(j.criterios_aceite as Record<string, unknown>[])]
+    cs[indice] = { ...cs[indice], cmd: novo }
+    return { edicoes: [{ ini: cmd.ini, fim: cmd.fim, novo: JSON.stringify(novo) }], esperado: { ...j, criterios_aceite: cs } }
+  })
+}
+
+/**
+ * Insere um critério logo DEPOIS do critério `depoisDe`, com os campos na
+ * ordem dada, no recuo do vizinho (`{` e campos).
+ */
+export function inserirCriterio(md: string, depoisDe: number, criterio: Record<string, string>): string {
+  return editar(md, (t, raiz, j) => {
+    const viz = campo(raiz, 'criterios_aceite')?.itens?.[depoisDe]
+    const primeiro = viz?.campos?.values().next().value as No | undefined
+    if (!viz || viz.tipo !== 'objeto' || !primeiro) throw new EdicaoRecusada(`criterio[${depoisDe}] ausente`)
+    const rObj = recuo(t, viz.ini)
+    // o recuo dos campos: o da linha da 1ª chave do vizinho (chave e valor na mesma linha)
+    const rCampo = recuo(t, primeiro.ini)
+    const corpo = Object.entries(criterio)
+      .map(([k, v]) => `${rCampo}${JSON.stringify(k)}: ${JSON.stringify(v)}`)
+      .join(',\n')
+    const cs = [...(j.criterios_aceite as unknown[])]
+    cs.splice(depoisDe + 1, 0, criterio)
+    return { edicoes: [{ ini: viz.fim, fim: viz.fim, novo: `,\n${rObj}{\n${corpo}\n${rObj}}` }], esperado: { ...j, criterios_aceite: cs } }
+  })
+}
diff --git a/test/orquestrador-resolvedor-acoes.test.ts b/test/orquestrador-resolvedor-acoes.test.ts
new file mode 100644
index 0000000..a64bccd
--- /dev/null
+++ b/test/orquestrador-resolvedor-acoes.test.ts
@@ -0,0 +1,249 @@
+/**
+ * Etapa 7f-b2, peça 3 · as ações R1 e R5 (árvore suja, máquina) com as travas.
+ *
+ * Pronto quando (além do gabarito da peça 1 no 840, 940 e 932):
+ *   - segunda passada no mesmo ticket não age de novo (bloqueou outra vez:
+ *     vai para humano);
+ *   - com git rodando (processo ou index.lock) ele espera, e desiste no teto;
+ *   - com o interruptor ele não faz nada (nem triagem, nem ledger);
+ *   - o commit tem só o arquivo do ticket (o que mais estiver no índice fica)
+ *     e o trailer; o hook do repo roda (nunca --no-verify) e, se recusa, o
+ *     arquivo volta;
+ *   - nenhuma escrita fora de docs/fila do ticket bloqueado;
+ *   - R5 só reabre quando a condição sumiu (árvore alvo limpa; máquina livre);
+ *   - em sombra, só a proposta.
+ */
+import { spawn, spawnSync } from 'node:child_process'
+import { createHash } from 'node:crypto'
+import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
+import { join, relative } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
+import { ambiente, comEnv, git, jsonDo, repoDoCaso } from './resolvedor-repo.js'
+
+const RAIZ = join(import.meta.dirname, '..')
+const RES = join(RAIZ, 'scripts', 'orquestrador', 'resolvedor')
+const AGORA = Date.parse('2026-10-11T12:00:00Z')
+
+interface Item {
+  id: string
+  acao: string
+  feito: string
+  motivo: string
+  commit?: string
+  proposta?: string
+}
+interface Mods {
+  passada: (o: { repo?: string; dryRun?: boolean; semModelo?: boolean; agora?: number }) => { pausado: boolean; itens: Item[] }
+  confereTicket?: (raiz: string, id: string, rel: string) => string
+}
+async function carregar(): Promise<Mods | null> {
+  const imp = async (f: string) => {
+    try {
+      return (await import(pathToFileURL(join(RES, f)).href)) as Record<string, unknown>
+    } catch {
+      return {}
+    }
+  }
+  const m = { ...(await imp('passada.ts')), ...(await imp('repo.ts')) }
+  return typeof m.passada === 'function' ? (m as unknown as Mods) : null
+}
+
+/** Todo arquivo do repo fora do .git: caminho → sha do conteúdo e mtime. */
+function foto(raiz: string): Map<string, string> {
+  const out = new Map<string, string>()
+  const varre = (d: string) => {
+    for (const e of readdirSync(d, { withFileTypes: true })) {
+      const p = join(d, e.name)
+      if (e.name === '.git') continue
+      if (e.isDirectory()) varre(p)
+      else out.set(relative(raiz, p), `${createHash('sha256').update(readFileSync(p)).digest('hex')} ${statSync(p).mtimeMs}`)
+    }
+  }
+  varre(raiz)
+  return out
+}
+
+describe('peça 3: ações R1 e R5 com as travas', () => {
+  let m: Mods | null
+  let amb: ReturnType<typeof ambiente>
+  let tira: () => void
+  let n = 0
+  /** um repo do caso, sozinho no repos.json, no modo dado */
+  const caso = (id: string, modos: unknown = { R1: 'auto', R5: 'auto', R2: 'sombra' }, o: { arvoreSuja?: boolean } = {}) => {
+    const r = repoDoCaso(join(amb.base, `c${++n}`), id, { nome: 'comarka-operacional', ...o })
+    amb.repos([{ nome: 'cmk', caminho: r.raiz, resolvedor: modos }])
+    return r
+  }
+  const ledger = () => {
+    const p = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
+    return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []
+  }
+  const passa = () => m!.passada({ repo: 'cmk', semModelo: true, agora: AGORA })
+
+  beforeAll(async () => {
+    amb = ambiente()
+    tira = comEnv(amb.env)
+    m = await carregar()
+  })
+  afterAll(() => tira?.())
+  beforeEach(() => {
+    for (const f of ['git-rodando']) if (existsSync(join(amb.base, f))) spawnSync('rm', ['-f', join(amb.base, f)])
+    spawnSync('rm', ['-rf', amb.env.ORQ_RESOLVEDOR_DIR!, amb.env.ORQ_RESOLVEDOR_PAUSADO!, amb.env.ORQ_DIAG_DIR!])
+    mkdirSync(amb.env.ORQ_DIAG_DIR!, { recursive: true })
+    delete process.env.ORQ_RESOLVEDOR_MAQUINA
+  })
+
+  it('o módulo existe, com a porta de escrita no repo', () => {
+    expect(m).not.toBeNull()
+    expect(m!.confereTicket, 'resolvedor/repo.ts com confereTicket').toBeTypeOf('function')
+  })
+
+  it('segunda passada no mesmo ticket não age de novo; bloqueado outra vez vai para humano', () => {
+    const r = caso('940')
+    const p1 = passa()
+    expect(p1.itens).toEqual([expect.objectContaining({ id: '940', feito: 'aplicado' })])
+    const commits = git(r.raiz, 'rev-list', '--count', 'HEAD')
+    // a mesma passada de novo: o ticket já não está bloqueado
+    expect(passa().itens).toEqual([])
+    // o loop bloqueia de novo (writeback não commitado, como no Comarka)
+    writeFileSync(join(r.raiz, r.ticket), r.antes)
+    const p3 = passa()
+    expect(p3.itens).toEqual([expect.objectContaining({ id: '940', feito: 'nao_consegui', motivo: expect.stringMatching(/segunda vez bloqueado/) })])
+    expect(git(r.raiz, 'rev-list', '--count', 'HEAD')).toBe(commits)
+    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+    expect(ledger().filter((e) => e.tipo === 'acao')).toHaveLength(1)
+  })
+
+  it('com git rodando ele espera, e age quando o git sai', () => {
+    const r = caso('932')
+    const flag = join(amb.base, 'git-rodando')
+    writeFileSync(flag, '')
+    process.env.ORQ_RESOLVEDOR_ESPERA_GIT_S = '10'
+    spawn('bash', ['-c', `sleep 1; rm -f '${flag}'`], { detached: true, stdio: 'ignore' }).unref()
+    const t0 = Date.now()
+    const p = passa()
+    process.env.ORQ_RESOLVEDOR_ESPERA_GIT_S = amb.env.ORQ_RESOLVEDOR_ESPERA_GIT_S!
+    expect(Date.now() - t0).toBeGreaterThanOrEqual(900)
+    expect(p.itens).toEqual([expect.objectContaining({ id: '932', feito: 'aplicado' })])
+    expect(jsonDo(readFileSync(join(r.raiz, r.ticket), 'utf8')).status).toBe('pendente')
+  })
+
+  it('com git rodando além do teto ele desiste sem escrever (processo e index.lock)', () => {
+    const r = caso('940')
+    writeFileSync(join(amb.base, 'git-rodando'), '')
+    const t0 = Date.now()
+    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/git rodando: processo git/) })])
+    expect(Date.now() - t0).toBeGreaterThanOrEqual(1900)
+    spawnSync('rm', ['-f', join(amb.base, 'git-rodando')])
+    writeFileSync(join(r.raiz, '.git', 'index.lock'), '')
+    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/index\.lock/) })])
+    spawnSync('rm', ['-f', join(r.raiz, '.git', 'index.lock')])
+    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+    expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
+    expect(ledger()).toEqual([])
+  })
+
+  it('com o interruptor ele não faz nada: nem triagem, nem ledger, nem o repo', () => {
+    const r = caso('940')
+    writeFileSync(amb.env.ORQ_RESOLVEDOR_PAUSADO!, 'pausado\n')
+    const p = passa()
+    expect(p.pausado).toBe(true)
+    expect(p.itens).toEqual([])
+    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+    expect(existsSync(join(amb.env.ORQ_DIAG_DIR!, 'cmk'))).toBe(false)
+    expect(existsSync(amb.env.ORQ_RESOLVEDOR_DIR!)).toBe(false)
+    const cli = spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'resolver', '--repo', 'cmk'], { encoding: 'utf8', env: { ...process.env } })
+    expect(cli.status).toBe(0)
+    expect(cli.stdout).toMatch(/pausado/)
+  })
+
+  it('o commit tem só o arquivo do ticket e o trailer; o resto do índice fica', () => {
+    const r = caso('840')
+    writeFileSync(join(r.raiz, 'outro.txt'), 'preparado por outro processo\n')
+    git(r.raiz, 'add', 'outro.txt')
+    expect(passa().itens).toEqual([expect.objectContaining({ id: '840', feito: 'aplicado' })])
+    expect(git(r.raiz, 'show', '--name-only', '--format=', 'HEAD').trim()).toBe(r.ticket)
+    const corpo = git(r.raiz, 'log', '-1', '--format=%B')
+    expect(corpo).toMatch(/^Orq-Resolvedor: R1 D6 [0-9a-f]{64}$/m)
+    expect(git(r.raiz, 'log', '-1', '--format=%(trailers:key=Orq-Resolvedor,valueonly)').trim()).toMatch(/^R1 D6 [0-9a-f]{64}$/)
+    expect(git(r.raiz, 'diff', '--cached', '--name-only').trim()).toBe('outro.txt')
+    const a = ledger().filter((e) => e.tipo === 'acao')
+    expect(a).toEqual([expect.objectContaining({ repo: 'cmk', id: '840', classe: 'R1', regra: 'D6', commit: git(r.raiz, 'rev-parse', 'HEAD').trim(), arquivo: r.ticket })])
+  })
+
+  it('o hook do repo roda (nunca --no-verify) e, se recusa, o arquivo volta', () => {
+    const r = caso('932')
+    const hook = join(r.raiz, '.git', 'hooks', 'pre-commit')
+    mkdirSync(join(r.raiz, '.git', 'hooks'), { recursive: true })
+    writeFileSync(hook, `#!/bin/bash\necho "validar-fila: recusado" >&2\ntouch '${join(amb.base, 'hook-rodou')}'\nexit 1\n`)
+    chmodSync(hook, 0o755)
+    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/commit recusado.*validar-fila: recusado/) })])
+    expect(existsSync(join(amb.base, 'hook-rodou'))).toBe(true)
+    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+    expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
+  })
+
+  it('nenhuma escrita fora de docs/fila do ticket bloqueado', () => {
+    const r = caso('840')
+    const antes = foto(r.raiz)
+    const alvoAntes = foto(r.alvo)
+    passa()
+    const depois = foto(r.raiz)
+    const mudou = [...depois].filter(([k, v]) => antes.get(k) !== v).map(([k]) => k)
+    expect(mudou).toEqual([r.ticket])
+    expect([...antes.keys()].filter((k) => !depois.has(k))).toEqual([])
+    expect(foto(r.alvo)).toEqual(alvoAntes)
+    // a porta recusa o resto
+    expect(m!.confereTicket).toBeTypeOf('function')
+    expect(() => m!.confereTicket!(r.raiz, '840', 'docs/fila/841-outro.md')).toThrow(/fora do ticket/)
+    expect(() => m!.confereTicket!(r.raiz, '840', 'docs/fila/runs/840-x.md')).toThrow(/fora do ticket/)
+    expect(() => m!.confereTicket!(r.raiz, '840', '../840-x.md')).toThrow(/fora do ticket/)
+    expect(() => m!.confereTicket!(r.raiz, '840', 'src/840-x.md')).toThrow(/fora do ticket/)
+    symlinkSync(join(amb.base, 'fora.md'), join(r.raiz, 'docs/fila/840-link.md'))
+    expect(() => m!.confereTicket!(r.raiz, '840', 'docs/fila/840-link.md')).toThrow(/symlink/)
+  })
+
+  it('R5 árvore suja: não reabre com a worktree alvo suja; reabre quando limpa', () => {
+    const r = caso('940', { R5: 'auto' }, { arvoreSuja: true })
+    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/árvore alvo ainda suja: 1 arquivo/) })])
+    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+    git(r.alvo, 'checkout', '--', 'LEIA.md')
+    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'aplicado' })])
+  })
+
+  it('R5 máquina (801, D4): só reabre com a máquina livre', () => {
+    const r = caso('801', { R5: 'auto' })
+    process.env.ORQ_RESOLVEDOR_MAQUINA = JSON.stringify({ carga: 9, cpus: 8, livre_bytes: 50 * 1024 ** 3 })
+    expect(passa().itens).toEqual([expect.objectContaining({ id: '801', acao: 'r5_reabrir', feito: 'nao_consegui', motivo: expect.stringMatching(/máquina ocupada/) })])
+    process.env.ORQ_RESOLVEDOR_MAQUINA = JSON.stringify({ carga: 1, cpus: 8, livre_bytes: 1024 ** 3 })
+    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/disco cheio/) })])
+    process.env.ORQ_RESOLVEDOR_MAQUINA = JSON.stringify({ carga: 1, cpus: 8, livre_bytes: 50 * 1024 ** 3 })
+    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'aplicado' })])
+    expect(jsonDo(readFileSync(join(r.raiz, r.ticket), 'utf8')).status).toBe('pendente')
+    expect(git(r.raiz, 'log', '-1', '--format=%B')).toMatch(/^Orq-Resolvedor: R5 D4 [0-9a-f]{64}$/m)
+  })
+
+  it('R1 com .skip no teste do branch alvo: não age', () => {
+    const r = caso('840')
+    git(r.raiz, 'checkout', '-q', 'staging-auto')
+    const f = join(r.raiz, 'test/nps-reacao-resposta.test.ts')
+    writeFileSync(f, readFileSync(f, 'utf8').replace('it(', 'it.skip('))
+    git(r.raiz, 'commit', '-qam', 'skip')
+    git(r.raiz, 'checkout', '-q', 'main')
+    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/\.skip\/\.only\/\.todo/) })])
+    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+  })
+
+  it('R1 em sombra: só a proposta com o diff, o repo intocado', () => {
+    const r = caso('840', { R1: 'sombra' })
+    const p = passa()
+    expect(p.itens).toEqual([expect.objectContaining({ acao: 'sombra', feito: 'proposto' })])
+    const prop = readFileSync(p.itens[0]!.proposta!, 'utf8')
+    expect(prop).toContain('+    "test/nps-reacao-resposta.test.ts"')
+    expect(prop).toContain('+  "status": "pendente",')
+    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+    expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
+    expect(ledger().filter((e) => e.tipo === 'acao')).toEqual([])
+  })
+})
diff --git a/test/resolvedor-repo.ts b/test/resolvedor-repo.ts
index fabd81b..39f59f4 100644
--- a/test/resolvedor-repo.ts
+++ b/test/resolvedor-repo.ts
@@ -25,6 +25,8 @@ export const CASO: Record<string, string> = {
   '929': join(FX_RES, 'casos', '02-929-L85996'),
   '940': join(FX_TRI, '36-940-L85222'),
   '932': join(FX_TRI, '37-932-L85272'),
+  // R5 máquina (D4), sem gabarito humano: o ticket da fixture, posto em bloqueado
+  '801': join(FX_TRI, '20-801-L72121'),
 }
 
 export interface Ambiente {
@@ -137,8 +139,12 @@ export function repoDoCaso(base: string, id: string, o: { nome?: string; arvoreS
   git(raiz, 'checkout', '-q', '--orphan', 'main')
   git(raiz, 'rm', '-rq', '--cached', '--ignore-unmatch', '.')
   materializar(d, raiz)
-  const antes = readFileSync(join(FX_RES, 'gabarito', id, 'antes.md'), 'utf8')
-  const depois = readFileSync(join(FX_RES, 'gabarito', id, 'depois.md'), 'utf8')
+  const gab = join(FX_RES, 'gabarito', id)
+  const tk = JSON.parse(readFileSync(join(d, 'ticket.json'), 'utf8')) as Record<string, unknown>
+  const antes = existsSync(gab)
+    ? readFileSync(join(gab, 'antes.md'), 'utf8')
+    : `# ${id}\n\n\`\`\`json\n${JSON.stringify({ ...tk, status: 'bloqueado', notas_status: 'motivo repetido: gate vitest' }, null, 2)}\n\`\`\`\n`
+  const depois = existsSync(gab) ? readFileSync(join(gab, 'depois.md'), 'utf8') : ''
   writeFileSync(join(raiz, caso.arquivo_ticket), antes)
   writeFileSync(join(raiz, '.gitignore'), 'docs/fila/runs/\n')
   for (const s of serie) {
```

### e983df6 7f-b2-4: R2 em sombra: proposta com o cmd novo e a prova sob set -u; nunca aplica; gabarito 929

```diff
commit e983df6d2d5bd8fab74d21e713197821fb49fccd
Author: Lucas Santos
Date: Sat Oct 10 23:05:08 2026 -0300

7f-b2-4: R2 em sombra: proposta com o cmd novo e a prova sob set -u; nunca aplica; gabarito 929

A forma tratada é a do 929: v=$(grep -c …) sem || true numa corrente com &&,
que aborta com unbound variable sob set -euo pipefail. O conserto é o do
humano letra por letra (|| true e ${v:-x}). A prova roda o critério no harness
do executor, numa pasta temporária com cópias dos arquivos que o cmd cita: no
branch alvo (trabalho não feito) o novo roda e reprova, o antigo aborta; no
head da tentativa, só registro. cmd que chamaria git, npx, node ou script do
repo não é provado. Proposta em <repo>/<id>/proposta.md e .json, uma por
assinatura; nem o modo auto aplica.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/resolvedor/acoes.ts   |  53 +++++++-
 scripts/orquestrador/resolvedor/diff.ts    |   4 +-
 scripts/orquestrador/resolvedor/passada.ts |   6 +-
 scripts/orquestrador/resolvedor/r2.ts      | 211 +++++++++++++++++++++++++++++
 test/orquestrador-resolvedor-r2.test.ts    | 111 +++++++++++++++
 5 files changed, 379 insertions(+), 6 deletions(-)
diff --git a/scripts/orquestrador/resolvedor/acoes.ts b/scripts/orquestrador/resolvedor/acoes.ts
index b48e5d4..22927ac 100644
--- a/scripts/orquestrador/resolvedor/acoes.ts
+++ b/scripts/orquestrador/resolvedor/acoes.ts
@@ -12,7 +12,7 @@
  * Modo sombra: o mesmo plano vira `proposta.md` (o diff que aplicaria), e o
  * repo não é tocado. Em --dry-run, nem a proposta: só o registro do que faria.
  */
-import { readFileSync } from 'node:fs'
+import { existsSync, readFileSync } from 'node:fs'
 import { join } from 'node:path'
 import type { Diagnostico } from '../triador/triar.js'
 import { dirTicket, type GuardaResolvedor } from './caminhos.js'
@@ -20,6 +20,7 @@ import type { Decisao } from './decidir.js'
 import { diffLinhas } from './diff.js'
 import { acoesDe, lerLedger, registrar } from './ledger.js'
 import { planejarR1, type Plano } from './r1.js'
+import { planejarR2 } from './r2.js'
 import { planejarR5 } from './r5.js'
 import { arquivoDoTicket, escreverEComitar, trailer } from './repo.js'
 
@@ -105,3 +106,53 @@ export function agirR1R5(a: Alvo, tipo: 'r1_allowlist' | 'r5_reabrir'): Feito {
   })
   return { feito: 'aplicado', motivo: mudou, commit: e.commit, diff }
 }
+
+const bloquinho = (s: string) => `\`\`\`\n${s}\n\`\`\``
+
+/**
+ * R2: a proposta em `<repo>/<id>/proposta.md` (e `.json`), sempre em sombra,
+ * mesmo com o modo `auto` (nesta etapa R2 nunca aplica). A mesma assinatura
+ * não regrava a proposta.
+ */
+export function agirR2(a: Alvo): Feito {
+  const { repo, id, diag } = a
+  const rel = arquivoDoTicket(repo.caminho, id)
+  if (!rel) return { feito: 'nao_consegui', motivo: `não achei um arquivo docs/fila/${id}-*.md só` }
+  const dir = dirTicket(repo.nome, id)
+  const pj = join(dir, 'proposta.json')
+  const pm = join(dir, 'proposta.md')
+  if (!a.dryRun && existsSync(pj)) {
+    try {
+      const v = JSON.parse(readFileSync(pj, 'utf8')) as { assinatura?: string; criterio?: string }
+      if (v.assinatura === diag.assinatura) return { feito: 'proposto', motivo: `proposta já feita para esta assinatura (${v.criterio ?? 'critério'})`, proposta: pm }
+    } catch {
+      /* ilegível: refaz */
+    }
+  }
+  const antes = readFileSync(join(repo.caminho, rel), 'utf8')
+  const p = planejarR2(repo.caminho, diag, antes)
+  if (!p.ok) return { feito: 'nao_consegui', motivo: p.motivo }
+  const r = p.plano
+  const mudou = `${r.criterio}: cmd sem unbound variable sob set -u (mesmo espera ${JSON.stringify(r.espera)})`
+  const diff = diffLinhas(antes, r.novo, rel)
+  if (a.dryRun) return { feito: 'faria', motivo: `proporia ${mudou}`, diff }
+  const prova = r.prova.map((x) => `| ${x.estado} | ${x.cmd} | ${x.abortou ? 'aborta' : 'roda'} | ${x.passa ? 'APROVA' : 'reprova'} | \`${x.saida.replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 160)}\` |`)
+  a.g.escrever(
+    pm,
+    `# Proposta do resolvedor: ${repo.nome} ${id} (${diag.classe} ${diag.regra ?? ''}, R2 só em sombra)\n\n` +
+      `Gerada em ${iso(a.agora)} sobre o diagnóstico ${diag.assinatura}. **Nada foi escrito no repo**: R2 nunca aplica nesta etapa.\n\n` +
+      `## ${r.criterio}: ${r.descricao}\n\n- arquivo: \`${rel}\`\n- espera (não muda): \`${r.espera}\`\n- remédio do triador: ${diag.remedio}\n\n` +
+      `### cmd antigo\n\n${bloquinho(r.cmd_antigo)}\n\n### cmd novo\n\n${bloquinho(r.cmd_novo)}\n\n` +
+      `## Prova\n\nO harness do executor (\`set -euo pipefail\`; \`out="$( ( cd <arvore> && eval "$cmd" ) 2>&1 || true )"\`), numa pasta temporária com cópias dos arquivos que o cmd cita.\n\n` +
+      `- não feito: os arquivos no branch alvo (${r.ref_alvo ?? 'nenhum existe lá'}): ${r.arquivos.nao_feito.join(', ') || 'nenhum'}\n` +
+      `- head: os arquivos no head da última tentativa (${r.head ?? 'sem head'}): ${r.arquivos.head.join(', ') || 'nenhum'}\n\n` +
+      `| estado | cmd | sob set -u | critério | saída |\n|---|---|---|---|---|\n${prova.join('\n')}\n\n` +
+      `O cmd novo roda sem abortar e REPROVA o estado em que o trabalho não foi feito.\n\n` +
+      `## Diff que o humano aplicaria\n\n\`\`\`diff\n${diff}\`\`\`\n`,
+  )
+  a.g.escrever(
+    pj,
+    JSON.stringify({ repo: repo.nome, id, tipo: 'r2', classe: diag.classe, regra: diag.regra, assinatura: diag.assinatura, gerada_em: iso(a.agora), arquivo: rel, indice: r.indice, criterio: r.criterio, espera: r.espera, cmd_antigo: r.cmd_antigo, cmd_novo: r.cmd_novo, head: r.head, ref_alvo: r.ref_alvo, arquivos: r.arquivos, prova: r.prova }, null, 2) + '\n',
+  )
+  return { feito: 'proposto', motivo: mudou, proposta: pm, diff }
+}
diff --git a/scripts/orquestrador/resolvedor/diff.ts b/scripts/orquestrador/resolvedor/diff.ts
index 42fa617..49043cb 100644
--- a/scripts/orquestrador/resolvedor/diff.ts
+++ b/scripts/orquestrador/resolvedor/diff.ts
@@ -15,8 +15,8 @@ export function diffLinhas(a: string, b: string, rotulo: string, contexto = 1):
   let j = 0
   while (i < n || j < m) {
     if (i < n && j < m && la[i] === lb[j]) ops.push({ t: ' ', l: la[i]!, ia: i++, ib: j++ })
-    else if (j < m && (i === n || lcs[i]![j + 1]! >= lcs[i + 1]![j]!)) ops.push({ t: '+', l: lb[j]!, ia: i, ib: j++ })
-    else ops.push({ t: '-', l: la[i]!, ia: i++, ib: j })
+    else if (i < n && (j === m || lcs[i + 1]![j]! >= lcs[i]![j + 1]!)) ops.push({ t: '-', l: la[i]!, ia: i++, ib: j })
+    else ops.push({ t: '+', l: lb[j]!, ia: i, ib: j++ })
   }
   const muda = ops.map((o, k) => (o.t !== ' ' ? k : -1)).filter((k) => k >= 0)
   if (!muda.length) return ''
diff --git a/scripts/orquestrador/resolvedor/passada.ts b/scripts/orquestrador/resolvedor/passada.ts
index 22c6319..a48c153 100644
--- a/scripts/orquestrador/resolvedor/passada.ts
+++ b/scripts/orquestrador/resolvedor/passada.ts
@@ -22,7 +22,7 @@ import { blocoJson } from '../triador/comum.js'
 import { criarPassoModelo, lerConfigModelo } from '../triador/modelo.js'
 import { Guarda, lerDiagnostico } from '../triador/saida.js'
 import { bloqueados, triarTicket, type Diagnostico } from '../triador/triar.js'
-import { agirR1R5 } from './acoes.js'
+import { agirR1R5, agirR2 } from './acoes.js'
 import { GuardaResolvedor, arquivoDryRun, interruptor, travarPassada } from './caminhos.js'
 import { decidir, type Decisao } from './decidir.js'
 import { acharRepo, lerReposResolvedor, type Modo, type RepoResolvedor } from './modos.js'
@@ -109,8 +109,8 @@ export function executar(c: Contexto): Pick<ItemPassada, 'feito' | 'motivo' | 'c
   const alvo = { repo: c.repo, id: c.id, diag: c.diag, decisao: d, agora: c.agora, dryRun: c.dryRun, g: c.g }
   if (d.acao === 'r1_allowlist' || d.acao === 'r5_reabrir') return agirR1R5(alvo, d.acao)
   if (d.acao === 'sombra' && d.propoe) return agirR1R5(alvo, d.propoe)
-  if (c.dryRun) return { feito: 'faria', motivo: d.motivo }
-  return { feito: 'nao_consegui', motivo: `ação ${d.acao} ainda não implementada` }
+  if (d.acao === 'r2_proposta') return agirR2(alvo)
+  return { feito: 'nao_consegui', motivo: `ação ${d.acao} sem implementação` }
 }
 
 export function passada(o: OpcoesPassada = {}): ResultadoPassada {
diff --git a/scripts/orquestrador/resolvedor/r2.ts b/scripts/orquestrador/resolvedor/r2.ts
new file mode 100644
index 0000000..311339d
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/r2.ts
@@ -0,0 +1,211 @@
+/**
+ * r2.ts — a PROPOSTA de R2 (critério com defeito de forma), só em sombra:
+ * nunca aplica (decisão do chat do programa, 7f-b2). O gabarito é o 929
+ * (7787af3, ~/orq-sessoes/conserto-840-929.md).
+ *
+ * Forma tratada nesta etapa: o critério reprovou com `unbound variable` (o
+ * executor roda o cmd sob `set -euo pipefail`). Causa: `v=$(grep -c …)` sem
+ * `|| true` numa corrente com `&&`: com contagem 0 o grep sai 1, a corrente
+ * para e a variável seguinte nunca é atribuída. Conserto, o do humano no 929:
+ * `|| true` dentro de cada `$(grep -c …)` e toda expansão dessas variáveis
+ * como `${v:-x}`. Outra forma de defeito: "não consegui", com o motivo.
+ *
+ * A prova (o que vai na proposta), no harness do executor do legado
+ * (`out="$( ( cd … && eval "$cmd" ) 2>&1 || true )"` sob `set -euo pipefail`):
+ *   - estado em que o trabalho NÃO foi feito: os arquivos que o cmd cita, como
+ *     estão no branch alvo (o que não existe lá fica ausente). O cmd novo tem
+ *     de rodar sem abortar e REPROVAR; o antigo, para comparar;
+ *   - o head da última tentativa (quando a evidência tem `head.txt`): só
+ *     registro, o mérito não é do critério.
+ * Roda numa pasta temporária, com cópias: nunca no repo, nunca script do repo.
+ * cmd que chama git, npx, node, gerenciador de pacote, shell ou script do repo
+ * não é provado (seria rodar o repo): "não consegui".
+ */
+import { spawnSync } from 'node:child_process'
+import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { dirname, join } from 'node:path'
+import { gitLeitura } from '../triador/git.js'
+import type { Diagnostico } from '../triador/triar.js'
+import { noAlvo, type Plano } from './r1.js'
+import { bloco, EdicaoRecusada, trocarCmd } from './ticket-md.js'
+
+export interface Rodada {
+  estado: 'nao_feito' | 'head'
+  cmd: 'novo' | 'antigo'
+  saida: string
+  abortou: boolean
+  passa: boolean
+}
+
+export interface PropostaR2 {
+  indice: number
+  criterio: string
+  descricao: string
+  espera: string
+  cmd_antigo: string
+  cmd_novo: string
+  arquivos: { nao_feito: string[]; head: string[] }
+  ref_alvo: string | null
+  head: string | null
+  prova: Rodada[]
+  novo: string
+}
+
+const RE_ATRIB = /\b([A-Za-z_]\w*)=\$\((\s*grep\s+(?:-[A-Za-z]*c[A-Za-z]*|--count)\s[^()]*?)\)/g
+
+/** O conserto do `unbound variable` de `v=$(grep -c …)`; `null` se o cmd não tem essa forma. */
+export function consertarUnbound(cmd: string): string | null {
+  const vars: string[] = []
+  let out = cmd.replace(RE_ATRIB, (todo, v: string, dentro: string) => {
+    if (/\|\|\s*true\s*$/.test(dentro)) return todo
+    vars.push(v)
+    return `${v}=$(${dentro.replace(/\s+$/, '')} || true)`
+  })
+  if (!vars.length) return null
+  for (const v of new Set(vars)) {
+    out = out.replace(new RegExp(String.raw`\$\{${v}(?::-[^}]*)?\}`, 'g'), `\${${v}:-x}`)
+    out = out.replace(new RegExp(String.raw`\$${v}(?![A-Za-z0-9_])`, 'g'), `\${${v}:-x}`)
+  }
+  return out
+}
+
+/** O `criterio_match` do lib.sh do legado: número puro é igualdade; senão igual ou ERE. */
+export function criterioPassa(out: string, espera: string): boolean {
+  const o = out.trim()
+  const e = espera.trim()
+  if (/^\d+$/.test(e)) return o === e
+  if (o === e) return true
+  try {
+    return new RegExp(e).test(o)
+  } catch {
+    return false
+  }
+}
+
+const PROIBIDO = /(^|[\s;&|(`])(git|npx|npm|pnpm|yarn|node|tsx|vitest|tsc|python3?|bash|sh|zsh|curl|wget|psql|rm|mv|cp|chmod|make|\.\/|scripts\/)/
+
+/** Os caminhos que o cmd cita (tokens com `/` ou extensão). */
+function citados(cmd: string): string[] {
+  const toks = cmd.match(/[A-Za-z0-9_.\-[\]/]+/g) ?? []
+  return [...new Set(toks.filter((t) => /\/|\.[A-Za-z0-9]+$/.test(t) && !/^\.+$/.test(t) && !t.startsWith('/')))]
+}
+
+const HARNESS = `set -euo pipefail
+cd "$1"
+out="$( ( export NO_COLOR=1 FORCE_COLOR=0 && eval "$2" ) 2>&1 || true )"
+printf '%s' "$out"`
+
+function rodar(dir: string, cmd: string, espera: string): { saida: string; abortou: boolean; passa: boolean } {
+  const r = spawnSync('bash', ['-c', HARNESS, 'prova', dir, cmd], {
+    encoding: 'utf8',
+    timeout: 10_000,
+    env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: dir, LANG: 'C' },
+    stdio: ['ignore', 'pipe', 'pipe'],
+  })
+  const saida = `${r.stdout ?? ''}${r.status === 0 ? '' : r.stderr ?? ''}`.trim().replaceAll(dir, '<arvore>')
+  return { saida, abortou: r.status !== 0 || /unbound variable|syntax error/.test(saida), passa: r.status === 0 && criterioPassa(saida, espera) }
+}
+
+/** Uma árvore temporária com os arquivos citados, como estão num ref. */
+function arvore(raiz: string, ref: string | ((f: string) => string | null), arquivos: string[]): { dir: string; postos: string[] } {
+  const dir = mkdtempSync(join(tmpdir(), 'orq-r2-'))
+  const postos: string[] = []
+  for (const f of arquivos) {
+    const g = typeof ref === 'function' ? null : gitLeitura(raiz, ['show', `${ref}:${f}`])
+    const txt = typeof ref === 'function' ? ref(f) : g!.rc === 0 ? g!.stdout : null
+    if (txt === null) continue
+    mkdirSync(dirname(join(dir, f)), { recursive: true })
+    writeFileSync(join(dir, f), txt)
+    postos.push(f)
+  }
+  return { dir, postos }
+}
+
+/** O índice do critério: `criterio[i]` (legado) ou a descrição (kit). */
+function indiceDo(nome: string, cs: Record<string, unknown>[]): number {
+  const m = /^criterio\[(\d+)\]$/.exec(nome)
+  if (m) return Number(m[1])
+  return cs.findIndex((c) => c?.descricao === nome)
+}
+
+/** O head da última tentativa, pelo `head.txt` ao lado da evidência do critério. */
+function headDa(raiz: string, diag: Diagnostico): string | null {
+  for (const e of [...diag.evidencia].reverse()) {
+    const p = join(raiz, dirname(e.arquivo), 'head.txt')
+    if (existsSync(p)) {
+      const h = readFileSync(p, 'utf8').trim()
+      if (/^[0-9a-f]{7,40}$/.test(h) && gitLeitura(raiz, ['rev-parse', '--verify', '-q', `${h}^{commit}`]).rc === 0) return h
+    }
+  }
+  return null
+}
+
+export function planejarR2(raiz: string, diag: Diagnostico, md: string): Plano<PropostaR2> {
+  const falhos = diag.extracao.criterios_falhos
+  const ult = Math.max(0, ...falhos.map((c) => c.tentativa))
+  const daUltima = falhos.filter((c) => c.tentativa === ult)
+  const alvo = daUltima.find((c) => c.saida.some((s) => /unbound variable/.test(s)))
+  if (!alvo) {
+    return { ok: false, motivo: daUltima.length ? `forma do defeito fora do que esta etapa conserta (saída: ${daUltima[0]!.saida.join(' | ').slice(0, 120)})` : 'sem critério reprovado na última tentativa' }
+  }
+  let j: Record<string, unknown>
+  try {
+    j = bloco(md).json
+  } catch (e) {
+    return { ok: false, motivo: (e as Error).message }
+  }
+  const cs = Array.isArray(j.criterios_aceite) ? (j.criterios_aceite as Record<string, unknown>[]) : []
+  const i = indiceDo(alvo.criterio, cs)
+  const c = cs[i]
+  if (i < 0 || !c || typeof c.cmd !== 'string') return { ok: false, motivo: `${alvo.criterio} não está no ticket` }
+  const antigo = c.cmd
+  const espera = typeof c.espera === 'string' ? c.espera : ''
+  const novoCmd = consertarUnbound(antigo)
+  if (!novoCmd) return { ok: false, motivo: `${alvo.criterio}: o cmd não tem a forma v=$(grep -c …) sem || true` }
+  const proibido = PROIBIDO.exec(antigo)
+  if (proibido) return { ok: false, motivo: `${alvo.criterio} chama ${proibido[2]}: provar exigiria rodar o repo` }
+
+  const arqs = citados(antigo)
+  const fonteAlvo = (f: string) => noAlvo(raiz, f)
+  const alvoRef = arqs.map(fonteAlvo).find((x) => x)?.ref ?? null
+  const prova: Rodada[] = []
+  const nf = arvore(raiz, (f) => fonteAlvo(f)?.texto ?? null, arqs)
+  const head = headDa(raiz, diag)
+  const hd = head ? arvore(raiz, head, arqs) : null
+  try {
+    for (const [estado, a] of [['nao_feito', nf], ['head', hd]] as const) {
+      if (!a) continue
+      for (const [qual, cmd] of [['novo', novoCmd], ['antigo', antigo]] as const) prova.push({ estado, cmd: qual, ...rodar(a.dir, cmd, espera) })
+    }
+  } finally {
+    rmSync(nf.dir, { recursive: true, force: true })
+    if (hd) rmSync(hd.dir, { recursive: true, force: true })
+  }
+  const novoNf = prova.find((p) => p.estado === 'nao_feito' && p.cmd === 'novo')!
+  if (novoNf.abortou) return { ok: false, motivo: `o cmd consertado ainda aborta no estado não feito: ${novoNf.saida.slice(0, 120)}` }
+  if (novoNf.passa) return { ok: false, motivo: `o cmd consertado APROVA o estado em que o trabalho não foi feito (${novoNf.saida.slice(0, 60)}): ficaria frouxo` }
+  let novo: string
+  try {
+    novo = trocarCmd(md, i, novoCmd)
+  } catch (e) {
+    if (e instanceof EdicaoRecusada) return { ok: false, motivo: `edição do ticket recusada: ${e.message}` }
+    throw e
+  }
+  return {
+    ok: true,
+    plano: {
+      indice: i,
+      criterio: alvo.criterio,
+      descricao: typeof c.descricao === 'string' ? c.descricao : '',
+      espera,
+      cmd_antigo: antigo,
+      cmd_novo: novoCmd,
+      arquivos: { nao_feito: nf.postos, head: hd?.postos ?? [] },
+      ref_alvo: alvoRef,
+      head,
+      prova,
+      novo,
+    },
+  }
+}
diff --git a/test/orquestrador-resolvedor-r2.test.ts b/test/orquestrador-resolvedor-r2.test.ts
new file mode 100644
index 0000000..06c2135
--- /dev/null
+++ b/test/orquestrador-resolvedor-r2.test.ts
@@ -0,0 +1,111 @@
+/**
+ * Etapa 7f-b2, peça 4 · R2 em sombra: a proposta em
+ * `~/.orq/resolvedor/<repo>/<id>/proposta.md` com o cmd novo, a prova de que
+ * ele não aborta sob `set -u` e reprova o estado em que o trabalho não foi
+ * feito. Nunca aplica (nem no modo auto).
+ *
+ * O gabarito é o 929 (7787af3): o conserto do resolvedor tem de ser, letra por
+ * letra, o cmd que o humano escreveu.
+ */
+import { statSync, readFileSync, writeFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterAll, beforeAll, describe, expect, it } from 'vitest'
+import { ambiente, comEnv, git, jsonDo, repoDoCaso } from './resolvedor-repo.js'
+
+const RES = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'resolvedor')
+const AGORA = Date.parse('2026-10-11T12:00:00Z')
+
+interface Item {
+  id: string
+  acao: string
+  feito: string
+  motivo: string
+  proposta?: string
+}
+interface Mods {
+  passada: (o: { repo?: string; semModelo?: boolean; agora?: number }) => { itens: Item[] }
+  consertarUnbound?: (cmd: string) => string | null
+}
+async function carregar(): Promise<Mods | null> {
+  const imp = async (f: string) => {
+    try {
+      return (await import(pathToFileURL(join(RES, f)).href)) as Record<string, unknown>
+    } catch {
+      return {}
+    }
+  }
+  const m = { ...(await imp('passada.ts')), ...(await imp('r2.ts')) }
+  return typeof m.passada === 'function' ? (m as unknown as Mods) : null
+}
+
+const crit12 = (md: string) => (jsonDo(md).criterios_aceite as { cmd: string; espera: string }[])[12]!
+
+describe('peça 4: R2 em sombra', () => {
+  let m: Mods | null
+  let amb: ReturnType<typeof ambiente>
+  let tira: () => void
+  let n = 0
+  const caso = (modos: unknown) => {
+    const r = repoDoCaso(join(amb.base, `c${++n}`), '929', { nome: 'comarka-operacional' })
+    amb.repos([{ nome: `cmk${n}`, caminho: r.raiz, resolvedor: modos }])
+    return { r, nome: `cmk${n}` }
+  }
+
+  beforeAll(async () => {
+    amb = ambiente()
+    tira = comEnv(amb.env)
+    m = await carregar()
+  })
+  afterAll(() => tira?.())
+
+  it('o conserto do unbound variable é o cmd do humano, letra por letra', () => {
+    expect(m?.consertarUnbound, 'resolvedor/r2.ts com consertarUnbound').toBeTypeOf('function')
+    const r = repoDoCaso(join(amb.base, 'puro'), '929')
+    expect(m!.consertarUnbound!(crit12(r.antes).cmd)).toBe(crit12(r.depois).cmd)
+    expect(m!.consertarUnbound!(crit12(r.depois).cmd)).toBeNull()
+    expect(m!.consertarUnbound!('n=$(git diff --name-only | wc -l); echo $n')).toBeNull()
+  })
+
+  for (const modos of [{ R2: 'sombra' }, { padrao: 'auto' }]) {
+    it(`proposta com a prova e nada no repo (modo ${JSON.stringify(modos)})`, () => {
+      const { r, nome } = caso(modos)
+      const p = m!.passada({ repo: nome, semModelo: true, agora: AGORA })
+      expect(p.itens).toEqual([expect.objectContaining({ id: '929', acao: 'r2_proposta', feito: 'proposto' })])
+      expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+      expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
+      expect(git(r.raiz, 'status', '--porcelain')).toBe('')
+      const dir = join(amb.env.ORQ_RESOLVEDOR_DIR!, nome, '929')
+      expect(p.itens[0]!.proposta).toBe(join(dir, 'proposta.md'))
+      const md = readFileSync(join(dir, 'proposta.md'), 'utf8')
+      expect(md).toContain(crit12(r.depois).cmd)
+      // a prova: no estado não feito o novo roda e reprova; o antigo aborta como no bloqueio
+      expect(md).toMatch(/\| nao_feito \| novo \| roda \| reprova \| `ST_x_x_x` \|/)
+      expect(md).toMatch(/\| nao_feito \| antigo \| aborta \| reprova \| `[^`]*unbound variable[^`]*` \|/)
+      expect(md).toMatch(/\| head \| novo \|/)
+      const pj = JSON.parse(readFileSync(join(dir, 'proposta.json'), 'utf8')) as { cmd_novo: string; indice: number; criterio: string }
+      expect(pj).toEqual(expect.objectContaining({ cmd_novo: crit12(r.depois).cmd, indice: 12, criterio: 'criterio[12]' }))
+    })
+  }
+
+  it('a mesma assinatura não refaz a proposta', () => {
+    const { nome } = caso({ R2: 'sombra' })
+    const p1 = m!.passada({ repo: nome, semModelo: true, agora: AGORA })
+    expect(p1.itens).toEqual([expect.objectContaining({ feito: 'proposto', proposta: expect.any(String) })])
+    const t1 = statSync(p1.itens[0]!.proposta!).mtimeMs
+    const p2 = m!.passada({ repo: nome, semModelo: true, agora: AGORA + 60_000 })
+    expect(p2.itens).toEqual([expect.objectContaining({ feito: 'proposto', motivo: expect.stringMatching(/já feita/) })])
+    expect(statSync(p2.itens[0]!.proposta!).mtimeMs).toBe(t1)
+  })
+
+  it('não propõe o que aprovaria o estado não feito, nem cmd que roda o repo', () => {
+    const a = caso({ R2: 'sombra' })
+    const t = join(a.r.raiz, a.r.ticket)
+    writeFileSync(t, a.r.antes.replace('"espera": "PERIODO_NA_ABA"', '"espera": "ST_"'))
+    expect(m!.passada({ repo: a.nome, semModelo: true, agora: AGORA }).itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/APROVA o estado/) })])
+    const b = caso({ R2: 'sombra' })
+    const tb = join(b.r.raiz, b.r.ticket)
+    writeFileSync(tb, b.r.antes.replace('"cmd": "test -f src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && s=', '"cmd": "git diff --quiet; test -f src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && s='))
+    expect(m!.passada({ repo: b.nome, semModelo: true, agora: AGORA }).itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/chama git/) })])
+  })
+})
```

### 5b2a95d 7f-b2-5: ledger de desfecho: ação, desfecho (done, bloqueou de novo, humano mexeu), não consegui, e R2 contra o humano

```diff
commit 5b2a95d3d49bf883c0b608a8bf977b01d095dc1a
Author: Lucas Santos
Date: Sat Oct 10 23:08:08 2026 -0300

7f-b2-5: ledger de desfecho: ação, desfecho (done, bloqueou de novo, humano mexeu), não consegui, e R2 contra o humano

Cada ação leva classe, regra, o que mudou, commit e o tempo do bloqueio até
destravar. No começo de cada passada, antes da triagem: o desfecho de cada
ação aberta (done com o tempo, bloqueou de novo, ou humano mexeu, que é o json
fora dos campos que o motor escreve diferente do gravado), uma vez por ação; e
a proposta de R2 contra o conserto humano (o mesmo cmd, ou outro com a mesma
saída nos estados da prova, guardados na proposta, é acerto; outro cmd, ou
destravar sem trocar o cmd, é erro; bloqueado com o cmd antigo, espera).
"Não consegui" e aviso entram com o motivo, uma vez por assinatura e motivo.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/resolvedor/acoes.ts     |  23 +++-
 scripts/orquestrador/resolvedor/desfecho.ts  | 164 +++++++++++++++++++++++++
 scripts/orquestrador/resolvedor/ledger.ts    |  20 ++-
 scripts/orquestrador/resolvedor/passada.ts   |  20 +++
 scripts/orquestrador/resolvedor/r2.ts        |  56 +++++----
 test/orquestrador-resolvedor-acoes.test.ts   |   2 +-
 test/orquestrador-resolvedor-ledger.test.ts  | 176 +++++++++++++++++++++++++++
 test/orquestrador-resolvedor-passada.test.ts |   6 +-
 8 files changed, 436 insertions(+), 31 deletions(-)
diff --git a/scripts/orquestrador/resolvedor/acoes.ts b/scripts/orquestrador/resolvedor/acoes.ts
index 22927ac..fb3aab5 100644
--- a/scripts/orquestrador/resolvedor/acoes.ts
+++ b/scripts/orquestrador/resolvedor/acoes.ts
@@ -43,6 +43,24 @@ export interface Alvo {
 }
 
 const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')
+const segs = (de: string | null, ate: number) => (de && !Number.isNaN(Date.parse(de)) ? Math.round((ate - Date.parse(de)) / 1000) : null)
+
+/** Uma proposta nova vai ao ledger (a comparação com o humano parte dela, peça 5). */
+function registrarProposta(a: Alvo, acao: string, mudou: string, proposta: string): void {
+  registrar(a.g, {
+    ts: iso(a.agora),
+    tipo: 'proposta',
+    repo: a.repo.nome,
+    id: a.id,
+    classe: a.diag.classe,
+    regra: a.diag.regra,
+    assinatura: a.diag.assinatura,
+    acao,
+    mudou,
+    proposta,
+    proposta_json: proposta.replace(/\.md$/, '.json'),
+  })
+}
 const carimbo = (t: number) => iso(t).replace(/[-:]/g, '')
 
 /** O que mudou, em uma linha, para o ledger e a mensagem do commit. */
@@ -78,6 +96,7 @@ export function agirR1R5(a: Alvo, tipo: 'r1_allowlist' | 'r5_reabrir'): Feito {
         `\`\`\`diff\n${diff}\`\`\`\n`,
     )
     a.g.escrever(join(dir, 'proposta.json'), JSON.stringify({ repo: repo.nome, id, tipo, classe: diag.classe, regra: diag.regra, assinatura: diag.assinatura, gerada_em: iso(a.agora), arquivo: rel, antes, depois: plano.plano.novo }, null, 2) + '\n')
+    registrarProposta(a, tipo, mudou, p)
     return { feito: 'proposto', motivo: mudou, proposta: p, diff }
   }
   const classe = diag.classe!
@@ -103,6 +122,7 @@ export function agirR1R5(a: Alvo, tipo: 'r1_allowlist' | 'r5_reabrir'): Feito {
     arquivo: rel,
     copia,
     bloqueado_em: diag.bloqueio.quando,
+    tempo_ate_destravar_s: segs(diag.bloqueio.quando, a.agora),
   })
   return { feito: 'aplicado', motivo: mudou, commit: e.commit, diff }
 }
@@ -152,7 +172,8 @@ export function agirR2(a: Alvo): Feito {
   )
   a.g.escrever(
     pj,
-    JSON.stringify({ repo: repo.nome, id, tipo: 'r2', classe: diag.classe, regra: diag.regra, assinatura: diag.assinatura, gerada_em: iso(a.agora), arquivo: rel, indice: r.indice, criterio: r.criterio, espera: r.espera, cmd_antigo: r.cmd_antigo, cmd_novo: r.cmd_novo, head: r.head, ref_alvo: r.ref_alvo, arquivos: r.arquivos, prova: r.prova }, null, 2) + '\n',
+    JSON.stringify({ repo: repo.nome, id, tipo: 'r2', classe: diag.classe, regra: diag.regra, assinatura: diag.assinatura, gerada_em: iso(a.agora), arquivo: rel, indice: r.indice, criterio: r.criterio, espera: r.espera, cmd_antigo: r.cmd_antigo, cmd_novo: r.cmd_novo, head: r.head, ref_alvo: r.ref_alvo, arquivos: r.arquivos, prova: r.prova, arvores: r.arvores }, null, 2) + '\n',
   )
+  registrarProposta(a, 'r2_proposta', mudou, pm)
   return { feito: 'proposto', motivo: mudou, proposta: pm, diff }
 }
diff --git a/scripts/orquestrador/resolvedor/desfecho.ts b/scripts/orquestrador/resolvedor/desfecho.ts
new file mode 100644
index 0000000..d81fd38
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/desfecho.ts
@@ -0,0 +1,164 @@
+/**
+ * desfecho.ts — o que aconteceu DEPOIS de cada ação e de cada proposta
+ * (etapa 7f-b2, peça 5). Roda no começo de cada passada, repo a repo, antes da
+ * triagem; só lê o repo e acrescenta no ledger.
+ *
+ * Ação aplicada (`acao` sem desfecho), olhando o ticket agora:
+ *   done              bom: tempo da ação até o done
+ *   bloqueou_de_novo  ruim (e o segundo bloqueio vai para humano: acoes.ts)
+ *   humano_mexeu      ruim: o json do ticket, fora dos campos que o motor
+ *                     escreve (status, notas_status, tentativas,
+ *                     adiamentos_ambiente), não é mais o que o resolvedor gravou
+ *   (pendente, em andamento: ainda sem desfecho)
+ *
+ * Proposta de R2 (`proposta` sem `comparacao`), contra o conserto humano:
+ *   acerto  o cmd do critério virou o proposto (igual), ou outro que dá a
+ *           mesma saída nos estados da prova (equivalente: o snapshot guardado
+ *           na proposta, não o branch alvo de agora, que já andou)
+ *   erro    outro cmd com saída diferente, ou o ticket saiu de bloqueado sem o
+ *           humano trocar o cmd
+ *   (o ticket ainda bloqueado com o cmd antigo: espera)
+ */
+import { existsSync, readFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { isDeepStrictEqual } from 'node:util'
+import { blocoJson } from '../triador/comum.js'
+import type { GuardaResolvedor } from './caminhos.js'
+import { lerLedger, registrar, type Entrada } from './ledger.js'
+import { rodarEm } from './r2.js'
+
+export const CAMPOS_DO_MOTOR = ['status', 'notas_status', 'tentativas', 'adiamentos_ambiente']
+export const DESFECHO_RUIM = new Set(['bloqueou_de_novo', 'humano_mexeu', 'desfeito'])
+
+const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')
+const semMotor = (j: Record<string, unknown>) => Object.fromEntries(Object.entries(j).filter(([k]) => !CAMPOS_DO_MOTOR.includes(k)))
+const segs = (de: unknown, ate: number) => (typeof de === 'string' && !Number.isNaN(Date.parse(de)) ? Math.round((ate - Date.parse(de)) / 1000) : null)
+
+function lerJson(p: string): Record<string, unknown> | null {
+  try {
+    return blocoJson(readFileSync(p, 'utf8'))
+  } catch {
+    return null
+  }
+}
+
+export function apurarAcoes(g: GuardaResolvedor, repo: { nome: string; caminho: string }, agora: number, l: Entrada[] = lerLedger()): Entrada[] {
+  const fechadas = new Set(l.filter((e) => e.tipo === 'desfecho' && e.repo === repo.nome).map((e) => e.commit))
+  const novos: Entrada[] = []
+  for (const a of l.filter((e) => e.tipo === 'acao' && e.repo === repo.nome && !fechadas.has(e.commit))) {
+    const arq = join(repo.caminho, String(a.arquivo))
+    const agoraJ = existsSync(arq) ? lerJson(arq) : null
+    const gravado = typeof a.copia === 'string' ? lerJson(join(a.copia, 'depois.md')) : null
+    let desfecho: string | null = null
+    if (!agoraJ) desfecho = 'humano_mexeu'
+    else if (gravado && !isDeepStrictEqual(semMotor(agoraJ), semMotor(gravado))) desfecho = 'humano_mexeu'
+    else if (agoraJ.status === 'done') desfecho = 'done'
+    else if (agoraJ.status === 'bloqueado') desfecho = 'bloqueou_de_novo'
+    if (!desfecho) continue
+    const e: Entrada = {
+      ts: iso(agora),
+      tipo: 'desfecho',
+      repo: repo.nome,
+      id: a.id,
+      classe: a.classe ?? null,
+      regra: a.regra ?? null,
+      assinatura: a.assinatura,
+      acao: a.acao,
+      commit: a.commit,
+      acao_ts: a.ts,
+      desfecho,
+      bom: !DESFECHO_RUIM.has(desfecho),
+      tempo_ate_destravar_s: a.tempo_ate_destravar_s ?? null,
+      tempo_ate_desfecho_s: segs(a.ts, agora),
+      ...(desfecho === 'humano_mexeu' && !agoraJ ? { motivo: 'o arquivo do ticket sumiu' } : {}),
+    }
+    registrar(g, e)
+    novos.push(e)
+  }
+  return novos
+}
+
+interface PropostaJson {
+  arquivo: string
+  indice: number
+  criterio: string
+  espera: string
+  cmd_antigo: string
+  cmd_novo: string
+  gerada_em: string
+  arvores?: { nao_feito: Record<string, string>; head: Record<string, string> | null }
+}
+
+const norm = (s: string) => s.trim().replace(/\s+/g, ' ')
+
+/** Mesma saída (abortou, passa, saída) nos estados da prova? */
+function equivalentes(p: PropostaJson, humano: string): boolean {
+  const estados = [p.arvores?.nao_feito, p.arvores?.head].filter((x): x is Record<string, string> => !!x)
+  if (!estados.length) return false
+  return estados.every((a) => {
+    const [x, y] = rodarEm(a, [['novo', p.cmd_novo], ['humano', humano]], p.espera)
+    return x!.abortou === y!.abortou && x!.passa === y!.passa && x!.saida === y!.saida
+  })
+}
+
+export function apurarPropostas(g: GuardaResolvedor, repo: { nome: string; caminho: string }, agora: number, l: Entrada[] = lerLedger()): Entrada[] {
+  const comparadas = new Set(l.filter((e) => e.tipo === 'comparacao' && e.repo === repo.nome).map((e) => `${e.id}|${e.proposta_ts}`))
+  const novos: Entrada[] = []
+  for (const pr of l.filter((e) => e.tipo === 'proposta' && e.repo === repo.nome && e.acao === 'r2_proposta' && !comparadas.has(`${e.id}|${e.ts}`))) {
+    let p: PropostaJson
+    try {
+      p = JSON.parse(readFileSync(String(pr.proposta_json), 'utf8')) as PropostaJson
+    } catch {
+      continue
+    }
+    const j = lerJson(join(repo.caminho, p.arquivo))
+    if (!j) continue
+    const cs = Array.isArray(j.criterios_aceite) ? (j.criterios_aceite as Record<string, unknown>[]) : []
+    const atual = cs[p.indice]?.cmd
+    let resultado: 'acerto' | 'erro' | null = null
+    let como = ''
+    if (typeof atual !== 'string' || norm(atual) === norm(p.cmd_antigo)) {
+      if (j.status === 'bloqueado') continue
+      resultado = 'erro'
+      como = 'humano_nao_trocou'
+    } else if (norm(atual) === norm(p.cmd_novo)) {
+      resultado = 'acerto'
+      como = 'igual'
+    } else if (equivalentes(p, atual)) {
+      resultado = 'acerto'
+      como = 'equivalente'
+    } else {
+      resultado = 'erro'
+      como = 'diferente'
+    }
+    const e: Entrada = {
+      ts: iso(agora),
+      tipo: 'comparacao',
+      repo: repo.nome,
+      id: pr.id,
+      classe: 'R2',
+      regra: pr.regra ?? null,
+      assinatura: pr.assinatura,
+      proposta_ts: pr.ts,
+      criterio: p.criterio,
+      resultado,
+      como,
+      ...(typeof atual === 'string' ? { cmd_humano: atual } : {}),
+      tempo_ate_conserto_s: segs(pr.ts, agora),
+    }
+    registrar(g, e)
+    novos.push(e)
+  }
+  return novos
+}
+
+/**
+ * "Não consegui" e aviso: uma linha por (ticket, assinatura, motivo). A passada
+ * de 300 s não enche o ledger com o mesmo motivo.
+ */
+export function registrarSemAcao(g: GuardaResolvedor, e: Entrada, l: Entrada[] = lerLedger()): boolean {
+  const ult = [...l].reverse().find((x) => (x.tipo === 'nao_agiu' || x.tipo === 'aviso') && x.repo === e.repo && x.id === e.id)
+  if (ult && ult.tipo === e.tipo && ult.assinatura === e.assinatura && ult.motivo === e.motivo) return false
+  registrar(g, e)
+  return true
+}
diff --git a/scripts/orquestrador/resolvedor/ledger.ts b/scripts/orquestrador/resolvedor/ledger.ts
index 6ba8bcb..ef18189 100644
--- a/scripts/orquestrador/resolvedor/ledger.ts
+++ b/scripts/orquestrador/resolvedor/ledger.ts
@@ -3,8 +3,16 @@
  * acrescentada (etapa 7f-b2).
  *
  *   acao        uma ação aplicada no repo: classe, regra, assinatura, o que
- *               mudou, commit, arquivo, e a cópia do antes/depois
- *               (`acoes/<ts>/`, o desfazer usa)
+ *               mudou, commit, arquivo, a cópia do antes/depois (`acoes/<ts>/`,
+ *               o desfazer usa) e `tempo_ate_destravar_s` (do bloqueio à ação)
+ *   proposta    uma proposta em sombra gravada (R2 sempre; R1/R5 no modo sombra)
+ *   nao_agiu    "não consegui", com o motivo (uma linha por assinatura e motivo)
+ *   aviso       classe sem ação (R3, R4, R6, R7, base vermelha, palpite)
+ *   desfecho    o fim de uma ação: done, bloqueou_de_novo, humano_mexeu ou
+ *               desfeito, `bom`, e os tempos (desfecho.ts)
+ *   comparacao  proposta de R2 contra o conserto humano: acerto ou erro (desfecho.ts)
+ *   promocao, rebaixamento   o modo de uma classe mudou sozinho (peça 6)
+ *   desfeito    `orq desfazer` reverteu uma ação (peça 7)
  */
 import { readFileSync } from 'node:fs'
 import { arquivoLedger, type GuardaResolvedor } from './caminhos.js'
@@ -13,10 +21,10 @@ export interface Entrada {
   ts: string
   tipo: string
   repo: string
-  id?: string
-  classe?: string | null
-  regra?: string | null
-  assinatura?: string
+  id?: string | undefined
+  classe?: string | null | undefined
+  regra?: string | null | undefined
+  assinatura?: string | undefined
   [k: string]: unknown
 }
 
diff --git a/scripts/orquestrador/resolvedor/passada.ts b/scripts/orquestrador/resolvedor/passada.ts
index a48c153..8e82479 100644
--- a/scripts/orquestrador/resolvedor/passada.ts
+++ b/scripts/orquestrador/resolvedor/passada.ts
@@ -25,6 +25,7 @@ import { bloqueados, triarTicket, type Diagnostico } from '../triador/triar.js'
 import { agirR1R5, agirR2 } from './acoes.js'
 import { GuardaResolvedor, arquivoDryRun, interruptor, travarPassada } from './caminhos.js'
 import { decidir, type Decisao } from './decidir.js'
+import { apurarAcoes, apurarPropostas, registrarSemAcao } from './desfecho.js'
 import { acharRepo, lerReposResolvedor, type Modo, type RepoResolvedor } from './modos.js'
 
 export const TETO_DIA_USD = 5
@@ -133,6 +134,11 @@ function passadaTravada(repos: RepoResolvedor[], g: GuardaResolvedor, agora: num
   for (const repo of repos) {
     // o interruptor vale também no meio da passada: entre um ticket e outro
     if (existsSync(interruptor())) break
+    // o desfecho do que já foi feito vem antes da triagem nova (peça 5)
+    if (!dryRun) {
+      apurarAcoes(g, repo, agora)
+      apurarPropostas(g, repo, agora)
+    }
     for (const { id, dependentes } of ordenarBloqueados(repo.caminho)) {
       if (existsSync(interruptor())) break
       const diag = triar(repo, id, agora, semModelo || dryRun)
@@ -145,6 +151,20 @@ function passadaTravada(repos: RepoResolvedor[], g: GuardaResolvedor, agora: num
       const { diff, ...r } = executar({ repo, id, diag, decisao, dependentes, agora, dryRun, g })
       const item: ItemPassada = { ...base, modo: decisao.modo, acao: decisao.acao, ...r }
       itens.push(item)
+      if (!dryRun && (item.feito === 'nao_consegui' || item.feito === 'aviso')) {
+        registrarSemAcao(g, {
+          ts: new Date(agora).toISOString().replace(/\.\d{3}Z$/, 'Z'),
+          tipo: item.feito === 'aviso' ? 'aviso' : 'nao_agiu',
+          repo: repo.nome,
+          id,
+          classe: item.classe,
+          regra: item.regra,
+          assinatura: diag.assinatura,
+          acao: item.acao,
+          modo: item.modo,
+          motivo: item.motivo,
+        })
+      }
       if (dryRun) g.acrescentar(arquivoDryRun(), JSON.stringify({ ts: new Date(agora).toISOString(), ...item, assinatura: diag.assinatura, ...(diff ? { diff } : {}) }))
     }
   }
diff --git a/scripts/orquestrador/resolvedor/r2.ts b/scripts/orquestrador/resolvedor/r2.ts
index 311339d..42322f1 100644
--- a/scripts/orquestrador/resolvedor/r2.ts
+++ b/scripts/orquestrador/resolvedor/r2.ts
@@ -46,6 +46,8 @@ export interface PropostaR2 {
   cmd_antigo: string
   cmd_novo: string
   arquivos: { nao_feito: string[]; head: string[] }
+  /** o conteúdo de cada arquivo da prova: a comparação com o humano (peça 5) roda sobre ele */
+  arvores: { nao_feito: Record<string, string>; head: Record<string, string> | null }
   ref_alvo: string | null
   head: string | null
   prova: Rodada[]
@@ -96,7 +98,7 @@ cd "$1"
 out="$( ( export NO_COLOR=1 FORCE_COLOR=0 && eval "$2" ) 2>&1 || true )"
 printf '%s' "$out"`
 
-function rodar(dir: string, cmd: string, espera: string): { saida: string; abortou: boolean; passa: boolean } {
+export function rodar(dir: string, cmd: string, espera: string): { saida: string; abortou: boolean; passa: boolean } {
   const r = spawnSync('bash', ['-c', HARNESS, 'prova', dir, cmd], {
     encoding: 'utf8',
     timeout: 10_000,
@@ -107,19 +109,35 @@ function rodar(dir: string, cmd: string, espera: string): { saida: string; abort
   return { saida, abortou: r.status !== 0 || /unbound variable|syntax error/.test(saida), passa: r.status === 0 && criterioPassa(saida, espera) }
 }
 
-/** Uma árvore temporária com os arquivos citados, como estão num ref. */
-function arvore(raiz: string, ref: string | ((f: string) => string | null), arquivos: string[]): { dir: string; postos: string[] } {
+/** Uma árvore temporária com os arquivos dados (caminho → conteúdo). */
+function arvoreDe(conteudos: Record<string, string>): string {
   const dir = mkdtempSync(join(tmpdir(), 'orq-r2-'))
-  const postos: string[] = []
+  for (const [f, txt] of Object.entries(conteudos)) {
+    mkdirSync(dirname(join(dir, f)), { recursive: true })
+    writeFileSync(join(dir, f), txt)
+  }
+  return dir
+}
+
+/** Os arquivos citados, como estão num ref (o que não existe lá fica de fora). */
+function conteudosEm(raiz: string, ref: string | ((f: string) => string | null), arquivos: string[]): Record<string, string> {
+  const out: Record<string, string> = {}
   for (const f of arquivos) {
     const g = typeof ref === 'function' ? null : gitLeitura(raiz, ['show', `${ref}:${f}`])
     const txt = typeof ref === 'function' ? ref(f) : g!.rc === 0 ? g!.stdout : null
-    if (txt === null) continue
-    mkdirSync(dirname(join(dir, f)), { recursive: true })
-    writeFileSync(join(dir, f), txt)
-    postos.push(f)
+    if (txt !== null) out[f] = txt
+  }
+  return out
+}
+
+/** Roda os cmds dados num estado (cópia temporária), no harness do executor. */
+export function rodarEm(conteudos: Record<string, string>, cmds: [string, string][], espera: string): ({ cmd: string } & ReturnType<typeof rodar>)[] {
+  const dir = arvoreDe(conteudos)
+  try {
+    return cmds.map(([qual, cmd]) => ({ cmd: qual, ...rodar(dir, cmd, espera) }))
+  } finally {
+    rmSync(dir, { recursive: true, force: true })
   }
-  return { dir, postos }
 }
 
 /** O índice do critério: `criterio[i]` (legado) ou a descrição (kit). */
@@ -169,18 +187,13 @@ export function planejarR2(raiz: string, diag: Diagnostico, md: string): Plano<P
   const arqs = citados(antigo)
   const fonteAlvo = (f: string) => noAlvo(raiz, f)
   const alvoRef = arqs.map(fonteAlvo).find((x) => x)?.ref ?? null
-  const prova: Rodada[] = []
-  const nf = arvore(raiz, (f) => fonteAlvo(f)?.texto ?? null, arqs)
+  const nf = conteudosEm(raiz, (f) => fonteAlvo(f)?.texto ?? null, arqs)
   const head = headDa(raiz, diag)
-  const hd = head ? arvore(raiz, head, arqs) : null
-  try {
-    for (const [estado, a] of [['nao_feito', nf], ['head', hd]] as const) {
-      if (!a) continue
-      for (const [qual, cmd] of [['novo', novoCmd], ['antigo', antigo]] as const) prova.push({ estado, cmd: qual, ...rodar(a.dir, cmd, espera) })
-    }
-  } finally {
-    rmSync(nf.dir, { recursive: true, force: true })
-    if (hd) rmSync(hd.dir, { recursive: true, force: true })
+  const hd = head ? conteudosEm(raiz, head, arqs) : null
+  const prova: Rodada[] = []
+  for (const [estado, a] of [['nao_feito', nf], ['head', hd]] as const) {
+    if (!a) continue
+    for (const r of rodarEm(a, [['novo', novoCmd], ['antigo', antigo]], espera)) prova.push({ estado, ...(r as Omit<Rodada, 'estado'>) })
   }
   const novoNf = prova.find((p) => p.estado === 'nao_feito' && p.cmd === 'novo')!
   if (novoNf.abortou) return { ok: false, motivo: `o cmd consertado ainda aborta no estado não feito: ${novoNf.saida.slice(0, 120)}` }
@@ -201,7 +214,8 @@ export function planejarR2(raiz: string, diag: Diagnostico, md: string): Plano<P
       espera,
       cmd_antigo: antigo,
       cmd_novo: novoCmd,
-      arquivos: { nao_feito: nf.postos, head: hd?.postos ?? [] },
+      arquivos: { nao_feito: Object.keys(nf), head: hd ? Object.keys(hd) : [] },
+      arvores: { nao_feito: nf, head: hd },
       ref_alvo: alvoRef,
       head,
       prova,
diff --git a/test/orquestrador-resolvedor-acoes.test.ts b/test/orquestrador-resolvedor-acoes.test.ts
index a64bccd..1e58c9d 100644
--- a/test/orquestrador-resolvedor-acoes.test.ts
+++ b/test/orquestrador-resolvedor-acoes.test.ts
@@ -141,7 +141,7 @@ describe('peça 3: ações R1 e R5 com as travas', () => {
     spawnSync('rm', ['-f', join(r.raiz, '.git', 'index.lock')])
     expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
     expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
-    expect(ledger()).toEqual([])
+    expect(ledger().filter((e) => e.tipo === 'acao')).toEqual([])
   })
 
   it('com o interruptor ele não faz nada: nem triagem, nem ledger, nem o repo', () => {
diff --git a/test/orquestrador-resolvedor-ledger.test.ts b/test/orquestrador-resolvedor-ledger.test.ts
new file mode 100644
index 0000000..310a8c0
--- /dev/null
+++ b/test/orquestrador-resolvedor-ledger.test.ts
@@ -0,0 +1,176 @@
+/**
+ * Etapa 7f-b2, peça 5 · o ledger de desfecho (`~/.orq/resolvedor/ledger.jsonl`).
+ *
+ * Pronto quando:
+ *   - cada ação tem classe, regra, o que mudou, commit e o tempo até destravar;
+ *   - nas passadas seguintes entra o desfecho: done (com o tempo), bloqueou de
+ *     novo, humano mexeu; uma vez só por ação;
+ *   - "não consegui" entra com o motivo, uma vez por assinatura e motivo;
+ *   - a proposta de R2 é comparada com o conserto humano quando ele acontece:
+ *     igual ou equivalente é acerto; outro cmd, ou destravar sem trocar o cmd,
+ *     é erro; com o ticket ainda bloqueado e o cmd antigo, espera.
+ */
+import { existsSync, readFileSync, writeFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
+import { spawnSync } from 'node:child_process'
+import { mkdirSync } from 'node:fs'
+import { ambiente, comEnv, git, jsonDo, repoDoCaso } from './resolvedor-repo.js'
+
+const RES = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'resolvedor')
+const T0 = Date.parse('2026-10-11T12:00:00Z')
+const H = 3600 * 1000
+
+type Passada = (o: { repo?: string; semModelo?: boolean; agora?: number }) => { itens: { id: string; feito: string; motivo: string }[] }
+
+describe('peça 5: ledger de desfecho', () => {
+  let passada: Passada | null = null
+  let amb: ReturnType<typeof ambiente>
+  let tira: () => void
+  let n = 0
+  const caso = (id: string, modos: unknown = { R1: 'auto', R5: 'auto', R2: 'sombra' }, o: { arvoreSuja?: boolean } = {}) => {
+    const r = repoDoCaso(join(amb.base, `c${++n}`), id, { nome: 'comarka-operacional', ...o })
+    amb.repos([{ nome: 'cmk', caminho: r.raiz, resolvedor: modos }])
+    return r
+  }
+  const ledger = () => {
+    const p = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
+    return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []
+  }
+  const de = (tipo: string) => ledger().filter((e) => e.tipo === tipo)
+  const passa = (agora: number) => passada!({ repo: 'cmk', semModelo: true, agora })
+  /** o ticket como o loop deixaria: o json com status e nota trocados */
+  const loop = (arq: string, status: string, nota: string) => {
+    const md = readFileSync(arq, 'utf8')
+    writeFileSync(arq, md.replace(/"status": "[^"]*"/, `"status": "${status}"`).replace(/"notas_status": "(?:[^"\\]|\\.)*"/, `"notas_status": ${JSON.stringify(nota)}`))
+  }
+
+  beforeAll(async () => {
+    amb = ambiente()
+    tira = comEnv(amb.env)
+    try {
+      passada = ((await import(pathToFileURL(join(RES, 'passada.ts')).href)) as { passada: Passada }).passada
+    } catch {
+      passada = null
+    }
+  })
+  afterAll(() => tira?.())
+  beforeEach(() => {
+    spawnSync('rm', ['-rf', amb.env.ORQ_RESOLVEDOR_DIR!, amb.env.ORQ_DIAG_DIR!])
+    mkdirSync(amb.env.ORQ_DIAG_DIR!, { recursive: true })
+  })
+
+  it('a ação: classe, regra, o que mudou, commit e tempo até destravar', () => {
+    expect(passada).toBeTypeOf('function')
+    const r = caso('840')
+    passa(T0)
+    const [a] = de('acao')
+    expect(a).toEqual(
+      expect.objectContaining({
+        repo: 'cmk',
+        id: '840',
+        classe: 'R1',
+        regra: 'D6',
+        commit: git(r.raiz, 'rev-parse', 'HEAD').trim(),
+        mudou: expect.stringMatching(/test\/nps-reacao-resposta\.test\.ts na allowlist/),
+        // bloqueio em 2026-10-10T22:50:37Z, ação em T0
+        tempo_ate_destravar_s: (T0 - Date.parse('2026-10-10T22:50:37Z')) / 1000,
+      }),
+    )
+  })
+
+  it('desfecho done, com o tempo, uma vez só', () => {
+    const r = caso('840')
+    passa(T0)
+    passa(T0 + H)
+    expect(de('desfecho')).toEqual([])
+    loop(join(r.raiz, r.ticket), 'done', 'aprovado (tentativa 1): ok')
+    passa(T0 + 2 * H)
+    passa(T0 + 3 * H)
+    expect(de('desfecho')).toEqual([expect.objectContaining({ id: '840', classe: 'R1', desfecho: 'done', bom: true, tempo_ate_desfecho_s: 7200, commit: de('acao')[0]!.commit })])
+  })
+
+  it('desfecho bloqueou de novo: ruim, e o segundo bloqueio vai para humano com o motivo', () => {
+    const r = caso('940')
+    passa(T0)
+    writeFileSync(join(r.raiz, r.ticket), r.antes)
+    passa(T0 + H)
+    passa(T0 + 2 * H)
+    expect(de('desfecho')).toEqual([expect.objectContaining({ id: '940', classe: 'R5', regra: 'D1', desfecho: 'bloqueou_de_novo', bom: false })])
+    expect(de('nao_agiu')).toEqual([expect.objectContaining({ id: '940', motivo: expect.stringMatching(/segunda vez bloqueado/) })])
+  })
+
+  it('desfecho humano mexeu: o json fora dos campos do motor mudou', () => {
+    const r = caso('932')
+    passa(T0)
+    const arq = join(r.raiz, r.ticket)
+    writeFileSync(arq, readFileSync(arq, 'utf8').replace('"status": "pendente"', '"status": "pendente",\n  "nota_humana": "refatiado"'))
+    passa(T0 + H)
+    expect(de('desfecho')).toEqual([expect.objectContaining({ id: '932', desfecho: 'humano_mexeu', bom: false })])
+  })
+
+  it('o loop escrevendo status, nota e tentativas não é humano mexendo', () => {
+    const r = caso('932')
+    passa(T0)
+    const arq = join(r.raiz, r.ticket)
+    writeFileSync(arq, readFileSync(arq, 'utf8').replace('"status": "pendente"', '"tentativas": 1,\n  "status": "pendente"'))
+    loop(arq, 'em_andamento', '')
+    passa(T0 + H)
+    expect(de('desfecho')).toEqual([])
+  })
+
+  it('"não consegui" com o motivo, uma linha por assinatura e motivo', () => {
+    const r = caso('940', { R5: 'auto' }, { arvoreSuja: true })
+    passa(T0)
+    passa(T0 + H)
+    passa(T0 + 2 * H)
+    expect(de('nao_agiu')).toEqual([expect.objectContaining({ id: '940', classe: 'R5', regra: 'D1', motivo: expect.stringMatching(/árvore alvo ainda suja/), assinatura: expect.stringMatching(/^[0-9a-f]{64}$/) })])
+    expect(jsonDo(readFileSync(join(r.raiz, r.ticket), 'utf8')).status).toBe('bloqueado')
+  })
+
+  describe('R2: a proposta contra o conserto humano', () => {
+    const humano = (r: ReturnType<typeof caso>, cmd?: (c: string) => string) => {
+      let md = r.depois
+      if (cmd) {
+        const velho = (jsonDo(r.depois).criterios_aceite as { cmd: string }[])[12]!.cmd
+        md = md.replace(JSON.stringify(velho), JSON.stringify(cmd(velho)))
+      }
+      writeFileSync(join(r.raiz, r.ticket), md)
+    }
+
+    it('espera enquanto o ticket está bloqueado com o cmd antigo; o cmd do humano igual ao proposto é acerto', () => {
+      const r = caso('929')
+      passa(T0)
+      expect(de('proposta')).toEqual([expect.objectContaining({ id: '929', classe: 'R2?', acao: 'r2_proposta' })])
+      passa(T0 + H)
+      expect(de('comparacao')).toEqual([])
+      humano(r)
+      passa(T0 + 2 * H)
+      passa(T0 + 3 * H)
+      expect(de('comparacao')).toEqual([expect.objectContaining({ id: '929', classe: 'R2', resultado: 'acerto', como: 'igual', tempo_ate_conserto_s: 7200 })])
+    })
+
+    it('outro cmd com a mesma saída nos estados da prova é acerto (equivalente)', () => {
+      const r = caso('929')
+      passa(T0)
+      humano(r, (c) => c.replaceAll('|| true', '|| :'))
+      passa(T0 + H)
+      expect(de('comparacao')).toEqual([expect.objectContaining({ resultado: 'acerto', como: 'equivalente' })])
+    })
+
+    it('cmd com saída diferente é erro; destravar sem trocar o cmd é erro', () => {
+      const r = caso('929')
+      passa(T0)
+      humano(r, () => 'echo PERIODO_NA_ABA')
+      passa(T0 + H)
+      expect(de('comparacao')).toEqual([expect.objectContaining({ resultado: 'erro', como: 'diferente', cmd_humano: 'echo PERIODO_NA_ABA' })])
+      const r2 = caso('929')
+      spawnSync('rm', ['-rf', amb.env.ORQ_RESOLVEDOR_DIR!])
+      passa(T0)
+      loop(join(r2.raiz, r2.ticket), 'pendente', '')
+      passa(T0 + H)
+      expect(de('comparacao')).toEqual([expect.objectContaining({ resultado: 'erro', como: 'humano_nao_trocou' })])
+    })
+  })
+})
diff --git a/test/orquestrador-resolvedor-passada.test.ts b/test/orquestrador-resolvedor-passada.test.ts
index 8d4fee5..7e6f75f 100644
--- a/test/orquestrador-resolvedor-passada.test.ts
+++ b/test/orquestrador-resolvedor-passada.test.ts
@@ -7,7 +7,7 @@
  *     que tem menos (dependência direta, fora de done/obsoleto);
  *   - cada um passa pelo triador existente (o diagnóstico fica em ORQ_DIAG_DIR);
  *   - em --dry-run nada muda no repo (arquivo, índice, commits), o ledger não
- *     nasce, e o que faria fica em dry-run.jsonl e na saída.
+ *     muda, e o que faria fica em dry-run.jsonl e na saída.
  */
 import { spawnSync } from 'node:child_process'
 import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
@@ -98,12 +98,14 @@ describe('peça 2: a passada', () => {
     const r = repoDoCaso(join(amb.base, 'dry'), '840', { nome: 'comarka-operacional' })
     amb.repos([{ nome: 'comarka-dry', caminho: r.raiz, resolvedor: { R1: 'auto' } }])
     const headAntes = git(r.raiz, 'rev-parse', 'HEAD')
+    const pLedger = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
+    const ledgerAntes = existsSync(pLedger) ? readFileSync(pLedger, 'utf8') : null
     const res = m!.passada({ repo: 'comarka-dry', dryRun: true })
     expect(res.itens).toEqual([expect.objectContaining({ id: '840', acao: 'r1_allowlist', feito: 'faria' })])
     expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
     expect(git(r.raiz, 'rev-parse', 'HEAD')).toBe(headAntes)
     expect(git(r.raiz, 'status', '--porcelain')).toBe('')
-    expect(existsSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl'))).toBe(false)
+    expect(existsSync(pLedger) ? readFileSync(pLedger, 'utf8') : null).toBe(ledgerAntes)
     const linhas = readFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'dry-run.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { id: string; acao: string })
     expect(linhas.at(-1)).toEqual(expect.objectContaining({ id: '840', acao: 'r1_allowlist' }))
   })
```

### b109bda 7f-b2-6: promoção e rebaixamento por classe e repo, no ledger e no repos.json

```diff
commit b109bda16b079bdd105d318a2f6366b78432ce08
Author: Lucas Santos
Date: Sat Oct 10 23:10:07 2026 -0300

7f-b2-6: promoção e rebaixamento por classe e repo, no ledger e no repos.json

R2 em sombra sobe para auto com 9 acertos nas 10 últimas propostas comparadas
com o humano (nesta etapa R2 em auto ainda só propõe: a promoção fica
registrada). Qualquer classe em auto volta para sombra com 2 desfechos ruins
seguidos (bloqueou de novo, humano mexeu, desfeito; em R2, comparação com
erro). Só conta o que veio depois da última mudança de modo da classe no repo;
a passada que muda o modo já age no modo novo. O repos.json é regravado só no
campo `resolvedor` daquele repo, pela guarda (troca atômica).

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/resolvedor/caminhos.ts   |   3 +-
 scripts/orquestrador/resolvedor/passada.ts    |   3 +
 scripts/orquestrador/resolvedor/promocao.ts   |  70 +++++++++++++++
 test/orquestrador-resolvedor-promocao.test.ts | 125 ++++++++++++++++++++++++++
 4 files changed, 200 insertions(+), 1 deletion(-)
diff --git a/scripts/orquestrador/resolvedor/caminhos.ts b/scripts/orquestrador/resolvedor/caminhos.ts
index da7515a..5307ef2 100644
--- a/scripts/orquestrador/resolvedor/caminhos.ts
+++ b/scripts/orquestrador/resolvedor/caminhos.ts
@@ -59,7 +59,8 @@ export class GuardaResolvedor {
 
   escrever(destino: string, conteudo: string): void {
     const real = this.confere(destino)
-    mkdirSync(this.confere(dirname(real)), { recursive: true })
+    // o repos.json não ganha diretório: ele já existe (a promoção só regrava)
+    if (real !== this.repos) mkdirSync(this.confere(dirname(real)), { recursive: true })
     // troca atômica: quem lê (o painel, a próxima passada) nunca vê meio arquivo
     const tmp = `${real}.tmp-${process.pid}`
     if (real !== this.repos) this.confere(tmp)
diff --git a/scripts/orquestrador/resolvedor/passada.ts b/scripts/orquestrador/resolvedor/passada.ts
index 8e82479..292cf7b 100644
--- a/scripts/orquestrador/resolvedor/passada.ts
+++ b/scripts/orquestrador/resolvedor/passada.ts
@@ -27,6 +27,7 @@ import { GuardaResolvedor, arquivoDryRun, interruptor, travarPassada } from './c
 import { decidir, type Decisao } from './decidir.js'
 import { apurarAcoes, apurarPropostas, registrarSemAcao } from './desfecho.js'
 import { acharRepo, lerReposResolvedor, type Modo, type RepoResolvedor } from './modos.js'
+import { promoverRebaixar } from './promocao.js'
 
 export const TETO_DIA_USD = 5
 
@@ -138,6 +139,8 @@ function passadaTravada(repos: RepoResolvedor[], g: GuardaResolvedor, agora: num
     if (!dryRun) {
       apurarAcoes(g, repo, agora)
       apurarPropostas(g, repo, agora)
+      // e o modo que vale nesta passada já é o depois da promoção/rebaixamento (peça 6)
+      promoverRebaixar(g, repo, agora)
     }
     for (const { id, dependentes } of ordenarBloqueados(repo.caminho)) {
       if (existsSync(interruptor())) break
diff --git a/scripts/orquestrador/resolvedor/promocao.ts b/scripts/orquestrador/resolvedor/promocao.ts
new file mode 100644
index 0000000..3db225a
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/promocao.ts
@@ -0,0 +1,70 @@
+/**
+ * promocao.ts — o modo de uma classe muda sozinho, por repo (etapa 7f-b2,
+ * peça 6; decisão do chat do programa):
+ *
+ *   promoção     R2 sobe de sombra para auto com 9 acertos nas 10 últimas
+ *                propostas comparadas com o humano (`comparacao` do ledger).
+ *                Nesta etapa R2 em auto continua só propondo (decidir.ts): a
+ *                promoção fica registrada para quando a aplicação existir;
+ *   rebaixamento qualquer classe em auto volta para sombra com 2 desfechos
+ *                ruins seguidos (bloqueou de novo, humano mexeu, desfeito; para
+ *                R2, comparação com erro).
+ *
+ * Só conta o que veio DEPOIS da última mudança de modo daquela classe naquele
+ * repo: um rebaixamento não se repete com os mesmos desfechos. Cada mudança vai
+ * ao ledger (`promocao`/`rebaixamento`) e ao repos.json (`gravarModo`). Repo
+ * passado por caminho, fora do repos.json, não muda de modo.
+ */
+import type { GuardaResolvedor } from './caminhos.js'
+import { DESFECHO_RUIM } from './desfecho.js'
+import { lerLedger, registrar, type Entrada } from './ledger.js'
+import { gravarModo, lerReposResolvedor, modoDe, type RepoResolvedor } from './modos.js'
+
+export const PROMOVE_ACERTOS = 9
+export const PROMOVE_JANELA = 10
+export const REBAIXA_RUINS = 2
+
+const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')
+const base = (c: unknown) => String(c ?? '').replace('?', '').split('|')[0]!
+
+/** Os fatos (bom/ruim, em ordem) de uma classe num repo desde a última mudança de modo dela. */
+function fatos(l: Entrada[], repo: string, classe: string): { ts: string; bom: boolean; tipo: string }[] {
+  let ini = 0
+  l.forEach((e, i) => {
+    if ((e.tipo === 'promocao' || e.tipo === 'rebaixamento') && e.repo === repo && e.classe === classe) ini = i + 1
+  })
+  return l.slice(ini).flatMap((e) => {
+    if (e.repo !== repo || base(e.classe) !== classe) return []
+    if (e.tipo === 'desfecho') return [{ ts: e.ts, bom: !DESFECHO_RUIM.has(String(e.desfecho)), tipo: 'desfecho' }]
+    if (e.tipo === 'comparacao') return [{ ts: e.ts, bom: e.resultado === 'acerto', tipo: 'comparacao' }]
+    return []
+  })
+}
+
+export function promoverRebaixar(g: GuardaResolvedor, repo: RepoResolvedor, agora: number, l: Entrada[] = lerLedger()): Entrada[] {
+  if (!lerReposResolvedor().some((r) => r.caminho === repo.caminho)) return []
+  const out: Entrada[] = []
+  const muda = (classe: string, para: 'auto' | 'sombra', tipo: 'promocao' | 'rebaixamento', motivo: string, considerados: { ts: string; bom: boolean }[]) => {
+    const de = modoDe(repo.modos, classe)
+    gravarModo(g, repo.caminho, classe, para)
+    repo.modos = { ...repo.modos, [classe]: para }
+    const e: Entrada = { ts: iso(agora), tipo, repo: repo.nome, classe, de, para, motivo, considerados }
+    registrar(g, e)
+    l.push(e)
+    out.push(e)
+  }
+  const classes = new Set(l.filter((e) => e.repo === repo.nome && (e.tipo === 'desfecho' || e.tipo === 'comparacao')).map((e) => base(e.classe)))
+  for (const c of [...classes].sort()) {
+    const fs = fatos(l, repo.nome, c)
+    const modo = modoDe(repo.modos, c)
+    if (modo === 'auto') {
+      const ult = fs.slice(-REBAIXA_RUINS)
+      if (ult.length === REBAIXA_RUINS && ult.every((f) => !f.bom)) muda(c, 'sombra', 'rebaixamento', `${REBAIXA_RUINS} desfechos ruins seguidos`, ult)
+    } else if (modo === 'sombra' && c === 'R2') {
+      const comps = fs.filter((f) => f.tipo === 'comparacao').slice(-PROMOVE_JANELA)
+      const acertos = comps.filter((f) => f.bom).length
+      if (comps.length === PROMOVE_JANELA && acertos >= PROMOVE_ACERTOS) muda(c, 'auto', 'promocao', `${acertos} acertos nas ${PROMOVE_JANELA} últimas propostas`, comps)
+    }
+  }
+  return out
+}
diff --git a/test/orquestrador-resolvedor-promocao.test.ts b/test/orquestrador-resolvedor-promocao.test.ts
new file mode 100644
index 0000000..3427de8
--- /dev/null
+++ b/test/orquestrador-resolvedor-promocao.test.ts
@@ -0,0 +1,125 @@
+/**
+ * Etapa 7f-b2, peça 6 · promoção e rebaixamento, por classe e repo.
+ *
+ * Pronto quando:
+ *   - R2 em sombra sobe para auto sozinho com 9 acertos nas 10 últimas
+ *     propostas (8 em 10, ou 9 em 9, não sobe);
+ *   - qualquer classe em auto com 2 desfechos ruins seguidos volta para sombra
+ *     (ruim, bom não; bom depois de ruim zera), e a passada que rebaixou já age
+ *     no modo novo;
+ *   - cada mudança vai ao ledger e ao repos.json (o resto do arquivo fica), e
+ *     não se repete com os mesmos fatos.
+ */
+import { spawnSync } from 'node:child_process'
+import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
+import { ambiente, comEnv, repoDoCaso } from './resolvedor-repo.js'
+
+const RES = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'resolvedor')
+const T0 = Date.parse('2026-10-11T12:00:00Z')
+
+type Passada = (o: { repo?: string; semModelo?: boolean; agora?: number }) => { itens: { id: string; acao: string; feito: string }[] }
+
+describe('peça 6: promoção e rebaixamento', () => {
+  let passada: Passada | null = null
+  let amb: ReturnType<typeof ambiente>
+  let tira: () => void
+  let n = 0
+  const OUTRO = { nome: 'outro', caminho: '/nao/existe/outro', resolvedor: 'diagnostico', extra: 'fica' }
+  const caso = (id: string, modos: unknown) => {
+    const r = repoDoCaso(join(amb.base, `c${++n}`), id, { nome: 'comarka-operacional' })
+    amb.repos([OUTRO, { nome: 'cmk', caminho: r.raiz, resolvedor: modos, painel: 'sim' }])
+    return r
+  }
+  const lp = () => join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
+  const semear = (es: Record<string, unknown>[]) => {
+    mkdirSync(amb.env.ORQ_RESOLVEDOR_DIR!, { recursive: true })
+    writeFileSync(lp(), es.map((e) => JSON.stringify(e)).join('\n') + '\n')
+  }
+  const ledger = () => (existsSync(lp()) ? readFileSync(lp(), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>) : [])
+  const repos = () => JSON.parse(readFileSync(amb.env.ORQ_REPOS!, 'utf8')) as { repos: Record<string, unknown>[] }
+  const comps = (acertos: number, total: number) =>
+    Array.from({ length: total }, (_, i) => ({ ts: `2026-10-0${1 + (i % 9)}T00:00:${String(i).padStart(2, '0')}Z`, tipo: 'comparacao', repo: 'cmk', id: `9${i}`, classe: 'R2', resultado: i < total - acertos ? 'erro' : 'acerto' }))
+  const desf = (classe: string, ...ds: string[]) => ds.map((d, i) => ({ ts: `2026-10-02T00:00:0${i}Z`, tipo: 'desfecho', repo: 'cmk', id: `8${i}`, classe, regra: 'D1', desfecho: d, bom: d === 'done' }))
+
+  beforeAll(async () => {
+    amb = ambiente()
+    tira = comEnv(amb.env)
+    try {
+      passada = ((await import(pathToFileURL(join(RES, 'passada.ts')).href)) as { passada: Passada }).passada
+    } catch {
+      passada = null
+    }
+  })
+  afterAll(() => tira?.())
+  beforeEach(() => {
+    spawnSync('rm', ['-rf', amb.env.ORQ_RESOLVEDOR_DIR!, amb.env.ORQ_DIAG_DIR!])
+    mkdirSync(amb.env.ORQ_DIAG_DIR!, { recursive: true })
+  })
+
+  it('R2 sobe para auto com 9 acertos em 10, no ledger e no repos.json; o resto do repos.json fica', () => {
+    expect(passada).toBeTypeOf('function')
+    caso('929', { padrao: 'diagnostico', R1: 'auto', R2: 'sombra' })
+    semear(comps(9, 10))
+    passada!({ repo: 'cmk', semModelo: true, agora: T0 })
+    const d = repos()
+    expect(d.repos[1]).toEqual(expect.objectContaining({ nome: 'cmk', painel: 'sim', resolvedor: { padrao: 'diagnostico', R1: 'auto', R2: 'auto' } }))
+    expect(d.repos[0]).toEqual(OUTRO)
+    expect(ledger().filter((e) => e.tipo === 'promocao')).toEqual([expect.objectContaining({ repo: 'cmk', classe: 'R2', de: 'sombra', para: 'auto' })])
+    passada!({ repo: 'cmk', semModelo: true, agora: T0 + 1000 })
+    expect(ledger().filter((e) => e.tipo === 'promocao')).toHaveLength(1)
+  })
+
+  for (const [acertos, total] of [
+    [8, 10],
+    [9, 9],
+  ] as const) {
+    it(`R2 com ${acertos} acertos em ${total} não sobe`, () => {
+      caso('929', { R2: 'sombra' })
+      semear(comps(acertos, total))
+      passada!({ repo: 'cmk', semModelo: true, agora: T0 })
+      expect((repos().repos[1]!.resolvedor as Record<string, string>).R2).toBe('sombra')
+      expect(ledger().filter((e) => e.tipo === 'promocao')).toEqual([])
+    })
+  }
+
+  it('R5 em auto com 2 desfechos ruins seguidos volta para sombra, e a mesma passada já só propõe', () => {
+    const r = caso('940', { R5: 'auto' })
+    semear(desf('R5', 'done', 'bloqueou_de_novo', 'humano_mexeu'))
+    const p = passada!({ repo: 'cmk', semModelo: true, agora: T0 })
+    expect((repos().repos[1]!.resolvedor as Record<string, string>).R5).toBe('sombra')
+    expect(ledger().filter((e) => e.tipo === 'rebaixamento')).toEqual([expect.objectContaining({ repo: 'cmk', classe: 'R5', de: 'auto', para: 'sombra' })])
+    expect(p.itens).toEqual([expect.objectContaining({ id: '940', acao: 'sombra', feito: 'proposto' })])
+    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+  })
+
+  for (const seq of [
+    ['bloqueou_de_novo', 'done'],
+    ['humano_mexeu', 'done', 'bloqueou_de_novo'],
+    ['desfeito'],
+  ]) {
+    it(`R5 em auto com ${seq.join(', ')} não volta`, () => {
+      caso('940', { R5: 'auto' })
+      semear(desf('R5', ...seq))
+      passada!({ repo: 'cmk', semModelo: true, agora: T0 })
+      expect((repos().repos[1]!.resolvedor as Record<string, string>).R5).toBe('auto')
+      expect(ledger().filter((e) => e.tipo === 'rebaixamento')).toEqual([])
+    })
+  }
+
+  it('os mesmos fatos não rebaixam de novo depois que o humano devolve para auto', () => {
+    caso('932', { R5: 'auto' })
+    semear(desf('R5', 'bloqueou_de_novo', 'desfeito'))
+    passada!({ repo: 'cmk', semModelo: true, agora: T0 })
+    expect((repos().repos[1]!.resolvedor as Record<string, string>).R5).toBe('sombra')
+    // o humano põe de volta em auto no repos.json
+    const d = repos()
+    ;(d.repos[1]!.resolvedor as Record<string, string>).R5 = 'auto'
+    writeFileSync(amb.env.ORQ_REPOS!, JSON.stringify(d, null, 2))
+    passada!({ repo: 'cmk', semModelo: true, agora: T0 + 1000 })
+    expect((repos().repos[1]!.resolvedor as Record<string, string>).R5).toBe('auto')
+    expect(ledger().filter((e) => e.tipo === 'rebaixamento')).toHaveLength(1)
+  })
+})
```

### 7daad91 7f-b2-7: orq desfazer <repo> <id>: reverte a última ação do resolvedor no ticket

```diff
commit 7daad919450ac21a09e319032d9d00a49e4d0ee2
Author: Lucas Santos
Date: Sat Oct 10 23:11:44 2026 -0300

7f-b2-7: orq desfazer <repo> <id>: reverte a última ação do resolvedor no ticket

Só com o trailer Orq-Resolvedor da ação no commit, sem commit depois tocando
o arquivo e com o arquivo no disco igual ao do commit (nem writeback do loop).
O ticket volta à cópia do antes, num commit só dele pela mesma porta (espera
git, nunca --no-verify), com o trailer Orq-Resolvedor-Desfaz. O ledger ganha
`desfeito` e o desfecho `desfeito` (ruim, conta para o rebaixamento); a ação
continua sendo a única do ticket.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orq                                   | 13 +++-
 scripts/orquestrador/resolvedor/cli.ts        | 15 +++-
 scripts/orquestrador/resolvedor/desfazer.ts   | 66 ++++++++++++++++++
 test/orquestrador-resolvedor-desfazer.test.ts | 99 +++++++++++++++++++++++++++
 4 files changed, 190 insertions(+), 3 deletions(-)
diff --git a/scripts/orq b/scripts/orq
index 4fdb7b0..ebe42a6 100755
--- a/scripts/orq
+++ b/scripts/orq
@@ -16,6 +16,11 @@
 #
 # `triar` (7f) não escreve no repo: grava o diagnóstico em ~/.orq/diagnosticos.
 #
+# `resolver` e `desfazer` (7f-b2) são a exceção consciente: escrevem num repo
+# instalado (nunca neste checkout) SÓ o arquivo do ticket bloqueado, num commit
+# só dele com trailer `Orq-Resolvedor`, no modo `auto` do repo no
+# ~/.orq/repos.json, e com as travas de scripts/orquestrador/resolvedor/.
+#
 # Nenhum subcomando toca ticket, staging, worktree, branch ou lock, e nenhum
 # mata processo — parar o loop é desagendar + esperar o disparo corrente
 # (Ciclo de vida, na SKILL). Se `orq` puder alterar estado, alguém vai
@@ -41,6 +46,9 @@
 #   orq triar <repo> [<id>] [--passada] [--forcar] [--sem-modelo]
 #                        triador de bloqueios (7f): diagnóstico em ~/.orq/diagnosticos,
 #                        nunca no repo; --fixture <dir> roda sobre a fixture da 7f
+#   orq resolver [--repo X] [--dry-run] [--sem-modelo]
+#                        resolvedor de bloqueios (7f-b2): tria e, no modo do repo, age
+#   orq desfazer <repo> <id>   reverte a última ação do resolvedor no ticket
 
 set -euo pipefail
 ORQ_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
@@ -100,8 +108,9 @@ fi
 # ~/.orq/repos.json (ou o --repo), não sobre o checkout onde este `orq` está.
 # Ele é o único verbo que escreve num repo instalado sem ser o loop: só o
 # arquivo do ticket bloqueado, em commit próprio com trailer, e só no modo
-# `auto` do repo (scripts/orquestrador/resolvedor/, CONTRATO §14).
-if [ "${1:-}" = resolver ]; then
+# `auto` do repo (scripts/orquestrador/resolvedor/, CONTRATO §14). `desfazer`
+# reverte a última ação dele num ticket, pela mesma porta.
+if [ "${1:-}" = resolver ] || [ "${1:-}" = desfazer ]; then
   _root="${ORQ_EXEC_ROOT:-$(cd "$ORQ_DIR/.." && pwd)}"
   _gc="$(git -C "$_root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
   if [ -n "$_gc" ] && [ -d "$_gc" ]; then _main="$(cd "$_gc/.." && pwd)"; else _main="$_root"; fi
diff --git a/scripts/orquestrador/resolvedor/cli.ts b/scripts/orquestrador/resolvedor/cli.ts
index 156b3c3..72f353f 100644
--- a/scripts/orquestrador/resolvedor/cli.ts
+++ b/scripts/orquestrador/resolvedor/cli.ts
@@ -2,14 +2,17 @@
  * cli.ts — `orq resolver` (etapa 7f-b2).
  *
  *   orq resolver [--repo X] [--dry-run] [--sem-modelo]
+ *   orq desfazer <repo> <id>
  *
  * <X> é um nome do `~/.orq/repos.json` ou um caminho. Sem `--repo`, todos os
  * repos do repos.json, cada um no seu modo (modos.ts). Imprime uma linha por
  * bloqueado, na ordem em que a passada os tratou.
  */
+import { desfazer } from './desfazer.js'
 import { passada, resumo } from './passada.js'
 
 const USO_RESOLVER = 'uso: orq resolver [--repo <nome|caminho>] [--dry-run] [--sem-modelo]'
+const USO_DESFAZER = 'uso: orq desfazer <repo> <id>'
 
 export function parseResolver(argv: string[]): { repo?: string; dryRun: boolean; semModelo: boolean } {
   const a: { repo?: string; dryRun: boolean; semModelo: boolean } = { dryRun: false, semModelo: false }
@@ -35,7 +38,17 @@ export function main(argv: string[]): number {
       process.stdout.write(`${a.dryRun ? '[dry-run] ' : ''}${resumo(r)}\n`)
       return 0
     }
-    throw new Error(USO_RESOLVER)
+    if (verbo === 'desfazer') {
+      if (resto.length !== 2 || resto.some((x) => x.startsWith('--'))) throw new Error(USO_DESFAZER)
+      const r = desfazer({ repo: resto[0]!, id: resto[1]! })
+      if (!r.ok) {
+        process.stderr.write(`[orq desfazer] não desfiz: ${r.motivo}\n`)
+        return 1
+      }
+      process.stdout.write(`desfeito: ${r.desfez} revertido em ${r.commit}\n`)
+      return 0
+    }
+    throw new Error(`${USO_RESOLVER} | ${USO_DESFAZER}`)
   } catch (e) {
     process.stderr.write(`[orq ${verbo ?? 'resolver'}] ${(e as Error).message}\n`)
     return 1
diff --git a/scripts/orquestrador/resolvedor/desfazer.ts b/scripts/orquestrador/resolvedor/desfazer.ts
new file mode 100644
index 0000000..25bf628
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/desfazer.ts
@@ -0,0 +1,66 @@
+/**
+ * desfazer.ts — `orq desfazer <repo> <id>` (etapa 7f-b2, peça 7): reverte a
+ * ÚLTIMA ação do resolvedor naquele ticket.
+ *
+ * Só desfaz se:
+ *   - o ledger tem a ação (e ela ainda não foi desfeita);
+ *   - o commit dela tem o trailer `Orq-Resolvedor: <classe> <regra> <assinatura>`
+ *     igual ao do ledger;
+ *   - o arquivo do ticket não mudou depois: nenhum commit depois dele toca o
+ *     arquivo, e o arquivo no disco é o do commit (nem writeback do loop).
+ *
+ * O ticket volta ao que era antes da ação (a cópia `acoes/<ts>/antes.md`; sem
+ * ela, o pai do commit), num commit só dele pela mesma porta (repo.ts: espera
+ * git, nunca --no-verify), com o trailer `Orq-Resolvedor-Desfaz: <sha>`. O
+ * ledger ganha `desfeito` e o desfecho `desfeito` (ruim: conta para o
+ * rebaixamento). A ação continua contando como a única do ticket: o próximo
+ * bloqueio vai para humano.
+ *
+ * Não respeita o interruptor de propósito: é o comando do humano, e o
+ * interruptor existe para parar o que roda sozinho.
+ */
+import { existsSync, readFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { gitLeitura } from '../triador/git.js'
+import { GuardaResolvedor } from './caminhos.js'
+import { acoesDe, lerLedger, registrar } from './ledger.js'
+import { acharRepo } from './modos.js'
+import { escreverEComitar, trailer } from './repo.js'
+
+export type Desfeito = { ok: true; commit: string; desfez: string } | { ok: false; motivo: string }
+
+const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')
+
+export function desfazer(o: { repo: string; id: string; agora?: number }): Desfeito {
+  const agora = o.agora ?? Date.now()
+  const repo = acharRepo(o.repo)
+  const l = lerLedger()
+  const desfeitos = new Set(l.filter((e) => e.tipo === 'desfeito' && e.repo === repo.nome).map((e) => e.commit_desfeito))
+  const a = acoesDe(l, repo.nome, o.id).at(-1)
+  if (!a) return { ok: false, motivo: `o ledger não tem ação do resolvedor em ${repo.nome} ${o.id}` }
+  const sha = String(a.commit)
+  if (desfeitos.has(sha)) return { ok: false, motivo: `a última ação (${sha.slice(0, 12)}) já foi desfeita` }
+  const rel = String(a.arquivo)
+
+  const tr = gitLeitura(repo.caminho, ['log', '-1', '--format=%(trailers:key=Orq-Resolvedor,valueonly)', sha])
+  if (tr.rc !== 0) return { ok: false, motivo: `commit ${sha.slice(0, 12)} não existe no repo` }
+  const esperado = trailer(String(a.classe), String(a.regra), String(a.assinatura)).replace(/^Orq-Resolvedor: /, '')
+  if (tr.stdout.trim() !== esperado) return { ok: false, motivo: `commit ${sha.slice(0, 12)} sem o trailer Orq-Resolvedor da ação (tem: ${tr.stdout.trim() || 'nenhum'})` }
+  const depois = gitLeitura(repo.caminho, ['log', '--format=%h %s', `${sha}..HEAD`, '--', rel])
+  if (depois.rc !== 0) return { ok: false, motivo: `commit ${sha.slice(0, 12)} não é ancestral do HEAD` }
+  if (depois.stdout.trim()) return { ok: false, motivo: `${rel} mudou depois da ação: ${depois.stdout.trim().split('\n').join('; ')}` }
+  const noCommit = gitLeitura(repo.caminho, ['show', `${sha}:${rel}`]).stdout
+  const noDisco = readFileSync(join(repo.caminho, rel), 'utf8')
+  if (noDisco !== noCommit) return { ok: false, motivo: `${rel} no disco não é o do commit ${sha.slice(0, 12)} (mudança não commitada depois da ação)` }
+
+  const copia = typeof a.copia === 'string' ? join(a.copia, 'antes.md') : null
+  const antes = copia && existsSync(copia) ? readFileSync(copia, 'utf8') : gitLeitura(repo.caminho, ['show', `${sha}^:${rel}`]).stdout
+  const msg = `orq-resolvedor: desfaz ${sha.slice(0, 12)} (${o.id} ${a.classe} ${a.regra})\n\n${a.mudou ?? ''}\n\nOrq-Resolvedor-Desfaz: ${sha}\n`
+  const e = escreverEComitar(repo.caminho, o.id, rel, noDisco, antes, msg)
+  if (!e.ok) return { ok: false, motivo: e.motivo }
+  const g = new GuardaResolvedor([repo.caminho])
+  const base = { ts: iso(agora), repo: repo.nome, id: o.id, classe: a.classe ?? null, regra: a.regra ?? null, assinatura: a.assinatura }
+  registrar(g, { ...base, tipo: 'desfeito', commit_desfeito: sha, commit: e.commit, arquivo: rel })
+  registrar(g, { ...base, tipo: 'desfecho', acao: a.acao, commit: sha, acao_ts: a.ts, desfecho: 'desfeito', bom: false, tempo_ate_destravar_s: a.tempo_ate_destravar_s ?? null, tempo_ate_desfecho_s: Math.round((agora - Date.parse(a.ts)) / 1000) })
+  return { ok: true, commit: e.commit, desfez: sha }
+}
diff --git a/test/orquestrador-resolvedor-desfazer.test.ts b/test/orquestrador-resolvedor-desfazer.test.ts
new file mode 100644
index 0000000..6687be2
--- /dev/null
+++ b/test/orquestrador-resolvedor-desfazer.test.ts
@@ -0,0 +1,99 @@
+/**
+ * Etapa 7f-b2, peça 7 · `orq desfazer <repo> <id>`: reverte o último commit do
+ * resolvedor naquele ticket, só se ele tem o trailer e o arquivo não mudou
+ * depois, e marca no ledger.
+ */
+import { spawnSync } from 'node:child_process'
+import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
+import { ambiente, comEnv, git, repoDoCaso } from './resolvedor-repo.js'
+
+const RAIZ = join(import.meta.dirname, '..')
+const RES = join(RAIZ, 'scripts', 'orquestrador', 'resolvedor')
+const T0 = Date.parse('2026-10-11T12:00:00Z')
+
+type Passada = (o: { repo?: string; semModelo?: boolean; agora?: number }) => { itens: { id: string; feito: string; motivo: string }[] }
+
+describe('peça 7: orq desfazer', () => {
+  let passada: Passada | null = null
+  let amb: ReturnType<typeof ambiente>
+  let tira: () => void
+  let n = 0
+  const caso = (id: string) => {
+    const r = repoDoCaso(join(amb.base, `c${++n}`), id, { nome: 'comarka-operacional' })
+    amb.repos([{ nome: 'cmk', caminho: r.raiz, resolvedor: { R1: 'auto', R5: 'auto' } }])
+    passada!({ repo: 'cmk', semModelo: true, agora: T0 })
+    return r
+  }
+  const orq = (...a: string[]) => spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), ...a], { encoding: 'utf8', env: { ...process.env } })
+  const ledger = () => {
+    const p = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
+    return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>) : []
+  }
+
+  beforeAll(async () => {
+    amb = ambiente()
+    tira = comEnv(amb.env)
+    passada = ((await import(pathToFileURL(join(RES, 'passada.ts')).href)) as { passada: Passada }).passada
+  })
+  afterAll(() => tira?.())
+  beforeEach(() => {
+    spawnSync('rm', ['-rf', amb.env.ORQ_RESOLVEDOR_DIR!, amb.env.ORQ_DIAG_DIR!])
+    mkdirSync(amb.env.ORQ_DIAG_DIR!, { recursive: true })
+  })
+
+  it('desfaz a ação do 840: o ticket volta ao antes, num commit só dele, e o ledger marca', () => {
+    const r = caso('840')
+    const acao = git(r.raiz, 'rev-parse', 'HEAD').trim()
+    const p = orq('desfazer', 'cmk', '840')
+    expect(p.stderr).toBe('')
+    expect(p.status).toBe(0)
+    expect(p.stdout).toContain(`desfeito: ${acao} revertido em`)
+    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
+    expect(git(r.raiz, 'show', '--name-only', '--format=', 'HEAD').trim()).toBe(r.ticket)
+    expect(git(r.raiz, 'log', '-1', '--format=%(trailers:key=Orq-Resolvedor-Desfaz,valueonly)').trim()).toBe(acao)
+    expect(git(r.raiz, 'rev-parse', 'HEAD^').trim()).toBe(acao)
+    expect(ledger().filter((e) => e.tipo === 'desfeito')).toEqual([expect.objectContaining({ repo: 'cmk', id: '840', commit_desfeito: acao, commit: git(r.raiz, 'rev-parse', 'HEAD').trim() })])
+    expect(ledger().filter((e) => e.tipo === 'desfecho')).toEqual([expect.objectContaining({ id: '840', desfecho: 'desfeito', bom: false, commit: acao })])
+    // o ticket voltou a bloqueado: a ação continua sendo a única dele
+    expect(passada!({ repo: 'cmk', semModelo: true, agora: T0 + 1000 }).itens).toEqual([expect.objectContaining({ id: '840', feito: 'nao_consegui', motivo: expect.stringMatching(/segunda vez/) })])
+    // e desfazer de novo é recusado
+    const p2 = orq('desfazer', 'cmk', '840')
+    expect(p2.status).toBe(1)
+    expect(p2.stderr).toMatch(/já foi desfeita/)
+  })
+
+  it('recusa sem ação no ledger', () => {
+    const p = orq('desfazer', 'cmk', '999')
+    expect(p.status).toBe(1)
+    expect(p.stderr).toMatch(/não tem ação do resolvedor em cmk 999/)
+  })
+
+  it('recusa se o arquivo mudou depois: mudança não commitada (o loop) ou commit', () => {
+    const r = caso('940')
+    const arq = join(r.raiz, r.ticket)
+    const depois = readFileSync(arq, 'utf8')
+    writeFileSync(arq, depois.replace('"status": "pendente"', '"status": "em_andamento"'))
+    const p = orq('desfazer', 'cmk', '940')
+    expect(p.status).toBe(1)
+    expect(p.stderr).toMatch(/no disco não é o do commit/)
+    expect(readFileSync(arq, 'utf8')).toContain('"status": "em_andamento"')
+    git(r.raiz, 'commit', '-qam', 'fila: status automatico do loop')
+    const p2 = orq('desfazer', 'cmk', '940')
+    expect(p2.status).toBe(1)
+    expect(p2.stderr).toMatch(/mudou depois da ação: [0-9a-f]+ fila: status automatico do loop/)
+    expect(ledger().filter((e) => e.tipo === 'desfeito')).toEqual([])
+  })
+
+  it('recusa se o commit não tem o trailer da ação', () => {
+    const r = caso('932')
+    const lp = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
+    const raizSha = git(r.raiz, 'rev-parse', 'HEAD^').trim()
+    writeFileSync(lp, readFileSync(lp, 'utf8').replace(/"commit":"[0-9a-f]+"/, `"commit":"${raizSha}"`))
+    const p = orq('desfazer', 'cmk', '932')
+    expect(p.status).toBe(1)
+    expect(p.stderr).toMatch(/sem o trailer Orq-Resolvedor/)
+  })
+})
```

### e9551b7 7f-b2-8: job do launchd com.orq.resolvedor (300 s, trava global, interruptor) com --dry-run; o humano instala

```diff
commit e9551b7a46014c414bb6729d4f193645e55ee9aa
Author: Lucas Santos
Date: Sat Oct 10 23:13:00 2026 -0300

7f-b2-8: job do launchd com.orq.resolvedor (300 s, trava global, interruptor) com --dry-run; o humano instala

instalar-job.sh renderiza o plist do template (CHECKOUT do kit, NODE_DIR,
log em ~/.orq/resolvedor/job.log) e, sem --dry-run, instala e faz o
bootstrap; com ORQ_TESTE=1 ou de checkout sob /tmp, só o --dry-run roda (as
guardas do instalar-launchd.sh). job.sh sai em 0 com o interruptor antes de
chamar o node e roda `orq resolver`, que tem a trava global da passada.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 .../resolvedor/com.orq.resolvedor.plist.template   | 46 ++++++++++
 scripts/orquestrador/resolvedor/instalar-job.sh    | 98 ++++++++++++++++++++++
 scripts/orquestrador/resolvedor/job.sh             | 21 +++++
 test/orquestrador-resolvedor-job.test.ts           | 91 ++++++++++++++++++++
 4 files changed, 256 insertions(+)
diff --git a/scripts/orquestrador/resolvedor/com.orq.resolvedor.plist.template b/scripts/orquestrador/resolvedor/com.orq.resolvedor.plist.template
new file mode 100644
index 0000000..0efc713
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/com.orq.resolvedor.plist.template
@@ -0,0 +1,46 @@
+<?xml version="1.0" encoding="UTF-8"?>
+<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
+<!--
+  TEMPLATE - nao e um plist utilizavel. Os placeholders sao resolvidos por
+  scripts/orquestrador/resolvedor/instalar-job.sh (etapa 7f-b2, peca 8):
+
+    {{CHECKOUT}}   raiz do checkout do KIT (o resolvedor roda do kit, sobre os
+                   repos do ~/.orq/repos.json; nunca de um repo instalado)
+    {{NODE_DIR}}   dirname do `which node` desta maquina
+    {{ORQ_HOME}}   ~/.orq desta maquina (log do job em resolvedor/job.log)
+
+  Um job so por maquina (Label fixo com.orq.resolvedor): ele percorre todos os
+  repos, cada um no seu modo. A cada 300 s; o launchd nao sobrepoe duas
+  execucoes do mesmo job, e a passada ainda tem a trava global
+  (resolvedor/resolver.lock, O_EXCL). O interruptor ~/.orq/RESOLVEDOR_PAUSADO
+  para tudo: o job.sh sai antes de chamar o node.
+-->
+<plist version="1.0">
+<dict>
+  <key>Label</key>
+  <string>com.orq.resolvedor</string>
+
+  <key>ProgramArguments</key>
+  <array>
+    <string>/bin/bash</string>
+    <string>{{CHECKOUT}}/scripts/orquestrador/resolvedor/job.sh</string>
+  </array>
+
+  <key>EnvironmentVariables</key>
+  <dict>
+    <key>PATH</key>
+    <string>{{NODE_DIR}}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
+  </dict>
+
+  <key>StartInterval</key>
+  <integer>300</integer>
+
+  <key>RunAtLoad</key>
+  <false/>
+
+  <key>StandardOutPath</key>
+  <string>{{ORQ_HOME}}/resolvedor/job.log</string>
+  <key>StandardErrorPath</key>
+  <string>{{ORQ_HOME}}/resolvedor/job.log</string>
+</dict>
+</plist>
diff --git a/scripts/orquestrador/resolvedor/instalar-job.sh b/scripts/orquestrador/resolvedor/instalar-job.sh
new file mode 100755
index 0000000..d5ca928
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/instalar-job.sh
@@ -0,0 +1,98 @@
+#!/bin/bash
+set -euo pipefail
+
+# instalar-job.sh — gera e instala o job do launchd do resolvedor (etapa 7f-b2,
+# peça 8): label com.orq.resolvedor, a cada 300 s, `orq resolver` sobre todos
+# os repos do ~/.orq/repos.json.
+#
+# Uso:
+#   bash scripts/orquestrador/resolvedor/instalar-job.sh --dry-run   só imprime o plist
+#   bash scripts/orquestrador/resolvedor/instalar-job.sh             instala e carrega (o HUMANO roda)
+#   ... --permitir-tmp    instala mesmo de um checkout sob /tmp
+#
+# Quem instala é o humano, do checkout principal do kit depois do merge (o
+# CHECKOUT do plist é o deste arquivo). As mesmas guardas do
+# instalar-launchd.sh (K6e): com ORQ_TESTE=1 ou de um checkout sob /tmp, só o
+# --dry-run roda. NUNCA `kickstart -k`.
+#
+# Parar sem desinstalar: `touch ~/.orq/RESOLVEDOR_PAUSADO` (o job sai em 0 sem
+# chamar o node). Desinstalar: a última linha que este script imprime.
+
+DRY=0
+PERMITIR_TMP=0
+for a in "$@"; do
+  case "$a" in
+    --dry-run)      DRY=1 ;;
+    --permitir-tmp) PERMITIR_TMP=1 ;;
+    *) echo "uso: $0 [--dry-run] [--permitir-tmp]" >&2; exit 2 ;;
+  esac
+done
+
+LABEL=com.orq.resolvedor
+CHECKOUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
+TEMPLATE="$CHECKOUT/scripts/orquestrador/resolvedor/$LABEL.plist.template"
+ORQ_HOME="${ORQ_HOME:-$HOME/.orq}"
+DST="$HOME/Library/LaunchAgents/$LABEL.plist"
+
+[ -f "$TEMPLATE" ] || { echo "ERRO: template ausente: $TEMPLATE" >&2; exit 1; }
+[ -f "$CHECKOUT/scripts/orquestrador/resolvedor/job.sh" ] || { echo "ERRO: job.sh ausente" >&2; exit 1; }
+command -v node >/dev/null 2>&1 || { echo "ERRO: node nao esta no PATH desta maquina." >&2; exit 1; }
+NODE_BIN="$(command -v node)"
+NODE_DIR="$(cd "$(dirname "$NODE_BIN")" && pwd)"
+
+renderiza() {
+  sed -e "s|{{CHECKOUT}}|$CHECKOUT|g" \
+      -e "s|{{NODE_DIR}}|$NODE_DIR|g" \
+      -e "s|{{ORQ_HOME}}|$ORQ_HOME|g" \
+      "$TEMPLATE"
+}
+
+CHECKOUT_FIS="$(cd "$CHECKOUT" && pwd -P)"
+sob_tmp=0
+case "$CHECKOUT/"     in /tmp/*|/private/tmp/*) sob_tmp=1 ;; esac
+case "$CHECKOUT_FIS/" in /tmp/*|/private/tmp/*) sob_tmp=1 ;; esac
+
+if [ "$DRY" = 0 ] && [ "$PERMITIR_TMP" = 0 ]; then
+  if [ "${ORQ_TESTE:-0}" = 1 ]; then
+    echo "ERRO: ORQ_TESTE=1 — RECUSO instalar o job do launchd (use --dry-run)." >&2
+    exit 1
+  fi
+  if [ "$sob_tmp" = 1 ]; then
+    echo "ERRO: checkout sob /tmp ($CHECKOUT_FIS) — RECUSO instalar o job (use --dry-run ou --permitir-tmp)." >&2
+    exit 1
+  fi
+fi
+
+if [ "$DRY" = 1 ]; then
+  echo "# --dry-run: nada e escrito, nada e carregado." >&2
+  echo "# LABEL     = $LABEL (a cada 300 s)" >&2
+  echo "# CHECKOUT  = $CHECKOUT" >&2
+  echo "# NODE_DIR  = $NODE_DIR  ($("$NODE_BIN" -v))" >&2
+  echo "# log       = $ORQ_HOME/resolvedor/job.log" >&2
+  echo "# gravaria em $DST" >&2
+  renderiza
+  exit 0
+fi
+
+UID_NUM="$(id -u)"
+mkdir -p "$ORQ_HOME/resolvedor" "$HOME/Library/LaunchAgents"
+renderiza > "$DST.tmp"
+if grep -q '{{' "$DST.tmp"; then
+  rm -f "$DST.tmp"
+  echo "ERRO: placeholder nao resolvido" >&2
+  exit 1
+fi
+mv "$DST.tmp" "$DST"
+echo "plist instalado: $DST"
+
+if launchctl print "gui/$UID_NUM/$LABEL" >/dev/null 2>&1; then
+  echo "job ja carregado - bootout antes de recarregar (NUNCA kickstart -k)."
+  launchctl bootout "gui/$UID_NUM/$LABEL" 2>/dev/null || true
+fi
+launchctl bootstrap "gui/$UID_NUM" "$DST"
+echo "bootstrap OK: $LABEL carregado em gui/$UID_NUM (primeira passada em 300 s)"
+echo ""
+echo "verificar:   launchctl print gui/$UID_NUM/$LABEL | head -20"
+echo "log do job:  tail -f $ORQ_HOME/resolvedor/job.log"
+echo "pausar:      touch $ORQ_HOME/RESOLVEDOR_PAUSADO"
+echo "desinstalar: launchctl bootout gui/$UID_NUM/$LABEL && rm -f \"$DST\""
diff --git a/scripts/orquestrador/resolvedor/job.sh b/scripts/orquestrador/resolvedor/job.sh
new file mode 100755
index 0000000..a7322fe
--- /dev/null
+++ b/scripts/orquestrador/resolvedor/job.sh
@@ -0,0 +1,21 @@
+#!/bin/bash
+# job.sh — o que o launchd roda a cada 300 s (com.orq.resolvedor, etapa 7f-b2).
+#
+# Uma passada do resolvedor sobre todos os repos do ~/.orq/repos.json, cada um
+# no seu modo. Antes de qualquer coisa, o interruptor: existindo
+# ~/.orq/RESOLVEDOR_PAUSADO (ou ORQ_RESOLVEDOR_PAUSADO), sai em 0 sem chamar o
+# node. A trava global e as travas por ação estão no resolvedor (passada.ts,
+# acoes.ts, repo.ts).
+set -euo pipefail
+
+PAUSADO="${ORQ_RESOLVEDOR_PAUSADO:-$HOME/.orq/RESOLVEDOR_PAUSADO}"
+agora() { date -u +%Y-%m-%dT%H:%M:%SZ; }
+
+if [ -e "$PAUSADO" ]; then
+  printf '%s resolvedor pausado (%s): nada rodou\n' "$(agora)" "$PAUSADO"
+  exit 0
+fi
+
+KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
+printf '%s passada\n' "$(agora)"
+bash "$KIT/scripts/orq" resolver "$@"
diff --git a/test/orquestrador-resolvedor-job.test.ts b/test/orquestrador-resolvedor-job.test.ts
new file mode 100644
index 0000000..70ab924
--- /dev/null
+++ b/test/orquestrador-resolvedor-job.test.ts
@@ -0,0 +1,91 @@
+/**
+ * Etapa 7f-b2, peça 8 · o job do launchd (com.orq.resolvedor).
+ *
+ * Pronto quando:
+ *   - `instalar-job.sh --dry-run` só imprime o plist (label com.orq.resolvedor,
+ *     a cada 300 s, job.sh do checkout, plist válido) e não escreve nada nem
+ *     chama launchctl;
+ *   - sem --dry-run, com ORQ_TESTE=1, recusa antes de escrever ou chamar
+ *     launchctl (quem instala é o humano);
+ *   - o job.sh respeita o interruptor (sai em 0 sem chamar o node) e a trava
+ *     global (outra passada rodando: nada roda).
+ * Nenhum launchctl de verdade: um falso na frente do PATH registra se foi chamado.
+ */
+import { spawnSync } from 'node:child_process'
+import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+import { afterAll, beforeAll, describe, expect, it } from 'vitest'
+import { ambiente } from './resolvedor-repo.js'
+
+const RAIZ = join(import.meta.dirname, '..')
+const DIR = join(RAIZ, 'scripts', 'orquestrador', 'resolvedor')
+
+describe('peça 8: o job do launchd', () => {
+  let home: string
+  let bin: string
+  let amb: ReturnType<typeof ambiente>
+  let env: Record<string, string>
+  beforeAll(() => {
+    home = mkdtempSync(join(tmpdir(), 'resolvedor-home-'))
+    bin = join(home, 'bin')
+    mkdirSync(bin)
+    writeFileSync(join(bin, 'launchctl'), `#!/bin/bash\necho "$@" >> '${join(home, 'launchctl-chamado')}'\n`)
+    chmodSync(join(bin, 'launchctl'), 0o755)
+    amb = ambiente()
+    env = { ...(process.env as Record<string, string>), ...amb.env, HOME: home, PATH: `${bin}:${process.env.PATH}`, ORQ_TESTE: '1' }
+  })
+  afterAll(() => undefined)
+
+  const instalar = (...a: string[]) => spawnSync('bash', [join(DIR, 'instalar-job.sh'), ...a], { encoding: 'utf8', env })
+  const job = (extra: Record<string, string> = {}) => spawnSync('bash', [join(DIR, 'job.sh')], { encoding: 'utf8', env: { ...env, ...extra } })
+
+  it('--dry-run só imprime o plist', () => {
+    const p = instalar('--dry-run')
+    expect(p.status, p.stderr).toBe(0)
+    expect(p.stdout).toContain('<string>com.orq.resolvedor</string>')
+    expect(p.stdout).toMatch(/<key>StartInterval<\/key>\s*<integer>300<\/integer>/)
+    expect(p.stdout).toContain(`<string>${RAIZ}/scripts/orquestrador/resolvedor/job.sh</string>`)
+    expect(p.stdout).toContain(`<string>${home}/.orq/resolvedor/job.log</string>`)
+    expect(p.stdout).not.toContain('{{')
+    expect(p.stderr).toContain('--dry-run: nada e escrito')
+    if (existsSync('/usr/bin/plutil')) {
+      const l = spawnSync('/usr/bin/plutil', ['-lint', '-'], { input: p.stdout, encoding: 'utf8' })
+      expect(l.stdout.trim()).toMatch(/OK$/)
+    }
+    expect(existsSync(join(home, 'Library'))).toBe(false)
+    expect(existsSync(join(home, '.orq'))).toBe(false)
+    expect(existsSync(join(home, 'launchctl-chamado'))).toBe(false)
+  })
+
+  it('sem --dry-run, sob teste, recusa antes de escrever ou chamar launchctl', () => {
+    const p = instalar()
+    expect(p.status).toBe(1)
+    expect(p.stderr).toMatch(/ORQ_TESTE=1 — RECUSO instalar/)
+    expect(existsSync(join(home, 'Library'))).toBe(false)
+    expect(existsSync(join(home, 'launchctl-chamado'))).toBe(false)
+  })
+
+  it('o job.sh respeita o interruptor: sai em 0 sem rodar a passada', () => {
+    writeFileSync(amb.env.ORQ_RESOLVEDOR_PAUSADO!, '')
+    const p = job()
+    spawnSync('rm', ['-f', amb.env.ORQ_RESOLVEDOR_PAUSADO!])
+    expect(p.status).toBe(0)
+    expect(p.stdout).toMatch(/resolvedor pausado .*: nada rodou/)
+    expect(p.stdout).not.toMatch(/passada/)
+    expect(existsSync(amb.env.ORQ_RESOLVEDOR_DIR!)).toBe(false)
+  })
+
+  it('o job.sh roda uma passada; com outra passada segurando a trava global, nada roda', () => {
+    const p = job()
+    expect(p.status, p.stderr).toBe(0)
+    expect(p.stdout).toMatch(/passada\n/)
+    expect(p.stdout).toMatch(/-- 0 bloqueado\(s\)/)
+    mkdirSync(amb.env.ORQ_RESOLVEDOR_DIR!, { recursive: true })
+    writeFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'resolver.lock'), JSON.stringify({ pid: 1, hora: new Date().toISOString() }))
+    const q = job()
+    expect(q.status).toBe(0)
+    expect(q.stdout).toMatch(/outra passada do resolvedor está rodando: nada rodou/)
+    expect(readFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'resolver.lock'), 'utf8')).toContain('"pid":1')
+  })
+})
```

### 0e30a77 7f-b2-9: CONTRATO §14 (resolvedor: modos, ações, travas, ledger, trailer), CHANGELOG e PECAS com os shas da 7f-b2

```diff
commit 0e30a775c7272c3d82227a3808070c4facc5848b
Author: Lucas Santos
Date: Sat Oct 10 23:14:47 2026 -0300

7f-b2-9: CONTRATO §14 (resolvedor: modos, ações, travas, ledger, trailer), CHANGELOG e PECAS com os shas da 7f-b2

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 CHANGELOG.md  |  37 +++++++++++++
 CONTRATO.md   | 168 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 docs/PECAS.md |  38 +++++++++++--
 3 files changed, 238 insertions(+), 5 deletions(-)
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 78438f9..fd7e351 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -929,3 +929,40 @@ programa, três mudaram de número (sem mudar de força): firmes certos 16 → 1
 no instante do bloqueio, e a corrida da peça 6 de 21 chamadas a US$ 6,30 para 22 a
 US$ 6,60. O teste da peça 2 cedeu o `materializar` para
 `test/triador-repo-legado.ts`, sem mudar asserção.
+
+### Etapa 7f-b2 · resolvedor de bloqueios rodando sozinho (10/10/2026)
+
+Diagnóstico vira ação: `orq resolver` tria os bloqueados de cada repo e, no modo do repo
+(`resolvedor` no `~/.orq/repos.json`), conserta o que é seguro, com travas, e registra
+tudo num ledger para aprender. Gabarito: os consertos humanos de 10/10 no
+comarka-operacional. Sem chamada de API, sem launchctl, sem escrita em repo real.
+CONTRATO §14.
+
+- **7f-b2-1** `aeb5148`: gabarito (`test/fixtures/resolvedor-7f/`, `montar.py` só lê o
+  Comarka): antes e depois reais do 840, 929 (`7787af3`), 940 e 932 (`819c49a`), a
+  evidência do bloqueio do 840 e do 929 e a árvore que o `criterio[12]` do 929 lê. Teste
+  vermelho (8 falhas por asserção).
+- **7f-b2-2** `0677c1e`: `orq resolver [--repo X] [--dry-run]`: passada, ordem pelos
+  tickets que esperam por cada bloqueado, triagem pelo triador, decisão por classe e modo;
+  `--dry-run` só grava o que faria.
+- **7f-b2-3** `47231ca`: ações R1 (allowlist com guarda de contagem, critério da lista,
+  reabre) e R5 (árvore alvo limpa, máquina livre), com edição textual conferida por parse;
+  travas: uma ação por ticket, interruptor, trava global, espera git, só o arquivo do
+  ticket, commit `--only` com o trailer `Orq-Resolvedor`, nunca `--no-verify`. Gabarito 840,
+  940 e 932 iguais ao humano.
+- **7f-b2-4** `e983df6`: R2 em sombra: proposta com o cmd do humano letra por letra e a
+  prova sob `set -u` (não aborta, reprova o estado não feito); nunca aplica. Gabarito 929.
+- **7f-b2-5** `5b2a95d`: ledger de desfecho: ação, "não consegui" com motivo, desfecho
+  (done, bloqueou de novo, humano mexeu) com tempos, e a proposta de R2 contra o conserto
+  humano (acerto igual ou equivalente, erro).
+- **7f-b2-6** `b109bda`: promoção (R2 com 9 acertos em 10 sobe para auto) e rebaixamento
+  (2 desfechos ruins seguidos em auto voltam para sombra), no ledger e no `repos.json`.
+- **7f-b2-7** `7daad91`: `orq desfazer <repo> <id>`: reverte a última ação só com o
+  trailer e o arquivo intocado depois; ledger `desfeito`.
+- **7f-b2-8** `e9551b7`: job `com.orq.resolvedor` (300 s, trava global, interruptor) com
+  `instalar-job.sh --dry-run`; o humano instala.
+- **7f-b2-9**: CONTRATO §14, este registro e `docs/PECAS.md` com os shas.
+
+Asserções existentes que mudaram: nenhuma fora dos testes novos da etapa. Na 7f-b2-5, dois
+testes da própria etapa (peças 2 e 3) deixaram de exigir ledger ausente: o "não consegui"
+passou a entrar no ledger, que é o pedido da peça 5; o dry-run continua sem mudar o ledger.
diff --git a/CONTRATO.md b/CONTRATO.md
index 77cfbdd..b178d74 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -1189,6 +1189,174 @@ que pede ≥ 30.
   `REGRAS_R3_7F_B1B`), só por opt-in; virar padrão é mudar a spec. A mini-corrida paga (9
   casos, teto US$ 5,40) está em `~/orq-sessoes/corrida-7f-r3.cmd` e não foi rodada.
 
+## 14. Etapa 7f-b2: resolvedor de bloqueios rodando sozinho (10/10/2026)
+
+O triador (§13) diagnostica; o resolvedor age. A cada passada, para cada repo do
+`~/.orq/repos.json`, ele tria os bloqueados com o triador existente e conserta sozinho o
+que a classe e o modo do repo permitem, registrando tudo para aprender. Decisões do chat
+do programa; gabarito: os consertos humanos de 10/10 no comarka-operacional (`7787af3`:
+840 R1 e 929 R2; `819c49a`: 940 e 932 R5 árvore suja).
+
+Código: `scripts/orquestrador/resolvedor/`. Comandos: `orq resolver` e `orq desfazer`
+(`cli.ts`, despachados pelo `scripts/orq` antes do `lib.sh`, como o `triar`). Job:
+`resolvedor/instalar-job.sh` (§14.7).
+
+### 14.1 Passada (`passada.ts:118`)
+
+```
+orq resolver [--repo <nome|caminho>] [--dry-run] [--sem-modelo]
+```
+
+1. Interruptor: existindo `ORQ_RESOLVEDOR_PAUSADO` (padrão `~/.orq/RESOLVEDOR_PAUSADO`),
+   nada roda: nem triagem, nem ledger (`passada.ts:121`); vale também entre um ticket e
+   outro.
+2. Trava global: `resolver.lock` com `O_EXCL`, pid e hora, órfã depois de 15 min
+   (`travarPassada`, `caminhos.ts:104`). Outra passada segurando: nada roda.
+3. Por repo, antes da triagem: o desfecho das ações e propostas anteriores e a
+   promoção/rebaixamento (§14.6); o modo que vale na passada já é o novo.
+4. Os bloqueados, do que tem mais tickets esperando por ele ao que tem menos
+   (`ordenarBloqueados`, `passada.ts:64`): tickets fora de `done`/`obsoleto` com o id em
+   `dependencias` (direta); empate pela ordem do arquivo.
+5. Cada um pelo `triarTicket` (§13); mesma assinatura: vale o diagnóstico gravado. O
+   modelo entra como no `orq triar` (só palpite e sem regra), com teto de **US$ 5,00 por
+   dia** (`TETO_DIA_USD`, `passada.ts:32`; `ORQ_RESOLVEDOR_TETO_DIA` sobrepõe), contado
+   no mesmo `custo.json` do triador.
+6. A decisão (§14.2) e a ação (§14.3, §14.4).
+
+`--dry-run`: não escreve no repo, não chama modelo, não toca o ledger nem as propostas;
+o que faria (com o diff) vai para `dry-run.jsonl` e para a saída, uma linha por
+bloqueado: `repo id deps=N classe regra [firme] modo acao feito motivo [commit] [proposta]`.
+
+### 14.2 Modos e decisão (`modos.ts`, `decidir.ts:38`)
+
+Campo `resolvedor` de cada item do `repos.json` (o resto do item é o que o painel já lê,
+`lerRepos`): ausente → `diagnostico` em toda classe; uma string → a mesma em toda classe;
+um objeto `{"padrao": …, "R1": …, …}` → por classe. Repo fora do `repos.json` (passado por
+caminho) fica em `diagnostico`.
+
+| classe (regra) | auto | sombra | diagnostico |
+|---|---|---|---|
+| R5 árvore suja (D1), firme | reabre quando a worktree alvo está limpa | proposta | só triagem |
+| R5 máquina (D4), firme | reabre com carga ≤ 0,75 por CPU e ≥ 2 GiB livres | proposta | só triagem |
+| R5 base vermelha (D5) | aviso | aviso | só triagem |
+| R1 (D6), firme | allowlist com guarda, critério da lista, reabre | proposta | só triagem |
+| R2 (firme ou palpite) | **proposta** (nesta etapa R2 nunca aplica) | proposta | só triagem |
+| R3, R4, R6, R7; palpite fora de R2; sem classe | aviso | aviso | só triagem |
+
+Só diagnóstico firme da extração aplica; a resposta do modelo nunca é firme. Config de
+partida (decisão do chat do programa, o humano escreve no `repos.json`): comarka-operacional
+`{"padrao": "diagnostico", "R1": "auto", "R5": "auto", "R2": "sombra"}`; repos do kit sem o
+campo.
+
+### 14.3 Ações (`acoes.ts:73`, `r1.ts:106`, `r5.ts:46`, `ticket-md.ts`)
+
+O ticket é editado no texto do 1º bloco json, só onde muda, no recuo que o arquivo usa;
+toda edição é conferida por parse contra o objeto esperado, senão nada é escrito
+(`editar`, `ticket-md.ts:154`). O diff é o que o humano fez à mão.
+
+- **Reabrir** (`reabrir`, `ticket-md.ts:173`): `status` → `pendente`, `notas_status` → `""`.
+  É o que o humano fez no 840, no 940 e no 932 (no 940/932 o `done` de `819c49a` é o loop
+  rodando depois do reabrir: merges `dd94c08` e `4d52ef7`).
+- **R1** (`planejarR1`, `r1.ts:106`): o teste do remédio (`pôr <teste> na allowlist`),
+  único em `fora_da_allowlist_e_do_diff`, vai para o fim de `pathspec_allowlist`; todo
+  critério cujo `cmd` cita todos os caminhos da allowlist entre aspas simples ganha o mesmo
+  caminho depois do último; a guarda entra depois da última `tipo: guarda` (ou antes do
+  avaliador) com o `cmd` do 840 letra por letra (`cmdGuarda`, `r1.ts:63`): `it(`+`test(` e
+  `expect(` no mínimo a contagem ATUAL do teste no branch alvo (`branch_alvo`, local e depois
+  `origin/`, por `gitLeitura`), contada por linha como o `grep -c`, e zero
+  `.skip/.only/.todo`; e o ticket reabre. Não age se o teste já tem skip/only/todo, não
+  existe no alvo, ou há mais de um vermelho fora.
+- **R5** (`condicaoR5`, `r5.ts:46`): D1, `git status --porcelain` vazio na worktree alvo
+  (`worktrees_dir`/`branch_alvo`, os do triador); D4, a máquina (`ORQ_RESOLVEDOR_MAQUINA`
+  troca a leitura nos testes). A condição não sumiu: "não consegui" com o motivo.
+- **Sombra**: o mesmo plano vira `<repo>/<id>/proposta.md` (o diff) e `.json`; o repo não é
+  tocado.
+
+### 14.4 R2 em sombra (`r2.ts:162`, `agirR2` `acoes.ts:137`)
+
+Forma tratada: critério que reprovou com `unbound variable` por `v=$(grep -c …)` sem
+`|| true` numa corrente com `&&` sob `set -euo pipefail`. Conserto (`consertarUnbound`,
+`r2.ts:60`), o do humano no 929 letra por letra: `|| true` dentro de cada `$(grep -c …)` e
+toda expansão dessas variáveis como `${v:-x}`. A prova roda o critério no harness do
+executor (`out="$( ( cd … && eval "$cmd" ) 2>&1 || true )"` sob `set -euo pipefail`), numa
+pasta temporária com cópias dos arquivos que o cmd cita: no branch alvo (trabalho não
+feito) o novo tem de rodar sem abortar e REPROVAR; o antigo e o head da última tentativa
+entram como registro. cmd que chama git, npx, node, gerenciador de pacote, shell ou
+`scripts/` não é provado ("não consegui"). Saída: `<repo>/<id>/proposta.md` (cmd antigo e
+novo, tabela da prova, diff) e `proposta.json` (com o conteúdo dos arquivos da prova, para
+a comparação), uma por assinatura. Nunca aplica, nem no modo `auto`.
+
+### 14.5 Travas e escrita (`repo.ts`, `caminhos.ts`)
+
+- **Uma ação por ticket**: com uma `acao` no ledger, o próximo bloqueio do mesmo ticket vai
+  para humano ("não consegui: segunda vez bloqueado"), mesmo depois de `orq desfazer`.
+- **Interruptor** e **trava global**: §14.1.
+- **Espera git** (`esperarGit`, `repo.ts:66`): nem `index.lock`/`HEAD.lock` no git dir, nem
+  processo `git` (`pgrep -x git`; `ORQ_RESOLVEDOR_PGREP` nos testes), até
+  `ORQ_RESOLVEDOR_ESPERA_GIT_S` (60 s); passou do teto, não escreve.
+- **Só o arquivo do ticket** (`confereTicket`, `repo.ts:40`): `docs/fila/<id>-<slug>.md`, o
+  caminho real dentro de `docs/fila`, não symlink; e como foi lido (outro processo mexeu:
+  não age).
+- **Commit** (`escreverEComitar`, `repo.ts:92`): `git commit --only -- <arquivo>` (o resto
+  do índice fica), mensagem `orq-resolvedor: <id> <classe> <regra>: <o que mudou>` e o
+  trailer **`Orq-Resolvedor: <classe> <regra> <assinatura do diagnóstico>`**
+  (`trailer`, `repo.ts:77`). **Nunca `--no-verify`** (`gitEscrita` recusa): o hook do repo
+  (no Comarka, `validar-fila`) é a segunda trava; recusou, o arquivo volta ao que era. Commit
+  com outro arquivo ou outro pai: "não consegui", alto. Nunca push; nenhum outro verbo de
+  escrita.
+- **Fora do repo** (`GuardaResolvedor`, `caminhos.ts:39`): só sob `ORQ_RESOLVEDOR_DIR`
+  (padrão `~/.orq/resolvedor`) e o próprio `repos.json`; nunca dentro de um repo do
+  `repos.json`. Troca atômica.
+- No repo instalado, leitura só por `gitLeitura` (`GIT_OPTIONAL_LOCKS=0`); nenhum script do
+  repo roda (o hook é do `git commit`); runs, locks, sentinelas e `_worktrees` só lidos.
+
+### 14.6 Ledger, desfecho, promoção (`ledger.ts`, `desfecho.ts`, `promocao.ts`)
+
+`~/.orq/resolvedor/ledger.jsonl`, só acrescentado, uma linha JSON por fato:
+
+| tipo | quando | campos |
+|---|---|---|
+| `acao` | ação aplicada | classe, regra, assinatura, `acao`, `mudou`, `commit`, `arquivo`, `copia` (`acoes/<ts>/antes.md` e `depois.md`), `bloqueado_em`, `tempo_ate_destravar_s` |
+| `proposta` | proposta nova em sombra | `acao`, `mudou`, `proposta`, `proposta_json` |
+| `nao_agiu` | "não consegui" | `acao`, `modo`, `motivo`; uma por (ticket, assinatura, motivo) |
+| `aviso` | classe sem ação | idem |
+| `desfecho` | ação fechada (`apurarAcoes`, `desfecho.ts:45`) | `desfecho`: `done` (bom), `bloqueou_de_novo`, `humano_mexeu` (o json fora de `status`, `notas_status`, `tentativas`, `adiamentos_ambiente` difere do gravado) ou `desfeito`; `bom`, `tempo_ate_desfecho_s` |
+| `comparacao` | proposta R2 contra o humano (`apurarPropostas`, `desfecho.ts:104`) | `resultado` `acerto` (`igual`, ou `equivalente`: mesma saída nos estados guardados na proposta) ou `erro` (`diferente`, ou `humano_nao_trocou`: saiu de bloqueado com o cmd antigo); bloqueado com o cmd antigo: espera |
+| `promocao`, `rebaixamento` | o modo mudou sozinho (`promoverRebaixar`, `promocao.ts:44`) | `classe`, `de`, `para`, `motivo`, `considerados` |
+| `desfeito` | `orq desfazer` | `commit_desfeito`, `commit` |
+
+Promoção: R2 em sombra sobe para `auto` com **9 acertos nas 10 últimas** comparações
+(nesta etapa, R2 em auto continua só propondo). Rebaixamento: qualquer classe em `auto`
+volta para `sombra` com **2 desfechos ruins seguidos** (para R2, comparação com erro). Só
+conta o que veio depois da última mudança de modo daquela classe no repo. A mudança vai ao
+ledger e ao `repos.json` (`gravarModo`, `modos.ts:89`: só o campo `resolvedor` daquele
+item; item string vira objeto).
+
+### 14.7 `orq desfazer` e o job
+
+`orq desfazer <repo> <id>` (`desfazer.ts:34`) reverte a última ação do ledger no ticket só
+se o commit tem o trailer `Orq-Resolvedor` igual ao do ledger, nenhum commit depois toca o
+arquivo e o arquivo no disco é o do commit (nem writeback do loop). Volta à cópia do antes,
+pela mesma porta, com o trailer `Orq-Resolvedor-Desfaz: <sha>`; ledger `desfeito` e
+desfecho `desfeito`. Não respeita o interruptor (é o comando do humano).
+
+Job (`instalar-job.sh`, `com.orq.resolvedor.plist.template`, `job.sh`): label
+`com.orq.resolvedor`, um por máquina, `StartInterval` 300, `job.sh` sai em 0 com o
+interruptor antes de chamar o node e roda `orq resolver` (trava global na passada); log em
+`~/.orq/resolvedor/job.log`. `--dry-run` só imprime o plist; com `ORQ_TESTE=1` ou de
+checkout sob `/tmp`, só o `--dry-run` roda. Quem instala é o humano, do checkout principal
+do kit.
+
+### 14.8 Testes
+
+`orquestrador-resolvedor-{gabarito,passada,acoes,r2,ledger,promocao,desfazer,job}.test.ts`
+sobre repos `git init` em pasta temporária com os tickets reais (`test/resolvedor-repo.ts`,
+fixture `test/fixtures/resolvedor-7f/`, montada por `montar.py`, só leitura do Comarka);
+`~/.orq` só por variáveis (`ORQ_REPOS`, `ORQ_DIAG_DIR`, `ORQ_RESOLVEDOR_DIR`,
+`ORQ_RESOLVEDOR_PAUSADO`, `ORQ_RESOLVEDOR_PGREP`). Gabarito: o 840 sai igual ao commit
+humano (só a `descricao` da guarda é livre), o 940 e o 932 mudam as mesmas duas linhas para
+`pendente` e nota vazia, o 929 só ganha a proposta com o cmd do humano.
+
 ## 10. Divergências conhecidas
 
 O que este contrato **não** descreve como gostaria, e a peça que fecha cada uma.
diff --git a/docs/PECAS.md b/docs/PECAS.md
index 8fd8bb2..327fb6f 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -966,6 +966,24 @@
   não afrouxa, ≥ 30 em `it.fails`), `orquestrador-triador-modelo.test.ts` (envelope do corte
   real, descartes, prompt `7f-b1b-r3`, `--casos`).
 
+- **Etapa 7f-b2 · resolvedor de bloqueios rodando sozinho** (10/10/2026). `orq resolver`
+  tria os bloqueados de cada repo do `repos.json`, do que tem mais dependentes ao que tem
+  menos, e age pela classe e pelo modo (`diagnostico`, `sombra`, `auto`): R1 firme põe o
+  teste na allowlist com guarda e reabre; R5 árvore suja e máquina reabrem quando a
+  condição some; R2 só propõe (cmd novo e prova sob `set -u`); o resto, diagnóstico e
+  aviso. Travas: uma ação por ticket, interruptor, trava global, espera git, só o arquivo
+  do ticket, commit com trailer `Orq-Resolvedor`, nunca `--no-verify`, nunca push. Ledger
+  de desfecho, comparação com o humano, promoção e rebaixamento, `orq desfazer`, job do
+  launchd. Commits `aeb5148` (gabarito), `0677c1e` (passada), `47231ca` (R1 e R5 com
+  travas), `e983df6` (R2 em sombra), `5b2a95d` (ledger), `b109bda` (promoção), `7daad91`
+  (desfazer), `e9551b7` (job).
+  *Evidência:* `7787af3` e `819c49a` do comarka-operacional,
+  `~/orq-sessoes/conserto-840-929.md`, `~/orq-sessoes/primeiros-diagnosticos-comarka.md` e
+  `~/orq-sessoes/relatorio-kit-etapa7f-b2.md`.
+  *Teste:* `orquestrador-resolvedor-gabarito.test.ts` (840 igual ao humano, 940/932 o
+  mesmo reabrir, 929 só proposta), `-passada`, `-acoes` (travas), `-r2`, `-ledger`,
+  `-promocao`, `-desfazer`, `-job`.
+
 ## PENDENTES
 
 - **7f-b1b · mini-corrida paga do R3.** `~/orq-sessoes/corrida-7f-r3.cmd` (9 casos: os 5 R3 e
@@ -981,12 +999,22 @@
   *Evidência:* `~/orq-sessoes/relatorio-kit-etapa7f-b1b.md`.
   *Teste:* aceite (C) por replay, sem chamada no CI.
 
-- **7f-b2 · gatilho e painel.** A peça 7 da spec redefinida (o painel nunca dispara gasto:
-  `orq triar` manual e depois job do launchd) e a peça 8 (coluna Diagnóstico, clique, filtro
-  por classe, linha na pausa, `pulado`/`obsoleto`); CONTRATO §9.5 lendo
-  `~/.orq/diagnosticos`.
-  *Evidência:* spec 7f-a §1 e §5 (Painel K12).
+- **7f · painel do triador e do resolvedor.** O gatilho virou o job do resolvedor
+  (7f-b2, `com.orq.resolvedor`); falta a peça 8 da spec (coluna Diagnóstico, clique,
+  filtro por classe, linha na pausa, `pulado`/`obsoleto`) e, agora, o que o resolvedor fez
+  (ação, proposta, "não consegui", modo por classe); CONTRATO §9.5 lendo
+  `~/.orq/diagnosticos` e `~/.orq/resolvedor`.
+  *Evidência:* spec 7f-a §1 e §5 (Painel K12); CONTRATO §14.
   *Teste:* `test-painel-triador.sh` da spec, com os quatro estados.
+- **7f-b2 · primeira passada real e instalação do job (humano).** `~/orq-sessoes/7f-b2-primeira-passada.cmd`
+  (`--dry-run` no comarka-operacional, depois do merge e do campo `resolvedor` no
+  `repos.json`) e `~/orq-sessoes/7f-b2-instalar-job.cmd`.
+  *Evidência:* `~/orq-sessoes/relatorio-kit-etapa7f-b2.md`.
+- **7f-b2 · R2 aplicando.** A promoção já registra R2 em auto com 9 acertos em 10, mas a
+  aplicação do cmd proposto não existe nesta etapa (decisão do chat do programa); e outras
+  formas de defeito de critério além do `unbound variable` (o `syntax error`, as três
+  formas de shell da medição).
+  *Evidência:* CONTRATO §14.4 e §14.6.
 
 - **7d-2 · o gate executa: C1, C5, C6.** Recon executado (C1, a única regra com causa e
   zero FP nos três repos na calibração), guarda que já falha (C5, com a exceção de arquivo
```

