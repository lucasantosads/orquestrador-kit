# Relatório · kit do Orquestrador · etapa 3

**Quando:** 2026-09-08, 12:16 → 12:45 -0300
**Repo:** `~/Projetos/orquestrador-kit`, branch `main`
**HEAD antes:** `412b380` · **HEAD depois:** `d72cdcd` · **árvore limpa, nada pushado por esta sessão**
**Chamadas à API da Anthropic:** nenhuma. O e2e não foi rodado.
**Escrita fora do kit:** nenhuma. `~/Projetos/conteudos-infinitos` foi lido cinco vezes e
nunca escrito — provado por `cksum` e `git status --porcelain` antes e depois do `--dry-run`.

Esta é a primeira etapa que edita `scripts/orquestrador/**` e `doutrina/**`. Cada mudança de
motor tem, no mesmo commit, o teste que falhava antes; o vermelho-antes está colado na
mensagem de cada commit e reproduzido aqui.

---

## 0 · Achado do PASSO 0, antes de qualquer edição

**`git ls-remote origin main` responde `ERROR: Repository not found`.**
O remoto configurado é `git@github.com:lucasantosads/orquestrador-kit.git` e a chave desta
máquina não o alcança. Não há ref `origin/main` local e `main` não tem upstream, então
`git status -sb` imprime `## main` sem `ahead` — mas isso é ausência de informação, não prova
de que está pushado. Segui porque a árvore estava limpa e o HEAD era o `412b380` combinado; o
Lucas é quem sabe se o push da etapa 2 chegou. **Nenhum push foi tentado nesta sessão.**

---

## 1 · Fechamento — saídas cruas

### `npx vitest run --reporter=dot | tail -6`

```
 Test Files  28 passed (28)
      Tests  648 passed (648)
   Start at  12:40:47
   Duration  15.60s (transform 412ms, setup 0ms, collect 11.26s, tests 87.35s, environment 3ms, prepare 1.08s)
```

Baseline no início da sessão: 24 arquivos, **612** passam. Agora: 28 arquivos, **648**.
36 casos novos, todos eles vermelhos antes da peça que os acompanha. Zero em quarentena
(`docs/QUARENTENA.md` continua com a seção "Aberta" vazia). `npx tsc --noEmit` limpo.

### `bash scripts/kit/test-shell.sh`

```
== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
TODOS OS SCRIPTS SAÍRAM rc 0
```

### `bash scripts/kit/test-instalar.sh`

`TODOS OS CHECKS PASSARAM` — 6 blocos, 22 checks. Saída crua completa no anexo A.
O bloco (c), contra o CI, é informativo por decisão e agora sai rc 1: são as diferenças
que esta etapa criou, listadas na seção 2.

### `git log --oneline main`

```
d72cdcd docs: PECAS e CHANGELOG da etapa 3
2f93db4 K7c: o e2e guarda a própria evidência
014f8a5 1d: o gate mudo por symlink, consertado no motor
45e62d5 K6c: plist e launchd sem nome de repo
b8c303d K6b: linha GATE honesta para qualquer nome de gate
d613b07 K6a: monorepo por detecção, não por nome
fb8de45 K8a: instalar.sh --atualizar <repo> [--dry-run] [--forcar]
3a76edb K5b: --verificar cobre scripts/roadmap/
412b380 e2e: evidencia do primeiro fixture aprovado (001, kit 2.1.0-dev)
```

Oito commits: um por peça (K5b, K8a, K6a, K6b, K6c, 1d, K7c) mais o de PECAS/CHANGELOG.
`git status -sb` → `## main`, árvore limpa. Todo `git add` foi por pathspec explícito.

### `/tmp` limpo

`/tmp/orq-fixture-Zto8YY` (12:20, desta sessão) foi removido pelo próprio
`scripts/kit/fixture.sh --limpar`, que é quem tem a trava de "só apago o que parece fixture
nosso". Nenhum `/tmp/orq-fixture*` restou.

Restaram dois arquivos soltos **da etapa 2**, anteriores a esta sessão (11:45 e 11:54, contra
o início às 12:16), que não são fixtures e não toquei: `/tmp/orq-e2e.out` e
`/tmp/orq-verif-dir.txt`.

---

## 2 · `instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run`

Só leitura, e provado: `cksum` do `executor.sh` do CI e `git status --porcelain` do motor dele
conferidos **antes e depois**, idênticos e vazios.

```
### estado do CI ANTES (só leitura) ###
(vazio = motor do CI sem modificação não commitada)

3651970226 56750 /Users/lucasantos/Projetos/conteudos-infinitos/scripts/orquestrador/executor.sh

### bash instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run ###
ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.

VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
           repo /Users/lucasantos/Projetos/conteudos-infinitos

repo sem VERSAO

só no repo  scripts/orquestrador/com.conteudos.orquestrador.plist.template
só no kit   scripts/orquestrador/com.orquestrador.plist.template
diferente   scripts/orquestrador/executor.sh
diferente   scripts/orquestrador/gate-ticket.ts
diferente   scripts/orquestrador/instalar-launchd.sh
diferente   docs/orquestrador/skill/templates/config.json

6 diferença(s)
rc=0

### estado do CI DEPOIS ###
3651970226 56750 /Users/lucasantos/Projetos/conteudos-infinitos/scripts/orquestrador/executor.sh
(git status --porcelain: vazio)
```

**Conferência linha a linha, contra o esperado.** Quatro `diferente`, e são exatamente os
quatro arquivos que esta etapa mudou e que são vendorizados:

| linha | peça | por quê |
|---|---|---|
| `diferente scripts/orquestrador/executor.sh` | K6a + K6b | `pacotes_do_checkout`, `linkar_node_modules`, `papel_do_gate`/`gates_do_papel`/`papel_marca`; saiu `typecheck_marca` |
| `diferente scripts/orquestrador/gate-ticket.ts` | 1d | `chamadoComoCli()` com `realpathSync` |
| `diferente scripts/orquestrador/instalar-launchd.sh` | K6c | label e intervalo saem do config; `--dry-run` |
| `diferente docs/orquestrador/skill/templates/config.json` | K6b + K6c | chaves `_gates_papel` e `launchd` |

E o par de linhas do renomeio, que é consequência declarada de K6c e não surpresa:

| linha | leitura |
|---|---|
| `só no repo  .../com.conteudos.orquestrador.plist.template` | o template ANTIGO, que ainda está no CI |
| `só no kit   .../com.orquestrador.plist.template` | o template NOVO, que o `--atualizar` vai levar |

**Divergência de expectativa, declarada.** O roteiro previa `só no repo` = *o plist
instanciado do CI*. Isso não aparece, e não por omissão: o `--verificar` exclui `*.plist` que
não termine em `.plist.template` (`instalar.sh`, `comparar_dir ... -x '*.plist'`), justamente
porque plist instanciado é artefato de máquina. O `só no repo` que aparece é o template
antigo. **Nenhuma outra linha.** Não há achado novo aqui.

**Consequência prática para o Lucas:** o `--atualizar` **não apaga** nada que só exista no
repo. Depois de rodá-lo, o CI vai ter os DOIS templates lado a lado. Apagar o antigo é passo
humano, e está na lista da seção 5.

---

## 3 · As sete peças, com o "o que o CI faz diferente" de cada uma

### K5b · `--verificar` cobre `scripts/roadmap/` — `3a76edb`

`scripts/roadmap/` é motor vendorizado: `orq mapa lint` roda
`python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT (`scripts/orq:226`), e o
`fixture.sh` já o copiava. O `--verificar` não o comparava.

*Vermelho antes* (caso (d) novo do `test-instalar.sh`, cópia do fixture com um byte a mais em
`lint-mapa.py`):

```
== (d) cópia do fixture com UM byte a mais em scripts/roadmap/lint-mapa.py ==
  | idêntico ao kit 2.1.0-dev
  FALHA rc 0 (esperava 1)
  FALHA não listou o lint-mapa.py como diferente
  FALHA 0 diferenças (esperava 1)
