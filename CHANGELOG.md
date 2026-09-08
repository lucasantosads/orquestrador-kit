# CHANGELOG

## 2.1.0-dev · 2026-09-08

- Importa o harness do conteudos-infinitos @711ab5e (peças 0 a 13 e peça 1). Ver ORIGEM.md.
- Já VERIFICA uma instalação (`instalar.sh --verificar`) e já INSTANCIA um repo de fixture
  (`scripts/kit/fixture.sh`). Instalar de verdade (`--novo`/`--atualizar`) é K8.

### Etapa 1 — o kit fica de pé (roda os próprios testes, sem o checkout do CI)

- **K1** `9f9e807` — toolchain do kit: package.json, vitest.config.ts, tsconfig.json,
  .gitignore e package-lock. devDependencies com os mesmos ranges do CI; nenhuma
  dependência de runtime.
- **K2** `71cc719` — `test/fixtures/orq-harness.ts` copiado do CI @711ab5e, byte-idêntico
  (blob `db20a21a`). `test/db.ts` não entra: não existe no CI.
- **K3** `617d6ba` — vitest verde: 24 arquivos, 604 passam, 8 em quarentena
  (`docs/QUARENTENA.md`), `tsc --noEmit` limpo. `FX_CHECKOUT` é o checkout mínimo de
  fixture que faz o papel do repo instalado. Zero mudança em `scripts/orquestrador/**`.
- **K4** — `docs/PECAS.md` com o backlog K5→K15, e esta seção.

Ainda vermelho, por falta da fixture de repo (K7): `test-lib-config.sh`,
`test-drenagem.sh` e `test-retry-worktree.sh`, todos rc 2 — os três precisam de um
checkout com `docs/fila`.

### Etapa 2 — o kit instancia um repo e prova uma instalação

- **K7a** `4500bb2` — `fixture/` (template do repo mínimo) e `scripts/kit/fixture.sh`
  (instanciador). O fixture nasce em `/tmp/orq-fixture-XXXXXX/repo`, com o motor
  vendorizado dentro (`scripts/orquestrador/`, `scripts/orq`, `scripts/roadmap/`,
  `doutrina/` → `docs/orquestrador/skill/`, mais o carimbo `VERSAO`), `node_modules` por
  symlink, `main` + `staging-auto` e um origin FALSO (`example.invalid`, RFC 2606) que
  nunca recebe push. O `000-config.json` é mínimo por levantamento no disco: só as chaves
  que o motor lê, cada uma com um comentário `_<chave>` dizendo de onde veio o valor.
- **K7b** `67c485e` — as 8 quarentenas de K3 voltam a `it` e passam; `npx vitest run` sai
  **612 passam, 0 skipped**. O harness ganhou `checkoutReal()`, que instancia o fixture uma
  vez por arquivo de teste e o remove no `afterAll`. Nenhuma asserção foi tocada — só o
  caminho: qual `lib.sh`, qual `cwd`, qual `docs/fila/runs`. `scripts/kit/test-shell.sh`
  encadeia `test-lib-config.sh`, `test-drenagem.sh` e `test-retry-worktree.sh` contra o
  fixture: rc 0 nos três (saíam rc 2). `test-preflight.sh` fica fora: chama a API.
- **K5** `0f023a6` — `instalar.sh --verificar <repo>`: `diff -rq` do motor do kit contra o
  vendorizado no repo, ignorando plist instanciado, `runs` e `VERSAO`; `idêntico ao kit
  <VERSAO>` com rc 0, ou `diferente` / `só no kit` / `só no repo` com rc 1. `--novo` e
  `--atualizar` dizem "ainda não: peça K8" e saem 2. `scripts/kit/test-instalar.sh` roda os
  três casos. Contra `~/Projetos/conteudos-infinitos`: `repo sem VERSAO` + idêntico, rc 0.

- **K7-e2e** — o fixture ATRAVESSOU o loop, com OK humano, em 2026-09-08. A peça não muda
  código: a evidência é a execução, registrada aqui e no `docs/PECAS.md`.
  Uma drenagem de 52 s: ticket 001 `done`, merge em `staging-auto` (`5d7c32d`), evento
  `APROVADO` na trilha, uma tentativa e zero retry. Custo real US$ 0,369 (probe 0,0855 +
  executor 0,1967 + juiz 0,0871) contra `usd_ticket` 1. Nenhum push — o origin é
  `example.invalid` e o loop nem tentou.
- **1d** `e4a6874` — peça aberta (não é conserto): o guard de CLI do `gate-ticket.ts`
  compara `import.meta.url` com `argv[1]` sem `realpath`, e chamado por caminho com symlink
  sai rc 0 com stdout vazio — gate mudo. Contornado no kit, a consertar no motor.

