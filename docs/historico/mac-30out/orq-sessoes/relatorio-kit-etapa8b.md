# Etapa 8b: riscos ativos do lado do kit (L1 e L2 da convergência)

- **Worktree e branch:** `~/Projetos/_worktrees/kit-etapa8a`, branch `kit/etapa8a`. O nome do caminho e da branch ficou como pedido. Não existia e foi criado nesta sessão a partir de 85c49a6 (`git worktree add … -b kit/etapa8a 85c49a6`). `node_modules` é um symlink para o do checkout principal, como no `kit-validador-8a`.
- **Nome da etapa:** 8b (o 8a é a etapa do validador, que roda em paralelo).
- **Fontes:** relatório de convergência de 18/10 (`~/orq-sessoes/convergencia-comarka-kit.md`, seções F, B e matriz).

## Passo 0: leitura (18/10)

O kit foi lido em 85c49a6. O Comarka foi lido só com `GIT_OPTIONAL_LOCKS=0` (show e log). `~/.orq/` foi só lido.

| pergunta | resposta | arquivo:linha |
|---|---|---|
| O que o autocommit do kit commita? | Todo `docs/fila/[0-9]*.md` rastreado e modificado, o arquivo inteiro. Só roda em `branch_protegida`, sem trailer e sem push | `local-loop.sh:796-824`; add em `:816`, commit em `:820` |
| Há outro caminho com o mesmo defeito? | **Sim, e no kit é o principal**: `ticket_commit` faz `git add -- <arquivo>` inteiro, em cerca de 25 chamadas. A edição alheia sai já no `fila: <id> tentativa N` | `lib.sh:274-279`; `executor.sh:1410`, `:1430`, `:1512`; `local-loop.sh:505`, `:632`, `:647`; `lib.sh:1099`, `:1389` |
| Chaves do ticket que o motor do kit escreve | `status`, `notas_status`, `tentativas`, `adiamentos_ambiente` (grava e apaga), `adiado_ate`. A lista canônica já existe no hash de versão do gate de ticket | `lib.sh:187,189,206,260,265,1387`; `local-loop.sh:630,646`; `executor.sh:1334` |
| E o motor do Comarka? | Só `status` e `notas_status` | Comarka `lib.sh:150-151` |
| A lista de campos do motor é uma só? | Não. `desfecho.ts` não tem `adiado_ate` | `resolvedor/desfecho.ts:40` × `executor.sh:1334` |
| Como o resolvedor commita | Confere o arquivo, espera o git livre, confere tentativa nova, exige conteúdo igual ao da leitura, grava e faz `commit --only -- rel`. Depois confere que entrou um arquivo só e que o pai é o HEAD anterior | `resolvedor/repo.ts:179-202` |
| O resolvedor confere a branch? | Não; só `rev-parse HEAD` | `repo.ts:187,194` |
| O commit do resolvedor leva edição alheia? | Pode. O `novo` nasce do working tree, e uma edição alheia ainda sem commit entra no `commit --only` | `repo.ts:185-189` |
| Pausas que o resolvedor lê | `pausar_file` do config, `docs/fila/PAUSAR`, `docs/fila/.orq-pause`. Não lê `docs/fila/apolo/.orq-pause` | `resolvedor/pausa.ts:46` |
| Quando o resolvedor retira uma pausa | Só pausa de gate sistêmico (regex), veredito `falso_positivo`, modo `auto`, trava de 6 h. Confere o sha e roda o `orq-pause.sh --off` **do repo cliente** | `gate-streak.ts:51-55`, `:163-176`, `:191-214` |
| O que o `--off` apaga | Kit: **as duas sentinelas** (`PAUSAR` e `.orq-pause`). Comarka: a `.orq-pause` global, sem olhar o conteúdo | kit `orq-pause.sh:22-38`; Comarka `orq-pause.sh`, ramo `--off` |
| O resolvedor já retirou alguma pausa? | Nunca: 0 linhas `retomada` nas 480 do ledger | `~/.orq/resolvedor/ledger.jsonl` |
| Quem retirou as pausas de 16/10? | Sem dado. Não foi o resolvedor nem o `publicar.sh`, que recusa quando já há pausa e só remove a que gravou. O log mostra pausas sobrescritas por outras sessões (15:04→15:22; 16:39→16:46→16:39) e a de 16:39 sumindo entre 17:20 e 17:29 | Comarka `publicar.sh:102-115`, `:139-151`; `local-loop.log` de 16/10; ledger `pausa` 18:06Z a 20:36Z |
| "Humano mexeu" hoje | Só **depois** da ação (desfecho, fora dos campos do motor). Antes de agir, só a trava de concorrência "o ticket mudou desde a leitura" | `desfecho.ts:84-85`; `repo.ts:185` |
| O resolvedor lê `Orq-Vigia`? | Não (0 ocorrências) | grep em `scripts/` |
| CONTRATO sobre pausa | §17.3: o sentinela só é lido; quem retoma é o humano ou a §17.4. §17.4: veredito da pausa de gate. §18.3: pausa com dono silenciosa | `CONTRATO.md:1550-1567`, `:1568-1601`, `:1717-1745` |
| O que o ba731d8 mudou | 1361: `objetivo` (`:19`) e status/nota (`:97-98`). 1371: `cmd` (`:160`) e status (`:190-191`). 1377: `cmd` (`:134`) e status (`:164-165`). Base pendente → done, sem trailer | `git show ba731d8 -- <os 3>` |
| No Comarka o bloqueio vira commit? | Muitas vezes não. O 1373 estava `pendente` no HEAD (`6c42ce9^`) quando o resolvedor agiu sobre o `bloqueado` do working tree | `git show 6c42ce9^:docs/fila/1373-*.md` `:137` |
| Como distinguir commit do loop | Comarka: assunto exato `fila(\(apolo\))?: status automatico do loop` ("status devolvido pelo loop" é humano, 57de115). Kit: `fila: <id> …`, o mesmo prefixo de commit humano (6f94e84) | Comarka `local-loop.sh:392-393`; kit `lib.sh:274-279` |
| Branch esperada no `repos.json` | Não há chave de branch. O config do Comarka não tem `branch_protegida`, só `branch_alvo: staging-auto` | `~/.orq/repos.json`; Comarka `000-config.json` |

