# PEÇAS — backlog do kit

> **Backlog, não histórico.** O que já aconteceu e o porquê ficam no CHANGELOG e nos
> commits. Aqui fica o que ainda vai acontecer, em ordem, e uma peça sai desta lista
> quando o commit dela existe.
>
> **Formato de cada peça:** uma linha de objetivo · evidência (seção do inventário,
> ou arquivo e linha no disco) · teste que prova. Sem os três, não é peça — é ideia.
>
> Escopo: o kit inteiro. `scripts/orquestrador/**`, `scripts/orq` e `doutrina/**` são o
> MOTOR: mudança neles exige teste que prove a mudança, na peça que a pede.

## FEITAS

- **K1 · toolchain do kit.** `package.json` (orquestrador-kit, private, `type: module`),
  `vitest.config.ts`, `tsconfig.json` e `.gitignore` próprios; devDependencies com os
  mesmos ranges do CI (`@types/node ^22.20.0`, `tsx ^4.19.0`, `typescript ^5.6.0`,
  `vitest ^2.1.0`) e nenhuma dependência de runtime — os testes e os scripts do motor
  só importam `node:*` e `vitest`.
  *Evidência:* `9f9e807`; `_referencia-ci/package.ci.json`, `_referencia-ci/vitest.config.ts`,
  `_referencia-ci/tsconfig.json`. Antes disto o kit não tinha como rodar nada: dependia do
  `node_modules` e do checkout do CI.
  *Teste:* `npx vitest run` executa e `npx tsc --noEmit` roda até o fim.

- **K2 · helpers de teste que ficaram no CI.** `test/fixtures/orq-harness.ts` copiado do
  conteudos-infinitos @711ab5e, byte-idêntico (blob `db20a21a`), sem edição.
  *Evidência:* `71cc719`; 17 dos 24 arquivos de teste importam `./fixtures/orq-harness.js`
  e o extrator não o trouxe (`ORIGEM.md`, adendo K2). `test/db.ts` não entra: não existe no
  CI — o `from './db.js'` de `test/orquestrador-enforcement.test.ts:300` está dentro de uma
  string, é linha de diff sintético, não import.
  *Teste:* todo import relativo de `test/*.ts` resolve para arquivo existente (`.js` → `.ts`).

- **K3 · vitest verde.** `FX_CHECKOUT` (`test/fixtures/checkout/`) é o checkout mínimo de
  fixture: o análogo, dentro do kit, do repo instalado que o motor espera achar. Tudo que os
  testes liam de `REPO_ROOT/docs/fila` lê de lá; idem os CLIs que recebem a raiz por argumento
  e o `source executor.sh`, que ganhou `ORQ_EXEC_ROOT` num tmp. Fixtures de teste do CI
  (`claude-envelope`, `criterios`, `runs-201`, `trilha`) copiadas sem edição.
  *Evidência:* `617d6ba`; `scripts/orquestrador/lib.sh:24` (`ROOT` sai do diretório onde o
  lib.sh mora) e `lib.sh:42` (`FILA_DIR="$MAIN_CHECKOUT/docs/fila"`) — é por isso que o kit,
  sem fila própria, não satisfazia o motor. Zero mudança em `scripts/orquestrador/**`.
  *Teste:* `npx vitest run` — 24 arquivos, 604 passam, 8 em quarentena (`docs/QUARENTENA.md`),
  todos por K7 e nenhum por mudança de motor; `npx tsc --noEmit` limpo.

- **K4 · PECAS.md e CHANGELOG do kit.** Este arquivo, com o backlog de K5 a K15 na ordem de
  execução, mais a seção 2.1.0-dev do CHANGELOG com uma linha por peça e o sha.
  *Evidência:* `docs/INVENTARIO-2026-09-07.md` §4 (decisões), §5 (quem doa o quê) e §8 (plano
  da fase 1). Backlog que só existe no chat some com o chat.
  *Teste:* não tem teste próprio (é documento); o que ele afirma sobre o disco está verificado
  por `grep`/`cat` nas linhas citadas em cada peça.

