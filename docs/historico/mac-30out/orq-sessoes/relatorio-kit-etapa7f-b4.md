# Relatório · etapa 7f-b4 do kit: ligar o modelo do triador com segurança (11/10/2026)

Worktree `kit/etapa7f4` (`/Users/lucasantos/Projetos/_worktrees/kit-etapa7f4`), base
`3d4f19c` (7f-b3-5). Quatro commits, um por peça. Nada de push, merge, fetch, `launchctl`
ou `claude -p`, e nenhuma escrita em repo real nem em `~/.orq`. `node_modules` (symlink)
ficou fora de todo `git add`.

| peça | commit | o quê |
|---|---|---|
| 1 | `a58f71f` | assinatura estável: o log em recorte entra pelo recorte, não pelo stat do arquivo inteiro |
| 2 | `9ffd35b` | fatia do teto para auto: `teto_reserva_auto` (padrão 0.7) no repos.json |
| 3 | `643194d` | `claude` no PATH do plist (ou recusa); job sem `claude`: `MODELO_INDISPONIVEL` 1×/dia e só extração |
| 4 | `66346fe` | CONTRATO §16 (e §13.4, §14.7), CHANGELOG, PECAS com os shas |

## PASSO 0

### Leitura

- **Relatório da 7f-b3:** lido inteiro. Ele **não tem uma seção "Para decidir"**. Os três
  itens que o enunciado cita estão em PECAS/PENDENTES (na seção "Diff cru" do relatório,
  linhas 1488-1509) e em "O que muda depois do merge": o `claude` no PATH do job, o teto
  entre passadas e a assinatura do 243.
- **Assinatura** (`saida.ts:146` antes): `sha256(repo|id|status|notas_status` + para cada
  arquivo lido `|arquivo|mtime_ns|tamanho)`, mais as dependências quando não há tentativa.
  No leitor do kit (`leitor-kit.ts:113-126`, `lido`), cada `Lido` leva o **stat do arquivo
  inteiro**, inclusive o `docs/fila/runs/events.log`, que é lido só em recorte (as linhas do
  id, `lido(linhasDoId, false)`). O leitor do legado faz o mesmo com o tamanho do
  `local-loop.log` (`leitor-legado-comarka.ts:258`).
- **Job:** `instalar-job.sh` resolve só `{{CHECKOUT}}`, `{{NODE_DIR}}` e `{{ORQ_HOME}}`. O PATH do
  template é `{{NODE_DIR}}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`.
  O `job.sh` roda `orq resolver` sem olhar o `claude`.
- `command -v claude` → `/Users/lucasantos/.local/bin/claude`, que é um link para
  `~/.local/share/claude/versions/2.1.296`. **O `~/.local/bin` também tem `node` e `npx`**
  (`which -a node`), por isso o diretório do `claude` tem de entrar **depois** do NODE_DIR.

### A entrada que muda a assinatura do 243

**O stat (mtime_ns e tamanho) do `docs/fila/runs/events.log` inteiro do conteudos-infinitos.** O
loop do repo acrescenta 3 linhas a cada drenagem ociosa, de 30 em 30 min, e nenhuma delas é
do 243:

```
2026-10-11T12:09:27-0300 --- OCIOSO pendentes=1 244=dependencia:243:bloqueado
2026-10-11T12:09:27-0300 --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=0 refatiar=0 sem_progresso=0 dur=0min
2026-10-11T12:39:32-0300 --- DRENAGEM_INICIO alvo=staging-auto processaveis=0
2026-10-11T12:39:35-0300 --- OCIOSO pendentes=1 244=dependencia:243:bloqueado
2026-10-11T12:39:35-0300 --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=0 refatiar=0 sem_progresso=0 dur=0min
```

Provas (tudo só leitura):

1. As 24 assinaturas de 11/10 (`historico/` mais a atual) estão espaçadas de ~30 min:
   `03:54:09Z 4849939e6dbd`, `04:09:10Z efd3d2f85109`, `04:39:13Z 43dde2a55d5b`, … ,
   `15:10:14Z 0a6368fbb44b`, atual `15:40:18Z 61a4b72ec614`.
2. A cópia da evidência de assinaturas diferentes é igual byte a byte:
   `diff -rq 243/efd3d2f85109/evidencia 243/43dde2a55d5b/evidencia` e
   `diff -rq 243/43dde2a55d5b/evidencia 243/61a4b72ec614/evidencia` não dão saída. O
   conteúdo lido (incluindo o recorte do events.log) é o mesmo.
3. Os artefatos do 243 (`runs/243/attempt-*`) e o ticket têm mtime de 21/09. O
   `events.log` tem mtime `2026-10-11T12:39:35-0300` e 258699 bytes.
4. Recalculando com o motor de `3d4f19c` (`lerRepo` + `assinatura`, só leitura) sai
   **`61a4b72ec614b4abe6d991913c80c736002475280b2def14ba24c575a3bcb7ff`**, igual à gravada. Trocando
   só o stat do `events.log` sai `404d8f40c221…`. Os `lidos` dessa leitura:

```
docs/fila/runs/243/attempt-0/gates.txt 216 1790008410225716348 inteiro
… (os artefatos de attempt-0, attempt-0, attempt-1, attempt-2: todos de 21/09)
docs/fila/runs/events.log 258699 1791733175749071756 recorte
docs/fila/243-rota-e-tela-publica-de-aprovacao.md 21074 1790032059228524233 inteiro
```

De passagem (ficou em PECAS, sem mexer): o leitor do kit lê o `attempt-0` duas vezes e
nunca o `attempt-3`. O 243 tem dois `INICIO attempt=1` (a volta refatiada) e o leitor
monta o diretório pelo `attempt=` (`leitor-kit.ts:140`).

Também de passagem: o 1006 do Comarka teve 2 assinaturas (15:10 e 15:20). O legado tem o
mesmo defeito, pelo tamanho do `local-loop.log`, e a peça 1 cobre os dois leitores.

## Peça 1 · assinatura estável (`a58f71f`)

Conserto: em `assinatura`, o `Lido` com `faixas` (recorte de um log que é de todos os
tickets) entra como `arquivo|recorte|faixas|sha256(conteúdo)`. Os arquivos inteiros
continuam pelo stat. A assinatura só muda com o ticket: o arquivo dele, os artefatos das
tentativas, as linhas dele na trilha e o motivo do bloqueio. Os quatro controles positivos
do teste (ticket editado, `INICIO attempt=4`, motivo do bloqueio trocado, `gates.txt`
reescrito) já passavam no vermelho e continuam passando.

Uma asserção existente mudou de forma, sem perder força. O replay da corrida da peça 6
(`orquestrador-triador-aceite.test.ts`) exigia que a assinatura gravada na fixture (pela
fórmula da 7f-b1b) fosse igual à do motor. Com a fórmula nova, os 21 casos ficariam
"velhos". O teste agora recalcula pela fórmula da corrida (`assinaturaDaCorrida`) e
continua exigindo a mesma evidência nas 21 respostas.

**Matriz da 7f-b3:** gerada antes (`git archive 3d4f19c`) e depois. `diff` vazio, 63 linhas
iguais, 17 FIRME, zero firme errado. O gabarito (`orquestrador-resolvedor-gabarito.test.ts`)
e o aceite passam sem mudança de número.

### Vermelho (saída crua, `TZ=UTC npx vitest run test/orquestrador-triador-assinatura-estavel.test.ts` contra `3d4f19c`)

```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f4

 ❯ test/orquestrador-triador-assinatura-estavel.test.ts (5 tests | 1 failed) 37ms
   × peça 1: assinatura estável (o 243 de 11/10) > duas drenagens ociosas do loop, sem tentativa nova: a mesma assinatura 18ms
     → expected { …(2) } to deeply equal { …(2) }

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-triador-assinatura-estavel.test.ts > peça 1: assinatura estável (o 243 de 11/10) > duas drenagens ociosas do loop, sem tentativa nova: a mesma assinatura
AssertionError: expected { …(2) } to deeply equal { …(2) }

- Expected
+ Received

  Object {
-   "a1": "efcfc5e9729623a10796193ed4b574feb2707cc383a7f35b1cb05a542453c4f7",
-   "a2": "efcfc5e9729623a10796193ed4b574feb2707cc383a7f35b1cb05a542453c4f7",
+   "a1": "efbb7873cdf8f235d2272891f50508ace7e1213c5b134ab4bd35dc2241acc4ba",
+   "a2": "317e737de4bd7eed67b1a342bf5bfe9c46e7158a83ed8224a20c253c8a29ab80",
  }

 ❯ test/orquestrador-triador-assinatura-estavel.test.ts:57:24
     55|     drenagem(raiz, '12:39')
     56|     const a2 = assin(raiz)
     57|     expect({ a1, a2 }).toEqual({ a1: a0, a2: a0 })
       |                        ^
     58|   })
     59| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
   Start at  16:10:06
   Duration  341ms (transform 103ms, setup 0ms, collect 119ms, tests 37ms, environment 0ms, prepare 44ms)
```

### Verde (`TZ=UTC npx vitest run test/orquestrador-triador-*.test.ts test/orquestrador-resolvedor-*.test.ts`, em `a58f71f`, rc 0)

```
 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 220ms
 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 496ms
 ✓ test/orquestrador-triador-sem-tentativa.test.ts (3 tests) 98ms
 ✓ test/orquestrador-resolvedor-passada.test.ts (5 tests) 1425ms
   ✓ peça 2: a passada > --dry-run: o repo intocado, sem ledger, e o que faria em dry-run.jsonl 681ms
   ✓ peça 2: a passada > orq resolver --repo X --dry-run pela linha de comando 633ms
 ✓ test/orquestrador-triador-custo-real.test.ts (7 tests) 1554ms
   ✓ peça 3: custo real sempre > a reserva do pior caso existe só durante a chamada; depois vira o custo real 328ms
   ✓ peça 3: custo real sempre > chamada que começou e não devolveu custo (timeout) fica com o pior caso, marcada; não é reserva esquecida 1013ms
 ✓ test/orquestrador-resolvedor-prioridade.test.ts (2 tests) 167ms
 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 62ms
 ✓ test/orquestrador-resolvedor-gabarito.test.ts (8 tests) 4001ms
 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 4934ms
 ✓ test/orquestrador-triador-assinatura-estavel.test.ts (5 tests) 93ms
 ✓ test/orquestrador-triador-aceite.test.ts (12 tests) 5312ms
 ✓ test/orquestrador-resolvedor-job.test.ts (4 tests) 724ms
 ✓ test/orquestrador-resolvedor-promocao.test.ts (8 tests) 6065ms
 ✓ test/orquestrador-triador-modelo.test.ts (13 tests) 6470ms
 ✓ test/orquestrador-resolvedor-r2.test.ts (5 tests) 5362ms
 ✓ test/orquestrador-resolvedor-desfazer.test.ts (4 tests) 4918ms
 ✓ test/orquestrador-resolvedor-ledger.test.ts (9 tests) 7993ms
 ✓ test/orquestrador-resolvedor-acoes.test.ts (12 tests) 10642ms
   ✓ peça 3: ações R1 e R5 com as travas > segunda passada no mesmo ticket não age de novo; bloqueado outra vez vai para humano 1074ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando ele espera, e age quando o git sai 1750ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando além do teto ele desiste sem escrever (processo e index.lock) 5016ms
   ✓ peça 3: ações R1 e R5 com as travas > o commit tem só o arquivo do ticket e o trailer; o resto do índice fica 384ms
   ✓ peça 3: ações R1 e R5 com as travas > o hook do repo roda (nunca --no-verify) e, se recusa, o arquivo volta 533ms
   ✓ peça 3: ações R1 e R5 com as travas > nenhuma escrita fora de docs/fila do ticket bloqueado 346ms
   ✓ peça 3: ações R1 e R5 com as travas > R5 máquina (801, D4): só reabre com a máquina livre 346ms
   ✓ peça 3: ações R1 e R5 com as travas > R1 com .skip no teste do branch alvo: não age 301ms
 Test Files  18 passed (18)
      Tests  124 passed (124)
```

## Peça 2 · fatia do teto para auto (`9ffd35b`)

Chave nova no topo do `~/.orq/repos.json`: `teto_reserva_auto`, entre 0 e 1, padrão 0.7.
Ausente ou fora do intervalo, vale 0.7 (`lerTetoReservaAuto`). Na passada, o passo do modelo
de um repo sem classe em auto (`emAuto`, o mesmo critério do `ordenarRepos` da 7f-b3) olha
duas coisas: o teto do dia e também
`gasto do dia dos repos fora de auto + corte ≤ (1 − 0.7) × teto`. Quando passa, sai
`pulado: teto_reserva_auto`, sem reserva. O repo em auto segue só com o teto do dia. Entrada
do ledger de repo que não está em auto, ou que não está listado (o `orq triar` manual), conta
na fatia.

O teste: um repo em diagnostico (o 243 de molde) triado de novo em cada uma de 18 passadas
do mesmo dia (uma nota nova no ticket muda a assinatura), stub a US$ 0,25, teto de US$ 5,00.
Depois aparece o bloqueio do Comarka (559, R1/R5 em auto).