### Correção à F8 do relatório de convergência

A F8 dizia que o publicar e o ritual removem pausa alheia e que o `--off` do resolvedor apaga as duas sentinelas. O código não confirma:
- o `publicar.sh` recusa quando já há pausa;
- o resolvedor nunca retirou pausa;
- o `--off` que apaga as duas sentinelas é o do kit.

O vetor real: num repo do kit, retomar uma pausa de gate apaga junto a pausa com dono que estiver no outro sentinela. No Comarka, o `--off` apaga o global sem olhar o conteúdo, e fica a janela entre a conferência do sha e o `rm`. Quem tirou as pausas de 16/10 segue sem dado.

### Decisões do Lucas (respostas ao Passo 0)

1. Etapa 8b, no worktree `kit-etapa8a` e na branch `kit/etapa8a`. Relatório neste arquivo.
2. **P1:** commitar só as chaves do motor por índice temporário. A edição alheia fica no working tree, com o evento `EDICAO_ALHEIA` e um aviso por arquivo.
3. O `ticket_commit` entra no P1, com o mesmo conserto.
4. **Branch esperada:** `branch` do item no `~/.orq/repos.json`; senão `branch_protegida` do config do repo; senão `main`.
5. Fixtures com as pausas reais de 12/10 e 16/10. A correção da F8 fica registrada aqui.
6. O instante do bloqueio vem da trilha ou do `meta.json`. Edição alheia sem commit também conta como humano mexeu.
7. Trailer `Orq-Loop: <id>` nos commits do loop do kit. O P4 reconhece o loop por ele e, nos commits antigos, pelo assunto exato.
- **Ordem:** P1, P2, P3, P4, um commit cada; docs (P5) por último.

### Plano (tetos, código + teste)

- **P1, até 260 linhas.** Lista única de campos do motor; escrita do ticket por índice temporário só com essas chaves; `EDICAO_ALHEIA`; trailer `Orq-Loop`.
- **P2, até 140.** Conferência da branch no `escreverEComitar`.
- **P3, até 150.** `retomar` recusa se houver outro sentinela, `dono:` ou conteúdo diferente da pausa de gate lida.
- **P4, até 280.** Humano mexeu antes de agir.
- **P5, até 120.** Docs.

---

