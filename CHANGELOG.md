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