```

*Depois:* `diferente   scripts/roadmap/lint-mapa.py`, rc 1, exatamente 1 diferença.

**O que o CI faz diferente: nada na execução.** O `lint-mapa.py` do CI é byte-idêntico ao do
kit (`cmp` sem saída), então o `--verificar` contra ele continua sem acusar aquele arquivo. O
que mudou é só o que o verificador ENXERGA.

### K8a · `instalar.sh --atualizar` — `fb8de45`

Copia `scripts/orquestrador/` (sem plist instanciado), `scripts/orq`, `scripts/roadmap/` e
`doutrina/` → `docs/orquestrador/skill/`, mais o carimbo `VERSAO`. `cp`, nunca
`rsync --delete`. Não toca `docs/fila/**`.

*Vermelho antes* (casos (e) e (f)): `ainda não: peça K8`, rc 2, em todos os checks —
9 FALHA no bloco (e), 2 no bloco (f).

*Depois:* `--dry-run` lista e não escreve (cksum do `lib.sh` do repo conferido); sem PAUSAR,
rc 1; com PAUSAR e motor limpo, `idêntico ao kit 2.1.0-dev` e a linha de commit por pathspec;
o `so-do-repo.py` sobrevive e sai como `só no repo`.

**O que o CI faz diferente: nada sozinho.** `--atualizar` é verbo que só age quando um humano
o digita — nenhum caminho do motor o chama. E o `--dry-run` é leitura pura, provado no fim de
verdade contra o CI (seção 2) e por check no fixture.

**ACHADO desta peça, virou K8c em PENDENTES:** a recusa por árvore suja confere
`scripts/orquestrador/**`, `scripts/orq` e `docs/orquestrador/skill/**` — os três caminhos que
a peça enumerava — mas o `--atualizar` também ESCREVE em `scripts/roadmap/` desde K5b. Um
`lint-mapa.py` modificado e não commitado no repo é apagado em silêncio. Não ampliei junto:
o contrato das três recusas estava escrito, e alargá-lo em silêncio é pior que a lacuna.

### K6a · monorepo por detecção — `d613b07`

`limpa_cache_vite` e os symlinks do `setup_worktree` percorriam
`for d in "" apps/web services/*/` — a árvore do conteudos-infinitos escrita dentro do motor.
Agora `pacotes_do_checkout` detecta: todo diretório do MAIN_CHECKOUT com `node_modules`
próprio, a raiz incluída, aninhados de dependência fora.

*Vermelho antes* (`test/orquestrador-pacotes.test.ts`): **6 casos, 6 vermelhos.**

```
FAIL > pacote único: só a raiz
FAIL > árvore do CI simulada: os 9 pacotes, na ordem do código antigo
FAIL > node_modules ANINHADO não vira pacote
FAIL > diretório sem node_modules próprio fica de fora
FAIL > apaga na raiz E nos pacotes aninhados, e não toca no resto
FAIL > linka node_modules de cada pacote detectado dentro da worktree
Tests  6 failed (6)
```

**O que o CI faz diferente: NADA, e medido.** Rodei as duas listas contra
`~/Projetos/conteudos-infinitos` (só leitura) e saem linha a linha iguais:

```
=== lista ANTIGA (for d in "" apps/web services/*/) ===   === lista NOVA (pacotes_do_checkout) ===
.                                                          .
apps/web                                                   apps/web
services/ingestao-demanda                                  services/ingestao-demanda
services/ingestao-organico                                 services/ingestao-organico
services/ingestao-perguntas                                services/ingestao-perguntas
services/ingestao-trafego                                  services/ingestao-trafego
services/orquestrador                                      services/orquestrador
services/persona-roteirizador                              services/persona-roteirizador
services/telemetria                                        services/telemetria
```

A ordem é reproduzida por `LC_ALL=C sort` (`.` = 0x2E antes de `apps` antes de `services`), e
o caso "árvore do CI simulada" grava essa expectativa item a item no teste. O caso do
`packages/ui` é o que separa "detecta" de "adivinha": com a lista fixa, o `.vite` dele
sobrevivia.

**Premissa que ficou, com comentário no lugar:** o loop de `.env.local`
(`for d in "" apps/web`, `executor.sh`). Generalizá-lo passaria a linkar `.env.local` em
pacote que hoje não recebe link — mudança de comportamento que esta peça não pediu. (Conferi:
nenhum `services/*` do CI tem `.env.local` hoje, então seria inócuo AGORA; mas o que muda com
o disco de amanhã não entra em silêncio.) Está em K6d.

### K6b · linha `GATE` honesta — `b8c303d`

O defeito que o e2e mediu: `event_gate` casava gates por nome fixo do CI, e no fixture a
trilha gravou `typecheck=nao-rodou testes=nao-rodou build=nao-rodou` sobre gates que o
`gates.txt` do mesmo attempt registrava como `ok`. Agora cada gate tem um PAPEL, declarado
(`"papel"`) ou inferido do nome, e `papel_marca` combina todos os do mesmo papel.

Vocabulário novo: **`nao-configurado`** — o repo não tem gate com esse papel. Era o que
faltava: dizer "não rodou" sobre um build que o repo não tem é a mesma mentira ao contrário.
`nao-rodou` volta a significar só "há gate configurado e ele não chegou a rodar".
`lint=` é campo CONDICIONAL, exatamente para não mexer na linha de quem não tem lint.

*Vermelho antes* (`test/orquestrador-trilha-gate-papel.test.ts`, 9 casos): **5 vermelhos,
4 verdes — e os 4 verdes são os do config do CI.**

```
×  a trilha diz o que os gates disseram, e build sai como nao-configurado
   → expected '901 GATE typecheck=nao-rodou testes=nao-rodou…'
               to be '901 GATE typecheck=ok testes=ok…'
×  gate de nome próprio que REPROVA sai falha, e o que passou continua ok
×  gate CONFIGURADO que não chegou a rodar continua nao-rodou
×  um gate chamado `verificacao` com "papel": "testes" entra como testes
×  config COM gate de lint: a linha ganha lint=, depois de build=
✓  produz EXATAMENTE a linha de hoje para um attempt real (runs-201 attempt-2)
✓  os dois typecheck do CI viram um papel só, e falha de um é falha do papel
✓  nenhum gate do CI cai em nao-configurado
✓  config sem gate de lint: a linha NÃO ganha campo novo
Tests  5 failed | 4 passed (9)
```

**O que o CI faz diferente: NADA, provado com o config do CI na fixture do teste.** Antes de
tocar no código eu rodei `event_gate` com `_referencia-ci/000-config.ci.json` e
`test/fixtures/runs-201/attempt-2.gates.txt` e gravei a linha:

```
901 GATE typecheck=ok testes=falha enforcement=ok criterios=3/3 build=nao-rodou
```

É essa string, caractere a caractere, que o teste (b) exige do código novo. Os testes de
trilha que já existiam (`test/orquestrador-observabilidade.test.ts`) passaram **sem edição**.

### K6c · plist e launchd sem nome de repo — `45e62d5`

`com.conteudos.orquestrador.plist.template` → `com.orquestrador.plist.template`, com
`{{LABEL}}`, `{{CHECKOUT}}`, `{{NODE_DIR}}` e `{{START_INTERVAL}}`. `instalar-launchd.sh` lê
`launchd.label` e `launchd.start_interval` do config, ganhou `--dry-run`, e RECUSA sem o
label.

*Vermelho antes* (`test/orquestrador-launchd-config.test.ts`, 11 casos): **10 vermelhos.**

*Depois*, `--dry-run` no fixture:

```
# LABEL          = com.orqfixture.orquestrador          (launchd.label)
# START_INTERVAL = 600 (launchd.start_interval)
# CHECKOUT       = /tmp/orq-fixture-MBJLYO/repo
# gravaria em    = ~/Library/LaunchAgents/com.orqfixture.orquestrador.plist
```

e, sem a chave:

```
ERRO: defina launchd.label no config; o CI usa com.conteudos.orquestrador
      (config: <repo>/docs/fila/000-config.json)
      Um label por repo. Sem essa chave este script NAO escolhe um por voce:
      label inventado carrega um SEGUNDO job ao lado do antigo, em silencio.
rc=1
```

**O que o CI faz diferente: NADA até o config do CI ganhar `launchd.label`** — e isso é passo
humano, na seção 5. Duas coisas que valem dizer explicitamente:

1. **O job JÁ CARREGADO no launchd não é afetado por nada disto.** Ele aponta para o plist em
   `~/Library/LaunchAgents/com.conteudos.orquestrador.plist`, que nenhum commit desta sessão
   toca. Só uma reinstalação explícita passa pelo `instalar-launchd.sh`.
2. **Enquanto a chave não existir no config do CI, o `instalar-launchd.sh` de lá RECUSA.** Ele
   não instala com o label errado, não instala com label inventado, e não instala com o label
   antigo: sai 1 e diz o que falta. É o modo de falha correto, mas quem rodar o script no CI
   antes do passo 1 da seção 5 vai bater nele.

`start_interval` tem default (1800, o valor medido em 06/set/2026, com a medição preservada no
comentário do template): intervalo errado atrasa a fila, label errado junta dois repos.

Chaves de config novas, documentadas nos dois lugares como manda a regra da sessão:
`launchd` + `_launchd` e `_gates_papel`, em `fixture/docs/fila/000-config.json` e
`doutrina/templates/config.json`.

### 1d · gate mudo por symlink — `014f8a5`

O guard de CLI comparava `import.meta.url` com `pathToFileURL(resolve(argv[1])).href`.
`resolve()` normaliza mas não resolve symlink; o `import.meta.url` vem fisicamente resolvido.
Sob caminho com symlink (macOS `/tmp` → `/private/tmp`), `main()` não rodava e o processo
saía **0 com stdout vazio** — indistinguível de gate que aprovou.

*Vermelho antes* (3 casos novos em `test/orquestrador-gate-ticket.test.ts`):

```
× rc 1 e a linha de violação, chamado PELO symlink
  → o gate saiu MUDO: expected '' not to be ''
× pelo symlink e pelo caminho real, a MESMA saída
  → expected +0 to be 1
Tests  2 failed | 42 passed (44)
```

O `expect(stdout).not.toBe('')` vem ANTES do `expect(rc).toBe(1)` de propósito: o sintoma
desta peça é o silêncio, e é o silêncio que o teste tem de nomear.

*Depois*, a medição da etapa 2 ao contrário — pelo caminho LÓGICO, que antes emudecia:

```
$ cd /tmp/orq-fixture-uMvkQ1/repo && bash scripts/orq validar --relatorio 001
GATE DE TICKET · 1 ticket(s) · fila /private/tmp/orq-fixture-uMvkQ1/repo/docs/fila
001-soma-de-negativos.md  OK
TOTAL: 0 violação(ões), 0 isenção(ões), em 1 ticket(s)
```

**Contorno removido.** O `scripts/kit/fixture.sh` voltou a usar o caminho lógico (`mktemp -d`
sem `pwd -P`). O fixture nasce de novo em `/tmp/orq-fixture-*`, com symlink no meio — ou seja,
o cenário do defeito virou o cenário PADRÃO de toda a suíte, e qualquer regressão desta
família aparece nos 28 arquivos de teste, não só nos três casos acima. Rodei tudo nessa
configuração: 648 verdes, `test-shell.sh` rc 0 nos três, `test-instalar.sh` completo.

**O que o CI faz diferente: nada hoje.** `~/Projetos/conteudos-infinitos` não tem symlink no
caminho, então lá o guard já casava e o gate já rodava. O conserto é para o repo instalado sob
caminho que TEM symlink, que até agora era um gate silencioso esperando alguém.

### K7c · o e2e guarda a própria evidência — `2f93db4`

`preservar_evidencia` copia, logo depois do watchdog e antes das seções de relatório, os
`docs/fila/runs/<id>/attempt-*/` inteiros + `events.log` + `custo.json` para
`docs/e2e/<AAAA-MM-DD-HHMM>-<id>/` no kit, renomeando `*.log` → `*.log.txt`, e imprime o
caminho. **Renomear em vez de abrir `!docs/e2e/**` no `.gitignore`:** a exceção valeria para
todo log futuro daquela árvore, inclusive o que ninguém revisou. O `.gitignore` não mudou.

O script ganhou modo `ORQ_E2E_SOURCED=1` e destino por `ORQ_E2E_DOCS` — sem isso, a única
forma de exercitar uma preservação de evidência seria pagar uma drenagem.

*Vermelho antes* (`test/kit-e2e-evidencia.test.ts` contra o `fixture-e2e.sh` de HEAD):
**7 casos, 7 vermelhos**, e o vermelho mostra o script antigo executando o banner de custo ao
ser carregado:

```
× nomeia a pasta por carimbo e id do run, e imprime o caminho
  → expected 2 to be +0
× copia o attempt INTEIRO, não só o gates.txt
  → ENOENT: no such file or directory, scandir '  ESTA CHAMADA É PAGA./001/attempt-1'
× leva a trilha e o ledger
× todo *.log vira *.log.txt — inclusive o de DENTRO do attempt
× o que sai fica DE FATO versionável: o git não ignora nada ali
× sem run nenhum, ainda salva trilha e ledger (e diz "sem-run")
× carregar o script com ORQ_E2E_SOURCED=1 não dispara nada pago
Tests  7 failed (7)
```

**REGISTRO DA PERDA, como pedido.** A evidência bruta do run de 2026-09-08 11:54 **não foi
preservada**. O fixture morava em `/tmp` e foi removido; os `attempt-*/` daquele run —
`gates.txt`, `criterios.txt`, `enforcement.json`, `meta.json`, prompt do executor, diff,
veredito cru do juiz — **não existem mais e não voltam**. Sobrou o `custo.json`. O
`events.log` estava no disco e FORA do git (o `.gitignore` barra `*.log`) e foi resgatado
agora como `events.log.txt`. O resto só sobrevive no que alguém copiou à mão para a mensagem
do commit `8525c49` e para o `docs/PECAS.md`.

O diretório passou a seguir a convenção nova (`2026-09-08-fixture-001` →
`2026-09-08-1154-001`) e ganhou um `PROCEDENCIA.md` dizendo o que há ali, o que não há, e que
a linha `GATE` daquela trilha carrega o defeito que a K6b consertou — preservado como estava.

**O que o CI faz diferente: nada.** `scripts/kit/**` não é vendorizado: o `--atualizar` não o
copia e o `--verificar` não o compara.

---

## 4 · Backlog: o que entrou e o que saiu do `docs/PECAS.md`

**Saíram de PENDENTES para FEITAS:** K5b, K8a, K6a, K6b, K6c, 1d, K7c — cada uma com o sha, a
evidência no disco e o vermelho-antes.

**Peças novas, todas achados desta etapa:**

- **K6d** — o que sobrou do antigo "K6 · pureza": o `scripts/kit/pureza.sh` que TRANCA a
  pureza. As três premissas nomeadas saíram; falta o script que impede a próxima de entrar.
  A premissa que ficou no disco, com comentário no lugar, é o loop de `.env.local`.
- **K8b** — o que sobrou do antigo "K8": `--novo` e as migrações de artefato legado
  (`liberacoes.json`, pause file, config de schema antigo, bloco JSON dos tickets).
- **K8c** — a recusa por árvore suja do `--atualizar` não olha `scripts/roadmap/`.

---

## 5 · Passos humanos: o CI recebe o kit

**Não é desta sessão.** Depois da revisão e do push do kit, no terminal:

1. **`launchd.label` entra no `000-config.json` do CI** (config do repo, não harness):
   ```json
   "launchd": { "label": "com.conteudos.orquestrador", "start_interval": 1800 },
   ```
   Antes disso, o `instalar-launchd.sh` do CI recusa com rc 1 — de propósito. O job já
   carregado no launchd continua rodando normalmente; nada disto o afeta.

2. **A instalação, na ordem, dentro de `~/Projetos/conteudos-infinitos`:**
   ```
   bash scripts/orq pausar "atualizando o motor para o kit 2.1.0-dev"
   bash ~/Projetos/orquestrador-kit/instalar.sh --atualizar . --dry-run
   bash ~/Projetos/orquestrador-kit/instalar.sh --atualizar .
   npx vitest run
   bash ~/Projetos/orquestrador-kit/instalar.sh --verificar .
   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill
   git commit -m 'motor: kit 2.1.0-dev'
   bash scripts/orq retomar
   git push
   ```
   O `--atualizar` já roda o `--verificar` no fim e imprime a linha de commit; o
   `--verificar` avulso acima é a conferência independente.

3. **Apagar o template antigo, à mão.** O `--atualizar` não apaga nada que só exista no repo,
   então depois dele o CI terá os dois lado a lado:
   ```
   git rm scripts/orquestrador/com.conteudos.orquestrador.plist.template
   ```
   Só depois disso o `--verificar` do CI volta a dizer `idêntico ao kit 2.1.0-dev`. **Enquanto
   o antigo estiver lá, o `--verificar` sai rc 1 com uma linha `só no repo` — e isso é o
   verificador certo, não defeito.**

4. **Primeira drenagem real do CI com o motor do kit, observada pela trilha.** O que olhar,
   porque é justamente o que esta etapa mexeu:
   - a linha `GATE` tem de sair `typecheck=... testes=... build=...` com os MESMOS valores de
     sempre (`nao-configurado` não pode aparecer: o CI tem os três papéis);
   - os symlinks de `node_modules` nas worktrees têm de continuar sendo 9, um por pacote;
   - `orq validar` continua imprimindo (o CI não tem symlink no caminho, então nunca esteve
     mudo, mas é barato confirmar).

---

## Anexo A · `bash scripts/kit/test-instalar.sh`, saída crua

```
[fixture] tmp: /tmp/orq-fixture-g8U1VA
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/orquestrador-kit/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-g8U1VA/repo
== (a) fixture recém-instanciado ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
  |            repo /private/tmp/orq-fixture-g8U1VA/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    diz 'idêntico ao kit <VERSAO>'

== (b) cópia do fixture com UM byte a mais em lib.sh ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
  |            repo /private/tmp/orq-verificar-3U8AZa/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    exatamente 1 diferença, não uma cascata

== (d) cópia do fixture com UM byte a mais em scripts/roadmap/lint-mapa.py ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
  |            repo /private/tmp/orq-verificar-X0NE1N/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/roadmap/lint-mapa.py
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/roadmap/lint-mapa.py'
  ok    exatamente 1 diferença, não uma cascata

== (e) --atualizar: dry-run, recusa sem pausa, e o conserto ==
-- (e1) --dry-run lista 'diferente' e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
  |            repo /private/tmp/orq-verificar-ZS86VD/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  ok    rc 0
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    o lib.sh do repo NÃO foi tocado pelo --dry-run
-- (e2) --atualizar sem pausa: recusa com rc 1 --
  | RECUSADO: o loop de '/private/tmp/orq-verificar-ZS86VD/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  ok    rc 1
  ok    a recusa diz que o loop não está pausado
  ok    o repo continua intacto depois da recusa
-- (e2b) com PAUSAR, mas com modificação não commitada no motor: recusa --
  | ?? scripts/orquestrador/nao-commitado.txt
  | RECUSADO: '/private/tmp/orq-verificar-ZS86VD/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA o caminho
  ok    o repo continua intacto depois da recusa 3
-- (e3) --atualizar com PAUSAR e motor limpo: atualiza e fica idêntico --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
  |            repo /private/tmp/orq-verificar-ZS86VD/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
  |            repo /private/tmp/orq-verificar-ZS86VD/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-ZS86VD/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
  ok    o lib.sh do repo é o do kit
  ok    docs/orquestrador/skill/VERSAO carimbado
  ok    imprime a linha de commit com pathspec explícito
  ok    docs/fila/** intacta
  ok    o PAUSAR do repo continua lá (o kit não retoma o loop por conta própria)

== (f) arquivo só do repo sobrevive ao --atualizar e aparece como 'só no repo' ==
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
  |            repo /private/tmp/orq-verificar-DUcaTe/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
  |            repo /private/tmp/orq-verificar-DUcaTe/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | só no repo  scripts/orquestrador/so-do-repo.py
  | 
  | 1 diferença(s)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-DUcaTe/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 1 (há 'só no repo' — o verificador do fim conta como diferença)
  ok    so-do-repo.py SOBREVIVEU
  ok    listado como 'só no repo'

== (c) /Users/lucasantos/Projetos/conteudos-infinitos (SÓ LEITURA — o resultado é achado, não gate) ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/orquestrador-kit)
  |            repo /Users/lucasantos/Projetos/conteudos-infinitos
  | 
  | repo sem VERSAO
  | 
  | só no repo  scripts/orquestrador/com.conteudos.orquestrador.plist.template
  | só no kit   scripts/orquestrador/com.orquestrador.plist.template
  | diferente   scripts/orquestrador/executor.sh
  | diferente   scripts/orquestrador/gate-ticket.ts
  | diferente   scripts/orquestrador/instalar-launchd.sh
  | diferente   docs/orquestrador/skill/templates/config.json
  | 
  | 6 diferença(s)
  (rc 1 — informativo)

TODOS OS CHECKS PASSARAM
```

## Anexo B · diff cru de cada commit

Oito commits, do mais antigo para o mais novo, com a mensagem inteira e o patch.

### `3a76edb` — K5b: --verificar cobre scripts/roadmap/

```diff
K5b: --verificar cobre scripts/roadmap/

`orq mapa lint` roda `python3 scripts/roadmap/lint-mapa.py` a partir do
MAIN_CHECKOUT (scripts/orq:226), então scripts/roadmap/ É motor vendorizado —
o scripts/kit/fixture.sh já o copiava. O --verificar não o comparava: um
lint-mapa.py desatualizado no repo passava por "idêntico ao kit".

Teste antes do conserto (caso (d) do test-instalar.sh, cópia do fixture com um
byte a mais em scripts/roadmap/lint-mapa.py):

  == (d) cópia do fixture com UM byte a mais em scripts/roadmap/lint-mapa.py ==
    | idêntico ao kit 2.1.0-dev
    FALHA rc 0 (esperava 1)
    FALHA não listou o lint-mapa.py como diferente
    FALHA 0 diferenças (esperava 1)

Depois: `diferente   scripts/roadmap/lint-mapa.py`, rc 1, exatamente 1
diferença.

O que o CI faz diferente: NADA na execução. O --verificar contra
~/Projetos/conteudos-infinitos continua `idêntico ao kit 2.1.0-dev` porque o
scripts/roadmap/lint-mapa.py de lá é byte-idêntico ao do kit (cmp confere).
O que muda é só o que o verificador enxerga.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016sgWDu1w9FNYPNpQYpeXVn



diff --git a/CHANGELOG.md b/CHANGELOG.md
index f5da9a5..279dc7a 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -57,3 +57,11 @@ Achado que o e2e mediu e que ficou com K6: `event_gate` monta a linha `GATE` da
 procurando gates por nome fixo do monorepo do CI, então a trilha gravou
 `typecheck=nao-rodou testes=nao-rodou build=nao-rodou` para gates que o `gates.txt` do mesmo
 attempt registra como `ok`. Não derruba o run; faz a trilha mentir.
+
+### Etapa 3 — o motor muda pela primeira vez, e o CI recebe o kit
+
+- **K5b** — `instalar.sh --verificar` passa a cobrir `scripts/roadmap/`. Aquele diretório é
+  motor vendorizado (`orq mapa lint` roda `python3 scripts/roadmap/lint-mapa.py` a partir do
+  MAIN_CHECKOUT, `scripts/orq:226`) e o `fixture.sh` já o copiava; o verificador não o via, e
+  um `lint-mapa.py` desatualizado no repo passava por "idêntico". Caso (d) do
+  `scripts/kit/test-instalar.sh` prova o vermelho-antes.
diff --git a/instalar.sh b/instalar.sh
index f13f9af..2f06bee 100644
--- a/instalar.sh
+++ b/instalar.sh
@@ -16,8 +16,15 @@
 #
 #   kit scripts/orquestrador/   <->   <repo>/scripts/orquestrador/
 #   kit scripts/orq             <->   <repo>/scripts/orq
+#   kit scripts/roadmap/        <->   <repo>/scripts/roadmap/
 #   kit doutrina/               <->   <repo>/docs/orquestrador/skill/
 #
+# scripts/roadmap/ entrou na comparação em K5b, e não por simetria: `orq mapa
+# lint` roda `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT
+# (scripts/orq:226), então aquele diretório É motor vendorizado — o
+# scripts/kit/fixture.sh já o copiava. Sem esta linha, um lint-mapa.py
+# desatualizado no repo passava por "idêntico".
+#
 # O que NÃO entra na comparação, e por quê:
 #   *.plist que não termine em .plist.template — é o plist INSTANCIADO, gerado
 #     por instalar-launchd.sh com caminhos absolutos DESTA máquina. Artefato
@@ -124,6 +131,8 @@ verificar() {
     "$KIT/scripts/orquestrador" "$repo/scripts/orquestrador" \
     -x '*.plist' -x runs
   comparar_arquivo 'scripts/orq' "$KIT/scripts/orq" "$repo/scripts/orq"
+  comparar_dir 'scripts/roadmap' \
+    "$KIT/scripts/roadmap" "$repo/scripts/roadmap"
   comparar_dir 'docs/orquestrador/skill' \
     "$KIT/doutrina" "$repo/docs/orquestrador/skill" \
     -x VERSAO -x runs
diff --git a/scripts/kit/test-instalar.sh b/scripts/kit/test-instalar.sh
index e502272..d587e34 100644
--- a/scripts/kit/test-instalar.sh
+++ b/scripts/kit/test-instalar.sh
@@ -6,6 +6,12 @@
 #                                                    -> `diferente ... lib.sh`, rc 1
 #   (c) contra ~/Projetos/conteudos-infinitos (SÓ LEITURA)
 #                                                    -> o resultado real, seja qual for
+#   (d) contra uma CÓPIA do fixture com um byte a mais em
+#       scripts/roadmap/lint-mapa.py                 -> `diferente ... lint-mapa.py`, rc 1
+#       (peça K5b: scripts/roadmap/ É motor vendorizado — `orq mapa lint` roda
+#        `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT,
+#        scripts/orq:226 — e sem este caso um lint desatualizado passa por
+#        "idêntico".)
 #
 # (c) não é assertivo por decisão: o checkout do CI é o repo de verdade de outra
 # pessoa, e o kit não manda nele. Diferença ali é ACHADO — vira linha de
@@ -25,7 +31,8 @@ falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
 
 FX="$(bash "$KIT/scripts/kit/fixture.sh")" || { printf 'ERRO: fixture.sh falhou\n' >&2; exit 2; }
 COPIA="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
-trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1; rm -rf "$COPIA"' EXIT
+COPIA_ROADMAP="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
+trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1; rm -rf "$COPIA" "$COPIA_ROADMAP"' EXIT
 
 # --- (a) ---------------------------------------------------------------------
 echo "== (a) fixture recém-instanciado =="
@@ -51,6 +58,20 @@ printf '%s' "$saida" | grep -qE '^diferente +scripts/orquestrador/lib\.sh$' \
 n="$(printf '%s\n' "$saida" | grep -cE '^(diferente|só no kit|só no repo) ')"
 [ "$n" = 1 ] && ok "exatamente 1 diferença, não uma cascata" || falha "$n diferenças (esperava 1)"
 
+# --- (d) · K5b ---------------------------------------------------------------
+echo
+echo "== (d) cópia do fixture com UM byte a mais em scripts/roadmap/lint-mapa.py =="
+mkdir -p "$COPIA_ROADMAP/repo"
+cp -R "$FX/." "$COPIA_ROADMAP/repo/"
+printf '#x\n' >> "$COPIA_ROADMAP/repo/scripts/roadmap/lint-mapa.py"
+saida="$(bash "$KIT/instalar.sh" --verificar "$COPIA_ROADMAP/repo" 2>&1)"; rc=$?
+printf '%s\n' "$saida" | sed 's/^/  | /'
+[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
+printf '%s' "$saida" | grep -qE '^diferente +scripts/roadmap/lint-mapa\.py$' \
+  && ok "lista 'diferente scripts/roadmap/lint-mapa.py'" || falha "não listou o lint-mapa.py como diferente"
+n="$(printf '%s\n' "$saida" | grep -cE '^(diferente|só no kit|só no repo) ')"
+[ "$n" = 1 ] && ok "exatamente 1 diferença, não uma cascata" || falha "$n diferenças (esperava 1)"
+
 # --- (c) ---------------------------------------------------------------------
 echo
 echo "== (c) $CI_CHECKOUT (SÓ LEITURA — o resultado é achado, não gate) =="
```

### `fb8de45` — K8a: instalar.sh --atualizar <repo> [--dry-run] [--forcar]

```diff
K8a: instalar.sh --atualizar <repo> [--dry-run] [--forcar]

Copia o motor do kit por cima do de <repo>, pelo mesmo mapa origem->destino do
ORIGEM.md e do scripts/kit/fixture.sh, e carimba docs/orquestrador/skill/VERSAO.

É `cp`, nunca `rsync --delete`: o que só existe no repo SOBREVIVE e reaparece
como `só no repo` no --verificar que o próprio --atualizar imprime no fim. Não
toca docs/fila/** — tickets, 000-config.json e liberacoes.json são do repo, e
migração de artefato legado é K8b.

Três recusas (rc 1, cada uma dizendo o quê):
  1. loop não pausado (nem docs/fila/PAUSAR nem docs/fila/.orq-pause)
  2. docs/fila/runs/STATUS.md existe e não diz `ocioso`
  3. modificação não commitada em scripts/orquestrador/**, scripts/orq ou
     docs/orquestrador/skill/**
`--forcar` dispensa SÓ a terceira. Não existe pressa que justifique trocar o
lib.sh por baixo de uma drenagem viva.

Teste antes do conserto (casos (e) e (f) do test-instalar.sh):

  -- (e1) --dry-run lista 'diferente' e NÃO escreve --
    | ainda não: peça K8
    FALHA rc 2 (esperava 0)
    FALHA não listou o lib.sh como diferente
  -- (e2) --atualizar sem pausa: recusa com rc 1 --
    FALHA rc 2 (esperava 1)
    FALHA a recusa não explicou a pausa
  -- (e3) --atualizar com PAUSAR: atualiza e fica idêntico --
    FALHA rc 2 (esperava 0)
    FALHA não ficou idêntico
    FALHA o lib.sh do repo continua envelhecido
    FALHA não imprimiu a linha de commit
  == (f) ... ==
    FALHA rc 2 (esperava 1: 'só no repo' é diferença)
    FALHA não apareceu como 'só no repo'

O que o CI faz diferente: NADA sozinho. `--atualizar` é verbo que só age quando
um humano o digita; nenhum caminho do motor o chama. O `--dry-run` contra
~/Projetos/conteudos-infinitos é leitura pura (provado pelo check e1: o cksum
do lib.sh do repo não muda).

ACHADO, não consertado nesta peça: a recusa 3 olha os três caminhos que a peça
enumera (scripts/orquestrador/**, scripts/orq, docs/orquestrador/skill/**) e
NÃO olha scripts/roadmap/, que o --atualizar também sobrescreve desde K5b. Um
lint-mapa.py modificado e não commitado no repo é apagado em silêncio. Ampliar
a recusa muda contrato escrito: vai como peça, não como efeito colateral.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016sgWDu1w9FNYPNpQYpeXVn



diff --git a/CHANGELOG.md b/CHANGELOG.md
index 279dc7a..a20131b 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -65,3 +65,11 @@ attempt registra como `ok`. Não derruba o run; faz a trilha mentir.
   MAIN_CHECKOUT, `scripts/orq:226`) e o `fixture.sh` já o copiava; o verificador não o via, e
   um `lint-mapa.py` desatualizado no repo passava por "idêntico". Caso (d) do
   `scripts/kit/test-instalar.sh` prova o vermelho-antes.
+- **K8a** — `instalar.sh --atualizar <repo> [--dry-run] [--forcar]`: copia o motor do kit
+  por cima do de `<repo>` (`scripts/orquestrador/` sem plist instanciado, `scripts/orq`,
+  `scripts/roadmap/`, `doutrina/` → `docs/orquestrador/skill/`) e carimba o `VERSAO`. É `cp`,
+  não `rsync --delete`: nada que só exista no repo é apagado — sobra como `só no repo` no
+  `--verificar` que ele imprime no fim, junto da linha de commit por pathspec. Não toca
+  `docs/fila/**` (migrações são K8b). Três recusas com rc 1: loop não pausado, `STATUS.md`
+  que não diz `ocioso`, motor do repo com modificação não commitada — só a terceira cede a
+  `--forcar`. Casos (e) e (f) do `test-instalar.sh`.
diff --git a/instalar.sh b/instalar.sh
index 2f06bee..f0acb34 100644
--- a/instalar.sh
+++ b/instalar.sh
@@ -1,15 +1,23 @@
 #!/usr/bin/env bash
 # instalar.sh — instalador do kit do Orquestrador Autônomo.
 #
-# Nesta etapa existe UM verbo: `--verificar`. `--novo` e `--atualizar` são a
-# peça K8 e, se chamados, dizem isso e saem 2 — verbo que finge existir é pior
-# que verbo ausente.
+# Dois verbos: `--verificar` (K5) e `--atualizar` (K8a). `--novo` é a peça K8b
+# e, se chamado, diz isso e sai 2 — verbo que finge existir é pior que verbo
+# ausente.
 #
 #   bash instalar.sh --verificar <repo>
+#   bash instalar.sh --atualizar <repo> [--dry-run] [--forcar]
 #
-# O que ele prova: a cópia VENDORIZADA do motor dentro de `<repo>` é idêntica à
-# do kit. É a decisão 2 do inventário (vendorizado por cópia, hash conferido no
-# pré-voo) reduzida ao mínimo que dá para checar sem rodar nada.
+# O que o `--verificar` prova: a cópia VENDORIZADA do motor dentro de `<repo>` é
+# idêntica à do kit. É a decisão 2 do inventário (vendorizado por cópia, hash
+# conferido no pré-voo) reduzida ao mínimo que dá para checar sem rodar nada.
+#
+# O que o `--atualizar` faz: copia o motor do kit POR CIMA do de `<repo>` e
+# carimba `docs/orquestrador/skill/VERSAO`. É `cp`, não `rsync --delete`: nada
+# que só exista no repo é apagado — o que sobra aparece como `só no repo` no
+# `--verificar` que ele imprime no fim. Não toca `docs/fila/**` (tickets,
+# `000-config.json`, `liberacoes.json`), nem PLAYBOOK, nem PECAS do repo:
+# migração de artefato legado é a peça K8b.
 #
 # O mapa origem -> destino é o do ORIGEM.md, e o mesmo que o
 # scripts/kit/fixture.sh usa para instanciar:
@@ -49,13 +57,21 @@ die() { printf 'instalar.sh: %s\n' "$*" >&2; exit 2; }
 uso() {
   cat <<'USO'
 uso: bash instalar.sh --verificar <repo>
+     bash instalar.sh --atualizar <repo> [--dry-run] [--forcar]
 
   --verificar <repo>   compara o motor vendorizado em <repo> com o do kit
-  --novo <repo>        (peça K8)
-  --atualizar <repo>   (peça K8)
+  --atualizar <repo>   copia o motor do kit por cima do de <repo>
+      --dry-run        só lista o que mudaria (idêntico ao --verificar) e sai 0
+      --forcar         segue mesmo com modificação não commitada no motor do repo
+                       (NÃO passa por cima da pausa nem do STATUS)
+  --novo <repo>        (peça K8b)
 USO
 }
 
+# recusa <mensagem> — rc 1, e a mensagem diz O QUÊ. Distinto do die() (rc 2, erro
+# de uso): recusa é o instalador funcionando e dizendo não.
+recusa() { printf 'RECUSADO: %s\n' "$*" >&2; exit 1; }
+
 # --- comparação ---------------------------------------------------------------
 # `diff -rq` fala em inglês só com LC_ALL=C. Sem isso, a máquina do usuário em
 # pt_BR devolve "Os arquivos ... são diferentes" e o parser abaixo não casa
@@ -108,6 +124,23 @@ comparar_arquivo() {
   if ! cmp -s "$a" "$b"; then printf 'diferente   %s\n' "$rotulo"; DIFERENCAS=$((DIFERENCAS+1)); fi
 }
 
+# comparar_tudo <repo> — as quatro comparações do mapa origem->destino. Existe
+# separada do verificar() porque o --atualizar --dry-run mostra EXATAMENTE esta
+# lista: duas listas que se pretendem iguais e são montadas em dois lugares
+# divergem no primeiro caminho que alguém acrescentar.
+comparar_tudo() {
+  local repo="$1"
+  comparar_dir 'scripts/orquestrador' \
+    "$KIT/scripts/orquestrador" "$repo/scripts/orquestrador" \
+    -x '*.plist' -x runs
+  comparar_arquivo 'scripts/orq' "$KIT/scripts/orq" "$repo/scripts/orq"
+  comparar_dir 'scripts/roadmap' \
+    "$KIT/scripts/roadmap" "$repo/scripts/roadmap"
+  comparar_dir 'docs/orquestrador/skill' \
+    "$KIT/doutrina" "$repo/docs/orquestrador/skill" \
+    -x VERSAO -x runs
+}
+
 verificar() {
   local repo="${1:-}"
   [ -n "$repo" ] || die "--verificar exige o caminho do repo"
@@ -127,15 +160,7 @@ verificar() {
   fi
   printf '\n'
 
-  comparar_dir 'scripts/orquestrador' \
-    "$KIT/scripts/orquestrador" "$repo/scripts/orquestrador" \
-    -x '*.plist' -x runs
-  comparar_arquivo 'scripts/orq' "$KIT/scripts/orq" "$repo/scripts/orq"
-  comparar_dir 'scripts/roadmap' \
-    "$KIT/scripts/roadmap" "$repo/scripts/roadmap"
-  comparar_dir 'docs/orquestrador/skill' \
-    "$KIT/doutrina" "$repo/docs/orquestrador/skill" \
-    -x VERSAO -x runs
+  comparar_tudo "$repo"
 
   printf '\n'
   if [ "$DIFERENCAS" = 0 ]; then
@@ -146,10 +171,117 @@ verificar() {
   return 1
 }
 
+# --- --atualizar (peça K8a) ---------------------------------------------------
+# O que ele COPIA (o mesmo mapa do ORIGEM.md e do scripts/kit/fixture.sh):
+#   kit scripts/orquestrador/  ->  repo scripts/orquestrador/   (sem plist instanciado)
+#   kit scripts/orq            ->  repo scripts/orq
+#   kit scripts/roadmap/       ->  repo scripts/roadmap/
+#   kit doutrina/              ->  repo docs/orquestrador/skill/
+#   kit VERSAO                 ->  repo docs/orquestrador/skill/VERSAO
+#
+# O que ele NÃO toca: docs/fila/** (tickets, 000-config.json, liberacoes.json),
+# PLAYBOOK e PECAS do repo. Migração de artefato legado é K8b.
+#
+# As três recusas, e por que cada uma:
+#   1. loop não pausado — copiar o motor por baixo de uma drenagem viva troca o
+#      lib.sh de um executor que já está rodando. `--forcar` NÃO passa por cima:
+#      não existe pressa que justifique isso.
+#   2. STATUS.md diz outra coisa que não `ocioso` — mesmo motivo, por outra
+#      testemunha: o snapshot é o que o próprio loop afirma sobre si. Ausência de
+#      STATUS.md não é recusa (repo que nunca drenou).
+#   3. modificação não commitada no motor do repo — copiar por cima apaga
+#      trabalho sem registro no git. É a ÚNICA que `--forcar` dispensa, porque
+#      às vezes a modificação é lixo conhecido, e aí a perda é decisão de quem
+#      olhou.
+atualizar() {
+  local repo="" dry=0 forcar=0 a
+  for a in "$@"; do
+    case "$a" in
+      --dry-run) dry=1 ;;
+      --forcar)  forcar=1 ;;
+      -*)        die "--atualizar: opção desconhecida '$a'" ;;
+      *)         [ -z "$repo" ] || die "--atualizar aceita UM repo (recebi '$repo' e '$a')"; repo="$a" ;;
+    esac
+  done
+  [ -n "$repo" ] || die "--atualizar exige o caminho do repo"
+  [ -d "$repo" ] || die "'$repo' não é um diretório"
+  repo="$(cd "$repo" && pwd -P)"
+
+  if [ "$dry" = 1 ]; then
+    printf 'ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.\n\n'
+    verificar "$repo" || true
+    return 0
+  fi
+
+  # --- recusa 1 · o loop tem de estar parado ---------------------------------
+  # Os dois arquivos, porque o motor reconhece os dois (lib.sh:615-619):
+  # CFG_PAUSAR_FILE (o `pausar_file` do config, `docs/fila/PAUSAR` tanto no
+  # template quanto no config do CI) e o legado `docs/fila/.orq-pause`.
+  if [ ! -f "$repo/docs/fila/PAUSAR" ] && [ ! -f "$repo/docs/fila/.orq-pause" ]; then
+    recusa "o loop de '$repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar \"atualizando o motor\"' dentro do repo e tente de novo."
+  fi
+
+  # --- recusa 2 · o snapshot tem de dizer ocioso -----------------------------
+  local status_md="$repo/docs/fila/runs/STATUS.md"
+  if [ -f "$status_md" ] && ! grep -qE '^ESTADO +ocioso *$' "$status_md"; then
+    recusa "docs/fila/runs/STATUS.md de '$repo' não diz 'ocioso': $(grep -E '^ESTADO' "$status_md" | head -1 | sed 's/  */ /g'). Espere a drenagem em curso terminar."
+  fi
+
+  # --- recusa 3 · o motor do repo não pode ter mudança fora do git -----------
+  local sujo=''
+  if git -C "$repo" rev-parse --git-dir >/dev/null 2>&1; then
+    sujo="$(git -C "$repo" status --porcelain -- \
+      scripts/orquestrador scripts/orq docs/orquestrador/skill 2>/dev/null || true)"
+  fi
+  if [ -n "$sujo" ] && [ "$forcar" = 0 ]; then
+    printf '%s\n' "$sujo" >&2
+    recusa "'$repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso."
+  fi
+  if [ -n "$sujo" ] && [ "$forcar" = 1 ]; then
+    printf '%s\n' "$sujo" >&2
+    printf -- '--forcar: passando por cima de %s caminho(s) modificado(s) no motor do repo.\n\n' \
+      "$(printf '%s\n' "$sujo" | wc -l | tr -d ' ')"
+  fi
+
+  # --- a cópia ---------------------------------------------------------------
+  # Staging intermediário só por causa do plist INSTANCIADO: ele é artefato de
+  # uma máquina e não pode viajar. Filtrar no staging (e não no destino) é o que
+  # garante que um plist do REPO nunca seja apagado por engano.
+  printf 'ATUALIZAR  kit %s (%s)\n' "$VERSAO" "$KIT"
+  printf '           repo %s\n\n' "$repo"
+  local stage
+  stage="$(mktemp -d /tmp/orq-atualizar-XXXXXX)"
+  mkdir -p "$stage/orquestrador"
+  cp -R "$KIT/scripts/orquestrador/." "$stage/orquestrador/"
+  find "$stage/orquestrador" -name '*.plist' ! -name '*.plist.template' -exec rm -f {} +
+
+  mkdir -p "$repo/scripts/orquestrador" "$repo/scripts/roadmap" "$repo/docs/orquestrador/skill"
+  cp -R "$stage/orquestrador/." "$repo/scripts/orquestrador/"
+  cp "$KIT/scripts/orq" "$repo/scripts/orq"; chmod +x "$repo/scripts/orq"
+  cp -R "$KIT/scripts/roadmap/." "$repo/scripts/roadmap/"
+  cp -R "$KIT/doutrina/." "$repo/docs/orquestrador/skill/"
+  cp "$KIT/VERSAO" "$repo/docs/orquestrador/skill/VERSAO"
+  rm -rf "$stage"
+  printf 'copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO %s)\n\n' "$VERSAO"
+
+  # --- o veredito é do verificador, não deste bloco --------------------------
+  # Dizer "atualizado" sem reler o disco é como um instalador mente. O que sobrar
+  # de `só no repo` aqui é justamente o que NÃO foi apagado, e é para ser lido.
+  local rc=0
+  verificar "$repo" || rc=$?
+
+  printf '\ncommit sugerido, no repo, com pathspec explícito:\n'
+  printf '  cd %s\n' "$repo"
+  printf '  git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill\n'
+  printf "  git commit -m 'motor: kit %s'\n" "$VERSAO"
+  return "$rc"
+}
+
 case "${1:-}" in
   --verificar)  shift; verificar "${1:-}" ;;