**Rebase durante a etapa:** às 14:21:45 a branch `kit/etapa8a` foi rebaseada sobre a main nova (0917131, já com a 8a do validador mergeada), fora desta sessão (reflog: `rebase (start): checkout main`, committer Lucas Santos). O P1 era 2a41010 e virou 9b0addc, com diff idêntico (`diff` dos dois `git show`, sem as linhas `index`). O P2, o P3 e o P4 foram feitos e testados sobre a base nova.

## P1: o commit do loop leva só as chaves do motor (commit 9b0addc; era 2a41010 antes do rebase)

**O que mudou:**
- `scripts/orquestrador/campos-do-motor.json`: a lista única dos campos do motor (`status`, `notas_status`, `tentativas`, `adiamentos_ambiente`, `adiado_ate`).
- `lib.sh` ganhou `ticket_alheio`, `ticket_so_motor`, `_aviso_edicao_alheia` e `commit_motor`. O `ticket_commit` virou `commit_motor "$msg" "$file"`.
  - O commit é montado num índice temporário (`GIT_INDEX_FILE`, `read-tree HEAD`).
  - Ticket sem edição alheia: entra o arquivo do working tree, byte a byte como antes.
  - Ticket com edição alheia, inclusive na prosa: entra a HEAD com só as chaves do motor do working tree. A edição alheia fica no working tree; o índice real volta a casar a HEAD (`git reset -q -- <rel>`).
  - Evento `EDICAO_ALHEIA arquivo= campos= hash=` e um aviso no log, uma vez por edição (marca `runs/<id>/.edicao-alheia` com o hash do ticket sem as chaves do motor).
  - Ticket fora da HEAD: não entra, com `campos=nao_rastreado`.
  - O commit é `git commit` de verdade (os hooks rodam, sem `--no-verify`) e leva um trailer `Orq-Loop: <id>` por ticket.
- `local-loop.sh`: o `autocommit_status_fila` usa o `commit_motor`. Se só havia edição alheia, loga e não commita.
- `executor.sh`:
  - o hash de versão do gate de ticket lê a mesma lista;
  - o preflight recusa (`die`) se a lista faltar ou for inválida. Sem ela, todo ticket pareceria edição alheia: foi o que o primeiro `test-shell.sh` mostrou, com `campos=bloco_ilegivel` em todo commit.
- `resolvedor/desfecho.ts`: o `CAMPOS_DO_MOTOR` lê o JSON. O `humano_mexeu` do desfecho deixa de contar `adiado_ate` como edição humana.
- `test-fixture-executor.sh` copia também `*.json` do motor (`:124`).

**Tamanho:** motor +131/−17. Teste novo de 187 linhas. Fixtures reais (6 arquivos, 920 linhas) em `test/fixtures/edicao-alheia-8b/`. O conjunto ficou cerca de 50 linhas acima do teto de 260 do plano: o excesso é o teste da lista única e o caso de prosa.

**Fixtures:**
- `<ticket>.head.md` = `git show ba731d8^:docs/fila/<ticket>.md` (c8d5900);
- `<ticket>.wt.md` = `git show ba731d8:…` (ba731d863378ac0f39ca71aab695e86d4ab39891);
- para 1361-guarda-ferramenta-no-vitest, 1371-ia-claude-modelos-5-sql e 1377-rag-chunks-vector-1024-sql.

**Vermelho** (o teste novo contra os arquivos de motor de 85c49a6; `vitest run test/orquestrador-edicao-alheia.test.ts`, rc=1):
```
   × autocommit do fim da drenagem com os tickets reais do ba731d8 > o status e a nota do loop entram; o objetivo e os cmd alheios ficam fora do commit
   × autocommit … > a edição alheia continua no working tree, sem commit e sem nada no índice
   × autocommit … > EDICAO_ALHEIA na trilha, uma por ticket, com os campos alheios
   × autocommit … > o commit do loop leva o trailer Orq-Loop de cada ticket
   × ticket_commit, a porta principal de escrita do kit > a tentativa do motor entra; o objetivo alheio fica no working tree
   × ticket_commit … > um aviso por arquivo: a segunda escrita com a mesma edição alheia não repete o evento
   × ticket_commit … > edição alheia só na prosa também fica fora
   × ticket_commit … > sem edição alheia o commit é o arquivo do working tree, como antes, e não há evento
   × uma lista só dos campos do motor > o resolvedor usa a mesma lista do lib.sh (e ela tem adiado_ate)
      Tests  9 failed (9)
AssertionError: 1361-guarda-ferramenta-no-vitest: expected 'CONTEXTO: plano do harness de 18/10/2…' to be 'CONTEXTO: plano do harness de 18/10/2…'   ← o objetivo alheio entrou na HEAD
AssertionError: expected '' to contain ' M docs/fila/1361-guarda-ferramenta-n…'                                                       ← nada ficou no working tree
AssertionError: expected '' to match / 1361 EDICAO_ALHEIA .*campos=objetivo/
AssertionError: expected 'fila: status automatico do loop 2026-…' to match /^Orq-Loop: 1361$/m
AssertionError: expected '# Ticket 1361: A guarda do Claude Cod…' not to contain 'nota humana'
AssertionError: expected [ 'status', 'notas_status', …(2) ] to deeply equal [ 'status', 'notas_status', …(3) ]
```

