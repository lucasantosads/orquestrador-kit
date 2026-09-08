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

## PENDENTES

- **K5 · `instalar.sh --verificar`.** `diff -r` entre `scripts/orquestrador/**`, `scripts/orq` e
  `doutrina/` do kit e `scripts/orquestrador/**`, `scripts/orq` e `docs/orquestrador/skill/` de um
  repo, ignorando o plist instanciado e `runs/`; imprime `idêntico ao kit <VERSAO>` ou a lista de
  diferenças; rc 0 ou 1.
  *Evidência:* inventário §4 decisão 2 (vendorizado por cópia, hash conferido no pré-voo) e §8
  pronto-quando. O mapa origem→destino já está em `ORIGEM.md`.
  *Teste:* contra o checkout do CI em 711ab5e devolve idêntico.

- **K6 · pureza.** `scripts/kit/pureza.sh`: grep em CÓDIGO (não em comentário) de
  `scripts/orquestrador/**` e `scripts/orq` por premissa de repo. As duas reais hoje:
  (a) diretórios do monorepo fixos no `executor.sh` (`apps/web`, `services/*/`, linhas 219, 240 e
  247) → viram `toolchain.pacotes` no config, ou leitura dos `workspaces` do `package.json`;
  (b) nome e label do plist template (`scripts/orquestrador/com.conteudos.orquestrador.plist.template`)
  → `com.orquestrador.plist.template` com `{{LABEL}}`, e `instalar-launchd.sh` deriva o label do
  config.
  *Evidência:* inventário §8 item 5; as linhas citadas, no disco.
  *Teste:* pureza = 0 em código; comentário de proveniência pode ficar.

- **K7 · fixture.** `fixture/`: repo mínimo (package.json + vitest + um ticket trivial +
  `000-config.json` schema 2) que atravessa o loop ponta a ponta localmente, sem push. É onde
  `--novo` é exercitado.
  *Evidência:* inventário §8 item 2 e pronto-quando. **Destrava as 8 quarentenas de K3**
  (`docs/QUARENTENA.md`) e os três shell tests, que hoje saem rc 2 pedindo um checkout com
  `docs/fila`: `test-lib-config.sh` (espera o config dentro do `ORQ_EXEC_ROOT` que recebe),
  `test-drenagem.sh:25,29` e `test-retry-worktree.sh:32,36` (copiam
  `$CHECKOUT_REAL/docs/fila/000-config.json` e montam o próprio `ORQ_EXEC_ROOT`).
  *Teste:* o fixture atravessa o loop até a sua `staging-auto`; os 8 `it.skip` voltam a `it` e
  passam; os três shell tests devolvem rc 0.

- **K8 · `instalar.sh --novo | --atualizar`, com `--dry-run` e relatório.** Migra
  `liberacoes.json` (duas listas do Comarka → objetos, `em` → `liberado_em`, prefixo `humano:`),
  pause file (`.orq-pause` → `PAUSAR`), config (mapa de chaves legadas → schema 2 limpo) e o bloco
  JSON dos tickets pendentes (prosa intacta). Nunca reescreve objetivo de ticket.
  *Evidência:* inventário §4 decisões 3 e 4, §6 itens 9 e 12, §8 item 4.
  *Teste:* migração de cada artefato legado, com o caso NEGATIVO de que a prosa e o objetivo não
  se movem.

- **K9 · contrato.** `CONTRATO.md`, `ticket.schema.json`, `liberacoes.schema.json` e o enum
  `motivo_categoria` (os 8 baldes do `orq-telemetria.py` do Comarka). `risco` é derivado (passo 6
  do gate), não exigido do humano.
  *Evidência:* inventário §4 decisões 4 e 9, §8 item 5.
  *Teste:* o schema recusa os defeitos reais catalogados no §6 item 8 (ID com sufixo, `tipo`
  ausente, três gerações de schema).

- **K10 · doutrina v2.** A regra "nunca copie scripts de outro repo" reescrita para "motor único
  versionado sem premissa local; o que varia vive no config"; faixa de IDs por bloco → sequencial
  global + campo `bloco`; canal padrão de notificação = arquivo; `PLAYBOOK-seed` triado (universal
  aqui, local marcado `[local]` no repo).
  *Evidência:* inventário §4 decisões 6 e 8, §8 item 6.
  *Teste:* a doutrina não contradiz o config nem o CONTRATO (lint da doutrina).

- **K11 · absorções, uma sessão cada, teste junto.** Pré-voo do Actus (`pre-voo.mjs` → TS, chamado
  pelo preflight); enforcement como união por config (Comarka: C0 com DDL/TRIGGER/VIEW, janela de
  comentário, isenção de fixture; Actus: faixa de migrations com faixa reservada, escrita por
  schema/tabela, colunas-sombra); `detectarAdiamento` do Actus em `decisao.ts` (stdout vazio, texto
  real, case-insensitive); placar/telemetria do Actus em `orq custo`; `perfis_tools` do Comarka como
  mapa opcional.
  *Evidência:* inventário §5 (a tabela de doação) e §8 item 3.
  *Teste:* o teste que vem junto com cada doador, listado no §5.

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