-  --novo|--atualizar)
-    printf 'ainda não: peça K8\n'
+  --atualizar)  shift; atualizar "$@" ;;
+  --novo)
+    printf 'ainda não: peça K8b\n'
     exit 2
     ;;
   -h|--help|'') uso; [ -z "${1:-}" ] && exit 2 || exit 0 ;;
diff --git a/scripts/kit/test-instalar.sh b/scripts/kit/test-instalar.sh
index d587e34..4f5f50b 100644
--- a/scripts/kit/test-instalar.sh
+++ b/scripts/kit/test-instalar.sh
@@ -32,7 +32,9 @@ falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
 FX="$(bash "$KIT/scripts/kit/fixture.sh")" || { printf 'ERRO: fixture.sh falhou\n' >&2; exit 2; }
 COPIA="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
 COPIA_ROADMAP="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
-trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1; rm -rf "$COPIA" "$COPIA_ROADMAP"' EXIT
+COPIA_UPD="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
+COPIA_EXTRA="$(mktemp -d /tmp/orq-verificar-XXXXXX)"
+trap 'bash "$KIT/scripts/kit/fixture.sh" --limpar "$FX" >/dev/null 2>&1; rm -rf "$COPIA" "$COPIA_ROADMAP" "$COPIA_UPD" "$COPIA_EXTRA"' EXIT
 
 # --- (a) ---------------------------------------------------------------------
 echo "== (a) fixture recém-instanciado =="
@@ -72,6 +74,92 @@ printf '%s' "$saida" | grep -qE '^diferente +scripts/roadmap/lint-mapa\.py$' \
 n="$(printf '%s\n' "$saida" | grep -cE '^(diferente|só no kit|só no repo) ')"
 [ "$n" = 1 ] && ok "exatamente 1 diferença, não uma cascata" || falha "$n diferenças (esperava 1)"
 
+# --- (e) · K8a ---------------------------------------------------------------
+echo
+echo "== (e) --atualizar: dry-run, recusa sem pausa, e o conserto =="
+mkdir -p "$COPIA_UPD/repo"
+cp -R "$FX/." "$COPIA_UPD/repo/"
+UPD="$COPIA_UPD/repo"
+# lib.sh ENVELHECIDO **e commitado**: é o estado real de um repo instalado com
+# um kit anterior — o motor velho está no git dele, não pendurado na árvore.
+printf '\n# linha de um kit mais velho\n' >> "$UPD/scripts/orquestrador/lib.sh"
+git -C "$UPD" add -- scripts/orquestrador/lib.sh >/dev/null 2>&1
+git -C "$UPD" commit -q -m 'motor: kit anterior' >/dev/null 2>&1
+ANTES_LIB="$(cksum < "$UPD/scripts/orquestrador/lib.sh")"
+
+echo "-- (e1) --dry-run lista 'diferente' e NÃO escreve --"
+saida="$(bash "$KIT/instalar.sh" --atualizar "$UPD" --dry-run 2>&1)"; rc=$?
+printf '%s\n' "$saida" | sed 's/^/  | /'
+[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
+printf '%s' "$saida" | grep -qE '^diferente +scripts/orquestrador/lib\.sh$' \
+  && ok "lista 'diferente scripts/orquestrador/lib.sh'" || falha "não listou o lib.sh como diferente"
+[ "$(cksum < "$UPD/scripts/orquestrador/lib.sh")" = "$ANTES_LIB" ] \
+  && ok "o lib.sh do repo NÃO foi tocado pelo --dry-run" || falha "o --dry-run ESCREVEU no repo"
+
+echo "-- (e2) --atualizar sem pausa: recusa com rc 1 --"
+rm -f "$UPD/docs/fila/PAUSAR" "$UPD/docs/fila/.orq-pause"
+saida="$(bash "$KIT/instalar.sh" --atualizar "$UPD" 2>&1)"; rc=$?
+printf '%s\n' "$saida" | sed 's/^/  | /'
+[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
+printf '%s' "$saida" | grep -qi 'pausad' \
+  && ok "a recusa diz que o loop não está pausado" || falha "a recusa não explicou a pausa"
+[ "$(cksum < "$UPD/scripts/orquestrador/lib.sh")" = "$ANTES_LIB" ] \
+  && ok "o repo continua intacto depois da recusa" || falha "a recusa ESCREVEU no repo"
+
+echo "-- (e2b) com PAUSAR, mas com modificação não commitada no motor: recusa --"
+printf '2026-09-08 12:00 | atualizando o motor\n' > "$UPD/docs/fila/PAUSAR"
+printf 'trabalho meio feito\n' > "$UPD/scripts/orquestrador/nao-commitado.txt"
+saida="$(bash "$KIT/instalar.sh" --atualizar "$UPD" 2>&1)"; rc=$?
+printf '%s\n' "$saida" | sed 's/^/  | /'
+[ "$rc" = 1 ] && ok "rc 1" || falha "rc $rc (esperava 1)"
+printf '%s' "$saida" | grep -q 'não commitada' \
+  && ok "a recusa diz que há modificação não commitada" || falha "a recusa não citou o não commitado"
+printf '%s' "$saida" | grep -q 'nao-commitado.txt' \
+  && ok "a recusa NOMEIA o caminho" || falha "a recusa não nomeou o caminho"
+[ "$(cksum < "$UPD/scripts/orquestrador/lib.sh")" = "$ANTES_LIB" ] \
+  && ok "o repo continua intacto depois da recusa 3" || falha "a recusa 3 ESCREVEU no repo"
+rm -f "$UPD/scripts/orquestrador/nao-commitado.txt"
+
+echo "-- (e3) --atualizar com PAUSAR e motor limpo: atualiza e fica idêntico --"
+saida="$(bash "$KIT/instalar.sh" --atualizar "$UPD" 2>&1)"; rc=$?
+printf '%s\n' "$saida" | sed 's/^/  | /'
+[ "$rc" = 0 ] && ok "rc 0" || falha "rc $rc (esperava 0)"
+printf '%s' "$saida" | grep -q "idêntico ao kit $(cat "$KIT/VERSAO")" \
+  && ok "o --verificar do fim diz 'idêntico ao kit <VERSAO>'" || falha "não ficou idêntico"
+cmp -s "$KIT/scripts/orquestrador/lib.sh" "$UPD/scripts/orquestrador/lib.sh" \
+  && ok "o lib.sh do repo é o do kit" || falha "o lib.sh do repo continua envelhecido"
+[ "$(cat "$UPD/docs/orquestrador/skill/VERSAO")" = "$(cat "$KIT/VERSAO")" ] \
+  && ok "docs/orquestrador/skill/VERSAO carimbado" || falha "VERSAO não foi carimbado"
+printf '%s' "$saida" | grep -q 'git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill' \
+  && ok "imprime a linha de commit com pathspec explícito" || falha "não imprimiu a linha de commit"
+# NEGATIVO: a fila do repo é do repo, não do kit.
+[ -f "$UPD/docs/fila/000-config.json" ] && [ -f "$UPD/docs/fila/001-soma-de-negativos.md" ] \
+  && ok "docs/fila/** intacta" || falha "o --atualizar mexeu em docs/fila/**"
+[ -f "$UPD/docs/fila/PAUSAR" ] \
+  && ok "o PAUSAR do repo continua lá (o kit não retoma o loop por conta própria)" \
+  || falha "o --atualizar removeu o PAUSAR"
+
+# --- (f) · K8a · o que só existe no repo sobrevive ---------------------------
+echo
+echo "== (f) arquivo só do repo sobrevive ao --atualizar e aparece como 'só no repo' =="
+mkdir -p "$COPIA_EXTRA/repo"
+cp -R "$FX/." "$COPIA_EXTRA/repo/"
+EXT="$COPIA_EXTRA/repo"
+printf '# script que só existe neste repo\nprint("eu moro aqui")\n' \
+  > "$EXT/scripts/orquestrador/so-do-repo.py"
+# Commitado: um arquivo NÃO commitado no motor é justamente o que a recusa 3 barra.
+git -C "$EXT" add -- scripts/orquestrador/so-do-repo.py >/dev/null 2>&1
+git -C "$EXT" commit -q -m 'repo: script próprio no motor' >/dev/null 2>&1
+printf '2026-09-08 12:00 | atualizando o motor\n' > "$EXT/docs/fila/PAUSAR"
+saida="$(bash "$KIT/instalar.sh" --atualizar "$EXT" 2>&1)"; rc=$?
+printf '%s\n' "$saida" | sed 's/^/  | /'
+[ "$rc" = 1 ] && ok "rc 1 (há 'só no repo' — o verificador do fim conta como diferença)" \
+  || falha "rc $rc (esperava 1: 'só no repo' é diferença)"
+[ -f "$EXT/scripts/orquestrador/so-do-repo.py" ] \
+  && ok "so-do-repo.py SOBREVIVEU" || falha "o --atualizar APAGOU o que só existia no repo"
+printf '%s' "$saida" | grep -qE '^só no repo +scripts/orquestrador/so-do-repo\.py$' \
+  && ok "listado como 'só no repo'" || falha "não apareceu como 'só no repo'"
+
 # --- (c) ---------------------------------------------------------------------
 echo
 echo "== (c) $CI_CHECKOUT (SÓ LEITURA — o resultado é achado, não gate) =="
```

### `d613b07` — K6a: monorepo por detecção, não por nome

```diff
K6a: monorepo por detecção, não por nome

`limpa_cache_vite` e o bloco de symlinks do `setup_worktree` percorriam
`for d in "" apps/web services/*/`: a árvore do conteudos-infinitos escrita
DENTRO do motor. Num monorepo com outra forma (packages/, apps/api, libs/) o
pacote ficava sem node_modules na worktree e o gate reprovava por AMBIENTE.

Agora `pacotes_do_checkout` detecta: todo diretório do MAIN_CHECKOUT com
node_modules próprio, a raiz incluída, aninhados de dependência fora
(`-not -path '*/node_modules/*'`). `limpa_cache_vite` e o novo
`linkar_node_modules` percorrem essa lista.

`LC_ALL=C sort` não é higiene: é o que reproduz a ordem da lista fixa item a
item — `.` antes de `apps/web` antes de `services/*`. Ordem decide qual symlink
nasce antes de qual.

Teste antes do conserto (test/orquestrador-pacotes.test.ts): 6 casos, 6
vermelhos —

  FAIL > pacote único: só a raiz
  FAIL > árvore do CI simulada: os 9 pacotes, na ordem do código antigo
  FAIL > node_modules ANINHADO não vira pacote
  FAIL > diretório sem node_modules próprio fica de fora
  FAIL > apaga na raiz E nos pacotes aninhados, e não toca no resto
  FAIL > linka node_modules de cada pacote detectado dentro da worktree
  Tests  6 failed (6)

Depois: 6 passam; a suíte inteira vai de 612 para 618.

O que o CI faz diferente: NADA, e não por argumento — medido. Rodada contra
~/Projetos/conteudos-infinitos (só leitura), a lista nova sai linha a linha
igual à que `for d in "" apps/web services/*/` produzia:

  . / apps/web / services/ingestao-demanda / services/ingestao-organico /
  services/ingestao-perguntas / services/ingestao-trafego /
  services/orquestrador / services/persona-roteirizador / services/telemetria

O caso "árvore do CI simulada" grava essa mesma expectativa no teste.

ACHADO deixado em aberto, com comentário no lugar: o loop de `.env.local`
(`for d in "" apps/web`) continua fixo. Generalizá-lo passaria a linkar
.env.local em pacote que hoje não recebe link — mudança de comportamento fora
do escopo desta peça.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016sgWDu1w9FNYPNpQYpeXVn



diff --git a/CHANGELOG.md b/CHANGELOG.md
index a20131b..4193bbe 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -73,3 +73,10 @@ attempt registra como `ok`. Não derruba o run; faz a trilha mentir.
   `docs/fila/**` (migrações são K8b). Três recusas com rc 1: loop não pausado, `STATUS.md`
   que não diz `ocioso`, motor do repo com modificação não commitada — só a terceira cede a
   `--forcar`. Casos (e) e (f) do `test-instalar.sh`.
+- **K6a** — `executor.sh`: monorepo por DETECÇÃO, não por nome. `pacotes_do_checkout` lista
+  todo diretório do checkout principal com `node_modules` próprio (a raiz incluída,
+  aninhados de dependência excluídos) e é essa lista que `limpa_cache_vite` e o novo
+  `linkar_node_modules` percorrem — no lugar do `for d in "" apps/web services/*/`, que era a
+  árvore do conteudos-infinitos escrita dentro do motor. `LC_ALL=C sort` reproduz a ordem
+  antiga item a item. Contra o checkout real do CI as duas listas saem idênticas: o CI não
+  faz nada diferente.
diff --git a/scripts/orquestrador/executor.sh b/scripts/orquestrador/executor.sh
index 960131a..95f0142 100755
--- a/scripts/orquestrador/executor.sh
+++ b/scripts/orquestrador/executor.sh
@@ -205,6 +205,34 @@ ${trecho:-(o CLI não escreveu NADA em stdout nem stderr — rc=$rc é tudo o qu
 }
 
 # --- 2 · WORKTREE -----------------------------------------------------------
+# pacotes_do_checkout — um caminho RELATIVO ao MAIN_CHECKOUT por linha (a raiz
+# sai como `.`): todo diretorio que tenha node_modules PROPRIO.
+#
+# Antes desta funcao (peca K6a) a lista era `for d in "" apps/web services/*/`:
+# a arvore do conteudos-infinitos escrita DENTRO do motor. Num monorepo com
+# outra forma — packages/, apps/api, libs/ — o motor deixava pacote sem
+# node_modules na worktree e o gate reprovava por AMBIENTE, nao por codigo.
+#
+# `-not -path '*/node_modules/*'` e obrigatorio: sem ele, toda dependencia que
+# traz o proprio node_modules viraria "pacote" e a lista teria centenas de
+# entradas. `-maxdepth 3` cobre raiz (1), apps/web (2) e services/x (3), que e
+# a profundidade real de monorepo npm/pnpm; mais fundo e node_modules aninhado.
+#
+# `LC_ALL=C sort` NAO e higiene: e o que reproduz, item a item, a ordem que a
+# lista fixa produzia para o CI — `.` (0x2E) antes de `apps/web` antes de
+# `services/*`, estes em ordem de glob. Ordem decide qual symlink e criado antes
+# de qual; "o CI nao faz nada diferente" e afirmacao sobre a saida inteira.
+pacotes_do_checkout() {
+  local nm rel
+  while IFS= read -r nm; do
+    [ -n "$nm" ] || continue
+    rel="$(dirname "$nm")"
+    rel="${rel#"$MAIN_CHECKOUT"}"; rel="${rel#/}"
+    printf '%s\n' "${rel:-.}"
+  done < <(find "$MAIN_CHECKOUT" -maxdepth 3 -type d -name node_modules \
+             -not -path '*/node_modules/*' 2>/dev/null) | LC_ALL=C sort
+}
+
 # node_modules e' SYMLINK compartilhado entre todas as worktrees (nao copia).
 # O cache de dep-optimization do Vite (node_modules/.vite) fica DENTRO dele: se
 # o ticket anterior mudou codigo em apps/web, o cache guarda o grafo de
@@ -216,9 +244,27 @@ ${trecho:-(o CLI não escreveu NADA em stdout nem stderr — rc=$rc é tudo o qu
 # que nao passa por setup_worktree e ficaria com o cache da tentativa anterior.
 limpa_cache_vite() {
   local d
-  for d in "" apps/web services/*/; do
-    rm -rf "$MAIN_CHECKOUT/${d:+$d/}node_modules/.vite" 2>/dev/null || true
-  done
+  while IFS= read -r d; do
+    [ -n "$d" ] || continue
+    rm -rf "$MAIN_CHECKOUT/$d/node_modules/.vite" 2>/dev/null || true
+  done < <(pacotes_do_checkout)
+  return 0
+}
+
+# linkar_node_modules <worktree> — um symlink por pacote detectado, apontando
+# para o node_modules do checkout PRINCIPAL (nunca copia: sao gigabytes).
+# Existe como funcao propria, e nao inline no setup_worktree, porque e ela o
+# efeito observavel da deteccao — e o teste precisa poder cobra-la sem montar
+# um repositorio git so para exercitar uma lista.
+linkar_node_modules() {
+  local wt="$1" d origem destino
+  while IFS= read -r d; do
+    [ -n "$d" ] || continue
+    origem="$MAIN_CHECKOUT/$d/node_modules"; destino="$wt/$d/node_modules"
+    [ -e "$origem" ] || continue
+    mkdir -p "$(dirname "$destino")"
+    ln -sfn "$origem" "$destino"
+  done < <(pacotes_do_checkout)
   return 0
 }
 
@@ -233,17 +279,16 @@ setup_worktree() {
   git -C "$ROOT" branch -D "$branch" >/dev/null 2>&1 || true
   git -C "$ROOT" worktree add -b "$branch" "$wt" "$CFG_BRANCH_ALVO" >/dev/null
   # node_modules e .env.local não são versionados e só existem no principal.
-  # ADAPTAÇÃO: o comarka-os é pacote ÚNICO e linka só a raiz. Aqui são 9 pacotes
-  # com node_modules próprio — linkar só a raiz deixa apps/web sem os tipos de
-  # react/next e o gate typecheck_web reprova com ~1700 erros que não são código.
-  local d
-  for d in "" apps/web services/*/; do
-    local origem="$MAIN_CHECKOUT/${d:+$d/}node_modules" destino="$wt/${d:+$d/}node_modules"
-    [ -e "$origem" ] || continue
-    mkdir -p "$(dirname "$destino")"
-    ln -sfn "$origem" "$destino"
-  done
+  # Linkar só a raiz deixa cada pacote aninhado sem os próprios tipos, e o gate
+  # de typecheck daquele pacote reprova com centenas de erros que não são código
+  # (medido no CI: ~1700 em apps/web). Quais pacotes existem é DETECTADO
+  # (pacotes_do_checkout), não adivinhado por nome de diretório.
+  linkar_node_modules "$wt"
   limpa_cache_vite
+  # ACHADO em aberto (peça K6/pureza): esta lista continua FIXA. Generalizá-la
+  # para os pacotes detectados passaria a linkar .env.local de pacote que hoje
+  # não recebe link — mudança de comportamento fora do escopo desta peça.
+  local d
   for d in "" apps/web; do
     [ -e "$MAIN_CHECKOUT/${d:+$d/}.env.local" ] && ln -sfn "$MAIN_CHECKOUT/${d:+$d/}.env.local" "$wt/${d:+$d/}.env.local"
   done
diff --git a/test/orquestrador-pacotes.test.ts b/test/orquestrador-pacotes.test.ts
new file mode 100644
index 0000000..c2a98d3
--- /dev/null
+++ b/test/orquestrador-pacotes.test.ts
@@ -0,0 +1,145 @@
+/**
+ * Peça K6a — monorepo por DETECÇÃO, não por nome.
+ *
+ * O `executor.sh` linkava `node_modules` e purgava `node_modules/.vite` numa
+ * lista FIXA (`for d in "" apps/web services/*​/`) que é a árvore do
+ * conteudos-infinitos escrita dentro do motor. Num repo de pacote único a lista
+ * ainda funcionava por acidente (os dois nomes não existem, o glob não casa); em
+ * qualquer outro monorepo — `packages/`, `apps/api`, `libs/` — o motor deixava
+ * pacote sem `node_modules` na worktree e o gate reprovava por ambiente.
+ *
+ * A detecção: todo diretório do checkout PRINCIPAL que tenha `node_modules`
+ * PRÓPRIO (não um aninhado dentro de outro `node_modules`), a raiz incluída.
+ *
+ * O que estes casos cobram, e por quê:
+ *   1. pacote único  -> só a raiz (o fixture do kit);
+ *   2. árvore do CI simulada (`apps/web` + os 7 `services/*`) -> os 9 pacotes,
+ *      NA MESMA ORDEM que `for d in "" apps/web services/*​/` produzia. Ordem
+ *      importa porque é ela que decide qual symlink é criado antes de qual, e
+ *      "o CI não faz nada diferente" é afirmação sobre a saída inteira, não
+ *      sobre o conjunto;
+ *   3. `node_modules` aninhado (uma dependência que traz o próprio) NÃO é
+ *      pacote — senão a lista explodiria em centenas de entradas;
+ *   4. `limpa_cache_vite` apaga o `.vite` de TODOS os pacotes detectados —
+ *      inclusive de um `packages/ui`, nome que a lista fixa NÃO cobria: é ele
+ *      que separa "detecta" de "adivinha".
+ */
+import { describe, it, expect } from 'vitest';
+import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
+import { join } from 'node:path';
+import { bashNoFixture, criarFixture, REPO_ROOT } from './fixtures/orq-harness.js';
+
+const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
+
+/** Roda um corpo bash com o executor.sh SOURCED (só funções) no fixture. */
+function noExecutor(raiz: string, corpo: string) {
+  return bashNoFixture(
+    raiz,
+    ['export EXECUTOR_SOURCED=1', `source "${EXECUTOR}"`, 'set +e', corpo].join('\n'),
+  );
+}
+
+function pacote(raiz: string, rel: string): void {
+  mkdirSync(join(raiz, rel, 'node_modules'), { recursive: true });
+}
+
+/** Os 7 services do conteudos-infinitos, na ordem em que `services/*​/` os entrega. */
+const SERVICES = [
+  'ingestao-demanda',
+  'ingestao-organico',
+  'ingestao-perguntas',
+  'ingestao-trafego',
+  'orquestrador',
+  'persona-roteirizador',
+  'telemetria',
+];
+
+describe('pacotes_do_checkout detecta quem tem node_modules próprio', () => {
+  it('pacote único: só a raiz', () => {
+    const raiz = criarFixture([]);
+    pacote(raiz, '.');
+    const r = noExecutor(raiz, 'pacotes_do_checkout');
+    expect(r.stdout.trim().split('\n')).toEqual(['.']);
+  });
+
+  it('árvore do CI simulada: os 9 pacotes, na ordem do código antigo', () => {
+    const raiz = criarFixture([]);
+    pacote(raiz, '.');
+    pacote(raiz, 'apps/web');
+    for (const s of SERVICES) pacote(raiz, `services/${s}`);
+    const r = noExecutor(raiz, 'pacotes_do_checkout');
+    // `for d in "" apps/web services/*​/` visitava: raiz, apps/web, e os
+    // services em ordem de glob (alfabética). É esta lista, item a item.
+    expect(r.stdout.trim().split('\n')).toEqual([
+      '.',
+      'apps/web',
+      ...SERVICES.map((s) => `services/${s}`),
+    ]);
+  });
+
+  it('node_modules ANINHADO não vira pacote', () => {
+    const raiz = criarFixture([]);
+    pacote(raiz, '.');
+    // Uma dependência que traz o próprio node_modules — o caso que faria a
+    // detecção ingênua listar centenas de "pacotes".
+    mkdirSync(join(raiz, 'node_modules', 'vite', 'node_modules'), { recursive: true });
+    const r = noExecutor(raiz, 'pacotes_do_checkout');
+    expect(r.stdout.trim().split('\n')).toEqual(['.']);
+  });
+
+  it('diretório sem node_modules próprio fica de fora', () => {
+    const raiz = criarFixture([]);
+    pacote(raiz, '.');
+    mkdirSync(join(raiz, 'docs', 'sem-deps'), { recursive: true });
+    const r = noExecutor(raiz, 'pacotes_do_checkout');
+    expect(r.stdout.trim().split('\n')).toEqual(['.']);
+  });
+});
+
+describe('limpa_cache_vite purga o .vite de todo pacote detectado', () => {
+  it('apaga na raiz E nos pacotes aninhados, e não toca no resto', () => {
+    const raiz = criarFixture([]);
+    for (const p of ['.', 'apps/web', 'services/telemetria', 'packages/ui']) {
+      pacote(raiz, p);
+      mkdirSync(join(raiz, p, 'node_modules', '.vite'), { recursive: true });
+      writeFileSync(join(raiz, p, 'node_modules', '.vite', 'deps.json'), '{}');
+    }
+    // Vizinho que NÃO é cache do vite: some se a purga for por diretório-pai.
+    writeFileSync(join(raiz, 'node_modules', 'marcador.txt'), 'fico');
+
+    const r = noExecutor(raiz, 'limpa_cache_vite');
+    expect(r.rc).toBe(0);
+    for (const p of ['.', 'apps/web', 'services/telemetria', 'packages/ui']) {
+      expect(existsSync(join(raiz, p, 'node_modules', '.vite')), `${p}/.vite`).toBe(false);
+      expect(existsSync(join(raiz, p, 'node_modules')), `${p}/node_modules`).toBe(true);
+    }
+    expect(existsSync(join(raiz, 'node_modules', 'marcador.txt'))).toBe(true);
+  });
+});
+
+describe('a lista de pacotes é a MESMA que o linkador de worktree usa', () => {
+  it('linka node_modules de cada pacote detectado dentro da worktree', () => {
+    const raiz = criarFixture([]);
+    for (const p of ['.', 'apps/web', 'services/telemetria', 'packages/ui']) pacote(raiz, p);
+    const wt = join(raiz, '..', 'wt-teste');
+
+    // Só o bloco de links, sem git: `setup_worktree` faz worktree add, e worktree
+    // exige repositório. O que esta peça mudou é a LISTA, e é ela que roda aqui
+    // pelo mesmo helper que o setup_worktree chama.
+    const r = noExecutor(
+      raiz,
+      [
+        `wt="${wt}"`,
+        'mkdir -p "$wt"',
+        'linkar_node_modules "$wt"',
+        'find "$wt" -maxdepth 3 -type l | sed "s|^$wt/||" | LC_ALL=C sort',
+      ].join('\n'),
+    );
+    expect(r.stdout.trim().split('\n')).toEqual([
+      'apps/web/node_modules',
+      'node_modules',
+      'packages/ui/node_modules',
+      'services/telemetria/node_modules',
+    ]);
+  });
+});
```

### `b8c303d` — K6b: linha GATE honesta para qualquer nome de gate

```diff
K6b: linha GATE honesta para qualquer nome de gate

O e2e de 2026-09-08 mediu a trilha mentindo. `event_gate` montava a linha
procurando gates por NOME FIXO do monorepo do CI (`typecheck_marca` casando
typecheck_root/typecheck_web, mais `testes_por_pacote` e `build`). No fixture,
cujos gates se chamam `typecheck` e `test`, a trilha gravou

  001 GATE typecheck=nao-rodou testes=nao-rodou enforcement=ok criterios=4/4 build=nao-rodou

enquanto o gates.txt do MESMO attempt dizia `ok typecheck` / `ok test` /
`VEREDITO: APROVADO`. Não derrubava o run — o desfecho sai do gates.txt —, mas
a trilha é o ground truth de "o que aconteceu".

Agora cada gate do config tem um PAPEL: declarado (`"papel": "testes"`) ou
inferido do nome (papel_do_gate). `papel_marca` combina TODOS os gates daquele
papel: falha de qualquer um é falha do papel; ok só quando todos rodaram e
passaram. `typecheck_marca` sai — era a lista de nomes do CI.

Vocabulário: `nao-configurado` é novo e é o que faltava — o repo não tem gate
nenhum com esse papel. Dizer "não rodou" sobre um build que o repo não tem era
a mesma mentira ao contrário. `nao-rodou` volta a significar só "há gate
configurado e ele não chegou a rodar".

`lint=` é CONDICIONAL: campo fixo mudaria a linha de todo repo sem lint,
inclusive a do CI.

Teste antes do conserto (test/orquestrador-trilha-gate-papel.test.ts, 9 casos):
5 vermelhos, 4 verdes — e os 4 verdes são exatamente os do config do CI, que é
a garantia de que nada muda lá.

  ×  a trilha diz o que os gates disseram, e build sai como nao-configurado
     → expected '901 GATE typecheck=nao-rodou testes=nao-rodou…'
                 to be '901 GATE typecheck=ok testes=ok…'
  ×  gate de nome próprio que REPROVA sai falha, e o que passou continua ok
  ×  gate CONFIGURADO que não chegou a rodar continua nao-rodou
  ×  um gate chamado `verificacao` com "papel": "testes" entra como testes
  ×  config COM gate de lint: a linha ganha lint=, depois de build=
  ✓  produz EXATAMENTE a linha de hoje para um attempt real (runs-201 attempt-2)
  ✓  os dois typecheck do CI viram um papel só, e falha de um é falha do papel
  ✓  nenhum gate do CI cai em nao-configurado
  ✓  config sem gate de lint: a linha NÃO ganha campo novo
  Tests  5 failed | 4 passed (9)

O que o CI faz diferente: NADA, provado com o config do CI na fixture do teste.
Com `_referencia-ci/000-config.ci.json` e `test/fixtures/runs-201/attempt-2.gates.txt`
a linha sai

  901 GATE typecheck=ok testes=falha enforcement=ok criterios=3/3 build=nao-rodou

que é, caractere a caractere, a que o código anterior produzia (medida antes da
mudança, com o mesmo par config+gates.txt). Os 24 arquivos de teste de trilha
que já existiam continuam verdes SEM edição: 618 -> 627.

Chave de config nova, documentada nos dois lugares: `_gates_papel` em
fixture/docs/fila/000-config.json e em doutrina/templates/config.json. Nenhum
dos dois precisa declará-la — a inferência acerta os nomes que ambos usam.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016sgWDu1w9FNYPNpQYpeXVn



diff --git a/CHANGELOG.md b/CHANGELOG.md
index 4193bbe..a115d89 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -80,3 +80,11 @@ attempt registra como `ok`. Não derruba o run; faz a trilha mentir.
   árvore do conteudos-infinitos escrita dentro do motor. `LC_ALL=C sort` reproduz a ordem
   antiga item a item. Contra o checkout real do CI as duas listas saem idênticas: o CI não
   faz nada diferente.
+- **K6b** — `executor.sh`: a linha `GATE` da trilha passa a sair do RESULTADO dos gates, não
+  do nome deles no monorepo do CI. Cada gate do config tem um PAPEL (`typecheck` | `testes` |
+  `build` | `lint`), declarado por `"papel"` ou inferido do nome; `papel_marca` combina todos
+  os gates daquele papel. Vocabulário novo: `nao-configurado` (o repo não tem gate com esse
+  papel) — `nao-rodou` volta a significar só o que sempre devia. `lint=` é campo condicional,
+  para não mexer na linha de quem não tem lint. `typecheck_marca` (que casava
+  `typecheck_root`/`typecheck_web` por nome) sai. Com o config do CI e o
+  `test/fixtures/runs-201/attempt-2.gates.txt`, a linha é byte a byte a de hoje.
diff --git a/doutrina/templates/config.json b/doutrina/templates/config.json
index 49bffca..a89b843 100644
--- a/doutrina/templates/config.json
+++ b/doutrina/templates/config.json
@@ -209,6 +209,7 @@
       "<tabelas de nome parecido mas de propriedade deste repo>"
     ]
   },
+  "_gates_papel": "Chave OPCIONAL por gate (peça K6b): \"papel\": \"typecheck\" | \"testes\" | \"build\" | \"lint\". É ela que decide o que a linha GATE da trilha diz sobre cada gate. Quando ausente, o papel é INFERIDO do nome (executor.sh, papel_do_gate: *typecheck*/*tsc*/*types* → typecheck; *lint* → lint; *build*/*compil* → build; *test*/*spec* → testes). Declare-a quando o nome do gate não disser o papel — um gate chamado `verificacao` sai como nao-configurado sem ela. Papel que não existe em gate nenhum do config aparece na trilha como `nao-configurado`, nunca `nao-rodou`.",
   "gates": [
     {
       "nome": "typecheck",
diff --git a/fixture/docs/fila/000-config.json b/fixture/docs/fila/000-config.json
index f684496..51066de 100644
--- a/fixture/docs/fila/000-config.json
+++ b/fixture/docs/fila/000-config.json
@@ -170,6 +170,7 @@
       "descricao": "vitest run do package.json do fixture."
     }
   ],
+  "_gates_papel": "Chave OPCIONAL por gate (peça K6b): \"papel\": \"typecheck\" | \"testes\" | \"build\" | \"lint\". É ela que decide o que a linha GATE da trilha diz sobre cada gate. Quando ausente, o papel é INFERIDO do nome (executor.sh, papel_do_gate: *typecheck*/*tsc*/*types* → typecheck; *lint* → lint; *build*/*compil* → build; *test*/*spec* → testes). Declare-a quando o nome do gate não disser o papel — um gate chamado `verificacao` sai como nao-configurado sem ela. Papel que não existe em gate nenhum do config aparece na trilha como `nao-configurado`, nunca `nao-rodou`.",
   "_gates": "cmd = os scripts do fixture/package.json, verificados no disco. tipo exit_code (não baseline): o fixture nasce com 0 erro de tipo e 3 testes verdes, então não há erro herdado a tolerar.",
 
   "canal_notificacao": "arquivo",
diff --git a/scripts/orquestrador/executor.sh b/scripts/orquestrador/executor.sh
index 95f0142..277e164 100755
--- a/scripts/orquestrador/executor.sh
+++ b/scripts/orquestrador/executor.sh
@@ -455,34 +455,94 @@ gate_marca() {
   esac
 }
 
-# Combina os dois gates de typecheck deste repo (root e web) numa marca so:
-# falha de qualquer um e falha do typecheck.
-typecheck_marca() {
-  local f="$1" r w
-  r="$(gate_marca "$f" typecheck_root)"; w="$(gate_marca "$f" typecheck_web)"
-  case "$r/$w" in
-    *falha*) echo falha ;;
-    ok/ok)   echo ok ;;
-    *)       echo nao-rodou ;;
+# --- 7b.1 · PAPEL de um gate (peca K6b) -------------------------------------
+# A linha GATE da trilha fala em typecheck / testes / build / lint. Os gates do
+# config falam o nome que o REPO deu a eles. O papel e a ponte, e ate esta peca
+# ela era uma lista de nomes do conteudos-infinitos dentro do motor
+# (typecheck_root, typecheck_web, testes_por_pacote, build) — num repo cujos
+# gates se chamem `typecheck` e `test`, a trilha do e2e de 2026-09-08 gravou
+# `typecheck=nao-rodou testes=nao-rodou build=nao-rodou` sobre gates que o
+# gates.txt do MESMO attempt registra como `ok`. A trilha mentiu por premissa.
+#
+# papel_do_gate <nome> [papel_declarado] -> typecheck | testes | build | lint | ''
+# Declarado ganha do inferido: `"papel": "testes"` num gate chamado `verificacao`
+# e a unica saida para nome que nenhuma heuristica adivinha. A inferencia so
+# existe para nao obrigar todo config de hoje a ser reescrito.
+#
+# Ordem dos casos e significativa: `typecheck` NAO contem `test` (t-y-p-e-c-h-e-c-k),
+# entao os dois nao colidem; `lint` e `build` vem antes de `test` so por clareza.
+papel_do_gate() {
+  local nome="$1" declarado="${2:-}"
+  case "$declarado" in
+    ''|null) : ;;
+    *) printf '%s' "$declarado"; return 0 ;;
+  esac
+  case "$nome" in
+    *typecheck*|*tsc*|*types*) printf 'typecheck' ;;
+    *lint*)                    printf 'lint' ;;
+    *build*|*compil*)          printf 'build' ;;
+    *test*|*spec*)             printf 'testes' ;;
+    *)                         printf '' ;;
   esac
 }
 
