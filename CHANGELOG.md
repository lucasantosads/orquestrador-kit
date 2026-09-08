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

### Etapa 5 — o kit instala em repo que não é o CI, e migra o que os outros repos têm

O PASSO 0 desta etapa foi um levantamento por `jq` no disco dos três repos (só leitura). O
que os briefs de 07 e 08/09 diziam sobre os formatos era hipótese; o que entrou no código é
o que o `jq` devolveu. Três achados mandaram no desenho:

1. `liberacoes.json` tem QUATRO formas vivas, e nenhuma delas é a do schema. O Actus guarda
   os 5 tokens dele SEM o prefixo `humano:` — e, até esta etapa, **nenhum** deles resolvia
   dependência nenhuma, em silêncio, que é o incidente de 2026-09-03 acontecendo de novo num
   repo onde ninguém olhou.
2. O Comarka tem as DUAS listas (`liberadas[]` com 31 entradas e `tokens[]` com 30), 47
   tokens únicos, 13 nas duas e uma duplicata exata dentro de `liberadas[]`.
3. Actus e Comarka estão em `$schema_versao: 1`, e os dois usam `gates` com a MESMA
   estrutura do CI — a diferença é `tipo: "tsc_baseline"` (Comarka) contra `"baseline"`,
   que `gates.ts:151` não reconhece: o baseline de 3 erros herdados seria ignorado e o gate
   reprovaria para sempre.

- **K8b-1** — o motor lê `liberacoes.json` em todas as formas vivas. `lib.sh:liberacao_ok`
  passou a resolver, além do canônico: `tokens[]` de OBJETOS (v2, o destino da migração),
  `tokens[]` de strings SEM prefixo (Actus) e a união com `liberadas[]` (Comarka). A
  comparação **ignora o prefixo `humano:` dos dois lados** — `liberacao_ok` só é chamada para
  dependência que já começa com `humano:` (`deps_resolvidas`), então não há segundo namespace
  com que colidir —, um arquivo que misture formas resolve a UNIÃO, e entrada malformada é
  ignorada em vez de casar com tudo. Duas passadas de `jq`, não uma: a canônica é MUDA (é o
  que o CI tem, e avisar a cada dependência encheria a trilha de ruído) e a de compat GRAVA o
  AVISO, nomeando a forma legada **e o comando que a migra**. `scripts/roadmap/lint-mapa.py`
  monta `sat` pela mesma regra, entre marcadores `# <sat>`/`# </sat>` que o teste EXECUTA em
  vez de reimplementar. Fecha a divergência 2 do `CONTRATO.md` §10.
  *`gate-ticket.ts` não mudou, e isso é achado:* o check 7 nunca leu `liberacoes.json` — ele
  só confere que a dependência é id de ticket da fila ou `humano:<token>` não vazio
  (`gate-ticket.ts:429-441`). Não havia comparação de prefixo para consertar ali.
  *Duas asserções antigas foram REVERTIDAS, de propósito e com o porquê no arquivo:*
  `orquestrador-liberacoes.test.ts` cobrava que token sem prefixo NÃO resolvesse (o argumento
  de colisão de namespaces não sobreviveu ao disco), e o texto do aviso passou de "formato
  ANTIGO" para "forma LEGADA", porque agora ele cobre duas legadas e o `jq` da união não
  distingue qual das duas resolveu.
  *Teste:* `test/orquestrador-liberacoes-formatos.test.ts`, 28 casos — **16 vermelhos
  antes** —, contra os arquivos REAIS dos três repos, copiados byte a byte para
  `test/fixtures/liberacoes/` (com `PROCEDENCIA.md` e cksum de cada um). Os 5 do Actus, os 47
  do Comarka e os 7 do CI resolvem, um a um.
  *O que o CI faz diferente:* nada. Os 7 tokens reais do CI resolvem antes e depois, e
  nenhum grava aviso — a forma dele não é legada. Esse caso já estava VERDE no vermelho-antes,
  que é o que prova que a mudança não o alcançou.