Achado que o e2e mediu e que ficou com K6: `event_gate` monta a linha `GATE` da trilha
procurando gates por nome fixo do monorepo do CI, então a trilha gravou
`typecheck=nao-rodou testes=nao-rodou build=nao-rodou` para gates que o `gates.txt` do mesmo
attempt registra como `ok`. Não derruba o run; faz a trilha mentir.

### Etapa 3 — o motor muda pela primeira vez, e o CI recebe o kit

- **K5b** — `instalar.sh --verificar` passa a cobrir `scripts/roadmap/`. Aquele diretório é
  motor vendorizado (`orq mapa lint` roda `python3 scripts/roadmap/lint-mapa.py` a partir do
  MAIN_CHECKOUT, `scripts/orq:226`) e o `fixture.sh` já o copiava; o verificador não o via, e
  um `lint-mapa.py` desatualizado no repo passava por "idêntico". Caso (d) do
  `scripts/kit/test-instalar.sh` prova o vermelho-antes.
- **K8a** — `instalar.sh --atualizar <repo> [--dry-run] [--forcar]`: copia o motor do kit
  por cima do de `<repo>` (`scripts/orquestrador/` sem plist instanciado, `scripts/orq`,
  `scripts/roadmap/`, `doutrina/` → `docs/orquestrador/skill/`) e carimba o `VERSAO`. É `cp`,
  não `rsync --delete`: nada que só exista no repo é apagado — sobra como `só no repo` no
  `--verificar` que ele imprime no fim, junto da linha de commit por pathspec. Não toca
  `docs/fila/**` (migrações são K8b). Três recusas com rc 1: loop não pausado, `STATUS.md`
  que não diz `ocioso`, motor do repo com modificação não commitada — só a terceira cede a
  `--forcar`. Casos (e) e (f) do `test-instalar.sh`.
- **K6a** — `executor.sh`: monorepo por DETECÇÃO, não por nome. `pacotes_do_checkout` lista
  todo diretório do checkout principal com `node_modules` próprio (a raiz incluída,
  aninhados de dependência excluídos) e é essa lista que `limpa_cache_vite` e o novo
  `linkar_node_modules` percorrem — no lugar do `for d in "" apps/web services/*/`, que era a
  árvore do conteudos-infinitos escrita dentro do motor. `LC_ALL=C sort` reproduz a ordem
  antiga item a item. Contra o checkout real do CI as duas listas saem idênticas: o CI não
  faz nada diferente.
- **K6b** — `executor.sh`: a linha `GATE` da trilha passa a sair do RESULTADO dos gates, não
  do nome deles no monorepo do CI. Cada gate do config tem um PAPEL (`typecheck` | `testes` |
  `build` | `lint`), declarado por `"papel"` ou inferido do nome; `papel_marca` combina todos
  os gates daquele papel. Vocabulário novo: `nao-configurado` (o repo não tem gate com esse
  papel) — `nao-rodou` volta a significar só o que sempre devia. `lint=` é campo condicional,
  para não mexer na linha de quem não tem lint. `typecheck_marca` (que casava
  `typecheck_root`/`typecheck_web` por nome) sai. Com o config do CI e o
  `test/fixtures/runs-201/attempt-2.gates.txt`, a linha é byte a byte a de hoje.
- **K6c** — `com.conteudos.orquestrador.plist.template` vira `com.orquestrador.plist.template`,
  com `{{LABEL}}`, `{{CHECKOUT}}`, `{{NODE_DIR}}` e `{{START_INTERVAL}}`;
  `instalar-launchd.sh` lê `launchd.label` e `launchd.start_interval` do
  `docs/fila/000-config.json` e ganha `--dry-run`. Sem `launchd.label`: rc 1 com
  "defina launchd.label no config; o CI usa com.conteudos.orquestrador". Não inventa label —
  label inventado não dá erro, dá um segundo job carregado ao lado do antigo. Chave nova
  documentada em `fixture/docs/fila/000-config.json` e `doutrina/templates/config.json`.
- **1d** — CONSERTADO no motor: o guard de CLI do `gate-ticket.ts` compara os dois lados com
  `realpathSync`. Antes, `resolve(argv[1])` não resolvia symlink e o `import.meta.url` vinha
  fisicamente resolvido: chamado por caminho com symlink (macOS `/tmp` → `/private/tmp`), o
  gate saía 0 com stdout VAZIO — indistinguível de gate que aprovou. Com o conserto, o
  contorno do `scripts/kit/fixture.sh` (`pwd -P`) saiu, e o fixture voltou a nascer sob
  caminho com symlink: é o que expõe qualquer regressão dessa família.