+# gates_do_papel <papel> -> os NOMES dos gates do config com esse papel.
+# Sai do CONFIG, nunca do gates.txt: e por isso que "o repo nao tem gate de
+# build" (nao-configurado) e distinguivel de "tem, e nao chegou a rodar"
+# (nao-rodou).
+gates_do_papel() {
+  local papel="$1" nome declarado
+  while IFS=$'\t' read -r nome declarado; do
+    [ -n "$nome" ] || continue
+    [ "$(papel_do_gate "$nome" "$declarado")" = "$papel" ] && printf '%s\n' "$nome"
+  done < <(cfg '.gates[]? | [.nome, (.papel // "")] | @tsv' 2>/dev/null || true)
+  return 0
+}
+
+# papel_marca <gates.txt> <papel> -> ok | falha | nao-rodou | nao-configurado
+# Combina TODOS os gates daquele papel (o CI tem dois de typecheck): falha de
+# qualquer um e falha do papel, e so e `ok` quando todos rodaram e passaram.
+papel_marca() {
+  local f="$1" papel="$2" nome n=0 falhou=0 naorodou=0
+  while IFS= read -r nome; do
+    [ -n "$nome" ] || continue
+    n=$((n + 1))
+    case "$(gate_marca "$f" "$nome")" in
+      falha)     falhou=1 ;;
+      nao-rodou) naorodou=1 ;;
+    esac
+  done < <(gates_do_papel "$papel")
+  if   [ "$n" = 0 ];       then echo nao-configurado
+  elif [ "$falhou" = 1 ];  then echo falha
+  elif [ "$naorodou" = 1 ]; then echo nao-rodou
+  else echo ok
+  fi
+}
+
 # event_gate <id> <rundir> <enf_ok>
 # fora_do_pathspec= so entra quando o ENFORCEMENT reprova: e o dado que
 # transforma um beco sem saida em ticket acionavel (colisao de teste na SKILL).
+#
+# lint= e CONDICIONAL, e de proposito: acrescentar um campo fixo mudaria a linha
+# de todo repo que nao tem lint — inclusive a do CI, que esta peca se obriga a
+# nao mexer. Quem tem gate de lint ganha o campo; quem nao tem, ganha a mesma
+# linha de sempre.
 event_gate() {
-  local id="$1" rundir="$2" enf_ok="$3" gt="$2/gates.txt" fora="" n_falhos=0
+  local id="$1" rundir="$2" enf_ok="$3" gt="$2/gates.txt" fora="" n_falhos=0 lint
   [ -z "$CRITERIOS_FALHOS" ] || n_falhos="$(printf '%s' "$CRITERIOS_FALHOS" | awk -F';' '{print NF}')"
   if [ "$enf_ok" = 0 ] && [ -s "$rundir/enforcement.json" ]; then
     fora="$(jq -r '[.violations[]? | select(.tipo == "fora_do_pathspec") | .detalhe] | join(",")' \
       "$rundir/enforcement.json" 2>/dev/null || true)"
   fi
+  lint="$(papel_marca "$gt" lint)"
+  [ "$lint" = nao-configurado ] && lint=''
   event "$id" GATE \
-    "typecheck=$(typecheck_marca "$gt")" \
-    "testes=$(gate_marca "$gt" testes_por_pacote)" \
+    "typecheck=$(papel_marca "$gt" typecheck)" \
+    "testes=$(papel_marca "$gt" testes)" \
     "enforcement=$([ "$enf_ok" = 1 ] && echo ok || echo falha)" \
     "criterios=$(( CRITERIOS_TOTAL - n_falhos ))/$CRITERIOS_TOTAL" \
-    "build=$(gate_marca "$gt" build)" \
+    "build=$(papel_marca "$gt" build)" \
+    ${lint:+"lint=$lint"} \
     ${fora:+"fora_do_pathspec=$fora"}
 }
 