- **K8b-2** — `orq liberar` e a migração de liberações. `orq liberar
  humano:<tipo>-<id> ["nota"]` é o **quarto verbo que escreve** e acrescenta UM objeto v2
  (`token`, `liberado_em` = hoje, `por` = `$USER`, `nota`). Quatro recusas com rc 1: token
  sem o prefixo `humano:`, token fora de `^humano:[a-z-]+-[0-9A-Za-z-]+$`, duplicata
  (conferida contra as DUAS listas) e arquivo fora da v2 — este último com o comando da
  migração na mensagem. Ele NÃO converte o arquivo de passagem: um `liberar` que migrasse
  transformaria uma decisão humana de uma linha numa reescrita do arquivo inteiro, sem diff e
  sem `.bak`.
  `scripts/orquestrador/migrar-liberacoes.ts` leva qualquer forma viva para v2: `em` →
  `liberado_em`, `por` e `nota` preservados, prefixo acrescentado onde falta, dedup por token
  com a **ordem original** preservada — e a ordem de leitura das duas listas é a ordem das
  CHAVES no arquivo, não uma ordem fixa do código. Token que aparece nas duas listas só
  ENRIQUECE o registro (preenche campo ausente); dado presente nunca é sobrescrito.
  `scripts/orquestrador/migrar-comum.ts` guarda as cinco regras que TODA migração do kit
  obedece (`CONTRATO.md` §9.3): `--dry-run` por padrão, diff em vez de resumo, `.bak` no
  primeiro `--aplicar` e nunca depois, nada é apagado, e rodar duas vezes é no-op.
  *A migração não inventa:* os 5 tokens do Actus e os 17 do Comarka que só existiam como
  string solta não têm data nem dono no disco, e saem com `liberado_em: "desconhecido"` mais
  um campo `origem` (`v2` | `v1:tokens` | `v1:liberadas`). Ler `desconhecido` é informação;
  ler a data em que a migração rodou seria mentira com cara de fato. O schema ganhou os dois.
  *Um defeito caiu no caminho, achado pelo teste de idempotência:* a segunda passada
  reinferia `origem` pela lista em que o registro estava AGORA, reescrevendo `v1:tokens` como
  `v2` — o segundo `--aplicar` apagaria justamente o dado que explica o `desconhecido`.
  Origem declarada passou a ganhar da inferida.
  *Teste:* `test/orquestrador-liberar-migrar.test.ts`, 37 casos, contra os três arquivos
  REAIS. Comarka: 61 entradas → 47 tokens únicos, nenhum some, a duplicata exata vira um
  registro, a chave de raiz `descricao` é preservada e a preservação é relatada. Depois de
  migrado, todo token resolve por `lib.sh:liberacao_ok` e **nenhum grava mais AVISO** — é
  essa a prova de que as duas pontas (K8b-1 e K8b-2) fecham. Mais as asserções do schema,
  lidas DO ARQUIVO em vez de recopiadas no teste.
  *Vermelho antes:* 9 casos, com os módulos presentes e só a fiação ausente (o verbo fora do
  `scripts/orq`, o `liberacoes.json` do fixture ainda em v1, o schema sem `origem`). Sem os
  módulos, a suíte inteira não carrega — é peça nova.
  *O que o CI faz diferente:* nada no motor. O `liberacoes.json` do CI é v1 canônica, então
  `orq liberar` o RECUSA até a migração rodar — e é isso que se quer: a recusa é o que impede
  o arquivo de ficar em duas formas ao mesmo tempo.