**Verde** (o mesmo arquivo, rc=0): `✓ test/orquestrador-edicao-alheia.test.ts (9 tests)`, `Tests 9 passed (9)`.

**Fechamento do P1** (saída crua em `p1-*.txt`, no scratchpad da sessão):
```
npx tsc --noEmit                              rc=0
TZ=UTC node_modules/.bin/vitest run           rc=0   Test Files 97 passed (97) · Tests 1576 passed (1576)
bash scripts/kit/test-shell.sh                rc=0   TODOS OS SCRIPTS SAÍRAM rc 0
bash scripts/kit/test-instalar.sh             rc=0   TODOS OS CHECKS PASSARAM
```

**Consequência a saber:**
- No kit, o loop roda no checkout principal. Uma edição alheia deixada no working tree faz o preflight do disparo seguinte recusar por "árvore de execução suja" (`executor.sh:68-71`).
- A recusa de preflight é AMBIENTE (`local-loop.sh:275-279`) e não queima ticket. A fila espera o dono da edição commitar.
- Antes da 8b a edição sumia dentro de um commit do loop. Agora ela fica visível e com dono pendente.
- No Comarka, que tem runner separado, o checkout principal pode ficar sujo; lá o conserto equivalente é o C4 da convergência.

## Rebase sobre a main depois do merge da 8a (18/10/2026)

A 8a (validador) entrou na main do kit em `0917131`. A branch `kit/etapa8a` foi rebaseada sobre ela no worktree `~/Projetos/_worktrees/kit-etapa8a`:

- antes: `2a41010` (8b-1), sobre a main antiga;
- depois: `9b0addc` (8b-1), sobre `0917131`;
- `git rebase main`: rc 0, **sem conflito**. A 8b-1 não toca CHANGELOG, PECAS nem CONTRATO; as seções de docs da 8b ainda não existem (P5 é a última peça). Quando entrarem, vão depois das da 8a. A etapa do `testes_vizinhos` é a **8c**.

As suítes rodaram num worktree destacado temporário em `9b0addc` (`/tmp/orq-8b-rebase`, removido ao fim). Motivo: na hora do rebase havia um arquivo não rastreado em andamento no worktree da 8b (`test/orquestrador-resolvedor-branch.test.ts`, o vermelho da próxima peça), que ficou intocado e de fora da medição.

```
$ npx tsc --noEmit
tsc rc=0
$ TZ=UTC node_modules/.bin/vitest run
 Test Files  98 passed (98)
      Tests  1595 passed (1595)
vitest rc=0
$ bash scripts/kit/test-shell.sh
TODOS OS SCRIPTS SAÍRAM rc 0
test-shell rc=0
$ bash scripts/kit/test-instalar.sh
TODOS OS CHECKS PASSARAM
test-instalar rc=0
```

---

## P2: o resolvedor confere a branch (commit b2f9547)

**O que mudou:**
- `repo.ts`: `branchEsperada(raiz, doItem?)` devolve a `branch` do item, senão a `branch_protegida` de `docs/fila/000-config.json`, senão `main`.
- `escreverEComitar` ganhou o parâmetro `branch`. Logo antes de escrever, compara `rev-parse --abbrev-ref HEAD` com a esperada. Se diferir, não escreve e devolve `{ok:false, motivo:"branch_inesperada: checkout em 'X', esperada 'Y'", branch:{atual, esperada}}`.
- `modos.ts`: `RepoResolvedor.branch` vem da chave `branch` do item no repos.json.
- `acoes.ts`: na recusa por branch, grava a linha `branch_inesperada` no ledger (`repo`, `id`, `branch`, `esperada`, `notificacao` na primeira vez). Avisa, por `notificar`, só na primeira vez daquele repo naquela branch. O item da passada continua `nao_consegui`, que vira `nao_agiu` no ledger como antes.
- `desfazer.ts` passa `repo.branch`.