diff --git a/test/orquestrador-trilha-gate-papel.test.ts b/test/orquestrador-trilha-gate-papel.test.ts
new file mode 100644
index 0000000..52b67df
--- /dev/null
+++ b/test/orquestrador-trilha-gate-papel.test.ts
@@ -0,0 +1,187 @@
+/**
+ * Peça K6b — a linha `GATE` da trilha derivada do RESULTADO dos gates, não do
+ * nome deles no monorepo do CI.
+ *
+ * O defeito, medido no e2e de 2026-09-08 (docs/PECAS.md, K7-e2e): `event_gate`
+ * montava a linha com `gate_marca "$gt" testes_por_pacote` e
+ * `gate_marca "$gt" build` — nomes do conteudos-infinitos escritos dentro do
+ * motor. Num repo cujos gates se chamem `typecheck` e `test` (o fixture do kit),
+ * a trilha gravou
+ *
+ *   001 GATE typecheck=nao-rodou testes=nao-rodou enforcement=ok criterios=4/4 build=nao-rodou
+ *
+ * enquanto o `gates.txt` do MESMO attempt dizia `ok typecheck` / `ok test` /
+ * `VEREDITO: APROVADO`. A trilha afirmou "não rodou" sobre gates que rodaram e
+ * aprovaram. Não derruba o run (o desfecho sai do gates.txt), mas a trilha é o
+ * ground truth de "o que aconteceu" — e aqui ela mentia por premissa de repo.
+ *
+ * A regra nova, e o que cada palavra passa a significar:
+ *   - cada gate do config tem um PAPEL: declarado (`"papel": "..."`) ou inferido
+ *     do nome (typecheck | testes | build | lint);
+ *   - `nao-configurado` — o repo não tem gate nenhum com esse papel. Informação
+ *     diferente de `nao-rodou`, e a que faltava: dizer "não rodou" sobre um
+ *     build que o repo não tem é a mesma mentira, só que ao contrário;
+ *   - `nao-rodou` — há gate com esse papel no config e ele não aparece no
+ *     gates.txt (o motor para no primeiro que reprova);
+ *   - `falha` ganha de tudo: papel com dois gates (typecheck_root + typecheck_web)
+ *     reprova se QUALQUER um reprovar.
+ */
+import { describe, it, expect } from 'vitest';
+import { readFileSync } from 'node:fs';
+import { join } from 'node:path';
+import { bashNoFixture, criarFixture, escrever, ler, REPO_ROOT } from './fixtures/orq-harness.js';
+
+const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
+const EVENTS = (raiz: string) => join(raiz, 'docs', 'fila', 'runs', 'events.log');
+
+const CONFIG_CI = join(REPO_ROOT, '_referencia-ci', '000-config.ci.json');
+const CONFIG_FIXTURE = join(REPO_ROOT, 'fixture', 'docs', 'fila', '000-config.json');
+const GATES_201 = join(REPO_ROOT, 'test', 'fixtures', 'runs-201', 'attempt-2.gates.txt');
+
+/**
+ * Monta um rundir e chama `event_gate` de verdade, com o CONFIG pedido no lugar
+ * do config do fixture. É o config que decide quais papéis existem.
+ */
+function linhaGate(configPath: string, gatesTxt: string, total = 3): string {
+  const raiz = criarFixture([{ id: '901', slug: 'b', status: 'pendente' }]);
+  escrever(join(raiz, 'docs', 'fila', '000-config.json'), readFileSync(configPath, 'utf8'));
+  const rundir = join(raiz, 'docs', 'fila', 'runs', '901', 'attempt-0');
+  escrever(join(rundir, 'gates.txt'), gatesTxt);
+  escrever(join(rundir, 'enforcement.json'), JSON.stringify({ ok: true, violations: [] }));
+  bashNoFixture(
+    raiz,
+    [
+      'export EXECUTOR_SOURCED=1',
+      `source "${EXECUTOR}"`,
+      'set +e',
+      `CRITERIOS_FALHOS=''; CRITERIOS_TOTAL=${total}`,
+      `event_gate 901 "${rundir}" 1`,
+    ].join('\n'),
+  );
+  // Sem o timestamp: ele muda a cada execução e não é o que esta peça afirma.
+  return ler(EVENTS(raiz)).trim().replace(/^\S+\s+/, '');
+}
+
+// O gates.txt que o e2e de 2026-09-08 produziu no fixture: dois gates de nome
+// PRÓPRIO, os dois verdes. É a entrada que fazia a trilha mentir.
+const GATES_FIXTURE = [
+  'ok   typecheck                345ms',
+  'ok   test                    2100ms',
+  'VEREDITO: APROVADO',
+].join('\n');
+
+describe('config do FIXTURE (gates `typecheck` e `test`)', () => {
+  it('a trilha diz o que os gates disseram, e build sai como nao-configurado', () => {
+    expect(linhaGate(CONFIG_FIXTURE, GATES_FIXTURE, 4)).toBe(
+      '901 GATE typecheck=ok testes=ok enforcement=ok criterios=4/4 build=nao-configurado',
+    );
+  });
+
+  it('gate de nome próprio que REPROVA sai falha, e o que passou continua ok', () => {
+    const txt = ['ok   typecheck                345ms', 'FALHA test  2100ms — 1 teste(s) falhando', 'VEREDITO: REPROVADO'].join('\n');
+    // A falha de um papel não contamina o outro: `typecheck` rodou e passou.
+    expect(linhaGate(CONFIG_FIXTURE, txt, 4)).toBe(
+      '901 GATE typecheck=ok testes=falha enforcement=ok criterios=4/4 build=nao-configurado',
+    );
+  });
+
+  it('gate CONFIGURADO que não chegou a rodar continua nao-rodou', () => {
+    const txt = ['FALHA typecheck  345ms — 4 erro(s) de tipo', 'VEREDITO: REPROVADO'].join('\n');
+    // `test` está no config e não está no gates.txt: não rodou. Distinto de
+    // `build`, que o config do fixture não tem: nao-configurado.
+    expect(linhaGate(CONFIG_FIXTURE, txt, 4)).toBe(
+      '901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=4/4 build=nao-configurado',
+    );
+  });
+});
+
+describe('config do CI (_referencia-ci/000-config.ci.json)', () => {
+  it('produz EXATAMENTE a linha de hoje para um attempt real (runs-201 attempt-2)', () => {
+    // Medida no código anterior a esta peça, com este mesmo config e este mesmo
+    // gates.txt. Se esta string mudar, o comportamento do CI mudou.
+    expect(linhaGate(CONFIG_CI, readFileSync(GATES_201, 'utf8'))).toBe(
+      '901 GATE typecheck=ok testes=falha enforcement=ok criterios=3/3 build=nao-rodou',
+    );
+  });
+
+  it('os dois typecheck do CI viram um papel só, e falha de um é falha do papel', () => {
+    const txt = [
+      'ok   limpeza_artefatos       10ms',
+      'ok   typecheck_root        1200ms',
+      'FALHA typecheck_web        3400ms — 4 erros acima do baseline',
+      'VEREDITO: REPROVADO',
+    ].join('\n');
+    expect(linhaGate(CONFIG_CI, txt)).toBe(
+      '901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=3/3 build=nao-rodou',
+    );
+  });
+
+  it('nenhum gate do CI cai em nao-configurado: o CI tem os três papéis', () => {
+    const linha = linhaGate(CONFIG_CI, readFileSync(GATES_201, 'utf8'));
+    expect(linha).not.toContain('nao-configurado');
+  });
+});
+
+describe('papel declarado no config manda sobre o inferido do nome', () => {
+  it('um gate chamado `verificacao` com "papel": "testes" entra como testes', () => {
+    const raiz = criarFixture([]);
+    const cfg = JSON.parse(readFileSync(CONFIG_FIXTURE, 'utf8'));
+    cfg.gates = [
+      { nome: 'verificacao', cmd: 'npm test', tipo: 'exit_code', papel: 'testes' },
+      { nome: 'compilacao', cmd: 'npm run build', tipo: 'exit_code', papel: 'build' },
+    ];
+    cfg._execucao_dos_gates = { ordem_obrigatoria: ['verificacao', 'compilacao'], interrupcao: 'NAO_VALE_PARCIALMENTE' };
+    escrever(join(raiz, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg, null, 2));
+    const rundir = join(raiz, 'docs', 'fila', 'runs', '901', 'attempt-0');
+    escrever(join(rundir, 'gates.txt'), ['ok   verificacao   10ms', 'ok   compilacao    20ms', 'VEREDITO: APROVADO'].join('\n'));
+    escrever(join(rundir, 'enforcement.json'), JSON.stringify({ ok: true, violations: [] }));
+    bashNoFixture(
+      raiz,
+      [
+        'export EXECUTOR_SOURCED=1',
+        `source "${EXECUTOR}"`,
+        'set +e',
+        "CRITERIOS_FALHOS=''; CRITERIOS_TOTAL=1",
+        `event_gate 901 "${rundir}" 1`,
+      ].join('\n'),
+    );
+    const linha = ler(EVENTS(raiz)).trim().replace(/^\S+\s+/, '');
+    // `verificacao` e `compilacao` não casam nome nenhum do CI nem do fixture:
+    // sem o campo `papel` os dois sairiam como nao-configurado.
+    expect(linha).toBe('901 GATE typecheck=nao-configurado testes=ok enforcement=ok criterios=1/1 build=ok');
+  });
+});
+
+describe('papel `lint` só aparece na linha quando o repo tem gate de lint', () => {
+  it('config sem gate de lint: a linha NÃO ganha campo novo', () => {
+    expect(linhaGate(CONFIG_CI, readFileSync(GATES_201, 'utf8'))).not.toContain('lint=');
+  });
+
+  it('config COM gate de lint: a linha ganha lint=, depois de build=', () => {
+    const raiz = criarFixture([]);
+    const cfg = JSON.parse(readFileSync(CONFIG_FIXTURE, 'utf8'));
+    cfg.gates = [
+      { nome: 'typecheck', cmd: 'npm run typecheck', tipo: 'exit_code' },
+      { nome: 'lint', cmd: 'npm run lint', tipo: 'exit_code' },
+    ];
+    cfg._execucao_dos_gates = { ordem_obrigatoria: ['typecheck', 'lint'], interrupcao: 'NAO_VALE_PARCIALMENTE' };
+    escrever(join(raiz, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg, null, 2));
+    const rundir = join(raiz, 'docs', 'fila', 'runs', '901', 'attempt-0');
+    escrever(join(rundir, 'gates.txt'), ['ok   typecheck   10ms', 'FALHA lint    20ms — 3 problemas', 'VEREDITO: REPROVADO'].join('\n'));
+    escrever(join(rundir, 'enforcement.json'), JSON.stringify({ ok: true, violations: [] }));
+    bashNoFixture(
+      raiz,
+      [
+        'export EXECUTOR_SOURCED=1',
+        `source "${EXECUTOR}"`,
+        'set +e',
+        "CRITERIOS_FALHOS=''; CRITERIOS_TOTAL=1",
+        `event_gate 901 "${rundir}" 1`,
+      ].join('\n'),
+    );
+    const linha = ler(EVENTS(raiz)).trim().replace(/^\S+\s+/, '');
+    expect(linha).toBe(
+      '901 GATE typecheck=ok testes=nao-configurado enforcement=ok criterios=1/1 build=nao-configurado lint=falha',
+    );
+  });
+});
```

### `45e62d5` — K6c: plist e launchd sem nome de repo

```diff
K6c: plist e launchd sem nome de repo

`com.conteudos.orquestrador.plist.template` -> `com.orquestrador.plist.template`,
com quatro placeholders: {{LABEL}}, {{CHECKOUT}}, {{NODE_DIR}} e
{{START_INTERVAL}}. `instalar-launchd.sh` deixa de ter
`LABEL="com.conteudos.orquestrador"` numa variável e lê `launchd.label` e
`launchd.start_interval` do docs/fila/000-config.json do repo; ganha `--dry-run`,
que imprime o plist renderizado e não escreve nem carrega nada.

Sem `launchd.label`, RECUSA com rc 1:

  ERRO: defina launchd.label no config; o CI usa com.conteudos.orquestrador
        (config: <repo>/docs/fila/000-config.json)
        Um label por repo. Sem essa chave este script NAO escolhe um por voce:
        label inventado carrega um SEGUNDO job ao lado do antigo, em silencio.

Recusar em vez de adivinhar não é preciosismo: para o launchd, dois repos com o
mesmo label são o MESMO job (o segundo bootstrap derruba o primeiro), e um
label inventado faz o oposto — carrega um segundo job ao lado do que já existia,
os dois disparando no mesmo checkout, sem erro nenhum na tela. `start_interval`
tem default (1800, o valor medido em 06/set/2026, com a medição inteira
preservada no comentário do template): intervalo errado atrasa a fila, label
errado junta dois repos.

Teste antes do conserto (test/orquestrador-launchd-config.test.ts, 11 casos):
10 vermelhos.

  × chama-se com.orquestrador.plist.template
  × o corpo do plist (fora dos comentários) não cita repo nenhum
  × todos os valores que variam por máquina/repo são placeholders
  × nenhum .plist instanciado está versionado (só o .template)
  × o Label é o launchd.label do config, não um nome inventado
  × o StartInterval é o launchd.start_interval do config
  × o checkout renderizado é o do fixture
  × não escreve o plist nem carrega job nenhum
  × rc 1 e a mensagem diz qual chave falta e o que o CI usa
  × sem o objeto launchd inteiro, recusa igual (não inventa nada)
  Tests  10 failed | 1 passed (11)

Depois, `--dry-run` no fixture:

  # LABEL          = com.orqfixture.orquestrador          (launchd.label)
  # START_INTERVAL = 600 (launchd.start_interval)
  # CHECKOUT       = /private/tmp/orq-fixture-MBJLYO/repo
  # gravaria em    = ~/Library/LaunchAgents/com.orqfixture.orquestrador.plist

O que o CI faz diferente: NADA até o config do CI ganhar `launchd.label` — e
isso é passo humano, listado no relatório. Enquanto a chave não existir lá, o
`instalar-launchd.sh` do CI RECUSA em vez de instalar com o label errado. O job
JÁ CARREGADO no launchd não é afetado por nada disto: ele aponta para o plist
em ~/Library/LaunchAgents, que este commit não toca. Só uma reinstalação
explícita passa por aqui.

Chave de config nova, nos dois lugares: `launchd` em
fixture/docs/fila/000-config.json (label com.orqfixture.orquestrador,
start_interval 600 — número diferente do CI de propósito, para o teste provar
que ele sai do config) e em doutrina/templates/config.json.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016sgWDu1w9FNYPNpQYpeXVn



diff --git a/CHANGELOG.md b/CHANGELOG.md
index a115d89..ca875a5 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -88,3 +88,10 @@ attempt registra como `ok`. Não derruba o run; faz a trilha mentir.
   para não mexer na linha de quem não tem lint. `typecheck_marca` (que casava
   `typecheck_root`/`typecheck_web` por nome) sai. Com o config do CI e o
   `test/fixtures/runs-201/attempt-2.gates.txt`, a linha é byte a byte a de hoje.