- **K8b-3** — pause file, `.gitignore` e o `--migrar` do instalador.
  `instalar.sh --atualizar <repo> --migrar` ganhou o gancho onde as migrações de
  `docs/fila/**` penduram, e as duas primeiras: `docs/fila/.orq-pause` →
  `docs/fila/PAUSAR` PRESERVANDO o conteúdo como motivo, e o relato do que o repo
  precisa ignorar. Com os DOIS pause files presentes ele **não** decide: o conteúdo é
  de duas pausas diferentes, e escolher uma apaga a outra.
  *O `.gitignore` não é editado, e é o negativo que dá nome à peça.* Um instalador que
  costura linha no `.gitignore` de repo existente produz conflito de merge em arquivo que
  ninguém esperava ver mudado. Ele imprime a linha que falta; só o `--novo` (K8b-6) escreve
  um `.gitignore`, e escreve o inicial.
  *A pergunta é feita ao GIT, não a um grep:* `git check-ignore`. O CI **não** tem
  `docs/fila/runs/` no `.gitignore` da raiz e mesmo assim ignora tudo lá, porque
  `docs/fila/runs/.gitignore` traz `*` — um grep por linha literal acusaria uma linha que
  não falta. (Achado do PASSO 0: o Actus versiona a evidência por ticket de propósito, o
  `runs/.gitignore` dele lista só os transitórios. Divergência do contrato §1.3 do kit,
  registrada, não "corrigida".)
  *Dois outros ganhos, ambos porque o dry-run tinha de ficar honesto:* (1) `--dry-run`
  agora PREVÊ as recusas — continua saindo 0, mas diz `O --atualizar de verdade RECUSARIA,
  por:` com o motivo; um ensaio que aprova e uma execução que recusa é um ensaio que
  mentiu. As duas recusas que `--forcar` não dispensa saíram para `motivos_de_recusa`,
  usada pelos dois caminhos. (2) Com `--migrar`, o instalador sugere DOIS commits: motor e
  `docs/fila/**` separados, porque o `git log` do repo é onde alguém vai procurar quando
  uma liberação parar de resolver.
  *Ordem:* a migração roda DEPOIS da cópia do motor. Parar no meio deixa motor novo sobre
  dados velhos, que funciona (K8b-1); o contrário é o repo travado.
  *Teste:* caso (i) de `scripts/kit/test-instalar.sh`, 6 blocos e 32 checks, **21
  vermelhos antes**. Inclui o negativo do `.gitignore` intacto, o `.bak` que não é
  sobrescrito na segunda passada, e o caso do `runs/.gitignore` com `*` que só um
  `check-ignore` acerta.
  *O que o CI faz diferente:* o `.orq-pause` dele está no `.gitignore` e o `PAUSAR` não —
  então o relato vai acusar `docs/fila/PAUSAR` faltando, e é acusação correta: depois da
  migração o kill switch muda de nome, e sem a linha ele apareceria no `git status` como
  arquivo novo bem no meio de uma pausa.

