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