+- **K6c** — `com.conteudos.orquestrador.plist.template` vira `com.orquestrador.plist.template`,
+  com `{{LABEL}}`, `{{CHECKOUT}}`, `{{NODE_DIR}}` e `{{START_INTERVAL}}`;
+  `instalar-launchd.sh` lê `launchd.label` e `launchd.start_interval` do
+  `docs/fila/000-config.json` e ganha `--dry-run`. Sem `launchd.label`: rc 1 com
+  "defina launchd.label no config; o CI usa com.conteudos.orquestrador". Não inventa label —
+  label inventado não dá erro, dá um segundo job carregado ao lado do antigo. Chave nova
+  documentada em `fixture/docs/fila/000-config.json` e `doutrina/templates/config.json`.
diff --git a/ORIGEM.md b/ORIGEM.md
index 5a963bf..ced632f 100644
--- a/ORIGEM.md
+++ b/ORIGEM.md
@@ -8,7 +8,7 @@ Harness importado do conteudos-infinitos em 2026-09-08 10:57.
 - script: scripts/kit/extrair-do-ci.sh (rodar de novo com --forcar para reimportar)
 
 ```
-scripts/orquestrador/com.conteudos.orquestrador.plist.template -> scripts/orquestrador/com.conteudos.orquestrador.plist.template
+scripts/orquestrador/com.conteudos.orquestrador.plist.template -> scripts/orquestrador/com.conteudos.orquestrador.plist.template  [RENOMEADO na peça K6c para scripts/orquestrador/com.orquestrador.plist.template]
 scripts/orquestrador/decisao-cli.ts -> scripts/orquestrador/decisao-cli.ts
 scripts/orquestrador/decisao.ts -> scripts/orquestrador/decisao.ts
 scripts/orquestrador/diagnostico.ts -> scripts/orquestrador/diagnostico.ts
diff --git a/doutrina/templates/config.json b/doutrina/templates/config.json
index a89b843..2428e9a 100644
--- a/doutrina/templates/config.json
+++ b/doutrina/templates/config.json
@@ -210,6 +210,12 @@
     ]
   },
   "_gates_papel": "Chave OPCIONAL por gate (peça K6b): \"papel\": \"typecheck\" | \"testes\" | \"build\" | \"lint\". É ela que decide o que a linha GATE da trilha diz sobre cada gate. Quando ausente, o papel é INFERIDO do nome (executor.sh, papel_do_gate: *typecheck*/*tsc*/*types* → typecheck; *lint* → lint; *build*/*compil* → build; *test*/*spec* → testes). Declare-a quando o nome do gate não disser o papel — um gate chamado `verificacao` sai como nao-configurado sem ela. Papel que não existe em gate nenhum do config aparece na trilha como `nao-configurado`, nunca `nao-rodou`.",
+  "launchd": {
+    "label": "<ex: com.suaorg.orquestrador — OBRIGATÓRIO, um por repo>",
+    "start_interval": 1800
+  },
+  "_launchd": "Peça K6c. `label` é o Label do job do launchd e NÃO tem default: scripts/orquestrador/instalar-launchd.sh RECUSA sem ele, em vez de inventar um. Label inventado não dá erro visível — carrega um SEGUNDO job ao lado do antigo, os dois disparando no mesmo checkout. Um label por repo: para o launchd, dois repos com o mesmo label são o MESMO job. `start_interval` é o StartInterval em segundos; 1800 é o valor medido em 06/set/2026 (mediana 294s, p90 2509s por ticket), e a medição inteira está no comentário do com.orquestrador.plist.template — refaça-a antes de trocar o número.",
+
   "gates": [
     {
       "nome": "typecheck",
diff --git a/fixture/docs/fila/000-config.json b/fixture/docs/fila/000-config.json
index 51066de..1b8cf55 100644
--- a/fixture/docs/fila/000-config.json
+++ b/fixture/docs/fila/000-config.json
@@ -173,6 +173,12 @@
   "_gates_papel": "Chave OPCIONAL por gate (peça K6b): \"papel\": \"typecheck\" | \"testes\" | \"build\" | \"lint\". É ela que decide o que a linha GATE da trilha diz sobre cada gate. Quando ausente, o papel é INFERIDO do nome (executor.sh, papel_do_gate: *typecheck*/*tsc*/*types* → typecheck; *lint* → lint; *build*/*compil* → build; *test*/*spec* → testes). Declare-a quando o nome do gate não disser o papel — um gate chamado `verificacao` sai como nao-configurado sem ela. Papel que não existe em gate nenhum do config aparece na trilha como `nao-configurado`, nunca `nao-rodou`.",
   "_gates": "cmd = os scripts do fixture/package.json, verificados no disco. tipo exit_code (não baseline): o fixture nasce com 0 erro de tipo e 3 testes verdes, então não há erro herdado a tolerar.",
 
+  "launchd": {
+    "label": "com.orqfixture.orquestrador",
+    "start_interval": 600
+  },
+  "_launchd": "Peça K6c. `label` é o Label do job do launchd e NÃO tem default: instalar-launchd.sh RECUSA sem ele (o CI usa com.conteudos.orquestrador). Um label por repo — para o launchd, dois repos com o mesmo label são o MESMO job, e o segundo bootstrap derruba o primeiro. `start_interval` é o StartInterval em segundos; ausente vira 1800, que é o valor MEDIDO em 06/set/2026 (a medição está no com.orquestrador.plist.template). 600 aqui só para o teste provar que o número sai do config e não do template — o fixture nunca carrega job nenhum.",
+
   "canal_notificacao": "arquivo",
   "_canal_notificacao": "lib.sh:820-823: qualquer valor diferente de 'notificacao_nativa' faz a notificação ficar SÓ no arquivo runs/notificacoes.log. É o padrão que a peça K10 quer para todo repo.",
   "push_suprimido": true,
diff --git a/instalar.sh b/instalar.sh
index f0acb34..f9d4c0c 100644
--- a/instalar.sh
+++ b/instalar.sh
@@ -37,7 +37,8 @@
 #   *.plist que não termine em .plist.template — é o plist INSTANCIADO, gerado
 #     por instalar-launchd.sh com caminhos absolutos DESTA máquina. Artefato
 #     local, não motor. A regra é por sufixo e não por nome porque o nome muda
-#     por repo (e a peça K6 vai trocá-lo por com.orquestrador.plist.template).
+#     por repo: desde a peça K6c o nome do plist instanciado é o
+#     `launchd.label` do config, e o template é com.orquestrador.plist.template.
 #   runs — evidência de execução, efêmera por contrato.
 #   VERSAO — carimbo da vendorização, não conteúdo da doutrina: ele existe no
 #     destino e não na origem, então compará-lo acusaria diferença em toda
diff --git a/scripts/kit/fixture.sh b/scripts/kit/fixture.sh
index c0b8108..d53c665 100644
--- a/scripts/kit/fixture.sh
+++ b/scripts/kit/fixture.sh
@@ -99,8 +99,8 @@ chmod +x "$FX/scripts/orq"
 # Sem esta cópia o subcomando morre com "No such file or directory" no repo instalado.
 cp -R "$KIT/scripts/roadmap" "$FX/scripts/roadmap"
 # Plist INSTANCIADO não é motor: é artefato de uma máquina (caminhos absolutos).
-# Só o .template atravessa. Regra por sufixo, não por nome: o nome do plist muda
-# por repo, e um dia (peça K6) vira com.orquestrador.plist.template.
+# Só o .template atravessa. Regra por sufixo, não por nome: o nome do plist
+# instanciado é o `launchd.label` do config do repo (peça K6c), então varia.
 find "$FX/scripts/orquestrador" -name '*.plist' ! -name '*.plist.template' -exec rm -f {} +
 cp -R "$KIT/doutrina/." "$FX/docs/orquestrador/skill/"
 cp "$KIT/VERSAO" "$FX/docs/orquestrador/skill/VERSAO"
diff --git a/scripts/orquestrador/com.conteudos.orquestrador.plist.template b/scripts/orquestrador/com.conteudos.orquestrador.plist.template
deleted file mode 100644
index 867192d..0000000
--- a/scripts/orquestrador/com.conteudos.orquestrador.plist.template
+++ /dev/null
@@ -1,69 +0,0 @@
-<?xml version="1.0" encoding="UTF-8"?>
-<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
-<!--
-  TEMPLATE - nao e um plist utilizavel. Os placeholders __REPO_DIR__ e
-  __NODE_DIR__ sao resolvidos por scripts/orquestrador/instalar-launchd.sh,
-  que gera o plist final e o instala em ~/Library/LaunchAgents/.
-
-  O plist FINAL nunca e versionado (carrega caminhos desta maquina); so este
-  template entra no git. Caminho absoluto versionado = divida de portabilidade.
-
-  ADAPTADO do comarka-operacional (com.comarka.orquestrador.plist.template) a
-  partir da evidencia DESTE repo. As tres diferencas, com o porque de cada uma:
-
-  1. Label: com.conteudos.orquestrador. Um label por repo - dois repos com o
-     mesmo label sao o mesmo job para o launchd, e o segundo bootstrap derruba
-     o primeiro.
-
-  2. StartInterval 1800. NAO e copia cega do comarka: e o mesmo numero porque a
-     medicao deu a mesma ordem de grandeza. Medido em docs/fila/runs/*/meta.json
-     (claude_dur_secs somado por ticket) em 06/set/2026:
-       conteudos-infinitos: 58 tickets, mediana 294s, p90 2509s
-       comarka-operacional: 304 tickets, mediana 499s, p90 2838s
-     Metade dos tickets fecha em ~5min e ~10% passa de 42min. Com 1800s, o
-     disparo tipico pega a fila livre e o disparo que cai em cima de um run vivo
-     encerra em 0 pelo lock do local-loop.sh - nao ha atropelo. Intervalo menor
-     so multiplicaria disparos que nao fazem nada; maior deixaria a fila parada
-     de proposito. Trocar este numero pede refazer a medicao acima.
-
-  3. StandardOutPath/StandardErrorPath em docs/fila/runs/launchd-agent.log, e
-     NAO no launchd.log que o launchd-run.sh escreve. Sao dois logs de propósito:
-     launchd-run.sh so redireciona para launchd.log DEPOIS de checar node e
-     claude (linhas 30-46); se qualquer um dos dois faltar, o `exit 127` sai
-     por stderr do processo, ou seja, por ESTE arquivo. Apontar os dois para o
-     mesmo caminho embaralharia as duas fontes e o modo de falha mais comum
-     (PATH sem node/claude) e justamente o que so aparece aqui.
-     docs/fila/runs/ e ignorada pelo git neste repo (runs/.gitignore: `*`),
-     entao o log nao suja a arvore nem mata o preflight do run seguinte.
--->
-<plist version="1.0">
-<dict>
-  <key>Label</key>
-  <string>com.conteudos.orquestrador</string>
-
-  <key>ProgramArguments</key>
-  <array>
-    <string>/bin/bash</string>
-    <string>__REPO_DIR__/scripts/orquestrador/launchd-run.sh</string>
-  </array>
-
-  <key>EnvironmentVariables</key>
-  <dict>
-    <key>NODE_OPTIONS</key>
-    <string>--max-old-space-size=4096</string>
-    <key>NODE_DIR</key>
-    <string>__NODE_DIR__</string>
-  </dict>
-
-  <key>StartInterval</key>
-  <integer>1800</integer>
-
-  <key>RunAtLoad</key>
-  <false/>
-
-  <key>StandardOutPath</key>
-  <string>__REPO_DIR__/docs/fila/runs/launchd-agent.log</string>
-  <key>StandardErrorPath</key>
-  <string>__REPO_DIR__/docs/fila/runs/launchd-agent.log</string>
-</dict>
-</plist>
diff --git a/scripts/orquestrador/com.orquestrador.plist.template b/scripts/orquestrador/com.orquestrador.plist.template
new file mode 100644
index 0000000..885dc8d
--- /dev/null
+++ b/scripts/orquestrador/com.orquestrador.plist.template
@@ -0,0 +1,75 @@
+<?xml version="1.0" encoding="UTF-8"?>
+<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
+<!--
+  TEMPLATE - nao e um plist utilizavel. Os quatro placeholders sao resolvidos
+  por scripts/orquestrador/instalar-launchd.sh, que gera o plist final e o
+  instala em ~/Library/LaunchAgents/.
+
+    {{LABEL}}           launchd.label do docs/fila/000-config.json do repo
+    {{CHECKOUT}}        raiz do checkout, resolvida a partir deste arquivo
+    {{NODE_DIR}}        dirname do `which node` DESTA maquina
+    {{START_INTERVAL}}  launchd.start_interval do config (segundos)
+
+  O plist FINAL nunca e versionado (carrega caminhos desta maquina); so este
+  template entra no git. Caminho absoluto versionado = divida de portabilidade.
+
+  POR QUE O LABEL VEM DO CONFIG, e nao daqui (peca K6c). Ate 2026-09-08 este
+  arquivo se chamava com.conteudos.orquestrador.plist.template e trazia aquele
+  Label FIXO no corpo. Para o launchd, dois repos com o mesmo label sao o MESMO
+  job: o segundo bootstrap derruba o primeiro, em silencio. Um label FIXO junta
+  repos que deviam ser separados; um label INVENTADO pelo instalador faz o
+  oposto e e pior, porque carrega um segundo job ao lado do antigo e os dois
+  disparam no mesmo checkout. Por isso o instalador recusa quando
+  `launchd.label` nao esta no config, em vez de escolher por conta propria.
+
+  DE ONDE SAI UM start_interval, se voce estiver definindo o seu. O do
+  conteudos-infinitos e 1800, e nao por copia: foi medido em
+  docs/fila/runs/*/meta.json (claude_dur_secs somado por ticket) em 06/set/2026 -
+    conteudos-infinitos: 58 tickets, mediana 294s, p90 2509s
+    comarka-operacional: 304 tickets, mediana 499s, p90 2838s
+  Metade dos tickets fecha em ~5min e ~10% passa de 42min. Com 1800s, o disparo
+  tipico pega a fila livre e o disparo que cai em cima de um run vivo encerra em
+  0 pelo lock do local-loop.sh - nao ha atropelo. Intervalo menor so
+  multiplicaria disparos que nao fazem nada; maior deixaria a fila parada de
+  proposito. Refaca a medicao acima antes de escolher outro numero.
+
+  STDOUT/STDERR em docs/fila/runs/launchd-agent.log, e NAO no launchd.log que o
+  launchd-run.sh escreve. Sao dois logs de proposito: launchd-run.sh so
+  redireciona para launchd.log DEPOIS de checar node e claude; se qualquer um
+  dos dois faltar, o `exit 127` sai por stderr do processo, ou seja, por ESTE
+  arquivo. Apontar os dois para o mesmo caminho embaralharia as duas fontes - e
+  o modo de falha mais comum (PATH sem node/claude) e justamente o que so
+  aparece aqui. docs/fila/runs/ e ignorada pelo git (runs/.gitignore: `*`),
+  entao o log nao suja a arvore nem mata o preflight do run seguinte.
+-->
+<plist version="1.0">
+<dict>
+  <key>Label</key>
+  <string>{{LABEL}}</string>
+
+  <key>ProgramArguments</key>
+  <array>
+    <string>/bin/bash</string>
+    <string>{{CHECKOUT}}/scripts/orquestrador/launchd-run.sh</string>
+  </array>
+
+  <key>EnvironmentVariables</key>
+  <dict>
+    <key>NODE_OPTIONS</key>
+    <string>--max-old-space-size=4096</string>
+    <key>NODE_DIR</key>
+    <string>{{NODE_DIR}}</string>
+  </dict>
+
+  <key>StartInterval</key>
+  <integer>{{START_INTERVAL}}</integer>
+
+  <key>RunAtLoad</key>
+  <false/>
+
+  <key>StandardOutPath</key>
+  <string>{{CHECKOUT}}/docs/fila/runs/launchd-agent.log</string>
+  <key>StandardErrorPath</key>
+  <string>{{CHECKOUT}}/docs/fila/runs/launchd-agent.log</string>
+</dict>
+</plist>
diff --git a/scripts/orquestrador/instalar-launchd.sh b/scripts/orquestrador/instalar-launchd.sh
index d5ac3cf..70b299f 100755
--- a/scripts/orquestrador/instalar-launchd.sh
+++ b/scripts/orquestrador/instalar-launchd.sh
@@ -1,29 +1,67 @@
 #!/bin/bash
 set -euo pipefail
 
-# Instalacao assistida do agendamento do Orquestrador Autonomo
-# (conteudos-infinitos).
+# Instalacao assistida do agendamento do Orquestrador Autonomo.
 #
-# Resolve os caminhos DESTA maquina (repo + node), gera o plist final a partir
-# do template versionado e o carrega no dominio gui do usuario. NUNCA usa
-# `kickstart -k` - matar um run vivo por cima e proibido.
+# Resolve os caminhos DESTE repo e DESTA maquina (checkout + node), le do
+# docs/fila/000-config.json o que e do REPO (launchd.label,
+# launchd.start_interval), renderiza com.orquestrador.plist.template e carrega o
+# job no dominio gui do usuario. NUNCA usa `kickstart -k` - matar um run vivo
+# por cima e proibido.
 #
-# PORTABILIDADE: REPO_DIR sai do proprio arquivo; NODE_DIR sai do `which node`.
+# Uso:
+#   bash scripts/orquestrador/instalar-launchd.sh            instala e carrega
+#   bash scripts/orquestrador/instalar-launchd.sh --dry-run  so imprime o plist
+#
+# PORTABILIDADE: CHECKOUT sai do proprio arquivo; NODE_DIR sai do `which node`.
 # Rodar este script e o ato que "hospeda" o loop aqui.
 #
-# ADAPTADO do comarka-operacional em 06/set/2026. Este repo tinha
-# launchd-run.sh (o wrapper que o plist chama) mas NENHUM plist e nenhum
-# instalador: o loop so rodava quando alguem o disparava a mao. Tirar o
-# .orq-pause nao resolvia porque nao havia job agendado para retomar.
-# As diferencas em relacao ao original sao tres - label, REPO_DIR (que sai
-# daqui, entao se adapta sozinho) e o StartInterval/log do template, cada uma
-# justificada em com.conteudos.orquestrador.plist.template.
+# POR QUE O LABEL VEM DO CONFIG E NAO DAQUI (peca K6c). Ate 2026-09-08 este
+# script tinha `LABEL="com.conteudos.orquestrador"` numa variavel e montava o
+# caminho do template a partir dela. Instalado em outro repo, ele carregaria o
+# job do conteudos-infinitos: para o launchd, dois repos com o mesmo label sao o
+# MESMO job, e o segundo bootstrap derruba o primeiro em silencio.
+#
+# E por que ele RECUSA em vez de inventar um label a partir do nome do
+# diretorio: label inventado nao produz erro visivel. Produz um SEGUNDO job
+# carregado ao lado do que ja existia, os dois disparando no mesmo checkout, e
+# ninguem descobre isso ate ver duas drenagens concorrendo pelo mesmo lock.
+# Recusar e barulhento; adivinhar e silencioso e caro.
+
+DRY=0
+case "${1:-}" in
+  --dry-run) DRY=1 ;;
+  '') : ;;
+  *) echo "uso: $0 [--dry-run]" >&2; exit 2 ;;
+esac
 
 UID_NUM="$(id -u)"
-REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
-LABEL="com.conteudos.orquestrador"
-TEMPLATE="$REPO_DIR/scripts/orquestrador/$LABEL.plist.template"
-GERADO="$REPO_DIR/scripts/orquestrador/$LABEL.plist"
+CHECKOUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
+CONFIG="$CHECKOUT/docs/fila/000-config.json"
+TEMPLATE="$CHECKOUT/scripts/orquestrador/com.orquestrador.plist.template"
+
+[ -f "$CONFIG" ] || { echo "ERRO: config ausente: $CONFIG" >&2; exit 1; }
+[ -f "$TEMPLATE" ] || { echo "ERRO: template ausente: $TEMPLATE" >&2; exit 1; }
+
+# --- o que e do REPO, e sai do config ----------------------------------------
+LABEL="$(jq -r '.launchd.label // empty' "$CONFIG" 2>/dev/null || true)"
+if [ -z "$LABEL" ]; then
+  echo "ERRO: defina launchd.label no config; o CI usa com.conteudos.orquestrador" >&2
+  echo "      (config: $CONFIG)" >&2
+  echo "      Um label por repo. Sem essa chave este script NAO escolhe um por voce:" >&2
+  echo "      label inventado carrega um SEGUNDO job ao lado do antigo, em silencio." >&2
+  exit 1
+fi
+
+# start_interval e opcional: 1800 e o numero MEDIDO (a justificativa esta no
+# template). Faltar aqui nao e ambiguidade perigosa como o label — um intervalo
+# errado atrasa a fila, um label errado junta dois repos num job so.
+START_INTERVAL="$(jq -r '.launchd.start_interval // empty' "$CONFIG" 2>/dev/null || true)"
+case "$START_INTERVAL" in
+  ''|*[!0-9]*) START_INTERVAL=1800; echo "aviso: launchd.start_interval ausente ou nao-numerico; usando 1800 (o medido)." >&2 ;;
+esac
+
+GERADO="$CHECKOUT/scripts/orquestrador/$LABEL.plist"
 DST="$HOME/Library/LaunchAgents/$LABEL.plist"
 
 if ! command -v node >/dev/null 2>&1; then
@@ -33,23 +71,42 @@ fi
 NODE_BIN="$(command -v node)"
 NODE_DIR="$(cd "$(dirname "$NODE_BIN")" && pwd)"
 
-[ -f "$TEMPLATE" ] || { echo "ERRO: template ausente: $TEMPLATE" >&2; exit 1; }
-[ -x "$REPO_DIR/scripts/orquestrador/launchd-run.sh" ] || {
+[ -x "$CHECKOUT/scripts/orquestrador/launchd-run.sh" ] || {
   echo "ERRO: launchd-run.sh ausente ou sem +x" >&2; exit 1; }
 
+# renderiza -> stdout. Um lugar so monta o plist, e o --dry-run mostra
+# exatamente o que a instalacao gravaria.
+renderiza() {
+  sed -e "s|{{LABEL}}|$LABEL|g" \
+      -e "s|{{CHECKOUT}}|$CHECKOUT|g" \
+      -e "s|{{NODE_DIR}}|$NODE_DIR|g" \
+      -e "s|{{START_INTERVAL}}|$START_INTERVAL|g" \
+      "$TEMPLATE"
+}
+
+if [ "$DRY" = 1 ]; then
+  echo "# --dry-run: nada e escrito, nada e carregado." >&2
+  echo "# LABEL          = $LABEL          (launchd.label)" >&2
+  echo "# START_INTERVAL = $START_INTERVAL (launchd.start_interval)" >&2
+  echo "# CHECKOUT       = $CHECKOUT" >&2
+  echo "# NODE_DIR       = $NODE_DIR  ($("$NODE_BIN" -v))" >&2
+  echo "# gravaria em    = $DST" >&2
+  renderiza
+  exit 0
+fi
+
 # O plist manda stdout/stderr para docs/fila/runs/. Sem a pasta, o launchd nao
 # carrega o job e a falha aparece so no log do sistema.
-mkdir -p "$REPO_DIR/docs/fila/runs"
+mkdir -p "$CHECKOUT/docs/fila/runs"
 
-echo "REPO_DIR = $REPO_DIR"
+echo "LABEL    = $LABEL"
+echo "CHECKOUT = $CHECKOUT"
 echo "NODE_DIR = $NODE_DIR  ($("$NODE_BIN" -v))"
 echo ""
 
-sed -e "s|__REPO_DIR__|$REPO_DIR|g" \
-    -e "s|__NODE_DIR__|$NODE_DIR|g" \
-    "$TEMPLATE" > "$GERADO"
+renderiza > "$GERADO"
 
-if grep -q "__REPO_DIR__\|__NODE_DIR__" "$GERADO"; then
+if grep -q '{{' "$GERADO"; then
   echo "ERRO: placeholder nao resolvido em $GERADO" >&2
   exit 1
 fi
@@ -71,7 +128,7 @@ echo "bootstrap OK: $LABEL carregado em gui/$UID_NUM"
 
 echo ""
 echo "verificar:   launchctl print gui/$UID_NUM/$LABEL | head -20"
-echo "log do job:  tail -f $REPO_DIR/docs/fila/runs/launchd-agent.log"
-echo "log do loop: tail -f $REPO_DIR/docs/fila/runs/launchd.log"
-echo "pausar fila: ./scripts/orquestrador/orq-pause.sh \"motivo\""
+echo "log do job:  tail -f $CHECKOUT/docs/fila/runs/launchd-agent.log"
+echo "log do loop: tail -f $CHECKOUT/docs/fila/runs/launchd.log"
+echo "pausar fila: ./scripts/orq pausar \"motivo\""
 echo "desinstalar: launchctl bootout gui/$UID_NUM/$LABEL && rm -f \"$DST\""
diff --git a/test/orquestrador-launchd-config.test.ts b/test/orquestrador-launchd-config.test.ts
new file mode 100644
index 0000000..16684dd
--- /dev/null
+++ b/test/orquestrador-launchd-config.test.ts
@@ -0,0 +1,143 @@
+/**
+ * Peça K6c — plist e launchd sem nome de repo.
+ *
+ * O template chamava-se `com.conteudos.orquestrador.plist.template` e trazia o
+ * Label `com.conteudos.orquestrador` FIXO no corpo; o `instalar-launchd.sh`
+ * repetia a mesma string numa variável e montava o caminho do template a partir
+ * dela. Instalar o kit em qualquer outro repo carregaria um job com o label do
+ * conteudos-infinitos — para o launchd, dois repos com o mesmo label são o
+ * MESMO job, e o segundo bootstrap derruba o primeiro.
+ *
+ * O conserto tem duas metades, e a segunda é a que importa:
+ *   1. o template vira `com.orquestrador.plist.template`, com `{{LABEL}}`,
+ *      `{{CHECKOUT}}`, `{{NODE_DIR}}` e `{{START_INTERVAL}}`;
+ *   2. o instalador RECUSA quando `launchd.label` não está no config. Nunca
+ *      inventa um label — label inventado não é erro visível: é um SEGUNDO job
+ *      carregado ao lado do antigo, os dois disparando no mesmo checkout.
+ */
+import { describe, it, expect } from 'vitest';
+import { readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
+import { join } from 'node:path';
+import { spawnSync } from 'node:child_process';
+import { REPO_ROOT, checkoutReal } from './fixtures/orq-harness.js';
+
+const FX = checkoutReal();
+const INSTALADOR_FX = join(FX, 'scripts', 'orquestrador', 'instalar-launchd.sh');
+const CONFIG_FX = join(FX, 'docs', 'fila', '000-config.json');
+const TEMPLATE = join(REPO_ROOT, 'scripts', 'orquestrador', 'com.orquestrador.plist.template');
+
+/** Roda o instalador do FIXTURE. Só `--dry-run`: nada aqui toca o launchd real. */
+function dryRun(): { rc: number; saida: string } {
+  const r = spawnSync('bash', [INSTALADOR_FX, '--dry-run'], { encoding: 'utf8', cwd: FX });
+  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
+}
+
+/** Reescreve o config do fixture sem uma chave, roda, e devolve tudo ao lugar. */
+function semChave(caminho: string[], corpo: () => void): void {
+  const antes = readFileSync(CONFIG_FX, 'utf8');
+  try {
+    const cfg = JSON.parse(antes);
+    let no = cfg;
+    for (const k of caminho.slice(0, -1)) no = no[k];
+    delete no[caminho[caminho.length - 1]!];
+    writeFileSync(CONFIG_FX, JSON.stringify(cfg, null, 2));
+    corpo();
+  } finally {
+    writeFileSync(CONFIG_FX, antes);
+  }
+}
+
+describe('o template não carrega nome de repo nenhum', () => {
+  it('chama-se com.orquestrador.plist.template', () => {
+    expect(existsSync(TEMPLATE)).toBe(true);
+    const antigo = join(REPO_ROOT, 'scripts', 'orquestrador', 'com.conteudos.orquestrador.plist.template');
+    expect(existsSync(antigo), 'o template com nome de repo ainda existe').toBe(false);
+  });
+
+  it('o corpo do plist (fora dos comentários) não cita repo nenhum', () => {
+    const bruto = readFileSync(TEMPLATE, 'utf8');
+    // O comentário PODE citar o CI: é proveniência, e proveniência é a única
+    // coisa que não se apaga. O que não pode é o plist DEPENDER do nome.
+    const corpo = bruto.replace(/<!--[\s\S]*?-->/g, '');
+    expect(corpo).not.toMatch(/conteudos|comarka/i);
+  });
+
+  it('todos os valores que variam por máquina/repo são placeholders', () => {
+    const bruto = readFileSync(TEMPLATE, 'utf8');
+    for (const ph of ['{{LABEL}}', '{{CHECKOUT}}', '{{NODE_DIR}}', '{{START_INTERVAL}}']) {
+      expect(bruto, ph).toContain(ph);
+    }
+    // Os placeholders antigos saíram de vez: sobreviver um faria o instalador
+    // gerar plist com `__REPO_DIR__` literal e o launchd recusar o job.
+    expect(bruto).not.toContain('__REPO_DIR__');
+    expect(bruto).not.toContain('__NODE_DIR__');
+  });
+
+  it('nenhum .plist instanciado está versionado (só o .template)', () => {
+    const versionados = spawnSync('git', ['ls-files', 'scripts/orquestrador'], {
+      cwd: REPO_ROOT,
+      encoding: 'utf8',
+    }).stdout;
+    expect(versionados).toMatch(/com\.orquestrador\.plist\.template/);
+    expect(versionados.split('\n').filter((l) => /\.plist$/.test(l))).toEqual([]);
+  });
+});
+
+describe('instalar-launchd.sh --dry-run: o plist renderizado com o label do CONFIG', () => {
+  it('rc 0 e nenhum placeholder sobrando', () => {
+    const r = dryRun();
+    expect(r.rc, r.saida).toBe(0);
+    expect(r.saida).not.toContain('{{');
+  });
+
+  it('o Label é o launchd.label do config, não um nome inventado', () => {
+    const cfg = JSON.parse(readFileSync(CONFIG_FX, 'utf8'));
+    const label = cfg.launchd.label as string;
+    expect(label, 'o config do fixture precisa declarar launchd.label').toBeTruthy();
+    const r = dryRun();
+    expect(r.saida).toContain(`<string>${label}</string>`);
+    // O label do CI não pode vazar para dentro de outro repo: é assim que dois
+    // repos viram um job só. Fora dos comentários — o comentário do template
+    // CITA o label do CI de propósito, como proveniência e como exemplo.
+    const corpo = r.saida.replace(/<!--[\s\S]*?-->/g, '');
+    expect(corpo).not.toContain('com.conteudos.orquestrador');
+  });
+
+  it('o StartInterval é o launchd.start_interval do config', () => {
+    const cfg = JSON.parse(readFileSync(CONFIG_FX, 'utf8'));
+    const r = dryRun();
+    expect(r.saida).toContain(`<integer>${cfg.launchd.start_interval}</integer>`);
+  });
+
+  it('o checkout renderizado é o do fixture', () => {
+    const r = dryRun();
+    expect(r.saida).toContain(`${FX}/scripts/orquestrador/launchd-run.sh`);
+  });
+
+  it('não escreve o plist nem carrega job nenhum', () => {
+    const antes = readdirSync(join(FX, 'scripts', 'orquestrador')).filter((f) => /\.plist$/.test(f));
+    dryRun();
+    const depois = readdirSync(join(FX, 'scripts', 'orquestrador')).filter((f) => /\.plist$/.test(f));
+    expect(depois).toEqual(antes);
+    expect(depois).toEqual([]);
+  });
+});
+
+describe('sem launchd.label no config, o instalador RECUSA', () => {
+  it('rc 1 e a mensagem diz qual chave falta e o que o CI usa', () => {
+    semChave(['launchd', 'label'], () => {
+      const r = dryRun();
+      expect(r.rc).toBe(1);
+      expect(r.saida).toContain('launchd.label');
+      expect(r.saida).toContain('com.conteudos.orquestrador');
+    });
+  });
+
+  it('sem o objeto launchd inteiro, recusa igual (não inventa nada)', () => {
+    semChave(['launchd'], () => {
+      const r = dryRun();
+      expect(r.rc).toBe(1);
+      expect(r.saida).toContain('launchd.label');
+    });
+  });
+});
```

### `014f8a5` — 1d: o gate mudo por symlink, consertado no motor