**Tamanho:** motor +43/−8; teste novo de 118 linhas.

**Hoje:** o `~/.orq/repos.json` não tem `branch` no item do Comarka, e o config do Comarka não tem `branch_protegida`. Lá vale `main`, que é onde estão os 11 commits do resolvedor.

**Vermelho** (contra 9b0addc, a base real do P2; a mensagem do commit diz 2a41010, o mesmo P1 antes do rebase; rc=1): o 840 real em auto, com o checkout na branch `qualquer`:
```
   × peça 2 (8b): o resolvedor confere a branch antes do commit > checkout numa branch qualquer: não commita, branch_inesperada no ledger, um aviso 1199ms
   ✓ peça 2 (8b): o resolvedor confere a branch antes do commit > na main (padrão), o R1 age como antes 363ms
   × peça 2 (8b): o resolvedor confere a branch antes do commit > a branch do item do repos.json vale antes do padrão 349ms
   × peça 2 (8b): o resolvedor confere a branch antes do commit > sem branch no item, vale a branch_protegida do config do repo 367ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
      Tests  3 failed | 1 passed (4)
-     "feito": "nao_consegui",
+     "feito": "aplicado",          ← o código antigo commitou o R1 na branch 'qualquer'
```

**Verde:** `✓ test/orquestrador-resolvedor-branch.test.ts (4 tests)`, `Tests 4 passed (4)`.

**Fechamento do P2:**
```
tsc rc=0
vitest rc=0
 Test Files  99 passed (99)
      Tests  1599 passed (1599)
shell rc=0
TODOS OS SCRIPTS SAÍRAM rc 0
instalar rc=0
TODOS OS CHECKS PASSARAM
```

---

## P3: pausa com dono intocável (commit 2495d4a)

**Correção do Passo 0:** o vermelho que eu tinha proposto (pausa de gate no `.orq-pause` e pausa com dono no `PAUSAR`) não seria vermelho. O `lerPausa` só lê o PRIMEIRO sentinela que existe, na ordem `pausar_file`, `PAUSAR`, `.orq-pause` (`pausa.ts:46-69`). Ele acharia a pausa com dono e não agiria.

Os vetores que o código deixava abertos de verdade:
- **(a)** `lerPausaGate` sem âncora (`gate-streak.ts:51-55`): uma pausa com `dono:` que cita a linha de gate era julgada pausa de gate;
- **(b)** com `pausar_file` apontando o `.orq-pause` legado (gate lido primeiro), o `--off` do kit (`orq-pause.sh:22-38`) apagava junto o `PAUSAR` com dono;
- **(c)** a janela entre a conferência do sha e o `rm` do script do repo.

O (c) **fica como resíduo**: fechar exige que o `--off` do repo confira o conteúdo, e o script é do repo cliente. Nada disso foi observado em produção: o resolvedor nunca retirou pausa (0 `retomada` no ledger).

**O que mudou:**
- `lerPausaGate` só aceita o sentinela cuja primeira linha não vazia COMEÇA por `gate sistemico: "…" reprovou N tickets seguidos (…)` e não tem `dono:`. É o formato do Comarka (`comarka lib.sh:566-570`).
- `retomar` não chama o `--off` se outro sentinela existir: `nao_agiu` com "outra pausa presente: <rel> (o --off apagaria junto)".
- `pausa.ts` exporta `sentinelas(raiz)`, a mesma ordem que o `lerPausa` usa.

**Tamanho:** motor +17/−4; teste novo de 133 linhas.

**Textos reais:**
- pausa de gate de 12/10: ledger 2026-10-12T17:34:26Z, motivo `gate sistemico: "vitest" reprovou 4 tickets seguidos (835,854,318c,921) em 2026-10-12T17:34:24Z`, nas três linhas do template do Comarka;
- pausa com dono de 16/10: ledger 2026-10-16T19:36:34Z, motivo `dono: manual | motivo: Lucas alinhando main local`, com o carimbo `2026-10-16 16:36 | ` do formato do `orq-pause.sh`. O ledger tira o carimbo, então essa parte foi reconstruída;
- a combinação dos dois e a pausa que cita a linha de gate são montadas.

