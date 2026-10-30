# Relatório — kit do Orquestrador, etapa 4

Repo: `~/Projetos/orquestrador-kit`, branch `main`, 5 commits novos, **nada
pushado**. Nenhuma chamada à API da Anthropic nesta sessão. `~/Projetos/comarka-operacional`
e `~/Projetos/conteudos-infinitos` foram lidos e nunca escritos.

| Peça | Commit | Vermelho antes |
|---|---|---|
| K6e · o instalador não pode ser sequestrado por teste | `edaacc9` | 3 casos |
| K8c · a recusa por árvore suja cobre `scripts/roadmap/` | `c092a24` | 5 checks |
| K8d · os testes do harness viajam com o motor | `b9287b4` | 3 checks |
| K9 · contrato e schemas | `17f4324` | (documento; validado contra 77 tickets reais) |
| `orq versao` e `orq config` | `e52a66e` | 14 de 15 casos |

## Fechamento — saídas cruas

### 1. `npx vitest run --reporter=dot`

```
 Test Files  29 passed (29)
      Tests  668 passed (668)
```
(antes da sessão: 28 arquivos, 648 testes)

### 2. `bash scripts/kit/test-shell.sh`

```
== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
TODOS OS SCRIPTS SAÍRAM rc 0
```

### 3. `bash scripts/kit/test-instalar.sh`

`TODOS OS CHECKS PASSARAM` — 8 blocos: (a) fixture idêntico · (b) byte a mais em
`lib.sh` · (d) byte a mais em `lint-mapa.py` · (e) `--atualizar` com as três
recusas · (f) arquivo só do repo sobrevive · **(g) NOVO, K8c** · **(h) NOVO,
K8d, com (h3) rodando `npx vitest run` dentro do repo atualizado** · (c) o CI,
informativo.

### 4. `npx tsc --noEmit`

Limpo.

### 5. `bash instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run`

```
ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.

VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
           repo /Users/lucasantos/Projetos/conteudos-infinitos

carimbo    2.1.0-dev

só no kit   scripts/orquestrador/config-chaves.ts
só no kit   scripts/orquestrador/config-cli.ts
diferente   scripts/orquestrador/instalar-launchd.sh
diferente   scripts/orq
diferente   test/fixtures/orq-harness.ts
só no kit   test/orquestrador-pacotes.test.ts

6 diferença(s)
```

**Leitura linha a linha** — as 6 diferenças, e nenhuma é surpresa:

| Linha | O que é | De qual peça |
|---|---|---|
| `só no kit scripts/orquestrador/config-chaves.ts` | a lista das 49 chaves de config com o arquivo:linha de onde cada uma é lida | `orq config` |
| `só no kit scripts/orquestrador/config-cli.ts` | o validador de config | `orq config` |
| `diferente scripts/orquestrador/instalar-launchd.sh` | a recusa de instalar de `/tmp` / sob `ORQ_TESTE=1`, e argumento desconhecido saindo 2 | K6e |
| `diferente scripts/orq` | os verbos `versao` e `config`, e o despacho de `config` antes do `lib.sh` | `orq versao`/`config` |
| `diferente test/fixtures/orq-harness.ts` | `configDeReferencia()` (lê o config REAL do checkout quando existe) + `comLaunchctlStub()` | K8d + K6e |
| `só no kit test/orquestrador-pacotes.test.ts` | o teste da peça K6a (`pacotes_do_checkout`), que o CI ainda não tem | K8d |

As duas últimas são as ÚNICAS de `test/`, que era o que a peça K8d pedia para
apurar. Nada mais de `test/` se move no CI.

O harness do kit **não remove nada** do harness do CI: o bloco de 5 linhas que
aparece no diff virou a função `configDeReferencia()`, que num repo com
`docs/fila` lê exatamente o mesmo arquivo de antes (`REPO_ROOT/docs/fila/000-config.json`).

### 6. `git log --oneline main` (só os novos) e `git status -sb`

```
e52a66e orq versao e orq config: os dois verbos de leitura que faltavam
17f4324 K9: contrato e schemas
b9287b4 K8d: os testes do harness viajam com o motor
c092a24 K8c: a recusa por árvore suja cobre scripts/roadmap/
edaacc9 K6e: o instalador não pode ser sequestrado por teste
d72cdcd docs: PECAS e CHANGELOG da etapa 3   <- HEAD anterior
```
```
## main...origin/main [ahead 5]
```
Árvore limpa. `ahead 5` é o esperado: **nenhum push**, por regra da sessão.

### 7. `/tmp` — o que esta sessão deixou