- Hoje (motor de `a58f71f`): o diagnostico gasta US$ 4,50 e o Comarka sai `teto_dia`.
- Pronto: o diagnostico para em US$ 1,00 (a 5ª chamada passaria de US$ 1,50 no pior caso),
  o Comarka chama, e o 243 fica `teto_reserva_auto`.

O teste da prioridade da 7f-b3 passa sem mudança.

### Vermelho (saída crua, `TZ=UTC npx vitest run test/orquestrador-resolvedor-fatia-auto.test.ts` contra `a58f71f`)

```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f4

 ❯ test/orquestrador-resolvedor-fatia-auto.test.ts (2 tests | 2 failed) 1778ms
   × peça 2: fatia do teto para auto (teto_reserva_auto) > o diagnostico triado de novo a cada passada não come o teto do bloqueio em auto que aparece depois (padrão 0.7) 1764ms
     → expected { comarka: 'teto_dia', …(1) } to deeply equal { comarka: 'chamou US$ 0.25', …(1) }
   × peça 2: fatia do teto para auto (teto_reserva_auto) > teto_reserva_auto no repos.json: lido do topo; ausente ou inválido, 0.7 3ms
     → expected [ undefined, undefined, …(5) ] to deeply equal [ 0.7, 0.5, +0, 1, 0.7, 0.7, 0.7 ]

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-resolvedor-fatia-auto.test.ts > peça 2: fatia do teto para auto (teto_reserva_auto) > o diagnostico triado de novo a cada passada não come o teto do bloqueio em auto que aparece depois (padrão 0.7)
AssertionError: expected { comarka: 'teto_dia', …(1) } to deeply equal { comarka: 'chamou US$ 0.25', …(1) }

- Expected
+ Received

  Object {
-   "actus": "teto_reserva_auto",
-   "comarka": "chamou US$ 0.25",
+   "actus": "chamou US$ 0.25",
+   "comarka": "teto_dia",
  }

 ❯ test/orquestrador-resolvedor-fatia-auto.test.ts:85:99
     83|     const r = passada({ agora: AGORA })
     84|     expect(r.itens.map((i) => `${i.repo}/${i.id}`)).toEqual(['comarka-…
     85|     expect({ comarka: pulado('comarka-operacional', '559'), actus: pul…
       |                                                                                                   ^
     86|     // o diagnostico parou em 30% do teto de US$ 5,00: 4 chamadas de U…
     87|     expect({ actus: gastoDe('actus-saas'), comarka: gastoDe('comarka-o…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  test/orquestrador-resolvedor-fatia-auto.test.ts > peça 2: fatia do teto para auto (teto_reserva_auto) > teto_reserva_auto no repos.json: lido do topo; ausente ou inválido, 0.7
AssertionError: expected [ undefined, undefined, …(5) ] to deeply equal [ 0.7, 0.5, +0, 1, 0.7, 0.7, 0.7 ]

- Expected
+ Received

  Array [
-   0.7,
-   0.5,
-   0,
-   1,
-   0.7,
-   0.7,
-   0.7,
+   undefined,
+   undefined,
+   undefined,
+   undefined,
+   undefined,
+   undefined,
+   undefined,
  ]

 ❯ test/orquestrador-resolvedor-fatia-auto.test.ts:98:19
     96|       lidos.push(lerTetoReservaAuto?.())
     97|     }
     98|     expect(lidos).toEqual([0.7, 0.5, 0, 1, 0.7, 0.7, 0.7])
       |                   ^
     99|   })
    100| })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  1 failed (1)
      Tests  2 failed (2)
   Start at  16:12:43
   Duration  2.36s (transform 292ms, setup 0ms, collect 137ms, tests 1.78s, environment 0ms, prepare 114ms)
```

### Verde (as suítes do triador e do resolvedor, em `9ffd35b`, rc 0)

```
 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 828ms
 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 1602ms
 ✓ test/orquestrador-triador-custo-real.test.ts (7 tests) 2136ms
   ✓ peça 3: custo real sempre > a reserva do pior caso existe só durante a chamada; depois vira o custo real 511ms
   ✓ peça 3: custo real sempre > chamada que começou e não devolveu custo (timeout) fica com o pior caso, marcada; não é reserva esquecida 1045ms
 ✓ test/orquestrador-triador-sem-tentativa.test.ts (3 tests) 394ms
 ✓ test/orquestrador-resolvedor-passada.test.ts (5 tests) 3510ms
   ✓ peça 2: a passada > --dry-run: o repo intocado, sem ledger, e o que faria em dry-run.jsonl 1839ms
   ✓ peça 2: a passada > orq resolver --repo X --dry-run pela linha de comando 1433ms
 ✓ test/orquestrador-resolvedor-fatia-auto.test.ts (2 tests) 1409ms
   ✓ peça 2: fatia do teto para auto (teto_reserva_auto) > o diagnostico triado de novo a cada passada não come o teto do bloqueio em auto que aparece depois (padrão 0.7) 1401ms
 ✓ test/orquestrador-resolvedor-prioridade.test.ts (2 tests) 600ms
 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 328ms
 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 9985ms
 ✓ test/orquestrador-resolvedor-job.test.ts (4 tests) 2022ms
 ✓ test/orquestrador-resolvedor-gabarito.test.ts (8 tests) 9469ms
 ✓ test/orquestrador-triador-assinatura-estavel.test.ts (5 tests) 228ms
 ✓ test/orquestrador-triador-aceite.test.ts (12 tests) 14407ms
 ✓ test/orquestrador-resolvedor-promocao.test.ts (8 tests) 13383ms
 ✓ test/orquestrador-triador-modelo.test.ts (13 tests) 15293ms
 ✓ test/orquestrador-resolvedor-r2.test.ts (5 tests) 11227ms
 ✓ test/orquestrador-resolvedor-desfazer.test.ts (4 tests) 9313ms
 ✓ test/orquestrador-resolvedor-ledger.test.ts (9 tests) 17160ms
 ✓ test/orquestrador-resolvedor-acoes.test.ts (12 tests) 19085ms
   ✓ peça 3: ações R1 e R5 com as travas > segunda passada no mesmo ticket não age de novo; bloqueado outra vez vai para humano 2362ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando ele espera, e age quando o git sai 2302ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando além do teto ele desiste sem escrever (processo e index.lock) 5852ms
   ✓ peça 3: ações R1 e R5 com as travas > com o interruptor ele não faz nada: nem triagem, nem ledger, nem o repo 1582ms
   ✓ peça 3: ações R1 e R5 com as travas > o commit tem só o arquivo do ticket e o trailer; o resto do índice fica 1825ms
   ✓ peça 3: ações R1 e R5 com as travas > o hook do repo roda (nunca --no-verify) e, se recusa, o arquivo volta 1236ms
   ✓ peça 3: ações R1 e R5 com as travas > nenhuma escrita fora de docs/fila do ticket bloqueado 1129ms
   ✓ peça 3: ações R1 e R5 com as travas > R5 árvore suja: não reabre com a worktree alvo suja; reabre quando limpa 604ms
   ✓ peça 3: ações R1 e R5 com as travas > R5 máquina (801, D4): só reabre com a máquina livre 885ms
   ✓ peça 3: ações R1 e R5 com as travas > R1 com .skip no teste do branch alvo: não age 616ms
   ✓ peça 3: ações R1 e R5 com as travas > R1 em sombra: só a proposta com o diff, o repo intocado 475ms
 Test Files  19 passed (19)
      Tests  126 passed (126)
```

## Peça 3 · o `claude` no PATH do job (`643194d`)

- `instalar-job.sh`: `CLAUDE_BIN=$(command -v claude)`. O diretório usado é o do link,
  `~/.local/bin`, e não o alvo versionado, que muda a cada atualização. Ele vai para
  `{{CLAUDE_DIR}}` no template, **depois** do `{{NODE_DIR}}`. Sem `claude` no PATH, o script
  recusa com `ERRO: claude nao esta no PATH`, rc 1, com ou sem `--dry-run`, antes de
  escrever ou chamar `launchctl`.
- `job.sh`: sem `${ORQ_TRIADOR_CLAUDE:-claude}`, a passada roda com `--sem-modelo` (nem
  chamada, nem reserva). O job.log ganha **uma** linha `<ts> MODELO_INDISPONIVEL claude
  fora do PATH (<PATH>): passadas de hoje so com extracao, sem modelo e sem teto` por dia
  UTC. A marca do dia fica em `<ORQ_RESOLVEDOR_DIR>/modelo-indisponivel`.
- Faltava um caso para isso funcionar de ponta a ponta, e o conserto está no `triar.ts:147`.
  Um ticket triado enquanto o `claude` estava fora grava `modelo: null`, e a assinatura não
  muda quando o `claude` volta. Sem o conserto, ele **nunca** ganharia o modelo. Agora o
  diagnóstico gravado sem modelo, quando o modelo cabia (nem firme, nem D0), é triado de
  novo **uma vez** quando a triagem tem modelo. Esse caso tem um vermelho próprio (abaixo).
- O teste do job da 7f-b2 ganhou um `claude` falso no PATH (`exit 99`), porque o
  `--dry-run` agora exige `claude`. Sem isso, o teste dependeria do `claude` real da máquina.

Testes com stub e `launchctl` falso. O instalador só rodou em `--dry-run` ou recusando
(`ORQ_TESTE=1`, sem `claude`).

### Vermelho (saída crua, `TZ=UTC npx vitest run test/orquestrador-resolvedor-job-claude.test.ts` contra `9ffd35b`)

```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f4

 ❯ test/orquestrador-resolvedor-job-claude.test.ts (4 tests | 3 failed) 790ms
   × peça 3: o claude no PATH do job > --dry-run: o PATH do plist tem o diretório do claude, depois do node 25ms
     → expected [ …(7) ] to deeply equal [ …(8) ]
   × peça 3: o claude no PATH do job > sem claude no PATH: recusa, com ou sem --dry-run, antes de escrever ou chamar launchctl 22ms
     → expected { rc: +0, …(1) } to deeply equal { rc: 1, stdout: '' }
   × peça 3: o claude no PATH do job > job.sh sem claude: uma linha MODELO_INDISPONIVEL por dia, passada só com extração, nada no teto 165ms
     → [orq resolver] triador: claude real recusado sob teste (defina ORQ_TRIADOR_CLAUDE com o stub)
: expected 1 to be +0 // Object.is equality
   ✓ peça 3: o claude no PATH do job > o claude volta: o 243 triado sem modelo é triado de novo com o modelo, uma vez 572ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-resolvedor-job-claude.test.ts > peça 3: o claude no PATH do job > --dry-run: o PATH do plist tem o diretório do claude, depois do node
AssertionError: expected [ …(7) ] to deeply equal [ …(8) ]

- Expected
+ Received

  Array [
    "/Users/lucasantos/.nvm/versions/node/v24.19.0/bin",
-   "/var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/resolvedor-claude-LT7R8Y/local-bin",
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ]

 ❯ test/orquestrador-resolvedor-job-claude.test.ts:70:30
     68|     expect(p.status, p.stderr).toBe(0)
     69|     const path = /<key>PATH<\/key>\s*<string>([^<]*)<\/string>/.exec(p…
     70|     expect(path?.split(':')).toEqual([NODE_DIR, comClaude, '/usr/local…
       |                              ^
     71|     expect(p.stderr).toContain(`# CLAUDE    = ${comClaude}/claude`)
     72|     expect(existsSync(join(home, 'Library'))).toBe(false)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  test/orquestrador-resolvedor-job-claude.test.ts > peça 3: o claude no PATH do job > sem claude no PATH: recusa, com ou sem --dry-run, antes de escrever ou chamar launchctl
AssertionError: expected { rc: +0, …(1) } to deeply equal { rc: 1, stdout: '' }