**Vermelho** (contra b2f9547, rc=1):
```
   × peça 3 (8b): pausa com dono nunca sai pelo resolvedor > (a) pausa com dono que cita a linha de gate não é pausa de gate: não retoma 20ms
   × peça 3 (8b): pausa com dono nunca sai pelo resolvedor > (b) gate no .orq-pause legado e a pausa com dono de 16/10 no PAUSAR: não chama o --off, as duas ficam 16ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected [ '--off' ] to deeply equal []
AssertionError: expected [ '--off' ] to deeply equal []
      Tests  2 failed | 2 passed (4)
```

**Verde:** os 4 casos passam, e as suítes de pausa que já existiam também (`pausa-gate`, `pausa`, `pausa-dono`: 23/23 junto com o novo).

**Fechamento do P3:**
```
tsc rc=0
vitest rc=0
 Test Files  100 passed (100)
      Tests  1603 passed (1603)
shell rc=0
TODOS OS SCRIPTS SAÍRAM rc 0
instalar rc=0
TODOS OS CHECKS PASSARAM
```

---

## P4: humano mexeu antes de agir (commit fc11aea)

**O que mudou:**
- `resolvedor/humano.ts` (66 linhas, novo): `humanoMexeu(raiz, rel, quando)`. Só lê o repo, por `gitLeitura` (`show`, `log`) e lendo o arquivo.
  - **Edição sem commit:** se o working tree difere da HEAD fora de `campos-do-motor.json` ou na prosa, devolve `quem: nao_commitado`.
  - **Commits:** com `log --since=<bloqueio.quando> -- <rel>`, do mais antigo ao mais novo, procura o primeiro commit que muda algo fora dos campos do motor. Ficam de fora:
    - os do loop: trailer `Orq-Loop`, ou o assunto exato do motor (kit `fila: <id> tentativa N|bloqueado…|refatiar|…`, Comarka `fila(\(apolo\))?: status automatico do loop`);
    - os do resolvedor: `Orq-Resolvedor`/`Orq-Resolvedor-Desfaz` ou o assunto `orq-resolvedor:`;
    - o commit que cria o arquivo.
  - O commit achado vira `quem: vigia` se tiver `Orq-Vigia`, senão `quem: humano`.
- `acoes.ts`: no `agirR1R5`, logo antes de escrever, `humanoMexeu` com `diag.bloqueio.quando`. Se achar, não escreve, grava `humano_mexeu` no ledger (`quem`, `commit`, `assunto`, `bloqueado_em`, `classe`, `regra`, `assinatura`, `acao`) e devolve `nao_consegui` com motivo `humano_mexeu: …`.

**Tamanho:** motor +73 (66 + 7); teste novo de 116 linhas.

**O instante do bloqueio** é o `bloqueio.quando` que o triador já grava:
- no kit, o `ts` do BLOQUEADO na trilha (`leitor-kit.ts:252`);
- no legado, o último `ts` do `meta.json` da série (`leitor-legado-comarka.ts:183`, `:420`).

**Vermelho** (contra 2495d4a, com o `humano.ts` ainda sem ligação; rc=1): o 840 real, com `bloqueio.quando` = 2026-10-10T22:50:37Z.
```
   × peça 4 (8b): humano mexeu, antes de agir > commit da Vigia (Orq-Vigia) depois do bloqueio: não age, humano_mexeu com quem=vigia 751ms
   × peça 4 (8b): humano mexeu, antes de agir > commit humano sem trailer depois do bloqueio: não age, quem=humano 359ms
   × peça 4 (8b): humano mexeu, antes de agir > edição sem commit no working tree: não age e não leva a edição de ninguém 342ms
   ✓ peça 4 (8b): humano mexeu, antes de agir > controle: edição humana ANTES do bloqueio não impede a ação 363ms
   ✓ peça 4 (8b): humano mexeu, antes de agir > controle: commit do loop depois do bloqueio (Orq-Loop) não conta 358ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
-     "feito": "nao_consegui",
+     "feito": "aplicado",
-     "feito": "nao_consegui",
+     "feito": "aplicado",
-     "feito": "nao_consegui",
+     "feito": "aplicado",
      Tests  3 failed | 2 passed (5)
```

