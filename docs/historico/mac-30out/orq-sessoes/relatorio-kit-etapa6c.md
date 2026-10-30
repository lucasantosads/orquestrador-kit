# Etapa 6c do kit — os dois bloqueantes da adoção do Actus, e uma chave que não era interruptor

Data: 2026-09-09. Kit `~/Projetos/orquestrador-kit`, `VERSAO` = `2.1.0-dev`, branch `main`.
Base: `50c061b` (fim da etapa 6b). Três commits, um por peça, **nada empurrado**.

| peça | commit | o que |
|---|---|---|
| **T1** | `9e9b67b` | `tsx` é dependência do MOTOR, e o motor para de sair para a rede |
| **M1** | `c496101` | o `--migrar` não sobrescreve um `000-config.proposto.json` existente |
| **D11** | `cff57a2` | `push_suprimido` é informativa, não interruptor (contrato; zero motor) |

**Procedência.** Nada aqui é de memória. O insumo foi
`~/orq-sessoes/revisao-adocao-actus.md` lido inteiro (307 linhas): a T1 é o bloqueante
**B-1**, a M1 é o **B-2**, a D11 é o achado **V-4**. Os itens **E-8** e **E-9** daquele
arquivo são correções ao *plano de adoção*, não ao kit — nenhum dos dois pede mudança de
motor, e por isso não viraram peça aqui; ficam registrados abaixo, na seção 5.

Regras respeitadas nesta sessão, todas verificáveis no `git log`: vermelho-antes no MESMO
commit de cada peça, "o que o CI faz diferente" provado por leitura do disco, `launchctl`
só pelo stub (`ORQ_TESTE=1` em toda a harness; nenhuma chamada real), um commit por peça,
**nenhum push**, **nenhuma chamada à API**.

---

## 1 · T1 · `tsx` é dependência do MOTOR

**O problema, medido.** O motor executa TypeScript por `npx tsx` em 14 chamadas, e o `npx`
sem flag BAIXA da rede o pacote que não encontra. Em `~/Projetos/actus-saas`,
`node_modules/.bin/` tem `next`, `tsc` e `vitest` e **não** tem `tsx`. A armadilha do B-1:
a Fase A da adoção passa (ela chama o `orq` DO KIT, que faz `cd` para o kit e acha o tsx de
lá) e o B3 quebra — prompt interativo num TTY, erro fora dele, tick mudo sob o launchd.

**A resolução, uma só, no `lib.sh`:**

```
TSX_LOCAL="$MAIN_CHECKOUT/node_modules/.bin/tsx"
if [ -x "$TSX_LOCAL" ]; then ORQ_TSX=( "$TSX_LOCAL" ); else ORQ_TSX=( npx --no-install tsx ); fi
tsx_bin()      { printf '%s\n' "${ORQ_TSX[*]}"; }
tsx_local_ok() { [ -x "$TSX_LOCAL" ]; }
```

`--no-install` é a peça: a rede fica de fora por CONSTRUÇÃO, ele falha rápido em vez de
baixar. `ORQ_TSX` é ARRAY porque o fallback tem três palavras — `$(tsx_bin)` sem aspas
resolveria isso por word-splitting e quebraria no primeiro checkout com espaço no caminho.

**Fallback e gate são separados de propósito.** O fallback mantém os verbos READ-ONLY do
`orq` respondendo num checkout de layout diferente; o gate impede DRENAR sem o binário do
repo. São perguntas diferentes e a peça não as mistura.

**As 14 chamadas**, todas para `"${ORQ_TSX[@]}"`: `scripts/orq` 63/293/310/373,
`executor.sh` 42/570/835/929, `local-loop.sh` 40/223/241, `enforcement.sh` 58,
`test-retry-worktree.sh` 346/350. A do `orq config` (a primeira) duplica a resolução em UMA
linha, porque aquele verbo é despachado ANTES do `lib.sh` de propósito — o bloco já
duplicava quatro linhas pelo mesmo motivo, e o comentário de lá passou de "quatro" a
"cinco". `launchd-run.sh:45` fica byte a byte: é comentário, não chamada.

**As três bocas do gate:**

1. `tsx_ou_sai` no `local-loop.sh`, **antes do lock**. Não é ordem arbitrária: o
   `lock_adquirir` já é TypeScript — `lock_stale` roda `tsx -e` —, e sem tsx ele falha, a
   falha é lida como "não é órfão" e o loop encerra com "outro run vivo": uma resposta
   ERRADA, em silêncio, sobre um lock que talvez nem exista. Em falta: `PREVOO_NOGO
   item=tsx` na trilha, notificação pelo canal, rc 1. **Não** chama `status_set` — estamos
   antes do lock, o STATUS é de quem o tem — e não toca ticket nenhum.
2. `orq prevoo` ganha a **cat.7 (toolchain)**, e ela vem PRIMEIRO: é a única cujo NO-GO
   explica as outras. Uma spec vendorizada impecável não serve de nada se o motor que a lê
   não existe.
3. `instalar.sh`: quarta recusa do `--atualizar` e recusa do `--novo`. `--forcar` NÃO
   dispensa (forçar copiaria um motor que não roda); `--dry-run` **só avisa**, pela
   previsão de recusa que ele já imprimia. A linha de instalação sai do lockfile do repo
   alvo (`pnpm-lock.yaml` → `pnpm add -D`, `package-lock.json` → `npm i -D`) e o range sai
   do `package.json` do kit, nunca de uma constante à parte.

**Teste.** `test/orquestrador-toolchain-tsx.test.ts`, **30 casos, 24 vermelhos antes**,
mais o caso (k) de `scripts/kit/test-instalar.sh`. O stub `test/fixtures/bin-sem-rede/npx`
existe para provar a NEGATIVA: ele registra toda chamada e sai 127, e o teste assevera o
log **vazio**. "Recusou" e "recusou sem tocar a rede" não são a mesma afirmação.

**Efeito colateral que a peça expôs, e consertou.** O `criarFixture` do harness montava um
checkout sem `node_modules` nenhum: aqueles fixtures rodavam TypeScript por `npx tsx` sem
dependência declarada em lugar algum, resolvendo na prática contra o cache do npx da
máquina. Era o mesmo buraco, dentro da própria harness. Agora ele linka
`node_modules/.bin/tsx` — do BINÁRIO, não do diretório, porque `pacotes_do_checkout`
detecta pacote por `find -type d` e symlink não é `-type d`.

**O que o CI faz diferente: NADA.** Medido hoje, só leitura:

```
$ grep -n '"tsx"' ~/Projetos/conteudos-infinitos/package.json
29:    "tsx": "^4.19.0",
$ ls -l ~/Projetos/conteudos-infinitos/node_modules/.bin/tsx
lrwxr-xr-x ... /node_modules/.bin/tsx -> ../tsx/dist/cli.mjs
$ ~/Projetos/conteudos-infinitos/node_modules/.bin/tsx --version
tsx v4.22.4 / node v24.19.0
```

E o `instalar.sh --atualizar <ci> --dry-run` segue prevendo as MESMAS duas recusas de antes
— pausa e STATUS `executando` —, nenhuma de tsx, com `git status --porcelain` do CI em
**zero linha antes e depois**.

---

## 2 · M1 · o `--migrar` não sobrescreve um proposto existente

**O problema.** `000-config.proposto.json` **é** o nome que o instalador usa
(`migrar-config.ts:47`, `NOME_PROPOSTO`): é onde o `--propor` escreve e de onde o
`--aplicar` lê. O `--propor` fazia `writeFileSync(propostoPath, ...)` sem guarda nenhuma. O
plano de adoção mandava a Fase A gravar o config revisado NESSE nome e só então rodar
`instalar.sh --atualizar . --migrar`: o `--migrar` apagava a revisão inteira e punha no
lugar a proposta de máquina com os 14 placeholders `<...>` intactos; o `cp` seguinte
instalava isso como oficial e o `orq config` saía rc 1 com 14 violações, onde o plano
esperava zero. Em silêncio — o instalador não avisava que tinha sobrescrito nada.

**A recusa.** `--propor` sai rc 1 quando o arquivo já existe, dizendo o que fazer com ele:
apagar, se é a proposta velha; RENOMEAR, se é a sua revisão. E dá o nome da convenção,
`000-config.revisado.json`, que o migrador **não conhece** — não lê, não escreve, não
apaga. `--dry-run` continua não gravando e ganha o AVISO de que o `--propor` de verdade
recusaria: um dry-run que diz "tudo certo" e um `--propor` que recusa logo depois é um
dry-run que mentiu.

**Por que uma classe de erro própria.** `Recusa` mapeia para rc 1; rc 2 continua sendo erro
de uso ou de leitura. A distinção existe para o `instalar.sh` poder REPASSAR só ela: ele
engole a saída das migrações com `|| true` porque lá rc != 0 é "esta etapa deu errado,
siga", e um `--migrar` que parasse por causa de uma delas deixaria o repo pela metade. Uma
recusa não é isso — nada foi escrito, e continuar imprimindo "passo humano: leia o
proposto" apontaria para o arquivo de outra pessoa. O resto do `--migrar` roda; o
`--atualizar` sai 1.

**Contrato.** `CONTRATO.md` §8 registra o nome reservado e a convenção da revisão humana;
§9.3 registra a recusa na tabela das migrações.

**Teste.** 11 casos em `test/orquestrador-migrar-config.test.ts`, **8 vermelhos antes**,
com o proposto pré-existente conferido **byte a byte** (`readFileSync(...).equals(antes)`).
Mais a (i3a) de `scripts/kit/test-instalar.sh`. Dois casos daquele arquivo mudaram de
veredito e é a peça funcionando: a (i3) rodava `--migrar` uma segunda vez sobre o proposto
que a (i2) acabara de gravar — virou (i3a), a recusa com o arquivo conferido, mais a (i3)
de sempre depois de tirar o proposto do caminho.

**O que o CI faz diferente: NADA.** Nenhum dos três repos do disco tem
`docs/fila/000-config.proposto.json` (nem `000-config.revisado.json`) — conferido hoje nos
três. A guarda só dispara na SEGUNDA passada, que é exatamente o caso do plano de adoção.

---

## 3 · D11 · `push_suprimido` é informativa, não interruptor

**Zero motor, e é a peça.** O motor está certo. Ele não pusha por CONSTRUÇÃO — o
`local-loop.sh` abre dizendo "Sem push: publicar é humano" e não há uma invocação de
`git push` no motor inteiro — e o snapshot diz `push suprimido (publicar é humano neste
repo)` **sempre**, em `lib.sh:staging_linha`, sem consultar config nenhum.

**O que a chave não é.** `push_suprimido` não está em `config-chaves.ts` e nenhum script a
lê. O config do CI a tem em `false` e mesmo assim o loop de lá não pusha; o `fixture/` do
kit a tem em `true`. Dois repos, dois valores, um comportamento — é isso que faz dela um
registro e não um gate. Tratar um valor como garantia quando ninguém o consulta é a forma
mais cara de segurança: ela não falha, ela simplesmente nunca esteve lá.

**Quem impede, de verdade:**

1. `proibicoes_absolutas.tools` com `Bash(git push:*)` — vai na flag `--disallowedTools` E
   é tirado da allowlist derivada do ticket (`perfil.ts:filtrarPeloPiso`).
2. `branch_protegida` — `local-loop.sh:merge_em_alvo` a recusa como alvo E como HEAD da
   worktree de merge, com duas linhas `merge recusado`.

**Escrito em três lugares:** `CONTRATO.md` §8; o comentário `_push_suprimido`
imediatamente antes da chave no template (um `_x` longe do `x` é comentário que ninguém lê
na hora de decidir o valor); e a tabela de kill switches de
`doutrina/references/autoalimentacao.md`, que listava a chave como um — a única correção de
conteúdo da peça, e ela estava dizendo o oposto do contrato.

**Teste.** `test/orquestrador-push-suprimido.test.ts`, **14 casos, 3 vermelhos antes**. Os
outros 11 já eram verdes por construção e é justamente esse o ponto: eles TRANCAM a
afirmação contra o disco, para que "é informativa" pare de ser uma frase que alguém
reverifica por grep a cada leitura. O grep de `git push` traz o próprio NEGATIVO (as cinco
formas reais de invocar casam; a prosa do prompt que PROÍBE o agente de dar um push não
casa) — e foi ele que pegou o buraco da primeira versão do padrão, que não via um
`git push` indentado.

**O que o CI faz diferente: NADA** — nenhuma linha de motor mudou.

---

## 4 · Fechamento: as três suítes, cruas

```
$ npx tsc --noEmit
(saída vazia, rc 0)

$ npx vitest run
 Test Files  43 passed (43)
      Tests  1105 passed (1105)
   Duration  20.97s
rc 0

$ bash scripts/kit/test-shell.sh
== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
TODOS OS SCRIPTS SAÍRAM rc 0
rc 0

$ bash scripts/kit/test-instalar.sh
TODOS OS CHECKS PASSARAM        (134 `ok`, 0 `FALHA`)
rc 0
```

Base da etapa: 41 arquivos / 1050 casos. Agora: **43 arquivos / 1105 casos** — 55 casos
novos, dos quais **35 vermelhos antes** (24 + 8 + 3).

O caso (c) do `test-instalar.sh` — o `--verificar` contra o checkout do CI, só leitura, não
assertivo por decisão — acusa as 8 divergências esperadas, que são exatamente os arquivos
que esta etapa mudou:

```
diferente   scripts/orquestrador/enforcement.sh
diferente   scripts/orquestrador/executor.sh
diferente   scripts/orquestrador/lib.sh
diferente   scripts/orquestrador/local-loop.sh
diferente   scripts/orquestrador/prevoo.ts
diferente   scripts/orquestrador/test-retry-worktree.sh
diferente   scripts/orq
diferente   test/fixtures/orq-harness.ts
```

É achado, não falha: o CI recebe o motor novo quando alguém rodar o `--atualizar` lá, com o
loop pausado.

---

## 5 · O `--dry-run` no Actus, de novo (só leitura)

```
$ git -C ~/Projetos/actus-saas status --porcelain | wc -l
      21
$ bash instalar.sh --atualizar ~/Projetos/actus-saas --migrar --dry-run
(rc 0)
$ git -C ~/Projetos/actus-saas status --porcelain | wc -l
      21
$ diff <(antes) <(depois)
(vazio — ÁRVORE IDÊNTICA, zero escrita)
```

**Os números não mudaram**, o que é o resultado que se quer: 90 diferenças, **14
violações**, **12 decisões** locais esperando alguém, 7 renomes, liberações 5→5, nenhum
ticket a migrar. Idênticos aos da etapa 6b.

**A única linha nova** é a da T1, na previsão de recusa:

```
O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/actus-saas' não está pausado: não existe nem
    docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar
    "atualizando o motor"' dentro do repo e tente de novo.
  · '/Users/lucasantos/Projetos/actus-saas' não tem node_modules/.bin/tsx: o motor do
    orquestrador é TypeScript e nenhuma parte dele roda sem tsx. Instale a dependência de
    DESENVOLVIMENTO no repo, com o loop pausado, e repita: pnpm add -D tsx@^4.19.0
  (a recusa não impede este dry-run de listar tudo)
```

`pnpm add -D` e não `npm i -D` porque o Actus tem `pnpm-lock.yaml` — a escolha é do
lockfile no disco, não de um padrão. Nenhum aviso da M1, porque o Actus não tem
`000-config.proposto.json`.

O `--dry-run` também continua terminando em `(o repo ainda não tem scripts/orq
executável)`: o Actus ainda não recebeu o motor, e é a adoção que vai levá-lo.

### O que MUDA no plano de adoção, por causa desta etapa

- **B0/B1 · o `pnpm add -D tsx@^4.19.0` deixou de ser opcional na prática.** Antes era um
  passo que, se esquecido, quebrava lá adiante sem dizer por quê. Agora o `--atualizar`
  RECUSA e diz a linha exata. A ordem da revisão continua valendo: pausar primeiro, instalar
  depois — `pnpm add` mexe no `node_modules` e no lockfile, e isso não se faz por baixo de
  uma drenagem viva.
- **B3 · o nome do config revisado.** A revisão já mandava usar
  `docs/fila/000-config.revisado.json`; agora o kit **força** isso, porque o `--migrar`
  recusa gravar por cima do proposto. Se alguém insistir no nome antigo, o instalador
  para e explica, em vez de apagar o trabalho.