Nada. Restam três artefatos de sessões ANTERIORES, e eu não os apaguei:

```
Sep  8 11:45  /private/tmp/orq-verif-dir.txt
Sep  8 11:54  /private/tmp/orq-e2e.out
Sep  8 12:59  /private/tmp/orq-fixture-6qRp23     <- o fixture DO INCIDENTE (vazio: só um `repo/`)
```

`orq-fixture-6qRp23` é o caminho para o qual o job do CI apontou das 12:24 às
14:05. Nada o referencia mais — conferido: `launchctl print
gui/<uid>/com.conteudos.orquestrador` hoje aponta para
`~/Projetos/conteudos-infinitos` com `last exit code = 0`. Apagar é uma linha
(`rm -rf /private/tmp/orq-fixture-6qRp23`); deixei porque é o último traço
físico do incidente e a decisão de apagá-lo não é minha.

## Diff cru (stat)

```
 CHANGELOG.md                             |  74 ++++++
 CONTRATO.md                              | 399 +++++++++++++++++++++++++++++++
 docs/PECAS.md                            | 158 ++++++++++--
 docs/PLAYBOOK.md                         |  76 ++++++
 instalar.sh                              |  42 +++-
 schemas/liberacoes.schema.json           |  45 ++++
 schemas/motivo_categoria.json            |  34 +++
 schemas/ticket.schema.json               |  91 +++++++
 scripts/kit/fixture-e2e.sh               |  21 +-
 scripts/kit/fixture.sh                   |  11 +
 scripts/kit/test-instalar.sh             | 111 ++++++++-
 scripts/kit/vendorizado.sh               |  64 +++++
 scripts/orq                              |  73 ++++++
 scripts/orquestrador/config-chaves.ts    | 100 ++++++++
 scripts/orquestrador/config-cli.ts       | 217 +++++++++++++++++
 scripts/orquestrador/instalar-launchd.sh |  68 +++++-
 test/fixtures/bin/launchctl              |  45 ++++
 test/fixtures/orq-harness.ts             |  78 +++++-
 test/orq-versao-config.test.ts           | 237 ++++++++++++++++++
 test/orquestrador-launchd-config.test.ts | 131 +++++++++-
 20 files changed, 2026 insertions(+), 49 deletions(-)
```

---

## Peça a peça

### K6e — o instalador não pode ser sequestrado por teste (`edaacc9`)

O incidente de 08/09: o "vermelho antes" da K6c chamou
`instalar-launchd.sh --dry-run` contra a cópia **vendorizada dentro do fixture**
— a versão antiga, que aceitava um argumento e ignorava o que não reconhecia.
Ela rodou o caminho de instalação inteiro. Das 12:24 às 14:05 o job
`com.conteudos.orquestrador` apontou para `/private/tmp/orq-fixture-6qRp23`,
três ticks morreram com `rc 127` e nada alarmou — o job estava *carregado*, que
é o estado que toda verificação superficial chama de saudável.

Três decisões somadas, nenhuma bastando sozinha: o teste rodava o instalador
real; o instalador não distinguia checkout de verdade de checkout descartável; o
label não vinha do config (isso a K6c já consertou).

- **(a)** `test/fixtures/bin/launchctl` — stub que grava uma linha por chamada em
  `$ORQ_LAUNCHCTL_LOG` e sai 0; `print` e `bootout` devolvem saída plausível para
  o script sob teste seguir o **mesmo caminho de código**. `comLaunchctlStub()`
  no harness põe o diretório na frente do PATH, troca o `HOME` por um tmp
  descartável e devolve `chamadas()`. Todos os 15 casos do arquivo usam o stub.
  O caso novo prova a instalação inteira passando pelo stub (`print` → `bootout`
  → `bootstrap`, cada chamada com o label do config), o plist indo para o HOME
  descartável, e `launchctl print` **real** do label do fixture continuando a
  sair != 0.
- **(b)** `instalar-launchd.sh` recusa (rc 1) sob `/tmp`/`/private/tmp` — os dois
  lados, lógico e físico, porque no macOS um é symlink do outro — ou com
  `ORQ_TESTE=1`. `--permitir-tmp` libera; `--dry-run` continua valendo lá.
  Argumento desconhecido agora sai 2 em vez de ser ignorado: foi literalmente
  "flag ignorada" que transformou *simule* em *faça*.