- **K7c** — `scripts/kit/fixture-e2e.sh` preserva a evidência ANTES de qualquer outra coisa:
  `preservar_evidencia` copia `docs/fila/runs/<id>/attempt-*/` inteiro, `events.log` e
  `custo.json` para `docs/e2e/<AAAA-MM-DD-HHMM>-<id>/` no kit, renomeando `*.log` para
  `*.log.txt` (o `.gitignore` do kit barra `*.log`), e imprime o caminho. O `.gitignore` não
  muda: abrir exceção para `docs/e2e/**` valeria para todo log futuro, inclusive o que
  ninguém revisou. O script ganhou modo `ORQ_E2E_SOURCED=1` para o teste
  (`test/kit-e2e-evidencia.test.ts`) exercitar a preservação sem gastar nada.
- **A evidência bruta do run de 2026-09-08 11:54 NÃO foi preservada.** O fixture morava em
  `/tmp` e foi removido: os `attempt-*/` daquele run — `gates.txt`, `criterios.txt`,
  `enforcement.json`, `meta.json`, prompt, diff, veredito cru do juiz — não existem mais e não
  voltam. Sobrou o `custo.json`; o `events.log` estava no disco mas fora do git (`*.log`), e
  foi resgatado agora como `events.log.txt`. O resto daquele attempt só sobrevive no que foi
  copiado à mão para a mensagem do commit `8525c49` e para `docs/PECAS.md`. É essa perda que
  a peça K7c existe para não repetir; a procedência está em
  `docs/e2e/2026-09-08-1154-001/PROCEDENCIA.md`.

### Etapa 4 — o contrato escrito, e o instalador que não pode ser sequestrado

- **K6e** — nenhum teste do kit toca o launchd desta máquina. `test/fixtures/bin/launchctl`
  é um STUB que grava uma linha por chamada em `$ORQ_LAUNCHCTL_LOG` e sai 0 (`print` e
  `bootout` devolvem saída plausível para o script sob teste seguir o mesmo caminho de
  código); `comLaunchctlStub()` no harness o põe na frente do PATH e troca o `HOME` por um
  tmp descartável. `instalar-launchd.sh` RECUSA instalar (rc 1) quando o checkout resolvido
  está sob `/tmp`/`/private/tmp` (logico E fisico) ou quando `ORQ_TESTE=1`, salvo
  `--permitir-tmp`; `--dry-run` continua funcionando nesses casos, e argumento desconhecido
  agora sai 2 em vez de ser ignorado. `scripts/kit/test-instalar.sh` e
  `scripts/kit/fixture-e2e.sh` exportam `ORQ_TESTE=1`, com UMA exceção nomeada: o
  `local-loop.sh` da drenagem do e2e roda com `env -u ORQ_TESTE`, porque
  `escrita_de_teste_permitida` (`lib.sh:168`) recusaria a trilha do próprio fixture — medido:
  com a variável ligada e `ORQ_EXEC_ROOT` vazio, `event` grava 0 linhas e loga a recusa.
  `docs/PLAYBOOK.md` do kit nasce com o incidente de 2026-09-08 (job do CI apontando para
  `/private/tmp/orq-fixture-6qRp23` das 12:24 às 14:05, três ticks em rc 127, detecção humana).
  O alarme que faltava virou peça K12a em `docs/PECAS.md`, com o teste que prova.
  *O que o CI faz diferente:* nada. O instalador do CI só ganha uma recusa que o checkout
  dele nunca dispara (`~/Projetos/conteudos-infinitos` não está sob `/tmp` e o CI não roda
  com `ORQ_TESTE=1`).
- **K8c** — a recusa 3 do `--atualizar` (modificação não commitada no motor) passa a conferir
  também `scripts/roadmap/`. Desde a K5b o `--atualizar` ESCREVE ali, mas a recusa continuava
  com os três caminhos que a K8a enumerava: um `lint-mapa.py` modificado e não commitado era
  a única coisa que o instalador apagava sem avisar. Escrever e vigiar são a mesma lista
  agora. *O que o CI faz diferente:* nada — o `scripts/roadmap/` do CI está limpo no git; a
  recusa só dispara para quem tem trabalho pendurado ali, e `--forcar` continua sendo a única
  saída, com aviso.