- **B5 · a conferência de 2 segundos** que a revisão pedia (`bash scripts/orq prevoo && echo
  "PREVOO GO"`) agora tem um item com nome: `cat.7 (toolchain)`, e é o primeiro da lista.

### E-8 e E-9: correções ao PLANO, não ao kit

Os dois foram lidos e conferidos contra o disco nesta sessão, e **nenhum pede mudança de
motor** — por isso não viraram peça:

- **E-8** · `orq config` não aceita argumento (`scripts/orq:59`) e resolve o caminho
  sozinho, sempre o OFICIAL. Para validar um arquivo arbitrário, o CLI por baixo aceita
  caminho — é assim que o próprio `migrar-config.ts` valida o proposto. Continua verdade
  depois da T1: a única mudança naquele bloco foi a resolução do `tsx`.
- **E-9** · `scripts/orq validar` **sem** `ORQ_EXEC_ROOT` resolve tudo para o kit, que não
  tem fila; o passo 5 da Fase A precisa do `ORQ_EXEC_ROOT=.` que o passo 3 já usa. Também
  continua verdade: `lib.sh:24` (`ROOT`) não foi tocado.

---

## 6 · O que NÃO foi feito nesta etapa

- **B-3 da revisão** (o `--atualizar` recusa por `higiene-de-execucao.md` não commitado no
  Actus) — é decisão do dono do repo sobre um arquivo dele, não mudança de kit.
- **V-1, V-2, V-3, V-5** — são decisões a tomar na revisão do config do Actus (gates por
  binário local, o significado do gate `typecheck`, as duas metades de
  `proibicoes_absolutas`, os tetos de orçamento). O kit já diz o que precisa dizer sobre
  cada uma; escolher é do humano.
- **Nada empurrado.** Os três commits estão só em `main` local.

---

## 7 · O diff cru, `50c061b..HEAD`

```
cff57a2 D11: push_suprimido é INFORMATIVA, não interruptor (contrato; zero motor)
c496101 M1: o --migrar não sobrescreve um 000-config.proposto.json existente
9e9b67b T1: tsx é dependência do MOTOR, e o motor para de sair para a rede

 CONTRATO.md                                 |  38 ++-
 doutrina/references/autoalimentacao.md      |   2 +-
 doutrina/templates/config.json              |   1 +
 instalar.sh                                 |  91 +++++-
 scripts/kit/test-instalar.sh                |  72 ++++-
 scripts/orq                                 |  29 +-
 scripts/orquestrador/enforcement.sh         |   2 +-
 scripts/orquestrador/executor.sh            |   8 +-
 scripts/orquestrador/lib.sh                 |  40 +++
 scripts/orquestrador/local-loop.sh          |  39 ++-
 scripts/orquestrador/migrar-config.ts       |  61 +++-
 scripts/orquestrador/prevoo.ts              |  55 +++-
 scripts/orquestrador/test-retry-worktree.sh |   4 +-
 test/fixtures/bin-sem-rede/npx              |  24 ++
 test/fixtures/orq-harness.ts                |  23 +-
 test/orquestrador-migrar-config.test.ts     | 175 ++++++++++-
 test/orquestrador-prevoo.test.ts            |  24 +-
 test/orquestrador-push-suprimido.test.ts    | 166 ++++++++++
 test/orquestrador-toolchain-tsx.test.ts     | 471 ++++++++++++++++++++++++++++
 19 files changed, 1277 insertions(+), 48 deletions(-)
```

<details><summary><code>git diff 50c061b..HEAD</code> — 1801 linhas</summary>

```diff
diff --git a/CONTRATO.md b/CONTRATO.md
index e21fcfe..be3961c 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -407,6 +407,42 @@ verificam nada (no CI é o `limpeza_artefatos`, um `rm -rf` do artefato de build
 que roda antes dos gates de verdade). Gate que não verifica não aparece na linha
 GATE, e é correto que não apareça.
 
+**`push_suprimido` é INFORMATIVA — não é interruptor** (peça D11). A chave não
+está em `config-chaves.ts` e nenhum script do motor a lê: o valor não muda
+comportamento nenhum, e o config do CI a tem em `false` sem que o loop de lá
+pushe. O motor não pusha **por construção** — `local-loop.sh` abre dizendo "Sem
+push: publicar é humano" e não há um único `git push` no motor. Quem *impede* o
+push são outras duas coisas, e são elas que se conferem quando a pergunta é
+"tem como isto publicar sozinho?":
+
+1. `proibicoes_absolutas.tools` com `Bash(git push:*)` — o piso vai na flag
+   `--disallowedTools` E é tirado da allowlist derivada do ticket
+   (`perfil.ts:filtrarPeloPiso`): o ticket pede, o config nega, o config ganha.
+2. `branch_protegida` — `local-loop.sh:merge_em_alvo` recusa mergear nela e
+   recusa mergear a partir de uma worktree que esteja nela.
+
+O snapshot diz `push suprimido (publicar é humano neste repo)` **sempre**
+(`lib.sh:staging_linha`), por construção e não por leitura do config. Escrever a
+chave como registro da decisão é legítimo; tratá-la como o que segura o push é
+confiar num interruptor que não está ligado a nada.
+
+**`000-config.proposto.json` é NOME RESERVADO do instalador.** É onde o
+`migrar-config.ts --propor` escreve e de onde o `--aplicar` lê. Desde a peça M1
+o `--propor` **RECUSA** (rc 1) se o arquivo já existir, e o `instalar.sh
+--atualizar --migrar` repassa a recusa em vez de engoli-la — o `--dry-run`
+avisa e continua sem escrever. Antes disso o `writeFileSync` era incondicional:
+um segundo `--migrar` reescrevia por cima de um proposto já revisado e
+preenchido, em silêncio, e o `--aplicar` seguinte instalava a versão de máquina
+com os placeholders `<...>` intactos.
+
+Por isso **revisão humana usa outro nome**: a convenção do kit é
+`docs/fila/000-config.revisado.json`, que o instalador não conhece — não lê, não
+escreve, não apaga. Quem trabalhou o config em separado copia o revisado por
+cima do oficial (com o `.bak` sob sua responsabilidade) **depois** de rodar o
+`--migrar`; usar o nome do proposto para isso é entregar o arquivo ao
+instalador. O `--aplicar` continua sendo o caminho de quem preencheu o proposto
+no lugar dele: ele MOVE o que foi lido, sem recalcular.
+
 `orq config` roda ANTES do `lib.sh` (`scripts/orq`, topo) e resolve o caminho do
 config sem ele. O `lib.sh` lê o config no carregamento, então um
 `000-config.json` ilegível derrubava o `orq` inteiro com rc 5 — a ferramenta que
@@ -488,7 +524,7 @@ agendar um loop que não roda.
 |---|---|---|
 | `migrar_pausa` (em `instalar.sh`) | `docs/fila/.orq-pause` → `docs/fila/PAUSAR`, motivo preservado (§7) | `mv`; recusa com os dois presentes |
 | `migrar-liberacoes.ts` | `liberacoes.json` de qualquer forma viva (§6.1) para v2 | `--aplicar` grava e deixa `.bak` |
-| `migrar-config.ts` | `000-config.json` schema 1 → 2, pela tabela de `config-tabela.ts` | **`--propor` só**: grava `000-config.proposto.json` ao lado. O oficial nunca é tocado pelo instalador |
+| `migrar-config.ts` | `000-config.json` schema 1 → 2, pela tabela de `config-tabela.ts` | **`--propor` só**: grava `000-config.proposto.json` ao lado, e RECUSA (rc 1) se ele já existir (M1). O oficial nunca é tocado pelo instalador |
 | `migrar-tickets.ts` | o bloco ```json dos tickets `pendente`: `tentativas_consumidas` → `tentativas`, `recon_esperado` → `recon` | `--aplicar` grava **sem** `.bak` |
 | `relatar_gitignore` (em `instalar.sh`) | nada — RELATA o que o repo deve ignorar (§7) | nunca escreve |
 | `orq validar --pendentes` | nada — RELATA o que a migração deliberadamente não inventou | read-only |
diff --git a/doutrina/references/autoalimentacao.md b/doutrina/references/autoalimentacao.md
index 520d8fb..50b48f9 100644
--- a/doutrina/references/autoalimentacao.md
+++ b/doutrina/references/autoalimentacao.md
@@ -155,7 +155,7 @@ Orçamento nasce **medido**: duas semanas com teto alto e `orq custo` diário; d
 | `loops.executor.ativo: false` | fila não é drenada; sentinela/planejador também não (dependem de merge/fila) |
 | `loops.sentinela.ativo: false` | sem coleta |
 | `loops.planejador.ativo: false` | sem reposição |
-| `push_suprimido: true` | merge local na staging sem push |
+| ~~`push_suprimido: true`~~ | **NÃO é kill switch** (D11): nenhum script lê a chave. O merge é local e sem push por construção; quem impede é `proibicoes_absolutas.tools` com `Bash(git push:*)` e a `branch_protegida`. Ver `CONTRATO.md` §8. |
 | `modo: dry_run` (global) | executor roda gates mas não mergeia; planejador só candida |
 
 Lidos no passo 0 de toda drenagem **e entre tickets**. `orq pausar` / `orq retomar` só criam/removem o arquivo; nunca matam processo.
diff --git a/doutrina/templates/config.json b/doutrina/templates/config.json
index 5031bc2..029cbce 100644
--- a/doutrina/templates/config.json
+++ b/doutrina/templates/config.json
@@ -23,6 +23,7 @@
   "_modo": "agendado = uma drenagem por disparo. continuo = drenagens em sequência no MESMO processo com sleep de intervalo_min, relendo config e kill switches a cada ciclo. dry_run = executor roda gates mas não mergeia; planejador só gera candidatos.",
   "modo": "agendado",
   "intervalo_min": 30,