- **(c)** `test-instalar.sh` e `fixture-e2e.sh` exportam `ORQ_TESTE=1`, com UMA
  exceção — o `local-loop.sh` da drenagem do e2e roda com `env -u ORQ_TESTE`.
  **Conferido no `lib.sh` antes de escrever, e medido:** `escrita_de_teste_permitida`
  (`lib.sh:168`) recusa trilha/STATUS/custo fora de `$ORQ_EXEC_ROOT`, e nem
  `local-loop.sh`, nem `executor.sh`, nem `launchd-run.sh` definem essa variável
  (`grep -n ORQ_EXEC_ROOT` neles não devolve nada). Rodado no fixture: com
  `ORQ_TESTE=1` e `ORQ_EXEC_ROOT` vazio, `event` grava **0 linhas** e loga
  `escrita RECUSADA`; sem a variável, grava 1. O e2e perderia a própria trilha.
- **(d)** `docs/PLAYBOOK.md` do kit, com o incidente como primeira entrada, no
  formato do PLAYBOOK do CI (data, área, causa, detecção, conserto, lição).
- **(e)** O alarme virou peça **K12a** em `docs/PECAS.md`, com o teste que prova
  (dois casos positivos e dois negativos, `print` vindo do stub). Não implementado.

**Pronto quando** — `grep -rn launchctl test scripts/kit` devolve só: o stub,
comentários, as chamadas via stub, o `launchctl print` REAL de leitura que prova
a ausência do job, e três regex sobre o texto de `docs/launchd.md`.

**O que o CI faz diferente:** nada. O instalador do CI só ganha uma recusa que o
checkout dele nunca dispara — não está sob `/tmp` e o CI não roda com
`ORQ_TESTE=1`.

### K8c — a recusa por árvore suja cobre `scripts/roadmap/` (`c092a24`)

Desde a K5b o `--atualizar` **escreve** em `scripts/roadmap/`, mas a recusa 3
conferia só os três caminhos que a K8a enumerava. Um `lint-mapa.py` modificado e
não commitado era a única coisa que o instalador apagava sem avisar. Escrever e
vigiar passam a ser a mesma lista.

**Vermelho antes (5 falhas):** o `--atualizar` saía rc 0 dizendo `idêntico ao kit
2.1.0-dev` — a modificação já apagada, e a saída não a mencionava.
**Depois:** rc 1, a recusa nomeia o caminho, `cksum` do arquivo inalterado; com
`--forcar`, rc 0 e o aviso do que se perde.

**O que o CI faz diferente:** nada — `git -C ~/Projetos/conteudos-infinitos
status --porcelain -- scripts/roadmap` está vazio, medido.

### K8d — os testes do harness viajam com o motor (`b9287b4`)

A lista mora em `scripts/kit/vendorizado.sh`, sourceada por `instalar.sh` **e**
por `scripts/kit/fixture.sh`: o fixture É o repo instalado deste kit, e as duas
vendorizações não podem divergir (é a lição que a K8c acabou de cobrar).

**O que viaja (7 + 3):** `test/fixtures/orq-harness.ts`,
`orquestrador-{morte-por-sinal,pacotes,prefixo-aspas,prompt-como-rodar,reparo-trilha,trilha-uma-linha}.test.ts`,
`test/fixtures/criterios/lote8-246-250.json`,
`test/fixtures/trilha/{events-quebrado.log,permissao-negada-234.cmd}`.

Um conserto foi necessário para qualquer coisa poder viajar: `criarFixture`
semeava o config do `FX_CHECKOUT` do kit. Instalado num repo, ele passaria a
assegurar sobre o config do **kit** em vez do daquele repo — o harness do CI traz
a frase "os testes têm que falhar quando o config muda de forma incompatível, não
passar contra uma cópia congelada" exatamente sobre essa linha.
`configDeReferencia()` agora lê o config real quando existe, com `FX_CHECKOUT`
como fallback: no kit resolve como antes, no repo instalado resolve para a fila
de verdade.

#### ACHADO — por que a lista é 7 e não 27

Medido contra `~/Projetos/conteudos-infinitos`, arquivo a arquivo:

- **17** `test/orquestrador-*.test.ts` **diferem** do CI, e a diferença de todos é
  da mesma família: nas peças K3/K7b eles foram re-apontados para fixtures do kit
  (`FX_CHECKOUT`, `test/fixtures/checkout/`) porque o kit não tem `docs/fila`.
  Exemplo cru (`orquestrador-custo.test.ts`): o CI lê
  `join(REPO_ROOT,'docs','fila','000-config.json')`, o kit lê
  `join(FX_CHECKOUT, …)`. Instalar essa versão trocaria "o teste falha quando O
  MEU config muda" por "o teste passa contra uma cópia congelada". **Não viajam.**