- **K8b-4** — `000-config.json` schema 1 → 2, por tabela explícita.
  `scripts/orquestrador/config-tabela.ts` é a tabela, escrita à mão a partir do PASSO 0 e
  em três grupos: `RENOMES` (o motor lê a mesma coisa por outro nome), `NOVAS` (chave do
  schema 2 que a v1 não tinha, com `procedencia` = `politica` | `local` | `derivada`) e
  `PROPRIAS_DE_REPO` (fica intocada e vira item nomeado do relatório, para a K11).
  **Renomear é COPIAR:** o nome antigo continua no arquivo. `migrar-config.ts` aplica.
  *Os três renomes que o disco justificou:* `supabase_project_id` → `ambiente_id` (Comarka;
  sem ele o preflight de identidade compara o ref real com a string "null" e ABORTA o run
  inteiro, corretamente e pelo motivo errado) e `avaliador_model` → `modelos.juiz_alto` **e**
  `modelos.juiz_baixo` — os dois, porque a v1 tinha UM juiz só e copiar para ambos preserva
  o comportamento exato; baratear o juiz de risco baixo é decisão de custo, e migração que
  economiza dinheiro sozinha muda o veredito de alguém sem avisar. Mais um renome de VALOR:
  `gates[].tipo` `tsc_baseline` → `baseline` (Comarka), porque `gates.ts:151` só honra
  `baseline` — com o nome que o motor não conhece, os 3 erros herdados em `qualificacao*`
  reprovariam TODO ticket, para sempre, sem o motivo aparecer em lugar nenhum.
  *Dois renomes que pareciam simétricos e NÃO entraram:* `executor_model → modelos.executor`
  e `retry_final_model → modelos.retry_final`. O motor lê os aliases v1 direto e não lê o
  mapa; copiar dado para chave que ninguém lê é mover dado para o vazio. Quem achou foi o
  teste `toda chave "para" de um renome é lida pelo motor`, não a leitura.
  *Nada é inventado:* decisão local vira PLACEHOLDER `<...>` e `orq config` recusa, alto.
  Chutar um teto de gasto é pior que não ter teto — o número errado nunca dispara, e aí não
  é teto. `_execucao_dos_gates.ordem_obrigatoria` é DERIVADA de `gates[]`, na ordem do
  arquivo, porque `gates.ts` erra se a ordem divergir.
  *O config é a única migração que o instalador NÃO aplica*, nem com `--migrar`: ele grava
  `000-config.proposto.json` ao lado e imprime os quatro passos humanos. O `--aplicar` MOVE
  o proposto revisado, sem recalcular — recalcular aplicaria um arquivo diferente do que foi
  lido.
  *Medido nos configs reais (só leitura, cópias em tmp):* Actus 26 → 14 violações, Comarka
  28 → 15. Tudo que sobra é placeholder de decisão local, mais o `zona_proibida` do Comarka,
  que a tabela deliberadamente NÃO renomeia a partir de `c0_intocavel`: mover a fronteira do
  enforcement por semelhança de nome é a mudança mais cara que uma migração automática
  poderia fazer errado. O relatório grita que ela está ausente.
  *Teste:* `test/orquestrador-migrar-config.test.ts`, 36 casos, mais o caso (i5b) de
  `scripts/kit/test-instalar.sh` (9 checks, **8 vermelhos antes**; o vitest inteiro não
  carregava sem os módulos). Inclui "TODA chave do config real sobrevive no proposto",
  arquivo por arquivo e valor por valor, contra os dois configs reais.
  *O que o CI faz diferente:* nada. Com o config do CI migrado, a linha `GATE` sai
  **caractere a caractere** igual à de hoje (`901 GATE typecheck=ok testes=falha
  enforcement=ok criterios=3/3 build=nao-rodou`), `gates` e `_execucao_dos_gates`
  atravessam sem um byte de diferença, e a ÚNICA chave que a migração acrescenta é
  `launchd.label` — a que a K6c tornou obrigatória e que já é passo humano pendente desde a
  etapa 3.