```diff
1d: o gate mudo por symlink, consertado no motor

O guard de CLI comparava `import.meta.url` com
`pathToFileURL(resolve(process.argv[1])).href`. `resolve()` normaliza `..` e `.`
mas NÃO resolve symlink; o `import.meta.url` que o node entrega já vem
fisicamente resolvido. Um symlink no caminho de chamada (macOS: /tmp ->
/private/tmp) fazia o `if` dar falso: `main()` não rodava e o processo saía 0
com stdout VAZIO.

Gate que sai 0 sem imprimir nada é indistinguível de gate que aprovou. É o pior
modo de falha que um gate tem, e era o que estava no disco desde sempre.

Conserto: `realpathSync` dos dois lados, num `chamadoComoCli()` com try/catch —
`realpathSync` lança quando o caminho não existe, e argv[1] nem sempre é
arquivo (`node -e`, wrappers). Ali o certo é não disparar a CLI, nunca derrubar
quem importou o módulo.

Teste antes do conserto (test/orquestrador-gate-ticket.test.ts, três casos
novos; o primeiro só prova que o cenário é mesmo um symlink):

  × rc 1 e a linha de violação, chamado PELO symlink
    → o gate saiu MUDO: expected '' not to be ''
  × pelo symlink e pelo caminho real, a MESMA saída
    → expected +0 to be 1
  Tests  2 failed | 42 passed (44)

O `expect(stdout).not.toBe('')` vem ANTES do `expect(rc).toBe(1)` de propósito:
o sintoma desta peça é o silêncio, e é o silêncio que o teste tem de nomear.

CONTORNO REMOVIDO: `scripts/kit/fixture.sh` voltou a usar o caminho LÓGICO
(`mktemp -d` sem `pwd -P`). O fixture agora nasce em /tmp/orq-fixture-*/repo,
com symlink no meio — ou seja, o cenário do defeito passa a ser o cenário
PADRÃO de toda a suíte, e qualquer regressão desta família aparece em 27
arquivos de teste, não só nos três casos acima.

Medido depois do conserto, no caminho lógico, que é a mesma medição da etapa 2
ao contrário:

  $ cd /tmp/orq-fixture-uMvkQ1/repo && bash scripts/orq validar --relatorio 001
  GATE DE TICKET · 1 ticket(s) · fila /private/tmp/orq-fixture-uMvkQ1/repo/docs/fila
  001-soma-de-negativos.md  OK
  TOTAL: 0 violação(ões), 0 isenção(ões), em 1 ticket(s)

Na etapa 2, este mesmo comando saía rc 0 e mudo.

Suíte com o fixture em caminho lógico: 27 arquivos, 641 passam;
test-shell.sh rc 0 nos três; test-instalar.sh todos os checks.

O que o CI faz diferente: NADA hoje — ~/Projetos/conteudos-infinitos não tem
symlink no caminho, então lá o guard já casava e o gate já rodava. O conserto é
para o repo instalado sob caminho que TEM symlink, que até agora era um gate
silencioso esperando alguém.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016sgWDu1w9FNYPNpQYpeXVn



diff --git a/CHANGELOG.md b/CHANGELOG.md
index ca875a5..316e4a2 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -95,3 +95,9 @@ attempt registra como `ok`. Não derruba o run; faz a trilha mentir.
   "defina launchd.label no config; o CI usa com.conteudos.orquestrador". Não inventa label —
   label inventado não dá erro, dá um segundo job carregado ao lado do antigo. Chave nova
   documentada em `fixture/docs/fila/000-config.json` e `doutrina/templates/config.json`.
+- **1d** — CONSERTADO no motor: o guard de CLI do `gate-ticket.ts` compara os dois lados com
+  `realpathSync`. Antes, `resolve(argv[1])` não resolvia symlink e o `import.meta.url` vinha
+  fisicamente resolvido: chamado por caminho com symlink (macOS `/tmp` → `/private/tmp`), o
+  gate saía 0 com stdout VAZIO — indistinguível de gate que aprovou. Com o conserto, o
+  contorno do `scripts/kit/fixture.sh` (`pwd -P`) saiu, e o fixture voltou a nascer sob
+  caminho com symlink: é o que expõe qualquer regressão dessa família.
diff --git a/scripts/kit/fixture.sh b/scripts/kit/fixture.sh
index d53c665..c99530b 100644
--- a/scripts/kit/fixture.sh
+++ b/scripts/kit/fixture.sh
@@ -66,12 +66,17 @@ done
 [ -d "$KIT/node_modules" ] || die "o kit não tem node_modules — rode 'npm install' antes (o fixture o compartilha por symlink)"
 
 # --- 1. tmp + árvore ----------------------------------------------------------
-# `pwd -P` NÃO é higiene: no macOS /tmp é symlink de /private/tmp, e o guard de
-# CLI do gate-ticket.ts compara `import.meta.url` (que o node resolve fisicamente)
-# com `resolve(process.argv[1])`. Passar o caminho lógico faz a comparação falhar
-# e `orq validar` sair 0 sem imprimir nada — gate silencioso, que é pior que gate
-# quebrado. Medido: com /tmp/... o relatório vinha vazio; com /private/tmp/..., não.
-TMP="$(cd "$(mktemp -d "${PREFIXO}XXXXXX")" && pwd -P)"
+# CAMINHO LÓGICO, de propósito. Até a peça 1d isto era `pwd -P`, e não por
+# higiene: o guard de CLI do gate-ticket.ts comparava `import.meta.url` (que o
+# node entrega fisicamente resolvido) com `resolve(process.argv[1])`, que não
+# resolve symlink — e no macOS /tmp É symlink de /private/tmp. Sob caminho
+# lógico, `orq validar` saía 0 com stdout vazio: gate MUDO.
+#
+# A peça 1d consertou o motor (realpath dos dois lados) e o teste
+# `peça 1d · chamado por caminho com symlink, o gate RODA` cobre exatamente
+# este caso. O contorno saiu — e o fixture voltou a nascer sob um caminho com
+# symlink no meio, que é o que expõe qualquer regressão dessa família.
+TMP="$(mktemp -d "${PREFIXO}XXXXXX")"
 FX="$TMP/repo"
 mkdir -p "$FX" "$TMP/_worktrees"
 log "tmp: $TMP"
diff --git a/scripts/orquestrador/gate-ticket.ts b/scripts/orquestrador/gate-ticket.ts
index 975b97c..627f306 100644
--- a/scripts/orquestrador/gate-ticket.ts
+++ b/scripts/orquestrador/gate-ticket.ts
@@ -19,9 +19,9 @@
  *   - rc 1 se houve violação, 0 se não;
  *   - `--relatorio` imprime TUDO (inclusive o que passou) e sai 0.
  */
-import { readFileSync, readdirSync, existsSync } from 'node:fs'
+import { readFileSync, readdirSync, existsSync, realpathSync } from 'node:fs'
 import { basename, join, resolve } from 'node:path'
-import { pathToFileURL } from 'node:url'
+import { fileURLToPath } from 'node:url'
 
 // ─── Vocabulário do ticket ────────────────────────────────────────────────
 
@@ -546,6 +546,29 @@ function main(argv: string[]): number {
 
 // `import.meta.url` só bate com o argv quando o arquivo foi CHAMADO, não
 // importado: é o que deixa o teste importar as funções sem disparar a CLI.
-if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
+//
+// `realpathSync` DOS DOIS LADOS (peça 1d). A comparação antiga era
+// `import.meta.url === pathToFileURL(resolve(argv[1])).href`, e `resolve()`
+// normaliza `..` e `.` mas NÃO resolve symlink — enquanto o `import.meta.url`
+// que o node entrega já vem fisicamente resolvido. Bastava um symlink no
+// caminho de chamada (no macOS, `/tmp` -> `/private/tmp`) para o `if` dar falso:
+// `main()` não rodava e o processo saía 0 com stdout VAZIO. Gate que sai 0 sem
+// imprimir nada é indistinguível de gate que aprovou — o pior modo de falha que
+// um gate tem. Medido na etapa 2 com o fixture em /tmp/orq-fixture-*/repo.
+//
+// try/catch porque `realpathSync` LANÇA quando o caminho não existe, e argv[1]
+// nem sempre é um arquivo (`node -e`, `node --eval`, alguns wrappers). Ali o
+// certo é não disparar a CLI, nunca derrubar o processo de quem importou.
+function chamadoComoCli(): boolean {
+  const argv1 = process.argv[1]
+  if (!argv1) return false
+  try {
+    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(argv1))
+  } catch {
+    return false
+  }
+}
+
+if (chamadoComoCli()) {
   process.exit(main(process.argv.slice(2)))
 }
diff --git a/test/orquestrador-gate-ticket.test.ts b/test/orquestrador-gate-ticket.test.ts
index 15631d7..3f0fdc0 100644
--- a/test/orquestrador-gate-ticket.test.ts
+++ b/test/orquestrador-gate-ticket.test.ts
@@ -10,7 +10,15 @@
  * contra HEAD, rodar `guarda` contra HEAD, executar `recon[]`.
  */
 import { describe, it, expect } from 'vitest';
-import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
+import {
+  lstatSync,
+  mkdirSync,
+  mkdtempSync,
+  readFileSync,
+  realpathSync,
+  symlinkSync,
+  writeFileSync,
+} from 'node:fs';
 import { tmpdir } from 'node:os';
 import { join } from 'node:path';
 import { spawnSync } from 'node:child_process';
@@ -469,3 +477,68 @@ describe('a CLI é o contrato que `orq validar` repassa', () => {
     expect(r.err).toContain('não é ticket desta fila');
   });
 });
+
+// ─── Peça 1d · o gate não pode emudecer por symlink no caminho ────────────
+//
+// O guard de CLI comparava `import.meta.url` com `pathToFileURL(resolve(argv[1]))`.
+// `resolve()` normaliza mas NÃO resolve symlink, e o `import.meta.url` que o node
+// entrega vem fisicamente resolvido: chamado por um caminho com symlink no meio
+// (no macOS, `/tmp` -> `/private/tmp`), o `if` dava falso, `main()` nunca rodava
+// e o processo saía 0 com stdout VAZIO.
+//
+// Gate que sai 0 sem imprimir nada é INDISTINGUÍVEL de gate que aprovou. Medido
+// na etapa 2: com o fixture em `/tmp/orq-fixture-*/repo`, `orq validar
+// --relatorio 001` saía rc 0 e mudo; com `/private/tmp/...`, imprimia. O
+// contorno foi passar o caminho físico (`pwd -P` no scripts/kit/fixture.sh); o
+// buraco continuava esperando qualquer repo instalado sob caminho com symlink.
+
+describe('peça 1d · chamado por caminho com symlink, o gate RODA', () => {
+  /** Um symlink para o gate real, num tmp — o caminho lógico de chamada. */
+  function gatePorSymlink(): string {
+    const dir = mkdtempSync(join(tmpdir(), 'orq-link-'));
+    const link = join(dir, 'gate-ticket.ts');
+    symlinkSync(GATE, link);
+    return link;
+  }
+
+  /** Ticket INVÁLIDO: sem `objetivo`, que é campo obrigatório de pendente. */
+  function filaComTicketInvalido(): string {
+    const dir = criarFila([]);
+    const t = pendenteBom({ id: '901' });
+    delete (t as Record<string, unknown>).objetivo;
+    escreverTicket(dir, t);
+    return dir;
+  }
+
+  it('o caminho de teste é mesmo um symlink (senão o caso não prova nada)', () => {
+    const link = gatePorSymlink();
+    expect(lstatSync(link).isSymbolicLink()).toBe(true);
+    expect(realpathSync(link)).toBe(realpathSync(GATE));
+    expect(link).not.toBe(realpathSync(link));
+  });
+
+  it('rc 1 e a linha de violação, chamado PELO symlink', () => {
+    const dir = filaComTicketInvalido();
+    const r = spawnSync('npx', ['tsx', gatePorSymlink(), '--fila', dir, '--pendentes'], {
+      encoding: 'utf8',
+      cwd: REPO_ROOT,
+    });
+    // O NEGATIVO que faltava: rc 0 com stdout vazio é o modo de falha desta peça.
+    expect(`${r.stdout ?? ''}`.trim(), 'o gate saiu MUDO').not.toBe('');
+    expect(r.status).toBe(1);
+    expect(r.stdout).toMatch(/objetivo/);
+  });
+
+  it('pelo symlink e pelo caminho real, a MESMA saída', () => {
+    const dir = filaComTicketInvalido();
+    const rodar = (caminho: string) =>
+      spawnSync('npx', ['tsx', caminho, '--fila', dir, '--pendentes'], {
+        encoding: 'utf8',
+        cwd: REPO_ROOT,
+      });
+    const porLink = rodar(gatePorSymlink());
+    const porReal = rodar(GATE);
+    expect(porLink.status).toBe(porReal.status);
+    expect(porLink.stdout).toBe(porReal.stdout);
+  });
+});
```

### `2f93db4` — K7c: o e2e guarda a própria evidência

```diff
K7c: o e2e guarda a própria evidência

`preservar_evidencia` copia, ANTES de qualquer outra coisa depois da drenagem,
o que o run produziu dentro do fixture para docs/e2e/<AAAA-MM-DD-HHMM>-<id>/ no
kit: os `docs/fila/runs/<id>/attempt-*/` INTEIROS, o events.log e o custo.json.
Cada `*.log` vira `*.log.txt` — o .gitignore do kit barra `*.log` na linha 3, e
evidência que o git não versiona não é evidência preservada, é arquivo no disco
de alguém.

Renomear em vez de abrir `!docs/e2e/**` no .gitignore: a exceção valeria para
todo log futuro daquela árvore, inclusive o que ninguém revisou.

A cópia vem logo depois do `wait` do watchdog, antes das seções de relatório: se
uma delas morrer, o registro do run já está salvo.

O script ganhou modo source-safe (ORQ_E2E_SOURCED=1) e o destino saiu para
ORQ_E2E_DOCS, para o teste rodar sem gastar e sem escrever no docs/e2e de
verdade. Sem isso, a única forma de exercitar uma preservação de evidência seria
pagar uma drenagem — e um bloco de cópia não testado que falha em silêncio é
exatamente o defeito que esta peça existe para impedir.

Teste antes do conserto (test/kit-e2e-evidencia.test.ts contra o
fixture-e2e.sh de HEAD): 7 casos, 7 vermelhos — e o vermelho mostra o script
antigo executando o banner de custo ao ser carregado:

  × nomeia a pasta por carimbo e id do run, e imprime o caminho
    → expected 2 to be +0
  × copia o attempt INTEIRO, não só o gates.txt
    → ENOENT: no such file or directory, scandir '  ESTA CHAMADA É PAGA./001/attempt-1'
  × leva a trilha e o ledger
  × todo *.log vira *.log.txt — inclusive o de DENTRO do attempt
  × o que sai fica DE FATO versionável: o git não ignora nada ali
  × sem run nenhum, ainda salva trilha e ledger (e diz "sem-run")
  × carregar o script com ORQ_E2E_SOURCED=1 não dispara nada pago
  Tests  7 failed (7)

Depois: 7 passam. Suíte: 641 -> 648.

REGISTRO DA PERDA. A evidência bruta do run de 2026-09-08 11:54 não foi
preservada: o fixture morava em /tmp e foi removido. Os attempt-*/ daquele run
não existem mais e não voltam. Sobrou o custo.json; o events.log estava no
disco e FORA do git (`*.log`) e foi resgatado agora como events.log.txt. O
diretório passou a seguir a convenção nova (2026-09-08-fixture-001 ->
2026-09-08-1154-001) e ganhou um PROCEDENCIA.md dizendo o que há ali, o que não
há, e que a linha GATE daquela trilha carrega o defeito que a K6b consertou.

O e2e NÃO foi rodado nesta sessão: nenhuma chamada à API.

O que o CI faz diferente: NADA. `scripts/kit/**` não é vendorizado — o
`--atualizar` não o copia e o `--verificar` não o compara.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016sgWDu1w9FNYPNpQYpeXVn



diff --git a/CHANGELOG.md b/CHANGELOG.md
index 316e4a2..425210f 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -101,3 +101,18 @@ attempt registra como `ok`. Não derruba o run; faz a trilha mentir.
   gate saía 0 com stdout VAZIO — indistinguível de gate que aprovou. Com o conserto, o
   contorno do `scripts/kit/fixture.sh` (`pwd -P`) saiu, e o fixture voltou a nascer sob
   caminho com symlink: é o que expõe qualquer regressão dessa família.
+- **K7c** — `scripts/kit/fixture-e2e.sh` preserva a evidência ANTES de qualquer outra coisa:
+  `preservar_evidencia` copia `docs/fila/runs/<id>/attempt-*/` inteiro, `events.log` e
+  `custo.json` para `docs/e2e/<AAAA-MM-DD-HHMM>-<id>/` no kit, renomeando `*.log` para
+  `*.log.txt` (o `.gitignore` do kit barra `*.log`), e imprime o caminho. O `.gitignore` não
+  muda: abrir exceção para `docs/e2e/**` valeria para todo log futuro, inclusive o que
+  ninguém revisou. O script ganhou modo `ORQ_E2E_SOURCED=1` para o teste
+  (`test/kit-e2e-evidencia.test.ts`) exercitar a preservação sem gastar nada.
+- **A evidência bruta do run de 2026-09-08 11:54 NÃO foi preservada.** O fixture morava em
+  `/tmp` e foi removido: os `attempt-*/` daquele run — `gates.txt`, `criterios.txt`,
+  `enforcement.json`, `meta.json`, prompt, diff, veredito cru do juiz — não existem mais e não
+  voltam. Sobrou o `custo.json`; o `events.log` estava no disco mas fora do git (`*.log`), e
+  foi resgatado agora como `events.log.txt`. O resto daquele attempt só sobrevive no que foi
+  copiado à mão para a mensagem do commit `8525c49` e para `docs/PECAS.md`. É essa perda que
+  a peça K7c existe para não repetir; a procedência está em
+  `docs/e2e/2026-09-08-1154-001/PROCEDENCIA.md`.
diff --git a/docs/e2e/2026-09-08-1154-001/PROCEDENCIA.md b/docs/e2e/2026-09-08-1154-001/PROCEDENCIA.md
new file mode 100644
index 0000000..290e83d
--- /dev/null
+++ b/docs/e2e/2026-09-08-1154-001/PROCEDENCIA.md
@@ -0,0 +1,29 @@
+# Run e2e de 2026-09-08 11:54 · ticket 001 · kit 2.1.0-dev
+
+Primeira travessia PAGA do loop pelo repo de fixture (peça K7-e2e, commit
+`8525c49`), com OK humano explícito.
+
+## O que está aqui
+
+- `events.log.txt` — a trilha do run. Estava no disco desde 08/09 e **não estava
+  versionada**: o `.gitignore` do kit barra `*.log` (linha 3). Renomeada para
+  `.log.txt` na peça K7c, que é a convenção que o `scripts/kit/fixture-e2e.sh`
+  passou a aplicar sozinho.
+- `custo.json` — o ledger. Era o único arquivo deste run que o git guardava.
+
+## O que NÃO está aqui, e não volta
+
+Os `attempt-*/` do run — `gates.txt`, `criterios.txt`, `enforcement.json`,
+`meta.json`, o prompt do executor, o diff e o veredito cru do juiz. O fixture
+morava em `/tmp` e foi removido; a peça K7c (preservar a evidência ANTES de
+qualquer limpeza) só existe por causa desta perda.
+
+O que sobrevive daquele attempt é o que alguém copiou à mão para a mensagem do
+commit `8525c49` e para `docs/PECAS.md` (K7-e2e): `ok typecheck` / `ok test` /
+`VEREDITO: APROVADO`, `enforcement=ok`, `criterios=4/4`, merge `5d7c32d` na
+`staging-auto`, uma tentativa, zero retry, US$ 0,369 contra `usd_ticket` 1.
+
+A linha `GATE` daquela trilha diz
+`typecheck=nao-rodou testes=nao-rodou build=nao-rodou` sobre gates que o
+`gates.txt` do mesmo attempt registrava como `ok`. Não é erro de transcrição: é
+o defeito que a peça K6b consertou, preservado aqui como estava.
diff --git a/docs/e2e/2026-09-08-fixture-001/custo.json b/docs/e2e/2026-09-08-1154-001/custo.json
similarity index 100%
rename from docs/e2e/2026-09-08-fixture-001/custo.json
rename to docs/e2e/2026-09-08-1154-001/custo.json
diff --git a/docs/e2e/2026-09-08-1154-001/events.log.txt b/docs/e2e/2026-09-08-1154-001/events.log.txt
new file mode 100644
index 0000000..99879ca
--- /dev/null
+++ b/docs/e2e/2026-09-08-1154-001/events.log.txt
@@ -0,0 +1,7 @@
+2026-09-08T11:54:02-0300 --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
+2026-09-08T11:54:09-0300 001 INICIO attempt=1 model=sonnet
+2026-09-08T11:54:45-0300 001 GATE typecheck=nao-rodou testes=nao-rodou enforcement=ok criterios=4/4 build=nao-rodou
+2026-09-08T11:54:52-0300 001 JUIZ veredito=aprovado classe=baixo modelo=sonnet attempt=1
+2026-09-08T11:54:53-0300 001 APROVADO merge=aguardando dur=32s attempt=1
+2026-09-08T11:54:53-0300 001 MERGE alvo=staging-auto sha=5d7c32d
+2026-09-08T11:54:53-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 dur=1min
diff --git a/scripts/kit/fixture-e2e.sh b/scripts/kit/fixture-e2e.sh
index 34592b0..30048c4 100644
--- a/scripts/kit/fixture-e2e.sh
+++ b/scripts/kit/fixture-e2e.sh
@@ -17,6 +17,13 @@
 # git@example.invalid:..., reservado pela RFC 2606. Se o loop tentasse publicar,
 # falharia alto — e isso também seria resultado.
 #
+# A EVIDÊNCIA É COPIADA PARA O KIT antes de qualquer outra coisa (peça K7c). O
+# fixture mora num tmp: `--limpar`, um reboot ou uma faxina do sistema levam
+# junto os attempt-*/ , o events.log e o custo.json — que são o único registro do
+# que o loop fez. Foi o que aconteceu com o run de 2026-09-08 11:54: sobrou o
+# custo.json, e a trilha do run só existe hoje porque alguém a colou na mensagem
+# do commit 8525c49.
+#
 # Uso: ORQ_E2E_OK=1 bash scripts/kit/fixture-e2e.sh
 
 set -uo pipefail
@@ -24,6 +31,61 @@ set -uo pipefail
 KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
 CFG_TEMPLATE="$KIT/fixture/docs/fila/000-config.json"
 
+# Destino da evidência. Variável para o teste poder apontá-lo para um tmp — o
+# teste desta peça não pode escrever no docs/e2e/ de verdade.
+E2E_DOCS="${ORQ_E2E_DOCS:-$KIT/docs/e2e}"
+
+# preservar_evidencia <fixture> [carimbo]
+#
+# Copia, do fixture para <E2E_DOCS>/<AAAA-MM-DD-HHMM>-<id>/:
+#   docs/fila/runs/<id>/attempt-*/   INTEIRO (gates.txt, criterios.txt,
+#                                    enforcement.json, meta.json, prompts, diff)
+#   docs/fila/runs/events.log        a trilha
+#   docs/fila/runs/custo.json        o ledger
+#
+# `*.log` -> `*.log.txt` porque o .gitignore do kit barra `*.log` (linha 3), e
+# evidência que o git não versiona não é evidência preservada — é arquivo no
+# disco de alguém. Renomear é preferível a abrir exceção no .gitignore: a
+# exceção valeria para todo `docs/e2e/**` futuro, inclusive para log que
+# ninguém revisou.
+#
+# Imprime, na última linha do stdout, o caminho do diretório criado.
+preservar_evidencia() {
+  local fx="$1" carimbo="${2:-$(date '+%Y-%m-%d-%H%M')}"
+  local runs="$fx/docs/fila/runs" id dest rd
+
+  # O id do run sai do DISCO, não de um argumento: o e2e roda uma drenagem, mas
+  # nada garante que ela processe um ticket só, e inventar o id aqui seria
+  # nomear a pasta com uma suposição.
+  id=''
+  for rd in "$runs"/[0-9]*/; do
+    [ -d "$rd" ] || continue
+    rd="${rd%/}"; id="${id:+$id-}$(basename "$rd")"
+  done
+  dest="$E2E_DOCS/$carimbo-${id:-sem-run}"
+  mkdir -p "$dest"
+
+  for rd in "$runs"/[0-9]*/; do
+    [ -d "$rd" ] || continue
+    rd="${rd%/}"
+    mkdir -p "$dest/$(basename "$rd")"
+    cp -R "$rd/." "$dest/$(basename "$rd")/" 2>/dev/null || true
+  done
+  [ -f "$runs/events.log" ]  && cp "$runs/events.log"  "$dest/events.log"
+  [ -f "$runs/custo.json" ]  && cp "$runs/custo.json"  "$dest/custo.json"
+
+  # `find -exec mv` e não um glob: os .log moram em profundidades diferentes
+  # (runs/ e attempt-*/), e glob não recursivo deixaria os de dentro para trás —
+  # que é justamente onde está o log do agente.
+  find "$dest" -type f -name '*.log' -exec sh -c 'mv "$1" "$1.txt"' _ {} \; 2>/dev/null || true
+
+  printf 'evidência preservada em: %s\n' "$dest" >&2
+  printf '%s\n' "$dest"
+}
+
+# Source-safe: com ORQ_E2E_SOURCED=1 só define funções e NÃO gasta nada.
+[ "${ORQ_E2E_SOURCED:-0}" = 1 ] && return 0
+
 printf '== o que esta execução vai fazer ==\n'
 printf '  comando        bash <fixture>/scripts/orquestrador/local-loop.sh (UMA drenagem)\n'
 printf '  ticket         001 soma-de-negativos (docs/fila/001-soma-de-negativos.md)\n'
@@ -68,6 +130,10 @@ kill "$WPID" 2>/dev/null || true; wait "$WPID" 2>/dev/null || true
 case "$RC" in 143|137) RC=124 ;; esac
 printf 'local-loop rc=%s  (%ss)\n\n' "$RC" "$(( $(date +%s) - t0 ))"
 
+# ANTES de qualquer outra coisa: a evidência sai do tmp e entra no kit. Se uma
+# das seções de relatório abaixo morrer, o registro do run já está salvo.
+EVIDENCIA="$(preservar_evidencia "$FX")"
+
 secao() { printf '\n===== %s =====\n' "$*"; }
 
 secao 'bash scripts/orq'
@@ -94,4 +160,5 @@ git -C "$FX" remote -v
 
 printf '\nfixture preservado em: %s\n' "$FX"
 printf 'para remover:  bash scripts/kit/fixture.sh --limpar %s\n' "$FX"
+printf 'EVIDÊNCIA (no kit, versionável): %s\n' "$EVIDENCIA"
 exit "$RC"