- **2** são **byte-idênticos** ao do CI e ainda assim não viajam, porque hardcodam
  valores do CI e **falham em qualquer outro repo** — medido dentro do fixture
  instanciado: `orq-cli.test.ts:205,237` cobra `US$ 50` (o `usd_dia` do CI; o
  fixture tem 5) e `orquestrador-observabilidade.test.ts:216-217` cobra os gates
  `typecheck_root`/`typecheck_web` — os nomes do CI, justamente os que a peça K6b
  tirou do motor.
- **3** são do kit e só rodam no kit: `launchd-config` (precisa de
  `scripts/kit/fixture.sh` e de `test/fixtures/bin/`), `trilha-gate-papel` (lê
  `_referencia-ci/` e `fixture/`) e `kit-e2e-evidencia`. Somam-se
  `test/fixtures/orq-harness.ts` — que viaja — e `test/fixtures/{bin,checkout}/`,
  que não.

O experimento que a peça pedia foi feito: fixture instanciado, testes do kit
copiados para dentro, `npx vitest run` lá. Resultado da primeira rodada: **13
falhas em 3 arquivos**, e foram elas que produziram os três baldes acima. Peça
**K8e** registrada, com a saída de cada balde.

O critério final não é opinião: **(h3)** do `test-instalar.sh` roda
`npx vitest run` DENTRO do repo atualizado a cada execução — 8 arquivos, 62
testes, rc 0, contra um config que não é o do kit nem o do CI. Teste que só passa
no kit não é teste de harness.

**O que o CI faz diferente:** as duas linhas de `test/` do `--dry-run` acima, e
nada mais.

### K9 — contrato e schemas (`17f4324`)

`CONTRATO.md` (399 linhas) é **descritivo**: cada afirmação traz o arquivo:linha
de onde saiu. Cobre layout de arquivos (motor × repo × os 13 artefatos de
`runs/`), ticket, `STATUS.md` (as 7 chaves que `status_set` aceita, e por que
`FILA`/`STAGING` não são chaves), `events.log` com **vocabulário fechado de 19
eventos**, um por call site, a linha `GATE` com os quatro valores e os dois campos
condicionais, `custo.json`, `meta.json`, `attempt-N/`, `liberacoes.json`,
`PAUSAR`, config, e os verbos de `orq`, `instalar.sh` e `instalar-launchd.sh`.

§10 **Divergências conhecidas**: 9 itens, cada um com a peça que o fecha. Nenhuma
foi consertada na prosa.

**Schemas, e a medição:**
- `schemas/ticket.schema.json` — união de `INVENTARIO §2` com o que o
  `gate-ticket.ts` cobra. **Rodado contra a fila real: 76 tickets do CI + 1 do
  fixture, 0 violações** (id, status, campos obrigatórios de `pendente`, `risco`,
  `tipo` de critério). `additionalProperties: true` de propósito — a fila do CI
  tem três gerações de schema convivendo.
- `schemas/liberacoes.schema.json` — o formato-ALVO (objetos), com a divergência
  em letra grande no próprio `description`: **o motor lê strings** (`lib.sh:426`)
  e um objeto ali não resolve dependência, em silêncio. O padrão do token
  (`^humano:[a-z-]+-[0-9A-Za-z-]+$`) casa os 7 tokens reais do CI, conferido.
- `schemas/motivo_categoria.json` — os 8 baldes **copiados do disco** de
  `~/Projetos/comarka-operacional/scripts/orquestrador/orq-telemetria.py:78`
  (`CATEGORIAS_MOTIVO`), só leitura. Não estão em `_referencia-ci/`; a origem está
  escrita dentro do arquivo, e a ordem das regras (o primeiro padrão que casa
  vence) vai junto.

`gate-ticket.ts` **não** passa a validar pelo schema: peça própria, em PENDENTES,
junto com a que ensina `liberacao_ok` a ler o formato v2 — as duas pontas dessa
migração têm de chegar juntas.

**O que o CI faz diferente:** nada. `CONTRATO.md` e `schemas/` são do kit e não
estão em mapa de vendorização nenhum.

### `orq versao` e `orq config` (`e52a66e`)

`orq versao [--kit <dir>]` imprime o carimbo do repo e compara com o do kit —
dizendo que **carimbo igual não é motor idêntico**, porque quem prova isso é o
`--verificar`. `orq config` acusa placeholder, chave obrigatória ausente com o
arquivo:linha de onde o motor a lê, gate sem papel, `gates` sem `nome`.
`scripts/orquestrador/config-chaves.ts`: **49 chaves, 40 obrigatórias**,
levantadas por grep no PASSO 0.