- **K8b-5** — o bloco JSON dos tickets pendentes. `scripts/orquestrador/migrar-tickets.ts`:
  `tentativas_consumidas` → `tentativas` e `recon_esperado` → `recon`, **na posição original
  da chave** (reconstruir na ordem certa é o que faz o diff mostrar uma linha trocada em vez
  do bloco embaralhado — e diff embaralhado é diff que ninguém lê). Só tickets `pendente`,
  só os `[0-9]*.md` que o `ticket_files` do motor enxerga.
  *A afirmação central é NEGATIVA: a prosa não se move um byte.* O retorno é literalmente o
  array de linhas original com a fatia do bloco trocada; o teste compara byte a byte, não
  por semelhança. Medido nos 44 tickets reais do Comarka: **uma única linha muda por
  ticket**, e as 44 são a mesma (`+  "recon": [`).
  *Não inventa:* `tipo` de critério (depende de o comando FALHAR na base atual — é o passo 3
  do gate, não um chute; 178 critérios do Comarka e os 10 do Actus não têm), `risco` (o gate
  classifica no passo 6), `bloco` (os 46 pendentes do Comarka usam
  `frente`/`onda`/`serie`/`camada`). Não toca `perfil` nem `lane`.
  *Única migração sem `.bak`:* o ticket é versionado, o git já é o backup e o commit é
  humano; 46 `.bak` na fila deixariam a árvore suja, que mata o preflight do run seguinte.
  *Depois dela, `instalar.sh --migrar` roda `orq validar --pendentes` e joga a saída no
  relatório, sem corrigir nada.* É o que dá nome e sobrenome ao que a migração deliberadamente
  não inventou; sem essa seção, o silêncio depois da migração pareceria aprovação.
  *ACHADO, e vira divergência 10 do `CONTRATO.md`:* num ticket com MAIS DE UM bloco ```json,
  os três leitores discordam — o contrato §2 diz o ÚLTIMO, `gate-ticket.ts:99-105` lê o
  PRIMEIRO, e `lib.sh:86-92` concatena TODOS (e o resultado nem parseia). É LATENTE: nenhum
  dos 517 tickets dos três repos tem mais de um bloco. A migração PULA esses tickets e nomeia
  os três leitores na mensagem, em vez de desempatar uma divergência do motor por conta
  própria.
  *Segundo achado, menor:* o `_TEMPLATE.md` do Actus tem `status: pendente` e
  `tentativas_consumidas: 0` — é um ticket pendente de mentira. Fica de fora pela regra do
  motor (`[0-9]*.md`), e o teste afirma isso: migrar o formulário que todo ticket novo copia
  não é errado, mas é decisão, e não desta peça.
  *Teste:* `test/orquestrador-migrar-tickets.test.ts`, 32 casos, contra as filas reais dos
  três repos (cópias em tmp; os repos são só leitura), mais o caso (i5c) de
  `scripts/kit/test-instalar.sh` — **3 vermelhos antes** ali, e o vitest inteiro sem carregar.
  *O que o CI faz diferente:* nada a migrar. Os 6 pendentes do CI já usam `recon`/`tentativas`;
  `migrarFila` sai com 0 migrados e nenhum arquivo tocado.

- **K8b-6** — `instalar.sh --novo <repo>`. Instala num repo git que ainda não tem
  `docs/fila`: motor vendorizado, fila, roadmap, PLAYBOOK e PECAS, `.gitignore` e o carimbo
  `VERSAO`. Fecha a divergência 1 do `CONTRATO.md` §10.
  *O bloco de vendorização virou uma função só* — `vendorizar_motor` —, usada pelo `--novo` e
  pelo `--atualizar`. Duas cópias do mesmo mapa origem→destino divergiriam no primeiro
  caminho que alguém acrescentasse, que é exatamente o que a peça K8c já pagou uma vez.
  *Os artefatos do repo vêm de `doutrina/templates/`*, nunca de uma segunda cópia:
  `config.json` → `000-config.json`, `TICKET.md` → `_TEMPLATE.md`, `decisoes-pendentes.md`,
  `mapa.json`, `MAPA.md`, `PLAYBOOK-seed.md` → `PLAYBOOK.md` e o novo `PECAS-seed.md` →
  `PECAS.md`. `liberacoes.json` nasce em **v2 vazio** — nascer em v1 obrigaria uma migração
  no primeiro dia.
  *O template do config ganhou as 6 chaves obrigatórias que faltavam* (`branch_protegida`,
  `worktrees_prefixo`, `_execucao_dos_gates.{ordem_obrigatoria,interrupcao}`,
  `politica_adiamento.causas_que_adiam`, `politica_retry.por_causa`), com os mesmos valores e
  as mesmas razões da tabela da K8b-4. Antes disto, um repo criado pelo `--novo` sairia com
  6 chaves AUSENTES além dos placeholders: o dono teria de AUTORAR chave, não só preencher.
  Um check do caso (j) tranca isso — `orq config` pode listar placeholder à vontade, mas
  `chave obrigatória ausente` é FALHA do teste.
  *Duas recusas com rc 1, e nenhuma escreve antes de recusar:* o diretório não é repo git
  (sem git não há ground truth, e "log não é verdade" vira "nada é verdade"), e `docs/fila`
  já existe — aí o verbo é `--atualizar`, porque um `--novo` que sobrescreve fila é um
  `--novo` que apaga tickets.
  *`--novo` ESCREVE o `.gitignore`; `--atualizar --migrar` só RELATA.* A diferença é
  deliberada: num repo novo o arquivo não tem opinião sobre `docs/fila`, e não há ordem nem
  comentário de ninguém para atropelar. Ele acrescenta o que falta e preserva o resto.
  *Nada de launchd*, e os próximos passos impressos põem o agendamento por ÚLTIMO:
  `instalar-launchd.sh` RECUSA sem `launchd.label`, e o label é um dos placeholders do
  formulário. Agendar um loop cujo config ainda é formulário é agendar um loop que não roda.
  *Teste:* caso (j) de `scripts/kit/test-instalar.sh`, 7 blocos e 33 checks, **30 vermelhos
  antes**. O pronto-quando da peça, ponta a ponta: repo temporário vazio → `--novo` → `orq
  config` lista os placeholders e NENHUMA chave ausente → `--verificar` idêntico ao kit.
  *O que o CI faz diferente:* nada — `--novo` não roda em repo instalado, e o CI já tem
  `docs/fila`. Ele receberia a recusa 2, que é a resposta certa.

- **K10** — doutrina v2. Seis decisões mudaram, e `docs/DOUTRINA-v2.md` é a tabela delas
  com a evidência de cada uma:
  1. **"Nunca copie scripts de outro repo" → motor único versionado.** A regra v1 estava
     certa sobre o sintoma e errada sobre o remédio: copiar carrega premissa local, mas
     *reimplementar* carrega premissa NOVA a cada repo — e o custo apareceu neste PASSO 0,
     em três `liberacoes.json` de formatos diferentes e dois schemas de config. Corolário
     operacional: editar o motor vendorizado é **NO-GO no pré-voo**, e `instalar.sh
     --verificar` é quem afirma isso.
  2. **Faixa de IDs por bloco → ID sequencial global + campo `bloco`.** Medido em campo
     (2026-09-04): os blocos progridem em paralelo e o loop drena em ordem de ID, então
     faixa por bloco vira **prioridade por bloco**. Saiu de `mapa.json`, `MAPA.md`,
     `TICKET.md`, `fase-0-arquitetar.md` e `autoalimentacao.md`, não só da SKILL.
  3. **Canal de notificação padrão = arquivo.** O loop roda headless: canal que depende de
     sessão gráfica falha exatamente quando ninguém está olhando.
  4. **`risco` é derivado, não exigido.** Quem escreve deixa a chave vazia; o passo 6 do
     gate preenche. Custo registrado (2026-09-07): a primeira versão do check 2 cobrava
     VALOR e reprovou os 7 pendentes de uma vez — o gate reprovando ticket por não ter feito
     o que o próprio gate ainda vai fazer.
  5. **"Quem escreve o harness" aponta para o kit**, e cita o incidente de 2026-09-08 (job
     de launchd carregado por 1h40 apontando para um fixture em `/private/tmp`, três
     disparos em `rc 127`, detecção humana) como o exemplo de por que a fronteira precisa de
     código e não de disciplina.
  6. **`references/setup.md`: instalar = `--novo` + preencher + `orq config` + pré-voo.** O
     passo "gere os scripts com Claude Code lendo a skill como spec" virou uma TABELA do que
     já está instalado, e o pré-voo ganhou dois checks de um comando cada
     (`instalar.sh --verificar` sai 0, `orq config` sai 0).
  *`doutrina/templates/PLAYBOOK-seed.md` ganhou 15 lições triadas* do PLAYBOOK do
  conteudos-infinitos (129 registradas entre 01 e 08/set, lido só para leitura), cada uma com
  data e origem. O critério está escrito no próprio arquivo, em três filtros: é sobre o
  MECANISMO (não sobre produto/stack/roadmap daquele repo), foi PAGA com incidente ou
  medição, e muda o que alguém faria num repo novo. As outras 114 são a peça **K10b**.
  *Teste:* `test/doutrina-v2.test.ts`, 30 casos, **15 vermelhos antes**. Ele não julga
  redação: confronta cada afirmação da doutrina com a fonte que a torna verdadeira ou falsa
  — o template de config (a `ordem_obrigatoria` lista os mesmos gates? as 7 causas de
  adiamento estão lá? a política de retry não manda escalar por tamanho?), o `CONTRATO.md`
  (`risco` basta existir) e o disco (todo script que o `setup.md` diz existir existe).
  *Um defeito de TESTE caiu no caminho, e vale mais que a peça:* dois casos da K8b-5
  afirmavam a constante **44** sobre a fila do Comarka. Eles quebraram DENTRO desta sessão —
  o loop do comarka-operacional está VIVO e drenou às 16:00 (três tickets para `done`, um
  para `em_execucao`). Teste que afirma um número sobre a fila viva de outro repo mede o dia,
  não o código; os dois passaram a DERIVAR o esperado da própria cópia. (Conferido: o diff do
  Comarka não tem uma linha de `recon` — nada daquele repo foi tocado por esta sessão.)

Passos humanos para o CI receber esta etapa: ver o relatório em
`~/orq-sessoes/relatorio-kit-etapa5.md`.

### Etapa 6 — o que o Actus pagou com incidente, e o motor do CI não tinha

Sete peças, sete commits. Cada uma julgada pela mesma pergunta: **o Actus perde alguma
proteção ao trocar de motor?**

- **K11a-1** `6f37c21` — as regras B (migrations por faixa), C (escrita por tabela) e D
  (colunas congeladas e sombras) do `enforcement.mjs` do actus-saas, agora por CONFIG e
  todas DESLIGADAS sem a chave. Duas decisões ficam escritas no código: C e D auditam
  também o `artefato_sql` (proibição NOMEADA dentro de uma migration é o caso que se quer
  pegar; negação em bloco ali dentro foi o falso positivo do ORQ-11), e `migrations.dir`
  NÃO entra na tabela de renomes — quem cobra o dir é o `orq config`, para a regra nascer
  ligada de propósito e nunca de arrasto. 41 casos, 16 vermelhos antes.
- **K11a-2** `9944986` — `prevoo.ts` + `orq prevoo` + `prevoo_ou_sai` no `local-loop.sh`.
  A cat.3 do Actus (um `claude -p` novo por drenagem) NÃO virou chamada: o pré-voo LÊ o
  resultado da última sondagem em `runs/`, porque quem sonda é o `probe_modelos` do
  executor. Ordem: lock → PAUSA → pré-voo → reconcile. 34 casos, 34 vermelhos antes.
  Medido contra o CI (só leitura): GO, rc 0, árvore limpa depois.
- **K11a-3** `96d711d` — os seis padrões de autenticação do Actus e o par
  `service unavailable`/`503` em `decisao.ts`. O texto é o do incidente de 13/08/2026,
  copiado dos testes de lá. Duas divergências deliberadas ficam registradas no teste.
  13 casos, 5 vermelhos antes.
- **G** `d0eecdb` — gate `tipo: baseline` com `direcao`, `contagem_regex` e `preparo`. E um
  DEFEITO consertado no caminho: em `direcao: max` quem decide é a CONTAGEM, não o exit
  code — um `tsc` com 3 erros herdados sempre sai != 0, e exigir exit 0 junto tornava todo
  `baseline > 0` impossível de satisfazer, em silêncio. 21 casos, 10 vermelhos antes.
- **D10** `50a4f6c` — o ticket é o PRIMEIRO bloco ```json. Divergência 10 do `CONTRATO.md`
  fechada: `ticket_json` deixou de concatenar (com dois blocos o resultado nem parseava) e
  `ticket_set` de reescrever mais de um. 13 casos, 8 vermelhos antes; muda o comportamento
  em ZERO arquivo vivo — é buraco latente fechado antes de alguém cair nele.
- **T17** `22794fd` — piso de `--disallowedTools` por config, com a lista do Comarka mais
  `pnpm install`/`npm install`/`npm ci`. O piso vai na flag E sai da allowlist derivada:
  duas trancas, porque depender da precedência entre as duas flags é depender de uma regra
  do CLI que não é deste repo. 23 casos, 21 vermelhos antes.
- **K8b-7** `4caa1ac` — `migrar-liberacoes.ts` data os tokens pelo git (`-S`, o commit MAIS
  VELHO). 11 casos, 9 vermelhos antes, com repo git de verdade e dois commits reais.
  Medido no Actus: **1 de 5** tokens datado — os outros 4 estão na árvore de trabalho e
  ainda não foram commitados, então `desconhecido` fica, que é a resposta certa.

Passos humanos para o CI receber esta etapa: ver o relatório em
`~/orq-sessoes/relatorio-kit-etapa6.md`.