- **K8d** — os testes de harness passam a viajar com o motor. `--verificar` e `--atualizar`
  cobrem uma lista ENUMERADA (`scripts/kit/vendorizado.sh`, sourceada também pelo
  `scripts/kit/fixture.sh`, para que instalar e instanciar vendorizem o mesmo conjunto):
  `test/fixtures/orq-harness.ts`, 6 `test/*.test.ts` e 3 fixtures de dados. Nada de glob
  sobre `test/`: teste do PRODUTO não é tocado nem listado. O `criarFixture` do harness
  voltou a ler o config REAL do checkout quando ele existe (`configDeReferencia()`), com o
  `FX_CHECKOUT` como fallback — sem isso o harness era intransportável: instalado num repo,
  passaria a assegurar sobre o config do KIT em vez do config daquele repo.
  *ACHADOS (medidos, não opinados):* dos 27 arquivos de teste candidatos, 17 diferem do CI
  por terem sido re-apontados para fixtures do kit em K3/K7b; 2 são byte-idênticos ao CI e
  ainda assim não viajam porque hardcodam valores do CI (`orq-cli.test.ts:205,237` cobra
  `US$ 50`, o `usd_dia` do CI; `orquestrador-observabilidade.test.ts:216-217` cobra os gates
  `typecheck_root`/`typecheck_web`, os nomes que a K6b tirou do motor); 3 dependem de
  `scripts/kit/fixture.sh`, `_referencia-ci/` ou `test/fixtures/bin/`, que o repo instalado
  não tem. Peça K8e registrada em `docs/PECAS.md` para destravá-los.
  *O que o CI faz diferente:* o `--atualizar --dry-run` contra `~/Projetos/conteudos-infinitos`
  passa a listar `diferente test/fixtures/orq-harness.ts` e `só no kit
  test/orquestrador-pacotes.test.ts`. O harness do kit não REMOVE nada do harness do CI: o
  bloco de 5 linhas que sai virou a função `configDeReferencia()`, que num repo com
  `docs/fila` lê o mesmo arquivo de antes.
- **K9** — `CONTRATO.md` na raiz do kit e `schemas/{ticket,liberacoes}.schema.json` +
  `schemas/motivo_categoria.json`. O contrato é DESCRITIVO: cada afirmação traz o arquivo e a
  linha de onde saiu, e o que o código não faz está na §10 "Divergências conhecidas" — 9
  itens, cada um com a peça que o fecha — em vez de aparecer como se fosse feito. Vocabulário
  de eventos fechado em 19; a linha `GATE` documentada com os quatro valores
  (`ok`/`falha`/`nao-rodou`/`nao-configurado`) e os dois campos condicionais (`lint=`,
  `fora_do_pathspec=`). O schema de ticket foi RODADO contra a fila real: 76 tickets do CI e
  1 do fixture, 0 violações. Os 8 baldes de `motivo_categoria` vieram do disco do
  comarka-operacional (`orq-telemetria.py:78`), com a origem registrada dentro do arquivo —
  eles não existem em `_referencia-ci/`. `gate-ticket.ts` NÃO passa a validar pelo schema
  nesta etapa: é peça própria, registrada em PENDENTES.
- **`orq versao` e `orq config`** — dois verbos de leitura no `scripts/orq`.
  `orq versao [--kit <dir>]` imprime o carimbo do repo e, quando há kit, compara — avisando
  que carimbo igual não é motor idêntico. `orq config` valida `docs/fila/000-config.json`:
  placeholder `<...>` (o valor tem de SER um, não apenas mencionar um), chave obrigatória
  ausente com o arquivo:linha de onde o motor a lê, gate sem papel inferível e sem `papel`
  declarado (exceto `tipo: preparacao`, que não verifica nada), `gates` sem `nome`.
  `scripts/orquestrador/config-chaves.ts` traz as 49 chaves levantadas por grep, 40 delas
  obrigatórias; `scripts/orquestrador/config-cli.ts` é o validador.
  *Dois defeitos consertados no caminho:* o `orq` INTEIRO saía rc 5 com config ilegível (o
  `lib.sh` lê o config no carregamento e `set -e` derruba tudo) — `orq config` passou a ser
  despachado antes do `source`, resolvendo o caminho do config sem ele; e o validador acusava
  o gate `limpeza_artefatos` do CI, que é preparação e corretamente não tem papel.
  *O que o CI faz diferente:* nada. `orq config` rodado contra
  `~/Projetos/conteudos-infinitos` (só leitura) sai **0 violações, rc 0** — o `launchd.label`
  que a K6c tornou obrigatório já está lá.

Passos humanos que faltam para o CI receber este motor (não são desta sessão):
`launchd.label: com.conteudos.orquestrador` no `000-config.json` do CI; `orq pausar`;
`--atualizar --dry-run`, `--atualizar`, `npx vitest run` no CI, `--verificar` idêntico; apagar
lá o `scripts/orquestrador/com.conteudos.orquestrador.plist.template` (o `--atualizar` não
apaga nada, então o template velho fica ao lado do novo); commit por pathspec; `orq retomar`;
push. Ver `~/orq-sessoes/relatorio-kit-etapa3.md`.