**Dois defeitos consertados no caminho:**
1. O `orq` **inteiro** saía `rc 5` (`jq: parse error`) com config ilegível — o
   `lib.sh` lê o config no carregamento e `set -e` derruba tudo. A única
   ferramenta que responde "meu config está quebrado?" era justamente a que não
   rodava quando ele estava. `orq config` passou a ser despachado antes do
   `source lib.sh`, resolvendo o caminho do config sem ele (o caminho não vem do
   config: é `<checkout>/docs/fila/000-config.json` por contrato).
2. O validador acusava o gate `limpeza_artefatos` do CI, que é `tipo: preparacao`
   — um `rm -rf` que não verifica nada. Gate que não verifica não tem papel na
   linha `GATE`, e `gates_do_papel` corretamente não o encontra. Validador que
   reprova config correto é validador que alguém desliga.

**Medido contra o CI (só leitura, nada escrito lá):**
```
orq config  -> CONFIG /Users/lucasantos/Projetos/conteudos-infinitos/docs/fila/000-config.json
               0 violações — o config está preenchido e as chaves que o motor lê estão lá.
               rc=0
orq versao  -> REPO 2.1.0-dev  ·  KIT 2.1.0-dev  ·  igual
               (com o aviso de que carimbo igual não é motor idêntico — e não é:
                o --verificar acusa 6 diferenças)
```
**Nenhum achado.** O `launchd.label` que a K6c tornou obrigatório já está no
config do CI (`com.conteudos.orquestrador` / `1800`) — o passo humano da etapa 3
foi feito. O caso `config real e ANTIGO` do teste usa
`test/fixtures/checkout/`, a cópia **congelada** em `@711ab5e`, de antes da K6c:
ele trava o comportamento do validador diante de um config pré-migração e não
afirma nada sobre o CI de hoje.

---

## Passos humanos para o CI receber este motor

Nesta ordem, dentro de `~/Projetos/conteudos-infinitos`:

1. **Pausar.** `bash scripts/orq pausar "atualizando o motor — kit etapa 4"`
   Confirmar `docs/fila/runs/STATUS.md` dizendo `ESTADO ocioso` (a recusa 2 do
   instalador cobra isso). Não mate processo: a drenagem para *entre* tickets.
2. **Ver o que muda, sem escrever.**
   `bash ~/Projetos/orquestrador-kit/instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run`
   Esperado: as 6 linhas da seção 5 deste relatório. Qualquer linha a mais é
   achado — investigue antes de seguir.
3. **Atualizar.**
   `bash ~/Projetos/orquestrador-kit/instalar.sh --atualizar ~/Projetos/conteudos-infinitos`
   Se recusar por modificação não commitada, **leia o que ele nomeia** antes de
   pensar em `--forcar`: a recusa agora cobre `scripts/roadmap/` e os testes de
   harness vendorizados, que antes eram apagados em silêncio.
4. **Rodar a suíte do CI, com os testes novos.**
   `npx vitest run`
   O CI ganha `test/orquestrador-pacotes.test.ts` (6 casos da peça K6a) e o
   `orq-harness.ts` com `configDeReferencia()`. Os 17 testes re-apontados do kit
   **não** foram instalados, então as versões do CI continuam intactas.
   Se algo falhar aqui, é achado — pare e reporte, não conserte no CI.
5. **Conferir identidade.**
   `bash ~/Projetos/orquestrador-kit/instalar.sh --verificar ~/Projetos/conteudos-infinitos`
   Esperado: `idêntico ao kit 2.1.0-dev`, rc 0.
6. **Os dois verbos novos, agora no motor do CI.**
   `bash scripts/orq versao --kit ~/Projetos/orquestrador-kit` → `igual`
   `bash scripts/orq config` → `0 violações`, rc 0 (já medido daqui: passa)
7. **Commitar por pathspec explícito**, com a linha que o próprio instalador
   imprime no fim (ela já inclui `scripts/roadmap` e os arquivos de `test/`).
8. **Retomar.** `bash scripts/orq retomar`
9. **Push.**

### Ainda pendente no CI, e não é desta sessão

- Apagar lá o `scripts/orquestrador/com.conteudos.orquestrador.plist.template`: o
  `--atualizar` não apaga nada, então o template velho fica ao lado do novo. (Item
  herdado da etapa 3.)
- **Reinstalar o job do launchd** depois do `--atualizar`, para que a guarda da
  K6e entre em vigor no plist instalado:
  `bash scripts/orquestrador/instalar-launchd.sh --dry-run` primeiro, e só depois
  sem a flag. O job atual está saudável (`last exit code = 0`, apontando para o
  checkout certo), então isso não tem pressa.