**Verde:** `Tests 5 passed (5)`. As 23 suítes do resolvedor passam juntas (118 testes).

**Conferência só de leitura no Comarka vivo:**
- o `humanoMexeu` rodou (`tsx`, `GIT_OPTIONAL_LOCKS=0`) sobre os tickets `bloqueado` de hoje, com o último `ts` do `meta.json`;
- só havia um, e o resultado não foi falso positivo: `1323 2026-10-18T17:33:43Z null`.

**Limite conhecido:** um commit do loop antigo que já levou edição alheia, como o ba731d8, passa como "do loop" pelo assunto. É exatamente o caso que o P1 fecha daqui para a frente.

**Fechamento do P4:**
```
tsc rc=0
vitest rc=0
 Test Files  101 passed (101)
      Tests  1608 passed (1608)
shell rc=0
TODOS OS SCRIPTS SAÍRAM rc 0
instalar rc=0
TODOS OS CHECKS PASSARAM
```

---

## P5: docs (commit f592745)

- **CONTRATO:**
  - §4.1 ganha a linha `EDICAO_ALHEIA`;
  - a §19 nova cobre: 19.1 commit do motor, 19.2 branch, 19.3 pausa com dono, 19.4 humano mexeu, 19.5 ledger (`branch_inesperada`, `humano_mexeu`, `nao_agiu` "outra pausa presente") e 19.6 testes.
- **CHANGELOG:** a seção "Etapa 8b", com os shas.
- **`docs/PECAS.md`:**
  - em FEITAS, a 8b;
  - em PENDENTES, a janela entre o sha e o `rm` (pede um `--off-se <sha>` no motor do repo) e o commit antigo do loop com edição alheia, que passa como "do loop".
- **`docs/migracao-comarka.md`:** a nota de que o conserto do P1 foi sugerido ao Comarka como C4, e que lá ele precisa cobrir também o `rebase_status_fila` (`:350`).
- **Tamanho:** +130 linhas, 10 acima do teto de 120.

## Fechamento (saída crua, branch inteira em f592745)

```
$ npx tsc --noEmit
rc=0
$ TZ=UTC node_modules/.bin/vitest run
rc=0

 Test Files  101 passed (101)
      Tests  1608 passed (1608)
   Start at  17:50:45
   Duration  50.15s (transform 1.08s, setup 0ms, collect 18.21s, tests 357.40s, environment 13ms, prepare 3.85s)

$ bash scripts/kit/test-shell.sh
rc=0
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
  rc=0  test-fixture-gates.sh (kit)
TODOS OS SCRIPTS SAÍRAM rc 0
$ bash scripts/kit/test-instalar.sh
rc=0
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
```

## Commits da etapa (nenhum push)

```
f592745 8b-5: CONTRATO §19 e §4.1 (EDICAO_ALHEIA), CHANGELOG, PECAS e a nota do C4 em migracao-comarka
fc11aea 8b-4: humano mexeu antes de agir (Orq-Vigia, commit humano, edição sem commit)
2495d4a 8b-3: pausa com dono é intocável para o resolvedor
b2f9547 8b-2: o resolvedor só commita na branch esperada do repo (branch_inesperada)
9b0addc 8b-1: o commit do loop leva só as chaves do motor (EDICAO_ALHEIA, Orq-Loop)
```
A base é a main 0917131. O worktree está limpo: só o symlink `node_modules` aparece como não rastreado.

## O que fica para você

- **Merge da `kit/etapa8a` na main.** A sessão do validador mexe nos mesmos CHANGELOG, PECAS e CONTRATO. A 8a já estava na main quando a branch foi rebaseada, então não há conflito com ela. Pode haver com a 8c (`kit-vizinhos-8c`) se ela entrar antes.
- **Os vermelhos de fixture montada:**
  - o do P3 junta dois textos reais numa combinação que não aconteceu em produção (o resolvedor nunca retirou pausa);
  - o do P4 simula o commit `Orq-Vigia` sobre o 840 real.
- **Resíduos:** os dois PENDENTES novos do PECAS.
- **O C4 no Comarka continua sendo do chat do Comarka.**