- **K7 · fixture de repo.** `fixture/` é o TEMPLATE (arquivos soltos, sem `.git`): toolchain,
  `src/soma.ts` + teste verde, a fila (`000-config.json` schema 2 mínimo, `liberacoes.json`,
  `decisoes-pendentes.md`, `rascunhos/`, o ticket 001) e o roadmap de um bloco/uma frente.
  `scripts/kit/fixture.sh` INSTANCIA: `/tmp/orq-fixture-XXXXXX/repo`, motor vendorizado dentro,
  `node_modules` por symlink, `git init -b main` + `staging-auto`, origin falso
  (`git@example.invalid:fixture/orq-fixture.git`), e o caminho na última linha do stdout.
  *Evidência:* `4500bb2` (K7a) e `67c485e` (K7b); inventário §8 item 2. O config é mínimo por
  levantamento no disco, não por memória: `grep -ohE "cfg '[^']*'" scripts/orquestrador/*.sh` mais
  os acessos diretos de `enforcement-core.ts:128,211`, `decisao.ts:71,113,277,363`, `juiz.ts:64-76`
  e `gates.ts:176-178`. Dois valores são cobrados por teste do motor, não escolhidos:
  `diff_cap_linhas = 600` e as 7 causas de `politica_adiamento` (`test-lib-config.sh:50,58,61`), e
  `preflight_probe = true` (`test-retry-worktree.sh:216` exercita `probe_modelos` inteiro com
  `claude_run` stubado; com `false`, `executor.sh:146` sai cedo e a seção 4 cai em 5 falhas).
  `scripts/roadmap/` entra na vendorização porque `orq mapa lint` roda
  `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT (`scripts/orq:226`).
  *Teste:* `npx vitest run` — 24 arquivos, **612 passam, 0 em quarentena**;
  `bash scripts/kit/test-shell.sh` — rc 0 nos três; `bash $FX/scripts/orq` diz
  `ESTADO ocioso` / `FILA 1 pendente`; `bash $FX/scripts/orq validar --pendentes` sai 0;
  `python3 scripts/roadmap/lint-mapa.py` dentro do fixture: 10 passaram, 0 falharam, 0 aviso.
  *Falta:* a travessia PAGA do loop (`scripts/kit/fixture-e2e.sh`) espera OK humano — ver K7-e2e
  em PENDENTES.

- **K5 · `instalar.sh --verificar`.** `diff -rq` entre `scripts/orquestrador/**`, `scripts/orq` e
  `doutrina/` do kit e `scripts/orquestrador/**`, `scripts/orq` e `docs/orquestrador/skill/` de um
  repo, ignorando o plist instanciado (`*.plist` que não seja `*.plist.template`), `runs` e
  `VERSAO`; imprime `idêntico ao kit <VERSAO>` (rc 0) ou a lista `diferente` / `só no kit` /
  `só no repo` (rc 1). `--novo` e `--atualizar` dizem "ainda não: peça K8" e saem 2.
  *Evidência:* `0f023a6`; inventário §4 decisão 2 e §8 pronto-quando; o mapa origem→destino é o do
  `ORIGEM.md`. `LC_ALL=C` no `diff` é obrigatório: sem ele, numa máquina em pt_BR o parser não casa
  nada e o verificador diria "idêntico" para um repo divergente.
  *Teste:* `scripts/kit/test-instalar.sh` — (a) fixture recém-instanciado: idêntico, rc 0; (b)
  cópia com UM byte a mais em `lib.sh`: `diferente scripts/orquestrador/lib.sh`, rc 1, e o NEGATIVO
  de que é exatamente 1 diferença; (c) `~/Projetos/conteudos-infinitos` (só leitura): `repo sem
  VERSAO` + `idêntico ao kit 2.1.0-dev`, rc 0 — e `git log 711ab5e..HEAD -- scripts/orquestrador
  scripts/orq docs/orquestrador/skill` sai vazio lá, ou seja, a etapa 5 do CI não tocou o motor.

- **K7-e2e · o fixture atravessou o loop.** `scripts/kit/fixture-e2e.sh` (recusa rodar sem
  `ORQ_E2E_OK=1`) instanciou o fixture, rodou UMA drenagem do `local-loop.sh` dele e o ticket 001
  saiu `done` com merge na `staging-auto` do fixture. Rodado com OK humano explícito em
  2026-09-08.
  *Evidência:* a própria execução (esta peça não muda código): drenagem de 52 s,
  `local-loop rc=0`, 2026-09-08 11:54 -0300. Trilha:
  `001 INICIO attempt=1 model=sonnet` → `GATE ... enforcement=ok criterios=4/4` →
  `JUIZ veredito=aprovado classe=baixo modelo=sonnet attempt=1` → `001 APROVADO merge=aguardando
  dur=32s attempt=1` → `001 MERGE alvo=staging-auto sha=5d7c32d` →
  `DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0`. Custo real: probe US$ 0,0855 +
  executor US$ 0,1967 + juiz US$ 0,0871 = **US$ 0,369**, contra `usd_ticket` 1. Uma tentativa, zero
  retry. Nenhum push: o origin é `git@example.invalid:...` e o loop nem tentou.
  *Teste:* o pronto-quando do `doutrina/references/setup.md:55` ("um ticket-fixture trivial
  atravessa o loop ponta a ponta e o merge aparece na staging"), cumprido — e os 4 critérios de
  aceite do ticket verdes, `enforcement ok`, `gates.txt` com `ok typecheck` / `ok test` /
  `VEREDITO: APROVADO`.

- **K5b · `--verificar` cobre `scripts/roadmap/`.** `instalar.sh` compara também
  `scripts/roadmap/` — motor vendorizado, porque `orq mapa lint` roda
  `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT.
  *Evidência:* `3a76edb`; `scripts/orq:226`, no disco. Antes disto um `lint-mapa.py`
  desatualizado no repo passava por "idêntico ao kit".
  *Teste:* caso (d) de `scripts/kit/test-instalar.sh` — cópia do fixture com um byte a mais
  em `lint-mapa.py`: `diferente scripts/roadmap/lint-mapa.py`, rc 1, exatamente 1 diferença.
  Antes do conserto: `idêntico ao kit 2.1.0-dev`, rc 0.

- **K8a · `instalar.sh --atualizar <repo> [--dry-run] [--forcar]`.** Copia o motor do kit por
  cima do de `<repo>` (`scripts/orquestrador/` sem plist instanciado, `scripts/orq`,
  `scripts/roadmap/`, `doutrina/` → `docs/orquestrador/skill/`) e carimba o `VERSAO`. `cp`, e
  nunca `rsync --delete`: o que só existe no repo sobrevive e reaparece como `só no repo` no
  `--verificar` que ele imprime no fim, junto da linha de commit por pathspec. Não toca
  `docs/fila/**`. Três recusas com rc 1 — loop não pausado, `STATUS.md` que não diz `ocioso`,
  motor do repo com modificação não commitada —, e só a terceira cede a `--forcar`.
  *Evidência:* `fb8de45`; o bloco de vendorização do `scripts/kit/fixture.sh`, que já era o
  mapa origem→destino do `ORIGEM.md` executado.
  *Teste:* casos (e) e (f) de `scripts/kit/test-instalar.sh`. Antes: `ainda não: peça K8`, rc 2.

- **K6a · monorepo por detecção, não por nome.** `pacotes_do_checkout` (`executor.sh`) lista
  todo diretório do checkout principal com `node_modules` próprio — a raiz incluída, os
  aninhados de dependência fora — e é essa lista que `limpa_cache_vite` e o novo
  `linkar_node_modules` percorrem, no lugar do `for d in "" apps/web services/*/`.
  `LC_ALL=C sort` reproduz a ordem antiga item a item.
  *Evidência:* `d613b07`. Contra `~/Projetos/conteudos-infinitos` (só leitura) as duas listas
  saem linha a linha idênticas — os 9 pacotes, na mesma ordem.
  *Teste:* `test/orquestrador-pacotes.test.ts`, 6 casos (6 vermelhos antes), com a árvore do
  CI simulada e um `packages/ui` que a lista fixa não cobria.

- **K6b · linha `GATE` honesta para qualquer nome de gate.** Cada gate do config tem um PAPEL
  (`typecheck` | `testes` | `build` | `lint`), declarado por `"papel"` ou inferido do nome;
  `papel_marca` combina todos os gates daquele papel. `nao-configurado` entra no vocabulário
  (o repo não tem gate com esse papel) e `nao-rodou` volta a significar só "há gate
  configurado e ele não rodou". `lint=` é campo condicional. `typecheck_marca` saiu.
  *Evidência:* `b8c303d`; a trilha do e2e de 08/09 dizendo `typecheck=nao-rodou
  testes=nao-rodou build=nao-rodou` sobre gates que o `gates.txt` do mesmo attempt registra
  como `ok` (preservada em `docs/e2e/2026-09-08-1154-001/events.log.txt`).
  *Teste:* `test/orquestrador-trilha-gate-papel.test.ts`, 9 casos — 5 vermelhos antes, e os 4
  verdes são justamente os do config do CI. Com `_referencia-ci/000-config.ci.json` e
  `test/fixtures/runs-201/attempt-2.gates.txt` a linha sai
  `901 GATE typecheck=ok testes=falha enforcement=ok criterios=3/3 build=nao-rodou`, que é
  caractere a caractere a de antes. Os testes de trilha que já existiam ficaram verdes sem
  edição.

- **K6c · plist e launchd sem nome de repo.** `com.conteudos.orquestrador.plist.template` →
  `com.orquestrador.plist.template`, com `{{LABEL}}`, `{{CHECKOUT}}`, `{{NODE_DIR}}` e
  `{{START_INTERVAL}}`. `instalar-launchd.sh` lê `launchd.label` e `launchd.start_interval` do
  `000-config.json`, ganha `--dry-run`, e RECUSA (rc 1) sem `launchd.label`: "defina
  launchd.label no config; o CI usa com.conteudos.orquestrador". Nunca inventa label — label
  inventado não dá erro, dá um segundo job carregado ao lado do antigo.
  *Evidência:* `45e62d5`. A chave `launchd` entrou em `fixture/docs/fila/000-config.json` e em
  `doutrina/templates/config.json`, com o comentário `_launchd`.
  *Teste:* `test/orquestrador-launchd-config.test.ts`, 11 casos (10 vermelhos antes).

- **K6e · o instalador não pode ser sequestrado por teste.** `test/fixtures/bin/launchctl`
  é um stub que grava cada chamada em `$ORQ_LAUNCHCTL_LOG` e sai 0; o harness ganhou
  `comLaunchctlStub()`, que o põe na frente do PATH e troca o `HOME` por um tmp
  descartável. `instalar-launchd.sh` RECUSA instalar (rc 1) de um checkout sob
  `/tmp`/`/private/tmp` ou com `ORQ_TESTE=1`, salvo `--permitir-tmp`; `--dry-run`
  continua valendo lá. `test-instalar.sh` e `fixture-e2e.sh` exportam `ORQ_TESTE=1`,
  com UMA exceção: o `local-loop.sh` do e2e roda com `env -u ORQ_TESTE`, porque
  `escrita_de_teste_permitida` (`lib.sh:168`) recusaria a trilha do próprio fixture —
  o loop nunca define `ORQ_EXEC_ROOT` (`grep -n ORQ_EXEC_ROOT` em `local-loop.sh`,
  `executor.sh` e `launchd-run.sh` não devolve nada).
  *Evidência:* o incidente de 2026-09-08, agora em `docs/PLAYBOOK.md` — job do CI
  apontando para `/private/tmp/orq-fixture-6qRp23` das 12:24 às 14:05, três ticks em
  rc 127, detecção humana por `launchctl print`.
  *Teste:* `test/orquestrador-launchd-config.test.ts`, 15 casos (3 vermelhos antes),
  todos com o stub; o caso novo prova que a instalação inteira passa pelo stub
  (`print` → `bootout` → `bootstrap`, todos com o label do config), que o plist foi
  para o HOME descartável, e que `launchctl print` REAL do label do fixture continua
  saindo != 0.

- **K8c · a recusa por árvore suja cobre `scripts/roadmap/`.** A recusa 3 do `--atualizar`
  (`instalar.sh`, `atualizar()`) confere os MESMOS caminhos que o bloco de cópia escreve:
  `scripts/orquestrador`, `scripts/orq`, `scripts/roadmap` e `docs/orquestrador/skill`.
  *Evidência:* `fb8de45` (seção ACHADO) e K5b — desde a K5b o `--atualizar` escreve em
  `scripts/roadmap/`, e a recusa tinha ficado com os três caminhos da K8a. Um
  `lint-mapa.py` modificado e não commitado era a única coisa que o instalador apagava sem
  avisar.
  *Teste:* caso (g) de `scripts/kit/test-instalar.sh` — fixture com PAUSAR e
  `scripts/roadmap/lint-mapa.py` modificado fora do git: rc 1, a recusa NOMEIA o caminho e o
  arquivo continua intacto (cksum). (g2): com `--forcar`, rc 0, o aviso `--forcar: passando
  por cima` e o arquivo vira o do kit. 5 vermelhos antes — o `--atualizar` saía 0 dizendo
  `idêntico ao kit`, com a modificação já apagada.

- **K8d · os testes do harness viajam com o motor.** `instalar.sh` compara e copia uma lista
  ENUMERADA, em `scripts/kit/vendorizado.sh` — sourceada também pelo `scripts/kit/fixture.sh`,
  para que instalar num repo e instanciar o fixture vendorizem o MESMO conjunto:
  `test/fixtures/orq-harness.ts`, 6 testes e 3 fixtures de dados. Sem glob sobre `test/`:
  teste do produto não é tocado nem listado. `criarFixture` voltou a ler o config REAL do
  checkout quando existe (`configDeReferencia()`), com `FX_CHECKOUT` como fallback.
  *Evidência:* medição contra `~/Projetos/conteudos-infinitos` — 17 dos 27 candidatos foram
  re-apontados para fixtures do kit em K3/K7b, 2 hardcodam valores do CI e falham em
  qualquer outro repo (`orq-cli.test.ts:205,237` cobra `US$ 50`;
  `orquestrador-observabilidade.test.ts:216-217` cobra `typecheck_root`/`typecheck_web`), 3
  dependem de `scripts/kit/fixture.sh` / `_referencia-ci/` / `test/fixtures/bin/`.
  *Teste:* caso (h) de `scripts/kit/test-instalar.sh` — (h1) teste envelhecido no repo →
  `diferente test/...` e rc 1, sem citar `test/produto.test.ts`; (h2) `--atualizar` corrige e
  o teste do produto continua byte a byte igual; (h3) `npx vitest run` DENTRO do repo
  atualizado sai rc 0 (8 arquivos, 62 testes) — é essa a prova de portabilidade, contra um
  config que não é o do kit nem o do CI. 3 vermelhos antes.

- **K9 · contrato e schemas.** `CONTRATO.md` na raiz: layout de arquivos (motor × repo ×
  `runs/`), ticket, `STATUS.md`, `events.log` (vocabulário FECHADO de 19 eventos e a linha
  `GATE` com `ok | falha | nao-rodou | nao-configurado` e `lint=` condicional), `custo.json`,
  `meta.json`, `attempt-N/`, `liberacoes.json`, `PAUSAR`, config, e os verbos de `orq`,
  `instalar.sh` e `instalar-launchd.sh`. Mais `schemas/ticket.schema.json`,
  `schemas/liberacoes.schema.json` e `schemas/motivo_categoria.json`.
  *Evidência:* tudo conferido por grep no código deste kit, com arquivo e linha em cada
  afirmação. Os 8 baldes de `motivo_categoria` foram COPIADOS DO DISCO de
  `~/Projetos/comarka-operacional/scripts/orquestrador/orq-telemetria.py:78`
  (`CATEGORIAS_MOTIVO`), só leitura — eles não estão em `_referencia-ci/`, e a origem está
  escrita dentro do arquivo.
  *Teste:* o schema de ticket foi rodado contra a fila REAL: **76 tickets do CI e 1 do
  fixture, 0 violações** (id, status, campos obrigatórios de `pendente`, `risco`, `tipo` de
  critério). O padrão de token do schema de liberações casa os 7 tokens reais do CI. Onde o
  desejado difere do feito, a §10 "Divergências conhecidas" lista 9 itens, cada um com a
  peça que o fecha — nenhuma foi consertada na prosa.

- **`orq versao` e `orq config`.** Dois verbos de leitura. `orq versao` imprime o carimbo
  `docs/orquestrador/skill/VERSAO` do repo (`repo sem VERSAO` quando ausente) e, com
  `--kit <dir>` ou `ORQ_KIT`, compara com o do kit — dizendo que carimbo igual NÃO é motor
  idêntico, porque quem prova isso é o `instalar.sh --verificar`. `orq config` valida o
  `000-config.json`: placeholder `<...>`, chave obrigatória ausente (a lista com o
  arquivo:linha de onde o motor lê cada uma está em `scripts/orquestrador/config-chaves.ts`,
  49 chaves, 40 obrigatórias), gate sem papel inferível e sem `papel` declarado, `gates` sem
  `nome`. rc 1 com violação. Os dois são READ-ONLY.
  *Evidência:* o levantamento do PASSO 0 — `grep -nE "cfg '[^']*'" scripts/orquestrador/*.sh
  scripts/orq` mais os acessos diretos dos `.ts`. Dois DEFEITOS caíram no caminho: (1) o
  `orq` inteiro saía rc 5 (`jq: parse error`) com um config ilegível, porque o `lib.sh` lê o
  config no carregamento — a única ferramenta que responde "meu config está quebrado?" era
  justamente a que não rodava quando ele estava; `orq config` passou a ser despachado ANTES
  do `source lib.sh`; (2) o validador acusava o gate `limpeza_artefatos` do CI, que é
  `tipo: preparacao` e não verifica nada — gate que não verifica não tem papel na linha
  GATE, por desenho.
  *Teste:* `test/orq-versao-config.test.ts`, 16 casos (14 vermelhos antes), incluindo o
  NEGATIVO de que prosa mencionando `<ASSIM>` não é placeholder e o de que nenhum dos dois
  verbos escreve no repo (nem cria `runs/`).
  *Medido contra o CI (só leitura):* `orq config` sai **0 violações, rc 0** — nenhum achado;
  `orq versao --kit` diz `REPO 2.1.0-dev · KIT 2.1.0-dev · igual`.

- **1d · gate mudo por symlink, CONSERTADO.** O guard de CLI do `gate-ticket.ts` compara os
  dois lados com `realpathSync`, num `chamadoComoCli()` com try/catch. Antes, `resolve(argv[1])`
  não resolvia symlink e o `import.meta.url` vinha fisicamente resolvido: sob caminho com
  symlink o gate saía 0 com stdout VAZIO — indistinguível de gate que aprovou.
  *Evidência:* `014f8a5`. Com o conserto, o contorno do `scripts/kit/fixture.sh` (`pwd -P`)
  saiu: o fixture voltou a nascer em `/tmp/orq-fixture-*`, com symlink no meio, então o
  cenário do defeito virou o cenário PADRÃO da suíte inteira.
  *Teste:* três casos em `test/orquestrador-gate-ticket.test.ts` (dois vermelhos antes, o
  primeiro deles dizendo `o gate saiu MUDO: expected '' not to be ''`). Medido depois:
  `bash scripts/orq validar --relatorio 001` de `/tmp/orq-fixture-*/repo` imprime o relatório
  e sai 0; na etapa 2 saía 0 e mudo.

- **K7c · o e2e guarda a própria evidência.** `preservar_evidencia`
  (`scripts/kit/fixture-e2e.sh`) copia `docs/fila/runs/<id>/attempt-*/` inteiro, `events.log`
  e `custo.json` para `docs/e2e/<AAAA-MM-DD-HHMM>-<id>/` no kit, renomeando `*.log` para
  `*.log.txt`, e imprime o caminho. Roda logo depois do watchdog, antes das seções de
  relatório. O script ganhou modo `ORQ_E2E_SOURCED=1` e destino por `ORQ_E2E_DOCS`.
  *Evidência:* `2f93db4`; a perda do run de 08/09 11:54, registrada em
  `docs/e2e/2026-09-08-1154-001/PROCEDENCIA.md` — os `attempt-*/` daquele run não existem
  mais e não voltam.
  *Teste:* `test/kit-e2e-evidencia.test.ts`, 7 casos (7 vermelhos antes), sem gastar nada.
  O e2e NÃO foi rodado nesta sessão.


- **K8b-1 · o motor lê `liberacoes.json` em todas as formas vivas.** `lib.sh:liberacao_ok`
  resolve as quatro formas que existem no disco (`CONTRATO.md` §6.1): `tokens[]` de objetos
  (v2), `tokens[]` de strings com prefixo (CI), `tokens[]` de strings sem prefixo (Actus) e
  a união com `liberadas[]` (Comarka). O prefixo `humano:` é ignorado dos DOIS lados;
  arquivo que mistura formas resolve a UNIÃO; entrada malformada é ignorada. Duas passadas
  de `jq`: a canônica é muda, a de compat grava o AVISO com o comando que migra.
  `scripts/roadmap/lint-mapa.py` monta `sat` pela mesma regra, entre marcadores
  `# <sat>`/`# </sat>` que o teste EXECUTA em vez de reimplementar.
  *Evidência:* o PASSO 0 da etapa 5, `jq` no disco dos três repos (só leitura). Até aqui os
  5 tokens do Actus não resolviam NADA, em silêncio — o incidente de 2026-09-03 outra vez,
  num repo onde ninguém olhou. `gate-ticket.ts` não mudou, e é achado: o check 7 nunca leu
  `liberacoes.json` (`gate-ticket.ts:429-441`), então não havia prefixo a normalizar ali.
  Fecha a divergência 2 do `CONTRATO.md` §10. Duas asserções antigas foram REVERTIDAS com o
  porquê escrito no arquivo (token sem prefixo passou a resolver; o aviso mudou de "formato
  ANTIGO" para "forma LEGADA", que cobre as duas legadas).
  *Teste:* `test/orquestrador-liberacoes-formatos.test.ts`, 28 casos, **16 vermelhos
  antes**, contra os arquivos REAIS dos três repos em `test/fixtures/liberacoes/` (byte a
  byte, com `PROCEDENCIA.md` e cksum).
  *O que o CI faz diferente:* nada — os 7 tokens dele resolvem antes e depois e nenhum grava
  aviso, e esse caso já estava VERDE no vermelho-antes.


- **K8b-2 · `orq liberar` e a migração de liberações.** `orq liberar
  humano:<tipo>-<id> ["nota"]` — o QUARTO verbo que escreve — acrescenta um objeto v2, com
  quatro recusas: sem prefixo, fora do padrão do schema, duplicado (contra as duas listas) e
  arquivo fora da v2. Não converte o arquivo de passagem.
  `scripts/orquestrador/migrar-liberacoes.ts` leva qualquer forma viva para v2 (`em` →
  `liberado_em`, prefixo acrescentado, dedup por token, ordem original — e a ordem de leitura
  das listas é a ordem das CHAVES no arquivo). `migrar-comum.ts` guarda as cinco regras de
  toda migração do kit (`CONTRATO.md` §9.3).
  *Evidência:* o PASSO 0 da etapa 5. Comarka: 61 entradas, 47 únicos, 13 nas duas listas e
  uma duplicata exata dentro de `liberadas[]` — o arquivo é editado à mão por humano com
  pressa, que é o tipo de arquivo que merece um verbo. Um defeito de idempotência caiu no
  caminho: a segunda passada reinferia `origem` e apagava a procedência do `desconhecido`.
  *Teste:* `test/orquestrador-liberar-migrar.test.ts`, 37 casos, **9 vermelhos antes**,
  contra os três arquivos reais. Depois de migrado, todo token resolve por `liberacao_ok` e
  nenhum grava mais AVISO.
  *O que o CI faz diferente:* nada no motor; o `liberacoes.json` dele é v1 canônica, então
  `orq liberar` o recusa até a migração rodar — e é isso que se quer.


- **K8b-3 · pause file, `.gitignore` e o `--migrar`.** `instalar.sh --atualizar <repo>
  --migrar` é o gancho das migrações de `docs/fila/**`, com os dois primeiros passos:
  `.orq-pause` → `PAUSAR` preservando o motivo (e recusa com os dois presentes), e o
  RELATO do que o repo deve ignorar. O instalador não edita o `.gitignore` de repo
  existente. A pergunta é feita ao `git check-ignore`, não a um grep por linha literal.
  De quebra, `--dry-run` passou a PREVER as recusas, e o instalador sugere dois commits
  separados (motor × dados).
  *Evidência:* `CONTRATO.md` §7; o PASSO 0 — os três repos têm `.orq-pause` no
  `.gitignore` e nenhum tem `PAUSAR`; o CI ignora `runs/` por `runs/.gitignore` com `*`, e
  o Actus versiona a evidência por ticket de propósito (divergência registrada).
  *Teste:* caso (i) de `scripts/kit/test-instalar.sh`, 32 checks, **21 vermelhos antes**.
  *O que o CI faz diferente:* o relato vai acusar `docs/fila/PAUSAR` faltando no
  `.gitignore` dele — acusação correta, porque depois da migração o kill switch muda de
  nome e apareceria no `git status` no meio de uma pausa.


- **K8b-4 · config schema 1 → 2 por tabela explícita.** `config-tabela.ts` (a tabela, à
  mão, em três grupos) + `migrar-config.ts` (aplica). Renomear é COPIAR. Decisão local vira
  placeholder; política do motor vem preenchida; a ordem dos gates é derivada. O instalador
  PROPÕE (`000-config.proposto.json`) e nunca aplica: config é decisão, não dado.
  *Evidência:* o PASSO 0 — Actus e Comarka em `$schema_versao: 1`; `supabase_project_id` do
  Comarka é o `ambiente_id` do motor; `tipo: "tsc_baseline"` contra o `"baseline"` de
  `gates.ts:151`. Dois renomes que pareciam simétricos ficaram de fora porque o motor não lê
  o destino — e quem achou foi o teste, não a leitura.
  *Teste:* `test/orquestrador-migrar-config.test.ts` (36 casos) + caso (i5b) de
  `scripts/kit/test-instalar.sh` (**8 vermelhos antes**).
  *Medido:* Actus 26 → 14 violações, Comarka 28 → 15; o resto é decisão local mais o
  `zona_proibida` do Comarka, que a tabela NÃO renomeia a partir de `c0_intocavel`.
  *O que o CI faz diferente:* nada — a linha `GATE` sai caractere a caractere igual, `gates`
  e `_execucao_dos_gates` atravessam sem um byte de diferença, e a única chave acrescentada
  é `launchd.label`.


- **K8b-5 · bloco JSON dos tickets pendentes.** `migrar-tickets.ts`: `tentativas_consumidas`
  → `tentativas` e `recon_esperado` → `recon`, na POSIÇÃO original da chave; só `pendente`,
  só os `[0-9]*.md`. Prosa intacta byte a byte — é a afirmação central, e o teste a compara
  byte a byte. Não inventa `tipo`, `risco` nem `bloco`; não toca `perfil`/`lane`. Única
  migração sem `.bak` (o ticket é versionado). Depois dela o instalador roda
  `orq validar --pendentes` para o relatório, sem corrigir nada.
  *Evidência:* o PASSO 0 — 250 `recon_esperado` e 39 `tentativas_consumidas` no disco, 44
  entre os pendentes do Comarka. Medido: **uma linha muda por ticket**, e as 44 são a mesma.
  *Achado:* com mais de um bloco ```json os três leitores discordam (contrato §2 = último,
  `gate-ticket.ts:99` = primeiro, `lib.sh:86` = todos concatenados). Latente — nenhum dos 517
  tickets está nesse estado. Virou a divergência 10 do `CONTRATO.md`; a migração PULA e
  nomeia os três, em vez de desempatar.
  *Teste:* `test/orquestrador-migrar-tickets.test.ts` (32 casos) + caso (i5c) de
  `scripts/kit/test-instalar.sh` (**3 vermelhos antes**).
  *O que o CI faz diferente:* nada a migrar — os 6 pendentes dele já usam os nomes novos.


- **K8b-6 · `instalar.sh --novo <repo>`.** Cria o layout de `CONTRATO.md` §1.2 num repo git
  sem `docs/fila`: `vendorizar_motor` (a MESMA função que o `--atualizar` usa) + os
  artefatos de `doutrina/templates/` + `liberacoes.json` em v2 vazio + `.gitignore`. Duas
  recusas: não é repo git, e `docs/fila` já existe. Nada de launchd — agendar é passo
  separado, e os próximos passos impressos o põem por último.
  *Evidência:* `CONTRATO.md` §10, divergência 1 (agora fechada). O template do config ganhou
  as 6 chaves obrigatórias que faltavam, medidas pelo `orq config` no PASSO 0: sem elas o
  dono teria de AUTORAR chave, não só preencher.
  *Teste:* caso (j) de `scripts/kit/test-instalar.sh`, 33 checks, **30 vermelhos antes** —
  repo vazio → `--novo` → `orq config` lista placeholders e NENHUMA chave ausente →
  `--verificar` idêntico.
  *O que o CI faz diferente:* nada — ele já tem `docs/fila` e receberia a recusa 2.


- **K10 · doutrina v2.** Seis decisões mudaram, e `docs/DOUTRINA-v2.md` é a tabela delas com a
  evidência de cada uma: motor único versionado (e editar o motor vendorizado é NO-GO no
  pré-voo); ID sequencial global no lugar de faixa por bloco; canal padrão = arquivo; `risco`
  derivado; "quem escreve o harness" apontando para o kit e para o incidente de 2026-09-08;
  e `setup.md` instalando por `--novo` em vez de mandar gerar os scripts. O
  `PLAYBOOK-seed.md` ganhou 15 lições triadas do PLAYBOOK do CI, com data, origem e o
  critério de escolha escrito no arquivo.
  *Evidência:* o PASSO 0 desta etapa (três formatos de `liberacoes.json`, dois schemas de
  config) para a decisão 1; 2026-09-04 para a 2; 2026-09-07 para a 4; 2026-09-08 para a 5.
  *Teste:* `test/doutrina-v2.test.ts`, 30 casos, **15 vermelhos antes**. Ele confronta cada
  afirmação com a fonte que a torna verdadeira ou falsa — template de config, `CONTRATO.md`
  e o disco —, em vez de julgar redação.
  *Achado de quebra:* dois casos da K8b-5 afirmavam a constante 44 sobre a fila viva do
  Comarka e quebraram dentro da sessão (o loop de lá drenou às 16:00). Passaram a derivar o
  esperado da própria cópia.


- **K11a-1 · enforcement B/C/D do Actus como regras por config.** `enforcement-core.ts`
  ganha três regras, TODAS desligadas quando a chave não existe no config: **B**
  (`migrations.dir` + `.faixa` + `.faixas_reservadas` — `.sql` só no dir, com número
  legível, na faixa e fora das reservadas; quatro tipos de violação NOMEIAM a regra),
  **C** (`no_write_tables` como LISTA congela por nome; `schemas_permitidos` +
  `tabelas_permitidas` reprovam o que estiver fora — leitura nunca reprova, porque o
  detector só extrai tabela ESCRITA) e **D** (`colunas_congeladas` como globs, com
  `colunas_sombra` VENCENDO — é a precedência que torna `["etapa_*"]` + `["etapa_v2_*"]`
  exprimível). C e D auditam também o `artefato_sql`, e a regra 3 (`TODAS`) não: uma
  proibição NOMEADA dentro de uma migration é o caso que o Actus quer pegar (alguém vai
  aplicar aquele arquivo), enquanto a negação em bloco dentro do artefato foi o falso
  positivo do ORQ-11. Prosa nunca entra, nas três.
  *Evidência:* o PASSO 0 da etapa 6, lendo `~/Projetos/actus-saas/scripts/orquestrador/enforcement.mjs`
  (regras A–F) e o `000-config.json` de lá (só leitura). `config-tabela.ts` ganhou dois
  renomes com as duas origens (`migrations_faixa_loop → migrations.faixa`,
  `zona_proibida.no_write_columns → zona_proibida.colunas_congeladas`) e `migrations.dir`
  ficou DE FORA da tabela de propósito: renomeá-lo ligaria a regra B em todo repo que tem
  migration, o CI inclusive. Quem cobra o dir é o `orq config` (`config-cli.ts:152`,
  "faixa sem dir").
  *Teste:* `test/orquestrador-enforcement-actus.test.ts`, 41 casos, **16 vermelhos antes**,
  cada `it(...)` com o nome ORIGINAL do `test(...)` do Actus. Os 47 casos de
  `test/orquestrador-enforcement.test.ts` (C0 do CI, janela de comentário, ORQ-11, ORQ-12)
  continuam verdes SEM edição.
  *O que o CI faz diferente:* nada, e o teste prova contra os três configs reais do disco
  (`_referencia-ci/`, `fixture/`, `test/fixtures/checkout/`): nenhuma das chaves novas
  existe em nenhum deles, `no_write_tables` é `"TODAS"` nos três, e um `.sql` de artefato
  com DML segue passando com `{ok: true, violations: []}`.
  *Dois guards de teste foram ALARGADOS, com o porquê no arquivo:* "toda chave `para` é
  lida pelo motor" passou a olhar `CHAVES_CONFIG` em vez de só as obrigatórias (as chaves
  novas são lidas e opcionais por desenho), e "TODA chave do config real sobrevive" passou
  de igualdade estrita para SUBCONJUNTO (renome de destino ANINHADO acrescenta chave dentro
  de um objeto existente, que é o que a regra 1 permite).


- **K11a-2 · pré-voo ⚡.** `scripts/orquestrador/prevoo.ts` (porte do `pre-voo.mjs` do
  Actus) + `orq prevoo` (READ-ONLY, GO/NO-GO, um item por linha, rc 1 em NO-GO) +
  `prevoo_ou_sai` no `local-loop.sh`. Três checagens com veredito — spec vendorizada
  presente COM conteúdo e com ≥ 5 arquivos commitados, identidade por origin e
  `ambiente_id`, estrutura da fila com `liberacoes.json` legível — e uma INFORMATIVA:
  a última sondagem de modelo, LIDA de `runs/` (o papel `probe` do `custo.json` e os
  `probe-falha-*`), nunca refeita. Nenhuma chamada paga: a cat.3 do Actus é um
  `claude -p` novo por drenagem, e aqui quem sonda é o `probe_modelos` do executor
  (ORQ-07), que já distingue config errada de ambiente caído. `notificar` saiu de
  dentro do `notificar_fim` (lib.sh) para que o NO-GO use o mesmo canal sem uma
  segunda cópia da entrega.
  *Evidência:* `~/Projetos/actus-saas/scripts/orquestrador/pre-voo.mjs` e
  `pre-voo.test.mjs`, lidos no PASSO 0 (só leitura).
  *Ordem, e é a decisão da peça:* lock → PAUSA → pré-voo → reconcile → drenar. Difere
  do Actus (lá o pré-voo vem antes do lock) por dois motivos escritos no código: quem
  protege o run alheio aqui é o `lock_adquirir`, que sai 0 sem tocar lock nenhum
  quando há outro vivo; e a pausa é a palavra do humano — quem pausou quer silêncio,
  não diagnóstico de ambiente. A propriedade que importa se mantém: em NO-GO nenhum
  TICKET é tocado, porque o primeiro passo que escreve em ticket é o `--reconcile`.
  *Teste:* `test/orquestrador-prevoo.test.ts`, 34 casos — **34 vermelhos antes** (o
  arquivo não coletava: `prevoo.ts` não existia); com o módulo no lugar e o
  `local-loop.sh` de antes, **4 vermelhos**, que são os do driver.
  *O que o CI faz diferente:* uma linha a mais no `local-loop.log` por drenagem.
  Medido contra `~/Projetos/conteudos-infinitos` (só leitura): `GO`, rc 0, quatro
  linhas, `git status` limpo depois. Contra o Actus e o Comarka: **NO-GO cat.0**,
  `docs/orquestrador/skill/EXECUTOR.md` ausente — os dois ainda não têm o motor
  vendorizado, que é o primeiro passo da adoção.


- **K11a-3 · adiamento: os padrões do Actus em `decisao.ts`.** `PADRAO_CAUSA` ganhou os
  seis sinais de AUTENTICAÇÃO do `SINAIS_AUTENTICACAO` do Actus (`failed to
  authenticate`, `authentication_error`, `not authenticated`, `please run /login`,
  `invalid api key` — `oauth session expired` já casava) como causa `sessao`, e
  `service unavailable` / `503` na família `rate_limit`. O `503` entra com borda de
  PALAVRA, e não por substring como no Actus: `15039 tokens` numa saída qualquer
  viraria adiamento.
  *Evidência:* `~/Projetos/actus-saas/scripts/orquestrador/executor.mjs:189-228`, e o
  texto REAL do incidente de 13/08/2026 copiado dos testes de lá, não parafraseado.
  *Teste:* `test/orquestrador-adiamento-actus.test.ts`, 13 casos, **5 vermelhos antes**.
  *O que o CI faz diferente:* nada nos casos que já cobria — `orquestrador-decisao`,
  `orquestrador-trilha` e `orquestrador-envelope` seguem verdes sem edição (84 casos), e
  `test-lib-config.sh` também. Nos casos NOVOS o motor passa a ADIAR onde reprovava, e é
  intencional: adiado não consome retry, e uma sessão caída não é reprovação do trabalho.
  *Duas divergências DELIBERADAS em relação ao Actus, escritas no teste:*
  (1) o GATE DUPLO fica — texto só conta com `rc != 0`. O Actus adia com `code 0`; um
  ticket que MENCIONE "rate limit" ou "invalid api key" no código que escreveu sai com
  rc 0, e adiar por isso é a fila parando por causa do próprio trabalho. O incidente que
  pagou a lição no Actus saiu com `code 1` (`executor.test.mjs:177`), então nada se perde.
  (2) o "stdout vazio COM stderr cheio" do Actus não é exprimível aqui: o `claude_run`
  do kit funde stdout e stderr num arquivo só, então a regra vale para a saída COMBINADA.
  Separar os dois fluxos muda a evidência de `attempt-N/` (CONTRATO §5.3) e é peça
  própria — o que cobre esse buraco hoje é o `probe_modelos`, que o Actus não tem.


- **K11a-4 · o resto do enforcement do Actus: E, F e a exceção de teste-SQL.** Quatro
  peças, quatro commits, e depois delas o Actus não perde regra NENHUMA de enforcement ao
  trocar de motor.
  · **K11a-4a** (`367c2ea`) regra E — `zona_proibida.prefixos_sem_ddl`: CREATE/ALTER/DROP
    de objeto com o prefixo reprova, com tipo próprio de violação. DML no mesmo objeto NÃO
    é desta regra (é C/D), e a separação está num caso. É a MESMA regra que o Comarka pede
    (`trafego_`, `vw_`), então a linha "DDL/TRIGGER/VIEW" da K11b sai fechada junto.
  · **K11a-4b** (`612adac`) regra F — `enforcement.padroes_proibidos_no_diff`, regexes com
    flags inline `(?i)/(?is)`. Por ARQUIVO (não no diff inteiro como o Actus): a violação
    diz onde casou, e um `;` do arquivo A não fecha a cláusula que a regex lia no B. Regex
    que não compila tem tipo PRÓPRIO — config quebrada não pode virar "nenhum padrão casou".
  · **K11a-4c** (`4c39821`) a exceção estreita — `enforcement.testes_sql.glob` diz quem
    ENTRA, e as 4 condições do `checarTesteSql` decidem. O glob descreve o DIRETÓRIO e não
    o sufixo: estreitá-lo a `*.test.sql` deixaria a condição 1 (o nome) inalcançável.
    Arquivo que entra sai da regra B e responde pelas 4 condições no lugar.
  · **K11a-4d** (`c484de1`) `migrations_dir → migrations.dir` com `so_quando` — o renome
    que só vale para quem declarou `migrations_faixa_loop`. Fecha o achado do `--dry-run`
    da etapa 6 sem desfazer a decisão que o motivou: quem pede a regra B é a FAIXA, o dir
    só diz onde ela vale, e o CI segue com a regra desligada.
  *Evidência:* `~/Projetos/actus-saas/scripts/orquestrador/enforcement.mjs:117-187` (a
  exceção), `:270-287` (E e F) e os casos correspondentes do `enforcement.test.mjs`, todos
  só leitura. `test/fixtures/config/actus-000-config.json` é o `000-config.json` vivo de lá
  copiado byte a byte (`cmp` + cksum na PROCEDENCIA.md).
  *Teste:* `test/orquestrador-enforcement-actus.test.ts`, de 41 para **103 casos**, cada
  `it(...)` com o nome ORIGINAL do `test(...)` do Actus. **43 vermelhos antes**, somados as
  quatro peças (7 + 13 + 18 + 5). Os 47 casos de `test/orquestrador-enforcement.test.ts`
  continuam verdes SEM edição.
  *O que o CI faz diferente:* nada, e o teste prova contra os três configs reais do disco —
  nenhuma das chaves novas existe em nenhum deles, e um `.sql` de teste sem
  `enforcement.testes_sql` cai na regra B como qualquer outro. **Com uma exceção NOMEADA:**
  `zona_proibida.no_write_prefixes` EXISTE no config do CI e no template, então migrar
  esses configs LIGA a regra E com os prefixos que eles próprios declaram. A regra 3
  (`no_write_tables: "TODAS"`) não cobre DDL — o "redundante" do comentário do CI descreve
  uma redundância que não existe. Está na tabela, na linha do `--dry-run` e num caso.
  *Achado:* a `zona_proibida` REAL do Actus não tem `no_write_paths` (ela é fronteira de
  BANCO), e o spread de `undefined` derrubava o `enforce` inteiro com TypeError antes de
  qualquer regra rodar. A chave não é obrigatória em `config-chaves.ts`: o config estava
  certo e o motor errado.
  *Medido:* `instalar.sh --atualizar ~/Projetos/actus-saas --migrar --dry-run` (nada
  escrito) — 7 renomes, e o `orq config` sobre o proposto saiu de 15 para 14 violações,
  todas placeholders de decisão local.


- **G · gate `tipo: baseline` com direção, contagem e preparo.** `gates.ts` ganhou
  `direcao: "max" | "min"` (padrão `max`), `contagem_regex` (sem grupo de captura conta
  LINHAS; com grupo, SOMA os números — um placar por bloco) e `preparo: [...]`, rodado
  antes do `cmd` com o rc IGNORADO (é higiene, não verificação: a lição do Comarka é que
  baseline medido com cache mente).
  *DEFEITO achado e consertado no caminho:* em `direcao: max` quem decide passou a ser a
  CONTAGEM, não o exit code. Um `tsc` com 3 erros herdados SEMPRE sai != 0, então exigir
  exit 0 junto tornava todo `baseline > 0` impossível de satisfazer — em silêncio. O CI
  nunca viu porque os dois baselines dele são 0, onde as duas leituras coincidem. Com o
  conserto veio o guard do gate MUDO: exit != 0 com contagem ZERO reprova, porque é o
  comando que falhou por outro motivo. Em `direcao: min` o exit code continua valendo —
  ali a contagem mede sucesso, e placar alto não desfaz o que quebrou.
  *Evidência:* o gate real do Comarka (`{"nome":"tsc","tipo":"tsc_baseline","baseline":3}`),
  lido no PASSO 0. E um ACHADO que virou item de `PROPRIAS_DE_REPO`: o `gate_tsc` de lá
  (`executor.sh:119-125`) não conta nada — filtra por `baseline_scope_regex` e reprova se
  sobrar erro FORA do escopo. O `baseline: 3` é documentação naquele repo, e traduzir para
  contagem muda o SIGNIFICADO do gate. Fica registrado para decisão humana.
  *Teste:* `test/orquestrador-gate-baseline.test.ts`, 21 casos, **10 vermelhos antes**. O
  gate do Comarka em fixture passa com 3 erros e falha com 4.
  *O que o CI faz diferente:* nada — nenhum gate dele declara `direcao`, `contagem_regex`
  ou `preparo`; os dois `baseline: 0` seguem com a MESMA mensagem de motivo, byte a byte
  (`1 erro(s) de tipo, baseline 0`); e `ACEITA placar MAIOR que o baseline` continua indo
  pelo caminho do `baseline_placar`, que esta peça não toca. Os 29 casos de
  `orquestrador-gates.test.ts` seguem verdes sem edição.


- **D10 · o ticket é o PRIMEIRO bloco ```json.** Divergência 10 do `CONTRATO.md`,
  FECHADA. `lib.sh:ticket_json` deixou de CONCATENAR todos os blocos (com dois, o
  resultado não parseava e o `jq` derrubava o preflight do run inteiro) e passou a ler
  só o primeiro; `ticket_set` deixou de reescrever mais de um (com dois blocos ele
  DESPEJAVA o JSON do ticket por cima do exemplo da prosa); `gate-ticket.ts` e
  `fila-read.ts` já liam o primeiro e não mudaram; `migrar-tickets.ts` deixou de PULAR
  e passou a NOTAR; o `CONTRATO.md` §2 diz PRIMEIRO.
  *Por que o primeiro, e não o último que a §2 dizia:* dois dos três leitores já liam o
  primeiro, e o ticket abre o arquivo. Um bloco JSON no meio da prosa é exemplo de
  payload — coisa que todo ticket sobre API descreve —, e "vale o último" transforma
  qualquer exemplo colado no fim numa troca silenciosa da fonte de verdade da máquina.
  *De quebra:* a cerca passou a ser comparada SEM o espaço em volta também no `lib.sh`,
  como os dois leitores de TS já faziam (`linha.trim() === '```json'`). Três leitores
  que concordam sobre qual bloco e discordam sobre o que é uma cerca não concordam.
  *Teste:* `test/orquestrador-dois-blocos-json.test.ts`, 13 casos, **8 vermelhos antes**,
  com uma fixture que tem o bloco de máquina e um segundo bloco no meio da prosa: os
  três leitores devolvem o MESMO objeto, a migração renomeia no primeiro e o segundo
  sai byte a byte igual.
  *Uma asserção antiga foi REVERTIDA, com o porquê escrito no arquivo:* o caso "DOIS
  blocos: pulado" da K8b-5 virou "migra o PRIMEIRO e NOTA o segundo". Quando ele foi
  escrito, o motor discordava de si mesmo e recusar era o certo; agora a migração
  seguiria o motor, e pular seria a migração discordando dele.
  *O que o CI faz diferente:* nada — nenhum dos 517 tickets dos três repos tem mais de
  um bloco (medido no PASSO 0 da etapa 5), então esta peça muda o comportamento em ZERO
  arquivo vivo. Ela fecha um buraco latente antes de alguém cair nele.


- **T17 · piso de blacklist de ferramentas.** A allowlist continua DERIVADA do ticket
  (peça 0c) e ganha um PISO de negação vindo do config: `proibicoes_absolutas.tools`.
  Ele é passado em `--disallowedTools` na chamada E tirado da allowlist derivada
  (`perfil.ts:filtrarPeloPiso`) — duas trancas para a mesma proibição, de propósito:
  depender só da precedência entre as duas flags é depender de uma regra do CLI que não
  é deste repo. A semente tem as 9 entradas da `DISALLOWED_TOOLS` do Comarka mais
  `Bash(pnpm install:*)`, `Bash(npm install:*)` e `Bash(npm ci:*)`.
  *Motivo do pnpm, medido:* o `node_modules` da worktree é LINKADO para o store do
  checkout principal (`executor.mjs` do Actus, `prepararWorktree`); um install lá dentro
  faz o gerenciador ver "deps fora de sincronia" e PURGAR o store do repo de verdade —
  o dano não é na worktree descartável. O Actus se defende com um `.npmrc` de worktree
  (`verify-deps-before-run=false`, `confirm-modules-purge=false`); o piso é a tranca do
  outro lado, na porta que CONCEDE o poder.
  *Casamento:* prefixo de comando com BORDA. `Bash(npm install:*)` nega `npm install` e
  `npm install --save-dev x`, e NÃO nega `npm installer` nem `npm i`. Tool que não é
  Bash casa por nome exato (`WebFetch`).
  *Evidência:* `~/Projetos/comarka-operacional/scripts/orquestrador/executor.sh:48` e o
  comentário de pnpm do `executor.mjs` do Actus, lidos no PASSO 0 (só leitura).
  *Teste:* `test/orquestrador-piso-tools.test.ts`, 23 casos, **21 vermelhos antes**,
  incluindo o caso novo em que o piso nega mesmo com o critério do ticket PEDINDO
  `npm install --save-dev vitest`.
  *O que o CI faz diferente:* HOJE nada — o `proibicoes_absolutas` dele é um ARRAY de
  prosa, o piso nasce vazio e a flag não é passada; a allowlist derivada sai byte a byte
  igual (provado contra o config real). DECLARADO com a semente, ele passa a negar o que
  já não usava: nenhuma tool da allowlist de hoje cai — também provado.
  *A migração NOMEIA o caso em vez de resolver sozinha:* `porSeFaltar` passou a RECUSAR
  escrever dentro de um segmento que não é objeto, e o relatório diz `NÃO APLICADA ...
  Nada foi apagado`, com a instrução (mover a prosa para `.regras`, acrescentar
  `.tools`). Sem isso a migração trocaria a lista de proibições absolutas por um objeto —
  apagando a coisa mais importante do arquivo para acrescentar uma chave. O template e o
  fixture do kit já nascem com as duas metades.


- **K8b-7 · datar as liberações migradas.** `migrar-liberacoes.ts` ganha `datadorGit`:
  quando o `liberacoes.json` é RASTREADO pelo git, `git log --format='%cs %an'
  -S'<token>' -- <arquivo>` responde quando e por quem cada token entrou, e o commit que
  vale é o MAIS VELHO (o que introduziu), não o mais novo (que é a última vez que alguém
  mexeu na linha). Sem história — arquivo fora do git, `git` ausente, timeout, saída
  ilegível —, `desconhecido` FICA: a migração continua não inventando dado.
  *A busca é pelo token SEM o prefixo `humano:`*, que é acrescentado pela própria
  migração; procurar a forma com prefixo não acharia nada justamente no Actus, o repo
  que grava sem ele.
  *NUNCA sobrescreve dado presente:* data escrita à mão carrega intenção, e a data do
  commit é a data em que o registro foi COMMITADO — parecidas, não iguais. Preenche só o
  buraco, campo a campo.
  *Teste:* `test/orquestrador-datar-liberacoes.test.ts`, 11 casos, **9 vermelhos antes**,
  com um repo git de VERDADE e dois commits reais (datas e autores por
  `GIT_COMMITTER_DATE`, nunca pelo relógio da máquina).
  *O que o CI faz diferente:* os 7 tokens dele estão em v1 canônica e sem data; um
  `instalar.sh --atualizar <ci> --migrar` de novo agora os DATA pelo git. É passo humano
  OPCIONAL e sem efeito no motor — `liberacao_ok` resolve token por token, e nunca lê
  `liberado_em`.


## PENDENTES

- **K6d · `scripts/kit/pureza.sh`.** O grep que TRANCA a pureza: em CÓDIGO (não em
  comentário) de `scripts/orquestrador/**` e `scripts/orq`, zero premissa de repo. As três
  premissas que a etapa 3 nomeou saíram (K6a, K6b, K6c) — falta o script que impede a próxima
  de entrar. Comentário de proveniência pode ficar.
  *Evidência:* inventário §8 item 5. A premissa que ficou no disco, com comentário no lugar:
  `executor.sh`, o loop de `.env.local` (`for d in "" apps/web`) — generalizá-lo para os
  pacotes detectados passaria a linkar `.env.local` em pacote que hoje não recebe link,
  mudança de comportamento que K6a não pediu. Nenhuma outra apareceu por grep até aqui, e é
  justamente o script que transforma "não achei" em "não há".
  *Teste:* pureza = 0 em código, com o caso NEGATIVO de que um `apps/web` reintroduzido em
  código faz o script sair 1.

- **K8e · os testes que ainda não viajam.** Três baldes, achados da K8d, cada um com uma
  saída diferente. (i) Os 17 re-apontados para `FX_CHECKOUT`/`test/fixtures/checkout` nas
  peças K3/K7b: a saída é a mesma da K8d — ler o config REAL do checkout quando existe, como
  `configDeReferencia()` já faz —, arquivo a arquivo, e cada um entra na lista de
  `scripts/kit/vendorizado.sh` quando passar dentro do fixture. (ii) `orq-cli.test.ts` e
  `orquestrador-observabilidade.test.ts`: hardcodam `US$ 50` e `typecheck_root`/`typecheck_web`,
  valores do config do CI; a saída é ler do config sob teste, e é a mesma cirurgia da K6b
  (nome de gate do repo não é constante de motor). (iii) `orquestrador-launchd-config.test.ts`
  + `test/fixtures/bin/` e `orquestrador-trilha-gate-papel.test.ts`: dependem de
  `scripts/kit/fixture.sh`, `_referencia-ci/` e `fixture/` — são testes DO KIT e a decisão é
  que fiquem, não que viajem.
  *Evidência:* a medição da K8d, no CHANGELOG 2.1.0-dev, etapa 4.
  *Teste:* o mesmo (h3) de `scripts/kit/test-instalar.sh` — `npx vitest run` dentro do repo
  atualizado sai 0 com o arquivo na lista; e o NEGATIVO de que ele falhava lá antes.

- **Gate valida pelo schema.** `gate-ticket.ts` valida contra `schemas/ticket.schema.json`
  em vez dos checks escritos à mão. NÃO foi feito na K9 por decisão: trocar o motor do gate
  na mesma peça que escreve o documento juntaria duas mudanças com raios de alcance muito
  diferentes — o documento não pode reprovar ticket nenhum, o gate reprova.
  *Evidência:* `CONTRATO.md` §10, divergência 3; `gate-ticket.ts:361-461`, os checks 2 a 8
  escritos um a um. O schema já é fiel: rodado contra a fila real do CI, 76 tickets, 0
  violações.
  *Teste:* os mesmos casos de `test/orquestrador-gate-ticket.test.ts` continuam verdes com o
  validador trocado, mais o NEGATIVO de que um campo novo no schema passa a reprovar sem
  edição de código.

- **K10b · a triagem das outras 114 lições do PLAYBOOK do CI.** A K10 trouxe 15, pelo
  critério escrito em `doutrina/templates/PLAYBOOK-seed.md` (mecanismo · paga · muda o que
  alguém faria). As demais são locais, já estão na SKILL.md, ou são variações — e cada uma
  precisa dessa classificação escrita, não presumida.
  *Evidência:* `_referencia-ci/PLAYBOOK.ci.md`, 129 sub-lições entre 01 e 08/set/2026.
  *Teste:* o mesmo `test/doutrina-v2.test.ts` — nenhuma lição triada carrega detalhe local
  do repo de origem, e toda uma traz data e origem.

- **K11b · o que falta do COMARKA (refinada com o que o PASSO 0 da etapa 6 mostrou).** A K11
  original juntava Actus e Comarka; o lado do Actus saiu inteiro nas peças K11a-1/2/3 e K11a-4.
  O que resta é do Comarka, e o PASSO 0 mostrou que DUAS das quatro
  linhas já estavam cobertas:
  · **C0 por tabela — JÁ COBERTO pela K11a-1.** O `c0_intocavel` do Comarka tem a mesma forma de
    `zona_proibida` (`no_write_tables`, `no_write_prefixes`, `os_owned_excecoes`) mais duas listas
    próprias. A regra C nova lê `no_write_tables` como LISTA, que é exatamente o que o C0 é. O que
    falta é uma DECISÃO, não código: `config-tabela.ts` não renomeia `c0_intocavel` para
    `zona_proibida` — mover a fronteira do enforcement por semelhança de nome é a mudança mais cara
    que uma migração automática poderia fazer errado.
  · **janela de comentário — JÁ COBERTA, e antes desta etapa.** `test/orquestrador-enforcement.test.ts:106`
    exercita a mutação na janela seguinte ao `.from()` (encadeamento em várias linhas), e a regra C
    nova trabalha sobre o BLOCO de linhas do arquivo, não sobre a linha solta.
  · **DDL/TRIGGER/VIEW e `no_write_prefixes` — FEITO na K11a-4a.** Era a regra E do Actus e o
    `no_write_prefixes` do Comarka (`trafego_`, `vw_`): a MESMA regra, com dois donos. O motor lê
    `zona_proibida.prefixos_sem_ddl` e a tabela COPIA o valor para lá. O que sobra do Comarka aqui
    é a mesma decisão do C0: a tabela não move `c0_intocavel` para `zona_proibida` sozinha, então
    os prefixos de LÁ (que moram dentro do `c0_intocavel`) continuam esperando essa decisão.
  · **`perfis_tools` como mapa opcional — FALTA.** `toolsForPerfil` (`perfil.ts:213`) já existe e já
    recebe o mapa por parâmetro; ninguém o chama. O que falta é o executor ler `perfis_tools` do
    config e o `perfil` do ticket. Com a T17, o piso passa a valer DEPOIS do perfil escolhido.
  · **gate streak (`gate_streak_limite`) — FALTA, e é conceito novo.** Contagem de reprovações
    seguidas antes de parar a frente; o motor do kit não tem nada equivalente.
  *Evidência:* o PASSO 0 da etapa 6 — `c0_intocavel` e `perfis_tools` no
  `~/Projetos/comarka-operacional/docs/fila/000-config.json`, `executor.sh:46-48` (as duas listas de
  tools) e `:119-125` (o `gate_tsc` por escopo), todos só leitura.
  *Teste:* um caso por linha, com o config REAL do Comarka em fixture — e, para o C0, o NEGATIVO de
  que a migração NÃO move `c0_intocavel` sozinha.

- **1b · o gate executa o que hoje só lê.** `alvo` que já passa contra HEAD, `guarda` que já falha,
  `recon[]` — em worktree descartável com timeout.
  *Evidência:* inventário §4 decisão 9 (o validador recusa `alvo` que já passa e `guarda` que já
  falha) — hoje o gate lê esses campos sem executá-los.
  *Teste:* caso bom e caso mau por campo, com o timeout provado.

- **1c · gate no loop e checks que faltaram.** O `drenar` roda o gate no próximo pendente antes de
  gastar agente (violação = `bloqueado` com nota e evento na trilha); sobreposição de allowlist por
  glob, não por igualdade de string; "migration nunca depende do próprio token";
  `gate_ticket.modo_prefixo: isentar | exigir`; `contar_eventos` casando `( |$)` depois do nome do
  evento.
  *Evidência:* inventário §5 (linha do validador de ticket).
  *Teste:* um caso por check, mais o NEGATIVO do gate barrando antes do agente.

- **K12 · painel.** `orq-server.py` + `orq-painel.py` do Comarka entram como `painel/`, refatorados
  para ler só o contrato (STATUS, events, custo, liberacoes v2, PAUSAR, tickets); `LABELS` →
  `~/.orq/repos.json`; ações via `orq`; notificação nativa desligada; zero `if repo`.
  *Evidência:* inventário §4 decisão 18, §6 item 6 (1.935 linhas Python, dois scripts, mora dentro
  do Comarka e ainda notifica o macOS).
  *Teste:* o painel lê um repo de fixture sem nenhum ramo por nome de repo.

- **K12a · alarme de job carregado e mudo** (peça K6e item (e); NÃO implementar antes de K12).
  O painel alarma quando, para um repo do `~/.orq/repos.json`, o job do launchd está
  CARREGADO e uma das duas condições vale: `last exit code` != 0 no `launchctl print`, ou a
  última linha `DRENAGEM_FIM` de `runs/events.log` é mais velha que 2× o
  `launchd.start_interval` do config daquele repo. As duas, porque medem coisas
  diferentes: a primeira pega o tick que morre antes de escrever (`rc 127`), a segunda
  pega o loop que roda e não conclui.
  *Evidência:* o incidente de 2026-09-08 (`docs/PLAYBOOK.md`): 1h40 com o job carregado,
  três ticks em rc 127, `launchd.log` nunca escrito, e a detecção veio de um `launchctl
  print` humano. "Carregado" foi lido como "saudável" porque nada media o contrário.
  *Teste:* dois fixtures de estado, sem launchd real (o `print` vem do stub da K6e,
  `test/fixtures/bin/launchctl`, cuja saída plausível o teste sobrescreve por caso):
  (a) `last exit code = 127` + trilha recente → alarma, e a mensagem diz `rc`;
  (b) `last exit code = 0` + `DRENAGEM_FIM` de 3× `start_interval` atrás → alarma, e a
  mensagem diz há quanto tempo; mais os dois NEGATIVOS — job carregado, rc 0 e drenagem
  dentro da janela → silêncio; job NÃO carregado → silêncio (repo desagendado de
  propósito não é incidente).

- **K13 · python → TS.** `scripts/roadmap/lint-mapa.py` vira TS; triagem de `orq-telemetria.py`,
  `orq-granularidade.py`, `orq-contrato.py` e `gera_tickets.py` (Comarka) na fase do Comarka.
  *Evidência:* inventário §4 decisão 19 (só o painel fica em Python).
  *Teste:* os 10 checks do lint, um a um, no TS.

- **K14 · driver em Node.** Reescrita de `executor.sh`, `local-loop.sh` e `lib.sh` em TS, com os 25
  cenários de drenagem do Actus como spec (órfão, lock roubado, morte do executor, auth quebrada,
  claude mudo, cooldown, infra aborta a fila). Só depois de K5 a K11.
  *Evidência:* inventário §4 decisão 1 (driver em Node = peça 2 do kit) e §5 (os 25 cenários viram
  a spec).
  *Teste:* os 25 cenários.

- **K15 · job único de launchd.** `com.comarka.orq.loop` lendo `~/.orq/repos.json`, lock global,
  `max_tickets_por_passada`, NO-GO num repo pula para o próximo; plists por repo saem na adoção.
  *Evidência:* inventário §4 decisão 5, §6 item 14 (plists `.bak`/`.repo-noturno` soltos).
  *Teste:* dois repos no `repos.json`, NO-GO no primeiro, o segundo drena.