diff --git a/test/kit-e2e-evidencia.test.ts b/test/kit-e2e-evidencia.test.ts
new file mode 100644
index 0000000..4b47603
--- /dev/null
+++ b/test/kit-e2e-evidencia.test.ts
@@ -0,0 +1,115 @@
+/**
+ * Peça K7c — o e2e guarda a própria evidência.
+ *
+ * `scripts/kit/fixture-e2e.sh` roda a drenagem dentro de um fixture que mora num
+ * tmp. `--limpar`, um reboot ou a faxina do sistema levam junto os `attempt-*` ,
+ * o `events.log` e o `custo.json` — o único registro do que o loop fez. Foi o
+ * que aconteceu com o run de 2026-09-08 11:54: sobrou o `custo.json`, e a trilha
+ * só existe hoje porque alguém a colou na mensagem do commit `8525c49`.
+ *
+ * Este arquivo NÃO roda o e2e (ele chama a API e custa dinheiro). Ele carrega o
+ * script com `ORQ_E2E_SOURCED=1`, monta à mão a árvore que uma drenagem deixa, e
+ * cobra da função de preservação o que ela promete. É a única forma de provar
+ * uma preservação de evidência sem gastar: um bloco de cópia não testado que
+ * falha em silêncio é exatamente o defeito que esta peça existe para impedir.
+ */
+import { describe, it, expect } from 'vitest';
+import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
+import { tmpdir } from 'node:os';
+import { join } from 'node:path';
+import { spawnSync } from 'node:child_process';
+import { escrever, REPO_ROOT } from './fixtures/orq-harness.js';
+
+const E2E = join(REPO_ROOT, 'scripts', 'kit', 'fixture-e2e.sh');
+
+/** A árvore que UMA drenagem deixa em docs/fila/runs, reduzida ao essencial. */
+function fixtureComRun(): string {
+  const fx = mkdtempSync(join(tmpdir(), 'orq-e2e-fx-'));
+  const runs = join(fx, 'docs', 'fila', 'runs');
+  escrever(join(runs, 'events.log'), '2026-09-08T11:54:02-0300 --- DRENAGEM_INICIO alvo=staging-auto\n');
+  escrever(join(runs, 'custo.json'), '{"dias":{"2026-09-08":{"usd":0.369}}}\n');
+  escrever(join(runs, 'local-loop.log'), 'log do loop\n');
+  escrever(join(runs, '001', 'attempt-1', 'gates.txt'), 'ok   typecheck  345ms\nVEREDITO: APROVADO\n');
+  escrever(join(runs, '001', 'attempt-1', 'meta.json'), '{"attempt":1}');
+  escrever(join(runs, '001', 'attempt-1', 'agente.log'), 'stdout cru do agente\n');
+  return fx;
+}
+
+/** Roda `preservar_evidencia` com o destino apontado para um tmp. */
+function preservar(fx: string, destBase: string, carimbo = '2026-09-08-1154') {
+  const r = spawnSync(
+    'bash',
+    ['-c', `source "${E2E}"\npreservar_evidencia "${fx}" "${carimbo}"`],
+    { encoding: 'utf8', env: { ...process.env, ORQ_E2E_SOURCED: '1', ORQ_E2E_DOCS: destBase } },
+  );
+  const linhas = (r.stdout ?? '').trim().split('\n');
+  return { rc: r.status ?? 1, dest: linhas[linhas.length - 1] ?? '', saida: `${r.stdout}${r.stderr}` };
+}
+
+describe('preservar_evidencia tira do tmp o que o run produziu', () => {
+  it('nomeia a pasta por carimbo e id do run, e imprime o caminho', () => {
+    const destBase = mkdtempSync(join(tmpdir(), 'orq-e2e-docs-'));
+    const r = preservar(fixtureComRun(), destBase);
+    expect(r.rc).toBe(0);
+    expect(r.dest).toBe(join(destBase, '2026-09-08-1154-001'));
+    expect(existsSync(r.dest)).toBe(true);
+  });
+
+  it('copia o attempt INTEIRO, não só o gates.txt', () => {
+    const destBase = mkdtempSync(join(tmpdir(), 'orq-e2e-docs-'));
+    const { dest } = preservar(fixtureComRun(), destBase);
+    const attempt = join(dest, '001', 'attempt-1');
+    expect(readdirSync(attempt).sort()).toEqual(['agente.log.txt', 'gates.txt', 'meta.json']);
+    expect(readFileSync(join(attempt, 'gates.txt'), 'utf8')).toContain('VEREDITO: APROVADO');
+  });
+
+  it('leva a trilha e o ledger', () => {
+    const destBase = mkdtempSync(join(tmpdir(), 'orq-e2e-docs-'));
+    const { dest } = preservar(fixtureComRun(), destBase);
+    expect(readFileSync(join(dest, 'events.log.txt'), 'utf8')).toContain('DRENAGEM_INICIO');
+    expect(readFileSync(join(dest, 'custo.json'), 'utf8')).toContain('0.369');
+  });
+
+  it('todo *.log vira *.log.txt — inclusive o de DENTRO do attempt', () => {
+    const destBase = mkdtempSync(join(tmpdir(), 'orq-e2e-docs-'));
+    const { dest } = preservar(fixtureComRun(), destBase);
+    const r = spawnSync('find', [dest, '-type', 'f', '-name', '*.log'], { encoding: 'utf8' });
+    expect(r.stdout.trim(), 'sobrou .log — o .gitignore do kit o barra').toBe('');
+    expect(existsSync(join(dest, '001', 'attempt-1', 'agente.log.txt'))).toBe(true);
+  });
+
+  it('o que sai fica DE FATO versionável: o git não ignora nada ali', () => {
+    // O motivo do renome inteiro está aqui. `.gitignore:3` é `*.log`.
+    const destBase = mkdtempSync(join(tmpdir(), 'orq-e2e-docs-'));
+    const { dest } = preservar(fixtureComRun(), destBase);
+    const arquivos = spawnSync('find', [dest, '-type', 'f'], { encoding: 'utf8' })
+      .stdout.trim()
+      .split('\n')
+      .map((f) => f.replace(`${dest}/`, ''));
+    // Simula a regra do kit contra cada nome, sem depender de onde o tmp está.
+    expect(arquivos.filter((f) => f.endsWith('.log'))).toEqual([]);
+    expect(arquivos.length).toBeGreaterThanOrEqual(5);
+  });
+
+  it('sem run nenhum, ainda salva trilha e ledger (e diz "sem-run")', () => {
+    const fx = mkdtempSync(join(tmpdir(), 'orq-e2e-fx-'));
+    escrever(join(fx, 'docs', 'fila', 'runs', 'events.log'), 'trilha sem run\n');
+    escrever(join(fx, 'docs', 'fila', 'runs', 'custo.json'), '{"dias":{}}\n');
+    const destBase = mkdtempSync(join(tmpdir(), 'orq-e2e-docs-'));
+    const { dest } = preservar(fx, destBase);
+    expect(dest).toBe(join(destBase, '2026-09-08-1154-sem-run'));
+    expect(readFileSync(join(dest, 'events.log.txt'), 'utf8')).toContain('trilha sem run');
+  });
+
+  it('carregar o script com ORQ_E2E_SOURCED=1 não dispara nada pago', () => {
+    const r = spawnSync('bash', ['-c', `source "${E2E}"; echo CARREGADO`], {
+      encoding: 'utf8',
+      env: { ...process.env, ORQ_E2E_SOURCED: '1' },
+    });
+    expect(r.stdout).toContain('CARREGADO');
+    // A recusa por falta de ORQ_E2E_OK, o banner de custo e a drenagem ficam
+    // depois do `return` do modo sourced: nenhum deles pode aparecer.
+    expect(r.stdout).not.toContain('ESTA CHAMADA É PAGA');
+    expect(`${r.stdout}${r.stderr}`).not.toContain('recusado');
+  });
+});
```

### `d72cdcd` — docs: PECAS e CHANGELOG da etapa 3

```diff
docs: PECAS e CHANGELOG da etapa 3

K5b, K8a, K6a, K6b, K6c, 1d e K7c saem de PENDENTES e entram em FEITAS, cada uma
com o sha, a evidência no disco e o vermelho-antes do teste que a prova.

Três peças NOVAS, todas achados desta etapa e nenhuma inventada:

- K6d — o que sobrou do antigo "K6 · pureza": o `scripts/kit/pureza.sh` que
  TRANCA a pureza. As três premissas que a peça nomeava saíram; falta o script
  que impede a próxima de entrar. A premissa que ficou no disco, com comentário
  no lugar, é o loop de `.env.local` do executor.sh.
- K8b — o que sobrou do antigo "K8": `--novo` e as migrações de artefato legado.
- K8c — a recusa por árvore suja do `--atualizar` não olha `scripts/roadmap/`,
  que ele passou a sobrescrever em K5b. Um lint-mapa.py não commitado no repo é
  apagado em silêncio.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016sgWDu1w9FNYPNpQYpeXVn



diff --git a/CHANGELOG.md b/CHANGELOG.md
index 425210f..c4a1d69 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -116,3 +116,10 @@ attempt registra como `ok`. Não derruba o run; faz a trilha mentir.
   copiado à mão para a mensagem do commit `8525c49` e para `docs/PECAS.md`. É essa perda que
   a peça K7c existe para não repetir; a procedência está em
   `docs/e2e/2026-09-08-1154-001/PROCEDENCIA.md`.
+
+Passos humanos que faltam para o CI receber este motor (não são desta sessão):
+`launchd.label: com.conteudos.orquestrador` no `000-config.json` do CI; `orq pausar`;
+`--atualizar --dry-run`, `--atualizar`, `npx vitest run` no CI, `--verificar` idêntico; apagar
+lá o `scripts/orquestrador/com.conteudos.orquestrador.plist.template` (o `--atualizar` não
+apaga nada, então o template velho fica ao lado do novo); commit por pathspec; `orq retomar`;
+push. Ver `~/orq-sessoes/relatorio-kit-etapa3.md`.
diff --git a/docs/PECAS.md b/docs/PECAS.md
index e322e7f..a4ca9e5 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -101,51 +101,122 @@
   aceite do ticket verdes, `enforcement ok`, `gates.txt` com `ok typecheck` / `ok test` /
   `VEREDITO: APROVADO`.
 
+- **K5b · `--verificar` cobre `scripts/roadmap/`.** `instalar.sh` compara também
+  `scripts/roadmap/` — motor vendorizado, porque `orq mapa lint` roda
+  `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT.
+  *Evidência:* `3a76edb`; `scripts/orq:226`, no disco. Antes disto um `lint-mapa.py`
+  desatualizado no repo passava por "idêntico ao kit".
+  *Teste:* caso (d) de `scripts/kit/test-instalar.sh` — cópia do fixture com um byte a mais
+  em `lint-mapa.py`: `diferente scripts/roadmap/lint-mapa.py`, rc 1, exatamente 1 diferença.
+  Antes do conserto: `idêntico ao kit 2.1.0-dev`, rc 0.
+
+- **K8a · `instalar.sh --atualizar <repo> [--dry-run] [--forcar]`.** Copia o motor do kit por
+  cima do de `<repo>` (`scripts/orquestrador/` sem plist instanciado, `scripts/orq`,
+  `scripts/roadmap/`, `doutrina/` → `docs/orquestrador/skill/`) e carimba o `VERSAO`. `cp`, e
+  nunca `rsync --delete`: o que só existe no repo sobrevive e reaparece como `só no repo` no
+  `--verificar` que ele imprime no fim, junto da linha de commit por pathspec. Não toca
+  `docs/fila/**`. Três recusas com rc 1 — loop não pausado, `STATUS.md` que não diz `ocioso`,
+  motor do repo com modificação não commitada —, e só a terceira cede a `--forcar`.
+  *Evidência:* `fb8de45`; o bloco de vendorização do `scripts/kit/fixture.sh`, que já era o
+  mapa origem→destino do `ORIGEM.md` executado.
+  *Teste:* casos (e) e (f) de `scripts/kit/test-instalar.sh`. Antes: `ainda não: peça K8`, rc 2.
+
+- **K6a · monorepo por detecção, não por nome.** `pacotes_do_checkout` (`executor.sh`) lista
+  todo diretório do checkout principal com `node_modules` próprio — a raiz incluída, os
+  aninhados de dependência fora — e é essa lista que `limpa_cache_vite` e o novo
+  `linkar_node_modules` percorrem, no lugar do `for d in "" apps/web services/*/`.
+  `LC_ALL=C sort` reproduz a ordem antiga item a item.
+  *Evidência:* `d613b07`. Contra `~/Projetos/conteudos-infinitos` (só leitura) as duas listas
+  saem linha a linha idênticas — os 9 pacotes, na mesma ordem.
+  *Teste:* `test/orquestrador-pacotes.test.ts`, 6 casos (6 vermelhos antes), com a árvore do
+  CI simulada e um `packages/ui` que a lista fixa não cobria.
+
+- **K6b · linha `GATE` honesta para qualquer nome de gate.** Cada gate do config tem um PAPEL
+  (`typecheck` | `testes` | `build` | `lint`), declarado por `"papel"` ou inferido do nome;
+  `papel_marca` combina todos os gates daquele papel. `nao-configurado` entra no vocabulário
+  (o repo não tem gate com esse papel) e `nao-rodou` volta a significar só "há gate
+  configurado e ele não rodou". `lint=` é campo condicional. `typecheck_marca` saiu.
+  *Evidência:* `b8c303d`; a trilha do e2e de 08/09 dizendo `typecheck=nao-rodou
+  testes=nao-rodou build=nao-rodou` sobre gates que o `gates.txt` do mesmo attempt registra
+  como `ok` (preservada em `docs/e2e/2026-09-08-1154-001/events.log.txt`).
+  *Teste:* `test/orquestrador-trilha-gate-papel.test.ts`, 9 casos — 5 vermelhos antes, e os 4
+  verdes são justamente os do config do CI. Com `_referencia-ci/000-config.ci.json` e
+  `test/fixtures/runs-201/attempt-2.gates.txt` a linha sai
+  `901 GATE typecheck=ok testes=falha enforcement=ok criterios=3/3 build=nao-rodou`, que é
+  caractere a caractere a de antes. Os testes de trilha que já existiam ficaram verdes sem
+  edição.
+
+- **K6c · plist e launchd sem nome de repo.** `com.conteudos.orquestrador.plist.template` →
+  `com.orquestrador.plist.template`, com `{{LABEL}}`, `{{CHECKOUT}}`, `{{NODE_DIR}}` e
+  `{{START_INTERVAL}}`. `instalar-launchd.sh` lê `launchd.label` e `launchd.start_interval` do
+  `000-config.json`, ganha `--dry-run`, e RECUSA (rc 1) sem `launchd.label`: "defina
+  launchd.label no config; o CI usa com.conteudos.orquestrador". Nunca inventa label — label
+  inventado não dá erro, dá um segundo job carregado ao lado do antigo.
+  *Evidência:* `45e62d5`. A chave `launchd` entrou em `fixture/docs/fila/000-config.json` e em
+  `doutrina/templates/config.json`, com o comentário `_launchd`.
+  *Teste:* `test/orquestrador-launchd-config.test.ts`, 11 casos (10 vermelhos antes).
+
+- **1d · gate mudo por symlink, CONSERTADO.** O guard de CLI do `gate-ticket.ts` compara os
+  dois lados com `realpathSync`, num `chamadoComoCli()` com try/catch. Antes, `resolve(argv[1])`
+  não resolvia symlink e o `import.meta.url` vinha fisicamente resolvido: sob caminho com
+  symlink o gate saía 0 com stdout VAZIO — indistinguível de gate que aprovou.
+  *Evidência:* `014f8a5`. Com o conserto, o contorno do `scripts/kit/fixture.sh` (`pwd -P`)
+  saiu: o fixture voltou a nascer em `/tmp/orq-fixture-*`, com symlink no meio, então o
+  cenário do defeito virou o cenário PADRÃO da suíte inteira.
+  *Teste:* três casos em `test/orquestrador-gate-ticket.test.ts` (dois vermelhos antes, o
+  primeiro deles dizendo `o gate saiu MUDO: expected '' not to be ''`). Medido depois:
+  `bash scripts/orq validar --relatorio 001` de `/tmp/orq-fixture-*/repo` imprime o relatório
+  e sai 0; na etapa 2 saía 0 e mudo.
+
+- **K7c · o e2e guarda a própria evidência.** `preservar_evidencia`
+  (`scripts/kit/fixture-e2e.sh`) copia `docs/fila/runs/<id>/attempt-*/` inteiro, `events.log`
+  e `custo.json` para `docs/e2e/<AAAA-MM-DD-HHMM>-<id>/` no kit, renomeando `*.log` para
+  `*.log.txt`, e imprime o caminho. Roda logo depois do watchdog, antes das seções de
+  relatório. O script ganhou modo `ORQ_E2E_SOURCED=1` e destino por `ORQ_E2E_DOCS`.
+  *Evidência:* `2f93db4`; a perda do run de 08/09 11:54, registrada em
+  `docs/e2e/2026-09-08-1154-001/PROCEDENCIA.md` — os `attempt-*/` daquele run não existem
+  mais e não voltam.
+  *Teste:* `test/kit-e2e-evidencia.test.ts`, 7 casos (7 vermelhos antes), sem gastar nada.
+  O e2e NÃO foi rodado nesta sessão.
+
+
 ## PENDENTES
 
-- **K5b · o `--verificar` não cobre `scripts/roadmap/`.** ACHADO da etapa 2: `orq mapa lint` roda
-  `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT (`scripts/orq:226`), então
-  `scripts/roadmap/` É motor vendorizado — o `fixture.sh` já o copia. O escopo do `--verificar`,
-  como esta peça o descreve e como K5 o entregou, são só três caminhos: um `lint-mapa.py`
-  desatualizado no repo passa por "idêntico". Não foi ampliado em K5 por decisão (o escopo estava
-  escrito; alargá-lo em silêncio é pior que a lacuna).
-  *Evidência:* `scripts/orq:226`; `scripts/kit/fixture.sh`, bloco "o motor, vendorizado".
-  *Teste:* copiar o fixture, mexer num byte de `scripts/roadmap/lint-mapa.py` e exigir
-  `diferente scripts/roadmap/lint-mapa.py` com rc 1.
-
-- **K6 · pureza.** `scripts/kit/pureza.sh`: grep em CÓDIGO (não em comentário) de
-  `scripts/orquestrador/**` e `scripts/orq` por premissa de repo. As duas reais hoje:
-  (a) diretórios do monorepo fixos no `executor.sh` (`apps/web`, `services/*/`, linhas 219, 240 e
-  247) → viram `toolchain.pacotes` no config, ou leitura dos `workspaces` do `package.json`;
-  (b) nome e label do plist template (`scripts/orquestrador/com.conteudos.orquestrador.plist.template`)
-  → `com.orquestrador.plist.template` com `{{LABEL}}`, e `instalar-launchd.sh` deriva o label do
-  config;
-  (c) ACHADO da etapa 2, **medido no e2e**: `event_gate` (`executor.sh:428-442`) monta a linha
-  `GATE` da trilha procurando gates por NOME FIXO do monorepo do CI — `typecheck_marca` casa
-  `typecheck_root`/`typecheck_web` (`executor.sh:415-424`), e as outras duas marcas casam
-  `testes_por_pacote` e `build`. Num repo cujos gates se chamem `typecheck` e `test` (o fixture),
-  a drenagem de 2026-09-08 gravou na trilha
-  `001 GATE typecheck=nao-rodou testes=nao-rodou enforcement=ok criterios=4/4 build=nao-rodou`
-  enquanto o `gates.txt` do mesmo attempt dizia `ok typecheck` / `ok test` /
-  `VEREDITO: APROVADO`. **A trilha afirmou "não rodou" sobre gates que rodaram e aprovaram.**
-  Não derruba o run (o desfecho sai do `gates.txt`, não da linha de evento), mas a trilha é o
-  ground truth de "o que aconteceu" — e aqui ela mente por premissa de repo. Os nomes dos gates
-  têm de sair do config, como o resto.
-  *Teste desta parte:* um repo de fixture com gates de nome próprio, e a linha `GATE` da trilha
-  refletindo o `gates.txt` — nenhum `nao-rodou` para gate que consta como `ok`.
-  *Evidência:* inventário §8 item 5; as linhas citadas, no disco.
-  *Teste:* pureza = 0 em código; comentário de proveniência pode ficar.
-
-- **K8 · `instalar.sh --novo | --atualizar`, com `--dry-run` e relatório.** O `--novo` nasce do
-  bloco de vendorização do `scripts/kit/fixture.sh` (K7a), que já é o mapa origem→destino do
-  `ORIGEM.md` executado: `scripts/orquestrador/` (menos o plist instanciado), `scripts/orq`,
-  `scripts/roadmap/`, `doutrina/` → `docs/orquestrador/skill/`, mais o carimbo `VERSAO`. Migra
-  `liberacoes.json` (duas listas do Comarka → objetos, `em` → `liberado_em`, prefixo `humano:`),
-  pause file (`.orq-pause` → `PAUSAR`), config (mapa de chaves legadas → schema 2 limpo) e o bloco
-  JSON dos tickets pendentes (prosa intacta). Nunca reescreve objetivo de ticket.
+- **K6d · `scripts/kit/pureza.sh`.** O grep que TRANCA a pureza: em CÓDIGO (não em
+  comentário) de `scripts/orquestrador/**` e `scripts/orq`, zero premissa de repo. As três
+  premissas que a etapa 3 nomeou saíram (K6a, K6b, K6c) — falta o script que impede a próxima
+  de entrar. Comentário de proveniência pode ficar.
+  *Evidência:* inventário §8 item 5. A premissa que ficou no disco, com comentário no lugar:
+  `executor.sh`, o loop de `.env.local` (`for d in "" apps/web`) — generalizá-lo para os
+  pacotes detectados passaria a linkar `.env.local` em pacote que hoje não recebe link,
+  mudança de comportamento que K6a não pediu. Nenhuma outra apareceu por grep até aqui, e é
+  justamente o script que transforma "não achei" em "não há".
+  *Teste:* pureza = 0 em código, com o caso NEGATIVO de que um `apps/web` reintroduzido em
+  código faz o script sair 1.
+
+- **K8b · `instalar.sh --novo` e as migrações.** O `--novo` nasce do mesmo bloco de
+  vendorização do `scripts/kit/fixture.sh` que o `--atualizar` (K8a) já usa, mais os dois
+  artefatos que a doutrina manda vir do template (`doutrina/templates/TICKET.md` →
+  `docs/fila/_TEMPLATE.md`, `PLAYBOOK-seed.md` → `docs/orquestrador/PLAYBOOK.md`). E as
+  migrações, que o `--atualizar` deliberadamente NÃO faz: `liberacoes.json` (duas listas do
+  Comarka → objetos, `em` → `liberado_em`, prefixo `humano:`), pause file (`.orq-pause` →
+  `PAUSAR`), config (mapa de chaves legadas → schema 2 limpo) e o bloco JSON dos tickets
+  pendentes (prosa intacta). Nunca reescreve objetivo de ticket.
   *Evidência:* inventário §4 decisões 3 e 4, §6 itens 9 e 12, §8 item 4.
-  *Teste:* migração de cada artefato legado, com o caso NEGATIVO de que a prosa e o objetivo não
-  se movem.
+  *Teste:* migração de cada artefato legado, com o caso NEGATIVO de que a prosa e o objetivo
+  não se movem.
+
+- **K8c · a recusa 3 do `--atualizar` não olha `scripts/roadmap/`.** ACHADO da etapa 3: desde
+  K5b o `--atualizar` ESCREVE em `scripts/roadmap/`, mas a recusa por árvore suja
+  (`instalar.sh`, `atualizar()`) confere só `scripts/orquestrador/**`, `scripts/orq` e
+  `docs/orquestrador/skill/**` — os três caminhos que a peça K8a enumerava. Um `lint-mapa.py`
+  modificado e não commitado no repo é apagado em silêncio. Não foi ampliado junto com K8a por
+  decisão: o contrato das três recusas estava escrito, e alargá-lo em silêncio é pior que a
+  lacuna.
+  *Evidência:* `instalar.sh`, a linha `git -C "$repo" status --porcelain -- scripts/orquestrador
+  scripts/orq docs/orquestrador/skill`; `fb8de45`, seção ACHADO da mensagem.
+  *Teste:* repo com `scripts/roadmap/lint-mapa.py` modificado e não commitado → `--atualizar`
+  recusa com rc 1 nomeando o caminho; com `--forcar`, passa e avisa.
 
 - **K9 · contrato.** `CONTRATO.md`, `ticket.schema.json`, `liberacoes.schema.json` e o enum
   `motivo_categoria` (os 8 baldes do `orq-telemetria.py` do Comarka). `risco` é derivado (passo 6
@@ -184,20 +255,6 @@
   *Evidência:* inventário §5 (linha do validador de ticket).
   *Teste:* um caso por check, mais o NEGATIVO do gate barrando antes do agente.
 
-- **1d · gate mudo por symlink no caminho.** O guard de CLI do `gate-ticket.ts` compara
-  `import.meta.url` com `argv[1]` sem `realpath`; chamado por caminho com symlink (macOS
-  `/tmp` → `/private/tmp`) sai 0 sem rodar nada: gate mudo. Conserto no MOTOR: `realpath`
-  dos dois lados.
-  *Evidência:* `scripts/orquestrador/gate-ticket.ts:549-551`
-  (`if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)`);
-  `resolve()` normaliza mas NÃO resolve symlink, e o `import.meta.url` que o node entrega vem
-  fisicamente resolvido. Medido na etapa 2: com o fixture em `/tmp/orq-fixture-*/repo`,
-  `orq validar --relatorio 001` saía rc 0 com stdout VAZIO; com `/private/tmp/...`, imprimia o
-  relatório. Contornado no kit (o `scripts/kit/fixture.sh` imprime `pwd -P`), não consertado —
-  o buraco espera qualquer repo instalado sob caminho com symlink.
-  *Teste:* chamar o gate por um symlink e EXIGIR saída — o caso negativo é o que falta hoje:
-  gate que sai 0 sem imprimir nada é indistinguível de gate que aprovou.
-
 - **K12 · painel.** `orq-server.py` + `orq-painel.py` do Comarka entram como `painel/`, refatorados
   para ler só o contrato (STATUS, events, custo, liberacoes v2, PAUSAR, tickets); `LABELS` →
   `~/.orq/repos.json`; ações via `orq`; notificação nativa desligada; zero `if repo`.
```

