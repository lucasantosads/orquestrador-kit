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

## PENDENTES

- **K7-e2e · o fixture atravessa o loop (PAGA, espera OK humano).**
  `scripts/kit/fixture-e2e.sh` já existe e recusa rodar sem `ORQ_E2E_OK=1`: instancia o fixture,
  roda UMA drenagem do `local-loop.sh` dele com watchdog de `claude_timeout_secs + 120`s (técnica
  do `claude_run`, `lib.sh:964-986` — o macOS não tem `timeout`), e imprime `orq`, as 20 últimas
  linhas da trilha, `git log --oneline staging-auto -3` e o `custo.json`. O fixture NÃO é removido:
  se reprovar, o diff da tentativa e o veredito cru SÃO o resultado.
  *Evidência:* inventário §8 item 2, pronto-quando ("um ticket-fixture trivial atravessa o loop
  ponta a ponta e o merge aparece na staging", `doutrina/references/setup.md:55`).
  *Teste:* ticket 001 em `done`, merge na `staging-auto` do fixture, evento `APROVADO` na trilha,
  nenhum push (o origin é `example.invalid`; se o loop tentasse, falharia alto — e isso também
  seria resultado).

- **K5b · o `--verificar` não cobre `scripts/roadmap/`.** ACHADO da etapa 2: `orq mapa lint` roda
  `python3 scripts/roadmap/lint-mapa.py` a partir do MAIN_CHECKOUT (`scripts/orq:226`), então
  `scripts/roadmap/` É motor vendorizado — o `fixture.sh` já o copia. O escopo do `--verificar`,
  como esta peça o descreve e como K5 o entregou, são só três caminhos: um `lint-mapa.py`
  desatualizado no repo passa por "idêntico". Não foi ampliado em K5 por decisão (o escopo estava
  escrito; alargá-lo em silêncio é pior que a lacuna).
  *Evidência:* `scripts/orq:226`; `scripts/kit/fixture.sh`, bloco "o motor, vendorizado".
  *Teste:* copiar o fixture, mexer num byte de `scripts/roadmap/lint-mapa.py` e exigir
  `diferente scripts/roadmap/lint-mapa.py` com rc 1.

- **K6 · pureza.** `scripts/kit/pureza.sh`: grep em CÓDIGO (não em comentário) de
  `scripts/orquestrador/**` e `scripts/orq` por premissa de repo. As duas reais hoje:
  (a) diretórios do monorepo fixos no `executor.sh` (`apps/web`, `services/*/`, linhas 219, 240 e
  247) → viram `toolchain.pacotes` no config, ou leitura dos `workspaces` do `package.json`;
  (b) nome e label do plist template (`scripts/orquestrador/com.conteudos.orquestrador.plist.template`)
  → `com.orquestrador.plist.template` com `{{LABEL}}`, e `instalar-launchd.sh` deriva o label do
  config;
  (c) ACHADO da etapa 2: `typecheck_marca` (`executor.sh:415-424`) combina dois gates por NOME
  fixo, `typecheck_root` e `typecheck_web` — nomes do monorepo do CI. Num repo cujo gate se chame
  `typecheck` (o fixture, por exemplo) a função devolve `nao-rodou` para um gate que rodou e
  passou. Não é fatal hoje (só alimenta a linha de evento), e por isso não virou mudança de motor
  nesta etapa; os nomes dos gates têm de sair do config, como o resto.
  *Evidência:* inventário §8 item 5; as linhas citadas, no disco.
  *Teste:* pureza = 0 em código; comentário de proveniência pode ficar.

- **K8 · `instalar.sh --novo | --atualizar`, com `--dry-run` e relatório.** O `--novo` nasce do
  bloco de vendorização do `scripts/kit/fixture.sh` (K7a), que já é o mapa origem→destino do
  `ORIGEM.md` executado: `scripts/orquestrador/` (menos o plist instanciado), `scripts/orq`,
  `scripts/roadmap/`, `doutrina/` → `docs/orquestrador/skill/`, mais o carimbo `VERSAO`. Migra
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