+  "_push_suprimido": "INFORMATIVO, não é interruptor (peça D11). Nenhum script do motor lê esta chave: ela não está em config-chaves.ts e o valor não muda comportamento nenhum — o CI a tem em false e mesmo assim não pusha. Quem impede o push é (1) proibicoes_absolutas.tools com Bash(git push:*), que sai na flag --disallowedTools E é tirado da allowlist derivada do ticket, e (2) branch_protegida, que o local-loop recusa mergear e da qual o executor só CRIA branch. O snapshot diz 'push suprimido' sempre (lib.sh:staging_linha), por construção e não por config. Escreva-a como registro da decisão; não a trate como o que segura o push.",
   "push_suprimido": false,
   "loops": {
     "_descricao": "Kill switches por loop. Nascem desligados exceto executor. Ligar na ordem: executor → sentinela → planejador (dry_run) → planejador (auto).",
diff --git a/instalar.sh b/instalar.sh
index c3a234d..da09460 100644
--- a/instalar.sh
+++ b/instalar.sh
@@ -56,6 +56,44 @@ VERSAO="$(cat "$KIT/VERSAO")"
 
 die() { printf 'instalar.sh: %s\n' "$*" >&2; exit 2; }
 
+# --- tsx: dependência do MOTOR, não do produto (peça T1) ----------------------
+# O motor é TypeScript e o `lib.sh` resolve o binário em
+# `<checkout>/node_modules/.bin/tsx`. Um repo sem essa dependência recebe a
+# instalação inteira e só descobre o buraco no primeiro disparo do launchd —
+# onde o sintoma é um tick morto sem linha de log. Por isso a checagem é do
+# INSTALADOR: ele é o único momento em que há um humano olhando.
+#
+# O range NÃO é constante deste arquivo: sai do `package.json` do kit, que é o
+# mesmo do CI (`tsx: ^4.19.0`). Escrever o número à mão aqui criaria a segunda
+# fonte de verdade que diverge na primeira atualização do kit.
+TSX_RANGE="$(sed -n 's/.*"tsx": *"\([^"]*\)".*/\1/p' "$KIT/package.json" | head -1)"
+[ -n "$TSX_RANGE" ] || TSX_RANGE='^4.19.0'
+
+# tem_tsx <repo> — 0 quando `<repo>/node_modules/.bin/tsx` existe e é
+# executável. A MESMA pergunta do `lib.sh:tsx_local_ok` e da `cat.7` do pré-voo;
+# `test -x` e nada mais, sem rede e sem processo.
+tem_tsx() { [ -x "$1/node_modules/.bin/tsx" ]; }
+
+# linha_instala_tsx <repo> — o comando CERTO para aquele repo, escolhido pelo
+# lockfile no disco. Não é cosmético: mandar `npm i` num repo com
+# `pnpm-lock.yaml` cria um segundo lockfile e um `node_modules` que o pnpm não
+# reconhece — e o `pnpm install` seguinte purga o que o npm deixou.
+linha_instala_tsx() {
+  local repo="$1"
+  if [ -f "$repo/pnpm-lock.yaml" ]; then printf 'pnpm add -D tsx@%s' "$TSX_RANGE"
+  elif [ -f "$repo/package-lock.json" ]; then printf 'npm i -D tsx@%s' "$TSX_RANGE"
+  else printf 'npm i -D tsx@%s   (ou o equivalente do gerenciador deste repo)' "$TSX_RANGE"
+  fi
+}
+
+# recusa_tsx <repo> — a frase única da recusa, para as três bocas (--atualizar,
+# --dry-run e --novo) dizerem a MESMA coisa.
+recusa_tsx() {
+  local repo="$1"
+  printf "'%s' não tem node_modules/.bin/tsx: o motor do orquestrador é TypeScript e nenhuma parte dele roda sem tsx. Instale a dependência de DESENVOLVIMENTO no repo, com o loop pausado, e repita: %s\n" \
+    "$repo" "$(linha_instala_tsx "$repo")"
+}
+
 uso() {
   cat <<'USO'
 uso: bash instalar.sh --verificar <repo>
@@ -66,7 +104,7 @@ uso: bash instalar.sh --verificar <repo>
   --atualizar <repo>   copia o motor do kit por cima do de <repo>
       --dry-run        só lista o que mudaria (e o que o --atualizar recusaria); sai 0
       --forcar         segue mesmo com modificação não commitada no motor do repo
-                       (NÃO passa por cima da pausa nem do STATUS)
+                       (NÃO passa por cima da pausa, do STATUS nem do tsx ausente)
       --migrar         TAMBÉM migra docs/fila/** (pausa, liberações) — o único
                        caso em que o instalador toca os dados do dono
   --novo <repo>        instala num repo git que ainda NÃO tem docs/fila
@@ -275,6 +313,11 @@ relatar_gitignore() {
   [ "$faltando" = 0 ] || printf '\nO instalador NÃO edita o .gitignore de repo existente: ele é do dono.\n'
 }
 
+# 1 quando alguma migração RECUSOU (hoje só o config, peça M1). Não é erro: é o
+# instalador funcionando. Vira rc 1 do `--atualizar`, para que quem chamou por
+# script não leia "atualizado" onde houve um passo por fazer.
+MIGRAR_RECUSOU=0
+
 # migrar_tudo <repo> <dry|aplicar> — a sequência inteira, na ordem.
 migrar_tudo() {
   local repo="$1" modo="$2"
@@ -306,11 +349,21 @@ migrar_tudo() {
   fi
 
   printf '\n'
-  local cfg="$repo/docs/fila/000-config.json"
+  local cfg="$repo/docs/fila/000-config.json" cfg_rc=0
   if [ -f "$cfg" ]; then
     ( cd "$KIT" && npx tsx scripts/orquestrador/migrar-config.ts "$cfg" \
-        "$([ "$modo" = aplicar ] && echo --propor || echo --dry-run)" ) || true
-    if [ "$modo" = aplicar ]; then
+        "$([ "$modo" = aplicar ] && echo --propor || echo --dry-run)" ) || cfg_rc=$?
+    # rc 1 é RECUSA do migrador — ele funcionando e dizendo não —, e o
+    # instalador a repassa em vez de engoli-la (peça M1). As outras migrações
+    # continuam com `|| true`: lá rc != 0 é "esta etapa deu errado, siga", e um
+    # `--migrar` que para por causa de uma delas deixaria o repo pela metade.
+    # Aqui é o contrário: nada foi escrito, e continuar imprimindo "passo
+    # humano: leia o proposto" apontaria para o arquivo de OUTRA pessoa.
+    if [ "$cfg_rc" = 1 ]; then
+      MIGRAR_RECUSOU=1
+      printf '\nRECUSADO pelo migrar-config (acima): o config NÃO foi proposto e NADA foi escrito.\n'
+      printf 'O resto da migração já rodou; refaça só esta etapa depois de resolver o nome.\n'
+    elif [ "$modo" = aplicar ]; then
       printf '\nO config NÃO foi aplicado, e isso é a peça funcionando. Passo humano:\n'
       printf '  1. leia %s/docs/fila/000-config.proposto.json\n' "$repo"
       printf '  2. preencha os placeholders <...> (o relatório acima lista cada um e por quê)\n'
@@ -347,14 +400,18 @@ migrar_tudo() {
 # O que ele NÃO toca: docs/fila/** (tickets, 000-config.json, liberacoes.json),
 # PLAYBOOK e PECAS do repo. Migração de artefato legado é K8b.
 #
-# As três recusas, e por que cada uma:
+# As quatro recusas, e por que cada uma:
 #   1. loop não pausado — copiar o motor por baixo de uma drenagem viva troca o
 #      lib.sh de um executor que já está rodando. `--forcar` NÃO passa por cima:
 #      não existe pressa que justifique isso.
 #   2. STATUS.md diz outra coisa que não `ocioso` — mesmo motivo, por outra
 #      testemunha: o snapshot é o que o próprio loop afirma sobre si. Ausência de
 #      STATUS.md não é recusa (repo que nunca drenou).
-#   3. modificação não commitada no motor do repo — copiar por cima apaga
+#   3. `node_modules/.bin/tsx` ausente no repo (peça T1) — o motor é TypeScript
+#      e nenhuma parte dele roda sem ele. Instalar assim entrega um orquestrador
+#      que só falha no primeiro disparo do launchd, onde ninguém está olhando.
+#      `--forcar` não dispensa: forçar copiaria um motor que não roda.
+#   4. modificação não commitada no motor do repo — copiar por cima apaga
 #      trabalho sem registro no git. É a ÚNICA que `--forcar` dispensa, porque
 #      às vezes a modificação é lixo conhecido, e aí a perda é decisão de quem
 #      olhou. Os caminhos conferidos são os MESMOS que o bloco de cópia escreve,
@@ -362,7 +419,7 @@ migrar_tudo() {
 # motivos_de_recusa <repo> — imprime UM motivo por linha (vazio = pode seguir).
 # Existe separada porque o `--dry-run` também precisa dela: um dry-run que diz
 # "tudo certo" e um `--atualizar` que RECUSA logo depois é um dry-run que
-# mentiu. As duas recusas aqui são as que `--forcar` NÃO dispensa; a terceira
+# mentiu. As TRÊS recusas aqui são as que `--forcar` NÃO dispensa; a quarta
 # (árvore suja) fica no atualizar(), porque só ela depende do `--forcar`.
 motivos_de_recusa() {
   local repo="$1"
@@ -379,6 +436,12 @@ motivos_de_recusa() {
     printf "docs/fila/runs/STATUS.md de '%s' não diz 'ocioso': %s. Espere a drenagem em curso terminar.\n" \
       "$repo" "$(grep -E '^ESTADO' "$status_md" | head -1 | sed 's/  */ /g')"
   fi
+  # 3. tsx (peça T1). Vem por ÚLTIMO de propósito: as duas de cima são sobre não
+  #    atropelar um run vivo, e essa é a ordem em que se quer ouvi-las. Aqui
+  #    também não cede a `--forcar`: forçar copiaria um motor que não roda.
+  if ! tem_tsx "$repo"; then
+    recusa_tsx "$repo"
+  fi
 }
 
 atualizar() {
@@ -413,14 +476,14 @@ atualizar() {
     return 0
   fi
 
-  # --- recusas 1 e 2 · nenhuma delas cede a --forcar -------------------------
+  # --- recusas 1, 2 e 3 · nenhuma delas cede a --forcar ----------------------
   # Copiar o motor por baixo de uma drenagem viva troca o lib.sh de um executor
   # que já está rodando. Não existe pressa que justifique isso.
   local motivos
   motivos="$(motivos_de_recusa "$repo")"
   [ -z "$motivos" ] || recusa "$(printf '%s' "$motivos" | head -1)"
 
-  # --- recusa 3 · o motor do repo não pode ter mudança fora do git -----------
+  # --- recusa 4 · o motor do repo não pode ter mudança fora do git -----------
   # A lista de caminhos é a MESMA que o bloco de cópia escreve, e é por isso que
   # ela inclui scripts/roadmap (peça K8c). Desde a K5b o --atualizar ESCREVE ali
   # — scripts/roadmap/ é motor vendorizado: `orq mapa lint` roda
@@ -465,6 +528,10 @@ atualizar() {
   # de `só no repo` aqui é justamente o que NÃO foi apagado, e é para ser lido.
   local rc=0
   verificar "$repo" || rc=$?
+  # Uma migração RECUSADA é rc 1 mesmo com o motor idêntico ao kit: a cópia deu
+  # certo e um passo dos dados ficou por fazer, e essas duas coisas não podem
+  # sair pelo mesmo 0.
+  [ "$MIGRAR_RECUSOU" = 0 ] || rc=1
 
   # DOIS commits, não um. O motor é vendorizado e o diff dele é "o kit mudou";
   # `docs/fila/**` são os dados do dono e o diff é "os meus dados mudaram de
@@ -574,6 +641,12 @@ novo() {
   [ ! -d "$repo/docs/fila" ] \
     || recusa "'$repo' já tem docs/fila — este é o verbo errado. Um --novo que sobrescreve fila é um --novo que apaga tickets. Use: bash instalar.sh --atualizar $repo"
 
+  # tsx (peça T1): antes de escrever o primeiro byte. Um `--novo` que instala o
+  # motor num repo sem tsx entrega um orquestrador que não dá o primeiro passo —
+  # e o `--novo` termina justamente listando os PRÓXIMOS PASSOS, todos deles a
+  # partir do passo 2 impossíveis sem ele.
+  tem_tsx "$repo" || recusa "$(recusa_tsx "$repo")"
+
   printf 'NOVO       kit %s (%s)\n' "$VERSAO" "$KIT"
   printf '           repo %s\n\n' "$repo"
 
diff --git a/scripts/kit/test-instalar.sh b/scripts/kit/test-instalar.sh
index 85f150f..2108102 100644
--- a/scripts/kit/test-instalar.sh
+++ b/scripts/kit/test-instalar.sh
@@ -323,7 +323,25 @@ printf '%s\n' "$saida" | grep -vE '^[-+ ]' | sed 's/^/  | /'
 printf '%s' "$saida" | grep -q 'git commit -m .fila: migrada' \
   && ok "sugere um SEGUNDO commit, separado, para os dados migrados" || falha "não sugeriu o commit da fila"
 
+echo "-- (i3a) M1: a SEGUNDA passada recusa sobrescrever o proposto da primeira --"
+# `000-config.proposto.json` é nome reservado do instalador, e a (i2) acabou de
+# gravá-lo. Rodar `--migrar` de novo por cima dele apagaria, em silêncio, o
+# arquivo que alguém pode já ter revisado e preenchido — o bloqueante B-2 da
+# revisão de adoção do Actus. Desde a peça M1 é rc 1, com o arquivo intacto.
+CK_PROP="$(cksum < "$MIG/docs/fila/000-config.proposto.json")"
+saida="$(bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar 2>&1)"; rc=$?
+[ "$rc" = 1 ] && ok "rc 1 (recusa, não erro)" || falha "rc $rc (esperava 1)"
+printf '%s' "$saida" | grep -q 'RECUSADO pelo migrar-config' \
+  && ok "o instalador REPASSA a recusa" || falha "o instalador engoliu a recusa"
+printf '%s' "$saida" | grep -q '000-config.revisado.json' \
+  && ok "a mensagem dá o nome que a revisão humana deve usar" || falha "não deu o nome alternativo"
+[ "$(cksum < "$MIG/docs/fila/000-config.proposto.json")" = "$CK_PROP" ] \
+  && ok "o proposto sobrevive byte a byte" || falha "o proposto foi sobrescrito"
+
 echo "-- (i3) rodar de novo é no-op, e o .bak NÃO é sobrescrito --"
+# Sem o proposto no caminho (é ele que a (i3a) acabou de proteger), a segunda
+# passada volta a ser o no-op que as outras migrações sempre foram.
+rm -f "$MIG/docs/fila/000-config.proposto.json"
 CK_BAK="$(cksum < "$MIG/docs/fila/liberacoes.json.bak")"
 saida="$(bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar 2>&1)"; rc=$?
 [ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
@@ -375,6 +393,9 @@ CFG_ANTES="$(cksum < "$MIG/docs/fila/000-config.json")"
 COMARKA_CFG="$HOME/Projetos/comarka-operacional/docs/fila/000-config.json"
 if [ -f "$COMARKA_CFG" ]; then
   cp "$COMARKA_CFG" "$MIG/docs/fila/000-config.json"
+  # O proposto da passada anterior sai do caminho: desde a M1 ele é nome
+  # reservado e o `--propor` recusa gravar por cima (exercitado na (i3a)).
+  rm -f "$MIG/docs/fila/000-config.proposto.json"
   CK_V1="$(cksum < "$MIG/docs/fila/000-config.json")"
   saida="$(bash "$KIT/instalar.sh" --atualizar "$MIG" --migrar 2>&1)"
   printf '%s' "$saida" | grep -q 'supabase_project_id → ambiente_id' \
@@ -454,8 +475,10 @@ NOVO="$(mktemp -d /tmp/orq-novo-XXXXXX)"
 trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1; rm -rf "$COPIA" "$COPIA_ROADMAP" "$COPIA_UPD" "$COPIA_EXTRA" "$COPIA_SUJA" "$COPIA_TESTES" "$COPIA_MIGRAR" "$NOVO"' EXIT
 ( cd "$NOVO" && git init -q && printf 'node_modules/\n' > .gitignore \
   && git add -A && git -c user.email=t@example.invalid -c user.name=t commit -qm inicial ) >/dev/null 2>&1
-# node_modules por symlink: o `orq config` roda `npx tsx`, e sem isso o npx
-# tentaria BAIXAR o tsx da rede no meio de um teste.
+# node_modules por symlink: o motor é TypeScript, e desde a peça T1 o `--novo`
+# RECUSA repo sem `node_modules/.bin/tsx` (caso (k) abaixo). Antes da T1 este
+# link existia por outro motivo — sem ele o `npx` tentava BAIXAR o tsx da rede
+# no meio de um teste —, e é essa ida à rede que a peça tirou do caminho.
 ln -sfn "$KIT/node_modules" "$NOVO/node_modules"
 
 echo "-- (j1) o repo nasce inteiro --"
@@ -522,6 +545,51 @@ printf '%s' "$saida" | grep -q 'não é um repositório git' \
   && ok "não escreveu NADA no diretório recusado" || falha "escreveu antes de recusar"
 rm -rf "$SEMGIT"
 
+# --- (k) · T1 · repo sem tsx: recusa nomeada, e o --dry-run só avisa ----------
+# O bloqueante B-1 da revisão de adoção do Actus (2026-09-09), reduzido ao que o
+# instalador pode provar: o motor é TypeScript e o `lib.sh` resolve o binário em
+# `<checkout>/node_modules/.bin/tsx`. Instalar num repo sem essa dependência
+# entrega um orquestrador que só falha no primeiro disparo do launchd — onde
+# ninguém está olhando. A recusa é do instalador porque é o único momento com um
+# humano na frente.
+echo
+echo "== (k) T1 · sem node_modules/.bin/tsx =="
+SEM_TSX="$(mktemp -d /tmp/orq-sem-tsx-XXXXXX)"
+trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1; rm -rf "$COPIA" "$COPIA_ROADMAP" "$COPIA_UPD" "$COPIA_EXTRA" "$COPIA_SUJA" "$COPIA_TESTES" "$COPIA_MIGRAR" "$NOVO" "$SEM_TSX"' EXIT
+cp -R "$FX/." "$SEM_TSX/"
+rm -f "$SEM_TSX/node_modules"            # no fixture ele é symlink para o do kit
+printf 'pausado para o teste\n' > "$SEM_TSX/docs/fila/PAUSAR"
+
+echo "-- (k1) --atualizar RECUSA, nomeando o caminho e o comando --"
+saida="$(bash "$KIT/instalar.sh" --atualizar "$SEM_TSX" 2>&1)"; rc=$?
+printf '%s\n' "$saida" | sed 's/^/  | /'
+[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
+printf '%s' "$saida" | grep -q 'RECUSADO' && ok "diz RECUSADO" || falha "não diz RECUSADO"
+printf '%s' "$saida" | grep -q 'node_modules/.bin/tsx' \
+  && ok "nomeia node_modules/.bin/tsx" || falha "não nomeia o caminho"
+printf '%s' "$saida" | grep -qE 'tsx@\^[0-9]' && ok "dá a linha de instalação" || falha "não dá a linha"
+
+echo "-- (k2) --forcar NÃO dispensa (forçar copiaria um motor que não roda) --"
+bash "$KIT/instalar.sh" --atualizar "$SEM_TSX" --forcar >/dev/null 2>&1; rc=$?
+[ "$rc" = 1 ] && ok "rc 1 com --forcar" || falha "rc $rc com --forcar (esperava 1)"
+
+echo "-- (k3) --dry-run SÓ AVISA: sai 0, prevê a recusa e não escreve nada --"
+antes="$(git -C "$SEM_TSX" status --porcelain 2>/dev/null)"
+saida="$(bash "$KIT/instalar.sh" --atualizar "$SEM_TSX" --dry-run 2>&1)"; rc=$?
+[ "$rc" = 0 ] && ok "rc 0 (o dry-run não é o gate)" || falha "rc $rc (esperava 0)"
+printf '%s' "$saida" | grep -q 'RECUSARIA' && ok "prevê a recusa" || falha "não prevê a recusa"
+printf '%s' "$saida" | grep -q 'node_modules/.bin/tsx' \
+  && ok "e diz qual" || falha "não diz qual"
+[ "$antes" = "$(git -C "$SEM_TSX" status --porcelain 2>/dev/null)" ] \
+  && ok "árvore idêntica antes e depois" || falha "o dry-run escreveu"
+
+echo "-- (k4) com o tsx de volta, o --atualizar segue normalmente --"
+ln -sfn "$KIT/node_modules" "$SEM_TSX/node_modules"
+saida="$(bash "$KIT/instalar.sh" --atualizar "$SEM_TSX" 2>&1)"; rc=$?
+[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
+printf '%s' "$saida" | grep -q 'node_modules/.bin/tsx' \
+  && falha "ainda reclama do tsx" || ok "nenhuma reclamação de tsx"
+
 # --- (c) ---------------------------------------------------------------------
 echo
 echo "== (c) $CI_CHECKOUT (SÓ LEITURA — o resultado é achado, não gate) =="
diff --git a/scripts/orq b/scripts/orq
index 34fb037..1632cb2 100755
--- a/scripts/orq
+++ b/scripts/orq
@@ -49,18 +49,27 @@ ORQ_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
 # error` no stderr e nada mais.
 #
 # Por isso este verbo é despachado aqui em cima, e resolve o caminho do config
-# SEM o lib.sh. A duplicação das quatro linhas abaixo é deliberada e é o preço:
-# elas repetem lib.sh:23-38 (ROOT, depois o pai do --git-common-dir, com
-# fallback em ROOT fora de git). O caminho do config NÃO vem do config — é
-# `<checkout>/docs/fila/000-config.json` por contrato (lib.sh:42-43) —, então
-# esta cópia não pode divergir por dado, só por refatoração do lib.sh; e o teste
-# `config ilegível: rc 1` falha alto se divergir.
+# SEM o lib.sh. A duplicação das CINCO linhas abaixo é deliberada e é o preço:
+# quatro repetem lib.sh:23-38 (ROOT, depois o pai do --git-common-dir, com
+# fallback em ROOT fora de git) e a quinta repete a resolução do `tsx` (peça
+# T1). Nenhuma delas pode divergir por DADO — o caminho do config é
+# `<checkout>/docs/fila/000-config.json` e o do tsx é
+# `<checkout>/node_modules/.bin/tsx`, os dois por contrato —, só por refatoração
+# do lib.sh; e os testes `config ilegível: rc 1` e `orq config resolve o tsx
+# igual ao lib.sh` falham alto se divergirem.
 if [ "${1:-}" = config ]; then
   [ "$#" = 1 ] || { printf '[orq ERRO] orq config não recebe argumento (recebi %s)\n' "$2" >&2; exit 1; }
   _root="${ORQ_EXEC_ROOT:-$(cd "$ORQ_DIR/.." && pwd)}"
   _gc="$(git -C "$_root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
   if [ -n "$_gc" ] && [ -d "$_gc" ]; then _main="$(cd "$_gc/.." && pwd)"; else _main="$_root"; fi
-  ( cd "$ORQ_DIR/.." && npx tsx "$ORQ_DIR/orquestrador/config-cli.ts" "$_main/docs/fila/000-config.json" )
+  # O `tsx` pela MESMA regra do lib.sh (peça T1): binário local do checkout, ou
+  # `npx --no-install` — nunca `npx` cru, que baixa da rede o que não acha. Esta
+  # é a quinta linha duplicada deste bloco, pelo mesmo motivo das quatro acima:
+  # o lib.sh não pode ser carregado aqui. Ela também não pode divergir por dado
+  # (o caminho é `<checkout>/node_modules/.bin/tsx` por contrato), e o caso
+  # `orq config resolve o tsx igual ao lib.sh` falha alto se divergir.
+  if [ -x "$_main/node_modules/.bin/tsx" ]; then _tsx=( "$_main/node_modules/.bin/tsx" ); else _tsx=( npx --no-install tsx ); fi
+  ( cd "$ORQ_DIR/.." && "${_tsx[@]}" "$ORQ_DIR/orquestrador/config-cli.ts" "$_main/docs/fila/000-config.json" )
   exit $?
 fi
 
@@ -290,7 +299,7 @@ cmd_validar() {
   # node_modules, e o checkout pode ser um fixture de teste sem node_modules
   # nenhum — ali o `npx` tentaria BAIXAR o tsx. O gate não lê nada por caminho
   # relativo: o .ts e o --fila vão absolutos.
-  ( cd "$ORQ_DIR/.." && npx tsx "$ORQ_DIR/orquestrador/gate-ticket.ts" --fila "$FILA_DIR" "$@" )
+  ( cd "$ORQ_DIR/.." && "${ORQ_TSX[@]}" "$ORQ_DIR/orquestrador/gate-ticket.ts" --fila "$FILA_DIR" "$@" )
 }
 
 # --- orq versao ---------------------------------------------------------------
@@ -307,7 +316,7 @@ cmd_validar() {
 # não refeita (quem sonda é o `probe_modelos` do executor, ORQ-07).
 cmd_prevoo() {
   [ "$#" = 0 ] || die "orq prevoo não recebe argumento"
-  npx tsx "$ORQ_DIR/orquestrador/prevoo.ts" "$MAIN_CHECKOUT"
+  "${ORQ_TSX[@]}" "$ORQ_DIR/orquestrador/prevoo.ts" "$MAIN_CHECKOUT"
 }
 
 cmd_versao() {
@@ -370,7 +379,7 @@ cmd_retomar() {
 cmd_liberar() {
   [ -n "${1:-}" ] || die "orq liberar exige o token: orq liberar humano:<tipo>-<id> [nota]"
   local arq="$MAIN_CHECKOUT/$(cfg '.liberacoes_file')"
-  ( cd "$ORQ_DIR/.." && npx tsx "$ORQ_DIR/orquestrador/liberar-cli.ts" "$arq" "$@" )
+  ( cd "$ORQ_DIR/.." && "${ORQ_TSX[@]}" "$ORQ_DIR/orquestrador/liberar-cli.ts" "$arq" "$@" )
 }
 
 case "${1:-}" in
diff --git a/scripts/orquestrador/enforcement.sh b/scripts/orquestrador/enforcement.sh
index 88a19ac..b308215 100755
--- a/scripts/orquestrador/enforcement.sh
+++ b/scripts/orquestrador/enforcement.sh
@@ -55,7 +55,7 @@ payload="$(jq -n \
   '{changedFiles:$changedFiles, allowlist:$allowlist, diff:$diff, config:$config}')"
 
 set +e
-result="$(printf '%s' "$payload" | ( cd "$ROOT" && npx tsx scripts/orquestrador/enforcement-core.ts --run-cli ))"
+result="$(printf '%s' "$payload" | ( cd "$ROOT" && "${ORQ_TSX[@]}" scripts/orquestrador/enforcement-core.ts --run-cli ))"
 rc=$?
 set -e
 
diff --git a/scripts/orquestrador/executor.sh b/scripts/orquestrador/executor.sh
index 9691b76..56f3c92 100755
--- a/scripts/orquestrador/executor.sh
+++ b/scripts/orquestrador/executor.sh
@@ -39,7 +39,7 @@ while [ $# -gt 0 ]; do
   shift
 done
 
-decisao() { npx tsx "$ORQ_LIB_DIR/decisao-cli.ts" "$MAIN_CHECKOUT" "$@"; }
+decisao() { "${ORQ_TSX[@]}" "$ORQ_LIB_DIR/decisao-cli.ts" "$MAIN_CHECKOUT" "$@"; }
 
 # fase <nome> — snapshot E variável lida pelo trap de saída. Duas escritas com um
 # nome só: uma fase que só existe no STATUS.md some quando o processo morre, e é
@@ -567,7 +567,7 @@ event_gate() {
 # (--allowedTools "" + instrução explícita no prompt) e --max-turns 1: o juiz
 # lê o que recebeu e responde, não investiga.
 JUIZ_ROU=0; JUIZ_APROVADO=""; JUIZ_MOTIVO=""; JUIZ_FALHOS=""; JUIZ_ILEGIVEL=0
-juiz() { npx tsx "$ORQ_LIB_DIR/juiz.ts" --run-cli "$MAIN_CHECKOUT" "$@"; }
+juiz() { "${ORQ_TSX[@]}" "$ORQ_LIB_DIR/juiz.ts" --run-cli "$MAIN_CHECKOUT" "$@"; }
 
 run_juiz() {
   local file="$1" wt="$2" rundir="$3" base="$4" attempt="$5"
@@ -832,7 +832,7 @@ run_attempt() {
   # propaga a flag de exclusão e o E2E que escreve no Supabase voltaria ao gate.
   local gates_rc=0
   fase gates
-  npx tsx "$ORQ_LIB_DIR/gates.ts" --run-cli "$wt" > "$rundir/gates.txt" 2>&1 || gates_rc=$?
+  "${ORQ_TSX[@]}" "$ORQ_LIB_DIR/gates.ts" --run-cli "$wt" > "$rundir/gates.txt" 2>&1 || gates_rc=$?
   log "  gates: $([ "$gates_rc" = 0 ] && echo APROVADO || echo "REPROVADO (rc=$gates_rc)")"
   grep -qi 'reexecutar' "$rundir/gates.txt" && log "  gates: interrompidos — conjunto não vale parcialmente"
 
@@ -926,7 +926,7 @@ diagnostico_retry() {
         --argjson cf "$(printf '%s' "$CRITERIOS_FALHOS" | jq -Rn '[inputs | select(length>0) | split("; ")[]]')" \
         --argjson pn "${PERMISSOES_NEGADAS:-[]}" \
         '{allowlist:$al, criteriosFalhos:$cf, permissoesNegadas:$pn}' \
-      | npx tsx "$ORQ_LIB_DIR/diagnostico.ts" --run-cli "$rundir" 2>/dev/null || true)"
+      | "${ORQ_TSX[@]}" "$ORQ_LIB_DIR/diagnostico.ts" --run-cli "$rundir" 2>/dev/null || true)"
   if [ -z "$d" ]; then
     log "  diagnóstico: não consegui montar o JSON — retry segue com o motivo em texto"
     printf '%s' "$MOTIVO"
diff --git a/scripts/orquestrador/lib.sh b/scripts/orquestrador/lib.sh
index ceafa58..83c305c 100755
--- a/scripts/orquestrador/lib.sh
+++ b/scripts/orquestrador/lib.sh
@@ -42,6 +42,46 @@ fi
 FILA_DIR="$MAIN_CHECKOUT/docs/fila"
 CONFIG="$FILA_DIR/000-config.json"
 
+# --- Toolchain: o `tsx` (peça T1) --------------------------------------------
+# O motor é TypeScript e NADA dele roda sem `tsx` — gates, juiz, decisão, lock,
+# pré-voo, enforcement. Até esta peça as 14 chamadas eram `npx tsx` cru, e o
+# `npx` sem flag BAIXA da rede o pacote que não encontra: num repo instalado sem
+# `tsx` nas devDependencies isso é prompt interativo num TTY e erro fora dele —
+# sob o launchd, um tick que morre sem dizer por quê.
+# Medido em 2026-09-09 no ~/Projetos/actus-saas: `node_modules/.bin/` tem `next`,
+# `tsc` e `vitest`, e NÃO tem `tsx`.
+#
+# A resolução é UMA, aqui, e vale para todo mundo que carrega o lib.sh:
+#   1. `$MAIN_CHECKOUT/node_modules/.bin/tsx`, se existir e for executável. É o
+#      binário DO REPO, resolvido contra o checkout PRINCIPAL e não contra ROOT:
+#      a worktree tem `node_modules` symlinkado para o dele, então os dois dão o
+#      mesmo arquivo — e o principal dá por um caminho que não depende de
+#      symlink existir.
+#   2. `npx --no-install tsx`. A rede fica de fora POR CONSTRUÇÃO: `--no-install`
+#      falha rápido em vez de baixar. Não existe terceiro caminho.
+#
+# O fallback (2) é o que mantém os verbos READ-ONLY do `orq` funcionando num
+# checkout de layout diferente; ele NÃO é rota do loop, porque o `local-loop.sh`
+# e a `cat.7` do pré-voo exigem o binário local (1) antes de qualquer coisa. É a
+# separação deliberada: o fallback deixa consultar, o gate impede drenar.
+#
+# `ORQ_TSX` é ARRAY porque o fallback tem TRÊS palavras: `$(tsx_bin)` sem aspas
+# resolveria isso por word-splitting e quebraria no primeiro checkout com espaço
+# no caminho. Quem chama usa `"${ORQ_TSX[@]}"`; `tsx_bin` existe para MENSAGEM e
+# para teste — imprime o comando resolvido como uma linha legível.
+TSX_LOCAL="$MAIN_CHECKOUT/node_modules/.bin/tsx"
+if [ -x "$TSX_LOCAL" ]; then
+  ORQ_TSX=( "$TSX_LOCAL" )
+else
+  ORQ_TSX=( npx --no-install tsx )
+fi
+tsx_bin() { printf '%s\n' "${ORQ_TSX[*]}"; }
+
+# tsx_local_ok — 0 quando o `tsx` DO REPO existe e é executável. Não roda nada,
+# não abre rede, não custa processo: é `test -x`, e é a MESMA pergunta que o
+# `instalar.sh` faz antes de instalar e que a `cat.7` do pré-voo responde.
+tsx_local_ok() { [ -x "$TSX_LOCAL" ]; }
+
 # --- Logging --------------------------------------------------------------
 log()  { printf '[orq %s] %s\n' "$(date -u +%H:%M:%S 2>/dev/null || echo '--:--:--')" "$*" >&2; }
 die()  { printf '[orq ERRO] %s\n' "$*" >&2; exit 1; }
diff --git a/scripts/orquestrador/local-loop.sh b/scripts/orquestrador/local-loop.sh
index c7ffd69..99b21c0 100755
--- a/scripts/orquestrador/local-loop.sh
+++ b/scripts/orquestrador/local-loop.sh
@@ -37,7 +37,7 @@ say() { printf '[%s] %s\n' "$(ts)" "$*"; }
 # Formato: linha 1 = PID, linha 2 = epoch. A decisão de "stale?" é do TS testado.
 lock_stale() {
   [ -f "$LOCK" ] || return 1
-  npx tsx -e "
+  "${ORQ_TSX[@]}" -e "
     import {parseLockFile, isLockStale} from '$ORQ_LIB_DIR/lock.js';
     import {readFileSync} from 'node:fs';
     const l = parseLockFile(readFileSync('$LOCK','utf8'));
@@ -220,7 +220,7 @@ drenar() {
 
 cleanup_frente() {
   local id="$1" nome
-  nome="$(npx tsx "$ORQ_LIB_DIR/decisao-cli.ts" "$MAIN_CHECKOUT" worktree "$id")"
+  nome="$("${ORQ_TSX[@]}" "$ORQ_LIB_DIR/decisao-cli.ts" "$MAIN_CHECKOUT" worktree "$id")"
   git -C "$ROOT" worktree remove --force "$WORKTREES_BASE/$nome" >/dev/null 2>&1 || true
   git -C "$ROOT" branch -D "frente/$id" >/dev/null 2>&1 || true
   return 0
@@ -238,7 +238,37 @@ cleanup_frente() {
 #
 # Isolada para ser substituível por stub nos testes, como `run_executor_once`.
 run_prevoo() {
-  npx tsx "$ORQ_LIB_DIR/prevoo.ts" "$MAIN_CHECKOUT" 2>&1
+  "${ORQ_TSX[@]}" "$ORQ_LIB_DIR/prevoo.ts" "$MAIN_CHECKOUT" 2>&1
+}
+
+# --- TOOLCHAIN (peça T1): a checagem que precede TODAS as outras -------------
+# O motor é TypeScript. Sem `tsx` no repo, a PRIMEIRA coisa que quebra não é uma
+# drenagem: é o `lock_stale`, logo abaixo, que roda `tsx -e` para decidir se o
+# lock é órfão. Com o `tsx` ausente ele falha, a falha é lida como "não é
+# órfão", e o loop encerra com "outro run vivo" — uma resposta ERRADA, dada em
+# silêncio, sobre um lock que talvez nem exista. Por isso esta checagem vem
+# ANTES do lock: ela é a única que não pode depender de nada.
+#
+# É `test -x`, não uma execução: nada roda, nada abre rede, e o `npx` sequer é
+# alcançado — `--no-install` já garantiria que ele não baixa, mas o caminho
+# curto é não chegar lá.
+#
+# O que ela escreve, e o que deliberadamente NÃO escreve: grava `PREVOO_NOGO
+# item=tsx` na trilha (append-only, e é exatamente o fato que alguém vai
+# procurar depois) e notifica pelo canal. NÃO chama `status_set`: estamos ANTES
+# do `lock_adquirir`, então pode haver outro run vivo, e o STATUS é dele. Nenhum
+# ticket é tocado, porque o primeiro passo que escreve em ticket é o
+# `--reconcile`, muito depois daqui.
+tsx_ou_sai() {
+  tsx_local_ok && return 0
+  say "toolchain NO-GO: não existe $TSX_LOCAL executável"
+  say "  o motor é TypeScript e nenhuma parte dele roda sem tsx."
+  say "  passo HUMANO, com o loop pausado: pnpm add -D tsx@^4.19.0 (ou npm i -D tsx@^4.19.0)"
+  event '---' PREVOO_NOGO "item=tsx"
+  notificar "Orquestrador: pré-voo NO-GO" \
+    "tsx ausente: $TSX_LOCAL — o motor é TypeScript e não roda sem ele (instale com o loop pausado)"
+  say "========== local-loop fim (toolchain NO-GO) =========="
+  exit 1
 }
 
 prevoo_ou_sai() {
@@ -265,6 +295,9 @@ main_local_loop() {
   exec >>"$LOG" 2>&1
   say "========== local-loop início (pid $$) =========="
   [ "$BRANCH_ALVO" != "$BRANCH_PROTEGIDA" ] || { say "ABORTA: branch_alvo=$BRANCH_PROTEGIDA é proibido"; exit 1; }
+  # TOOLCHAIN antes de tudo: o `lock_adquirir` logo abaixo já é TypeScript
+  # (`lock_stale` roda `tsx -e`), e sem tsx ele responde errado em silêncio.
+  tsx_ou_sai
   lock_adquirir || exit 0
   # KILL SWITCH, leitura 1 de 2: ANTES de qualquer escrita. O reconcile mexe em
   # status de ticket, então "pausado" precisa valer antes dele — pausar e mesmo
diff --git a/scripts/orquestrador/migrar-config.ts b/scripts/orquestrador/migrar-config.ts
index 9c8b940..d707e95 100644
--- a/scripts/orquestrador/migrar-config.ts
+++ b/scripts/orquestrador/migrar-config.ts
@@ -44,8 +44,43 @@ import { diffUnificado, json, lerJson } from './migrar-comum.js'
 const CHAVES = CHAVES_OBRIGATORIAS.map((c) => c.chave)
 
 const QUEM = 'migrar-config'
+
+/**
+ * `000-config.proposto.json` é NOME RESERVADO do instalador (peça M1).
+ *
+ * O migrador escreve aqui e o `--aplicar` lê daqui. Antes desta peça o
+ * `--propor` fazia `writeFileSync` sem guarda nenhuma: um segundo
+ * `instalar.sh --atualizar --migrar` reescrevia por cima do proposto que
+ * alguém já tinha revisado e preenchido, em silêncio, e o `--aplicar`
+ * seguinte instalava a versão de máquina com os placeholders `<...>`
+ * intactos. Foi o bloqueante B-2 da revisão de adoção do Actus
+ * (2026-09-09): o plano gravava o config revisado NESTE nome, e o
+ * `--migrar` do passo seguinte o apagava.
+ *
+ * Revisão humana usa OUTRO nome — `000-config.revisado.json` é o que o
+ * CONTRATO §8 registra —, e este fica sendo o que ele sempre foi: a
+ * proposta da máquina, descartável, regerável a qualquer momento.
+ */
 export const NOME_PROPOSTO = '000-config.proposto.json'
 
+/** Nome sugerido para a revisão HUMANA. O migrador nunca o lê nem o escreve. */
+export const NOME_REVISADO = '000-config.revisado.json'
+
+/**
+ * O migrador funcionando e dizendo NÃO — distinto de erro de uso.
+ *
+ * A CLI mapeia para rc 1; qualquer outra exceção continua rc 2. Sem essa
+ * distinção o `instalar.sh` não teria como repassar a recusa: ele engole a
+ * saída das migrações (`|| true`) justamente porque rc != 0 ali sempre foi
+ * "algo deu errado nesta etapa, siga", e uma recusa não é isso.
+ */
+export class Recusa extends Error {
+  constructor(mensagem: string) {
+    super(mensagem)
+    this.name = 'Recusa'
+  }
+}
+
 type Obj = Record<string, unknown>
 
 /** Lê `a.b.c`. `undefined` quando falta (ou quando o caminho passa por escalar). */
@@ -247,7 +282,29 @@ export function migrarArquivo(caminho: string, modo: Modo): { linhas: string[];
   const d = diffUnificado(antes, p.proposto, `${caminho} (oficial, INTOCADO)`, `${propostoPath} (proposto)`)
   linhas.push('', d ? d.trimEnd() : 'nada a mudar: o config já está no schema 2 e completo.')
 
+  // Um dry-run que diz "tudo certo" e um `--propor` que RECUSA logo depois é um
+  // dry-run que mentiu. Ele avisa e NÃO escreve — que é o que ele sempre fez.
+  if (modo === 'dry-run' && existsSync(propostoPath)) {
+    linhas.push(
+      '',
+      `AVISO: ${propostoPath} já existe. O --propor de verdade RECUSARIA (peça M1): o nome é reservado do`,
+      `instalador e sobrescrevê-lo apagaria a revisão de alguém. Apague-o, ou renomeie a sua revisão para`,
+      `${NOME_REVISADO}, antes de rodar sem --dry-run.`,
+    )
+  }
+
   if (modo === 'propor') {
+    // A guarda da peça M1. Ela vem DEPOIS do diff acima de propósito: o
+    // relatório já foi montado e o `--dry-run` continua servindo para ver o que
+    // mudaria. O que se recusa é a ESCRITA, e só ela.
+    if (existsSync(propostoPath)) {
+      throw new Recusa(
+        `${QUEM}: ${propostoPath} JÁ EXISTE e não vou sobrescrevê-lo. ` +
+          `Este nome é reservado do instalador: é aqui que o --propor escreve e é daqui que o --aplicar lê. ` +
+          `Se o arquivo é a proposta anterior e não serve mais, apague-o; se é a sua revisão, RENOMEIE-A ` +
+          `(a convenção do kit é ${NOME_REVISADO}, nome que o instalador não conhece) e rode de novo.`,
+      )
+    }
     writeFileSync(propostoPath, p.proposto)
     linhas.push('', `PROPOSTO gravado em ${propostoPath}. O oficial NÃO foi tocado.`)
   }
@@ -311,6 +368,8 @@ if (chamadoComoCli()) {
     process.exit(0)
   } catch (e) {
     process.stderr.write(`${(e as Error).message}\n`)
-    process.exit(2)
+    // rc 1 = o migrador funcionando e dizendo não; rc 2 = erro de uso ou de
+    // leitura. O `instalar.sh` distingue os dois para repassar SÓ a recusa.
+    process.exit(e instanceof Recusa ? 1 : 2)
   }
 }
diff --git a/scripts/orquestrador/prevoo.ts b/scripts/orquestrador/prevoo.ts
index e99a8e3..6c473ad 100644
--- a/scripts/orquestrador/prevoo.ts
+++ b/scripts/orquestrador/prevoo.ts
@@ -21,7 +21,7 @@
  * que é aborto LIMPO da drenagem em vez de crash no meio do disparo (que
  * deixava lock e ticket pendurados).
  */
-import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
+import { constants, accessSync, existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
 import { spawnSync } from 'node:child_process'
 import { join, resolve } from 'node:path'
 import { fileURLToPath } from 'node:url'
@@ -63,6 +63,8 @@ export interface PreVooConfig {
 }
 
 export interface PreVooDeps {
+  /** `node_modules/.bin/tsx` do checkout existe e é executável (cat.7). */
+  tsxLocal: () => boolean
   arquivoComConteudo: (rel: string) => boolean
   contarArquivosCommitados: () => number
   lerOrigin: () => string
@@ -89,6 +91,33 @@ function exigirBooleano(v: unknown, oque: string): boolean {
   throw new Error(`${oque} devolveu ${typeof v} (esperado boolean)`)
 }
 
+/**
+ * cat.7 · toolchain — o `tsx` DO REPO (peça T1).
+ *
+ * O motor é TypeScript: gates, juiz, decisão, lock, enforcement e este próprio
+ * pré-voo rodam por `tsx`. A pergunta não é "existe um tsx em algum lugar" e
+ * sim "este repo declara o seu": `lib.sh` resolve o binário local do checkout e
+ * só cai em `npx --no-install tsx` como fallback dos verbos read-only do `orq`
+ * — o loop exige o local, e é o local que esta cat. mede.
+ *
+ * Ela pode PARECER redundante (se não houvesse tsx, quem estaria rodando este
+ * arquivo?) e não é: o fallback do `npx` pode achar um tsx global, e aí o motor
+ * roda hoje por um binário que não é do repo, some numa máquina nova e leva
+ * junto toda a explicação. Medido no ~/Projetos/actus-saas em 2026-09-09:
+ * `node_modules/.bin/` com `next`, `tsc` e `vitest`, sem `tsx`.
+ */
+export function checarToolchain(deps: Pick<PreVooDeps, 'tsxLocal'>): Item {
+  if (!exigirBooleano(deps.tsxLocal(), 'tsxLocal()')) {
+    return {
+      ok: false,
+      token: 'cat.7',
+      item: 'pré-voo cat.7 (toolchain): node_modules/.bin/tsx',
+      motivo: 'ausente ou não executável — o motor é TypeScript; instale com `pnpm add -D tsx@^4.19.0` (ou `npm i -D tsx@^4.19.0`), com o loop pausado',
+    }
+  }
+  return { ok: true, token: 'cat.7', item: 'toolchain (tsx do repo)' }
+}
+
 /** cat.0 · spec vendorizada presente COM conteúdo e COMMITADA. */
 export function checarSpecVendorizada(deps: Pick<PreVooDeps, 'arquivoComConteudo' | 'contarArquivosCommitados'>): Item {
   for (const rel of ARQUIVOS_SPEC) {
@@ -215,14 +244,20 @@ export interface Veredito {
 }
 
 /**
- * Roda cat. 0, 1, 6 em ordem; a primeira falha aborta nomeando o item. A cat.3
- * é informativa e sempre roda por último — mesmo em NO-GO ela não muda nada, e
- * por isso não roda: um NO-GO já é aborto, e a linha de sondagem sobre um repo
- * que nem tem fila só polui.
+ * Roda cat. 7, 0, 1, 6 em ordem; a primeira falha aborta nomeando o item. A
+ * cat.3 é informativa e sempre roda por último — mesmo em NO-GO ela não muda
+ * nada, e por isso não roda: um NO-GO já é aborto, e a linha de sondagem sobre
+ * um repo que nem tem fila só polui.
+ *
+ * A cat.7 vem PRIMEIRO (peça T1) porque é a única cujo NO-GO explica os outros:
+ * sem o `tsx` do repo, nenhuma das outras checagens teria como rodar num
+ * próximo disparo. Uma spec vendorizada impecável não serve de nada se o motor
+ * que a lê não existe.
  */
 export function preVooRelampago(entrada: { config: PreVooConfig; deps: PreVooDeps }): Veredito {
   const { config, deps } = entrada
   const checagens: [string, () => Item][] = [
+    ['cat.7 (toolchain)', () => checarToolchain(deps)],
     ['cat.0 (spec vendorizada)', () => checarSpecVendorizada(deps)],
     ['cat.1 (identidade)', () => checarIdentidade({ config, ...deps })],
     ['cat.6 (estrutura da fila)', () => checarEstruturaFila(deps)],
@@ -328,6 +363,16 @@ export function preVooDepsReais(entrada: {
     ((...args: string[]) =>
       spawnSync('git', ['-C', entrada.repoRoot, ...args], { encoding: 'utf8', timeout: TIMEOUT_PRE_VOO_MS }))
   return {
+    // `test -x`, e nada além: o pré-voo não pode custar um `npx` — e um `npx`
+    // aqui responderia a pergunta errada, porque acharia um tsx global.
+    tsxLocal: () => {
+      try {
+        accessSync(join(entrada.repoRoot, 'node_modules', '.bin', 'tsx'), constants.X_OK)
+        return true
+      } catch {
+        return false
+      }
+    },
     arquivoComConteudo: (rel) => {
       try {
         return statSync(join(entrada.repoRoot, 'docs/orquestrador/skill', rel)).size > 0
diff --git a/scripts/orquestrador/test-retry-worktree.sh b/scripts/orquestrador/test-retry-worktree.sh
index 175eb50..c78c3d8 100755
--- a/scripts/orquestrador/test-retry-worktree.sh
+++ b/scripts/orquestrador/test-retry-worktree.sh
@@ -343,11 +343,11 @@ l_diff="$(grep -n '^  DIFF_LINES=' "$AQUI/executor.sh" | head -1 | cut -d: -f1)"
 echo
 echo "== 7 · o juiz é avisado de que o commit foi do harness =="
 nota_render="$(printf '%s' '{"id":"901","objetivo":"x","criterios":[],"allowlist":[],"diff":"d","gates":"g","nota":"COMMIT FOI DO HARNESS"}' \
-  | npx tsx "$AQUI/juiz.ts" --run-cli "$MAIN_CHECKOUT" prompt 2>/dev/null)"
+  | "${ORQ_TSX[@]}" "$AQUI/juiz.ts" --run-cli "$MAIN_CHECKOUT" prompt 2>/dev/null)"
 printf '%s' "$nota_render" | grep -q "NOTA DO HARNESS SOBRE ESTA TENTATIVA:" \
   && ok "a nota entra no prompt do juiz" || falha "a nota não chegou ao prompt"
 sem_nota="$(printf '%s' '{"id":"901","objetivo":"x","criterios":[],"allowlist":[],"diff":"d","gates":"g"}' \
-  | npx tsx "$AQUI/juiz.ts" --run-cli "$MAIN_CHECKOUT" prompt 2>/dev/null)"
+  | "${ORQ_TSX[@]}" "$AQUI/juiz.ts" --run-cli "$MAIN_CHECKOUT" prompt 2>/dev/null)"
 printf '%s' "$sem_nota" | grep -q "NOTA DO HARNESS" \
   && falha "prompt sem nota ganhou seção vazia" || ok "sem nota, o prompt sai como antes"
 
diff --git a/test/fixtures/bin-sem-rede/npx b/test/fixtures/bin-sem-rede/npx
new file mode 100755
index 0000000..cccdca5
--- /dev/null
+++ b/test/fixtures/bin-sem-rede/npx
@@ -0,0 +1,24 @@
+#!/usr/bin/env bash
+# npx STUB — peça T1.
+#
+# Existe para provar uma NEGATIVA: que o motor, sem `tsx` no repo, RECUSA antes
+# de tentar resolver a ferramenta — e portanto sem nenhuma chance de tocar a
+# rede. `npx` sem flag BAIXA o pacote que não encontra; é esse o comportamento
+# que a peça T1 tira do caminho do loop, e um teste que só afirmasse "recusou"
+# não distinguiria "recusou antes" de "recusou depois de tentar baixar".
+#
+# Contrato deste stub:
+#   1. grava UMA linha por chamada (os argumentos, como vieram) em
+#      $ORQ_NPX_LOG — é a lista VAZIA que o teste assevera;
+#   2. sai 127 SEMPRE. Ele não busca nada e não finge sucesso: se algum caminho
+#      de código chegar aqui, o teste vê a linha no log E a falha.
+#
+# Ele nunca fala com a rede, nem quando chamado: é este arquivo inteiro.
+
+if [ -n "${ORQ_NPX_LOG:-}" ]; then
+  mkdir -p "$(dirname "$ORQ_NPX_LOG")" 2>/dev/null || true
+  printf '%s\n' "$*" >> "$ORQ_NPX_LOG" 2>/dev/null || true
+fi
+
+printf 'npx STUB: chamada NÃO esperada (%s)\n' "$*" >&2
+exit 127
diff --git a/test/fixtures/orq-harness.ts b/test/fixtures/orq-harness.ts
index f251bf5..4e4ab56 100644
--- a/test/fixtures/orq-harness.ts
+++ b/test/fixtures/orq-harness.ts
@@ -10,7 +10,7 @@
  */
 import { afterAll } from 'vitest';
 import { spawnSync } from 'node:child_process';
-import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
+import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
 import { tmpdir } from 'node:os';
 import { join, dirname } from 'node:path';
 
@@ -116,11 +116,30 @@ export function configDeReferencia(): string {
   return readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8');
 }
 
-/** Cria o fixture: docs/fila/{000-config.json,runs/} + os tickets pedidos. */
+/**
+ * Cria o fixture: docs/fila/{000-config.json,runs/} + os tickets pedidos, com
+ * `node_modules/.bin/tsx` apontando para o do repo.
+ *
+ * O `tsx` entrou na peça T1 e não é conveniência: desde ela o motor RECUSA
+ * rodar sem `<checkout>/node_modules/.bin/tsx` — é a primeira coisa que o
+ * `local-loop.sh` confere, antes até do lock. Sem ele, todo caso que exercita o
+ * loop passaria a medir a ausência do tsx em vez do que quer medir. Antes da T1
+ * estes fixtures rodavam TypeScript por `npx tsx` sem dependência declarada em
+ * lugar nenhum, resolvendo na prática contra o cache do npx da máquina: era
+ * exatamente o buraco que a peça fechou.
+ *
+ * O link é do BINÁRIO, não do diretório: `node_modules` precisa ser diretório
+ * de verdade porque `pacotes_do_checkout` (executor.sh) detecta pacote por
+ * `find -type d -name node_modules`, e symlink não é `-type d`. É a diferença
+ * para o `scripts/kit/fixture.sh`, que linka o diretório inteiro — lá o
+ * fixture é um repo instalado, aqui é um checkout de papel.
+ */
 export function criarFixture(tickets: Ticket[] = []): string {
   const raiz = mkdtempSync(join(tmpdir(), 'orq-fx-'));
   mkdirSync(join(raiz, 'docs', 'fila', 'runs'), { recursive: true });
   escrever(join(raiz, 'docs', 'fila', '000-config.json'), configDeReferencia());
+  mkdirSync(join(raiz, 'node_modules', '.bin'), { recursive: true });
+  symlinkSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), join(raiz, 'node_modules', '.bin', 'tsx'));
   for (const t of tickets) escreverTicket(raiz, t);
   return raiz;
 }
diff --git a/test/orquestrador-migrar-config.test.ts b/test/orquestrador-migrar-config.test.ts
index cd5a717..6f3c946 100644
--- a/test/orquestrador-migrar-config.test.ts
+++ b/test/orquestrador-migrar-config.test.ts
@@ -18,10 +18,18 @@ import { describe, it, expect } from 'vitest';
 import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
 import { tmpdir } from 'node:os';
 import { join } from 'node:path';
-import { propor, ler as lerCaminho, migrarArquivo, NOME_PROPOSTO } from '../scripts/orquestrador/migrar-config.js';
+import { spawnSync } from 'node:child_process';
+import {
+  propor,
+  ler as lerCaminho,
+  migrarArquivo,
+  NOME_PROPOSTO,
+  NOME_REVISADO,
+  Recusa,
+} from '../scripts/orquestrador/migrar-config.js';
 import { NOVAS, PROPRIAS_DE_REPO, RENOMES } from '../scripts/orquestrador/config-tabela.js';
 import { CHAVES_CONFIG, CHAVES_OBRIGATORIAS } from '../scripts/orquestrador/config-chaves.js';
-import { bashNoFixture, criarFixture, escrever, ler as lerArquivo, REPO_ROOT } from './fixtures/orq-harness.js';
+import { bashNoFixture, checkoutReal, criarFixture, escrever, ler as lerArquivo, REPO_ROOT } from './fixtures/orq-harness.js';
 
 const CONFIG_CI = join(REPO_ROOT, '_referencia-ci', '000-config.ci.json');
 const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
@@ -390,6 +398,169 @@ describe('o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito', ()
   });
 });
 
+// ─── M1 · o nome do proposto é reservado, e o --migrar não passa por cima ────
+
+/**
+ * Peça M1 — bloqueante **B-2** da revisão de adoção do Actus (2026-09-09).
+ *
+ * `000-config.proposto.json` É o nome que o instalador usa. O plano de adoção
+ * mandava a Fase A gravar o config revisado nesse mesmo nome e só então rodar
+ * `instalar.sh --atualizar . --migrar`: o `--migrar` chamava `--propor`, que
+ * fazia `writeFileSync` sem guarda nenhuma, e a revisão inteira virava a
+ * proposta de máquina com os 14 placeholders `<...>` intactos — em silêncio. O
+ * `cp` seguinte instalava esse arquivo como oficial e o `orq config` saía rc 1
+ * com 14 violações, onde o plano esperava zero.
+ */
+describe('M1 · --propor RECUSA sobrescrever um proposto existente', () => {
+  function repoDeConfig(origem: string): { oficial: string; proposto: string } {
+    const dir = mkdtempSync(join(tmpdir(), 'orq-cfg-'));
+    const oficial = join(dir, '000-config.json');
+    copyFileSync(origem, oficial);
+    return { oficial, proposto: join(dir, NOME_PROPOSTO) };
+  }
+
+  /** O que uma revisão humana teria no arquivo: nada parecido com a proposta. */
+  const REVISADO = '{\n  "revisao": "humana, e custou caro"\n}\n';
+
+  it('recusa, e a mensagem manda apagar OU renomear — com o nome da convenção', () => {
+    const { oficial, proposto } = repoDeConfig(CONFIG_CI);
+    writeFileSync(proposto, REVISADO);
+    expect(() => migrarArquivo(oficial, 'propor')).toThrow(Recusa);
+    expect(() => migrarArquivo(oficial, 'propor')).toThrow(/JÁ EXISTE e não vou sobrescrevê-lo/);
+    expect(() => migrarArquivo(oficial, 'propor')).toThrow(/apague-o/);
+    expect(() => migrarArquivo(oficial, 'propor')).toThrow(new RegExp(NOME_REVISADO));
+  });
+
+  it('o proposto pré-existente sobrevive BYTE A BYTE', () => {
+    const { oficial, proposto } = repoDeConfig(CONFIG_CI);
+    writeFileSync(proposto, REVISADO);
+    const antes = readFileSync(proposto);
+    try {
+      migrarArquivo(oficial, 'propor');
+    } catch {
+      /* a recusa é o caso */
+    }
+    expect(readFileSync(proposto).equals(antes)).toBe(true);
+  });
+
+  it('e o oficial também não é tocado', () => {
+    const { oficial, proposto } = repoDeConfig(CONFIG_CI);
+    writeFileSync(proposto, REVISADO);
+    const antes = readFileSync(oficial, 'utf8');
+    expect(() => migrarArquivo(oficial, 'propor')).toThrow();
+    expect(readFileSync(oficial, 'utf8')).toBe(antes);
+  });
+
+  it('--dry-run continua não gravando: ele AVISA da recusa e segue relatando', () => {
+    const { oficial, proposto } = repoDeConfig(CONFIG_CI);
+    writeFileSync(proposto, REVISADO);
+    const antes = readFileSync(proposto);
+    const saida = migrarArquivo(oficial, 'dry-run').linhas.join('\n');
+    expect(saida).toMatch(/AVISO: .*já existe/);
+    expect(saida).toMatch(/RECUSARIA/);
+    expect(saida).toContain(NOME_REVISADO);
+    // O relatório de sempre continua inteiro: o aviso não substitui nada.
+    expect(saida).toMatch(/orq config sobre o PROPOSTO/);
+    expect(readFileSync(proposto).equals(antes)).toBe(true);
+  });
+
+  it('sem proposto no disco, o --propor grava como sempre (a guarda não é sempre-verdadeira)', () => {
+    const { oficial, proposto } = repoDeConfig(CONFIG_CI);
+    migrarArquivo(oficial, 'propor');
+    expect(JSON.parse(readFileSync(proposto, 'utf8')).$schema_versao).toBe(2);
+  });
+
+  it('o migrador NÃO conhece o nome da revisão: não lê, não escreve, não apaga', () => {
+    const { oficial } = repoDeConfig(CONFIG_CI);
+    const revisado = join(join(oficial, '..'), NOME_REVISADO);
+    writeFileSync(revisado, REVISADO);
+    const antes = readFileSync(revisado);
+    migrarArquivo(oficial, 'propor');
+    expect(readFileSync(revisado).equals(antes)).toBe(true);
+    // E o proposto saiu normalmente: um arquivo com outro nome ao lado é
+    // exatamente o que a convenção pede, e não atrapalha nada.
+    expect(existsSync(join(join(oficial, '..'), NOME_PROPOSTO))).toBe(true);
+  });
+
+  it('a CLI distingue RECUSA (rc 1) de erro de uso (rc 2)', () => {
+    const { oficial, proposto } = repoDeConfig(CONFIG_CI);
+    writeFileSync(proposto, REVISADO);
+    const cli = join(REPO_ROOT, 'scripts', 'orquestrador', 'migrar-config.ts');
+    const tsx = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
+
+    const recusa = spawnSync(tsx, [cli, oficial, '--propor'], { encoding: 'utf8' });
+    expect(recusa.status).toBe(1);
+    expect(`${recusa.stdout}${recusa.stderr}`).toMatch(/JÁ EXISTE/);
+
+    const erro = spawnSync(tsx, [cli, oficial, '--opcao-que-nao-existe'], { encoding: 'utf8' });
+    expect(erro.status).toBe(2);
+  });
+});
+
+describe('M1 · instalar.sh --atualizar --migrar repassa a recusa', () => {
+  /** Uma cópia do fixture instanciado: repo instalado de verdade, com git. */
+  function repoInstalado(): string {
+    const raiz = mkdtempSync(join(tmpdir(), 'orq-m1-'));
+    const dest = join(raiz, 'repo');
+    const fx = checkoutReal();
+    const r = spawnSync('cp', ['-R', `${fx}/.`, dest], { encoding: 'utf8' });
+    if (r.status !== 0) throw new Error(`cp -R falhou: ${r.stderr}`);
+    writeFileSync(join(dest, 'docs', 'fila', 'PAUSAR'), 'atualizando o motor\n');
+    return dest;
+  }
+
+  function atualizarMigrar(repo: string, ...extra: string[]) {
+    const r = spawnSync('bash', [join(REPO_ROOT, 'instalar.sh'), '--atualizar', repo, '--migrar', ...extra], {
+      encoding: 'utf8',
+      env: { ...process.env, ORQ_TESTE: '1' },
+    });
+    return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
+  }
+
+  it('com proposto pré-existente: rc 1, recusa dita, e o arquivo intacto byte a byte', () => {
+    const repo = repoInstalado();
+    const proposto = join(repo, 'docs', 'fila', NOME_PROPOSTO);
+    writeFileSync(proposto, '{\n  "revisao": "da Fase A, e não pode sumir"\n}\n');
+    const antes = readFileSync(proposto);
+
+    const r = atualizarMigrar(repo);
+    expect(r.rc).toBe(1);
+    expect(r.saida).toMatch(/RECUSADO pelo migrar-config/);
+    expect(r.saida).toMatch(/JÁ EXISTE/);
+    expect(readFileSync(proposto).equals(antes)).toBe(true);
+    // E o passo humano NÃO é impresso apontando para o arquivo de outra pessoa.
+    expect(r.saida).not.toMatch(/leia .*000-config\.proposto\.json/);
+  });
+
+  it('o resto da migração roda: a recusa é do config, não do --migrar inteiro', () => {
+    const repo = repoInstalado();
+    writeFileSync(join(repo, 'docs', 'fila', NOME_PROPOSTO), '{}\n');
+    const r = atualizarMigrar(repo);
+    expect(r.saida).toMatch(/MIGRAR-LIBERACOES|MIGRAR-TICKETS/);
+    // A cópia do motor aconteceu: o veredito do verificador continua saindo.
+    expect(r.saida).toMatch(/idêntico ao kit|diferença\(s\)/);
+  });
+
+  it('sem proposto pré-existente, o --migrar volta a sair 0 e a gravar', () => {
+    const repo = repoInstalado();
+    const r = atualizarMigrar(repo);
+    expect(r.rc).toBe(0);
+    expect(r.saida).not.toMatch(/RECUSADO pelo migrar-config/);
+    expect(existsSync(join(repo, 'docs', 'fila', NOME_PROPOSTO))).toBe(true);
+  });
+
+  it('--dry-run com proposto pré-existente: rc 0, avisa, e não escreve', () => {
+    const repo = repoInstalado();
+    const proposto = join(repo, 'docs', 'fila', NOME_PROPOSTO);
+    writeFileSync(proposto, '{\n  "revisao": "intocada"\n}\n');
+    const antes = readFileSync(proposto);
+    const r = atualizarMigrar(repo, '--dry-run');
+    expect(r.rc).toBe(0);
+    expect(r.saida).toMatch(/AVISO: .*já existe/);
+    expect(readFileSync(proposto).equals(antes)).toBe(true);
+  });
+});
+
 // ─── os dois configs reais, ponta a ponta ───────────────────────────────────
 describe('os dois configs reais: quanto o proposto melhora, e o que sobra', () => {
   for (const { nome, caminho } of REPOS) {
diff --git a/test/orquestrador-prevoo.test.ts b/test/orquestrador-prevoo.test.ts
index b65f35e..f189e61 100644
--- a/test/orquestrador-prevoo.test.ts
+++ b/test/orquestrador-prevoo.test.ts
@@ -41,6 +41,7 @@ const CONFIG = {
 
 function depsVerdes(over: Partial<PreVooDeps> = {}): PreVooDeps {
   return {
+    tsxLocal: () => true,
     arquivoComConteudo: () => true,
     contarArquivosCommitados: () => 6,
     lerOrigin: () => 'git@github.com:exemplo/actus-saas.git',
@@ -205,13 +206,16 @@ describe('preVooRelampago: composição', () => {
   });
 
   it('preVooRelampago: para na primeira falha (cat.0 antes de cat.1/cat.6)', () => {
+    // A cat.7 (toolchain, peça T1) roda ANTES e está verde aqui: o que se mede
+    // é que a cat.0 aborta sem deixar cat.1 e cat.6 rodarem.
     const r = preVooRelampago({
       config: CONFIG,
       deps: depsVerdes({ arquivoComConteudo: () => false, lerOrigin: () => '', lerLiberacoes: () => 'x' }),
     });
     expect(r.ok).toBe(false);
     expect(r.token).toBe('cat.0');
-    expect(r.itens).toHaveLength(1);
+    expect(r.itens).toHaveLength(2);
+    expect(r.itens[0]?.token).toBe('cat.7');
   });
 
   it('preVooRelampago: dep que LANÇA vira aborto limpo nomeando o item ⚡', () => {
@@ -259,9 +263,10 @@ describe('preVooRelampago: composição', () => {
   it('render: um item por linha, e a última linha é o veredito', () => {
     const go = render(preVooRelampago({ config: CONFIG, deps: depsVerdes() }));
     const linhas = go.trimEnd().split('\n');
-    expect(linhas).toHaveLength(5); // cat.0, cat.1, cat.6, cat.3 e o veredito
+    expect(linhas).toHaveLength(6); // cat.7, cat.0, cat.1, cat.6, cat.3 e o veredito
     expect(linhas.at(-1)).toBe('GO');
-    expect(linhas[0]).toMatch(/^ok {4}cat\.0 /);
+    expect(linhas[0]).toMatch(/^ok {4}cat\.7 /);
+    expect(linhas[1]).toMatch(/^ok {4}cat\.0 /);
     expect(linhas.at(-2)).toMatch(/^info {2}cat\.3 /);
 
     const nogo = render(preVooRelampago({ config: CONFIG, deps: depsVerdes({ lerOrigin: () => 'outro' }) }));
@@ -333,10 +338,18 @@ describe('local-loop.sh chama o pré-voo ANTES do lock', () => {
   // propriedade que importa: em NO-GO nenhum TICKET é tocado, e o primeiro
   // passo que escreve em ticket é o `--reconcile`.
   it('a chamada vem depois do lock e da pausa, e ANTES do reconcile e de drenar', () => {
+    // A peça T1 pôs UMA checagem antes do lock — `tsx_ou_sai` —, e ela é de
+    // outra natureza: não é o pré-voo, é a condição para o lock existir (o
+    // `lock_stale` roda `tsx -e`). A ordem medida aqui não mudou.
+    const iTsx = loop.indexOf('\n  tsx_ou_sai\n');
     const iLock = loop.indexOf('lock_adquirir || exit 0');
+    expect(iTsx).toBeGreaterThan(0);
+    expect(iTsx).toBeLessThan(iLock);
     const iPausa = loop.indexOf('  if pausa_ativa; then\n    say "PAUSA ativa');
     const iPrevoo = loop.indexOf('\n  prevoo_ou_sai\n');
-    const iReconcile = loop.indexOf('--reconcile');
+    // A CHAMADA, não a flag solta: `--reconcile` aparece em comentário antes de
+    // aparecer em código, e uma âncora que um comentário move não mede ordem.
+    const iReconcile = loop.indexOf('bash "$ORQ_LIB_DIR/executor.sh" --reconcile');
     const iDrenar = loop.indexOf('\n  drenar\n');
     expect(iLock).toBeGreaterThan(0);
     expect(iLock).toBeLessThan(iPausa);
@@ -362,6 +375,7 @@ describe('local-loop.sh chama o pré-voo ANTES do lock', () => {
   });
 
   it('o pré-voo é substituível por stub, como run_executor_once', () => {
-    expect(loop).toMatch(/run_prevoo\(\) \{\n  npx tsx "\$ORQ_LIB_DIR\/prevoo\.ts"/);
+    // `"${ORQ_TSX[@]}"` desde a peça T1: a resolução do tsx é uma só, no lib.sh.
+    expect(loop).toMatch(/run_prevoo\(\) \{\n  "\$\{ORQ_TSX\[@\]\}" "\$ORQ_LIB_DIR\/prevoo\.ts"/);
   });
 });
diff --git a/test/orquestrador-push-suprimido.test.ts b/test/orquestrador-push-suprimido.test.ts
new file mode 100644
index 0000000..c3f90c8
--- /dev/null
+++ b/test/orquestrador-push-suprimido.test.ts
@@ -0,0 +1,166 @@
+/**
+ * D11 — `push_suprimido` é INFORMATIVA, não interruptor.
+ *
+ * ORIGEM (só leitura, 2026-09-09): `~/orq-sessoes/revisao-adocao-actus.md`,
+ * achado **V-4**. O plano de adoção do Actus escrevia `push_suprimido: true`
+ * como se fosse a decisão 7 executada ("o loop não pusha"). Não é: a chave não
+ * está em `config-chaves.ts`, nenhum script do motor a lê, e o config do CI a
+ * tem em `false` sem que o loop de lá pushe. Ler um valor como garantia quando
+ * ninguém o consulta é a forma mais cara de segurança: ela não falha, ela
+ * simplesmente nunca esteve lá.
+ *
+ * A peça não toca no motor — não há o que consertar, o motor está certo. Ela
+ * TRANCA a afirmação contra o disco, para que "é informativa" pare de ser uma
+ * frase que alguém tem de reverificar por grep a cada leitura, e escreve no
+ * CONTRATO e no template quem de fato impede o push.
+ */
+import { describe, it, expect } from 'vitest';
+import { readFileSync } from 'node:fs';
+import { join } from 'node:path';
+import { CHAVES_CONFIG } from '../scripts/orquestrador/config-chaves.js';
+import { PISO_TOOLS_SEMENTE } from '../scripts/orquestrador/perfil.js';
+import { REPO_ROOT } from './fixtures/orq-harness.js';
+
+const MOTOR = [
+  'scripts/orq',
+  'scripts/orquestrador/lib.sh',
+  'scripts/orquestrador/local-loop.sh',
+  'scripts/orquestrador/executor.sh',
+  'scripts/orquestrador/enforcement.sh',
+  'scripts/orquestrador/launchd-run.sh',
+];
+
+/**
+ * `git push` em POSIÇÃO DE COMANDO — começo de linha ou logo depois de um
+ * separador de comando. Um `git push` citado no meio de uma frase (o prompt do
+ * executor proíbe o agente de dar um) não é uma chamada, e cobrar por substring
+ * transformaria a própria proibição em violação.
+ */
+const INVOCA_PUSH = /(^[ \t]*|[;&|(][ \t]*|\$\([ \t]*)git[ \t]+(-C[ \t]+\S+[ \t]+)?push\b/m;
+
+function fonte(rel: string): string {
+  return readFileSync(join(REPO_ROOT, rel), 'utf8');
+}
+
+/** Só as linhas de CÓDIGO: comentário PODE (e deve) citar a chave. */
+function codigo(rel: string): string {
+  return fonte(rel)
+    .split('\n')
+    .filter((l) => !/^\s*(#|\/\/|\*)/.test(l))
+    .join('\n');
+}
+
+describe('ninguém no motor LÊ push_suprimido', () => {
+  it('a chave não está em config-chaves.ts, nem obrigatória nem opcional', () => {
+    expect(CHAVES_CONFIG.map((c) => c.chave)).not.toContain('push_suprimido');
+  });
+
+  it('nenhum script do motor a consulta em código', () => {
+    for (const rel of MOTOR) expect(codigo(rel), rel).not.toContain('push_suprimido');
+  });
+
+  it('nenhum .ts do motor a acessa', () => {
+    const ts = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'config-chaves.ts'), 'utf8');
+    expect(ts).not.toContain('push_suprimido');
+  });
+
+  it('`staging_linha` afirma a supressão SEMPRE — não é derivada do config', () => {
+    const fn = /staging_linha\(\) \{[\s\S]*?\n\}/.exec(fonte('scripts/orquestrador/lib.sh'))![0];
+    expect(fn).toContain('push suprimido (publicar é humano neste repo)');
+    expect(fn).not.toContain('cfg ');
+    // Sem `if`: não há caminho em que o snapshot diga outra coisa.
+    expect(fn).not.toMatch(/\bif\b/);
+  });
+
+  it('o motor não INVOCA `git push` — a supressão é construção, não config', () => {
+    // `git push` em POSIÇÃO DE COMANDO: começo de linha, ou depois de um
+    // separador. A prosa não conta, e ela existe — o prompt do executor diz
+    // "NUNCA dê git push" ao agente (executor.sh:374), que é a proibição
+    // funcionando e não uma chamada.
+    for (const rel of MOTOR) expect(codigo(rel), rel).not.toMatch(INVOCA_PUSH);
+  });
+
+  it('e o grep NÃO é sempre-verdadeiro: as formas reais de invocar casam', () => {
+    for (const linha of [
+      'git push origin main',
+      '  git push --force',
+      'git -C "$ROOT" push origin staging-auto',
+      'branch_existe x && git push origin x',
+      'sha="$(git push --dry-run)"',
+    ]) {
+      expect(linha, linha).toMatch(INVOCA_PUSH);
+    }
+    // E a prosa do prompt, que é a proibição e não uma chamada, NÃO casa.
+    expect('- NUNCA dê git push. NUNCA escreva credencial/segredo.').not.toMatch(INVOCA_PUSH);
+  });
+});
+
+describe('quem IMPEDE o push são o piso de tools e a branch protegida', () => {
+  it('o piso-semente do kit traz `Bash(git push:*)`', () => {
+    expect(PISO_TOOLS_SEMENTE).toContain('Bash(git push:*)');
+  });
+
+  it('o template do config traz o mesmo piso', () => {
+    const cfg = JSON.parse(fonte('doutrina/templates/config.json')) as {
+      proibicoes_absolutas: { tools: string[] };
+    };
+    expect(cfg.proibicoes_absolutas.tools).toContain('Bash(git push:*)');
+  });
+
+  it('`merge_em_alvo` recusa a branch protegida — como alvo E como HEAD da worktree', () => {
+    const fn = /merge_em_alvo\(\) \{[\s\S]*?\n\}/.exec(fonte('scripts/orquestrador/local-loop.sh'))![0];
+    expect(fn).toContain('"$BRANCH_ALVO" = "$BRANCH_PROTEGIDA"');
+    expect(fn).toContain('"$alvo_atual" = "$BRANCH_PROTEGIDA"');
+    expect((fn.match(/merge recusado/g) ?? []).length).toBe(2);
+  });
+});
+
+describe('a chave está documentada como informativa, nos três lugares', () => {
+  it('o template diz que NÃO é interruptor, e diz quem impede', () => {
+    const bruto = fonte('doutrina/templates/config.json');
+    const cfg = JSON.parse(bruto) as Record<string, unknown>;
+    // O valor continua lá: a decisão vale a pena registrar.
+    expect(cfg.push_suprimido).toBe(false);
+    const nota = String(cfg._push_suprimido ?? '');
+    expect(nota).toMatch(/não é interruptor/i);
+    expect(nota).toContain('Bash(git push:*)');
+    expect(nota).toContain('branch_protegida');
+    // O comentário fica IMEDIATAMENTE antes da chave: um `_x` longe do `x` é um
+    // comentário que ninguém lê no momento em que decide o valor.
+    expect(bruto.indexOf('"_push_suprimido"')).toBeLessThan(bruto.indexOf('"push_suprimido"'));
+  });
+
+  it('CONTRATO.md §8 registra a afirmação e as duas travas de verdade', () => {
+    const c = fonte('CONTRATO.md');
+    expect(c).toMatch(/`push_suprimido` é INFORMATIVA/);
+    expect(c).toContain('`Bash(git push:*)`');
+    expect(c).toContain('`branch_protegida`');
+    expect(c).toContain('lib.sh:staging_linha');
+  });
+
+  it('a tabela de kill switches da doutrina não a lista mais como um', () => {
+    const doc = fonte('doutrina/references/autoalimentacao.md');
+    const linha = doc.split('\n').find((l) => l.includes('push_suprimido'))!;
+    expect(linha).toMatch(/NÃO é kill switch/);
+    expect(linha).toContain('CONTRATO.md');
+  });
+});
+
+describe('o CI é a prova de que o valor não faz diferença', () => {
+  it('o config do CI tem push_suprimido: false — e o loop de lá não pusha', () => {
+    const ci = JSON.parse(fonte('_referencia-ci/000-config.ci.json')) as Record<string, unknown>;
+    expect(ci.push_suprimido).toBe(false);
+    // Se a chave fosse interruptor, `false` significaria "pushe". O motor
+    // vendorizado é o mesmo deste kit, e ele não tem um `git push`.
+    expect(codigo('scripts/orquestrador/local-loop.sh')).not.toMatch(INVOCA_PUSH);
+  });
+
+  it('o fixture do kit tem `true` e o comportamento é idêntico', () => {
+    const fx = JSON.parse(fonte('fixture/docs/fila/000-config.json')) as Record<string, unknown>;
+    expect(fx.push_suprimido).toBe(true);
+    // Dois repos, dois valores, um comportamento: é exatamente isto que faz da
+    // chave um registro e não um gate.
+    const ci = JSON.parse(fonte('_referencia-ci/000-config.ci.json')) as Record<string, unknown>;
+    expect(fx.push_suprimido).not.toBe(ci.push_suprimido);
+  });
+});
diff --git a/test/orquestrador-toolchain-tsx.test.ts b/test/orquestrador-toolchain-tsx.test.ts
new file mode 100644
index 0000000..7355ac7
--- /dev/null
+++ b/test/orquestrador-toolchain-tsx.test.ts
@@ -0,0 +1,471 @@
+/**
+ * T1 — `tsx` é dependência do MOTOR, e o motor para de sair para a rede.
+ *
+ * ORIGEM (só leitura, 2026-09-09): `~/orq-sessoes/revisao-adocao-actus.md`,
+ * bloqueante **B-1**. O motor executa TypeScript por `npx tsx` em 14 chamadas;
+ * `npx` sem flag BAIXA o que não encontra. No `~/Projetos/actus-saas` medido
+ * naquele dia, `node_modules/.bin/` tinha `next`, `tsc` e `vitest` e NÃO tinha
+ * `tsx` — a Fase A da adoção passava (ela chama o `orq` DO KIT, que faz `cd`
+ * para o kit) e o B3 quebrava, com o `npx` indo buscar o pacote na rede: prompt
+ * interativo num TTY, erro fora dele, tick mudo sob o launchd.
+ *
+ * Esta peça troca a resolução por uma só, no `lib.sh` (`ORQ_TSX` / `tsx_bin`),
+ * e põe a ausência do binário como RECUSA em três bocas: o `local-loop.sh`
+ * (antes de qualquer chamada TypeScript), a `cat.7` do pré-voo e o
+ * `instalar.sh` (`--atualizar` e `--novo`).
+ */
+import { describe, it, expect } from 'vitest';
+import { spawnSync } from 'node:child_process';
+import {
+  chmodSync,
+  existsSync,
+  mkdirSync,
+  mkdtempSync,
+  readFileSync,
+  readdirSync,
+  realpathSync,
+  rmSync,
+  statSync,
+  writeFileSync,
+} from 'node:fs';
+import { tmpdir } from 'node:os';
+import { join } from 'node:path';
+import {
+  checarToolchain,
+  preVooDepsReais,
+  preVooRelampago,
+  render,
+} from '../scripts/orquestrador/prevoo.js';
+import type { PreVooDeps } from '../scripts/orquestrador/prevoo.js';
+import { REPO_ROOT, checkoutReal, ler } from './fixtures/orq-harness.js';
+
+const LIB = join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh');
+const ORQ = join(REPO_ROOT, 'scripts', 'orq');
+const LOOP = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh');
+const INSTALAR = join(REPO_ROOT, 'instalar.sh');
+const BIN_SEM_REDE = join(REPO_ROOT, 'test', 'fixtures', 'bin-sem-rede');
+
+const FX = checkoutReal();
+
+/**
+ * Uma CÓPIA do fixture instanciado, com o `node_modules` (que lá é symlink para
+ * o do kit) removido. É o repo do Actus de 2026-09-09 reproduzido: motor
+ * instalado, config válido, git de verdade — e nenhum `tsx`.
+ *
+ * Copiar em vez de instanciar outro fixture é decisão: `fixture.sh` só sabe
+ * fazer o repo COM o symlink, e mexer nele para produzir um repo quebrado
+ * colocaria o caso de teste dentro do instanciador que todos os outros usam.
+ */
+function copiaSemTsx(): string {
+  const raiz = mkdtempSync(join(tmpdir(), 'orq-sem-tsx-'));
+  const dest = join(raiz, 'repo');
+  mkdirSync(dest, { recursive: true });
+  const r = spawnSync('cp', ['-R', `${FX}/.`, dest], { encoding: 'utf8' });
+  if (r.status !== 0) throw new Error(`cp -R falhou: ${r.stderr}`);
+  rmSync(join(dest, 'node_modules'), { force: true, recursive: true });
+  return dest;
+}
+
+/** A mesma cópia, mas COM um `tsx` executável no lugar canônico. */
+function copiaComTsx(): string {
+  const dest = copiaSemTsx();
+  const bin = join(dest, 'node_modules', '.bin');
+  mkdirSync(bin, { recursive: true });
+  writeFileSync(join(bin, 'tsx'), '#!/bin/sh\nexit 0\n');
+  chmodSync(join(bin, 'tsx'), 0o755);
+  return dest;
+}
+
+/** Carrega o lib.sh com ORQ_EXEC_ROOT no checkout dado e roda `corpo`. */
+function comLib(raiz: string, corpo: string): { rc: number; saida: string } {
+  const script = [`export ORQ_EXEC_ROOT="${raiz}"`, `source "${LIB}"`, 'set +e', corpo].join('\n');
+  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: raiz });
+  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
+}
+
+// ─── lib.sh: a resolução, uma vez ────────────────────────────────────────────
+
+describe('lib.sh · tsx_bin resolve o binário UMA vez', () => {
+  it('com node_modules/.bin/tsx no checkout, resolve para ELE (caminho absoluto)', () => {
+    const r = comLib(FX, 'tsx_bin');
+    expect(r.rc).toBe(0);
+    // `realpath` dos dois lados: MAIN_CHECKOUT vem do `git rev-parse
+    // --path-format=absolute`, que resolve `/tmp` -> `/private/tmp` no macOS.
+    expect(r.saida.trim()).toBe(join(realpathSync(FX), 'node_modules', '.bin', 'tsx'));
+  });
+
+  it('sem o binário local, cai em `npx --no-install tsx` — nunca em `npx` cru', () => {
+    const repo = copiaSemTsx();
+    const r = comLib(repo, 'tsx_bin');
+    expect(r.saida.trim()).toBe('npx --no-install tsx');
+    // A flag É a peça: sem ela, este é exatamente o comando que baixa da rede.
+    expect(r.saida).toContain('--no-install');
+  });
+
+  it('tsx_local_ok responde pelo binário DO REPO, e é `test -x`', () => {
+    expect(comLib(FX, 'tsx_local_ok; echo rc=$?').saida).toContain('rc=0');
+    expect(comLib(copiaSemTsx(), 'tsx_local_ok; echo rc=$?').saida).toContain('rc=1');
+    // Um arquivo que existe e NÃO é executável não vale: o motor iria executá-lo.
+    const repo = copiaComTsx();
+    chmodSync(join(repo, 'node_modules', '.bin', 'tsx'), 0o644);
+    expect(comLib(repo, 'tsx_local_ok; echo rc=$?').saida).toContain('rc=1');
+  });
+
+  it('a resolução é contra o checkout PRINCIPAL, não contra o ROOT de execução', () => {
+    const fonte = readFileSync(LIB, 'utf8');
+    expect(fonte).toContain('TSX_LOCAL="$MAIN_CHECKOUT/node_modules/.bin/tsx"');
+  });
+});
+
+// ─── nenhuma chamada `npx tsx` crua sobrou no motor ──────────────────────────
+
+describe('as 14 chamadas do motor passam pela resolução única', () => {
+  const ARQUIVOS = [
+    'scripts/orq',
+    'scripts/orquestrador/executor.sh',
+    'scripts/orquestrador/local-loop.sh',
+    'scripts/orquestrador/enforcement.sh',
+    'scripts/orquestrador/test-retry-worktree.sh',
+  ];
+
+  /** Só as linhas de CÓDIGO: comentário pode (e deve) citar o `npx tsx` antigo. */
+  function codigo(rel: string): string {
+    return readFileSync(join(REPO_ROOT, rel), 'utf8')
+      .split('\n')
+      .filter((l) => !/^\s*#/.test(l))
+      .join('\n');
+  }
+
+  it('zero `npx tsx` em código, nos cinco arquivos que o tinham', () => {
+    for (const rel of ARQUIVOS) expect(codigo(rel)).not.toMatch(/npx\s+tsx/);
+  });
+
+  it('as 14 chamadas usam "${ORQ_TSX[@]}" — array, nunca `$(tsx_bin)` sem aspas', () => {
+    const total = ARQUIVOS.map((rel) => (codigo(rel).match(/"\$\{ORQ_TSX\[@\]\}"/g) ?? []).length)
+      .reduce((a, b) => a + b, 0);
+    // 13 aqui: a 14ª é o `orq config`, despachado ANTES do lib.sh (caso abaixo).
+    expect(total).toBe(13);
+    for (const rel of ARQUIVOS) expect(codigo(rel)).not.toMatch(/\$\(tsx_bin\)/);
+  });
+
+  it('launchd-run.sh:45 continua sendo COMENTÁRIO — não havia chamada para trocar', () => {
+    const fonte = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'launchd-run.sh'), 'utf8');
+    expect(fonte).toMatch(/#.*`npx tsx`/);
+    expect(codigo('scripts/orquestrador/launchd-run.sh')).not.toMatch(/npx\s+tsx/);
+  });
+
+  it('`orq config` roda antes do lib.sh e resolve o tsx pela MESMA regra', () => {
+    const fonte = readFileSync(ORQ, 'utf8');
+    const prologo = fonte.slice(0, fonte.indexOf('source "$ORQ_DIR/orquestrador/lib.sh"'));
+    expect(prologo).toContain('$_main/node_modules/.bin/tsx');
+    expect(prologo).toContain('npx --no-install tsx');
+    expect(prologo).toContain('"${_tsx[@]}"');
+    expect(prologo).not.toMatch(/npx\s+tsx\b/);
+  });
+
+  it('`orq config` de verdade continua respondendo no fixture (rc 0)', () => {
+    const r = spawnSync(ORQ, ['config'], {
+      encoding: 'utf8',
+      cwd: FX,
+      env: { ...process.env, ORQ_EXEC_ROOT: FX },
+    });
+    expect(r.status).toBe(0);
+  });
+});
+
+// ─── local-loop.sh: a recusa vem ANTES de qualquer TypeScript ────────────────
+
+describe('local-loop.sh · tsx_ou_sai precede tudo', () => {
+  const loop = readFileSync(LOOP, 'utf8');
+
+  it('a chamada vem ANTES do lock — que já é TypeScript (lock_stale roda tsx -e)', () => {
+    const iTsx = loop.indexOf('\n  tsx_ou_sai\n');
+    const iLock = loop.indexOf('lock_adquirir || exit 0');
+    expect(iTsx).toBeGreaterThan(0);
+    expect(iTsx).toBeLessThan(iLock);
+  });
+
+  it('em falta: PREVOO_NOGO item=tsx, notifica, sai 1 — e NÃO escreve STATUS', () => {
+    const fn = /tsx_ou_sai\(\) \{[\s\S]*?\n\}/.exec(loop)![0];
+    expect(fn).toContain('event \'---\' PREVOO_NOGO "item=tsx"');
+    expect(fn).toContain('notificar "Orquestrador: pré-voo NO-GO"');
+    expect(fn).toContain('exit 1');
+    // STATUS é do run que tem o lock, e aqui ainda não há lock nenhum.
+    expect(fn).not.toContain('status_set');
+    expect(fn).not.toMatch(/ticket_set|run_executor_once|lock_adquirir/);
+  });
+
+  it('a mensagem nomeia o passo humano, com a versão do kit', () => {
+    const fn = /tsx_ou_sai\(\) \{[\s\S]*?\n\}/.exec(loop)![0];
+    expect(fn).toContain('pnpm add -D tsx@^4.19.0');
+    expect(fn).toContain('npm i -D tsx@^4.19.0');
+  });
+});
+
+describe('local-loop.sh · rodado de verdade num repo sem tsx', () => {
+  /** PATH com o stub de `npx` na frente: chegar nele já é a falha. */
+  function ambiente(raiz: string, logNpx: string) {
+    return {
+      ...process.env,
+      PATH: `${BIN_SEM_REDE}:${process.env.PATH ?? ''}`,
+      ORQ_NPX_LOG: logNpx,
+      ORQ_EXEC_ROOT: raiz,
+      ORQ_TESTE: '1',
+    };
+  }
+
+  function rodar(raiz: string) {
+    const logNpx = join(raiz, '..', 'npx-chamadas.log');
+    const r = spawnSync('bash', [join(raiz, 'scripts', 'orquestrador', 'local-loop.sh')], {
+      encoding: 'utf8',
+      cwd: raiz,
+      env: ambiente(raiz, logNpx),
+    });
+    return {
+      rc: r.status ?? 1,
+      log: ler(join(raiz, 'docs', 'fila', 'runs', 'local-loop.log')),
+      eventos: ler(join(raiz, 'docs', 'fila', 'runs', 'events.log')),
+      notificacoes: ler(join(raiz, 'docs', 'fila', 'runs', 'notificacoes.log')),
+      npx: ler(logNpx),
+    };
+  }
+
+  /** Assinatura de todos os tickets da fila: nome + tamanho + mtime. */
+  function fila(raiz: string): string[] {
+    const dir = join(raiz, 'docs', 'fila');
+    return readdirSync(dir)
+      .filter((f) => /^[0-9].*\.md$/.test(f))
+      .sort()
+      .map((f) => {
+        const s = statSync(join(dir, f));
+        return `${f} ${s.size} ${s.mtimeMs}`;
+      });
+  }
+
+  it('recusa NOMEADA: rc 1, PREVOO_NOGO item=tsx na trilha e uma notificação', () => {
+    const repo = copiaSemTsx();
+    const r = rodar(repo);
+    expect(r.rc).toBe(1);
+    expect(r.eventos).toContain('PREVOO_NOGO item=tsx');
+    expect(r.log).toContain('toolchain NO-GO');
+    expect(r.log).toContain('node_modules/.bin/tsx');
+    expect(r.notificacoes).toContain('pré-voo NO-GO');
+  });
+
+  it('SEM acesso à rede: o `npx` nunca é chamado (o stub não registrou nada)', () => {
+    const repo = copiaSemTsx();
+    const r = rodar(repo);
+    expect(r.npx).toBe('');
+  });
+
+  it('não toca ticket nenhum, não cria lock e não reescreve o STATUS', () => {
+    const repo = copiaSemTsx();
+    const antes = fila(repo);
+    const statusAntes = ler(join(repo, 'docs', 'fila', 'runs', 'STATUS.md'));
+    const r = rodar(repo);
+    expect(r.rc).toBe(1);
+    expect(fila(repo)).toEqual(antes);
+    expect(existsSync(join(repo, 'docs', 'fila', 'runs', '.local-loop.lock'))).toBe(false);
+    expect(ler(join(repo, 'docs', 'fila', 'runs', 'STATUS.md'))).toBe(statusAntes);
+  });
+
+  it('COM tsx no lugar, o guard passa e o loop segue para o kill switch', () => {
+    const repo = copiaComTsx();
+    writeFileSync(join(repo, 'docs', 'fila', 'PAUSAR'), 'teste T1\n');
+    const r = rodar(repo);
+    expect(r.rc).toBe(0);
+    expect(r.log).not.toContain('toolchain NO-GO');
+    expect(r.eventos).not.toContain('item=tsx');
+    expect(r.log).toContain('PAUSA ativa');
+  });
+});
+
+// ─── pré-voo: cat.7 ──────────────────────────────────────────────────────────
+
+describe('cat.7 · toolchain', () => {
+  function deps(over: Partial<PreVooDeps> = {}): PreVooDeps {
+    return {
+      tsxLocal: () => true,
+      arquivoComConteudo: () => true,
+      contarArquivosCommitados: () => 6,
+      lerOrigin: () => 'git@github.com:exemplo/actus-saas.git',
+      lerEnv: () => 'SUPABASE_URL=https://fqwhpcusmkmvtgyofuwh.supabase.co',
+      filaTemArquivo: () => true,
+      filaTemDir: () => true,
+      lerLiberacoes: () => '{"tokens":[]}',
+      ultimaSondagem: () => null,
+      hoje: () => '2026-09-09',
+      ...over,
+    };
+  }
+  const CONFIG = { repo_origin_deve_conter: 'actus-saas', ambiente_id: 'fqwhpcusmkmvtgyofuwh' };
+
+  it('sem o tsx do repo: NO-GO com token cat.7 e a linha de instalação', () => {
+    const r = checarToolchain({ tsxLocal: () => false });
+    expect(r.ok).toBe(false);
+    expect(r.token).toBe('cat.7');
+    expect(r.item).toContain('node_modules/.bin/tsx');
+    expect(r.motivo).toContain('pnpm add -D tsx@^4.19.0');
+  });
+
+  it('com o tsx do repo: ok, e não é item informativo (decide o veredito)', () => {
+    const r = checarToolchain({ tsxLocal: () => true });
+    expect(r.ok).toBe(true);
+    expect(r.info).toBeUndefined();
+  });
+
+  it('a cat.7 é a PRIMEIRA: em NO-GO dela, nenhuma outra chega a rodar', () => {
+    const chamadas: string[] = [];
+    const v = preVooRelampago({
+      config: CONFIG,
+      deps: deps({
+        tsxLocal: () => false,
+        arquivoComConteudo: () => {
+          chamadas.push('cat.0');
+          return true;
+        },
+        lerOrigin: () => {
+          chamadas.push('cat.1');
+          return '';
+        },
+      }),
+    });
+    expect(v.ok).toBe(false);
+    expect(v.token).toBe('cat.7');
+    expect(v.itens).toHaveLength(1);
+    expect(chamadas).toEqual([]);
+  });
+
+  it('a última linha do render é `NO-GO cat.7 · …` — o que o loop lê com awk $2', () => {
+    const saida = render(preVooRelampago({ config: CONFIG, deps: deps({ tsxLocal: () => false }) }));
+    const ultima = saida.trim().split('\n').pop()!;
+    expect(ultima.startsWith('NO-GO cat.7 · ')).toBe(true);
+    expect(ultima.split(' ')[1]).toBe('cat.7');
+  });
+
+  it('em GO, a cat.7 aparece na saída antes da cat.0', () => {
+    const saida = render(preVooRelampago({ config: CONFIG, deps: deps() }));
+    expect(saida.indexOf('cat.7')).toBeLessThan(saida.indexOf('cat.0'));
+    expect(saida.trim().endsWith('GO')).toBe(true);
+  });
+
+  it('a dep real é `test -x` no checkout: nada de npx, nada de rede', () => {
+    const comTsx = preVooDepsReais({ repoRoot: FX, filaDir: join(FX, 'docs/fila'), runsDir: join(FX, 'docs/fila/runs'), custoFile: join(FX, 'docs/fila/runs/custo.json') });
+    expect(comTsx.tsxLocal()).toBe(true);
+    const semTsxRepo = copiaSemTsx();
+    const semTsx = preVooDepsReais({ repoRoot: semTsxRepo, filaDir: join(semTsxRepo, 'docs/fila'), runsDir: join(semTsxRepo, 'docs/fila/runs'), custoFile: join(semTsxRepo, 'docs/fila/runs/custo.json') });
+    expect(semTsx.tsxLocal()).toBe(false);
+    // O código da dep não menciona npx: a pergunta é sobre o binário DO REPO.
+    const fonte = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'prevoo.ts'), 'utf8');
+    const dep = /tsxLocal: \(\) => \{[\s\S]*?\n    \},/.exec(fonte)![0];
+    expect(dep).not.toContain('npx');
+    expect(dep).toContain('constants.X_OK');
+  });
+
+  it('`orq prevoo` no fixture continua GO, com a cat.7 na saída', () => {
+    const r = spawnSync(ORQ, ['prevoo'], {
+      encoding: 'utf8',
+      cwd: FX,
+      env: { ...process.env, ORQ_EXEC_ROOT: FX },
+    });
+    expect(r.status).toBe(0);
+    expect(r.stdout).toContain('cat.7');
+    expect(r.stdout.trim().endsWith('GO')).toBe(true);
+  });
+});
+
+// ─── instalar.sh: --atualizar e --novo recusam; --dry-run só avisa ───────────
+
+describe('instalar.sh · recusa repo sem tsx', () => {
+  function instalar(args: string[]) {
+    const r = spawnSync('bash', [INSTALAR, ...args], {
+      encoding: 'utf8',
+      env: { ...process.env, ORQ_TESTE: '1' },
+    });
+    return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
+  }
+
+  /** Repo git virgem, sem docs/fila e sem node_modules — o alvo do `--novo`. */
+  function repoVirgem(lock?: 'pnpm' | 'npm'): string {
+    const raiz = mkdtempSync(join(tmpdir(), 'orq-novo-'));
+    writeFileSync(join(raiz, 'package.json'), '{"name":"alvo","private":true}\n');
+    if (lock === 'pnpm') writeFileSync(join(raiz, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
+    if (lock === 'npm') writeFileSync(join(raiz, 'package-lock.json'), '{"lockfileVersion":3}\n');
+    for (const a of [
+      ['init', '-q', '-b', 'main'],
+      ['config', 'user.name', 't'],
+      ['config', 'user.email', 't@example.invalid'],
+      ['add', '--', 'package.json'],
+      ['commit', '-q', '-m', 'inicial'],
+    ]) {
+      spawnSync('git', ['-C', raiz, ...a], { encoding: 'utf8' });
+    }
+    return raiz;
+  }
+
+  it('--atualizar RECUSA (rc 1) e a mensagem nomeia o repo e o comando', () => {
+    const repo = copiaSemTsx();
+    writeFileSync(join(repo, 'docs', 'fila', 'PAUSAR'), 'atualizando\n');
+    const r = instalar(['--atualizar', repo]);
+    expect(r.rc).toBe(1);
+    expect(r.saida).toContain('RECUSADO');
+    expect(r.saida).toContain('node_modules/.bin/tsx');
+    expect(r.saida).toContain(repo);
+  });
+
+  it('--forcar NÃO dispensa: forçar copiaria um motor que não roda', () => {
+    const repo = copiaSemTsx();
+    writeFileSync(join(repo, 'docs', 'fila', 'PAUSAR'), 'atualizando\n');
+    expect(instalar(['--atualizar', repo, '--forcar']).rc).toBe(1);
+  });
+
+  it('--dry-run SÓ AVISA: sai 0 e prevê a recusa, sem escrever nada', () => {
+    const repo = copiaSemTsx();
+    writeFileSync(join(repo, 'docs', 'fila', 'PAUSAR'), 'atualizando\n');
+    const sujoAntes = spawnSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' }).stdout;
+    const r = instalar(['--atualizar', repo, '--dry-run']);
+    expect(r.rc).toBe(0);
+    expect(r.saida).toContain('RECUSARIA');
+    expect(r.saida).toContain('node_modules/.bin/tsx');
+    expect(spawnSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' }).stdout).toBe(sujoAntes);
+  });
+
+  it('com pnpm-lock.yaml a linha é `pnpm add -D`; com package-lock.json é `npm i -D`', () => {
+    const comPnpm = repoVirgem('pnpm');
+    expect(instalar(['--novo', comPnpm]).saida).toContain('pnpm add -D tsx@^4.19.0');
+    const comNpm = repoVirgem('npm');
+    expect(instalar(['--novo', comNpm]).saida).toContain('npm i -D tsx@^4.19.0');
+  });
+
+  it('--novo RECUSA (rc 1) e não escreve UM byte no repo alvo', () => {
+    const repo = repoVirgem('pnpm');
+    const antes = readdirSync(repo).sort();
+    const r = instalar(['--novo', repo]);
+    expect(r.rc).toBe(1);
+    expect(r.saida).toContain('RECUSADO');
+    expect(readdirSync(repo).sort()).toEqual(antes);
+    expect(existsSync(join(repo, 'docs'))).toBe(false);
+    expect(existsSync(join(repo, 'scripts'))).toBe(false);
+  });
+
+  it('com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx)', () => {
+    const repo = repoVirgem('pnpm');
+    const bin = join(repo, 'node_modules', '.bin');
+    mkdirSync(bin, { recursive: true });
+    writeFileSync(join(bin, 'tsx'), '#!/bin/sh\nexit 0\n');
+    chmodSync(join(bin, 'tsx'), 0o755);
+    const r = instalar(['--novo', repo]);
+    expect(r.saida).not.toContain('node_modules/.bin/tsx');
+    expect(existsSync(join(repo, 'docs', 'fila', '000-config.json'))).toBe(true);
+  });
+
+  it('o range do tsx sai do package.json do kit — nunca de uma constante à parte', () => {
+    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
+      devDependencies: Record<string, string>;
+    };
+    const fonte = readFileSync(INSTALAR, 'utf8');
+    expect(fonte).toContain('"$KIT/package.json"');
+    const repo = repoVirgem('pnpm');
+    expect(instalar(['--novo', repo]).saida).toContain(`tsx@${pkg.devDependencies.tsx}`);
+  });
+});
```

</details>