- Expected
+ Received

  Object {
-   "rc": 1,
-   "stdout": "",
+   "rc": 0,
+   "stdout": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
+ <!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
+ <!--
+   TEMPLATE - nao e um plist utilizavel. Os placeholders sao resolvidos por
+   scripts/orquestrador/resolvedor/instalar-job.sh (etapa 7f-b2, peca 8):
+
+     /Users/lucasantos/Projetos/_worktrees/kit-etapa7f4   raiz do checkout do KIT (o resolvedor roda do kit, sobre os
+                    repos do ~/.orq/repos.json; nunca de um repo instalado)
+     /Users/lucasantos/.nvm/versions/node/v24.19.0/bin   dirname do `which node` desta maquina
+     /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/resolvedor-claude-LT7R8Y/.orq   ~/.orq desta maquina (log do job em resolvedor/job.log)
+
+   Um job so por maquina (Label fixo com.orq.resolvedor): ele percorre todos os
+   repos, cada um no seu modo. A cada 300 s; o launchd nao sobrepoe duas
+   execucoes do mesmo job, e a passada ainda tem a trava global
+   (resolvedor/resolver.lock, O_EXCL). O interruptor ~/.orq/RESOLVEDOR_PAUSADO
+   para tudo: o job.sh sai antes de chamar o node.
+ -->
+ <plist version=\"1.0\">
+ <dict>
+   <key>Label</key>
+   <string>com.orq.resolvedor</string>
+
+   <key>ProgramArguments</key>
+   <array>
+     <string>/bin/bash</string>
+     <string>/Users/lucasantos/Projetos/_worktrees/kit-etapa7f4/scripts/orquestrador/resolvedor/job.sh</string>
+   </array>
+
+   <key>EnvironmentVariables</key>
+   <dict>
+     <key>PATH</key>
+     <string>/Users/lucasantos/.nvm/versions/node/v24.19.0/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
+   </dict>
+
+   <key>StartInterval</key>
+   <integer>300</integer>
+
+   <key>RunAtLoad</key>
+   <false/>
+
+   <key>StandardOutPath</key>
+   <string>/var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/resolvedor-claude-LT7R8Y/.orq/resolvedor/job.log</string>
+   <key>StandardErrorPath</key>
+   <string>/var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/resolvedor-claude-LT7R8Y/.orq/resolvedor/job.log</string>
+ </dict>
+ </plist>
+ ",
  }

 ❯ test/orquestrador-resolvedor-job-claude.test.ts:79:50
     77|     for (const a of [['--dry-run'], ['--permitir-tmp']]) {
     78|       const p = instalar(semClaudePath, ...a)
     79|       expect({ rc: p.status, stdout: p.stdout }).toEqual({ rc: 1, stdo…
       |                                                  ^
     80|       expect(p.stderr).toMatch(/ERRO: claude nao esta no PATH/)
     81|     }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  test/orquestrador-resolvedor-job-claude.test.ts > peça 3: o claude no PATH do job > job.sh sem claude: uma linha MODELO_INDISPONIVEL por dia, passada só com extração, nada no teto
AssertionError: [orq resolver] triador: claude real recusado sob teste (defina ORQ_TRIADOR_CLAUDE com o stub)
: expected 1 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 1

 ❯ test/orquestrador-resolvedor-job-claude.test.ts:88:34
     86|   it('job.sh sem claude: uma linha MODELO_INDISPONIVEL por dia, passad…
     87|     const p1 = job({ PATH: semClaudePath })
     88|     expect(p1.status, p1.stderr).toBe(0)
       |                                  ^
     89|     expect(p1.stdout.match(/MODELO_INDISPONIVEL/g)).toHaveLength(1)
     90|     expect(p1.stdout).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ MODELO…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯

 Test Files  1 failed (1)
      Tests  3 failed | 1 passed (4)
   Start at  16:15:15
   Duration  973ms (transform 23ms, setup 0ms, collect 25ms, tests 790ms, environment 0ms, prepare 35ms)
```

No vermelho acima, "o claude volta" passou à toa: o job sem `claude` tinha quebrado antes
(`claude real recusado sob teste`), e o 243 nunca chegou a ser gravado sem modelo. Este é o
vermelho próprio dele: o motor da peça 3 com o `triar.ts` de `9ffd35b`, rodado e depois
restaurado.

```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f4

 ❯ test/orquestrador-resolvedor-job-claude.test.ts (4 tests | 1 failed) 712ms
   ✓ peça 3: o claude no PATH do job > job.sh sem claude: uma linha MODELO_INDISPONIVEL por dia, passada só com extração, nada no teto 492ms
   × peça 3: o claude no PATH do job > o claude volta: o 243 triado sem modelo é triado de novo com o modelo, uma vez 158ms
     → expected +0 to be 1 // Object.is equality

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-resolvedor-job-claude.test.ts > peça 3: o claude no PATH do job > o claude volta: o 243 triado sem modelo é triado de novo com o modelo, uma vez
AssertionError: expected +0 to be 1 // Object.is equality

- Expected
+ Received

- 1
+ 0

 ❯ test/orquestrador-resolvedor-job-claude.test.ts:107:24
    105|     expect(p.status, p.stderr).toBe(0)
    106|     expect(p.stdout).not.toMatch(/MODELO_INDISPONIVEL/)
    107|     expect(chamadas()).toBe(1)
       |                        ^
    108|     expect(modelo243()).toMatchObject({ modelo: 'claude-opus-5-5', cus…
    109|     expect(job(env).status).toBe(0)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
   Start at  16:16:07
   Duration  865ms (transform 20ms, setup 0ms, collect 23ms, tests 712ms, environment 0ms, prepare 21ms)
```

### Verde (as suítes do triador e do resolvedor, em `643194d`, rc 0)

```
 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 139ms
 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 424ms
 ✓ test/orquestrador-resolvedor-passada.test.ts (5 tests) 1307ms
   ✓ peça 2: a passada > --dry-run: o repo intocado, sem ledger, e o que faria em dry-run.jsonl 554ms
   ✓ peça 2: a passada > orq resolver --repo X --dry-run pela linha de comando 645ms
 ✓ test/orquestrador-triador-custo-real.test.ts (7 tests) 1510ms
   ✓ peça 3: custo real sempre > chamada que começou e não devolveu custo (timeout) fica com o pior caso, marcada; não é reserva esquecida 1012ms
 ✓ test/orquestrador-triador-sem-tentativa.test.ts (3 tests) 102ms
 ✓ test/orquestrador-resolvedor-fatia-auto.test.ts (2 tests) 510ms
   ✓ peça 2: fatia do teto para auto (teto_reserva_auto) > o diagnostico triado de novo a cada passada não come o teto do bloqueio em auto que aparece depois (padrão 0.7) 506ms
 ✓ test/orquestrador-resolvedor-job-claude.test.ts (4 tests) 1999ms
   ✓ peça 3: o claude no PATH do job > job.sh sem claude: uma linha MODELO_INDISPONIVEL por dia, passada só com extração, nada no teto 948ms
   ✓ peça 3: o claude no PATH do job > o claude volta: o 243 triado sem modelo é triado de novo com o modelo, uma vez 974ms
 ✓ test/orquestrador-resolvedor-prioridade.test.ts (2 tests) 128ms
 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 45ms
 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 3816ms
 ✓ test/orquestrador-triador-aceite.test.ts (12 tests) 4526ms
 ✓ test/orquestrador-resolvedor-job.test.ts (4 tests) 601ms
 ✓ test/orquestrador-triador-assinatura-estavel.test.ts (5 tests) 66ms
 ✓ test/orquestrador-resolvedor-gabarito.test.ts (8 tests) 3447ms
 ✓ test/orquestrador-triador-modelo.test.ts (13 tests) 5457ms
 ✓ test/orquestrador-resolvedor-promocao.test.ts (8 tests) 5519ms
 ✓ test/orquestrador-resolvedor-r2.test.ts (5 tests) 4209ms
 ✓ test/orquestrador-resolvedor-desfazer.test.ts (4 tests) 3734ms
 ✓ test/orquestrador-resolvedor-ledger.test.ts (9 tests) 6921ms
 ✓ test/orquestrador-resolvedor-acoes.test.ts (12 tests) 10587ms
   ✓ peça 3: ações R1 e R5 com as travas > segunda passada no mesmo ticket não age de novo; bloqueado outra vez vai para humano 1145ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando ele espera, e age quando o git sai 1718ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando além do teto ele desiste sem escrever (processo e index.lock) 4910ms
   ✓ peça 3: ações R1 e R5 com as travas > o commit tem só o arquivo do ticket e o trailer; o resto do índice fica 397ms
   ✓ peça 3: ações R1 e R5 com as travas > o hook do repo roda (nunca --no-verify) e, se recusa, o arquivo volta 552ms
   ✓ peça 3: ações R1 e R5 com as travas > nenhuma escrita fora de docs/fila do ticket bloqueado 368ms
   ✓ peça 3: ações R1 e R5 com as travas > R5 máquina (801, D4): só reabre com a máquina livre 344ms
 Test Files  20 passed (20)
      Tests  130 passed (130)
```

### `instalar-job.sh --dry-run` nesta máquina (em `66346fe`, rc 0; o plist instalado não foi tocado)

```
# --dry-run: nada e escrito, nada e carregado.
# LABEL     = com.orq.resolvedor (a cada 300 s)
# CHECKOUT  = /Users/lucasantos/Projetos/_worktrees/kit-etapa7f4
# NODE_DIR  = /Users/lucasantos/.nvm/versions/node/v24.19.0/bin  (v24.19.0)
# CLAUDE    = /Users/lucasantos/.local/bin/claude
# log       = /Users/lucasantos/.orq/resolvedor/job.log
# gravaria em /Users/lucasantos/Library/LaunchAgents/com.orq.resolvedor.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!--
  TEMPLATE - nao e um plist utilizavel. Os placeholders sao resolvidos por
  scripts/orquestrador/resolvedor/instalar-job.sh (etapa 7f-b2, peca 8):

    /Users/lucasantos/Projetos/_worktrees/kit-etapa7f4   raiz do checkout do KIT (o resolvedor roda do kit, sobre os
                   repos do ~/.orq/repos.json; nunca de um repo instalado)
    /Users/lucasantos/.nvm/versions/node/v24.19.0/bin   dirname do `which node` desta maquina
    /Users/lucasantos/.local/bin dirname do `command -v claude` desta maquina (7f-b4), depois
                   do node; sem claude, o instalar-job.sh recusa
    /Users/lucasantos/.orq   ~/.orq desta maquina (log do job em resolvedor/job.log)

  Um job so por maquina (Label fixo com.orq.resolvedor): ele percorre todos os
  repos, cada um no seu modo. A cada 300 s; o launchd nao sobrepoe duas
  execucoes do mesmo job, e a passada ainda tem a trava global
  (resolvedor/resolver.lock, O_EXCL). O interruptor ~/.orq/RESOLVEDOR_PAUSADO
  para tudo: o job.sh sai antes de chamar o node.
-->
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.orq.resolvedor</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/lucasantos/Projetos/_worktrees/kit-etapa7f4/scripts/orquestrador/resolvedor/job.sh</string>
  </array>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/Users/lucasantos/.nvm/versions/node/v24.19.0/bin:/Users/lucasantos/.local/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>

  <key>StartInterval</key>
  <integer>300</integer>

  <key>RunAtLoad</key>
  <false/>

  <key>StandardOutPath</key>
  <string>/Users/lucasantos/.orq/resolvedor/job.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/lucasantos/.orq/resolvedor/job.log</string>
</dict>
</plist>
```

O PATH novo: `/Users/lucasantos/.nvm/versions/node/v24.19.0/bin:**/Users/lucasantos/.local/bin**:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`.
O plist instalado hoje continua com
`/Users/lucasantos/.nvm/versions/node/v24.19.0/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`.
O `CHECKOUT` acima é esta worktree. Quem instala é o humano, do checkout principal, depois do merge.

## Peça 4 · docs (`66346fe`)

- CONTRATO: §16 (16.1 assinatura, 16.2 fatia, 16.3 claude no PATH, 16.4 testes), mais
  §13.4 (a regra da assinatura) e §14.7 (o job).
- CHANGELOG: a seção da 7f-b4, com as duas asserções que mudaram de forma.
- PECAS: a 7f-b4 entrou em FEITAS. As três pendentes da 7f-b3 que ela resolve saíram (o
  arquivo é backlog). Entraram três pendentes: reinstalar o job (humano); `pulado:
  teto_dia` nunca volta ao modelo; a numeração de tentativa no leitor do kit.
- Docs não têm vermelho.

## Estimativa de gasto por dia com o modelo ligado (bloqueios reais de 25/09 a 11/10)

Fontes, só leitura:

- `events.log` do conteudos-infinitos e do actus-saas (linhas `BLOQUEADO`);
- `local-loop.log` do Comarka, com as datas tiradas das próprias linhas (31 linhas
  `ticket N: BLOQUEADO` na janela);
- os 38 casos da fixture `triador-7f`: os 37 (de `L55054`, 25/09, a `L85272`) e o 1006. Eles
  são os bloqueios do Comarka da janela, com a extração do motor atual (a matriz) e o custo
  real gravado na corrida da peça 6.

Custo por chamada: o replay da corrida dá US$ 5,8840 em 21 chamadas, US$ 0,28 em média. 15
delas têm custo gravado (US$ 3,8952). As 6 cortadas pelo CLI ficam com (5,8840 − 3,8952)/6 =
US$ 0,33. O pior caso é o corte, US$ 0,60.

**Comarka** (R1 e R5 em auto, então "repo em auto": usa o teto inteiro de US$ 5,00). Um
bloqueio firme (D6, D6b, D1, D2, D4, D5) não chama. Palpite e sem regra chamam uma vez por
assinatura.

| dia | bloqueios | vão ao modelo | estimado | pior caso (corte) |
|---|---|---|---|---|
| 25/09 | 8 | 7 | US$ 1,97 | US$ 4,20 |
| 26/09 | 1 | 1 | 0,29 | 0,60 |
| 29/09 | 1 | 1 | 0,29 | 0,60 |
| 30/09 | 2 | 1 | 0,18 | 0,60 |
| 01/10 | 3 | 1 | 0,33 | 0,60 |
| 02/10 | 3 | 1 | 0,26 | 0,60 |
| 03/10 | 2 | 1 | 0,24 | 0,60 |
| 05/10 | 2 | 0 | 0 | 0 |
| 06/10 | 1 | 0 | 0 | 0 |
| 07/10 | 5 | 4 | 1,17 | 2,40 |
| 08/10 | 6 | 4 | 1,16 | 2,40 |
| 09/10 | 3 | 0 | 0 | 0 |
| 11/10 | 1 (1006, D6b) | 0 | 0 | 0 |
| **17 dias** | **38** | **21** | **US$ 5,88 (média US$ 0,35/dia)** | **US$ 12,60 (média US$ 0,74/dia)** |

Nenhum dia passa do teto de US$ 5,00, nem no pior caso: o maior é 25/09, com US$ 4,20.

**conteudos-infinitos e actus-saas** (diagnostico, na fatia de 30%: até US$ 1,50 por dia
juntos). Nenhum `BLOQUEADO` nos `events.log` entre 25/09 e 11/10: o último do conteudos é
de 22/09 (269, 270) e o último do Actus é de 23/09 (510c). Os 7 bloqueados do Actus são
humanos e sem tentativa (D0: não chamam). Sobra **uma chamada, uma vez**: o 243 muda de
assinatura no merge (a fórmula nova) e é triado de novo, cerca de US$ 0,28 (no máximo
US$ 0,60). Depois disso, com a assinatura estável, nada até um bloqueio novo. Sem a peça 1
seriam 48 assinaturas por dia, ou seja até 48 chamadas, cortadas pelo teto em ~5 e US$ 3,00
por dia (pior caso).

**Total esperado:** cerca de US$ 0,35 por dia em média, e cerca de US$ 2,00 num dia como 25/09.
O teto do dia (US$ 5,00) e a fatia (US$ 1,50 para os repos fora de auto) só apertam em dia
atípico.

Atenção: o `~/.orq/diagnosticos/custo.json` ainda tem as 8 entradas nulas de 11/10 (US$
4,80 contados). A proposta de correção da 7f-b3 não foi aplicada. Instalar hoje (11/10 UTC)
deixaria o Comarka em `teto_dia` (4,80 + 0,60 > 5,00) e os outros em `teto_reserva_auto` até
00:00 UTC. A partir de 12/10 o dia começa zerado.

## Suítes, uma de cada vez, em `66346fe`

1. `npx tsc --noEmit`: **rc 0**, sem saída.
2. `TZ=UTC npx vitest run`: **rc 0**

```

 Test Files  86 passed (86)
      Tests  1522 passed (1522)
   Start at  16:18:51
   Duration  44.42s (transform 978ms, setup 0ms, collect 17.91s, tests 311.45s, environment 10ms, prepare 3.14s)
```

3. `bash scripts/kit/test-shell.sh`: **rc 0**

```

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
  rc=0  test-fixture-gates.sh (kit)
TODOS OS SCRIPTS SAÍRAM rc 0
```

## O que muda depois do merge (para o humano saber o que esperar)

- Todo diagnóstico existente muda de assinatura uma vez (a fórmula nova) e é triado de novo.
  Com o modelo, só o 243 chama (os 7 do Actus são D0).
- O job instalado continua **sem** `claude` no PATH até o humano reinstalar com o
  `instalar-job.sh` do checkout principal. O plist instalado roda
  `/Users/lucasantos/Projetos/orquestrador-kit/scripts/orquestrador/resolvedor/job.sh`, que
  é o `job.sh` do checkout principal. Então, logo depois do merge e antes de reinstalar, o
  job já usa o `job.sh` novo: escreve `MODELO_INDISPONIVEL` no job.log uma vez por dia e
  roda `--sem-modelo` (como hoje, sem chamada; agora também sem tentar chamar).
- Reinstalar liga o gasto real (estimativa acima). Isso é decisão do humano e está em
  PECAS/PENDENTES.
- Para mudar a fatia: `"teto_reserva_auto": <0..1>` no topo do `~/.orq/repos.json`.

## Diff cru (`git diff 3d4f19c..66346fe`)

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 798e18a..79b1208 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -997,3 +997,28 @@ certo: firmes no instante do bloqueio 13 → 14; (B) os firmes certos 15 → 16
 do 346d, US$ 0,2424); evidência equivalente sobre 7 casos (o 346d saiu da lista, agora
 certo pela medição; o total segue 28); `orq triar --fixture` grava 21
 `resposta-modelo.json` (eram 22). Nenhuma perdeu força.
+
+### Etapa 7f-b4 · ligar o modelo do triador com segurança (11/10/2026)
+
+Antes de pôr o `claude` no PATH do job: a assinatura do 243 mudava a cada drenagem do
+loop (o stat do `events.log` inteiro), e repos em diagnóstico ainda podiam esgotar o teto
+entre passadas. Sem chamada de API, sem launchctl, sem escrita em repo real nem em `~/.orq`.
+CONTRATO §16.
+
+- **7f-b4-1** `a58f71f`: assinatura estável: o arquivo lido em recorte (`events.log`,
+  `local-loop.log`) entra pelas faixas e pelo sha do recorte, não pelo stat do arquivo.
+  Matriz e gabaritos iguais.
+- **7f-b4-2** `9ffd35b`: fatia do teto para auto: `teto_reserva_auto` no topo do
+  repos.json (padrão 0.7); repos fora de auto, juntos, gastam até 30% do teto do dia
+  (`pulado: teto_reserva_auto`).
+- **7f-b4-3** `643194d`: `instalar-job.sh` põe o diretório do `claude` no PATH do plist
+  (depois do node) e recusa sem ele; `job.sh` sem `claude`: `MODELO_INDISPONIVEL` uma vez
+  por dia e passada `--sem-modelo`; diagnóstico gravado sem modelo é triado de novo, uma
+  vez, quando o modelo volta.
+- **7f-b4-4**: CONTRATO §16 (e §13.4, §14.7), este registro e `docs/PECAS.md` com os shas.
+
+Asserções existentes que mudaram: (7f-b4-1) o replay da corrida da peça 6 confere a
+assinatura gravada na fixture pela fórmula da corrida (`assinaturaDaCorrida`, no teste),
+não pela do motor; continua exigindo as 21 respostas da mesma evidência. (7f-b4-3) o teste
+do job da 7f-b2 põe um `claude` falso (que reprova se rodar) no PATH, porque o `--dry-run`
+agora o exige. Nenhuma perdeu força.
diff --git a/CONTRATO.md b/CONTRATO.md
index b2f7b63..c251bd0 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -1104,9 +1104,11 @@ Regras duras:
   dentro de um repo lança no construtor.
 - **Git** (`git.ts:24`): só `gitLeitura`, com `GIT_OPTIONAL_LOCKS=0`; verbos `show`, `log`,
   `rev-parse`, `ls-tree`, `status --porcelain`; outro verbo lança antes de existir processo.
-- **Assinatura** (`saida.ts:146`): sha256 de repo, id, status, nota e nome/mtime/tamanho de
-  cada arquivo lido. Mesma assinatura: não roda (só `--forcar`). Assinatura nova: o
-  anterior vai para o histórico.
+- **Assinatura** (`saida.ts:152`): sha256 de repo, id, status, nota e nome/mtime/tamanho de
+  cada arquivo lido; o arquivo lido em recorte (a trilha) entra pelas faixas e pelo
+  conteúdo recortado, não pelo stat (7f-b4, §16.1). Mesma assinatura: não roda (só
+  `--forcar`, ou o diagnóstico gravado sem modelo quando o modelo volta, §16.3).
+  Assinatura nova: o anterior vai para o histórico.
 - **Passada** (`--passada`, `triar.ts:133`): sem modelo; só diagnósticos de até 6 h com
   classe em palpite; grava só se a extração ficou firme (promove).
 - Ticket que saiu de `bloqueado`: o diagnóstico fica, com `encerrado_em` (`triarRepo`, `:203`).
@@ -1353,7 +1355,8 @@ Job (`instalar-job.sh`, `com.orq.resolvedor.plist.template`, `job.sh`): label
 interruptor antes de chamar o node e roda `orq resolver` (trava global na passada); log em
 `~/.orq/resolvedor/job.log`. `--dry-run` só imprime o plist; com `ORQ_TESTE=1` ou de
 checkout sob `/tmp`, só o `--dry-run` roda. Quem instala é o humano, do checkout principal
-do kit.
+do kit. Desde a 7f-b4, o PATH do plist tem o diretório do `claude`, e o job sem ele
+segue só com extração (§16.3).
 
 ### 14.8 Testes
 
@@ -1440,6 +1443,78 @@ só com gasto real), `orquestrador-resolvedor-prioridade.test.ts` (com US$ 4,30
 o Comarka em auto chama e o Actus em diagnostico, listado antes, fica pulado) e
 `orquestrador-resolvedor-passada.test.ts` (D6b decide `r1_allowlist`).
 
+## 16. Etapa 7f-b4: ligar o modelo do triador com segurança (11/10/2026)
+
+O job de 11/10 nunca chamou o modelo: o `claude` (em `~/.local/bin`) estava fora do PATH
+do plist (§15). Antes de pô-lo no PATH, dois defeitos que o modelo ligado tornaria pagos
+(relatório: `~/orq-sessoes/relatorio-kit-etapa7f-b4.md`):
+
+- o 243 do conteudos-infinitos ganhou 24 assinaturas em 11/10, uma a cada ~30 min, sem
+  tentativa nova: a assinatura levava o stat do `runs/events.log` inteiro, e o loop do
+  repo acrescenta 3 linhas a cada drenagem (`--- DRENAGEM_INICIO`, `--- OCIOSO …
+  244=dependencia:243:bloqueado`, `--- DRENAGEM_FIM`). A cópia da evidência das 24 é
+  igual byte a byte;
+- a prioridade da 7f-b3 (§15.4) vale dentro de uma passada: repos em diagnostico com
+  bloqueio novo em passadas anteriores ainda esgotam o teto antes de um bloqueio em auto.
+
+### 16.1 Assinatura estável (`assinatura`, `saida.ts:152`)
+
+A assinatura só muda quando muda algo do próprio ticket: o arquivo do ticket, os
+artefatos das tentativas dele (stat), a trilha DELE e o motivo do bloqueio. O arquivo lido
+em recorte (`Lido.faixas`: o `events.log` do kit, o `local-loop.log` do legado, que são de
+todos os tickets) entra como `arquivo | recorte | faixas | sha256(conteúdo recortado)`,
+nunca pelo mtime e tamanho do arquivo inteiro. Os arquivos inteiros seguem pelo stat.
+Gabaritos e a matriz da 7f-b3 iguais (63 linhas, `diff` vazio). A guarda do replay da
+corrida da peça 6 (resposta gravada da mesma evidência) confere pela fórmula da corrida.
+
+Efeito único no merge: todo diagnóstico existente muda de assinatura uma vez (fórmula
+nova) e é triado de novo; com o modelo, só o que não é firme nem D0 chama.
+
+### 16.2 Fatia do teto para auto (`teto_reserva_auto`; `passoModelo`, `passada.ts:117`)
+
+Chave nova no topo do `~/.orq/repos.json`: `teto_reserva_auto`, de 0 a 1, padrão **0.7**
+(ausente ou fora de 0..1: 0.7; `lerTetoReservaAuto`, `modos.ts:73`). Repo em auto
+(`emAuto`, `passada.ts:84`: alguma classe, ou o padrão, em `auto`) usa o teto do dia
+inteiro. Repo fora de auto (sombra e diagnostico) confere também a fatia
+(`criarPassoModelo`, `modelo.ts:471`):
+
+    gasto do dia dos repos fora de auto + corte ≤ (1 − teto_reserva_auto) × teto do dia
+
+Os "repos fora de auto" são os do ledger cujo `repo` não é nome de repo em auto no
+repos.json (sombra, diagnostico, e o que não está listado). Passando: `modelo: {pulado:
+"teto_reserva_auto"}`, sem reserva, vale a extração. Com o teto padrão do resolvedor
+(US$ 5,00), sombra e diagnostico juntos gastam até US$ 1,50 por dia; os US$ 3,50 restantes
+só os repos em auto alcançam. Com `--repo X`, os repos em auto são os do repos.json
+inteiro (a fatia é do dia, não da passada).
+
+### 16.3 O `claude` no PATH do job (`instalar-job.sh`, `job.sh`, `triar.ts:147`)
+
+- `instalar-job.sh` acha `command -v claude` e põe o diretório (o do link, não o alvo
+  versionado, que muda a cada atualização) no PATH do plist, **depois** do `NODE_DIR`
+  (o `~/.local/bin` também tem um `node`). Placeholder novo no template: `{{CLAUDE_DIR}}`.
+  Sem `claude` no PATH, recusa com `ERRO: claude nao esta no PATH`, rc 1, com ou sem
+  `--dry-run`, antes de escrever ou chamar `launchctl`.
+- `job.sh`: sem o `claude` (ou o `ORQ_TRIADOR_CLAUDE`), a passada roda com
+  `--sem-modelo` (nem chamada, nem reserva no teto), e o job.log ganha UMA linha
+  `<ts> MODELO_INDISPONIVEL claude fora do PATH (<PATH>): …` por dia UTC; a marca do dia
+  fica em `<resolvedor>/modelo-indisponivel`.
+- `triarTicket`: diagnóstico gravado com `modelo: null` (sem modelo) quando o modelo
+  cabia (nem firme, nem D0) é triado de novo, uma vez, quando a triagem tem modelo, mesmo
+  com a mesma assinatura. Sem isso, o ticket triado com o `claude` fora do PATH nunca
+  ganharia o modelo.
+
+### 16.4 Testes
+
+`orquestrador-triador-assinatura-estavel.test.ts` (o 243 com duas drenagens ociosas: a
+mesma assinatura; o ticket, uma tentativa nova, o motivo do bloqueio e um artefato
+reescrito mudam), `orquestrador-resolvedor-fatia-auto.test.ts` (18 passadas de um repo em
+diagnostico com assinatura nova a cada uma; o bloqueio do Comarka em auto que aparece
+depois chama; o diagnostico parou em US$ 1,00 de US$ 1,50 com `teto_reserva_auto`; a
+leitura da chave), `orquestrador-resolvedor-job-claude.test.ts` (`--dry-run` com o PATH
+novo; recusa sem claude; job sem claude: uma linha por dia, nada no teto; o claude volta e
+o 243 é triado de novo, uma vez) e `orquestrador-resolvedor-job.test.ts` (um `claude`
+falso no PATH do teste: o `--dry-run` agora o exige).
+
 ## 10. Divergências conhecidas
 
 O que este contrato **não** descreve como gostaria, e a peça que fecha cada uma.
diff --git a/docs/PECAS.md b/docs/PECAS.md
index 4ff90eb..346655e 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -996,30 +996,43 @@
   *Teste:* `orquestrador-triador-aceite.test.ts` (primeiro-dia), `-sem-tentativa`,
   `-custo-real`, `orquestrador-resolvedor-prioridade.test.ts`.
 
+- **Etapa 7f-b4 · ligar o modelo do triador com segurança** (11/10/2026). Assinatura
+  estável (o log em recorte entra pelo recorte, não pelo stat: o 243 deixa de mudar a cada
+  drenagem); fatia do teto para auto (`teto_reserva_auto`, padrão 0.7: sombra e
+  diagnóstico juntos até 30% do teto do dia); o `claude` no PATH do plist (o instalador
+  recusa sem ele; o job sem ele segue só com extração e avisa uma vez por dia). Commits
+  `a58f71f` (assinatura), `9ffd35b` (fatia), `643194d` (claude no PATH).
+  *Evidência:* `~/.orq/diagnosticos/conteudos-infinitos/243/` (24 assinaturas, cópias
+  iguais), `~/Projetos/conteudos-infinitos/docs/fila/runs/events.log` (as drenagens
+  ociosas), `which claude` e `~/orq-sessoes/relatorio-kit-etapa7f-b4.md`.
+  *Teste:* `orquestrador-triador-assinatura-estavel.test.ts`,
+  `orquestrador-resolvedor-fatia-auto.test.ts`, `orquestrador-resolvedor-job-claude.test.ts`.
+
 ## PENDENTES
 
-- **7f-b3 · o `claude` no PATH do job (humano).** O plist instalado tem
-  `PATH={{NODE_DIR}}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`, e o
-  `claude` está em `~/.local/bin`: toda chamada do modelo pelo job sai `nao_iniciou`
-  (depois da 7f-b3, sem custo e sem teto; antes, US$ 0,60 de teto cada). Pôr o diretório
-  do `claude` no template (ou `ORQ_TRIADOR_CLAUDE` no plist) e reinstalar é decisão do
-  chat do programa: liga o gasto real do job.
-  *Evidência:* `~/Library/LaunchAgents/com.orq.resolvedor.plist`, `which claude`, rc 127
-  e 0 a 1 ms nos 8 diagnósticos de 11/10.
-  *Teste:* `orquestrador-resolvedor-job.test.ts` com o PATH do plist contendo o diretório.
-- **7f-b3 · o teto entre passadas.** A prioridade da 7f-b3 vale dentro de uma passada:
-  repos em diagnóstico que gastam numa passada sem bloqueio do Comarka ainda podem esgotar
-  o teto antes do próximo bloqueio em auto. Uma fatia do teto reservada para auto é
-  decisão do chat do programa.
-  *Evidência:* CONTRATO §15.4.
-- **7f-b3 · assinatura do 243 muda a cada 30 min.** Em 11/10 o diagnóstico do 243
-  (conteudos-infinitos) ganhou 23 assinaturas novas, uma a cada passada de 30 min, sem
-  tentativa nova: cada uma é uma triagem nova (e, com o modelo no PATH, uma chamada nova).
-  Achar o arquivo lido cujo mtime/tamanho muda (provável: o recorte do `events.log`).
-  *Evidência:* `~/.orq/diagnosticos/conteudos-infinitos/243/historico/` (23 arquivos de
-  04:09 a 14:40 UTC).
-  *Teste:* duas leituras do mesmo repo com só o `events.log` crescendo em outros ids dão a
-  mesma assinatura.
+- **7f-b4 · reinstalar o job com o `claude` no PATH (humano).** Depois do merge, do
+  checkout principal: `bash scripts/orquestrador/resolvedor/instalar-job.sh --dry-run`
+  (conferir o PATH com `~/.local/bin` depois do node) e sem `--dry-run`. Liga o gasto real:
+  estimativa no relatório da 7f-b4 (média ~US$ 0,35/dia, pico ~US$ 2,00, só o Comarka nos
+  dados de 25/09 a 11/10). Se for no mesmo dia UTC das 8 entradas nulas de 11/10 no
+  `custo.json`, elas ainda contam US$ 4,80 (a proposta de correção da 7f-b3 segue aberta).
+  *Evidência:* `~/Library/LaunchAgents/com.orq.resolvedor.plist` (PATH sem `~/.local/bin`).
+  *Teste:* `orquestrador-resolvedor-job-claude.test.ts`.
+- **7f-b4 · `pulado: teto_dia` nunca volta ao modelo.** Diagnóstico pulado pelo teto (do
+  dia ou da fatia) tem a mesma assinatura no dia seguinte e não é triado de novo: o ticket
+  fica sem o modelo até mudar. A 7f-b4 só refaz o gravado com `modelo: null`. Refazer o
+  pulado no dia seguinte é decisão do chat do programa (é gasto).
+  *Evidência:* `triar.ts:147` (`semModeloAntes`), `~/.orq/diagnosticos/conteudos-infinitos/243.json`
+  (`pulado: teto_dia`).
+  *Teste:* diagnóstico com `pulado: teto_dia` ontem, teto livre hoje: chama uma vez.
+- **7f-b4 · o leitor do kit numera a tentativa pelo `attempt=` do INICIO.** No 243, o
+  `INICIO attempt=1` aparece duas vezes (a 1ª volta e a refatiada): o leitor lê
+  `attempt-0` duas vezes e nunca o `attempt-3` (a tentativa do bloqueio). Achado no PASSO 0
+  da 7f-b4, não mexido.
+  *Evidência:* `~/Projetos/conteudos-infinitos/docs/fila/runs/events.log` (as linhas do
+  243), `leitor-kit.ts:140` (`dirRel` por `attempt - 1`).
+  *Teste:* o 243 da fixture com os 4 INICIO: as tentativas lidas são `attempt-0..3`, uma
+  vez cada.
 
 - **7f-b1b · mini-corrida paga do R3.** `~/orq-sessoes/corrida-7f-r3.cmd` (9 casos: os 5 R3 e
   os 6 cortados no teto, prompt `7f-b1b-r3`, teto US$ 5,40), depois do merge da 7f-b1b; as
diff --git a/scripts/orquestrador/resolvedor/com.orq.resolvedor.plist.template b/scripts/orquestrador/resolvedor/com.orq.resolvedor.plist.template
index 0efc713..afc4df5 100644
--- a/scripts/orquestrador/resolvedor/com.orq.resolvedor.plist.template
+++ b/scripts/orquestrador/resolvedor/com.orq.resolvedor.plist.template
@@ -7,6 +7,8 @@
     {{CHECKOUT}}   raiz do checkout do KIT (o resolvedor roda do kit, sobre os
                    repos do ~/.orq/repos.json; nunca de um repo instalado)
     {{NODE_DIR}}   dirname do `which node` desta maquina
+    {{CLAUDE_DIR}} dirname do `command -v claude` desta maquina (7f-b4), depois
+                   do node; sem claude, o instalar-job.sh recusa
     {{ORQ_HOME}}   ~/.orq desta maquina (log do job em resolvedor/job.log)
 
   Um job so por maquina (Label fixo com.orq.resolvedor): ele percorre todos os
@@ -29,7 +31,7 @@
   <key>EnvironmentVariables</key>
   <dict>
     <key>PATH</key>
-    <string>{{NODE_DIR}}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
+    <string>{{NODE_DIR}}:{{CLAUDE_DIR}}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
   </dict>
 
   <key>StartInterval</key>
diff --git a/scripts/orquestrador/resolvedor/instalar-job.sh b/scripts/orquestrador/resolvedor/instalar-job.sh
index d5ca928..b7e0de4 100755
--- a/scripts/orquestrador/resolvedor/instalar-job.sh
+++ b/scripts/orquestrador/resolvedor/instalar-job.sh
@@ -39,10 +39,21 @@ DST="$HOME/Library/LaunchAgents/$LABEL.plist"
 command -v node >/dev/null 2>&1 || { echo "ERRO: node nao esta no PATH desta maquina." >&2; exit 1; }
 NODE_BIN="$(command -v node)"
 NODE_DIR="$(cd "$(dirname "$NODE_BIN")" && pwd)"
+# O `claude` do modelo do triador (7f-b4): sem ele no PATH do job, toda chamada
+# sai `nao_iniciou` (11/10). O diretório entra no PATH do plist DEPOIS do node
+# (o ~/.local/bin também tem um `node`); é o do link (`command -v`), não o alvo
+# versionado, que muda a cada atualização do claude. Sem claude, nem --dry-run.
+CLAUDE_BIN="$(command -v claude 2>/dev/null || true)"
+if [ -z "$CLAUDE_BIN" ]; then
+  echo "ERRO: claude nao esta no PATH desta maquina — RECUSO instalar o job (o modelo do triador nunca rodaria)." >&2
+  exit 1
+fi
+CLAUDE_DIR="$(cd "$(dirname "$CLAUDE_BIN")" && pwd)"
 
 renderiza() {
   sed -e "s|{{CHECKOUT}}|$CHECKOUT|g" \
       -e "s|{{NODE_DIR}}|$NODE_DIR|g" \
+      -e "s|{{CLAUDE_DIR}}|$CLAUDE_DIR|g" \
       -e "s|{{ORQ_HOME}}|$ORQ_HOME|g" \
       "$TEMPLATE"
 }
@@ -68,6 +79,7 @@ if [ "$DRY" = 1 ]; then
   echo "# LABEL     = $LABEL (a cada 300 s)" >&2
   echo "# CHECKOUT  = $CHECKOUT" >&2
   echo "# NODE_DIR  = $NODE_DIR  ($("$NODE_BIN" -v))" >&2
+  echo "# CLAUDE    = $CLAUDE_DIR/claude" >&2
   echo "# log       = $ORQ_HOME/resolvedor/job.log" >&2
   echo "# gravaria em $DST" >&2
   renderiza
diff --git a/scripts/orquestrador/resolvedor/job.sh b/scripts/orquestrador/resolvedor/job.sh
index a7322fe..51094cb 100755
--- a/scripts/orquestrador/resolvedor/job.sh
+++ b/scripts/orquestrador/resolvedor/job.sh
@@ -17,5 +17,23 @@ if [ -e "$PAUSADO" ]; then
 fi
 
 KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
+
+# Sem o `claude` (7f-b4): a passada segue só com extração (--sem-modelo: nem
+# chamada, nem reserva no teto), e o job.log ganha UMA linha
+# MODELO_INDISPONIVEL por dia (UTC, o dia do teto); a marca do dia fica em
+# <resolvedor>/modelo-indisponivel.
+CLAUDE="${ORQ_TRIADOR_CLAUDE:-claude}"
+SEM_MODELO=()
+if ! command -v "$CLAUDE" >/dev/null 2>&1; then
+  SEM_MODELO=(--sem-modelo)
+  DIR_RES="${ORQ_RESOLVEDOR_DIR:-$HOME/.orq/resolvedor}"
+  hoje="$(date -u +%Y-%m-%d)"
+  if [ "$(cat "$DIR_RES/modelo-indisponivel" 2>/dev/null || true)" != "$hoje" ]; then
+    printf '%s MODELO_INDISPONIVEL %s fora do PATH (%s): passadas de hoje so com extracao, sem modelo e sem teto\n' "$(agora)" "$CLAUDE" "$PATH"
+    mkdir -p "$DIR_RES"
+    printf '%s\n' "$hoje" > "$DIR_RES/modelo-indisponivel"
+  fi
+fi
+
 printf '%s passada\n' "$(agora)"
-bash "$KIT/scripts/orq" resolver "$@"
+bash "$KIT/scripts/orq" resolver ${SEM_MODELO[@]+"${SEM_MODELO[@]}"} "$@"
diff --git a/scripts/orquestrador/resolvedor/modos.ts b/scripts/orquestrador/resolvedor/modos.ts
index 1767209..41ed987 100644
--- a/scripts/orquestrador/resolvedor/modos.ts
+++ b/scripts/orquestrador/resolvedor/modos.ts
@@ -11,6 +11,8 @@
  *   sombra       tria e grava a PROPOSTA em ~/.orq/resolvedor; nunca toca o repo
  *   auto         tria e aplica a ação da classe no ticket (com as travas de acoes.ts)
  *
+ * No topo do repos.json, `teto_reserva_auto` (7f-b4, `lerTetoReservaAuto`).
+ *
  * O nome e o caminho saem de `lerRepos` (triador/saida.ts), a mesma leitura do
  * painel; este arquivo só acrescenta o campo. A promoção e o rebaixamento
  * (peça 6) regravam o campo com `gravarModo`.
@@ -60,6 +62,23 @@ function itensCrus(): unknown[] {
   }
 }
 
+/**
+ * A fatia do teto do dia do modelo guardada para os repos em auto (7f-b4):
+ * `teto_reserva_auto`, no topo do repos.json, de 0 a 1 (padrão 0.7). Os repos
+ * sem classe em auto (sombra e diagnostico, juntos) só gastam até
+ * (1 − teto_reserva_auto) do teto; o resto fica para os repos em auto.
+ */
+export const TETO_RESERVA_AUTO = 0.7
+
+export function lerTetoReservaAuto(): number {
+  try {
+    const v = (JSON.parse(readFileSync(arquivoRepos(), 'utf8')) as { teto_reserva_auto?: unknown }).teto_reserva_auto
+    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : TETO_RESERVA_AUTO
+  } catch {
+    return TETO_RESERVA_AUTO
+  }
+}
+
 /** Os repos do repos.json (nome e caminho como o painel lê) com os modos. */
 export function lerReposResolvedor(): RepoResolvedor[] {
   const listados = lerRepos()
diff --git a/scripts/orquestrador/resolvedor/passada.ts b/scripts/orquestrador/resolvedor/passada.ts
index b1f7e82..9c39650 100644
--- a/scripts/orquestrador/resolvedor/passada.ts
+++ b/scripts/orquestrador/resolvedor/passada.ts
@@ -7,6 +7,10 @@
  *     triagem (o triador existente, `triarTicket`) → decisão pela classe e pelo
  *     modo (decidir.ts) → ação, ou, em --dry-run, o registro do que faria.
  *
+ * Entre passadas, a fatia (7f-b4): os repos fora de auto, juntos, gastam no
+ * máximo (1 − teto_reserva_auto) do teto do dia (padrão 30%); o resto espera
+ * pelo bloqueio de um repo em auto, que pode chegar numa passada mais tarde.
+ *
  * "Esperando por ele": tickets fora de `done`/`obsoleto` com o id em
  * `dependencias` (dependência direta). Empate: a ordem do arquivo.
  *
@@ -27,7 +31,7 @@ import { agirR1R5, agirR2 } from './acoes.js'
 import { GuardaResolvedor, arquivoDryRun, interruptor, travarPassada } from './caminhos.js'
 import { decidir, type Decisao } from './decidir.js'
 import { apurarAcoes, apurarPropostas, registrarSemAcao } from './desfecho.js'
-import { acharRepo, lerReposResolvedor, type Modo, type RepoResolvedor } from './modos.js'
+import { acharRepo, lerReposResolvedor, lerTetoReservaAuto, type Modo, type RepoResolvedor } from './modos.js'
 import { promoverRebaixar } from './promocao.js'
 
 export const TETO_DIA_USD = 5
@@ -70,11 +74,15 @@ const PRIORIDADE: Record<Modo, number> = { auto: 0, sombra: 1, diagnostico: 2 }
  * dia do modelo: em 11/10, Actus e conteudos-infinitos (diagnostico) o
  * consumiram e o 1006 do Comarka (R1 em auto) foi pulado por `teto_dia`.
  */
+const forca = (r: { modos: RepoResolvedor['modos'] }) => Math.min(...Object.values(r.modos).map((m) => PRIORIDADE[m]))
+
 export function ordenarRepos<T extends { modos: RepoResolvedor['modos'] }>(repos: T[]): T[] {
-  const forca = (r: T) => Math.min(...Object.values(r.modos).map((m) => PRIORIDADE[m]))
   return repos.map((r, i) => ({ r, i, p: forca(r) })).sort((a, b) => a.p - b.p || a.i - b.i).map((x) => x.r)
 }
 
+/** Repo em auto: alguma classe (ou o padrão) em auto. É quem usa a fatia reservada do teto (7f-b4). */
+export const emAuto = (r: { modos: RepoResolvedor['modos'] }): boolean => forca(r) === PRIORIDADE.auto
+
 /** Os bloqueados de um repo com o número de tickets que esperam por cada um, do maior ao menor. */
 export function ordenarBloqueados(raiz: string): { id: string; dependentes: number }[] {
   const fila = join(raiz, 'docs/fila')
@@ -101,9 +109,20 @@ function tetoDia(): number {
   return process.env.ORQ_RESOLVEDOR_TETO_DIA && Number.isFinite(v) && v >= 0 ? v : TETO_DIA_USD
 }
 
+/**
+ * O passo do modelo do repo: o teto do dia para todos; para repo fora de auto,
+ * também a fatia de (1 − teto_reserva_auto) do teto, somada entre os repos
+ * fora de auto (7f-b4).
+ */
+function passoModelo(repo: RepoResolvedor, todos: RepoResolvedor[]) {
+  const teto = tetoDia()
+  const fatia = emAuto(repo) ? null : { teto_usd: teto * (1 - lerTetoReservaAuto()), repos_auto: todos.filter(emAuto).map((r) => r.nome) }
+  return criarPassoModelo({ ...lerConfigModelo(), teto_dia_usd: teto }, fatia)
+}
+
 /** O diagnóstico atual do ticket: o que a triagem acabou de gravar, ou o gravado com a mesma assinatura. */
-function triar(repo: RepoResolvedor, id: string, agora: number, semModelo: boolean): Diagnostico | null {
-  const modelo = semModelo ? null : criarPassoModelo({ ...lerConfigModelo(), teto_dia_usd: tetoDia() })
+function triar(repo: RepoResolvedor, todos: RepoResolvedor[], id: string, agora: number, semModelo: boolean): Diagnostico | null {
+  const modelo = semModelo ? null : passoModelo(repo, todos)
   const r = triarTicket({ repo: { nome: repo.nome, caminho: repo.caminho }, id, agora, ...(modelo ? { modelo } : {}) })
   return r.diagnostico ?? lerDiagnostico<Diagnostico>(new Guarda([repo.caminho]), repo.nome, id)
 }
@@ -139,13 +158,15 @@ export function passada(o: OpcoesPassada = {}): ResultadoPassada {
   const soltar = travarPassada(g)
   if (!soltar) return { pausado: false, travado: true, itens: [] }
   try {
-    return { pausado: false, travado: false, itens: passadaTravada(repos, g, agora, dryRun, o.semModelo === true) }
+    // os repos em auto vêm do repos.json inteiro, mesmo com --repo: a fatia é do dia, não da passada
+    const todos = o.repo ? lerReposResolvedor() : repos
+    return { pausado: false, travado: false, itens: passadaTravada(repos, todos, g, agora, dryRun, o.semModelo === true) }
   } finally {
     soltar()
   }
 }
 
-function passadaTravada(repos: RepoResolvedor[], g: GuardaResolvedor, agora: number, dryRun: boolean, semModelo: boolean): ItemPassada[] {
+function passadaTravada(repos: RepoResolvedor[], todos: RepoResolvedor[], g: GuardaResolvedor, agora: number, dryRun: boolean, semModelo: boolean): ItemPassada[] {
   const itens: ItemPassada[] = []
   for (const repo of repos) {
     // o interruptor vale também no meio da passada: entre um ticket e outro
@@ -159,7 +180,7 @@ function passadaTravada(repos: RepoResolvedor[], g: GuardaResolvedor, agora: num
     }
     for (const { id, dependentes } of ordenarBloqueados(repo.caminho)) {
       if (existsSync(interruptor())) break
-      const diag = triar(repo, id, agora, semModelo || dryRun)
+      const diag = triar(repo, todos, id, agora, semModelo || dryRun)
       const base = { repo: repo.nome, id, dependentes, classe: diag?.classe ?? null, regra: diag?.regra ?? null, firme: diag?.firme ?? false }
       if (!diag) {
         itens.push({ ...base, modo: 'diagnostico', acao: 'aviso', feito: 'nao_consegui', motivo: 'sem diagnóstico (triagem travada por outro processo?)' })
diff --git a/scripts/orquestrador/triador/modelo.ts b/scripts/orquestrador/triador/modelo.ts
index 32f9360..1b40f46 100644
--- a/scripts/orquestrador/triador/modelo.ts
+++ b/scripts/orquestrador/triador/modelo.ts
@@ -381,8 +381,8 @@ export function lerLedger(g: Guarda): { dias: Record<string, Gasto[]> } {
  * curso, ou a que começou e não devolveu custo) conta como `piorCaso` (o
  * corte do CLI).
  */
-export function gastoDoDia(g: Guarda, agora: number, piorCaso: number): number {
-  return (lerLedger(g).dias[dia(agora)] ?? []).reduce((s, x) => s + (x.custo_usd ?? piorCaso), 0)
+export function gastoDoDia(g: Guarda, agora: number, piorCaso: number, conta: (x: Gasto) => boolean = () => true): number {
+  return (lerLedger(g).dias[dia(agora)] ?? []).filter(conta).reduce((s, x) => s + (x.custo_usd ?? piorCaso), 0)
 }
 
 function gravarLedger(g: Guarda, l: { dias: Record<string, Gasto[]> }): void {
@@ -432,7 +432,7 @@ function trechoIlegivel(stdout: string, rc: number): string {
 
 export interface RegistroModelo {
   modelo: string | null
-  pulado?: 'teto_dia' | 'desligado' | 'sem_tentativa'
+  pulado?: 'teto_dia' | 'teto_reserva_auto' | 'desligado' | 'sem_tentativa'
   /** só quando não é o da spec (ex.: `7f-b1b-r3`) */
   prompt?: NomePrompt
   erro?: string
@@ -449,8 +449,18 @@ export interface RegistroModelo {
   envelope_bruto?: string
 }
 
+/**
+ * A fatia do teto de quem não é repo em auto (7f-b4): o gasto do dia dos
+ * repos fora de `repos_auto` (sombra, diagnostico e o que não está no
+ * repos.json), mais o pior caso da chamada, não passa de `teto_usd`.
+ */
+export interface FatiaTeto {
+  teto_usd: number
+  repos_auto: string[]
+}
+
 /** O passo do modelo que `triarTicket` chama para palpite e sem regra. */
-export function criarPassoModelo(cfg: ConfigModelo = lerConfigModelo()): PassoModelo {
+export function criarPassoModelo(cfg: ConfigModelo = lerConfigModelo(), fatia: FatiaTeto | null = null): PassoModelo {
   return ({ ev, ext, repo, assinatura, guarda, agora }) => {
     if (!cfg.modelo) return { registro: { modelo: null, pulado: 'desligado' } satisfies RegistroModelo }
     // Teto do dia: a chamada só sai se, mesmo no pior caso (o corte do CLI), o dia não passa do teto.
@@ -458,6 +468,9 @@ export function criarPassoModelo(cfg: ConfigModelo = lerConfigModelo()): PassoMo
     if (microdolares(gastoDoDia(guarda, agora, pior) + pior) > microdolares(cfg.teto_dia_usd)) {
       return { registro: { modelo: cfg.modelo, pulado: 'teto_dia' } satisfies RegistroModelo }
     }
+    if (fatia && microdolares(gastoDoDia(guarda, agora, pior, (x) => !fatia.repos_auto.includes(x.repo)) + pior) > microdolares(fatia.teto_usd)) {
+      return { registro: { modelo: cfg.modelo, pulado: 'teto_reserva_auto' } satisfies RegistroModelo }
+    }
     const versao = cfg.prompt ?? PADRAO.prompt
     const entrada = montarEntrada(repo, ev, ext, cfg.entrada_max_tokens, versao)
     const chave = reservar(guarda, agora, { repo, id: ev.id, assinatura })
diff --git a/scripts/orquestrador/triador/saida.ts b/scripts/orquestrador/triador/saida.ts
index 06467a5..55c7179 100644
--- a/scripts/orquestrador/triador/saida.ts
+++ b/scripts/orquestrador/triador/saida.ts
@@ -142,12 +142,19 @@ export class Guarda {
 /**
  * sha256(repo | id | status | notas_status | para cada arquivo lido, em ordem:
  * nome, mtime_ns, tamanho). Mesma assinatura: não roda de novo (§1).
+ *
+ * O arquivo lido em recorte (`faixas`: a trilha `events.log` do kit, o
+ * `local-loop.log` do legado) é de todos os tickets e cresce a cada drenagem
+ * do loop: ele entra pelo recorte (as faixas e o conteúdo, que são do próprio
+ * ticket), nunca pelo stat do arquivo inteiro. Em 11/10 o stat do events.log
+ * deu ao 243 uma assinatura nova a cada 30 min sem tentativa nova (7f-b4).
  */
 export function assinatura(ev: Evidencia): string {
   const h = createHash('sha256')
   h.update([ev.repo, ev.id, ev.ticket?.status ?? '', ev.ticket?.notas_status ?? ''].join('|'))
   for (const l of [...ev.lidos].sort((a, b) => a.arquivo.localeCompare(b.arquivo))) {
-    h.update(`|${l.arquivo}|${l.mtime_ns}|${l.tamanho}`)
+    if (l.faixas) h.update(`|${l.arquivo}|recorte|${JSON.stringify(l.faixas)}|${createHash('sha256').update(l.conteudo).digest('hex')}`)
+    else h.update(`|${l.arquivo}|${l.mtime_ns}|${l.tamanho}`)
   }
   // sem tentativa, o diagnóstico é o estado das dependências (7f-b3): uma
   // dependência que fica done muda a assinatura e o ticket é triado de novo
diff --git a/scripts/orquestrador/triador/triar.ts b/scripts/orquestrador/triador/triar.ts
index ffab960..d7b2093 100644
--- a/scripts/orquestrador/triador/triar.ts
+++ b/scripts/orquestrador/triador/triar.ts
@@ -142,7 +142,10 @@ export function triarTicket(o: OpcoesTriar): Resultado {
   }
   const ev = lerRepo(o.repo.caminho, o.id, { agora })
   const assin = assinatura(ev)
-  if (!o.passada && !o.forcar && existente?.assinatura === assin) return { id: o.id, feito: 'mesma_assinatura' }
+  // triado sem modelo (o job sem `claude`, ou --sem-modelo) quando o modelo cabia:
+  // com o modelo de volta, a mesma assinatura é triada de novo, uma vez (7f-b4)
+  const semModeloAntes = !!o.modelo && existente?.modelo === null && !existente.extracao.firme && existente.extracao.regra !== 'D0'
+  if (!o.passada && !o.forcar && existente?.assinatura === assin && !semModeloAntes) return { id: o.id, feito: 'mesma_assinatura' }
   const soltar = travar(g, o.repo.nome, o.id, agora)
   if (!soltar) return { id: o.id, feito: 'travado' }
   try {
diff --git a/test/orquestrador-resolvedor-fatia-auto.test.ts b/test/orquestrador-resolvedor-fatia-auto.test.ts
new file mode 100644
index 0000000..c04ebf4
--- /dev/null
+++ b/test/orquestrador-resolvedor-fatia-auto.test.ts
@@ -0,0 +1,100 @@
+/**
+ * Etapa 7f-b4, peça 2 · fatia do teto para auto.
+ *
+ * A prioridade da 7f-b3 (auto antes de sombra antes de diagnostico) vale
+ * dentro de uma passada. Entre passadas, um repo em diagnostico com
+ * assinaturas novas ainda gasta o teto do dia antes de um bloqueio de um repo
+ * em auto aparecer, e o bloqueio em auto fica `teto_dia`.
+ *
+ * Chave nova no ~/.orq/repos.json, `teto_reserva_auto` (padrão 0.7): os repos
+ * sem classe em auto (sombra e diagnostico, juntos) só gastam até
+ * (1 − 0.7) = 30% do teto do dia; o resto fica para os repos em auto.
+ *
+ * Pronto quando: com um repo em diagnostico triado de novo a cada passada
+ * (assinatura nova a cada vez), o bloqueio do Comarka (auto) que aparece
+ * depois ainda chama o modelo; o repo em diagnostico parou em 30% do teto, com
+ * `pulado: teto_reserva_auto`.
+ */
+import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterAll, beforeAll, describe, expect, it } from 'vitest'
+import { ambiente, comEnv, FX_TRI } from './resolvedor-repo.js'
+import { materializar } from './triador-repo-legado.js'
+
+const RAIZ = join(import.meta.dirname, '..')
+const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
+const FX243 = join(import.meta.dirname, 'fixtures', 'triador-custo-real', 'conteudos-243')
+const AGORA = Date.parse('2026-10-11T15:20:15Z')
+const DIA = '2026-10-11'
+
+type Passada = (o: { agora: number }) => { itens: { repo: string; id: string }[] }
+
+describe('peça 2: fatia do teto para auto (teto_reserva_auto)', () => {
+  let amb: ReturnType<typeof ambiente>
+  let tira: () => void
+  beforeAll(() => {
+    amb = ambiente()
+    const trava = join(amb.base, 'trava')
+    mkdirSync(trava)
+    writeFileSync(join(trava, 'claude'), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${join(amb.base, 'trava.log')}"\nexit 99\n`)
+    chmodSync(join(trava, 'claude'), 0o755)
+    const r = JSON.stringify({ classe: 'R4', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' })
+    writeFileSync(join(amb.base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: r, total_cost_usd: 0.25, usage: { input_tokens: 1, output_tokens: 1 } }))
+    writeFileSync(amb.env.ORQ_TRIADOR_CONFIG!, JSON.stringify({ modelo: 'claude-opus-5-5', teto_caso_usd: 0.3, teto_corte_usd: 0.6, entrada_max_tokens: 30000, timeout_secs: 120 }))
+    tira = comEnv({
+      ...amb.env,
+      ORQ_TRIADOR_CLAUDE: STUB,
+      STUB_LOG: join(amb.base, 'stub.log'),
+      STUB_RESPOSTA: join(amb.base, 'resposta.json'),
+      ORQ_RESOLVEDOR_TETO_DIA: '5',
+      PATH: `${trava}:${process.env.PATH}`,
+    })
+  })
+  afterAll(() => {
+    expect(existsSync(join(amb.base, 'trava.log')) ? readFileSync(join(amb.base, 'trava.log'), 'utf8') : '').toBe('')
+    tira?.()
+  })
+
+  const ledger = () => (JSON.parse(readFileSync(join(amb.env.ORQ_DIAG_DIR!, 'custo.json'), 'utf8')) as { dias: Record<string, { repo: string; custo_usd: number | null }[]> }).dias[DIA] ?? []
+  const gastoDe = (repo: string) => ledger().filter((x) => x.repo === repo).reduce((s, x) => s + (x.custo_usd ?? 0), 0)
+  const modelo = (repo: string, id: string) => (JSON.parse(readFileSync(join(amb.env.ORQ_DIAG_DIR!, repo, `${id}.json`), 'utf8')) as { modelo: Record<string, unknown> }).modelo
+  const pulado = (repo: string, id: string) => (modelo(repo, id).pulado as string | undefined) ?? `chamou US$ ${modelo(repo, id).custo_usd}`
+
+  it('o diagnostico triado de novo a cada passada não come o teto do bloqueio em auto que aparece depois (padrão 0.7)', async () => {
+    // Actus em diagnostico: um bloqueio sem regra (o 243 de molde) que ganha assinatura nova a cada passada
+    const actus = join(amb.base, 'actus-saas')
+    cpSync(FX243, actus, { recursive: true })
+    const tkActus = join(actus, 'docs/fila/243-rota-e-tela-publica-de-aprovacao.md')
+    // Comarka com R1 e R5 em auto: o 559 (R4? D9) ainda não bloqueado
+    const comarka = materializar(join(FX_TRI, '01-559-L55054'), join(amb.base, 'comarka-operacional'))
+    const tk559 = join(comarka, 'docs/fila/559-aceite-aba-conta.md')
+    writeFileSync(tk559, readFileSync(tk559, 'utf8').replace(/"status": "[^"]*"/, '"status": "pendente"'))
+    amb.repos([{ caminho: actus }, { caminho: comarka, resolvedor: { padrao: 'diagnostico', R1: 'auto', R5: 'auto', R2: 'sombra' } }])
+
+    const { passada } = (await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/passada.ts')).href)) as { passada: Passada }
+    // 18 passadas no mesmo dia; a cada uma o ticket do Actus muda (nota nova), e a triagem refaz
+    for (let i = 0; i < 18; i++) {
+      writeFileSync(tkActus, readFileSync(tkActus, 'utf8') + `\nnota ${i}\n`)
+      passada({ agora: AGORA })
+    }
+    // o bloqueio do Comarka (auto) aparece
+    writeFileSync(tk559, readFileSync(tk559, 'utf8').replace(/"status": "[^"]*"/, '"status": "bloqueado"'))
+    const r = passada({ agora: AGORA })
+    expect(r.itens.map((i) => `${i.repo}/${i.id}`)).toEqual(['comarka-operacional/559', 'actus-saas/243'])
+    expect({ comarka: pulado('comarka-operacional', '559'), actus: pulado('actus-saas', '243') }).toEqual({ comarka: 'chamou US$ 0.25', actus: 'teto_reserva_auto' })
+    // o diagnostico parou em 30% do teto de US$ 5,00: 4 chamadas de US$ 0,25 (a 5ª passaria de US$ 1,50 no pior caso)
+    expect({ actus: gastoDe('actus-saas'), comarka: gastoDe('comarka-operacional') }).toEqual({ actus: 1, comarka: 0.25 })
+  })
+
+  it('teto_reserva_auto no repos.json: lido do topo; ausente ou inválido, 0.7', async () => {
+    const { lerTetoReservaAuto } = (await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/modos.ts')).href)) as { lerTetoReservaAuto?: () => number }
+    const grava = (extra: Record<string, unknown>) => writeFileSync(amb.env.ORQ_REPOS!, JSON.stringify({ $schema_versao: 1, ...extra, repos: [] }))
+    const lidos: unknown[] = []
+    for (const v of [undefined, 0.5, 0, 1, 1.5, -0.1, 'x']) {
+      grava(v === undefined ? {} : { teto_reserva_auto: v })
+      lidos.push(lerTetoReservaAuto?.())
+    }
+    expect(lidos).toEqual([0.7, 0.5, 0, 1, 0.7, 0.7, 0.7])
+  })
+})
diff --git a/test/orquestrador-resolvedor-job-claude.test.ts b/test/orquestrador-resolvedor-job-claude.test.ts
new file mode 100644
index 0000000..4cde06f
--- /dev/null
+++ b/test/orquestrador-resolvedor-job-claude.test.ts
@@ -0,0 +1,112 @@
+/**
+ * Etapa 7f-b4, peça 3 · o `claude` no PATH do job.
+ *
+ * Em 11/10 o job com.orq.resolvedor não achava o `claude` (ele fica em
+ * ~/.local/bin, fora do PATH do plist): o modelo do triador nunca rodou.
+ *
+ * Pronto quando:
+ *   - `instalar-job.sh --dry-run` põe o diretório de `command -v claude` no
+ *     PATH do plist, depois do diretório do node (o ~/.local/bin também tem um
+ *     `node`), e recusa (rc 1, nada impresso no stdout) se não achar o `claude`;
+ *   - o job.sh, sem o `claude`, grava UMA linha MODELO_INDISPONIVEL no job.log
+ *     por dia e segue só com extração: nenhuma chamada, nada no teto;
+ *   - quando o `claude` volta, o ticket triado sem modelo é triado de novo,
+ *     uma vez, com o modelo (a assinatura é a mesma, mas o modelo nunca rodou).
+ * Nenhum launchctl de verdade, nenhum claude de verdade: só stubs.
+ */
+import { spawnSync } from 'node:child_process'
+import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { dirname, join } from 'node:path'
+import { beforeAll, describe, expect, it } from 'vitest'
+import { ambiente } from './resolvedor-repo.js'
+
+const RAIZ = join(import.meta.dirname, '..')
+const DIR = join(RAIZ, 'scripts', 'orquestrador', 'resolvedor')
+const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
+const FX243 = join(import.meta.dirname, 'fixtures', 'triador-custo-real', 'conteudos-243')
+const NODE_DIR = dirname(process.execPath)
+const hoje = () => new Date().toISOString().slice(0, 10)
+
+describe('peça 3: o claude no PATH do job', () => {
+  let home: string
+  let bin: string
+  let comClaude: string
+  let amb: ReturnType<typeof ambiente>
+  let semClaudePath: string
+  beforeAll(() => {
+    home = mkdtempSync(join(tmpdir(), 'resolvedor-claude-'))
+    bin = join(home, 'bin')
+    mkdirSync(bin)
+    writeFileSync(join(bin, 'launchctl'), `#!/bin/bash\necho "$@" >> '${join(home, 'launchctl-chamado')}'\n`)
+    chmodSync(join(bin, 'launchctl'), 0o755)
+    // o diretório do `claude` desta "máquina": o stub, com o nome de verdade
+    comClaude = join(home, 'local-bin')
+    mkdirSync(comClaude)
+    copyFileSync(STUB, join(comClaude, 'claude'))
+    chmodSync(join(comClaude, 'claude'), 0o755)
+    // um PATH com node, git e jq, sem claude
+    semClaudePath = `${bin}:${NODE_DIR}:/usr/bin:/bin:/usr/sbin:/sbin`
+    expect(spawnSync('bash', ['-c', 'command -v claude'], { env: { PATH: semClaudePath } }).status).toBe(1)
+    amb = ambiente()
+    const actus = join(amb.base, 'actus-saas')
+    cpSync(FX243, actus, { recursive: true })
+    amb.repos([{ caminho: actus }])
+    const r = JSON.stringify({ classe: 'R4', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' })
+    writeFileSync(join(amb.base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: r, total_cost_usd: 0.25, usage: { input_tokens: 1, output_tokens: 1 } }))
+  })
+
+  const base = () => ({ ...amb.env, HOME: home, ORQ_TESTE: '1', STUB_LOG: join(amb.base, 'stub.log'), STUB_RESPOSTA: join(amb.base, 'resposta.json') })
+  const instalar = (path: string, ...a: string[]) => spawnSync('bash', [join(DIR, 'instalar-job.sh'), ...a], { encoding: 'utf8', env: { ...base(), PATH: path } })
+  const job = (env: Record<string, string>) => spawnSync('bash', [join(DIR, 'job.sh')], { encoding: 'utf8', env: { ...base(), ...env } })
+  const chamadas = () => (existsSync(join(amb.base, 'stub.log')) ? readFileSync(join(amb.base, 'stub.log'), 'utf8').split('\n').filter(Boolean).length : 0)
+  const custo = () => (existsSync(join(amb.env.ORQ_DIAG_DIR!, 'custo.json')) ? readFileSync(join(amb.env.ORQ_DIAG_DIR!, 'custo.json'), 'utf8') : null)
+  const modelo243 = () => (JSON.parse(readFileSync(join(amb.env.ORQ_DIAG_DIR!, 'actus-saas', '243.json'), 'utf8')) as { modelo: unknown }).modelo
+
+  it('--dry-run: o PATH do plist tem o diretório do claude, depois do node', () => {
+    const p = instalar(`${bin}:${NODE_DIR}:${comClaude}:/usr/bin:/bin`, '--dry-run')
+    expect(p.status, p.stderr).toBe(0)
+    const path = /<key>PATH<\/key>\s*<string>([^<]*)<\/string>/.exec(p.stdout)?.[1]
+    expect(path?.split(':')).toEqual([NODE_DIR, comClaude, '/usr/local/bin', '/opt/homebrew/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'])
+    expect(p.stderr).toContain(`# CLAUDE    = ${comClaude}/claude`)
+    expect(existsSync(join(home, 'Library'))).toBe(false)
+    expect(existsSync(join(home, 'launchctl-chamado'))).toBe(false)
+  })
+
+  it('sem claude no PATH: recusa, com ou sem --dry-run, antes de escrever ou chamar launchctl', () => {
+    for (const a of [['--dry-run'], []]) {
+      const p = instalar(semClaudePath, ...a)
+      expect({ rc: p.status, stdout: p.stdout }).toEqual({ rc: 1, stdout: '' })
+      expect(p.stderr).toMatch(/ERRO: claude nao esta no PATH/)
+    }
+    expect(existsSync(join(home, 'Library'))).toBe(false)
+    expect(existsSync(join(home, 'launchctl-chamado'))).toBe(false)
+  })
+
+  it('job.sh sem claude: uma linha MODELO_INDISPONIVEL por dia, passada só com extração, nada no teto', () => {
+    const p1 = job({ PATH: semClaudePath })
+    expect(p1.status, p1.stderr).toBe(0)
+    expect(p1.stdout.match(/MODELO_INDISPONIVEL/g)).toHaveLength(1)
+    expect(p1.stdout).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ MODELO_INDISPONIVEL claude fora do PATH/m)
+    expect(p1.stdout).toMatch(/actus-saas\t243\t/)
+    const p2 = job({ PATH: semClaudePath })
+    expect(p2.status, p2.stderr).toBe(0)
+    expect(p2.stdout).not.toMatch(/MODELO_INDISPONIVEL/)
+    expect(readFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'modelo-indisponivel'), 'utf8').trim()).toBe(hoje())
+    expect({ chamadas: chamadas(), custo: custo(), modelo: modelo243() }).toEqual({ chamadas: 0, custo: null, modelo: null })
+    // outro dia: a linha volta, uma vez
+    writeFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'modelo-indisponivel'), '2026-10-10\n')
+    expect(job({ PATH: semClaudePath }).stdout.match(/MODELO_INDISPONIVEL/g)).toHaveLength(1)
+  })
+
+  it('o claude volta: o 243 triado sem modelo é triado de novo com o modelo, uma vez', () => {
+    const env = { PATH: `${semClaudePath}:${comClaude}`, ORQ_TRIADOR_CLAUDE: join(comClaude, 'claude') }
+    const p = job(env)
+    expect(p.status, p.stderr).toBe(0)
+    expect(p.stdout).not.toMatch(/MODELO_INDISPONIVEL/)
+    expect(chamadas()).toBe(1)
+    expect(modelo243()).toMatchObject({ modelo: 'claude-opus-5-5', custo_usd: 0.25 })
+    expect(job(env).status).toBe(0)
+    expect(chamadas()).toBe(1)
+  })
+})
diff --git a/test/orquestrador-resolvedor-job.test.ts b/test/orquestrador-resolvedor-job.test.ts
index 70ab924..1b920ee 100644
--- a/test/orquestrador-resolvedor-job.test.ts
+++ b/test/orquestrador-resolvedor-job.test.ts
@@ -32,6 +32,9 @@ describe('peça 8: o job do launchd', () => {
     mkdirSync(bin)
     writeFileSync(join(bin, 'launchctl'), `#!/bin/bash\necho "$@" >> '${join(home, 'launchctl-chamado')}'\n`)
     chmodSync(join(bin, 'launchctl'), 0o755)
+    // o instalar-job.sh exige um `claude` no PATH (7f-b4): um falso, que reprova se rodar
+    writeFileSync(join(bin, 'claude'), '#!/bin/bash\nexit 99\n')
+    chmodSync(join(bin, 'claude'), 0o755)
     amb = ambiente()
     env = { ...(process.env as Record<string, string>), ...amb.env, HOME: home, PATH: `${bin}:${process.env.PATH}`, ORQ_TESTE: '1' }
   })
diff --git a/test/orquestrador-triador-aceite.test.ts b/test/orquestrador-triador-aceite.test.ts
index e84c40a..c18fcfe 100644
--- a/test/orquestrador-triador-aceite.test.ts
+++ b/test/orquestrador-triador-aceite.test.ts
@@ -38,6 +38,7 @@
  * caso sai "sem diagnóstico" e o vermelho é de asserção (0 de 15 firmes), não
  * de import quebrado.
  */
+import { createHash } from 'node:crypto'
 import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
 import { tmpdir } from 'node:os'
 import { join } from 'node:path'
@@ -355,6 +356,19 @@ interface Replay {
 let base = ''
 const envAntes = { ...process.env }
 
+/**
+ * A assinatura como a corrida da peça 6 (7f-b1b) a gravou: o stat de todo
+ * arquivo lido, inclusive o do log em recorte. A 7f-b4 tirou o stat do log da
+ * assinatura do motor (o log cresce a cada drenagem); a guarda do replay
+ * continua sendo "a mesma evidência que a corrida viu", na fórmula de então.
+ */
+function assinaturaDaCorrida(ev: { repo: string; id: string; ticket: { status?: string; notas_status?: string } | null; lidos: { arquivo: string; mtime_ns: string; tamanho: number }[] }): string {
+  const h = createHash('sha256')
+  h.update([ev.repo, ev.id, ev.ticket?.status ?? '', ev.ticket?.notas_status ?? ''].join('|'))
+  for (const l of [...ev.lidos].sort((a, b) => a.arquivo.localeCompare(b.arquivo))) h.update(`|${l.arquivo}|${l.mtime_ns}|${l.tamanho}`)
+  return h.digest('hex')
+}
+
 async function replay(): Promise<Replay | null> {
   try {
     const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, any>
@@ -366,11 +380,12 @@ async function replay(): Promise<Replay | null> {
     const passo = criarPassoModelo(CFG_PECA6)
     let gravadas = 0
     const velhas: string[] = []
-    const modelo = (ctx: { ev: { id: string }; assinatura: string }) => {
+    const modelo = (ctx: { ev: Parameters<typeof assinaturaDaCorrida>[0]; assinatura: string }) => {
       const f = join(FX, ctx.ev.id, 'resposta-modelo.json')
       if (!existsSync(f)) return { registro: { modelo: null, pulado: 'sem_replay' } }
       const g = JSON.parse(readFileSync(f, 'utf8')) as Gravada
-      if (g.assinatura !== ctx.assinatura) velhas.push(ctx.ev.id)
+      // a corrida assina a evidência com o id do ticket (o do caso vem só no diagnóstico)
+      if (g.assinatura !== assinaturaDaCorrida({ ...ctx.ev, id: ctx.ev.id.split('-')[1]! })) velhas.push(ctx.ev.id)
       gravadas++
       writeFileSync(join(base, 'resposta.json'), g.modelo.envelope_bruto ?? '')
       process.env.STUB_RC = /\(rc (\d+)\)/.exec(g.modelo.erro ?? '')?.[1] ?? '0'
diff --git a/test/orquestrador-triador-assinatura-estavel.test.ts b/test/orquestrador-triador-assinatura-estavel.test.ts
new file mode 100644
index 0000000..bbc3a52
--- /dev/null
+++ b/test/orquestrador-triador-assinatura-estavel.test.ts
@@ -0,0 +1,89 @@
+/**
+ * Etapa 7f-b4, peça 1 · assinatura estável.
+ *
+ * Em 11/10 o diagnóstico do 243 (conteudos-infinitos) ganhou uma assinatura
+ * nova a cada ~30 min sem tentativa nova (24 no histórico, de 03:54 a 15:40
+ * UTC). A entrada que mudava: o `stat` (mtime e tamanho) do `runs/events.log`
+ * INTEIRO, que o loop do repo acrescenta a cada drenagem
+ * (`--- DRENAGEM_INICIO`, `--- OCIOSO pendentes=1 244=dependencia:243:bloqueado`,
+ * `--- DRENAGEM_FIM`), embora o recorte lido (as linhas do 243) seja o mesmo.
+ * Com o modelo no PATH do job, cada assinatura nova seria uma chamada paga.
+ *
+ * Pronto quando: a assinatura só muda quando muda algo do próprio ticket (o
+ * arquivo do ticket, as tentativas dele, o motivo do bloqueio). O log
+ * compartilhado entra pelo recorte (as linhas do id), não pelo stat do arquivo.
+ */
+import { appendFileSync, cpSync, mkdtempSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+import { describe, expect, it } from 'vitest'
+import { lerRepo } from '../scripts/orquestrador/triador/leitor.js'
+import { assinatura } from '../scripts/orquestrador/triador/saida.js'
+
+const FX243 = join(import.meta.dirname, 'fixtures', 'triador-custo-real', 'conteudos-243')
+const LOG = 'docs/fila/runs/events.log'
+const TICKET = 'docs/fila/243-rota-e-tela-publica-de-aprovacao.md'
+
+function repo243(): string {
+  const raiz = join(mkdtempSync(join(tmpdir(), 'assinatura-243-')), 'conteudos-infinitos')
+  cpSync(FX243, raiz, { recursive: true })
+  return raiz
+}
+
+const assin = (raiz: string) => assinatura(lerRepo(raiz, '243'))
+
+/** Uma drenagem ociosa do loop, como as de 11/10 (linhas reais, com o relógio andando). */
+function drenagem(raiz: string, hora: string): void {
+  appendFileSync(
+    join(raiz, LOG),
+    [
+      `\n2026-10-11T${hora}:32-0300 --- DRENAGEM_INICIO alvo=staging-auto processaveis=0`,
+      `2026-10-11T${hora}:35-0300 --- OCIOSO pendentes=1 244=dependencia:243:bloqueado`,
+      `2026-10-11T${hora}:35-0300 --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=0 refatiar=0 sem_progresso=0 dur=0min`,
+    ].join('\n'),
+  )
+  const st = statSync(join(raiz, LOG))
+  utimesSync(join(raiz, LOG), st.atime, new Date(st.mtimeMs + 30 * 60 * 1000))
+}
+
+describe('peça 1: assinatura estável (o 243 de 11/10)', () => {
+  it('duas drenagens ociosas do loop, sem tentativa nova: a mesma assinatura', () => {
+    const raiz = repo243()
+    const a0 = assin(raiz)
+    drenagem(raiz, '12:09')
+    const a1 = assin(raiz)
+    drenagem(raiz, '12:39')
+    const a2 = assin(raiz)
+    expect({ a1, a2 }).toEqual({ a1: a0, a2: a0 })
+  })
+
+  it('muda quando muda o ticket: o arquivo do ticket', () => {
+    const raiz = repo243()
+    const a0 = assin(raiz)
+    writeFileSync(join(raiz, TICKET), readFileSync(join(raiz, TICKET), 'utf8') + '\nnota do humano\n')
+    expect(assin(raiz)).not.toBe(a0)
+  })
+
+  it('muda quando muda o ticket: uma tentativa nova na trilha', () => {
+    const raiz = repo243()
+    const a0 = assin(raiz)
+    appendFileSync(join(raiz, LOG), '\n2026-10-11T13:00:00-0300 243 INICIO attempt=4 model=opus')
+    expect(assin(raiz)).not.toBe(a0)
+  })
+
+  it('muda quando muda o ticket: o motivo do bloqueio', () => {
+    const raiz = repo243()
+    const a0 = assin(raiz)
+    const t = readFileSync(join(raiz, LOG), 'utf8')
+    writeFileSync(join(raiz, LOG), t.replace('BLOQUEADO motivo=repeticao', 'BLOQUEADO motivo=enforcement'))
+    expect(assin(raiz)).not.toBe(a0)
+  })
+
+  it('muda quando muda o ticket: um artefato de tentativa reescrito', () => {
+    const raiz = repo243()
+    const a0 = assin(raiz)
+    const f = join(raiz, 'docs/fila/runs/243/attempt-2/gates.txt')
+    writeFileSync(f, readFileSync(f, 'utf8') + 'x\n')
+    expect(assin(raiz)).not.toBe(a0)
+  })
+})
```
